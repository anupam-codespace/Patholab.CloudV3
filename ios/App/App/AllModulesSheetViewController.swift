import UIKit

/**
 * AllModulesSheetViewController
 * ─────────────────────────────
 * Native iOS Bottom Sheet popup (85% height).
 * Features:
 *  - "⚡ RECENTLY USED" horizontal quick-jump cards
 *  - Categorized clean white module cards with soft pastel icons
 *  - Top-right cross close button
 */
class AllModulesSheetViewController: UIViewController {

    var onNavigate: ((String) -> Void)?

    private let dragHandle = UIView()
    private let titleLabel = UILabel()
    private let subLabel   = UILabel()
    private let closeBtn   = UIButton(type: .system)
    private let scrollView = UIScrollView()
    private let contentStack = UIStackView()

    struct SheetModule: Codable {
        let name: String
        let path: String
        let icon: String
        let bgHex: String
        let tintHex: String
    }

    private let defaultRecents: [SheetModule] = [
        SheetModule(name: "Register",  path: "/workspace/registration",    icon: "person.badge.plus.fill", bgHex: "EFF6FF", tintHex: "2563EB"),
        SheetModule(name: "Billing",   path: "/workspace/billing",        icon: "doc.plaintext.fill",     bgHex: "ECFDF5", tintHex: "059669"),
        SheetModule(name: "Reports",   path: "/workspace/reports",        icon: "checkmark.seal.fill",    bgHex: "F0F9FF", tintHex: "0284C7"),
        SheetModule(name: "Tests",     path: "/workspace/test-management", icon: "flask.fill",             bgHex: "F5F3FF", tintHex: "7C3AED"),
    ]

    private let clinicalModules: [SheetModule] = [
        SheetModule(name: "Register",  path: "/workspace/registration",    icon: "person.badge.plus.fill", bgHex: "EFF6FF", tintHex: "2563EB"),
        SheetModule(name: "Tests",     path: "/workspace/test-management", icon: "flask.fill",             bgHex: "F5F3FF", tintHex: "7C3AED"),
        SheetModule(name: "Billing",   path: "/workspace/billing",        icon: "doc.plaintext.fill",     bgHex: "ECFDF5", tintHex: "059669"),
        SheetModule(name: "Reports",   path: "/workspace/reports",        icon: "checkmark.seal.fill",    bgHex: "F0F9FF", tintHex: "0284C7"),
        SheetModule(name: "Samples",   path: "/workspace/accession",      icon: "testtube.2",             bgHex: "FFF1F2", tintHex: "E11D48"),
        SheetModule(name: "WhatsApp",  path: "/workspace/reports",        icon: "message.circle.fill",    bgHex: "F0FDF4", tintHex: "16A34A"),
        SheetModule(name: "Logistics", path: "/workspace/logistics",      icon: "box.truck.fill",         bgHex: "FFFBEB", tintHex: "D97706"),
        SheetModule(name: "Wallet",    path: "/workspace/wallet",         icon: "creditcard.fill",        bgHex: "EEF2FF", tintHex: "4F46E5"),
    ]

    private let advancedModules: [SheetModule] = [
        SheetModule(name: "Inventory", path: "/workspace/inventory",      icon: "shippingbox.fill",       bgHex: "F0FDFA", tintHex: "0D9488"),
        SheetModule(name: "Radiology", path: "/workspace/radiology",      icon: "waveform.path.ecg",      bgHex: "FAF5FF", tintHex: "9333EA"),
        SheetModule(name: "Analyzers", path: "/workspace/analyzers",      icon: "cpu.fill",               bgHex: "ECFEFF", tintHex: "0891B2"),
        SheetModule(name: "Agencies",  path: "/workspace/agencies",       icon: "building.2.fill",        bgHex: "FFF7ED", tintHex: "EA580C"),
        SheetModule(name: "Doctors",   path: "/workspace/doctors",        icon: "stethoscope",            bgHex: "EFF6FF", tintHex: "1D4ED8"),
        SheetModule(name: "Patients",  path: "/workspace/patients",       icon: "person.2.fill",          bgHex: "FDF4FF", tintHex: "C026D3"),
        SheetModule(name: "Analytics", path: "/workspace/analytics",      icon: "chart.bar.xaxis",        bgHex: "ECFDF5", tintHex: "10B981"),
        SheetModule(name: "Settings",  path: "/workspace/settings",       icon: "gearshape.fill",         bgHex: "F1F5F9", tintHex: "475569"),
    ]

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .white
        view.layer.cornerRadius = 28
        view.clipsToBounds = true

