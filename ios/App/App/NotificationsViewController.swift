import UIKit
import WebKit

class NotificationsViewController: UIViewController, UITableViewDelegate, UITableViewDataSource {

    private static let baseUrl = "https://app.patholab.cloud"
    private static let autoSyncInterval: TimeInterval = 15.0 // 15s matching Android's refresh rate

    // Header Views
    private let heroHeaderView = UIView()
    private let backBtn = UIButton(type: .system)
    private let refreshBtn = UIButton(type: .system)
    private let gatewayBtn = UIButton(type: .system)
    private let titleLbl = UILabel()
    private let subtitleLbl = UILabel()
    private let unreadBadgeLbl = UILabel()

    // Filter Chips & Quick Action Sub-bar
    private let filterContainer = UIView()
    private let filterScrollView = UIScrollView()
    private let filterStackView = UIStackView()
    private let autoSyncStatusLbl = UILabel()
    private let markAllReadBtn = UIButton(type: .system)

    // TableView & States
    private let tableView = UITableView()
    private let refreshControl = UIRefreshControl()
    private let loadingIndicator = UIActivityIndicatorView(style: .medium)
    private let emptyView = UIView()

    // Data
    private var allNotifications: [[String: Any]] = []
    private var filteredNotifications: [[String: Any]] = []
    private var currentFilter: String = "ALL" // ALL, UNREAD, TESTS, SYSTEM
    private var autoSyncTimer: Timer?
    private static var imageCache = NSCache<NSString, UIImage>()

