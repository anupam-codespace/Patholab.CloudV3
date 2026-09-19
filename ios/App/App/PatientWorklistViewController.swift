import UIKit

// ─────────────────────────────────────────────────────────────────────────────
// MARK: – Data Models
// ─────────────────────────────────────────────────────────────────────────────
struct PatientVisitRecord {
    let id: String
    let visitId: String
    let dateFormatted: String
    let tatFormatted: String
    let tatColor: UIColor
    let patientName: String
    let patientDetails: String
    let doctor: String
    let testsList: String
    let financials: String
    var status: String // COMPLETED, IN_PROGRESS, NO_TESTS
    let reportId: String?
    let invoiceId: String?
    let patientDbId: String?
    let uhid: String?
    let patientPhone: String?
    let testName: String?
}

struct WorklistKpiStats {
    var totalVisits: Int = 0
    var inProgressVisits: Int = 0
    var completedVisits: Int = 0
    var registeredVisits: Int = 0
}

struct ParameterItem {
    let name: String
    let refRange: String
    let unit: String
    let minNormal: Double
    let maxNormal: Double
    var observedValue: String
}

// ─────────────────────────────────────────────────────────────────────────────
// MARK: – Native Patient Visit Worklist Controller (iOS)
// ─────────────────────────────────────────────────────────────────────────────
class PatientWorklistViewController: UIViewController, UITableViewDataSource, UITableViewDelegate, UITextFieldDelegate {

    private let baseUrl = "https://app.patholab.cloud"

    private var allVisits: [PatientVisitRecord] = []
    private var filteredVisits: [PatientVisitRecord] = []
    private var kpiStats = WorklistKpiStats()

    private var selectedStatusFilter = "ALL"

    // UI Elements
    private let topHeaderView      = UIView()
    private let headerGradient     = CAGradientLayer()
    private let backBtn            = UIButton(type: .system)
    private let titleLbl           = UILabel()
    private let subLbl             = UILabel()
    private let refreshBtn         = UIButton(type: .system)
    private let kpiScrollView      = UIScrollView()
    private let kpiStack           = UIStackView()
    private let searchField        = UITextField()
    private let filterScrollView   = UIScrollView()
    private let filterChipsStack   = UIStackView()
    private let tableView          = UITableView()
    private let spinner            = UIActivityIndicatorView(style: .medium)
    private let emptyStateView     = UIView()

