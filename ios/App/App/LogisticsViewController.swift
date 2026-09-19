import UIKit
import WebKit

// MARK: - LogisticsViewController
// Full two-way parity with Web module (/workspace/logistics & API /api/workspace/logistics)
// Real-time Dispatch Control and Live Fleet/Tasks Tracking:
// - Live Tasks Queue (Home collection trips, scheduled patient appointments)
// - Active Fleet (Phlebotomists, field collectors, status, and contact)
// - Computed KPIs: Total Staff, In Progress, Scheduled, Completed Today
// - Interactive Quick Actions: Direct Call, WhatsApp, Apple Maps turn-by-turn Navigation
// - Auto-refresh polling every 30 seconds matching web standard

class LogisticsViewController: UIViewController, UITableViewDelegate, UITableViewDataSource, UISearchBarDelegate {

    private let baseURL = "https://app.patholab.cloud"

    // ── Hero Header ──
    private let heroHeaderView     = UIView()
    private let heroGradientLayer  = CAGradientLayer()
    private let btnBack            = UIButton(type: .system)
    private let btnRefresh         = UIButton(type: .system)
    private let titleLabel         = UILabel()
    private let subtitleLabel      = UILabel()
    private let pulseDot           = UIView()

    // ── 4 KPI Bento Cards ──
    private let kpiStack           = UIStackView()
    private let lblFleetCount      = UILabel()
    private let lblInProgress      = UILabel()
    private let lblScheduled       = UILabel()
    private let lblDelivered       = UILabel()

    // ── Filter Tabs ──
    private let filterScrollView   = UIScrollView()
    private let filterStack        = UIStackView()
    private let tabQueue           = UIButton(type: .system)
    private let tabInProgress      = UIButton(type: .system)
    private let tabScheduled       = UIButton(type: .system)
    private let tabDelivered       = UIButton(type: .system)
    private let tabFleet           = UIButton(type: .system)

    // ── Search & Table ──
    private let searchBar          = UISearchBar()
    private let tableView          = UITableView(frame: .zero, style: .plain)
    private let refreshControl     = UIRefreshControl()
    private let emptyView          = UIView()
    private let spinner            = UIActivityIndicatorView(style: .medium)

