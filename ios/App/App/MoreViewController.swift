import UIKit

protocol MoreViewControllerDelegate: AnyObject {
    func didSelectModule(path: String)
    func didTapSignOut()
}

class MoreViewController: UIViewController {

    weak var delegate: MoreViewControllerDelegate?

    private let scrollView = UIScrollView()
    private let contentView = UIView()

    // needsRefresh: set to true when usage/badge state changes so we only
    // re-render when necessary, preventing jank on every tab switch.
    private var needsRefresh = true
    
    // Category Stacks & Headers matching web application groups
    private let stackOverview = UIStackView()
    private let stackClinical = UIStackView()
    private let stackRadiology = UIStackView()
    private let stackLogistics = UIStackView()
    private let stackMachine = UIStackView()
    private let stackB2B = UIStackView()
    private let stackAdmin = UIStackView()
    private let stackLegal = UIStackView()
    
    private let lblOverviewHeader = UILabel()
    private let lblClinicalHeader = UILabel()
    private let lblRadiologyHeader = UILabel()
    private let lblLogisticsHeader = UILabel()
    private let lblMachineHeader = UILabel()
    private let lblB2BHeader = UILabel()
    private let lblAdminHeader = UILabel()
    private let lblLegalHeader = UILabel()
    
    // Sign Out Button
    private let btnSignOut = UIButton(type: .system)

    private let lblSheetTitle = UILabel()

    private var allModules: [ModuleItem] = []
    
    var isDarkMode = false

    func applyTheme(isDark: Bool) {
        isDarkMode = isDark
        
        view.backgroundColor = isDark ? UIColor(red: 15/255, green: 23/255, blue: 42/255, alpha: 1) : UIColor(red: 248/255, green: 250/255, blue: 252/255, alpha: 1)
        lblSheetTitle.textColor = isDark ? .white : UIColor(red: 15/255, green: 23/255, blue: 42/255, alpha: 1)
        
        let headers = [lblOverviewHeader, lblClinicalHeader, lblRadiologyHeader, lblLogisticsHeader, lblMachineHeader, lblB2BHeader, lblAdminHeader, lblLegalHeader]
        for header in headers {
            header.textColor = isDark ? UIColor(red: 129/255, green: 140/255, blue: 248/255, alpha: 1) : UIColor(red: 67/255, green: 56/255, blue: 202/255, alpha: 1)
        }
        
        renderModules()
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = isDarkMode ? UIColor(red: 15/255, green: 23/255, blue: 42/255, alpha: 1) : UIColor(red: 248/255, green: 250/255, blue: 252/255, alpha: 1)
        initModulesData()
        setupUI()
        renderModules()
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        guard needsRefresh else { return }
        needsRefresh = false
        renderModules()
    }


    private func setupUI() {
        scrollView.translatesAutoresizingMaskIntoConstraints = false
        contentView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(scrollView)
        scrollView.addSubview(contentView)

        NSLayoutConstraint.activate([
            scrollView.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            scrollView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            scrollView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            scrollView.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor),

            contentView.topAnchor.constraint(equalTo: scrollView.topAnchor),
            contentView.leadingAnchor.constraint(equalTo: scrollView.leadingAnchor),
            contentView.trailingAnchor.constraint(equalTo: scrollView.trailingAnchor),
            contentView.bottomAnchor.constraint(equalTo: scrollView.bottomAnchor),
            contentView.widthAnchor.constraint(equalTo: scrollView.widthAnchor)
        ])

        // Setup Category Stacks & Headers
        setupCategoryStack(stack: stackOverview, header: lblOverviewHeader, title: "OVERVIEW")
        setupCategoryStack(stack: stackClinical, header: lblClinicalHeader, title: "CLINICAL OPERATIONS")
        setupCategoryStack(stack: stackRadiology, header: lblRadiologyHeader, title: "RADIOLOGY (RIS)")
        setupCategoryStack(stack: stackLogistics, header: lblLogisticsHeader, title: "RESOURCES & LOGISTICS")
        setupCategoryStack(stack: stackMachine, header: lblMachineHeader, title: "MACHINE & AI")
        setupCategoryStack(stack: stackB2B, header: lblB2BHeader, title: "B2B & GROWTH")
        setupCategoryStack(stack: stackAdmin, header: lblAdminHeader, title: "ADMINISTRATION")
        setupCategoryStack(stack: stackLegal, header: lblLegalHeader, title: "LEGAL & POLICIES")

