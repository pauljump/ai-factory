import Foundation

// MARK: - Sync Error

enum SyncError: Error {
    case noiCloud
}

// MARK: - Sync Status

enum SyncStatus: Equatable {
    case idle
    case syncing
    case synced
    case error(String)
}

// MARK: - CareVaultSync

@MainActor
final class CareVaultSync: ObservableObject {

    @Published var syncStatus: SyncStatus = .idle

    // MARK: - Backup to iCloud

    func backupToiCloud(localPath: String, filename: String) async throws {
        syncStatus = .syncing

        guard let containerURL = FileManager.default.url(
            forUbiquityContainerIdentifier: "iCloud.com.kit.home"
        ) else {
            syncStatus = .error("iCloud not available")
            throw SyncError.noiCloud
        }

        let documentsURL = containerURL
            .appendingPathComponent("Documents", isDirectory: true)
            .appendingPathComponent("CareVault", isDirectory: true)

        // Create Documents/CareVault/ if it doesn't exist
        try FileManager.default.createDirectory(
            at: documentsURL,
            withIntermediateDirectories: true,
            attributes: nil
        )

        let destinationURL = documentsURL.appendingPathComponent(filename)
        let sourceURL = URL(fileURLWithPath: localPath)

        // Remove existing file at destination before copying
        if FileManager.default.fileExists(atPath: destinationURL.path) {
            try FileManager.default.removeItem(at: destinationURL)
        }

        try FileManager.default.copyItem(at: sourceURL, to: destinationURL)

        syncStatus = .synced
    }
}
