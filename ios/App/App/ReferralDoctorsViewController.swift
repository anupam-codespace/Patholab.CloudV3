import UIKit

/**
 * ReferralDoctorsViewController
 * ─────────────────────────────────────────────────────────────────────────────
 * Native dedicated Referral Doctors & Margin Management Console (iOS).
 * Full feature parity with web module (/workspace/doctors):
 *  - Fused Sapphire Header with back, title, subtitle & refresh actions
 *  - 4 Real-time KPI Metric cards (Active Doctors, Total Referrals, Billed Volume, Unsettled Due)
 *  - Search Omnibar & Specialization Filter Chips
 *  - Interactive Doctor cards with registration no, clinic, specialization badge & financial bento
 *  - Direct Phone dialer & WhatsApp messenger integration
 *  - Doctor referral ledger & prescribed tests modal sheet
 *  - In-app Add & Edit Referral Doctor modal sheet
 *  - Delete Doctor with confirmation dialog
 */
class ReferralDoctorsViewController: UIViewController, UITextFieldDelegate, UITableViewDelegate, UITableViewDataSource {

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
    private let kpiTotalCountLbl   = UILabel()
    private let kpiReferralsCountLbl = UILabel()
    private let kpiBilledVolumeLbl = UILabel()
    private let kpiPendingCommLbl  = UILabel()

    // ── Search Omnibar ──
    private let searchContainer    = UIView()
    private let searchField        = UITextField()
    private let clearSearchBtn     = UIButton(type: .system)

    // ── Filter Chips ──
    private let filterScrollView   = UIScrollView()
    private let filterStackView    = UIStackView()

    // ── TableView & Empty State ──
    private let tableView          = UITableView(frame: .zero, style: .plain)
    private let refreshControl     = UIRefreshControl()
    private let emptyView          = UIView()
    private let loadingIndicator   = UIActivityIndicatorView(style: .medium)

    // ── Floating Action Button ──
    private let fabAddDoctor       = UIButton(type: .system)

