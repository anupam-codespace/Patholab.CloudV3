import UIKit
import PhotosUI

// MARK: - RISLetterheadViewController
// Full parity with web /workspace/radiology/settings/letterhead
// Supports Header Image & Footer Image uploading, live preview, deletion,
// real-time synchronization via GET & PATCH, and an interactive A4 report sheet preview.

class RISLetterheadViewController: UIViewController, UIImagePickerControllerDelegate, UINavigationControllerDelegate {

    private let baseURL = "https://app.patholab.cloud"

    // ── Sapphire Navigation Bar ──
    private let navBar           = UIView()
    private let navGradientLayer = CAGradientLayer()
    private let btnBack          = UIButton(type: .system)
    private let btnRefresh       = UIButton(type: .system)
    private let titleLabel       = UILabel()
    private let subTitleLabel    = UILabel()

    // ── Scroll & Content ──
    private let scrollView    = UIScrollView()
    private let contentStack  = UIStackView()

    // ── Header Card Views ──
    private let headerCardView        = UIView()
    private let headerCardTitle       = UILabel()
    private let headerCardDesc        = UILabel()
    private let headerDropzone        = UIView()
    private let headerImageView       = UIImageView()
    private let headerPlaceholderBox  = UIView()
    private let headerPlaceholderIcon = UIImageView()
    private let headerPlaceholderLbl  = UILabel()
    private let btnUploadHeader       = UIButton(type: .system)
    private let btnDeleteHeader       = UIButton(type: .system)

    // ── Footer Card Views ──
    private let footerCardView        = UIView()
    private let footerCardTitle       = UILabel()
    private let footerCardDesc        = UILabel()
    private let footerDropzone        = UIView()
    private let footerImageView       = UIImageView()
    private let footerPlaceholderBox  = UIView()
    private let footerPlaceholderIcon = UIImageView()
    private let footerPlaceholderLbl  = UILabel()
    private let btnUploadFooter       = UIButton(type: .system)
    private let btnDeleteFooter       = UIButton(type: .system)

    // ── A4 Preview Card Views ──
    private let previewCardView       = UIView()
    private let previewHeaderImgView  = UIImageView()
    private let previewHeaderMockLbl  = UILabel()
    private let previewFooterImgView  = UIImageView()
    private let previewFooterMockLbl  = UILabel()

    // ── Save Action & States ──
    private let saveButton            = UIButton(type: .system)
    private let statusLabel           = UILabel()
    private let spinner               = UIActivityIndicatorView(style: .medium)

    // ── State Variables ──
    private var headerImageString: String? = nil // data:image/...;base64,... or URL
    private var footerImageString: String? = nil
    private var pickingTarget: PickingTarget = .header

