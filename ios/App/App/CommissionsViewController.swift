import UIKit

/**
 * CommissionsViewController
 * ─────────────────────────────────────────────────────────────────────────────
 * Native dedicated Commission Pay, Settlements & Reconciliation Console (iOS).
 * Full feature parity with web module (/workspace/commissions):
 *  - Fused Sapphire Header with back, title, subtitle & refresh actions
 *  - 4 Real-time KPI Metric cards (Total Commissions, Pending Payouts, Settled Disbursed, Active Referrers)
 *  - 2-Tab Segmented Switcher (Referring Doctors vs Corporate Agencies)
 *  - Search Omnibar & Filter
 *  - Referrer cards with billed volume, total earned, and pending due balance
 *  - Direct Phone dialer & WhatsApp messenger integration
 *  - Settle Commission bottom sheet with payment mode (UPI, Bank, Cash, Cheque), reference note & instant reconciliation
 */
class CommissionsViewController: UIViewController, UITextFieldDelegate, UITableViewDelegate, UITableViewDataSource {

    private static let baseUrl = "https://app.patholab.cloud"

    // ── Hero Header ──
    private let heroHeaderView     = UIView()
    private let heroGradientLayer  = CAGradientLayer()
    private let backBtn            = UIButton(type: .system)
    private let titleLabel         = UILabel()
    private let subtitleLabel      = UILabel()
    private let refreshBtn         = UIButton(type: .system)

    // ── 4 KPI Metrics Scroll ──
    private let kpiScrollView      = UIScrollView()
    private let kpiStackView       = UIStackView()
    private let kpiTotalCommLbl    = UILabel()
    private let kpiPendingCommLbl  = UILabel()
    private let kpiSettledCommLbl  = UILabel()
    private let kpiActiveRefLbl    = UILabel()

    // ── 2-Tab Switcher ──
    private let tabStackView       = UIStackView()
    private let tabDoctorsBtn      = UIButton(type: .system)
    private let tabAgenciesBtn     = UIButton(type: .system)

    // ── Search Omnibar ──
    private let searchContainer    = UIView()
    private let searchField        = UITextField()
    private let clearSearchBtn     = UIButton(type: .system)

    // ── TableView & Empty State ──
    private let tableView          = UITableView(frame: .zero, style: .plain)
    private let refreshControl     = UIRefreshControl()
    private let emptyView          = UIView()
    private let loadingIndicator   = UIActivityIndicatorView(style: .medium)

    // ── Data & State ──
    private var doctorList: [[String: Any]] = []
    private var agencyList: [[String: Any]] = []
    private var currentTabList: [[String: Any]] = []
    private var filteredList: [[String: Any]] = []

