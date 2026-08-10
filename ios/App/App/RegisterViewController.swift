import UIKit

class RegisterViewController: AuthBaseViewController {

    private let labNameField   = UITextField()
    private let nameField      = UITextField()
    private let phoneField     = UITextField()
    private let emailField     = UITextField()
    private let passwordField  = UITextField()
    private let confirmField   = UITextField()

    private let labNameErrorLabel = UILabel()
    private let nameErrorLabel    = UILabel()
    private let phoneErrorLabel   = UILabel()
    private let emailErrorLabel   = UILabel()
    private let passwordErrorLabel = UILabel()
    private let confirmErrorLabel  = UILabel()

    private let registerButton = UIButton()
    private let spinner        = UIActivityIndicatorView(style: .medium)

    private let strengthBar = UIStackView()
    private let strengthLabel = UILabel()
    private var bars: [UIView] = []

    override func viewDidLoad() {
        super.viewDidLoad()
        buildUI()
        registerKeyboardObservers()
        addDismissKeyboardGesture()
    }

    private func buildUI() {
        // ── Header ──────────────────────────────────────────────────────────
        let backBtn = makeBackButton()
        backBtn.addTarget(self, action: #selector(backTapped), for: .touchUpInside)
        backBtn.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(backBtn)

        let headerStack = UIStackView()
        headerStack.axis = .vertical
        headerStack.spacing = 6
        headerStack.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(headerStack)

        let titleLabel = makeLabel("Create Account", size: 38, weight: .black, color: .white)
        let subtitleLabel = makeLabel("Start your lab's digital journey today.", size: 14, weight: .regular, color: UIColor(red: 199/255, green: 210/255, blue: 254/255, alpha: 1))
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
            content.topAnchor.constraint(equalTo: cardContentView.topAnchor, constant: 24),
            content.leadingAnchor.constraint(equalTo: cardContentView.leadingAnchor, constant: 24),
            content.trailingAnchor.constraint(equalTo: cardContentView.trailingAnchor, constant: -24),
            content.bottomAnchor.constraint(equalTo: cardContentView.bottomAnchor, constant: -40)
        ])

        let (banner, label) = makeErrorBanner()
        self.errorBanner = banner
        self.errorLabel = label
        content.addArrangedSubview(banner)
        content.setCustomSpacing(16, after: banner)

        // Fields setup
        addFieldSection("Lab / Organization Name *", field: labNameField, placeholder: "e.g. Apex Diagnostics", errorLabel: labNameErrorLabel, to: content)
        addFieldSection("Your Full Name *", field: nameField, placeholder: "Dr. John Doe", errorLabel: nameErrorLabel, to: content)
        addFieldSection("Phone Number *", field: phoneField, placeholder: "98765 43210", keyboardType: .phonePad, errorLabel: phoneErrorLabel, to: content)
        addFieldSection("Email Address *", field: emailField, placeholder: "admin@apexdiagnostics.com", keyboardType: .emailAddress, errorLabel: emailErrorLabel, to: content)

