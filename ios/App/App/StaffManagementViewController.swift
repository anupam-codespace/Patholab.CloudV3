import UIKit

// MARK: - Models

struct StaffItem {
    let staffId: String
    let userId: String
    let name: String
    let email: String
    let phone: String
    let role: String
    let position: String
    let department: String
    let salary: Double
    let employeeId: String
    let branchId: String
    let branchName: String
    let isActive: Bool
}

struct StaffBranchItem {
    let id: String
    let name: String
    let branchCode: String
}

struct StaffActivityLogItem {
    let id: String
    let action: String
    let description: String
    let formattedDate: String
}

// MARK: - StaffManagementViewController

class StaffManagementViewController: UIViewController, UITableViewDataSource, UITableViewDelegate, UITextFieldDelegate {

    // UI Elements
    private let topHeaderView     = UIView()
    private let countBadgeLbl     = UILabel()
    private let kpiScrollView     = UIScrollView()
    private let kpiStack          = UIStackView()
    private let searchField       = UITextField()
    private let clearSearchBtn    = UIButton(type: .system)
    private let filterScrollView  = UIScrollView()
    private let filterChipsStack  = UIStackView()
    private let tableView         = UITableView()
    private let spinner           = UIActivityIndicatorView(style: .medium)
    private let emptyStateView    = UIView()

    // KPI Labels
    private let lblTotalStaff     = UILabel()
    private let lblActiveStaff    = UILabel()
    private let lblSuspendedStaff = UILabel()
    private let lblTechnicians    = UILabel()
    private let lblDoctors        = UILabel()
    private let lblReceptionists  = UILabel()

