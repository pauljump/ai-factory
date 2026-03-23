# Playbook: iOS Testing & Debugging (CLI-only)

Learned from: production bug hunts

## What We Can Do (Without Xcode GUI)

| Capability | How | Effectiveness |
|------------|-----|--------------|
| **Build + catch errors/warnings** | `xcodebuild build` | High — catches type errors, missing imports, unused vars |
| **Static code review** | Read files + grep for patterns | High — catches state bugs, system colors, force unwraps |
| **Run unit tests** | `xcodebuild test` | High — if test targets exist |
| **Run UI tests** | `xcodebuild test` with UI test target | Medium — limited by simulator availability |
| **Read simulator logs** | `xcrun simctl` | Medium — useful for runtime crashes |
| **Detect common SwiftUI bugs** | Pattern matching on code | High — most bugs follow known patterns |

## What We Can't Do

- **Instruments profiling** (memory leaks, CPU, network)
- **Visual debugging** (view hierarchy inspector)
- **Breakpoints / step debugging**
- **Live preview** (SwiftUI Previews require Xcode canvas)
- **Test on physical device** (done via TestFlight)

## Build & Test Commands

```bash
# Build for simulator (catches compile errors)
cd <project>/ios
xcodegen generate
xcodebuild build -project *.xcodeproj -scheme <Scheme> \
  -destination 'platform=iOS Simulator,name=iPhone 17 Pro' -quiet

# Run unit tests
xcodebuild test -project *.xcodeproj -scheme <Scheme> \
  -destination 'platform=iOS Simulator,name=iPhone 17 Pro' \
  -only-testing:<TestTarget> -quiet

# Build with warnings visible (don't use -quiet)
xcodebuild build -project *.xcodeproj -scheme <Scheme> \
  -destination 'platform=iOS Simulator,name=iPhone 17 Pro' 2>&1 | grep -E "warning:|error:"
```

## Adding Test Targets (XcodeGen)

```yaml
# In project.yml — unit test target
targets:
  MyAppTests:
    type: bundle.unit-test
    platform: iOS
    sources:
      - path: Tests
    dependencies:
      - target: MyApp
    settings:
      base:
        PRODUCT_BUNDLE_IDENTIFIER: com.example.app.tests
        CODE_SIGN_STYLE: Automatic
        GENERATE_INFOPLIST_FILE: YES
        TEST_HOST: "$(BUILT_PRODUCTS_DIR)/MyApp.app/$(BUNDLE_EXECUTABLE_FOLDER_PATH)/MyApp"
        BUNDLE_LOADER: "$(TEST_HOST)"

  # UI test target (separate — launches full app)
  MyAppUITests:
    type: bundle.ui-testing
    platform: iOS
    sources:
      - path: UITests
    dependencies:
      - target: MyApp
    settings:
      base:
        TEST_TARGET_NAME: MyApp
        GENERATE_INFOPLIST_FILE: YES

# Scheme must include test targets
schemes:
  MyApp:
    build:
      targets:
        MyApp: all
    test:
      config: Debug
      targets:
        - name: MyAppTests
          parallelizable: true
        - name: MyAppUITests
      gatherCoverageData: true
```

### Testing Frameworks

- **Swift Testing** (Xcode 16+) — use for new unit tests. `@Test`, `@Suite`, `#expect()`. Cleaner syntax, parameterized tests.
- **XCTest** — use for UI tests (XCUITest has no Swift Testing equivalent). Both coexist in the same target.

### Targeting Specific Tests

```bash
# Run one test class
xcodebuild test -only-testing:MyAppTests/TimerEngineTests

# Run one test method
xcodebuild test -only-testing:MyAppTests/TimerEngineTests/testCountdownCompletes

# Skip slow UI tests
xcodebuild test -skip-testing:MyAppUITests

# Build tests without running (verify they compile)
xcodebuild build-for-testing -project *.xcodeproj -scheme MyApp \
  -destination 'platform=iOS Simulator,name=iPhone 17 Pro'
```

### Snapshot Testing (pointfreeco/swift-snapshot-testing)

Add as SPM dependency in project.yml, wrap SwiftUI views in `UIHostingController`, assert with `assertSnapshot(of: vc, as: .image)`. First run records reference image; subsequent runs compare pixel-by-pixel. Best for leaf components (cards, badges), not full screens with dynamic data. Must run on the same simulator model consistently.

## Static Bug Hunt Checklist

Run this before every TestFlight push. Grep for known problem patterns.

### 1. Crash Risks

```bash
# Force unwraps on URL construction
grep -rn 'URL(string:.*!)' Sources/

# Force unwraps on dictionary/array access
grep -rn '\[.*\]!' Sources/

# Force try
grep -rn 'try!' Sources/
```

### 2. State Management Bugs

```bash
# @ObservedObject should usually be @StateObject for owned objects
# (false positives exist — review manually)
grep -rn '@ObservedObject.*=' Sources/

# State mutations from background thread (missing @MainActor)
grep -rn 'DispatchQueue.global' Sources/
```

**Rules of thumb:**
- `@StateObject` = view OWNS the object (created here, lives here)
- `@ObservedObject` = view BORROWS the object (passed in from parent)
- `@EnvironmentObject` = injected from ancestor
- **Never** create an `@ObservedObject` with `= SomeClass()` — use `@StateObject`

### 3. Theme Consistency

