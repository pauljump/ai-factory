# Playbook: Dead Code Detection (iOS — Periphery)

Learned from: GitHub tools scouting session (2026-03-16)

## What

[Periphery](https://github.com/peripheryapp/periphery) scans Swift projects and identifies unused code — classes, structs, protocols, functions, properties, parameters, enum cases, imports. MIT licensed.

## When to Use

- After a major refactor or feature split
- Before a TestFlight build to slim the binary
- When entering a project cold and wanting to understand what's actually live
- As periodic hygiene across all iOS projects

## Install

```bash
brew install peripheryapp/periphery/periphery
```

## Usage

Periphery needs a build index. Two-step process:

### Step 1: Build the project

```bash
cd <project>/ios
xcodebuild build \
  -project <Name>.xcodeproj \
  -scheme <Scheme> \
  -destination 'generic/platform=iOS Simulator' \
  -derivedDataPath /tmp/periphery-<project>
```

### Step 2: Scan

```bash
periphery scan \
  --project <Name>.xcodeproj \
  --schemes <Scheme> \
  --targets <Target> \
  --retain-codable-properties \
  --skip-build \
  --index-store-path /tmp/periphery-<project>/Index.noindex/DataStore
```

**Important flags:**
- `--retain-codable-properties` — prevents false positives on Codable structs (we use these everywhere)
- `--skip-build` — uses the index from step 1 instead of rebuilding
- `--targets` — specify each target separately (use multiple `--targets` flags, not comma-separated)

### Multiple targets

```bash
periphery scan \
  --project MyApp.xcodeproj \
  --schemes MyApp \
  --targets MyApp --targets MyAppMessages \
  --retain-codable-properties \
  --skip-build \
  --index-store-path /tmp/periphery-myapp/Index.noindex/DataStore
```

## Finding Targets and Schemes

```bash
xcodebuild -project <Name>.xcodeproj -list
```

## What It Catches

| Type | Example |
|------|---------|
| Unused structs/classes | `Struct 'CommunityProfile' is unused` |
| Unused functions | `Function 'delete(_:)' is unused` |
| Unused properties | `Property 'titleFont' is unused` |
| Assign-only properties | `Property 'env' is assigned, but never used` |
| Unused parameters | `Parameter 'isFirst' is unused` |
| Unused protocols/enums | `Enum 'CommunitySortOrder' is unused` |
| Unused imports | Only for scanned targets |

## Gotchas

1. **Close Xcode first** — false positives if Xcode writes to the index during scan
2. **Codable properties** — always use `--retain-codable-properties` or you'll get false hits on JSON decode fields
3. **Obj-C interop** — if a project bridges to Obj-C, use `--retain-objc-accessible`
4. **Widget/extension targets** — scan all targets together or you'll miss cross-target references
5. **Build errors block scanning** — the project must compile cleanly first
6. **False positives on types used via navigation chains** — Periphery may flag structs/enums as "unused" when they're actually referenced by views that are only reachable through NavigationStack/sheet/fullScreenCover chains. Always `xcodebuild build` after cleanup to catch these.

## Persisting Config

Create `.periphery.yml` in the project's `ios/` directory:

```yaml
project: MyApp.xcodeproj
schemes:
  - MyApp
targets:
  - MyApp
  - WidgetExtension
retain_codable_properties: true
```

Then just run `periphery scan` with no flags.

## Monorepo Quick Scan

To scan all iOS projects that build cleanly:

```bash
for proj in app1 app2 app3; do
  echo "=== $proj ==="
  cd /path/to/monorepo/$proj/ios
  xcodebuild build -project *.xcodeproj -scheme $(xcodebuild -project *.xcodeproj -list 2>/dev/null | grep -A1 'Schemes:' | tail -1 | xargs) -destination 'generic/platform=iOS Simulator' -derivedDataPath /tmp/periphery-$proj 2>&1 | tail -1
  periphery scan --project *.xcodeproj --schemes $(xcodebuild -project *.xcodeproj -list 2>/dev/null | grep -A1 'Schemes:' | tail -1 | xargs) --retain-codable-properties --skip-build --index-store-path /tmp/periphery-$proj/Index.noindex/DataStore 2>&1 | grep "warning:" | wc -l
  echo ""
done
```

## First Scan Results

| Project | Warnings | Main Issue |
|---------|----------|------------|
| App A | 72 | Old code from pre-split |
| App B | 61 | Inherited full APIClient + models, uses fraction |
| App C | 19 | Unused API endpoints, dead theme tokens |
| App D | Blocked | Build errors from deleted files |