    var isDarkMode = false
    var lastSeenTime: Double = 0.0
    var onAllRead: (() -> Void)?

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 0.973, green: 0.980, blue: 0.988, alpha: 1)

        setupHeroHeader()
        setupFilterBar()
        setupTableView()
        setupEmptyView()

        UserDefaults.standard.set(false, forKey: "has_unread_notifications")
        NotificationCenter.default.post(name: NSNotification.Name("NotificationsMarkedRead"), object: nil)
        onAllRead?()

        loadNotificationsData(isManual: false)
        startAutoSyncTimer()
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        // Immediately sync on appearance, like Android does on resume
        loadNotificationsData(isManual: false)
        startAutoSyncTimer()
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        startLiveSyncPulseAnimation()
    }

    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        stopAutoSyncTimer()
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  UI LAYOUT SETUP
    // ─────────────────────────────────────────────────────────────────────────
    private func setupHeroHeader() {
        heroHeaderView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(heroHeaderView)

        let gradient = CAGradientLayer()
        gradient.colors = [
            UIColor(red: 0.043, green: 0.278, blue: 0.749, alpha: 1).cgColor, // #0B47BF
            UIColor(red: 0.114, green: 0.408, blue: 0.933, alpha: 1).cgColor  // #1D68EE
        ]
        gradient.startPoint = CGPoint(x: 0, y: 0)
        gradient.endPoint = CGPoint(x: 1, y: 1)
        gradient.frame = CGRect(x: 0, y: 0, width: UIScreen.main.bounds.width, height: 130)
        heroHeaderView.layer.insertSublayer(gradient, at: 0)

        // Back Button (crisp circular white button)
        backBtn.translatesAutoresizingMaskIntoConstraints = false
        backBtn.setImage(UIImage(systemName: "arrow.left"), for: .normal)
        backBtn.tintColor = UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1)
        backBtn.backgroundColor = .white
        backBtn.layer.cornerRadius = 19
        backBtn.layer.shadowColor = UIColor.black.cgColor
        backBtn.layer.shadowOpacity = 0.1
        backBtn.layer.shadowOffset = CGSize(width: 0, height: 2)
        backBtn.layer.shadowRadius = 4
        backBtn.addTarget(self, action: #selector(backTapped), for: .touchUpInside)
        heroHeaderView.addSubview(backBtn)

        // Title Stack
        let titleStack = UIStackView()
        titleStack.translatesAutoresizingMaskIntoConstraints = false
        titleStack.axis = .vertical
        titleStack.spacing = 2
        heroHeaderView.addSubview(titleStack)

        let titleRow = UIStackView()
        titleRow.axis = .horizontal
        titleRow.spacing = 8
        titleRow.alignment = .center

        titleLbl.text = "Notifications"
        titleLbl.font = .systemFont(ofSize: 18, weight: .bold)
        titleLbl.textColor = .white
        titleRow.addArrangedSubview(titleLbl)

        unreadBadgeLbl.text = "0 New"
        unreadBadgeLbl.font = .systemFont(ofSize: 11, weight: .bold)
        unreadBadgeLbl.textColor = UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1)
        unreadBadgeLbl.backgroundColor = .white
        unreadBadgeLbl.layer.cornerRadius = 8
        unreadBadgeLbl.clipsToBounds = true
        unreadBadgeLbl.textAlignment = .center
        unreadBadgeLbl.isHidden = true
        unreadBadgeLbl.setContentHuggingPriority(.required, for: .horizontal)
        titleRow.addArrangedSubview(unreadBadgeLbl)

        titleStack.addArrangedSubview(titleRow)

        subtitleLbl.text = "Live Alert Feed • Gateway Sync"
        subtitleLbl.font = .systemFont(ofSize: 11.5, weight: .medium)
        subtitleLbl.textColor = UIColor(red: 0.78, green: 0.87, blue: 1.0, alpha: 1)
        titleStack.addArrangedSubview(subtitleLbl)

        // Gateway Settings Button
        gatewayBtn.translatesAutoresizingMaskIntoConstraints = false
        gatewayBtn.setImage(UIImage(systemName: "slider.horizontal.3"), for: .normal)
        gatewayBtn.tintColor = .white
        gatewayBtn.backgroundColor = UIColor.white.withAlphaComponent(0.20)
        gatewayBtn.layer.cornerRadius = 18
        gatewayBtn.layer.borderWidth = 1
        gatewayBtn.layer.borderColor = UIColor.white.withAlphaComponent(0.35).cgColor
        gatewayBtn.addTarget(self, action: #selector(gatewayTapped), for: .touchUpInside)
        heroHeaderView.addSubview(gatewayBtn)

        // Refresh Button
        refreshBtn.translatesAutoresizingMaskIntoConstraints = false
        refreshBtn.setImage(UIImage(systemName: "arrow.clockwise"), for: .normal)
        refreshBtn.tintColor = .white
        refreshBtn.backgroundColor = UIColor.white.withAlphaComponent(0.20)
        refreshBtn.layer.cornerRadius = 18
        refreshBtn.layer.borderWidth = 1
        refreshBtn.layer.borderColor = UIColor.white.withAlphaComponent(0.35).cgColor
        refreshBtn.addTarget(self, action: #selector(refreshTapped), for: .touchUpInside)
        heroHeaderView.addSubview(refreshBtn)

        NSLayoutConstraint.activate([
            heroHeaderView.topAnchor.constraint(equalTo: view.topAnchor),
            heroHeaderView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            heroHeaderView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            // Dynamic height: safe area top + 80pt of content, handles all notch sizes
            heroHeaderView.heightAnchor.constraint(greaterThanOrEqualToConstant: 120),

            backBtn.leadingAnchor.constraint(equalTo: heroHeaderView.leadingAnchor, constant: 16),
            backBtn.bottomAnchor.constraint(equalTo: heroHeaderView.bottomAnchor, constant: -14),
            backBtn.widthAnchor.constraint(equalToConstant: 38),
            backBtn.heightAnchor.constraint(equalToConstant: 38),

            titleStack.leadingAnchor.constraint(equalTo: backBtn.trailingAnchor, constant: 12),
            titleStack.centerYAnchor.constraint(equalTo: backBtn.centerYAnchor),
            titleStack.trailingAnchor.constraint(lessThanOrEqualTo: gatewayBtn.leadingAnchor, constant: -8),

            refreshBtn.trailingAnchor.constraint(equalTo: heroHeaderView.trailingAnchor, constant: -16),
            refreshBtn.centerYAnchor.constraint(equalTo: backBtn.centerYAnchor),
            refreshBtn.widthAnchor.constraint(equalToConstant: 36),
            refreshBtn.heightAnchor.constraint(equalToConstant: 36),

            gatewayBtn.trailingAnchor.constraint(equalTo: refreshBtn.leadingAnchor, constant: -8),
            gatewayBtn.centerYAnchor.constraint(equalTo: backBtn.centerYAnchor),
            gatewayBtn.widthAnchor.constraint(equalToConstant: 36),
            gatewayBtn.heightAnchor.constraint(equalToConstant: 36),

            unreadBadgeLbl.heightAnchor.constraint(equalToConstant: 20),
            unreadBadgeLbl.widthAnchor.constraint(greaterThanOrEqualToConstant: 54)
        ])
    }

    private func setupFilterBar() {
        filterContainer.translatesAutoresizingMaskIntoConstraints = false
        filterContainer.backgroundColor = .white
        filterContainer.layer.shadowColor = UIColor.black.cgColor
        filterContainer.layer.shadowOpacity = 0.04
        filterContainer.layer.shadowOffset = CGSize(width: 0, height: 2)
        filterContainer.layer.shadowRadius = 4
        view.addSubview(filterContainer)

        filterScrollView.translatesAutoresizingMaskIntoConstraints = false
        filterScrollView.showsHorizontalScrollIndicator = false
        filterContainer.addSubview(filterScrollView)

        filterStackView.translatesAutoresizingMaskIntoConstraints = false
        filterStackView.axis = .horizontal
        filterStackView.spacing = 8
        filterScrollView.addSubview(filterStackView)

        let filters = [
            ("ALL", "All Alerts"),
            ("UNREAD", "Unread"),
            ("TESTS", "Lab & Tests"),
            ("SYSTEM", "System & Billing")
        ]

        for (key, title) in filters {
            let chip = UIButton(type: .system)
            chip.setTitle(title, for: .normal)
            chip.titleLabel?.font = .systemFont(ofSize: 12, weight: key == currentFilter ? .bold : .medium)
            chip.layer.cornerRadius = 16
            chip.contentEdgeInsets = UIEdgeInsets(top: 6, left: 14, bottom: 6, right: 14)
            chip.accessibilityIdentifier = key

            updateChipStyle(chip, isSelected: key == currentFilter)
            chip.addTarget(self, action: #selector(chipTapped(_:)), for: .touchUpInside)
            filterStackView.addArrangedSubview(chip)
        }

        // Sub-bar with Live Auto-sync status and "Mark all as read"
        let subBar = UIView()
        subBar.translatesAutoresizingMaskIntoConstraints = false
        filterContainer.addSubview(subBar)

        autoSyncStatusLbl.translatesAutoresizingMaskIntoConstraints = false
        autoSyncStatusLbl.text = "● Auto-syncing live"
        autoSyncStatusLbl.font = .systemFont(ofSize: 11, weight: .bold)
        autoSyncStatusLbl.textColor = UIColor(red: 0.020, green: 0.588, blue: 0.412, alpha: 1) // emerald
        subBar.addSubview(autoSyncStatusLbl)

        markAllReadBtn.translatesAutoresizingMaskIntoConstraints = false
        markAllReadBtn.setTitle("✓ Mark all as read", for: .normal)
        markAllReadBtn.setTitleColor(UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1), for: .normal)
        markAllReadBtn.titleLabel?.font = .systemFont(ofSize: 12, weight: .bold)
        markAllReadBtn.backgroundColor = UIColor(red: 0.937, green: 0.965, blue: 1.0, alpha: 1)
        markAllReadBtn.layer.cornerRadius = 12
        markAllReadBtn.contentEdgeInsets = UIEdgeInsets(top: 4, left: 10, bottom: 4, right: 10)
        markAllReadBtn.addTarget(self, action: #selector(markAllReadTapped), for: .touchUpInside)
        subBar.addSubview(markAllReadBtn)

        NSLayoutConstraint.activate([
            filterContainer.topAnchor.constraint(equalTo: heroHeaderView.bottomAnchor),
            filterContainer.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            filterContainer.trailingAnchor.constraint(equalTo: view.trailingAnchor),

            filterScrollView.topAnchor.constraint(equalTo: filterContainer.topAnchor, constant: 10),
            filterScrollView.leadingAnchor.constraint(equalTo: filterContainer.leadingAnchor),
            filterScrollView.trailingAnchor.constraint(equalTo: filterContainer.trailingAnchor),
            filterScrollView.heightAnchor.constraint(equalToConstant: 34),

            filterStackView.topAnchor.constraint(equalTo: filterScrollView.topAnchor),
            filterStackView.bottomAnchor.constraint(equalTo: filterScrollView.bottomAnchor),
            filterStackView.leadingAnchor.constraint(equalTo: filterScrollView.leadingAnchor, constant: 16),
            filterStackView.trailingAnchor.constraint(equalTo: filterScrollView.trailingAnchor, constant: -16),
            filterStackView.heightAnchor.constraint(equalTo: filterScrollView.heightAnchor),

            subBar.topAnchor.constraint(equalTo: filterScrollView.bottomAnchor, constant: 8),
            subBar.leadingAnchor.constraint(equalTo: filterContainer.leadingAnchor, constant: 16),
            subBar.trailingAnchor.constraint(equalTo: filterContainer.trailingAnchor, constant: -16),
            subBar.bottomAnchor.constraint(equalTo: filterContainer.bottomAnchor, constant: -8),
            subBar.heightAnchor.constraint(equalToConstant: 28),

            autoSyncStatusLbl.leadingAnchor.constraint(equalTo: subBar.leadingAnchor),
            autoSyncStatusLbl.centerYAnchor.constraint(equalTo: subBar.centerYAnchor),

            markAllReadBtn.trailingAnchor.constraint(equalTo: subBar.trailingAnchor),
            markAllReadBtn.centerYAnchor.constraint(equalTo: subBar.centerYAnchor)
        ])
    }

    private func updateChipStyle(_ chip: UIButton, isSelected: Bool) {
        if isSelected {
            chip.backgroundColor = UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1)
            chip.setTitleColor(.white, for: .normal)
            chip.layer.borderWidth = 0
        } else {
            chip.backgroundColor = UIColor(red: 0.945, green: 0.961, blue: 0.976, alpha: 1)
            chip.setTitleColor(UIColor(red: 0.392, green: 0.455, blue: 0.545, alpha: 1), for: .normal)
            chip.layer.borderWidth = 1
            chip.layer.borderColor = UIColor(red: 0.886, green: 0.910, blue: 0.941, alpha: 1).cgColor
        }
    }

    private func setupTableView() {
        tableView.translatesAutoresizingMaskIntoConstraints = false
        tableView.backgroundColor = .clear
        tableView.separatorStyle = .none
        tableView.delegate = self
        tableView.dataSource = self
        tableView.contentInset = UIEdgeInsets(top: 8, left: 0, bottom: 40, right: 0)
        tableView.register(NotificationCardCell.self, forCellReuseIdentifier: "NotificationCardCell")
        view.addSubview(tableView)

        refreshControl.addTarget(self, action: #selector(pullRefreshed), for: .valueChanged)
        tableView.addSubview(refreshControl)

        loadingIndicator.translatesAutoresizingMaskIntoConstraints = false
        loadingIndicator.hidesWhenStopped = true
        loadingIndicator.color = UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1)
        view.addSubview(loadingIndicator)

        NSLayoutConstraint.activate([
            tableView.topAnchor.constraint(equalTo: filterContainer.bottomAnchor),
            tableView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            tableView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            tableView.bottomAnchor.constraint(equalTo: view.bottomAnchor),

            loadingIndicator.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            loadingIndicator.centerYAnchor.constraint(equalTo: tableView.centerYAnchor)
        ])
    }

    private func setupEmptyView() {
        emptyView.translatesAutoresizingMaskIntoConstraints = false
        emptyView.isHidden = true
        view.addSubview(emptyView)

        let icon = UIImageView(image: UIImage(systemName: "bell.slash.fill"))
        icon.tintColor = UIColor(red: 0.796, green: 0.835, blue: 0.882, alpha: 1)
        icon.contentMode = .scaleAspectFit
        icon.translatesAutoresizingMaskIntoConstraints = false
        emptyView.addSubview(icon)

        let title = UILabel()
        title.text = "All Caught Up!"
        title.font = .systemFont(ofSize: 17, weight: .bold)
        title.textColor = UIColor(red: 0.12, green: 0.16, blue: 0.23, alpha: 1)
        title.translatesAutoresizingMaskIntoConstraints = false
        emptyView.addSubview(title)

        let sub = UILabel()
        sub.text = "No alerts or announcements found for this filter.\nNew lab events and messages will sync live automatically."
        sub.font = .systemFont(ofSize: 13)
        sub.textColor = UIColor(red: 0.392, green: 0.455, blue: 0.545, alpha: 1)
        sub.textAlignment = .center
        sub.numberOfLines = 0
        sub.translatesAutoresizingMaskIntoConstraints = false
        emptyView.addSubview(sub)

        NSLayoutConstraint.activate([
            emptyView.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            emptyView.centerYAnchor.constraint(equalTo: tableView.centerYAnchor),
            emptyView.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 32),
            emptyView.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -32),

            icon.topAnchor.constraint(equalTo: emptyView.topAnchor),
            icon.centerXAnchor.constraint(equalTo: emptyView.centerXAnchor),
            icon.widthAnchor.constraint(equalToConstant: 54),
            icon.heightAnchor.constraint(equalToConstant: 54),

            title.topAnchor.constraint(equalTo: icon.bottomAnchor, constant: 14),
            title.centerXAnchor.constraint(equalTo: emptyView.centerXAnchor),

            sub.topAnchor.constraint(equalTo: title.bottomAnchor, constant: 6),
            sub.leadingAnchor.constraint(equalTo: emptyView.leadingAnchor),
            sub.trailingAnchor.constraint(equalTo: emptyView.trailingAnchor),
            sub.bottomAnchor.constraint(equalTo: emptyView.bottomAnchor)
        ])
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  TIMER & DATA SYNC
    // ─────────────────────────────────────────────────────────────────────────
    private func startAutoSyncTimer() {
        stopAutoSyncTimer()
        autoSyncTimer = Timer.scheduledTimer(withTimeInterval: Self.autoSyncInterval, repeats: true) { [weak self] _ in
            self?.loadNotificationsData(isManual: false)
        }
    }

    private func stopAutoSyncTimer() {
        autoSyncTimer?.invalidate()
        autoSyncTimer = nil
    }

    // Pulsing animation on the live-sync dot to match Android's live indicator behaviour
    private func startLiveSyncPulseAnimation() {
        guard autoSyncStatusLbl.layer.animation(forKey: "pulse") == nil else { return }
        let pulse = CAKeyframeAnimation(keyPath: "opacity")
        pulse.values = [1.0, 0.4, 1.0]
        pulse.keyTimes = [0, 0.5, 1]
        pulse.duration = 1.8
        pulse.repeatCount = .infinity
        autoSyncStatusLbl.layer.add(pulse, forKey: "pulse")
    }

    private func getAuthToken() -> String? {
        if let token = KeychainManager.shared.getToken(), !token.isEmpty {
            return token
        }
        if let token = UserDefaults.standard.string(forKey: "auth_token"), !token.isEmpty {
            return token
        }
        if let cookies = HTTPCookieStorage.shared.cookies {
            for cookie in cookies {
                if (cookie.name == "token" || cookie.name == "auth-token") && !cookie.value.isEmpty {
                    return cookie.value
                }
            }
        }
        return nil
    }

    private func loadNotificationsData(isManual: Bool) {
        if !refreshControl.isRefreshing && allNotifications.isEmpty {
            loadingIndicator.startAnimating()
        }

        let token = getAuthToken()
        guard let url = URL(string: "\(Self.baseUrl)/api/notifications") else {
            loadingIndicator.stopAnimating()
            refreshControl.endRefreshing()
            return
        }

        let store = WKWebsiteDataStore.default()
        store.httpCookieStore.getAllCookies { [weak self] cookies in
            guard let self = self else { return }

            var request = URLRequest(url: url, timeoutInterval: 10)
            request.httpMethod = "GET"
            request.setValue("application/json", forHTTPHeaderField: "Accept")

            if let token = token, !token.isEmpty {
                request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            }

            var cookieParts: [String] = []
            if let token = token, !token.isEmpty {
                cookieParts.append("token=\(token)")
                cookieParts.append("auth-token=\(token)")
            }
            for c in cookies where c.domain.contains("patholab.cloud") {
                cookieParts.append("\(c.name)=\(c.value)")
            }
            if !cookieParts.isEmpty {
                request.setValue(cookieParts.joined(separator: "; "), forHTTPHeaderField: "Cookie")
            }

            URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
                DispatchQueue.main.async {
                    guard let self = self else { return }
                    self.loadingIndicator.stopAnimating()
                    self.refreshControl.endRefreshing()

                    guard let data = data, error == nil,
                          let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                          let list = json["notifications"] as? [[String: Any]] else {
                        self.applyFilter()
                        return
                    }

                    var unreadServer = json["unreadCount"] as? Int ?? 0
                    if unreadServer == 0 {
                        unreadServer = list.filter { ($0["isRead"] as? Bool) == false }.count
                    }

                    self.allNotifications = list
                    self.updateBadgeUi(unreadCount: unreadServer)
                    self.applyFilter()

                    if isManual {
                        self.showToast("Notifications synchronized")
                    }
                }
            }.resume()
        }
    }

    private func updateBadgeUi(unreadCount: Int) {
        if unreadCount > 0 {
            unreadBadgeLbl.isHidden = false
            unreadBadgeLbl.text = " \(unreadCount) New "
        } else {
            unreadBadgeLbl.isHidden = true
        }
    }

    private func applyFilter() {
        filteredNotifications = allNotifications.filter { notif in
            let isRead = notif["isRead"] as? Bool ?? true
            let type = (notif["type"] as? String ?? "SYSTEM").uppercased()

            switch currentFilter {
            case "ALL":
                return true
            case "UNREAD":
                return !isRead
            case "TESTS":
                return type.contains("TEST") || type.contains("SAMPLE") || type.contains("REPORT") || type.contains("LAB")
            case "SYSTEM":
                return type.contains("SYSTEM") || type.contains("ALERT") || type.contains("PAYMENT") || type.contains("PROMOTION")
            default:
                return true
            }
        }

        tableView.reloadData()
        emptyView.isHidden = !filteredNotifications.isEmpty
        tableView.isHidden = filteredNotifications.isEmpty
    }

    @objc private func markAllReadTapped() {
        // Optimistic UI update
        var hadUnread = false
        for idx in 0..<allNotifications.count {
            if (allNotifications[idx]["isRead"] as? Bool) == false {
                hadUnread = true
                allNotifications[idx]["isRead"] = true
            }
        }
        updateBadgeUi(unreadCount: 0)
        applyFilter()
        onAllRead?()

        if !hadUnread {
            showToast("All notifications are already marked read")
            return
        }

        // Call backend POST /api/notifications/mark-read
        let token = getAuthToken()
        guard let url = URL(string: "\(Self.baseUrl)/api/notifications/mark-read") else { return }

        let store = WKWebsiteDataStore.default()
        store.httpCookieStore.getAllCookies { [weak self] cookies in
            guard let self = self else { return }
            var req = URLRequest(url: url, timeoutInterval: 8)
            req.httpMethod = "POST"
            req.setValue("application/json", forHTTPHeaderField: "Content-Type")

            if let token = token, !token.isEmpty {
                req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            }
            var cookieParts: [String] = []
            if let token = token, !token.isEmpty {
                cookieParts.append("token=\(token)")
                cookieParts.append("auth-token=\(token)")
            }
            for c in cookies where c.domain.contains("patholab.cloud") {
                cookieParts.append("\(c.name)=\(c.value)")
            }
            if !cookieParts.isEmpty {
                req.setValue(cookieParts.joined(separator: "; "), forHTTPHeaderField: "Cookie")
            }
            req.httpBody = "{}".data(using: .utf8)

            URLSession.shared.dataTask(with: req) { [weak self] _, response, _ in
                DispatchQueue.main.async {
                    let status = (response as? HTTPURLResponse)?.statusCode ?? 0
                    if status >= 200 && status < 300 {
                        self?.showToast("Marked all as read")
                    }
                }
            }.resume()
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  GATEWAY CONFIGURATION SHEET (WHATSAPP & SMS LIVE SYNC)
    // ─────────────────────────────────────────────────────────────────────────
    @objc private func gatewayTapped() {
        let alert = UIAlertController(
            title: "Alert Gateway Settings",
            message: "Configure WhatsApp & SMS gateways for automated patient alerts. Changes sync live with web.",
            preferredStyle: .alert
        )

        alert.addTextField { tf in
            tf.placeholder = "WhatsApp API Key"
            tf.isSecureTextEntry = true
        }
        alert.addTextField { tf in
            tf.placeholder = "WhatsApp Phone Number ID"
        }
        alert.addTextField { tf in
            tf.placeholder = "SMS API Key"
            tf.isSecureTextEntry = true
        }
        alert.addTextField { tf in
            tf.placeholder = "SMS Sender ID (e.g. PTHLAB)"
            tf.autocapitalizationType = .allCharacters
        }

        // Pre-fetch current settings
        let token = getAuthToken()
        if let url = URL(string: "\(Self.baseUrl)/api/workspace/settings") {
            var req = URLRequest(url: url)
            req.httpMethod = "GET"
            if let token = token, !token.isEmpty {
                req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
                req.setValue("token=\(token); auth-token=\(token)", forHTTPHeaderField: "Cookie")
            }
            URLSession.shared.dataTask(with: req) { data, _, _ in
                if let data = data,
                   let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                   let lab = json["lab"] as? [String: Any] {
                    DispatchQueue.main.async {
                        alert.textFields?[0].text = lab["whatsappApiKey"] as? String
                        alert.textFields?[1].text = lab["whatsappPhoneId"] as? String
                        alert.textFields?[2].text = lab["smsApiKey"] as? String
                        alert.textFields?[3].text = lab["smsSenderId"] as? String
                    }
                }
            }.resume()
        }

        let saveAction = UIAlertAction(title: "Save & Sync to Web", style: .default) { [weak self] _ in
            guard let self = self else { return }
            let waKey = alert.textFields?[0].text?.trimmingCharacters(in: .whitespaces) ?? ""
            let waPhone = alert.textFields?[1].text?.trimmingCharacters(in: .whitespaces) ?? ""
            let smsKey = alert.textFields?[2].text?.trimmingCharacters(in: .whitespaces) ?? ""
            let smsSender = alert.textFields?[3].text?.trimmingCharacters(in: .whitespaces) ?? ""

            self.saveGatewaySettings(waKey: waKey, waPhone: waPhone, smsKey: smsKey, smsSender: smsSender)
        }

        alert.addAction(saveAction)
        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel, handler: nil))
        present(alert, animated: true, completion: nil)
    }

    private func saveGatewaySettings(waKey: String, waPhone: String, smsKey: String, smsSender: String) {
        guard let token = getAuthToken(),
              let url = URL(string: "\(Self.baseUrl)/api/workspace/settings") else { return }

        var req = URLRequest(url: url)
        req.httpMethod = "PATCH"
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        req.setValue("token=\(token); auth-token=\(token)", forHTTPHeaderField: "Cookie")
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let payload: [String: Any] = [
            "whatsappApiKey": waKey,
            "whatsappPhoneId": waPhone,
            "smsApiKey": smsKey,
            "smsSenderId": smsSender
        ]
        req.httpBody = try? JSONSerialization.data(withJSONObject: payload)

        URLSession.shared.dataTask(with: req) { [weak self] _, response, error in
            DispatchQueue.main.async {
                guard let self = self, error == nil else {
                    self?.showToast("Network error saving gateways")
                    return
                }
                let status = (response as? HTTPURLResponse)?.statusCode ?? 0
                if status >= 200 && status < 300 {
                    self.showToast("Gateways saved & synced to web")
                } else {
                    self.showToast("Settings updated locally")
                }
            }
        }.resume()
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  TABLEVIEW DATA SOURCE & ACTIONS
    // ─────────────────────────────────────────────────────────────────────────
    func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        return filteredNotifications.count
    }

    func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        guard let cell = tableView.dequeueReusableCell(withIdentifier: "NotificationCardCell", for: indexPath) as? NotificationCardCell else {
            return UITableViewCell()
        }

        let notif = filteredNotifications[indexPath.row]
        cell.configure(notification: notif)
        cell.onLinkTap = { [weak self] linkUrl in
            self?.handleOpenLink(linkUrl)
        }

        return cell
    }

    func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        tableView.deselectRow(at: indexPath, animated: true)
        var notif = filteredNotifications[indexPath.row]
        notif["isRead"] = true
        filteredNotifications[indexPath.row] = notif
        tableView.reloadRows(at: [indexPath], with: .fade)

        if let link = notif["link"] as? String, !link.isEmpty {
            handleOpenLink(link)
        }
    }

    private func handleOpenLink(_ link: String) {
        guard !link.isEmpty else { return }
        if link.hasPrefix("http://") || link.hasPrefix("https://"), let url = URL(string: link) {
            UIApplication.shared.open(url, options: [:], completionHandler: nil)
            return
        }

        // Internal module navigation
        let low = link.lowercased()
        if low.contains("test") {
            let vc = TestManagementViewController()
            present(vc, animated: true)
        } else if low.contains("worklist") || low.contains("patient") {
            let vc = PatientWorklistViewController()
            present(vc, animated: true)
        } else if low.contains("doctor") {
            let vc = ReferralDoctorsViewController()
            present(vc, animated: true)
        } else if low.contains("wallet") || low.contains("billing") {
            let vc = WalletViewController()
            present(vc, animated: true)
        } else if low.contains("report") {
            let vc = ReportsViewController()
            present(vc, animated: true)
        } else if low.contains("sample") {
            let vc = SamplesViewController()
            present(vc, animated: true)
        } else if low.contains("staff") {
            let vc = StaffManagementViewController()
            present(vc, animated: true)
        } else if low.contains("ris") || low.contains("radiology") {
            let vc = RISDashboardViewController()
            present(vc, animated: true)
        } else {
            showToast("Opening \(link)")
        }
    }

    @objc private func backTapped() {
        dismiss(animated: true, completion: nil)
    }

    @objc private func refreshTapped() {
        animateRefreshIcon()
        loadNotificationsData(isManual: true)
    }

    @objc private func pullRefreshed() {
        loadNotificationsData(isManual: true)
    }

    @objc private func chipTapped(_ sender: UIButton) {
        guard let key = sender.accessibilityIdentifier else { return }
        currentFilter = key

        for view in filterStackView.arrangedSubviews {
            if let b = view as? UIButton {
                updateChipStyle(b, isSelected: b.accessibilityIdentifier == currentFilter)
            }
        }
        applyFilter()
    }

    private func animateRefreshIcon() {
        let rotation = CABasicAnimation(keyPath: "transform.rotation.z")
        rotation.toValue = NSNumber(value: Double.pi * 2.0)
        rotation.duration = 0.6
        rotation.isCumulative = true
        rotation.repeatCount = 1
        refreshBtn.layer.add(rotation, forKey: "rotationAnimation")
    }

    private func showToast(_ msg: String) {
        let toast = UILabel()
        toast.text = "  \(msg)  "
        toast.font = .systemFont(ofSize: 13, weight: .bold)
        toast.textColor = .white
        toast.backgroundColor = UIColor(white: 0.15, alpha: 0.9)
        toast.layer.cornerRadius = 16
        toast.clipsToBounds = true
        toast.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(toast)

        NSLayoutConstraint.activate([
            toast.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            toast.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -24),
            toast.heightAnchor.constraint(equalToConstant: 32)
        ])

        UIView.animate(withDuration: 0.3, delay: 2.0, options: .curveEaseOut) {
            toast.alpha = 0
        } completion: { _ in
            toast.removeFromSuperview()
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
//  NOTIFICATION CARD CELL
// ─────────────────────────────────────────────────────────────────────────────
class NotificationCardCell: UITableViewCell {

    var onLinkTap: ((String) -> Void)?

    private let cardView = UIView()
    private let iconContainer = UIView()
    private let iconImageView = UIImageView()
    private let titleLabel = UILabel()
    private let timeLabel = UILabel()
    private let unreadDot = UIView()
    private let messageLabel = UILabel()
    private let attachmentImageView = UIImageView()
    private let linkBtn = UIButton(type: .system)

    private var currentLink: String = ""

    override init(style: UITableViewCell.CellStyle, reuseIdentifier: String?) {
        super.init(style: style, reuseIdentifier: reuseIdentifier)
        selectionStyle = .none
        backgroundColor = .clear
        setupViews()
    }

    required init?(coder: NSCoder) { fatalError() }

    private func setupViews() {
        cardView.translatesAutoresizingMaskIntoConstraints = false
        cardView.backgroundColor = .white
        cardView.layer.cornerRadius = 14
        cardView.layer.shadowColor = UIColor.black.cgColor
        cardView.layer.shadowOpacity = 0.04
        cardView.layer.shadowOffset = CGSize(width: 0, height: 2)
        cardView.layer.shadowRadius = 4
        contentView.addSubview(cardView)

        // Category Icon Container
        iconContainer.translatesAutoresizingMaskIntoConstraints = false
        iconContainer.layer.cornerRadius = 19
        iconContainer.clipsToBounds = true
        cardView.addSubview(iconContainer)

        iconImageView.translatesAutoresizingMaskIntoConstraints = false
        iconImageView.contentMode = .scaleAspectFit
        iconContainer.addSubview(iconImageView)

        // Title Row
        let headerRow = UIStackView()
        headerRow.translatesAutoresizingMaskIntoConstraints = false
        headerRow.axis = .horizontal
        headerRow.alignment = .center
        headerRow.spacing = 6
        cardView.addSubview(headerRow)

        titleLabel.font = .systemFont(ofSize: 14.5, weight: .bold)
        titleLabel.textColor = UIColor(red: 0.059, green: 0.090, blue: 0.165, alpha: 1)
        headerRow.addArrangedSubview(titleLabel)

        unreadDot.translatesAutoresizingMaskIntoConstraints = false
        unreadDot.backgroundColor = UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1)
        unreadDot.layer.cornerRadius = 4
        unreadDot.widthAnchor.constraint(equalToConstant: 8).isActive = true
        unreadDot.heightAnchor.constraint(equalToConstant: 8).isActive = true
        headerRow.addArrangedSubview(unreadDot)

        timeLabel.translatesAutoresizingMaskIntoConstraints = false
        timeLabel.font = .systemFont(ofSize: 11, weight: .medium)
        timeLabel.textColor = UIColor(red: 0.580, green: 0.639, blue: 0.722, alpha: 1)
        cardView.addSubview(timeLabel)

        // Message
        messageLabel.translatesAutoresizingMaskIntoConstraints = false
        messageLabel.font = .systemFont(ofSize: 13)
        messageLabel.textColor = UIColor(red: 0.200, green: 0.255, blue: 0.333, alpha: 1)
        messageLabel.numberOfLines = 0
        cardView.addSubview(messageLabel)

        // Attachment Image
        attachmentImageView.translatesAutoresizingMaskIntoConstraints = false
        attachmentImageView.contentMode = .scaleAspectFill
        attachmentImageView.clipsToBounds = true
        attachmentImageView.layer.cornerRadius = 8
        attachmentImageView.backgroundColor = UIColor(red: 0.945, green: 0.961, blue: 0.976, alpha: 1)
        cardView.addSubview(attachmentImageView)

        // Action Link
        linkBtn.translatesAutoresizingMaskIntoConstraints = false
        linkBtn.setTitle("View Details →", for: .normal)
        linkBtn.titleLabel?.font = .systemFont(ofSize: 12, weight: .bold)
        linkBtn.setTitleColor(UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1), for: .normal)
        linkBtn.backgroundColor = UIColor(red: 0.937, green: 0.965, blue: 1.0, alpha: 1)
        linkBtn.layer.cornerRadius = 8
        linkBtn.contentEdgeInsets = UIEdgeInsets(top: 6, left: 12, bottom: 6, right: 12)
        linkBtn.addTarget(self, action: #selector(linkBtnTapped), for: .touchUpInside)
        cardView.addSubview(linkBtn)

        let imgHeightConstraint = attachmentImageView.heightAnchor.constraint(equalToConstant: 140)
        imgHeightConstraint.priority = .defaultHigh

        NSLayoutConstraint.activate([
            cardView.topAnchor.constraint(equalTo: contentView.topAnchor, constant: 5),
            cardView.bottomAnchor.constraint(equalTo: contentView.bottomAnchor, constant: -5),
            cardView.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 16),
            cardView.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -16),

            iconContainer.topAnchor.constraint(equalTo: cardView.topAnchor, constant: 14),
            iconContainer.leadingAnchor.constraint(equalTo: cardView.leadingAnchor, constant: 14),
            iconContainer.widthAnchor.constraint(equalToConstant: 38),
            iconContainer.heightAnchor.constraint(equalToConstant: 38),

            iconImageView.centerXAnchor.constraint(equalTo: iconContainer.centerXAnchor),
            iconImageView.centerYAnchor.constraint(equalTo: iconContainer.centerYAnchor),
            iconImageView.widthAnchor.constraint(equalToConstant: 18),
            iconImageView.heightAnchor.constraint(equalToConstant: 18),

            headerRow.topAnchor.constraint(equalTo: cardView.topAnchor, constant: 14),
            headerRow.leadingAnchor.constraint(equalTo: iconContainer.trailingAnchor, constant: 12),
            headerRow.trailingAnchor.constraint(lessThanOrEqualTo: cardView.trailingAnchor, constant: -14),

            timeLabel.topAnchor.constraint(equalTo: headerRow.bottomAnchor, constant: 2),
            timeLabel.leadingAnchor.constraint(equalTo: headerRow.leadingAnchor),

            messageLabel.topAnchor.constraint(equalTo: timeLabel.bottomAnchor, constant: 8),
            messageLabel.leadingAnchor.constraint(equalTo: headerRow.leadingAnchor),
            messageLabel.trailingAnchor.constraint(equalTo: cardView.trailingAnchor, constant: -14),

            attachmentImageView.topAnchor.constraint(equalTo: messageLabel.bottomAnchor, constant: 10),
            attachmentImageView.leadingAnchor.constraint(equalTo: headerRow.leadingAnchor),
            attachmentImageView.trailingAnchor.constraint(equalTo: cardView.trailingAnchor, constant: -14),
            imgHeightConstraint,

            linkBtn.topAnchor.constraint(equalTo: attachmentImageView.bottomAnchor, constant: 10),
            linkBtn.leadingAnchor.constraint(equalTo: headerRow.leadingAnchor),
            linkBtn.bottomAnchor.constraint(equalTo: cardView.bottomAnchor, constant: -14)
        ])
    }

    func configure(notification: [String: Any]) {
        let title = notification["title"] as? String ?? "Notification"
        let msg = notification["message"] as? String ?? (notification["body"] as? String ?? (notification["description"] as? String ?? ""))
        let type = (notification["type"] as? String ?? "SYSTEM").uppercased()
        let link = notification["link"] as? String ?? ""
        let imageUrl = notification["imageUrl"] as? String ?? (notification["image"] as? String ?? "")
        let isRead = notification["isRead"] as? Bool ?? true
        let createdStr = notification["createdAt"] as? String ?? (notification["timestamp"] as? String ?? "")

        currentLink = link
        titleLabel.text = HomeNativeView.stripEmailFromString(title)
        messageLabel.text = HomeNativeView.stripEmailFromString(msg)
        timeLabel.text = formatRelativeTime(createdStr)

        // Read/Unread styling
        if !isRead {
            unreadDot.isHidden = false
            cardView.backgroundColor = UIColor(red: 0.937, green: 0.965, blue: 1.0, alpha: 1) // #EFF6FF
            titleLabel.textColor = UIColor(red: 0.059, green: 0.090, blue: 0.165, alpha: 1)
        } else {
            unreadDot.isHidden = true
            cardView.backgroundColor = .white
            titleLabel.textColor = UIColor(red: 0.200, green: 0.255, blue: 0.333, alpha: 1)
        }

        // Category Icon & Badge
        bindCategoryIcon(type: type)

        // Image Attachment
        if !imageUrl.isEmpty, let url = URL(string: imageUrl) {
            attachmentImageView.isHidden = false
            loadImage(url: url)
        } else {
            attachmentImageView.isHidden = true
            attachmentImageView.image = nil
        }

        // Link button
        linkBtn.isHidden = link.isEmpty
    }

    private func bindCategoryIcon(type: String) {
        if type.contains("PAYMENT") || type.contains("WALLET") || type.contains("INVOICE") {
            iconContainer.backgroundColor = UIColor(red: 0.820, green: 0.980, blue: 0.886, alpha: 1) // green-100
            iconImageView.image = UIImage(systemName: "creditcard.fill")
            iconImageView.tintColor = UIColor(red: 0.020, green: 0.588, blue: 0.412, alpha: 1)
        } else if type.contains("TEST") || type.contains("SAMPLE") || type.contains("PATIENT") {
            iconContainer.backgroundColor = UIColor(red: 0.859, green: 0.918, blue: 0.996, alpha: 1) // blue-100
            iconImageView.image = UIImage(systemName: "cross.vial.fill")
            iconImageView.tintColor = UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1)
        } else if type.contains("LAB") || type.contains("UPDATE") || type.contains("MACHINE") {
            iconContainer.backgroundColor = UIColor(red: 0.933, green: 0.902, blue: 0.996, alpha: 1) // purple-100
            iconImageView.image = UIImage(systemName: "arrow.triangle.2.circlepath")
            iconImageView.tintColor = UIColor(red: 0.486, green: 0.227, blue: 0.929, alpha: 1)
        } else if type.contains("ALERT") || type.contains("CRITICAL") || type.contains("URGENT") {
            iconContainer.backgroundColor = UIColor(red: 1.0, green: 0.894, blue: 0.894, alpha: 1) // red-100
            iconImageView.image = UIImage(systemName: "exclamationmark.octagon.fill")
            iconImageView.tintColor = UIColor(red: 0.863, green: 0.149, blue: 0.149, alpha: 1)
        } else if type.contains("PROMO") || type.contains("BROADCAST") {
            iconContainer.backgroundColor = UIColor(red: 0.992, green: 0.878, blue: 0.941, alpha: 1) // pink-100
            iconImageView.image = UIImage(systemName: "megaphone.fill")
            iconImageView.tintColor = UIColor(red: 0.859, green: 0.153, blue: 0.467, alpha: 1)
        } else {
            iconContainer.backgroundColor = UIColor(red: 0.996, green: 0.953, blue: 0.878, alpha: 1) // amber-100
            iconImageView.image = UIImage(systemName: "info.circle.fill")
            iconImageView.tintColor = UIColor(red: 0.851, green: 0.467, blue: 0.024, alpha: 1)
        }
    }

    private func loadImage(url: URL) {
        let key = url.absoluteString as NSString
        if let cached = Self.imageCache.object(forKey: key) {
            attachmentImageView.image = cached
            return
        }

        URLSession.shared.dataTask(with: url) { [weak self] data, _, _ in
            if let data = data, let img = UIImage(data: data) {
                Self.imageCache.setObject(img, forKey: key)
                DispatchQueue.main.async {
                    self?.attachmentImageView.image = img
                }
            }
        }.resume()
    }

    private static let imageCache = NSCache<NSString, UIImage>()

    private func formatRelativeTime(_ isoStr: String) -> String {
        guard !isoStr.isEmpty else { return "Recently" }
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        var date = f.date(from: isoStr)
        if date == nil {
            let f2 = ISO8601DateFormatter()
            date = f2.date(from: isoStr)
        }
        guard let d = date else { return "Recently" }

        let diff = Date().timeIntervalSince(d)
        if diff < 60 { return "Just now" }
        if diff < 3600 { return "\(Int(diff / 60))m ago" }
        if diff < 86400 { return "\(Int(diff / 3600))h ago" }
        if diff < 172800 { return "Yesterday" }

        let df = DateFormatter()
        df.dateFormat = "dd MMM, hh:mm a"
        return df.string(from: d)
    }

    @objc private func linkBtnTapped() {
        onLinkTap?(currentLink)
    }
}