        setupHeader()
        setupContent()
    }

    private func setupHeader() {
        // Drag handle
        dragHandle.backgroundColor = UIColor(red: 0.796, green: 0.835, blue: 0.882, alpha: 1)
        dragHandle.layer.cornerRadius = 2
        dragHandle.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(dragHandle)

        // Title
        titleLabel.text = "All Lab Modules"
        titleLabel.font = .systemFont(ofSize: 20, weight: .bold)
        titleLabel.textColor = UIColor(red: 0.059, green: 0.090, blue: 0.165, alpha: 1)

        // Subtitle
        subLabel.text = "Patholab Cloud Healthcare Suite"
        subLabel.font = .systemFont(ofSize: 12.5, weight: .medium)
        subLabel.textColor = UIColor(red: 0.392, green: 0.455, blue: 0.545, alpha: 1)

        let titleStack = UIStackView(arrangedSubviews: [titleLabel, subLabel])
        titleStack.axis = .vertical
        titleStack.spacing = 2

        // Cross Close Button
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

        let divider = UIView()
        divider.backgroundColor = UIColor(red: 0.945, green: 0.961, blue: 0.976, alpha: 1)
        divider.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(divider)

        NSLayoutConstraint.activate([
            dragHandle.topAnchor.constraint(equalTo: view.topAnchor, constant: 10),
            dragHandle.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            dragHandle.widthAnchor.constraint(equalToConstant: 42),
            dragHandle.heightAnchor.constraint(equalToConstant: 4),

            closeBtn.widthAnchor.constraint(equalToConstant: 36),
            closeBtn.heightAnchor.constraint(equalToConstant: 36),

            topRow.topAnchor.constraint(equalTo: dragHandle.bottomAnchor, constant: 14),
            topRow.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 20),
            topRow.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -20),

            divider.topAnchor.constraint(equalTo: topRow.bottomAnchor, constant: 14),
            divider.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            divider.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            divider.heightAnchor.constraint(equalToConstant: 1)
        ])
    }

    private func setupContent() {
        scrollView.showsVerticalScrollIndicator = false
        scrollView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(scrollView)

        contentStack.axis = .vertical
        contentStack.spacing = 18
        contentStack.translatesAutoresizingMaskIntoConstraints = false
        scrollView.addSubview(contentStack)

        NSLayoutConstraint.activate([
            scrollView.topAnchor.constraint(equalTo: view.topAnchor, constant: 90),
            scrollView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            scrollView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            scrollView.bottomAnchor.constraint(equalTo: view.bottomAnchor),

            contentStack.topAnchor.constraint(equalTo: scrollView.topAnchor, constant: 16),
            contentStack.leadingAnchor.constraint(equalTo: scrollView.leadingAnchor, constant: 16),
            contentStack.trailingAnchor.constraint(equalTo: scrollView.trailingAnchor, constant: -16),
            contentStack.bottomAnchor.constraint(equalTo: scrollView.bottomAnchor, constant: -30),
            contentStack.widthAnchor.constraint(equalTo: scrollView.widthAnchor, constant: -32)
        ])

        // 0. RECENTLY USED
        buildRecentlyUsedSection()

        // 1. Clinical
        contentStack.addArrangedSubview(createCategoryHeader(title: "CLINICAL OPERATIONS"))
        contentStack.addArrangedSubview(createGridRows(modules: clinicalModules))

        // 2. Advanced
        contentStack.addArrangedSubview(createCategoryHeader(title: "ADVANCED SUITE & OPERATIONS"))
        contentStack.addArrangedSubview(createGridRows(modules: advancedModules))
    }

    private func buildRecentlyUsedSection() {
        let titleRow = UIStackView()
        titleRow.axis = .horizontal
        titleRow.spacing = 6
        titleRow.alignment = .center

        let recTitle = UILabel()
        recTitle.text = "RECENTLY USED"
        recTitle.font = .systemFont(ofSize: 11.5, weight: .bold)
        recTitle.textColor = UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1)

        let recSub = UILabel()
        recSub.text = "• Quick Jump"
        recSub.font = .systemFont(ofSize: 11, weight: .medium)
        recSub.textColor = UIColor(red: 0.580, green: 0.639, blue: 0.722, alpha: 1)

        titleRow.addArrangedSubview(recTitle)
        titleRow.addArrangedSubview(recSub)
        titleRow.addArrangedSubview(UIView())
        contentStack.addArrangedSubview(titleRow)

        let hScroll = UIScrollView()
        hScroll.showsHorizontalScrollIndicator = false
        hScroll.translatesAutoresizingMaskIntoConstraints = false
        hScroll.heightAnchor.constraint(equalToConstant: 48).isActive = true

        let hStack = UIStackView()
        hStack.axis = .horizontal
        hStack.spacing = 8
        hStack.translatesAutoresizingMaskIntoConstraints = false
        hScroll.addSubview(hStack)

        NSLayoutConstraint.activate([
            hStack.topAnchor.constraint(equalTo: hScroll.topAnchor),
            hStack.leadingAnchor.constraint(equalTo: hScroll.leadingAnchor),
            hStack.trailingAnchor.constraint(equalTo: hScroll.trailingAnchor),
            hStack.bottomAnchor.constraint(equalTo: hScroll.bottomAnchor),
            hStack.heightAnchor.constraint(equalTo: hScroll.heightAnchor)
        ])

        let recents = getRecentModules()
        for mod in recents {
            let chip = createRecentChip(mod)
            hStack.addArrangedSubview(chip)
        }

        contentStack.addArrangedSubview(hScroll)
    }

    private func createRecentChip(_ mod: SheetModule) -> UIView {
        let btn = UIButton(type: .custom)
        btn.backgroundColor = .white
        btn.layer.cornerRadius = 14
        btn.layer.borderWidth = 1
        btn.layer.borderColor = UIColor(red: 0.886, green: 0.910, blue: 0.941, alpha: 1).cgColor
        btn.layer.shadowColor = UIColor.black.cgColor
        btn.layer.shadowOpacity = 0.03
        btn.layer.shadowRadius = 3
        btn.layer.shadowOffset = CGSize(width: 0, height: 1)
        btn.accessibilityIdentifier = mod.path

        let iconBadge = UIView()
        iconBadge.backgroundColor = colorFromHex(mod.bgHex)
        iconBadge.layer.cornerRadius = 12
        iconBadge.isUserInteractionEnabled = false
        iconBadge.translatesAutoresizingMaskIntoConstraints = false

        let iv = UIImageView(image: UIImage(systemName: mod.icon))
        iv.tintColor = colorFromHex(mod.tintHex)
        iv.contentMode = .scaleAspectFit
        iv.translatesAutoresizingMaskIntoConstraints = false
        iconBadge.addSubview(iv)

        NSLayoutConstraint.activate([
            iconBadge.widthAnchor.constraint(equalToConstant: 30),
            iconBadge.heightAnchor.constraint(equalToConstant: 30),
            iv.centerXAnchor.constraint(equalTo: iconBadge.centerXAnchor),
            iv.centerYAnchor.constraint(equalTo: iconBadge.centerYAnchor),
            iv.widthAnchor.constraint(equalToConstant: 16),
            iv.heightAnchor.constraint(equalToConstant: 16),
        ])

        let lbl = UILabel()
        lbl.text = mod.name
        lbl.font = .systemFont(ofSize: 12, weight: .bold)
        lbl.textColor = UIColor(red: 0.059, green: 0.090, blue: 0.165, alpha: 1)
        lbl.isUserInteractionEnabled = false

        let row = UIStackView(arrangedSubviews: [iconBadge, lbl])
        row.axis = .horizontal
        row.spacing = 8
        row.alignment = .center
        row.isUserInteractionEnabled = false
        row.translatesAutoresizingMaskIntoConstraints = false
        btn.addSubview(row)

        NSLayoutConstraint.activate([
            row.leadingAnchor.constraint(equalTo: btn.leadingAnchor, constant: 8),
            row.trailingAnchor.constraint(equalTo: btn.trailingAnchor, constant: -12),
            row.centerYAnchor.constraint(equalTo: btn.centerYAnchor),
        ])

        btn.addTarget(self, action: #selector(modTapped(_:)), for: .touchUpInside)
        return btn
    }

    private func createCategoryHeader(title: String) -> UILabel {
        let l = UILabel()
        l.text = title
        l.font = .systemFont(ofSize: 11.5, weight: .bold)
        l.textColor = UIColor(red: 0.392, green: 0.455, blue: 0.545, alpha: 1)
        return l
    }

    private func createGridRows(modules: [SheetModule]) -> UIStackView {
        let vStack = UIStackView()
        vStack.axis = .vertical
        vStack.spacing = 10

        let chunks = stride(from: 0, to: modules.count, by: 4).map {
            Array(modules[$0..<min($0 + 4, modules.count)])
        }

        for chunk in chunks {
            let hStack = UIStackView()
            hStack.axis = .horizontal
            hStack.distribution = .fillEqually
            hStack.spacing = 8
            for mod in chunk {
                hStack.addArrangedSubview(createModuleBox(mod))
            }
            while hStack.arrangedSubviews.count < 4 {
                let spacer = UIView()
                hStack.addArrangedSubview(spacer)
            }
            vStack.addArrangedSubview(hStack)
        }
        return vStack
    }

    private func createModuleBox(_ mod: SheetModule) -> UIView {
        let btn = UIButton(type: .custom)
        btn.backgroundColor = .white
        btn.layer.cornerRadius = 16
        btn.layer.borderWidth = 1
        btn.layer.borderColor = UIColor(red: 0.886, green: 0.910, blue: 0.941, alpha: 1).cgColor
        btn.layer.shadowColor = UIColor.black.cgColor
        btn.layer.shadowOpacity = 0.03
        btn.layer.shadowRadius = 4
        btn.layer.shadowOffset = CGSize(width: 0, height: 1)
        btn.accessibilityIdentifier = mod.path

        let iconBadge = UIView()
        iconBadge.backgroundColor = colorFromHex(mod.bgHex)
        iconBadge.layer.cornerRadius = 14
        iconBadge.isUserInteractionEnabled = false
        iconBadge.translatesAutoresizingMaskIntoConstraints = false

        let iconView = UIImageView(image: UIImage(systemName: mod.icon))
        iconView.tintColor = colorFromHex(mod.tintHex)
        iconView.contentMode = .scaleAspectFit
        iconView.translatesAutoresizingMaskIntoConstraints = false
        iconBadge.addSubview(iconView)

        NSLayoutConstraint.activate([
            iconBadge.widthAnchor.constraint(equalToConstant: 44),
            iconBadge.heightAnchor.constraint(equalToConstant: 44),
            iconView.centerXAnchor.constraint(equalTo: iconBadge.centerXAnchor),
            iconView.centerYAnchor.constraint(equalTo: iconBadge.centerYAnchor),
            iconView.widthAnchor.constraint(equalToConstant: 22),
            iconView.heightAnchor.constraint(equalToConstant: 22),
        ])

        let nameLabel = UILabel()
        nameLabel.text = mod.name
        nameLabel.font = .systemFont(ofSize: 12, weight: .bold)
        nameLabel.textColor = UIColor(red: 0.059, green: 0.090, blue: 0.165, alpha: 1)
        nameLabel.textAlignment = .center
        nameLabel.isUserInteractionEnabled = false

        let col = UIStackView(arrangedSubviews: [iconBadge, nameLabel])
        col.axis = .vertical
        col.spacing = 6
        col.alignment = .center
        col.isUserInteractionEnabled = false
        col.translatesAutoresizingMaskIntoConstraints = false
        btn.addSubview(col)

        NSLayoutConstraint.activate([
            btn.heightAnchor.constraint(equalToConstant: 86),
            col.centerXAnchor.constraint(equalTo: btn.centerXAnchor),
            col.centerYAnchor.constraint(equalTo: btn.centerYAnchor),
        ])

        btn.addTarget(self, action: #selector(modTapped(_:)), for: .touchUpInside)
        return btn
    }

    @objc private func modTapped(_ sender: UIButton) {
        guard let path = sender.accessibilityIdentifier else { return }
        recordRecent(path)
        dismiss(animated: true) { [weak self] in
            self?.onNavigate?(path)
        }
    }

    private func getRecentModules() -> [SheetModule] {
        if let data = UserDefaults.standard.data(forKey: "recent_modules_ios"),
           let list = try? JSONDecoder().decode([SheetModule].self, from: data), !list.isEmpty {
            return list
        }
        return defaultRecents
    }

    private func recordRecent(_ path: String) {
        var all = clinicalModules + advancedModules
        guard let matched = all.first(where: { $0.path == path }) else { return }
        var current = getRecentModules().filter { $0.path != path }
        current.insert(matched, at: 0)
        if current.count > 6 { current = Array(current.prefix(6)) }
        if let data = try? JSONEncoder().encode(current) {
            UserDefaults.standard.set(data, forKey: "recent_modules_ios")
        }
    }

    @objc private func closeTapped() {
        dismiss(animated: true, completion: nil)
    }

    private func colorFromHex(_ hex: String) -> UIColor {
        var cString = hex.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
        if cString.hasPrefix("#") { cString.remove(at: cString.startIndex) }
        var rgbValue: UInt64 = 0
        Scanner(string: cString).scanHexInt64(&rgbValue)
        return UIColor(
            red: CGFloat((rgbValue & 0xFF0000) >> 16) / 255.0,
            green: CGFloat((rgbValue & 0x00FF00) >> 8) / 255.0,
            blue: CGFloat(rgbValue & 0x0000FF) / 255.0,
            alpha: 1.0
        )
    }
}
