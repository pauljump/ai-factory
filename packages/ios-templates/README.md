# iOS & watchOS Templates

Copyable starter files for new iOS and watchOS apps. Not an SPM package — just copy what you need.

## iOS Files

| File | What it does | What to change |
|------|-------------|----------------|
| `APIClient.swift` | Generic GET/POST HTTP client | Set `baseURL` to your Cloud Run URL |
| `Theme.swift` | Design tokens (colors, spacing, formatters) | Set brand colors |
| `StoreManager.swift` | StoreKit 2 single non-consumable IAP | Set `productId` |
| `LiveActivityManager.swift` | Lock Screen + Dynamic Island Live Activities | Replace `__PROJECT__Attributes`, define your ContentState fields |
| `FoundationModelManager.swift` | On-device LLM via Apple Foundation Models (iOS 26+) | Set instructions, define `@Generable` structs for structured output |
| `PushNotificationManager.swift` | APNs registration, token handling, foreground/background notifications | Set `apiEndpoint`, add auth header, handle notification tap navigation |
| `AppIntentsManager.swift` | Siri, Spotlight, and Shortcuts integration (App Intents) | Replace `__PROJECT__` / `__ITEM__`, implement search + entity queries |
| `DocumentScannerView.swift` | VisionKit document scanner (perspective-corrected page images) | Use as-is; send scanned images to server for OCR via `@pauljump/document-kit` |
| `DeepLinkRouter.swift` | Universal Links, custom URL schemes, QR code scanner | Add routes to `Destination` enum, set domain + scheme, host AASA file |
| `BackgroundTaskManager.swift` | BGAppRefreshTask, BGProcessingTask, silent push handling | Set task identifiers, implement sync/processing logic, update Info.plist |

## watchOS Files

| File | What it does | What to change |
|------|-------------|----------------|
| `WatchConnectivityManager.swift` | iPhone ↔ Watch communication (files, messages, context) | Add app-specific send/receive methods |
| `WatchVideoPlayer.swift` | Full-screen AVPlayer for watchOS | Use as-is or customize onFinished behavior |

## Usage

```bash
# iOS app (core)
cp packages/ios-templates/{APIClient,Theme,StoreManager}.swift <project>/ios/<AppName>/

# Live Activities (requires Widget Extension target)
cp packages/ios-templates/LiveActivityManager.swift <project>/ios/<AppName>/

# On-device AI (iOS 26+, Apple Intelligence devices only)
cp packages/ios-templates/FoundationModelManager.swift <project>/ios/<AppName>/

# Push notifications (requires Push Notifications capability)
cp packages/ios-templates/PushNotificationManager.swift <project>/ios/<AppName>/

# Siri / Spotlight / Shortcuts (no capability needed, iOS 16+)
cp packages/ios-templates/AppIntentsManager.swift <project>/ios/<AppName>/

# Document scanning (VisionKit — returns scanned page images)
cp packages/ios-templates/DocumentScannerView.swift <project>/ios/<AppName>/

# Deep linking + QR scanning (requires Associated Domains capability)
cp packages/ios-templates/DeepLinkRouter.swift <project>/ios/<AppName>/

# Background processing (requires Background Modes capability)
cp packages/ios-templates/BackgroundTaskManager.swift <project>/ios/<AppName>/

# watchOS app (copy connectivity to Shared/, player to Watch target)
cp packages/ios-templates/WatchConnectivityManager.swift <project>/ios/Shared/
cp packages/ios-templates/WatchVideoPlayer.swift <project>/ios/<WatchApp>/Sources/Views/
```

Then find the `TODO` comments and fill in your app-specific values.

## watchOS Notes

- watchOS apps use the same Swift/SwiftUI as iOS — Theme.swift and APIClient.swift work on both
- WatchConnectivityManager goes in `Shared/` so both iPhone and Watch targets compile it
- `transferFile()` only works on physical devices — simulator doesn't support it
- Video files must be local on the Watch (no streaming). Transfer from iPhone via Watch Connectivity.
- watchOS app bundle limit is 75MB — don't bake large videos into the app bundle
- See `.claude/playbooks/watchos-app-setup.md` for the full setup guide
