import UIKit
import Capacitor
import WebKit
import MessageUI

// MARK: – MainViewController
// Architecture: Subclass CAPBridgeViewController directly for maximum stability.
// Bottom navigation, More section, and Offline overlays are added as native subviews.
class MainViewController: CAPBridgeViewController, MoreViewControllerDelegate, UIAdaptivePresentationControllerDelegate {

    // MARK: – Native overlay elements
    private let topLayoutContainer = UIStackView()
    private let topHeaderBar       = UIView()
    private let headerBorder       = UIView()
    
    // Header Content
    private let menuButton         = UIButton(type: .custom)
    private let headerSubtitleLabel = UILabel()
    private let headerTitleLabel    = UILabel()
    
    // Action Buttons
    private let notificationButton = UIButton(type: .custom)
    private let themeButton        = UIButton(type: .custom)
    private let supportButton      = UIButton(type: .custom)
    
    // Wallet Banner Views
    private let walletCardView     = UIView()
    private let walletWrapper      = UIView()
    private let walletIconBg       = UIView()
    private let walletIconView     = UIImageView()
    private let txtWalletBalance   = UILabel()
    private let txtWalletStatus    = UILabel()
    private let btnTopUp           = UIButton(type: .system)
    private let walletChevron      = UIImageView()
    
    // Header Blur & Gradient Background Views
    private let headerBlurContainer  = UIView()
    private let headerBlurEffectView = UIVisualEffectView()
    private let headerGradientLayer  = CAGradientLayer()
    private let headerMaskLayer      = CAGradientLayer()
    
    private let bottomNavBar       = UIView()
    private let bottomBorder       = UIView()
    private let navStack           = UIStackView()
    private let moreVC             = MoreViewController()
    private let offlineView        = UIView()
    private let skeletonView       = UIView()
    private let notificationBadge  = UILabel()
    
    // MARK: – Native Home Screen
    private let homeNativeView     = HomeNativeView()

    // MARK: – Constraints updated for dynamic safe area
    private var bottomNavHeightConstraint: NSLayoutConstraint!
    private var walletCardHeightConstraint: NSLayoutConstraint!

    // MARK: – State
    private let baseUrl      = "https://app.patholab.cloud"
    private var currentPath: String? = nil   // dedup — skip reload if already on same path
    private var selectedTab  = 0             // 0=Dashboard 1=Patients 2=Categories 3=More
    private var previousTab  = 0
    private var isDarkMode   = false
    private var activeSkeletonPath: String? = nil
    private var skeletonTimeoutTimer: Timer? = nil
    private var walletTimer: Timer? = nil
    private var bellAnimationTimer: Timer? = nil
    private var progressPollTimer: Timer? = nil
    private var controllerLaunchTime = Date()

    // ─────────────────────────────────────────────────────────────────────────
    // MARK: – Lifecycle
    // ─────────────────────────────────────────────────────────────────────────