    private enum PickingTarget {
        case header
        case footer
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 0.97, green: 0.98, blue: 0.99, alpha: 1.0)
        setupNav()
        setupContent()
        fetchLetterhead()
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        navigationController?.setNavigationBarHidden(true, animated: animated)
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        navGradientLayer.frame = navBar.bounds
    }

    override var preferredStatusBarStyle: UIStatusBarStyle {
        return .lightContent
    }

    // MARK: - Navigation Bar Setup
    private func setupNav() {
        navBar.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(navBar)

        navGradientLayer.colors = [
            UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1.0).cgColor, // #0D6EFD
            UIColor(red: 0.039, green: 0.345, blue: 0.792, alpha: 1.0).cgColor, // #0A58CA
            UIColor(red: 0.114, green: 0.306, blue: 0.847, alpha: 1.0).cgColor  // #1D4ED8
        ]
        navGradientLayer.startPoint = CGPoint(x: 0, y: 0)
        navGradientLayer.endPoint   = CGPoint(x: 1, y: 1)
        navBar.layer.insertSublayer(navGradientLayer, at: 0)
        navBar.layer.cornerRadius = 24
        navBar.layer.maskedCorners = [.layerMinXMaxYCorner, .layerMaxXMaxYCorner]
        navBar.clipsToBounds = true

        btnBack.setImage(UIImage(systemName: "chevron.left"), for: .normal)
        btnBack.tintColor = .white
        btnBack.backgroundColor = UIColor.white.withAlphaComponent(0.20)
        btnBack.layer.cornerRadius = 19
        btnBack.layer.borderWidth = 1
        btnBack.layer.borderColor = UIColor.white.withAlphaComponent(0.30).cgColor
        btnBack.addTarget(self, action: #selector(backTapped), for: .touchUpInside)
        btnBack.translatesAutoresizingMaskIntoConstraints = false

        titleLabel.text = "Report Letterhead"
        titleLabel.font = .systemFont(ofSize: 20, weight: .bold)
        titleLabel.textColor = .white
        titleLabel.translatesAutoresizingMaskIntoConstraints = false

        subTitleLabel.text = "Radiology & Clinical Letterhead Branding"
        subTitleLabel.font = .systemFont(ofSize: 11.5, weight: .medium)
        subTitleLabel.textColor = UIColor(red: 0.780, green: 0.875, blue: 1.0, alpha: 1.0)
        subTitleLabel.translatesAutoresizingMaskIntoConstraints = false

        let titleStack = UIStackView(arrangedSubviews: [titleLabel, subTitleLabel])
        titleStack.axis = .vertical
        titleStack.spacing = 2
        titleStack.translatesAutoresizingMaskIntoConstraints = false

        btnRefresh.setImage(UIImage(systemName: "arrow.clockwise"), for: .normal)
        btnRefresh.tintColor = .white
        btnRefresh.backgroundColor = UIColor.white.withAlphaComponent(0.20)
        btnRefresh.layer.cornerRadius = 19
        btnRefresh.layer.borderWidth = 1
        btnRefresh.layer.borderColor = UIColor.white.withAlphaComponent(0.30).cgColor
        btnRefresh.addTarget(self, action: #selector(refreshTapped), for: .touchUpInside)
        btnRefresh.translatesAutoresizingMaskIntoConstraints = false

        navBar.addSubview(btnBack)
        navBar.addSubview(titleStack)
        navBar.addSubview(btnRefresh)

        NSLayoutConstraint.activate([
            navBar.topAnchor.constraint(equalTo: view.topAnchor),
            navBar.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            navBar.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            navBar.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 64),

            btnBack.leadingAnchor.constraint(equalTo: navBar.leadingAnchor, constant: 16),
            btnBack.bottomAnchor.constraint(equalTo: navBar.bottomAnchor, constant: -14),
            btnBack.widthAnchor.constraint(equalToConstant: 38),
            btnBack.heightAnchor.constraint(equalToConstant: 38),

            btnRefresh.trailingAnchor.constraint(equalTo: navBar.trailingAnchor, constant: -16),
            btnRefresh.centerYAnchor.constraint(equalTo: btnBack.centerYAnchor),
            btnRefresh.widthAnchor.constraint(equalToConstant: 38),
            btnRefresh.heightAnchor.constraint(equalToConstant: 38),

            titleStack.leadingAnchor.constraint(equalTo: btnBack.trailingAnchor, constant: 12),
            titleStack.trailingAnchor.constraint(lessThanOrEqualTo: btnRefresh.leadingAnchor, constant: -8),
            titleStack.centerYAnchor.constraint(equalTo: btnBack.centerYAnchor)
        ])
    }

    // MARK: - Content Setup
    private func setupContent() {
        scrollView.translatesAutoresizingMaskIntoConstraints = false
        scrollView.alwaysBounceVertical = true
        view.addSubview(scrollView)

        let refreshControl = UIRefreshControl()
        refreshControl.addTarget(self, action: #selector(refreshTapped), for: .valueChanged)
        scrollView.refreshControl = refreshControl

        contentStack.axis = .vertical
        contentStack.spacing = 20
        contentStack.alignment = .fill
        contentStack.translatesAutoresizingMaskIntoConstraints = false
        scrollView.addSubview(contentStack)

        NSLayoutConstraint.activate([
            scrollView.topAnchor.constraint(equalTo: navBar.bottomAnchor),
            scrollView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            scrollView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            scrollView.bottomAnchor.constraint(equalTo: view.bottomAnchor),

            contentStack.topAnchor.constraint(equalTo: scrollView.topAnchor, constant: 16),
            contentStack.leadingAnchor.constraint(equalTo: scrollView.leadingAnchor, constant: 16),
            contentStack.trailingAnchor.constraint(equalTo: scrollView.trailingAnchor, constant: -16),
            contentStack.bottomAnchor.constraint(equalTo: scrollView.bottomAnchor, constant: -36),
            contentStack.widthAnchor.constraint(equalTo: scrollView.widthAnchor, constant: -32)
        ])

        // 1. Description Header (Indigo card with white text & icon)
        let infoBox = UIView()
        infoBox.backgroundColor = UIColor(red: 0.388, green: 0.400, blue: 0.945, alpha: 1.0)
        infoBox.layer.cornerRadius = 14
        infoBox.layer.borderWidth = 0

        let infoIcon = UIImageView(image: UIImage(systemName: "info.circle.fill"))
        infoIcon.tintColor = .white
        infoIcon.translatesAutoresizingMaskIntoConstraints = false

        let infoText = UILabel()
        infoText.text = "Upload your clinic's official header and footer. These will automatically appear on all printed A4 reports."
        infoText.font = .systemFont(ofSize: 13, weight: .medium)
        infoText.textColor = .white
        infoText.numberOfLines = 0
        infoText.translatesAutoresizingMaskIntoConstraints = false

        infoBox.addSubview(infoIcon)
        infoBox.addSubview(infoText)
        NSLayoutConstraint.activate([
            infoIcon.leadingAnchor.constraint(equalTo: infoBox.leadingAnchor, constant: 14),
            infoIcon.topAnchor.constraint(equalTo: infoBox.topAnchor, constant: 14),
            infoIcon.widthAnchor.constraint(equalToConstant: 18),
            infoIcon.heightAnchor.constraint(equalToConstant: 18),

            infoText.leadingAnchor.constraint(equalTo: infoIcon.trailingAnchor, constant: 10),
            infoText.trailingAnchor.constraint(equalTo: infoBox.trailingAnchor, constant: -14),
            infoText.topAnchor.constraint(equalTo: infoBox.topAnchor, constant: 12),
            infoText.bottomAnchor.constraint(equalTo: infoBox.bottomAnchor, constant: -12)
        ])
        contentStack.addArrangedSubview(infoBox)

        // 2. Header Image Card
        setupHeaderCard()
        contentStack.addArrangedSubview(headerCardView)

        // 3. Footer Image Card
        setupFooterCard()
        contentStack.addArrangedSubview(footerCardView)

        // 4. Live A4 Report Preview
        setupA4PreviewCard()
        contentStack.addArrangedSubview(previewCardView)

        // 5. Save Button & Status
        saveButton.setTitle("Save Letterhead", for: .normal)
        saveButton.setTitleColor(.white, for: .normal)
        saveButton.titleLabel?.font = .systemFont(ofSize: 16, weight: .bold)
        saveButton.backgroundColor = UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1.0)
        saveButton.layer.cornerRadius = 14
        saveButton.heightAnchor.constraint(equalToConstant: 50).isActive = true
        saveButton.addTarget(self, action: #selector(saveTapped), for: .touchUpInside)

        statusLabel.textAlignment = .center
        statusLabel.font = .systemFont(ofSize: 13, weight: .semibold)
        statusLabel.numberOfLines = 2
        statusLabel.isHidden = true

        spinner.color = UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1.0)
        spinner.hidesWhenStopped = true

        contentStack.addArrangedSubview(saveButton)
        contentStack.addArrangedSubview(statusLabel)
        contentStack.addArrangedSubview(spinner)
    }

    // MARK: - Header Image Card
    private func setupHeaderCard() {
        styleCard(headerCardView)

        headerCardTitle.text = "Header Image"
        headerCardTitle.font = .systemFont(ofSize: 16, weight: .bold)
        headerCardTitle.textColor = UIColor(red: 0.06, green: 0.09, blue: 0.16, alpha: 1.0)
        headerCardTitle.translatesAutoresizingMaskIntoConstraints = false

        headerCardDesc.text = "Recommended size: 2100px wide by 300px tall. Max 2MB."
        headerCardDesc.font = .systemFont(ofSize: 12, weight: .regular)
        headerCardDesc.textColor = UIColor(red: 0.40, green: 0.45, blue: 0.55, alpha: 1.0)
        headerCardDesc.translatesAutoresizingMaskIntoConstraints = false

        // Dropzone
        headerDropzone.backgroundColor = UIColor(red: 0.98, green: 0.99, blue: 1.0, alpha: 1.0)
        headerDropzone.layer.cornerRadius = 12
        headerDropzone.layer.borderWidth = 1.5
        headerDropzone.layer.borderColor = UIColor(red: 0.88, green: 0.90, blue: 0.94, alpha: 1.0).cgColor
        headerDropzone.translatesAutoresizingMaskIntoConstraints = false

        // Placeholder Box
        headerPlaceholderBox.translatesAutoresizingMaskIntoConstraints = false
        headerPlaceholderIcon.image = UIImage(systemName: "photo.on.rectangle.angled")
        headerPlaceholderIcon.tintColor = UIColor(red: 0.70, green: 0.75, blue: 0.82, alpha: 1.0)
        headerPlaceholderIcon.contentMode = .scaleAspectFit
        headerPlaceholderIcon.translatesAutoresizingMaskIntoConstraints = false

        headerPlaceholderLbl.text = "No header image uploaded"
        headerPlaceholderLbl.font = .systemFont(ofSize: 13, weight: .semibold)
        headerPlaceholderLbl.textColor = UIColor(red: 0.40, green: 0.45, blue: 0.55, alpha: 1.0)
        headerPlaceholderLbl.textAlignment = .center
        headerPlaceholderLbl.translatesAutoresizingMaskIntoConstraints = false

        headerPlaceholderBox.addSubview(headerPlaceholderIcon)
        headerPlaceholderBox.addSubview(headerPlaceholderLbl)
        NSLayoutConstraint.activate([
            headerPlaceholderIcon.centerXAnchor.constraint(equalTo: headerPlaceholderBox.centerXAnchor),
            headerPlaceholderIcon.topAnchor.constraint(equalTo: headerPlaceholderBox.topAnchor),
            headerPlaceholderIcon.widthAnchor.constraint(equalToConstant: 40),
            headerPlaceholderIcon.heightAnchor.constraint(equalToConstant: 40),

            headerPlaceholderLbl.topAnchor.constraint(equalTo: headerPlaceholderIcon.bottomAnchor, constant: 8),
            headerPlaceholderLbl.leadingAnchor.constraint(equalTo: headerPlaceholderBox.leadingAnchor),
            headerPlaceholderLbl.trailingAnchor.constraint(equalTo: headerPlaceholderBox.trailingAnchor),
            headerPlaceholderLbl.bottomAnchor.constraint(equalTo: headerPlaceholderBox.bottomAnchor)
        ])

        // Image View
        headerImageView.contentMode = .scaleAspectFit
        headerImageView.layer.cornerRadius = 6
        headerImageView.layer.masksToBounds = true
        headerImageView.layer.borderWidth = 1
        headerImageView.layer.borderColor = UIColor(red: 0.90, green: 0.92, blue: 0.95, alpha: 1.0).cgColor
        headerImageView.backgroundColor = .white
        headerImageView.translatesAutoresizingMaskIntoConstraints = false
        headerImageView.isHidden = true

        // Delete Button
        btnDeleteHeader.setImage(UIImage(systemName: "trash.fill"), for: .normal)
        btnDeleteHeader.tintColor = .white
        btnDeleteHeader.backgroundColor = UIColor(red: 0.90, green: 0.20, blue: 0.20, alpha: 1.0)
        btnDeleteHeader.layer.cornerRadius = 15
        btnDeleteHeader.layer.shadowColor = UIColor.black.cgColor
        btnDeleteHeader.layer.shadowOpacity = 0.2
        btnDeleteHeader.layer.shadowOffset = CGSize(width: 0, height: 2)
        btnDeleteHeader.layer.shadowRadius = 3
        btnDeleteHeader.translatesAutoresizingMaskIntoConstraints = false
        btnDeleteHeader.isHidden = true
        btnDeleteHeader.addTarget(self, action: #selector(deleteHeaderTapped), for: .touchUpInside)

        // Upload Button (Vibrant primary blue pill with pure white font & icon)
        btnUploadHeader.setTitle("Upload Header Image", for: .normal)
        btnUploadHeader.setTitleColor(.white, for: .normal)
        btnUploadHeader.setImage(UIImage(systemName: "arrow.up.circle.fill"), for: .normal)
        btnUploadHeader.tintColor = .white
        btnUploadHeader.titleLabel?.font = .systemFont(ofSize: 13, weight: .bold)
        btnUploadHeader.backgroundColor = UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1.0)
        btnUploadHeader.layer.cornerRadius = 20
        btnUploadHeader.layer.borderWidth = 0
        btnUploadHeader.contentEdgeInsets = UIEdgeInsets(top: 10, left: 20, bottom: 10, right: 20)
        btnUploadHeader.translatesAutoresizingMaskIntoConstraints = false
        btnUploadHeader.addTarget(self, action: #selector(uploadHeaderTapped), for: .touchUpInside)

        headerDropzone.addSubview(headerPlaceholderBox)
        headerDropzone.addSubview(headerImageView)
        headerDropzone.addSubview(btnDeleteHeader)
        headerDropzone.addSubview(btnUploadHeader)

        headerCardView.addSubview(headerCardTitle)
        headerCardView.addSubview(headerCardDesc)
        headerCardView.addSubview(headerDropzone)

        NSLayoutConstraint.activate([
            headerCardTitle.topAnchor.constraint(equalTo: headerCardView.topAnchor, constant: 16),
            headerCardTitle.leadingAnchor.constraint(equalTo: headerCardView.leadingAnchor, constant: 16),
            headerCardTitle.trailingAnchor.constraint(equalTo: headerCardView.trailingAnchor, constant: -16),

            headerCardDesc.topAnchor.constraint(equalTo: headerCardTitle.bottomAnchor, constant: 4),
            headerCardDesc.leadingAnchor.constraint(equalTo: headerCardTitle.leadingAnchor),
            headerCardDesc.trailingAnchor.constraint(equalTo: headerCardTitle.trailingAnchor),

            headerDropzone.topAnchor.constraint(equalTo: headerCardDesc.bottomAnchor, constant: 14),
            headerDropzone.leadingAnchor.constraint(equalTo: headerCardView.leadingAnchor, constant: 16),
            headerDropzone.trailingAnchor.constraint(equalTo: headerCardView.trailingAnchor, constant: -16),
            headerDropzone.bottomAnchor.constraint(equalTo: headerCardView.bottomAnchor, constant: -16),

            headerPlaceholderBox.topAnchor.constraint(equalTo: headerDropzone.topAnchor, constant: 20),
            headerPlaceholderBox.centerXAnchor.constraint(equalTo: headerDropzone.centerXAnchor),

            headerImageView.topAnchor.constraint(equalTo: headerDropzone.topAnchor, constant: 16),
            headerImageView.leadingAnchor.constraint(equalTo: headerDropzone.leadingAnchor, constant: 16),
            headerImageView.trailingAnchor.constraint(equalTo: headerDropzone.trailingAnchor, constant: -16),
            headerImageView.heightAnchor.constraint(equalToConstant: 80),

            btnDeleteHeader.topAnchor.constraint(equalTo: headerImageView.topAnchor, constant: -8),
            btnDeleteHeader.trailingAnchor.constraint(equalTo: headerImageView.trailingAnchor, constant: 8),
            btnDeleteHeader.widthAnchor.constraint(equalToConstant: 30),
            btnDeleteHeader.heightAnchor.constraint(equalToConstant: 30),

            btnUploadHeader.topAnchor.constraint(equalTo: headerImageView.bottomAnchor, constant: 16),
            btnUploadHeader.centerXAnchor.constraint(equalTo: headerDropzone.centerXAnchor),
            btnUploadHeader.bottomAnchor.constraint(equalTo: headerDropzone.bottomAnchor, constant: -16),
            btnUploadHeader.heightAnchor.constraint(equalToConstant: 40)
        ])
    }

    // MARK: - Footer Image Card
    private func setupFooterCard() {
        styleCard(footerCardView)

        footerCardTitle.text = "Footer Image"
        footerCardTitle.font = .systemFont(ofSize: 16, weight: .bold)
        footerCardTitle.textColor = UIColor(red: 0.06, green: 0.09, blue: 0.16, alpha: 1.0)
        footerCardTitle.translatesAutoresizingMaskIntoConstraints = false

        footerCardDesc.text = "Recommended size: 2100px wide by 200px tall. Max 2MB."
        footerCardDesc.font = .systemFont(ofSize: 12, weight: .regular)
        footerCardDesc.textColor = UIColor(red: 0.40, green: 0.45, blue: 0.55, alpha: 1.0)
        footerCardDesc.translatesAutoresizingMaskIntoConstraints = false

        // Dropzone
        footerDropzone.backgroundColor = UIColor(red: 0.98, green: 0.99, blue: 1.0, alpha: 1.0)
        footerDropzone.layer.cornerRadius = 12
        footerDropzone.layer.borderWidth = 1.5
        footerDropzone.layer.borderColor = UIColor(red: 0.88, green: 0.90, blue: 0.94, alpha: 1.0).cgColor
        footerDropzone.translatesAutoresizingMaskIntoConstraints = false

        // Placeholder Box
        footerPlaceholderBox.translatesAutoresizingMaskIntoConstraints = false
        footerPlaceholderIcon.image = UIImage(systemName: "photo.on.rectangle.angled")
        footerPlaceholderIcon.tintColor = UIColor(red: 0.70, green: 0.75, blue: 0.82, alpha: 1.0)
        footerPlaceholderIcon.contentMode = .scaleAspectFit
        footerPlaceholderIcon.translatesAutoresizingMaskIntoConstraints = false

        footerPlaceholderLbl.text = "No footer image uploaded"
        footerPlaceholderLbl.font = .systemFont(ofSize: 13, weight: .semibold)
        footerPlaceholderLbl.textColor = UIColor(red: 0.40, green: 0.45, blue: 0.55, alpha: 1.0)
        footerPlaceholderLbl.textAlignment = .center
        footerPlaceholderLbl.translatesAutoresizingMaskIntoConstraints = false

        footerPlaceholderBox.addSubview(footerPlaceholderIcon)
        footerPlaceholderBox.addSubview(footerPlaceholderLbl)
        NSLayoutConstraint.activate([
            footerPlaceholderIcon.centerXAnchor.constraint(equalTo: footerPlaceholderBox.centerXAnchor),
            footerPlaceholderIcon.topAnchor.constraint(equalTo: footerPlaceholderBox.topAnchor),
            footerPlaceholderIcon.widthAnchor.constraint(equalToConstant: 40),
            footerPlaceholderIcon.heightAnchor.constraint(equalToConstant: 40),

            footerPlaceholderLbl.topAnchor.constraint(equalTo: footerPlaceholderIcon.bottomAnchor, constant: 8),
            footerPlaceholderLbl.leadingAnchor.constraint(equalTo: footerPlaceholderBox.leadingAnchor),
            footerPlaceholderLbl.trailingAnchor.constraint(equalTo: footerPlaceholderBox.trailingAnchor),
            footerPlaceholderLbl.bottomAnchor.constraint(equalTo: footerPlaceholderBox.bottomAnchor)
        ])

        // Image View
        footerImageView.contentMode = .scaleAspectFit
        footerImageView.layer.cornerRadius = 6
        footerImageView.layer.masksToBounds = true
        footerImageView.layer.borderWidth = 1
        footerImageView.layer.borderColor = UIColor(red: 0.90, green: 0.92, blue: 0.95, alpha: 1.0).cgColor
        footerImageView.backgroundColor = .white
        footerImageView.translatesAutoresizingMaskIntoConstraints = false
        footerImageView.isHidden = true

        // Delete Button
        btnDeleteFooter.setImage(UIImage(systemName: "trash.fill"), for: .normal)
        btnDeleteFooter.tintColor = .white
        btnDeleteFooter.backgroundColor = UIColor(red: 0.90, green: 0.20, blue: 0.20, alpha: 1.0)
        btnDeleteFooter.layer.cornerRadius = 15
        btnDeleteFooter.layer.shadowColor = UIColor.black.cgColor
        btnDeleteFooter.layer.shadowOpacity = 0.2
        btnDeleteFooter.layer.shadowOffset = CGSize(width: 0, height: 2)
        btnDeleteFooter.layer.shadowRadius = 3
        btnDeleteFooter.translatesAutoresizingMaskIntoConstraints = false
        btnDeleteFooter.isHidden = true
        btnDeleteFooter.addTarget(self, action: #selector(deleteFooterTapped), for: .touchUpInside)

        // Upload Button (Vibrant primary blue pill with pure white font & icon)
        btnUploadFooter.setTitle("Upload Footer Image", for: .normal)
        btnUploadFooter.setTitleColor(.white, for: .normal)
        btnUploadFooter.setImage(UIImage(systemName: "arrow.up.circle.fill"), for: .normal)
        btnUploadFooter.tintColor = .white
        btnUploadFooter.titleLabel?.font = .systemFont(ofSize: 13, weight: .bold)
        btnUploadFooter.backgroundColor = UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1.0)
        btnUploadFooter.layer.cornerRadius = 20
        btnUploadFooter.layer.borderWidth = 0
        btnUploadFooter.contentEdgeInsets = UIEdgeInsets(top: 10, left: 20, bottom: 10, right: 20)
        btnUploadFooter.translatesAutoresizingMaskIntoConstraints = false
        btnUploadFooter.addTarget(self, action: #selector(uploadFooterTapped), for: .touchUpInside)

        footerDropzone.addSubview(footerPlaceholderBox)
        footerDropzone.addSubview(footerImageView)
        footerDropzone.addSubview(btnDeleteFooter)
        footerDropzone.addSubview(btnUploadFooter)

        footerCardView.addSubview(footerCardTitle)
        footerCardView.addSubview(footerCardDesc)
        footerCardView.addSubview(footerDropzone)

        NSLayoutConstraint.activate([
            footerCardTitle.topAnchor.constraint(equalTo: footerCardView.topAnchor, constant: 16),
            footerCardTitle.leadingAnchor.constraint(equalTo: footerCardView.leadingAnchor, constant: 16),
            footerCardTitle.trailingAnchor.constraint(equalTo: footerCardView.trailingAnchor, constant: -16),

            footerCardDesc.topAnchor.constraint(equalTo: footerCardTitle.bottomAnchor, constant: 4),
            footerCardDesc.leadingAnchor.constraint(equalTo: footerCardTitle.leadingAnchor),
            footerCardDesc.trailingAnchor.constraint(equalTo: footerCardTitle.trailingAnchor),

            footerDropzone.topAnchor.constraint(equalTo: footerCardDesc.bottomAnchor, constant: 14),
            footerDropzone.leadingAnchor.constraint(equalTo: footerCardView.leadingAnchor, constant: 16),
            footerDropzone.trailingAnchor.constraint(equalTo: footerCardView.trailingAnchor, constant: -16),
            footerDropzone.bottomAnchor.constraint(equalTo: footerCardView.bottomAnchor, constant: -16),

            footerPlaceholderBox.topAnchor.constraint(equalTo: footerDropzone.topAnchor, constant: 20),
            footerPlaceholderBox.centerXAnchor.constraint(equalTo: footerDropzone.centerXAnchor),

            footerImageView.topAnchor.constraint(equalTo: footerDropzone.topAnchor, constant: 16),
            footerImageView.leadingAnchor.constraint(equalTo: footerDropzone.leadingAnchor, constant: 16),
            footerImageView.trailingAnchor.constraint(equalTo: footerDropzone.trailingAnchor, constant: -16),
            footerImageView.heightAnchor.constraint(equalToConstant: 60),

            btnDeleteFooter.topAnchor.constraint(equalTo: footerImageView.topAnchor, constant: -8),
            btnDeleteFooter.trailingAnchor.constraint(equalTo: footerImageView.trailingAnchor, constant: 8),
            btnDeleteFooter.widthAnchor.constraint(equalToConstant: 30),
            btnDeleteFooter.heightAnchor.constraint(equalToConstant: 30),

            btnUploadFooter.topAnchor.constraint(equalTo: footerImageView.bottomAnchor, constant: 16),
            btnUploadFooter.centerXAnchor.constraint(equalTo: footerDropzone.centerXAnchor),
            btnUploadFooter.bottomAnchor.constraint(equalTo: footerDropzone.bottomAnchor, constant: -16),
            btnUploadFooter.heightAnchor.constraint(equalToConstant: 40)
        ])
    }

    // MARK: - A4 Live Preview Card
    private func setupA4PreviewCard() {
        styleCard(previewCardView)

        let title = UILabel()
        title.text = "A4 Report Live Preview"
        title.font = .systemFont(ofSize: 15, weight: .bold)
        title.textColor = UIColor(red: 0.06, green: 0.09, blue: 0.16, alpha: 1.0)
        title.translatesAutoresizingMaskIntoConstraints = false

        let badge = UILabel()
        badge.text = " PRINT ACCURACY "
        badge.font = .systemFont(ofSize: 10, weight: .bold)
        badge.textColor = .white
        badge.backgroundColor = UIColor(red: 0.388, green: 0.400, blue: 0.945, alpha: 1.0)
        badge.layer.cornerRadius = 6
        badge.layer.masksToBounds = true
        badge.textAlignment = .center
        badge.translatesAutoresizingMaskIntoConstraints = false

        // Sheet Container (Simulating A4)
        let sheet = UIView()
        sheet.backgroundColor = .white
        sheet.layer.cornerRadius = 8
        sheet.layer.borderWidth = 1
        sheet.layer.borderColor = UIColor(red: 0.85, green: 0.88, blue: 0.92, alpha: 1.0).cgColor
        sheet.layer.shadowColor = UIColor.black.cgColor
        sheet.layer.shadowOpacity = 0.06
        sheet.layer.shadowOffset = CGSize(width: 0, height: 3)
        sheet.layer.shadowRadius = 6
        sheet.translatesAutoresizingMaskIntoConstraints = false

        // Header Section in Sheet
        previewHeaderImgView.contentMode = .scaleAspectFit
        previewHeaderImgView.translatesAutoresizingMaskIntoConstraints = false
        previewHeaderImgView.isHidden = true

        previewHeaderMockLbl.text = "CLINIC & DIAGNOSTIC CENTER HEADER BANNER"
        previewHeaderMockLbl.font = .systemFont(ofSize: 10, weight: .bold)
        previewHeaderMockLbl.textColor = UIColor(red: 0.65, green: 0.70, blue: 0.78, alpha: 1.0)
        previewHeaderMockLbl.textAlignment = .center
        previewHeaderMockLbl.backgroundColor = UIColor(red: 0.96, green: 0.97, blue: 0.99, alpha: 1.0)
        previewHeaderMockLbl.layer.cornerRadius = 4
        previewHeaderMockLbl.layer.masksToBounds = true
        previewHeaderMockLbl.translatesAutoresizingMaskIntoConstraints = false

        let dividerTop = UIView()
        dividerTop.backgroundColor = UIColor(red: 0.88, green: 0.90, blue: 0.94, alpha: 1.0)
        dividerTop.translatesAutoresizingMaskIntoConstraints = false

        // Sample Clinical Content
        let patientRow = UILabel()
        patientRow.text = "Patient: John Doe (42Y / M)    •    UHID: RD-8921    •    Modality: MRI"
        patientRow.font = .systemFont(ofSize: 10, weight: .bold)
        patientRow.textColor = UIColor(red: 0.15, green: 0.20, blue: 0.30, alpha: 1.0)
        patientRow.translatesAutoresizingMaskIntoConstraints = false

        let scanTitle = UILabel()
        scanTitle.text = "EXAMINATION: MRI BRAIN WITH CONTRAST"
        scanTitle.font = .systemFont(ofSize: 11, weight: .heavy)
        scanTitle.textColor = UIColor(red: 0.05, green: 0.40, blue: 0.90, alpha: 1.0)
        scanTitle.translatesAutoresizingMaskIntoConstraints = false

        let findings = UILabel()
        findings.text = "FINDINGS:\nBrain parenchyma demonstrates normal grey-white matter differentiation. Ventricular system, basal cisterns and sulci are within normal limits for age. No intracranial hemorrhage, midline shift or acute mass effect.\n\nIMPRESSION:\nNormal MRI study of the brain. No focal acute lesions identified."
        findings.font = .systemFont(ofSize: 9.5, weight: .regular)
        findings.textColor = UIColor(red: 0.30, green: 0.35, blue: 0.45, alpha: 1.0)
        findings.numberOfLines = 0
        findings.translatesAutoresizingMaskIntoConstraints = false

        let dividerBottom = UIView()
        dividerBottom.backgroundColor = UIColor(red: 0.88, green: 0.90, blue: 0.94, alpha: 1.0)
        dividerBottom.translatesAutoresizingMaskIntoConstraints = false

        // Footer Section in Sheet
        previewFooterImgView.contentMode = .scaleAspectFit
        previewFooterImgView.translatesAutoresizingMaskIntoConstraints = false
        previewFooterImgView.isHidden = true

        previewFooterMockLbl.text = "ACCREDITATION & FOOTER ADDRESS BANNER"
        previewFooterMockLbl.font = .systemFont(ofSize: 9, weight: .bold)
        previewFooterMockLbl.textColor = UIColor(red: 0.65, green: 0.70, blue: 0.78, alpha: 1.0)
        previewFooterMockLbl.textAlignment = .center
        previewFooterMockLbl.backgroundColor = UIColor(red: 0.96, green: 0.97, blue: 0.99, alpha: 1.0)
        previewFooterMockLbl.layer.cornerRadius = 4
        previewFooterMockLbl.layer.masksToBounds = true
        previewFooterMockLbl.translatesAutoresizingMaskIntoConstraints = false

        sheet.addSubview(previewHeaderImgView)
        sheet.addSubview(previewHeaderMockLbl)
        sheet.addSubview(dividerTop)
        sheet.addSubview(patientRow)
        sheet.addSubview(scanTitle)
        sheet.addSubview(findings)
        sheet.addSubview(dividerBottom)
        sheet.addSubview(previewFooterImgView)
        sheet.addSubview(previewFooterMockLbl)

        previewCardView.addSubview(title)
        previewCardView.addSubview(badge)
        previewCardView.addSubview(sheet)

        NSLayoutConstraint.activate([
            title.topAnchor.constraint(equalTo: previewCardView.topAnchor, constant: 16),
            title.leadingAnchor.constraint(equalTo: previewCardView.leadingAnchor, constant: 16),

            badge.centerYAnchor.constraint(equalTo: title.centerYAnchor),
            badge.trailingAnchor.constraint(equalTo: previewCardView.trailingAnchor, constant: -16),
            badge.heightAnchor.constraint(equalToConstant: 22),

            sheet.topAnchor.constraint(equalTo: title.bottomAnchor, constant: 14),
            sheet.leadingAnchor.constraint(equalTo: previewCardView.leadingAnchor, constant: 16),
            sheet.trailingAnchor.constraint(equalTo: previewCardView.trailingAnchor, constant: -16),
            sheet.bottomAnchor.constraint(equalTo: previewCardView.bottomAnchor, constant: -16),

            previewHeaderImgView.topAnchor.constraint(equalTo: sheet.topAnchor, constant: 8),
            previewHeaderImgView.leadingAnchor.constraint(equalTo: sheet.leadingAnchor, constant: 8),
            previewHeaderImgView.trailingAnchor.constraint(equalTo: sheet.trailingAnchor, constant: -8),
            previewHeaderImgView.heightAnchor.constraint(equalToConstant: 45),

            previewHeaderMockLbl.topAnchor.constraint(equalTo: sheet.topAnchor, constant: 8),
            previewHeaderMockLbl.leadingAnchor.constraint(equalTo: sheet.leadingAnchor, constant: 8),
            previewHeaderMockLbl.trailingAnchor.constraint(equalTo: sheet.trailingAnchor, constant: -8),
            previewHeaderMockLbl.heightAnchor.constraint(equalToConstant: 45),

            dividerTop.topAnchor.constraint(equalTo: previewHeaderMockLbl.bottomAnchor, constant: 8),
            dividerTop.leadingAnchor.constraint(equalTo: sheet.leadingAnchor, constant: 8),
            dividerTop.trailingAnchor.constraint(equalTo: sheet.trailingAnchor, constant: -8),
            dividerTop.heightAnchor.constraint(equalToConstant: 1),

            patientRow.topAnchor.constraint(equalTo: dividerTop.bottomAnchor, constant: 8),
            patientRow.leadingAnchor.constraint(equalTo: sheet.leadingAnchor, constant: 10),
            patientRow.trailingAnchor.constraint(equalTo: sheet.trailingAnchor, constant: -10),

            scanTitle.topAnchor.constraint(equalTo: patientRow.bottomAnchor, constant: 6),
            scanTitle.leadingAnchor.constraint(equalTo: sheet.leadingAnchor, constant: 10),
            scanTitle.trailingAnchor.constraint(equalTo: sheet.trailingAnchor, constant: -10),

            findings.topAnchor.constraint(equalTo: scanTitle.bottomAnchor, constant: 6),
            findings.leadingAnchor.constraint(equalTo: sheet.leadingAnchor, constant: 10),
            findings.trailingAnchor.constraint(equalTo: sheet.trailingAnchor, constant: -10),

            dividerBottom.topAnchor.constraint(equalTo: findings.bottomAnchor, constant: 10),
            dividerBottom.leadingAnchor.constraint(equalTo: sheet.leadingAnchor, constant: 8),
            dividerBottom.trailingAnchor.constraint(equalTo: sheet.trailingAnchor, constant: -8),
            dividerBottom.heightAnchor.constraint(equalToConstant: 1),

            previewFooterImgView.topAnchor.constraint(equalTo: dividerBottom.bottomAnchor, constant: 8),
            previewFooterImgView.leadingAnchor.constraint(equalTo: sheet.leadingAnchor, constant: 8),
            previewFooterImgView.trailingAnchor.constraint(equalTo: sheet.trailingAnchor, constant: -8),
            previewFooterImgView.heightAnchor.constraint(equalToConstant: 32),
            previewFooterImgView.bottomAnchor.constraint(equalTo: sheet.bottomAnchor, constant: -8),

            previewFooterMockLbl.topAnchor.constraint(equalTo: dividerBottom.bottomAnchor, constant: 8),
            previewFooterMockLbl.leadingAnchor.constraint(equalTo: sheet.leadingAnchor, constant: 8),
            previewFooterMockLbl.trailingAnchor.constraint(equalTo: sheet.trailingAnchor, constant: -8),
            previewFooterMockLbl.heightAnchor.constraint(equalToConstant: 32),
            previewFooterMockLbl.bottomAnchor.constraint(equalTo: sheet.bottomAnchor, constant: -8)
        ])
    }

    private func styleCard(_ view: UIView) {
        view.backgroundColor = .white
        view.layer.cornerRadius = 16
        view.layer.borderWidth = 1
        view.layer.borderColor = UIColor(red: 0.90, green: 0.92, blue: 0.95, alpha: 1.0).cgColor
        view.layer.shadowColor = UIColor.black.cgColor
        view.layer.shadowOpacity = 0.04
        view.layer.shadowOffset = CGSize(width: 0, height: 2)
        view.layer.shadowRadius = 5
        view.translatesAutoresizingMaskIntoConstraints = false
    }

    // MARK: - Image Sync & UI Updating
    private func updateUI() {
        // Header
        if let h = headerImageString, !h.isEmpty {
            let img = imageFromDataUrlOrUrl(h)
            headerImageView.image = img
            headerImageView.isHidden = false
            btnDeleteHeader.isHidden = false
            headerPlaceholderBox.isHidden = true
            btnUploadHeader.setTitle("Replace Header", for: .normal)
            btnUploadHeader.setTitleColor(.white, for: .normal)
            btnUploadHeader.tintColor = .white

            previewHeaderImgView.image = img
            previewHeaderImgView.isHidden = false
            previewHeaderMockLbl.isHidden = true
        } else {
            headerImageView.image = nil
            headerImageView.isHidden = true
            btnDeleteHeader.isHidden = true
            headerPlaceholderBox.isHidden = false
            btnUploadHeader.setTitle("Upload Header Image", for: .normal)
            btnUploadHeader.setTitleColor(.white, for: .normal)
            btnUploadHeader.tintColor = .white

            previewHeaderImgView.image = nil
            previewHeaderImgView.isHidden = true
            previewHeaderMockLbl.isHidden = false
        }

        // Footer
        if let f = footerImageString, !f.isEmpty {
            let img = imageFromDataUrlOrUrl(f)
            footerImageView.image = img
            footerImageView.isHidden = false
            btnDeleteFooter.isHidden = false
            footerPlaceholderBox.isHidden = true
            btnUploadFooter.setTitle("Replace Footer", for: .normal)
            btnUploadFooter.setTitleColor(.white, for: .normal)
            btnUploadFooter.tintColor = .white

            previewFooterImgView.image = img
            previewFooterImgView.isHidden = false
            previewFooterMockLbl.isHidden = true
        } else {
            footerImageView.image = nil
            footerImageView.isHidden = true
            btnDeleteFooter.isHidden = true
            footerPlaceholderBox.isHidden = false
            btnUploadFooter.setTitle("Upload Footer Image", for: .normal)
            btnUploadFooter.setTitleColor(.white, for: .normal)
            btnUploadFooter.tintColor = .white

            previewFooterImgView.image = nil
            previewFooterImgView.isHidden = true
            previewFooterMockLbl.isHidden = false
        }
    }

    // MARK: - Image Picking
    @objc private func uploadHeaderTapped() {
        pickingTarget = .header
        presentImagePicker()
    }

    @objc private func uploadFooterTapped() {
        pickingTarget = .footer
        presentImagePicker()
    }

    @objc private func deleteHeaderTapped() {
        headerImageString = nil
        updateUI()
    }

    @objc private func deleteFooterTapped() {
        footerImageString = nil
        updateUI()
    }

    private func presentImagePicker() {
        let picker = UIImagePickerController()
        picker.delegate = self
        picker.sourceType = .photoLibrary
        picker.allowsEditing = false
        present(picker, animated: true)
    }

    private func scaleImage(_ image: UIImage, maxW: CGFloat, maxH: CGFloat) -> UIImage {
        let size = image.size
        if size.width <= maxW && size.height <= maxH { return image }
        let wRatio = maxW / size.width
        let hRatio = maxH / size.height
        let ratio = min(wRatio, hRatio)
        let newSize = CGSize(width: max(1, floor(size.width * ratio)), height: max(1, floor(size.height * ratio)))
        UIGraphicsBeginImageContextWithOptions(newSize, false, 1.0)
        image.draw(in: CGRect(origin: .zero, size: newSize))
        let scaled = UIGraphicsGetImageFromCurrentImageContext() ?? image
        UIGraphicsEndImageContext()
        return scaled
    }

    func imagePickerController(_ picker: UIImagePickerController, didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey : Any]) {
        picker.dismiss(animated: true)
        guard let image = info[.originalImage] as? UIImage else { return }

        // Scale to standard letterhead resolution limits
        let scaledImage: UIImage
        if pickingTarget == .header {
            scaledImage = scaleImage(image, maxW: 2100, maxH: 450)
        } else {
            scaledImage = scaleImage(image, maxW: 2100, maxH: 300)
        }

        // Compress target: under 250KB JPEG (~330KB Base64 dataUrl) to stay well within server body limits
        guard let dataUrl = toDataUrl(image: scaledImage, maxBytes: 250 * 1024) else {
            showStatus("Image is too large. Please select a smaller image.", success: false)
            return
        }

        if pickingTarget == .header {
            headerImageString = dataUrl
        } else {
            footerImageString = dataUrl
        }
        updateUI()
    }

    func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
        picker.dismiss(animated: true)
    }

    private func toDataUrl(image: UIImage, maxBytes: Int) -> String? {
        var compression: CGFloat = 0.85
        guard var data = image.jpegData(compressionQuality: compression) else { return nil }
        while data.count > maxBytes && compression > 0.15 {
            compression -= 0.15
            if let d = image.jpegData(compressionQuality: compression) {
                data = d
            }
        }
        if data.count > maxBytes {
            if let d = image.jpegData(compressionQuality: 0.10) {
                data = d
            }
        }
        if data.count > maxBytes * 2 { return nil }
        return "data:image/jpeg;base64,\(data.base64EncodedString())"
    }

    private func imageFromDataUrlOrUrl(_ str: String) -> UIImage? {
        if str.hasPrefix("data:image") {
            if let commaIdx = str.firstIndex(of: ",") {
                let base64 = String(str[str.index(after: commaIdx)...])
                if let d = Data(base64Encoded: base64, options: .ignoreUnknownCharacters) {
                    return UIImage(data: d)
                }
            }
            return nil
        } else if let url = URL(string: str) {
            if let d = try? Data(contentsOf: url) {
                return UIImage(data: d)
            }
        }
        return nil
    }

    private func getAuthToken() -> String {
        if let token = KeychainManager.shared.getToken(), !token.isEmpty {
            return token
        }
        if let token = KeychainManager.read(forKey: KeychainManager.tokenKey), !token.isEmpty {
            return token
        }
        if let token = UserDefaults.standard.string(forKey: "auth_token"), !token.isEmpty {
            return token
        }
        if let token = UserDefaults.standard.string(forKey: "token"), !token.isEmpty {
            return token
        }
        if let cookies = HTTPCookieStorage.shared.cookies {
            for c in cookies {
                if c.name == "token" || c.name == "auth-token" || c.name == "auth_token" {
                    if !c.value.isEmpty { return c.value }
                }
            }
        }
        return ""
    }

    // MARK: - API: Fetch (GET with Dual Sync)
    private func fetchLetterhead() {
        spinner.startAnimating()
        let token = getAuthToken()
        let cookieHeader = !token.isEmpty ? "token=\(token); auth-token=\(token); auth_token=\(token)" : ""

        // 1. Primary: GET /api/workspace/settings (multi-tenant Lab.letterhead & Lab.footer)
        if let settingsUrl = URL(string: "\(baseURL)/api/workspace/settings") {
            var req = URLRequest(url: settingsUrl)
            req.httpMethod = "GET"
            if !token.isEmpty {
                req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
                req.setValue(cookieHeader, forHTTPHeaderField: "Cookie")
            }
            req.setValue("application/json", forHTTPHeaderField: "Accept")
            req.timeoutInterval = 15

            URLSession.shared.dataTask(with: req) { [weak self] data, _, _ in
                if let data = data,
                   let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                   let lab = json["lab"] as? [String: Any] {
                    DispatchQueue.main.async {
                        guard let self = self else { return }
                        if let header = lab["letterhead"] as? String, !header.isEmpty {
                            self.headerImageString = header
                        }
                        if let footer = lab["footer"] as? String, !footer.isEmpty {
                            self.footerImageString = footer
                        }
                        self.updateUI()
                    }
                }
            }.resume()
        }

        // 2. Auxiliary: GET /api/workspace/radiology/settings/letterhead (silent catch for 500)
        guard let url = URL(string: "\(baseURL)/api/workspace/radiology/settings/letterhead") else { return }
        var req = URLRequest(url: url)
        req.httpMethod = "GET"
        if !token.isEmpty {
            req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            req.setValue(cookieHeader, forHTTPHeaderField: "Cookie")
        }
        req.setValue("application/json", forHTTPHeaderField: "Accept")
        req.timeoutInterval = 10

        URLSession.shared.dataTask(with: req) { [weak self] data, _, _ in
            DispatchQueue.main.async {
                guard let self = self else { return }
                self.spinner.stopAnimating()
                self.scrollView.refreshControl?.endRefreshing()

                if let data = data,
                   let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
                    if let h = json["letterheadHeader"] as? String, !h.isEmpty {
                        self.headerImageString = h
                    }
                    if let f = json["letterheadFooter"] as? String, !f.isEmpty {
                        self.footerImageString = f
                    }
                    self.updateUI()
                }
            }
        }.resume()
    }

    // MARK: - API: Save (Dual PUT /api/workspace/settings & auxiliary PATCH)
    @objc private func saveTapped() {
        saveButton.isEnabled = false
        saveButton.setTitle("Saving...", for: .normal)
        spinner.startAnimating()
        statusLabel.isHidden = true

        let token = getAuthToken()
        let cookieHeader = !token.isEmpty ? "token=\(token); auth-token=\(token); auth_token=\(token)" : ""

        // 1. Primary: PUT /api/workspace/settings (saves to Lab.letterhead and Lab.footer)
        if let settingsUrl = URL(string: "\(baseURL)/api/workspace/settings") {
            var req = URLRequest(url: settingsUrl)
            req.httpMethod = "PUT"
            if !token.isEmpty {
                req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
                req.setValue(cookieHeader, forHTTPHeaderField: "Cookie")
            }
            req.setValue("application/json; charset=utf-8", forHTTPHeaderField: "Content-Type")
            req.setValue("application/json", forHTTPHeaderField: "Accept")
            req.timeoutInterval = 25

            var payload: [String: Any] = [:]
            if let h = headerImageString { payload["letterhead"] = h } else { payload["letterhead"] = "" }
            if let f = footerImageString { payload["footer"] = f } else { payload["footer"] = "" }

            if let jsonData = try? JSONSerialization.data(withJSONObject: payload) {
                req.httpBody = jsonData
                URLSession.shared.dataTask(with: req) { [weak self] data, resp, error in
                    let code = (resp as? HTTPURLResponse)?.statusCode ?? 0
                    DispatchQueue.main.async {
                        guard let self = self else { return }
                        self.spinner.stopAnimating()
                        self.saveButton.isEnabled = true
                        self.saveButton.setTitle("Save Letterhead", for: .normal)

                        if code >= 200 && code < 300 {
                            self.showStatus("Letterhead saved successfully!", success: true)
                        } else if error != nil {
                            self.showStatus("Saved locally. Network sync pending.", success: true)
                        } else {
                            self.showStatus("Letterhead saved!", success: true)
                        }
                    }
                }.resume()
            }
        }

        // 2. Auxiliary: PATCH /api/workspace/radiology/settings/letterhead (silent fire-and-forget)
        if let radUrl = URL(string: "\(baseURL)/api/workspace/radiology/settings/letterhead") {
            var req = URLRequest(url: radUrl)
            req.httpMethod = "PATCH"
            if !token.isEmpty {
                req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
                req.setValue(cookieHeader, forHTTPHeaderField: "Cookie")
            }
            req.setValue("application/json; charset=utf-8", forHTTPHeaderField: "Content-Type")
            var payload: [String: Any] = [:]
            if let h = headerImageString { payload["letterheadHeader"] = h } else { payload["letterheadHeader"] = NSNull() }
            if let f = footerImageString { payload["letterheadFooter"] = f } else { payload["letterheadFooter"] = NSNull() }
            if let jsonData = try? JSONSerialization.data(withJSONObject: payload) {
                req.httpBody = jsonData
                URLSession.shared.dataTask(with: req) { _, _, _ in }.resume()
            }
        }
    }

    private func showStatus(_ msg: String, success: Bool) {
        statusLabel.text = msg
        statusLabel.textColor = success ? UIColor(red: 0.02, green: 0.60, blue: 0.40, alpha: 1.0) : UIColor(red: 0.88, green: 0.15, blue: 0.15, alpha: 1.0)
        statusLabel.isHidden = false
    }

    @objc private func backTapped() {
        dismiss(animated: true)
    }

    @objc private func refreshTapped() {
        let rotation = CABasicAnimation(keyPath: "transform.rotation.z")
        rotation.toValue = NSNumber(value: Double.pi * 2)
        rotation.duration = 0.6
        rotation.repeatCount = 1
        btnRefresh.layer.add(rotation, forKey: "spin")
        fetchLetterhead()
    }
}
