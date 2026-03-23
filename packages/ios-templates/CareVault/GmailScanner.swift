import Foundation

// MARK: - Scan State

enum ScanState: Equatable {
    case idle
    case scanning(pass: Int, detail: String)
    case completed(totalFound: Int)
    case error(String)

    static func == (lhs: ScanState, rhs: ScanState) -> Bool {
        switch (lhs, rhs) {
        case (.idle, .idle): return true
        case (.scanning(let a, let b), .scanning(let c, let d)): return a == c && b == d
        case (.completed(let a), .completed(let b)): return a == b
        case (.error(let a), .error(let b)): return a == b
        default: return false
        }
    }
}

// MARK: - Gmail API Response Types

struct GmailListResponse: Codable {
    let messages: [GmailMessageRef]?
    let nextPageToken: String?
    let resultSizeEstimate: Int?
}

struct GmailMessageRef: Codable {
    let id: String
    let threadId: String
}

struct GmailRawMessage: Codable {
    let id: String
    let threadId: String
    let snippet: String?
    let sizeEstimate: Int?
    let labelIds: [String]?
    let payload: GmailPayload?
}

struct GmailPayload: Codable {
    let headers: [GmailHeader]?
    let parts: [GmailPart]?
    let mimeType: String?
    let body: GmailBody?
}

struct GmailHeader: Codable {
    let name: String
    let value: String
}

struct GmailPart: Codable {
    let mimeType: String?
    let filename: String?
    let body: GmailBody?
    let parts: [GmailPart]?
}

struct GmailBody: Codable {
    let attachmentId: String?
    let size: Int?
}

// MARK: - App Models

struct GmailAttachment: Identifiable, Hashable {
    let id: String       // attachmentId from Gmail
    let filename: String
    let mimeType: String
    let size: Int

    func hash(into hasher: inout Hasher) { hasher.combine(id) }
    static func == (lhs: GmailAttachment, rhs: GmailAttachment) -> Bool { lhs.id == rhs.id }
}

struct GmailMessage: Identifiable, Hashable {
    let emailId: String
    let threadId: String
    let subject: String
    let sender: String
    let senderDomain: String
    let date: Date?
    let snippet: String
    let sizeEstimate: Int
    let attachments: [GmailAttachment]
    let labelIds: [String]

    var id: String { emailId }

    var senderDisplayName: String {
        // Parse "Display Name <email@domain.com>" → "Display Name"
        if let angleBracket = sender.firstIndex(of: "<") {
            let name = sender[sender.startIndex..<angleBracket].trimmingCharacters(in: .whitespaces)
            if !name.isEmpty { return String(name).replacingOccurrences(of: "\"", with: "") }
        }
        return sender
    }

    var hasAttachments: Bool { !attachments.isEmpty }

    func hash(into hasher: inout Hasher) { hasher.combine(emailId) }
    static func == (lhs: GmailMessage, rhs: GmailMessage) -> Bool { lhs.emailId == rhs.emailId }
}

struct DiscoveredSender: Identifiable, Hashable {
    let domain: String
    var emailCount: Int
    var senderNames: Set<String>

    var id: String { domain }
}

// MARK: - Parent Context

struct ParentContext {
    /// Provider names the parent has mentioned (e.g. "Dr. Smith", "ABC Therapy")
    var providerNames: [String] = []
    /// Known provider email addresses
    var providerEmails: [String] = []
}

// MARK: - Gmail Scanner

@MainActor
final class GmailScanner: ObservableObject {

    // MARK: Published state

    @Published var scanState: ScanState = .idle
    @Published var foundMessages: [GmailMessage] = []
    @Published var discoveredSenders: [DiscoveredSender] = []
    @Published var scanProgress: String = ""

    // MARK: Dependencies

    private let auth: GmailAuth
    private let keywords: KeywordPack

    // MARK: Internal state

    private var seenIds: Set<String> = []
    private static let gmailBaseURL = "https://gmail.googleapis.com/gmail/v1/users/me"

    // MARK: Init

    init(auth: GmailAuth, keywords: KeywordPack) {
        self.auth = auth
        self.keywords = keywords
    }

    // MARK: - Public API

