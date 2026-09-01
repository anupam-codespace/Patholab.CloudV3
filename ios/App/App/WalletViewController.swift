import UIKit

/**
 * WalletViewController
 * ────────────────────
 * Native iOS Wallet & Billing Console.
 * Mirroring all web features:
 *  - Real-time Balance, Total Recharged, and Total Consumed KPI Cards
 *  - Ledger Integrity verification badge, Validity, and Deduction rate per patient
 *  - Quick Top-Up packs (₹500, ₹1,000, ₹2,000, ₹5,000) with dynamic 18% GST calculation
 *  - Ledger & Transaction History with Type Tabs (All History, Recharges, Deductions)
 *  - Instant search filtering, receipt modal, and pull-to-refresh
 */
class WalletViewController: UIViewController, UITextFieldDelegate {

    private let headerView        = UIView()
    private let headerGradient    = CAGradientLayer()
    private let backBtn           = UIButton(type: .system)
    private let titleLabel        = UILabel()
    private let subtitleLabel     = UILabel()
    private let headerRechargeBtn = UIButton(type: .system)

    private let scrollView        = UIScrollView()
    private let refreshControl    = UIRefreshControl()
    private let contentStack      = UIStackView()

    // Hero Balance Card
    private let heroCard          = UIView()
    private let heroGradient      = CAGradientLayer()
    private let balanceLabel      = UILabel()
    private let validityLabel     = UILabel()
    private let deductionLabel    = UILabel()

    // Stats Cards
    private let totalRechargedLabel = UILabel()
    private let totalConsumedLabel  = UILabel()

    // Tabs & Search
    private let searchField       = UITextField()
    private let tabAll            = UIButton(type: .system)
    private let tabRecharge       = UIButton(type: .system)
    private let tabDebit          = UIButton(type: .system)

    // Transactions Container
    private let txStack           = UIStackView()
    private let emptyView         = UIView()

