/**
 * BackgroundTaskManager — Template for BGAppRefreshTask, BGProcessingTask, and silent push handling.
 *
 * iOS gives your app limited time to run in the background. There are three mechanisms:
 *
 * 1. **BGAppRefreshTask** — lightweight, runs for ~30 seconds. Use for syncing small amounts
 *    of data, checking for updates, refreshing cached content. iOS decides when to run it
 *    based on user behavior (apps used frequently get more background time).
 *
 * 2. **BGProcessingTask** — heavier, runs for several minutes. Can request external power
 *    and network connectivity. Use for database maintenance, large imports/exports, ML model
 *    updates. Only runs when the device is charging and on Wi-Fi (if requested).
 *
 * 3. **Silent Push** — server-triggered. Send a push notification with content-available: 1
 *    and no alert/badge/sound. iOS wakes your app for ~30 seconds to fetch new data.
 *    Use for: real-time data sync, content pre-loading, state updates from your server.
 *
 * SETUP:
 * 1. Enable "Background Modes" capability in Xcode
 *    (Signing & Capabilities → + Capability → Background Modes)
 * 2. Check "Background fetch" and "Background processing"
 * 3. If using silent push: also check "Remote notifications"
 * 4. Add task identifiers to Info.plist (see bottom of file)
 * 5. Copy this file into your app target
 * 6. Call BackgroundTaskManager.shared.registerTasks() in your App init (see bottom)
 *
 * CUSTOMIZE:
 * - Set `appRefreshTaskId` and `processingTaskId` to your bundle-specific identifiers
 * - Implement your sync logic in `performAppRefresh()`
 * - Implement your processing logic in `performProcessing()`
 * - Implement your silent push logic in `handleSilentPush(userInfo:)`
 */

import Foundation
import BackgroundTasks
import UIKit

@MainActor
final class BackgroundTaskManager: ObservableObject {
    static let shared = BackgroundTaskManager()

    // TODO: Set these to your app's task identifiers (must match Info.plist)
    // Convention: use reverse-domain notation with a descriptive suffix
    private let appRefreshTaskId = "__BUNDLE_ID__.refresh"
    private let processingTaskId = "__BUNDLE_ID__.processing"

    /// Tracks the last time each task ran (for debugging / UI display).
    @Published private(set) var lastRefreshDate: Date?
    @Published private(set) var lastProcessingDate: Date?

    private init() {}

    // MARK: - Task Registration

    /// Register all background tasks with the system.
    /// Call this ONCE during app initialization (before the end of app launch).
    func registerTasks() {
        BGTaskScheduler.shared.register(
            forTaskWithIdentifier: appRefreshTaskId,
            using: nil
        ) { task in
            guard let refreshTask = task as? BGAppRefreshTask else { return }
            Task { @MainActor in
                await self.handleAppRefresh(task: refreshTask)
            }
        }

        BGTaskScheduler.shared.register(
            forTaskWithIdentifier: processingTaskId,
            using: nil
        ) { task in
            guard let processingTask = task as? BGProcessingTask else { return }
            Task { @MainActor in
                await self.handleProcessing(task: processingTask)
            }
        }

        print("[BGTask] Registered background tasks")

        // Schedule the first refresh
        scheduleAppRefresh()
    }

    // MARK: - Scheduling

    /// Schedule the next app refresh task.
    /// iOS determines the actual execution time based on user behavior.
    func scheduleAppRefresh() {
        let request = BGAppRefreshTaskRequest(identifier: appRefreshTaskId)
        // Earliest time iOS should consider running this task.
        // Setting to 15 minutes, but iOS may delay it significantly.
        request.earliestBeginDate = Date(timeIntervalSinceNow: 15 * 60)

        do {
            try BGTaskScheduler.shared.submit(request)
            print("[BGTask] Scheduled app refresh")
        } catch {
            print("[BGTask] Failed to schedule app refresh: \(error)")
        }
    }

