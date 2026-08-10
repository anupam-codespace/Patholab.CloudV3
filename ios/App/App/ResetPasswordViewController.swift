import UIKit

class ResetPasswordViewController: AuthBaseViewController {

    private let email: String
    private let code: String

    private let newPasswordField     = UITextField()
    private let confirmPasswordField = UITextField()
    private let newPwdErrorLabel     = UILabel()
    private let confirmPwdErrorLabel = UILabel()

    private let resetButton = UIButton()
    private let spinner     = UIActivityIndicatorView(style: .medium)

    init(email: String, code: String) {
        self.email = email
        self.code = code
        super.init(nibName: nil, bundle: nil)
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

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

        let titleLabel = makeLabel("Reset Password", size: 38, weight: .black, color: .white)
        let subtitleLabel = makeLabel("Enter your new password below.", size: 14, weight: .regular, color: UIColor(red: 199/255, green: 210/255, blue: 254/255, alpha: 1))
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

        content.addArrangedSubview(makeLabel("New Password", size: 14, weight: .semibold, color: AuthBaseViewController.textPrimary))
        content.setCustomSpacing(6, after: content.arrangedSubviews.last!)
        newPasswordField.copyProperties(from: makeTextField(placeholder: "Min. 8 characters", isSecure: true))
        let newContainer = createSecureContainer(tf: newPasswordField, identifier: "reset_new")
        content.addArrangedSubview(newContainer)
        setupErrorLabel(newPwdErrorLabel, to: content)

        content.addArrangedSubview(makeLabel("Confirm New Password", size: 14, weight: .semibold, color: AuthBaseViewController.textPrimary))
        content.setCustomSpacing(6, after: content.arrangedSubviews.last!)
        confirmPasswordField.copyProperties(from: makeTextField(placeholder: "Re-enter new password", isSecure: true))
        let confirmContainer = createSecureContainer(tf: confirmPasswordField, identifier: "reset_confirm")
        content.addArrangedSubview(confirmContainer)
        setupErrorLabel(confirmPwdErrorLabel, to: content)

        let btn = makePrimaryButton(title: "Reset Password")
        btn.addTarget(self, action: #selector(resetTapped), for: .touchUpInside)
        content.setCustomSpacing(20, after: content.arrangedSubviews.last!)
        content.addArrangedSubview(btn)

        spinner.translatesAutoresizingMaskIntoConstraints = false
        spinner.color = AuthBaseViewController.indigoMid
        spinner.hidesWhenStopped = true
        content.addArrangedSubview(spinner)
    }

    private func setupErrorLabel(_ label: UILabel, to stack: UIStackView) {
        label.font = .systemFont(ofSize: 12, weight: .medium)
        label.textColor = AuthBaseViewController.errorRed
        label.isHidden = true
        label.numberOfLines = 0
        stack.setCustomSpacing(4, after: stack.arrangedSubviews.last!)
        stack.addArrangedSubview(label)
        stack.setCustomSpacing(14, after: label)
    }

    private func createSecureContainer(tf: UITextField, identifier: String) -> UIView {
        let container = UIView()
        container.translatesAutoresizingMaskIntoConstraints = false
        container.heightAnchor.constraint(equalToConstant: 52).isActive = true
        tf.accessibilityIdentifier = identifier
        tf.translatesAutoresizingMaskIntoConstraints = false
        container.addSubview(tf)

        let eye = UIButton(type: .system)
        eye.setImage(UIImage(systemName: "eye.slash"), for: .normal)
        eye.tintColor = AuthBaseViewController.textHint
        eye.translatesAutoresizingMaskIntoConstraints = false
        eye.addAction(UIAction { [weak tf, weak eye] _ in
            tf?.isSecureTextEntry.toggle()
            let img = (tf?.isSecureTextEntry ?? true) ? "eye.slash" : "eye"
            eye?.setImage(UIImage(systemName: img), for: .normal)
        }, for: .touchUpInside)
        container.addSubview(eye)

        NSLayoutConstraint.activate([
            tf.topAnchor.constraint(equalTo: container.topAnchor),
            tf.bottomAnchor.constraint(equalTo: container.bottomAnchor),
            tf.leadingAnchor.constraint(equalTo: container.leadingAnchor),
            tf.trailingAnchor.constraint(equalTo: container.trailingAnchor),
            eye.trailingAnchor.constraint(equalTo: container.trailingAnchor, constant: -12),
            eye.centerYAnchor.constraint(equalTo: container.centerYAnchor),
            eye.widthAnchor.constraint(equalToConstant: 32),
            eye.heightAnchor.constraint(equalToConstant: 32)
        ])
        return container
    }

    @objc private func backTapped() {
        dismiss(animated: true)
    }

    @objc private func resetTapped() {
        hideError()
        let newPwd = newPasswordField.text ?? ""
        let confirmPwd = confirmPasswordField.text ?? ""

        var valid = true
        if newPwd.count < 8 {
            newPwdErrorLabel.text = "Password must be at least 8 characters"
            newPwdErrorLabel.isHidden = false
            valid = false
        } else { newPwdErrorLabel.isHidden = true }

        if confirmPwd != newPwd {
            confirmPwdErrorLabel.text = "Passwords do not match"
            confirmPwdErrorLabel.isHidden = false
            valid = false
        } else { confirmPwdErrorLabel.isHidden = true }

        guard valid else { return }

        setLoading(true)

        AuthService.resetPassword(email: email, code: code, newPassword: newPwd) { [weak self] success, error in
            DispatchQueue.main.async {
                self?.setLoading(false)
                if success {
                    self?.view.window?.rootViewController?.dismiss(animated: true)
                } else {
                    self?.showError(error ?? "Reset failed")
                }
            }
        }
    }

    private func setLoading(_ loading: Bool) {
        if loading { spinner.startAnimating() } else { spinner.stopAnimating() }
        view.subviews.compactMap { $0 as? UIButton }.forEach { $0.isEnabled = !loading }
    }
}