        // Password field
        content.addArrangedSubview(makeFieldLabel("Password *"))
        content.setCustomSpacing(6, after: content.arrangedSubviews.last!)
        passwordField.copyProperties(from: makeTextField(placeholder: "Min. 8 characters", isSecure: true))
        let pwdContainer = createSecureContainer(tf: passwordField, identifier: "reg_password")
        passwordField.addTarget(self, action: #selector(passwordChanged), for: .editingChanged)
        content.addArrangedSubview(pwdContainer)

        // Strength Bar
        setupStrengthBar()
        content.setCustomSpacing(6, after: pwdContainer)
        content.addArrangedSubview(strengthBar)
        content.setCustomSpacing(4, after: strengthBar)
        strengthLabel.font = .systemFont(ofSize: 11, weight: .bold)
        strengthLabel.isHidden = true
        content.addArrangedSubview(strengthLabel)

        setupErrorLabel(passwordErrorLabel, to: content)

        // Confirm Password
        content.addArrangedSubview(makeFieldLabel("Confirm Password *"))
        content.setCustomSpacing(6, after: content.arrangedSubviews.last!)
        confirmField.copyProperties(from: makeTextField(placeholder: "Re-enter password", isSecure: true))
        let confirmContainer = createSecureContainer(tf: confirmField, identifier: "reg_confirm")
        content.addArrangedSubview(confirmContainer)
        setupErrorLabel(confirmErrorLabel, to: content)

        // Register Button
        let btn = makePrimaryButton(title: "Create Account")
        btn.addTarget(self, action: #selector(registerTapped), for: .touchUpInside)
        content.setCustomSpacing(20, after: content.arrangedSubviews.last!)
        content.addArrangedSubview(btn)

        spinner.translatesAutoresizingMaskIntoConstraints = false
        spinner.color = AuthBaseViewController.indigoMid
        spinner.hidesWhenStopped = true
        content.addArrangedSubview(spinner)
        content.setCustomSpacing(20, after: btn)

        // Footer
        let loginRow = makeFooterLink(text: "Already have an account? ", linkText: "Log in", action: #selector(backTapped))
        content.addArrangedSubview(loginRow)
        content.setCustomSpacing(24, after: loginRow)

        let copyright = makeLabel("© 2026 Globiz Patholab · All rights reserved", size: 12, weight: .regular, color: AuthBaseViewController.textHint)
        copyright.textAlignment = .center
        content.addArrangedSubview(copyright)
    }

    private func addFieldSection(_ title: String, field: UITextField, placeholder: String, keyboardType: UIKeyboardType = .default, errorLabel: UILabel, to stack: UIStackView) {
        stack.addArrangedSubview(makeFieldLabel(title))
        stack.setCustomSpacing(6, after: stack.arrangedSubviews.last!)
        let tf = makeTextField(placeholder: placeholder, keyboardType: keyboardType)
        field.copyProperties(from: tf)
        stack.addArrangedSubview(tf)
        setupErrorLabel(errorLabel, to: stack)
    }

    private func makeFieldLabel(_ text: String) -> UILabel {
        return makeLabel(text, size: 14, weight: .semibold, color: AuthBaseViewController.textPrimary)
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

    private func setupStrengthBar() {
        strengthBar.axis = .horizontal
        strengthBar.distribution = .fillEqually
        strengthBar.spacing = 4
        strengthBar.translatesAutoresizingMaskIntoConstraints = false
        strengthBar.heightAnchor.constraint(equalToConstant: 4).isActive = true
        strengthBar.isHidden = true

        bars = (0..<4).map { _ in
            let v = UIView()
            v.backgroundColor = UIColor(red: 229/255, green: 231/255, blue: 235/255, alpha: 1)
            v.layer.cornerRadius = 2
            return v
        }
        bars.forEach { strengthBar.addArrangedSubview($0) }
    }

    @objc private func passwordChanged() {
        let pwd = passwordField.text ?? ""
        if pwd.isEmpty {
            strengthBar.isHidden = true
            strengthLabel.isHidden = true
            return
        }
        strengthBar.isHidden = false
        strengthLabel.isHidden = false

        var score = 0
        if pwd.count >= 8 { score += 1 }
        if pwd.contains(where: { $0.isUppercase }) { score += 1 }
        if pwd.contains(where: { $0.isNumber }) { score += 1 }
        if pwd.contains(where: { !$0.isLetter && !$0.isNumber }) { score += 1 }

        let (text, color) = getStrengthDetails(score: score)
        strengthLabel.text = "\(text) Password"
        strengthLabel.textColor = color

        for (index, bar) in bars.enumerated() {
            bar.backgroundColor = index < score ? color : UIColor(red: 229/255, green: 231/255, blue: 235/255, alpha: 1)
        }
    }

    private func getStrengthDetails(score: Int) -> (String, UIColor) {
        switch score {
        case 1: return ("Weak", AuthBaseViewController.errorRed)
        case 2: return ("Fair", UIColor.systemOrange)
        case 3: return ("Good", UIColor.systemBlue)
        case 4: return ("Strong", AuthBaseViewController.successGreen)
        default: return ("", AuthBaseViewController.textHint)
        }
    }

    private func makeFooterLink(text: String, linkText: String, action: Selector) -> UIView {
        let container = UIView()
        container.translatesAutoresizingMaskIntoConstraints = false
        let label = UILabel()
        let attributed = NSMutableAttributedString(string: text, attributes: [.foregroundColor: AuthBaseViewController.textSecondary, .font: UIFont.systemFont(ofSize: 14)])
        attributed.append(NSAttributedString(string: linkText, attributes: [.foregroundColor: AuthBaseViewController.indigoMid, .font: UIFont.systemFont(ofSize: 14, weight: .bold)]))
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

    @objc private func backTapped() {
        dismiss(animated: true)
    }

    @objc private func registerTapped() {
        hideError()
        guard validate() else { return }
        setLoading(true)

        let email = emailField.text!.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()

        AuthService.register(
            labName: labNameField.text!,
            name: nameField.text!,
            email: email,
            phone: phoneField.text!,
            password: passwordField.text!
        ) { [weak self] success, error in
            DispatchQueue.main.async {
                self?.setLoading(false)
                if success {
                    let otpVC = OtpVerifyViewController(email: email, mode: .register)
                    otpVC.modalPresentationStyle = .fullScreen
                    self?.present(otpVC, animated: true)
                } else {
                    self?.showError(error ?? "Registration failed")
                }
            }
        }
    }

    private func validate() -> Bool {
        var valid = true
        if (labNameField.text ?? "").isEmpty {
            labNameErrorLabel.text = "Lab name is required"
            labNameErrorLabel.isHidden = false
            valid = false
        } else { labNameErrorLabel.isHidden = true }

        if (nameField.text ?? "").isEmpty {
            nameErrorLabel.text = "Full name is required"
            nameErrorLabel.isHidden = false
            valid = false
        } else { nameErrorLabel.isHidden = true }

        let phone = (phoneField.text ?? "").components(separatedBy: CharacterSet.decimalDigits.inverted).joined()
        if phone.count < 10 {
            phoneErrorLabel.text = "Enter a valid 10-digit phone number"
            phoneErrorLabel.isHidden = false
            valid = false
        } else { phoneErrorLabel.isHidden = true }

        let email = (emailField.text ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        if email.isEmpty || !email.contains("@") {
            emailErrorLabel.text = "Enter a valid email address"
            emailErrorLabel.isHidden = false
            valid = false
        } else { emailErrorLabel.isHidden = true }

        let pwd = passwordField.text ?? ""
        if pwd.count < 8 {
            passwordErrorLabel.text = "Password must be at least 8 characters"
            passwordErrorLabel.isHidden = false
            valid = false
        } else { passwordErrorLabel.isHidden = true }

        if confirmField.text != pwd {
            confirmErrorLabel.text = "Passwords do not match"
            confirmErrorLabel.isHidden = false
            valid = false
        } else { confirmErrorLabel.isHidden = true }

        return valid
    }

    private func setLoading(_ loading: Bool) {
        if loading { spinner.startAnimating() } else { spinner.stopAnimating() }
        view.subviews.compactMap { $0 as? UIButton }.forEach { $0.isEnabled = !loading }
    }
}
