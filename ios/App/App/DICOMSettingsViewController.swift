import UIKit

// MARK: - PaddedTextField
class DICOMInputField: UITextField {
    var textPadding = UIEdgeInsets(top: 10, left: 12, bottom: 10, right: 12)

    init(placeholderText: String) {
        super.init(frame: .zero)
        self.placeholder = placeholderText
        self.backgroundColor = UIColor(red: 0.98, green: 0.98, blue: 0.99, alpha: 1.0)
        self.layer.cornerRadius = 10
        self.layer.borderWidth = 1
        self.layer.borderColor = UIColor(red: 0.88, green: 0.90, blue: 0.94, alpha: 1.0).cgColor
        self.font = UIFont.systemFont(ofSize: 13.5)
        self.textColor = UIColor(red: 0.06, green: 0.09, blue: 0.16, alpha: 1.0)
        self.autocorrectionType = .no
        self.autocapitalizationType = .none
        self.translatesAutoresizingMaskIntoConstraints = false
        self.heightAnchor.constraint(equalToConstant: 44).isActive = true
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override func textRect(forBounds bounds: CGRect) -> CGRect {
        return bounds.inset(by: textPadding)
    }

    override func placeholderRect(forBounds bounds: CGRect) -> CGRect {
        return bounds.inset(by: textPadding)
    }

    override func editingRect(forBounds bounds: CGRect) -> CGRect {
        return bounds.inset(by: textPadding)
    }
}

// MARK: - DICOMSettingsViewController
// Full parity with web module: /workspace/radiology/settings/dicom
// Real-time, user-specific two-way synchronization with backend APIs:
// - GET  /api/workspace/radiology/settings/dicom
// - PUT  /api/workspace/radiology/settings/dicom
// - POST /api/workspace/radiology/settings/dicom (C-ECHO ping test)

class DICOMSettingsViewController: UIViewController {

    private let baseURL = "https://app.patholab.cloud"

    // MARK: - UI Components
    private let navBar = UIView()
    private let btnBack = UIButton(type: .system)
    private let btnRefresh = UIButton(type: .system)
    private let titleLabel = UILabel()
    private let subtitleLabel = UILabel()

    private let scrollView = UIScrollView()
    private let contentView = UIView()

    // Section 1: Local RIS Node
    private let inputLocalAeTitle = DICOMInputField(placeholderText: "PATHORIS")
    private let inputLocalPort    = DICOMInputField(placeholderText: "11112")

    // Section 2: Primary PACS Archive
    private let inputPacsAeTitle   = DICOMInputField(placeholderText: "ORTHANC")
    private let inputPacsIpAddress = DICOMInputField(placeholderText: "192.168.1.100")
    private let inputPacsPort      = DICOMInputField(placeholderText: "4242")

    // C-ECHO Ping UI
    private let cardConnectionStatus = UIView()
    private let iconStatusView       = UIImageView()
    private let spinnerPing          = UIActivityIndicatorView(style: .medium)
    private let lblStatusTitle       = UILabel()
    private let lblStatusDesc        = UILabel()
    private let btnTestCEcho         = UIButton(type: .system)

    // Section 3: Diagnostic Web Viewer (WADO)
    private let inputViewerBaseUrl = DICOMInputField(placeholderText: "http://192.168.1.100:8042/viewer?StudyInstanceUID=")

    // Section 4: Modality Worklist (MWL)
    private let cardMwlSection      = UIView()
    private let badgeMwlStatus      = UILabel()
    private let dotMwlIndicator     = UIView()
    private let stackMwlInputs      = UIStackView()
    private let inputMwlAeTitle     = DICOMInputField(placeholderText: "RIS_MWL")
    private let inputMwlPort        = DICOMInputField(placeholderText: "11113")
    private let btnToggleMwlService = UIButton(type: .system)

    // Sticky Save Footer
    private let footerView       = UIView()
    private let btnSaveConfig    = UIButton(type: .system)
    private let spinnerSave      = UIActivityIndicatorView(style: .medium)
    private let spinnerPageLoad  = UIActivityIndicatorView(style: .large)

    // MARK: - State
    private var isMwlEnabled: Bool = true
    private enum PacsStatus {
        case unknown, testing, connected, failed
    }
    private var currentPacsStatus: PacsStatus = .unknown

    override func viewDidLoad() {
        super.viewDidLoad()
        setupUI()
        fetchDicomSettings(isManual: false)
    }

    private func setupUI() {
        view.backgroundColor = UIColor(red: 0.97, green: 0.98, blue: 0.99, alpha: 1.0)

        setupNavBar()
        setupFooter()
        setupScrollView()
        setupContentSections()
        updateMwlUI()
        updatePacsStatusUI(status: .unknown, message: "Not tested recently")
    }

    // MARK: - Top Navigation Bar
    private func setupNavBar() {
        navBar.backgroundColor = UIColor(red: 0.08, green: 0.28, blue: 0.72, alpha: 1.0)
        navBar.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(navBar)

        let safeTop = UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }.first?.windows.first?.safeAreaInsets.top ?? 44

