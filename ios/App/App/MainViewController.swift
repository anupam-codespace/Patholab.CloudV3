import UIKit
import Capacitor
import WebKit

// MARK: – MainViewController
// Architecture: Subclass CAPBridgeViewController directly for maximum stability.
// Bottom navigation, More section, and Offline overlays are added as native subviews.
class MainViewController: CAPBridgeViewController, MoreViewControllerDelegate {

    // MARK: – Native overlay elements
    private let bottomNavBar    = UIView()
    private let bottomBorder    = UIView()
    private let navStack        = UIStackView()
    private let moreVC          = MoreViewController()
    private let offlineView     = UIView()

    // MARK: – Constraints updated for dynamic safe area
    private var bottomNavHeightConstraint: NSLayoutConstraint!

    // MARK: – State
    private let baseUrl      = "https://app.patholab.cloud"
    private var currentPath: String? = nil   // dedup — skip reload if already on same path
    private var selectedTab  = 0             // 0=Dashboard 1=Patients 2=Categories 3=More

    // ─────────────────────────────────────────────────────────────────────────
    // MARK: – Lifecycle
    // ─────────────────────────────────────────────────────────────────────────

    override func viewDidLoad() {
        super.viewDidLoad() // This initializes the Capacitor bridge and the webView
        
        view.backgroundColor = .white

        buildBottomNavBar()      // 1. Native bottom nav pinned above safe area
        buildOfflineView()       // 2. Offline overlay (hidden by default)
        embedMoreViewController()// 3. More panel (hidden by default)

        // Adjust WebView constraints so it sits perfectly above the bottom navigation bar
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
                    webView.topAnchor.constraint(equalTo: superview.topAnchor),
                    webView.leadingAnchor.constraint(equalTo: superview.leadingAnchor),
                    webView.trailingAnchor.constraint(equalTo: superview.trailingAnchor),
                    webView.bottomAnchor.constraint(equalTo: bottomNavBar.topAnchor)
                ])
            }
            
            // Enable iOS swipe-back through web history
            webView.allowsBackForwardNavigationGestures = true
        }

        // Navigate to dashboard once layout is ready
        DispatchQueue.main.async { self.selectTab(0) }
    }

    override func viewSafeAreaInsetsDidChange() {
        super.viewSafeAreaInsetsDidChange()
        bottomNavHeightConstraint.constant = 56 + view.safeAreaInsets.bottom
        view.layoutIfNeeded()
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
        // Image + title stacked vertically via custom layout
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
            let color: UIColor = active
                ? UIColor(red: 55/255, green: 48/255, blue: 163/255, alpha: 1)
                : UIColor(white: 0.55, alpha: 1)
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
        addChild(moreVC)
        view.addSubview(moreVC.view)
        moreVC.view.translatesAutoresizingMaskIntoConstraints = false
        moreVC.view.isHidden = true

        NSLayoutConstraint.activate([
            moreVC.view.topAnchor.constraint(equalTo: view.topAnchor),
            moreVC.view.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            moreVC.view.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            moreVC.view.bottomAnchor.constraint(equalTo: bottomNavBar.topAnchor)
        ])
        moreVC.didMove(toParent: self)
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
            offlineView.topAnchor.constraint(equalTo: view.topAnchor),
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
        selectTab(sender.tag)
    }

    private func selectTab(_ tag: Int) {
        selectedTab = tag
        updateNavTints()

        switch tag {
        case 0: showWeb(path: "/workspace/analytics")
        case 1: showWeb(path: "/workspace/patients")
        case 2: showWeb(path: "/workspace/test-management")
        case 3: showMorePanel()
        default: break
        }
    }

    private func showWeb(path: String) {
        moreVC.view.isHidden  = true
        offlineView.isHidden  = true
        loadUrl(path: path)
    }

    private func showMorePanel() {
        offlineView.isHidden  = true
        moreVC.view.isHidden  = false
    }

    private func loadUrl(path: String) {
        guard let webView = self.webView else { return }
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
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MARK: – MoreViewControllerDelegate
    // ─────────────────────────────────────────────────────────────────────────

    func didSelectModule(path: String) {
        currentPath = nil          // force reload even if same path
        selectedTab = 0
        updateNavTints()
        showWeb(path: path)
    }

    func didTapSignOut() {
        guard let app = UIApplication.shared.delegate as? AppDelegate else { return }
        app.signOut()
    }
}