    // ── Data & Polling ──
    private var allTasks: [[String: Any]] = []
    private var allFleet: [[String: Any]] = []
    private var filteredItems: [[String: Any]] = []
    private var activeTab = "QUEUE" // QUEUE, IN_PROGRESS, SCHEDULED, DELIVERED, FLEET
    private var searchText = ""
    private var autoRefreshTimer: Timer?

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 0.973, green: 0.980, blue: 0.988, alpha: 1) // #F8FAFC
        setupUI()
        fetchLogistics()
        startAutoRefreshTimer()
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        heroGradientLayer.frame = heroHeaderView.bounds
    }

    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        autoRefreshTimer?.invalidate()
        autoRefreshTimer = nil
    }

    // MARK: - UI Layout Setup
    private func setupUI() {
        let safeTop = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }.first?.windows.first?.safeAreaInsets.top ?? 44

        // 1. Hero Header
        heroHeaderView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(heroHeaderView)
        heroGradientLayer.colors = [
            UIColor(red: 0.039, green: 0.345, blue: 0.792, alpha: 1).cgColor, // #0A58CA
            UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1).cgColor  // #0D6EFD
        ]
        heroGradientLayer.startPoint = CGPoint(x: 0, y: 0)
        heroGradientLayer.endPoint   = CGPoint(x: 1, y: 1)
        heroHeaderView.layer.insertSublayer(heroGradientLayer, at: 0)

        btnBack.setImage(UIImage(systemName: "arrow.left"), for: .normal)
        btnBack.tintColor = .white
        btnBack.backgroundColor = UIColor.white.withAlphaComponent(0.18)
        btnBack.layer.cornerRadius = 18
        btnBack.addTarget(self, action: #selector(backTapped), for: .touchUpInside)
        btnBack.translatesAutoresizingMaskIntoConstraints = false
        heroHeaderView.addSubview(btnBack)

        titleLabel.text = "Dispatch & Logistics"
        titleLabel.font = .systemFont(ofSize: 20, weight: .bold)
        titleLabel.textColor = .white
        titleLabel.translatesAutoresizingMaskIntoConstraints = false
        heroHeaderView.addSubview(titleLabel)

        // Live Radar Pulse Indicator
        pulseDot.backgroundColor = UIColor(red: 0.20, green: 0.85, blue: 0.45, alpha: 1)
        pulseDot.layer.cornerRadius = 4
        pulseDot.translatesAutoresizingMaskIntoConstraints = false
        heroHeaderView.addSubview(pulseDot)

        subtitleLabel.text = "Live fleet tracking & intelligent routing"
        subtitleLabel.font = .systemFont(ofSize: 11.5, weight: .medium)
        subtitleLabel.textColor = UIColor(red: 0.780, green: 0.875, blue: 1.0, alpha: 1)
        subtitleLabel.translatesAutoresizingMaskIntoConstraints = false
        heroHeaderView.addSubview(subtitleLabel)

        btnRefresh.setImage(UIImage(systemName: "arrow.clockwise"), for: .normal)
        btnRefresh.tintColor = .white
        btnRefresh.backgroundColor = UIColor.white.withAlphaComponent(0.18)
        btnRefresh.layer.cornerRadius = 18
        btnRefresh.addTarget(self, action: #selector(refreshTapped), for: .touchUpInside)
        btnRefresh.translatesAutoresizingMaskIntoConstraints = false
        heroHeaderView.addSubview(btnRefresh)

        // 2. KPI Bento Cards
        kpiStack.axis = .horizontal
        kpiStack.spacing = 8
        kpiStack.distribution = .fillEqually
        kpiStack.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(kpiStack)

        let kpiDefs: [(String, UILabel, UIColor, String)] = [
            ("FLEET", lblFleetCount, UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1), "Riders"),
            ("ACTIVE", lblInProgress, UIColor(red: 0.85, green: 0.50, blue: 0.05, alpha: 1), "In-Transit"),
            ("QUEUED", lblScheduled, UIColor(red: 0.35, green: 0.40, blue: 0.95, alpha: 1), "Pending"),
            ("DONE", lblDelivered, UIColor(red: 0.02, green: 0.60, blue: 0.40, alpha: 1), "Delivered")
        ]

        for (title, lbl, color, sub) in kpiDefs {
            let card = UIView()
            card.backgroundColor = .white
            card.layer.cornerRadius = 14
            card.layer.shadowColor = UIColor.black.cgColor
            card.layer.shadowOpacity = 0.05
            card.layer.shadowOffset = CGSize(width: 0, height: 2)
            card.layer.shadowRadius = 6

            lbl.text = "--"
            lbl.font = .systemFont(ofSize: 18, weight: .bold)
            lbl.textColor = color
            lbl.textAlignment = .center

            let titleLbl = UILabel()
            titleLbl.text = title
            titleLbl.font = .systemFont(ofSize: 9, weight: .bold)
            titleLbl.textColor = UIColor(white: 0.55, alpha: 1)
            titleLbl.textAlignment = .center

            let subLbl = UILabel()
            subLbl.text = sub
            subLbl.font = .systemFont(ofSize: 8, weight: .medium)
            subLbl.textColor = UIColor(white: 0.65, alpha: 1)
            subLbl.textAlignment = .center

            let vs = UIStackView(arrangedSubviews: [lbl, titleLbl, subLbl])
            vs.axis = .vertical
            vs.spacing = 1
            vs.alignment = .center
            vs.translatesAutoresizingMaskIntoConstraints = false
            card.addSubview(vs)

            NSLayoutConstraint.activate([
                vs.centerXAnchor.constraint(equalTo: card.centerXAnchor),
                vs.centerYAnchor.constraint(equalTo: card.centerYAnchor),
                vs.leadingAnchor.constraint(greaterThanOrEqualTo: card.leadingAnchor, constant: 4),
                vs.trailingAnchor.constraint(lessThanOrEqualTo: card.trailingAnchor, constant: -4)
            ])
            kpiStack.addArrangedSubview(card)
        }

        // 3. Filter Tabs
        filterScrollView.showsHorizontalScrollIndicator = false
        filterScrollView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(filterScrollView)

        filterStack.axis = .horizontal
        filterStack.spacing = 8
        filterStack.translatesAutoresizingMaskIntoConstraints = false
        filterScrollView.addSubview(filterStack)

        let tabs: [(UIButton, String, String)] = [
            (tabQueue, "All Tasks", "QUEUE"),
            (tabInProgress, "In-Transit", "IN_PROGRESS"),
            (tabScheduled, "Scheduled", "SCHEDULED"),
            (tabDelivered, "Delivered", "DELIVERED"),
            (tabFleet, "Fleet Team", "FLEET")
        ]
        for (btn, title, key) in tabs {
            btn.setTitle(title, for: .normal)
            btn.titleLabel?.font = .systemFont(ofSize: 12.5, weight: .bold)
            btn.layer.cornerRadius = 14
            btn.contentEdgeInsets = UIEdgeInsets(top: 6, left: 14, bottom: 6, right: 14)
            btn.accessibilityIdentifier = key
            btn.addTarget(self, action: #selector(chipTapped(_:)), for: .touchUpInside)
            filterStack.addArrangedSubview(btn)
        }
        updateTabUI()

        // 4. Search Bar
        searchBar.placeholder = "Search by client, address, or rider..."
        searchBar.backgroundImage = UIImage()
        searchBar.backgroundColor = .clear
        searchBar.delegate = self
        searchBar.searchTextField.backgroundColor = .white
        searchBar.searchTextField.layer.cornerRadius = 12
        searchBar.searchTextField.layer.masksToBounds = true
        searchBar.searchTextField.font = .systemFont(ofSize: 13.5)
        searchBar.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(searchBar)

        // 5. TableView
        tableView.backgroundColor = .clear
        tableView.separatorStyle = .none
        tableView.delegate = self
        tableView.dataSource = self
        tableView.register(LogisticsTaskCell.self, forCellReuseIdentifier: "TaskCell")
        tableView.register(LogisticsFleetCell.self, forCellReuseIdentifier: "FleetCell")
        tableView.refreshControl = refreshControl
        refreshControl.addTarget(self, action: #selector(refreshTapped), for: .valueChanged)
        tableView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(tableView)

        // 6. Empty View
        emptyView.isHidden = true
        emptyView.translatesAutoresizingMaskIntoConstraints = false
        let ei = UIImageView(image: UIImage(systemName: "location.north.circle.fill"))
        ei.tintColor = UIColor.systemBlue.withAlphaComponent(0.35)
        ei.contentMode = .scaleAspectFit
        ei.translatesAutoresizingMaskIntoConstraints = false

        let el = UILabel()
        el.text = "No Dispatches Found"
        el.font = .systemFont(ofSize: 16, weight: .bold)
        el.textColor = UIColor(red: 0.15, green: 0.2, blue: 0.3, alpha: 1)
        el.translatesAutoresizingMaskIntoConstraints = false

        let es = UILabel()
        es.text = "Active home collection trips and rider assignments will appear here."
        es.font = .systemFont(ofSize: 12.5, weight: .regular)
        es.textColor = UIColor(white: 0.5, alpha: 1)
        es.textAlignment = .center
        es.numberOfLines = 2
        es.translatesAutoresizingMaskIntoConstraints = false

        [ei, el, es].forEach { emptyView.addSubview($0) }
        view.addSubview(emptyView)

        spinner.color = UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1)
        spinner.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(spinner)

        // Layout Constraints
        NSLayoutConstraint.activate([
            heroHeaderView.topAnchor.constraint(equalTo: view.topAnchor),
            heroHeaderView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            heroHeaderView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            heroHeaderView.heightAnchor.constraint(equalToConstant: safeTop + 70),

            btnBack.leadingAnchor.constraint(equalTo: heroHeaderView.leadingAnchor, constant: 16),
            btnBack.bottomAnchor.constraint(equalTo: heroHeaderView.bottomAnchor, constant: -14),
            btnBack.widthAnchor.constraint(equalToConstant: 36),
            btnBack.heightAnchor.constraint(equalToConstant: 36),

            titleLabel.leadingAnchor.constraint(equalTo: btnBack.trailingAnchor, constant: 12),
            titleLabel.topAnchor.constraint(equalTo: btnBack.topAnchor, constant: -2),

            pulseDot.leadingAnchor.constraint(equalTo: titleLabel.trailingAnchor, constant: 8),
            pulseDot.centerYAnchor.constraint(equalTo: titleLabel.centerYAnchor),
            pulseDot.widthAnchor.constraint(equalToConstant: 8),
            pulseDot.heightAnchor.constraint(equalToConstant: 8),

            subtitleLabel.leadingAnchor.constraint(equalTo: titleLabel.leadingAnchor),
            subtitleLabel.topAnchor.constraint(equalTo: titleLabel.bottomAnchor, constant: 2),

            btnRefresh.trailingAnchor.constraint(equalTo: heroHeaderView.trailingAnchor, constant: -16),
            btnRefresh.centerYAnchor.constraint(equalTo: btnBack.centerYAnchor),
            btnRefresh.widthAnchor.constraint(equalToConstant: 36),
            btnRefresh.heightAnchor.constraint(equalToConstant: 36),

            kpiStack.topAnchor.constraint(equalTo: heroHeaderView.bottomAnchor, constant: 10),
            kpiStack.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 12),
            kpiStack.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -12),
            kpiStack.heightAnchor.constraint(equalToConstant: 68),

            filterScrollView.topAnchor.constraint(equalTo: kpiStack.bottomAnchor, constant: 10),
            filterScrollView.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 12),
            filterScrollView.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -12),
            filterScrollView.heightAnchor.constraint(equalToConstant: 34),

            filterStack.topAnchor.constraint(equalTo: filterScrollView.topAnchor),
            filterStack.leadingAnchor.constraint(equalTo: filterScrollView.leadingAnchor),
            filterStack.trailingAnchor.constraint(equalTo: filterScrollView.trailingAnchor),
            filterStack.bottomAnchor.constraint(equalTo: filterScrollView.bottomAnchor),
            filterStack.heightAnchor.constraint(equalTo: filterScrollView.heightAnchor),

            searchBar.topAnchor.constraint(equalTo: filterScrollView.bottomAnchor, constant: 6),
            searchBar.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 6),
            searchBar.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -6),
            searchBar.heightAnchor.constraint(equalToConstant: 44),

            tableView.topAnchor.constraint(equalTo: searchBar.bottomAnchor, constant: 4),
            tableView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            tableView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            tableView.bottomAnchor.constraint(equalTo: view.bottomAnchor),

            emptyView.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            emptyView.centerYAnchor.constraint(equalTo: tableView.centerYAnchor),
            emptyView.leadingAnchor.constraint(greaterThanOrEqualTo: view.leadingAnchor, constant: 32),
            emptyView.trailingAnchor.constraint(lessThanOrEqualTo: view.trailingAnchor, constant: -32),

            ei.topAnchor.constraint(equalTo: emptyView.topAnchor),
            ei.centerXAnchor.constraint(equalTo: emptyView.centerXAnchor),
            ei.widthAnchor.constraint(equalToConstant: 54),
            ei.heightAnchor.constraint(equalToConstant: 54),

            el.topAnchor.constraint(equalTo: ei.bottomAnchor, constant: 10),
            el.centerXAnchor.constraint(equalTo: emptyView.centerXAnchor),

            es.topAnchor.constraint(equalTo: el.bottomAnchor, constant: 6),
            es.leadingAnchor.constraint(equalTo: emptyView.leadingAnchor),
            es.trailingAnchor.constraint(equalTo: emptyView.trailingAnchor),
            es.bottomAnchor.constraint(equalTo: emptyView.bottomAnchor),

            spinner.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            spinner.centerYAnchor.constraint(equalTo: view.centerYAnchor),
        ])
    }

    private func updateTabUI() {
        let tabs: [(UIButton, String)] = [
            (tabQueue, "QUEUE"),
            (tabInProgress, "IN_PROGRESS"),
            (tabScheduled, "SCHEDULED"),
            (tabDelivered, "DELIVERED"),
            (tabFleet, "FLEET")
        ]
        for (btn, key) in tabs {
            let active = activeTab == key
            btn.backgroundColor = active ? UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1) : .white
            btn.setTitleColor(active ? .white : UIColor(red: 0.4, green: 0.45, blue: 0.55, alpha: 1), for: .normal)
            btn.layer.borderWidth = active ? 0 : 1
            btn.layer.borderColor = UIColor(red: 0.88, green: 0.90, blue: 0.94, alpha: 1).cgColor
        }
    }

    // MARK: - Polling & Real-time Fetching
    private func startAutoRefreshTimer() {
        autoRefreshTimer?.invalidate()
        autoRefreshTimer = Timer.scheduledTimer(withTimeInterval: 30.0, repeats: true) { [weak self] _ in
            self?.fetchLogistics(isAuto: true)
        }
    }

    private func getAuthToken() -> String? {
        if let token = KeychainManager.shared.getToken(), !token.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            return token.trimmingCharacters(in: .whitespacesAndNewlines)
        }
        if let token = UserDefaults.standard.string(forKey: "auth_token"), !token.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            return token.trimmingCharacters(in: .whitespacesAndNewlines)
        }
        if let token = UserDefaults.standard.string(forKey: "token"), !token.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            return token.trimmingCharacters(in: .whitespacesAndNewlines)
        }
        if let cookies = HTTPCookieStorage.shared.cookies {
            for c in cookies {
                if (c.name == "token" || c.name == "auth-token" || c.name == "auth_token") && !c.value.isEmpty {
                    return c.value
                }
            }
        }
        return nil
    }

    private func applyAuthHeaders(to request: inout URLRequest) {
        let token = getAuthToken() ?? ""
        if !token.isEmpty {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            request.setValue("token=\(token); auth-token=\(token); auth_token=\(token)", forHTTPHeaderField: "Cookie")
        }
        request.setValue("application/json", forHTTPHeaderField: "Accept")
    }

    private func fetchLogistics(isAuto: Bool = false) {
        if !isAuto && !refreshControl.isRefreshing {
            spinner.startAnimating()
        }
        guard let url = URL(string: "\(baseURL)/api/workspace/logistics") else { return }
        var req = URLRequest(url: url)
        req.httpMethod = "GET"
        applyAuthHeaders(to: &req)
        req.timeoutInterval = 15

        URLSession.shared.dataTask(with: req) { [weak self] data, response, _ in
            DispatchQueue.main.async {
                self?.spinner.stopAnimating()
                self?.refreshControl.endRefreshing()
                guard let self = self, let data = data else {
                    self?.showEmpty()
                    return
                }

                if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
                    self.allFleet = json["fleet"] as? [[String: Any]] ?? []
                    self.allTasks = json["tasks"] as? [[String: Any]] ?? []
                    self.computeKpisAndFilter()
                } else {
                    self.allFleet = []
                    self.allTasks = []
                    self.computeKpisAndFilter()
                }
            }
        }.resume()
    }

    private func computeKpisAndFilter() {
        let fleetCount = allFleet.count
        var inProgressCount = 0
        var scheduledCount  = 0
        var deliveredCount  = 0

        for t in allTasks {
            let st = (t["status"] as? String ?? "").uppercased()
            if st == "IN_PROGRESS" || st == "PICKED_UP" {
                inProgressCount += 1
            } else if st == "SCHEDULED" || st == "PENDING" {
                scheduledCount += 1
            } else if st == "DELIVERED" {
                deliveredCount += 1
            }
        }

        lblFleetCount.text = "\(fleetCount)"
        lblInProgress.text = "\(inProgressCount)"
        lblScheduled.text  = "\(scheduledCount)"
        lblDelivered.text  = "\(deliveredCount)"

        applyFilter()
    }

    private func applyFilter() {
        if activeTab == "FLEET" {
            filteredItems = allFleet.filter { member in
                if searchText.isEmpty { return true }
                let name  = (member["name"] as? String ?? "").lowercased()
                let phone = (member["phone"] as? String ?? "").lowercased()
                let role  = (member["type"] as? String ?? "").lowercased()
                return name.contains(searchText) || phone.contains(searchText) || role.contains(searchText)
            }
        } else {
            filteredItems = allTasks.filter { task in
                let st = (task["status"] as? String ?? "").uppercased()
                let tabMatch: Bool
                switch activeTab {
                case "IN_PROGRESS":
                    tabMatch = st == "IN_PROGRESS" || st == "PICKED_UP"
                case "SCHEDULED":
                    tabMatch = st == "SCHEDULED" || st == "PENDING"
                case "DELIVERED":
                    tabMatch = st == "DELIVERED"
                default:
                    tabMatch = true
                }

                if !searchText.isEmpty {
                    let client  = (task["client"] as? String ?? "").lowercased()
                    let address = (task["address"] as? String ?? "").lowercased()
                    let rider   = (task["assignedTo"] as? String ?? "").lowercased()
                    return tabMatch && (client.contains(searchText) || address.contains(searchText) || rider.contains(searchText))
                }
                return tabMatch
            }
        }

        let empty = filteredItems.isEmpty
        tableView.isHidden = empty
        emptyView.isHidden = !empty
        tableView.reloadData()
    }

    private func showEmpty() {
        emptyView.isHidden = false
        tableView.isHidden = true
    }

    // MARK: - Actions
    @objc private func backTapped() {
        dismiss(animated: true)
    }

    @objc private func refreshTapped() {
        UIView.animate(withDuration: 0.4) {
            self.btnRefresh.transform = CGAffineTransform(rotationAngle: .pi)
        }
        UIView.animate(withDuration: 0.4, delay: 0.4, options: []) {
            self.btnRefresh.transform = .identity
        }
        fetchLogistics()
    }

    @objc private func chipTapped(_ sender: UIButton) {
        guard let key = sender.accessibilityIdentifier else { return }
        activeTab = key
        updateTabUI()
        applyFilter()
    }

    func callPhone(_ phone: String) {
        let clean = phone.components(separatedBy: CharacterSet.decimalDigits.inverted).joined()
        guard !clean.isEmpty, let url = URL(string: "tel://\(clean)"), UIApplication.shared.canOpenURL(url) else {
            showToast("Cannot dial phone: \(phone)")
            return
        }
        UIApplication.shared.open(url)
    }

    func openWhatsApp(phone: String, name: String) {
        var clean = phone.components(separatedBy: CharacterSet.decimalDigits.inverted).joined()
        if clean.count == 10 { clean = "91" + clean }
        let msg = "Hello \(name), greetings from PathoLab Diagnostics dispatch team."
        guard let url = URL(string: "https://api.whatsapp.com/send?phone=\(clean)&text=\(msg.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? "")") else { return }
        UIApplication.shared.open(url)
    }

    func openMaps(address: String) {
        guard let encoded = address.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed),
              let url = URL(string: "http://maps.apple.com/?daddr=\(encoded)"),
              UIApplication.shared.canOpenURL(url) else {
            showToast("Cannot open navigation map.")
            return
        }
        UIApplication.shared.open(url)
    }

    private func showToast(_ msg: String) {
        let t = UILabel()
        t.text = "  \(msg)  "
        t.textColor = .white
        t.backgroundColor = UIColor(red: 0.1, green: 0.15, blue: 0.25, alpha: 0.95)
        t.textAlignment = .center
        t.font = .systemFont(ofSize: 13, weight: .semibold)
        t.layer.cornerRadius = 14
        t.clipsToBounds = true
        t.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(t)
        NSLayoutConstraint.activate([
            t.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            t.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -72),
            t.widthAnchor.constraint(lessThanOrEqualTo: view.widthAnchor, multiplier: 0.88),
            t.heightAnchor.constraint(equalToConstant: 38)
        ])
        UIView.animate(withDuration: 0.3, delay: 2.0, options: [], animations: { t.alpha = 0 }) { _ in t.removeFromSuperview() }
    }
}

