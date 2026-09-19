import UIKit

// MARK: - InvoiceBrandingViewController
// Professional, luxury Invoice Branding & Brand Assets Management:
// - 01. Lab Logo
// - 02. Letterhead Header
// - 03. Footer Image
// - 04. Signature
// Full state tracking: Save Branding button only enabled when real changes are pending.
// High-quality image downsampling to prevent network bottlenecks.
// Real-time 2-way synchronization with the web portal.
// Crisp white button fonts on Sapphire background.

class InvoiceBrandingViewController: UIViewController, UIImagePickerControllerDelegate, UINavigationControllerDelegate {

    private let baseURL = "https://app.patholab.cloud"

    // Colors & Theme Tokens
    private static let brandSapphire = UIColor(red: 13/255, green: 110/255, blue: 253/255, alpha: 1)
    private static let bgGray = UIColor(red: 248/255, green: 250/255, blue: 252/255, alpha: 1)
    private static let borderSlate = UIColor(red: 226/255, green: 232/255, blue: 240/255, alpha: 1)
    private static let textDark = UIColor(red: 15/255, green: 23/255, blue: 42/255, alpha: 1)
    private static let textMuted = UIColor(red: 100/255, green: 116/255, blue: 139/255, alpha: 1)

    // Navigation & Header
    private let heroHeaderView = UIView()
    private let backBtn = UIButton(type: .system)
    private let refreshBtn = UIButton(type: .system)
    private let titleLabel = UILabel()
    private let subtitleLabel = UILabel()

    private let scrollView = UIScrollView()
    private let contentStack = UIStackView()
    private let loadingSpinner = UIActivityIndicatorView(style: .medium)

    // 01. Lab Logo
    private let logoPreviewBox = UIView()
    private let logoPreviewImg = UIImageView()
    private let logoFallbackLabel = UILabel()
    private let logoStatusLabel = UILabel()
    private let btnUploadLogo = UIButton(type: .system)
    private let btnRemoveLogo = UIButton(type: .system)
    private var imgLogo: UIImage? = nil

    // 02. Letterhead Header
    private let letterheadPreviewBox = UIView()
    private let letterheadPreviewImg = UIImageView()
    private let letterheadFallbackLabel = UILabel()
    private let letterheadStatusLabel = UILabel()
    private let btnUploadLetterhead = UIButton(type: .system)
    private let btnRemoveLetterhead = UIButton(type: .system)
    private var imgLetterhead: UIImage? = nil

    // 03. Footer Image
    private let footerPreviewBox = UIView()
    private let footerPreviewImg = UIImageView()
    private let footerFallbackLabel = UILabel()
    private let footerStatusLabel = UILabel()
    private let btnUploadFooter = UIButton(type: .system)
    private let btnRemoveFooter = UIButton(type: .system)
    private var imgFooter: UIImage? = nil

    // 04. Signature
    private let signaturePreviewBox = UIView()
    private let signaturePreviewImg = UIImageView()
    private let signatureFallbackLabel = UILabel()
    private let signatureStatusLabel = UILabel()
    private let btnUploadSignature = UIButton(type: .system)
    private let btnRemoveSignature = UIButton(type: .system)
    private var imgSignature: UIImage? = nil

    // Save Section
    private let pendingChangesHint = UILabel()
    private let saveButton = UIButton(type: .system)
    private let statusLabel = UILabel()
    private let saveSpinner = UIActivityIndicatorView(style: .medium)

    // State Variables
    private var currentLogo: String = ""
    private var currentLetterhead: String = ""
    private var currentFooter: String = ""
    private var currentSignature: String = ""

    private var initialLogo: String = ""
    private var initialLetterhead: String = ""
    private var initialFooter: String = ""
    private var initialSignature: String = ""

    private var metaLogo: String = ""
    private var metaLetterhead: String = ""
    private var metaFooter: String = ""
    private var metaSignature: String = ""

    private var fetchedLabData: [String: Any]? = nil
    private var currentPickingAsset: Int = 0 // 1: Logo, 2: Letterhead, 3: Footer, 4: Signature

    private func hasAsset(_ val: String?) -> Bool {
        guard let val = val else { return false }
        let trimmed = val.trimmingCharacters(in: .whitespacesAndNewlines)
        return !trimmed.isEmpty && trimmed.lowercased() != "null" && trimmed.lowercased() != "undefined"
    }

