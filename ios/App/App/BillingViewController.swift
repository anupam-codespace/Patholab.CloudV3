import UIKit

// ─────────────────────────────────────────────────────────────────────────────
// MARK: – Data Models
// ─────────────────────────────────────────────────────────────────────────────
struct BillingInvoiceItem {
    let id: String
    let invoiceNumber: String
    let patientName: String
    let patientDetails: String
    let dateLogged: String
    let paymentMethod: String
    let paymentStatus: String // PAID, PENDING, OVERDUE, CANCELLED
    let grandTotal: Double
    let paidAmount: Double
    let balanceDue: Double
    let discount: Double
    let subtotal: Double
    let items: [BillingTestLine]
}

struct BillingTestLine {
    let testName: String
    let price: Double
}

struct BillingKpiStats {
    var totalRevenue: Double = 0
    var monthlyRevenue: Double = 0
    var settledCount: Int = 0
    var totalCount: Int = 0
}

// ─────────────────────────────────────────────────────────────────────────────
// MARK: – Native Billing & Revenue Ledger Controller
// ─────────────────────────────────────────────────────────────────────────────
class BillingViewController: UIViewController, UITableViewDataSource, UITableViewDelegate, UITextFieldDelegate {

    private let baseUrl = "https://app.patholab.cloud"

    private var allInvoices: [BillingInvoiceItem] = []
    private var filteredInvoices: [BillingInvoiceItem] = []
    private var kpiStats = BillingKpiStats()

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

