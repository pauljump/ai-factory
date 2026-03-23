/**
 * AppIntentsManager — Template for Siri, Spotlight, and Shortcuts integration.
 *
 * App Intents make your app voice-controllable ("Hey Siri, search __PROJECT__ for coffee")
 * and visible in Spotlight search. As of iOS 16+, this is the modern replacement for
 * SiriKit Intents. iOS 18.4+ treats this as expected, not optional.
 *
 * SETUP:
 * 1. Copy this file into your app target
 * 2. Replace __PROJECT__ with your app name throughout
 * 3. Replace __ITEM__ with whatever your app's main entity is (Listing, Recipe, Task, etc.)
 * 4. Implement the actual data fetching in the perform() methods
 * 5. No capability or entitlement needed — App Intents work out of the box
 *
 * WHAT YOU GET:
 * - Siri voice commands ("Hey Siri, search __PROJECT__ for...")
 * - Shortcuts app integration (users can automate your app)
 * - Spotlight suggestions (your content appears in system search)
 * - Action button / shortcut widgets
 *
 * CUSTOMIZE:
 * - Add more intents for your app's key actions (see commented examples at bottom)
 * - Update AppShortcutsProvider phrases to match your app's vocabulary
 * - Add more entity properties to make Spotlight results richer
 */

import AppIntents
import Foundation

// MARK: - App Entity

/// An entity that Siri and Spotlight can reference.
/// TODO: Replace __ITEM__ with your app's main noun (Listing, Recipe, Task, Contact, etc.)
@available(iOS 16.0, *)
struct __ITEM__Entity: AppEntity {
    static var defaultQuery = __ITEM__EntityQuery()

    static var typeDisplayRepresentation: TypeDisplayRepresentation {
        // TODO: Set the display name for this entity type
        TypeDisplayRepresentation(name: "__ITEM__")
    }

    var displayRepresentation: DisplayRepresentation {
        DisplayRepresentation(title: "\(name)", subtitle: "\(subtitle)")
    }

    var id: String
    var name: String
    var subtitle: String

    // TODO: Add more properties that describe your entity
    // var price: Double?
    // var category: String?
    // var imageURL: URL?
}

/// Query that tells the system how to find entities.
/// Siri uses this when the user says "show me the __ITEM__ called X".
@available(iOS 16.0, *)
struct __ITEM__EntityQuery: EntityQuery {

    /// Find entities by their IDs (used when Siri already knows which entity).
    func entities(for identifiers: [String]) async throws -> [__ITEM__Entity] {
        // TODO: Fetch your items by ID from your data store
        // Example:
        // return DataStore.shared.items
        //     .filter { identifiers.contains($0.id) }
        //     .map { __ITEM__Entity(id: $0.id, name: $0.name, subtitle: $0.subtitle) }
        return []
    }

    /// Return suggested entities (shown in Shortcuts editor and Siri suggestions).
    func suggestedEntities() async throws -> [__ITEM__Entity] {
        // TODO: Return your most relevant / recent items
        // Example:
        // return DataStore.shared.recentItems.prefix(5).map {
        //     __ITEM__Entity(id: $0.id, name: $0.name, subtitle: $0.subtitle)
        // }
        return []
    }
}

// MARK: - Search Intent

/// "Hey Siri, search __PROJECT__ for coffee"
/// A query intent that takes a search term and returns results.
@available(iOS 16.0, *)
struct Search__PROJECT__Intent: AppIntent {
    // TODO: Update the title to match your app
    static var title: LocalizedStringResource = "Search __PROJECT__"
    static var description = IntentDescription("Search for items in __PROJECT__.")

    /// The search query — Siri will ask for this if the user doesn't provide it.
    @Parameter(title: "Query", description: "What to search for")
    var query: String

    /// What happens when this intent runs.
    func perform() async throws -> some IntentResult & ProvidesDialog {
        // TODO: Replace with your actual search logic
        // let results = try await APIClient.shared.search(query: query)
        // let count = results.count
        let count = 0

        return .result(
            dialog: "Found \(count) results for \"\(query)\" in __PROJECT__."
        )
    }

    // To return results that Siri can display as a list, use:
    // func perform() async throws -> some IntentResult & ReturnsValue<[__ITEM__Entity]> {
    //     let results = try await search(query)
    //     return .result(value: results.map { ... })
    // }
}

// MARK: - Open Detail Intent

