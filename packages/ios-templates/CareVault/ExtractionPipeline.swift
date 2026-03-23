import Foundation

/// Protocol for extraction pipelines that process CareVault documents.
/// Implementations handle different extraction strategies (API-based, on-device, etc.).
protocol ExtractionPipeline {
    /// Extract structured data from a document file.
    /// - Parameters:
    ///   - filePath: Local file path to the document
    ///   - documentType: Pre-classified document type
    /// - Returns: Structured extraction result with summary, facts, and deadlines
    func extract(filePath: String, documentType: DocumentType) async throws -> ExtractionResult

    /// Whether this pipeline is available on this device/configuration
    var isAvailable: Bool { get }

    /// Human-readable name of this pipeline (e.g., "Apple Intelligence", "OpenAI", "On-Device")
    var name: String { get }
}

/// Result of document extraction
struct ExtractionResult {
    /// Concise summary of the document's key content
    let summary: String

    /// Structured facts extracted from the document
    let facts: [ExtractedFactData]

    /// Important dates found in the document
    let deadlines: [DeadlineData]
}

/// A single extracted fact with confidence metadata
struct ExtractedFactData {
    /// Type of fact (e.g., "diagnosis", "provider_name", "dosage")
    let factType: String

    /// The extracted value
    let value: String

    /// Confidence score (0.0 - 1.0)
    let confidence: Double
}

/// An important deadline extracted from the document
struct DeadlineData {
    /// Human-readable deadline title (e.g., "IEP Annual Review")
    let title: String

    /// ISO 8601 date string or user-friendly format
    let date: String
}

/// Placeholder extraction pipeline for v1.
/// Returns a placeholder message indicating extraction will be available in a future update.
struct PlaceholderExtractor: ExtractionPipeline {
    var isAvailable: Bool { true }
    var name: String { "Placeholder" }

    func extract(filePath: String, documentType: DocumentType) async throws -> ExtractionResult {
        ExtractionResult(
            summary: "Document imported. AI extraction will be available in a future update.",
            facts: [],
            deadlines: []
        )
    }
}