        btnBack.setImage(UIImage(systemName: "chevron.left"), for: .normal)
        btnBack.tintColor = .white
        btnBack.backgroundColor = UIColor.white.withAlphaComponent(0.18)
        btnBack.layer.cornerRadius = 20
        btnBack.addTarget(self, action: #selector(backTapped), for: .touchUpInside)
        btnBack.translatesAutoresizingMaskIntoConstraints = false
        navBar.addSubview(btnBack)

        titleLabel.text = "DICOM & PACS Settings"
        titleLabel.font = UIFont.systemFont(ofSize: 17, weight: .bold)
        titleLabel.textColor = .white
        titleLabel.translatesAutoresizingMaskIntoConstraints = false
        navBar.addSubview(titleLabel)

        subtitleLabel.text = "Imaging modalities & archive networking"
        subtitleLabel.font = UIFont.systemFont(ofSize: 11.5, weight: .regular)
        subtitleLabel.textColor = UIColor(white: 1.0, alpha: 0.8)
        subtitleLabel.translatesAutoresizingMaskIntoConstraints = false
        navBar.addSubview(subtitleLabel)

        btnRefresh.setImage(UIImage(systemName: "arrow.clockwise"), for: .normal)
        btnRefresh.tintColor = .white
        btnRefresh.backgroundColor = UIColor.white.withAlphaComponent(0.18)
        btnRefresh.layer.cornerRadius = 20
        btnRefresh.addTarget(self, action: #selector(refreshTapped), for: .touchUpInside)
        btnRefresh.translatesAutoresizingMaskIntoConstraints = false
        navBar.addSubview(btnRefresh)

        NSLayoutConstraint.activate([
            navBar.topAnchor.constraint(equalTo: view.topAnchor),
            navBar.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            navBar.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            navBar.heightAnchor.constraint(equalToConstant: safeTop + 58),

            btnBack.leadingAnchor.constraint(equalTo: navBar.leadingAnchor, constant: 16),
            btnBack.bottomAnchor.constraint(equalTo: navBar.bottomAnchor, constant: -10),
            btnBack.widthAnchor.constraint(equalToConstant: 40),
            btnBack.heightAnchor.constraint(equalToConstant: 40),

            titleLabel.leadingAnchor.constraint(equalTo: btnBack.trailingAnchor, constant: 12),
            titleLabel.trailingAnchor.constraint(equalTo: btnRefresh.leadingAnchor, constant: -8),
            titleLabel.topAnchor.constraint(equalTo: btnBack.topAnchor, constant: 1),

            subtitleLabel.leadingAnchor.constraint(equalTo: titleLabel.leadingAnchor),
            subtitleLabel.trailingAnchor.constraint(equalTo: titleLabel.trailingAnchor),
            subtitleLabel.topAnchor.constraint(equalTo: titleLabel.bottomAnchor, constant: 2),

            btnRefresh.trailingAnchor.constraint(equalTo: navBar.trailingAnchor, constant: -16),
            btnRefresh.centerYAnchor.constraint(equalTo: btnBack.centerYAnchor),
            btnRefresh.widthAnchor.constraint(equalToConstant: 40),
            btnRefresh.heightAnchor.constraint(equalToConstant: 40),
        ])
    }

    // MARK: - Sticky Footer
    private func setupFooter() {
        footerView.backgroundColor = .white
        footerView.layer.shadowColor = UIColor.black.cgColor
        footerView.layer.shadowOpacity = 0.07
        footerView.layer.shadowOffset = CGSize(width: 0, height: -3)
        footerView.layer.shadowRadius = 6
        footerView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(footerView)

        btnSaveConfig.setTitle("Save Configuration", for: .normal)
        btnSaveConfig.setTitleColor(.white, for: .normal)
        btnSaveConfig.titleLabel?.font = UIFont.systemFont(ofSize: 15, weight: .bold)
        btnSaveConfig.backgroundColor = UIColor(red: 0.14, green: 0.38, blue: 0.92, alpha: 1.0)
        btnSaveConfig.layer.cornerRadius = 14
        btnSaveConfig.addTarget(self, action: #selector(saveTapped), for: .touchUpInside)
        btnSaveConfig.translatesAutoresizingMaskIntoConstraints = false
        footerView.addSubview(btnSaveConfig)

        spinnerSave.color = .white
        spinnerSave.hidesWhenStopped = true
        spinnerSave.translatesAutoresizingMaskIntoConstraints = false
        btnSaveConfig.addSubview(spinnerSave)

        let safeBottom = UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }.first?.windows.first?.safeAreaInsets.bottom ?? 20

        NSLayoutConstraint.activate([
            footerView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            footerView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            footerView.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            footerView.heightAnchor.constraint(equalToConstant: 68 + safeBottom),

            btnSaveConfig.topAnchor.constraint(equalTo: footerView.topAnchor, constant: 10),
            btnSaveConfig.leadingAnchor.constraint(equalTo: footerView.leadingAnchor, constant: 16),
            btnSaveConfig.trailingAnchor.constraint(equalTo: footerView.trailingAnchor, constant: -16),
            btnSaveConfig.heightAnchor.constraint(equalToConstant: 48),

            spinnerSave.centerYAnchor.constraint(equalTo: btnSaveConfig.centerYAnchor),
            spinnerSave.trailingAnchor.constraint(equalTo: btnSaveConfig.titleLabel?.leadingAnchor ?? btnSaveConfig.leadingAnchor, constant: -10),
        ])
    }

    // MARK: - Scroll View
    private func setupScrollView() {
        scrollView.translatesAutoresizingMaskIntoConstraints = false
        scrollView.alwaysBounceVertical = true
        scrollView.keyboardDismissMode = .onDrag
        contentView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(scrollView)
        scrollView.addSubview(contentView)

        spinnerPageLoad.color = UIColor(red: 0.14, green: 0.38, blue: 0.92, alpha: 1.0)
        spinnerPageLoad.hidesWhenStopped = true
        spinnerPageLoad.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(spinnerPageLoad)

        NSLayoutConstraint.activate([
            scrollView.topAnchor.constraint(equalTo: navBar.bottomAnchor),
            scrollView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            scrollView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            scrollView.bottomAnchor.constraint(equalTo: footerView.topAnchor),

            contentView.topAnchor.constraint(equalTo: scrollView.topAnchor),
            contentView.leadingAnchor.constraint(equalTo: scrollView.leadingAnchor),
            contentView.trailingAnchor.constraint(equalTo: scrollView.trailingAnchor),
            contentView.bottomAnchor.constraint(equalTo: scrollView.bottomAnchor),
            contentView.widthAnchor.constraint(equalTo: scrollView.widthAnchor),

            spinnerPageLoad.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            spinnerPageLoad.centerYAnchor.constraint(equalTo: view.centerYAnchor),
        ])
    }

    // MARK: - Sections Layout
    private func setupContentSections() {
        let cardRis = createLocalRisCard()
        let cardPacs = createPacsArchiveCard()
        let cardWado = createWadoViewerCard()
        let cardMwl = createMwlCard()
        let cardInfo = createTerminologyCard()

        let mainStack = UIStackView(arrangedSubviews: [cardRis, cardPacs, cardWado, cardMwl, cardInfo])
        mainStack.axis = .vertical
        mainStack.spacing = 16
        mainStack.translatesAutoresizingMaskIntoConstraints = false
        contentView.addSubview(mainStack)

        NSLayoutConstraint.activate([
            mainStack.topAnchor.constraint(equalTo: contentView.topAnchor, constant: 16),
            mainStack.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 16),
            mainStack.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -16),
            mainStack.bottomAnchor.constraint(equalTo: contentView.bottomAnchor, constant: -24),
        ])
    }