    // Data State
    private var allStaff: [StaffItem] = []
    private var filteredStaff: [StaffItem] = []
    private var branchesList: [StaffBranchItem] = []
    private var selectedFilter: String = "ALL"
    private var currentAdminUserId: String = ""
    private let baseUrl = "https://patholab.cloud"

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 0.973, green: 0.980, blue: 0.988, alpha: 1) // #F8FAFC

        setupHeader()
        setupKpiRow()
        setupSearchAndFilters()
        setupTableView()
        setupEmptyState()

        fetchUserInfoAndData()
    }

    override var preferredStatusBarStyle: UIStatusBarStyle {
        return .lightContent
    }

    // ── Header Setup ─────────────────────────────────────────────────────────

    private func setupHeader() {
        topHeaderView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(topHeaderView)

        let gradient = CAGradientLayer()
        gradient.colors = [
            UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1).cgColor,
            UIColor(red: 0.118, green: 0.251, blue: 0.686, alpha: 1).cgColor
        ]
        gradient.startPoint = CGPoint(x: 0, y: 0)
        gradient.endPoint = CGPoint(x: 1, y: 1)
        topHeaderView.layer.insertSublayer(gradient, at: 0)

        // Back Button
        let backBtn = UIButton(type: .system)
        backBtn.setImage(UIImage(systemName: "chevron.left"), for: .normal)
        backBtn.tintColor = UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1)
        backBtn.backgroundColor = .white
        backBtn.layer.cornerRadius = 19
        backBtn.addTarget(self, action: #selector(didTapBack), for: .touchUpInside)
        backBtn.translatesAutoresizingMaskIntoConstraints = false
        topHeaderView.addSubview(backBtn)

        // Title + Badge
        let titleLbl = UILabel()
        titleLbl.text = "Staff Directory"
        titleLbl.font = .systemFont(ofSize: 18, weight: .bold)
        titleLbl.textColor = .white
        titleLbl.translatesAutoresizingMaskIntoConstraints = false
        topHeaderView.addSubview(titleLbl)

        countBadgeLbl.text = "0 Members"
        countBadgeLbl.font = .systemFont(ofSize: 11, weight: .bold)
        countBadgeLbl.textColor = UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1)
        countBadgeLbl.backgroundColor = .white
        countBadgeLbl.layer.cornerRadius = 8
        countBadgeLbl.clipsToBounds = true
        countBadgeLbl.textAlignment = .center
        countBadgeLbl.translatesAutoresizingMaskIntoConstraints = false
        topHeaderView.addSubview(countBadgeLbl)

        let subLbl = UILabel()
        subLbl.text = "Manage access, roles, and branch assignments."
        subLbl.font = .systemFont(ofSize: 11.5, weight: .medium)
        subLbl.textColor = UIColor(red: 0.78, green: 0.87, blue: 1.0, alpha: 1)
        subLbl.translatesAutoresizingMaskIntoConstraints = false
        topHeaderView.addSubview(subLbl)

        // + Add Staff Button
        let addBtn = UIButton(type: .system)
        addBtn.setTitle("＋ Add Staff", for: .normal)
        addBtn.setTitleColor(.white, for: .normal)
        addBtn.titleLabel?.font = .systemFont(ofSize: 12.5, weight: .bold)
        addBtn.backgroundColor = UIColor(red: 0.02, green: 0.59, blue: 0.41, alpha: 1)
        addBtn.layer.cornerRadius = 10
        addBtn.contentEdgeInsets = UIEdgeInsets(top: 6, left: 10, bottom: 6, right: 10)
        addBtn.addTarget(self, action: #selector(didTapAddStaff), for: .touchUpInside)
        addBtn.translatesAutoresizingMaskIntoConstraints = false
        topHeaderView.addSubview(addBtn)

        // Refresh Button
        let refreshBtn = UIButton(type: .system)
        refreshBtn.setImage(UIImage(systemName: "arrow.clockwise"), for: .normal)
        refreshBtn.tintColor = .white
        refreshBtn.backgroundColor = UIColor.white.withAlphaComponent(0.20)
        refreshBtn.layer.cornerRadius = 16
        refreshBtn.addTarget(self, action: #selector(didTapRefresh), for: .touchUpInside)
        refreshBtn.translatesAutoresizingMaskIntoConstraints = false
        topHeaderView.addSubview(refreshBtn)

        NSLayoutConstraint.activate([
            topHeaderView.topAnchor.constraint(equalTo: view.topAnchor),
            topHeaderView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            topHeaderView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            topHeaderView.heightAnchor.constraint(equalToConstant: 104),

            backBtn.leadingAnchor.constraint(equalTo: topHeaderView.leadingAnchor, constant: 14),
            backBtn.bottomAnchor.constraint(equalTo: topHeaderView.bottomAnchor, constant: -10),
            backBtn.widthAnchor.constraint(equalToConstant: 38),
            backBtn.heightAnchor.constraint(equalToConstant: 38),

            titleLbl.leadingAnchor.constraint(equalTo: backBtn.trailingAnchor, constant: 10),
            titleLbl.topAnchor.constraint(equalTo: backBtn.topAnchor, constant: -2),

            countBadgeLbl.leadingAnchor.constraint(equalTo: titleLbl.trailingAnchor, constant: 8),
            countBadgeLbl.centerYAnchor.constraint(equalTo: titleLbl.centerYAnchor),
            countBadgeLbl.heightAnchor.constraint(equalToConstant: 20),
            countBadgeLbl.widthAnchor.constraint(greaterThanOrEqualToConstant: 75),

            subLbl.leadingAnchor.constraint(equalTo: titleLbl.leadingAnchor),
            subLbl.topAnchor.constraint(equalTo: titleLbl.bottomAnchor, constant: 2),
            subLbl.trailingAnchor.constraint(lessThanOrEqualTo: addBtn.leadingAnchor, constant: -8),

            refreshBtn.trailingAnchor.constraint(equalTo: topHeaderView.trailingAnchor, constant: -14),
            refreshBtn.centerYAnchor.constraint(equalTo: backBtn.centerYAnchor),
            refreshBtn.widthAnchor.constraint(equalToConstant: 32),
            refreshBtn.heightAnchor.constraint(equalToConstant: 32),

            addBtn.trailingAnchor.constraint(equalTo: refreshBtn.leadingAnchor, constant: -8),
            addBtn.centerYAnchor.constraint(equalTo: backBtn.centerYAnchor),
            addBtn.heightAnchor.constraint(equalToConstant: 32),
        ])
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        if let g = topHeaderView.layer.sublayers?.first as? CAGradientLayer {
            g.frame = topHeaderView.bounds
        }
    }

    // ── KPI Row ──────────────────────────────────────────────────────────────

    private func setupKpiRow() {
        kpiScrollView.showsHorizontalScrollIndicator = false
        kpiScrollView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(kpiScrollView)

        kpiStack.axis = .horizontal
        kpiStack.spacing = 8
        kpiStack.translatesAutoresizingMaskIntoConstraints = false
        kpiScrollView.addSubview(kpiStack)

        NSLayoutConstraint.activate([
            kpiScrollView.topAnchor.constraint(equalTo: topHeaderView.bottomAnchor, constant: 8),
            kpiScrollView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            kpiScrollView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            kpiScrollView.heightAnchor.constraint(equalToConstant: 86),

            kpiStack.topAnchor.constraint(equalTo: kpiScrollView.topAnchor),
            kpiStack.bottomAnchor.constraint(equalTo: kpiScrollView.bottomAnchor),
            kpiStack.leadingAnchor.constraint(equalTo: kpiScrollView.leadingAnchor, constant: 14),
            kpiStack.trailingAnchor.constraint(equalTo: kpiScrollView.trailingAnchor, constant: -14),
        ])

        kpiStack.addArrangedSubview(makeKpiCard(title: "TOTAL STAFF", valueLbl: lblTotalStaff, valueColor: UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1), subText: "All Members"))
        kpiStack.addArrangedSubview(makeKpiCard(title: "ACTIVE ACCESS", valueLbl: lblActiveStaff, valueColor: UIColor(red: 0.02, green: 0.59, blue: 0.41, alpha: 1), subText: "Active Logins"))
        kpiStack.addArrangedSubview(makeKpiCard(title: "SUSPENDED", valueLbl: lblSuspendedStaff, valueColor: UIColor(red: 0.86, green: 0.15, blue: 0.15, alpha: 1), subText: "Revoked Access"))
        kpiStack.addArrangedSubview(makeKpiCard(title: "TECHNICIANS", valueLbl: lblTechnicians, valueColor: UIColor(red: 0.49, green: 0.23, blue: 0.93, alpha: 1), subText: "Lab Processing"))
        kpiStack.addArrangedSubview(makeKpiCard(title: "DOCTORS", valueLbl: lblDoctors, valueColor: UIColor(red: 0.01, green: 0.52, blue: 0.78, alpha: 1), subText: "Medical Approvals"))
        kpiStack.addArrangedSubview(makeKpiCard(title: "RECEPTIONISTS", valueLbl: lblReceptionists, valueColor: UIColor(red: 0.85, green: 0.47, blue: 0.02, alpha: 1), subText: "Frontdesk & Billing"))
    }

    private func makeKpiCard(title: String, valueLbl: UILabel, valueColor: UIColor, subText: String) -> UIView {
        let card = UIView()
        card.backgroundColor = .white
        card.layer.cornerRadius = 14
        card.layer.shadowColor = UIColor(red: 0.05, green: 0.15, blue: 0.30, alpha: 1).cgColor
        card.layer.shadowOpacity = 0.05
        card.layer.shadowRadius = 4
        card.layer.shadowOffset = CGSize(width: 0, height: 2)
        card.layer.borderWidth = 1
        card.layer.borderColor = UIColor(red: 0.92, green: 0.94, blue: 0.97, alpha: 1).cgColor
        card.translatesAutoresizingMaskIntoConstraints = false
        card.widthAnchor.constraint(equalToConstant: 140).isActive = true

        let tLbl = UILabel()
        tLbl.text = title
        tLbl.font = .systemFont(ofSize: 9.5, weight: .bold)
        tLbl.textColor = UIColor(red: 0.39, green: 0.45, blue: 0.55, alpha: 1)

        valueLbl.text = "0"
        valueLbl.font = .systemFont(ofSize: 19, weight: .bold)
        valueLbl.textColor = valueColor

        let sLbl = UILabel()
        sLbl.text = subText
        sLbl.font = .systemFont(ofSize: 10.5, weight: .medium)
        sLbl.textColor = UIColor(red: 0.58, green: 0.64, blue: 0.72, alpha: 1)

        [tLbl, valueLbl, sLbl].forEach {
            $0.translatesAutoresizingMaskIntoConstraints = false
            card.addSubview($0)
        }

        NSLayoutConstraint.activate([
            tLbl.topAnchor.constraint(equalTo: card.topAnchor, constant: 10),
            tLbl.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 12),
            tLbl.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -12),

            valueLbl.topAnchor.constraint(equalTo: tLbl.bottomAnchor, constant: 2),
            valueLbl.leadingAnchor.constraint(equalTo: tLbl.leadingAnchor),

            sLbl.topAnchor.constraint(equalTo: valueLbl.bottomAnchor, constant: 1),
            sLbl.leadingAnchor.constraint(equalTo: tLbl.leadingAnchor),
        ])

        return card
    }

    // ── Search & Filter Chips ────────────────────────────────────────────────

    private func setupSearchAndFilters() {
        let searchContainer = UIView()
        searchContainer.backgroundColor = .white
        searchContainer.layer.cornerRadius = 12
        searchContainer.layer.borderWidth = 1
        searchContainer.layer.borderColor = UIColor(red: 0.90, green: 0.92, blue: 0.95, alpha: 1).cgColor
        searchContainer.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(searchContainer)

        let searchIcon = UIImageView(image: UIImage(systemName: "magnifyingglass"))
        searchIcon.tintColor = UIColor(red: 0.58, green: 0.64, blue: 0.72, alpha: 1)
        searchIcon.translatesAutoresizingMaskIntoConstraints = false
        searchContainer.addSubview(searchIcon)

        searchField.placeholder = "Search staff ID, name, email, role..."
        searchField.font = .systemFont(ofSize: 13.5, weight: .medium)
        searchField.textColor = UIColor(red: 0.059, green: 0.090, blue: 0.165, alpha: 1)
        searchField.returnKeyType = .search
        searchField.delegate = self
        searchField.addTarget(self, action: #selector(didSearchStaff), for: .editingChanged)
        searchField.translatesAutoresizingMaskIntoConstraints = false
        searchContainer.addSubview(searchField)

        clearSearchBtn.setImage(UIImage(systemName: "xmark.circle.fill"), for: .normal)
        clearSearchBtn.tintColor = UIColor(red: 0.58, green: 0.64, blue: 0.72, alpha: 1)
        clearSearchBtn.isHidden = true
        clearSearchBtn.addTarget(self, action: #selector(didClearSearch), for: .touchUpInside)
        clearSearchBtn.translatesAutoresizingMaskIntoConstraints = false
        searchContainer.addSubview(clearSearchBtn)

        filterScrollView.showsHorizontalScrollIndicator = false
        filterScrollView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(filterScrollView)

        filterChipsStack.axis = .horizontal
        filterChipsStack.spacing = 8
        filterChipsStack.translatesAutoresizingMaskIntoConstraints = false
        filterScrollView.addSubview(filterChipsStack)

        NSLayoutConstraint.activate([
            searchContainer.topAnchor.constraint(equalTo: kpiScrollView.bottomAnchor, constant: 6),
            searchContainer.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 14),
            searchContainer.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -14),
            searchContainer.heightAnchor.constraint(equalToConstant: 44),

            searchIcon.leadingAnchor.constraint(equalTo: searchContainer.leadingAnchor, constant: 12),
            searchIcon.centerYAnchor.constraint(equalTo: searchContainer.centerYAnchor),
            searchIcon.widthAnchor.constraint(equalToConstant: 18),
            searchIcon.heightAnchor.constraint(equalToConstant: 18),

            clearSearchBtn.trailingAnchor.constraint(equalTo: searchContainer.trailingAnchor, constant: -10),
            clearSearchBtn.centerYAnchor.constraint(equalTo: searchContainer.centerYAnchor),
            clearSearchBtn.widthAnchor.constraint(equalToConstant: 24),
            clearSearchBtn.heightAnchor.constraint(equalToConstant: 24),

            searchField.leadingAnchor.constraint(equalTo: searchIcon.trailingAnchor, constant: 10),
            searchField.trailingAnchor.constraint(equalTo: clearSearchBtn.leadingAnchor, constant: -6),
            searchField.topAnchor.constraint(equalTo: searchContainer.topAnchor),
            searchField.bottomAnchor.constraint(equalTo: searchContainer.bottomAnchor),

            filterScrollView.topAnchor.constraint(equalTo: searchContainer.bottomAnchor, constant: 8),
            filterScrollView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            filterScrollView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            filterScrollView.heightAnchor.constraint(equalToConstant: 34),

            filterChipsStack.topAnchor.constraint(equalTo: filterScrollView.topAnchor),
            filterChipsStack.bottomAnchor.constraint(equalTo: filterScrollView.bottomAnchor),
            filterChipsStack.leadingAnchor.constraint(equalTo: filterScrollView.leadingAnchor, constant: 14),
            filterChipsStack.trailingAnchor.constraint(equalTo: filterScrollView.trailingAnchor, constant: -14),
        ])

        setupFilterChips()
    }

    private func setupFilterChips() {
        filterChipsStack.arrangedSubviews.forEach { $0.removeFromSuperview() }
        let chips = [
            ("ALL", "All Members"),
            ("ACTIVE", "● Active"),
            ("SUSPENDED", "● Suspended"),
            ("TECHNICIAN", "Technicians"),
            ("DOCTOR", "Doctors"),
            ("RECEPTIONIST", "Receptionists"),
            ("LAB_MANAGER", "Managers")
        ]

        for (key, label) in chips {
            let btn = UIButton(type: .system)
            btn.setTitle(label, for: .normal)
            btn.titleLabel?.font = .systemFont(ofSize: 12, weight: selectedFilter == key ? .bold : .medium)
            btn.contentEdgeInsets = UIEdgeInsets(top: 6, left: 12, bottom: 6, right: 12)
            btn.layer.cornerRadius = 14

            if selectedFilter == key {
                btn.backgroundColor = UIColor(red: 0.937, green: 0.965, blue: 1.0, alpha: 1)
                btn.setTitleColor(UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1), for: .normal)
                btn.layer.borderWidth = 1
                btn.layer.borderColor = UIColor(red: 0.75, green: 0.86, blue: 1.0, alpha: 1).cgColor
            } else {
                btn.backgroundColor = UIColor(red: 0.941, green: 0.961, blue: 0.976, alpha: 1)
                btn.setTitleColor(UIColor(red: 0.392, green: 0.451, blue: 0.549, alpha: 1), for: .normal)
                btn.layer.borderWidth = 0
            }

            btn.tag = chips.firstIndex(where: { $0.0 == key }) ?? 0
            btn.addTarget(self, action: #selector(didSelectFilterChip(_:)), for: .touchUpInside)
            filterChipsStack.addArrangedSubview(btn)
        }
    }

    @objc private func didSelectFilterChip(_ sender: UIButton) {
        let keys = ["ALL", "ACTIVE", "SUSPENDED", "TECHNICIAN", "DOCTOR", "RECEPTIONIST", "LAB_MANAGER"]
        if sender.tag < keys.count {
            selectedFilter = keys[sender.tag]
            setupFilterChips()
            applyFilter()
        }
    }

    @objc private func didSearchStaff() {
        let q = searchField.text ?? ""
        clearSearchBtn.isHidden = q.isEmpty
        applyFilter()
    }

    @objc private func didClearSearch() {
        searchField.text = ""
        clearSearchBtn.isHidden = true
        applyFilter()
    }

    // ── Table View ───────────────────────────────────────────────────────────

    private func setupTableView() {
        tableView.backgroundColor = .clear
        tableView.separatorStyle = .none
        tableView.dataSource = self
        tableView.delegate = self
        tableView.register(StaffCardCell.self, forCellReuseIdentifier: "StaffCardCell")
        tableView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(tableView)

        spinner.hidesWhenStopped = true
        spinner.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(spinner)

        NSLayoutConstraint.activate([
            tableView.topAnchor.constraint(equalTo: filterScrollView.bottomAnchor, constant: 8),
            tableView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            tableView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            tableView.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor),

            spinner.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            spinner.centerYAnchor.constraint(equalTo: view.centerYAnchor),
        ])
    }

    private func setupEmptyState() {
        emptyStateView.isHidden = true
        emptyStateView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(emptyStateView)

        let icon = UILabel()
        icon.text = "👥"
        icon.font = .systemFont(ofSize: 44)
        icon.textAlignment = .center

        let title = UILabel()
        title.text = "No Staff Members Found"
        title.font = .systemFont(ofSize: 16.5, weight: .bold)
        title.textColor = UIColor(red: 0.059, green: 0.090, blue: 0.165, alpha: 1)
        title.textAlignment = .center

        let sub = UILabel()
        sub.text = "No staff members matched your search or filter criteria."
        sub.font = .systemFont(ofSize: 12.5, weight: .medium)
        sub.textColor = UIColor(red: 0.392, green: 0.451, blue: 0.549, alpha: 1)
        sub.numberOfLines = 0
        sub.textAlignment = .center

        let addBtn = UIButton(type: .system)
        addBtn.setTitle("＋ Add Staff Member", for: .normal)
        addBtn.setTitleColor(.white, for: .normal)
        addBtn.titleLabel?.font = .systemFont(ofSize: 13, weight: .bold)
        addBtn.backgroundColor = UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1)
        addBtn.layer.cornerRadius = 12
        addBtn.contentEdgeInsets = UIEdgeInsets(top: 10, left: 20, bottom: 10, right: 20)
        addBtn.addTarget(self, action: #selector(didTapAddStaff), for: .touchUpInside)

        [icon, title, sub, addBtn].forEach {
            $0.translatesAutoresizingMaskIntoConstraints = false
            emptyStateView.addSubview($0)
        }

        NSLayoutConstraint.activate([
            emptyStateView.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            emptyStateView.centerYAnchor.constraint(equalTo: view.centerYAnchor),
            emptyStateView.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 32),
            emptyStateView.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -32),

            icon.topAnchor.constraint(equalTo: emptyStateView.topAnchor),
            icon.centerXAnchor.constraint(equalTo: emptyStateView.centerXAnchor),

            title.topAnchor.constraint(equalTo: icon.bottomAnchor, constant: 8),
            title.centerXAnchor.constraint(equalTo: emptyStateView.centerXAnchor),

            sub.topAnchor.constraint(equalTo: title.bottomAnchor, constant: 4),
            sub.leadingAnchor.constraint(equalTo: emptyStateView.leadingAnchor),
            sub.trailingAnchor.constraint(equalTo: emptyStateView.trailingAnchor),

            addBtn.topAnchor.constraint(equalTo: sub.bottomAnchor, constant: 14),
            addBtn.centerXAnchor.constraint(equalTo: emptyStateView.centerXAnchor),
            addBtn.bottomAnchor.constraint(equalTo: emptyStateView.bottomAnchor),
        ])
    }

    // ── Data Networking ──────────────────────────────────────────────────────

    private func fetchUserInfoAndData() {
        guard let url = URL(string: baseUrl + "/api/auth/me") else { return }
        var req = URLRequest(url: url)
        req.httpMethod = "GET"
        if let token = UserDefaults.standard.string(forKey: "auth_token") {
            req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            req.setValue("token=\(token)", forHTTPHeaderField: "Cookie")
        }

        URLSession.shared.dataTask(with: req) { [weak self] data, _, _ in
            if let data = data,
               let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
               let user = json["user"] as? [String: Any],
               let uId = user["id"] as? String {
                self?.currentAdminUserId = uId
            }
            self?.fetchBranches()
            self?.fetchStaffDirectory()
        }.resume()
    }

    private func fetchBranches() {
        guard let url = URL(string: baseUrl + "/api/workspace/branches") else { return }
        var req = URLRequest(url: url)
        req.httpMethod = "GET"
        if let token = UserDefaults.standard.string(forKey: "auth_token") {
            req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            req.setValue("token=\(token)", forHTTPHeaderField: "Cookie")
        }

        URLSession.shared.dataTask(with: req) { [weak self] data, _, _ in
            guard let data = data else { return }
            var loaded: [StaffBranchItem] = [StaffBranchItem(id: "", name: "Main Branch", branchCode: "01")]

            if let arr = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]] {
                for b in arr {
                    let bId = b["id"] as? String ?? ""
                    let bName = b["name"] as? String ?? "Branch"
                    let bCode = b["branchCode"] as? String ?? "01"
                    if !bId.isEmpty {
                        loaded.append(StaffBranchItem(id: bId, name: bName, branchCode: bCode))
                    }
                }
            } else if let dict = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                      let arr = dict["branches"] as? [[String: Any]] {
                for b in arr {
                    let bId = b["id"] as? String ?? ""
                    let bName = b["name"] as? String ?? "Branch"
                    let bCode = b["branchCode"] as? String ?? "01"
                    if !bId.isEmpty {
                        loaded.append(StaffBranchItem(id: bId, name: bName, branchCode: bCode))
                    }
                }
            }
            self?.branchesList = loaded
        }.resume()
    }

    private func fetchStaffDirectory() {
        DispatchQueue.main.async {
            self.spinner.startAnimating()
            if self.allStaff.isEmpty { self.emptyStateView.isHidden = true }
        }

        guard let url = URL(string: baseUrl + "/api/workspace/staff") else { return }
        var req = URLRequest(url: url)
        req.httpMethod = "GET"
        if let token = UserDefaults.standard.string(forKey: "auth_token") {
            req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            req.setValue("token=\(token)", forHTTPHeaderField: "Cookie")
        }

        URLSession.shared.dataTask(with: req) { [weak self] data, resp, err in
            DispatchQueue.main.async {
                self?.spinner.stopAnimating()
            }
            guard let self = self, let data = data,
                  let arr = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]] else {
                return
            }

            var loaded: [StaffItem] = []
            for s in arr {
                let staffId = s["id"] as? String ?? ""
                let pos = s["position"] as? String ?? ""
                let dept = s["department"] as? String ?? ""
                let salary = (s["salary"] as? NSNumber)?.doubleValue ?? 0.0
                let empId = s["employeeId"] as? String ?? ""
                let branchId = s["branchId"] as? String ?? ""

                let u = s["user"] as? [String: Any] ?? [:]
                let userId = u["id"] as? String ?? ""
                let name = u["name"] as? String ?? "Staff Member"
                let email = u["email"] as? String ?? ""
                let phone = u["phone"] as? String ?? ""
                let role = (u["role"] as? String ?? "TECHNICIAN").uppercased()
                let isActive = u["isActive"] as? Bool ?? true

                let br = s["branch"] as? [String: Any] ?? [:]
                let branchName = br["name"] as? String ?? "Main Branch"

                loaded.append(StaffItem(
                    staffId: staffId,
                    userId: userId,
                    name: name,
                    email: email,
                    phone: phone,
                    role: role,
                    position: pos.isEmpty ? role : pos,
                    department: dept,
                    salary: salary,
                    employeeId: empId.isEmpty ? "PENDING" : empId,
                    branchId: branchId,
                    branchName: branchName,
                    isActive: isActive
                ))
            }

            DispatchQueue.main.async {
                self.allStaff = loaded
                self.updateKPIs()
                self.applyFilter()
            }
        }.resume()
    }

    private func updateKPIs() {
        let total = allStaff.count
        var active = 0
        var suspended = 0
        var tech = 0
        var doc = 0
        var recep = 0

        for m in allStaff {
            if m.isActive { active += 1 } else { suspended += 1 }
            let r = m.role.uppercased()
            if r.contains("TECH") { tech += 1 }
            else if r.contains("DOC") || r.contains("PATH") { doc += 1 }
            else if r.contains("RECEP") || r.contains("FRONT") { recep += 1 }
        }

        countBadgeLbl.text = "\(total) Members"
        lblTotalStaff.text = "\(total)"
        lblActiveStaff.text = "\(active)"
        lblSuspendedStaff.text = "\(suspended)"
        lblTechnicians.text = "\(tech)"
        lblDoctors.text = "\(doc)"
        lblReceptionists.text = "\(recep)"
    }

    private func applyFilter() {
        let q = (searchField.text ?? "").trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        filteredStaff = allStaff.filter { m in
            // Filter chip check
            var matchesFilter = false
            if selectedFilter == "ALL" { matchesFilter = true }
            else if selectedFilter == "ACTIVE" && m.isActive { matchesFilter = true }
            else if selectedFilter == "SUSPENDED" && !m.isActive { matchesFilter = true }
            else if selectedFilter == "TECHNICIAN" && m.role.contains("TECH") { matchesFilter = true }
            else if selectedFilter == "DOCTOR" && (m.role.contains("DOC") || m.role.contains("PATH")) { matchesFilter = true }
            else if selectedFilter == "RECEPTIONIST" && (m.role.contains("RECEP") || m.role.contains("FRONT")) { matchesFilter = true }
            else if selectedFilter == "LAB_MANAGER" && m.role.contains("MAN") { matchesFilter = true }

            if !matchesFilter { return false }

            // Search query check
            if !q.isEmpty {
                return m.name.lowercased().contains(q)
                    || m.email.lowercased().contains(q)
                    || m.employeeId.lowercased().contains(q)
                    || m.phone.lowercased().contains(q)
                    || m.role.lowercased().contains(q)
                    || m.position.lowercased().contains(q)
                    || m.department.lowercased().contains(q)
                    || m.branchName.lowercased().contains(q)
            }
            return true
        }

        tableView.reloadData()
        emptyStateView.isHidden = !filteredStaff.isEmpty
    }

    // ── Actions & Modals ─────────────────────────────────────────────────────

    @objc private func didTapBack() {
        dismiss(animated: true, completion: nil)
    }

    @objc private func didTapRefresh() {
        fetchStaffDirectory()
    }

    @objc private func didTapAddStaff() {
        let modal = StaffAddEditViewController(staff: nil, branches: branchesList) { [weak self] in
            self?.fetchStaffDirectory()
        }
        present(modal, animated: true)
    }

    private func didTapEditStaff(_ staff: StaffItem) {
        let modal = StaffAddEditViewController(staff: staff, branches: branchesList) { [weak self] in
            self?.fetchStaffDirectory()
        }
        present(modal, animated: true)
    }

    private func didTapViewActivity(_ staff: StaffItem) {
        let modal = StaffActivityLogViewController(staff: staff)
        present(modal, animated: true)
    }

    private func didTapResetPassword(_ staff: StaffItem) {
        let alert = UIAlertController(title: "Reset Password", message: "Enter a new password for \(staff.name) (\(staff.email))", preferredStyle: .alert)
        alert.addTextField { tf in
            tf.placeholder = "Minimum 6 characters"
            tf.isSecureTextEntry = true
        }
        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel))
        alert.addAction(UIAlertAction(title: "Update Password", style: .default, handler: { [weak self] _ in
            guard let self = self, let newPass = alert.textFields?.first?.text?.trimmingCharacters(in: .whitespacesAndNewlines), newPass.count >= 6 else {
                let err = UIAlertController(title: "Invalid Password", message: "Password must be at least 6 characters.", preferredStyle: .alert)
                err.addAction(UIAlertAction(title: "OK", style: .default))
                self?.present(err, animated: true)
                return
            }
            self.executePatchAction(payload: [
                "action": "CHANGE_PASSWORD",
                "staffId": staff.staffId,
                "userId": staff.userId,
                "newPassword": newPass
            ], successMsg: "Password updated successfully.")
        }))
        present(alert, animated: true)
    }

    private func didTapToggleStatus(_ staff: StaffItem) {
        if staff.userId == currentAdminUserId && staff.isActive {
            let err = UIAlertController(title: "Action Prohibited", message: "You cannot suspend your own admin account.", preferredStyle: .alert)
            err.addAction(UIAlertAction(title: "OK", style: .default))
            present(err, animated: true)
            return
        }

        let actionWord = staff.isActive ? "SUSPEND" : "RESTORE"
        let alert = UIAlertController(
            title: staff.isActive ? "Suspend Access" : "Restore Access",
            message: "Are you sure you want to \(actionWord) access for \(staff.name)?",
            preferredStyle: .alert
        )
        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel))
        alert.addAction(UIAlertAction(title: staff.isActive ? "Suspend Access" : "Restore Access", style: staff.isActive ? .destructive : .default, handler: { [weak self] _ in
            self?.executePatchAction(payload: [
                "action": "TOGGLE_STATUS",
                "staffId": staff.staffId,
                "userId": staff.userId,
                "isActive": !staff.isActive
            ], successMsg: "Staff access \(staff.isActive ? "suspended" : "restored").")
        }))
        present(alert, animated: true)
    }

    private func didTapRemoveStaff(_ staff: StaffItem) {
        if staff.userId == currentAdminUserId {
            let err = UIAlertController(title: "Action Prohibited", message: "You cannot remove your own admin account.", preferredStyle: .alert)
            err.addAction(UIAlertAction(title: "OK", style: .default))
            present(err, animated: true)
            return
        }

        let alert = UIAlertController(
            title: "Remove Staff Member",
            message: "Are you sure you want to remove \(staff.name) from the laboratory directory?\n\nThis will revoke all active credentials.",
            preferredStyle: .alert
        )
        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel))
        alert.addAction(UIAlertAction(title: "Remove Staff", style: .destructive, handler: { [weak self] _ in
            self?.executePatchAction(payload: [
                "action": "REMOVE_STAFF",
                "staffId": staff.staffId,
                "userId": staff.userId
            ], successMsg: "Staff member removed.")
        }))
        present(alert, animated: true)
    }

    private func executePatchAction(payload: [String: Any], successMsg: String) {
        guard let url = URL(string: baseUrl + "/api/workspace/staff") else { return }
        var req = URLRequest(url: url)
        req.httpMethod = "PATCH"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let token = UserDefaults.standard.string(forKey: "auth_token") {
            req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            req.setValue("token=\(token)", forHTTPHeaderField: "Cookie")
        }
        req.httpBody = try? JSONSerialization.data(withJSONObject: payload)

        URLSession.shared.dataTask(with: req) { [weak self] data, resp, err in
            DispatchQueue.main.async {
                if let http = resp as? HTTPURLResponse, http.statusCode == 200 {
                    self?.fetchStaffDirectory()
                } else {
                    var errorMsg = "Action failed."
                    if let data = data, let dict = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                       let msg = dict["error"] as? String {
                        errorMsg = msg
                    }
                    let alert = UIAlertController(title: "Error", message: errorMsg, preferredStyle: .alert)
                    alert.addAction(UIAlertAction(title: "OK", style: .default))
                    self?.present(alert, animated: true)
                }
            }
        }.resume()
    }

    // ── TableView DataSource & Delegate ──────────────────────────────────────

    func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        return filteredStaff.count
    }

    func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        guard let cell = tableView.dequeueReusableCell(withIdentifier: "StaffCardCell", for: indexPath) as? StaffCardCell else {
            return UITableViewCell()
        }
        let staff = filteredStaff[indexPath.row]
        cell.configure(with: staff, onMore: { [weak self] btn in
            self?.showActionSheet(for: staff, sourceView: btn)
        }, onPhone: { [weak self] in
            if !staff.phone.isEmpty, let url = URL(string: "tel:\(staff.phone)") {
                UIApplication.shared.open(url)
            }
        }, onEmail: { [weak self] in
            if !staff.email.isEmpty, let url = URL(string: "mailto:\(staff.email)") {
                UIApplication.shared.open(url)
            }
        })
        return cell
    }

    private func showActionSheet(for staff: StaffItem, sourceView: UIView) {
        let sheet = UIAlertController(title: staff.name, message: "\(staff.employeeId) • \(staff.position)", preferredStyle: .actionSheet)

        sheet.addAction(UIAlertAction(title: "Edit Details", style: .default, handler: { [weak self] _ in
            self?.didTapEditStaff(staff)
        }))

        sheet.addAction(UIAlertAction(title: "View Activity Log", style: .default, handler: { [weak self] _ in
            self?.didTapViewActivity(staff)
        }))

        sheet.addAction(UIAlertAction(title: "Reset Password", style: .default, handler: { [weak self] _ in
            self?.didTapResetPassword(staff)
        }))

        let toggleTitle = staff.isActive ? "Suspend Access" : "Restore Access"
        sheet.addAction(UIAlertAction(title: toggleTitle, style: staff.isActive ? .destructive : .default, handler: { [weak self] _ in
            self?.didTapToggleStatus(staff)
        }))

        sheet.addAction(UIAlertAction(title: "Remove Staff", style: .destructive, handler: { [weak self] _ in
            self?.didTapRemoveStaff(staff)
        }))

        sheet.addAction(UIAlertAction(title: "Cancel", style: .cancel))

        if let popover = sheet.popoverPresentationController {
            popover.sourceView = sourceView
            popover.sourceRect = sourceView.bounds
        }

        present(sheet, animated: true)
    }
}

