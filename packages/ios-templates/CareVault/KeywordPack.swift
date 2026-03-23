import Foundation

/// Signal-centric classification of care-related documents.
/// Replaces DocumentType with richer semantic categories that reflect
/// what parents actually receive, not just what files look like.
enum CareSignalType: String, Codable, CaseIterable {
    case iep            // IEP documents and related correspondence
    case evaluation     // Evals, assessments, test results
    case invoice        // Billing, payments, statements
    case insurance      // EOBs, claims, authorizations, denials
    case report         // Progress reports, session summaries
    case schedule       // Appointments, cancellations, changes
    case legal          // Due process, hearings, appeals
    case enrollment     // Registration, intake, consent forms
    case goalUpdate     // Goal progress, milestone notes
    case weeklyUpdate   // Recurring school/therapy updates
    case communication  // General provider-parent correspondence
    case other          // Care-related but uncategorized

    var displayName: String {
        switch self {
        case .iep:           return "IEP / IFSP"
        case .evaluation:    return "Evaluation"
        case .invoice:       return "Invoice"
        case .insurance:     return "Insurance / EOB"
        case .report:        return "Progress Report"
        case .schedule:      return "Schedule"
        case .legal:         return "Legal"
        case .enrollment:    return "Enrollment"
        case .goalUpdate:    return "Goal Update"
        case .weeklyUpdate:  return "Weekly Update"
        case .communication: return "Communication"
        case .other:         return "Other"
        }
    }

    var icon: String {
        switch self {
        case .iep:           return "doc.text.fill"
        case .evaluation:    return "chart.bar.doc.horizontal.fill"
        case .invoice:       return "dollarsign.circle.fill"
        case .insurance:     return "shield.fill"
        case .report:        return "list.clipboard.fill"
        case .schedule:      return "calendar"
        case .legal:         return "building.columns.fill"
        case .enrollment:    return "person.badge.plus.fill"
        case .goalUpdate:    return "star.fill"
        case .weeklyUpdate:  return "clock.arrow.2.circlepath"
        case .communication: return "envelope.fill"
        case .other:         return "folder.fill"
        }
    }

    /// Migrate a raw DocumentType string from the old enum to a CareSignalType.
    static func fromLegacyDocumentType(_ raw: String) -> CareSignalType {
        switch raw {
        case "iep":        return .iep
        case "eval":       return .evaluation
        case "invoice":    return .invoice
        case "eob":        return .insurance
        case "report":     return .report
        case "schedule":   return .schedule
        case "legal":      return .legal
        case "enrollment": return .enrollment
        case "letter":     return .communication
        case "other":      return .other
        default:           return .other
        }
    }
}

/// Factory protocol for domain-specific keyword packs.
/// Tenants implement this to teach CareVault which emails are care-related
/// and how to classify them into CareSignalType buckets.
protocol KeywordPack {
    /// High-specificity Gmail search queries — each will return very few, very relevant results.
    var highSpecificityQueries: [String] { get }

    /// Lower-specificity queries — broader net, more noise expected.
    var lowSpecificityQueries: [String] { get }

    /// Sender domains to ignore outright (newsletters, banks, retailers, etc.).
    var noiseDomains: Set<String> { get }

    /// Translate a domain acronym to plain English. Returns nil if unknown.
    func translate(_ term: String) -> String?

    /// Classify a message into a CareSignalType based on subject, sender, and attachment name.
    func classifyDocument(subject: String, sender: String, attachmentName: String?) -> CareSignalType
}
