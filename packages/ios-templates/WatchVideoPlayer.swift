import SwiftUI
import AVKit
import AVFoundation

/// Full-screen video player for watchOS.
/// Copy into your Watch app's Views/ directory.
///
/// Usage:
///   WatchVideoPlayer(url: someLocalFileURL, title: "My Video") {
///       // called when video finishes playing
///   }
///
/// Constraints:
/// - Videos must be local files (no streaming on watchOS)
/// - Encode as H.264, ~320x260, ~160kbps for small file sizes
/// - watchOS app bundle limit is 75MB — transfer videos from iPhone instead
struct WatchVideoPlayer: View {
    let url: URL
    let title: String
    var onFinished: (() -> Void)?

    @State private var player: AVPlayer?
    @Environment(\.dismiss) private var dismiss

    init(url: URL, title: String = "", onFinished: (() -> Void)? = nil) {
        self.url = url
        self.title = title
        self.onFinished = onFinished
    }

    var body: some View {
        Group {
            if let player {
                VideoPlayer(player: player)
                    .ignoresSafeArea()
            } else {
                VStack(spacing: 8) {
                    Image(systemName: "exclamationmark.triangle")
                        .font(.title)
                    Text("Video not found")
                        .font(.caption)
                }
                .foregroundStyle(.secondary)
            }
        }
        .onAppear {
            guard FileManager.default.fileExists(atPath: url.path) else { return }
            let avPlayer = AVPlayer(url: url)
            self.player = avPlayer
            avPlayer.play()

            NotificationCenter.default.addObserver(
                forName: .AVPlayerItemDidPlayToEndTime,
                object: avPlayer.currentItem,
                queue: .main
            ) { _ in
                onFinished?()
                dismiss()
            }
        }
        .onDisappear {
            player?.pause()
            player = nil
        }
        .navigationBarHidden(true)
    }
}
