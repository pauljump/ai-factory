/**
 * LiveActivityManager — Template for Lock Screen + Dynamic Island Live Activities.
 *
 * SETUP:
 * 1. Add a Widget Extension target to your Xcode project (File → New → Target → Widget Extension)
 * 2. Check "Include Live Activity" when creating the extension
 * 3. Add `NSSupportsLiveActivities = YES` to your app's Info.plist
 * 4. Copy this file into your app target (not the widget extension)
 * 5. Define your ActivityAttributes in the widget extension (see __PROJECT__ActivityWidget below)
 *
 * CUSTOMIZE:
 * - Replace __PROJECT__Attributes with your own ActivityAttributes struct
 * - Update ContentState with the dynamic data your Live Activity shows
 * - Customize the Lock Screen and Dynamic Island views in the widget extension
 *
 * USAGE:
 *   // Start a Live Activity
 *   LiveActivityManager.shared.start(state: .init(value: "Hello", progress: 0.5))
 *
 *   // Update it
 *   LiveActivityManager.shared.update(state: .init(value: "Updated", progress: 0.8))
 *
 *   // End it
 *   LiveActivityManager.shared.end()
 */

import ActivityKit
import Foundation

// MARK: - Activity Attributes (define your data shape)

/// The static data that doesn't change during the Live Activity.
/// Put this in BOTH your app target and widget extension target.
struct __PROJECT__Attributes: ActivityAttributes {
    /// The data that changes over time (shown on Lock Screen + Dynamic Island).
    struct ContentState: Codable, Hashable {
        // TODO: Replace with your dynamic fields
        var title: String
        var subtitle: String
        var progress: Double  // 0.0 to 1.0
    }

    // Static data — set once when starting the activity
    // TODO: Replace with your static fields
    var name: String
}

// MARK: - Live Activity Manager

@MainActor
final class LiveActivityManager: ObservableObject {
    static let shared = LiveActivityManager()

    @Published private(set) var isActive = false
    private var currentActivity: Activity<__PROJECT__Attributes>?

    private init() {}

    /// Start a new Live Activity on the Lock Screen and Dynamic Island.
    func start(
        name: String = "__PROJECT__",
        state: __PROJECT__Attributes.ContentState
    ) {
        guard ActivityAuthorizationInfo().areActivitiesEnabled else {
            print("[LiveActivity] Activities not enabled by user")
            return
        }

        let attributes = __PROJECT__Attributes(name: name)
        let content = ActivityContent(state: state, staleDate: nil)

        do {
            currentActivity = try Activity.request(
                attributes: attributes,
                content: content,
                pushType: nil  // Set to .token for push-based updates
            )
            isActive = true
            print("[LiveActivity] Started: \(currentActivity?.id ?? "unknown")")
        } catch {
            print("[LiveActivity] Failed to start: \(error)")
        }
    }

    /// Update the Live Activity with new data.
    func update(state: __PROJECT__Attributes.ContentState) {
        guard let activity = currentActivity else { return }

        Task {
            let content = ActivityContent(state: state, staleDate: nil)
            await activity.update(content)
            print("[LiveActivity] Updated")
        }
    }

    /// End the Live Activity. It stays on Lock Screen briefly then dismisses.
    func end(state: __PROJECT__Attributes.ContentState? = nil) {
        guard let activity = currentActivity else { return }

        Task {
            let finalContent: ActivityContent<__PROJECT__Attributes.ContentState>?
            if let state {
                finalContent = ActivityContent(state: state, staleDate: nil)
            } else {
                finalContent = nil
            }

            await activity.end(finalContent, dismissalPolicy: .default)
            currentActivity = nil
            isActive = false
            print("[LiveActivity] Ended")
        }
    }
}

// MARK: - Widget Extension Example
//
// Put this in your Widget Extension target (not the app target).
// This defines what the Live Activity looks like on Lock Screen + Dynamic Island.
//
// ```swift
// import WidgetKit
// import SwiftUI
//
// struct __PROJECT__ActivityWidget: Widget {
//     var body: some WidgetConfiguration {
//         ActivityConfiguration(for: __PROJECT__Attributes.self) { context in
//             // LOCK SCREEN view
//             VStack(alignment: .leading, spacing: 8) {
//                 Text(context.state.title)
//                     .font(.headline)
//                 Text(context.state.subtitle)
//                     .font(.subheadline)
//                     .foregroundStyle(.secondary)
//                 ProgressView(value: context.state.progress)
//                     .tint(.blue)
//             }
//             .padding()
//
//         } dynamicIsland: { context in
//             DynamicIsland {
//                 // EXPANDED Dynamic Island
//                 DynamicIslandExpandedRegion(.leading) {
//                     Text(context.state.title)
//                         .font(.headline)
//                 }
//                 DynamicIslandExpandedRegion(.trailing) {
//                     Text("\(Int(context.state.progress * 100))%")
//                         .font(.title2.bold())
//                 }
//                 DynamicIslandExpandedRegion(.bottom) {
//                     ProgressView(value: context.state.progress)
//                         .tint(.blue)
//                 }
//             } compactLeading: {
//                 // COMPACT leading (pill left side)
//                 Image(systemName: "circle.fill")
//                     .foregroundStyle(.blue)
//             } compactTrailing: {
//                 // COMPACT trailing (pill right side)
//                 Text("\(Int(context.state.progress * 100))%")
//                     .font(.caption2)
//             } minimal: {
//                 // MINIMAL (when multiple activities compete)
//                 Image(systemName: "circle.fill")
//                     .foregroundStyle(.blue)
//             }
//         }
//     }
// }
// ```
