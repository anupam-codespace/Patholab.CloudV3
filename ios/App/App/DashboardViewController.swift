import UIKit
import WebKit

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  DashboardViewController — Native Financial Analytics Console (iOS)
 *  Directly mirroring web (/workspace/analytics):
 *   1. 4 Primary Bento KPIs: Revenue, Expenses, Net Profit (Margin %), Pending Due
 *   2. Operational Summary: Invoices Count & Patients Count
 *   3. Frosted Sapphire Timeframe Selector Pill (All Time, This Year, This Month, Last 30 Days)
 *   4. Real-Time Two-Way Sync: "+ Log Expense" Modal with Live Database Persistence
 *   5. Dynamic Interactive Ledgers: Recent Invoices (B2B tags) & Recent Expenses
 * ═══════════════════════════════════════════════════════════════════════════
 */
class DashboardViewController: UIViewController {

    private let scrollView = UIScrollView()
    private let refreshControl = UIRefreshControl()
    private let contentStack = UIStackView()

    // Header Views
    private let topHeaderView = UIView()
    private let userRoleLabLbl = UILabel()
    private let refreshBtn = UIButton(type: .system)
    private let timeframeBtn = UIButton(type: .system)
    private let lblTimeframeText = UILabel()
    private var selectedTimeframe = "all_time"

    // Primary Top-Level KPI Metric Labels
    private let lblTotalRevenue = UILabel()
    private let lblTotalExpenses = UILabel()
    private let lblNetProfit = UILabel()
    private let lblProfitMargin = UILabel()
    private let lblPendingDue = UILabel()

    // GST & Revenue Adjustments Labels (Full Web Parity)
    private let lblGrossBilling = UILabel()
    private let lblDiscountsGiven = UILabel()
    private let lblDiscountPercent = UILabel()
    private var lblDiscountSubtitle: UILabel?
    private let lblCGST = UILabel()
    private let lblSGST = UILabel()

    // Operational Counters
    private let lblInvoicesCount = UILabel()
    private let lblPatientsCount = UILabel()

    // Ledger Tabs & Containers (All Records, Recent Invoices, Recent Expenses)
    private let tabLedgerAll = UIButton(type: .system)
    private let tabLedgerInvoices = UIButton(type: .system)
    private let tabLedgerExpenses = UIButton(type: .system)
    private let ledgerStack = UIStackView()
    private let emptyStateLbl = UILabel()

    private var cachedInvoices: [[String: Any]] = []
    private var cachedExpenses: [[String: Any]] = []
    private var selectedLedgerIndex = 0 // 0: All, 1: Invoices, 2: Expenses

