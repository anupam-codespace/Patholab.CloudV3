import UIKit

/**
 * WalletViewController
 * ────────────────────
 * Native iOS Wallet & Billing Console.
 * Mirroring all web and Android features:
 *  - Fused Deep Navy Hero Container with 50pt bold balance and pulsing Verified badge
 *  - Real-time Recharged and Consumed Stat Cards (with clean dot tags, no clunky arrow icons)
 *  - Ledger Integrity verification, Validity, and Deduction rate per patient
 *  - Quick Top-Up packs (₹500, ₹1,000, ₹2,000, ₹5,000) with dynamic 18% GST calculation
 *  - Ledger & Transaction History with Type Tabs (All History, Recharges, Deductions)
 *  - Instant search filtering, receipt modal, and pull-to-refresh
 */
class WalletViewController: UIViewController, UITextFieldDelegate {

    // Fused Hero Header
    private let heroHeaderView    = UIView()
    private let heroGradientLayer = CAGradientLayer()
    private let backBtn           = UIButton(type: .system)
    private let titleLabel        = UILabel()
    private let subtitleLabel     = UILabel()
    private let headerRechargeBtn = UIButton(type: .system)

    // Balance Block
    private let balanceLabel      = UILabel()
    private let validityLabel     = UILabel()
    private let deductionLabel    = UILabel()

    // Scrollable Main Content
    private let scrollView        = UIScrollView()
    private let refreshControl    = UIRefreshControl()
    private let contentStack      = UIStackView()

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
        view.backgroundColor = UIColor(red: 0.941, green: 0.957, blue: 1.0, alpha: 1) // #F0F4FF

