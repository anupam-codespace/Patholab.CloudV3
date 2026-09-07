import UIKit

/**
 * AllModulesSheetViewController
 * ─────────────────────────────
 * Complete Laboratory & Radiology Module Directory Bottom Sheet (iOS)
 * Covers all clinical operations, RIS/PACS suite, lab automation, finance & settings
 * with live Omnibar search filter, recently used quick jump, and native navigation routing.
 */
class AllModulesSheetViewController: UIViewController, UITextFieldDelegate {

    var onNavigate: ((String) -> Void)?

    private let dragHandle = UIView()
    private let titleLabel = UILabel()
    private let subLabel   = UILabel()
    private let closeBtn   = UIButton(type: .system)
    private let searchField = UITextField()
    private let scrollView = UIScrollView()
    private let contentStack = UIStackView()

    struct SheetModule: Codable {
        let name: String
        let path: String
        let icon: String
        let bgHex: String
        let tintHex: String
    }

    // ── 1. Overview ──
    private let overviewModules: [SheetModule] = [
        SheetModule(name: "Home",                path: "/dashboard",                  icon: "house.fill",            bgHex: "EFF6FF", tintHex: "2563EB"),
        SheetModule(name: "Dashboard",           path: "/dashboard",                 icon: "square.grid.2x2.fill",  bgHex: "F0F9FF", tintHex: "0284C7"),
        SheetModule(name: "Financial Analytics", path: "/workspace/analytics",       icon: "chart.bar.xaxis",       bgHex: "ECFDF5", tintHex: "059669"),
        SheetModule(name: "Online Booking",      path: "/workspace/online-booking",  icon: "calendar",              bgHex: "FAF5FF", tintHex: "9333EA"),
    ]

    // ── 2. Clinical Operations ──
    private let clinicalModules: [SheetModule] = [
        SheetModule(name: "New Registration",    path: "/workspace/registration",    icon: "person.badge.plus.fill",bgHex: "EFF6FF", tintHex: "2563EB"),
        SheetModule(name: "Patient Directory",   path: "/workspace/patients",        icon: "person.2.fill",         bgHex: "FDF4FF", tintHex: "C026D3"),
        SheetModule(name: "Test Management",     path: "/workspace/test-management", icon: "flask.fill",            bgHex: "F5F3FF", tintHex: "7C3AED"),
        SheetModule(name: "Worklist & Results",  path: "/workspace/results",         icon: "list.bullet.rectangle.portrait.fill", bgHex: "EEF2FF", tintHex: "4F46E5"),
        SheetModule(name: "Report Dispatch",     path: "/workspace/reports",         icon: "paperplane.fill",       bgHex: "F0FDFA", tintHex: "0D9488"),
    ]

    // ── 3. Radiology ──
    private let radiologyModules: [SheetModule] = [
        SheetModule(name: "RIS Dashboard",       path: "/workspace/radiology/dashboard",              icon: "waveform.path.ecg",    bgHex: "FAF5FF", tintHex: "9333EA"),
        SheetModule(name: "Scan Schedule",       path: "/workspace/radiology/dashboard/appointments",icon: "calendar",            bgHex: "EFF6FF", tintHex: "2563EB"),
        SheetModule(name: "Technician Worklist", path: "/workspace/radiology/worklist",              icon: "list.clipboard.fill", bgHex: "F0FDFA", tintHex: "0D9488"),
        SheetModule(name: "PACS Viewer",         path: "/workspace/radiology/pacs",                  icon: "desktopcomputer",     bgHex: "FAF5FF", tintHex: "9333EA"),
        SheetModule(name: "Media Library",       path: "/workspace/radiology/media",                 icon: "photo.stack.fill",    bgHex: "FFF1F2", tintHex: "E11D48"),
        SheetModule(name: "Reporting Queue",     path: "/workspace/radiology/reporting",             icon: "doc.text.fill.badge.plus", bgHex: "ECFDF5", tintHex: "059669"),
        SheetModule(name: "Reports Archive",     path: "/workspace/radiology/archive",               icon: "archivebox.fill",     bgHex: "FFFBEB", tintHex: "D97706"),
        SheetModule(name: "Machines",            path: "/workspace/radiology/machines",              icon: "gearshape.2.fill",    bgHex: "F8FAFC", tintHex: "475569"),
        SheetModule(name: "RIS Macros",          path: "/workspace/radiology/macros",                icon: "square.and.pencil",   bgHex: "FFF7ED", tintHex: "EA580C"),
        SheetModule(name: "DICOM Settings",      path: "/workspace/radiology/settings/dicom",        icon: "gearshape.fill",      bgHex: "EFF6FF", tintHex: "2563EB"),
        SheetModule(name: "RIS Letterhead",      path: "/workspace/radiology/settings/letterhead",   icon: "doc.richtext.fill",   bgHex: "FAF5FF", tintHex: "9333EA"),
    ]

