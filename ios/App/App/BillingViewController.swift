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
// MARK: – Dedicated Invoice UITableViewCell (Crash-Proof & 60 FPS)
// ─────────────────────────────────────────────────────────────────────────────
class BillingInvoiceCell: UITableViewCell {
    static let reuseIdentifier = "BillingInvoiceCell"

    private let card = UIView()
    private let avatarIV = PatientAvatarHelper.createAvatar(size: 38)
    private let nameLbl = UILabel()
    private let detailsLbl = UILabel()
    private let numBadge = UILabel()
    private let dateLbl = UILabel()
    private let statusBadge = UILabel()
    private let totalLbl = UILabel()
    private let viewBtn = UIButton(type: .system)

    var onReceiptTapped: (() -> Void)?

    override init(style: UITableViewCell.CellStyle, reuseIdentifier: String?) {
        super.init(style: style, reuseIdentifier: reuseIdentifier)
        backgroundColor = .clear
        selectionStyle = .none
        setupViews()
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    private func setupViews() {
        card.backgroundColor = .white
        card.layer.cornerRadius = 18
        card.layer.shadowColor = UIColor(red: 0.05, green: 0.15, blue: 0.30, alpha: 1).cgColor
        card.layer.shadowOpacity = 0.06
        card.layer.shadowRadius = 6
        card.layer.shadowOffset = CGSize(width: 0, height: 3)
        card.layer.borderWidth = 1
        card.layer.borderColor = UIColor(red: 0.92, green: 0.94, blue: 0.97, alpha: 1).cgColor
        card.translatesAutoresizingMaskIntoConstraints = false
        contentView.addSubview(card)

        nameLbl.font = .systemFont(ofSize: 16, weight: .bold)
        nameLbl.textColor = UIColor(red: 0.059, green: 0.090, blue: 0.165, alpha: 1)

        detailsLbl.font = .systemFont(ofSize: 12, weight: .medium)
        detailsLbl.textColor = UIColor(red: 0.392, green: 0.451, blue: 0.549, alpha: 1)

        numBadge.font = .systemFont(ofSize: 12, weight: .bold)
        numBadge.textColor = UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1)
        numBadge.backgroundColor = UIColor(red: 0.937, green: 0.965, blue: 1.0, alpha: 1)
        numBadge.layer.cornerRadius = 8
        numBadge.clipsToBounds = true

        dateLbl.font = .systemFont(ofSize: 12, weight: .medium)
        dateLbl.textColor = UIColor(red: 0.392, green: 0.451, blue: 0.549, alpha: 1)

        statusBadge.font = .systemFont(ofSize: 11, weight: .bold)
        statusBadge.layer.cornerRadius = 6
        statusBadge.clipsToBounds = true

        totalLbl.font = .systemFont(ofSize: 18.5, weight: .bold)
        totalLbl.textColor = UIColor(red: 0.059, green: 0.090, blue: 0.165, alpha: 1)

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
        viewBtn.addTarget(self, action: #selector(didTapReceipt), for: .touchUpInside)

        [avatarIV, nameLbl, detailsLbl, numBadge, dateLbl, statusBadge, totalLbl, viewBtn].forEach {
            $0.translatesAutoresizingMaskIntoConstraints = false
            card.addSubview($0)
        }

        NSLayoutConstraint.activate([
            card.topAnchor.constraint(equalTo: contentView.topAnchor, constant: 6),
            card.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 16),
            card.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -16),
            card.bottomAnchor.constraint(equalTo: contentView.bottomAnchor, constant: -6),

            avatarIV.topAnchor.constraint(equalTo: card.topAnchor, constant: 14),
            avatarIV.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 14),
            avatarIV.widthAnchor.constraint(equalToConstant: 38),
            avatarIV.heightAnchor.constraint(equalToConstant: 38),

            nameLbl.topAnchor.constraint(equalTo: avatarIV.topAnchor),
            nameLbl.leadingAnchor.constraint(equalTo: avatarIV.trailingAnchor, constant: 10),
            nameLbl.trailingAnchor.constraint(lessThanOrEqualTo: numBadge.leadingAnchor, constant: -8),

            numBadge.centerYAnchor.constraint(equalTo: nameLbl.centerYAnchor),
            numBadge.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -14),

            detailsLbl.topAnchor.constraint(equalTo: nameLbl.bottomAnchor, constant: 3),
            detailsLbl.leadingAnchor.constraint(equalTo: nameLbl.leadingAnchor),
            detailsLbl.trailingAnchor.constraint(lessThanOrEqualTo: card.trailingAnchor, constant: -14),