    /// Runs the full two-pass scan. Safe to call from UI — updates published properties as it goes.
    func scan(parentContext: ParentContext = ParentContext()) async {
        foundMessages = []
        discoveredSenders = []
        seenIds = []
        scanState = .scanning(pass: 1, detail: "Starting scan...")
        scanProgress = "Starting scan..."

        do {
            // --- Pass 1: High-specificity queries ---
            let highQueries = keywords.highSpecificityQueries
            for (i, query) in highQueries.enumerated() {
                let label = "Pass 1: query \(i + 1)/\(highQueries.count)"
                scanState = .scanning(pass: 1, detail: label)
                scanProgress = label
                try await searchAndCollect(query: query)
            }

            // Parent-provided context
            for name in parentContext.providerNames {
                scanProgress = "Searching for provider: \(name)"
                try await searchAndCollect(query: "from:\(name) OR subject:\(name)")
            }
            for email in parentContext.providerEmails {
                scanProgress = "Searching provider email: \(email)"
                try await searchAndCollect(query: "from:\(email)")
            }

            // --- Sender discovery ---
            scanProgress = "Analyzing senders..."
            buildDiscoveredSenders()

            // --- Pass 2: Expand via discovered senders ---
            let senderDomains = discoveredSenders.map(\.domain)
            for (i, domain) in senderDomains.enumerated() {
                let label = "Pass 2: sender \(i + 1)/\(senderDomains.count) — \(domain)"
                scanState = .scanning(pass: 2, detail: label)
                scanProgress = label
                try await searchAndCollect(query: "from:@\(domain)")
            }

            // Low-specificity queries filtered by discovered senders
            let lowQueries = keywords.lowSpecificityQueries
            for (i, query) in lowQueries.enumerated() {
                for domain in senderDomains {
                    let label = "Pass 2: low-spec \(i + 1)/\(lowQueries.count) × \(domain)"
                    scanState = .scanning(pass: 2, detail: label)
                    scanProgress = label
                    try await searchAndCollect(query: "\(query) from:@\(domain)")
                }
            }

            // Rebuild senders after pass 2
            buildDiscoveredSenders()

            scanState = .completed(totalFound: foundMessages.count)
            scanProgress = "Found \(foundMessages.count) messages from \(discoveredSenders.count) senders"

        } catch {
            scanState = .error(error.localizedDescription)
            scanProgress = "Error: \(error.localizedDescription)"
        }
    }

    // MARK: - Gmail API

    /// Search Gmail and collect results, deduplicating by emailId.
    private func searchAndCollect(query: String) async throws {
        let token = try await auth.validAccessToken()
        var pageToken: String? = nil

        repeat {
            let listResponse = try await listMessages(query: query, pageToken: pageToken, token: token)
            guard let refs = listResponse.messages, !refs.isEmpty else { break }

            for ref in refs {
                guard !seenIds.contains(ref.id) else { continue }
                seenIds.insert(ref.id)

                if let message = try await getMessage(id: ref.id, token: token) {
                    foundMessages.append(message)
                }
            }

            pageToken = listResponse.nextPageToken
        } while pageToken != nil
    }

