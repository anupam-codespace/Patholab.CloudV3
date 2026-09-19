import UIKit

/**
 * SupportViewController
 * ─────────────────────
 * Fully native 24/7 Help & Support console for iOS.
 * Thoroughly mirroring all web and Android support capabilities:
 *  - Fused Deep Navy Hero Header with status bar integration
 *  - Real-time KPI cards for Open Requests, In Progress, and Resolved tickets
 *  - Interactive filter chips (All, Open, In Progress, Resolved) and instant search
 *  - Ticket cards with monospace ticket IDs, category/priority/status badges, and message counters
 *  - Two-way conversation detail modal with live 5s polling timer and reply composer
 *  - Create ticket modal with Category & Priority selectors, subject, description, and SLA notice
 *  - Collapsible clinical workflow FAQs accordion
 *  - Direct assistance shortcuts (Priority Hotline, WhatsApp Concierge, and Official Email Desk)
 *  - Strict zero-emoji visual system using Apple SF Symbols and modern iOS typography.
 */
class SupportViewController: UIViewController, UITextFieldDelegate {

    private static let baseUrl = "https://app.patholab.cloud"
    private static let supportPhone = "+918402010207"
    private static let supportEmail = "support@patholab.cloud"
    private static let whatsappNumber = "918402010207"

    // Fused Hero Header
    private let heroHeaderView    = UIView()
    private let heroGradientLayer = CAGradientLayer()
    private let backBtn           = UIButton(type: .system)
    private let titleLabel        = UILabel()
    private let subtitleLabel     = UILabel()
    private let headerNewTicketBtn = UIButton(type: .system)

    // KPI Stat Cards
    private let kpiOpenCard       = UIView()
    private let kpiOpenCount      = UILabel()
    private let kpiProgressCard   = UIView()
    private let kpiProgressCount  = UILabel()
    private let kpiResolvedCard   = UIView()
    private let kpiResolvedCount  = UILabel()

    // Scrollable Content
    private let scrollView        = UIScrollView()
    private let refreshControl    = UIRefreshControl()
    private let contentStack      = UIStackView()

    // Search & Filter Tabs
    private let searchContainer   = UIView()
    private let searchField       = UITextField()
    private let clearSearchBtn    = UIButton(type: .system)
    private let tabsScroll        = UIScrollView()
    private let tabsStack         = UIStackView()
    private let tabAll            = UIButton(type: .system)
    private let tabOpen           = UIButton(type: .system)
    private let tabProgress       = UIButton(type: .system)
    private let tabResolved       = UIButton(type: .system)

    // Tickets Section
    private let sectionHeader     = UIView()
    private let sectionTitleLabel = UILabel()
    private let totalCountLabel   = UILabel()
    private let ticketsStack      = UIStackView()
    private let emptyView         = UIView()
    private let loadingIndicator  = UIActivityIndicatorView(style: .medium)

