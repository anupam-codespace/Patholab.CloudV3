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
        
        // Show splash screen first, which handles session verification and minimum display timing
        let splashVC = SplashViewController()
        window?.rootViewController = splashVC
        window?.makeKeyAndVisible()
        NSLog("DEBUG: AppDelegate set splashVC as rootViewController")
        
        return true
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
        
        // Premium slide-up transition from splash to main app
        let transition = CATransition()
        transition.duration = 0.42
        transition.type = .moveIn
        transition.subtype = .fromTop
        transition.timingFunction = CAMediaTimingFunction(name: .easeInEaseOut)
        window?.layer.add(transition, forKey: kCATransition)
        window?.rootViewController = mainVC
        window?.makeKeyAndVisible()
    }

    func presentNativeLogin() {
        NSLog("DEBUG: AppDelegate presentNativeLogin")
        let loginVC = LoginViewController()
        loginVC.onLoginSuccess = { [weak self] in
            self?.presentMainApp()
        }
        
        // Smooth cross-dissolve transition for login screen
        UIView.transition(
            with: window!,
            duration: 0.35,
            options: [.transitionCrossDissolve],
            animations: { self.window?.rootViewController = loginVC },
            completion: nil
        )
        window?.makeKeyAndVisible()
    }

    /// Safe sign-out: clears credentials and navigates to Login without
    /// re-calling didFinishLaunching (which would double-initialize Capacitor).
    func signOut() {
        KeychainManager.delete(forKey: KeychainManager.tokenKey)
        AuthService.clearWebViewCookie()
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
