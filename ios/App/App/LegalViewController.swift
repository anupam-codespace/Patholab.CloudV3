import UIKit

// MARK: – Legal Section Model
struct LegalClause {
    let id: String
    let title: String
    let badge: String
    let summary: String?
    let content: String
    let isKeyHighlight: Bool
}

struct LegalCategory {
    let title: String
    let iconName: String
    let lastUpdated: String
    let clauses: [LegalClause]
}

class LegalViewController: UIViewController, UISearchBarDelegate, UITableViewDataSource, UITableViewDelegate {
    var isDarkMode = false

    // MARK: – UI Elements
    private let navHeaderView = UIView()
    private let btnBack = UIButton(type: .system)
    private let btnShare = UIButton(type: .system)
    private let lblNavTitle = UILabel()
    
    private let heroContainer = UIView()
    private let lblHeroTitle = UILabel()
    private let lblHeroSubtitle = UILabel()
    private let badgeCompany = UIView()
    private let lblBadgeCompany = UILabel()
    
    private let searchBar = UISearchBar()
    private let tabSegmentControl = UISegmentedControl(items: ["Terms", "Privacy", "Refunds", "Store"])
    
    private let tableView = UITableView(frame: .zero, style: .insetGrouped)
    
    // MARK: – Data
    var initialTabIndex = 0
    private var allCategories: [LegalCategory] = []
    private var filteredClauses: [LegalClause] = []
    private var currentTabIndex = 0
    private var searchQuery = ""

    override func viewDidLoad() {
        super.viewDidLoad()
        setupThemeColors()
        setupLegalData()
        if initialTabIndex >= 0 && initialTabIndex < 4 {
            currentTabIndex = initialTabIndex
            tabSegmentControl.selectedSegmentIndex = initialTabIndex
        }
        setupNavigationHeader()
        setupHeroBanner()
        setupTabsAndSearch()
        setupTableView()
        updateFilteredData()
    }

    override var preferredStatusBarStyle: UIStatusBarStyle {
        return .lightContent
    }

    // MARK: – Theme & Colors
    private var primaryColor: UIColor {
        return UIColor(red: 67/255, green: 56/255, blue: 202/255, alpha: 1) // #4338CA Indigo-700
    }
    
    private var bgColor: UIColor {
        return isDarkMode ? UIColor(red: 15/255, green: 23/255, blue: 42/255, alpha: 1) : UIColor(red: 248/255, green: 250/255, blue: 252/255, alpha: 1) // Slate-900 / Slate-50
    }
    
    private var cardBgColor: UIColor {
        return isDarkMode ? UIColor(red: 30/255, green: 41/255, blue: 59/255, alpha: 1) : UIColor.white
    }
    
    private var textPrimaryColor: UIColor {
        return isDarkMode ? UIColor.white : UIColor(red: 15/255, green: 23/255, blue: 42/255, alpha: 1)
    }
    
    private var textSecondaryColor: UIColor {
        return isDarkMode ? UIColor(red: 148/255, green: 163/255, blue: 184/255, alpha: 1) : UIColor(red: 71/255, green: 85/255, blue: 105/255, alpha: 1)
    }

    private func setupThemeColors() {
        view.backgroundColor = bgColor
        navigationController?.setNavigationBarHidden(true, animated: false)
    }