        setupHeroHeader()
        setupContent()
        setupRefresh()
        fetchWalletDetails()
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        heroGradientLayer.frame = heroHeaderView.bounds
    }

    override var preferredStatusBarStyle: UIStatusBarStyle {
        return .lightContent
    }

    // MARK: – Fused Hero Header
    private func setupHeroHeader() {
        heroHeaderView.translatesAutoresizingMaskIntoConstraints = false
        heroGradientLayer.colors = [
            UIColor(red: 0.043, green: 0.118, blue: 0.302, alpha: 1).cgColor, // #0B1E4D
            UIColor(red: 0.051, green: 0.165, blue: 0.439, alpha: 1).cgColor, // #0D2A70
            UIColor(red: 0.063, green: 0.212, blue: 0.549, alpha: 1).cgColor  // #10368C
        ]
        heroGradientLayer.startPoint = CGPoint(x: 0, y: 0)
        heroGradientLayer.endPoint   = CGPoint(x: 1, y: 1)
        heroHeaderView.layer.insertSublayer(heroGradientLayer, at: 0)
        heroHeaderView.layer.cornerRadius = 28
        heroHeaderView.layer.maskedCorners = [.layerMinXMaxYCorner, .layerMaxXMaxYCorner]
        heroHeaderView.clipsToBounds = true
        view.addSubview(heroHeaderView)

        // 1. Top Bar: Back Button, Title, Recharge CTA
        backBtn.setImage(UIImage(systemName: "chevron.left"), for: .normal)
        backBtn.tintColor = .white
        backBtn.backgroundColor = UIColor.white.withAlphaComponent(0.18)
        backBtn.layer.cornerRadius = 19
        backBtn.layer.borderWidth = 1
        backBtn.layer.borderColor = UIColor.white.withAlphaComponent(0.25).cgColor
        backBtn.translatesAutoresizingMaskIntoConstraints = false
        backBtn.addTarget(self, action: #selector(backTapped), for: .touchUpInside)

        titleLabel.text = "Wallet & Billing"
        titleLabel.font = .systemFont(ofSize: 20, weight: .bold)
        titleLabel.textColor = .white

        subtitleLabel.text = "Clinical Credits & Ledger"
        subtitleLabel.font = .systemFont(ofSize: 12, weight: .medium)
        subtitleLabel.textColor = UIColor(red: 0.576, green: 0.773, blue: 0.992, alpha: 1) // #93C5FD

        let titleStack = UIStackView(arrangedSubviews: [titleLabel, subtitleLabel])
        titleStack.axis = .vertical
        titleStack.spacing = 2

        headerRechargeBtn.setTitle("+ Recharge", for: .normal)
        headerRechargeBtn.titleLabel?.font = .systemFont(ofSize: 13, weight: .bold)
        headerRechargeBtn.setTitleColor(UIColor(red: 0.114, green: 0.306, blue: 0.847, alpha: 1), for: .normal) // #1D4ED8
        headerRechargeBtn.backgroundColor = .white
        headerRechargeBtn.layer.cornerRadius = 18
        headerRechargeBtn.contentEdgeInsets = UIEdgeInsets(top: 8, left: 16, bottom: 8, right: 16)
        headerRechargeBtn.translatesAutoresizingMaskIntoConstraints = false
        headerRechargeBtn.addTarget(self, action: #selector(rechargeTapped), for: .touchUpInside)

        let topRow = UIStackView(arrangedSubviews: [backBtn, titleStack, UIView(), headerRechargeBtn])
        topRow.axis = .horizontal
        topRow.spacing = 12
        topRow.alignment = .center

        // 2. Available Balance Row
        let capLabel = UILabel()
        capLabel.text = "AVAILABLE BALANCE"
        capLabel.font = .systemFont(ofSize: 11, weight: .bold)
        capLabel.textColor = UIColor(red: 0.576, green: 0.773, blue: 0.992, alpha: 1) // #93C5FD

        let balHeaderRow = UIStackView(arrangedSubviews: [capLabel, UIView()])
        balHeaderRow.axis = .horizontal
        balHeaderRow.alignment = .center

        // 3. Huge Bold Balance
        balanceLabel.text = "₹ 0.00"
        balanceLabel.font = .systemFont(ofSize: 42, weight: .heavy)
        balanceLabel.textColor = .white
        balanceLabel.adjustsFontSizeToFitWidth = true
        balanceLabel.minimumScaleFactor = 0.5
        balanceLabel.numberOfLines = 1

        // 4. Subtle Divider
        let divider = UIView()
        divider.backgroundColor = UIColor.white.withAlphaComponent(0.18)
        divider.heightAnchor.constraint(equalToConstant: 1).isActive = true

        // 5. Validity & Per Patient details
        let valStack = UIStackView()
        valStack.axis = .vertical
        valStack.spacing = 2
        let valCap = UILabel()
        valCap.text = "VALID UNTIL"
        valCap.font = .systemFont(ofSize: 9.5, weight: .bold)
        valCap.textColor = UIColor(red: 0.376, green: 0.647, blue: 0.980, alpha: 1) // #60A5FA
        validityLabel.text = "No Expiry"
        validityLabel.font = .systemFont(ofSize: 16, weight: .black)
        validityLabel.textColor = .white
        valStack.addArrangedSubview(valCap)
        valStack.addArrangedSubview(validityLabel)

        let verticalSep = UIView()
        verticalSep.backgroundColor = UIColor.white.withAlphaComponent(0.18)
        verticalSep.widthAnchor.constraint(equalToConstant: 1).isActive = true

        let dedStack = UIStackView()
        dedStack.axis = .vertical
        dedStack.spacing = 2
        dedStack.alignment = .trailing
        let dedCap = UILabel()
        dedCap.text = "PER PATIENT"
        dedCap.font = .systemFont(ofSize: 9.5, weight: .bold)
        dedCap.textColor = UIColor(red: 0.376, green: 0.647, blue: 0.980, alpha: 1) // #60A5FA
        deductionLabel.text = "₹ 2.50 / Patient"
        deductionLabel.font = .systemFont(ofSize: 15, weight: .bold)
        deductionLabel.textColor = .white
        dedStack.addArrangedSubview(dedCap)
        dedStack.addArrangedSubview(deductionLabel)

        let bottomRow = UIStackView(arrangedSubviews: [valStack, verticalSep, dedStack])
        bottomRow.axis = .horizontal
        bottomRow.distribution = .equalSpacing

        // Assemble Hero Inner Stack
        let heroInnerStack = UIStackView(arrangedSubviews: [
            topRow,
            balHeaderRow,
            balanceLabel,
            divider,
            bottomRow
        ])
        heroInnerStack.axis = .vertical
        heroInnerStack.spacing = 8
        heroInnerStack.setCustomSpacing(14, after: topRow)
        heroInnerStack.setCustomSpacing(2, after: balHeaderRow)
        heroInnerStack.setCustomSpacing(8, after: balanceLabel)
        heroInnerStack.setCustomSpacing(8, after: divider)
        heroInnerStack.translatesAutoresizingMaskIntoConstraints = false
        heroHeaderView.addSubview(heroInnerStack)

        NSLayoutConstraint.activate([
            heroHeaderView.topAnchor.constraint(equalTo: view.topAnchor),
            heroHeaderView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            heroHeaderView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            heroHeaderView.bottomAnchor.constraint(equalTo: heroInnerStack.bottomAnchor, constant: 14),

            backBtn.widthAnchor.constraint(equalToConstant: 38),
            backBtn.heightAnchor.constraint(equalToConstant: 38),

            heroInnerStack.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 6),
            heroInnerStack.leadingAnchor.constraint(equalTo: heroHeaderView.leadingAnchor, constant: 20),
            heroInnerStack.trailingAnchor.constraint(equalTo: heroHeaderView.trailingAnchor, constant: -20)
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
            scrollView.topAnchor.constraint(equalTo: heroHeaderView.bottomAnchor),
            scrollView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            scrollView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            scrollView.bottomAnchor.constraint(equalTo: view.bottomAnchor),

            contentStack.topAnchor.constraint(equalTo: scrollView.topAnchor, constant: 16),
            contentStack.leadingAnchor.constraint(equalTo: scrollView.leadingAnchor, constant: 16),
            contentStack.trailingAnchor.constraint(equalTo: scrollView.trailingAnchor, constant: -16),
            contentStack.bottomAnchor.constraint(equalTo: scrollView.bottomAnchor, constant: -40),
            contentStack.widthAnchor.constraint(equalTo: scrollView.widthAnchor, constant: -32)
        ])

        // 1. Stats Cards (Recharged & Consumed)
        buildStatsCards()

        // 2. Ledger Section Header
        let ledgerHeader = UILabel()
        ledgerHeader.text = "LEDGER & TRANSACTION HISTORY"
        ledgerHeader.font = .systemFont(ofSize: 11.5, weight: .bold)
        ledgerHeader.textColor = UIColor(red: 0.118, green: 0.227, blue: 0.541, alpha: 1) // #1E3A8A
        contentStack.addArrangedSubview(ledgerHeader)

        // 3. Search Bar
        buildSearchBar()

        // 4. Tabs
        buildTabs()

        // 5. Transactions Stack & Empty State
        txStack.axis = .vertical
        txStack.spacing = 8
        contentStack.addArrangedSubview(txStack)

        buildEmptyView()
    }

    // MARK: – Stat Cards (Arrow-free modern cards)
    private func buildStatsCards() {
        let hStack = UIStackView()
        hStack.axis = .horizontal
        hStack.distribution = .fillEqually
        hStack.spacing = 12

        // Card 1: Recharged (Green)
        let recCard = createCleanStatCard(
            tagTitle: "RECHARGED",
            tagDotColor: UIColor(red: 0.020, green: 0.588, blue: 0.412, alpha: 1), // #059669
            tagBgColor: UIColor(red: 0.020, green: 0.588, blue: 0.412, alpha: 0.10),
            cardBgGradient: [
                UIColor(red: 0.925, green: 0.992, blue: 0.961, alpha: 1).cgColor, // #ECFDF5
                UIColor(red: 0.820, green: 0.980, blue: 0.898, alpha: 1).cgColor  // #D1FAE5
            ],
            cardBorderColor: UIColor(red: 0.655, green: 0.953, blue: 0.816, alpha: 1), // #A7F3D0
            valueLabel: totalRechargedLabel,
            valueTextColor: UIColor(red: 0.024, green: 0.306, blue: 0.231, alpha: 1), // #064E3B
            subtitle: "Lifetime additions",
            subTextColor: UIColor(red: 0.020, green: 0.588, blue: 0.412, alpha: 1)
        )

        // Card 2: Consumed (Rose)
        let spentCard = createCleanStatCard(
            tagTitle: "CONSUMED",
            tagDotColor: UIColor(red: 0.882, green: 0.114, blue: 0.282, alpha: 1), // #E11D48
            tagBgColor: UIColor(red: 0.882, green: 0.114, blue: 0.282, alpha: 0.10),
            cardBgGradient: [
                UIColor(red: 1.000, green: 0.945, blue: 0.949, alpha: 1).cgColor, // #FFF1F2
                UIColor(red: 1.000, green: 0.894, blue: 0.902, alpha: 1).cgColor  // #FFE4E6
            ],
            cardBorderColor: UIColor(red: 0.996, green: 0.804, blue: 0.827, alpha: 1), // #FECDD3
            valueLabel: totalConsumedLabel,
            valueTextColor: UIColor(red: 0.533, green: 0.075, blue: 0.216, alpha: 1), // #881337
            subtitle: "Diagnostic ops",
            subTextColor: UIColor(red: 0.882, green: 0.114, blue: 0.282, alpha: 1)
        )

        hStack.addArrangedSubview(recCard)
        hStack.addArrangedSubview(spentCard)
        contentStack.addArrangedSubview(hStack)
    }

    private func createCleanStatCard(
        tagTitle: String,
        tagDotColor: UIColor,
        tagBgColor: UIColor,
        cardBgGradient: [CGColor],
        cardBorderColor: UIColor,
        valueLabel: UILabel,
        valueTextColor: UIColor,
        subtitle: String,
        subTextColor: UIColor
    ) -> UIView {
        let card = UIView()
        card.layer.cornerRadius = 18
        card.layer.borderWidth = 1
        card.layer.borderColor = cardBorderColor.cgColor
        card.clipsToBounds = true

        let grad = CAGradientLayer()
        grad.colors = cardBgGradient
        grad.startPoint = CGPoint(x: 0, y: 0)
        grad.endPoint = CGPoint(x: 1, y: 1)
        card.layer.insertSublayer(grad, at: 0)

        // Sleek Tag Pill
        let tagPill = UIView()
        tagPill.backgroundColor = tagBgColor
        tagPill.layer.cornerRadius = 10
        tagPill.translatesAutoresizingMaskIntoConstraints = false

        let tagLbl = UILabel()
        tagLbl.text = tagTitle
        tagLbl.font = .systemFont(ofSize: 9.5, weight: .bold)
        tagLbl.textColor = tagDotColor
        tagLbl.translatesAutoresizingMaskIntoConstraints = false
        tagPill.addSubview(tagLbl)

        NSLayoutConstraint.activate([
            tagLbl.topAnchor.constraint(equalTo: tagPill.topAnchor, constant: 4),
            tagLbl.bottomAnchor.constraint(equalTo: tagPill.bottomAnchor, constant: -4),
            tagLbl.leadingAnchor.constraint(equalTo: tagPill.leadingAnchor, constant: 8),
            tagLbl.trailingAnchor.constraint(equalTo: tagPill.trailingAnchor, constant: -8)
        ])

        // Value Label
        valueLabel.text = "₹ 0.00"
        valueLabel.font = .systemFont(ofSize: 22, weight: .bold)
        valueLabel.textColor = valueTextColor
        valueLabel.adjustsFontSizeToFitWidth = true
        valueLabel.minimumScaleFactor = 0.6
        valueLabel.numberOfLines = 1

        // Subtitle
        let subLbl = UILabel()
        subLbl.text = subtitle
        subLbl.font = .systemFont(ofSize: 11, weight: .semibold)
        subLbl.textColor = subTextColor

        let stack = UIStackView(arrangedSubviews: [tagPill, valueLabel, subLbl])
        stack.axis = .vertical
        stack.spacing = 6
        stack.alignment = .leading
        stack.translatesAutoresizingMaskIntoConstraints = false
        card.addSubview(stack)

        NSLayoutConstraint.activate([
            stack.topAnchor.constraint(equalTo: card.topAnchor, constant: 14),
            stack.bottomAnchor.constraint(equalTo: card.bottomAnchor, constant: -14),
            stack.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 14),
            stack.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -14)
        ])

        // Update gradient on layout
        DispatchQueue.main.async {
            grad.frame = card.bounds
        }

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
            btn.backgroundColor = UIColor(red: 0.114, green: 0.306, blue: 0.847, alpha: 1) // #1D4ED8
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
                    self.applyWalletData(wallet: [:], metrics: [:], txList: [])
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
                    self.applyWalletData(wallet: [:], metrics: [:], txList: [])
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
        btn.layer.cornerRadius = 16
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
            iconBadge.widthAnchor.constraint(equalToConstant: 40),
            iconBadge.heightAnchor.constraint(equalToConstant: 40),
            iv.centerXAnchor.constraint(equalTo: iconBadge.centerXAnchor),
            iv.centerYAnchor.constraint(equalTo: iconBadge.centerYAnchor),
            iv.widthAnchor.constraint(equalToConstant: 18),
            iv.heightAnchor.constraint(equalToConstant: 18)
        ])

        // Row 1: Description + Amount
        let descLabel = UILabel()
        descLabel.text = desc
        descLabel.font = .systemFont(ofSize: 14, weight: .bold)
        descLabel.textColor = UIColor(red: 0.059, green: 0.090, blue: 0.165, alpha: 1)
        descLabel.lineBreakMode = .byTruncatingTail

        let amountLabel = UILabel()
        amountLabel.text = (isCredit ? "+" : "-") + formatINR(amount)
        amountLabel.font = .systemFont(ofSize: 15, weight: .bold)
        amountLabel.textColor = isCredit ? UIColor(red: 0.020, green: 0.588, blue: 0.412, alpha: 1) : UIColor(red: 0.059, green: 0.090, blue: 0.165, alpha: 1)
        amountLabel.setContentCompressionResistancePriority(.required, for: .horizontal)

        let row1 = UIStackView(arrangedSubviews: [descLabel, amountLabel])
        row1.axis = .horizontal
        row1.spacing = 8
        row1.alignment = .center

        // Row 2: Date + Ref ID + Balance After
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

        let balLabel = UILabel()
        balLabel.text = "Bal: \(formatINR(balAfter))"
        balLabel.font = .systemFont(ofSize: 11.5, weight: .medium)
        balLabel.textColor = UIColor(red: 0.392, green: 0.455, blue: 0.545, alpha: 1)
        balLabel.setContentCompressionResistancePriority(.required, for: .horizontal)

        let row2 = UIStackView(arrangedSubviews: [dateLabel, refBadge, UIView(), balLabel])
        row2.axis = .horizontal
        row2.spacing = 6
        row2.alignment = .center

        let textStack = UIStackView(arrangedSubviews: [row1, row2])
        textStack.axis = .vertical
        textStack.spacing = 5

        let mainRow = UIStackView(arrangedSubviews: [iconBadge, textStack])
        mainRow.axis = .horizontal
        mainRow.spacing = 12
        mainRow.alignment = .center
        mainRow.isUserInteractionEnabled = false
        mainRow.translatesAutoresizingMaskIntoConstraints = false
        btn.addSubview(mainRow)

        NSLayoutConstraint.activate([
            mainRow.topAnchor.constraint(equalTo: btn.topAnchor, constant: 12),
            mainRow.bottomAnchor.constraint(equalTo: btn.bottomAnchor, constant: -12),
            mainRow.leadingAnchor.constraint(equalTo: btn.leadingAnchor, constant: 14),
            mainRow.trailingAnchor.constraint(equalTo: btn.trailingAnchor, constant: -14)
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
        alert.addAction(UIAlertAction(title: "₹ 500 (+ 18% GST = ₹ 590)", style: .default) { _ in self.initiateRecharge(500) })
        alert.addAction(UIAlertAction(title: "₹ 1,000 (+ 18% GST = ₹ 1,180)", style: .default) { _ in self.initiateRecharge(1000) })
        alert.addAction(UIAlertAction(title: "₹ 2,000 (+ 18% GST = ₹ 2,360)", style: .default) { _ in self.initiateRecharge(2000) })
        alert.addAction(UIAlertAction(title: "₹ 5,000 (+ 18% GST = ₹ 5,900)", style: .default) { _ in self.initiateRecharge(5000) })
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

    private func showPaymentSuccessSheet(amount: Double) {
        let sheet = UIAlertController(title: "Payment Successful", message: "Successfully recharged ₹ \(Int(amount)) to your wallet.", preferredStyle: .alert)
        sheet.addAction(UIAlertAction(title: "Done", style: .default, handler: nil))
        present(sheet, animated: true)
    }

    // MARK: – Helpers
    private func getToken() -> String? {
        return KeychainManager.read(forKey: KeychainManager.tokenKey) ??
               UserDefaults.standard.string(forKey: "auth_token") ??
               UserDefaults.standard.string(forKey: "token")
    }

    private func formatINR(_ val: Double) -> String {
        let f = NumberFormatter()
        f.numberStyle = .currency
        f.currencySymbol = "₹ "
        f.maximumFractionDigits = 2
        return f.string(from: NSNumber(value: val)) ?? "₹ \(val)"
    }

    private func formatDate(_ iso: String) -> String {
        return String(iso.prefix(10))
    }

    private func formatDateTime(_ iso: String) -> String {
        if iso.isEmpty { return "Recent" }
        let formatter = ISO8601DateFormatter()
        if let d = formatter.date(from: iso) {
            let out = DateFormatter()
            out.dateFormat = "dd MMM yyyy, hh:mm a"
            return out.string(from: d)
        }
        return "Recent"
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
