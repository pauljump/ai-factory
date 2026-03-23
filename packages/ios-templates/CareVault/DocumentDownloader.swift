import Foundation

// MARK: - Response Types

/// Gmail attachment endpoint response — data is base64url-encoded.
struct GmailAttachmentResponse: Codable {
    let data: String
    let size: Int
}

// MARK: - Error Type

enum DownloadError: LocalizedError {
    case invalidURL
    case httpError(Int)
    case emptyData
    case base64DecodeFailed
    case fileWriteFailed(Error)

    var errorDescription: String? {
        switch self {
        case .invalidURL:                 return "Invalid Gmail attachment URL."
        case .httpError(let code):        return "HTTP error \(code) from Gmail API."
        case .emptyData:                  return "Gmail returned empty attachment data."
        case .base64DecodeFailed:         return "Failed to decode base64url attachment data."
        case .fileWriteFailed(let error): return "Could not write attachment to disk: \(error.localizedDescription)"
        }
    }
}

// MARK: - Data Extension

extension Data {
    /// Decode a base64url-encoded string (RFC 4648 §5).
    /// Gmail uses base64url: `-` instead of `+`, `_` instead of `/`, no padding.
    init?(base64URLEncoded string: String) {
        // Convert base64url → standard base64
        var base64 = string
            .replacingOccurrences(of: "-", with: "+")
            .replacingOccurrences(of: "_", with: "/")

        // Add padding so length is a multiple of 4
        let remainder = base64.count % 4
        if remainder != 0 {
            base64 += String(repeating: "=", count: 4 - remainder)
        }

        self.init(base64Encoded: base64)
    }
}

// MARK: - DocumentDownloader

/// Downloads Gmail attachments and saves them to the app's Documents/CareVault/ directory.
///
/// Usage:
///   let downloader = DocumentDownloader(auth: gmailAuth)
///   let path = try await downloader.downloadAttachment(
///       messageId: "...", attachment: attachment, documentId: "..."
///   )
@MainActor
final class DocumentDownloader: ObservableObject {

    // MARK: Published State

    /// Per-document download progress: documentId → 0.0–1.0
    @Published var downloadProgress: [String: Double] = [:]

    /// Per-document error messages: documentId → human-readable error
    @Published var downloadErrors: [String: String] = [:]

    // MARK: Dependencies

    private let auth: GmailAuth
    private let storageDirectory: URL

    private static let gmailBaseURL = "https://gmail.googleapis.com/gmail/v1/users/me"

    // MARK: Init

    init(auth: GmailAuth) {
        self.auth = auth

        // Resolve Documents/CareVault/ — created once on init
        let documents = FileManager.default
            .urls(for: .documentDirectory, in: .userDomainMask)
            .first!
        storageDirectory = documents.appendingPathComponent("CareVault", isDirectory: true)

        try? FileManager.default.createDirectory(
            at: storageDirectory,
            withIntermediateDirectories: true
        )
    }

    // MARK: - Public API

    /// Download a Gmail attachment and save it to Documents/CareVault/.
    ///
    /// - Parameters:
    ///   - messageId: Gmail message ID that contains the attachment.
    ///   - attachment: The `GmailAttachment` to download.
    ///   - documentId: Stable document ID used for naming and progress tracking.
    /// - Returns: Absolute file path of the saved attachment.
    func downloadAttachment(
        messageId: String,
        attachment: GmailAttachment,
        documentId: String
    ) async throws -> String {
        downloadProgress[documentId] = 0.0
        downloadErrors[documentId] = nil

        do {
            // 1. Auth token
            let token = try await auth.validAccessToken()

            // 2. Build request
            guard let url = URL(string: "\(Self.gmailBaseURL)/messages/\(messageId)/attachments/\(attachment.id)") else {
                throw DownloadError.invalidURL
            }
            var request = URLRequest(url: url)
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

            // 3. Fetch
            downloadProgress[documentId] = 0.2
            let (data, response) = try await URLSession.shared.data(for: request)

            guard let http = response as? HTTPURLResponse else {
                throw DownloadError.httpError(0)
            }
            guard (200...299).contains(http.statusCode) else {
                throw DownloadError.httpError(http.statusCode)
            }

            downloadProgress[documentId] = 0.5

            // 4. Decode
            let gmailResponse = try JSONDecoder().decode(GmailAttachmentResponse.self, from: data)

            guard !gmailResponse.data.isEmpty else {
                throw DownloadError.emptyData
            }

            guard let fileData = Data(base64URLEncoded: gmailResponse.data) else {
                throw DownloadError.base64DecodeFailed
            }

            downloadProgress[documentId] = 0.8

            // 5. Save to disk: Documents/CareVault/{documentId}_{filename}
            let safeFilename = sanitizeFilename(attachment.filename)
            let fileURL = storageDirectory.appendingPathComponent("\(documentId)_\(safeFilename)")

            do {
                try fileData.write(to: fileURL, options: .atomic)
            } catch {
                throw DownloadError.fileWriteFailed(error)
            }

            downloadProgress[documentId] = 1.0
            return fileURL.path

        } catch {
            downloadErrors[documentId] = error.localizedDescription
            downloadProgress[documentId] = nil
            throw error
        }
    }

    // MARK: - Helpers

    /// Replace path-unsafe characters in filenames.
    private func sanitizeFilename(_ filename: String) -> String {
        let unsafe = CharacterSet(charactersIn: "/\\:*?\"<>|")
        return filename
            .components(separatedBy: unsafe)
            .joined(separator: "_")
    }
}
