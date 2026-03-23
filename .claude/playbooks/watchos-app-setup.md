# Playbook: watchOS App Setup

Learned from: BooWho (2026-03-14)

## Prerequisites

- Xcode with watchOS SDK installed (`xcodebuild -downloadPlatform watchOS`)
- XcodeGen installed (`brew install xcodegen`)
- Apple Developer account with team ID
- Physical Apple Watch + paired iPhone for full testing (simulator is limited)

## When to Use

Building an Apple Watch app. watchOS apps are Swift/SwiftUI — same language as iOS. The main differences are: smaller screen, Watch Connectivity for iPhone ↔ Watch communication, and watchOS-specific APIs (haptics, Digital Crown, complications).

## Project Structure

```
<project>/ios/
  project.yml              # XcodeGen — iPhone + Watch targets
  <AppName>App/Sources/    # iPhone companion app
    App/
    Views/
  <AppName>Watch/Sources/  # Watch app
    App/
    Views/
  Shared/                  # Code compiled by both targets
```

Put models and the WatchConnectivityManager in `Shared/` so both targets can use them.

## XcodeGen Configuration

```yaml
name: MyApp
options:
  bundleIdPrefix: com.myapp
  deploymentTarget:
    iOS: "17.0"
    watchOS: "10.0"
  xcodeVersion: "16.0"
  createIntermediateGroups: true

settings:
  base:
    SWIFT_VERSION: "5.9"
    DEVELOPMENT_TEAM: 99US464DK4

targets:
  MyApp:
    type: application
    platform: iOS
    sources:
      - path: MyAppApp/Sources
      - path: Shared
    settings:
      base:
        PRODUCT_BUNDLE_IDENTIFIER: com.myapp.app
        TARGETED_DEVICE_FAMILY: "1"
        MARKETING_VERSION: "1.0"
        CURRENT_PROJECT_VERSION: "1"
        CODE_SIGN_STYLE: Automatic
        GENERATE_INFOPLIST_FILE: YES
    info:
      path: MyAppApp/Info.plist
      properties:
        CFBundleShortVersionString: "$(MARKETING_VERSION)"
        CFBundleVersion: "$(CURRENT_PROJECT_VERSION)"
        UILaunchScreen: {}
        ITSAppUsesNonExemptEncryption: false
    dependencies:
      - target: MyAppWatch
        embed: true

  MyAppWatch:
    type: application
    platform: watchOS
    sources:
      - path: MyAppWatch/Sources
      - path: Shared
    settings:
      base:
        PRODUCT_BUNDLE_IDENTIFIER: com.myapp.app.watch
        MARKETING_VERSION: "1.0"
        CURRENT_PROJECT_VERSION: "1"
        CODE_SIGN_STYLE: Automatic
        GENERATE_INFOPLIST_FILE: YES
        INFOPLIST_KEY_WKCompanionAppBundleIdentifier: com.myapp.app
    info:
      path: MyAppWatch/Info.plist
      properties:
        CFBundleShortVersionString: "$(MARKETING_VERSION)"
        CFBundleVersion: "$(CURRENT_PROJECT_VERSION)"
        WKCompanionAppBundleIdentifier: com.myapp.app

schemes:
  MyApp:
    build:
      targets:
        MyApp: all
        MyAppWatch: all
    run:
      config: Debug

  MyAppWatch:
    build:
      targets:
        MyAppWatch: all
    run:
      config: Debug
```

**Key points:**
- Watch app bundle ID must be `<iphone-bundle-id>.watch`
- Watch target needs `WKCompanionAppBundleIdentifier` pointing to the iPhone app
- iPhone target embeds the Watch target as a dependency
- Both targets include `Shared/` sources
- Modern watchOS (10+) uses a single app target — no separate WatchKit extension needed

## Steps

