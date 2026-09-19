import UIKit

// MARK: - PaymentSettingsViewController
// Full parity with /workspace/settings/payments
// Payment method toggles (Cash, Card, UPI, NEFT, Insurance, Credit, Wallet)
// Gateway fields (Razorpay Key/Secret, UPI VPA/Name)
// Bank account details
// Credit policy (max days, limits), receipt settings

class PaymentSettingsViewController: UIViewController {

    private let baseURL = "https://app.patholab.cloud"

    private let navBar     = UIView()
    private let btnBack    = UIButton(type: .system)
    private let btnRefresh = UIButton(type: .system)
    private let titleLabel = UILabel()
    private let scrollView  = UIScrollView()
    private let contentStack = UIStackView()

    // Payment Methods
    private let switchCash      = UISwitch()
    private let switchCard      = UISwitch()
    private let switchUpi       = UISwitch()
    private let switchNeft      = UISwitch()
    private let switchInsurance = UISwitch()
    private let switchCredit    = UISwitch()
    private let switchWallet    = UISwitch()

    // Gateway
    private let inputRzpKey     = PatholabTextField(placeholder: "Razorpay Key ID")
    private let inputRzpSecret  = PatholabTextField(placeholder: "Razorpay Key Secret")
    private let inputUpiVpa     = PatholabTextField(placeholder: "UPI VPA (e.g. lab@paytm)")
    private let inputUpiName    = PatholabTextField(placeholder: "UPI Account Name")

    // Bank Account
    private let inputBankName   = PatholabTextField(placeholder: "Bank Name")
    private let inputAcctNo     = PatholabTextField(placeholder: "Account Number")
    private let inputIfsc       = PatholabTextField(placeholder: "IFSC Code")
    private let inputAcctName   = PatholabTextField(placeholder: "Account Holder Name")

    // Credit Policy
    private let inputMaxCreditDays      = PatholabTextField(placeholder: "Max Credit Days (e.g. 30)")
    private let inputPatientCreditLimit = PatholabTextField(placeholder: "Patient Credit Limit (₹)")
    private let inputAgencyCreditLimit  = PatholabTextField(placeholder: "Agency Credit Limit (₹)")
    private let switchRequireRef        = UISwitch()
    private let switchAutoReminder      = UISwitch()
    private let switchPartialPayment    = UISwitch()

    // Receipt
    private let inputReceiptPrefix = PatholabTextField(placeholder: "Receipt Prefix (e.g. RCP)")
    private let inputReceiptNote   = PatholabTextField(placeholder: "Receipt Footer Note")