// MARK: - StaffCardCell

class StaffCardCell: UITableViewCell {

    private let cardView        = UIView()
    private let avatarBox       = UIView()
    private let avatarLbl       = UILabel()
    private let nameLbl         = UILabel()
    private let idBadge         = UILabel()
    private let statusBadge     = UILabel()
    private let moreBtn         = UIButton(type: .system)
    private let positionLbl     = UILabel()
    private let roleBadge       = UILabel()
    private let branchPill      = UILabel()
    private let emailBtn        = UIButton(type: .system)
    private let phoneBtn        = UIButton(type: .system)
    private let footerLbl       = UILabel()

    private var moreHandler: ((UIView) -> Void)?
    private var phoneHandler: (() -> Void)?
    private var emailHandler: (() -> Void)?

    override init(style: UITableViewCell.CellStyle, reuseIdentifier: String?) {
        super.init(style: style, reuseIdentifier: reuseIdentifier)
        backgroundColor = .clear
        selectionStyle = .none
        setupViews()
    }

    required init?(coder: NSCoder) { fatalError() }

    private func setupViews() {
        cardView.backgroundColor = .white
        cardView.layer.cornerRadius = 16
        cardView.layer.borderWidth = 1
        cardView.layer.borderColor = UIColor(red: 0.92, green: 0.94, blue: 0.97, alpha: 1).cgColor
        cardView.layer.shadowColor = UIColor(red: 0.05, green: 0.15, blue: 0.30, alpha: 1).cgColor
        cardView.layer.shadowOpacity = 0.04
        cardView.layer.shadowRadius = 4
        cardView.layer.shadowOffset = CGSize(width: 0, height: 2)
        cardView.translatesAutoresizingMaskIntoConstraints = false
        contentView.addSubview(cardView)

        avatarBox.layer.cornerRadius = 20
        avatarBox.clipsToBounds = true
        avatarBox.translatesAutoresizingMaskIntoConstraints = false
        cardView.addSubview(avatarBox)

        avatarLbl.font = .systemFont(ofSize: 16, weight: .bold)
        avatarLbl.textAlignment = .center
        avatarLbl.translatesAutoresizingMaskIntoConstraints = false
        avatarBox.addSubview(avatarLbl)

        nameLbl.font = .systemFont(ofSize: 15, weight: .bold)
        nameLbl.textColor = UIColor(red: 0.059, green: 0.090, blue: 0.165, alpha: 1)
        nameLbl.translatesAutoresizingMaskIntoConstraints = false
        cardView.addSubview(nameLbl)

        idBadge.font = .monospacedSystemFont(ofSize: 10.5, weight: .bold)
        idBadge.textColor = UIColor(red: 0.28, green: 0.33, blue: 0.41, alpha: 1)
        idBadge.backgroundColor = UIColor(red: 0.94, green: 0.96, blue: 0.98, alpha: 1)
        idBadge.layer.cornerRadius = 4
        idBadge.clipsToBounds = true
        idBadge.translatesAutoresizingMaskIntoConstraints = false
        cardView.addSubview(idBadge)

        statusBadge.font = .systemFont(ofSize: 10.5, weight: .bold)
        statusBadge.layer.cornerRadius = 8
        statusBadge.clipsToBounds = true
        statusBadge.translatesAutoresizingMaskIntoConstraints = false
        cardView.addSubview(statusBadge)

        moreBtn.setImage(UIImage(systemName: "ellipsis"), for: .normal)
        moreBtn.tintColor = UIColor(red: 0.39, green: 0.45, blue: 0.55, alpha: 1)
        moreBtn.addTarget(self, action: #selector(didTapMore), for: .touchUpInside)
        moreBtn.translatesAutoresizingMaskIntoConstraints = false
        cardView.addSubview(moreBtn)

        let sep1 = UIView()
        sep1.backgroundColor = UIColor(red: 0.95, green: 0.96, blue: 0.98, alpha: 1)
        sep1.translatesAutoresizingMaskIntoConstraints = false
        cardView.addSubview(sep1)

        positionLbl.font = .systemFont(ofSize: 12.5, weight: .bold)
        positionLbl.textColor = UIColor(red: 0.20, green: 0.25, blue: 0.33, alpha: 1)
        positionLbl.translatesAutoresizingMaskIntoConstraints = false
        cardView.addSubview(positionLbl)

        roleBadge.font = .systemFont(ofSize: 9.5, weight: .bold)
        roleBadge.textColor = UIColor(red: 0.39, green: 0.45, blue: 0.55, alpha: 1)
        roleBadge.translatesAutoresizingMaskIntoConstraints = false
        cardView.addSubview(roleBadge)

        branchPill.font = .systemFont(ofSize: 11, weight: .bold)
        branchPill.textColor = UIColor(red: 0.20, green: 0.25, blue: 0.33, alpha: 1)
        branchPill.backgroundColor = UIColor(red: 0.94, green: 0.96, blue: 0.98, alpha: 1)
        branchPill.layer.cornerRadius = 6
        branchPill.clipsToBounds = true
        branchPill.translatesAutoresizingMaskIntoConstraints = false
        cardView.addSubview(branchPill)

        emailBtn.titleLabel?.font = .systemFont(ofSize: 11.5, weight: .medium)
        emailBtn.setTitleColor(UIColor(red: 0.39, green: 0.45, blue: 0.55, alpha: 1), for: .normal)
        emailBtn.setImage(UIImage(systemName: "envelope.fill"), for: .normal)
        emailBtn.tintColor = UIColor(red: 0.58, green: 0.64, blue: 0.72, alpha: 1)
        emailBtn.imageEdgeInsets = UIEdgeInsets(top: 0, left: -4, bottom: 0, right: 4)
        emailBtn.contentHorizontalAlignment = .leading
        emailBtn.addTarget(self, action: #selector(didTapEmail), for: .touchUpInside)
        emailBtn.translatesAutoresizingMaskIntoConstraints = false
        cardView.addSubview(emailBtn)

        phoneBtn.titleLabel?.font = .systemFont(ofSize: 11.5, weight: .bold)
        phoneBtn.setTitleColor(UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1), for: .normal)
        phoneBtn.setImage(UIImage(systemName: "phone.fill"), for: .normal)
        phoneBtn.tintColor = UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1)
        phoneBtn.imageEdgeInsets = UIEdgeInsets(top: 0, left: -4, bottom: 0, right: 4)
        phoneBtn.contentHorizontalAlignment = .trailing
        phoneBtn.addTarget(self, action: #selector(didTapPhone), for: .touchUpInside)
        phoneBtn.translatesAutoresizingMaskIntoConstraints = false
        cardView.addSubview(phoneBtn)

        footerLbl.font = .systemFont(ofSize: 10.5, weight: .medium)
        footerLbl.textColor = UIColor(red: 0.58, green: 0.64, blue: 0.72, alpha: 1)
        footerLbl.translatesAutoresizingMaskIntoConstraints = false
        cardView.addSubview(footerLbl)

        NSLayoutConstraint.activate([
            cardView.topAnchor.constraint(equalTo: contentView.topAnchor, constant: 5),
            cardView.bottomAnchor.constraint(equalTo: contentView.bottomAnchor, constant: -5),
            cardView.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 14),
            cardView.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -14),

            avatarBox.leadingAnchor.constraint(equalTo: cardView.leadingAnchor, constant: 12),
            avatarBox.topAnchor.constraint(equalTo: cardView.topAnchor, constant: 12),
            avatarBox.widthAnchor.constraint(equalToConstant: 40),
            avatarBox.heightAnchor.constraint(equalToConstant: 40),

            avatarLbl.centerXAnchor.constraint(equalTo: avatarBox.centerXAnchor),
            avatarLbl.centerYAnchor.constraint(equalTo: avatarBox.centerYAnchor),

            nameLbl.leadingAnchor.constraint(equalTo: avatarBox.trailingAnchor, constant: 10),
            nameLbl.topAnchor.constraint(equalTo: cardView.topAnchor, constant: 12),
            nameLbl.trailingAnchor.constraint(lessThanOrEqualTo: statusBadge.leadingAnchor, constant: -6),

            idBadge.leadingAnchor.constraint(equalTo: nameLbl.leadingAnchor),
            idBadge.topAnchor.constraint(equalTo: nameLbl.bottomAnchor, constant: 3),

            moreBtn.trailingAnchor.constraint(equalTo: cardView.trailingAnchor, constant: -8),
            moreBtn.centerYAnchor.constraint(equalTo: avatarBox.centerYAnchor),
            moreBtn.widthAnchor.constraint(equalToConstant: 32),
            moreBtn.heightAnchor.constraint(equalToConstant: 32),

            statusBadge.trailingAnchor.constraint(equalTo: moreBtn.leadingAnchor, constant: -4),
            statusBadge.centerYAnchor.constraint(equalTo: avatarBox.centerYAnchor),

            sep1.topAnchor.constraint(equalTo: avatarBox.bottomAnchor, constant: 10),
            sep1.leadingAnchor.constraint(equalTo: cardView.leadingAnchor, constant: 12),
            sep1.trailingAnchor.constraint(equalTo: cardView.trailingAnchor, constant: -12),
            sep1.heightAnchor.constraint(equalToConstant: 1),

            positionLbl.leadingAnchor.constraint(equalTo: cardView.leadingAnchor, constant: 12),
            positionLbl.topAnchor.constraint(equalTo: sep1.bottomAnchor, constant: 8),

            roleBadge.leadingAnchor.constraint(equalTo: positionLbl.leadingAnchor),
            roleBadge.topAnchor.constraint(equalTo: positionLbl.bottomAnchor, constant: 2),

            branchPill.trailingAnchor.constraint(equalTo: cardView.trailingAnchor, constant: -12),
            branchPill.centerYAnchor.constraint(equalTo: positionLbl.centerYAnchor),

            emailBtn.leadingAnchor.constraint(equalTo: cardView.leadingAnchor, constant: 12),
            emailBtn.topAnchor.constraint(equalTo: roleBadge.bottomAnchor, constant: 8),
            emailBtn.trailingAnchor.constraint(lessThanOrEqualTo: phoneBtn.leadingAnchor, constant: -8),

            phoneBtn.trailingAnchor.constraint(equalTo: cardView.trailingAnchor, constant: -12),
            phoneBtn.centerYAnchor.constraint(equalTo: emailBtn.centerYAnchor),

            footerLbl.leadingAnchor.constraint(equalTo: cardView.leadingAnchor, constant: 12),
            footerLbl.topAnchor.constraint(equalTo: emailBtn.bottomAnchor, constant: 6),
            footerLbl.trailingAnchor.constraint(equalTo: cardView.trailingAnchor, constant: -12),
            footerLbl.bottomAnchor.constraint(equalTo: cardView.bottomAnchor, constant: -12),
        ])
    }

    func configure(with staff: StaffItem, onMore: @escaping (UIView) -> Void, onPhone: @escaping () -> Void, onEmail: @escaping () -> Void) {
        self.moreHandler = onMore
        self.phoneHandler = onPhone
        self.emailHandler = onEmail

        avatarLbl.text = String(staff.name.prefix(1)).uppercased()
        let r = staff.role.uppercased()
        if r.contains("DOC") || r.contains("PATH") {
            avatarBox.backgroundColor = UIColor(red: 0.88, green: 0.95, blue: 1.0, alpha: 1)
            avatarLbl.textColor = UIColor(red: 0.01, green: 0.52, blue: 0.78, alpha: 1)
        } else if r.contains("TECH") {
            avatarBox.backgroundColor = UIColor(red: 0.95, green: 0.90, blue: 1.0, alpha: 1)
            avatarLbl.textColor = UIColor(red: 0.49, green: 0.23, blue: 0.93, alpha: 1)
        } else if r.contains("RECEP") {
            avatarBox.backgroundColor = UIColor(red: 1.0, green: 0.95, blue: 0.88, alpha: 1)
            avatarLbl.textColor = UIColor(red: 0.85, green: 0.47, blue: 0.02, alpha: 1)
        } else {
            avatarBox.backgroundColor = UIColor(red: 0.937, green: 0.965, blue: 1.0, alpha: 1)
            avatarLbl.textColor = UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1)
        }

        nameLbl.text = staff.name
        idBadge.text = "  \(staff.employeeId)  "

        if staff.isActive {
            statusBadge.text = "  ● Active  "
            statusBadge.textColor = UIColor(red: 0.02, green: 0.59, blue: 0.41, alpha: 1)
            statusBadge.backgroundColor = UIColor(red: 0.93, green: 0.99, blue: 0.96, alpha: 1)
        } else {
            statusBadge.text = "  ● Suspended  "
            statusBadge.textColor = UIColor(red: 0.86, green: 0.15, blue: 0.15, alpha: 1)
            statusBadge.backgroundColor = UIColor(red: 1.0, green: 0.95, blue: 0.95, alpha: 1)
        }

        positionLbl.text = staff.position
        roleBadge.text = staff.role.replacingOccurrences(of: "_", with: " ")
        branchPill.text = "  🏢 \(staff.branchName)  "

        emailBtn.setTitle(staff.email.isEmpty ? "No email" : staff.email, for: .normal)
        phoneBtn.setTitle(staff.phone.isEmpty ? "No phone" : staff.phone, for: .normal)

        var footerParts: [String] = []
        if !staff.department.isEmpty { footerParts.append("Dept: \(staff.department)") }
        if staff.salary > 0 { footerParts.append("Salary: ₹\(Int(staff.salary))/mo") }
        footerLbl.text = footerParts.joined(separator: "  •  ")
        footerLbl.isHidden = footerParts.isEmpty
    }

    @objc private func didTapMore() { moreHandler?(moreBtn) }
    @objc private func didTapPhone() { phoneHandler?() }
    @objc private func didTapEmail() { emailHandler?() }
}

