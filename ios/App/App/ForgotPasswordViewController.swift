import UIKit

class ForgotPasswordViewController: AuthBaseViewController {

    private let emailField = UITextField()
    private let sendButton = UIButton()
    private let spinner    = UIActivityIndicatorView(style: .medium)

    override func viewDidLoad() {
        super.viewDidLoad()
        buildUI()
        registerKeyboardObservers()
        addDismissKeyboardGesture()
    }

    private func buildUI() {
        let headerStack = UIStackView()
        headerStack.axis = .vertical
        headerStack.spacing = 2
        headerStack.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(headerStack)

        let titleLabel = makeLabel("Forgot Password", size: 32, weight: .black, color: .white)
        titleLabel.adjustsFontSizeToFitWidth = true
        titleLabel.minimumScaleFactor = 0.8
        let subtitleLabel = makeLabel("Enter your email to get a reset code.", size: 13.5, weight: .regular, color: UIColor(red: 199/255, green: 210/255, blue: 254/255, alpha: 1))
        headerStack.addArrangedSubview(titleLabel)
        headerStack.addArrangedSubview(subtitleLabel)

        let spacer = UIView()
        spacer.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(spacer)

        NSLayoutConstraint.activate([
            headerStack.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 14),
            headerStack.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 24),
            headerStack.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -24),

            spacer.topAnchor.constraint(equalTo: headerStack.bottomAnchor, constant: 16),
            spacer.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            spacer.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            spacer.heightAnchor.constraint(equalToConstant: 0)
        ])

        setupCard(below: spacer, in: view)

        let content = UIStackView()
        content.axis = .vertical
        content.spacing = 0
        content.translatesAutoresizingMaskIntoConstraints = false
        cardContentView.addSubview(content)

        NSLayoutConstraint.activate([
            content.topAnchor.constraint(equalTo: cardContentView.topAnchor, constant: 32),
            content.leadingAnchor.constraint(equalTo: cardContentView.leadingAnchor, constant: 24),
            content.trailingAnchor.constraint(equalTo: cardContentView.trailingAnchor, constant: -24),
            content.bottomAnchor.constraint(equalTo: cardContentView.bottomAnchor, constant: -40)
        ])

        let (banner, label) = makeErrorBanner()
        self.errorBanner = banner
        self.errorLabel = label
        content.addArrangedSubview(banner)
        content.setCustomSpacing(20, after: banner)

        content.addArrangedSubview(makeLabel("Email address", size: 14, weight: .semibold, color: AuthBaseViewController.textPrimary))
        content.setCustomSpacing(8, after: content.arrangedSubviews.last!)

        configureTextField(emailField, placeholder: "workmail@gmail.com", keyboardType: .emailAddress)
        content.addArrangedSubview(emailField)
        content.setCustomSpacing(24, after: emailField)

        let btn = makePrimaryButton(title: "Send Reset Code")
        btn.addTarget(self, action: #selector(sendTapped), for: .touchUpInside)
        content.addArrangedSubview(btn)

        spinner.translatesAutoresizingMaskIntoConstraints = false
        spinner.color = AuthBaseViewController.indigoMid
        spinner.hidesWhenStopped = true
        content.addArrangedSubview(spinner)
        content.setCustomSpacing(16, after: btn)

        // Outlined Back to Login Box Button
        let backToLoginBtn = UIButton(type: .system)
        backToLoginBtn.setTitle("Back to Login", for: .normal)
        backToLoginBtn.setTitleColor(AuthBaseViewController.indigoMid, for: .normal)
        backToLoginBtn.titleLabel?.font = .systemFont(ofSize: 15, weight: .bold)
        backToLoginBtn.backgroundColor = .white
        backToLoginBtn.layer.cornerRadius = 14
        backToLoginBtn.layer.borderWidth = 1.5
        backToLoginBtn.layer.borderColor = UIColor(red: 203/255, green: 213/255, blue: 225/255, alpha: 1).cgColor
        backToLoginBtn.addTarget(self, action: #selector(backTapped), for: .touchUpInside)
        backToLoginBtn.translatesAutoresizingMaskIntoConstraints = false
        backToLoginBtn.heightAnchor.constraint(equalToConstant: 52).isActive = true
        content.addArrangedSubview(backToLoginBtn)
        content.setCustomSpacing(20, after: backToLoginBtn)

        // Legal links
        let legalFooter = makeLegalFooter()
        content.addArrangedSubview(legalFooter)
        content.setCustomSpacing(6, after: legalFooter)

        let copyright = makeLabel("© 2026 Globizhub India Pvt. Ltd. · All rights reserved", size: 11, weight: .regular, color: AuthBaseViewController.textHint)
        copyright.textAlignment = .center
        content.addArrangedSubview(copyright)
    }

    @objc private func backTapped() {
        dismiss(animated: true)
    }

    @objc private func sendTapped() {
        let email = (emailField.text ?? "").trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        guard !email.isEmpty && email.contains("@") else {
            showError("Please enter a valid email address.")
            return
        }

        hideError()
        setLoading(true)

        AuthService.forgotPassword(email: email) { [weak self] success, error in
            DispatchQueue.main.async {
                self?.setLoading(false)
                if success {
                    self?.showSuccess("Reset code sent to \(email)!")
                    DispatchQueue.main.asyncAfter(deadline: .now() + 1.2) {
                        let otpVC = OtpVerifyViewController(email: email, mode: .reset)
                        otpVC.modalPresentationStyle = .fullScreen
                        self?.present(otpVC, animated: true)
                    }
                } else {
                    self?.showError(error ?? "No account found with this email address.")
                }
            }
        }
    }

    private func setLoading(_ loading: Bool) {
        if loading { spinner.startAnimating() } else { spinner.stopAnimating() }
        view.subviews.compactMap { $0 as? UIButton }.forEach { $0.isEnabled = !loading }
    }
}