    // ── 4. Resources & Logistics ──
    private let resourcesModules: [SheetModule] = [
        SheetModule(name: "Inventory & Stock",   path: "/workspace/inventory",       icon: "shippingbox.fill",      bgHex: "F0FDFA", tintHex: "0D9488"),
        SheetModule(name: "Logistics / Trips",   path: "/workspace/logistics",       icon: "box.truck.fill",        bgHex: "FFFBEB", tintHex: "D97706"),
        SheetModule(name: "Home Collection",     path: "/workspace/home-collection", icon: "house.circle.fill",     bgHex: "ECFDF5", tintHex: "059669"),
    ]

    // ── 5. Machine & AI ──
    private let machineAiModules: [SheetModule] = [
        SheetModule(name: "Analyzer",            path: "/workspace/analyzers",       icon: "cpu.fill",              bgHex: "ECFEFF", tintHex: "0891B2"),
        SheetModule(name: "Visual Mapper",       path: "/workspace/analyzers/mapper",icon: "arrow.triangle.swap",   bgHex: "EEF2FF", tintHex: "4F46E5"),
        SheetModule(name: "Mappings",            path: "/workspace/analyzers/mappings", icon: "point.3.filled.connected.trianglepath.dotted", bgHex: "FAF5FF", tintHex: "7C3AED"),
    ]

    // ── 6. B2B & Growth ──
    private let b2bGrowthModules: [SheetModule] = [
        SheetModule(name: "Referral Doctors",    path: "/workspace/doctors",         icon: "stethoscope",           bgHex: "EFF6FF", tintHex: "1D4ED8"),
        SheetModule(name: "Corporate Agencies",  path: "/workspace/agencies",        icon: "building.2.fill",       bgHex: "FFF7ED", tintHex: "EA580C"),
        SheetModule(name: "Commissions Payout",  path: "/workspace/commissions",     icon: "dollarsign.circle.fill",bgHex: "FAF5FF", tintHex: "9333EA"),
        SheetModule(name: "B2B Settings",        path: "/workspace/settings/b2b-tiers", icon: "slider.horizontal.3",  bgHex: "EFF6FF", tintHex: "2563EB"),
    ]

    // ── 7. Administration ──
    private let adminModules: [SheetModule] = [
        SheetModule(name: "Lab Settings",        path: "/workspace/settings",             icon: "gearshape.fill",        bgHex: "EEF2FF", tintHex: "4F46E5"),
        SheetModule(name: "Report Templates",    path: "/workspace/settings/templates",   icon: "doc.text.image.fill",   bgHex: "FAF5FF", tintHex: "9333EA"),
        SheetModule(name: "Invoice Branding",    path: "/workspace/settings/branding",    icon: "paintbrush.fill",       bgHex: "F0F9FF", tintHex: "0284C7"),
        SheetModule(name: "Service Areas",       path: "/workspace/settings/service-areas",icon: "map.fill",             bgHex: "FFFBEB", tintHex: "D97706"),
        SheetModule(name: "Payment Settings",    path: "/workspace/settings/payments",    icon: "qrcode",                bgHex: "ECFDF5", tintHex: "059669"),
        SheetModule(name: "Notifications",       path: "/workspace/settings/notifications",icon: "bell.fill",            bgHex: "FFF1F2", tintHex: "E11D48"),
        SheetModule(name: "B2B Settings",        path: "/workspace/settings/b2b",         icon: "person.3.sequence.fill",bgHex: "EFF6FF", tintHex: "2563EB"),
        SheetModule(name: "Staff Management",    path: "/workspace/staff",                icon: "person.badge.shield.checkmark.fill", bgHex: "FDF4FF", tintHex: "C026D3"),
        SheetModule(name: "Invoices & Payments", path: "/workspace/billing",              icon: "receipt",               bgHex: "ECFDF5", tintHex: "059669"),
        SheetModule(name: "Expenses",            path: "/workspace/expenses",             icon: "creditcard.and.123",    bgHex: "FFF1F2", tintHex: "E11D48"),
        SheetModule(name: "Audit Logs",          path: "/workspace/audit-logs",           icon: "shield.lefthalf.filled",bgHex: "F0FDFA", tintHex: "0D9488"),
        SheetModule(name: "Wallet & Billing",    path: "/workspace/wallet",               icon: "wallet.pass.fill",      bgHex: "EEF2FF", tintHex: "4F46E5"),
        SheetModule(name: "Wallet Recharge",     path: "/workspace/wallet/recharge",      icon: "plus.circle.fill",      bgHex: "ECFDF5", tintHex: "059669"),
        SheetModule(name: "Help & Support",      path: "/workspace/support",              icon: "questionmark.circle.fill",bgHex: "FFF7ED", tintHex: "EA580C"),
    ]

