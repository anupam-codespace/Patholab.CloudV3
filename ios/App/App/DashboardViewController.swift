import UIKit

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  DashboardViewController — Native Financial Analytics Console (iOS)
 *  Directly mirroring web (/workspace/analytics):
 *   1. 4 Primary Top-Level KPIs: Revenue, Expenses, Net Profit, Pending Due
 *   2. 4 Tax & Discount Breakdown Cards: Gross Billing, Discounts, CGST, SGST
 *   3. Interactive Multi-Ledger Viewer: Recent Invoices & Recent Expenses
 * ═══════════════════════════════════════════════════════════════════════════
 */
class DashboardViewController: UIViewController {

    private let scrollView = UIScrollView()
    private let refreshControl = UIRefreshControl()
    private let contentStack = UIStackView()

    // Header Views
    private let topHeaderView = UIView()
    private let userGreetingLbl = UILabel()
    private let userRoleLabLbl = UILabel()
    private let refreshIconView = UIImageView()

    // Top-Level KPI Metric Labels
    private let lblTotalRevenue = UILabel()
    private let lblTotalExpenses = UILabel()
    private let lblNetProfit = UILabel()
    private let lblPendingDue = UILabel()

    private let lblInvoicesCount = UILabel()
    private let lblExpensesCount = UILabel()
    private let lblPendingCount = UILabel()

    // Tax & Discount Breakdown Labels
    private let lblGrossBilling = UILabel()
    private let lblDiscountsGiven = UILabel()
    private let lblDiscountPercent = UILabel()
    private let lblCGST = UILabel()
    private let lblSGST = UILabel()

    // Ledger Tabs & Containers
    private let tabLedgerInvoices = UIButton(type: .system)
    private let tabLedgerExpenses = UIButton(type: .system)
    private let ledgerStack = UIStackView()
    private let emptyStateLbl = UILabel()