        // Sheet Title
        lblSheetTitle.text = "More Settings"
        lblSheetTitle.textColor = isDarkMode ? .white : UIColor(red: 15/255, green: 23/255, blue: 42/255, alpha: 1)
        lblSheetTitle.font = .systemFont(ofSize: 22, weight: .bold)
        lblSheetTitle.translatesAutoresizingMaskIntoConstraints = false
        contentView.addSubview(lblSheetTitle)

        // Sign Out Button
        btnSignOut.setTitle("Sign Out", for: .normal)
        btnSignOut.setTitleColor(.white, for: .normal)
        btnSignOut.backgroundColor = UIColor(red: 124/255, green: 58/255, blue: 237/255, alpha: 1.0)
        btnSignOut.layer.cornerRadius = 14
        btnSignOut.titleLabel?.font = .systemFont(ofSize: 16, weight: .bold)
        btnSignOut.translatesAutoresizingMaskIntoConstraints = false
        btnSignOut.addTarget(self, action: #selector(logoutTapped), for: .touchUpInside)
        contentView.addSubview(btnSignOut)

        // Auto Layout Constraints for Stacks and Headers (Stacked vertically)
        NSLayoutConstraint.activate([
            lblSheetTitle.topAnchor.constraint(equalTo: contentView.topAnchor, constant: 20),
            lblSheetTitle.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 16),

            lblOverviewHeader.topAnchor.constraint(equalTo: lblSheetTitle.bottomAnchor, constant: 24),
            lblOverviewHeader.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 16),
            stackOverview.topAnchor.constraint(equalTo: lblOverviewHeader.bottomAnchor, constant: 8),
            stackOverview.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 16),
            stackOverview.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -16),

            lblClinicalHeader.topAnchor.constraint(equalTo: stackOverview.bottomAnchor, constant: 20),
            lblClinicalHeader.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 16),
            stackClinical.topAnchor.constraint(equalTo: lblClinicalHeader.bottomAnchor, constant: 8),
            stackClinical.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 16),
            stackClinical.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -16),

            lblRadiologyHeader.topAnchor.constraint(equalTo: stackClinical.bottomAnchor, constant: 20),
            lblRadiologyHeader.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 16),
            stackRadiology.topAnchor.constraint(equalTo: lblRadiologyHeader.bottomAnchor, constant: 8),
            stackRadiology.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 16),
            stackRadiology.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -16),

            lblLogisticsHeader.topAnchor.constraint(equalTo: stackRadiology.bottomAnchor, constant: 20),
            lblLogisticsHeader.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 16),
            stackLogistics.topAnchor.constraint(equalTo: lblLogisticsHeader.bottomAnchor, constant: 8),
            stackLogistics.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 16),
            stackLogistics.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -16),

            lblMachineHeader.topAnchor.constraint(equalTo: stackLogistics.bottomAnchor, constant: 20),
            lblMachineHeader.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 16),
            stackMachine.topAnchor.constraint(equalTo: lblMachineHeader.bottomAnchor, constant: 8),
            stackMachine.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 16),
            stackMachine.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -16),

            lblB2BHeader.topAnchor.constraint(equalTo: stackMachine.bottomAnchor, constant: 20),
            lblB2BHeader.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 16),
            stackB2B.topAnchor.constraint(equalTo: lblB2BHeader.bottomAnchor, constant: 8),
            stackB2B.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 16),
            stackB2B.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -16),

            lblAdminHeader.topAnchor.constraint(equalTo: stackB2B.bottomAnchor, constant: 20),
            lblAdminHeader.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 16),
            stackAdmin.topAnchor.constraint(equalTo: lblAdminHeader.bottomAnchor, constant: 8),
            stackAdmin.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 16),
            stackAdmin.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -16),

            lblLegalHeader.topAnchor.constraint(equalTo: stackAdmin.bottomAnchor, constant: 20),
            lblLegalHeader.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 16),
            stackLegal.topAnchor.constraint(equalTo: lblLegalHeader.bottomAnchor, constant: 8),
            stackLegal.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 16),
            stackLegal.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -16),

            btnSignOut.topAnchor.constraint(equalTo: stackLegal.bottomAnchor, constant: 28),
            btnSignOut.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 16),
            btnSignOut.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -16),
            btnSignOut.heightAnchor.constraint(equalToConstant: 50),
            btnSignOut.bottomAnchor.constraint(equalTo: contentView.bottomAnchor, constant: -32)
        ])
    }

    private func setupCategoryStack(stack: UIStackView, header: UILabel, title: String) {
        header.text = title
        header.textColor = isDarkMode ? UIColor(red: 129/255, green: 140/255, blue: 248/255, alpha: 1) : UIColor(red: 67/255, green: 56/255, blue: 202/255, alpha: 1)
        header.font = .systemFont(ofSize: 12, weight: .bold)
        header.translatesAutoresizingMaskIntoConstraints = false
        contentView.addSubview(header)

        stack.axis = .vertical
        stack.spacing = 8
        stack.translatesAutoresizingMaskIntoConstraints = false
        contentView.addSubview(stack)
    }

    private func initModulesData() {
        allModules = [
            // Overview
            ModuleItem(title: "Financial Analytics", path: "/workspace/analytics", category: "Overview", desc: "View detailed revenue reports & analytical charts", icon: "chart.bar.fill", isNew: false),
            ModuleItem(title: "Online Booking", path: "/workspace/bookings", category: "Overview", desc: "Manage home collections & online appointments", icon: "calendar", isNew: false),

            // Clinical Operations
            ModuleItem(title: "Patient Registration", path: "/workspace/registration", category: "Clinical", desc: "Register patients & book new lab tests", icon: "person.badge.plus.fill", isNew: false),
            ModuleItem(title: "Appointments", path: "/workspace/appointments", category: "Clinical", desc: "Manage doctor appointments & home visits", icon: "calendar", isNew: false),
            ModuleItem(title: "Sample Accession", path: "/workspace/samples", category: "Clinical", desc: "Scan barcode & receive lab samples", icon: "barcode.viewfinder", isNew: false),
            ModuleItem(title: "Accession Desk", path: "/workspace/accession", category: "Clinical", desc: "Manage accession logs & verify collections", icon: "checkmark.seal.fill", isNew: false),
            ModuleItem(title: "Worklist & Results", path: "/workspace/results", category: "Clinical", desc: "Fill raw tests values & review parameters", icon: "doc.text.fill", isNew: false),
            ModuleItem(title: "Report Dispatch", path: "/workspace/reports", category: "Clinical", desc: "Sign off reports & dispatch PDF files", icon: "paperplane.fill", isNew: false),

            // Radiology (RIS)
            ModuleItem(title: "RIS Dashboard", path: "/workspace/radiology/dashboard", category: "Radiology", desc: "View radiology scans status & overview", icon: "square.grid.2x2.fill", isNew: false),
            ModuleItem(title: "Scan Schedule", path: "/workspace/radiology/appointments", category: "Radiology", desc: "Manage scan schedule & appointments", icon: "calendar", isNew: false),
            ModuleItem(title: "PACS Viewer", path: "/workspace/radiology/pacs", category: "Radiology", desc: "View medical DICOM images & files", icon: "photo.fill", isNew: false),
            ModuleItem(title: "Reporting Queue", path: "/workspace/radiology/reporting", category: "Radiology", desc: "Write reports & interpret diagnostic files", icon: "stethoscope", isNew: false),
            ModuleItem(title: "Machines", path: "/workspace/radiology/modalities", category: "Radiology", desc: "Manage imaging machines & setups", icon: "cpu", isNew: false),
            ModuleItem(title: "RIS Settings", path: "/workspace/radiology/settings/macros", category: "Radiology", desc: "Configure report templates & macro keys", icon: "gearshape.fill", isNew: false),

            // Resources & Logistics
            ModuleItem(title: "Inventory & Stock", path: "/workspace/inventory", category: "Logistics", desc: "Track reagents, consumption & items", icon: "shippingbox.fill", isNew: false),
            ModuleItem(title: "Logistics / Trips", path: "/workspace/logistics", category: "Logistics", desc: "Manage field agents & pickup trips", icon: "car.fill", isNew: false),

            // Machine & AI
            ModuleItem(title: "Analyzer", path: "/workspace/analyzers", category: "Machine", desc: "Connect analyzers & view output logs", icon: "cpu", isNew: false),
            ModuleItem(title: "Visual Mapper", path: "/workspace/analyzers/mapper", category: "Machine", desc: "Map barcode codes visually to fields", icon: "brain.fill", isNew: false),
            ModuleItem(title: "Mappings", path: "/workspace/analyzers/mappings", category: "Machine", desc: "Configure machine integration parameters", icon: "barcode.viewfinder", isNew: false),
            ModuleItem(title: "AI Analysis", path: "/workspace/analyzers/ai", category: "Machine", desc: "Leverage AI models on clinical samples", icon: "waveform.path.ecg", isNew: true),

            // B2B & Growth
            ModuleItem(title: "Referral Doctors", path: "/workspace/doctors", category: "B2B", desc: "Manage referral incentives & profiles", icon: "stethoscope", isNew: false),
            ModuleItem(title: "Corporate Agencies", path: "/workspace/agencies", category: "B2B", desc: "Manage corporate accounts & discounts", icon: "briefcase.fill", isNew: false),
            ModuleItem(title: "Commissions Payout", path: "/workspace/commissions", category: "B2B", desc: "Approve payouts & track growth metrics", icon: "doc.text.fill", isNew: false),
            ModuleItem(title: "B2B Settings", path: "/workspace/settings/b2b-tiers", category: "B2B", desc: "Configure corporate pricing tiers", icon: "shield.fill", isNew: false),

            // Administration
            ModuleItem(title: "Report Templates", path: "/workspace/settings/templates", category: "Admin", desc: "Configure letterheads, signatures & reports", icon: "rectangle.grid.2x2.fill", isNew: false),
            ModuleItem(title: "Staff Management", path: "/workspace/staff", category: "Admin", desc: "Manage pathologists, technicians & logins", icon: "person.2.fill", isNew: false),
            ModuleItem(title: "Invoices & Payments", path: "/workspace/billing", category: "Admin", desc: "Approve bills, invoices & receipts", icon: "dollarsign.circle.fill", isNew: false),
            ModuleItem(title: "Expenses", path: "/workspace/expenses", category: "Admin", desc: "Log daily office & operation expenses", icon: "list.bullet", isNew: false),
            ModuleItem(title: "Lab Settings", path: "/workspace/settings", category: "Admin", desc: "Update lab details & branch parameters", icon: "gearshape.fill", isNew: false),
            ModuleItem(title: "Audit Logs", path: "/workspace/audit-logs", category: "Admin", desc: "Monitor database changes & logs", icon: "clock.arrow.circlepath", isNew: false),
            ModuleItem(title: "Wallet & Billing", path: "/workspace/wallet", category: "Admin", desc: "Recharge clinical credits & print statements", icon: "creditcard.fill", isNew: false),
            ModuleItem(title: "Help & Support", path: "/workspace/support", category: "Admin", desc: "Submit tickets & read user guides", icon: "questionmark.circle.fill", isNew: false),
            
            // Legal & Policies
            ModuleItem(title: "Terms & Conditions", path: "/legal", category: "Legal", desc: "TestFlight Agreements & Software Licenses", icon: "doc.plaintext.fill", isNew: false)
        ]
    }

    private func renderModules() {
        stackOverview.arrangedSubviews.forEach { $0.removeFromSuperview() }
        stackClinical.arrangedSubviews.forEach { $0.removeFromSuperview() }
        stackRadiology.arrangedSubviews.forEach { $0.removeFromSuperview() }
        stackLogistics.arrangedSubviews.forEach { $0.removeFromSuperview() }
        stackMachine.arrangedSubviews.forEach { $0.removeFromSuperview() }
        stackB2B.arrangedSubviews.forEach { $0.removeFromSuperview() }
        stackAdmin.arrangedSubviews.forEach { $0.removeFromSuperview() }
        stackLegal.arrangedSubviews.forEach { $0.removeFromSuperview() }

        // Sort dynamically based on usage history (highest usage first)
        let sorted = allModules.sorted { m1, m2 in
            let count1 = UserDefaults.standard.integer(forKey: "usage_" + m1.path)
            let count2 = UserDefaults.standard.integer(forKey: "usage_" + m2.path)
            return count2 < count1
        }

        var overviewCount = 0
        var clinicalCount = 0
        var radiologyCount = 0
        var logisticsCount = 0
        var machineCount = 0
        var b2bCount = 0
        var adminCount = 0
        var legalCount = 0

        for item in sorted {
            let row = makeSettingRow(item: item)
            
            switch item.category {
            case "Overview":
                stackOverview.addArrangedSubview(row)
                overviewCount += 1
            case "Clinical":
                stackClinical.addArrangedSubview(row)
                clinicalCount += 1
            case "Radiology":
                stackRadiology.addArrangedSubview(row)
                radiologyCount += 1
            case "Logistics":
                stackLogistics.addArrangedSubview(row)
                logisticsCount += 1
            case "Machine":
                stackMachine.addArrangedSubview(row)
                machineCount += 1
            case "B2B":
                stackB2B.addArrangedSubview(row)
                b2bCount += 1
            case "Admin":
                stackAdmin.addArrangedSubview(row)
                adminCount += 1
            case "Legal":
                stackLegal.addArrangedSubview(row)
                legalCount += 1
            default:
                break
            }
        }

        lblOverviewHeader.isHidden = (overviewCount == 0)
        stackOverview.isHidden = (overviewCount == 0)

        lblClinicalHeader.isHidden = (clinicalCount == 0)
        stackClinical.isHidden = (clinicalCount == 0)

        lblRadiologyHeader.isHidden = (radiologyCount == 0)
        stackRadiology.isHidden = (radiologyCount == 0)

        lblLogisticsHeader.isHidden = (logisticsCount == 0)
        stackLogistics.isHidden = (logisticsCount == 0)

        lblMachineHeader.isHidden = (machineCount == 0)
        stackMachine.isHidden = (machineCount == 0)

        lblB2BHeader.isHidden = (b2bCount == 0)
        stackB2B.isHidden = (b2bCount == 0)

        lblAdminHeader.isHidden = (adminCount == 0)
        stackAdmin.isHidden = (adminCount == 0)

        lblLegalHeader.isHidden = (legalCount == 0)
        stackLegal.isHidden = (legalCount == 0)
    }

    private func makeSettingRow(item: ModuleItem) -> UIView {
        let row = UIButton(type: .system)
        row.backgroundColor = isDarkMode ? UIColor(red: 30/255, green: 41/255, blue: 59/255, alpha: 1) : .white
        row.layer.cornerRadius = 12
        row.layer.borderWidth = 1
        row.layer.borderColor = isDarkMode ? UIColor(red: 51/255, green: 65/255, blue: 85/255, alpha: 1).cgColor : UIColor(white: 0.9, alpha: 1).cgColor
        row.translatesAutoresizingMaskIntoConstraints = false
        row.heightAnchor.constraint(equalToConstant: 72).isActive = true

        let iconView = UIImageView(image: UIImage(systemName: item.icon))
        iconView.tintColor = isDarkMode ? UIColor(red: 129/255, green: 140/255, blue: 248/255, alpha: 1) : UIColor(red: 67/255, green: 56/255, blue: 202/255, alpha: 1)
        iconView.contentMode = .scaleAspectFit
        iconView.translatesAutoresizingMaskIntoConstraints = false
        row.addSubview(iconView)

        let lblTitle = UILabel()
        lblTitle.text = item.title
        lblTitle.font = .systemFont(ofSize: 15, weight: .bold)
        lblTitle.textColor = isDarkMode ? .white : UIColor(red: 15/255, green: 23/255, blue: 42/255, alpha: 1)
        lblTitle.translatesAutoresizingMaskIntoConstraints = false
        row.addSubview(lblTitle)

        let lblDesc = UILabel()
        lblDesc.text = item.desc
        lblDesc.font = .systemFont(ofSize: 12)
        lblDesc.textColor = isDarkMode ? UIColor(red: 148/255, green: 163/255, blue: 184/255, alpha: 1) : .gray
        lblDesc.translatesAutoresizingMaskIntoConstraints = false
        row.addSubview(lblDesc)

        let badge = UILabel()
        badge.text = "New"
        badge.textColor = .white
        badge.backgroundColor = UIColor(red: 245/255, green: 158/255, blue: 11/255, alpha: 1)
        badge.font = .systemFont(ofSize: 10, weight: .bold)
        badge.textAlignment = .center
        badge.layer.cornerRadius = 8
        badge.clipsToBounds = true
        badge.translatesAutoresizingMaskIntoConstraints = false
        row.addSubview(badge)

        let hasOpened = UserDefaults.standard.bool(forKey: "opened_" + item.path)
        badge.isHidden = !(item.isNew && !hasOpened)

        let arrow = UIImageView(image: UIImage(systemName: "chevron.right"))
        arrow.tintColor = isDarkMode ? UIColor(red: 100/255, green: 116/255, blue: 139/255, alpha: 1) : .lightGray
        arrow.translatesAutoresizingMaskIntoConstraints = false
        row.addSubview(arrow)

        NSLayoutConstraint.activate([
            iconView.leadingAnchor.constraint(equalTo: row.leadingAnchor, constant: 14),
            iconView.centerYAnchor.constraint(equalTo: row.centerYAnchor),
            iconView.widthAnchor.constraint(equalToConstant: 26),
            iconView.heightAnchor.constraint(equalToConstant: 26),

            lblTitle.topAnchor.constraint(equalTo: row.topAnchor, constant: 14),
            lblTitle.leadingAnchor.constraint(equalTo: iconView.trailingAnchor, constant: 14),

            badge.leadingAnchor.constraint(equalTo: lblTitle.trailingAnchor, constant: 8),
            badge.centerYAnchor.constraint(equalTo: lblTitle.centerYAnchor),
            badge.widthAnchor.constraint(equalToConstant: 38),
            badge.heightAnchor.constraint(equalToConstant: 18),

            lblDesc.topAnchor.constraint(equalTo: lblTitle.bottomAnchor, constant: 4),
            lblDesc.leadingAnchor.constraint(equalTo: iconView.trailingAnchor, constant: 14),
            lblDesc.trailingAnchor.constraint(equalTo: arrow.leadingAnchor, constant: -8),

            arrow.trailingAnchor.constraint(equalTo: row.trailingAnchor, constant: -14),
            arrow.centerYAnchor.constraint(equalTo: row.centerYAnchor),
            arrow.widthAnchor.constraint(equalToConstant: 12),
            arrow.heightAnchor.constraint(equalToConstant: 18)
        ])

        row.addTarget(self, action: #selector(rowTapped(_:)), for: .touchUpInside)
        row.accessibilityIdentifier = item.path

        return row
    }

    @objc private func rowTapped(_ sender: UIButton) {
        guard let path = sender.accessibilityIdentifier else { return }
        
        let usage = UserDefaults.standard.integer(forKey: "usage_" + path)
        UserDefaults.standard.set(usage + 1, forKey: "usage_" + path)
        UserDefaults.standard.set(true, forKey: "opened_" + path)
        // Mark refresh needed so next appearance re-sorts by updated usage counts
        needsRefresh = true

        if path == "/legal" {
            let legalVC = LegalViewController()
            let nav = UINavigationController(rootViewController: legalVC)
            present(nav, animated: true, completion: nil)
            return
        }

        delegate?.didSelectModule(path: path)
    }

    @objc private func logoutTapped() {
        let alert = UIAlertController(title: "Sign Out", message: "Are you sure you want to sign out?", preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "Sign Out", style: .destructive, handler: { [weak self] _ in
            self?.delegate?.didTapSignOut()
        }))
        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel, handler: nil))
        present(alert, animated: true)
    }

    private struct ModuleItem {
        let title: String
        let path: String
        let category: String
        let desc: String
        let icon: String
        let isNew: Bool
    }
}