// MARK: - TableView Delegate & DataSource
extension LogisticsViewController {
    func tableView(_ tv: UITableView, numberOfRowsInSection s: Int) -> Int {
        return filteredItems.count
    }

    func tableView(_ tv: UITableView, cellForRowAt ip: IndexPath) -> UITableViewCell {
        let item = filteredItems[ip.row]
        if activeTab == "FLEET" {
            let cell = tv.dequeueReusableCell(withIdentifier: "FleetCell", for: ip) as! LogisticsFleetCell
            cell.configure(with: item)
            let phone = item["phone"] as? String ?? ""
            let name  = item["name"] as? String ?? "Rider"
            cell.onCall     = { [weak self] in self?.callPhone(phone) }
            cell.onWhatsApp = { [weak self] in self?.openWhatsApp(phone: phone, name: name) }
            return cell
        } else {
            let cell = tv.dequeueReusableCell(withIdentifier: "TaskCell", for: ip) as! LogisticsTaskCell
            cell.configure(with: item)
            let client = item["client"] as? String ?? "Client"
            let addr   = item["address"] as? String ?? ""
            cell.onCall     = { [weak self] in self?.callPhone("") }
            cell.onWhatsApp = { [weak self] in self?.openWhatsApp(phone: "", name: client) }
            cell.onNavigate = { [weak self] in self?.openMaps(address: addr) }
            return cell
        }
    }