    private var isDoctorTab: Bool = true
    private var searchQuery: String = ""

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 0.973, green: 0.980, blue: 0.988, alpha: 1) // #F8FAFC

        setupHeroHeader()
        setupKpis()
        setupTabs()
        setupSearchOmnibar()
        setupTableView()
        setupEmptyView()

        loadCommissionsData(isManual: false)
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        loadCommissionsData(isManual: false)
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        heroGradientLayer.frame = heroHeaderView.bounds
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  UI SETUP
    // ─────────────────────────────────────────────────────────────────────────
    private func setupHeroHeader() {
        heroHeaderView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(heroHeaderView)

        heroGradientLayer.colors = [
            UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1).cgColor, // #0D6EFD
            UIColor(red: 0.114, green: 0.306, blue: 0.847, alpha: 1).cgColor  // #1D4ED8
        ]
        heroGradientLayer.startPoint = CGPoint(x: 0, y: 0)
        heroGradientLayer.endPoint   = CGPoint(x: 1, y: 1)
        heroHeaderView.layer.insertSublayer(heroGradientLayer, at: 0)

        backBtn.translatesAutoresizingMaskIntoConstraints = false
        backBtn.setImage(UIImage(systemName: "arrow.left"), for: .normal)
        backBtn.tintColor = .white
        backBtn.backgroundColor = UIColor.white.withAlphaComponent(0.15)
        backBtn.layer.cornerRadius = 19
        backBtn.addTarget(self, action: #selector(backTapped), for: .touchUpInside)
        heroHeaderView.addSubview(backBtn)

        titleLabel.translatesAutoresizingMaskIntoConstraints = false
        titleLabel.text = "Commission Pay"
        titleLabel.font = .systemFont(ofSize: 20, weight: .bold)
        titleLabel.textColor = .white
        heroHeaderView.addSubview(titleLabel)

        subtitleLabel.translatesAutoresizingMaskIntoConstraints = false
        subtitleLabel.text = "Payout settlements, tracking & reconciliation"
        subtitleLabel.font = .systemFont(ofSize: 11.5, weight: .medium)
        subtitleLabel.textColor = UIColor(red: 0.780, green: 0.875, blue: 1.0, alpha: 1)
        heroHeaderView.addSubview(subtitleLabel)

        refreshBtn.translatesAutoresizingMaskIntoConstraints = false
        refreshBtn.setImage(UIImage(systemName: "arrow.clockwise"), for: .normal)
        refreshBtn.tintColor = .white
        refreshBtn.backgroundColor = UIColor.white.withAlphaComponent(0.15)
        refreshBtn.layer.cornerRadius = 19
        refreshBtn.addTarget(self, action: #selector(refreshTapped), for: .touchUpInside)
        heroHeaderView.addSubview(refreshBtn)

        NSLayoutConstraint.activate([
            heroHeaderView.topAnchor.constraint(equalTo: view.topAnchor),
            heroHeaderView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            heroHeaderView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            heroHeaderView.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 60),

            backBtn.leadingAnchor.constraint(equalTo: heroHeaderView.leadingAnchor, constant: 16),
            backBtn.bottomAnchor.constraint(equalTo: heroHeaderView.bottomAnchor, constant: -12),
            backBtn.widthAnchor.constraint(equalToConstant: 38),
            backBtn.heightAnchor.constraint(equalToConstant: 38),

            titleLabel.leadingAnchor.constraint(equalTo: backBtn.trailingAnchor, constant: 12),
            titleLabel.topAnchor.constraint(equalTo: backBtn.topAnchor, constant: -2),

            subtitleLabel.leadingAnchor.constraint(equalTo: titleLabel.leadingAnchor),
            subtitleLabel.topAnchor.constraint(equalTo: titleLabel.bottomAnchor, constant: 2),

            refreshBtn.trailingAnchor.constraint(equalTo: heroHeaderView.trailingAnchor, constant: -16),
            refreshBtn.centerYAnchor.constraint(equalTo: backBtn.centerYAnchor),
            refreshBtn.widthAnchor.constraint(equalToConstant: 38),
            refreshBtn.heightAnchor.constraint(equalToConstant: 38)
        ])
    }

    private func setupKpis() {
        kpiScrollView.translatesAutoresizingMaskIntoConstraints = false
        kpiScrollView.showsHorizontalScrollIndicator = false
        kpiScrollView.clipsToBounds = false
        view.addSubview(kpiScrollView)

        kpiStackView.translatesAutoresizingMaskIntoConstraints = false
        kpiStackView.axis = .horizontal
        kpiStackView.spacing = 8
        kpiStackView.alignment = .fill
        kpiStackView.distribution = .fillProportionally
        kpiScrollView.addSubview(kpiStackView)

        let card1 = createKpiCard(title: "TOTAL COMMISSIONS", subtitle: "Gross Earned", countLbl: kpiTotalCommLbl, colorHex: "6366F1", iconName: "banknote.fill")
        let card2 = createKpiCard(title: "PENDING PAYOUTS", subtitle: "Unsettled Due", countLbl: kpiPendingCommLbl, colorHex: "D97706", iconName: "clock.arrow.circlepath")
        let card3 = createKpiCard(title: "SETTLED DISBURSED", subtitle: "Paid to Partners", countLbl: kpiSettledCommLbl, colorHex: "059669", iconName: "checkmark.seal.fill")
        let card4 = createKpiCard(title: "ACTIVE REFERRERS", subtitle: "Doctors & Labs", countLbl: kpiActiveRefLbl, colorHex: "0284C7", iconName: "person.2.fill")

        kpiStackView.addArrangedSubview(card1)
        kpiStackView.addArrangedSubview(card2)
        kpiStackView.addArrangedSubview(card3)
        kpiStackView.addArrangedSubview(card4)

        NSLayoutConstraint.activate([
            kpiScrollView.topAnchor.constraint(equalTo: heroHeaderView.bottomAnchor, constant: 12),
            kpiScrollView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            kpiScrollView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            kpiScrollView.heightAnchor.constraint(equalToConstant: 78),

            kpiStackView.topAnchor.constraint(equalTo: kpiScrollView.topAnchor),
            kpiStackView.bottomAnchor.constraint(equalTo: kpiScrollView.bottomAnchor),
            kpiStackView.leadingAnchor.constraint(equalTo: kpiScrollView.leadingAnchor, constant: 16),
            kpiStackView.trailingAnchor.constraint(equalTo: kpiScrollView.trailingAnchor, constant: -16),
            kpiStackView.heightAnchor.constraint(equalTo: kpiScrollView.heightAnchor)
        ])
    }

    private func createKpiCard(title: String, subtitle: String, countLbl: UILabel, colorHex: String, iconName: String) -> UIView {
        let card = UIView()
        card.translatesAutoresizingMaskIntoConstraints = false
        card.backgroundColor = .white
        card.layer.cornerRadius = 12
        card.layer.shadowColor = UIColor.black.cgColor
        card.layer.shadowOpacity = 0.05
        card.layer.shadowOffset = CGSize(width: 0, height: 2)
        card.layer.shadowRadius = 4
        card.widthAnchor.constraint(equalToConstant: 148).isActive = true

        let topRow = UIStackView()
        topRow.translatesAutoresizingMaskIntoConstraints = false
        topRow.axis = .horizontal
        topRow.alignment = .center
        topRow.distribution = .equalSpacing

        let tLbl = UILabel()
        tLbl.text = title
        tLbl.font = .systemFont(ofSize: 9.5, weight: .bold)
        tLbl.textColor = colorFromHex(colorHex)
        topRow.addArrangedSubview(tLbl)

        let icon = UIImageView(image: UIImage(systemName: iconName))
        icon.tintColor = colorFromHex(colorHex).withAlphaComponent(0.6)
        icon.contentMode = .scaleAspectFit
        icon.widthAnchor.constraint(equalToConstant: 13).isActive = true
        icon.heightAnchor.constraint(equalToConstant: 13).isActive = true
        topRow.addArrangedSubview(icon)

        countLbl.translatesAutoresizingMaskIntoConstraints = false
        countLbl.text = "0"
        countLbl.font = .systemFont(ofSize: 18, weight: .bold)
        countLbl.textColor = UIColor(red: 0.059, green: 0.090, blue: 0.165, alpha: 1)

        let subLbl = UILabel()
        subLbl.translatesAutoresizingMaskIntoConstraints = false
        subLbl.text = subtitle
        subLbl.font = .systemFont(ofSize: 10, weight: .medium)
        subLbl.textColor = UIColor(red: 0.392, green: 0.455, blue: 0.545, alpha: 1)

        card.addSubview(topRow)
        card.addSubview(countLbl)
        card.addSubview(subLbl)

        NSLayoutConstraint.activate([
            topRow.topAnchor.constraint(equalTo: card.topAnchor, constant: 10),
            topRow.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 12),
            topRow.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -12),

            countLbl.topAnchor.constraint(equalTo: topRow.bottomAnchor, constant: 3),
            countLbl.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 12),

            subLbl.topAnchor.constraint(equalTo: countLbl.bottomAnchor, constant: 1),
            subLbl.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 12)
        ])

        return card
    }

    private func setupTabs() {
        tabStackView.translatesAutoresizingMaskIntoConstraints = false
        tabStackView.axis = .horizontal
        tabStackView.distribution = .fillEqually
        tabStackView.spacing = 8
        view.addSubview(tabStackView)

        tabDoctorsBtn.setTitle("Referring Doctors", for: .normal)
        tabDoctorsBtn.titleLabel?.font = .systemFont(ofSize: 13, weight: .bold)
        tabDoctorsBtn.layer.cornerRadius = 10
        tabDoctorsBtn.addTarget(self, action: #selector(tabDoctorsTapped), for: .touchUpInside)

        tabAgenciesBtn.setTitle("Corporate Agencies", for: .normal)
        tabAgenciesBtn.titleLabel?.font = .systemFont(ofSize: 13, weight: .bold)
        tabAgenciesBtn.layer.cornerRadius = 10
        tabAgenciesBtn.addTarget(self, action: #selector(tabAgenciesTapped), for: .touchUpInside)

        updateTabStyles()

        tabStackView.addArrangedSubview(tabDoctorsBtn)
        tabStackView.addArrangedSubview(tabAgenciesBtn)

        NSLayoutConstraint.activate([
            tabStackView.topAnchor.constraint(equalTo: kpiScrollView.bottomAnchor, constant: 10),
            tabStackView.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 16),
            tabStackView.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -16),
            tabStackView.heightAnchor.constraint(equalToConstant: 38)
        ])
    }

    private func updateTabStyles() {
        if isDoctorTab {
            tabDoctorsBtn.backgroundColor = UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1)
            tabDoctorsBtn.setTitleColor(.white, for: .normal)

            tabAgenciesBtn.backgroundColor = .white
            tabAgenciesBtn.setTitleColor(UIColor(red: 0.392, green: 0.455, blue: 0.545, alpha: 1), for: .normal)
            tabAgenciesBtn.layer.borderWidth = 1
            tabAgenciesBtn.layer.borderColor = UIColor(red: 0.886, green: 0.910, blue: 0.941, alpha: 1).cgColor
        } else {
            tabAgenciesBtn.backgroundColor = UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1)
            tabAgenciesBtn.setTitleColor(.white, for: .normal)

            tabDoctorsBtn.backgroundColor = .white
            tabDoctorsBtn.setTitleColor(UIColor(red: 0.392, green: 0.455, blue: 0.545, alpha: 1), for: .normal)
            tabDoctorsBtn.layer.borderWidth = 1
            tabDoctorsBtn.layer.borderColor = UIColor(red: 0.886, green: 0.910, blue: 0.941, alpha: 1).cgColor
        }
    }

    private func setupSearchOmnibar() {
        searchContainer.translatesAutoresizingMaskIntoConstraints = false
        searchContainer.backgroundColor = .white
        searchContainer.layer.cornerRadius = 10
        searchContainer.layer.borderWidth = 1
        searchContainer.layer.borderColor = UIColor(red: 0.886, green: 0.910, blue: 0.941, alpha: 1).cgColor
        view.addSubview(searchContainer)

        let searchIcon = UIImageView(image: UIImage(systemName: "magnifyingglass"))
        searchIcon.tintColor = UIColor(red: 0.580, green: 0.639, blue: 0.722, alpha: 1)
        searchIcon.translatesAutoresizingMaskIntoConstraints = false
        searchContainer.addSubview(searchIcon)

        searchField.translatesAutoresizingMaskIntoConstraints = false
        searchField.placeholder = "Search referrer name, phone, clinic..."
        searchField.font = .systemFont(ofSize: 13)
        searchField.textColor = UIColor(red: 0.059, green: 0.090, blue: 0.165, alpha: 1)
        searchField.clearButtonMode = .never
        searchField.returnKeyType = .search
        searchField.delegate = self
        searchField.addTarget(self, action: #selector(searchChanged), for: .editingChanged)
        searchContainer.addSubview(searchField)

        clearSearchBtn.translatesAutoresizingMaskIntoConstraints = false
        clearSearchBtn.setImage(UIImage(systemName: "xmark.circle.fill"), for: .normal)
        clearSearchBtn.tintColor = UIColor(red: 0.580, green: 0.639, blue: 0.722, alpha: 1)
        clearSearchBtn.isHidden = true
        clearSearchBtn.addTarget(self, action: #selector(clearSearchTapped), for: .touchUpInside)
        searchContainer.addSubview(clearSearchBtn)

        NSLayoutConstraint.activate([
            searchContainer.topAnchor.constraint(equalTo: tabStackView.bottomAnchor, constant: 10),
            searchContainer.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 16),
            searchContainer.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -16),
            searchContainer.heightAnchor.constraint(equalToConstant: 40),

            searchIcon.leadingAnchor.constraint(equalTo: searchContainer.leadingAnchor, constant: 12),
            searchIcon.centerYAnchor.constraint(equalTo: searchContainer.centerYAnchor),
            searchIcon.widthAnchor.constraint(equalToConstant: 15),
            searchIcon.heightAnchor.constraint(equalToConstant: 15),

            searchField.leadingAnchor.constraint(equalTo: searchIcon.trailingAnchor, constant: 8),
            searchField.trailingAnchor.constraint(equalTo: clearSearchBtn.leadingAnchor, constant: -8),
            searchField.centerYAnchor.constraint(equalTo: searchContainer.centerYAnchor),

            clearSearchBtn.trailingAnchor.constraint(equalTo: searchContainer.trailingAnchor, constant: -10),
            clearSearchBtn.centerYAnchor.constraint(equalTo: searchContainer.centerYAnchor),
            clearSearchBtn.widthAnchor.constraint(equalToConstant: 18),
            clearSearchBtn.heightAnchor.constraint(equalToConstant: 18)
        ])
    }

    private func setupTableView() {
        tableView.translatesAutoresizingMaskIntoConstraints = false
        tableView.backgroundColor = .clear
        tableView.separatorStyle = .none
        tableView.delegate = self
        tableView.dataSource = self
        tableView.contentInset = UIEdgeInsets(top: 6, left: 0, bottom: 40, right: 0)
        tableView.register(CommissionReferrerCell.self, forCellReuseIdentifier: "CommissionReferrerCell")
        view.addSubview(tableView)

        refreshControl.addTarget(self, action: #selector(pullRefreshed), for: .valueChanged)
        tableView.addSubview(refreshControl)

        loadingIndicator.translatesAutoresizingMaskIntoConstraints = false
        loadingIndicator.hidesWhenStopped = true
        view.addSubview(loadingIndicator)

        NSLayoutConstraint.activate([
            tableView.topAnchor.constraint(equalTo: searchContainer.bottomAnchor, constant: 8),
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

        let icon = UIImageView(image: UIImage(systemName: "checkmark.seal.fill"))
        icon.tintColor = UIColor(red: 0.051, green: 0.588, blue: 0.412, alpha: 1)
        icon.contentMode = .scaleAspectFit
        icon.translatesAutoresizingMaskIntoConstraints = false
        emptyView.addSubview(icon)

        let title = UILabel()
        title.text = "No Outstanding Commissions"
        title.font = .systemFont(ofSize: 16, weight: .bold)
        title.textColor = UIColor(red: 0.200, green: 0.255, blue: 0.333, alpha: 1)
        title.translatesAutoresizingMaskIntoConstraints = false
        emptyView.addSubview(title)

        let sub = UILabel()
        sub.text = "All referral commissions are currently reconciled and settled."
        sub.font = .systemFont(ofSize: 12.5)
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
            icon.widthAnchor.constraint(equalToConstant: 48),
            icon.heightAnchor.constraint(equalToConstant: 48),

            title.topAnchor.constraint(equalTo: icon.bottomAnchor, constant: 12),
            title.centerXAnchor.constraint(equalTo: emptyView.centerXAnchor),

            sub.topAnchor.constraint(equalTo: title.bottomAnchor, constant: 6),
            sub.leadingAnchor.constraint(equalTo: emptyView.leadingAnchor),
            sub.trailingAnchor.constraint(equalTo: emptyView.trailingAnchor),
            sub.bottomAnchor.constraint(equalTo: emptyView.bottomAnchor)
        ])
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
            for cookie in cookies {
                if cookie.name == "token" && !cookie.value.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                    let cookieToken = cookie.value.trimmingCharacters(in: .whitespacesAndNewlines)
                    KeychainManager.save(cookieToken, forKey: KeychainManager.tokenKey)
                    return cookieToken
                }
            }
        }
        return nil
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  DATA FETCHING & FILTERING
    // ─────────────────────────────────────────────────────────────────────────
    private func loadCommissionsData(isManual: Bool) {
        if !refreshControl.isRefreshing {
            loadingIndicator.startAnimating()
        }

        guard let token = getAuthToken(),
              let url = URL(string: "\(Self.baseUrl)/api/workspace/commissions") else {
            loadingIndicator.stopAnimating()
            refreshControl.endRefreshing()
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue("token=\(token)", forHTTPHeaderField: "Cookie")
        request.setValue("application/json", forHTTPHeaderField: "Accept")

        URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            DispatchQueue.main.async {
                self?.loadingIndicator.stopAnimating()
                self?.refreshControl.endRefreshing()

                guard let self = self, let data = data, error == nil else {
                    self?.showToast("Unable to connect to server")
                    return
                }

                do {
                    if let json = try JSONSerialization.jsonObject(with: data) as? [String: Any] {
                        let stats = json["stats"] as? [String: Any]
                        let docs = json["doctors"] as? [[String: Any]] ?? []
                        let ags = json["agencies"] as? [[String: Any]] ?? []

                        self.doctorList = docs
                        self.agencyList = ags

                        self.tabDoctorsBtn.setTitle("Referring Doctors (\(docs.count))", for: .normal)
                        self.tabAgenciesBtn.setTitle("Corporate Agencies (\(ags.count))", for: .normal)

                        self.updateKpiUi(stats: stats)
                        self.switchTab(toDoctors: self.isDoctorTab)

                        if isManual {
                            self.showToast("Commissions synchronized")
                        }
                    }
                } catch {
                    self.showToast("Error parsing commissions")
                }
            }
        }.resume()
    }

    private func updateKpiUi(stats: [String: Any]?) {
        let total = stats?["totalCommissions"] as? Double ?? 0.0
        let pending = stats?["pendingPayouts"] as? Double ?? 0.0
        let settled = stats?["settledPayouts"] as? Double ?? 0.0
        let count = (stats?["doctorCount"] as? Int ?? doctorList.count) + (stats?["agencyCount"] as? Int ?? agencyList.count)

        kpiTotalCommLbl.text = "₹" + String(format: "%,.0f", total)
        kpiPendingCommLbl.text = "₹" + String(format: "%,.0f", pending)
        kpiSettledCommLbl.text = "₹" + String(format: "%,.0f", settled)
        kpiActiveRefLbl.text = "\(count)"
    }

    private func switchTab(toDoctors: Bool) {
        isDoctorTab = toDoctors
        updateTabStyles()
        currentTabList = isDoctorTab ? doctorList : agencyList
        applyFilterAndSearch()
    }

    private func applyFilterAndSearch() {
        filteredList = currentTabList.filter { item in
            let name = (item["name"] as? String ?? "").lowercased()
            let phone = (item["phone"] as? String ?? "").lowercased()
            let cat = ((item["specialization"] as? String) ?? (item["tier"] as? String) ?? "").lowercased()

            let q = searchQuery.lowercased()
            return q.isEmpty || name.contains(q) || phone.contains(q) || cat.contains(q)
        }

        tableView.reloadData()
        emptyView.isHidden = !filteredList.isEmpty
        tableView.isHidden = filteredList.isEmpty
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  TABLEVIEW DATA SOURCE & DELEGATE
    // ─────────────────────────────────────────────────────────────────────────
    func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        return filteredList.count
    }

    func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        guard let cell = tableView.dequeueReusableCell(withIdentifier: "CommissionReferrerCell", for: indexPath) as? CommissionReferrerCell else {
            return UITableViewCell()
        }

        let item = filteredList[indexPath.row]
        cell.configure(item: item, isDoctor: isDoctorTab)

        cell.onCall = { [weak self] phone in
            self?.dialPhone(phone)
        }
        cell.onWhatsApp = { [weak self] phone, name in
            self?.openWhatsApp(phone: phone, name: name)
        }
        cell.onSettle = { [weak self] in
            self?.showSettleSheet(referrer: item)
        }

        return cell
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  ACTIONS & SHEETS
    // ─────────────────────────────────────────────────────────────────────────
    @objc private func backTapped() {
        dismiss(animated: true, completion: nil)
    }

    @objc private func refreshTapped() {
        loadCommissionsData(isManual: true)
    }

    @objc private func pullRefreshed() {
        loadCommissionsData(isManual: true)
    }

    @objc private func tabDoctorsTapped() {
        switchTab(toDoctors: true)
    }

    @objc private func tabAgenciesTapped() {
        switchTab(toDoctors: false)
    }

    @objc private func searchChanged() {
        searchQuery = searchField.text?.trimmingCharacters(in: .whitespaces) ?? ""
        clearSearchBtn.isHidden = searchQuery.isEmpty
        applyFilterAndSearch()
    }

    @objc private func clearSearchTapped() {
        searchField.text = ""
        searchQuery = ""
        clearSearchBtn.isHidden = true
        applyFilterAndSearch()
    }

    private func dialPhone(_ phone: String) {
        guard let url = URL(string: "tel://\(phone.replacingOccurrences(of: " ", with: ""))"), UIApplication.shared.canOpenURL(url) else {
            showToast("Cannot open phone dialer")
            return
        }
        UIApplication.shared.open(url, options: [:], completionHandler: nil)
    }

    private func openWhatsApp(phone: String, name: String) {
        var clean = phone.components(separatedBy: CharacterSet.decimalDigits.inverted).joined()
        if clean.count == 10 { clean = "91" + clean }
        let msg = "Hello \(name), greetings from PathoLab Diagnostics regarding your commission payout."
        guard let url = URL(string: "https://api.whatsapp.com/send?phone=\(clean)&text=\(msg.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? "")") else { return }
        UIApplication.shared.open(url, options: [:], completionHandler: nil)
    }

    // ── Settle Commission Sheet ──
    private func showSettleSheet(referrer: [String: Any]) {
        let name = referrer["name"] as? String ?? "Partner"
        let due = referrer["pendingCommission"] as? Double ?? 0.0
        let entityType = isDoctorTab ? "DOCTOR" : "AGENCY"
        guard let entityId = referrer["id"] as? String else { return }

        let alert = UIAlertController(
            title: "Settle Commission",
            message: "Disburse payout to \(name).\nOutstanding Due: ₹\(String(format: "%,.0f", due))",
            preferredStyle: .alert
        )

        alert.addTextField { tf in
            tf.placeholder = "Payout Amount (₹) *"
            tf.keyboardType = .decimalPad
            tf.text = String(format: "%.0f", due > 0 ? due : 0.0)
        }
        alert.addTextField { tf in
            tf.placeholder = "Payment Mode (UPI, BANK_TRANSFER, CASH) *"
            tf.text = "UPI"
        }
        alert.addTextField { tf in
            tf.placeholder = "UTR Reference / Cheque No / Note"
        }

        let confirmAction = UIAlertAction(title: "Confirm Settlement", style: .default) { [weak self] _ in
            guard let self = self else { return }
            let amtStr = alert.textFields?[0].text?.trimmingCharacters(in: .whitespaces) ?? ""
            let mode = alert.textFields?[1].text?.trimmingCharacters(in: .whitespaces).uppercased() ?? "UPI"
            let note = alert.textFields?[2].text?.trimmingCharacters(in: .whitespaces) ?? ""

            guard let amount = Double(amtStr), amount > 0 else {
                self.showToast("Please enter a valid payout amount")
                return
            }

            self.submitSettlement(entityType: entityType, entityId: entityId, amount: amount, mode: mode, note: note)
        }

        alert.addAction(confirmAction)
        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel, completion: nil))
        present(alert, animated: true, completion: nil)
    }

    private func submitSettlement(entityType: String, entityId: String, amount: Double, mode: String, note: String) {
        guard let token = getAuthToken(),
              let url = URL(string: "\(Self.baseUrl)/api/workspace/commissions") else { return }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue("token=\(token)", forHTTPHeaderField: "Cookie")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let payload: [String: Any] = [
            "entityType": entityType,
            "entityId": entityId,
            "amount": amount,
            "paymentMode": mode,
            "referenceNote": note
        ]
        request.httpBody = try? JSONSerialization.data(withJSONObject: payload)

        URLSession.shared.dataTask(with: request) { [weak self] _, response, error in
            DispatchQueue.main.async {
                guard let self = self, error == nil else {
                    self?.showToast("Network error")
                    return
                }
                self.showToast("₹\(String(format: "%,.0f", amount)) payout settled successfully!")
                self.loadCommissionsData(isManual: false)
            }
        }.resume()
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
            toast.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -20),
            toast.heightAnchor.constraint(equalToConstant: 32)
        ])

        UIView.animate(withDuration: 0.3, delay: 2.0, options: .curveEaseOut) {
            toast.alpha = 0
        } completion: { _ in
            toast.removeFromSuperview()
        }
    }

    private func colorFromHex(_ hex: String) -> UIColor {
        var cString = hex.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
        if cString.hasPrefix("#") { cString.remove(at: cString.startIndex) }
        var rgbValue: UInt64 = 0
        Scanner(string: cString).scanHexInt64(&rgbValue)
        return UIColor(
            red: CGFloat((rgbValue & 0xFF0000) >> 16) / 255.0,
            green: CGFloat((rgbValue & 0x00FF00) >> 8) / 255.0,
            blue: CGFloat(rgbValue & 0x0000FF) / 255.0,
            alpha: 1.0
        )
    }
}