// MARK: - StaffAddEditViewController (Modal Sheet)

class StaffAddEditViewController: UIViewController, UIPickerViewDataSource, UIPickerViewDelegate {

    private let staff: StaffItem?
    private let branches: [StaffBranchItem]
    private let onSaved: () -> Void

    private let roles = ["TECHNICIAN", "RECEPTIONIST", "DOCTOR", "LAB_MANAGER"]
    private let roleLabels = ["Technician", "Receptionist", "Doctor / Pathologist", "Lab Manager"]

    private let nameField = UITextField()
    private let phoneField = UITextField()
    private let emailField = UITextField()
    private let roleField = UITextField()
    private let positionField = UITextField()
    private let branchField = UITextField()
    private let departmentField = UITextField()
    private let salaryField = UITextField()
    private let passwordField = UITextField()

    private let rolePicker = UIPickerView()
    private let branchPicker = UIPickerView()
    private var selectedRoleIndex = 0
    private var selectedBranchIndex = 0

    init(staff: StaffItem?, branches: [StaffBranchItem], onSaved: @escaping () -> Void) {
        self.staff = staff
        self.branches = branches.isEmpty ? [StaffBranchItem(id: "", name: "Main Branch", branchCode: "01")] : branches
        self.onSaved = onSaved
        super.init(nibName: nil, bundle: nil)
    }

