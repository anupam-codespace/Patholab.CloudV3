import UIKit

// ─────────────────────────────────────────────────────────────────────────────
// MARK: – Data Models for Clinical Results
// ─────────────────────────────────────────────────────────────────────────────
struct ResultsParamItem {
    let id: String
    let parameterName: String
    let unit: String?
    let refRangeMin: Double?
    let refRangeMax: Double?
    let refRangeText: String?
    var value: String
}

struct ResultsTestItem {
    let id: String
    let testName: String
    let status: String
    var notes: String
    var impression: String
    var results: [ResultsParamItem]
}

struct ResultsInvoiceItem {
    let invoiceId: String
    let invoiceNumber: String
    let createdAt: String
    let patientName: String
    let patientAge: Int
    let patientGender: String
    let patientPhone: String
    let referredBy: String
    var tests: [ResultsTestItem]
}

// ─────────────────────────────────────────────────────────────────────────────
// MARK: – Native Clinical Results Entry & Workstation View Controller (iOS)
// ─────────────────────────────────────────────────────────────────────────────
class ResultsViewController: UIViewController, UITableViewDataSource, UITableViewDelegate, UITextFieldDelegate, UITextViewDelegate {

    private let baseUrl = "https://app.patholab.cloud"

    // ── Public Parameter for Inter-Module Routing ─────────────────────────────
    var targetInvoiceId: String?

    // ── State ────────────────────────────────────────────────────────────────
    private var activeTab: String = "PENDING" // PENDING, DRAFT, NEEDS_APPROVAL, COMPLETED
    private var allInvoices: [ResultsInvoiceItem] = []
    private var filteredInvoices: [ResultsInvoiceItem] = []
    private var selectedInvoice: ResultsInvoiceItem?

    // Active entry dictionaries
    private var paramValues: [String: String] = [:]
    private var testNotes: [String: String] = [:]
    private var testImpressions: [String: String] = [:]

    // ── UI Elements: Header ───────────────────────────────────────────────────
    private let topHeaderView      = UIView()
    private let backBtn            = UIButton(type: .custom)
    private let titleLbl           = UILabel()
    private let liveBadge          = UILabel()
    private let subLbl             = UILabel()
    private let refreshBtn         = UIButton(type: .custom)

    // ── UI Elements: Status Tabs ──────────────────────────────────────────────
    private let tabScrollView      = UIScrollView()
    private let tabStackView       = UIStackView()
    private var tabButtons: [String: UIButton] = [:]

    // ── UI Elements: Queue ────────────────────────────────────────────────────
    private let queueContainer     = UIView()
    private let searchField        = UITextField()
    private let clearSearchBtn     = UIButton(type: .system)
    private let queueTableView     = UITableView(frame: .zero, style: .plain)
    private let emptyStateView     = UIView()
    private let spinner            = UIActivityIndicatorView(style: .medium)

    // ── UI Elements: Workstation ──────────────────────────────────────────────
    private let workstationContainer = UIView()
    private let backToQueueBtn     = UIButton(type: .system)
    private let patientBannerCard  = UIView()
    private let avatarInitialLbl   = UILabel()
    private let patientNameLbl     = UILabel()
    private let patientMetaLbl     = UILabel()

    private let workstationScroll  = UIScrollView()
    private let testsStackView     = UIStackView()

    private let actionFooter       = UIView()
    private let saveDraftBtn       = UIButton(type: .system)
    private let requestApprovalBtn = UIButton(type: .system)
    private let approveBtn         = UIButton(type: .system)
    private let viewFinalReportBtn = UIButton(type: .system)

