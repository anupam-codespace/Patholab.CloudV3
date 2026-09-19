import UIKit

class LoginViewController: AuthBaseViewController {

    // MARK: – UI
    private let emailField    = UITextField()
    private let passwordField = UITextField()
    private var submitButton: UIButton?
    private let spinner       = UIActivityIndicatorView(style: .medium)
    private var eyeButton: UIButton!

    private var prefilledEmail: String?
    private var initialSuccessMessage: String?

    var onLoginSuccess: (() -> Void)?

    // MARK: – Initializers

    init(prefilledEmail: String? = nil, initialSuccessMessage: String? = nil) {
        self.prefilledEmail = prefilledEmail
        self.initialSuccessMessage = initialSuccessMessage
        super.init(nibName: nil, bundle: nil)
    }

    required init?(coder: NSCoder) {
        super.init(coder: coder)
    }

    // MARK: – Lifecycle

    override func viewDidLoad() {
        super.viewDidLoad()
        buildUI()
        registerKeyboardObservers()
        addDismissKeyboardGesture()

        if let email = prefilledEmail, !email.isEmpty {
            emailField.text = email
        }
        if let msg = initialSuccessMessage, !msg.isEmpty {
            showSuccess(msg)
        }
        // Clean stale cookies to avoid any legacy cookie session conflicts
        AuthService.clearWebViewCookie()
    }

    // MARK: – Build UI

