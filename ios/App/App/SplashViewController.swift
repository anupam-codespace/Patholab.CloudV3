import UIKit

class SplashViewController: UIViewController {

    private let MIN_SPLASH_TIME: TimeInterval = 1.5
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
            logoImageView.widthAnchor.constraint(equalToConstant: 280),
            logoImageView.heightAnchor.constraint(equalToConstant: 120) // Safe default aspect bound
        ])
    }
    
    private func checkSession() {
        let token = KeychainManager.read(forKey: KeychainManager.tokenKey)
        
        guard let token = token, !token.isEmpty else {
            self.completeApiCheck(success: false, token: nil)
            return
        }
        
        // Validate token in background
        AuthService.getMe(token: token) { [weak self] valid in
            DispatchQueue.main.async {
                self?.completeApiCheck(success: valid, token: token)
            }
        }
    }
    
    private func completeApiCheck(success: Bool, token: String?) {
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
        guard let appDelegate = UIApplication.shared.delegate as? AppDelegate else { return }
        
        if isApiSuccess, let token = tokenToUse {
            NSLog("DEBUG: SplashViewController routing to MainApp")
            AuthService.injectCookieIntoWebView(token: token) {
                DispatchQueue.main.async {
                    appDelegate.presentMainApp()
                }
            }
        } else {
            NSLog("DEBUG: SplashViewController routing to Login")
            KeychainManager.delete(forKey: KeychainManager.tokenKey)
            AuthService.clearWebViewCookie()
            appDelegate.presentNativeLogin()
        }
    }
}
