/**
 * DeepLinkRouter — Template for Universal Links, custom URL schemes, and QR code scanning.
 *
 * DEEP LINKING OVERVIEW:
 *
 * There are two ways to open your app from a URL:
 *
 * 1. **Universal Links** (recommended) — standard HTTPS URLs (e.g., https://yourapp.com/listing/123).
 *    These open your app if installed, or fall back to the website if not. They're trusted by iOS
 *    because you prove domain ownership via an apple-app-site-association (AASA) file.
 *    Use for: sharing links, email campaigns, web-to-app handoff, QR codes.
 *
 * 2. **Custom URL Schemes** (e.g., yourapp://listing/123). These always open your app but have
 *    no fallback — if the app isn't installed, nothing happens. Any app can claim any scheme,
 *    so they're less secure. Use for: inter-app communication, OAuth callbacks, testing.
 *
 * **QR Codes / NFC Tags:** Encode a Universal Link URL. When scanned, iOS opens your app
 * directly (if installed) or Safari (if not). No special handling needed — the same
 * onOpenURL / universalLink handler fires.
 *
 * SETUP:
 * 1. Enable "Associated Domains" capability in Xcode
 *    (Signing & Capabilities → + Capability → Associated Domains)
 * 2. Add your domain: "applinks:yourdomain.com"
 * 3. Host an apple-app-site-association file at https://yourdomain.com/.well-known/apple-app-site-association
 *    (see AASA example at the bottom of this file)
 * 4. For custom URL schemes: add URL Types in Info.plist (see bottom of file)
 * 5. Copy this file into your app target
 * 6. Wire up in your App struct (see integration example at bottom)
 *
 * CUSTOMIZE:
 * - Add your routes to the `Destination` enum
 * - Update `parse(_:)` with your URL path patterns
 * - Set `customScheme` to your app's URL scheme
 */

import SwiftUI
import AVFoundation

// MARK: - Deep Link Router

/// Centralized URL routing for Universal Links and custom URL schemes.
/// Parses incoming URLs into typed `Destination` values for navigation.
@MainActor
final class DeepLinkRouter: ObservableObject {
    static let shared = DeepLinkRouter()

    /// The current destination from a deep link. Observe this to navigate.
    @Published var activeDestination: Destination?

    // TODO: Set your custom URL scheme (must match Info.plist URL Types)
    private let customScheme = "__APP_SCHEME__"

    // TODO: Set your Universal Link domain
    private let universalLinkHost = "__YOUR_DOMAIN__"

    private init() {}

    // MARK: - Destination Enum

    /// All navigable destinations in your app.
    /// Add cases here as you add deep-linkable screens.
    enum Destination: Equatable {
        // TODO: Replace these with your app's actual destinations
        case listing(id: String)
        case profile(username: String)
        case settings
        case search(query: String?)
        case unknown(url: URL)
    }

    // MARK: - URL Parsing

    /// Parse any incoming URL (Universal Link or custom scheme) into a Destination.
    func parse(_ url: URL) -> Destination {
        // Extract path components — works for both https:// and custom:// URLs
        let pathComponents = url.pathComponents.filter { $0 != "/" }

        // TODO: Add your URL patterns here
        // Pattern: /listing/:id
        if pathComponents.count >= 2, pathComponents[0] == "listing" {
            return .listing(id: pathComponents[1])
        }

        // Pattern: /profile/:username
        if pathComponents.count >= 2, pathComponents[0] == "profile" {
            return .profile(username: pathComponents[1])
        }

        // Pattern: /settings
        if pathComponents.count >= 1, pathComponents[0] == "settings" {
            return .settings
        }

        // Pattern: /search?q=...
        if pathComponents.count >= 1, pathComponents[0] == "search" {
            let query = URLComponents(url: url, resolvingAgainstBaseURL: false)?
                .queryItems?.first(where: { $0.name == "q" })?.value
            return .search(query: query)
        }

        return .unknown(url: url)
    }

    /// Handle an incoming URL. Call this from onOpenURL or the universal link handler.
    func handle(_ url: URL) {
        let destination = parse(url)
        print("[DeepLink] Handling URL: \(url) → \(destination)")
        activeDestination = destination
    }

    /// Clear the active destination after navigation is complete.
    func clearDestination() {
        activeDestination = nil
    }
}

