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

    private var isTermsAccepted = false
    private let termsCheckboxBtn = UIButton(type: .custom)
    private let termsErrorLabel  = UILabel()

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
        // ── Header with balanced top/bottom spacing ──────────────────────────
        let backBtn = makeBackButton()
        backBtn.addTarget(self, action: #selector(backTapped), for: .touchUpInside)
        backBtn.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(backBtn)

        let headerStack = UIStackView()
        headerStack.axis = .vertical
        headerStack.spacing = 3
        headerStack.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(headerStack)

        let titleLabel = makeLabel("Create Account", size: 32, weight: .black, color: .white)
        titleLabel.adjustsFontSizeToFitWidth = true
        titleLabel.minimumScaleFactor = 0.8
        let subtitleLabel = makeLabel("Start your lab's digital journey today.", size: 13.5, weight: .regular, color: UIColor(red: 199/255, green: 210/255, blue: 254/255, alpha: 1))
        headerStack.addArrangedSubview(titleLabel)
        headerStack.addArrangedSubview(subtitleLabel)

        let spacer = UIView()
        spacer.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(spacer)

        NSLayoutConstraint.activate([
            backBtn.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 14),
            backBtn.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 20),
            backBtn.widthAnchor.constraint(equalToConstant: 40),
            backBtn.heightAnchor.constraint(equalToConstant: 40),

            headerStack.leadingAnchor.constraint(equalTo: backBtn.trailingAnchor, constant: 14),
            headerStack.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -20),
            headerStack.centerYAnchor.constraint(equalTo: backBtn.centerYAnchor),

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
            content.topAnchor.constraint(equalTo: cardContentView.topAnchor, constant: 22),
            content.leadingAnchor.constraint(equalTo: cardContentView.leadingAnchor, constant: 20),
            content.trailingAnchor.constraint(equalTo: cardContentView.trailingAnchor, constant: -20),
            content.bottomAnchor.constraint(equalTo: cardContentView.bottomAnchor, constant: -36)
        ])

        let (banner, label) = makeErrorBanner()
        self.errorBanner = banner
        self.errorLabel = label
        content.addArrangedSubview(banner)
        content.setCustomSpacing(16, after: banner)

        // ── ROW 1: Lab / Organization Name & Full Name in one row ────────────
        let labCol = makeFormField(title: "Lab / Org Name *", field: labNameField, placeholder: "Apex Diagnostics", errorLabel: labNameErrorLabel)
        let nameCol = makeFormField(title: "Full Name *", field: nameField, placeholder: "Dr. John Doe", errorLabel: nameErrorLabel)
        let row1 = makeTwoColumnRow(left: labCol, right: nameCol)
        content.addArrangedSubview(row1)
        content.setCustomSpacing(14, after: row1)

        // ── ROW 2: Phone Number & Email Address in one row ───────────────────
        let phoneCol = makeFormField(title: "Phone Number *", field: phoneField, placeholder: "98765 43210", keyboardType: .phonePad, errorLabel: phoneErrorLabel)
        let emailCol = makeFormField(title: "Email Address *", field: emailField, placeholder: "admin@lab.com", keyboardType: .emailAddress, errorLabel: emailErrorLabel)
        let row2 = makeTwoColumnRow(left: phoneCol, right: emailCol)
        content.addArrangedSubview(row2)
        content.setCustomSpacing(14, after: row2)

        // ── ROW 3: Password & Confirm Password in one row ────────────────────
        let pwdCol = makePasswordField(title: "Password *", field: passwordField, placeholder: "Min. 8 chars", identifier: "reg_password", errorLabel: passwordErrorLabel, isConfirm: false)
        let confirmCol = makePasswordField(title: "Confirm Password *", field: confirmField, placeholder: "Re-enter", identifier: "reg_confirm", errorLabel: confirmErrorLabel, isConfirm: true)
        let row3 = makeTwoColumnRow(left: pwdCol, right: confirmCol)
        content.addArrangedSubview(row3)

        // Password Strength Bar
        setupStrengthBar()
        content.setCustomSpacing(8, after: row3)
        content.addArrangedSubview(strengthBar)
        content.setCustomSpacing(4, after: strengthBar)
        strengthLabel.font = .systemFont(ofSize: 11, weight: .bold)
        strengthLabel.isHidden = true
        content.addArrangedSubview(strengthLabel)

        // ── Mandatory Interactive Terms & Privacy Checkbox Card ──────────────
        let termsBox = makeInteractiveTermsBox()
        content.setCustomSpacing(16, after: strengthLabel.isHidden ? strengthBar : strengthLabel)
        content.addArrangedSubview(termsBox)

        // Register Button
        let btn = makePrimaryButton(title: "Create Account")
        btn.addTarget(self, action: #selector(registerTapped), for: .touchUpInside)
        content.setCustomSpacing(16, after: termsBox)
        content.addArrangedSubview(btn)

        spinner.translatesAutoresizingMaskIntoConstraints = false
        spinner.color = AuthBaseViewController.indigoMid
        spinner.hidesWhenStopped = true
        content.addArrangedSubview(spinner)
        content.setCustomSpacing(20, after: btn)

        // Footer Login Link
        let loginRow = makeFooterLink(text: "Already have an account? ", linkText: "Log in", action: #selector(backTapped))
        content.addArrangedSubview(loginRow)
        content.setCustomSpacing(20, after: loginRow)

        // Legal links
        let legalFooter = makeLegalFooter()
        content.addArrangedSubview(legalFooter)
        content.setCustomSpacing(6, after: legalFooter)

        let copyright = makeLabel("© 2026 Globizhub India Pvt. Ltd. · All rights reserved", size: 11, weight: .regular, color: AuthBaseViewController.textHint)
        copyright.textAlignment = .center
        content.addArrangedSubview(copyright)
    }

    private func makeTwoColumnRow(left: UIView, right: UIView) -> UIStackView {
        let row = UIStackView(arrangedSubviews: [left, right])
        row.axis = .horizontal
        row.distribution = .fillEqually
        row.spacing = 12
        row.alignment = .top
        return row
    }

    private func makeFormField(title: String, field: UITextField, placeholder: String, keyboardType: UIKeyboardType = .default, errorLabel: UILabel) -> UIView {
        let col = UIStackView()
        col.axis = .vertical
        col.spacing = 6
        col.alignment = .fill

        let lbl = makeLabel(title, size: 13, weight: .bold, color: AuthBaseViewController.textPrimary)
        col.addArrangedSubview(lbl)

        let tf = makeTextField(placeholder: placeholder, keyboardType: keyboardType)
        field.copyProperties(from: tf)
        col.addArrangedSubview(tf)

        errorLabel.font = .systemFont(ofSize: 11.5, weight: .medium)
        errorLabel.textColor = AuthBaseViewController.errorRed
        errorLabel.isHidden = true
        errorLabel.numberOfLines = 0
        col.addArrangedSubview(errorLabel)

        return col
    }

    private func makePasswordField(title: String, field: UITextField, placeholder: String, identifier: String, errorLabel: UILabel, isConfirm: Bool) -> UIView {
        let col = UIStackView()
        col.axis = .vertical
        col.spacing = 6
        col.alignment = .fill

        let lbl = makeLabel(title, size: 13, weight: .bold, color: AuthBaseViewController.textPrimary)
        col.addArrangedSubview(lbl)

        field.copyProperties(from: makeTextField(placeholder: placeholder, isSecure: true))
        if !isConfirm {
            field.addTarget(self, action: #selector(passwordChanged), for: .editingChanged)
        }
        let pwdContainer = createSecureContainer(tf: field, identifier: identifier)
        col.addArrangedSubview(pwdContainer)

        errorLabel.font = .systemFont(ofSize: 11.5, weight: .medium)
        errorLabel.textColor = AuthBaseViewController.errorRed
        errorLabel.isHidden = true
        errorLabel.numberOfLines = 0
        col.addArrangedSubview(errorLabel)

        return col
    }

    private func makeInteractiveTermsBox() -> UIView {
        let container = UIView()
        container.backgroundColor = UIColor(red: 248/255, green: 250/255, blue: 252/255, alpha: 1)
        container.layer.cornerRadius = 12
        container.layer.borderWidth = 1
        container.layer.borderColor = UIColor(red: 226/255, green: 232/255, blue: 240/255, alpha: 1).cgColor
        container.translatesAutoresizingMaskIntoConstraints = false

        let rowStack = UIStackView()
        rowStack.axis = .horizontal
        rowStack.alignment = .top
        rowStack.spacing = 10
        rowStack.translatesAutoresizingMaskIntoConstraints = false

        // Checkbox Button
        updateCheckboxState()
        termsCheckboxBtn.translatesAutoresizingMaskIntoConstraints = false
        termsCheckboxBtn.addTarget(self, action: #selector(toggleTermsCheckbox), for: .touchUpInside)
        NSLayoutConstraint.activate([
            termsCheckboxBtn.widthAnchor.constraint(equalToConstant: 24),
            termsCheckboxBtn.heightAnchor.constraint(equalToConstant: 24)
        ])
        rowStack.addArrangedSubview(termsCheckboxBtn)

        let label = UILabel()
        label.numberOfLines = 0
        label.font = .systemFont(ofSize: 12, weight: .regular)
        label.textColor = AuthBaseViewController.textSecondary
        label.translatesAutoresizingMaskIntoConstraints = false

        let fullText = "I agree to the Terms & Conditions, Privacy Policy, and Refund Policy."
        let attr = NSMutableAttributedString(string: fullText, attributes: [
            .foregroundColor: AuthBaseViewController.textSecondary,
            .font: UIFont.systemFont(ofSize: 12, weight: .regular)
        ])

        if let range = fullText.range(of: "Terms & Conditions") {
            attr.addAttribute(.foregroundColor, value: AuthBaseViewController.indigoMid, range: NSRange(range, in: fullText))
            attr.addAttribute(.font, value: UIFont.systemFont(ofSize: 12, weight: .bold), range: NSRange(range, in: fullText))
        }
        if let range = fullText.range(of: "Privacy Policy") {
            attr.addAttribute(.foregroundColor, value: AuthBaseViewController.indigoMid, range: NSRange(range, in: fullText))
            attr.addAttribute(.font, value: UIFont.systemFont(ofSize: 12, weight: .bold), range: NSRange(range, in: fullText))
        }
        if let range = fullText.range(of: "Refund Policy") {
            attr.addAttribute(.foregroundColor, value: AuthBaseViewController.indigoMid, range: NSRange(range, in: fullText))
            attr.addAttribute(.font, value: UIFont.systemFont(ofSize: 12, weight: .bold), range: NSRange(range, in: fullText))
        }
        label.attributedText = attr
        label.isUserInteractionEnabled = true
        label.addGestureRecognizer(UITapGestureRecognizer(target: self, action: #selector(termsLabelTapped)))
        rowStack.addArrangedSubview(label)

        // Terms Error Label
        termsErrorLabel.text = "Please accept the Terms & Conditions and Privacy Policy to continue"
        termsErrorLabel.font = .systemFont(ofSize: 11.5, weight: .medium)
        termsErrorLabel.textColor = AuthBaseViewController.errorRed
        termsErrorLabel.isHidden = true
        termsErrorLabel.numberOfLines = 0
        termsErrorLabel.translatesAutoresizingMaskIntoConstraints = false

        let boxStack = UIStackView(arrangedSubviews: [rowStack, termsErrorLabel])
        boxStack.axis = .vertical
        boxStack.spacing = 6
        boxStack.translatesAutoresizingMaskIntoConstraints = false

        container.addSubview(boxStack)
        NSLayoutConstraint.activate([
            boxStack.topAnchor.constraint(equalTo: container.topAnchor, constant: 12),
            boxStack.bottomAnchor.constraint(equalTo: container.bottomAnchor, constant: -12),
            boxStack.leadingAnchor.constraint(equalTo: container.leadingAnchor, constant: 12),
            boxStack.trailingAnchor.constraint(equalTo: container.trailingAnchor, constant: -12)
        ])

        return container
    }

    @objc private func toggleTermsCheckbox() {
        isTermsAccepted.toggle()
        updateCheckboxState()
        if isTermsAccepted {
            termsErrorLabel.isHidden = true
        }
    }

    @objc private func termsLabelTapped() {
        // Tapping label toggles checkbox
        toggleTermsCheckbox()
    }

    private func updateCheckboxState() {
        let symbolName = isTermsAccepted ? "checkmark.square.fill" : "square"
        let img = UIImage(systemName: symbolName)?.withRenderingMode(.alwaysTemplate)
        termsCheckboxBtn.setImage(img, for: .normal)
        termsCheckboxBtn.tintColor = isTermsAccepted ? AuthBaseViewController.indigoMid : UIColor(red: 148/255, green: 163/255, blue: 184/255, alpha: 1)
    }

    private func createSecureContainer(tf: UITextField, identifier: String) -> UIView {
        let (container, _) = makeAnimatedPasswordRow(tf: tf, identifier: identifier)
        return container
    }

    private func setupStrengthBar() {
        strengthBar.axis = .horizontal
        strengthBar.distribution = .fillEqually
        strengthBar.spacing = 4
        strengthBar.translatesAutoresizingMaskIntoConstraints = false
        strengthBar.heightAnchor.constraint(equalToConstant: 3.5).isActive = true
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

        if !isTermsAccepted {
            termsErrorLabel.isHidden = false
            valid = false
        } else {
            termsErrorLabel.isHidden = true
        }

        return valid
    }

    private func setLoading(_ loading: Bool) {
        if loading { spinner.startAnimating() } else { spinner.stopAnimating() }
        view.subviews.compactMap { $0 as? UIButton }.forEach { $0.isEnabled = !loading }
    }
}