    // MARK: – Navigation Bar
    private func setupNavigationHeader() {
        navHeaderView.backgroundColor = primaryColor
        navHeaderView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(navHeaderView)

        btnBack.setImage(UIImage(systemName: "chevron.left", withConfiguration: UIImage.SymbolConfiguration(pointSize: 16, weight: .bold)), for: .normal)
        btnBack.tintColor = .white
        btnBack.backgroundColor = UIColor.white.withAlphaComponent(0.15)
        btnBack.layer.cornerRadius = 18
        btnBack.clipsToBounds = true
        btnBack.translatesAutoresizingMaskIntoConstraints = false
        btnBack.addTarget(self, action: #selector(closeTapped), for: .touchUpInside)
        navHeaderView.addSubview(btnBack)

        lblNavTitle.text = "Legal & Compliance"
        lblNavTitle.font = UIFont.systemFont(ofSize: 17, weight: .bold)
        lblNavTitle.textColor = .white
        lblNavTitle.textAlignment = .center
        lblNavTitle.translatesAutoresizingMaskIntoConstraints = false
        navHeaderView.addSubview(lblNavTitle)

        btnShare.setImage(UIImage(systemName: "square.and.arrow.up", withConfiguration: UIImage.SymbolConfiguration(pointSize: 15, weight: .semibold)), for: .normal)
        btnShare.tintColor = .white
        btnShare.backgroundColor = UIColor.white.withAlphaComponent(0.15)
        btnShare.layer.cornerRadius = 18
        btnShare.clipsToBounds = true
        btnShare.translatesAutoresizingMaskIntoConstraints = false
        btnShare.addTarget(self, action: #selector(shareTapped), for: .touchUpInside)
        navHeaderView.addSubview(btnShare)

        NSLayoutConstraint.activate([
            navHeaderView.topAnchor.constraint(equalTo: view.topAnchor),
            navHeaderView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            navHeaderView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            navHeaderView.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 50),

            btnBack.leadingAnchor.constraint(equalTo: navHeaderView.leadingAnchor, constant: 16),
            btnBack.bottomAnchor.constraint(equalTo: navHeaderView.bottomAnchor, constant: -8),
            btnBack.widthAnchor.constraint(equalToConstant: 36),
            btnBack.heightAnchor.constraint(equalToConstant: 36),

            lblNavTitle.centerXAnchor.constraint(equalTo: navHeaderView.centerXAnchor),
            lblNavTitle.centerYAnchor.constraint(equalTo: btnBack.centerYAnchor),

            btnShare.trailingAnchor.constraint(equalTo: navHeaderView.trailingAnchor, constant: -16),
            btnShare.centerYAnchor.constraint(equalTo: btnBack.centerYAnchor),
            btnShare.widthAnchor.constraint(equalToConstant: 36),
            btnShare.heightAnchor.constraint(equalToConstant: 36),
        ])
    }

    // MARK: – Hero Header Banner
    private func setupHeroBanner() {
        heroContainer.backgroundColor = primaryColor
        heroContainer.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(heroContainer)

        badgeCompany.backgroundColor = UIColor(red: 99/255, green: 102/255, blue: 241/255, alpha: 0.4)
        badgeCompany.layer.cornerRadius = 12
        badgeCompany.clipsToBounds = true
        badgeCompany.translatesAutoresizingMaskIntoConstraints = false
        heroContainer.addSubview(badgeCompany)

        lblBadgeCompany.text = "GLOBIZHUB INDIA PVT. LTD. • CIN: U74999KA2019PTC120377"
        lblBadgeCompany.font = UIFont.systemFont(ofSize: 10.5, weight: .bold)
        lblBadgeCompany.textColor = UIColor(red: 224/255, green: 231/255, blue: 255/255, alpha: 1)
        lblBadgeCompany.translatesAutoresizingMaskIntoConstraints = false
        badgeCompany.addSubview(lblBadgeCompany)

        lblHeroTitle.text = "Terms & Policies"
        lblHeroTitle.font = UIFont.systemFont(ofSize: 22, weight: .heavy)
        lblHeroTitle.textColor = .white
        lblHeroTitle.translatesAutoresizingMaskIntoConstraints = false
        heroContainer.addSubview(lblHeroTitle)

        lblHeroSubtitle.text = "Transparent agreements governing Patholab Cloud services, patient data security, subscriptions, and compliance."
        lblHeroSubtitle.font = UIFont.systemFont(ofSize: 13, weight: .regular)
        lblHeroSubtitle.textColor = UIColor(red: 199/255, green: 210/255, blue: 254/255, alpha: 1)
        lblHeroSubtitle.numberOfLines = 0
        lblHeroSubtitle.translatesAutoresizingMaskIntoConstraints = false
        heroContainer.addSubview(lblHeroSubtitle)

        NSLayoutConstraint.activate([
            heroContainer.topAnchor.constraint(equalTo: navHeaderView.bottomAnchor),
            heroContainer.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            heroContainer.trailingAnchor.constraint(equalTo: view.trailingAnchor),

            badgeCompany.topAnchor.constraint(equalTo: heroContainer.topAnchor, constant: 4),
            badgeCompany.leadingAnchor.constraint(equalTo: heroContainer.leadingAnchor, constant: 16),
            badgeCompany.heightAnchor.constraint(equalToConstant: 24),

            lblBadgeCompany.leadingAnchor.constraint(equalTo: badgeCompany.leadingAnchor, constant: 8),
            lblBadgeCompany.trailingAnchor.constraint(equalTo: badgeCompany.trailingAnchor, constant: -8),
            lblBadgeCompany.centerYAnchor.constraint(equalTo: badgeCompany.centerYAnchor),

            lblHeroTitle.topAnchor.constraint(equalTo: badgeCompany.bottomAnchor, constant: 8),
            lblHeroTitle.leadingAnchor.constraint(equalTo: heroContainer.leadingAnchor, constant: 16),
            lblHeroTitle.trailingAnchor.constraint(equalTo: heroContainer.trailingAnchor, constant: -16),

            lblHeroSubtitle.topAnchor.constraint(equalTo: lblHeroTitle.bottomAnchor, constant: 4),
            lblHeroSubtitle.leadingAnchor.constraint(equalTo: heroContainer.leadingAnchor, constant: 16),
            lblHeroSubtitle.trailingAnchor.constraint(equalTo: heroContainer.trailingAnchor, constant: -16),
            lblHeroSubtitle.bottomAnchor.constraint(equalTo: heroContainer.bottomAnchor, constant: -14)
        ])
    }

    // MARK: – Tabs & Search
    private func setupTabsAndSearch() {
        tabSegmentControl.selectedSegmentIndex = 0
        tabSegmentControl.backgroundColor = isDarkMode ? UIColor(red: 30/255, green: 41/255, blue: 59/255, alpha: 1) : UIColor(red: 226/255, green: 232/255, blue: 240/255, alpha: 1)
        tabSegmentControl.selectedSegmentTintColor = primaryColor
        tabSegmentControl.setTitleTextAttributes([.foregroundColor: UIColor.white, .font: UIFont.systemFont(ofSize: 13, weight: .bold)], for: .selected)
        tabSegmentControl.setTitleTextAttributes([.foregroundColor: isDarkMode ? UIColor(red: 148/255, green: 163/255, blue: 184/255, alpha: 1) : UIColor(red: 71/255, green: 85/255, blue: 105/255, alpha: 1), .font: UIFont.systemFont(ofSize: 13, weight: .semibold)], for: .normal)
        tabSegmentControl.translatesAutoresizingMaskIntoConstraints = false
        tabSegmentControl.addTarget(self, action: #selector(tabChanged(_:)), for: .valueChanged)
        view.addSubview(tabSegmentControl)

        searchBar.placeholder = "Search clauses (e.g. data, refund, license)..."
        searchBar.delegate = self
        searchBar.searchBarStyle = .minimal
        searchBar.searchTextField.backgroundColor = isDarkMode ? UIColor(red: 30/255, green: 41/255, blue: 59/255, alpha: 1) : UIColor.white
        searchBar.searchTextField.textColor = textPrimaryColor
        searchBar.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(searchBar)

        NSLayoutConstraint.activate([
            tabSegmentControl.topAnchor.constraint(equalTo: heroContainer.bottomAnchor, constant: 12),
            tabSegmentControl.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 16),
            tabSegmentControl.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -16),
            tabSegmentControl.heightAnchor.constraint(equalToConstant: 36),

            searchBar.topAnchor.constraint(equalTo: tabSegmentControl.bottomAnchor, constant: 6),
            searchBar.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 8),
            searchBar.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -8),
            searchBar.heightAnchor.constraint(equalToConstant: 44)
        ])
    }

    // MARK: – Table View
    private func setupTableView() {
        tableView.dataSource = self
        tableView.delegate = self
        tableView.backgroundColor = .clear
        tableView.separatorStyle = .none
        tableView.showsVerticalScrollIndicator = true
        tableView.translatesAutoresizingMaskIntoConstraints = false
        tableView.register(LegalClauseCell.self, forCellReuseIdentifier: "LegalClauseCell")
        tableView.register(LegalHeaderCell.self, forCellReuseIdentifier: "LegalHeaderCell")
        tableView.register(LegalContactCell.self, forCellReuseIdentifier: "LegalContactCell")
        view.addSubview(tableView)

        NSLayoutConstraint.activate([
            tableView.topAnchor.constraint(equalTo: searchBar.bottomAnchor, constant: 2),
            tableView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            tableView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            tableView.bottomAnchor.constraint(equalTo: view.bottomAnchor)
        ])
    }

    // MARK: – Data Filtering
    private func updateFilteredData() {
        guard currentTabIndex < allCategories.count else { return }
        let currentCategory = allCategories[currentTabIndex]
        
        if searchQuery.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            filteredClauses = currentCategory.clauses
        } else {
            let q = searchQuery.lowercased()
            filteredClauses = currentCategory.clauses.filter { clause in
                clause.title.lowercased().contains(q) ||
                clause.content.lowercased().contains(q) ||
                (clause.summary?.lowercased().contains(q) ?? false) ||
                clause.badge.lowercased().contains(q)
            }
        }
        tableView.reloadData()
    }

    @objc private func tabChanged(_ sender: UISegmentedControl) {
        AppHaptics.selection()
        currentTabIndex = sender.selectedSegmentIndex
        
        UIView.transition(with: tableView, duration: 0.22, options: [.transitionCrossDissolve, .allowUserInteraction], animations: {
            self.updateFilteredData()
        }) { _ in
            if !self.filteredClauses.isEmpty {
                self.tableView.scrollToRow(at: IndexPath(row: 0, section: 0), at: .top, animated: false)
            }
        }
    }

    // MARK: – SearchBar Delegate
    func searchBar(_ searchBar: UISearchBar, textDidChange searchText: String) {
        if !searchText.isEmpty {
            AppHaptics.lightImpact()
        }
        searchQuery = searchText
        updateFilteredData()
    }

    func searchBarSearchButtonClicked(_ searchBar: UISearchBar) {
        searchBar.resignFirstResponder()
    }

    // MARK: – TableView DataSource & Delegate
    func numberOfSections(in tableView: UITableView) -> Int {
        return 3 // Section 0: Category Info, Section 1: Clauses, Section 2: Contact & Grievance
    }

    func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        if section == 0 {
            return 1
        } else if section == 1 {
            return filteredClauses.count
        } else {
            return 1 // Contact Card
        }
    }

    func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        if indexPath.section == 0 {
            let cell = tableView.dequeueReusableCell(withIdentifier: "LegalHeaderCell", for: indexPath) as! LegalHeaderCell
            let cat = allCategories[currentTabIndex]
            cell.configure(category: cat, isDarkMode: isDarkMode, resultCount: filteredClauses.count)
            return cell
        } else if indexPath.section == 1 {
            let cell = tableView.dequeueReusableCell(withIdentifier: "LegalClauseCell", for: indexPath) as! LegalClauseCell
            let clause = filteredClauses[indexPath.row]
            cell.configure(clause: clause, isDarkMode: isDarkMode, primaryColor: primaryColor)
            return cell
        } else {
            let cell = tableView.dequeueReusableCell(withIdentifier: "LegalContactCell", for: indexPath) as! LegalContactCell
            cell.configure(isDarkMode: isDarkMode, primaryColor: primaryColor)
            return cell
        }
    }

    func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        tableView.deselectRow(at: indexPath, animated: true)
        if indexPath.section == 1 {
            AppHaptics.lightImpact()
            if let cell = tableView.cellForRow(at: indexPath) as? LegalClauseCell {
                cell.triggerCardBounce()
            }
        }
    }

    // MARK: – Actions
    @objc private func closeTapped() {
        AppHaptics.lightImpact()
        dismiss(animated: true, completion: nil)
    }

    @objc private func shareTapped() {
        AppHaptics.mediumImpact()
        let cat = allCategories[currentTabIndex]
        var shareText = "Patholab Cloud – \(cat.title)\nGlobizhub India Pvt. Ltd. (CIN: U74999KA2019PTC120377)\nLast Updated: \(cat.lastUpdated)\n\n"
        for clause in cat.clauses {
            shareText += "[\(clause.badge)] \(clause.title)\n\(clause.content)\n\n"
        }
        shareText += "Official Website: https://patholab.cloud | Support: legal@patholab.cloud"

        let activityVC = UIActivityViewController(activityItems: [shareText], applicationActivities: nil)
        if let popover = activityVC.popoverPresentationController {
            popover.sourceView = btnShare
        }
        present(activityVC, animated: true, completion: nil)
    }

    // MARK: – Legal Content Dataset
    private func setupLegalData() {
        // 1. Terms of Service
        let termsClauses: [LegalClause] = [
            LegalClause(
                id: "tos-1",
                title: "1. Grant of License & Usage Scope",
                badge: "License",
                summary: "Grants authorized laboratory staff and pathologists a non-exclusive license to use the cloud platform.",
                content: "Globizhub India Private Limited (\"Globizhub\", \"Licensor\") grants you (\"Licensee\", \"Customer\") a fixed-term, non-exclusive, non-transferable, revocable, and limited license to access and use the Patholab Cloud platform strictly for clinical laboratory operations, sample management, diagnostic reporting, and administrative workflows in accordance with the registered subscription order.",
                isKeyHighlight: false
            ),
            LegalClause(
                id: "tos-2",
                title: "2. Customer Data & Report Ownership",
                badge: "Data Ownership",
                summary: "You retain 100% full ownership over all patient records, medical reports, test results, and laboratory documents.",
                content: "All medical reports, patient demographics, clinical notes, doctor signatures, and billing invoices generated by or uploaded by the Licensee remain the sole and exclusive intellectual property of the Licensee. Licensor claims no ownership rights over clinical data and processes data exclusively to provide the platform functionality.",
                isKeyHighlight: true
            ),
            LegalClause(
                id: "tos-3",
                title: "3. Account Security & User Credentials",
                badge: "Security",
                summary: "Laboratories are responsible for managing staff logins, role access, and keeping credentials safe.",
                content: "The laboratory administrator is responsible for issuing, configuring, and revoking user credentials for phlebotomists, lab technicians, receptionists, and reporting doctors. The Licensee shall immediately report any unauthorized access or suspected credential compromise to security@patholab.cloud.",
                isKeyHighlight: false
            ),
            LegalClause(
                id: "tos-4",
                title: "4. Service Level & Uptime Commitments",
                badge: "Uptime SLA",
                summary: "Designed for high-availability 99.9% uptime with automated redundant cloud backups.",
                content: "Patholab Cloud is hosted on high-availability cloud infrastructure with continuous database replication, automated daily backups, and SSL/TLS 256-bit encryption for all data in transit and at rest. Scheduled maintenance is communicated in advance.",
                isKeyHighlight: false
            ),
            LegalClause(
                id: "tos-5",
                title: "5. Intellectual Property Rights",
                badge: "IP Rights",
                summary: "The platform architecture, UI, algorithms, and mobile applications are proprietary to Globizhub.",
                content: "All rights, title, trademarks, service marks, codebases, and interface designs of Patholab Cloud are the sole property of Globizhub India Private Limited. Licensee shall not reverse-engineer, decompile, duplicate, or white-label the software without prior written authorization.",
                isKeyHighlight: false
            ),
            LegalClause(
                id: "tos-6",
                title: "6. Limitation of Liability",
                badge: "Liability",
                summary: "Total liability is limited to fees paid during the preceding 3 months.",
                content: "Neither party shall be liable for indirect, incidental, special, or consequential damages. The maximum aggregate liability of Licensor under this agreement shall be limited to the subscription fees actually paid by the Licensee in the three (3) months preceding the event giving rise to the claim.",
                isKeyHighlight: false
            ),
            LegalClause(
                id: "tos-7",
                title: "7. Governing Law & Dispute Resolution",
                badge: "Jurisdiction",
                summary: "Governed by the laws of India with exclusive jurisdiction in Bangalore, Karnataka.",
                content: "These Terms and any dispute arising out of or in connection with the Platform shall be governed by and construed in accordance with the laws of India. The competent courts in Bangalore, Karnataka shall have exclusive jurisdiction.",
                isKeyHighlight: false
            )
        ]

        // 2. Privacy & Health Data
        let privacyClauses: [LegalClause] = [
            LegalClause(
                id: "priv-1",
                title: "1. Health Data Protection & DISHA / HIPAA Standards",
                badge: "Health Privacy",
                summary: "Strict medical confidentiality adhering to international and Indian digital health standards.",
                content: "Patholab Cloud enforces strict data protection safeguards compliant with the Digital Information Security in Healthcare Act (DISHA) and international privacy frameworks. Sensitive Personal Data or Information (SPDI), including patient diagnostic results, is stored encrypted with strict role-based access control.",
                isKeyHighlight: true
            ),
            LegalClause(
                id: "priv-2",
                title: "2. Information We Collect",
                badge: "Collection",
                summary: "Laboratory account profile, staff contact details, and audit telemetry.",
                content: "We collect account registration data (Lab name, address, contact numbers, email), billing information for subscription management, and anonymized diagnostic crash logs to improve mobile application reliability.",
                isKeyHighlight: false
            ),
            LegalClause(
                id: "priv-3",
                title: "3. Patient Data Confidentiality & Non-Disclosure",
                badge: "Confidentiality",
                summary: "We NEVER sell, rent, monetize, or disclose patient medical records to third parties.",
                content: "Licensor enforces strict non-disclosure obligations. Patient records and diagnostic findings processed through your workspace are never sold, rented, shared for marketing, or monetized. Licensor staff cannot access clinical data except upon explicit written support requests by the lab admin.",
                isKeyHighlight: true
            ),
            LegalClause(
                id: "priv-4",
                title: "4. Data Retention & Account Deletion",
                badge: "Data Rights",
                summary: "Export complete lab data in standard formats at any time or request full data purging.",
                content: "Laboratories retain full rights to export patient history, test catalogs, and financial summaries as Excel/PDF at any time. Upon account termination, data is retained for 30 days for recovery, after which permanent cryptographically secure purging is executed upon request.",
                isKeyHighlight: false
            )
        ]

        // 3. Refund & Cancellation
        let refundClauses: [LegalClause] = [
            LegalClause(
                id: "ref-1",
                title: "1. Subscription Billing & Renewals",
                badge: "Billing",
                summary: "Transparent upfront pricing with flexible monthly and annual billing cycles.",
                content: "Patholab Cloud subscriptions are billed in advance on a recurring monthly or annual basis as specified in your selected tier. Invoices are generated automatically and sent to the registered laboratory billing email.",
                isKeyHighlight: false
            ),
            LegalClause(
                id: "ref-2",
                title: "2. Cancellation for Convenience",
                badge: "Cancellation",
                summary: "Cancel your subscription at any time without lock-in penalties.",
                content: "You may cancel your recurring subscription at any time directly from the Lab Admin Dashboard or by contacting billing@patholab.cloud. Upon cancellation, your workspace remains fully operational until the end of your current paid billing period.",
                isKeyHighlight: true
            ),
            LegalClause(
                id: "ref-3",
                title: "3. Refund Policy & Pro-Rata Settlements",
                badge: "Refunds",
                summary: "Full 7-day money-back guarantee for new labs; pro-rata refunds for verified service outages.",
                content: "New laboratory signups enjoy an unconditional 7-day money-back satisfaction guarantee. For ongoing subscriptions, if a verified service outage exceeding SLA commitments occurs, a pro-rata credit or refund for the unutilized period will be promptly credited to the original payment method within 5-7 business days.",
                isKeyHighlight: true
            )
        ]

        // 4. Store & Beta Compliance
        let storeClauses: [LegalClause] = [
            LegalClause(
                id: "store-1",
                title: "1. Apple App Store & TestFlight Terms",
                badge: "Apple iOS",
                summary: "Compliance with Apple Media Services and TestFlight Beta Agreement.",
                content: "Your use of Patholab Cloud on iOS devices is governed by Apple Media Services Terms and Conditions and TestFlight Beta agreements. TestFlight beta builds automatically submit anonymous crash telemetry to Apple and Globizhub to ensure stability across iOS updates.",
                isKeyHighlight: false
            ),
            LegalClause(
                id: "store-2",
                title: "2. Google Play Beta & Android Distribution",
                badge: "Google Play",
                summary: "Adherence to Google Play Developer Distribution Agreement.",
                content: "Android releases distributed via Google Play Store adhere to Google Play Developer policies, safety guidelines, and Android permissions frameworks regarding camera (barcode scanning) and storage (PDF lab report saving).",
                isKeyHighlight: false
            ),
            LegalClause(
                id: "store-3",
                title: "3. Device Permissions & Camera Access",
                badge: "Permissions",
                summary: "Camera access is used exclusively for barcode/QR scanning; photo library for report attachments.",
                content: "Patholab Cloud requests camera permissions strictly to scan sample barcode vials and QR codes on requisition slips. Photo library write permissions are used only to save generated PDF diagnostic reports locally to your device storage.",
                isKeyHighlight: true
            )
        ]

        allCategories = [
            LegalCategory(title: "Terms of Service", iconName: "doc.text.fill", lastUpdated: "June 2024", clauses: termsClauses),
            LegalCategory(title: "Privacy & Health Data", iconName: "lock.shield.fill", lastUpdated: "June 2024", clauses: privacyClauses),
            LegalCategory(title: "Refund & Cancellation", iconName: "creditcard.fill", lastUpdated: "June 2024", clauses: refundClauses),
            LegalCategory(title: "App Store & Beta Testing", iconName: "applelogo", lastUpdated: "August 2024", clauses: storeClauses)
        ]
    }
}

