import UIKit

// ─────────────────────────────────────────────────────────────────────────────
// MARK: – Data Models
// ─────────────────────────────────────────────────────────────────────────────
struct DiagnosticReportItem {
    let id: String
    var version: Int
    var status: String // FINAL, APPROVED, SENT, DRAFT, AMENDED
    let pdfUrl: String?
    var isAmended: Bool
    var amendmentReason: String?
    let createdAt: String
    let patientName: String
    let patientPhone: String
    let patientEmail: String
    let patientAge: String
    let patientGender: String
    let uhid: String
    let testName: String
    let testCode: String
    let departmentName: String
    let pathologistName: String
}

struct ReportsKpiStats {
    var readyCount: Int = 0
    var sentCount: Int = 0
    var draftCount: Int = 0
    var amendedCount: Int = 0
}

// ─────────────────────────────────────────────────────────────────────────────
// MARK: – Native Diagnostic Reports & Dispatch Controller (iOS)
// ─────────────────────────────────────────────────────────────────────────────
class ReportsViewController: UIViewController, UITableViewDataSource, UITableViewDelegate, UITextFieldDelegate {

    private let baseUrl = "https://app.patholab.cloud"

    private var allReports: [DiagnosticReportItem] = []
    private var filteredReports: [DiagnosticReportItem] = []
    private var kpiStats = ReportsKpiStats()

    private var selectedStatusFilter = "PRINT_READY"

    // UI Elements
    private let topHeaderView      = UIView()
    private let subLbl             = UILabel()
    private let kpiScrollView      = UIScrollView()
    private let kpiStack           = UIStackView()
    private let searchField        = UITextField()
    private let filterScrollView   = UIScrollView()
    private let filterChipsStack   = UIStackView()
    private let tableView          = UITableView()
    private let spinner            = UIActivityIndicatorView(style: .medium)
    private let emptyStateView     = UIView()

