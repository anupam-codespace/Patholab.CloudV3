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
        completion: @escaping (_ success: Bool, _ error: String?, _ token: String?, _ user: [String: Any]?) -> Void
    ) {
        let body: [String: Any] = [
            "email":    email.trimmingCharacters(in: .whitespacesAndNewlines).lowercased(),
            "password": password
        ]
        post(path: "/api/auth/login", body: body) { data, response, error in
            guard let data = data, let http = response as? HTTPURLResponse else {
                let errDesc = error?.localizedDescription ?? "Network error. Please check your internet connection."
                NSLog("[AuthService] Network error: %@", errDesc)
                DispatchQueue.main.async {
                    completion(false, errDesc, nil, nil)
                }
                return
            }
            NSLog("[AuthService] Login response status: %d", http.statusCode)
            if (200...299).contains(http.statusCode) {
                var token: String? = nil
                var userDict: [String: Any]? = nil
                if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
                    if let jsonToken = json["token"] as? String, !jsonToken.isEmpty {
                        token = jsonToken
                    }
                    if let user = json["user"] as? [String: Any] {
                        userDict = user
                        if let name = user["name"] as? String, !name.isEmpty, !name.contains("@"), name.lowercased() != "null" {
                            let fn = HomeNativeView.formatSmartFirstName(name)
                            if !fn.isEmpty && fn.lowercased() != "doctor" {
                                UserDefaults.standard.set(fn, forKey: "user_name")
                            }
                        }
                        if let email = user["email"] as? String, !email.isEmpty {
                            UserDefaults.standard.set(email, forKey: "user_email")
                        }
                        if let role = user["role"] as? String, !role.isEmpty {
                            UserDefaults.standard.set(role, forKey: "user_role")
                        }
                        var labId = (user["lab_id"] as? String) ?? (user["labId"] as? String)
                        var labName = (user["lab_name"] as? String) ?? (user["labName"] as? String)
                        if let labObj = user["lab"] as? [String: Any] {
                            if let id = labObj["id"] as? String, !id.isEmpty { labId = id }
                            if let name = labObj["name"] as? String, !name.isEmpty { labName = name }
                        }
                        if let labId = labId, !labId.isEmpty {
                            UserDefaults.standard.set(labId, forKey: "lab_id")
                        }
                        if let labName = labName, !labName.isEmpty {
                            UserDefaults.standard.set(labName, forKey: "lab_name")
                        }
                        if let branchId = (user["branchId"] as? String) ?? (user["branch_id"] as? String), !branchId.isEmpty {
                            UserDefaults.standard.set(branchId, forKey: "branch_id")
                        }
                        if let userId = user["id"] as? String, !userId.isEmpty {
                            UserDefaults.standard.set(userId, forKey: "user_id")
                        }
                    }
                }
                if token == nil {
                    token = extractToken(from: http)
                }

                if let token = token, !token.isEmpty {
                    NSLog("[AuthService] Successfully obtained token, saving to Keychain")
                    KeychainManager.save(token, forKey: KeychainManager.tokenKey)
                    UserDefaults.standard.set(token, forKey: "auth_token")
                    UserDefaults.standard.synchronize()
                    injectCookieIntoWebView(token: token) {
                        DispatchQueue.main.async {
                            completion(true, nil, token, userDict)
                        }
                    }
                } else {
                    NSLog("[AuthService] Warning: 2xx login response but no token in body. Checking cookie storage.")
                    if let url = http.url, let cookies = HTTPCookieStorage.shared.cookies(for: url),
                       let sessionCookie = cookies.first(where: { ($0.name == "token" || $0.name == "auth-token") && !$0.value.isEmpty }) {
                        let t = sessionCookie.value
                        KeychainManager.save(t, forKey: KeychainManager.tokenKey)
                        UserDefaults.standard.set(t, forKey: "auth_token")
                        UserDefaults.standard.synchronize()
                        injectCookieIntoWebView(token: t) {
                            DispatchQueue.main.async {
                                completion(true, nil, t, userDict)
                            }
                        }
                    } else {
                        DispatchQueue.main.async {
                            completion(false, "Login succeeded on server but no session token was received. Please try again.", nil, nil)
                        }
                    }
                }
            } else {
                let msg = parseError(from: data, http: http) ?? "Login failed. Please check your credentials."
                NSLog("[AuthService] Login failed: %@", msg)
                DispatchQueue.main.async {
                    completion(false, msg, nil, nil)
                }
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
                completion(false, error?.localizedDescription ?? "Network error. Please check your connection."); return
            }
            if (200...299).contains(http.statusCode) {
                completion(true, nil)
            } else {
                let msg = parseError(from: data, http: http) ?? "Registration failed. Please check your details."
                completion(false, msg)
            }
        }
    }

    // MARK: – Verify Email OTP

    static func verifyEmail(
        email: String,
        code: String,
        completion: @escaping (_ success: Bool, _ error: String?) -> Void
    ) {
        let body: [String: Any] = [
            "email": email.trimmingCharacters(in: .whitespacesAndNewlines).lowercased(),
            "code": code.trimmingCharacters(in: .whitespacesAndNewlines)
        ]
        post(path: "/api/auth/verify", body: body) { data, response, error in
            guard let data = data, let http = response as? HTTPURLResponse else {
                completion(false, error?.localizedDescription ?? "Network error. Please check your connection."); return
            }
            if (200...299).contains(http.statusCode) {
                completion(true, nil)
            } else {
                let msg = parseError(from: data, http: http) ?? "Verification failed. Please check your code."
                completion(false, msg)
            }
        }
    }

    // MARK: – Forgot Password

    static func forgotPassword(
        email: String,
        completion: @escaping (_ success: Bool, _ error: String?) -> Void
    ) {
        let body: [String: Any] = ["email": email.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()]
        post(path: "/api/auth/forgot-password", body: body) { data, response, error in
            guard let data = data, let http = response as? HTTPURLResponse else {
                completion(false, error?.localizedDescription ?? "Network error. Please check your connection."); return
            }
            if (200...299).contains(http.statusCode) {
                completion(true, nil)
            } else {
                let msg = parseError(from: data, http: http) ?? "No account found with this email address."
                completion(false, msg)
            }
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
            "email": email.trimmingCharacters(in: .whitespacesAndNewlines).lowercased(),
            "code": code.trimmingCharacters(in: .whitespacesAndNewlines),
            "newPassword": newPassword
        ]
        post(path: "/api/auth/reset-password", body: body) { data, response, error in
            guard let data = data, let http = response as? HTTPURLResponse else {
                completion(false, error?.localizedDescription ?? "Network error. Please check your connection."); return
            }
            if (200...299).contains(http.statusCode) {
                completion(true, nil)
            } else {
                let msg = parseError(from: data, http: http) ?? "Password reset failed. Please check your code."
                completion(false, msg)
            }
        }
    }

    // MARK: – Resend OTP

    static func resendOtp(
        email: String,
        completion: @escaping (_ success: Bool, _ error: String?) -> Void
    ) {
        let body: [String: Any] = ["email": email.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()]
        post(path: "/api/auth/otp/resend", body: body) { data, response, error in
            guard let data = data, let http = response as? HTTPURLResponse else {
                completion(false, error?.localizedDescription ?? "Network error. Please check your connection."); return
            }
            if (200...299).contains(http.statusCode) {
                completion(true, nil)
            } else {
                let msg = parseError(from: data, http: http) ?? "Failed to resend code. Please try again later."
                completion(false, msg)
            }
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
        var request = URLRequest(url: url, cachePolicy: .reloadIgnoringLocalCacheData, timeoutInterval: 30)
        request.httpMethod = "GET"
        if let token = token {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            request.setValue("token=\(token); auth-token=\(token)", forHTTPHeaderField: "Cookie")
        }
        session.dataTask(with: request) { data, response, _ in
            let http = response as? HTTPURLResponse
            let isValid = http?.statusCode == 200
            if isValid, let data = data, let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
                if let user = json["user"] as? [String: Any] {
                    if let name = user["name"] as? String, !name.isEmpty {
                        let fn = HomeNativeView.formatSmartFirstName(name)
                        if !fn.isEmpty && fn.lowercased() != "doctor" {
                            UserDefaults.standard.set(fn, forKey: "user_name")
                        }
                    }
                    if let email = user["email"] as? String, !email.isEmpty {
                        UserDefaults.standard.set(email, forKey: "user_email")
                    }
                    if let role = user["role"] as? String, !role.isEmpty {
                        UserDefaults.standard.set(role, forKey: "user_role")
                    }
                    var labId = (user["lab_id"] as? String) ?? (user["labId"] as? String)
                    var labName = (user["lab_name"] as? String) ?? (user["labName"] as? String)
                    if let labObj = user["lab"] as? [String: Any] {
                        if let id = labObj["id"] as? String, !id.isEmpty { labId = id }
                        if let name = labObj["name"] as? String, !name.isEmpty { labName = name }
                    }
                    if let labId = labId, !labId.isEmpty {
                        UserDefaults.standard.set(labId, forKey: "lab_id")
                    }
                    if let labName = labName, !labName.isEmpty {
                        UserDefaults.standard.set(labName, forKey: "lab_name")
                    }
                    if let branchId = (user["branchId"] as? String) ?? (user["branch_id"] as? String), !branchId.isEmpty {
                        UserDefaults.standard.set(branchId, forKey: "branch_id")
                    }
                    if let userId = user["id"] as? String, !userId.isEmpty {
                        UserDefaults.standard.set(userId, forKey: "user_id")
                    }
                }
            }
            completion(isValid)
        }.resume()
    }

    private final class NoRedirectDelegate: NSObject, URLSessionTaskDelegate {
        func urlSession(_ session: URLSession, task: URLSessionTask, willPerformHTTPRedirection response: HTTPURLResponse, newRequest request: URLRequest, completionHandler: @escaping (URLRequest?) -> Void) {
            // Stop automatic redirects on auth endpoints to prevent redirect loops
            completionHandler(nil)
        }
    }

    private static let sessionDelegate = NoRedirectDelegate()

    private static let session: URLSession = {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest  = 20
        config.timeoutIntervalForResource = 30
        config.requestCachePolicy = .reloadIgnoringLocalAndRemoteCacheData
        config.waitsForConnectivity = false
        // Identify as the native PathoLab iOS app so the server can distinguish
        config.httpAdditionalHeaders = [
            "User-Agent": "PathoLabCloud-iOS/1.0 CFNetwork",
            "X-App-Client": "ios-native"
        ]
        return URLSession(configuration: config, delegate: sessionDelegate, delegateQueue: nil)
    }()

    private static func post(
        path: String,
        body: [String: Any],
        completion: @escaping (Data?, URLResponse?, Error?) -> Void
    ) {
        guard let url = URL(string: "\(baseURL)\(path)") else {
            DispatchQueue.main.async {
                completion(nil, nil, nil)
            }
            return
        }
        var request = URLRequest(url: url,
                                 cachePolicy: .reloadIgnoringLocalAndRemoteCacheData,
                                 timeoutInterval: 20)
        request.httpMethod = "POST"
        request.httpShouldHandleCookies = false // Prevent ambient cookies and redirect loops on unauthenticated calls
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)
        session.dataTask(with: request, completionHandler: completion).resume()
    }

    private static func parseError(from data: Data?, http: HTTPURLResponse? = nil) -> String? {
        if let data = data, let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
            if let err = json["error"] as? String, !err.isEmpty {
                return err
            }
            if let msg = json["message"] as? String, !msg.isEmpty {
                return msg
            }
            if let details = json["details"] as? String, !details.isEmpty {
                return details
            }
        }
        guard let http = http else { return nil }
        switch http.statusCode {
        case 400: return "Invalid request. Please check the entered details."
        case 401: return "Invalid email or password. Please try again."
        case 403: return "Access denied. Your account may be deactivated."
        case 404: return "Account or requested resource was not found."
        case 429: return "Too many attempts. Please wait a moment and try again."
        case 500, 502, 503, 504: return "Server is temporarily unreachable. Please try again in a few moments."
        default: return nil
        }
    }

    /// Extracts the JWT token value from Set-Cookie response headers.
    private static func extractToken(from response: HTTPURLResponse) -> String? {
        if let url = response.url, let cookies = HTTPCookieStorage.shared.cookies(for: url) {
            if let cookie = cookies.first(where: { ($0.name == "token" || $0.name == "auth-token") && !$0.value.isEmpty }) {
                return cookie.value
            }
        }
        
        var headerDict: [String: String] = [:]
        for (k, v) in response.allHeaderFields {
            headerDict[String(describing: k)] = String(describing: v)
        }
        if let targetUrl = response.url ?? URL(string: baseURL) {
            let parsed = HTTPCookie.cookies(withResponseHeaderFields: headerDict, for: targetUrl)
            if let c = parsed.first(where: { ($0.name == "token" || $0.name == "auth-token") && !$0.value.isEmpty }) {
                return c.value
            }
        }
        
        for (key, val) in response.allHeaderFields {
            let keyStr = String(describing: key).lowercased()
            if keyStr == "set-cookie" {
                let valStr = String(describing: val)
                for cookieKey in ["token=", "auth-token="] {
                    if valStr.contains(cookieKey) {
                        let parts = valStr.components(separatedBy: cookieKey)
                        if parts.count > 1 {
                            let tokenPart = parts[1].components(separatedBy: ";")[0].trimmingCharacters(in: .whitespacesAndNewlines)
                            if !tokenPart.isEmpty {
                                return tokenPart
                            }
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
        let domains = ["app.patholab.cloud", ".patholab.cloud", "patholab.cloud"]
        let cookieNames = ["token", "auth-token"]
        
        for dom in domains {
            for name in cookieNames {
                var properties: [HTTPCookiePropertyKey: Any] = [
                    .name: name,
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
        }
        // Always invoke completion immediately on main thread so UI transitions instantly without blocking
        DispatchQueue.main.async {
            completion?()
        }
    }

    /// Removes the auth cookie from both HTTPCookieStorage and WebView store on logout.
    static func clearWebViewCookie() {
        if let cookies = HTTPCookieStorage.shared.cookies {
            for cookie in cookies {
                if cookie.name == "token" || cookie.name == "auth-token" {
                    HTTPCookieStorage.shared.deleteCookie(cookie)
                }
            }
        }
        DispatchQueue.main.async {
            WKWebsiteDataStore.default().httpCookieStore.getAllCookies { cookies in
                cookies.filter { $0.name == "token" || $0.name == "auth-token" }.forEach { cookie in
                    WKWebsiteDataStore.default().httpCookieStore.delete(cookie)
                }
            }
        }
    }
}