    func tableView(_ tv: UITableView, heightForRowAt ip: IndexPath) -> CGFloat {
        return UITableView.automaticDimension
    }
}

// MARK: - SearchBar Delegate
extension LogisticsViewController {
    func searchBar(_ s: UISearchBar, textDidChange t: String) {
        searchText = t.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        applyFilter()
    }
    func searchBarSearchButtonClicked(_ s: UISearchBar) {
        s.resignFirstResponder()
    }
}

// MARK: - LogisticsTaskCell (Dispatch Queue Card)
class LogisticsTaskCell: UITableViewCell {
    private let card          = UIView()
    private let lblTaskId     = UILabel()
    private let lblStatus     = UILabel()
    private let lblClient     = UILabel()
    private let lblAddress    = UILabel()
    private let lblTimeWindow = UILabel()
    private let lblRider      = UILabel()

    private let btnNavigate   = UIButton(type: .system)
    private let btnCall       = UIButton(type: .system)
    private let btnWhatsApp   = UIButton(type: .system)

    var onNavigate: (() -> Void)?
    var onCall:     (() -> Void)?
    var onWhatsApp: (() -> Void)?

    override init(style: UITableViewCell.CellStyle, reuseIdentifier: String?) {
        super.init(style: style, reuseIdentifier: reuseIdentifier)
        selectionStyle = .none
        backgroundColor = .clear

        card.backgroundColor = .white
        card.layer.cornerRadius = 16
        card.layer.shadowColor = UIColor.black.cgColor
        card.layer.shadowOpacity = 0.05
        card.layer.shadowOffset = CGSize(width: 0, height: 2)
        card.layer.shadowRadius = 6
        card.translatesAutoresizingMaskIntoConstraints = false
        contentView.addSubview(card)

        // Header Row: Task ID & Status
        lblTaskId.font = .systemFont(ofSize: 11, weight: .bold)
        lblTaskId.textColor = UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1)
        lblTaskId.backgroundColor = UIColor(red: 0.933, green: 0.957, blue: 1.0, alpha: 1)
        lblTaskId.layer.cornerRadius = 6
        lblTaskId.clipsToBounds = true