    // 1. Local RIS Node Card
    private func createLocalRisCard() -> UIView {
        let card = createWhiteCard()
        let header = createCardHeader(iconName: "cpu", iconTint: .gray, title: "Local RIS Node (This Server)", badgeText: "IDENTITY", badgeBg: UIColor(red: 0.95, green: 0.96, blue: 0.98, alpha: 1), badgeColor: .gray)

        inputLocalAeTitle.autocapitalizationType = UITextAutocapitalizationType.allCharacters
        inputLocalAeTitle.font = UIFont.monospacedSystemFont(ofSize: 13.5, weight: UIFont.Weight.regular)

        inputLocalPort.keyboardType = UIKeyboardType.numberPad
        inputLocalPort.font = UIFont.monospacedSystemFont(ofSize: 13.5, weight: UIFont.Weight.regular)

        let hint = UILabel()
        hint.text = "The Application Entity Title of this RIS software."
        hint.font = UIFont.systemFont(ofSize: 10.5)
        hint.textColor = UIColor(white: 0.6, alpha: 1.0)

        let stack = UIStackView(arrangedSubviews: [
            header,
            createFieldLabel("LOCAL AE TITLE"),
            inputLocalAeTitle,
            hint,
            createFieldLabel("LISTENER PORT"),
            inputLocalPort
        ])
        stack.axis = .vertical
        stack.spacing = 6
        stack.setCustomSpacing(12, after: header)
        stack.setCustomSpacing(12, after: hint)
        stack.translatesAutoresizingMaskIntoConstraints = false
        card.addSubview(stack)
        pinToBounds(stack, in: card, padding: 16)
        return card
    }

    // 2. Primary PACS Archive Card with C-ECHO Ping
    private func createPacsArchiveCard() -> UIView {
        let card = createWhiteCard()
        let header = createCardHeader(iconName: "shield.checkerboard", iconTint: UIColor(red: 0.06, green: 0.72, blue: 0.51, alpha: 1), title: "Primary PACS Archive", badgeText: "STORAGE", badgeBg: UIColor(red: 0.93, green: 0.99, blue: 0.96, alpha: 1), badgeColor: UIColor(red: 0.02, green: 0.59, blue: 0.41, alpha: 1))

        inputPacsAeTitle.autocapitalizationType = UITextAutocapitalizationType.allCharacters
        inputPacsAeTitle.font = UIFont.monospacedSystemFont(ofSize: 13.5, weight: UIFont.Weight.regular)

        inputPacsIpAddress.keyboardType = UIKeyboardType.numbersAndPunctuation
        inputPacsIpAddress.font = UIFont.monospacedSystemFont(ofSize: 13.5, weight: UIFont.Weight.regular)

        inputPacsPort.keyboardType = UIKeyboardType.numberPad
        inputPacsPort.font = UIFont.monospacedSystemFont(ofSize: 13.5, weight: UIFont.Weight.regular)

        // IP and Port horizontal row
        let ipStack = UIStackView(arrangedSubviews: [createFieldLabel("IP / HOSTNAME"), inputPacsIpAddress])
        ipStack.axis = .vertical; ipStack.spacing = 4

        let portStack = UIStackView(arrangedSubviews: [createFieldLabel("PACS PORT"), inputPacsPort])
        portStack.axis = .vertical; portStack.spacing = 4

        let ipPortRow = UIStackView(arrangedSubviews: [ipStack, portStack])
        ipPortRow.axis = .horizontal
        ipPortRow.spacing = 10
        ipPortRow.distribution = UIStackView.Distribution.fillProportionally
        ipStack.widthAnchor.constraint(equalTo: ipPortRow.widthAnchor, multiplier: 0.62).isActive = true

        // Connection Status & Ping Box
        setupCEchoCard()

        let stack = UIStackView(arrangedSubviews: [
            header,
            createFieldLabel("PACS AE TITLE"),
            inputPacsAeTitle,
            ipPortRow,
            cardConnectionStatus
        ])
        stack.axis = .vertical
        stack.spacing = 6
        stack.setCustomSpacing(12, after: header)
        stack.setCustomSpacing(10, after: inputPacsAeTitle)
        stack.setCustomSpacing(14, after: ipPortRow)
        stack.translatesAutoresizingMaskIntoConstraints = false
        card.addSubview(stack)
        pinToBounds(stack, in: card, padding: 16)
        return card
    }

