import UIKit

/**
 * B2BViewController
 * ─────────────────────────────────────────────────────────────────────────────
 * Native dedicated Corporate Agencies & B2B Partner Portal Console (iOS).
 * Full feature parity with web module (/workspace/agencies & /workspace/settings/b2b-tiers):
 *  - Fused Sapphire Header with back, title, B2B Tiers config, and refresh actions
 *  - 4 Real-time KPI Metric cards (Partner Agencies, Total Volume, Billed Volume, Pending Payout)
 *  - Search Omnibar & Tier Filter Chips (All Partners, Standard, Tier 1, Tier 2, Tier 3)
 *  - Interactive Agency cards with tier badge, commission rate pill, portal access badge, and financial bento
 *  - Direct Phone dialer & WhatsApp messenger integration
 *  - Agency referral transactions ledger modal sheet
 *  - In-app Add & Edit Corporate Agency modal sheet with portal account provisioning
 *  - B2B Pricing Tiers configuration modal sheet
 *  - Delete Agency with confirmation dialog
 */
class B2BViewController: UIViewController, UITextFieldDelegate, UITableViewDelegate, UITableViewDataSource {

    private static let baseUrl = "https://app.patholab.cloud"

    // ── Hero Header ──
    private let heroHeaderView     = UIView()
    private let heroGradientLayer  = CAGradientLayer()
    private let backBtn            = UIButton(type: .system)
    private let titleLabel         = UILabel()
    private let subtitleLabel      = UILabel()
    private let tiersBtn           = UIButton(type: .system)
    private let exportBtn          = UIButton(type: .system)
    private let refreshBtn         = UIButton(type: .system)

    // ── 4 KPI Metrics Scroll ──
    private let kpiScrollView      = UIScrollView()
    private let kpiStackView       = UIStackView()
    private let kpiTotalCountLbl   = UILabel()
    private let kpiTotalVolumeLbl  = UILabel()
    private let kpiBilledVolumeLbl = UILabel()
    private let kpiPendingPayoutLbl = UILabel()

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
    private let fabAddAgency       = UIButton(type: .system)

    // ── Data & State ──
    private var allAgencies: [[String: Any]] = []
    private var filteredAgencies: [[String: Any]] = []
    private var currentTierFilter: String = "ALL"
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

