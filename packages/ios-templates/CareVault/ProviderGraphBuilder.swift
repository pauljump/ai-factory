import Foundation

// MARK: - ProviderGraphBuilder

/// Builds a graph of care providers from scanned Gmail messages and discovered senders.
/// Infers provider type from domain suffix and subject-line keyword signals.
///
/// Usage:
///   let builder = ProviderGraphBuilder(keywordPack: AutismKeywordPack())
///   let providers = builder.buildProviders(from: messages, discoveredSenders: senders, childId: childId)
struct ProviderGraphBuilder {

    let keywordPack: KeywordPack

    // MARK: - Public API

    /// Build `CareProviderRecord` entries from a scan result set.
    ///
    /// - Parameters:
    ///   - messages: All scanned Gmail messages.
    ///   - discoveredSenders: Unique sender domains surfaced by the scanner.
    ///   - childId: The child profile to associate providers with.
    /// - Returns: One `CareProviderRecord` per discovered sender domain.
    func buildProviders(
        from messages: [GmailMessage],
        discoveredSenders: [DiscoveredSender],
        childId: String
    ) -> [CareProviderRecord] {
        discoveredSenders.map { sender in
            let providerType = classifyProviderType(domain: sender.domain, messages: messages)
            let providerName = inferProviderName(from: sender.domain, senderNames: sender.senderNames)
            return CareProviderRecord(
                childId: childId,
                name: providerName,
                domain: sender.domain,
                type: providerType,
                discoveredFrom: "gmail_scan"
            )
        }
    }

    // MARK: - Classification

    /// Classify a provider type using domain suffix first, then subject-line keyword signals.
    private func classifyProviderType(domain: String, messages: [GmailMessage]) -> String {
        // Domain-suffix rules take priority — they're highly reliable
        if domain.hasSuffix(".edu") { return "school" }
        if domain.hasSuffix(".gov") { return "government" }

        // Collect subjects from messages sent by this domain
        let subjects = messages
            .filter { $0.senderDomain == domain }
            .map { $0.subject.lowercased() }

        // Score each category by keyword hits in subject lines
        let scores: [(type: String, keywords: [String])] = [
            ("therapy",   ["aba", "therapy", "therapist", "session", "behavior", "bcba", "rbt", "intervention"]),
            ("insurance", ["insurance", "claim", "eob", "explanation of benefits", "deductible", "copay", "authorization", "prior auth"]),
            ("legal",     ["attorney", "legal", "advocate", "advocacy", "mediation", "complaint", "hearing", "rights", "idea"]),
            ("billing",   ["invoice", "payment", "bill", "receipt", "balance", "due", "statement"]),
            ("medical",   ["doctor", "medical", "physician", "appointment", "referral", "diagnosis", "evaluation", "assessment"]),
            ("school",    ["iep", "school", "teacher", "principal", "classroom", "special education", "sped", "504"]),
        ]

        var bestType = "other"
        var bestScore = 0

        for category in scores {
            let score = subjects.reduce(0) { total, subject in
                total + category.keywords.filter { subject.contains($0) }.count
            }
            if score > bestScore {
                bestScore = score
                bestType = category.type
            }
        }

        return bestType
    }

    // MARK: - Name Inference

    /// Infer a human-readable provider name from the domain.
    ///
    /// Prefers known sender display names from email headers. Falls back to
    /// stripping TLD components and capitalizing the remaining segment.
    private func inferProviderName(from domain: String, senderNames: Set<String>) -> String {
        // If there's exactly one clear display name from the email headers, use it
        let cleanNames = senderNames
            .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty && !$0.contains("@") }

        if cleanNames.count == 1, let name = cleanNames.first {
            return name
        }

        // Strip known TLD-like suffixes and subdomain prefixes
        let components = domain.components(separatedBy: ".")

        // Drop the TLD (last component). If it's a two-part TLD like .co.uk, drop two.
        var parts = components

        // Always drop the last segment (TLD)
        if parts.count > 1 { parts.removeLast() }

        // Drop a secondary segment if it's a known generic part (e.g. "k12" in "district.k12.ny.us")
        let generics = Set(["k12", "mail", "www", "edu", "org", "net", "gov"])
        if parts.count > 1, let last = parts.last, generics.contains(last) {
            parts.removeLast()
        }

        // Take the most meaningful segment (usually the last remaining component)
        let segment = parts.last ?? domain

        // Capitalize first letter of each word component (split on hyphens/underscores)
        let words = segment
            .components(separatedBy: CharacterSet(charactersIn: "-_"))
            .map { $0.prefix(1).uppercased() + $0.dropFirst() }

        return words.joined(separator: " ")
    }
}
