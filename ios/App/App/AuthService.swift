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
                var token: String? = nil
                if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                   let jsonToken = json["token"] as? String, !jsonToken.isEmpty {
                    token = jsonToken
                }
                if token == nil {
                    token = extractToken(from: http)
                }

                if let token = token, !token.isEmpty {
                    KeychainManager.save(token, forKey: KeychainManager.tokenKey)
                    injectCookieIntoWebView(token: token) {
                        completion(true, nil, token)
                    }
                } else {
                    // Server returned 2xx but no parseable token.
                    // This means the session is set via HttpOnly cookie on the server side.
                    // Propagate success but flag it — the WebView will use the shared
                    // HTTPCookieStorage which was populated by NSURLSession automatically.
                    NSLog("[AuthService] Warning: 2xx login response but no token found in body or Set-Cookie. Falling back to session cookie.")
                    // Still try to extract via HTTPCookieStorage (auto-populated by NSURLSession)
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                        if let url = http.url, let cookies = HTTPCookieStorage.shared.cookies(for: url),
                           let sessionCookie = cookies.first(where: { $0.name == "token" }), !sessionCookie.value.isEmpty {
                            let t = sessionCookie.value
                            KeychainManager.save(t, forKey: KeychainManager.tokenKey)
                            injectCookieIntoWebView(token: t) {
                                completion(true, nil, t)
                            }
                        } else {
                            // Truly no token — show error so user isn't stuck
                            completion(false, "Login succeeded on server but no session token was received. Please try again.", nil)
                        }
                    }
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

    private static let session: URLSession = {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest  = 15
        config.timeoutIntervalForResource = 20
        config.requestCachePolicy = .reloadIgnoringLocalAndRemoteCacheData
        config.waitsForConnectivity = false
        // Identify as the native PathoLab iOS app so the server can distinguish
        config.httpAdditionalHeaders = [
            "User-Agent": "PathoLabCloud-iOS/1.0 CFNetwork",
            "X-App-Client": "ios-native"
        ]
        return URLSession(configuration: config)
    }()

    private static func post(
        path: String,
        body: [String: Any],
        completion: @escaping (Data?, URLResponse?, Error?) -> Void
    ) {
        guard let url = URL(string: "\(baseURL)\(path)") else {
            completion(nil, nil, nil); return
        }
        // Explicitly set timeout on the request as well (belt-and-suspenders).
        var request = URLRequest(url: url,
                                 cachePolicy: .reloadIgnoringLocalAndRemoteCacheData,
                                 timeoutInterval: 15)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)
        session.dataTask(with: request, completionHandler: completion).resume()
    }

    private static func parseError(from data: Data) -> String? {
        guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { return nil }
        return json["error"] as? String
    }

    /// Extracts the JWT token value from Set-Cookie response headers.
    private static func extractToken(from response: HTTPURLResponse) -> String? {
        if let url = response.url, let cookies = HTTPCookieStorage.shared.cookies(for: url) {
            if let cookie = cookies.first(where: { $0.name == "token" && !$0.value.isEmpty }) {
                return cookie.value
            }
        }
        
        for (key, val) in response.allHeaderFields {
            let keyStr = String(describing: key).lowercased()
            if keyStr == "set-cookie" {
                let valStr = String(describing: val)
                if valStr.contains("token=") {
                    let parts = valStr.components(separatedBy: "token=")
                    if parts.count > 1 {
                        let tokenPart = parts[1].components(separatedBy: ";")[0].trimmingCharacters(in: .whitespacesAndNewlines)
                        if !tokenPart.isEmpty {
                            return tokenPart
                        }
                    }
                }
            }
        }
        return nil
    }

    /// Injects the token as a cookie into WKWebView's shared cookie store.
    /// This ensures the Capacitor WebView (CAPBridgeViewController) is pre-authenticated.
    static func injectCookieIntoWebView(token: String, completion: (() -> Void)? = nil) {
        let domains = ["app.patholab.cloud", ".patholab.cloud"]
        for dom in domains {
            var properties: [HTTPCookiePropertyKey: Any] = [
                .name: "token",
                .value: token,
                .domain: dom,
                .path: "/",
                .expires: Date(timeIntervalSinceNow: 60 * 60 * 24 * 30)
            ]
            properties[.secure] = "TRUE"
            if let cookie = HTTPCookie(properties: properties) {
                HTTPCookieStorage.shared.setCookie(cookie)
                DispatchQueue.main.async {
                    WKWebsiteDataStore.default().httpCookieStore.setCookie(cookie, completionHandler: nil)
                }
            }
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) {
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