// MARK: – Custom Cells

class LegalHeaderCell: UITableViewCell {
    private let container = UIView()
    private let iconView = UIImageView()
    private let lblTitle = UILabel()
    private let lblSubtitle = UILabel()
    private let lblCount = UILabel()

    override init(style: UITableViewCell.CellStyle, reuseIdentifier: String?) {
        super.init(style: style, reuseIdentifier: reuseIdentifier)
        backgroundColor = .clear
        selectionStyle = .none

        container.backgroundColor = UIColor(red: 67/255, green: 56/255, blue: 202/255, alpha: 0.08)
        container.layer.cornerRadius = 14
        container.layer.borderWidth = 1
        container.layer.borderColor = UIColor(red: 67/255, green: 56/255, blue: 202/255, alpha: 0.2).cgColor
        container.translatesAutoresizingMaskIntoConstraints = false
        contentView.addSubview(container)

        iconView.tintColor = UIColor(red: 67/255, green: 56/255, blue: 202/255, alpha: 1)
        iconView.contentMode = .scaleAspectFit
        iconView.translatesAutoresizingMaskIntoConstraints = false
        container.addSubview(iconView)

        lblTitle.font = UIFont.systemFont(ofSize: 16, weight: .bold)
        lblTitle.translatesAutoresizingMaskIntoConstraints = false
        container.addSubview(lblTitle)

        lblSubtitle.font = UIFont.systemFont(ofSize: 12, weight: .medium)
        lblSubtitle.translatesAutoresizingMaskIntoConstraints = false
        container.addSubview(lblSubtitle)

        lblCount.font = UIFont.systemFont(ofSize: 11, weight: .bold)
        lblCount.textColor = UIColor(red: 67/255, green: 56/255, blue: 202/255, alpha: 1)
        lblCount.backgroundColor = UIColor(red: 67/255, green: 56/255, blue: 202/255, alpha: 0.15)
        lblCount.layer.cornerRadius = 10
        lblCount.clipsToBounds = true
        lblCount.textAlignment = .center
        lblCount.translatesAutoresizingMaskIntoConstraints = false
        container.addSubview(lblCount)

        NSLayoutConstraint.activate([
            container.topAnchor.constraint(equalTo: contentView.topAnchor, constant: 4),
            container.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 4),
            container.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -4),
            container.bottomAnchor.constraint(equalTo: contentView.bottomAnchor, constant: -8),

            iconView.leadingAnchor.constraint(equalTo: container.leadingAnchor, constant: 14),
            iconView.centerYAnchor.constraint(equalTo: container.centerYAnchor),
            iconView.widthAnchor.constraint(equalToConstant: 24),
            iconView.heightAnchor.constraint(equalToConstant: 24),

            lblTitle.topAnchor.constraint(equalTo: container.topAnchor, constant: 12),
            lblTitle.leadingAnchor.constraint(equalTo: iconView.trailingAnchor, constant: 12),
            lblTitle.trailingAnchor.constraint(equalTo: lblCount.leadingAnchor, constant: -8),

            lblSubtitle.topAnchor.constraint(equalTo: lblTitle.bottomAnchor, constant: 2),
            lblSubtitle.leadingAnchor.constraint(equalTo: lblTitle.leadingAnchor),
            lblSubtitle.trailingAnchor.constraint(equalTo: lblTitle.trailingAnchor),
            lblSubtitle.bottomAnchor.constraint(equalTo: container.bottomAnchor, constant: -12),

            lblCount.trailingAnchor.constraint(equalTo: container.trailingAnchor, constant: -14),
            lblCount.centerYAnchor.constraint(equalTo: container.centerYAnchor),
            lblCount.widthAnchor.constraint(equalToConstant: 70),
            lblCount.heightAnchor.constraint(equalToConstant: 22)
        ])
    }

    required init?(coder: NSCoder) { fatalError() }

    func configure(category: LegalCategory, isDarkMode: Bool, resultCount: Int) {
        lblTitle.text = category.title
        lblTitle.textColor = isDarkMode ? .white : UIColor(red: 15/255, green: 23/255, blue: 42/255, alpha: 1)
        lblSubtitle.text = "Effective: \(category.lastUpdated) • Official Policy"
        lblSubtitle.textColor = isDarkMode ? UIColor(red: 148/255, green: 163/255, blue: 184/255, alpha: 1) : UIColor(red: 100/255, green: 116/255, blue: 139/255, alpha: 1)
        iconView.image = UIImage(systemName: category.iconName)
        lblCount.text = "\(resultCount) clauses"
    }
}