            dateLbl.topAnchor.constraint(equalTo: avatarIV.bottomAnchor, constant: 10),
            dateLbl.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 14),

            statusBadge.centerYAnchor.constraint(equalTo: dateLbl.centerYAnchor),
            statusBadge.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -14),

            totalLbl.topAnchor.constraint(equalTo: dateLbl.bottomAnchor, constant: 12),
            totalLbl.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 14),
            totalLbl.bottomAnchor.constraint(equalTo: card.bottomAnchor, constant: -14),

            viewBtn.centerYAnchor.constraint(equalTo: totalLbl.centerYAnchor),
            viewBtn.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -14),
            viewBtn.heightAnchor.constraint(equalToConstant: 36)
        ])
    }

    @objc private func didTapReceipt() {
        onReceiptTapped?()
    }

    func configure(with item: BillingInvoiceItem, onReceiptTap: @escaping () -> Void) {
        self.onReceiptTapped = onReceiptTap

        nameLbl.text = item.patientName
        detailsLbl.text = item.patientDetails
        numBadge.text = " \(item.invoiceNumber) "
        dateLbl.text = "\(item.dateLogged) • \(item.paymentMethod)"
        statusBadge.text = " \(item.paymentStatus) "
        totalLbl.text = String(format: "₹%.2f", item.grandTotal)

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
    }
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
    private let headerGradient     = CAGradientLayer()
    private let backBtn            = UIButton(type: .system)
    private let refreshBtn         = UIButton(type: .system)
    private let headerNewInvoiceBtn = UIButton(type: .system)
    private let titleLabel         = UILabel()
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

    // Auto-refresh timer (60s) matching Android's real-time polling
    private var refreshTimer: Timer?

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 0.973, green: 0.980, blue: 0.988, alpha: 1) // #F8FAFC

        setupHeader()
        setupSearchAndFilters()
        setupTableView()
        setupEmptyState()

        fetchInvoices()
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        fetchInvoices()
        startRefreshTimer()
    }

    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        stopRefreshTimer()
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        headerGradient.frame = topHeaderView.bounds
    }

    override var preferredStatusBarStyle: UIStatusBarStyle {
        return .lightContent
    }

    // ── Ultra-Premium 3-Tier Sapphire Header & Bento KPI Cards ────────────────
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
        topHeaderView.layer.cornerRadius = 28
        topHeaderView.layer.maskedCorners = [.layerMinXMaxYCorner, .layerMaxXMaxYCorner]
        topHeaderView.clipsToBounds = true

        // Tier 1: Action Navigation Bar
        let topBar = UIView()
        topBar.translatesAutoresizingMaskIntoConstraints = false
        topHeaderView.addSubview(topBar)

        backBtn.setImage(UIImage(systemName: "chevron.left"), for: .normal)
        backBtn.tintColor = .white
        backBtn.backgroundColor = UIColor.white.withAlphaComponent(0.20)
        backBtn.layer.cornerRadius = 19
        backBtn.layer.borderWidth = 1
        backBtn.layer.borderColor = UIColor.white.withAlphaComponent(0.30).cgColor
        backBtn.translatesAutoresizingMaskIntoConstraints = false
        backBtn.addTarget(self, action: #selector(didTapBack), for: .touchUpInside)
        topBar.addSubview(backBtn)

        refreshBtn.setImage(UIImage(systemName: "arrow.clockwise"), for: .normal)
        refreshBtn.tintColor = .white
        refreshBtn.backgroundColor = UIColor.white.withAlphaComponent(0.20)
        refreshBtn.layer.cornerRadius = 19
        refreshBtn.layer.borderWidth = 1
        refreshBtn.layer.borderColor = UIColor.white.withAlphaComponent(0.30).cgColor
        refreshBtn.translatesAutoresizingMaskIntoConstraints = false
        refreshBtn.addTarget(self, action: #selector(didTapRefresh), for: .touchUpInside)
        topBar.addSubview(refreshBtn)

        // White Capsule CTA "+ New Invoice"
        headerNewInvoiceBtn.setTitle("+ New Invoice", for: .normal)
        headerNewInvoiceBtn.titleLabel?.font = .systemFont(ofSize: 13.5, weight: .bold)
        headerNewInvoiceBtn.setTitleColor(UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1), for: .normal)
        headerNewInvoiceBtn.backgroundColor = .white
        headerNewInvoiceBtn.layer.cornerRadius = 18
        headerNewInvoiceBtn.layer.shadowColor = UIColor.black.cgColor
        headerNewInvoiceBtn.layer.shadowOpacity = 0.12
        headerNewInvoiceBtn.layer.shadowRadius = 4
        headerNewInvoiceBtn.layer.shadowOffset = CGSize(width: 0, height: 2)
        headerNewInvoiceBtn.contentEdgeInsets = UIEdgeInsets(top: 8, left: 14, bottom: 8, right: 16)
        headerNewInvoiceBtn.translatesAutoresizingMaskIntoConstraints = false
        headerNewInvoiceBtn.addTarget(self, action: #selector(didTapNewInvoice), for: .touchUpInside)
        topBar.addSubview(headerNewInvoiceBtn)

        // Tier 2: Hero Greeting Title & Subtitle
        titleLabel.text = "Billing & Invoices"
        titleLabel.font = .systemFont(ofSize: 24, weight: .heavy)
        titleLabel.textColor = .white
        titleLabel.translatesAutoresizingMaskIntoConstraints = false

        subLbl.text = "Financial Ledger & Revenue Hub"
        subLbl.font = .systemFont(ofSize: 12.5, weight: .medium)
        subLbl.textColor = UIColor(red: 0.780, green: 0.875, blue: 1.0, alpha: 1) // #C7DFFF
        subLbl.translatesAutoresizingMaskIntoConstraints = false

        let titleStack = UIStackView(arrangedSubviews: [titleLabel, subLbl])
        titleStack.axis = .vertical
        titleStack.spacing = 3
        titleStack.translatesAutoresizingMaskIntoConstraints = false
        topHeaderView.addSubview(titleStack)

        // Tier 3: 4 Frosted Glass Bento KPI Stat Cards
        kpiScrollView.showsHorizontalScrollIndicator = false
        kpiScrollView.clipsToBounds = false
        kpiScrollView.translatesAutoresizingMaskIntoConstraints = false
        topHeaderView.addSubview(kpiScrollView)

        kpiStack.axis = .horizontal
        kpiStack.spacing = 10
        kpiStack.translatesAutoresizingMaskIntoConstraints = false
        kpiScrollView.addSubview(kpiStack)

        kpiStack.addArrangedSubview(makeGlassKpiCard(title: "TOTAL REVENUE", valueLbl: lblTotalRev, dotColor: UIColor(red: 0.31, green: 0.89, blue: 0.63, alpha: 1), tagColor: UIColor(red: 0.65, green: 0.95, blue: 0.82, alpha: 1), subText: "All time collections"))
        kpiStack.addArrangedSubview(makeGlassKpiCard(title: "THIS MONTH", valueLbl: lblMonthRev, dotColor: UIColor(red: 0.49, green: 0.83, blue: 0.99, alpha: 1), tagColor: UIColor(red: 0.73, green: 0.91, blue: 1.0, alpha: 1), subText: "Current month"))
        kpiStack.addArrangedSubview(makeGlassKpiCard(title: "SETTLED INVOICES", valueLbl: lblSettledCnt, dotColor: UIColor(red: 0.99, green: 0.90, blue: 0.54, alpha: 1), tagColor: UIColor(red: 0.99, green: 0.90, blue: 0.54, alpha: 1), subText: "Fully paid"))
        kpiStack.addArrangedSubview(makeGlassKpiCard(title: "TOTAL INVOICES", valueLbl: lblTotalCnt, dotColor: UIColor(red: 0.80, green: 0.85, blue: 1.0, alpha: 1), tagColor: UIColor(red: 0.85, green: 0.88, blue: 1.0, alpha: 1), subText: "All generated"))

        NSLayoutConstraint.activate([
            topHeaderView.topAnchor.constraint(equalTo: view.topAnchor),
            topHeaderView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            topHeaderView.trailingAnchor.constraint(equalTo: view.trailingAnchor),

            topBar.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 4),
            topBar.leadingAnchor.constraint(equalTo: topHeaderView.leadingAnchor, constant: 18),
            topBar.trailingAnchor.constraint(equalTo: topHeaderView.trailingAnchor, constant: -18),
            topBar.heightAnchor.constraint(equalToConstant: 42),

            backBtn.leadingAnchor.constraint(equalTo: topBar.leadingAnchor),
            backBtn.centerYAnchor.constraint(equalTo: topBar.centerYAnchor),
            backBtn.widthAnchor.constraint(equalToConstant: 38),
            backBtn.heightAnchor.constraint(equalToConstant: 38),

            refreshBtn.leadingAnchor.constraint(equalTo: backBtn.trailingAnchor, constant: 8),
            refreshBtn.centerYAnchor.constraint(equalTo: topBar.centerYAnchor),
            refreshBtn.widthAnchor.constraint(equalToConstant: 38),
            refreshBtn.heightAnchor.constraint(equalToConstant: 38),

            headerNewInvoiceBtn.trailingAnchor.constraint(equalTo: topBar.trailingAnchor),
            headerNewInvoiceBtn.centerYAnchor.constraint(equalTo: topBar.centerYAnchor),
            headerNewInvoiceBtn.heightAnchor.constraint(equalToConstant: 36),

            titleStack.topAnchor.constraint(equalTo: topBar.bottomAnchor, constant: 14),
            titleStack.leadingAnchor.constraint(equalTo: topHeaderView.leadingAnchor, constant: 18),
            titleStack.trailingAnchor.constraint(equalTo: topHeaderView.trailingAnchor, constant: -18),

            kpiScrollView.topAnchor.constraint(equalTo: titleStack.bottomAnchor, constant: 16),
            kpiScrollView.leadingAnchor.constraint(equalTo: topHeaderView.leadingAnchor),
            kpiScrollView.trailingAnchor.constraint(equalTo: topHeaderView.trailingAnchor),
            kpiScrollView.heightAnchor.constraint(equalToConstant: 80),
            kpiScrollView.bottomAnchor.constraint(equalTo: topHeaderView.bottomAnchor, constant: -18),

            kpiStack.topAnchor.constraint(equalTo: kpiScrollView.topAnchor),
            kpiStack.bottomAnchor.constraint(equalTo: kpiScrollView.bottomAnchor),
            kpiStack.leadingAnchor.constraint(equalTo: kpiScrollView.leadingAnchor, constant: 18),
            kpiStack.trailingAnchor.constraint(equalTo: kpiScrollView.trailingAnchor, constant: -18),
            kpiStack.heightAnchor.constraint(equalTo: kpiScrollView.heightAnchor)
        ])
    }

    private func makeGlassKpiCard(title: String, valueLbl: UILabel, dotColor: UIColor, tagColor: UIColor, subText: String) -> UIView {
        let card = UIView()
        card.backgroundColor = UIColor.white.withAlphaComponent(0.15)
        card.layer.cornerRadius = 16
        card.layer.borderWidth = 1
        card.layer.borderColor = UIColor.white.withAlphaComponent(0.24).cgColor
        card.layer.masksToBounds = true
        card.translatesAutoresizingMaskIntoConstraints = false
        card.widthAnchor.constraint(equalToConstant: 148).isActive = true
        card.heightAnchor.constraint(equalToConstant: 80).isActive = true

        let dotView = UIView()
        dotView.backgroundColor = dotColor
        dotView.layer.cornerRadius = 3
        dotView.translatesAutoresizingMaskIntoConstraints = false
        dotView.widthAnchor.constraint(equalToConstant: 6).isActive = true
        dotView.heightAnchor.constraint(equalToConstant: 6).isActive = true

        let tagLbl = UILabel()
        tagLbl.text = title
        tagLbl.font = .systemFont(ofSize: 10, weight: .bold)
        tagLbl.textColor = tagColor
        tagLbl.translatesAutoresizingMaskIntoConstraints = false

        let tagRow = UIStackView(arrangedSubviews: [dotView, tagLbl])
        tagRow.axis = .horizontal
        tagRow.spacing = 5
        tagRow.alignment = .center
        tagRow.translatesAutoresizingMaskIntoConstraints = false

        valueLbl.text = "₹0"
        valueLbl.font = .systemFont(ofSize: 20, weight: .heavy)
        valueLbl.textColor = .white
        valueLbl.translatesAutoresizingMaskIntoConstraints = false

        let sLbl = UILabel()
        sLbl.text = subText
        sLbl.font = .systemFont(ofSize: 10, weight: .medium)
        sLbl.textColor = UIColor(red: 0.780, green: 0.875, blue: 1.0, alpha: 1)
        sLbl.translatesAutoresizingMaskIntoConstraints = false

        let stack = UIStackView(arrangedSubviews: [tagRow, valueLbl, sLbl])
        stack.axis = .vertical
        stack.spacing = 2
        stack.alignment = .leading
        stack.translatesAutoresizingMaskIntoConstraints = false
        card.addSubview(stack)

        NSLayoutConstraint.activate([
            stack.topAnchor.constraint(equalTo: card.topAnchor, constant: 10),
            stack.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 13),
            stack.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -13),
            stack.bottomAnchor.constraint(lessThanOrEqualTo: card.bottomAnchor, constant: -10)
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
        searchField.returnKeyType = .search
        searchField.translatesAutoresizingMaskIntoConstraints = false

        let searchIconContainer = UIView(frame: CGRect(x: 0, y: 0, width: 38, height: 38))
        let searchIcon = UIImageView(image: UIImage(systemName: "magnifyingglass"))
        searchIcon.tintColor = UIColor(red: 0.580, green: 0.639, blue: 0.722, alpha: 1)
        searchIcon.frame = CGRect(x: 12, y: 10, width: 18, height: 18)
        searchIconContainer.addSubview(searchIcon)
        searchField.leftView = searchIconContainer
        searchField.leftViewMode = .always
        searchField.addTarget(self, action: #selector(didSearchInvoices), for: .editingChanged)
        view.addSubview(searchField)

        filterScrollView.showsHorizontalScrollIndicator = false
        filterScrollView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(filterScrollView)

        filterChipsStack.axis = .horizontal
        filterChipsStack.spacing = 8
        filterChipsStack.translatesAutoresizingMaskIntoConstraints = false
        filterScrollView.addSubview(filterChipsStack)

        NSLayoutConstraint.activate([
            searchField.topAnchor.constraint(equalTo: topHeaderView.bottomAnchor, constant: 14),
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
            filterChipsStack.heightAnchor.constraint(equalTo: filterScrollView.heightAnchor)
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
        tableView.register(BillingInvoiceCell.self, forCellReuseIdentifier: BillingInvoiceCell.reuseIdentifier)
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
            req.setValue("token=\(token); auth-token=\(token); auth_token=\(token)", forHTTPHeaderField: "Cookie")
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

    @objc private func didTapRefresh() {
        fetchInvoices()
    }

    private func startRefreshTimer() {
        stopRefreshTimer()
        refreshTimer = Timer.scheduledTimer(withTimeInterval: 60.0, repeats: true) { [weak self] _ in
            self?.fetchInvoices()
        }
    }

    private func stopRefreshTimer() {
        refreshTimer?.invalidate()
        refreshTimer = nil
    }

    private func getAuthToken() -> String? {
        // Try all fallback paths just like Android checks multiple token sources
        if let token = KeychainManager.shared.getToken(), !token.isEmpty { return token }
        if let token = KeychainManager.read(forKey: KeychainManager.tokenKey), !token.isEmpty { return token }
        if let token = UserDefaults.standard.string(forKey: "auth_token"), !token.isEmpty { return token }
        if let token = UserDefaults.standard.string(forKey: "token"), !token.isEmpty { return token }
        if let cookies = HTTPCookieStorage.shared.cookies {
            for cookie in cookies {
                if (cookie.name == "token" || cookie.name == "auth-token") && !cookie.value.isEmpty {
                    return cookie.value
                }
            }
        }
        return nil
    }

    private func fetchInvoices() {
        fetchUserInfo()
        spinner.startAnimating()
        let token = getAuthToken()
        guard let url = URL(string: baseUrl + "/api/workspace/invoices") else { return }
        var req = URLRequest(url: url)
        req.httpMethod = "GET"
        if let token = token {
            req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            req.setValue("token=\(token); auth-token=\(token); auth_token=\(token)", forHTTPHeaderField: "Cookie")
        }

        URLSession.shared.dataTask(with: req) { [weak self] data, response, error in
            guard let self = self else { return }
            DispatchQueue.main.async { self.spinner.stopAnimating() }

            if let data = data,
               let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {

                // Parse Stats — handle both Double and Int types from API
                if let stats = json["stats"] as? [String: Any] {
                    self.kpiStats.totalRevenue   = (stats["totalRevenue"]   as? Double) ?? Double((stats["totalRevenue"]   as? Int) ?? 0)
                    self.kpiStats.monthlyRevenue = (stats["monthlyRevenue"] as? Double) ?? Double((stats["monthlyRevenue"] as? Int) ?? 0)
                    self.kpiStats.settledCount   = (stats["settledCount"]   as? Int) ?? ((stats["paidCount"]     as? Int) ?? 0)
                    self.kpiStats.totalCount     = (stats["totalCount"]     as? Int) ?? ((stats["invoiceCount"]  as? Int) ?? 0)
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
                        if !pGender.isEmpty {
                            details = details.isEmpty ? pGender : "\(details) • \(pGender)"
                        }
                        if !pPhone.isEmpty {
                            details = details.isEmpty ? pPhone : "\(details) • \(pPhone)"
                        }
                        if details.isEmpty { details = "General Patient" }

                        let grandTotal = (inv["grandTotal"] as? NSNumber)?.doubleValue ?? ((inv["total"] as? NSNumber)?.doubleValue ?? 0)
                        let paid = (inv["paidAmount"] as? NSNumber)?.doubleValue ?? 0
                        let discount = (inv["discount"] as? NSNumber)?.doubleValue ?? 0
                        let subtotal = (inv["subtotal"] as? NSNumber)?.doubleValue ?? (grandTotal + discount)
                        let balance = (inv["balance"] as? NSNumber)?.doubleValue ?? max(0, grandTotal - paid)

                        var status = inv["paymentStatus"] as? String ?? (balance == 0 ? "PAID" : "PENDING")
                        if status.isEmpty { status = balance == 0 ? "PAID" : "PENDING" }

                        var lines: [BillingTestLine] = []
                        if let items = inv["items"] as? [[String: Any]] {
                            for it in items {
                                let lineName = it["description"] as? String ?? (it["name"] as? String ?? (it["testName"] as? String ?? "Diagnostic Test"))
                                let linePrice = (it["total"] as? NSNumber)?.doubleValue ?? ((it["unitPrice"] as? NSNumber)?.doubleValue ?? ((it["price"] as? NSNumber)?.doubleValue ?? 0))
                                lines.append(BillingTestLine(testName: lineName, price: linePrice))
                            }
                        }

                        let item = BillingInvoiceItem(
                            id: inv["id"] as? String ?? UUID().uuidString,
                            invoiceNumber: inv["invoiceNumber"] as? String ?? "INV-\(loaded.count + 1000)",
                            patientName: pName,
                            patientDetails: details,
                            dateLogged: self.formatDate(inv["createdAt"] as? String ?? ""),
                            paymentMethod: inv["paymentMethod"] as? String ?? "UPI",
                            paymentStatus: status,
                            grandTotal: grandTotal,
                            paidAmount: paid,
                            balanceDue: balance,
                            discount: discount,
                            subtotal: subtotal,
                            items: lines
                        )
                        loaded.append(item)
                    }
                    self.allInvoices = loaded
                }

                DispatchQueue.main.async {
                    self.computeAndApplyKpis()
                    self.applyInvoicesFilter()
                }
            }
        }.resume()
    }

    private func formatDate(_ iso: String) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let d = formatter.date(from: iso) {
            let out = DateFormatter()
            out.dateFormat = "dd MMM, hh:mm a"
            return out.string(from: d)
        }
        let fallback = DateFormatter()
        fallback.dateFormat = "yyyy-MM-dd'T'HH:mm:ss.SSSZ"
        if let d = fallback.date(from: iso) {
            let out = DateFormatter()
            out.dateFormat = "dd MMM, hh:mm a"
            return out.string(from: d)
        }
        return "Recent"
    }

    private func computeAndApplyKpis() {
        var totalRev: Double = 0
        var monthlyRev: Double = 0
        var settledCnt = 0
        let totalCnt = allInvoices.count

        for inv in allInvoices {
            if inv.paymentStatus.uppercased() == "PAID" {
                totalRev += inv.grandTotal
            } else {
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
        guard let cell = tableView.dequeueReusableCell(withIdentifier: BillingInvoiceCell.reuseIdentifier, for: indexPath) as? BillingInvoiceCell else {
            return UITableViewCell()
        }
        let item = filteredInvoices[indexPath.row]
        cell.configure(with: item) { [weak self] in
            self?.showInvoiceDetailSheet(item)
        }
        return cell
    }

    func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        let item = filteredInvoices[indexPath.row]
        showInvoiceDetailSheet(item)
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
        alert.popoverPresentationController?.sourceView = self.view
        alert.popoverPresentationController?.sourceRect = CGRect(x: self.view.bounds.midX, y: self.view.bounds.midY, width: 0, height: 0)
        present(alert, animated: true, completion: nil)
    }
}