// ─────────────────────────────────────────────────────────────────────────────
//  COMMISSION REFERRER CELL
// ─────────────────────────────────────────────────────────────────────────────
class CommissionReferrerCell: UITableViewCell {

    var onCall: ((String) -> Void)?
    var onWhatsApp: ((String, String) -> Void)?
    var onSettle: (() -> Void)?

    private let cardView        = UIView()
    private let typeBadge       = UILabel()
    private let categoryBadge   = UILabel()
    private let dueBadge        = UILabel()
    private let nameLabel       = UILabel()
    private let subtitleLabel   = UILabel()

    private let billedVolumeLbl = UILabel()
    private let totalEarnedLbl  = UILabel()
    private let pendingDueLbl   = UILabel()

    private let callBtn         = UIButton(type: .system)
    private let waBtn           = UIButton(type: .system)
    private let settleBtn       = UIButton(type: .system)

    private var currentPhone: String = ""
    private var currentName: String = ""

    override init(style: UITableViewCell.CellStyle, reuseIdentifier: String?) {
        super.init(style: style, reuseIdentifier: reuseIdentifier)
        selectionStyle = .none
        backgroundColor = .clear
        setupCard()
    }

    required init?(coder: NSCoder) { fatalError() }

    private func setupCard() {
        cardView.translatesAutoresizingMaskIntoConstraints = false
        cardView.backgroundColor = .white
        cardView.layer.cornerRadius = 14
        cardView.layer.shadowColor = UIColor.black.cgColor
        cardView.layer.shadowOpacity = 0.04
        cardView.layer.shadowOffset = CGSize(width: 0, height: 2)
        cardView.layer.shadowRadius = 4
        contentView.addSubview(cardView)

        // 1. Top Badges Row
        let topRow = UIStackView()
        topRow.translatesAutoresizingMaskIntoConstraints = false
        topRow.axis = .horizontal
        topRow.spacing = 6
        topRow.alignment = .center

        typeBadge.font = .systemFont(ofSize: 10, weight: .bold)
        typeBadge.layer.cornerRadius = 4
        typeBadge.clipsToBounds = true
        typeBadge.textAlignment = .center

        categoryBadge.font = .systemFont(ofSize: 10, weight: .bold)
        categoryBadge.textColor = UIColor(red: 0.392, green: 0.455, blue: 0.545, alpha: 1)
        categoryBadge.backgroundColor = UIColor(red: 0.945, green: 0.961, blue: 0.976, alpha: 1)
        categoryBadge.layer.cornerRadius = 4
        categoryBadge.clipsToBounds = true
        categoryBadge.textAlignment = .center

        dueBadge.font = .systemFont(ofSize: 11, weight: .bold)
        dueBadge.layer.cornerRadius = 4
        dueBadge.clipsToBounds = true
        dueBadge.textAlignment = .center

        let spacer = UIView()
        topRow.addArrangedSubview(typeBadge)
        topRow.addArrangedSubview(categoryBadge)
        topRow.addArrangedSubview(spacer)
        topRow.addArrangedSubview(dueBadge)
        cardView.addSubview(topRow)

        // 2. Name & Subtitle
        nameLabel.translatesAutoresizingMaskIntoConstraints = false
        nameLabel.font = .systemFont(ofSize: 15, weight: .bold)
        nameLabel.textColor = UIColor(red: 0.059, green: 0.090, blue: 0.165, alpha: 1)
        cardView.addSubview(nameLabel)

        subtitleLabel.translatesAutoresizingMaskIntoConstraints = false
        subtitleLabel.font = .systemFont(ofSize: 12, weight: .medium)
        subtitleLabel.textColor = UIColor(red: 0.392, green: 0.455, blue: 0.545, alpha: 1)
        cardView.addSubview(subtitleLabel)

        // 3. Bento Box
        let bentoBox = UIStackView()
        bentoBox.translatesAutoresizingMaskIntoConstraints = false
        bentoBox.axis = .horizontal
        bentoBox.distribution = .fillEqually
        bentoBox.backgroundColor = UIColor(red: 0.973, green: 0.980, blue: 0.988, alpha: 1)
        bentoBox.layer.cornerRadius = 8
        bentoBox.layoutMargins = UIEdgeInsets(top: 8, left: 10, bottom: 8, right: 10)
        bentoBox.isLayoutMarginsRelativeArrangement = true

        let col1 = createBentoCol(title: "BILLED VOL", valLbl: billedVolumeLbl, valColor: UIColor(red: 0.059, green: 0.090, blue: 0.165, alpha: 1))
        let col2 = createBentoCol(title: "TOTAL EARNED", valLbl: totalEarnedLbl, valColor: UIColor(red: 0.020, green: 0.588, blue: 0.412, alpha: 1))
        let col3 = createBentoCol(title: "UNSETTLED DUE", valLbl: pendingDueLbl, valColor: UIColor(red: 0.851, green: 0.467, blue: 0.024, alpha: 1))

        bentoBox.addArrangedSubview(col1)
        bentoBox.addArrangedSubview(col2)
        bentoBox.addArrangedSubview(col3)
        cardView.addSubview(bentoBox)

        // 4. Action Row
        let actionRow = UIStackView()
        actionRow.translatesAutoresizingMaskIntoConstraints = false
        actionRow.axis = .horizontal
        actionRow.spacing = 8
        actionRow.alignment = .center

        styleBtn(callBtn, iconName: "phone.fill", tint: UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1))
        styleBtn(waBtn, iconName: "message.fill", tint: UIColor(red: 0.086, green: 0.639, blue: 0.290, alpha: 1))