    /// Schedule a processing task.
    /// Only runs when device is idle, charging (if requested), and on Wi-Fi (if requested).
    func scheduleProcessing(requiresNetwork: Bool = true, requiresCharging: Bool = false) {
        let request = BGProcessingTaskRequest(identifier: processingTaskId)
        request.requiresNetworkConnectivity = requiresNetwork
        request.requiresExternalPower = requiresCharging
        // Give iOS at least 1 hour before considering this task
        request.earliestBeginDate = Date(timeIntervalSinceNow: 60 * 60)

        do {
            try BGTaskScheduler.shared.submit(request)
            print("[BGTask] Scheduled processing task (network: \(requiresNetwork), charging: \(requiresCharging))")
        } catch {
            print("[BGTask] Failed to schedule processing: \(error)")
        }
    }

    // MARK: - App Refresh Handler

    /// Handle a background app refresh task (~30 seconds max).
    private func handleAppRefresh(task: BGAppRefreshTask) async {
        // Schedule the next refresh immediately — if this task gets killed,
        // we still want the next one queued up.
        scheduleAppRefresh()

        // Set up expiration handler — iOS calls this when time is about to run out.
        // Clean up gracefully (cancel network requests, save partial state).
        task.expirationHandler = {
            print("[BGTask] App refresh expired — cleaning up")
            // TODO: Cancel any in-flight work here
        }

        // Perform the actual work
        let success = await performAppRefresh()
        task.setTaskCompleted(success: success)

        lastRefreshDate = Date()
        print("[BGTask] App refresh completed (success: \(success))")
    }

    /// Your app-specific refresh logic goes here.
    /// Keep it lightweight — you have ~30 seconds.
    private func performAppRefresh() async -> Bool {
        // TODO: Implement your sync logic
        // Examples:
        // - Fetch latest data from your API
        // - Sync local changes to the server
        // - Update cached content
        // - Check for new notifications

        // Example:
        // do {
        //     let newData: [Item] = try await APIClient.get("/items/recent")
        //     await DataStore.shared.merge(newData)
        //     return true
        // } catch {
        //     print("[BGTask] Refresh failed: \(error)")
        //     return false
        // }

        print("[BGTask] performAppRefresh() — TODO: implement sync logic")
        return true
    }

    // MARK: - Processing Task Handler

    /// Handle a background processing task (several minutes, runs during idle/charging).
    private func handleProcessing(task: BGProcessingTask) async {
        task.expirationHandler = {
            print("[BGTask] Processing expired — cleaning up")
            // TODO: Cancel heavy work, save progress so it can resume next time
        }

        let success = await performProcessing()
        task.setTaskCompleted(success: success)

        lastProcessingDate = Date()
        print("[BGTask] Processing completed (success: \(success))")
    }

    /// Your app-specific processing logic goes here.
    /// This runs during optimal conditions (charging, Wi-Fi) and has more time.
    private func performProcessing() async -> Bool {
        // TODO: Implement your heavy processing logic
        // Examples:
        // - Import/export large datasets
        // - Run database migrations or cleanup
        // - Process images or media
        // - Update ML models
        // - Generate reports or analytics

        // Example:
        // do {
        //     let exportData = try DataStore.shared.exportAll()
        //     try await APIClient.post("/sync/full", body: exportData)
        //     try DataStore.shared.pruneOldRecords(olderThan: .now.addingTimeInterval(-30 * 24 * 60 * 60))
        //     return true
        // } catch {
        //     print("[BGTask] Processing failed: \(error)")
        //     return false
        // }

        print("[BGTask] performProcessing() — TODO: implement processing logic")
        return true
    }

    // MARK: - Silent Push Handler