// MARK: - QR Code Scanner View

/// A SwiftUI view that uses the camera to scan QR codes.
/// When a QR code containing a URL is detected, it routes through DeepLinkRouter.
struct QRScannerView: UIViewControllerRepresentable {
    /// Called when a URL is successfully extracted from a QR code.
    var onURLScanned: (URL) -> Void

    /// Called if the camera is unavailable or permission is denied.
    var onError: ((QRScannerError) -> Void)?

    enum QRScannerError: Error, LocalizedError {
        case cameraUnavailable
        case permissionDenied

        var errorDescription: String? {
            switch self {
            case .cameraUnavailable: return "Camera is not available on this device."
            case .permissionDenied: return "Camera permission was denied. Enable it in Settings."
            }
        }
    }

    func makeUIViewController(context: Context) -> QRScannerViewController {
        let controller = QRScannerViewController()
        controller.onURLScanned = onURLScanned
        controller.onError = onError
        return controller
    }

    func updateUIViewController(_ uiViewController: QRScannerViewController, context: Context) {}
}

/// The underlying UIKit controller that manages the AVCaptureSession for QR scanning.
class QRScannerViewController: UIViewController, AVCaptureMetadataOutputObjectsDelegate {
    var onURLScanned: ((URL) -> Void)?
    var onError: ((QRScannerView.QRScannerError) -> Void)?

    private var captureSession: AVCaptureSession?
    private var previewLayer: AVCaptureVideoPreviewLayer?
    private var hasScanned = false

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .black
        checkPermissionAndSetup()
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        previewLayer?.frame = view.layer.bounds
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        if let session = captureSession, !session.isRunning {
            DispatchQueue.global(qos: .userInitiated).async {
                session.startRunning()
            }
        }
    }

    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        if let session = captureSession, session.isRunning {
            DispatchQueue.global(qos: .userInitiated).async {
                session.stopRunning()
            }
        }
    }

    private func checkPermissionAndSetup() {
        switch AVCaptureDevice.authorizationStatus(for: .video) {
        case .authorized:
            setupCamera()
        case .notDetermined:
            AVCaptureDevice.requestAccess(for: .video) { [weak self] granted in
                DispatchQueue.main.async {
                    if granted {
                        self?.setupCamera()
                    } else {
                        self?.onError?(.permissionDenied)
                    }
                }
            }
        default:
            onError?(.permissionDenied)
        }
    }

    private func setupCamera() {
        let session = AVCaptureSession()

        guard let device = AVCaptureDevice.default(for: .video),
              let input = try? AVCaptureDeviceInput(device: device) else {
            onError?(.cameraUnavailable)
            return
        }

        if session.canAddInput(input) {
            session.addInput(input)
        }

        let output = AVCaptureMetadataOutput()
        if session.canAddOutput(output) {
            session.addOutput(output)
            output.setMetadataObjectsDelegate(self, queue: .main)
            output.metadataObjectTypes = [.qr]
        }

        let preview = AVCaptureVideoPreviewLayer(session: session)
        preview.frame = view.layer.bounds
        preview.videoGravity = .resizeAspectFill
        view.layer.addSublayer(preview)

        captureSession = session
        previewLayer = preview

        DispatchQueue.global(qos: .userInitiated).async {
            session.startRunning()
        }
    }

    // MARK: - AVCaptureMetadataOutputObjectsDelegate

    func metadataOutput(
        _ output: AVCaptureMetadataOutput,
        didOutput metadataObjects: [AVMetadataObject],
        from connection: AVCaptureConnection
    ) {
        // Only process the first valid QR code
        guard !hasScanned,
              let metadata = metadataObjects.first as? AVMetadataMachineReadableCodeObject,
              metadata.type == .qr,
              let string = metadata.stringValue,
              let url = URL(string: string) else {
            return
        }

        hasScanned = true

        // Haptic feedback on successful scan
        let generator = UIImpactFeedbackGenerator(style: .medium)
        generator.impactOccurred()

        // Stop the session and deliver the result
        captureSession?.stopRunning()
        onURLScanned?(url)
    }

    /// Call this to allow scanning another QR code after the first.
    func resetScanner() {
        hasScanned = false
        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            self?.captureSession?.startRunning()
        }
    }
}