    // KPI Labels
    private let lblReadyCount   = UILabel()
    private let lblSentCount    = UILabel()
    private let lblDraftCount   = UILabel()
    private let lblAmendedCount = UILabel()

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 0.973, green: 0.980, blue: 0.988, alpha: 1) // #F8FAFC

        setupHeader()
        setupKpiRow()
        setupSearchAndFilters()
        setupTableView()
        setupEmptyState()

        fetchReports()
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        fetchReports()
    }

    override var preferredStatusBarStyle: UIStatusBarStyle {
        return .lightContent
    }

    // ── Header Setup ─────────────────────────────────────────────────────────
    private func setupHeader() {
        topHeaderView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(topHeaderView)

        let gradient = CAGradientLayer()
        gradient.colors = [
            UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1).cgColor,
            UIColor(red: 0.118, green: 0.251, blue: 0.686, alpha: 1).cgColor
        ]
        gradient.startPoint = CGPoint(x: 0, y: 0)
        gradient.endPoint = CGPoint(x: 1, y: 1)
        topHeaderView.layer.insertSublayer(gradient, at: 0)

        let backBtn = UIButton(type: .system)
        backBtn.setImage(UIImage(systemName: "chevron.left"), for: .normal)
        backBtn.tintColor = UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1)
        backBtn.backgroundColor = .white
        backBtn.layer.cornerRadius = 19
        backBtn.addTarget(self, action: #selector(didTapBack), for: .touchUpInside)
        backBtn.translatesAutoresizingMaskIntoConstraints = false
        topHeaderView.addSubview(backBtn)

        let titleLbl = UILabel()
        titleLbl.text = "Report Dispatch"
        titleLbl.font = .systemFont(ofSize: 20, weight: .bold)
        titleLbl.textColor = .white
        titleLbl.translatesAutoresizingMaskIntoConstraints = false
        topHeaderView.addSubview(titleLbl)

        let subLbl = UILabel()
        subLbl.text = "Download, print, amend, and share verified reports with patients."
        subLbl.font = .systemFont(ofSize: 11.5, weight: .medium)
        subLbl.textColor = UIColor(red: 0.78, green: 0.87, blue: 1.0, alpha: 1)
        subLbl.translatesAutoresizingMaskIntoConstraints = false
        topHeaderView.addSubview(subLbl)

        let refreshBtn = UIButton(type: .system)
        refreshBtn.setImage(UIImage(systemName: "arrow.clockwise"), for: .normal)
        refreshBtn.tintColor = .white
        refreshBtn.backgroundColor = UIColor.white.withAlphaComponent(0.20)
        refreshBtn.layer.cornerRadius = 18
        refreshBtn.addTarget(self, action: #selector(didTapRefresh), for: .touchUpInside)
        refreshBtn.translatesAutoresizingMaskIntoConstraints = false
        topHeaderView.addSubview(refreshBtn)

        NSLayoutConstraint.activate([
            topHeaderView.topAnchor.constraint(equalTo: view.topAnchor),
            topHeaderView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            topHeaderView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            topHeaderView.heightAnchor.constraint(equalToConstant: 104),

            backBtn.leadingAnchor.constraint(equalTo: topHeaderView.leadingAnchor, constant: 16),
            backBtn.bottomAnchor.constraint(equalTo: topHeaderView.bottomAnchor, constant: -10),
            backBtn.widthAnchor.constraint(equalToConstant: 38),
            backBtn.heightAnchor.constraint(equalToConstant: 38),

            titleLbl.leadingAnchor.constraint(equalTo: backBtn.trailingAnchor, constant: 12),
            titleLbl.topAnchor.constraint(equalTo: backBtn.topAnchor, constant: -2),
            titleLbl.trailingAnchor.constraint(lessThanOrEqualTo: refreshBtn.leadingAnchor, constant: -8),

            subLbl.leadingAnchor.constraint(equalTo: titleLbl.leadingAnchor),
            subLbl.topAnchor.constraint(equalTo: titleLbl.bottomAnchor, constant: 2),
            subLbl.trailingAnchor.constraint(lessThanOrEqualTo: refreshBtn.leadingAnchor, constant: -8),

            refreshBtn.trailingAnchor.constraint(equalTo: topHeaderView.trailingAnchor, constant: -16),
            refreshBtn.centerYAnchor.constraint(equalTo: backBtn.centerYAnchor),
            refreshBtn.widthAnchor.constraint(equalToConstant: 36),
            refreshBtn.heightAnchor.constraint(equalToConstant: 36),
        ])
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        if let g = topHeaderView.layer.sublayers?.first as? CAGradientLayer {
            g.frame = topHeaderView.bounds
        }
    }

    // ── KPI Row ──────────────────────────────────────────────────────────────
    private func setupKpiRow() {
        kpiScrollView.showsHorizontalScrollIndicator = false
        kpiScrollView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(kpiScrollView)

        kpiStack.axis = .horizontal
        kpiStack.spacing = 10
        kpiStack.translatesAutoresizingMaskIntoConstraints = false
        kpiScrollView.addSubview(kpiStack)

        NSLayoutConstraint.activate([
            kpiScrollView.topAnchor.constraint(equalTo: topHeaderView.bottomAnchor, constant: 12),
            kpiScrollView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            kpiScrollView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            kpiScrollView.heightAnchor.constraint(equalToConstant: 92),

            kpiStack.topAnchor.constraint(equalTo: kpiScrollView.topAnchor),
            kpiStack.bottomAnchor.constraint(equalTo: kpiScrollView.bottomAnchor),
            kpiStack.leadingAnchor.constraint(equalTo: kpiScrollView.leadingAnchor, constant: 16),
            kpiStack.trailingAnchor.constraint(equalTo: kpiScrollView.trailingAnchor, constant: -16),
        ])

        kpiStack.addArrangedSubview(makeKpiCard(title: "PRINT READY", valueLbl: lblReadyCount, valueColor: UIColor(red: 0.02, green: 0.59, blue: 0.41, alpha: 1), subText: "Verified & Signed"))
        kpiStack.addArrangedSubview(makeKpiCard(title: "DRAFTS", valueLbl: lblDraftCount, valueColor: UIColor(red: 0.85, green: 0.47, blue: 0.02, alpha: 1), subText: "Pending Doctor Sign"))
        kpiStack.addArrangedSubview(makeKpiCard(title: "SENT", valueLbl: lblSentCount, valueColor: UIColor(red: 0.05, green: 0.43, blue: 0.99, alpha: 1), subText: "Dispatched to Patient"))
        kpiStack.addArrangedSubview(makeKpiCard(title: "AMENDED", valueLbl: lblAmendedCount, valueColor: UIColor(red: 0.49, green: 0.23, blue: 0.93, alpha: 1), subText: "Revision History v2+"))
    }

    private func makeKpiCard(title: String, valueLbl: UILabel, valueColor: UIColor, subText: String) -> UIView {
        let card = UIView()
        card.backgroundColor = .white
        card.layer.cornerRadius = 16
        card.layer.shadowColor = UIColor(red: 0.05, green: 0.15, blue: 0.30, alpha: 1).cgColor
        card.layer.shadowOpacity = 0.05
        card.layer.shadowRadius = 5
        card.layer.shadowOffset = CGSize(width: 0, height: 2)
        card.layer.borderWidth = 1
        card.layer.borderColor = UIColor(red: 0.92, green: 0.94, blue: 0.97, alpha: 1).cgColor
        card.translatesAutoresizingMaskIntoConstraints = false
        card.widthAnchor.constraint(equalToConstant: 156).isActive = true

        let tLbl = UILabel()
        tLbl.text = title
        tLbl.font = .systemFont(ofSize: 10, weight: .bold)
        tLbl.textColor = UIColor(red: 0.39, green: 0.45, blue: 0.55, alpha: 1)

        valueLbl.text = "0"
        valueLbl.font = .systemFont(ofSize: 20, weight: .bold)
        valueLbl.textColor = valueColor

        let sLbl = UILabel()
        sLbl.text = subText
        sLbl.font = .systemFont(ofSize: 11, weight: .medium)
        sLbl.textColor = UIColor(red: 0.58, green: 0.64, blue: 0.72, alpha: 1)

        [tLbl, valueLbl, sLbl].forEach {
            $0.translatesAutoresizingMaskIntoConstraints = false
            card.addSubview($0)
        }

        NSLayoutConstraint.activate([
            tLbl.topAnchor.constraint(equalTo: card.topAnchor, constant: 12),
            tLbl.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 14),
            tLbl.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -14),

            valueLbl.topAnchor.constraint(equalTo: tLbl.bottomAnchor, constant: 4),
            valueLbl.leadingAnchor.constraint(equalTo: tLbl.leadingAnchor),

            sLbl.topAnchor.constraint(equalTo: valueLbl.bottomAnchor, constant: 2),
            sLbl.leadingAnchor.constraint(equalTo: tLbl.leadingAnchor),
        ])

        return card
    }

    // ── Search & Filters ─────────────────────────────────────────────────────
    private func setupSearchAndFilters() {
        searchField.placeholder = "Search by patient, phone, test..."
        searchField.font = .systemFont(ofSize: 14, weight: .medium)
        searchField.backgroundColor = .white
        searchField.layer.cornerRadius = 14
        searchField.layer.borderWidth = 1
        searchField.layer.borderColor = UIColor(red: 0.89, green: 0.91, blue: 0.95, alpha: 1).cgColor
        searchField.clearButtonMode = .whileEditing
        searchField.delegate = self
        searchField.addTarget(self, action: #selector(didSearchReports), for: .editingChanged)

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
            searchField.topAnchor.constraint(equalTo: kpiScrollView.bottomAnchor, constant: 8),
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
            ("PRINT_READY", "Print Ready"),
            ("ALL", "All"),
            ("DRAFT", "Draft"),
            ("SENT", "Sent"),
            ("AMENDED", "Amended")
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
        let keys = ["PRINT_READY", "ALL", "DRAFT", "SENT", "AMENDED"]
        if sender.tag < keys.count {
            selectedStatusFilter = keys[sender.tag]
            setupFilterChips()
            applyReportsFilter()
        }
    }

    @objc private func didSearchReports() {
        applyReportsFilter()
    }

    // ── Table View ───────────────────────────────────────────────────────────
    private func setupTableView() {
        tableView.backgroundColor = .clear
        tableView.separatorStyle = .none
        tableView.dataSource = self
        tableView.delegate = self
        tableView.register(UITableViewCell.self, forCellReuseIdentifier: "ReportCardCell")
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
        title.text = "No Reports Found"
        title.font = .systemFont(ofSize: 17, weight: .bold)
        title.textColor = UIColor(red: 0.059, green: 0.090, blue: 0.165, alpha: 1)

        let sub = UILabel()
        sub.text = "No diagnostic reports matched your search or filter."
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
                let name = json["name"] as? String ?? "Lab Owner"
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

    private func fetchReports() {
        fetchUserInfo()
        spinner.startAnimating()
        guard let url = URL(string: baseUrl + "/api/workspace/reports") else { return }
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

            if let data = data,
               let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
               let arr = json["reports"] as? [[String: Any]] {

                var loaded: [DiagnosticReportItem] = []
                for r in arr {
                    let patient = r["patient"] as? [String: Any]
                    let pName = patient?["name"] as? String ?? "Patient"
                    let pPhone = patient?["phone"] as? String ?? ""
                    let pEmail = patient?["email"] as? String ?? ""
                    let pAge = "\(patient?["age"] ?? "")"
                    let pGender = patient?["gender"] as? String ?? ""
                    let pUhid = patient?["patientId"] as? String ?? patient?["uhid"] as? String ?? "P-00001"

                    let test = r["test"] as? [String: Any]
                    let tName = test?["testName"] as? String ?? test?["name"] as? String ?? "Diagnostic Investigation"
                    let tCode = test?["testCode"] as? String ?? test?["testNumber"] as? String ?? "LAB-001"
                    let dept = test?["department"] as? [String: Any]
                    let dName = dept?["name"] as? String ?? "General Pathology"

                    let path = r["pathologist"] as? [String: Any]
                    let pathName = path?["name"] as? String ?? "Pathologist"

                    loaded.append(DiagnosticReportItem(
                        id: r["id"] as? String ?? UUID().uuidString,
                        version: (r["version"] as? Int) ?? 1,
                        status: r["status"] as? String ?? "APPROVED",
                        pdfUrl: r["pdfUrl"] as? String,
                        isAmended: (r["isAmended"] as? Bool) ?? false,
                        amendmentReason: r["amendmentReason"] as? String,
                        createdAt: "Today",
                        patientName: pName,
                        patientPhone: pPhone,
                        patientEmail: pEmail,
                        patientAge: pAge,
                        patientGender: pGender,
                        uhid: pUhid,
                        testName: tName,
                        testCode: tCode,
                        departmentName: dName,
                        pathologistName: pathName
                    ))
                }

                DispatchQueue.main.async {
                    self.allReports = loaded
                    self.updateKpiStats()
                    self.applyReportsFilter()
                }
                return
            }

            DispatchQueue.main.async {
                self.allReports = []
                self.updateKpiStats()
                self.applyReportsFilter()
            }
        }.resume()
    }

    private func updateKpiStats() {
        var ready = 0, sent = 0, draft = 0, amended = 0
        for r in allReports {
            let s = r.status.uppercased()
            if s == "FINAL" || s == "APPROVED" { ready += 1 }
            else if s == "SENT" || s == "SENT_TO_PATIENT" { sent += 1 }
            else if s == "DRAFT" || s == "GENERATED" { draft += 1 }
            else if s == "AMENDED" || r.isAmended { amended += 1 }
        }

        lblReadyCount.text = "\(ready)"
        lblSentCount.text = "\(sent)"
        lblDraftCount.text = "\(draft)"
        lblAmendedCount.text = "\(amended)"
    }

    private func applyReportsFilter() {
        let q = searchField.text?.trimmingCharacters(in: .whitespacesAndNewlines).lowercased() ?? ""
        filteredReports = allReports.filter { r in
            let matchesSearch = q.isEmpty ||
                r.patientName.lowercased().contains(q) ||
                r.patientPhone.lowercased().contains(q) ||
                r.id.lowercased().contains(q) ||
                r.uhid.lowercased().contains(q) ||
                r.testName.lowercased().contains(q) ||
                r.testCode.lowercased().contains(q)

            var matchesStatus = true
            if selectedStatusFilter == "PRINT_READY" {
                matchesStatus = r.status.caseInsensitiveCompare("FINAL") == .orderedSame || r.status.caseInsensitiveCompare("APPROVED") == .orderedSame
            } else if selectedStatusFilter == "SENT" {
                matchesStatus = r.status.caseInsensitiveCompare("SENT") == .orderedSame || r.status.caseInsensitiveCompare("SENT_TO_PATIENT") == .orderedSame
            } else if selectedStatusFilter == "DRAFT" {
                matchesStatus = r.status.caseInsensitiveCompare("DRAFT") == .orderedSame || r.status.caseInsensitiveCompare("GENERATED") == .orderedSame
            } else if selectedStatusFilter == "AMENDED" {
                matchesStatus = r.status.caseInsensitiveCompare("AMENDED") == .orderedSame || r.isAmended
            }

            return matchesSearch && matchesStatus
        }

        tableView.reloadData()
        emptyStateView.isHidden = !filteredReports.isEmpty
        tableView.isHidden = filteredReports.isEmpty
    }

    // ── Table View Data Source & Delegate ────────────────────────────────────
    func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        return filteredReports.count
    }

    func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let cell = tableView.dequeueReusableCell(withIdentifier: "ReportCardCell", for: indexPath)
        cell.backgroundColor = .clear
        cell.selectionStyle = .none
        cell.contentView.subviews.forEach { $0.removeFromSuperview() }

        let report = filteredReports[indexPath.row]

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

        // Standardized Patient Avatar
        let avatarIV = PatientAvatarHelper.createAvatar(size: 38)

        let nameLbl = UILabel()
        nameLbl.text = report.patientName
        nameLbl.font = .systemFont(ofSize: 15.5, weight: .bold)
        nameLbl.textColor = UIColor(red: 0.059, green: 0.090, blue: 0.165, alpha: 1)

        let uhidLbl = UILabel()
        uhidLbl.text = "  \(report.uhid)  "
        uhidLbl.font = .systemFont(ofSize: 11.5, weight: .bold)
        uhidLbl.textColor = UIColor(red: 0.059, green: 0.090, blue: 0.165, alpha: 1) // Pure dark slate / black
        uhidLbl.backgroundColor = UIColor(red: 0.996, green: 0.941, blue: 0.541, alpha: 1) // #FEF08A Yellow Box Badge
        uhidLbl.layer.cornerRadius = 6
        uhidLbl.layer.borderWidth = 1
        uhidLbl.layer.borderColor = UIColor(red: 0.992, green: 0.878, blue: 0.278, alpha: 1).cgColor // #FDE047
        uhidLbl.clipsToBounds = true

        let statusBadge = UILabel()
        statusBadge.font = .systemFont(ofSize: 11.5, weight: .bold)
        statusBadge.layer.cornerRadius = 6
        statusBadge.clipsToBounds = true

        let s = report.status.uppercased()
        if s == "FINAL" || s == "APPROVED" {
            statusBadge.text = "  Approved  "
            statusBadge.textColor = UIColor(red: 0.078, green: 0.325, blue: 0.176, alpha: 1) // Deep Forest Green #14532D
            statusBadge.backgroundColor = UIColor(red: 0.863, green: 0.988, blue: 0.906, alpha: 1) // Soft Mint #DCFCE7
            statusBadge.layer.borderWidth = 1
            statusBadge.layer.borderColor = UIColor(red: 0.525, green: 0.937, blue: 0.675, alpha: 1).cgColor // #86EFAC
        } else if s == "SENT" || s == "SENT_TO_PATIENT" {
            statusBadge.text = "  Sent  "
            statusBadge.textColor = UIColor(red: 0.05, green: 0.43, blue: 0.99, alpha: 1)
            statusBadge.backgroundColor = UIColor(red: 0.93, green: 0.96, blue: 1.0, alpha: 1)
            statusBadge.layer.borderWidth = 1
            statusBadge.layer.borderColor = UIColor(red: 0.75, green: 0.86, blue: 1.0, alpha: 1).cgColor
        } else if s == "AMENDED" || report.isAmended {
            statusBadge.text = "  Amended (V\(report.version))  "
            statusBadge.textColor = UIColor(red: 0.49, green: 0.23, blue: 0.93, alpha: 1)
            statusBadge.backgroundColor = UIColor(red: 0.96, green: 0.94, blue: 1.0, alpha: 1)
            statusBadge.layer.borderWidth = 1
            statusBadge.layer.borderColor = UIColor(red: 0.82, green: 0.74, blue: 0.98, alpha: 1).cgColor
        } else {
            statusBadge.text = "  Draft  "
            statusBadge.textColor = UIColor(red: 0.85, green: 0.47, blue: 0.02, alpha: 1)
            statusBadge.backgroundColor = UIColor(red: 1.0, green: 0.95, blue: 0.88, alpha: 1)
            statusBadge.layer.borderWidth = 1
            statusBadge.layer.borderColor = UIColor(red: 0.99, green: 0.82, blue: 0.64, alpha: 1).cgColor
        }

        // Test Pill View
        let testBox = UIView()
        testBox.backgroundColor = UIColor(red: 0.96, green: 0.97, blue: 0.99, alpha: 1)
        testBox.layer.cornerRadius = 10
        testBox.layer.borderWidth = 1
        testBox.layer.borderColor = UIColor(red: 0.89, green: 0.92, blue: 0.97, alpha: 1).cgColor

        let testNameLbl = UILabel()
        testNameLbl.text = report.testName
        testNameLbl.font = .systemFont(ofSize: 13.5, weight: .bold)
        testNameLbl.textColor = UIColor(red: 0.12, green: 0.16, blue: 0.23, alpha: 1)

        let testCodeLbl = UILabel()
        testCodeLbl.text = report.testCode
        testCodeLbl.font = .systemFont(ofSize: 11.5, weight: .medium)
        testCodeLbl.textColor = UIColor(red: 0.39, green: 0.45, blue: 0.55, alpha: 1)

        let verBadge = UILabel()
        verBadge.text = String(format: "  V%02d  ", report.version)
        verBadge.font = .systemFont(ofSize: 11, weight: .bold)
        verBadge.textColor = .white // Pure White text
        verBadge.backgroundColor = UIColor(red: 0.114, green: 0.306, blue: 0.847, alpha: 1.0) // Solid Sapphire #1D4ED8
        verBadge.layer.cornerRadius = 6
        verBadge.clipsToBounds = true

        [testNameLbl, testCodeLbl, verBadge].forEach {
            $0.translatesAutoresizingMaskIntoConstraints = false
            testBox.addSubview($0)
        }

        NSLayoutConstraint.activate([
            testNameLbl.topAnchor.constraint(equalTo: testBox.topAnchor, constant: 6),
            testNameLbl.leadingAnchor.constraint(equalTo: testBox.leadingAnchor, constant: 10),
            testNameLbl.trailingAnchor.constraint(lessThanOrEqualTo: verBadge.leadingAnchor, constant: -8),

            testCodeLbl.topAnchor.constraint(equalTo: testNameLbl.bottomAnchor, constant: 1),
            testCodeLbl.leadingAnchor.constraint(equalTo: testNameLbl.leadingAnchor),
            testCodeLbl.bottomAnchor.constraint(equalTo: testBox.bottomAnchor, constant: -6),

            verBadge.centerYAnchor.constraint(equalTo: testBox.centerYAnchor),
            verBadge.trailingAnchor.constraint(equalTo: testBox.trailingAnchor, constant: -10),
        ])

        let dateLbl = UILabel()
        dateLbl.text = "📅 \(report.createdAt)"
        dateLbl.font = .systemFont(ofSize: 12, weight: .medium)
        dateLbl.textColor = UIColor(red: 0.392, green: 0.451, blue: 0.549, alpha: 1)

        // Modern Elevated Action Buttons
        let downloadBtn = UIButton(type: .system)
        downloadBtn.setTitle("  Download", for: .normal)
        downloadBtn.setImage(UIImage(systemName: "arrow.down.to.line"), for: .normal)
        downloadBtn.setTitleColor(.white, for: .normal)
        downloadBtn.tintColor = .white
        downloadBtn.titleLabel?.font = .systemFont(ofSize: 12.5, weight: .bold)
        downloadBtn.backgroundColor = UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1) // Sapphire Primary #0D6EFD
        downloadBtn.layer.cornerRadius = 12
        downloadBtn.layer.shadowColor = UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1).cgColor
        downloadBtn.layer.shadowOpacity = 0.22
        downloadBtn.layer.shadowOffset = CGSize(width: 0, height: 2)
        downloadBtn.layer.shadowRadius = 4
        downloadBtn.tag = indexPath.row
        downloadBtn.addTarget(self, action: #selector(didTapDownloadAction(_:)), for: .touchUpInside)

        let printBtn = UIButton(type: .system)
        printBtn.setTitle("  Print", for: .normal)
        printBtn.setImage(UIImage(systemName: "printer.fill"), for: .normal)
        printBtn.setTitleColor(UIColor(red: 0.039, green: 0.345, blue: 0.792, alpha: 1), for: .normal)
        printBtn.tintColor = UIColor(red: 0.039, green: 0.345, blue: 0.792, alpha: 1)
        printBtn.titleLabel?.font = .systemFont(ofSize: 12.5, weight: .bold)
        printBtn.backgroundColor = UIColor(red: 0.937, green: 0.965, blue: 1.0, alpha: 1) // Ice Blue #EFF6FF
        printBtn.layer.cornerRadius = 12
        printBtn.layer.borderWidth = 1
        printBtn.layer.borderColor = UIColor(red: 0.749, green: 0.859, blue: 0.996, alpha: 1).cgColor // #BFDBFE
        printBtn.tag = indexPath.row
        printBtn.addTarget(self, action: #selector(didTapPrintAction(_:)), for: .touchUpInside)

        let amendBtn = UIButton(type: .system)
        amendBtn.setImage(UIImage(systemName: "doc.text.fill"), for: .normal)
        amendBtn.tintColor = UIColor(red: 0.28, green: 0.33, blue: 0.41, alpha: 1)
        amendBtn.backgroundColor = UIColor(red: 0.945, green: 0.961, blue: 0.976, alpha: 1)
        amendBtn.layer.cornerRadius = 12
        amendBtn.layer.borderWidth = 1
        amendBtn.layer.borderColor = UIColor(red: 0.89, green: 0.91, blue: 0.95, alpha: 1).cgColor
        amendBtn.tag = indexPath.row
        amendBtn.addTarget(self, action: #selector(didTapAmendAction(_:)), for: .touchUpInside)

        let shareBtn = UIButton(type: .system)
        shareBtn.setImage(UIImage(systemName: "square.and.arrow.up"), for: .normal)
        shareBtn.tintColor = UIColor(red: 0.28, green: 0.33, blue: 0.41, alpha: 1)
        shareBtn.backgroundColor = UIColor(red: 0.945, green: 0.961, blue: 0.976, alpha: 1)
        shareBtn.layer.cornerRadius = 12
        shareBtn.layer.borderWidth = 1
        shareBtn.layer.borderColor = UIColor(red: 0.89, green: 0.91, blue: 0.95, alpha: 1).cgColor
        shareBtn.tag = indexPath.row
        shareBtn.addTarget(self, action: #selector(didTapShareAction(_:)), for: .touchUpInside)

        let btnStack = UIStackView(arrangedSubviews: [downloadBtn, printBtn, amendBtn, shareBtn])
        btnStack.axis = .horizontal
        btnStack.spacing = 8
        btnStack.distribution = .fillProportionally

        NSLayoutConstraint.activate([
            amendBtn.widthAnchor.constraint(equalToConstant: 40),
            shareBtn.widthAnchor.constraint(equalToConstant: 40),
        ])

        [avatarIV, nameLbl, uhidLbl, statusBadge, testBox, dateLbl, btnStack].forEach {
            $0.translatesAutoresizingMaskIntoConstraints = false
            card.addSubview($0)
        }

        NSLayoutConstraint.activate([
            card.topAnchor.constraint(equalTo: cell.contentView.topAnchor, constant: 5),
            card.leadingAnchor.constraint(equalTo: cell.contentView.leadingAnchor, constant: 16),
            card.trailingAnchor.constraint(equalTo: cell.contentView.trailingAnchor, constant: -16),
            card.bottomAnchor.constraint(equalTo: cell.contentView.bottomAnchor, constant: -5),

            avatarIV.topAnchor.constraint(equalTo: card.topAnchor, constant: 14),
            avatarIV.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 14),

            nameLbl.topAnchor.constraint(equalTo: avatarIV.topAnchor),
            nameLbl.leadingAnchor.constraint(equalTo: avatarIV.trailingAnchor, constant: 10),
            nameLbl.trailingAnchor.constraint(lessThanOrEqualTo: statusBadge.leadingAnchor, constant: -8),

            uhidLbl.topAnchor.constraint(equalTo: nameLbl.bottomAnchor, constant: 2),
            uhidLbl.leadingAnchor.constraint(equalTo: nameLbl.leadingAnchor),

            statusBadge.centerYAnchor.constraint(equalTo: nameLbl.centerYAnchor),
            statusBadge.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -14),

            testBox.topAnchor.constraint(equalTo: avatarIV.bottomAnchor, constant: 10),
            testBox.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 14),
            testBox.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -14),

            dateLbl.topAnchor.constraint(equalTo: testBox.bottomAnchor, constant: 10),
            dateLbl.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 14),

            btnStack.topAnchor.constraint(equalTo: dateLbl.bottomAnchor, constant: 12),
            btnStack.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 14),
            btnStack.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -14),
            btnStack.bottomAnchor.constraint(equalTo: card.bottomAnchor, constant: -14),
            btnStack.heightAnchor.constraint(equalToConstant: 40),
        ])

        return cell
    }

    // ── Action Handlers ──────────────────────────────────────────────────────
    @objc private func didTapPrintAction(_ sender: UIButton) {
        let report = filteredReports[sender.tag]
        openPreview(report: report, autoPrint: true)
    }

    @objc private func didTapDownloadAction(_ sender: UIButton) {
        let report = filteredReports[sender.tag]
        openPreview(report: report, autoPrint: false)
    }

    private func openPreview(report: DiagnosticReportItem, autoPrint: Bool) {
        let vc = ReportPreviewViewController()
        vc.reportId = report.id
        vc.patientName = report.patientName
        vc.patientPhone = report.patientPhone
        vc.testName = report.testName
        vc.version = report.version
        vc.uhid = report.uhid
        vc.autoPrint = autoPrint
        vc.modalPresentationStyle = .fullScreen
        present(vc, animated: true, completion: nil)
    }

    @objc private func didTapShareAction(_ sender: UIButton) {
        let report = filteredReports[sender.tag]
        let alert = UIAlertController(
            title: "Share Report Link",
            message: "Send a secure verification link for v\(report.version).0 to \(report.patientName).",
            preferredStyle: .actionSheet
        )

        let verifyUrl = "\(baseUrl)/verify/\(report.id)"

        alert.addAction(UIAlertAction(title: "Send via WhatsApp", style: .default, handler: { [weak self] _ in
            guard let self = self else { return }
            let text = "Hello \(report.patientName),\n\nYour verified diagnostic laboratory report from Patholab Cloud is ready:\n• Test: \(report.testName)\n• Ref: \(report.uhid) (v\(report.version).0)\n\n📄 View & Download Report:\n\(verifyUrl)\n\nThank you for choosing our pathology laboratory!"
            let escaped = text.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""
            let phone = report.patientPhone.hasPrefix("91") ? report.patientPhone : "91" + report.patientPhone
            if let url = URL(string: "https://api.whatsapp.com/send?phone=\(phone)&text=\(escaped)") {
                UIApplication.shared.open(url, options: [:], completionHandler: nil)
            }
        }))

        alert.addAction(UIAlertAction(title: "Send via Email", style: .default, handler: { _ in
            let text = "mailto:\(report.patientEmail)?subject=Diagnostic%20Report%20\(report.testName)&body=Your%20report%20is%20ready%20at%20\(verifyUrl)"
            if let url = URL(string: text) {
                UIApplication.shared.open(url, options: [:], completionHandler: nil)
            }
        }))

        alert.addAction(UIAlertAction(title: "Copy Secure Link", style: .default, handler: { _ in
            UIPasteboard.general.string = verifyUrl
        }))

        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel, handler: nil))

        present(alert, animated: true, completion: nil)
    }

    @objc private func didTapAmendAction(_ sender: UIButton) {
        let report = filteredReports[sender.tag]
        let alert = UIAlertController(
            title: "Amend Medical Report",
            message: "You are about to unlock report v\(report.version).0 for \(report.patientName). This will increment the version to v\(report.version + 1).0. Under medical compliance laws, you MUST state the reason for this change.",
            preferredStyle: .alert
        )

        alert.addTextField { tf in
            tf.placeholder = "e.g., Corrected typo in clinical notes..."
        }

        alert.addAction(UIAlertAction(title: "Confirm & Unlock", style: .destructive, handler: { [weak self] _ in
            guard let self = self else { return }
            let reason = alert.textFields?.first?.text ?? "Clinical correction"
            if let idx = self.allReports.firstIndex(where: { $0.id == report.id }) {
                self.allReports[idx].version += 1
                self.allReports[idx].status = "AMENDED"
                self.allReports[idx].isAmended = true
                self.allReports[idx].amendmentReason = reason
                self.updateKpiStats()
                self.applyReportsFilter()
            }
        }))

        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel, handler: nil))

        present(alert, animated: true, completion: nil)
    }

    @objc private func didTapBack() {
        dismiss(animated: true, completion: nil)
    }

    @objc private func didTapRefresh() {
        fetchReports()
    }
}