    // Dynamic text field references for live flag update
    private var paramFlagLabels: [String: UILabel] = [:]

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 0.973, green: 0.980, blue: 0.988, alpha: 1) // #F8FAFC

        setupHeader()
        setupStatusTabs()
        setupQueueView()
        setupWorkstationView()

        updateTabUI(activeTab)
        fetchWorklist(tab: activeTab)
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        if selectedInvoice == nil {
            fetchWorklist(tab: activeTab)
        }
    }

    override var preferredStatusBarStyle: UIStatusBarStyle {
        return .lightContent
    }

    // ── Top Header Setup ─────────────────────────────────────────────────────
    private func setupHeader() {
        topHeaderView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(topHeaderView)

        let gradient = CAGradientLayer()
        gradient.colors = [
            UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1).cgColor, // Royal Sapphire
            UIColor(red: 0.082, green: 0.380, blue: 0.922, alpha: 1).cgColor  // Sapphire Gradient
        ]
        gradient.startPoint = CGPoint(x: 0, y: 0)
        gradient.endPoint   = CGPoint(x: 1, y: 1)
        gradient.frame      = CGRect(x: 0, y: 0, width: UIScreen.main.bounds.width, height: 160)
        topHeaderView.layer.insertSublayer(gradient, at: 0)

        // Back Button
        backBtn.translatesAutoresizingMaskIntoConstraints = false
        backBtn.backgroundColor = UIColor.white.withAlphaComponent(0.18)
        backBtn.layer.cornerRadius = 20
        backBtn.layer.masksToBounds = true
        let backConfig = UIImage.SymbolConfiguration(pointSize: 15, weight: .bold)
        let backImg = UIImage(systemName: "arrow.backward", withConfiguration: backConfig)?.withRenderingMode(.alwaysTemplate)
        backBtn.setImage(backImg, for: .normal)
        backBtn.tintColor = .white
        backBtn.addTarget(self, action: #selector(didTapBack), for: .touchUpInside)
        topHeaderView.addSubview(backBtn)

        // Title Row
        titleLbl.translatesAutoresizingMaskIntoConstraints = false
        titleLbl.text = "Clinical Results"
        titleLbl.textColor = .white
        titleLbl.font = .systemFont(ofSize: 18.5, weight: .heavy)
        topHeaderView.addSubview(titleLbl)

        liveBadge.translatesAutoresizingMaskIntoConstraints = false
        liveBadge.text = " LIVE DATA "
        liveBadge.textColor = .white
        liveBadge.font = .systemFont(ofSize: 9.5, weight: .black)
        liveBadge.backgroundColor = UIColor(red: 0.114, green: 0.306, blue: 0.847, alpha: 1) // #1D4ED8 Sapphire Dark
        liveBadge.layer.cornerRadius = 6
        liveBadge.layer.masksToBounds = true
        topHeaderView.addSubview(liveBadge)

        subLbl.translatesAutoresizingMaskIntoConstraints = false
        subLbl.text = "Process parameters, add impressions & approve"
        subLbl.textColor = UIColor.white.withAlphaComponent(0.85)
        subLbl.font = .systemFont(ofSize: 11.5, weight: .medium)
        topHeaderView.addSubview(subLbl)

        // Refresh Button
        refreshBtn.translatesAutoresizingMaskIntoConstraints = false
        refreshBtn.backgroundColor = UIColor.white.withAlphaComponent(0.18)
        refreshBtn.layer.cornerRadius = 19
        refreshBtn.layer.masksToBounds = true
        let refConfig = UIImage.SymbolConfiguration(pointSize: 14, weight: .semibold)
        let refImg = UIImage(systemName: "arrow.clockwise", withConfiguration: refConfig)?.withRenderingMode(.alwaysTemplate)
        refreshBtn.setImage(refImg, for: .normal)
        refreshBtn.tintColor = .white
        refreshBtn.addTarget(self, action: #selector(didTapRefresh), for: .touchUpInside)
        topHeaderView.addSubview(refreshBtn)

        NSLayoutConstraint.activate([
            topHeaderView.topAnchor.constraint(equalTo: view.topAnchor),
            topHeaderView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            topHeaderView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            topHeaderView.bottomAnchor.constraint(equalTo: backBtn.bottomAnchor, constant: 14),

            backBtn.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 10),
            backBtn.leadingAnchor.constraint(equalTo: topHeaderView.leadingAnchor, constant: 16),
            backBtn.widthAnchor.constraint(equalToConstant: 40),
            backBtn.heightAnchor.constraint(equalToConstant: 40),

            titleLbl.topAnchor.constraint(equalTo: backBtn.topAnchor, constant: 1),
            titleLbl.leadingAnchor.constraint(equalTo: backBtn.trailingAnchor, constant: 12),

            liveBadge.centerYAnchor.constraint(equalTo: titleLbl.centerYAnchor),
            liveBadge.leadingAnchor.constraint(equalTo: titleLbl.trailingAnchor, constant: 8),
            liveBadge.heightAnchor.constraint(equalToConstant: 18),

            subLbl.topAnchor.constraint(equalTo: titleLbl.bottomAnchor, constant: 3),
            subLbl.leadingAnchor.constraint(equalTo: titleLbl.leadingAnchor),
            subLbl.trailingAnchor.constraint(lessThanOrEqualTo: refreshBtn.leadingAnchor, constant: -8),

            refreshBtn.centerYAnchor.constraint(equalTo: backBtn.centerYAnchor),
            refreshBtn.trailingAnchor.constraint(equalTo: topHeaderView.trailingAnchor, constant: -16),
            refreshBtn.widthAnchor.constraint(equalToConstant: 38),
            refreshBtn.heightAnchor.constraint(equalToConstant: 38)
        ])
    }

    // ── Status Tabs Setup ────────────────────────────────────────────────────
    private func setupStatusTabs() {
        tabScrollView.translatesAutoresizingMaskIntoConstraints = false
        tabScrollView.showsHorizontalScrollIndicator = false
        tabScrollView.backgroundColor = UIColor(red: 0.945, green: 0.961, blue: 0.976, alpha: 1) // #F1F5F9
        view.addSubview(tabScrollView)

        tabStackView.translatesAutoresizingMaskIntoConstraints = false
        tabStackView.axis = .horizontal
        tabStackView.spacing = 8
        tabStackView.alignment = .center
        tabScrollView.addSubview(tabStackView)

        let tabs = [
            ("PENDING", "Pending Entry"),
            ("DRAFT", "Saved Drafts"),
            ("NEEDS_APPROVAL", "Needs Approval"),
            ("COMPLETED", "Completed")
        ]

        for (key, label) in tabs {
            let btn = UIButton(type: .custom)
            btn.translatesAutoresizingMaskIntoConstraints = false
            btn.setTitle("  \(label)  ", for: .normal)
            btn.titleLabel?.font = .systemFont(ofSize: 12.5, weight: .bold)
            btn.layer.cornerRadius = 16
            btn.layer.masksToBounds = true
            btn.tag = tabs.firstIndex(where: { $0.0 == key }) ?? 0
            btn.contentEdgeInsets = UIEdgeInsets(top: 8, left: 12, bottom: 8, right: 12)
            btn.addTarget(self, action: #selector(didSelectTab(_:)), for: .touchUpInside)

            tabButtons[key] = btn
            tabStackView.arrangedSubviews.forEach { _ in }
            tabStackView.addArrangedSubview(btn)
        }

        NSLayoutConstraint.activate([
            tabScrollView.topAnchor.constraint(equalTo: topHeaderView.bottomAnchor),
            tabScrollView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            tabScrollView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            tabScrollView.heightAnchor.constraint(equalToConstant: 52),

            tabStackView.topAnchor.constraint(equalTo: tabScrollView.topAnchor, constant: 8),
            tabStackView.bottomAnchor.constraint(equalTo: tabScrollView.bottomAnchor, constant: -8),
            tabStackView.leadingAnchor.constraint(equalTo: tabScrollView.leadingAnchor, constant: 16),
            tabStackView.trailingAnchor.constraint(equalTo: tabScrollView.trailingAnchor, constant: -16),
            tabStackView.heightAnchor.constraint(equalToConstant: 36)
        ])
    }

    // ── Queue View Setup ─────────────────────────────────────────────────────
    private func setupQueueView() {
        queueContainer.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(queueContainer)

        // Search Bar Card
        let searchCard = UIView()
        searchCard.translatesAutoresizingMaskIntoConstraints = false
        searchCard.backgroundColor = .white
        searchCard.layer.cornerRadius = 14
        searchCard.layer.borderWidth = 1
        searchCard.layer.borderColor = UIColor(red: 0.886, green: 0.910, blue: 0.941, alpha: 1).cgColor
        queueContainer.addSubview(searchCard)

        let searchIcon = UIImageView(image: UIImage(systemName: "magnifyingglass"))
        searchIcon.translatesAutoresizingMaskIntoConstraints = false
        searchIcon.tintColor = UIColor(red: 0.580, green: 0.639, blue: 0.722, alpha: 1)
        searchCard.addSubview(searchIcon)

        searchField.translatesAutoresizingMaskIntoConstraints = false
        searchField.placeholder = "Search Patient Name or SID..."
        searchField.font = .systemFont(ofSize: 13.5, weight: .medium)
        searchField.textColor = UIColor(red: 0.059, green: 0.090, blue: 0.165, alpha: 1)
        searchField.returnKeyType = .search
        searchField.delegate = self
        searchField.addTarget(self, action: #selector(searchTextChanged), for: .editingChanged)
        searchCard.addSubview(searchField)

        clearSearchBtn.translatesAutoresizingMaskIntoConstraints = false
        clearSearchBtn.setImage(UIImage(systemName: "xmark.circle.fill"), for: .normal)
        clearSearchBtn.tintColor = UIColor(red: 0.741, green: 0.776, blue: 0.820, alpha: 1)
        clearSearchBtn.isHidden = true
        clearSearchBtn.addTarget(self, action: #selector(didTapClearSearch), for: .touchUpInside)
        searchCard.addSubview(clearSearchBtn)

        // TableView
        queueTableView.translatesAutoresizingMaskIntoConstraints = false
        queueTableView.backgroundColor = .clear
        queueTableView.separatorStyle = .none
        queueTableView.dataSource = self
        queueTableView.delegate = self
        queueTableView.register(ResultsQueueCell.self, forCellReuseIdentifier: "ResultsQueueCell")
        queueContainer.addSubview(queueTableView)

        // Spinner
        spinner.translatesAutoresizingMaskIntoConstraints = false
        spinner.color = UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1) // Sapphire Blue #0D6EFD
        spinner.hidesWhenStopped = true
        queueContainer.addSubview(spinner)

        // Empty State
        emptyStateView.translatesAutoresizingMaskIntoConstraints = false
        emptyStateView.isHidden = true
        queueContainer.addSubview(emptyStateView)

        let emptyIcon = UIImageView(image: UIImage(systemName: "testtube.2"))
        emptyIcon.translatesAutoresizingMaskIntoConstraints = false
        emptyIcon.tintColor = UIColor(red: 0.796, green: 0.835, blue: 0.882, alpha: 1)
        emptyStateView.addSubview(emptyIcon)

        let emptyTitle = UILabel()
        emptyTitle.translatesAutoresizingMaskIntoConstraints = false
        emptyTitle.text = "Queue is empty!"
        emptyTitle.font = .systemFont(ofSize: 16.5, weight: .bold)
        emptyTitle.textColor = UIColor(red: 0.200, green: 0.255, blue: 0.333, alpha: 1)
        emptyStateView.addSubview(emptyTitle)

        let emptySub = UILabel()
        emptySub.translatesAutoresizingMaskIntoConstraints = false
        emptySub.text = "No clinical tasks currently in this status."
        emptySub.font = .systemFont(ofSize: 13, weight: .regular)
        emptySub.textColor = UIColor(red: 0.392, green: 0.455, blue: 0.545, alpha: 1)
        emptyStateView.addSubview(emptySub)

        NSLayoutConstraint.activate([
            queueContainer.topAnchor.constraint(equalTo: tabScrollView.bottomAnchor),
            queueContainer.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            queueContainer.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            queueContainer.bottomAnchor.constraint(equalTo: view.bottomAnchor),

            searchCard.topAnchor.constraint(equalTo: queueContainer.topAnchor, constant: 10),
            searchCard.leadingAnchor.constraint(equalTo: queueContainer.leadingAnchor, constant: 16),
            searchCard.trailingAnchor.constraint(equalTo: queueContainer.trailingAnchor, constant: -16),
            searchCard.heightAnchor.constraint(equalToConstant: 44),

            searchIcon.leadingAnchor.constraint(equalTo: searchCard.leadingAnchor, constant: 12),
            searchIcon.centerYAnchor.constraint(equalTo: searchCard.centerYAnchor),
            searchIcon.widthAnchor.constraint(equalToConstant: 18),
            searchIcon.heightAnchor.constraint(equalToConstant: 18),

            searchField.leadingAnchor.constraint(equalTo: searchIcon.trailingAnchor, constant: 8),
            searchField.trailingAnchor.constraint(equalTo: clearSearchBtn.leadingAnchor, constant: -6),
            searchField.topAnchor.constraint(equalTo: searchCard.topAnchor),
            searchField.bottomAnchor.constraint(equalTo: searchCard.bottomAnchor),

            clearSearchBtn.trailingAnchor.constraint(equalTo: searchCard.trailingAnchor, constant: -8),
            clearSearchBtn.centerYAnchor.constraint(equalTo: searchCard.centerYAnchor),
            clearSearchBtn.widthAnchor.constraint(equalToConstant: 24),
            clearSearchBtn.heightAnchor.constraint(equalToConstant: 24),

            queueTableView.topAnchor.constraint(equalTo: searchCard.bottomAnchor, constant: 10),
            queueTableView.leadingAnchor.constraint(equalTo: queueContainer.leadingAnchor),
            queueTableView.trailingAnchor.constraint(equalTo: queueContainer.trailingAnchor),
            queueTableView.bottomAnchor.constraint(equalTo: queueContainer.bottomAnchor),

            spinner.centerXAnchor.constraint(equalTo: queueContainer.centerXAnchor),
            spinner.centerYAnchor.constraint(equalTo: queueContainer.centerYAnchor, constant: -40),

            emptyStateView.centerXAnchor.constraint(equalTo: queueContainer.centerXAnchor),
            emptyStateView.centerYAnchor.constraint(equalTo: queueContainer.centerYAnchor, constant: -20),
            emptyIcon.topAnchor.constraint(equalTo: emptyStateView.topAnchor),
            emptyIcon.centerXAnchor.constraint(equalTo: emptyStateView.centerXAnchor),
            emptyIcon.widthAnchor.constraint(equalToConstant: 54),
            emptyIcon.heightAnchor.constraint(equalToConstant: 54),

            emptyTitle.topAnchor.constraint(equalTo: emptyIcon.bottomAnchor, constant: 12),
            emptyTitle.centerXAnchor.constraint(equalTo: emptyStateView.centerXAnchor),

            emptySub.topAnchor.constraint(equalTo: emptyTitle.bottomAnchor, constant: 4),
            emptySub.centerXAnchor.constraint(equalTo: emptyStateView.centerXAnchor),
            emptySub.bottomAnchor.constraint(equalTo: emptyStateView.bottomAnchor)
        ])
    }

    // ── Workstation View Setup ────────────────────────────────────────────────
    private func setupWorkstationView() {
        workstationContainer.translatesAutoresizingMaskIntoConstraints = false
        workstationContainer.isHidden = true
        view.addSubview(workstationContainer)

        // Back to queue strip
        backToQueueBtn.translatesAutoresizingMaskIntoConstraints = false
        backToQueueBtn.setTitle("← Back to Queue", for: .normal)
        backToQueueBtn.setTitleColor(UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1), for: .normal) // #0D6EFD
        backToQueueBtn.titleLabel?.font = .systemFont(ofSize: 13, weight: .bold)
        backToQueueBtn.backgroundColor = UIColor(red: 0.937, green: 0.965, blue: 1.0, alpha: 1) // #EFF6FF
        backToQueueBtn.contentHorizontalAlignment = .leading
        backToQueueBtn.contentEdgeInsets = UIEdgeInsets(top: 0, left: 16, bottom: 0, right: 0)
        backToQueueBtn.addTarget(self, action: #selector(didTapBackToQueue), for: .touchUpInside)
        workstationContainer.addSubview(backToQueueBtn)

        // Patient Banner
        patientBannerCard.translatesAutoresizingMaskIntoConstraints = false
        patientBannerCard.backgroundColor = .white
        workstationContainer.addSubview(patientBannerCard)

        avatarInitialLbl.translatesAutoresizingMaskIntoConstraints = false
        avatarInitialLbl.text = "P"
        avatarInitialLbl.textColor = .white
        avatarInitialLbl.font = .systemFont(ofSize: 18, weight: .bold)
        avatarInitialLbl.textAlignment = .center
        avatarInitialLbl.backgroundColor = UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1) // #0D6EFD
        avatarInitialLbl.layer.cornerRadius = 22
        avatarInitialLbl.layer.masksToBounds = true
        patientBannerCard.addSubview(avatarInitialLbl)

        patientNameLbl.translatesAutoresizingMaskIntoConstraints = false
        patientNameLbl.text = "Patient Name"
        patientNameLbl.textColor = UIColor(red: 0.059, green: 0.090, blue: 0.165, alpha: 1)
        patientNameLbl.font = .systemFont(ofSize: 16.5, weight: .bold)
        patientBannerCard.addSubview(patientNameLbl)

        patientMetaLbl.translatesAutoresizingMaskIntoConstraints = false
        patientMetaLbl.text = "35 Yrs • Male • SID: INV-001"
        patientMetaLbl.textColor = UIColor(red: 0.392, green: 0.455, blue: 0.545, alpha: 1)
        patientMetaLbl.font = .systemFont(ofSize: 12, weight: .medium)
        patientBannerCard.addSubview(patientMetaLbl)

        // ScrollView with test cards
        workstationScroll.translatesAutoresizingMaskIntoConstraints = false
        workstationScroll.alwaysBounceVertical = true
        workstationContainer.addSubview(workstationScroll)

        testsStackView.translatesAutoresizingMaskIntoConstraints = false
        testsStackView.axis = .vertical
        testsStackView.spacing = 16
        workstationScroll.addSubview(testsStackView)

        // Sticky Action Footer
        actionFooter.translatesAutoresizingMaskIntoConstraints = false
        actionFooter.backgroundColor = .white
        actionFooter.layer.shadowColor = UIColor.black.cgColor
        actionFooter.layer.shadowOffset = CGSize(width: 0, height: -2)
        actionFooter.layer.shadowRadius = 4
        actionFooter.layer.shadowOpacity = 0.06
        workstationContainer.addSubview(actionFooter)

        // Footer Action Buttons
        saveDraftBtn.translatesAutoresizingMaskIntoConstraints = false
        saveDraftBtn.setTitle("Save Draft", for: .normal)
        saveDraftBtn.setTitleColor(UIColor(red: 0.200, green: 0.255, blue: 0.333, alpha: 1), for: .normal)
        saveDraftBtn.titleLabel?.font = .systemFont(ofSize: 13, weight: .bold)
        saveDraftBtn.backgroundColor = UIColor(red: 0.945, green: 0.961, blue: 0.976, alpha: 1)
        saveDraftBtn.layer.cornerRadius = 12
        saveDraftBtn.addTarget(self, action: #selector(didTapSaveDraft), for: .touchUpInside)
        actionFooter.addSubview(saveDraftBtn)

        requestApprovalBtn.translatesAutoresizingMaskIntoConstraints = false
        requestApprovalBtn.setTitle("Send to Doc", for: .normal)
        requestApprovalBtn.setTitleColor(UIColor(red: 0.706, green: 0.325, blue: 0.035, alpha: 1), for: .normal)
        requestApprovalBtn.titleLabel?.font = .systemFont(ofSize: 13, weight: .bold)
        requestApprovalBtn.backgroundColor = UIColor(red: 0.996, green: 0.953, blue: 0.780, alpha: 1)
        requestApprovalBtn.layer.cornerRadius = 12
        requestApprovalBtn.addTarget(self, action: #selector(didTapRequestApproval), for: .touchUpInside)
        actionFooter.addSubview(requestApprovalBtn)

        approveBtn.translatesAutoresizingMaskIntoConstraints = false
        approveBtn.setTitle("Approve & Lock", for: .normal)
        approveBtn.setTitleColor(.white, for: .normal)
        approveBtn.titleLabel?.font = .systemFont(ofSize: 13.5, weight: .heavy)
        approveBtn.backgroundColor = UIColor(red: 0.020, green: 0.588, blue: 0.412, alpha: 1) // #059669
        approveBtn.layer.cornerRadius = 12
        approveBtn.addTarget(self, action: #selector(didTapApprove), for: .touchUpInside)
        actionFooter.addSubview(approveBtn)

        viewFinalReportBtn.translatesAutoresizingMaskIntoConstraints = false
        viewFinalReportBtn.setTitle("View Final Report →", for: .normal)
        viewFinalReportBtn.setTitleColor(.white, for: .normal)
        viewFinalReportBtn.titleLabel?.font = .systemFont(ofSize: 14.5, weight: .bold)
        viewFinalReportBtn.backgroundColor = UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1)
        viewFinalReportBtn.layer.cornerRadius = 12
        viewFinalReportBtn.isHidden = true
        viewFinalReportBtn.addTarget(self, action: #selector(didTapViewReport), for: .touchUpInside)
        actionFooter.addSubview(viewFinalReportBtn)

        NSLayoutConstraint.activate([
            workstationContainer.topAnchor.constraint(equalTo: tabScrollView.bottomAnchor),
            workstationContainer.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            workstationContainer.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            workstationContainer.bottomAnchor.constraint(equalTo: view.bottomAnchor),

            backToQueueBtn.topAnchor.constraint(equalTo: workstationContainer.topAnchor),
            backToQueueBtn.leadingAnchor.constraint(equalTo: workstationContainer.leadingAnchor),
            backToQueueBtn.trailingAnchor.constraint(equalTo: workstationContainer.trailingAnchor),
            backToQueueBtn.heightAnchor.constraint(equalToConstant: 40),

            patientBannerCard.topAnchor.constraint(equalTo: backToQueueBtn.bottomAnchor),
            patientBannerCard.leadingAnchor.constraint(equalTo: workstationContainer.leadingAnchor),
            patientBannerCard.trailingAnchor.constraint(equalTo: workstationContainer.trailingAnchor),
            patientBannerCard.heightAnchor.constraint(equalToConstant: 68),

            avatarInitialLbl.leadingAnchor.constraint(equalTo: patientBannerCard.leadingAnchor, constant: 16),
            avatarInitialLbl.centerYAnchor.constraint(equalTo: patientBannerCard.centerYAnchor),
            avatarInitialLbl.widthAnchor.constraint(equalToConstant: 44),
            avatarInitialLbl.heightAnchor.constraint(equalToConstant: 44),

            patientNameLbl.leadingAnchor.constraint(equalTo: avatarInitialLbl.trailingAnchor, constant: 12),
            patientNameLbl.topAnchor.constraint(equalTo: avatarInitialLbl.topAnchor, constant: 2),
            patientNameLbl.trailingAnchor.constraint(equalTo: patientBannerCard.trailingAnchor, constant: -16),

            patientMetaLbl.leadingAnchor.constraint(equalTo: patientNameLbl.leadingAnchor),
            patientMetaLbl.topAnchor.constraint(equalTo: patientNameLbl.bottomAnchor, constant: 2),
            patientMetaLbl.trailingAnchor.constraint(equalTo: patientNameLbl.trailingAnchor),

            actionFooter.leadingAnchor.constraint(equalTo: workstationContainer.leadingAnchor),
            actionFooter.trailingAnchor.constraint(equalTo: workstationContainer.trailingAnchor),
            actionFooter.bottomAnchor.constraint(equalTo: workstationContainer.safeAreaLayoutGuide.bottomAnchor),
            actionFooter.heightAnchor.constraint(equalToConstant: 64),

            saveDraftBtn.leadingAnchor.constraint(equalTo: actionFooter.leadingAnchor, constant: 16),
            saveDraftBtn.centerYAnchor.constraint(equalTo: actionFooter.centerYAnchor),
            saveDraftBtn.heightAnchor.constraint(equalToConstant: 46),

            requestApprovalBtn.leadingAnchor.constraint(equalTo: saveDraftBtn.trailingAnchor, constant: 8),
            requestApprovalBtn.centerYAnchor.constraint(equalTo: actionFooter.centerYAnchor),
            requestApprovalBtn.heightAnchor.constraint(equalToConstant: 46),
            requestApprovalBtn.widthAnchor.constraint(equalTo: saveDraftBtn.widthAnchor, multiplier: 1.1),

            approveBtn.leadingAnchor.constraint(equalTo: requestApprovalBtn.trailingAnchor, constant: 8),
            approveBtn.trailingAnchor.constraint(equalTo: actionFooter.trailingAnchor, constant: -16),
            approveBtn.centerYAnchor.constraint(equalTo: actionFooter.centerYAnchor),
            approveBtn.heightAnchor.constraint(equalToConstant: 46),
            approveBtn.widthAnchor.constraint(equalTo: saveDraftBtn.widthAnchor, multiplier: 1.25),

            viewFinalReportBtn.leadingAnchor.constraint(equalTo: actionFooter.leadingAnchor, constant: 16),
            viewFinalReportBtn.trailingAnchor.constraint(equalTo: actionFooter.trailingAnchor, constant: -16),
            viewFinalReportBtn.centerYAnchor.constraint(equalTo: actionFooter.centerYAnchor),
            viewFinalReportBtn.heightAnchor.constraint(equalToConstant: 46),

            workstationScroll.topAnchor.constraint(equalTo: patientBannerCard.bottomAnchor),
            workstationScroll.leadingAnchor.constraint(equalTo: workstationContainer.leadingAnchor),
            workstationScroll.trailingAnchor.constraint(equalTo: workstationContainer.trailingAnchor),
            workstationScroll.bottomAnchor.constraint(equalTo: actionFooter.topAnchor),

            testsStackView.topAnchor.constraint(equalTo: workstationScroll.topAnchor, constant: 14),
            testsStackView.leadingAnchor.constraint(equalTo: workstationScroll.leadingAnchor, constant: 16),
            testsStackView.trailingAnchor.constraint(equalTo: workstationScroll.trailingAnchor, constant: -16),
            testsStackView.bottomAnchor.constraint(equalTo: workstationScroll.bottomAnchor, constant: -20),
            testsStackView.widthAnchor.constraint(equalTo: workstationScroll.widthAnchor, constant: -32)
        ])
    }

    // ── Tab Switching ────────────────────────────────────────────────────────
    @objc private func didSelectTab(_ sender: UIButton) {
        let tabs = ["PENDING", "DRAFT", "NEEDS_APPROVAL", "COMPLETED"]
        guard sender.tag < tabs.count else { return }
        let newTab = tabs[sender.tag]
        if activeTab == newTab { return }
        activeTab = newTab
        updateTabUI(newTab)
        closeWorkstation()
        fetchWorklist(tab: newTab)
    }

    private func updateTabUI(_ activeKey: String) {
        for (key, btn) in tabButtons {
            let isActive = (key == activeKey)
            if isActive {
                btn.backgroundColor = UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1) // Sapphire Blue #0D6EFD
                btn.setTitleColor(.white, for: .normal)
            } else {
                btn.backgroundColor = UIColor(red: 0.886, green: 0.910, blue: 0.941, alpha: 1) // #E2E8F0
                btn.setTitleColor(UIColor(red: 0.278, green: 0.333, blue: 0.412, alpha: 1), for: .normal) // #475569
            }
        }
    }

    // ── Fetch Worklist ───────────────────────────────────────────────────────
    private func fetchWorklist(tab: String) {
        spinner.startAnimating()
        emptyStateView.isHidden = true

        guard let token = getAuthToken() else {
            spinner.stopAnimating()
            emptyStateView.isHidden = false
            return
        }

        let urlStr = "\(baseUrl)/api/workspace/results?status=\(tab)"
        guard let url = URL(string: urlStr) else { return }

        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue("auth-token=\(token); token=\(token)", forHTTPHeaderField: "Cookie")
        request.timeoutInterval = 15

        URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            guard let self = self else { return }
            DispatchQueue.main.async {
                self.spinner.stopAnimating()
                self.refreshBtn.layer.removeAllAnimations()

                guard let data = data, error == nil,
                      let json = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any],
                      let worklistArr = json["worklist"] as? [[String: Any]] else {
                    self.emptyStateView.isHidden = !self.filteredInvoices.isEmpty
                    return
                }

                var parsedList: [ResultsInvoiceItem] = []
                for invDict in worklistArr {
                    let invoiceId = invDict["invoiceId"] as? String ?? ""
                    let invoiceNumber = invDict["invoiceNumber"] as? String ?? ""
                    let createdAt = invDict["createdAt"] as? String ?? ""
                    let referredBy = invDict["referredBy"] as? String ?? "Self"

                    let pDict = invDict["patient"] as? [String: Any]
                    let patientName = pDict?["name"] as? String ?? "Unknown Patient"
                    let patientAge = pDict?["age"] as? Int ?? 0
                    let patientGender = pDict?["gender"] as? String ?? "U"
                    var patientPhone = pDict?["phone"] as? String ?? ""
                    if patientPhone.lowercased() == "null" { patientPhone = "" }

                    var testsList: [ResultsTestItem] = []
                    if let testsArr = invDict["tests"] as? [[String: Any]] {
                        for tDict in testsArr {
                            let testId = tDict["id"] as? String ?? ""
                            let testName = tDict["testName"] as? String ?? "Test"
                            let status = tDict["status"] as? String ?? "PENDING"
                            let notes = tDict["notes"] as? String ?? ""
                            let impression = tDict["impression"] as? String ?? ""

                            var paramsList: [ResultsParamItem] = []
                            if let paramsArr = tDict["results"] as? [[String: Any]] {
                                for rDict in paramsArr {
                                    let pId = rDict["id"] as? String ?? ""
                                    let pName = rDict["parameterName"] as? String ?? "Parameter"
                                    let unit = rDict["unit"] as? String
                                    let minVal = rDict["refRangeMin"] as? Double
                                    let maxVal = rDict["refRangeMax"] as? Double
                                    let refText = rDict["refRangeText"] as? String
                                    let val = rDict["value"] as? String ?? ""

                                    paramsList.append(ResultsParamItem(
                                        id: pId,
                                        parameterName: pName,
                                        unit: unit,
                                        refRangeMin: minVal,
                                        refRangeMax: maxVal,
                                        refRangeText: refText,
                                        value: val
                                    ))
                                }
                            }

                            testsList.append(ResultsTestItem(
                                id: testId,
                                testName: testName,
                                status: status,
                                notes: notes,
                                impression: impression,
                                results: paramsList
                            ))
                        }
                    }

                    parsedList.append(ResultsInvoiceItem(
                        invoiceId: invoiceId,
                        invoiceNumber: invoiceNumber,
                        createdAt: createdAt,
                        patientName: patientName,
                        patientAge: patientAge,
                        patientGender: patientGender,
                        patientPhone: patientPhone,
                        referredBy: referredBy,
                        tests: testsList
                    ))
                }

                self.allInvoices = parsedList
                self.filterQueue(query: self.searchField.text ?? "")

                // If intent asked for target invoice, auto-open once
                if let targetId = self.targetInvoiceId, !targetId.isEmpty {
                    self.targetInvoiceId = nil
                    if let match = self.allInvoices.first(where: { $0.invoiceId == targetId }) {
                        self.openWorkstation(invoice: match)
                    }
                }
            }
        }.resume()
    }

    private func filterQueue(query: String) {
        let q = query.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        if q.isEmpty {
            filteredInvoices = allInvoices
        } else {
            filteredInvoices = allInvoices.filter {
                $0.patientName.lowercased().contains(q) ||
                $0.invoiceNumber.lowercased().contains(q) ||
                $0.patientPhone.contains(q)
            }
        }
        queueTableView.reloadData()
        emptyStateView.isHidden = !filteredInvoices.isEmpty
    }

    // ── Workstation Management ───────────────────────────────────────────────
    private func openWorkstation(invoice: ResultsInvoiceItem) {
        selectedInvoice = invoice
        paramValues.removeAll()
        testNotes.removeAll()
        testImpressions.removeAll()
        paramFlagLabels.removeAll()

        queueContainer.isHidden = true
        workstationContainer.isHidden = false

        // Header Summary
        let initial = (!invoice.patientName.isEmpty) ? String(invoice.patientName.prefix(1)).uppercased() : "P"
        avatarInitialLbl.text = initial
        patientNameLbl.text = invoice.patientName

        var meta = "\(invoice.patientAge) Yrs • \(invoice.patientGender) • SID: \(invoice.invoiceNumber)"
        if !invoice.patientPhone.isEmpty {
            meta += " • \(invoice.patientPhone)"
        }
        patientMetaLbl.text = meta

        // Build Test Cards
        testsStackView.arrangedSubviews.forEach {
            testsStackView.removeArrangedSubview($0)
            $0.removeFromSuperview()
        }

        let isCompleted = (activeTab == "COMPLETED")

        for test in invoice.tests {
            testNotes[test.id] = test.notes
            testImpressions[test.id] = test.impression

            let testCard = createTestCardView(test: test, isCompleted: isCompleted)
            testsStackView.addArrangedSubview(testCard)
        }

        // Action footer layout
        if isCompleted {
            saveDraftBtn.isHidden = true
            requestApprovalBtn.isHidden = true
            approveBtn.isHidden = true
            viewFinalReportBtn.isHidden = false
        } else {
            saveDraftBtn.isHidden = false
            requestApprovalBtn.isHidden = false
            approveBtn.isHidden = false
            viewFinalReportBtn.isHidden = true
        }
    }

    private func closeWorkstation() {
        selectedInvoice = nil
        workstationContainer.isHidden = true
        queueContainer.isHidden = false
    }

    private func createTestCardView(test: ResultsTestItem, isCompleted: Bool) -> UIView {
        let card = UIView()
        card.backgroundColor = .white
        card.layer.cornerRadius = 14
        card.layer.masksToBounds = true
        card.layer.borderWidth = 1
        card.layer.borderColor = UIColor(red: 0.886, green: 0.910, blue: 0.941, alpha: 1).cgColor

        let stack = UIStackView()
        stack.translatesAutoresizingMaskIntoConstraints = false
        stack.axis = .vertical
        stack.spacing = 0
        card.addSubview(stack)

        // Dark slate top bar
        let topBar = UIView()
        topBar.backgroundColor = UIColor(red: 0.059, green: 0.090, blue: 0.165, alpha: 1) // #0F172A

        let titleLbl = UILabel()
        titleLbl.translatesAutoresizingMaskIntoConstraints = false
        titleLbl.text = test.testName
        titleLbl.textColor = .white
        titleLbl.font = .systemFont(ofSize: 14, weight: .bold)
        topBar.addSubview(titleLbl)

        let statusChip = UILabel()
        statusChip.translatesAutoresizingMaskIntoConstraints = false
        statusChip.text = " \(test.status) "
        statusChip.textColor = UIColor(red: 0.580, green: 0.639, blue: 0.722, alpha: 1)
        statusChip.font = .systemFont(ofSize: 10, weight: .black)
        statusChip.backgroundColor = UIColor(red: 0.118, green: 0.161, blue: 0.231, alpha: 1)
        statusChip.layer.cornerRadius = 6
        statusChip.layer.masksToBounds = true
        topBar.addSubview(statusChip)

        NSLayoutConstraint.activate([
            topBar.heightAnchor.constraint(equalToConstant: 42),
            titleLbl.leadingAnchor.constraint(equalTo: topBar.leadingAnchor, constant: 16),
            titleLbl.centerYAnchor.constraint(equalTo: topBar.centerYAnchor),
            titleLbl.trailingAnchor.constraint(lessThanOrEqualTo: statusChip.leadingAnchor, constant: -8),
            statusChip.trailingAnchor.constraint(equalTo: topBar.trailingAnchor, constant: -16),
            statusChip.centerYAnchor.constraint(equalTo: topBar.centerYAnchor),
            statusChip.heightAnchor.constraint(equalToConstant: 20)
        ])
        stack.addArrangedSubview(topBar)

        // Parameter Rows
        for param in test.results {
            paramValues[param.id] = param.value

            let rowView = UIView()
            rowView.backgroundColor = .white

            let pNameLbl = UILabel()
            pNameLbl.translatesAutoresizingMaskIntoConstraints = false
            pNameLbl.text = param.parameterName
            pNameLbl.textColor = UIColor(red: 0.059, green: 0.090, blue: 0.165, alpha: 1)
            pNameLbl.font = .systemFont(ofSize: 13.5, weight: .bold)
            rowView.addSubview(pNameLbl)

            var refStr = ""
            if let unit = param.unit, !unit.isEmpty { refStr += "\(unit) " }
            if let min = param.refRangeMin, let max = param.refRangeMax {
                refStr += "(\(min) - \(max))"
            } else if let text = param.refRangeText, text != "-" {
                refStr += "(\(text))"
            }
            let pRefLbl = UILabel()
            pRefLbl.translatesAutoresizingMaskIntoConstraints = false
            pRefLbl.text = refStr.trimmingCharacters(in: .whitespaces)
            pRefLbl.textColor = UIColor(red: 0.392, green: 0.455, blue: 0.545, alpha: 1)
            pRefLbl.font = .systemFont(ofSize: 11.5, weight: .semibold)
            rowView.addSubview(pRefLbl)

            let inputField = UITextField()
            inputField.translatesAutoresizingMaskIntoConstraints = false
            inputField.placeholder = "Observed Value"
            inputField.text = param.value
            inputField.font = .systemFont(ofSize: 14, weight: .bold)
            inputField.textColor = UIColor(red: 0.059, green: 0.090, blue: 0.165, alpha: 1)
            inputField.backgroundColor = UIColor(red: 0.973, green: 0.980, blue: 0.988, alpha: 1)
            inputField.layer.cornerRadius = 10
            inputField.layer.borderWidth = 1
            inputField.layer.borderColor = UIColor(red: 0.886, green: 0.910, blue: 0.941, alpha: 1).cgColor
            inputField.leftView = UIView(frame: CGRect(x: 0, y: 0, width: 12, height: 40))
            inputField.leftViewMode = .always
            inputField.isEnabled = !isCompleted
            rowView.addSubview(inputField)

            let flagBadge = UILabel()
            flagBadge.translatesAutoresizingMaskIntoConstraints = false
            flagBadge.font = .systemFont(ofSize: 11, weight: .black)
            flagBadge.layer.cornerRadius = 6
            flagBadge.layer.masksToBounds = true
            flagBadge.textAlignment = .center
            flagBadge.isHidden = true
            rowView.addSubview(flagBadge)
            paramFlagLabels[param.id] = flagBadge

            updateFlagEvaluation(label: flagBadge, value: param.value, min: param.refRangeMin, max: param.refRangeMax)

            // Dynamic evaluation on typing
            let paramId = param.id
            let minRef = param.refRangeMin
            let maxRef = param.refRangeMax
            inputField.addAction(UIAction { [weak self, weak inputField, weak flagBadge] _ in
                guard let text = inputField?.text else { return }
                self?.paramValues[paramId] = text
                if let flag = flagBadge {
                    self?.updateFlagEvaluation(label: flag, value: text, min: minRef, max: maxRef)
                }
            }, for: .editingChanged)

            let divider = UIView()
            divider.translatesAutoresizingMaskIntoConstraints = false
            divider.backgroundColor = UIColor(red: 0.945, green: 0.961, blue: 0.976, alpha: 1)
            rowView.addSubview(divider)

            NSLayoutConstraint.activate([
                rowView.heightAnchor.constraint(equalToConstant: 86),

                pNameLbl.topAnchor.constraint(equalTo: rowView.topAnchor, constant: 10),
                pNameLbl.leadingAnchor.constraint(equalTo: rowView.leadingAnchor, constant: 14),

                pRefLbl.centerYAnchor.constraint(equalTo: pNameLbl.centerYAnchor),
                pRefLbl.trailingAnchor.constraint(equalTo: rowView.trailingAnchor, constant: -14),

                inputField.topAnchor.constraint(equalTo: pNameLbl.bottomAnchor, constant: 8),
                inputField.leadingAnchor.constraint(equalTo: rowView.leadingAnchor, constant: 14),
                inputField.trailingAnchor.constraint(equalTo: flagBadge.leadingAnchor, constant: -10),
                inputField.heightAnchor.constraint(equalToConstant: 40),

                flagBadge.trailingAnchor.constraint(equalTo: rowView.trailingAnchor, constant: -14),
                flagBadge.centerYAnchor.constraint(equalTo: inputField.centerYAnchor),
                flagBadge.heightAnchor.constraint(equalToConstant: 28),
                flagBadge.widthAnchor.constraint(greaterThanOrEqualToConstant: 74),

                divider.leadingAnchor.constraint(equalTo: rowView.leadingAnchor, constant: 14),
                divider.trailingAnchor.constraint(equalTo: rowView.trailingAnchor, constant: -14),
                divider.bottomAnchor.constraint(equalTo: rowView.bottomAnchor),
                divider.heightAnchor.constraint(equalToConstant: 1)
            ])
            stack.addArrangedSubview(rowView)
        }

        // Notes and Clinical Impression Section
        let notesSection = UIView()
        notesSection.backgroundColor = UIColor(red: 0.973, green: 0.980, blue: 0.988, alpha: 1)

        let notesLbl = UILabel()
        notesLbl.translatesAutoresizingMaskIntoConstraints = false
        notesLbl.text = "INTERNAL LAB NOTES"
        notesLbl.font = .systemFont(ofSize: 10.5, weight: .bold)
        notesLbl.textColor = UIColor(red: 0.392, green: 0.455, blue: 0.545, alpha: 1)
        notesSection.addSubview(notesLbl)

        let notesTV = UITextView()
        notesTV.translatesAutoresizingMaskIntoConstraints = false
        notesTV.text = test.notes
        notesTV.font = .systemFont(ofSize: 12.5)
        notesTV.textColor = UIColor(red: 0.059, green: 0.090, blue: 0.165, alpha: 1)
        notesTV.backgroundColor = .white
        notesTV.layer.cornerRadius = 10
        notesTV.layer.borderWidth = 1
        notesTV.layer.borderColor = UIColor(red: 0.886, green: 0.910, blue: 0.941, alpha: 1).cgColor
        notesTV.isEditable = !isCompleted
        notesSection.addSubview(notesTV)

        let impLbl = UILabel()
        impLbl.translatesAutoresizingMaskIntoConstraints = false
        impLbl.text = "DOCTOR'S CLINICAL IMPRESSION"
        impLbl.font = .systemFont(ofSize: 10.5, weight: .bold)
        impLbl.textColor = UIColor(red: 0.392, green: 0.455, blue: 0.545, alpha: 1)
        notesSection.addSubview(impLbl)

        let impTV = UITextView()
        impTV.translatesAutoresizingMaskIntoConstraints = false
        impTV.text = test.impression
        impTV.font = .systemFont(ofSize: 12.5)
        impTV.textColor = UIColor(red: 0.059, green: 0.090, blue: 0.165, alpha: 1)
        impTV.backgroundColor = .white
        impTV.layer.cornerRadius = 10
        impTV.layer.borderWidth = 1
        impTV.layer.borderColor = UIColor(red: 0.886, green: 0.910, blue: 0.941, alpha: 1).cgColor
        impTV.isEditable = !isCompleted
        notesSection.addSubview(impTV)

        let testId = test.id
        NotificationCenter.default.addObserver(forName: UITextView.textDidChangeNotification, object: notesTV, queue: .main) { [weak self] _ in
            self?.testNotes[testId] = notesTV.text
        }
        NotificationCenter.default.addObserver(forName: UITextView.textDidChangeNotification, object: impTV, queue: .main) { [weak self] _ in
            self?.testImpressions[testId] = impTV.text
        }

        NSLayoutConstraint.activate([
            notesLbl.topAnchor.constraint(equalTo: notesSection.topAnchor, constant: 12),
            notesLbl.leadingAnchor.constraint(equalTo: notesSection.leadingAnchor, constant: 14),

            notesTV.topAnchor.constraint(equalTo: notesLbl.bottomAnchor, constant: 6),
            notesTV.leadingAnchor.constraint(equalTo: notesSection.leadingAnchor, constant: 14),
            notesTV.trailingAnchor.constraint(equalTo: notesSection.trailingAnchor, constant: -14),
            notesTV.heightAnchor.constraint(equalToConstant: 54),

            impLbl.topAnchor.constraint(equalTo: notesTV.bottomAnchor, constant: 10),
            impLbl.leadingAnchor.constraint(equalTo: notesSection.leadingAnchor, constant: 14),

            impTV.topAnchor.constraint(equalTo: impLbl.bottomAnchor, constant: 6),
            impTV.leadingAnchor.constraint(equalTo: notesSection.leadingAnchor, constant: 14),
            impTV.trailingAnchor.constraint(equalTo: notesSection.trailingAnchor, constant: -14),
            impTV.heightAnchor.constraint(equalToConstant: 54),
            impTV.bottomAnchor.constraint(equalTo: notesSection.bottomAnchor, constant: -14)
        ])
        stack.addArrangedSubview(notesSection)

        NSLayoutConstraint.activate([
            stack.topAnchor.constraint(equalTo: card.topAnchor),
            stack.leadingAnchor.constraint(equalTo: card.leadingAnchor),
            stack.trailingAnchor.constraint(equalTo: card.trailingAnchor),
            stack.bottomAnchor.constraint(equalTo: card.bottomAnchor)
        ])

        return card
    }

    private func updateFlagEvaluation(label: UILabel, value: String, min: Double?, max: Double?) {
        let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty, let minVal = min, let maxVal = max, let num = Double(trimmed) else {
            label.isHidden = true
            return
        }

        label.isHidden = false
        if num < minVal {
            label.text = " ▼ LOW "
            label.textColor = UIColor(red: 0.114, green: 0.306, blue: 0.847, alpha: 1) // #1D4ED8
            label.backgroundColor = UIColor(red: 0.937, green: 0.965, blue: 1.0, alpha: 1) // #EFF6FF
        } else if num > maxVal {
            label.text = " ▲ HIGH "
            label.textColor = UIColor(red: 0.745, green: 0.071, blue: 0.235, alpha: 1) // #BE123C
            label.backgroundColor = UIColor(red: 1.0, green: 0.945, blue: 0.949, alpha: 1) // #FFF1F2
        } else {
            label.text = " ✓ NORMAL "
            label.textColor = UIColor(red: 0.020, green: 0.588, blue: 0.412, alpha: 1) // #059669
            label.backgroundColor = UIColor(red: 0.925, green: 0.992, blue: 0.961, alpha: 1) // #ECFDF5
        }
    }

    // ── Save Results Mutation ────────────────────────────────────────────────
    @objc private func didTapSaveDraft() {
        executeSaveAction("SAVE_DRAFT")
    }

    @objc private func didTapRequestApproval() {
        executeSaveAction("REQUEST_APPROVAL")
    }

    @objc private func didTapApprove() {
        executeSaveAction("APPROVE")
    }

    private func executeSaveAction(_ action: String) {
        guard let invoice = selectedInvoice, let token = getAuthToken() else { return }

        saveDraftBtn.isEnabled = false
        requestApprovalBtn.isEnabled = false
        approveBtn.isEnabled = false

        let urlStr = "\(baseUrl)/api/workspace/results/\(invoice.invoiceId)/save"
        guard let url = URL(string: urlStr) else { return }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue("auth-token=\(token); token=\(token)", forHTTPHeaderField: "Cookie")
        request.timeoutInterval = 15

        let body: [String: Any] = [
            "invoiceId": invoice.invoiceId,
            "action": action,
            "data": [
                "parameters": paramValues,
                "notes": testNotes,
                "impressions": testImpressions
            ]
        ]

        request.httpBody = try? JSONSerialization.data(withJSONObject: body)

        URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            guard let self = self else { return }
            DispatchQueue.main.async {
                self.saveDraftBtn.isEnabled = true
                self.requestApprovalBtn.isEnabled = true
                self.approveBtn.isEnabled = true

                let httpCode = (response as? HTTPURLResponse)?.statusCode ?? 0
                if httpCode == 200 || httpCode == 201 {
                    var msg = "Draft saved successfully."
                    if action == "REQUEST_APPROVAL" {
                        msg = "Sent to Pathologist for approval!"
                        self.closeWorkstation()
                    } else if action == "APPROVE" {
                        msg = "Results Approved & Report Generated!"
                        self.closeWorkstation()
                    }
                    self.showToast(message: msg)
                    self.fetchWorklist(tab: self.activeTab)
                } else {
                    self.showToast(message: "Save failed (HTTP \(httpCode))")
                }
            }
        }.resume()
    }

    @objc private func didTapViewReport() {
        guard let inv = selectedInvoice else { return }
        let previewVC = ReportPreviewViewController()
        previewVC.patientName = inv.patientName
        previewVC.uhid = inv.invoiceNumber
        previewVC.reportId = inv.invoiceId
        if let nav = navigationController {
            nav.pushViewController(previewVC, animated: true)
        } else {
            present(previewVC, animated: true)
        }
    }

    // ── TableView DataSource & Delegate ──────────────────────────────────────
    func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        return filteredInvoices.count
    }

    func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        guard let cell = tableView.dequeueReusableCell(withIdentifier: "ResultsQueueCell", for: indexPath) as? ResultsQueueCell else {
            return UITableViewCell()
        }
        cell.configure(with: filteredInvoices[indexPath.row])
        return cell
    }

    func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        tableView.deselectRow(at: indexPath, animated: true)
        let invoice = filteredInvoices[indexPath.row]
        openWorkstation(invoice: invoice)
    }

    // ── Search Handling ──────────────────────────────────────────────────────
    @objc private func searchTextChanged() {
        let q = searchField.text ?? ""
        clearSearchBtn.isHidden = q.isEmpty
        filterQueue(query: q)
    }

    @objc private func didTapClearSearch() {
        searchField.text = ""
        clearSearchBtn.isHidden = true
        filterQueue(query: "")
    }

    func textFieldShouldReturn(_ textField: UITextField) -> Bool {
        textField.resignFirstResponder()
        return true
    }

    // ── Navigation & Actions ─────────────────────────────────────────────────
    @objc private func didTapBack() {
        if !workstationContainer.isHidden {
            closeWorkstation()
        } else if let nav = navigationController, nav.viewControllers.count > 1 {
            nav.popViewController(animated: true)
        } else {
            dismiss(animated: true)
        }
    }

    @objc private func didTapBackToQueue() {
        closeWorkstation()
    }

    @objc private func didTapRefresh() {
        let rotateAnimation = CABasicAnimation(keyPath: "transform.rotation")
        rotateAnimation.fromValue = 0.0
        rotateAnimation.toValue = CGFloat.pi * 2
        rotateAnimation.duration = 0.8
        rotateAnimation.repeatCount = .infinity
        refreshBtn.layer.add(rotateAnimation, forKey: "spin")

        fetchWorklist(tab: activeTab)
    }

    private func showToast(message: String) {
        let toast = UILabel()
        toast.text = message
        toast.textColor = .white
        toast.font = .systemFont(ofSize: 13, weight: .bold)
        toast.textAlignment = .center
        toast.backgroundColor = UIColor(red: 0.059, green: 0.090, blue: 0.165, alpha: 0.9)
        toast.layer.cornerRadius = 16
        toast.layer.masksToBounds = true
        toast.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(toast)

        NSLayoutConstraint.activate([
            toast.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            toast.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -70),
            toast.heightAnchor.constraint(equalToConstant: 38),
            toast.widthAnchor.constraint(greaterThanOrEqualToConstant: 160)
        ])

        UIView.animate(withDuration: 0.3, delay: 2.2, options: .curveEaseOut, animations: {
            toast.alpha = 0
        }) { _ in
            toast.removeFromSuperview()
        }
    }

    // ── Token Utility ────────────────────────────────────────────────────────
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
                if cookie.name == "token" || cookie.name == "auth-token" {
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
}

