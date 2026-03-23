import Foundation
import WatchConnectivity

/// Manages bidirectional communication between iPhone and Apple Watch.
/// Copy into your Shared/ directory so both targets can use it.
///
/// Usage:
/// 1. Call `activate()` in your App init on both iPhone and Watch
/// 2. iPhone side: use `transferFile(_:metadata:)` to send files to Watch
/// 3. Watch side: implement `didReceiveFile(_:)` in your subclass or use the delegate
///
/// The base implementation handles session lifecycle. Override or extend for your app's needs.
final class WatchConnectivityManager: NSObject, ObservableObject {
    static let shared = WatchConnectivityManager()

    /// Override this in your app to handle received files
    var onFileReceived: ((_ fileURL: URL, _ metadata: [String: Any]) -> Void)?

    private override init() {
        super.init()
    }

    func activate() {
        guard WCSession.isSupported() else { return }
        WCSession.default.delegate = self
        WCSession.default.activate()
    }

    // MARK: - Send data (iPhone → Watch or Watch → iPhone)

    /// Send a small dictionary of data. Both apps must be active.
    func sendMessage(_ message: [String: Any]) {
        guard WCSession.default.isReachable else { return }
        WCSession.default.sendMessage(message, replyHandler: nil)
    }

    /// Send non-urgent state that syncs in background.
    func updateContext(_ context: [String: Any]) {
        try? WCSession.default.updateApplicationContext(context)
    }

    #if os(iOS)
    /// Transfer a file to the Watch (queued, happens in background).
    /// IMPORTANT: Only works on physical devices, not simulator.
    func transferFileToWatch(_ url: URL, metadata: [String: Any]? = nil) {
        guard WCSession.default.isWatchAppInstalled else { return }
        WCSession.default.transferFile(url, metadata: metadata)
    }
    #endif

    // TODO: Add your app-specific send/receive methods below
}

// MARK: - WCSessionDelegate

extension WatchConnectivityManager: WCSessionDelegate {
    func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
        if let error {
            print("[WatchConnectivity] Activation failed: \(error)")
        }
    }

    #if os(iOS)
    func sessionDidBecomeInactive(_ session: WCSession) {}
    func sessionDidDeactivate(_ session: WCSession) {
        // Re-activate for multi-watch support
        WCSession.default.activate()
    }
    #endif

    /// Called when a file transfer completes.
    /// CRITICAL: You must move the file during this callback — the system deletes it after return.
    func session(_ session: WCSession, didReceive file: WCSessionFile) {
        onFileReceived?(file.fileURL, file.metadata ?? [:])
    }
}
