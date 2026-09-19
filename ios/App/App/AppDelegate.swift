import UIKit
import Capacitor
import WebKit

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        NSLog("DEBUG: AppDelegate didFinishLaunchingWithOptions, window is %@", String(describing: window))
        // Ensure window exists before any routing
        if window == nil {
            NSLog("DEBUG: AppDelegate window is nil, creating one")
            window = UIWindow(frame: UIScreen.main.bounds)
        }
        
        // Initialize mobile notification center permissions & delegate
        MobileNotificationHelper.shared.setupNotificationCenter()

        // Show splash screen first, which handles session verification and minimum display timing
        let splashVC = SplashViewController()
        window?.rootViewController = splashVC
        window?.makeKeyAndVisible()
        NSLog("DEBUG: AppDelegate set splashVC as rootViewController")
        
        return true
    }

    private func getWindow() -> UIWindow? {
        if let win = self.window {
            return win
        }
        let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
        let activeScene = scenes.first(where: { $0.activationState == .foregroundActive || $0.activationState == .foregroundInactive }) ?? scenes.first
        return activeScene?.windows.first(where: { $0.isKeyWindow }) ?? activeScene?.windows.first
    }

    // MARK: - Navigation

    func presentMainApp() {
        NSLog("DEBUG: AppDelegate presentMainApp")
        let storyboard = UIStoryboard(name: "Main", bundle: nil)
        let mainVC: UIViewController
        if let vc = storyboard.instantiateInitialViewController() as? MainViewController {
            mainVC = vc
        } else {
            NSLog("DEBUG: AppDelegate presentMainApp failed to cast to MainViewController")
            mainVC = MainViewController()
        }
        
        guard let win = self.getWindow() else { return }
        self.window = win
        
        // Premium slide-up transition from splash to main app
        let transition = CATransition()
        transition.duration = 0.42
        transition.type = .moveIn
        transition.subtype = .fromTop
        transition.timingFunction = CAMediaTimingFunction(name: .easeInEaseOut)
        win.layer.add(transition, forKey: kCATransition)
        win.rootViewController = mainVC
        win.makeKeyAndVisible()
    }

    func presentOnboarding() {
        NSLog("DEBUG: AppDelegate presentOnboarding")
        let onboardingVC = OnboardingViewController()
        onboardingVC.onCompletion = { [weak self] in
            self?.presentNativeLogin()
        }
        
        guard let win = self.getWindow() else {
            NSLog("DEBUG: AppDelegate presentOnboarding - no window found")
            return
        }
        self.window = win
        win.rootViewController = onboardingVC
        UIView.transition(with: win, duration: 0.35, options: .transitionCrossDissolve, animations: nil, completion: nil)
        win.makeKeyAndVisible()
    }

    func presentNativeLogin(prefilledEmail: String? = nil, successMessage: String? = nil) {
        NSLog("DEBUG: AppDelegate presentNativeLogin with email=%@, msg=%@", prefilledEmail ?? "nil", successMessage ?? "nil")
        let loginVC = LoginViewController(prefilledEmail: prefilledEmail, initialSuccessMessage: successMessage)
        loginVC.onLoginSuccess = { [weak self] in
            self?.presentMainApp()
        }
        
        guard let win = self.getWindow() else {
            NSLog("DEBUG: AppDelegate presentNativeLogin - no window found")
            return
        }
        self.window = win
        win.rootViewController = loginVC
        UIView.transition(with: win, duration: 0.35, options: .transitionCrossDissolve, animations: nil, completion: nil)
        win.makeKeyAndVisible()
    }

    /// Safe sign-out: clears credentials and navigates to Login without
    /// re-calling didFinishLaunching (which would double-initialize Capacitor).
    func signOut() {
        KeychainManager.delete(forKey: KeychainManager.tokenKey)
        KeychainManager.delete(forKey: KeychainManager.nameKey)
        KeychainManager.delete(forKey: KeychainManager.emailKey)
        KeychainManager.delete(forKey: KeychainManager.roleKey)
        AuthService.clearWebViewCookie()
        UserDefaults.standard.removeObject(forKey: "user_name")
        UserDefaults.standard.removeObject(forKey: "user_email")
        UserDefaults.standard.removeObject(forKey: "user_role")
        UserDefaults.standard.removeObject(forKey: "auth_token")
        UserDefaults.standard.removeObject(forKey: "lab_id")
        UserDefaults.standard.removeObject(forKey: "lab_name")
        UserDefaults.standard.removeObject(forKey: "user_avatar_gender")
        UserDefaults.standard.synchronize()
        MobileNotificationHelper.shared.clearNotificationSession()
        HomeNativeView.resetSession()
        presentNativeLogin()
    }

    // MARK: - Capacitor Delegation

    func applicationWillResignActive(_ application: UIApplication) {}
    func applicationDidEnterBackground(_ application: UIApplication) {}
    func applicationWillEnterForeground(_ application: UIApplication) {}
    func applicationDidBecomeActive(_ application: UIApplication) {}
    func applicationWillTerminate(_ application: UIApplication) {}

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }
}
