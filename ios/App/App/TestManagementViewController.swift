import UIKit

/**
 * TestManagementViewController
 * ────────────────────────────
 * Native iOS Diagnostic Test Management & Clinical Catalog Console.
 * Directly mirroring the exact web workflow and sequence (/workspace/test-management):
 *  1. Tests & Pricing: Search, Scope filtering (Global/Local), Quick Price Overrides, Full 3-Tab Test Editor, and Soft Deletion.
 *  2. Parameters & Reference Ranges: Full 4-Tab Parameter Editor (Core, Biological Ranges, Formulas, Inventory Deductions), Scope Filtering, and Soft Deletion.
 *  3. Specimens & Tubes: Vacuum collection tubes with color-coded caps.
 *  4. Departments: Departmental breakdown with test volumes.
 */
class TestManagementViewController: UIViewController, UITableViewDataSource, UITableViewDelegate, UITextFieldDelegate {

    private let baseUrl = "https://app.patholab.cloud"

    // ── Header Views ────────────────────────────────────────────────────────
    private let headerView       = UIView()
    private let headerGradient   = CAGradientLayer()
    private let backBtn          = UIButton(type: .system)
    private let titleLabel       = UILabel()
    private let subtitleLabel    = UILabel()
    private let addTestBtn       = UIButton(type: .system)
    private let modeSegment      = UISegmentedControl(items: ["Tests & Pricing", "Parameters", "Custom Fields", "Headings", "Containers", "Sample Types", "Departments"])

    // ── Tab Containers ──────────────────────────────────────────────────────
    private let testsContainer        = UIView()
    private let paramsContainer       = UIView()
    private let customFieldsContainer = UIView()
    private let headingsContainer     = UIView()
    private let containersContainer   = UIView()
    private let sampleTypesContainer  = UIView()
    private let deptsContainer        = UIView()

    // ── Tab 1: Tests & Pricing Views ─────────────────────────────────────────
    private let searchField      = UITextField()
    private let scopeSegment     = UISegmentedControl(items: ["All", "Global", "Local"])
    private let testsTableView   = UITableView(frame: .zero, style: .plain)
    private let testsSpinner     = UIActivityIndicatorView(style: .medium)
    private let emptyLabel       = UILabel()

    // ── Tab 2: Parameters Views ──────────────────────────────────────────────
    private let paramSearchField = UITextField()
    private let paramScopeSegment = UISegmentedControl(items: ["All", "Global", "Local"])
    private let paramsTableView  = UITableView(frame: .zero, style: .plain)
    private let paramsSpinner    = UIActivityIndicatorView(style: .medium)
    private let emptyParamsLabel = UILabel()

    // ── Tabs 3 to 7 Tables & Spinners ────────────────────────────────────────
    private let customFieldsTableView = UITableView(frame: .zero, style: .plain)
    private let customFieldsSpinner   = UIActivityIndicatorView(style: .medium)

    private let headingsTableView     = UITableView(frame: .zero, style: .plain)
    private let headingsSpinner       = UIActivityIndicatorView(style: .medium)

    private let containersTableView   = UITableView(frame: .zero, style: .plain)
    private let containersSpinner     = UIActivityIndicatorView(style: .medium)

    private let sampleTypesTableView  = UITableView(frame: .zero, style: .plain)
    private let sampleTypesSpinner    = UIActivityIndicatorView(style: .medium)

    private let deptsTableView        = UITableView(frame: .zero, style: .plain)
    private let deptsSpinner          = UIActivityIndicatorView(style: .medium)

    // ── Data Models ──────────────────────────────────────────────────────────
    struct ParameterComponent {
        var parameterId: String
        var name: String
        var code: String
        var headingId: String?
        var headingName: String?
        var order: Int
    }

    struct TestItem {
        let id: String
        var name: String
        var code: String
        var printName: String
        var deptId: String?
        var deptName: String
        var sampleTypeId: String?
        var sampleType: String
        var containerTypeId: String?
        var containerCode: String
        var tubeCapColor: String
        var method: String
        var paramsCount: Int
        var price: Double
        var b2bPrice: Double
        var cost: Double
        var tat: String
        var isGlobal: Bool
        var isActive: Bool
        var hasOverride: Bool
        var hasAutoReagents: Bool
        var components: [ParameterComponent]
    }

    struct ParameterRange {
        var gender: String = "BOTH" // "MALE", "FEMALE", "BOTH", "CUSTOM"
        var customLabel: String = ""
        var minAge: Int = 0
        var maxAge: Int = 100
        var ageUnit: String = "YEAR" // "YEAR", "MONTH", "DAY"
        var lowValue: Double?
        var highValue: Double?
        var criticalLow: Double?
        var criticalHigh: Double?
        var textValue: String = ""
    }

    struct ParameterReagent {
        var inventoryItemId: String = ""
        var inventoryItemName: String = ""
        var quantity: Double = 0.0
        var usageUnit: String = "units"
    }

    struct ParameterItem {
        let id: String
        var name: String
        var code: String
        var printName: String
        var unit: String
        var inputType: String // "NUMBER", "TEXT", "LONG_TEXT", "DROPDOWN", "HEADING"
        var price: Double
        var decimals: Int
        var method: String
        var formula: String
        var containerTypeId: String?
        var containerCode: String
        var tubeCapColor: String
        var isGlobal: Bool
        var isActive: Bool
        var ranges: [ParameterRange]
        var reagents: [ParameterReagent]

        func getReferenceRangeSummary() -> String {
            if ranges.isEmpty { return "Ref: Biological Interval Standard" }
            let r = ranges[0]
            if !r.textValue.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                return String(r.textValue.split(separator: "\n").first ?? "Qualitative Interval")
            }
            if let low = r.lowValue, let high = r.highValue {
                return String(format: "Ref: %.1f - %.1f %@ (%@)", low, high, unit, r.gender)
            }
            if let low = r.lowValue { return String(format: "Ref: > %.1f %@", low, unit) }
            if let high = r.highValue { return String(format: "Ref: < %.1f %@", high, unit) }
            return "Ref: Biological Interval Standard"
        }