        loadAgenciesData(isManual: false)
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        heroGradientLayer.frame = heroHeaderView.bounds
    }

    // ─────────────────────────────────────────────────────────────────────────
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
        titleLabel.text = "Corporate Agencies"
        titleLabel.font = .systemFont(ofSize: 20, weight: .bold)
        titleLabel.textColor = .white
        heroHeaderView.addSubview(titleLabel)

        subtitleLabel.translatesAutoresizingMaskIntoConstraints = false
        subtitleLabel.text = "Manage partner labs, enterprise tiers & margins"
        subtitleLabel.font = .systemFont(ofSize: 11.5, weight: .medium)
        subtitleLabel.textColor = UIColor(red: 0.780, green: 0.875, blue: 1.0, alpha: 1)
        heroHeaderView.addSubview(subtitleLabel)

        tiersBtn.translatesAutoresizingMaskIntoConstraints = false
        tiersBtn.setImage(UIImage(systemName: "slider.horizontal.3"), for: .normal)
        tiersBtn.tintColor = .white
        tiersBtn.backgroundColor = UIColor.white.withAlphaComponent(0.20)
        tiersBtn.layer.borderColor = UIColor.white.withAlphaComponent(0.30).cgColor
        tiersBtn.layer.borderWidth = 1
        tiersBtn.layer.cornerRadius = 19
        tiersBtn.addTarget(self, action: #selector(tiersTapped), for: .touchUpInside)
        heroHeaderView.addSubview(tiersBtn)

        exportBtn.translatesAutoresizingMaskIntoConstraints = false
        exportBtn.setImage(UIImage(systemName: "square.and.arrow.up"), for: .normal)
        exportBtn.tintColor = .white
        exportBtn.backgroundColor = UIColor.white.withAlphaComponent(0.20)
        exportBtn.layer.borderColor = UIColor.white.withAlphaComponent(0.30).cgColor
        exportBtn.layer.borderWidth = 1
        exportBtn.layer.cornerRadius = 19
        exportBtn.addTarget(self, action: #selector(exportTapped), for: .touchUpInside)
        heroHeaderView.addSubview(exportBtn)

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
            refreshBtn.heightAnchor.constraint(equalToConstant: 38),

            tiersBtn.trailingAnchor.constraint(equalTo: refreshBtn.leadingAnchor, constant: -8),
            tiersBtn.centerYAnchor.constraint(equalTo: backBtn.centerYAnchor),
            tiersBtn.widthAnchor.constraint(equalToConstant: 38),
            tiersBtn.heightAnchor.constraint(equalToConstant: 38),

            exportBtn.trailingAnchor.constraint(equalTo: tiersBtn.leadingAnchor, constant: -8),
            exportBtn.centerYAnchor.constraint(equalTo: backBtn.centerYAnchor),
            exportBtn.widthAnchor.constraint(equalToConstant: 38),
            exportBtn.heightAnchor.constraint(equalToConstant: 38),
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

        let card1 = createKpiCard(title: "PARTNER AGENCIES", subtitle: "Active Contracts", countLbl: kpiTotalCountLbl, dotColor: UIColor(red: 0.388, green: 0.400, blue: 0.945, alpha: 1)) // Indigo
        let card2 = createKpiCard(title: "TOTAL VOLUME", subtitle: "Referred Samples", countLbl: kpiTotalVolumeLbl, dotColor: UIColor(red: 0.063, green: 0.725, blue: 0.506, alpha: 1)) // Emerald
        let card3 = createKpiCard(title: "BILLED VOLUME", subtitle: "Gross Billing", countLbl: kpiBilledVolumeLbl, dotColor: UIColor(red: 0.024, green: 0.714, blue: 0.831, alpha: 1)) // Cyan
        let card4 = createKpiCard(title: "PENDING PAYOUT", subtitle: "Unsettled Comm", countLbl: kpiPendingPayoutLbl, dotColor: UIColor(red: 0.961, green: 0.620, blue: 0.043, alpha: 1)) // Amber

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
        searchField.placeholder = "Search agency, contact, phone, tier..."
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
            ("ALL", "All Partners"),
            ("STANDARD", "Standard"),
            ("BRONZE", "Bronze"),
            ("SILVER", "Silver"),
            ("GOLD", "Gold"),
            ("PLATINUM", "Platinum")
        ]

        for (key, title) in filters {
            let chip = UIButton(type: .system)
            chip.setTitle(title, for: .normal)
            chip.titleLabel?.font = .systemFont(ofSize: 12, weight: key == currentTierFilter ? .bold : .medium)
            chip.layer.cornerRadius = 16
            chip.contentEdgeInsets = UIEdgeInsets(top: 6, left: 14, bottom: 6, right: 14)
            chip.tag = key.hashValue
            chip.accessibilityIdentifier = key

            updateChipStyle(chip, isSelected: key == currentTierFilter)
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
        tableView.register(AgencyCardCell.self, forCellReuseIdentifier: "AgencyCardCell")
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

        let icon = UIImageView(image: UIImage(systemName: "building.2.fill"))
        icon.tintColor = UIColor(red: 0.796, green: 0.835, blue: 0.882, alpha: 1)
        icon.contentMode = .scaleAspectFit
        icon.translatesAutoresizingMaskIntoConstraints = false
        emptyView.addSubview(icon)

        let title = UILabel()
        title.text = "No Corporate Agencies"
        title.font = .systemFont(ofSize: 16, weight: .bold)
        title.textColor = UIColor(red: 0.200, green: 0.255, blue: 0.333, alpha: 1)
        title.translatesAutoresizingMaskIntoConstraints = false
        emptyView.addSubview(title)

        let sub = UILabel()
        sub.text = "Add partner diagnostic centers, clinics or hospitals to manage B2B contracts."
        sub.font = .systemFont(ofSize: 12.5)
        sub.textColor = UIColor(red: 0.392, green: 0.455, blue: 0.545, alpha: 1)
        sub.textAlignment = .center
        sub.numberOfLines = 0
        sub.translatesAutoresizingMaskIntoConstraints = false
        emptyView.addSubview(sub)

        let btn = UIButton(type: .system)
        btn.setTitle("+ Add Partner Agency", for: .normal)
        btn.titleLabel?.font = .systemFont(ofSize: 13, weight: .bold)
        btn.setTitleColor(.white, for: .normal)
        btn.backgroundColor = UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1)
        btn.layer.cornerRadius = 8
        btn.contentEdgeInsets = UIEdgeInsets(top: 8, left: 16, bottom: 8, right: 16)
        btn.translatesAutoresizingMaskIntoConstraints = false
        btn.addTarget(self, action: #selector(addAgencyTapped), for: .touchUpInside)
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
        fabAddAgency.translatesAutoresizingMaskIntoConstraints = false
        fabAddAgency.setTitle("  + New Agency", for: .normal)
        fabAddAgency.titleLabel?.font = .systemFont(ofSize: 13.5, weight: .bold)
        fabAddAgency.setTitleColor(.white, for: .normal)
        fabAddAgency.backgroundColor = UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1)
        fabAddAgency.layer.cornerRadius = 24
        fabAddAgency.layer.shadowColor = UIColor.black.cgColor
        fabAddAgency.layer.shadowOpacity = 0.2
        fabAddAgency.layer.shadowOffset = CGSize(width: 0, height: 4)
        fabAddAgency.layer.shadowRadius = 6
        fabAddAgency.contentEdgeInsets = UIEdgeInsets(top: 12, left: 20, bottom: 12, right: 20)
        fabAddAgency.addTarget(self, action: #selector(addAgencyTapped), for: .touchUpInside)
        view.addSubview(fabAddAgency)

        NSLayoutConstraint.activate([
            fabAddAgency.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -18),
            fabAddAgency.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -18),
            fabAddAgency.heightAnchor.constraint(equalToConstant: 48)
        ])
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  DATA FETCHING & FILTERING
    // ─────────────────────────────────────────────────────────────────────────
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
                if (cookie.name == "token" || cookie.name == "auth-token" || cookie.name == "auth_token") && !cookie.value.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                    let cookieToken = cookie.value.trimmingCharacters(in: .whitespacesAndNewlines)
                    KeychainManager.save(cookieToken, forKey: KeychainManager.tokenKey)
                    return cookieToken
                }
            }
        }
        return nil
    }

    @objc private func tiersTapped() {
        let vc = B2BSettingsViewController()
        vc.modalPresentationStyle = .fullScreen
        present(vc, animated: true, completion: nil)
    }

    private func loadAgenciesData(isManual: Bool) {
        if !refreshControl.isRefreshing {
            loadingIndicator.startAnimating()
        }

        guard let token = getAuthToken(),
              let url = URL(string: "\(Self.baseUrl)/api/workspace/b2b/agencies") else {
            loadingIndicator.stopAnimating()
            refreshControl.endRefreshing()
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue("token=\(token); auth-token=\(token); auth_token=\(token)", forHTTPHeaderField: "Cookie")
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
                        let agencies = json["agencies"] as? [[String: Any]] ?? []
                        let kpis = (json["kpis"] as? [String: Any]) ?? (json["stats"] as? [String: Any])

                        self.allAgencies = agencies
                        self.updateKpiUi(kpis: kpis)
                        self.applyFilterAndSearch()

                        if isManual {
                            self.showToast("Agencies synchronized")
                        }
                    }
                } catch {
                    self.showToast("Error parsing agencies")
                }
            }
        }.resume()
    }

    private func updateKpiUi(kpis: [String: Any]?) {
        var count = kpis?["totalAgencies"] as? Int ?? allAgencies.count
        var volume = (kpis?["totalReferrals"] as? Int) ?? (kpis?["totalVolume"] as? Int) ?? 0
        var billed = (kpis?["totalCommission"] as? Double) ?? (kpis?["totalBilled"] as? Double) ?? 0.0
        var pending = (kpis?["pendingCommission"] as? Double) ?? (kpis?["pendingPayout"] as? Double) ?? 0.0

        if count == 0 && volume == 0 && billed == 0 && pending == 0 {
            count = allAgencies.count
            for a in allAgencies {
                volume += (a["totalReferrals"] as? Int) ?? ((a["stats"] as? [String: Any])?["totalTests"] as? Int) ?? 0
                billed += (a["totalCommission"] as? Double) ?? ((a["stats"] as? [String: Any])?["totalCommission"] as? Double) ?? 0.0
                pending += (a["pendingCommission"] as? Double) ?? ((a["stats"] as? [String: Any])?["pendingCommission"] as? Double) ?? 0.0
            }
        }

        kpiTotalCountLbl.text = "\(count)"
        kpiTotalVolumeLbl.text = "\(volume)"
        kpiBilledVolumeLbl.text = "₹" + String(format: "%,.0f", billed)
        kpiPendingPayoutLbl.text = "₹" + String(format: "%,.0f", pending)
    }

    private func applyFilterAndSearch() {
        filteredAgencies = allAgencies.filter { agency in
            let tier = (agency["agencyTier"] as? String ?? "STANDARD").uppercased()
            let matchesTier = currentTierFilter == "ALL" || tier == currentTierFilter

            let name = (agency["agencyName"] as? String ?? "").lowercased()
            let contact = (agency["contactPerson"] as? String ?? "").lowercased()
            let phone = (agency["phone"] as? String ?? "").lowercased()
            let email = (agency["email"] as? String ?? "").lowercased()

            let q = searchQuery.lowercased()
            let matchesSearch = q.isEmpty
                || name.contains(q)
                || contact.contains(q)
                || phone.contains(q)
                || email.contains(q)
                || tier.lowercased().contains(q)

            return matchesTier && matchesSearch
        }

        tableView.reloadData()
        emptyView.isHidden = !filteredAgencies.isEmpty
        tableView.isHidden = filteredAgencies.isEmpty
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  TABLEVIEW DATA SOURCE & DELEGATE
    // ─────────────────────────────────────────────────────────────────────────
    func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        return filteredAgencies.count
    }

    func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        guard let cell = tableView.dequeueReusableCell(withIdentifier: "AgencyCardCell", for: indexPath) as? AgencyCardCell else {
            return UITableViewCell()
        }

        let agency = filteredAgencies[indexPath.row]
        cell.configure(agency: agency)

        cell.onCall = { [weak self] phone in
            self?.dialPhone(phone)
        }
        cell.onWhatsApp = { [weak self] phone, name in
            self?.openWhatsApp(phone: phone, name: name)
        }
        cell.onLedger = { [weak self] in
            self?.showLedgerSheet(agency: agency)
        }
        cell.onEdit = { [weak self] in
            self?.showAddEditSheet(agencyToEdit: agency)
        }
        cell.onDelete = { [weak self] in
            self?.confirmDeleteAgency(agency: agency)
        }

        return cell
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  ACTIONS & SHEETS
    // ─────────────────────────────────────────────────────────────────────────
    @objc private func backTapped() {
        dismiss(animated: true, completion: nil)
    }

    @objc private func exportTapped() {
        if allAgencies.isEmpty {
            showToast("No agencies to export")
            return
        }

        var reportText = "PathoLab B2B Corporate Agencies Report\n\n"
        for (i, agency) in allAgencies.enumerated() {
            let name = agency["agencyName"] as? String ?? "Unnamed"
            let tier = agency["agencyTier"] as? String ?? "Standard"
            let phone = agency["phone"] as? String ?? "-"
            let contact = agency["contactPerson"] as? String ?? "-"
            let rate = agency["commissionRate"] as? Double ?? 0
            let type = agency["commissionType"] as? String ?? "PERCENTAGE"
            let count = agency["totalReferrals"] as? Int ?? 0
            let comm = agency["totalCommission"] as? Double ?? 0

            reportText += "\(i + 1). \(name)\n"
            reportText += "   • Tier: \(tier)\n"
            reportText += "   • Contact: \(contact) (\(phone))\n"
            reportText += "   • Margin: \(rate) \(type == "PERCENTAGE" ? "%" : "Flat ₹")\n"
            reportText += "   • Referrals: \(count) tests\n"
            reportText += "   • Lifetime Commission: ₹\(String(format: "%.2f", comm))\n\n"
        }

        let avc = UIActivityViewController(activityItems: [reportText], applicationActivities: nil)
        present(avc, animated: true)
    }

    @objc private func refreshTapped() {
        loadAgenciesData(isManual: true)
    }

    @objc private func pullRefreshed() {
        loadAgenciesData(isManual: true)
    }

    @objc private func addAgencyTapped() {
        showAddEditSheet(agencyToEdit: nil)
    }

    @objc private func chipTapped(_ sender: UIButton) {
        guard let key = sender.accessibilityIdentifier else { return }
        currentTierFilter = key

        for view in filterStackView.arrangedSubviews {
            if let b = view as? UIButton {
                updateChipStyle(b, isSelected: b.accessibilityIdentifier == currentTierFilter)
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
        let msg = "Hello \(name), greetings from PathoLab Diagnostics B2B division."
        guard let url = URL(string: "https://api.whatsapp.com/send?phone=\(clean)&text=\(msg.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? "")") else { return }
        UIApplication.shared.open(url, options: [:], completionHandler: nil)
    }

    // ── Add / Edit Sheet ──
    private func showAddEditSheet(agencyToEdit: [String: Any]?) {
        let isEdit = agencyToEdit != nil
        let alert = UIAlertController(
            title: isEdit ? "Edit Corporate Agency" : "Add Corporate Agency",
            message: "Configure agency contract, contact details, tier and portal login.",
            preferredStyle: .alert
        )

        alert.addTextField { tf in
            tf.placeholder = "Agency Name *"
            tf.text = agencyToEdit?["agencyName"] as? String
        }
        alert.addTextField { tf in
            tf.placeholder = "Contact Person *"
            tf.text = agencyToEdit?["contactPerson"] as? String
        }
        alert.addTextField { tf in
            tf.placeholder = "Phone (10 digits) *"
            tf.keyboardType = .phonePad
            tf.text = agencyToEdit?["phone"] as? String
        }
        alert.addTextField { tf in
            tf.placeholder = "Email Address"
            tf.keyboardType = .emailAddress
            tf.text = agencyToEdit?["email"] as? String
        }
        alert.addTextField { tf in
            tf.placeholder = "Commission Rate % (e.g., 15) *"
            tf.keyboardType = .decimalPad
            if let rate = agencyToEdit?["commissionRate"] as? Double {
                tf.text = String(format: "%.1f", rate)
            }
        }
        alert.addTextField { tf in
            tf.placeholder = "Tier (STANDARD, BRONZE, SILVER, GOLD, PLATINUM)"
            tf.text = (agencyToEdit?["agencyTier"] as? String) ?? "STANDARD"
        }
        alert.addTextField { tf in
            tf.placeholder = isEdit ? "Reset Password (leave blank to keep)" : "Portal Password (min 6 chars, optional)"
            tf.isSecureTextEntry = true
        }

        let saveAction = UIAlertAction(title: isEdit ? "Update" : "Save", style: .default) { [weak self] _ in
            guard let self = self else { return }
            let name = alert.textFields?[0].text?.trimmingCharacters(in: .whitespaces) ?? ""
            let contact = alert.textFields?[1].text?.trimmingCharacters(in: .whitespaces) ?? ""
            let phone = alert.textFields?[2].text?.trimmingCharacters(in: .whitespaces) ?? ""
            let email = alert.textFields?[3].text?.trimmingCharacters(in: .whitespaces) ?? ""
            let rateStr = alert.textFields?[4].text?.trimmingCharacters(in: .whitespaces) ?? "10"
            let tier = alert.textFields?[5].text?.trimmingCharacters(in: .whitespaces).uppercased() ?? "STANDARD"
            let password = alert.textFields?[6].text?.trimmingCharacters(in: .whitespaces) ?? ""

            if name.isEmpty || contact.isEmpty || phone.isEmpty {
                self.showToast("Please fill all required fields")
                return
            }

            self.submitAgency(
                id: agencyToEdit?["id"] as? String,
                name: name,
                contact: contact,
                phone: phone,
                email: email,
                rate: Double(rateStr) ?? 10.0,
                tier: tier,
                password: password
            )
        }

        alert.addAction(saveAction)
        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel, handler: nil))
        present(alert, animated: true, completion: nil)
    }

    private func submitAgency(id: String?, name: String, contact: String, phone: String, email: String, rate: Double, tier: String, password: String = "") {
        guard let token = getAuthToken(),
              let url = URL(string: "\(Self.baseUrl)/api/workspace/b2b/agencies") else { return }

        var request = URLRequest(url: url)
        request.httpMethod = id != nil ? "PATCH" : "POST"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue("token=\(token); auth-token=\(token); auth_token=\(token)", forHTTPHeaderField: "Cookie")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        var payload: [String: Any] = [
            "agencyName": name,
            "contactPerson": contact,
            "phone": phone,
            "email": email,
            "commissionRate": rate,
            "agencyTier": tier,
            "commissionType": "PERCENTAGE"
        ]
        if let id = id {
            payload["id"] = id
            payload["isActive"] = true
            if !password.isEmpty {
                payload["resetPassword"] = password
            }
        } else {
            if !password.isEmpty {
                payload["createLogin"] = true
                payload["loginEmail"] = email
                payload["loginPassword"] = password
            }
        }

        request.httpBody = try? JSONSerialization.data(withJSONObject: payload)

        URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            let code = (response as? HTTPURLResponse)?.statusCode ?? 0
            var errorMsg: String? = nil
            if let data = data, let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
                errorMsg = json["error"] as? String
            }
            DispatchQueue.main.async {
                guard let self = self else { return }
                if code >= 200 && code < 300 {
                    self.showToast(id != nil ? "Agency updated successfully!" : "Corporate agency created!")
                    self.loadAgenciesData(isManual: false)
                } else {
                    self.showToast(errorMsg ?? "Failed to save agency (HTTP \(code))")
                }
            }
        }.resume()
    }

    // ── Delete Confirmation ──
    private func confirmDeleteAgency(agency: [String: Any]) {
        let name = agency["agencyName"] as? String ?? "this agency"
        guard let id = agency["id"] as? String else { return }

        let alert = UIAlertController(
            title: "Delete Agency",
            message: "Are you sure you want to remove \(name)? This will unlink associated contracts.",
            preferredStyle: .actionSheet
        )
        alert.addAction(UIAlertAction(title: "Delete", style: .destructive) { [weak self] _ in
            self?.deleteAgency(id: id)
        })
        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel, handler: nil))
        present(alert, animated: true, completion: nil)
    }

    private func deleteAgency(id: String) {
        guard let token = getAuthToken(),
              let url = URL(string: "\(Self.baseUrl)/api/workspace/b2b/agencies?id=\(id)") else { return }

        var request = URLRequest(url: url)
        request.httpMethod = "DELETE"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue("token=\(token); auth-token=\(token); auth_token=\(token)", forHTTPHeaderField: "Cookie")

        URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            let code = (response as? HTTPURLResponse)?.statusCode ?? 0
            DispatchQueue.main.async {
                if code >= 200 && code < 300 {
                    self?.showToast("Agency removed successfully")
                    self?.loadAgenciesData(isManual: false)
                } else {
                    self?.showToast("Failed to remove agency")
                }
            }
        }.resume()
    }

    // ── Agency Ledger Sheet ──
    private func showLedgerSheet(agency: [String: Any]) {
        let name = agency["agencyName"] as? String ?? "Agency"
        let earned = (agency["totalCommission"] as? Double) ?? ((agency["stats"] as? [String: Any])?["totalCommission"] as? Double) ?? 0.0
        let due = (agency["pendingCommission"] as? Double) ?? ((agency["stats"] as? [String: Any])?["pendingCommission"] as? Double) ?? 0.0
        let paid = (agency["paidCommission"] as? Double) ?? max(0, earned - due)

        let alert = UIAlertController(
            title: "\(name) Ledger",
            message: "Total Commission: ₹\(String(format: "%,.0f", earned))\nPaid Out: ₹\(String(format: "%,.0f", paid))\nBalance Due: ₹\(String(format: "%,.0f", due))",
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
            toast.bottomAnchor.constraint(equalTo: fabAddAgency.topAnchor, constant: -16),
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
//  AGENCY CARD CELL
// ─────────────────────────────────────────────────────────────────────────────
class AgencyCardCell: UITableViewCell {

    var onCall: ((String) -> Void)?
    var onWhatsApp: ((String, String) -> Void)?
    var onLedger: (() -> Void)?
    var onEdit: (() -> Void)?
    var onDelete: (() -> Void)?

    private let cardView        = UIView()
    private let tierBadge       = UILabel()
    private let portalBadge     = UILabel()
    private let commRatePill    = UILabel()
    private let nameLabel       = UILabel()
    private let contactLabel    = UILabel()
    private let emailLabel      = UILabel()
    private let panLabel        = UILabel()

    private let testsCountLbl   = UILabel()
    private let billedVolumeLbl = UILabel()
    private let pendingDueLbl   = UILabel()

    private let callBtn         = UIButton(type: .system)
    private let waBtn           = UIButton(type: .system)
    private let ledgerBtn       = UIButton(type: .system)
    private let editBtn         = UIButton(type: .system)
    private let deleteBtn       = UIButton(type: .system)

    private var currentPhone: String = ""
    private var currentContact: String = ""

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

        tierBadge.font = .systemFont(ofSize: 10, weight: .bold)
        tierBadge.layer.cornerRadius = 4
        tierBadge.clipsToBounds = true
        tierBadge.textAlignment = .center

        portalBadge.font = .systemFont(ofSize: 10, weight: .bold)
        portalBadge.layer.cornerRadius = 4
        portalBadge.clipsToBounds = true
        portalBadge.textAlignment = .center

        commRatePill.font = .systemFont(ofSize: 11, weight: .bold)
        commRatePill.textColor = UIColor(red: 0.263, green: 0.220, blue: 0.792, alpha: 1)
        commRatePill.backgroundColor = UIColor(red: 0.933, green: 0.949, blue: 1.0, alpha: 1)
        commRatePill.layer.cornerRadius = 4
        commRatePill.clipsToBounds = true
        commRatePill.textAlignment = .center

        let spacer = UIView()
        topRow.addArrangedSubview(tierBadge)
        topRow.addArrangedSubview(portalBadge)
        topRow.addArrangedSubview(spacer)
        topRow.addArrangedSubview(commRatePill)
        cardView.addSubview(topRow)

        // 2. Name & Contact
        nameLabel.translatesAutoresizingMaskIntoConstraints = false
        nameLabel.font = .systemFont(ofSize: 15, weight: .bold)
        nameLabel.textColor = UIColor(red: 0.059, green: 0.090, blue: 0.165, alpha: 1)
        cardView.addSubview(nameLabel)

        contactLabel.translatesAutoresizingMaskIntoConstraints = false
        contactLabel.font = .systemFont(ofSize: 12, weight: .medium)
        contactLabel.textColor = UIColor(red: 0.392, green: 0.455, blue: 0.545, alpha: 1)
        cardView.addSubview(contactLabel)

        emailLabel.translatesAutoresizingMaskIntoConstraints = false
        emailLabel.font = .systemFont(ofSize: 11.5)
        emailLabel.textColor = UIColor(red: 0.278, green: 0.333, blue: 0.412, alpha: 1)
        cardView.addSubview(emailLabel)

        panLabel.translatesAutoresizingMaskIntoConstraints = false
        panLabel.font = .systemFont(ofSize: 11)
        panLabel.textColor = UIColor(red: 0.580, green: 0.639, blue: 0.722, alpha: 1)
        cardView.addSubview(panLabel)

        // 3. Bento Box
        let bentoBox = UIStackView()
        bentoBox.translatesAutoresizingMaskIntoConstraints = false
        bentoBox.axis = .horizontal
        bentoBox.distribution = .fillEqually
        bentoBox.backgroundColor = UIColor(red: 0.973, green: 0.980, blue: 0.988, alpha: 1)
        bentoBox.layer.cornerRadius = 8
        bentoBox.layoutMargins = UIEdgeInsets(top: 8, left: 10, bottom: 8, right: 10)
        bentoBox.isLayoutMarginsRelativeArrangement = true

        let col1 = createBentoCol(title: "TOTAL TESTS", valLbl: testsCountLbl, valColor: UIColor(red: 0.059, green: 0.090, blue: 0.165, alpha: 1))
        let col2 = createBentoCol(title: "BILLED VOL", valLbl: billedVolumeLbl, valColor: UIColor(red: 0.051, green: 0.580, blue: 0.533, alpha: 1))
        let col3 = createBentoCol(title: "PENDING DUE", valLbl: pendingDueLbl, valColor: UIColor(red: 0.851, green: 0.467, blue: 0.024, alpha: 1))

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

            contactLabel.topAnchor.constraint(equalTo: nameLabel.bottomAnchor, constant: 2),
            contactLabel.leadingAnchor.constraint(equalTo: nameLabel.leadingAnchor),
            contactLabel.trailingAnchor.constraint(equalTo: nameLabel.trailingAnchor),

            emailLabel.topAnchor.constraint(equalTo: contactLabel.bottomAnchor, constant: 4),
            emailLabel.leadingAnchor.constraint(equalTo: nameLabel.leadingAnchor),

            panLabel.trailingAnchor.constraint(equalTo: cardView.trailingAnchor, constant: -14),
            panLabel.centerYAnchor.constraint(equalTo: emailLabel.centerYAnchor),

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

    func configure(agency: [String: Any]) {
        let name = agency["agencyName"] as? String ?? "Unnamed Agency"
        let contact = agency["contactPerson"] as? String ?? "Manager"
        let phone = agency["phone"] as? String ?? ""
        let email = agency["email"] as? String ?? "No email provided"
        let pan = agency["panNumber"] as? String ?? "N/A"
        let tier = (agency["agencyTier"] as? String ?? "STANDARD").uppercased()
        let rate = agency["commissionRate"] as? Double ?? 10.0

        currentPhone = phone
        currentContact = contact

        nameLabel.text = name
        contactLabel.text = "Contact: \(contact)\(phone.isEmpty ? "" : " • \(phone)")"
        emailLabel.text = email
        panLabel.text = "PAN: \(pan)"

        // Tier badge
        switch tier {
        case "BRONZE":
            tierBadge.text = "  BRONZE  "
            tierBadge.textColor = UIColor(red: 0.706, green: 0.325, blue: 0.035, alpha: 1)
            tierBadge.backgroundColor = UIColor(red: 0.996, green: 0.953, blue: 0.780, alpha: 1)
        case "SILVER", "TIER_1":
            tierBadge.text = "  SILVER  "
            tierBadge.textColor = UIColor(red: 0.008, green: 0.518, blue: 0.780, alpha: 1)
            tierBadge.backgroundColor = UIColor(red: 0.878, green: 0.949, blue: 0.996, alpha: 1)
        case "GOLD", "TIER_2":
            tierBadge.text = "  GOLD  "
            tierBadge.textColor = UIColor(red: 0.851, green: 0.467, blue: 0.024, alpha: 1)
            tierBadge.backgroundColor = UIColor(red: 0.996, green: 0.953, blue: 0.780, alpha: 1)
        case "PLATINUM", "TIER_3":
            tierBadge.text = "  PLATINUM  "
            tierBadge.textColor = UIColor(red: 0.486, green: 0.227, blue: 0.929, alpha: 1)
            tierBadge.backgroundColor = UIColor(red: 0.929, green: 0.914, blue: 0.996, alpha: 1)
        default:
            tierBadge.text = "  STANDARD  "
            tierBadge.textColor = UIColor(red: 0.392, green: 0.455, blue: 0.545, alpha: 1)
            tierBadge.backgroundColor = UIColor(red: 0.945, green: 0.961, blue: 0.976, alpha: 1)
        }

        // Portal badge
        let hasUser = (agency["hasLogin"] as? Bool) ?? (agency["user"] != nil && !(agency["user"] is NSNull))
        if hasUser {
            portalBadge.text = "  PORTAL ACTIVE  "
            portalBadge.textColor = UIColor(red: 0.020, green: 0.588, blue: 0.412, alpha: 1)
            portalBadge.backgroundColor = UIColor(red: 0.820, green: 0.980, blue: 0.898, alpha: 1)
        } else {
            portalBadge.text = "  NO PORTAL LOGIN  "
            portalBadge.textColor = UIColor(red: 0.580, green: 0.639, blue: 0.722, alpha: 1)
            portalBadge.backgroundColor = UIColor(red: 0.945, green: 0.961, blue: 0.976, alpha: 1)
        }

        let commType = agency["commissionType"] as? String ?? "PERCENTAGE"
        if commType.caseInsensitiveCompare("FIXED") == .orderedSame {
            commRatePill.text = "  ₹\(String(format: "%,.0f", rate)) Fixed  "
        } else {
            commRatePill.text = "  \(String(format: "%.1f", rate))% Comm  "
        }

        let tests = (agency["totalReferrals"] as? Int) ?? ((agency["stats"] as? [String: Any])?["totalTests"] as? Int) ?? 0
        let earned = (agency["totalCommission"] as? Double) ?? ((agency["stats"] as? [String: Any])?["totalCommission"] as? Double) ?? 0.0
        let pending = (agency["pendingCommission"] as? Double) ?? ((agency["stats"] as? [String: Any])?["pendingCommission"] as? Double) ?? 0.0

        var billed: Double = 0.0
        if let comms = agency["commissions"] as? [[String: Any]] {
            for c in comms {
                billed += (c["testPrice"] as? Double) ?? ((c["testPrice"] as? NSNumber)?.doubleValue ?? 0.0)
            }
        }
        if billed == 0.0 {
            billed = (agency["totalBilled"] as? Double) ?? ((agency["stats"] as? [String: Any])?["totalBilled"] as? Double) ?? earned
        }

        testsCountLbl.text = "\(tests)"
        billedVolumeLbl.text = "₹" + String(format: "%,.0f", billed)
        pendingDueLbl.text = "₹" + String(format: "%,.0f", pending)
    }

    @objc private func callTapped() { onCall?(currentPhone) }
    @objc private func waTapped() { onWhatsApp?(currentPhone, currentContact) }
    @objc private func ledgerTapped() { onLedger?() }
    @objc private func editTapped() { onEdit?() }
    @objc private func deleteTapped() { onDelete?() }
}
