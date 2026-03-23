import Foundation

// MARK: - FeedItem

struct FeedItem: Identifiable {
    let id: String
    let type: FeedItemType
    let title: String
    let subtitle: String
    let body: String?
    let date: Date?
    let icon: String
    let emailId: String?

    enum FeedItemType {
        case emailSignal(CareSignalType)
        case kitObservation
    }
}

// MARK: - CareSignalFeed

@MainActor
class CareSignalFeed: ObservableObject {

    @Published var items: [FeedItem] = []
    @Published var isRefreshing = false

    // MARK: - Public

    func loadFeed(forChild childId: Int, limit: Int = 50) {
        isRefreshing = true
        defer { isRefreshing = false }

        let db = CareVaultDB.shared
        let signals = db.careSignals(forChild: childId, limit: limit, offset: 0)
        let observations = generateObservations(childId: childId)

        var feedItems: [FeedItem] = []

        // Convert care signals to feed items
        let formatter = ISO8601DateFormatter()
        for signal in signals {
            let date = signal.emailDate.flatMap { formatter.date(from: $0) }
            feedItems.append(FeedItem(
                id: "signal-\(signal.id)",
                type: .emailSignal(signal.signalType),
                title: "\(signal.signalType.displayName)\(signal.senderDomain.map { " — \($0)" } ?? "")",
                subtitle: signal.emailSender ?? signal.senderDomain ?? "",
                body: signal.emailBodySnippet ?? signal.summary,
                date: date,
                icon: signal.signalType.icon,
                emailId: signal.emailId
            ))
        }

        feedItems.append(contentsOf: observations)
        items = feedItems.sorted { ($0.date ?? .distantPast) > ($1.date ?? .distantPast) }
    }

    // MARK: - Observation Generation

    /// Generates Kit's own analytical observations from the stored data.
    /// These are synthetic feed items — not emails, but Kit's analysis.
    func generateObservations(childId: Int) -> [FeedItem] {
        var observations: [FeedItem] = []

        // 1. IEP deadline alert
        if let iepAlert = iepDeadlineObservation(childId: childId) {
            observations.append(iepAlert)
        }

        // 2. Provider gap detection
        observations.append(contentsOf: providerGapObservations(childId: childId))

        // 3. Weekly update pattern detection
        if let patternAlert = weeklyUpdatePatternObservation(childId: childId) {
            observations.append(patternAlert)
        }

        // 4. Missing document sequence
        observations.append(contentsOf: missingDocumentObservations(childId: childId))

        return observations
    }

    // MARK: - Observation: IEP Deadline Alert

    private func iepDeadlineObservation(childId: Int) -> FeedItem? {
        let db = CareVaultDB.shared
        let events = db.timeline(forChild: childId)
        let formatter = ISO8601DateFormatter()

        // Find the most recent IEP timeline event
        let iepEvents = events.filter { $0.eventType.lowercased().contains("iep") }
        guard let mostRecent = iepEvents.max(by: {
            let a = formatter.date(from: $0.eventDate) ?? .distantPast
            let b = formatter.date(from: $1.eventDate) ?? .distantPast
            return a < b
        }) else {
            return nil
        }

        guard let iepDate = formatter.date(from: mostRecent.eventDate) else { return nil }

        // Annual review is due 365 days after the IEP date
        let annualReviewDate = Calendar.current.date(byAdding: .day, value: 365, to: iepDate) ?? iepDate
        let daysUntilReview = Calendar.current.dateComponents([.day], from: Date(), to: annualReviewDate).day ?? 0

        // Only surface within 90 days
        guard daysUntilReview <= 90 else { return nil }

        let urgency = daysUntilReview <= 30 ? "soon" : "in \(daysUntilReview) days"
        return FeedItem(
            id: "obs-iep-deadline-\(childId)",
            type: .kitObservation,
            title: "IEP Annual Review Due \(urgency.capitalized)",
            subtitle: "Kit Observation",
            body: "Based on your most recent IEP, the annual review is due \(urgency). Annual reviews are required by law — your school must schedule one.",
            date: annualReviewDate,
            icon: "calendar.badge.exclamationmark",
            emailId: nil
        )
    }

