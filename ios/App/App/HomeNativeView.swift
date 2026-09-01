import UIKit

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
    let testName: String
    let status: String   // "Ready" | "Processing" | "Pending"
    let total: Double
    let paid: Bool
}

// ─────────────────────────────────────────────────────────────────────────────
// MARK: – HomeNativeView (UIScrollView-based root view)
// ─────────────────────────────────────────────────────────────────────────────
class HomeNativeView: UIView {

    // MARK: – Static data
    static let banners: [HomeBanner] = [
        HomeBanner(title: "₹2.5 Per\nRegistration",
                   subtitle: "Cloud reporting, instant WhatsApp sharing & B2B automation at the lowest cost.",
                   cta: "Recharge Now →", path: "/workspace/wallet?action=topup"),
        HomeBanner(title: "Instant WhatsApp\nDelivery",
                   subtitle: "Send diagnostic reports directly to patients on WhatsApp with one tap.",
                   cta: "Explore Now →", path: "/workspace/reports"),
        HomeBanner(title: "Automated\nLab Billing",
                   subtitle: "Generate GST-compliant invoices and track pending dues effortlessly.",
                   cta: "View Billing →", path: "/workspace/billing"),
    ]

    static let modules: [HomeModule] = [
        HomeModule(id: "reg",  name: "Register",  path: "/workspace/registration",   icon: "person.text.rectangle.fill", iconColor: UIColor(red: 37/255, green: 99/255, blue: 235/255, alpha: 1), bgColor: UIColor(red: 239/255, green: 246/255, blue: 255/255, alpha: 1), isWhatsApp: false),
        HomeModule(id: "test", name: "Tests",     path: "/workspace/test-management", icon: "flask.fill", iconColor: UIColor(red: 124/255, green: 58/255, blue: 237/255, alpha: 1), bgColor: UIColor(red: 245/255, green: 243/255, blue: 255/255, alpha: 1), isWhatsApp: false),
        HomeModule(id: "bill", name: "Billing",   path: "/workspace/billing",         icon: "doc.plaintext.fill", iconColor: UIColor(red: 5/255, green: 150/255, blue: 105/255, alpha: 1), bgColor: UIColor(red: 236/255, green: 253/255, blue: 245/255, alpha: 1), isWhatsApp: false),
        HomeModule(id: "rep",  name: "Reports",   path: "/workspace/reports",         icon: "checkmark.seal.fill", iconColor: UIColor(red: 2/255, green: 132/255, blue: 199/255, alpha: 1), bgColor: UIColor(red: 240/255, green: 249/255, blue: 255/255, alpha: 1), isWhatsApp: false),
        HomeModule(id: "samp", name: "Samples",   path: "/workspace/accession",       icon: "testtube.2", iconColor: UIColor(red: 225/255, green: 29/255, blue: 72/255, alpha: 1), bgColor: UIColor(red: 255/255, green: 241/255, blue: 242/255, alpha: 1), isWhatsApp: false),
        HomeModule(id: "wa",   name: "Share",     path: "/workspace/reports",         icon: "phone.fill", iconColor: UIColor(red: 22/255, green: 163/255, blue: 74/255, alpha: 1), bgColor: UIColor(red: 240/255, green: 253/255, blue: 244/255, alpha: 1), isWhatsApp: true),
        HomeModule(id: "logi", name: "Logistics", path: "/workspace/logistics",       icon: "box.truck.fill", iconColor: UIColor(red: 217/255, green: 119/255, blue: 6/255, alpha: 1), bgColor: UIColor(red: 255/255, green: 251/255, blue: 235/255, alpha: 1), isWhatsApp: false),
        HomeModule(id: "wall", name: "Wallet",    path: "/workspace/wallet",          icon: "creditcard.fill", iconColor: UIColor(red: 79/255, green: 70/255, blue: 229/255, alpha: 1), bgColor: UIColor(red: 238/255, green: 242/255, blue: 255/255, alpha: 1), isWhatsApp: false),
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
    private let bellButton       = UIButton(type: .custom)
    private let bellDot          = UIView()

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
    private let worklistScrollView   = UIScrollView()
    private let worklistStack        = UIStackView()

    // MARK: – State
    var onNavigate: ((String) -> Void)?
    var onSignOut: (() -> Void)?
    private var walletPollTimer: Timer?
    private var bellLoopTimer: Timer?
    private var currentFullName = "User"
    private var currentRole = "Lab Owner"

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

        statusWaveView.backgroundColor = .white
        statusWaveView.layer.cornerRadius = 6
        statusWaveView.translatesAutoresizingMaskIntoConstraints = false
        avatarContainer.addSubview(statusWaveView)

        statusDotView.backgroundColor    = UIColor(red: 0.063, green: 0.725, blue: 0.506, alpha: 1)
        statusDotView.layer.cornerRadius = 5.5
        statusDotView.layer.borderWidth  = 1.5
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
        startStatusWaveAnimation()

        // Greeting
        greetingLabel.font = .systemFont(ofSize: 19, weight: .bold)
        greetingLabel.textColor = .white
        greetingLabel.text = "Hello, User"
        greetingLabel.lineBreakMode = .byTruncatingTail

        waveLabel.font = .systemFont(ofSize: 24)
        waveLabel.text = "\u{1F44B}"

        let greetingRow = UIStackView(arrangedSubviews: [greetingLabel, waveLabel])
        greetingRow.axis = .horizontal
        greetingRow.spacing = 6
        greetingRow.alignment = .center

        // Modern Wallet Capsule
        walletPill.backgroundColor = UIColor.white.withAlphaComponent(0.20)
        walletPill.layer.cornerRadius = 14
        walletPill.layer.borderWidth  = 1
        walletPill.layer.borderColor  = UIColor.white.withAlphaComponent(0.35).cgColor
        walletPill.contentEdgeInsets  = UIEdgeInsets(top: 4, left: 10, bottom: 4, right: 10)
        walletPill.addTarget(self, action: #selector(walletPillTapped), for: .touchUpInside)

        walletIcon.image = UIImage(systemName: "creditcard.fill")
        walletIcon.tintColor = UIColor(red: 0.729, green: 0.902, blue: 0.992, alpha: 1)
        walletIcon.contentMode = .scaleAspectFit

        walletBalanceLabel.text      = "₹0.00"
        walletBalanceLabel.font      = .systemFont(ofSize: 12, weight: .bold)
        walletBalanceLabel.textColor = .white

        let creditsLabel = UILabel()
        creditsLabel.text = "• Credits ›"
        creditsLabel.font = .systemFont(ofSize: 11, weight: .bold)
        creditsLabel.textColor = UIColor(red: 0.729, green: 0.902, blue: 0.992, alpha: 1)

        let walletRow = UIStackView(arrangedSubviews: [walletIcon, walletBalanceLabel, creditsLabel])
        walletRow.axis    = .horizontal
        walletRow.spacing = 5
        walletRow.alignment = .center
        walletRow.isUserInteractionEnabled = false
        walletPill.addSubview(walletRow)

        // Bell button
        bellButton.backgroundColor = .white
        bellButton.layer.cornerRadius = 22
        bellButton.layer.shadowColor  = UIColor.black.cgColor
        bellButton.layer.shadowOpacity = 0.12
        bellButton.layer.shadowRadius  = 4
        bellButton.layer.shadowOffset  = CGSize(width: 0, height: 2)
        bellButton.setImage(UIImage(systemName: "bell.fill"), for: .normal)
        bellButton.tintColor = Self.headerBlue2
        bellButton.addTarget(self, action: #selector(bellTapped), for: .touchUpInside)

        // Bell unread dot
        bellDot.backgroundColor   = UIColor(red: 1, green: 0.231, blue: 0.188, alpha: 1)
        bellDot.layer.cornerRadius = 4.5
        bellDot.layer.borderWidth  = 1.5
        bellDot.layer.borderColor  = UIColor.white.cgColor

        // Layout in header using Auto Layout
        let leftVStack = UIStackView(arrangedSubviews: [greetingRow, walletPill])
        leftVStack.axis    = .vertical
        leftVStack.spacing = 6
        leftVStack.alignment = .leading

        let hStack = UIStackView(arrangedSubviews: [avatarContainer, leftVStack, UIView(), bellButton])
        hStack.axis    = .horizontal
        hStack.spacing = 12
        hStack.alignment = .center
        hStack.setCustomSpacing(8, after: leftVStack)

        headerView.addSubview(hStack)
        headerView.addSubview(bellDot)
        hStack.translatesAutoresizingMaskIntoConstraints = false
        bellDot.translatesAutoresizingMaskIntoConstraints = false
        avatarContainer.translatesAutoresizingMaskIntoConstraints = false
        bellButton.translatesAutoresizingMaskIntoConstraints = false
        walletRow.translatesAutoresizingMaskIntoConstraints = false

        NSLayoutConstraint.activate([
            avatarContainer.widthAnchor.constraint(equalToConstant: 44),
            avatarContainer.heightAnchor.constraint(equalToConstant: 44),
            bellButton.widthAnchor.constraint(equalToConstant: 44),
            bellButton.heightAnchor.constraint(equalToConstant: 44),
            hStack.topAnchor.constraint(equalTo: headerView.safeAreaLayoutGuide.topAnchor, constant: 10),
            hStack.leadingAnchor.constraint(equalTo: headerView.leadingAnchor, constant: 18),
            hStack.trailingAnchor.constraint(equalTo: headerView.trailingAnchor, constant: -18),
            hStack.bottomAnchor.constraint(equalTo: headerView.bottomAnchor, constant: -26),
            walletRow.leadingAnchor.constraint(equalTo: walletPill.leadingAnchor, constant: 10),
            walletRow.centerYAnchor.constraint(equalTo: walletPill.centerYAnchor),
            walletIcon.widthAnchor.constraint(equalToConstant: 14),
            walletIcon.heightAnchor.constraint(equalToConstant: 14),
            bellDot.widthAnchor.constraint(equalToConstant: 9),
            bellDot.heightAnchor.constraint(equalToConstant: 9),
            bellDot.topAnchor.constraint(equalTo: bellButton.topAnchor, constant: 9),
            bellDot.trailingAnchor.constraint(equalTo: bellButton.trailingAnchor, constant: -9),
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
        bannerTitleLabel.text          = "₹2.5 Per\nRegistration"

        // Subtitle
        bannerSubLabel.font          = .systemFont(ofSize: 12, weight: .regular)
        bannerSubLabel.textColor     = UIColor.white.withAlphaComponent(0.88)
        bannerSubLabel.numberOfLines = 3
        bannerSubLabel.text          = "Cloud reporting, instant WhatsApp sharing & B2B automation at the lowest cost."

        // CTA Button
        bannerCtaBtn.setTitle("Recharge Now →", for: .normal)
        bannerCtaBtn.setTitleColor(UIColor(red: 0.118, green: 0.251, blue: 0.690, alpha: 1), for: .normal)
        bannerCtaBtn.titleLabel?.font = .systemFont(ofSize: 13, weight: .bold)
        bannerCtaBtn.backgroundColor  = .white
        bannerCtaBtn.layer.cornerRadius = 20
        bannerCtaBtn.contentEdgeInsets  = UIEdgeInsets(top: 9, left: 18, bottom: 9, right: 18)
        bannerCtaBtn.layer.shadowColor   = UIColor.black.cgColor
        bannerCtaBtn.layer.shadowOpacity = 0.12
        bannerCtaBtn.layer.shadowRadius  = 4
        bannerCtaBtn.layer.shadowOffset  = CGSize(width: 0, height: 2)
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
        bannerDotsStack.spacing   = 6
        bannerDotsStack.alignment = .center
        for i in 0..<Self.banners.count {
            let dot = UIView()
            dot.layer.cornerRadius = 3.5
            dot.translatesAutoresizingMaskIntoConstraints = false
            let w: CGFloat = i == 0 ? 20 : 7
            NSLayoutConstraint.activate([
                dot.widthAnchor.constraint(equalToConstant: w),
                dot.heightAnchor.constraint(equalToConstant: 7),
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

    // MARK: – Top Modules
    private func buildModulesSection() {
        let section = UIView()

        let header = makeSectionHeader(title: "Our Modules", actionTitle: "See all",
                                       action: #selector(seeAllTapped))
        section.addSubview(header)
        header.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            header.topAnchor.constraint(equalTo: section.topAnchor, constant: 20),
            header.leadingAnchor.constraint(equalTo: section.leadingAnchor, constant: 16),
            header.trailingAnchor.constraint(equalTo: section.trailingAnchor, constant: -16),
        ])

        // Grid: 2 rows of 4 columns
        let row1 = makeModuleRow(modules: Array(Self.modules[0..<4]))
        let row2 = makeModuleRow(modules: Array(Self.modules[4..<8]))
        let gridStack = UIStackView(arrangedSubviews: [row1, row2])
        gridStack.axis    = .vertical
        gridStack.spacing = 10
        section.addSubview(gridStack)
        gridStack.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            gridStack.topAnchor.constraint(equalTo: header.bottomAnchor, constant: 14),
            gridStack.leadingAnchor.constraint(equalTo: section.leadingAnchor, constant: 16),
            gridStack.trailingAnchor.constraint(equalTo: section.trailingAnchor, constant: -16),
            gridStack.bottomAnchor.constraint(equalTo: section.bottomAnchor),
        ])
        contentStack.addArrangedSubview(section)
    }

    private func makeModuleRow(modules: [HomeModule]) -> UIStackView {
        let row = UIStackView()
        row.axis         = .horizontal
        row.distribution = .fillEqually
        row.spacing      = 10
        for mod in modules {
            row.addArrangedSubview(makeModuleCard(mod))
        }
        return row
    }

    private func makeModuleCard(_ mod: HomeModule) -> UIView {
        let card = UIView()
        card.backgroundColor    = .white
        card.layer.cornerRadius = 16
        card.layer.borderWidth  = 1
        card.layer.borderColor  = UIColor(red: 0.918, green: 0.941, blue: 0.980, alpha: 1).cgColor
        card.layer.shadowColor  = UIColor.black.cgColor
        card.layer.shadowOpacity = 0.04
        card.layer.shadowRadius = 2
        card.layer.shadowOffset = CGSize(width: 0, height: 1)

        // Icon container with specific background color
        let iconBg = UIView()
        iconBg.backgroundColor    = mod.bgColor
        iconBg.layer.cornerRadius = 14
        iconBg.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            iconBg.widthAnchor.constraint(equalToConstant: 46),
            iconBg.heightAnchor.constraint(equalToConstant: 46),
        ])

        let img = UIImageView(image: UIImage(systemName: mod.icon))
        img.tintColor     = mod.iconColor
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
        boldLabel.font = .systemFont(ofSize: 12, weight: .bold)
        boldLabel.textColor = UIColor(red: 30/255, green: 41/255, blue: 59/255, alpha: 1)
        boldLabel.text = mod.name
        boldLabel.textAlignment = .center

        let vStack = UIStackView(arrangedSubviews: [iconBg, boldLabel])
        vStack.axis      = .vertical
        vStack.spacing   = 8
        vStack.alignment = .center

        card.addSubview(vStack)
        vStack.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            vStack.topAnchor.constraint(equalTo: card.topAnchor, constant: 12),
            vStack.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 4),
            vStack.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -4),
            vStack.bottomAnchor.constraint(equalTo: card.bottomAnchor, constant: -10),
        ])