    /// Handle a silent push notification (content-available: 1).
    /// Call this from your AppDelegate's didReceiveRemoteNotification.
    /// You have ~30 seconds to fetch data and call the completion handler.
    func handleSilentPush(
        userInfo: [AnyHashable: Any],
        completionHandler: @escaping (UIBackgroundFetchResult) -> Void
    ) {
        print("[BGTask] Silent push received: \(userInfo)")

        // TODO: Implement your silent push logic based on the payload
        // The server controls what data to sync by varying the push payload.

        // Example:
        // guard let action = userInfo["action"] as? String else {
        //     completionHandler(.noData)
        //     return
        // }
        //
        // Task {
        //     switch action {
        //     case "sync":
        //         let items: [Item] = try await APIClient.get("/items/recent")
        //         await DataStore.shared.merge(items)
        //         completionHandler(items.isEmpty ? .noData : .newData)
        //     case "invalidate":
        //         DataStore.shared.clearCache()
        //         completionHandler(.newData)
        //     default:
        //         completionHandler(.noData)
        //     }
        // }

        completionHandler(.noData)
    }
}

// MARK: - Debugging Helpers

extension BackgroundTaskManager {
    /// Simulate a background task for testing in Xcode.
    /// Run this in the debugger: `e -l objc -- (void)[[BGTaskScheduler sharedScheduler] _simulateLaunchForTaskWithIdentifier:@"com.yourapp.refresh"]`
    ///
    /// Or call this method to trigger tasks manually during development:
    func simulateRefreshForTesting() async {
        print("[BGTask] Simulating app refresh for testing...")
        let success = await performAppRefresh()
        lastRefreshDate = Date()
        print("[BGTask] Simulated refresh completed (success: \(success))")
    }

    func simulateProcessingForTesting() async {
        print("[BGTask] Simulating processing for testing...")
        let success = await performProcessing()
        lastProcessingDate = Date()
        print("[BGTask] Simulated processing completed (success: \(success))")
    }
}

// MARK: - App Integration
//
// Wire up background tasks in your App struct:
//
// ```swift
// @main
// struct MyApp: App {
//     @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate
//
//     init() {
//         BackgroundTaskManager.shared.registerTasks()
//     }
//
//     var body: some Scene {
//         WindowGroup {
//             ContentView()
//         }
//     }
// }
//
// class AppDelegate: NSObject, UIApplicationDelegate {
//     // Silent push handling
//     func application(
//         _ application: UIApplication,
//         didReceiveRemoteNotification userInfo: [AnyHashable: Any],
//         fetchCompletionHandler completionHandler: @escaping (UIBackgroundFetchResult) -> Void
//     ) {
//         Task { @MainActor in
//             BackgroundTaskManager.shared.handleSilentPush(
//                 userInfo: userInfo,
//                 completionHandler: completionHandler
//             )
//         }
//     }
// }
// ```

// MARK: - Info.plist Setup
//
// Add your task identifiers to Info.plist so iOS knows which tasks your app can run:
//
// ```xml
// <key>BGTaskSchedulerPermittedIdentifiers</key>
// <array>
//   <string>com.yourapp.bundleid.refresh</string>
//   <string>com.yourapp.bundleid.processing</string>
// </array>
// ```
//
// Or in XcodeGen (project.yml):
//
// ```yaml
// targets:
//   MyApp:
//     info:
//       properties:
//         BGTaskSchedulerPermittedIdentifiers:
//           - com.yourapp.bundleid.refresh
//           - com.yourapp.bundleid.processing
// ```
//
// Also ensure Background Modes are enabled:
//
// ```xml
// <key>UIBackgroundModes</key>
// <array>
//   <string>fetch</string>
//   <string>processing</string>
//   <string>remote-notification</string>
// </array>
// ```

// MARK: - Server-Side Silent Push Payload
//
// Send this payload from your server to trigger a silent push:
//
// ```json
// {
//   "aps": {
//     "content-available": 1
//   },
//   "action": "sync"
// }
// ```
//
// Important:
// - Do NOT include "alert", "badge", or "sound" — that makes it a visible notification
// - The "content-available": 1 flag tells iOS to wake your app silently
// - iOS throttles silent pushes — don't send more than a few per hour
// - The push MUST use the APNs "background" priority (apns-priority: 5), not "immediate" (10)