    // MARK: - Observation: Provider Gap Detection

    private func providerGapObservations(childId: Int) -> [FeedItem] {
        let db = CareVaultDB.shared
        let members = db.careTeamMembers(forChild: childId)
        let formatter = ISO8601DateFormatter()
        let sixWeeksAgo = Calendar.current.date(byAdding: .weekOfYear, value: -6, to: Date()) ?? Date()

        var results: [FeedItem] = []
        for member in members {
            guard let lastContactStr = member.lastContactDate,
                  let lastContact = formatter.date(from: lastContactStr) else { continue }

            guard lastContact < sixWeeksAgo else { continue }

            let weeksAgo = Calendar.current.dateComponents([.weekOfYear], from: lastContact, to: Date()).weekOfYear ?? 6
            results.append(FeedItem(
                id: "obs-gap-\(member.id)",
                type: .kitObservation,
                title: "No contact with \(member.name) in \(weeksAgo)+ weeks",
                subtitle: "Kit Observation",
                body: "Kit hasn't seen any emails from \(member.domain) recently. If services are ongoing, this gap is worth checking on.",
                date: lastContact,
                icon: "person.fill.questionmark",
                emailId: nil
            ))
        }
        return results
    }

    // MARK: - Observation: Weekly Update Pattern Detection

    private func weeklyUpdatePatternObservation(childId: Int) -> FeedItem? {
        let db = CareVaultDB.shared
        let signals = db.careSignals(forChild: childId, limit: 500, offset: 0)
        let weeklyUpdates = signals.filter { $0.signalType == .weeklyUpdate }

        guard weeklyUpdates.count >= 3 else { return nil }

        // V1 heuristic: check recent weekly updates for "transition" mentions
        let recentUpdates = Array(weeklyUpdates.prefix(10))
        let transitionCount = recentUpdates.filter { signal in
            let snippet = (signal.emailBodySnippet ?? signal.summary).lowercased()
            return snippet.contains("transition")
        }.count

        guard transitionCount >= 3 else { return nil }

        return FeedItem(
            id: "obs-transition-pattern-\(childId)",
            type: .kitObservation,
            title: "Transition mentioned in \(transitionCount) recent updates",
            subtitle: "Kit Observation",
            body: "Kit noticed \"transition\" appearing repeatedly in recent weekly updates. This may be worth following up with your team — transitions often need documented support plans.",
            date: Date(),
            icon: "arrow.triangle.2.circlepath",
            emailId: nil
        )
    }

    // MARK: - Observation: Missing Document Sequence

    private func missingDocumentObservations(childId: Int) -> [FeedItem] {
        let db = CareVaultDB.shared
        let signals = db.careSignals(forChild: childId, limit: 500, offset: 0)
        let types = Set(signals.map { $0.signalType })

        var results: [FeedItem] = []

        // Has evaluation signals but no IEP signals
        if types.contains(.evaluation) && !types.contains(.iep) {
            results.append(FeedItem(
                id: "obs-missing-iep-\(childId)",
                type: .kitObservation,
                title: "You have an eval but no IEP after it",
                subtitle: "Kit Observation",
                body: "Kit found evaluation documents but no IEP. If your child is school-age, an IEP meeting should follow an evaluation within 60 days in most states.",
                date: Date(),
                icon: "doc.badge.exclamationmark",
                emailId: nil
            ))
        }

        // Has IEP but no service records
        if types.contains(.iep) && !types.contains(.schedule) && !types.contains(.invoice) && !types.contains(.report) {
            results.append(FeedItem(
                id: "obs-missing-services-\(childId)",
                type: .kitObservation,
                title: "You have an IEP but no services on file",
                subtitle: "Kit Observation",
                body: "Kit found an IEP but no therapy schedules, invoices, or progress reports yet. Services outlined in the IEP should start soon after it's signed.",
                date: Date(),
                icon: "exclamationmark.triangle.fill",
                emailId: nil
            ))
        }

        return results
    }
}
