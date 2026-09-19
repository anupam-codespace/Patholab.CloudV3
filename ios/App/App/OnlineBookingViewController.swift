import UIKit

/**
 * OnlineBookingViewController
 * ─────────────────────────────────────────────────────────────────────────────
 * Native dedicated Online Booking & B2B2C Public Portal Management Console (iOS).
 * Complete parity with web module (/workspace/bookings & /workspace/bookings/settings):
 *  - Fused Sapphire Header with live portal status pill, settings & sync actions
 *  - Horizontal KPI scroll metrics (Total Bookings, New Today, Pending Action, Revenue, Home Collections)
 *  - Real-time search Omnibar & category filter chips
 *  - Rich booking cards with direct Call, WhatsApp, Assign Trip, and Collect Sample actions
 *  - Interactive Booking Detail modal sheet with maps navigation, reschedule picker & workflow status mutations
 *  - In-app New Booking creation modal sheet with live test catalog search, multi-select cart & address routing
 *  - Public Portal Settings modal sheet with custom slug editor, copy link, and native iOS share sheet
 */
class OnlineBookingViewController: UIViewController, UITextFieldDelegate, UITableViewDelegate, UITableViewDataSource {

    static let baseUrl = "https://app.patholab.cloud"

    // ── Fused Hero Header ──
    private let heroHeaderView     = UIView()
    private let heroGradientLayer  = CAGradientLayer()
    private let backBtn            = UIButton(type: .system)
    private let titleLabel         = UILabel()
    private let subtitleLabel      = UILabel()
    private let settingsBtn        = UIButton(type: .system)
    private let refreshBtn         = UIButton(type: .system)

    // ── Dedicated Public Portal Banner Card (Matches Web Screenshot 3) ──
    private let portalBannerCard   = UIView()
    private let portalActiveView   = UIView()
    private let portalOfflineView  = UIView()
    private let portalUrlLabel     = UILabel()
    private let copyUrlBtn         = UIButton(type: .system)
    private let shareWhatsAppBtn   = UIButton(type: .system)
    private let openBrowserBtn     = UIButton(type: .system)
    private let enablePortalBtn    = UIButton(type: .system)

    // ── 4 KPI Metrics Scroll (Exact Web Parity) ──
    private let kpiScrollView      = UIScrollView()
    private let kpiStackView       = UIStackView()
    private let kpiTotalTodayLbl   = UILabel()
    private let kpiPendingCountLbl = UILabel()
    private let kpiRevenueLbl      = UILabel()
    private let kpiTotalCountLbl   = UILabel()

    // ── Real-Time Auto Refresh Timer ──
    private var autoRefreshTimer: Timer?

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
    private let fabNewBooking      = UIButton(type: .system)

    // ── Data & State ──
    private var allBookings: [[String: Any]] = []
    private var filteredBookings: [[String: Any]] = []
    private var testCatalog: [[String: Any]] = []

