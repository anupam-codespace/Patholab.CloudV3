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

                var css = 'html { -webkit-text-size-adjust: 100%; touch-action: pan-x pan-y pinch-zoom; scroll-behavior: smooth; } html, body { padding-top: 0 !important; margin-top: 0 !important; -webkit-overflow-scrolling: touch !important; overscroll-behavior-y: none !important; -webkit-tap-highlight-color: transparent !important; } .mobile-app-header-web-component, header, .sticky.top-0 { display: none !important; } main, .is-native-app main, .is-capacitor main { padding-top: var(--native-top-padding, 160px) !important; margin-top: 0px !important; padding-bottom: 84px !important; min-height: 100%; -webkit-overflow-scrolling: touch; } .overflow-x-auto { -webkit-overflow-scrolling: touch !important; overscroll-behavior-x: contain !important; touch-action: pan-x pan-y !important; scrollbar-width: none !important; } .overflow-x-auto::-webkit-scrollbar { display: none !important; }';
                var style = document.createElement('style');
                style.id = 'native-layout-padding-style';
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

        // NOTE: Initial navigation is deferred to viewDidAppear so the WebView
        // has a real frame before loading. Calling webView.load() with a zero frame
        // causes WKWebView to freeze (the WebKit renderer never updates visibleContentRect).
    }

    // Flag to ensure the initial tab load + timers are set up exactly once.
    private var initialLoadDone = false

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        guard !initialLoadDone else { return }
        initialLoadDone = true

        // Force layout so webView.frame is correct before first load
        view.setNeedsLayout()
        view.layoutIfNeeded()

        // Now the WebView has a valid frame — safe to navigate
        selectTab(0)

        // Polling timer: monitor page load state / React-Query spinner
        progressPollTimer = Timer.scheduledTimer(withTimeInterval: 0.1, repeats: true) { [weak self] _ in
            self?.checkWebViewProgress()
        }

        // Polling timer: sync theme with web view class state
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

        syncWebLayoutPadding()

        CATransaction.begin()
        CATransaction.setDisableActions(true)
        headerBlurEffectView.frame = headerBlurContainer.bounds
        headerGradientLayer.frame  = headerBlurContainer.bounds
        headerMaskLayer.frame      = headerBlurContainer.bounds
        CATransaction.commit()
    }

    private func getNativeTopPadding() -> Int {
        let topY = topLayoutContainer.frame.maxY
        if topY > 0 {
            return Int(ceil(topY))
        }
        let safeTop = view.safeAreaInsets.top > 0 ? view.safeAreaInsets.top : 48
        let containerHeight: CGFloat = walletCardView.isHidden ? 56 : 106
        return Int(ceil(safeTop + containerHeight))
    }

    private func syncWebLayoutPadding() {
        guard let webView = self.webView else { return }
        let topPadding = getNativeTopPadding()
        let isDark = self.isDarkMode
        let js = """
        (function() {
            var styleId = 'native-layout-padding-style';
            var style = document.getElementById(styleId);
            if (!style) {
                style = document.createElement('style');
                style.id = styleId;
                document.head.appendChild(style);
            }
            style.innerHTML = 'html, body { padding-top: 0 !important; margin-top: 0 !important; } .mobile-app-header-web-component, header, .sticky.top-0 { display: none !important; } main, .is-native-app main, .is-capacitor main { padding-top: \(topPadding)px !important; margin-top: 0px !important; padding-bottom: 84px !important; }';
            document.documentElement.style.setProperty('--native-top-padding', '\(topPadding)px');
            
            // Continuous dark mode enforcement across SPA route switches and new page loads
            var isDark = \(isDark ? "true" : "false");
            var theme = isDark ? 'dark' : 'light';
            if (isDark) {
                if (!document.documentElement.classList.contains('dark')) {
                    document.documentElement.classList.add('dark');
                }
            } else {
                if (document.documentElement.classList.contains('dark')) {
                    document.documentElement.classList.remove('dark');
                }
            }
            if (localStorage.getItem('theme') !== theme) {
                localStorage.setItem('theme', theme);
            }
            if (window.patholabSetTheme) {
                window.patholabSetTheme(theme);
            }
        })()
        """
        webView.evaluateJavaScript(js, completionHandler: nil)
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
            if !walletCardView.isHidden {
                walletCardView.isHidden = true
                syncWebLayoutPadding()
            }
            return
        }

        if walletCardView.isHidden {
            walletCardView.isHidden = false
            syncWebLayoutPadding()
        }
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
        // ── Container
        bottomNavBar.backgroundColor    = .white
        bottomNavBar.translatesAutoresizingMaskIntoConstraints = false
        // Shadow
        bottomNavBar.layer.shadowColor   = UIColor.black.cgColor
        bottomNavBar.layer.shadowOpacity = 0.08
        bottomNavBar.layer.shadowOffset  = CGSize(width: 0, height: -2)
        bottomNavBar.layer.shadowRadius  = 4
        view.addSubview(bottomNavBar)

        // ── Top separator
        bottomBorder.backgroundColor = UIColor(white: 0.88, alpha: 1)
        bottomBorder.translatesAutoresizingMaskIntoConstraints = false
        bottomNavBar.addSubview(bottomBorder)

        // ── Items stack (fills top 56pt, below that is safe-area padding)
        navStack.axis        = .horizontal
        navStack.distribution = .fillEqually
        navStack.translatesAutoresizingMaskIntoConstraints = false
        bottomNavBar.addSubview(navStack)

        let items: [(String, String, Int)] = [
            ("Dashboard",  "house",                  0),
            ("Patients",   "person.2",               1),
            ("Categories", "square.grid.2x2",        2),
            ("More",       "ellipsis.circle",        3)
        ]
        items.forEach { navStack.addArrangedSubview(makeNavButton(title: $0.0, icon: $0.1, tag: $0.2)) }

        // ── Constraints
        let initHeight: CGFloat = 56 + (view.safeAreaInsets.bottom > 0 ? view.safeAreaInsets.bottom : 34)
        bottomNavHeightConstraint = bottomNavBar.heightAnchor.constraint(equalToConstant: initHeight)

        NSLayoutConstraint.activate([
            bottomNavBar.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            bottomNavBar.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            bottomNavBar.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            bottomNavHeightConstraint,

            bottomBorder.topAnchor.constraint(equalTo: bottomNavBar.topAnchor),
            bottomBorder.leadingAnchor.constraint(equalTo: bottomNavBar.leadingAnchor),
            bottomBorder.trailingAnchor.constraint(equalTo: bottomNavBar.trailingAnchor),
            bottomBorder.heightAnchor.constraint(equalToConstant: 0.5),

            navStack.topAnchor.constraint(equalTo: bottomNavBar.topAnchor),
            navStack.leadingAnchor.constraint(equalTo: bottomNavBar.leadingAnchor),
            navStack.trailingAnchor.constraint(equalTo: bottomNavBar.trailingAnchor),
            navStack.heightAnchor.constraint(equalToConstant: 56)
        ])
    }

    private func makeNavButton(title: String, icon: String, tag: Int) -> UIButton {
        let btn = UIButton(type: .custom)
        var cfg = UIButton.Configuration.plain()
        cfg.image            = UIImage(systemName: icon)
        cfg.title            = title
        cfg.imagePlacement   = .top
        cfg.imagePadding     = 4
        cfg.baseForegroundColor = .gray
        if #available(iOS 15, *) {
            cfg.titleTextAttributesTransformer = UIConfigurationTextAttributesTransformer { attr in
                var a = attr; a.font = UIFont.systemFont(ofSize: 10, weight: .medium); return a
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
                color = isDarkMode ? UIColor(red: 129/255, green: 140/255, blue: 248/255, alpha: 1) : UIColor(red: 55/255, green: 48/255, blue: 163/255, alpha: 1)
            } else {
                color = isDarkMode ? UIColor(red: 148/255, green: 163/255, blue: 184/255, alpha: 1) : UIColor(white: 0.55, alpha: 1)
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
            headerTitleLabel.text = getHeaderTitle(for: "/workspace/analytics")
            showWeb(path: "/workspace/analytics")
        case 1:
            headerTitleLabel.text = "PATIENT WORKLIST"
            showWeb(path: "/workspace/patients")
        case 2:
            headerTitleLabel.text = "CATEGORIES"
            showWeb(path: "/workspace/test-management")
        case 3:
            showMorePanel()
        default:
            break
        }
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
        if let url = URL(string: baseUrl + path) {
            checkRouteAndUpdateUI(url: url)
        }
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
            walletWrapper.topAnchor.constraint(equalTo: walletCardView.topAnchor, constant: -4),
            walletWrapper.bottomAnchor.constraint(equalTo: walletCardView.bottomAnchor, constant: -6),
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
            webView.evaluateJavaScript("""
            (function() {
                var isDark = \(newDark ? "true" : "false");
                if (isDark) {
                    document.documentElement.classList.add('dark');
                    localStorage.setItem('theme', 'dark');
                } else {
                    document.documentElement.classList.remove('dark');
                    localStorage.setItem('theme', 'light');
                }
                var btn = document.querySelector('.mobile-app-header-web-component button[aria-label="Toggle dark mode"]') || document.querySelector('[aria-label="Toggle dark mode"]');
                if (btn) { btn.click(); }
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
            checkRouteAndUpdateUI(url: url)
        }
        if keyPath == "estimatedProgress" {
            checkWebViewProgress()
        }
    }

    private func injectWebHeaderHider() {
        syncWebLayoutPadding()
    }

    private var isBottomNavHidden = false

    private func setBottomNav(visible: Bool, animated: Bool) {
        let shouldHide = !visible
        guard isBottomNavHidden != shouldHide else { return }
        isBottomNavHidden = shouldHide

        let targetTransform = shouldHide
            ? CGAffineTransform(translationX: 0, y: bottomNavHeightConstraint.constant + 24)
            : .identity
        let targetAlpha: CGFloat = shouldHide ? 0.0 : 1.0

        if animated {
            if !shouldHide {
                self.bottomNavBar.isHidden = false
            }
            UIView.animate(withDuration: 0.28, delay: 0, options: [.curveEaseInOut, .allowUserInteraction], animations: {
                self.bottomNavBar.transform = targetTransform
                self.bottomNavBar.alpha = targetAlpha
            }) { _ in
                if shouldHide {
                    self.bottomNavBar.isHidden = true
                }
            }
        } else {
            bottomNavBar.transform = targetTransform
            bottomNavBar.alpha = targetAlpha
            bottomNavBar.isHidden = shouldHide
        }
    }

    private func checkRouteAndUpdateUI(url: URL) {
        let path = url.path.lowercased()
        let query = url.query?.lowercased() ?? ""
        let host = url.host?.lowercased() ?? ""
        
        let isRecharge = path.contains("/wallet/recharge") ||
                         path.contains("/recharge") ||
                         query.contains("action=recharge") ||
                         query.contains("action=topup") ||
                         query.contains("recharge=true") ||
                         host.contains("cashfree") ||
                         host.contains("razorpay")

        if isRecharge {
            setBottomNav(visible: false, animated: true)
            if !walletCardView.isHidden {
                walletCardView.isHidden = true
                syncWebLayoutPadding()
            }
        } else {
            setBottomNav(visible: true, animated: true)
        }
    }

    private func checkRechargeAndPaymentState() {
        guard let webView = self.webView else { return }
        
        let js = """
        (function() {
            var path = window.location.pathname || '';
            var search = window.location.search || '';
            if (path.includes('/recharge') || path.includes('/wallet/recharge') || search.includes('action=recharge') || search.includes('action=topup')) {
                return true;
            }
            var hasPaymentModal = document.querySelector('iframe[src*=\"cashfree\"], iframe[src*=\"razorpay\"], .cashfree-modal, [class*=\"payment-modal\"], [class*=\"cashfree\"], [data-payment-overlay=\"true\"]') !== null;
            if (hasPaymentModal) return true;
            var headings = document.querySelectorAll('h1, h2, h3, div');
            for (var i = 0; i < Math.min(headings.length, 30); i++) {
                if (headings[i].textContent && (headings[i].textContent.includes('Processing your payment') || headings[i].textContent.includes('Payment Options'))) return true;
            }
            return false;
        })()
        """
        webView.evaluateJavaScript(js) { [weak self] (result, _) in
            guard let self = self else { return }
            let isRecharge = (result as? Bool) ?? false
            if isRecharge {
                self.setBottomNav(visible: false, animated: true)
                if !self.walletCardView.isHidden {
                    self.walletCardView.isHidden = true
                    self.syncWebLayoutPadding()
                }
            } else if let url = self.webView?.url {
                self.checkRouteAndUpdateUI(url: url)
            }
        }
    }

    private func checkWebViewProgress() {
        guard let webView = self.webView else { return }
        
        self.injectWebHeaderHider()
        self.checkRechargeAndPaymentState()
        
        let progress = webView.estimatedProgress
        if progress >= 0.80 {
            // Verify if DOM actually contains body elements before fading out skeleton
            webView.evaluateJavaScript("document.body && document.body.innerText.length > 5") { [weak self] (result, _) in
                if let ready = result as? Bool, ready {
                    DispatchQueue.main.async {
                        self?.hideSkeleton()
                    }
                } else if progress >= 0.95 {
                    DispatchQueue.main.async {
                        self?.hideSkeleton()
                    }
                }
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

        // ── Offline view update
        offlineView.backgroundColor = isDark ? slate900 : UIColor(red: 248/255, green: 250/255, blue: 252/255, alpha: 1)

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
            
            // Recursively update theme across active skeleton blocks
            func updateSkeletonThemes(in v: UIView) {
                if let block = v as? SkeletonBlockView {
                    block.updateTheme(isDark: isDark)
                } else if let card = v as? SkeletonCardView {
                    card.updateTheme(isDark: isDark)
                }
                for sub in v.subviews {
                    updateSkeletonThemes(in: sub)
                }
            }
            updateSkeletonThemes(in: skeletonView)
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
        skeletonView.backgroundColor = isDarkMode
            ? UIColor(red: 15/255, green: 23/255, blue: 42/255, alpha: 1)
            : UIColor(red: 248/255, green: 250/255, blue: 252/255, alpha: 1)
        skeletonView.isHidden = true
        view.addSubview(skeletonView)
        
        NSLayoutConstraint.activate([
            skeletonView.topAnchor.constraint(equalTo: topLayoutContainer.bottomAnchor),
            skeletonView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            skeletonView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            skeletonView.bottomAnchor.constraint(equalTo: bottomNavBar.topAnchor)
        ])
    }

    private func createShimmerLine(width: CGFloat?, height: CGFloat, cornerRadius: CGFloat? = nil, isDark: Bool) -> SkeletonBlockView {
        let rad = cornerRadius ?? (height / 2.0)
        let block = SkeletonBlockView(cornerRadius: rad, isDark: isDark)
        block.translatesAutoresizingMaskIntoConstraints = false
        if let w = width {
            block.widthAnchor.constraint(equalToConstant: w).isActive = true
        }
        block.heightAnchor.constraint(equalToConstant: height).isActive = true
        return block
    }
    
    private func createShimmerCircle(size: CGFloat, isDark: Bool) -> SkeletonBlockView {
        let block = SkeletonBlockView(cornerRadius: size / 2.0, isDark: isDark)
        block.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            block.widthAnchor.constraint(equalToConstant: size),
            block.heightAnchor.constraint(equalToConstant: size)
        ])
        return block
    }

    private func createShimmerPill(width: CGFloat, height: CGFloat, isDark: Bool) -> SkeletonBlockView {
        let block = SkeletonBlockView(cornerRadius: height / 2.0, isDark: isDark)
        block.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            block.widthAnchor.constraint(equalToConstant: width),
            block.heightAnchor.constraint(equalToConstant: height)
        ])
        return block
    }
    
    private func createCardWrapper(isDark: Bool) -> SkeletonCardView {
        return SkeletonCardView(cornerRadius: 16, isDark: isDark)
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
        if p.contains("categories") || p.contains("catalog") || p.contains("analyzers") || p.contains("machines") || p.contains("inventory") || p.contains("b2b") || p.contains("test-management") {
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

    private var skeletonShowTimestamp: Date?

    private func showSkeleton(for path: String) {
        let category = getSkeletonCategory(for: path)
        if let currentPath = activeSkeletonPath, getSkeletonCategory(for: currentPath) == category && !skeletonView.isHidden {
            return
        }
        activeSkeletonPath = path
        skeletonShowTimestamp = Date()
        
        let isDark = self.isDarkMode
        skeletonView.backgroundColor = isDark ? UIColor(red: 15/255, green: 23/255, blue: 42/255, alpha: 1) : UIColor(red: 248/255, green: 250/255, blue: 252/255, alpha: 1)
        
        // Remove existing subviews in skeletonView
        skeletonView.subviews.forEach { $0.removeFromSuperview() }
        
        let scrollView = UIScrollView()
        scrollView.translatesAutoresizingMaskIntoConstraints = false
        scrollView.showsVerticalScrollIndicator = false
        scrollView.alwaysBounceVertical = true
        skeletonView.addSubview(scrollView)
        
        let mainStack = UIStackView()
        mainStack.axis = .vertical
        mainStack.spacing = 14
        mainStack.translatesAutoresizingMaskIntoConstraints = false
        scrollView.addSubview(mainStack)
        
        NSLayoutConstraint.activate([
            scrollView.topAnchor.constraint(equalTo: skeletonView.topAnchor),
            scrollView.leadingAnchor.constraint(equalTo: skeletonView.leadingAnchor),
            scrollView.trailingAnchor.constraint(equalTo: skeletonView.trailingAnchor),
            scrollView.bottomAnchor.constraint(equalTo: skeletonView.bottomAnchor),
            
            mainStack.topAnchor.constraint(equalTo: scrollView.contentLayoutGuide.topAnchor, constant: 14),
            mainStack.leadingAnchor.constraint(equalTo: scrollView.contentLayoutGuide.leadingAnchor, constant: 14),
            mainStack.trailingAnchor.constraint(equalTo: scrollView.contentLayoutGuide.trailingAnchor, constant: -14),
            mainStack.bottomAnchor.constraint(equalTo: scrollView.contentLayoutGuide.bottomAnchor, constant: -24),
            mainStack.widthAnchor.constraint(equalTo: scrollView.frameLayoutGuide.widthAnchor, constant: -28)
        ])
        
        switch category {
        case "dashboard":
            buildDashboardSkeleton(in: mainStack, isDark: isDark)
        case "list":
            buildListSkeleton(in: mainStack, isDark: isDark)
        case "form":
            buildFormSkeleton(in: mainStack, isDark: isDark)
        case "grid":
            buildGridSkeleton(in: mainStack, isDark: isDark)
        case "detail":
            buildDetailSkeleton(in: mainStack, isDark: isDark)
        case "settings":
            buildSettingsSkeleton(in: mainStack, isDark: isDark)
        default:
            buildDashboardSkeleton(in: mainStack, isDark: isDark)
        }
        
        skeletonView.layer.removeAllAnimations()
        skeletonView.alpha = 0.0
        skeletonView.isHidden = false
        
        UIView.animate(withDuration: 0.18, delay: 0, options: [.curveEaseOut, .allowUserInteraction]) {
            self.skeletonView.alpha = 1.0
        }

        // Hard safety timeout: auto-hide skeleton after at most 1.8s so user is NEVER stuck
        skeletonTimeoutTimer?.invalidate()
        skeletonTimeoutTimer = Timer.scheduledTimer(withTimeInterval: 1.8, repeats: false) { [weak self] _ in
            self?.hideSkeleton()
        }
    }

    // ── 1. DASHBOARD / FINANCIAL ANALYTICS SKELETON ────────────────────────────
    private func buildDashboardSkeleton(in mainStack: UIStackView, isDark: Bool) {
        // Welcome Header Banner Card
        let welcome = createCardWrapper(isDark: isDark)
        let wTopStack = UIStackView()
        wTopStack.axis = .horizontal
        wTopStack.alignment = .center
        wTopStack.distribution = .equalSpacing
        wTopStack.translatesAutoresizingMaskIntoConstraints = false
        welcome.addSubview(wTopStack)
        
        let wText = UIStackView(arrangedSubviews: [
            createShimmerLine(width: 180, height: 18, isDark: isDark),
            createShimmerLine(width: 120, height: 12, isDark: isDark)
        ])
        wText.axis = .vertical
        wText.spacing = 6
        wTopStack.addArrangedSubview(wText)
        
        let wPill = createShimmerPill(width: 76, height: 26, isDark: isDark)
        wTopStack.addArrangedSubview(wPill)
        
        NSLayoutConstraint.activate([
            wTopStack.topAnchor.constraint(equalTo: welcome.topAnchor, constant: 16),
            wTopStack.bottomAnchor.constraint(equalTo: welcome.bottomAnchor, constant: -16),
            wTopStack.leadingAnchor.constraint(equalTo: welcome.leadingAnchor, constant: 16),
            wTopStack.trailingAnchor.constraint(equalTo: welcome.trailingAnchor, constant: -16)
        ])
        mainStack.addArrangedSubview(welcome)
        
        // 2x2 Grid of KPI Metrics Cards
        let gridH1 = UIStackView()
        gridH1.axis = .horizontal
        gridH1.spacing = 12
        gridH1.distribution = .fillEqually
        for w in [90, 85] {
            let card = createCardWrapper(isDark: isDark)
            let cStack = UIStackView()
            cStack.axis = .vertical
            cStack.spacing = 8
            cStack.translatesAutoresizingMaskIntoConstraints = false
            card.addSubview(cStack)
            
            let topRow = UIStackView(arrangedSubviews: [
                createShimmerCircle(size: 34, isDark: isDark),
                createShimmerPill(width: 44, height: 18, isDark: isDark)
            ])
            topRow.axis = .horizontal
            topRow.distribution = .equalSpacing
            cStack.addArrangedSubview(topRow)
            
            cStack.addArrangedSubview(createShimmerLine(width: CGFloat(w), height: 20, isDark: isDark))
            cStack.addArrangedSubview(createShimmerLine(width: CGFloat(w - 20), height: 11, isDark: isDark))
            
            NSLayoutConstraint.activate([
                cStack.topAnchor.constraint(equalTo: card.topAnchor, constant: 14),
                cStack.bottomAnchor.constraint(equalTo: card.bottomAnchor, constant: -14),
                cStack.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 14),
                cStack.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -14)
            ])
            gridH1.addArrangedSubview(card)
        }
        mainStack.addArrangedSubview(gridH1)

        let gridH2 = UIStackView()
        gridH2.axis = .horizontal
        gridH2.spacing = 12
        gridH2.distribution = .fillEqually
        for w in [80, 95] {
            let card = createCardWrapper(isDark: isDark)
            let cStack = UIStackView()
            cStack.axis = .vertical
            cStack.spacing = 8
            cStack.translatesAutoresizingMaskIntoConstraints = false
            card.addSubview(cStack)
            
            let topRow = UIStackView(arrangedSubviews: [
                createShimmerCircle(size: 34, isDark: isDark),
                createShimmerPill(width: 44, height: 18, isDark: isDark)
            ])
            topRow.axis = .horizontal
            topRow.distribution = .equalSpacing
            cStack.addArrangedSubview(topRow)
            
            cStack.addArrangedSubview(createShimmerLine(width: CGFloat(w), height: 20, isDark: isDark))
            cStack.addArrangedSubview(createShimmerLine(width: CGFloat(w - 25), height: 11, isDark: isDark))
            
            NSLayoutConstraint.activate([
                cStack.topAnchor.constraint(equalTo: card.topAnchor, constant: 14),
                cStack.bottomAnchor.constraint(equalTo: card.bottomAnchor, constant: -14),
                cStack.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 14),
                cStack.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -14)
            ])
            gridH2.addArrangedSubview(card)
        }
        mainStack.addArrangedSubview(gridH2)

        // Revenue / Volume Chart Analytics Card
        let chartCard = createCardWrapper(isDark: isDark)
        let chartHead = UIStackView(arrangedSubviews: [
            createShimmerLine(width: 150, height: 16, isDark: isDark),
            createShimmerPill(width: 60, height: 22, isDark: isDark)
        ])
        chartHead.axis = .horizontal
        chartHead.distribution = .equalSpacing
        chartHead.translatesAutoresizingMaskIntoConstraints = false
        chartCard.addSubview(chartHead)
        
        let barStack = UIStackView()
        barStack.axis = .horizontal
        barStack.spacing = 12
        barStack.alignment = .bottom
        barStack.distribution = .fillEqually
        barStack.translatesAutoresizingMaskIntoConstraints = false
        chartCard.addSubview(barStack)
        
        let heights: [CGFloat] = [75, 120, 60, 140, 100, 160]
        for h in heights {
            let col = UIStackView()
            col.axis = .vertical
            col.alignment = .center
            col.spacing = 6
            
            let bar = createShimmerLine(width: nil, height: h, cornerRadius: 6, isDark: isDark)
            col.addArrangedSubview(bar)
            col.addArrangedSubview(createShimmerLine(width: 24, height: 8, isDark: isDark))
            barStack.addArrangedSubview(col)
        }
        
        NSLayoutConstraint.activate([
            chartHead.topAnchor.constraint(equalTo: chartCard.topAnchor, constant: 16),
            chartHead.leadingAnchor.constraint(equalTo: chartCard.leadingAnchor, constant: 16),
            chartHead.trailingAnchor.constraint(equalTo: chartCard.trailingAnchor, constant: -16),
            
            barStack.topAnchor.constraint(equalTo: chartHead.bottomAnchor, constant: 18),
            barStack.leadingAnchor.constraint(equalTo: chartCard.leadingAnchor, constant: 16),
            barStack.trailingAnchor.constraint(equalTo: chartCard.trailingAnchor, constant: -16),
            barStack.bottomAnchor.constraint(equalTo: chartCard.bottomAnchor, constant: -16)
        ])
        mainStack.addArrangedSubview(chartCard)
        
        // Recent Activity Card
        let actCard = createCardWrapper(isDark: isDark)
        let actStack = UIStackView()
        actStack.axis = .vertical
        actStack.spacing = 14
        actStack.translatesAutoresizingMaskIntoConstraints = false
        actCard.addSubview(actStack)
        
        actStack.addArrangedSubview(createShimmerLine(width: 140, height: 15, isDark: isDark))
        
        for _ in 0..<3 {
            let row = UIStackView()
            row.axis = .horizontal
            row.spacing = 12
            row.alignment = .center
            
            row.addArrangedSubview(createShimmerCircle(size: 38, isDark: isDark))
            
            let rowTxt = UIStackView(arrangedSubviews: [
                createShimmerLine(width: 120, height: 14, isDark: isDark),
                createShimmerLine(width: 75, height: 10, isDark: isDark)
            ])
            rowTxt.axis = .vertical
            rowTxt.spacing = 4
            row.addArrangedSubview(rowTxt)
            
            let space = UIView()
            space.setContentHuggingPriority(.defaultLow, for: .horizontal)
            row.addArrangedSubview(space)
            
            row.addArrangedSubview(createShimmerPill(width: 58, height: 22, isDark: isDark))
            actStack.addArrangedSubview(row)
        }
        
        NSLayoutConstraint.activate([
            actStack.topAnchor.constraint(equalTo: actCard.topAnchor, constant: 16),
            actStack.bottomAnchor.constraint(equalTo: actCard.bottomAnchor, constant: -16),
            actStack.leadingAnchor.constraint(equalTo: actCard.leadingAnchor, constant: 16),
            actStack.trailingAnchor.constraint(equalTo: actCard.trailingAnchor, constant: -16)
        ])
        mainStack.addArrangedSubview(actCard)
    }

    // ── 2. LIST / RECORDS SKELETON (Patients, Reports, Worklist) ───────────────
    private func buildListSkeleton(in mainStack: UIStackView, isDark: Bool) {
        // Search & Filter Row
        let searchRow = UIStackView()
        searchRow.axis = .horizontal
        searchRow.spacing = 10
        
        let searchBox = createCardWrapper(isDark: isDark)
        let sIcon = createShimmerCircle(size: 20, isDark: isDark)
        let sLine = createShimmerLine(width: 120, height: 12, isDark: isDark)
        let sStack = UIStackView(arrangedSubviews: [sIcon, sLine])
        sStack.axis = .horizontal
        sStack.spacing = 10
        sStack.alignment = .center
        sStack.translatesAutoresizingMaskIntoConstraints = false
        searchBox.addSubview(sStack)
        
        NSLayoutConstraint.activate([
            searchBox.heightAnchor.constraint(equalToConstant: 44),
            sStack.leadingAnchor.constraint(equalTo: searchBox.leadingAnchor, constant: 14),
            sStack.centerYAnchor.constraint(equalTo: searchBox.centerYAnchor)
        ])
        searchRow.addArrangedSubview(searchBox)
        
        let filterBtn = createCardWrapper(isDark: isDark)
        let fIcon = createShimmerCircle(size: 22, isDark: isDark)
        fIcon.translatesAutoresizingMaskIntoConstraints = false
        filterBtn.addSubview(fIcon)
        NSLayoutConstraint.activate([
            filterBtn.widthAnchor.constraint(equalToConstant: 44),
            filterBtn.heightAnchor.constraint(equalToConstant: 44),
            fIcon.centerXAnchor.constraint(equalTo: filterBtn.centerXAnchor),
            fIcon.centerYAnchor.constraint(equalTo: filterBtn.centerYAnchor)
        ])
        searchRow.addArrangedSubview(filterBtn)
        mainStack.addArrangedSubview(searchRow)
        
        // Category Filter Chips
        let chipStack = UIStackView()
        chipStack.axis = .horizontal
        chipStack.spacing = 8
        chipStack.distribution = .fillProportionally
        for w in [65, 80, 75, 70] {
            chipStack.addArrangedSubview(createShimmerPill(width: CGFloat(w), height: 32, isDark: isDark))
        }
        mainStack.addArrangedSubview(chipStack)
        
        // 4 Patient / Worklist Item Cards
        let listCard = createCardWrapper(isDark: isDark)
        let listStack = UIStackView()
        listStack.axis = .vertical
        listStack.spacing = 14
        listStack.translatesAutoresizingMaskIntoConstraints = false
        listCard.addSubview(listStack)
        
        let widths: [[CGFloat]] = [[140, 85], [165, 105], [130, 70], [155, 95]]
        for (idx, w) in widths.enumerated() {
            let row = UIStackView()
            row.axis = .horizontal
            row.spacing = 12
            row.alignment = .center
            
            row.addArrangedSubview(createShimmerCircle(size: 42, isDark: isDark))
            
            let txtCol = UIStackView(arrangedSubviews: [
                createShimmerLine(width: w[0], height: 14, isDark: isDark),
                createShimmerLine(width: w[1], height: 11, isDark: isDark)
            ])
            txtCol.axis = .vertical
            txtCol.spacing = 5
            row.addArrangedSubview(txtCol)
            
            let space = UIView()
            space.setContentHuggingPriority(.defaultLow, for: .horizontal)
            row.addArrangedSubview(space)
            
            let rightStack = UIStackView(arrangedSubviews: [
                createShimmerPill(width: 62, height: 20, isDark: isDark),
                createShimmerLine(width: 48, height: 10, isDark: isDark)
            ])
            rightStack.axis = .vertical
            rightStack.alignment = .trailing
            rightStack.spacing = 4
            row.addArrangedSubview(rightStack)
            
            listStack.addArrangedSubview(row)
            
            if idx < widths.count - 1 {
                let divider = createShimmerLine(width: nil, height: 1, isDark: isDark)
                divider.alpha = 0.4
                listStack.addArrangedSubview(divider)
            }
        }
        
        NSLayoutConstraint.activate([
            listStack.topAnchor.constraint(equalTo: listCard.topAnchor, constant: 16),
            listStack.bottomAnchor.constraint(equalTo: listCard.bottomAnchor, constant: -16),
            listStack.leadingAnchor.constraint(equalTo: listCard.leadingAnchor, constant: 16),
            listStack.trailingAnchor.constraint(equalTo: listCard.trailingAnchor, constant: -16)
        ])
        mainStack.addArrangedSubview(listCard)
    }

    // ── 3. FORM / ENTRY SKELETON (New Registration, Add Record) ───────────────
    private func buildFormSkeleton(in mainStack: UIStackView, isDark: Bool) {
        // Step progress row
        let stepRow = UIStackView()
        stepRow.axis = .horizontal
        stepRow.spacing = 10
        stepRow.alignment = .center
        stepRow.distribution = .equalCentering
        for i in 0..<3 {
            stepRow.addArrangedSubview(createShimmerCircle(size: 28, isDark: isDark))
            if i < 2 {
                let stepLine = createShimmerLine(width: 60, height: 3, isDark: isDark)
                stepRow.addArrangedSubview(stepLine)
            }
        }
        mainStack.addArrangedSubview(stepRow)
        
        // Section 1: Demographics Card
        let card1 = createCardWrapper(isDark: isDark)
        let s1 = UIStackView()
        s1.axis = .vertical
        s1.spacing = 12
        s1.translatesAutoresizingMaskIntoConstraints = false
        card1.addSubview(s1)
        
        s1.addArrangedSubview(createShimmerLine(width: 140, height: 16, isDark: isDark))
        
        // Full Name Field
        s1.addArrangedSubview(createShimmerLine(width: 80, height: 11, isDark: isDark))
        s1.addArrangedSubview(createShimmerLine(width: nil, height: 44, cornerRadius: 10, isDark: isDark))
        
        // 2-column Age & Gender Fields
        let split = UIStackView()
        split.axis = .horizontal
        split.spacing = 10
        split.distribution = .fillEqually
        for _ in 0..<2 {
            let col = UIStackView(arrangedSubviews: [
                createShimmerLine(width: 50, height: 11, isDark: isDark),
                createShimmerLine(width: nil, height: 44, cornerRadius: 10, isDark: isDark)
            ])
            col.axis = .vertical
            col.spacing = 4
            split.addArrangedSubview(col)
        }
        s1.addArrangedSubview(split)
        
        // Phone Field
        s1.addArrangedSubview(createShimmerLine(width: 90, height: 11, isDark: isDark))
        s1.addArrangedSubview(createShimmerLine(width: nil, height: 44, cornerRadius: 10, isDark: isDark))
        
        NSLayoutConstraint.activate([
            s1.topAnchor.constraint(equalTo: card1.topAnchor, constant: 16),
            s1.bottomAnchor.constraint(equalTo: card1.bottomAnchor, constant: -16),
            s1.leadingAnchor.constraint(equalTo: card1.leadingAnchor, constant: 16),
            s1.trailingAnchor.constraint(equalTo: card1.trailingAnchor, constant: -16)
        ])
        mainStack.addArrangedSubview(card1)
        
        // Section 2: Tests & Referral Card
        let card2 = createCardWrapper(isDark: isDark)
        let s2 = UIStackView()
        s2.axis = .vertical
        s2.spacing = 12
        s2.translatesAutoresizingMaskIntoConstraints = false
        card2.addSubview(s2)
        
        s2.addArrangedSubview(createShimmerLine(width: 150, height: 16, isDark: isDark))
        s2.addArrangedSubview(createShimmerLine(width: 100, height: 11, isDark: isDark))
        s2.addArrangedSubview(createShimmerLine(width: nil, height: 44, cornerRadius: 10, isDark: isDark))
        
        // Test chips
        s2.addArrangedSubview(createShimmerLine(width: 90, height: 11, isDark: isDark))
        let chips = UIStackView()
        chips.axis = .horizontal
        chips.spacing = 8
        chips.distribution = .fillProportionally
        for w in [70, 90, 65, 80] {
            chips.addArrangedSubview(createShimmerPill(width: CGFloat(w), height: 30, isDark: isDark))
        }
        s2.addArrangedSubview(chips)
        
        NSLayoutConstraint.activate([
            s2.topAnchor.constraint(equalTo: card2.topAnchor, constant: 16),
            s2.bottomAnchor.constraint(equalTo: card2.bottomAnchor, constant: -16),
            s2.leadingAnchor.constraint(equalTo: card2.leadingAnchor, constant: 16),
            s2.trailingAnchor.constraint(equalTo: card2.trailingAnchor, constant: -16)
        ])
        mainStack.addArrangedSubview(card2)
        
        // Action Buttons
        let btnRow = UIStackView(arrangedSubviews: [
            createShimmerLine(width: 90, height: 44, cornerRadius: 12, isDark: isDark),
            createShimmerLine(width: 140, height: 44, cornerRadius: 12, isDark: isDark)
        ])
        btnRow.axis = .horizontal
        btnRow.spacing = 12
        btnRow.alignment = .trailing
        mainStack.addArrangedSubview(btnRow)
    }

    // ── 4. GRID / CATALOG SKELETON (Categories, Machines, Inventory) ────────────
    private func buildGridSkeleton(in mainStack: UIStackView, isDark: Bool) {
        // Search Header
        let searchBox = createCardWrapper(isDark: isDark)
        let sIcon = createShimmerCircle(size: 20, isDark: isDark)
        let sLine = createShimmerLine(width: 140, height: 12, isDark: isDark)
        let sStack = UIStackView(arrangedSubviews: [sIcon, sLine])
        sStack.axis = .horizontal
        sStack.spacing = 10
        sStack.alignment = .center
        sStack.translatesAutoresizingMaskIntoConstraints = false
        searchBox.addSubview(sStack)
        
        NSLayoutConstraint.activate([
            searchBox.heightAnchor.constraint(equalToConstant: 44),
            sStack.leadingAnchor.constraint(equalTo: searchBox.leadingAnchor, constant: 14),
            sStack.centerYAnchor.constraint(equalTo: searchBox.centerYAnchor)
        ])
        mainStack.addArrangedSubview(searchBox)
        
        // Category Pills
        let pills = UIStackView()
        pills.axis = .horizontal
        pills.spacing = 8
        pills.distribution = .fillProportionally
        for w in [70, 95, 65, 80] {
            pills.addArrangedSubview(createShimmerPill(width: CGFloat(w), height: 30, isDark: isDark))
        }
        mainStack.addArrangedSubview(pills)
        
        // 2x3 Grid of Module Catalog Cards
        for _ in 0..<3 {
            let row = UIStackView()
            row.axis = .horizontal
            row.spacing = 12
            row.distribution = .fillEqually
            
            for w in [85, 90] {
                let card = createCardWrapper(isDark: isDark)
                let cStack = UIStackView(arrangedSubviews: [
                    createShimmerCircle(size: 38, isDark: isDark),
                    createShimmerLine(width: CGFloat(w), height: 15, isDark: isDark),
                    createShimmerLine(width: CGFloat(w - 20), height: 11, isDark: isDark),
                    createShimmerPill(width: 48, height: 18, isDark: isDark)
                ])
                cStack.axis = .vertical
                cStack.spacing = 8
                cStack.translatesAutoresizingMaskIntoConstraints = false
                card.addSubview(cStack)
                
                NSLayoutConstraint.activate([
                    cStack.topAnchor.constraint(equalTo: card.topAnchor, constant: 14),
                    cStack.bottomAnchor.constraint(equalTo: card.bottomAnchor, constant: -14),
                    cStack.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 14),
                    cStack.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -14)
                ])
                row.addArrangedSubview(card)
            }
            mainStack.addArrangedSubview(row)
        }
    }

    // ── 5. DETAIL / INVOICE SKELETON (Report View, Invoice, Billing) ────────────
    private func buildDetailSkeleton(in mainStack: UIStackView, isDark: Bool) {
        // Invoice / Test Header Hero Card
        let headerCard = createCardWrapper(isDark: isDark)
        let hStack = UIStackView()
        hStack.axis = .vertical
        hStack.spacing = 12
        hStack.translatesAutoresizingMaskIntoConstraints = false
        headerCard.addSubview(hStack)
        
        let topRow = UIStackView(arrangedSubviews: [
            createShimmerPill(width: 90, height: 24, isDark: isDark),
            createShimmerLine(width: 70, height: 12, isDark: isDark)
        ])
        topRow.axis = .horizontal
        topRow.distribution = .equalSpacing
        hStack.addArrangedSubview(topRow)
        
        hStack.addArrangedSubview(createShimmerLine(width: 170, height: 20, isDark: isDark))
        hStack.addArrangedSubview(createShimmerLine(width: nil, height: 32, cornerRadius: 6, isDark: isDark))
        
        NSLayoutConstraint.activate([
            hStack.topAnchor.constraint(equalTo: headerCard.topAnchor, constant: 16),
            hStack.bottomAnchor.constraint(equalTo: headerCard.bottomAnchor, constant: -16),
            hStack.leadingAnchor.constraint(equalTo: headerCard.leadingAnchor, constant: 16),
            hStack.trailingAnchor.constraint(equalTo: headerCard.trailingAnchor, constant: -16)
        ])
        mainStack.addArrangedSubview(headerCard)
        
        // 2-Column Metadata Card
        let metaCard = createCardWrapper(isDark: isDark)
        let mGrid = UIStackView()
        mGrid.axis = .horizontal
        mGrid.spacing = 12
        mGrid.distribution = .fillEqually
        mGrid.translatesAutoresizingMaskIntoConstraints = false
        metaCard.addSubview(mGrid)
        
        for _ in 0..<2 {
            let col = UIStackView()
            col.axis = .vertical
            col.spacing = 8
            for _ in 0..<3 {
                col.addArrangedSubview(createShimmerLine(width: 60, height: 10, isDark: isDark))
                col.addArrangedSubview(createShimmerLine(width: 100, height: 13, isDark: isDark))
            }
            mGrid.addArrangedSubview(col)
        }
        
        NSLayoutConstraint.activate([
            mGrid.topAnchor.constraint(equalTo: metaCard.topAnchor, constant: 16),
            mGrid.bottomAnchor.constraint(equalTo: metaCard.bottomAnchor, constant: -16),
            mGrid.leadingAnchor.constraint(equalTo: metaCard.leadingAnchor, constant: 16),
            mGrid.trailingAnchor.constraint(equalTo: metaCard.trailingAnchor, constant: -16)
        ])
        mainStack.addArrangedSubview(metaCard)
        
        // Itemized Breakdown Table Card
        let tableCard = createCardWrapper(isDark: isDark)
        let tStack = UIStackView()
        tStack.axis = .vertical
        tStack.spacing = 12
        tStack.translatesAutoresizingMaskIntoConstraints = false
        tableCard.addSubview(tStack)
        
        tStack.addArrangedSubview(createShimmerLine(width: 130, height: 15, isDark: isDark))
        
        for _ in 0..<3 {
            let itemRow = UIStackView(arrangedSubviews: [
                createShimmerLine(width: 130, height: 13, isDark: isDark),
                createShimmerLine(width: 55, height: 13, isDark: isDark)
            ])
            itemRow.axis = .horizontal
            itemRow.distribution = .equalSpacing
            tStack.addArrangedSubview(itemRow)
        }
        
        let divider = createShimmerLine(width: nil, height: 1, isDark: isDark)
        divider.alpha = 0.4
        tStack.addArrangedSubview(divider)
        
        let totalRow = UIStackView(arrangedSubviews: [
            createShimmerLine(width: 90, height: 16, isDark: isDark),
            createShimmerLine(width: 70, height: 18, isDark: isDark)
        ])
        totalRow.axis = .horizontal
        totalRow.distribution = .equalSpacing
        tStack.addArrangedSubview(totalRow)
        
        NSLayoutConstraint.activate([
            tStack.topAnchor.constraint(equalTo: tableCard.topAnchor, constant: 16),
            tStack.bottomAnchor.constraint(equalTo: tableCard.bottomAnchor, constant: -16),
            tStack.leadingAnchor.constraint(equalTo: tableCard.leadingAnchor, constant: 16),
            tStack.trailingAnchor.constraint(equalTo: tableCard.trailingAnchor, constant: -16)
        ])
        mainStack.addArrangedSubview(tableCard)
    }

    // ── 6. SETTINGS / PROFILE / WALLET SKELETON ─────────────────────────────────
    private func buildSettingsSkeleton(in mainStack: UIStackView, isDark: Bool) {
        // Profile Hero Card
        let profCard = createCardWrapper(isDark: isDark)
        let pStack = UIStackView()
        pStack.axis = .horizontal
        pStack.spacing = 14
        pStack.alignment = .center
        pStack.translatesAutoresizingMaskIntoConstraints = false
        profCard.addSubview(pStack)
        
        pStack.addArrangedSubview(createShimmerCircle(size: 54, isDark: isDark))
        let pText = UIStackView(arrangedSubviews: [
            createShimmerLine(width: 140, height: 16, isDark: isDark),
            createShimmerLine(width: 180, height: 11, isDark: isDark),
            createShimmerPill(width: 70, height: 18, isDark: isDark)
        ])
        pText.axis = .vertical
        pText.spacing = 5
        pStack.addArrangedSubview(pText)
        
        NSLayoutConstraint.activate([
            pStack.topAnchor.constraint(equalTo: profCard.topAnchor, constant: 16),
            pStack.bottomAnchor.constraint(equalTo: profCard.bottomAnchor, constant: -16),
            pStack.leadingAnchor.constraint(equalTo: profCard.leadingAnchor, constant: 16),
            pStack.trailingAnchor.constraint(equalTo: profCard.trailingAnchor, constant: -16)
        ])
        mainStack.addArrangedSubview(profCard)
        
        // Grouped Settings Section 1
        let group1 = createCardWrapper(isDark: isDark)
        let g1Stack = UIStackView()
        g1Stack.axis = .vertical
        g1Stack.spacing = 14
        g1Stack.translatesAutoresizingMaskIntoConstraints = false
        group1.addSubview(g1Stack)
        
        for w in [120, 140, 100] {
            let row = UIStackView(arrangedSubviews: [
                createShimmerCircle(size: 32, isDark: isDark),
                createShimmerLine(width: CGFloat(w), height: 13, isDark: isDark),
                createShimmerCircle(size: 14, isDark: isDark)
            ])
            row.axis = .horizontal
            row.spacing = 12
            row.alignment = .center
            g1Stack.addArrangedSubview(row)
        }
        
        NSLayoutConstraint.activate([
            g1Stack.topAnchor.constraint(equalTo: group1.topAnchor, constant: 16),
            g1Stack.bottomAnchor.constraint(equalTo: group1.bottomAnchor, constant: -16),
            g1Stack.leadingAnchor.constraint(equalTo: group1.leadingAnchor, constant: 16),
            g1Stack.trailingAnchor.constraint(equalTo: group1.trailingAnchor, constant: -16)
        ])
        mainStack.addArrangedSubview(group1)
        
        // Grouped Settings Section 2
        let group2 = createCardWrapper(isDark: isDark)
        let g2Stack = UIStackView()
        g2Stack.axis = .vertical
        g2Stack.spacing = 14
        g2Stack.translatesAutoresizingMaskIntoConstraints = false
        group2.addSubview(g2Stack)
        
        for w in [130, 110] {
            let row = UIStackView(arrangedSubviews: [
                createShimmerCircle(size: 32, isDark: isDark),
                createShimmerLine(width: CGFloat(w), height: 13, isDark: isDark),
                createShimmerCircle(size: 14, isDark: isDark)
            ])
            row.axis = .horizontal
            row.spacing = 12
            row.alignment = .center
            g2Stack.addArrangedSubview(row)
        }
        
        NSLayoutConstraint.activate([
            g2Stack.topAnchor.constraint(equalTo: group2.topAnchor, constant: 16),
            g2Stack.bottomAnchor.constraint(equalTo: group2.bottomAnchor, constant: -16),
            g2Stack.leadingAnchor.constraint(equalTo: group2.leadingAnchor, constant: 16),
            g2Stack.trailingAnchor.constraint(equalTo: group2.trailingAnchor, constant: -16)
        ])
        mainStack.addArrangedSubview(group2)
    }
    
    private func hideSkeleton() {
        skeletonTimeoutTimer?.invalidate()
        skeletonTimeoutTimer = nil
        guard !skeletonView.isHidden else { return }
        
        // Ensure a minimum display duration of 220ms to eliminate visual flashing/jitter
        if let showTime = skeletonShowTimestamp {
            let elapsed = Date().timeIntervalSince(showTime)
            if elapsed < 0.22 {
                let remaining = 0.22 - elapsed
                DispatchQueue.main.asyncAfter(deadline: .now() + remaining) { [weak self] in
                    self?.performHideSkeletonAnimation()
                }
                return
            }
        }
        
        performHideSkeletonAnimation()
    }
    
    private func performHideSkeletonAnimation() {
        guard !skeletonView.isHidden else { return }
        activeSkeletonPath = nil
        skeletonShowTimestamp = nil
        
        UIView.animate(withDuration: 0.28, delay: 0, options: [.curveEaseInOut, .allowUserInteraction], animations: {
            self.skeletonView.alpha = 0.0
        }) { _ in
            if self.skeletonView.alpha == 0.0 {
                self.skeletonView.isHidden = true
            }
        }
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

// ─────────────────────────────────────────────────────────────────────────────
// MARK: – High Performance Skeleton Components
// ─────────────────────────────────────────────────────────────────────────────

final class SkeletonBlockView: UIView {
    private let shimmerLayer = CAGradientLayer()
    private var isDark: Bool = false

    init(cornerRadius: CGFloat = 8, isDark: Bool = false) {
        self.isDark = isDark
        super.init(frame: .zero)
        self.layer.cornerRadius = cornerRadius
        self.layer.masksToBounds = true
        setupShimmer()
        updateTheme(isDark: isDark)
    }

    required init?(coder: NSCoder) {
        super.init(coder: coder)
        setupShimmer()
    }

    override func layoutSubviews() {
        super.layoutSubviews()
        shimmerLayer.frame = CGRect(x: -bounds.width, y: 0, width: max(1, bounds.width * 3), height: max(1, bounds.height))
        shimmerLayer.cornerRadius = layer.cornerRadius
    }

    private func setupShimmer() {
        shimmerLayer.startPoint = CGPoint(x: 0.0, y: 0.5)
        shimmerLayer.endPoint = CGPoint(x: 1.0, y: 0.5)
        shimmerLayer.locations = [0.25, 0.5, 0.75]
        layer.addSublayer(shimmerLayer)

        let anim = CABasicAnimation(keyPath: "transform.translation.x")
        anim.fromValue = -200
        anim.toValue = 400
        anim.duration = 1.35
        anim.repeatCount = .infinity
        anim.timingFunction = CAMediaTimingFunction(controlPoints: 0.4, 0.0, 0.2, 1.0)
        anim.isRemovedOnCompletion = false
        shimmerLayer.add(anim, forKey: "skeletonShimmerWave")
    }

    func updateTheme(isDark: Bool) {
        self.isDark = isDark
        if isDark {
            backgroundColor = UIColor(red: 30/255, green: 41/255, blue: 59/255, alpha: 0.7) // slate-800
            let base = UIColor(red: 51/255, green: 65/255, blue: 85/255, alpha: 0.0).cgColor
            let highlight = UIColor(red: 71/255, green: 85/255, blue: 105/255, alpha: 0.45).cgColor
            shimmerLayer.colors = [base, highlight, base]
        } else {
            backgroundColor = UIColor(red: 226/255, green: 232/255, blue: 240/255, alpha: 0.6) // slate-200
            let base = UIColor(white: 1.0, alpha: 0.0).cgColor
            let highlight = UIColor(white: 1.0, alpha: 0.75).cgColor
            shimmerLayer.colors = [base, highlight, base]
        }
    }
}

final class SkeletonCardView: UIView {
    private var isDark: Bool = false

    init(cornerRadius: CGFloat = 16, isDark: Bool = false) {
        self.isDark = isDark
        super.init(frame: .zero)
        self.layer.cornerRadius = cornerRadius
        self.layer.borderWidth = 1.0
        self.translatesAutoresizingMaskIntoConstraints = false
        updateTheme(isDark: isDark)
    }

    required init?(coder: NSCoder) {
        super.init(coder: coder)
    }

    func updateTheme(isDark: Bool) {
        self.isDark = isDark
        if isDark {
            backgroundColor = UIColor(red: 30/255, green: 41/255, blue: 59/255, alpha: 1.0) // slate-800
            layer.borderColor = UIColor(red: 51/255, green: 65/255, blue: 85/255, alpha: 0.8).cgColor // slate-700
            layer.shadowOpacity = 0
        } else {
            backgroundColor = .white
            layer.borderColor = UIColor(red: 226/255, green: 232/255, blue: 240/255, alpha: 0.8).cgColor // slate-200
            layer.shadowColor = UIColor.black.cgColor
            layer.shadowOpacity = 0.03
            layer.shadowOffset = CGSize(width: 0, height: 2)
            layer.shadowRadius = 6
        }
    }
}


