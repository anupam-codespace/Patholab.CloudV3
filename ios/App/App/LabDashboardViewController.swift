import UIKit

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  LabDashboardViewController — Native Executive Laboratory Dashboard (iOS)
 *  Directly mirroring web (/dashboard):
 *   1. 4 Primary Bento KPIs: Wallet Balance, Revenue, Tests Performed, Inventory
 *   2. Operational Throughput: Samples Today, In Progress, Pending Approval
 *   3. Interactive Visual Charts: Revenue Trend Area Chart & Test Volume Bar Chart
 *   4. Recent Patients Worklist with direct patient profile routing
 * ═══════════════════════════════════════════════════════════════════════════
 */
class LabDashboardViewController: UIViewController {

    private let scrollView = UIScrollView()
    private let refreshControl = UIRefreshControl()
    private let contentStack = UIStackView()

    // Header Views
    private let topHeaderView = UIView()
    private let lblBranchName = UILabel()
    private let refreshIconView = UIImageView()

    // Date Range Pills
    private let tabToday = UIButton(type: .system)
    private let tab7D = UIButton(type: .system)
    private let tab30D = UIButton(type: .system)
    private let tabMonth = UIButton(type: .system)
    private let tabYear = UIButton(type: .system)
    private var currentRange = "30D"

    // Primary KPI Cards & Labels
    private let cardWallet = UIView()
    private var cardInv: UIView?
    private let lblWalletBal = UILabel()
    private let lblWalletStatus = UILabel()
    private let btnRecharge = UIButton(type: .system)
    private let lblRevenue = UILabel()
    private let lblTestsCount = UILabel()
    private let lblInventoryAlerts = UILabel()

    // Pulse Throughput Labels
    private let lblPulseSamplesToday = UILabel()
    private let lblPulsePendingSamples = UILabel()
    private let lblPulsePendingReports = UILabel()

    // Visual Charts
    private let revenueChartView = RevenueAreaChartView()
    private let testVolumeChartView = TestVolumeBarChartView()