        func getPanicRangeSummary() -> String? {
            if ranges.isEmpty { return nil }
            let r = ranges[0]
            if let cl = r.criticalLow, let ch = r.criticalHigh {
                return String(format: "Panic: < %.1f or > %.1f", cl, ch)
            }
            if let cl = r.criticalLow { return String(format: "Panic: < %.1f", cl) }
            if let ch = r.criticalHigh { return String(format: "Panic: > %.1f", ch) }
            return nil
        }
    }

    struct CustomFieldItem {
        let id: String
        var name: String
        var type: String
        var reportLayout: String
        var printOnReport: Bool
        var usedCount: Int
        var options: [String]
    }

    struct HeadingItem {
        let id: String
        var name: String
        var desc: String
        var order: Int
        var isGlobal: Bool
    }

    struct SpecimenTubeItem {
        var id: String = ""
        let code: String
        let name: String
        let additive: String
        let usage: String
        let capColor: UIColor
        var isGlobal: Bool = true
    }

    struct SampleTypeItem {
        let id: String
        var name: String
        var code: String
        var desc: String
        var isGlobal: Bool
    }

    struct DepartmentItem {
        var id: String = ""
        let name: String
        let desc: String
        let count: Int
        var isGlobal: Bool = true
    }

    private var allTests: [TestItem] = []
    private var filteredTests: [TestItem] = []
    private var allParams: [ParameterItem] = []
    private var filteredParams: [ParameterItem] = []
    private var allCustomFields: [CustomFieldItem] = []
    private var allHeadings: [HeadingItem] = []
    private var allTubes: [SpecimenTubeItem] = []
    private var allSampleTypes: [SampleTypeItem] = []
    private var allDepts: [DepartmentItem] = []

    private var selectedScope = "All" // "All", "Global", "Local"
    private var selectedParamScope = "All" // "All", "Global", "Local"

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 0.973, green: 0.980, blue: 0.988, alpha: 1)

        setupHeader()
        setupTabContainers()
        setupTestsTab()
        setupParamsTab()
        setupCustomFieldsTab()
        setupHeadingsTab()
        setupContainersTab()
        setupSampleTypesTab()
        setupDeptsTab()

        setupStaticData()
        fetchTestCatalog()
        fetchParameters()
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        headerGradient.frame = headerView.bounds
    }

    // ── Header Setup ─────────────────────────────────────────────────────────
    private func setupHeader() {
        headerView.translatesAutoresizingMaskIntoConstraints = false
        headerGradient.colors = [
            UIColor(red: 0.039, green: 0.345, blue: 0.792, alpha: 1).cgColor,
            UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1).cgColor
        ]
        headerGradient.startPoint = CGPoint(x: 0, y: 0)
        headerGradient.endPoint   = CGPoint(x: 1, y: 1)
        headerView.layer.addSublayer(headerGradient)
        view.addSubview(headerView)

        backBtn.setImage(UIImage(systemName: "chevron.left"), for: .normal)
        backBtn.tintColor = UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1)
        backBtn.backgroundColor = .white
        backBtn.layer.cornerRadius = 20
        backBtn.addTarget(self, action: #selector(didTapBack), for: .touchUpInside)
        backBtn.translatesAutoresizingMaskIntoConstraints = false
        headerView.addSubview(backBtn)

        titleLabel.text = "Test Catalog & Pricing"
        titleLabel.font = .systemFont(ofSize: 19.5, weight: .bold)
        titleLabel.textColor = .white
        titleLabel.translatesAutoresizingMaskIntoConstraints = false
        headerView.addSubview(titleLabel)

        subtitleLabel.text = "51 Diagnostic Investigations Available"
        subtitleLabel.font = .systemFont(ofSize: 12, weight: .medium)
        subtitleLabel.textColor = UIColor(red: 0.82, green: 0.89, blue: 1.0, alpha: 1)
        subtitleLabel.translatesAutoresizingMaskIntoConstraints = false
        headerView.addSubview(subtitleLabel)

        addTestBtn.setTitle("+ Add Test", for: .normal)
        addTestBtn.setTitleColor(.white, for: .normal)
        addTestBtn.titleLabel?.font = .systemFont(ofSize: 12.5, weight: .bold)
        addTestBtn.backgroundColor = UIColor.white.withAlphaComponent(0.25)
        addTestBtn.layer.cornerRadius = 16
        addTestBtn.layer.borderWidth = 1
        addTestBtn.layer.borderColor = UIColor.white.withAlphaComponent(0.4).cgColor
        addTestBtn.contentEdgeInsets = UIEdgeInsets(top: 6, left: 12, bottom: 6, right: 12)
        addTestBtn.addTarget(self, action: #selector(didTapAddAction), for: .touchUpInside)
        addTestBtn.translatesAutoresizingMaskIntoConstraints = false
        headerView.addSubview(addTestBtn)

        modeSegment.selectedSegmentIndex = 0
        modeSegment.selectedSegmentTintColor = .white
        modeSegment.setTitleTextAttributes([.foregroundColor: UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1), .font: UIFont.systemFont(ofSize: 12, weight: .bold)], for: .selected)
        modeSegment.setTitleTextAttributes([.foregroundColor: UIColor.white, .font: UIFont.systemFont(ofSize: 12, weight: .medium)], for: .normal)
        modeSegment.backgroundColor = UIColor.white.withAlphaComponent(0.20)
        modeSegment.addTarget(self, action: #selector(didChangeModeSegment), for: .valueChanged)
        modeSegment.translatesAutoresizingMaskIntoConstraints = false
        headerView.addSubview(modeSegment)

        NSLayoutConstraint.activate([
            headerView.topAnchor.constraint(equalTo: view.topAnchor),
            headerView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            headerView.trailingAnchor.constraint(equalTo: view.trailingAnchor),

            backBtn.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 4),
            backBtn.leadingAnchor.constraint(equalTo: headerView.leadingAnchor, constant: 16),
            backBtn.widthAnchor.constraint(equalToConstant: 38),
            backBtn.heightAnchor.constraint(equalToConstant: 38),

            titleLabel.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 4),
            titleLabel.leadingAnchor.constraint(equalTo: backBtn.trailingAnchor, constant: 12),

            subtitleLabel.topAnchor.constraint(equalTo: titleLabel.bottomAnchor, constant: 1),
            subtitleLabel.leadingAnchor.constraint(equalTo: titleLabel.leadingAnchor),

            addTestBtn.centerYAnchor.constraint(equalTo: backBtn.centerYAnchor),
            addTestBtn.trailingAnchor.constraint(equalTo: headerView.trailingAnchor, constant: -16),
            addTestBtn.heightAnchor.constraint(equalToConstant: 34),

            modeSegment.topAnchor.constraint(equalTo: subtitleLabel.bottomAnchor, constant: 14),
            modeSegment.leadingAnchor.constraint(equalTo: headerView.leadingAnchor, constant: 16),
            modeSegment.trailingAnchor.constraint(equalTo: headerView.trailingAnchor, constant: -16),
            modeSegment.heightAnchor.constraint(equalToConstant: 36),
            modeSegment.bottomAnchor.constraint(equalTo: headerView.bottomAnchor, constant: -14)
        ])
    }

    // ── Tab Containers Setup ─────────────────────────────────────────────────
    private func setupTabContainers() {
        [testsContainer, paramsContainer, customFieldsContainer, headingsContainer, containersContainer, sampleTypesContainer, deptsContainer].forEach {
            $0.translatesAutoresizingMaskIntoConstraints = false
            view.addSubview($0)
            NSLayoutConstraint.activate([
                $0.topAnchor.constraint(equalTo: headerView.bottomAnchor),
                $0.leadingAnchor.constraint(equalTo: view.leadingAnchor),
                $0.trailingAnchor.constraint(equalTo: view.trailingAnchor),
                $0.bottomAnchor.constraint(equalTo: view.bottomAnchor)
            ])
        }

        paramsContainer.isHidden       = true
        customFieldsContainer.isHidden = true
        headingsContainer.isHidden     = true
        containersContainer.isHidden   = true
        sampleTypesContainer.isHidden  = true
        deptsContainer.isHidden        = true
    }

    // ── Tab 1: Tests & Pricing Setup ─────────────────────────────────────────
    private func setupTestsTab() {
        searchField.placeholder = "Search tests by name, code (e.g. CBC, LFT)..."
        searchField.font = .systemFont(ofSize: 13.5)
        searchField.backgroundColor = .white
        searchField.layer.cornerRadius = 12
        searchField.layer.borderWidth = 1
        searchField.layer.borderColor = UIColor(red: 0.88, green: 0.90, blue: 0.93, alpha: 1).cgColor
        searchField.leftView = UIView(frame: CGRect(x: 0, y: 0, width: 12, height: 10))
        searchField.leftViewMode = .always
        searchField.clearButtonMode = .whileEditing
        searchField.delegate = self
        searchField.addTarget(self, action: #selector(didChangeSearch), for: .editingChanged)
        searchField.translatesAutoresizingMaskIntoConstraints = false
        testsContainer.addSubview(searchField)

        scopeSegment.selectedSegmentIndex = 0
        scopeSegment.selectedSegmentTintColor = UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1)
        scopeSegment.setTitleTextAttributes([.foregroundColor: UIColor.white, .font: UIFont.systemFont(ofSize: 12, weight: .bold)], for: .selected)
        scopeSegment.setTitleTextAttributes([.foregroundColor: UIColor(red: 0.2, green: 0.25, blue: 0.33, alpha: 1), .font: UIFont.systemFont(ofSize: 12, weight: .medium)], for: .normal)
        scopeSegment.addTarget(self, action: #selector(didChangeScopeSegment), for: .valueChanged)
        scopeSegment.translatesAutoresizingMaskIntoConstraints = false
        testsContainer.addSubview(scopeSegment)

        testsTableView.dataSource = self
        testsTableView.delegate = self
        testsTableView.backgroundColor = .clear
        testsTableView.separatorStyle = .none
        testsTableView.register(TestCatalogCardCell.self, forCellReuseIdentifier: "TestCatalogCardCell")
        testsTableView.translatesAutoresizingMaskIntoConstraints = false
        testsContainer.addSubview(testsTableView)

        testsSpinner.hidesWhenStopped = true
        testsSpinner.translatesAutoresizingMaskIntoConstraints = false
        testsContainer.addSubview(testsSpinner)

        emptyLabel.text = "No tests found matching your search."
        emptyLabel.font = .systemFont(ofSize: 14, weight: .medium)
        emptyLabel.textColor = .secondaryLabel
        emptyLabel.textAlignment = .center
        emptyLabel.isHidden = true
        emptyLabel.translatesAutoresizingMaskIntoConstraints = false
        testsContainer.addSubview(emptyLabel)

        NSLayoutConstraint.activate([
            searchField.topAnchor.constraint(equalTo: testsContainer.topAnchor, constant: 12),
            searchField.leadingAnchor.constraint(equalTo: testsContainer.leadingAnchor, constant: 16),
            searchField.trailingAnchor.constraint(equalTo: testsContainer.trailingAnchor, constant: -16),
            searchField.heightAnchor.constraint(equalToConstant: 44),

            scopeSegment.topAnchor.constraint(equalTo: searchField.bottomAnchor, constant: 8),
            scopeSegment.leadingAnchor.constraint(equalTo: testsContainer.leadingAnchor, constant: 16),
            scopeSegment.trailingAnchor.constraint(equalTo: testsContainer.trailingAnchor, constant: -16),
            scopeSegment.heightAnchor.constraint(equalToConstant: 32),

            testsTableView.topAnchor.constraint(equalTo: scopeSegment.bottomAnchor, constant: 8),
            testsTableView.leadingAnchor.constraint(equalTo: testsContainer.leadingAnchor),
            testsTableView.trailingAnchor.constraint(equalTo: testsContainer.trailingAnchor),
            testsTableView.bottomAnchor.constraint(equalTo: testsContainer.bottomAnchor),

            testsSpinner.centerXAnchor.constraint(equalTo: testsContainer.centerXAnchor),
            testsSpinner.centerYAnchor.constraint(equalTo: testsContainer.centerYAnchor),

            emptyLabel.centerXAnchor.constraint(equalTo: testsContainer.centerXAnchor),
            emptyLabel.centerYAnchor.constraint(equalTo: testsContainer.centerYAnchor)
        ])
    }

    // ── Tab 2: Parameters Setup ──────────────────────────────────────────────
    private func setupParamsTab() {
        paramSearchField.placeholder = "Search parameters by name, code, method..."
        paramSearchField.font = .systemFont(ofSize: 13.5)
        paramSearchField.backgroundColor = .white
        paramSearchField.layer.cornerRadius = 12
        paramSearchField.layer.borderWidth = 1
        paramSearchField.layer.borderColor = UIColor(red: 0.88, green: 0.90, blue: 0.93, alpha: 1).cgColor
        paramSearchField.leftView = UIView(frame: CGRect(x: 0, y: 0, width: 12, height: 10))
        paramSearchField.leftViewMode = .always
        paramSearchField.clearButtonMode = .whileEditing
        paramSearchField.delegate = self
        paramSearchField.addTarget(self, action: #selector(didChangeParamSearch), for: .editingChanged)
        paramSearchField.translatesAutoresizingMaskIntoConstraints = false
        paramsContainer.addSubview(paramSearchField)

        paramScopeSegment.selectedSegmentIndex = 0
        paramScopeSegment.selectedSegmentTintColor = UIColor(red: 0.486, green: 0.227, blue: 0.929, alpha: 1)
        paramScopeSegment.setTitleTextAttributes([.foregroundColor: UIColor.white, .font: UIFont.systemFont(ofSize: 12, weight: .bold)], for: .selected)
        paramScopeSegment.setTitleTextAttributes([.foregroundColor: UIColor(red: 0.2, green: 0.25, blue: 0.33, alpha: 1), .font: UIFont.systemFont(ofSize: 12, weight: .medium)], for: .normal)
        paramScopeSegment.addTarget(self, action: #selector(didChangeParamScopeSegment), for: .valueChanged)
        paramScopeSegment.translatesAutoresizingMaskIntoConstraints = false
        paramsContainer.addSubview(paramScopeSegment)

        paramsTableView.dataSource = self
        paramsTableView.delegate = self
        paramsTableView.backgroundColor = .clear
        paramsTableView.separatorStyle = .none
        paramsTableView.register(ParameterCardCell.self, forCellReuseIdentifier: "ParameterCardCell")
        paramsTableView.translatesAutoresizingMaskIntoConstraints = false
        paramsContainer.addSubview(paramsTableView)

        paramsSpinner.hidesWhenStopped = true
        paramsSpinner.translatesAutoresizingMaskIntoConstraints = false
        paramsContainer.addSubview(paramsSpinner)

        emptyParamsLabel.text = "No parameters found matching your search."
        emptyParamsLabel.font = .systemFont(ofSize: 14, weight: .medium)
        emptyParamsLabel.textColor = .secondaryLabel
        emptyParamsLabel.textAlignment = .center
        emptyParamsLabel.isHidden = true
        emptyParamsLabel.translatesAutoresizingMaskIntoConstraints = false
        paramsContainer.addSubview(emptyParamsLabel)

        NSLayoutConstraint.activate([
            paramSearchField.topAnchor.constraint(equalTo: paramsContainer.topAnchor, constant: 12),
            paramSearchField.leadingAnchor.constraint(equalTo: paramsContainer.leadingAnchor, constant: 16),
            paramSearchField.trailingAnchor.constraint(equalTo: paramsContainer.trailingAnchor, constant: -16),
            paramSearchField.heightAnchor.constraint(equalToConstant: 44),

            paramScopeSegment.topAnchor.constraint(equalTo: paramSearchField.bottomAnchor, constant: 8),
            paramScopeSegment.leadingAnchor.constraint(equalTo: paramsContainer.leadingAnchor, constant: 16),
            paramScopeSegment.trailingAnchor.constraint(equalTo: paramsContainer.trailingAnchor, constant: -16),
            paramScopeSegment.heightAnchor.constraint(equalToConstant: 32),

            paramsTableView.topAnchor.constraint(equalTo: paramScopeSegment.bottomAnchor, constant: 8),
            paramsTableView.leadingAnchor.constraint(equalTo: paramsContainer.leadingAnchor),
            paramsTableView.trailingAnchor.constraint(equalTo: paramsContainer.trailingAnchor),
            paramsTableView.bottomAnchor.constraint(equalTo: paramsContainer.bottomAnchor),

            paramsSpinner.centerXAnchor.constraint(equalTo: paramsContainer.centerXAnchor),
            paramsSpinner.centerYAnchor.constraint(equalTo: paramsContainer.centerYAnchor),

            emptyParamsLabel.centerXAnchor.constraint(equalTo: paramsContainer.centerXAnchor),
            emptyParamsLabel.centerYAnchor.constraint(equalTo: paramsContainer.centerYAnchor)
        ])
    }

    // ── Tab 3: Custom Fields Setup ───────────────────────────────────────────
    private func setupCustomFieldsTab() {
        customFieldsTableView.dataSource = self
        customFieldsTableView.delegate = self
        customFieldsTableView.backgroundColor = .clear
        customFieldsTableView.separatorStyle = .none
        customFieldsTableView.register(CustomFieldCell.self, forCellReuseIdentifier: "CustomFieldCell")
        customFieldsTableView.translatesAutoresizingMaskIntoConstraints = false
        customFieldsContainer.addSubview(customFieldsTableView)

        customFieldsSpinner.hidesWhenStopped = true
        customFieldsSpinner.translatesAutoresizingMaskIntoConstraints = false
        customFieldsContainer.addSubview(customFieldsSpinner)

        NSLayoutConstraint.activate([
            customFieldsTableView.topAnchor.constraint(equalTo: customFieldsContainer.topAnchor, constant: 12),
            customFieldsTableView.leadingAnchor.constraint(equalTo: customFieldsContainer.leadingAnchor),
            customFieldsTableView.trailingAnchor.constraint(equalTo: customFieldsContainer.trailingAnchor),
            customFieldsTableView.bottomAnchor.constraint(equalTo: customFieldsContainer.bottomAnchor),

            customFieldsSpinner.centerXAnchor.constraint(equalTo: customFieldsContainer.centerXAnchor),
            customFieldsSpinner.centerYAnchor.constraint(equalTo: customFieldsContainer.centerYAnchor)
        ])
    }

    // ── Tab 4: Headings Setup ────────────────────────────────────────────────
    private func setupHeadingsTab() {
        headingsTableView.dataSource = self
        headingsTableView.delegate = self
        headingsTableView.backgroundColor = .clear
        headingsTableView.separatorStyle = .none
        headingsTableView.register(HeadingCell.self, forCellReuseIdentifier: "HeadingCell")
        headingsTableView.translatesAutoresizingMaskIntoConstraints = false
        headingsContainer.addSubview(headingsTableView)

        headingsSpinner.hidesWhenStopped = true
        headingsSpinner.translatesAutoresizingMaskIntoConstraints = false
        headingsContainer.addSubview(headingsSpinner)

        NSLayoutConstraint.activate([
            headingsTableView.topAnchor.constraint(equalTo: headingsContainer.topAnchor, constant: 12),
            headingsTableView.leadingAnchor.constraint(equalTo: headingsContainer.leadingAnchor),
            headingsTableView.trailingAnchor.constraint(equalTo: headingsContainer.trailingAnchor),
            headingsTableView.bottomAnchor.constraint(equalTo: headingsContainer.bottomAnchor),

            headingsSpinner.centerXAnchor.constraint(equalTo: headingsContainer.centerXAnchor),
            headingsSpinner.centerYAnchor.constraint(equalTo: headingsContainer.centerYAnchor)
        ])
    }

    // ── Tab 5: Containers Setup ──────────────────────────────────────────────
    private func setupContainersTab() {
        containersTableView.dataSource = self
        containersTableView.delegate = self
        containersTableView.backgroundColor = .clear
        containersTableView.separatorStyle = .none
        containersTableView.register(SpecimenTubeCell.self, forCellReuseIdentifier: "SpecimenTubeCell")
        containersTableView.translatesAutoresizingMaskIntoConstraints = false
        containersContainer.addSubview(containersTableView)

        containersSpinner.hidesWhenStopped = true
        containersSpinner.translatesAutoresizingMaskIntoConstraints = false
        containersContainer.addSubview(containersSpinner)

        NSLayoutConstraint.activate([
            containersTableView.topAnchor.constraint(equalTo: containersContainer.topAnchor, constant: 12),
            containersTableView.leadingAnchor.constraint(equalTo: containersContainer.leadingAnchor),
            containersTableView.trailingAnchor.constraint(equalTo: containersContainer.trailingAnchor),
            containersTableView.bottomAnchor.constraint(equalTo: containersContainer.bottomAnchor),

            containersSpinner.centerXAnchor.constraint(equalTo: containersContainer.centerXAnchor),
            containersSpinner.centerYAnchor.constraint(equalTo: containersContainer.centerYAnchor)
        ])
    }

    // ── Tab 6: Sample Types Setup ────────────────────────────────────────────
    private func setupSampleTypesTab() {
        sampleTypesTableView.dataSource = self
        sampleTypesTableView.delegate = self
        sampleTypesTableView.backgroundColor = .clear
        sampleTypesTableView.separatorStyle = .none
        sampleTypesTableView.register(SampleTypeCell.self, forCellReuseIdentifier: "SampleTypeCell")
        sampleTypesTableView.translatesAutoresizingMaskIntoConstraints = false
        sampleTypesContainer.addSubview(sampleTypesTableView)

        sampleTypesSpinner.hidesWhenStopped = true
        sampleTypesSpinner.translatesAutoresizingMaskIntoConstraints = false
        sampleTypesContainer.addSubview(sampleTypesSpinner)

        NSLayoutConstraint.activate([
            sampleTypesTableView.topAnchor.constraint(equalTo: sampleTypesContainer.topAnchor, constant: 12),
            sampleTypesTableView.leadingAnchor.constraint(equalTo: sampleTypesContainer.leadingAnchor),
            sampleTypesTableView.trailingAnchor.constraint(equalTo: sampleTypesContainer.trailingAnchor),
            sampleTypesTableView.bottomAnchor.constraint(equalTo: sampleTypesContainer.bottomAnchor),

            sampleTypesSpinner.centerXAnchor.constraint(equalTo: sampleTypesContainer.centerXAnchor),
            sampleTypesSpinner.centerYAnchor.constraint(equalTo: sampleTypesContainer.centerYAnchor)
        ])
    }

    // ── Tab 7: Departments Setup ─────────────────────────────────────────────
    private func setupDeptsTab() {
        deptsTableView.dataSource = self
        deptsTableView.delegate = self
        deptsTableView.backgroundColor = .clear
        deptsTableView.separatorStyle = .none
        deptsTableView.register(DepartmentCell.self, forCellReuseIdentifier: "DepartmentCell")
        deptsTableView.translatesAutoresizingMaskIntoConstraints = false
        deptsContainer.addSubview(deptsTableView)

        deptsSpinner.hidesWhenStopped = true
        deptsSpinner.translatesAutoresizingMaskIntoConstraints = false
        deptsContainer.addSubview(deptsSpinner)

        NSLayoutConstraint.activate([
            deptsTableView.topAnchor.constraint(equalTo: deptsContainer.topAnchor, constant: 12),
            deptsTableView.leadingAnchor.constraint(equalTo: deptsContainer.leadingAnchor),
            deptsTableView.trailingAnchor.constraint(equalTo: deptsContainer.trailingAnchor),
            deptsTableView.bottomAnchor.constraint(equalTo: deptsContainer.bottomAnchor),

            deptsSpinner.centerXAnchor.constraint(equalTo: deptsContainer.centerXAnchor),
            deptsSpinner.centerYAnchor.constraint(equalTo: deptsContainer.centerYAnchor)
        ])
    }

    // ── Navigation & Segment Actions ─────────────────────────────────────────
    @objc private func didTapBack() {
        dismiss(animated: true, completion: nil)
    }

    @objc private func didTapAddAction() {
        switch modeSegment.selectedSegmentIndex {
        case 0: showFullTestEditorSheet(test: nil)
        case 1: showFullParameterEditorSheet(param: nil)
        case 2: showAddCustomFieldAlert(field: nil)
        case 3: showAddHeadingAlert(heading: nil)
        case 4: showAddContainerAlert()
        case 5: showAddSampleTypeAlert(sample: nil)
        case 6: showAddDepartmentAlert()
        default: break
        }
    }

    @objc private func didChangeModeSegment() {
        let index = modeSegment.selectedSegmentIndex
        testsContainer.isHidden        = index != 0
        paramsContainer.isHidden       = index != 1
        customFieldsContainer.isHidden = index != 2
        headingsContainer.isHidden     = index != 3
        containersContainer.isHidden   = index != 4
        sampleTypesContainer.isHidden  = index != 5
        deptsContainer.isHidden        = index != 6

        addTestBtn.isHidden = false

        switch index {
        case 0:
            addTestBtn.setTitle("+ Add Test", for: .normal)
            subtitleLabel.text = "\(allTests.count) Diagnostic Investigations Available"
        case 1:
            addTestBtn.setTitle("+ Add Parameter", for: .normal)
            subtitleLabel.text = "\(allParams.count) Clinical Parameters Configured"
        case 2:
            addTestBtn.setTitle("+ Add Field", for: .normal)
            subtitleLabel.text = "\(allCustomFields.count) Custom Input Fields"
            if allCustomFields.isEmpty { fetchCustomFields() }
        case 3:
            addTestBtn.setTitle("+ Add Heading", for: .normal)
            subtitleLabel.text = "\(allHeadings.count) Report Section Headings"
            if allHeadings.isEmpty { fetchHeadings() }
        case 4:
            addTestBtn.setTitle("+ Add Container", for: .normal)
            subtitleLabel.text = "\(allTubes.count) Specimen Collection Tubes"
            if allTubes.isEmpty { fetchContainers() }
        case 5:
            addTestBtn.setTitle("+ Add Sample Type", for: .normal)
            subtitleLabel.text = "\(allSampleTypes.count) Diagnostic Sample Types"
            if allSampleTypes.isEmpty { fetchSampleTypes() }
        case 6:
            addTestBtn.setTitle("+ Add Dept", for: .normal)
            subtitleLabel.text = "\(allDepts.count) Laboratory Departments"
            if allDepts.isEmpty { fetchDepartments() }
        default: break
        }
    }

    @objc private func didChangeScopeSegment() {
        switch scopeSegment.selectedSegmentIndex {
        case 1: selectedScope = "Global"
        case 2: selectedScope = "Local"
        default: selectedScope = "All"
        }
        filterTests()
    }

    @objc private func didChangeParamScopeSegment() {
        switch paramScopeSegment.selectedSegmentIndex {
        case 1: selectedParamScope = "Global"
        case 2: selectedParamScope = "Local"
        default: selectedParamScope = "All"
        }
        filterParams()
    }

    @objc private func didChangeSearch() { filterTests() }
    @objc private func didChangeParamSearch() { filterParams() }

    private func filterTests() {
        let query = searchField.text?.trimmingCharacters(in: .whitespacesAndNewlines).lowercased() ?? ""
        filteredTests = allTests.filter { test in
            let matchesScope: Bool
            if selectedScope == "Global" {
                matchesScope = test.isGlobal
            } else if selectedScope == "Local" {
                matchesScope = !test.isGlobal
            } else {
                matchesScope = true
            }

            let matchesQuery = query.isEmpty ||
                test.name.lowercased().contains(query) ||
                test.code.lowercased().contains(query) ||
                test.deptName.lowercased().contains(query) ||
                test.sampleType.lowercased().contains(query)

            return matchesScope && matchesQuery
        }
        testsTableView.reloadData()
        emptyLabel.isHidden = !filteredTests.isEmpty
    }

    private func filterParams() {
        let query = paramSearchField.text?.trimmingCharacters(in: .whitespacesAndNewlines).lowercased() ?? ""
        filteredParams = allParams.filter { param in
            let matchesScope: Bool
            if selectedParamScope == "Global" {
                matchesScope = param.isGlobal
            } else if selectedParamScope == "Local" {
                matchesScope = !param.isGlobal
            } else {
                matchesScope = true
            }

            let matchesQuery = query.isEmpty ||
                param.name.lowercased().contains(query) ||
                param.code.lowercased().contains(query) ||
                param.method.lowercased().contains(query) ||
                param.unit.lowercased().contains(query)

            return matchesScope && matchesQuery
        }
        paramsTableView.reloadData()
        emptyParamsLabel.isHidden = !filteredParams.isEmpty
    }

    // ── Data Fetching ────────────────────────────────────────────────────────
    private func fetchTestCatalog() {
        testsSpinner.startAnimating()
        guard let url = URL(string: "\(baseUrl)/api/workspace/test-catalog") else { return }
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        if let token = KeychainManager.shared.getToken() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            request.setValue("token=\(token)", forHTTPHeaderField: "Cookie")
        }

        URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            DispatchQueue.main.async {
                self?.testsSpinner.stopAnimating()
                guard let self = self, let data = data, error == nil else { return }

                do {
                    if let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
                       let tests = (json["tests"] as? [[String: Any]]) ?? (json["data"] as? [[String: Any]]) {
                        self.allTests = tests.compactMap { dict -> TestItem? in
                            let id = dict["id"] as? String ?? UUID().uuidString
                            let name = dict["name"] as? String ?? "Test"
                            let code = (dict["code"] as? String) ?? (dict["testCode"] as? String) ?? "TEST"
                            let printName = dict["printName"] as? String ?? name

                            var dName = "General"
                            if let deptObj = dict["department"] as? [String: Any] {
                                dName = deptObj["name"] as? String ?? "General"
                            } else if let dStr = dict["department"] as? String {
                                dName = dStr
                            }

                            var sName = "Serum"
                            if let sObj = dict["sampleType"] as? [String: Any] {
                                sName = sObj["name"] as? String ?? "Serum"
                            } else if let sStr = dict["sampleType"] as? String {
                                sName = sStr
                            }

                            var cCode = "EDTA"
                            var cColor = "#7C3AED"
                            if let cObj = dict["containerType"] as? [String: Any] {
                                cCode = cObj["code"] as? String ?? "EDTA"
                                cColor = cObj["capColor"] as? String ?? "#7C3AED"
                            }

                            let price = (dict["effectivePrice"] as? Double) ?? (dict["price"] as? Double) ?? 0.0
                            var b2b = (dict["effectiveB2BPrice"] as? Double) ?? (dict["b2bPrice"] as? Double) ?? (price * 0.70)
                            if b2b <= 0 && price > 0 { b2b = price * 0.70 }
                            let cost = dict["cost"] as? Double ?? 0.0
                            let tat = (dict["effectiveTat"] as? String) ?? (dict["tat"] as? String) ?? "24 Hours"
                            let isGlobal = dict["isGlobal"] as? Bool ?? false
                            let isActive = dict["isActive"] as? Bool ?? true
                            let hasOverride = dict["hasOverride"] as? Bool ?? false

                            var paramCount = dict["parameterCount"] as? Int ?? 1
                            if let countDict = dict["_count"] as? [String: Any], let pCount = countDict["parameters"] as? Int {
                                paramCount = pCount
                            }

                            var hasReagents = false
                            var compList: [ParameterComponent] = []
                            if let comps = dict["components"] as? [[String: Any]] {
                                for (idx, c) in comps.enumerated() {
                                    let paramDict = c["parameter"] as? [String: Any]
                                    let pId = c["parameterId"] as? String ?? paramDict?["id"] as? String ?? ""
                                    let pName = paramDict?["name"] as? String ?? "Parameter"
                                    let pCode = paramDict?["code"] as? String ?? ""
                                    if let reagArr = paramDict?["reagents"] as? [[String: Any]], !reagArr.isEmpty {
                                        hasReagents = true
                                    }
                                    compList.append(ParameterComponent(parameterId: pId, name: pName, code: pCode, headingId: nil, headingName: nil, order: idx + 1))
                                }
                            }

                            return TestItem(
                                id: id, name: name, code: code, printName: printName,
                                deptId: dict["departmentId"] as? String, deptName: dName,
                                sampleTypeId: dict["sampleTypeId"] as? String, sampleType: sName,
                                containerTypeId: dict["containerTypeId"] as? String, containerCode: cCode,
                                tubeCapColor: cColor, method: dict["method"] as? String ?? "Photometric",
                                paramsCount: paramCount, price: price, b2bPrice: b2b, cost: cost,
                                tat: tat, isGlobal: isGlobal, isActive: isActive,
                                hasOverride: hasOverride, hasAutoReagents: hasReagents,
                                components: compList
                            )
                        }

                        self.filterTests()
                        if self.modeSegment.selectedSegmentIndex == 0 {
                            self.subtitleLabel.text = "\(self.allTests.count) Diagnostic Investigations Available"
                        }
                    }
                } catch {
                    self.filterTests()
                }
            }
        }.resume()
    }

    private func fetchParameters() {
        paramsSpinner.startAnimating()
        guard let url = URL(string: "\(baseUrl)/api/workspace/parameters") else { return }
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        if let token = KeychainManager.shared.getToken() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            request.setValue("token=\(token)", forHTTPHeaderField: "Cookie")
        }

        URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            DispatchQueue.main.async {
                self?.paramsSpinner.stopAnimating()
                guard let self = self, let data = data, error == nil else { return }

                do {
                    let json = try JSONSerialization.jsonObject(with: data)
                    let paramsArr: [[String: Any]]
                    if let dict = json as? [String: Any], let arr = dict["parameters"] as? [[String: Any]] {
                        paramsArr = arr
                    } else if let arr = json as? [[String: Any]] {
                        paramsArr = arr
                    } else {
                        paramsArr = []
                    }

                    self.allParams = paramsArr.compactMap { dict -> ParameterItem? in
                        let id = dict["id"] as? String ?? UUID().uuidString
                        let name = dict["name"] as? String ?? "Parameter"
                        let code = dict["code"] as? String ?? "PARAM"
                        let printName = dict["printName"] as? String ?? name
                        let unit = dict["unit"] as? String ?? "-"
                        let inputType = dict["inputType"] as? String ?? "NUMBER"
                        let price = dict["price"] as? Double ?? 0.0
                        let decimals = dict["decimals"] as? Int ?? 2
                        let method = dict["method"] as? String ?? "Photometric"
                        let formula = dict["formula"] as? String ?? ""
                        let isGlobal = dict["isGlobal"] as? Bool ?? false
                        let isActive = dict["isActive"] as? Bool ?? true

                        var cId = dict["containerTypeId"] as? String
                        var cCode = "EDTA"
                        var cColor = "#7C3AED"
                        if let cObj = dict["containerType"] as? [String: Any] {
                            cCode = cObj["code"] as? String ?? "EDTA"
                            cColor = cObj["capColor"] as? String ?? "#7C3AED"
                        }

                        // Ranges parsing
                        var rangeList: [ParameterRange] = []
                        if let rangesArr = dict["referenceRanges"] as? [[String: Any]] {
                            for ro in rangesArr {
                                var pr = ParameterRange()
                                pr.gender = ro["gender"] as? String ?? "BOTH"
                                pr.customLabel = ro["customLabel"] as? String ?? ""
                                pr.minAge = ro["minAge"] as? Int ?? 0
                                pr.maxAge = ro["maxAge"] as? Int ?? 100
                                pr.ageUnit = ro["ageUnit"] as? String ?? "YEAR"
                                pr.lowValue = ro["lowValue"] as? Double
                                pr.highValue = ro["highValue"] as? Double
                                pr.criticalLow = ro["criticalLow"] as? Double
                                pr.criticalHigh = ro["criticalHigh"] as? Double
                                pr.textValue = ro["textValue"] as? String ?? ""
                                rangeList.append(pr)
                            }
                        }

                        // Reagents parsing
                        var reagentList: [ParameterReagent] = []
                        if let reagArr = dict["reagents"] as? [[String: Any]] {
                            for rgo in reagArr {
                                var prg = ParameterReagent()
                                prg.inventoryItemId = rgo["inventoryItemId"] as? String ?? ""
                                prg.quantity = rgo["quantity"] as? Double ?? 0.0
                                if let inv = rgo["inventoryItem"] as? [String: Any] {
                                    prg.inventoryItemName = inv["name"] as? String ?? "Reagent"
                                    prg.usageUnit = inv["usageUnit"] as? String ?? "units"
                                }
                                reagentList.append(prg)
                            }
                        }

                        return ParameterItem(
                            id: id, name: name, code: code, printName: printName,
                            unit: unit, inputType: inputType, price: price,
                            decimals: decimals, method: method, formula: formula,
                            containerTypeId: cId, containerCode: cCode, tubeCapColor: cColor,
                            isGlobal: isGlobal, isActive: isActive,
                            ranges: rangeList, reagents: reagentList
                        )
                    }

                    self.filterParams()
                    if self.modeSegment.selectedSegmentIndex == 1 {
                        self.subtitleLabel.text = "\(self.allParams.count) Clinical Parameters Configured"
                    }
                } catch {
                    self.filterParams()
                }
            }
        }.resume()
    }

    private func setupStaticData() {
        allTubes = [
            SpecimenTubeItem(id: "", code: "EDTA", name: "EDTA Lavender Cap", additive: "Dipotassium EDTA • Anticoagulant", usage: "CBC, HbA1c, ESR, Blood Grouping", capColor: UIColor(red: 0.49, green: 0.23, blue: 0.93, alpha: 1), isGlobal: true),
            SpecimenTubeItem(id: "", code: "SST", name: "Serum Separator Gold/Yellow Cap", additive: "Clot Activator + Polymer Gel", usage: "LFT, KFT, Lipid, Thyroid, Hormones", capColor: UIColor(red: 0.96, green: 0.62, blue: 0.04, alpha: 1), isGlobal: true),
            SpecimenTubeItem(id: "", code: "PLAIN", name: "Plain Clot Red Cap", additive: "Silica Clot Activator", usage: "Cross-matching, Blood Banking, Immunology", capColor: UIColor(red: 0.94, green: 0.27, blue: 0.27, alpha: 1), isGlobal: true),
            SpecimenTubeItem(id: "", code: "FLUORIDE", name: "Sodium Fluoride Grey Cap", additive: "Sodium Fluoride + Potassium Oxalate", usage: "Fasting Glucose, PPBS, GTT, Lactate", capColor: UIColor(red: 0.39, green: 0.45, blue: 0.55, alpha: 1), isGlobal: true),
            SpecimenTubeItem(id: "", code: "CITRATE", name: "Sodium Citrate 3.2% Light Blue Cap", additive: "Sodium Citrate (1:9 ratio)", usage: "PT / INR, APTT, D-Dimer, Fibrinogen", capColor: UIColor(red: 0.01, green: 0.52, blue: 0.78, alpha: 1), isGlobal: true),
            SpecimenTubeItem(id: "", code: "HEPARIN", name: "Lithium Heparin Green Cap", additive: "Lithium Heparin • Anticoagulant", usage: "Blood Gas Analysis (ABG), Electrolytes", capColor: UIColor(red: 0.06, green: 0.73, blue: 0.51, alpha: 1), isGlobal: true),
            SpecimenTubeItem(id: "", code: "URINE", name: "Sterile Urine Container", additive: "Non-additive / Boric Acid", usage: "Routine Microscopy, Urine Culture", capColor: UIColor(red: 0.92, green: 0.70, blue: 0.03, alpha: 1), isGlobal: true)
        ]

        allSampleTypes = [
            SampleTypeItem(id: "", name: "Serum (Yellow / Gold SST)", code: "SER", desc: "Clotted whole blood centrifuged for serum", isGlobal: true),
            SampleTypeItem(id: "", name: "Whole Blood (Lavender EDTA)", code: "WB", desc: "Anticoagulated whole blood for hematology", isGlobal: true),
            SampleTypeItem(id: "", name: "Plasma (Sodium Citrate Blue)", code: "PLS", desc: "Citrated plasma for coagulation studies", isGlobal: true),
            SampleTypeItem(id: "", name: "Fluoride Plasma (Grey Cap)", code: "FLU", desc: "Plasma for blood glucose preservation", isGlobal: true),
            SampleTypeItem(id: "", name: "Spot Urine Specimen", code: "URN", desc: "Clean catch midstream urine sample", isGlobal: true),
            SampleTypeItem(id: "", name: "Stool / Feces Specimen", code: "STL", desc: "Fresh stool sample for routine examination", isGlobal: true)
        ]

        allDepts = [
            DepartmentItem(id: "", name: "Clinical Hematology", desc: "Cell counts, hemoglobinopathies, coagulation, peripheral smear", count: 38, isGlobal: true),
            DepartmentItem(id: "", name: "Clinical Biochemistry", desc: "Electrolytes, liver, renal, cardiac biomarkers, diabetes", count: 74, isGlobal: true),
            DepartmentItem(id: "", name: "Immunoassay & Endocrinology", desc: "Thyroid, reproductive hormones, tumor markers, serology", count: 42, isGlobal: true),
            DepartmentItem(id: "", name: "Clinical Pathology", desc: "Urine routine & microscopy, body fluids, stool analysis", count: 26, isGlobal: true),
            DepartmentItem(id: "", name: "Medical Microbiology", desc: "Aerobic cultures, antibiotic sensitivity testing (AST)", count: 31, isGlobal: true),
            DepartmentItem(id: "", name: "Serology & Immunology", desc: "Widal, Dengue NS1/IgM, Rapid Card tests, RA factor, CRP", count: 22, isGlobal: true),
            DepartmentItem(id: "", name: "Histopathology & Cytology", desc: "Biopsies, FNAC, Pap Smears, cytochemical stains", count: 18, isGlobal: true)
        ]
    }

    // ── Fetch Custom Fields ──────────────────────────────────────────────────
    private func fetchCustomFields() {
        customFieldsSpinner.startAnimating()
        guard let url = URL(string: "\(baseUrl)/api/workspace/custom-fields") else { return }
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        if let token = KeychainManager.shared.getToken() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            request.setValue("token=\(token)", forHTTPHeaderField: "Cookie")
        }

        URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            DispatchQueue.main.async {
                self?.customFieldsSpinner.stopAnimating()
                guard let self = self, let data = data, error == nil else { return }
                do {
                    if let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
                       let arr = json["customFields"] as? [[String: Any]] {
                        self.allCustomFields = arr.compactMap { dict -> CustomFieldItem? in
                            let id = dict["id"] as? String ?? UUID().uuidString
                            let name = dict["name"] as? String ?? ""
                            let type = dict["type"] as? String ?? "TEXT"
                            let layout = dict["reportLayout"] as? String ?? "FULL"
                            let printOnReport = dict["printOnReport"] as? Bool ?? true
                            var usedCount = 0
                            if let countDict = dict["_count"] as? [String: Any] {
                                usedCount = countDict["usedInTests"] as? Int ?? 0
                            }
                            let options = dict["options"] as? [String] ?? []
                            return CustomFieldItem(id: id, name: name, type: type, reportLayout: layout, printOnReport: printOnReport, usedCount: usedCount, options: options)
                        }
                        self.customFieldsTableView.reloadData()
                        if self.modeSegment.selectedSegmentIndex == 2 {
                            self.subtitleLabel.text = "\(self.allCustomFields.count) Custom Input Fields"
                        }
                    }
                } catch {}
            }
        }.resume()
    }

    // ── Fetch Headings ───────────────────────────────────────────────────────
    private func fetchHeadings() {
        headingsSpinner.startAnimating()
        guard let url = URL(string: "\(baseUrl)/api/workspace/headings") else { return }
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        if let token = KeychainManager.shared.getToken() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            request.setValue("token=\(token)", forHTTPHeaderField: "Cookie")
        }

        URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            DispatchQueue.main.async {
                self?.headingsSpinner.stopAnimating()
                guard let self = self, let data = data, error == nil else { return }
                do {
                    if let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
                       let arr = json["headings"] as? [[String: Any]] {
                        self.allHeadings = arr.compactMap { dict -> HeadingItem? in
                            let id = dict["id"] as? String ?? UUID().uuidString
                            let name = dict["name"] as? String ?? ""
                            let desc = dict["description"] as? String ?? ""
                            let order = dict["displayOrder"] as? Int ?? 1
                            let isGlobal = dict["isGlobal"] as? Bool ?? false
                            return HeadingItem(id: id, name: name, desc: desc, order: order, isGlobal: isGlobal)
                        }
                        self.headingsTableView.reloadData()
                        if self.modeSegment.selectedSegmentIndex == 3 {
                            self.subtitleLabel.text = "\(self.allHeadings.count) Report Section Headings"
                        }
                    }
                } catch {}
            }
        }.resume()
    }

    // ── Fetch Containers ─────────────────────────────────────────────────────
    private func fetchContainers() {
        containersSpinner.startAnimating()
        guard let url = URL(string: "\(baseUrl)/api/workspace/containers") else { return }
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        if let token = KeychainManager.shared.getToken() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            request.setValue("token=\(token)", forHTTPHeaderField: "Cookie")
        }

        URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            DispatchQueue.main.async {
                self?.containersSpinner.stopAnimating()
                guard let self = self, let data = data, error == nil else { return }
                do {
                    if let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
                       let arr = json["containers"] as? [[String: Any]], !arr.isEmpty {
                        self.allTubes = arr.compactMap { dict -> SpecimenTubeItem? in
                            let id = dict["id"] as? String ?? ""
                            let code = dict["code"] as? String ?? "TUBE"
                            let name = dict["name"] as? String ?? ""
                            let additive = dict["additive"] as? String ?? ""
                            let usage = dict["usage"] as? String ?? ""
                            let capColorHex = dict["capColor"] as? String ?? "#7C3AED"
                            let color = UIColor(hex: capColorHex) ?? UIColor(red: 0.49, green: 0.23, blue: 0.93, alpha: 1)
                            let isGlobal = dict["isGlobal"] as? Bool ?? true
                            return SpecimenTubeItem(id: id, code: code, name: name, additive: additive, usage: usage, capColor: color, isGlobal: isGlobal)
                        }
                        self.containersTableView.reloadData()
                        if self.modeSegment.selectedSegmentIndex == 4 {
                            self.subtitleLabel.text = "\(self.allTubes.count) Specimen Collection Tubes"
                        }
                    }
                } catch {}
            }
        }.resume()
    }

    // ── Fetch Sample Types ───────────────────────────────────────────────────
    private func fetchSampleTypes() {
        sampleTypesSpinner.startAnimating()
        guard let url = URL(string: "\(baseUrl)/api/workspace/samples") else { return }
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        if let token = KeychainManager.shared.getToken() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            request.setValue("token=\(token)", forHTTPHeaderField: "Cookie")
        }

        URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            DispatchQueue.main.async {
                self?.sampleTypesSpinner.stopAnimating()
                guard let self = self, let data = data, error == nil else { return }
                do {
                    if let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
                       let arr = json["samples"] as? [[String: Any]], !arr.isEmpty {
                        self.allSampleTypes = arr.compactMap { dict -> SampleTypeItem? in
                            let id = dict["id"] as? String ?? ""
                            let name = dict["name"] as? String ?? ""
                            let code = dict["code"] as? String ?? "SMP"
                            let desc = dict["description"] as? String ?? ""
                            let isGlobal = dict["isGlobal"] as? Bool ?? true
                            return SampleTypeItem(id: id, name: name, code: code, desc: desc, isGlobal: isGlobal)
                        }
                        self.sampleTypesTableView.reloadData()
                        if self.modeSegment.selectedSegmentIndex == 5 {
                            self.subtitleLabel.text = "\(self.allSampleTypes.count) Diagnostic Sample Types"
                        }
                    }
                } catch {}
            }
        }.resume()
    }

    // ── Fetch Departments ────────────────────────────────────────────────────
    private func fetchDepartments() {
        deptsSpinner.startAnimating()
        guard let url = URL(string: "\(baseUrl)/api/workspace/departments") else { return }
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        if let token = KeychainManager.shared.getToken() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            request.setValue("token=\(token)", forHTTPHeaderField: "Cookie")
        }

        URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            DispatchQueue.main.async {
                self?.deptsSpinner.stopAnimating()
                guard let self = self, let data = data, error == nil else { return }
                do {
                    if let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
                       let arr = json["departments"] as? [[String: Any]], !arr.isEmpty {
                        self.allDepts = arr.compactMap { dict -> DepartmentItem? in
                            let id = dict["id"] as? String ?? ""
                            let name = dict["name"] as? String ?? ""
                            let desc = dict["description"] as? String ?? ""
                            var count = 0
                            if let countDict = dict["_count"] as? [String: Any] {
                                count = countDict["TestTemplate"] as? Int ?? 0
                            }
                            let isGlobal = dict["isGlobal"] as? Bool ?? true
                            return DepartmentItem(id: id, name: name, desc: desc, count: count, isGlobal: isGlobal)
                        }
                        self.deptsTableView.reloadData()
                        if self.modeSegment.selectedSegmentIndex == 6 {
                            self.subtitleLabel.text = "\(self.allDepts.count) Laboratory Departments"
                        }
                    }
                } catch {}
            }
        }.resume()
    }

    // ── Table View Data Source & Delegate ────────────────────────────────────
    func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        if tableView == testsTableView { return filteredTests.count }
        if tableView == paramsTableView { return filteredParams.count }
        if tableView == customFieldsTableView { return allCustomFields.count }
        if tableView == headingsTableView { return allHeadings.count }
        if tableView == containersTableView { return allTubes.count }
        if tableView == sampleTypesTableView { return allSampleTypes.count }
        if tableView == deptsTableView { return allDepts.count }
        return 0
    }

    func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        if tableView == testsTableView {
            let cell = tableView.dequeueReusableCell(withIdentifier: "TestCatalogCardCell", for: indexPath) as! TestCatalogCardCell
            let test = filteredTests[indexPath.row]
            cell.configure(
                test: test,
                onQuickPrice: { [weak self] in self?.showPricingOverrideModal(test: test) },
                onFullEdit: { [weak self] in self?.showFullTestEditorSheet(test: test) },
                onDelete: { [weak self] in self?.handleDeleteTest(test: test) }
            )
            return cell
        }

        if tableView == paramsTableView {
            let cell = tableView.dequeueReusableCell(withIdentifier: "ParameterCardCell", for: indexPath) as! ParameterCardCell
            let param = filteredParams[indexPath.row]
            cell.configure(
                param: param,
                onEdit: { [weak self] in self?.showFullParameterEditorSheet(param: param) },
                onDelete: { [weak self] in self?.handleDeleteParameter(param: param) }
            )
            return cell
        }

        if tableView == customFieldsTableView {
            let cell = tableView.dequeueReusableCell(withIdentifier: "CustomFieldCell", for: indexPath) as! CustomFieldCell
            let item = allCustomFields[indexPath.row]
            cell.configure(
                field: item,
                onEdit: { [weak self] in self?.showAddCustomFieldAlert(field: item) },
                onDelete: { [weak self] in self?.handleDeleteCustomField(field: item) }
            )
            return cell
        }

        if tableView == headingsTableView {
            let cell = tableView.dequeueReusableCell(withIdentifier: "HeadingCell", for: indexPath) as! HeadingCell
            let item = allHeadings[indexPath.row]
            cell.configure(
                heading: item,
                onEdit: { [weak self] in self?.showAddHeadingAlert(heading: item) },
                onDelete: { [weak self] in self?.handleDeleteHeading(heading: item) }
            )
            return cell
        }

        if tableView == containersTableView {
            let cell = tableView.dequeueReusableCell(withIdentifier: "SpecimenTubeCell", for: indexPath) as! SpecimenTubeCell
            cell.configure(tube: allTubes[indexPath.row])
            return cell
        }

        if tableView == sampleTypesTableView {
            let cell = tableView.dequeueReusableCell(withIdentifier: "SampleTypeCell", for: indexPath) as! SampleTypeCell
            let item = allSampleTypes[indexPath.row]
            cell.configure(
                sample: item,
                onEdit: { [weak self] in self?.showAddSampleTypeAlert(sample: item) },
                onDelete: { [weak self] in self?.handleDeleteSampleType(sample: item) }
            )
            return cell
        }

        if tableView == deptsTableView {
            let cell = tableView.dequeueReusableCell(withIdentifier: "DepartmentCell", for: indexPath) as! DepartmentCell
            cell.configure(dept: allDepts[indexPath.row])
            return cell
        }

        return UITableViewCell()
    }

    // ── Custom Field / Heading / Sample Type Alerts & Mutations ──────────────
    private func showAddCustomFieldAlert(field: CustomFieldItem?) {
        let alert = UIAlertController(title: field == nil ? "Add Custom Field" : "Edit Custom Field", message: "Configure custom field definition", preferredStyle: .alert)
        alert.addTextField { tf in
            tf.placeholder = "Field Name (e.g. Clinical History)"
            tf.text = field?.name
        }
        alert.addTextField { tf in
            tf.placeholder = "Options (comma separated for dropdown)"
            tf.text = field?.options.joined(separator: ", ")
        }
        alert.addAction(UIAlertAction(title: "Save", style: .default) { [weak self] _ in
            guard let self = self, let name = alert.textFields?[0].text?.trimmingCharacters(in: .whitespacesAndNewlines), !name.isEmpty else { return }
            let optsStr = alert.textFields?[1].text?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
            let opts = optsStr.isEmpty ? [] : optsStr.split(separator: ",").map { String($0).trimmingCharacters(in: .whitespacesAndNewlines) }
            self.saveCustomField(id: field?.id, name: name, options: opts)
        })
        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel, handler: nil))
        present(alert, animated: true, completion: nil)
    }

    private func saveCustomField(id: String?, name: String, options: [String]) {
        guard let url = URL(string: "\(baseUrl)/api/workspace/custom-fields") else { return }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let token = KeychainManager.shared.getToken() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            request.setValue("token=\(token)", forHTTPHeaderField: "Cookie")
        }

        var payload: [String: Any] = [
            "name": name,
            "type": options.isEmpty ? "TEXT" : "DROPDOWN",
            "reportLayout": "FULL",
            "printOnReport": true
        ]
        if let id = id { payload["id"] = id }
        if !options.isEmpty { payload["options"] = options }

        request.httpBody = try? JSONSerialization.data(withJSONObject: payload)
        URLSession.shared.dataTask(with: request) { [weak self] _, response, _ in
            DispatchQueue.main.async {
                self?.fetchCustomFields()
            }
        }.resume()
    }

    private func handleDeleteCustomField(field: CustomFieldItem) {
        let alert = UIAlertController(title: "Delete Custom Field", message: "Are you sure you want to delete '\(field.name)'?", preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "Delete", style: .destructive) { [weak self] _ in
            guard let self = self, let url = URL(string: "\(self.baseUrl)/api/workspace/custom-fields?id=\(field.id)") else { return }
            var request = URLRequest(url: url)
            request.httpMethod = "DELETE"
            if let token = KeychainManager.shared.getToken() {
                request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
                request.setValue("token=\(token)", forHTTPHeaderField: "Cookie")
            }
            URLSession.shared.dataTask(with: request) { [weak self] _, _, _ in
                DispatchQueue.main.async { self?.fetchCustomFields() }
            }.resume()
        })
        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel, handler: nil))
        present(alert, animated: true, completion: nil)
    }

    private func showAddHeadingAlert(heading: HeadingItem?) {
        let alert = UIAlertController(title: heading == nil ? "Add Report Heading" : "Edit Heading", message: "Section header for grouping parameters", preferredStyle: .alert)
        alert.addTextField { tf in
            tf.placeholder = "Heading Title (e.g. LIPID PROFILE)"
            tf.text = heading?.name
        }
        alert.addTextField { tf in
            tf.placeholder = "Description (Optional)"
            tf.text = heading?.desc
        }
        alert.addAction(UIAlertAction(title: "Save", style: .default) { [weak self] _ in
            guard let self = self, let name = alert.textFields?[0].text?.trimmingCharacters(in: .whitespacesAndNewlines), !name.isEmpty else { return }
            let desc = alert.textFields?[1].text?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
            self.saveHeading(id: heading?.id, name: name, desc: desc)
        })
        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel, handler: nil))
        present(alert, animated: true, completion: nil)
    }

    private func saveHeading(id: String?, name: String, desc: String) {
        guard let url = URL(string: "\(baseUrl)/api/workspace/headings") else { return }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let token = KeychainManager.shared.getToken() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            request.setValue("token=\(token)", forHTTPHeaderField: "Cookie")
        }

        var payload: [String: Any] = [
            "name": name,
            "description": desc,
            "displayOrder": allHeadings.count + 1
        ]
        if let id = id { payload["id"] = id }

        request.httpBody = try? JSONSerialization.data(withJSONObject: payload)
        URLSession.shared.dataTask(with: request) { [weak self] _, _, _ in
            DispatchQueue.main.async { self?.fetchHeadings() }
        }.resume()
    }

    private func handleDeleteHeading(heading: HeadingItem) {
        let alert = UIAlertController(title: "Delete Heading", message: "Are you sure you want to delete '\(heading.name)'?", preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "Delete", style: .destructive) { [weak self] _ in
            guard let self = self, let url = URL(string: "\(self.baseUrl)/api/workspace/headings?id=\(heading.id)") else { return }
            var request = URLRequest(url: url)
            request.httpMethod = "DELETE"
            if let token = KeychainManager.shared.getToken() {
                request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
                request.setValue("token=\(token)", forHTTPHeaderField: "Cookie")
            }
            URLSession.shared.dataTask(with: request) { [weak self] _, _, _ in
                DispatchQueue.main.async { self?.fetchHeadings() }
            }.resume()
        })
        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel, handler: nil))
        present(alert, animated: true, completion: nil)
    }

    private func showAddContainerAlert() {
        let alert = UIAlertController(title: "Add Specimen Tube", message: "Add a collection container tube", preferredStyle: .alert)
        alert.addTextField { $0.placeholder = "Tube Name (e.g. EDTA Lavender Cap)" }
        alert.addTextField { $0.placeholder = "Code (e.g. EDTA)" }
        alert.addTextField { $0.placeholder = "Additive (e.g. Dipotassium EDTA)" }
        alert.addAction(UIAlertAction(title: "Save", style: .default) { [weak self] _ in
            guard let self = self,
                  let name = alert.textFields?[0].text?.trimmingCharacters(in: .whitespacesAndNewlines), !name.isEmpty,
                  let code = alert.textFields?[1].text?.trimmingCharacters(in: .whitespacesAndNewlines), !code.isEmpty else { return }
            let additive = alert.textFields?[2].text?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
            self.allTubes.append(SpecimenTubeItem(code: code, name: name, additive: additive, usage: "Routine Diagnostics", capColor: UIColor(red: 0.49, green: 0.23, blue: 0.93, alpha: 1)))
            self.containersTableView.reloadData()
        })
        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel, handler: nil))
        present(alert, animated: true, completion: nil)
    }

    private func showAddSampleTypeAlert(sample: SampleTypeItem?) {
        let alert = UIAlertController(title: sample == nil ? "Add Sample Type" : "Edit Sample Type", message: "Diagnostic biological specimen type", preferredStyle: .alert)
        alert.addTextField { tf in
            tf.placeholder = "Sample Name (e.g. Synovial Fluid)"
            tf.text = sample?.name
        }
        alert.addTextField { tf in
            tf.placeholder = "Code (e.g. SYN)"
            tf.text = sample?.code
        }
        alert.addAction(UIAlertAction(title: "Save", style: .default) { [weak self] _ in
            guard let self = self,
                  let name = alert.textFields?[0].text?.trimmingCharacters(in: .whitespacesAndNewlines), !name.isEmpty,
                  let code = alert.textFields?[1].text?.trimmingCharacters(in: .whitespacesAndNewlines), !code.isEmpty else { return }
            self.saveSampleType(id: sample?.id, name: name, code: code)
        })
        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel, handler: nil))
        present(alert, animated: true, completion: nil)
    }

    private func saveSampleType(id: String?, name: String, code: String) {
        guard let url = URL(string: "\(baseUrl)/api/workspace/samples") else { return }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let token = KeychainManager.shared.getToken() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            request.setValue("token=\(token)", forHTTPHeaderField: "Cookie")
        }

        var payload: [String: Any] = ["name": name, "code": code]
        if let id = id { payload["id"] = id }

        request.httpBody = try? JSONSerialization.data(withJSONObject: payload)
        URLSession.shared.dataTask(with: request) { [weak self] _, _, _ in
            DispatchQueue.main.async { self?.fetchSampleTypes() }
        }.resume()
    }

    private func handleDeleteSampleType(sample: SampleTypeItem) {
        let alert = UIAlertController(title: "Delete Sample Type", message: "Are you sure you want to delete '\(sample.name)'?", preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "Delete", style: .destructive) { [weak self] _ in
            guard let self = self, let url = URL(string: "\(self.baseUrl)/api/workspace/samples?id=\(sample.id)") else { return }
            var request = URLRequest(url: url)
            request.httpMethod = "DELETE"
            if let token = KeychainManager.shared.getToken() {
                request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
                request.setValue("token=\(token)", forHTTPHeaderField: "Cookie")
            }
            URLSession.shared.dataTask(with: request) { [weak self] _, _, _ in
                DispatchQueue.main.async { self?.fetchSampleTypes() }
            }.resume()
        })
        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel, handler: nil))
        present(alert, animated: true, completion: nil)
    }

    private func showAddDepartmentAlert() {
        let alert = UIAlertController(title: "Add Department", message: "Configure clinical laboratory division", preferredStyle: .alert)
        alert.addTextField { $0.placeholder = "Department Name (e.g. Molecular Biology)" }
        alert.addTextField { $0.placeholder = "Description (e.g. PCR, DNA testing)" }
        alert.addAction(UIAlertAction(title: "Save", style: .default) { [weak self] _ in
            guard let self = self,
                  let name = alert.textFields?[0].text?.trimmingCharacters(in: .whitespacesAndNewlines), !name.isEmpty else { return }
            let desc = alert.textFields?[1].text?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
            self.allDepts.append(DepartmentItem(id: "", name: name, desc: desc, count: 0, isGlobal: true))
            self.deptsTableView.reloadData()
        })
        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel, handler: nil))
        present(alert, animated: true, completion: nil)
    }

    // ── Actions & Modals ─────────────────────────────────────────────────────
    private func showPricingOverrideModal(test: TestItem) {
        let alert = UIAlertController(
            title: "Quick Pricing Override",
            message: "\(test.name) (\(test.code))\n\(test.deptName) • \(test.isGlobal ? "Global Master" : "Local")",
            preferredStyle: .alert
        )

        alert.addTextField { tf in
            tf.placeholder = "Patient Selling Price (₹)"
            tf.text = String(format: "%.2f", test.price)
            tf.keyboardType = .decimalPad
        }
        alert.addTextField { tf in
            tf.placeholder = "B2B Partner Rate (₹)"
            tf.text = String(format: "%.2f", test.b2bPrice)
            tf.keyboardType = .decimalPad
        }
        alert.addTextField { tf in
            tf.placeholder = "TAT Hours (e.g. 24)"
            tf.text = test.tat.replacingOccurrences(of: "[^0-9]", with: "", options: .regularExpression)
            tf.keyboardType = .numberPad
        }

        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel, handler: nil))
        alert.addAction(UIAlertAction(title: "Save Override", style: .default, handler: { [weak self] _ in
            guard let self = self,
                  let pStr = alert.textFields?[0].text, let newPrice = Double(pStr) else { return }
            let bStr = alert.textFields?[1].text ?? ""
            let newB2B = Double(bStr) ?? (newPrice * 0.70)
            let tStr = alert.textFields?[2].text ?? "24"
            let tatHours = Int(tStr) ?? 24
            let newTat = "\(tatHours) Hours"

            self.submitQuickPriceOverride(test: test, price: newPrice, b2b: newB2B, tat: newTat, tatHours: tatHours)
        }))

        present(alert, animated: true, completion: nil)
    }

    private func submitQuickPriceOverride(test: TestItem, price: Double, b2b: Double, tat: String, tatHours: Int) {
        guard let url = URL(string: "\(baseUrl)/api/workspace/test-catalog") else { return }
        var request = URLRequest(url: url)
        request.httpMethod = "PUT"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let token = KeychainManager.shared.getToken() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            request.setValue("token=\(token)", forHTTPHeaderField: "Cookie")
        }

        let payload: [String: Any] = [
            "testTemplateId": test.id,
            "price": price,
            "b2bPrice": b2b,
            "tat": tat,
            "tatHours": tatHours,
            "isActive": test.isActive
        ]

        request.httpBody = try? JSONSerialization.data(withJSONObject: payload)

        URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            DispatchQueue.main.async {
                guard let self = self else { return }
                if let idx = self.allTests.firstIndex(where: { $0.id == test.id }) {
                    self.allTests[idx].price = price
                    self.allTests[idx].b2bPrice = b2b
                    self.allTests[idx].tat = tat
                    self.allTests[idx].hasOverride = true
                    self.filterTests()
                }
            }
        }.resume()
    }

    private func showFullTestEditorSheet(test: TestItem?) {
        let alert = UIAlertController(
            title: test == nil ? "Create Custom Test" : (test!.isGlobal ? "Edit Master Test (Local Fork)" : "Edit Custom Test"),
            message: "Enter test details below:",
            preferredStyle: .alert
        )

        alert.addTextField { tf in
            tf.placeholder = "Test Name (e.g. Hemoglobin)"
            tf.text = test?.name ?? ""
        }
        alert.addTextField { tf in
            tf.placeholder = "Short Code (e.g. HGB)"
            tf.text = test?.code ?? ""
            tf.autocapitalizationType = .allCharacters
        }
        alert.addTextField { tf in
            tf.placeholder = "Standard Rate (₹)"
            tf.text = test != nil ? String(format: "%.2f", test!.price) : "150.00"
            tf.keyboardType = .decimalPad
        }
        alert.addTextField { tf in
            tf.placeholder = "Turnaround Time (e.g. 24 Hours)"
            tf.text = test?.tat ?? "24 Hours"
        }

        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel, handler: nil))
        alert.addAction(UIAlertAction(title: test?.isGlobal == true ? "Save Local Override" : "Save Test", style: .default, handler: { [weak self] _ in
            guard let self = self,
                  let name = alert.textFields?[0].text, !name.isEmpty,
                  let code = alert.textFields?[1].text, !code.isEmpty,
                  let priceStr = alert.textFields?[2].text, let price = Double(priceStr) else { return }

            let tat = alert.textFields?[3].text ?? "24 Hours"
            self.submitTestForm(editingTest: test, name: name, code: code.uppercased(), price: price, tat: tat)
        }))

        present(alert, animated: true, completion: nil)
    }

    private func submitTestForm(editingTest: TestItem?, name: String, code: String, price: Double, tat: String) {
        let endpoint = (editingTest != nil)
            ? "\(baseUrl)/api/workspace/test-catalog/\(editingTest!.id)"
            : "\(baseUrl)/api/workspace/test-catalog"

        guard let url = URL(string: endpoint) else { return }
        var request = URLRequest(url: url)
        request.httpMethod = "PUT"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let token = KeychainManager.shared.getToken() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            request.setValue("token=\(token)", forHTTPHeaderField: "Cookie")
        }

        let payload: [String: Any] = [
            "name": name,
            "code": code,
            "printName": name,
            "price": price,
            "b2bPrice": price * 0.70,
            "tat": tat,
            "method": editingTest?.method ?? "Standard Photometric",
            "isActive": true,
            "parametersChanged": false
        ]

        request.httpBody = try? JSONSerialization.data(withJSONObject: payload)

        URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            DispatchQueue.main.async {
                self?.fetchTestCatalog()
            }
        }.resume()
    }

    private func handleDeleteTest(test: TestItem) {
        if test.isGlobal {
            let alert = UIAlertController(
                title: "Global Master Test",
                message: "This is a platform master catalog test and cannot be deleted. You can override its pricing or set it to inactive instead.",
                preferredStyle: .alert
            )
            alert.addAction(UIAlertAction(title: "OK", style: .default, handler: nil))
            present(alert, animated: true, completion: nil)
            return
        }

        let alert = UIAlertController(
            title: "Delete Custom Test",
            message: "Are you sure you want to permanently delete '\(test.name)' (\(test.code)) from your laboratory menu?",
            preferredStyle: .actionSheet
        )

        alert.addAction(UIAlertAction(title: "Delete Test", style: .destructive, handler: { [weak self] _ in
            guard let self = self else { return }
            self.allTests.removeAll { $0.id == test.id }
            self.filterTests()

            guard let url = URL(string: "\(self.baseUrl)/api/workspace/test-catalog?id=\(test.id)") else { return }
            var request = URLRequest(url: url)
            request.httpMethod = "DELETE"
            if let token = KeychainManager.shared.getToken() {
                request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
                request.setValue("token=\(token)", forHTTPHeaderField: "Cookie")
            }
            URLSession.shared.dataTask(with: request).resume()
        }))

        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel, handler: nil))
        present(alert, animated: true, completion: nil)
    }

    // ── Full Parameter Editor Modal ──────────────────────────────────────────
    private func showFullParameterEditorSheet(param: ParameterItem?) {
        let alert = UIAlertController(
            title: param == nil ? "Create Custom Parameter" : (param!.isGlobal ? "Edit Master Parameter (Local Fork)" : "Edit Custom Parameter"),
            message: "Configure parameter name, code, unit, and reference intervals:",
            preferredStyle: .alert
        )

        alert.addTextField { tf in
            tf.placeholder = "Parameter Name (e.g. Hemoglobin)"
            tf.text = param?.name ?? ""
        }
        alert.addTextField { tf in
            tf.placeholder = "Short Code (e.g. HGB)"
            tf.text = param?.code ?? ""
            tf.autocapitalizationType = .allCharacters
        }
        alert.addTextField { tf in
            tf.placeholder = "Unit (e.g. g/dL, mg/dL)"
            tf.text = param?.unit ?? "g/dL"
        }
        alert.addTextField { tf in
            tf.placeholder = "Normal Reference Interval (e.g. 13.5 - 17.5)"
            if let p = param, !p.ranges.isEmpty {
                tf.text = p.ranges[0].textValue.isEmpty ? "\(p.ranges[0].lowValue ?? 12.0) - \(p.ranges[0].highValue ?? 16.0)" : p.ranges[0].textValue
            } else {
                tf.text = "12.0 - 16.0"
            }
        }
        alert.addTextField { tf in
            tf.placeholder = "Methodology (e.g. Photometric)"
            tf.text = param?.method ?? "Photometric"
        }

        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel, handler: nil))
        alert.addAction(UIAlertAction(title: param?.isGlobal == true ? "Save Local Override" : "Save Parameter", style: .default, handler: { [weak self] _ in
            guard let self = self,
                  let name = alert.textFields?[0].text, !name.isEmpty,
                  let code = alert.textFields?[1].text, !code.isEmpty else { return }

            let unit = alert.textFields?[2].text ?? "g/dL"
            let refText = alert.textFields?[3].text ?? "Normal"
            let method = alert.textFields?[4].text ?? "Photometric"

            self.submitParameterForm(editingParam: param, name: name, code: code.uppercased(), unit: unit, refText: refText, method: method)
        }))

        present(alert, animated: true, completion: nil)
    }

    private func submitParameterForm(editingParam: ParameterItem?, name: String, code: String, unit: String, refText: String, method: String) {
        guard let url = URL(string: "\(baseUrl)/api/workspace/parameters") else { return }
        var request = URLRequest(url: url)
        request.httpMethod = (editingParam != nil) ? "PUT" : "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let token = KeychainManager.shared.getToken() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            request.setValue("token=\(token)", forHTTPHeaderField: "Cookie")
        }

        var payload: [String: Any] = [
            "name": name,
            "code": code,
            "printName": name,
            "unit": unit,
            "method": method,
            "price": editingParam?.price ?? 0.0,
            "decimals": editingParam?.decimals ?? 2,
            "inputType": "NUMBER",
            "isActive": true
        ]
        if let ep = editingParam {
            payload["id"] = ep.id
        }

        let rangeObj: [String: Any] = [
            "gender": "BOTH",
            "minAge": 0,
            "maxAge": 100,
            "ageUnit": "YEAR",
            "textValue": refText
        ]
        payload["ranges"] = [rangeObj]

        request.httpBody = try? JSONSerialization.data(withJSONObject: payload)

        URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            DispatchQueue.main.async {
                self?.fetchParameters()
            }
        }.resume()
    }

    private func handleDeleteParameter(param: ParameterItem) {
        if param.isGlobal {
            let alert = UIAlertController(
                title: "Global Master Parameter",
                message: "This is a platform master parameter and cannot be deleted. You can edit its details to create a custom local copy instead.",
                preferredStyle: .alert
            )
            alert.addAction(UIAlertAction(title: "OK", style: .default, handler: nil))
            present(alert, animated: true, completion: nil)
            return
        }

        let alert = UIAlertController(
            title: "Delete Parameter",
            message: "Are you sure? Deleting parameter '\(param.name)' (\(param.code)) will remove it from your local catalog.",
            preferredStyle: .actionSheet
        )

        alert.addAction(UIAlertAction(title: "Delete Parameter", style: .destructive, handler: { [weak self] _ in
            guard let self = self else { return }
            self.allParams.removeAll { $0.id == param.id }
            self.filterParams()

            guard let url = URL(string: "\(self.baseUrl)/api/workspace/parameters?id=\(param.id)") else { return }
            var request = URLRequest(url: url)
            request.httpMethod = "DELETE"
            if let token = KeychainManager.shared.getToken() {
                request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
                request.setValue("token=\(token)", forHTTPHeaderField: "Cookie")
            }
            URLSession.shared.dataTask(with: request).resume()
        }))

        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel, handler: nil))
        present(alert, animated: true, completion: nil)
    }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Custom Bento Table View Cells
