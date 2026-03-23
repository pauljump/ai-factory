import StoreKit

/// Generic StoreKit 2 manager for a single non-consumable IAP.
/// Change the product ID and unlock key for your app.
@MainActor
final class StoreManager: ObservableObject {
    static let shared = StoreManager()

    // TODO: set your product ID
    static let productId = "com.yourapp.pro"
    private static let unlockKey = "pro_unlocked"

    @Published var isUnlocked = false
    @Published var product: Product?
    @Published var purchasing = false

    private let defaults = UserDefaults.standard

    private init() {
        isUnlocked = defaults.bool(forKey: Self.unlockKey)
        Task { await loadProducts() }
        Task { await listenForTransactions() }
    }

    func loadProducts() async {
        do {
            let products = try await Product.products(for: [Self.productId])
            product = products.first
        } catch {
            print("[StoreManager] Failed to load products: \(error)")
        }
        await refreshPurchaseStatus()
    }

    func purchase() async {
        guard let product else { return }
        purchasing = true
        defer { purchasing = false }

        do {
            let result = try await product.purchase()
            switch result {
            case .success(let verification):
                if case .verified(let transaction) = verification {
                    await transaction.finish()
                    unlock()
                }
            case .pending, .userCancelled:
                break
            @unknown default:
                break
            }
        } catch {
            print("[StoreManager] Purchase error: \(error)")
        }
    }

    func restore() async {
        await refreshPurchaseStatus()
    }

    private func refreshPurchaseStatus() async {
        for await result in Transaction.currentEntitlements {
            if case .verified(let transaction) = result,
               transaction.productID == Self.productId {
                unlock()
            }
        }
    }

    private func listenForTransactions() async {
        for await result in Transaction.updates {
            if case .verified(let transaction) = result,
               transaction.productID == Self.productId {
                await transaction.finish()
                unlock()
            }
        }
    }

    private func unlock() {
        isUnlocked = true
        defaults.set(true, forKey: Self.unlockKey)
    }
}