/// "Hey Siri, open __ITEM__ in __PROJECT__"
/// Opens the app and navigates to a specific item's detail screen.
@available(iOS 16.0, *)
struct Open__ITEM__Intent: AppIntent {
    // TODO: Update the title to match your entity
    static var title: LocalizedStringResource = "Open __ITEM__"
    static var description = IntentDescription("Open a specific __ITEM__ in __PROJECT__.")

    /// The entity to open — Siri will prompt the user to pick one.
    @Parameter(title: "__ITEM__")
    var item: __ITEM__Entity

    /// Tells the system this intent opens the app (required for navigation intents).
    static var openAppWhenRun: Bool = true

    func perform() async throws -> some IntentResult {
        // TODO: Set your app's navigation state to show this item.
        // Example using a shared NavigationState observable:
        // await MainActor.run {
        //     NavigationState.shared.navigate(to: .detail(id: item.id))
        // }
        return .result()
    }
}

// MARK: - App Shortcuts Provider

/// Registers shortcuts so they appear in the Shortcuts app and Siri automatically.
/// Users don't have to set these up — they're available as soon as the app is installed.
@available(iOS 16.0, *)
struct __PROJECT__ShortcutsProvider: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        // TODO: Replace __PROJECT__ in the phrases with your actual app name.
        // Phrases MUST contain the app name — Siri uses it to route the command.

        AppShortcut(
            intent: Search__PROJECT__Intent(),
            phrases: [
                // TODO: Add natural phrases users would say
                "Search \(.applicationName) for \(\.$query)",
                "Find \(\.$query) in \(.applicationName)",
                "Look up \(\.$query) on \(.applicationName)",
            ],
            shortTitle: "Search",
            systemImageName: "magnifyingglass"
        )

        AppShortcut(
            intent: Open__ITEM__Intent(),
            phrases: [
                "Open \(\.$item) in \(.applicationName)",
                "Show \(\.$item) on \(.applicationName)",
            ],
            shortTitle: "Open __ITEM__",
            systemImageName: "arrow.up.forward.app"
        )

        // TODO: Add more shortcuts for your app's key actions
        // AppShortcut(
        //     intent: Toggle__FEATURE__Intent(),
        //     phrases: [
        //         "Turn on \(.applicationName) notifications",
        //         "Enable \(.applicationName) alerts",
        //     ],
        //     shortTitle: "Toggle Alerts",
        //     systemImageName: "bell"
        // )
    }
}

// MARK: - More Intent Patterns (Commented Examples)
//
// Copy and adapt these for your app's specific actions.
//
// --- Toggle Intent ---
// Turns a feature on or off. Good for alerts, dark mode, tracking, etc.
//
// @available(iOS 16.0, *)
// struct ToggleAlertsIntent: AppIntent {
//     static var title: LocalizedStringResource = "Toggle __PROJECT__ Alerts"
//
//     @Parameter(title: "Enabled")
//     var enabled: Bool
//
//     func perform() async throws -> some IntentResult & ProvidesDialog {
//         // UserDefaults.standard.set(enabled, forKey: "alertsEnabled")
//         let status = enabled ? "on" : "off"
//         return .result(dialog: "Alerts are now \(status).")
//     }
// }
//
// --- Create Intent ---
// Creates a new item. Good for notes, tasks, bookmarks, etc.
//
// @available(iOS 16.0, *)
// struct Create__ITEM__Intent: AppIntent {
//     static var title: LocalizedStringResource = "Create __ITEM__"
//
//     @Parameter(title: "Name")
//     var name: String
//
//     @Parameter(title: "Category", default: "General")
//     var category: String?
//
//     func perform() async throws -> some IntentResult & ProvidesDialog {
//         // let item = DataStore.shared.create(name: name, category: category)
//         return .result(dialog: "Created \"\(name)\" in __PROJECT__.")
//     }
// }
//
// --- Query with Filter Intent ---
// Returns a filtered list. Good for "show me my recent X" or "what's trending".
//
// @available(iOS 16.0, *)
// struct Recent__ITEM__sIntent: AppIntent {
//     static var title: LocalizedStringResource = "Recent __ITEM__s"
//
//     @Parameter(title: "Limit", default: 5)
//     var limit: Int
//
//     func perform() async throws -> some IntentResult & ProvidesDialog {
//         // let items = DataStore.shared.recent(limit: limit)
//         // let names = items.map(\.name).joined(separator: ", ")
//         return .result(dialog: "Here are your recent items.")
//     }
// }