// ─────────────────────────────────────────────────────────────────────────────
// MARK: – Results Queue TableView Cell
// ─────────────────────────────────────────────────────────────────────────────
class ResultsQueueCell: UITableViewCell {

    private let cardView     = UIView()
    private let nameLbl      = UILabel()
    private let dateLbl      = UILabel()
    private let invNumberLbl = UILabel()
    private let metaLbl      = UILabel()
    private let phoneLbl     = UILabel()
    private let badgesStack  = UIStackView()
    private let actionLbl    = UILabel()

    override init(style: UITableViewCell.CellStyle, reuseIdentifier: String?) {
        super.init(style: style, reuseIdentifier: reuseIdentifier)
        backgroundColor = .clear
        selectionStyle = .none

        cardView.translatesAutoresizingMaskIntoConstraints = false
        cardView.backgroundColor = .white
        cardView.layer.cornerRadius = 14
        cardView.layer.borderWidth = 1
        cardView.layer.borderColor = UIColor(red: 0.886, green: 0.910, blue: 0.941, alpha: 1).cgColor
        contentView.addSubview(cardView)

        nameLbl.translatesAutoresizingMaskIntoConstraints = false
        nameLbl.font = .systemFont(ofSize: 15, weight: .bold)
        nameLbl.textColor = UIColor(red: 0.059, green: 0.090, blue: 0.165, alpha: 1)
        cardView.addSubview(nameLbl)

        dateLbl.translatesAutoresizingMaskIntoConstraints = false
        dateLbl.font = .systemFont(ofSize: 10.5, weight: .bold)
        dateLbl.textColor = UIColor(red: 0.278, green: 0.333, blue: 0.412, alpha: 1)
        dateLbl.backgroundColor = UIColor(red: 0.945, green: 0.961, blue: 0.976, alpha: 1)
        dateLbl.layer.cornerRadius = 6
        dateLbl.layer.masksToBounds = true
        dateLbl.textAlignment = .center
        cardView.addSubview(dateLbl)

        invNumberLbl.translatesAutoresizingMaskIntoConstraints = false
        invNumberLbl.font = .monospacedSystemFont(ofSize: 12, weight: .medium)
        invNumberLbl.textColor = UIColor(red: 0.392, green: 0.455, blue: 0.545, alpha: 1)
        cardView.addSubview(invNumberLbl)

        metaLbl.translatesAutoresizingMaskIntoConstraints = false
        metaLbl.font = .systemFont(ofSize: 11, weight: .bold)
        metaLbl.textColor = UIColor(red: 0.278, green: 0.333, blue: 0.412, alpha: 1)
        metaLbl.backgroundColor = UIColor(red: 0.973, green: 0.980, blue: 0.988, alpha: 1)
        metaLbl.layer.cornerRadius = 4
        metaLbl.layer.masksToBounds = true
        cardView.addSubview(metaLbl)

        phoneLbl.translatesAutoresizingMaskIntoConstraints = false
        phoneLbl.font = .systemFont(ofSize: 11.5, weight: .medium)
        phoneLbl.textColor = UIColor(red: 0.392, green: 0.455, blue: 0.545, alpha: 1)
        cardView.addSubview(phoneLbl)

        badgesStack.translatesAutoresizingMaskIntoConstraints = false
        badgesStack.axis = .horizontal
        badgesStack.spacing = 6
        badgesStack.alignment = .center
        cardView.addSubview(badgesStack)

        actionLbl.translatesAutoresizingMaskIntoConstraints = false
        actionLbl.text = "Enter Results →"
        actionLbl.font = .systemFont(ofSize: 12, weight: .bold)
        actionLbl.textColor = UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1) // #0D6EFD
        cardView.addSubview(actionLbl)

