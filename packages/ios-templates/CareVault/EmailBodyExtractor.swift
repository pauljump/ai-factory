import Foundation
import UIKit

// MARK: - EmailBodyExtractor

/// Static utility that extracts readable plain text from Gmail API message payloads.
/// Handles MIME tree traversal, base64url decoding, and HTML stripping.
enum EmailBodyExtractor {

    // MARK: - Public API

    /// Top-level entry point. Prefer text/plain; fall back to HTML-stripped text/html.
    /// Returns nil if the payload contains no readable body content.
    static func extractPlainText(from payload: GmailPayload) -> String? {
        // Prefer plain text
        if let plainData = findPart(in: payload, mimeType: "text/plain"),
           let decoded = decodeBase64URL(plainData),
           !decoded.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            return decoded
        }

        // Fall back to HTML → strip tags
        if let htmlData = findPart(in: payload, mimeType: "text/html"),
           let decoded = decodeBase64URL(htmlData),
           !decoded.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            return stripHTML(decoded)
        }

        return nil
    }

    /// Returns the base64url-encoded data string for the first MIME part matching `mimeType`.
    /// Searches recursively through the payload and any nested parts.
    static func findPart(in payload: GmailPayload, mimeType: String) -> String? {
        // Check the payload's own body first (single-part messages)
        if let mime = payload.mimeType,
           mime.lowercased() == mimeType.lowercased(),
           let data = payload.body?.data,
           !data.isEmpty {
            return data
        }

        // Walk top-level parts (GmailPart array)
        guard let parts = payload.parts else { return nil }
        return findInParts(parts, mimeType: mimeType)
    }

    // MARK: - Decoding

    /// Decodes a base64url-encoded string (RFC 4648 §5) to a UTF-8 string.
    /// Returns nil if the input cannot be decoded or isn't valid UTF-8.
    static func decodeBase64URL(_ input: String) -> String? {
        // RFC 4648 §5: replace URL-safe chars with standard base64 chars
        var base64 = input
            .replacingOccurrences(of: "-", with: "+")
            .replacingOccurrences(of: "_", with: "/")

        // Pad to a multiple of 4
        let remainder = base64.count % 4
        if remainder != 0 {
            base64 += String(repeating: "=", count: 4 - remainder)
        }

        guard let decoded = Data(base64Encoded: base64, options: .ignoreUnknownCharacters) else {
            return nil
        }
        return String(data: decoded, encoding: .utf8)
    }

    // MARK: - HTML Stripping

    /// Strips HTML tags from a string using NSAttributedString.
    /// NSAttributedString HTML parsing requires the main thread.
    static func stripHTML(_ html: String) -> String? {
        guard let data = html.data(using: .utf8) else { return nil }

        // NSAttributedString HTML parsing must run on the main thread
        if Thread.isMainThread {
            return attributedStringToPlain(data: data)
        } else {
            var result: String?
            DispatchQueue.main.sync {
                result = attributedStringToPlain(data: data)
            }
            return result
        }
    }

    // MARK: - Snippet

    /// Truncates text to `maxLength` characters, appending "..." if truncated.
    /// Returns nil if input is nil or empty after whitespace trimming.
    static func snippet(from text: String?, maxLength: Int = 500) -> String? {
        guard let text = text else { return nil }
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return nil }

        if trimmed.count <= maxLength { return trimmed }
        let index = trimmed.index(trimmed.startIndex, offsetBy: maxLength)
        return String(trimmed[..<index]) + "..."
    }

    // MARK: - Private Helpers

    /// Recursive search through an array of GmailPart, including nested parts.
    private static func findInParts(_ parts: [GmailPart], mimeType: String) -> String? {
        for part in parts {
            // Direct match on this part
            if let mime = part.mimeType,
               mime.lowercased() == mimeType.lowercased(),
               let data = part.body?.data,
               !data.isEmpty {
                return data
            }

            // Recurse into nested parts (multipart/alternative inside multipart/mixed, etc.)
            if let nested = part.parts,
               let found = findInParts(nested, mimeType: mimeType) {
                return found
            }
        }
        return nil
    }

    /// Converts HTML Data to plain text via NSAttributedString (main thread only).
    private static func attributedStringToPlain(data: Data) -> String? {
        guard let attributed = try? NSAttributedString(
            data: data,
            options: [
                .documentType: NSAttributedString.DocumentType.html,
                .characterEncoding: String.Encoding.utf8.rawValue
            ],
            documentAttributes: nil
        ) else { return nil }

        let plain = attributed.string.trimmingCharacters(in: .whitespacesAndNewlines)
        return plain.isEmpty ? nil : plain
    }
}