// ─────────────────────────────────────────────────────────────────────────────

class TestCatalogCardCell: UITableViewCell {
    private let cardView       = UIView()
    private let codeBadge      = UILabel()
    private let scopeBadge     = UILabel()
    private let inactiveBadge  = UILabel()
    private let customPriceTag = UILabel()
    private let capDot         = UIView()
    private let tubeLbl        = UILabel()
    private let nameLabel      = UILabel()
    private let deptLabel      = UILabel()
    private let specLabel      = UILabel()
    private let paramsBadge    = UILabel()
    private let reagentsBadge  = UILabel()
    private let dividerView    = UIView()
    private let tatLabel       = UILabel()
    private let priceLabel     = UILabel()
    private let b2bLabel       = UILabel()

    private let priceBtn       = UIButton(type: .system)
    private let editBtn        = UIButton(type: .system)
    private let deleteBtn      = UIButton(type: .system)

    private var onQuickPrice: (() -> Void)?
    private var onFullEdit:   (() -> Void)?
    private var onDelete:     (() -> Void)?

    override init(style: UITableViewCell.CellStyle, reuseIdentifier: String?) {
        super.init(style: style, reuseIdentifier: reuseIdentifier)
        selectionStyle = .none
        backgroundColor = .clear
        setupCard()
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    private func setupCard() {
        cardView.backgroundColor = .white
        cardView.layer.cornerRadius = 18
        cardView.layer.borderWidth = 1
        cardView.layer.borderColor = UIColor(red: 0.89, green: 0.92, blue: 0.95, alpha: 1).cgColor
        cardView.layer.shadowColor = UIColor.black.cgColor
        cardView.layer.shadowOpacity = 0.03
        cardView.layer.shadowOffset = CGSize(width: 0, height: 2)
        cardView.layer.shadowRadius = 6
        cardView.translatesAutoresizingMaskIntoConstraints = false
        contentView.addSubview(cardView)

        codeBadge.font = .systemFont(ofSize: 11.5, weight: .bold)
        codeBadge.textColor = UIColor(red: 0.38, green: 0.18, blue: 0.82, alpha: 1)
        codeBadge.backgroundColor = UIColor(red: 0.95, green: 0.93, blue: 1.0, alpha: 1)
        codeBadge.layer.cornerRadius = 6
        codeBadge.clipsToBounds = true
        codeBadge.textAlignment = .center
        codeBadge.translatesAutoresizingMaskIntoConstraints = false
        cardView.addSubview(codeBadge)

        scopeBadge.font = .systemFont(ofSize: 11, weight: .bold)
        scopeBadge.layer.cornerRadius = 6
        scopeBadge.clipsToBounds = true
        scopeBadge.textAlignment = .center
        scopeBadge.translatesAutoresizingMaskIntoConstraints = false
        cardView.addSubview(scopeBadge)

        customPriceTag.text = " Custom Price "
        customPriceTag.font = .systemFont(ofSize: 10.5, weight: .bold)
        customPriceTag.textColor = UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1)
        customPriceTag.backgroundColor = UIColor(red: 0.94, green: 0.96, blue: 1.0, alpha: 1)
        customPriceTag.layer.cornerRadius = 6
        customPriceTag.clipsToBounds = true
        customPriceTag.textAlignment = .center
        customPriceTag.translatesAutoresizingMaskIntoConstraints = false
        cardView.addSubview(customPriceTag)

        inactiveBadge.text = " INACTIVE "
        inactiveBadge.font = .systemFont(ofSize: 10, weight: .bold)
        inactiveBadge.textColor = UIColor(red: 0.88, green: 0.11, blue: 0.28, alpha: 1)
        inactiveBadge.backgroundColor = UIColor(red: 1.0, green: 0.94, blue: 0.95, alpha: 1)
        inactiveBadge.layer.cornerRadius = 6
        inactiveBadge.clipsToBounds = true
        inactiveBadge.textAlignment = .center
        inactiveBadge.translatesAutoresizingMaskIntoConstraints = false
        cardView.addSubview(inactiveBadge)

        // Top right action buttons
        editBtn.setImage(UIImage(systemName: "pencil"), for: .normal)
        editBtn.tintColor = UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1)
        editBtn.backgroundColor = UIColor(red: 0.94, green: 0.96, blue: 1.0, alpha: 1)
        editBtn.layer.cornerRadius = 7
        editBtn.addTarget(self, action: #selector(didTapEdit), for: .touchUpInside)
        editBtn.translatesAutoresizingMaskIntoConstraints = false
        cardView.addSubview(editBtn)

        deleteBtn.setImage(UIImage(systemName: "trash"), for: .normal)
        deleteBtn.tintColor = UIColor(red: 0.88, green: 0.11, blue: 0.28, alpha: 1)
        deleteBtn.backgroundColor = UIColor(red: 1.0, green: 0.94, blue: 0.95, alpha: 1)
        deleteBtn.layer.cornerRadius = 7
        deleteBtn.addTarget(self, action: #selector(didTapDelete), for: .touchUpInside)
        deleteBtn.translatesAutoresizingMaskIntoConstraints = false
        cardView.addSubview(deleteBtn)

        nameLabel.font = .systemFont(ofSize: 15.5, weight: .bold)
        nameLabel.textColor = UIColor(red: 0.06, green: 0.09, blue: 0.16, alpha: 1)
        nameLabel.numberOfLines = 2
        nameLabel.translatesAutoresizingMaskIntoConstraints = false
        cardView.addSubview(nameLabel)

        deptLabel.font = .systemFont(ofSize: 12, weight: .medium)
        deptLabel.textColor = UIColor(red: 0.39, green: 0.45, blue: 0.55, alpha: 1)
        deptLabel.translatesAutoresizingMaskIntoConstraints = false
        cardView.addSubview(deptLabel)

        capDot.layer.cornerRadius = 4
        capDot.translatesAutoresizingMaskIntoConstraints = false
        cardView.addSubview(capDot)

        tubeLbl.font = .systemFont(ofSize: 11.5, weight: .bold)
        tubeLbl.textColor = UIColor(red: 0.2, green: 0.25, blue: 0.33, alpha: 1)
        tubeLbl.translatesAutoresizingMaskIntoConstraints = false
        cardView.addSubview(tubeLbl)

        specLabel.font = .systemFont(ofSize: 11, weight: .bold)
        specLabel.textColor = UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1)
        specLabel.backgroundColor = UIColor(red: 0.94, green: 0.96, blue: 1.0, alpha: 1)
        specLabel.layer.cornerRadius = 6
        specLabel.clipsToBounds = true
        specLabel.textAlignment = .center
        specLabel.translatesAutoresizingMaskIntoConstraints = false
        cardView.addSubview(specLabel)

        paramsBadge.font = .systemFont(ofSize: 11, weight: .bold)
        paramsBadge.textColor = UIColor(red: 0.02, green: 0.59, blue: 0.41, alpha: 1)
        paramsBadge.backgroundColor = UIColor(red: 0.93, green: 0.99, blue: 0.96, alpha: 1)
        paramsBadge.layer.cornerRadius = 6
        paramsBadge.clipsToBounds = true
        paramsBadge.textAlignment = .center
        paramsBadge.translatesAutoresizingMaskIntoConstraints = false
        cardView.addSubview(paramsBadge)

        tatLabel.font = .systemFont(ofSize: 11, weight: .medium)
        tatLabel.textColor = UIColor(red: 0.28, green: 0.33, blue: 0.41, alpha: 1)
        tatLabel.backgroundColor = UIColor(red: 0.95, green: 0.96, blue: 0.98, alpha: 1)
        tatLabel.layer.cornerRadius = 6
        tatLabel.clipsToBounds = true
        tatLabel.textAlignment = .center
        tatLabel.translatesAutoresizingMaskIntoConstraints = false
        cardView.addSubview(tatLabel)

        reagentsBadge.text = " Auto Reagents "
        reagentsBadge.font = .systemFont(ofSize: 10.5, weight: .bold)
        reagentsBadge.textColor = UIColor(red: 0.05, green: 0.58, blue: 0.53, alpha: 1)
        reagentsBadge.backgroundColor = UIColor(red: 0.92, green: 0.98, blue: 0.97, alpha: 1)
        reagentsBadge.layer.cornerRadius = 6
        reagentsBadge.clipsToBounds = true
        reagentsBadge.textAlignment = .center
        reagentsBadge.translatesAutoresizingMaskIntoConstraints = false
        cardView.addSubview(reagentsBadge)

        dividerView.backgroundColor = UIColor(red: 0.94, green: 0.95, blue: 0.97, alpha: 1)
        dividerView.translatesAutoresizingMaskIntoConstraints = false
        cardView.addSubview(dividerView)

        priceLabel.font = .systemFont(ofSize: 16.5, weight: .bold)
        priceLabel.textColor = UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1)
        priceLabel.translatesAutoresizingMaskIntoConstraints = false
        cardView.addSubview(priceLabel)

