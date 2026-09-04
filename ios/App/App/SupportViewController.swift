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
            UIColor(red: 0.039, green: 0.098, blue: 0.184, alpha: 1).cgColor, // #0A192F
            UIColor(red: 0.051, green: 0.165, blue: 0.439, alpha: 1).cgColor, // #0D2A70
            UIColor(red: 0.118, green: 0.227, blue: 0.541, alpha: 1).cgColor  // #1E3A8A
        ]
        heroGradientLayer.startPoint = CGPoint(x: 0, y: 0)
        heroGradientLayer.endPoint   = CGPoint(x: 1, y: 1)
        heroHeaderView.layer.insertSublayer(heroGradientLayer, at: 0)
        heroHeaderView.layer.cornerRadius = 28
        heroHeaderView.layer.maskedCorners = [.layerMinXMaxYCorner, .layerMaxXMaxYCorner]
        heroHeaderView.clipsToBounds = true
        view.addSubview(heroHeaderView)

        // Back Button
        backBtn.setImage(UIImage(systemName: "chevron.left"), for: .normal)
        backBtn.tintColor = .white
        backBtn.backgroundColor = UIColor.white.withAlphaComponent(0.18)
        backBtn.layer.cornerRadius = 19
        backBtn.layer.borderWidth = 1
        backBtn.layer.borderColor = UIColor.white.withAlphaComponent(0.25).cgColor
        backBtn.translatesAutoresizingMaskIntoConstraints = false
        backBtn.addTarget(self, action: #selector(backTapped), for: .touchUpInside)

        // Titles
        titleLabel.text = "Help & Support"
        titleLabel.font = .systemFont(ofSize: 20, weight: .bold)
        titleLabel.textColor = .white

        subtitleLabel.text = "24/7 Dedicated Assistance Desk"
        subtitleLabel.font = .systemFont(ofSize: 12, weight: .medium)
        subtitleLabel.textColor = UIColor(red: 0.576, green: 0.773, blue: 0.992, alpha: 1) // #93C5FD

        let titleStack = UIStackView(arrangedSubviews: [titleLabel, subtitleLabel])
        titleStack.axis = .vertical
        titleStack.spacing = 2
        titleStack.translatesAutoresizingMaskIntoConstraints = false

        // New Ticket Button in Header
        headerNewTicketBtn.setTitle("+ New Ticket", for: .normal)
        headerNewTicketBtn.titleLabel?.font = .systemFont(ofSize: 13, weight: .bold)
        headerNewTicketBtn.setTitleColor(.white, for: .normal)
        headerNewTicketBtn.backgroundColor = UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1) // #0D6EFD
        headerNewTicketBtn.layer.cornerRadius = 18
        headerNewTicketBtn.contentEdgeInsets = UIEdgeInsets(top: 8, left: 14, bottom: 8, right: 14)
        headerNewTicketBtn.translatesAutoresizingMaskIntoConstraints = false
        headerNewTicketBtn.addTarget(self, action: #selector(newTicketTapped), for: .touchUpInside)

        let topBar = UIView()
        topBar.translatesAutoresizingMaskIntoConstraints = false
        topBar.addSubview(backBtn)
        topBar.addSubview(titleStack)
        topBar.addSubview(headerNewTicketBtn)

        // KPI Cards Row
        let kpiStack = UIStackView()
        kpiStack.axis = .horizontal
        kpiStack.distribution = .fillEqually
        kpiStack.spacing = 8
        kpiStack.translatesAutoresizingMaskIntoConstraints = false

        setupKpiCard(kpiOpenCard, countLabel: kpiOpenCount, tag: "OPEN", sub: "Awaiting review", color: UIColor(red: 0.937, green: 0.267, blue: 0.267, alpha: 1))
        setupKpiCard(kpiProgressCard, countLabel: kpiProgressCount, tag: "IN PROGRESS", sub: "Being handled", color: UIColor(red: 0.961, green: 0.620, blue: 0.043, alpha: 1))
        setupKpiCard(kpiResolvedCard, countLabel: kpiResolvedCount, tag: "RESOLVED", sub: "Completed", color: UIColor(red: 0.063, green: 0.725, blue: 0.506, alpha: 1))

        kpiOpenCard.addGestureRecognizer(UITapGestureRecognizer(target: self, action: #selector(kpiOpenTapped)))
        kpiProgressCard.addGestureRecognizer(UITapGestureRecognizer(target: self, action: #selector(kpiProgressTapped)))
        kpiResolvedCard.addGestureRecognizer(UITapGestureRecognizer(target: self, action: #selector(kpiResolvedTapped)))

        kpiStack.addArrangedSubview(kpiOpenCard)
        kpiStack.addArrangedSubview(kpiProgressCard)
        kpiStack.addArrangedSubview(kpiResolvedCard)

        heroHeaderView.addSubview(topBar)
        heroHeaderView.addSubview(kpiStack)

        NSLayoutConstraint.activate([
            heroHeaderView.topAnchor.constraint(equalTo: view.topAnchor),
            heroHeaderView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            heroHeaderView.trailingAnchor.constraint(equalTo: view.trailingAnchor),

            topBar.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 4),
            topBar.leadingAnchor.constraint(equalTo: heroHeaderView.leadingAnchor, constant: 18),
            topBar.trailingAnchor.constraint(equalTo: heroHeaderView.trailingAnchor, constant: -18),
            topBar.heightAnchor.constraint(equalToConstant: 44),

            backBtn.leadingAnchor.constraint(equalTo: topBar.leadingAnchor),
            backBtn.centerYAnchor.constraint(equalTo: topBar.centerYAnchor),
            backBtn.widthAnchor.constraint(equalToConstant: 38),
            backBtn.heightAnchor.constraint(equalToConstant: 38),

            titleStack.leadingAnchor.constraint(equalTo: backBtn.trailingAnchor, constant: 12),
            titleStack.centerYAnchor.constraint(equalTo: topBar.centerYAnchor),

            headerNewTicketBtn.trailingAnchor.constraint(equalTo: topBar.trailingAnchor),
            headerNewTicketBtn.centerYAnchor.constraint(equalTo: topBar.centerYAnchor),
            headerNewTicketBtn.heightAnchor.constraint(equalToConstant: 36),

            kpiStack.topAnchor.constraint(equalTo: topBar.bottomAnchor, constant: 16),
            kpiStack.leadingAnchor.constraint(equalTo: heroHeaderView.leadingAnchor, constant: 18),
            kpiStack.trailingAnchor.constraint(equalTo: heroHeaderView.trailingAnchor, constant: -18),
            kpiStack.bottomAnchor.constraint(equalTo: heroHeaderView.bottomAnchor, constant: -18)
        ])
    }

    private func setupKpiCard(_ card: UIView, countLabel: UILabel, tag: String, sub: String, color: UIColor) {
        card.backgroundColor = .white
        card.layer.cornerRadius = 14
        card.layer.masksToBounds = true
        card.translatesAutoresizingMaskIntoConstraints = false

        let tagLbl = UILabel()
        tagLbl.text = tag
        tagLbl.font = .systemFont(ofSize: 10, weight: .bold)
        tagLbl.textColor = color
        tagLbl.translatesAutoresizingMaskIntoConstraints = false

        countLabel.text = "0"
        countLabel.font = .systemFont(ofSize: 20, weight: .bold)
        countLabel.textColor = UIColor(red: 0.059, green: 0.090, blue: 0.165, alpha: 1) // #0F172A
        countLabel.translatesAutoresizingMaskIntoConstraints = false

        let subLbl = UILabel()
        subLbl.text = sub
        subLbl.font = .systemFont(ofSize: 9.5, weight: .medium)
        subLbl.textColor = UIColor(red: 0.392, green: 0.455, blue: 0.545, alpha: 1) // #64748B
        subLbl.translatesAutoresizingMaskIntoConstraints = false

        let stack = UIStackView(arrangedSubviews: [tagLbl, countLabel, subLbl])
        stack.axis = .vertical
        stack.spacing = 2
        stack.alignment = .leading
        stack.translatesAutoresizingMaskIntoConstraints = false
        card.addSubview(stack)

        NSLayoutConstraint.activate([
            stack.topAnchor.constraint(equalTo: card.topAnchor, constant: 10),
            stack.bottomAnchor.constraint(equalTo: card.bottomAnchor, constant: -10),
            stack.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 10),
            stack.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -10)
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
        setupFaqsSection()
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
    // MARK: – FAQs Accordion Section
    // ─────────────────────────────────────────────────────────────────────────
    private func setupFaqsSection() {
        let faqHeader = UIView()
        faqHeader.translatesAutoresizingMaskIntoConstraints = false

        let faqTitle = UILabel()
        faqTitle.text = "Frequently Asked Questions"
        faqTitle.font = .systemFont(ofSize: 16, weight: .bold)
        faqTitle.textColor = UIColor(red: 0.059, green: 0.090, blue: 0.165, alpha: 1)

        let faqSub = UILabel()
        faqSub.text = "Quick solutions to standard workflow and system questions"
        faqSub.font = .systemFont(ofSize: 12)
        faqSub.textColor = UIColor(red: 0.392, green: 0.455, blue: 0.545, alpha: 1)

        let headerStack = UIStackView(arrangedSubviews: [faqTitle, faqSub])
        headerStack.axis = .vertical
        headerStack.spacing = 2
        headerStack.translatesAutoresizingMaskIntoConstraints = false
        faqHeader.addSubview(headerStack)

        NSLayoutConstraint.activate([
            headerStack.topAnchor.constraint(equalTo: faqHeader.topAnchor, constant: 14),
            headerStack.bottomAnchor.constraint(equalTo: faqHeader.bottomAnchor, constant: -4),
            headerStack.leadingAnchor.constraint(equalTo: faqHeader.leadingAnchor),
            headerStack.trailingAnchor.constraint(equalTo: faqHeader.trailingAnchor)
        ])

        contentStack.addArrangedSubview(faqHeader)

        let faqs = [
            ("How do I add new test parameters to inventory?", "Navigate to Laboratory Settings > Tests Catalog. Click 'Add Parameter' to configure reference ranges, units, specimen type, and pricing."),
            ("Why is my WhatsApp messaging balance decreasing?", "Each automated WhatsApp report delivery and OTP notification consumes 1 WhatsApp credit. Recharge credits seamlessly in the Wallet & Billing screen."),
            ("How do I print barcoded patient sample labels?", "On the Patient Registration confirmation or Sample Logistics screen, tap 'Print Label' to send the 50x25mm barcode to any paired Bluetooth thermal printer."),
            ("How to configure thermal Bluetooth receipt printers?", "Go to Settings > Printer Setup. Ensure Bluetooth is enabled, choose ESC/POS 58mm or 80mm mode, and perform a test print.")
        ]

        for (q, a) in faqs {
            contentStack.addArrangedSubview(createFaqCard(question: q, answer: a))
        }
    }

    private func createFaqCard(question: String, answer: String) -> UIView {
        let card = UIView()
        card.backgroundColor = .white
        card.layer.cornerRadius = 14
        card.layer.borderWidth = 1
        card.layer.borderColor = UIColor(red: 0.886, green: 0.910, blue: 0.941, alpha: 1).cgColor
        card.translatesAutoresizingMaskIntoConstraints = false

        let qLabel = UILabel()
        qLabel.text = question
        qLabel.font = .systemFont(ofSize: 13, weight: .bold)
        qLabel.textColor = UIColor(red: 0.118, green: 0.161, blue: 0.231, alpha: 1) // #1E293B
        qLabel.numberOfLines = 0
        qLabel.translatesAutoresizingMaskIntoConstraints = false

        let chevron = UIImageView(image: UIImage(systemName: "chevron.down"))
        chevron.tintColor = UIColor(red: 0.392, green: 0.455, blue: 0.545, alpha: 1)
        chevron.contentMode = .scaleAspectFit
        chevron.translatesAutoresizingMaskIntoConstraints = false

        let qRow = UIStackView(arrangedSubviews: [qLabel, chevron])
        qRow.axis = .horizontal
        qRow.alignment = .center
        qRow.spacing = 8
        qRow.translatesAutoresizingMaskIntoConstraints = false

        let aLabel = UILabel()
        aLabel.text = answer
        aLabel.font = .systemFont(ofSize: 12)
        aLabel.textColor = UIColor(red: 0.278, green: 0.333, blue: 0.412, alpha: 1)
        aLabel.numberOfLines = 0
        aLabel.isHidden = true
        aLabel.translatesAutoresizingMaskIntoConstraints = false

        let stack = UIStackView(arrangedSubviews: [qRow, aLabel])
        stack.axis = .vertical
        stack.spacing = 8
        stack.translatesAutoresizingMaskIntoConstraints = false
        card.addSubview(stack)

        NSLayoutConstraint.activate([
            chevron.widthAnchor.constraint(equalToConstant: 14),
            chevron.heightAnchor.constraint(equalToConstant: 14),
            stack.topAnchor.constraint(equalTo: card.topAnchor, constant: 14),
            stack.bottomAnchor.constraint(equalTo: card.bottomAnchor, constant: -14),
            stack.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 14),
            stack.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -14)
        ])

        let tap = UITapGestureRecognizer(target: self, action: #selector(faqTapped(_:)))
        card.addGestureRecognizer(tap)
        card.isUserInteractionEnabled = true
        return card
    }

    @objc private func faqTapped(_ gesture: UITapGestureRecognizer) {
        guard let card = gesture.view,
              let stack = card.subviews.first as? UIStackView,
              let qRow = stack.arrangedSubviews.first as? UIStackView,
              let chevron = qRow.arrangedSubviews.last as? UIImageView,
              let aLabel = stack.arrangedSubviews.last as? UILabel else { return }

        let willShow = aLabel.isHidden
        UIView.animate(withDuration: 0.25) {
            aLabel.isHidden = !willShow
            chevron.transform = willShow ? CGAffineTransform(rotationAngle: .pi) : .identity
            self.view.layoutIfNeeded()
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MARK: – Direct Assistance Channels Section
    // ─────────────────────────────────────────────────────────────────────────
    private func setupContactChannelsSection() {
        let card = UIView()
        card.backgroundColor = .white
        card.layer.cornerRadius = 16
        card.layer.borderWidth = 1
        card.layer.borderColor = UIColor(red: 0.886, green: 0.910, blue: 0.941, alpha: 1).cgColor
        card.translatesAutoresizingMaskIntoConstraints = false

        let title = UILabel()
        title.text = "Direct Assistance Channels"
        title.font = .systemFont(ofSize: 15, weight: .bold)
        title.textColor = UIColor(red: 0.059, green: 0.090, blue: 0.165, alpha: 1)

        let sub = UILabel()
        sub.text = "Reach our dedicated clinical technical team immediately"
        sub.font = .systemFont(ofSize: 12)
        sub.textColor = UIColor(red: 0.392, green: 0.455, blue: 0.545, alpha: 1)

        let callRow = createContactRow(icon: "phone.fill", iconColor: UIColor(red: 0.145, green: 0.388, blue: 0.922, alpha: 1), title: "Priority Hotline (\(Self.supportPhone))", action: #selector(callTapped))
        let waRow = createContactRow(icon: "message.fill", iconColor: UIColor(red: 0.086, green: 0.639, blue: 0.290, alpha: 1), title: "WhatsApp Concierge Desk", action: #selector(whatsappTapped))
        let emailRow = createContactRow(icon: "envelope.fill", iconColor: UIColor(red: 0.310, green: 0.275, blue: 0.898, alpha: 1), title: "Official Support (\(Self.supportEmail))", action: #selector(emailTapped))

        let stack = UIStackView(arrangedSubviews: [title, sub, callRow, waRow, emailRow])
        stack.axis = .vertical
        stack.spacing = 10
        stack.translatesAutoresizingMaskIntoConstraints = false
        card.addSubview(stack)

        NSLayoutConstraint.activate([
            stack.topAnchor.constraint(equalTo: card.topAnchor, constant: 16),
            stack.bottomAnchor.constraint(equalTo: card.bottomAnchor, constant: -16),
            stack.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 14),
            stack.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -14)
        ])

        contentStack.addArrangedSubview(card)
    }

    private func createContactRow(icon: String, iconColor: UIColor, title: String, action: Selector) -> UIView {
        let row = UIView()
        row.backgroundColor = UIColor(red: 0.973, green: 0.980, blue: 0.988, alpha: 1)
        row.layer.cornerRadius = 10
        row.layer.borderWidth = 1
        row.layer.borderColor = UIColor(red: 0.941, green: 0.957, blue: 0.973, alpha: 1).cgColor
        row.translatesAutoresizingMaskIntoConstraints = false

        let iv = UIImageView(image: UIImage(systemName: icon))
        iv.tintColor = iconColor
        iv.contentMode = .scaleAspectFit
        iv.translatesAutoresizingMaskIntoConstraints = false

        let lbl = UILabel()
        lbl.text = title
        lbl.font = .systemFont(ofSize: 13, weight: .bold)
        lbl.textColor = UIColor(red: 0.059, green: 0.090, blue: 0.165, alpha: 1)
        lbl.translatesAutoresizingMaskIntoConstraints = false

        let chevron = UIImageView(image: UIImage(systemName: "chevron.right"))
        chevron.tintColor = UIColor(red: 0.580, green: 0.639, blue: 0.722, alpha: 1)
        chevron.contentMode = .scaleAspectFit
        chevron.translatesAutoresizingMaskIntoConstraints = false

        row.addSubview(iv)
        row.addSubview(lbl)
        row.addSubview(chevron)

        NSLayoutConstraint.activate([
            row.heightAnchor.constraint(equalToConstant: 44),
            iv.leadingAnchor.constraint(equalTo: row.leadingAnchor, constant: 12),
            iv.centerYAnchor.constraint(equalTo: row.centerYAnchor),
            iv.widthAnchor.constraint(equalToConstant: 18),
            iv.heightAnchor.constraint(equalToConstant: 18),

            lbl.leadingAnchor.constraint(equalTo: iv.trailingAnchor, constant: 10),
            lbl.trailingAnchor.constraint(equalTo: chevron.leadingAnchor, constant: -6),
            lbl.centerYAnchor.constraint(equalTo: row.centerYAnchor),

            chevron.trailingAnchor.constraint(equalTo: row.trailingAnchor, constant: -12),
            chevron.centerYAnchor.constraint(equalTo: row.centerYAnchor),
            chevron.widthAnchor.constraint(equalToConstant: 12),
            chevron.heightAnchor.constraint(equalToConstant: 12)
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
        let priority = (ticket["priority"] as? String ?? "MEDIUM").uppercased()
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
