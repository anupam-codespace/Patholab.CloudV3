import UIKit
import Network

// ─────────────────────────────────────────────────────────────────────────────
// HomeNativeView.swift
// Native Home Screen for Patholab iOS App
// Completely independent – no WebView. Data fetched via REST API.
// Matches the reference UI mockup exactly.
// ─────────────────────────────────────────────────────────────────────────────

// MARK: – Banner Model
struct HomeBanner {
    let title: String
    let subtitle: String
    let cta: String
    let path: String
}

// MARK: – Module Model
struct HomeModule {
    let id: String
    let name: String
    let path: String
    let icon: String        // SF Symbol name
    let iconColor: UIColor
    let bgColor: UIColor
    let isWhatsApp: Bool
}

// MARK: – Patient Model
struct HomePatient {
    let id: String
    let name: String
    let phone: String
    let patientId: String
    let age: Int
    let gender: String
    let testName: String
    let testCount: Int
    let status: String   // "Ready" | "Processing" | "Pending"
    let total: Double
    let paidAmount: Double
    let paid: Bool
}

// ─────────────────────────────────────────────────────────────────────────────
// MARK: – HomeNativeView (UIScrollView-based root view)
// ─────────────────────────────────────────────────────────────────────────────
class HomeNativeView: UIView {

    // MARK: – Static data
    static let banners: [HomeBanner] = [
        HomeBanner(title: "₹ 2.5 Per\nRegistration",
                   subtitle: "Cloud reporting, instant WhatsApp sharing & B2B automation at the lowest cost.",
                   cta: "Recharge Wallet", path: "/workspace/wallet?action=topup"),
        HomeBanner(title: "Instant WhatsApp\nDelivery",
                   subtitle: "Deliver diagnostic test reports directly to patients on WhatsApp with one click.",
                   cta: "Share Reports", path: "/workspace/reports"),
        HomeBanner(title: "Automated\nLab Billing",
                   subtitle: "Generate GST-compliant invoices, track pending dues & settle payments easily.",
                   cta: "Manage Billing", path: "/workspace/billing"),
        HomeBanner(title: "1,000+ Pathology\nTest Catalogs",
                   subtitle: "Pre-configured test parameters, biological reference ranges and custom pricing.",
                   cta: "Explore Catalog", path: "/workspace/test-management"),
        HomeBanner(title: "NABL & ISO\nQR Verification",
                   subtitle: "Tamper-proof digital verification QR codes embedded in every printed report.",
                   cta: "Verify Reports", path: "/workspace/reports"),
        HomeBanner(title: "Sample Accession\n& Barcodes",
                   subtitle: "Automated tube color-coding, specimen barcoding and rapid accessioning.",
                   cta: "Accession Samples", path: "/workspace/samples"),
        HomeBanner(title: "Phlebotomy &\nHome Collection",
                   subtitle: "Assign field technicians, track collection runs and dispatch runners live.",
                   cta: "Track Logistics", path: "/workspace/logistics"),
        HomeBanner(title: "Executive Financial\nAnalytics",
                   subtitle: "Monitor lab revenue, expense breakdown, net margins and clinical throughput.",
                   cta: "View Analytics", path: "/workspace/analytics"),
    ]

    static let modules: [HomeModule] = [
        HomeModule(id: "dash", name: "Dashboard",         path: "/workspace/dashboard",       icon: "chart.pie.fill",                iconColor: UIColor(red: 2/255, green: 132/255, blue: 199/255, alpha: 1), bgColor: UIColor(red: 224/255, green: 242/255, blue: 254/255, alpha: 1), isWhatsApp: false),
        HomeModule(id: "pat",  name: "Patient Directory", path: "/workspace/patients",        icon: "person.2.fill",                 iconColor: UIColor(red: 147/255, green: 51/255, blue: 234/255, alpha: 1), bgColor: UIColor(red: 243/255, green: 232/255, blue: 255/255, alpha: 1), isWhatsApp: false),
        HomeModule(id: "reg",  name: "New Registration",  path: "/workspace/registration",    icon: "person.crop.circle.badge.plus", iconColor: UIColor(red: 37/255, green: 99/255, blue: 235/255, alpha: 1), bgColor: UIColor(red: 239/255, green: 246/255, blue: 255/255, alpha: 1), isWhatsApp: false),
        HomeModule(id: "rep",  name: "Reports",           path: "/workspace/reports",         icon: "chart.bar.doc.horizontal.fill", iconColor: UIColor(red: 217/255, green: 119/255, blue: 6/255, alpha: 1), bgColor: UIColor(red: 254/255, green: 243/255, blue: 199/255, alpha: 1), isWhatsApp: false),
        HomeModule(id: "test", name: "Test Management",   path: "/workspace/test-management", icon: "flask.fill",                    iconColor: UIColor(red: 99/255, green: 102/255, blue: 241/255, alpha: 1), bgColor: UIColor(red: 238/255, green: 242/255, blue: 255/255, alpha: 1), isWhatsApp: false),
        HomeModule(id: "wall", name: "Wallet",            path: "/workspace/wallet",          icon: "creditcard.fill",               iconColor: UIColor(red: 225/255, green: 29/255, blue: 72/255, alpha: 1), bgColor: UIColor(red: 255/255, green: 241/255, blue: 242/255, alpha: 1), isWhatsApp: false),
        HomeModule(id: "bill", name: "Invoice",           path: "/workspace/billing",         icon: "doc.text.fill",                 iconColor: UIColor(red: 5/255, green: 150/255, blue: 105/255, alpha: 1), bgColor: UIColor(red: 236/255, green: 253/255, blue: 245/255, alpha: 1), isWhatsApp: false),
        HomeModule(id: "b2b",  name: "B2B",               path: "/workspace/agencies",        icon: "building.2.fill",               iconColor: UIColor(red: 13/255, green: 148/255, blue: 136/255, alpha: 1), bgColor: UIColor(red: 204/255, green: 251/255, blue: 241/255, alpha: 1), isWhatsApp: false),
    ]