        b2bLabel.font = .systemFont(ofSize: 11, weight: .bold)
        b2bLabel.textColor = UIColor(red: 0.38, green: 0.18, blue: 0.82, alpha: 1)
        b2bLabel.backgroundColor = UIColor(red: 0.95, green: 0.93, blue: 1.0, alpha: 1)
        b2bLabel.layer.cornerRadius = 5
        b2bLabel.clipsToBounds = true
        b2bLabel.textAlignment = .center
        b2bLabel.translatesAutoresizingMaskIntoConstraints = false
        cardView.addSubview(b2bLabel)

        priceBtn.setTitle("₹ Price", for: .normal)
        priceBtn.setTitleColor(UIColor(red: 0.02, green: 0.59, blue: 0.41, alpha: 1), for: .normal)
        priceBtn.titleLabel?.font = .systemFont(ofSize: 12.5, weight: .bold)
        priceBtn.backgroundColor = UIColor(red: 0.93, green: 0.99, blue: 0.96, alpha: 1)
        priceBtn.layer.cornerRadius = 8
        priceBtn.layer.borderWidth = 1
        priceBtn.layer.borderColor = UIColor(red: 0.65, green: 0.95, blue: 0.82, alpha: 1).cgColor
        priceBtn.addTarget(self, action: #selector(didTapPrice), for: .touchUpInside)
        priceBtn.translatesAutoresizingMaskIntoConstraints = false
        cardView.addSubview(priceBtn)

        NSLayoutConstraint.activate([
            cardView.topAnchor.constraint(equalTo: contentView.topAnchor, constant: 6),
            cardView.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 8),
            cardView.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -8),
            cardView.bottomAnchor.constraint(equalTo: contentView.bottomAnchor, constant: -6),

            codeBadge.topAnchor.constraint(equalTo: cardView.topAnchor, constant: 12),
            codeBadge.leadingAnchor.constraint(equalTo: cardView.leadingAnchor, constant: 14),
            codeBadge.heightAnchor.constraint(equalToConstant: 24),
            codeBadge.widthAnchor.constraint(greaterThanOrEqualToConstant: 44),

            scopeBadge.centerYAnchor.constraint(equalTo: codeBadge.centerYAnchor),
            scopeBadge.leadingAnchor.constraint(equalTo: codeBadge.trailingAnchor, constant: 6),
            scopeBadge.heightAnchor.constraint(equalToConstant: 24),
            scopeBadge.widthAnchor.constraint(greaterThanOrEqualToConstant: 56),

            customPriceTag.centerYAnchor.constraint(equalTo: codeBadge.centerYAnchor),
            customPriceTag.leadingAnchor.constraint(equalTo: scopeBadge.trailingAnchor, constant: 6),
            customPriceTag.heightAnchor.constraint(equalToConstant: 24),

            inactiveBadge.centerYAnchor.constraint(equalTo: codeBadge.centerYAnchor),
            inactiveBadge.leadingAnchor.constraint(equalTo: customPriceTag.trailingAnchor, constant: 6),
            inactiveBadge.heightAnchor.constraint(equalToConstant: 24),

            deleteBtn.topAnchor.constraint(equalTo: cardView.topAnchor, constant: 10),
            deleteBtn.trailingAnchor.constraint(equalTo: cardView.trailingAnchor, constant: -12),
            deleteBtn.heightAnchor.constraint(equalToConstant: 28),
            deleteBtn.widthAnchor.constraint(equalToConstant: 28),

            editBtn.topAnchor.constraint(equalTo: cardView.topAnchor, constant: 10),
            editBtn.trailingAnchor.constraint(equalTo: deleteBtn.leadingAnchor, constant: -6),
            editBtn.heightAnchor.constraint(equalToConstant: 28),
            editBtn.widthAnchor.constraint(equalToConstant: 28),

            nameLabel.topAnchor.constraint(equalTo: codeBadge.bottomAnchor, constant: 10),
            nameLabel.leadingAnchor.constraint(equalTo: cardView.leadingAnchor, constant: 14),
            nameLabel.trailingAnchor.constraint(equalTo: cardView.trailingAnchor, constant: -14),

            deptLabel.topAnchor.constraint(equalTo: nameLabel.bottomAnchor, constant: 3),
            deptLabel.leadingAnchor.constraint(equalTo: cardView.leadingAnchor, constant: 14),

            capDot.centerYAnchor.constraint(equalTo: tubeLbl.centerYAnchor),
            capDot.leadingAnchor.constraint(equalTo: cardView.leadingAnchor, constant: 14),
            capDot.widthAnchor.constraint(equalToConstant: 8),
            capDot.heightAnchor.constraint(equalToConstant: 8),

            tubeLbl.topAnchor.constraint(equalTo: deptLabel.bottomAnchor, constant: 8),
            tubeLbl.leadingAnchor.constraint(equalTo: capDot.trailingAnchor, constant: 5),

            specLabel.centerYAnchor.constraint(equalTo: tubeLbl.centerYAnchor),
            specLabel.leadingAnchor.constraint(equalTo: tubeLbl.trailingAnchor, constant: 8),
            specLabel.heightAnchor.constraint(equalToConstant: 22),
            specLabel.widthAnchor.constraint(greaterThanOrEqualToConstant: 50),

            paramsBadge.centerYAnchor.constraint(equalTo: tubeLbl.centerYAnchor),
            paramsBadge.leadingAnchor.constraint(equalTo: specLabel.trailingAnchor, constant: 6),
            paramsBadge.heightAnchor.constraint(equalToConstant: 22),
            paramsBadge.widthAnchor.constraint(greaterThanOrEqualToConstant: 68),

            tatLabel.centerYAnchor.constraint(equalTo: tubeLbl.centerYAnchor),
            tatLabel.leadingAnchor.constraint(equalTo: paramsBadge.trailingAnchor, constant: 6),
            tatLabel.heightAnchor.constraint(equalToConstant: 22),
            tatLabel.widthAnchor.constraint(greaterThanOrEqualToConstant: 56),

            reagentsBadge.centerYAnchor.constraint(equalTo: tubeLbl.centerYAnchor),
            reagentsBadge.leadingAnchor.constraint(equalTo: tatLabel.trailingAnchor, constant: 6),
            reagentsBadge.heightAnchor.constraint(equalToConstant: 22),

            dividerView.topAnchor.constraint(equalTo: tubeLbl.bottomAnchor, constant: 12),
            dividerView.leadingAnchor.constraint(equalTo: cardView.leadingAnchor, constant: 14),
            dividerView.trailingAnchor.constraint(equalTo: cardView.trailingAnchor, constant: -14),
            dividerView.heightAnchor.constraint(equalToConstant: 1),

            priceLabel.topAnchor.constraint(equalTo: dividerView.bottomAnchor, constant: 10),
            priceLabel.leadingAnchor.constraint(equalTo: cardView.leadingAnchor, constant: 14),
            priceLabel.bottomAnchor.constraint(equalTo: cardView.bottomAnchor, constant: -12),

            b2bLabel.centerYAnchor.constraint(equalTo: priceLabel.centerYAnchor),
            b2bLabel.leadingAnchor.constraint(equalTo: priceLabel.trailingAnchor, constant: 8),
            b2bLabel.heightAnchor.constraint(equalToConstant: 22),
            b2bLabel.widthAnchor.constraint(greaterThanOrEqualToConstant: 68),

            priceBtn.centerYAnchor.constraint(equalTo: priceLabel.centerYAnchor),
            priceBtn.trailingAnchor.constraint(equalTo: cardView.trailingAnchor, constant: -12),
            priceBtn.heightAnchor.constraint(equalToConstant: 32),
            priceBtn.widthAnchor.constraint(equalToConstant: 80)
        ])
    }

    func configure(test: TestManagementViewController.TestItem,
                   onQuickPrice: @escaping () -> Void,
                   onFullEdit:   @escaping () -> Void,
                   onDelete:     @escaping () -> Void) {
        self.onQuickPrice = onQuickPrice
        self.onFullEdit   = onFullEdit
        self.onDelete     = onDelete

        codeBadge.text = " \(test.code) "
        nameLabel.text = test.name
        deptLabel.text = test.deptName
        tubeLbl.text = test.containerCode
        specLabel.text = " \(test.sampleType) "
        paramsBadge.text = " \(test.paramsCount) Params "
        tatLabel.text = " TAT: \(test.tat) "
        priceLabel.text = String(format: "₹%,.2f", test.price)
        b2bLabel.text = String(format: " B2B ₹%,.2f ", test.b2bPrice)

        if test.isGlobal {
            scopeBadge.text = " Master "
            scopeBadge.textColor = UIColor(red: 0.26, green: 0.22, blue: 0.79, alpha: 1)
            scopeBadge.backgroundColor = UIColor(red: 0.93, green: 0.94, blue: 1.0, alpha: 1)
        } else {
            scopeBadge.text = " Custom "
            scopeBadge.textColor = UIColor(red: 0.02, green: 0.59, blue: 0.41, alpha: 1)
            scopeBadge.backgroundColor = UIColor(red: 0.93, green: 0.99, blue: 0.96, alpha: 1)
        }

        customPriceTag.isHidden = !test.hasOverride
        inactiveBadge.isHidden  = test.isActive
        reagentsBadge.isHidden  = !test.hasAutoReagents

        if let color = UIColor(hex: test.tubeCapColor) {
            capDot.backgroundColor = color
        } else {
            capDot.backgroundColor = UIColor(red: 0.49, green: 0.23, blue: 0.93, alpha: 1)
        }

        deleteBtn.alpha = test.isGlobal ? 0.35 : 1.0
    }

    @objc private func didTapPrice()  { onQuickPrice?() }
    @objc private func didTapEdit()   { onFullEdit?() }
    @objc private func didTapDelete() { onDelete?() }
}