    private func buildUI() {
        // ── Header ──────────────────────────────────────────────────────────
        let headerStack = UIStackView()
        headerStack.axis = .vertical
        headerStack.spacing = 8
        headerStack.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(headerStack)

        let titleLabel    = makeLabel("Sign In",             size: 38, weight: .black, color: .white)
        let subtitleLabel = makeLabel("Welcome back! Please sign in.", size: 15, weight: .regular,
                                      color: UIColor(red: 199/255, green: 210/255, blue: 254/255, alpha: 1))
        headerStack.addArrangedSubview(titleLabel)
        headerStack.addArrangedSubview(subtitleLabel)

        // ── Card ─────────────────────────────────────────────────────────────
        let spacer = UIView()
        spacer.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(spacer)
        setupCard(below: spacer, in: view)

        // Constraints
        NSLayoutConstraint.activate([
            headerStack.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 20),
            headerStack.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 28),
            headerStack.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -28),
            spacer.topAnchor.constraint(equalTo: headerStack.bottomAnchor, constant: 36),
            spacer.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            spacer.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            spacer.heightAnchor.constraint(equalToConstant: 0)
        ])

        // ── Card content ──────────────────────────────────────────────────────
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

        // Error banner
        let (banner, label) = makeErrorBanner()
        self.errorBanner = banner
        self.errorLabel  = label
        content.addArrangedSubview(banner)
        content.setCustomSpacing(20, after: banner)

        // Email
        content.addArrangedSubview(sectionLabel("Email address"))
        content.setCustomSpacing(8, after: content.arrangedSubviews.last!)
        let email = makeTextField(placeholder: "workmail@gmail.com", keyboardType: .emailAddress)
        email.textContentType = .emailAddress
        self.emailField.copyProperties(from: email)
        let emailTF = configuredEmailField()
        content.addArrangedSubview(emailTF)
        content.setCustomSpacing(20, after: emailTF)

        // Password
        let pwdRow = UIView()
        pwdRow.translatesAutoresizingMaskIntoConstraints = false
        let pwdLabel = sectionLabel("Password")
        let forgotLabel = UILabel()
        forgotLabel.text = "Forgot password"
        forgotLabel.font = .systemFont(ofSize: 13, weight: .medium)
        forgotLabel.textColor = AuthBaseViewController.textSecondary
        forgotLabel.tag = 101
        forgotLabel.isUserInteractionEnabled = true
        forgotLabel.addGestureRecognizer(UITapGestureRecognizer(target: self, action: #selector(forgotTapped)))
        pwdLabel.translatesAutoresizingMaskIntoConstraints = false
        forgotLabel.translatesAutoresizingMaskIntoConstraints = false
        pwdRow.addSubview(pwdLabel)
        pwdRow.addSubview(forgotLabel)
        NSLayoutConstraint.activate([
            pwdRow.heightAnchor.constraint(equalToConstant: 20),
            pwdLabel.leadingAnchor.constraint(equalTo: pwdRow.leadingAnchor),
            pwdLabel.centerYAnchor.constraint(equalTo: pwdRow.centerYAnchor),
            forgotLabel.trailingAnchor.constraint(equalTo: pwdRow.trailingAnchor),
            forgotLabel.centerYAnchor.constraint(equalTo: pwdRow.centerYAnchor)
        ])
        content.addArrangedSubview(pwdRow)
        content.setCustomSpacing(8, after: pwdRow)

        let pwdTF = configuredPasswordField()
        content.addArrangedSubview(pwdTF)
        content.setCustomSpacing(24, after: pwdTF)

        // Login button
        let btn = makePrimaryButton(title: "Log In")
        btn.addTarget(self, action: #selector(loginTapped), for: .touchUpInside)
        self.submitButton = btn
        content.addArrangedSubview(btn)

        // Spinner
        spinner.translatesAutoresizingMaskIntoConstraints = false
        spinner.color = AuthBaseViewController.indigoMid
        spinner.hidesWhenStopped = true
        content.addArrangedSubview(spinner)
        content.setCustomSpacing(24, after: btn)

        // Sign up link
        let signUpRow = makeFooterLink(text: "Have an account? ", linkText: "Sign up", action: #selector(signUpTapped))
        content.addArrangedSubview(signUpRow)
        content.setCustomSpacing(24, after: signUpRow)

        // Legal links
        let legalFooter = makeLegalFooter()
        content.addArrangedSubview(legalFooter)
        content.setCustomSpacing(6, after: legalFooter)

        // Copyright
        let copyright = makeLabel("© 2026 Globizhub India Pvt. Ltd. · All rights reserved", size: 11, weight: .regular, color: AuthBaseViewController.textHint)
        copyright.textAlignment = .center
        content.addArrangedSubview(copyright)
    }

    // MARK: – Field Factories

    private func configuredEmailField() -> UITextField {
        configureTextField(emailField, placeholder: "workmail@gmail.com", keyboardType: .emailAddress)
        emailField.textContentType = .emailAddress
        emailField.returnKeyType = .next
        emailField.tag = 1
        emailField.delegate = self
        emailField.accessibilityIdentifier = "email_field"
        return emailField
    }

    private func configuredPasswordField() -> UIView {
        configureTextField(passwordField, placeholder: "Enter your password", isSecure: true)
        passwordField.textContentType = .password
        passwordField.returnKeyType = .done
        passwordField.tag = 2
        passwordField.delegate = self
        passwordField.accessibilityIdentifier = "password_field"

        let (container, eye) = makeAnimatedPasswordRow(tf: passwordField, identifier: "password_field")
        self.eyeButton = eye
        return container
    }

    private func sectionLabel(_ text: String) -> UILabel {
        return makeLabel(text, size: 14, weight: .semibold, color: AuthBaseViewController.textPrimary)
    }

    private func makeLinkLabel(_ text: String) -> UILabel {
        let l = UILabel()
        l.text = text
        l.font = .systemFont(ofSize: 14, weight: .bold)
        l.textColor = AuthBaseViewController.indigoMid
        l.translatesAutoresizingMaskIntoConstraints = false
        return l
    }

    private func makeFooterLink(text: String, linkText: String, action: Selector) -> UIView {
        let container = UIView()
        container.translatesAutoresizingMaskIntoConstraints = false
        let label = UILabel()
        label.text = text + linkText
        let attributed = NSMutableAttributedString(
            string: text,
            attributes: [.foregroundColor: AuthBaseViewController.textSecondary,
                         .font: UIFont.systemFont(ofSize: 14)]
        )
        attributed.append(NSAttributedString(
            string: linkText,
            attributes: [.foregroundColor: AuthBaseViewController.indigoMid,
                         .font: UIFont.systemFont(ofSize: 14, weight: .bold)]
        ))
        label.attributedText = attributed
        label.textAlignment = .center
        label.isUserInteractionEnabled = true
        label.addGestureRecognizer(UITapGestureRecognizer(target: self, action: action))
        label.translatesAutoresizingMaskIntoConstraints = false
        container.addSubview(label)
        NSLayoutConstraint.activate([
            container.heightAnchor.constraint(equalToConstant: 20),
            label.centerXAnchor.constraint(equalTo: container.centerXAnchor),
            label.centerYAnchor.constraint(equalTo: container.centerYAnchor)
        ])
        return container
    }

    // MARK: – Actions

    @objc private func loginTapped() {
        let email = (emailField.text ?? findTextField(id: "email_field")?.text ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        let password = passwordField.text ?? findTextField(id: "password_field")?.text ?? ""

        if email.isEmpty || !isValidEmail(email) {
            showError("Please enter a valid email address.")
            return
        }
        if password.isEmpty {
            showError("Please enter your password.")
            return
        }

        hideError()
        setLoading(true)

        AuthService.login(email: email, password: password) { [weak self] success, error, token, user in
            guard let self = self else { return }

            DispatchQueue.main.async {
                self.setLoading(false)
                if success {
                    var resolvedName = ""
                    if let user = user {
                        if let name = user["name"] as? String, !name.isEmpty, !name.contains("@"), name.lowercased() != "null" {
                            resolvedName = HomeNativeView.formatSmartFirstName(name)
                        }
                        if let userEmail = user["email"] as? String, !userEmail.isEmpty {
                            UserDefaults.standard.set(userEmail, forKey: "user_email")
                        }
                        if let role = user["role"] as? String, !role.isEmpty {
                            UserDefaults.standard.set(role, forKey: "user_role")
                        }
                        var labId = (user["lab_id"] as? String) ?? (user["labId"] as? String)
                        var labName = (user["lab_name"] as? String) ?? (user["labName"] as? String)
                        if let labObj = user["lab"] as? [String: Any] {
                            if let id = labObj["id"] as? String, !id.isEmpty { labId = id }
                            if let name = labObj["name"] as? String, !name.isEmpty { labName = name }
                        }
                        if let labId = labId, !labId.isEmpty {
                            UserDefaults.standard.set(labId, forKey: "lab_id")
                        }
                        if let labName = labName, !labName.isEmpty {
                            UserDefaults.standard.set(labName, forKey: "lab_name")
                        }
                        if let branchId = (user["branchId"] as? String) ?? (user["branch_id"] as? String), !branchId.isEmpty {
                            UserDefaults.standard.set(branchId, forKey: "branch_id")
                        }
                        if let userId = user["id"] as? String, !userId.isEmpty {
                            UserDefaults.standard.set(userId, forKey: "user_id")
                        }
                    }
                    if resolvedName.isEmpty {
                        resolvedName = HomeNativeView.formatSmartFirstName(email)
                    }
                    UserDefaults.standard.set(resolvedName, forKey: "user_name")
                    if let token = token, !token.isEmpty {
                        UserDefaults.standard.set(token, forKey: "auth_token")
                        KeychainManager.save(token, forKey: KeychainManager.tokenKey)
                    }

                    MobileNotificationHelper.shared.scheduleWelcomeNotification(userName: resolvedName, userId: email)
                    NSLog("[LoginViewController] Login success, navigating to main app")
                    if let presenting = self.presentingViewController {
                        presenting.dismiss(animated: false) {
                            if let onLoginSuccess = self.onLoginSuccess {
                                onLoginSuccess()
                            } else if let app = UIApplication.shared.delegate as? AppDelegate {
                                app.presentMainApp()
                            }
                        }
                    } else {
                        if let onLoginSuccess = self.onLoginSuccess {
                            onLoginSuccess()
                        } else if let app = UIApplication.shared.delegate as? AppDelegate {
                            app.presentMainApp()
                        }
                    }
                } else {
                    self.showError(error ?? "Login failed. Please try again.")
                }
            }
        }
    }

    @objc private func forgotTapped() {
        let vc = ForgotPasswordViewController()
        vc.modalPresentationStyle = .fullScreen
        present(vc, animated: true)
    }

    @objc private func signUpTapped() {
        let vc = RegisterViewController()
        vc.modalPresentationStyle = .fullScreen
        present(vc, animated: true)
    }

    @objc private func togglePassword(_ sender: UIButton) {
        if let tf = findTextField(id: "password_field") {
            tf.isSecureTextEntry.toggle()
            let img = tf.isSecureTextEntry ? "eye.slash" : "eye"
            sender.setImage(UIImage(systemName: img), for: .normal)
        }
    }

    private func setLoading(_ loading: Bool) {
        if loading {
            spinner.startAnimating()
            submitButton?.isEnabled = false
            submitButton?.alpha = 0.75
            submitButton?.setTitle("Logging in...", for: .normal)
        } else {
            spinner.stopAnimating()
            submitButton?.isEnabled = true
            submitButton?.alpha = 1.0
            submitButton?.setTitle("Log In", for: .normal)
        }
    }

    // MARK: – Helpers

    private func findTextField(id: String) -> UITextField? {
        return view.allSubviews.first(where: { ($0 as? UITextField)?.accessibilityIdentifier == id }) as? UITextField
    }

    private func isValidEmail(_ email: String) -> Bool {
        let regex = "[A-Z0-9a-z._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}"
        return NSPredicate(format: "SELF MATCHES %@", regex).evaluate(with: email)
    }
}

// MARK: – UITextFieldDelegate
extension LoginViewController: UITextFieldDelegate {
    func textFieldShouldReturn(_ textField: UITextField) -> Bool {
        if textField.tag == 1 {
            findTextField(id: "password_field")?.becomeFirstResponder()
        } else {
            textField.resignFirstResponder()
            loginTapped()
        }
        return true
    }
}

// MARK: – UITextField copy helper
extension UITextField {
    func copyProperties(from other: UITextField) {
        // Intentionally empty — we use accessibilityIdentifier for lookup
    }
}

// MARK: – View recursive subview search
extension UIView {
    var allSubviews: [UIView] {
        return subviews + subviews.flatMap { $0.allSubviews }
    }
}