    override func viewDidLoad() {
        super.viewDidLoad() // This initializes the Capacitor bridge and the webView
        
        view.backgroundColor = .white

        // Initialize persisted theme state immediately
        let savedDark = UserDefaults.standard.bool(forKey: "is_dark_mode")
        if savedDark {
            self.isDarkMode = true
            self.applyNativeTheme(isDark: true)
        }

        buildTopLayoutContainer() // 0. Stack view enclosing Header + Wallet Card
        buildBottomNavBar()       // 1. Native bottom nav pinned above safe area
        buildOfflineView()        // 2. Offline overlay (hidden by default)
        buildSkeletonView()       // 2b. Full screen skeleton loading screen (hidden by default)
        embedMoreViewController() // 3. More panel (hidden by default)
        buildHomeNativeView()     // 4. Native Home Dashboard screen

        view.bringSubviewToFront(topLayoutContainer)
        view.bringSubviewToFront(bottomNavBar)
        view.bringSubviewToFront(skeletonView)
        view.bringSubviewToFront(offlineView)

        // Custom User Agent setup to inject CapacitorApp dynamically to hide web header
        if let webView = self.webView {
            webView.evaluateJavaScript("navigator.userAgent") { [weak webView] (result, error) in
                if let defaultUA = result as? String {
                    webView?.customUserAgent = defaultUA + " CapacitorApp"
                }
            }
            
            // Unconditionally hide web header elements, enforce active theme, and inject auth session cookie immediately at document start
            let isDarkTheme = self.isDarkMode
            let token = KeychainManager.read(forKey: KeychainManager.tokenKey) ?? ""
            let js = """
            (function() {
                try {
                    var token = "\(token)";
                    if (token && token.length > 0) {
                        document.cookie = "token=" + encodeURIComponent(token) + "; path=/; domain=app.patholab.cloud; max-age=2592000; SameSite=Lax; Secure";
                        document.cookie = "token=" + encodeURIComponent(token) + "; path=/; max-age=2592000; SameSite=Lax; Secure";
                    }
                } catch(e) {}
                try {
                    var isDark = \(isDarkTheme ? "true" : "false");
                    var saved = localStorage.getItem('theme');
                    if (saved === 'dark' || (saved === null && isDark)) {
                        document.documentElement.classList.add('dark');
                        localStorage.setItem('theme', 'dark');
                    } else if (saved === 'light') {
                        document.documentElement.classList.remove('dark');
                    }
                } catch (e) {}

                var css = 'html { -webkit-text-size-adjust: 100%; touch-action: pan-x pan-y pinch-zoom; scroll-behavior: smooth; } html, body { padding-top: 0 !important; margin-top: 0 !important; -webkit-overflow-scrolling: touch !important; overscroll-behavior-y: none !important; -webkit-tap-highlight-color: transparent !important; } .mobile-app-header-web-component, header, .sticky.top-0 { display: none !important; } main, .is-native-app main, .is-capacitor main { padding-top: 0px !important; margin-top: 0px !important; padding-bottom: 84px !important; min-height: 100%; -webkit-overflow-scrolling: touch; } .overflow-x-auto { -webkit-overflow-scrolling: touch !important; overscroll-behavior-x: contain !important; touch-action: pan-x pan-y !important; scrollbar-width: none !important; } .overflow-x-auto::-webkit-scrollbar { display: none !important; }';
                var style = document.createElement('style');
                style.innerHTML = css;
                if (document.head) {
                    document.head.appendChild(style);
                } else {
                    document.addEventListener('DOMContentLoaded', function() {
                        document.head.appendChild(style);
                    });
                }
            })();
            """
            let script = WKUserScript(source: js, injectionTime: .atDocumentStart, forMainFrameOnly: true)
            webView.configuration.userContentController.addUserScript(script)

            webView.scrollView.contentInsetAdjustmentBehavior = .never
            webView.scrollView.contentInset = .zero
            webView.scrollView.scrollIndicatorInsets = .zero
            webView.scrollView.decelerationRate = .normal
            webView.scrollView.bounces = true
            webView.scrollView.alwaysBounceVertical = true
            webView.scrollView.showsVerticalScrollIndicator = false
            webView.scrollView.showsHorizontalScrollIndicator = false
            webView.scrollView.delaysContentTouches = false
            webView.scrollView.canCancelContentTouches = true
            webView.allowsBackForwardNavigationGestures = true
            webView.addObserver(self, forKeyPath: "URL", options: .new, context: nil)
            webView.addObserver(self, forKeyPath: "estimatedProgress", options: .new, context: nil)
        }

        // Navigate to dashboard once layout is ready
        DispatchQueue.main.async {
            self.selectTab(0)
            
            // Polling timer to monitor page load state and React-Query loading spinner state
            self.progressPollTimer = Timer.scheduledTimer(withTimeInterval: 0.1, repeats: true) { [weak self] _ in
                self?.checkWebViewProgress()
            }
            
            // Polling timer to sync theme with web view class state
            Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] _ in
                guard let self = self, let webView = self.webView else { return }
                webView.evaluateJavaScript("document.documentElement.classList.contains('dark')") { (result, error) in
                    if let isDark = result as? Bool {
                        DispatchQueue.main.async {
                            self.applyNativeTheme(isDark: isDark)
                        }
                    }
                }
            }
        }
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        startWalletPolling()
    }

    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        stopWalletPolling()
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        
        let topY = topLayoutContainer.frame.maxY
        let bottomY = bottomNavBar.frame.minY > 0 ? bottomNavBar.frame.minY : view.bounds.height
        let targetFrame = CGRect(x: 0, y: topY, width: view.bounds.width, height: max(0, bottomY - topY))
        if let webView = self.webView, webView.frame != targetFrame {
            webView.frame = targetFrame
        }

        CATransaction.begin()
        CATransaction.setDisableActions(true)
        headerBlurEffectView.frame = headerBlurContainer.bounds
        headerGradientLayer.frame  = headerBlurContainer.bounds
        headerMaskLayer.frame      = headerBlurContainer.bounds
        CATransaction.commit()
    }

    override func viewSafeAreaInsetsDidChange() {
        super.viewSafeAreaInsetsDidChange()
        bottomNavHeightConstraint.constant = 56 + view.safeAreaInsets.bottom
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MARK: – Wallet Polling & Details Fetch
    // ─────────────────────────────────────────────────────────────────────────

    private func startWalletPolling() {
        stopWalletPolling()
        walletTimer = Timer.scheduledTimer(withTimeInterval: 15.0, repeats: true) { [weak self] _ in
            self?.fetchWalletDetails()
            self?.fetchNotificationCount()
        }
        fetchWalletDetails()
        fetchNotificationCount()
    }

    private func stopWalletPolling() {
        walletTimer?.invalidate()
        walletTimer = nil
        stopBellAnimationLoop()
    }

    private func fetchWalletDetails() {
        if let token = KeychainManager.read(forKey: KeychainManager.tokenKey), !token.isEmpty {
            self.executeWalletFetch(token: token)
        } else {
            WKWebsiteDataStore.default().httpCookieStore.getAllCookies { [weak self] cookies in
                guard let self = self else { return }
                if let cookie = cookies.first(where: { $0.name == "token" && !$0.value.isEmpty }) {
                    KeychainManager.save(cookie.value, forKey: KeychainManager.tokenKey)
                    self.executeWalletFetch(token: cookie.value)
                } else {
                    self.webView?.evaluateJavaScript("document.cookie") { result, _ in
                        if let cookieStr = result as? String {
                            for part in cookieStr.components(separatedBy: ";") {
                                let pair = part.trimmingCharacters(in: .whitespaces).components(separatedBy: "=")
                                if pair.count >= 2 && pair[0] == "token" && !pair[1].isEmpty {
                                    let val = pair[1]
                                    KeychainManager.save(val, forKey: KeychainManager.tokenKey)
                                    self.executeWalletFetch(token: val)
                                    return
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    private func executeWalletFetch(token: String) {
        let url = URL(string: "https://app.patholab.cloud/api/workspace/wallet/details")!
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.setValue("token=\(token)", forHTTPHeaderField: "Cookie")

        let task = URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            guard let self = self, let data = data, error == nil else { return }

            do {
                if let json = try JSONSerialization.jsonObject(with: data, options: []) as? [String: Any] {
                    let role = json["role"] as? String ?? ""
                    let isOwner = role == "LAB_OWNER" || role == "ADMIN" || role.isEmpty

                    if let wallet = json["wallet"] as? [String: Any],
                       let balanceValue = wallet["balance"] {
                        let balance: Double
                        if let d = balanceValue as? Double {
                            balance = d
                        } else if let s = balanceValue as? String, let d = Double(s) {
                            balance = d
                        } else {
                            balance = 0.0
                        }

                        DispatchQueue.main.async {
                            self.updateWalletCard(balance: balance, isOwner: isOwner)
                        }
                    }
                }
            } catch {
                print("Failed to decode wallet balance: \(error)")
            }
        }
        task.resume()
    }

    private func updateWalletCard(balance: Double, isOwner: Bool) {
        guard isOwner else {
            walletCardView.isHidden = true
            return
        }

        walletCardView.isHidden = false
        let formatted = String(format: "₹%.2f", balance)
        if txtWalletBalance.text != formatted {
            UIView.transition(with: txtWalletBalance, duration: 0.2, options: .transitionCrossDissolve, animations: {
                self.txtWalletBalance.text = formatted
            }, completion: nil)
        }

        let statusText: String
        let statusColor: UIColor
        
        if balance <= 20.0 {
            statusText = "●  LOW BALANCE • ADD FUNDS"
            statusColor = UIColor(red: 239/255, green: 68/255, blue: 68/255, alpha: 1) // red-500
        } else if balance <= 75.0 {
            statusText = "●  LOW BALANCE • ADD FUNDS"
            statusColor = UIColor(red: 249/255, green: 115/255, blue: 22/255, alpha: 1) // orange-500 (#F97316)
        } else {
            statusText = "●  ACTIVE • FUNDED"
            statusColor = UIColor(red: 16/255, green: 185/255, blue: 129/255, alpha: 1) // emerald-500
        }
        
        txtWalletStatus.text = statusText
        txtWalletStatus.textColor = statusColor
        walletWrapper.layer.borderColor = UIColor(red: 51/255, green: 65/255, blue: 85/255, alpha: 1).cgColor
        
        // Top Up button only appears when wallet balance is less than 49 rupees
        let showTopUp = balance < 49.0
        btnTopUp.isHidden = !showTopUp
        walletChevron.isHidden = showTopUp
        
        view.setNeedsLayout()
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MARK: – Bottom Navigation Bar
    // ─────────────────────────────────────────────────────────────────────────

    private func buildBottomNavBar() {
        // ── Floating Glassmorphic Pill Container
        bottomNavBar.backgroundColor    = .white
        bottomNavBar.layer.cornerRadius = 33
        bottomNavBar.layer.shadowColor   = UIColor.black.cgColor
        bottomNavBar.layer.shadowOpacity = 0.10
        bottomNavBar.layer.shadowRadius  = 16
        bottomNavBar.layer.shadowOffset  = CGSize(width: 0, height: 8)
        bottomNavBar.layer.borderWidth   = 1.5
        bottomNavBar.layer.borderColor   = UIColor(red: 0.945, green: 0.961, blue: 0.976, alpha: 1).cgColor
        bottomNavBar.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(bottomNavBar)

        // ── Items stack
        navStack.axis        = .horizontal
        navStack.distribution = .fillEqually
        navStack.alignment    = .center
        navStack.translatesAutoresizingMaskIntoConstraints = false
        bottomNavBar.addSubview(navStack)

        // Tabs: Home, Patients, Center Action Button, Reports, More
        navStack.addArrangedSubview(makeNavButton(title: "Home", icon: "house.fill", tag: 0))
        navStack.addArrangedSubview(makeNavButton(title: "Patients", icon: "person.2.fill", tag: 1))
        navStack.addArrangedSubview(makeCenterActionButton())
        navStack.addArrangedSubview(makeNavButton(title: "Reports", icon: "doc.text.fill", tag: 2))
        navStack.addArrangedSubview(makeNavButton(title: "More", icon: "square.grid.2x2.fill", tag: 3))

        NSLayoutConstraint.activate([
            bottomNavBar.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 16),
            bottomNavBar.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -16),
            bottomNavBar.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -10),
            bottomNavBar.heightAnchor.constraint(equalToConstant: 66),

            navStack.topAnchor.constraint(equalTo: bottomNavBar.topAnchor),
            navStack.bottomAnchor.constraint(equalTo: bottomNavBar.bottomAnchor),
            navStack.leadingAnchor.constraint(equalTo: bottomNavBar.leadingAnchor, constant: 4),
            navStack.trailingAnchor.constraint(equalTo: bottomNavBar.trailingAnchor, constant: -4)
        ])
    }

    private func makeCenterActionButton() -> UIView {
        let container = UIView()
        container.translatesAutoresizingMaskIntoConstraints = false

        let circle = UIButton(type: .custom)
        circle.backgroundColor = UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1) // #0D6EFD
        circle.layer.cornerRadius = 24
        circle.layer.shadowColor = UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1).cgColor
        circle.layer.shadowOpacity = 0.45
        circle.layer.shadowRadius = 10
        circle.layer.shadowOffset = CGSize(width: 0, height: 4)
        circle.layer.borderWidth = 2
        circle.layer.borderColor = UIColor.white.withAlphaComponent(0.3).cgColor
        circle.setImage(UIImage(systemName: "creditcard.fill"), for: .normal)
        circle.tintColor = .white
        circle.tag = 99
        circle.addTarget(self, action: #selector(centerActionTapped(_:)), for: .touchUpInside)
        circle.translatesAutoresizingMaskIntoConstraints = false

        container.addSubview(circle)
        NSLayoutConstraint.activate([
            circle.widthAnchor.constraint(equalToConstant: 48),
            circle.heightAnchor.constraint(equalToConstant: 48),
            circle.centerXAnchor.constraint(equalTo: container.centerXAnchor),
            circle.centerYAnchor.constraint(equalTo: container.centerYAnchor)
        ])

        return container
    }

    @objc private func centerActionTapped(_ sender: UIButton) {
        sender.transform = CGAffineTransform(scaleX: 0.85, y: 0.85)
        UIView.animate(withDuration: 0.25, delay: 0, usingSpringWithDamping: 0.5, initialSpringVelocity: 0.8, options: .curveEaseOut) {
            sender.transform = .identity
        }
        let walletVC = WalletViewController()
        walletVC.modalPresentationStyle = .fullScreen
        present(walletVC, animated: true, completion: nil)
    }

    private func makeNavButton(title: String, icon: String, tag: Int) -> UIButton {
        let btn = UIButton(type: .custom)
        var cfg = UIButton.Configuration.plain()
        cfg.image            = UIImage(systemName: icon)
        cfg.title            = title
        cfg.imagePlacement   = .top
        cfg.imagePadding     = 3
        cfg.baseForegroundColor = UIColor(red: 0.580, green: 0.639, blue: 0.722, alpha: 1)
        if #available(iOS 15, *) {
            cfg.titleTextAttributesTransformer = UIConfigurationTextAttributesTransformer { attr in
                var a = attr; a.font = UIFont.systemFont(ofSize: 10, weight: .semibold); return a
            }
        }
        btn.configuration = cfg
        btn.tag = tag
        btn.addTarget(self, action: #selector(navTapped(_:)), for: .touchUpInside)
        return btn
    }

    private func updateNavTints() {
        navStack.arrangedSubviews.compactMap({ $0 as? UIButton }).forEach { btn in
            let active = btn.tag == selectedTab
            let color: UIColor
            if active {
                color = isDarkMode ? UIColor(red: 129/255, green: 140/255, blue: 248/255, alpha: 1) : UIColor(red: 13/255, green: 110/255, blue: 253/255, alpha: 1)
            } else {
                color = isDarkMode ? UIColor(red: 148/255, green: 163/255, blue: 184/255, alpha: 1) : UIColor(red: 148/255, green: 163/255, blue: 184/255, alpha: 1)
            }
            btn.tintColor = color
            btn.setTitleColor(color, for: .normal)
            if var cfg = btn.configuration {
                cfg.baseForegroundColor = color
                btn.configuration = cfg
            }
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MARK: – More Panel
    // ─────────────────────────────────────────────────────────────────────────

    private func embedMoreViewController() {
        moreVC.delegate = self
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MARK: – Offline View
    // ─────────────────────────────────────────────────────────────────────────

    private func buildOfflineView() {
        offlineView.backgroundColor = UIColor(red: 248/255, green: 250/255, blue: 252/255, alpha: 1)
        offlineView.isHidden = true
        offlineView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(offlineView)

        NSLayoutConstraint.activate([
            offlineView.topAnchor.constraint(equalTo: topLayoutContainer.bottomAnchor),
            offlineView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            offlineView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            offlineView.bottomAnchor.constraint(equalTo: bottomNavBar.topAnchor)
        ])

        let icon  = UILabel(); icon.text = "📡"; icon.font = .systemFont(ofSize: 48)
        let title = UILabel(); title.text = "No Connection"; title.font = .boldSystemFont(ofSize: 20); title.textColor = UIColor(red: 15/255, green: 23/255, blue: 42/255, alpha: 1)
        let sub   = UILabel(); sub.text = "Check your internet and try again."; sub.font = .systemFont(ofSize: 14); sub.textColor = .gray; sub.textAlignment = .center; sub.numberOfLines = 2

        let retry = UIButton(type: .system)
        retry.setTitle("Retry", for: .normal)
        retry.setTitleColor(.white, for: .normal)
        retry.backgroundColor = UIColor(red: 55/255, green: 48/255, blue: 163/255, alpha: 1)
        retry.titleLabel?.font = .boldSystemFont(ofSize: 16)
        retry.layer.cornerRadius = 12
        retry.addTarget(self, action: #selector(retryLoad), for: .touchUpInside)

        let stack = UIStackView(arrangedSubviews: [icon, title, sub, retry])
        stack.axis = .vertical; stack.spacing = 12; stack.alignment = .center
        stack.translatesAutoresizingMaskIntoConstraints = false
        offlineView.addSubview(stack)

        NSLayoutConstraint.activate([
            stack.centerXAnchor.constraint(equalTo: offlineView.centerXAnchor),
            stack.centerYAnchor.constraint(equalTo: offlineView.centerYAnchor, constant: -20),
            stack.leadingAnchor.constraint(equalTo: offlineView.leadingAnchor, constant: 32),
            stack.trailingAnchor.constraint(equalTo: offlineView.trailingAnchor, constant: -32),
            retry.widthAnchor.constraint(equalToConstant: 140),
            retry.heightAnchor.constraint(equalToConstant: 48)
        ])
    }

    @objc private func retryLoad() {
        offlineView.isHidden = true
        currentPath = nil
        loadUrl(path: "/workspace/analytics")
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MARK: – Navigation
    // ─────────────────────────────────────────────────────────────────────────

    @objc private func navTapped(_ sender: UIButton) {
        AppHaptics.selection()
        // Subtle selection scale pop animation for premium micro-feedback
        UIView.animate(withDuration: 0.12, animations: {
            sender.transform = CGAffineTransform(scaleX: 1.1, y: 1.1)
        }) { _ in
            UIView.animate(withDuration: 0.12) {
                sender.transform = .identity
            }
        }
        selectTab(sender.tag)
    }

    private func selectTab(_ tag: Int) {
        if tag != 3 {
            previousTab = tag
        }
        selectedTab = tag
        updateNavTints()

        switch tag {
        case 0:
            showNativeHome()
        case 1:
            homeNativeView.isHidden = true
            topLayoutContainer.isHidden = false
            headerBlurContainer.isHidden = false
            headerTitleLabel.text = "PATIENT WORKLIST"
            showWeb(path: "/workspace/patients")
        case 2:
            homeNativeView.isHidden = true
            topLayoutContainer.isHidden = false
            headerBlurContainer.isHidden = false
            headerTitleLabel.text = "REPORTS & ANALYTICS"
            showWeb(path: "/workspace/reports")
        case 3:
            showMorePanel()
        default:
            break
        }
    }

    private func buildHomeNativeView() {
        homeNativeView.translatesAutoresizingMaskIntoConstraints = false
        homeNativeView.isHidden = true
        view.addSubview(homeNativeView)

        NSLayoutConstraint.activate([
            homeNativeView.topAnchor.constraint(equalTo: view.topAnchor),
            homeNativeView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            homeNativeView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            homeNativeView.bottomAnchor.constraint(equalTo: bottomNavBar.topAnchor)
        ])

        homeNativeView.onNavigate = { [weak self] path in
            guard let self = self else { return }
            if path == "/workspace/settings" {
                let settingsVC = ProfileSettingsViewController()
                let nav = UINavigationController(rootViewController: settingsVC)
                nav.modalPresentationStyle = .fullScreen
                self.present(nav, animated: true, completion: nil)
                return
            }
            if path == "/workspace/wallet" || path.starts(with: "/workspace/wallet") {
                let walletVC = WalletViewController()
                walletVC.modalPresentationStyle = .fullScreen
                self.present(walletVC, animated: true, completion: nil)
                return
            }
            if path == "/workspace/registration" || path.starts(with: "/workspace/registration") || path == "/workspace/patients/new" {
                let regVC = RegistrationViewController()
                regVC.modalPresentationStyle = .fullScreen
                self.present(regVC, animated: true, completion: nil)
                return
            }
            self.showWebView(navigatingTo: path)
        }

        homeNativeView.onSignOut = {
            if let appDelegate = UIApplication.shared.delegate as? AppDelegate {
                appDelegate.signOut()
            }
        }
    }

    private func showNativeHome() {
        homeNativeView.isHidden = false
        view.bringSubviewToFront(homeNativeView)
        view.bringSubviewToFront(bottomNavBar)
        topLayoutContainer.isHidden = true
        headerBlurContainer.isHidden = true
        skeletonView.isHidden = true
        offlineView.isHidden = true
        homeNativeView.fetchWalletBalance()
        homeNativeView.fetchTodaysWorklist()
    }

    private func showWebView(navigatingTo path: String) {
        homeNativeView.isHidden = true
        topLayoutContainer.isHidden = false
        headerBlurContainer.isHidden = false
        loadUrl(path: path)
    }

    private func showWeb(path: String) {
        offlineView.isHidden  = true
        loadUrl(path: path)
    }

    private func showMorePanel() {
        offlineView.isHidden  = true
        
        if #available(iOS 16.0, *) {
            moreVC.modalPresentationStyle = .pageSheet
            if let sheet = moreVC.sheetPresentationController {
                sheet.detents = [.custom { context in
                    return context.maximumDetentValue * 0.8
                }]
                sheet.prefersGrabberVisible = true
                sheet.preferredCornerRadius = 24
            }
        } else if #available(iOS 15.0, *) {
            moreVC.modalPresentationStyle = .pageSheet
            if let sheet = moreVC.sheetPresentationController {
                sheet.detents = [.medium(), .large()]
                sheet.prefersGrabberVisible = true
            }
        } else {
            moreVC.modalPresentationStyle = .formSheet
        }
        moreVC.presentationController?.delegate = self
        present(moreVC, animated: true, completion: nil)
    }

    private func loadUrl(path: String) {
        guard let webView = self.webView else { return }
        headerTitleLabel.text = getHeaderTitle(for: path)
        if path == currentPath { return }
        currentPath = path
        showSkeleton(for: path)

        let token = KeychainManager.read(forKey: KeychainManager.tokenKey)
        if let token = token, !token.isEmpty {
            AuthService.injectCookieIntoWebView(token: token)
        }
        if let url = URL(string: baseUrl + path) {
            var req = URLRequest(url: url)
            if let token = token, !token.isEmpty {
                req.setValue("token=\(token)", forHTTPHeaderField: "Cookie")
            }
            webView.load(req)
        }
        fetchWalletDetails()
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MARK: – MoreViewControllerDelegate
    // ─────────────────────────────────────────────────────────────────────────

    func didSelectModule(path: String) {
        moreVC.dismiss(animated: true) { [weak self] in
            guard let self = self else { return }
            if path == "/legal" || path.contains("terms") || path.contains("privacy") || path.contains("refund") {
                var urlString = "https://patholab.cloud/terms-conditions"
                if path.contains("privacy") {
                    urlString = "https://patholab.cloud/terms-conditions?tab=privacy"
                } else if path.contains("refund") {
                    urlString = "https://patholab.cloud/terms-conditions?tab=refunds"
                } else if path.contains("terms") {
                    urlString = "https://patholab.cloud/terms-conditions?tab=terms"
                }
                if let url = URL(string: urlString) {
                    UIApplication.shared.open(url, options: [:], completionHandler: nil)
                }
            } else {
                self.currentPath = nil          // force reload even if same path
                self.selectedTab = 0
                self.updateNavTints()
                self.showWeb(path: path)
            }
        }
    }

    func didTapSignOut() {
        moreVC.dismiss(animated: true) {
            guard let app = UIApplication.shared.delegate as? AppDelegate else { return }
            app.signOut()
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MARK: – Top Layout Container & Blurred Gradient Construction
    // ─────────────────────────────────────────────────────────────────────────

    private func buildTopLayoutContainer() {
        topLayoutContainer.axis = .vertical
        topLayoutContainer.distribution = .fill
        topLayoutContainer.alignment = .fill
        topLayoutContainer.spacing = 0
        topLayoutContainer.backgroundColor = .clear
        topLayoutContainer.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(topLayoutContainer)

        NSLayoutConstraint.activate([
            topLayoutContainer.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            topLayoutContainer.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            topLayoutContainer.trailingAnchor.constraint(equalTo: view.trailingAnchor)
        ])

        buildTopHeaderBar()
        buildWalletCardView()
        buildHeaderBlurBackground()
    }

    private func buildHeaderBlurBackground() {
        headerBlurContainer.translatesAutoresizingMaskIntoConstraints = false
        headerBlurContainer.clipsToBounds = true
        headerBlurContainer.backgroundColor = .clear
        headerBlurContainer.isUserInteractionEnabled = false
        view.insertSubview(headerBlurContainer, belowSubview: topLayoutContainer)

        let blurStyle: UIBlurEffect.Style = isDarkMode ? .systemUltraThinMaterialDark : .systemUltraThinMaterialLight
        headerBlurEffectView.effect = UIBlurEffect(style: blurStyle)
        headerBlurEffectView.translatesAutoresizingMaskIntoConstraints = false
        headerBlurEffectView.isUserInteractionEnabled = false
        headerBlurContainer.addSubview(headerBlurEffectView)

        NSLayoutConstraint.activate([
            headerBlurEffectView.topAnchor.constraint(equalTo: headerBlurContainer.topAnchor),
            headerBlurEffectView.leadingAnchor.constraint(equalTo: headerBlurContainer.leadingAnchor),
            headerBlurEffectView.trailingAnchor.constraint(equalTo: headerBlurContainer.trailingAnchor),
            headerBlurEffectView.bottomAnchor.constraint(equalTo: headerBlurContainer.bottomAnchor)
        ])

        // Subtle gradient overlay
        updateHeaderGradientColors()
        headerBlurContainer.layer.addSublayer(headerGradientLayer)

        // Alpha mask to softly fade out the blur halfway over the wallet box
        headerMaskLayer.colors = [
            UIColor.black.cgColor,
            UIColor.black.withAlphaComponent(0.96).cgColor,
            UIColor.black.withAlphaComponent(0.50).cgColor,
            UIColor.clear.cgColor
        ]
        headerMaskLayer.locations = [0.0, 0.55, 0.82, 1.0]
        headerBlurContainer.layer.mask = headerMaskLayer

        // Constraints: spans from the absolute top of the screen (view.topAnchor)
        // down to approximately halfway over the wallet box (walletWrapper.centerYAnchor)
        NSLayoutConstraint.activate([
            headerBlurContainer.topAnchor.constraint(equalTo: view.topAnchor),
            headerBlurContainer.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            headerBlurContainer.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            headerBlurContainer.bottomAnchor.constraint(equalTo: walletWrapper.centerYAnchor)
        ])
    }

    private func updateHeaderGradientColors() {
        let isDark = self.isDarkMode
        if isDark {
            headerGradientLayer.colors = [
                UIColor(red: 15/255, green: 23/255, blue: 42/255, alpha: 0.95).cgColor,
                UIColor(red: 15/255, green: 23/255, blue: 42/255, alpha: 0.85).cgColor,
                UIColor(red: 15/255, green: 23/255, blue: 42/255, alpha: 0.40).cgColor,
                UIColor(red: 15/255, green: 23/255, blue: 42/255, alpha: 0.0).cgColor
            ]
        } else {
            headerGradientLayer.colors = [
                UIColor.white.withAlphaComponent(0.96).cgColor,
                UIColor.white.withAlphaComponent(0.88).cgColor,
                UIColor.white.withAlphaComponent(0.40).cgColor,
                UIColor.white.withAlphaComponent(0.0).cgColor
            ]
        }
        headerGradientLayer.locations = [0.0, 0.55, 0.82, 1.0]
    }

    private func buildTopHeaderBar() {
        topHeaderBar.backgroundColor = .clear
        topHeaderBar.translatesAutoresizingMaskIntoConstraints = false
        topHeaderBar.heightAnchor.constraint(equalToConstant: 56).isActive = true
        topLayoutContainer.addArrangedSubview(topHeaderBar)

        headerBorder.backgroundColor = UIColor(white: 0.0, alpha: 0.04)
        headerBorder.translatesAutoresizingMaskIntoConstraints = false
        topHeaderBar.addSubview(headerBorder)

        // Menu button (•••) — clean transparent icon button
        let menuConfig = UIImage.SymbolConfiguration(pointSize: 15, weight: .semibold)
        let menuImage = UIImage(systemName: "ellipsis", withConfiguration: menuConfig)
        menuButton.setImage(menuImage, for: .normal)
        menuButton.tintColor = UIColor(red: 71/255, green: 85/255, blue: 105/255, alpha: 1)
        menuButton.backgroundColor = .clear
        menuButton.layer.cornerRadius = 0
        menuButton.layer.masksToBounds = false
        menuButton.translatesAutoresizingMaskIntoConstraints = false
        menuButton.addTarget(self, action: #selector(menuButtonTapped), for: .touchUpInside)
        topHeaderBar.addSubview(menuButton)

        // Subtitle & Title labels
        headerSubtitleLabel.text = "Main Branch"
        headerSubtitleLabel.font = .systemFont(ofSize: 9.5, weight: .semibold)
        headerSubtitleLabel.textColor = UIColor(red: 148/255, green: 163/255, blue: 184/255, alpha: 1)
        headerSubtitleLabel.adjustsFontSizeToFitWidth = true
        headerSubtitleLabel.minimumScaleFactor = 0.75
        headerSubtitleLabel.translatesAutoresizingMaskIntoConstraints = false
        topHeaderBar.addSubview(headerSubtitleLabel)

        headerTitleLabel.text = "Financial Analytics"
        headerTitleLabel.font = .systemFont(ofSize: 15.5, weight: .semibold)
        headerTitleLabel.textColor = UIColor(red: 15/255, green: 23/255, blue: 42/255, alpha: 1)
        headerTitleLabel.adjustsFontSizeToFitWidth = true
        headerTitleLabel.minimumScaleFactor = 0.75
        headerTitleLabel.translatesAutoresizingMaskIntoConstraints = false
        topHeaderBar.addSubview(headerTitleLabel)

        // Support help button
        let supportConfig = UIImage.SymbolConfiguration(pointSize: 17, weight: .medium)
        let supportImage = UIImage(systemName: "questionmark.circle", withConfiguration: supportConfig)
        supportButton.setImage(supportImage, for: .normal)
        supportButton.tintColor = UIColor(red: 71/255, green: 85/255, blue: 105/255, alpha: 1)
        supportButton.backgroundColor = .clear
        supportButton.translatesAutoresizingMaskIntoConstraints = false
        supportButton.addTarget(self, action: #selector(headerSupportTapped), for: .touchUpInside)
        topHeaderBar.addSubview(supportButton)

        // Theme switch button
        let themeConfig = UIImage.SymbolConfiguration(pointSize: 17, weight: .medium)
        let themeImage = UIImage(systemName: "sun.max", withConfiguration: themeConfig)
        themeButton.setImage(themeImage, for: .normal)
        themeButton.tintColor = UIColor(red: 71/255, green: 85/255, blue: 105/255, alpha: 1)
        themeButton.backgroundColor = .clear
        themeButton.translatesAutoresizingMaskIntoConstraints = false
        themeButton.addTarget(self, action: #selector(headerThemeTapped), for: .touchUpInside)
        topHeaderBar.addSubview(themeButton)

        // Notification bell button — clean transparent icon button
        let bellConfig = UIImage.SymbolConfiguration(pointSize: 17, weight: .medium)
        let bellImage = UIImage(systemName: "bell", withConfiguration: bellConfig)
        notificationButton.setImage(bellImage, for: .normal)
        notificationButton.tintColor = UIColor(red: 71/255, green: 85/255, blue: 105/255, alpha: 1)
        notificationButton.backgroundColor = .clear
        notificationButton.layer.cornerRadius = 0
        notificationButton.layer.masksToBounds = false
        
        // Notification Badge setup
        notificationBadge.backgroundColor = UIColor(red: 239/255, green: 68/255, blue: 68/255, alpha: 1)
        notificationBadge.textColor = .white
        notificationBadge.font = .systemFont(ofSize: 8, weight: .bold)
        notificationBadge.textAlignment = .center
        notificationBadge.layer.cornerRadius = 7.5
        notificationBadge.layer.masksToBounds = true
        notificationBadge.isHidden = true
        notificationBadge.translatesAutoresizingMaskIntoConstraints = false
        notificationButton.addSubview(notificationBadge)
        
        notificationButton.translatesAutoresizingMaskIntoConstraints = false
        notificationButton.addTarget(self, action: #selector(headerNotificationTapped), for: .touchUpInside)
        topHeaderBar.addSubview(notificationButton)

        NSLayoutConstraint.activate([
            headerBorder.leadingAnchor.constraint(equalTo: topHeaderBar.leadingAnchor),
            headerBorder.trailingAnchor.constraint(equalTo: topHeaderBar.trailingAnchor),
            headerBorder.bottomAnchor.constraint(equalTo: topHeaderBar.bottomAnchor),
            headerBorder.heightAnchor.constraint(equalToConstant: 0.5),

            menuButton.leadingAnchor.constraint(equalTo: topHeaderBar.leadingAnchor, constant: 12),
            menuButton.centerYAnchor.constraint(equalTo: topHeaderBar.centerYAnchor),
            menuButton.widthAnchor.constraint(equalToConstant: 34),
            menuButton.heightAnchor.constraint(equalToConstant: 34),

            headerSubtitleLabel.topAnchor.constraint(equalTo: topHeaderBar.topAnchor, constant: 10),
            headerSubtitleLabel.leadingAnchor.constraint(equalTo: menuButton.trailingAnchor, constant: 8),
            headerSubtitleLabel.trailingAnchor.constraint(lessThanOrEqualTo: notificationButton.leadingAnchor, constant: -8),

            headerTitleLabel.topAnchor.constraint(equalTo: headerSubtitleLabel.bottomAnchor, constant: 1),
            headerTitleLabel.leadingAnchor.constraint(equalTo: menuButton.trailingAnchor, constant: 8),
            headerTitleLabel.trailingAnchor.constraint(lessThanOrEqualTo: notificationButton.leadingAnchor, constant: -8),

            supportButton.trailingAnchor.constraint(equalTo: topHeaderBar.trailingAnchor, constant: -12),
            supportButton.centerYAnchor.constraint(equalTo: topHeaderBar.centerYAnchor),
            supportButton.widthAnchor.constraint(equalToConstant: 34),
            supportButton.heightAnchor.constraint(equalToConstant: 34),

            themeButton.trailingAnchor.constraint(equalTo: supportButton.leadingAnchor, constant: -4),
            themeButton.centerYAnchor.constraint(equalTo: topHeaderBar.centerYAnchor),
            themeButton.widthAnchor.constraint(equalToConstant: 34),
            themeButton.heightAnchor.constraint(equalToConstant: 34),

            notificationButton.trailingAnchor.constraint(equalTo: themeButton.leadingAnchor, constant: -4),
            notificationButton.centerYAnchor.constraint(equalTo: topHeaderBar.centerYAnchor),
            notificationButton.widthAnchor.constraint(equalToConstant: 34),
            notificationButton.heightAnchor.constraint(equalToConstant: 34),

            notificationBadge.topAnchor.constraint(equalTo: notificationButton.topAnchor, constant: 1),
            notificationBadge.trailingAnchor.constraint(equalTo: notificationButton.trailingAnchor, constant: -1),
            notificationBadge.heightAnchor.constraint(equalToConstant: 15),
            notificationBadge.widthAnchor.constraint(greaterThanOrEqualToConstant: 15)
        ])
    }

    private func buildWalletCardView() {
        walletCardView.clipsToBounds = false
        walletCardView.backgroundColor = .clear
        walletCardView.translatesAutoresizingMaskIntoConstraints = false
        walletCardView.isHidden = true // Hidden by default, dynamically displayed for LAB_OWNER
        
        walletWrapper.translatesAutoresizingMaskIntoConstraints = false
        walletWrapper.backgroundColor = isDarkMode ? UIColor(red: 15/255, green: 23/255, blue: 42/255, alpha: 1) : UIColor(red: 17/255, green: 24/255, blue: 39/255, alpha: 1)
        walletWrapper.layer.cornerRadius = 27
        walletWrapper.layer.borderWidth = 1.5
        walletWrapper.layer.borderColor = UIColor(red: 51/255, green: 65/255, blue: 85/255, alpha: 1).cgColor
        walletWrapper.layer.shadowColor = UIColor.black.cgColor
        walletWrapper.layer.shadowOpacity = 0.12
        walletWrapper.layer.shadowOffset = CGSize(width: 0, height: 4)
        walletWrapper.layer.shadowRadius = 8
        walletCardView.addSubview(walletWrapper)
        
        // Add Wallet Card Tap & Long Press Actions
        let tap = UITapGestureRecognizer(target: self, action: #selector(walletCardTapped))
        walletWrapper.addGestureRecognizer(tap)

        let longPress = UILongPressGestureRecognizer(target: self, action: #selector(walletCardLongPressed(_:)))
        longPress.minimumPressDuration = 0.5
        walletWrapper.addGestureRecognizer(longPress)
        
        // Circle Wallet Icon Container (Pure White Circle)
        walletIconBg.backgroundColor = .white
        walletIconBg.layer.cornerRadius = 18
        walletIconBg.clipsToBounds = true
        walletIconBg.translatesAutoresizingMaskIntoConstraints = false
        walletWrapper.addSubview(walletIconBg)
        
        let cardImage = UIImage(named: "WalletLogo")
        walletIconView.image = cardImage
        walletIconView.contentMode = .scaleAspectFit
        walletIconView.translatesAutoresizingMaskIntoConstraints = false
        walletIconBg.addSubview(walletIconView)
        
        // Balance labels
        txtWalletBalance.text = "₹0.00"
        txtWalletBalance.textColor = .white
        txtWalletBalance.font = .systemFont(ofSize: 18.5, weight: .bold)
        txtWalletBalance.adjustsFontSizeToFitWidth = true
        txtWalletBalance.minimumScaleFactor = 0.7
        txtWalletBalance.numberOfLines = 1
        txtWalletBalance.translatesAutoresizingMaskIntoConstraints = false
        walletWrapper.addSubview(txtWalletBalance)
        
        txtWalletStatus.text = "●  LOW BALANCE • ADD FUNDS"
        txtWalletStatus.textColor = UIColor(red: 249/255, green: 115/255, blue: 22/255, alpha: 1) // #F97316
        txtWalletStatus.font = .systemFont(ofSize: 9.5, weight: .bold)
        txtWalletStatus.translatesAutoresizingMaskIntoConstraints = false
        walletWrapper.addSubview(txtWalletStatus)
        
        // Right side: Subtle Chevron Icon (Shown when balance >= 49)
        let chevronConfig = UIImage.SymbolConfiguration(pointSize: 13, weight: .semibold)
        walletChevron.image = UIImage(systemName: "chevron.right", withConfiguration: chevronConfig)
        walletChevron.tintColor = UIColor(red: 148/255, green: 163/255, blue: 184/255, alpha: 0.8)
        walletChevron.contentMode = .scaleAspectFit
        walletChevron.translatesAutoresizingMaskIntoConstraints = false
        walletChevron.isHidden = true
        walletWrapper.addSubview(walletChevron)

        // Right side: Top Up Button (Shown when balance < 49)
        btnTopUp.setTitle("Top Up", for: .normal)
        btnTopUp.setTitleColor(.white, for: .normal)
        btnTopUp.titleLabel?.font = .systemFont(ofSize: 12.5, weight: .bold)
        if #available(iOS 15.0, *) {
            var config = UIButton.Configuration.plain()
            config.contentInsets = NSDirectionalEdgeInsets(top: 5, leading: 13, bottom: 5, trailing: 13)
            var titleAttr = AttributedString("Top Up")
            titleAttr.font = .systemFont(ofSize: 12.5, weight: .bold)
            titleAttr.foregroundColor = .white
            config.attributedTitle = titleAttr
            btnTopUp.configuration = config
        } else {
            btnTopUp.contentEdgeInsets = UIEdgeInsets(top: 5, left: 13, bottom: 5, right: 13)
        }
        btnTopUp.backgroundColor = UIColor(red: 30/255, green: 41/255, blue: 59/255, alpha: 0.9)
        btnTopUp.layer.cornerRadius = 13
        btnTopUp.layer.borderWidth = 1
        btnTopUp.layer.borderColor = UIColor(red: 51/255, green: 65/255, blue: 85/255, alpha: 1).cgColor
        btnTopUp.addTarget(self, action: #selector(topUpButtonTapped), for: .touchUpInside)
        btnTopUp.translatesAutoresizingMaskIntoConstraints = false
        btnTopUp.isHidden = true
        walletWrapper.addSubview(btnTopUp)
        
        topLayoutContainer.addArrangedSubview(walletCardView)
        
        NSLayoutConstraint.activate([
            walletWrapper.topAnchor.constraint(equalTo: walletCardView.topAnchor, constant: 1),
            walletWrapper.bottomAnchor.constraint(equalTo: walletCardView.bottomAnchor, constant: -3),
            walletWrapper.leadingAnchor.constraint(equalTo: walletCardView.leadingAnchor, constant: 14),
            walletWrapper.trailingAnchor.constraint(equalTo: walletCardView.trailingAnchor, constant: -14),
            walletWrapper.heightAnchor.constraint(equalToConstant: 54),
            
            walletIconBg.leadingAnchor.constraint(equalTo: walletWrapper.leadingAnchor, constant: 10),
            walletIconBg.centerYAnchor.constraint(equalTo: walletWrapper.centerYAnchor),
            walletIconBg.widthAnchor.constraint(equalToConstant: 36),
            walletIconBg.heightAnchor.constraint(equalToConstant: 36),
            
            walletIconView.centerXAnchor.constraint(equalTo: walletIconBg.centerXAnchor),
            walletIconView.centerYAnchor.constraint(equalTo: walletIconBg.centerYAnchor),
            walletIconView.widthAnchor.constraint(equalToConstant: 26),
            walletIconView.heightAnchor.constraint(equalToConstant: 26),
            
            txtWalletBalance.topAnchor.constraint(equalTo: walletWrapper.topAnchor, constant: 9),
            txtWalletBalance.leadingAnchor.constraint(equalTo: walletIconBg.trailingAnchor, constant: 10),
            txtWalletBalance.trailingAnchor.constraint(lessThanOrEqualTo: walletWrapper.trailingAnchor, constant: -80),
            
            txtWalletStatus.topAnchor.constraint(equalTo: txtWalletBalance.bottomAnchor, constant: 1),
            txtWalletStatus.leadingAnchor.constraint(equalTo: walletIconBg.trailingAnchor, constant: 10),
            txtWalletStatus.trailingAnchor.constraint(lessThanOrEqualTo: walletWrapper.trailingAnchor, constant: -80),
            
            btnTopUp.trailingAnchor.constraint(equalTo: walletWrapper.trailingAnchor, constant: -12),
            btnTopUp.centerYAnchor.constraint(equalTo: walletWrapper.centerYAnchor),
            btnTopUp.heightAnchor.constraint(equalToConstant: 28),

            walletChevron.trailingAnchor.constraint(equalTo: walletWrapper.trailingAnchor, constant: -14),
            walletChevron.centerYAnchor.constraint(equalTo: walletWrapper.centerYAnchor),
            walletChevron.widthAnchor.constraint(equalToConstant: 12),
            walletChevron.heightAnchor.constraint(equalToConstant: 16)
        ])
    }

    @objc private func menuButtonTapped() {
        showMorePanel()
    }

    @objc private func topUpButtonTapped() {
        let generator = UIImpactFeedbackGenerator(style: .medium)
        generator.impactOccurred()
        
        UIView.animate(withDuration: 0.1, animations: {
            self.walletWrapper.transform = CGAffineTransform(scaleX: 0.98, y: 0.98)
        }) { _ in
            UIView.animate(withDuration: 0.1) {
                self.walletWrapper.transform = .identity
            }
        }
        
        showWeb(path: "/workspace/wallet?action=topup")
    }

    @objc private func walletCardTapped() {
        let generator = UISelectionFeedbackGenerator()
        generator.selectionChanged()
        
        UIView.animate(withDuration: 0.1, animations: {
            self.walletWrapper.transform = CGAffineTransform(scaleX: 0.98, y: 0.98)
        }) { _ in
            UIView.animate(withDuration: 0.1) {
                self.walletWrapper.transform = .identity
            }
        }
        
        showWeb(path: "/workspace/wallet")
    }

    @objc private func walletCardLongPressed(_ gesture: UILongPressGestureRecognizer) {
        guard gesture.state == .began else { return }
        
        let generator = UIImpactFeedbackGenerator(style: .medium)
        generator.impactOccurred()
        
        let alert = UIAlertController(title: "Patholab Wallet", message: "Quick actions for your account balance", preferredStyle: .actionSheet)
        alert.addAction(UIAlertAction(title: "💳  Top Up / Add Funds", style: .default, handler: { [weak self] _ in
            self?.showWeb(path: "/workspace/wallet?action=topup")
        }))
        alert.addAction(UIAlertAction(title: "📜  Transaction Ledger", style: .default, handler: { [weak self] _ in
            self?.showWeb(path: "/workspace/wallet#history")
        }))
        alert.addAction(UIAlertAction(title: "🧾  Wallet Invoices", style: .default, handler: { [weak self] _ in
            self?.showWeb(path: "/workspace/wallet#invoices")
        }))
        alert.addAction(UIAlertAction(title: "🔄  Refresh Balance", style: .default, handler: { [weak self] _ in
            self?.fetchWalletDetails()
        }))
        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel, handler: nil))
        
        if let popover = alert.popoverPresentationController {
            popover.sourceView = walletWrapper
            popover.sourceRect = walletWrapper.bounds
        }
        present(alert, animated: true)
    }

    @objc private func headerThemeTapped() {
        let generator = UIImpactFeedbackGenerator(style: .medium)
        generator.impactOccurred()
        
        let newDark = !self.isDarkMode
        
        // Immediate smooth UI transition on native views
        UIView.animate(withDuration: 0.35, delay: 0, options: [.allowUserInteraction, .curveEaseInOut], animations: {
            self.applyNativeTheme(isDark: newDark)
        }, completion: nil)
        
        // Animated icon spin + spring bounce for refined micro-interaction
        UIView.animate(withDuration: 0.18, delay: 0, options: [.curveEaseIn], animations: {
            self.themeButton.transform = CGAffineTransform(rotationAngle: .pi / 2).scaledBy(x: 0.8, y: 0.8)
        }) { _ in
            UIView.animate(withDuration: 0.3, delay: 0, usingSpringWithDamping: 0.6, initialSpringVelocity: 0.8, options: [], animations: {
                self.themeButton.transform = .identity
            }, completion: nil)
        }
        
        if let webView = self.webView {
            // Trigger web app theme switch button click inside WebView or toggle class directly
            webView.evaluateJavaScript("""
            (function() {
                var btn = document.querySelector('.mobile-app-header-web-component button[aria-label=\"Toggle dark mode\"]') || document.querySelector('[aria-label=\"Toggle dark mode\"]');
                if (btn) { btn.click(); return; }
                var html = document.documentElement;
                var isDark = html.classList.toggle('dark');
                var theme = isDark ? 'dark' : 'light';
                localStorage.setItem('theme', theme);
            })()
            """, completionHandler: nil)
        }
    }

    @objc private func headerSupportTapped() {
        showHelpPanel()
    }

    private func showHelpPanel() {
        let helpVC = HelpPanelViewController()
        helpVC.isDarkMode = self.isDarkMode
        helpVC.onOpenWeb = { [weak self] path in
            guard let self = self else { return }
            self.currentPath = nil
            self.selectedTab = 0
            self.updateNavTints()
            self.showWeb(path: path)
        }
        if #available(iOS 16.0, *) {
            helpVC.modalPresentationStyle = .pageSheet
            if let sheet = helpVC.sheetPresentationController {
                sheet.detents = [.custom { context in
                    return min(365, context.maximumDetentValue * 0.45)
                }]
                sheet.prefersGrabberVisible = true
                sheet.preferredCornerRadius = 24
            }
        } else if #available(iOS 15.0, *) {
            helpVC.modalPresentationStyle = .pageSheet
            if let sheet = helpVC.sheetPresentationController {
                sheet.detents = [.medium()]
                sheet.prefersGrabberVisible = true
            }
        } else {
            helpVC.modalPresentationStyle = .formSheet
        }
        present(helpVC, animated: true)
    }

    @objc private func headerNotificationTapped() {
        let notifVC = NotificationsViewController()
        notifVC.isDarkMode = self.isDarkMode

        let lastSeen = UserDefaults.standard.double(forKey: "last_seen_notification_time")
        notifVC.lastSeenTime = lastSeen
        UserDefaults.standard.set(Date().timeIntervalSince1970, forKey: "last_seen_notification_time")

        // Instantly clear the badge/bell when opening notifications
        self.notificationBadge.isHidden = true
        self.stopBellAnimationLoop()

        // When user taps "Mark all as read", instantly clear the badge and bell on this screen
        notifVC.onAllRead = { [weak self] in
            guard let self = self else { return }
            self.notificationBadge.isHidden = true
            self.stopBellAnimationLoop()
            // Mark all read also sets the last seen time
            UserDefaults.standard.set(Date().timeIntervalSince1970, forKey: "last_seen_notification_time")
        }

        if #available(iOS 16.0, *) {
            notifVC.modalPresentationStyle = .pageSheet
            if let sheet = notifVC.sheetPresentationController {
                sheet.detents = [.custom { context in
                    return context.maximumDetentValue * 0.8
                }]
                sheet.prefersGrabberVisible = true
                sheet.preferredCornerRadius = 24
            }
        } else if #available(iOS 15.0, *) {
            notifVC.modalPresentationStyle = .pageSheet
            if let sheet = notifVC.sheetPresentationController {
                sheet.detents = [.medium(), .large()]
                sheet.prefersGrabberVisible = true
            }
        } else {
            notifVC.modalPresentationStyle = .formSheet
        }
        present(notifVC, animated: true, completion: nil)
    }

    private func getHeaderTitle(for path: String) -> String {
        if path.contains("analytics") { return "Financial Analytics" }
        if path.contains("patients") { return "Patient Worklist" }
        if path.contains("test-management") { return "Categories" }
        if path.contains("bookings") { return "Online Bookings" }
        if path.contains("registration") { return "Registration" }
        if path.contains("results") { return "Worklist & Results" }
        if path.contains("reports") { return "Report Dispatch" }
        if path.contains("inventory") { return "Inventory & Stock" }
        if path.contains("logistics") { return "Logistics & Trips" }
        if path.contains("analyzers") { return "Analyzer" }
        if path.contains("support") { return "Help & Support" }
        if path.contains("billing") { return "Invoices & Payments" }
        if path.contains("expenses") { return "Expenses" }
        if path.contains("settings") { return "Lab Settings" }
        if path.contains("audit-logs") { return "Audit Logs" }
        if path.contains("wallet") { return "Wallet & Billing" }
        return "Dashboard"
    }

    // MARK: – UIAdaptivePresentationControllerDelegate
    func presentationControllerDidDismiss(_ presentationController: UIPresentationController) {
        selectedTab = previousTab
        updateNavTints()
        if previousTab == 0 {
            headerTitleLabel.text = getHeaderTitle(for: currentPath ?? "/workspace/analytics")
        } else if previousTab == 1 {
            headerTitleLabel.text = "Patient Worklist"
        } else if previousTab == 2 {
            headerTitleLabel.text = "Categories"
        }
    }

    // MARK: – WKWebView Key-Value Observing (KVO)
    override func observeValue(forKeyPath keyPath: String?, of object: Any?, change: [NSKeyValueChangeKey : Any]?, context: UnsafeMutableRawPointer?) {
        if keyPath == "URL", let webView = object as? WKWebView, let url = webView.url {
            checkAuthRedirect(url: url)
        }
        if keyPath == "estimatedProgress" {
            checkWebViewProgress()
        }
    }

    private func injectWebHeaderHider() {
        guard let webView = self.webView else { return }
        let css = ".mobile-app-header-web-component, header { display: none !important; } main, .is-native-app main, .is-capacitor main { padding-top: 0px !important; }"
        let js = """
        (function() {
            var styleId = 'native-header-hider-style';
            if (!document.getElementById(styleId)) {
                var style = document.createElement('style');
                style.id = styleId;
                style.innerHTML = '\(css)';
                document.head.appendChild(style);
            }
        })()
        """
        webView.evaluateJavaScript(js, completionHandler: nil)
    }

    private func checkWebViewProgress() {
        guard let webView = self.webView else { return }
        
        self.injectWebHeaderHider()
        
        let progress = webView.estimatedProgress
        if progress >= 0.75 {
            DispatchQueue.main.async {
                self.hideSkeleton()
            }
        }
    }

    private func checkAuthRedirect(url: URL) {
        // Startup grace period to prevent temporary initial redirects from kicking the user out
        if Date().timeIntervalSince(controllerLaunchTime) < 4.0 {
            return
        }
        
        let path = url.path
        if path == "/login" || path == "/register" || path == "/forgot-password" || path == "/verify" || path == "/reset-password" || path.hasPrefix("/login/") {
            // Check if user still has a valid token in Keychain
            if let token = KeychainManager.read(forKey: KeychainManager.tokenKey), !token.isEmpty {
                // Token exists, re-inject cookie and reload dashboard
                AuthService.injectCookieIntoWebView(token: token) { [weak self] in
                    DispatchQueue.main.async {
                        self?.currentPath = nil
                        self?.loadUrl(path: "/workspace/analytics")
                    }
                }
                return
            }
            
            stopWalletPolling()
            
            // Log out natively
            KeychainManager.delete(forKey: KeychainManager.tokenKey)
            AuthService.clearWebViewCookie()
            
            DispatchQueue.main.async {
                if let app = UIApplication.shared.delegate as? AppDelegate {
                    app.signOut()
                }
            }
        }
    }

    private func applyNativeTheme(isDark: Bool) {
        guard isDarkMode != isDark else { return }
        isDarkMode = isDark

        // Sync iOS appearance so status bar & system chrome match the web theme
        overrideUserInterfaceStyle = isDark ? .dark : .light

        let slate900 = UIColor(red: 15/255,  green: 23/255,  blue: 42/255,  alpha: 1)
        let slate700 = UIColor(red: 51/255,  green: 65/255,  blue: 85/255,  alpha: 1)
        let slate600 = UIColor(red: 71/255,  green: 85/255,  blue: 105/255, alpha: 1)
        let slate200 = UIColor(red: 226/255, green: 232/255, blue: 240/255, alpha: 1)

        // ── Root view
        view.backgroundColor = isDark ? slate900 : .white

        // ── Header container (Transparent to allow blurred gradient backdrop to show through)
        topLayoutContainer.backgroundColor = .clear
        topHeaderBar.backgroundColor       = .clear
        walletCardView.backgroundColor     = .clear

        // ── Header bottom divider
        headerBorder.backgroundColor = isDark ? UIColor(white: 1.0, alpha: 0.06) : UIColor(white: 0.0, alpha: 0.04)

        // ── Header Blur & Gradient update
        let blurStyle: UIBlurEffect.Style = isDark ? .systemUltraThinMaterialDark : .systemUltraThinMaterialLight
        headerBlurEffectView.effect = UIBlurEffect(style: blurStyle)
        updateHeaderGradientColors()

        // ── Title & subtitle
        headerTitleLabel.textColor    = isDark ? .white : UIColor(red: 15/255, green: 23/255, blue: 42/255, alpha: 1)
        headerSubtitleLabel.textColor = UIColor(red: 148/255, green: 163/255, blue: 184/255, alpha: 1)

        // ── Button tint
        let btnTint = isDark ? slate200 : slate600

        // Menu button — transparent background
        menuButton.backgroundColor = .clear
        menuButton.tintColor = btnTint

        // Theme & support buttons — transparent background
        themeButton.backgroundColor   = .clear
        supportButton.backgroundColor = .clear
        themeButton.tintColor   = btnTint
        supportButton.tintColor = btnTint

        // Theme button icon: sun in light mode, moon in dark mode
        let themeConfig = UIImage.SymbolConfiguration(pointSize: 17, weight: .medium)
        themeButton.setImage(UIImage(systemName: isDark ? "moon.fill" : "sun.max", withConfiguration: themeConfig), for: .normal)

        // Notification button — transparent background
        notificationButton.backgroundColor = .clear
        notificationButton.tintColor = btnTint

        // ── Bottom nav bar
        bottomNavBar.backgroundColor = isDark ? slate900 : .white
        bottomBorder.backgroundColor = isDark ? slate700 : UIColor(white: 0.88, alpha: 1)
        updateNavTints()

        // ── Wallet card container + dark inner wrapper (dark card design even in light mode)
        walletWrapper.backgroundColor  = isDark
            ? UIColor(red: 15/255, green: 23/255, blue: 42/255, alpha: 1)
            : UIColor(red: 17/255, green: 24/255, blue: 39/255, alpha: 1)

        // ── Skeleton & WebView — update background to avoid flash during page transitions
        if let webView = self.webView {
            webView.backgroundColor = isDark
                ? slate900
                : UIColor(red: 248/255, green: 250/255, blue: 252/255, alpha: 1)
            webView.scrollView.backgroundColor = webView.backgroundColor
        }
        if !skeletonView.isHidden {
            skeletonView.backgroundColor = isDark
                ? slate900
                : UIColor(red: 248/255, green: 250/255, blue: 252/255, alpha: 1)
        }

        // ── More panel
        moreVC.applyTheme(isDark: isDark)

        // ── Persist selection to UserDefaults and synchronize webView localStorage
        UserDefaults.standard.set(isDark, forKey: "is_dark_mode")
        if let webView = self.webView {
            webView.evaluateJavaScript("""
            (function() {
                var isDark = \(isDark ? "true" : "false");
                if (isDark) {
                    document.documentElement.classList.add('dark');
                    localStorage.setItem('theme', 'dark');
                } else {
                    document.documentElement.classList.remove('dark');
                    localStorage.setItem('theme', 'light');
                }
            })()
            """, completionHandler: nil)
        }
    }

    private func buildSkeletonView() {
        skeletonView.translatesAutoresizingMaskIntoConstraints = false
        skeletonView.backgroundColor = UIColor(red: 248/255, green: 250/255, blue: 252/255, alpha: 1)
        skeletonView.isHidden = true
        view.addSubview(skeletonView)
        
        NSLayoutConstraint.activate([
            skeletonView.topAnchor.constraint(equalTo: topLayoutContainer.bottomAnchor),
            skeletonView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            skeletonView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            skeletonView.bottomAnchor.constraint(equalTo: bottomNavBar.topAnchor)
        ])
    }

    private func createShimmerLine(width: CGFloat?, height: CGFloat, color: UIColor) -> UIView {
        let view = UIView()
        view.backgroundColor = color
        view.layer.cornerRadius = height / 2.0
        view.translatesAutoresizingMaskIntoConstraints = false
        if let w = width {
            view.widthAnchor.constraint(equalToConstant: w).isActive = true
        }
        view.heightAnchor.constraint(equalToConstant: height).isActive = true
        return view
    }
    
    private func createShimmerCircle(size: CGFloat, color: UIColor) -> UIView {
        let view = UIView()
        view.backgroundColor = color
        view.layer.cornerRadius = size / 2.0
        view.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            view.widthAnchor.constraint(equalToConstant: size),
            view.heightAnchor.constraint(equalToConstant: size)
        ])
        return view
    }
    
    private func createCardWrapper(color: UIColor, borderColor: CGColor) -> UIView {
        let view = UIView()
        view.backgroundColor = color
        view.layer.cornerRadius = 16
        view.layer.borderWidth = 1
        view.layer.borderColor = borderColor
        view.translatesAutoresizingMaskIntoConstraints = false
        return view
    }

    private func getSkeletonCategory(for path: String) -> String {
        let p = path.lowercased()
        if p.contains("analytics") || p.contains("finance") || p == "/" || p.contains("dashboard") || (p.contains("workspace") && !p.contains("/")) {
            return "dashboard"
        }
        if p.contains("registration") || p.contains("create") || p.contains("new") || p.contains("edit") || p.contains("add-") {
            return "form"
        }
        if p.contains("invoice") || p.contains("print") || p.contains("receipt") || p.contains("report-view") || p.contains("detail") {
            return "detail"
        }
        if p.contains("categories") || p.contains("catalog") || p.contains("analyzers") || p.contains("machines") || p.contains("inventory") || p.contains("b2b") {
            return "grid"
        }
        if p.contains("settings") || p.contains("wallet") || p.contains("support") || p.contains("config") || p.contains("profile") || p.contains("security") {
            return "settings"
        }
        if p.contains("patients") || p.contains("results") || p.contains("reports") || p.contains("worklist") || p.contains("bookings") || p.contains("audit") || p.contains("staff") || p.contains("doctors") || p.contains("expenses") {
            return "list"
        }
        return "dashboard"
    }

    private func showSkeleton(for path: String) {
        let category = getSkeletonCategory(for: path)
        if let currentPath = activeSkeletonPath, getSkeletonCategory(for: currentPath) == category && !skeletonView.isHidden {
            return
        }
        activeSkeletonPath = path
        
        let isDark = self.isDarkMode
        skeletonView.backgroundColor = isDark ? UIColor(red: 15/255, green: 23/255, blue: 42/255, alpha: 1) : UIColor(red: 248/255, green: 250/255, blue: 252/255, alpha: 1)
        
        // Remove existing subviews in skeletonView
        skeletonView.subviews.forEach { $0.removeFromSuperview() }
        
        let bgCard = isDark ? UIColor(red: 30/255, green: 41/255, blue: 59/255, alpha: 1) : .white
        let bgBlock = isDark ? UIColor(red: 71/255, green: 85/255, blue: 105/255, alpha: 1) : UIColor(red: 226/255, green: 232/255, blue: 240/255, alpha: 1)
        let borderColor = isDark ? UIColor(red: 51/255, green: 65/255, blue: 85/255, alpha: 1).cgColor : UIColor(white: 0.9, alpha: 1).cgColor
        
        let scrollView = UIScrollView()
        scrollView.translatesAutoresizingMaskIntoConstraints = false
        scrollView.showsVerticalScrollIndicator = false
        skeletonView.addSubview(scrollView)
        
        // Main container StackView
        let mainStack = UIStackView()
        mainStack.axis = .vertical
        mainStack.spacing = 16
        mainStack.translatesAutoresizingMaskIntoConstraints = false
        scrollView.addSubview(mainStack)
        
        // Padding constraints
        NSLayoutConstraint.activate([
            scrollView.topAnchor.constraint(equalTo: skeletonView.topAnchor),
            scrollView.leadingAnchor.constraint(equalTo: skeletonView.leadingAnchor),
            scrollView.trailingAnchor.constraint(equalTo: skeletonView.trailingAnchor),
            scrollView.bottomAnchor.constraint(equalTo: skeletonView.bottomAnchor),
            
            mainStack.topAnchor.constraint(equalTo: scrollView.contentLayoutGuide.topAnchor, constant: 16),
            mainStack.leadingAnchor.constraint(equalTo: scrollView.contentLayoutGuide.leadingAnchor, constant: 16),
            mainStack.trailingAnchor.constraint(equalTo: scrollView.contentLayoutGuide.trailingAnchor, constant: -16),
            mainStack.bottomAnchor.constraint(equalTo: scrollView.contentLayoutGuide.bottomAnchor, constant: -16),
            mainStack.widthAnchor.constraint(equalTo: scrollView.frameLayoutGuide.widthAnchor, constant: -32)
        ])
        
        switch category {
        case "dashboard":
            buildDashboardSkeleton(in: mainStack, bgCard: bgCard, bgBlock: bgBlock, borderColor: borderColor)
        case "list":
            buildListSkeleton(in: mainStack, bgCard: bgCard, bgBlock: bgBlock, borderColor: borderColor)
        case "form":
            buildFormSkeleton(in: mainStack, bgCard: bgCard, bgBlock: bgBlock, borderColor: borderColor)
        case "grid":
            buildGridSkeleton(in: mainStack, bgCard: bgCard, bgBlock: bgBlock, borderColor: borderColor)
        case "detail":
            buildDetailSkeleton(in: mainStack, bgCard: bgCard, bgBlock: bgBlock, borderColor: borderColor)
        case "settings":
            buildSettingsSkeleton(in: mainStack, bgCard: bgCard, bgBlock: bgBlock, borderColor: borderColor)
        default:
            buildDashboardSkeleton(in: mainStack, bgCard: bgCard, bgBlock: bgBlock, borderColor: borderColor)
        }
        
        // Fast Fade in transition
        skeletonView.layer.removeAllAnimations()
        skeletonView.alpha = 0.0
        skeletonView.isHidden = false
        
        UIView.animate(withDuration: 0.15, animations: {
            self.skeletonView.alpha = 1.0
        }) { _ in
            self.startPulseAnimation()
        }

        // Hard safety timeout: auto-hide skeleton after at most 1.5s so user is NEVER stuck on loading
        skeletonTimeoutTimer?.invalidate()
        skeletonTimeoutTimer = Timer.scheduledTimer(withTimeInterval: 1.5, repeats: false) { [weak self] _ in
            self?.hideSkeleton()
        }
    }

    // ── 1. DASHBOARD / FINANCE SKELETON ─────────────────────────────────────────
    private func buildDashboardSkeleton(in mainStack: UIStackView, bgCard: UIColor, bgBlock: UIColor, borderColor: CGColor) {
        // Welcome Card
        let welcome = createCardWrapper(color: bgCard, borderColor: borderColor)
        let wStack = UIStackView(arrangedSubviews: [
            createShimmerLine(width: 200, height: 22, color: bgBlock),
            createShimmerLine(width: 130, height: 14, color: bgBlock)
        ])
        wStack.axis = .vertical
        wStack.spacing = 8
        wStack.translatesAutoresizingMaskIntoConstraints = false
        welcome.addSubview(wStack)
        NSLayoutConstraint.activate([
            wStack.topAnchor.constraint(equalTo: welcome.topAnchor, constant: 18),
            wStack.bottomAnchor.constraint(equalTo: welcome.bottomAnchor, constant: -18),
            wStack.leadingAnchor.constraint(equalTo: welcome.leadingAnchor, constant: 18),
            wStack.trailingAnchor.constraint(equalTo: welcome.trailingAnchor, constant: -18)
        ])
        mainStack.addArrangedSubview(welcome)
        
        // KPI Metrics Row 1
        let gridH1 = UIStackView()
        gridH1.axis = .horizontal
        gridH1.spacing = 12
        gridH1.distribution = .fillEqually
        for w in [85, 95] {
            let card = createCardWrapper(color: bgCard, borderColor: borderColor)
            let cStack = UIStackView(arrangedSubviews: [
                createShimmerCircle(size: 34, color: bgBlock),
                createShimmerLine(width: CGFloat(w), height: 18, color: bgBlock),
                createShimmerLine(width: CGFloat(w - 25), height: 12, color: bgBlock)
            ])
            cStack.axis = .vertical
            cStack.spacing = 10
            cStack.translatesAutoresizingMaskIntoConstraints = false
            card.addSubview(cStack)
            NSLayoutConstraint.activate([
                cStack.topAnchor.constraint(equalTo: card.topAnchor, constant: 16),
                cStack.bottomAnchor.constraint(equalTo: card.bottomAnchor, constant: -16),
                cStack.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 16),
                cStack.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -16),
                card.heightAnchor.constraint(equalToConstant: 115)
            ])
            gridH1.addArrangedSubview(card)
        }
        mainStack.addArrangedSubview(gridH1)

        // KPI Metrics Row 2
        let gridH2 = UIStackView()
        gridH2.axis = .horizontal
        gridH2.spacing = 12
        gridH2.distribution = .fillEqually
        for w in [75, 90] {
            let card = createCardWrapper(color: bgCard, borderColor: borderColor)
            let cStack = UIStackView(arrangedSubviews: [
                createShimmerCircle(size: 34, color: bgBlock),
                createShimmerLine(width: CGFloat(w), height: 18, color: bgBlock),
                createShimmerLine(width: CGFloat(w - 20), height: 12, color: bgBlock)
            ])
            cStack.axis = .vertical
            cStack.spacing = 10
            cStack.translatesAutoresizingMaskIntoConstraints = false
            card.addSubview(cStack)
            NSLayoutConstraint.activate([
                cStack.topAnchor.constraint(equalTo: card.topAnchor, constant: 16),
                cStack.bottomAnchor.constraint(equalTo: card.bottomAnchor, constant: -16),
                cStack.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 16),
                cStack.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -16),
                card.heightAnchor.constraint(equalToConstant: 115)
            ])
            gridH2.addArrangedSubview(card)
        }
        mainStack.addArrangedSubview(gridH2)

        // Chart / Analytics Card
        let chartCard = createCardWrapper(color: bgCard, borderColor: borderColor)
        let chartHeader = createShimmerLine(width: 140, height: 18, color: bgBlock)
        chartHeader.translatesAutoresizingMaskIntoConstraints = false
        chartCard.addSubview(chartHeader)
        
        let barStack = UIStackView()
        barStack.axis = .horizontal
        barStack.spacing = 10
        barStack.alignment = .bottom
        barStack.distribution = .fillEqually
        barStack.translatesAutoresizingMaskIntoConstraints = false
        chartCard.addSubview(barStack)
        
        let heights: [CGFloat] = [80, 130, 65, 150, 105, 165]
        for h in heights {
            let bar = UIView()
            bar.backgroundColor = bgBlock
            bar.layer.cornerRadius = 4
            bar.translatesAutoresizingMaskIntoConstraints = false
            bar.heightAnchor.constraint(equalToConstant: h).isActive = true
            barStack.addArrangedSubview(bar)
        }
        
        NSLayoutConstraint.activate([
            chartHeader.topAnchor.constraint(equalTo: chartCard.topAnchor, constant: 16),
            chartHeader.leadingAnchor.constraint(equalTo: chartCard.leadingAnchor, constant: 16),
            barStack.topAnchor.constraint(equalTo: chartHeader.bottomAnchor, constant: 16),
            barStack.leadingAnchor.constraint(equalTo: chartCard.leadingAnchor, constant: 16),
            barStack.trailingAnchor.constraint(equalTo: chartCard.trailingAnchor, constant: -16),
            barStack.bottomAnchor.constraint(equalTo: chartCard.bottomAnchor, constant: -16),
            chartCard.heightAnchor.constraint(equalToConstant: 230)
        ])
        mainStack.addArrangedSubview(chartCard)
    }

    // ── 2. LIST / RECORDS SKELETON (Patients, Reports, Bookings) ────────────────
    private func buildListSkeleton(in mainStack: UIStackView, bgCard: UIColor, bgBlock: UIColor, borderColor: CGColor) {
        // Search & Filter Row
        let filterStack = UIStackView()
        filterStack.axis = .horizontal
        filterStack.spacing = 10
        
        let searchField = createCardWrapper(color: bgCard, borderColor: borderColor)
        searchField.heightAnchor.constraint(equalToConstant: 44).isActive = true
        filterStack.addArrangedSubview(searchField)
        
        let filterButton = createCardWrapper(color: bgCard, borderColor: borderColor)
        NSLayoutConstraint.activate([
            filterButton.widthAnchor.constraint(equalToConstant: 44),
            filterButton.heightAnchor.constraint(equalToConstant: 44)
        ])
        filterStack.addArrangedSubview(filterButton)
        mainStack.addArrangedSubview(filterStack)
        
        // Tab Pills
        let pillsStack = UIStackView()
        pillsStack.axis = .horizontal
        pillsStack.spacing = 8
        pillsStack.distribution = .fillProportionally
        for w in [70, 85, 65, 80] {
            let pill = createCardWrapper(color: bgCard, borderColor: borderColor)
            pill.layer.cornerRadius = 16
            NSLayoutConstraint.activate([
                pill.widthAnchor.constraint(equalToConstant: CGFloat(w)),
                pill.heightAnchor.constraint(equalToConstant: 32)
            ])
            pillsStack.addArrangedSubview(pill)
        }
        mainStack.addArrangedSubview(pillsStack)
        
        // List Items Card
        let listCard = createCardWrapper(color: bgCard, borderColor: borderColor)
        let listStack = UIStackView()
        listStack.axis = .vertical
        listStack.spacing = 16
        listStack.translatesAutoresizingMaskIntoConstraints = false
        listCard.addSubview(listStack)
        
        NSLayoutConstraint.activate([
            listStack.topAnchor.constraint(equalTo: listCard.topAnchor, constant: 16),
            listStack.bottomAnchor.constraint(equalTo: listCard.bottomAnchor, constant: -16),
            listStack.leadingAnchor.constraint(equalTo: listCard.leadingAnchor, constant: 16),
            listStack.trailingAnchor.constraint(equalTo: listCard.trailingAnchor, constant: -16)
        ])
        
        let widths: [[CGFloat]] = [[140, 90], [170, 110], [130, 75], [160, 100], [120, 85], [150, 95]]
        for w in widths {
            let rowStack = UIStackView()
            rowStack.axis = .horizontal
            rowStack.spacing = 12
            rowStack.alignment = .center
            
            let circle = createShimmerCircle(size: 42, color: bgBlock)
            rowStack.addArrangedSubview(circle)
            
            let textStack = UIStackView(arrangedSubviews: [
                createShimmerLine(width: w[0], height: 15, color: bgBlock),
                createShimmerLine(width: w[1], height: 11, color: bgBlock)
            ])
            textStack.axis = .vertical
            textStack.spacing = 6
            rowStack.addArrangedSubview(textStack)
            
            let badge = createShimmerLine(width: 60, height: 22, color: bgBlock)
            badge.layer.cornerRadius = 11
            rowStack.addArrangedSubview(badge)
            
            listStack.addArrangedSubview(rowStack)
        }
        mainStack.addArrangedSubview(listCard)
    }

    // ── 3. FORM / ENTRY SKELETON (New Registration, Edit Record) ───────────────
    private func buildFormSkeleton(in mainStack: UIStackView, bgCard: UIColor, bgBlock: UIColor, borderColor: CGColor) {
        // Step progress row
        let stepRow = UIStackView()
        stepRow.axis = .horizontal
        stepRow.spacing = 8
        stepRow.alignment = .center
        stepRow.distribution = .equalCentering
        for _ in 0..<3 {
            let stepDot = createShimmerCircle(size: 28, color: bgBlock)
            stepRow.addArrangedSubview(stepDot)
        }
        mainStack.addArrangedSubview(stepRow)
        
        // Form Card
        let formCard = createCardWrapper(color: bgCard, borderColor: borderColor)
        let formStack = UIStackView()
        formStack.axis = .vertical
        formStack.spacing = 14
        formStack.translatesAutoresizingMaskIntoConstraints = false
        formCard.addSubview(formStack)
        
        NSLayoutConstraint.activate([
            formStack.topAnchor.constraint(equalTo: formCard.topAnchor, constant: 18),
            formStack.bottomAnchor.constraint(equalTo: formCard.bottomAnchor, constant: -18),
            formStack.leadingAnchor.constraint(equalTo: formCard.leadingAnchor, constant: 18),
            formStack.trailingAnchor.constraint(equalTo: formCard.trailingAnchor, constant: -18)
        ])
        
        formStack.addArrangedSubview(createShimmerLine(width: 160, height: 20, color: bgBlock))
        formStack.setCustomSpacing(20, after: formStack.arrangedSubviews.last!)
        
        let labelWidths: [CGFloat] = [100, 120, 110]
        for lw in labelWidths {
            let lbl = createShimmerLine(width: lw, height: 12, color: bgBlock)
            formStack.addArrangedSubview(lbl)
            
            let box = createShimmerLine(width: nil, height: 46, color: bgBlock)
            box.layer.cornerRadius = 12
            formStack.addArrangedSubview(box)
            formStack.setCustomSpacing(14, after: box)
        }
        
        // 2-column split inputs
        let splitStack = UIStackView()
        splitStack.axis = .horizontal
        splitStack.spacing = 10
        splitStack.distribution = .fillEqually
        for _ in 0..<2 {
            let col = UIStackView(arrangedSubviews: [
                createShimmerLine(width: 60, height: 12, color: bgBlock),
                createShimmerLine(width: nil, height: 46, color: bgBlock)
            ])
            col.axis = .vertical
            col.spacing = 6
            splitStack.addArrangedSubview(col)
        }
        formStack.addArrangedSubview(splitStack)
        formStack.setCustomSpacing(20, after: splitStack)
        
        // Form Action Buttons
        let actionsStack = UIStackView(arrangedSubviews: [
            createShimmerLine(width: 90, height: 42, color: bgBlock),
            createShimmerLine(width: 140, height: 42, color: bgBlock)
        ])
        actionsStack.axis = .horizontal
        actionsStack.spacing = 12
        actionsStack.alignment = .trailing
        formStack.addArrangedSubview(actionsStack)
        
        mainStack.addArrangedSubview(formCard)
    }

    // ── 4. GRID / CATALOG SKELETON (Categories, Inventory, Analyzers) ────────────
    private func buildGridSkeleton(in mainStack: UIStackView, bgCard: UIColor, bgBlock: UIColor, borderColor: CGColor) {
        // Search Header
        let searchBox = createCardWrapper(color: bgCard, borderColor: borderColor)
        searchBox.heightAnchor.constraint(equalToConstant: 42).isActive = true
        mainStack.addArrangedSubview(searchBox)
        
        // 2x3 Grid of Module Cards
        for _ in 0..<3 {
            let gridH = UIStackView()
            gridH.axis = .horizontal
            gridH.spacing = 12
            gridH.distribution = .fillEqually
            
            for w in [85, 90] {
                let card = createCardWrapper(color: bgCard, borderColor: borderColor)
                let cStack = UIStackView(arrangedSubviews: [
                    createShimmerCircle(size: 38, color: bgBlock),
                    createShimmerLine(width: CGFloat(w), height: 16, color: bgBlock),
                    createShimmerLine(width: CGFloat(w - 25), height: 12, color: bgBlock)
                ])
                cStack.axis = .vertical
                cStack.spacing = 10
                cStack.translatesAutoresizingMaskIntoConstraints = false
                card.addSubview(cStack)
                NSLayoutConstraint.activate([
                    cStack.topAnchor.constraint(equalTo: card.topAnchor, constant: 14),
                    cStack.bottomAnchor.constraint(equalTo: card.bottomAnchor, constant: -14),
                    cStack.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 14),
                    cStack.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -14),
                    card.heightAnchor.constraint(equalToConstant: 130)
                ])
                gridH.addArrangedSubview(card)
            }
            mainStack.addArrangedSubview(gridH)
        }
    }

    // ── 5. DETAIL / INVOICE SKELETON (Report View, Invoice, Billing) ────────────
    private func buildDetailSkeleton(in mainStack: UIStackView, bgCard: UIColor, bgBlock: UIColor, borderColor: CGColor) {
        // Invoice / Test Header Summary Card
        let headerCard = createCardWrapper(color: bgCard, borderColor: borderColor)
        let hStack = UIStackView()
        hStack.axis = .horizontal
        hStack.spacing = 14
        hStack.alignment = .center
        hStack.translatesAutoresizingMaskIntoConstraints = false
        headerCard.addSubview(hStack)
        
        NSLayoutConstraint.activate([
            hStack.topAnchor.constraint(equalTo: headerCard.topAnchor, constant: 16),
            hStack.bottomAnchor.constraint(equalTo: headerCard.bottomAnchor, constant: -16),
            hStack.leadingAnchor.constraint(equalTo: headerCard.leadingAnchor, constant: 16),
            hStack.trailingAnchor.constraint(equalTo: headerCard.trailingAnchor, constant: -16)
        ])
        
        hStack.addArrangedSubview(createShimmerCircle(size: 50, color: bgBlock))
        let hText = UIStackView(arrangedSubviews: [
            createShimmerLine(width: 150, height: 18, color: bgBlock),
            createShimmerLine(width: 95, height: 12, color: bgBlock)
        ])
        hText.axis = .vertical
        hText.spacing = 6
        hStack.addArrangedSubview(hText)
        
        let pill = createShimmerLine(width: 75, height: 26, color: bgBlock)
        pill.layer.cornerRadius = 13
        hStack.addArrangedSubview(pill)
        mainStack.addArrangedSubview(headerCard)
        
        // 2-Column Info Grid Card
        let infoCard = createCardWrapper(color: bgCard, borderColor: borderColor)
        let iStack = UIStackView()
        iStack.axis = .vertical
        iStack.spacing = 12
        iStack.translatesAutoresizingMaskIntoConstraints = false
        infoCard.addSubview(iStack)
        
        NSLayoutConstraint.activate([
            iStack.topAnchor.constraint(equalTo: infoCard.topAnchor, constant: 16),
            iStack.bottomAnchor.constraint(equalTo: infoCard.bottomAnchor, constant: -16),
            iStack.leadingAnchor.constraint(equalTo: infoCard.leadingAnchor, constant: 16),
            iStack.trailingAnchor.constraint(equalTo: infoCard.trailingAnchor, constant: -16)
        ])
        
        iStack.addArrangedSubview(createShimmerLine(width: 110, height: 14, color: bgBlock))
        for _ in 0..<3 {
            let row = UIStackView(arrangedSubviews: [
                createShimmerLine(width: 70, height: 12, color: bgBlock),
                createShimmerLine(width: 120, height: 14, color: bgBlock)
            ])
            row.axis = .horizontal
            row.distribution = .equalSpacing
            iStack.addArrangedSubview(row)
        }
        mainStack.addArrangedSubview(infoCard)
        
        // Item Rows / Breakdown Card
        let itemsCard = createCardWrapper(color: bgCard, borderColor: borderColor)
        let itemStack = UIStackView()
        itemStack.axis = .vertical
        itemStack.spacing = 14
        itemStack.translatesAutoresizingMaskIntoConstraints = false
        itemsCard.addSubview(itemStack)
        
        NSLayoutConstraint.activate([
            itemStack.topAnchor.constraint(equalTo: itemsCard.topAnchor, constant: 16),
            itemStack.bottomAnchor.constraint(equalTo: itemsCard.bottomAnchor, constant: -16),
            itemStack.leadingAnchor.constraint(equalTo: itemsCard.leadingAnchor, constant: 16),
            itemStack.trailingAnchor.constraint(equalTo: itemsCard.trailingAnchor, constant: -16)
        ])
        
        itemStack.addArrangedSubview(createShimmerLine(width: 130, height: 16, color: bgBlock))
        for _ in 0..<3 {
            let itemRow = UIStackView(arrangedSubviews: [
                createShimmerLine(width: 120, height: 12, color: bgBlock),
                createShimmerLine(width: 60, height: 14, color: bgBlock)
            ])
            itemRow.axis = .horizontal
            itemRow.distribution = .equalSpacing
            itemStack.addArrangedSubview(itemRow)
        }
        mainStack.addArrangedSubview(itemsCard)
    }

    // ── 6. SETTINGS / WALLET / PROFILE SKELETON ─────────────────────────────────
    private func buildSettingsSkeleton(in mainStack: UIStackView, bgCard: UIColor, bgBlock: UIColor, borderColor: CGColor) {
        // Profile Card
        let profCard = createCardWrapper(color: bgCard, borderColor: borderColor)
        let pStack = UIStackView()
        pStack.axis = .horizontal
        pStack.spacing = 14
        pStack.alignment = .center
        pStack.translatesAutoresizingMaskIntoConstraints = false
        profCard.addSubview(pStack)
        
        NSLayoutConstraint.activate([
            pStack.topAnchor.constraint(equalTo: profCard.topAnchor, constant: 18),
            pStack.bottomAnchor.constraint(equalTo: profCard.bottomAnchor, constant: -18),
            pStack.leadingAnchor.constraint(equalTo: profCard.leadingAnchor, constant: 18),
            pStack.trailingAnchor.constraint(equalTo: profCard.trailingAnchor, constant: -18)
        ])
        
        pStack.addArrangedSubview(createShimmerCircle(size: 54, color: bgBlock))
        let pText = UIStackView(arrangedSubviews: [
            createShimmerLine(width: 130, height: 16, color: bgBlock),
            createShimmerLine(width: 90, height: 12, color: bgBlock)
        ])
        pText.axis = .vertical
        pText.spacing = 6
        pStack.addArrangedSubview(pText)
        mainStack.addArrangedSubview(profCard)
        
        // Group 1: General Preferences
        let group1 = createCardWrapper(color: bgCard, borderColor: borderColor)
        let g1Stack = UIStackView()
        g1Stack.axis = .vertical
        g1Stack.spacing = 14
        g1Stack.translatesAutoresizingMaskIntoConstraints = false
        group1.addSubview(g1Stack)
        
        NSLayoutConstraint.activate([
            g1Stack.topAnchor.constraint(equalTo: group1.topAnchor, constant: 16),
            g1Stack.bottomAnchor.constraint(equalTo: group1.bottomAnchor, constant: -16),
            g1Stack.leadingAnchor.constraint(equalTo: group1.leadingAnchor, constant: 16),
            g1Stack.trailingAnchor.constraint(equalTo: group1.trailingAnchor, constant: -16)
        ])
        
        for w in [110, 130, 95] {
            let row = UIStackView(arrangedSubviews: [
                createShimmerCircle(size: 32, color: bgBlock),
                createShimmerLine(width: CGFloat(w), height: 14, color: bgBlock),
                createShimmerCircle(size: 14, color: bgBlock)
            ])
            row.axis = .horizontal
            row.spacing = 12
            row.alignment = .center
            g1Stack.addArrangedSubview(row)
        }
        mainStack.addArrangedSubview(group1)
        
        // Group 2: Account & Security
        let group2 = createCardWrapper(color: bgCard, borderColor: borderColor)
        let g2Stack = UIStackView()
        g2Stack.axis = .vertical
        g2Stack.spacing = 14
        g2Stack.translatesAutoresizingMaskIntoConstraints = false
        group2.addSubview(g2Stack)
        
        NSLayoutConstraint.activate([
            g2Stack.topAnchor.constraint(equalTo: group2.topAnchor, constant: 16),
            g2Stack.bottomAnchor.constraint(equalTo: group2.bottomAnchor, constant: -16),
            g2Stack.leadingAnchor.constraint(equalTo: group2.leadingAnchor, constant: 16),
            g2Stack.trailingAnchor.constraint(equalTo: group2.trailingAnchor, constant: -16)
        ])
        
        for w in [120, 100] {
            let row = UIStackView(arrangedSubviews: [
                createShimmerCircle(size: 32, color: bgBlock),
                createShimmerLine(width: CGFloat(w), height: 14, color: bgBlock),
                createShimmerCircle(size: 14, color: bgBlock)
            ])
            row.axis = .horizontal
            row.spacing = 12
            row.alignment = .center
            g2Stack.addArrangedSubview(row)
        }
        mainStack.addArrangedSubview(group2)
    }
    
    private func hideSkeleton() {
        skeletonTimeoutTimer?.invalidate()
        skeletonTimeoutTimer = nil
        guard !skeletonView.isHidden else { return }
        activeSkeletonPath = nil
        skeletonView.stopSkeletonShimmer()
        skeletonView.layer.removeAllAnimations()
        
        UIView.animate(withDuration: 0.20, animations: {
            self.skeletonView.alpha = 0.0
        }) { _ in
            self.skeletonView.isHidden = true
        }
    }
    
    private func startPulseAnimation() {
        skeletonView.alpha = 1.0
        let isDark = self.isDarkMode
        skeletonView.startSkeletonShimmer(isDark: isDark)
    }
    
    private func stopPulseAnimation() {
        skeletonView.stopSkeletonShimmer()
        skeletonView.layer.removeAllAnimations()
    }
    
    private func startBellAnimationLoop() {
        guard bellAnimationTimer == nil else { return }
        bellAnimationTimer = Timer.scheduledTimer(withTimeInterval: 3.5, repeats: true) { [weak self] _ in
            self?.triggerSingleBellRing()
        }
        triggerSingleBellRing()
    }

    private func stopBellAnimationLoop() {
        bellAnimationTimer?.invalidate()
        bellAnimationTimer = nil
        if let bellView = notificationButton.imageView {
            bellView.layer.removeAnimation(forKey: "ringing")
            bellView.layer.anchorPoint = CGPoint(x: 0.5, y: 0.5)
            bellView.transform = .identity
        }
        notificationBadge.layer.removeAnimation(forKey: "badgePulse")
    }

    private func triggerSingleBellRing() {
        guard let bellView = notificationButton.imageView, !notificationBadge.isHidden else { return }
        
        // Bell rotation animation pivoting from the bell's top anchor
        bellView.layer.anchorPoint = CGPoint(x: 0.5, y: 0.15)
        let swing = CAKeyframeAnimation(keyPath: "transform.rotation.z")
        swing.values = [0, -0.35, 0.30, -0.22, 0.16, -0.09, 0.04, 0]
        swing.keyTimes = [0, 0.15, 0.30, 0.45, 0.60, 0.75, 0.90, 1.0]
        swing.duration = 1.0
        swing.timingFunction = CAMediaTimingFunction(name: .easeInEaseOut)
        
        // Badge subtle pulse animation that synchronizes with the ring
        let badgePulse = CAKeyframeAnimation(keyPath: "transform.scale")
        badgePulse.values = [1.0, 1.25, 0.95, 1.15, 1.0]
        badgePulse.keyTimes = [0, 0.20, 0.45, 0.70, 1.0]
        badgePulse.duration = 0.9
        badgePulse.timingFunction = CAMediaTimingFunction(name: .easeInEaseOut)
        
        bellView.layer.add(swing, forKey: "ringing")
        notificationBadge.layer.add(badgePulse, forKey: "badgePulse")
    }

    private func fetchNotificationCount() {
        guard let token = KeychainManager.read(forKey: KeychainManager.tokenKey) else {
            DispatchQueue.main.async {
                self.notificationBadge.isHidden = true
                self.stopBellAnimationLoop()
            }
            return
        }

        guard let url = URL(string: baseUrl + "/api/notifications") else { return }
        var request = URLRequest(url: url)
        request.setValue("token=\(token)", forHTTPHeaderField: "Cookie")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.httpMethod = "GET"
        request.timeoutInterval = 8.0

        URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            guard let self = self, let data = data, error == nil else { return }
            do {
                if let json = try JSONSerialization.jsonObject(with: data, options: []) as? [String: Any],
                   let arr = json["notifications"] as? [[String: Any]] {
                    
                    let lastSeen = UserDefaults.standard.double(forKey: "last_seen_notification_time")
                    var unread = 0
                    for n in arr {
                        if let createdStr = n["createdAt"] as? String {
                            let createdTime = self.parseIsoDateTime(createdStr)
                            if createdTime > lastSeen {
                                unread += 1
                            }
                        }
                    }
                    
                    DispatchQueue.main.async {
                        if unread > 0 {
                            self.notificationBadge.text = unread > 9 ? "+9" : "\(unread)"
                            self.notificationBadge.isHidden = false
                            self.startBellAnimationLoop()
                        } else {
                            self.notificationBadge.isHidden = true
                            self.stopBellAnimationLoop()
                        }
                    }
                }
            } catch {
                print("Error parsing notifications: \(error)")
            }
        }.resume()
    }

    private func parseIsoDateTime(_ isoString: String) -> Double {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = formatter.date(from: isoString) {
            return date.timeIntervalSince1970
        }
        
        let formatter2 = ISO8601DateFormatter()
        formatter2.formatOptions = [.withInternetDateTime]
        if let date = formatter2.date(from: isoString) {
            return date.timeIntervalSince1970
        }
        return 0
    }

    deinit {
        bellAnimationTimer?.invalidate()
        bellAnimationTimer = nil
        progressPollTimer?.invalidate()
        progressPollTimer = nil
        if let webView = self.webView {
            webView.removeObserver(self, forKeyPath: "URL")
            webView.removeObserver(self, forKeyPath: "estimatedProgress")
        }
    }
}

// MARK: – HelpPanelViewController
// Native bottom-sheet Help & Support panel, presented as a pageSheet that slides
// up from the bottom — matching the same interaction as notifications & More.
class HelpPanelViewController: UIViewController, MFMailComposeViewControllerDelegate {

    var isDarkMode: Bool = false
    /// Called when the user taps an in-app web route (e.g. Report a Bug).
    var onOpenWeb: ((String) -> Void)?

    private let titleLabel    = UILabel()
    private let subtitleLabel = UILabel()
    private let closeButton   = UIButton(type: .custom)
    private let scrollView    = UIScrollView()
    private let itemsStack    = UIStackView()

    private enum HelpItemType {
        case call(phone: String)
        case whatsapp(phone: String, message: String)
        case email(to: String, subject: String, body: String)
        case bugReport(path: String)
    }

    private struct HelpItem {
        let icon: String
        let title: String
        let subtitle: String
        let type: HelpItemType
    }

    private let helpItems: [HelpItem] = [
        HelpItem(
            icon: "phone.fill",
            title: "Call Support",
            subtitle: "+91 8402010207 • Tap to call",
            type: .call(phone: "+918402010207")
        ),
        HelpItem(
            icon: "message.fill",
            title: "WhatsApp Support",
            subtitle: "+91 8402010207 • Chat on WhatsApp",
            type: .whatsapp(
                phone: "918402010207",
                message: "Hello Patholab Cloud Support, I am using the Patholab Cloud app and need assistance with my account and lab operations."
            )
        ),
        HelpItem(
            icon: "envelope.fill",
            title: "Email Support",
            subtitle: "support@patholab.cloud • Pre-drafted ticket",
            type: .email(
                to: "support@patholab.cloud",
                subject: "Patholab Cloud Support Request",
                body: "Hello Support Team,\n\nI need assistance with my Patholab Cloud account.\n\nIssue Details:\n- Topic / Issue: \n- Lab Name: \n- Contact Number: \n\nPlease assist me at your earliest convenience.\n\nThank you,\nPatholab Cloud User"
            )
        ),
        HelpItem(
            icon: "ant.fill",
            title: "Report a Bug",
            subtitle: "Create a new support ticket",
            type: .bugReport(path: "/workspace/support?action=new-ticket&category=TECHNICAL")
        )
    ]

    override func viewDidLoad() {
        super.viewDidLoad()
        buildUI()
    }

    private func buildUI() {
        let slate900 = UIColor(red: 15/255,  green: 23/255,  blue: 42/255,  alpha: 1)
        let slate800 = UIColor(red: 30/255,  green: 41/255,  blue: 59/255,  alpha: 1)
        let slate700 = UIColor(red: 51/255,  green: 65/255,  blue: 85/255,  alpha: 1)
        let slate100 = UIColor(red: 241/255, green: 245/255, blue: 249/255, alpha: 1)
        let textP    = isDarkMode ? UIColor.white : UIColor(red: 15/255, green: 23/255, blue: 42/255, alpha: 1)
        let textS    = UIColor(red: 100/255, green: 116/255, blue: 139/255, alpha: 1)
        let bg       = isDarkMode ? slate900 : UIColor.white
        let card     = isDarkMode ? slate800 : slate100
        let border   = isDarkMode ? slate700 : UIColor(white: 0.90, alpha: 1)
        let accent   = UIColor(red: 79/255,  green: 70/255,  blue: 229/255, alpha: 1) // App's unified indigo theme

        view.backgroundColor = bg

        // ── Header row
        titleLabel.text = "Help & Support"
        titleLabel.font = .systemFont(ofSize: 18, weight: .bold)
        titleLabel.textColor = textP
        titleLabel.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(titleLabel)

        subtitleLabel.text = "Get direct assistance or create a support ticket."
        subtitleLabel.font = .systemFont(ofSize: 12)
        subtitleLabel.textColor = textS
        subtitleLabel.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(subtitleLabel)

        closeButton.setImage(UIImage(systemName: "xmark.circle.fill"), for: .normal)
        closeButton.tintColor = textS
        closeButton.addTarget(self, action: #selector(closeTapped), for: .touchUpInside)
        closeButton.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(closeButton)

        // ── Divider
        let divider = UIView()
        divider.backgroundColor = border
        divider.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(divider)

        // ── Scroll view
        scrollView.showsVerticalScrollIndicator = false
        scrollView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(scrollView)

        itemsStack.axis    = .vertical
        itemsStack.spacing = 10
        itemsStack.translatesAutoresizingMaskIntoConstraints = false
        scrollView.addSubview(itemsStack)

        for (index, item) in helpItems.enumerated() {
            itemsStack.addArrangedSubview(
                makeItemRow(index: index, item: item, card: card, border: border, textP: textP, textS: textS, accent: accent)
            )
        }

        NSLayoutConstraint.activate([
            titleLabel.topAnchor.constraint(equalTo: view.topAnchor, constant: 16),
            titleLabel.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 20),
            titleLabel.trailingAnchor.constraint(lessThanOrEqualTo: closeButton.leadingAnchor, constant: -8),

            subtitleLabel.topAnchor.constraint(equalTo: titleLabel.bottomAnchor, constant: 2),
            subtitleLabel.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 20),
            subtitleLabel.trailingAnchor.constraint(lessThanOrEqualTo: closeButton.leadingAnchor, constant: -8),

            closeButton.topAnchor.constraint(equalTo: view.topAnchor, constant: 16),
            closeButton.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -20),
            closeButton.widthAnchor.constraint(equalToConstant: 30),
            closeButton.heightAnchor.constraint(equalToConstant: 30),

            divider.topAnchor.constraint(equalTo: subtitleLabel.bottomAnchor, constant: 10),
            divider.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            divider.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            divider.heightAnchor.constraint(equalToConstant: 0.5),

            scrollView.topAnchor.constraint(equalTo: divider.bottomAnchor, constant: 10),
            scrollView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            scrollView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            scrollView.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor),

            itemsStack.topAnchor.constraint(equalTo: scrollView.contentLayoutGuide.topAnchor),
            itemsStack.leadingAnchor.constraint(equalTo: scrollView.contentLayoutGuide.leadingAnchor, constant: 16),
            itemsStack.trailingAnchor.constraint(equalTo: scrollView.contentLayoutGuide.trailingAnchor, constant: -16),
            itemsStack.bottomAnchor.constraint(equalTo: scrollView.contentLayoutGuide.bottomAnchor, constant: -10),
            itemsStack.widthAnchor.constraint(equalTo: scrollView.frameLayoutGuide.widthAnchor, constant: -32)
        ])
    }

    private func makeItemRow(index: Int, item: HelpItem, card: UIColor, border: UIColor, textP: UIColor, textS: UIColor, accent: UIColor) -> UIView {
        let container = UIView()
        container.tag = index
        container.backgroundColor = card
        container.layer.cornerRadius = 14
        container.layer.borderWidth = 1
        container.layer.borderColor = border.cgColor
        container.isUserInteractionEnabled = true
        container.translatesAutoresizingMaskIntoConstraints = false

        // Icon background circle with unified app theme accent
        let iconBg = UIView()
        iconBg.backgroundColor = accent.withAlphaComponent(isDarkMode ? 0.20 : 0.12)
        iconBg.layer.cornerRadius = 10
        iconBg.translatesAutoresizingMaskIntoConstraints = false

        let iconView = UIImageView(image: UIImage(systemName: item.icon))
        iconView.tintColor = accent
        iconView.contentMode = .scaleAspectFit
        iconView.translatesAutoresizingMaskIntoConstraints = false
        iconBg.addSubview(iconView)

        // Text stack
        let titleLbl = UILabel()
        titleLbl.text = item.title
        titleLbl.font = .systemFont(ofSize: 15, weight: .semibold)
        titleLbl.textColor = textP

        let subLbl = UILabel()
        subLbl.text = item.subtitle
        subLbl.font = .systemFont(ofSize: 12)
        subLbl.textColor = textS

        let textStack = UIStackView(arrangedSubviews: [titleLbl, subLbl])
        textStack.axis    = .vertical
        textStack.spacing = 2

        // Trailing chevron
        let chevron = UIImageView(image: UIImage(systemName: "chevron.right"))
        chevron.tintColor = textS
        chevron.contentMode = .scaleAspectFit
        chevron.translatesAutoresizingMaskIntoConstraints = false

        let rowStack = UIStackView(arrangedSubviews: [iconBg, textStack, chevron])
        rowStack.axis      = .horizontal
        rowStack.spacing   = 14
        rowStack.alignment = .center
        rowStack.translatesAutoresizingMaskIntoConstraints = false
        container.addSubview(rowStack)

        NSLayoutConstraint.activate([
            iconBg.widthAnchor.constraint(equalToConstant: 38),
            iconBg.heightAnchor.constraint(equalToConstant: 38),
            iconView.centerXAnchor.constraint(equalTo: iconBg.centerXAnchor),
            iconView.centerYAnchor.constraint(equalTo: iconBg.centerYAnchor),
            iconView.widthAnchor.constraint(equalToConstant: 18),
            iconView.heightAnchor.constraint(equalToConstant: 18),
            chevron.widthAnchor.constraint(equalToConstant: 12),
            chevron.heightAnchor.constraint(equalToConstant: 14),
            rowStack.topAnchor.constraint(equalTo: container.topAnchor, constant: 10),
            rowStack.bottomAnchor.constraint(equalTo: container.bottomAnchor, constant: -10),
            rowStack.leadingAnchor.constraint(equalTo: container.leadingAnchor, constant: 12),
            rowStack.trailingAnchor.constraint(equalTo: container.trailingAnchor, constant: -12)
        ])

        let tap = UITapGestureRecognizer(target: self, action: #selector(itemTapped(_:)))
        container.addGestureRecognizer(tap)
        return container
    }

    @objc private func itemTapped(_ gesture: UITapGestureRecognizer) {
        guard let container = gesture.view, container.tag < helpItems.count else { return }
        let item = helpItems[container.tag]

        // Subtle press animation
        UIView.animate(withDuration: 0.1, animations: { container.alpha = 0.6 }) { _ in
            UIView.animate(withDuration: 0.12) { container.alpha = 1.0 }
        }

        switch item.type {
        case .call(let phone):
            openDialer(phone: phone)
        case .whatsapp(let phone, let message):
            openWhatsApp(phone: phone, message: message)
        case .email(let to, let subject, let body):
            openEmail(to: to, subject: subject, body: body)
        case .bugReport(let path):
            dismiss(animated: true) { [weak self] in
                self?.onOpenWeb?(path)
            }
        }
    }

    private func openDialer(phone: String) {
        let cleaned = phone.replacingOccurrences(of: " ", with: "")
        if let url = URL(string: "tel://\(cleaned)") ?? URL(string: "tel:\(cleaned)") {
            UIApplication.shared.open(url, options: [:]) { [weak self] success in
                if !success {
                    let alert = UIAlertController(
                        title: "Call Support",
                        message: "Support Number: \(phone)\n(Phone calling is not available on this device)",
                        preferredStyle: .alert
                    )
                    alert.addAction(UIAlertAction(title: "Copy Number", style: .default) { _ in
                        UIPasteboard.general.string = phone
                    })
                    alert.addAction(UIAlertAction(title: "OK", style: .cancel))
                    self?.present(alert, animated: true)
                }
            }
        }
    }

    private func openWhatsApp(phone: String, message: String) {
        let encodedMsg = message.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""
        if let url = URL(string: "https://wa.me/\(phone)?text=\(encodedMsg)") {
            UIApplication.shared.open(url, options: [:], completionHandler: nil)
        }
    }

    private func openEmail(to: String, subject: String, body: String) {
        if MFMailComposeViewController.canSendMail() {
            let mailVC = MFMailComposeViewController()
            mailVC.mailComposeDelegate = self
            mailVC.setToRecipients([to])
            mailVC.setSubject(subject)
            mailVC.setMessageBody(body, isHTML: false)
            present(mailVC, animated: true)
        } else {
            // Attempt standard mailto URL
            var components = URLComponents()
            components.scheme = "mailto"
            components.path = to
            components.queryItems = [
                URLQueryItem(name: "subject", value: subject),
                URLQueryItem(name: "body", value: body)
            ]
            if let mailtoUrl = components.url, UIApplication.shared.canOpenURL(mailtoUrl) {
                UIApplication.shared.open(mailtoUrl, options: [:], completionHandler: nil)
            } else {
                // Informative fallback sheet allowing 1-tap copy of address & drafted template
                let alert = UIAlertController(
                    title: "Email Support",
                    message: "Support Email: \(to)\n\nNo mail client is currently configured on this device/simulator.",
                    preferredStyle: .alert
                )
                alert.addAction(UIAlertAction(title: "Copy Email Address", style: .default) { _ in
                    UIPasteboard.general.string = to
                })
                alert.addAction(UIAlertAction(title: "Copy Draft Template", style: .default) { _ in
                    UIPasteboard.general.string = "Subject: \(subject)\n\n\(body)"
                })
                alert.addAction(UIAlertAction(title: "OK", style: .cancel))
                present(alert, animated: true)
            }
        }
    }

    // MARK: – MFMailComposeViewControllerDelegate
    func mailComposeController(_ controller: MFMailComposeViewController, didFinishWith result: MFMailComposeResult, error: Error?) {
        controller.dismiss(animated: true)
    }

    @objc private func closeTapped() {
        dismiss(animated: true)
    }
}


            layer.shadowColor = UIColor.black.cgColor
            layer.shadowOpacity = 0.03
            layer.shadowOffset = CGSize(width: 0, height: 2)
            layer.shadowRadius = 6
        }
    }
}