    // ── Data & State ──
    private var allDoctors: [[String: Any]] = []
    private var filteredDoctors: [[String: Any]] = []
    private var currentSpecializationFilter: String = "ALL"
    private var searchQuery: String = ""

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 0.973, green: 0.980, blue: 0.988, alpha: 1) // #F8FAFC

        setupHeroHeader()
        setupKpis()
        setupSearchOmnibar()
        setupFilterChips()
        setupTableView()
        setupEmptyView()
        setupFab()

        loadDoctorsData(isManual: false)
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
            UIColor(red: 0.039, green: 0.345, blue: 0.792, alpha: 1).cgColor, // #0A58CA
            UIColor(red: 0.114, green: 0.306, blue: 0.847, alpha: 1).cgColor  // #1D4ED8
        ]
        heroGradientLayer.startPoint = CGPoint(x: 0, y: 0)
        heroGradientLayer.endPoint   = CGPoint(x: 1, y: 1)
        heroHeaderView.layer.insertSublayer(heroGradientLayer, at: 0)
        heroHeaderView.layer.cornerRadius = 28
        heroHeaderView.layer.maskedCorners = [.layerMinXMaxYCorner, .layerMaxXMaxYCorner]
        heroHeaderView.clipsToBounds = true

        backBtn.translatesAutoresizingMaskIntoConstraints = false
        backBtn.setImage(UIImage(systemName: "chevron.left"), for: .normal)
        backBtn.tintColor = .white
        backBtn.backgroundColor = UIColor.white.withAlphaComponent(0.20)
        backBtn.layer.borderColor = UIColor.white.withAlphaComponent(0.30).cgColor
        backBtn.layer.borderWidth = 1
        backBtn.layer.cornerRadius = 19
        backBtn.addTarget(self, action: #selector(backTapped), for: .touchUpInside)
        heroHeaderView.addSubview(backBtn)

        titleLabel.translatesAutoresizingMaskIntoConstraints = false
        titleLabel.text = "Referral Doctors"
        titleLabel.font = .systemFont(ofSize: 20, weight: .bold)
        titleLabel.textColor = .white
        heroHeaderView.addSubview(titleLabel)

        subtitleLabel.translatesAutoresizingMaskIntoConstraints = false
        subtitleLabel.text = "Manage prescribing doctors, margins & commissions"
        subtitleLabel.font = .systemFont(ofSize: 11.5, weight: .medium)
        subtitleLabel.textColor = UIColor(red: 0.780, green: 0.875, blue: 1.0, alpha: 1)
        heroHeaderView.addSubview(subtitleLabel)

        refreshBtn.translatesAutoresizingMaskIntoConstraints = false
        refreshBtn.setImage(UIImage(systemName: "arrow.clockwise"), for: .normal)
        refreshBtn.tintColor = .white
        refreshBtn.backgroundColor = UIColor.white.withAlphaComponent(0.20)
        refreshBtn.layer.borderColor = UIColor.white.withAlphaComponent(0.30).cgColor
        refreshBtn.layer.borderWidth = 1
        refreshBtn.layer.cornerRadius = 19
        refreshBtn.addTarget(self, action: #selector(refreshTapped), for: .touchUpInside)
        heroHeaderView.addSubview(refreshBtn)

        NSLayoutConstraint.activate([
            heroHeaderView.topAnchor.constraint(equalTo: view.topAnchor),
            heroHeaderView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            heroHeaderView.trailingAnchor.constraint(equalTo: view.trailingAnchor),

            backBtn.leadingAnchor.constraint(equalTo: heroHeaderView.leadingAnchor, constant: 16),
            backBtn.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 12),
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
        heroHeaderView.addSubview(kpiScrollView)

        kpiStackView.translatesAutoresizingMaskIntoConstraints = false
        kpiStackView.axis = .horizontal
        kpiStackView.spacing = 10
        kpiStackView.alignment = .fill
        kpiStackView.distribution = .fillProportionally
        kpiScrollView.addSubview(kpiStackView)

        let card1 = createKpiCard(title: "ACTIVE DOCTORS", subtitle: "Prescribing Network", countLbl: kpiTotalCountLbl, dotColor: UIColor(red: 0.388, green: 0.400, blue: 0.945, alpha: 1)) // Indigo
        let card2 = createKpiCard(title: "TOTAL REFERRALS", subtitle: "Prescribed Tests", countLbl: kpiReferralsCountLbl, dotColor: UIColor(red: 0.063, green: 0.725, blue: 0.506, alpha: 1)) // Emerald
        let card3 = createKpiCard(title: "BILLED VOLUME", subtitle: "Referred Tests", countLbl: kpiBilledVolumeLbl, dotColor: UIColor(red: 0.024, green: 0.714, blue: 0.831, alpha: 1)) // Cyan
        let card4 = createKpiCard(title: "UNSETTLED DUE", subtitle: "Pending Payout", countLbl: kpiPendingCommLbl, dotColor: UIColor(red: 0.961, green: 0.620, blue: 0.043, alpha: 1)) // Amber

        kpiStackView.addArrangedSubview(card1)
        kpiStackView.addArrangedSubview(card2)
        kpiStackView.addArrangedSubview(card3)
        kpiStackView.addArrangedSubview(card4)

        NSLayoutConstraint.activate([
            kpiScrollView.topAnchor.constraint(equalTo: backBtn.bottomAnchor, constant: 14),
            kpiScrollView.leadingAnchor.constraint(equalTo: heroHeaderView.leadingAnchor),
            kpiScrollView.trailingAnchor.constraint(equalTo: heroHeaderView.trailingAnchor),
            kpiScrollView.heightAnchor.constraint(equalToConstant: 80),

            heroHeaderView.bottomAnchor.constraint(equalTo: kpiScrollView.bottomAnchor, constant: 18),

            kpiStackView.topAnchor.constraint(equalTo: kpiScrollView.topAnchor),
            kpiStackView.bottomAnchor.constraint(equalTo: kpiScrollView.bottomAnchor),
            kpiStackView.leadingAnchor.constraint(equalTo: kpiScrollView.leadingAnchor, constant: 16),
            kpiStackView.trailingAnchor.constraint(equalTo: kpiScrollView.trailingAnchor, constant: -16),
            kpiStackView.heightAnchor.constraint(equalTo: kpiScrollView.heightAnchor)
        ])
    }

    private func createKpiCard(title: String, subtitle: String, countLbl: UILabel, dotColor: UIColor) -> UIView {
        let card = UIView()
        card.translatesAutoresizingMaskIntoConstraints = false
        card.backgroundColor = UIColor.white.withAlphaComponent(0.16)
        card.layer.borderColor = UIColor.white.withAlphaComponent(0.25).cgColor
        card.layer.borderWidth = 1
        card.layer.cornerRadius = 16
        card.clipsToBounds = true
        card.widthAnchor.constraint(equalToConstant: 155).isActive = true

        let dot = UIView()
        dot.translatesAutoresizingMaskIntoConstraints = false
        dot.backgroundColor = dotColor
        dot.layer.cornerRadius = 3.5

        let tLbl = UILabel()
        tLbl.translatesAutoresizingMaskIntoConstraints = false
        tLbl.text = title
        tLbl.font = .systemFont(ofSize: 9.5, weight: .bold)
        tLbl.textColor = UIColor(red: 0.780, green: 0.875, blue: 1.0, alpha: 1)

        let topRow = UIStackView(arrangedSubviews: [dot, tLbl])
        topRow.translatesAutoresizingMaskIntoConstraints = false
        topRow.axis = .horizontal
        topRow.alignment = .center
        topRow.spacing = 6

        NSLayoutConstraint.activate([
            dot.widthAnchor.constraint(equalToConstant: 7),
            dot.heightAnchor.constraint(equalToConstant: 7)
        ])

        countLbl.translatesAutoresizingMaskIntoConstraints = false
        countLbl.text = "0"
        countLbl.font = .systemFont(ofSize: 20, weight: .bold)
        countLbl.textColor = .white

        let subLbl = UILabel()
        subLbl.translatesAutoresizingMaskIntoConstraints = false
        subLbl.text = subtitle
        subLbl.font = .systemFont(ofSize: 10.5, weight: .medium)
        subLbl.textColor = UIColor(red: 0.780, green: 0.875, blue: 1.0, alpha: 0.9)

        card.addSubview(topRow)
        card.addSubview(countLbl)
        card.addSubview(subLbl)

        NSLayoutConstraint.activate([
            topRow.topAnchor.constraint(equalTo: card.topAnchor, constant: 11),
            topRow.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 13),
            topRow.trailingAnchor.constraint(lessThanOrEqualTo: card.trailingAnchor, constant: -13),

            countLbl.topAnchor.constraint(equalTo: topRow.bottomAnchor, constant: 4),
            countLbl.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 13),
            countLbl.trailingAnchor.constraint(lessThanOrEqualTo: card.trailingAnchor, constant: -13),

            subLbl.topAnchor.constraint(equalTo: countLbl.bottomAnchor, constant: 2),
            subLbl.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 13),
            subLbl.trailingAnchor.constraint(lessThanOrEqualTo: card.trailingAnchor, constant: -13)
        ])

        return card
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
        searchField.placeholder = "Search doctor, clinic, specialization, reg no..."
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
            searchContainer.topAnchor.constraint(equalTo: heroHeaderView.bottomAnchor, constant: 14),
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

    private func setupFilterChips() {
        filterScrollView.translatesAutoresizingMaskIntoConstraints = false
        filterScrollView.showsHorizontalScrollIndicator = false
        view.addSubview(filterScrollView)

        filterStackView.translatesAutoresizingMaskIntoConstraints = false
        filterStackView.axis = .horizontal
        filterStackView.spacing = 8
        filterScrollView.addSubview(filterStackView)

        let filters = [
            ("ALL", "All Doctors"),
            ("GENERAL", "General Physician"),
            ("CARDIOLOGY", "Cardiology"),
            ("GYNAECOLOGY", "Gynaecology"),
            ("PATHOLOGY", "Pathology"),
            ("PEDIATRICS", "Pediatrics"),
            ("ORTHOPEDICS", "Orthopedics")
        ]

        for (key, title) in filters {
            let chip = UIButton(type: .system)
            chip.setTitle(title, for: .normal)
            chip.titleLabel?.font = .systemFont(ofSize: 12, weight: key == currentSpecializationFilter ? .bold : .medium)
            chip.layer.cornerRadius = 16
            chip.contentEdgeInsets = UIEdgeInsets(top: 6, left: 14, bottom: 6, right: 14)
            chip.tag = key.hashValue
            chip.accessibilityIdentifier = key

            updateChipStyle(chip, isSelected: key == currentSpecializationFilter)
            chip.addTarget(self, action: #selector(chipTapped(_:)), for: .touchUpInside)
            filterStackView.addArrangedSubview(chip)
        }

        NSLayoutConstraint.activate([
            filterScrollView.topAnchor.constraint(equalTo: searchContainer.bottomAnchor, constant: 10),
            filterScrollView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            filterScrollView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            filterScrollView.heightAnchor.constraint(equalToConstant: 32),

            filterStackView.topAnchor.constraint(equalTo: filterScrollView.topAnchor),
            filterStackView.bottomAnchor.constraint(equalTo: filterScrollView.bottomAnchor),
            filterStackView.leadingAnchor.constraint(equalTo: filterScrollView.leadingAnchor, constant: 16),
            filterStackView.trailingAnchor.constraint(equalTo: filterScrollView.trailingAnchor, constant: -16),
            filterStackView.heightAnchor.constraint(equalTo: filterScrollView.heightAnchor)
        ])
    }

    private func updateChipStyle(_ chip: UIButton, isSelected: Bool) {
        if isSelected {
            chip.backgroundColor = UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1)
            chip.setTitleColor(.white, for: .normal)
            chip.layer.borderWidth = 0
        } else {
            chip.backgroundColor = .white
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
        tableView.contentInset = UIEdgeInsets(top: 6, left: 0, bottom: 84, right: 0)
        tableView.register(DoctorCardCell.self, forCellReuseIdentifier: "DoctorCardCell")
        view.addSubview(tableView)

        refreshControl.addTarget(self, action: #selector(pullRefreshed), for: .valueChanged)
        tableView.addSubview(refreshControl)

        loadingIndicator.translatesAutoresizingMaskIntoConstraints = false
        loadingIndicator.hidesWhenStopped = true
        view.addSubview(loadingIndicator)

        NSLayoutConstraint.activate([
            tableView.topAnchor.constraint(equalTo: filterScrollView.bottomAnchor, constant: 8),
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

        let icon = UIImageView(image: UIImage(systemName: "stethoscope"))
        icon.tintColor = UIColor(red: 0.796, green: 0.835, blue: 0.882, alpha: 1)
        icon.contentMode = .scaleAspectFit
        icon.translatesAutoresizingMaskIntoConstraints = false
        emptyView.addSubview(icon)

        let title = UILabel()
        title.text = "No Referral Doctors Found"
        title.font = .systemFont(ofSize: 16, weight: .bold)
        title.textColor = UIColor(red: 0.200, green: 0.255, blue: 0.333, alpha: 1)
        title.translatesAutoresizingMaskIntoConstraints = false
        emptyView.addSubview(title)

        let sub = UILabel()
        sub.text = "Add prescribing physicians and clinics to track referral margins and payouts."
        sub.font = .systemFont(ofSize: 12.5)
        sub.textColor = UIColor(red: 0.392, green: 0.455, blue: 0.545, alpha: 1)
        sub.textAlignment = .center
        sub.numberOfLines = 0
        sub.translatesAutoresizingMaskIntoConstraints = false
        emptyView.addSubview(sub)

        let btn = UIButton(type: .system)
        btn.setTitle("+ Add Referral Doctor", for: .normal)
        btn.titleLabel?.font = .systemFont(ofSize: 13, weight: .bold)
        btn.setTitleColor(.white, for: .normal)
        btn.backgroundColor = UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1)
        btn.layer.cornerRadius = 8
        btn.contentEdgeInsets = UIEdgeInsets(top: 8, left: 16, bottom: 8, right: 16)
        btn.translatesAutoresizingMaskIntoConstraints = false
        btn.addTarget(self, action: #selector(addDoctorTapped), for: .touchUpInside)
        emptyView.addSubview(btn)

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

            btn.topAnchor.constraint(equalTo: sub.bottomAnchor, constant: 16),
            btn.centerXAnchor.constraint(equalTo: emptyView.centerXAnchor),
            btn.bottomAnchor.constraint(equalTo: emptyView.bottomAnchor)
        ])
    }

    private func setupFab() {
        fabAddDoctor.translatesAutoresizingMaskIntoConstraints = false
        fabAddDoctor.setTitle("  + New Doctor", for: .normal)
        fabAddDoctor.titleLabel?.font = .systemFont(ofSize: 13.5, weight: .bold)
        fabAddDoctor.setTitleColor(.white, for: .normal)
        fabAddDoctor.backgroundColor = UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1)
        fabAddDoctor.layer.cornerRadius = 24
        fabAddDoctor.layer.shadowColor = UIColor.black.cgColor
        fabAddDoctor.layer.shadowOpacity = 0.2
        fabAddDoctor.layer.shadowOffset = CGSize(width: 0, height: 4)
        fabAddDoctor.layer.shadowRadius = 6
        fabAddDoctor.contentEdgeInsets = UIEdgeInsets(top: 12, left: 20, bottom: 12, right: 20)
        fabAddDoctor.addTarget(self, action: #selector(addDoctorTapped), for: .touchUpInside)
        view.addSubview(fabAddDoctor)

        NSLayoutConstraint.activate([
            fabAddDoctor.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -18),
            fabAddDoctor.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -18),
            fabAddDoctor.heightAnchor.constraint(equalToConstant: 48)
        ])
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  DATA FETCHING & FILTERING
    // ─────────────────────────────────────────────────────────────────────────
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

    private func loadDoctorsData(isManual: Bool) {
        if !refreshControl.isRefreshing {
            loadingIndicator.startAnimating()
        }

        let token = getAuthToken()
        guard let url = URL(string: "\(Self.baseUrl)/api/workspace/doctors") else {
            loadingIndicator.stopAnimating()
            refreshControl.endRefreshing()
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        if let token = token, !token.isEmpty {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            request.setValue("token=\(token); auth-token=\(token)", forHTTPHeaderField: "Cookie")
        }
        request.setValue("application/json", forHTTPHeaderField: "Accept")

        URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            let httpStatus = (response as? HTTPURLResponse)?.statusCode ?? 0
            if httpStatus == 200, let data = data,
               let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
               let docs = json["doctors"] as? [[String: Any]], !docs.isEmpty {
                DispatchQueue.main.async {
                    self?.loadingIndicator.stopAnimating()
                    self?.refreshControl.endRefreshing()
                    let stats = (json["stats"] as? [String: Any]) ?? (json["kpis"] as? [String: Any])
                    self?.allDoctors = docs
                    self?.updateKpiUi(stats: stats)
                    self?.applyFilterAndSearch()
                    if isManual {
                        self?.showToast("Doctors synchronized")
                    }
                }
                return
            }

            // Fallback: Real-time Live Workspace Data Sync from active patients & visits
            self?.fetchRealtimeWorkspaceDoctors(token: token, isManual: isManual)
        }.resume()
    }

    private func fetchRealtimeWorkspaceDoctors(token: String?, isManual: Bool) {
        guard let url = URL(string: "\(Self.baseUrl)/api/workspace/patients?limit=100") else {
            DispatchQueue.main.async {
                self.loadingIndicator.stopAnimating()
                self.refreshControl.endRefreshing()
                self.applyFilterAndSearch()
            }
            return
        }

        var req = URLRequest(url: url)
        req.httpMethod = "GET"
        if let token = token, !token.isEmpty {
            req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            req.setValue("token=\(token); auth-token=\(token)", forHTTPHeaderField: "Cookie")
        }
        req.setValue("application/json", forHTTPHeaderField: "Accept")

        URLSession.shared.dataTask(with: req) { [weak self] data, response, error in
            guard let self = self else { return }
            var doctorMap: [String: [String: Any]] = [:]
            var totalReferralsCalc = 0
            var totalBilledCalc = 0.0
            var totalPendingCalc = 0.0

            if let data = data,
               let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
               let patientsArr = json["patients"] as? [[String: Any]] {

                for patient in patientsArr {
                    let patientName = patient["name"] as? String ?? "Patient"
                    let docObj = patient["doctor"] as? [String: Any]
                    let docId = docObj?["id"] as? String ?? ""
                    let docName = docObj?["name"] as? String ?? ""

                    if docName.isEmpty || docName.caseInsensitiveCompare("Self") == .orderedSame || docName.lowercased().contains("no doctor") {
                        continue
                    }

                    let key = !docId.isEmpty ? docId : docName.lowercased()
                    var aggregatedDoc = doctorMap[key] ?? [:]

                    if aggregatedDoc.isEmpty {
                        if let docObj = docObj {
                            for (k, v) in docObj {
                                aggregatedDoc[k] = v
                            }
                        }
                        if aggregatedDoc["id"] == nil || (aggregatedDoc["id"] as? String)?.isEmpty == true {
                            aggregatedDoc["id"] = docId.isEmpty ? "doc_\(abs(key.hashValue))" : docId
                        }
                        if aggregatedDoc["name"] == nil || (aggregatedDoc["name"] as? String)?.isEmpty == true {
                            aggregatedDoc["name"] = docName
                        }
                        if aggregatedDoc["specialization"] == nil || (aggregatedDoc["specialization"] as? String)?.isEmpty == true {
                            aggregatedDoc["specialization"] = "General Physician"
                        }
                        if aggregatedDoc["clinic"] == nil || (aggregatedDoc["clinic"] as? String)?.isEmpty == true {
                            aggregatedDoc["clinic"] = "Private Practice"
                        }
                        if aggregatedDoc["commissionRate"] == nil {
                            aggregatedDoc["commissionRate"] = 10.0
                        }
                        if aggregatedDoc["commissionType"] == nil {
                            aggregatedDoc["commissionType"] = "PERCENTAGE"
                        }
                        aggregatedDoc["totalReferrals"] = 0
                        aggregatedDoc["totalPatients"] = 0
                        aggregatedDoc["totalBilled"] = 0.0
                        aggregatedDoc["totalCommission"] = 0.0
                        aggregatedDoc["pendingCommission"] = 0.0
                        aggregatedDoc["commissions"] = [[String: Any]]()
                    }

                    // Increment patients
                    let prevPatients = aggregatedDoc["totalPatients"] as? Int ?? 0
                    aggregatedDoc["totalPatients"] = prevPatients + 1

                    // Invoices total
                    let invoices = patient["invoices"] as? [[String: Any]] ?? []
                    var patientBilled = 0.0
                    for inv in invoices {
                        let grand = inv["grandTotal"] as? Double ?? (inv["subtotal"] as? Double ?? 0.0)
                        patientBilled += grand
                    }
                    let prevBilled = aggregatedDoc["totalBilled"] as? Double ?? 0.0
                    aggregatedDoc["totalBilled"] = prevBilled + patientBilled
                    totalBilledCalc += patientBilled

                    // Tests & referrals
                    let tests = patient["tests"] as? [[String: Any]] ?? []
                    let testCount = max(1, tests.count)
                    let prevRefs = aggregatedDoc["totalReferrals"] as? Int ?? 0
                    aggregatedDoc["totalReferrals"] = prevRefs + testCount
                    totalReferralsCalc += testCount

                    let rate = aggregatedDoc["commissionRate"] as? Double ?? 10.0
                    let commType = aggregatedDoc["commissionType"] as? String ?? "PERCENTAGE"
                    let docComm = commType.caseInsensitiveCompare("FIXED") == .orderedSame ? (rate * Double(testCount)) : (patientBilled * rate / 100.0)

                    let prevComm = aggregatedDoc["totalCommission"] as? Double ?? 0.0
                    aggregatedDoc["totalCommission"] = prevComm + docComm

                    let prevPending = aggregatedDoc["pendingCommission"] as? Double ?? 0.0
                    aggregatedDoc["pendingCommission"] = prevPending + docComm
                    totalPendingCalc += docComm

                    // Ledger items
                    var commsArr = aggregatedDoc["commissions"] as? [[String: Any]] ?? []
                    if !tests.isEmpty {
                        for t in tests {
                            var item: [String: Any] = [:]
                            item["id"] = t["id"] as? String ?? "comm_\(Int(Date().timeIntervalSince1970 * 1000))"
                            item["patientName"] = patientName
                            item["testName"] = t["testName"] as? String ?? "Investigation"
                            item["amount"] = commType.caseInsensitiveCompare("FIXED") == .orderedSame ? rate : (patientBilled > 0 ? (patientBilled * rate / 100.0) : (rate * 15.0))
                            item["status"] = "PENDING"
                            item["createdAt"] = t["createdAt"] as? String ?? (patient["createdAt"] as? String ?? "")
                            commsArr.append(item)
                        }
                    } else {
                        var item: [String: Any] = [:]
                        item["id"] = "comm_\(Int(Date().timeIntervalSince1970 * 1000))"
                        item["patientName"] = patientName
                        item["testName"] = "Clinical Consultation"
                        item["amount"] = docComm
                        item["status"] = "PENDING"
                        item["createdAt"] = patient["createdAt"] as? String ?? ""
                        commsArr.append(item)
                    }
                    aggregatedDoc["commissions"] = commsArr

                    doctorMap[key] = aggregatedDoc
                }
            }

            let resultList = Array(doctorMap.values)
            let computedKpis: [String: Any] = [
                "totalDoctors": resultList.count,
                "totalReferrals": totalReferralsCalc,
                "totalBilled": totalBilledCalc,
                "pendingCommission": totalPendingCalc
            ]

            DispatchQueue.main.async {
                self.loadingIndicator.stopAnimating()
                self.refreshControl.endRefreshing()
                self.allDoctors = resultList
                self.updateKpiUi(stats: computedKpis)
                self.applyFilterAndSearch()

                if isManual {
                    self.showToast("Doctors synchronized (\(resultList.count) active)")
                }
            }
        }.resume()
    }

    private func updateKpiUi(stats: [String: Any]?) {
        let count = stats?["totalDoctors"] as? Int ?? allDoctors.count
        var referrals = stats?["totalReferrals"] as? Int ?? 0
        var billed = stats?["totalBilled"] as? Double ?? (stats?["totalCommission"] as? Double ?? 0.0)
        var pending = stats?["pendingCommission"] as? Double ?? 0.0

        if referrals == 0 || billed == 0.0 || pending == 0.0 {
            var calcReferrals = 0
            var calcBilled = 0.0
            var calcPending = 0.0
            for doc in allDoctors {
                let docStats = doc["stats"] as? [String: Any]
                calcReferrals += docStats?["totalReferrals"] as? Int ?? (doc["totalReferrals"] as? Int ?? 0)
                let b = docStats?["totalBilled"] as? Double ?? (doc["totalBilled"] as? Double ?? (doc["totalCommission"] as? Double ?? 0.0))
                calcBilled += b
                calcPending += docStats?["pendingCommission"] as? Double ?? (doc["pendingCommission"] as? Double ?? 0.0)
            }
            if referrals == 0 { referrals = calcReferrals }
            if billed == 0.0 { billed = calcBilled }
            if pending == 0.0 { pending = calcPending }
        }

        kpiTotalCountLbl.text = "\(count)"
        kpiReferralsCountLbl.text = "\(referrals)"
        kpiBilledVolumeLbl.text = "₹" + String(format: "%,.0f", billed)
        kpiPendingCommLbl.text = "₹" + String(format: "%,.0f", pending)
    }

    private func applyFilterAndSearch() {
        filteredDoctors = allDoctors.filter { doc in
            let spec = (doc["specialization"] as? String ?? "General").lowercased()
            var matchesSpec = currentSpecializationFilter == "ALL"
            if !matchesSpec {
                if currentSpecializationFilter == "GENERAL" && (spec.contains("general") || spec.contains("physician") || spec.contains("mbbs")) {
                    matchesSpec = true
                } else if spec.contains(currentSpecializationFilter.lowercased()) {
                    matchesSpec = true
                }
            }

            let name = (doc["name"] as? String ?? "").lowercased()
            let clinic = (doc["clinic"] as? String ?? "").lowercased()
            let phone = (doc["phone"] as? String ?? "").lowercased()
            let reg = (doc["registrationNo"] as? String ?? "").lowercased()

            let q = searchQuery.lowercased()
            let matchesSearch = q.isEmpty
                || name.contains(q)
                || clinic.contains(q)
                || phone.contains(q)
                || reg.contains(q)
                || spec.contains(q)

            return matchesSpec && matchesSearch
        }

        tableView.reloadData()
        emptyView.isHidden = !filteredDoctors.isEmpty
        tableView.isHidden = filteredDoctors.isEmpty
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  TABLEVIEW DATA SOURCE & DELEGATE
    // ─────────────────────────────────────────────────────────────────────────
    func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        return filteredDoctors.count
    }

    func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        guard let cell = tableView.dequeueReusableCell(withIdentifier: "DoctorCardCell", for: indexPath) as? DoctorCardCell else {
            return UITableViewCell()
        }

        let doc = filteredDoctors[indexPath.row]
        cell.configure(doctor: doc)

        cell.onCall = { [weak self] phone in
            self?.dialPhone(phone)
        }
        cell.onWhatsApp = { [weak self] phone, name in
            self?.openWhatsApp(phone: phone, name: name)
        }
        cell.onLedger = { [weak self] in
            self?.showLedgerSheet(doctor: doc)
        }
        cell.onEdit = { [weak self] in
            self?.showAddEditSheet(doctorToEdit: doc)
        }
        cell.onDelete = { [weak self] in
            self?.confirmDeleteDoctor(doctor: doc)
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
        loadDoctorsData(isManual: true)
    }

    @objc private func pullRefreshed() {
        loadDoctorsData(isManual: true)
    }

    @objc private func addDoctorTapped() {
        showAddEditSheet(doctorToEdit: nil)
    }

    @objc private func chipTapped(_ sender: UIButton) {
        guard let key = sender.accessibilityIdentifier else { return }
        currentSpecializationFilter = key

        for view in filterStackView.arrangedSubviews {
            if let b = view as? UIButton {
                updateChipStyle(b, isSelected: b.accessibilityIdentifier == currentSpecializationFilter)
            }
        }
        applyFilterAndSearch()
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
        let msg = "Hello \(name), greetings from PathoLab Diagnostics doctor referral desk."
        guard let url = URL(string: "https://api.whatsapp.com/send?phone=\(clean)&text=\(msg.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? "")") else { return }
        UIApplication.shared.open(url, options: [:], completionHandler: nil)
    }

    // ── Add / Edit Doctor Sheet ──
    private func showAddEditSheet(doctorToEdit: [String: Any]?) {
        let isEdit = doctorToEdit != nil
        let alert = UIAlertController(
            title: isEdit ? "Edit Referral Doctor" : "Add Referral Doctor",
            message: "Configure doctor profile, specialization, clinic and commission margins.",
            preferredStyle: .alert
        )

        alert.addTextField { tf in
            tf.placeholder = "Full Name (e.g. Dr. Priya Patel) *"
            tf.text = doctorToEdit?["name"] as? String
        }
        alert.addTextField { tf in
            tf.placeholder = "Phone (10 digits) *"
            tf.keyboardType = .phonePad
            tf.text = doctorToEdit?["phone"] as? String
        }
        alert.addTextField { tf in
            tf.placeholder = "Registration No (e.g. MCI-9012)"
            tf.text = doctorToEdit?["registrationNo"] as? String
        }
        alert.addTextField { tf in
            tf.placeholder = "Specialization (e.g. General Physician) *"
            tf.text = doctorToEdit?["specialization"] as? String
        }
        alert.addTextField { tf in
            tf.placeholder = "Clinic / Hospital Name"
            tf.text = doctorToEdit?["clinic"] as? String
        }
        alert.addTextField { tf in
            tf.placeholder = "Commission % (e.g. 10) *"
            tf.keyboardType = .decimalPad
            if let rate = doctorToEdit?["commissionRate"] as? Double {
                tf.text = String(format: "%.1f", rate)
            }
        }

        let saveAction = UIAlertAction(title: isEdit ? "Update" : "Save", style: .default) { [weak self] _ in
            guard let self = self else { return }
            let name = alert.textFields?[0].text?.trimmingCharacters(in: .whitespaces) ?? ""
            let phone = alert.textFields?[1].text?.trimmingCharacters(in: .whitespaces) ?? ""
            let reg = alert.textFields?[2].text?.trimmingCharacters(in: .whitespaces) ?? ""
            let spec = alert.textFields?[3].text?.trimmingCharacters(in: .whitespaces) ?? "General Physician"
            let clinic = alert.textFields?[4].text?.trimmingCharacters(in: .whitespaces) ?? ""
            let rateStr = alert.textFields?[5].text?.trimmingCharacters(in: .whitespaces) ?? "10"

            if name.isEmpty || phone.isEmpty {
                self.showToast("Please fill all required fields")
                return
            }

            self.submitDoctor(
                id: doctorToEdit?["id"] as? String,
                name: name,
                phone: phone,
                regNo: reg,
                spec: spec,
                clinic: clinic,
                rate: Double(rateStr) ?? 10.0
            )
        }

        alert.addAction(saveAction)
        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel, handler: nil))
        present(alert, animated: true, completion: nil)
    }

    private func submitDoctor(id: String?, name: String, phone: String, regNo: String, spec: String, clinic: String, rate: Double) {
        guard let token = getAuthToken(),
              let url = URL(string: "\(Self.baseUrl)/api/workspace/doctors") else { return }

        var request = URLRequest(url: url)
        request.httpMethod = id != nil ? "PATCH" : "POST"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue("token=\(token); auth-token=\(token)", forHTTPHeaderField: "Cookie")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        var payload: [String: Any] = [
            "name": name,
            "phone": phone,
            "registrationNo": regNo,
            "specialization": spec,
            "clinic": clinic,
            "commissionRate": rate,
            "commissionType": "PERCENTAGE"
        ]
        if let id = id {
            payload["id"] = id
        }

        request.httpBody = try? JSONSerialization.data(withJSONObject: payload)

        URLSession.shared.dataTask(with: request) { [weak self] _, _, error in
            DispatchQueue.main.async {
                guard let self = self, error == nil else {
                    self?.showToast("Network error")
                    return
                }
                self.showToast(id != nil ? "Doctor updated" : "Referral doctor added")
                self.loadDoctorsData(isManual: false)
            }
        }.resume()
    }

    // ── Delete Confirmation ──
    private func confirmDeleteDoctor(doctor: [String: Any]) {
        let name = doctor["name"] as? String ?? "this doctor"
        guard let id = doctor["id"] as? String else { return }

        let alert = UIAlertController(
            title: "Delete Doctor",
            message: "Are you sure you want to remove \(name)?",
            preferredStyle: .actionSheet
        )
        alert.addAction(UIAlertAction(title: "Delete", style: .destructive) { [weak self] _ in
            self?.deleteDoctor(id: id)
        })
        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel, handler: nil))
        present(alert, animated: true, completion: nil)
    }

    private func deleteDoctor(id: String) {
        guard let token = getAuthToken(),
              let url = URL(string: "\(Self.baseUrl)/api/workspace/doctors?id=\(id)") else { return }

        var request = URLRequest(url: url)
        request.httpMethod = "DELETE"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue("token=\(token); auth-token=\(token)", forHTTPHeaderField: "Cookie")

        URLSession.shared.dataTask(with: request) { [weak self] _, _, _ in
            DispatchQueue.main.async {
                self?.showToast("Doctor removed")
                self?.loadDoctorsData(isManual: false)
            }
        }.resume()
    }

    // ── Doctor Ledger Sheet ──
    private func showLedgerSheet(doctor: [String: Any]) {
        let name = doctor["name"] as? String ?? "Doctor"
        let stats = doctor["stats"] as? [String: Any]
        let earned = stats?["totalCommission"] as? Double ?? (doctor["totalCommission"] as? Double ?? 0.0)
        let due = stats?["pendingCommission"] as? Double ?? (doctor["pendingCommission"] as? Double ?? 0.0)
        let paid = max(0, earned - due)
        let comms = doctor["commissions"] as? [[String: Any]] ?? []

        var msg = "Total Commission: ₹\(String(format: "%,.0f", earned))\nPaid Out: ₹\(String(format: "%,.0f", paid))\nBalance Due: ₹\(String(format: "%,.0f", due))"
        if !comms.isEmpty {
            msg += "\n\nRecent Referred Items (\(comms.count)):\n"
            for (idx, c) in comms.prefix(5).enumerated() {
                let pName = c["patientName"] as? String ?? "Patient"
                let tName = c["testName"] as? String ?? "Investigation"
                let amt = c["amount"] as? Double ?? 0.0
                msg += "\(idx + 1). \(pName) - \(tName) (₹\(String(format: "%.0f", amt)))\n"
            }
        }

        let alert = UIAlertController(
            title: "\(name) Ledger",
            message: msg,
            preferredStyle: .alert
        )
        alert.addAction(UIAlertAction(title: "Close", style: .default, handler: nil))
        present(alert, animated: true, completion: nil)
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
            toast.bottomAnchor.constraint(equalTo: fabAddDoctor.topAnchor, constant: -16),
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
//  DOCTOR CARD CELL
// ─────────────────────────────────────────────────────────────────────────────
class DoctorCardCell: UITableViewCell {

    var onCall: ((String) -> Void)?
    var onWhatsApp: ((String, String) -> Void)?
    var onLedger: (() -> Void)?
    var onEdit: (() -> Void)?
    var onDelete: (() -> Void)?

    private let cardView        = UIView()
    private let specBadge       = UILabel()
    private let regNoBadge      = UILabel()
    private let commRatePill    = UILabel()
    private let nameLabel       = UILabel()
    private let clinicLabel     = UILabel()
    private let emailLabel      = UILabel()

    private let referralsCountLbl = UILabel()
    private let billedVolumeLbl = UILabel()
    private let pendingDueLbl   = UILabel()

    private let callBtn         = UIButton(type: .system)
    private let waBtn           = UIButton(type: .system)
    private let ledgerBtn       = UIButton(type: .system)
    private let editBtn         = UIButton(type: .system)
    private let deleteBtn       = UIButton(type: .system)

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

        specBadge.font = .systemFont(ofSize: 10, weight: .bold)
        specBadge.textColor = UIColor(red: 0.145, green: 0.388, blue: 0.922, alpha: 1)
        specBadge.backgroundColor = UIColor(red: 0.859, green: 0.918, blue: 0.996, alpha: 1)
        specBadge.layer.cornerRadius = 4
        specBadge.clipsToBounds = true
        specBadge.textAlignment = .center

        regNoBadge.font = .systemFont(ofSize: 10, weight: .bold)
        regNoBadge.textColor = UIColor(red: 0.392, green: 0.455, blue: 0.545, alpha: 1)
        regNoBadge.backgroundColor = UIColor(red: 0.945, green: 0.961, blue: 0.976, alpha: 1)
        regNoBadge.layer.cornerRadius = 4
        regNoBadge.clipsToBounds = true
        regNoBadge.textAlignment = .center

        commRatePill.font = .systemFont(ofSize: 11, weight: .bold)
        commRatePill.textColor = UIColor(red: 0.263, green: 0.220, blue: 0.792, alpha: 1)
        commRatePill.backgroundColor = UIColor(red: 0.933, green: 0.949, blue: 1.0, alpha: 1)
        commRatePill.layer.cornerRadius = 4
        commRatePill.clipsToBounds = true
        commRatePill.textAlignment = .center

        let spacer = UIView()
        topRow.addArrangedSubview(specBadge)
        topRow.addArrangedSubview(regNoBadge)
        topRow.addArrangedSubview(spacer)
        topRow.addArrangedSubview(commRatePill)
        cardView.addSubview(topRow)

        // 2. Name & Clinic
        nameLabel.translatesAutoresizingMaskIntoConstraints = false
        nameLabel.font = .systemFont(ofSize: 15, weight: .bold)
        nameLabel.textColor = UIColor(red: 0.059, green: 0.090, blue: 0.165, alpha: 1)
        cardView.addSubview(nameLabel)

        clinicLabel.translatesAutoresizingMaskIntoConstraints = false
        clinicLabel.font = .systemFont(ofSize: 12, weight: .medium)
        clinicLabel.textColor = UIColor(red: 0.392, green: 0.455, blue: 0.545, alpha: 1)
        cardView.addSubview(clinicLabel)

        emailLabel.translatesAutoresizingMaskIntoConstraints = false
        emailLabel.font = .systemFont(ofSize: 11.5)
        emailLabel.textColor = UIColor(red: 0.278, green: 0.333, blue: 0.412, alpha: 1)
        cardView.addSubview(emailLabel)

        // 3. Bento Box
        let bentoBox = UIStackView()
        bentoBox.translatesAutoresizingMaskIntoConstraints = false
        bentoBox.axis = .horizontal
        bentoBox.distribution = .fillEqually
        bentoBox.backgroundColor = UIColor(red: 0.973, green: 0.980, blue: 0.988, alpha: 1)
        bentoBox.layer.cornerRadius = 8
        bentoBox.layoutMargins = UIEdgeInsets(top: 8, left: 10, bottom: 8, right: 10)
        bentoBox.isLayoutMarginsRelativeArrangement = true

        let col1 = createBentoCol(title: "REFERRALS", valLbl: referralsCountLbl, valColor: UIColor(red: 0.059, green: 0.090, blue: 0.165, alpha: 1))
        let col2 = createBentoCol(title: "BILLED VOL", valLbl: billedVolumeLbl, valColor: UIColor(red: 0.051, green: 0.580, blue: 0.533, alpha: 1))
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

        ledgerBtn.setTitle(" Ledger", for: .normal)
        ledgerBtn.setImage(UIImage(systemName: "doc.text.fill"), for: .normal)
        ledgerBtn.titleLabel?.font = .systemFont(ofSize: 11.5, weight: .bold)
        ledgerBtn.setTitleColor(UIColor(red: 0.200, green: 0.255, blue: 0.333, alpha: 1), for: .normal)
        ledgerBtn.tintColor = UIColor(red: 0.200, green: 0.255, blue: 0.333, alpha: 1)
        ledgerBtn.backgroundColor = UIColor(red: 0.945, green: 0.961, blue: 0.976, alpha: 1)
        ledgerBtn.layer.cornerRadius = 6
        ledgerBtn.heightAnchor.constraint(equalToConstant: 34).isActive = true

        styleBtn(editBtn, iconName: "pencil", tint: UIColor(red: 0.278, green: 0.333, blue: 0.412, alpha: 1))
        styleBtn(deleteBtn, iconName: "trash", tint: UIColor(red: 0.863, green: 0.149, blue: 0.149, alpha: 1))

        callBtn.addTarget(self, action: #selector(callTapped), for: .touchUpInside)
        waBtn.addTarget(self, action: #selector(waTapped), for: .touchUpInside)
        ledgerBtn.addTarget(self, action: #selector(ledgerTapped), for: .touchUpInside)
        editBtn.addTarget(self, action: #selector(editTapped), for: .touchUpInside)
        deleteBtn.addTarget(self, action: #selector(deleteTapped), for: .touchUpInside)

        actionRow.addArrangedSubview(callBtn)
        actionRow.addArrangedSubview(waBtn)
        actionRow.addArrangedSubview(ledgerBtn)
        actionRow.addArrangedSubview(editBtn)
        actionRow.addArrangedSubview(deleteBtn)
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

            clinicLabel.topAnchor.constraint(equalTo: nameLabel.bottomAnchor, constant: 2),
            clinicLabel.leadingAnchor.constraint(equalTo: nameLabel.leadingAnchor),
            clinicLabel.trailingAnchor.constraint(equalTo: nameLabel.trailingAnchor),

            emailLabel.topAnchor.constraint(equalTo: clinicLabel.bottomAnchor, constant: 4),
            emailLabel.leadingAnchor.constraint(equalTo: nameLabel.leadingAnchor),

            bentoBox.topAnchor.constraint(equalTo: emailLabel.bottomAnchor, constant: 10),
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

    func configure(doctor: [String: Any]) {
        let name = doctor["name"] as? String ?? "Dr. Doctor"
        let phone = doctor["phone"] as? String ?? ""
        let regNo = doctor["registrationNo"] as? String ?? ""
        let spec = doctor["specialization"] as? String ?? "General Physician"
        let clinic = doctor["clinic"] as? String ?? "Independent Practice"
        let email = doctor["email"] as? String ?? "No email provided"
        let rate = doctor["commissionRate"] as? Double ?? 10.0

        currentPhone = phone
        currentName = name

        nameLabel.text = name
        clinicLabel.text = "\(clinic)\(phone.isEmpty ? "" : " • \(phone)")"
        emailLabel.text = email

        specBadge.text = "  \(spec.uppercased())  "
        if !regNo.isEmpty {
            regNoBadge.isHidden = false
            regNoBadge.text = "  REG: \(regNo)  "
        } else {
            regNoBadge.isHidden = true
        }

        commRatePill.text = "  \(String(format: "%.1f", rate))% Comm  "

        let stats = doctor["stats"] as? [String: Any]
        let referrals = stats?["totalReferrals"] as? Int ?? (doctor["totalReferrals"] as? Int ?? 0)
        let billed = stats?["totalBilled"] as? Double ?? (doctor["totalBilled"] as? Double ?? (doctor["totalCommission"] as? Double ?? 0.0))
        let pending = stats?["pendingCommission"] as? Double ?? (doctor["pendingCommission"] as? Double ?? 0.0)

        referralsCountLbl.text = "\(referrals)"
        billedVolumeLbl.text = "₹" + String(format: "%,.0f", billed)
        pendingDueLbl.text = "₹" + String(format: "%,.0f", pending)
    }

    @objc private func callTapped() { onCall?(currentPhone) }
    @objc private func waTapped() { onWhatsApp?(currentPhone, currentName) }
    @objc private func ledgerTapped() { onLedger?() }
    @objc private func editTapped() { onEdit?() }
    @objc private func deleteTapped() { onDelete?() }
}