    private var allModuleCards: [(view: UIView, module: SheetModule)] = []

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .white
        view.layer.cornerRadius = 28
        view.clipsToBounds = true

        setupHeader()
        setupSearchOmnibar()
        setupContent()
    }

    private func setupHeader() {
        dragHandle.backgroundColor = UIColor(red: 0.796, green: 0.835, blue: 0.882, alpha: 1)
        dragHandle.layer.cornerRadius = 2
        dragHandle.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(dragHandle)

        titleLabel.text = "All Lab Modules"
        titleLabel.font = .systemFont(ofSize: 20, weight: .bold)
        titleLabel.textColor = UIColor(red: 0.059, green: 0.090, blue: 0.165, alpha: 1)

        subLabel.text = "Complete Clinical, RIS/PACS & Enterprise Directory"
        subLabel.font = .systemFont(ofSize: 12, weight: .medium)
        subLabel.textColor = UIColor(red: 0.392, green: 0.455, blue: 0.545, alpha: 1)

        let titleStack = UIStackView(arrangedSubviews: [titleLabel, subLabel])
        titleStack.axis = .vertical
        titleStack.spacing = 2

        closeBtn.setImage(UIImage(systemName: "xmark"), for: .normal)
        closeBtn.tintColor = UIColor(red: 0.278, green: 0.333, blue: 0.412, alpha: 1)
        closeBtn.backgroundColor = UIColor(red: 0.945, green: 0.961, blue: 0.976, alpha: 1)
        closeBtn.layer.cornerRadius = 18
        closeBtn.translatesAutoresizingMaskIntoConstraints = false
        closeBtn.addTarget(self, action: #selector(closeTapped), for: .touchUpInside)

        let topRow = UIStackView(arrangedSubviews: [titleStack, UIView(), closeBtn])
        topRow.axis = .horizontal
        topRow.alignment = .center
        topRow.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(topRow)

        NSLayoutConstraint.activate([
            dragHandle.topAnchor.constraint(equalTo: view.topAnchor, constant: 10),
            dragHandle.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            dragHandle.widthAnchor.constraint(equalToConstant: 44),
            dragHandle.heightAnchor.constraint(equalToConstant: 4),

            topRow.topAnchor.constraint(equalTo: dragHandle.bottomAnchor, constant: 14),
            topRow.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 20),
            topRow.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -20),

            closeBtn.widthAnchor.constraint(equalToConstant: 36),
            closeBtn.heightAnchor.constraint(equalToConstant: 36),
        ])
    }

    private func setupSearchOmnibar() {
        searchField.placeholder = "Search any module (e.g. DICOM, PACS, Payout, Analyzer)..."
        searchField.font = .systemFont(ofSize: 13.5, weight: .medium)
        searchField.backgroundColor = UIColor(red: 0.973, green: 0.980, blue: 0.988, alpha: 1)
        searchField.layer.cornerRadius = 12
        searchField.layer.borderWidth = 1
        searchField.layer.borderColor = UIColor(red: 0.89, green: 0.91, blue: 0.95, alpha: 1).cgColor
        searchField.clearButtonMode = .whileEditing
        searchField.delegate = self
        searchField.addTarget(self, action: #selector(searchChanged), for: .editingChanged)

        let leftPad = UIView(frame: CGRect(x: 0, y: 0, width: 38, height: 42))
        let searchIcon = UIImageView(image: UIImage(systemName: "magnifyingglass"))
        searchIcon.tintColor = UIColor(red: 0.580, green: 0.639, blue: 0.722, alpha: 1)
        searchIcon.frame = CGRect(x: 12, y: 12, width: 18, height: 18)
        leftPad.addSubview(searchIcon)
        searchField.leftView = leftPad
        searchField.leftViewMode = .always
        searchField.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(searchField)

        NSLayoutConstraint.activate([
            searchField.topAnchor.constraint(equalTo: dragHandle.bottomAnchor, constant: 64),
            searchField.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 20),
            searchField.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -20),
            searchField.heightAnchor.constraint(equalToConstant: 44),
        ])
    }

    private func setupContent() {
        scrollView.showsVerticalScrollIndicator = false
        scrollView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(scrollView)

        contentStack.axis = .vertical
        contentStack.spacing = 20
        contentStack.translatesAutoresizingMaskIntoConstraints = false
        scrollView.addSubview(contentStack)

        NSLayoutConstraint.activate([
            scrollView.topAnchor.constraint(equalTo: searchField.bottomAnchor, constant: 14),
            scrollView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            scrollView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            scrollView.bottomAnchor.constraint(equalTo: view.bottomAnchor),

            contentStack.topAnchor.constraint(equalTo: scrollView.topAnchor, constant: 10),
            contentStack.leadingAnchor.constraint(equalTo: scrollView.leadingAnchor, constant: 20),
            contentStack.trailingAnchor.constraint(equalTo: scrollView.trailingAnchor, constant: -20),
            contentStack.bottomAnchor.constraint(equalTo: scrollView.bottomAnchor, constant: -40),
            contentStack.widthAnchor.constraint(equalTo: scrollView.widthAnchor, constant: -40),
        ])

        allModuleCards.removeAll()

        // 1. Overview
        addCategorySection(title: "OVERVIEW", modules: overviewModules)

        // 2. Clinical Operations
        addCategorySection(title: "CLINICAL OPERATIONS", modules: clinicalModules)

        // 3. Radiology
        addCategorySection(title: "RADIOLOGY", modules: radiologyModules)

        // 4. Resources & Logistics
        addCategorySection(title: "RESOURCES & LOGISTICS", modules: resourcesModules)

        // 5. Machine & AI
        addCategorySection(title: "MACHINE & AI", modules: machineAiModules)

        // 6. B2B & Growth
        addCategorySection(title: "B2B & GROWTH", modules: b2bGrowthModules)

        // 7. Administration
        addCategorySection(title: "ADMINISTRATION", modules: adminModules)
    }

    private func addCategorySection(title: String, modules: [SheetModule]) {
        let bentoBox = UIView()
        bentoBox.backgroundColor = .white
        bentoBox.layer.cornerRadius = 20
        bentoBox.layer.borderWidth = 1
        bentoBox.layer.borderColor = UIColor(red: 226/255, green: 232/255, blue: 240/255, alpha: 1).cgColor
        bentoBox.layer.shadowColor = UIColor.black.cgColor
        bentoBox.layer.shadowOpacity = 0.03
        bentoBox.layer.shadowRadius = 6
        bentoBox.layer.shadowOffset = CGSize(width: 0, height: 2)

        let sectionLbl = UILabel()
        sectionLbl.text = title
        sectionLbl.font = .systemFont(ofSize: 11.5, weight: .bold)
        sectionLbl.textColor = UIColor(red: 100/255, green: 116/255, blue: 139/255, alpha: 1)
        sectionLbl.letterSpace(0.6)

        let bentoStack = UIStackView()
        bentoStack.axis = .vertical
        bentoStack.spacing = 14
        bentoStack.translatesAutoresizingMaskIntoConstraints = false

        bentoStack.addArrangedSubview(sectionLbl)

        let chunked = stride(from: 0, to: modules.count, by: 4).map {
            Array(modules[$0..<min($0 + 4, modules.count)])
        }

        for chunk in chunked {
            let row = UIStackView()
            row.axis = .horizontal
            row.distribution = .fillEqually
            row.spacing = 8

            for mod in chunk {
                let card = makeModuleCard(mod)
                row.addArrangedSubview(card)
                allModuleCards.append((view: card, module: mod))
            }

            if chunk.count < 4 {
                for _ in chunk.count..<4 {
                    let spacer = UIView()
                    row.addArrangedSubview(spacer)
                }
            }

            bentoStack.addArrangedSubview(row)
        }

        bentoBox.addSubview(bentoStack)
        NSLayoutConstraint.activate([
            bentoStack.topAnchor.constraint(equalTo: bentoBox.topAnchor, constant: 14),
            bentoStack.leadingAnchor.constraint(equalTo: bentoBox.leadingAnchor, constant: 14),
            bentoStack.trailingAnchor.constraint(equalTo: bentoBox.trailingAnchor, constant: -14),
            bentoStack.bottomAnchor.constraint(equalTo: bentoBox.bottomAnchor, constant: -14),
        ])

        contentStack.addArrangedSubview(bentoBox)
    }

    private func makeModuleCard(_ mod: SheetModule) -> UIView {
        let card = UIView()
        card.backgroundColor = .clear

        let tint = UIColor(hex: mod.tintHex)
        let bg = UIColor(hex: mod.bgHex)

        // 15pt Squircle icon container with 1pt matching tint border
        let iconBox = UIView()
        iconBox.backgroundColor = bg
        iconBox.layer.cornerRadius = 15
        iconBox.layer.borderWidth = 1
        iconBox.layer.borderColor = tint.withAlphaComponent(0.18).cgColor
        iconBox.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            iconBox.widthAnchor.constraint(equalToConstant: 48),
            iconBox.heightAnchor.constraint(equalToConstant: 48),
        ])

        let iconImg = UIImageView(image: UIImage(systemName: mod.icon))
        iconImg.tintColor = tint
        iconImg.contentMode = .scaleAspectFit
        iconImg.translatesAutoresizingMaskIntoConstraints = false
        iconBox.addSubview(iconImg)
        NSLayoutConstraint.activate([
            iconImg.centerXAnchor.constraint(equalTo: iconBox.centerXAnchor),
            iconImg.centerYAnchor.constraint(equalTo: iconBox.centerYAnchor),
            iconImg.widthAnchor.constraint(equalToConstant: 22),
            iconImg.heightAnchor.constraint(equalToConstant: 22),
        ])

        // Bold text directly below icon
        let nameLbl = UILabel()
        nameLbl.text = mod.name
        nameLbl.font = .systemFont(ofSize: 11.5, weight: .bold)
        nameLbl.textColor = UIColor(red: 30/255, green: 41/255, blue: 59/255, alpha: 1)
        nameLbl.textAlignment = .center
        nameLbl.numberOfLines = 2
        nameLbl.adjustsFontSizeToFitWidth = true
        nameLbl.minimumScaleFactor = 0.85
        nameLbl.translatesAutoresizingMaskIntoConstraints = false

        let vStack = UIStackView(arrangedSubviews: [iconBox, nameLbl])
        vStack.axis = .vertical
        vStack.spacing = 6
        vStack.alignment = .center
        vStack.translatesAutoresizingMaskIntoConstraints = false

        card.addSubview(vStack)
        NSLayoutConstraint.activate([
            vStack.topAnchor.constraint(equalTo: card.topAnchor, constant: 4),
            vStack.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 2),
            vStack.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -2),
            vStack.bottomAnchor.constraint(equalTo: card.bottomAnchor, constant: -4),
        ])

        let tap = UITapGestureRecognizer(target: self, action: #selector(cardTapped(_:)))
        card.addGestureRecognizer(tap)
        card.isUserInteractionEnabled = true
        card.accessibilityIdentifier = mod.path

        return card
    }

    @objc private func searchChanged() {
        let q = searchField.text?.trimmingCharacters(in: .whitespacesAndNewlines).lowercased() ?? ""
        for item in allModuleCards {
            if q.isEmpty {
                item.view.alpha = 1.0
                item.view.isUserInteractionEnabled = true
            } else {
                let matches = item.module.name.lowercased().contains(q) || item.module.path.lowercased().contains(q)
                item.view.alpha = matches ? 1.0 : 0.15
                item.view.isUserInteractionEnabled = matches
            }
        }
    }

    @objc private func cardTapped(_ gr: UITapGestureRecognizer) {
        guard let path = gr.view?.accessibilityIdentifier else { return }
        dismiss(animated: true) { [weak self] in
            self?.onNavigate?(path)
        }
    }

    @objc private func closeTapped() {
        dismiss(animated: true, completion: nil)
    }
}

// ── Extensions ───────────────────────────────────────────────────────────────
private extension UILabel {
    func letterSpace(_ spacing: CGFloat) {
        guard let text = self.text else { return }
        let attributedString = NSMutableAttributedString(string: text)
        attributedString.addAttribute(.kern, value: spacing, range: NSRange(location: 0, length: text.count))
        self.attributedText = attributedString
    }
}

private extension UIColor {
    convenience init(hex: String) {
        var cString = hex.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
        if cString.hasPrefix("#") { cString.remove(at: cString.startIndex) }
        var rgbValue: UInt64 = 0
        Scanner(string: cString).scanHexInt64(&rgbValue)
        self.init(
            red: CGFloat((rgbValue & 0xFF0000) >> 16) / 255.0,
            green: CGFloat((rgbValue & 0x00FF00) >> 8) / 255.0,
            blue: CGFloat(rgbValue & 0x0000FF) / 255.0,
            alpha: 1.0
        )
    }
}
