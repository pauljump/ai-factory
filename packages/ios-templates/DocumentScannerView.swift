import SwiftUI
import VisionKit

/// A SwiftUI wrapper around VNDocumentCameraViewController for scanning documents.
///
/// Usage:
/// ```swift
/// @State private var showScanner = false
/// @State private var scannedImages: [UIImage] = []
///
/// Button("Scan Document") { showScanner = true }
///     .sheet(isPresented: $showScanner) {
///         DocumentScannerView { images in
///             scannedImages = images
///         }
///     }
/// ```
///
/// The scanned images are perspective-corrected and cropped by VisionKit.
/// Send them to your API for OCR/extraction via @pauljump/document-kit on the server side.
struct DocumentScannerView: UIViewControllerRepresentable {
    /// Called when the user finishes scanning. Receives an array of scanned page images.
    var onScan: ([UIImage]) -> Void
    /// Called if the user cancels or an error occurs. Optional.
    var onCancel: (() -> Void)?

    func makeUIViewController(context: Context) -> VNDocumentCameraViewController {
        let scanner = VNDocumentCameraViewController()
        scanner.delegate = context.coordinator
        return scanner
    }

    func updateUIViewController(_ uiViewController: VNDocumentCameraViewController, context: Context) {}

    func makeCoordinator() -> Coordinator {
        Coordinator(onScan: onScan, onCancel: onCancel)
    }

    class Coordinator: NSObject, VNDocumentCameraViewControllerDelegate {
        let onScan: ([UIImage]) -> Void
        let onCancel: (() -> Void)?

        init(onScan: @escaping ([UIImage]) -> Void, onCancel: (() -> Void)?) {
            self.onScan = onScan
            self.onCancel = onCancel
        }

        func documentCameraViewController(
            _ controller: VNDocumentCameraViewController,
            didFinishWith scan: VNDocumentCameraScan
        ) {
            let images = (0..<scan.pageCount).map { scan.imageOfPage(at: $0) }
            controller.dismiss(animated: true) {
                self.onScan(images)
            }
        }

        func documentCameraViewControllerDidCancel(_ controller: VNDocumentCameraViewController) {
            controller.dismiss(animated: true) {
                self.onCancel?()
            }
        }

        func documentCameraViewController(
            _ controller: VNDocumentCameraViewController,
            didFailWithError error: Error
        ) {
            print("[DocumentScanner] Error: \(error.localizedDescription)")
            controller.dismiss(animated: true) {
                self.onCancel?()
            }
        }
    }
}
