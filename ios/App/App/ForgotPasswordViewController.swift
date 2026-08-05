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
        let backBtn = makeBackButton()
        backBtn.addTarget(self, action: #selector(backTapped), for: .touchUpInside)
        backBtn.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(backBtn)

        let headerStack = UIStackView()
        headerStack.axis = .vertical
        headerStack.spacing = 6
        headerStack.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(headerStack)

        let titleLabel = makeLabel("Forgot Password", size: 30, weight: .heavy, color: .white)
        let subtitleLabel = makeLabel("Enter your email to get a reset code.", size: 14, weight: .regular, color: UIColor(red: 199/255, green: 210/255, blue: 254/255, alpha: 1))
        headerStack.addArrangedSubview(titleLabel)
        headerStack.addArrangedSubview(subtitleLabel)

        let spacer = UIView()
        spacer.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(spacer)

        NSLayoutConstraint.activate([
            backBtn.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 12),
            backBtn.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 24),
            headerStack.topAnchor.constraint(equalTo: backBtn.bottomAnchor, constant: 16),
            headerStack.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 28),
            headerStack.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -28),
            spacer.topAnchor.constraint(equalTo: headerStack.bottomAnchor, constant: 24),
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

        let tf = makeTextField(placeholder: "workmail@gmail.com", keyboardType: .emailAddress)
        emailField.copyProperties(from: tf)
        content.addArrangedSubview(tf)
        content.setCustomSpacing(24, after: tf)

        let btn = makePrimaryButton(title: "Send Reset Code")
        btn.addTarget(self, action: #selector(sendTapped), for: .touchUpInside)
        content.addArrangedSubview(btn)

        spinner.translatesAutoresizingMaskIntoConstraints = false
        spinner.color = AuthBaseViewController.indigoMid
        spinner.hidesWhenStopped = true
        content.addArrangedSubview(spinner)
        content.setCustomSpacing(20, after: btn)

        let backLink = UILabel()
        backLink.text = "← Back to Login"
        backLink.textColor = AuthBaseViewController.indigoMid
        backLink.font = .systemFont(ofSize: 14, weight: .bold)
        backLink.textAlignment = .center
        backLink.isUserInteractionEnabled = true
        backLink.addGestureRecognizer(UITapGestureRecognizer(target: self, action: #selector(backTapped)))
        content.addArrangedSubview(backLink)
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

        AuthService.forgotPassword(email: email) { [weak self] _, _ in
            DispatchQueue.main.async {
                self?.setLoading(false)
                self?.showSuccess("If an account exists for \(email), a reset code was sent.")
                DispatchQueue.main.asyncAfter(deadline: .now() + 1.8) {
                    let otpVC = OtpVerifyViewController(email: email, mode: .reset)
                    otpVC.modalPresentationStyle = .fullScreen
                    self?.present(otpVC, animated: true)
                }
            }
        }
    }

    private func setLoading(_ loading: Bool) {
        if loading { spinner.startAnimating() } else { spinner.stopAnimating() }
        view.subviews.compactMap { $0 as? UIButton }.forEach { $0.isEnabled = !loading }
    }
}
