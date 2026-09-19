import UIKit

enum OtpMode {
    case register
    case reset
}

class OtpVerifyViewController: AuthBaseViewController {

    private let email: String
    private let mode: OtpMode

    private var otpFields: [UITextField] = []
    private let emailLabel = UILabel()
    private let verifyButton = UIButton()
    private let spinner = UIActivityIndicatorView(style: .medium)
    private let resendButton = UIButton(type: .system)

    init(email: String, mode: OtpMode) {
        self.email = email
        self.mode = mode
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
        headerStack.spacing = 2
        headerStack.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(headerStack)

        let titleLabel = makeLabel("Verify Email", size: 32, weight: .black, color: .white)
        titleLabel.adjustsFontSizeToFitWidth = true
        titleLabel.minimumScaleFactor = 0.8
        let subtitleLabel = makeLabel("Enter the 6-digit code sent to your email.", size: 13.5, weight: .regular, color: UIColor(red: 199/255, green: 210/255, blue: 254/255, alpha: 1))
        headerStack.addArrangedSubview(titleLabel)
        headerStack.addArrangedSubview(subtitleLabel)

        let spacer = UIView()
        spacer.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(spacer)

        NSLayoutConstraint.activate([
            backBtn.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 10),
            backBtn.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 20),
            backBtn.widthAnchor.constraint(equalToConstant: 40),
            backBtn.heightAnchor.constraint(equalToConstant: 40),

            headerStack.leadingAnchor.constraint(equalTo: backBtn.trailingAnchor, constant: 14),
            headerStack.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -20),
            headerStack.centerYAnchor.constraint(equalTo: backBtn.centerYAnchor),

            spacer.topAnchor.constraint(equalTo: backBtn.bottomAnchor, constant: 12),
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

        emailLabel.text = "Code sent to: \(email)"
        emailLabel.font = .systemFont(ofSize: 14, weight: .medium)
        emailLabel.textColor = AuthBaseViewController.textSecondary
        emailLabel.textAlignment = .center
        content.addArrangedSubview(emailLabel)
        content.setCustomSpacing(24, after: emailLabel)

        // OTP inputs stack
        let otpStack = UIStackView()
        otpStack.axis = .horizontal
        otpStack.distribution = .fillEqually
        otpStack.spacing = 8
        otpStack.translatesAutoresizingMaskIntoConstraints = false