class ParameterCardCell: UITableViewCell {
    private let cardView       = UIView()
    private let codeBadge      = UILabel()
    private let scopeBadge     = UILabel()
    private let typeBadge      = UILabel()
    private let unitBadge      = UILabel()
    private let capDot         = UIView()
    private let tubeLbl        = UILabel()
    private let nameLabel      = UILabel()
    private let methodLabel    = UILabel()
    private let reagentsBadge  = UILabel()
    private let priceLabel     = UILabel()

    private let refRangeBox    = UIView()
    private let refRangeLbl    = UILabel()
    private let panicRangeLbl  = UILabel()

    private let editBtn        = UIButton(type: .system)
    private let deleteBtn      = UIButton(type: .system)

    private var onEdit:   (() -> Void)?
    private var onDelete: (() -> Void)?

    override init(style: UITableViewCell.CellStyle, reuseIdentifier: String?) {
        super.init(style: style, reuseIdentifier: reuseIdentifier)
        selectionStyle = .none
        backgroundColor = .clear
        setupCard()
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    private func setupCard() {
        cardView.backgroundColor = .white
        cardView.layer.cornerRadius = 18
        cardView.layer.borderWidth = 1
        cardView.layer.borderColor = UIColor(red: 0.89, green: 0.92, blue: 0.95, alpha: 1).cgColor
        cardView.layer.shadowColor = UIColor.black.cgColor
        cardView.layer.shadowOpacity = 0.03
        cardView.layer.shadowOffset = CGSize(width: 0, height: 2)
        cardView.layer.shadowRadius = 6
        cardView.translatesAutoresizingMaskIntoConstraints = false
        contentView.addSubview(cardView)

        codeBadge.font = .systemFont(ofSize: 11.5, weight: .bold)
        codeBadge.textColor = UIColor(red: 0.38, green: 0.18, blue: 0.82, alpha: 1)
        codeBadge.backgroundColor = UIColor(red: 0.95, green: 0.93, blue: 1.0, alpha: 1)
        codeBadge.layer.cornerRadius = 6
        codeBadge.clipsToBounds = true
        codeBadge.textAlignment = .center
        codeBadge.translatesAutoresizingMaskIntoConstraints = false
        cardView.addSubview(codeBadge)

        scopeBadge.font = .systemFont(ofSize: 11, weight: .bold)
        scopeBadge.layer.cornerRadius = 6
        scopeBadge.clipsToBounds = true
        scopeBadge.textAlignment = .center
        scopeBadge.translatesAutoresizingMaskIntoConstraints = false
        cardView.addSubview(scopeBadge)

        typeBadge.font = .systemFont(ofSize: 11, weight: .bold)
        typeBadge.textColor = UIColor(red: 0.38, green: 0.18, blue: 0.82, alpha: 1)
        typeBadge.backgroundColor = UIColor(red: 0.95, green: 0.93, blue: 1.0, alpha: 1)
        typeBadge.layer.cornerRadius = 6
        typeBadge.clipsToBounds = true
        typeBadge.textAlignment = .center
        typeBadge.translatesAutoresizingMaskIntoConstraints = false
        cardView.addSubview(typeBadge)

        editBtn.setImage(UIImage(systemName: "pencil"), for: .normal)
        editBtn.tintColor = UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1)
        editBtn.backgroundColor = UIColor(red: 0.94, green: 0.96, blue: 1.0, alpha: 1)
        editBtn.layer.cornerRadius = 7
        editBtn.addTarget(self, action: #selector(didTapEdit), for: .touchUpInside)
        editBtn.translatesAutoresizingMaskIntoConstraints = false
        cardView.addSubview(editBtn)

        deleteBtn.setImage(UIImage(systemName: "trash"), for: .normal)
        deleteBtn.tintColor = UIColor(red: 0.88, green: 0.11, blue: 0.28, alpha: 1)
        deleteBtn.backgroundColor = UIColor(red: 1.0, green: 0.94, blue: 0.95, alpha: 1)
        deleteBtn.layer.cornerRadius = 7
        deleteBtn.addTarget(self, action: #selector(didTapDelete), for: .touchUpInside)
        deleteBtn.translatesAutoresizingMaskIntoConstraints = false
        cardView.addSubview(deleteBtn)

        nameLabel.font = .systemFont(ofSize: 15.5, weight: .bold)
        nameLabel.textColor = UIColor(red: 0.06, green: 0.09, blue: 0.16, alpha: 1)
        nameLabel.numberOfLines = 2
        nameLabel.translatesAutoresizingMaskIntoConstraints = false
        cardView.addSubview(nameLabel)

        methodLabel.font = .systemFont(ofSize: 12, weight: .medium)
        methodLabel.textColor = UIColor(red: 0.39, green: 0.45, blue: 0.55, alpha: 1)
        methodLabel.translatesAutoresizingMaskIntoConstraints = false
        cardView.addSubview(methodLabel)

        unitBadge.font = .systemFont(ofSize: 11, weight: .bold)
        unitBadge.textColor = UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1)
        unitBadge.backgroundColor = UIColor(red: 0.94, green: 0.96, blue: 1.0, alpha: 1)
        unitBadge.layer.cornerRadius = 6
        unitBadge.clipsToBounds = true
        unitBadge.textAlignment = .center
        unitBadge.translatesAutoresizingMaskIntoConstraints = false
        cardView.addSubview(unitBadge)

        capDot.layer.cornerRadius = 4
        capDot.translatesAutoresizingMaskIntoConstraints = false
        cardView.addSubview(capDot)

        tubeLbl.font = .systemFont(ofSize: 11.5, weight: .bold)
        tubeLbl.textColor = UIColor(red: 0.2, green: 0.25, blue: 0.33, alpha: 1)
        tubeLbl.translatesAutoresizingMaskIntoConstraints = false
        cardView.addSubview(tubeLbl)

        reagentsBadge.text = " Auto Reagents "
        reagentsBadge.font = .systemFont(ofSize: 10.5, weight: .bold)
        reagentsBadge.textColor = UIColor(red: 0.05, green: 0.58, blue: 0.53, alpha: 1)
        reagentsBadge.backgroundColor = UIColor(red: 0.92, green: 0.98, blue: 0.97, alpha: 1)
        reagentsBadge.layer.cornerRadius = 6
        reagentsBadge.clipsToBounds = true
        reagentsBadge.textAlignment = .center
        reagentsBadge.translatesAutoresizingMaskIntoConstraints = false
        cardView.addSubview(reagentsBadge)

        priceLabel.font = .systemFont(ofSize: 12.5, weight: .bold)
        priceLabel.textColor = UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1)
        priceLabel.translatesAutoresizingMaskIntoConstraints = false
        cardView.addSubview(priceLabel)

        refRangeBox.backgroundColor = UIColor(red: 0.96, green: 0.97, blue: 0.99, alpha: 1)
        refRangeBox.layer.cornerRadius = 8
        refRangeBox.layer.borderWidth = 1
        refRangeBox.layer.borderColor = UIColor(red: 0.91, green: 0.93, blue: 0.96, alpha: 1).cgColor
        refRangeBox.translatesAutoresizingMaskIntoConstraints = false
        cardView.addSubview(refRangeBox)

        refRangeLbl.font = .systemFont(ofSize: 12, weight: .semibold)
        refRangeLbl.textColor = UIColor(red: 0.12, green: 0.16, blue: 0.22, alpha: 1)
        refRangeLbl.translatesAutoresizingMaskIntoConstraints = false
        refRangeBox.addSubview(refRangeLbl)

        panicRangeLbl.font = .systemFont(ofSize: 10.5, weight: .bold)
        panicRangeLbl.textColor = UIColor(red: 0.88, green: 0.11, blue: 0.28, alpha: 1)
        panicRangeLbl.translatesAutoresizingMaskIntoConstraints = false
        refRangeBox.addSubview(panicRangeLbl)

        NSLayoutConstraint.activate([
            cardView.topAnchor.constraint(equalTo: contentView.topAnchor, constant: 6),
            cardView.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 8),
            cardView.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -8),
            cardView.bottomAnchor.constraint(equalTo: contentView.bottomAnchor, constant: -6),

            codeBadge.topAnchor.constraint(equalTo: cardView.topAnchor, constant: 12),
            codeBadge.leadingAnchor.constraint(equalTo: cardView.leadingAnchor, constant: 14),
            codeBadge.heightAnchor.constraint(equalToConstant: 24),
            codeBadge.widthAnchor.constraint(greaterThanOrEqualToConstant: 44),

            scopeBadge.centerYAnchor.constraint(equalTo: codeBadge.centerYAnchor),
            scopeBadge.leadingAnchor.constraint(equalTo: codeBadge.trailingAnchor, constant: 6),
            scopeBadge.heightAnchor.constraint(equalToConstant: 24),
            scopeBadge.widthAnchor.constraint(greaterThanOrEqualToConstant: 56),

            typeBadge.centerYAnchor.constraint(equalTo: codeBadge.centerYAnchor),
            typeBadge.leadingAnchor.constraint(equalTo: scopeBadge.trailingAnchor, constant: 6),
            scopeBadge.heightAnchor.constraint(equalToConstant: 24),
            typeBadge.widthAnchor.constraint(greaterThanOrEqualToConstant: 50),

            deleteBtn.topAnchor.constraint(equalTo: cardView.topAnchor, constant: 10),
            deleteBtn.trailingAnchor.constraint(equalTo: cardView.trailingAnchor, constant: -12),
            deleteBtn.heightAnchor.constraint(equalToConstant: 28),
            deleteBtn.widthAnchor.constraint(equalToConstant: 28),

            editBtn.topAnchor.constraint(equalTo: cardView.topAnchor, constant: 10),
            editBtn.trailingAnchor.constraint(equalTo: deleteBtn.leadingAnchor, constant: -6),
            editBtn.heightAnchor.constraint(equalToConstant: 28),
            editBtn.widthAnchor.constraint(equalToConstant: 28),

            nameLabel.topAnchor.constraint(equalTo: codeBadge.bottomAnchor, constant: 10),
            nameLabel.leadingAnchor.constraint(equalTo: cardView.leadingAnchor, constant: 14),
            nameLabel.trailingAnchor.constraint(equalTo: cardView.trailingAnchor, constant: -14),

            methodLabel.topAnchor.constraint(equalTo: nameLabel.bottomAnchor, constant: 3),
            methodLabel.leadingAnchor.constraint(equalTo: cardView.leadingAnchor, constant: 14),

            unitBadge.centerYAnchor.constraint(equalTo: methodLabel.centerYAnchor),
            unitBadge.leadingAnchor.constraint(equalTo: methodLabel.trailingAnchor, constant: 8),
            unitBadge.heightAnchor.constraint(equalToConstant: 20),
            unitBadge.widthAnchor.constraint(greaterThanOrEqualToConstant: 44),

            capDot.centerYAnchor.constraint(equalTo: tubeLbl.centerYAnchor),
            capDot.leadingAnchor.constraint(equalTo: cardView.leadingAnchor, constant: 14),
            capDot.widthAnchor.constraint(equalToConstant: 8),
            capDot.heightAnchor.constraint(equalToConstant: 8),

            tubeLbl.topAnchor.constraint(equalTo: methodLabel.bottomAnchor, constant: 8),
            tubeLbl.leadingAnchor.constraint(equalTo: capDot.trailingAnchor, constant: 5),

            reagentsBadge.centerYAnchor.constraint(equalTo: tubeLbl.centerYAnchor),
            reagentsBadge.leadingAnchor.constraint(equalTo: tubeLbl.trailingAnchor, constant: 8),
            reagentsBadge.heightAnchor.constraint(equalToConstant: 22),

            priceLabel.centerYAnchor.constraint(equalTo: tubeLbl.centerYAnchor),
            priceLabel.trailingAnchor.constraint(equalTo: cardView.trailingAnchor, constant: -14),

            refRangeBox.topAnchor.constraint(equalTo: tubeLbl.bottomAnchor, constant: 10),
            refRangeBox.leadingAnchor.constraint(equalTo: cardView.leadingAnchor, constant: 14),
            refRangeBox.trailingAnchor.constraint(equalTo: cardView.trailingAnchor, constant: -14),
            refRangeBox.bottomAnchor.constraint(equalTo: cardView.bottomAnchor, constant: -12),

            refRangeLbl.topAnchor.constraint(equalTo: refRangeBox.topAnchor, constant: 8),
            refRangeLbl.leadingAnchor.constraint(equalTo: refRangeBox.leadingAnchor, constant: 10),
            refRangeLbl.trailingAnchor.constraint(equalTo: refRangeBox.trailingAnchor, constant: -10),

            panicRangeLbl.topAnchor.constraint(equalTo: refRangeLbl.bottomAnchor, constant: 3),
            panicRangeLbl.leadingAnchor.constraint(equalTo: refRangeBox.leadingAnchor, constant: 10),
            panicRangeLbl.trailingAnchor.constraint(equalTo: refRangeBox.trailingAnchor, constant: -10),
            panicRangeLbl.bottomAnchor.constraint(equalTo: refRangeBox.bottomAnchor, constant: -8)
        ])
    }

    func configure(param: TestManagementViewController.ParameterItem,
                   onEdit: @escaping () -> Void,
                   onDelete: @escaping () -> Void) {
        self.onEdit = onEdit
        self.onDelete = onDelete

        codeBadge.text = " \(param.code) "
        nameLabel.text = param.name
        methodLabel.text = "Method: \(param.method)"
        unitBadge.text = " \(param.unit) "
        typeBadge.text = " \(param.inputType) "
        tubeLbl.text = param.containerCode

        if param.isGlobal {
            scopeBadge.text = " Global "
            scopeBadge.textColor = UIColor(red: 0.26, green: 0.22, blue: 0.79, alpha: 1)
            scopeBadge.backgroundColor = UIColor(red: 0.93, green: 0.94, blue: 1.0, alpha: 1)
        } else {
            scopeBadge.text = " Local "
            scopeBadge.textColor = UIColor(red: 0.02, green: 0.59, blue: 0.41, alpha: 1)
            scopeBadge.backgroundColor = UIColor(red: 0.93, green: 0.99, blue: 0.96, alpha: 1)
        }

        if let color = UIColor(hex: param.tubeCapColor) {
            capDot.backgroundColor = color
        } else {
            capDot.backgroundColor = UIColor(red: 0.49, green: 0.23, blue: 0.93, alpha: 1)
        }

        reagentsBadge.isHidden = param.reagents.isEmpty

        if param.price > 0 {
            priceLabel.text = String(format: "₹%,.2f", param.price)
            priceLabel.isHidden = false
        } else {
            priceLabel.isHidden = true
        }

        refRangeLbl.text = param.getReferenceRangeSummary()
        if let panic = param.getPanicRangeSummary() {
            panicRangeLbl.text = panic
            panicRangeLbl.isHidden = false
        } else {
            panicRangeLbl.isHidden = true
        }

        deleteBtn.alpha = param.isGlobal ? 0.35 : 1.0
    }

    @objc private func didTapEdit() { onEdit?() }
    @objc private func didTapDelete() { onDelete?() }
}

