import UIKit

/**
 * ProfileSettingsViewController
 * ─────────────────────────────
 * Native iOS Configuration Console for User Profile & Lab Workspace Settings.
 * Connects directly to REST APIs /api/users/profile and /api/workspace/settings.
 */
class ProfileSettingsViewController: UIViewController {

    private static let BASE_URL = "https://app.patholab.cloud"
    private static let bgGray = UIColor(red: 0.973, green: 0.980, blue: 0.988, alpha: 1)
    private static let headerBlue = UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1)

    // MARK: – UI Components
    private let scrollView = UIScrollView()
    private let contentStack = UIStackView()

    // Hero
    private let heroAvatarLabel = UILabel()
    private let heroNameLabel   = UILabel()
    private let heroEmailLabel  = UILabel()
    private let heroRoleLabel   = UILabel()
    private let heroLabLabel    = UILabel()

    // Form inputs
    private let nameField       = UITextField()
    private let emailField      = UITextField()
    private let phoneField      = UITextField()

    private let labNameField    = UITextField()
    private let labEmailField   = UITextField()
    private let labPhoneField   = UITextField()
    private let labAddressField = UITextField()
    private let labCityField    = UITextField()
    private let labPincodeField = UITextField()

    private let licenseField    = UITextField()
    private let gstField        = UITextField()
    private let bankNameField   = UITextField()
    private let accountNoField  = UITextField()
    private let ifscField       = UITextField()

    private let invSwitch       = UISwitch()
    private let radSwitch       = UISwitch()
    private let iotSwitch       = UISwitch()
    private let b2bSwitch       = UISwitch()
    private let logSwitch       = UISwitch()

    private let docCommField    = UITextField()
    private let agencyCommField = UITextField()

    private let waKeyField      = UITextField()
    private let waPhoneIdField  = UITextField()

    private let saveButton      = UIButton(type: .system)
    private let activitySpinner = UIActivityIndicatorView(style: .medium)

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = Self.bgGray
        setupNavigationBar()
        setupLayout()
        loadData()
    }

    private func setupNavigationBar() {
        title = "Configuration Console"
        navigationItem.leftBarButtonItem = UIBarButtonItem(
            image: UIImage(systemName: "chevron.left"),
            style: .plain,
            target: self,
            action: #selector(backTapped)
        )
        navigationController?.navigationBar.tintColor = Self.headerBlue
    }

    @objc private func backTapped() {
        if let nav = navigationController, nav.viewControllers.count > 1 {
            nav.popViewController(animated: true)
        } else {
            dismiss(animated: true, completion: nil)
        }
    }

    // MARK: – Layout Setup
    private func setupLayout() {
        scrollView.translatesAutoresizingMaskIntoConstraints = false
        scrollView.keyboardDismissMode = .onDrag
        view.addSubview(scrollView)

        contentStack.axis = .vertical
        contentStack.spacing = 18
        contentStack.translatesAutoresizingMaskIntoConstraints = false
        scrollView.addSubview(contentStack)

        NSLayoutConstraint.activate([
            scrollView.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            scrollView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            scrollView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            scrollView.bottomAnchor.constraint(equalTo: view.bottomAnchor),

            contentStack.topAnchor.constraint(equalTo: scrollView.topAnchor, constant: 16),
            contentStack.leadingAnchor.constraint(equalTo: scrollView.leadingAnchor, constant: 16),
            contentStack.trailingAnchor.constraint(equalTo: scrollView.trailingAnchor, constant: -16),
            contentStack.bottomAnchor.constraint(equalTo: scrollView.bottomAnchor, constant: -30),
            contentStack.widthAnchor.constraint(equalTo: scrollView.widthAnchor, constant: -32)
        ])

        buildHeroCard()
        buildProfileCard()
        buildLabCard()
        buildLegalCard()
        buildModulesCard()
        buildCommissionsCard()
        buildIntegrationsCard()
        buildSaveButton()
    }

    private func buildHeroCard() {
        let card = createCard()
        card.backgroundColor = Self.headerBlue

        heroAvatarLabel.font = .systemFont(ofSize: 22, weight: .black)
        heroAvatarLabel.textColor = Self.headerBlue
        heroAvatarLabel.textAlignment = .center
        heroAvatarLabel.backgroundColor = .white
        heroAvatarLabel.layer.cornerRadius = 26
        heroAvatarLabel.clipsToBounds = true
        heroAvatarLabel.text = "U"
        heroAvatarLabel.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            heroAvatarLabel.widthAnchor.constraint(equalToConstant: 52),
            heroAvatarLabel.heightAnchor.constraint(equalToConstant: 52)
        ])

        heroNameLabel.font = .systemFont(ofSize: 18, weight: .bold)
        heroNameLabel.textColor = .white
        heroNameLabel.text = "Loading..."

        heroEmailLabel.font = .systemFont(ofSize: 12, weight: .medium)
        heroEmailLabel.textColor = UIColor.white.withAlphaComponent(0.8)
        heroEmailLabel.text = "user@patholab.cloud"

        heroRoleLabel.font = .systemFont(ofSize: 11, weight: .bold)
        heroRoleLabel.textColor = Self.headerBlue
        heroRoleLabel.backgroundColor = .white
        heroRoleLabel.layer.cornerRadius = 6
        heroRoleLabel.clipsToBounds = true
        heroRoleLabel.text = " LAB OWNER "

        heroLabLabel.font = .systemFont(ofSize: 11, weight: .bold)
        heroLabLabel.textColor = .white
        heroLabLabel.backgroundColor = UIColor.white.withAlphaComponent(0.25)
        heroLabLabel.layer.cornerRadius = 6
        heroLabLabel.clipsToBounds = true
        heroLabLabel.text = " MAIN LAB "

        let badgeRow = UIStackView(arrangedSubviews: [heroRoleLabel, heroLabLabel, UIView()])
        badgeRow.axis = .horizontal
        badgeRow.spacing = 6

        let textCol = UIStackView(arrangedSubviews: [heroNameLabel, heroEmailLabel, badgeRow])
        textCol.axis = .vertical
        textCol.spacing = 4

        let hRow = UIStackView(arrangedSubviews: [heroAvatarLabel, textCol])
        hRow.axis = .horizontal
        hRow.spacing = 14
        hRow.alignment = .center
        hRow.translatesAutoresizingMaskIntoConstraints = false
        card.addSubview(hRow)

        NSLayoutConstraint.activate([
            hRow.topAnchor.constraint(equalTo: card.topAnchor, constant: 16),
            hRow.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 16),
            hRow.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -16),
            hRow.bottomAnchor.constraint(equalTo: card.bottomAnchor, constant: -16),
        ])
        contentStack.addArrangedSubview(card)
    }

    private func buildProfileCard() {
        let card = createCard()
        let title = createSectionHeader(title: "Personal Profile", desc: "Manage your name, contact email and security.")
        let f1 = createFormField(label: "Full Name *", field: nameField, placeholder: "Enter name")
        let f2 = createFormField(label: "Email Address *", field: emailField, placeholder: "name@domain.com", keyboard: .emailAddress)
        let f3 = createFormField(label: "Mobile Phone", field: phoneField, placeholder: "+91 98765 43210", keyboard: .phonePad)

        let stack = UIStackView(arrangedSubviews: [title, f1, f2, f3])
        stack.axis = .vertical
        stack.spacing = 12
        stack.translatesAutoresizingMaskIntoConstraints = false
        card.addSubview(stack)

        addCardConstraints(card: card, stack: stack)
        contentStack.addArrangedSubview(card)
    }

    private func buildLabCard() {
        let card = createCard()
        let title = createSectionHeader(title: "Lab Workspace Details", desc: "Main center name, coordinates and address.")
        let f1 = createFormField(label: "Lab / Center Name *", field: labNameField, placeholder: "Apex Diagnostics")
        let f2 = createFormField(label: "Lab Support Email", field: labEmailField, placeholder: "support@lab.com", keyboard: .emailAddress)
        let f3 = createFormField(label: "Lab Phone", field: labPhoneField, placeholder: "+91 80000 12345", keyboard: .phonePad)
        let f4 = createFormField(label: "Street Address", field: labAddressField, placeholder: "12, Medical Enclave")
        let f5 = createFormField(label: "City", field: labCityField, placeholder: "Kolkata")
        let f6 = createFormField(label: "Pincode", field: labPincodeField, placeholder: "700001", keyboard: .numberPad)

        let stack = UIStackView(arrangedSubviews: [title, f1, f2, f3, f4, f5, f6])
        stack.axis = .vertical
        stack.spacing = 12
        stack.translatesAutoresizingMaskIntoConstraints = false
        card.addSubview(stack)

        addCardConstraints(card: card, stack: stack)
        contentStack.addArrangedSubview(card)
    }

    private func buildLegalCard() {
        let card = createCard()
        let title = createSectionHeader(title: "Legal & Banking", desc: "License certifications, GSTIN and bank details.")
        let f1 = createFormField(label: "Clinical License No.", field: licenseField, placeholder: "CEA/2026/0981")
        let f2 = createFormField(label: "GSTIN Number", field: gstField, placeholder: "19AAAAA0000A1Z5")
        let f3 = createFormField(label: "Bank Name", field: bankNameField, placeholder: "HDFC Bank")
        let f4 = createFormField(label: "Account Number", field: accountNoField, placeholder: "50200012345678", keyboard: .numberPad)
        let f5 = createFormField(label: "IFSC Code", field: ifscField, placeholder: "HDFC0000123")

        let stack = UIStackView(arrangedSubviews: [title, f1, f2, f3, f4, f5])
        stack.axis = .vertical
        stack.spacing = 12
        stack.translatesAutoresizingMaskIntoConstraints = false
        card.addSubview(stack)

        addCardConstraints(card: card, stack: stack)
        contentStack.addArrangedSubview(card)
    }

    private func buildModulesCard() {
        let card = createCard()
        let title = createSectionHeader(title: "App Modules & Features", desc: "Enable or disable specialized workflow modules.")
        let r1 = createSwitchRow(label: "Inventory & Stock", desc: "Reagent auto-deduction", sw: invSwitch)
        let r2 = createSwitchRow(label: "Radiology (RIS & PACS)", desc: "DICOM viewer", sw: radSwitch)
        let r3 = createSwitchRow(label: "Machine Interfacing (IoT)", desc: "Analyzer sync", sw: iotSwitch)
        let r4 = createSwitchRow(label: "B2B Agencies & Referrals", desc: "Doctor commissions", sw: b2bSwitch)
        let r5 = createSwitchRow(label: "Logistics & Phlebotomy", desc: "Rider collection trips", sw: logSwitch)

        invSwitch.isOn = true
        b2bSwitch.isOn = true

        let stack = UIStackView(arrangedSubviews: [title, r1, r2, r3, r4, r5])
        stack.axis = .vertical
        stack.spacing = 10
        stack.translatesAutoresizingMaskIntoConstraints = false
        card.addSubview(stack)

        addCardConstraints(card: card, stack: stack)
        contentStack.addArrangedSubview(card)
    }

    private func buildCommissionsCard() {
        let card = createCard()
        let title = createSectionHeader(title: "Commission Rules", desc: "Default incentives for referring doctors & partners.")
        let f1 = createFormField(label: "Default Doctor Commission (%)", field: docCommField, placeholder: "10", keyboard: .decimalPad)
        let f2 = createFormField(label: "Default Agency Commission (%)", field: agencyCommField, placeholder: "5", keyboard: .decimalPad)

        let stack = UIStackView(arrangedSubviews: [title, f1, f2])
        stack.axis = .vertical
        stack.spacing = 12
        stack.translatesAutoresizingMaskIntoConstraints = false
        card.addSubview(stack)

        addCardConstraints(card: card, stack: stack)
        contentStack.addArrangedSubview(card)
    }

    private func buildIntegrationsCard() {
        let card = createCard()
        let title = createSectionHeader(title: "WhatsApp Cloud API", desc: "Meta Cloud API credentials for automated dispatch.")
        let f1 = createFormField(label: "WhatsApp Cloud API Key", field: waKeyField, placeholder: "EAA...")
        let f2 = createFormField(label: "WhatsApp Phone Number ID", field: waPhoneIdField, placeholder: "108239012398")

        let stack = UIStackView(arrangedSubviews: [title, f1, f2])
        stack.axis = .vertical
        stack.spacing = 12
        stack.translatesAutoresizingMaskIntoConstraints = false
        card.addSubview(stack)

        addCardConstraints(card: card, stack: stack)
        contentStack.addArrangedSubview(card)
    }

    private func buildSaveButton() {
        saveButton.setTitle("Save All Settings", for: .normal)
        saveButton.titleLabel?.font = .systemFont(ofSize: 16, weight: .bold)
        saveButton.backgroundColor = Self.headerBlue
        saveButton.setTitleColor(.white, for: .normal)
        saveButton.layer.cornerRadius = 18
        saveButton.layer.shadowColor = Self.headerBlue.cgColor
        saveButton.layer.shadowOpacity = 0.28
        saveButton.layer.shadowRadius = 8
        saveButton.layer.shadowOffset = CGSize(width: 0, height: 4)
        saveButton.translatesAutoresizingMaskIntoConstraints = false
        saveButton.heightAnchor.constraint(equalToConstant: 52).isActive = true
        saveButton.addTarget(self, action: #selector(saveTapped), for: .touchUpInside)

        activitySpinner.hidesWhenStopped = true
        activitySpinner.color = .white
        activitySpinner.translatesAutoresizingMaskIntoConstraints = false
        saveButton.addSubview(activitySpinner)
        NSLayoutConstraint.activate([
            activitySpinner.centerXAnchor.constraint(equalTo: saveButton.centerXAnchor),
            activitySpinner.centerYAnchor.constraint(equalTo: saveButton.centerYAnchor)
        ])

        contentStack.addArrangedSubview(saveButton)
    }

    private func safeString(_ val: Any?) -> String {
        guard let s = val as? String else { return "" }
        let trimmed = s.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmed.isEmpty || trimmed.lowercased() == "null" { return "" }
        return trimmed
    }

    // MARK: – Data Fetching
    private func loadData() {
        guard let token = getToken() else { return }

        // 1. Profile
        Task {
            guard let url = URL(string: "\(Self.BASE_URL)/api/users/profile") else { return }
            var req = URLRequest(url: url)
            req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            req.setValue("token=\(token)", forHTTPHeaderField: "Cookie")
            if let (data, _) = try? await URLSession.shared.data(for: req),
               let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
               let user = json["user"] as? [String: Any] {
                let name  = safeString(user["name"])
                let email = safeString(user["email"])
                let phone = safeString(user["phone"])
                await MainActor.run {
                    self.nameField.text  = name
                    self.emailField.text = email
                    self.phoneField.text = phone
                    self.heroNameLabel.text  = name.isEmpty ? email : name
                    self.heroEmailLabel.text = email
                    let fn = HomeNativeView.formatSmartFirstName(name.isEmpty ? email : name)
                    self.heroAvatarLabel.text = String(fn.prefix(1)).uppercased()
                }
            }
        }

        // 2. Workspace
        Task {
            guard let url = URL(string: "\(Self.BASE_URL)/api/workspace/settings") else { return }
            var req = URLRequest(url: url)
            req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            req.setValue("token=\(token)", forHTTPHeaderField: "Cookie")
            if let (data, _) = try? await URLSession.shared.data(for: req),
               let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
               let lab = json["lab"] as? [String: Any] {
                await MainActor.run {
                    let lName = self.safeString(lab["name"])
                    self.heroLabLabel.text    = " \(lName.isEmpty ? "MAIN LAB" : lName) "
                    self.labNameField.text    = lName
                    self.labEmailField.text   = self.safeString(lab["email"])
                    self.labPhoneField.text   = self.safeString(lab["phone"])
                    self.labAddressField.text = self.safeString(lab["address"])
                    self.labCityField.text    = self.safeString(lab["city"])
                    self.labPincodeField.text = self.safeString(lab["pincode"])

                    self.licenseField.text    = self.safeString(lab["licenseNumber"])
                    self.gstField.text        = self.safeString(lab["gstNumber"])
                    self.bankNameField.text   = self.safeString(lab["bankName"])
                    self.accountNoField.text  = self.safeString(lab["accountNumber"])
                    self.ifscField.text       = self.safeString(lab["ifscCode"])

                    if let docC = lab["defaultDoctorCommission"] as? Double {
                        self.docCommField.text = String(docC)
                    }
                    if let agC = lab["defaultAgencyCommission"] as? Double {
                        self.agencyCommField.text = String(agC)
                    }
                    self.waKeyField.text     = self.safeString(lab["whatsappApiKey"])
                    self.waPhoneIdField.text = self.safeString(lab["whatsappPhoneId"])

                    if let mods = lab["activeModules"] as? [String] {
                        self.invSwitch.isOn = mods.contains("inventory")
                        self.radSwitch.isOn = mods.contains("radiology")
                        self.iotSwitch.isOn = mods.contains("iot")
                        self.b2bSwitch.isOn = mods.contains("b2b")
                        self.logSwitch.isOn = mods.contains("logistics")
                    }
                }
            }
        }
    }

    // MARK: – Save Settings
    @objc private func saveTapped() {
        guard let token = getToken() else { return }
        setSavingState(true)

        let pName  = nameField.text ?? ""
        let pEmail = emailField.text ?? ""
        let pPhone = phoneField.text ?? ""

        Task {
            var pOk = false
            if let pUrl = URL(string: "\(Self.BASE_URL)/api/users/profile") {
                var pReq = URLRequest(url: pUrl)
                pReq.httpMethod = "PUT"
                pReq.setValue("application/json", forHTTPHeaderField: "Content-Type")
                pReq.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
                pReq.setValue("token=\(token)", forHTTPHeaderField: "Cookie")
                let pBody: [String: Any] = ["name": pName, "email": pEmail, "phone": pPhone]
                pReq.httpBody = try? JSONSerialization.data(withJSONObject: pBody)
                if let (_, res) = try? await URLSession.shared.data(for: pReq),
                   let httpRes = res as? HTTPURLResponse, (200...299).contains(httpRes.statusCode) {
                    pOk = true
                    UserDefaults.standard.set(pName, forKey: "user_name")
                }
            }

            var wOk = false
            if let wUrl = URL(string: "\(Self.BASE_URL)/api/workspace/settings") {
                var wReq = URLRequest(url: wUrl)
                wReq.httpMethod = "PUT"
                wReq.setValue("application/json", forHTTPHeaderField: "Content-Type")
                wReq.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
                wReq.setValue("token=\(token)", forHTTPHeaderField: "Cookie")

                var activeMods: [String] = []
                if invSwitch.isOn { activeMods.append("inventory") }
                if radSwitch.isOn { activeMods.append("radiology") }
                if iotSwitch.isOn { activeMods.append("iot") }
                if b2bSwitch.isOn { activeMods.append("b2b") }
                if logSwitch.isOn { activeMods.append("logistics") }

                var wBody: [String: Any] = [
                    "name": self.labNameField.text ?? "",
                    "email": self.labEmailField.text ?? "",
                    "phone": self.labPhoneField.text ?? "",
                    "address": self.labAddressField.text ?? "",
                    "city": self.labCityField.text ?? "",
                    "pincode": self.labPincodeField.text ?? "",
                    "licenseNumber": self.licenseField.text ?? "",
                    "gstNumber": self.gstField.text ?? "",
                    "bankName": self.bankNameField.text ?? "",
                    "accountNumber": self.accountNoField.text ?? "",
                    "ifscCode": self.ifscField.text ?? "",
                    "whatsappApiKey": self.waKeyField.text ?? "",
                    "whatsappPhoneId": self.waPhoneIdField.text ?? "",
                    "activeModules": activeMods
                ]
                if let d = Double(self.docCommField.text ?? "") { wBody["defaultDoctorCommission"] = d }
                if let a = Double(self.agencyCommField.text ?? "") { wBody["defaultAgencyCommission"] = a }

                wReq.httpBody = try? JSONSerialization.data(withJSONObject: wBody)
                if let (_, res) = try? await URLSession.shared.data(for: wReq),
                   let httpRes = res as? HTTPURLResponse, (200...299).contains(httpRes.statusCode) {
                    wOk = true
                }
            }

            await MainActor.run {
                self.setSavingState(false)
                let generator = UINotificationFeedbackGenerator()
                if pOk || wOk {
                    generator.notificationOccurred(.success)
                    let alert = UIAlertController(title: "Success", message: "Settings saved successfully!", preferredStyle: .alert)
                    alert.addAction(UIAlertAction(title: "OK", style: .default))
                    self.present(alert, animated: true)
                } else {
                    generator.notificationOccurred(.error)
                    let alert = UIAlertController(title: "Error", message: "Failed to save settings. Please try again.", preferredStyle: .alert)
                    alert.addAction(UIAlertAction(title: "OK", style: .default))
                    self.present(alert, animated: true)
                }
            }
        }
    }

    private func setSavingState(_ saving: Bool) {
        saveButton.isEnabled = !saving
        saveButton.setTitle(saving ? "" : "Save All Settings", for: .normal)
        if saving { activitySpinner.startAnimating() } else { activitySpinner.stopAnimating() }
    }

    // MARK: – Helper Helpers
    private func getToken() -> String? {
        if let token = KeychainManager.read(forKey: KeychainManager.tokenKey), !token.isEmpty { return token }
        return UserDefaults.standard.string(forKey: "auth_token")
    }

    private func createCard() -> UIView {
        let v = UIView()
        v.backgroundColor = .white
        v.layer.cornerRadius = 20
        v.layer.shadowColor = UIColor.black.cgColor
        v.layer.shadowOpacity = 0.04
        v.layer.shadowRadius = 6
        v.layer.shadowOffset = CGSize(width: 0, height: 2)
        v.translatesAutoresizingMaskIntoConstraints = false
        return v
    }

    private func addCardConstraints(card: UIView, stack: UIStackView) {
        NSLayoutConstraint.activate([
            stack.topAnchor.constraint(equalTo: card.topAnchor, constant: 18),
            stack.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 18),
            stack.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -18),
            stack.bottomAnchor.constraint(equalTo: card.bottomAnchor, constant: -18),
        ])
    }

    private func createSectionHeader(title: String, desc: String) -> UIStackView {
        let t = UILabel()
        t.text = title
        t.font = .systemFont(ofSize: 17, weight: .bold)
        t.textColor = UIColor(red: 0.059, green: 0.090, blue: 0.165, alpha: 1)

        let d = UILabel()
        d.text = desc
        d.font = .systemFont(ofSize: 12, weight: .medium)
        d.textColor = UIColor(red: 0.392, green: 0.455, blue: 0.545, alpha: 1)

        let s = UIStackView(arrangedSubviews: [t, d])
        s.axis = .vertical
        s.spacing = 2
        return s
    }

    private func createFormField(label: String, field: UITextField, placeholder: String, keyboard: UIKeyboardType = .default) -> UIStackView {
        let l = UILabel()
        l.text = label
        l.font = .systemFont(ofSize: 12.5, weight: .bold)
        l.textColor = UIColor(red: 0.2, green: 0.255, blue: 0.333, alpha: 1)

        field.placeholder = placeholder
        field.font = .systemFont(ofSize: 14)
        field.backgroundColor = UIColor(red: 0.965, green: 0.973, blue: 0.984, alpha: 1)
        field.layer.cornerRadius = 10
        field.layer.borderWidth = 1
        field.layer.borderColor = UIColor(red: 0.898, green: 0.918, blue: 0.941, alpha: 1).cgColor
        field.keyboardType = keyboard
        field.autocapitalizationType = .none
        field.heightAnchor.constraint(equalToConstant: 44).isActive = true

        let pad = UIView(frame: CGRect(x: 0, y: 0, width: 12, height: 44))
        field.leftView = pad
        field.leftViewMode = .always

        let s = UIStackView(arrangedSubviews: [l, field])
        s.axis = .vertical
        s.spacing = 6
        return s
    }

    private func createSwitchRow(label: String, desc: String, sw: UISwitch) -> UIStackView {
        let l = UILabel()
        l.text = label
        l.font = .systemFont(ofSize: 14, weight: .bold)
        l.textColor = UIColor(red: 0.059, green: 0.090, blue: 0.165, alpha: 1)

        let d = UILabel()
        d.text = desc
        d.font = .systemFont(ofSize: 11.5, weight: .medium)
        d.textColor = UIColor(red: 0.392, green: 0.455, blue: 0.545, alpha: 1)

        let left = UIStackView(arrangedSubviews: [l, d])
        left.axis = .vertical
        left.spacing = 2

        let row = UIStackView(arrangedSubviews: [left, UIView(), sw])
        row.axis = .horizontal
        row.alignment = .center
        return row
    }
}