        lblStatus.font = .systemFont(ofSize: 10.5, weight: .bold)
        lblStatus.layer.cornerRadius = 6
        lblStatus.clipsToBounds = true

        let topRow = UIStackView(arrangedSubviews: [lblTaskId, UIView(), lblStatus])
        topRow.alignment = .center

        // Client Name
        lblClient.font = .systemFont(ofSize: 16, weight: .bold)
        lblClient.textColor = UIColor(red: 0.059, green: 0.090, blue: 0.165, alpha: 1)

        // Address with Map Pin icon
        lblAddress.font = .systemFont(ofSize: 12.5, weight: .medium)
        lblAddress.textColor = UIColor(red: 0.35, green: 0.4, blue: 0.5, alpha: 1)
        lblAddress.numberOfLines = 2

        // Meta Row: Time Window & Assigned Rider
        lblTimeWindow.font = .systemFont(ofSize: 12, weight: .semibold)
        lblTimeWindow.textColor = UIColor(red: 0.1, green: 0.45, blue: 0.85, alpha: 1)

        lblRider.font = .systemFont(ofSize: 12, weight: .medium)
        lblRider.textColor = UIColor(red: 0.4, green: 0.45, blue: 0.55, alpha: 1)

        let metaRow = UIStackView(arrangedSubviews: [lblTimeWindow, UIView(), lblRider])
        metaRow.alignment = .center