```bash
# System colors that break our custom dark theme
grep -rn 'Color(.system' Sources/
grep -rn '\.roundedBorder' Sources/
grep -rn 'foregroundColor(\.primary)' Sources/
grep -rn 'foregroundColor(\.secondary)' Sources/
grep -rn 'Color\.blue' Sources/

# Should use: Theme.surface, Theme.surfaceLight, Theme.textPrimary, Theme.textSecondary, Theme.accent
```

### 4. Memory Leaks

```bash
# DispatchQueue.main.asyncAfter without cleanup (infinite loops)
grep -rn 'asyncAfter' Sources/

# CADisplayLink without proper invalidation
grep -rn 'CADisplayLink' Sources/

# NotificationCenter observers without removal
grep -rn 'addObserver' Sources/

# Timer.scheduledTimer without invalidation
grep -rn 'Timer.scheduled' Sources/
```

### 5. Navigation Conflicts

```bash
# Multiple .sheet or .fullScreenCover on same view (SwiftUI drops extras)
grep -rn '\.sheet\|\.fullScreenCover' Sources/ | \
  awk -F: '{print $1}' | sort | uniq -c | sort -rn
# Files with 2+ presentations need manual review
```

### 6. Accessibility

```bash
# Images/buttons without accessibility labels
grep -rn 'Image(systemName' Sources/ | grep -v 'accessibilityLabel'

# Interactive elements without minimum 44pt touch targets
grep -rn '\.frame(width:.*height:' Sources/ | grep -E 'width: [0-3][0-9],'
```

## Common SwiftUI Bug Patterns

### Pattern: View body has side effects
**Bad:** `CGFloat.random()` or `Date()` in a view body — re-evaluated on every render, causing jitter.
**Fix:** Pre-compute in `onAppear`, `init`, or static constants.

### Pattern: Breathing/animation loops never stop
**Bad:** `DispatchQueue.main.asyncAfter` recursive loops without a guard.
**Fix:** Use a `@State var isActive` flag, check it at the top of each cycle, set to `false` in `onDisappear`.

### Pattern: Multiple presentations compete
**Bad:** `.sheet(item:)` and `.fullScreenCover(isPresented:)` on the same view.
**Fix:** Use a single presentation state enum, or ensure they're mutually exclusive.

### Pattern: @MainActor class with deinit
**Bad:** `@MainActor class` with `deinit { resource.cleanup() }` — deinit runs on arbitrary thread.
**Fix:** Clean up resources in `onDisappear` or a dedicated `shutdown()` method called from the view.

### Pattern: Force unwrap on URL(string:)
**Bad:** `URL(string: baseURL + path)!` — crashes if path has special characters.
**Fix:** `guard let url = URL(string:) else { throw URLError(.badURL) }` or use `URLComponents`.

### Pattern: Query params via string concatenation
**Bad:** `"/api?key=\(value)"` — breaks if value contains `&` or `=`.
**Fix:** Use `URLComponents` with `URLQueryItem`.

### Pattern: .onAppear Task instead of .task
**Bad:** `.onAppear { Task { await fetch() } }` — task keeps running if view disappears.
**Fix:** Use `.task { await fetch() }` — auto-cancelled when view is removed.

### Pattern: @ObservedObject with initializer
**Bad:** `@ObservedObject var vm = ViewModel()` — object is recreated on every parent re-render.
**Fix:** Use `@StateObject var vm = ViewModel()` for objects the view owns.

## Structured Logging

Use `os_log` instead of `print()` for runtime debugging from CLI:

```swift
import OSLog
private let logger = Logger(subsystem: "com.example.app", category: "timer")
logger.info("Timer started: \(duration)s")
logger.error("Failed to load: \(error.localizedDescription)")
```

Then stream from CLI:
```bash
xcrun simctl spawn booted log stream \
  --predicate 'subsystem == "com.example.app" AND category == "timer"'
```

## Simulator Management

```bash
# List available simulators
xcrun simctl list devices available

# Boot a simulator
xcrun simctl boot "iPhone 17 Pro"

# Install app on booted simulator
xcrun simctl install booted /path/to/App.app

# Stream simulator logs (runtime crashes, os_log output)
xcrun simctl spawn booted log stream --predicate 'subsystem == "com.example.app"'

# Take a screenshot
xcrun simctl io booted screenshot /tmp/screenshot.png

# Reset simulator (clean state)
xcrun simctl erase "iPhone 17 Pro"
```

## Debugging Workflow

When a bug is reported from TestFlight:

1. **Reproduce mentally** — read the code path for the described behavior
2. **Check the static checklist** — often the bug matches a known pattern
3. **Build with warnings** — sometimes the compiler already flagged it
4. **Fix, build, test locally** — `xcodebuild build` to verify the fix compiles
5. **Push to TestFlight** — verify on device
6. **Document the pattern** — if it's a new bug pattern, add it to this playbook

## Gotchas

- **SourceKit errors in Claude's diagnostics are often false positives** — they show "Cannot find Theme in scope" because SourceKit analyzes files individually without the full project context. Always verify with a real `xcodebuild build`.
- **`xcodebuild test` requires a booted simulator** — boot one first with `xcrun simctl boot`.
- **UI tests are flaky on CI** — prefer unit tests for logic, use UI tests sparingly for critical flows.
- **SwiftUI previews can't be tested from CLI** — they require the Xcode canvas. Don't waste time trying.
