import SwiftUI

/// Design tokens for your app.
/// Change the colors, spacing, and formatters to match your brand.
enum Theme {
    // MARK: - Brand Colors (TODO: set your brand colors)

    static let accent = Color(hex: 0x007AFF)   // primary action color
    static let success = Color(hex: 0x34C759)   // positive / success
    static let danger = Color(hex: 0xFF3B30)    // negative / error

    // MARK: - Spacing

    static let spacingXS: CGFloat = 4
    static let spacingSM: CGFloat = 8
    static let spacingMD: CGFloat = 12
    static let spacingLG: CGFloat = 16
    static let spacingXL: CGFloat = 24

    // MARK: - Corner Radius

    static let radiusSmall: CGFloat = 6
    static let radiusMedium: CGFloat = 12
    static let radiusLarge: CGFloat = 16

    // MARK: - Formatting

    private static let currencyFormatter: NumberFormatter = {
        let f = NumberFormatter()
        f.numberStyle = .currency
        f.maximumFractionDigits = 2
        return f
    }()

    static func currency(_ amount: Double) -> String {
        currencyFormatter.string(from: NSNumber(value: amount)) ?? String(format: "$%.2f", amount)
    }
}

// MARK: - Color from hex

extension Color {
    init(hex: UInt, opacity: Double = 1.0) {
        self.init(
            .sRGB,
            red: Double((hex >> 16) & 0xFF) / 255,
            green: Double((hex >> 8) & 0xFF) / 255,
            blue: Double(hex & 0xFF) / 255,
            opacity: opacity
        )
    }
}