    required init?(coder: NSCoder) { fatalError() }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .white
        setupForm()
    }

    private func setupForm() {
        let titleLbl = UILabel()
        titleLbl.text = staff == nil ? "Add Staff Member" : "Edit Staff Details"
        titleLbl.font = .systemFont(ofSize: 18, weight: .bold)
        titleLbl.textColor = UIColor(red: 0.059, green: 0.090, blue: 0.165, alpha: 1)

        let cancelBtn = UIButton(type: .system)
        cancelBtn.setTitle("Cancel", for: .normal)
        cancelBtn.setTitleColor(UIColor(red: 0.39, green: 0.45, blue: 0.55, alpha: 1), for: .normal)
        cancelBtn.titleLabel?.font = .systemFont(ofSize: 14, weight: .bold)
        cancelBtn.addTarget(self, action: #selector(didTapCancel), for: .touchUpInside)

        let saveBtn = UIButton(type: .system)
        saveBtn.setTitle(staff == nil ? "Create" : "Save", for: .normal)
        saveBtn.setTitleColor(.white, for: .normal)
        saveBtn.titleLabel?.font = .systemFont(ofSize: 14, weight: .bold)
        saveBtn.backgroundColor = UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1)
        saveBtn.layer.cornerRadius = 8
        saveBtn.contentEdgeInsets = UIEdgeInsets(top: 6, left: 16, bottom: 6, right: 16)
        saveBtn.addTarget(self, action: #selector(didTapSave), for: .touchUpInside)

        [titleLbl, cancelBtn, saveBtn].forEach {
            $0.translatesAutoresizingMaskIntoConstraints = false
            view.addSubview($0)
        }

        let scrollView = UIScrollView()
        scrollView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(scrollView)

        let stack = UIStackView()
        stack.axis = .vertical
        stack.spacing = 12
        stack.translatesAutoresizingMaskIntoConstraints = false
        scrollView.addSubview(stack)

        NSLayoutConstraint.activate([
            cancelBtn.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 16),
            cancelBtn.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 16),

            titleLbl.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            titleLbl.centerYAnchor.constraint(equalTo: cancelBtn.centerYAnchor),

            saveBtn.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -16),
            saveBtn.centerYAnchor.constraint(equalTo: cancelBtn.centerYAnchor),

            scrollView.topAnchor.constraint(equalTo: titleLbl.bottomAnchor, constant: 16),
            scrollView.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 16),
            scrollView.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -16),
            scrollView.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -10),

            stack.topAnchor.constraint(equalTo: scrollView.topAnchor),
            stack.bottomAnchor.constraint(equalTo: scrollView.bottomAnchor),
            stack.leadingAnchor.constraint(equalTo: scrollView.leadingAnchor),
            stack.trailingAnchor.constraint(equalTo: scrollView.trailingAnchor),
            stack.widthAnchor.constraint(equalTo: scrollView.widthAnchor),
        ])

        // Add Input Rows
        stack.addArrangedSubview(makeFieldRow(title: "FULL NAME *", field: nameField, placeholder: "Dr. Jane Doe"))
        stack.addArrangedSubview(makeFieldRow(title: "PHONE *", field: phoneField, placeholder: "9876543210", keyboard: .phonePad))

        if staff == nil {
            stack.addArrangedSubview(makeFieldRow(title: "EMAIL (LOGIN ID) *", field: emailField, placeholder: "staff@patholab.cloud", keyboard: .emailAddress))
        }

        // Role Picker
        rolePicker.dataSource = self
        rolePicker.delegate = self
        rolePicker.tag = 1
        roleField.inputView = rolePicker
        stack.addArrangedSubview(makeFieldRow(title: "SYSTEM ROLE *", field: roleField, placeholder: "Select Role"))

        // Position
        stack.addArrangedSubview(makeFieldRow(title: "POSITION TITLE *", field: positionField, placeholder: "e.g. Senior Biochemist"))

        // Branch Picker
        branchPicker.dataSource = self
        branchPicker.delegate = self
        branchPicker.tag = 2
        branchField.inputView = branchPicker
        stack.addArrangedSubview(makeFieldRow(title: "BRANCH ASSIGNMENT", field: branchField, placeholder: "Select Branch"))

        // Department & Salary
        stack.addArrangedSubview(makeFieldRow(title: "DEPARTMENT", field: departmentField, placeholder: "e.g. Pathology"))
        stack.addArrangedSubview(makeFieldRow(title: "MONTHLY SALARY (₹)", field: salaryField, placeholder: "e.g. 35000", keyboard: .numberPad))

        if staff == nil {
            stack.addArrangedSubview(makeFieldRow(title: "CUSTOM PASSWORD (OPTIONAL)", field: passwordField, placeholder: "Leave blank for Password@123", isSecure: true))
        }

        // Hydrate Form Data
        if let s = staff {
            nameField.text = s.name
            phoneField.text = s.phone
            positionField.text = s.position
            departmentField.text = s.department
            if s.salary > 0 { salaryField.text = "\(Int(s.salary))" }

            if let idx = roles.firstIndex(of: s.role) {
                selectedRoleIndex = idx
                roleField.text = roleLabels[idx]
                rolePicker.selectRow(idx, inComponent: 0, animated: false)
            }

            if let bIdx = branches.firstIndex(where: { $0.id == s.branchId }) {
                selectedBranchIndex = bIdx
                branchField.text = branches[bIdx].name
                branchPicker.selectRow(bIdx, inComponent: 0, animated: false)
            } else {
                branchField.text = branches.first?.name ?? "Main Branch"
            }
        } else {
            roleField.text = roleLabels.first
            branchField.text = branches.first?.name ?? "Main Branch"
        }
    }

    private func makeFieldRow(title: String, field: UITextField, placeholder: String, keyboard: UIKeyboardType = .default, isSecure: Bool = false) -> UIView {
        let container = UIView()
        let lbl = UILabel()
        lbl.text = title
        lbl.font = .systemFont(ofSize: 10.5, weight: .bold)
        lbl.textColor = UIColor(red: 0.39, green: 0.45, blue: 0.55, alpha: 1)
        lbl.translatesAutoresizingMaskIntoConstraints = false
        container.addSubview(lbl)

        field.placeholder = placeholder
        field.font = .systemFont(ofSize: 14, weight: .medium)
        field.textColor = UIColor(red: 0.059, green: 0.090, blue: 0.165, alpha: 1)
        field.backgroundColor = UIColor(red: 0.97, green: 0.98, blue: 0.99, alpha: 1)
        field.layer.cornerRadius = 10
        field.layer.borderWidth = 1
        field.layer.borderColor = UIColor(red: 0.90, green: 0.92, blue: 0.95, alpha: 1).cgColor
        field.keyboardType = keyboard
        field.isSecureTextEntry = isSecure
        let pad = UIView(frame: CGRect(x: 0, y: 0, width: 12, height: 42))
        field.leftView = pad
        field.leftViewMode = .always
        field.translatesAutoresizingMaskIntoConstraints = false
        container.addSubview(field)

        NSLayoutConstraint.activate([
            lbl.topAnchor.constraint(equalTo: container.topAnchor),
            lbl.leadingAnchor.constraint(equalTo: container.leadingAnchor),

            field.topAnchor.constraint(equalTo: lbl.bottomAnchor, constant: 4),
            field.leadingAnchor.constraint(equalTo: container.leadingAnchor),
            field.trailingAnchor.constraint(equalTo: container.trailingAnchor),
            field.heightAnchor.constraint(equalToConstant: 42),
            field.bottomAnchor.constraint(equalTo: container.bottomAnchor),
        ])

        return container
    }

    // Picker View DataSource & Delegate
    func numberOfComponents(in pickerView: UIPickerView) -> Int { 1 }

    func pickerView(_ pickerView: UIPickerView, numberOfRowsInComponent component: Int) -> Int {
        return pickerView.tag == 1 ? roles.count : branches.count
    }

    func pickerView(_ pickerView: UIPickerView, titleForRow row: Int, forComponent component: Int) -> String? {
        return pickerView.tag == 1 ? roleLabels[row] : branches[row].name
    }

    func pickerView(_ pickerView: UIPickerView, didSelectRow row: Int, inComponent component: Int) {
        if pickerView.tag == 1 {
            selectedRoleIndex = row
            roleField.text = roleLabels[row]
        } else {
            selectedBranchIndex = row
            branchField.text = branches[row].name
        }
    }

    @objc private func didTapCancel() { dismiss(animated: true) }

    @objc private func didTapSave() {
        let name = nameField.text?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        let phone = phoneField.text?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        let email = emailField.text?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        let role = roles[selectedRoleIndex]
        let position = positionField.text?.trimmingCharacters(in: .whitespacesAndNewlines) ?? role
        let dept = departmentField.text?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        let salaryStr = salaryField.text?.trimmingCharacters(in: .whitespacesAndNewlines) ?? "0"
        let salary = Double(salaryStr) ?? 0.0
        let branchId = branches[selectedBranchIndex].id.isEmpty ? nil : branches[selectedBranchIndex].id
        let password = passwordField.text?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""

        if name.count < 2 {
            showAlert("Please enter a valid full name.")
            return
        }
        if phone.count < 10 {
            showAlert("Please enter a valid 10-digit phone number.")
            return
        }
        if staff == nil && (email.isEmpty || !email.contains("@")) {
            showAlert("Please enter a valid email address.")
            return
        }

        let isEdit = staff != nil
        var payload: [String: Any] = [
            "name": name,
            "phone": phone,
            "role": role,
            "position": position.isEmpty ? role : position,
            "department": dept,
            "salary": salary,
        ]
        if let bId = branchId { payload["branchId"] = bId }

        if isEdit, let s = staff {
            payload["action"] = "UPDATE_DETAILS"
            payload["staffId"] = s.staffId
            payload["userId"] = s.userId
        } else {
            payload["email"] = email
            if !password.isEmpty { payload["password"] = password }
        }

        guard let url = URL(string: "https://patholab.cloud/api/workspace/staff") else { return }
        var req = URLRequest(url: url)
        req.httpMethod = isEdit ? "PATCH" : "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let token = UserDefaults.standard.string(forKey: "auth_token") {
            req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            req.setValue("token=\(token)", forHTTPHeaderField: "Cookie")
        }
        req.httpBody = try? JSONSerialization.data(withJSONObject: payload)

        URLSession.shared.dataTask(with: req) { [weak self] data, resp, err in
            DispatchQueue.main.async {
                if let http = resp as? HTTPURLResponse, (http.statusCode == 200 || http.statusCode == 201) {
                    self?.dismiss(animated: true) {
                        self?.onSaved()
                    }
                } else {
                    var errorMsg = "Operation failed."
                    if let data = data, let dict = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                       let msg = dict["error"] as? String {
                        errorMsg = msg
                    }
                    self?.showAlert(errorMsg)
                }
            }
        }.resume()
    }

    private func showAlert(_ msg: String) {
        let alert = UIAlertController(title: "Alert", message: msg, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "OK", style: .default))
        present(alert, animated: true)
    }
}