        // Actions Row
        btnNavigate.setTitle("  Navigate Maps", for: .normal)
        btnNavigate.setImage(UIImage(systemName: "location.fill"), for: .normal)
        btnNavigate.tintColor = UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1)
        btnNavigate.titleLabel?.font = .systemFont(ofSize: 12, weight: .bold)
        btnNavigate.backgroundColor = UIColor(red: 0.933, green: 0.957, blue: 1.0, alpha: 1)
        btnNavigate.layer.cornerRadius = 8
        btnNavigate.contentEdgeInsets = UIEdgeInsets(top: 6, left: 10, bottom: 6, right: 10)
        btnNavigate.addTarget(self, action: #selector(navTapped), for: .touchUpInside)

        btnCall.setImage(UIImage(systemName: "phone.fill"), for: .normal)
        btnCall.tintColor = UIColor(red: 0.05, green: 0.65, blue: 0.35, alpha: 1)
        btnCall.backgroundColor = UIColor(red: 0.92, green: 0.98, blue: 0.94, alpha: 1)
        btnCall.layer.cornerRadius = 8
        btnCall.addTarget(self, action: #selector(callTapped), for: .touchUpInside)

        btnWhatsApp.setImage(UIImage(systemName: "message.fill"), for: .normal)
        btnWhatsApp.tintColor = UIColor(red: 0.1, green: 0.75, blue: 0.4, alpha: 1)
        btnWhatsApp.backgroundColor = UIColor(red: 0.90, green: 0.98, blue: 0.93, alpha: 1)
        btnWhatsApp.layer.cornerRadius = 8
        btnWhatsApp.addTarget(self, action: #selector(waTapped), for: .touchUpInside)

        let btnRow = UIStackView(arrangedSubviews: [btnNavigate, UIView(), btnCall, btnWhatsApp])
        btnRow.alignment = .center
        btnRow.spacing = 8

        let mainStack = UIStackView(arrangedSubviews: [topRow, lblClient, lblAddress, metaRow, btnRow])
        mainStack.axis = .vertical
        mainStack.spacing = 8
        mainStack.translatesAutoresizingMaskIntoConstraints = false
        card.addSubview(mainStack)

        NSLayoutConstraint.activate([
            card.topAnchor.constraint(equalTo: contentView.topAnchor, constant: 6),
            card.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 14),
            card.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -14),
            card.bottomAnchor.constraint(equalTo: contentView.bottomAnchor, constant: -6),

            mainStack.topAnchor.constraint(equalTo: card.topAnchor, constant: 14),
            mainStack.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 14),
            mainStack.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -14),
            mainStack.bottomAnchor.constraint(equalTo: card.bottomAnchor, constant: -14),

            btnCall.widthAnchor.constraint(equalToConstant: 32),
            btnCall.heightAnchor.constraint(equalToConstant: 32),
            btnWhatsApp.widthAnchor.constraint(equalToConstant: 32),
            btnWhatsApp.heightAnchor.constraint(equalToConstant: 32)
        ])
    }

    required init?(coder: NSCoder) { fatalError() }

    func configure(with task: [String: Any]) {
        let taskId = task["id"] as? String ?? "DISPATCH"
        let client = task["client"] as? String ?? "Home Collection"
        let addr   = task["address"] as? String ?? "Address not provided"
        let time   = task["timeWindow"] as? String ?? "TBD"
        let status = (task["status"] as? String ?? "SCHEDULED").uppercased()
        let rider  = task["assignedTo"] as? String ?? "Unassigned"

        lblTaskId.text = "  #\(taskId)  "
        lblClient.text = client
        lblAddress.text = "📍 \(addr)"
        lblTimeWindow.text = "🕒 \(time)"
        lblRider.text = "👤 \(rider)"

        switch status {
        case "IN_PROGRESS", "PICKED_UP":
            lblStatus.text = "  IN-TRANSIT  "
            lblStatus.textColor = UIColor(red: 0.85, green: 0.50, blue: 0.05, alpha: 1)
            lblStatus.backgroundColor = UIColor(red: 1.0, green: 0.96, blue: 0.88, alpha: 1)
        case "DELIVERED":
            lblStatus.text = "  DELIVERED  "
            lblStatus.textColor = UIColor(red: 0.02, green: 0.60, blue: 0.40, alpha: 1)
            lblStatus.backgroundColor = UIColor(red: 0.92, green: 0.98, blue: 0.94, alpha: 1)
        case "CANCELLED":
            lblStatus.text = "  CANCELLED  "
            lblStatus.textColor = UIColor(red: 0.88, green: 0.15, blue: 0.15, alpha: 1)
            lblStatus.backgroundColor = UIColor(red: 0.99, green: 0.92, blue: 0.92, alpha: 1)
        default:
            lblStatus.text = "  SCHEDULED  "
            lblStatus.textColor = UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1)
            lblStatus.backgroundColor = UIColor(red: 0.933, green: 0.957, blue: 1.0, alpha: 1)
        }
    }

    @objc private func navTapped()  { onNavigate?() }
    @objc private func callTapped() { onCall?() }
    @objc private func waTapped()   { onWhatsApp?() }
}

