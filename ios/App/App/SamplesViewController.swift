import UIKit

// ─────────────────────────────────────────────────────────────────────────────
// MARK: – Data Models
// ─────────────────────────────────────────────────────────────────────────────
struct SpecimenRecord {
    let id: String
    var barcode: String
    let patientName: String
    let patientDetails: String
    let uhid: String
    let tubeEmoji: String
    let tubeTypeName: String
    let tubeBgColor: UIColor
    let tubeTextColor: UIColor
    let testsAssigned: String
    let department: String
    var collectionInfo: String
    var status: String // COLLECTED, PENDING, IN_ANALYZER, REJECTED
    var rejectionReason: String?
}

struct SamplesKpiStats {
    var totalCount: Int = 0
    var pendingCount: Int = 0
    var processingCount: Int = 0
    var rejectedCount: Int = 0
}

// ─────────────────────────────────────────────────────────────────────────────
// MARK: – Native Sample & Specimen Tracking Controller (iOS)
// ─────────────────────────────────────────────────────────────────────────────
class SamplesViewController: UIViewController, UITableViewDataSource, UITableViewDelegate, UITextFieldDelegate {

    private let baseUrl = "https://app.patholab.cloud"

    private var allSamples: [SpecimenRecord] = []
    private var filteredSamples: [SpecimenRecord] = []
    private var kpiStats = SamplesKpiStats()

    private var selectedStatusFilter = "ALL"

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
    private let fabAccessionBtn    = UIButton(type: .system)

