import UIKit
import Capacitor
import WebKit

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
    private let walletChevron      = UIImageView()
    
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
    private var walletTimer: Timer? = nil
    private var bellAnimationTimer: Timer? = nil
    private var progressPollTimer: Timer? = nil

    // ─────────────────────────────────────────────────────────────────────────
    // MARK: – Lifecycle
    // ─────────────────────────────────────────────────────────────────────────

    override func viewDidLoad() {
        super.viewDidLoad() // This initializes the Capacitor bridge and the webView
        
        view.backgroundColor = .white

        buildTopLayoutContainer() // 0. Stack view enclosing Header + Wallet Card
        buildBottomNavBar()       // 1. Native bottom nav pinned above safe area
        buildOfflineView()        // 2. Offline overlay (hidden by default)
        buildSkeletonView()       // 2b. Full screen skeleton loading screen (hidden by default)
        embedMoreViewController() // 3. More panel (hidden by default)

        // Custom User Agent setup to inject CapacitorApp dynamically to hide web header
        if let webView = self.webView {
            webView.evaluateJavaScript("navigator.userAgent") { [weak webView] (result, error) in
                if let defaultUA = result as? String {
                    webView?.customUserAgent = defaultUA + " CapacitorApp"
                }
            }
            
            // Unconditionally hide web header elements immediately at document start using injected CSS
            let css = ".mobile-app-header-web-component, header { display: none !important; } main, .is-native-app main, .is-capacitor main { padding-top: 0px !important; }"
            let js = """
            var style = document.createElement('style');
            style.innerHTML = '\(css)';
            document.head.appendChild(style);
            """
            let script = WKUserScript(source: js, injectionTime: .atDocumentStart, forMainFrameOnly: true)
            webView.configuration.userContentController.addUserScript(script)
        }

        // Adjust WebView constraints so it sits perfectly above the bottom navigation bar and below the top header stack
        if let webView = self.webView {
            webView.translatesAutoresizingMaskIntoConstraints = false
            
            // Remove existing auto-resizing or layout constraints added by Capacitor
            if let superview = webView.superview {
                superview.constraints.forEach { constraint in
                    if constraint.firstItem === webView || constraint.secondItem === webView {
                        superview.removeConstraint(constraint)
                    }
                }
                
                NSLayoutConstraint.activate([
                    webView.topAnchor.constraint(equalTo: topLayoutContainer.bottomAnchor),
                    webView.leadingAnchor.constraint(equalTo: superview.leadingAnchor),
                    webView.trailingAnchor.constraint(equalTo: superview.trailingAnchor),
                    webView.bottomAnchor.constraint(equalTo: bottomNavBar.topAnchor)
                ])
            }
            
            // Enable iOS swipe-back through web history
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
    }

    override func viewSafeAreaInsetsDidChange() {
        super.viewSafeAreaInsetsDidChange()
        bottomNavHeightConstraint.constant = 56 + view.safeAreaInsets.bottom
        view.layoutIfNeeded()
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
        guard let token = KeychainManager.read(forKey: KeychainManager.tokenKey) else {
            DispatchQueue.main.async {
                self.walletCardView.isHidden = true
            }
            return
        }

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
        txtWalletBalance.text = String(format: "₹%.2f", balance)

        let statusText: String
        let statusColor: UIColor
        
        let borderStroke = UIColor(red: 51/255, green: 65/255, blue: 85/255, alpha: 1)
        if balance <= 20.0 {
            statusText = "●  LOW BALANCE • ADD FUNDS"
            statusColor = UIColor(red: 239/255, green: 68/255, blue: 68/255, alpha: 1) // red-500
        } else if balance < 75.0 {
            statusText = "●  LOW BALANCE • ADD FUNDS"
            statusColor = UIColor(red: 249/255, green: 115/255, blue: 22/255, alpha: 1) // orange-500
        } else {
            statusText = "●  ACTIVE"
            statusColor = UIColor(red: 16/255, green: 185/255, blue: 129/255, alpha: 1) // emerald-500
        }
        
        txtWalletStatus.text = statusText
        txtWalletStatus.textColor = statusColor
        walletWrapper.layer.borderColor = borderStroke.cgColor
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
        if path == currentPath { return }
        currentPath = path
        showSkeleton(for: path)

        if let token = KeychainManager.read(forKey: KeychainManager.tokenKey) {
            AuthService.injectCookieIntoWebView(token: token)
        }
        if let url = URL(string: baseUrl + path) {
            var req = URLRequest(url: url)
            if let token = KeychainManager.read(forKey: KeychainManager.tokenKey) {
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
            if path == "/legal" {
                let legalVC = LegalViewController()
                legalVC.isDarkMode = self.isDarkMode
                if #available(iOS 15.0, *) {
                    if let sheet = legalVC.sheetPresentationController {
                        sheet.detents = [.medium(), .large()]
                        sheet.prefersGrabberVisible = true
                    }
                }
                self.present(legalVC, animated: true)
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
    // MARK: – Top Layout Container Construction
    // ─────────────────────────────────────────────────────────────────────────

    private func buildTopLayoutContainer() {
        topLayoutContainer.axis = .vertical
        topLayoutContainer.distribution = .fill
        topLayoutContainer.alignment = .fill
        topLayoutContainer.spacing = 0
        topLayoutContainer.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(topLayoutContainer)

        NSLayoutConstraint.activate([
            topLayoutContainer.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            topLayoutContainer.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            topLayoutContainer.trailingAnchor.constraint(equalTo: view.trailingAnchor)
        ])

        buildTopHeaderBar()
        buildWalletCardView()
    }

    private func buildTopHeaderBar() {
        topHeaderBar.backgroundColor = .white
        topHeaderBar.translatesAutoresizingMaskIntoConstraints = false
        topHeaderBar.heightAnchor.constraint(equalToConstant: 64).isActive = true
        topLayoutContainer.addArrangedSubview(topHeaderBar)

        headerBorder.backgroundColor = UIColor(white: 0.94, alpha: 1)
        headerBorder.translatesAutoresizingMaskIntoConstraints = false
        topHeaderBar.addSubview(headerBorder)

        // Menu button ...
        menuButton.backgroundColor = .clear
        menuButton.setTitle("•••", for: .normal)
        menuButton.setTitleColor(UIColor(red: 71/255, green: 85/255, blue: 105/255, alpha: 1), for: .normal)
        menuButton.titleLabel?.font = .systemFont(ofSize: 10, weight: .bold)
        menuButton.translatesAutoresizingMaskIntoConstraints = false
        menuButton.addTarget(self, action: #selector(menuButtonTapped), for: .touchUpInside)
        topHeaderBar.addSubview(menuButton)

        // Subtitle & Title labels
        headerSubtitleLabel.text = "Main Branch"
        headerSubtitleLabel.font = .systemFont(ofSize: 9, weight: .bold)
        headerSubtitleLabel.textColor = UIColor(red: 148/255, green: 163/255, blue: 184/255, alpha: 1)
        headerSubtitleLabel.adjustsFontSizeToFitWidth = true
        headerSubtitleLabel.minimumScaleFactor = 0.75
        headerSubtitleLabel.translatesAutoresizingMaskIntoConstraints = false
        topHeaderBar.addSubview(headerSubtitleLabel)

        headerTitleLabel.text = "Financial Analytics"
        headerTitleLabel.font = .systemFont(ofSize: 15, weight: .black)
        headerTitleLabel.textColor = UIColor(red: 15/255, green: 23/255, blue: 42/255, alpha: 1)
        headerTitleLabel.adjustsFontSizeToFitWidth = true
        headerTitleLabel.minimumScaleFactor = 0.75
        headerTitleLabel.translatesAutoresizingMaskIntoConstraints = false
        topHeaderBar.addSubview(headerTitleLabel)

        // Support help button
        let supportImage = UIImage(systemName: "questionmark.circle")
        supportButton.setImage(supportImage, for: .normal)
        supportButton.tintColor = UIColor(red: 71/255, green: 85/255, blue: 105/255, alpha: 1)
        supportButton.backgroundColor = .clear
        supportButton.translatesAutoresizingMaskIntoConstraints = false
        supportButton.addTarget(self, action: #selector(headerSupportTapped), for: .touchUpInside)
        topHeaderBar.addSubview(supportButton)

        // Theme switch button
        let themeImage = UIImage(systemName: "sun.max")
        themeButton.setImage(themeImage, for: .normal)
        themeButton.tintColor = UIColor(red: 71/255, green: 85/255, blue: 105/255, alpha: 1)
        themeButton.backgroundColor = .clear
        themeButton.translatesAutoresizingMaskIntoConstraints = false
        themeButton.addTarget(self, action: #selector(headerThemeTapped), for: .touchUpInside)
        topHeaderBar.addSubview(themeButton)

        // Notification bell button
        let bellImage = UIImage(systemName: "bell")
        let chevronImage = UIImage(systemName: "chevron.down")
        notificationButton.setImage(bellImage, for: .normal)
        notificationButton.tintColor = UIColor(red: 71/255, green: 85/255, blue: 105/255, alpha: 1)
        notificationButton.backgroundColor = .clear
        
        // Add dropdown arrow internally for bell pill look
        let bellChevron = UIImageView(image: chevronImage)
        bellChevron.tintColor = UIColor(red: 148/255, green: 163/255, blue: 184/255, alpha: 1)
        bellChevron.translatesAutoresizingMaskIntoConstraints = false
        notificationButton.addSubview(bellChevron)
        
        // Notification Badge setup
        notificationBadge.backgroundColor = UIColor(red: 239/255, green: 68/255, blue: 68/255, alpha: 1)
        notificationBadge.textColor = .white
        notificationBadge.font = .systemFont(ofSize: 8.5, weight: .bold)
        notificationBadge.textAlignment = .center
        notificationBadge.layer.cornerRadius = 6.5
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

            menuButton.leadingAnchor.constraint(equalTo: topHeaderBar.leadingAnchor, constant: 14),
            menuButton.centerYAnchor.constraint(equalTo: topHeaderBar.centerYAnchor),
            menuButton.widthAnchor.constraint(equalToConstant: 38),
            menuButton.heightAnchor.constraint(equalToConstant: 38),

            headerSubtitleLabel.topAnchor.constraint(equalTo: menuButton.topAnchor, constant: 1),
            headerSubtitleLabel.leadingAnchor.constraint(equalTo: menuButton.trailingAnchor, constant: 12),
            headerSubtitleLabel.trailingAnchor.constraint(lessThanOrEqualTo: notificationButton.leadingAnchor, constant: -8),

            headerTitleLabel.bottomAnchor.constraint(equalTo: menuButton.bottomAnchor, constant: -1),
            headerTitleLabel.leadingAnchor.constraint(equalTo: menuButton.trailingAnchor, constant: 12),
            headerTitleLabel.trailingAnchor.constraint(lessThanOrEqualTo: notificationButton.leadingAnchor, constant: -8),

            supportButton.trailingAnchor.constraint(equalTo: topHeaderBar.trailingAnchor, constant: -14),
            supportButton.centerYAnchor.constraint(equalTo: topHeaderBar.centerYAnchor),
            supportButton.widthAnchor.constraint(equalToConstant: 36),
            supportButton.heightAnchor.constraint(equalToConstant: 36),

            themeButton.trailingAnchor.constraint(equalTo: supportButton.leadingAnchor, constant: -8),
            themeButton.centerYAnchor.constraint(equalTo: topHeaderBar.centerYAnchor),
            themeButton.widthAnchor.constraint(equalToConstant: 36),
            themeButton.heightAnchor.constraint(equalToConstant: 36),

            notificationButton.trailingAnchor.constraint(equalTo: themeButton.leadingAnchor, constant: -8),
            notificationButton.centerYAnchor.constraint(equalTo: topHeaderBar.centerYAnchor),
            notificationButton.widthAnchor.constraint(equalToConstant: 54),
            notificationButton.heightAnchor.constraint(equalToConstant: 36),
            
            bellChevron.trailingAnchor.constraint(equalTo: notificationButton.trailingAnchor, constant: -8),
            bellChevron.centerYAnchor.constraint(equalTo: notificationButton.centerYAnchor),
            bellChevron.widthAnchor.constraint(equalToConstant: 8),
            bellChevron.heightAnchor.constraint(equalToConstant: 6),

            notificationBadge.topAnchor.constraint(equalTo: notificationButton.topAnchor, constant: 4),
            notificationBadge.leadingAnchor.constraint(equalTo: notificationButton.leadingAnchor, constant: 18),
            notificationBadge.widthAnchor.constraint(equalToConstant: 13),
            notificationBadge.heightAnchor.constraint(equalToConstant: 13)
        ])
    }

    private func buildWalletCardView() {
        walletCardView.clipsToBounds = true
        walletCardView.translatesAutoresizingMaskIntoConstraints = false
        walletCardView.isHidden = true // Hidden by default, dynamically displayed for LAB_OWNER
        
        walletWrapper.translatesAutoresizingMaskIntoConstraints = false
        walletWrapper.backgroundColor = isDarkMode ? UIColor(red: 15/255, green: 23/255, blue: 42/255, alpha: 1) : UIColor(red: 30/255, green: 41/255, blue: 59/255, alpha: 1)
        walletWrapper.layer.cornerRadius = 26
        walletWrapper.layer.borderWidth = 1.5
        walletWrapper.layer.borderColor = UIColor(red: 51/255, green: 65/255, blue: 85/255, alpha: 1).cgColor
        walletCardView.addSubview(walletWrapper)
        
        // Add Wallet Card Tap Action
        let tap = UITapGestureRecognizer(target: self, action: #selector(walletCardTapped))
        walletWrapper.addGestureRecognizer(tap)
        
        // Circle Credit Card Icon Container
        walletIconBg.backgroundColor = .white
        walletIconBg.layer.cornerRadius = 15
        walletIconBg.translatesAutoresizingMaskIntoConstraints = false
        walletWrapper.addSubview(walletIconBg)
        
        let cardImage = UIImage(named: "WalletLogo")
        walletIconView.image = cardImage
        walletIconView.contentMode = .scaleAspectFit
        walletIconView.translatesAutoresizingMaskIntoConstraints = false
        walletIconBg.addSubview(walletIconView)
        
        // Balance labels
        txtWalletBalance.text = "₹30.00"
        txtWalletBalance.textColor = .white
        txtWalletBalance.font = .systemFont(ofSize: 18, weight: .black)
        txtWalletBalance.adjustsFontSizeToFitWidth = true
        txtWalletBalance.minimumScaleFactor = 0.65
        txtWalletBalance.numberOfLines = 1
        txtWalletBalance.translatesAutoresizingMaskIntoConstraints = false
        walletWrapper.addSubview(txtWalletBalance)
        
        txtWalletStatus.text = "●  ACTIVE"
        txtWalletStatus.textColor = UIColor(red: 16/255, green: 185/255, blue: 129/255, alpha: 1) // emerald-500
        txtWalletStatus.font = .systemFont(ofSize: 9.5, weight: .bold)
        txtWalletStatus.translatesAutoresizingMaskIntoConstraints = false
        walletWrapper.addSubview(txtWalletStatus)
        
        // Right side: Pill Button
        let btnTopUp = UIView()
        btnTopUp.backgroundColor = UIColor(red: 30/255, green: 41/255, blue: 59/255, alpha: 1)
        btnTopUp.layer.cornerRadius = 13
        btnTopUp.translatesAutoresizingMaskIntoConstraints = false
        walletWrapper.addSubview(btnTopUp)
        
        let lblTopUp = UILabel()
        lblTopUp.text = "Top Up"
        lblTopUp.textColor = .white
        lblTopUp.font = .systemFont(ofSize: 11, weight: .bold)
        lblTopUp.translatesAutoresizingMaskIntoConstraints = false
        btnTopUp.addSubview(lblTopUp)
        
        topLayoutContainer.addArrangedSubview(walletCardView)
        
        NSLayoutConstraint.activate([
            walletWrapper.topAnchor.constraint(equalTo: walletCardView.topAnchor, constant: 6),
            walletWrapper.bottomAnchor.constraint(equalTo: walletCardView.bottomAnchor, constant: -6),
            walletWrapper.leadingAnchor.constraint(equalTo: walletCardView.leadingAnchor, constant: 14),
            walletWrapper.trailingAnchor.constraint(equalTo: walletCardView.trailingAnchor, constant: -14),
            walletWrapper.heightAnchor.constraint(equalToConstant: 52),
            
            walletIconBg.leadingAnchor.constraint(equalTo: walletWrapper.leadingAnchor, constant: 12),
            walletIconBg.centerYAnchor.constraint(equalTo: walletWrapper.centerYAnchor),
            walletIconBg.widthAnchor.constraint(equalToConstant: 30),
            walletIconBg.heightAnchor.constraint(equalToConstant: 30),
            
            walletIconView.centerXAnchor.constraint(equalTo: walletIconBg.centerXAnchor),
            walletIconView.centerYAnchor.constraint(equalTo: walletIconBg.centerYAnchor),
            walletIconView.widthAnchor.constraint(equalToConstant: 26),
            walletIconView.heightAnchor.constraint(equalToConstant: 26),
            
            txtWalletBalance.topAnchor.constraint(equalTo: walletIconBg.topAnchor, constant: -1),
            txtWalletBalance.leadingAnchor.constraint(equalTo: walletIconBg.trailingAnchor, constant: 10),
            txtWalletBalance.trailingAnchor.constraint(lessThanOrEqualTo: btnTopUp.leadingAnchor, constant: -8),
            
            txtWalletStatus.bottomAnchor.constraint(equalTo: walletIconBg.bottomAnchor, constant: 1),
            txtWalletStatus.leadingAnchor.constraint(equalTo: walletIconBg.trailingAnchor, constant: 10),
            txtWalletStatus.trailingAnchor.constraint(lessThanOrEqualTo: btnTopUp.leadingAnchor, constant: -8),
            
            btnTopUp.trailingAnchor.constraint(equalTo: walletWrapper.trailingAnchor, constant: -12),
            btnTopUp.centerYAnchor.constraint(equalTo: walletWrapper.centerYAnchor),
            btnTopUp.heightAnchor.constraint(equalToConstant: 26),
            
            lblTopUp.leadingAnchor.constraint(equalTo: btnTopUp.leadingAnchor, constant: 12),
            lblTopUp.trailingAnchor.constraint(equalTo: btnTopUp.trailingAnchor, constant: -12),
            lblTopUp.centerYAnchor.constraint(equalTo: btnTopUp.centerYAnchor)
        ])
    }

    @objc private func menuButtonTapped() {
        showMorePanel()
    }

    @objc private func walletCardTapped() {
        showWeb(path: "/workspace/wallet")
    }

    @objc private func headerThemeTapped() {
        if let webView = self.webView {
            // Trigger web app theme switch button click inside WebView
            webView.evaluateJavaScript("document.querySelector('.mobile-app-header-web-component button[aria-label=\"Toggle dark mode\"]')?.click()", completionHandler: nil)
        }
    }

    @objc private func headerSupportTapped() {
        showWeb(path: "/workspace/support")
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
        if keyPath == "estimatedProgress", let webView = object as? WKWebView {
            checkWebViewProgress()
        }
    }

    private func checkWebViewProgress() {
        guard let webView = self.webView else { return }
        
        let progress = webView.estimatedProgress
        if progress < 1.0 {
            DispatchQueue.main.async {
                self.showSkeleton(for: webView.url?.path ?? "")
            }
        } else {
            // Check for Next.js loading spinners (width/height >= 28px)
            webView.evaluateJavaScript("""
            (function() {
              if (document.readyState !== 'complete') return true;
              var spinners = document.querySelectorAll('.animate-spin');
              for (var i = 0; i < spinners.length; i++) {
                var r = spinners[i].getBoundingClientRect();
                if (r.width >= 28 && r.height >= 28 && r.top > 0) return true;
              }
              return false;
            })()
            """) { [weak self] (result, error) in
                guard let self = self else { return }
                let isWebLoading = (result as? Bool) ?? false
                DispatchQueue.main.async {
                    if isWebLoading {
                        self.showSkeleton(for: webView.url?.path ?? "")
                    } else {
                        self.hideSkeleton()
                    }
                }
            }
        }
    }

    private func checkAuthRedirect(url: URL) {
        let path = url.path
        if path.contains("/login") || path.contains("/register") || path.contains("/forgot-password") || path.contains("/verify") || path.contains("/reset-password") {
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
        
        let slate900 = UIColor(red: 15/255, green: 23/255, blue: 42/255, alpha: 1)
        let slate800 = UIColor(red: 30/255, green: 41/255, blue: 59/255, alpha: 1)
        let slate700 = UIColor(red: 51/255, green: 65/255, blue: 85/255, alpha: 1)
        let slate600 = UIColor(red: 71/255, green: 85/255, blue: 105/255, alpha: 1)
        let slate200 = UIColor(red: 226/255, green: 232/255, blue: 240/255, alpha: 1)
        
        // Root view background color
        view.backgroundColor = isDark ? slate900 : .white
        
        // Header layouts background color
        topLayoutContainer.backgroundColor = isDark ? slate800 : .white
        topHeaderBar.backgroundColor = isDark ? slate800 : .white
        
        // Header Divider
        bottomBorder.backgroundColor = isDark ? slate700 : UIColor(white: 0.94, alpha: 1)
        
        // Title text colors
        headerTitleLabel.textColor = isDark ? .white : UIColor(red: 15/255, green: 23/255, blue: 42/255, alpha: 1)
        headerSubtitleLabel.textColor = isDark ? UIColor(red: 148/255, green: 163/255, blue: 184/255, alpha: 1) : UIColor(red: 148/255, green: 163/255, blue: 184/255, alpha: 1)
        
        // Buttons background and tint
        let btnBg = UIColor.clear
        let btnTint = isDark ? slate200 : slate600
        
        let buttons = [menuButton, themeButton, supportButton, notificationButton]
        for button in buttons {
            button.backgroundColor = btnBg
            button.tintColor = btnTint
            if button == menuButton {
                button.setTitleColor(btnTint, for: .normal)
            }
        }
        
        // Bottom nav bar background
        bottomNavBar.backgroundColor = isDark ? slate900 : .white
        
        // Update bottom nav tints
        updateNavTints()
        
        // Wallet Wrapper Background Color
        let walletBg = isDark ? UIColor(red: 15/255, green: 23/255, blue: 42/255, alpha: 1) : UIColor(red: 30/255, green: 41/255, blue: 59/255, alpha: 1)
        walletWrapper.backgroundColor = walletBg
        
        // Update MoreViewController if instantiated
        moreVC.applyTheme(isDark: isDark)
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
        if path.contains("analytics") || path.contains("dashboard") {
            return "dashboard"
        }
        if path.contains("patients") || path.contains("results") || path.contains("reports") || path.contains("audit-logs") || path.contains("bookings") || path.contains("staff") {
            return "list"
        }
        if path.contains("test-management") || path.contains("analyzers") {
            return "grid"
        }
        if path.contains("support") || path.contains("wallet") || path.contains("settings") || path.contains("expenses") || path.contains("commissions") || path.contains("doctors") || path.contains("agencies") || path.contains("profile") {
            return "detail"
        }
        if path.contains("registration") || path.contains("edit") || path.contains("create") || path.contains("new") {
            return "form"
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
        
        if path.contains("analytics") || path.contains("dashboard") {
            // 1. DASHBOARD
            let welcome = createCardWrapper(color: bgCard, borderColor: borderColor)
            let wStack = UIStackView(arrangedSubviews: [
                createShimmerLine(width: 200, height: 22, color: bgBlock),
                createShimmerLine(width: 120, height: 14, color: bgBlock)
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
            
            let gridH1 = UIStackView()
            gridH1.axis = .horizontal
            gridH1.spacing = 12
            gridH1.distribution = .fillEqually
            
            for _ in 0..<2 {
                let card = createCardWrapper(color: bgCard, borderColor: borderColor)
                let cStack = UIStackView(arrangedSubviews: [
                    createShimmerCircle(size: 32, color: bgBlock),
                    createShimmerLine(width: 80, height: 16, color: bgBlock)
                ])
                cStack.axis = .vertical
                cStack.spacing = 12
                cStack.translatesAutoresizingMaskIntoConstraints = false
                card.addSubview(cStack)
                NSLayoutConstraint.activate([
                    cStack.topAnchor.constraint(equalTo: card.topAnchor, constant: 16),
                    cStack.bottomAnchor.constraint(equalTo: card.bottomAnchor, constant: -16),
                    cStack.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 16),
                    cStack.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -16),
                    card.heightAnchor.constraint(equalToConstant: 100)
                ])
                gridH1.addArrangedSubview(card)
            }
            mainStack.addArrangedSubview(gridH1)
            
            let gridH2 = UIStackView()
            gridH2.axis = .horizontal
            gridH2.spacing = 12
            gridH2.distribution = .fillEqually
            
            for _ in 0..<2 {
                let card = createCardWrapper(color: bgCard, borderColor: borderColor)
                let cStack = UIStackView(arrangedSubviews: [
                    createShimmerCircle(size: 32, color: bgBlock),
                    createShimmerLine(width: 70, height: 16, color: bgBlock)
                ])
                cStack.axis = .vertical
                cStack.spacing = 12
                cStack.translatesAutoresizingMaskIntoConstraints = false
                card.addSubview(cStack)
                NSLayoutConstraint.activate([
                    cStack.topAnchor.constraint(equalTo: card.topAnchor, constant: 16),
                    cStack.bottomAnchor.constraint(equalTo: card.bottomAnchor, constant: -16),
                    cStack.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 16),
                    cStack.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -16),
                    card.heightAnchor.constraint(equalToConstant: 100)
                ])
                gridH2.addArrangedSubview(card)
            }
            mainStack.addArrangedSubview(gridH2)
            
            let chartCard = createCardWrapper(color: bgCard, borderColor: borderColor)
            let chartHeader = createShimmerLine(width: 140, height: 18, color: bgBlock)
            chartCard.addSubview(chartHeader)
            
            let barStack = UIStackView()
            barStack.axis = .horizontal
            barStack.spacing = 8
            barStack.alignment = .bottom
            barStack.distribution = .fillEqually
            barStack.translatesAutoresizingMaskIntoConstraints = false
            chartCard.addSubview(barStack)
            
            let heights: [CGFloat] = [80, 120, 60, 140, 100, 160]
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
                chartCard.heightAnchor.constraint(equalToConstant: 240)
            ])
            mainStack.addArrangedSubview(chartCard)
            
        } else if path.contains("results") || path.contains("worklist") || path.contains("patients") || path.contains("bookings") {
            // 2. LIST
            let filterStack = UIStackView()
            filterStack.axis = .horizontal
            filterStack.spacing = 12
            
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
            
            let listCard = createCardWrapper(color: bgCard, borderColor: borderColor)
            let listStack = UIStackView()
            listStack.axis = .vertical
            listStack.spacing = 18
            listStack.translatesAutoresizingMaskIntoConstraints = false
            listCard.addSubview(listStack)
            
            NSLayoutConstraint.activate([
                listStack.topAnchor.constraint(equalTo: listCard.topAnchor, constant: 16),
                listStack.bottomAnchor.constraint(equalTo: listCard.bottomAnchor, constant: -16),
                listStack.leadingAnchor.constraint(equalTo: listCard.leadingAnchor, constant: 16),
                listStack.trailingAnchor.constraint(equalTo: listCard.trailingAnchor, constant: -16)
            ])
            
            let widths: [[CGFloat]] = [[140, 90], [180, 110], [120, 70], [160, 100], [110, 80], [150, 95]]
            for w in widths {
                let rowStack = UIStackView()
                rowStack.axis = .horizontal
                rowStack.spacing = 12
                rowStack.alignment = .center
                
                let circle = createShimmerCircle(size: 40, color: bgBlock)
                rowStack.addArrangedSubview(circle)
                
                let textStack = UIStackView(arrangedSubviews: [
                    createShimmerLine(width: w[0], height: 14, color: bgBlock),
                    createShimmerLine(width: w[1], height: 10, color: bgBlock)
                ])
                textStack.axis = .vertical
                textStack.spacing = 6
                rowStack.addArrangedSubview(textStack)
                
                let actionBlock = createShimmerLine(width: 60, height: 20, color: bgBlock)
                rowStack.addArrangedSubview(actionBlock)
                
                listStack.addArrangedSubview(rowStack)
            }
            mainStack.addArrangedSubview(listCard)
            
        } else if path.contains("registration") || path.contains("settings") || path.contains("config") || path.contains("forgot-password") {
            // 3. FORM
            let formCard = createCardWrapper(color: bgCard, borderColor: borderColor)
            let formStack = UIStackView()
            formStack.axis = .vertical
            formStack.spacing = 16
            formStack.translatesAutoresizingMaskIntoConstraints = false
            formCard.addSubview(formStack)
            
            NSLayoutConstraint.activate([
                formStack.topAnchor.constraint(equalTo: formCard.topAnchor, constant: 20),
                formStack.bottomAnchor.constraint(equalTo: formCard.bottomAnchor, constant: -20),
                formStack.leadingAnchor.constraint(equalTo: formCard.leadingAnchor, constant: 20),
                formStack.trailingAnchor.constraint(equalTo: formCard.trailingAnchor, constant: -20)
            ])
            
            formStack.addArrangedSubview(createShimmerLine(width: 160, height: 20, color: bgBlock))
            formStack.setCustomSpacing(24, after: formStack.arrangedSubviews.last!)
            
            let labelWidths: [CGFloat] = [100, 80, 120]
            for lw in labelWidths {
                let lbl = createShimmerLine(width: lw, height: 12, color: bgBlock)
                formStack.addArrangedSubview(lbl)
                
                let box = createShimmerLine(width: nil, height: 44, color: bgBlock)
                formStack.addArrangedSubview(box)
                formStack.setCustomSpacing(16, after: box)
            }
            
            let actionsStack = UIStackView(arrangedSubviews: [
                createShimmerLine(width: 90, height: 38, color: bgBlock),
                createShimmerLine(width: 120, height: 38, color: bgBlock)
            ])
            actionsStack.axis = .horizontal
            actionsStack.spacing = 12
            actionsStack.alignment = .trailing
            formStack.addArrangedSubview(actionsStack)
            
            mainStack.addArrangedSubview(formCard)
            
        } else if path.contains("categories") || path.contains("catalog") || path.contains("inventory") {
            // 4. GRID
            mainStack.addArrangedSubview(createShimmerLine(width: 160, height: 22, color: bgBlock))
            
            let gridV = UIStackView()
            gridV.axis = .vertical
            gridV.spacing = 12
            
            for _ in 0..<2 {
                let gridH = UIStackView()
                gridH.axis = .horizontal
                gridH.spacing = 12
                gridH.distribution = .fillEqually
                
                for w in [80, 90] {
                    let card = createCardWrapper(color: bgCard, borderColor: borderColor)
                    let cStack = UIStackView(arrangedSubviews: [
                        createShimmerCircle(size: 40, color: bgBlock),
                        createShimmerLine(width: CGFloat(w), height: 16, color: bgBlock),
                        createShimmerLine(width: CGFloat(w - 30), height: 12, color: bgBlock)
                    ])
                    cStack.axis = .vertical
                    cStack.spacing = 12
                    cStack.translatesAutoresizingMaskIntoConstraints = false
                    card.addSubview(cStack)
                    NSLayoutConstraint.activate([
                        cStack.topAnchor.constraint(equalTo: card.topAnchor, constant: 16),
                        cStack.bottomAnchor.constraint(equalTo: card.bottomAnchor, constant: -16),
                        cStack.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 16),
                        cStack.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -16),
                        card.heightAnchor.constraint(equalToConstant: 140)
                    ])
                    gridH.addArrangedSubview(card)
                }
                gridV.addArrangedSubview(gridH)
            }
            mainStack.addArrangedSubview(gridV)
            
        } else {
            // 5. DETAIL
            let profCard = createCardWrapper(color: bgCard, borderColor: borderColor)
            let pStack = UIStackView()
            pStack.axis = .horizontal
            pStack.spacing = 16
            pStack.alignment = .center
            pStack.translatesAutoresizingMaskIntoConstraints = false
            profCard.addSubview(pStack)
            
            NSLayoutConstraint.activate([
                pStack.topAnchor.constraint(equalTo: profCard.topAnchor, constant: 20),
                pStack.bottomAnchor.constraint(equalTo: profCard.bottomAnchor, constant: -20),
                pStack.leadingAnchor.constraint(equalTo: profCard.leadingAnchor, constant: 20),
                pStack.trailingAnchor.constraint(equalTo: profCard.trailingAnchor, constant: -20)
            ])
            
            pStack.addArrangedSubview(createShimmerCircle(size: 60, color: bgBlock))
            let pText = UIStackView(arrangedSubviews: [
                createShimmerLine(width: 140, height: 18, color: bgBlock),
                createShimmerLine(width: 90, height: 12, color: bgBlock)
            ])
            pText.axis = .vertical
            pText.spacing = 8
            pStack.addArrangedSubview(pText)
            mainStack.addArrangedSubview(profCard)
            
            let detailsCard = createCardWrapper(color: bgCard, borderColor: borderColor)
            let dStack = UIStackView()
            dStack.axis = .vertical
            dStack.spacing = 16
            dStack.translatesAutoresizingMaskIntoConstraints = false
            detailsCard.addSubview(dStack)
            
            NSLayoutConstraint.activate([
                dStack.topAnchor.constraint(equalTo: detailsCard.topAnchor, constant: 16),
                dStack.bottomAnchor.constraint(equalTo: detailsCard.bottomAnchor, constant: -16),
                dStack.leadingAnchor.constraint(equalTo: detailsCard.leadingAnchor, constant: 16),
                dStack.trailingAnchor.constraint(equalTo: detailsCard.trailingAnchor, constant: -16)
            ])
            
            dStack.addArrangedSubview(createShimmerLine(width: 120, height: 16, color: bgBlock))
            dStack.setCustomSpacing(20, after: dStack.arrangedSubviews.last!)
            
            let dWidths: [CGFloat] = [80, 100, 60]
            for dw in dWidths {
                let rowStack = UIStackView(arrangedSubviews: [
                    createShimmerLine(width: dw, height: 12, color: bgBlock),
                    createShimmerLine(width: nil, height: 16, color: bgBlock)
                ])
                rowStack.axis = .vertical
                rowStack.spacing = 6
                dStack.addArrangedSubview(rowStack)
            }
            mainStack.addArrangedSubview(detailsCard)
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
    }
    
    private func hideSkeleton() {
        guard !skeletonView.isHidden else { return }
        activeSkeletonPath = nil
        skeletonView.layer.removeAllAnimations()
        
        UIView.animate(withDuration: 0.18, animations: {
            self.skeletonView.alpha = 0.0
        }) { _ in
            self.skeletonView.isHidden = true
        }
    }
    
    private func startPulseAnimation() {
        skeletonView.alpha = 1.0
        UIView.animate(withDuration: 0.8, delay: 0.0, options: [.repeat, .autoreverse, .allowUserInteraction], animations: {
            self.skeletonView.alpha = 0.6
        }, completion: nil)
    }
    
    private func stopPulseAnimation() {
        skeletonView.layer.removeAllAnimations()
    }
    
    private func startBellAnimationLoop() {
        guard bellAnimationTimer == nil else { return }
        bellAnimationTimer = Timer.scheduledTimer(withTimeInterval: 3.0, repeats: true) { [weak self] _ in
            self?.triggerSingleBellRing()
        }
        triggerSingleBellRing()
    }

    private func stopBellAnimationLoop() {
        bellAnimationTimer?.invalidate()
        bellAnimationTimer = nil
        notificationButton.imageView?.layer.removeAnimation(forKey: "ringing")
        notificationButton.imageView?.transform = .identity
    }

    private func triggerSingleBellRing() {
        guard let bellView = notificationButton.imageView, !notificationBadge.isHidden else { return }
        
        let animation = CAKeyframeAnimation(keyPath: "transform.rotation")
        animation.values = [0, -0.25, 0.25, -0.20, 0.20, -0.10, 0.10, 0]
        animation.keyTimes = [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 1.0]
        animation.duration = 1.2
        animation.repeatCount = 1
        bellView.layer.add(animation, forKey: "ringing")
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
                            self.notificationBadge.text = unread > 9 ? "9+" : "\(unread)"
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