    // Recent Patients
    private let patientsStack = UIStackView()
    private let emptyPatientsLbl = UILabel()

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 0.973, green: 0.980, blue: 0.988, alpha: 1) // #F8FAFC

        setupHeader()
        setupScrollView()
        setupPrimaryKPIGrid()
        setupOperationalPulse()
        setupVisualChartsSection()
        setupRecentPatientsSection()

        syncLabDetails()
        fetchDashboardData(range: currentRange)
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
        titleLbl.text = "Dashboard Overview"
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

        lblBranchName.text = "Care Diagnostic Hub • Main Branch"
        lblBranchName.font = .systemFont(ofSize: 11.5, weight: .medium)
        lblBranchName.textColor = UIColor(red: 0.576, green: 0.773, blue: 0.992, alpha: 1)
        lblBranchName.translatesAutoresizingMaskIntoConstraints = false
        topHeaderView.addSubview(lblBranchName)

        // Date Range Stack
        let dateStack = UIStackView()
        dateStack.axis = .horizontal
        dateStack.distribution = .fillEqually
        dateStack.spacing = 5
        dateStack.translatesAutoresizingMaskIntoConstraints = false
        topHeaderView.addSubview(dateStack)

        styleRangeTab(tabToday, title: "Today", range: "TODAY", active: false)
        styleRangeTab(tab7D, title: "7D", range: "7D", active: false)
        styleRangeTab(tab30D, title: "30D", range: "30D", active: true)
        styleRangeTab(tabMonth, title: "Month", range: "MONTH", active: false)
        styleRangeTab(tabYear, title: "Year", range: "YEAR", active: false)

        [tabToday, tab7D, tab30D, tabMonth, tabYear].forEach { dateStack.addArrangedSubview($0) }

        NSLayoutConstraint.activate([
            topHeaderView.topAnchor.constraint(equalTo: view.topAnchor),
            topHeaderView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            topHeaderView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            topHeaderView.heightAnchor.constraint(equalToConstant: 185),

            backBtn.leadingAnchor.constraint(equalTo: topHeaderView.leadingAnchor, constant: 16),
            backBtn.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 4),
            backBtn.widthAnchor.constraint(equalToConstant: 38),
            backBtn.heightAnchor.constraint(equalToConstant: 38),

            titleLbl.leadingAnchor.constraint(equalTo: backBtn.trailingAnchor, constant: 12),
            titleLbl.centerYAnchor.constraint(equalTo: backBtn.centerYAnchor, constant: -8),

            lblBranchName.leadingAnchor.constraint(equalTo: titleLbl.leadingAnchor),
            lblBranchName.topAnchor.constraint(equalTo: titleLbl.bottomAnchor, constant: 2),

            refreshBtn.trailingAnchor.constraint(equalTo: topHeaderView.trailingAnchor, constant: -16),
            refreshBtn.centerYAnchor.constraint(equalTo: backBtn.centerYAnchor),
            refreshBtn.widthAnchor.constraint(equalToConstant: 38),
            refreshBtn.heightAnchor.constraint(equalToConstant: 38),

            refreshIconView.centerXAnchor.constraint(equalTo: refreshBtn.centerXAnchor),
            refreshIconView.centerYAnchor.constraint(equalTo: refreshBtn.centerYAnchor),
            refreshIconView.widthAnchor.constraint(equalToConstant: 16),
            refreshIconView.heightAnchor.constraint(equalToConstant: 16),

            dateStack.leadingAnchor.constraint(equalTo: topHeaderView.leadingAnchor, constant: 16),
            dateStack.trailingAnchor.constraint(equalTo: topHeaderView.trailingAnchor, constant: -16),
            dateStack.bottomAnchor.constraint(equalTo: topHeaderView.bottomAnchor, constant: -12),
            dateStack.heightAnchor.constraint(equalToConstant: 32),
        ])
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        if let g = topHeaderView.layer.sublayers?.first as? CAGradientLayer {
            g.frame = topHeaderView.bounds
        }
    }

    private func styleRangeTab(_ btn: UIButton, title: String, range: String, active: Bool) {
        btn.setTitle(title, for: .normal)
        btn.titleLabel?.font = .systemFont(ofSize: 11.5, weight: .bold)
        btn.layer.cornerRadius = 10
        btn.accessibilityIdentifier = range
        btn.addTarget(self, action: #selector(rangeTabTapped(_:)), for: .touchUpInside)

        if active {
            btn.backgroundColor = .white
            btn.setTitleColor(UIColor(red: 0.059, green: 0.090, blue: 0.165, alpha: 1), for: .normal)
        } else {
            btn.backgroundColor = UIColor.white.withAlphaComponent(0.14)
            btn.setTitleColor(UIColor(red: 0.576, green: 0.773, blue: 0.992, alpha: 1), for: .normal)
        }
    }

    @objc private func rangeTabTapped(_ sender: UIButton) {
        let range = sender.accessibilityIdentifier ?? "30D"
        currentRange = range

        [tabToday, tab7D, tab30D, tabMonth, tabYear].forEach { btn in
            let isActive = (btn == sender)
            btn.backgroundColor = isActive ? .white : UIColor.white.withAlphaComponent(0.14)
            btn.setTitleColor(isActive ? UIColor(red: 0.059, green: 0.090, blue: 0.165, alpha: 1) : UIColor(red: 0.576, green: 0.773, blue: 0.992, alpha: 1), for: .normal)
        }

        fetchDashboardData(range: currentRange)
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
        fetchDashboardData(range: currentRange)
    }

    @objc private func didPullRefresh() {
        fetchDashboardData(range: currentRange)
    }

    // ── ScrollView & Content Stack ───────────────────────────────────────────
    private func setupScrollView() {
        scrollView.showsVerticalScrollIndicator = false
        scrollView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(scrollView)

        refreshControl.addTarget(self, action: #selector(didPullRefresh), for: .valueChanged)
        refreshControl.tintColor = UIColor(red: 0.31, green: 0.27, blue: 0.90, alpha: 1)
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
        // Row 1: Wallet Balance & Total Revenue
        let row1 = UIStackView()
        row1.axis = .horizontal
        row1.distribution = .fillEqually
        row1.spacing = 12

        // 1. Wallet Balance Card
        cardWallet.backgroundColor = UIColor(red: 0.933, green: 0.949, blue: 1.0, alpha: 1)
        cardWallet.layer.cornerRadius = 16
        cardWallet.layer.borderWidth = 1
        cardWallet.layer.borderColor = UIColor(red: 0.780, green: 0.824, blue: 0.996, alpha: 1).cgColor

        let iconFrameW = UIView()
        iconFrameW.backgroundColor = UIColor(hex: "EEF2FF")
        iconFrameW.layer.cornerRadius = 10
        iconFrameW.translatesAutoresizingMaskIntoConstraints = false

        let iconW = UIImageView(image: UIImage(systemName: "wallet.pass.fill"))
        iconW.tintColor = UIColor(hex: "4F46E5")
        iconW.contentMode = .scaleAspectFit
        iconW.translatesAutoresizingMaskIntoConstraints = false
        iconFrameW.addSubview(iconW)

        btnRecharge.setTitle("Recharge", for: .normal)
        btnRecharge.titleLabel?.font = .systemFont(ofSize: 10.5, weight: .bold)
        btnRecharge.setTitleColor(.white, for: .normal)
        btnRecharge.backgroundColor = UIColor(red: 0.31, green: 0.27, blue: 0.90, alpha: 1)
        btnRecharge.layer.cornerRadius = 8
        btnRecharge.addTarget(self, action: #selector(didTapRecharge), for: .touchUpInside)
        btnRecharge.translatesAutoresizingMaskIntoConstraints = false

        let titleW = UILabel()
        titleW.text = "WALLET BALANCE"
        titleW.font = .systemFont(ofSize: 9.5, weight: .bold)
        titleW.textColor = UIColor(red: 0.392, green: 0.455, blue: 0.545, alpha: 1)
        titleW.translatesAutoresizingMaskIntoConstraints = false

        lblWalletBal.text = "₹0"
        lblWalletBal.font = .systemFont(ofSize: 22, weight: .black)
        lblWalletBal.textColor = UIColor(red: 0.19, green: 0.18, blue: 0.51, alpha: 1)
        lblWalletBal.translatesAutoresizingMaskIntoConstraints = false

        lblWalletStatus.text = "Pay-As-You-Go Active"
        lblWalletStatus.font = .systemFont(ofSize: 10.5, weight: .medium)
        lblWalletStatus.textColor = UIColor(red: 0.31, green: 0.27, blue: 0.90, alpha: 1)
        lblWalletStatus.translatesAutoresizingMaskIntoConstraints = false

        [iconFrameW, btnRecharge, titleW, lblWalletBal, lblWalletStatus].forEach { cardWallet.addSubview($0) }

        NSLayoutConstraint.activate([
            iconFrameW.topAnchor.constraint(equalTo: cardWallet.topAnchor, constant: 12),
            iconFrameW.leadingAnchor.constraint(equalTo: cardWallet.leadingAnchor, constant: 12),
            iconFrameW.widthAnchor.constraint(equalToConstant: 30),
            iconFrameW.heightAnchor.constraint(equalToConstant: 30),

            iconW.centerXAnchor.constraint(equalTo: iconFrameW.centerXAnchor),
            iconW.centerYAnchor.constraint(equalTo: iconFrameW.centerYAnchor),
            iconW.widthAnchor.constraint(equalToConstant: 15),
            iconW.heightAnchor.constraint(equalToConstant: 15),

            btnRecharge.trailingAnchor.constraint(equalTo: cardWallet.trailingAnchor, constant: -12),
            btnRecharge.centerYAnchor.constraint(equalTo: iconFrameW.centerYAnchor),
            btnRecharge.heightAnchor.constraint(equalToConstant: 24),
            btnRecharge.widthAnchor.constraint(greaterThanOrEqualToConstant: 64),

            titleW.topAnchor.constraint(equalTo: iconFrameW.bottomAnchor, constant: 8),
            titleW.leadingAnchor.constraint(equalTo: cardWallet.leadingAnchor, constant: 12),
            titleW.trailingAnchor.constraint(equalTo: cardWallet.trailingAnchor, constant: -12),

            lblWalletBal.topAnchor.constraint(equalTo: titleW.bottomAnchor, constant: 2),
            lblWalletBal.leadingAnchor.constraint(equalTo: titleW.leadingAnchor),

            lblWalletStatus.topAnchor.constraint(equalTo: lblWalletBal.bottomAnchor, constant: 2),
            lblWalletStatus.leadingAnchor.constraint(equalTo: titleW.leadingAnchor),
            lblWalletStatus.bottomAnchor.constraint(equalTo: cardWallet.bottomAnchor, constant: -12),
        ])

        // 2. Revenue Card
        let cardRev = makeBentoCard(title: "TOTAL REVENUE", valueLbl: lblRevenue, defaultVal: "₹0", subText: "In selected period", icon: "chart.bar.fill", iconBg: "ECFDF5", iconTint: "059669", valColor: UIColor(red: 0.02, green: 0.59, blue: 0.41, alpha: 1), tag: "Collected")

        row1.addArrangedSubview(cardWallet)
        row1.addArrangedSubview(cardRev)
        contentStack.addArrangedSubview(row1)

        // Row 2: Tests Performed & Inventory Alerts
        let row2 = UIStackView()
        row2.axis = .horizontal
        row2.distribution = .fillEqually
        row2.spacing = 12

        let cardTests = makeBentoCard(title: "TESTS PERFORMED", valueLbl: lblTestsCount, defaultVal: "0", subText: "Diagnostics completed", icon: "flask.fill", iconBg: "EFF6FF", iconTint: "0D6EFD", valColor: UIColor(red: 0.059, green: 0.090, blue: 0.165, alpha: 1))
        let cardInventory = makeBentoCard(title: "INVENTORY ALERTS", valueLbl: lblInventoryAlerts, defaultVal: "0", subText: "Low stock items", icon: "cube.box.fill", iconBg: "FEF3C7", iconTint: "D97706", valColor: UIColor(red: 0.85, green: 0.47, blue: 0.02, alpha: 1))
        self.cardInv = cardInventory

        row2.addArrangedSubview(cardTests)
        row2.addArrangedSubview(cardInventory)
        contentStack.addArrangedSubview(row2)
    }

    private func makeBentoCard(title: String, valueLbl: UILabel, defaultVal: String, subText: String, icon: String, iconBg: String, iconTint: String, valColor: UIColor, tag: String? = nil) -> UIView {
        let card = UIView()
        card.backgroundColor = .white
        card.layer.cornerRadius = 16
        card.layer.borderWidth = 1
        card.layer.borderColor = UIColor(red: 0.89, green: 0.91, blue: 0.95, alpha: 1).cgColor

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

        let subLbl = UILabel()
        subLbl.text = subText
        subLbl.font = .systemFont(ofSize: 10.5, weight: .medium)
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

        if let tag = tag {
            let tagLbl = UILabel()
            tagLbl.text = tag
            tagLbl.font = .systemFont(ofSize: 10, weight: .bold)
            tagLbl.textColor = UIColor(red: 0.02, green: 0.59, blue: 0.41, alpha: 1)
            tagLbl.backgroundColor = UIColor(red: 0.925, green: 0.992, blue: 0.961, alpha: 1)
            tagLbl.layer.cornerRadius = 6
            tagLbl.clipsToBounds = true
            tagLbl.textAlignment = .center
            tagLbl.translatesAutoresizingMaskIntoConstraints = false
            card.addSubview(tagLbl)

            NSLayoutConstraint.activate([
                tagLbl.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -12),
                tagLbl.centerYAnchor.constraint(equalTo: iconFrame.centerYAnchor),
                tagLbl.heightAnchor.constraint(equalToConstant: 20),
                tagLbl.widthAnchor.constraint(greaterThanOrEqualToConstant: 58)
            ])
        }

        return card
    }

    // ── Operational Pulse ────────────────────────────────────────────────────
    private func setupOperationalPulse() {
        let card = UIView()
        card.backgroundColor = .white
        card.layer.cornerRadius = 14
        card.layer.borderWidth = 1
        card.layer.borderColor = UIColor(red: 0.89, green: 0.91, blue: 0.95, alpha: 1).cgColor

        let stack = UIStackView()
        stack.axis = .horizontal
        stack.distribution = .fillEqually
        stack.alignment = .center
        stack.translatesAutoresizingMaskIntoConstraints = false
        card.addSubview(stack)

        let col1 = makePulseCol(valLbl: lblPulseSamplesToday, label: "Samples Today", valColor: UIColor(red: 0.059, green: 0.090, blue: 0.165, alpha: 1))
        let div1 = makeDivider()
        let col2 = makePulseCol(valLbl: lblPulsePendingSamples, label: "In Progress", valColor: UIColor(red: 0.85, green: 0.47, blue: 0.02, alpha: 1))
        let div2 = makeDivider()
        let col3 = makePulseCol(valLbl: lblPulsePendingReports, label: "Pending Approval", valColor: UIColor(red: 0.05, green: 0.43, blue: 0.99, alpha: 1))

        [col1, div1, col2, div2, col3].forEach { stack.addArrangedSubview($0) }

        NSLayoutConstraint.activate([
            stack.topAnchor.constraint(equalTo: card.topAnchor, constant: 12),
            stack.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 8),
            stack.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -8),
            stack.bottomAnchor.constraint(equalTo: card.bottomAnchor, constant: -12),
        ])

        contentStack.addArrangedSubview(card)
    }

    private func makePulseCol(valLbl: UILabel, label: String, valColor: UIColor) -> UIView {
        let col = UIStackView()
        col.axis = .vertical
        col.alignment = .center
        col.spacing = 1

        valLbl.text = "0"
        valLbl.font = .systemFont(ofSize: 15, weight: .bold)
        valLbl.textColor = valColor

        let lbl = UILabel()
        lbl.text = label
        lbl.font = .systemFont(ofSize: 10, weight: .medium)
        lbl.textColor = UIColor(red: 0.392, green: 0.455, blue: 0.545, alpha: 1)

        col.addArrangedSubview(valLbl)
        col.addArrangedSubview(lbl)
        return col
    }

    private func makeDivider() -> UIView {
        let v = UIView()
        v.backgroundColor = UIColor(red: 0.89, green: 0.91, blue: 0.95, alpha: 1)
        v.translatesAutoresizingMaskIntoConstraints = false
        v.widthAnchor.constraint(equalToConstant: 1).isActive = true
        v.heightAnchor.constraint(equalToConstant: 24).isActive = true
        return v
    }

    // ── Visual Charts Section ────────────────────────────────────────────────
    private func setupVisualChartsSection() {
        // 1. Revenue Trend Area Chart
        let cardRevTrend = UIView()
        cardRevTrend.backgroundColor = .white
        cardRevTrend.layer.cornerRadius = 16
        cardRevTrend.layer.borderWidth = 1
        cardRevTrend.layer.borderColor = UIColor(red: 0.89, green: 0.91, blue: 0.95, alpha: 1).cgColor

        let headerR = makeChartHeader(title: "Revenue Trend", dotColor: UIColor(red: 0.02, green: 0.59, blue: 0.41, alpha: 1), legend: "Revenue")
        revenueChartView.translatesAutoresizingMaskIntoConstraints = false

        let stackR = UIStackView(arrangedSubviews: [headerR, revenueChartView])
        stackR.axis = .vertical
        stackR.spacing = 10
        stackR.translatesAutoresizingMaskIntoConstraints = false
        cardRevTrend.addSubview(stackR)

        NSLayoutConstraint.activate([
            stackR.topAnchor.constraint(equalTo: cardRevTrend.topAnchor, constant: 14),
            stackR.leadingAnchor.constraint(equalTo: cardRevTrend.leadingAnchor, constant: 14),
            stackR.trailingAnchor.constraint(equalTo: cardRevTrend.trailingAnchor, constant: -14),
            stackR.bottomAnchor.constraint(equalTo: cardRevTrend.bottomAnchor, constant: -14),
            revenueChartView.heightAnchor.constraint(equalToConstant: 180)
        ])
        contentStack.addArrangedSubview(cardRevTrend)

        // 2. Test Volume Bar Chart
        let cardTestVol = UIView()
        cardTestVol.backgroundColor = .white
        cardTestVol.layer.cornerRadius = 16
        cardTestVol.layer.borderWidth = 1
        cardTestVol.layer.borderColor = UIColor(red: 0.89, green: 0.91, blue: 0.95, alpha: 1).cgColor

        let headerT = makeChartHeader(title: "Test Volume Trend", dotColor: UIColor(red: 0.05, green: 0.43, blue: 0.99, alpha: 1), legend: "Tests")
        testVolumeChartView.translatesAutoresizingMaskIntoConstraints = false

        let stackT = UIStackView(arrangedSubviews: [headerT, testVolumeChartView])
        stackT.axis = .vertical
        stackT.spacing = 10
        stackT.translatesAutoresizingMaskIntoConstraints = false
        cardTestVol.addSubview(stackT)

        NSLayoutConstraint.activate([
            stackT.topAnchor.constraint(equalTo: cardTestVol.topAnchor, constant: 14),
            stackT.leadingAnchor.constraint(equalTo: cardTestVol.leadingAnchor, constant: 14),
            stackT.trailingAnchor.constraint(equalTo: cardTestVol.trailingAnchor, constant: -14),
            stackT.bottomAnchor.constraint(equalTo: cardTestVol.bottomAnchor, constant: -14),
            testVolumeChartView.heightAnchor.constraint(equalToConstant: 180)
        ])
        contentStack.addArrangedSubview(cardTestVol)
    }

    private func makeChartHeader(title: String, dotColor: UIColor, legend: String) -> UIView {
        let container = UIStackView()
        container.axis = .horizontal
        container.alignment = .center

        let lblTitle = UILabel()
        lblTitle.text = title
        lblTitle.font = .systemFont(ofSize: 14.5, weight: .bold)
        lblTitle.textColor = UIColor(red: 0.059, green: 0.090, blue: 0.165, alpha: 1)
        container.addArrangedSubview(lblTitle)

        let spacer = UIView()
        container.addArrangedSubview(spacer)

        let dot = UIView()
        dot.backgroundColor = dotColor
        dot.layer.cornerRadius = 4
        dot.translatesAutoresizingMaskIntoConstraints = false
        dot.widthAnchor.constraint(equalToConstant: 8).isActive = true
        dot.heightAnchor.constraint(equalToConstant: 8).isActive = true
        container.addArrangedSubview(dot)

        let space2 = UIView()
        space2.translatesAutoresizingMaskIntoConstraints = false
        space2.widthAnchor.constraint(equalToConstant: 5).isActive = true
        container.addArrangedSubview(space2)

        let lblLeg = UILabel()
        lblLeg.text = legend
        lblLeg.font = .systemFont(ofSize: 11, weight: .bold)
        lblLeg.textColor = dotColor
        container.addArrangedSubview(lblLeg)

        return container
    }

    // ── Recent Patients Section ──────────────────────────────────────────────
    private func setupRecentPatientsSection() {
        let topRow = UIStackView()
        topRow.axis = .horizontal
        topRow.alignment = .center

        let titleLbl = UILabel()
        titleLbl.text = "Recent Patients"
        titleLbl.font = .systemFont(ofSize: 14.5, weight: .bold)
        titleLbl.textColor = UIColor(red: 0.059, green: 0.090, blue: 0.165, alpha: 1)
        topRow.addArrangedSubview(titleLbl)

        let spacer = UIView()
        topRow.addArrangedSubview(spacer)

        let viewAllBtn = UIButton(type: .system)
        viewAllBtn.setTitle("View All >", for: .normal)
        viewAllBtn.titleLabel?.font = .systemFont(ofSize: 12, weight: .bold)
        viewAllBtn.setTitleColor(UIColor(red: 0.05, green: 0.43, blue: 0.99, alpha: 1), for: .normal)
        viewAllBtn.addTarget(self, action: #selector(didTapViewAllPatients), for: .touchUpInside)
        topRow.addArrangedSubview(viewAllBtn)

        contentStack.addArrangedSubview(topRow)

        patientsStack.axis = .vertical
        patientsStack.spacing = 8
        patientsStack.translatesAutoresizingMaskIntoConstraints = false
        contentStack.addArrangedSubview(patientsStack)

        emptyPatientsLbl.text = "No recent patients registered"
        emptyPatientsLbl.font = .systemFont(ofSize: 12.5, weight: .medium)
        emptyPatientsLbl.textColor = UIColor(red: 0.58, green: 0.64, blue: 0.72, alpha: 1)
        emptyPatientsLbl.textAlignment = .center
        emptyPatientsLbl.isHidden = true
        contentStack.addArrangedSubview(emptyPatientsLbl)
    }

    @objc private func didTapRecharge() {
        let walletVC = WalletViewController()
        if let nav = navigationController {
            nav.pushViewController(walletVC, animated: true)
        } else {
            present(walletVC, animated: true)
        }
    }

    @objc private func didTapViewAllPatients() {
        let patientsVC = PatientWorklistViewController()
        if let nav = navigationController {
            nav.pushViewController(patientsVC, animated: true)
        } else {
            present(patientsVC, animated: true)
        }
    }

    private func syncLabDetails() {
        let lab = KeychainManager.shared.getLabName() ?? "Care Diagnostic Hub"
        lblBranchName.text = "\(lab) • Main Branch"
    }

    // ── API Fetch ────────────────────────────────────────────────────────────
    private func fetchDashboardData(range: String) {
        refreshControl.beginRefreshing()

        let token = KeychainManager.shared.getToken()
        let endpoints = [
            "https://patholab.cloud/api/labs/dashboard?range=\(range)",
            "https://app.patholab.cloud/api/labs/dashboard?range=\(range)"
        ]

        func fetchRichPatients(completion: @escaping ([[String: Any]]?) -> Void) {
            let patientEndpoints = [
                "https://patholab.cloud/api/workspace/patients?limit=6",
                "https://app.patholab.cloud/api/workspace/patients?limit=6"
            ]
            func attemptPatientFetch(at pIndex: Int) {
                guard pIndex < patientEndpoints.count, let pUrl = URL(string: patientEndpoints[pIndex]) else {
                    completion(nil)
                    return
                }
                var pReq = URLRequest(url: pUrl)
                pReq.httpMethod = "GET"
                pReq.timeoutInterval = 6
                if let t = token, !t.isEmpty {
                    pReq.setValue("Bearer \(t)", forHTTPHeaderField: "Authorization")
                    pReq.setValue("token=\(t)", forHTTPHeaderField: "Cookie")
                }
                URLSession.shared.dataTask(with: pReq) { pData, pResp, _ in
                    if let http = pResp as? HTTPURLResponse, http.statusCode == 200, let pData = pData {
                        if let pRoot = try? JSONSerialization.jsonObject(with: pData) as? [String: Any] {
                            if let arr = pRoot["data"] as? [[String: Any]], !arr.isEmpty {
                                completion(arr)
                                return
                            }
                            if let arr = pRoot["patients"] as? [[String: Any]], !arr.isEmpty {
                                completion(arr)
                                return
                            }
                        }
                    }
                    attemptPatientFetch(at: pIndex + 1)
                }.resume()
            }
            attemptPatientFetch(at: 0)
        }

        func attemptFetch(at index: Int) {
            guard index < endpoints.count, let url = URL(string: endpoints[index]) else {
                DispatchQueue.main.async {
                    self.refreshControl.endRefreshing()
                }
                return
            }

            var request = URLRequest(url: url)
            request.httpMethod = "GET"
            request.timeoutInterval = 9

            if let t = token, !t.isEmpty {
                request.setValue("Bearer \(t)", forHTTPHeaderField: "Authorization")
                request.setValue("token=\(t)", forHTTPHeaderField: "Cookie")
            }

            URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
                guard let self = self else { return }
                if let http = response as? HTTPURLResponse, http.statusCode == 200, let data = data {
                    do {
                        if var json = try JSONSerialization.jsonObject(with: data) as? [String: Any] {
                            fetchRichPatients { richPatients in
                                if let richPatients = richPatients, !richPatients.isEmpty {
                                    json["recentPatients"] = richPatients
                                }
                                DispatchQueue.main.async {
                                    self.bindDashboardData(json)
                                    self.refreshControl.endRefreshing()
                                }
                            }
                            return
                        }
                    } catch {}
                }
                // Try next endpoint
                attemptFetch(at: index + 1)
            }.resume()
        }

        attemptFetch(at: 0)
    }

    private func bindDashboardData(_ json: [String: Any]) {
        let kpi = json["kpi"] as? [String: Any] ?? [:]
        let alerts = json["alerts"] as? [String: Any] ?? [:]
        let charts = json["charts"] as? [String: Any] ?? [:]

        if let labDetails = json["labDetails"] as? [String: Any], let name = labDetails["name"] as? String {
            lblBranchName.text = "\(name) • Main Branch"
        }

        // 1. Primary KPIs
        let walletBal = kpi["walletBalance"] as? Double ?? 0.0
        let revenue = kpi["revenue"] as? Double ?? 0.0
        let totalTests = kpi["totalTests"] as? Int ?? 0
        let lowStockCount = alerts["inventory"] as? Int ?? 0

        lblWalletBal.text = formatINR(walletBal)
        if walletBal < 100 {
            cardWallet.backgroundColor = UIColor(red: 0.996, green: 0.949, blue: 0.949, alpha: 1) // #FEF2F2
            cardWallet.layer.borderColor = UIColor(red: 0.988, green: 0.647, blue: 0.647, alpha: 1).cgColor // #FCA5A5
            lblWalletBal.textColor = UIColor(red: 0.600, green: 0.106, blue: 0.106, alpha: 1) // #991B1B
            lblWalletStatus.text = "⚠️ Low Balance"
            lblWalletStatus.textColor = UIColor(red: 0.863, green: 0.149, blue: 0.149, alpha: 1) // #DC2626
            btnRecharge.backgroundColor = UIColor(red: 0.863, green: 0.149, blue: 0.149, alpha: 1) // #DC2626
        } else {
            cardWallet.backgroundColor = UIColor(red: 0.933, green: 0.949, blue: 1.0, alpha: 1) // #EEF2FF
            cardWallet.layer.borderColor = UIColor(red: 0.780, green: 0.824, blue: 0.996, alpha: 1).cgColor // #C7D2FE
            lblWalletBal.textColor = UIColor(red: 0.192, green: 0.180, blue: 0.506, alpha: 1) // #312E81
            lblWalletStatus.text = "● Pay-As-You-Go Active"
            lblWalletStatus.textColor = UIColor(red: 0.310, green: 0.275, blue: 0.898, alpha: 1) // #4F46E5
            btnRecharge.backgroundColor = UIColor(red: 0.310, green: 0.275, blue: 0.898, alpha: 1) // #4F46E5
        }

        lblRevenue.text = formatINR(revenue)
        lblTestsCount.text = "\(totalTests)"
        lblInventoryAlerts.text = "\(lowStockCount)"

        if lowStockCount > 0 {
            cardInv?.backgroundColor = UIColor(red: 1.0, green: 0.969, blue: 0.929, alpha: 1) // #FFF7ED
            cardInv?.layer.borderColor = UIColor(red: 0.996, green: 0.843, blue: 0.667, alpha: 1).cgColor // #FED7AA
            lblInventoryAlerts.textColor = UIColor(red: 0.761, green: 0.255, blue: 0.047, alpha: 1) // #C2410C
        } else {
            cardInv?.backgroundColor = .white
            cardInv?.layer.borderColor = UIColor(red: 0.89, green: 0.91, blue: 0.95, alpha: 1).cgColor
            lblInventoryAlerts.textColor = UIColor(red: 0.85, green: 0.47, blue: 0.02, alpha: 1)
        }

        // 2. Operational Pulse
        let samplesToday = kpi["samplesToday"] as? Int ?? 0
        let pendingSamples = kpi["pendingSamples"] as? Int ?? 0
        let pendingReports = kpi["pendingReports"] as? Int ?? 0

        lblPulseSamplesToday.text = "\(samplesToday)"
        lblPulsePendingSamples.text = "\(pendingSamples)"
        lblPulsePendingReports.text = "\(pendingReports)"

        // 3. Visual Charts (Area & Bar)
        if let trendArray = charts["trend"] as? [[String: Any]] {
            var revPoints: [(label: String, value: Float)] = []
            var testBars: [(label: String, count: Int)] = []

            for item in trendArray {
                let dateLbl = item["date"] as? String ?? ""
                let revVal = Float(item["revenue"] as? Double ?? 0.0)
                let testCount = item["tests"] as? Int ?? 0

                revPoints.append((label: dateLbl, value: revVal))
                testBars.append((label: dateLbl, count: testCount))
            }

            revenueChartView.setData(revPoints)
            testVolumeChartView.setData(testBars)
        }

        // 4. Recent Patients
        let recentPatients = json["recentPatients"] as? [[String: Any]] ?? []
        renderRecentPatients(recentPatients)
    }

    private func renderRecentPatients(_ patients: [[String: Any]]) {
        patientsStack.arrangedSubviews.forEach { $0.removeFromSuperview() }

        if patients.isEmpty {
            emptyPatientsLbl.isHidden = false
            return
        }
        emptyPatientsLbl.isHidden = true

        for p in patients {
            let card = UIView()
            card.backgroundColor = .white
            card.layer.cornerRadius = 14
            card.layer.borderWidth = 1
            card.layer.borderColor = UIColor(red: 0.89, green: 0.91, blue: 0.95, alpha: 1).cgColor

            var name = (p["name"] as? String) ?? "Unknown Patient"
            if name.caseInsensitiveCompare("null") == .orderedSame || name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                name = "Unknown Patient"
            }

            // Extract Gender
            var formattedGender = ""
            if let rawGender = p["gender"] as? String,
               rawGender.caseInsensitiveCompare("null") != .orderedSame,
               !rawGender.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                let trimmed = rawGender.trimmingCharacters(in: .whitespacesAndNewlines)
                formattedGender = trimmed.prefix(1).uppercased() + trimmed.dropFirst().lowercased()
            }

            // Extract Age
            var age = 0
            if let numAge = p["age"] as? Int {
                age = numAge
            } else if let numAge = p["age"] as? Double {
                age = Int(numAge)
            } else if let strAge = p["age"] as? String,
                      strAge.caseInsensitiveCompare("null") != .orderedSame {
                age = Int(strAge.trimmingCharacters(in: .whitespacesAndNewlines)) ?? 0
            }

            var ageUnit = (p["ageUnit"] as? String) ?? "Yrs"
            if ageUnit.caseInsensitiveCompare("null") == .orderedSame || ageUnit.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                ageUnit = "Yrs"
            }
            if ageUnit.caseInsensitiveCompare("Years") == .orderedSame {
                ageUnit = "Yrs"
            }

            // Format patient detail: gender and age ("just 2")
            var detailParts: [String] = []
            if !formattedGender.isEmpty {
                detailParts.append(formattedGender)
            }
            if age > 0 {
                detailParts.append("\(age) \(ageUnit)")
            }

            var detailText = detailParts.joined(separator: " • ")
            if detailText.isEmpty {
                if let phone = p["phone"] as? String,
                   phone.caseInsensitiveCompare("null") != .orderedSame,
                   !phone.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                    detailText = phone
                } else {
                    detailText = "Registered Patient"
                }
            }

            let initial = name.isEmpty ? "P" : String(name.prefix(1)).uppercased()

            let avatarLbl = UILabel()
            avatarLbl.text = initial
            avatarLbl.font = .systemFont(ofSize: 14, weight: .bold)
            avatarLbl.textColor = UIColor(hex: "4F46E5")
            avatarLbl.backgroundColor = UIColor(hex: "EEF2FF")
            avatarLbl.textAlignment = .center
            avatarLbl.layer.cornerRadius = 18
            avatarLbl.clipsToBounds = true
            avatarLbl.translatesAutoresizingMaskIntoConstraints = false

            let nameLbl = UILabel()
            nameLbl.text = name
            nameLbl.font = .systemFont(ofSize: 14, weight: .bold)
            nameLbl.textColor = UIColor(red: 0.059, green: 0.090, blue: 0.165, alpha: 1)

            let detailLbl = UILabel()
            detailLbl.text = detailText
            detailLbl.font = .systemFont(ofSize: 11.5, weight: .medium)
            detailLbl.textColor = UIColor(red: 0.392, green: 0.455, blue: 0.545, alpha: 1)

            let textStack = UIStackView(arrangedSubviews: [nameLbl, detailLbl])
            textStack.axis = .vertical
            textStack.spacing = 1
            textStack.translatesAutoresizingMaskIntoConstraints = false

            let chevron = UIImageView(image: UIImage(systemName: "chevron.right"))
            chevron.tintColor = UIColor(red: 0.58, green: 0.64, blue: 0.72, alpha: 1)
            chevron.contentMode = .scaleAspectFit
            chevron.translatesAutoresizingMaskIntoConstraints = false

            let rowStack = UIStackView(arrangedSubviews: [avatarLbl, textStack, chevron])
            rowStack.axis = .horizontal
            rowStack.spacing = 12
            rowStack.alignment = .center
            rowStack.translatesAutoresizingMaskIntoConstraints = false
            card.addSubview(rowStack)

            NSLayoutConstraint.activate([
                avatarLbl.widthAnchor.constraint(equalToConstant: 36),
                avatarLbl.heightAnchor.constraint(equalToConstant: 36),
                chevron.widthAnchor.constraint(equalToConstant: 14),
                chevron.heightAnchor.constraint(equalToConstant: 14),

                rowStack.topAnchor.constraint(equalTo: card.topAnchor, constant: 10),
                rowStack.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 12),
                rowStack.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -12),
                rowStack.bottomAnchor.constraint(equalTo: card.bottomAnchor, constant: -10),
            ])

            card.isUserInteractionEnabled = true
            let tap = UITapGestureRecognizer(target: self, action: #selector(didTapViewAllPatients))
            card.addGestureRecognizer(tap)

            patientsStack.addArrangedSubview(card)
        }
    }

    private func formatINR(_ amount: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.locale = Locale(identifier: "en_IN")
        formatter.maximumFractionDigits = 0
        return formatter.string(from: NSNumber(value: amount)) ?? "₹\(Int(amount))"
    }
}

