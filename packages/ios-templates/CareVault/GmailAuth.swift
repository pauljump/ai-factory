import AuthenticationServices
import Foundation
import Security

// MARK: - Error + Response Types

enum GmailAuthError: LocalizedError {
    case missingCode
    case tokenExchangeFailed(String)
    case refreshFailed(String)
    case noRefreshToken
    case networkError(Error)
    case keychainError(OSStatus)

    var errorDescription: String? {
        switch self {
        case .missingCode:                return "Authorization code not received from Google."
        case .tokenExchangeFailed(let m): return "Token exchange failed: \(m)"
        case .refreshFailed(let m):       return "Token refresh failed: \(m)"
        case .noRefreshToken:             return "No refresh token available. Please sign in again."
        case .networkError(let e):        return "Network error: \(e.localizedDescription)"
        case .keychainError(let s):       return "Keychain error: \(s)"
        }
    }
}

private struct TokenResponse: Codable {
    let access_token: String
    let refresh_token: String?
    let expires_in: Int
    let token_type: String
    let scope: String?
    let id_token: String?
}

private struct UserinfoResponse: Codable {
    let email: String
    let name: String?
    let picture: String?
}

// MARK: - GmailAuth

@MainActor
final class GmailAuth: NSObject, ObservableObject, ASWebAuthenticationPresentationContextProviding {

    // MARK: Published state

    @Published var isAuthenticated: Bool = false
    @Published var userEmail: String?

    // MARK: Config

    private let clientID: String
    private let redirectURI: String
    private let scopes: [String]

    // MARK: Token state

    private var accessToken: String?
    private var refreshToken: String?
    private var tokenExpiry: Date?

    // MARK: Constants

    private static let keychainService = "com.carevault.gmail"
    private static let accessTokenAccount = "access_token"
    private static let refreshTokenAccount = "refresh_token"
    private static let expiryAccount = "token_expiry"
    private static let emailAccount = "user_email"

    private static let tokenURL = "https://oauth2.googleapis.com/token"
    private static let userinfoURL = "https://www.googleapis.com/oauth2/v2/userinfo"

    // MARK: Init

    init(clientID: String, redirectURI: String, scopes: [String]) {
        self.clientID = clientID
        self.redirectURI = redirectURI
        self.scopes = scopes
        super.init()
        loadFromKeychain()
    }

    /// Convenience init using GoogleOAuthConfig.
    convenience override init() {
        self.init(
            clientID: GoogleOAuthConfig.clientID,
            redirectURI: GoogleOAuthConfig.redirectURI,
            scopes: GoogleOAuthConfig.scopes + ["email"]
        )
    }

    // MARK: - ASWebAuthenticationPresentationContextProviding

