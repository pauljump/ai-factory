# Playbook: StoreKit 2 In-App Purchases

How to add in-app purchases to an iOS app. Covers non-consumable (lifetime unlock) and consumable (per-unit unlock) patterns.

Learned from: production iOS apps with both consumable and non-consumable patterns

## Two Patterns

### Non-Consumable (lifetime unlock)
Use for: "buy once, unlock forever" features. Pro tier, premium export, ad removal.
Template: `packages/ios-templates/StoreManager.swift`

- Single product ID (e.g., `com.yourapp.pro`)
- `Transaction.currentEntitlements` checks if already purchased
- `Transaction.updates` listens for new purchases
- Local `UserDefaults` flag for fast unlock check
- `restore()` re-checks entitlements (for App Review)

### Consumable (per-item unlock)
Use for: pay-per-use features. Unlock one unit, one report, one export.
Reference: a production consumable StoreManager implementation

- Single product ID reused for each purchase (e.g., `com.yourapp.unit.unlock`)
- **Server-side recording is critical** — verify on server BEFORE calling `transaction.finish()`
- `Transaction.unfinished` handles crash recovery (purchases where app died before finishing)
- No `currentEntitlements` — consumables don't persist in StoreKit

## App Store Connect Setup

1. Go to **App Store Connect → Your App → Monetization → In-App Purchases**
2. Click **+** to create a new IAP
3. Fill in:
   - **Type:** Consumable or Non-Consumable
   - **Reference Name:** internal label (e.g., "Unit Unlock")
   - **Product ID:** reverse-domain format (e.g., `com.yourapp.unit.unlock`)
   - **Price:** select from the price point schedule ($0.99, $1.99, etc.)
   - **Display Name + Description:** what the user sees on the purchase sheet
4. **Status must be "Ready to Submit"** — if it says "Missing Metadata", add a screenshot of the purchase UI
5. IAPs are available in sandbox immediately after creation — no need to submit the app first

## Sandbox Testing

- **On a physical device:** Settings → App Store → Sandbox Account. Create a sandbox tester in App Store Connect → Users and Access → Sandbox Testers
- **Sandbox purchases are free** but go through the full StoreKit flow
- **Gotcha:** `Product.products(for:)` returns empty if the product ID doesn't match exactly or the IAP isn't "Ready to Submit"
- **Gotcha:** Sandbox can be flaky — if purchases hang, sign out of sandbox account and sign back in
- **Xcode StoreKit Testing:** Create a `Products.storekit` file for local testing without App Store Connect. Good for CI but doesn't test real server-side validation.

## Implementation Checklist

1. **Create the product in App Store Connect** (see above)
2. **Copy StoreManager.swift** from `packages/ios-templates/` (non-consumable) or adapt for consumable pattern
3. **Set the product ID** — must match App Store Connect exactly
4. **Add StoreKit capability** in your Xcode project / project.yml
5. **Wire the purchase button:**
   ```swift
   Button("Unlock for \(storeManager.unlockProduct?.displayPrice ?? "$0.99")") {
       Task { await storeManager.purchase() }
   }
   .disabled(storeManager.purchasing || storeManager.unlockProduct == nil)
   ```
6. **Add a Restore Purchases button** (required for App Review on non-consumables)
7. **For consumables:** record the purchase server-side BEFORE finishing the transaction
8. **Test in sandbox** on a physical device

## Server-Side Validation (Consumables)

For consumables, the server must record what was purchased before the client finishes the transaction. Pattern:

```
1. Client calls product.purchase() → gets verified transaction
2. Client calls server: POST /api/unlocks { unitNumber, transactionId }
3. Server records the unlock in DB, returns success
4. Client calls transaction.finish() — only after server confirms
5. If app crashes between 1 and 4: Transaction.unfinished picks it up on next launch
```

This prevents: user pays but unlock isn't recorded (crash), or user gets unlock without paying (finish before server).

## App Review Notes

- **Non-consumables must have "Restore Purchases"** — reviewers will reject without it
- **Price must be visible** before the purchase sheet appears
- **Don't use StoreKit for tipping/donations** — Apple rejects this
- **Consumables don't need restore** — they're consumed, nothing to restore

## Gotchas

- `Product.products(for:)` returns empty (not an error) if the product ID is wrong or the IAP isn't in "Ready to Submit" state. Always check for `nil` product before enabling purchase buttons.
- Sandbox environment is separate from production — a sandbox purchase won't show up in production and vice versa.
- StoreKit 2 is Swift-only (no Obj-C bridge). Fine for us — all iOS projects are Swift.
- Transaction IDs are `UInt64` in StoreKit but should be stored as `String` on the server (to avoid JSON integer precision issues).
- The purchase sheet is system UI — you can't customize it. The Display Name and Description from App Store Connect are what the user sees.