        // Tap
        let tap = UITapGestureRecognizer(target: self, action: #selector(moduleTapped(_:)))
        card.addGestureRecognizer(tap)
        card.accessibilityIdentifier = mod.path
        card.isUserInteractionEnabled = true

        return card
    }

    // MARK: – Worklist
    private func buildWorklistSection() {
        let section = UIView()
        section.translatesAutoresizingMaskIntoConstraints = false

        let header = makeSectionHeader(title: "Today's Worklist", actionTitle: "View All",
                                       action: #selector(viewAllTapped))
        section.addSubview(header)
        header.translatesAutoresizingMaskIntoConstraints = false

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

        section.addSubview(worklistScrollView)
        worklistScrollView.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            header.topAnchor.constraint(equalTo: section.topAnchor, constant: 22),
            header.leadingAnchor.constraint(equalTo: section.leadingAnchor, constant: 16),
            header.trailingAnchor.constraint(equalTo: section.trailingAnchor, constant: -16),
            worklistScrollView.topAnchor.constraint(equalTo: header.bottomAnchor, constant: 12),
            worklistScrollView.leadingAnchor.constraint(equalTo: section.leadingAnchor),
            worklistScrollView.trailingAnchor.constraint(equalTo: section.trailingAnchor),
            worklistScrollView.bottomAnchor.constraint(equalTo: section.bottomAnchor, constant: -4),
            worklistScrollView.heightAnchor.constraint(equalToConstant: 155),
        ])
        contentStack.addArrangedSubview(section)
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
        card.layer.cornerRadius = 18
        card.layer.borderWidth  = 1
        card.layer.borderColor  = UIColor(red: 0.918, green: 0.941, blue: 0.980, alpha: 1).cgColor
        card.layer.shadowColor  = UIColor.black.cgColor
        card.layer.shadowOpacity = 0.04
        card.layer.shadowRadius = 3
        card.layer.shadowOffset = CGSize(width: 0, height: 1)
        card.widthAnchor.constraint(equalToConstant: 210).isActive = true