        NSLayoutConstraint.activate([
            cardView.topAnchor.constraint(equalTo: contentView.topAnchor, constant: 5),
            cardView.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 16),
            cardView.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -16),
            cardView.bottomAnchor.constraint(equalTo: contentView.bottomAnchor, constant: -5),

            nameLbl.topAnchor.constraint(equalTo: cardView.topAnchor, constant: 12),
            nameLbl.leadingAnchor.constraint(equalTo: cardView.leadingAnchor, constant: 14),
            nameLbl.trailingAnchor.constraint(lessThanOrEqualTo: dateLbl.leadingAnchor, constant: -8),

            dateLbl.centerYAnchor.constraint(equalTo: nameLbl.centerYAnchor),
            dateLbl.trailingAnchor.constraint(equalTo: cardView.trailingAnchor, constant: -14),
            dateLbl.heightAnchor.constraint(equalToConstant: 20),
            dateLbl.widthAnchor.constraint(greaterThanOrEqualToConstant: 80),

            invNumberLbl.topAnchor.constraint(equalTo: nameLbl.bottomAnchor, constant: 4),
            invNumberLbl.leadingAnchor.constraint(equalTo: nameLbl.leadingAnchor),

            metaLbl.centerYAnchor.constraint(equalTo: invNumberLbl.centerYAnchor),
            metaLbl.leadingAnchor.constraint(equalTo: invNumberLbl.trailingAnchor, constant: 8),
            metaLbl.heightAnchor.constraint(equalToConstant: 18),