    private func sanitize(_ val: Any?) -> String {
        guard let str = val as? String else { return "" }
        let trimmed = str.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmed.isEmpty || trimmed.lowercased() == "null" || trimmed.lowercased() == "undefined" {
            return ""
        }
        return trimmed
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = Self.bgGray

        setupHeroHeader()
        setupScrollView()
        buildBrandAssetCards()
        // Initialize clean UI state: no Remove buttons, 'Choose File' button text
        renderLogoUI()
        renderLetterheadUI()
        renderFooterUI()
        renderSignatureUI()
        updatePendingState()
        fetchBranding(manual: false)
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        if let grad = heroHeaderView.layer.sublayers?.first as? CAGradientLayer {
            grad.frame = heroHeaderView.bounds
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MARK: – Navigation & Header
    // ─────────────────────────────────────────────────────────────────────────
    private func setupHeroHeader() {
        heroHeaderView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(heroHeaderView)

        let gradient = CAGradientLayer()
        gradient.colors = [
            UIColor(red: 10/255, green: 37/255, blue: 92/255, alpha: 1).cgColor,
            UIColor(red: 13/255, green: 110/255, blue: 253/255, alpha: 1).cgColor
        ]
        gradient.startPoint = CGPoint(x: 0, y: 0)
        gradient.endPoint = CGPoint(x: 1, y: 1)
        heroHeaderView.layer.insertSublayer(gradient, at: 0)

        // Glass Back Button
        backBtn.translatesAutoresizingMaskIntoConstraints = false
        backBtn.setImage(UIImage(systemName: "chevron.left")?.withRenderingMode(.alwaysTemplate), for: .normal)
        backBtn.tintColor = .white
        backBtn.backgroundColor = UIColor.white.withAlphaComponent(0.18)
        backBtn.layer.cornerRadius = 12
        backBtn.layer.borderWidth = 1
        backBtn.layer.borderColor = UIColor.white.withAlphaComponent(0.28).cgColor
        backBtn.addTarget(self, action: #selector(handleBack), for: .touchUpInside)
        heroHeaderView.addSubview(backBtn)

        // Title Stack
        titleLabel.text = "Invoice Branding"
        titleLabel.font = .systemFont(ofSize: 22, weight: .bold)
        titleLabel.textColor = .white

        subtitleLabel.text = "Live Sync with Web • Reports & Invoices"
        subtitleLabel.font = .systemFont(ofSize: 12.5, weight: .regular)
        subtitleLabel.textColor = UIColor(red: 199/255, green: 223/255, blue: 255/255, alpha: 1)

        let titlesStack = UIStackView(arrangedSubviews: [titleLabel, subtitleLabel])
        titlesStack.axis = .vertical
        titlesStack.spacing = 2
        titlesStack.translatesAutoresizingMaskIntoConstraints = false
        heroHeaderView.addSubview(titlesStack)

        // Glass Refresh Button
        refreshBtn.translatesAutoresizingMaskIntoConstraints = false
        refreshBtn.setImage(UIImage(systemName: "arrow.clockwise")?.withRenderingMode(.alwaysTemplate), for: .normal)
        refreshBtn.tintColor = .white
        refreshBtn.backgroundColor = UIColor.white.withAlphaComponent(0.18)
        refreshBtn.layer.cornerRadius = 12
        refreshBtn.layer.borderWidth = 1
        refreshBtn.layer.borderColor = UIColor.white.withAlphaComponent(0.28).cgColor
        refreshBtn.addTarget(self, action: #selector(handleRefresh), for: .touchUpInside)
        heroHeaderView.addSubview(refreshBtn)

        // Loading Spinner
        loadingSpinner.color = UIColor(red: 147/255, green: 197/255, blue: 253/255, alpha: 1)
        loadingSpinner.hidesWhenStopped = true
        loadingSpinner.translatesAutoresizingMaskIntoConstraints = false
        heroHeaderView.addSubview(loadingSpinner)

        NSLayoutConstraint.activate([
            heroHeaderView.topAnchor.constraint(equalTo: view.topAnchor),
            heroHeaderView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            heroHeaderView.trailingAnchor.constraint(equalTo: view.trailingAnchor),

            backBtn.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 10),
            backBtn.leadingAnchor.constraint(equalTo: heroHeaderView.leadingAnchor, constant: 18),
            backBtn.widthAnchor.constraint(equalToConstant: 40),
            backBtn.heightAnchor.constraint(equalToConstant: 40),

            titlesStack.leadingAnchor.constraint(equalTo: backBtn.trailingAnchor, constant: 14),
            titlesStack.trailingAnchor.constraint(equalTo: refreshBtn.leadingAnchor, constant: -12),
            titlesStack.centerYAnchor.constraint(equalTo: backBtn.centerYAnchor),

            refreshBtn.trailingAnchor.constraint(equalTo: heroHeaderView.trailingAnchor, constant: -18),
            refreshBtn.centerYAnchor.constraint(equalTo: backBtn.centerYAnchor),
            refreshBtn.widthAnchor.constraint(equalToConstant: 40),
            refreshBtn.heightAnchor.constraint(equalToConstant: 40),

            loadingSpinner.leadingAnchor.constraint(equalTo: heroHeaderView.leadingAnchor, constant: 18),
            loadingSpinner.topAnchor.constraint(equalTo: titlesStack.bottomAnchor, constant: 10),
            heroHeaderView.bottomAnchor.constraint(equalTo: titlesStack.bottomAnchor, constant: 18)
        ])
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MARK: – ScrollView & Layout
    // ─────────────────────────────────────────────────────────────────────────
    private func setupScrollView() {
        scrollView.translatesAutoresizingMaskIntoConstraints = false
        scrollView.backgroundColor = Self.bgGray
        scrollView.showsVerticalScrollIndicator = false
        scrollView.alwaysBounceVertical = true
        view.addSubview(scrollView)

        contentStack.axis = .vertical
        contentStack.spacing = 16
        contentStack.translatesAutoresizingMaskIntoConstraints = false
        scrollView.addSubview(contentStack)

        NSLayoutConstraint.activate([
            scrollView.topAnchor.constraint(equalTo: heroHeaderView.bottomAnchor),
            scrollView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            scrollView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            scrollView.bottomAnchor.constraint(equalTo: view.bottomAnchor),

            contentStack.topAnchor.constraint(equalTo: scrollView.contentLayoutGuide.topAnchor, constant: 18),
            contentStack.leadingAnchor.constraint(equalTo: scrollView.contentLayoutGuide.leadingAnchor, constant: 18),
            contentStack.trailingAnchor.constraint(equalTo: scrollView.contentLayoutGuide.trailingAnchor, constant: -18),
            contentStack.bottomAnchor.constraint(equalTo: scrollView.contentLayoutGuide.bottomAnchor, constant: -40),
            contentStack.widthAnchor.constraint(equalTo: scrollView.frameLayoutGuide.widthAnchor, constant: -36)
        ])
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MARK: – Build 4 Branding Assets Cards
    // ─────────────────────────────────────────────────────────────────────────
    private func buildBrandAssetCards() {
        // Section Title
        let sectionHeaderLbl = UILabel()
        sectionHeaderLbl.text = "Branding Assets"
        sectionHeaderLbl.font = .systemFont(ofSize: 19, weight: .bold)
        sectionHeaderLbl.textColor = Self.textDark
        contentStack.addArrangedSubview(sectionHeaderLbl)

        let descLabel = UILabel()
        descLabel.text = "Tap 'Choose File' or click the preview area to select an image from your device."
        descLabel.font = .systemFont(ofSize: 12.5, weight: .regular)
        descLabel.textColor = Self.textMuted
        descLabel.numberOfLines = 0
        contentStack.addArrangedSubview(descLabel)

        // 01. Lab Logo Card
        let logoCard = buildSquareAssetCard(
            index: "01",
            title: "Lab Logo",
            subtitle: "Square image displayed on patient invoices & lab receipts.",
            previewContainer: setupLogoPreviewBox(),
            statusLabel: logoStatusLabel,
            uploadButton: btnUploadLogo,
            removeButton: btnRemoveLogo,
            uploadAction: #selector(pickLogoTapped),
            removeAction: #selector(removeLogoTapped)
        )
        contentStack.addArrangedSubview(logoCard)

        // 02. Letterhead Header Card
        let letterheadCard = buildBannerAssetCard(
            index: "02",
            title: "Letterhead Header",
            subtitle: "Full-width top header banner for PDF reports & invoice printouts.",
            bannerHeight: 120,
            previewBox: letterheadPreviewBox,
            previewImg: letterheadPreviewImg,
            fallbackLabel: letterheadFallbackLabel,
            statusLabel: letterheadStatusLabel,
            uploadButton: btnUploadLetterhead,
            removeButton: btnRemoveLetterhead,
            uploadAction: #selector(pickLetterheadTapped),
            removeAction: #selector(removeLetterheadTapped)
        )
        contentStack.addArrangedSubview(letterheadCard)

        // 03. Footer Image Card
        let footerCard = buildBannerAssetCard(
            index: "03",
            title: "Footer Image",
            subtitle: "Full-width bottom footer banner with accreditations & contact info.",
            bannerHeight: 105,
            previewBox: footerPreviewBox,
            previewImg: footerPreviewImg,
            fallbackLabel: footerFallbackLabel,
            statusLabel: footerStatusLabel,
            uploadButton: btnUploadFooter,
            removeButton: btnRemoveFooter,
            uploadAction: #selector(pickFooterTapped),
            removeAction: #selector(removeFooterTapped)
        )
        contentStack.addArrangedSubview(footerCard)

        // 04. Signature Card
        let signatureCard = buildSquareAssetCard(
            index: "04",
            title: "Signature",
            subtitle: "Authorized signatory image for digital validation.",
            previewContainer: setupSignaturePreviewBox(),
            statusLabel: signatureStatusLabel,
            uploadButton: btnUploadSignature,
            removeButton: btnRemoveSignature,
            uploadAction: #selector(pickSignatureTapped),
            removeAction: #selector(removeSignatureTapped)
        )
        contentStack.addArrangedSubview(signatureCard)

        // Save Branding Action
        buildSaveSection()
    }

    private func setupLogoPreviewBox() -> UIView {
        logoPreviewBox.backgroundColor = UIColor(red: 250/255, green: 250/255, blue: 252/255, alpha: 1)
        logoPreviewBox.layer.cornerRadius = 18
        logoPreviewBox.layer.borderWidth = 1.5
        logoPreviewBox.layer.borderColor = Self.borderSlate.cgColor
        logoPreviewBox.translatesAutoresizingMaskIntoConstraints = false
        logoPreviewBox.isUserInteractionEnabled = true
        logoPreviewBox.addGestureRecognizer(UITapGestureRecognizer(target: self, action: #selector(pickLogoTapped)))

        logoPreviewImg.contentMode = .scaleAspectFit
        logoPreviewImg.clipsToBounds = true
        logoPreviewImg.image = UIImage(systemName: "photo.badge.plus")?.withRenderingMode(.alwaysTemplate)
        logoPreviewImg.tintColor = UIColor(red: 148/255, green: 163/255, blue: 184/255, alpha: 1)
        logoPreviewImg.translatesAutoresizingMaskIntoConstraints = false
        logoPreviewBox.addSubview(logoPreviewImg)

        logoFallbackLabel.text = "Tap to choose"
        logoFallbackLabel.font = .systemFont(ofSize: 11, weight: .bold)
        logoFallbackLabel.textColor = UIColor(red: 148/255, green: 163/255, blue: 184/255, alpha: 1)
        logoFallbackLabel.translatesAutoresizingMaskIntoConstraints = false
        logoPreviewBox.addSubview(logoFallbackLabel)

        NSLayoutConstraint.activate([
            logoPreviewBox.widthAnchor.constraint(equalToConstant: 130),
            logoPreviewBox.heightAnchor.constraint(equalToConstant: 130),

            logoPreviewImg.centerXAnchor.constraint(equalTo: logoPreviewBox.centerXAnchor),
            logoPreviewImg.centerYAnchor.constraint(equalTo: logoPreviewBox.centerYAnchor, constant: -10),
            logoPreviewImg.widthAnchor.constraint(equalToConstant: 40),
            logoPreviewImg.heightAnchor.constraint(equalToConstant: 40),

            logoFallbackLabel.topAnchor.constraint(equalTo: logoPreviewImg.bottomAnchor, constant: 6),
            logoFallbackLabel.centerXAnchor.constraint(equalTo: logoPreviewBox.centerXAnchor)
        ])

        return logoPreviewBox
    }

    private func setupSignaturePreviewBox() -> UIView {
        signaturePreviewBox.backgroundColor = UIColor(red: 250/255, green: 250/255, blue: 252/255, alpha: 1)
        signaturePreviewBox.layer.cornerRadius = 18
        signaturePreviewBox.layer.borderWidth = 1.5
        signaturePreviewBox.layer.borderColor = Self.borderSlate.cgColor
        signaturePreviewBox.translatesAutoresizingMaskIntoConstraints = false
        signaturePreviewBox.isUserInteractionEnabled = true
        signaturePreviewBox.addGestureRecognizer(UITapGestureRecognizer(target: self, action: #selector(pickSignatureTapped)))

        signaturePreviewImg.contentMode = .scaleAspectFit
        signaturePreviewImg.clipsToBounds = true
        signaturePreviewImg.image = UIImage(systemName: "signature")?.withRenderingMode(.alwaysTemplate)
        signaturePreviewImg.tintColor = UIColor(red: 148/255, green: 163/255, blue: 184/255, alpha: 1)
        signaturePreviewImg.translatesAutoresizingMaskIntoConstraints = false
        signaturePreviewBox.addSubview(signaturePreviewImg)

        signatureFallbackLabel.text = "Tap to choose"
        signatureFallbackLabel.font = .systemFont(ofSize: 11, weight: .bold)
        signatureFallbackLabel.textColor = UIColor(red: 148/255, green: 163/255, blue: 184/255, alpha: 1)
        signatureFallbackLabel.translatesAutoresizingMaskIntoConstraints = false
        signaturePreviewBox.addSubview(signatureFallbackLabel)

        NSLayoutConstraint.activate([
            signaturePreviewBox.widthAnchor.constraint(equalToConstant: 210),
            signaturePreviewBox.heightAnchor.constraint(equalToConstant: 90),

            signaturePreviewImg.centerXAnchor.constraint(equalTo: signaturePreviewBox.centerXAnchor),
            signaturePreviewImg.centerYAnchor.constraint(equalTo: signaturePreviewBox.centerYAnchor, constant: -8),
            signaturePreviewImg.widthAnchor.constraint(equalToConstant: 36),
            signaturePreviewImg.heightAnchor.constraint(equalToConstant: 36),

            signatureFallbackLabel.topAnchor.constraint(equalTo: signaturePreviewImg.bottomAnchor, constant: 4),
            signatureFallbackLabel.centerXAnchor.constraint(equalTo: signaturePreviewBox.centerXAnchor)
        ])

        return signaturePreviewBox
    }

    private func buildSquareAssetCard(
        index: String,
        title: String,
        subtitle: String,
        previewContainer: UIView,
        statusLabel: UILabel,
        uploadButton: UIButton,
        removeButton: UIButton,
        uploadAction: Selector,
        removeAction: Selector
    ) -> UIView {
        let card = createWhiteCard()

        // Index Badge
        let indexBadge = UILabel()
        indexBadge.text = index
        indexBadge.font = .systemFont(ofSize: 11, weight: .bold)
        indexBadge.textColor = UIColor(red: 29/255, green: 78/255, blue: 216/255, alpha: 1)
        indexBadge.backgroundColor = UIColor(red: 219/255, green: 234/255, blue: 254/255, alpha: 1)
        indexBadge.layer.cornerRadius = 6
        indexBadge.clipsToBounds = true
        indexBadge.textAlignment = .center
        indexBadge.translatesAutoresizingMaskIntoConstraints = false
        indexBadge.widthAnchor.constraint(equalToConstant: 26).isActive = true
        indexBadge.heightAnchor.constraint(equalToConstant: 22).isActive = true

        let titleLbl = UILabel()
        titleLbl.text = title
        titleLbl.font = .systemFont(ofSize: 16, weight: .bold)
        titleLbl.textColor = Self.textDark

        let headerRow = UIStackView(arrangedSubviews: [indexBadge, titleLbl])
        headerRow.axis = .horizontal
        headerRow.spacing = 8
        headerRow.alignment = .center

        let subtitleLbl = UILabel()
        subtitleLbl.text = subtitle
        subtitleLbl.font = .systemFont(ofSize: 12.5, weight: .regular)
        subtitleLbl.textColor = Self.textMuted
        subtitleLbl.numberOfLines = 0

        statusLabel.text = "No file chosen"
        statusLabel.font = .systemFont(ofSize: 12, weight: .regular)
        statusLabel.textColor = UIColor(red: 148/255, green: 163/255, blue: 184/255, alpha: 1)
        statusLabel.textAlignment = .center

        stylePrimaryButton(uploadButton, title: "Choose File")
        uploadButton.addTarget(self, action: uploadAction, for: .touchUpInside)

        removeButton.setTitle("Remove", for: .normal)
        removeButton.setTitleColor(UIColor(red: 239/255, green: 68/255, blue: 68/255, alpha: 1), for: .normal)
        removeButton.titleLabel?.font = .systemFont(ofSize: 13, weight: .bold)
        removeButton.isHidden = true
        removeButton.addTarget(self, action: removeAction, for: .touchUpInside)

        let actionsStack = UIStackView(arrangedSubviews: [uploadButton, removeButton])
        actionsStack.axis = .horizontal
        actionsStack.spacing = 16
        actionsStack.alignment = .center

        let cardStack = UIStackView(arrangedSubviews: [headerRow, subtitleLbl, previewContainer, statusLabel, actionsStack])
        cardStack.axis = .vertical
        cardStack.spacing = 10
        cardStack.alignment = .center
        cardStack.translatesAutoresizingMaskIntoConstraints = false

        card.addSubview(cardStack)
        NSLayoutConstraint.activate([
            cardStack.topAnchor.constraint(equalTo: card.topAnchor, constant: 18),
            cardStack.bottomAnchor.constraint(equalTo: card.bottomAnchor, constant: -18),
            cardStack.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 18),
            cardStack.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -18),

            headerRow.widthAnchor.constraint(equalTo: cardStack.widthAnchor),
            subtitleLbl.widthAnchor.constraint(equalTo: cardStack.widthAnchor),
            uploadButton.widthAnchor.constraint(greaterThanOrEqualToConstant: 140)
        ])

        return card
    }

    private func buildBannerAssetCard(
        index: String,
        title: String,
        subtitle: String,
        bannerHeight: CGFloat,
        previewBox: UIView,
        previewImg: UIImageView,
        fallbackLabel: UILabel,
        statusLabel: UILabel,
        uploadButton: UIButton,
        removeButton: UIButton,
        uploadAction: Selector,
        removeAction: Selector
    ) -> UIView {
        let card = createWhiteCard()

        // Index Badge
        let indexBadge = UILabel()
        indexBadge.text = index
        indexBadge.font = .systemFont(ofSize: 11, weight: .bold)
        indexBadge.textColor = UIColor(red: 29/255, green: 78/255, blue: 216/255, alpha: 1)
        indexBadge.backgroundColor = UIColor(red: 219/255, green: 234/255, blue: 254/255, alpha: 1)
        indexBadge.layer.cornerRadius = 6
        indexBadge.clipsToBounds = true
        indexBadge.textAlignment = .center
        indexBadge.translatesAutoresizingMaskIntoConstraints = false
        indexBadge.widthAnchor.constraint(equalToConstant: 26).isActive = true
        indexBadge.heightAnchor.constraint(equalToConstant: 22).isActive = true

        let titleLbl = UILabel()
        titleLbl.text = title
        titleLbl.font = .systemFont(ofSize: 16, weight: .bold)
        titleLbl.textColor = Self.textDark

        let headerRow = UIStackView(arrangedSubviews: [indexBadge, titleLbl])
        headerRow.axis = .horizontal
        headerRow.spacing = 8
        headerRow.alignment = .center

        let subtitleLbl = UILabel()
        subtitleLbl.text = subtitle
        subtitleLbl.font = .systemFont(ofSize: 12.5, weight: .regular)
        subtitleLbl.textColor = Self.textMuted
        subtitleLbl.numberOfLines = 0

        // Banner Box
        previewBox.backgroundColor = UIColor(red: 250/255, green: 250/255, blue: 252/255, alpha: 1)
        previewBox.layer.cornerRadius = 16
        previewBox.layer.borderWidth = 1.5
        previewBox.layer.borderColor = Self.borderSlate.cgColor
        previewBox.clipsToBounds = true
        previewBox.translatesAutoresizingMaskIntoConstraints = false
        previewBox.isUserInteractionEnabled = true
        previewBox.addGestureRecognizer(UITapGestureRecognizer(target: self, action: uploadAction))

        previewImg.contentMode = .scaleAspectFill
        previewImg.clipsToBounds = true
        previewImg.isHidden = true
        previewImg.translatesAutoresizingMaskIntoConstraints = false
        previewBox.addSubview(previewImg)

        fallbackLabel.text = "Tap to choose banner"
        fallbackLabel.font = .systemFont(ofSize: 12, weight: .bold)
        fallbackLabel.textColor = UIColor(red: 148/255, green: 163/255, blue: 184/255, alpha: 1)
        fallbackLabel.translatesAutoresizingMaskIntoConstraints = false
        previewBox.addSubview(fallbackLabel)

        NSLayoutConstraint.activate([
            previewBox.heightAnchor.constraint(equalToConstant: bannerHeight),
            previewImg.topAnchor.constraint(equalTo: previewBox.topAnchor),
            previewImg.bottomAnchor.constraint(equalTo: previewBox.bottomAnchor),
            previewImg.leadingAnchor.constraint(equalTo: previewBox.leadingAnchor),
            previewImg.trailingAnchor.constraint(equalTo: previewBox.trailingAnchor),

            fallbackLabel.centerXAnchor.constraint(equalTo: previewBox.centerXAnchor),
            fallbackLabel.centerYAnchor.constraint(equalTo: previewBox.centerYAnchor)
        ])

        statusLabel.text = "No file chosen"
        statusLabel.font = .systemFont(ofSize: 12, weight: .regular)
        statusLabel.textColor = UIColor(red: 148/255, green: 163/255, blue: 184/255, alpha: 1)
        statusLabel.textAlignment = .center

        stylePrimaryButton(uploadButton, title: "Choose File")
        uploadButton.addTarget(self, action: uploadAction, for: .touchUpInside)

        removeButton.setTitle("Remove", for: .normal)
        removeButton.setTitleColor(UIColor(red: 239/255, green: 68/255, blue: 68/255, alpha: 1), for: .normal)
        removeButton.titleLabel?.font = .systemFont(ofSize: 13, weight: .bold)
        removeButton.isHidden = true
        removeButton.addTarget(self, action: removeAction, for: .touchUpInside)

        let actionsStack = UIStackView(arrangedSubviews: [uploadButton, removeButton])
        actionsStack.axis = .horizontal
        actionsStack.spacing = 16
        actionsStack.alignment = .center

        let cardStack = UIStackView(arrangedSubviews: [headerRow, subtitleLbl, previewBox, statusLabel, actionsStack])
        cardStack.axis = .vertical
        cardStack.spacing = 10
        cardStack.alignment = .center
        cardStack.translatesAutoresizingMaskIntoConstraints = false

        card.addSubview(cardStack)
        NSLayoutConstraint.activate([
            cardStack.topAnchor.constraint(equalTo: card.topAnchor, constant: 18),
            cardStack.bottomAnchor.constraint(equalTo: card.bottomAnchor, constant: -18),
            cardStack.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 18),
            cardStack.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -18),

            headerRow.widthAnchor.constraint(equalTo: cardStack.widthAnchor),
            subtitleLbl.widthAnchor.constraint(equalTo: cardStack.widthAnchor),
            previewBox.widthAnchor.constraint(equalTo: cardStack.widthAnchor),
            uploadButton.widthAnchor.constraint(greaterThanOrEqualToConstant: 140)
        ])

        return card
    }

    private func buildSaveSection() {
        let saveCard = createWhiteCard()

        pendingChangesHint.text = "No pending changes to save"
        pendingChangesHint.font = .systemFont(ofSize: 12.5, weight: .regular)
        pendingChangesHint.textColor = Self.textMuted
        pendingChangesHint.textAlignment = .center

        saveButton.setTitle("Save Branding", for: .normal)
        saveButton.titleLabel?.font = .systemFont(ofSize: 16, weight: .bold)
        saveButton.backgroundColor = Self.brandSapphire
        saveButton.setTitleColor(.white, for: .normal)
        saveButton.layer.cornerRadius = 16
        saveButton.translatesAutoresizingMaskIntoConstraints = false
        saveButton.heightAnchor.constraint(equalToConstant: 56).isActive = true
        saveButton.addTarget(self, action: #selector(handleSave), for: .touchUpInside)

        saveSpinner.color = Self.brandSapphire
        saveSpinner.hidesWhenStopped = true
        saveSpinner.translatesAutoresizingMaskIntoConstraints = false

        statusLabel.font = .systemFont(ofSize: 13, weight: .bold)
        statusLabel.textAlignment = .center
        statusLabel.isHidden = true
        statusLabel.numberOfLines = 0

        let saveStack = UIStackView(arrangedSubviews: [pendingChangesHint, saveButton, saveSpinner, statusLabel])
        saveStack.axis = .vertical
        saveStack.spacing = 12
        saveStack.alignment = .fill
        saveStack.translatesAutoresizingMaskIntoConstraints = false

        saveCard.addSubview(saveStack)
        NSLayoutConstraint.activate([
            saveStack.topAnchor.constraint(equalTo: saveCard.topAnchor, constant: 18),
            saveStack.bottomAnchor.constraint(equalTo: saveCard.bottomAnchor, constant: -18),
            saveStack.leadingAnchor.constraint(equalTo: saveCard.leadingAnchor, constant: 18),
            saveStack.trailingAnchor.constraint(equalTo: saveCard.trailingAnchor, constant: -18)
        ])

        contentStack.addArrangedSubview(saveCard)
    }

    private func createWhiteCard() -> UIView {
        let card = UIView()
        card.backgroundColor = .white
        card.layer.cornerRadius = 18
        card.layer.borderWidth = 1
        card.layer.borderColor = Self.borderSlate.cgColor
        card.layer.shadowColor = UIColor.black.cgColor
        card.layer.shadowOpacity = 0.04
        card.layer.shadowRadius = 8
        card.layer.shadowOffset = CGSize(width: 0, height: 2)
        card.translatesAutoresizingMaskIntoConstraints = false
        return card
    }

    private func stylePrimaryButton(_ btn: UIButton, title: String) {
        btn.setTitle(title, for: .normal)
        btn.titleLabel?.font = .systemFont(ofSize: 13, weight: .bold)
        btn.setTitleColor(.white, for: .normal)
        btn.backgroundColor = Self.brandSapphire
        btn.layer.cornerRadius = 14
        btn.contentEdgeInsets = UIEdgeInsets(top: 10, left: 24, bottom: 10, right: 24)
        btn.translatesAutoresizingMaskIntoConstraints = false
        btn.heightAnchor.constraint(equalToConstant: 42).isActive = true
    }

    @objc private func handleBack() {
        dismiss(animated: true, completion: nil)
    }

    @objc private func handleRefresh() {
        fetchBranding(manual: true)
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MARK: – Pending Changes State
    // ─────────────────────────────────────────────────────────────────────────
    private func hasPendingChanges() -> Bool {
        return currentLogo != initialLogo ||
               currentLetterhead != initialLetterhead ||
               currentFooter != initialFooter ||
               currentSignature != initialSignature
    }

    private func updatePendingState() {
        var changes = 0
        if currentLogo != initialLogo { changes += 1 }
        if currentLetterhead != initialLetterhead { changes += 1 }
        if currentFooter != initialFooter { changes += 1 }
        if currentSignature != initialSignature { changes += 1 }

        if changes > 0 {
            saveButton.isEnabled = true
            saveButton.alpha = 1.0
            pendingChangesHint.text = "● \(changes) change(s) ready to upload & sync with web"
            pendingChangesHint.textColor = Self.brandSapphire
        } else {
            saveButton.isEnabled = false
            saveButton.alpha = 0.55
            pendingChangesHint.text = "No pending changes to save"
            pendingChangesHint.textColor = Self.textMuted
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MARK: – Photo Pickers & Safe Downsampling
    // ─────────────────────────────────────────────────────────────────────────
    @objc private func pickLogoTapped() { openImagePicker(assetType: 1) }
    @objc private func pickLetterheadTapped() { openImagePicker(assetType: 2) }
    @objc private func pickFooterTapped() { openImagePicker(assetType: 3) }
    @objc private func pickSignatureTapped() { openImagePicker(assetType: 4) }

    @objc private func removeLogoTapped() {
        currentLogo = ""
        metaLogo = ""
        imgLogo = nil
        renderLogoUI()
        updatePendingState()
    }

    @objc private func removeLetterheadTapped() {
        currentLetterhead = ""
        metaLetterhead = ""
        imgLetterhead = nil
        renderLetterheadUI()
        updatePendingState()
    }

    @objc private func removeFooterTapped() {
        currentFooter = ""
        metaFooter = ""
        imgFooter = nil
        renderFooterUI()
        updatePendingState()
    }

    @objc private func removeSignatureTapped() {
        currentSignature = ""
        metaSignature = ""
        imgSignature = nil
        renderSignatureUI()
        updatePendingState()
    }

    private func openImagePicker(assetType: Int) {
        currentPickingAsset = assetType
        let picker = UIImagePickerController()
        picker.delegate = self
        picker.sourceType = .photoLibrary
        picker.allowsEditing = false
        present(picker, animated: true)
    }

    func imagePickerController(_ picker: UIImagePickerController, didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey : Any]) {
        picker.dismiss(animated: true)

        guard let image = info[.originalImage] as? UIImage else { return }

        // Downsample to max 1400x1400 to prevent payload timeouts
        let downsampled = downsampleImage(image, maxDimension: 1400)
        guard let data = downsampled.jpegData(compressionQuality: 0.85) ?? downsampled.pngData() else { return }
        let base64String = "data:image/png;base64," + data.base64EncodedString()

        let sizeKB = Double(data.count) / 1024.0
        let meta = String(format: "image.png • %.0f KB", sizeKB)

        if currentPickingAsset == 1 {
            currentLogo = base64String
            metaLogo = meta
            imgLogo = downsampled
            renderLogoUI()
        } else if currentPickingAsset == 2 {
            currentLetterhead = base64String
            metaLetterhead = meta
            imgLetterhead = downsampled
            renderLetterheadUI()
        } else if currentPickingAsset == 3 {
            currentFooter = base64String
            metaFooter = meta
            imgFooter = downsampled
            renderFooterUI()
        } else if currentPickingAsset == 4 {
            currentSignature = base64String
            metaSignature = meta
            imgSignature = downsampled
            renderSignatureUI()
        }

        updatePendingState()
    }

    func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
        picker.dismiss(animated: true)
    }

    private func downsampleImage(_ image: UIImage, maxDimension: CGFloat) -> UIImage {
        let size = image.size
        if size.width <= maxDimension && size.height <= maxDimension {
            return image
        }
        let ratio = min(maxDimension / size.width, maxDimension / size.height)
        let newSize = CGSize(width: size.width * ratio, height: size.height * ratio)

        UIGraphicsBeginImageContextWithOptions(newSize, false, 1.0)
        image.draw(in: CGRect(origin: .zero, size: newSize))
        let resized = UIGraphicsGetImageFromCurrentImageContext() ?? image
        UIGraphicsEndImageContext()
        return resized
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MARK: – UI Renderers (White Font Buttons)
    // ─────────────────────────────────────────────────────────────────────────
    private func renderLogoUI() {
        if hasAsset(currentLogo) {
            if let img = imgLogo {
                logoPreviewImg.image = img
                logoPreviewImg.tintColor = nil
            }
            logoFallbackLabel.isHidden = true
            btnUploadLogo.setTitle("Change File", for: .normal)
            btnUploadLogo.setTitleColor(.white, for: .normal)
            btnRemoveLogo.isHidden = false
            logoStatusLabel.text = !metaLogo.isEmpty ? metaLogo : "Logo active"
            logoStatusLabel.textColor = Self.textDark
        } else {
            logoPreviewImg.image = UIImage(systemName: "photo.badge.plus")?.withRenderingMode(.alwaysTemplate)
            logoPreviewImg.tintColor = UIColor(red: 148/255, green: 163/255, blue: 184/255, alpha: 1)
            logoFallbackLabel.isHidden = false
            btnUploadLogo.setTitle("Choose File", for: .normal)
            btnUploadLogo.setTitleColor(.white, for: .normal)
            btnRemoveLogo.isHidden = true
            logoStatusLabel.text = "No file chosen"
            logoStatusLabel.textColor = UIColor(red: 148/255, green: 163/255, blue: 184/255, alpha: 1)
        }
    }

    private func renderLetterheadUI() {
        if hasAsset(currentLetterhead) {
            if let img = imgLetterhead {
                letterheadPreviewImg.image = img
                letterheadPreviewImg.isHidden = false
            }
            letterheadFallbackLabel.isHidden = true
            btnUploadLetterhead.setTitle("Change File", for: .normal)
            btnUploadLetterhead.setTitleColor(.white, for: .normal)
            btnRemoveLetterhead.isHidden = false
            letterheadStatusLabel.text = !metaLetterhead.isEmpty ? metaLetterhead : "Header banner active"
            letterheadStatusLabel.textColor = Self.textDark
        } else {
            letterheadPreviewImg.image = nil
            letterheadPreviewImg.isHidden = true
            letterheadFallbackLabel.isHidden = false
            btnUploadLetterhead.setTitle("Choose File", for: .normal)
            btnUploadLetterhead.setTitleColor(.white, for: .normal)
            btnRemoveLetterhead.isHidden = true
            letterheadStatusLabel.text = "No file chosen"
            letterheadStatusLabel.textColor = UIColor(red: 148/255, green: 163/255, blue: 184/255, alpha: 1)
        }
    }

    private func renderFooterUI() {
        if hasAsset(currentFooter) {
            if let img = imgFooter {
                footerPreviewImg.image = img
                footerPreviewImg.isHidden = false
            }
            footerFallbackLabel.isHidden = true
            btnUploadFooter.setTitle("Change File", for: .normal)
            btnUploadFooter.setTitleColor(.white, for: .normal)
            btnRemoveFooter.isHidden = false
            footerStatusLabel.text = !metaFooter.isEmpty ? metaFooter : "Footer banner active"
            footerStatusLabel.textColor = Self.textDark
        } else {
            footerPreviewImg.image = nil
            footerPreviewImg.isHidden = true
            footerFallbackLabel.isHidden = false
            btnUploadFooter.setTitle("Choose File", for: .normal)
            btnUploadFooter.setTitleColor(.white, for: .normal)
            btnRemoveFooter.isHidden = true
            footerStatusLabel.text = "No file chosen"
            footerStatusLabel.textColor = UIColor(red: 148/255, green: 163/255, blue: 184/255, alpha: 1)
        }
    }

    private func renderSignatureUI() {
        if hasAsset(currentSignature) {
            if let img = imgSignature {
                signaturePreviewImg.image = img
                signaturePreviewImg.tintColor = nil
            }
            signatureFallbackLabel.isHidden = true
            btnUploadSignature.setTitle("Change File", for: .normal)
            btnUploadSignature.setTitleColor(.white, for: .normal)
            btnRemoveSignature.isHidden = false
            signatureStatusLabel.text = !metaSignature.isEmpty ? metaSignature : "Signature active"
            signatureStatusLabel.textColor = Self.textDark
        } else {
            signaturePreviewImg.image = UIImage(systemName: "signature")?.withRenderingMode(.alwaysTemplate)
            signaturePreviewImg.tintColor = UIColor(red: 148/255, green: 163/255, blue: 184/255, alpha: 1)
            signatureFallbackLabel.isHidden = false
            btnUploadSignature.setTitle("Choose File", for: .normal)
            btnUploadSignature.setTitleColor(.white, for: .normal)
            btnRemoveSignature.isHidden = true
            signatureStatusLabel.text = "No file chosen"
            signatureStatusLabel.textColor = UIColor(red: 148/255, green: 163/255, blue: 184/255, alpha: 1)
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MARK: – Network: Fetch & Save
    // ─────────────────────────────────────────────────────────────────────────
    private func fetchBranding(manual: Bool) {
        loadingSpinner.startAnimating()

        guard let url = URL(string: "\(baseURL)/api/workspace/settings") else { return }
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        applyAuth(to: &request)

        URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            DispatchQueue.main.async {
                self?.loadingSpinner.stopAnimating()
                guard let data = data, error == nil else { return }

                do {
                    if let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
                       let lab = json["lab"] as? [String: Any] {
                        self?.fetchedLabData = lab
                        self?.applyServerBaseline(lab: lab)
                        self?.statusLabel.isHidden = true
                    }
                } catch {
                    print("Error decoding branding JSON: \(error)")
                }
            }
        }.resume()
    }

    private func applyServerBaseline(lab: [String: Any]) {
        initialLogo       = sanitize(lab["logo"])
        initialLetterhead = sanitize(lab["letterhead"])
        initialFooter     = sanitize(lab["footer"])
        initialSignature  = sanitize(lab["signature"])

        currentLogo       = initialLogo
        currentLetterhead = initialLetterhead
        currentFooter     = initialFooter
        currentSignature  = initialSignature

        loadRemoteOrBase64(currentLogo) { [weak self] img in
            self?.imgLogo = img
            self?.renderLogoUI()
        }
        loadRemoteOrBase64(currentLetterhead) { [weak self] img in
            self?.imgLetterhead = img
            self?.renderLetterheadUI()
        }
        loadRemoteOrBase64(currentFooter) { [weak self] img in
            self?.imgFooter = img
            self?.renderFooterUI()
        }
        loadRemoteOrBase64(currentSignature) { [weak self] img in
            self?.imgSignature = img
            self?.renderSignatureUI()
        }

        updatePendingState()
    }

    private func loadRemoteOrBase64(_ source: String, completion: @escaping (UIImage?) -> Void) {
        guard hasAsset(source) else {
            completion(nil)
            return
        }

        if source.hasPrefix("data:image"), let commaIdx = source.firstIndex(of: ",") {
            let base64Part = String(source[source.index(after: commaIdx)...])
            if let data = Data(base64Encoded: base64Part, options: .ignoreUnknownCharacters),
               let img = UIImage(data: data) {
                completion(img)
                return
            }
        }

        let fullUrl = source.hasPrefix("/") ? "\(baseURL)\(source)" : source
        guard let url = URL(string: fullUrl) else {
            completion(nil)
            return
        }

        URLSession.shared.dataTask(with: url) { data, _, _ in
            guard let data = data, let img = UIImage(data: data) else {
                DispatchQueue.main.async { completion(nil) }
                return
            }
            DispatchQueue.main.async { completion(img) }
        }.resume()
    }

    @objc private func handleSave() {
        guard hasPendingChanges() else {
            let alert = UIAlertController(title: "No Changes", message: "Please choose a file or remove an asset before saving.", preferredStyle: .alert)
            alert.addAction(UIAlertAction(title: "OK", style: .default))
            present(alert, animated: true)
            return
        }

        saveButton.isEnabled = false
        saveSpinner.startAnimating()
        statusLabel.isHidden = true

        guard let url = URL(string: "\(baseURL)/api/workspace/settings") else { return }
        var request = URLRequest(url: url)
        request.httpMethod = "PUT"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        applyAuth(to: &request)

        var payload: [String: Any] = fetchedLabData ?? [:]
        payload["logo"] = hasAsset(currentLogo) ? currentLogo : NSNull()
        payload["letterhead"] = hasAsset(currentLetterhead) ? currentLetterhead : NSNull()
        payload["footer"] = hasAsset(currentFooter) ? currentFooter : NSNull()
        payload["signature"] = hasAsset(currentSignature) ? currentSignature : NSNull()

        do {
            request.httpBody = try JSONSerialization.data(withJSONObject: payload)
        } catch {
            saveButton.isEnabled = true
            saveSpinner.stopAnimating()
            return
        }

        URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            DispatchQueue.main.async {
                self?.saveSpinner.stopAnimating()

                let httpResponse = response as? HTTPURLResponse
                if let code = httpResponse?.statusCode, (200...299).contains(code) {
                    self?.initialLogo = self?.currentLogo ?? ""
                    self?.initialLetterhead = self?.currentLetterhead ?? ""
                    self?.initialFooter = self?.currentFooter ?? ""
                    self?.initialSignature = self?.currentSignature ?? ""

                    self?.renderLogoUI()
                    self?.renderLetterheadUI()
                    self?.renderFooterUI()
                    self?.renderSignatureUI()

                    self?.updatePendingState()
                    self?.showStatus("✓ Branding saved & synced with website successfully!", success: true)
                } else {
                    self?.saveButton.isEnabled = true
                    self?.showStatus("Failed to save: HTTP \(httpResponse?.statusCode ?? 0)", success: false)
                }
            }
        }.resume()
    }

    private func showStatus(_ text: String, success: Bool) {
        statusLabel.text = text
        statusLabel.textColor = success ? UIColor(red: 5/255, green: 150/255, blue: 105/255, alpha: 1) : UIColor(red: 220/255, green: 38/255, blue: 38/255, alpha: 1)
        statusLabel.isHidden = false
    }

    private func applyAuth(to request: inout URLRequest) {
        if let token = UserDefaults.standard.string(forKey: "auth_token"), !token.isEmpty {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        if let cookies = HTTPCookieStorage.shared.cookies(for: URL(string: baseURL)!) {
            let cookieHeaders = HTTPCookie.requestHeaderFields(with: cookies)
            for (header, val) in cookieHeaders {
                request.setValue(val, forHTTPHeaderField: header)
            }
        }
    }
}