```bash
# 1. Create directory structure
mkdir -p <project>/ios/{<App>App/Sources/{App,Views},<App>Watch/Sources/{App,Views},Shared}

# 2. Copy templates
cp packages/ios-templates/WatchConnectivityManager.swift <project>/ios/Shared/
cp packages/ios-templates/WatchVideoPlayer.swift <project>/ios/<App>Watch/Sources/Views/  # if playing video
cp packages/ios-templates/Theme.swift <project>/ios/Shared/        # works on both platforms
cp packages/ios-templates/APIClient.swift <project>/ios/Shared/    # if both targets need API access

# 3. Create project.yml (use template above, replace MyApp with your app name)

# 4. Create @main entry points for both targets:
#    - <App>App/Sources/App/<App>App.swift (iPhone, with WatchConnectivityManager.shared.activate())
#    - <App>Watch/Sources/App/<App>WatchApp.swift (Watch, same activation)

# 5. Generate Xcode project
cd <project>/ios
xcodegen generate

# 6. Build both targets
xcodebuild build -project <App>.xcodeproj -target <App> -quiet

# 7. To build Watch target separately (requires watchOS SDK):
xcodebuild build -project <App>.xcodeproj -scheme <App>Watch \
  -destination 'platform=watchOS Simulator,name=Apple Watch Series 11 (46mm)' -quiet
```

## Watch Connectivity Patterns

### Sending files from iPhone to Watch
```swift
// iPhone side
let metadata = ["id": video.id, "title": video.title]
WatchConnectivityManager.shared.transferFileToWatch(localFileURL, metadata: metadata)
```

### Receiving files on Watch
```swift
// In your Watch app init or a manager
WatchConnectivityManager.shared.onFileReceived = { fileURL, metadata in
    let docs = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first!
    let dest = docs.appendingPathComponent(metadata["fileName"] as? String ?? fileURL.lastPathComponent)
    try? FileManager.default.moveItem(at: fileURL, to: dest)
    // Update your local state
}
```

### Sending small data
```swift
// Either direction — both apps must be active
WatchConnectivityManager.shared.sendMessage(["action": "refresh"])

// Background-safe state sync
WatchConnectivityManager.shared.updateContext(["lastSync": Date().timeIntervalSince1970])
```

## Video Playback on watchOS

- Use `WatchVideoPlayer` template for full-screen AVPlayer
- Videos must be **local files** on the Watch (no streaming)
- Encode as H.264, ~320x260 resolution, ~160kbps bitrate
- Transfer from iPhone via `transferFile()` — don't bake into app bundle (75MB limit)
- Import both `AVKit` and `AVFoundation` on watchOS

## TestFlight

Follow the standard iOS TestFlight playbook (`.claude/playbooks/ios-testflight.md`). The Watch app is embedded in the iPhone app — archiving and uploading the iPhone scheme includes the Watch app automatically.

**Important:** Bump `CURRENT_PROJECT_VERSION` in **both** targets (iPhone and Watch) before archiving.

## Gotchas

- **watchOS SDK must be installed** — `xcodebuild -downloadPlatform watchOS` (3-5GB download)
- **Building the iPhone scheme requires watchOS SDK** — even if you only want to test the iPhone app, because it embeds the Watch target
- **`transferFile()` doesn't work in simulator** — must test on physical paired iPhone + Apple Watch
- **Received files are auto-deleted** — you must move them during the `didReceive` callback or they're gone
- **Watch simulator must be paired** — if not paired with an iPhone simulator, the Watch app won't launch
- **75MB bundle limit** — watchOS apps can't be larger than 75MB. Keep media files on iPhone, transfer on demand.
- **On-device build cycles are slow** — deploying to a physical Watch takes minutes per iteration. Use simulator for UI, device for connectivity.
- **Haptics** — `WKInterfaceDevice.current().play(.click)` for haptic feedback. Only works on real hardware.
- **Complications** — watch face complications require `CLKComplicationDataSource`. Good for instant-launch. Add after core app works.
