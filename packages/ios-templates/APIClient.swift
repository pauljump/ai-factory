import Foundation

/// Generic HTTP client for communicating with the backend.
/// Copy into your project and set the base URL.
struct APIClient {
    /// Override via UserDefaults for dev/testing, or set your production URL here.
    static var baseURL: String {
        UserDefaults.standard.string(forKey: "api_base_url")
            ?? "https://YOUR_APP.run.app"  // TODO: set your Cloud Run URL
    }

    // MARK: - Generic HTTP helpers

    static func get<T: Decodable>(_ path: String) async throws -> T {
        let url = URL(string: baseURL + path)!
        var request = URLRequest(url: url)
        request.timeoutInterval = 15
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode) else {
            throw URLError(.badServerResponse)
        }
        return try JSONDecoder().decode(T.self, from: data)
    }

    static func post<T: Decodable>(_ path: String, body: some Encodable) async throws -> T {
        let url = URL(string: baseURL + path)!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.timeoutInterval = 15
        request.httpBody = try JSONEncoder().encode(body)
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode) else {
            throw URLError(.badServerResponse)
        }
        return try JSONDecoder().decode(T.self, from: data)
    }

    // MARK: - Add your app-specific endpoints below
    // Example:
    // struct Item: Codable, Identifiable { let id: Int; let name: String }
    // static func getItems() async throws -> [Item] { try await get("/items") }
}