        for i in 0..<6 {
            let tf = UITextField()
            tf.font = .systemFont(ofSize: 20, weight: .bold)
            tf.textColor = AuthBaseViewController.textPrimary
            tf.textAlignment = .center
            tf.keyboardType = .numberPad
            if #available(iOS 12.0, *) {
                tf.textContentType = .oneTimeCode
            }
            tf.layer.cornerRadius = 10
            tf.layer.borderWidth = 1.5
            tf.layer.borderColor = AuthBaseViewController.indigoMid.cgColor
            tf.backgroundColor = .clear
            tf.tag = i
            tf.delegate = self
            tf.translatesAutoresizingMaskIntoConstraints = false
            tf.heightAnchor.constraint(equalToConstant: 56).isActive = true
            otpFields.append(tf)
            otpStack.addArrangedSubview(tf)
        }

        content.addArrangedSubview(otpStack)
        content.setCustomSpacing(28, after: otpStack)

        let btn = makePrimaryButton(title: "Verify")
        btn.addTarget(self, action: #selector(verifyTapped), for: .touchUpInside)
        content.addArrangedSubview(btn)

        spinner.translatesAutoresizingMaskIntoConstraints = false
        spinner.color = AuthBaseViewController.indigoMid
        spinner.hidesWhenStopped = true
        content.addArrangedSubview(spinner)
        content.setCustomSpacing(20, after: btn)

        let resendRow = UIStackView()
        resendRow.axis = .horizontal
        resendRow.alignment = .center
        resendRow.distribution = .fill
        resendRow.spacing = 4

        let textLabel = UILabel()
        textLabel.text = "Didn't receive it?"
        textLabel.font = .systemFont(ofSize: 14)
        textLabel.textColor = AuthBaseViewController.textSecondary

        resendButton.setTitle("Resend Code", for: .normal)
        resendButton.titleLabel?.font = .systemFont(ofSize: 14, weight: .bold)
        resendButton.setTitleColor(AuthBaseViewController.indigoMid, for: .normal)
        resendButton.addTarget(self, action: #selector(resendTapped), for: .touchUpInside)

        resendRow.addArrangedSubview(textLabel)
        resendRow.addArrangedSubview(resendButton)
        content.addArrangedSubview(resendRow)
        content.setCustomSpacing(20, after: resendRow)

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

    @objc private func resendTapped() {
        resendButton.isEnabled = false
        resendButton.setTitle("Sending...", for: .normal)

        AuthService.resendOtp(email: email) { [weak self] success, error in
            DispatchQueue.main.async {
                self?.resendButton.isEnabled = true
                self?.resendButton.setTitle("Resend Code", for: .normal)
                if success {
                    self?.showSuccess("A new code was sent")
                } else {
                    self?.showError(error ?? "Failed to resend code")
                }
            }
        }
    }

    @objc private func verifyTapped() {
        let code = otpFields.compactMap { $0.text }.joined()
        guard code.count == 6 else {
            showError("Please enter the complete 6-digit code.")
            return
        }

        hideError()
        setLoading(true)

        if mode == .reset {
            setLoading(false)
            let resetVC = ResetPasswordViewController(email: email, code: code)
            resetVC.modalPresentationStyle = .fullScreen
            present(resetVC, animated: true)
        } else {
            AuthService.verifyEmail(email: email, code: code) { [weak self] success, error in
                DispatchQueue.main.async {
                    self?.setLoading(false)
                    if success {
                        self?.showSuccess("Account verified successfully! Please sign in.")
                        DispatchQueue.main.asyncAfter(deadline: .now() + 1.2) {
                            if let app = UIApplication.shared.delegate as? AppDelegate {
                                app.presentNativeLogin(prefilledEmail: self?.email, successMessage: "Account verified successfully! Please sign in.")
                            } else {
                                self?.view.window?.rootViewController?.dismiss(animated: true)
                            }
                        }
                    } else {
                        self?.showError(error ?? "Verification failed. Please check your code.")
                    }
                }
            }
        }
    }

    private func setLoading(_ loading: Bool) {
        if loading { spinner.startAnimating() } else { spinner.stopAnimating() }
        view.subviews.compactMap { $0 as? UIButton }.forEach { $0.isEnabled = !loading }
    }
}

extension OtpVerifyViewController: UITextFieldDelegate {
    func textField(_ textField: UITextField, shouldChangeCharactersIn range: NSRange, replacementString string: String) -> Bool {
        // Multi-digit paste or iOS One-Time Code autofill
        let digits = string.filter { $0.isNumber }
        if digits.count > 1 {
            let digitChars = Array(digits)
            for (idx, ch) in digitChars.prefix(6).enumerated() {
                otpFields[idx].text = String(ch)
            }
            if digitChars.count >= 6 {
                view.endEditing(true)
                verifyTapped()
            } else {
                otpFields[min(digitChars.count, 5)].becomeFirstResponder()
            }
            return false
        }

        // Single digit typing or deletion
        if let text = textField.text, let range = Range(range, in: text) {
            let newText = text.replacingCharacters(in: range, with: string)
            let filtered = newText.filter { $0.isNumber }
            if !filtered.isEmpty {
                textField.text = String(filtered.last!)
                let nextTag = textField.tag + 1
                if nextTag < 6 {
                    otpFields[nextTag].becomeFirstResponder()
                } else {
                    textField.resignFirstResponder()
                }
                return false
            } else if string.isEmpty {
                textField.text = ""
                let prevTag = textField.tag - 1
                if prevTag >= 0 {
                    otpFields[prevTag].becomeFirstResponder()
                }
                return false
            }
        }
        return false
    }
}
