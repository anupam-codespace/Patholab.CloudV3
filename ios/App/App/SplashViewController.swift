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
            logoImageView.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            logoImageView.centerYAnchor.constraint(equalTo: view.centerYAnchor),
            logoImageView.widthAnchor.constraint(equalToConstant: 320),
            logoImageView.heightAnchor.constraint(equalToConstant: 570)
        ])
    }
    
    private func checkSession() {
        // Safety timeout in case network check hangs
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.5) { [weak self] in
            guard let self = self, !self.isApiFinished else { return }
            self.completeApiCheck(success: false, token: nil)
        }

        if let token = KeychainManager.read(forKey: KeychainManager.tokenKey), !token.isEmpty {
            // Validate token in background
            AuthService.getMe(token: token) { [weak self] valid in
                DispatchQueue.main.async {
                    self?.completeApiCheck(success: valid, token: token)
                }
            }
        } else {
            // No token saved, complete API check immediately
            DispatchQueue.main.async { [weak self] in
                self?.completeApiCheck(success: false, token: nil)
            }
        }
    }
    
    private func completeApiCheck(success: Bool, token: String?) {
        guard !isApiFinished else { return }
        isApiFinished = true
        isApiSuccess = success
        tokenToUse = token
        
        let elapsed = Date().timeIntervalSince(startTime ?? Date())
        let remaining = MIN_SPLASH_TIME - elapsed
        
        if remaining > 0 {
            DispatchQueue.main.asyncAfter(deadline: .now() + remaining) { [weak self] in
                self?.routeToApp()
            }
        } else {
            routeToApp()
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
                KeychainManager.delete(forKey: KeychainManager.tokenKey)
                AuthService.clearWebViewCookie()
                NSLog("DEBUG: SplashViewController routing to Onboarding")
                appDelegate.presentOnboarding()
            }
        }
    }
}