// ═══════════════════════════════════════════════════════════════════════════
//  CUSTOM NATIVE COREGRAPHICS CHART VIEWS FOR IOS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * RevenueAreaChartView — Native CoreGraphics smooth curve area chart with gradient fill
 */
class RevenueAreaChartView: UIView {

    private var points: [(label: String, value: Float)] = []

    override init(frame: CGRect) {
        super.init(frame: frame)
        backgroundColor = .clear
    }

    required init?(coder: NSCoder) {
        super.init(coder: coder)
        backgroundColor = .clear
    }

    func setData(_ newPoints: [(label: String, value: Float)]) {
        self.points = newPoints
        setNeedsDisplay()
    }

    override func draw(_ rect: CGRect) {
        guard let context = UIGraphicsGetCurrentContext() else { return }

        let paddingLeft: CGFloat = 8
        let paddingRight: CGFloat = 8
        let paddingTop: CGFloat = 16
        let paddingBottom: CGFloat = 24

        let chartW = rect.width - paddingLeft - paddingRight
        let chartH = rect.height - paddingTop - paddingBottom

        if chartW <= 0 || chartH <= 0 { return }

        // Grid lines
        context.setStrokeColor(UIColor(red: 0.89, green: 0.91, blue: 0.95, alpha: 1).cgColor)
        context.setLineWidth(1.0)
        context.setLineDash(phase: 0, lengths: [4, 4])

        for i in 0...3 {
            let y = paddingTop + (chartH / 3.0) * CGFloat(i)
            context.move(to: CGPoint(x: paddingLeft, y: y))
            context.addLine(to: CGPoint(x: rect.width - paddingRight, y: y))
        }
        context.strokePath()

        if points.isEmpty {
            let attrs: [NSAttributedString.Key: Any] = [
                .font: UIFont.systemFont(ofSize: 12, weight: .medium),
                .foregroundColor: UIColor(red: 0.58, green: 0.64, blue: 0.72, alpha: 1)
            ]
            let str = "No revenue trend data"
            let size = str.size(withAttributes: attrs)
            str.draw(at: CGPoint(x: (rect.width - size.width) / 2, y: (rect.height - size.height) / 2), withAttributes: attrs)
            return
        }

        var maxVal: Float = 1.0
        for p in points {
            if p.value > maxVal { maxVal = p.value }
        }
        maxVal *= 1.15

        let count = points.count
        let stepX = count > 1 ? (chartW / CGFloat(count - 1)) : 0

        var coords: [CGPoint] = []
        for (i, p) in points.enumerated() {
            let x = paddingLeft + (count == 1 ? chartW / 2 : CGFloat(i) * stepX)
            let ratio = CGFloat(max(0, min(1, p.value / maxVal)))
            let y = paddingTop + chartH * (1.0 - ratio)
            coords.append(CGPoint(x: x, y: y))
        }

        // Draw Area Fill with Gradient
        let fillPath = UIBezierPath()
        fillPath.move(to: coords[0])

        for i in 0..<(coords.count - 1) {
            let p1 = coords[i]
            let p2 = coords[i + 1]
            let cp1 = CGPoint(x: p1.x + (p2.x - p1.x) / 2, y: p1.y)
            let cp2 = CGPoint(x: p1.x + (p2.x - p1.x) / 2, y: p2.y)
            fillPath.addCurve(to: p2, controlPoint1: cp1, controlPoint2: cp2)
        }

        fillPath.addLine(to: CGPoint(x: coords.last!.x, y: paddingTop + chartH))
        fillPath.addLine(to: CGPoint(x: coords[0].x, y: paddingTop + chartH))
        fillPath.close()

        context.saveGState()
        fillPath.addClip()

        let colorSpace = CGColorSpaceCreateDeviceRGB()
        let gradientColors = [
            UIColor(red: 0.06, green: 0.73, blue: 0.51, alpha: 0.35).cgColor,
            UIColor(red: 0.06, green: 0.73, blue: 0.51, alpha: 0.0).cgColor
        ] as CFArray
        if let gradient = CGGradient(colorsSpace: colorSpace, colors: gradientColors, locations: [0.0, 1.0]) {
            context.drawLinearGradient(gradient, start: CGPoint(x: 0, y: paddingTop), end: CGPoint(x: 0, y: paddingTop + chartH), options: [])
        }
        context.restoreGState()

        // Draw Curve Line
        let linePath = UIBezierPath()
        linePath.move(to: coords[0])

        for i in 0..<(coords.count - 1) {
            let p1 = coords[i]
            let p2 = coords[i + 1]
            let cp1 = CGPoint(x: p1.x + (p2.x - p1.x) / 2, y: p1.y)
            let cp2 = CGPoint(x: p1.x + (p2.x - p1.x) / 2, y: p2.y)
            linePath.addCurve(to: p2, controlPoint1: cp1, controlPoint2: cp2)
        }

        context.setStrokeColor(UIColor(red: 0.06, green: 0.73, blue: 0.51, alpha: 1.0).cgColor)
        context.setLineWidth(2.5)
        context.setLineDash(phase: 0, lengths: [])
        context.setLineCap(.round)
        context.setLineJoin(.round)
        context.addPath(linePath.cgPath)
        context.strokePath()

        // Draw Axis Date labels & Dots
        let labelInterval = max(1, count / 5)
        let textAttrs: [NSAttributedString.Key: Any] = [
            .font: UIFont.systemFont(ofSize: 9.5, weight: .medium),
            .foregroundColor: UIColor(red: 0.58, green: 0.64, blue: 0.72, alpha: 1)
        ]

        for i in 0..<count {
            if i == 0 || i == count - 1 || i % labelInterval == 0 {
                let pt = coords[i]

                // Dot
                context.setFillColor(UIColor(red: 0.06, green: 0.73, blue: 0.51, alpha: 1.0).cgColor)
                context.fillEllipse(in: CGRect(x: pt.x - 3.5, y: pt.y - 3.5, width: 7, height: 7))

                // Date Label
                let dateStr = points[i].label
                let size = dateStr.size(withAttributes: textAttrs)
                let labelX = max(paddingLeft, min(rect.width - paddingRight - size.width, pt.x - size.width / 2))
                dateStr.draw(at: CGPoint(x: labelX, y: rect.height - 18), withAttributes: textAttrs)
            }
        }
    }
}

