/**
 * FoundationModelManager — Template for Apple's on-device LLM (Foundation Models framework).
 *
 * Zero API cost, works offline, runs entirely on device.
 * Available on iOS 26+, macOS 26+, iPadOS 26+.
 *
 * REQUIREMENTS:
 * - Xcode 26+
 * - Device with Apple Intelligence support (iPhone 15 Pro+, M-series Mac/iPad)
 * - `import FoundationModels` in your Swift file
 *
 * USAGE:
 *   let fm = FoundationModelManager()
 *
 *   // Simple text generation
 *   let response = try await fm.generate("Summarize this in one sentence: \(text)")
 *
 *   // Streaming (text appears word by word)
 *   for try await partial in fm.stream("Write a haiku about apartments") {
 *       print(partial)
 *   }
 *
 *   // Structured output (type-safe, no JSON parsing)
 *   let recommendation: PlaceRecommendation = try await fm.generateStructured(
 *       "Recommend a neighborhood for a family with kids"
 *   )
 *
 * CUSTOMIZE:
 * - Define your own @Generable structs for structured output
 * - Adjust instructions in the session for your domain
 * - Add tools for the model to call (see Apple docs)
 */

import Foundation
import FoundationModels

// MARK: - Manager

@MainActor
final class FoundationModelManager: ObservableObject {
    @Published var isGenerating = false

    private var session: LanguageModelSession

    init(instructions: String = "") {
        if instructions.isEmpty {
            self.session = LanguageModelSession()
        } else {
            self.session = LanguageModelSession(instructions: instructions)
        }
    }

    /// Reset the session (clears conversation history).
    func reset(instructions: String = "") {
        if instructions.isEmpty {
            session = LanguageModelSession()
        } else {
            session = LanguageModelSession(instructions: instructions)
        }
    }

    /// Generate a complete text response.
    func generate(_ prompt: String) async throws -> String {
        isGenerating = true
        defer { isGenerating = false }

        let response = try await session.respond(to: prompt)
        return response.content
    }

    /// Stream a text response (yields partial results as they generate).
    func stream(_ prompt: String) -> AsyncThrowingStream<String, Error> {
        AsyncThrowingStream { continuation in
            Task {
                isGenerating = true
                defer { isGenerating = false }

                do {
                    let stream = session.streamResponse(to: prompt)
                    for try await partial in stream {
                        continuation.yield(partial.content)
                    }
                    continuation.finish()
                } catch {
                    continuation.finish(throwing: error)
                }
            }
        }
    }

    /// Generate a structured, type-safe response.
    /// Define your output type with the @Generable macro.
    func generateStructured<T: Generable>(_ prompt: String, type: T.Type = T.self) async throws -> T {
        isGenerating = true
        defer { isGenerating = false }

        let response = try await session.respond(to: prompt, generating: type)
        return response.content
    }

    /// Check if on-device Foundation Models are available on this device.
    static var isAvailable: Bool {
        // Foundation Models requires Apple Intelligence hardware
        // (iPhone 15 Pro+, M-series Mac/iPad)
        if #available(iOS 26, macOS 26, *) {
            return true
        }
        return false
    }
}

// MARK: - Structured Output Examples
//
// Use @Generable to get type-safe responses from the on-device model.
// The model outputs your Swift struct directly — no JSON parsing needed.
//
// ```swift
// import FoundationModels
//
// @Generable
// struct Summary {
//     @Guide(description: "A one-sentence summary")
//     var text: String
//     @Guide(description: "Key points as bullet items")
//     var keyPoints: [String]
//     @Guide(.anyOf(["positive", "neutral", "negative"]))
//     var sentiment: String
// }
//
// // Usage:
// let fm = FoundationModelManager()
// let summary: Summary = try await fm.generateStructured(
//     "Summarize this article: \(articleText)"
// )
// print(summary.text)
// print(summary.keyPoints)
// print(summary.sentiment)
// ```
//
// More examples:
// - Categorize user input into predefined buckets
// - Extract entities (names, dates, prices) from text
// - Generate structured recommendations with scores
// - Classify sentiment, intent, or priority