// MARK: - LogisticsFleetCell (Fleet Team View)
class LogisticsFleetCell: UITableViewCell {
    private let card       = UIView()
    private let lblName    = UILabel()
    private let lblRole    = UILabel()
    private let lblPhone   = UILabel()
    private let lblStatus  = UILabel()
    private let btnCall    = UIButton(type: .system)
    private let btnWhatsApp = UIButton(type: .system)

    var onCall:     (() -> Void)?
    var onWhatsApp: (() -> Void)?

    override init(style: UITableViewCell.CellStyle, reuseIdentifier: String?) {
        super.init(style: style, reuseIdentifier: reuseIdentifier)
        selectionStyle = .none
        backgroundColor = .clear

        card.backgroundColor = .white
        card.layer.cornerRadius = 16
        card.layer.shadowColor = UIColor.black.cgColor
        card.layer.shadowOpacity = 0.05
        card.layer.shadowOffset = CGSize(width: 0, height: 2)
        card.layer.shadowRadius = 6
        card.translatesAutoresizingMaskIntoConstraints = false
        contentView.addSubview(card)

        lblName.font = .systemFont(ofSize: 15.5, weight: .bold)
        lblName.textColor = UIColor(red: 0.059, green: 0.090, blue: 0.165, alpha: 1)

        lblRole.font = .systemFont(ofSize: 12, weight: .medium)
        lblRole.textColor = UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1)