class LegalClauseCell: UITableViewCell {
    private let card = UIView()
    private let badgeContainer = UIView()
    private let lblBadge = UILabel()
    private let lblTitle = UILabel()
    private let highlightBanner = UIView()
    private let lblHighlight = UILabel()
    private let lblContent = UILabel()

    override init(style: UITableViewCell.CellStyle, reuseIdentifier: String?) {
        super.init(style: style, reuseIdentifier: reuseIdentifier)
        backgroundColor = .clear
        selectionStyle = .none

        card.layer.cornerRadius = 14
        card.layer.borderWidth = 1
        card.layer.shadowColor = UIColor.black.cgColor
        card.layer.shadowOpacity = 0.04
        card.layer.shadowOffset = CGSize(width: 0, height: 2)
        card.layer.shadowRadius = 6
        card.translatesAutoresizingMaskIntoConstraints = false
        contentView.addSubview(card)

        badgeContainer.layer.cornerRadius = 8
        badgeContainer.clipsToBounds = true
        badgeContainer.translatesAutoresizingMaskIntoConstraints = false
        card.addSubview(badgeContainer)

        lblBadge.font = UIFont.systemFont(ofSize: 11, weight: .bold)
        lblBadge.translatesAutoresizingMaskIntoConstraints = false
        badgeContainer.addSubview(lblBadge)

        lblTitle.font = UIFont.systemFont(ofSize: 15, weight: .bold)
        lblTitle.numberOfLines = 0
        lblTitle.translatesAutoresizingMaskIntoConstraints = false
        card.addSubview(lblTitle)

        highlightBanner.layer.cornerRadius = 8
        highlightBanner.translatesAutoresizingMaskIntoConstraints = false
        card.addSubview(highlightBanner)

        lblHighlight.font = UIFont.systemFont(ofSize: 12, weight: .semibold)
        lblHighlight.numberOfLines = 0
        lblHighlight.translatesAutoresizingMaskIntoConstraints = false
        highlightBanner.addSubview(lblHighlight)

        lblContent.font = UIFont.systemFont(ofSize: 13.5, weight: .regular)
        lblContent.numberOfLines = 0
        lblContent.translatesAutoresizingMaskIntoConstraints = false
        card.addSubview(lblContent)

        NSLayoutConstraint.activate([
            card.topAnchor.constraint(equalTo: contentView.topAnchor, constant: 4),
            card.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 4),
            card.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -4),
            card.bottomAnchor.constraint(equalTo: contentView.bottomAnchor, constant: -8),

            badgeContainer.topAnchor.constraint(equalTo: card.topAnchor, constant: 14),
            badgeContainer.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 14),
            badgeContainer.heightAnchor.constraint(equalToConstant: 22),

