import UIKit
import WebKit

class SplashViewController: UIViewController {

    private let MIN_SPLASH_TIME: TimeInterval = 2.5
    private var startTime: Date?
    
    private var isApiFinished = false
    private var isApiSuccess = false
    private var tokenToUse: String?

    override func viewDidLoad() {
        NSLog("DEBUG: SplashViewController viewDidLoad")
        super.viewDidLoad()
        view.backgroundColor = .white
        
        setupStatusBar()
        setupLogo()
        
        startTime = Date()
        checkSession()
        
        // Absolute failsafe: ensure the app navigates away from splash within 3.5 seconds regardless of network status
        DispatchQueue.main.asyncAfter(deadline: .now() + 3.5) { [weak self] in
            guard let self = self, !self.isApiFinished else { return }
            NSLog("WARN: SplashViewController failsafe triggered after 3.5s timeout")
            self.completeApiCheck(success: false, token: nil)
        }
    }
    
    private func setupStatusBar() {
        if #available(iOS 13.0, *) {
            overrideUserInterfaceStyle = .light
        }
        setNeedsStatusBarAppearanceUpdate()
    }
    
    override var preferredStatusBarStyle: UIStatusBarStyle {
        if #available(iOS 13.0, *) {
            return .darkContent
        }
        return .default
    }
    
    private func setupLogo() {
        let logoImageView = UIImageView()
        logoImageView.image = UIImage(named: "LogoSplash")
        logoImageView.contentMode = .scaleAspectFit
        logoImageView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(logoImageView)
        
        NSLayoutConstraint.activate([
            logoImageView.topAnchor.constraint(equalTo: view.topAnchor),
            logoImageView.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            logoImageView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            logoImageView.trailingAnchor.constraint(equalTo: view.trailingAnchor)
        ])
    }
    
    private func checkSession() {
        let token = (KeychainManager.read(forKey: KeychainManager.tokenKey) ?? UserDefaults.standard.string(forKey: "auth_token"))?.trimmingCharacters(in: .whitespacesAndNewlines)

        if let token = token, !token.isEmpty {
            // Pre-sync webview cookie immediately so WebView is authenticated
            AuthService.injectCookieIntoWebView(token: token)

            // Validate and sync user info in background (non-blocking, never wipe session on network hiccup)
            AuthService.getMe(token: token) { _ in
                // Background profile sync complete
            }

            // Route to main app after brief splash animation
            completeApiCheck(success: true, token: token)
        } else {
            // No token saved: route to Onboarding or Login
            completeApiCheck(success: false, token: nil)
        }
    }
    
    private func completeApiCheck(success: Bool, token: String?) {
        guard !isApiFinished else { return }
        isApiFinished = true
        isApiSuccess = success
        tokenToUse = token
        
        let elapsed = Date().timeIntervalSince(startTime ?? Date())
        let remaining = max(0, MIN_SPLASH_TIME - elapsed)
        
        DispatchQueue.main.asyncAfter(deadline: .now() + remaining) { [weak self] in
            self?.routeToApp()
        }
    }
    
    private func routeToApp() {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            guard let appDelegate = UIApplication.shared.delegate as? AppDelegate else {
                NSLog("DEBUG: SplashViewController could not find AppDelegate")
                return
            }
            
            if self.isApiSuccess, let token = self.tokenToUse {
                NSLog("DEBUG: SplashViewController routing to MainApp")
                AuthService.injectCookieIntoWebView(token: token) {
                    DispatchQueue.main.async {
                        appDelegate.presentMainApp()
                    }
                }
            } else {
                NSLog("DEBUG: SplashViewController routing to Onboarding or Login")
                let hasCompletedOnboarding = UserDefaults.standard.bool(forKey: "has_completed_onboarding")
                if hasCompletedOnboarding {
                    appDelegate.presentNativeLogin()
                } else {
                    appDelegate.presentOnboarding()
                }
            }
        }
    }
}