        settleBtn.setTitle("Settle Payout", for: .normal)
        settleBtn.titleLabel?.font = .systemFont(ofSize: 12, weight: .bold)
        settleBtn.setTitleColor(.white, for: .normal)
        settleBtn.backgroundColor = UIColor(red: 0.020, green: 0.588, blue: 0.412, alpha: 1)
        settleBtn.layer.cornerRadius = 6
        settleBtn.heightAnchor.constraint(equalToConstant: 34).isActive = true

        callBtn.addTarget(self, action: #selector(callTapped), for: .touchUpInside)
        waBtn.addTarget(self, action: #selector(waTapped), for: .touchUpInside)
        settleBtn.addTarget(self, action: #selector(settleTapped), for: .touchUpInside)

        actionRow.addArrangedSubview(callBtn)
        actionRow.addArrangedSubview(waBtn)
        actionRow.addArrangedSubview(settleBtn)
        cardView.addSubview(actionRow)

        NSLayoutConstraint.activate([
            cardView.topAnchor.constraint(equalTo: contentView.topAnchor, constant: 5),
            cardView.bottomAnchor.constraint(equalTo: contentView.bottomAnchor, constant: -5),
            cardView.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 16),
            cardView.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -16),

            topRow.topAnchor.constraint(equalTo: cardView.topAnchor, constant: 12),
            topRow.leadingAnchor.constraint(equalTo: cardView.leadingAnchor, constant: 14),
            topRow.trailingAnchor.constraint(equalTo: cardView.trailingAnchor, constant: -14),

            nameLabel.topAnchor.constraint(equalTo: topRow.bottomAnchor, constant: 8),
            nameLabel.leadingAnchor.constraint(equalTo: cardView.leadingAnchor, constant: 14),
            nameLabel.trailingAnchor.constraint(equalTo: cardView.trailingAnchor, constant: -14),

            subtitleLabel.topAnchor.constraint(equalTo: nameLabel.bottomAnchor, constant: 2),
            subtitleLabel.leadingAnchor.constraint(equalTo: nameLabel.leadingAnchor),
            subtitleLabel.trailingAnchor.constraint(equalTo: nameLabel.trailingAnchor),

            bentoBox.topAnchor.constraint(equalTo: subtitleLabel.bottomAnchor, constant: 10),
            bentoBox.leadingAnchor.constraint(equalTo: cardView.leadingAnchor, constant: 14),
            bentoBox.trailingAnchor.constraint(equalTo: cardView.trailingAnchor, constant: -14),

            actionRow.topAnchor.constraint(equalTo: bentoBox.bottomAnchor, constant: 10),
            actionRow.leadingAnchor.constraint(equalTo: cardView.leadingAnchor, constant: 14),
            actionRow.trailingAnchor.constraint(equalTo: cardView.trailingAnchor, constant: -14),
            actionRow.bottomAnchor.constraint(equalTo: cardView.bottomAnchor, constant: -12)
        ])
    }

