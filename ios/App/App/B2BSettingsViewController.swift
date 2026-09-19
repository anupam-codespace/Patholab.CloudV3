import UIKit
import WebKit

/**
 * B2BSettingsViewController
 * ─────────────────────────────────────────────────────────────────────────────
 * Dedicated, standalone console for B2B Tier Configuration on iOS.
 * 100% web parity with /workspace/settings/b2b-tiers:
 *  - Master Tiers: STANDARD, BRONZE, SILVER, GOLD, PLATINUM
 *  - Global Pricing Rules: B2B Net Price (₹), Discount Margin (%), Discount Flat (₹)
 *  - Catalog test search & autocomplete to add individual tests (fixed z-index)
 *  - Live calculated pricing badge (B2B Pays: ₹... Save ₹... / ...%)
 *  - Bulk Action: "Add All Catalog Tests"
 *  - Bulk Action: "Clear All" with confirmation
 *  - Real-time two-way sync with /api/workspace/b2b/tiers
 *  - Full cookie & WKWebsiteDataStore auth with dual-host fallback
 *  - Royal Sapphire frosted header design system (#0D6EFD -> #0A58CA -> #1D4ED8)
 */
class B2BSettingsViewController: UIViewController, UITableViewDelegate, UITableViewDataSource, UITextFieldDelegate {

    private static let primaryBaseUrl = "https://app.patholab.cloud"
    private static let fallbackBaseUrl = "https://patholab.cloud"
    private static let tiers = ["STANDARD", "BRONZE", "SILVER", "GOLD", "PLATINUM"]

    // ── Header Views ──
    private let heroHeaderView     = UIView()
    private let heroGradientLayer  = CAGradientLayer()
    private let backBtn            = UIButton(type: .system)
    private let titleLabel         = UILabel()
    private let subtitleLabel      = UILabel()
    private let saveBtn            = UIButton(type: .system)
    private let saveSpinner        = UIActivityIndicatorView(style: .medium)

    // ── Info Callout ──
    private let infoCard           = UIView()

    // ── 5 Tier Tabs Bar ──
    private let tabsScrollView     = UIScrollView()
    private let tabsStackView      = UIStackView()

    // ── Toolbar ──
    private let toolbarCard        = UIView()
    private let searchField        = UITextField()
    private let clearSearchBtn     = UIButton(type: .system)
    private let suggestionsTable   = UITableView()
    private let addAllBtn          = UIButton(type: .system)
    private let clearAllBtn        = UIButton(type: .system)
    private let activeCountLabel   = UILabel()

    // ── Rules TableView & Empty State ──
    private let tableView          = UITableView(frame: .zero, style: .plain)
    private let refreshControl     = UIRefreshControl()
    private let emptyView          = UIView()
    private let emptyTitleLabel    = UILabel()
    private let emptySubLabel      = UILabel()
    private let retryBtn           = UIButton(type: .system)
    private let loadingIndicator   = UIActivityIndicatorView(style: .medium)

    // ── Data Models & State ──
    struct TierRule {
        var id: String?
        var testTemplateId: String
        var testName: String
        var basePrice: Double
        var ruleType: String // "NET_PRICE", "PERCENTAGE", "FIXED"
        var value: Double
    }

    struct CatalogTest {
        var id: String
        var name: String
        var price: Double
    }