    // KPI Labels
    private let lblTotalCount      = UILabel()
    private let lblPendingCount    = UILabel()
    private let lblProcessingCount = UILabel()
    private let lblRejectedCount   = UILabel()

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 0.973, green: 0.980, blue: 0.988, alpha: 1) // #F8FAFC

        setupHeader()
        setupKpiRow()
        setupSearchAndFilters()
        setupTableView()
        setupEmptyState()
        setupFab()

        fetchSamples()
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
        backBtn.layer.cornerRadius = 20
        backBtn.addTarget(self, action: #selector(didTapBack), for: .touchUpInside)
        backBtn.translatesAutoresizingMaskIntoConstraints = false
        topHeaderView.addSubview(backBtn)

        let titleLbl = UILabel()
        titleLbl.text = "Sample & Specimen Tracking"
        titleLbl.font = .systemFont(ofSize: 18.5, weight: .bold)
        titleLbl.textColor = .white
        titleLbl.translatesAutoresizingMaskIntoConstraints = false
        topHeaderView.addSubview(titleLbl)

        subLbl.text = "Phlebotomy Station • Specimen Accessioning"
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
            topHeaderView.heightAnchor.constraint(equalToConstant: 116),

            backBtn.leadingAnchor.constraint(equalTo: topHeaderView.leadingAnchor, constant: 16),
            backBtn.bottomAnchor.constraint(equalTo: topHeaderView.bottomAnchor, constant: -14),
            backBtn.widthAnchor.constraint(equalToConstant: 40),
            backBtn.heightAnchor.constraint(equalToConstant: 40),

            titleLbl.leadingAnchor.constraint(equalTo: backBtn.trailingAnchor, constant: 12),
            titleLbl.topAnchor.constraint(equalTo: backBtn.topAnchor, constant: -1),
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

        kpiStack.addArrangedSubview(makeKpiCard(title: "TOTAL SPECIMENS", valueLbl: lblTotalCount, valueColor: UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1), subText: "Accessioned Today"))
        kpiStack.addArrangedSubview(makeKpiCard(title: "PHLEBOTOMY DUE", valueLbl: lblPendingCount, valueColor: UIColor(red: 0.85, green: 0.47, blue: 0.02, alpha: 1), subText: "Awaiting Blood Draw"))
        kpiStack.addArrangedSubview(makeKpiCard(title: "UNDER TESTING", valueLbl: lblProcessingCount, valueColor: UIColor(red: 0.02, green: 0.59, blue: 0.41, alpha: 1), subText: "In Centrifuge / Analyzer"))
        kpiStack.addArrangedSubview(makeKpiCard(title: "REJECTED / QNS", valueLbl: lblRejectedCount, valueColor: UIColor(red: 0.937, green: 0.267, blue: 0.267, alpha: 1), subText: "Recollection Needed"))
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
        card.widthAnchor.constraint(equalToConstant: 160).isActive = true

        let tLbl = UILabel()
        tLbl.text = title
        tLbl.font = .systemFont(ofSize: 10, weight: .bold)
        tLbl.textColor = UIColor(red: 0.39, green: 0.45, blue: 0.55, alpha: 1)

        valueLbl.text = "0"
        valueLbl.font = .systemFont(ofSize: 21, weight: .bold)
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

    // ── Search & Filter Chips ────────────────────────────────────────────────
    private func setupSearchAndFilters() {
        searchField.placeholder = "Search barcode, patient, UHID, or test..."
        searchField.font = .systemFont(ofSize: 14, weight: .medium)
        searchField.backgroundColor = .white
        searchField.layer.cornerRadius = 14
        searchField.layer.borderWidth = 1
        searchField.layer.borderColor = UIColor(red: 0.89, green: 0.91, blue: 0.95, alpha: 1).cgColor
        searchField.clearButtonMode = .whileEditing
        searchField.delegate = self
        searchField.addTarget(self, action: #selector(didSearchSamples), for: .editingChanged)

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
            ("ALL", "All Specimens"),
            ("COLLECTED", "✓ Collected"),
            ("PENDING", "⏱ Phlebotomy Due"),
            ("PROCESSING", "🔬 Under Testing"),
            ("REJECTED", "⚠️ Rejected")
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
        let keys = ["ALL", "COLLECTED", "PENDING", "PROCESSING", "REJECTED"]
        if sender.tag < keys.count {
            selectedStatusFilter = keys[sender.tag]
            setupFilterChips()
            applySamplesFilter()
        }
    }

    @objc private func didSearchSamples() {
        applySamplesFilter()
    }

    // ── Table View ───────────────────────────────────────────────────────────
    private func setupTableView() {
        tableView.backgroundColor = .clear
        tableView.separatorStyle = .none
        tableView.dataSource = self
        tableView.delegate = self
        tableView.register(UITableViewCell.self, forCellReuseIdentifier: "SpecimenCardCell")
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
        title.text = "No Specimens Found"
        title.font = .systemFont(ofSize: 17, weight: .bold)
        title.textColor = UIColor(red: 0.059, green: 0.090, blue: 0.165, alpha: 1)

        let sub = UILabel()
        sub.text = "No laboratory samples matched your search or status filter."
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

    private func setupFab() {
        fabAccessionBtn.setTitle("+ Accession Specimen", for: .normal)
        fabAccessionBtn.setTitleColor(.white, for: .normal)
        fabAccessionBtn.titleLabel?.font = .systemFont(ofSize: 14, weight: .bold)
        fabAccessionBtn.backgroundColor = UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1)
        fabAccessionBtn.layer.cornerRadius = 24
        fabAccessionBtn.layer.shadowColor = UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1).cgColor
        fabAccessionBtn.layer.shadowOpacity = 0.35
        fabAccessionBtn.layer.shadowRadius = 8
        fabAccessionBtn.layer.shadowOffset = CGSize(width: 0, height: 4)
        fabAccessionBtn.contentEdgeInsets = UIEdgeInsets(top: 12, left: 20, bottom: 12, right: 20)
        fabAccessionBtn.addTarget(self, action: #selector(didTapAccessionFab), for: .touchUpInside)
        fabAccessionBtn.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(fabAccessionBtn)

        NSLayoutConstraint.activate([
            fabAccessionBtn.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -20),
            fabAccessionBtn.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -20),
            fabAccessionBtn.heightAnchor.constraint(equalToConstant: 48),
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
                let name = json["name"] as? String ?? "Phlebotomy Tech"
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

    private func fetchSamples() {
        fetchUserInfo()
        spinner.startAnimating()
        guard let url = URL(string: baseUrl + "/api/workspace/accession?limit=50") else { return }
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
               let arr = json["data"] as? [[String: Any]] {

                var loaded: [SpecimenRecord] = []
                for (i, t) in arr.enumerated() {
                    let patient = t["patient"] as? [String: Any]
                    let pName = patient?["name"] as? String ?? "Patient"
                    let pId = patient?["patientId"] as? String ?? "P-\(1000 + i)"
                    let pGender = patient?["gender"] as? String ?? "MALE"
                    let pAge = patient?["age"] as? Int ?? 0
                    let pDetails = (pAge > 0 ? "\(pAge) Yrs • " : "") + "\(pGender) • \(pId)"

                    let smp = t["sample"] as? [String: Any]
                    let smpBarcode = smp?["sampleId"] as? String ?? "SMP-\(10000 + i)"
                    let smpStatus = smp?["status"] as? String ?? (t["status"] as? String ?? "COLLECTED")
                    let tName = t["testName"] as? String ?? "Diagnostic Panel"
                    let created = t["createdAt"] as? String ?? ""

                    loaded.append(SpecimenRecord(
                        id: t["id"] as? String ?? "smp_\(i)",
                        barcode: smpBarcode,
                        patientName: pName,
                        patientDetails: pDetails,
                        uhid: pId,
                        tubeEmoji: "🟡",
                        tubeTypeName: "Serum Gel (SST)",
                        tubeBgColor: UIColor(red: 1.0, green: 0.98, blue: 0.76, alpha: 1),
                        tubeTextColor: UIColor(red: 0.63, green: 0.38, blue: 0.03, alpha: 1),
                        testsAssigned: tName,
                        department: "General",
                        collectionInfo: created.isEmpty ? "Today" : String(created.prefix(10)),
                        status: smpStatus,
                        rejectionReason: nil
                    ))
                }

                DispatchQueue.main.async {
                    self.allSamples = loaded
                    self.updateKpiStats()
                    self.applySamplesFilter()
                }
                return
            }

            DispatchQueue.main.async {
                self.allSamples = []
                self.updateKpiStats()
                self.applySamplesFilter()
            }
        }.resume()
    }

    private func updateKpiStats() {
        var total = allSamples.count
        var pending = 0, processing = 0, rejected = 0
        for s in allSamples {
            let st = s.status.uppercased()
            if st == "PENDING" || st == "DUE" { pending += 1 }
            else if st == "IN_ANALYZER" || st == "PROCESSING" { processing += 1 }
            else if st == "REJECTED" { rejected += 1 }
        }

        lblTotalCount.text = "\(total)"
        lblPendingCount.text = "\(pending)"
        lblProcessingCount.text = "\(processing)"
        lblRejectedCount.text = "\(rejected)"
    }

    private func applySamplesFilter() {
        let q = searchField.text?.trimmingCharacters(in: .whitespacesAndNewlines).lowercased() ?? ""
        filteredSamples = allSamples.filter { s in
            let matchesSearch = q.isEmpty ||
                s.barcode.lowercased().contains(q) ||
                s.patientName.lowercased().contains(q) ||
                s.uhid.lowercased().contains(q) ||
                s.testsAssigned.lowercased().contains(q) ||
                s.tubeTypeName.lowercased().contains(q)

            var matchesStatus = true
            if selectedStatusFilter == "COLLECTED" {
                matchesStatus = s.status.caseInsensitiveCompare("COLLECTED") == .orderedSame
            } else if selectedStatusFilter == "PENDING" {
                matchesStatus = s.status.caseInsensitiveCompare("PENDING") == .orderedSame || s.status.caseInsensitiveCompare("DUE") == .orderedSame
            } else if selectedStatusFilter == "PROCESSING" {
                matchesStatus = s.status.caseInsensitiveCompare("IN_ANALYZER") == .orderedSame || s.status.caseInsensitiveCompare("PROCESSING") == .orderedSame
            } else if selectedStatusFilter == "REJECTED" {
                matchesStatus = s.status.caseInsensitiveCompare("REJECTED") == .orderedSame
            }

            return matchesSearch && matchesStatus
        }

        tableView.reloadData()
        emptyStateView.isHidden = !filteredSamples.isEmpty
        tableView.isHidden = filteredSamples.isEmpty
    }

    // ── Table View Data Source & Delegate ────────────────────────────────────
    func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        return filteredSamples.count
    }

    func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let cell = tableView.dequeueReusableCell(withIdentifier: "SpecimenCardCell", for: indexPath)
        cell.backgroundColor = .clear
        cell.selectionStyle = .none
        cell.contentView.subviews.forEach { $0.removeFromSuperview() }

        let sample = filteredSamples[indexPath.row]

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

        // Tube Type Pill
        let tubePill = UIView()
        tubePill.backgroundColor = sample.tubeBgColor
        tubePill.layer.cornerRadius = 8
        tubePill.translatesAutoresizingMaskIntoConstraints = false

        let tubeLbl = UILabel()
        tubeLbl.text = "\(sample.tubeEmoji) \(sample.tubeTypeName)"
        tubeLbl.font = .systemFont(ofSize: 11, weight: .bold)
        tubeLbl.textColor = sample.tubeTextColor
        tubeLbl.translatesAutoresizingMaskIntoConstraints = false
        tubePill.addSubview(tubeLbl)

        NSLayoutConstraint.activate([
            tubeLbl.topAnchor.constraint(equalTo: tubePill.topAnchor, constant: 3),
            tubeLbl.bottomAnchor.constraint(equalTo: tubePill.bottomAnchor, constant: -3),
            tubeLbl.leadingAnchor.constraint(equalTo: tubePill.leadingAnchor, constant: 8),
            tubeLbl.trailingAnchor.constraint(equalTo: tubePill.trailingAnchor, constant: -8),
        ])

        // Barcode Pill
        let barcodePill = UILabel()
        barcodePill.text = " \(sample.barcode) "
        barcodePill.font = .monospacedSystemFont(ofSize: 11.5, weight: .bold)
        barcodePill.textColor = UIColor(red: 0.20, green: 0.25, blue: 0.33, alpha: 1)
            barcodePill.backgroundColor = UIColor(red: 0.94, green: 0.96, blue: 0.98, alpha: 1)
        barcodePill.layer.cornerRadius = 8
        barcodePill.clipsToBounds = true

        // Status Badge
        let statusBadge = UILabel()
        statusBadge.font = .systemFont(ofSize: 11, weight: .bold)
        statusBadge.layer.cornerRadius = 8
        statusBadge.clipsToBounds = true

        let st = sample.status.uppercased()
        if st == "COLLECTED" {
            statusBadge.text = " ✓ Collected "
            statusBadge.textColor = UIColor(red: 0.02, green: 0.59, blue: 0.41, alpha: 1)
            statusBadge.backgroundColor = UIColor(red: 0.93, green: 0.99, blue: 0.96, alpha: 1)
        } else if st == "IN_ANALYZER" || st == "PROCESSING" {
            statusBadge.text = " In Testing "
            statusBadge.textColor = UIColor(red: 0.05, green: 0.43, blue: 0.99, alpha: 1)
            statusBadge.backgroundColor = UIColor(red: 0.93, green: 0.96, blue: 1.0, alpha: 1)
        } else if st == "REJECTED" {
            statusBadge.text = " Rejected "
            statusBadge.textColor = UIColor(red: 0.937, green: 0.267, blue: 0.267, alpha: 1)
            statusBadge.backgroundColor = UIColor(red: 1.0, green: 0.95, blue: 0.95, alpha: 1)
        } else {
            statusBadge.text = " Phlebotomy Due "
            statusBadge.textColor = UIColor(red: 0.85, green: 0.47, blue: 0.02, alpha: 1)
            statusBadge.backgroundColor = UIColor(red: 1.0, green: 0.98, blue: 0.92, alpha: 1)
        }

        // Standardized Patient Avatar
        let avatarIV = PatientAvatarHelper.createAvatar(size: 36)

        // Patient Name & Details
        let nameLbl = UILabel()
        nameLbl.text = sample.patientName
        nameLbl.font = .systemFont(ofSize: 15.5, weight: .bold)
        nameLbl.textColor = UIColor(red: 0.059, green: 0.090, blue: 0.165, alpha: 1)

        let detailsLbl = UILabel()
        detailsLbl.text = sample.patientDetails
        detailsLbl.font = .systemFont(ofSize: 11.5, weight: .medium)
        detailsLbl.textColor = UIColor(red: 0.392, green: 0.451, blue: 0.549, alpha: 1)

        // Tests Box
        let testsBox = UIView()
        testsBox.backgroundColor = UIColor(red: 0.97, green: 0.98, blue: 0.99, alpha: 1)
        testsBox.layer.cornerRadius = 10
        testsBox.layer.borderWidth = 1
        testsBox.layer.borderColor = UIColor(red: 0.91, green: 0.93, blue: 0.96, alpha: 1).cgColor

        let testsLbl = UILabel()
        testsLbl.text = sample.testsAssigned
        testsLbl.font = .systemFont(ofSize: 12.5, weight: .bold)
        testsLbl.textColor = UIColor(red: 0.12, green: 0.16, blue: 0.23, alpha: 1)

        let deptLbl = UILabel()
        deptLbl.text = sample.department
        deptLbl.font = .systemFont(ofSize: 11, weight: .medium)
        deptLbl.textColor = UIColor(red: 0.39, green: 0.45, blue: 0.55, alpha: 1)

        [testsLbl, deptLbl].forEach {
            $0.translatesAutoresizingMaskIntoConstraints = false
            testsBox.addSubview($0)
        }

        NSLayoutConstraint.activate([
            testsLbl.topAnchor.constraint(equalTo: testsBox.topAnchor, constant: 6),
            testsLbl.leadingAnchor.constraint(equalTo: testsBox.leadingAnchor, constant: 10),
            testsLbl.trailingAnchor.constraint(equalTo: testsBox.trailingAnchor, constant: -10),

            deptLbl.topAnchor.constraint(equalTo: testsLbl.bottomAnchor, constant: 2),
            deptLbl.leadingAnchor.constraint(equalTo: testsLbl.leadingAnchor),
            deptLbl.bottomAnchor.constraint(equalTo: testsBox.bottomAnchor, constant: -6),
        ])

        let timeLbl = UILabel()
        timeLbl.text = sample.collectionInfo
        timeLbl.font = .systemFont(ofSize: 11, weight: .medium)
        timeLbl.textColor = UIColor(red: 0.392, green: 0.451, blue: 0.549, alpha: 1)

        // Action Buttons
        let printBtn = UIButton(type: .system)
        printBtn.setTitle("🖨️ Barcode", for: .normal)
        printBtn.setTitleColor(UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1), for: .normal)
        printBtn.titleLabel?.font = .systemFont(ofSize: 12, weight: .bold)
        printBtn.backgroundColor = UIColor(red: 0.937, green: 0.965, blue: 1.0, alpha: 1)
        printBtn.layer.cornerRadius = 10
        printBtn.tag = indexPath.row
        printBtn.addTarget(self, action: #selector(didTapBarcodePrint(_:)), for: .touchUpInside)

        let collectBtn = UIButton(type: .system)
        let isCollected = (sample.status == "Collected")
        collectBtn.setTitle(isCollected ? "✓ Collected" : "🩸 Collect", for: .normal)
        collectBtn.setTitleColor(isCollected ? UIColor(red: 0.02, green: 0.59, blue: 0.41, alpha: 1) : UIColor(red: 0.85, green: 0.47, blue: 0.02, alpha: 1), for: .normal)
        collectBtn.titleLabel?.font = .systemFont(ofSize: 12, weight: .bold)
        collectBtn.backgroundColor = isCollected ? UIColor(red: 0.93, green: 0.99, blue: 0.96, alpha: 1) : UIColor(red: 1.0, green: 0.98, blue: 0.92, alpha: 1)
        collectBtn.layer.cornerRadius = 10
        collectBtn.tag = indexPath.row
        collectBtn.addTarget(self, action: #selector(didTapCollectSample(_:)), for: .touchUpInside)

        let rejectBtn = UIButton(type: .system)
        rejectBtn.setTitle("⚠️", for: .normal)
        rejectBtn.backgroundColor = UIColor(red: 0.996, green: 0.949, blue: 0.949, alpha: 1)
        rejectBtn.layer.cornerRadius = 10
        rejectBtn.tag = indexPath.row
        rejectBtn.addTarget(self, action: #selector(didTapRejectSample(_:)), for: .touchUpInside)

        let detailsBtn = UIButton(type: .system)
        detailsBtn.setTitle("ℹ️", for: .normal)
        detailsBtn.backgroundColor = UIColor(red: 0.945, green: 0.961, blue: 0.976, alpha: 1)
        detailsBtn.layer.cornerRadius = 10
        detailsBtn.tag = indexPath.row
        detailsBtn.addTarget(self, action: #selector(didTapSampleDetails(_:)), for: .touchUpInside)

        let btnStack = UIStackView(arrangedSubviews: [printBtn, collectBtn, rejectBtn, detailsBtn])
        btnStack.axis = .horizontal
        btnStack.spacing = 6
        btnStack.distribution = .fillProportionally

        NSLayoutConstraint.activate([
            rejectBtn.widthAnchor.constraint(equalToConstant: 38),
            detailsBtn.widthAnchor.constraint(equalToConstant: 38),
        ])

        [tubePill, barcodePill, statusBadge, avatarIV, nameLbl, detailsLbl, testsBox, timeLbl, btnStack].forEach {
            $0.translatesAutoresizingMaskIntoConstraints = false
            card.addSubview($0)
        }

        NSLayoutConstraint.activate([
            card.topAnchor.constraint(equalTo: cell.contentView.topAnchor, constant: 5),
            card.leadingAnchor.constraint(equalTo: cell.contentView.leadingAnchor, constant: 16),
            card.trailingAnchor.constraint(equalTo: cell.contentView.trailingAnchor, constant: -16),
            card.bottomAnchor.constraint(equalTo: cell.contentView.bottomAnchor, constant: -5),

            tubePill.topAnchor.constraint(equalTo: card.topAnchor, constant: 14),
            tubePill.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 14),

            barcodePill.centerYAnchor.constraint(equalTo: tubePill.centerYAnchor),
            barcodePill.leadingAnchor.constraint(equalTo: tubePill.trailingAnchor, constant: 6),

            statusBadge.centerYAnchor.constraint(equalTo: tubePill.centerYAnchor),
            statusBadge.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -14),

            avatarIV.topAnchor.constraint(equalTo: tubePill.bottomAnchor, constant: 10),
            avatarIV.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 14),

            nameLbl.topAnchor.constraint(equalTo: avatarIV.topAnchor),
            nameLbl.leadingAnchor.constraint(equalTo: avatarIV.trailingAnchor, constant: 10),
            nameLbl.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -14),

            detailsLbl.topAnchor.constraint(equalTo: nameLbl.bottomAnchor, constant: 2),
            detailsLbl.leadingAnchor.constraint(equalTo: nameLbl.leadingAnchor),

            testsBox.topAnchor.constraint(equalTo: detailsLbl.bottomAnchor, constant: 8),
            testsBox.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 14),
            testsBox.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -14),

            timeLbl.topAnchor.constraint(equalTo: testsBox.bottomAnchor, constant: 8),
            timeLbl.leadingAnchor.constraint(equalTo: nameLbl.leadingAnchor),

            btnStack.topAnchor.constraint(equalTo: timeLbl.bottomAnchor, constant: 12),
            btnStack.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 14),
            btnStack.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -14),
            btnStack.bottomAnchor.constraint(equalTo: card.bottomAnchor, constant: -14),
            btnStack.heightAnchor.constraint(equalToConstant: 38),
        ])

        return cell
    }

    // ── Action Handlers ──────────────────────────────────────────────────────
    @objc private func didTapPrintBarcode(_ sender: UIButton) {
        let sample = filteredSamples[sender.tag]
        let alert = UIAlertController(
            title: "Barcode Label: \(sample.barcode)",
            message: "Patient: \(sample.patientName) (\(sample.uhid))\nContainer: \(sample.tubeEmoji) \(sample.tubeTypeName)\nTests: \(sample.testsAssigned)\n\nReady for 50x25mm thermal sticker printing.",
            preferredStyle: .alert
        )

        alert.addAction(UIAlertAction(title: "🖨️ Print Label", style: .default, handler: { _ in
            // Print spooler simulation
        }))
        alert.addAction(UIAlertAction(title: "Close", style: .cancel, handler: nil))
        present(alert, animated: true, completion: nil)
    }

    @objc private func didTapCollect(_ sender: UIButton) {
        let sample = filteredSamples[sender.tag]
        if let idx = allSamples.firstIndex(where: { $0.id == sample.id }) {
            if allSamples[idx].status.caseInsensitiveCompare("COLLECTED") == .orderedSame {
                allSamples[idx].status = "IN_ANALYZER"
            } else {
                allSamples[idx].status = "COLLECTED"
                allSamples[idx].collectionInfo = "📅 Just now • Phleb. Active Station"
            }
            updateKpiStats()
            applySamplesFilter()
        }
    }

    @objc private func didTapReject(_ sender: UIButton) {
        let sample = filteredSamples[sender.tag]
        let alert = UIAlertController(
            title: "Reject Specimen: \(sample.barcode)",
            message: "Select clinical quality rejection reason for \(sample.patientName):",
            preferredStyle: .actionSheet
        )

        let reasons = [
            "In-vitro Hemolysis (RBC Breakdown)",
            "Clotted Specimen (Inadequate Mixing)",
            "Quantity Not Sufficient (QNS)",
            "Incorrect Container / Tube Type"
        ]

        for r in reasons {
            alert.addAction(UIAlertAction(title: r, style: .destructive, handler: { [weak self] _ in
                guard let self = self else { return }
                if let idx = self.allSamples.firstIndex(where: { $0.id == sample.id }) {
                    self.allSamples[idx].status = "REJECTED"
                    self.allSamples[idx].rejectionReason = r
                    self.updateKpiStats()
                    self.applySamplesFilter()
                }
            }))
        }

        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel, handler: nil))
        present(alert, animated: true, completion: nil)
    }

    @objc private func didTapDetails(_ sender: UIButton) {
        let sample = filteredSamples[sender.tag]
        let alert = UIAlertController(
            title: "Specimen: \(sample.barcode)",
            message: "Patient: \(sample.patientName)\nUHID: \(sample.uhid)\nContainer: \(sample.tubeEmoji) \(sample.tubeTypeName)\nTests Assigned: \(sample.testsAssigned)\nDepartment: \(sample.department)\nCollection: \(sample.collectionInfo)\nStatus: \(sample.status)" + (sample.rejectionReason != nullString ? "\n\n⚠️ Note: \(sample.rejectionReason!)" : ""),
            preferredStyle: .alert
        )
        alert.addAction(UIAlertAction(title: "OK", style: .default, handler: nil))
        present(alert, animated: true, completion: nil)
    }

    private var nullString: String {
        return ""
    }

    @objc private func didTapAccessionFab() {
        let alert = UIAlertController(
            title: "Accession Specimen",
            message: "Enter patient name and select container tube to generate a new specimen barcode:",
            preferredStyle: .alert
        )

        alert.addTextField { tf in
            tf.placeholder = "Patient Name (e.g. SNEHA DAS)"
        }
        alert.addTextField { tf in
            tf.placeholder = "Investigation Tests (e.g. CBC, ESR)"
        }

        alert.addAction(UIAlertAction(title: "Confirm & Generate Barcode", style: .default, handler: { [weak self] _ in
            guard let self = self else { return }
            let pName = alert.textFields?.first?.text?.trimmingCharacters(in: .whitespacesAndNewlines) ?? "Walk-in Patient"
            let name = pName.isEmpty ? "WALK-IN PATIENT" : pName.uppercased()
            let tests = alert.textFields?[1].text?.trimmingCharacters(in: .whitespacesAndNewlines) ?? "Diagnostic Panel"
            let testVal = tests.isEmpty ? "Diagnostic Investigation" : tests

            let newId = "smp_\(10938 + self.allSamples.count)"
            let barcode = "SMP-\(10938 + self.allSamples.count)"

            let newRecord = SpecimenRecord(
                id: newId,
                barcode: barcode,
                patientName: name,
                patientDetails: "Demographics Recorded • UHID: P-000\(96 + self.allSamples.count)",
                uhid: "P-000\(96 + self.allSamples.count)",
                tubeEmoji: "🟣",
                tubeTypeName: "EDTA Whole Blood",
                tubeBgColor: UIColor(red: 0.95, green: 0.91, blue: 1.0, alpha: 1),
                tubeTextColor: UIColor(red: 0.49, green: 0.13, blue: 0.81, alpha: 1),
                testsAssigned: testVal,
                department: "Hematology & Pathology",
                collectionInfo: "📅 Just now • Phleb. Station",
                status: "COLLECTED",
                rejectionReason: nil
            )

            self.allSamples.insert(newRecord, at: 0)
            self.updateKpiStats()
            self.applySamplesFilter()
        }))

        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel, handler: nil))
        present(alert, animated: true, completion: nil)
    }

    @objc private func didTapBack() {
        dismiss(animated: true, completion: nil)
    }

    @objc private func didTapRefresh() {
        fetchSamples()
    }
}