    private var currentFilter: String = "ALL" // ALL, PENDING, ASSIGNED, SAMPLE_COLLECTED, COMPLETED, HOME_COLLECTION, LAB_VISIT, CANCELLED
    private var searchQuery: String = ""
    private var portalSlug: String? = nil
    private var portalUrl: String? = nil
    private var isPortalLive: Bool = false

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 0.973, green: 0.980, blue: 0.988, alpha: 1) // #F8FAFC

        setupHeroHeader()
        setupPortalBanner()
        setupKpis()
        setupSearchAndFilters()
        setupTableView()
        setupFab()
        setupEmptyView()

        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleAppForeground),
            name: UIApplication.willEnterForegroundNotification,
            object: nil
        )

        fetchBookingsData(isManual: false)
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        fetchBookingsData(isManual: false)
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        startAutoRefreshTimer()
    }

    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        stopAutoRefreshTimer()
    }

    private func startAutoRefreshTimer() {
        stopAutoRefreshTimer()
        autoRefreshTimer = Timer.scheduledTimer(withTimeInterval: 25.0, repeats: true) { [weak self] _ in
            self?.fetchBookingsData(isManual: false, isSilent: true)
        }
    }

    private func stopAutoRefreshTimer() {
        autoRefreshTimer?.invalidate()
        autoRefreshTimer = nil
    }

    @objc private func handleAppForeground() {
        fetchBookingsData(isManual: false, isSilent: true)
    }

    deinit {
        stopAutoRefreshTimer()
        NotificationCenter.default.removeObserver(self)
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        heroGradientLayer.frame = heroHeaderView.bounds
    }

    override var preferredStatusBarStyle: UIStatusBarStyle {
        return .lightContent
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MARK: – UI Setup
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
        heroHeaderView.layer.addSublayer(heroGradientLayer)
        view.addSubview(heroHeaderView)

        // Back Button
        backBtn.translatesAutoresizingMaskIntoConstraints = false
        backBtn.setImage(UIImage(systemName: "chevron.left"), for: .normal)
        backBtn.tintColor = .white
        backBtn.backgroundColor = UIColor.white.withAlphaComponent(0.15)
        backBtn.layer.cornerRadius = 18
        backBtn.addTarget(self, action: #selector(handleBack), for: .touchUpInside)
        heroHeaderView.addSubview(backBtn)

        // Titles
        titleLabel.translatesAutoresizingMaskIntoConstraints = false
        titleLabel.text = "Online Bookings"
        titleLabel.font = .systemFont(ofSize: 20, weight: .bold)
        titleLabel.textColor = .white
        heroHeaderView.addSubview(titleLabel)

        subtitleLabel.translatesAutoresizingMaskIntoConstraints = false
        subtitleLabel.text = "Manage B2B2C patient appointments and home collections."
        subtitleLabel.font = .systemFont(ofSize: 11.5, weight: .medium)
        subtitleLabel.textColor = UIColor(red: 0.78, green: 0.87, blue: 1.0, alpha: 1)
        heroHeaderView.addSubview(subtitleLabel)

        // Settings Button
        settingsBtn.translatesAutoresizingMaskIntoConstraints = false
        settingsBtn.setImage(UIImage(systemName: "gearshape.fill"), for: .normal)
        settingsBtn.tintColor = .white
        settingsBtn.backgroundColor = UIColor.white.withAlphaComponent(0.15)
        settingsBtn.layer.cornerRadius = 18
        settingsBtn.addTarget(self, action: #selector(openPortalSettingsSheet), for: .touchUpInside)
        heroHeaderView.addSubview(settingsBtn)

        // Refresh Button
        refreshBtn.translatesAutoresizingMaskIntoConstraints = false
        refreshBtn.setImage(UIImage(systemName: "arrow.clockwise"), for: .normal)
        refreshBtn.tintColor = .white
        refreshBtn.backgroundColor = UIColor.white.withAlphaComponent(0.15)
        refreshBtn.layer.cornerRadius = 18
        refreshBtn.addTarget(self, action: #selector(handleManualRefresh), for: .touchUpInside)
        heroHeaderView.addSubview(refreshBtn)

        NSLayoutConstraint.activate([
            heroHeaderView.topAnchor.constraint(equalTo: view.topAnchor),
            heroHeaderView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            heroHeaderView.trailingAnchor.constraint(equalTo: view.trailingAnchor),

            backBtn.leadingAnchor.constraint(equalTo: heroHeaderView.leadingAnchor, constant: 16),
            backBtn.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 8),
            backBtn.widthAnchor.constraint(equalToConstant: 36),
            backBtn.heightAnchor.constraint(equalToConstant: 36),

            titleLabel.leadingAnchor.constraint(equalTo: backBtn.trailingAnchor, constant: 12),
            titleLabel.topAnchor.constraint(equalTo: backBtn.topAnchor),

            subtitleLabel.leadingAnchor.constraint(equalTo: titleLabel.leadingAnchor),
            subtitleLabel.topAnchor.constraint(equalTo: titleLabel.bottomAnchor, constant: 2),

            refreshBtn.trailingAnchor.constraint(equalTo: heroHeaderView.trailingAnchor, constant: -16),
            refreshBtn.centerYAnchor.constraint(equalTo: backBtn.centerYAnchor),
            refreshBtn.widthAnchor.constraint(equalToConstant: 36),
            refreshBtn.heightAnchor.constraint(equalToConstant: 36),

            settingsBtn.trailingAnchor.constraint(equalTo: refreshBtn.leadingAnchor, constant: -8),
            settingsBtn.centerYAnchor.constraint(equalTo: backBtn.centerYAnchor),
            settingsBtn.widthAnchor.constraint(equalToConstant: 36),
            settingsBtn.heightAnchor.constraint(equalToConstant: 36),

            heroHeaderView.bottomAnchor.constraint(equalTo: subtitleLabel.bottomAnchor, constant: 40)
        ])
    }

    private func setupPortalBanner() {
        portalBannerCard.translatesAutoresizingMaskIntoConstraints = false
        portalBannerCard.backgroundColor = UIColor(red: 0.941, green: 0.969, blue: 1.0, alpha: 1.0) // #F0F7FF
        portalBannerCard.layer.borderColor = UIColor(red: 0.749, green: 0.859, blue: 0.996, alpha: 1.0).cgColor // #BFDBFE
        portalBannerCard.layer.borderWidth = 1.2
        portalBannerCard.layer.cornerRadius = 14
        portalBannerCard.layer.shadowColor = UIColor.black.cgColor
        portalBannerCard.layer.shadowOpacity = 0.04
        portalBannerCard.layer.shadowOffset = CGSize(width: 0, height: 2)
        portalBannerCard.layer.shadowRadius = 4
        view.addSubview(portalBannerCard)

        // ── Active State Container ──
        portalActiveView.translatesAutoresizingMaskIntoConstraints = false
        portalBannerCard.addSubview(portalActiveView)

        let topRow = UIStackView()
        topRow.translatesAutoresizingMaskIntoConstraints = false
        topRow.axis = .horizontal
        topRow.spacing = 10
        topRow.alignment = .center

        let globeBadge = UIView()
        globeBadge.translatesAutoresizingMaskIntoConstraints = false
        globeBadge.backgroundColor = UIColor(red: 0.859, green: 0.918, blue: 0.996, alpha: 1.0)
        globeBadge.layer.cornerRadius = 16
        globeBadge.widthAnchor.constraint(equalToConstant: 32).isActive = true
        globeBadge.heightAnchor.constraint(equalToConstant: 32).isActive = true

        let globeIcon = UIImageView(image: UIImage(systemName: "globe"))
        globeIcon.translatesAutoresizingMaskIntoConstraints = false
        globeIcon.tintColor = colorFromHex("2563EB")
        globeIcon.contentMode = .scaleAspectFit
        globeBadge.addSubview(globeIcon)
        NSLayoutConstraint.activate([
            globeIcon.centerXAnchor.constraint(equalTo: globeBadge.centerXAnchor),
            globeIcon.centerYAnchor.constraint(equalTo: globeBadge.centerYAnchor),
            globeIcon.widthAnchor.constraint(equalToConstant: 16),
            globeIcon.heightAnchor.constraint(equalToConstant: 16)
        ])
        topRow.addArrangedSubview(globeBadge)

        let titleStack = UIStackView()
        titleStack.axis = .vertical
        titleStack.spacing = 2

        let bannerTitle = UILabel()
        bannerTitle.text = "YOUR PUBLIC BOOKING URL IS LIVE"
        bannerTitle.font = .systemFont(ofSize: 10, weight: .bold)
        bannerTitle.textColor = colorFromHex("1E40AF")
        titleStack.addArrangedSubview(bannerTitle)

        portalUrlLabel.text = "app.patholab.cloud/book/..."
        portalUrlLabel.font = .systemFont(ofSize: 12.5, weight: .bold)
        portalUrlLabel.textColor = colorFromHex("2563EB")
        portalUrlLabel.lineBreakMode = .byTruncatingTail
        portalUrlLabel.numberOfLines = 1
        portalUrlLabel.isUserInteractionEnabled = true
        let tap = UITapGestureRecognizer(target: self, action: #selector(openPortalInBrowser))
        portalUrlLabel.addGestureRecognizer(tap)
        titleStack.addArrangedSubview(portalUrlLabel)

        topRow.addArrangedSubview(titleStack)

        openBrowserBtn.translatesAutoresizingMaskIntoConstraints = false
        openBrowserBtn.setImage(UIImage(systemName: "arrow.up.right.square"), for: .normal)
        openBrowserBtn.tintColor = colorFromHex("2563EB")
        openBrowserBtn.backgroundColor = .white
        openBrowserBtn.layer.cornerRadius = 8
        openBrowserBtn.layer.borderWidth = 1
        openBrowserBtn.layer.borderColor = UIColor(red: 0.8, green: 0.84, blue: 0.88, alpha: 1).cgColor
        openBrowserBtn.widthAnchor.constraint(equalToConstant: 32).isActive = true
        openBrowserBtn.heightAnchor.constraint(equalToConstant: 32).isActive = true
        openBrowserBtn.addTarget(self, action: #selector(openPortalInBrowser), for: .touchUpInside)
        topRow.addArrangedSubview(openBrowserBtn)

        portalActiveView.addSubview(topRow)

        // Bottom Action Row: Copy URL & WhatsApp Share
        let actionRow = UIStackView()
        actionRow.translatesAutoresizingMaskIntoConstraints = false
        actionRow.axis = .horizontal
        actionRow.spacing = 8
        actionRow.distribution = .fillProportionally

        copyUrlBtn.translatesAutoresizingMaskIntoConstraints = false
        copyUrlBtn.setTitle(" Copy URL", for: .normal)
        copyUrlBtn.setImage(UIImage(systemName: "doc.on.doc"), for: .normal)
        copyUrlBtn.titleLabel?.font = .systemFont(ofSize: 12, weight: .bold)
        copyUrlBtn.tintColor = UIColor(red: 0.2, green: 0.25, blue: 0.33, alpha: 1)
        copyUrlBtn.backgroundColor = .white
        copyUrlBtn.layer.cornerRadius = 8
        copyUrlBtn.layer.borderWidth = 1
        copyUrlBtn.layer.borderColor = UIColor(red: 0.8, green: 0.84, blue: 0.88, alpha: 1).cgColor
        copyUrlBtn.heightAnchor.constraint(equalToConstant: 34).isActive = true
        copyUrlBtn.addTarget(self, action: #selector(copyPortalUrlToClipboard), for: .touchUpInside)
        actionRow.addArrangedSubview(copyUrlBtn)

        shareWhatsAppBtn.translatesAutoresizingMaskIntoConstraints = false
        shareWhatsAppBtn.setTitle(" Share to WhatsApp", for: .normal)
        shareWhatsAppBtn.setImage(UIImage(systemName: "message.fill"), for: .normal)
        shareWhatsAppBtn.titleLabel?.font = .systemFont(ofSize: 12, weight: .bold)
        shareWhatsAppBtn.tintColor = .white
        shareWhatsAppBtn.backgroundColor = colorFromHex("25D366") // WhatsApp Green
        shareWhatsAppBtn.layer.cornerRadius = 8
        shareWhatsAppBtn.heightAnchor.constraint(equalToConstant: 34).isActive = true
        shareWhatsAppBtn.addTarget(self, action: #selector(sharePortalToWhatsApp), for: .touchUpInside)
        actionRow.addArrangedSubview(shareWhatsAppBtn)

        portalActiveView.addSubview(actionRow)

        NSLayoutConstraint.activate([
            portalActiveView.topAnchor.constraint(equalTo: portalBannerCard.topAnchor, constant: 12),
            portalActiveView.bottomAnchor.constraint(equalTo: portalBannerCard.bottomAnchor, constant: -12),
            portalActiveView.leadingAnchor.constraint(equalTo: portalBannerCard.leadingAnchor, constant: 14),
            portalActiveView.trailingAnchor.constraint(equalTo: portalBannerCard.trailingAnchor, constant: -14),

            topRow.topAnchor.constraint(equalTo: portalActiveView.topAnchor),
            topRow.leadingAnchor.constraint(equalTo: portalActiveView.leadingAnchor),
            topRow.trailingAnchor.constraint(equalTo: portalActiveView.trailingAnchor),

            actionRow.topAnchor.constraint(equalTo: topRow.bottomAnchor, constant: 10),
            actionRow.leadingAnchor.constraint(equalTo: portalActiveView.leadingAnchor),
            actionRow.trailingAnchor.constraint(equalTo: portalActiveView.trailingAnchor),
            actionRow.bottomAnchor.constraint(equalTo: portalActiveView.bottomAnchor)
        ])

        // ── Offline State Container ──
        portalOfflineView.translatesAutoresizingMaskIntoConstraints = false
        portalOfflineView.isHidden = true
        portalBannerCard.addSubview(portalOfflineView)

        let offStack = UIStackView()
        offStack.translatesAutoresizingMaskIntoConstraints = false
        offStack.axis = .horizontal
        offStack.spacing = 10
        offStack.alignment = .center

        let warnIcon = UIImageView(image: UIImage(systemName: "exclamationmark.triangle.fill"))
        warnIcon.tintColor = colorFromHex("D97706")
        warnIcon.widthAnchor.constraint(equalToConstant: 24).isActive = true
        warnIcon.heightAnchor.constraint(equalToConstant: 24).isActive = true
        offStack.addArrangedSubview(warnIcon)

        let offTextStack = UIStackView()
        offTextStack.axis = .vertical
        offTextStack.spacing = 2

        let offTitle = UILabel()
        offTitle.text = "PUBLIC PORTAL IS OFFLINE"
        offTitle.font = .systemFont(ofSize: 11, weight: .bold)
        offTitle.textColor = colorFromHex("92400E")
        offTextStack.addArrangedSubview(offTitle)

        let offSub = UILabel()
        offSub.text = "Enable your portal to allow patients to book online."
        offSub.font = .systemFont(ofSize: 11.5)
        offSub.textColor = colorFromHex("B45309")
        offTextStack.addArrangedSubview(offSub)

        offStack.addArrangedSubview(offTextStack)

        enablePortalBtn.translatesAutoresizingMaskIntoConstraints = false
        enablePortalBtn.setTitle("Enable", for: .normal)
        enablePortalBtn.titleLabel?.font = .systemFont(ofSize: 11.5, weight: .bold)
        enablePortalBtn.tintColor = .white
        enablePortalBtn.backgroundColor = colorFromHex("2563EB")
        enablePortalBtn.layer.cornerRadius = 6
        enablePortalBtn.contentEdgeInsets = UIEdgeInsets(top: 6, left: 12, bottom: 6, right: 12)
        enablePortalBtn.addTarget(self, action: #selector(openPortalSettingsSheet), for: .touchUpInside)
        offStack.addArrangedSubview(enablePortalBtn)

        portalOfflineView.addSubview(offStack)

        NSLayoutConstraint.activate([
            portalOfflineView.topAnchor.constraint(equalTo: portalBannerCard.topAnchor, constant: 12),
            portalOfflineView.bottomAnchor.constraint(equalTo: portalBannerCard.bottomAnchor, constant: -12),
            portalOfflineView.leadingAnchor.constraint(equalTo: portalBannerCard.leadingAnchor, constant: 14),
            portalOfflineView.trailingAnchor.constraint(equalTo: portalBannerCard.trailingAnchor, constant: -14),

            offStack.topAnchor.constraint(equalTo: portalOfflineView.topAnchor),
            offStack.bottomAnchor.constraint(equalTo: portalOfflineView.bottomAnchor),
            offStack.leadingAnchor.constraint(equalTo: portalOfflineView.leadingAnchor),
            offStack.trailingAnchor.constraint(equalTo: portalOfflineView.trailingAnchor),

            portalBannerCard.topAnchor.constraint(equalTo: heroHeaderView.bottomAnchor, constant: -28),
            portalBannerCard.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 16),
            portalBannerCard.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -16)
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

        // Exact 4 web metrics matching /workspace/bookings
        let card1 = createKpiCard(title: "NEW TODAY", subtitle: "New Bookings Today", countLbl: kpiTotalTodayLbl, colorHex: "2563EB", iconName: "calendar.badge.clock")
        let card2 = createKpiCard(title: "PENDING ACTION", subtitle: "Pending Action", countLbl: kpiPendingCountLbl, colorHex: "D97706", iconName: "clock.fill")
        let card3 = createKpiCard(title: "TOTAL REVENUE", subtitle: "Online Revenue", countLbl: kpiRevenueLbl, colorHex: "16A34A", iconName: "indianrupeesign.circle.fill")
        let card4 = createKpiCard(title: "TOTAL BOOKINGS", subtitle: "All Appointments", countLbl: kpiTotalCountLbl, colorHex: "64748B", iconName: "list.clipboard.fill")

        kpiStackView.addArrangedSubview(card1)
        kpiStackView.addArrangedSubview(card2)
        kpiStackView.addArrangedSubview(card3)
        kpiStackView.addArrangedSubview(card4)

        NSLayoutConstraint.activate([
            kpiScrollView.topAnchor.constraint(equalTo: portalBannerCard.bottomAnchor, constant: 12),
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
        icon.tintColor = colorFromHex(colorHex)
        icon.contentMode = .scaleAspectFit
        icon.widthAnchor.constraint(equalToConstant: 14).isActive = true
        icon.heightAnchor.constraint(equalToConstant: 14).isActive = true
        topRow.addArrangedSubview(icon)

        card.addSubview(topRow)

        countLbl.translatesAutoresizingMaskIntoConstraints = false
        countLbl.text = "0"
        countLbl.font = .systemFont(ofSize: 20, weight: .bold)
        countLbl.textColor = UIColor(red: 0.06, green: 0.09, blue: 0.16, alpha: 1)
        card.addSubview(countLbl)

        let sLbl = UILabel()
        sLbl.translatesAutoresizingMaskIntoConstraints = false
        sLbl.text = subtitle
        sLbl.font = .systemFont(ofSize: 10.5, weight: .regular)
        sLbl.textColor = UIColor(red: 0.58, green: 0.64, blue: 0.72, alpha: 1) // #94A3B8
        card.addSubview(sLbl)

        NSLayoutConstraint.activate([
            topRow.topAnchor.constraint(equalTo: card.topAnchor, constant: 10),
            topRow.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 12),
            topRow.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -12),

            countLbl.topAnchor.constraint(equalTo: topRow.bottomAnchor, constant: 4),
            countLbl.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 12),

            sLbl.topAnchor.constraint(equalTo: countLbl.bottomAnchor, constant: 2),
            sLbl.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 12)
        ])

        return card
    }

    private func setupSearchAndFilters() {
        // Search Container
        searchContainer.translatesAutoresizingMaskIntoConstraints = false
        searchContainer.backgroundColor = .white
        searchContainer.layer.cornerRadius = 12
        searchContainer.layer.shadowColor = UIColor.black.cgColor
        searchContainer.layer.shadowOpacity = 0.03
        searchContainer.layer.shadowOffset = CGSize(width: 0, height: 1)
        searchContainer.layer.shadowRadius = 3
        view.addSubview(searchContainer)

        let searchIcon = UIImageView(image: UIImage(systemName: "magnifyingglass"))
        searchIcon.translatesAutoresizingMaskIntoConstraints = false
        searchIcon.tintColor = UIColor(red: 0.58, green: 0.64, blue: 0.72, alpha: 1)
        searchContainer.addSubview(searchIcon)

        searchField.translatesAutoresizingMaskIntoConstraints = false
        searchField.placeholder = "Search by patient, phone, track ID, or test..."
        searchField.font = .systemFont(ofSize: 13)
        searchField.textColor = UIColor(red: 0.12, green: 0.16, blue: 0.23, alpha: 1)
        searchField.clearButtonMode = .never
        searchField.delegate = self
        searchField.addTarget(self, action: #selector(searchTextChanged), for: .editingChanged)
        searchContainer.addSubview(searchField)

        clearSearchBtn.translatesAutoresizingMaskIntoConstraints = false
        clearSearchBtn.setImage(UIImage(systemName: "xmark.circle.fill"), for: .normal)
        clearSearchBtn.tintColor = UIColor(red: 0.8, green: 0.84, blue: 0.88, alpha: 1)
        clearSearchBtn.isHidden = true
        clearSearchBtn.addTarget(self, action: #selector(clearSearch), for: .touchUpInside)
        searchContainer.addSubview(clearSearchBtn)

        // Filter Chips Scroll
        filterScrollView.translatesAutoresizingMaskIntoConstraints = false
        filterScrollView.showsHorizontalScrollIndicator = false
        view.addSubview(filterScrollView)

        filterStackView.translatesAutoresizingMaskIntoConstraints = false
        filterStackView.axis = .horizontal
        filterStackView.spacing = 8
        filterScrollView.addSubview(filterStackView)

        buildFilterChips()

        NSLayoutConstraint.activate([
            searchContainer.topAnchor.constraint(equalTo: kpiScrollView.bottomAnchor, constant: 10),
            searchContainer.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 16),
            searchContainer.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -16),
            searchContainer.heightAnchor.constraint(equalToConstant: 42),

            searchIcon.leadingAnchor.constraint(equalTo: searchContainer.leadingAnchor, constant: 12),
            searchIcon.centerYAnchor.constraint(equalTo: searchContainer.centerYAnchor),
            searchIcon.widthAnchor.constraint(equalToConstant: 16),
            searchIcon.heightAnchor.constraint(equalToConstant: 16),

            clearSearchBtn.trailingAnchor.constraint(equalTo: searchContainer.trailingAnchor, constant: -10),
            clearSearchBtn.centerYAnchor.constraint(equalTo: searchContainer.centerYAnchor),
            clearSearchBtn.widthAnchor.constraint(equalToConstant: 20),
            clearSearchBtn.heightAnchor.constraint(equalToConstant: 20),

            searchField.leadingAnchor.constraint(equalTo: searchIcon.trailingAnchor, constant: 8),
            searchField.trailingAnchor.constraint(equalTo: clearSearchBtn.leadingAnchor, constant: -4),
            searchField.centerYAnchor.constraint(equalTo: searchContainer.centerYAnchor),

            filterScrollView.topAnchor.constraint(equalTo: searchContainer.bottomAnchor, constant: 10),
            filterScrollView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            filterScrollView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            filterScrollView.heightAnchor.constraint(equalToConstant: 34),

            filterStackView.topAnchor.constraint(equalTo: filterScrollView.topAnchor),
            filterStackView.bottomAnchor.constraint(equalTo: filterScrollView.bottomAnchor),
            filterStackView.leadingAnchor.constraint(equalTo: filterScrollView.leadingAnchor, constant: 16),
            filterStackView.trailingAnchor.constraint(equalTo: filterScrollView.trailingAnchor, constant: -16),
            filterStackView.heightAnchor.constraint(equalTo: filterScrollView.heightAnchor)
        ])
    }

    private func buildFilterChips() {
        filterStackView.arrangedSubviews.forEach { $0.removeFromSuperview() }

        let filters = [
            ("ALL", "All Bookings"),
            ("PENDING", "Pending Action"),
            ("ASSIGNED", "Assigned Trips"),
            ("SAMPLE_COLLECTED", "Sample Collected"),
            ("COMPLETED", "Completed"),
            ("HOME_COLLECTION", "Home Collection"),
            ("LAB_VISIT", "Lab Visit"),
            ("CANCELLED", "Cancelled")
        ]

        for (key, title) in filters {
            let btn = UIButton(type: .system)
            btn.setTitle(title, for: .normal)
            btn.titleLabel?.font = .systemFont(ofSize: 12, weight: key == currentFilter ? .bold : .medium)
            btn.layer.cornerRadius = 17
            btn.contentEdgeInsets = UIEdgeInsets(top: 0, left: 14, bottom: 0, right: 14)

            if key == currentFilter {
                btn.backgroundColor = colorFromHex("2563EB")
                btn.setTitleColor(.white, for: .normal)
            } else {
                btn.backgroundColor = .white
                btn.setTitleColor(UIColor(red: 0.39, green: 0.45, blue: 0.55, alpha: 1), for: .normal)
                btn.layer.borderWidth = 1
                btn.layer.borderColor = UIColor(red: 0.89, green: 0.91, blue: 0.94, alpha: 1).cgColor
            }

            btn.tag = filters.firstIndex(where: { $0.0 == key }) ?? 0
            btn.addAction(UIAction(handler: { [weak self] _ in
                self?.currentFilter = key
                self?.buildFilterChips()
                self?.applyFilterAndSearch()
            }), for: .touchUpInside)

            filterStackView.addArrangedSubview(btn)
        }
    }

    private func setupTableView() {
        tableView.translatesAutoresizingMaskIntoConstraints = false
        tableView.backgroundColor = .clear
        tableView.separatorStyle = .none
        tableView.delegate = self
        tableView.dataSource = self
        tableView.register(OnlineBookingCell.self, forCellReuseIdentifier: OnlineBookingCell.identifier)
        tableView.contentInset = UIEdgeInsets(top: 8, left: 0, bottom: 90, right: 0)

        refreshControl.addTarget(self, action: #selector(handlePullRefresh), for: .valueChanged)
        tableView.refreshControl = refreshControl

        view.addSubview(tableView)

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

    private func setupFab() {
        fabNewBooking.translatesAutoresizingMaskIntoConstraints = false
        fabNewBooking.setTitle(" New Booking", for: .normal)
        fabNewBooking.setImage(UIImage(systemName: "plus"), for: .normal)
        fabNewBooking.titleLabel?.font = .systemFont(ofSize: 13.5, weight: .bold)
        fabNewBooking.tintColor = .white
        fabNewBooking.backgroundColor = colorFromHex("2563EB")
        fabNewBooking.layer.cornerRadius = 24
        fabNewBooking.contentEdgeInsets = UIEdgeInsets(top: 12, left: 18, bottom: 12, right: 20)
        fabNewBooking.layer.shadowColor = UIColor.black.cgColor
        fabNewBooking.layer.shadowOpacity = 0.25
        fabNewBooking.layer.shadowOffset = CGSize(width: 0, height: 4)
        fabNewBooking.layer.shadowRadius = 6
        fabNewBooking.addTarget(self, action: #selector(openCreateBookingSheet), for: .touchUpInside)
        view.addSubview(fabNewBooking)

        NSLayoutConstraint.activate([
            fabNewBooking.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -18),
            fabNewBooking.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -16),
            fabNewBooking.heightAnchor.constraint(equalToConstant: 48)
        ])
    }

    private func setupEmptyView() {
        emptyView.translatesAutoresizingMaskIntoConstraints = false
        emptyView.isHidden = true
        view.addSubview(emptyView)

        let iconContainer = UIView()
        iconContainer.translatesAutoresizingMaskIntoConstraints = false
        iconContainer.backgroundColor = UIColor(red: 0.859, green: 0.918, blue: 0.996, alpha: 1.0)
        iconContainer.layer.cornerRadius = 30
        emptyView.addSubview(iconContainer)

        let icon = UIImageView(image: UIImage(systemName: "calendar"))
        icon.translatesAutoresizingMaskIntoConstraints = false
        icon.tintColor = colorFromHex("2563EB")
        icon.contentMode = .scaleAspectFit
        iconContainer.addSubview(icon)

        let title = UILabel()
        title.translatesAutoresizingMaskIntoConstraints = false
        title.text = "No Online Bookings Found"
        title.font = .systemFont(ofSize: 16, weight: .bold)
        title.textColor = UIColor(red: 0.12, green: 0.16, blue: 0.23, alpha: 1)
        emptyView.addSubview(title)

        let sub = UILabel()
        sub.translatesAutoresizingMaskIntoConstraints = false
        sub.text = "Patients who book tests on your live website will automatically appear here in real-time."
        sub.font = .systemFont(ofSize: 12.5)
        sub.textColor = UIColor(red: 0.39, green: 0.45, blue: 0.55, alpha: 1)
        sub.textAlignment = .center
        sub.numberOfLines = 0
        emptyView.addSubview(sub)

        let btnRow = UIStackView()
        btnRow.translatesAutoresizingMaskIntoConstraints = false
        btnRow.axis = .horizontal
        btnRow.spacing = 8

        let shareLinkBtn = UIButton(type: .system)
        shareLinkBtn.setTitle("Share Booking Link", for: .normal)
        shareLinkBtn.titleLabel?.font = .systemFont(ofSize: 12, weight: .bold)
        shareLinkBtn.tintColor = .white
        shareLinkBtn.backgroundColor = colorFromHex("2563EB")
        shareLinkBtn.layer.cornerRadius = 8
        shareLinkBtn.contentEdgeInsets = UIEdgeInsets(top: 8, left: 14, bottom: 8, right: 14)
        shareLinkBtn.addTarget(self, action: #selector(sharePortalToWhatsApp), for: .touchUpInside)
        btnRow.addArrangedSubview(shareLinkBtn)

        let settingsLinkBtn = UIButton(type: .system)
        settingsLinkBtn.setTitle("Portal Settings", for: .normal)
        settingsLinkBtn.titleLabel?.font = .systemFont(ofSize: 12, weight: .bold)
        settingsLinkBtn.tintColor = UIColor(red: 0.2, green: 0.25, blue: 0.33, alpha: 1)
        settingsLinkBtn.backgroundColor = UIColor(red: 0.95, green: 0.96, blue: 0.98, alpha: 1)
        settingsLinkBtn.layer.cornerRadius = 8
        settingsLinkBtn.contentEdgeInsets = UIEdgeInsets(top: 8, left: 14, bottom: 8, right: 14)
        settingsLinkBtn.addTarget(self, action: #selector(openPortalSettingsSheet), for: .touchUpInside)
        btnRow.addArrangedSubview(settingsLinkBtn)

        emptyView.addSubview(btnRow)

        NSLayoutConstraint.activate([
            emptyView.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            emptyView.centerYAnchor.constraint(equalTo: tableView.centerYAnchor),
            emptyView.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 32),
            emptyView.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -32),

            iconContainer.topAnchor.constraint(equalTo: emptyView.topAnchor),
            iconContainer.centerXAnchor.constraint(equalTo: emptyView.centerXAnchor),
            iconContainer.widthAnchor.constraint(equalToConstant: 60),
            iconContainer.heightAnchor.constraint(equalToConstant: 60),

            icon.centerXAnchor.constraint(equalTo: iconContainer.centerXAnchor),
            icon.centerYAnchor.constraint(equalTo: iconContainer.centerYAnchor),
            icon.widthAnchor.constraint(equalToConstant: 28),
            icon.heightAnchor.constraint(equalToConstant: 28),

            title.topAnchor.constraint(equalTo: iconContainer.bottomAnchor, constant: 14),
            title.centerXAnchor.constraint(equalTo: emptyView.centerXAnchor),

            sub.topAnchor.constraint(equalTo: title.bottomAnchor, constant: 6),
            sub.leadingAnchor.constraint(equalTo: emptyView.leadingAnchor),
            sub.trailingAnchor.constraint(equalTo: emptyView.trailingAnchor),

            btnRow.topAnchor.constraint(equalTo: sub.bottomAnchor, constant: 16),
            btnRow.centerXAnchor.constraint(equalTo: emptyView.centerXAnchor),
            btnRow.bottomAnchor.constraint(equalTo: emptyView.bottomAnchor)
        ])
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MARK: – Actions & Selectors
    // ─────────────────────────────────────────────────────────────────────────
    @objc private func handleBack() {
        dismiss(animated: true, completion: nil)
    }

    @objc private func handleManualRefresh() {
        let rotation = CABasicAnimation(keyPath: "transform.rotation.z")
        rotation.toValue = NSNumber(value: Double.pi * 2)
        rotation.duration = 0.6
        rotation.isCumulative = true
        refreshBtn.layer.add(rotation, forKey: "rotationAnimation")

        fetchBookingsData(isManual: true)
    }

    @objc private func handlePullRefresh() {
        fetchBookingsData(isManual: true)
    }

    private func getActivePortalUrl() -> String {
        if let slug = portalSlug?.trimmingCharacters(in: .whitespacesAndNewlines), !slug.isEmpty, slug != "null" {
            return "https://app.patholab.cloud/book/\(slug)"
        }
        return portalUrl ?? "https://app.patholab.cloud/book"
    }

    @objc private func copyPortalUrlToClipboard() {
        let urlStr = getActivePortalUrl()
        UIPasteboard.general.string = urlStr
        let generator = UINotificationFeedbackGenerator()
        generator.notificationOccurred(.success)
        showToast("Booking link copied to clipboard!")
    }

    @objc private func sharePortalToWhatsApp() {
        let urlStr = getActivePortalUrl()
        let msg = "Hello! You can now book diagnostic tests, health packages, and home sample collection online directly with us:\n\(urlStr)"
        guard let encoded = msg.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) else { return }
        if let waUrl = URL(string: "https://api.whatsapp.com/send?text=\(encoded)"), UIApplication.shared.canOpenURL(waUrl) {
            UIApplication.shared.open(waUrl, options: [:], completionHandler: nil)
        } else {
            let activityVC = UIActivityViewController(activityItems: [msg], applicationActivities: nil)
            present(activityVC, animated: true, completion: nil)
        }
    }

    @objc private func openPortalInBrowser() {
        let urlStr = getActivePortalUrl()
        if let url = URL(string: urlStr) {
            UIApplication.shared.open(url, options: [:], completionHandler: nil)
        }
    }

    @objc private func searchTextChanged() {
        searchQuery = searchField.text?.trimmingCharacters(in: .whitespacesAndNewlines).lowercased() ?? ""
        clearSearchBtn.isHidden = searchQuery.isEmpty
        applyFilterAndSearch()
    }

    @objc private func clearSearch() {
        searchField.text = ""
        searchQuery = ""
        clearSearchBtn.isHidden = true
        applyFilterAndSearch()
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MARK: – Networking & Data Parsing
    // ─────────────────────────────────────────────────────────────────────────
    private func fetchBookingsData(isManual: Bool, isSilent: Bool = false) {
        if !isSilent && !refreshControl.isRefreshing {
            loadingIndicator.startAnimating()
        }

        guard let token = KeychainManager.shared.getToken(),
              let url = URL(string: "\(Self.baseUrl)/api/workspace/appointments/online?format=full") else {
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
                    if !isSilent {
                        self?.showToast("Failed to connect to server")
                    }
                    return
                }

                do {
                    if let json = try JSONSerialization.jsonObject(with: data) as? [String: Any] {
                        let appointments = json["appointments"] as? [[String: Any]] ?? []
                        let stats = json["stats"] as? [String: Any]
                        let portal = json["portal"] as? [String: Any]

                        self.allBookings = appointments
                        self.updatePortalUi(portal: portal)
                        self.updateKpiUi(stats: stats)
                        self.applyFilterAndSearch()

                        if isManual {
                            self.showToast("Bookings updated")
                        }
                    } else if let arr = try JSONSerialization.jsonObject(with: data) as? [[String: Any]] {
                        self.allBookings = arr
                        self.updateKpiUi(stats: nil)
                        self.applyFilterAndSearch()
                    }
                } catch {
                    if !isSilent {
                        self.showToast("Error reading bookings")
                    }
                }
            }
        }.resume()
    }

    private func updatePortalUi(portal: [String: Any]?) {
        if let portal = portal {
            portalSlug = portal["portalSlug"] as? String
            isPortalLive = portal["isLive"] as? Bool ?? false
            portalUrl = portal["url"] as? String
        }

        let hasValidSlug = portalSlug != nil && !(portalSlug?.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ?? true) && portalSlug != "null"
        if isPortalLive && hasValidSlug {
            portalActiveView.isHidden = false
            portalOfflineView.isHidden = true
            let slug = (portalSlug ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
            portalUrlLabel.text = "app.patholab.cloud/book/\(slug)"
        } else {
            portalActiveView.isHidden = true
            portalOfflineView.isHidden = false
        }
    }

    private func updateKpiUi(stats: [String: Any]?) {
        var total = allBookings.count
        var todayCount = 0
        var pending = 0
        var revenue: Double = 0

        let calendar = Calendar.current
        for b in allBookings {
            let s = (b["status"] as? String ?? "").uppercased()
            if s == "SCHEDULED" || s == "PENDING" || s == "PENDING_PAYMENT" {
                pending += 1
            }
            if let inv = b["invoice"] as? [String: Any], let g = inv["grandTotal"] as? NSNumber {
                revenue += g.doubleValue
            } else if let g = b["grandTotal"] as? NSNumber {
                revenue += g.doubleValue
            }
            if let dateStr = b["createdAt"] as? String {
                let formatter = ISO8601DateFormatter()
                formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
                if let d = formatter.date(from: dateStr) ?? ISO8601DateFormatter().date(from: dateStr) {
                    if calendar.isDateInToday(d) {
                        todayCount += 1
                    }
                }
            }
        }

        if let stats = stats {
            if let t = stats["totalCount"] as? Int { total = t }
            if let tod = stats["totalToday"] as? Int { todayCount = tod }
            if let p = stats["totalPending"] as? Int { pending = p }
            if let r = stats["totalRevenue"] as? NSNumber { revenue = r.doubleValue }
        }

        kpiTotalTodayLbl.text = "\(todayCount)"
        kpiPendingCountLbl.text = "\(pending)"
        kpiRevenueLbl.text = "₹\(Int(revenue))"
        kpiTotalCountLbl.text = "\(total)"
    }

    private func applyFilterAndSearch() {
        filteredBookings = allBookings.filter { item in
            let status = (item["status"] as? String ?? "").uppercased()
            let mode = (item["collectionMode"] as? String ?? "").uppercased()

            // Filter
            var matchesFilter = true
            if currentFilter == "PENDING" {
                matchesFilter = (status == "SCHEDULED" || status == "PENDING" || status == "PENDING_PAYMENT") && status != "CANCELLED"
            } else if currentFilter == "ASSIGNED" {
                matchesFilter = (status == "ASSIGNED")
            } else if currentFilter == "SAMPLE_COLLECTED" {
                matchesFilter = (status == "SAMPLE_COLLECTED")
            } else if currentFilter == "COMPLETED" {
                matchesFilter = (status == "COMPLETED")
            } else if currentFilter == "HOME_COLLECTION" {
                matchesFilter = (mode == "HOME_COLLECTION")
            } else if currentFilter == "LAB_VISIT" {
                matchesFilter = (mode == "LAB_VISIT")
            } else if currentFilter == "CANCELLED" {
                matchesFilter = (status == "CANCELLED")
            }

            if !matchesFilter { return false }

            // Search: matches web placeholder "Search by patient, phone, track ID, or test..."
            if !searchQuery.isEmpty {
                let pat = item["patient"] as? [String: Any]
                let name = (pat?["name"] as? String ?? "").lowercased()
                let phone = (pat?["phone"] as? String ?? "").lowercased()
                let uhid = (pat?["patientId"] as? String ?? "").lowercased()
                let pincode = (item["pincode"] as? String ?? "").lowercased()
                let trackId = (item["trackingId"] as? String ?? item["id"] as? String ?? "").lowercased()

                var testsStr = ""
                if let tests = item["tests"] as? [[String: Any]] {
                    for t in tests {
                        testsStr += (t["testName"] as? String ?? "").lowercased() + " "
                    }
                }

                let matchesSearch = name.contains(searchQuery)
                    || phone.contains(searchQuery)
                    || uhid.contains(searchQuery)
                    || pincode.contains(searchQuery)
                    || trackId.contains(searchQuery)
                    || testsStr.contains(searchQuery)

                if !matchesSearch { return false }
            }

            return true
        }

        tableView.reloadData()
        emptyView.isHidden = !filteredBookings.isEmpty
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MARK: – TableView Delegate & DataSource
    // ─────────────────────────────────────────────────────────────────────────
    func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        return filteredBookings.count
    }

    func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        guard let cell = tableView.dequeueReusableCell(withIdentifier: OnlineBookingCell.identifier, for: indexPath) as? OnlineBookingCell else {
            return UITableViewCell()
        }
        let booking = filteredBookings[indexPath.row]
        cell.configure(with: booking,
                       onCall: { [weak self] phone in self?.makePhoneCall(phone: phone) },
                       onWhatsApp: { [weak self] phone in self?.openWhatsApp(phone: phone) },
                       onAction: { [weak self] in self?.handleCardAction(booking: booking) })
        return cell
    }

    func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        tableView.deselectRow(at: indexPath, animated: true)
        let booking = filteredBookings[indexPath.row]
        openBookingDetailSheet(booking: booking)
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MARK: – Direct Communication & Card Actions
    // ─────────────────────────────────────────────────────────────────────────
    private func makePhoneCall(phone: String) {
        let clean = phone.components(separatedBy: CharacterSet.decimalDigits.inverted).joined()
        if let url = URL(string: "tel://\(clean)") {
            UIApplication.shared.open(url, options: [:], completionHandler: nil)
        }
    }

    private func openWhatsApp(phone: String) {
        var clean = phone.components(separatedBy: CharacterSet.decimalDigits.inverted).joined()
        if clean.count == 10 { clean = "91" + clean }
        if let url = URL(string: "https://wa.me/\(clean)") {
            UIApplication.shared.open(url, options: [:], completionHandler: nil)
        }
    }

    private func handleCardAction(booking: [String: Any]) {
        guard let id = booking["id"] as? String else { return }
        let status = (booking["status"] as? String ?? "SCHEDULED").uppercased()
        let mode = booking["collectionMode"] as? String ?? "LAB_VISIT"

        if status == "SCHEDULED" {
            if mode == "HOME_COLLECTION" {
                updateBookingStatus(id: id, status: "ASSIGNED", successMessage: "Trip assigned successfully")
            } else {
                updateBookingStatus(id: id, status: "SAMPLE_COLLECTED", successMessage: "Sample marked as collected")
            }
        } else if status == "ASSIGNED" {
            updateBookingStatus(id: id, status: "SAMPLE_COLLECTED", successMessage: "Sample marked as collected")
        } else if status == "SAMPLE_COLLECTED" {
            updateBookingStatus(id: id, status: "COMPLETED", successMessage: "Visit completed successfully")
        }
    }

    private func updateBookingStatus(id: String, status: String, successMessage: String) {
        loadingIndicator.startAnimating()

        guard let token = KeychainManager.shared.getToken(),
              let url = URL(string: "\(Self.baseUrl)/api/workspace/appointments/online") else { return }

        var request = URLRequest(url: url)
        request.httpMethod = "PATCH"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue("token=\(token)", forHTTPHeaderField: "Cookie")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let payload: [String: Any] = ["appointmentId": id, "status": status]
        request.httpBody = try? JSONSerialization.data(withJSONObject: payload)

        URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            DispatchQueue.main.async {
                self?.loadingIndicator.stopAnimating()
                if let http = response as? HTTPURLResponse, http.statusCode >= 200 && http.statusCode < 300 {
                    self?.showToast(successMessage)
                    self?.fetchBookingsData(isManual: false)
                } else {
                    self?.showToast("Action failed")
                }
            }
        }.resume()
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MARK: – Detail Modal Sheet
    // ─────────────────────────────────────────────────────────────────────────
    private func openBookingDetailSheet(booking: [String: Any]) {
        let sheetVC = BookingDetailSheetViewController(booking: booking)
        sheetVC.onStatusChange = { [weak self] id, newStatus, msg in
            self?.updateBookingStatus(id: id, status: newStatus, successMessage: msg)
        }
        sheetVC.onReschedule = { [weak self] id, isoDate, timeSlot in
            self?.rescheduleBooking(id: id, isoDate: isoDate, timeSlot: timeSlot)
        }
        if #available(iOS 15.0, *) {
            if let sheet = sheetVC.sheetPresentationController {
                sheet.detents = [.medium(), .large()]
                sheet.prefersGrabberVisible = true
            }
        }
        present(sheetVC, animated: true, completion: nil)
    }

    private func rescheduleBooking(id: String, isoDate: String, timeSlot: String? = nil) {
        loadingIndicator.startAnimating()

        guard let token = KeychainManager.shared.getToken(),
              let url = URL(string: "\(Self.baseUrl)/api/workspace/appointments/online") else { return }

        var request = URLRequest(url: url)
        request.httpMethod = "PATCH"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue("token=\(token)", forHTTPHeaderField: "Cookie")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        var payload: [String: Any] = [
            "appointmentId": id,
            "appointmentDate": isoDate,
            "status": "SCHEDULED"
        ]
        if let slot = timeSlot, !slot.isEmpty {
            payload["timeSlot"] = slot
        }
        request.httpBody = try? JSONSerialization.data(withJSONObject: payload)

        URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            DispatchQueue.main.async {
                self?.loadingIndicator.stopAnimating()
                if let http = response as? HTTPURLResponse, http.statusCode >= 200 && http.statusCode < 300 {
                    self?.showToast("Appointment rescheduled successfully")
                    self?.fetchBookingsData(isManual: false)
                } else {
                    self?.showToast("Reschedule failed")
                }
            }
        }.resume()
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MARK: – Create Booking Modal Sheet
    // ─────────────────────────────────────────────────────────────────────────
    @objc private func openCreateBookingSheet() {
        let createVC = CreateOnlineBookingSheetViewController()
        createVC.onBookingCreated = { [weak self] in
            self?.showToast("Booking created successfully!")
            self?.fetchBookingsData(isManual: false)
        }
        if #available(iOS 15.0, *) {
            if let sheet = createVC.sheetPresentationController {
                sheet.detents = [.large()]
                sheet.prefersGrabberVisible = true
            }
        }
        present(createVC, animated: true, completion: nil)
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MARK: – Portal Settings Modal Sheet
    // ─────────────────────────────────────────────────────────────────────────
    @objc private func openPortalSettingsSheet() {
        let settingsVC = PortalSettingsSheetViewController(currentSlug: portalSlug, isLive: isPortalLive)
        settingsVC.onSaved = { [weak self] in
            self?.showToast("Portal settings updated")
            self?.fetchBookingsData(isManual: false)
        }
        if #available(iOS 15.0, *) {
            if let sheet = settingsVC.sheetPresentationController {
                sheet.detents = [.medium(), .large()]
                sheet.prefersGrabberVisible = true
            }
        }
        present(settingsVC, animated: true, completion: nil)
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MARK: – Helper
    // ─────────────────────────────────────────────────────────────────────────
    private func showToast(_ message: String) {
        let alert = UIAlertController(title: nil, message: message, preferredStyle: .alert)
        present(alert, animated: true)
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
            alert.dismiss(animated: true, completion: nil)
        }
    }
}

fileprivate func colorFromHex(_ hex: String) -> UIColor {
    var cString = hex.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
    if cString.hasPrefix("#") { cString.remove(at: cString.startIndex) }
    if cString.count != 6 { return .black }
    var rgbValue: UInt64 = 0
    Scanner(string: cString).scanHexInt64(&rgbValue)
    return UIColor(
        red: CGFloat((rgbValue & 0xFF0000) >> 16) / 255.0,
        green: CGFloat((rgbValue & 0x00FF00) >> 8) / 255.0,
        blue: CGFloat(rgbValue & 0x0000FF) / 255.0,
        alpha: 1.0
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// MARK: – Custom TableView Cell for Bookings
// ─────────────────────────────────────────────────────────────────────────────
class OnlineBookingCell: UITableViewCell {
    static let identifier = "OnlineBookingCell"

    private let cardView        = UIView()
    private let uhidLbl         = UILabel()
    private let modeBadge       = UILabel()
    private let statusBadge     = UILabel()
    private let patientNameLbl  = UILabel()
    private let patientBioLbl   = UILabel()
    private let scheduleLbl     = UILabel()
    private let addressContainer = UIView()
    private let addressLbl      = UILabel()
    private let testsContainer  = UIView()
    private let testsLbl        = UILabel()
    private let grandTotalLbl   = UILabel()
    private let paymentBadge    = UILabel()
    private let callBtn         = UIButton(type: .system)
    private let whatsappBtn     = UIButton(type: .system)
    private let primaryActionBtn = UIButton(type: .system)

    private var onCallHandler: ((String) -> Void)?
    private var onWhatsAppHandler: ((String) -> Void)?
    private var onActionHandler: (() -> Void)?
    private var patientPhone: String = ""

    override init(style: UITableViewCell.CellStyle, reuseIdentifier: String?) {
        super.init(style: style, reuseIdentifier: reuseIdentifier)
        selectionStyle = .none
        backgroundColor = .clear

        setupViews()
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    private func setupViews() {
        cardView.translatesAutoresizingMaskIntoConstraints = false
        cardView.backgroundColor = .white
        cardView.layer.cornerRadius = 14
        cardView.layer.shadowColor = UIColor.black.cgColor
        cardView.layer.shadowOpacity = 0.04
        cardView.layer.shadowOffset = CGSize(width: 0, height: 2)
        cardView.layer.shadowRadius = 4
        contentView.addSubview(cardView)

        // Top Row
        uhidLbl.translatesAutoresizingMaskIntoConstraints = false
        uhidLbl.font = .systemFont(ofSize: 10, weight: .bold)
        uhidLbl.textColor = UIColor(red: 0.39, green: 0.45, blue: 0.55, alpha: 1)
        uhidLbl.backgroundColor = UIColor(red: 0.95, green: 0.96, blue: 0.98, alpha: 1)
        uhidLbl.layer.cornerRadius = 4
        uhidLbl.clipsToBounds = true
        cardView.addSubview(uhidLbl)

        modeBadge.translatesAutoresizingMaskIntoConstraints = false
        modeBadge.font = .systemFont(ofSize: 10.5, weight: .bold)
        modeBadge.layer.cornerRadius = 4
        modeBadge.clipsToBounds = true
        cardView.addSubview(modeBadge)

        statusBadge.translatesAutoresizingMaskIntoConstraints = false
        statusBadge.font = .systemFont(ofSize: 10, weight: .bold)
        statusBadge.layer.cornerRadius = 4
        statusBadge.clipsToBounds = true
        cardView.addSubview(statusBadge)

        // Patient Row
        patientNameLbl.translatesAutoresizingMaskIntoConstraints = false
        patientNameLbl.font = .systemFont(ofSize: 15, weight: .bold)
        patientNameLbl.textColor = UIColor(red: 0.06, green: 0.09, blue: 0.16, alpha: 1)
        cardView.addSubview(patientNameLbl)

        patientBioLbl.translatesAutoresizingMaskIntoConstraints = false
        patientBioLbl.font = .systemFont(ofSize: 11.5, weight: .regular)
        patientBioLbl.textColor = UIColor(red: 0.39, green: 0.45, blue: 0.55, alpha: 1)
        cardView.addSubview(patientBioLbl)

        // Schedule
        let calIcon = UIImageView(image: UIImage(systemName: "calendar"))
        calIcon.translatesAutoresizingMaskIntoConstraints = false
        calIcon.tintColor = UIColor(red: 0.15, green: 0.39, blue: 0.92, alpha: 1)
        cardView.addSubview(calIcon)

        scheduleLbl.translatesAutoresizingMaskIntoConstraints = false
        scheduleLbl.font = .systemFont(ofSize: 12, weight: .semibold)
        scheduleLbl.textColor = UIColor(red: 0.12, green: 0.16, blue: 0.23, alpha: 1)
        cardView.addSubview(scheduleLbl)

        // Address
        addressContainer.translatesAutoresizingMaskIntoConstraints = false
        cardView.addSubview(addressContainer)

        let pinIcon = UIImageView(image: UIImage(systemName: "mappin.and.ellipse"))
        pinIcon.translatesAutoresizingMaskIntoConstraints = false
        pinIcon.tintColor = UIColor(red: 0.49, green: 0.23, blue: 0.93, alpha: 1)
        addressContainer.addSubview(pinIcon)

        addressLbl.translatesAutoresizingMaskIntoConstraints = false
        addressLbl.font = .systemFont(ofSize: 11.5)
        addressLbl.textColor = UIColor(red: 0.39, green: 0.45, blue: 0.55, alpha: 1)
        addressLbl.numberOfLines = 1
        addressContainer.addSubview(addressLbl)

        // Tests
        testsContainer.translatesAutoresizingMaskIntoConstraints = false
        testsContainer.backgroundColor = UIColor(red: 0.97, green: 0.98, blue: 0.99, alpha: 1)
        testsContainer.layer.cornerRadius = 8
        cardView.addSubview(testsContainer)

        testsLbl.translatesAutoresizingMaskIntoConstraints = false
        testsLbl.font = .systemFont(ofSize: 11.5)
        testsLbl.textColor = UIColor(red: 0.2, green: 0.25, blue: 0.33, alpha: 1)
        testsLbl.numberOfLines = 2
        testsContainer.addSubview(testsLbl)

        // Bottom Row
        grandTotalLbl.translatesAutoresizingMaskIntoConstraints = false
        grandTotalLbl.font = .systemFont(ofSize: 15, weight: .bold)
        grandTotalLbl.textColor = UIColor(red: 0.06, green: 0.09, blue: 0.16, alpha: 1)
        cardView.addSubview(grandTotalLbl)

        paymentBadge.translatesAutoresizingMaskIntoConstraints = false
        paymentBadge.font = .systemFont(ofSize: 10, weight: .bold)
        paymentBadge.layer.cornerRadius = 3
        paymentBadge.clipsToBounds = true
        cardView.addSubview(paymentBadge)

        callBtn.translatesAutoresizingMaskIntoConstraints = false
        callBtn.setImage(UIImage(systemName: "phone.fill"), for: .normal)
        callBtn.tintColor = UIColor(red: 0.15, green: 0.39, blue: 0.92, alpha: 1)
        callBtn.backgroundColor = UIColor(red: 0.94, green: 0.96, blue: 1.0, alpha: 1)
        callBtn.layer.cornerRadius = 17
        callBtn.addTarget(self, action: #selector(handleCall), for: .touchUpInside)
        cardView.addSubview(callBtn)

        whatsappBtn.translatesAutoresizingMaskIntoConstraints = false
        whatsappBtn.setImage(UIImage(systemName: "message.fill"), for: .normal)
        whatsappBtn.tintColor = UIColor(red: 0.09, green: 0.64, blue: 0.29, alpha: 1)
        whatsappBtn.backgroundColor = UIColor(red: 0.93, green: 0.99, blue: 0.96, alpha: 1)
        whatsappBtn.layer.cornerRadius = 17
        whatsappBtn.addTarget(self, action: #selector(handleWhatsApp), for: .touchUpInside)
        cardView.addSubview(whatsappBtn)

        primaryActionBtn.translatesAutoresizingMaskIntoConstraints = false
        primaryActionBtn.titleLabel?.font = .systemFont(ofSize: 11.5, weight: .bold)
        primaryActionBtn.tintColor = .white
        primaryActionBtn.layer.cornerRadius = 16
        primaryActionBtn.contentEdgeInsets = UIEdgeInsets(top: 0, left: 12, bottom: 0, right: 12)
        primaryActionBtn.addTarget(self, action: #selector(handleAction), for: .touchUpInside)
        cardView.addSubview(primaryActionBtn)

        NSLayoutConstraint.activate([
            cardView.topAnchor.constraint(equalTo: contentView.topAnchor, constant: 5),
            cardView.bottomAnchor.constraint(equalTo: contentView.bottomAnchor, constant: -5),
            cardView.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 16),
            cardView.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -16),

            uhidLbl.topAnchor.constraint(equalTo: cardView.topAnchor, constant: 12),
            uhidLbl.leadingAnchor.constraint(equalTo: cardView.leadingAnchor, constant: 12),

            modeBadge.centerYAnchor.constraint(equalTo: uhidLbl.centerYAnchor),
            modeBadge.leadingAnchor.constraint(equalTo: uhidLbl.trailingAnchor, constant: 6),

            statusBadge.centerYAnchor.constraint(equalTo: uhidLbl.centerYAnchor),
            statusBadge.trailingAnchor.constraint(equalTo: cardView.trailingAnchor, constant: -12),

            patientNameLbl.topAnchor.constraint(equalTo: uhidLbl.bottomAnchor, constant: 8),
            patientNameLbl.leadingAnchor.constraint(equalTo: cardView.leadingAnchor, constant: 12),

            patientBioLbl.centerYAnchor.constraint(equalTo: patientNameLbl.centerYAnchor),
            patientBioLbl.trailingAnchor.constraint(equalTo: cardView.trailingAnchor, constant: -12),

            calIcon.topAnchor.constraint(equalTo: patientNameLbl.bottomAnchor, constant: 6),
            calIcon.leadingAnchor.constraint(equalTo: cardView.leadingAnchor, constant: 12),
            calIcon.widthAnchor.constraint(equalToConstant: 14),
            calIcon.heightAnchor.constraint(equalToConstant: 14),

            scheduleLbl.centerYAnchor.constraint(equalTo: calIcon.centerYAnchor),
            scheduleLbl.leadingAnchor.constraint(equalTo: calIcon.trailingAnchor, constant: 6),

            addressContainer.topAnchor.constraint(equalTo: calIcon.bottomAnchor, constant: 4),
            addressContainer.leadingAnchor.constraint(equalTo: cardView.leadingAnchor, constant: 12),
            addressContainer.trailingAnchor.constraint(equalTo: cardView.trailingAnchor, constant: -12),
            addressContainer.heightAnchor.constraint(equalToConstant: 18),

            pinIcon.leadingAnchor.constraint(equalTo: addressContainer.leadingAnchor),
            pinIcon.centerYAnchor.constraint(equalTo: addressContainer.centerYAnchor),
            pinIcon.widthAnchor.constraint(equalToConstant: 13),
            pinIcon.heightAnchor.constraint(equalToConstant: 13),

            addressLbl.leadingAnchor.constraint(equalTo: pinIcon.trailingAnchor, constant: 5),
            addressLbl.trailingAnchor.constraint(equalTo: addressContainer.trailingAnchor),
            addressLbl.centerYAnchor.constraint(equalTo: addressContainer.centerYAnchor),

            testsContainer.topAnchor.constraint(equalTo: addressContainer.bottomAnchor, constant: 6),
            testsContainer.leadingAnchor.constraint(equalTo: cardView.leadingAnchor, constant: 12),
            testsContainer.trailingAnchor.constraint(equalTo: cardView.trailingAnchor, constant: -12),

            testsLbl.topAnchor.constraint(equalTo: testsContainer.topAnchor, constant: 6),
            testsLbl.bottomAnchor.constraint(equalTo: testsContainer.bottomAnchor, constant: -6),
            testsLbl.leadingAnchor.constraint(equalTo: testsContainer.leadingAnchor, constant: 8),
            testsLbl.trailingAnchor.constraint(equalTo: testsContainer.trailingAnchor, constant: -8),

            grandTotalLbl.topAnchor.constraint(equalTo: testsContainer.bottomAnchor, constant: 10),
            grandTotalLbl.leadingAnchor.constraint(equalTo: cardView.leadingAnchor, constant: 12),

            paymentBadge.topAnchor.constraint(equalTo: grandTotalLbl.bottomAnchor, constant: 2),
            paymentBadge.leadingAnchor.constraint(equalTo: cardView.leadingAnchor, constant: 12),
            paymentBadge.bottomAnchor.constraint(equalTo: cardView.bottomAnchor, constant: -12),

            primaryActionBtn.trailingAnchor.constraint(equalTo: cardView.trailingAnchor, constant: -12),
            primaryActionBtn.centerYAnchor.constraint(equalTo: grandTotalLbl.centerYAnchor, constant: 4),
            primaryActionBtn.heightAnchor.constraint(equalToConstant: 34),

            whatsappBtn.trailingAnchor.constraint(equalTo: primaryActionBtn.leadingAnchor, constant: -6),
            whatsappBtn.centerYAnchor.constraint(equalTo: primaryActionBtn.centerYAnchor),
            whatsappBtn.widthAnchor.constraint(equalToConstant: 34),
            whatsappBtn.heightAnchor.constraint(equalToConstant: 34),

            callBtn.trailingAnchor.constraint(equalTo: whatsappBtn.leadingAnchor, constant: -6),
            callBtn.centerYAnchor.constraint(equalTo: primaryActionBtn.centerYAnchor),
            callBtn.widthAnchor.constraint(equalToConstant: 34),
            callBtn.heightAnchor.constraint(equalToConstant: 34)
        ])
    }

    func configure(with booking: [String: Any],
                   onCall: @escaping (String) -> Void,
                   onWhatsApp: @escaping (String) -> Void,
                   onAction: @escaping () -> Void) {
        self.onCallHandler = onCall
        self.onWhatsAppHandler = onWhatsApp
        self.onActionHandler = onAction

        let pat = booking["patient"] as? [String: Any]
        patientPhone = pat?["phone"] as? String ?? ""
        let name = pat?["name"] as? String ?? "Patient"
        let uhid = pat?["patientId"] as? String ?? "PAT-NA"
        let age = pat?["age"] as? Int ?? 0
        let gender = pat?["gender"] as? String ?? "MALE"

        uhidLbl.text = " \(uhid) "
        patientNameLbl.text = name
        patientBioLbl.text = (age > 0 ? "\(age) Yrs • " : "") + gender

        // Collection Mode
        let mode = booking["collectionMode"] as? String ?? "LAB_VISIT"
        if mode == "HOME_COLLECTION" {
            modeBadge.text = " Home Collection "
            modeBadge.textColor = UIColor(red: 0.49, green: 0.23, blue: 0.93, alpha: 1)
            modeBadge.backgroundColor = UIColor(red: 0.95, green: 0.91, blue: 1.0, alpha: 1)
            addressContainer.isHidden = false

            let addr = booking["collectionAddress"] as? String ?? ""
            let pin = booking["pincode"] as? String ?? ""
            addressLbl.text = addr + (pin.isEmpty ? "" : " • \(pin)")
        } else {
            modeBadge.text = " Lab Visit "
            modeBadge.textColor = UIColor(red: 0.28, green: 0.33, blue: 0.41, alpha: 1)
            modeBadge.backgroundColor = UIColor(red: 0.95, green: 0.96, blue: 0.98, alpha: 1)
            addressContainer.isHidden = true
        }

        // Status
        let status = (booking["status"] as? String ?? "SCHEDULED").uppercased()
        statusBadge.text = " \(status.replacingOccurrences(of: "_", with: " ")) "

        switch status {
        case "SCHEDULED":
            statusBadge.textColor = UIColor(red: 0.11, green: 0.31, blue: 0.85, alpha: 1)
            statusBadge.backgroundColor = UIColor(red: 0.94, green: 0.96, blue: 1.0, alpha: 1)
        case "ASSIGNED":
            statusBadge.textColor = UIColor(red: 0.31, green: 0.27, blue: 0.9, alpha: 1)
            statusBadge.backgroundColor = UIColor(red: 0.93, green: 0.92, blue: 1.0, alpha: 1)
        case "SAMPLE_COLLECTED":
            statusBadge.textColor = UIColor(red: 0.02, green: 0.58, blue: 0.41, alpha: 1)
            statusBadge.backgroundColor = UIColor(red: 0.93, green: 0.99, blue: 0.96, alpha: 1)
        case "COMPLETED":
            statusBadge.textColor = UIColor(red: 0.01, green: 0.52, blue: 0.78, alpha: 1)
            statusBadge.backgroundColor = UIColor(red: 0.94, green: 0.98, blue: 1.0, alpha: 1)
        case "CANCELLED":
            statusBadge.textColor = UIColor(red: 0.88, green: 0.11, blue: 0.28, alpha: 1)
            statusBadge.backgroundColor = UIColor(red: 1.0, green: 0.89, blue: 0.9, alpha: 1)
        default:
            statusBadge.textColor = UIColor(red: 0.39, green: 0.45, blue: 0.55, alpha: 1)
            statusBadge.backgroundColor = UIColor(red: 0.95, green: 0.96, blue: 0.98, alpha: 1)
        }

        // Schedule
        let dateStr = booking["appointmentDate"] as? String ?? ""
        let slot = booking["timeSlot"] as? String ?? "Anytime"
        scheduleLbl.text = "\(formatDate(dateStr)) • \(slot)"

        // Tests
        var testNames: [String] = []
        if let tests = booking["tests"] as? [[String: Any]] {
            for t in tests {
                if let tName = t["testName"] as? String {
                    testNames.append(tName)
                }
            }
        }
        testsLbl.text = testNames.isEmpty ? "No tests listed" : testNames.joined(separator: ", ")

        // Invoicing
        var grandTotal: Double = 0
        var payStatus = "PENDING"
        if let inv = booking["invoice"] as? [String: Any] {
            grandTotal = (inv["grandTotal"] as? NSNumber)?.doubleValue ?? 0
            payStatus = inv["paymentStatus"] as? String ?? "PENDING"
        }
        grandTotalLbl.text = "₹\(Int(grandTotal))"

        if payStatus == "PAID" {
            paymentBadge.text = " PAID ONLINE "
            paymentBadge.textColor = UIColor(red: 0.02, green: 0.58, blue: 0.41, alpha: 1)
            paymentBadge.backgroundColor = UIColor(red: 0.93, green: 0.99, blue: 0.96, alpha: 1)
        } else {
            paymentBadge.text = " PAYMENT PENDING "
            paymentBadge.textColor = UIColor(red: 0.85, green: 0.47, blue: 0.02, alpha: 1)
            paymentBadge.backgroundColor = UIColor(red: 1.0, green: 0.98, blue: 0.92, alpha: 1)
        }

        // Primary Action Button
        if status == "SCHEDULED" {
            primaryActionBtn.isHidden = false
            if mode == "HOME_COLLECTION" {
                primaryActionBtn.setTitle("Assign Trip", for: .normal)
                primaryActionBtn.backgroundColor = UIColor(red: 0.31, green: 0.27, blue: 0.9, alpha: 1) // Indigo
            } else {
                primaryActionBtn.setTitle("Collect Sample", for: .normal)
                primaryActionBtn.backgroundColor = UIColor(red: 0.02, green: 0.58, blue: 0.41, alpha: 1) // Emerald
            }
        } else if status == "ASSIGNED" {
            primaryActionBtn.isHidden = false
            primaryActionBtn.setTitle("Collect Sample", for: .normal)
            primaryActionBtn.backgroundColor = UIColor(red: 0.02, green: 0.58, blue: 0.41, alpha: 1) // Emerald
        } else if status == "SAMPLE_COLLECTED" {
            primaryActionBtn.isHidden = false
            primaryActionBtn.setTitle("Complete Visit", for: .normal)
            primaryActionBtn.backgroundColor = UIColor(red: 0.01, green: 0.52, blue: 0.78, alpha: 1) // Sky
        } else {
            primaryActionBtn.isHidden = true
        }
    }

    @objc private func handleCall() { onCallHandler?(patientPhone) }
    @objc private func handleWhatsApp() { onWhatsAppHandler?(patientPhone) }
    @objc private func handleAction() { onActionHandler?() }

    private func formatDate(_ iso: String) -> String {
        if iso.isEmpty { return "Date N/A" }
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let d = formatter.date(from: iso) {
            let out = DateFormatter()
            out.dateFormat = "dd MMM yyyy"
            return out.string(from: d)
        }
        return String(iso.prefix(10))
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// MARK: – Booking Detail Modal Sheet View Controller
// ─────────────────────────────────────────────────────────────────────────────
class BookingDetailSheetViewController: UIViewController {
    private let booking: [String: Any]
    var onStatusChange: ((String, String, String) -> Void)?
    var onReschedule: ((String, String, String?) -> Void)?

    init(booking: [String: Any]) {
        self.booking = booking
        super.init(nibName: nil, bundle: nil)
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .white

        setupContent()
    }

    private func setupContent() {
        let scrollView = UIScrollView()
        scrollView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(scrollView)

        let stack = UIStackView()
        stack.translatesAutoresizingMaskIntoConstraints = false
        stack.axis = .vertical
        stack.spacing = 14
        scrollView.addSubview(stack)

        NSLayoutConstraint.activate([
            scrollView.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 16),
            scrollView.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            scrollView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            scrollView.trailingAnchor.constraint(equalTo: view.trailingAnchor),

            stack.topAnchor.constraint(equalTo: scrollView.topAnchor),
            stack.bottomAnchor.constraint(equalTo: scrollView.bottomAnchor, constant: -24),
            stack.leadingAnchor.constraint(equalTo: scrollView.leadingAnchor, constant: 20),
            stack.trailingAnchor.constraint(equalTo: scrollView.trailingAnchor, constant: -20),
            stack.widthAnchor.constraint(equalTo: scrollView.widthAnchor, constant: -40)
        ])

        let pat = booking["patient"] as? [String: Any]
        let name = pat?["name"] as? String ?? "Patient"
        let uhid = pat?["patientId"] as? String ?? "PAT-NA"
        let phone = pat?["phone"] as? String ?? ""
        let email = pat?["email"] as? String ?? "No email provided"
        let age = pat?["age"] as? Int ?? 0
        let gender = pat?["gender"] as? String ?? "MALE"
        let mode = booking["collectionMode"] as? String ?? "LAB_VISIT"
        let apptId = booking["id"] as? String ?? ""

        // Header Label
        let nameLbl = UILabel()
        nameLbl.text = name
        nameLbl.font = .systemFont(ofSize: 20, weight: .bold)
        stack.addArrangedSubview(nameLbl)

        let uhidLbl = UILabel()
        uhidLbl.text = "UHID: \(uhid) • Online Portal"
        uhidLbl.font = .systemFont(ofSize: 12, weight: .medium)
        uhidLbl.textColor = .systemGray
        stack.addArrangedSubview(uhidLbl)

        // Contact Box
        let contactCard = UIView()
        contactCard.backgroundColor = UIColor(red: 0.97, green: 0.98, blue: 0.99, alpha: 1)
        contactCard.layer.cornerRadius = 10
        let cStack = UIStackView()
        cStack.translatesAutoresizingMaskIntoConstraints = false
        cStack.axis = .vertical
        cStack.spacing = 4
        contactCard.addSubview(cStack)

        let phoneLbl = UILabel()
        phoneLbl.text = "Phone: \(phone)  |  \(age > 0 ? "\(age) Yrs • " : "")\(gender)"
        phoneLbl.font = .systemFont(ofSize: 13, weight: .semibold)
        cStack.addArrangedSubview(phoneLbl)

        let emailLbl = UILabel()
        emailLbl.text = "Email: \(email)"
        emailLbl.font = .systemFont(ofSize: 12, weight: .regular)
        emailLbl.textColor = .systemGray
        cStack.addArrangedSubview(emailLbl)

        NSLayoutConstraint.activate([
            cStack.topAnchor.constraint(equalTo: contactCard.topAnchor, constant: 10),
            cStack.bottomAnchor.constraint(equalTo: contactCard.bottomAnchor, constant: -10),
            cStack.leadingAnchor.constraint(equalTo: contactCard.leadingAnchor, constant: 12),
            cStack.trailingAnchor.constraint(equalTo: contactCard.trailingAnchor, constant: -12)
        ])
        stack.addArrangedSubview(contactCard)

        // Schedule & Reschedule
        let schedCard = UIView()
        schedCard.backgroundColor = UIColor(red: 0.97, green: 0.98, blue: 0.99, alpha: 1)
        schedCard.layer.cornerRadius = 10
        let sStack = UIStackView()
        sStack.translatesAutoresizingMaskIntoConstraints = false
        sStack.axis = .vertical
        sStack.spacing = 6
        schedCard.addSubview(sStack)

        let sTitle = UILabel()
        sTitle.text = "SCHEDULE & SLOT"
        sTitle.font = .systemFont(ofSize: 10, weight: .bold)
        sTitle.textColor = .systemGray
        sStack.addArrangedSubview(sTitle)

        let sVal = UILabel()
        let dStr = booking["appointmentDate"] as? String ?? ""
        let slot = booking["timeSlot"] as? String ?? "Anytime"
        sVal.text = "\(String(dStr.prefix(10))) • \(slot)"
        sVal.font = .systemFont(ofSize: 13, weight: .bold)
        sStack.addArrangedSubview(sVal)

        let reschedBtn = UIButton(type: .system)
        reschedBtn.setTitle("Reschedule Appointment", for: .normal)
        reschedBtn.titleLabel?.font = .systemFont(ofSize: 12, weight: .bold)
        reschedBtn.tintColor = UIColor(red: 0.15, green: 0.39, blue: 0.92, alpha: 1)
        reschedBtn.addAction(UIAction(handler: { [weak self] _ in
            self?.presentRescheduleModal(apptId: apptId, currentDateStr: dStr, currentSlot: slot)
        }), for: .touchUpInside)
        sStack.addArrangedSubview(reschedBtn)

        NSLayoutConstraint.activate([
            sStack.topAnchor.constraint(equalTo: schedCard.topAnchor, constant: 10),
            sStack.bottomAnchor.constraint(equalTo: schedCard.bottomAnchor, constant: -10),
            sStack.leadingAnchor.constraint(equalTo: schedCard.leadingAnchor, constant: 12),
            sStack.trailingAnchor.constraint(equalTo: schedCard.trailingAnchor, constant: -12)
        ])
        stack.addArrangedSubview(schedCard)

        // Address (if Home Collection)
        if mode == "HOME_COLLECTION" {
            let addrCard = UIView()
            addrCard.backgroundColor = UIColor(red: 0.97, green: 0.98, blue: 0.99, alpha: 1)
            addrCard.layer.cornerRadius = 10
            let aStack = UIStackView()
            aStack.translatesAutoresizingMaskIntoConstraints = false
            aStack.axis = .vertical
            aStack.spacing = 6
            addrCard.addSubview(aStack)

            let aTitle = UILabel()
            aTitle.text = "COLLECTION ADDRESS"
            aTitle.font = .systemFont(ofSize: 10, weight: .bold)
            aTitle.textColor = .systemGray
            aStack.addArrangedSubview(aTitle)

            let aVal = UILabel()
            let addr = booking["collectionAddress"] as? String ?? ""
            let pin = booking["pincode"] as? String ?? ""
            let fullA = addr + (pin.isEmpty ? "" : " • \(pin)")
            aVal.text = fullA
            aVal.font = .systemFont(ofSize: 12.5, weight: .medium)
            aVal.numberOfLines = 0
            aStack.addArrangedSubview(aVal)

            let mapBtn = UIButton(type: .system)
            mapBtn.setTitle("Open in Apple Maps", for: .normal)
            mapBtn.titleLabel?.font = .systemFont(ofSize: 12, weight: .bold)
            mapBtn.tintColor = UIColor(red: 0.49, green: 0.23, blue: 0.93, alpha: 1)
            mapBtn.addAction(UIAction(handler: { _ in
                if let url = URL(string: "maps://?q=\(fullA.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? "")") {
                    UIApplication.shared.open(url, options: [:], completionHandler: nil)
                }
            }), for: .touchUpInside)
            aStack.addArrangedSubview(mapBtn)

            NSLayoutConstraint.activate([
                aStack.topAnchor.constraint(equalTo: addrCard.topAnchor, constant: 10),
                aStack.bottomAnchor.constraint(equalTo: addrCard.bottomAnchor, constant: -10),
                aStack.leadingAnchor.constraint(equalTo: addrCard.leadingAnchor, constant: 12),
                aStack.trailingAnchor.constraint(equalTo: addrCard.trailingAnchor, constant: -12)
            ])
            stack.addArrangedSubview(addrCard)
        }

        // Ordered Tests
        let testsCard = UIView()
        testsCard.backgroundColor = UIColor(red: 0.97, green: 0.98, blue: 0.99, alpha: 1)
        testsCard.layer.cornerRadius = 10
        let tStack = UIStackView()
        tStack.translatesAutoresizingMaskIntoConstraints = false
        tStack.axis = .vertical
        tStack.spacing = 6
        testsCard.addSubview(tStack)

        let tTitle = UILabel()
        tTitle.text = "ORDERED TESTS & INVOICING"
        tTitle.font = .systemFont(ofSize: 10, weight: .bold)
        tTitle.textColor = .systemGray
        tStack.addArrangedSubview(tTitle)

        if let tests = booking["tests"] as? [[String: Any]] {
            for (idx, t) in tests.enumerated() {
                let tLbl = UILabel()
                let tName = t["testName"] as? String ?? "Test"
                let price = (t["price"] as? NSNumber)?.doubleValue ?? 0
                tLbl.text = "\(idx + 1). \(tName) - ₹\(Int(price))"
                tLbl.font = .systemFont(ofSize: 12)
                tStack.addArrangedSubview(tLbl)
            }
        }

        var grandTotal: Double = 0
        var payStatus = "PENDING"
        if let inv = booking["invoice"] as? [String: Any] {
            grandTotal = (inv["grandTotal"] as? NSNumber)?.doubleValue ?? 0
            payStatus = inv["paymentStatus"] as? String ?? "PENDING"
        }
        let totalLbl = UILabel()
        totalLbl.text = "Grand Total: ₹\(Int(grandTotal)) (\(payStatus))"
        totalLbl.font = .systemFont(ofSize: 13, weight: .bold)
        totalLbl.textColor = UIColor(red: 0.02, green: 0.58, blue: 0.41, alpha: 1)
        tStack.addArrangedSubview(totalLbl)

        NSLayoutConstraint.activate([
            tStack.topAnchor.constraint(equalTo: testsCard.topAnchor, constant: 10),
            tStack.bottomAnchor.constraint(equalTo: testsCard.bottomAnchor, constant: -10),
            tStack.leadingAnchor.constraint(equalTo: testsCard.leadingAnchor, constant: 12),
            tStack.trailingAnchor.constraint(equalTo: testsCard.trailingAnchor, constant: -12)
        ])
        stack.addArrangedSubview(testsCard)

        // Workflow Buttons
        let wTitle = UILabel()
        wTitle.text = "WORKFLOW ACTIONS"
        wTitle.font = .systemFont(ofSize: 10, weight: .bold)
        wTitle.textColor = .systemGray
        stack.addArrangedSubview(wTitle)

        let row1 = UIStackView()
        row1.axis = .horizontal
        row1.spacing = 10
        row1.distribution = .fillEqually

        let assignBtn = UIButton(type: .system)
        assignBtn.setTitle("Assign Trip", for: .normal)
        assignBtn.titleLabel?.font = .systemFont(ofSize: 12, weight: .bold)
        assignBtn.tintColor = .white
        assignBtn.backgroundColor = UIColor(red: 0.31, green: 0.27, blue: 0.9, alpha: 1)
        assignBtn.layer.cornerRadius = 8
        assignBtn.heightAnchor.constraint(equalToConstant: 40).isActive = true
        assignBtn.addAction(UIAction(handler: { [weak self] _ in
            self?.dismiss(animated: true) {
                self?.onStatusChange?(apptId, "ASSIGNED", "Trip assigned successfully")
            }
        }), for: .touchUpInside)

        let collectBtn = UIButton(type: .system)
        collectBtn.setTitle("Collect Sample", for: .normal)
        collectBtn.titleLabel?.font = .systemFont(ofSize: 12, weight: .bold)
        collectBtn.tintColor = .white
        collectBtn.backgroundColor = UIColor(red: 0.02, green: 0.58, blue: 0.41, alpha: 1)
        collectBtn.layer.cornerRadius = 8
        collectBtn.addAction(UIAction(handler: { [weak self] _ in
            self?.dismiss(animated: true) {
                self?.onStatusChange?(apptId, "SAMPLE_COLLECTED", "Sample marked as collected")
            }
        }), for: .touchUpInside)

        row1.addArrangedSubview(assignBtn)
        row1.addArrangedSubview(collectBtn)
        stack.addArrangedSubview(row1)

        let row2 = UIStackView()
        row2.axis = .horizontal
        row2.spacing = 10
        row2.distribution = .fillEqually

        let completeBtn = UIButton(type: .system)
        completeBtn.setTitle("Complete Visit", for: .normal)
        completeBtn.titleLabel?.font = .systemFont(ofSize: 12, weight: .bold)
        completeBtn.tintColor = .white
        completeBtn.backgroundColor = UIColor(red: 0.01, green: 0.52, blue: 0.78, alpha: 1)
        completeBtn.layer.cornerRadius = 8
        completeBtn.heightAnchor.constraint(equalToConstant: 40).isActive = true
        completeBtn.addAction(UIAction(handler: { [weak self] _ in
            self?.dismiss(animated: true) {
                self?.onStatusChange?(apptId, "COMPLETED", "Visit completed")
            }
        }), for: .touchUpInside)

        let cancelBtn = UIButton(type: .system)
        cancelBtn.setTitle("Cancel Booking", for: .normal)
        cancelBtn.titleLabel?.font = .systemFont(ofSize: 12, weight: .bold)
        cancelBtn.tintColor = UIColor(red: 0.88, green: 0.11, blue: 0.28, alpha: 1)
        cancelBtn.backgroundColor = UIColor(red: 1.0, green: 0.89, blue: 0.9, alpha: 1)
        cancelBtn.layer.cornerRadius = 8
        cancelBtn.addAction(UIAction(handler: { [weak self] _ in
            let alert = UIAlertController(title: "Cancel Booking", message: "Are you sure you want to cancel this booking?", preferredStyle: .alert)
            alert.addAction(UIAlertAction(title: "Yes, Cancel", style: .destructive, handler: { _ in
                self?.dismiss(animated: true) {
                    self?.onStatusChange?(apptId, "CANCELLED", "Booking cancelled")
                }
            }))
            alert.addAction(UIAlertAction(title: "No", style: .cancel))
            self?.present(alert, animated: true)
        }), for: .touchUpInside)

        row2.addArrangedSubview(completeBtn)
        row2.addArrangedSubview(cancelBtn)
        stack.addArrangedSubview(row2)
    }

    private func presentRescheduleModal(apptId: String, currentDateStr: String, currentSlot: String) {
        let reschedVC = RescheduleSheetViewController(apptId: apptId, currentDateStr: currentDateStr, currentSlot: currentSlot)
        reschedVC.onRescheduleConfirmed = { [weak self] id, iso, slot in
            self?.dismiss(animated: true) {
                self?.onReschedule?(id, iso, slot)
            }
        }
        if #available(iOS 15.0, *) {
            if let sheet = reschedVC.sheetPresentationController {
                sheet.detents = [.medium(), .large()]
                sheet.prefersGrabberVisible = true
            }
        }
        present(reschedVC, animated: true, completion: nil)
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// MARK: – Reschedule Modal Sheet View Controller
// ─────────────────────────────────────────────────────────────────────────────
class RescheduleSheetViewController: UIViewController {
    var onRescheduleConfirmed: ((String, String, String) -> Void)?

    private let apptId: String
    private let currentDateStr: String
    private let currentSlot: String

    private let datePicker = UIDatePicker()
    private let slotSegment: UISegmentedControl
    private let slots = ["07-09 AM", "09-11 AM", "11-01 PM", "02-04 PM", "04-06 PM"]

    init(apptId: String, currentDateStr: String, currentSlot: String) {
        self.apptId = apptId
        self.currentDateStr = currentDateStr
        self.currentSlot = currentSlot
        self.slotSegment = UISegmentedControl(items: slots)
        super.init(nibName: nil, bundle: nil)
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 0.973, green: 0.980, blue: 0.988, alpha: 1) // #F8FAFC
        setupUI()
    }

    private func setupUI() {
        let scrollView = UIScrollView()
        scrollView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(scrollView)

        let stack = UIStackView()
        stack.translatesAutoresizingMaskIntoConstraints = false
        stack.axis = .vertical
        stack.spacing = 16
        scrollView.addSubview(stack)

        NSLayoutConstraint.activate([
            scrollView.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 16),
            scrollView.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            scrollView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            scrollView.trailingAnchor.constraint(equalTo: view.trailingAnchor),

            stack.topAnchor.constraint(equalTo: scrollView.topAnchor),
            stack.bottomAnchor.constraint(equalTo: scrollView.bottomAnchor, constant: -28),
            stack.leadingAnchor.constraint(equalTo: scrollView.leadingAnchor, constant: 20),
            stack.trailingAnchor.constraint(equalTo: scrollView.trailingAnchor, constant: -20),
            stack.widthAnchor.constraint(equalTo: scrollView.widthAnchor, constant: -40)
        ])

        // Title Row
        let topBar = UIStackView()
        topBar.axis = .horizontal
        topBar.distribution = .equalSpacing
        topBar.alignment = .center

        let headerStack = UIStackView()
        headerStack.axis = .vertical
        headerStack.spacing = 3

        let titleLbl = UILabel()
        titleLbl.text = "Reschedule Booking"
        titleLbl.font = .systemFont(ofSize: 18, weight: .bold)
        titleLbl.textColor = UIColor(red: 0.06, green: 0.09, blue: 0.16, alpha: 1)
        headerStack.addArrangedSubview(titleLbl)

        let subLbl = UILabel()
        subLbl.text = "Select a new date and time slot for this appointment."
        subLbl.font = .systemFont(ofSize: 12)
        subLbl.textColor = UIColor(red: 0.39, green: 0.45, blue: 0.55, alpha: 1)
        headerStack.addArrangedSubview(subLbl)

        topBar.addArrangedSubview(headerStack)

        let closeBtn = UIButton(type: .system)
        closeBtn.setImage(UIImage(systemName: "xmark.circle.fill"), for: .normal)
        closeBtn.tintColor = UIColor(red: 0.6, green: 0.64, blue: 0.72, alpha: 1)
        closeBtn.addAction(UIAction(handler: { [weak self] _ in self?.dismiss(animated: true) }), for: .touchUpInside)
        topBar.addArrangedSubview(closeBtn)

        stack.addArrangedSubview(topBar)

        // Current appointment banner
        let banner = UIView()
        banner.backgroundColor = UIColor(red: 0.94, green: 0.96, blue: 1.0, alpha: 1)
        banner.layer.cornerRadius = 10
        banner.layer.borderWidth = 1
        banner.layer.borderColor = UIColor(red: 0.85, green: 0.90, blue: 1.0, alpha: 1).cgColor

        let bStack = UIStackView()
        bStack.translatesAutoresizingMaskIntoConstraints = false
        bStack.axis = .horizontal
        bStack.spacing = 8
        bStack.alignment = .center
        banner.addSubview(bStack)

        let clockIcon = UIImageView(image: UIImage(systemName: "clock.fill"))
        clockIcon.tintColor = UIColor(red: 0.15, green: 0.39, blue: 0.92, alpha: 1)
        clockIcon.widthAnchor.constraint(equalToConstant: 16).isActive = true
        clockIcon.heightAnchor.constraint(equalToConstant: 16).isActive = true
        bStack.addArrangedSubview(clockIcon)

        let curLbl = UILabel()
        curLbl.text = "Current: \(String(currentDateStr.prefix(10))) • \(currentSlot)"
        curLbl.font = .systemFont(ofSize: 12, weight: .semibold)
        curLbl.textColor = UIColor(red: 0.11, green: 0.31, blue: 0.85, alpha: 1)
        bStack.addArrangedSubview(curLbl)

        NSLayoutConstraint.activate([
            bStack.topAnchor.constraint(equalTo: banner.topAnchor, constant: 8),
            bStack.bottomAnchor.constraint(equalTo: banner.bottomAnchor, constant: -8),
            bStack.leadingAnchor.constraint(equalTo: banner.leadingAnchor, constant: 12),
            bStack.trailingAnchor.constraint(equalTo: banner.trailingAnchor, constant: -12)
        ])
        stack.addArrangedSubview(banner)

        // Date Picker Card
        let dateCard = UIView()
        dateCard.backgroundColor = .white
        dateCard.layer.cornerRadius = 12
        dateCard.layer.borderWidth = 1
        dateCard.layer.borderColor = UIColor(red: 0.89, green: 0.91, blue: 0.94, alpha: 1).cgColor

        let dStack = UIStackView()
        dStack.translatesAutoresizingMaskIntoConstraints = false
        dStack.axis = .vertical
        dStack.spacing = 8
        dateCard.addSubview(dStack)

        let dTitle = UILabel()
        dTitle.text = "NEW APPOINTMENT DATE"
        dTitle.font = .systemFont(ofSize: 11, weight: .bold)
        dTitle.textColor = UIColor(red: 0.39, green: 0.45, blue: 0.55, alpha: 1)
        dStack.addArrangedSubview(dTitle)

        datePicker.datePickerMode = .date
        datePicker.minimumDate = Date()
        if #available(iOS 14.0, *) {
            datePicker.preferredDatePickerStyle = .inline
        }
        datePicker.tintColor = UIColor(red: 0.15, green: 0.39, blue: 0.92, alpha: 1)
        dStack.addArrangedSubview(datePicker)

        NSLayoutConstraint.activate([
            dStack.topAnchor.constraint(equalTo: dateCard.topAnchor, constant: 12),
            dStack.bottomAnchor.constraint(equalTo: dateCard.bottomAnchor, constant: -12),
            dStack.leadingAnchor.constraint(equalTo: dateCard.leadingAnchor, constant: 12),
            dStack.trailingAnchor.constraint(equalTo: dateCard.trailingAnchor, constant: -12)
        ])
        stack.addArrangedSubview(dateCard)

        // Slot Selection Card
        let slotCard = UIView()
        slotCard.backgroundColor = .white
        slotCard.layer.cornerRadius = 12
        slotCard.layer.borderWidth = 1
        slotCard.layer.borderColor = UIColor(red: 0.89, green: 0.91, blue: 0.94, alpha: 1).cgColor

        let sStack = UIStackView()
        sStack.translatesAutoresizingMaskIntoConstraints = false
        sStack.axis = .vertical
        sStack.spacing = 10
        slotCard.addSubview(sStack)

        let sTitle = UILabel()
        sTitle.text = "PREFERRED TIME SLOT"
        sTitle.font = .systemFont(ofSize: 11, weight: .bold)
        sTitle.textColor = UIColor(red: 0.39, green: 0.45, blue: 0.55, alpha: 1)
        sStack.addArrangedSubview(sTitle)

        if let idx = slots.firstIndex(where: { currentSlot.contains($0) }) {
            slotSegment.selectedSegmentIndex = idx
        } else {
            slotSegment.selectedSegmentIndex = 0
        }
        slotSegment.selectedSegmentTintColor = UIColor(red: 0.15, green: 0.39, blue: 0.92, alpha: 1)
        slotSegment.setTitleTextAttributes([.foregroundColor: UIColor.white, .font: UIFont.systemFont(ofSize: 11, weight: .bold)], for: .selected)
        slotSegment.setTitleTextAttributes([.foregroundColor: UIColor(red: 0.2, green: 0.25, blue: 0.33, alpha: 1), .font: UIFont.systemFont(ofSize: 11)], for: .normal)
        sStack.addArrangedSubview(slotSegment)

        NSLayoutConstraint.activate([
            sStack.topAnchor.constraint(equalTo: slotCard.topAnchor, constant: 12),
            sStack.bottomAnchor.constraint(equalTo: slotCard.bottomAnchor, constant: -12),
            sStack.leadingAnchor.constraint(equalTo: slotCard.leadingAnchor, constant: 12),
            sStack.trailingAnchor.constraint(equalTo: slotCard.trailingAnchor, constant: -12)
        ])
        stack.addArrangedSubview(slotCard)

        // Buttons
        let btnStack = UIStackView()
        btnStack.axis = .horizontal
        btnStack.spacing = 10
        btnStack.distribution = .fillEqually

        let cancelBtn = UIButton(type: .system)
        cancelBtn.setTitle("Cancel", for: .normal)
        cancelBtn.titleLabel?.font = .systemFont(ofSize: 13, weight: .bold)
        cancelBtn.tintColor = UIColor(red: 0.39, green: 0.45, blue: 0.55, alpha: 1)
        cancelBtn.backgroundColor = UIColor(red: 0.92, green: 0.94, blue: 0.96, alpha: 1)
        cancelBtn.layer.cornerRadius = 10
        cancelBtn.heightAnchor.constraint(equalToConstant: 44).isActive = true
        cancelBtn.addAction(UIAction(handler: { [weak self] _ in self?.dismiss(animated: true) }), for: .touchUpInside)
        btnStack.addArrangedSubview(cancelBtn)

        let confirmBtn = UIButton(type: .system)
        confirmBtn.setTitle("Confirm Reschedule", for: .normal)
        confirmBtn.titleLabel?.font = .systemFont(ofSize: 13, weight: .bold)
        confirmBtn.tintColor = .white
        confirmBtn.backgroundColor = UIColor(red: 0.15, green: 0.39, blue: 0.92, alpha: 1)
        confirmBtn.layer.cornerRadius = 10
        confirmBtn.heightAnchor.constraint(equalToConstant: 44).isActive = true
        confirmBtn.addAction(UIAction(handler: { [weak self] _ in self?.handleConfirm() }), for: .touchUpInside)
        btnStack.addArrangedSubview(confirmBtn)

        stack.addArrangedSubview(btnStack)
    }

    private func handleConfirm() {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let iso = formatter.string(from: datePicker.date)

        let selectedIndex = slotSegment.selectedSegmentIndex
        let slot = (selectedIndex >= 0 && selectedIndex < slots.count) ? slots[selectedIndex] : "07-09 AM"

        dismiss(animated: true) { [weak self] in
            guard let self = self else { return }
            self.onRescheduleConfirmed?(self.apptId, iso, slot)
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// MARK: – Create Booking Modal Sheet View Controller
// ─────────────────────────────────────────────────────────────────────────────
class CreateOnlineBookingSheetViewController: UIViewController, UITableViewDelegate, UITableViewDataSource, UITextFieldDelegate {
    var onBookingCreated: (() -> Void)?

    private let nameField     = UITextField()
    private let phoneField    = UITextField()
    private let ageField      = UITextField()
    private let emailField    = UITextField()
    private let addressField  = UITextField()
    private let pincodeField  = UITextField()
    private let notesField    = UITextField()
    private let searchTestField = UITextField()

    private let modeSegment   = UISegmentedControl(items: ["Home Collection", "Lab Visit"])
    private let genderSegment = UISegmentedControl(items: ["Male", "Female", "Other"])
    private let datePicker    = UIDatePicker()
    private let slotSegment   = UISegmentedControl(items: ["07-09 AM", "09-11 AM", "11-01 PM", "02-04 PM", "04-06 PM"])

    private let testsTableView = UITableView()
    private let totalLbl      = UILabel()
    private let confirmBtn    = UIButton(type: .system)
    private let spinner       = UIActivityIndicatorView(style: .medium)

    private var allTests: [[String: Any]] = []
    private var filteredTests: [[String: Any]] = []
    private var selectedTests: [[String: Any]] = []

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .white

        setupForm()
        fetchTestCatalog()
    }

    private func setupForm() {
        let scrollView = UIScrollView()
        scrollView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(scrollView)

        let stack = UIStackView()
        stack.translatesAutoresizingMaskIntoConstraints = false
        stack.axis = .vertical
        stack.spacing = 10
        scrollView.addSubview(stack)

        NSLayoutConstraint.activate([
            scrollView.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 16),
            scrollView.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            scrollView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            scrollView.trailingAnchor.constraint(equalTo: view.trailingAnchor),

            stack.topAnchor.constraint(equalTo: scrollView.topAnchor),
            stack.bottomAnchor.constraint(equalTo: scrollView.bottomAnchor, constant: -30),
            stack.leadingAnchor.constraint(equalTo: scrollView.leadingAnchor, constant: 20),
            stack.trailingAnchor.constraint(equalTo: scrollView.trailingAnchor, constant: -20),
            stack.widthAnchor.constraint(equalTo: scrollView.widthAnchor, constant: -40)
        ])

        let titleLbl = UILabel()
        titleLbl.text = "New Online Booking"
        titleLbl.font = .systemFont(ofSize: 20, weight: .bold)
        stack.addArrangedSubview(titleLbl)

        let subLbl = UILabel()
        subLbl.text = "Create patient visit & sync with public portal"
        subLbl.font = .systemFont(ofSize: 12)
        subLbl.textColor = .systemGray
        stack.addArrangedSubview(subLbl)

        // Inputs
        styleInput(nameField, placeholder: "Patient Full Name *")
        stack.addArrangedSubview(nameField)

        let row1 = UIStackView(arrangedSubviews: [phoneField, ageField])
        row1.axis = .horizontal
        row1.spacing = 8
        row1.distribution = .fillProportionally
        styleInput(phoneField, placeholder: "Phone (10 digits) *")
        phoneField.keyboardType = .phonePad
        styleInput(ageField, placeholder: "Age")
        ageField.keyboardType = .numberPad
        ageField.widthAnchor.constraint(equalToConstant: 70).isActive = true
        stack.addArrangedSubview(row1)

        styleInput(emailField, placeholder: "Email Address (Optional)")
        emailField.keyboardType = .emailAddress
        stack.addArrangedSubview(emailField)

        genderSegment.selectedSegmentIndex = 0
        stack.addArrangedSubview(genderSegment)

        modeSegment.selectedSegmentIndex = 0
        modeSegment.addTarget(self, action: #selector(handleModeChange), for: .valueChanged)
        stack.addArrangedSubview(modeSegment)

        styleInput(addressField, placeholder: "Street Address, Flat / House No *")
        styleInput(pincodeField, placeholder: "Pincode (6 digits)")
        pincodeField.keyboardType = .numberPad
        stack.addArrangedSubview(addressField)
        stack.addArrangedSubview(pincodeField)

        // Schedule
        let schedTitle = UILabel()
        schedTitle.text = "PREFERRED DATE & TIME SLOT"
        schedTitle.font = .systemFont(ofSize: 10, weight: .bold)
        schedTitle.textColor = .systemGray
        stack.addArrangedSubview(schedTitle)

        datePicker.datePickerMode = .date
        if #available(iOS 13.4, *) {
            datePicker.preferredDatePickerStyle = .compact
        }
        stack.addArrangedSubview(datePicker)

        slotSegment.selectedSegmentIndex = 0
        stack.addArrangedSubview(slotSegment)

        // Test Catalog Cart
        let tTitle = UILabel()
        tTitle.text = "SELECT TESTS & PACKAGES"
        tTitle.font = .systemFont(ofSize: 10, weight: .bold)
        tTitle.textColor = .systemGray
        stack.addArrangedSubview(tTitle)

        styleInput(searchTestField, placeholder: "Search tests to add...")
        searchTestField.addTarget(self, action: #selector(testSearchChanged), for: .editingChanged)
        stack.addArrangedSubview(searchTestField)

        testsTableView.translatesAutoresizingMaskIntoConstraints = false
        testsTableView.heightAnchor.constraint(equalToConstant: 160).isActive = true
        testsTableView.delegate = self
        testsTableView.dataSource = self
        testsTableView.layer.cornerRadius = 8
        testsTableView.layer.borderWidth = 1
        testsTableView.layer.borderColor = UIColor(red: 0.9, green: 0.92, blue: 0.95, alpha: 1).cgColor
        stack.addArrangedSubview(testsTableView)

        styleInput(notesField, placeholder: "Clinical Remarks / Fasting Instructions")
        stack.addArrangedSubview(notesField)

        // Total & Confirm Button
        totalLbl.text = "Total Amount: ₹0"
        totalLbl.font = .systemFont(ofSize: 16, weight: .bold)
        totalLbl.textColor = UIColor(red: 0.02, green: 0.58, blue: 0.41, alpha: 1)
        stack.addArrangedSubview(totalLbl)

        confirmBtn.setTitle("Confirm & Create Booking", for: .normal)
        confirmBtn.titleLabel?.font = .systemFont(ofSize: 14, weight: .bold)
        confirmBtn.tintColor = .white
        confirmBtn.backgroundColor = UIColor(red: 0.15, green: 0.39, blue: 0.92, alpha: 1)
        confirmBtn.layer.cornerRadius = 10
        confirmBtn.heightAnchor.constraint(equalToConstant: 44).isActive = true
        confirmBtn.addTarget(self, action: #selector(submitBooking), for: .touchUpInside)
        stack.addArrangedSubview(confirmBtn)

        spinner.translatesAutoresizingMaskIntoConstraints = false
        spinner.hidesWhenStopped = true
        stack.addArrangedSubview(spinner)
    }

    private func styleInput(_ tf: UITextField, placeholder: String) {
        tf.translatesAutoresizingMaskIntoConstraints = false
        tf.placeholder = placeholder
        tf.font = .systemFont(ofSize: 13)
        tf.backgroundColor = UIColor(red: 0.96, green: 0.97, blue: 0.99, alpha: 1)
        tf.layer.cornerRadius = 8
        tf.layer.borderWidth = 1
        tf.layer.borderColor = UIColor(red: 0.9, green: 0.92, blue: 0.95, alpha: 1).cgColor
        let pad = UIView(frame: CGRect(x: 0, y: 0, width: 10, height: 40))
        tf.leftView = pad
        tf.leftViewMode = .always
        tf.heightAnchor.constraint(equalToConstant: 40).isActive = true
    }

    @objc private func handleModeChange() {
        let isHome = modeSegment.selectedSegmentIndex == 0
        addressField.isHidden = !isHome
        pincodeField.isHidden = !isHome
    }

    @objc private func testSearchChanged() {
        let q = searchTestField.text?.trimmingCharacters(in: .whitespacesAndNewlines).lowercased() ?? ""
        if q.isEmpty {
            filteredTests = allTests
        } else {
            filteredTests = allTests.filter {
                let name = ($0["name"] as? String ?? "").lowercased()
                let code = ($0["code"] as? String ?? "").lowercased()
                return name.contains(q) || code.contains(q)
            }
        }
        testsTableView.reloadData()
    }

    private func fetchTestCatalog() {
        guard let token = KeychainManager.shared.getToken() else { return }

        let primaryUrlStr = "\(OnlineBookingViewController.baseUrl)/api/workspace/test-catalog"
        guard let primaryUrl = URL(string: primaryUrlStr) else { return }

        var req = URLRequest(url: primaryUrl)
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        req.setValue("token=\(token)", forHTTPHeaderField: "Cookie")
        req.setValue("application/json", forHTTPHeaderField: "Accept")

        URLSession.shared.dataTask(with: req) { [weak self] data, response, error in
            if let data = data, error == nil {
                if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                   let tests = json["tests"] as? [[String: Any]], !tests.isEmpty {
                    DispatchQueue.main.async {
                        self?.allTests = tests
                        self?.filteredTests = tests
                        self?.testsTableView.reloadData()
                    }
                    return
                } else if let arr = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]], !arr.isEmpty {
                    DispatchQueue.main.async {
                        self?.allTests = arr
                        self?.filteredTests = arr
                        self?.testsTableView.reloadData()
                    }
                    return
                }
            }

            // Fallback to /api/workspace/catalog if test-catalog was empty or errored
            let fallbackUrlStr = "\(OnlineBookingViewController.baseUrl)/api/workspace/catalog"
            guard let fallbackUrl = URL(string: fallbackUrlStr) else { return }
            var fallbackReq = URLRequest(url: fallbackUrl)
            fallbackReq.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            fallbackReq.setValue("token=\(token)", forHTTPHeaderField: "Cookie")
            fallbackReq.setValue("application/json", forHTTPHeaderField: "Accept")

            URLSession.shared.dataTask(with: fallbackReq) { [weak self] fData, fResp, fErr in
                DispatchQueue.main.async {
                    guard let fData = fData, fErr == nil else { return }
                    if let json = try? JSONSerialization.jsonObject(with: fData) as? [String: Any],
                       let tests = json["tests"] as? [[String: Any]] {
                        self?.allTests = tests
                        self?.filteredTests = tests
                        self?.testsTableView.reloadData()
                    } else if let arr = try? JSONSerialization.jsonObject(with: fData) as? [[String: Any]] {
                        self?.allTests = arr
                        self?.filteredTests = arr
                        self?.testsTableView.reloadData()
                    }
                }
            }.resume()
        }.resume()
    }

    func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        return filteredTests.count
    }

    func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let cell = UITableViewCell(style: .subtitle, reuseIdentifier: "testCell")
        let t = filteredTests[indexPath.row]
        let name = t["name"] as? String ?? t["testName"] as? String ?? "Test"
        let code = t["code"] as? String ?? t["testCode"] as? String ?? ""
        let price = (t["price"] as? NSNumber)?.doubleValue ?? 0
        let id = t["id"] as? String ?? ""

        cell.textLabel?.text = name
        cell.textLabel?.font = .systemFont(ofSize: 12.5, weight: .semibold)
        cell.detailTextLabel?.text = "\(code.isEmpty ? "" : "CODE: \(code) • ")₹\(Int(price))"
        cell.detailTextLabel?.textColor = .systemGray

        let isSel = selectedTests.contains(where: { ($0["id"] as? String) == id })
        cell.accessoryType = isSel ? .checkmark : .none
        return cell
    }

    func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        tableView.deselectRow(at: indexPath, animated: true)
        let t = filteredTests[indexPath.row]
        let id = t["id"] as? String ?? ""

        if let idx = selectedTests.firstIndex(where: { ($0["id"] as? String) == id }) {
            selectedTests.remove(at: idx)
        } else {
            selectedTests.append(t)
        }
        testsTableView.reloadData()

        var sum: Double = 0
        for item in selectedTests {
            sum += (item["price"] as? NSNumber)?.doubleValue ?? 0
        }
        totalLbl.text = "Total Amount: ₹\(Int(sum)) (\(selectedTests.count) tests)"
    }

    @objc private func submitBooking() {
        let name = nameField.text?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        let phone = phoneField.text?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        let isHome = modeSegment.selectedSegmentIndex == 0
        let address = addressField.text?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""

        if name.isEmpty {
            nameField.becomeFirstResponder()
            return
        }
        if phone.count < 10 {
            phoneField.becomeFirstResponder()
            return
        }
        if isHome && address.isEmpty {
            addressField.becomeFirstResponder()
            return
        }
        if selectedTests.isEmpty {
            let alert = UIAlertController(title: "Select Tests", message: "Please select at least one test from the catalog.", preferredStyle: .alert)
            alert.addAction(UIAlertAction(title: "OK", style: .default))
            present(alert, animated: true)
            return
        }

        confirmBtn.isEnabled = false
        spinner.startAnimating()

        guard let token = KeychainManager.shared.getToken(),
              let url = URL(string: "\(OnlineBookingViewController.baseUrl)/api/workspace/appointments/online") else { return }

        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        req.setValue("token=\(token)", forHTTPHeaderField: "Cookie")
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let dateIso = formatter.string(from: datePicker.date)

        let slots = ["07:00 AM - 09:00 AM", "09:00 AM - 11:00 AM", "11:00 AM - 01:00 PM", "02:00 PM - 04:00 PM", "04:00 PM - 06:00 PM"]
        let slotTitle = slots[slotSegment.selectedSegmentIndex]
        let genders = ["MALE", "FEMALE", "OTHER"]
        let gender = genders[genderSegment.selectedSegmentIndex]

        let testIds = selectedTests.compactMap { $0["id"] as? String }

        let payload: [String: Any] = [
            "name": name,
            "phone": phone,
            "email": emailField.text ?? "",
            "age": Int(ageField.text ?? "") ?? 0,
            "gender": gender,
            "collectionType": isHome ? "HOME_COLLECTION" : "LAB_VISIT",
            "address": address,
            "pincode": pincodeField.text ?? "",
            "scheduledDate": dateIso,
            "timeSlot": slotTitle,
            "notes": notesField.text ?? "",
            "testIds": testIds
        ]
        req.httpBody = try? JSONSerialization.data(withJSONObject: payload)

        URLSession.shared.dataTask(with: req) { [weak self] data, response, error in
            DispatchQueue.main.async {
                self?.confirmBtn.isEnabled = true
                self?.spinner.stopAnimating()

                if let http = response as? HTTPURLResponse, http.statusCode >= 200 && http.statusCode < 300 {
                    self?.dismiss(animated: true) {
                        self?.onBookingCreated?()
                    }
                } else {
                    let alert = UIAlertController(title: "Creation Failed", message: "Could not create online booking.", preferredStyle: .alert)
                    alert.addAction(UIAlertAction(title: "OK", style: .default))
                    self?.present(alert, animated: true)
                }
            }
        }.resume()
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// MARK: – Public Portal Settings Modal Sheet View Controller
// ─────────────────────────────────────────────────────────────────────────────
class PortalSettingsSheetViewController: UIViewController {
    var onSaved: (() -> Void)?

    private let slugField = UITextField()
    private let statusSwitch = UISwitch()
    private let switchLbl = UILabel()
    private let containerUrl = UIView()
    private let saveBtn = UIButton(type: .system)
    private let copyBtn = UIButton(type: .system)
    private let shareWhatsAppBtn = UIButton(type: .system)
    private let spinner = UIActivityIndicatorView(style: .medium)

    private var currentSlug: String?
    private var isLive: Bool

    init(currentSlug: String?, isLive: Bool) {
        self.currentSlug = currentSlug
        self.isLive = isLive
        super.init(nibName: nil, bundle: nil)
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = colorFromHex("F8FAFC")

        setupViews()
    }

    private func setupViews() {
        let scrollView = UIScrollView()
        scrollView.translatesAutoresizingMaskIntoConstraints = false
        scrollView.showsVerticalScrollIndicator = true
        view.addSubview(scrollView)

        let stack = UIStackView()
        stack.translatesAutoresizingMaskIntoConstraints = false
        stack.axis = .vertical
        stack.spacing = 16
        scrollView.addSubview(stack)

        NSLayoutConstraint.activate([
            scrollView.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 16),
            scrollView.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            scrollView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            scrollView.trailingAnchor.constraint(equalTo: view.trailingAnchor),

            stack.topAnchor.constraint(equalTo: scrollView.topAnchor),
            stack.bottomAnchor.constraint(equalTo: scrollView.bottomAnchor, constant: -32),
            stack.leadingAnchor.constraint(equalTo: scrollView.leadingAnchor, constant: 16),
            stack.trailingAnchor.constraint(equalTo: scrollView.trailingAnchor, constant: -16),
            stack.widthAnchor.constraint(equalTo: scrollView.widthAnchor, constant: -32)
        ])

        // ── Top Title & Subtitle (Parity with Web screenshot 1 & 4) ──
        let headerBox = UIStackView()
        headerBox.axis = .vertical
        headerBox.spacing = 4

        let titleRow = UIStackView()
        titleRow.axis = .horizontal
        titleRow.alignment = .center
        titleRow.spacing = 8

        let globeIcon = UIImageView(image: UIImage(systemName: "globe"))
        globeIcon.tintColor = colorFromHex("2563EB")
        globeIcon.widthAnchor.constraint(equalToConstant: 22).isActive = true
        globeIcon.heightAnchor.constraint(equalToConstant: 22).isActive = true
        titleRow.addArrangedSubview(globeIcon)

        let title = UILabel()
        title.text = "Public Portal Settings"
        title.font = .systemFont(ofSize: 19, weight: .bold)
        title.textColor = colorFromHex("0F172A")
        titleRow.addArrangedSubview(title)

        headerBox.addArrangedSubview(titleRow)

        let sub = UILabel()
        sub.text = "Configure how your B2B2C booking website appears to the public."
        sub.font = .systemFont(ofSize: 12.5)
        sub.textColor = colorFromHex("64748B")
        headerBox.addArrangedSubview(sub)

        stack.addArrangedSubview(headerBox)

        // ── Main Card: Public Booking Portal ──
        let portalCard = UIView()
        portalCard.backgroundColor = .white
        portalCard.layer.cornerRadius = 12
        portalCard.layer.borderWidth = 1
        portalCard.layer.borderColor = colorFromHex("E2E8F0").cgColor
        portalCard.layer.shadowColor = UIColor.black.cgColor
        portalCard.layer.shadowOpacity = 0.04
        portalCard.layer.shadowOffset = CGSize(width: 0, height: 2)
        portalCard.layer.shadowRadius = 4

        let cardStack = UIStackView()
        cardStack.translatesAutoresizingMaskIntoConstraints = false
        cardStack.axis = .vertical
        cardStack.spacing = 14
        portalCard.addSubview(cardStack)

        NSLayoutConstraint.activate([
            cardStack.topAnchor.constraint(equalTo: portalCard.topAnchor, constant: 16),
            cardStack.bottomAnchor.constraint(equalTo: portalCard.bottomAnchor, constant: -16),
            cardStack.leadingAnchor.constraint(equalTo: portalCard.leadingAnchor, constant: 16),
            cardStack.trailingAnchor.constraint(equalTo: portalCard.trailingAnchor, constant: -16)
        ])

        let cardHeader = UILabel()
        cardHeader.text = "Public Booking Portal"
        cardHeader.font = .systemFont(ofSize: 15, weight: .bold)
        cardHeader.textColor = colorFromHex("0F172A")
        cardStack.addArrangedSubview(cardHeader)

        let cardDesc = UILabel()
        cardDesc.text = "Allow patients to book tests directly online. Claim your unique lab URL below."
        cardDesc.font = .systemFont(ofSize: 12)
        cardDesc.textColor = colorFromHex("64748B")
        cardDesc.numberOfLines = 0
        cardStack.addArrangedSubview(cardDesc)

        // Switch row
        let switchRow = UIStackView()
        switchRow.axis = .horizontal
        switchRow.alignment = .center
        switchRow.spacing = 12

        statusSwitch.isOn = isLive
        statusSwitch.addTarget(self, action: #selector(handleSwitchChange), for: .valueChanged)
        switchRow.addArrangedSubview(statusSwitch)

        switchLbl.text = isLive ? "Portal is Enabled" : "Portal is Disabled"
        switchLbl.font = .systemFont(ofSize: 13.5, weight: .semibold)
        switchLbl.textColor = colorFromHex("1E293B")
        switchRow.addArrangedSubview(switchLbl)

        cardStack.addArrangedSubview(switchRow)

        // URL Config Container
        containerUrl.translatesAutoresizingMaskIntoConstraints = false
        containerUrl.isHidden = !isLive
        let uStack = UIStackView()
        uStack.translatesAutoresizingMaskIntoConstraints = false
        uStack.axis = .vertical
        uStack.spacing = 6
        containerUrl.addSubview(uStack)

        let uLbl = UILabel()
        uLbl.text = "Your Public URL"
        uLbl.font = .systemFont(ofSize: 11.5, weight: .bold)
        uLbl.textColor = colorFromHex("475569")
        uStack.addArrangedSubview(uLbl)

        // Combined domain prefix + slug input box
        let urlBox = UIStackView()
        urlBox.axis = .horizontal
        urlBox.spacing = 0
        urlBox.layer.cornerRadius = 8
        urlBox.layer.borderWidth = 1
        urlBox.layer.borderColor = colorFromHex("CBD5E1").cgColor
        urlBox.clipsToBounds = true

        let prefixLabel = UILabel()
        prefixLabel.text = "  app.patholab.cloud/book/  "
        prefixLabel.font = .systemFont(ofSize: 12, weight: .semibold)
        prefixLabel.textColor = colorFromHex("475569")
        prefixLabel.backgroundColor = colorFromHex("F1F5F9")
        urlBox.addArrangedSubview(prefixLabel)

        slugField.translatesAutoresizingMaskIntoConstraints = false
        slugField.text = currentSlug ?? ""
        slugField.placeholder = "e.g., my-city-lab"
        slugField.font = .systemFont(ofSize: 13, weight: .bold)
        slugField.textColor = colorFromHex("0F172A")
        slugField.autocapitalizationType = .none
        slugField.autocorrectionType = .no
        slugField.backgroundColor = .white
        let pad = UIView(frame: CGRect(x: 0, y: 0, width: 8, height: 40))
        slugField.leftView = pad
        slugField.leftViewMode = .always
        slugField.heightAnchor.constraint(equalToConstant: 40).isActive = true
        urlBox.addArrangedSubview(slugField)

        uStack.addArrangedSubview(urlBox)

        let hintLbl = UILabel()
        hintLbl.text = "Use only letters, numbers, and hyphens."
        hintLbl.font = .systemFont(ofSize: 10.5)
        hintLbl.textColor = colorFromHex("94A3B8")
        uStack.addArrangedSubview(hintLbl)

        NSLayoutConstraint.activate([
            uStack.topAnchor.constraint(equalTo: containerUrl.topAnchor),
            uStack.bottomAnchor.constraint(equalTo: containerUrl.bottomAnchor),
            uStack.leadingAnchor.constraint(equalTo: containerUrl.leadingAnchor),
            uStack.trailingAnchor.constraint(equalTo: containerUrl.trailingAnchor)
        ])
        cardStack.addArrangedSubview(containerUrl)

        // Save Changes Button
        saveBtn.setTitle("Save Changes", for: .normal)
        saveBtn.titleLabel?.font = .systemFont(ofSize: 13.5, weight: .bold)
        saveBtn.tintColor = .white
        saveBtn.backgroundColor = colorFromHex("2563EB")
        saveBtn.layer.cornerRadius = 8
        saveBtn.heightAnchor.constraint(equalToConstant: 42).isActive = true
        saveBtn.addTarget(self, action: #selector(saveSettings), for: .touchUpInside)
        cardStack.addArrangedSubview(saveBtn)

        // Share / Copy row
        let shareRow = UIStackView()
        shareRow.axis = .horizontal
        shareRow.spacing = 8
        shareRow.distribution = .fillEqually

        copyBtn.setTitle(" Copy URL", for: .normal)
        copyBtn.setImage(UIImage(systemName: "doc.on.doc"), for: .normal)
        copyBtn.titleLabel?.font = .systemFont(ofSize: 12, weight: .bold)
        copyBtn.backgroundColor = .white
        copyBtn.tintColor = colorFromHex("334155")
        copyBtn.layer.cornerRadius = 8
        copyBtn.layer.borderWidth = 1
        copyBtn.layer.borderColor = colorFromHex("CBD5E1").cgColor
        copyBtn.heightAnchor.constraint(equalToConstant: 36).isActive = true
        copyBtn.addTarget(self, action: #selector(copyPortalUrl), for: .touchUpInside)
        shareRow.addArrangedSubview(copyBtn)

        shareWhatsAppBtn.setTitle(" WhatsApp", for: .normal)
        shareWhatsAppBtn.setImage(UIImage(systemName: "message.fill"), for: .normal)
        shareWhatsAppBtn.titleLabel?.font = .systemFont(ofSize: 12, weight: .bold)
        shareWhatsAppBtn.backgroundColor = colorFromHex("25D366")
        shareWhatsAppBtn.tintColor = .white
        shareWhatsAppBtn.layer.cornerRadius = 8
        shareWhatsAppBtn.heightAnchor.constraint(equalToConstant: 36).isActive = true
        shareWhatsAppBtn.addTarget(self, action: #selector(shareToWhatsApp), for: .touchUpInside)
        shareRow.addArrangedSubview(shareWhatsAppBtn)

        cardStack.addArrangedSubview(shareRow)

        stack.addArrangedSubview(portalCard)

        // ── Info Card 1: Secure Routing (Matches Web Screenshot 1, 2, 4) ──
        let secureCard = UIView()
        secureCard.backgroundColor = colorFromHex("EFF6FF")
        secureCard.layer.cornerRadius = 10
        secureCard.layer.borderWidth = 1
        secureCard.layer.borderColor = colorFromHex("BFDBFE").cgColor

        let secureStack = UIStackView()
        secureStack.translatesAutoresizingMaskIntoConstraints = false
        secureStack.axis = .vertical
        secureStack.spacing = 6
        secureCard.addSubview(secureStack)

        let secTitleRow = UIStackView()
        secTitleRow.axis = .horizontal
        secTitleRow.spacing = 6
        secTitleRow.alignment = .center

        let secShield = UIImageView(image: UIImage(systemName: "shield.fill"))
        secShield.tintColor = colorFromHex("2563EB")
        secShield.widthAnchor.constraint(equalToConstant: 16).isActive = true
        secShield.heightAnchor.constraint(equalToConstant: 16).isActive = true
        secTitleRow.addArrangedSubview(secShield)

        let secTitle = UILabel()
        secTitle.text = "Secure Routing"
        secTitle.font = .systemFont(ofSize: 13, weight: .bold)
        secTitle.textColor = colorFromHex("1E40AF")
        secTitleRow.addArrangedSubview(secTitle)
        secureStack.addArrangedSubview(secTitleRow)

        let secBody = UILabel()
        secBody.text = "When patients book Home Collection, the system automatically checks your Service Areas to route the appointment to the correct branch."
        secBody.font = .systemFont(ofSize: 11.5)
        secBody.textColor = colorFromHex("1E3A8A")
        secBody.numberOfLines = 0
        secureStack.addArrangedSubview(secBody)

        NSLayoutConstraint.activate([
            secureStack.topAnchor.constraint(equalTo: secureCard.topAnchor, constant: 12),
            secureStack.bottomAnchor.constraint(equalTo: secureCard.bottomAnchor, constant: -12),
            secureStack.leadingAnchor.constraint(equalTo: secureCard.leadingAnchor, constant: 12),
            secureStack.trailingAnchor.constraint(equalTo: secureCard.trailingAnchor, constant: -12)
        ])
        stack.addArrangedSubview(secureCard)

        // ── Info Card 2: Test Visibility (Matches Web Screenshot 1, 2, 4) ──
        let visCard = UIView()
        visCard.backgroundColor = .white
        visCard.layer.cornerRadius = 10
        visCard.layer.borderWidth = 1
        visCard.layer.borderColor = colorFromHex("E2E8F0").cgColor

        let visStack = UIStackView()
        visStack.translatesAutoresizingMaskIntoConstraints = false
        visStack.axis = .vertical
        visStack.spacing = 6
        visCard.addSubview(visStack)

        let visTitle = UILabel()
        visTitle.text = "Test Visibility"
        visTitle.font = .systemFont(ofSize: 13, weight: .bold)
        visTitle.textColor = colorFromHex("0F172A")
        visStack.addArrangedSubview(visTitle)

        let visBody = UILabel()
        visBody.text = "Not all tests are shown on your public portal. You can hide specific B2B tests from your Test Catalog settings."
        visBody.font = .systemFont(ofSize: 11.5)
        visBody.textColor = colorFromHex("64748B")
        visBody.numberOfLines = 0
        visStack.addArrangedSubview(visBody)

        let visLink = UIButton(type: .system)
        visLink.setTitle("Manage Test Visibility →", for: .normal)
        visLink.titleLabel?.font = .systemFont(ofSize: 12, weight: .bold)
        visLink.tintColor = colorFromHex("2563EB")
        visLink.contentHorizontalAlignment = .leading
        visLink.addAction(UIAction(handler: { [weak self] _ in
            let alert = UIAlertController(title: "Test Visibility", message: "Test catalog visibility can be configured in web Test Catalog settings.", preferredStyle: .alert)
            alert.addAction(UIAlertAction(title: "OK", style: .default))
            self?.present(alert, animated: true)
        }), for: .touchUpInside)
        visStack.addArrangedSubview(visLink)

        NSLayoutConstraint.activate([
            visStack.topAnchor.constraint(equalTo: visCard.topAnchor, constant: 12),
            visStack.bottomAnchor.constraint(equalTo: visCard.bottomAnchor, constant: -12),
            visStack.leadingAnchor.constraint(equalTo: visCard.leadingAnchor, constant: 12),
            visStack.trailingAnchor.constraint(equalTo: visCard.trailingAnchor, constant: -12)
        ])
        stack.addArrangedSubview(visCard)

        spinner.translatesAutoresizingMaskIntoConstraints = false
        spinner.hidesWhenStopped = true
        stack.addArrangedSubview(spinner)
    }

    @objc private func handleSwitchChange() {
        isLive = statusSwitch.isOn
        switchLbl.text = isLive ? "Portal is Enabled" : "Portal is Disabled"
        containerUrl.isHidden = !isLive
    }

    private func getFullPortalUrl() -> String {
        let slug = slugField.text?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        if !slug.isEmpty {
            return "https://app.patholab.cloud/book/\(slug)"
        }
        return "https://app.patholab.cloud/book"
    }

    @objc private func copyPortalUrl() {
        let slug = slugField.text?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        if slug.isEmpty {
            let alert = UIAlertController(title: nil, message: "Please enter a portal URL slug first", preferredStyle: .alert)
            present(alert, animated: true)
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.2) { alert.dismiss(animated: true) }
            return
        }
        UIPasteboard.general.string = getFullPortalUrl()
        let alert = UIAlertController(title: nil, message: "Booking URL copied to clipboard!", preferredStyle: .alert)
        present(alert, animated: true)
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.2) { alert.dismiss(animated: true) }
    }

    @objc private func shareToWhatsApp() {
        let slug = slugField.text?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        if slug.isEmpty {
            let alert = UIAlertController(title: nil, message: "Please enter a portal URL slug first", preferredStyle: .alert)
            present(alert, animated: true)
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.2) { alert.dismiss(animated: true) }
            return
        }
        let fullUrl = getFullPortalUrl()
        let msg = "Hello! You can now book diagnostic tests, health packages, and home sample collection online directly with us:\n\(fullUrl)"
        guard let encoded = msg.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) else { return }
        if let waUrl = URL(string: "https://api.whatsapp.com/send?text=\(encoded)"), UIApplication.shared.canOpenURL(waUrl) {
            UIApplication.shared.open(waUrl, options: [:], completionHandler: nil)
        } else {
            let activityVC = UIActivityViewController(activityItems: [msg], applicationActivities: nil)
            present(activityVC, animated: true, completion: nil)
        }
    }

    @objc private func saveSettings() {
        let active = statusSwitch.isOn
        let slug = slugField.text?.trimmingCharacters(in: .whitespacesAndNewlines).lowercased() ?? ""

        if active && slug.isEmpty {
            slugField.becomeFirstResponder()
            return
        }

        saveBtn.isEnabled = false
        spinner.startAnimating()

        guard let token = KeychainManager.shared.getToken(),
              let url = URL(string: "\(OnlineBookingViewController.baseUrl)/api/workspace/settings/portal") else { return }

        var req = URLRequest(url: url)
        req.httpMethod = "PATCH"
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        req.setValue("token=\(token)", forHTTPHeaderField: "Cookie")
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let payload: [String: Any] = ["portalSlug": active ? slug : NSNull()]
        req.httpBody = try? JSONSerialization.data(withJSONObject: payload)

        URLSession.shared.dataTask(with: req) { [weak self] data, response, error in
            DispatchQueue.main.async {
                self?.saveBtn.isEnabled = true
                self?.spinner.stopAnimating()

                if let http = response as? HTTPURLResponse, http.statusCode >= 200 && http.statusCode < 300 {
                    self?.dismiss(animated: true) {
                        self?.onSaved?()
                    }
                } else {
                    let alert = UIAlertController(title: "Save Failed", message: "Could not update portal settings.", preferredStyle: .alert)
                    alert.addAction(UIAlertAction(title: "OK", style: .default))
                    self?.present(alert, animated: true)
                }
            }
        }.resume()
    }
}