    private var activeTier = "GOLD"
    private var tierRulesMap: [String: [TierRule]] = [
        "STANDARD": [],
        "BRONZE": [],
        "SILVER": [],
        "GOLD": [],
        "PLATINUM": []
    ]
    private var allCatalogTests: [CatalogTest] = []
    private var filteredSuggestions: [CatalogTest] = []
    private var activeHost = B2BSettingsViewController.primaryBaseUrl

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 0.973, green: 0.980, blue: 0.988, alpha: 1) // #F8FAFC

        setupHeroHeader()
        setupInfoCard()
        setupTierTabs()
        setupToolbar()
        setupTableView()
        setupEmptyView()

        loadTierSettings()
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        loadTierSettings()
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        heroGradientLayer.frame = heroHeaderView.bounds
    }

    override var preferredStatusBarStyle: UIStatusBarStyle {
        return .lightContent
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  UI SETUP: ROYAL SAPPHIRE HEADER & CONTROLS
    // ─────────────────────────────────────────────────────────────────────────
    private func setupHeroHeader() {
        heroHeaderView.translatesAutoresizingMaskIntoConstraints = false
        heroHeaderView.layer.cornerRadius = 28
        heroHeaderView.layer.maskedCorners = [.layerMinXMaxYCorner, .layerMaxXMaxYCorner]
        heroHeaderView.clipsToBounds = true
        view.addSubview(heroHeaderView)

        heroGradientLayer.colors = [
            UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1).cgColor, // #0D6EFD
            UIColor(red: 0.039, green: 0.345, blue: 0.792, alpha: 1).cgColor, // #0A58CA
            UIColor(red: 0.114, green: 0.306, blue: 0.847, alpha: 1).cgColor  // #1D4ED8
        ]
        heroGradientLayer.startPoint = CGPoint(x: 0, y: 0)
        heroGradientLayer.endPoint   = CGPoint(x: 1, y: 1)
        heroHeaderView.layer.insertSublayer(heroGradientLayer, at: 0)

        // Frosted Glass Back Button
        backBtn.translatesAutoresizingMaskIntoConstraints = false
        backBtn.setImage(UIImage(systemName: "arrow.left"), for: .normal)
        backBtn.tintColor = .white
        backBtn.backgroundColor = UIColor.white.withAlphaComponent(0.18)
        backBtn.layer.cornerRadius = 19
        backBtn.layer.borderWidth = 1
        backBtn.layer.borderColor = UIColor.white.withAlphaComponent(0.30).cgColor
        backBtn.addTarget(self, action: #selector(backTapped), for: .touchUpInside)
        heroHeaderView.addSubview(backBtn)

        titleLabel.translatesAutoresizingMaskIntoConstraints = false
        titleLabel.text = "B2B Tier Settings"
        titleLabel.font = .systemFont(ofSize: 20, weight: .bold)
        titleLabel.textColor = .white
        heroHeaderView.addSubview(titleLabel)

        subtitleLabel.translatesAutoresizingMaskIntoConstraints = false
        subtitleLabel.text = "Master net pricing & enterprise margins"
        subtitleLabel.font = .systemFont(ofSize: 11.5, weight: .medium)
        subtitleLabel.textColor = UIColor(red: 0.780, green: 0.875, blue: 1.0, alpha: 1) // #C7DFFF
        heroHeaderView.addSubview(subtitleLabel)

        // Frosted Save Button
        saveBtn.translatesAutoresizingMaskIntoConstraints = false
        saveBtn.setTitle("Save Tier", for: .normal)
        saveBtn.titleLabel?.font = .systemFont(ofSize: 13, weight: .bold)
        saveBtn.setTitleColor(.white, for: .normal)
        saveBtn.backgroundColor = UIColor.white.withAlphaComponent(0.22)
        saveBtn.layer.cornerRadius = 14
        saveBtn.layer.borderWidth = 1
        saveBtn.layer.borderColor = UIColor.white.withAlphaComponent(0.35).cgColor
        saveBtn.contentEdgeInsets = UIEdgeInsets(top: 8, left: 14, bottom: 8, right: 14)
        saveBtn.addTarget(self, action: #selector(saveTapped), for: .touchUpInside)
        heroHeaderView.addSubview(saveBtn)

        saveSpinner.translatesAutoresizingMaskIntoConstraints = false
        saveSpinner.hidesWhenStopped = true
        saveSpinner.color = .white
        heroHeaderView.addSubview(saveSpinner)

        NSLayoutConstraint.activate([
            heroHeaderView.topAnchor.constraint(equalTo: view.topAnchor),
            heroHeaderView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            heroHeaderView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            heroHeaderView.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 64),

            backBtn.leadingAnchor.constraint(equalTo: heroHeaderView.leadingAnchor, constant: 16),
            backBtn.bottomAnchor.constraint(equalTo: heroHeaderView.bottomAnchor, constant: -14),
            backBtn.widthAnchor.constraint(equalToConstant: 38),
            backBtn.heightAnchor.constraint(equalToConstant: 38),

            saveBtn.trailingAnchor.constraint(equalTo: heroHeaderView.trailingAnchor, constant: -16),
            saveBtn.centerYAnchor.constraint(equalTo: backBtn.centerYAnchor),
            saveBtn.heightAnchor.constraint(equalToConstant: 38),

            saveSpinner.centerXAnchor.constraint(equalTo: saveBtn.centerXAnchor),
            saveSpinner.centerYAnchor.constraint(equalTo: saveBtn.centerYAnchor),

            titleLabel.leadingAnchor.constraint(equalTo: backBtn.trailingAnchor, constant: 12),
            titleLabel.trailingAnchor.constraint(lessThanOrEqualTo: saveBtn.leadingAnchor, constant: -8),
            titleLabel.topAnchor.constraint(equalTo: backBtn.topAnchor, constant: -2),

            subtitleLabel.leadingAnchor.constraint(equalTo: titleLabel.leadingAnchor),
            subtitleLabel.trailingAnchor.constraint(equalTo: titleLabel.trailingAnchor),
            subtitleLabel.topAnchor.constraint(equalTo: titleLabel.bottomAnchor, constant: 2),
        ])
    }

    private func setupInfoCard() {
        infoCard.translatesAutoresizingMaskIntoConstraints = false
        infoCard.backgroundColor = UIColor(red: 0.937, green: 0.949, blue: 1.0, alpha: 1) // indigo soft
        infoCard.layer.cornerRadius = 12
        infoCard.layer.borderWidth = 1
        infoCard.layer.borderColor = UIColor(red: 0.878, green: 0.902, blue: 1.0, alpha: 1).cgColor
        view.addSubview(infoCard)

        let icon = UIImageView(image: UIImage(systemName: "checkmark.shield.fill"))
        icon.translatesAutoresizingMaskIntoConstraints = false
        icon.tintColor = UIColor(red: 0.310, green: 0.275, blue: 0.898, alpha: 1)
        infoCard.addSubview(icon)

        let label = UILabel()
        label.translatesAutoresizingMaskIntoConstraints = false
        label.text = "Tiers apply pricing rules automatically. If a test is not configured here, the agency's default margin applies."
        label.font = .systemFont(ofSize: 11.5, weight: .medium)
        label.textColor = UIColor(red: 0.216, green: 0.188, blue: 0.639, alpha: 1)
        label.numberOfLines = 2
        infoCard.addSubview(label)

        NSLayoutConstraint.activate([
            infoCard.topAnchor.constraint(equalTo: heroHeaderView.bottomAnchor, constant: 12),
            infoCard.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 16),
            infoCard.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -16),

            icon.leadingAnchor.constraint(equalTo: infoCard.leadingAnchor, constant: 12),
            icon.centerYAnchor.constraint(equalTo: infoCard.centerYAnchor),
            icon.widthAnchor.constraint(equalToConstant: 20),
            icon.heightAnchor.constraint(equalToConstant: 20),

            label.leadingAnchor.constraint(equalTo: icon.trailingAnchor, constant: 10),
            label.trailingAnchor.constraint(equalTo: infoCard.trailingAnchor, constant: -12),
            label.topAnchor.constraint(equalTo: infoCard.topAnchor, constant: 10),
            label.bottomAnchor.constraint(equalTo: infoCard.bottomAnchor, constant: -10),
        ])
    }

    private func setupTierTabs() {
        tabsScrollView.translatesAutoresizingMaskIntoConstraints = false
        tabsScrollView.showsHorizontalScrollIndicator = false
        view.addSubview(tabsScrollView)

        tabsStackView.translatesAutoresizingMaskIntoConstraints = false
        tabsStackView.axis = .horizontal
        tabsStackView.spacing = 8
        tabsScrollView.addSubview(tabsStackView)

        NSLayoutConstraint.activate([
            tabsScrollView.topAnchor.constraint(equalTo: infoCard.bottomAnchor, constant: 10),
            tabsScrollView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            tabsScrollView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            tabsScrollView.heightAnchor.constraint(equalToConstant: 44),

            tabsStackView.leadingAnchor.constraint(equalTo: tabsScrollView.leadingAnchor, constant: 16),
            tabsStackView.trailingAnchor.constraint(equalTo: tabsScrollView.trailingAnchor, constant: -16),
            tabsStackView.topAnchor.constraint(equalTo: tabsScrollView.topAnchor),
            tabsStackView.bottomAnchor.constraint(equalTo: tabsScrollView.bottomAnchor),
            tabsStackView.heightAnchor.constraint(equalTo: tabsScrollView.heightAnchor),
        ])

        renderTierTabs()
    }

    private func renderTierTabs() {
        tabsStackView.arrangedSubviews.forEach { $0.removeFromSuperview() }

        for tier in Self.tiers {
            let isSelected = (tier == activeTier)
            let count = tierRulesMap[tier]?.count ?? 0

            let tabBtn = UIButton(type: .system)
            tabBtn.translatesAutoresizingMaskIntoConstraints = false
            let name = tier.capitalized
            tabBtn.setTitle("\(name) (\(count))", for: .normal)
            tabBtn.titleLabel?.font = .systemFont(ofSize: 12.5, weight: isSelected ? .bold : .medium)
            tabBtn.contentEdgeInsets = UIEdgeInsets(top: 6, left: 14, bottom: 6, right: 14)
            tabBtn.layer.cornerRadius = 16

            if isSelected {
                tabBtn.backgroundColor = UIColor(red: 0.937, green: 0.949, blue: 1.0, alpha: 1)
                tabBtn.setTitleColor(UIColor(red: 0.263, green: 0.220, blue: 0.792, alpha: 1), for: .normal)
                tabBtn.layer.borderWidth = 1.5
                tabBtn.layer.borderColor = UIColor(red: 0.310, green: 0.275, blue: 0.898, alpha: 1).cgColor
            } else {
                tabBtn.backgroundColor = .white
                tabBtn.setTitleColor(UIColor(red: 0.392, green: 0.455, blue: 0.545, alpha: 1), for: .normal)
                tabBtn.layer.borderWidth = 1
                tabBtn.layer.borderColor = UIColor(red: 0.886, green: 0.910, blue: 0.941, alpha: 1).cgColor
            }

            tabBtn.tag = Self.tiers.firstIndex(of: tier) ?? 0
            tabBtn.addTarget(self, action: #selector(tabTapped(_:)), for: .touchUpInside)
            tabsStackView.addArrangedSubview(tabBtn)
        }

        saveBtn.setTitle("Save \(activeTier.capitalized)", for: .normal)
    }

    private func setupToolbar() {
        toolbarCard.translatesAutoresizingMaskIntoConstraints = false
        toolbarCard.backgroundColor = .white
        toolbarCard.layer.cornerRadius = 14
        toolbarCard.layer.borderWidth = 1
        toolbarCard.layer.borderColor = UIColor(red: 0.886, green: 0.910, blue: 0.941, alpha: 1).cgColor
        view.addSubview(toolbarCard)

        // Search Field Container
        let searchBox = UIView()
        searchBox.translatesAutoresizingMaskIntoConstraints = false
        searchBox.backgroundColor = UIColor(red: 0.973, green: 0.980, blue: 0.988, alpha: 1)
        searchBox.layer.cornerRadius = 10
        toolbarCard.addSubview(searchBox)

        let sIcon = UIImageView(image: UIImage(systemName: "magnifyingglass"))
        sIcon.translatesAutoresizingMaskIntoConstraints = false
        sIcon.tintColor = UIColor(red: 0.580, green: 0.639, blue: 0.722, alpha: 1)
        searchBox.addSubview(sIcon)

        searchField.translatesAutoresizingMaskIntoConstraints = false
        searchField.placeholder = "Search catalog test to add..."
        searchField.font = .systemFont(ofSize: 13)
        searchField.textColor = UIColor(red: 0.059, green: 0.090, blue: 0.165, alpha: 1)
        searchField.delegate = self
        searchField.addTarget(self, action: #selector(searchChanged), for: .editingChanged)
        searchBox.addSubview(searchField)

        clearSearchBtn.translatesAutoresizingMaskIntoConstraints = false
        clearSearchBtn.setImage(UIImage(systemName: "xmark.circle.fill"), for: .normal)
        clearSearchBtn.tintColor = UIColor(red: 0.580, green: 0.639, blue: 0.722, alpha: 1)
        clearSearchBtn.isHidden = true
        clearSearchBtn.addTarget(self, action: #selector(clearSearchTapped), for: .touchUpInside)
        searchBox.addSubview(clearSearchBtn)

        // Suggestions TableView (Created and layered on top)
        suggestionsTable.translatesAutoresizingMaskIntoConstraints = false
        suggestionsTable.delegate = self
        suggestionsTable.dataSource = self
        suggestionsTable.register(UITableViewCell.self, forCellReuseIdentifier: "SuggestionCell")
        suggestionsTable.layer.cornerRadius = 10
        suggestionsTable.layer.borderWidth = 1
        suggestionsTable.layer.borderColor = UIColor(red: 0.886, green: 0.910, blue: 0.941, alpha: 1).cgColor
        suggestionsTable.backgroundColor = .white
        suggestionsTable.layer.shadowColor = UIColor.black.cgColor
        suggestionsTable.layer.shadowOpacity = 0.1
        suggestionsTable.layer.shadowOffset = CGSize(width: 0, height: 4)
        suggestionsTable.layer.shadowRadius = 8
        suggestionsTable.isHidden = true
        view.addSubview(suggestionsTable)

        // Bottom row buttons
        addAllBtn.translatesAutoresizingMaskIntoConstraints = false
        addAllBtn.setTitle("Add All Catalog Tests", for: .normal)
        addAllBtn.titleLabel?.font = .systemFont(ofSize: 11.5, weight: .bold)
        addAllBtn.setTitleColor(UIColor(red: 0.145, green: 0.388, blue: 0.922, alpha: 1), for: .normal)
        addAllBtn.backgroundColor = UIColor(red: 0.937, green: 0.949, blue: 1.0, alpha: 1)
        addAllBtn.layer.cornerRadius = 8
        addAllBtn.contentEdgeInsets = UIEdgeInsets(top: 6, left: 10, bottom: 6, right: 10)
        addAllBtn.addTarget(self, action: #selector(addAllTapped), for: .touchUpInside)
        toolbarCard.addSubview(addAllBtn)

        clearAllBtn.translatesAutoresizingMaskIntoConstraints = false
        clearAllBtn.setTitle("Clear All", for: .normal)
        clearAllBtn.titleLabel?.font = .systemFont(ofSize: 11.5, weight: .bold)
        clearAllBtn.setTitleColor(UIColor(red: 0.937, green: 0.267, blue: 0.267, alpha: 1), for: .normal)
        clearAllBtn.addTarget(self, action: #selector(clearAllTapped), for: .touchUpInside)
        toolbarCard.addSubview(clearAllBtn)

        activeCountLabel.translatesAutoresizingMaskIntoConstraints = false
        activeCountLabel.font = .systemFont(ofSize: 11.5, weight: .bold)
        activeCountLabel.textColor = UIColor(red: 0.063, green: 0.725, blue: 0.506, alpha: 1)
        activeCountLabel.text = "0 Active Rules"
        toolbarCard.addSubview(activeCountLabel)

        NSLayoutConstraint.activate([
            toolbarCard.topAnchor.constraint(equalTo: tabsScrollView.bottomAnchor, constant: 8),
            toolbarCard.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 16),
            toolbarCard.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -16),

            searchBox.topAnchor.constraint(equalTo: toolbarCard.topAnchor, constant: 10),
            searchBox.leadingAnchor.constraint(equalTo: toolbarCard.leadingAnchor, constant: 10),
            searchBox.trailingAnchor.constraint(equalTo: toolbarCard.trailingAnchor, constant: -10),
            searchBox.heightAnchor.constraint(equalToConstant: 38),

            sIcon.leadingAnchor.constraint(equalTo: searchBox.leadingAnchor, constant: 10),
            sIcon.centerYAnchor.constraint(equalTo: searchBox.centerYAnchor),
            sIcon.widthAnchor.constraint(equalToConstant: 16),
            sIcon.heightAnchor.constraint(equalToConstant: 16),

            clearSearchBtn.trailingAnchor.constraint(equalTo: searchBox.trailingAnchor, constant: -8),
            clearSearchBtn.centerYAnchor.constraint(equalTo: searchBox.centerYAnchor),
            clearSearchBtn.widthAnchor.constraint(equalToConstant: 20),
            clearSearchBtn.heightAnchor.constraint(equalToConstant: 20),

            searchField.leadingAnchor.constraint(equalTo: sIcon.trailingAnchor, constant: 8),
            searchField.trailingAnchor.constraint(equalTo: clearSearchBtn.leadingAnchor, constant: -4),
            searchField.topAnchor.constraint(equalTo: searchBox.topAnchor),
            searchField.bottomAnchor.constraint(equalTo: searchBox.bottomAnchor),

            addAllBtn.leadingAnchor.constraint(equalTo: toolbarCard.leadingAnchor, constant: 10),
            addAllBtn.topAnchor.constraint(equalTo: searchBox.bottomAnchor, constant: 10),
            addAllBtn.bottomAnchor.constraint(equalTo: toolbarCard.bottomAnchor, constant: -10),

            clearAllBtn.leadingAnchor.constraint(equalTo: addAllBtn.trailingAnchor, constant: 10),
            clearAllBtn.centerYAnchor.constraint(equalTo: addAllBtn.centerYAnchor),

            activeCountLabel.trailingAnchor.constraint(equalTo: toolbarCard.trailingAnchor, constant: -12),
            activeCountLabel.centerYAnchor.constraint(equalTo: addAllBtn.centerYAnchor),

            suggestionsTable.topAnchor.constraint(equalTo: toolbarCard.topAnchor, constant: 46),
            suggestionsTable.leadingAnchor.constraint(equalTo: toolbarCard.leadingAnchor, constant: 10),
            suggestionsTable.trailingAnchor.constraint(equalTo: toolbarCard.trailingAnchor, constant: -10),
            suggestionsTable.heightAnchor.constraint(equalToConstant: 180),
        ])
    }

    private func setupTableView() {
        tableView.translatesAutoresizingMaskIntoConstraints = false
        tableView.backgroundColor = .clear
        tableView.separatorStyle = .none
        tableView.delegate = self
        tableView.dataSource = self
        tableView.register(TierRuleCell.self, forCellReuseIdentifier: "TierRuleCell")
        tableView.contentInset = UIEdgeInsets(top: 8, left: 0, bottom: 24, right: 0)

        refreshControl.addTarget(self, action: #selector(handleRefresh), for: .valueChanged)
        tableView.refreshControl = refreshControl

        view.addSubview(tableView)

        loadingIndicator.translatesAutoresizingMaskIntoConstraints = false
        loadingIndicator.hidesWhenStopped = true
        view.addSubview(loadingIndicator)

        NSLayoutConstraint.activate([
            tableView.topAnchor.constraint(equalTo: toolbarCard.bottomAnchor, constant: 8),
            tableView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            tableView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            tableView.bottomAnchor.constraint(equalTo: view.bottomAnchor),

            loadingIndicator.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            loadingIndicator.centerYAnchor.constraint(equalTo: view.centerYAnchor),
        ])
    }

    private func setupEmptyView() {
        emptyView.translatesAutoresizingMaskIntoConstraints = false
        emptyView.isHidden = true
        view.addSubview(emptyView)

        let icon = UIImageView(image: UIImage(systemName: "slider.horizontal.3"))
        icon.translatesAutoresizingMaskIntoConstraints = false
        icon.tintColor = UIColor(red: 0.796, green: 0.835, blue: 0.882, alpha: 1)
        emptyView.addSubview(icon)

        emptyTitleLabel.translatesAutoresizingMaskIntoConstraints = false
        emptyTitleLabel.text = "No rules configured"
        emptyTitleLabel.font = .systemFont(ofSize: 16, weight: .bold)
        emptyTitleLabel.textColor = UIColor(red: 0.200, green: 0.255, blue: 0.333, alpha: 1)
        emptyView.addSubview(emptyTitleLabel)

        emptySubLabel.translatesAutoresizingMaskIntoConstraints = false
        emptySubLabel.text = "Search a test above or tap 'Add All Catalog Tests' to create rules for this tier."
        emptySubLabel.font = .systemFont(ofSize: 12.5)
        emptySubLabel.textColor = UIColor(red: 0.580, green: 0.639, blue: 0.722, alpha: 1)
        emptySubLabel.textAlignment = .center
        emptySubLabel.numberOfLines = 2
        emptyView.addSubview(emptySubLabel)

        retryBtn.translatesAutoresizingMaskIntoConstraints = false
        retryBtn.setTitle("Retry Loading", for: .normal)
        retryBtn.titleLabel?.font = .systemFont(ofSize: 13, weight: .bold)
        retryBtn.setTitleColor(.white, for: .normal)
        retryBtn.backgroundColor = UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1)
        retryBtn.layer.cornerRadius = 10
        retryBtn.contentEdgeInsets = UIEdgeInsets(top: 8, left: 16, bottom: 8, right: 16)
        retryBtn.isHidden = true
        retryBtn.addTarget(self, action: #selector(handleRefresh), for: .touchUpInside)
        emptyView.addSubview(retryBtn)

        NSLayoutConstraint.activate([
            emptyView.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            emptyView.centerYAnchor.constraint(equalTo: tableView.centerYAnchor),
            emptyView.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 32),
            emptyView.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -32),

            icon.centerXAnchor.constraint(equalTo: emptyView.centerXAnchor),
            icon.topAnchor.constraint(equalTo: emptyView.topAnchor),
            icon.widthAnchor.constraint(equalToConstant: 48),
            icon.heightAnchor.constraint(equalToConstant: 48),

            emptyTitleLabel.topAnchor.constraint(equalTo: icon.bottomAnchor, constant: 12),
            emptyTitleLabel.centerXAnchor.constraint(equalTo: emptyView.centerXAnchor),

            emptySubLabel.topAnchor.constraint(equalTo: emptyTitleLabel.bottomAnchor, constant: 6),
            emptySubLabel.leadingAnchor.constraint(equalTo: emptyView.leadingAnchor),
            emptySubLabel.trailingAnchor.constraint(equalTo: emptyView.trailingAnchor),

            retryBtn.topAnchor.constraint(equalTo: emptySubLabel.bottomAnchor, constant: 14),
            retryBtn.centerXAnchor.constraint(equalTo: emptyView.centerXAnchor),
            retryBtn.bottomAnchor.constraint(equalTo: emptyView.bottomAnchor),
        ])
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  ACTIONS & HANDLERS
    // ─────────────────────────────────────────────────────────────────────────
    @objc private func backTapped() {
        dismiss(animated: true, completion: nil)
    }

    @objc private func tabTapped(_ sender: UIButton) {
        let index = sender.tag
        if index < Self.tiers.count {
            activeTier = Self.tiers[index]
            renderTierTabs()
            renderRules()
        }
    }

    @objc private func searchChanged() {
        let q = searchField.text?.trimmingCharacters(in: .whitespacesAndNewlines).lowercased() ?? ""
        clearSearchBtn.isHidden = q.isEmpty
        if q.isEmpty {
            filteredSuggestions.removeAll()
            suggestionsTable.isHidden = true
        } else {
            let currentRules = tierRulesMap[activeTier] ?? []
            let addedIds = Set(currentRules.map { $0.testTemplateId })
            filteredSuggestions = allCatalogTests.filter {
                $0.name.lowercased().contains(q) && !addedIds.contains($0.id)
            }
            suggestionsTable.isHidden = filteredSuggestions.isEmpty
            view.bringSubviewToFront(suggestionsTable)
            suggestionsTable.reloadData()
        }
    }

    @objc private func clearSearchTapped() {
        searchField.text = ""
        clearSearchBtn.isHidden = true
        suggestionsTable.isHidden = true
        filteredSuggestions.removeAll()
        suggestionsTable.reloadData()
    }

    @objc private func addAllTapped() {
        if allCatalogTests.isEmpty {
            showToast("No catalog tests available")
            return
        }

        var currentRules = tierRulesMap[activeTier] ?? []
        let existingIds = Set(currentRules.map { $0.testTemplateId })

        var addedCount = 0
        for test in allCatalogTests {
            if !existingIds.contains(test.id) {
                currentRules.append(TierRule(
                    id: nil,
                    testTemplateId: test.id,
                    testName: test.name,
                    basePrice: test.price,
                    ruleType: "NET_PRICE",
                    value: test.price
                ))
                addedCount += 1
            }
        }

        if addedCount == 0 {
            showToast("All catalog tests already added")
            return
        }

        tierRulesMap[activeTier] = currentRules
        renderTierTabs()
        renderRules()
        showToast("Added \(addedCount) tests to \(activeTier.capitalized)")
    }

    @objc private func clearAllTapped() {
        let alert = UIAlertController(
            title: "Clear All \(activeTier.capitalized) Rules?",
            message: "Are you sure you want to remove all pricing rules for this tier?",
            preferredStyle: .alert
        )
        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel))
        alert.addAction(UIAlertAction(title: "Clear All", style: .destructive) { [weak self] _ in
            guard let self = self else { return }
            self.tierRulesMap[self.activeTier] = []
            self.renderTierTabs()
            self.renderRules()
            self.showToast("Rules cleared for \(self.activeTier.capitalized)")
        })
        present(alert, animated: true)
    }

    @objc private func handleRefresh() {
        loadTierSettings()
    }

    @objc private func saveTapped() {
        UIImpactFeedbackGenerator(style: .medium).impactOccurred()
        saveCurrentTierRules()
    }

    private func renderRules() {
        let currentRules = tierRulesMap[activeTier] ?? []
        activeCountLabel.text = "\(currentRules.count) Active Rules"
        emptyView.isHidden = !currentRules.isEmpty
        tableView.isHidden = currentRules.isEmpty
        clearAllBtn.isHidden = currentRules.isEmpty
        retryBtn.isHidden = true
        emptyTitleLabel.text = "No rules configured"
        emptySubLabel.text = "Search a test above or tap 'Add All Catalog Tests' to create rules for this tier."
        tableView.reloadData()
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  TABLEVIEW DATA SOURCE & DELEGATE
    // ─────────────────────────────────────────────────────────────────────────
    func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        if tableView == suggestionsTable {
            return filteredSuggestions.count
        }
        return tierRulesMap[activeTier]?.count ?? 0
    }

    func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        if tableView == suggestionsTable {
            let cell = tableView.dequeueReusableCell(withIdentifier: "SuggestionCell", for: indexPath)
            let test = filteredSuggestions[indexPath.row]
            cell.textLabel?.text = test.name
            cell.textLabel?.font = .systemFont(ofSize: 13, weight: .medium)
            let priceLabel = UILabel()
            priceLabel.text = "₹\(Int(test.price))"
            priceLabel.font = .monospacedSystemFont(ofSize: 12, weight: .bold)
            priceLabel.textColor = UIColor(red: 0.392, green: 0.455, blue: 0.545, alpha: 1)
            priceLabel.sizeToFit()
            cell.accessoryView = priceLabel
            return cell
        }

        guard let cell = tableView.dequeueReusableCell(withIdentifier: "TierRuleCell", for: indexPath) as? TierRuleCell else {
            return UITableViewCell()
        }

        let currentRules = tierRulesMap[activeTier] ?? []
        let rule = currentRules[indexPath.row]

        cell.configure(with: rule, index: indexPath.row) { [weak self] updatedRule, idx in
            guard let self = self else { return }
            if idx < self.tierRulesMap[self.activeTier]?.count ?? 0 {
                self.tierRulesMap[self.activeTier]?[idx] = updatedRule
            }
        } onDelete: { [weak self] idx in
            guard let self = self else { return }
            if idx < self.tierRulesMap[self.activeTier]?.count ?? 0 {
                self.tierRulesMap[self.activeTier]?.remove(at: idx)
                self.renderTierTabs()
                self.renderRules()
            }
        }

        return cell
    }

    func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        tableView.deselectRow(at: indexPath, animated: true)
        if tableView == suggestionsTable {
            let selectedTest = filteredSuggestions[indexPath.row]
            var currentRules = tierRulesMap[activeTier] ?? []
            if currentRules.contains(where: { $0.testTemplateId == selectedTest.id }) {
                showToast("Test already added to this tier")
                return
            }

            currentRules.insert(TierRule(
                id: nil,
                testTemplateId: selectedTest.id,
                testName: selectedTest.name,
                basePrice: selectedTest.price,
                ruleType: "NET_PRICE",
                value: selectedTest.price
            ), at: 0)

            tierRulesMap[activeTier] = currentRules
            clearSearchTapped()
            renderTierTabs()
            renderRules()
            showToast("Added \(selectedTest.name)")
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  NETWORKING & REAL-TIME SYNC
    // ─────────────────────────────────────────────────────────────────────────
    private func getAuthToken() -> String? {
        if let token = KeychainManager.shared.getToken(), !token.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            return token.trimmingCharacters(in: .whitespacesAndNewlines)
        }
        if let token = UserDefaults.standard.string(forKey: "auth_token"), !token.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            return token.trimmingCharacters(in: .whitespacesAndNewlines)
        }
        if let token = UserDefaults.standard.string(forKey: "token"), !token.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            return token.trimmingCharacters(in: .whitespacesAndNewlines)
        }
        if let cookies = HTTPCookieStorage.shared.cookies {
            for cookie in cookies {
                if (cookie.name == "token" || cookie.name == "auth-token" || cookie.name == "auth_token") && !cookie.value.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                    let cookieToken = cookie.value.trimmingCharacters(in: .whitespacesAndNewlines)
                    KeychainManager.save(cookieToken, forKey: KeychainManager.tokenKey)
                    return cookieToken
                }
            }
        }
        return nil
    }

    private func executeWithCookies(url: URL, method: String, body: Data?, host: String, completion: @escaping (Data?, HTTPURLResponse?, Error?) -> Void) {
        let token = getAuthToken()
        let store = WKWebsiteDataStore.default()

        store.httpCookieStore.getAllCookies { cookies in
            var request = URLRequest(url: url, timeoutInterval: 12)
            request.httpMethod = method
            request.setValue("application/json", forHTTPHeaderField: "Accept")
            if body != nil {
                request.setValue("application/json", forHTTPHeaderField: "Content-Type")
                request.httpBody = body
            }

            if let token = token, !token.isEmpty {
                request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            }

            var cookieParts: [String] = []
            if let token = token, !token.isEmpty {
                cookieParts.append("token=\(token)")
                cookieParts.append("auth-token=\(token)")
                cookieParts.append("auth_token=\(token)")
            }
            for c in cookies where c.domain.contains("patholab.cloud") {
                cookieParts.append("\(c.name)=\(c.value)")
            }
            if !cookieParts.isEmpty {
                request.setValue(cookieParts.joined(separator: "; "), forHTTPHeaderField: "Cookie")
            }

            URLSession.shared.dataTask(with: request) { data, response, error in
                let http = response as? HTTPURLResponse
                completion(data, http, error)
            }.resume()
        }
    }

    private func loadTierSettings() {
        if !refreshControl.isRefreshing {
            loadingIndicator.startAnimating()
        }

        guard let url = URL(string: "\(activeHost)/api/workspace/b2b/tiers") else {
            loadingIndicator.stopAnimating()
            refreshControl.endRefreshing()
            return
        }

        executeWithCookies(url: url, method: "GET", body: nil, host: activeHost) { [weak self] data, response, error in
            DispatchQueue.main.async {
                guard let self = self else { return }

                // If primary host returned 404 or connection error, fallback to secondary host once
                if (response == nil || response?.statusCode == 404) && self.activeHost == Self.primaryBaseUrl {
                    self.activeHost = Self.fallbackBaseUrl
                    self.loadTierSettings()
                    return
                }

                self.loadingIndicator.stopAnimating()
                self.refreshControl.endRefreshing()

                if let error = error {
                    self.showErrorState("Network error: \(error.localizedDescription)")
                    return
                }

                guard let response = response, (200...299).contains(response.statusCode),
                      let data = data,
                      let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
                    let code = response?.statusCode ?? 0
                    self.showErrorState("Failed to load tier settings (\(code))")
                    return
                }

                // 1. Catalog Tests
                var loadedCatalog: [CatalogTest] = []
                if let catalog = json["catalog"] as? [[String: Any]] {
                    loadedCatalog = catalog.map {
                        CatalogTest(
                            id: $0["id"] as? String ?? "",
                            name: $0["name"] as? String ?? "Test",
                            price: ($0["price"] as? NSNumber)?.doubleValue ?? 0
                        )
                    }
                }
                self.allCatalogTests = loadedCatalog

                // Fallback: If catalog is empty in /b2b/tiers, fetch from /b2b/agencies
                if self.allCatalogTests.isEmpty, let agUrl = URL(string: "\(self.activeHost)/api/workspace/b2b/agencies") {
                    self.executeWithCookies(url: agUrl, method: "GET", body: nil, host: self.activeHost) { [weak self] agData, _, _ in
                        if let agData = agData,
                           let agJson = try? JSONSerialization.jsonObject(with: agData) as? [String: Any],
                           let cat = agJson["catalog"] as? [[String: Any]] {
                            let fbCatalog = cat.map {
                                CatalogTest(
                                    id: $0["id"] as? String ?? "",
                                    name: $0["name"] as? String ?? "Test",
                                    price: ($0["price"] as? NSNumber)?.doubleValue ?? 0
                                )
                            }
                            DispatchQueue.main.async {
                                self?.allCatalogTests = fbCatalog
                            }
                        }
                    }
                }

                // 2. Grouped Rules
                if let grouped = json["groupedRules"] as? [String: [[String: Any]]] {
                    for tier in Self.tiers {
                        let list = grouped[tier] ?? []
                        self.tierRulesMap[tier] = list.map {
                            TierRule(
                                id: $0["id"] as? String,
                                testTemplateId: $0["testTemplateId"] as? String ?? "",
                                testName: $0["testName"] as? String ?? "Test",
                                basePrice: ($0["basePrice"] as? NSNumber)?.doubleValue ?? 0,
                                ruleType: $0["ruleType"] as? String ?? "NET_PRICE",
                                value: ($0["value"] as? NSNumber)?.doubleValue ?? 0
                            )
                        }
                    }
                }

                self.renderTierTabs()
                self.renderRules()
            }
        }
    }

    private func showErrorState(_ message: String) {
        tableView.isHidden = true
        emptyView.isHidden = false
        emptyTitleLabel.text = "Connection Error"
        emptySubLabel.text = message
        retryBtn.isHidden = false
        showToast(message)
    }

    private func saveCurrentTierRules() {
        saveBtn.isHidden = true
        saveSpinner.startAnimating()

        let currentRules = tierRulesMap[activeTier] ?? []
        let payloadRules = currentRules.map {
            [
                "testTemplateId": $0.testTemplateId,
                "testName": $0.testName,
                "basePrice": $0.basePrice,
                "ruleType": $0.ruleType,
                "value": $0.value
            ]
        }

        let body: [String: Any] = [
            "tier": activeTier,
            "rules": payloadRules
        ]

        guard let url = URL(string: "\(activeHost)/api/workspace/b2b/tiers"),
              let postData = try? JSONSerialization.data(withJSONObject: body) else {
            saveBtn.isHidden = false
            saveSpinner.stopAnimating()
            return
        }

        executeWithCookies(url: url, method: "POST", body: postData, host: activeHost) { [weak self] data, response, error in
            DispatchQueue.main.async {
                guard let self = self else { return }
                self.saveBtn.isHidden = false
                self.saveSpinner.stopAnimating()

                if let http = response, (200...299).contains(http.statusCode) {
                    UINotificationFeedbackGenerator().notificationOccurred(.success)
                    self.showToast("\(self.activeTier.capitalized) tier rules saved!")
                    self.loadTierSettings()
                } else {
                    UINotificationFeedbackGenerator().notificationOccurred(.error)
                    self.showToast("Failed to save rules (\(response?.statusCode ?? 0))")
                }
            }
        }
    }

    private func showToast(_ msg: String) {
        let toast = UILabel()
        toast.text = msg
        toast.font = .systemFont(ofSize: 13, weight: .bold)
        toast.textColor = .white
        toast.backgroundColor = UIColor.black.withAlphaComponent(0.85)
        toast.textAlignment = .center
        toast.layer.cornerRadius = 18
        toast.clipsToBounds = true
        toast.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(toast)

        NSLayoutConstraint.activate([
            toast.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            toast.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -24),
            toast.heightAnchor.constraint(equalToConstant: 36),
            toast.widthAnchor.constraint(lessThanOrEqualTo: view.widthAnchor, constant: -48)
        ])

        UIView.animate(withDuration: 0.3, delay: 2.2, options: .curveEaseOut) {
            toast.alpha = 0
        } completion: { _ in
            toast.removeFromSuperview()
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
//  TIER RULE CUSTOM CELL WITH DYNAMIC PRICE CALCULATION
// ─────────────────────────────────────────────────────────────────────────────
class TierRuleCell: UITableViewCell {

    private let cardView            = UIView()
    private let testNameLabel       = UILabel()
    private let basePriceLabel      = UILabel()
    private let deleteBtn           = UIButton(type: .system)

    private let typeSegment         = UISegmentedControl(items: ["Net Price", "Margin %", "Flat ₹"])
    private let valueField          = UITextField()

    private let effectiveBadgeView  = UIView()
    private let effectivePriceLabel = UILabel()

    private var currentIndex: Int = 0
    private var onUpdate: ((B2BSettingsViewController.TierRule, Int) -> Void)?
    private var onDelete: ((Int) -> Void)?
    private var currentRule: B2BSettingsViewController.TierRule?

    override init(style: UITableViewCell.CellStyle, reuseIdentifier: String?) {
        super.init(style: style, reuseIdentifier: reuseIdentifier)
        backgroundColor = .clear
        selectionStyle = .none
        setupViews()
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    private func setupViews() {
        cardView.translatesAutoresizingMaskIntoConstraints = false
        cardView.backgroundColor = .white
        cardView.layer.cornerRadius = 14
        cardView.layer.borderWidth = 1
        cardView.layer.borderColor = UIColor(red: 0.886, green: 0.910, blue: 0.941, alpha: 1).cgColor
        contentView.addSubview(cardView)

        testNameLabel.translatesAutoresizingMaskIntoConstraints = false
        testNameLabel.font = .systemFont(ofSize: 14, weight: .bold)
        testNameLabel.textColor = UIColor(red: 0.059, green: 0.090, blue: 0.165, alpha: 1)
        cardView.addSubview(testNameLabel)

        basePriceLabel.translatesAutoresizingMaskIntoConstraints = false
        basePriceLabel.font = .monospacedSystemFont(ofSize: 11.5, weight: .medium)
        basePriceLabel.textColor = UIColor(red: 0.392, green: 0.455, blue: 0.545, alpha: 1)
        cardView.addSubview(basePriceLabel)

        deleteBtn.translatesAutoresizingMaskIntoConstraints = false
        deleteBtn.setImage(UIImage(systemName: "trash"), for: .normal)
        deleteBtn.tintColor = UIColor(red: 0.937, green: 0.267, blue: 0.267, alpha: 1)
        deleteBtn.addTarget(self, action: #selector(deleteTapped), for: .touchUpInside)
        cardView.addSubview(deleteBtn)

        let divider = UIView()
        divider.translatesAutoresizingMaskIntoConstraints = false
        divider.backgroundColor = UIColor(red: 0.945, green: 0.961, blue: 0.976, alpha: 1)
        cardView.addSubview(divider)

        typeSegment.translatesAutoresizingMaskIntoConstraints = false
        typeSegment.selectedSegmentTintColor = UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1)
        typeSegment.setTitleTextAttributes([.foregroundColor: UIColor.white, .font: UIFont.systemFont(ofSize: 11, weight: .bold)], for: .selected)
        typeSegment.setTitleTextAttributes([.foregroundColor: UIColor(red: 0.278, green: 0.333, blue: 0.412, alpha: 1), .font: UIFont.systemFont(ofSize: 11, weight: .medium)], for: .normal)
        typeSegment.addTarget(self, action: #selector(typeChanged), for: .valueChanged)
        cardView.addSubview(typeSegment)

        valueField.translatesAutoresizingMaskIntoConstraints = false
        valueField.backgroundColor = UIColor(red: 0.973, green: 0.980, blue: 0.988, alpha: 1)
        valueField.layer.cornerRadius = 8
        valueField.layer.borderWidth = 1
        valueField.layer.borderColor = UIColor(red: 0.886, green: 0.910, blue: 0.941, alpha: 1).cgColor
        valueField.font = .systemFont(ofSize: 13, weight: .bold)
        valueField.textColor = UIColor(red: 0.059, green: 0.090, blue: 0.165, alpha: 1)
        valueField.textAlignment = .center
        valueField.keyboardType = .decimalPad
        valueField.addTarget(self, action: #selector(valueChanged), for: .editingChanged)
        cardView.addSubview(valueField)

        // Effective Price Live Badge
        effectiveBadgeView.translatesAutoresizingMaskIntoConstraints = false
        effectiveBadgeView.backgroundColor = UIColor(red: 0.925, green: 0.992, blue: 0.961, alpha: 1) // emerald soft
        effectiveBadgeView.layer.cornerRadius = 6
        cardView.addSubview(effectiveBadgeView)

        effectivePriceLabel.translatesAutoresizingMaskIntoConstraints = false
        effectivePriceLabel.font = .systemFont(ofSize: 11.5, weight: .bold)
        effectivePriceLabel.textColor = UIColor(red: 0.020, green: 0.588, blue: 0.412, alpha: 1) // #059669
        effectiveBadgeView.addSubview(effectivePriceLabel)

        NSLayoutConstraint.activate([
            cardView.topAnchor.constraint(equalTo: contentView.topAnchor, constant: 4),
            cardView.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 16),
            cardView.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -16),
            cardView.bottomAnchor.constraint(equalTo: contentView.bottomAnchor, constant: -6),

            testNameLabel.topAnchor.constraint(equalTo: cardView.topAnchor, constant: 12),
            testNameLabel.leadingAnchor.constraint(equalTo: cardView.leadingAnchor, constant: 14),
            testNameLabel.trailingAnchor.constraint(lessThanOrEqualTo: deleteBtn.leadingAnchor, constant: -8),

            basePriceLabel.topAnchor.constraint(equalTo: testNameLabel.bottomAnchor, constant: 2),
            basePriceLabel.leadingAnchor.constraint(equalTo: testNameLabel.leadingAnchor),

            deleteBtn.trailingAnchor.constraint(equalTo: cardView.trailingAnchor, constant: -12),
            deleteBtn.topAnchor.constraint(equalTo: cardView.topAnchor, constant: 12),
            deleteBtn.widthAnchor.constraint(equalToConstant: 28),
            deleteBtn.heightAnchor.constraint(equalToConstant: 28),

            divider.topAnchor.constraint(equalTo: basePriceLabel.bottomAnchor, constant: 10),
            divider.leadingAnchor.constraint(equalTo: cardView.leadingAnchor, constant: 14),
            divider.trailingAnchor.constraint(equalTo: cardView.trailingAnchor, constant: -14),
            divider.heightAnchor.constraint(equalToConstant: 1),

            typeSegment.topAnchor.constraint(equalTo: divider.bottomAnchor, constant: 10),
            typeSegment.leadingAnchor.constraint(equalTo: cardView.leadingAnchor, constant: 14),
            typeSegment.heightAnchor.constraint(equalToConstant: 32),

            valueField.leadingAnchor.constraint(equalTo: typeSegment.trailingAnchor, constant: 10),
            valueField.trailingAnchor.constraint(equalTo: cardView.trailingAnchor, constant: -14),
            valueField.centerYAnchor.constraint(equalTo: typeSegment.centerYAnchor),
            valueField.heightAnchor.constraint(equalToConstant: 32),
            valueField.widthAnchor.constraint(equalToConstant: 90),

            effectiveBadgeView.topAnchor.constraint(equalTo: typeSegment.bottomAnchor, constant: 8),
            effectiveBadgeView.leadingAnchor.constraint(equalTo: cardView.leadingAnchor, constant: 14),
            effectiveBadgeView.bottomAnchor.constraint(equalTo: cardView.bottomAnchor, constant: -10),
            effectiveBadgeView.trailingAnchor.constraint(lessThanOrEqualTo: cardView.trailingAnchor, constant: -14),

            effectivePriceLabel.topAnchor.constraint(equalTo: effectiveBadgeView.topAnchor, constant: 4),
            effectivePriceLabel.bottomAnchor.constraint(equalTo: effectiveBadgeView.bottomAnchor, constant: -4),
            effectivePriceLabel.leadingAnchor.constraint(equalTo: effectiveBadgeView.leadingAnchor, constant: 8),
            effectivePriceLabel.trailingAnchor.constraint(equalTo: effectiveBadgeView.trailingAnchor, constant: -8),
        ])
    }

    func configure(with rule: B2BSettingsViewController.TierRule, index: Int, onUpdate: @escaping (B2BSettingsViewController.TierRule, Int) -> Void, onDelete: @escaping (Int) -> Void) {
        self.currentRule = rule
        self.currentIndex = index
        self.onUpdate = onUpdate
        self.onDelete = onDelete

        testNameLabel.text = rule.testName
        basePriceLabel.text = String(format: "Base MRP: ₹%.0f", rule.basePrice)
        valueField.text = String(format: "%.2f", rule.value)

        if rule.ruleType == "PERCENTAGE" {
            typeSegment.selectedSegmentIndex = 1
        } else if rule.ruleType == "FIXED" {
            typeSegment.selectedSegmentIndex = 2
        } else {
            typeSegment.selectedSegmentIndex = 0
        }

        updateEffectivePrice()
    }

    private func updateEffectivePrice() {
        guard let rule = currentRule else { return }
        var effective: Double = 0
        if rule.ruleType == "PERCENTAGE" {
            effective = max(0, rule.basePrice * (1.0 - rule.value / 100.0))
        } else if rule.ruleType == "FIXED" {
            effective = max(0, rule.basePrice - rule.value)
        } else {
            effective = rule.value
        }
        let savings = max(0, rule.basePrice - effective)
        let pct = rule.basePrice > 0 ? (savings / rule.basePrice) * 100.0 : 0
        effectivePriceLabel.text = String(format: "B2B Pays: ₹%.0f (Save ₹%.0f / %.0f%%)", effective, savings, pct)
    }

    @objc private func typeChanged() {
        guard var rule = currentRule else { return }
        switch typeSegment.selectedSegmentIndex {
        case 1: rule.ruleType = "PERCENTAGE"
        case 2: rule.ruleType = "FIXED"
        default: rule.ruleType = "NET_PRICE"
        }
        currentRule = rule
        updateEffectivePrice()
        onUpdate?(rule, currentIndex)
    }

    @objc private func valueChanged() {
        guard var rule = currentRule else { return }
        if let val = Double(valueField.text ?? "") {
            rule.value = val
            currentRule = rule
            updateEffectivePrice()
            onUpdate?(rule, currentIndex)
        }
    }

    @objc private func deleteTapped() {
        onDelete?(currentIndex)
    }
}