    /// GET messages.list with query and optional page token.
    private func listMessages(query: String, pageToken: String?, token: String) async throws -> GmailListResponse {
        var components = URLComponents(string: "\(Self.gmailBaseURL)/messages")!
        var items = [
            URLQueryItem(name: "q", value: query),
            URLQueryItem(name: "maxResults", value: "100"),
        ]
        if let pt = pageToken {
            items.append(URLQueryItem(name: "pageToken", value: pt))
        }
        components.queryItems = items

        var request = URLRequest(url: components.url!)
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

        let (data, response) = try await performRequest(request)
        guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode) else {
            // Return empty on non-success (after retry logic in performRequest)
            return GmailListResponse(messages: nil, nextPageToken: nil, resultSizeEstimate: 0)
        }
        return try JSONDecoder().decode(GmailListResponse.self, from: data)
    }

    /// GET messages.get with format=metadata.
    private func getMessage(id: String, token: String) async throws -> GmailMessage? {
        var components = URLComponents(string: "\(Self.gmailBaseURL)/messages/\(id)")!
        components.queryItems = [URLQueryItem(name: "format", value: "metadata")]

        var request = URLRequest(url: components.url!)
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

        let (data, response) = try await performRequest(request)
        guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode) else {
            return nil
        }

        let raw = try JSONDecoder().decode(GmailRawMessage.self, from: data)
        return parseMessage(raw)
    }

    /// Perform a URLRequest with one retry on 429.
    private func performRequest(_ request: URLRequest) async throws -> (Data, URLResponse) {
        let (data, response) = try await URLSession.shared.data(for: request)
        if let http = response as? HTTPURLResponse, http.statusCode == 429 {
            try await Task.sleep(nanoseconds: 2_000_000_000) // 2 seconds
            return try await URLSession.shared.data(for: request)
        }
        return (data, response)
    }

    // MARK: - Parsing

    private func parseMessage(_ raw: GmailRawMessage) -> GmailMessage {
        let headers = raw.payload?.headers ?? []
        let subject = header("Subject", in: headers) ?? "(no subject)"
        let sender = header("From", in: headers) ?? ""
        let dateString = header("Date", in: headers)

        let domain = extractDomain(from: sender)
        let attachments = extractAttachments(from: raw.payload)

        return GmailMessage(
            emailId: raw.id,
            threadId: raw.threadId,
            subject: subject,
            sender: sender,
            senderDomain: domain,
            date: parseDate(dateString),
            snippet: raw.snippet ?? "",
            sizeEstimate: raw.sizeEstimate ?? 0,
            attachments: attachments,
            labelIds: raw.labelIds ?? []
        )
    }

    private func header(_ name: String, in headers: [GmailHeader]) -> String? {
        headers.first(where: { $0.name.lowercased() == name.lowercased() })?.value
    }

    /// Recursively extract attachments from MIME parts.
    private func extractAttachments(from payload: GmailPayload?) -> [GmailAttachment] {
        guard let payload else { return [] }
        var result: [GmailAttachment] = []
        collectAttachments(from: payload.parts, into: &result)
        return result
    }

    private func collectAttachments(from parts: [GmailPart]?, into result: inout [GmailAttachment]) {
        guard let parts else { return }
        for part in parts {
            if let attachmentId = part.body?.attachmentId,
               let filename = part.filename, !filename.isEmpty {
                result.append(GmailAttachment(
                    id: attachmentId,
                    filename: filename,
                    mimeType: part.mimeType ?? "application/octet-stream",
                    size: part.body?.size ?? 0
                ))
            }
            // Recurse into nested parts
            collectAttachments(from: part.parts, into: &result)
        }
    }

    /// Extract domain from "Name <email@domain.com>" or "email@domain.com".
    private func extractDomain(from sender: String) -> String {
        let email: String
        if let start = sender.lastIndex(of: "<"),
           let end = sender.lastIndex(of: ">") {
            email = String(sender[sender.index(after: start)..<end])
        } else {
            email = sender
        }
        guard let atIndex = email.lastIndex(of: "@") else { return "" }
        return String(email[email.index(after: atIndex)...]).lowercased()
    }

    private func parseDate(_ string: String?) -> Date? {
        guard let string else { return nil }
        let formatter = DateFormatter()
        // RFC 2822 date format used by Gmail
        formatter.locale = Locale(identifier: "en_US_POSIX")
        // Try common formats
        for format in [
            "EEE, dd MMM yyyy HH:mm:ss Z",
            "dd MMM yyyy HH:mm:ss Z",
            "EEE, dd MMM yyyy HH:mm:ss z",
        ] {
            formatter.dateFormat = format
            if let date = formatter.date(from: string) { return date }
        }
        return nil
    }

    // MARK: - Sender Discovery

    private func buildDiscoveredSenders() {
        var senderMap: [String: DiscoveredSender] = [:]

        for message in foundMessages {
            let domain = message.senderDomain
            guard !domain.isEmpty, !keywords.noiseDomains.contains(domain) else { continue }

            if var existing = senderMap[domain] {
                existing.emailCount += 1
                existing.senderNames.insert(message.senderDisplayName)
                senderMap[domain] = existing
            } else {
                senderMap[domain] = DiscoveredSender(
                    domain: domain,
                    emailCount: 1,
                    senderNames: [message.senderDisplayName]
                )
            }
        }

        discoveredSenders = senderMap.values.sorted { $0.emailCount > $1.emailCount }
    }
}