        // Status badge
        let (bgColor, textColor, borderColor) = statusStyle(p.status)
        let statusBadge = UILabel()
        statusBadge.text = p.status
        statusBadge.font = .systemFont(ofSize: 11, weight: .bold)
        statusBadge.textColor = textColor
        statusBadge.backgroundColor = bgColor
        statusBadge.layer.cornerRadius = 10
        statusBadge.layer.borderWidth  = 1
        statusBadge.layer.borderColor  = borderColor.cgColor
        statusBadge.textAlignment = .center
        statusBadge.layer.masksToBounds = true
        statusBadge.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            statusBadge.heightAnchor.constraint(equalToConstant: 22),
            statusBadge.widthAnchor.constraint(greaterThanOrEqualToConstant: 60),
        ])

        let patientTopRow = makeHStack([makeTinyLabel("Patient"), UIView(), statusBadge])

        let nameLabel = UILabel()
        nameLabel.text = p.name
        nameLabel.font = .systemFont(ofSize: 15, weight: .black)
        nameLabel.textColor = Self.textPrimary

        let testLabel = UILabel()
        testLabel.text = p.testName
        testLabel.font = .systemFont(ofSize: 12, weight: .medium)
        testLabel.textColor = Self.textSecondary
        testLabel.lineBreakMode = .byTruncatingTail

        // Divider
        let divider = UIView()
        divider.backgroundColor = UIColor(red: 0.945, green: 0.961, blue: 0.980, alpha: 1)
        divider.heightAnchor.constraint(equalToConstant: 1).isActive = true

        // Price row
        let priceLabel = UILabel()
        priceLabel.text = "₹\(Int(p.total))"
        priceLabel.font = .systemFont(ofSize: 14, weight: .black)
        priceLabel.textColor = Self.textPrimary

        let paidLabel = UILabel()
        paidLabel.text = "Paid"
        paidLabel.font = .systemFont(ofSize: 12, weight: .semibold)
        paidLabel.textColor = UIColor(red: 0, green: 0.659, blue: 0.420, alpha: 1)
        paidLabel.isHidden = !p.paid

        let priceRow = makeHStack([priceLabel, paidLabel, UIView()])

        // WhatsApp button
        if p.status != "Pending" && !p.phone.isEmpty {
            let waBtn = UIButton(type: .custom)
            waBtn.backgroundColor = UIColor(red: 0.145, green: 0.831, blue: 0.400, alpha: 1)
            waBtn.layer.cornerRadius = 18
            waBtn.widthAnchor.constraint(equalToConstant: 36).isActive  = true
            waBtn.heightAnchor.constraint(equalToConstant: 36).isActive = true
            waBtn.setImage(UIImage(systemName: "phone.fill"), for: .normal)
            waBtn.tintColor = .white
            let phone = p.phone
            let name  = p.name
            waBtn.addAction(UIAction { [weak self] _ in
                guard let url = URL(string: "https://wa.me/91\(phone)?text=Hello \(name), your diagnostic report is ready.") else { return }
                UIApplication.shared.open(url)
            }, for: .touchUpInside)
            priceRow.addArrangedSubview(waBtn)
        }

        let vStack = UIStackView(arrangedSubviews: [patientTopRow, nameLabel, testLabel, divider, priceRow])
        vStack.axis    = .vertical
        vStack.spacing = 6
        vStack.setCustomSpacing(4, after: nameLabel)
        vStack.setCustomSpacing(8, after: testLabel)
        vStack.setCustomSpacing(6, after: divider)

        card.addSubview(vStack)
        vStack.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            vStack.topAnchor.constraint(equalTo: card.topAnchor, constant: 14),
            vStack.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 14),
            vStack.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -14),
            vStack.bottomAnchor.constraint(equalTo: card.bottomAnchor, constant: -12),
        ])
        return card
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
            return (UIColor(red: 0.910, green: 1.0, blue: 0.950, alpha: 1),
                    UIColor(red: 0, green: 0.659, blue: 0.420, alpha: 1),
                    UIColor(red: 0.698, green: 0.937, blue: 0.831, alpha: 1))
        case "Processing":
            return (UIColor(red: 0.918, green: 0.949, blue: 1.0, alpha: 1),
                    UIColor(red: 0.118, green: 0.533, blue: 0.898, alpha: 1),
                    UIColor(red: 0.702, green: 0.831, blue: 1.0, alpha: 1))
        default:
            return (UIColor(red: 1.0, green: 0.973, blue: 0.882, alpha: 1),
                    UIColor(red: 0.961, green: 0.620, blue: 0.043, alpha: 1),
                    UIColor(red: 0.992, green: 0.875, blue: 0.627, alpha: 1))
        }
    }

    // MARK: – Banner carousel
    private func startCarousel() {
        bannerTimer = Timer.scheduledTimer(withTimeInterval: 2.8, repeats: true) { [weak self] _ in
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
                wConstraint.constant = isActive ? 20 : 7
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
        }

        Task {
            guard let token = getToken() else { return }
            guard let url = URL(string: "https://app.patholab.cloud/api/auth/me") else { return }
            var req = URLRequest(url: url)
            req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            req.setValue("token=\(token)", forHTTPHeaderField: "Cookie")
            if let (data, _) = try? await URLSession.shared.data(for: req),
               let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
                let serverName = (json["name"] as? String) ?? (json["email"] as? String) ?? ""
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
                    }
                }
                if let lab = json["lab"] as? [String: Any],
                   let wallet = lab["wallet"] as? [String: Any],
                   let bal = wallet["balance"] as? Double {
                    await MainActor.run {
                        let formatted = self.formatINR(bal)
                        self.walletBalanceLabel.text = formatted
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

    private func startStatusWaveAnimation() {
        let scaleAnim = CABasicAnimation(keyPath: "transform.scale")
        scaleAnim.fromValue = 1.0
        scaleAnim.toValue = 2.6
        scaleAnim.timingFunction = CAMediaTimingFunction(name: .easeOut)

        let opacityAnim = CABasicAnimation(keyPath: "opacity")
        opacityAnim.fromValue = 0.85
        opacityAnim.toValue = 0.0
        opacityAnim.timingFunction = CAMediaTimingFunction(name: .easeOut)

        let group = CAAnimationGroup()
        group.animations = [scaleAnim, opacityAnim]
        group.duration = 1.5
        group.repeatCount = .infinity
        statusWaveView.layer.add(group, forKey: "smoothWave")
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
        let anim = CAKeyframeAnimation(keyPath: "transform.rotation")
        anim.values = [0, 0.38, -0.24, 0.38, -0.16, 0.26, -0.08, 0]
        anim.keyTimes = [0, 0.15, 0.30, 0.45, 0.60, 0.75, 0.90, 1.0]
        anim.duration = 1.05
        waveLabel.layer.add(anim, forKey: "waveHand")
    }

    static func formatSmartFirstName(_ raw: String) -> String {
        var str = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        if str.isEmpty { return "User" }

        // Remove email domain
        if let atIdx = str.firstIndex(of: "@") {
            str = String(str[..<atIdx])
        }

        // Split on separators
        let tokens = str.components(separatedBy: CharacterSet(charactersIn: " ._-"))
        if let firstToken = tokens.first, !firstToken.isEmpty {
            str = firstToken
        }

        // Handle CamelCase
        var result = ""
        for char in str {
            if char.isUppercase && !result.isEmpty {
                break
            }
            result.append(char)
        }
        if !result.isEmpty { str = result }

        // Filter letters only
        str = str.filter { $0.isLetter }
        if str.isEmpty { return "User" }

        // Capitalize
        str = str.prefix(1).uppercased() + str.dropFirst().lowercased()

        // Known prefixes
        let lower = str.lowercased()
        let prefixes = ["monowar", "manohar", "mohammad", "anupam", "shahid", "abhishek", "rahul", "amit", "priya", "rohit", "vikram", "rajesh", "suresh", "deepak", "sanjay"]
        for p in prefixes {
            if lower.hasPrefix(p) && lower.count > p.count + 2 {
                return p.prefix(1).uppercased() + p.dropFirst().lowercased()
            }
        }

        // Cap at 7 characters if still longer than 8
        if str.count > 8 {
            str = String(str.prefix(7))
        }

        return str
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
                    self.walletBalanceLabel.text = formatted
                }
            }
        }
    }

    func fetchTodaysWorklist() {
        Task {
            guard let token = getToken() else { populateDemo(); return }
            guard let url = URL(string: "https://app.patholab.cloud/api/labs/dashboard?range=TODAY") else { return }
            var req = URLRequest(url: url)
            req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            if let (data, _) = try? await URLSession.shared.data(for: req),
               let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
               let patients = json["recentPatients"] as? [[String: Any]], !patients.isEmpty {
                let cards = patients.compactMap { parsePatient($0) }
                await MainActor.run { self.populateWorklist(cards) }
            } else {
                await MainActor.run { self.populateDemo() }
            }
        }
    }

    private func parsePatient(_ p: [String: Any]) -> HomePatient? {
        guard let name = p["name"] as? String else { return nil }
        let id    = p["id"] as? String ?? ""
        let phone = p["phone"] as? String ?? ""
        let tests = p["tests"] as? [[String: Any]] ?? []
        let invs  = p["invoices"] as? [[String: Any]] ?? []
        let testName  = tests.first?["testName"] as? String ?? tests.first?["name"] as? String ?? "—"
        let rawStatus = tests.first?["status"] as? String ?? "PENDING"
        let status: String
        switch rawStatus {
        case "COMPLETED":  status = "Ready"
        case "IN_PROGRESS": status = "Processing"
        default:           status = "Pending"
        }
        let total = invs.first?["grandTotal"] as? Double ?? 0
        let paid  = (invs.first?["paymentStatus"] as? String ?? "").uppercased() == "PAID"
        return HomePatient(id: id, name: name, phone: phone, testName: testName,
                           status: status, total: total, paid: paid)
    }

    private func populateDemo() {
        let demo = [
            HomePatient(id: "d1", name: "Ramesh Sen",  phone: "9876543210",
                        testName: "CBC & Lipid Profile", status: "Ready",      total: 450, paid: true),
            HomePatient(id: "d2", name: "Sunita Roy",  phone: "9876543211",
                        testName: "Thyroid Panel",        status: "Processing", total: 600, paid: true),
            HomePatient(id: "d3", name: "Arun Kumar",  phone: "9876543212",
                        testName: "Blood Sugar HbA1c",    status: "Pending",    total: 350, paid: false),
        ]
        populateWorklist(demo)
    }

    private func startWalletPolling() {
        walletPollTimer = Timer.scheduledTimer(withTimeInterval: 15, repeats: true) { [weak self] _ in
            self?.fetchWalletBalance()
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
        return "₹\(s)"
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

    // MARK: – Actions
    @objc private func walletPillTapped() { onNavigate?("/workspace/wallet") }
    @objc private func bellTapped()       { onNavigate?("/workspace/reports") }
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
        if let path = gr.view?.accessibilityIdentifier { onNavigate?(path) }
    }

    // MARK: – Cleanup
    deinit {
        bannerTimer?.invalidate()
        walletPollTimer?.invalidate()
        bellLoopTimer?.invalidate()
    }
}