    // KPI Labels
    private let lblTotalRev   = UILabel()
    private let lblMonthRev   = UILabel()
    private let lblSettledCnt = UILabel()
    private let lblTotalCnt   = UILabel()

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 0.973, green: 0.980, blue: 0.988, alpha: 1) // #F8FAFC

        setupHeader()
        setupKpiRow()
        setupSearchAndFilters()
        setupTableView()
        setupEmptyState()

        fetchInvoices()
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
            UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1).cgColor, // #0D6EFD
            UIColor(red: 0.114, green: 0.306, blue: 0.847, alpha: 1).cgColor  // #1D4ED8
        ]
        gradient.startPoint = CGPoint(x: 0, y: 0)
        gradient.endPoint = CGPoint(x: 1, y: 1)
        topHeaderView.layer.insertSublayer(gradient, at: 0)
        topHeaderView.layer.cornerRadius = 20
        topHeaderView.layer.maskedCorners = [.layerMinXMaxYCorner, .layerMaxXMaxYCorner]
        topHeaderView.clipsToBounds = true

        let backBtn = UIButton(type: .system)
        backBtn.setImage(UIImage(systemName: "chevron.left"), for: .normal)
        backBtn.tintColor = UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1)
        backBtn.backgroundColor = .white
        backBtn.layer.cornerRadius = 19
        backBtn.layer.shadowColor = UIColor.black.cgColor
        backBtn.layer.shadowOpacity = 0.08
        backBtn.layer.shadowRadius = 4
        backBtn.layer.shadowOffset = CGSize(width: 0, height: 2)
        backBtn.addTarget(self, action: #selector(didTapBack), for: .touchUpInside)
        backBtn.translatesAutoresizingMaskIntoConstraints = false
        topHeaderView.addSubview(backBtn)

        let titleLbl = UILabel()
        titleLbl.text = "Billing & Invoices"
        titleLbl.font = .systemFont(ofSize: 20, weight: .bold)
        titleLbl.textColor = .white
        titleLbl.translatesAutoresizingMaskIntoConstraints = false
        topHeaderView.addSubview(titleLbl)

        let subLbl = UILabel()
        subLbl.text = "Financial Ledger & Revenue Hub"
        subLbl.font = .systemFont(ofSize: 11.5, weight: .medium)
        subLbl.textColor = UIColor(red: 0.780, green: 0.880, blue: 1.0, alpha: 1) // #C7DFFF
        subLbl.translatesAutoresizingMaskIntoConstraints = false
        topHeaderView.addSubview(subLbl)

        let newInvBtn = UIButton(type: .system)
        newInvBtn.setTitle("+ New Invoice", for: .normal)
        newInvBtn.setTitleColor(UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1), for: .normal)
        newInvBtn.titleLabel?.font = .systemFont(ofSize: 12.5, weight: .bold)
        newInvBtn.backgroundColor = .white
        newInvBtn.layer.cornerRadius = 17
        newInvBtn.contentEdgeInsets = UIEdgeInsets(top: 0, left: 14, bottom: 0, right: 14)
        newInvBtn.addTarget(self, action: #selector(didTapNewInvoice), for: .touchUpInside)
        newInvBtn.translatesAutoresizingMaskIntoConstraints = false
        topHeaderView.addSubview(newInvBtn)

        NSLayoutConstraint.activate([
            topHeaderView.topAnchor.constraint(equalTo: view.topAnchor),
            topHeaderView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            topHeaderView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            topHeaderView.heightAnchor.constraint(equalToConstant: 116),

            backBtn.leadingAnchor.constraint(equalTo: topHeaderView.leadingAnchor, constant: 16),
            backBtn.bottomAnchor.constraint(equalTo: topHeaderView.bottomAnchor, constant: -14),
            backBtn.widthAnchor.constraint(equalToConstant: 38),
            backBtn.heightAnchor.constraint(equalToConstant: 38),

            titleLbl.leadingAnchor.constraint(equalTo: backBtn.trailingAnchor, constant: 12),
            titleLbl.topAnchor.constraint(equalTo: backBtn.topAnchor, constant: -1),

            subLbl.leadingAnchor.constraint(equalTo: titleLbl.leadingAnchor),
            subLbl.topAnchor.constraint(equalTo: titleLbl.bottomAnchor, constant: 2),

            newInvBtn.trailingAnchor.constraint(equalTo: topHeaderView.trailingAnchor, constant: -16),
            newInvBtn.centerYAnchor.constraint(equalTo: backBtn.centerYAnchor),
            newInvBtn.heightAnchor.constraint(equalToConstant: 34),
        ])
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        if let g = topHeaderView.layer.sublayers?.first as? CAGradientLayer {
            g.frame = topHeaderView.bounds
        }
    }

    // ── KPI Revenue Cards ────────────────────────────────────────────────────
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

        kpiStack.addArrangedSubview(makeKpiCard(title: "TOTAL REVENUE", valueLbl: lblTotalRev, valueColor: UIColor(red: 0.02, green: 0.59, blue: 0.41, alpha: 1), subText: "All Time Collections"))
        kpiStack.addArrangedSubview(makeKpiCard(title: "MONTHLY REVENUE", valueLbl: lblMonthRev, valueColor: UIColor(red: 0.05, green: 0.43, blue: 0.99, alpha: 1), subText: "Current Month"))
        kpiStack.addArrangedSubview(makeKpiCard(title: "SETTLED INVOICES", valueLbl: lblSettledCnt, valueColor: UIColor(red: 0.02, green: 0.59, blue: 0.41, alpha: 1), subText: "Fully Paid"))
        kpiStack.addArrangedSubview(makeKpiCard(title: "TOTAL INVOICES", valueLbl: lblTotalCnt, valueColor: UIColor(red: 0.39, green: 0.45, blue: 0.55, alpha: 1), subText: "All Generated"))
    }

    private func makeKpiCard(title: String, valueLbl: UILabel, valueColor: UIColor, subText: String? = nil, subLbl: UILabel? = nil) -> UIView {
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

        valueLbl.text = "₹0"
        valueLbl.font = .systemFont(ofSize: 22, weight: .black)
        valueLbl.textColor = valueColor

        let sLbl = subLbl ?? UILabel()
        if let subText = subText {
            sLbl.text = subText
        }
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
        searchField.placeholder = "Search by invoice #, patient name, phone..."
        searchField.font = .systemFont(ofSize: 14, weight: .medium)
        searchField.backgroundColor = .white
        searchField.layer.cornerRadius = 14
        searchField.layer.borderWidth = 1
        searchField.layer.borderColor = UIColor(red: 0.89, green: 0.91, blue: 0.95, alpha: 1).cgColor
        searchField.clearButtonMode = .whileEditing
        searchField.delegate = self
        searchField.addTarget(self, action: #selector(didSearchInvoices), for: .editingChanged)

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
            ("ALL", "All Transactions"),
            ("PAID", "Settled (PAID)"),
            ("PENDING", "Pending Balance"),
            ("OVERDUE", "Delinquent / Overdue")
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
        let keys = ["ALL", "PAID", "PENDING", "OVERDUE"]
        if sender.tag < keys.count {
            selectedStatusFilter = keys[sender.tag]
            setupFilterChips()
            applyInvoicesFilter()
        }
    }

    @objc private func didSearchInvoices() {
        applyInvoicesFilter()
    }

    private func setupTableView() {
        tableView.backgroundColor = .clear
        tableView.separatorStyle = .none
        tableView.dataSource = self
        tableView.delegate = self
        tableView.register(UITableViewCell.self, forCellReuseIdentifier: "InvoiceCardCell")
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
        title.text = "No Invoices Found"
        title.font = .systemFont(ofSize: 17, weight: .bold)
        title.textColor = UIColor(red: 0.059, green: 0.090, blue: 0.165, alpha: 1)

        let sub = UILabel()
        sub.text = "No transactions matched your search or status filter."
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
        let token = KeychainManager.read(forKey: KeychainManager.tokenKey) ?? UserDefaults.standard.string(forKey: "auth_token")
        if let token = token {
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

    private func fetchInvoices() {
        fetchUserInfo()
        spinner.startAnimating()
        guard let url = URL(string: baseUrl + "/api/workspace/invoices") else { return }
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
               let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {

                // Parse Stats
                if let stats = json["stats"] as? [String: Any] {
                    self.kpiStats.totalRevenue = (stats["totalRevenue"] as? NSNumber)?.doubleValue ?? 0
                    self.kpiStats.monthlyRevenue = (stats["monthlyRevenue"] as? NSNumber)?.doubleValue ?? 0
                    self.kpiStats.settledCount = (stats["settledCount"] as? Int) ?? ((stats["paidCount"] as? Int) ?? 0)
                    self.kpiStats.totalCount = (stats["totalCount"] as? Int) ?? ((stats["invoiceCount"] as? Int) ?? 0)
                }

                // Parse Invoices
                if let arr = json["invoices"] as? [[String: Any]] {
                    var loaded: [BillingInvoiceItem] = []
                    for inv in arr {
                        let patient = inv["patient"] as? [String: Any]
                        let pName = patient?["name"] as? String ?? "Walk-in Patient"
                        let pPhone = patient?["phone"] as? String ?? ""
                        let pAge = patient?["age"] as? Int ?? 0
                        let pGender = patient?["gender"] as? String ?? ""

                        var details = pAge > 0 ? "\(pAge)Y" : ""
                        if !pGender.isEmpty { details += (details.isEmpty ? "" : " • ") + pGender }
                        if !pPhone.isEmpty { details += (details.isEmpty ? "" : " • ") + pPhone }

                        let total = (inv["grandTotal"] as? NSNumber)?.doubleValue ?? ((inv["total"] as? NSNumber)?.doubleValue ?? 0)
                        let paid = (inv["paidAmount"] as? NSNumber)?.doubleValue ?? 0
                        let bal = (inv["balance"] as? NSNumber)?.doubleValue ?? max(0, total - paid)
                        let discount = (inv["discount"] as? NSNumber)?.doubleValue ?? 0
                        let subtotal = (inv["subtotal"] as? NSNumber)?.doubleValue ?? (total + discount)

                        var items: [BillingTestLine] = []
                        if let itArr = inv["items"] as? [[String: Any]] {
                            for it in itArr {
                                let name = (it["name"] as? String) ?? ((it["testName"] as? String) ?? "Diagnostic Test")
                                let price = (it["price"] as? NSNumber)?.doubleValue ?? 0
                                items.append(BillingTestLine(testName: name, price: price))
                            }
                        }

                        loaded.append(BillingInvoiceItem(
                            id: inv["id"] as? String ?? UUID().uuidString,
                            invoiceNumber: inv["invoiceNumber"] as? String ?? "INV-100",
                            patientName: pName,
                            patientDetails: details,
                            dateLogged: "Recent",
                            paymentMethod: inv["paymentMethod"] as? String ?? "UPI",
                            paymentStatus: inv["paymentStatus"] as? String ?? (bal == 0 ? "PAID" : "PENDING"),
                            grandTotal: total,
                            paidAmount: paid,
                            balanceDue: bal,
                            discount: discount,
                            subtotal: subtotal,
                            items: items
                        ))
                    }

                    DispatchQueue.main.async {
                        self.allInvoices = loaded
                        self.computeAndApplyKpis()
                        self.applyInvoicesFilter()
                    }
                    return
                }
            }

            DispatchQueue.main.async {
                self.allInvoices = []
                self.computeAndApplyKpis()
                self.applyInvoicesFilter()
            }
        }.resume()
    }

    private func computeAndApplyKpis() {
        var totalRev: Double = 0
        var monthlyRev: Double = 0
        var settledCnt: Int = 0
        let totalCnt: Int = allInvoices.count

        if kpiStats.totalRevenue > 0 || kpiStats.monthlyRevenue > 0 {
            totalRev = kpiStats.totalRevenue
            monthlyRev = kpiStats.monthlyRevenue
            if kpiStats.settledCount > 0 { settledCnt = kpiStats.settledCount }
        }

        for inv in allInvoices {
            if kpiStats.totalRevenue == 0 {
                totalRev += inv.paidAmount
            }
            if inv.paymentStatus.uppercased() == "PAID" {
                settledCnt += 1
            }
        }

        if monthlyRev == 0 {
            monthlyRev = totalRev
        }

        kpiStats = BillingKpiStats(
            totalRevenue: totalRev,
            monthlyRevenue: monthlyRev,
            settledCount: settledCnt,
            totalCount: totalCnt
        )
        updateKpiLabels()
    }

    private func updateKpiLabels() {
        lblTotalRev.text = String(format: "₹%.0f", kpiStats.totalRevenue)
        lblMonthRev.text = String(format: "₹%.0f", kpiStats.monthlyRevenue)
        lblSettledCnt.text = "\(kpiStats.settledCount)"
        lblTotalCnt.text = "\(kpiStats.totalCount)"
    }

    private func applyInvoicesFilter() {
        let q = searchField.text?.trimmingCharacters(in: .whitespacesAndNewlines).lowercased() ?? ""
        filteredInvoices = allInvoices.filter { item in
            let matchesSearch = q.isEmpty ||
                item.invoiceNumber.lowercased().contains(q) ||
                item.patientName.lowercased().contains(q) ||
                item.patientDetails.lowercased().contains(q)

            let matchesStatus = selectedStatusFilter == "ALL" ||
                item.paymentStatus.caseInsensitiveCompare(selectedStatusFilter) == .orderedSame

            return matchesSearch && matchesStatus
        }

        tableView.reloadData()
        emptyStateView.isHidden = !filteredInvoices.isEmpty
        tableView.isHidden = filteredInvoices.isEmpty
    }

    // ── Actions ──────────────────────────────────────────────────────────────
    @objc private func didTapBack() {
        dismiss(animated: true, completion: nil)
    }

    @objc private func didTapNewInvoice() {
        let regVC = RegistrationViewController()
        regVC.modalPresentationStyle = .fullScreen
        present(regVC, animated: true, completion: nil)
    }

    // ── Table View Data Source & Delegate ────────────────────────────────────
    func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        return filteredInvoices.count
    }

    func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let cell = tableView.dequeueReusableCell(withIdentifier: "InvoiceCardCell", for: indexPath)
        cell.backgroundColor = .clear
        cell.selectionStyle = .none
        cell.contentView.subviews.forEach { $0.removeFromSuperview() }

        let item = filteredInvoices[indexPath.row]

        let card = UIView()
        card.backgroundColor = .white
        card.layer.cornerRadius = 18
        card.layer.shadowColor = UIColor(red: 0.05, green: 0.15, blue: 0.30, alpha: 1).cgColor
        card.layer.shadowOpacity = 0.06
        card.layer.shadowRadius = 6
        card.layer.shadowOffset = CGSize(width: 0, height: 3)
        card.layer.borderWidth = 1
        card.layer.borderColor = UIColor(red: 0.92, green: 0.94, blue: 0.97, alpha: 1).cgColor
        card.translatesAutoresizingMaskIntoConstraints = false
        cell.contentView.addSubview(card)

        // Standardized Patient Avatar
        let avatarIV = PatientAvatarHelper.createAvatar(size: 38)

        let nameLbl = UILabel()
        nameLbl.text = item.patientName
        nameLbl.font = .systemFont(ofSize: 16, weight: .bold)
        nameLbl.textColor = UIColor(red: 0.059, green: 0.090, blue: 0.165, alpha: 1)

        let detailsLbl = UILabel()
        detailsLbl.text = item.patientDetails
        detailsLbl.font = .systemFont(ofSize: 12, weight: .medium)
        detailsLbl.textColor = UIColor(red: 0.392, green: 0.451, blue: 0.549, alpha: 1)

        let numBadge = UILabel()
        numBadge.text = " \(item.invoiceNumber) "
        numBadge.font = .systemFont(ofSize: 12, weight: .bold)
        numBadge.textColor = UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1)
        numBadge.backgroundColor = UIColor(red: 0.937, green: 0.965, blue: 1.0, alpha: 1)
        numBadge.layer.cornerRadius = 8
        numBadge.clipsToBounds = true

        let dateLbl = UILabel()
        dateLbl.text = "\(item.dateLogged) • \(item.paymentMethod)"
        dateLbl.font = .systemFont(ofSize: 12, weight: .medium)
        dateLbl.textColor = UIColor(red: 0.392, green: 0.451, blue: 0.549, alpha: 1)

        let statusBadge = UILabel()
        statusBadge.text = " \(item.paymentStatus) "
        statusBadge.font = .systemFont(ofSize: 11, weight: .bold)
        statusBadge.layer.cornerRadius = 6
        statusBadge.clipsToBounds = true

        if item.paymentStatus.uppercased() == "PAID" {
            statusBadge.textColor = UIColor(red: 0.02, green: 0.59, blue: 0.41, alpha: 1)
            statusBadge.backgroundColor = UIColor(red: 0.93, green: 0.98, blue: 0.95, alpha: 1)
        } else if item.paymentStatus.uppercased() == "OVERDUE" {
            statusBadge.textColor = UIColor(red: 0.88, green: 0.11, blue: 0.28, alpha: 1)
            statusBadge.backgroundColor = UIColor(red: 1.0, green: 0.93, blue: 0.95, alpha: 1)
        } else {
            statusBadge.textColor = UIColor(red: 0.85, green: 0.47, blue: 0.02, alpha: 1)
            statusBadge.backgroundColor = UIColor(red: 1.0, green: 0.95, blue: 0.88, alpha: 1)
        }

        let totalLbl = UILabel()
        totalLbl.text = String(format: "₹%.2f", item.grandTotal)
        totalLbl.font = .systemFont(ofSize: 18.5, weight: .bold)
        totalLbl.textColor = UIColor(red: 0.059, green: 0.090, blue: 0.165, alpha: 1)

        let viewBtn = UIButton(type: .system)
        if #available(iOS 15.0, *) {
            var config = UIButton.Configuration.filled()
            config.title = "Receipt"
            config.image = UIImage(systemName: "doc.text.fill")
            config.imagePadding = 6
            config.baseForegroundColor = UIColor(red: 4/255, green: 30/255, blue: 73/255, alpha: 1) // #041E49
            config.baseBackgroundColor = UIColor(red: 211/255, green: 227/255, blue: 253/255, alpha: 1) // #D3E3FD
            config.contentInsets = NSDirectionalEdgeInsets(top: 8, leading: 14, bottom: 8, trailing: 16)
            config.cornerStyle = .capsule
            var titleAttr = AttributeContainer()
            titleAttr.font = .systemFont(ofSize: 13, weight: .bold)
            config.attributedTitle = AttributedString("Receipt", attributes: titleAttr)
            viewBtn.configuration = config
        } else {
            viewBtn.setTitle(" Receipt", for: .normal)
            viewBtn.setImage(UIImage(systemName: "doc.text.fill"), for: .normal)
            viewBtn.tintColor = UIColor(red: 4/255, green: 30/255, blue: 73/255, alpha: 1)
            viewBtn.setTitleColor(UIColor(red: 4/255, green: 30/255, blue: 73/255, alpha: 1), for: .normal)
            viewBtn.titleLabel?.font = .systemFont(ofSize: 13, weight: .bold)
            viewBtn.backgroundColor = UIColor(red: 211/255, green: 227/255, blue: 253/255, alpha: 1)
            viewBtn.layer.cornerRadius = 18
            viewBtn.contentEdgeInsets = UIEdgeInsets(top: 8, left: 14, bottom: 8, right: 16)
        }
        viewBtn.layer.cornerRadius = 18
        viewBtn.layer.borderWidth = 0
        viewBtn.layer.shadowColor = UIColor.black.cgColor
        viewBtn.layer.shadowOpacity = 0.06
        viewBtn.layer.shadowRadius = 3
        viewBtn.layer.shadowOffset = CGSize(width: 0, height: 1)
        viewBtn.tag = indexPath.row
        viewBtn.addTarget(self, action: #selector(didTapReceiptDetail(_:)), for: .touchUpInside)

        [avatarIV, nameLbl, detailsLbl, numBadge, dateLbl, statusBadge, totalLbl, viewBtn].forEach {
            $0.translatesAutoresizingMaskIntoConstraints = false
            card.addSubview($0)
        }

        NSLayoutConstraint.activate([
            card.topAnchor.constraint(equalTo: cell.contentView.topAnchor, constant: 6),
            card.leadingAnchor.constraint(equalTo: cell.contentView.leadingAnchor, constant: 16),
            card.trailingAnchor.constraint(equalTo: cell.contentView.trailingAnchor, constant: -16),
            card.bottomAnchor.constraint(equalTo: cell.contentView.bottomAnchor, constant: -6),

            avatarIV.topAnchor.constraint(equalTo: card.topAnchor, constant: 14),
            avatarIV.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 14),

            nameLbl.topAnchor.constraint(equalTo: avatarIV.topAnchor),
            nameLbl.leadingAnchor.constraint(equalTo: avatarIV.trailingAnchor, constant: 10),
            nameLbl.trailingAnchor.constraint(lessThanOrEqualTo: numBadge.leadingAnchor, constant: -8),

            numBadge.centerYAnchor.constraint(equalTo: nameLbl.centerYAnchor),
            numBadge.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -14),

            detailsLbl.topAnchor.constraint(equalTo: nameLbl.bottomAnchor, constant: 3),
            detailsLbl.leadingAnchor.constraint(equalTo: nameLbl.leadingAnchor),

            dateLbl.topAnchor.constraint(equalTo: avatarIV.bottomAnchor, constant: 10),
            dateLbl.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 14),

            statusBadge.centerYAnchor.constraint(equalTo: dateLbl.centerYAnchor),
            statusBadge.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -14),

            totalLbl.topAnchor.constraint(equalTo: dateLbl.bottomAnchor, constant: 12),
            totalLbl.leadingAnchor.constraint(equalTo: nameLbl.leadingAnchor),
            totalLbl.bottomAnchor.constraint(equalTo: card.bottomAnchor, constant: -14),

            viewBtn.centerYAnchor.constraint(equalTo: totalLbl.centerYAnchor),
            viewBtn.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -14),
            viewBtn.heightAnchor.constraint(equalToConstant: 36),
        ])

        return cell
    }

    func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        let item = filteredInvoices[indexPath.row]
        showInvoiceDetailSheet(item)
    }

    @objc private func didTapReceiptDetail(_ sender: UIButton) {
        if sender.tag < filteredInvoices.count {
            let item = filteredInvoices[sender.tag]
            showInvoiceDetailSheet(item)
        }
    }

    private func showInvoiceDetailSheet(_ item: BillingInvoiceItem) {
        let alert = UIAlertController(title: "Invoice #\(item.invoiceNumber)", message: """
        Patient: \(item.patientName)
        \(item.patientDetails)
        Payment Mode: \(item.paymentMethod)
        
        Subtotal: ₹\(String(format: "%.2f", item.subtotal))
        Discount: - ₹\(String(format: "%.2f", item.discount))
        Grand Total: ₹\(String(format: "%.2f", item.grandTotal))
        Paid: ₹\(String(format: "%.2f", item.paidAmount))
        """, preferredStyle: .actionSheet)

        alert.addAction(UIAlertAction(title: "Close", style: .cancel, handler: nil))
        present(alert, animated: true, completion: nil)
    }
}
