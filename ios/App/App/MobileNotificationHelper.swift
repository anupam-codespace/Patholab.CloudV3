import UIKit
import UserNotifications

/**
 * MobileNotificationHelper
 * ────────────────────────
 * Manages native iOS push/local system notifications for Welcome and Low Balance alerts.
 * Ensures alerts appear on the lock screen and device notification center even when the app is backgrounded or closed.
 * Scoped strictly to the logged-in user with session debouncing.
 */
class MobileNotificationHelper: NSObject, UNUserNotificationCenterDelegate {

    static let shared = MobileNotificationHelper()

    private let userDefaults = UserDefaults.standard
    private let cooldownSeconds: TimeInterval = 6 * 3600 // 6 hours

    private override init() {
        super.init()
    }

    /**
     * Request notification permissions from user on app launch
     */
    func setupNotificationCenter() {
        let center = UNUserNotificationCenter.current()
        center.delegate = self

        center.requestAuthorization(options: [.alert, .badge, .sound]) { granted, error in
            if granted {
                NSLog("DEBUG: iOS Mobile Notification permission granted")
            } else if let error = error {
                NSLog("DEBUG: iOS Mobile Notification permission error: %@", error.localizedDescription)
            }
        }
    }

    /**
     * Posts a device system Welcome notification to iOS Notification Center & Lock Screen.
     */
    func postWelcomeNotification(userName: String, userId: String) {
        let effectiveId = userId.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? "default_user" : userId.trimmingCharacters(in: .whitespacesAndNewlines)
        let welcomeKey = "welcomed_user_\(effectiveId)"

        if userDefaults.bool(forKey: welcomeKey) {
            return
        }

        let cleanName = userName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? "Lab Partner" : userName.trimmingCharacters(in: .whitespacesAndNewlines)
        let firstName = cleanName.components(separatedBy: .whitespaces).first ?? cleanName

        let content = UNMutableNotificationContent()
        content.title = "Welcome to PathoLab Cloud 👋"
        content.body = "Hello \(firstName)! Your diagnostic workspace is live and ready for patient registrations & reports."
        content.sound = .default
        content.userInfo = ["type": "WELCOME_NOTIFICATION", "userId": effectiveId]

        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: 1.0, repeats: false)
        let request = UNNotificationRequest(identifier: "welcome_notification_\(effectiveId)", content: content, trigger: trigger)

        UNUserNotificationCenter.current().add(request) { [weak self] error in
            if error == nil {
                self?.userDefaults.set(true, forKey: welcomeKey)
            }
        }
    }

    /**
     * Posts a device system Low Balance / Zero Balance alert notification to iOS Notification Center & Lock Screen.
     */
    func postLowBalanceNotification(balance: Double, userId: String) {
        if balance > 50 { return }

        let effectiveId = userId.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? "default_user" : userId.trimmingCharacters(in: .whitespacesAndNewlines)
        let lastAlertKey = "last_low_bal_alert_ts_\(effectiveId)"
        let lastAlertTime = userDefaults.double(forKey: lastAlertKey)
        let now = Date().timeIntervalSince1970
        let effectiveCooldown = (balance <= 0) ? 5.0 : cooldownSeconds

        if now - lastAlertTime < effectiveCooldown {
            return
        }

        let isZero = balance <= 0
        let formatted = String(format: "₹%.2f", max(0.0, balance))

        let content = UNMutableNotificationContent()
        content.title = isZero ? "⚠️ Wallet Balance Empty" : "⚠️ Low Wallet Balance (\(formatted))"
        content.body = isZero
            ? "Your lab wallet balance is ₹0.00. Recharge now to keep patient registration and reports active."
            : "Your lab wallet balance is only \(formatted). Recharge soon to avoid test report disruption."
        content.sound = .default
        content.userInfo = ["type": "LOW_BALANCE_NOTIFICATION", "route": "/workspace/wallet", "userId": effectiveId]

        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: 1.0, repeats: false)
        let request = UNNotificationRequest(identifier: "low_balance_\(effectiveId)", content: content, trigger: trigger)

        UNUserNotificationCenter.current().add(request) { [weak self] error in
            if error == nil {
                self?.userDefaults.set(now, forKey: lastAlertKey)
            }
        }
    }

    /**
     * Clears user notification session upon sign out
     */
    func clearNotificationSession() {
        UNUserNotificationCenter.current().removeAllPendingNotificationRequests()
        UNUserNotificationCenter.current().removeAllDeliveredNotifications()
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MARK: – UNUserNotificationCenterDelegate
    // ─────────────────────────────────────────────────────────────────────────

    // Displays notification banners even when app is in foreground
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        if #available(iOS 14.0, *) {
            completionHandler([.banner, .sound, .badge, .list])
        } else {
            completionHandler([.alert, .sound, .badge])
        }
    }

    // Handles user tapping on notification banner
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping () -> Void
    ) {
        let userInfo = response.notification.request.content.userInfo
        if let route = userInfo["route"] as? String, route.contains("wallet") {
            DispatchQueue.main.async {
                if let scene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
                   let window = scene.windows.first(where: { $0.isKeyWindow }),
                   let rootVC = window.rootViewController {
                    let walletVC = WalletViewController()
                    walletVC.modalPresentationStyle = .fullScreen
                    rootVC.present(walletVC, animated: true, completion: nil)
                }
            }
        }
        completionHandler()
    }
}