            phoneLbl.centerYAnchor.constraint(equalTo: invNumberLbl.centerYAnchor),
            phoneLbl.leadingAnchor.constraint(equalTo: metaLbl.trailingAnchor, constant: 6),
            phoneLbl.trailingAnchor.constraint(lessThanOrEqualTo: cardView.trailingAnchor, constant: -14),

            badgesStack.topAnchor.constraint(equalTo: invNumberLbl.bottomAnchor, constant: 10),
            badgesStack.leadingAnchor.constraint(equalTo: cardView.leadingAnchor, constant: 14),
            badgesStack.trailingAnchor.constraint(lessThanOrEqualTo: actionLbl.leadingAnchor, constant: -8),
            badgesStack.bottomAnchor.constraint(equalTo: cardView.bottomAnchor, constant: -12),
            badgesStack.heightAnchor.constraint(equalToConstant: 22),

            actionLbl.trailingAnchor.constraint(equalTo: cardView.trailingAnchor, constant: -14),
            actionLbl.centerYAnchor.constraint(equalTo: badgesStack.centerYAnchor)
        ])
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    func configure(with invoice: ResultsInvoiceItem) {
        nameLbl.text = invoice.patientName
        invNumberLbl.text = invoice.invoiceNumber
        metaLbl.text = " \(invoice.patientAge)Y \(invoice.patientGender) "
        phoneLbl.text = invoice.patientPhone.isEmpty ? "" : "• \(invoice.patientPhone)"

        // Date format
        if let isoDate = ISO8601DateFormatter().date(from: invoice.createdAt) {
            let df = DateFormatter()
            df.dateFormat = "dd MMM, HH:mm"
            dateLbl.text = " \(df.string(from: isoDate)) "
        } else {
            dateLbl.text = " Recent "
        }

        // Badges
        badgesStack.arrangedSubviews.forEach {
            badgesStack.removeArrangedSubview($0)
            $0.removeFromSuperview()
        }

        let maxBadges = 3
        for i in 0..<min(invoice.tests.count, maxBadges) {
            let t = invoice.tests[i]
            let badge = UILabel()
            badge.text = " \(t.testName.prefix(6).uppercased()) "
            badge.font = .systemFont(ofSize: 9.5, weight: .bold)
            badge.textColor = UIColor(red: 0.200, green: 0.255, blue: 0.333, alpha: 1)
            badge.backgroundColor = UIColor(red: 0.945, green: 0.961, blue: 0.976, alpha: 1)
            badge.layer.cornerRadius = 5
            badge.layer.masksToBounds = true
            badgesStack.addArrangedSubview(badge)
        }

        if invoice.tests.count > maxBadges {
            let extra = UILabel()
            extra.text = " +\(invoice.tests.count - maxBadges) "
            extra.font = .systemFont(ofSize: 9.5, weight: .bold)
            extra.textColor = UIColor(red: 0.392, green: 0.455, blue: 0.545, alpha: 1)
            extra.backgroundColor = UIColor(red: 0.886, green: 0.910, blue: 0.941, alpha: 1)
            extra.layer.cornerRadius = 5
            extra.layer.masksToBounds = true
            badgesStack.addArrangedSubview(extra)
        }
    }
}