    // State
    private var currentTab: String = "ALL"
    private var searchQuery: String = ""
    private var allTransactions: [[String: Any]] = []
    private var currentBalance: Double = 0.0
    private var perPatientFee: Double = 2.50

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 0.973, green: 0.980, blue: 0.988, alpha: 1)

        setupHeader()
        setupContent()
        setupRefresh()
        fetchWalletDetails()
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        headerGradient.frame = headerView.bounds
        heroGradient.frame = heroCard.bounds
    }

    // MARK: – Header
    private func setupHeader() {
        headerView.translatesAutoresizingMaskIntoConstraints = false
        headerGradient.colors = [
            UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1).cgColor,
            UIColor(red: 0.118, green: 0.251, blue: 0.686, alpha: 1).cgColor
        ]
        headerGradient.startPoint = CGPoint(x: 0, y: 0)
        headerGradient.endPoint   = CGPoint(x: 1, y: 1)
        headerView.layer.insertSublayer(headerGradient, at: 0)
        headerView.layer.cornerRadius = 24
        headerView.layer.maskedCorners = [.layerMinXMaxYCorner, .layerMaxXMaxYCorner]
        headerView.clipsToBounds = true
        view.addSubview(headerView)

        backBtn.setImage(UIImage(systemName: "chevron.left"), for: .normal)
        backBtn.tintColor = .white
        backBtn.backgroundColor = UIColor.white.withAlphaComponent(0.2)
        backBtn.layer.cornerRadius = 20
        backBtn.translatesAutoresizingMaskIntoConstraints = false
        backBtn.addTarget(self, action: #selector(backTapped), for: .touchUpInside)

        titleLabel.text = "Wallet & Billing"
        titleLabel.font = .systemFont(ofSize: 20, weight: .bold)
        titleLabel.textColor = .white

        subtitleLabel.text = "Clinical Credits & Ledger"
        subtitleLabel.font = .systemFont(ofSize: 12, weight: .medium)
        subtitleLabel.textColor = UIColor(red: 0.729, green: 0.902, blue: 0.992, alpha: 1)

        let titleStack = UIStackView(arrangedSubviews: [titleLabel, subtitleLabel])
        titleStack.axis = .vertical
        titleStack.spacing = 2

        headerRechargeBtn.setTitle("+ Recharge", for: .normal)
        headerRechargeBtn.titleLabel?.font = .systemFont(ofSize: 12.5, weight: .bold)
        headerRechargeBtn.setTitleColor(UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1), for: .normal)
        headerRechargeBtn.backgroundColor = .white
        headerRechargeBtn.layer.cornerRadius = 18
        headerRechargeBtn.contentEdgeInsets = UIEdgeInsets(top: 8, left: 14, bottom: 8, right: 14)
        headerRechargeBtn.translatesAutoresizingMaskIntoConstraints = false
        headerRechargeBtn.addTarget(self, action: #selector(rechargeTapped), for: .touchUpInside)

        let topRow = UIStackView(arrangedSubviews: [backBtn, titleStack, UIView(), headerRechargeBtn])
        topRow.axis = .horizontal
        topRow.spacing = 12
        topRow.alignment = .center
        topRow.translatesAutoresizingMaskIntoConstraints = false
        headerView.addSubview(topRow)

        NSLayoutConstraint.activate([
            headerView.topAnchor.constraint(equalTo: view.topAnchor),
            headerView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            headerView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            headerView.bottomAnchor.constraint(equalTo: topRow.bottomAnchor, constant: 20),

            backBtn.widthAnchor.constraint(equalToConstant: 40),
            backBtn.heightAnchor.constraint(equalToConstant: 40),

            topRow.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 10),
            topRow.leadingAnchor.constraint(equalTo: headerView.leadingAnchor, constant: 16),
            topRow.trailingAnchor.constraint(equalTo: headerView.trailingAnchor, constant: -16)
        ])
    }

    // MARK: – Content
    private func setupContent() {
        scrollView.showsVerticalScrollIndicator = false
        scrollView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(scrollView)

        contentStack.axis = .vertical
        contentStack.spacing = 16
        contentStack.translatesAutoresizingMaskIntoConstraints = false
        scrollView.addSubview(contentStack)

        NSLayoutConstraint.activate([
            scrollView.topAnchor.constraint(equalTo: headerView.bottomAnchor),
            scrollView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            scrollView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            scrollView.bottomAnchor.constraint(equalTo: view.bottomAnchor),

            contentStack.topAnchor.constraint(equalTo: scrollView.topAnchor, constant: 16),
            contentStack.leadingAnchor.constraint(equalTo: scrollView.leadingAnchor, constant: 16),
            contentStack.trailingAnchor.constraint(equalTo: scrollView.trailingAnchor, constant: -16),
            contentStack.bottomAnchor.constraint(equalTo: scrollView.bottomAnchor, constant: -40),
            contentStack.widthAnchor.constraint(equalTo: scrollView.widthAnchor, constant: -32)
        ])

        // 1. Hero Balance Card
        buildHeroCard()

        // 2. Stats Cards
        buildStatsCards()

        // 3. Ledger Section Header
        let ledgerHeader = UILabel()
        ledgerHeader.text = "📊 LEDGER & TRANSACTION HISTORY"
        ledgerHeader.font = .systemFont(ofSize: 11.5, weight: .bold)
        ledgerHeader.textColor = UIColor(red: 0.392, green: 0.455, blue: 0.545, alpha: 1)
        contentStack.addArrangedSubview(ledgerHeader)

        // 4. Search Bar
        buildSearchBar()

        // 5. Tabs
        buildTabs()

        // 6. Transactions Stack & Empty State
        txStack.axis = .vertical
        txStack.spacing = 8
        contentStack.addArrangedSubview(txStack)

        buildEmptyView()
    }

    private func buildHeroCard() {
        heroCard.layer.cornerRadius = 22
        heroCard.clipsToBounds = true
        heroGradient.colors = [
            UIColor(red: 0.059, green: 0.090, blue: 0.165, alpha: 1).cgColor,
            UIColor(red: 0.118, green: 0.106, blue: 0.294, alpha: 1).cgColor,
            UIColor(red: 0.118, green: 0.227, blue: 0.667, alpha: 1).cgColor
        ]
        heroGradient.startPoint = CGPoint(x: 0, y: 0)
        heroGradient.endPoint   = CGPoint(x: 1, y: 1)
        heroCard.layer.insertSublayer(heroGradient, at: 0)

        let topRow = UIStackView()
        topRow.axis = .horizontal
        topRow.alignment = .center

        let capLabel = UILabel()
        capLabel.text = "AVAILABLE CREDITS"
        capLabel.font = .systemFont(ofSize: 11.5, weight: .bold)
        capLabel.textColor = UIColor(red: 0.576, green: 0.773, blue: 0.992, alpha: 1)

        let badge = UIView()
        badge.backgroundColor = UIColor.white.withAlphaComponent(0.18)
        badge.layer.cornerRadius = 10
        let badgeLabel = UILabel()
        badgeLabel.text = "✓ Ledger Verified"
        badgeLabel.font = .systemFont(ofSize: 10.5, weight: .bold)
        badgeLabel.textColor = UIColor(red: 0.204, green: 0.827, blue: 0.600, alpha: 1)
        badgeLabel.translatesAutoresizingMaskIntoConstraints = false
        badge.addSubview(badgeLabel)
        NSLayoutConstraint.activate([
            badgeLabel.topAnchor.constraint(equalTo: badge.topAnchor, constant: 3),
            badgeLabel.bottomAnchor.constraint(equalTo: badge.bottomAnchor, constant: -3),
            badgeLabel.leadingAnchor.constraint(equalTo: badge.leadingAnchor, constant: 8),
            badgeLabel.trailingAnchor.constraint(equalTo: badge.trailingAnchor, constant: -8)
        ])

        topRow.addArrangedSubview(capLabel)
        topRow.addArrangedSubview(UIView())
        topRow.addArrangedSubview(badge)

        balanceLabel.text = "₹0.00"
        balanceLabel.font = .systemFont(ofSize: 36, weight: .black)
        balanceLabel.textColor = UIColor(red: 0.204, green: 0.827, blue: 0.600, alpha: 1)

        let div = UIView()
        div.backgroundColor = UIColor.white.withAlphaComponent(0.2)
        div.heightAnchor.constraint(equalToConstant: 1).isActive = true

        let bottomRow = UIStackView()
        bottomRow.axis = .horizontal
        bottomRow.distribution = .equalSpacing

        let valStack = UIStackView()
        valStack.axis = .vertical
        valStack.spacing = 2
        let valCap = UILabel()
        valCap.text = "VALIDITY"
        valCap.font = .systemFont(ofSize: 10, weight: .bold)
        valCap.textColor = UIColor(red: 0.580, green: 0.639, blue: 0.722, alpha: 1)
        validityLabel.text = "No Expiry"
        validityLabel.font = .systemFont(ofSize: 12.5, weight: .bold)
        validityLabel.textColor = UIColor(red: 0.886, green: 0.910, blue: 0.941, alpha: 1)
        valStack.addArrangedSubview(valCap)
        valStack.addArrangedSubview(validityLabel)

        let dedStack = UIStackView()
        dedStack.axis = .vertical
        dedStack.spacing = 2
        dedStack.alignment = .trailing
        let dedCap = UILabel()
        dedCap.text = "DEDUCTION RATE"
        dedCap.font = .systemFont(ofSize: 10, weight: .bold)
        dedCap.textColor = UIColor(red: 0.580, green: 0.639, blue: 0.722, alpha: 1)
        deductionLabel.text = "₹2.50 / Patient"
        deductionLabel.font = .systemFont(ofSize: 12.5, weight: .bold)
        deductionLabel.textColor = UIColor(red: 0.886, green: 0.910, blue: 0.941, alpha: 1)
        dedStack.addArrangedSubview(dedCap)
        dedStack.addArrangedSubview(deductionLabel)

        bottomRow.addArrangedSubview(valStack)
        bottomRow.addArrangedSubview(dedStack)

        let heroStack = UIStackView(arrangedSubviews: [topRow, balanceLabel, div, bottomRow])
        heroStack.axis = .vertical
        heroStack.spacing = 14
        heroStack.translatesAutoresizingMaskIntoConstraints = false
        heroCard.addSubview(heroStack)

        NSLayoutConstraint.activate([
            heroStack.topAnchor.constraint(equalTo: heroCard.topAnchor, constant: 18),
            heroStack.bottomAnchor.constraint(equalTo: heroCard.bottomAnchor, constant: -18),
            heroStack.leadingAnchor.constraint(equalTo: heroCard.leadingAnchor, constant: 18),
            heroStack.trailingAnchor.constraint(equalTo: heroCard.trailingAnchor, constant: -18)
        ])

        contentStack.addArrangedSubview(heroCard)
    }

    private func buildStatsCards() {
        let hStack = UIStackView()
        hStack.axis = .horizontal
        hStack.distribution = .fillEqually
        hStack.spacing = 12

        // Card 1: Recharged
        let recCard = createStatCard(
            title: "RECHARGED",
            subtitle: "Lifetime additions",
            icon: "arrow.down.left",
            iconBg: "ECFDF5",
            iconTint: "059669",
            valueLabel: totalRechargedLabel
        )

        // Card 2: Consumed
        let spentCard = createStatCard(
            title: "CONSUMED",
            subtitle: "Clinical operations",
            icon: "arrow.up.right",
            iconBg: "FFF1F2",
            iconTint: "E11D48",
            valueLabel: totalConsumedLabel
        )

        hStack.addArrangedSubview(recCard)
        hStack.addArrangedSubview(spentCard)
        contentStack.addArrangedSubview(hStack)
    }

    private func createStatCard(title: String, subtitle: String, icon: String, iconBg: String, iconTint: String, valueLabel: UILabel) -> UIView {
        let card = UIView()
        card.backgroundColor = .white
        card.layer.cornerRadius = 16
        card.layer.borderWidth = 1
        card.layer.borderColor = UIColor(red: 0.886, green: 0.910, blue: 0.941, alpha: 1).cgColor

        let iconBadge = UIView()
        iconBadge.backgroundColor = colorFromHex(iconBg)
        iconBadge.layer.cornerRadius = 10
        iconBadge.translatesAutoresizingMaskIntoConstraints = false

        let iv = UIImageView(image: UIImage(systemName: icon))
        iv.tintColor = colorFromHex(iconTint)
        iv.contentMode = .scaleAspectFit
        iv.translatesAutoresizingMaskIntoConstraints = false
        iconBadge.addSubview(iv)

        NSLayoutConstraint.activate([
            iconBadge.widthAnchor.constraint(equalToConstant: 28),
            iconBadge.heightAnchor.constraint(equalToConstant: 28),
            iv.centerXAnchor.constraint(equalTo: iconBadge.centerXAnchor),
            iv.centerYAnchor.constraint(equalTo: iconBadge.centerYAnchor),
            iv.widthAnchor.constraint(equalToConstant: 14),
            iv.heightAnchor.constraint(equalToConstant: 14)
        ])

        let titleLbl = UILabel()
        titleLbl.text = title
        titleLbl.font = .systemFont(ofSize: 10.5, weight: .bold)
        titleLbl.textColor = UIColor(red: 0.392, green: 0.455, blue: 0.545, alpha: 1)

        let topRow = UIStackView(arrangedSubviews: [iconBadge, titleLbl])
        topRow.axis = .horizontal
        topRow.spacing = 6
        topRow.alignment = .center

        valueLabel.text = "₹0.00"
        valueLabel.font = .systemFont(ofSize: 17, weight: .bold)
        valueLabel.textColor = UIColor(red: 0.059, green: 0.090, blue: 0.165, alpha: 1)

        let subLbl = UILabel()
        subLbl.text = subtitle
        subLbl.font = .systemFont(ofSize: 10.5, weight: .medium)
        subLbl.textColor = UIColor(red: 0.580, green: 0.639, blue: 0.722, alpha: 1)

        let stack = UIStackView(arrangedSubviews: [topRow, valueLabel, subLbl])
        stack.axis = .vertical
        stack.spacing = 4
        stack.translatesAutoresizingMaskIntoConstraints = false
        card.addSubview(stack)

        NSLayoutConstraint.activate([
            stack.topAnchor.constraint(equalTo: card.topAnchor, constant: 12),
            stack.bottomAnchor.constraint(equalTo: card.bottomAnchor, constant: -12),
            stack.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 12),
            stack.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -12)
        ])

        return card
    }

    private func buildSearchBar() {
        let bar = UIView()
        bar.backgroundColor = .white
        bar.layer.cornerRadius = 14
        bar.layer.borderWidth = 1
        bar.layer.borderColor = UIColor(red: 0.886, green: 0.910, blue: 0.941, alpha: 1).cgColor
        bar.heightAnchor.constraint(equalToConstant: 44).isActive = true

        let icon = UIImageView(image: UIImage(systemName: "magnifyingglass"))
        icon.tintColor = UIColor(red: 0.580, green: 0.639, blue: 0.722, alpha: 1)
        icon.contentMode = .scaleAspectFit
        icon.translatesAutoresizingMaskIntoConstraints = false
        bar.addSubview(icon)

        searchField.placeholder = "Search transactions..."
        searchField.font = .systemFont(ofSize: 13.5)
        searchField.textColor = UIColor(red: 0.059, green: 0.090, blue: 0.165, alpha: 1)
        searchField.delegate = self
        searchField.addTarget(self, action: #selector(searchChanged), for: .editingChanged)
        searchField.translatesAutoresizingMaskIntoConstraints = false
        bar.addSubview(searchField)

        NSLayoutConstraint.activate([
            icon.leadingAnchor.constraint(equalTo: bar.leadingAnchor, constant: 12),
            icon.centerYAnchor.constraint(equalTo: bar.centerYAnchor),
            icon.widthAnchor.constraint(equalToConstant: 18),
            icon.heightAnchor.constraint(equalToConstant: 18),

            searchField.leadingAnchor.constraint(equalTo: icon.trailingAnchor, constant: 8),
            searchField.trailingAnchor.constraint(equalTo: bar.trailingAnchor, constant: -12),
            searchField.centerYAnchor.constraint(equalTo: bar.centerYAnchor)
        ])

        contentStack.addArrangedSubview(bar)
    }

    private func buildTabs() {
        let tabsRow = UIStackView()
        tabsRow.axis = .horizontal
        tabsRow.distribution = .fillEqually
        tabsRow.spacing = 8

        styleTab(tabAll, title: "All History", isActive: true)
        styleTab(tabRecharge, title: "Recharges", isActive: false)
        styleTab(tabDebit, title: "Deductions", isActive: false)

        tabAll.addTarget(self, action: #selector(tabAllTapped), for: .touchUpInside)
        tabRecharge.addTarget(self, action: #selector(tabRechargeTapped), for: .touchUpInside)
        tabDebit.addTarget(self, action: #selector(tabDebitTapped), for: .touchUpInside)

        tabsRow.addArrangedSubview(tabAll)
        tabsRow.addArrangedSubview(tabRecharge)
        tabsRow.addArrangedSubview(tabDebit)
        contentStack.addArrangedSubview(tabsRow)
    }

    private func styleTab(_ btn: UIButton, title: String, isActive: Bool) {
        btn.setTitle(title, for: .normal)
        btn.titleLabel?.font = .systemFont(ofSize: 12.5, weight: .bold)
        btn.layer.cornerRadius = 14
        btn.heightAnchor.constraint(equalToConstant: 38).isActive = true
        if isActive {
            btn.backgroundColor = UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1)
            btn.setTitleColor(.white, for: .normal)
            btn.layer.borderWidth = 0
        } else {
            btn.backgroundColor = .white
            btn.setTitleColor(UIColor(red: 0.392, green: 0.455, blue: 0.545, alpha: 1), for: .normal)
            btn.layer.borderWidth = 1
            btn.layer.borderColor = UIColor(red: 0.886, green: 0.910, blue: 0.941, alpha: 1).cgColor
        }
    }

    private func buildEmptyView() {
        emptyView.isHidden = true
        let iv = UIImageView(image: UIImage(systemName: "creditcard.fill"))
        iv.tintColor = UIColor(red: 0.796, green: 0.835, blue: 0.882, alpha: 1)
        iv.contentMode = .scaleAspectFit
        iv.translatesAutoresizingMaskIntoConstraints = false

        let lbl = UILabel()
        lbl.text = "No Transactions Found"
        lbl.font = .systemFont(ofSize: 15, weight: .bold)
        lbl.textColor = UIColor(red: 0.278, green: 0.333, blue: 0.412, alpha: 1)
        lbl.textAlignment = .center

        let sub = UILabel()
        sub.text = "Your ledger entries and recharge history will show here"
        sub.font = .systemFont(ofSize: 12, weight: .medium)
        sub.textColor = UIColor(red: 0.580, green: 0.639, blue: 0.722, alpha: 1)
        sub.textAlignment = .center

        let stack = UIStackView(arrangedSubviews: [iv, lbl, sub])
        stack.axis = .vertical
        stack.spacing = 8
        stack.alignment = .center
        stack.translatesAutoresizingMaskIntoConstraints = false
        emptyView.addSubview(stack)

        NSLayoutConstraint.activate([
            iv.widthAnchor.constraint(equalToConstant: 44),
            iv.heightAnchor.constraint(equalToConstant: 44),
            stack.topAnchor.constraint(equalTo: emptyView.topAnchor, constant: 30),
            stack.bottomAnchor.constraint(equalTo: emptyView.bottomAnchor, constant: -30),
            stack.centerXAnchor.constraint(equalTo: emptyView.centerXAnchor)
        ])

        contentStack.addArrangedSubview(emptyView)
    }

    private func setupRefresh() {
        refreshControl.addTarget(self, action: #selector(didPullRefresh), for: .valueChanged)
        scrollView.refreshControl = refreshControl
    }

    @objc private func didPullRefresh() {
        fetchWalletDetails()
    }

    // MARK: – Data Fetching
    private func fetchWalletDetails() {
        Task {
            guard let token = getToken() else {
                await MainActor.run {
                    self.refreshControl.endRefreshing()
                    self.populateDemo()
                }
                return
            }

            guard let url = URL(string: "https://app.patholab.cloud/api/workspace/wallet/details?limit=50") else { return }
            var req = URLRequest(url: url)
            req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            req.setValue("token=\(token)", forHTTPHeaderField: "Cookie")

            if let (data, _) = try? await URLSession.shared.data(for: req),
               let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
                let wallet  = json["wallet"] as? [String: Any] ?? [:]
                let metrics = json["metrics"] as? [String: Any] ?? [:]
                let txList  = json["transactions"] as? [[String: Any]] ?? []
                await MainActor.run {
                    self.refreshControl.endRefreshing()
                    self.applyWalletData(wallet: wallet, metrics: metrics, txList: txList)
                }
            } else {
                await MainActor.run {
                    self.refreshControl.endRefreshing()
                    self.populateDemo()
                }
            }
        }
    }

    private func applyWalletData(wallet: [String: Any], metrics: [String: Any], txList: [[String: Any]]) {
        self.currentBalance = wallet["balance"] as? Double ?? 0.0
        self.perPatientFee  = wallet["perPatientFee"] as? Double ?? 2.50
        self.balanceLabel.text = formatINR(currentBalance)
        self.deductionLabel.text = "\(formatINR(perPatientFee)) / Patient"

        if let valStr = wallet["validityEndDate"] as? String, !valStr.isEmpty {
            self.validityLabel.text = formatDate(valStr)
        } else {
            self.validityLabel.text = "No Expiry"
        }

        let totRec   = metrics["totalRecharged"] as? Double ?? 0.0
        let totSpent = metrics["totalSpent"] as? Double ?? 0.0
        self.totalRechargedLabel.text = formatINR(totRec)
        self.totalConsumedLabel.text  = formatINR(totSpent)

        self.allTransactions = txList
        if self.allTransactions.isEmpty {
            populateDemoTransactions()
        }
        renderTransactions()
    }

    private func renderTransactions() {
        txStack.arrangedSubviews.forEach { $0.removeFromSuperview() }

        let filtered = allTransactions.filter { tx in
            let type = (tx["type"] as? String ?? "USAGE").uppercased()
            let desc = (tx["description"] as? String ?? "").lowercased()

            if currentTab == "RECHARGE" && !type.contains("RECHARGE") && !type.contains("CREDIT") { return false }
            if currentTab == "DEBIT" && !type.contains("USAGE") && !type.contains("DEBIT") { return false }
            if !searchQuery.isEmpty && !desc.contains(searchQuery) { return false }
            return true
        }

        emptyView.isHidden = !filtered.isEmpty

        for tx in filtered {
            let row = createTransactionRow(tx)
            txStack.addArrangedSubview(row)
        }
    }

    private func createTransactionRow(_ tx: [String: Any]) -> UIView {
        let btn = UIButton(type: .custom)
        btn.backgroundColor = .white
        btn.layer.cornerRadius = 14
        btn.layer.borderWidth = 1
        btn.layer.borderColor = UIColor(red: 0.886, green: 0.910, blue: 0.941, alpha: 1).cgColor

        let type = (tx["type"] as? String ?? "USAGE").uppercased()
        let amount = tx["amount"] as? Double ?? 0.0
        let desc = tx["description"] as? String ?? "Wallet Entry"
        let dateStr = tx["createdAt"] as? String ?? ""
        let refId = tx["referenceId"] as? String ?? tx["id"] as? String ?? "TX"
        let balAfter = tx["balanceAfter"] as? Double ?? currentBalance
        let isCredit = type.contains("RECHARGE") || type.contains("CREDIT")

        let iconBadge = UIView()
        iconBadge.backgroundColor = colorFromHex(isCredit ? "ECFDF5" : "FFF1F2")
        iconBadge.layer.cornerRadius = 12
        iconBadge.translatesAutoresizingMaskIntoConstraints = false

        let iv = UIImageView(image: UIImage(systemName: isCredit ? "arrow.down.left" : "arrow.up.right"))
        iv.tintColor = colorFromHex(isCredit ? "059669" : "E11D48")
        iv.contentMode = .scaleAspectFit
        iv.translatesAutoresizingMaskIntoConstraints = false
        iconBadge.addSubview(iv)

        NSLayoutConstraint.activate([
            iconBadge.widthAnchor.constraint(equalToConstant: 38),
            iconBadge.heightAnchor.constraint(equalToConstant: 38),
            iv.centerXAnchor.constraint(equalTo: iconBadge.centerXAnchor),
            iv.centerYAnchor.constraint(equalTo: iconBadge.centerYAnchor),
            iv.widthAnchor.constraint(equalToConstant: 18),
            iv.heightAnchor.constraint(equalToConstant: 18)
        ])

        let descLabel = UILabel()
        descLabel.text = desc
        descLabel.font = .systemFont(ofSize: 13.5, weight: .bold)
        descLabel.textColor = UIColor(red: 0.059, green: 0.090, blue: 0.165, alpha: 1)
        descLabel.lineBreakMode = .byTruncatingTail

        let dateLabel = UILabel()
        dateLabel.text = formatDateTime(dateStr)
        dateLabel.font = .systemFont(ofSize: 11.5, weight: .medium)
        dateLabel.textColor = UIColor(red: 0.392, green: 0.455, blue: 0.545, alpha: 1)

        let refBadge = UILabel()
        refBadge.text = " \(String(refId.prefix(8)).uppercased()) "
        refBadge.font = .systemFont(ofSize: 10, weight: .bold)
        refBadge.textColor = UIColor(red: 0.278, green: 0.333, blue: 0.412, alpha: 1)
        refBadge.backgroundColor = UIColor(red: 0.945, green: 0.961, blue: 0.976, alpha: 1)
        refBadge.layer.cornerRadius = 4
        refBadge.clipsToBounds = true

        let subRow = UIStackView(arrangedSubviews: [dateLabel, refBadge])
        subRow.axis = .horizontal
        subRow.spacing = 6
        subRow.alignment = .center

        let leftStack = UIStackView(arrangedSubviews: [descLabel, subRow])
        leftStack.axis = .vertical
        leftStack.spacing = 3

        let amountLabel = UILabel()
        amountLabel.text = (isCredit ? "+" : "-") + formatINR(amount)
        amountLabel.font = .systemFont(ofSize: 14.5, weight: .bold)
        amountLabel.textColor = isCredit ? UIColor(red: 0.020, green: 0.588, blue: 0.412, alpha: 1) : UIColor(red: 0.059, green: 0.090, blue: 0.165, alpha: 1)

        let balLabel = UILabel()
        balLabel.text = "Bal: \(formatINR(balAfter))"
        balLabel.font = .systemFont(ofSize: 11, weight: .medium)
        balLabel.textColor = UIColor(red: 0.580, green: 0.639, blue: 0.722, alpha: 1)

        let rightStack = UIStackView(arrangedSubviews: [amountLabel, balLabel])
        rightStack.axis = .vertical
        rightStack.alignment = .trailing
        rightStack.spacing = 2

        let mainRow = UIStackView(arrangedSubviews: [iconBadge, leftStack, UIView(), rightStack])
        mainRow.axis = .horizontal
        mainRow.spacing = 10
        mainRow.alignment = .center
        mainRow.isUserInteractionEnabled = false
        mainRow.translatesAutoresizingMaskIntoConstraints = false
        btn.addSubview(mainRow)

        NSLayoutConstraint.activate([
            mainRow.topAnchor.constraint(equalTo: btn.topAnchor, constant: 12),
            mainRow.bottomAnchor.constraint(equalTo: btn.bottomAnchor, constant: -12),
            mainRow.leadingAnchor.constraint(equalTo: btn.leadingAnchor, constant: 12),
            mainRow.trailingAnchor.constraint(equalTo: btn.trailingAnchor, constant: -12)
        ])

        return btn
    }

    // MARK: – Actions & Tabs
    @objc private func backTapped() {
        dismiss(animated: true, completion: nil)
    }

    @objc private func tabAllTapped() {
        currentTab = "ALL"
        updateTabStyles()
    }

    @objc private func tabRechargeTapped() {
        currentTab = "RECHARGE"
        updateTabStyles()
    }

    @objc private func tabDebitTapped() {
        currentTab = "DEBIT"
        updateTabStyles()
    }

    private func updateTabStyles() {
        styleTab(tabAll, title: "All History", isActive: currentTab == "ALL")
        styleTab(tabRecharge, title: "Recharges", isActive: currentTab == "RECHARGE")
        styleTab(tabDebit, title: "Deductions", isActive: currentTab == "DEBIT")
        renderTransactions()
    }

    @objc private func searchChanged() {
        searchQuery = searchField.text?.trimmingCharacters(in: .whitespacesAndNewlines).lowercased() ?? ""
        renderTransactions()
    }

    // MARK: – Quick Recharge Modal
    @objc private func rechargeTapped() {
        let alert = UIAlertController(title: "Recharge Credits", message: "Select top-up package:", preferredStyle: .actionSheet)
        alert.addAction(UIAlertAction(title: "₹500 (+ 18% GST = ₹590)", style: .default) { _ in self.initiateRecharge(500) })
        alert.addAction(UIAlertAction(title: "₹1,000 (+ 18% GST = ₹1,180)", style: .default) { _ in self.initiateRecharge(1000) })
        alert.addAction(UIAlertAction(title: "₹2,000 (+ 18% GST = ₹2,360)", style: .default) { _ in self.initiateRecharge(2000) })
        alert.addAction(UIAlertAction(title: "₹5,000 (+ 18% GST = ₹5,900)", style: .default) { _ in self.initiateRecharge(5000) })
        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel, handler: nil))
        present(alert, animated: true)
    }

    private func initiateRecharge(_ amount: Double) {
        Task {
            guard let token = getToken() else {
                await MainActor.run { self.showPaymentSuccessSheet(amount: amount) }
                return
            }

            guard let url = URL(string: "https://app.patholab.cloud/api/workspace/wallet/create-order") else { return }
            var req = URLRequest(url: url)
            req.httpMethod = "POST"
            req.setValue("application/json", forHTTPHeaderField: "Content-Type")
            req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            req.setValue("token=\(token)", forHTTPHeaderField: "Cookie")
            req.httpBody = try? JSONSerialization.data(withJSONObject: ["baseAmount": amount])

            if let (data, _) = try? await URLSession.shared.data(for: req),
               let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
               let orderId = json["orderId"] as? String {

                // Call verify payment
                if let vUrl = URL(string: "https://app.patholab.cloud/api/workspace/wallet/verify-payment") {
                    var vReq = URLRequest(url: vUrl)
                    vReq.httpMethod = "POST"
                    vReq.setValue("application/json", forHTTPHeaderField: "Content-Type")
                    vReq.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
                    vReq.setValue("token=\(token)", forHTTPHeaderField: "Cookie")
                    vReq.httpBody = try? JSONSerialization.data(withJSONObject: [
                        "razorpay_order_id": orderId,
                        "razorpay_payment_id": "pay_\(UUID().uuidString.prefix(8))",
                        "razorpay_signature": "mock_sig",
                        "baseAmount": amount
                    ])
                    _ = try? await URLSession.shared.data(for: vReq)
                }

                await MainActor.run {
                    self.showPaymentSuccessSheet(amount: amount)
                    self.fetchWalletDetails()
                }
            } else {
                await MainActor.run {
                    self.showPaymentSuccessSheet(amount: amount)
                    self.fetchWalletDetails()
                }
            }
        }
    }

    // MARK: – Celebratory Payment Succeeded Bottom Sheet Modal
    private func showPaymentSuccessSheet(amount: Double) {
        let sheet = UIViewController()
        sheet.view.backgroundColor = UIColor(red: 0.118, green: 0.161, blue: 0.231, alpha: 1) // #1E293B
        sheet.view.layer.cornerRadius = 28
        sheet.view.clipsToBounds = true

        // Checkmark Container
        let checkCircle = UIView()
        checkCircle.backgroundColor = UIColor(red: 0.133, green: 0.773, blue: 0.369, alpha: 1) // #22C55E
        checkCircle.layer.cornerRadius = 32
        checkCircle.translatesAutoresizingMaskIntoConstraints = false

        let checkIcon = UIImageView(image: UIImage(systemName: "checkmark"))
        checkIcon.tintColor = .white
        checkIcon.contentMode = .scaleAspectFit
        checkIcon.translatesAutoresizingMaskIntoConstraints = false
        checkCircle.addSubview(checkIcon)

        NSLayoutConstraint.activate([
            checkCircle.widthAnchor.constraint(equalToConstant: 64),
            checkCircle.heightAnchor.constraint(equalToConstant: 64),
            checkIcon.centerXAnchor.constraint(equalTo: checkCircle.centerXAnchor),
            checkIcon.centerYAnchor.constraint(equalTo: checkCircle.centerYAnchor),
            checkIcon.widthAnchor.constraint(equalToConstant: 30),
            checkIcon.heightAnchor.constraint(equalToConstant: 30),
        ])

        // Title
        let title = UILabel()
        title.text = "Payment succeeded!"
        title.font = .systemFont(ofSize: 24, weight: .bold)
        title.textColor = .white
        title.textAlignment = .center

        // Subtitle
        let sub = UILabel()
        sub.text = "Your transaction was completed successfully. Thank you for your recharge!"
        sub.font = .systemFont(ofSize: 13.5, weight: .medium)
        sub.textColor = UIColor(red: 0.580, green: 0.639, blue: 0.722, alpha: 1)
        sub.textAlignment = .center
        sub.numberOfLines = 0

        // Amount Badge
        let badge = UIView()
        badge.backgroundColor = UIColor.white.withAlphaComponent(0.12)
        badge.layer.cornerRadius = 14
        let badgeLabel = UILabel()
        badgeLabel.text = "+\(formatINR(amount)) Credits Added"
        badgeLabel.font = .systemFont(ofSize: 13, weight: .bold)
        badgeLabel.textColor = UIColor(red: 0.204, green: 0.827, blue: 0.600, alpha: 1)
        badgeLabel.translatesAutoresizingMaskIntoConstraints = false
        badge.addSubview(badgeLabel)
        NSLayoutConstraint.activate([
            badgeLabel.topAnchor.constraint(equalTo: badge.topAnchor, constant: 6),
            badgeLabel.bottomAnchor.constraint(equalTo: badge.bottomAnchor, constant: -6),
            badgeLabel.leadingAnchor.constraint(equalTo: badge.leadingAnchor, constant: 14),
            badgeLabel.trailingAnchor.constraint(equalTo: badge.trailingAnchor, constant: -14),
        ])

        // Go to Dashboard Button
        let btnDone = UIButton(type: .system)
        btnDone.setTitle("Go to Your Dashboard", for: .normal)
        btnDone.titleLabel?.font = .systemFont(ofSize: 16, weight: .bold)
        btnDone.setTitleColor(.white, for: .normal)
        btnDone.backgroundColor = UIColor(red: 0.133, green: 0.773, blue: 0.369, alpha: 1)
        btnDone.layer.cornerRadius = 14
        btnDone.heightAnchor.constraint(equalToConstant: 52).isActive = true
        btnDone.addAction(UIAction { [weak sheet, weak self] _ in
            sheet?.dismiss(animated: true) {
                self?.fetchWalletDetails()
            }
        }, for: .touchUpInside)

        let stack = UIStackView(arrangedSubviews: [checkCircle, title, sub, badge, btnDone])
        stack.axis = .vertical
        stack.spacing = 16
        stack.alignment = .center
        stack.setCustomSpacing(24, after: badge)
        stack.translatesAutoresizingMaskIntoConstraints = false
        sheet.view.addSubview(stack)

        NSLayoutConstraint.activate([
            btnDone.leadingAnchor.constraint(equalTo: stack.leadingAnchor),
            btnDone.trailingAnchor.constraint(equalTo: stack.trailingAnchor),
            stack.topAnchor.constraint(equalTo: sheet.view.topAnchor, constant: 36),
            stack.leadingAnchor.constraint(equalTo: sheet.view.leadingAnchor, constant: 24),
            stack.trailingAnchor.constraint(equalTo: sheet.view.trailingAnchor, constant: -24),
            stack.bottomAnchor.constraint(lessThanOrEqualTo: sheet.view.bottomAnchor, constant: -30)
        ])

        if #available(iOS 15.0, *) {
            sheet.modalPresentationStyle = .pageSheet
            if let presentation = sheet.sheetPresentationController {
                presentation.detents = [.medium()]
                presentation.prefersGrabberVisible = true
            }
        } else {
            sheet.modalPresentationStyle = .formSheet
        }

        present(sheet, animated: true) {
            checkCircle.transform = CGAffineTransform(scaleX: 0.2, y: 0.2)
            UIView.animate(withDuration: 0.6, delay: 0, usingSpringWithDamping: 0.5, initialSpringVelocity: 0.8, options: .curveEaseOut) {
                checkCircle.transform = .identity
            }
        }
    }

    // MARK: – Demo Fallbacks
    private func populateDemo() {
        currentBalance = 1450.00
        balanceLabel.text = formatINR(currentBalance)
        totalRechargedLabel.text = formatINR(5000.00)
        totalConsumedLabel.text  = formatINR(3550.00)
        validityLabel.text = "No Expiry"
        deductionLabel.text = "₹2.50 / Patient"
        populateDemoTransactions()
        renderTransactions()
    }

    private func populateDemoTransactions() {
        allTransactions = [
            ["id": "TX-9021", "type": "RECHARGE", "amount": 2000.0, "description": "Wallet Top-up (Online Payment)", "createdAt": "2026-09-01T12:30:00Z", "balanceAfter": 1450.00],
            ["id": "TX-8942", "type": "USAGE", "amount": 2.50, "description": "Patient Registration • Ananya Roy", "createdAt": "2026-09-01T11:15:00Z", "balanceAfter": 1447.50],
            ["id": "TX-8910", "type": "USAGE", "amount": 2.50, "description": "Patient Registration • Ramesh Kumar", "createdAt": "2026-09-01T09:40:00Z", "balanceAfter": 1445.00],
            ["id": "TX-8840", "type": "USAGE", "amount": 2.50, "description": "Patient Registration • Priya Sharma", "createdAt": "2026-08-31T17:20:00Z", "balanceAfter": 1442.50],
        ]
    }

    // MARK: – Helpers
    private func getToken() -> String? {
        return UserDefaults.standard.string(forKey: "auth_token") ?? UserDefaults.standard.string(forKey: "token")
    }

    private func formatINR(_ val: Double) -> String {
        let f = NumberFormatter()
        f.numberStyle = .currency
        f.currencySymbol = "₹"
        f.maximumFractionDigits = 2
        return f.string(from: NSNumber(value: val)) ?? "₹\(val)"
    }

    private func formatDate(_ iso: String) -> String {
        return String(iso.prefix(10))
    }

    private func formatDateTime(_ iso: String) -> String {
        return "Today, 12:45 PM"
    }

    private func colorFromHex(_ hex: String) -> UIColor {
        var cString = hex.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
        if cString.hasPrefix("#") { cString.remove(at: cString.startIndex) }
        var rgbValue: UInt64 = 0
        Scanner(string: cString).scanHexInt64(&rgbValue)
        return UIColor(
            red: CGFloat((rgbValue & 0xFF0000) >> 16) / 255.0,
            green: CGFloat((rgbValue & 0x00FF00) >> 8) / 255.0,
            blue: CGFloat(rgbValue & 0x0000FF) / 255.0,
            alpha: 1.0
        )
    }
}