    private func setupCEchoCard() {
        cardConnectionStatus.layer.cornerRadius = 14
        cardConnectionStatus.layer.borderWidth = 1
        cardConnectionStatus.translatesAutoresizingMaskIntoConstraints = false

        let iconContainer = UIView()
        iconContainer.backgroundColor = .white
        iconContainer.layer.cornerRadius = 18
        iconContainer.translatesAutoresizingMaskIntoConstraints = false

        iconStatusView.contentMode = .scaleAspectFit
        iconStatusView.translatesAutoresizingMaskIntoConstraints = false
        iconContainer.addSubview(iconStatusView)

        spinnerPing.hidesWhenStopped = true
        spinnerPing.color = UIColor(red: 0.31, green: 0.27, blue: 0.9, alpha: 1.0)
        spinnerPing.translatesAutoresizingMaskIntoConstraints = false
        iconContainer.addSubview(spinnerPing)

        NSLayoutConstraint.activate([
            iconStatusView.centerXAnchor.constraint(equalTo: iconContainer.centerXAnchor),
            iconStatusView.centerYAnchor.constraint(equalTo: iconContainer.centerYAnchor),
            iconStatusView.widthAnchor.constraint(equalToConstant: 18),
            iconStatusView.heightAnchor.constraint(equalToConstant: 18),

            spinnerPing.centerXAnchor.constraint(equalTo: iconContainer.centerXAnchor),
            spinnerPing.centerYAnchor.constraint(equalTo: iconContainer.centerYAnchor),

            iconContainer.widthAnchor.constraint(equalToConstant: 36),
            iconContainer.heightAnchor.constraint(equalToConstant: 36),
        ])

        lblStatusTitle.text = "CONNECTION STATUS"
        lblStatusTitle.font = UIFont.systemFont(ofSize: 10, weight: UIFont.Weight.bold)
        lblStatusTitle.textColor = UIColor(red: 0.06, green: 0.09, blue: 0.16, alpha: 1.0)

        lblStatusDesc.font = UIFont.systemFont(ofSize: 11.5, weight: UIFont.Weight.semibold)
        lblStatusDesc.numberOfLines = 1

        let textStack = UIStackView(arrangedSubviews: [lblStatusTitle, lblStatusDesc])
        textStack.axis = .vertical
        textStack.spacing = 2

        btnTestCEcho.setTitle("Test C-ECHO", for: .normal)
        btnTestCEcho.setTitleColor(.white, for: .normal)
        btnTestCEcho.titleLabel?.font = UIFont.systemFont(ofSize: 11.5, weight: UIFont.Weight.bold)
        btnTestCEcho.backgroundColor = UIColor(red: 0.14, green: 0.38, blue: 0.92, alpha: 1.0)
        btnTestCEcho.layer.cornerRadius = 10
        btnTestCEcho.layer.borderWidth = 0
        btnTestCEcho.contentEdgeInsets = UIEdgeInsets(top: 8, left: 14, bottom: 8, right: 14)
        btnTestCEcho.addTarget(self, action: #selector(testCEchoTapped), for: .touchUpInside)

        let hStack = UIStackView(arrangedSubviews: [iconContainer, textStack, btnTestCEcho])
        hStack.axis = .horizontal
        hStack.alignment = .center
        hStack.spacing = 10
        hStack.translatesAutoresizingMaskIntoConstraints = false
        cardConnectionStatus.addSubview(hStack)
        pinToBounds(hStack, in: cardConnectionStatus, padding: 12)
    }

    // 3. Diagnostic Web Viewer (WADO) Card
    private func createWadoViewerCard() -> UIView {
        let card = createWhiteCard()
        let header = createCardHeader(iconName: "arrow.up.right.square", iconTint: UIColor(red: 0.31, green: 0.27, blue: 0.9, alpha: 1), title: "Diagnostic Web Viewer (WADO)", badgeText: nil, badgeBg: nil, badgeColor: nil)

        inputViewerBaseUrl.keyboardType = UIKeyboardType.URL
        inputViewerBaseUrl.font = UIFont.monospacedSystemFont(ofSize: 12, weight: UIFont.Weight.regular)
        inputViewerBaseUrl.textColor = UIColor(red: 0.26, green: 0.22, blue: 0.79, alpha: 1.0)

        let hint = UILabel()
        hint.text = "Example format for Orthanc/Osimis: http://192.168.1.100:8042/viewer?StudyInstanceUID="
        hint.font = UIFont.systemFont(ofSize: 10.5)
        hint.textColor = UIColor(white: 0.6, alpha: 1.0)
        hint.numberOfLines = 2

        let stack = UIStackView(arrangedSubviews: [
            header,
            createFieldLabel("VIEWER BASE URL"),
            inputViewerBaseUrl,
            hint
        ])
        stack.axis = .vertical
        stack.spacing = 6
        stack.setCustomSpacing(12, after: header)
        stack.translatesAutoresizingMaskIntoConstraints = false
        card.addSubview(stack)
        pinToBounds(stack, in: card, padding: 16)
        return card
    }

    // 4. Modality Worklist (MWL) Card
    private func createMwlCard() -> UIView {
        cardMwlSection.backgroundColor = .white
        cardMwlSection.layer.cornerRadius = 16
        cardMwlSection.layer.shadowColor = UIColor.black.cgColor
        cardMwlSection.layer.shadowOpacity = 0.04
        cardMwlSection.layer.shadowOffset = CGSize(width: 0, height: 2)
        cardMwlSection.layer.shadowRadius = 8

        let iconView = UIImageView(image: UIImage(systemName: "square.stack.3d.down.right.fill"))
        iconView.tintColor = UIColor(red: 0.14, green: 0.38, blue: 0.92, alpha: 1.0)
        iconView.translatesAutoresizingMaskIntoConstraints = false
        iconView.widthAnchor.constraint(equalToConstant: 18).isActive = true
        iconView.heightAnchor.constraint(equalToConstant: 18).isActive = true

        let titleLbl = UILabel()
        titleLbl.text = "Modality Worklist"
        titleLbl.font = UIFont.systemFont(ofSize: 14.5, weight: UIFont.Weight.bold)
        titleLbl.textColor = UIColor(red: 0.06, green: 0.09, blue: 0.16, alpha: 1.0)

        badgeMwlStatus.font = UIFont.systemFont(ofSize: 10, weight: UIFont.Weight.bold)

        dotMwlIndicator.layer.cornerRadius = 4
        dotMwlIndicator.translatesAutoresizingMaskIntoConstraints = false
        dotMwlIndicator.widthAnchor.constraint(equalToConstant: 8).isActive = true
        dotMwlIndicator.heightAnchor.constraint(equalToConstant: 8).isActive = true

        let statusStack = UIStackView(arrangedSubviews: [badgeMwlStatus, dotMwlIndicator])
        statusStack.axis = .horizontal
        statusStack.alignment = .center
        statusStack.spacing = 6

        let topRow = UIStackView(arrangedSubviews: [iconView, titleLbl, UIView(), statusStack])
        topRow.axis = .horizontal
        topRow.alignment = .center
        topRow.spacing = 10

        let descLbl = UILabel()
        descLbl.text = "MWL allows your MRI and CT machines to automatically fetch patient details from this RIS, eliminating manual data entry by technicians."
        descLbl.font = UIFont.systemFont(ofSize: 11.5)
        descLbl.textColor = UIColor(red: 0.39, green: 0.45, blue: 0.55, alpha: 1.0)
        descLbl.numberOfLines = 3

        inputMwlAeTitle.autocapitalizationType = UITextAutocapitalizationType.allCharacters
        inputMwlAeTitle.font = UIFont.monospacedSystemFont(ofSize: 13.5, weight: UIFont.Weight.regular)

        inputMwlPort.keyboardType = UIKeyboardType.numberPad
        inputMwlPort.font = UIFont.monospacedSystemFont(ofSize: 13.5, weight: UIFont.Weight.regular)

        stackMwlInputs.axis = .vertical
        stackMwlInputs.spacing = 6
        stackMwlInputs.addArrangedSubview(createFieldLabel("MWL AE TITLE"))
        stackMwlInputs.addArrangedSubview(inputMwlAeTitle)
        stackMwlInputs.setCustomSpacing(10, after: inputMwlAeTitle)
        stackMwlInputs.addArrangedSubview(createFieldLabel("MWL PORT"))
        stackMwlInputs.addArrangedSubview(inputMwlPort)

        btnToggleMwlService.titleLabel?.font = UIFont.systemFont(ofSize: 12.5, weight: UIFont.Weight.bold)
        btnToggleMwlService.backgroundColor = .white
        btnToggleMwlService.layer.cornerRadius = 12
        btnToggleMwlService.layer.borderWidth = 1
        btnToggleMwlService.layer.borderColor = UIColor(red: 0.88, green: 0.9, blue: 0.94, alpha: 1.0).cgColor
        btnToggleMwlService.heightAnchor.constraint(equalToConstant: 42).isActive = true
        btnToggleMwlService.addTarget(self, action: #selector(toggleMwlTapped), for: .touchUpInside)

        let container = UIStackView(arrangedSubviews: [topRow, descLbl, stackMwlInputs, btnToggleMwlService])
        container.axis = .vertical
        container.spacing = 12
        container.translatesAutoresizingMaskIntoConstraints = false
        cardMwlSection.addSubview(container)
        pinToBounds(container, in: cardMwlSection, padding: 16)
        return cardMwlSection
    }

    // 5. Quick Terminology Card
    private func createTerminologyCard() -> UIView {
        let card = UIView()
        card.backgroundColor = UIColor(red: 0.93, green: 0.95, blue: 1.0, alpha: 1.0)
        card.layer.cornerRadius = 14

        let icon = UIImageView(image: UIImage(systemName: "info.circle.fill"))
        icon.tintColor = UIColor(red: 0.31, green: 0.27, blue: 0.9, alpha: 1.0)
        icon.translatesAutoresizingMaskIntoConstraints = false
        icon.widthAnchor.constraint(equalToConstant: 16).isActive = true
        icon.heightAnchor.constraint(equalToConstant: 16).isActive = true

        let title = UILabel()
        title.text = "Quick Terminology"
        title.font = UIFont.systemFont(ofSize: 12.5, weight: UIFont.Weight.bold)
        title.textColor = UIColor(red: 0.19, green: 0.18, blue: 0.51, alpha: 1.0)

        let header = UIStackView(arrangedSubviews: [icon, title])
        header.axis = .horizontal
        header.alignment = .center
        header.spacing = 6

        func bulletLabel(_ text: String) -> UILabel {
            let l = UILabel()
            l.text = text
            l.font = UIFont.systemFont(ofSize: 11)
            l.textColor = UIColor(red: 0.26, green: 0.22, blue: 0.79, alpha: 1.0)
            l.numberOfLines = 0
            return l
        }

        let b1 = bulletLabel("• AE Title: Application Entity Title. A unique identity string for a DICOM node (no spaces allowed).")
        let b2 = bulletLabel("• C-ECHO: A standard DICOM ping used to verify if a remote PACS server is online and listening.")
        let b3 = bulletLabel("• WADO: Web Access to DICOM Objects. Used to securely stream heavy medical imaging studies directly in browsers and mobile viewers.")

        let stack = UIStackView(arrangedSubviews: [header, b1, b2, b3])
        stack.axis = .vertical
        stack.spacing = 6
        stack.translatesAutoresizingMaskIntoConstraints = false
        card.addSubview(stack)
        pinToBounds(stack, in: card, padding: 14)
        return card
    }

    // MARK: - UI Helpers
    private func createWhiteCard() -> UIView {
        let card = UIView()
        card.backgroundColor = .white
        card.layer.cornerRadius = 16
        card.layer.shadowColor = UIColor.black.cgColor
        card.layer.shadowOpacity = 0.04
        card.layer.shadowOffset = CGSize(width: 0, height: 2)
        card.layer.shadowRadius = 8
        return card
    }

    private func createCardHeader(iconName: String, iconTint: UIColor, title: String, badgeText: String?, badgeBg: UIColor?, badgeColor: UIColor?) -> UIView {
        let iconView = UIImageView(image: UIImage(systemName: iconName))
        iconView.tintColor = iconTint
        iconView.contentMode = .scaleAspectFit
        iconView.translatesAutoresizingMaskIntoConstraints = false
        iconView.widthAnchor.constraint(equalToConstant: 18).isActive = true
        iconView.heightAnchor.constraint(equalToConstant: 18).isActive = true

        let titleLbl = UILabel()
        titleLbl.text = title
        titleLbl.font = UIFont.systemFont(ofSize: 14.5, weight: UIFont.Weight.bold)
        titleLbl.textColor = UIColor(red: 0.06, green: 0.09, blue: 0.16, alpha: 1.0)

        var views: [UIView] = [iconView, titleLbl, UIView()]

        if let badge = badgeText, let bg = badgeBg, let fg = badgeColor {
            let badgeLbl = UILabel()
            badgeLbl.text = " \(badge) "
            badgeLbl.font = UIFont.systemFont(ofSize: 9.5, weight: UIFont.Weight.bold)
            badgeLbl.textColor = fg
            badgeLbl.backgroundColor = bg
            badgeLbl.layer.cornerRadius = 4
            badgeLbl.clipsToBounds = true
            views.append(badgeLbl)
        }

        let header = UIStackView(arrangedSubviews: views)
        header.axis = .horizontal
        header.alignment = .center
        header.spacing = 8
        return header
    }

    private func createFieldLabel(_ text: String) -> UILabel {
        let l = UILabel()
        l.text = text
        l.font = UIFont.systemFont(ofSize: 10.5, weight: UIFont.Weight.bold)
        l.textColor = UIColor(red: 0.39, green: 0.45, blue: 0.55, alpha: 1.0)
        return l
    }

    private func pinToBounds(_ view: UIView, in parent: UIView, padding: CGFloat) {
        NSLayoutConstraint.activate([
            view.topAnchor.constraint(equalTo: parent.topAnchor, constant: padding),
            view.leadingAnchor.constraint(equalTo: parent.leadingAnchor, constant: padding),
            view.trailingAnchor.constraint(equalTo: parent.trailingAnchor, constant: -padding),
            view.bottomAnchor.constraint(equalTo: parent.bottomAnchor, constant: -padding),
        ])
    }

    // MARK: - State Management
    private func updateMwlUI() {
        if isMwlEnabled {
            badgeMwlStatus.text = "ACTIVE"
            badgeMwlStatus.textColor = UIColor(red: 0.02, green: 0.59, blue: 0.41, alpha: 1)
            dotMwlIndicator.backgroundColor = UIColor(red: 0.06, green: 0.72, blue: 0.51, alpha: 1)
            stackMwlInputs.alpha = 1.0
            inputMwlAeTitle.isEnabled = true
            inputMwlPort.isEnabled = true
            btnToggleMwlService.setTitle("Disable MWL Service", for: .normal)
            btnToggleMwlService.setTitleColor(.white, for: .normal)
            btnToggleMwlService.backgroundColor = UIColor(red: 0.86, green: 0.15, blue: 0.15, alpha: 1)
            btnToggleMwlService.layer.borderWidth = 0
        } else {
            badgeMwlStatus.text = "DISABLED"
            badgeMwlStatus.textColor = UIColor(white: 0.5, alpha: 1)
            dotMwlIndicator.backgroundColor = UIColor(white: 0.7, alpha: 1)
            stackMwlInputs.alpha = 0.4
            inputMwlAeTitle.isEnabled = false
            inputMwlPort.isEnabled = false
            btnToggleMwlService.setTitle("Enable MWL Service", for: .normal)
            btnToggleMwlService.setTitleColor(.white, for: .normal)
            btnToggleMwlService.backgroundColor = UIColor(red: 0.31, green: 0.27, blue: 0.9, alpha: 1)
            btnToggleMwlService.layer.borderWidth = 0
        }
    }

    private func updatePacsStatusUI(status: PacsStatus, message: String) {
        currentPacsStatus = status
        switch status {
        case .testing:
            cardConnectionStatus.backgroundColor = UIColor(red: 0.97, green: 0.98, blue: 0.99, alpha: 1)
            cardConnectionStatus.layer.borderColor = UIColor(red: 0.89, green: 0.91, blue: 0.94, alpha: 1).cgColor
            iconStatusView.isHidden = true
            spinnerPing.startAnimating()
            lblStatusDesc.text = message
            lblStatusDesc.textColor = UIColor(red: 0.31, green: 0.27, blue: 0.9, alpha: 1)
            btnTestCEcho.isEnabled = false
            btnTestCEcho.alpha = 0.6

        case .connected:
            cardConnectionStatus.backgroundColor = UIColor(red: 0.93, green: 0.99, blue: 0.96, alpha: 1)
            cardConnectionStatus.layer.borderColor = UIColor(red: 0.65, green: 0.95, blue: 0.81, alpha: 1).cgColor
            spinnerPing.stopAnimating()
            iconStatusView.isHidden = false
            iconStatusView.image = UIImage(systemName: "wifi")
            iconStatusView.tintColor = UIColor(red: 0.02, green: 0.59, blue: 0.41, alpha: 1)
            lblStatusDesc.text = message
            lblStatusDesc.textColor = UIColor(red: 0.02, green: 0.59, blue: 0.41, alpha: 1)
            btnTestCEcho.isEnabled = true
            btnTestCEcho.alpha = 1.0

        case .failed:
            cardConnectionStatus.backgroundColor = UIColor(red: 1.0, green: 0.95, blue: 0.95, alpha: 1)
            cardConnectionStatus.layer.borderColor = UIColor(red: 1.0, green: 0.8, blue: 0.83, alpha: 1).cgColor
            spinnerPing.stopAnimating()
            iconStatusView.isHidden = false
            iconStatusView.image = UIImage(systemName: "wifi.slash")
            iconStatusView.tintColor = UIColor(red: 0.86, green: 0.15, blue: 0.15, alpha: 1)
            lblStatusDesc.text = message
            lblStatusDesc.textColor = UIColor(red: 0.86, green: 0.15, blue: 0.15, alpha: 1)
            btnTestCEcho.isEnabled = true
            btnTestCEcho.alpha = 1.0

        case .unknown:
            cardConnectionStatus.backgroundColor = UIColor(red: 0.97, green: 0.98, blue: 0.99, alpha: 1)
            cardConnectionStatus.layer.borderColor = UIColor(red: 0.89, green: 0.91, blue: 0.94, alpha: 1).cgColor
            spinnerPing.stopAnimating()
            iconStatusView.isHidden = false
            iconStatusView.image = UIImage(systemName: "network")
            iconStatusView.tintColor = UIColor(white: 0.45, alpha: 1)
            lblStatusDesc.text = message
            lblStatusDesc.textColor = UIColor(white: 0.45, alpha: 1)
            btnTestCEcho.isEnabled = true
            btnTestCEcho.alpha = 1.0
        }
    }

    // MARK: - API Calls

    // 1. Fetch live settings
    private func fetchDicomSettings(isManual: Bool) {
        spinnerPageLoad.startAnimating()

        var endpoint = "\(baseURL)/api/workspace/radiology/settings/dicom"
        let labId = resolveLabId()
        if !labId.isEmpty {
            endpoint += "?labId=\(labId)"
        }

        guard let url = URL(string: endpoint) else { return }
        var req = URLRequest(url: url)
        req.httpMethod = "GET"
        attachAuth(&req)
        req.timeoutInterval = 15

        URLSession.shared.dataTask(with: req) { [weak self] data, response, error in
            DispatchQueue.main.async {
                guard let self = self else { return }
                self.spinnerPageLoad.stopAnimating()
                let statusCode = (response as? HTTPURLResponse)?.statusCode ?? 0
                if statusCode >= 200 && statusCode < 300,
                   let data = data,
                   let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
                    self.saveLocalCache(json)
                    self.bindSettings(json)
                    if isManual {
                        self.showBanner(message: "DICOM settings synchronized")
                    }
                } else if let cached = self.loadLocalCache() {
                    self.bindSettings(cached)
                } else {
                    self.bindSettings([:])
                }
            }
        }.resume()
    }

    private func saveLocalCache(_ data: [String: Any]) {
        UserDefaults.standard.set(data, forKey: "dicom_settings_cache")
    }

    private func loadLocalCache() -> [String: Any]? {
        return UserDefaults.standard.dictionary(forKey: "dicom_settings_cache")
    }

    private func bindSettings(_ data: [String: Any]) {
        inputLocalAeTitle.text = data["localAETitle"] as? String ?? ""
        if let lp = data["localPort"] as? Int, lp > 0 {
            inputLocalPort.text = "\(lp)"
        } else if let lpStr = data["localPort"] as? String, !lpStr.isEmpty {
            inputLocalPort.text = lpStr
        } else {
            inputLocalPort.text = ""
        }

        inputPacsAeTitle.text = data["pacsAETitle"] as? String ?? ""
        inputPacsIpAddress.text = data["pacsIpAddress"] as? String ?? ""
        if let pp = data["pacsPort"] as? Int, pp > 0 {
            inputPacsPort.text = "\(pp)"
        } else if let ppStr = data["pacsPort"] as? String, !ppStr.isEmpty {
            inputPacsPort.text = ppStr
        } else {
            inputPacsPort.text = ""
        }

        inputViewerBaseUrl.text = data["viewerBaseUrl"] as? String ?? ""

        isMwlEnabled = data["enableMwl"] as? Bool ?? true
        inputMwlAeTitle.text = data["mwlAETitle"] as? String ?? ""
        if let mp = data["mwlPort"] as? Int, mp > 0 {
            inputMwlPort.text = "\(mp)"
        } else if let mpStr = data["mwlPort"] as? String, !mpStr.isEmpty {
            inputMwlPort.text = mpStr
        } else {
            inputMwlPort.text = ""
        }

        updateMwlUI()
    }

    // 2. Test C-ECHO (Ping remote PACS)
    @objc private func testCEchoTapped() {
        let ip = inputPacsIpAddress.text?.trimmingCharacters(in: CharacterSet.whitespaces) ?? ""
        let portStr = inputPacsPort.text?.trimmingCharacters(in: CharacterSet.whitespaces) ?? ""
        let ae = inputPacsAeTitle.text?.trimmingCharacters(in: CharacterSet.whitespaces).uppercased() ?? ""

        guard !ip.isEmpty else {
            showBanner(message: "Please enter PACS IP / Hostname first", isError: true)
            inputPacsIpAddress.becomeFirstResponder()
            return
        }

        let port = Int(portStr) ?? 4242
        updatePacsStatusUI(status: .testing, message: "Testing connection...")

        var endpoint = "\(baseURL)/api/workspace/radiology/settings/dicom"
        let labId = resolveLabId()
        if !labId.isEmpty {
            endpoint += "?labId=\(labId)"
        }

        guard let url = URL(string: endpoint) else { return }
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        attachAuth(&req)
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.timeoutInterval = 20

        let payload: [String: Any] = [
            "ipAddress": ip,
            "port": port,
            "aeTitle": ae
        ]
        req.httpBody = try? JSONSerialization.data(withJSONObject: payload)

        URLSession.shared.dataTask(with: req) { [weak self] data, response, error in
            DispatchQueue.main.async {
                guard let self = self else { return }

                if let error = error {
                    self.updatePacsStatusUI(status: .failed, message: "Connection error: \(error.localizedDescription)")
                    self.showBanner(message: "Ping failed: \(error.localizedDescription)", isError: true)
                    return
                }

                let statusCode = (response as? HTTPURLResponse)?.statusCode ?? 0
                if let data = data, let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
                    let success = json["success"] as? Bool ?? (statusCode >= 200 && statusCode < 300)
                    if success {
                        let msg = json["message"] as? String ?? "C-ECHO Successful: PACS is online and reachable."
                        self.updatePacsStatusUI(status: .connected, message: "Online & Reachable (C-ECHO OK)")
                        self.showBanner(message: msg)
                    } else {
                        let errMsg = json["error"] as? String ?? "C-ECHO Failed: Could not reach PACS server."
                        self.updatePacsStatusUI(status: .failed, message: "Connection Failed (Check IP/Port)")
                        self.showBanner(message: errMsg, isError: true)
                    }
                } else {
                    self.updatePacsStatusUI(status: .failed, message: "Server returned code \(statusCode)")
                    self.showBanner(message: "Failed to connect (Code \(statusCode))", isError: true)
                }
            }
        }.resume()
    }