class CustomFieldCell: UITableViewCell {
    private let cardView     = UIView()
    private let nameLabel    = UILabel()
    private let typeBadge    = UILabel()
    private let usedBadge    = UILabel()
    private let optionsLabel = UILabel()
    private let editBtn      = UIButton(type: .system)
    private let deleteBtn    = UIButton(type: .system)

    private var onEdit: (() -> Void)?
    private var onDelete: (() -> Void)?

    override init(style: UITableViewCell.CellStyle, reuseIdentifier: String?) {
        super.init(style: style, reuseIdentifier: reuseIdentifier)
        selectionStyle = .none
        backgroundColor = .clear
        setupCard()
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    private func setupCard() {
        cardView.backgroundColor = .white
        cardView.layer.cornerRadius = 18
        cardView.layer.borderWidth = 1
        cardView.layer.borderColor = UIColor(red: 0.89, green: 0.92, blue: 0.95, alpha: 1).cgColor
        cardView.layer.shadowColor = UIColor.black.cgColor
        cardView.layer.shadowOpacity = 0.03
        cardView.layer.shadowOffset = CGSize(width: 0, height: 2)
        cardView.layer.shadowRadius = 6
        cardView.translatesAutoresizingMaskIntoConstraints = false
        contentView.addSubview(cardView)

        typeBadge.font = .systemFont(ofSize: 11, weight: .bold)
        typeBadge.textColor = UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1)
        typeBadge.backgroundColor = UIColor(red: 0.94, green: 0.96, blue: 1.0, alpha: 1)
        typeBadge.layer.cornerRadius = 6
        typeBadge.clipsToBounds = true
        typeBadge.textAlignment = .center
        typeBadge.translatesAutoresizingMaskIntoConstraints = false
        cardView.addSubview(typeBadge)

        usedBadge.font = .systemFont(ofSize: 11, weight: .bold)
        usedBadge.textColor = UIColor(red: 0.02, green: 0.59, blue: 0.41, alpha: 1)
        usedBadge.backgroundColor = UIColor(red: 0.93, green: 0.99, blue: 0.96, alpha: 1)
        usedBadge.layer.cornerRadius = 6
        usedBadge.clipsToBounds = true
        usedBadge.textAlignment = .center
        usedBadge.translatesAutoresizingMaskIntoConstraints = false
        cardView.addSubview(usedBadge)

        deleteBtn.setImage(UIImage(systemName: "trash"), for: .normal)
        deleteBtn.tintColor = UIColor(red: 0.88, green: 0.11, blue: 0.28, alpha: 1)
        deleteBtn.backgroundColor = UIColor(red: 1.0, green: 0.94, blue: 0.95, alpha: 1)
        deleteBtn.layer.cornerRadius = 7
        deleteBtn.addTarget(self, action: #selector(didTapDelete), for: .touchUpInside)
        deleteBtn.translatesAutoresizingMaskIntoConstraints = false
        cardView.addSubview(deleteBtn)

        editBtn.setImage(UIImage(systemName: "pencil"), for: .normal)
        editBtn.tintColor = UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1)
        editBtn.backgroundColor = UIColor(red: 0.94, green: 0.96, blue: 1.0, alpha: 1)
        editBtn.layer.cornerRadius = 7
        editBtn.addTarget(self, action: #selector(didTapEdit), for: .touchUpInside)
        editBtn.translatesAutoresizingMaskIntoConstraints = false
        cardView.addSubview(editBtn)

        nameLabel.font = .systemFont(ofSize: 15.5, weight: .bold)
        nameLabel.textColor = UIColor(red: 0.06, green: 0.09, blue: 0.16, alpha: 1)
        nameLabel.translatesAutoresizingMaskIntoConstraints = false
        cardView.addSubview(nameLabel)

        optionsLabel.font = .systemFont(ofSize: 12, weight: .medium)
        optionsLabel.textColor = UIColor(red: 0.39, green: 0.45, blue: 0.55, alpha: 1)
        optionsLabel.numberOfLines = 2
        optionsLabel.translatesAutoresizingMaskIntoConstraints = false
        cardView.addSubview(optionsLabel)

        NSLayoutConstraint.activate([
            cardView.topAnchor.constraint(equalTo: contentView.topAnchor, constant: 6),
            cardView.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 8),
            cardView.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -8),
            cardView.bottomAnchor.constraint(equalTo: contentView.bottomAnchor, constant: -6),

            typeBadge.topAnchor.constraint(equalTo: cardView.topAnchor, constant: 12),
            typeBadge.leadingAnchor.constraint(equalTo: cardView.leadingAnchor, constant: 14),
            typeBadge.heightAnchor.constraint(equalToConstant: 24),
            typeBadge.widthAnchor.constraint(greaterThanOrEqualToConstant: 50),

            usedBadge.centerYAnchor.constraint(equalTo: typeBadge.centerYAnchor),
            usedBadge.leadingAnchor.constraint(equalTo: typeBadge.trailingAnchor, constant: 6),
            usedBadge.heightAnchor.constraint(equalToConstant: 24),
            usedBadge.widthAnchor.constraint(greaterThanOrEqualToConstant: 60),

            deleteBtn.topAnchor.constraint(equalTo: cardView.topAnchor, constant: 10),
            deleteBtn.trailingAnchor.constraint(equalTo: cardView.trailingAnchor, constant: -12),
            deleteBtn.heightAnchor.constraint(equalToConstant: 28),
            deleteBtn.widthAnchor.constraint(equalToConstant: 28),

            editBtn.topAnchor.constraint(equalTo: cardView.topAnchor, constant: 10),
            editBtn.trailingAnchor.constraint(equalTo: deleteBtn.leadingAnchor, constant: -6),
            editBtn.heightAnchor.constraint(equalToConstant: 28),
            editBtn.widthAnchor.constraint(equalToConstant: 28),

            nameLabel.topAnchor.constraint(equalTo: typeBadge.bottomAnchor, constant: 8),
            nameLabel.leadingAnchor.constraint(equalTo: cardView.leadingAnchor, constant: 14),
            nameLabel.trailingAnchor.constraint(equalTo: cardView.trailingAnchor, constant: -14),

            optionsLabel.topAnchor.constraint(equalTo: nameLabel.bottomAnchor, constant: 4),
            optionsLabel.leadingAnchor.constraint(equalTo: cardView.leadingAnchor, constant: 14),
            optionsLabel.trailingAnchor.constraint(equalTo: cardView.trailingAnchor, constant: -14),
            optionsLabel.bottomAnchor.constraint(equalTo: cardView.bottomAnchor, constant: -12)
        ])
    }

    func configure(field: TestManagementViewController.CustomFieldItem, onEdit: @escaping () -> Void, onDelete: @escaping () -> Void) {
        self.onEdit = onEdit
        self.onDelete = onDelete

        nameLabel.text = field.name
        typeBadge.text = " \(field.type) "
        usedBadge.text = " \(field.usedCount) Tests "
        if field.options.isEmpty {
            optionsLabel.text = "Layout: \(field.reportLayout) • Print on Report: \(field.printOnReport ? "Yes" : "No")"
        } else {
            optionsLabel.text = "Options: \(field.options.joined(separator: ", "))"
        }
    }

    @objc private func didTapEdit() { onEdit?() }
    @objc private func didTapDelete() { onDelete?() }
}

