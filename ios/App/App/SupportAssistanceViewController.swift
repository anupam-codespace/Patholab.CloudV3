import UIKit

class SupportAssistanceViewController: UIViewController {

    static let supportPhone = "+918402010207"
    static let supportPhoneDisplay = "+91 8402010207"
    static let supportEmail = "support@patholab.cloud"
    static let supportDashboardUrl = "https://patholab.cloud/support"

    private let dimView = UIView()
    private let cardContainer = UIView()
    private let headerView = UIView()
    private let bodyView = UIView()

    init() {
        super.init(nibName: nil, bundle: nil)
        modalPresentationStyle = .overFullScreen
        modalTransitionStyle = .crossDissolve
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        setupUI()
    }

    private func setupUI() {
        view.backgroundColor = .clear

        // Dim overlay
        dimView.backgroundColor = UIColor.black.withAlphaComponent(0.6)
        dimView.alpha = 0
        dimView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(dimView)

        let tapDismiss = UITapGestureRecognizer(target: self, action: #selector(dismissModal))
        dimView.addGestureRecognizer(tapDismiss)

        // Drop shadow container
        let shadowContainer = UIView()
        shadowContainer.backgroundColor = .clear
        shadowContainer.layer.shadowColor = UIColor.black.cgColor
        shadowContainer.layer.shadowOpacity = 0.35
        shadowContainer.layer.shadowRadius = 20
        shadowContainer.layer.shadowOffset = CGSize(width: 0, height: 8)
        shadowContainer.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(shadowContainer)

        // Card container
        cardContainer.backgroundColor = .clear
        cardContainer.layer.cornerRadius = 24
        cardContainer.layer.masksToBounds = true
        cardContainer.layer.borderWidth = 1.2
        cardContainer.layer.borderColor = UIColor(white: 1.0, alpha: 0.25).cgColor
        cardContainer.translatesAutoresizingMaskIntoConstraints = false
        shadowContainer.addSubview(cardContainer)

        // Header view
        headerView.backgroundColor = UIColor(red: 11/255, green: 21/255, blue: 40/255, alpha: 1) // #0B1528
        headerView.translatesAutoresizingMaskIntoConstraints = false
        cardContainer.addSubview(headerView)

        // Support Headset Icon (Replacing Nautical Lifebuoy)
        let iconView = UIImageView()
        let config = UIImage.SymbolConfiguration(pointSize: 22, weight: .bold)
        iconView.image = UIImage(systemName: "headphones", withConfiguration: config) ?? UIImage(systemName: "person.wave.2.fill", withConfiguration: config)
        iconView.tintColor = UIColor(red: 56/255, green: 189/255, blue: 248/255, alpha: 1) // #38BDF8
        iconView.contentMode = .scaleAspectFit
        iconView.translatesAutoresizingMaskIntoConstraints = false

        // Title: Support Desk
        let titleLabel = UILabel()
        titleLabel.text = "Support Concierge"
        titleLabel.textColor = .white
        titleLabel.font = .systemFont(ofSize: 20, weight: .bold)
        titleLabel.translatesAutoresizingMaskIntoConstraints = false

        // Close button
        let closeBtn = UIButton(type: .system)
        let closeConfig = UIImage.SymbolConfiguration(pointSize: 15, weight: .semibold)
        closeBtn.setImage(UIImage(systemName: "xmark", withConfiguration: closeConfig), for: .normal)
        closeBtn.tintColor = UIColor(red: 148/255, green: 163/255, blue: 184/255, alpha: 1) // #94A3B8
        closeBtn.addTarget(self, action: #selector(dismissModal), for: .touchUpInside)
        closeBtn.translatesAutoresizingMaskIntoConstraints = false

        let topRow = UIStackView(arrangedSubviews: [iconView, titleLabel, closeBtn])
        topRow.axis = .horizontal
        topRow.alignment = .center
        topRow.spacing = 10
        topRow.translatesAutoresizingMaskIntoConstraints = false
        headerView.addSubview(topRow)

        // Subtitle
        let subtitleLabel = UILabel()
        subtitleLabel.text = "24/7 Priority Assistance for your laboratory."
        subtitleLabel.textColor = UIColor(red: 148/255, green: 163/255, blue: 184/255, alpha: 1) // #94A3B8
        subtitleLabel.font = .systemFont(ofSize: 13.5, weight: .regular)
        subtitleLabel.numberOfLines = 0
        subtitleLabel.translatesAutoresizingMaskIntoConstraints = false
        headerView.addSubview(subtitleLabel)

        // Body view (Frosted glassmorphism background)
        bodyView.backgroundColor = UIColor(white: 1.0, alpha: 0.95)
        bodyView.translatesAutoresizingMaskIntoConstraints = false
        cardContainer.addSubview(bodyView)

        // Row 1: Priority Call
        let callRow = createContactRow(
            iconName: "phone.fill",
            header: "CALL SUPPORT",
            value: Self.supportPhoneDisplay,
            iconTint: UIColor(red: 37/255, green: 99/255, blue: 235/255, alpha: 1),
            iconBg: UIColor(red: 239/255, green: 246/255, blue: 255/255, alpha: 1),
            action: #selector(callTapped)
        )

        // Row 2: WhatsApp Chat
        let waRow = createContactRow(
            iconName: "WhatsAppLogo",
            header: "WHATSAPP CHAT",
            value: "Instant chat assistance",
            iconTint: UIColor(red: 22/255, green: 163/255, blue: 74/255, alpha: 1),
            iconBg: .clear,
            action: #selector(whatsappTapped)
        )

        // Row 3: Email Support (Gmail)
        let emailRow = createContactRow(
            iconName: "GmailLogo",
            header: "EMAIL SUPPORT (GMAIL)",
            value: Self.supportEmail,
            iconTint: UIColor(red: 234/255, green: 67/255, blue: 53/255, alpha: 1),
            iconBg: .clear,
            action: #selector(emailTapped)
        )

        // Button: Open Support Dashboard
        let dashboardBtn = UIButton(type: .custom)
        dashboardBtn.backgroundColor = UIColor(red: 79/255, green: 70/255, blue: 229/255, alpha: 1) // Indigo #4F46E5
        dashboardBtn.layer.cornerRadius = 14
        dashboardBtn.layer.masksToBounds = true
        dashboardBtn.translatesAutoresizingMaskIntoConstraints = false
        dashboardBtn.addTarget(self, action: #selector(dashboardTapped), for: .touchUpInside)

        let btnTitle = UILabel()
        btnTitle.text = "Support Tickets & Helpdesk"
        btnTitle.textColor = .white
        btnTitle.font = .systemFont(ofSize: 15.5, weight: .semibold)
        btnTitle.translatesAutoresizingMaskIntoConstraints = false

        let externalIcon = UIImageView()
        let extConfig = UIImage.SymbolConfiguration(pointSize: 15, weight: .semibold)
        externalIcon.image = UIImage(systemName: "arrow.up.right.square", withConfiguration: extConfig) ?? UIImage(systemName: "arrow.up.right", withConfiguration: extConfig)
        externalIcon.tintColor = .white
        externalIcon.contentMode = .scaleAspectFit
        externalIcon.translatesAutoresizingMaskIntoConstraints = false

        let btnStack = UIStackView(arrangedSubviews: [btnTitle, externalIcon])
        btnStack.axis = .horizontal
        btnStack.spacing = 8
        btnStack.alignment = .center
        btnStack.isUserInteractionEnabled = false
        btnStack.translatesAutoresizingMaskIntoConstraints = false
        dashboardBtn.addSubview(btnStack)

        let bodyStack = UIStackView(arrangedSubviews: [callRow, waRow, emailRow, dashboardBtn])
        bodyStack.axis = .vertical
        bodyStack.spacing = 18
        bodyStack.translatesAutoresizingMaskIntoConstraints = false
        bodyView.addSubview(bodyStack)

        NSLayoutConstraint.activate([
            // Dim
            dimView.topAnchor.constraint(equalTo: view.topAnchor),
            dimView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            dimView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            dimView.bottomAnchor.constraint(equalTo: view.bottomAnchor),

            // Shadow & Card Container
            shadowContainer.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            shadowContainer.centerYAnchor.constraint(equalTo: view.centerYAnchor),
            shadowContainer.widthAnchor.constraint(equalTo: view.widthAnchor, constant: -40),
            shadowContainer.widthAnchor.constraint(lessThanOrEqualToConstant: 400),

            cardContainer.topAnchor.constraint(equalTo: shadowContainer.topAnchor),
            cardContainer.leadingAnchor.constraint(equalTo: shadowContainer.leadingAnchor),
            cardContainer.trailingAnchor.constraint(equalTo: shadowContainer.trailingAnchor),
            cardContainer.bottomAnchor.constraint(equalTo: shadowContainer.bottomAnchor),

            // Header View
            headerView.topAnchor.constraint(equalTo: cardContainer.topAnchor),
            headerView.leadingAnchor.constraint(equalTo: cardContainer.leadingAnchor),
            headerView.trailingAnchor.constraint(equalTo: cardContainer.trailingAnchor),

            iconView.widthAnchor.constraint(equalToConstant: 24),
            iconView.heightAnchor.constraint(equalToConstant: 24),
            closeBtn.widthAnchor.constraint(equalToConstant: 32),
            closeBtn.heightAnchor.constraint(equalToConstant: 32),

            topRow.topAnchor.constraint(equalTo: headerView.topAnchor, constant: 22),
            topRow.leadingAnchor.constraint(equalTo: headerView.leadingAnchor, constant: 22),
            topRow.trailingAnchor.constraint(equalTo: headerView.trailingAnchor, constant: -18),

            subtitleLabel.topAnchor.constraint(equalTo: topRow.bottomAnchor, constant: 10),
            subtitleLabel.leadingAnchor.constraint(equalTo: headerView.leadingAnchor, constant: 22),
            subtitleLabel.trailingAnchor.constraint(equalTo: headerView.trailingAnchor, constant: -22),
            subtitleLabel.bottomAnchor.constraint(equalTo: headerView.bottomAnchor, constant: -20),

            // Body View
            bodyView.topAnchor.constraint(equalTo: headerView.bottomAnchor),
            bodyView.leadingAnchor.constraint(equalTo: cardContainer.leadingAnchor),
            bodyView.trailingAnchor.constraint(equalTo: cardContainer.trailingAnchor),
            bodyView.bottomAnchor.constraint(equalTo: cardContainer.bottomAnchor),

            bodyStack.topAnchor.constraint(equalTo: bodyView.topAnchor, constant: 20),
            bodyStack.leadingAnchor.constraint(equalTo: bodyView.leadingAnchor, constant: 20),
            bodyStack.trailingAnchor.constraint(equalTo: bodyView.trailingAnchor, constant: -20),
            bodyStack.bottomAnchor.constraint(equalTo: bodyView.bottomAnchor, constant: -24),

            // Dashboard button
            dashboardBtn.heightAnchor.constraint(equalToConstant: 52),
            btnStack.centerXAnchor.constraint(equalTo: dashboardBtn.centerXAnchor),
            btnStack.centerYAnchor.constraint(equalTo: dashboardBtn.centerYAnchor)
        ])
    }

    private func createContactRow(iconName: String, header: String, value: String, iconTint: UIColor = UIColor(red: 2/255, green: 132/255, blue: 199/255, alpha: 1), iconBg: UIColor = UIColor(red: 224/255, green: 242/255, blue: 254/255, alpha: 1), action: Selector) -> UIView {
        let container = UIControl()
        container.translatesAutoresizingMaskIntoConstraints = false
        container.addTarget(self, action: action, for: .touchUpInside)

        let iconBox = UIView()
        iconBox.backgroundColor = iconBg
        iconBox.layer.cornerRadius = 12
        iconBox.isUserInteractionEnabled = false
        iconBox.translatesAutoresizingMaskIntoConstraints = false

        let iconImageView = UIImageView()
        if let custom = UIImage(named: iconName) {
            iconImageView.image = custom
        } else {
            let config = UIImage.SymbolConfiguration(pointSize: 18, weight: .semibold)
            iconImageView.image = UIImage(systemName: iconName, withConfiguration: config)
            iconImageView.tintColor = iconTint
        }
        iconImageView.contentMode = .scaleAspectFit
        iconImageView.translatesAutoresizingMaskIntoConstraints = false
        iconBox.addSubview(iconImageView)

        let headerLabel = UILabel()
        headerLabel.text = header
        headerLabel.textColor = UIColor(red: 100/255, green: 116/255, blue: 139/255, alpha: 1) // #64748B
        headerLabel.font = .systemFont(ofSize: 11, weight: .bold)
        headerLabel.isUserInteractionEnabled = false

        let valueLabel = UILabel()
        valueLabel.text = value
        valueLabel.textColor = UIColor(red: 15/255, green: 23/255, blue: 42/255, alpha: 1) // #0F172A
        valueLabel.font = .systemFont(ofSize: 15.5, weight: .bold)
        valueLabel.isUserInteractionEnabled = false

        let textStack = UIStackView(arrangedSubviews: [headerLabel, valueLabel])
        textStack.axis = .vertical
        textStack.spacing = 3
        textStack.isUserInteractionEnabled = false
        textStack.translatesAutoresizingMaskIntoConstraints = false

        let hStack = UIStackView(arrangedSubviews: [iconBox, textStack])
        hStack.axis = .horizontal
        hStack.spacing = 14
        hStack.alignment = .center
        hStack.isUserInteractionEnabled = false
        hStack.translatesAutoresizingMaskIntoConstraints = false
        container.addSubview(hStack)

        NSLayoutConstraint.activate([
            iconBox.widthAnchor.constraint(equalToConstant: 48),
            iconBox.heightAnchor.constraint(equalToConstant: 48),
            iconImageView.centerXAnchor.constraint(equalTo: iconBox.centerXAnchor),
            iconImageView.centerYAnchor.constraint(equalTo: iconBox.centerYAnchor),
            iconImageView.widthAnchor.constraint(equalToConstant: 38),
            iconImageView.heightAnchor.constraint(equalToConstant: 38),

            hStack.topAnchor.constraint(equalTo: container.topAnchor, constant: 4),
            hStack.bottomAnchor.constraint(equalTo: container.bottomAnchor, constant: -4),
            hStack.leadingAnchor.constraint(equalTo: container.leadingAnchor, constant: 4),
            hStack.trailingAnchor.constraint(equalTo: container.trailingAnchor, constant: -4)
        ])

        return container
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        UIView.animate(withDuration: 0.25) {
            self.dimView.alpha = 1
        }
    }

    @objc private func dismissModal() {
        UIView.animate(withDuration: 0.2, animations: {
            self.dimView.alpha = 0
            self.cardContainer.alpha = 0
        }) { _ in
            self.dismiss(animated: false, completion: nil)
        }
    }

    @objc private func callTapped() {
        if let url = URL(string: "tel:\(Self.supportPhone)") {
            UIApplication.shared.open(url, options: [:], completionHandler: nil)
        }
    }

    @objc private func whatsappTapped() {
        let msg = "Hello Patholab Cloud Support, I need assistance with my laboratory."
        let cleanPhone = Self.supportPhone.replacingOccurrences(of: "+", with: "")
        if let url = URL(string: "https://api.whatsapp.com/send?phone=\(cleanPhone)&text=\(msg.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? "")") {
            UIApplication.shared.open(url, options: [:], completionHandler: nil)
        }
    }

    @objc private func emailTapped() {
        if let url = URL(string: "mailto:\(Self.supportEmail)?subject=Patholab%20Assistance%20Request") {
            UIApplication.shared.open(url, options: [:], completionHandler: nil)
        }
    }

    @objc private func dashboardTapped() {
        let presenting = self.presentingViewController
        dismissModal()
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.25) {
            let supportVC = SupportViewController()
            supportVC.modalPresentationStyle = .fullScreen
            presenting?.present(supportVC, animated: true, completion: nil)
        }
    }
}