    // 3. Save Configuration (PUT)
    @objc private func saveTapped() {
        let localAe = inputLocalAeTitle.text?.trimmingCharacters(in: CharacterSet.whitespaces).uppercased() ?? ""
        let localPort = Int(inputLocalPort.text?.trimmingCharacters(in: CharacterSet.whitespaces) ?? "") ?? 11112

        let pacsAe = inputPacsAeTitle.text?.trimmingCharacters(in: CharacterSet.whitespaces).uppercased() ?? ""
        let pacsIp = inputPacsIpAddress.text?.trimmingCharacters(in: CharacterSet.whitespaces) ?? ""
        let pacsPort = Int(inputPacsPort.text?.trimmingCharacters(in: CharacterSet.whitespaces) ?? "") ?? 4242

        let mwlAe = inputMwlAeTitle.text?.trimmingCharacters(in: CharacterSet.whitespaces).uppercased() ?? ""
        let mwlPort = Int(inputMwlPort.text?.trimmingCharacters(in: CharacterSet.whitespaces) ?? "") ?? 11113

        let viewerUrl = inputViewerBaseUrl.text?.trimmingCharacters(in: CharacterSet.whitespaces) ?? ""

        guard !localAe.isEmpty else {
            showBanner(message: "Local AE Title is required", isError: true)
            inputLocalAeTitle.becomeFirstResponder()
            return
        }

        btnSaveConfig.isEnabled = false
        btnSaveConfig.setTitle("Saving Config...", for: .normal)
        spinnerSave.startAnimating()

        var endpoint = "\(baseURL)/api/workspace/radiology/settings/dicom"
        let labId = resolveLabId()
        if !labId.isEmpty {
            endpoint += "?labId=\(labId)"
        }

        guard let url = URL(string: endpoint) else { return }
        var req = URLRequest(url: url)
        req.httpMethod = "PUT"
        attachAuth(&req)
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.timeoutInterval = 15

        let payload: [String: Any] = [
            "localAETitle": localAe,
            "localPort": localPort,
            "pacsAETitle": pacsAe,
            "pacsIpAddress": pacsIp,
            "pacsPort": pacsPort,
            "enableMwl": isMwlEnabled,
            "mwlAETitle": mwlAe,
            "mwlPort": mwlPort,
            "viewerBaseUrl": viewerUrl
        ]
        saveLocalCache(payload)
        req.httpBody = try? JSONSerialization.data(withJSONObject: payload)

        URLSession.shared.dataTask(with: req) { [weak self] data, response, error in
            DispatchQueue.main.async {
                guard let self = self else { return }
                self.btnSaveConfig.isEnabled = true
                self.btnSaveConfig.setTitle("Save Configuration", for: .normal)
                self.spinnerSave.stopAnimating()

                let statusCode = (response as? HTTPURLResponse)?.statusCode ?? 0
                if statusCode >= 200 && statusCode < 300 {
                    self.showBanner(message: "DICOM Configuration Saved")
                } else {
                    self.showBanner(message: "DICOM Configuration saved locally")
                }
            }
        }.resume()
    }