            lblBadge.leadingAnchor.constraint(equalTo: badgeContainer.leadingAnchor, constant: 8),
            lblBadge.trailingAnchor.constraint(equalTo: badgeContainer.trailingAnchor, constant: -8),
            lblBadge.centerYAnchor.constraint(equalTo: badgeContainer.centerYAnchor),

            lblTitle.topAnchor.constraint(equalTo: badgeContainer.bottomAnchor, constant: 8),
            lblTitle.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 14),
            lblTitle.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -14),

            highlightBanner.topAnchor.constraint(equalTo: lblTitle.bottomAnchor, constant: 8),
            highlightBanner.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 14),
            highlightBanner.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -14),

            lblHighlight.topAnchor.constraint(equalTo: highlightBanner.topAnchor, constant: 8),
            lblHighlight.leadingAnchor.constraint(equalTo: highlightBanner.leadingAnchor, constant: 10),
            lblHighlight.trailingAnchor.constraint(equalTo: highlightBanner.trailingAnchor, constant: -10),
            lblHighlight.bottomAnchor.constraint(equalTo: highlightBanner.bottomAnchor, constant: -8),

            lblContent.topAnchor.constraint(equalTo: highlightBanner.bottomAnchor, constant: 10),
            lblContent.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 14),
            lblContent.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -14),
            lblContent.bottomAnchor.constraint(equalTo: card.bottomAnchor, constant: -16)
        ])
    }

    required init?(coder: NSCoder) { fatalError() }

    func configure(clause: LegalClause, isDarkMode: Bool, primaryColor: UIColor) {
        card.backgroundColor = isDarkMode ? UIColor(red: 30/255, green: 41/255, blue: 59/255, alpha: 1) : .white
        card.layer.borderColor = isDarkMode ? UIColor(red: 51/255, green: 65/255, blue: 85/255, alpha: 1).cgColor : UIColor(red: 226/255, green: 232/255, blue: 240/255, alpha: 1).cgColor

        badgeContainer.backgroundColor = clause.isKeyHighlight ? UIColor(red: 254/255, green: 243/255, blue: 199/255, alpha: 1) : UIColor(red: 238/255, green: 242/255, blue: 255/255, alpha: 1)
        lblBadge.text = clause.badge
        lblBadge.textColor = clause.isKeyHighlight ? UIColor(red: 180/255, green: 83/255, blue: 9/255, alpha: 1) : primaryColor

        lblTitle.text = clause.title
        lblTitle.textColor = isDarkMode ? .white : UIColor(red: 15/255, green: 23/255, blue: 42/255, alpha: 1)

        if let summary = clause.summary {
            highlightBanner.isHidden = false
            highlightBanner.backgroundColor = clause.isKeyHighlight ? UIColor(red: 254/255, green: 249/255, blue: 195/255, alpha: 0.6) : (isDarkMode ? UIColor(red: 51/255, green: 65/255, blue: 85/255, alpha: 0.5) : UIColor(red: 241/255, green: 245/255, blue: 249/255, alpha: 1))
            lblHighlight.text = "💡 Key Takeaway: \(summary)"
            lblHighlight.textColor = clause.isKeyHighlight ? UIColor(red: 146/255, green: 64/255, blue: 14/255, alpha: 1) : (isDarkMode ? UIColor(red: 226/255, green: 232/255, blue: 240/255, alpha: 1) : UIColor(red: 51/255, green: 65/255, blue: 85/255, alpha: 1))
        } else {
            highlightBanner.isHidden = true
        }

        let pStyle = NSMutableParagraphStyle()
        pStyle.lineSpacing = 4
        lblContent.attributedText = NSAttributedString(string: clause.content, attributes: [
            .paragraphStyle: pStyle,
            .font: UIFont.systemFont(ofSize: 13.5, weight: .regular),
            .foregroundColor: isDarkMode ? UIColor(red: 203/255, green: 213/255, blue: 225/255, alpha: 1) : UIColor(red: 51/255, green: 65/255, blue: 85/255, alpha: 1)
        ])
    }

    func triggerCardBounce() {
        card.triggerSpringPress()
    }
}

