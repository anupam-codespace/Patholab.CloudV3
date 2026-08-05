import Foundation
import WebKit

/// Calls the Patholab Cloud API endpoints.
/// All requests go to https://app.patholab.cloud — the same backend as the web app.
/// On login success, the JWT cookie is automatically injected into WKWebView's
/// cookie store so the Capacitor bridge inherits the authenticated session.
struct AuthService {

    static let baseURL = "https://app.patholab.cloud"

    // MARK: – Login

    static func login(
        email: String,
        password: String,
        completion: @escaping (_ success: Bool, _ error: String?, _ token: String?) -> Void
    ) {
        let body: [String: Any] = [
            "email":    email.trimmingCharacters(in: .whitespacesAndNewlines).lowercased(),
            "password": password
        ]
        post(path: "/api/auth/login", body: body) { data, response, error in
            guard let data = data, let http = response as? HTTPURLResponse else {
                completion(false, error?.localizedDescription ?? "Network error", nil)
                return
            }
            if (200...299).contains(http.statusCode) {
                let token = extractToken(from: http)
                if let token = token {
                    KeychainManager.save(token, forKey: KeychainManager.tokenKey)
                    injectCookieIntoWebView(token: token) {
                        completion(true, nil, token)
                    }
                } else {
                    completion(true, nil, token)
                }
            } else {
                let msg = parseError(from: data) ?? "Login failed"
                completion(false, msg, nil)
            }
        }
    }

    // MARK: – Register

    static func register(
        labName: String,
        name: String,
        email: String,
        phone: String,
        password: String,
        completion: @escaping (_ success: Bool, _ error: String?) -> Void
    ) {
        let body: [String: Any] = [
            "labName":  labName.trimmingCharacters(in: .whitespacesAndNewlines),
            "name":     name.trimmingCharacters(in: .whitespacesAndNewlines),
            "email":    email.trimmingCharacters(in: .whitespacesAndNewlines).lowercased(),
            "phone":    phone.trimmingCharacters(in: .whitespacesAndNewlines),
            "password": password
        ]
        post(path: "/api/auth/register", body: body) { data, response, error in
            guard let data = data, let http = response as? HTTPURLResponse else {
                completion(false, error?.localizedDescription ?? "Network error"); return
            }
            completion((200...299).contains(http.statusCode), parseError(from: data))
        }
    }

    // MARK: – Verify Email OTP

    static func verifyEmail(
        email: String,
        code: String,
        completion: @escaping (_ success: Bool, _ error: String?) -> Void
    ) {
        let body: [String: Any] = [
            "email": email.lowercased(),
            "code": code
        ]
        post(path: "/api/auth/verify", body: body) { data, response, error in
            guard let data = data, let http = response as? HTTPURLResponse else {
                completion(false, "Network error"); return
            }
            completion((200...299).contains(http.statusCode), parseError(from: data))
        }
    }

    // MARK: – Forgot Password

    static func forgotPassword(
        email: String,
        completion: @escaping (_ success: Bool, _ error: String?) -> Void
    ) {
        let body: [String: Any] = ["email": email.lowercased()]
        post(path: "/api/auth/forgot-password", body: body) { data, response, error in
            guard let data = data, let http = response as? HTTPURLResponse else {
                completion(false, "Network error"); return
            }
            completion((200...299).contains(http.statusCode), parseError(from: data))
        }
    }

    // MARK: – Reset Password

    static func resetPassword(
        email: String,
        code: String,
        newPassword: String,
        completion: @escaping (_ success: Bool, _ error: String?) -> Void
    ) {
        let body: [String: Any] = [
            "email": email.lowercased(),
            "code": code,
            "newPassword": newPassword
        ]
        post(path: "/api/auth/reset-password", body: body) { data, response, error in
            guard let data = data, let http = response as? HTTPURLResponse else {
                completion(false, "Network error"); return
            }
            completion((200...299).contains(http.statusCode), parseError(from: data))
        }
    }

    // MARK: – Resend OTP

    static func resendOtp(
        email: String,
        completion: @escaping (_ success: Bool, _ error: String?) -> Void
    ) {
        let body: [String: Any] = ["email": email.lowercased()]
        post(path: "/api/auth/otp/resend", body: body) { data, response, error in
            guard let data = data, let http = response as? HTTPURLResponse else {
                completion(false, "Network error"); return
            }
            completion((200...299).contains(http.statusCode), parseError(from: data))
        }
    }

    // MARK: – Validate Token (GET /api/auth/me)

    static func getMe(
        token: String?,
        completion: @escaping (_ valid: Bool) -> Void
    ) {
        guard let url = URL(string: "\(baseURL)/api/auth/me") else {
            completion(false); return
        }
        var request = URLRequest(url: url, cachePolicy: .reloadIgnoringLocalCacheData, timeoutInterval: 15)
        request.httpMethod = "GET"
        if let token = token {
            request.setValue("token=\(token)", forHTTPHeaderField: "Cookie")
        }
        URLSession.shared.dataTask(with: request) { _, response, _ in
            let http = response as? HTTPURLResponse
            completion(http?.statusCode == 200)
        }.resume()
    }

    // MARK: – Helpers

    private static func post(
        path: String,
        body: [String: Any],
        completion: @escaping (Data?, URLResponse?, Error?) -> Void
    ) {
        guard let url = URL(string: "\(baseURL)\(path)") else {
            completion(nil, nil, nil); return
        }
        var request = URLRequest(url: url, cachePolicy: .reloadIgnoringLocalCacheData, timeoutInterval: 20)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)
        URLSession.shared.dataTask(with: request, completionHandler: completion).resume()
    }

    private static func parseError(from data: Data) -> String? {
        guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { return nil }
        return json["error"] as? String
    }

    /// Extracts the JWT token value from Set-Cookie response headers.
    private static func extractToken(from response: HTTPURLResponse) -> String? {
        let headers = response.allHeaderFields as? [String: String] ?? [:]
        // HTTPURLResponse can expose Set-Cookie via HTTPCookieStorage
        guard let url = response.url else { return nil }
        let cookies = HTTPCookie.cookies(withResponseHeaderFields: headers, for: url)
        return cookies.first(where: { $0.name == "token" })?.value
    }

    /// Injects the token as a cookie into WKWebView's shared cookie store.
    /// This ensures the Capacitor WebView (CAPBridgeViewController) is pre-authenticated.
    static func injectCookieIntoWebView(token: String, completion: (() -> Void)? = nil) {
        var properties: [HTTPCookiePropertyKey: Any] = [
            .name:    "token",
            .value:   token,
            .domain:  "app.patholab.cloud",
            .path:    "/",
            .secure:  "TRUE",
            .sameSitePolicy: "Lax"
        ]
        // Set expiry to 7 days from now to match backend
        properties[.expires] = Date(timeIntervalSinceNow: 60 * 60 * 24 * 7)

        if let cookie = HTTPCookie(properties: properties) {
            DispatchQueue.main.async {
                WKWebsiteDataStore.default().httpCookieStore.setCookie(cookie) {
                    completion?()
                }
            }
        } else {
            completion?()
        }
    }

    /// Removes the auth cookie from the WebView store on logout.
    static func clearWebViewCookie() {
        WKWebsiteDataStore.default().httpCookieStore.getAllCookies { cookies in
            cookies.filter { $0.name == "token" }.forEach { cookie in
                WKWebsiteDataStore.default().httpCookieStore.delete(cookie)
            }
        }
    }
}