    private var autoRefreshTimer: Timer?

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 0.973, green: 0.980, blue: 0.988, alpha: 1) // #F8FAFC

        setupHeader()
        setupScrollView()
        setupPrimaryKPIGrid()
        setupGstAndDiscountGrid()
        setupOperationalCountsRow()
        setupLedgersSection()
        setupQuickActions()

        syncUserDetails()
        fetchLoggedInUserInfo()
        fetchDashboardMetrics()

        NotificationCenter.default.addObserver(self, selector: #selector(appWillEnterForeground), name: UIApplication.willEnterForegroundNotification, object: nil)
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        fetchLoggedInUserInfo()
        fetchDashboardMetrics()
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        startAutoRefresh()
    }

    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        stopAutoRefresh()
    }

    deinit {
        NotificationCenter.default.removeObserver(self)
        stopAutoRefresh()
    }

    private func startAutoRefresh() {
        stopAutoRefresh()
        autoRefreshTimer = Timer.scheduledTimer(withTimeInterval: 25.0, repeats: true) { [weak self] _ in
            self?.fetchDashboardMetrics()
        }
    }

    private func stopAutoRefresh() {
        autoRefreshTimer?.invalidate()
        autoRefreshTimer = nil
    }

    @objc private func appWillEnterForeground() {
        fetchLoggedInUserInfo()
        fetchDashboardMetrics()
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
        topHeaderView.layer.cornerRadius = 24
        topHeaderView.layer.maskedCorners = [.layerMinXMaxYCorner, .layerMaxXMaxYCorner]
        topHeaderView.clipsToBounds = true

        // Back Button
        let backBtn = UIButton(type: .system)
        backBtn.setImage(UIImage(systemName: "chevron.left"), for: .normal)
        backBtn.tintColor = .white
        backBtn.backgroundColor = UIColor.white.withAlphaComponent(0.18)
        backBtn.layer.cornerRadius = 19
        backBtn.layer.borderWidth = 1
        backBtn.layer.borderColor = UIColor.white.withAlphaComponent(0.25).cgColor
        backBtn.addTarget(self, action: #selector(didTapBack), for: .touchUpInside)
        backBtn.translatesAutoresizingMaskIntoConstraints = false
        topHeaderView.addSubview(backBtn)

        // Title
        let titleLbl = UILabel()
        titleLbl.text = "Financial Analytics"
        titleLbl.font = .systemFont(ofSize: 19, weight: .bold)
        titleLbl.textColor = .white
        titleLbl.translatesAutoresizingMaskIntoConstraints = false
        topHeaderView.addSubview(titleLbl)

        // Subtitle — Financial overview; synced dynamically by syncUserDetails()
        userRoleLabLbl.text = "Financial Health Overview"
        userRoleLabLbl.isHidden = false
        userRoleLabLbl.font = .systemFont(ofSize: 11.5, weight: .medium)
        userRoleLabLbl.textColor = UIColor(red: 0.78, green: 0.88, blue: 1.0, alpha: 1)
        userRoleLabLbl.translatesAutoresizingMaskIntoConstraints = false
        topHeaderView.addSubview(userRoleLabLbl)

        // Refresh Button
        refreshBtn.setImage(UIImage(systemName: "arrow.clockwise"), for: .normal)
        refreshBtn.tintColor = .white
        refreshBtn.backgroundColor = UIColor.white.withAlphaComponent(0.18)
        refreshBtn.layer.cornerRadius = 19
        refreshBtn.layer.borderWidth = 1
        refreshBtn.layer.borderColor = UIColor.white.withAlphaComponent(0.25).cgColor
        refreshBtn.addTarget(self, action: #selector(didTapRefresh), for: .touchUpInside)
        refreshBtn.translatesAutoresizingMaskIntoConstraints = false
        topHeaderView.addSubview(refreshBtn)

        // Secondary Header Row: Timeframe Pill & Wallet Status Badge
        let controlsRow = UIStackView()
        controlsRow.axis = .horizontal
        controlsRow.spacing = 8
        controlsRow.alignment = .center
        controlsRow.translatesAutoresizingMaskIntoConstraints = false
        topHeaderView.addSubview(controlsRow)

        // Frosted Sapphire Timeframe Selector Pill
        timeframeBtn.backgroundColor = UIColor.white.withAlphaComponent(0.14)
        timeframeBtn.layer.cornerRadius = 12
        timeframeBtn.layer.borderWidth = 1
        timeframeBtn.layer.borderColor = UIColor.white.withAlphaComponent(0.25).cgColor
        timeframeBtn.addTarget(self, action: #selector(didTapTimeframePill), for: .touchUpInside)

        let tfStack = UIStackView()
        tfStack.axis = .horizontal
        tfStack.spacing = 6
        tfStack.alignment = .center
        tfStack.isUserInteractionEnabled = false
        tfStack.translatesAutoresizingMaskIntoConstraints = false

        let calImg = UIImageView(image: UIImage(systemName: "calendar"))
        calImg.tintColor = UIColor(red: 0.8, green: 0.88, blue: 1.0, alpha: 1)
        calImg.contentMode = .scaleAspectFit
        calImg.widthAnchor.constraint(equalToConstant: 14).isActive = true
        calImg.heightAnchor.constraint(equalToConstant: 14).isActive = true

        let lblTfBadge = UILabel()
        lblTfBadge.text = "TIMEFRAME:"
        lblTfBadge.font = .systemFont(ofSize: 10, weight: .bold)
        lblTfBadge.textColor = UIColor(red: 0.8, green: 0.88, blue: 1.0, alpha: 1)

        lblTimeframeText.text = "All Time"
        lblTimeframeText.font = .systemFont(ofSize: 11.5, weight: .bold)
        lblTimeframeText.textColor = .white

        let chevron = UIImageView(image: UIImage(systemName: "chevron.down"))
        chevron.tintColor = .white
        chevron.contentMode = .scaleAspectFit
        chevron.widthAnchor.constraint(equalToConstant: 11).isActive = true
        chevron.heightAnchor.constraint(equalToConstant: 11).isActive = true

        tfStack.addArrangedSubview(calImg)
        tfStack.addArrangedSubview(lblTfBadge)
        tfStack.addArrangedSubview(lblTimeframeText)
        tfStack.addArrangedSubview(chevron)
        timeframeBtn.addSubview(tfStack)

        NSLayoutConstraint.activate([
            tfStack.leadingAnchor.constraint(equalTo: timeframeBtn.leadingAnchor, constant: 10),
            tfStack.trailingAnchor.constraint(equalTo: timeframeBtn.trailingAnchor, constant: -10),
            tfStack.topAnchor.constraint(equalTo: timeframeBtn.topAnchor, constant: 7),
            tfStack.bottomAnchor.constraint(equalTo: timeframeBtn.bottomAnchor, constant: -7),
            timeframeBtn.heightAnchor.constraint(equalToConstant: 34),
        ])
        controlsRow.addArrangedSubview(timeframeBtn)

        // Wallet Era Status Badge
        let walletBadge = UIView()
        walletBadge.backgroundColor = UIColor(red: 0.02, green: 0.59, blue: 0.41, alpha: 0.2)
        walletBadge.layer.cornerRadius = 12
        walletBadge.layer.borderWidth = 1
        walletBadge.layer.borderColor = UIColor(red: 0.2, green: 0.83, blue: 0.6, alpha: 0.35).cgColor

        let wStack = UIStackView()
        wStack.axis = .horizontal
        wStack.spacing = 5
        wStack.alignment = .center
        wStack.translatesAutoresizingMaskIntoConstraints = false

        let dot = UIView()
        dot.backgroundColor = UIColor(red: 0.2, green: 0.83, blue: 0.6, alpha: 1)
        dot.layer.cornerRadius = 3
        dot.widthAnchor.constraint(equalToConstant: 6).isActive = true
        dot.heightAnchor.constraint(equalToConstant: 6).isActive = true

        let wTag = UILabel()
        wTag.text = "WALLET ERA:"
        wTag.font = .systemFont(ofSize: 9.5, weight: .bold)
        wTag.textColor = UIColor(red: 0.8, green: 0.95, blue: 0.88, alpha: 1)

        let wLbl = UILabel()
        wLbl.text = "Pay-As-You-Go Active"
        wLbl.font = .systemFont(ofSize: 11, weight: .bold)
        wLbl.textColor = .white

        wStack.addArrangedSubview(dot)
        wStack.addArrangedSubview(wTag)
        wStack.addArrangedSubview(wLbl)
        walletBadge.addSubview(wStack)

        NSLayoutConstraint.activate([
            wStack.leadingAnchor.constraint(equalTo: walletBadge.leadingAnchor, constant: 10),
            wStack.trailingAnchor.constraint(equalTo: walletBadge.trailingAnchor, constant: -10),
            wStack.topAnchor.constraint(equalTo: walletBadge.topAnchor, constant: 7),
            wStack.bottomAnchor.constraint(equalTo: walletBadge.bottomAnchor, constant: -7),
            walletBadge.heightAnchor.constraint(equalToConstant: 34),
        ])
        controlsRow.addArrangedSubview(walletBadge)

        NSLayoutConstraint.activate([
            topHeaderView.topAnchor.constraint(equalTo: view.topAnchor),
            topHeaderView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            topHeaderView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            topHeaderView.bottomAnchor.constraint(equalTo: controlsRow.bottomAnchor, constant: 16),

            backBtn.leadingAnchor.constraint(equalTo: topHeaderView.leadingAnchor, constant: 16),
            backBtn.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 10),
            backBtn.widthAnchor.constraint(equalToConstant: 38),
            backBtn.heightAnchor.constraint(equalToConstant: 38),

            titleLbl.leadingAnchor.constraint(equalTo: backBtn.trailingAnchor, constant: 12),
            titleLbl.centerYAnchor.constraint(equalTo: backBtn.centerYAnchor, constant: -8),

            userRoleLabLbl.leadingAnchor.constraint(equalTo: titleLbl.leadingAnchor),
            userRoleLabLbl.topAnchor.constraint(equalTo: titleLbl.bottomAnchor, constant: 2),

            refreshBtn.trailingAnchor.constraint(equalTo: topHeaderView.trailingAnchor, constant: -16),
            refreshBtn.centerYAnchor.constraint(equalTo: backBtn.centerYAnchor),
            refreshBtn.widthAnchor.constraint(equalToConstant: 38),
            refreshBtn.heightAnchor.constraint(equalToConstant: 38),

            controlsRow.leadingAnchor.constraint(equalTo: topHeaderView.leadingAnchor, constant: 16),
            controlsRow.trailingAnchor.constraint(equalTo: topHeaderView.trailingAnchor, constant: -16),
            controlsRow.topAnchor.constraint(equalTo: backBtn.bottomAnchor, constant: 12),
        ])
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        if let g = topHeaderView.layer.sublayers?.first as? CAGradientLayer {
            g.frame = topHeaderView.bounds
        }
    }

    @objc private func didTapBack() {
        if let nav = navigationController, nav.viewControllers.count > 1 {
            nav.popViewController(animated: true)
        } else {
            dismiss(animated: true)
        }
    }

    @objc private func didTapRefresh() {
        let rotation = CABasicAnimation(keyPath: "transform.rotation.z")
        rotation.toValue = NSNumber(value: Double.pi * 2)
        rotation.duration = 0.65
        rotation.isCumulative = true
        refreshBtn.layer.add(rotation, forKey: "rotationAnimation")
        fetchLoggedInUserInfo()
        fetchDashboardMetrics()
    }

    @objc private func didTapTimeframePill() {
        let alert = UIAlertController(title: "Select Timeframe", message: nil, preferredStyle: .actionSheet)
        let options: [(title: String, val: String)] = [
            ("All Time", "all_time"),
            ("This Year", "this_year"),
            ("This Month", "this_month"),
            ("Last 30 Days", "last_30_days")
        ]

        for opt in options {
            alert.addAction(UIAlertAction(title: opt.title, style: .default, handler: { [weak self] _ in
                self?.selectedTimeframe = opt.val
                self?.lblTimeframeText.text = opt.title
                self?.fetchDashboardMetrics()
            }))
        }
        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel))

        if let popover = alert.popoverPresentationController {
            popover.sourceView = timeframeBtn
            popover.sourceRect = timeframeBtn.bounds
        }
        present(alert, animated: true)
    }

    @objc private func didPullRefresh() {
        fetchLoggedInUserInfo()
        fetchDashboardMetrics()
    }

    // ── ScrollView & Content Stack ───────────────────────────────────────────
    private func setupScrollView() {
        scrollView.showsVerticalScrollIndicator = false
        scrollView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(scrollView)

        refreshControl.addTarget(self, action: #selector(didPullRefresh), for: .valueChanged)
        refreshControl.tintColor = UIColor(red: 0.05, green: 0.43, blue: 0.99, alpha: 1)
        scrollView.refreshControl = refreshControl

        contentStack.axis = .vertical
        contentStack.spacing = 16
        contentStack.translatesAutoresizingMaskIntoConstraints = false
        scrollView.addSubview(contentStack)

        NSLayoutConstraint.activate([
            scrollView.topAnchor.constraint(equalTo: topHeaderView.bottomAnchor, constant: 8),
            scrollView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            scrollView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            scrollView.bottomAnchor.constraint(equalTo: view.bottomAnchor),

            contentStack.topAnchor.constraint(equalTo: scrollView.topAnchor, constant: 8),
            contentStack.leadingAnchor.constraint(equalTo: scrollView.leadingAnchor, constant: 16),
            contentStack.trailingAnchor.constraint(equalTo: scrollView.trailingAnchor, constant: -16),
            contentStack.bottomAnchor.constraint(equalTo: scrollView.bottomAnchor, constant: -32),
            contentStack.widthAnchor.constraint(equalTo: scrollView.widthAnchor, constant: -32),
        ])
    }

    // ── Primary 4 KPI Bento Grid ─────────────────────────────────────────────
    private func setupPrimaryKPIGrid() {
        // Row 1: Total Revenue & Total Expenses
        let row1 = UIStackView()
        row1.axis = .horizontal
        row1.distribution = .fillEqually
        row1.spacing = 12

        let cardRev = makeBentoCard(title: "TOTAL REVENUE", valueLbl: lblTotalRevenue, defaultVal: "₹0", valColor: UIColor(red: 0.02, green: 0.59, blue: 0.41, alpha: 1), subtitle: "Non-cancelled invoices")
        let cardExp = makeBentoCard(title: "TOTAL EXPENSES", valueLbl: lblTotalExpenses, defaultVal: "₹0", valColor: UIColor(red: 0.88, green: 0.11, blue: 0.28, alpha: 1), subtitle: "Operational & lab costs")
        row1.addArrangedSubview(cardRev)
        row1.addArrangedSubview(cardExp)
        contentStack.addArrangedSubview(row1)

        // Row 2: Net Profit & Pending Collections
        let row2 = UIStackView()
        row2.axis = .horizontal
        row2.distribution = .fillEqually
        row2.spacing = 12

        let cardNet = makeBentoCard(title: "NET PROFIT", valueLbl: lblNetProfit, defaultVal: "₹0", valColor: UIColor(red: 0.05, green: 0.43, blue: 0.99, alpha: 1), subtitle: "Revenue minus expenses", badgeLbl: lblProfitMargin)
        let cardPending = makeBentoCard(title: "PENDING COLLECTIONS", valueLbl: lblPendingDue, defaultVal: "₹0", valColor: UIColor(red: 0.85, green: 0.47, blue: 0.02, alpha: 1), subtitle: "Uncollected invoices")
        row2.addArrangedSubview(cardNet)
        row2.addArrangedSubview(cardPending)
        contentStack.addArrangedSubview(row2)
    }

    // ── GST & Revenue Adjustments Bento Grid (Full Web Parity) ───────────────
    private func setupGstAndDiscountGrid() {
        let sectionHeader = UILabel()
        sectionHeader.text = "GST & REVENUE ADJUSTMENTS"
        sectionHeader.font = .systemFont(ofSize: 10.5, weight: .bold)
        sectionHeader.textColor = UIColor(red: 0.39, green: 0.45, blue: 0.55, alpha: 1) // #64748B
        contentStack.addArrangedSubview(sectionHeader)

        // Row 1: Gross Billing & Discounts Given
        let row1 = UIStackView()
        row1.axis = .horizontal
        row1.distribution = .fillEqually
        row1.spacing = 12

        let cardGross = makeBentoCard(title: "GROSS BILLING", valueLbl: lblGrossBilling, defaultVal: "₹0", valColor: UIColor(red: 0.06, green: 0.09, blue: 0.16, alpha: 1), subtitle: "Subtotal before adjustments")
        let cardDisc = makeBentoCard(title: "DISCOUNTS GIVEN", valueLbl: lblDiscountsGiven, defaultVal: "₹0", valColor: UIColor(red: 0.06, green: 0.09, blue: 0.16, alpha: 1), subtitle: "0.0% of gross revenue", badgeLbl: lblDiscountPercent, subtitleOut: { [weak self] sl in
            self?.lblDiscountSubtitle = sl
        })
        row1.addArrangedSubview(cardGross)
        row1.addArrangedSubview(cardDisc)
        contentStack.addArrangedSubview(row1)

        // Row 2: CGST & SGST Collected
        let row2 = UIStackView()
        row2.axis = .horizontal
        row2.distribution = .fillEqually
        row2.spacing = 12

        let cardCGST = makeBentoCard(title: "CGST COLLECTED", valueLbl: lblCGST, defaultVal: "₹0", valColor: UIColor(red: 0.06, green: 0.09, blue: 0.16, alpha: 1), subtitle: "Central GST")
        let cardSGST = makeBentoCard(title: "SGST COLLECTED", valueLbl: lblSGST, defaultVal: "₹0", valColor: UIColor(red: 0.06, green: 0.09, blue: 0.16, alpha: 1), subtitle: "State GST")
        row2.addArrangedSubview(cardCGST)
        row2.addArrangedSubview(cardSGST)
        contentStack.addArrangedSubview(row2)
    }

    // ── Operational Summary Row ───────────────────────────────────────────────
    private func setupOperationalCountsRow() {
        let opsRow = UIStackView()
        opsRow.axis = .horizontal
        opsRow.distribution = .fillEqually
        opsRow.spacing = 10

        let cardInvoices = makeOperationalCard(title: "Invoices Generated", countLbl: lblInvoicesCount, color: UIColor(red: 0.05, green: 0.43, blue: 0.99, alpha: 1))
        let cardPatients = makeOperationalCard(title: "Patients Billed", countLbl: lblPatientsCount, color: UIColor(red: 0.02, green: 0.59, blue: 0.41, alpha: 1))
        opsRow.addArrangedSubview(cardInvoices)
        opsRow.addArrangedSubview(cardPatients)
        contentStack.addArrangedSubview(opsRow)
    }

    private func makeOperationalCard(title: String, countLbl: UILabel, color: UIColor) -> UIView {
        let card = UIView()
        card.backgroundColor = .white
        card.layer.cornerRadius = 14
        card.layer.borderWidth = 1
        card.layer.borderColor = UIColor(red: 0.89, green: 0.91, blue: 0.95, alpha: 1).cgColor

        let stack = UIStackView()
        stack.axis = .horizontal
        stack.alignment = .center
        stack.translatesAutoresizingMaskIntoConstraints = false

        let tLbl = UILabel()
        tLbl.text = title
        tLbl.font = .systemFont(ofSize: 11.5, weight: .medium)
        tLbl.textColor = UIColor(red: 0.28, green: 0.33, blue: 0.41, alpha: 1)

        countLbl.text = "0"
        countLbl.font = .systemFont(ofSize: 14.5, weight: .bold)
        countLbl.textColor = color

        stack.addArrangedSubview(tLbl)
        stack.addArrangedSubview(countLbl)
        card.addSubview(stack)

        NSLayoutConstraint.activate([
            stack.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 12),
            stack.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -12),
            stack.topAnchor.constraint(equalTo: card.topAnchor, constant: 10),
            stack.bottomAnchor.constraint(equalTo: card.bottomAnchor, constant: -10),
            card.heightAnchor.constraint(equalToConstant: 44),
        ])
        return card
    }

    private func makeBentoCard(title: String, valueLbl: UILabel, defaultVal: String, valColor: UIColor, subtitle: String? = nil, badgeLbl: UILabel? = nil, subtitleOut: ((UILabel) -> Void)? = nil) -> UIView {
        let card = UIView()
        card.backgroundColor = .white
        card.layer.cornerRadius = 16
        card.layer.borderWidth = 1
        card.layer.borderColor = UIColor(red: 0.89, green: 0.91, blue: 0.95, alpha: 1).cgColor
        card.layer.shadowColor = UIColor(red: 0.05, green: 0.15, blue: 0.30, alpha: 1).cgColor
        card.layer.shadowOpacity = 0.04
        card.layer.shadowRadius = 4
        card.layer.shadowOffset = CGSize(width: 0, height: 2)

        let topRow = UIStackView()
        topRow.axis = .horizontal
        topRow.alignment = .center
        topRow.translatesAutoresizingMaskIntoConstraints = false

        let titleLabel = UILabel()
        titleLabel.text = title
        titleLabel.font = .systemFont(ofSize: 10, weight: .bold)
        titleLabel.textColor = UIColor(red: 0.392, green: 0.455, blue: 0.545, alpha: 1)
        topRow.addArrangedSubview(titleLabel)

        if let badgeLbl = badgeLbl {
            let spacer = UIView()
            topRow.addArrangedSubview(spacer)

            badgeLbl.text = "0.0%"
            badgeLbl.font = .systemFont(ofSize: 9.5, weight: .bold)
            badgeLbl.textColor = UIColor(red: 0.02, green: 0.59, blue: 0.41, alpha: 1)
            badgeLbl.backgroundColor = UIColor(red: 0.925, green: 0.992, blue: 0.961, alpha: 1)
            badgeLbl.layer.cornerRadius = 4
            badgeLbl.clipsToBounds = true
            badgeLbl.textAlignment = .center
            badgeLbl.widthAnchor.constraint(equalToConstant: 44).isActive = true
            badgeLbl.heightAnchor.constraint(equalToConstant: 18).isActive = true
            topRow.addArrangedSubview(badgeLbl)
        }

        valueLbl.text = defaultVal
        valueLbl.font = .systemFont(ofSize: 20, weight: .black)
        valueLbl.textColor = valColor
        valueLbl.translatesAutoresizingMaskIntoConstraints = false

        card.addSubview(topRow)
        card.addSubview(valueLbl)

        var subLabel: UILabel?
        if let sub = subtitle {
            let sl = UILabel()
            sl.text = sub
            sl.font = .systemFont(ofSize: 9.5, weight: .regular)
            sl.textColor = UIColor(red: 0.58, green: 0.64, blue: 0.72, alpha: 1)
            sl.translatesAutoresizingMaskIntoConstraints = false
            card.addSubview(sl)
            subLabel = sl
            subtitleOut?(sl)
        }

        NSLayoutConstraint.activate([
            topRow.topAnchor.constraint(equalTo: card.topAnchor, constant: 14),
            topRow.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 14),
            topRow.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -14),

            valueLbl.topAnchor.constraint(equalTo: topRow.bottomAnchor, constant: 5),
            valueLbl.leadingAnchor.constraint(equalTo: topRow.leadingAnchor),
            valueLbl.trailingAnchor.constraint(equalTo: topRow.trailingAnchor),
        ])

        if let sl = subLabel {
            NSLayoutConstraint.activate([
                sl.topAnchor.constraint(equalTo: valueLbl.bottomAnchor, constant: 2),
                sl.leadingAnchor.constraint(equalTo: valueLbl.leadingAnchor),
                sl.trailingAnchor.constraint(equalTo: valueLbl.trailingAnchor),
                sl.bottomAnchor.constraint(equalTo: card.bottomAnchor, constant: -14),
            ])
        } else {
            valueLbl.bottomAnchor.constraint(equalTo: card.bottomAnchor, constant: -14).isActive = true
        }

        return card
    }

    // ── Detailed Ledgers Section (Recent Invoices & Recent Expenses) ──────────
    private func setupLedgersSection() {
        let tabsStack = UIStackView()
        tabsStack.axis = .horizontal
        tabsStack.distribution = .fillEqually
        tabsStack.spacing = 8
        tabsStack.translatesAutoresizingMaskIntoConstraints = false

        styleTabButton(tabLedgerAll, title: "All Records", active: true)
        styleTabButton(tabLedgerInvoices, title: "Invoices (0)", active: false)
        styleTabButton(tabLedgerExpenses, title: "Expenses (0)", active: false)

        tabLedgerAll.addTarget(self, action: #selector(didSelectAllTab), for: .touchUpInside)
        tabLedgerInvoices.addTarget(self, action: #selector(didSelectInvoicesTab), for: .touchUpInside)
        tabLedgerExpenses.addTarget(self, action: #selector(didSelectExpensesTab), for: .touchUpInside)

        tabsStack.addArrangedSubview(tabLedgerAll)
        tabsStack.addArrangedSubview(tabLedgerInvoices)
        tabsStack.addArrangedSubview(tabLedgerExpenses)
        contentStack.addArrangedSubview(tabsStack)

        ledgerStack.axis = .vertical
        ledgerStack.spacing = 10
        ledgerStack.translatesAutoresizingMaskIntoConstraints = false
        contentStack.addArrangedSubview(ledgerStack)

        emptyStateLbl.text = "No records found"
        emptyStateLbl.font = .systemFont(ofSize: 13, weight: .medium)
        emptyStateLbl.textColor = UIColor(red: 0.58, green: 0.64, blue: 0.72, alpha: 1)
        emptyStateLbl.textAlignment = .center
        emptyStateLbl.isHidden = true
        contentStack.addArrangedSubview(emptyStateLbl)
    }

    private func styleTabButton(_ btn: UIButton, title: String, active: Bool) {
        btn.setTitle(title, for: .normal)
        btn.titleLabel?.font = .systemFont(ofSize: 12, weight: .bold)
        btn.layer.cornerRadius = 10
        btn.heightAnchor.constraint(equalToConstant: 38).isActive = true

        if active {
            btn.setTitleColor(UIColor(red: 0.05, green: 0.43, blue: 0.99, alpha: 1), for: .normal)
            btn.backgroundColor = UIColor(red: 0.937, green: 0.965, blue: 1.0, alpha: 1)
            btn.layer.borderWidth = 1
            btn.layer.borderColor = UIColor(red: 0.05, green: 0.43, blue: 0.99, alpha: 0.3).cgColor
        } else {
            btn.setTitleColor(UIColor(red: 0.392, green: 0.455, blue: 0.545, alpha: 1), for: .normal)
            btn.backgroundColor = UIColor(red: 0.945, green: 0.961, blue: 0.976, alpha: 1)
            btn.layer.borderWidth = 0
        }
    }

    @objc private func didSelectAllTab() {
        selectedLedgerIndex = 0
        updateLedgerTabStyles()
        renderCurrentLedger()
    }

    @objc private func didSelectInvoicesTab() {
        selectedLedgerIndex = 1
        updateLedgerTabStyles()
        renderCurrentLedger()
    }

    @objc private func didSelectExpensesTab() {
        selectedLedgerIndex = 2
        updateLedgerTabStyles()
        renderCurrentLedger()
    }

    private func updateLedgerTabStyles() {
        styleTabButton(tabLedgerAll, title: "All Records", active: selectedLedgerIndex == 0)
        styleTabButton(tabLedgerInvoices, title: "Invoices (\(cachedInvoices.count))", active: selectedLedgerIndex == 1)
        styleTabButton(tabLedgerExpenses, title: "Expenses (\(cachedExpenses.count))", active: selectedLedgerIndex == 2)
    }

    // ── Quick Actions ────────────────────────────────────────────────────────
    private func setupQuickActions() {
        let row = UIStackView()
        row.axis = .horizontal
        row.distribution = .fillEqually
        row.spacing = 10

        let btnLog = UIButton(type: .system)
        btnLog.setTitle("+ Log Expense", for: .normal)
        btnLog.setTitleColor(UIColor(red: 0.05, green: 0.43, blue: 0.99, alpha: 1), for: .normal)
        btnLog.backgroundColor = UIColor(red: 0.937, green: 0.965, blue: 1.0, alpha: 1)
        btnLog.titleLabel?.font = .systemFont(ofSize: 13.5, weight: .bold)
        btnLog.layer.cornerRadius = 12
        btnLog.layer.borderWidth = 1
        btnLog.layer.borderColor = UIColor(red: 0.05, green: 0.43, blue: 0.99, alpha: 0.4).cgColor
        btnLog.heightAnchor.constraint(equalToConstant: 48).isActive = true
        btnLog.addTarget(self, action: #selector(didTapLogExpense), for: .touchUpInside)

        let btnBilling = UIButton(type: .system)
        btnBilling.setTitle("All Invoices", for: .normal)
        btnBilling.setTitleColor(.white, for: .normal)
        btnBilling.backgroundColor = UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1)
        btnBilling.titleLabel?.font = .systemFont(ofSize: 13.5, weight: .bold)
        btnBilling.layer.cornerRadius = 12
        btnBilling.heightAnchor.constraint(equalToConstant: 48).isActive = true
        btnBilling.addTarget(self, action: #selector(didTapViewBilling), for: .touchUpInside)

        row.addArrangedSubview(btnLog)
        row.addArrangedSubview(btnBilling)
        contentStack.addArrangedSubview(row)
    }

    @objc private func didTapLogExpense() {
        let alert = UIAlertController(title: "Log Operational Expense", message: "Enter expense title and amount in ₹", preferredStyle: .alert)
        alert.addTextField { tf in
            tf.placeholder = "Title (e.g. Reagents, Lab Rent)"
        }
        alert.addTextField { tf in
            tf.placeholder = "Amount in ₹"
            tf.keyboardType = .decimalPad
        }
        alert.addTextField { tf in
            tf.placeholder = "Notes (Optional)"
        }

        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel))
        alert.addAction(UIAlertAction(title: "Save & Sync", style: .default, handler: { [weak self] _ in
            guard let self = self else { return }
            let title = alert.textFields?[0].text?.trimmingCharacters(in: .whitespaces) ?? ""
            let amountStr = alert.textFields?[1].text?.trimmingCharacters(in: .whitespaces) ?? ""
            let notes = alert.textFields?[2].text?.trimmingCharacters(in: .whitespaces) ?? ""

            guard !title.isEmpty, let amount = Double(amountStr), amount > 0 else {
                return
            }
            self.postExpense(title: title, amount: amount, notes: notes)
        }))

        present(alert, animated: true)
    }

    private func getAuthToken() -> String? {
        if let token = KeychainManager.shared.getToken()?.trimmingCharacters(in: .whitespacesAndNewlines),
           !token.isEmpty, token.lowercased() != "null", token.lowercased() != "undefined" {
            return token
        }
        if let token = UserDefaults.standard.string(forKey: "auth_token")?.trimmingCharacters(in: .whitespacesAndNewlines),
           !token.isEmpty, token.lowercased() != "null", token.lowercased() != "undefined" {
            return token
        }
        if let token = UserDefaults.standard.string(forKey: "token")?.trimmingCharacters(in: .whitespacesAndNewlines),
           !token.isEmpty, token.lowercased() != "null", token.lowercased() != "undefined" {
            return token
        }
        if let cookies = HTTPCookieStorage.shared.cookies {
            for cookie in cookies {
                if cookie.name == "token" {
                    let cookieToken = cookie.value.trimmingCharacters(in: .whitespacesAndNewlines)
                    if !cookieToken.isEmpty, cookieToken.lowercased() != "null", cookieToken.lowercased() != "undefined" {
                        KeychainManager.save(cookieToken, forKey: KeychainManager.tokenKey)
                        return cookieToken
                    }
                }
            }
        }
        return nil
    }

    private func ensureAuthToken(completion: @escaping (String?) -> Void) {
        if let token = getAuthToken() {
            completion(token)
            return
        }
        WKWebsiteDataStore.default().httpCookieStore.getAllCookies { cookies in
            if let cookie = cookies.first(where: {
                $0.name == "token" &&
                !$0.value.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty &&
                $0.value.lowercased() != "null" &&
                $0.value.lowercased() != "undefined"
            }) {
                let tokenVal = cookie.value.trimmingCharacters(in: .whitespacesAndNewlines)
                KeychainManager.save(tokenVal, forKey: KeychainManager.tokenKey)
                completion(tokenVal)
            } else {
                completion(nil)
            }
        }
    }

    private func fetchLoggedInUserInfo() {
        ensureAuthToken { [weak self] token in
            guard let token = token, let url = URL(string: "https://app.patholab.cloud/api/auth/me") else { return }

            var request = URLRequest(url: url)
            request.httpMethod = "GET"
            request.timeoutInterval = 8
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            request.setValue("token=\(token)", forHTTPHeaderField: "Cookie")

            URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
                guard let data = data, error == nil else { return }
                do {
                    if let res = try JSONSerialization.jsonObject(with: data) as? [String: Any] {
                        var userObj = res["user"] as? [String: Any]
                        if userObj == nil {
                            userObj = res["data"] as? [String: Any]
                        }
                        if let user = userObj {
                            let realName = user["name"] as? String ?? ""
                            let rawRole = user["role"] as? String ?? "Lab Owner"
                            var labName: String?
                            var labId: String?

                            if let labObj = res["lab"] as? [String: Any] {
                                labName = labObj["name"] as? String
                                labId = labObj["id"] as? String
                            } else if let labObj = user["lab"] as? [String: Any] {
                                labName = labObj["name"] as? String
                                labId = labObj["id"] as? String
                            }

                            if let labName = labName, !labName.isEmpty {
                                UserDefaults.standard.set(labName, forKey: "lab_name")
                            }
                            if let labId = labId, !labId.isEmpty {
                                UserDefaults.standard.set(labId, forKey: "lab_id")
                            }
                            if !rawRole.isEmpty {
                                KeychainManager.save(rawRole, forKey: KeychainManager.roleKey)
                                UserDefaults.standard.set(rawRole, forKey: "user_role")
                            }
                            if !realName.isEmpty {
                                KeychainManager.save(realName, forKey: KeychainManager.nameKey)
                                UserDefaults.standard.set(realName, forKey: "user_name")
                            }
                            if let email = user["email"] as? String, !email.isEmpty {
                                KeychainManager.save(email, forKey: KeychainManager.emailKey)
                            }

                            DispatchQueue.main.async {
                                self?.syncUserDetails()
                                self?.fetchDashboardMetrics()
                            }
                        }
                    }
                } catch {}
            }.resume()
        }
    }

    private func postExpense(title: String, amount: Double, notes: String) {
        guard let url = URL(string: "https://app.patholab.cloud/api/workspace/analytics") else { return }

        ensureAuthToken { [weak self] token in
            var request = URLRequest(url: url)
            request.httpMethod = "POST"
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")

            if let token = token {
                request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
                request.setValue("token=\(token)", forHTTPHeaderField: "Cookie")
            }

            let payload: [String: Any] = [
                "title": title,
                "amount": amount,
                "category": "MISC",
                "paymentMode": "CASH",
                "notes": notes
            ]

            guard let bodyData = try? JSONSerialization.data(withJSONObject: payload) else { return }
            request.httpBody = bodyData

            URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
                DispatchQueue.main.async {
                    if let httpRes = response as? HTTPURLResponse, httpRes.statusCode >= 200, httpRes.statusCode < 300 {
                        self?.fetchDashboardMetrics()
                    }
                }
            }.resume()
        }
    }

    @objc private func didTapViewBilling() {
        let billingVC = BillingViewController()
        billingVC.modalPresentationStyle = .fullScreen
        present(billingVC, animated: true)
    }

    private func syncUserDetails() {
        // Read only API-sourced values — never fall back to hard-coded dummy strings
        let rawRole = KeychainManager.shared.getUserRole() ?? UserDefaults.standard.string(forKey: "user_role") ?? ""
        let lab = UserDefaults.standard.string(forKey: "lab_name") ?? KeychainManager.shared.getLabName() ?? ""

        var displayRole = ""
        if rawRole.caseInsensitiveCompare("LAB_OWNER") == .orderedSame { displayRole = "Lab Owner" }
        else if rawRole.caseInsensitiveCompare("LAB_MANAGER") == .orderedSame { displayRole = "Lab Manager" }
        else if rawRole.caseInsensitiveCompare("PATHOLOGIST") == .orderedSame { displayRole = "Pathologist" }
        else if rawRole.caseInsensitiveCompare("RECEPTIONIST") == .orderedSame { displayRole = "Reception Desk" }
        else if rawRole.caseInsensitiveCompare("SUPER_ADMIN") == .orderedSame { displayRole = "System Admin" }
        else if !rawRole.isEmpty { displayRole = rawRole }

        if !displayRole.isEmpty && !lab.isEmpty {
            userRoleLabLbl.text = "\(displayRole) \u{2022} \(lab)"
            userRoleLabLbl.isHidden = false
        } else if !lab.isEmpty {
            userRoleLabLbl.text = lab
            userRoleLabLbl.isHidden = false
        } else if !displayRole.isEmpty {
            userRoleLabLbl.text = displayRole
            userRoleLabLbl.isHidden = false
        } else {
            userRoleLabLbl.text = "Financial Health Overview"
            userRoleLabLbl.isHidden = false
        }
    }

    // ── Number Parsing Helpers (Fixes NSNumber / Double / Int Casting Bug) ─────
    private func parseDouble(_ val: Any?) -> Double {
        if let n = val as? NSNumber { return n.doubleValue }
        if let s = val as? String, let d = Double(s) { return d }
        return 0.0
    }

    private func parseInt(_ val: Any?) -> Int {
        if let n = val as? NSNumber { return n.intValue }
        if let s = val as? String, let i = Int(s) { return i }
        return 0
    }

    // ── Network Fetch ────────────────────────────────────────────────────────
    private func fetchDashboardMetrics() {
        refreshControl.beginRefreshing()

        ensureAuthToken { [weak self] token in
            guard let self = self else { return }

            var urlStr = "https://app.patholab.cloud/api/workspace/analytics?timeframe=\(self.selectedTimeframe)"
            if let labId = UserDefaults.standard.string(forKey: "lab_id")?.trimmingCharacters(in: .whitespacesAndNewlines),
               !labId.isEmpty,
               labId.lowercased() != "null",
               labId.lowercased() != "undefined" {
                urlStr += "&labId=\(labId)"
            }
            guard let url = URL(string: urlStr) else {
                DispatchQueue.main.async { self.refreshControl.endRefreshing() }
                return
            }

            var request = URLRequest(url: url, cachePolicy: .reloadIgnoringLocalAndRemoteCacheData, timeoutInterval: 12)
            request.httpMethod = "GET"
            request.setValue("application/json", forHTTPHeaderField: "Accept")

            if let token = token {
                request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
                request.setValue("token=\(token); auth-token=\(token)", forHTTPHeaderField: "Cookie")
            }

            URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
                guard let self = self else { return }

                if let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode), let data = data {
                    if let json = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any] {
                        let totalRev = self.parseDouble(json["totalRevenue"])
                        let invCount = self.parseInt(json["invoicesCount"])
                        if totalRev > 0 || invCount > 0 {
                            DispatchQueue.main.async {
                                self.refreshControl.endRefreshing()
                                self.bindMetricsData(json)
                            }
                            return
                        } else {
                            self.fetchFallbackMetrics(token: token, initialJson: json)
                            return
                        }
                    }
                }
                self.fetchFallbackMetrics(token: token, initialJson: nil)
            }.resume()
        }
    }

    private func fetchFallbackMetrics(token: String?, initialJson: [String: Any]?) {
        guard let token = token, !token.isEmpty else {
            DispatchQueue.main.async {
                self.refreshControl.endRefreshing()
                if let initial = initialJson { self.bindMetricsData(initial) }
            }
            return
        }

        var merged = initialJson ?? [:]
        let group = DispatchGroup()

        // 1. Fallback: /api/labs/dashboard?range=30D
        if let dUrl = URL(string: "https://app.patholab.cloud/api/labs/dashboard?range=30D") {
            group.enter()
            var req = URLRequest(url: dUrl, timeoutInterval: 8)
            req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            req.setValue("token=\(token); auth-token=\(token)", forHTTPHeaderField: "Cookie")
            URLSession.shared.dataTask(with: req) { data, _, _ in
                defer { group.leave() }
                if let data = data,
                   let dRoot = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any],
                   let kpi = dRoot["kpi"] as? [String: Any] {
                    if self.parseDouble(merged["totalRevenue"]) == 0.0, let rev = kpi["revenue"] { merged["totalRevenue"] = rev }
                    if self.parseDouble(merged["totalExpense"]) == 0.0, let exp = kpi["expenses"] { merged["totalExpense"] = exp }
                    if self.parseDouble(merged["netProfit"]) == 0.0, let profit = kpi["netProfit"] { merged["netProfit"] = profit }
                    if self.parseDouble(merged["pendingCollections"]) == 0.0, let dues = kpi["pendingDues"] { merged["pendingCollections"] = dues }
                    if self.parseInt(merged["patientsCount"]) == 0, let pats = kpi["totalPatients"] { merged["patientsCount"] = pats }
                }
            }.resume()
        }

        // 2. Fallback: /api/workspace/invoices
        if let iUrl = URL(string: "https://app.patholab.cloud/api/workspace/invoices") {
            group.enter()
            var req = URLRequest(url: iUrl, timeoutInterval: 8)
            req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            req.setValue("token=\(token); auth-token=\(token)", forHTTPHeaderField: "Cookie")
            URLSession.shared.dataTask(with: req) { data, _, _ in
                defer { group.leave() }
                if let data = data,
                   let iRoot = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any] {
                    if let stats = iRoot["stats"] as? [String: Any] {
                        if self.parseDouble(merged["totalRevenue"]) == 0.0 {
                            let rev = stats["totalRevenue"] ?? stats["monthlyRevenue"]
                            if let rev = rev { merged["totalRevenue"] = rev }
                        }
                        if self.parseDouble(merged["pendingCollections"]) == 0.0, let pending = stats["pendingAmount"] {
                            merged["pendingCollections"] = pending
                        }
                    }
                    if let invs = iRoot["invoices"] as? [[String: Any]], !invs.isEmpty {
                        if self.parseInt(merged["invoicesCount"]) == 0 { merged["invoicesCount"] = invs.count }
                        if (merged["recentInvoices"] as? [[String: Any]])?.isEmpty ?? true {
                            merged["recentInvoices"] = invs
                        }
                    }
                }
            }.resume()
        }

        group.notify(queue: .main) {
            self.refreshControl.endRefreshing()
            self.bindMetricsData(merged)
        }
    }

    private func bindMetricsData(_ json: [String: Any]) {
        // Extract live User and Lab identity
        if let userObj = json["user"] as? [String: Any] {
            if let name = userObj["name"] as? String, !name.isEmpty, !name.contains("@"), name.lowercased() != "null" {
                UserDefaults.standard.set(name, forKey: "user_name")
                KeychainManager.save(name, forKey: KeychainManager.nameKey)
            }
            if let role = userObj["role"] as? String, !role.isEmpty {
                UserDefaults.standard.set(role, forKey: "user_role")
                KeychainManager.save(role, forKey: KeychainManager.roleKey)
            }
            if let email = userObj["email"] as? String, !email.isEmpty {
                KeychainManager.save(email, forKey: KeychainManager.emailKey)
            }
        }
        if let labObj = json["lab"] as? [String: Any] {
            if let labName = labObj["name"] as? String, !labName.isEmpty {
                UserDefaults.standard.set(labName, forKey: "lab_name")
            }
            if let labId = labObj["id"] as? String, !labId.isEmpty {
                UserDefaults.standard.set(labId, forKey: "lab_id")
            }
        }
        self.syncUserDetails()

        var totalRev = parseDouble(json["totalRevenue"])
        var totalExp = parseDouble(json["totalExpense"])
        var netProfit = parseDouble(json["netProfit"])
        var profitMargin = parseDouble(json["profitMargin"])
        var pendingCollections = parseDouble(json["pendingCollections"])

        var invCount = parseInt(json["invoicesCount"])
        var patCount = parseInt(json["patientsCount"])

        if let kpi = json["kpi"] as? [String: Any] {
            if totalRev == 0.0 { totalRev = parseDouble(kpi["revenue"]) }
            if totalExp == 0.0 { totalExp = parseDouble(kpi["expenses"]) }
            if netProfit == 0.0 { netProfit = parseDouble(kpi["netProfit"]) }
            if pendingCollections == 0.0 { pendingCollections = parseDouble(kpi["pendingDues"]) }
            if patCount == 0 { patCount = parseInt(kpi["totalPatients"]) }
        }

        if let stats = json["stats"] as? [String: Any] {
            if totalRev == 0.0 {
                totalRev = parseDouble(stats["totalRevenue"])
                if totalRev == 0.0 { totalRev = parseDouble(stats["monthlyRevenue"]) }
            }
            if pendingCollections == 0.0 { pendingCollections = parseDouble(stats["pendingAmount"]) }
            if invCount == 0 { invCount = parseInt(stats["pendingCount"]) + parseInt(stats["overdueCount"]) }
        }

        if profitMargin == 0.0 && totalRev > 0.0 {
            profitMargin = max(-100.0, min(100.0, ((totalRev - totalExp) / totalRev) * 100.0))
        }

        // Bind Primary Bento KPIs
        lblTotalRevenue.text = formatINR(totalRev)
        lblTotalExpenses.text = formatINR(totalExp)
        lblNetProfit.text = formatINR(netProfit)
        lblProfitMargin.text = String(format: "%.1f%%", profitMargin)
        lblPendingDue.text = formatINR(pendingCollections)

        // Bind GST & Revenue Adjustments (Full Web Parity)
        var grossBilling = parseDouble(json["grossBilling"])
        let totalDiscounts = parseDouble(json["totalDiscounts"])
        if grossBilling == 0.0 && totalRev > 0.0 {
            grossBilling = totalRev + totalDiscounts
        }
        let discountPercentage = parseDouble(json["discountPercentage"])
        let totalCGST = parseDouble(json["totalCGST"])
        let totalSGST = parseDouble(json["totalSGST"])

        lblGrossBilling.text = formatINR(grossBilling)
        lblDiscountsGiven.text = formatINR(totalDiscounts)
        lblDiscountPercent.text = String(format: "%.1f%%", discountPercentage)
        lblDiscountSubtitle?.text = String(format: "%.1f%% of gross revenue.", discountPercentage)
        lblCGST.text = formatINR(totalCGST)
        lblSGST.text = formatINR(totalSGST)

        // Bind Operational Counters
        lblInvoicesCount.text = "\(invCount)"
        lblPatientsCount.text = "\(patCount)"

        // Bind Ledgers
        cachedInvoices = json["recentInvoices"] as? [[String: Any]] ?? []
        cachedExpenses = json["recentExpenses"] as? [[String: Any]] ?? []

        updateLedgerTabStyles()
        renderCurrentLedger()
    }

    private func renderCurrentLedger() {
        ledgerStack.arrangedSubviews.forEach { $0.removeFromSuperview() }
        emptyStateLbl.isHidden = true

        if selectedLedgerIndex == 0 {
            // All Records: Show Recent Invoices followed by Recent Expenses (Full Web Parity)
            let invHeader = makeSectionHeaderView(title: "RECENT INVOICES", count: cachedInvoices.count, color: UIColor(red: 0.05, green: 0.43, blue: 0.99, alpha: 1))
            ledgerStack.addArrangedSubview(invHeader)

            if cachedInvoices.isEmpty {
                let emptyLbl = makeEmptyLedgerLabel("No recent invoices found.")
                ledgerStack.addArrangedSubview(emptyLbl)
            } else {
                for inv in cachedInvoices {
                    ledgerStack.addArrangedSubview(makeInvoiceCard(inv))
                }
            }

            let expHeader = makeSectionHeaderView(title: "RECENT EXPENSES", count: cachedExpenses.count, color: UIColor(red: 0.88, green: 0.11, blue: 0.28, alpha: 1))
            ledgerStack.addArrangedSubview(expHeader)

            if cachedExpenses.isEmpty {
                let emptyLbl = makeEmptyLedgerLabel("No recent expenses recorded.")
                ledgerStack.addArrangedSubview(emptyLbl)
            } else {
                for exp in cachedExpenses {
                    ledgerStack.addArrangedSubview(makeExpenseCard(exp))
                }
            }
        } else if selectedLedgerIndex == 1 {
            // Invoices Only
            if cachedInvoices.isEmpty {
                emptyStateLbl.text = "No recent invoices found."
                emptyStateLbl.isHidden = false
                return
            }
            emptyStateLbl.isHidden = true
            for inv in cachedInvoices {
                ledgerStack.addArrangedSubview(makeInvoiceCard(inv))
            }
        } else {
            // Expenses Only
            if cachedExpenses.isEmpty {
                emptyStateLbl.text = "No recent expenses recorded."
                emptyStateLbl.isHidden = false
                return
            }
            emptyStateLbl.isHidden = true
            for exp in cachedExpenses {
                ledgerStack.addArrangedSubview(makeExpenseCard(exp))
            }
        }
    }

    private func makeSectionHeaderView(title: String, count: Int, color: UIColor) -> UIView {
        let view = UIView()
        let stack = UIStackView()
        stack.axis = .horizontal
        stack.alignment = .center
        stack.spacing = 8
        stack.translatesAutoresizingMaskIntoConstraints = false

        let lbl = UILabel()
        lbl.text = title
        lbl.font = .systemFont(ofSize: 11.5, weight: .bold)
        lbl.textColor = UIColor(red: 0.28, green: 0.33, blue: 0.41, alpha: 1)

        let badge = UILabel()
        badge.text = "  \(count)  "
        badge.font = .systemFont(ofSize: 10, weight: .bold)
        badge.textColor = color
        badge.backgroundColor = color.withAlphaComponent(0.12)
        badge.layer.cornerRadius = 5
        badge.clipsToBounds = true

        stack.addArrangedSubview(lbl)
        stack.addArrangedSubview(badge)
        view.addSubview(stack)

        NSLayoutConstraint.activate([
            stack.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 2),
            stack.trailingAnchor.constraint(lessThanOrEqualTo: view.trailingAnchor),
            stack.topAnchor.constraint(equalTo: view.topAnchor, constant: 6),
            stack.bottomAnchor.constraint(equalTo: view.bottomAnchor, constant: -4),
        ])
        return view
    }

    private func makeEmptyLedgerLabel(_ text: String) -> UIView {
        let lbl = UILabel()
        lbl.text = text
        lbl.font = .systemFont(ofSize: 12.5, weight: .medium)
        lbl.textColor = UIColor(red: 0.58, green: 0.64, blue: 0.72, alpha: 1)
        lbl.textAlignment = .center
        lbl.heightAnchor.constraint(equalToConstant: 44).isActive = true
        return lbl
    }

    private func makeInvoiceCard(_ inv: [String: Any]) -> UIView {
        let card = UIView()
        card.backgroundColor = .white
        card.layer.cornerRadius = 14
        card.layer.borderWidth = 1
        card.layer.borderColor = UIColor(red: 0.89, green: 0.91, blue: 0.95, alpha: 1).cgColor
        card.layer.shadowColor = UIColor(red: 0.05, green: 0.15, blue: 0.30, alpha: 1).cgColor
        card.layer.shadowOpacity = 0.03
        card.layer.shadowRadius = 3
        card.layer.shadowOffset = CGSize(width: 0, height: 1)

        let invNum = inv["invoiceNumber"] as? String ?? "INV-2026-0000"
        let isB2B = (inv["isB2B"] as? Bool) ?? (inv["agencyName"] != nil)
        let status = (inv["status"] as? String ?? "PAID").uppercased()
        let grandTotal = parseDouble(inv["grandTotal"])
        let dateStr = formatDate(inv["createdAt"] as? String)
        let billedToName = (inv["patientName"] as? String) ?? (inv["agencyName"] as? String) ?? "Walk-in Patient"

        // Top Row: Number + B2B tag + Status Badge
        let topRow = UIStackView()
        topRow.axis = .horizontal
        topRow.spacing = 6
        topRow.alignment = .center

        let lblNum = UILabel()
        lblNum.text = invNum
        lblNum.font = .systemFont(ofSize: 13, weight: .bold)
        lblNum.textColor = UIColor(red: 0.05, green: 0.43, blue: 0.99, alpha: 1)
        topRow.addArrangedSubview(lblNum)

        if isB2B {
            let b2bTag = UILabel()
            b2bTag.text = "B2B"
            b2bTag.font = .systemFont(ofSize: 9.5, weight: .bold)
            b2bTag.textColor = UIColor(red: 0.28, green: 0.33, blue: 0.41, alpha: 1)
            b2bTag.backgroundColor = UIColor(red: 0.94, green: 0.96, blue: 0.98, alpha: 1)
            b2bTag.layer.cornerRadius = 4
            b2bTag.clipsToBounds = true
            b2bTag.textAlignment = .center
            b2bTag.widthAnchor.constraint(equalToConstant: 32).isActive = true
            b2bTag.heightAnchor.constraint(equalToConstant: 18).isActive = true
            topRow.addArrangedSubview(b2bTag)
        }

        let spacer = UIView()
        topRow.addArrangedSubview(spacer)

        let statusLbl = UILabel()
        statusLbl.text = "  \(status)  "
        statusLbl.font = .systemFont(ofSize: 10, weight: .bold)
        statusLbl.layer.cornerRadius = 6
        statusLbl.clipsToBounds = true
        statusLbl.heightAnchor.constraint(equalToConstant: 20).isActive = true

        if status == "PAID" {
            statusLbl.textColor = UIColor(red: 0.02, green: 0.59, blue: 0.41, alpha: 1)
            statusLbl.backgroundColor = UIColor(red: 0.925, green: 0.992, blue: 0.961, alpha: 1)
        } else if status == "PENDING" {
            statusLbl.textColor = UIColor(red: 0.85, green: 0.47, blue: 0.02, alpha: 1)
            statusLbl.backgroundColor = UIColor(red: 0.996, green: 0.953, blue: 0.780, alpha: 1)
        } else {
            statusLbl.textColor = UIColor(red: 0.88, green: 0.11, blue: 0.28, alpha: 1)
            statusLbl.backgroundColor = UIColor(red: 1.0, green: 0.945, blue: 0.949, alpha: 1)
        }
        topRow.addArrangedSubview(statusLbl)

        // Middle Row: Billed To
        let lblBilledTo = UILabel()
        lblBilledTo.text = billedToName
        lblBilledTo.font = .systemFont(ofSize: 14.5, weight: .bold)
        lblBilledTo.textColor = UIColor(red: 0.059, green: 0.090, blue: 0.165, alpha: 1)

        // Divider
        let divider = UIView()
        divider.backgroundColor = UIColor(red: 0.945, green: 0.961, blue: 0.976, alpha: 1)
        divider.heightAnchor.constraint(equalToConstant: 1).isActive = true

        // Bottom Row: Date & Amount
        let bottomRow = UIStackView()
        bottomRow.axis = .horizontal
        bottomRow.alignment = .center

        let lblDate = UILabel()
        lblDate.text = dateStr
        lblDate.font = .systemFont(ofSize: 11.5, weight: .medium)
        lblDate.textColor = UIColor(red: 0.392, green: 0.455, blue: 0.545, alpha: 1)
        bottomRow.addArrangedSubview(lblDate)

        let lblAmount = UILabel()
        lblAmount.text = formatINR(grandTotal)
        lblAmount.font = .systemFont(ofSize: 15, weight: .black)
        lblAmount.textColor = UIColor(red: 0.059, green: 0.090, blue: 0.165, alpha: 1)
        lblAmount.textAlignment = .right
        bottomRow.addArrangedSubview(lblAmount)

        let stack = UIStackView(arrangedSubviews: [topRow, lblBilledTo, divider, bottomRow])
        stack.axis = .vertical
        stack.spacing = 8
        stack.translatesAutoresizingMaskIntoConstraints = false
        card.addSubview(stack)

        NSLayoutConstraint.activate([
            stack.topAnchor.constraint(equalTo: card.topAnchor, constant: 12),
            stack.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 12),
            stack.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -12),
            stack.bottomAnchor.constraint(equalTo: card.bottomAnchor, constant: -12),
        ])

        card.isUserInteractionEnabled = true
        let tap = UITapGestureRecognizer(target: self, action: #selector(didTapViewBilling))
        card.addGestureRecognizer(tap)

        return card
    }

    private func makeExpenseCard(_ exp: [String: Any]) -> UIView {
        let card = UIView()
        card.backgroundColor = .white
        card.layer.cornerRadius = 14
        card.layer.borderWidth = 1
        card.layer.borderColor = UIColor(red: 0.89, green: 0.91, blue: 0.95, alpha: 1).cgColor
        card.layer.shadowColor = UIColor(red: 0.05, green: 0.15, blue: 0.30, alpha: 1).cgColor
        card.layer.shadowOpacity = 0.03
        card.layer.shadowRadius = 3
        card.layer.shadowOffset = CGSize(width: 0, height: 1)

        let title = exp["title"] as? String ?? "Expense"
        let category = (exp["category"] as? String ?? "OPERATING").replacingOccurrences(of: "_", with: " ")
        let paymentMode = (exp["paymentMode"] as? String ?? "CASH").replacingOccurrences(of: "_", with: " ")
        let amount = parseDouble(exp["amount"])
        let dateStr = formatDate(exp["date"] as? String)

        // Top Row: Category + Payment Mode
        let topRow = UIStackView()
        topRow.axis = .horizontal
        topRow.alignment = .center

        let lblCat = UILabel()
        lblCat.text = "  \(category)  "
        lblCat.font = .systemFont(ofSize: 10, weight: .bold)
        lblCat.textColor = UIColor(red: 0.392, green: 0.455, blue: 0.545, alpha: 1)
        lblCat.backgroundColor = UIColor(red: 0.94, green: 0.96, blue: 0.98, alpha: 1)
        lblCat.layer.cornerRadius = 5
        lblCat.clipsToBounds = true
        lblCat.heightAnchor.constraint(equalToConstant: 20).isActive = true
        topRow.addArrangedSubview(lblCat)

        let spacer = UIView()
        topRow.addArrangedSubview(spacer)

        let lblMode = UILabel()
        lblMode.text = "  \(paymentMode)  "
        lblMode.font = .systemFont(ofSize: 10, weight: .bold)
        lblMode.textColor = UIColor(red: 0.05, green: 0.43, blue: 0.99, alpha: 1)
        lblMode.backgroundColor = UIColor(red: 0.937, green: 0.965, blue: 1.0, alpha: 1)
        lblMode.layer.cornerRadius = 5
        lblMode.clipsToBounds = true
        lblMode.heightAnchor.constraint(equalToConstant: 20).isActive = true
        topRow.addArrangedSubview(lblMode)

        // Middle Row: Title
        let lblTitle = UILabel()
        lblTitle.text = title
        lblTitle.font = .systemFont(ofSize: 14.5, weight: .bold)
        lblTitle.textColor = UIColor(red: 0.059, green: 0.090, blue: 0.165, alpha: 1)

        // Divider
        let divider = UIView()
        divider.backgroundColor = UIColor(red: 0.945, green: 0.961, blue: 0.976, alpha: 1)
        divider.heightAnchor.constraint(equalToConstant: 1).isActive = true

        // Bottom Row: Date & Amount
        let bottomRow = UIStackView()
        bottomRow.axis = .horizontal
        bottomRow.alignment = .center

        let lblDate = UILabel()
        lblDate.text = dateStr
        lblDate.font = .systemFont(ofSize: 11.5, weight: .medium)
        lblDate.textColor = UIColor(red: 0.392, green: 0.455, blue: 0.545, alpha: 1)
        bottomRow.addArrangedSubview(lblDate)

        let lblAmount = UILabel()
        lblAmount.text = "-\(formatINR(amount))"
        lblAmount.font = .systemFont(ofSize: 15, weight: .black)
        lblAmount.textColor = UIColor(red: 0.88, green: 0.11, blue: 0.28, alpha: 1)
        lblAmount.textAlignment = .right
        bottomRow.addArrangedSubview(lblAmount)

        let stack = UIStackView(arrangedSubviews: [topRow, lblTitle, divider, bottomRow])
        stack.axis = .vertical
        stack.spacing = 8
        stack.translatesAutoresizingMaskIntoConstraints = false
        card.addSubview(stack)

        NSLayoutConstraint.activate([
            stack.topAnchor.constraint(equalTo: card.topAnchor, constant: 12),
            stack.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 12),
            stack.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -12),
            stack.bottomAnchor.constraint(equalTo: card.bottomAnchor, constant: -12),
        ])

        return card
    }

    private func formatINR(_ amount: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.locale = Locale(identifier: "en_IN")
        formatter.maximumFractionDigits = 0
        return formatter.string(from: NSNumber(value: amount)) ?? "₹\(Int(amount))"
    }

    private func formatDate(_ iso: String?) -> String {
        guard let iso = iso, !iso.isEmpty else { return "Recent" }
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = formatter.date(from: iso) {
            let outFmt = DateFormatter()
            outFmt.dateFormat = "dd MMM yyyy"
            outFmt.locale = Locale(identifier: "en_US")
            return outFmt.string(from: date)
        }
        let fallback = ISO8601DateFormatter()
        if let date = fallback.date(from: iso) {
            let outFmt = DateFormatter()
            outFmt.dateFormat = "dd MMM yyyy"
            outFmt.locale = Locale(identifier: "en_US")
            return outFmt.string(from: date)
        }
        return String(iso.prefix(10))
    }
}