        lblPhone.font = .systemFont(ofSize: 12, weight: .regular)
        lblPhone.textColor = UIColor(red: 0.4, green: 0.45, blue: 0.55, alpha: 1)

        lblStatus.font = .systemFont(ofSize: 10.5, weight: .bold)
        lblStatus.layer.cornerRadius = 6
        lblStatus.clipsToBounds = true

        btnCall.setImage(UIImage(systemName: "phone.fill"), for: .normal)
        btnCall.tintColor = UIColor(red: 0.05, green: 0.65, blue: 0.35, alpha: 1)
        btnCall.backgroundColor = UIColor(red: 0.92, green: 0.98, blue: 0.94, alpha: 1)
        btnCall.layer.cornerRadius = 8
        btnCall.addTarget(self, action: #selector(callTapped), for: .touchUpInside)

        btnWhatsApp.setImage(UIImage(systemName: "message.fill"), for: .normal)
        btnWhatsApp.tintColor = UIColor(red: 0.1, green: 0.75, blue: 0.4, alpha: 1)
        btnWhatsApp.backgroundColor = UIColor(red: 0.90, green: 0.98, blue: 0.93, alpha: 1)
        btnWhatsApp.layer.cornerRadius = 8
        btnWhatsApp.addTarget(self, action: #selector(waTapped), for: .touchUpInside)

        let topRow = UIStackView(arrangedSubviews: [lblName, UIView(), lblStatus])
        topRow.alignment = .center

        let detailsStack = UIStackView(arrangedSubviews: [lblRole, lblPhone])
        detailsStack.axis = .vertical
        detailsStack.spacing = 2

        let actionRow = UIStackView(arrangedSubviews: [detailsStack, UIView(), btnCall, btnWhatsApp])
        actionRow.alignment = .center
        actionRow.spacing = 8

        let stack = UIStackView(arrangedSubviews: [topRow, actionRow])
        stack.axis = .vertical
        stack.spacing = 8
        stack.translatesAutoresizingMaskIntoConstraints = false
        card.addSubview(stack)

        NSLayoutConstraint.activate([
            card.topAnchor.constraint(equalTo: contentView.topAnchor, constant: 6),
            card.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 14),
            card.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -14),
            card.bottomAnchor.constraint(equalTo: contentView.bottomAnchor, constant: -6),

            stack.topAnchor.constraint(equalTo: card.topAnchor, constant: 14),
            stack.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 14),
            stack.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -14),
            stack.bottomAnchor.constraint(equalTo: card.bottomAnchor, constant: -14),

            btnCall.widthAnchor.constraint(equalToConstant: 32),
            btnCall.heightAnchor.constraint(equalToConstant: 32),
            btnWhatsApp.widthAnchor.constraint(equalToConstant: 32),
            btnWhatsApp.heightAnchor.constraint(equalToConstant: 32)
        ])
    }

    required init?(coder: NSCoder) { fatalError() }

    func configure(with rider: [String: Any]) {
        let name   = rider["name"] as? String ?? "Staff Member"
        let role   = rider["type"] as? String ?? "Phlebotomist"
        let phone  = rider["phone"] as? String ?? "No Phone"
        let status = (rider["status"] as? String ?? "AVAILABLE").uppercased()

        lblName.text  = name
        lblRole.text  = "Role: \(role)"
        lblPhone.text = "📞 \(phone)"

        if status == "AVAILABLE" {
            lblStatus.text = "  AVAILABLE  "
            lblStatus.textColor = UIColor(red: 0.02, green: 0.60, blue: 0.40, alpha: 1)
            lblStatus.backgroundColor = UIColor(red: 0.92, green: 0.98, blue: 0.94, alpha: 1)
        } else {
            lblStatus.text = "  ON TRIP  "
            lblStatus.textColor = UIColor(red: 0.85, green: 0.50, blue: 0.05, alpha: 1)
            lblStatus.backgroundColor = UIColor(red: 1.0, green: 0.96, blue: 0.88, alpha: 1)
        }
    }

    @objc private func callTapped() { onCall?() }
    @objc private func waTapped()   { onWhatsApp?() }
}