    // State
    private var allTickets: [[String: Any]] = []
    private var currentFilter: String = "ALL" // ALL, OPEN, IN_PROGRESS, RESOLVED
    private var searchQuery: String = ""

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 0.973, green: 0.980, blue: 0.988, alpha: 1) // #F8FAFC

        setupHeroHeader()
        setupContent()
        setupRefresh()
        fetchTickets()
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        heroGradientLayer.frame = heroHeaderView.bounds
    }

    override var preferredStatusBarStyle: UIStatusBarStyle {
        return .lightContent
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MARK: – Hero Header & KPI Cards
    // ─────────────────────────────────────────────────────────────────────────
    private func setupHeroHeader() {
        heroHeaderView.translatesAutoresizingMaskIntoConstraints = false
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
        view.addSubview(heroHeaderView)

        // Tier 1: Top Navigation Bar
        backBtn.setImage(UIImage(systemName: "chevron.left"), for: .normal)
        backBtn.tintColor = .white
        backBtn.backgroundColor = UIColor.white.withAlphaComponent(0.20)
        backBtn.layer.cornerRadius = 19
        backBtn.layer.borderWidth = 1
        backBtn.layer.borderColor = UIColor.white.withAlphaComponent(0.30).cgColor
        backBtn.translatesAutoresizingMaskIntoConstraints = false
        backBtn.addTarget(self, action: #selector(backTapped), for: .touchUpInside)

        // New Ticket Button — White Capsule CTA
        headerNewTicketBtn.setTitle("+ New Ticket", for: .normal)
        headerNewTicketBtn.titleLabel?.font = .systemFont(ofSize: 13.5, weight: .bold)
        headerNewTicketBtn.setTitleColor(UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1), for: .normal)
        headerNewTicketBtn.backgroundColor = .white
        headerNewTicketBtn.layer.cornerRadius = 18
        headerNewTicketBtn.layer.shadowColor = UIColor.black.cgColor
        headerNewTicketBtn.layer.shadowOpacity = 0.12
        headerNewTicketBtn.layer.shadowRadius = 4
        headerNewTicketBtn.layer.shadowOffset = CGSize(width: 0, height: 2)
        headerNewTicketBtn.contentEdgeInsets = UIEdgeInsets(top: 8, left: 14, bottom: 8, right: 16)
        headerNewTicketBtn.translatesAutoresizingMaskIntoConstraints = false
        headerNewTicketBtn.addTarget(self, action: #selector(newTicketTapped), for: .touchUpInside)

        let topBar = UIView()
        topBar.translatesAutoresizingMaskIntoConstraints = false
        topBar.addSubview(backBtn)
        topBar.addSubview(headerNewTicketBtn)

        // Tier 2: Hero Greeting Title & Subtitle (Full Unrestricted Width)
        titleLabel.text = "Help & Support"
        titleLabel.font = .systemFont(ofSize: 24, weight: .heavy)
        titleLabel.textColor = .white

        subtitleLabel.text = "24/7 Dedicated Assistance Desk & Ticket Tracker"
        subtitleLabel.font = .systemFont(ofSize: 12.5, weight: .medium)
        subtitleLabel.textColor = UIColor(red: 0.780, green: 0.875, blue: 1.0, alpha: 1) // #C7DFFF

        let titleStack = UIStackView(arrangedSubviews: [titleLabel, subtitleLabel])
        titleStack.axis = .vertical
        titleStack.spacing = 3
        titleStack.translatesAutoresizingMaskIntoConstraints = false

        // Tier 3: 3 Frosted Glass KPI Bento Cards
        let kpiStack = UIStackView()
        kpiStack.axis = .horizontal
        kpiStack.distribution = .fillEqually
        kpiStack.spacing = 8
        kpiStack.translatesAutoresizingMaskIntoConstraints = false

        setupKpiCard(kpiOpenCard, countLabel: kpiOpenCount, tag: "OPEN", sub: "Awaiting review", dotColor: UIColor(red: 0.988, green: 0.647, blue: 0.647, alpha: 1), textColor: UIColor(red: 0.988, green: 0.647, blue: 0.647, alpha: 1))
        setupKpiCard(kpiProgressCard, countLabel: kpiProgressCount, tag: "PROGRESS", sub: "Being handled", dotColor: UIColor(red: 0.996, green: 0.902, blue: 0.541, alpha: 1), textColor: UIColor(red: 0.996, green: 0.902, blue: 0.541, alpha: 1))
        setupKpiCard(kpiResolvedCard, countLabel: kpiResolvedCount, tag: "RESOLVED", sub: "Completed", dotColor: UIColor(red: 0.655, green: 0.953, blue: 0.816, alpha: 1), textColor: UIColor(red: 0.655, green: 0.953, blue: 0.816, alpha: 1))

        kpiOpenCard.addGestureRecognizer(UITapGestureRecognizer(target: self, action: #selector(kpiOpenTapped)))
        kpiProgressCard.addGestureRecognizer(UITapGestureRecognizer(target: self, action: #selector(kpiProgressTapped)))
        kpiResolvedCard.addGestureRecognizer(UITapGestureRecognizer(target: self, action: #selector(kpiResolvedTapped)))

        kpiStack.addArrangedSubview(kpiOpenCard)
        kpiStack.addArrangedSubview(kpiProgressCard)
        kpiStack.addArrangedSubview(kpiResolvedCard)

        heroHeaderView.addSubview(topBar)
        heroHeaderView.addSubview(titleStack)
        heroHeaderView.addSubview(kpiStack)

        NSLayoutConstraint.activate([
            heroHeaderView.topAnchor.constraint(equalTo: view.topAnchor),
            heroHeaderView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            heroHeaderView.trailingAnchor.constraint(equalTo: view.trailingAnchor),

            topBar.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 4),
            topBar.leadingAnchor.constraint(equalTo: heroHeaderView.leadingAnchor, constant: 18),
            topBar.trailingAnchor.constraint(equalTo: heroHeaderView.trailingAnchor, constant: -18),
            topBar.heightAnchor.constraint(equalToConstant: 42),

            backBtn.leadingAnchor.constraint(equalTo: topBar.leadingAnchor),
            backBtn.centerYAnchor.constraint(equalTo: topBar.centerYAnchor),
            backBtn.widthAnchor.constraint(equalToConstant: 38),
            backBtn.heightAnchor.constraint(equalToConstant: 38),

            headerNewTicketBtn.trailingAnchor.constraint(equalTo: topBar.trailingAnchor),
            headerNewTicketBtn.centerYAnchor.constraint(equalTo: topBar.centerYAnchor),
            headerNewTicketBtn.heightAnchor.constraint(equalToConstant: 36),

            titleStack.topAnchor.constraint(equalTo: topBar.bottomAnchor, constant: 14),
            titleStack.leadingAnchor.constraint(equalTo: heroHeaderView.leadingAnchor, constant: 18),
            titleStack.trailingAnchor.constraint(equalTo: heroHeaderView.trailingAnchor, constant: -18),

            kpiStack.topAnchor.constraint(equalTo: titleStack.bottomAnchor, constant: 16),
            kpiStack.leadingAnchor.constraint(equalTo: heroHeaderView.leadingAnchor, constant: 18),
            kpiStack.trailingAnchor.constraint(equalTo: heroHeaderView.trailingAnchor, constant: -18),
            kpiStack.bottomAnchor.constraint(equalTo: heroHeaderView.bottomAnchor, constant: -20)
        ])
    }

    private func setupKpiCard(_ card: UIView, countLabel: UILabel, tag: String, sub: String, dotColor: UIColor, textColor: UIColor) {
        card.backgroundColor = UIColor.white.withAlphaComponent(0.15)
        card.layer.cornerRadius = 16
        card.layer.borderWidth = 1
        card.layer.borderColor = UIColor.white.withAlphaComponent(0.24).cgColor
        card.layer.masksToBounds = true
        card.translatesAutoresizingMaskIntoConstraints = false

        let dotView = UIView()
        dotView.backgroundColor = dotColor
        dotView.layer.cornerRadius = 3
        dotView.translatesAutoresizingMaskIntoConstraints = false
        dotView.widthAnchor.constraint(equalToConstant: 6).isActive = true
        dotView.heightAnchor.constraint(equalToConstant: 6).isActive = true

        let tagLbl = UILabel()
        tagLbl.text = tag
        tagLbl.font = .systemFont(ofSize: 10.5, weight: .bold)
        tagLbl.textColor = textColor
        tagLbl.translatesAutoresizingMaskIntoConstraints = false

        let tagRow = UIStackView(arrangedSubviews: [dotView, tagLbl])
        tagRow.axis = .horizontal
        tagRow.spacing = 5
        tagRow.alignment = .center
        tagRow.translatesAutoresizingMaskIntoConstraints = false

        countLabel.text = "0"
        countLabel.font = .systemFont(ofSize: 21, weight: .heavy)
        countLabel.textColor = .white
        countLabel.translatesAutoresizingMaskIntoConstraints = false

        let subLbl = UILabel()
        subLbl.text = sub
        subLbl.font = .systemFont(ofSize: 10, weight: .medium)
        subLbl.textColor = UIColor(red: 0.780, green: 0.875, blue: 1.0, alpha: 1) // #C7DFFF
        subLbl.translatesAutoresizingMaskIntoConstraints = false

        let stack = UIStackView(arrangedSubviews: [tagRow, countLabel, subLbl])
        stack.axis = .vertical
        stack.spacing = 2
        stack.alignment = .leading
        stack.translatesAutoresizingMaskIntoConstraints = false
        card.addSubview(stack)

        NSLayoutConstraint.activate([
            stack.topAnchor.constraint(equalTo: card.topAnchor, constant: 11),
            stack.bottomAnchor.constraint(equalTo: card.bottomAnchor, constant: -11),
            stack.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 12),
            stack.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -12)
        ])
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MARK: – Main Scrollable Body
    // ─────────────────────────────────────────────────────────────────────────
    private func setupContent() {
        scrollView.translatesAutoresizingMaskIntoConstraints = false
        scrollView.alwaysBounceVertical = true
        view.addSubview(scrollView)

        contentStack.axis = .vertical
        contentStack.spacing = 14
        contentStack.translatesAutoresizingMaskIntoConstraints = false
        scrollView.addSubview(contentStack)

        NSLayoutConstraint.activate([
            scrollView.topAnchor.constraint(equalTo: heroHeaderView.bottomAnchor, constant: 6),
            scrollView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            scrollView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            scrollView.bottomAnchor.constraint(equalTo: view.bottomAnchor),

            contentStack.topAnchor.constraint(equalTo: scrollView.topAnchor, constant: 12),
            contentStack.leadingAnchor.constraint(equalTo: scrollView.leadingAnchor, constant: 16),
            contentStack.trailingAnchor.constraint(equalTo: scrollView.trailingAnchor, constant: -16),
            contentStack.bottomAnchor.constraint(equalTo: scrollView.bottomAnchor, constant: -30),
            contentStack.widthAnchor.constraint(equalTo: scrollView.widthAnchor, constant: -32)
        ])

        setupSearchAndTabs()
        setupTicketsHeader()
        setupTicketsContainer()
        setupContactChannelsSection()
    }

    private func setupSearchAndTabs() {
        // Search bar
        searchContainer.backgroundColor = .white
        searchContainer.layer.cornerRadius = 12
        searchContainer.layer.borderWidth = 1
        searchContainer.layer.borderColor = UIColor(red: 0.886, green: 0.910, blue: 0.941, alpha: 1).cgColor // #E2E8F0
        searchContainer.translatesAutoresizingMaskIntoConstraints = false

        let searchIcon = UIImageView(image: UIImage(systemName: "magnifyingglass"))
        searchIcon.tintColor = UIColor(red: 0.580, green: 0.639, blue: 0.722, alpha: 1)
        searchIcon.contentMode = .scaleAspectFit
        searchIcon.translatesAutoresizingMaskIntoConstraints = false

        searchField.placeholder = "Search tickets by subject or ID..."
        searchField.font = .systemFont(ofSize: 13)
        searchField.textColor = UIColor(red: 0.059, green: 0.090, blue: 0.165, alpha: 1)
        searchField.autocorrectionType = .no
        searchField.returnKeyType = .search
        searchField.delegate = self
        searchField.addTarget(self, action: #selector(searchChanged), for: .editingChanged)
        searchField.translatesAutoresizingMaskIntoConstraints = false

        clearSearchBtn.setImage(UIImage(systemName: "xmark.circle.fill"), for: .normal)
        clearSearchBtn.tintColor = UIColor(red: 0.580, green: 0.639, blue: 0.722, alpha: 1)
        clearSearchBtn.isHidden = true
        clearSearchBtn.translatesAutoresizingMaskIntoConstraints = false
        clearSearchBtn.addTarget(self, action: #selector(clearSearchTapped), for: .touchUpInside)

        searchContainer.addSubview(searchIcon)
        searchContainer.addSubview(searchField)
        searchContainer.addSubview(clearSearchBtn)

        NSLayoutConstraint.activate([
            searchContainer.heightAnchor.constraint(equalToConstant: 44),
            searchIcon.leadingAnchor.constraint(equalTo: searchContainer.leadingAnchor, constant: 12),
            searchIcon.centerYAnchor.constraint(equalTo: searchContainer.centerYAnchor),
            searchIcon.widthAnchor.constraint(equalToConstant: 18),
            searchIcon.heightAnchor.constraint(equalToConstant: 18),

            searchField.leadingAnchor.constraint(equalTo: searchIcon.trailingAnchor, constant: 8),
            searchField.trailingAnchor.constraint(equalTo: clearSearchBtn.leadingAnchor, constant: -4),
            searchField.topAnchor.constraint(equalTo: searchContainer.topAnchor),
            searchField.bottomAnchor.constraint(equalTo: searchContainer.bottomAnchor),

            clearSearchBtn.trailingAnchor.constraint(equalTo: searchContainer.trailingAnchor, constant: -8),
            clearSearchBtn.centerYAnchor.constraint(equalTo: searchContainer.centerYAnchor),
            clearSearchBtn.widthAnchor.constraint(equalToConstant: 24),
            clearSearchBtn.heightAnchor.constraint(equalToConstant: 24)
        ])

        contentStack.addArrangedSubview(searchContainer)

        // Filter Tabs
        tabsScroll.showsHorizontalScrollIndicator = false
        tabsScroll.translatesAutoresizingMaskIntoConstraints = false

        tabsStack.axis = .horizontal
        tabsStack.spacing = 8
        tabsStack.translatesAutoresizingMaskIntoConstraints = false
        tabsScroll.addSubview(tabsStack)

        setupFilterTab(tabAll, title: "All Tickets", filter: "ALL")
        setupFilterTab(tabOpen, title: "Open", filter: "OPEN")
        setupFilterTab(tabProgress, title: "In Progress", filter: "IN_PROGRESS")
        setupFilterTab(tabResolved, title: "Resolved", filter: "RESOLVED")

        tabsStack.addArrangedSubview(tabAll)
        tabsStack.addArrangedSubview(tabOpen)
        tabsStack.addArrangedSubview(tabProgress)
        tabsStack.addArrangedSubview(tabResolved)

        NSLayoutConstraint.activate([
            tabsScroll.heightAnchor.constraint(equalToConstant: 34),
            tabsStack.topAnchor.constraint(equalTo: tabsScroll.topAnchor),
            tabsStack.bottomAnchor.constraint(equalTo: tabsScroll.bottomAnchor),
            tabsStack.leadingAnchor.constraint(equalTo: tabsScroll.leadingAnchor),
            tabsStack.trailingAnchor.constraint(equalTo: tabsScroll.trailingAnchor),
            tabsStack.heightAnchor.constraint(equalTo: tabsScroll.heightAnchor)
        ])

        contentStack.addArrangedSubview(tabsScroll)
        updateFilterTabsUI()
    }

    private func setupFilterTab(_ btn: UIButton, title: String, filter: String) {
        btn.setTitle(title, for: .normal)
        btn.titleLabel?.font = .systemFont(ofSize: 12, weight: .bold)
        btn.layer.cornerRadius = 16
        btn.contentEdgeInsets = UIEdgeInsets(top: 6, left: 14, bottom: 6, right: 14)
        btn.translatesAutoresizingMaskIntoConstraints = false
        btn.tag = filter == "ALL" ? 0 : (filter == "OPEN" ? 1 : (filter == "IN_PROGRESS" ? 2 : 3))
        btn.addTarget(self, action: #selector(tabTapped(_:)), for: .touchUpInside)
    }

    private func updateFilterTabsUI() {
        let activeBg = UIColor(red: 0.145, green: 0.388, blue: 0.922, alpha: 1) // #2563EB
        let inactiveBg = UIColor.white
        let inactiveBorder = UIColor(red: 0.886, green: 0.910, blue: 0.941, alpha: 1).cgColor

        let update = { (btn: UIButton, isActive: Bool) in
            btn.backgroundColor = isActive ? activeBg : inactiveBg
            btn.setTitleColor(isActive ? .white : UIColor(red: 0.278, green: 0.333, blue: 0.412, alpha: 1), for: .normal)
            btn.layer.borderWidth = isActive ? 0 : 1
            btn.layer.borderColor = isActive ? nil : inactiveBorder
        }

        update(tabAll, currentFilter == "ALL")
        update(tabOpen, currentFilter == "OPEN")
        update(tabProgress, currentFilter == "IN_PROGRESS")
        update(tabResolved, currentFilter == "RESOLVED")
    }

    private func setupTicketsHeader() {
        sectionHeader.translatesAutoresizingMaskIntoConstraints = false

        sectionTitleLabel.text = "My Tickets"
        sectionTitleLabel.font = .systemFont(ofSize: 16, weight: .bold)
        sectionTitleLabel.textColor = UIColor(red: 0.059, green: 0.090, blue: 0.165, alpha: 1)
        sectionTitleLabel.translatesAutoresizingMaskIntoConstraints = false

        totalCountLabel.text = "0 tickets"
        totalCountLabel.font = .systemFont(ofSize: 12, weight: .medium)
        totalCountLabel.textColor = UIColor(red: 0.392, green: 0.455, blue: 0.545, alpha: 1)
        totalCountLabel.translatesAutoresizingMaskIntoConstraints = false

        sectionHeader.addSubview(sectionTitleLabel)
        sectionHeader.addSubview(totalCountLabel)

        NSLayoutConstraint.activate([
            sectionHeader.heightAnchor.constraint(equalToConstant: 24),
            sectionTitleLabel.leadingAnchor.constraint(equalTo: sectionHeader.leadingAnchor),
            sectionTitleLabel.centerYAnchor.constraint(equalTo: sectionHeader.centerYAnchor),
            totalCountLabel.trailingAnchor.constraint(equalTo: sectionHeader.trailingAnchor),
            totalCountLabel.centerYAnchor.constraint(equalTo: sectionHeader.centerYAnchor)
        ])

        contentStack.addArrangedSubview(sectionHeader)
    }

    private func setupTicketsContainer() {
        ticketsStack.axis = .vertical
        ticketsStack.spacing = 10
        ticketsStack.translatesAutoresizingMaskIntoConstraints = false
        contentStack.addArrangedSubview(ticketsStack)

        loadingIndicator.hidesWhenStopped = true
        loadingIndicator.translatesAutoresizingMaskIntoConstraints = false
        contentStack.addArrangedSubview(loadingIndicator)

        // Empty state view
        emptyView.backgroundColor = .white
        emptyView.layer.cornerRadius = 16
        emptyView.layer.borderWidth = 1
        emptyView.layer.borderColor = UIColor(red: 0.886, green: 0.910, blue: 0.941, alpha: 1).cgColor
        emptyView.isHidden = true
        emptyView.translatesAutoresizingMaskIntoConstraints = false

        let emptyIcon = UIImageView(image: UIImage(systemName: "lifepreserver"))
        emptyIcon.tintColor = UIColor(red: 0.580, green: 0.639, blue: 0.722, alpha: 1)
        emptyIcon.contentMode = .scaleAspectFit
        emptyIcon.translatesAutoresizingMaskIntoConstraints = false

        let emptyTitle = UILabel()
        emptyTitle.text = "No Support Tickets Found"
        emptyTitle.font = .systemFont(ofSize: 15, weight: .bold)
        emptyTitle.textColor = UIColor(red: 0.059, green: 0.090, blue: 0.165, alpha: 1)
        emptyTitle.textAlignment = .center

        let emptySub = UILabel()
        emptySub.text = "You have no support requests matching this view. Need assistance? Create a ticket below."
        emptySub.font = .systemFont(ofSize: 12)
        emptySub.textColor = UIColor(red: 0.392, green: 0.455, blue: 0.545, alpha: 1)
        emptySub.textAlignment = .center
        emptySub.numberOfLines = 2

        let emptyCreateBtn = UIButton(type: .system)
        emptyCreateBtn.setTitle("Create New Ticket", for: .normal)
        emptyCreateBtn.titleLabel?.font = .systemFont(ofSize: 13, weight: .bold)
        emptyCreateBtn.setTitleColor(.white, for: .normal)
        emptyCreateBtn.backgroundColor = UIColor(red: 0.145, green: 0.388, blue: 0.922, alpha: 1)
        emptyCreateBtn.layer.cornerRadius = 12
        emptyCreateBtn.contentEdgeInsets = UIEdgeInsets(top: 10, left: 18, bottom: 10, right: 18)
        emptyCreateBtn.translatesAutoresizingMaskIntoConstraints = false
        emptyCreateBtn.addTarget(self, action: #selector(newTicketTapped), for: .touchUpInside)

        let stack = UIStackView(arrangedSubviews: [emptyIcon, emptyTitle, emptySub, emptyCreateBtn])
        stack.axis = .vertical
        stack.spacing = 10
        stack.alignment = .center
        stack.translatesAutoresizingMaskIntoConstraints = false
        emptyView.addSubview(stack)

        NSLayoutConstraint.activate([
            emptyIcon.widthAnchor.constraint(equalToConstant: 44),
            emptyIcon.heightAnchor.constraint(equalToConstant: 44),
            stack.topAnchor.constraint(equalTo: emptyView.topAnchor, constant: 28),
            stack.bottomAnchor.constraint(equalTo: emptyView.bottomAnchor, constant: -28),
            stack.leadingAnchor.constraint(equalTo: emptyView.leadingAnchor, constant: 20),
            stack.trailingAnchor.constraint(equalTo: emptyView.trailingAnchor, constant: -20)
        ])

        contentStack.addArrangedSubview(emptyView)
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MARK: – Direct Assistance Channels Section (Redesigned Luxury UI)
    // ─────────────────────────────────────────────────────────────────────────
    private func setupContactChannelsSection() {
        let card = UIView()
        card.backgroundColor = .white
        card.layer.cornerRadius = 18
        card.layer.borderWidth = 1
        card.layer.borderColor = UIColor(red: 0.886, green: 0.910, blue: 0.941, alpha: 1).cgColor // #E2E8F0
        card.layer.shadowColor = UIColor.black.cgColor
        card.layer.shadowOpacity = 0.04
        card.layer.shadowRadius = 8
        card.layer.shadowOffset = CGSize(width: 0, height: 2)
        card.translatesAutoresizingMaskIntoConstraints = false

        // Header Row: Title & Subtitle on left, Live Status Pill on right
        let headerRow = UIView()
        headerRow.translatesAutoresizingMaskIntoConstraints = false

        let titleLabel = UILabel()
        titleLabel.text = "Direct Assistance Channels"
        titleLabel.font = .systemFont(ofSize: 15.5, weight: .bold)
        titleLabel.textColor = UIColor(red: 0.059, green: 0.090, blue: 0.165, alpha: 1) // #0F172A

        let subLabel = UILabel()
        subLabel.text = "Connect directly with our clinical technical desk"
        subLabel.font = .systemFont(ofSize: 12, weight: .regular)
        subLabel.textColor = UIColor(red: 0.392, green: 0.455, blue: 0.545, alpha: 1) // #64748B

        let titleStack = UIStackView(arrangedSubviews: [titleLabel, subLabel])
        titleStack.axis = .vertical
        titleStack.spacing = 2
        titleStack.translatesAutoresizingMaskIntoConstraints = false

        // Live Badge Pill
        let liveBadge = UIView()
        liveBadge.backgroundColor = UIColor(red: 0.925, green: 0.992, blue: 0.961, alpha: 1) // #ECFDF5
        liveBadge.layer.cornerRadius = 10
        liveBadge.layer.borderWidth = 1
        liveBadge.layer.borderColor = UIColor(red: 0.655, green: 0.953, blue: 0.816, alpha: 1).cgColor // #A7F3D0
        liveBadge.translatesAutoresizingMaskIntoConstraints = false

        let dot = UIView()
        dot.backgroundColor = UIColor(red: 0.063, green: 0.725, blue: 0.506, alpha: 1) // #10B981
        dot.layer.cornerRadius = 3.5
        dot.translatesAutoresizingMaskIntoConstraints = false

        let liveText = UILabel()
        liveText.text = "LIVE DESK"
        liveText.font = .systemFont(ofSize: 10.5, weight: .bold)
        liveText.textColor = UIColor(red: 0.020, green: 0.588, blue: 0.412, alpha: 1) // #059669
        liveText.translatesAutoresizingMaskIntoConstraints = false

        let liveStack = UIStackView(arrangedSubviews: [dot, liveText])
        liveStack.axis = .horizontal
        liveStack.alignment = .center
        liveStack.spacing = 5
        liveStack.translatesAutoresizingMaskIntoConstraints = false
        liveBadge.addSubview(liveStack)

        NSLayoutConstraint.activate([
            dot.widthAnchor.constraint(equalToConstant: 7),
            dot.heightAnchor.constraint(equalToConstant: 7),
            liveStack.topAnchor.constraint(equalTo: liveBadge.topAnchor, constant: 4),
            liveStack.bottomAnchor.constraint(equalTo: liveBadge.bottomAnchor, constant: -4),
            liveStack.leadingAnchor.constraint(equalTo: liveBadge.leadingAnchor, constant: 8),
            liveStack.trailingAnchor.constraint(equalTo: liveBadge.trailingAnchor, constant: -8)
        ])

        headerRow.addSubview(titleStack)
        headerRow.addSubview(liveBadge)

        NSLayoutConstraint.activate([
            titleStack.leadingAnchor.constraint(equalTo: headerRow.leadingAnchor),
            titleStack.topAnchor.constraint(equalTo: headerRow.topAnchor),
            titleStack.bottomAnchor.constraint(equalTo: headerRow.bottomAnchor),
            titleStack.trailingAnchor.constraint(lessThanOrEqualTo: liveBadge.leadingAnchor, constant: -8),

            liveBadge.trailingAnchor.constraint(equalTo: headerRow.trailingAnchor),
            liveBadge.centerYAnchor.constraint(equalTo: headerRow.centerYAnchor)
        ])

        // Action Rows
        let callRow = createModernContactRow(
            icon: "phone.fill",
            iconBg: UIColor(red: 0.937, green: 0.965, blue: 1.0, alpha: 1), // #EFF6FF
            iconBorder: UIColor(red: 0.859, green: 0.918, blue: 0.996, alpha: 1), // #DBEAFE
            iconTint: UIColor(red: 0.145, green: 0.388, blue: 0.922, alpha: 1), // #2563EB
            title: "Priority Technical Hotline",
            subtitle: "\(Self.supportPhone) • Toll-Free Emergency",
            badgeText: "CALL",
            badgeBg: UIColor(red: 0.937, green: 0.965, blue: 1.0, alpha: 1), // #EFF6FF
            badgeFg: UIColor(red: 0.145, green: 0.388, blue: 0.922, alpha: 1), // #2563EB
            action: #selector(callTapped)
        )

        let waRow = createModernContactRow(
            icon: "WhatsAppLogo",
            iconBg: UIColor(red: 0.925, green: 0.992, blue: 0.961, alpha: 1), // #ECFDF5
            iconBorder: UIColor(red: 0.655, green: 0.953, blue: 0.816, alpha: 1), // #A7F3D0
            iconTint: .clear,
            title: "WhatsApp Concierge Desk",
            subtitle: "Instant chat, live reports & media support",
            badgeText: "CHAT",
            badgeBg: UIColor(red: 0.925, green: 0.992, blue: 0.961, alpha: 1), // #ECFDF5
            badgeFg: UIColor(red: 0.020, green: 0.588, blue: 0.412, alpha: 1), // #059669
            action: #selector(whatsappTapped)
        )

        let emailRow = createModernContactRow(
            icon: "GmailLogo",
            iconBg: UIColor(red: 0.933, green: 0.949, blue: 1.0, alpha: 1), // #EEF2FF
            iconBorder: UIColor(red: 0.780, green: 0.824, blue: 0.996, alpha: 1), // #C7D2FE
            iconTint: .clear,
            title: "Official Support Desk",
            subtitle: "\(Self.supportEmail) • SLA < 2 Hours",
            badgeText: "EMAIL",
            badgeBg: UIColor(red: 0.933, green: 0.949, blue: 1.0, alpha: 1), // #EEF2FF
            badgeFg: UIColor(red: 0.310, green: 0.275, blue: 0.898, alpha: 1), // #4F46E5
            action: #selector(emailTapped)
        )

        // SLA Trust Assurance Banner
        let slaBanner = UIView()
        slaBanner.backgroundColor = UIColor(red: 0.945, green: 0.961, blue: 0.976, alpha: 1) // #F1F5F9
        slaBanner.layer.cornerRadius = 10
        slaBanner.layer.borderWidth = 1
        slaBanner.layer.borderColor = UIColor(red: 0.886, green: 0.910, blue: 0.941, alpha: 1).cgColor // #E2E8F0
        slaBanner.translatesAutoresizingMaskIntoConstraints = false

        let shieldIcon = UIImageView(image: UIImage(systemName: "checkmark.shield.fill"))
        shieldIcon.tintColor = UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1) // #0D6EFD
        shieldIcon.contentMode = .scaleAspectFit
        shieldIcon.translatesAutoresizingMaskIntoConstraints = false

        let slaText = UILabel()
        slaText.text = "Guaranteed SLA: Under 15 mins for critical lab incidents"
        slaText.font = .systemFont(ofSize: 11, weight: .bold)
        slaText.textColor = UIColor(red: 0.278, green: 0.333, blue: 0.412, alpha: 1) // #475569
        slaText.translatesAutoresizingMaskIntoConstraints = false

        let slaStack = UIStackView(arrangedSubviews: [shieldIcon, slaText])
        slaStack.axis = .horizontal
        slaStack.alignment = .center
        slaStack.spacing = 8
        slaStack.translatesAutoresizingMaskIntoConstraints = false
        slaBanner.addSubview(slaStack)

        NSLayoutConstraint.activate([
            shieldIcon.widthAnchor.constraint(equalToConstant: 16),
            shieldIcon.heightAnchor.constraint(equalToConstant: 16),
            slaStack.topAnchor.constraint(equalTo: slaBanner.topAnchor, constant: 9),
            slaStack.bottomAnchor.constraint(equalTo: slaBanner.bottomAnchor, constant: -9),
            slaStack.leadingAnchor.constraint(equalTo: slaBanner.leadingAnchor, constant: 12),
            slaStack.trailingAnchor.constraint(equalTo: slaBanner.trailingAnchor, constant: -12)
        ])

        let mainStack = UIStackView(arrangedSubviews: [headerRow, callRow, waRow, emailRow, slaBanner])
        mainStack.axis = .vertical
        mainStack.spacing = 10
        mainStack.translatesAutoresizingMaskIntoConstraints = false
        card.addSubview(mainStack)

        NSLayoutConstraint.activate([
            mainStack.topAnchor.constraint(equalTo: card.topAnchor, constant: 18),
            mainStack.bottomAnchor.constraint(equalTo: card.bottomAnchor, constant: -18),
            mainStack.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 16),
            mainStack.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -16)
        ])

        contentStack.addArrangedSubview(card)
    }

    private func createModernContactRow(
        icon: String,
        iconBg: UIColor,
        iconBorder: UIColor,
        iconTint: UIColor,
        title: String,
        subtitle: String,
        badgeText: String,
        badgeBg: UIColor,
        badgeFg: UIColor,
        action: Selector
    ) -> UIView {
        let row = UIView()
        row.backgroundColor = UIColor(red: 0.973, green: 0.980, blue: 0.988, alpha: 1) // #F8FAFC
        row.layer.cornerRadius = 14
        row.layer.borderWidth = 1
        row.layer.borderColor = UIColor(red: 0.886, green: 0.910, blue: 0.941, alpha: 1).cgColor // #E2E8F0
        row.translatesAutoresizingMaskIntoConstraints = false

        // Squircle Icon Container
        let iconBox = UIView()
        iconBox.backgroundColor = iconBg
        iconBox.layer.cornerRadius = 12
        iconBox.layer.borderWidth = 1
        iconBox.layer.borderColor = iconBorder.cgColor
        iconBox.translatesAutoresizingMaskIntoConstraints = false

        let iv = UIImageView()
        if let custom = UIImage(named: icon) {
            iv.image = custom
        } else {
            iv.image = UIImage(systemName: icon)
            iv.tintColor = iconTint
        }
        iv.contentMode = .scaleAspectFit
        iv.translatesAutoresizingMaskIntoConstraints = false
        iconBox.addSubview(iv)

        NSLayoutConstraint.activate([
            iv.widthAnchor.constraint(equalToConstant: 22),
            iv.heightAnchor.constraint(equalToConstant: 22),
            iv.centerXAnchor.constraint(equalTo: iconBox.centerXAnchor),
            iv.centerYAnchor.constraint(equalTo: iconBox.centerYAnchor),
            iconBox.widthAnchor.constraint(equalToConstant: 42),
            iconBox.heightAnchor.constraint(equalToConstant: 42)
        ])

        // Text Labels Stack
        let titleLbl = UILabel()
        titleLbl.text = title
        titleLbl.font = .systemFont(ofSize: 13.5, weight: .bold)
        titleLbl.textColor = UIColor(red: 0.059, green: 0.090, blue: 0.165, alpha: 1)

        let subLbl = UILabel()
        subLbl.text = subtitle
        subLbl.font = .systemFont(ofSize: 11.5, weight: .regular)
        subLbl.textColor = UIColor(red: 0.392, green: 0.455, blue: 0.545, alpha: 1)

        let labelStack = UIStackView(arrangedSubviews: [titleLbl, subLbl])
        labelStack.axis = .vertical
        labelStack.spacing = 2
        labelStack.translatesAutoresizingMaskIntoConstraints = false

        // Action Capsule Badge
        let actionBadge = UIView()
        actionBadge.backgroundColor = badgeBg
        actionBadge.layer.cornerRadius = 11
        actionBadge.translatesAutoresizingMaskIntoConstraints = false

        let badgeLbl = UILabel()
        badgeLbl.text = badgeText
        badgeLbl.font = .systemFont(ofSize: 11, weight: .bold)
        badgeLbl.textColor = badgeFg
        badgeLbl.translatesAutoresizingMaskIntoConstraints = false

        let chevron = UIImageView(image: UIImage(systemName: "chevron.right"))
        chevron.tintColor = badgeFg
        chevron.contentMode = .scaleAspectFit
        chevron.translatesAutoresizingMaskIntoConstraints = false

        let badgeStack = UIStackView(arrangedSubviews: [badgeLbl, chevron])
        badgeStack.axis = .horizontal
        badgeStack.alignment = .center
        badgeStack.spacing = 3
        badgeStack.translatesAutoresizingMaskIntoConstraints = false
        actionBadge.addSubview(badgeStack)

        NSLayoutConstraint.activate([
            chevron.widthAnchor.constraint(equalToConstant: 11),
            chevron.heightAnchor.constraint(equalToConstant: 11),
            badgeStack.topAnchor.constraint(equalTo: actionBadge.topAnchor, constant: 5),
            badgeStack.bottomAnchor.constraint(equalTo: actionBadge.bottomAnchor, constant: -5),
            badgeStack.leadingAnchor.constraint(equalTo: actionBadge.leadingAnchor, constant: 9),
            badgeStack.trailingAnchor.constraint(equalTo: actionBadge.trailingAnchor, constant: -7)
        ])

        row.addSubview(iconBox)
        row.addSubview(labelStack)
        row.addSubview(actionBadge)

        NSLayoutConstraint.activate([
            row.heightAnchor.constraint(greaterThanOrEqualToConstant: 64),

            iconBox.leadingAnchor.constraint(equalTo: row.leadingAnchor, constant: 12),
            iconBox.centerYAnchor.constraint(equalTo: row.centerYAnchor),

            labelStack.leadingAnchor.constraint(equalTo: iconBox.trailingAnchor, constant: 12),
            labelStack.centerYAnchor.constraint(equalTo: row.centerYAnchor),
            labelStack.trailingAnchor.constraint(lessThanOrEqualTo: actionBadge.leadingAnchor, constant: -8),

            actionBadge.trailingAnchor.constraint(equalTo: row.trailingAnchor, constant: -12),
            actionBadge.centerYAnchor.constraint(equalTo: row.centerYAnchor)
        ])

        let tap = UITapGestureRecognizer(target: self, action: action)
        row.addGestureRecognizer(tap)
        row.isUserInteractionEnabled = true
        return row
    }

    private func setupRefresh() {
        refreshControl.addTarget(self, action: #selector(didPullRefresh), for: .valueChanged)
        scrollView.refreshControl = refreshControl
    }

    @objc private func didPullRefresh() {
        fetchTickets()
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MARK: – Data Fetching & Sync
    // ─────────────────────────────────────────────────────────────────────────
    private func fetchTickets() {
        if !refreshControl.isRefreshing {
            loadingIndicator.startAnimating()
        }

        Task {
            guard let url = URL(string: "\(Self.baseUrl)/api/support") else { return }
            var req = URLRequest(url: url)
            req.httpMethod = "GET"
            req.setValue("application/json", forHTTPHeaderField: "Accept")

            if let token = getToken() {
                req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
                req.setValue("token=\(token)", forHTTPHeaderField: "Cookie")
            }

            do {
                let (data, response) = try await URLSession.shared.data(for: req)
                if let http = response as? HTTPURLResponse, http.statusCode == 200,
                   let list = try JSONSerialization.jsonObject(with: data) as? [[String: Any]] {
                    await MainActor.run {
                        self.loadingIndicator.stopAnimating()
                        self.refreshControl.endRefreshing()
                        self.allTickets = list
                        self.updateKpis()
                        self.renderTickets()
                    }
                } else {
                    await MainActor.run {
                        self.loadingIndicator.stopAnimating()
                        self.refreshControl.endRefreshing()
                        self.renderTickets()
                    }
                }
            } catch {
                await MainActor.run {
                    self.loadingIndicator.stopAnimating()
                    self.refreshControl.endRefreshing()
                    self.renderTickets()
                }
            }
        }
    }

    private func updateKpis() {
        var openCount = 0
        var progressCount = 0
        var resolvedCount = 0

        for t in allTickets {
            let status = (t["status"] as? String ?? "OPEN").uppercased()
            if status == "OPEN" {
                openCount += 1
            } else if status == "IN_PROGRESS" || status == "INPROGRESS" {
                progressCount += 1
            } else if status == "RESOLVED" || status == "CLOSED" {
                resolvedCount += 1
            }
        }

        kpiOpenCount.text = "\(openCount)"
        kpiProgressCount.text = "\(progressCount)"
        kpiResolvedCount.text = "\(resolvedCount)"
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MARK: – Render Tickets
    // ─────────────────────────────────────────────────────────────────────────
    private func renderTickets() {
        ticketsStack.arrangedSubviews.forEach { $0.removeFromSuperview() }

        var filtered: [[String: Any]] = []
        for t in allTickets {
            let status = (t["status"] as? String ?? "OPEN").uppercased()
            let subject = (t["subject"] as? String ?? "").lowercased()
            let ticketNum = (t["ticketNumber"] as? String ?? "").lowercased()
            let desc = (t["description"] as? String ?? "").lowercased()
            let cat = (t["category"] as? String ?? "").lowercased()

            // Filter
            var matchFilter = true
            if currentFilter == "OPEN" {
                matchFilter = (status == "OPEN")
            } else if currentFilter == "IN_PROGRESS" {
                matchFilter = (status == "IN_PROGRESS" || status == "INPROGRESS")
            } else if currentFilter == "RESOLVED" {
                matchFilter = (status == "RESOLVED" || status == "CLOSED")
            }

            if !matchFilter { continue }

            // Search
            if !searchQuery.isEmpty {
                let matchSearch = subject.contains(searchQuery) ||
                    ticketNum.contains(searchQuery) ||
                    desc.contains(searchQuery) ||
                    cat.contains(searchQuery)
                if !matchSearch { continue }
            }

            filtered.append(t)
        }

        totalCountLabel.text = "\(filtered.count) \(filtered.count == 1 ? "ticket" : "tickets")"

        if filtered.isEmpty {
            emptyView.isHidden = false
            ticketsStack.isHidden = true
            return
        }

        emptyView.isHidden = true
        ticketsStack.isHidden = false

        for (index, ticket) in filtered.enumerated() {
            let card = createTicketCard(ticket: ticket, index: index)
            ticketsStack.addArrangedSubview(card)
        }
    }

    private func createTicketCard(ticket: [String: Any], index: Int) -> UIView {
        let card = UIView()
        card.backgroundColor = .white
        card.layer.cornerRadius = 14
        card.layer.borderWidth = 1
        card.layer.borderColor = UIColor(red: 0.886, green: 0.910, blue: 0.941, alpha: 1).cgColor
        card.translatesAutoresizingMaskIntoConstraints = false

        let ticketNum = ticket["ticketNumber"] as? String ?? "TKT-0000"
        let status = (ticket["status"] as? String ?? "OPEN").uppercased()
        let priority = (ticket["priority"] as? String ?? "MEDIUM").uppercased()
        let category = (ticket["category"] as? String ?? "GENERAL").uppercased()
        let subject = ticket["subject"] as? String ?? "No Subject"
        let desc = ticket["description"] as? String ?? ""
        let updatedAt = ticket["updatedAt"] as? String ?? (ticket["createdAt"] as? String ?? "")

        var msgCount = 0
        if let countObj = ticket["_count"] as? [String: Any] {
            msgCount = countObj["messages"] as? Int ?? 0
        }

        // Top Row: Number + Category + Priority + Status Badge
        let numPill = makePill(text: ticketNum, isMonospace: true, bg: UIColor(red: 0.973, green: 0.980, blue: 0.988, alpha: 1), fg: UIColor(red: 0.200, green: 0.255, blue: 0.333, alpha: 1))
        let catPill = makePill(text: category, isMonospace: false, bg: UIColor(red: 0.973, green: 0.980, blue: 0.988, alpha: 1), fg: UIColor(red: 0.278, green: 0.333, blue: 0.412, alpha: 1))

        let prioFg: UIColor
        if priority == "URGENT" { prioFg = UIColor(red: 0.863, green: 0.149, blue: 0.149, alpha: 1) }
        else if priority == "HIGH" { prioFg = UIColor(red: 0.918, green: 0.345, blue: 0.047, alpha: 1) }
        else if priority == "LOW" { prioFg = UIColor(red: 0.086, green: 0.639, blue: 0.290, alpha: 1) }
        else { prioFg = UIColor(red: 0.145, green: 0.388, blue: 0.922, alpha: 1) }

        let prioPill = makePill(text: priority, isMonospace: false, bg: UIColor(red: 0.973, green: 0.980, blue: 0.988, alpha: 1), fg: prioFg)

        let statusBadge: UIView
        if status == "OPEN" {
            statusBadge = makePill(text: "OPEN", isMonospace: false, bg: UIColor(red: 0.996, green: 0.886, blue: 0.886, alpha: 1), fg: UIColor(red: 0.863, green: 0.149, blue: 0.149, alpha: 1))
        } else if status == "IN_PROGRESS" || status == "INPROGRESS" {
            statusBadge = makePill(text: "IN PROGRESS", isMonospace: false, bg: UIColor(red: 0.996, green: 0.953, blue: 0.780, alpha: 1), fg: UIColor(red: 0.851, green: 0.467, blue: 0.024, alpha: 1))
        } else if status == "RESOLVED" {
            statusBadge = makePill(text: "RESOLVED", isMonospace: false, bg: UIColor(red: 0.863, green: 0.988, blue: 0.906, alpha: 1), fg: UIColor(red: 0.086, green: 0.639, blue: 0.290, alpha: 1))
        } else {
            statusBadge = makePill(text: "CLOSED", isMonospace: false, bg: UIColor(red: 0.941, green: 0.957, blue: 0.973, alpha: 1), fg: UIColor(red: 0.392, green: 0.455, blue: 0.545, alpha: 1))
        }

        let leftPills = UIStackView(arrangedSubviews: [numPill, catPill, prioPill])
        leftPills.axis = .horizontal
        leftPills.spacing = 6

        let topRow = UIStackView(arrangedSubviews: [leftPills, UIView(), statusBadge])
        topRow.axis = .horizontal
        topRow.alignment = .center

        // Subject
        let subjLbl = UILabel()
        subjLbl.text = subject
        subjLbl.font = .systemFont(ofSize: 14.5, weight: .bold)
        subjLbl.textColor = UIColor(red: 0.059, green: 0.090, blue: 0.165, alpha: 1)
        subjLbl.numberOfLines = 2

        // Description preview
        let descLbl = UILabel()
        descLbl.text = desc.isEmpty ? "No description provided." : desc
        descLbl.font = .systemFont(ofSize: 12)
        descLbl.textColor = UIColor(red: 0.392, green: 0.455, blue: 0.545, alpha: 1)
        descLbl.numberOfLines = 2

        // Divider
        let divider = UIView()
        divider.backgroundColor = UIColor(red: 0.945, green: 0.961, blue: 0.976, alpha: 1)
        divider.translatesAutoresizingMaskIntoConstraints = false
        divider.heightAnchor.constraint(equalToConstant: 1).isActive = true

        // Bottom Row: Date + Message count + View CTA
        let clockIcon = UIImageView(image: UIImage(systemName: "clock"))
        clockIcon.tintColor = UIColor(red: 0.580, green: 0.639, blue: 0.722, alpha: 1)
        clockIcon.contentMode = .scaleAspectFit
        clockIcon.translatesAutoresizingMaskIntoConstraints = false
        clockIcon.widthAnchor.constraint(equalToConstant: 12).isActive = true
        clockIcon.heightAnchor.constraint(equalToConstant: 12).isActive = true

        let dateLbl = UILabel()
        dateLbl.text = formatRelativeDate(updatedAt)
        dateLbl.font = .systemFont(ofSize: 11, weight: .medium)
        dateLbl.textColor = UIColor(red: 0.580, green: 0.639, blue: 0.722, alpha: 1)

        let msgIcon = UIImageView(image: UIImage(systemName: "bubble.left.and.bubble.right"))
        msgIcon.tintColor = UIColor(red: 0.580, green: 0.639, blue: 0.722, alpha: 1)
        msgIcon.contentMode = .scaleAspectFit
        msgIcon.translatesAutoresizingMaskIntoConstraints = false
        msgIcon.widthAnchor.constraint(equalToConstant: 12).isActive = true
        msgIcon.heightAnchor.constraint(equalToConstant: 12).isActive = true

        let msgLbl = UILabel()
        msgLbl.text = "\(msgCount) \(msgCount == 1 ? "message" : "messages")"
        msgLbl.font = .systemFont(ofSize: 11, weight: .medium)
        msgLbl.textColor = UIColor(red: 0.580, green: 0.639, blue: 0.722, alpha: 1)

        let ctaLbl = UILabel()
        ctaLbl.text = "View Ticket"
        ctaLbl.font = .systemFont(ofSize: 12, weight: .bold)
        ctaLbl.textColor = UIColor(red: 0.145, green: 0.388, blue: 0.922, alpha: 1)

        let chevron = UIImageView(image: UIImage(systemName: "chevron.right"))
        chevron.tintColor = UIColor(red: 0.145, green: 0.388, blue: 0.922, alpha: 1)
        chevron.contentMode = .scaleAspectFit
        chevron.translatesAutoresizingMaskIntoConstraints = false
        chevron.widthAnchor.constraint(equalToConstant: 12).isActive = true
        chevron.heightAnchor.constraint(equalToConstant: 12).isActive = true

        let ctaStack = UIStackView(arrangedSubviews: [ctaLbl, chevron])
        ctaStack.axis = .horizontal
        ctaStack.spacing = 4
        ctaStack.alignment = .center

        let bottomRow = UIStackView(arrangedSubviews: [
            clockIcon, dateLbl,
            UIView(),
            msgIcon, msgLbl,
            UIView(),
            ctaStack
        ])
        bottomRow.axis = .horizontal
        bottomRow.spacing = 6
        bottomRow.alignment = .center

        let cardStack = UIStackView(arrangedSubviews: [topRow, subjLbl, descLbl, divider, bottomRow])
        cardStack.axis = .vertical
        cardStack.spacing = 8
        cardStack.translatesAutoresizingMaskIntoConstraints = false
        card.addSubview(cardStack)

        NSLayoutConstraint.activate([
            cardStack.topAnchor.constraint(equalTo: card.topAnchor, constant: 14),
            cardStack.bottomAnchor.constraint(equalTo: card.bottomAnchor, constant: -14),
            cardStack.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 14),
            cardStack.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -14)
        ])

        card.tag = index
        let tap = UITapGestureRecognizer(target: self, action: #selector(ticketCardTapped(_:)))
        card.addGestureRecognizer(tap)
        card.isUserInteractionEnabled = true
        return card
    }

    private func makePill(text: String, isMonospace: Bool, bg: UIColor, fg: UIColor) -> UIView {
        let pill = UIView()
        pill.backgroundColor = bg
        pill.layer.cornerRadius = 6
        pill.translatesAutoresizingMaskIntoConstraints = false

        let lbl = UILabel()
        lbl.text = text
        lbl.textColor = fg
        lbl.font = isMonospace ? UIFont.monospacedSystemFont(ofSize: 10.5, weight: .bold) : .systemFont(ofSize: 10, weight: .bold)
        lbl.translatesAutoresizingMaskIntoConstraints = false
        pill.addSubview(lbl)

        NSLayoutConstraint.activate([
            lbl.topAnchor.constraint(equalTo: pill.topAnchor, constant: 3),
            lbl.bottomAnchor.constraint(equalTo: pill.bottomAnchor, constant: -3),
            lbl.leadingAnchor.constraint(equalTo: pill.leadingAnchor, constant: 6),
            lbl.trailingAnchor.constraint(equalTo: pill.trailingAnchor, constant: -6)
        ])
        return pill
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MARK: – Actions & Navigation
    // ─────────────────────────────────────────────────────────────────────────
    @objc private func backTapped() {
        dismiss(animated: true, completion: nil)
    }

    @objc private func newTicketTapped() {
        let modal = CreateTicketSheetViewController()
        modal.onTicketCreated = { [weak self] in
            self?.fetchTickets()
        }
        present(modal, animated: true)
    }

    @objc private func ticketCardTapped(_ gesture: UITapGestureRecognizer) {
        guard let view = gesture.view else { return }
        let index = view.tag
        if index < allTickets.count {
            let ticket = allTickets[index]
            let modal = TicketDetailSheetViewController(ticket: ticket)
            modal.onTicketUpdated = { [weak self] in
                self?.fetchTickets()
            }
            present(modal, animated: true)
        }
    }

    @objc private func tabTapped(_ sender: UIButton) {
        switch sender.tag {
        case 1: currentFilter = "OPEN"
        case 2: currentFilter = "IN_PROGRESS"
        case 3: currentFilter = "RESOLVED"
        default: currentFilter = "ALL"
        }
        updateFilterTabsUI()
        renderTickets()
    }

    @objc private func kpiOpenTapped() {
        currentFilter = "OPEN"
        updateFilterTabsUI()
        renderTickets()
    }

    @objc private func kpiProgressTapped() {
        currentFilter = "IN_PROGRESS"
        updateFilterTabsUI()
        renderTickets()
    }

    @objc private func kpiResolvedTapped() {
        currentFilter = "RESOLVED"
        updateFilterTabsUI()
        renderTickets()
    }

    @objc private func searchChanged() {
        searchQuery = (searchField.text ?? "").trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        clearSearchBtn.isHidden = searchQuery.isEmpty
        renderTickets()
    }

    @objc private func clearSearchTapped() {
        searchField.text = ""
        searchQuery = ""
        clearSearchBtn.isHidden = true
        renderTickets()
    }

    @objc private func callTapped() {
        if let url = URL(string: "tel:\(Self.supportPhone)") {
            UIApplication.shared.open(url, options: [:], completionHandler: nil)
        }
    }

    @objc private func whatsappTapped() {
        let text = ("Hello Patholab Support, I need assistance with my laboratory workspace.").addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""
        if let url = URL(string: "https://wa.me/\(Self.whatsappNumber)?text=\(text)") {
            UIApplication.shared.open(url, options: [:], completionHandler: nil)
        }
    }

    @objc private func emailTapped() {
        if let url = URL(string: "mailto:\(Self.supportEmail)?subject=Patholab%20Assistance%20Request") {
            UIApplication.shared.open(url, options: [:], completionHandler: nil)
        }
    }

    func textFieldShouldReturn(_ textField: UITextField) -> Bool {
        textField.resignFirstResponder()
        return true
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MARK: – Helpers
    // ─────────────────────────────────────────────────────────────────────────
    private func getToken() -> String? {
        return KeychainManager.read(forKey: KeychainManager.tokenKey) ??
               UserDefaults.standard.string(forKey: "auth_token") ??
               UserDefaults.standard.string(forKey: "token")
    }

    private func formatRelativeDate(_ iso: String) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        var date = formatter.date(from: iso)
        if date == nil {
            let fallback = ISO8601DateFormatter()
            date = fallback.date(from: iso)
        }
        guard let d = date else { return "Recent" }

        let diff = Date().timeIntervalSince(d)
        let mins = Int(diff / 60)
        let hours = Int(diff / 3600)
        let days = Int(diff / 86400)

        if mins < 1 { return "Just now" }
        if mins < 60 { return "\(mins)m ago" }
        if hours < 24 { return "\(hours)h ago" }
        if days < 7 { return "\(days)d ago" }

        let out = DateFormatter()
        out.dateFormat = "dd MMM yyyy"
        return out.string(from: d)
    }
}

// ═════════════════════════════════════════════════════════════════════════════
// MARK: – Create Ticket Sheet Modal
// ═════════════════════════════════════════════════════════════════════════════
class CreateTicketSheetViewController: UIViewController, UITextFieldDelegate, UITextViewDelegate {

    var onTicketCreated: (() -> Void)?

    private var selectedCategory = "TECHNICAL"
    private var selectedPriority = "MEDIUM"

    private let subjectField = UITextField()
    private let descView = UITextView()
    private let submitBtn = UIButton(type: .system)
    private let submitSpinner = UIActivityIndicatorView(style: .medium)

    private var catTechBtn: UIButton!
    private var catBillingBtn: UIButton!
    private var catGeneralBtn: UIButton!

    private var prioLowBtn: UIButton!
    private var prioMedBtn: UIButton!
    private var prioHighBtn: UIButton!
    private var prioUrgentBtn: UIButton!

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .white
        setupUI()
    }

    private func setupUI() {
        let dragPill = UIView()
        dragPill.backgroundColor = UIColor(red: 0.796, green: 0.835, blue: 0.882, alpha: 1)
        dragPill.layer.cornerRadius = 2.5
        dragPill.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(dragPill)

        let closeBtn = UIButton(type: .system)
        closeBtn.setImage(UIImage(systemName: "xmark"), for: .normal)
        closeBtn.tintColor = UIColor(red: 0.392, green: 0.455, blue: 0.545, alpha: 1)
        closeBtn.backgroundColor = UIColor(red: 0.941, green: 0.957, blue: 0.973, alpha: 1)
        closeBtn.layer.cornerRadius = 16
        closeBtn.translatesAutoresizingMaskIntoConstraints = false
        closeBtn.addTarget(self, action: #selector(closeTapped), for: .touchUpInside)
        view.addSubview(closeBtn)

        let title = UILabel()
        title.text = "Create Support Ticket"
        title.font = .systemFont(ofSize: 18, weight: .bold)
        title.textColor = UIColor(red: 0.059, green: 0.090, blue: 0.165, alpha: 1)

        let sub = UILabel()
        sub.text = "Direct escalation to our engineering and billing team"
        sub.font = .systemFont(ofSize: 12)
        sub.textColor = UIColor(red: 0.392, green: 0.455, blue: 0.545, alpha: 1)

        let titleStack = UIStackView(arrangedSubviews: [title, sub])
        titleStack.axis = .vertical
        titleStack.spacing = 2
        titleStack.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(titleStack)

        let scroll = UIScrollView()
        scroll.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(scroll)

        let bodyStack = UIStackView()
        bodyStack.axis = .vertical
        bodyStack.spacing = 14
        bodyStack.translatesAutoresizingMaskIntoConstraints = false
        scroll.addSubview(bodyStack)

        // Category
        let catLabel = makeFieldLabel("Category")
        catTechBtn = makeChip("Technical", active: true)
        catBillingBtn = makeChip("Billing", active: false)
        catGeneralBtn = makeChip("General", active: false)

        catTechBtn.addTarget(self, action: #selector(catTapped(_:)), for: .touchUpInside)
        catBillingBtn.addTarget(self, action: #selector(catTapped(_:)), for: .touchUpInside)
        catGeneralBtn.addTarget(self, action: #selector(catTapped(_:)), for: .touchUpInside)

        let catRow = UIStackView(arrangedSubviews: [catTechBtn, catBillingBtn, catGeneralBtn])
        catRow.axis = .horizontal
        catRow.distribution = .fillEqually
        catRow.spacing = 8

        bodyStack.addArrangedSubview(catLabel)
        bodyStack.addArrangedSubview(catRow)

        // Priority
        let prioLabel = makeFieldLabel("Priority Level")
        prioLowBtn = makeChip("Low", active: false)
        prioMedBtn = makeChip("Medium", active: true)
        prioHighBtn = makeChip("High", active: false)
        prioUrgentBtn = makeChip("Urgent", active: false)

        prioLowBtn.addTarget(self, action: #selector(prioTapped(_:)), for: .touchUpInside)
        prioMedBtn.addTarget(self, action: #selector(prioTapped(_:)), for: .touchUpInside)
        prioHighBtn.addTarget(self, action: #selector(prioTapped(_:)), for: .touchUpInside)
        prioUrgentBtn.addTarget(self, action: #selector(prioTapped(_:)), for: .touchUpInside)

        let prioRow = UIStackView(arrangedSubviews: [prioLowBtn, prioMedBtn, prioHighBtn, prioUrgentBtn])
        prioRow.axis = .horizontal
        prioRow.distribution = .fillEqually
        prioRow.spacing = 6

        bodyStack.addArrangedSubview(prioLabel)
        bodyStack.addArrangedSubview(prioRow)

        // Subject
        let subjLabel = makeFieldLabel("Subject *")
        subjectField.placeholder = "Brief summary of the issue..."
        subjectField.font = .systemFont(ofSize: 13)
        subjectField.borderStyle = .none
        subjectField.layer.cornerRadius = 10
        subjectField.layer.borderWidth = 1
        subjectField.layer.borderColor = UIColor(red: 0.886, green: 0.910, blue: 0.941, alpha: 1).cgColor
        subjectField.leftView = UIView(frame: CGRect(x: 0, y: 0, width: 12, height: 44))
        subjectField.leftViewMode = .always
        subjectField.translatesAutoresizingMaskIntoConstraints = false
        subjectField.heightAnchor.constraint(equalToConstant: 44).isActive = true

        bodyStack.addArrangedSubview(subjLabel)
        bodyStack.addArrangedSubview(subjectField)

        // Description
        let descLabel = makeFieldLabel("Detailed Description *")
        descView.font = .systemFont(ofSize: 13)
        descView.layer.cornerRadius = 10
        descView.layer.borderWidth = 1
        descView.layer.borderColor = UIColor(red: 0.886, green: 0.910, blue: 0.941, alpha: 1).cgColor
        descView.textContainerInset = UIEdgeInsets(top: 10, left: 8, bottom: 10, right: 8)
        descView.translatesAutoresizingMaskIntoConstraints = false
        descView.heightAnchor.constraint(equalToConstant: 100).isActive = true

        bodyStack.addArrangedSubview(descLabel)
        bodyStack.addArrangedSubview(descView)

        // Notice Callout
        let noticeCard = UIView()
        noticeCard.backgroundColor = UIColor(red: 0.996, green: 0.984, blue: 0.925, alpha: 1) // #FEFCE8
        noticeCard.layer.cornerRadius = 10
        noticeCard.layer.borderWidth = 1
        noticeCard.layer.borderColor = UIColor(red: 0.996, green: 0.953, blue: 0.780, alpha: 1).cgColor

        let shieldIcon = UIImageView(image: UIImage(systemName: "checkmark.shield.fill"))
        shieldIcon.tintColor = UIColor(red: 0.706, green: 0.325, blue: 0.035, alpha: 1)
        shieldIcon.contentMode = .scaleAspectFit
        shieldIcon.translatesAutoresizingMaskIntoConstraints = false
        shieldIcon.widthAnchor.constraint(equalToConstant: 16).isActive = true
        shieldIcon.heightAnchor.constraint(equalToConstant: 16).isActive = true

        let noticeLbl = UILabel()
        noticeLbl.text = "Standard response time is within 15 minutes during operational hours."
        noticeLbl.font = .systemFont(ofSize: 11)
        noticeLbl.textColor = UIColor(red: 0.573, green: 0.251, blue: 0.055, alpha: 1)
        noticeLbl.numberOfLines = 0

        let nStack = UIStackView(arrangedSubviews: [shieldIcon, noticeLbl])
        nStack.axis = .horizontal
        nStack.spacing = 8
        nStack.alignment = .center
        nStack.translatesAutoresizingMaskIntoConstraints = false
        noticeCard.addSubview(nStack)

        NSLayoutConstraint.activate([
            nStack.topAnchor.constraint(equalTo: noticeCard.topAnchor, constant: 8),
            nStack.bottomAnchor.constraint(equalTo: noticeCard.bottomAnchor, constant: -8),
            nStack.leadingAnchor.constraint(equalTo: noticeCard.leadingAnchor, constant: 10),
            nStack.trailingAnchor.constraint(equalTo: noticeCard.trailingAnchor, constant: -10)
        ])

        bodyStack.addArrangedSubview(noticeCard)

        // Actions: Cancel & Submit
        let cancelBtn = UIButton(type: .system)
        cancelBtn.setTitle("Cancel", for: .normal)
        cancelBtn.titleLabel?.font = .systemFont(ofSize: 14, weight: .semibold)
        cancelBtn.setTitleColor(UIColor(red: 0.278, green: 0.333, blue: 0.412, alpha: 1), for: .normal)
        cancelBtn.backgroundColor = UIColor(red: 0.941, green: 0.957, blue: 0.973, alpha: 1)
        cancelBtn.layer.cornerRadius = 12
        cancelBtn.translatesAutoresizingMaskIntoConstraints = false
        cancelBtn.heightAnchor.constraint(equalToConstant: 44).isActive = true
        cancelBtn.addTarget(self, action: #selector(closeTapped), for: .touchUpInside)

        submitBtn.setTitle("Submit Ticket", for: .normal)
        submitBtn.titleLabel?.font = .systemFont(ofSize: 14, weight: .bold)
        submitBtn.setTitleColor(.white, for: .normal)
        submitBtn.backgroundColor = UIColor(red: 0.145, green: 0.388, blue: 0.922, alpha: 1)
        submitBtn.layer.cornerRadius = 12
        submitBtn.translatesAutoresizingMaskIntoConstraints = false
        submitBtn.heightAnchor.constraint(equalToConstant: 44).isActive = true
        submitBtn.addTarget(self, action: #selector(submitTapped), for: .touchUpInside)

        submitSpinner.color = .white
        submitSpinner.hidesWhenStopped = true
        submitSpinner.translatesAutoresizingMaskIntoConstraints = false
        submitBtn.addSubview(submitSpinner)
        NSLayoutConstraint.activate([
            submitSpinner.centerXAnchor.constraint(equalTo: submitBtn.centerXAnchor),
            submitSpinner.centerYAnchor.constraint(equalTo: submitBtn.centerYAnchor)
        ])

        let btnRow = UIStackView(arrangedSubviews: [cancelBtn, submitBtn])
        btnRow.axis = .horizontal
        btnRow.distribution = .fillEqually
        btnRow.spacing = 10
        bodyStack.addArrangedSubview(btnRow)

        NSLayoutConstraint.activate([
            dragPill.topAnchor.constraint(equalTo: view.topAnchor, constant: 10),
            dragPill.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            dragPill.widthAnchor.constraint(equalToConstant: 40),
            dragPill.heightAnchor.constraint(equalToConstant: 5),

            closeBtn.topAnchor.constraint(equalTo: view.topAnchor, constant: 16),
            closeBtn.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -16),
            closeBtn.widthAnchor.constraint(equalToConstant: 32),
            closeBtn.heightAnchor.constraint(equalToConstant: 32),

            titleStack.topAnchor.constraint(equalTo: dragPill.bottomAnchor, constant: 12),
            titleStack.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 20),
            titleStack.trailingAnchor.constraint(equalTo: closeBtn.leadingAnchor, constant: -8),

            scroll.topAnchor.constraint(equalTo: titleStack.bottomAnchor, constant: 14),
            scroll.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            scroll.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            scroll.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -10),

            bodyStack.topAnchor.constraint(equalTo: scroll.topAnchor),
            bodyStack.bottomAnchor.constraint(equalTo: scroll.bottomAnchor, constant: -20),
            bodyStack.leadingAnchor.constraint(equalTo: scroll.leadingAnchor, constant: 20),
            bodyStack.trailingAnchor.constraint(equalTo: scroll.trailingAnchor, constant: -20),
            bodyStack.widthAnchor.constraint(equalTo: scroll.widthAnchor, constant: -40)
        ])
    }

    private func makeFieldLabel(_ text: String) -> UILabel {
        let lbl = UILabel()
        lbl.text = text
        lbl.font = .systemFont(ofSize: 13, weight: .bold)
        lbl.textColor = UIColor(red: 0.200, green: 0.255, blue: 0.333, alpha: 1)
        return lbl
    }

    private func makeChip(_ title: String, active: Bool) -> UIButton {
        let btn = UIButton(type: .system)
        btn.setTitle(title, for: .normal)
        btn.titleLabel?.font = .systemFont(ofSize: 12, weight: .bold)
        btn.layer.cornerRadius = 10
        btn.contentEdgeInsets = UIEdgeInsets(top: 8, left: 10, bottom: 8, right: 10)
        updateChipAppearance(btn, active: active)
        return btn
    }

    private func updateChipAppearance(_ btn: UIButton, active: Bool) {
        btn.backgroundColor = active ? UIColor(red: 0.145, green: 0.388, blue: 0.922, alpha: 1) : UIColor.white
        btn.setTitleColor(active ? .white : UIColor(red: 0.278, green: 0.333, blue: 0.412, alpha: 1), for: .normal)
        btn.layer.borderWidth = active ? 0 : 1
        btn.layer.borderColor = active ? nil : UIColor(red: 0.886, green: 0.910, blue: 0.941, alpha: 1).cgColor
    }

    @objc private func catTapped(_ sender: UIButton) {
        updateChipAppearance(catTechBtn, active: sender == catTechBtn)
        updateChipAppearance(catBillingBtn, active: sender == catBillingBtn)
        updateChipAppearance(catGeneralBtn, active: sender == catGeneralBtn)

        if sender == catTechBtn { selectedCategory = "TECHNICAL" }
        else if sender == catBillingBtn { selectedCategory = "BILLING" }
        else { selectedCategory = "GENERAL" }
    }

    @objc private func prioTapped(_ sender: UIButton) {
        updateChipAppearance(prioLowBtn, active: sender == prioLowBtn)
        updateChipAppearance(prioMedBtn, active: sender == prioMedBtn)
        updateChipAppearance(prioHighBtn, active: sender == prioHighBtn)
        updateChipAppearance(prioUrgentBtn, active: sender == prioUrgentBtn)

        if sender == prioLowBtn { selectedPriority = "LOW" }
        else if sender == prioMedBtn { selectedPriority = "MEDIUM" }
        else if sender == prioHighBtn { selectedPriority = "HIGH" }
        else { selectedPriority = "URGENT" }
    }

    @objc private func closeTapped() {
        dismiss(animated: true, completion: nil)
    }

    @objc private func submitTapped() {
        let subject = (subjectField.text ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        let desc = descView.text.trimmingCharacters(in: .whitespacesAndNewlines)

        if subject.isEmpty {
            subjectField.layer.borderColor = UIColor.systemRed.cgColor
            return
        }
        if desc.isEmpty {
            descView.layer.borderColor = UIColor.systemRed.cgColor
            return
        }

        submitBtn.setTitle("", for: .normal)
        submitBtn.isEnabled = false
        submitSpinner.startAnimating()

        Task {
            guard let url = URL(string: "https://app.patholab.cloud/api/support") else { return }
            var req = URLRequest(url: url)
            req.httpMethod = "POST"
            req.setValue("application/json", forHTTPHeaderField: "Content-Type")
            req.setValue("application/json", forHTTPHeaderField: "Accept")

            let token = KeychainManager.read(forKey: KeychainManager.tokenKey) ??
                        UserDefaults.standard.string(forKey: "auth_token") ??
                        UserDefaults.standard.string(forKey: "token")

            if let t = token {
                req.setValue("Bearer \(t)", forHTTPHeaderField: "Authorization")
                req.setValue("token=\(t)", forHTTPHeaderField: "Cookie")
            }

            let body: [String: Any] = [
                "subject": subject,
                "description": desc,
                "category": selectedCategory,
                "priority": selectedPriority
            ]
            req.httpBody = try? JSONSerialization.data(withJSONObject: body)

            do {
                let (_, resp) = try await URLSession.shared.data(for: req)
                if let http = resp as? HTTPURLResponse, (http.statusCode == 200 || http.statusCode == 201) {
                    await MainActor.run {
                        self.submitSpinner.stopAnimating()
                        self.dismiss(animated: true) {
                            self.onTicketCreated?()
                        }
                    }
                } else {
                    await MainActor.run {
                        self.submitSpinner.stopAnimating()
                        self.submitBtn.setTitle("Submit Ticket", for: .normal)
                        self.submitBtn.isEnabled = true
                    }
                }
            } catch {
                await MainActor.run {
                    self.submitSpinner.stopAnimating()
                    self.submitBtn.setTitle("Submit Ticket", for: .normal)
                    self.submitBtn.isEnabled = true
                }
            }
        }
    }
}

// ═════════════════════════════════════════════════════════════════════════════
// MARK: – Ticket Detail & Real-Time Conversation Sheet Modal
// ═════════════════════════════════════════════════════════════════════════════
class TicketDetailSheetViewController: UIViewController, UITextFieldDelegate {

    var onTicketUpdated: (() -> Void)?
    private var ticket: [String: Any]

    private let statusLabel = UILabel()
    private let messagesStack = UIStackView()
    private let messagesScroll = UIScrollView()
    private let replyField = UITextField()
    private let sendBtn = UIButton(type: .system)
    private let sendSpinner = UIActivityIndicatorView(style: .medium)
    private let noMessagesLabel = UILabel()

    private var pollTimer: Timer?

    init(ticket: [String: Any]) {
        self.ticket = ticket
        super.init(nibName: nil, bundle: nil)
    }

    required init?(coder: NSCoder) { fatalError() }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .white
        setupUI()
        fetchThread()

        // Real-time 5-second polling timer
        pollTimer = Timer.scheduledTimer(withTimeInterval: 5.0, repeats: true) { [weak self] _ in
            self?.fetchThread()
        }
    }

    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        pollTimer?.invalidate()
        pollTimer = nil
        onTicketUpdated?()
    }

    private func setupUI() {
        let dragPill = UIView()
        dragPill.backgroundColor = UIColor(red: 0.796, green: 0.835, blue: 0.882, alpha: 1)
        dragPill.layer.cornerRadius = 2.5
        dragPill.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(dragPill)

        let ticketNum = ticket["ticketNumber"] as? String ?? "TKT-0000"
        let category = (ticket["category"] as? String ?? "GENERAL").uppercased()
        let status = (ticket["status"] as? String ?? "OPEN").uppercased()
        let subject = ticket["subject"] as? String ?? "No Subject"
        let desc = ticket["description"] as? String ?? ""

        // Top Header
        let numLabel = UILabel()
        numLabel.text = ticketNum
        numLabel.font = UIFont.monospacedSystemFont(ofSize: 12, weight: .bold)
        numLabel.textColor = UIColor(red: 0.200, green: 0.255, blue: 0.333, alpha: 1)

        let catLabel = UILabel()
        catLabel.text = category
        catLabel.font = .systemFont(ofSize: 11, weight: .bold)
        catLabel.textColor = UIColor(red: 0.278, green: 0.333, blue: 0.412, alpha: 1)

        statusLabel.text = status
        statusLabel.font = .systemFont(ofSize: 11, weight: .bold)
        statusLabel.textColor = status == "OPEN" ? .systemRed : (status == "RESOLVED" ? .systemGreen : .systemOrange)

        let closeBtn = UIButton(type: .system)
        closeBtn.setImage(UIImage(systemName: "xmark"), for: .normal)
        closeBtn.tintColor = UIColor(red: 0.392, green: 0.455, blue: 0.545, alpha: 1)
        closeBtn.backgroundColor = UIColor(red: 0.941, green: 0.957, blue: 0.973, alpha: 1)
        closeBtn.layer.cornerRadius = 16
        closeBtn.translatesAutoresizingMaskIntoConstraints = false
        closeBtn.addTarget(self, action: #selector(closeTapped), for: .touchUpInside)

        let topRow = UIStackView(arrangedSubviews: [numLabel, catLabel, statusLabel, UIView(), closeBtn])
        topRow.axis = .horizontal
        topRow.alignment = .center
        topRow.spacing = 8
        topRow.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(topRow)

        // Subject
        let subjLabel = UILabel()
        subjLabel.text = subject
        subjLabel.font = .systemFont(ofSize: 16, weight: .bold)
        subjLabel.textColor = UIColor(red: 0.059, green: 0.090, blue: 0.165, alpha: 1)
        subjLabel.numberOfLines = 0
        subjLabel.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(subjLabel)

        // Initial description callout
        let descBox = UIView()
        descBox.backgroundColor = UIColor(red: 0.945, green: 0.961, blue: 0.976, alpha: 1)
        descBox.layer.cornerRadius = 8
        descBox.translatesAutoresizingMaskIntoConstraints = false

        let dTitle = UILabel()
        dTitle.text = "Initial Description:"
        dTitle.font = .systemFont(ofSize: 11, weight: .bold)
        dTitle.textColor = UIColor(red: 0.278, green: 0.333, blue: 0.412, alpha: 1)

        let dBody = UILabel()
        dBody.text = desc.isEmpty ? "No initial description provided." : desc
        dBody.font = .systemFont(ofSize: 12)
        dBody.textColor = UIColor(red: 0.200, green: 0.255, blue: 0.333, alpha: 1)
        dBody.numberOfLines = 0

        let dStack = UIStackView(arrangedSubviews: [dTitle, dBody])
        dStack.axis = .vertical
        dStack.spacing = 2
        dStack.translatesAutoresizingMaskIntoConstraints = false
        descBox.addSubview(dStack)

        NSLayoutConstraint.activate([
            dStack.topAnchor.constraint(equalTo: descBox.topAnchor, constant: 8),
            dStack.bottomAnchor.constraint(equalTo: descBox.bottomAnchor, constant: -8),
            dStack.leadingAnchor.constraint(equalTo: descBox.leadingAnchor, constant: 10),
            dStack.trailingAnchor.constraint(equalTo: descBox.trailingAnchor, constant: -10)
        ])
        view.addSubview(descBox)

        // Thread Section Header
        let threadLabel = UILabel()
        threadLabel.text = "Conversation Thread"
        threadLabel.font = .systemFont(ofSize: 13, weight: .bold)
        threadLabel.textColor = UIColor(red: 0.200, green: 0.255, blue: 0.333, alpha: 1)

        let syncDot = UIView()
        syncDot.backgroundColor = UIColor(red: 0.063, green: 0.725, blue: 0.506, alpha: 1)
        syncDot.layer.cornerRadius = 3.5
        syncDot.translatesAutoresizingMaskIntoConstraints = false
        syncDot.widthAnchor.constraint(equalToConstant: 7).isActive = true
        syncDot.heightAnchor.constraint(equalToConstant: 7).isActive = true

        let syncText = UILabel()
        syncText.text = "Real-time Synced"
        syncText.font = .systemFont(ofSize: 11, weight: .bold)
        syncText.textColor = UIColor(red: 0.063, green: 0.725, blue: 0.506, alpha: 1)

        let syncStack = UIStackView(arrangedSubviews: [syncDot, syncText])
        syncStack.axis = .horizontal
        syncStack.spacing = 4
        syncStack.alignment = .center

        let threadHeader = UIStackView(arrangedSubviews: [threadLabel, UIView(), syncStack])
        threadHeader.axis = .horizontal
        threadHeader.alignment = .center
        threadHeader.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(threadHeader)

        // Messages Scroll
        messagesScroll.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(messagesScroll)

        messagesStack.axis = .vertical
        messagesStack.spacing = 10
        messagesStack.translatesAutoresizingMaskIntoConstraints = false
        messagesScroll.addSubview(messagesStack)

        noMessagesLabel.text = "No messages yet in this conversation."
        noMessagesLabel.font = .systemFont(ofSize: 12)
        noMessagesLabel.textColor = UIColor(red: 0.580, green: 0.639, blue: 0.722, alpha: 1)
        noMessagesLabel.textAlignment = .center
        noMessagesLabel.isHidden = true
        noMessagesLabel.translatesAutoresizingMaskIntoConstraints = false
        messagesScroll.addSubview(noMessagesLabel)

        // Reply Composer Bar
        let composerBar = UIView()
        composerBar.backgroundColor = UIColor(red: 0.973, green: 0.980, blue: 0.988, alpha: 1)
        composerBar.layer.cornerRadius = 12
        composerBar.layer.borderWidth = 1
        composerBar.layer.borderColor = UIColor(red: 0.886, green: 0.910, blue: 0.941, alpha: 1).cgColor
        composerBar.translatesAutoresizingMaskIntoConstraints = false

        replyField.placeholder = "Type your reply or follow-up..."
        replyField.font = .systemFont(ofSize: 13)
        replyField.textColor = UIColor(red: 0.059, green: 0.090, blue: 0.165, alpha: 1)
        replyField.translatesAutoresizingMaskIntoConstraints = false

        sendBtn.setImage(UIImage(systemName: "paperplane.fill"), for: .normal)
        sendBtn.tintColor = .white
        sendBtn.backgroundColor = UIColor(red: 0.145, green: 0.388, blue: 0.922, alpha: 1)
        sendBtn.layer.cornerRadius = 16
        sendBtn.translatesAutoresizingMaskIntoConstraints = false
        sendBtn.addTarget(self, action: #selector(sendReplyTapped), for: .touchUpInside)

        sendSpinner.color = .white
        sendSpinner.hidesWhenStopped = true
        sendSpinner.translatesAutoresizingMaskIntoConstraints = false
        sendBtn.addSubview(sendSpinner)
        NSLayoutConstraint.activate([
            sendSpinner.centerXAnchor.constraint(equalTo: sendBtn.centerXAnchor),
            sendSpinner.centerYAnchor.constraint(equalTo: sendBtn.centerYAnchor)
        ])

        composerBar.addSubview(replyField)
        composerBar.addSubview(sendBtn)
        view.addSubview(composerBar)

        NSLayoutConstraint.activate([
            dragPill.topAnchor.constraint(equalTo: view.topAnchor, constant: 10),
            dragPill.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            dragPill.widthAnchor.constraint(equalToConstant: 40),
            dragPill.heightAnchor.constraint(equalToConstant: 5),

            topRow.topAnchor.constraint(equalTo: dragPill.bottomAnchor, constant: 12),
            topRow.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 16),
            topRow.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -16),

            closeBtn.widthAnchor.constraint(equalToConstant: 32),
            closeBtn.heightAnchor.constraint(equalToConstant: 32),

            subjLabel.topAnchor.constraint(equalTo: topRow.bottomAnchor, constant: 10),
            subjLabel.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 16),
            subjLabel.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -16),

            descBox.topAnchor.constraint(equalTo: subjLabel.bottomAnchor, constant: 8),
            descBox.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 16),
            descBox.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -16),

            threadHeader.topAnchor.constraint(equalTo: descBox.bottomAnchor, constant: 12),
            threadHeader.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 16),
            threadHeader.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -16),

            messagesScroll.topAnchor.constraint(equalTo: threadHeader.bottomAnchor, constant: 8),
            messagesScroll.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 16),
            messagesScroll.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -16),
            messagesScroll.bottomAnchor.constraint(equalTo: composerBar.topAnchor, constant: -8),

            messagesStack.topAnchor.constraint(equalTo: messagesScroll.topAnchor),
            messagesStack.bottomAnchor.constraint(equalTo: messagesScroll.bottomAnchor, constant: -10),
            messagesStack.leadingAnchor.constraint(equalTo: messagesScroll.leadingAnchor),
            messagesStack.trailingAnchor.constraint(equalTo: messagesScroll.trailingAnchor),
            messagesStack.widthAnchor.constraint(equalTo: messagesScroll.widthAnchor),

            noMessagesLabel.centerXAnchor.constraint(equalTo: messagesScroll.centerXAnchor),
            noMessagesLabel.centerYAnchor.constraint(equalTo: messagesScroll.centerYAnchor),

            composerBar.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 16),
            composerBar.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -16),
            composerBar.bottomAnchor.constraint(equalTo: view.keyboardLayoutGuide.topAnchor, constant: -8),
            composerBar.heightAnchor.constraint(equalToConstant: 44),

            replyField.leadingAnchor.constraint(equalTo: composerBar.leadingAnchor, constant: 12),
            replyField.trailingAnchor.constraint(equalTo: sendBtn.leadingAnchor, constant: -8),
            replyField.topAnchor.constraint(equalTo: composerBar.topAnchor),
            replyField.bottomAnchor.constraint(equalTo: composerBar.bottomAnchor),

            sendBtn.trailingAnchor.constraint(equalTo: composerBar.trailingAnchor, constant: -6),
            sendBtn.centerYAnchor.constraint(equalTo: composerBar.centerYAnchor),
            sendBtn.widthAnchor.constraint(equalToConstant: 32),
            sendBtn.heightAnchor.constraint(equalToConstant: 32)
        ])
    }

    private func fetchThread() {
        guard let ticketId = ticket["id"] as? String else { return }

        Task {
            guard let url = URL(string: "https://app.patholab.cloud/api/support/\(ticketId)") else { return }
            var req = URLRequest(url: url)
            req.httpMethod = "GET"
            req.setValue("application/json", forHTTPHeaderField: "Accept")

            let token = KeychainManager.read(forKey: KeychainManager.tokenKey) ??
                        UserDefaults.standard.string(forKey: "auth_token") ??
                        UserDefaults.standard.string(forKey: "token")

            if let t = token {
                req.setValue("Bearer \(t)", forHTTPHeaderField: "Authorization")
                req.setValue("token=\(t)", forHTTPHeaderField: "Cookie")
            }

            do {
                let (data, resp) = try await URLSession.shared.data(for: req)
                if let http = resp as? HTTPURLResponse, http.statusCode == 200,
                   let detail = try JSONSerialization.jsonObject(with: data) as? [String: Any] {
                    await MainActor.run {
                        self.ticket = detail
                        let status = (detail["status"] as? String ?? "OPEN").uppercased()
                        self.statusLabel.text = status
                        self.statusLabel.textColor = status == "OPEN" ? .systemRed : (status == "RESOLVED" ? .systemGreen : .systemOrange)

                        let msgs = detail["messages"] as? [[String: Any]] ?? []
                        self.renderMessages(msgs)
                    }
                }
            } catch {}
        }
    }

    private func renderMessages(_ msgs: [[String: Any]]) {
        messagesStack.arrangedSubviews.forEach { $0.removeFromSuperview() }
        noMessagesLabel.isHidden = !msgs.isEmpty

        for msg in msgs {
            let isStaff = msg["isStaff"] as? Bool ?? false
            let senderName = msg["senderName"] as? String ?? (isStaff ? "Support Specialist" : "You")
            let body = msg["message"] as? String ?? ""
            let createdAt = msg["createdAt"] as? String ?? ""

            let bubble = createMessageBubble(isStaff: isStaff, sender: senderName, body: body, time: formatTime(createdAt))
            messagesStack.addArrangedSubview(bubble)
        }

        // Auto-scroll to bottom
        DispatchQueue.main.async {
            let bottomOffset = CGPoint(x: 0, y: max(0, self.messagesScroll.contentSize.height - self.messagesScroll.bounds.height))
            self.messagesScroll.setContentOffset(bottomOffset, animated: true)
        }
    }

    private func createMessageBubble(isStaff: Bool, sender: String, body: String, time: String) -> UIView {
        let container = UIView()
        container.translatesAutoresizingMaskIntoConstraints = false

        let bubble = UIView()
        bubble.layer.cornerRadius = 14
        bubble.translatesAutoresizingMaskIntoConstraints = false

        let bodyLbl = UILabel()
        bodyLbl.text = body
        bodyLbl.font = .systemFont(ofSize: 13)
        bodyLbl.numberOfLines = 0
        bodyLbl.translatesAutoresizingMaskIntoConstraints = false

        let timeLbl = UILabel()
        timeLbl.text = time
        timeLbl.font = .systemFont(ofSize: 9.5)
        timeLbl.textColor = UIColor(red: 0.580, green: 0.639, blue: 0.722, alpha: 1)
        timeLbl.translatesAutoresizingMaskIntoConstraints = false

        if isStaff {
            bubble.backgroundColor = UIColor(red: 0.945, green: 0.961, blue: 0.976, alpha: 1) // #F1F5F9
            bubble.layer.borderWidth = 1
            bubble.layer.borderColor = UIColor(red: 0.886, green: 0.910, blue: 0.941, alpha: 1).cgColor
            bodyLbl.textColor = UIColor(red: 0.118, green: 0.161, blue: 0.231, alpha: 1)

            let badge = UILabel()
            badge.text = "Support Specialist"
            badge.font = .systemFont(ofSize: 9.5, weight: .bold)
            badge.textColor = UIColor(red: 0.706, green: 0.325, blue: 0.035, alpha: 1)
            badge.translatesAutoresizingMaskIntoConstraints = false

            bubble.addSubview(badge)
            bubble.addSubview(bodyLbl)
            container.addSubview(bubble)
            container.addSubview(timeLbl)

            NSLayoutConstraint.activate([
                badge.topAnchor.constraint(equalTo: bubble.topAnchor, constant: 6),
                badge.leadingAnchor.constraint(equalTo: bubble.leadingAnchor, constant: 10),
                badge.trailingAnchor.constraint(equalTo: bubble.trailingAnchor, constant: -10),

                bodyLbl.topAnchor.constraint(equalTo: badge.bottomAnchor, constant: 4),
                bodyLbl.bottomAnchor.constraint(equalTo: bubble.bottomAnchor, constant: -8),
                bodyLbl.leadingAnchor.constraint(equalTo: bubble.leadingAnchor, constant: 10),
                bodyLbl.trailingAnchor.constraint(equalTo: bubble.trailingAnchor, constant: -10),

                bubble.leadingAnchor.constraint(equalTo: container.leadingAnchor),
                bubble.topAnchor.constraint(equalTo: container.topAnchor),
                bubble.widthAnchor.constraint(lessThanOrEqualTo: container.widthAnchor, multiplier: 0.82),

                timeLbl.topAnchor.constraint(equalTo: bubble.bottomAnchor, constant: 2),
                timeLbl.leadingAnchor.constraint(equalTo: bubble.leadingAnchor, constant: 4),
                timeLbl.bottomAnchor.constraint(equalTo: container.bottomAnchor)
            ])
        } else {
            bubble.backgroundColor = UIColor(red: 0.145, green: 0.388, blue: 0.922, alpha: 1) // #2563EB
            bodyLbl.textColor = .white

            bubble.addSubview(bodyLbl)
            container.addSubview(bubble)
            container.addSubview(timeLbl)

            NSLayoutConstraint.activate([
                bodyLbl.topAnchor.constraint(equalTo: bubble.topAnchor, constant: 8),
                bodyLbl.bottomAnchor.constraint(equalTo: bubble.bottomAnchor, constant: -8),
                bodyLbl.leadingAnchor.constraint(equalTo: bubble.leadingAnchor, constant: 10),
                bodyLbl.trailingAnchor.constraint(equalTo: bubble.trailingAnchor, constant: -10),

                bubble.trailingAnchor.constraint(equalTo: container.trailingAnchor),
                bubble.topAnchor.constraint(equalTo: container.topAnchor),
                bubble.widthAnchor.constraint(lessThanOrEqualTo: container.widthAnchor, multiplier: 0.82),

                timeLbl.topAnchor.constraint(equalTo: bubble.bottomAnchor, constant: 2),
                timeLbl.trailingAnchor.constraint(equalTo: bubble.trailingAnchor, constant: -4),
                timeLbl.bottomAnchor.constraint(equalTo: container.bottomAnchor)
            ])
        }

        return container
    }

    @objc private func closeTapped() {
        dismiss(animated: true, completion: nil)
    }

    @objc private func sendReplyTapped() {
        let text = (replyField.text ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        if text.isEmpty { return }
        guard let ticketId = ticket["id"] as? String else { return }

        sendBtn.setImage(nil, for: .normal)
        sendSpinner.startAnimating()
        sendBtn.isEnabled = false

        Task {
            guard let url = URL(string: "https://app.patholab.cloud/api/support/\(ticketId)") else { return }
            var req = URLRequest(url: url)
            req.httpMethod = "POST"
            req.setValue("application/json", forHTTPHeaderField: "Content-Type")
            req.setValue("application/json", forHTTPHeaderField: "Accept")

            let token = KeychainManager.read(forKey: KeychainManager.tokenKey) ??
                        UserDefaults.standard.string(forKey: "auth_token") ??
                        UserDefaults.standard.string(forKey: "token")

            if let t = token {
                req.setValue("Bearer \(t)", forHTTPHeaderField: "Authorization")
                req.setValue("token=\(t)", forHTTPHeaderField: "Cookie")
            }

            let body: [String: Any] = [
                "message": text,
                "isStaff": false,
                "senderName": "Client"
            ]
            req.httpBody = try? JSONSerialization.data(withJSONObject: body)

            do {
                let (_, resp) = try await URLSession.shared.data(for: req)
                if let http = resp as? HTTPURLResponse, (http.statusCode == 200 || http.statusCode == 201) {
                    await MainActor.run {
                        self.sendSpinner.stopAnimating()
                        self.sendBtn.setImage(UIImage(systemName: "paperplane.fill"), for: .normal)
                        self.sendBtn.isEnabled = true
                        self.replyField.text = ""
                        self.fetchThread()
                    }
                } else {
                    await MainActor.run {
                        self.sendSpinner.stopAnimating()
                        self.sendBtn.setImage(UIImage(systemName: "paperplane.fill"), for: .normal)
                        self.sendBtn.isEnabled = true
                    }
                }
            } catch {
                await MainActor.run {
                    self.sendSpinner.stopAnimating()
                    self.sendBtn.setImage(UIImage(systemName: "paperplane.fill"), for: .normal)
                    self.sendBtn.isEnabled = true
                }
            }
        }
    }

    private func formatTime(_ iso: String) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        var date = formatter.date(from: iso)
        if date == nil {
            let fallback = ISO8601DateFormatter()
            date = fallback.date(from: iso)
        }
        guard let d = date else { return "" }
        let out = DateFormatter()
        out.dateFormat = "hh:mm a"
        return out.string(from: d)
    }
}