/**
 * TestVolumeBarChartView — Native CoreGraphics rounded bar chart for iOS
 */
class TestVolumeBarChartView: UIView {

    private var items: [(label: String, count: Int)] = []

    override init(frame: CGRect) {
        super.init(frame: frame)
        backgroundColor = .clear
    }

    required init?(coder: NSCoder) {
        super.init(coder: coder)
        backgroundColor = .clear
    }

    func setData(_ newItems: [(label: String, count: Int)]) {
        self.items = newItems
        setNeedsDisplay()
    }

    override func draw(_ rect: CGRect) {
        guard let context = UIGraphicsGetCurrentContext() else { return }

        let paddingLeft: CGFloat = 8
        let paddingRight: CGFloat = 8
        let paddingTop: CGFloat = 18
        let paddingBottom: CGFloat = 24

        let chartW = rect.width - paddingLeft - paddingRight
        let chartH = rect.height - paddingTop - paddingBottom

        if chartW <= 0 || chartH <= 0 { return }

        // Grid lines
        context.setStrokeColor(UIColor(red: 0.89, green: 0.91, blue: 0.95, alpha: 1).cgColor)
        context.setLineWidth(1.0)
        context.setLineDash(phase: 0, lengths: [4, 4])

        for i in 0...3 {
            let y = paddingTop + (chartH / 3.0) * CGFloat(i)
            context.move(to: CGPoint(x: paddingLeft, y: y))
            context.addLine(to: CGPoint(x: rect.width - paddingRight, y: y))
        }
        context.strokePath()

        if items.isEmpty {
            let attrs: [NSAttributedString.Key: Any] = [
                .font: UIFont.systemFont(ofSize: 12, weight: .medium),
                .foregroundColor: UIColor(red: 0.58, green: 0.64, blue: 0.72, alpha: 1)
            ]
            let str = "No test volume recorded"
            let size = str.size(withAttributes: attrs)
            str.draw(at: CGPoint(x: (rect.width - size.width) / 2, y: (rect.height - size.height) / 2), withAttributes: attrs)
            return
        }

        var maxVal = 1
        for item in items {
            if item.count > maxVal { maxVal = item.count }
        }
        let effectiveMax = CGFloat(maxVal) * 1.2

        let count = items.count
        let availableSlotW = chartW / CGFloat(count)
        let barW = min(26.0, availableSlotW * 0.65)
        let radius: CGFloat = 4.0

        let labelInterval = max(1, count / 5)
        let textAttrs: [NSAttributedString.Key: Any] = [
            .font: UIFont.systemFont(ofSize: 9.5, weight: .medium),
            .foregroundColor: UIColor(red: 0.58, green: 0.64, blue: 0.72, alpha: 1)
        ]
        let valAttrs: [NSAttributedString.Key: Any] = [
            .font: UIFont.systemFont(ofSize: 9.5, weight: .bold),
            .foregroundColor: UIColor(red: 0.28, green: 0.33, blue: 0.41, alpha: 1)
        ]

        context.setFillColor(UIColor(red: 0.23, green: 0.51, blue: 0.96, alpha: 1.0).cgColor)

        for i in 0..<count {
            let item = items[i]
            let slotCenter = paddingLeft + (CGFloat(i) + 0.5) * availableSlotW
            let barLeft = slotCenter - (barW / 2)
            let ratio = CGFloat(max(0, min(1, CGFloat(item.count) / effectiveMax)))
            let barTop = paddingTop + chartH * (1.0 - ratio)
            let barHeight = paddingTop + chartH - barTop

            let barRect = CGRect(x: barLeft, y: barTop, width: barW, height: barHeight)
            let path = UIBezierPath(roundedRect: barRect, byRoundingCorners: [.topLeft, .topRight], cornerRadii: CGSize(width: radius, height: radius))
            context.addPath(path.cgPath)
            context.fillPath()

            // Draw Value atop bar if count <= 12
            if item.count > 0 && count <= 12 {
                let vStr = "\(item.count)"
                let vSize = vStr.size(withAttributes: valAttrs)
                vStr.draw(at: CGPoint(x: slotCenter - vSize.width / 2, y: barTop - vSize.height - 2), withAttributes: valAttrs)
            }

            // Draw X axis date label
            if i == 0 || i == count - 1 || i % labelInterval == 0 {
                let size = item.label.size(withAttributes: textAttrs)
                let labelX = max(paddingLeft, min(rect.width - paddingRight - size.width, slotCenter - size.width / 2))
                item.label.draw(at: CGPoint(x: labelX, y: rect.height - 18), withAttributes: textAttrs)
            }
        }
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