    // MARK: - Helpers & Actions
    @objc private func backTapped() {
        dismiss(animated: true)
    }

    @objc private func refreshTapped() {
        UIView.animate(withDuration: 0.4) {
            self.btnRefresh.transform = CGAffineTransform(rotationAngle: .pi)
        } completion: { _ in
            UIView.animate(withDuration: 0.4) {
                self.btnRefresh.transform = .identity
            }
        }
        fetchDicomSettings(isManual: true)
    }

    @objc private func toggleMwlTapped() {
        isMwlEnabled = !isMwlEnabled
        updateMwlUI()
    }

    private func attachAuth(_ req: inout URLRequest) {
        let tok = KeychainManager.shared.getToken() ?? UserDefaults.standard.string(forKey: "auth_token") ?? ""
        if !tok.isEmpty {
            req.setValue("Bearer \(tok)", forHTTPHeaderField: "Authorization")
            req.setValue("token=\(tok); auth-token=\(tok)", forHTTPHeaderField: "Cookie")
        }
        req.setValue("application/json", forHTTPHeaderField: "Accept")
    }

    private func resolveLabId() -> String {
        return UserDefaults.standard.string(forKey: "user_lab_id")
            ?? UserDefaults.standard.string(forKey: "current_lab_id")
            ?? UserDefaults.standard.string(forKey: "lab_id")
            ?? ""
    }

    private func showBanner(message: String, isError: Bool = false) {
        let banner = UILabel()
        banner.text = message
        banner.textColor = .white
        banner.font = UIFont.systemFont(ofSize: 13, weight: UIFont.Weight.semibold)
        banner.textAlignment = .center
        banner.backgroundColor = isError ? UIColor(red: 0.86, green: 0.15, blue: 0.15, alpha: 0.95) : UIColor(red: 0.06, green: 0.65, blue: 0.45, alpha: 0.95)
        banner.layer.cornerRadius = 10
        banner.clipsToBounds = true
        banner.alpha = 0
        banner.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(banner)

        NSLayoutConstraint.activate([
            banner.topAnchor.constraint(equalTo: navBar.bottomAnchor, constant: 12),
            banner.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 20),
            banner.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -20),
            banner.heightAnchor.constraint(equalToConstant: 40)
        ])

        UIView.animate(withDuration: 0.3, animations: {
            banner.alpha = 1.0
        }) { _ in
            UIView.animate(withDuration: 0.3, delay: 2.5, options: [], animations: {
                banner.alpha = 0
            }) { _ in
                banner.removeFromSuperview()
            }
        }
    }
}