class HeadingCell: UITableViewCell {
    private let cardView   = UIView()
    private let orderBadge = UILabel()
    private let nameLabel  = UILabel()
    private let descLabel  = UILabel()
    private let scopeBadge = UILabel()
    private let editBtn    = UIButton(type: .system)
    private let deleteBtn  = UIButton(type: .system)

    private var onEdit: (() -> Void)?
    private var onDelete: (() -> Void)?

    override init(style: UITableViewCell.CellStyle, reuseIdentifier: String?) {
        super.init(style: style, reuseIdentifier: reuseIdentifier)
        selectionStyle = .none
        backgroundColor = .clear
        setupCard()
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    private func setupCard() {
        cardView.backgroundColor = .white
        cardView.layer.cornerRadius = 18
        cardView.layer.borderWidth = 1
        cardView.layer.borderColor = UIColor(red: 0.89, green: 0.92, blue: 0.95, alpha: 1).cgColor
        cardView.layer.shadowColor = UIColor.black.cgColor
        cardView.layer.shadowOpacity = 0.03
        cardView.layer.shadowOffset = CGSize(width: 0, height: 2)
        cardView.layer.shadowRadius = 6
        cardView.translatesAutoresizingMaskIntoConstraints = false
        contentView.addSubview(cardView)

        orderBadge.font = .systemFont(ofSize: 11.5, weight: .bold)
        orderBadge.textColor = UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1)
        orderBadge.backgroundColor = UIColor(red: 0.94, green: 0.96, blue: 1.0, alpha: 1)
        orderBadge.layer.cornerRadius = 6
        orderBadge.clipsToBounds = true
        orderBadge.textAlignment = .center
        orderBadge.translatesAutoresizingMaskIntoConstraints = false
        cardView.addSubview(orderBadge)

        scopeBadge.font = .systemFont(ofSize: 11, weight: .bold)
        scopeBadge.layer.cornerRadius = 6
        scopeBadge.clipsToBounds = true
        scopeBadge.textAlignment = .center
        scopeBadge.translatesAutoresizingMaskIntoConstraints = false
        cardView.addSubview(scopeBadge)

        deleteBtn.setImage(UIImage(systemName: "trash"), for: .normal)
        deleteBtn.tintColor = UIColor(red: 0.88, green: 0.11, blue: 0.28, alpha: 1)
        deleteBtn.backgroundColor = UIColor(red: 1.0, green: 0.94, blue: 0.95, alpha: 1)
        deleteBtn.layer.cornerRadius = 7
        deleteBtn.addTarget(self, action: #selector(didTapDelete), for: .touchUpInside)
        deleteBtn.translatesAutoresizingMaskIntoConstraints = false
        cardView.addSubview(deleteBtn)

        editBtn.setImage(UIImage(systemName: "pencil"), for: .normal)
        editBtn.tintColor = UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1)
        editBtn.backgroundColor = UIColor(red: 0.94, green: 0.96, blue: 1.0, alpha: 1)
        editBtn.layer.cornerRadius = 7
        editBtn.addTarget(self, action: #selector(didTapEdit), for: .touchUpInside)
        editBtn.translatesAutoresizingMaskIntoConstraints = false
        cardView.addSubview(editBtn)

        nameLabel.font = .systemFont(ofSize: 15.5, weight: .bold)
        nameLabel.textColor = UIColor(red: 0.06, green: 0.09, blue: 0.16, alpha: 1)
        nameLabel.translatesAutoresizingMaskIntoConstraints = false
        cardView.addSubview(nameLabel)

        descLabel.font = .systemFont(ofSize: 12, weight: .medium)
        descLabel.textColor = UIColor(red: 0.39, green: 0.45, blue: 0.55, alpha: 1)
        descLabel.numberOfLines = 2
        descLabel.translatesAutoresizingMaskIntoConstraints = false
        cardView.addSubview(descLabel)

        NSLayoutConstraint.activate([
            cardView.topAnchor.constraint(equalTo: contentView.topAnchor, constant: 6),
            cardView.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 8),
            cardView.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -8),
            cardView.bottomAnchor.constraint(equalTo: contentView.bottomAnchor, constant: -6),

            orderBadge.topAnchor.constraint(equalTo: cardView.topAnchor, constant: 12),
            orderBadge.leadingAnchor.constraint(equalTo: cardView.leadingAnchor, constant: 14),
            orderBadge.heightAnchor.constraint(equalToConstant: 24),
            orderBadge.widthAnchor.constraint(greaterThanOrEqualToConstant: 36),

            scopeBadge.centerYAnchor.constraint(equalTo: orderBadge.centerYAnchor),
            scopeBadge.leadingAnchor.constraint(equalTo: orderBadge.trailingAnchor, constant: 6),
            scopeBadge.heightAnchor.constraint(equalToConstant: 24),
            scopeBadge.widthAnchor.constraint(greaterThanOrEqualToConstant: 54),

            deleteBtn.topAnchor.constraint(equalTo: cardView.topAnchor, constant: 10),
            deleteBtn.trailingAnchor.constraint(equalTo: cardView.trailingAnchor, constant: -12),
            deleteBtn.heightAnchor.constraint(equalToConstant: 28),
            deleteBtn.widthAnchor.constraint(equalToConstant: 28),

            editBtn.topAnchor.constraint(equalTo: cardView.topAnchor, constant: 10),
            editBtn.trailingAnchor.constraint(equalTo: deleteBtn.leadingAnchor, constant: -6),
            editBtn.heightAnchor.constraint(equalToConstant: 28),
            editBtn.widthAnchor.constraint(equalToConstant: 28),

            nameLabel.topAnchor.constraint(equalTo: orderBadge.bottomAnchor, constant: 8),
            nameLabel.leadingAnchor.constraint(equalTo: cardView.leadingAnchor, constant: 14),
            nameLabel.trailingAnchor.constraint(equalTo: cardView.trailingAnchor, constant: -14),

            descLabel.topAnchor.constraint(equalTo: nameLabel.bottomAnchor, constant: 4),
            descLabel.leadingAnchor.constraint(equalTo: cardView.leadingAnchor, constant: 14),
            descLabel.trailingAnchor.constraint(equalTo: cardView.trailingAnchor, constant: -14),
            descLabel.bottomAnchor.constraint(equalTo: cardView.bottomAnchor, constant: -12)
        ])
    }

    func configure(heading: TestManagementViewController.HeadingItem, onEdit: @escaping () -> Void, onDelete: @escaping () -> Void) {
        self.onEdit = onEdit
        self.onDelete = onDelete

        orderBadge.text = " #\(heading.order) "
        nameLabel.text = heading.name
        descLabel.text = heading.desc.isEmpty ? "Report grouping section header" : heading.desc

        if heading.isGlobal {
            scopeBadge.text = " Global "
            scopeBadge.textColor = UIColor(red: 0.26, green: 0.22, blue: 0.79, alpha: 1)
            scopeBadge.backgroundColor = UIColor(red: 0.93, green: 0.94, blue: 1.0, alpha: 1)
        } else {
            scopeBadge.text = " Local "
            scopeBadge.textColor = UIColor(red: 0.02, green: 0.59, blue: 0.41, alpha: 1)
            scopeBadge.backgroundColor = UIColor(red: 0.93, green: 0.99, blue: 0.96, alpha: 1)
        }

        deleteBtn.alpha = heading.isGlobal ? 0.35 : 1.0
    }

    @objc private func didTapEdit() { onEdit?() }
    @objc private func didTapDelete() { onDelete?() }
}

