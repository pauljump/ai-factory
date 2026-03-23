# Playbook: iOS TestFlight Push

Learned from: PaperClaw (2026-03-09)

## Prerequisites

- Apple Developer account ($99/yr)
- ExportOptions.plist (see below)
- XcodeGen installed (`brew install xcodegen`)

## Steps

```bash
cd ios  # or wherever the Xcode project lives

# 1. Bump build number in project.yml
#    Find CURRENT_PROJECT_VERSION and increment it (BOTH targets if multi-target)

# 2. Regenerate Xcode project
xcodegen generate

# 3. Fix message extension product type (if project has iMessage extension)
#    XcodeGen doesn't support messages-extension natively
sed -i '' 's/productType = "com.apple.product-type.app-extension";/productType = "com.apple.product-type.app-extension.messages";/' *.xcodeproj/project.pbxproj

# 4. Archive
xcodebuild -project *.xcodeproj -scheme <SchemeName> \
  -destination 'generic/platform=iOS' \
  -archivePath /tmp/<AppName>.xcarchive \
  archive -allowProvisioningUpdates

# 5. Export + upload (auto-submits to App Store Connect → TestFlight)
xcodebuild -exportArchive \
  -archivePath /tmp/<AppName>.xcarchive \
  -exportOptionsPlist /tmp/ExportOptions.plist \
  -exportPath /tmp/<AppName>Export \
  -allowProvisioningUpdates
```

## ExportOptions.plist

Create at `/tmp/ExportOptions.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>method</key><string>app-store-connect</string>
    <key>teamID</key><string>99US464DK4</string>
    <key>destination</key><string>upload</string>
    <key>signingStyle</key><string>automatic</string>
</dict>
</plist>
```

## Gotchas

- **xcodegen overwrites Info.plist** — any manual edits (CFBundleDisplayName, NSAllowsArbitraryLoads) must be in project.yml
- **Build number must increment** — App Store Connect rejects duplicate build numbers for the same marketing version
- **Bump BOTH targets** — if you only bump the parent app, the extension keeps the old number and the upload may fail
- **Archive destination is `generic/platform=iOS`** — not a specific device ID
- **Processing takes 5-15 min** after upload before the build appears in TestFlight
- **"Missing Compliance" prompt** — add `ITSAppUsesNonExemptEncryption = false` to Info.plist to skip this automatically (unless your app uses custom encryption beyond standard HTTPS)
- **iMessage sticker icon set** — requires specific idiom format in stickersiconset Contents.json. See PaperClaw's implementation for the working format.

## App Registry

Apps registered in App Store Connect. **You must create the app in App Store Connect before the first upload** — the export step downloads app info and will fail with "Error Downloading App Information" if the app doesn't exist.

To create: App Store Connect → Apps → "+" → New App → iOS → set Name, Bundle ID, SKU.

| App | Bundle ID | SKU | Apple ID | Team |
|-----|-----------|-----|----------|------|
| PaperClaw | com.paperclaw.app | paperclaw | — | 99US464DK4 |
| Kit Home | com.kit.home | kithome | — | 99US464DK4 |
| Orchard | com.astral.app | orchard | — | 99US464DK4 |
| Kit Lab | com.kit.lab | kitlab | — | 99US464DK4 |
| StuyWatch | com.stuywatch.app | stuywatch | — | 99US464DK4 |
| YardShare | com.yardshare.app | yardshare | — | 99US464DK4 |
| BARkey | com.barkey.app | barkey | — | 99US464DK4 |
| BooWho | com.boowho.app | boowho | — | 99US464DK4 |
| Kit Tools | com.kit.tools | kittools | — | 99US464DK4 |

## Verification

After "EXPORT SUCCEEDED" / "Upload succeeded", check:
- App Store Connect → TestFlight → iOS Builds → new build should appear within 15 min
- If it says "Missing Compliance", go to the build and confirm "No" for encryption (unless you use custom encryption)