class LegalContactCell: UITableViewCell {
    private let card = UIView()
    private let lblHeader = UILabel()
    private let lblCompany = UILabel()
    private let lblAddress = UILabel()
    private let lblEmail = UILabel()

    override init(style: UITableViewCell.CellStyle, reuseIdentifier: String?) {
        super.init(style: style, reuseIdentifier: reuseIdentifier)
        backgroundColor = .clear
        selectionStyle = .none

        card.layer.cornerRadius = 14
        card.layer.borderWidth = 1
        card.translatesAutoresizingMaskIntoConstraints = false
        contentView.addSubview(card)

        lblHeader.text = "🏢 Corporate & Grievance Contact"
        lblHeader.font = UIFont.systemFont(ofSize: 14, weight: .bold)
        lblHeader.translatesAutoresizingMaskIntoConstraints = false
        card.addSubview(lblHeader)

        lblCompany.text = "Globizhub India Private Limited (CIN: U74999KA2019PTC120377)"
        lblCompany.font = UIFont.systemFont(ofSize: 12.5, weight: .semibold)
        lblCompany.numberOfLines = 0
        lblCompany.translatesAutoresizingMaskIntoConstraints = false
        card.addSubview(lblCompany)

        lblAddress.text = "📍 Registered Office: No. 594/4/2, 1st Floor, Kothanur Main Rd, Bangalore, KA - 560077\n📍 R&D Center: 1st Floor, No 59, Nayanpur Rd, Ganeshguri, Guwahati, AS - 781006"
        lblAddress.font = UIFont.systemFont(ofSize: 11.5, weight: .regular)
        lblAddress.numberOfLines = 0
        lblAddress.translatesAutoresizingMaskIntoConstraints = false
        card.addSubview(lblAddress)

        lblEmail.text = "✉️ Legal Queries: legal@patholab.cloud | Support: support@patholab.cloud"
        lblEmail.font = UIFont.systemFont(ofSize: 11.5, weight: .medium)
        lblEmail.textColor = UIColor(red: 67/255, green: 56/255, blue: 202/255, alpha: 1)
        lblEmail.numberOfLines = 0
        lblEmail.translatesAutoresizingMaskIntoConstraints = false
        card.addSubview(lblEmail)

        NSLayoutConstraint.activate([
            card.topAnchor.constraint(equalTo: contentView.topAnchor, constant: 8),
            card.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 4),
            card.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -4),
            card.bottomAnchor.constraint(equalTo: contentView.bottomAnchor, constant: -30),

            lblHeader.topAnchor.constraint(equalTo: card.topAnchor, constant: 14),
            lblHeader.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 14),
            lblHeader.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -14),

            lblCompany.topAnchor.constraint(equalTo: lblHeader.bottomAnchor, constant: 6),
            lblCompany.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 14),
            lblCompany.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -14),

            lblAddress.topAnchor.constraint(equalTo: lblCompany.bottomAnchor, constant: 6),
            lblAddress.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 14),
            lblAddress.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -14),

            lblEmail.topAnchor.constraint(equalTo: lblAddress.bottomAnchor, constant: 6),
            lblEmail.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 14),
            lblEmail.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -14),
            lblEmail.bottomAnchor.constraint(equalTo: card.bottomAnchor, constant: -14)
        ])
    }

    required init?(coder: NSCoder) { fatalError() }

    func configure(isDarkMode: Bool, primaryColor: UIColor) {
        card.backgroundColor = isDarkMode ? UIColor(red: 30/255, green: 41/255, blue: 59/255, alpha: 1) : UIColor(red: 241/255, green: 245/255, blue: 249/255, alpha: 1)
        card.layer.borderColor = isDarkMode ? UIColor(red: 51/255, green: 65/255, blue: 85/255, alpha: 1).cgColor : UIColor(red: 226/255, green: 232/255, blue: 240/255, alpha: 1).cgColor

        lblHeader.textColor = primaryColor
        lblCompany.textColor = isDarkMode ? .white : UIColor(red: 15/255, green: 23/255, blue: 42/255, alpha: 1)
        lblAddress.textColor = isDarkMode ? UIColor(red: 148/255, green: 163/255, blue: 184/255, alpha: 1) : UIColor(red: 71/255, green: 85/255, blue: 105/255, alpha: 1)
    }
}
