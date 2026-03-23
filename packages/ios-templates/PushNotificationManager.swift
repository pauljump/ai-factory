/**
 * PushNotificationManager — Template for APNs push notification registration + handling.
 *
 * SETUP:
 * 1. Enable "Push Notifications" capability in your Xcode project
 *    (Signing & Capabilities → + Capability → Push Notifications)
 * 2. Enable "Background Modes → Remote notifications" if you need silent pushes
 * 3. Create an APNs key in Apple Developer portal (Keys → + → Apple Push Notifications service)
 * 4. Copy this file into your app target
 * 5. Call PushNotificationManager.shared.requestPermission() on app launch
 * 6. Set up your AppDelegate (see bottom of file for UIApplicationDelegate example)
 *
 * CUSTOMIZE:
 * - Set `apiEndpoint` to your server's token registration URL
 * - Adjust `authorizationOptions` if you need different permission types
 * - Add custom notification categories/actions in `setupNotificationCategories()`
 */

import Foundation
import UserNotifications
import UIKit

@MainActor
final class PushNotificationManager: NSObject, ObservableObject {
    static let shared = PushNotificationManager()

    /// The hex-encoded APNs device token, available after successful registration.
    @Published private(set) var deviceToken: String?

    /// Whether the user has granted notification permission.
    @Published private(set) var isAuthorized = false

    /// Current authorization status.
    @Published private(set) var authorizationStatus: UNAuthorizationStatus = .notDetermined

    // TODO: Set this to your API endpoint for storing device tokens
    private let apiEndpoint = "__API_BASE_URL__/api/push/register"

    private override init() {
        super.init()
        UNUserNotificationCenter.current().delegate = self
    }

    // MARK: - Permission Request

    /// Request notification permission from the user.
    /// Call this early in your app lifecycle (e.g., onAppear of your root view).
    func requestPermission() async {
        do {
            let granted = try await UNUserNotificationCenter.current().requestAuthorization(
                options: [.alert, .badge, .sound]
            )
            isAuthorized = granted

            if granted {
                // Register with APNs to get a device token
                UIApplication.shared.registerForRemoteNotifications()
                print("[Push] Permission granted, registering for remote notifications")
            } else {
                print("[Push] Permission denied by user")
            }

            // Update the stored status
            await refreshAuthorizationStatus()
        } catch {
            print("[Push] Failed to request permission: \(error)")
        }
    }

    /// Check the current authorization status without prompting.
    func refreshAuthorizationStatus() async {
        let settings = await UNUserNotificationCenter.current().notificationSettings()
        authorizationStatus = settings.authorizationStatus
        isAuthorized = settings.authorizationStatus == .authorized
    }

    // MARK: - Device Token Handling

    /// Called by AppDelegate when APNs registration succeeds.
    /// Converts the raw token to a hex string and sends it to your API.
    func handleDeviceToken(_ tokenData: Data) {
        let token = tokenData.map { String(format: "%02x", $0) }.joined()
        deviceToken = token
        print("[Push] Device token: \(token)")

        // Send token to your backend
        Task {
            await sendTokenToServer(token: token)
        }
    }

    /// Called by AppDelegate when APNs registration fails.
    func handleRegistrationError(_ error: Error) {
        print("[Push] Registration failed: \(error.localizedDescription)")
    }

    // MARK: - Send Token to Server

    /// POST the device token to your API so you can send pushes later.
    private func sendTokenToServer(token: String) async {
        guard let url = URL(string: apiEndpoint) else {
            print("[Push] Invalid API endpoint: \(apiEndpoint)")
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        // TODO: Add your auth header if needed
        // request.setValue("Bearer \(authToken)", forHTTPHeaderField: "Authorization")

        let body: [String: Any] = [
            "token": token,
            "platform": "ios",
            "bundleId": Bundle.main.bundleIdentifier ?? "unknown",
        ]

        do {
            request.httpBody = try JSONSerialization.data(withJSONObject: body)
            let (_, response) = try await URLSession.shared.data(for: request)

            if let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 {
                print("[Push] Token registered with server")
            } else {
                print("[Push] Server returned unexpected response")
            }
        } catch {
            print("[Push] Failed to send token to server: \(error)")
        }
    }

    // MARK: - Notification Categories (Optional)

    /// Register custom notification categories with actions.
    /// Call this during app setup if you need actionable notifications.
    func setupNotificationCategories() {
        // Example: a notification with "Accept" and "Decline" buttons
        // let acceptAction = UNNotificationAction(
        //     identifier: "ACCEPT",
        //     title: "Accept",
        //     options: [.foreground]
        // )
        // let declineAction = UNNotificationAction(
        //     identifier: "DECLINE",
        //     title: "Decline",
        //     options: [.destructive]
        // )
        // let category = UNNotificationCategory(
        //     identifier: "INVITE",
        //     actions: [acceptAction, declineAction],
        //     intentIdentifiers: []
        // )
        // UNUserNotificationCenter.current().setNotificationCategories([category])
    }
}

// MARK: - UNUserNotificationCenterDelegate

extension PushNotificationManager: UNUserNotificationCenterDelegate {

    /// Called when a notification arrives while the app is in the foreground.
    /// Return the presentation options to show it (banner, sound, badge) or [] to suppress.
    nonisolated func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        let userInfo = notification.request.content.userInfo
        print("[Push] Foreground notification: \(userInfo)")

        // Show the notification even when the app is in the foreground
        completionHandler([.banner, .sound, .badge])
    }

    /// Called when the user taps a notification (foreground or background).
    /// Use this to navigate to the relevant screen.
    nonisolated func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping () -> Void
    ) {
        let userInfo = response.notification.request.content.userInfo
        let actionIdentifier = response.actionIdentifier
        print("[Push] Notification tapped — action: \(actionIdentifier), payload: \(userInfo)")

        // TODO: Handle navigation based on the notification payload.
        // Example:
        // if let screen = userInfo["screen"] as? String {
        //     NavigationState.shared.navigate(to: screen)
        // }

        // Handle custom actions from notification categories
        // switch actionIdentifier {
        // case "ACCEPT":
        //     handleAccept(userInfo)
        // case "DECLINE":
        //     handleDecline(userInfo)
        // default:
        //     break
        // }

        completionHandler()
    }
}

// MARK: - AppDelegate Integration
//
// Add this to your App struct or AppDelegate to wire up push notifications:
//
// ```swift
// // SwiftUI App with UIApplicationDelegate
// @main
// struct MyApp: App {
//     @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate
//
//     var body: some Scene {
//         WindowGroup {
//             ContentView()
//                 .task {
//                     await PushNotificationManager.shared.requestPermission()
//                 }
//         }
//     }
// }
//
// class AppDelegate: NSObject, UIApplicationDelegate {
//     func application(
//         _ application: UIApplication,
//         didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
//     ) {
//         Task { @MainActor in
//             PushNotificationManager.shared.handleDeviceToken(deviceToken)
//         }
//     }
//
//     func application(
//         _ application: UIApplication,
//         didFailToRegisterForRemoteNotificationsWithError error: Error
//     ) {
//         Task { @MainActor in
//             PushNotificationManager.shared.handleRegistrationError(error)
//         }
//     }
// }
// ```