    // KPI Labels
    private let lblTotalVisits     = UILabel()
    private let lblInProgress      = UILabel()
    private let lblCompleted       = UILabel()
    private let lblRegistered      = UILabel()

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 0.973, green: 0.980, blue: 0.988, alpha: 1) // #F8FAFC

        setupHeader()
        setupKpiRow()
        setupSearchAndFilters()
        setupTableView()
        setupEmptyState()

        fetchPatientWorklist()
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        fetchPatientWorklist()
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        headerGradient.frame = topHeaderView.bounds
    }

    override var preferredStatusBarStyle: UIStatusBarStyle {
        return .lightContent
    }

    // ── Header Setup ─────────────────────────────────────────────────────────
    private func setupHeader() {
        topHeaderView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(topHeaderView)

        headerGradient.colors = [
            UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1).cgColor, // #0D6EFD
            UIColor(red: 0.039, green: 0.345, blue: 0.792, alpha: 1).cgColor, // #0A58CA
            UIColor(red: 0.114, green: 0.306, blue: 0.847, alpha: 1).cgColor  // #1D4ED8
        ]
        headerGradient.startPoint = CGPoint(x: 0, y: 0)
        headerGradient.endPoint   = CGPoint(x: 1, y: 1)
        topHeaderView.layer.insertSublayer(headerGradient, at: 0)
        topHeaderView.layer.cornerRadius = 24
        topHeaderView.layer.maskedCorners = [.layerMinXMaxYCorner, .layerMaxXMaxYCorner]
        topHeaderView.clipsToBounds = true

        // Back Button: Translucent frosted glass circular button
        backBtn.setImage(UIImage(systemName: "chevron.left"), for: .normal)
        backBtn.tintColor = .white
        backBtn.backgroundColor = UIColor.white.withAlphaComponent(0.20)
        backBtn.layer.borderColor = UIColor.white.withAlphaComponent(0.30).cgColor
        backBtn.layer.borderWidth = 1
        backBtn.layer.cornerRadius = 19
        backBtn.addTarget(self, action: #selector(didTapBack), for: .touchUpInside)
        backBtn.translatesAutoresizingMaskIntoConstraints = false
        topHeaderView.addSubview(backBtn)

        // Title
        titleLbl.text = "Patient Worklist"
        titleLbl.font = .systemFont(ofSize: 20, weight: .bold)
        titleLbl.textColor = .white
        titleLbl.translatesAutoresizingMaskIntoConstraints = false
        topHeaderView.addSubview(titleLbl)

        // Subtitle
        subLbl.text = "Live Accessions • TAT Monitoring"
        subLbl.font = .systemFont(ofSize: 11.5, weight: .medium)
        subLbl.textColor = UIColor(red: 0.78, green: 0.87, blue: 1.0, alpha: 1)
        subLbl.translatesAutoresizingMaskIntoConstraints = false
        topHeaderView.addSubview(subLbl)

        // Refresh Button: Translucent frosted glass circular button
        refreshBtn.setImage(UIImage(systemName: "arrow.clockwise"), for: .normal)
        refreshBtn.tintColor = .white
        refreshBtn.backgroundColor = UIColor.white.withAlphaComponent(0.20)
        refreshBtn.layer.borderColor = UIColor.white.withAlphaComponent(0.30).cgColor
        refreshBtn.layer.borderWidth = 1
        refreshBtn.layer.cornerRadius = 19
        refreshBtn.addTarget(self, action: #selector(didTapRefresh), for: .touchUpInside)
        refreshBtn.translatesAutoresizingMaskIntoConstraints = false
        topHeaderView.addSubview(refreshBtn)

        NSLayoutConstraint.activate([
            topHeaderView.topAnchor.constraint(equalTo: view.topAnchor),
            topHeaderView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            topHeaderView.trailingAnchor.constraint(equalTo: view.trailingAnchor),

            backBtn.leadingAnchor.constraint(equalTo: topHeaderView.leadingAnchor, constant: 16),
            backBtn.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 10),
            backBtn.widthAnchor.constraint(equalToConstant: 38),
            backBtn.heightAnchor.constraint(equalToConstant: 38),

            refreshBtn.trailingAnchor.constraint(equalTo: topHeaderView.trailingAnchor, constant: -16),
            refreshBtn.centerYAnchor.constraint(equalTo: backBtn.centerYAnchor),
            refreshBtn.widthAnchor.constraint(equalToConstant: 38),
            refreshBtn.heightAnchor.constraint(equalToConstant: 38),

            titleLbl.leadingAnchor.constraint(equalTo: backBtn.trailingAnchor, constant: 12),
            titleLbl.topAnchor.constraint(equalTo: backBtn.topAnchor, constant: -2),
            titleLbl.trailingAnchor.constraint(lessThanOrEqualTo: refreshBtn.leadingAnchor, constant: -8),

            subLbl.leadingAnchor.constraint(equalTo: titleLbl.leadingAnchor),
            subLbl.topAnchor.constraint(equalTo: titleLbl.bottomAnchor, constant: 2),
            subLbl.trailingAnchor.constraint(lessThanOrEqualTo: refreshBtn.leadingAnchor, constant: -8)
        ])
    }

    @objc private func didTapRegister() {
        let regVC = RegistrationViewController()
        if let nav = navigationController {
            nav.pushViewController(regVC, animated: true)
        } else {
            regVC.modalPresentationStyle = .fullScreen
            present(regVC, animated: true)
        }
    }

    // ── KPI Row (Embedded inside Curved Top Sapphire Header) ─────────────────
    private func setupKpiRow() {
        kpiScrollView.showsHorizontalScrollIndicator = false
        kpiScrollView.clipsToBounds = false
        kpiScrollView.translatesAutoresizingMaskIntoConstraints = false
        topHeaderView.addSubview(kpiScrollView)

        kpiStack.axis = .horizontal
        kpiStack.spacing = 10
        kpiStack.alignment = .fill
        kpiStack.distribution = .fillProportionally
        kpiStack.translatesAutoresizingMaskIntoConstraints = false
        kpiScrollView.addSubview(kpiStack)

        let card1 = makeKpiCard(title: "TOTAL VISITS", valueLbl: lblTotalVisits, dotColor: UIColor(red: 0.25, green: 0.45, blue: 0.98, alpha: 1), subText: "Accessioned Today")
        let card2 = makeKpiCard(title: "IN PROGRESS", valueLbl: lblInProgress, dotColor: UIColor(red: 0.961, green: 0.620, blue: 0.043, alpha: 1), subText: "Testing Underway")
        let card3 = makeKpiCard(title: "COMPLETED & READY", valueLbl: lblCompleted, dotColor: UIColor(red: 0.063, green: 0.725, blue: 0.506, alpha: 1), subText: "Authorized Reports")
        let card4 = makeKpiCard(title: "REGISTERED ONLY", valueLbl: lblRegistered, dotColor: UIColor(red: 0.024, green: 0.714, blue: 0.831, alpha: 1), subText: "Awaiting Billing / Tests")

        kpiStack.addArrangedSubview(card1)
        kpiStack.addArrangedSubview(card2)
        kpiStack.addArrangedSubview(card3)
        kpiStack.addArrangedSubview(card4)

        NSLayoutConstraint.activate([
            kpiScrollView.topAnchor.constraint(equalTo: backBtn.bottomAnchor, constant: 14),
            kpiScrollView.leadingAnchor.constraint(equalTo: topHeaderView.leadingAnchor),
            kpiScrollView.trailingAnchor.constraint(equalTo: topHeaderView.trailingAnchor),
            kpiScrollView.heightAnchor.constraint(equalToConstant: 80),

            topHeaderView.bottomAnchor.constraint(equalTo: kpiScrollView.bottomAnchor, constant: 18),

            kpiStack.topAnchor.constraint(equalTo: kpiScrollView.topAnchor),
            kpiStack.bottomAnchor.constraint(equalTo: kpiScrollView.bottomAnchor),
            kpiStack.leadingAnchor.constraint(equalTo: kpiScrollView.leadingAnchor, constant: 16),
            kpiStack.trailingAnchor.constraint(equalTo: kpiScrollView.trailingAnchor, constant: -16),
            kpiStack.heightAnchor.constraint(equalTo: kpiScrollView.heightAnchor)
        ])
    }

    private func makeKpiCard(title: String, valueLbl: UILabel, dotColor: UIColor, subText: String) -> UIView {
        let card = UIView()
        card.translatesAutoresizingMaskIntoConstraints = false
        card.backgroundColor = UIColor.white.withAlphaComponent(0.16)
        card.layer.borderColor = UIColor.white.withAlphaComponent(0.25).cgColor
        card.layer.borderWidth = 1
        card.layer.cornerRadius = 16
        card.clipsToBounds = true
        card.widthAnchor.constraint(equalToConstant: 155).isActive = true

        let dot = UIView()
        dot.translatesAutoresizingMaskIntoConstraints = false
        dot.backgroundColor = dotColor
        dot.layer.cornerRadius = 3.5
        dot.layer.shadowColor = dotColor.cgColor
        dot.layer.shadowRadius = 4
        dot.layer.shadowOpacity = 0.8
        dot.layer.shadowOffset = .zero

        let tLbl = UILabel()
        tLbl.translatesAutoresizingMaskIntoConstraints = false
        tLbl.text = title
        tLbl.font = .systemFont(ofSize: 9.5, weight: .bold)
        tLbl.textColor = UIColor(red: 0.78, green: 0.87, blue: 1.0, alpha: 1) // #C7DFFF

        let headerStack = UIStackView(arrangedSubviews: [dot, tLbl])
        headerStack.translatesAutoresizingMaskIntoConstraints = false
        headerStack.axis = .horizontal
        headerStack.spacing = 6
        headerStack.alignment = .center

        valueLbl.translatesAutoresizingMaskIntoConstraints = false
        valueLbl.font = .systemFont(ofSize: 20, weight: .bold)
        valueLbl.textColor = .white
        valueLbl.text = "0"

        let sLbl = UILabel()
        sLbl.translatesAutoresizingMaskIntoConstraints = false
        sLbl.text = subText
        sLbl.font = .systemFont(ofSize: 10.5, weight: .medium)
        sLbl.textColor = UIColor(red: 0.78, green: 0.87, blue: 1.0, alpha: 1) // #C7DFFF

        let vStack = UIStackView(arrangedSubviews: [headerStack, valueLbl, sLbl])
        vStack.translatesAutoresizingMaskIntoConstraints = false
        vStack.axis = .vertical
        vStack.spacing = 3
        vStack.alignment = .leading
        card.addSubview(vStack)

        NSLayoutConstraint.activate([
            dot.widthAnchor.constraint(equalToConstant: 7),
            dot.heightAnchor.constraint(equalToConstant: 7),

            vStack.topAnchor.constraint(equalTo: card.topAnchor, constant: 10),
            vStack.bottomAnchor.constraint(equalTo: card.bottomAnchor, constant: -10),
            vStack.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 14),
            vStack.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -14)
        ])

        return card
    }

    // ── Search & Filter Chips ────────────────────────────────────────────────
    private func setupSearchAndFilters() {
        searchField.placeholder = "Search patient, UHID, invoice, phone, or test..."
        searchField.font = .systemFont(ofSize: 14, weight: .medium)
        searchField.backgroundColor = .white
        searchField.layer.cornerRadius = 14
        searchField.layer.borderWidth = 1
        searchField.layer.borderColor = UIColor(red: 0.89, green: 0.91, blue: 0.95, alpha: 1).cgColor
        searchField.clearButtonMode = .whileEditing
        searchField.delegate = self
        searchField.addTarget(self, action: #selector(didSearchWorklist), for: .editingChanged)

        let leftIcon = UIImageView(image: UIImage(systemName: "magnifyingglass"))
        leftIcon.tintColor = UIColor(red: 0.58, green: 0.64, blue: 0.72, alpha: 1)
        leftIcon.frame = CGRect(x: 12, y: 12, width: 20, height: 20)
        let leftPad = UIView(frame: CGRect(x: 0, y: 0, width: 40, height: 44))
        leftPad.addSubview(leftIcon)
        searchField.leftView = leftPad
        searchField.leftViewMode = .always
        searchField.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(searchField)

        filterScrollView.showsHorizontalScrollIndicator = false
        filterScrollView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(filterScrollView)

        filterChipsStack.axis = .horizontal
        filterChipsStack.spacing = 8
        filterChipsStack.translatesAutoresizingMaskIntoConstraints = false
        filterScrollView.addSubview(filterChipsStack)

        NSLayoutConstraint.activate([
            searchField.topAnchor.constraint(equalTo: topHeaderView.bottomAnchor, constant: 10),
            searchField.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 16),
            searchField.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -16),
            searchField.heightAnchor.constraint(equalToConstant: 44),

            filterScrollView.topAnchor.constraint(equalTo: searchField.bottomAnchor, constant: 10),
            filterScrollView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            filterScrollView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            filterScrollView.heightAnchor.constraint(equalToConstant: 38),

            filterChipsStack.topAnchor.constraint(equalTo: filterScrollView.topAnchor),
            filterChipsStack.bottomAnchor.constraint(equalTo: filterScrollView.bottomAnchor),
            filterChipsStack.leadingAnchor.constraint(equalTo: filterScrollView.leadingAnchor, constant: 16),
            filterChipsStack.trailingAnchor.constraint(equalTo: filterScrollView.trailingAnchor, constant: -16),
        ])

        setupFilterChips()
    }

    private func setupFilterChips() {
        filterChipsStack.arrangedSubviews.forEach { $0.removeFromSuperview() }
        let filters = [
            ("ALL", "All Visits"),
            ("IN_PROGRESS", "In Progress"),
            ("COMPLETED", "Completed & Ready"),
            ("NO_TESTS", "Registered Only")
        ]

        for (key, title) in filters {
            let btn = UIButton(type: .custom)
            btn.setTitle(title, for: .normal)
            btn.titleLabel?.font = .systemFont(ofSize: 12.5, weight: .bold)
            btn.contentEdgeInsets = UIEdgeInsets(top: 6, left: 14, bottom: 6, right: 14)
            btn.layer.cornerRadius = 14

            if key == selectedStatusFilter {
                btn.backgroundColor = UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1)
                btn.setTitleColor(.white, for: .normal)
                btn.layer.borderWidth = 0
            } else {
                btn.backgroundColor = UIColor(red: 0.945, green: 0.961, blue: 0.976, alpha: 1)
                btn.setTitleColor(UIColor(red: 0.28, green: 0.33, blue: 0.41, alpha: 1), for: .normal)
                btn.layer.borderWidth = 1
                btn.layer.borderColor = UIColor(red: 0.89, green: 0.91, blue: 0.95, alpha: 1).cgColor
            }

            btn.tag = filters.firstIndex(where: { $0.0 == key }) ?? 0
            btn.addTarget(self, action: #selector(didSelectFilterChip(_:)), for: .touchUpInside)
            filterChipsStack.addArrangedSubview(btn)
        }
    }

    @objc private func didSelectFilterChip(_ sender: UIButton) {
        let keys = ["ALL", "IN_PROGRESS", "COMPLETED", "NO_TESTS"]
        if sender.tag < keys.count {
            selectedStatusFilter = keys[sender.tag]
            setupFilterChips()
            applyWorklistFilter()
        }
    }

    @objc private func didSearchWorklist() {
        applyWorklistFilter()
    }

    // ── Table View ───────────────────────────────────────────────────────────
    private func setupTableView() {
        tableView.backgroundColor = .clear
        tableView.separatorStyle = .none
        tableView.dataSource = self
        tableView.delegate = self
        tableView.register(UITableViewCell.self, forCellReuseIdentifier: "WorklistCardCell")
        tableView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(tableView)

        spinner.hidesWhenStopped = true
        spinner.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(spinner)

        NSLayoutConstraint.activate([
            tableView.topAnchor.constraint(equalTo: filterScrollView.bottomAnchor, constant: 8),
            tableView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            tableView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            tableView.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor),

            spinner.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            spinner.centerYAnchor.constraint(equalTo: view.centerYAnchor),
        ])
    }

    private func setupEmptyState() {
        emptyStateView.isHidden = true
        emptyStateView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(emptyStateView)

        let title = UILabel()
        title.text = "No Patient Visits Found"
        title.font = .systemFont(ofSize: 17, weight: .bold)
        title.textColor = UIColor(red: 0.059, green: 0.090, blue: 0.165, alpha: 1)

        let sub = UILabel()
        sub.text = "No accession records matched your search query or filter."
        sub.font = .systemFont(ofSize: 13, weight: .medium)
        sub.textColor = UIColor(red: 0.392, green: 0.451, blue: 0.549, alpha: 1)
        sub.numberOfLines = 0
        sub.textAlignment = .center

        [title, sub].forEach {
            $0.translatesAutoresizingMaskIntoConstraints = false
            emptyStateView.addSubview($0)
        }

        NSLayoutConstraint.activate([
            emptyStateView.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            emptyStateView.centerYAnchor.constraint(equalTo: view.centerYAnchor),
            emptyStateView.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 32),
            emptyStateView.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -32),

            title.centerXAnchor.constraint(equalTo: emptyStateView.centerXAnchor),
            title.topAnchor.constraint(equalTo: emptyStateView.topAnchor),

            sub.topAnchor.constraint(equalTo: title.bottomAnchor, constant: 4),
            sub.leadingAnchor.constraint(equalTo: emptyStateView.leadingAnchor),
            sub.trailingAnchor.constraint(equalTo: emptyStateView.trailingAnchor),
            sub.bottomAnchor.constraint(equalTo: emptyStateView.bottomAnchor),
        ])
    }

    // ── Data Fetching ────────────────────────────────────────────────────────
    private func fetchUserInfo() {
        guard let url = URL(string: baseUrl + "/api/auth/me") else { return }
        var req = URLRequest(url: url)
        req.httpMethod = "GET"
        if let token = UserDefaults.standard.string(forKey: "auth_token") {
            req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            req.setValue("token=\(token)", forHTTPHeaderField: "Cookie")
        }

        URLSession.shared.dataTask(with: req) { [weak self] data, _, _ in
            guard let self = self, let data = data else { return }
            if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
                let name = json["name"] as? String ?? "Accession Desk"
                var labName = "PathoLab Cloud"
                if let lab = json["lab"] as? [String: Any], let lName = lab["name"] as? String {
                    labName = lName
                }
                DispatchQueue.main.async {
                    self.subLbl.text = "\(labName) • \(name)"
                }
            }
        }.resume()
    }

    private func fetchPatientWorklist() {
        fetchUserInfo()
        spinner.startAnimating()
        guard let url = URL(string: baseUrl + "/api/workspace/patients") else { return }
        var req = URLRequest(url: url)
        req.httpMethod = "GET"
        let token = KeychainManager.read(forKey: KeychainManager.tokenKey) ?? UserDefaults.standard.string(forKey: "auth_token")
        if let token = token {
            req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            req.setValue("token=\(token)", forHTTPHeaderField: "Cookie")
        }

        URLSession.shared.dataTask(with: req) { [weak self] data, response, error in
            guard let self = self else { return }
            DispatchQueue.main.async { self.spinner.stopAnimating() }

            var parsed: [PatientVisitRecord] = []
            if let data = data,
               let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
               let patients = (json["patients"] as? [[String: Any]]) ?? (json["data"] as? [[String: Any]]) {

                for p in patients {
                    let pId = p["id"] as? String ?? ""
                    let name = p["name"] as? String ?? "Unknown Patient"
                    let uhid = p["patientId"] as? String ?? "P-\(pId.prefix(6))"
                    let phone = (p["phone"] as? String) ?? (p["mobile"] as? String ?? "")
                    let gender = p["gender"] as? String ?? "MALE"
                    let age = p["age"] as? Int ?? 0
                    let ageUnit = p["ageUnit"] as? String ?? "Yrs"
                    let pDetails = "\(age) \(ageUnit.prefix(1)) • \(gender) • UHID: \(uhid)"
                    let doctor = p["doctor"] as? [String: Any]
                    var doctorName = "Self Referral / Walk-in"
                    if let dName = doctor?["name"] as? String, !dName.trimmingCharacters(in: .whitespaces).isEmpty {
                        let clean = dName.replacingOccurrences(of: "^(?i)(dr\\.?|doctor)\\s+", with: "", options: .regularExpression).trimmingCharacters(in: .whitespaces)
                        doctorName = "Dr. \(clean)"
                    }

                    let invoices = p["invoices"] as? [[String: Any]] ?? []

                    if !invoices.isEmpty {
                        for inv in invoices {
                            let invId = inv["id"] as? String ?? ""
                            let invNum = inv["invoiceNumber"] as? String ?? "INV-\(pId.prefix(4))"
                            let invCreated = inv["createdAt"] as? String ?? ""
                            let invStatus = inv["status"] as? String ?? "PENDING"
                            let grandTotal = (inv["grandTotal"] as? NSNumber)?.doubleValue ?? 0.0

                            let tests = inv["tests"] as? [[String: Any]] ?? []
                            var testStrings: [String] = []
                            var allApproved = true
                            let count = tests.count
                            var firstTestName = "Clinical Diagnostic Investigation"

                            for (idx, t) in tests.enumerated() {
                                let tName = (t["testName"] as? String) ?? (t["name"] as? String ?? "Diagnostic Test")
                                if idx == 0 { firstTestName = tName }
                                let tStatus = (t["status"] as? String ?? "PENDING").uppercased()
                                let isApproved = tStatus == "APPROVED" || tStatus == "FINAL" || tStatus == "READY" || tStatus == "COMPLETED"
                                if !isApproved {
                                    allApproved = false
                                }
                                let statusTag: String
                                if isApproved {
                                    statusTag = "Ready"
                                } else if tStatus == "IN_PROGRESS" || tStatus == "TESTING" || tStatus == "PROCESSING" {
                                    statusTag = "Processing"
                                } else {
                                    statusTag = "Pending"
                                }
                                testStrings.append("\(tName) [\(statusTag)]")
                            }

                            let testListStr = testStrings.isEmpty ? "Routine Diagnostic Panel" : testStrings.joined(separator: "  •  ")
                            let visitStatus = (count > 0 && allApproved) ? "COMPLETED" : (count == 0 ? "NO_TESTS" : "IN_PROGRESS")
                            let finText = "Total Bill: ₹\(Int(grandTotal)) • Status: \(invStatus)"

                            parsed.append(PatientVisitRecord(
                                id: invId,
                                visitId: invNum,
                                dateFormatted: self.formatDate(invCreated),
                                tatFormatted: self.computeTAT(invCreated),
                                tatColor: self.computeTATColor(invCreated),
                                patientName: name,
                                patientDetails: pDetails,
                                doctor: doctorName,
                                testsList: testListStr,
                                financials: finText,
                                status: visitStatus,
                                reportId: "rep_\(invNum)",
                                invoiceId: invId,
                                patientDbId: pId,
                                uhid: uhid,
                                patientPhone: phone,
                                testName: firstTestName
                            ))
                        }
                    } else {
                        let pCreated = p["createdAt"] as? String ?? ""
                        parsed.append(PatientVisitRecord(
                            id: "NO_INV_\(pId)",
                            visitId: "REG-\(uhid.replacingOccurrences(of: "P-", with: ""))",
                            dateFormatted: self.formatDate(pCreated),
                            tatFormatted: self.computeTAT(pCreated),
                            tatColor: UIColor(red: 0.39, green: 0.45, blue: 0.55, alpha: 1),
                            patientName: name,
                            patientDetails: pDetails,
                            doctor: doctorName,
                            testsList: "No Active Tests Assigned (Patient Registration Only)",
                            financials: "Unbilled Registration",
                            status: "NO_TESTS",
                            reportId: nil,
                            invoiceId: nil,
                            patientDbId: pId,
                            uhid: uhid,
                            patientPhone: phone,
                            testName: "Clinical Diagnostic Investigation"
                        ))
                    }
                }
            }

            DispatchQueue.main.async {
                self.allVisits = parsed
                self.updateKpiStats()
                self.applyWorklistFilter()
            }
        }.resume()
    }

    private func formatDate(_ isoDate: String) -> String {
        let formatter = ISO8601DateFormatter()
        if let d = formatter.date(from: isoDate) {
            let out = DateFormatter()
            out.dateFormat = "dd MMM yyyy, hh:mm a"
            return out.string(from: d)
        }
        return "Today"
    }

    private func computeTAT(_ isoDate: String) -> String {
        let formatter = ISO8601DateFormatter()
        if let d = formatter.date(from: isoDate) {
            let diff = max(0, Int(Date().timeIntervalSince(d)))
            let hours = diff / 3600
            let mins = (diff % 3600) / 60
            return String(format: "%02dh %02dm", hours, mins)
        }
        return "01h 15m"
    }

    private func computeTATColor(_ isoDate: String) -> UIColor {
        let formatter = ISO8601DateFormatter()
        if let d = formatter.date(from: isoDate) {
            let hours = Int(Date().timeIntervalSince(d)) / 3600
            if hours > 24 { return UIColor(red: 0.937, green: 0.267, blue: 0.267, alpha: 1) }
            if hours > 12 { return UIColor(red: 0.85, green: 0.47, blue: 0.02, alpha: 1) }
        }
        return UIColor(red: 0.02, green: 0.59, blue: 0.41, alpha: 1)
    }

    private func updateKpiStats() {
        let total = allVisits.count
        var inProgress = 0, completed = 0, registered = 0
        for v in allVisits {
            let st = v.status.uppercased()
            if st == "IN_PROGRESS" || st == "PENDING" { inProgress += 1 }
            else if st == "COMPLETED" || st == "APPROVED" { completed += 1 }
            else if st == "NO_TESTS" { registered += 1 }
        }

        lblTotalVisits.text = "\(total)"
        lblInProgress.text = "\(inProgress)"
        lblCompleted.text = "\(completed)"
        lblRegistered.text = "\(registered)"
    }

    private func applyWorklistFilter() {
        let q = searchField.text?.trimmingCharacters(in: .whitespacesAndNewlines).lowercased() ?? ""
        filteredVisits = allVisits.filter { v in
            let matchesSearch = q.isEmpty ||
                v.patientName.lowercased().contains(q) ||
                v.visitId.lowercased().contains(q) ||
                v.patientDetails.lowercased().contains(q) ||
                v.testsList.lowercased().contains(q) ||
                v.doctor.lowercased().contains(q)

            var matchesStatus = true
            if selectedStatusFilter == "IN_PROGRESS" {
                matchesStatus = v.status.caseInsensitiveCompare("IN_PROGRESS") == .orderedSame || v.status.caseInsensitiveCompare("PENDING") == .orderedSame
            } else if selectedStatusFilter == "COMPLETED" {
                matchesStatus = v.status.caseInsensitiveCompare("COMPLETED") == .orderedSame || v.status.caseInsensitiveCompare("APPROVED") == .orderedSame
            } else if selectedStatusFilter == "NO_TESTS" {
                matchesStatus = v.status.caseInsensitiveCompare("NO_TESTS") == .orderedSame
            }

            return matchesSearch && matchesStatus
        }

        tableView.reloadData()
        emptyStateView.isHidden = !filteredVisits.isEmpty
        tableView.isHidden = filteredVisits.isEmpty
    }

    // ── Table View Data Source & Delegate ────────────────────────────────────
    func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        return filteredVisits.count
    }

    func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let cell = tableView.dequeueReusableCell(withIdentifier: "WorklistCardCell", for: indexPath)
        cell.backgroundColor = .clear
        cell.selectionStyle = .none
        cell.contentView.subviews.forEach { $0.removeFromSuperview() }

        let visit = filteredVisits[indexPath.row]

        let card = UIView()
        card.backgroundColor = .white
        card.layer.cornerRadius = 18
        card.layer.shadowColor = UIColor(red: 0.05, green: 0.15, blue: 0.30, alpha: 1).cgColor
        card.layer.shadowOpacity = 0.05
        card.layer.shadowRadius = 5
        card.layer.shadowOffset = CGSize(width: 0, height: 2)
        card.layer.borderWidth = 1
        card.layer.borderColor = UIColor(red: 0.92, green: 0.94, blue: 0.97, alpha: 1).cgColor
        card.translatesAutoresizingMaskIntoConstraints = false
        cell.contentView.addSubview(card)

        // Visit ID Pill
        let visitPill = UILabel()
        visitPill.text = " \(visit.visitId) "
        visitPill.font = .monospacedSystemFont(ofSize: 11.5, weight: .bold)
        visitPill.textColor = UIColor(red: 0.059, green: 0.090, blue: 0.165, alpha: 1)
        visitPill.backgroundColor = UIColor(red: 0.94, green: 0.96, blue: 0.98, alpha: 1)
        visitPill.layer.cornerRadius = 8
        visitPill.clipsToBounds = true

        // TAT Badge
        let tatBadge = UILabel()
        tatBadge.text = " \(visit.tatFormatted.trimmingCharacters(in: .whitespaces)) "
        tatBadge.font = .systemFont(ofSize: 11, weight: .bold)
        tatBadge.textColor = visit.tatColor
        tatBadge.backgroundColor = UIColor(red: 0.93, green: 0.99, blue: 0.96, alpha: 1)
        tatBadge.layer.cornerRadius = 8
        tatBadge.clipsToBounds = true

        // Status Badge
        let statusBadge = UILabel()
        statusBadge.font = .systemFont(ofSize: 11, weight: .bold)
        statusBadge.layer.cornerRadius = 8
        statusBadge.clipsToBounds = true

        let st = visit.status.uppercased()
        if st == "COMPLETED" || st == "APPROVED" {
            statusBadge.text = " Ready & Approved "
            statusBadge.textColor = UIColor(red: 0.02, green: 0.59, blue: 0.41, alpha: 1)
            statusBadge.backgroundColor = UIColor(red: 0.93, green: 0.99, blue: 0.96, alpha: 1)
        } else if st == "NO_TESTS" {
            statusBadge.text = " Registered Only "
            statusBadge.textColor = UIColor(red: 0.39, green: 0.45, blue: 0.55, alpha: 1)
            statusBadge.backgroundColor = UIColor(red: 0.94, green: 0.96, blue: 0.98, alpha: 1)
        } else if st == "PROCESSING" || st == "IN_PROGRESS" || st == "TESTING" {
            statusBadge.text = " In Testing / Progress "
            statusBadge.textColor = UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1)
            statusBadge.backgroundColor = UIColor(red: 0.937, green: 0.965, blue: 1.0, alpha: 1)
        } else {
            statusBadge.text = " Accepted / Queued "
            statusBadge.textColor = UIColor(red: 0.863, green: 0.149, blue: 0.149, alpha: 1)
            statusBadge.backgroundColor = UIColor(red: 0.996, green: 0.949, blue: 0.949, alpha: 1)
        }

        // Standardized Patient Avatar
        let avatarIV = PatientAvatarHelper.createAvatar(size: 36)

        // Patient Name & Details
        let nameLbl = UILabel()
        nameLbl.text = visit.patientName
        nameLbl.font = .systemFont(ofSize: 15.5, weight: .bold)
        nameLbl.textColor = UIColor(red: 0.059, green: 0.090, blue: 0.165, alpha: 1)

        let detailsLbl = UILabel()
        detailsLbl.text = visit.patientDetails
        detailsLbl.font = .systemFont(ofSize: 11.5, weight: .medium)
        detailsLbl.textColor = UIColor(red: 0.392, green: 0.451, blue: 0.549, alpha: 1)

        let doctorLbl = UILabel()
        let isRealDoctor = !visit.doctor.isEmpty && !visit.doctor.lowercased().contains("self")
        if isRealDoctor {
            doctorLbl.text = "  \(visit.doctor)  "
            doctorLbl.textColor = UIColor(red: 0.059, green: 0.090, blue: 0.165, alpha: 1) // Black / Deep slate #0F172A
            doctorLbl.backgroundColor = UIColor(red: 0.996, green: 0.941, blue: 0.541, alpha: 1) // Yellow #FEF08A
        } else {
            doctorLbl.text = "  \(visit.doctor)  "
            doctorLbl.textColor = UIColor(red: 0.392, green: 0.455, blue: 0.545, alpha: 1)
            doctorLbl.backgroundColor = UIColor(red: 0.945, green: 0.961, blue: 0.976, alpha: 1)
        }
        doctorLbl.font = .systemFont(ofSize: 11.5, weight: .bold)
        doctorLbl.layer.cornerRadius = 6
        doctorLbl.layer.masksToBounds = true

        // Tests Box
        let testsBox = UIView()
        testsBox.backgroundColor = UIColor(red: 0.97, green: 0.98, blue: 0.99, alpha: 1)
        testsBox.layer.cornerRadius = 10
        testsBox.layer.borderWidth = 1
        testsBox.layer.borderColor = UIColor(red: 0.91, green: 0.93, blue: 0.96, alpha: 1).cgColor
        testsBox.isUserInteractionEnabled = false

        let testsLbl = UILabel()
        testsLbl.attributedText = formatTestsAttributed(visit.testsList)
        testsLbl.numberOfLines = 0

        let finLbl = UILabel()
        finLbl.text = visit.financials
        finLbl.font = .systemFont(ofSize: 11, weight: .medium)
        finLbl.textColor = UIColor(red: 0.39, green: 0.45, blue: 0.55, alpha: 1)

        [testsLbl, finLbl].forEach {
            $0.translatesAutoresizingMaskIntoConstraints = false
            testsBox.addSubview($0)
        }

        NSLayoutConstraint.activate([
            testsLbl.topAnchor.constraint(equalTo: testsBox.topAnchor, constant: 8),
            testsLbl.leadingAnchor.constraint(equalTo: testsBox.leadingAnchor, constant: 10),
            testsLbl.trailingAnchor.constraint(equalTo: testsBox.trailingAnchor, constant: -10),

            finLbl.topAnchor.constraint(equalTo: testsLbl.bottomAnchor, constant: 4),
            finLbl.leadingAnchor.constraint(equalTo: testsLbl.leadingAnchor),
            finLbl.bottomAnchor.constraint(equalTo: testsBox.bottomAnchor, constant: -8),
        ])

        // Action Buttons
        let resultsBtn = UIButton(type: .system)
        resultsBtn.setTitle(st == "COMPLETED" ? "Edit Results" : "Enter Results", for: .normal)
        resultsBtn.setTitleColor(UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1), for: .normal)
        resultsBtn.titleLabel?.font = .systemFont(ofSize: 12, weight: .bold)
        resultsBtn.backgroundColor = UIColor(red: 0.937, green: 0.965, blue: 1.0, alpha: 1)
        resultsBtn.layer.cornerRadius = 10
        resultsBtn.tag = indexPath.row
        resultsBtn.addTarget(self, action: #selector(didTapResultsEntry(_:)), for: .touchUpInside)

        let reportBtn = UIButton(type: .system)
        reportBtn.setTitle("Report", for: .normal)
        reportBtn.setTitleColor(UIColor(red: 0.02, green: 0.59, blue: 0.41, alpha: 1), for: .normal)
        reportBtn.titleLabel?.font = .systemFont(ofSize: 12, weight: .bold)
        reportBtn.backgroundColor = UIColor(red: 0.93, green: 0.99, blue: 0.96, alpha: 1)
        reportBtn.layer.cornerRadius = 10
        reportBtn.tag = indexPath.row
        reportBtn.addTarget(self, action: #selector(didTapViewReport(_:)), for: .touchUpInside)
        reportBtn.isHidden = (st == "NO_TESTS")

        let invoiceBtn = UIButton(type: .system)
        invoiceBtn.setImage(UIImage(systemName: "doc.text.fill"), for: .normal)
        invoiceBtn.tintColor = UIColor(red: 0.28, green: 0.33, blue: 0.41, alpha: 1)
        invoiceBtn.backgroundColor = UIColor(red: 0.945, green: 0.961, blue: 0.976, alpha: 1)
        invoiceBtn.layer.cornerRadius = 10
        invoiceBtn.tag = indexPath.row
        invoiceBtn.addTarget(self, action: #selector(didTapInvoiceSlip(_:)), for: .touchUpInside)

        let waBtn = UIButton(type: .system)
        waBtn.setImage(UIImage(systemName: "message.fill"), for: .normal)
        waBtn.tintColor = UIColor(red: 0.145, green: 0.831, blue: 0.400, alpha: 1)
        waBtn.backgroundColor = UIColor(red: 0.86, green: 0.99, blue: 0.91, alpha: 1)
        waBtn.layer.cornerRadius = 10
        waBtn.tag = indexPath.row
        waBtn.addTarget(self, action: #selector(didTapWhatsapp(_:)), for: .touchUpInside)

        let btnStack = UIStackView(arrangedSubviews: [resultsBtn, reportBtn, invoiceBtn, waBtn])
        btnStack.axis = .horizontal
        btnStack.spacing = 6
        btnStack.distribution = .fillProportionally

        NSLayoutConstraint.activate([
            invoiceBtn.widthAnchor.constraint(equalToConstant: 38),
            waBtn.widthAnchor.constraint(equalToConstant: 38),
        ])

        [visitPill, tatBadge, statusBadge, avatarIV, nameLbl, detailsLbl, doctorLbl, testsBox, btnStack].forEach {
            $0.translatesAutoresizingMaskIntoConstraints = false
            card.addSubview($0)
        }

        NSLayoutConstraint.activate([
            card.topAnchor.constraint(equalTo: cell.contentView.topAnchor, constant: 5),
            card.leadingAnchor.constraint(equalTo: cell.contentView.leadingAnchor, constant: 8),
            card.trailingAnchor.constraint(equalTo: cell.contentView.trailingAnchor, constant: -8),
            card.bottomAnchor.constraint(equalTo: cell.contentView.bottomAnchor, constant: -5),

            visitPill.topAnchor.constraint(equalTo: card.topAnchor, constant: 14),
            visitPill.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 14),

            tatBadge.centerYAnchor.constraint(equalTo: visitPill.centerYAnchor),
            tatBadge.leadingAnchor.constraint(equalTo: visitPill.trailingAnchor, constant: 6),

            statusBadge.centerYAnchor.constraint(equalTo: visitPill.centerYAnchor),
            statusBadge.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -14),

            avatarIV.topAnchor.constraint(equalTo: visitPill.bottomAnchor, constant: 10),
            avatarIV.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 14),

            nameLbl.topAnchor.constraint(equalTo: avatarIV.topAnchor),
            nameLbl.leadingAnchor.constraint(equalTo: avatarIV.trailingAnchor, constant: 10),
            nameLbl.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -14),

            detailsLbl.topAnchor.constraint(equalTo: nameLbl.bottomAnchor, constant: 2),
            detailsLbl.leadingAnchor.constraint(equalTo: nameLbl.leadingAnchor),

            doctorLbl.topAnchor.constraint(equalTo: avatarIV.bottomAnchor, constant: 8),
            doctorLbl.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 14),

            testsBox.topAnchor.constraint(equalTo: doctorLbl.bottomAnchor, constant: 8),
            testsBox.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 14),
            testsBox.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -14),

            btnStack.topAnchor.constraint(equalTo: testsBox.bottomAnchor, constant: 12),
            btnStack.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 14),
            btnStack.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -14),
            btnStack.bottomAnchor.constraint(equalTo: card.bottomAnchor, constant: -14),
            btnStack.heightAnchor.constraint(equalToConstant: 38),
        ])

        return cell
    }

    func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        tableView.deselectRow(at: indexPath, animated: true)
        guard indexPath.row < filteredVisits.count else { return }
        let visit = filteredVisits[indexPath.row]
        openReportPreview(for: visit)
    }

    // ── Action Handlers ──────────────────────────────────────────────────────
    @objc private func didTapResultsEntry(_ sender: UIButton) {
        guard sender.tag < filteredVisits.count else { return }
        let visit = filteredVisits[sender.tag]
        let resultsVC = ResultsViewController()
        resultsVC.targetInvoiceId = visit.invoiceId
        if let nav = navigationController {
            nav.pushViewController(resultsVC, animated: true)
        } else {
            present(resultsVC, animated: true)
        }
    }

    private func openReportPreview(for visit: PatientVisitRecord) {
        let previewVC = ReportPreviewViewController()
        let pId = visit.patientDbId ?? ""
        let targetId = !pId.isEmpty ? pId : ((visit.invoiceId != nil && !visit.invoiceId!.isEmpty) ? visit.invoiceId! : (visit.reportId ?? visit.visitId))
        previewVC.reportId = targetId
        previewVC.patientDbId = pId
        previewVC.invoiceId = visit.invoiceId ?? ""
        previewVC.uhid = visit.uhid ?? ""
        previewVC.patientName = visit.patientName
        previewVC.patientPhone = visit.patientPhone ?? ""
        previewVC.testName = visit.testName ?? "Clinical Diagnostic Investigation"
        previewVC.modalPresentationStyle = .fullScreen
        present(previewVC, animated: true, completion: nil)
    }

    @objc private func didTapViewReport(_ sender: UIButton) {
        guard sender.tag < filteredVisits.count else { return }
        let visit = filteredVisits[sender.tag]
        openReportPreview(for: visit)
    }

    private func formatTestsAttributed(_ rawTests: String) -> NSAttributedString {
        guard !rawTests.isEmpty else { return NSAttributedString(string: "") }
        let result = NSMutableAttributedString()
        let items = rawTests.components(separatedBy: "  •  ")
        
        let bulletAttr: [NSAttributedString.Key: Any] = [
            .font: UIFont.systemFont(ofSize: 12, weight: .regular),
            .foregroundColor: UIColor(red: 0.6, green: 0.65, blue: 0.7, alpha: 1)
        ]
        let nameAttr: [NSAttributedString.Key: Any] = [
            .font: UIFont.systemFont(ofSize: 12.5, weight: .semibold),
            .foregroundColor: UIColor(red: 0.059, green: 0.090, blue: 0.165, alpha: 1)
        ]

        let pattern = try? NSRegularExpression(pattern: #"^(.*?)\s*\[(Ready|Approved|Pending|Accepted|Processing|Testing|In Testing|In Progress)\]$"#, options: .caseInsensitive)

        for item in items {
            let trimmed = item.trimmingCharacters(in: .whitespacesAndNewlines)
            if trimmed.isEmpty { continue }

            if result.length > 0 {
                result.append(NSAttributedString(string: "  •  ", attributes: bulletAttr))
            }

            let nsItem = trimmed as NSString
            let match = pattern?.firstMatch(in: trimmed, options: [], range: NSRange(location: 0, length: nsItem.length))

            if let match = match, match.numberOfRanges >= 3 {
                let testName = nsItem.substring(with: match.range(at: 1)).trimmingCharacters(in: .whitespaces)
                let status = nsItem.substring(with: match.range(at: 2)).trimmingCharacters(in: .whitespaces)

                result.append(NSAttributedString(string: "\(testName) ", attributes: nameAttr))

                let bg: UIColor
                let fg: UIColor
                let stLower = status.lowercased()
                if stLower == "ready" || stLower == "approved" {
                    bg = UIColor(red: 0.863, green: 0.988, blue: 0.906, alpha: 1) // #DCFCE7 Green
                    fg = UIColor(red: 0.082, green: 0.502, blue: 0.239, alpha: 1) // #15803D Deep Green
                } else if stLower == "pending" || stLower == "accepted" {
                    bg = UIColor(red: 0.953, green: 0.910, blue: 1.0, alpha: 1)   // #F3E8FF Purple
                    fg = UIColor(red: 0.420, green: 0.129, blue: 0.659, alpha: 1) // #6B21A8 Deep Purple
                } else {
                    bg = UIColor(red: 0.937, green: 0.965, blue: 1.0, alpha: 1)   // #EFF6FF Blue
                    fg = UIColor(red: 0.114, green: 0.306, blue: 0.847, alpha: 1) // #1D4ED8 Deep Blue
                }

                let badgeAttr: [NSAttributedString.Key: Any] = [
                    .font: UIFont.systemFont(ofSize: 10.5, weight: .bold),
                    .foregroundColor: fg,
                    .backgroundColor: bg
                ]
                result.append(NSAttributedString(string: " \(status) ", attributes: badgeAttr))
            } else {
                result.append(NSAttributedString(string: trimmed, attributes: nameAttr))
            }
        }
        return result
    }

    @objc private func didTapInvoiceSlip(_ sender: UIButton) {
        let visit = filteredVisits[sender.tag]
        let alert = UIAlertController(
            title: "Patient Visit Summary: \(visit.visitId)",
            message: "Patient: \(visit.patientName)\nDetails: \(visit.patientDetails)\nDoctor: \(visit.doctor)\n\nInvestigation Tests:\n\(visit.testsList)\n\n\(visit.financials)\nTAT: \(visit.tatFormatted)",
            preferredStyle: .alert
        )
        alert.addAction(UIAlertAction(title: "View Report", style: .default, handler: { [weak self] _ in
            self?.didTapViewReport(sender)
        }))
        alert.addAction(UIAlertAction(title: "Close", style: .cancel, handler: nil))
        present(alert, animated: true, completion: nil)
    }

    @objc private func didTapWhatsapp(_ sender: UIButton) {
        let visit = filteredVisits[sender.tag]
        let msg = "Hello \(visit.patientName), your test investigations for Visit #\(visit.visitId) have been registered at PathoLab Cloud. Track live at: https://patholab.cloud"
        if let url = URL(string: "https://api.whatsapp.com/send?text=\(msg.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? "")") {
            UIApplication.shared.open(url, options: [:], completionHandler: nil)
        }
    }

    @objc private func didTapBack() {
        if let nav = navigationController, nav.viewControllers.count > 1 {
            nav.popViewController(animated: true)
        } else {
            dismiss(animated: true, completion: nil)
        }
    }

    @objc private func didTapRefresh() {
        fetchPatientWorklist()
    }
}