    nonisolated func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        MainActor.assumeIsolated {
            ASPresentationAnchor()
        }
    }

    // MARK: - Public API

    /// Opens the Google OAuth consent screen and exchanges the code for tokens.
    func authenticate() async throws {
        let authURL = buildAuthURL()
        let callbackScheme = redirectURIScheme()

        let callbackURL: URL = try await withCheckedThrowingContinuation { continuation in
            let session = ASWebAuthenticationSession(
                url: authURL,
                callbackURLScheme: callbackScheme
            ) { url, error in
                if let error {
                    continuation.resume(throwing: GmailAuthError.networkError(error))
                } else if let url {
                    continuation.resume(returning: url)
                } else {
                    continuation.resume(throwing: GmailAuthError.missingCode)
                }
            }
            session.presentationContextProvider = self
            session.prefersEphemeralWebBrowserSession = false
            session.start()
        }

        guard let code = extractCode(from: callbackURL) else {
            throw GmailAuthError.missingCode
        }

        let tokenResponse = try await exchangeCode(code)
        applyTokenResponse(tokenResponse)

        // Fetch user email from userinfo endpoint
        if let email = try? await fetchUserEmail() {
            userEmail = email
            saveToKeychain(value: email, account: Self.emailAccount)
        }

        isAuthenticated = true
    }

    /// Returns a valid access token, refreshing if expired.
    func validAccessToken() async throws -> String {
        if let token = accessToken, let expiry = tokenExpiry, Date() < expiry {
            return token
        }
        // Need to refresh
        guard let refresh = refreshToken else {
            throw GmailAuthError.noRefreshToken
        }
        let tokenResponse = try await refreshAccessToken(refresh)
        applyTokenResponse(tokenResponse)
        guard let token = accessToken else {
            throw GmailAuthError.refreshFailed("No access token after refresh")
        }
        return token
    }

    /// Clears all stored tokens and resets state.
    func logout() {
        accessToken = nil
        refreshToken = nil
        tokenExpiry = nil
        userEmail = nil
        isAuthenticated = false
        deleteFromKeychain(account: Self.accessTokenAccount)
        deleteFromKeychain(account: Self.refreshTokenAccount)
        deleteFromKeychain(account: Self.expiryAccount)
        deleteFromKeychain(account: Self.emailAccount)
    }

    // MARK: - Auth URL

    private func buildAuthURL() -> URL {
        var components = URLComponents(string: GoogleOAuthConfig.authURL)!
        let allScopes = Set(scopes).union(["email"])
        components.queryItems = [
            URLQueryItem(name: "client_id", value: clientID),
            URLQueryItem(name: "redirect_uri", value: redirectURI),
            URLQueryItem(name: "response_type", value: "code"),
            URLQueryItem(name: "scope", value: allScopes.joined(separator: " ")),
            URLQueryItem(name: "access_type", value: "offline"),
            URLQueryItem(name: "prompt", value: "consent"),
        ]
        return components.url!
    }

    private func redirectURIScheme() -> String {
        // The scheme is everything before ":"
        guard let colonIndex = redirectURI.firstIndex(of: ":") else {
            return redirectURI
        }
        return String(redirectURI[redirectURI.startIndex..<colonIndex])
    }

    private func extractCode(from url: URL) -> String? {
        let components = URLComponents(url: url, resolvingAgainstBaseURL: false)
        return components?.queryItems?.first(where: { $0.name == "code" })?.value
    }

    // MARK: - Token Exchange

    private func exchangeCode(_ code: String) async throws -> TokenResponse {
        var request = URLRequest(url: URL(string: Self.tokenURL)!)
        request.httpMethod = "POST"
        request.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")

        let body = [
            "code": code,
            "client_id": clientID,
            "redirect_uri": redirectURI,
            "grant_type": "authorization_code",
        ]
        request.httpBody = body.map { "\($0.key)=\(percentEncode($0.value))" }
            .joined(separator: "&")
            .data(using: .utf8)

        return try await performTokenRequest(request)
    }

    private func refreshAccessToken(_ token: String) async throws -> TokenResponse {
        var request = URLRequest(url: URL(string: Self.tokenURL)!)
        request.httpMethod = "POST"
        request.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")

        let body = [
            "refresh_token": token,
            "client_id": clientID,
            "grant_type": "refresh_token",
        ]
        request.httpBody = body.map { "\($0.key)=\(percentEncode($0.value))" }
            .joined(separator: "&")
            .data(using: .utf8)

        do {
            return try await performTokenRequest(request)
        } catch {
            throw GmailAuthError.refreshFailed(error.localizedDescription)
        }
    }

    private func performTokenRequest(_ request: URLRequest) async throws -> TokenResponse {
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse else {
            throw GmailAuthError.tokenExchangeFailed("Invalid response")
        }
        guard (200...299).contains(http.statusCode) else {
            let body = String(data: data, encoding: .utf8) ?? "unknown"
            throw GmailAuthError.tokenExchangeFailed("HTTP \(http.statusCode): \(body)")
        }
        return try JSONDecoder().decode(TokenResponse.self, from: data)
    }

    // MARK: - Userinfo

    private func fetchUserEmail() async throws -> String {
        guard let token = accessToken else {
            throw GmailAuthError.tokenExchangeFailed("No access token")
        }
        var request = URLRequest(url: URL(string: Self.userinfoURL)!)
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        let (data, _) = try await URLSession.shared.data(for: request)
        let info = try JSONDecoder().decode(UserinfoResponse.self, from: data)
        return info.email
    }

    // MARK: - Apply + Persist

    private func applyTokenResponse(_ response: TokenResponse) {
        accessToken = response.access_token
        tokenExpiry = Date().addingTimeInterval(TimeInterval(response.expires_in - 60)) // 60s buffer

        saveToKeychain(value: response.access_token, account: Self.accessTokenAccount)
        saveToKeychain(value: "\(tokenExpiry!.timeIntervalSince1970)", account: Self.expiryAccount)

        // Google only returns refresh_token on first authorization
        if let refresh = response.refresh_token {
            refreshToken = refresh
            saveToKeychain(value: refresh, account: Self.refreshTokenAccount)
        }
    }

    // MARK: - Keychain

    private func loadFromKeychain() {
        accessToken = readFromKeychain(account: Self.accessTokenAccount)
        refreshToken = readFromKeychain(account: Self.refreshTokenAccount)
        userEmail = readFromKeychain(account: Self.emailAccount)

        if let expiryString = readFromKeychain(account: Self.expiryAccount),
           let interval = Double(expiryString) {
            tokenExpiry = Date(timeIntervalSince1970: interval)
        }

        isAuthenticated = refreshToken != nil
    }

    private func saveToKeychain(value: String, account: String) {
        let data = value.data(using: .utf8)!
        // Delete existing first
        deleteFromKeychain(account: account)

        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: Self.keychainService,
            kSecAttrAccount as String: account,
            kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly,
        ]
        SecItemAdd(query as CFDictionary, nil)
    }

    private func readFromKeychain(account: String) -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: Self.keychainService,
            kSecAttrAccount as String: account,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne,
        ]
        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        guard status == errSecSuccess, let data = result as? Data else { return nil }
        return String(data: data, encoding: .utf8)
    }

    private func deleteFromKeychain(account: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: Self.keychainService,
            kSecAttrAccount as String: account,
        ]
        SecItemDelete(query as CFDictionary)
    }

    // MARK: - Helpers

    private func percentEncode(_ string: String) -> String {
        string.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? string
    }
}
