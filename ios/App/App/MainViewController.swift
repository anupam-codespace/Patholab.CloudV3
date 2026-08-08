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
    private let walletGradient     = CAGradientLayer()
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

    // MARK: – Constraints updated for dynamic safe area
    private var bottomNavHeightConstraint: NSLayoutConstraint!
    private var walletCardHeightConstraint: NSLayoutConstraint!

    // MARK: – State
    private let baseUrl      = "https://app.patholab.cloud"
    private var currentPath: String? = nil   // dedup — skip reload if already on same path
    private var selectedTab  = 0             // 0=Dashboard 1=Patients 2=Categories 3=More
    private var previousTab  = 0
    private var isDarkMode   = false
    private var walletTimer: Timer? = nil

    // ─────────────────────────────────────────────────────────────────────────
    // MARK: – Lifecycle
    // ─────────────────────────────────────────────────────────────────────────

    override func viewDidLoad() {
        super.viewDidLoad() // This initializes the Capacitor bridge and the webView
        
        view.backgroundColor = .white

        buildTopLayoutContainer() // 0. Stack view enclosing Header + Wallet Card
        buildBottomNavBar()       // 1. Native bottom nav pinned above safe area
        buildOfflineView()        // 2. Offline overlay (hidden by default)
        embedMoreViewController() // 3. More panel (hidden by default)

        // Custom User Agent setup to inject CapacitorApp dynamically to hide web header
        if let webView = self.webView {
            webView.evaluateJavaScript("navigator.userAgent") { [weak webView] (result, error) in
                if let defaultUA = result as? String {
                    webView?.customUserAgent = defaultUA + " CapacitorApp"
                }
            }
            
            // Unconditionally hide web header elements immediately at document start using injected CSS
            let css = ".mobile-app-header-web-component, header { display: none !important; }"
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
        }

        // Navigate to dashboard once layout is ready
        DispatchQueue.main.async {
            self.selectTab(0)
            
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
        // Ensure wallet card gradient fits wrapper perfectly
        let wrapperWidth = view.bounds.width - 28
        walletGradient.frame = CGRect(x: 0, y: 0, width: wrapperWidth, height: 52)
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
        }
        fetchWalletDetails()
    }

    private func stopWalletPolling() {
        walletTimer?.invalidate()
        walletTimer = nil
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

        if balance <= 20.0 {
            txtWalletStatus.text = "LOW BALANCE ( ADD FUNDS )"
            walletGradient.colors = [
                UIColor(red: 239/255, green: 68/255, blue: 68/255, alpha: 1).cgColor, // red-500
                UIColor(red: 225/255, green: 29/255, blue: 72/255, alpha: 1).cgColor // rose-600
            ]
        } else if balance < 75.0 {
            txtWalletStatus.text = "LOW BALANCE ( ADD FUNDS )"
            walletGradient.colors = [
                UIColor(red: 245/255, green: 158/255, blue: 11/255, alpha: 1).cgColor, // amber-500
                UIColor(red: 249/255, green: 115/255, blue: 22/255, alpha: 1).cgColor  // orange-500
            ]
        } else {
            txtWalletStatus.text = "ACTIVE & FUNDED"
            walletGradient.colors = [
                UIColor(red: 16/255, green: 185/255, blue: 129/255, alpha: 1).cgColor, // emerald-500
                UIColor(red: 5/255, green: 150/255, blue: 105/255, alpha: 1).cgColor  // emerald-600
            ]
        }
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
            self.currentPath = nil          // force reload even if same path
            self.selectedTab = 0
            self.updateNavTints()
            self.showWeb(path: path)
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
        menuButton.backgroundColor = UIColor(red: 241/255, green: 245/255, blue: 249/255, alpha: 1)
        menuButton.layer.cornerRadius = 19
        menuButton.setTitle("•••", for: .normal)
        menuButton.setTitleColor(UIColor(red: 71/255, green: 85/255, blue: 105/255, alpha: 1), for: .normal)
        menuButton.titleLabel?.font = .systemFont(ofSize: 10, weight: .bold)
        menuButton.translatesAutoresizingMaskIntoConstraints = false
        menuButton.addTarget(self, action: #selector(menuButtonTapped), for: .touchUpInside)
        topHeaderBar.addSubview(menuButton)

        // Subtitle & Title labels
        headerSubtitleLabel.text = "MAIN BRANCH"
        headerSubtitleLabel.font = .systemFont(ofSize: 9, weight: .bold)
        headerSubtitleLabel.textColor = UIColor(red: 148/255, green: 163/255, blue: 184/255, alpha: 1)
        headerSubtitleLabel.translatesAutoresizingMaskIntoConstraints = false
        topHeaderBar.addSubview(headerSubtitleLabel)

        headerTitleLabel.text = "FINANCIAL ANALYTICS"
        headerTitleLabel.font = .systemFont(ofSize: 15, weight: .black)
        headerTitleLabel.textColor = UIColor(red: 15/255, green: 23/255, blue: 42/255, alpha: 1)
        headerTitleLabel.translatesAutoresizingMaskIntoConstraints = false
        topHeaderBar.addSubview(headerTitleLabel)

        // Support help button
        let supportImage = UIImage(systemName: "questionmark.circle")
        supportButton.setImage(supportImage, for: .normal)
        supportButton.tintColor = UIColor(red: 71/255, green: 85/255, blue: 105/255, alpha: 1)
        supportButton.backgroundColor = UIColor(red: 241/255, green: 245/255, blue: 249/255, alpha: 1)
        supportButton.layer.cornerRadius = 18
        supportButton.translatesAutoresizingMaskIntoConstraints = false
        supportButton.addTarget(self, action: #selector(headerSupportTapped), for: .touchUpInside)
        topHeaderBar.addSubview(supportButton)

        // Theme switch button
        let themeImage = UIImage(systemName: "sun.max")
        themeButton.setImage(themeImage, for: .normal)
        themeButton.tintColor = UIColor(red: 71/255, green: 85/255, blue: 105/255, alpha: 1)
        themeButton.backgroundColor = UIColor(red: 241/255, green: 245/255, blue: 249/255, alpha: 1)
        themeButton.layer.cornerRadius = 18
        themeButton.translatesAutoresizingMaskIntoConstraints = false
        themeButton.addTarget(self, action: #selector(headerThemeTapped), for: .touchUpInside)
        topHeaderBar.addSubview(themeButton)

        // Notification bell button
        let bellImage = UIImage(systemName: "bell")
        let chevronImage = UIImage(systemName: "chevron.down")
        notificationButton.setImage(bellImage, for: .normal)
        notificationButton.tintColor = UIColor(red: 71/255, green: 85/255, blue: 105/255, alpha: 1)
        notificationButton.backgroundColor = UIColor(red: 241/255, green: 245/255, blue: 249/255, alpha: 1)
        notificationButton.layer.cornerRadius = 18
        
        // Add dropdown arrow internally for bell pill look
        let bellChevron = UIImageView(image: chevronImage)
        bellChevron.tintColor = UIColor(red: 148/255, green: 163/255, blue: 184/255, alpha: 1)
        bellChevron.translatesAutoresizingMaskIntoConstraints = false
        notificationButton.addSubview(bellChevron)
        
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

            headerTitleLabel.bottomAnchor.constraint(equalTo: menuButton.bottomAnchor, constant: -1),
            headerTitleLabel.leadingAnchor.constraint(equalTo: menuButton.trailingAnchor, constant: 12),

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
            bellChevron.heightAnchor.constraint(equalToConstant: 6)
        ])
    }

    private func buildWalletCardView() {
        walletCardView.clipsToBounds = true
        walletCardView.translatesAutoresizingMaskIntoConstraints = false
        walletCardView.isHidden = true // Hidden by default, dynamically displayed for LAB_OWNER
        
        let wrapper = UIView()
        wrapper.translatesAutoresizingMaskIntoConstraints = false
        walletCardView.addSubview(wrapper)
        
        // Gradient layer installation
        walletGradient.colors = [
            UIColor(red: 245/255, green: 158/255, blue: 11/255, alpha: 1).cgColor, // amber-500
            UIColor(red: 249/255, green: 115/255, blue: 22/255, alpha: 1).cgColor  // orange-500
        ]
        walletGradient.startPoint = CGPoint(x: 0, y: 0.5)
        walletGradient.endPoint = CGPoint(x: 1, y: 0.5)
        walletGradient.cornerRadius = 12
        wrapper.layer.addSublayer(walletGradient)
        wrapper.layer.cornerRadius = 12

        // Add Wallet Card Tap Action
        let tap = UITapGestureRecognizer(target: self, action: #selector(walletCardTapped))
        wrapper.addGestureRecognizer(tap)

        // Circle Credit Card Icon Container (slimmed to 30dp)
        walletIconBg.backgroundColor = UIColor(white: 1.0, alpha: 0.2)
        walletIconBg.layer.cornerRadius = 15
        walletIconBg.translatesAutoresizingMaskIntoConstraints = false
        wrapper.addSubview(walletIconBg)

        let cardImage = UIImage(systemName: "creditcard.fill")
        walletIconView.image = cardImage
        walletIconView.tintColor = .white
        walletIconView.contentMode = .scaleAspectFit
        walletIconView.translatesAutoresizingMaskIntoConstraints = false
        walletIconBg.addSubview(walletIconView)

        // Balance labels (refined font sizes)
        txtWalletBalance.text = "₹30.00"
        txtWalletBalance.textColor = .white
        txtWalletBalance.font = .systemFont(ofSize: 16, weight: .bold)
        txtWalletBalance.translatesAutoresizingMaskIntoConstraints = false
        wrapper.addSubview(txtWalletBalance)

        txtWalletStatus.text = "LOW BALANCE ( ADD FUNDS )"
        txtWalletStatus.textColor = UIColor(red: 255/255, green: 227/255, blue: 227/255, alpha: 1)
        txtWalletStatus.font = .systemFont(ofSize: 9, weight: .bold)
        txtWalletStatus.translatesAutoresizingMaskIntoConstraints = false
        wrapper.addSubview(txtWalletStatus)

        // Right side: Pulsing status indicator dot (instead of chevron)
        walletChevron.image = nil
        walletChevron.backgroundColor = UIColor(white: 1.0, alpha: 0.8)
        walletChevron.layer.cornerRadius = 4
        walletChevron.clipsToBounds = true
        walletChevron.translatesAutoresizingMaskIntoConstraints = false
        wrapper.addSubview(walletChevron)

        // Pulse animation
        UIView.animate(withDuration: 1.2, delay: 0, options: [.repeat, .autoreverse, .allowUserInteraction], animations: {
            self.walletChevron.alpha = 0.3
        }, completion: nil)

        topLayoutContainer.addArrangedSubview(walletCardView)

        NSLayoutConstraint.activate([
            wrapper.topAnchor.constraint(equalTo: walletCardView.topAnchor, constant: 6),
            wrapper.bottomAnchor.constraint(equalTo: walletCardView.bottomAnchor, constant: -6),
            wrapper.leadingAnchor.constraint(equalTo: walletCardView.leadingAnchor, constant: 14),
            wrapper.trailingAnchor.constraint(equalTo: walletCardView.trailingAnchor, constant: -14),
            wrapper.heightAnchor.constraint(equalToConstant: 52),

            walletIconBg.leadingAnchor.constraint(equalTo: wrapper.leadingAnchor, constant: 12),
            walletIconBg.centerYAnchor.constraint(equalTo: wrapper.centerYAnchor),
            walletIconBg.widthAnchor.constraint(equalToConstant: 30),
            walletIconBg.heightAnchor.constraint(equalToConstant: 30),

            walletIconView.centerXAnchor.constraint(equalTo: walletIconBg.centerXAnchor),
            walletIconView.centerYAnchor.constraint(equalTo: walletIconBg.centerYAnchor),
            walletIconView.widthAnchor.constraint(equalToConstant: 14),
            walletIconView.heightAnchor.constraint(equalToConstant: 14),

            txtWalletBalance.topAnchor.constraint(equalTo: walletIconBg.topAnchor, constant: -1),
            txtWalletBalance.leadingAnchor.constraint(equalTo: walletIconBg.trailingAnchor, constant: 10),

            txtWalletStatus.bottomAnchor.constraint(equalTo: walletIconBg.bottomAnchor, constant: 1),
            txtWalletStatus.leadingAnchor.constraint(equalTo: walletIconBg.trailingAnchor, constant: 10),

            walletChevron.trailingAnchor.constraint(equalTo: wrapper.trailingAnchor, constant: -16),
            walletChevron.centerYAnchor.constraint(equalTo: wrapper.centerYAnchor),
            walletChevron.widthAnchor.constraint(equalToConstant: 8),
            walletChevron.heightAnchor.constraint(equalToConstant: 8)
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
        if path.contains("analytics") { return "FINANCIAL ANALYTICS" }
        if path.contains("patients") { return "PATIENT WORKLIST" }
        if path.contains("test-management") { return "CATEGORIES" }
        if path.contains("bookings") { return "ONLINE BOOKINGS" }
        if path.contains("registration") { return "REGISTRATION" }
        if path.contains("results") { return "WORKLIST & RESULTS" }
        if path.contains("reports") { return "REPORT DISPATCH" }
        if path.contains("inventory") { return "INVENTORY & STOCK" }
        if path.contains("logistics") { return "LOGISTICS & TRIPS" }
        if path.contains("analyzers") { return "ANALYZER" }
        if path.contains("support") { return "HELP & SUPPORT" }
        if path.contains("billing") { return "INVOICES & PAYMENTS" }
        if path.contains("expenses") { return "EXPENSES" }
        if path.contains("settings") { return "LAB SETTINGS" }
        if path.contains("audit-logs") { return "AUDIT LOGS" }
        if path.contains("wallet") { return "WALLET & BILLING" }
        return "DASHBOARD"
    }

    // MARK: – UIAdaptivePresentationControllerDelegate
    func presentationControllerDidDismiss(_ presentationController: UIPresentationController) {
        selectedTab = previousTab
        updateNavTints()
        if previousTab == 0 {
            headerTitleLabel.text = getHeaderTitle(for: currentPath ?? "/workspace/analytics")
        } else if previousTab == 1 {
            headerTitleLabel.text = "PATIENT WORKLIST"
        } else if previousTab == 2 {
            headerTitleLabel.text = "CATEGORIES"
        }
    }

    // MARK: – WKWebView Key-Value Observing (KVO)
    override func observeValue(forKeyPath keyPath: String?, of object: Any?, change: [NSKeyValueChangeKey : Any]?, context: UnsafeMutableRawPointer?) {
        if keyPath == "URL", let webView = object as? WKWebView, let url = webView.url {
            checkAuthRedirect(url: url)
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
        let btnBg = isDark ? slate700 : UIColor(red: 241/255, green: 245/255, blue: 249/255, alpha: 1)
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
        
        // Update MoreViewController if instantiated
        moreVC.applyTheme(isDark: isDark)
    }

    deinit {
        if let webView = self.webView {
            webView.removeObserver(self, forKeyPath: "URL")
        }
    }
}