class SampleTypeCell: UITableViewCell {
    private let cardView   = UIView()
    private let codeBadge  = UILabel()
    private let nameLabel  = UILabel()
    private let descLabel  = UILabel()
    private let scopeBadge = UILabel()
    private let editBtn    = UIButton(type: .system)
    private let deleteBtn  = UIButton(type: .system)

    private var onEdit: (() -> Void)?
    private var onDelete: (() -> Void)?

    override init(style: UITableViewCell.CellStyle, reuseIdentifier: String?) {
        super.init(style: style, reuseIdentifier: reuseIdentifier)
        selectionStyle = .none
        backgroundColor = .clear
        setupCard()
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    private func setupCard() {
        cardView.backgroundColor = .white
        cardView.layer.cornerRadius = 18
        cardView.layer.borderWidth = 1
        cardView.layer.borderColor = UIColor(red: 0.89, green: 0.92, blue: 0.95, alpha: 1).cgColor
        cardView.layer.shadowColor = UIColor.black.cgColor
        cardView.layer.shadowOpacity = 0.03
        cardView.layer.shadowOffset = CGSize(width: 0, height: 2)
        cardView.layer.shadowRadius = 6
        cardView.translatesAutoresizingMaskIntoConstraints = false
        contentView.addSubview(cardView)

        codeBadge.font = .systemFont(ofSize: 11.5, weight: .bold)
        codeBadge.textColor = UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1)
        codeBadge.backgroundColor = UIColor(red: 0.94, green: 0.96, blue: 1.0, alpha: 1)
        codeBadge.layer.cornerRadius = 6
        codeBadge.clipsToBounds = true
        codeBadge.textAlignment = .center
        codeBadge.translatesAutoresizingMaskIntoConstraints = false
        cardView.addSubview(codeBadge)

        scopeBadge.font = .systemFont(ofSize: 11, weight: .bold)
        scopeBadge.layer.cornerRadius = 6
        scopeBadge.clipsToBounds = true
        scopeBadge.textAlignment = .center
        scopeBadge.translatesAutoresizingMaskIntoConstraints = false
        cardView.addSubview(scopeBadge)

        deleteBtn.setImage(UIImage(systemName: "trash"), for: .normal)
        deleteBtn.tintColor = UIColor(red: 0.88, green: 0.11, blue: 0.28, alpha: 1)
        deleteBtn.backgroundColor = UIColor(red: 1.0, green: 0.94, blue: 0.95, alpha: 1)
        deleteBtn.layer.cornerRadius = 7
        deleteBtn.addTarget(self, action: #selector(didTapDelete), for: .touchUpInside)
        deleteBtn.translatesAutoresizingMaskIntoConstraints = false
        cardView.addSubview(deleteBtn)

        editBtn.setImage(UIImage(systemName: "pencil"), for: .normal)
        editBtn.tintColor = UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1)
        editBtn.backgroundColor = UIColor(red: 0.94, green: 0.96, blue: 1.0, alpha: 1)
        editBtn.layer.cornerRadius = 7
        editBtn.addTarget(self, action: #selector(didTapEdit), for: .touchUpInside)
        editBtn.translatesAutoresizingMaskIntoConstraints = false
        cardView.addSubview(editBtn)

        nameLabel.font = .systemFont(ofSize: 15.5, weight: .bold)
        nameLabel.textColor = UIColor(red: 0.06, green: 0.09, blue: 0.16, alpha: 1)
        nameLabel.translatesAutoresizingMaskIntoConstraints = false
        cardView.addSubview(nameLabel)

        descLabel.font = .systemFont(ofSize: 12, weight: .medium)
        descLabel.textColor = UIColor(red: 0.39, green: 0.45, blue: 0.55, alpha: 1)
        descLabel.numberOfLines = 2
        descLabel.translatesAutoresizingMaskIntoConstraints = false
        cardView.addSubview(descLabel)

        NSLayoutConstraint.activate([
            cardView.topAnchor.constraint(equalTo: contentView.topAnchor, constant: 6),
            cardView.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 8),
            cardView.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -8),
            cardView.bottomAnchor.constraint(equalTo: contentView.bottomAnchor, constant: -6),

            codeBadge.topAnchor.constraint(equalTo: cardView.topAnchor, constant: 12),
            codeBadge.leadingAnchor.constraint(equalTo: cardView.leadingAnchor, constant: 14),
            codeBadge.heightAnchor.constraint(equalToConstant: 24),
            codeBadge.widthAnchor.constraint(greaterThanOrEqualToConstant: 44),

            scopeBadge.centerYAnchor.constraint(equalTo: codeBadge.centerYAnchor),
            scopeBadge.leadingAnchor.constraint(equalTo: codeBadge.trailingAnchor, constant: 6),
            scopeBadge.heightAnchor.constraint(equalToConstant: 24),
            scopeBadge.widthAnchor.constraint(greaterThanOrEqualToConstant: 54),

            deleteBtn.topAnchor.constraint(equalTo: cardView.topAnchor, constant: 10),
            deleteBtn.trailingAnchor.constraint(equalTo: cardView.trailingAnchor, constant: -12),
            deleteBtn.heightAnchor.constraint(equalToConstant: 28),
            deleteBtn.widthAnchor.constraint(equalToConstant: 28),

            editBtn.topAnchor.constraint(equalTo: cardView.topAnchor, constant: 10),
            editBtn.trailingAnchor.constraint(equalTo: deleteBtn.leadingAnchor, constant: -6),
            editBtn.heightAnchor.constraint(equalToConstant: 28),
            editBtn.widthAnchor.constraint(equalToConstant: 28),

            nameLabel.topAnchor.constraint(equalTo: codeBadge.bottomAnchor, constant: 8),
            nameLabel.leadingAnchor.constraint(equalTo: cardView.leadingAnchor, constant: 14),
            nameLabel.trailingAnchor.constraint(equalTo: cardView.trailingAnchor, constant: -14),

            descLabel.topAnchor.constraint(equalTo: nameLabel.bottomAnchor, constant: 4),
            descLabel.leadingAnchor.constraint(equalTo: cardView.leadingAnchor, constant: 14),
            descLabel.trailingAnchor.constraint(equalTo: cardView.trailingAnchor, constant: -14),
            descLabel.bottomAnchor.constraint(equalTo: cardView.bottomAnchor, constant: -12)
        ])
    }

    func configure(sample: TestManagementViewController.SampleTypeItem, onEdit: @escaping () -> Void, onDelete: @escaping () -> Void) {
        self.onEdit = onEdit
        self.onDelete = onDelete

        codeBadge.text = " \(sample.code) "
        nameLabel.text = sample.name
        descLabel.text = sample.desc.isEmpty ? "Diagnostic biological specimen" : sample.desc

        if sample.isGlobal {
            scopeBadge.text = " Global "
            scopeBadge.textColor = UIColor(red: 0.26, green: 0.22, blue: 0.79, alpha: 1)
            scopeBadge.backgroundColor = UIColor(red: 0.93, green: 0.94, blue: 1.0, alpha: 1)
        } else {
            scopeBadge.text = " Local "
            scopeBadge.textColor = UIColor(red: 0.02, green: 0.59, blue: 0.41, alpha: 1)
            scopeBadge.backgroundColor = UIColor(red: 0.93, green: 0.99, blue: 0.96, alpha: 1)
        }

        deleteBtn.alpha = sample.isGlobal ? 0.35 : 1.0
    }

    @objc private func didTapEdit() { onEdit?() }
    @objc private func didTapDelete() { onDelete?() }
}

class SpecimenTubeCell: UITableViewCell {
    private let cardView     = UIView()
    private let dotCap       = UIView()
    private let nameLabel    = UILabel()
    private let codeBadge    = UILabel()
    private let additiveLabel = UILabel()
    private let usageLabel   = UILabel()

    override init(style: UITableViewCell.CellStyle, reuseIdentifier: String?) {
        super.init(style: style, reuseIdentifier: reuseIdentifier)
        selectionStyle = .none
        backgroundColor = .clear
        setupCard()
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    private func setupCard() {
        cardView.backgroundColor = .white
        cardView.layer.cornerRadius = 18
        cardView.layer.shadowColor = UIColor.black.cgColor
        cardView.layer.shadowOpacity = 0.04
        cardView.layer.shadowOffset = CGSize(width: 0, height: 2)
        cardView.layer.shadowRadius = 8
        cardView.translatesAutoresizingMaskIntoConstraints = false
        contentView.addSubview(cardView)

        dotCap.layer.cornerRadius = 6
        dotCap.translatesAutoresizingMaskIntoConstraints = false
        cardView.addSubview(dotCap)

        nameLabel.font = .systemFont(ofSize: 15.5, weight: .bold)
        nameLabel.textColor = UIColor(red: 0.06, green: 0.09, blue: 0.16, alpha: 1)
        nameLabel.translatesAutoresizingMaskIntoConstraints = false
        cardView.addSubview(nameLabel)

        codeBadge.font = .systemFont(ofSize: 11.5, weight: .bold)
        codeBadge.textColor = UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1)
        codeBadge.backgroundColor = UIColor(red: 0.94, green: 0.96, blue: 1.0, alpha: 1)
        codeBadge.layer.cornerRadius = 6
        codeBadge.clipsToBounds = true
        codeBadge.textAlignment = .center
        codeBadge.translatesAutoresizingMaskIntoConstraints = false
        cardView.addSubview(codeBadge)

        additiveLabel.font = .systemFont(ofSize: 12, weight: .medium)
        additiveLabel.textColor = UIColor(red: 0.39, green: 0.45, blue: 0.55, alpha: 1)
        additiveLabel.translatesAutoresizingMaskIntoConstraints = false
        cardView.addSubview(additiveLabel)

        usageLabel.font = .systemFont(ofSize: 12, weight: .bold)
        usageLabel.textColor = UIColor(red: 0.2, green: 0.25, blue: 0.33, alpha: 1)
        usageLabel.numberOfLines = 2
        usageLabel.translatesAutoresizingMaskIntoConstraints = false
        cardView.addSubview(usageLabel)

        NSLayoutConstraint.activate([
            cardView.topAnchor.constraint(equalTo: contentView.topAnchor, constant: 6),
            cardView.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 8),
            cardView.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -8),
            cardView.bottomAnchor.constraint(equalTo: contentView.bottomAnchor, constant: -6),

            dotCap.topAnchor.constraint(equalTo: cardView.topAnchor, constant: 16),
            dotCap.leadingAnchor.constraint(equalTo: cardView.leadingAnchor, constant: 14),
            dotCap.widthAnchor.constraint(equalToConstant: 12),
            dotCap.heightAnchor.constraint(equalToConstant: 12),

            nameLabel.centerYAnchor.constraint(equalTo: dotCap.centerYAnchor),
            nameLabel.leadingAnchor.constraint(equalTo: dotCap.trailingAnchor, constant: 8),

            codeBadge.centerYAnchor.constraint(equalTo: dotCap.centerYAnchor),
            codeBadge.trailingAnchor.constraint(equalTo: cardView.trailingAnchor, constant: -14),
            codeBadge.heightAnchor.constraint(equalToConstant: 24),
            codeBadge.widthAnchor.constraint(greaterThanOrEqualToConstant: 54),

            additiveLabel.topAnchor.constraint(equalTo: nameLabel.bottomAnchor, constant: 6),
            additiveLabel.leadingAnchor.constraint(equalTo: cardView.leadingAnchor, constant: 14),
            additiveLabel.trailingAnchor.constraint(equalTo: cardView.trailingAnchor, constant: -14),

            usageLabel.topAnchor.constraint(equalTo: additiveLabel.bottomAnchor, constant: 6),
            usageLabel.leadingAnchor.constraint(equalTo: cardView.leadingAnchor, constant: 14),
            usageLabel.trailingAnchor.constraint(equalTo: cardView.trailingAnchor, constant: -14),
            usageLabel.bottomAnchor.constraint(equalTo: cardView.bottomAnchor, constant: -14)
        ])
    }

    func configure(tube: TestManagementViewController.SpecimenTubeItem) {
        dotCap.backgroundColor = tube.capColor
        nameLabel.text = tube.name
        codeBadge.text = " \(tube.code) "
        additiveLabel.text = tube.additive
        usageLabel.text = "Used for: \(tube.usage)"
    }
}

class DepartmentCell: UITableViewCell {
    private let cardView  = UIView()
    private let nameLabel = UILabel()
    private let descLabel = UILabel()
    private let countBadge = UILabel()

    override init(style: UITableViewCell.CellStyle, reuseIdentifier: String?) {
        super.init(style: style, reuseIdentifier: reuseIdentifier)
        selectionStyle = .none
        backgroundColor = .clear
        setupCard()
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    private func setupCard() {
        cardView.backgroundColor = .white
        cardView.layer.cornerRadius = 18
        cardView.layer.shadowColor = UIColor.black.cgColor
        cardView.layer.shadowOpacity = 0.04
        cardView.layer.shadowOffset = CGSize(width: 0, height: 2)
        cardView.layer.shadowRadius = 8
        cardView.translatesAutoresizingMaskIntoConstraints = false
        contentView.addSubview(cardView)

        nameLabel.font = .systemFont(ofSize: 15.5, weight: .bold)
        nameLabel.textColor = UIColor(red: 0.06, green: 0.09, blue: 0.16, alpha: 1)
        nameLabel.translatesAutoresizingMaskIntoConstraints = false
        cardView.addSubview(nameLabel)

        countBadge.font = .systemFont(ofSize: 11.5, weight: .bold)
        countBadge.textColor = .white
        countBadge.backgroundColor = UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1)
        countBadge.layer.cornerRadius = 6
        countBadge.clipsToBounds = true
        countBadge.textAlignment = .center
        countBadge.translatesAutoresizingMaskIntoConstraints = false
        cardView.addSubview(countBadge)

        descLabel.font = .systemFont(ofSize: 12, weight: .medium)
        descLabel.textColor = UIColor(red: 0.39, green: 0.45, blue: 0.55, alpha: 1)
        descLabel.numberOfLines = 2
        descLabel.translatesAutoresizingMaskIntoConstraints = false
        cardView.addSubview(descLabel)

        NSLayoutConstraint.activate([
            cardView.topAnchor.constraint(equalTo: contentView.topAnchor, constant: 6),
            cardView.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 16),
            cardView.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -16),
            cardView.bottomAnchor.constraint(equalTo: contentView.bottomAnchor, constant: -6),

            nameLabel.topAnchor.constraint(equalTo: cardView.topAnchor, constant: 14),
            nameLabel.leadingAnchor.constraint(equalTo: cardView.leadingAnchor, constant: 14),

            countBadge.centerYAnchor.constraint(equalTo: nameLabel.centerYAnchor),
            countBadge.trailingAnchor.constraint(equalTo: cardView.trailingAnchor, constant: -14),
            countBadge.heightAnchor.constraint(equalToConstant: 24),
            countBadge.widthAnchor.constraint(greaterThanOrEqualToConstant: 64),

            descLabel.topAnchor.constraint(equalTo: nameLabel.bottomAnchor, constant: 6),
            descLabel.leadingAnchor.constraint(equalTo: cardView.leadingAnchor, constant: 14),
            descLabel.trailingAnchor.constraint(equalTo: cardView.trailingAnchor, constant: -14),
            descLabel.bottomAnchor.constraint(equalTo: cardView.bottomAnchor, constant: -14)
        ])
    }

    func configure(dept: TestManagementViewController.DepartmentItem) {
        nameLabel.text = dept.name
        descLabel.text = dept.desc
        countBadge.text = " \(dept.count) Tests "
    }
}

// ── Color Hex Extension ──────────────────────────────────────────────────────
fileprivate extension UIColor {
    convenience init?(hex: String) {
        var hexSanitized = hex.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
        if hexSanitized.hasPrefix("#") {
            hexSanitized.remove(at: hexSanitized.startIndex)
        }

        var rgb: UInt64 = 0
        guard Scanner(string: hexSanitized).scanHexInt64(&rgb) else { return nil }

        if hexSanitized.count == 6 {
            let r = CGFloat((rgb & 0xFF0000) >> 16) / 255.0
            let g = CGFloat((rgb & 0x00FF00) >> 8) / 255.0
            let b = CGFloat(rgb & 0x0000FF) / 255.0
            self.init(red: r, green: g, blue: b, alpha: 1.0)
        } else {
            return nil
        }
    }
}