// MARK: - StaffActivityLogViewController (Modal Sheet)

class StaffActivityLogViewController: UIViewController, UITableViewDataSource, UITableViewDelegate {

    private let staff: StaffItem
    private var logs: [StaffActivityLogItem] = []
    private let tableView = UITableView()
    private let spinner = UIActivityIndicatorView(style: .medium)
    private let emptyLbl = UILabel()

    init(staff: StaffItem) {
        self.staff = staff
        super.init(nibName: nil, bundle: nil)
    }

    required init?(coder: NSCoder) { fatalError() }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .white
        setupViews()
        fetchActivityLogs()
    }

    private func setupViews() {
        let titleLbl = UILabel()
        titleLbl.text = "Activity Log"
        titleLbl.font = .systemFont(ofSize: 18, weight: .bold)
        titleLbl.textColor = UIColor(red: 0.059, green: 0.090, blue: 0.165, alpha: 1)

        let subLbl = UILabel()
        subLbl.text = "Recent telemetry for \(staff.name)"
        subLbl.font = .systemFont(ofSize: 12, weight: .medium)
        subLbl.textColor = UIColor(red: 0.39, green: 0.45, blue: 0.55, alpha: 1)

        let closeBtn = UIButton(type: .system)
        closeBtn.setImage(UIImage(systemName: "xmark.circle.fill"), for: .normal)
        closeBtn.tintColor = UIColor(red: 0.58, green: 0.64, blue: 0.72, alpha: 1)
        closeBtn.addTarget(self, action: #selector(didTapClose), for: .touchUpInside)

        [titleLbl, subLbl, closeBtn, tableView, spinner, emptyLbl].forEach {
            $0.translatesAutoresizingMaskIntoConstraints = false
            view.addSubview($0)
        }

        tableView.backgroundColor = .clear
        tableView.separatorStyle = .none
        tableView.dataSource = self
        tableView.delegate = self
        tableView.register(UITableViewCell.self, forCellReuseIdentifier: "LogCell")

        emptyLbl.text = "No activity recorded yet."
        emptyLbl.font = .systemFont(ofSize: 13.5, weight: .medium)
        emptyLbl.textColor = UIColor(red: 0.58, green: 0.64, blue: 0.72, alpha: 1)
        emptyLbl.textAlignment = .center
        emptyLbl.isHidden = true

        NSLayoutConstraint.activate([
            closeBtn.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -16),
            closeBtn.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 16),
            closeBtn.widthAnchor.constraint(equalToConstant: 28),
            closeBtn.heightAnchor.constraint(equalToConstant: 28),

            titleLbl.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 16),
            titleLbl.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 16),

            subLbl.leadingAnchor.constraint(equalTo: titleLbl.leadingAnchor),
            subLbl.topAnchor.constraint(equalTo: titleLbl.bottomAnchor, constant: 2),

            tableView.topAnchor.constraint(equalTo: subLbl.bottomAnchor, constant: 16),
            tableView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            tableView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            tableView.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor),

            spinner.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            spinner.centerYAnchor.constraint(equalTo: view.centerYAnchor),

            emptyLbl.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            emptyLbl.centerYAnchor.constraint(equalTo: view.centerYAnchor),
        ])
    }

    @objc private func didTapClose() { dismiss(animated: true) }

    private func fetchActivityLogs() {
        spinner.startAnimating()
        guard let url = URL(string: "https://patholab.cloud/api/workspace/staff/\(staff.userId)/activity") else { return }
        var req = URLRequest(url: url)
        req.httpMethod = "GET"
        if let token = UserDefaults.standard.string(forKey: "auth_token") {
            req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            req.setValue("token=\(token)", forHTTPHeaderField: "Cookie")
        }

        URLSession.shared.dataTask(with: req) { [weak self] data, _, _ in
            DispatchQueue.main.async {
                self?.spinner.stopAnimating()
            }
            guard let data = data,
                  let arr = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]] else {
                DispatchQueue.main.async { self?.emptyLbl.isHidden = false }
                return
            }

            var loaded: [StaffActivityLogItem] = []
            let isoFmt = ISO8601DateFormatter()
            let outFmt = DateFormatter()
            outFmt.dateFormat = "MMM dd, h:mm a"

            for l in arr {
                let id = l["id"] as? String ?? ""
                let action = (l["action"] as? String ?? "ACTION").replacingOccurrences(of: "_", with: " ")
                let desc = l["description"] as? String ?? "No description"
                let createdStr = l["createdAt"] as? String ?? ""
                var dateFormatted = "Recently"
                if let d = isoFmt.date(from: createdStr) {
                    dateFormatted = outFmt.string(from: d)
                }

                loaded.append(StaffActivityLogItem(id: id, action: action, description: desc, formattedDate: dateFormatted))
            }

            DispatchQueue.main.async {
                self?.logs = loaded
                self?.tableView.reloadData()
                self?.emptyLbl.isHidden = !loaded.isEmpty
            }
        }.resume()
    }

    func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        return logs.count
    }

    func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let cell = UITableViewCell(style: .subtitle, reuseIdentifier: "LogCell")
        cell.backgroundColor = .clear
        cell.selectionStyle = .none

        let item = logs[indexPath.row]
        cell.textLabel?.text = "⚡ \(item.action)   •   \(item.formattedDate)"
        cell.textLabel?.font = .systemFont(ofSize: 12, weight: .bold)
        cell.textLabel?.textColor = UIColor(red: 0.059, green: 0.090, blue: 0.165, alpha: 1)

        cell.detailTextLabel?.text = item.description
        cell.detailTextLabel?.font = .systemFont(ofSize: 11.5, weight: .medium)
        cell.detailTextLabel?.textColor = UIColor(red: 0.39, green: 0.45, blue: 0.55, alpha: 1)
        cell.detailTextLabel?.numberOfLines = 0

        return cell
    }
}
