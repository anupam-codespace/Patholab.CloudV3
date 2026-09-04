import UIKit
import UserNotifications

/**
 * MobileNotificationHelper
 * ────────────────────────
 * Manages native iOS push/local system notifications for Welcome, New Patient sync, and Low Balance alerts.
 * Ensures alerts appear on the lock screen and device notification center even when the app is backgrounded or closed.
 * Scoped strictly to the logged-in user with session debouncing.
 */
class MobileNotificationHelper: NSObject, UNUserNotificationCenterDelegate {

    static let shared = MobileNotificationHelper()

    private let userDefaults = UserDefaults.standard

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
     * Schedules a device system Welcome notification to appear after an 8-second delay,
     * restricted to at most once per 24 hours per logged-in user.
     * Strictly without emojis per user specifications.
     */
    func scheduleWelcomeNotification(userName: String, userId: String) {
        let effectiveId = userId.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? "default_user" : userId.trimmingCharacters(in: .whitespacesAndNewlines)
        let welcomeTimestampKey = "last_welcome_ts_\(effectiveId)"
        let lastWelcomeTs = userDefaults.double(forKey: welcomeTimestampKey)
        let now = Date().timeIntervalSince1970

        // 24-hour check: only schedule if 24 hours have elapsed or first login ever
        if now - lastWelcomeTs < 24 * 3600 {
            return
        }

        // Record timestamp immediately to prevent duplicate schedules
        userDefaults.set(now, forKey: welcomeTimestampKey)

        let cleanName = userName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? "Lab Partner" : userName.trimmingCharacters(in: .whitespacesAndNewlines)
        let firstName = cleanName.components(separatedBy: .whitespaces).first ?? cleanName

        let content = UNMutableNotificationContent()
        content.title = "Welcome to PathoLab Cloud"
        content.body = "Welcome, \(firstName). Your laboratory workspace is ready for seamless operations and patient care."
        content.sound = .default
        content.userInfo = ["type": "WELCOME_NOTIFICATION", "userId": effectiveId]

        // Exactly 8 seconds delay
        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: 8.0, repeats: false)
        let request = UNNotificationRequest(identifier: "welcome_notification_\(effectiveId)", content: content, trigger: trigger)

        UNUserNotificationCenter.current().add(request) { error in
            if let error = error {
                NSLog("DEBUG: Failed to schedule welcome notification: %@", error.localizedDescription)
            }
        }
    }

    func postWelcomeNotification(userName: String, userId: String) {
        scheduleWelcomeNotification(userName: userName, userId: userId)
    }

    /**
     * Posts a device system notification when a patient is registered through the website
     * or another device, keeping mobile app users synced in real-time.
     */
    func postNewPatientNotification(patientName: String, uhid: String) {
        let cleanName = patientName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? "New Patient" : patientName.trimmingCharacters(in: .whitespacesAndNewlines)
        let cleanUhid = uhid.trimmingCharacters(in: .whitespacesAndNewlines)

        let content = UNMutableNotificationContent()
        content.title = "New Patient Registered"
        content.body = cleanUhid.isEmpty
            ? "Patient \(cleanName) has been added to your laboratory worklist."
            : "Patient \(cleanName) (\(cleanUhid)) has been added to your laboratory worklist."
        content.sound = .default
        content.userInfo = ["type": "NEW_PATIENT_NOTIFICATION", "route": "/workspace/patients"]

        let notifId = "new_patient_\(abs((cleanName + cleanUhid).hashValue))"
        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: 0.5, repeats: false)
        let request = UNNotificationRequest(identifier: notifId, content: content, trigger: trigger)

        UNUserNotificationCenter.current().add(request, withCompletionHandler: nil)
    }

    /**
     * Posts a device system Low Balance / Zero Balance alert notification to iOS Notification Center & Lock Screen.
     * Strictly without emojis as specified.
     */
    func postWalletZeroBalanceNotification(userId: String) {
        let effectiveId = userId.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? "default_user" : userId.trimmingCharacters(in: .whitespacesAndNewlines)
        let lastAlertKey = "last_zero_bal_alert_ts_\(effectiveId)"
        let lastAlertTime = userDefaults.double(forKey: lastAlertKey)
        let now = Date().timeIntervalSince1970

        if now - lastAlertTime < 5.0 {
            return // 5-second debounce
        }

        userDefaults.set(now, forKey: lastAlertKey)

        let content = UNMutableNotificationContent()
        content.title = "Recharge Your Wallet"
        content.body = "Your wallet balance is low. Please recharge your wallet to register new patients."
        content.sound = .default
        content.userInfo = ["type": "LOW_BALANCE_NOTIFICATION", "route": "/workspace/wallet", "userId": effectiveId]

        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: 0.5, repeats: false)
        let request = UNNotificationRequest(identifier: "low_balance_\(effectiveId)", content: content, trigger: trigger)

        UNUserNotificationCenter.current().add(request, withCompletionHandler: nil)
    }

    func postLowBalanceNotification(balance: Double, userId: String) {
        postWalletZeroBalanceNotification(userId: userId)
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
        let route = userInfo["route"] as? String ?? ""

        DispatchQueue.main.async {
            guard let scene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
                  let window = scene.windows.first(where: { $0.isKeyWindow }),
                  let rootVC = window.rootViewController else {
                completionHandler()
                return
            }

            var topVC = rootVC
            while let presented = topVC.presentedViewController {
                topVC = presented
            }

            if route.contains("wallet") {
                let walletVC = WalletViewController()
                walletVC.modalPresentationStyle = .fullScreen
                topVC.present(walletVC, animated: true, completion: nil)
            } else if route.contains("patients") {
                let patVC = PatientWorklistViewController()
                patVC.modalPresentationStyle = .fullScreen
                topVC.present(patVC, animated: true, completion: nil)
            }
        }
        completionHandler()
    }
}