// MARK: - SwiftUI QR Scanner Wrapper

/// A ready-to-use SwiftUI view that scans QR codes and routes them through DeepLinkRouter.
/// Shows the camera feed with an overlay and handles the result automatically.
struct QRScannerSheet: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var router = DeepLinkRouter.shared
    @State private var errorMessage: String?

    var body: some View {
        ZStack {
            QRScannerView(
                onURLScanned: { url in
                    DeepLinkRouter.shared.handle(url)
                    dismiss()
                },
                onError: { error in
                    errorMessage = error.localizedDescription
                }
            )
            .ignoresSafeArea()

            // Scanning overlay
            VStack {
                Spacer()

                if let error = errorMessage {
                    Text(error)
                        .foregroundStyle(.white)
                        .padding()
                        .background(.red.opacity(0.8), in: RoundedRectangle(cornerRadius: 8))
                        .padding()
                } else {
                    Text("Point camera at a QR code")
                        .foregroundStyle(.white)
                        .padding()
                        .background(.black.opacity(0.6), in: RoundedRectangle(cornerRadius: 8))
                        .padding(.bottom, 40)
                }
            }
        }
    }
}

// MARK: - App Integration
//
// Wire up deep linking in your App struct:
//
// ```swift
// @main
// struct MyApp: App {
//     @StateObject private var router = DeepLinkRouter.shared
//
//     var body: some Scene {
//         WindowGroup {
//             ContentView()
//                 // Handle custom URL schemes (yourapp://...)
//                 .onOpenURL { url in
//                     DeepLinkRouter.shared.handle(url)
//                 }
//                 // React to destination changes
//                 .onChange(of: router.activeDestination) { _, destination in
//                     guard let destination else { return }
//                     // Navigate to the destination
//                     // e.g., selectedTab = .listing; selectedListingId = id
//                     router.clearDestination()
//                 }
//         }
//     }
// }
// ```
//
// For Universal Links, also add to your AppDelegate or use the
// `onContinueUserActivity` modifier:
//
// ```swift
// .onContinueUserActivity(NSUserActivityTypeBrowsingWeb) { activity in
//     guard let url = activity.webpageURL else { return }
//     DeepLinkRouter.shared.handle(url)
// }
// ```
//
// To present the QR scanner:
//
// ```swift
// @State private var showScanner = false
//
// Button("Scan QR Code") { showScanner = true }
//     .sheet(isPresented: $showScanner) {
//         QRScannerSheet()
//     }
// ```

// MARK: - Universal Link Setup (apple-app-site-association)
//
// Host this JSON file at: https://yourdomain.com/.well-known/apple-app-site-association
// The file must be served over HTTPS with Content-Type: application/json (no redirects).
//
// ```json
// {
//   "applinks": {
//     "apps": [],
//     "details": [
//       {
//         "appID": "TEAM_ID.com.yourapp.bundleid",
//         "paths": [
//           "/listing/*",
//           "/profile/*",
//           "/settings",
//           "/search"
//         ]
//       }
//     ]
//   }
// }
// ```
//
// Replace TEAM_ID with your Apple Developer Team ID (found in Xcode → Signing).
// Replace com.yourapp.bundleid with your app's bundle identifier.
// The "paths" array controls which URLs open your app — update to match your routes.
//
// IMPORTANT: After deploying the AASA file, Apple's CDN caches it. Changes can take
// up to 24 hours to propagate. Test with: https://app-site-association.cdn-apple.com/a/v1/yourdomain.com

// MARK: - Custom URL Scheme Setup (Info.plist)
//
// To register a custom URL scheme, add this to your Info.plist:
//
// ```xml
// <key>CFBundleURLTypes</key>
// <array>
//   <dict>
//     <key>CFBundleURLSchemes</key>
//     <array>
//       <string>yourapp</string>
//     </array>
//     <key>CFBundleURLName</key>
//     <string>com.yourapp.bundleid</string>
//   </dict>
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
//         CFBundleURLTypes:
//           - CFBundleURLSchemes: [yourapp]
//             CFBundleURLName: com.yourapp.bundleid
// ```
//
// For the camera (QR scanner), also add NSCameraUsageDescription to Info.plist:
//
// ```xml
// <key>NSCameraUsageDescription</key>
// <string>We need camera access to scan QR codes.</string>
// ```
