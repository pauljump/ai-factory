import Foundation

struct ClassificationResult {
    let emailId: String
    let relevant: Bool
    let signalType: CareSignalType
    let organizationName: String?
    let organizationType: String?  // school, therapy, insurance, legal, medical, government
    let childName: String?
    let confidence: String  // high, medium, low
}

@MainActor
final class AIClassifier: ObservableObject {
    @Published var classificationProgress: String = ""

    /// Classify emails using best available tier. Falls through: Apple Intelligence → Kit AI → heuristics
    func classify(messages: [GmailMessage], childName: String, childAge: Int) async -> [ClassificationResult] {
        // Tier A: Apple Intelligence (iOS 26+)
        if isAppleIntelligenceAvailable() {
            classificationProgress = "Organizing with on-device AI..."
            // TODO: implement when testing Apple Intelligence
            // For now, fall through to heuristics
        }

        // Tier B: Kit-provided AI
        // TODO: implement backend endpoint for ephemeral classification
        // For now, fall through to heuristics

        // Tier D: On-device heuristics (always available)
        classificationProgress = "Analyzing documents..."
        return classifyWithHeuristics(messages, childName: childName)
    }

    private func isAppleIntelligenceAvailable() -> Bool {
        if #available(iOS 26, *) { return true }
        return false
    }

    /// On-device heuristic classification using keyword matching + child name detection
    private func classifyWithHeuristics(_ messages: [GmailMessage], childName: String) -> [ClassificationResult] {
        let keywordPack = AutismKeywordPack()
        let childNameLower = childName.lowercased()

        return messages.map { msg in
            let subjectLower = msg.subject.lowercased()
            let mentionsChild = !childNameLower.isEmpty && subjectLower.contains(childNameLower)
            let isNoise = keywordPack.noiseDomains.contains(msg.senderDomain)

            let signalType = keywordPack.classifyDocument(
                subject: msg.subject,
                sender: msg.sender,
                attachmentName: msg.attachments.first?.filename
            )

            // Determine relevance
            let relevant: Bool
            if isNoise {
                relevant = false
            } else if mentionsChild {
                relevant = true
            } else if signalType != .other {
                relevant = true
            } else {
                relevant = false
            }

            let orgName = inferOrganizationName(from: msg)
            let orgType = inferOrganizationType(domain: msg.senderDomain, subject: msg.subject)

            return ClassificationResult(
                emailId: msg.emailId,
                relevant: relevant,
                signalType: signalType,
                organizationName: orgName,
                organizationType: orgType,
                childName: mentionsChild ? childName : nil,
                confidence: mentionsChild ? "high" : (signalType != .other ? "medium" : "low")
            )
        }
    }

    private func inferOrganizationName(from msg: GmailMessage) -> String? {
        let domain = msg.senderDomain
        if domain.isEmpty { return nil }
        // Check subject for org names (e.g. "Allgood & Tehrani Invoice")
        // Otherwise clean domain
        let cleaned = domain
            .replacingOccurrences(of: ".com", with: "")
            .replacingOccurrences(of: ".org", with: "")
            .replacingOccurrences(of: ".edu", with: "")
            .replacingOccurrences(of: ".gov", with: "")
        let parts = cleaned.split(separator: ".")
        return parts.last.map { String($0).capitalized }
    }

    private func inferOrganizationType(domain: String, subject: String) -> String {
        let d = domain.lowercased()
        let s = subject.lowercased()
        if d.hasSuffix(".edu") || d.contains("school") || s.contains("class") { return "school" }
        if s.contains("aba") || s.contains("therapy") || s.contains("bcba") { return "therapy" }
        if s.contains("insurance") || s.contains("eob") || s.contains("claim") { return "insurance" }
        if d.contains("law") || s.contains("attorney") || s.contains("legal") { return "legal" }
        if d.hasSuffix(".gov") { return "government" }
        if s.contains("doctor") || s.contains("medical") { return "medical" }
        return "other"
    }
}