    // MARK: – Colours
    static let headerBlue1 = UIColor(red: 0.039, green: 0.345, blue: 0.792, alpha: 1) // #0A58CA
    static let headerBlue2 = UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1) // #0D6EFD
    static let headerBlue3 = UIColor(red: 0.0, green: 0.478, blue: 1.0, alpha: 1)     // #007AFF
    static let bgGray      = UIColor(red: 0.973, green: 0.980, blue: 0.988, alpha: 1) // #F8FAFC
    static let textPrimary = UIColor(red: 0.059, green: 0.090, blue: 0.165, alpha: 1)
    static let textSecondary = UIColor(red: 0.392, green: 0.451, blue: 0.549, alpha: 1)

    // MARK: – UI Components
    // Header
    private let headerView       = UIView()
    private let headerGradient   = CAGradientLayer()
    private let avatarContainer    = UIView()
    private let avatarLabel        = UILabel()
    private let avatarImageView    = UIImageView()
    private let statusDotView      = UIView()
    private let statusWaveView     = UIView()
    private let greetingLabel      = UILabel()
    private let waveLabel          = UILabel()
    private let walletPill       = UIButton(type: .custom)
    private let walletIcon       = UIImageView()
    private let walletBalanceLabel = UILabel()
    private let helpButton       = UIButton(type: .custom)
    private let bellButton       = UIButton(type: .custom)
    private let bellDot          = UIView()

    // Connection state monitoring & continuous wave pulse
    enum ConnectionState {
        case online      // Green = Online
        case connecting  // Yellow = Connecting/Waiting (checks connectivity for 2-4s)
        case offline     // Red = Offline
    }
    private var currentConnectionState: ConnectionState = .online
    private var pendingOfflineWorkItem: DispatchWorkItem?
    private let pathMonitor = NWPathMonitor()
    private let monitorQueue = DispatchQueue(label: "cloud.patholab.networkMonitor")

    // Scroll
    private let scrollView       = UIScrollView()
    private let contentStack     = UIStackView()

    // Banner
    private let bannerCard       = UIView()
    private let bannerGradient   = CAGradientLayer()
    private let bannerTitleLabel = UILabel()
    private let bannerSubLabel   = UILabel()
    private let bannerCtaBtn     = UIButton(type: .custom)
    private let bannerDotsStack  = UIStackView()
    private var bannerDots: [UIView] = []
    private var currentBannerIdx = 0
    private var bannerTimer: Timer?

    // Modules
    private let modulesSection   = UIView()

    // Worklist
    private let worklistSection      = UIView()
    private let worklistCountBadge   = UILabel()
    private let worklistScrollView   = UIScrollView()
    private let worklistStack        = UIStackView()

    // MARK: – State
    var onNavigate: ((String) -> Void)?
    var onSignOut: (() -> Void)?
    private var walletPollTimer: Timer?
    private var bellLoopTimer: Timer?
    private var currentFullName = "User"
    private var currentRole = "Lab Owner"

    // MARK: – Notification Flags
    private static var hasShownWelcomeNotification = false
    private static var hasShownLowBalanceNotification = false

    static func resetSession() {
        hasShownWelcomeNotification = false
        hasShownLowBalanceNotification = false
    }

    // MARK: – Init
    override init(frame: CGRect) {
        super.init(frame: frame)
        backgroundColor = Self.bgGray
        buildLayout()
        startCarousel()
        loadUserInfo()
        fetchWalletBalance()
        fetchTodaysWorklist()
        startBellPeriodicAnimation()
        startWalletPolling()
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) { [weak self] in
            self?.playWaveAnimation()
        }
    }
    required init?(coder: NSCoder) { super.init(coder: coder); }

    override func layoutSubviews() {
        super.layoutSubviews()
        headerGradient.frame = headerView.bounds
        bannerGradient.frame = bannerCard.bounds

        // Rounded bottom corners for header
        let headerPath = UIBezierPath(roundedRect: headerView.bounds,
                                      byRoundingCorners: [.bottomLeft, .bottomRight],
                                      cornerRadii: CGSize(width: 34, height: 34))
        let headerMask = CAShapeLayer()
        headerMask.path = headerPath.cgPath
        headerView.layer.mask = headerMask
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MARK: – Layout
    // ─────────────────────────────────────────────────────────────────────────
    private func buildLayout() {
        buildHeader()
        buildScrollContent()
    }

    private func buildHeader() {
        // Gradient background
        headerGradient.colors = [
            Self.headerBlue1.cgColor,
            Self.headerBlue2.cgColor,
            Self.headerBlue3.cgColor
        ]
        headerGradient.startPoint = CGPoint(x: 0, y: 0)
        headerGradient.endPoint   = CGPoint(x: 1, y: 1)
        headerView.layer.insertSublayer(headerGradient, at: 0)
        addSubview(headerView)
        headerView.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            headerView.topAnchor.constraint(equalTo: topAnchor, constant: -20),
            headerView.leadingAnchor.constraint(equalTo: leadingAnchor),
            headerView.trailingAnchor.constraint(equalTo: trailingAnchor),
        ])

        // Avatar with Matching 44pt Size & Pulsing Status Dot
        avatarContainer.backgroundColor    = .white
        avatarContainer.layer.cornerRadius = 22
        avatarContainer.layer.shadowColor  = UIColor.black.cgColor
        avatarContainer.layer.shadowOpacity = 0.12
        avatarContainer.layer.shadowRadius = 4
        avatarContainer.layer.shadowOffset = CGSize(width: 0, height: 2)
        avatarContainer.isUserInteractionEnabled = true
        let avatarTap = UITapGestureRecognizer(target: self, action: #selector(avatarTapped))
        avatarContainer.addGestureRecognizer(avatarTap)

        avatarLabel.font       = .systemFont(ofSize: 18, weight: .black)
        avatarLabel.textColor  = Self.headerBlue
        avatarLabel.textAlignment = .center
        avatarLabel.text = "A"
        avatarLabel.frame = CGRect(x: 0, y: 0, width: 44, height: 44)
        avatarContainer.addSubview(avatarLabel)

        avatarImageView.contentMode = .scaleAspectFill
        avatarImageView.clipsToBounds = true
        avatarImageView.layer.cornerRadius = 22
        avatarImageView.frame = CGRect(x: 0, y: 0, width: 44, height: 44)
        avatarContainer.clipsToBounds = false

        statusWaveView.backgroundColor = UIColor(red: 16/255, green: 185/255, blue: 129/255, alpha: 0.70)
        statusWaveView.layer.cornerRadius = 6
        statusWaveView.clipsToBounds = false
        statusWaveView.translatesAutoresizingMaskIntoConstraints = false
        avatarContainer.addSubview(statusWaveView)

        statusDotView.backgroundColor    = UIColor(red: 16/255, green: 185/255, blue: 129/255, alpha: 1)
        statusDotView.layer.cornerRadius = 5.5
        statusDotView.layer.borderWidth  = 2.0
        statusDotView.layer.borderColor  = UIColor.white.cgColor
        statusDotView.translatesAutoresizingMaskIntoConstraints = false
        avatarContainer.addSubview(statusDotView)

        NSLayoutConstraint.activate([
            statusDotView.widthAnchor.constraint(equalToConstant: 11),
            statusDotView.heightAnchor.constraint(equalToConstant: 11),
            statusDotView.trailingAnchor.constraint(equalTo: avatarContainer.trailingAnchor, constant: 1),
            statusDotView.topAnchor.constraint(equalTo: avatarContainer.topAnchor, constant: -1),

            statusWaveView.centerXAnchor.constraint(equalTo: statusDotView.centerXAnchor),
            statusWaveView.centerYAnchor.constraint(equalTo: statusDotView.centerYAnchor),
            statusWaveView.widthAnchor.constraint(equalToConstant: 12),
            statusWaveView.heightAnchor.constraint(equalToConstant: 12),
        ])
        ensureStatusWaveAnimation()
        setupNetworkMonitor()
        NotificationCenter.default.addObserver(self, selector: #selector(appWillEnterForeground), name: UIApplication.willEnterForegroundNotification, object: nil)

        // Greeting
        greetingLabel.font = .systemFont(ofSize: 19.5, weight: .bold)
        greetingLabel.textColor = .white
        greetingLabel.text = "Hello, User"
        greetingLabel.lineBreakMode = .byTruncatingTail

        waveLabel.font = .systemFont(ofSize: 17.5)
        waveLabel.text = "\u{1F44B}"

        let greetingRow = UIStackView(arrangedSubviews: [greetingLabel, waveLabel])
        greetingRow.axis = .horizontal
        greetingRow.spacing = 4
        greetingRow.alignment = .center

        // Modern Wallet Capsule
        walletPill.backgroundColor = UIColor.white.withAlphaComponent(0.20)
        walletPill.layer.cornerRadius = 15
        walletPill.layer.borderWidth  = 1
        walletPill.layer.borderColor  = UIColor.white.withAlphaComponent(0.35).cgColor
        walletPill.contentEdgeInsets  = UIEdgeInsets(top: 5, left: 12, bottom: 5, right: 12)
        walletPill.addTarget(self, action: #selector(walletPillTapped), for: .touchUpInside)

        walletIcon.image = UIImage(systemName: "creditcard.fill")
        walletIcon.tintColor = UIColor(red: 0.729, green: 0.902, blue: 0.992, alpha: 1)
        walletIcon.contentMode = .scaleAspectFit

        walletBalanceLabel.text      = "Wallet: ₹ 0.00"
        walletBalanceLabel.font      = .systemFont(ofSize: 13.5, weight: .black)
        walletBalanceLabel.textColor = .white

        let walletRow = UIStackView(arrangedSubviews: [walletIcon, walletBalanceLabel])
        walletRow.axis    = .horizontal
        walletRow.spacing = 6
        walletRow.alignment = .center
        walletRow.isUserInteractionEnabled = false
        walletPill.addSubview(walletRow)

        // Notification Bell button (First)
        bellButton.backgroundColor = .white
        bellButton.layer.cornerRadius = 20
        bellButton.layer.borderWidth = 1
        bellButton.layer.borderColor = UIColor(white: 1.0, alpha: 0.35).cgColor
        bellButton.layer.shadowColor  = UIColor.black.cgColor
        bellButton.layer.shadowOpacity = 0.10
        bellButton.layer.shadowRadius  = 4
        bellButton.layer.shadowOffset  = CGSize(width: 0, height: 2)
        let bellConfig = UIImage.SymbolConfiguration(pointSize: 16, weight: .bold)
        bellButton.setImage(UIImage(systemName: "bell.fill", withConfiguration: bellConfig), for: .normal)
        bellButton.tintColor = Self.headerBlue2
        bellButton.accessibilityLabel = "Notifications"
        bellButton.addTarget(self, action: #selector(bellTapped), for: .touchUpInside)

        // Bell unread dot
        bellDot.backgroundColor   = UIColor(red: 1, green: 0.231, blue: 0.188, alpha: 1)
        bellDot.layer.cornerRadius = 4
        bellDot.layer.borderWidth  = 1.5
        bellDot.layer.borderColor  = UIColor.white.cgColor

        // Help / Assistance Support button
        helpButton.backgroundColor = .white
        helpButton.layer.cornerRadius = 20
        helpButton.layer.borderWidth = 1
        helpButton.layer.borderColor = UIColor(white: 1.0, alpha: 0.35).cgColor
        helpButton.layer.shadowColor  = UIColor.black.cgColor
        helpButton.layer.shadowOpacity = 0.10
        helpButton.layer.shadowRadius  = 4
        helpButton.layer.shadowOffset  = CGSize(width: 0, height: 2)
        let helpConfig = UIImage.SymbolConfiguration(pointSize: 16, weight: .bold)
        helpButton.setImage(UIImage(systemName: "questionmark.circle.fill", withConfiguration: helpConfig) ?? UIImage(systemName: "questionmark", withConfiguration: helpConfig), for: .normal)
        helpButton.tintColor = Self.headerBlue2
        helpButton.accessibilityLabel = "Help & Support"
        helpButton.addTarget(self, action: #selector(helpTapped), for: .touchUpInside)

        // Layout in header using Auto Layout
        let leftVStack = UIStackView(arrangedSubviews: [greetingRow, walletPill])
        leftVStack.axis    = .vertical
        leftVStack.spacing = 6
        leftVStack.alignment = .leading

        let hStack = UIStackView(arrangedSubviews: [avatarContainer, leftVStack, UIView(), bellButton, helpButton])
        hStack.axis    = .horizontal
        hStack.spacing = 8
        hStack.alignment = .center
        hStack.setCustomSpacing(8, after: leftVStack)

        headerView.addSubview(hStack)
        headerView.addSubview(bellDot)
        headerView.clipsToBounds = false
        hStack.clipsToBounds = false
        hStack.translatesAutoresizingMaskIntoConstraints = false
        bellDot.translatesAutoresizingMaskIntoConstraints = false
        avatarContainer.translatesAutoresizingMaskIntoConstraints = false
        helpButton.translatesAutoresizingMaskIntoConstraints = false
        bellButton.translatesAutoresizingMaskIntoConstraints = false
        walletRow.translatesAutoresizingMaskIntoConstraints = false

        NSLayoutConstraint.activate([
            avatarContainer.widthAnchor.constraint(equalToConstant: 44),
            avatarContainer.heightAnchor.constraint(equalToConstant: 44),
            helpButton.widthAnchor.constraint(equalToConstant: 40),
            helpButton.heightAnchor.constraint(equalToConstant: 40),
            bellButton.widthAnchor.constraint(equalToConstant: 40),
            bellButton.heightAnchor.constraint(equalToConstant: 40),
            hStack.topAnchor.constraint(equalTo: headerView.safeAreaLayoutGuide.topAnchor, constant: 10),
            hStack.leadingAnchor.constraint(equalTo: headerView.leadingAnchor, constant: 18),
            hStack.trailingAnchor.constraint(equalTo: headerView.trailingAnchor, constant: -18),
            hStack.bottomAnchor.constraint(equalTo: headerView.bottomAnchor, constant: -26),
            walletRow.leadingAnchor.constraint(equalTo: walletPill.leadingAnchor, constant: 10),
            walletRow.centerYAnchor.constraint(equalTo: walletPill.centerYAnchor),
            walletIcon.widthAnchor.constraint(equalToConstant: 14),
            walletIcon.heightAnchor.constraint(equalToConstant: 14),
            bellDot.widthAnchor.constraint(equalToConstant: 8),
            bellDot.heightAnchor.constraint(equalToConstant: 8),
            bellDot.topAnchor.constraint(equalTo: bellButton.topAnchor, constant: 6),
            bellDot.trailingAnchor.constraint(equalTo: bellButton.trailingAnchor, constant: -6),
        ])
    }

    private func buildScrollContent() {
        scrollView.showsVerticalScrollIndicator  = false
        scrollView.showsHorizontalScrollIndicator = false
        scrollView.alwaysBounceVertical = true
        addSubview(scrollView)
        scrollView.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            scrollView.topAnchor.constraint(equalTo: topAnchor),
            scrollView.leadingAnchor.constraint(equalTo: leadingAnchor),
            scrollView.trailingAnchor.constraint(equalTo: trailingAnchor),
            scrollView.bottomAnchor.constraint(equalTo: bottomAnchor),
        ])

        contentStack.axis    = .vertical
        contentStack.spacing = 0
        scrollView.addSubview(contentStack)
        contentStack.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            contentStack.topAnchor.constraint(equalTo: scrollView.topAnchor),
            contentStack.leadingAnchor.constraint(equalTo: scrollView.leadingAnchor),
            contentStack.trailingAnchor.constraint(equalTo: scrollView.trailingAnchor),
            contentStack.bottomAnchor.constraint(equalTo: scrollView.bottomAnchor),
            contentStack.widthAnchor.constraint(equalTo: scrollView.widthAnchor),
        ])

        // Header spacer (the real header is layered on top)
        let headerSpacer = UIView()
        NSLayoutConstraint.activate([
            headerSpacer.heightAnchor.constraint(equalToConstant: 105),
        ])
        headerSpacer.translatesAutoresizingMaskIntoConstraints = false
        contentStack.addArrangedSubview(headerSpacer)

        buildBannerSection()
        buildModulesSection()
        buildWorklistSection()

        // Bottom padding
        let bottomPad = UIView()
        bottomPad.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([bottomPad.heightAnchor.constraint(equalToConstant: 100)])
        contentStack.addArrangedSubview(bottomPad)

        // Place header on top of scroll content
        bringSubviewToFront(headerView)
    }

    // MARK: – Banner
    private func buildBannerSection() {
        let wrapper = UIView()
        wrapper.translatesAutoresizingMaskIntoConstraints = false

        // Card
        bannerCard.layer.cornerRadius = 20
        bannerCard.clipsToBounds = true
        bannerCard.layer.shadowColor   = UIColor(red: 0.118, green: 0.533, blue: 0.898, alpha: 0.18).cgColor
        bannerCard.layer.shadowOpacity = 1
        bannerCard.layer.shadowRadius  = 10
        bannerCard.layer.shadowOffset  = CGSize(width: 0, height: 4)
        bannerCard.layer.masksToBounds = false

        // Gradient inside card
        bannerGradient.colors = [
            UIColor(red: 0.086, green: 0.392, blue: 0.878, alpha: 1).cgColor,
            UIColor(red: 0.118, green: 0.533, blue: 0.898, alpha: 1).cgColor,
            UIColor(red: 0.161, green: 0.714, blue: 0.965, alpha: 1).cgColor,
        ]
        bannerGradient.startPoint = CGPoint(x: 0, y: 0)
        bannerGradient.endPoint   = CGPoint(x: 1, y: 1)
        bannerCard.layer.insertSublayer(bannerGradient, at: 0)

        // Title
        bannerTitleLabel.font          = .systemFont(ofSize: 24, weight: .heavy)
        bannerTitleLabel.textColor     = .white
        bannerTitleLabel.numberOfLines = 2
        bannerTitleLabel.text          = "₹ 2.5 Per\nRegistration"

        // Subtitle
        bannerSubLabel.font          = .systemFont(ofSize: 12, weight: .regular)
        bannerSubLabel.textColor     = UIColor.white.withAlphaComponent(0.88)
        bannerSubLabel.numberOfLines = 3
        bannerSubLabel.text          = "Cloud reporting, instant WhatsApp sharing & B2B automation at the lowest cost."

        // CTA Button
        bannerCtaBtn.setTitle("Recharge Wallet", for: .normal)
        bannerCtaBtn.setTitleColor(UIColor(red: 10/255, green: 88/255, blue: 202/255, alpha: 1), for: .normal)
        bannerCtaBtn.titleLabel?.font = .systemFont(ofSize: 13, weight: .bold)
        bannerCtaBtn.backgroundColor  = .white
        bannerCtaBtn.layer.cornerRadius = 20
        bannerCtaBtn.layer.borderWidth = 1
        bannerCtaBtn.layer.borderColor = UIColor(red: 219/255, green: 234/255, blue: 254/255, alpha: 1).cgColor
        bannerCtaBtn.contentEdgeInsets  = UIEdgeInsets(top: 9, left: 16, bottom: 9, right: 14)
        bannerCtaBtn.layer.shadowColor   = UIColor.black.cgColor
        bannerCtaBtn.layer.shadowOpacity = 0.12
        bannerCtaBtn.layer.shadowRadius  = 4
        bannerCtaBtn.layer.shadowOffset  = CGSize(width: 0, height: 2)
        let arrowCfg = UIImage.SymbolConfiguration(pointSize: 11, weight: .bold)
        bannerCtaBtn.setImage(UIImage(systemName: "arrow.right", withConfiguration: arrowCfg), for: .normal)
        bannerCtaBtn.tintColor = UIColor(red: 10/255, green: 88/255, blue: 202/255, alpha: 1)
        bannerCtaBtn.semanticContentAttribute = .forceRightToLeft
        bannerCtaBtn.imageEdgeInsets = UIEdgeInsets(top: 0, left: 6, bottom: 0, right: -6)
        bannerCtaBtn.addTarget(self, action: #selector(bannerCtaTapped), for: .touchUpInside)

        let textStack = UIStackView(arrangedSubviews: [bannerTitleLabel, bannerSubLabel, bannerCtaBtn])
        textStack.axis    = .vertical
        textStack.spacing = 0
        textStack.setCustomSpacing(8, after: bannerTitleLabel)
        textStack.setCustomSpacing(16, after: bannerSubLabel)
        textStack.alignment = .leading
        textStack.translatesAutoresizingMaskIntoConstraints = false

        let innerView = UIView()
        innerView.clipsToBounds = true
        innerView.addSubview(textStack)
        textStack.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            textStack.topAnchor.constraint(equalTo: innerView.topAnchor, constant: 22),
            textStack.leadingAnchor.constraint(equalTo: innerView.leadingAnchor, constant: 20),
            textStack.bottomAnchor.constraint(lessThanOrEqualTo: innerView.bottomAnchor, constant: -20),
            textStack.widthAnchor.constraint(lessThanOrEqualTo: innerView.widthAnchor, multiplier: 0.55),
        ])
        innerView.heightAnchor.constraint(equalToConstant: 170).isActive = true

        bannerCard.addSubview(innerView)
        innerView.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            innerView.topAnchor.constraint(equalTo: bannerCard.topAnchor),
            innerView.leadingAnchor.constraint(equalTo: bannerCard.leadingAnchor),
            innerView.trailingAnchor.constraint(equalTo: bannerCard.trailingAnchor),
            innerView.bottomAnchor.constraint(equalTo: bannerCard.bottomAnchor),
        ])

        // Pagination dots
        bannerDotsStack.axis      = .horizontal
        bannerDotsStack.spacing   = 5
        bannerDotsStack.alignment = .center
        for i in 0..<Self.banners.count {
            let dot = UIView()
            dot.layer.cornerRadius = 3
            dot.translatesAutoresizingMaskIntoConstraints = false
            let w: CGFloat = i == 0 ? 18 : 6
            NSLayoutConstraint.activate([
                dot.widthAnchor.constraint(equalToConstant: w),
                dot.heightAnchor.constraint(equalToConstant: 6),
            ])
            dot.backgroundColor = i == 0
                ? UIColor(red: 0.118, green: 0.533, blue: 0.898, alpha: 1)
                : UIColor(red: 0.773, green: 0.824, blue: 0.910, alpha: 1)
            bannerDots.append(dot)
            bannerDotsStack.addArrangedSubview(dot)
        }

        wrapper.addSubview(bannerCard)
        wrapper.addSubview(bannerDotsStack)
        bannerCard.translatesAutoresizingMaskIntoConstraints = false
        bannerDotsStack.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            bannerCard.topAnchor.constraint(equalTo: wrapper.topAnchor, constant: 16),
            bannerCard.leadingAnchor.constraint(equalTo: wrapper.leadingAnchor, constant: 16),
            bannerCard.trailingAnchor.constraint(equalTo: wrapper.trailingAnchor, constant: -16),
            bannerDotsStack.topAnchor.constraint(equalTo: bannerCard.bottomAnchor, constant: 10),
            bannerDotsStack.centerXAnchor.constraint(equalTo: wrapper.centerXAnchor),
            bannerDotsStack.bottomAnchor.constraint(equalTo: wrapper.bottomAnchor, constant: -4),
        ])
        contentStack.addArrangedSubview(wrapper)
    }

    // MARK: – Top Modules (Folder Card Shape)
    private func buildModulesSection() {
        let bentoCard = FolderModuleCardView()
        bentoCard.translatesAutoresizingMaskIntoConstraints = false

        // Header aligned with the tab geometry
        let headerContainer = UIView()
        headerContainer.translatesAutoresizingMaskIntoConstraints = false

        let titleLabel = UILabel()
        titleLabel.text = "Our Modules"
        titleLabel.font = .systemFont(ofSize: 18, weight: .bold)
        titleLabel.textColor = UIColor(red: 15/255, green: 23/255, blue: 42/255, alpha: 1)
        titleLabel.translatesAutoresizingMaskIntoConstraints = false

        // See all › pill button inside top-right tab matching app theme
        let seeAllBtn = UIButton(type: .system)
        seeAllBtn.setTitle("See all ›", for: .normal)
        seeAllBtn.titleLabel?.font = .systemFont(ofSize: 12.5, weight: .bold)
        seeAllBtn.setTitleColor(UIColor(red: 67/255, green: 56/255, blue: 202/255, alpha: 1), for: .normal) // #4338CA
        seeAllBtn.backgroundColor = UIColor(red: 238/255, green: 242/255, blue: 255/255, alpha: 1) // #EEF2FF
        seeAllBtn.layer.cornerRadius = 14
        seeAllBtn.layer.borderWidth = 1
        seeAllBtn.layer.borderColor = UIColor(red: 224/255, green: 231/255, blue: 255/255, alpha: 1).cgColor // #E0E7FF
        seeAllBtn.contentEdgeInsets = UIEdgeInsets(top: 5, left: 12, bottom: 5, right: 12)
        seeAllBtn.addTarget(self, action: #selector(seeAllTapped), for: .touchUpInside)
        seeAllBtn.translatesAutoresizingMaskIntoConstraints = false

        headerContainer.addSubview(titleLabel)
        headerContainer.addSubview(seeAllBtn)

        NSLayoutConstraint.activate([
            headerContainer.heightAnchor.constraint(equalToConstant: 40),
            titleLabel.leadingAnchor.constraint(equalTo: headerContainer.leadingAnchor, constant: 16),
            titleLabel.centerYAnchor.constraint(equalTo: headerContainer.centerYAnchor),

            seeAllBtn.trailingAnchor.constraint(equalTo: headerContainer.trailingAnchor, constant: -12),
            seeAllBtn.centerYAnchor.constraint(equalTo: headerContainer.centerYAnchor),
            seeAllBtn.heightAnchor.constraint(equalToConstant: 30),
        ])

        // Grid: 2 rows of 4 columns
        let row1 = makeModuleRow(modules: Array(Self.modules[0..<4]))
        let row2 = makeModuleRow(modules: Array(Self.modules[4..<8]))
        let gridStack = UIStackView(arrangedSubviews: [row1, row2])
        gridStack.axis    = .vertical
        gridStack.spacing = 14
        gridStack.distribution = .fillEqually
        gridStack.translatesAutoresizingMaskIntoConstraints = false

        bentoCard.addSubview(headerContainer)
        bentoCard.addSubview(gridStack)

        NSLayoutConstraint.activate([
            headerContainer.topAnchor.constraint(equalTo: bentoCard.topAnchor),
            headerContainer.leadingAnchor.constraint(equalTo: bentoCard.leadingAnchor),
            headerContainer.trailingAnchor.constraint(equalTo: bentoCard.trailingAnchor),

            gridStack.topAnchor.constraint(equalTo: bentoCard.topAnchor, constant: 54),
            gridStack.leadingAnchor.constraint(equalTo: bentoCard.leadingAnchor, constant: 14),
            gridStack.trailingAnchor.constraint(equalTo: bentoCard.trailingAnchor, constant: -14),
            gridStack.bottomAnchor.constraint(equalTo: bentoCard.bottomAnchor, constant: -18),
        ])

        let wrapper = UIView()
        wrapper.addSubview(bentoCard)
        NSLayoutConstraint.activate([
            bentoCard.topAnchor.constraint(equalTo: wrapper.topAnchor, constant: 18),
            bentoCard.leadingAnchor.constraint(equalTo: wrapper.leadingAnchor, constant: 16),
            bentoCard.trailingAnchor.constraint(equalTo: wrapper.trailingAnchor, constant: -16),
            bentoCard.bottomAnchor.constraint(equalTo: wrapper.bottomAnchor),
        ])

        contentStack.addArrangedSubview(wrapper)
    }

    private func makeModuleRow(modules: [HomeModule]) -> UIStackView {
        let row = UIStackView()
        row.axis         = .horizontal
        row.distribution = .fillEqually
        row.spacing      = 8
        for mod in modules {
            row.addArrangedSubview(makeModuleCard(mod))
        }
        return row
    }

    private func makeModuleCard(_ mod: HomeModule) -> UIView {
        let card = UIView()
        card.backgroundColor = .clear

        // Icon container with 50pt size & subtle elevation shadow
        let iconBg = UIView()
        iconBg.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            iconBg.widthAnchor.constraint(equalToConstant: 50),
            iconBg.heightAnchor.constraint(equalToConstant: 50),
        ])

        iconBg.backgroundColor    = mod.bgColor
        iconBg.layer.cornerRadius = 15
        iconBg.layer.borderWidth  = 1
        iconBg.layer.borderColor  = mod.iconColor.withAlphaComponent(0.18).cgColor

        let img: UIImageView
        if mod.isWhatsApp, let waImg = UIImage(named: "ModWhatsApp") {
            img = UIImageView(image: waImg)
        } else if let sfImg = UIImage(systemName: mod.icon) {
            img = UIImageView(image: sfImg)
            img.tintColor = mod.iconColor
        } else if let customImage = UIImage(named: mod.icon) {
            img = UIImageView(image: customImage)
        } else {
            img = UIImageView(image: UIImage(systemName: "square.grid.2x2.fill"))
            img.tintColor = mod.iconColor
        }
        img.contentMode   = .scaleAspectFit
        img.translatesAutoresizingMaskIntoConstraints = false
        iconBg.addSubview(img)
        NSLayoutConstraint.activate([
            img.centerXAnchor.constraint(equalTo: iconBg.centerXAnchor),
            img.centerYAnchor.constraint(equalTo: iconBg.centerYAnchor),
            img.widthAnchor.constraint(equalToConstant: 24),
            img.heightAnchor.constraint(equalToConstant: 24),
        ])

        let boldLabel = UILabel()
        boldLabel.font = .systemFont(ofSize: 11, weight: .bold)
        boldLabel.textColor = UIColor(red: 30/255, green: 41/255, blue: 59/255, alpha: 1)
        boldLabel.text = mod.name
        boldLabel.textAlignment = .center
        boldLabel.numberOfLines = 2
        boldLabel.adjustsFontSizeToFitWidth = true
        boldLabel.minimumScaleFactor = 0.75

        let vStack = UIStackView(arrangedSubviews: [iconBg, boldLabel])
        vStack.axis      = .vertical
        vStack.spacing   = 6
        vStack.alignment = .center

        card.addSubview(vStack)
        vStack.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            vStack.topAnchor.constraint(equalTo: card.topAnchor, constant: 4),
            vStack.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 2),
            vStack.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -2),
            vStack.bottomAnchor.constraint(equalTo: card.bottomAnchor, constant: -4),
        ])

        // Tap
        let tap = UITapGestureRecognizer(target: self, action: #selector(moduleTapped(_:)))
        card.addGestureRecognizer(tap)
        card.accessibilityIdentifier = mod.path
        card.isUserInteractionEnabled = true

        return card
    }

    // MARK: – Worklist (Dynamically visible ONLY when data exists for user)
    private func buildWorklistSection() {
        worklistSection.translatesAutoresizingMaskIntoConstraints = false
        worklistSection.isHidden = true

        let headerView = UIView()
        headerView.translatesAutoresizingMaskIntoConstraints = false

        let titleLabel = UILabel()
        titleLabel.text = "Today's Worklist"
        titleLabel.font = .systemFont(ofSize: 18, weight: .bold)
        titleLabel.textColor = Self.textPrimary

        worklistCountBadge.font = .systemFont(ofSize: 11, weight: .bold)
        worklistCountBadge.textColor = UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1)
        worklistCountBadge.backgroundColor = UIColor(red: 0.94, green: 0.96, blue: 1.0, alpha: 1)
        worklistCountBadge.layer.cornerRadius = 6
        worklistCountBadge.clipsToBounds = true
        worklistCountBadge.text = " 0 Patients "

        let titleStack = UIStackView(arrangedSubviews: [titleLabel])
        titleStack.axis = .horizontal
        titleStack.spacing = 8
        titleStack.alignment = .center
        titleStack.translatesAutoresizingMaskIntoConstraints = false
        headerView.addSubview(titleStack)

        let actionBtn = UIButton(type: .system)
        actionBtn.setTitle("View All >", for: .normal)
        actionBtn.titleLabel?.font = .systemFont(ofSize: 13, weight: .bold)
        actionBtn.tintColor = UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1)
        actionBtn.addTarget(self, action: #selector(viewAllTapped), for: .touchUpInside)
        actionBtn.translatesAutoresizingMaskIntoConstraints = false
        headerView.addSubview(actionBtn)

        NSLayoutConstraint.activate([
            titleStack.leadingAnchor.constraint(equalTo: headerView.leadingAnchor),
            titleStack.centerYAnchor.constraint(equalTo: headerView.centerYAnchor),
            titleStack.topAnchor.constraint(greaterThanOrEqualTo: headerView.topAnchor),
            titleStack.bottomAnchor.constraint(lessThanOrEqualTo: headerView.bottomAnchor),

            actionBtn.trailingAnchor.constraint(equalTo: headerView.trailingAnchor),
            actionBtn.centerYAnchor.constraint(equalTo: headerView.centerYAnchor),
            actionBtn.leadingAnchor.constraint(greaterThanOrEqualTo: titleStack.trailingAnchor, constant: 12)
        ])

        worklistSection.addSubview(headerView)

        worklistScrollView.showsHorizontalScrollIndicator = false
        worklistScrollView.alwaysBounceHorizontal = true
        worklistScrollView.contentInset = UIEdgeInsets(top: 0, left: 16, bottom: 0, right: 16)

        worklistStack.axis    = .horizontal
        worklistStack.spacing = 12
        worklistStack.alignment = .top
        worklistScrollView.addSubview(worklistStack)
        worklistStack.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            worklistStack.topAnchor.constraint(equalTo: worklistScrollView.topAnchor),
            worklistStack.leadingAnchor.constraint(equalTo: worklistScrollView.leadingAnchor),
            worklistStack.trailingAnchor.constraint(equalTo: worklistScrollView.trailingAnchor),
            worklistStack.bottomAnchor.constraint(equalTo: worklistScrollView.bottomAnchor),
            worklistStack.heightAnchor.constraint(equalTo: worklistScrollView.heightAnchor),
        ])

        worklistSection.addSubview(worklistScrollView)
        worklistScrollView.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            headerView.topAnchor.constraint(equalTo: worklistSection.topAnchor, constant: 22),
            headerView.leadingAnchor.constraint(equalTo: worklistSection.leadingAnchor, constant: 16),
            headerView.trailingAnchor.constraint(equalTo: worklistSection.trailingAnchor, constant: -16),
            worklistScrollView.topAnchor.constraint(equalTo: headerView.bottomAnchor, constant: 12),
            worklistScrollView.leadingAnchor.constraint(equalTo: worklistSection.leadingAnchor),
            worklistScrollView.trailingAnchor.constraint(equalTo: worklistSection.trailingAnchor),
            worklistScrollView.bottomAnchor.constraint(equalTo: worklistSection.bottomAnchor, constant: -4),
            worklistScrollView.heightAnchor.constraint(equalToConstant: 180),
        ])
        contentStack.addArrangedSubview(worklistSection)
    }

    func populateWorklist(_ patients: [HomePatient]) {
        worklistStack.arrangedSubviews.forEach { $0.removeFromSuperview() }
        for p in patients {
            worklistStack.addArrangedSubview(makePatientCard(p))
        }
    }

    private func makePatientCard(_ p: HomePatient) -> UIView {
        let card = UIView()
        card.backgroundColor    = .white
        card.layer.cornerRadius = 20
        card.layer.borderWidth  = 1
        card.layer.borderColor  = UIColor(red: 0.89, green: 0.92, blue: 0.95, alpha: 1).cgColor
        card.layer.shadowColor  = UIColor.black.cgColor
        card.layer.shadowOpacity = 0.03
        card.layer.shadowRadius = 6
        card.layer.shadowOffset = CGSize(width: 0, height: 2)
        card.widthAnchor.constraint(equalToConstant: 265).isActive = true

        // Initial Avatar Badge
        let initialBadge = UILabel()
        let initialChar = p.name.isEmpty ? "P" : String(p.name.prefix(1)).uppercased()
        initialBadge.text = initialChar
        initialBadge.font = .systemFont(ofSize: 13, weight: .bold)
        initialBadge.textColor = UIColor(red: 0.31, green: 0.27, blue: 0.90, alpha: 1)
        initialBadge.backgroundColor = UIColor(red: 0.93, green: 0.95, blue: 1.0, alpha: 1)
        initialBadge.textAlignment = .center
        initialBadge.layer.cornerRadius = 15
        initialBadge.layer.masksToBounds = true
        initialBadge.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            initialBadge.widthAnchor.constraint(equalToConstant: 30),
            initialBadge.heightAnchor.constraint(equalToConstant: 30),
        ])

        // Code Pill
        let codeBadge = UILabel()
        codeBadge.text = " \(p.patientId) "
        codeBadge.font = .monospacedSystemFont(ofSize: 11, weight: .bold)
        codeBadge.textColor = UIColor(red: 0.28, green: 0.33, blue: 0.41, alpha: 1)
        codeBadge.backgroundColor = UIColor(red: 0.95, green: 0.96, blue: 0.98, alpha: 1)
        codeBadge.layer.cornerRadius = 6
        codeBadge.layer.masksToBounds = true

        // Status badge (Top Accepted badge in deep green)
        let displayStatus = (p.status == "Pending" || p.status == "Accepted") ? "Accepted" : p.status
        let (bgColor, textColor, borderColor) = statusStyle(displayStatus)
        let statusBadge = UILabel()
        statusBadge.text = " \(displayStatus) "
        statusBadge.font = .systemFont(ofSize: 11, weight: .bold)
        statusBadge.textColor = textColor
        statusBadge.backgroundColor = bgColor
        statusBadge.layer.cornerRadius = 8
        statusBadge.layer.borderWidth  = 1
        statusBadge.layer.borderColor  = borderColor.cgColor
        statusBadge.textAlignment = .center
        statusBadge.layer.masksToBounds = true

        let patientTopRow = makeHStack([initialBadge, codeBadge, UIView(), statusBadge])
        patientTopRow.spacing = 8

        let nameLabel = UILabel()
        nameLabel.text = p.name
        nameLabel.font = .systemFont(ofSize: 16, weight: .bold)
        nameLabel.textColor = Self.textPrimary
        nameLabel.lineBreakMode = .byTruncatingTail

        let demoLabel = UILabel()
        demoLabel.text = "Registered Patient"
        demoLabel.font = .systemFont(ofSize: 12, weight: .medium)
        demoLabel.textColor = Self.textSecondary
        demoLabel.lineBreakMode = .byTruncatingTail

        // Test Container Box (Only test name, second accepted status pill removed)
        let testBox = UIView()
        testBox.backgroundColor = bgColor
        testBox.layer.cornerRadius = 10
        testBox.layer.borderWidth = 1
        testBox.layer.borderColor = borderColor.cgColor
        testBox.translatesAutoresizingMaskIntoConstraints = false

        let testIcon = UILabel()
        testIcon.text = "🧪"
        testIcon.font = .systemFont(ofSize: 12)
        testIcon.translatesAutoresizingMaskIntoConstraints = false
        testBox.addSubview(testIcon)

        let testLabel = UILabel()
        testLabel.text = p.testName
        testLabel.font = .systemFont(ofSize: 12, weight: .bold)
        testLabel.textColor = textColor
        testLabel.lineBreakMode = .byTruncatingTail
        testLabel.translatesAutoresizingMaskIntoConstraints = false
        testBox.addSubview(testLabel)

        if p.testCount > 1 {
            let countBadge = UILabel()
            countBadge.text = " \(p.testCount) Tests "
            countBadge.font = .systemFont(ofSize: 10.5, weight: .bold)
            countBadge.textColor = .white
            countBadge.backgroundColor = UIColor(red: 0.145, green: 0.510, blue: 0.965, alpha: 1) // #2563EB
            countBadge.layer.cornerRadius = 8
            countBadge.layer.masksToBounds = true
            countBadge.translatesAutoresizingMaskIntoConstraints = false
            testBox.addSubview(countBadge)

            NSLayoutConstraint.activate([
                testIcon.leadingAnchor.constraint(equalTo: testBox.leadingAnchor, constant: 10),
                testIcon.centerYAnchor.constraint(equalTo: testBox.centerYAnchor),

                testLabel.topAnchor.constraint(equalTo: testBox.topAnchor, constant: 6),
                testLabel.bottomAnchor.constraint(equalTo: testBox.bottomAnchor, constant: -6),
                testLabel.leadingAnchor.constraint(equalTo: testIcon.trailingAnchor, constant: 6),
                testLabel.trailingAnchor.constraint(lessThanOrEqualTo: countBadge.leadingAnchor, constant: -6),

                countBadge.trailingAnchor.constraint(equalTo: testBox.trailingAnchor, constant: -8),
                countBadge.centerYAnchor.constraint(equalTo: testBox.centerYAnchor),
            ])
        } else {
            NSLayoutConstraint.activate([
                testIcon.leadingAnchor.constraint(equalTo: testBox.leadingAnchor, constant: 10),
                testIcon.centerYAnchor.constraint(equalTo: testBox.centerYAnchor),

                testLabel.topAnchor.constraint(equalTo: testBox.topAnchor, constant: 6),
                testLabel.bottomAnchor.constraint(equalTo: testBox.bottomAnchor, constant: -6),
                testLabel.leadingAnchor.constraint(equalTo: testIcon.trailingAnchor, constant: 6),
                testLabel.trailingAnchor.constraint(lessThanOrEqualTo: testBox.trailingAnchor, constant: -10),
            ])
        }

        // Divider
        let divider = UIView()
        divider.backgroundColor = UIColor(red: 0.945, green: 0.961, blue: 0.980, alpha: 1)
        divider.heightAnchor.constraint(equalToConstant: 1).isActive = true

        // Bottom row: Patient Demographics (Replaces ₹0 Due)
        let personConfig = UIImage.SymbolConfiguration(pointSize: 13, weight: .semibold)
        let personImg = UIImageView(image: UIImage(systemName: "person.fill", withConfiguration: personConfig))
        personImg.tintColor = UIColor(red: 100/255, green: 116/255, blue: 139/255, alpha: 1)
        personImg.contentMode = .scaleAspectFit
        personImg.translatesAutoresizingMaskIntoConstraints = false
        personImg.widthAnchor.constraint(equalToConstant: 14).isActive = true
        personImg.heightAnchor.constraint(equalToConstant: 14).isActive = true

        var demoParts: [String] = []
        if p.age > 0 { demoParts.append("\(p.age) Yrs") }
        if !p.gender.isEmpty {
            let capGender = p.gender.lowercased().capitalized
            demoParts.append(capGender)
        }
        let demoStr = demoParts.isEmpty ? "General Patient" : demoParts.joined(separator: " • ")

        let demoTextLabel = UILabel()
        demoTextLabel.text = demoStr
        demoTextLabel.font = .systemFont(ofSize: 13, weight: .bold)
        demoTextLabel.textColor = UIColor(red: 51/255, green: 65/255, blue: 85/255, alpha: 1)
        demoTextLabel.lineBreakMode = .byTruncatingTail

        let bottomRow = makeHStack([personImg, demoTextLabel, UIView()])
        bottomRow.spacing = 6

        // WhatsApp button
        if p.status != "Pending" && p.status != "Accepted" && !p.phone.isEmpty {
            let waBtn = UIButton(type: .custom)
            waBtn.backgroundColor = UIColor(red: 0.145, green: 0.831, blue: 0.400, alpha: 1)
            waBtn.layer.cornerRadius = 16
            waBtn.widthAnchor.constraint(equalToConstant: 32).isActive  = true
            waBtn.heightAnchor.constraint(equalToConstant: 32).isActive = true
            waBtn.setImage(UIImage(systemName: "phone.fill"), for: .normal)
            waBtn.tintColor = .white
            let phone = p.phone
            let name  = p.name
            waBtn.addAction(UIAction { _ in
                guard let url = URL(string: "https://wa.me/91\(phone)?text=Hello \(name), your diagnostic report is ready.") else { return }
                UIApplication.shared.open(url)
            }, for: .touchUpInside)
            bottomRow.addArrangedSubview(waBtn)
        }

        let chevron = UIImageView(image: UIImage(systemName: "chevron.right"))
        chevron.tintColor = UIColor(red: 0.58, green: 0.64, blue: 0.72, alpha: 1)
        chevron.contentMode = .scaleAspectFit
        chevron.translatesAutoresizingMaskIntoConstraints = false
        chevron.widthAnchor.constraint(equalToConstant: 14).isActive = true
        chevron.heightAnchor.constraint(equalToConstant: 14).isActive = true
        bottomRow.addArrangedSubview(chevron)

        let patientAvatar = PatientAvatarHelper.createAvatar(size: 36)
        let nameDemoStack = UIStackView(arrangedSubviews: [nameLabel, demoLabel])
        nameDemoStack.axis = .vertical
        nameDemoStack.spacing = 1
        nameDemoStack.alignment = .leading

        let patientInfoRow = UIStackView(arrangedSubviews: [patientAvatar, nameDemoStack])
        patientInfoRow.axis = .horizontal
        patientInfoRow.alignment = .center
        patientInfoRow.spacing = 10

        let vStack = UIStackView(arrangedSubviews: [patientTopRow, patientInfoRow, testBox, divider, bottomRow])
        vStack.axis    = .vertical
        vStack.spacing = 6
        vStack.setCustomSpacing(6, after: patientInfoRow)
        vStack.setCustomSpacing(8, after: testBox)
        vStack.setCustomSpacing(6, after: divider)

        card.addSubview(vStack)
        vStack.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            vStack.topAnchor.constraint(equalTo: card.topAnchor, constant: 14),
            vStack.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 14),
            vStack.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -14),
            vStack.bottomAnchor.constraint(equalTo: card.bottomAnchor, constant: -12),
        ])

        let tap = UITapGestureRecognizer(target: self, action: #selector(didTapWorklistCard))
        card.addGestureRecognizer(tap)

        return card
    }

    @objc private func didTapWorklistCard() {
        if let parentVC = self.parentViewController() {
            let patVC = PatientWorklistViewController()
            parentVC.navigationController?.pushViewController(patVC, animated: true)
        }
    }

    // MARK: – Helpers
    private func makeSectionHeader(title: String, actionTitle: String, action: Selector) -> UIView {
        let titleLabel = UILabel()
        titleLabel.text = title
        titleLabel.font = .systemFont(ofSize: 18, weight: .black)
        titleLabel.textColor = Self.textPrimary

        let actionBtn = UIButton(type: .system)
        actionBtn.setTitle(actionTitle, for: .normal)
        actionBtn.titleLabel?.font = .systemFont(ofSize: 13.5, weight: .semibold)
        actionBtn.tintColor = UIColor(red: 0.118, green: 0.533, blue: 0.898, alpha: 1)
        actionBtn.addTarget(self, action: action, for: .touchUpInside)

        return makeHStack([titleLabel, UIView(), actionBtn])
    }

    private func makeHStack(_ views: [UIView]) -> UIStackView {
        let stack = UIStackView(arrangedSubviews: views)
        stack.axis = .horizontal
        stack.alignment = .center
        return stack
    }

    private func makeTinyLabel(_ text: String) -> UILabel {
        let l = UILabel()
        l.text = text
        l.font = .systemFont(ofSize: 11, weight: .medium)
        l.textColor = UIColor(red: 0.580, green: 0.635, blue: 0.737, alpha: 1)
        return l
    }

    private func statusStyle(_ status: String) -> (UIColor, UIColor, UIColor) {
        switch status {
        case "Ready":
            // Green: Report Ready / Finished
            return (UIColor(red: 0.925, green: 0.992, blue: 0.961, alpha: 1),
                    UIColor(red: 0.020, green: 0.588, blue: 0.412, alpha: 1),
                    UIColor(red: 0.655, green: 0.953, blue: 0.816, alpha: 1))
        case "Processing":
            // Blue: Processing / In Testing
            return (UIColor(red: 0.937, green: 0.965, blue: 1.0, alpha: 1),
                    UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1),
                    UIColor(red: 0.749, green: 0.859, blue: 0.996, alpha: 1))
        default:
            // Deep Green: Accepted (High Visibility)
            return (UIColor(red: 209/255, green: 250/255, blue: 229/255, alpha: 1), // #D1FAE5 Soft Mint
                    UIColor(red: 4/255, green: 120/255, blue: 87/255, alpha: 1),     // #047857 Deep Green
                    UIColor(red: 110/255, green: 231/255, blue: 183/255, alpha: 1)) // #6EE7B7 Emerald Border
        }
    }

    // MARK: – Banner carousel
    private func startCarousel() {
        bannerTimer = Timer.scheduledTimer(withTimeInterval: 3.6, repeats: true) { [weak self] _ in
            guard let self = self else { return }
            self.currentBannerIdx = (self.currentBannerIdx + 1) % Self.banners.count
            self.showBanner(self.currentBannerIdx)
        }
    }

    private func showBanner(_ idx: Int) {
        let b = Self.banners[idx]
        UIView.transition(with: bannerTitleLabel, duration: 0.35, options: .transitionCrossDissolve) {
            self.bannerTitleLabel.text = b.title
            self.bannerSubLabel.text   = b.subtitle
            self.bannerCtaBtn.setTitle(b.cta, for: .normal)
        }
        updateBannerDots()
    }

    private func updateBannerDots() {
        for (i, dot) in bannerDots.enumerated() {
            let isActive = i == currentBannerIdx
            dot.backgroundColor = isActive
                ? UIColor(red: 0.118, green: 0.533, blue: 0.898, alpha: 1)
                : UIColor(red: 0.773, green: 0.824, blue: 0.910, alpha: 1)
            if let wConstraint = dot.constraints.first(where: { $0.firstAttribute == .width }) {
                wConstraint.constant = isActive ? 18 : 6
            }
            UIView.animate(withDuration: 0.3) { dot.layoutIfNeeded() }
        }
    }

    // MARK: – Data fetching
    func loadUserInfo() {
        if let savedName = UserDefaults.standard.string(forKey: "user_name"), !savedName.isEmpty {
            self.currentFullName = savedName
            let fn = Self.formatSmartFirstName(savedName)
            self.greetingLabel.text = "Hello, \(fn)"
            self.avatarLabel.text   = String(fn.prefix(1)).uppercased()
            self.triggerWelcomeNotificationIfEligible()
        }

        Task {
            guard let token = getToken() else { return }
            guard let url = URL(string: "https://app.patholab.cloud/api/auth/me") else { return }
            var req = URLRequest(url: url)
            req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            req.setValue("token=\(token)", forHTTPHeaderField: "Cookie")
            if let (data, _) = try? await URLSession.shared.data(for: req),
               let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
                let rawServerName = (json["name"] as? String) ?? ""
                let serverName = (!rawServerName.isEmpty && !rawServerName.contains("@") && rawServerName.lowercased() != "null")
                    ? rawServerName
                    : Self.formatSmartFirstName((json["email"] as? String) ?? "")
                let role = (json["role"] as? String ?? "Lab Owner").replacingOccurrences(of: "_", with: " ")
                self.currentRole = role
                if !serverName.isEmpty {
                    self.currentFullName = serverName
                    let fn = Self.formatSmartFirstName(serverName)
                    UserDefaults.standard.set(serverName, forKey: "user_name")
                    await MainActor.run {
                        self.greetingLabel.text = "Hello, \(fn)"
                        self.avatarLabel.text   = String(fn.prefix(1)).uppercased()
                        self.playWaveAnimation()
                        self.triggerWelcomeNotificationIfEligible()
                    }
                }
                if let lab = json["lab"] as? [String: Any],
                   let wallet = lab["wallet"] as? [String: Any],
                   let bal = wallet["balance"] as? Double {
                    await MainActor.run {
                        let formatted = self.formatINR(bal)
                        self.walletBalanceLabel.text = "Wallet: \(formatted)"
                        self.triggerLowBalanceAlertIfEligible(bal)
                    }
                }
                if let av = json["avatar"] as? String, !av.isEmpty {
                    self.loadAvatar(av)
                }
            }

            // Fetch profile for avatar
            if let pUrl = URL(string: "https://app.patholab.cloud/api/users/profile") {
                var pReq = URLRequest(url: pUrl)
                pReq.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
                pReq.setValue("token=\(token)", forHTTPHeaderField: "Cookie")
                if let (pData, _) = try? await URLSession.shared.data(for: pReq),
                   let pJson = try? JSONSerialization.jsonObject(with: pData) as? [String: Any],
                   let pUser = pJson["user"] as? [String: Any],
                   let pAv = pUser["avatar"] as? String, !pAv.isEmpty {
                    self.loadAvatar(pAv)
                }
            }
        }
    }

    private func showFloatingInAppBanner(
        icon: String,
        iconBgColor: UIColor,
        iconTintColor: UIColor,
        title: String,
        message: String,
        actionTitle: String? = nil,
        action: (() -> Void)? = nil
    ) {
        // Remove existing floating banner
        if let existing = self.viewWithTag(998877) {
            existing.removeFromSuperview()
        }

        let banner = UIView()
        banner.tag = 998877
        banner.backgroundColor = .white
        banner.layer.cornerRadius = 18
        banner.layer.shadowColor = UIColor.black.cgColor
        banner.layer.shadowOpacity = 0.12
        banner.layer.shadowOffset = CGSize(width: 0, height: 4)
        banner.layer.shadowRadius = 12
        banner.layer.borderColor = UIColor(red: 226/255, green: 232/255, blue: 240/255, alpha: 1).cgColor
        banner.layer.borderWidth = 0.5
        banner.translatesAutoresizingMaskIntoConstraints = false

        // Squircle icon
        let iconBox = UIView()
        iconBox.backgroundColor = iconBgColor
        iconBox.layer.cornerRadius = 12
        iconBox.translatesAutoresizingMaskIntoConstraints = false
        banner.addSubview(iconBox)

        let iv = UIImageView()
        iv.image = UIImage(systemName: icon)
        iv.tintColor = iconTintColor
        iv.contentMode = .scaleAspectFit
        iv.translatesAutoresizingMaskIntoConstraints = false
        iconBox.addSubview(iv)

        // Text Stack
        let titleLabel = UILabel()
        titleLabel.text = title
        titleLabel.font = .systemFont(ofSize: 13.5, weight: .bold)
        titleLabel.textColor = UIColor(red: 15/255, green: 23/255, blue: 42/255, alpha: 1)
        titleLabel.translatesAutoresizingMaskIntoConstraints = false

        let msgLabel = UILabel()
        msgLabel.text = message
        msgLabel.font = .systemFont(ofSize: 11.5, weight: .medium)
        msgLabel.textColor = UIColor(red: 71/255, green: 85/255, blue: 105/255, alpha: 1)
        msgLabel.numberOfLines = 2
        msgLabel.translatesAutoresizingMaskIntoConstraints = false

        let textStack = UIStackView(arrangedSubviews: [titleLabel, msgLabel])
        textStack.axis = .vertical
        textStack.spacing = 2
        textStack.translatesAutoresizingMaskIntoConstraints = false
        banner.addSubview(textStack)

        NSLayoutConstraint.activate([
            iconBox.leadingAnchor.constraint(equalTo: banner.leadingAnchor, constant: 12),
            iconBox.centerYAnchor.constraint(equalTo: banner.centerYAnchor),
            iconBox.widthAnchor.constraint(equalToConstant: 38),
            iconBox.heightAnchor.constraint(equalToConstant: 38),

            iv.centerXAnchor.constraint(equalTo: iconBox.centerXAnchor),
            iv.centerYAnchor.constraint(equalTo: iconBox.centerYAnchor),
            iv.widthAnchor.constraint(equalToConstant: 20),
            iv.heightAnchor.constraint(equalToConstant: 20),

            textStack.leadingAnchor.constraint(equalTo: iconBox.trailingAnchor, constant: 10),
            textStack.topAnchor.constraint(equalTo: banner.topAnchor, constant: 12),
            textStack.bottomAnchor.constraint(equalTo: banner.bottomAnchor, constant: -12),
        ])

        if let actionTitle = actionTitle, !actionTitle.isEmpty {
            let actBtn = UIButton(type: .system)
            actBtn.setTitle(actionTitle, for: .normal)
            actBtn.titleLabel?.font = .systemFont(ofSize: 11.5, weight: .bold)
            actBtn.setTitleColor(.white, for: .normal)
            actBtn.backgroundColor = UIColor(red: 225/255, green: 29/255, blue: 72/255, alpha: 1)
            actBtn.layer.cornerRadius = 10
            actBtn.contentEdgeInsets = UIEdgeInsets(top: 6, left: 10, bottom: 6, right: 10)
            actBtn.translatesAutoresizingMaskIntoConstraints = false
            banner.addSubview(actBtn)

            NSLayoutConstraint.activate([
                actBtn.leadingAnchor.constraint(equalTo: textStack.trailingAnchor, constant: 8),
                actBtn.trailingAnchor.constraint(equalTo: banner.trailingAnchor, constant: -12),
                actBtn.centerYAnchor.constraint(equalTo: banner.centerYAnchor)
            ])
            actBtn.addAction(UIAction { [weak banner] _ in
                action?()
                UIView.animate(withDuration: 0.3, animations: {
                    banner?.transform = CGAffineTransform(translationX: 0, y: -120)
                    banner?.alpha = 0
                }) { _ in banner?.removeFromSuperview() }
            }, for: .touchUpInside)
        } else {
            let closeBtn = UIButton(type: .system)
            closeBtn.setImage(UIImage(systemName: "xmark"), for: .normal)
            closeBtn.tintColor = UIColor(red: 148/255, green: 163/255, blue: 184/255, alpha: 1)
            closeBtn.translatesAutoresizingMaskIntoConstraints = false
            banner.addSubview(closeBtn)

            NSLayoutConstraint.activate([
                closeBtn.leadingAnchor.constraint(equalTo: textStack.trailingAnchor, constant: 6),
                closeBtn.trailingAnchor.constraint(equalTo: banner.trailingAnchor, constant: -12),
                closeBtn.centerYAnchor.constraint(equalTo: banner.centerYAnchor),
                closeBtn.widthAnchor.constraint(equalToConstant: 24),
                closeBtn.heightAnchor.constraint(equalToConstant: 24)
            ])
            closeBtn.addAction(UIAction { [weak banner] _ in
                UIView.animate(withDuration: 0.3, animations: {
                    banner?.transform = CGAffineTransform(translationX: 0, y: -120)
                    banner?.alpha = 0
                }) { _ in banner?.removeFromSuperview() }
            }, for: .touchUpInside)
        }

        let tap = UITapGestureRecognizer()
        banner.addGestureRecognizer(tap)
        tap.addAction(UIAction { [weak banner] _ in
            action?()
            UIView.animate(withDuration: 0.3, animations: {
                banner?.transform = CGAffineTransform(translationX: 0, y: -120)
                banner?.alpha = 0
            }) { _ in banner?.removeFromSuperview() }
        })

        addSubview(banner)
        NSLayoutConstraint.activate([
            banner.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 14),
            banner.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -14),
            banner.topAnchor.constraint(equalTo: safeAreaLayoutGuide.topAnchor, constant: 8)
        ])

        banner.transform = CGAffineTransform(translationX: 0, y: -120)
        banner.alpha = 0

        UIView.animate(withDuration: 0.5, delay: 0.1, usingSpringWithDamping: 0.78, initialSpringVelocity: 0.6, options: .curveEaseOut, animations: {
            banner.transform = .identity
            banner.alpha = 1
        })

        // Auto dismiss after 4.5s
        DispatchQueue.main.asyncAfter(deadline: .now() + 4.5) { [weak banner] in
            guard let banner = banner, banner.superview != nil else { return }
            UIView.animate(withDuration: 0.35, animations: {
                banner.transform = CGAffineTransform(translationX: 0, y: -120)
                banner.alpha = 0
            }) { _ in banner.removeFromSuperview() }
        }
    }

    private func triggerWelcomeNotificationIfEligible() {
        let userEmail = UserDefaults.standard.string(forKey: "user_email") ?? currentFullName
        var nameToUse = currentFullName
        if nameToUse.isEmpty || nameToUse.lowercased() == "user" || nameToUse.contains("@") {
            if let savedName = UserDefaults.standard.string(forKey: "user_name"), !savedName.isEmpty, savedName.lowercased() != "user", !savedName.contains("@") {
                nameToUse = savedName
            }
        }
        let cleanName = Self.formatSmartFirstName(nameToUse)
        MobileNotificationHelper.shared.scheduleWelcomeNotification(userName: cleanName, userId: userEmail)
    }

    private func triggerLowBalanceAlertIfEligible(_ balance: Double) {
        // In-app low balance popups removed per user specification.
        // Low balance notification will only fire when wallet balance is 0 and user attempts patient registration.
        if balance <= 50 {
            bellDot.isHidden = false
        }
    }

    // MARK: – Connection Status & Continuous Wave Animation
    private func setupNetworkMonitor() {
        pathMonitor.pathUpdateHandler = { [weak self] path in
            guard let self = self else { return }
            DispatchQueue.main.async {
                if path.status == .satisfied {
                    self.pendingOfflineWorkItem?.cancel()
                    self.pendingOfflineWorkItem = nil

                    if self.currentConnectionState != .online {
                        self.setConnectionState(.connecting)
                        DispatchQueue.main.asyncAfter(deadline: .now() + 1.2) {
                            if self.pathMonitor.currentPath.status == .satisfied {
                                self.setConnectionState(.online)
                            }
                        }
                    } else {
                        self.setConnectionState(.online)
                    }
                } else {
                    // Connection lost: keep wave visible, switch immediately to Yellow while checking for 2-4 seconds
                    self.pendingOfflineWorkItem?.cancel()
                    self.setConnectionState(.connecting)

                    let workItem = DispatchWorkItem { [weak self] in
                        guard let self = self else { return }
                        if self.pathMonitor.currentPath.status == .satisfied {
                            self.setConnectionState(.online)
                        } else {
                            self.verifyInternetReachability { isReachable in
                                DispatchQueue.main.async {
                                    self.setConnectionState(isReachable ? .online : .offline)
                                }
                            }
                        }
                    }
                    self.pendingOfflineWorkItem = workItem
                    DispatchQueue.main.asyncAfter(deadline: .now() + 3.0, execute: workItem)
                }
            }
        }
        pathMonitor.start(queue: monitorQueue)
    }

    private func verifyInternetReachability(completion: @escaping (Bool) -> Void) {
        guard let url = URL(string: "https://clients3.google.com/generate_204") else {
            completion(false)
            return
        }
        var req = URLRequest(url: url)
        req.timeoutInterval = 1.5
        req.httpMethod = "HEAD"
        let task = URLSession.shared.dataTask(with: req) { _, response, _ in
            if let http = response as? HTTPURLResponse, http.statusCode == 204 || http.statusCode == 200 {
                completion(true)
            } else {
                completion(false)
            }
        }
        task.resume()
    }

    func setConnectionState(_ state: ConnectionState) {
        currentConnectionState = state
        let dotColor: UIColor
        let waveColor: UIColor

        switch state {
        case .online:
            dotColor  = UIColor(red: 16/255, green: 185/255, blue: 129/255, alpha: 1.0)
            waveColor = UIColor(red: 16/255, green: 185/255, blue: 129/255, alpha: 0.70)
        case .connecting:
            dotColor  = UIColor(red: 245/255, green: 158/255, blue: 11/255, alpha: 1.0)
            waveColor = UIColor(red: 245/255, green: 158/255, blue: 11/255, alpha: 0.70)
        case .offline:
            dotColor  = UIColor(red: 239/255, green: 68/255, blue: 68/255, alpha: 1.0)
            waveColor = UIColor(red: 239/255, green: 68/255, blue: 68/255, alpha: 0.70)
        }

        UIView.animate(withDuration: 0.3) {
            self.statusDotView.backgroundColor = dotColor
            self.statusWaveView.backgroundColor = waveColor
        }
        ensureStatusWaveAnimation()
    }

    private func ensureStatusWaveAnimation() {
        statusWaveView.isHidden = false
        if statusWaveView.layer.animation(forKey: "smoothWave") != nil {
            return // Continuously playing, uninterrupted
        }
        let scaleAnim = CABasicAnimation(keyPath: "transform.scale")
        scaleAnim.fromValue = 1.0
        scaleAnim.toValue = 2.4
        scaleAnim.timingFunction = CAMediaTimingFunction(name: .easeOut)

        let opacityAnim = CABasicAnimation(keyPath: "opacity")
        opacityAnim.fromValue = 0.75
        opacityAnim.toValue = 0.0
        opacityAnim.timingFunction = CAMediaTimingFunction(name: .easeOut)

        let group = CAAnimationGroup()
        group.animations = [scaleAnim, opacityAnim]
        group.duration = 1.6
        group.repeatCount = .infinity
        group.isRemovedOnCompletion = false
        statusWaveView.layer.add(group, forKey: "smoothWave")
    }

    @objc private func appWillEnterForeground() {
        ensureStatusWaveAnimation()
    }

    func getDefaultAvatarImage() -> UIImage? {
        let saved = UserDefaults.standard.string(forKey: "user_avatar_gender") ?? ""
        if saved.lowercased() == "girl" || saved.lowercased() == "female" {
            if let img = UIImage(named: "avatar_girl") ?? UIImage(contentsOfFile: Bundle.main.path(forResource: "avatar_girl", ofType: "png") ?? "") {
                return img
            }
        } else if saved.lowercased() == "boy" || saved.lowercased() == "male" {
            if let img = UIImage(named: "avatar_boy") ?? UIImage(contentsOfFile: Bundle.main.path(forResource: "avatar_boy", ofType: "png") ?? "") {
                return img
            }
        }
        if Self.isFemaleUser(greetingLabel.text ?? "") {
            return UIImage(named: "avatar_girl") ?? UIImage(contentsOfFile: Bundle.main.path(forResource: "avatar_girl", ofType: "png") ?? "")
        }
        return UIImage(named: "avatar_boy") ?? UIImage(contentsOfFile: Bundle.main.path(forResource: "avatar_boy", ofType: "png") ?? "")
    }

    static func isFemaleUser(_ name: String) -> Bool {
        let n = name.lowercased().trimmingCharacters(in: .whitespacesAndNewlines)
        if n.hasPrefix("mrs") || n.hasPrefix("ms.") || n.hasPrefix("miss ") || n.contains("madam") || n.contains("lady") {
            return true
        }
        let keywords = [
            "female", "girl", "woman", "priya", "pooja", "ananya", "sneha", "fatima", "aisha",
            "anjali", "kavita", "sunita", "neha", "divya", "swati", "shreya", "tanvi",
            "meera", "rupa", "rashmi", "jyoti", "rekha", "sita", "geeta", "moni", "rita",
            "rani", "madhu", "alina", "sarah", "emma", "olivia", "sophia", "mia", "isabella",
            "amrita", "diya", "ishita", "sakshi", "payal", "riddhi", "siddhi", "nikita"
        ]
        for kw in keywords {
            if n.contains(kw) { return true }
        }
        return false
    }

    private func loadAvatar(_ raw: String) {
        if raw.isEmpty || raw == "null" {
            DispatchQueue.main.async {
                self.avatarImageView.image = self.getDefaultAvatarImage()
                self.avatarImageView.isHidden = false
                self.avatarLabel.isHidden = true
            }
            return
        }
        Task {
            var image: UIImage? = nil
            if raw.starts(with: "data:image"), let comma = raw.firstIndex(of: ",") {
                let base64 = String(raw[raw.index(after: comma)...])
                if let data = Data(base64Encoded: base64) {
                    image = UIImage(data: data)
                }
            } else if let url = URL(string: raw), let (data, _) = try? await URLSession.shared.data(from: url) {
                image = UIImage(data: data)
            }
            let finalImg = image ?? self.getDefaultAvatarImage()
            await MainActor.run {
                self.avatarImageView.image = finalImg
                self.avatarImageView.isHidden = false
                self.avatarLabel.isHidden = true
            }
        }
    }

    func playWaveAnimation() {
        waveLabel.layer.anchorPoint = CGPoint(x: 0.75, y: 0.90)
        let anim = CAKeyframeAnimation(keyPath: "transform.rotation")
        anim.values = [0, 0.45, -0.30, 0.42, -0.22, 0.32, -0.12, 0.18, 0]
        anim.keyTimes = [0, 0.12, 0.25, 0.38, 0.50, 0.64, 0.76, 0.88, 1.0]
        anim.duration = 1.2
        anim.timingFunction = CAMediaTimingFunction(name: .easeInEaseOut)
        waveLabel.layer.add(anim, forKey: "waveHand")
    }

    static func formatSmartFirstName(_ raw: String) -> String {
        var str = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        if str.isEmpty { return "Doctor" }

        // 1. Remove email domain if present
        if let atIdx = str.firstIndex(of: "@") {
            str = String(str[..<atIdx])
        }

        // 2. Strip common domain extensions & service mentions
        let domainPatterns = ["\\.com", "\\.in", "\\.org", "\\.net", "\\.co", "\\.io", "\\.gov", "\\.edu"]
        for pat in domainPatterns {
            str = str.replacingOccurrences(of: pat, with: "", options: .regularExpression)
        }
        str = str.replacingOccurrences(of: "(?i)[._\\-](gmail|yahoo|hotmail|outlook|icloud|mail|email)\\b", with: "", options: .regularExpression)
        str = str.replacingOccurrences(of: "(?i)\\b(gmail|yahoo|hotmail|outlook|icloud|mail|email)[._\\-]", with: "", options: .regularExpression)

        // If string ends with "gmail" without separator (e.g. monowargmail), strip it
        if str.lowercased().hasSuffix("gmail") && str.count > 5 {
            str = String(str.dropLast(5))
        }

        // 3. Split on separators, skipping title prefixes like Dr, Mr
        let tokens = str.components(separatedBy: CharacterSet(charactersIn: " ._-"))
        if let firstToken = tokens.first, !firstToken.isEmpty {
            let lowerToken = firstToken.lowercased()
            if ["dr", "doc", "doctor", "mr", "mrs", "ms"].contains(lowerToken) && tokens.count > 1 && !tokens[1].isEmpty {
                str = tokens[1]
            } else {
                str = firstToken
            }
        }

        // 4. Handle CamelCase
        var result = ""
        for char in str {
            if char.isUppercase && !result.isEmpty {
                break
            }
            result.append(char)
        }
        if !result.isEmpty { str = result }

        // 5. Filter letters only
        str = str.filter { $0.isLetter }

        // Strict blacklist check: fallback to "Doctor"
        let lower = str.lowercased()
        let blacklist = [
            "user", "admin", "gmail", "email", "mail", "workmail", "testmail",
            "doctor", "doc", "dr", "owner", "labowner", "patholab",
            "info", "support", "contact", "test", "demo", "default",
            "workspace", "account", "login", "null", "undefined"
        ]
        if str.isEmpty || str.count < 2 || blacklist.contains(lower) {
            return "Doctor"
        }

        // 6. Capitalize first letter, lowercase rest
        str = str.prefix(1).uppercased() + str.dropFirst().lowercased()

        // 7. Known prefixes
        let prefixes = ["monowar", "manohar", "mohammad", "anupam", "shahid", "abhishek", "rahul", "amit", "priya", "rohit", "vikram", "rajesh", "suresh", "deepak", "sanjay"]
        for p in prefixes {
            if lower.hasPrefix(p) && lower.count > p.count + 2 {
                return p.prefix(1).uppercased() + p.dropFirst().lowercased()
            }
        }

        // 8. Cap at 7 characters if still longer than 8
        if str.count > 8 {
            str = String(str.prefix(7))
        }

        // Final safety check: never return any string containing "gmail"
        if str.lowercased().contains("gmail") || str.count < 2 {
            return "Doctor"
        }

        return str
    }

    /**
     * Sanitizes strings destined for notification dialogs or popups, replacing any email addresses with clean smart first names.
     */
    static func stripEmailFromString(_ text: String) -> String {
        guard !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return "" }
        var result = text
        let emailRegex = "[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}"
        if let regex = try? NSRegularExpression(pattern: emailRegex) {
            let nsString = result as NSString
            let matches = regex.matches(in: result, range: NSRange(location: 0, length: nsString.length))
            for match in matches.reversed() {
                let email = nsString.substring(with: match.range)
                let name = formatSmartFirstName(email)
                result = (result as NSString).replacingCharacters(in: match.range, with: name)
            }
        }
        result = result.replacingOccurrences(of: "(?i)@[a-zA-Z0-9.-]+", with: "", options: .regularExpression)
        result = result.replacingOccurrences(of: "(?i)\\b(gmail|yahoo|hotmail|outlook|icloud)(\\.com|\\.in|\\.org)?\\b", with: "", options: .regularExpression)
        result = result.replacingOccurrences(of: ",\\s*\\.", with: ".", options: .regularExpression)
        result = result.replacingOccurrences(of: ",\\s*,", with: ",", options: .regularExpression)
        result = result.replacingOccurrences(of: "\\s{2,}", with: " ", options: .regularExpression)
        return result.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    func fetchWalletBalance() {
        Task {
            guard let token = getToken() else { return }
            guard let url = URL(string: "https://app.patholab.cloud/api/workspace/wallet/details") else { return }
            var req = URLRequest(url: url)
            req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            if let (data, _) = try? await URLSession.shared.data(for: req),
               let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
                let wallet = json["wallet"] as? [String: Any] ?? json
                let balance = wallet["balance"] as? Double ?? 0
                await MainActor.run {
                    let formatted = self.formatINR(balance)
                    self.walletBalanceLabel.text = "Wallet: \(formatted)"
                    self.triggerLowBalanceAlertIfEligible(balance)
                }
            }
        }
    }

    func fetchTodaysWorklist() {
        Task {
            guard let token = getToken() else {
                await MainActor.run { self.hideWorklistSection() }
                return
            }

            // 1. Primary: /api/workspace/patients?limit=10 (Contains full demographics: age, gender, tests)
            if let pUrl = URL(string: "https://app.patholab.cloud/api/workspace/patients?limit=10") {
                var pReq = URLRequest(url: pUrl)
                pReq.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
                pReq.setValue("token=\(token)", forHTTPHeaderField: "Cookie")
                if let (data, resp) = try? await URLSession.shared.data(for: pReq),
                   let http = resp as? HTTPURLResponse, http.statusCode == 200,
                   let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
                    let patients = (json["data"] as? [[String: Any]]) ?? (json["patients"] as? [[String: Any]]) ?? []
                    if !patients.isEmpty {
                        self.detectAndNotifyNewPatientsFromWeb(patients)
                        let cards = patients.compactMap { self.parsePatient($0) }
                        if !cards.isEmpty {
                            await MainActor.run {
                                self.worklistSection.isHidden = false
                                self.worklistCountBadge.text = " \(cards.count) \(cards.count == 1 ? "Patient" : "Patients") "
                                self.populateWorklist(cards)
                            }
                            return
                        }
                    }
                }
            }

            // 2. Fallback: /api/labs/dashboard?range=TODAY
            guard let url = URL(string: "https://app.patholab.cloud/api/labs/dashboard?range=TODAY") else { return }
            var req = URLRequest(url: url)
            req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            req.setValue("token=\(token)", forHTTPHeaderField: "Cookie")
            if let (data, _) = try? await URLSession.shared.data(for: req),
               let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
               let patients = json["recentPatients"] as? [[String: Any]], !patients.isEmpty {
                self.detectAndNotifyNewPatientsFromWeb(patients)
                let cards = patients.compactMap { self.parsePatient($0) }
                await MainActor.run {
                    if cards.isEmpty {
                        self.hideWorklistSection()
                    } else {
                        self.worklistSection.isHidden = false
                        self.worklistCountBadge.text = " \(cards.count) \(cards.count == 1 ? "Patient" : "Patients") "
                        self.populateWorklist(cards)
                    }
                }
            } else {
                await MainActor.run { self.hideWorklistSection() }
            }
        }
    }

    private func detectAndNotifyNewPatientsFromWeb(_ patients: [[String: Any]]) {
        guard !patients.isEmpty else { return }
        let userEmail = UserDefaults.standard.string(forKey: "user_email") ?? "default_user"
        let syncDoneKey = "initial_sync_done_\(userEmail)"
        let knownKey = "known_patient_ids_\(userEmail)"

        var knownIds = Set(UserDefaults.standard.stringArray(forKey: knownKey) ?? [])
        let isInitialSyncDone = UserDefaults.standard.bool(forKey: syncDoneKey)

        if !isInitialSyncDone {
            for p in patients {
                let pid = (p["id"] as? String) ?? (p["patientId"] as? String) ?? ""
                if !pid.isEmpty { knownIds.insert(pid) }
            }
            UserDefaults.standard.set(true, forKey: syncDoneKey)
            UserDefaults.standard.set(Array(knownIds), forKey: knownKey)
            return
        }

        var hasNew = false
        for p in patients {
            let pid = (p["id"] as? String) ?? (p["patientId"] as? String) ?? ""
            guard !pid.isEmpty else { continue }

            if !knownIds.contains(pid) {
                knownIds.insert(pid)
                hasNew = true
                let pName = (p["name"] as? String) ?? "New Patient"
                let pUhid = (p["patientId"] as? String) ?? (p["code"] as? String) ?? ""
                MobileNotificationHelper.shared.postNewPatientNotification(patientName: pName, uhid: pUhid)
            }
        }

        if hasNew {
            UserDefaults.standard.set(Array(knownIds), forKey: knownKey)
        }
    }

    private func hideWorklistSection() {
        worklistSection.isHidden = true
        worklistStack.arrangedSubviews.forEach { $0.removeFromSuperview() }
    }

    private func parsePatient(_ p: [String: Any]) -> HomePatient? {
        guard let name = p["name"] as? String else { return nil }
        let id        = p["id"] as? String ?? ""
        let phone     = p["phone"] as? String ?? ""
        let patientId = (p["patientId"] as? String) ?? (p["code"] as? String) ?? "PAT"
        let age       = (p["age"] as? Int) ?? Int(p["age"] as? String ?? "") ?? ((p["patient"] as? [String: Any])?["age"] as? Int ?? 0)
        let gender    = (p["gender"] as? String) ?? ((p["patient"] as? [String: Any])?["gender"] as? String ?? "")
        let tests     = p["tests"] as? [[String: Any]] ?? []
        let invs      = p["invoices"] as? [[String: Any]] ?? []
        let testName  = tests.first?["testName"] as? String ?? tests.first?["name"] as? String ?? "Routine Diagnostics"
        let rawStatus = (tests.first?["status"] as? String ?? "PENDING").uppercased()
        let status: String
        switch rawStatus {
        case "COMPLETED", "APPROVED", "READY":
            status = "Ready"
        case "IN_PROGRESS", "TESTING", "COLLECTED":
            status = "Processing"
        default:
            status = "Accepted"
        }
        let total      = invs.first?["grandTotal"] as? Double ?? (invs.first?["totalAmount"] as? Double ?? 0)
        let paidAmount = invs.first?["paidAmount"] as? Double ?? 0
        let paid       = (invs.first?["paymentStatus"] as? String ?? "").uppercased() == "PAID" || (total > 0 && paidAmount >= total)
        let testCount  = max(1, tests.count)
        return HomePatient(id: id, name: name, phone: phone, patientId: patientId,
                           age: age, gender: gender, testName: testName, testCount: testCount,
                           status: status, total: total, paidAmount: paidAmount, paid: paid)
    }

    private func startWalletPolling() {
        walletPollTimer = Timer.scheduledTimer(withTimeInterval: 15, repeats: true) { [weak self] _ in
            self?.fetchWalletBalance()
            self?.fetchTodaysWorklist()
        }
    }

    // MARK: – Token retrieval
    private func getToken() -> String? {
        if let token = KeychainManager.read(forKey: KeychainManager.tokenKey), !token.isEmpty { return token }
        return UserDefaults.standard.string(forKey: "auth_token")
    }

    // MARK: – Formatting
    private func formatINR(_ amount: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .decimal
        formatter.minimumFractionDigits = 2
        formatter.maximumFractionDigits = 2
        let s = formatter.string(from: NSNumber(value: amount)) ?? "0.00"
        return "₹ \(s)"
    }

    // MARK: – Bell Periodic Animation (Every 4s)
    private func startBellPeriodicAnimation() {
        bellLoopTimer = Timer.scheduledTimer(withTimeInterval: 4.0, repeats: true) { [weak self] _ in
            self?.triggerBellWiggle()
        }
        triggerBellWiggle()
    }

    private func triggerBellWiggle() {
        let anim = CAKeyframeAnimation(keyPath: "transform.rotation")
        anim.values = [0, 0.28, -0.28, 0.20, -0.20, 0.10, -0.10, 0]
        anim.keyTimes = [0, 0.15, 0.30, 0.45, 0.60, 0.75, 0.90, 1.0]
        anim.duration = 1.0
        bellButton.layer.add(anim, forKey: "bellRing")
    }

    // MARK: – Avatar Actions
    @objc private func avatarTapped() {
        guard let parentVC = self.findViewController() else { return }
        let alert = UIAlertController(title: currentFullName, message: currentRole, preferredStyle: .actionSheet)
        alert.addAction(UIAlertAction(title: "Profile Settings", style: .default, handler: { [weak self] _ in
            self?.onNavigate?("/workspace/settings")
        }))
        alert.addAction(UIAlertAction(title: "Sign Out", style: .destructive, handler: { [weak self] _ in
            self?.performSignOut()
        }))
        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel, handler: nil))

        if let popover = alert.popoverPresentationController {
            popover.sourceView = avatarContainer
            popover.sourceRect = avatarContainer.bounds
        }
        parentVC.present(alert, animated: true, completion: nil)
    }

    private func performSignOut() {
        KeychainManager.clearAll()
        UserDefaults.standard.removeObject(forKey: "auth_token")
        UserDefaults.standard.removeObject(forKey: "user_name")
        onSignOut?()
    }

    private func findViewController() -> UIViewController? {
        var responder: UIResponder? = self
        while let r = responder {
            if let vc = r as? UIViewController { return vc }
            responder = r.next
        }
        return nil
    }

    @objc private func walletPillTapped() { onNavigate?("/workspace/wallet") }
    @objc private func helpTapped() {
        guard let parentVC = self.findViewController() else { return }
        let supportVC = SupportAssistanceViewController()
        parentVC.present(supportVC, animated: true, completion: nil)
    }
    @objc private func bellTapped() {
        bellDot.isHidden = true
        guard let parentVC = self.findViewController() else {
            onNavigate?("/workspace/reports")
            return
        }
        let notifVC = NotificationsViewController()
        notifVC.onAllRead = { [weak self] in
            self?.bellDot.isHidden = true
        }
        if #available(iOS 15.0, *) {
            if let sheet = notifVC.sheetPresentationController {
                sheet.detents = [.medium(), .large()]
                sheet.prefersGrabberVisible = true
                sheet.preferredCornerRadius = 28
            }
        }
        parentVC.present(notifVC, animated: true, completion: nil)
    }
    @objc private func seeAllTapped() {
        guard let parentVC = self.findViewController() else {
            onNavigate?("/workspace/all-modules")
            return
        }
        let sheetVC = AllModulesSheetViewController()
        sheetVC.onNavigate = { [weak self] path in
            self?.onNavigate?(path)
        }
        if #available(iOS 15.0, *) {
            if let sheet = sheetVC.sheetPresentationController {
                sheet.detents = [.medium(), .large()]
                sheet.prefersGrabberVisible = false
                sheet.preferredCornerRadius = 28
            }
        }
        parentVC.present(sheetVC, animated: true, completion: nil)
    }
    @objc private func viewAllTapped()    { onNavigate?("/workspace/patients") }
    @objc private func bannerCtaTapped()  { onNavigate?(Self.banners[currentBannerIdx].path) }
    @objc private func moduleTapped(_ gr: UITapGestureRecognizer) {
        guard let path = gr.view?.accessibilityIdentifier else { return }
        if (path == "/workspace/registration" || path == "/workspace/patients/new"), let parentVC = self.findViewController() {
            let regVC = RegistrationViewController()
            regVC.modalPresentationStyle = .fullScreen
            parentVC.present(regVC, animated: true, completion: nil)
            return
        }
        if (path == "/workspace/wallet" || path.starts(with: "/workspace/wallet")), let parentVC = self.findViewController() {
            let walletVC = WalletViewController()
            walletVC.modalPresentationStyle = .fullScreen
            parentVC.present(walletVC, animated: true, completion: nil)
            return
        }
        if path == "/workspace/test-management", let parentVC = self.findViewController() {
            let testVC = TestManagementViewController()
            testVC.modalPresentationStyle = .fullScreen
            parentVC.present(testVC, animated: true, completion: nil)
            return
        }
        if path == "/workspace/billing", let parentVC = self.findViewController() {
            let billVC = BillingViewController()
            billVC.modalPresentationStyle = .fullScreen
            parentVC.present(billVC, animated: true, completion: nil)
            return
        }
        if path == "/workspace/reports", let parentVC = self.findViewController() {
            let repVC = ReportsViewController()
            repVC.modalPresentationStyle = .fullScreen
            parentVC.present(repVC, animated: true, completion: nil)
            return
        }
        if (path == "/workspace/samples" || path == "/workspace/accession"), let parentVC = self.findViewController() {
            let smpVC = SamplesViewController()
            smpVC.modalPresentationStyle = .fullScreen
            parentVC.present(smpVC, animated: true, completion: nil)
            return
        }
        if (path == "/workspace/patients" || path == "/workspace/results"), let parentVC = self.findViewController() {
            let patVC = PatientWorklistViewController()
            patVC.modalPresentationStyle = .fullScreen
            parentVC.present(patVC, animated: true, completion: nil)
            return
        }
        if (path == "/workspace/staff" || path.starts(with: "/workspace/staff")), let parentVC = self.findViewController() {
            let staffVC = StaffManagementViewController()
            staffVC.modalPresentationStyle = .fullScreen
            parentVC.present(staffVC, animated: true, completion: nil)
            return
        }
        if (path == "/workspace/dashboard" || path == "/dashboard" || path == "/workspace" || path == "/home" || path == "/"), let parentVC = self.findViewController() {
            let dashVC = LabDashboardViewController()
            dashVC.modalPresentationStyle = .fullScreen
            parentVC.present(dashVC, animated: true, completion: nil)
            return
        }
        if (path == "/workspace/analytics" || path == "/analytics"), let parentVC = self.findViewController() {
            let analyticsVC = DashboardViewController()
            analyticsVC.modalPresentationStyle = .fullScreen
            parentVC.present(analyticsVC, animated: true, completion: nil)
            return
        }
        if (path == "/workspace/support" || path.starts(with: "/workspace/support")), let parentVC = self.findViewController() {
            let supportVC = SupportViewController()
            supportVC.modalPresentationStyle = .fullScreen
            parentVC.present(supportVC, animated: true, completion: nil)
            return
        }
        onNavigate?(path)
    }

    // MARK: – Cleanup
    deinit {
        NotificationCenter.default.removeObserver(self)
        bannerTimer?.invalidate()
        walletPollTimer?.invalidate()
        bellLoopTimer?.invalidate()
        pathMonitor.cancel()
        pendingOfflineWorkItem?.cancel()
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// MARK: – FolderModuleCardView (Custom Stepped Tab Geometry)
// ─────────────────────────────────────────────────────────────────────────────
class FolderModuleCardView: UIView {
    var cornerRadius: CGFloat = 22
    var tabHeight: CGFloat = 40
    var tabWidth: CGFloat = 106
    var filletRadius: CGFloat = 16

    private let shapeLayer = CAShapeLayer()
    private let borderLayer = CAShapeLayer()

    override init(frame: CGRect) {
        super.init(frame: frame)
        setupLayers()
    }

    required init?(coder: NSCoder) {
        super.init(coder: coder)
        setupLayers()
    }

    private func setupLayers() {
        backgroundColor = .clear

        shapeLayer.fillColor = UIColor.white.cgColor
        shapeLayer.shadowColor = UIColor(red: 15/255, green: 23/255, blue: 42/255, alpha: 1).cgColor
        shapeLayer.shadowOpacity = 0.05
        shapeLayer.shadowRadius = 8
        shapeLayer.shadowOffset = CGSize(width: 0, height: 2)
        layer.insertSublayer(shapeLayer, at: 0)

        borderLayer.fillColor = UIColor.clear.cgColor
        borderLayer.strokeColor = UIColor(red: 226/255, green: 232/255, blue: 240/255, alpha: 1).cgColor // #E2E8F0
        borderLayer.lineWidth = 1.2
        layer.insertSublayer(borderLayer, above: shapeLayer)
    }

    override func layoutSubviews() {
        super.layoutSubviews()
        let path = createFolderPath(in: bounds)
        shapeLayer.path = path.cgPath
        borderLayer.path = path.cgPath
        shapeLayer.shadowPath = path.cgPath
    }

    private func createFolderPath(in rect: CGRect) -> UIBezierPath {
        let w = rect.width
        let h = rect.height
        let r = cornerRadius
        let th = tabHeight
        let tw = tabWidth
        let f = filletRadius

        let path = UIBezierPath()
        let sCurveStartX = max(r, w - tw - 2 * f)

        // 1. Start on the left vertical edge below top-left corner
        path.move(to: CGPoint(x: 0, y: th + r))

        // 2. Top-left corner arc
        path.addArc(withCenter: CGPoint(x: r, y: th + r), radius: r, startAngle: .pi, endAngle: 3 * .pi / 2, clockwise: true)

        // 3. Top horizontal edge (left side under title)
        path.addLine(to: CGPoint(x: sCurveStartX, y: th))

        // 4. Smooth S-curve transition upward into the raised top-right tab
        // Concave curve turning up (from horizontal th to vertical)
        path.addArc(withCenter: CGPoint(x: sCurveStartX, y: th - f), radius: f, startAngle: .pi / 2, endAngle: 0, clockwise: false)

        // Convex curve turning right (from vertical to horizontal y = 0)
        path.addArc(withCenter: CGPoint(x: sCurveStartX + 2 * f, y: f), radius: f, startAngle: .pi, endAngle: 3 * .pi / 2, clockwise: true)

        // 5. Top horizontal edge of tab
        path.addLine(to: CGPoint(x: w - r, y: 0))

        // 6. Top-right corner of tab
        path.addArc(withCenter: CGPoint(x: w - r, y: r), radius: r, startAngle: 3 * .pi / 2, endAngle: 0, clockwise: true)

        // 7. Right vertical edge
        path.addLine(to: CGPoint(x: w, y: h - r))

        // 8. Bottom-right corner
        path.addArc(withCenter: CGPoint(x: w - r, y: h - r), radius: r, startAngle: 0, endAngle: .pi / 2, clockwise: true)

        // 9. Bottom horizontal edge
        path.addLine(to: CGPoint(x: r, y: h))

        // 10. Bottom-left corner
        path.addArc(withCenter: CGPoint(x: r, y: h - r), radius: r, startAngle: .pi / 2, endAngle: .pi, clockwise: true)

        // 11. Left vertical edge
        path.addLine(to: CGPoint(x: 0, y: th + r))

        path.close()
        return path
    }
}