    private func createBentoCol(title: String, valLbl: UILabel, valColor: UIColor) -> UIView {
        let col = UIStackView()
        col.axis = .vertical
        col.spacing = 2

        let t = UILabel()
        t.text = title
        t.font = .systemFont(ofSize: 9, weight: .bold)
        t.textColor = UIColor(red: 0.392, green: 0.455, blue: 0.545, alpha: 1)

        valLbl.font = .systemFont(ofSize: 13, weight: .bold)
        valLbl.textColor = valColor

        col.addArrangedSubview(t)
        col.addArrangedSubview(valLbl)
        return col
    }

    private func styleBtn(_ b: UIButton, iconName: String, tint: UIColor) {
        b.setImage(UIImage(systemName: iconName), for: .normal)
        b.tintColor = tint
        b.backgroundColor = UIColor(red: 0.945, green: 0.961, blue: 0.976, alpha: 1)
        b.layer.cornerRadius = 6
        b.widthAnchor.constraint(equalToConstant: 34).isActive = true
        b.heightAnchor.constraint(equalToConstant: 34).isActive = true
    }

    func configure(item: [String: Any], isDoctor: Bool) {
        let name = item["name"] as? String ?? "Partner"
        let phone = item["phone"] as? String ?? ""
        let cat = isDoctor ? (item["specialization"] as? String ?? "Doctor") : (item["tier"] as? String ?? "STANDARD")
        let referrals = item["totalReferred"] as? Int ?? 0
        let billed = item["totalBilled"] as? Double ?? 0.0
        let earned = item["totalCommission"] as? Double ?? 0.0
        let pending = item["pendingCommission"] as? Double ?? 0.0

        currentPhone = phone
        currentName = name

        nameLabel.text = name
        subtitleLabel.text = "\(phone.isEmpty ? "" : "\(phone) • ")\(referrals) Tests Referred"

        typeBadge.text = isDoctor ? "  DOCTOR  " : "  AGENCY  "
        typeBadge.textColor = isDoctor ? UIColor(red: 0.145, green: 0.388, blue: 0.922, alpha: 1) : UIColor(red: 0.051, green: 0.580, blue: 0.533, alpha: 1)
        typeBadge.backgroundColor = isDoctor ? UIColor(red: 0.859, green: 0.918, blue: 0.996, alpha: 1) : UIColor(red: 0.800, green: 0.984, blue: 0.945, alpha: 1)

        categoryBadge.text = "  \(cat.uppercased())  "

        billedVolumeLbl.text = "₹" + String(format: "%,.0f", billed)
        totalEarnedLbl.text = "₹" + String(format: "%,.0f", earned)
        pendingDueLbl.text = "₹" + String(format: "%,.0f", pending)

        if pending > 0 {
            dueBadge.text = "  DUE: ₹\(String(format: "%,.0f", pending))  "
            dueBadge.textColor = UIColor(red: 0.851, green: 0.467, blue: 0.024, alpha: 1)
            dueBadge.backgroundColor = UIColor(red: 0.996, green: 0.953, blue: 0.780, alpha: 1)
            settleBtn.isEnabled = true
            settleBtn.setTitle("Settle Payout", for: .normal)
            settleBtn.backgroundColor = UIColor(red: 0.020, green: 0.588, blue: 0.412, alpha: 1)
        } else {
            dueBadge.text = "  SETTLED  "
            dueBadge.textColor = UIColor(red: 0.020, green: 0.588, blue: 0.412, alpha: 1)
            dueBadge.backgroundColor = UIColor(red: 0.820, green: 0.980, blue: 0.898, alpha: 1)
            settleBtn.isEnabled = false
            settleBtn.setTitle("Balanced", for: .normal)
            settleBtn.backgroundColor = UIColor(red: 0.796, green: 0.835, blue: 0.882, alpha: 1)
        }
    }

    @objc private func callTapped() { onCall?(currentPhone) }
    @objc private func waTapped() { onWhatsApp?(currentPhone, currentName) }
    @objc private func settleTapped() { onSettle?() }
}