    private var cachedInvoices: [[String: Any]] = []
    private var cachedExpenses: [[String: Any]] = []
    private var isShowingInvoices = true

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 0.973, green: 0.980, blue: 0.988, alpha: 1) // #F8FAFC

        setupHeader()
        setupScrollView()
        setupPrimaryKPIGrid()
        setupTaxBreakdownGrid()
        setupLedgersSection()
        setupQuickActions()

        syncUserDetails()
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
            UIColor(red: 0.039, green: 0.059, blue: 0.180, alpha: 1).cgColor, // #0A0F2E
            UIColor(red: 0.118, green: 0.227, blue: 0.541, alpha: 1).cgColor  // #1E3A8A
        ]
        gradient.startPoint = CGPoint(x: 0, y: 0)
        gradient.endPoint = CGPoint(x: 1, y: 1)
        topHeaderView.layer.insertSublayer(gradient, at: 0)
        topHeaderView.layer.cornerRadius = 24
        topHeaderView.layer.maskedCorners = [.layerMinXMaxYCorner, .layerMaxXMaxYCorner]
        topHeaderView.clipsToBounds = true

        // Top Action Row
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

        let titleLbl = UILabel()
        titleLbl.text = "Financial Analytics"
        titleLbl.font = .systemFont(ofSize: 18.5, weight: .bold)
        titleLbl.textColor = .white
        titleLbl.translatesAutoresizingMaskIntoConstraints = false
        topHeaderView.addSubview(titleLbl)

        let refreshBtn = UIButton(type: .system)
        refreshBtn.backgroundColor = UIColor.white.withAlphaComponent(0.18)
        refreshBtn.layer.cornerRadius = 19
        refreshBtn.layer.borderWidth = 1
        refreshBtn.layer.borderColor = UIColor.white.withAlphaComponent(0.25).cgColor
        refreshBtn.addTarget(self, action: #selector(didTapRefresh), for: .touchUpInside)
        refreshBtn.translatesAutoresizingMaskIntoConstraints = false
        topHeaderView.addSubview(refreshBtn)

        refreshIconView.image = UIImage(systemName: "arrow.clockwise")
        refreshIconView.tintColor = .white
        refreshIconView.contentMode = .scaleAspectFit
        refreshIconView.translatesAutoresizingMaskIntoConstraints = false
        refreshBtn.addSubview(refreshIconView)

        userRoleLabLbl.text = "Overview of your enterprise's financial health"
        userRoleLabLbl.font = .systemFont(ofSize: 11.5, weight: .medium)
        userRoleLabLbl.textColor = UIColor(red: 0.576, green: 0.773, blue: 0.992, alpha: 1)
        userRoleLabLbl.translatesAutoresizingMaskIntoConstraints = false
        topHeaderView.addSubview(userRoleLabLbl)

        // Status Pill
        let statusPill = UIView()
        statusPill.backgroundColor = UIColor.white.withAlphaComponent(0.14)
        statusPill.layer.cornerRadius = 14
        statusPill.layer.borderWidth = 1
        statusPill.layer.borderColor = UIColor.white.withAlphaComponent(0.2).cgColor
        statusPill.translatesAutoresizingMaskIntoConstraints = false
        topHeaderView.addSubview(statusPill)

        let dot = UIView()
        dot.backgroundColor = UIColor(red: 0.05, green: 0.75, blue: 0.45, alpha: 1)
        dot.layer.cornerRadius = 4
        dot.translatesAutoresizingMaskIntoConstraints = false
        statusPill.addSubview(dot)

        userGreetingLbl.text = "Live Sync • Pay-As-You-Go Active"
        userGreetingLbl.font = .systemFont(ofSize: 11.5, weight: .bold)
        userGreetingLbl.textColor = .white
        userGreetingLbl.translatesAutoresizingMaskIntoConstraints = false
        statusPill.addSubview(userGreetingLbl)

        let badgeLbl = UILabel()
        badgeLbl.text = "ENTERPRISE"
        badgeLbl.font = .systemFont(ofSize: 9.5, weight: .black)
        badgeLbl.textColor = UIColor(red: 0.43, green: 0.91, blue: 0.72, alpha: 1)
        badgeLbl.backgroundColor = UIColor(red: 0.02, green: 0.59, blue: 0.41, alpha: 0.3)
        badgeLbl.layer.cornerRadius = 6
        badgeLbl.clipsToBounds = true
        badgeLbl.textAlignment = .center
        badgeLbl.translatesAutoresizingMaskIntoConstraints = false
        statusPill.addSubview(badgeLbl)

        NSLayoutConstraint.activate([
            topHeaderView.topAnchor.constraint(equalTo: view.topAnchor),
            topHeaderView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            topHeaderView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            topHeaderView.heightAnchor.constraint(equalToConstant: 195),

            backBtn.leadingAnchor.constraint(equalTo: topHeaderView.leadingAnchor, constant: 16),
            backBtn.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 4),
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

            refreshIconView.centerXAnchor.constraint(equalTo: refreshBtn.centerXAnchor),
            refreshIconView.centerYAnchor.constraint(equalTo: refreshBtn.centerYAnchor),
            refreshIconView.widthAnchor.constraint(equalToConstant: 16),
            refreshIconView.heightAnchor.constraint(equalToConstant: 16),

            statusPill.leadingAnchor.constraint(equalTo: topHeaderView.leadingAnchor, constant: 16),
            statusPill.trailingAnchor.constraint(equalTo: topHeaderView.trailingAnchor, constant: -16),
            statusPill.bottomAnchor.constraint(equalTo: topHeaderView.bottomAnchor, constant: -14),
            statusPill.heightAnchor.constraint(equalToConstant: 34),

            dot.leadingAnchor.constraint(equalTo: statusPill.leadingAnchor, constant: 12),
            dot.centerYAnchor.constraint(equalTo: statusPill.centerYAnchor),
            dot.widthAnchor.constraint(equalToConstant: 8),
            dot.heightAnchor.constraint(equalToConstant: 8),

            userGreetingLbl.leadingAnchor.constraint(equalTo: dot.trailingAnchor, constant: 8),
            userGreetingLbl.centerYAnchor.constraint(equalTo: statusPill.centerYAnchor),

            badgeLbl.trailingAnchor.constraint(equalTo: statusPill.trailingAnchor, constant: -8),
            badgeLbl.centerYAnchor.constraint(equalTo: statusPill.centerYAnchor),
            badgeLbl.heightAnchor.constraint(equalToConstant: 20),
            badgeLbl.widthAnchor.constraint(greaterThanOrEqualToConstant: 72)
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
        rotation.duration = 0.6
        rotation.isCumulative = true
        rotation.repeatCount = 1
        refreshIconView.layer.add(rotation, forKey: "rotationAnimation")
        fetchDashboardMetrics()
    }

    @objc private func didPullRefresh() {
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

        let cardRev = makeBentoCard(title: "TOTAL REVENUE", valueLbl: lblTotalRevenue, subLbl: lblInvoicesCount, defaultVal: "₹0", defaultSub: "Excl. cancelled", icon: "chart.bar.fill", iconBg: "ECFDF5", iconTint: "059669", valColor: UIColor(red: 0.02, green: 0.59, blue: 0.41, alpha: 1))
        let cardExp = makeBentoCard(title: "TOTAL EXPENSES", valueLbl: lblTotalExpenses, subLbl: lblExpensesCount, defaultVal: "₹0", defaultSub: "All logged expenses", icon: "wallet.pass.fill", iconBg: "FFF1F2", iconTint: "E11D48", valColor: UIColor(red: 0.88, green: 0.11, blue: 0.28, alpha: 1))
        row1.addArrangedSubview(cardRev)
        row1.addArrangedSubview(cardExp)
        contentStack.addArrangedSubview(row1)

        // Row 2: Net Profit & Pending Collections
        let row2 = UIStackView()
        row2.axis = .horizontal
        row2.distribution = .fillEqually
        row2.spacing = 12

        let cardNet = makeBentoCard(title: "NET PROFIT", valueLbl: lblNetProfit, subLbl: UILabel(), defaultVal: "₹0", defaultSub: "Revenue - Expenses", icon: "arrow.up.right.circle.fill", iconBg: "EFF6FF", iconTint: "0D6EFD", valColor: UIColor(red: 0.05, green: 0.43, blue: 0.99, alpha: 1))
        let cardPending = makeBentoCard(title: "PENDING DUE", valueLbl: lblPendingDue, subLbl: lblPendingCount, defaultVal: "₹0", defaultSub: "Unpaid invoices", icon: "exclamationmark.triangle.fill", iconBg: "FEF3C7", iconTint: "D97706", valColor: UIColor(red: 0.85, green: 0.47, blue: 0.02, alpha: 1))
        row2.addArrangedSubview(cardNet)
        row2.addArrangedSubview(cardPending)
        contentStack.addArrangedSubview(row2)
    }

    private func makeBentoCard(title: String, valueLbl: UILabel, subLbl: UILabel, defaultVal: String, defaultSub: String, icon: String, iconBg: String, iconTint: String, valColor: UIColor) -> UIView {
        let card = UIView()
        card.backgroundColor = .white
        card.layer.cornerRadius = 16
        card.layer.borderWidth = 1
        card.layer.borderColor = UIColor(red: 0.89, green: 0.91, blue: 0.95, alpha: 1).cgColor
        card.layer.shadowColor = UIColor(red: 0.05, green: 0.15, blue: 0.30, alpha: 1).cgColor
        card.layer.shadowOpacity = 0.04
        card.layer.shadowRadius = 4
        card.layer.shadowOffset = CGSize(width: 0, height: 2)

        let iconFrame = UIView()
        iconFrame.backgroundColor = UIColor(hex: iconBg)
        iconFrame.layer.cornerRadius = 10
        iconFrame.translatesAutoresizingMaskIntoConstraints = false

        let iconView = UIImageView(image: UIImage(systemName: icon))
        iconView.tintColor = UIColor(hex: iconTint)
        iconView.contentMode = .scaleAspectFit
        iconView.translatesAutoresizingMaskIntoConstraints = false
        iconFrame.addSubview(iconView)

        let titleLabel = UILabel()
        titleLabel.text = title
        titleLabel.font = .systemFont(ofSize: 9.5, weight: .bold)
        titleLabel.textColor = UIColor(red: 0.392, green: 0.455, blue: 0.545, alpha: 1)
        titleLabel.translatesAutoresizingMaskIntoConstraints = false

        valueLbl.text = defaultVal
        valueLbl.font = .systemFont(ofSize: 19, weight: .black)
        valueLbl.textColor = valColor
        valueLbl.translatesAutoresizingMaskIntoConstraints = false

        subLbl.text = defaultSub
        subLbl.font = .systemFont(ofSize: 11, weight: .medium)
        subLbl.textColor = UIColor(red: 0.58, green: 0.64, blue: 0.72, alpha: 1)
        subLbl.translatesAutoresizingMaskIntoConstraints = false

        [iconFrame, titleLabel, valueLbl, subLbl].forEach { card.addSubview($0) }

        NSLayoutConstraint.activate([
            iconFrame.topAnchor.constraint(equalTo: card.topAnchor, constant: 12),
            iconFrame.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 12),
            iconFrame.widthAnchor.constraint(equalToConstant: 30),
            iconFrame.heightAnchor.constraint(equalToConstant: 30),

            iconView.centerXAnchor.constraint(equalTo: iconFrame.centerXAnchor),
            iconView.centerYAnchor.constraint(equalTo: iconFrame.centerYAnchor),
            iconView.widthAnchor.constraint(equalToConstant: 15),
            iconView.heightAnchor.constraint(equalToConstant: 15),

            titleLabel.topAnchor.constraint(equalTo: iconFrame.bottomAnchor, constant: 8),
            titleLabel.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 12),
            titleLabel.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -12),

            valueLbl.topAnchor.constraint(equalTo: titleLabel.bottomAnchor, constant: 2),
            valueLbl.leadingAnchor.constraint(equalTo: titleLabel.leadingAnchor),

            subLbl.topAnchor.constraint(equalTo: valueLbl.bottomAnchor, constant: 2),
            subLbl.leadingAnchor.constraint(equalTo: titleLabel.leadingAnchor),
            subLbl.bottomAnchor.constraint(equalTo: card.bottomAnchor, constant: -12),
        ])

        return card
    }

    // ── Tax & Discount Breakdown Grid ────────────────────────────────────────
    private func setupTaxBreakdownGrid() {
        let sectionTitle = UILabel()
        sectionTitle.text = "TAX & DISCOUNT BREAKDOWN"
        sectionTitle.font = .systemFont(ofSize: 11.5, weight: .bold)
        sectionTitle.textColor = UIColor(red: 0.28, green: 0.33, blue: 0.41, alpha: 1)
        contentStack.addArrangedSubview(sectionTitle)

        // Row 1: Gross Billing & Discounts
        let row1 = UIStackView()
        row1.axis = .horizontal
        row1.distribution = .fillEqually
        row1.spacing = 10

        let cardGross = makeMiniBentoCard(title: "GROSS BILLING", valueLbl: lblGrossBilling, subLbl: UILabel(), defaultVal: "₹0", defaultSub: "Subtotal before disc.")
        let cardDisc = makeMiniBentoCard(title: "DISCOUNTS GIVEN", valueLbl: lblDiscountsGiven, subLbl: lblDiscountPercent, defaultVal: "₹0", defaultSub: "0.0% of gross billing")
        row1.addArrangedSubview(cardGross)
        row1.addArrangedSubview(cardDisc)
        contentStack.addArrangedSubview(row1)

        // Row 2: CGST & SGST
        let row2 = UIStackView()
        row2.axis = .horizontal
        row2.distribution = .fillEqually
        row2.spacing = 10

        let cardCGST = makeMiniBentoCard(title: "CGST COLLECTED", valueLbl: lblCGST, subLbl: UILabel(), defaultVal: "₹0", defaultSub: "Central GST")
        let cardSGST = makeMiniBentoCard(title: "SGST COLLECTED", valueLbl: lblSGST, subLbl: UILabel(), defaultVal: "₹0", defaultSub: "State GST")
        row2.addArrangedSubview(cardCGST)
        row2.addArrangedSubview(cardSGST)
        contentStack.addArrangedSubview(row2)
    }

    private func makeMiniBentoCard(title: String, valueLbl: UILabel, subLbl: UILabel, defaultVal: String, defaultSub: String) -> UIView {
        let card = UIView()
        card.backgroundColor = .white
        card.layer.cornerRadius = 14
        card.layer.borderWidth = 1
        card.layer.borderColor = UIColor(red: 0.89, green: 0.91, blue: 0.95, alpha: 1).cgColor

        let titleLabel = UILabel()
        titleLabel.text = title
        titleLabel.font = .systemFont(ofSize: 9.5, weight: .bold)
        titleLabel.textColor = UIColor(red: 0.392, green: 0.455, blue: 0.545, alpha: 1)
        titleLabel.translatesAutoresizingMaskIntoConstraints = false

        valueLbl.text = defaultVal
        valueLbl.font = .systemFont(ofSize: 16, weight: .bold)
        valueLbl.textColor = UIColor(red: 0.059, green: 0.090, blue: 0.165, alpha: 1)
        valueLbl.translatesAutoresizingMaskIntoConstraints = false

        subLbl.text = defaultSub
        subLbl.font = .systemFont(ofSize: 10, weight: .medium)
        subLbl.textColor = UIColor(red: 0.58, green: 0.64, blue: 0.72, alpha: 1)
        subLbl.translatesAutoresizingMaskIntoConstraints = false

        [titleLabel, valueLbl, subLbl].forEach { card.addSubview($0) }

        NSLayoutConstraint.activate([
            titleLabel.topAnchor.constraint(equalTo: card.topAnchor, constant: 10),
            titleLabel.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 10),
            titleLabel.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -10),

            valueLbl.topAnchor.constraint(equalTo: titleLabel.bottomAnchor, constant: 2),
            valueLbl.leadingAnchor.constraint(equalTo: titleLabel.leadingAnchor),

            subLbl.topAnchor.constraint(equalTo: valueLbl.bottomAnchor, constant: 1),
            subLbl.leadingAnchor.constraint(equalTo: titleLabel.leadingAnchor),
            subLbl.bottomAnchor.constraint(equalTo: card.bottomAnchor, constant: -10),
        ])

        return card
    }

    // ── Detailed Ledgers Section (Recent Invoices & Recent Expenses) ──────────
    private func setupLedgersSection() {
        let tabsStack = UIStackView()
        tabsStack.axis = .horizontal
        tabsStack.distribution = .fillEqually
        tabsStack.spacing = 8
        tabsStack.translatesAutoresizingMaskIntoConstraints = false

        styleTabButton(tabLedgerInvoices, title: "Recent Invoices", active: true)
        styleTabButton(tabLedgerExpenses, title: "Recent Expenses", active: false)

        tabLedgerInvoices.addTarget(self, action: #selector(didSelectInvoicesTab), for: .touchUpInside)
        tabLedgerExpenses.addTarget(self, action: #selector(didSelectExpensesTab), for: .touchUpInside)

        tabsStack.addArrangedSubview(tabLedgerInvoices)
        tabsStack.addArrangedSubview(tabLedgerExpenses)
        contentStack.addArrangedSubview(tabsStack)

        ledgerStack.axis = .vertical
        ledgerStack.spacing = 8
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
        btn.titleLabel?.font = .systemFont(ofSize: 12.5, weight: .bold)
        btn.layer.cornerRadius = 12
        btn.heightAnchor.constraint(equalToConstant: 38).isActive = true

        if active {
            btn.backgroundColor = .white
            btn.setTitleColor(UIColor(red: 0.05, green: 0.43, blue: 0.99, alpha: 1), for: .normal)
            btn.layer.borderWidth = 1
            btn.layer.borderColor = UIColor(red: 0.80, green: 0.88, blue: 1.0, alpha: 1).cgColor
        } else {
            btn.backgroundColor = UIColor(red: 0.94, green: 0.96, blue: 0.98, alpha: 1)
            btn.setTitleColor(UIColor(red: 0.392, green: 0.455, blue: 0.545, alpha: 1), for: .normal)
            btn.layer.borderWidth = 0
        }
    }

    @objc private func didSelectInvoicesTab() {
        isShowingInvoices = true
        styleTabButton(tabLedgerInvoices, title: "Recent Invoices (\(cachedInvoices.count))", active: true)
        styleTabButton(tabLedgerExpenses, title: "Recent Expenses (\(cachedExpenses.count))", active: false)
        renderCurrentLedger()
    }

    @objc private func didSelectExpensesTab() {
        isShowingInvoices = false
        styleTabButton(tabLedgerInvoices, title: "Recent Invoices (\(cachedInvoices.count))", active: false)
        styleTabButton(tabLedgerExpenses, title: "Recent Expenses (\(cachedExpenses.count))", active: true)
        renderCurrentLedger()
    }

    // ── Quick Actions (View Full Invoices Button) ────────────────────────────
    private func setupQuickActions() {
        let btnViewAll = UIButton(type: .system)
        btnViewAll.setTitle("View Full Invoices & Billing", for: .normal)
        btnViewAll.setTitleColor(.white, for: .normal)
        btnViewAll.titleLabel?.font = .systemFont(ofSize: 14, weight: .bold)
        btnViewAll.backgroundColor = UIColor(red: 0.05, green: 0.43, blue: 0.99, alpha: 1)
        btnViewAll.layer.cornerRadius = 14
        btnViewAll.heightAnchor.constraint(equalToConstant: 48).isActive = true
        btnViewAll.addTarget(self, action: #selector(didTapViewAllInvoices), for: .touchUpInside)
        contentStack.addArrangedSubview(btnViewAll)
    }

    @objc private func didTapViewAllInvoices() {
        let billingVC = BillingViewController()
        if let nav = navigationController {
            nav.pushViewController(billingVC, animated: true)
        } else {
            present(billingVC, animated: true)
        }
    }

    private func syncUserDetails() {
        let role = KeychainManager.shared.getUserRole() ?? "Lab Owner"
        let lab = KeychainManager.shared.getLabName() ?? "Care Diagnostic Hub"

        var displayRole = "Lab Owner"
        if role.caseInsensitiveCompare("LAB_OWNER") == .orderedSame { displayRole = "Lab Owner" }
        else if role.caseInsensitiveCompare("LAB_MANAGER") == .orderedSame { displayRole = "Lab Manager" }
        else if role.caseInsensitiveCompare("PATHOLOGIST") == .orderedSame { displayRole = "Pathologist" }
        else if role.caseInsensitiveCompare("RECEPTIONIST") == .orderedSame { displayRole = "Reception Desk" }
        else if role.caseInsensitiveCompare("SUPER_ADMIN") == .orderedSame { displayRole = "System Admin" }

        userRoleLabLbl.text = "\(displayRole) • \(lab)"
        userGreetingLbl.text = "Live Sync • Pay-As-You-Go Active"
    }

    // ── Network Fetch ────────────────────────────────────────────────────────
    private func fetchDashboardMetrics() {
        refreshControl.beginRefreshing()

        guard let url = URL(string: "https://app.patholab.cloud/api/workspace/analytics") else {
            refreshControl.endRefreshing()
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.timeoutInterval = 10

        if let token = KeychainManager.shared.getToken(), !token.isEmpty {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            request.setValue("token=\(token)", forHTTPHeaderField: "Cookie")
        }

        URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            DispatchQueue.main.async {
                self?.refreshControl.endRefreshing()

                guard let self = self, let data = data, error == nil else { return }

                do {
                    if let json = try JSONSerialization.jsonObject(with: data) as? [String: Any] {
                        self.bindMetricsData(json)
                    }
                } catch {}
            }
        }.resume()
    }

    private func bindMetricsData(_ json: [String: Any]) {
        let totalRev = json["totalRevenue"] as? Double ?? 0.0
        let totalExp = json["totalExpense"] as? Double ?? 0.0
        let netProfit = json["netProfit"] as? Double ?? 0.0
        let pendingDue = json["pendingCollections"] as? Double ?? 0.0

        let grossBilling = json["grossBilling"] as? Double ?? 0.0
        let totalDiscounts = json["totalDiscounts"] as? Double ?? 0.0
        let totalCGST = json["totalCGST"] as? Double ?? 0.0
        let totalSGST = json["totalSGST"] as? Double ?? 0.0

        let invoicesCount = json["invoicesCount"] as? Int ?? 0

        // Bind Primary KPIs
        lblTotalRevenue.text = formatINR(totalRev)
        lblTotalExpenses.text = formatINR(totalExp)
        lblNetProfit.text = formatINR(netProfit)
        lblPendingDue.text = formatINR(pendingDue)

        lblInvoicesCount.text = invoicesCount > 0 ? "\(invoicesCount) Invoices Generated" : "Excl. cancelled"
        lblExpensesCount.text = "All logged expenses"
        lblPendingCount.text = "Unpaid invoices"

        // Bind Tax & Discounts
        lblGrossBilling.text = formatINR(grossBilling)
        lblDiscountsGiven.text = formatINR(totalDiscounts)

        let discPercent = grossBilling > 0 ? ((totalDiscounts / grossBilling) * 100.0) : 0.0
        lblDiscountPercent.text = String(format: "%.1f%% of gross billing", discPercent)

        lblCGST.text = formatINR(totalCGST)
        lblSGST.text = formatINR(totalSGST)

        // Bind Ledgers
        cachedInvoices = json["recentInvoices"] as? [[String: Any]] ?? []
        cachedExpenses = json["recentExpenses"] as? [[String: Any]] ?? []

        tabLedgerInvoices.setTitle("Recent Invoices (\(cachedInvoices.count))", for: .normal)
        tabLedgerExpenses.setTitle("Recent Expenses (\(cachedExpenses.count))", for: .normal)

        renderCurrentLedger()
    }

    private func renderCurrentLedger() {
        ledgerStack.arrangedSubviews.forEach { $0.removeFromSuperview() }

        if isShowingInvoices {
            if cachedInvoices.isEmpty {
                emptyStateLbl.text = "No recent invoices found"
                emptyStateLbl.isHidden = false
                return
            }
            emptyStateLbl.isHidden = true

            for inv in cachedInvoices {
                let card = makeInvoiceCard(inv)
                ledgerStack.addArrangedSubview(card)
            }
        } else {
            if cachedExpenses.isEmpty {
                emptyStateLbl.text = "No recent expenses recorded"
                emptyStateLbl.isHidden = false
                return
            }
            emptyStateLbl.isHidden = true

            for exp in cachedExpenses {
                let card = makeExpenseCard(exp)
                ledgerStack.addArrangedSubview(card)
            }
        }
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
        let isB2B = inv["isB2B"] as? Bool ?? false
        let status = (inv["status"] as? String ?? "PAID").uppercased()
        let grandTotal = inv["grandTotal"] as? Double ?? 0.0
        let dateStr = formatDate(inv["createdAt"] as? String)

        var billedToName = "Patient"
        if isB2B, let agency = inv["agency"] as? [String: Any], let aName = agency["agencyName"] as? String {
            billedToName = aName
        } else if let patient = inv["patient"] as? [String: Any], let pName = patient["name"] as? String {
            billedToName = pName
        }

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
        let amount = exp["amount"] as? Double ?? 0.0
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