    private let saveButton  = UIButton(type: .system)
    private let statusLabel = UILabel()
    private let spinner     = UIActivityIndicatorView(style: .medium)

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 0.96, green: 0.97, blue: 0.98, alpha: 1)
        setupNav(); setupContent(); fetchSettings()
    }

    private func setupNav() {
        let safeTop = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }.first?.windows.first?.safeAreaInsets.top ?? 44
        navBar.backgroundColor = .white; navBar.translatesAutoresizingMaskIntoConstraints = false; view.addSubview(navBar)
        navBar.layer.shadowColor = UIColor.black.cgColor; navBar.layer.shadowOpacity = 0.06; navBar.layer.shadowOffset = CGSize(width: 0, height: 1); navBar.layer.shadowRadius = 4
        btnBack.setImage(UIImage(systemName: "chevron.left"), for: .normal); btnBack.tintColor = UIColor(red: 0.05, green: 0.4, blue: 0.9, alpha: 1)
        btnBack.addTarget(self, action: #selector(backTapped), for: .touchUpInside); btnBack.translatesAutoresizingMaskIntoConstraints = false
        titleLabel.text = "Payment Settings"; titleLabel.font = .systemFont(ofSize: 17, weight: .semibold); titleLabel.textAlignment = .center; titleLabel.translatesAutoresizingMaskIntoConstraints = false
        btnRefresh.setImage(UIImage(systemName: "arrow.clockwise"), for: .normal); btnRefresh.tintColor = UIColor(red: 0.05, green: 0.4, blue: 0.9, alpha: 1)
        btnRefresh.addTarget(self, action: #selector(refreshTapped), for: .touchUpInside); btnRefresh.translatesAutoresizingMaskIntoConstraints = false
        [btnBack, titleLabel, btnRefresh].forEach { navBar.addSubview($0) }
        NSLayoutConstraint.activate([
            navBar.topAnchor.constraint(equalTo: view.topAnchor), navBar.leadingAnchor.constraint(equalTo: view.leadingAnchor), navBar.trailingAnchor.constraint(equalTo: view.trailingAnchor), navBar.heightAnchor.constraint(equalToConstant: safeTop + 56),
            btnBack.leadingAnchor.constraint(equalTo: navBar.leadingAnchor, constant: 16), btnBack.bottomAnchor.constraint(equalTo: navBar.bottomAnchor, constant: -12), btnBack.widthAnchor.constraint(equalToConstant: 36), btnBack.heightAnchor.constraint(equalToConstant: 36),
            titleLabel.centerXAnchor.constraint(equalTo: navBar.centerXAnchor), titleLabel.centerYAnchor.constraint(equalTo: btnBack.centerYAnchor),
            btnRefresh.trailingAnchor.constraint(equalTo: navBar.trailingAnchor, constant: -16), btnRefresh.centerYAnchor.constraint(equalTo: btnBack.centerYAnchor), btnRefresh.widthAnchor.constraint(equalToConstant: 36), btnRefresh.heightAnchor.constraint(equalToConstant: 36),
        ])
    }

    private func setupContent() {
        scrollView.translatesAutoresizingMaskIntoConstraints = false; view.addSubview(scrollView)
        NSLayoutConstraint.activate([scrollView.topAnchor.constraint(equalTo: navBar.bottomAnchor), scrollView.leadingAnchor.constraint(equalTo: view.leadingAnchor), scrollView.trailingAnchor.constraint(equalTo: view.trailingAnchor), scrollView.bottomAnchor.constraint(equalTo: view.bottomAnchor)])
        contentStack.axis = .vertical; contentStack.spacing = 10; contentStack.alignment = .fill
        contentStack.translatesAutoresizingMaskIntoConstraints = false; scrollView.addSubview(contentStack)
        NSLayoutConstraint.activate([contentStack.topAnchor.constraint(equalTo: scrollView.topAnchor, constant: 16), contentStack.leadingAnchor.constraint(equalTo: scrollView.leadingAnchor, constant: 16),
                                      contentStack.trailingAnchor.constraint(equalTo: scrollView.trailingAnchor, constant: -16), contentStack.bottomAnchor.constraint(equalTo: scrollView.bottomAnchor, constant: -32), contentStack.widthAnchor.constraint(equalTo: scrollView.widthAnchor, constant: -32)])

        func hdr(_ t: String) -> UILabel { let l = UILabel(); l.text = t.uppercased(); l.font = .systemFont(ofSize: 11, weight: .semibold); l.textColor = UIColor(white: 0.5, alpha: 1); return l }
        func toggleRow(label: String, subtitle: String, sw: UISwitch) -> UIView {
            let card = UIView(); card.backgroundColor = .white; card.layer.cornerRadius = 12
            let lbl = UILabel(); lbl.text = label; lbl.font = .systemFont(ofSize: 14, weight: .medium)
            let sub = UILabel(); sub.text = subtitle; sub.font = .systemFont(ofSize: 12); sub.textColor = .secondaryLabel
            sw.onTintColor = UIColor(red: 0.05, green: 0.4, blue: 0.9, alpha: 1)
            let ts = UIStackView(arrangedSubviews: [lbl, sub]); ts.axis = .vertical; ts.spacing = 2
            let row = UIStackView(arrangedSubviews: [ts, UIView(), sw]); row.alignment = .center; row.spacing = 8
            row.translatesAutoresizingMaskIntoConstraints = false; card.addSubview(row)
            NSLayoutConstraint.activate([row.topAnchor.constraint(equalTo: card.topAnchor, constant: 12), row.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 14), row.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -14), row.bottomAnchor.constraint(equalTo: card.bottomAnchor, constant: -12)])
            return card
        }

        saveButton.setTitle("Save Payment Settings", for: .normal); saveButton.backgroundColor = UIColor(red: 0.05, green: 0.4, blue: 0.9, alpha: 1)
        saveButton.setTitleColor(.white, for: .normal); saveButton.titleLabel?.font = .systemFont(ofSize: 15, weight: .semibold)
        saveButton.layer.cornerRadius = 14; saveButton.heightAnchor.constraint(equalToConstant: 50).isActive = true
        saveButton.addTarget(self, action: #selector(saveTapped), for: .touchUpInside)

        statusLabel.textAlignment = .center; statusLabel.font = .systemFont(ofSize: 13); statusLabel.numberOfLines = 2; statusLabel.isHidden = true
        spinner.color = UIColor(red: 0.05, green: 0.4, blue: 0.9, alpha: 1); spinner.hidesWhenStopped = true

        inputRzpSecret.isSecureTextEntry = true
        inputAcctNo.keyboardType = .numberPad; inputMaxCreditDays.keyboardType = .numberPad
        inputPatientCreditLimit.keyboardType = .decimalPad; inputAgencyCreditLimit.keyboardType = .decimalPad

        // Default on values
        switchCash.isOn = true; switchCard.isOn = true; switchUpi.isOn = true; switchPartialPayment.isOn = true

        let views: [UIView] = [
            hdr("Accepted Payment Methods"),
            toggleRow(label: "Cash",         subtitle: "Accept cash payments",                    sw: switchCash),
            toggleRow(label: "Credit / Debit Card", subtitle: "Accept card payments via POS",    sw: switchCard),
            toggleRow(label: "UPI",          subtitle: "Accept UPI payments (PhonePe, GPay...)", sw: switchUpi),
            toggleRow(label: "NEFT / RTGS",  subtitle: "Accept bank transfers",                  sw: switchNeft),
            toggleRow(label: "Insurance",    subtitle: "Accept insurance / TPA payments",        sw: switchInsurance),
            toggleRow(label: "Credit",       subtitle: "Allow patients / agencies to pay later", sw: switchCredit),
            toggleRow(label: "Wallet",       subtitle: "Accept PathoLab wallet balance",         sw: switchWallet),

            hdr("Online Payment Gateway (Razorpay)"),
            inputRzpKey, inputRzpSecret,

            hdr("UPI Details"),
            inputUpiVpa, inputUpiName,

            hdr("Bank Account (for NEFT / RTGS)"),
            inputBankName, inputAcctNo, inputIfsc, inputAcctName,

            hdr("Credit Policy"),
            inputMaxCreditDays, inputPatientCreditLimit, inputAgencyCreditLimit,
            toggleRow(label: "Require Reference No.", subtitle: "Mandatory reference for offline payments", sw: switchRequireRef),
            toggleRow(label: "Auto Reminders",       subtitle: "Send automated due payment reminders",     sw: switchAutoReminder),
            toggleRow(label: "Allow Partial Payment",subtitle: "Let patients pay in partial amounts",       sw: switchPartialPayment),

            hdr("Receipt Settings"),
            inputReceiptPrefix, inputReceiptNote,

            hdr(""),
            saveButton, statusLabel, spinner,
        ]
        views.forEach { contentStack.addArrangedSubview($0) }
    }

    private func fetchSettings() {
        spinner.startAnimating()
        guard let url = URL(string: "\(baseURL)/api/workspace/settings/payments") else { return }
        var req = URLRequest(url: url); req.httpMethod = "GET"
        req.setValue("Bearer \(KeychainManager.shared.getToken() ?? "")", forHTTPHeaderField: "Authorization")
        req.setValue("application/json", forHTTPHeaderField: "Accept"); req.timeoutInterval = 15
        URLSession.shared.dataTask(with: req) { [weak self] data, _, _ in
            DispatchQueue.main.async {
                self?.spinner.stopAnimating()
                guard let self, let data, let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { return }
                let c = json["payments"] as? [String: Any] ?? json["settings"] as? [String: Any] ?? json
                let methods = c["methods"] as? [String: Any]
                self.switchCash.isOn      = methods?["cash"] as? Bool ?? c["acceptCash"] as? Bool ?? true
                self.switchCard.isOn      = methods?["card"] as? Bool ?? c["acceptCard"] as? Bool ?? true
                self.switchUpi.isOn       = methods?["upi"]  as? Bool ?? c["acceptUpi"]  as? Bool ?? true
                self.switchNeft.isOn      = methods?["neft"] as? Bool ?? c["acceptNeft"] as? Bool ?? false
                self.switchInsurance.isOn = methods?["insurance"] as? Bool ?? c["acceptInsurance"] as? Bool ?? false
                self.switchCredit.isOn    = methods?["credit"] as? Bool ?? c["acceptCredit"] as? Bool ?? false
                self.switchWallet.isOn    = methods?["wallet"] as? Bool ?? c["acceptWallet"] as? Bool ?? false
                let gw = c["gateway"] as? [String: Any]
                self.inputRzpKey.text    = gw?["razorpayKeyId"]     as? String ?? c["razorpayKeyId"]     as? String ?? ""
                self.inputRzpSecret.text = gw?["razorpayKeySecret"] as? String ?? c["razorpayKeySecret"] as? String ?? ""
                self.inputUpiVpa.text    = gw?["upiVpa"]  as? String ?? c["upiVpa"]  as? String ?? ""
                self.inputUpiName.text   = gw?["upiName"] as? String ?? c["upiName"] as? String ?? ""
                let bank = c["bankAccount"] as? [String: Any]
                self.inputBankName.text = bank?["bankName"] as? String ?? c["bankName"] as? String ?? ""
                self.inputAcctNo.text   = bank?["accountNumber"] as? String ?? c["accountNumber"] as? String ?? ""
                self.inputIfsc.text     = bank?["ifsc"] as? String ?? c["ifsc"] as? String ?? ""
                self.inputAcctName.text = bank?["accountName"] as? String ?? c["accountName"] as? String ?? ""
                self.inputMaxCreditDays.text      = "\(c["maxCreditDays"] as? Int ?? 30)"
                self.inputPatientCreditLimit.text = "\(c["patientCreditLimit"] as? Double ?? 5000)"
                self.inputAgencyCreditLimit.text  = "\(c["agencyCreditLimit"] as? Double ?? 50000)"
                self.switchRequireRef.isOn      = c["requireReference"] as? Bool ?? false
                self.switchAutoReminder.isOn    = c["autoReminder"] as? Bool ?? false
                self.switchPartialPayment.isOn  = c["allowPartialPayment"] as? Bool ?? true
                self.inputReceiptPrefix.text    = c["receiptPrefix"] as? String ?? "RCP"
                self.inputReceiptNote.text      = c["receiptNote"] as? String ?? ""
            }
        }.resume()
    }

    @objc private func saveTapped() {
        saveButton.isEnabled = false; saveButton.setTitle("Saving...", for: .normal)
        guard let url = URL(string: "\(baseURL)/api/workspace/settings/payments") else { return }
        var req = URLRequest(url: url); req.httpMethod = "PUT"
        req.setValue("Bearer \(KeychainManager.shared.getToken() ?? "")", forHTTPHeaderField: "Authorization")
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        let methods: [String: Any] = ["cash": switchCash.isOn, "card": switchCard.isOn, "upi": switchUpi.isOn, "neft": switchNeft.isOn, "insurance": switchInsurance.isOn, "credit": switchCredit.isOn, "wallet": switchWallet.isOn]
        let gateway: [String: Any] = ["razorpayKeyId": inputRzpKey.text?.trimmingCharacters(in: .whitespaces) ?? "", "razorpayKeySecret": inputRzpSecret.text ?? "", "upiVpa": inputUpiVpa.text?.trimmingCharacters(in: .whitespaces) ?? "", "upiName": inputUpiName.text?.trimmingCharacters(in: .whitespaces) ?? ""]
        let bank: [String: Any] = ["bankName": inputBankName.text?.trimmingCharacters(in: .whitespaces) ?? "", "accountNumber": inputAcctNo.text?.trimmingCharacters(in: .whitespaces) ?? "", "ifsc": inputIfsc.text?.trimmingCharacters(in: .whitespaces) ?? "", "accountName": inputAcctName.text?.trimmingCharacters(in: .whitespaces) ?? ""]
        var payload: [String: Any] = ["methods": methods, "gateway": gateway, "bankAccount": bank,
                                       "requireReference": switchRequireRef.isOn, "autoReminder": switchAutoReminder.isOn, "allowPartialPayment": switchPartialPayment.isOn,
                                       "receiptPrefix": inputReceiptPrefix.text?.trimmingCharacters(in: .whitespaces) ?? "RCP",
                                       "receiptNote": inputReceiptNote.text?.trimmingCharacters(in: .whitespaces) ?? ""]
        if let d = Int(inputMaxCreditDays.text ?? "") { payload["maxCreditDays"] = d } else { payload["maxCreditDays"] = 30 }
        if let d = Double(inputPatientCreditLimit.text ?? "") { payload["patientCreditLimit"] = d } else { payload["patientCreditLimit"] = 5000 }
        if let d = Double(inputAgencyCreditLimit.text ?? "") { payload["agencyCreditLimit"] = d } else { payload["agencyCreditLimit"] = 50000 }
        req.httpBody = try? JSONSerialization.data(withJSONObject: payload)
        URLSession.shared.dataTask(with: req) { [weak self] _, resp, _ in
            let code = (resp as? HTTPURLResponse)?.statusCode ?? 0
            DispatchQueue.main.async {
                self?.saveButton.isEnabled = true; self?.saveButton.setTitle("Save Payment Settings", for: .normal)
                self?.showStatus(code >= 200 && code < 300 ? "Payment settings saved successfully." : "Save failed (\(code)).", success: code >= 200 && code < 300)
            }
        }.resume()
    }

    private func showStatus(_ msg: String, success: Bool) {
        statusLabel.text = msg; statusLabel.textColor = success ? UIColor(red: 0.02, green: 0.59, blue: 0.41, alpha: 1) : UIColor(red: 0.85, green: 0.1, blue: 0.1, alpha: 1); statusLabel.isHidden = false
    }
    @objc private func backTapped() { dismiss(animated: true) }
    @objc private func refreshTapped() {
        UIView.animate(withDuration: 0.4) { self.btnRefresh.transform = CGAffineTransform(rotationAngle: .pi) }
        UIView.animate(withDuration: 0.4, delay: 0.4) { self.btnRefresh.transform = .identity }
        fetchSettings()
    }
}

// MARK: - PatholabTextField
final class PatholabTextField: UITextField {
    private let insets = UIEdgeInsets(top: 10, left: 14, bottom: 10, right: 14)

    init(placeholder: String) {
        super.init(frame: .zero)
        self.placeholder = placeholder
        self.backgroundColor = .white
        self.layer.cornerRadius = 10
        self.layer.borderWidth = 1
        self.layer.borderColor = UIColor(red: 0.88, green: 0.90, blue: 0.93, alpha: 1.0).cgColor
        self.font = .systemFont(ofSize: 14)
        self.textColor = UIColor(red: 0.06, green: 0.09, blue: 0.16, alpha: 1.0)
        self.autocapitalizationType = .none
        self.autocorrectionType = .no
        self.translatesAutoresizingMaskIntoConstraints = false
        self.heightAnchor.constraint(equalToConstant: 44).isActive = true
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override func textRect(forBounds bounds: CGRect) -> CGRect {
        bounds.inset(by: insets)
    }

    override func editingRect(forBounds bounds: CGRect) -> CGRect {
        bounds.inset(by: insets)
    }

    override func placeholderRect(forBounds bounds: CGRect) -> CGRect {
        bounds.inset(by: insets)
    }
}

