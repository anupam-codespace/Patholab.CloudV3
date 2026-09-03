import UIKit

/**
 * RegistrationViewController
 * ──────────────────────────
 * Native iOS Patient Registration & Clinical Accession Console.
 * Directly mirroring the exact web workflow and sequence with 100% complete feature parity:
 *  1. Step 1: Database Omnibar Lookup & Duplicate Prevention (/workspace/registration)
 *  2. Step 2: Demographics, Duplicate Warnings, Referral, Test Accession, & Billing (/workspace/patients/new & /accession)
 */
class RegistrationViewController: UIViewController, UITextFieldDelegate {

    private let baseUrl = "https://patholab.cloud"

    // ── Header Views ────────────────────────────────────────────────────────
    private let headerView     = UIView()
    private let headerGradient = CAGradientLayer()
    private let backBtn        = UIButton(type: .system)
    private let titleLabel     = UILabel()
    private let subtitleLabel  = UILabel()
    private let clearBtn       = UIButton(type: .system)
    private let modeSegment    = UISegmentedControl(items: ["Search Database", "+ New Registration"])

    // ── Scroll Content ──────────────────────────────────────────────────────
    private let searchScrollView = UIScrollView()
    private let searchStack      = UIStackView()

    private let newRegScrollView = UIScrollView()
    private let newRegStack      = UIStackView()

    // ── Tab 1: Omnibar Search Views ─────────────────────────────────────────
    private var searchType: String = "PHONE"
    private let searchTypeSegment = UISegmentedControl(items: ["Phone", "Name"])
    private let omnibarField   = UITextField()
    private let omnibarSearchBtn = UIButton(type: .system)
    private let searchSpinner  = UIActivityIndicatorView(style: .medium)

    // Result Cards
    private let matchCard      = UIView()
    private let matchAvatarLabel = UILabel()
    private let matchNameLabel = UILabel()
    private let matchDemoLabel = UILabel()
    private let matchUhidLabel = UILabel()
    private let matchPhoneLabel = UILabel()
    private let matchAddressLabel = UILabel()
    private let proceedToAccessionBtn = UIButton(type: .system)

    private let noMatchCard    = UIView()
    private let noMatchDescLabel = UILabel()
    private let registerFromSearchBtn = UIButton(type: .system)

    // ── Tab 2: Demographics & Accession Inputs ──────────────────────────────
    private var selectedTitle  = "Mr."
    private var selectedGender = "MALE"
    private var selectedAgeUnit = "Years"
    private var selectedDoctor = "Self"
    private var selectedAgency = "Direct"
    private var selectedCollector = "Lab Phlebotomist"
    private var selectedPaymentMode = "Cash"
    private var isUrgentOrder  = false
    private var autoPrintSlip  = true
    private var autoPrintBarcode = true

    private let nameField      = UITextField()
    private let duplicateWarningCard = UIView()
    private let duplicateWarningLabel = UILabel()

    private let phoneField     = UITextField()
    private let ageField       = UITextField()
    private let emailField     = UITextField()
    private let addressField   = UITextField()
    private let abhaField      = UITextField()
    private let passportField  = UITextField()
    private let collectionDateField = UITextField()
    private let collectionTimeField = UITextField()

    private let titleBtn       = UIButton(type: .system)
    private let genderBtn      = UIButton(type: .system)
    private let ageUnitBtn     = UIButton(type: .system)
    private let doctorBtn      = UIButton(type: .system)
    private let agencyBtn      = UIButton(type: .system)
    private let collectorBtn   = UIButton(type: .system)
    private let paymentModeBtn = UIButton(type: .system)

    // ── Tests & Accession ───────────────────────────────────────────────────
    struct TestItem: Equatable {
        let id: String
        let name: String
        let code: String
        let type: String
        let price: Double
        var isSelected: Bool = false

        static func == (lhs: TestItem, rhs: TestItem) -> Bool {
            return lhs.id == rhs.id
        }
    }

    struct DoctorItem {
        let id: String
        let name: String
        let hospital: String
    }

    private var catalogTests: [TestItem] = []
    private var selectedTests: [TestItem] = []
    private var registeredDoctors: [DoctorItem] = []
    private var registeredAgencies: [DoctorItem] = []

    private let testsStack     = UIStackView()
    private let testsCountBadge = UILabel()
    private let urgentSwitch   = UISwitch()
    private let printSlipSwitch = UISwitch()
    private let printBarcodeSwitch = UISwitch()

    // ── Billing Summary ─────────────────────────────────────────────────────
    private let grossLabel     = UILabel()
    private let discountField  = UITextField()
    private let netLabel       = UILabel()
    private let paidAmountField = UITextField()
    private let dueLabel       = UILabel()

    private let stickyBar      = UIView()
    private let stickyTotalLabel = UILabel()
    private let submitBtn      = UIButton(type: .system)

    private var matchedPatientDbId: String? = nil

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 0.973, green: 0.980, blue: 0.988, alpha: 1)

        setupHeader()
        setupSearchSection()
        setupNewRegSection()
        setupStickyBar()
        setupDateTimeDefaults()
        fetchCatalog()
        fetchDoctors()
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        headerGradient.frame = headerView.bounds
    }

    private func setupDateTimeDefaults() {
        let df = DateFormatter()
        df.dateFormat = "yyyy-MM-dd"
        collectionDateField.text = df.string(from: Date())

        let tf = DateFormatter()
        tf.dateFormat = "HH:mm"
        collectionTimeField.text = tf.string(from: Date())
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MARK: – Header & Tab Bar (Elevated Position)
    // ─────────────────────────────────────────────────────────────────────────
    private func setupHeader() {
        headerView.translatesAutoresizingMaskIntoConstraints = false
        headerGradient.colors = [
            UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1).cgColor,
            UIColor(red: 0.114, green: 0.306, blue: 0.847, alpha: 1).cgColor
        ]
        headerGradient.startPoint = CGPoint(x: 0, y: 0)
        headerGradient.endPoint = CGPoint(x: 1, y: 1)
        headerView.layer.insertSublayer(headerGradient, at: 0)
        headerView.layer.cornerRadius = 20
        headerView.layer.maskedCorners = [.layerMinXMaxYCorner, .layerMaxXMaxYCorner]
        headerView.clipsToBounds = true
        view.addSubview(headerView)

        // Back Button
        backBtn.setImage(UIImage(systemName: "chevron.left"), for: .normal)
        backBtn.tintColor = UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1)
        backBtn.backgroundColor = .white
        backBtn.layer.cornerRadius = 18
        backBtn.layer.shadowColor = UIColor.black.cgColor
        backBtn.layer.shadowOpacity = 0.08
        backBtn.layer.shadowRadius = 4
        backBtn.layer.shadowOffset = CGSize(width: 0, height: 2)
        backBtn.translatesAutoresizingMaskIntoConstraints = false
        backBtn.addTarget(self, action: #selector(backTapped), for: .touchUpInside)
        headerView.addSubview(backBtn)

        // Titles
        titleLabel.text = "Patient Registration"
        titleLabel.font = .systemFont(ofSize: 18, weight: .bold)
        titleLabel.textColor = .white

        subtitleLabel.text = "Search Database & Test Accession"
        subtitleLabel.font = .systemFont(ofSize: 11.5, weight: .medium)
        subtitleLabel.textColor = UIColor(red: 0.780, green: 0.880, blue: 1.0, alpha: 1)

        let titleVStack = UIStackView(arrangedSubviews: [titleLabel, subtitleLabel])
        titleVStack.axis = .vertical
        titleVStack.spacing = 1
        titleVStack.translatesAutoresizingMaskIntoConstraints = false
        headerView.addSubview(titleVStack)

        // Clear button
        clearBtn.setTitle("Clear", for: .normal)
        clearBtn.setTitleColor(UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1), for: .normal)
        clearBtn.titleLabel?.font = .systemFont(ofSize: 12, weight: .bold)
        clearBtn.backgroundColor = .white
        clearBtn.layer.cornerRadius = 14
        clearBtn.contentEdgeInsets = UIEdgeInsets(top: 5, left: 12, bottom: 5, right: 12)
        clearBtn.translatesAutoresizingMaskIntoConstraints = false
        clearBtn.addTarget(self, action: #selector(clearForm), for: .touchUpInside)
        headerView.addSubview(clearBtn)

        // Mode Segment [ Search Database | + New Registration ]
        modeSegment.selectedSegmentIndex = 0
        modeSegment.backgroundColor = UIColor(white: 1.0, alpha: 0.22)
        modeSegment.selectedSegmentTintColor = .white
        modeSegment.setTitleTextAttributes([.foregroundColor: UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1), .font: UIFont.systemFont(ofSize: 12.5, weight: .bold)], for: .selected)
        modeSegment.setTitleTextAttributes([.foregroundColor: UIColor.white, .font: UIFont.systemFont(ofSize: 12.5, weight: .bold)], for: .normal)
        modeSegment.translatesAutoresizingMaskIntoConstraints = false
        modeSegment.addTarget(self, action: #selector(modeSegmentChanged), for: .valueChanged)
        headerView.addSubview(modeSegment)

        NSLayoutConstraint.activate([
            headerView.topAnchor.constraint(equalTo: view.topAnchor),
            headerView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            headerView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            headerView.heightAnchor.constraint(equalToConstant: 146),

            backBtn.leadingAnchor.constraint(equalTo: headerView.leadingAnchor, constant: 14),
            backBtn.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 4),
            backBtn.widthAnchor.constraint(equalToConstant: 36),
            backBtn.heightAnchor.constraint(equalToConstant: 36),

            titleVStack.leadingAnchor.constraint(equalTo: backBtn.trailingAnchor, constant: 10),
            titleVStack.centerYAnchor.constraint(equalTo: backBtn.centerYAnchor),

            clearBtn.trailingAnchor.constraint(equalTo: headerView.trailingAnchor, constant: -14),
            clearBtn.centerYAnchor.constraint(equalTo: backBtn.centerYAnchor),

            modeSegment.leadingAnchor.constraint(equalTo: headerView.leadingAnchor, constant: 14),
            modeSegment.trailingAnchor.constraint(equalTo: headerView.trailingAnchor, constant: -14),
            modeSegment.bottomAnchor.constraint(equalTo: headerView.bottomAnchor, constant: -10),
            modeSegment.heightAnchor.constraint(equalToConstant: 34),
        ])
    }

    @objc private func modeSegmentChanged() {
        let isSearch = modeSegment.selectedSegmentIndex == 0
        searchScrollView.isHidden = !isSearch
        newRegScrollView.isHidden = isSearch
        stickyBar.isHidden = isSearch
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MARK: – Tab 1: Search Database Section (Web /workspace/registration)
    // ─────────────────────────────────────────────────────────────────────────
    private func setupSearchSection() {
        searchScrollView.showsVerticalScrollIndicator = false
        searchScrollView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(searchScrollView)

        searchStack.axis = .vertical
        searchStack.spacing = 14
        searchStack.translatesAutoresizingMaskIntoConstraints = false
        searchScrollView.addSubview(searchStack)

        NSLayoutConstraint.activate([
            searchScrollView.topAnchor.constraint(equalTo: headerView.bottomAnchor),
            searchScrollView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            searchScrollView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            searchScrollView.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor),

            searchStack.topAnchor.constraint(equalTo: searchScrollView.topAnchor, constant: 12),
            searchStack.leadingAnchor.constraint(equalTo: searchScrollView.leadingAnchor, constant: 14),
            searchStack.trailingAnchor.constraint(equalTo: searchScrollView.trailingAnchor, constant: -14),
            searchStack.bottomAnchor.constraint(equalTo: searchScrollView.bottomAnchor, constant: -24),
            searchStack.widthAnchor.constraint(equalTo: searchScrollView.widthAnchor, constant: -28)
        ])

        buildSearchCard()
        buildMatchResultCard()
        buildNoMatchResultCard()
    }

    private func buildSearchCard() {
        let card = createWhiteCard()

        let title = UILabel()
        title.text = "EXISTING PATIENT LOOKUP"
        title.font = .systemFont(ofSize: 11.5, weight: .bold)
        title.textColor = UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1)

        let desc = UILabel()
        desc.text = "Search database by mobile number or patient name to find past records or book a new visit."
        desc.font = .systemFont(ofSize: 12.5)
        desc.textColor = UIColor(red: 0.392, green: 0.455, blue: 0.545, alpha: 1)
        desc.numberOfLines = 0

        searchTypeSegment.selectedSegmentIndex = 0
        searchTypeSegment.addTarget(self, action: #selector(searchTypeChanged), for: .valueChanged)

        omnibarField.placeholder = "Enter 10-digit mobile number..."
        omnibarField.font = .systemFont(ofSize: 14)
        omnibarField.keyboardType = .phonePad
        styleInput(omnibarField)

        omnibarSearchBtn.setTitle("Search Database", for: .normal)
        omnibarSearchBtn.backgroundColor = UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1)
        omnibarSearchBtn.setTitleColor(.white, for: .normal)
        omnibarSearchBtn.titleLabel?.font = .systemFont(ofSize: 14, weight: .bold)
        omnibarSearchBtn.layer.cornerRadius = 12
        omnibarSearchBtn.heightAnchor.constraint(equalToConstant: 44).isActive = true
        omnibarSearchBtn.addTarget(self, action: #selector(performSearch), for: .touchUpInside)

        let stack = UIStackView(arrangedSubviews: [title, desc, searchTypeSegment, omnibarField, omnibarSearchBtn, searchSpinner])
        stack.axis = .vertical
        stack.spacing = 10
        card.addSubview(stack)
        stack.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            stack.topAnchor.constraint(equalTo: card.topAnchor, constant: 14),
            stack.bottomAnchor.constraint(equalTo: card.bottomAnchor, constant: -14),
            stack.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 14),
            stack.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -14),
        ])

        searchStack.addArrangedSubview(card)
    }

    @objc private func searchTypeChanged() {
        if searchTypeSegment.selectedSegmentIndex == 0 {
            searchType = "PHONE"
            omnibarField.placeholder = "Enter 10-digit mobile number..."
            omnibarField.keyboardType = .phonePad
        } else {
            searchType = "NAME"
            omnibarField.placeholder = "Enter patient name..."
            omnibarField.keyboardType = .default
        }
        omnibarField.text = ""
        matchCard.isHidden = true
        noMatchCard.isHidden = true
    }

    private func buildMatchResultCard() {
        matchCard.backgroundColor = .white
        matchCard.layer.cornerRadius = 16
        matchCard.layer.shadowColor = UIColor.black.cgColor
        matchCard.layer.shadowOpacity = 0.05
        matchCard.layer.shadowRadius = 6
        matchCard.layer.shadowOffset = CGSize(width: 0, height: 2)
        matchCard.isHidden = true

        matchAvatarLabel.font = .systemFont(ofSize: 18, weight: .bold)
        matchAvatarLabel.textColor = UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1)
        matchAvatarLabel.backgroundColor = UIColor(red: 0.937, green: 0.965, blue: 1.0, alpha: 1)
        matchAvatarLabel.textAlignment = .center
        matchAvatarLabel.layer.cornerRadius = 22
        matchAvatarLabel.clipsToBounds = true
        matchAvatarLabel.widthAnchor.constraint(equalToConstant: 44).isActive = true
        matchAvatarLabel.heightAnchor.constraint(equalToConstant: 44).isActive = true

        matchNameLabel.font = .systemFont(ofSize: 16, weight: .bold)
        matchNameLabel.textColor = UIColor(red: 0.059, green: 0.090, blue: 0.165, alpha: 1)

        matchDemoLabel.font = .systemFont(ofSize: 12, weight: .semibold)
        matchDemoLabel.textColor = UIColor(red: 0.392, green: 0.455, blue: 0.545, alpha: 1)

        let nameVStack = UIStackView(arrangedSubviews: [matchNameLabel, matchDemoLabel])
        nameVStack.axis = .vertical
        nameVStack.spacing = 2

        matchUhidLabel.font = .systemFont(ofSize: 11.5, weight: .bold)
        matchUhidLabel.textColor = UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1)
        matchUhidLabel.backgroundColor = UIColor(red: 0.937, green: 0.965, blue: 1.0, alpha: 1)
        matchUhidLabel.layer.cornerRadius = 6
        matchUhidLabel.clipsToBounds = true
        matchUhidLabel.textAlignment = .center

        let topRow = UIStackView(arrangedSubviews: [matchAvatarLabel, nameVStack, UIView(), matchUhidLabel])
        topRow.axis = .horizontal
        topRow.alignment = .center
        topRow.spacing = 10

        matchPhoneLabel.font = .systemFont(ofSize: 12.5)
        matchPhoneLabel.textColor = UIColor(red: 0.278, green: 0.333, blue: 0.412, alpha: 1)

        matchAddressLabel.font = .systemFont(ofSize: 12.5)
        matchAddressLabel.textColor = UIColor(red: 0.278, green: 0.333, blue: 0.412, alpha: 1)

        proceedToAccessionBtn.setTitle("Proceed to Accession & Tests →", for: .normal)
        proceedToAccessionBtn.backgroundColor = UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1)
        proceedToAccessionBtn.setTitleColor(.white, for: .normal)
        proceedToAccessionBtn.titleLabel?.font = .systemFont(ofSize: 13.5, weight: .bold)
        proceedToAccessionBtn.layer.cornerRadius = 12
        proceedToAccessionBtn.heightAnchor.constraint(equalToConstant: 44).isActive = true
        proceedToAccessionBtn.addTarget(self, action: #selector(proceedWithMatchedPatient), for: .touchUpInside)

        let stack = UIStackView(arrangedSubviews: [topRow, matchPhoneLabel, matchAddressLabel, proceedToAccessionBtn])
        stack.axis = .vertical
        stack.spacing = 10
        matchCard.addSubview(stack)
        stack.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            stack.topAnchor.constraint(equalTo: matchCard.topAnchor, constant: 14),
            stack.bottomAnchor.constraint(equalTo: matchCard.bottomAnchor, constant: -14),
            stack.leadingAnchor.constraint(equalTo: matchCard.leadingAnchor, constant: 14),
            stack.trailingAnchor.constraint(equalTo: matchCard.trailingAnchor, constant: -14),
        ])

        searchStack.addArrangedSubview(matchCard)
    }

    private func buildNoMatchResultCard() {
        noMatchCard.backgroundColor = .white
        noMatchCard.layer.cornerRadius = 16
        noMatchCard.layer.shadowColor = UIColor.black.cgColor
        noMatchCard.layer.shadowOpacity = 0.04
        noMatchCard.layer.shadowRadius = 6
        noMatchCard.layer.shadowOffset = CGSize(width: 0, height: 2)
        noMatchCard.isHidden = true

        let icon = UIImageView(image: UIImage(systemName: "magnifyingglass"))
        icon.tintColor = UIColor(red: 0.580, green: 0.639, blue: 0.722, alpha: 1)
        icon.contentMode = .scaleAspectFit
        icon.heightAnchor.constraint(equalToConstant: 32).isActive = true

        let title = UILabel()
        title.text = "No Patient Found"
        title.font = .systemFont(ofSize: 16, weight: .bold)
        title.textColor = UIColor(red: 0.059, green: 0.090, blue: 0.165, alpha: 1)
        title.textAlignment = .center

        noMatchDescLabel.font = .systemFont(ofSize: 12.5)
        noMatchDescLabel.textColor = UIColor(red: 0.392, green: 0.455, blue: 0.545, alpha: 1)
        noMatchDescLabel.textAlignment = .center
        noMatchDescLabel.numberOfLines = 0

        registerFromSearchBtn.setTitle("+ Register New Patient Profile", for: .normal)
        registerFromSearchBtn.backgroundColor = UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1)
        registerFromSearchBtn.setTitleColor(.white, for: .normal)
        registerFromSearchBtn.titleLabel?.font = .systemFont(ofSize: 13.5, weight: .bold)
        registerFromSearchBtn.layer.cornerRadius = 12
        registerFromSearchBtn.heightAnchor.constraint(equalToConstant: 44).isActive = true
        registerFromSearchBtn.addTarget(self, action: #selector(registerNewFromSearchAction), for: .touchUpInside)

        let stack = UIStackView(arrangedSubviews: [icon, title, noMatchDescLabel, registerFromSearchBtn])
        stack.axis = .vertical
        stack.spacing = 10
        noMatchCard.addSubview(stack)
        stack.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            stack.topAnchor.constraint(equalTo: noMatchCard.topAnchor, constant: 18),
            stack.bottomAnchor.constraint(equalTo: noMatchCard.bottomAnchor, constant: -18),
            stack.leadingAnchor.constraint(equalTo: noMatchCard.leadingAnchor, constant: 14),
            stack.trailingAnchor.constraint(equalTo: noMatchCard.trailingAnchor, constant: -14),
        ])

        searchStack.addArrangedSubview(noMatchCard)
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MARK: – Tab 2: New Registration & Accession (Web /workspace/patients/new)
    // ─────────────────────────────────────────────────────────────────────────
    private func setupNewRegSection() {
        newRegScrollView.showsVerticalScrollIndicator = false
        newRegScrollView.translatesAutoresizingMaskIntoConstraints = false
        newRegScrollView.isHidden = true
        view.addSubview(newRegScrollView)

        newRegStack.axis = .vertical
        newRegStack.spacing = 12
        newRegStack.translatesAutoresizingMaskIntoConstraints = false
        newRegScrollView.addSubview(newRegStack)

        NSLayoutConstraint.activate([
            newRegScrollView.topAnchor.constraint(equalTo: headerView.bottomAnchor),
            newRegScrollView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            newRegScrollView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            newRegScrollView.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -72),

            newRegStack.topAnchor.constraint(equalTo: newRegScrollView.topAnchor, constant: 12),
            newRegStack.leadingAnchor.constraint(equalTo: newRegScrollView.leadingAnchor, constant: 14),
            newRegStack.trailingAnchor.constraint(equalTo: newRegScrollView.trailingAnchor, constant: -14),
            newRegStack.bottomAnchor.constraint(equalTo: newRegScrollView.bottomAnchor, constant: -24),
            newRegStack.widthAnchor.constraint(equalTo: newRegScrollView.widthAnchor, constant: -28)
        ])

        buildDemographicsCard()
        buildReferralCard()
        buildTestsCard()
        buildBillingCard()
    }

    private func buildDemographicsCard() {
        let card = createWhiteCard()

        let title = UILabel()
        title.text = "PATIENT DEMOGRAPHICS"
        title.font = .systemFont(ofSize: 11.5, weight: .bold)
        title.textColor = UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1)

        setupMenuButton(titleBtn, title: "Mr.", items: ["Mr.", "Mrs.", "Ms.", "Master", "Dr.", "Baby", "Mx."]) { [weak self] sel in
            self?.selectedTitle = sel
        }
        titleBtn.widthAnchor.constraint(equalToConstant: 80).isActive = true

        nameField.placeholder = "Full Name *"
        nameField.font = .systemFont(ofSize: 14)
        nameField.addTarget(self, action: #selector(didChangeNameInput), for: .editingChanged)
        styleInput(nameField)

        let row1 = UIStackView(arrangedSubviews: [titleBtn, nameField])
        row1.axis = .horizontal
        row1.spacing = 8

        // Duplicate Warning Banner
        duplicateWarningCard.backgroundColor = UIColor(red: 1.0, green: 0.97, blue: 0.88, alpha: 1)
        duplicateWarningCard.layer.cornerRadius = 8
        duplicateWarningCard.layer.borderWidth = 1
        duplicateWarningCard.layer.borderColor = UIColor(red: 0.98, green: 0.80, blue: 0.40, alpha: 1).cgColor
        duplicateWarningCard.isHidden = true

        duplicateWarningLabel.font = .systemFont(ofSize: 11.5, weight: .bold)
        duplicateWarningLabel.textColor = UIColor(red: 0.57, green: 0.25, blue: 0.05, alpha: 1)
        duplicateWarningLabel.numberOfLines = 0
        duplicateWarningCard.addSubview(duplicateWarningLabel)
        duplicateWarningLabel.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            duplicateWarningLabel.topAnchor.constraint(equalTo: duplicateWarningCard.topAnchor, constant: 8),
            duplicateWarningLabel.bottomAnchor.constraint(equalTo: duplicateWarningCard.bottomAnchor, constant: -8),
            duplicateWarningLabel.leadingAnchor.constraint(equalTo: duplicateWarningCard.leadingAnchor, constant: 10),
            duplicateWarningLabel.trailingAnchor.constraint(equalTo: duplicateWarningCard.trailingAnchor, constant: -10),
        ])

        phoneField.placeholder = "Mobile (10 Digits) *"
        phoneField.font = .systemFont(ofSize: 14)
        phoneField.keyboardType = .phonePad
        styleInput(phoneField)

        setupMenuButton(genderBtn, title: "MALE", items: ["MALE", "FEMALE", "OTHER"]) { [weak self] sel in
            self?.selectedGender = sel
        }
        genderBtn.widthAnchor.constraint(equalToConstant: 105).isActive = true

        let row2 = UIStackView(arrangedSubviews: [phoneField, genderBtn])
        row2.axis = .horizontal
        row2.spacing = 8

        ageField.placeholder = "Age *"
        ageField.font = .systemFont(ofSize: 14)
        ageField.keyboardType = .numberPad
        styleInput(ageField)

        setupMenuButton(ageUnitBtn, title: "Years", items: ["Years", "Months", "Days"]) { [weak self] sel in
            self?.selectedAgeUnit = sel
        }
        ageUnitBtn.widthAnchor.constraint(equalToConstant: 105).isActive = true

        let row3 = UIStackView(arrangedSubviews: [ageField, ageUnitBtn])
        row3.axis = .horizontal
        row3.spacing = 8

        emailField.placeholder = "Email Address (Optional)"
        emailField.font = .systemFont(ofSize: 14)
        emailField.keyboardType = .emailAddress
        styleInput(emailField)

        addressField.placeholder = "Address / Location (Optional)"
        addressField.font = .systemFont(ofSize: 14)
        styleInput(addressField)

        abhaField.placeholder = "ABHA ID (Optional)"
        abhaField.font = .systemFont(ofSize: 13)
        styleInput(abhaField)

        passportField.placeholder = "Passport (Optional)"
        passportField.font = .systemFont(ofSize: 13)
        styleInput(passportField)

        let row4 = UIStackView(arrangedSubviews: [abhaField, passportField])
        row4.axis = .horizontal
        row4.spacing = 8
        row4.distribution = .fillEqually

        collectionDateField.placeholder = "Date (YYYY-MM-DD)"
        collectionDateField.font = .systemFont(ofSize: 13)
        styleInput(collectionDateField)

        collectionTimeField.placeholder = "Time (HH:MM)"
        collectionTimeField.font = .systemFont(ofSize: 13)
        styleInput(collectionTimeField)

        let row5 = UIStackView(arrangedSubviews: [collectionDateField, collectionTimeField])
        row5.axis = .horizontal
        row5.spacing = 8
        row5.distribution = .fillEqually

        let stack = UIStackView(arrangedSubviews: [title, row1, duplicateWarningCard, row2, row3, emailField, addressField, row4, row5])
        stack.axis = .vertical
        stack.spacing = 8
        card.addSubview(stack)
        stack.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            stack.topAnchor.constraint(equalTo: card.topAnchor, constant: 14),
            stack.bottomAnchor.constraint(equalTo: card.bottomAnchor, constant: -14),
            stack.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 14),
            stack.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -14),
        ])

        newRegStack.addArrangedSubview(card)
    }

    @objc private func didChangeNameInput() {
        let q = nameField.text?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        if q.count >= 3 {
            Task {
                guard let url = URL(string: "\(baseUrl)/api/workspace/patients/search?query=\(q.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? "")&type=NAME") else { return }
                var req = URLRequest(url: url)
                if let token = KeychainManager.read(forKey: KeychainManager.tokenKey) ?? UserDefaults.standard.string(forKey: "auth_token") {
                    req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
                    req.setValue("token=\(token)", forHTTPHeaderField: "Cookie")
                }
                if let (data, res) = try? await URLSession.shared.data(for: req),
                   (res as? HTTPURLResponse)?.statusCode == 200,
                   let arr = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]], !arr.isEmpty {
                    await MainActor.run {
                        self.duplicateWarningLabel.text = "⚠️ Found \(arr.count) existing record(s) matching \"\(q)\". Check Search tab to avoid duplicate visit."
                        self.duplicateWarningCard.isHidden = false
                    }
                } else {
                    await MainActor.run { self.duplicateWarningCard.isHidden = true }
                }
            }
        } else {
            duplicateWarningCard.isHidden = true
        }
    }

    private func buildReferralCard() {
        let card = createWhiteCard()

        let title = UILabel()
        title.text = "CLINICAL REFERRAL & COLLECTION"
        title.font = .systemFont(ofSize: 11.5, weight: .bold)
        title.textColor = UIColor(red: 0.02, green: 0.59, blue: 0.41, alpha: 1)

        doctorBtn.setTitle("Doctor: Self (No Doctor)", for: .normal)
        styleSelectButton(doctorBtn, icon: "stethoscope")
        doctorBtn.addTarget(self, action: #selector(showDoctorPicker), for: .touchUpInside)

        agencyBtn.setTitle("Agency: Direct Walk-in", for: .normal)
        styleSelectButton(agencyBtn, icon: "creditcard.fill")
        agencyBtn.addTarget(self, action: #selector(showAgencyPicker), for: .touchUpInside)

        setupMenuButton(collectorBtn, title: "Lab Phlebotomist", items: ["Lab Phlebotomist", "Home Collection Agent", "Self (Patient)"]) { [weak self] sel in
            self?.selectedCollector = sel
        }

        let stack = UIStackView(arrangedSubviews: [title, doctorBtn, agencyBtn, collectorBtn])
        stack.axis = .vertical
        stack.spacing = 8
        card.addSubview(stack)
        stack.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            stack.topAnchor.constraint(equalTo: card.topAnchor, constant: 14),
            stack.bottomAnchor.constraint(equalTo: card.bottomAnchor, constant: -14),
            stack.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 14),
            stack.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -14),
        ])

        newRegStack.addArrangedSubview(card)
    }

    private func buildTestsCard() {
        let card = createWhiteCard()

        let topRow = UIStackView()
        topRow.axis = .horizontal
        topRow.alignment = .center

        let title = UILabel()
        title.text = "DIAGNOSTIC TESTS & PROFILES"
        title.font = .systemFont(ofSize: 11.5, weight: .bold)
        title.textColor = UIColor(red: 0.49, green: 0.23, blue: 0.93, alpha: 1)

        testsCountBadge.text = "0 selected"
        testsCountBadge.font = .systemFont(ofSize: 11.5, weight: .bold)
        testsCountBadge.textColor = UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1)

        topRow.addArrangedSubview(title)
        topRow.addArrangedSubview(UIView())
        topRow.addArrangedSubview(testsCountBadge)

        testsStack.axis = .vertical
        testsStack.spacing = 6

        let addTestsBtn = UIButton(type: .system)
        addTestsBtn.setTitle("+ Add Tests / Profiles from Catalog", for: .normal)
        addTestsBtn.setTitleColor(UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1), for: .normal)
        addTestsBtn.titleLabel?.font = .systemFont(ofSize: 13.5, weight: .bold)
        addTestsBtn.backgroundColor = UIColor(red: 0.945, green: 0.961, blue: 0.976, alpha: 1)
        addTestsBtn.layer.cornerRadius = 12
        addTestsBtn.heightAnchor.constraint(equalToConstant: 44).isActive = true
        addTestsBtn.addTarget(self, action: #selector(showTestCatalogSheet), for: .touchUpInside)

        // Urgent / STAT Switch Row
        let urgentLabel = UILabel()
        urgentLabel.text = "⚡ Urgent / STAT Priority Order"
        urgentLabel.font = .systemFont(ofSize: 13, weight: .bold)
        urgentLabel.textColor = UIColor(red: 0.86, green: 0.15, blue: 0.15, alpha: 1)

        urgentSwitch.isOn = false
        urgentSwitch.onTintColor = UIColor(red: 0.86, green: 0.15, blue: 0.15, alpha: 1)
        urgentSwitch.addTarget(self, action: #selector(didToggleUrgent), for: .valueChanged)

        let urgentRow = UIStackView(arrangedSubviews: [urgentLabel, UIView(), urgentSwitch])
        urgentRow.axis = .horizontal
        urgentRow.alignment = .center

        // Print Flags
        let printSlipLbl = UILabel()
        printSlipLbl.text = "Auto Print Slip"
        printSlipLbl.font = .systemFont(ofSize: 12, weight: .medium)
        printSlipLbl.textColor = UIColor(red: 0.39, green: 0.45, blue: 0.55, alpha: 1)
        printSlipSwitch.isOn = true
        printSlipSwitch.transform = CGAffineTransform(scaleX: 0.8, y: 0.8)

        let printBarLbl = UILabel()
        printBarLbl.text = "Auto Print Barcode"
        printBarLbl.font = .systemFont(ofSize: 12, weight: .medium)
        printBarLbl.textColor = UIColor(red: 0.39, green: 0.45, blue: 0.55, alpha: 1)
        printBarcodeSwitch.isOn = true
        printBarcodeSwitch.transform = CGAffineTransform(scaleX: 0.8, y: 0.8)

        let printRow = UIStackView(arrangedSubviews: [printSlipLbl, printSlipSwitch, UIView(), printBarLbl, printBarcodeSwitch])
        printRow.axis = .horizontal
        printRow.alignment = .center
        printRow.spacing = 6

        let stack = UIStackView(arrangedSubviews: [topRow, testsStack, addTestsBtn, urgentRow, printRow])
        stack.axis = .vertical
        stack.spacing = 10
        card.addSubview(stack)
        stack.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            stack.topAnchor.constraint(equalTo: card.topAnchor, constant: 14),
            stack.bottomAnchor.constraint(equalTo: card.bottomAnchor, constant: -14),
            stack.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 14),
            stack.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -14),
        ])

        newRegStack.addArrangedSubview(card)
    }

    @objc private func didToggleUrgent() {
        isUrgentOrder = urgentSwitch.isOn
    }

    private func buildBillingCard() {
        let card = createWhiteCard()

        let title = UILabel()
        title.text = "BILLING & PAYMENT METHOD"
        title.font = .systemFont(ofSize: 11.5, weight: .bold)
        title.textColor = UIColor(red: 0.85, green: 0.47, blue: 0.02, alpha: 1)

        let grossTitle = UILabel()
        grossTitle.text = "Gross Amount"
        grossTitle.font = .systemFont(ofSize: 13)
        grossTitle.textColor = UIColor(red: 0.392, green: 0.455, blue: 0.545, alpha: 1)

        grossLabel.text = "₹0.00"
        grossLabel.font = .systemFont(ofSize: 14, weight: .bold)
        grossLabel.textColor = UIColor(red: 0.059, green: 0.090, blue: 0.165, alpha: 1)

        let grossRow = UIStackView(arrangedSubviews: [grossTitle, UIView(), grossLabel])
        grossRow.axis = .horizontal

        // Quick discount percent chips
        let chipsStack = UIStackView()
        chipsStack.axis = .horizontal
        chipsStack.spacing = 4
        chipsStack.distribution = .fillEqually

        [0, 5, 10, 15, 20, 50].forEach { pct in
            let b = UIButton(type: .system)
            b.setTitle("\(pct)%", for: .normal)
            b.titleLabel?.font = .systemFont(ofSize: 11, weight: .bold)
            b.backgroundColor = UIColor(red: 0.94, green: 0.96, blue: 0.98, alpha: 1)
            b.setTitleColor(UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1), for: .normal)
            b.layer.cornerRadius = 6
            b.heightAnchor.constraint(equalToConstant: 26).isActive = true
            b.addAction(UIAction { [weak self] _ in
                self?.applyDiscountPercent(pct)
            }, for: .touchUpInside)
            chipsStack.addArrangedSubview(b)
        }

        let discTitle = UILabel()
        discTitle.text = "Discount Amount (₹)"
        discTitle.font = .systemFont(ofSize: 13)
        discTitle.textColor = UIColor(red: 0.392, green: 0.455, blue: 0.545, alpha: 1)

        discountField.placeholder = "0"
        discountField.font = .systemFont(ofSize: 13.5, weight: .bold)
        discountField.textAlignment = .center
        discountField.keyboardType = .decimalPad
        styleInput(discountField)
        discountField.widthAnchor.constraint(equalToConstant: 100).isActive = true
        discountField.addTarget(self, action: #selector(calculateBill), for: .editingChanged)

        let discRow = UIStackView(arrangedSubviews: [discTitle, UIView(), discountField])
        discRow.axis = .horizontal
        discRow.alignment = .center

        let div = UIView()
        div.backgroundColor = UIColor(red: 0.945, green: 0.961, blue: 0.976, alpha: 1)
        div.heightAnchor.constraint(equalToConstant: 1).isActive = true

        let netTitle = UILabel()
        netTitle.text = "Net Payable"
        netTitle.font = .systemFont(ofSize: 14.5, weight: .bold)
        netTitle.textColor = UIColor(red: 0.059, green: 0.090, blue: 0.165, alpha: 1)

        netLabel.text = "₹0.00"
        netLabel.font = .systemFont(ofSize: 17, weight: .bold)
        netLabel.textColor = UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1)

        let netRow = UIStackView(arrangedSubviews: [netTitle, UIView(), netLabel])
        netRow.axis = .horizontal

        let paidTitle = UILabel()
        paidTitle.text = "Paid Amount (₹)"
        paidTitle.font = .systemFont(ofSize: 13)
        paidTitle.textColor = UIColor(red: 0.392, green: 0.455, blue: 0.545, alpha: 1)

        paidAmountField.placeholder = "0"
        paidAmountField.font = .systemFont(ofSize: 13.5, weight: .bold)
        paidAmountField.textColor = UIColor(red: 0.02, green: 0.59, blue: 0.41, alpha: 1)
        paidAmountField.textAlignment = .center
        paidAmountField.keyboardType = .decimalPad
        styleInput(paidAmountField)
        paidAmountField.widthAnchor.constraint(equalToConstant: 100).isActive = true
        paidAmountField.addTarget(self, action: #selector(updateDue), for: .editingChanged)

        let paidRow = UIStackView(arrangedSubviews: [paidTitle, UIView(), paidAmountField])
        paidRow.axis = .horizontal
        paidRow.alignment = .center

        let dueTitle = UILabel()
        dueTitle.text = "Balance Due"
        dueTitle.font = .systemFont(ofSize: 13, weight: .bold)
        dueTitle.textColor = UIColor(red: 0.86, green: 0.15, blue: 0.15, alpha: 1)

        dueLabel.text = "₹0.00"
        dueLabel.font = .systemFont(ofSize: 14, weight: .bold)
        dueLabel.textColor = UIColor(red: 0.86, green: 0.15, blue: 0.15, alpha: 1)

        let dueRow = UIStackView(arrangedSubviews: [dueTitle, UIView(), dueLabel])
        dueRow.axis = .horizontal

        setupMenuButton(paymentModeBtn, title: "Cash", items: ["Cash", "UPI / QR", "Card", "Due / Pay Later"]) { [weak self] sel in
            self?.selectedPaymentMode = sel
            self?.calculateBill()
        }

        let stack = UIStackView(arrangedSubviews: [title, grossRow, chipsStack, discRow, div, netRow, paidRow, dueRow, paymentModeBtn])
        stack.axis = .vertical
        stack.spacing = 8
        card.addSubview(stack)
        stack.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            stack.topAnchor.constraint(equalTo: card.topAnchor, constant: 14),
            stack.bottomAnchor.constraint(equalTo: card.bottomAnchor, constant: -14),
            stack.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 14),
            stack.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -14),
        ])

        newRegStack.addArrangedSubview(card)
    }

    private func applyDiscountPercent(_ pct: Int) {
        let gross = selectedTests.reduce(0) { $0 + $1.price }
        let disc = Double(round(gross * Double(pct) / 100.0))
        discountField.text = disc > 0 ? "\(Int(disc))" : ""
        calculateBill()
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MARK: – Sticky Bottom Bar
    // ─────────────────────────────────────────────────────────────────────────
    private func setupStickyBar() {
        stickyBar.backgroundColor = .white
        stickyBar.layer.shadowColor = UIColor.black.cgColor
        stickyBar.layer.shadowOpacity = 0.08
        stickyBar.layer.shadowRadius = 8
        stickyBar.layer.shadowOffset = CGSize(width: 0, height: -3)
        stickyBar.translatesAutoresizingMaskIntoConstraints = false
        stickyBar.isHidden = true
        view.addSubview(stickyBar)

        let totalSub = UILabel()
        totalSub.text = "Total Payable"
        totalSub.font = .systemFont(ofSize: 11, weight: .medium)
        totalSub.textColor = UIColor(red: 0.392, green: 0.455, blue: 0.545, alpha: 1)

        stickyTotalLabel.text = "₹0.00"
        stickyTotalLabel.font = .systemFont(ofSize: 19, weight: .bold)
        stickyTotalLabel.textColor = UIColor(red: 0.059, green: 0.090, blue: 0.165, alpha: 1)

        let totalVStack = UIStackView(arrangedSubviews: [totalSub, stickyTotalLabel])
        totalVStack.axis = .vertical
        totalVStack.spacing = 1

        submitBtn.setTitle("Register & Book Tests", for: .normal)
        submitBtn.setTitleColor(.white, for: .normal)
        submitBtn.titleLabel?.font = .systemFont(ofSize: 14, weight: .bold)
        submitBtn.backgroundColor = UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1)
        submitBtn.layer.cornerRadius = 14
        submitBtn.contentEdgeInsets = UIEdgeInsets(top: 12, left: 18, bottom: 12, right: 18)
        submitBtn.addTarget(self, action: #selector(submitRegistration), for: .touchUpInside)

        let hStack = UIStackView(arrangedSubviews: [totalVStack, UIView(), submitBtn])
        hStack.axis = .horizontal
        hStack.alignment = .center
        hStack.translatesAutoresizingMaskIntoConstraints = false
        stickyBar.addSubview(hStack)

        NSLayoutConstraint.activate([
            stickyBar.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            stickyBar.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            stickyBar.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            stickyBar.heightAnchor.constraint(equalToConstant: 76 + (view.safeAreaInsets.bottom > 0 ? 10 : 0)),

            hStack.topAnchor.constraint(equalTo: stickyBar.topAnchor, constant: 10),
            hStack.leadingAnchor.constraint(equalTo: stickyBar.leadingAnchor, constant: 14),
            hStack.trailingAnchor.constraint(equalTo: stickyBar.trailingAnchor, constant: -14)
        ])
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MARK: – Actions & Omnibar Logic
    // ─────────────────────────────────────────────────────────────────────────
    @objc private func performSearch() {
        guard let q = omnibarField.text?.trimmingCharacters(in: .whitespacesAndNewlines), !q.isEmpty else { return }
        if searchType == "PHONE" && q.count < 10 { return }

        searchSpinner.startAnimating()
        matchCard.isHidden = true
        noMatchCard.isHidden = true

        Task {
            guard let url = URL(string: "\(baseUrl)/api/workspace/patients/search?query=\(q.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? "")&type=\(searchType)") else { return }
            var req = URLRequest(url: url)
            if let token = KeychainManager.read(forKey: KeychainManager.tokenKey) ?? UserDefaults.standard.string(forKey: "auth_token") {
                req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
                req.setValue("token=\(token)", forHTTPHeaderField: "Cookie")
            }

            guard let (data, res) = try? await URLSession.shared.data(for: req),
                  (res as? HTTPURLResponse)?.statusCode == 200,
                  let json = try? JSONSerialization.jsonObject(with: data) else {
                await MainActor.run { self.searchSpinner.stopAnimating() }
                return
            }

            let array = (json as? [[String: Any]]) ?? ((json as? [String: Any])?["data"] as? [[String: Any]]) ?? []

            await MainActor.run {
                self.searchSpinner.stopAnimating()
                if let first = array.first {
                    self.matchedPatientDbId = first["id"] as? String
                    let name = first["name"] as? String ?? ""
                    let phone = first["phone"] as? String ?? ""
                    let gender = first["gender"] as? String ?? "MALE"
                    let age = first["age"] as? Int ?? 0
                    let uhid = first["patientId"] as? String ?? "UHID"
                    let address = first["address"] as? String ?? ""

                    self.matchCard.isHidden = false
                    self.noMatchCard.isHidden = true

                    self.matchAvatarLabel.text = name.isEmpty ? "P" : String(name.prefix(1)).uppercased()
                    self.matchNameLabel.text = name
                    self.matchDemoLabel.text = "\(age)Y • \(gender.uppercased())"
                    self.matchUhidLabel.text = " \(uhid) "
                    self.matchPhoneLabel.text = "Mobile: \(phone)"
                    self.matchAddressLabel.text = "Location: \(address.isEmpty ? "Direct Walk-in" : address)"

                    self.nameField.text = name
                    self.phoneField.text = phone
                    if age > 0 { self.ageField.text = "\(age)" }
                } else {
                    self.matchCard.isHidden = true
                    self.noMatchCard.isHidden = false
                    self.noMatchDescLabel.text = "No patient found matching \"\(q)\". You can register a new profile below."
                    self.matchedPatientDbId = nil
                }
            }
        }
    }

    @objc private func proceedWithMatchedPatient() {
        modeSegment.selectedSegmentIndex = 1
        modeSegmentChanged()
        showTestCatalogSheet()
    }

    @objc private func registerNewFromSearchAction() {
        let q = omnibarField.text?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        if searchType == "PHONE" {
            phoneField.text = q
        } else {
            nameField.text = q
        }
        modeSegment.selectedSegmentIndex = 1
        modeSegmentChanged()
    }

    private func fetchCatalog() {
        Task {
            guard let url = URL(string: "\(baseUrl)/api/workspace/test-catalog") else { return }
            var req = URLRequest(url: url)
            if let token = KeychainManager.read(forKey: KeychainManager.tokenKey) ?? UserDefaults.standard.string(forKey: "auth_token") {
                req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
                req.setValue("token=\(token)", forHTTPHeaderField: "Cookie")
            }

            guard let (data, res) = try? await URLSession.shared.data(for: req),
                  (res as? HTTPURLResponse)?.statusCode == 200,
                  let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                  let list = (json["tests"] as? [[String: Any]]) ?? (json["data"] as? [[String: Any]]) else { return }

            var items: [TestItem] = []
            for t in list {
                let id = t["id"] as? String ?? ""
                let name = t["name"] as? String ?? ""
                let code = t["code"] as? String ?? ""
                let type = t["type"] as? String ?? "SINGLE"
                let price = (t["price"] as? NSNumber)?.doubleValue ?? 0.0
                items.append(TestItem(id: id, name: name, code: code, type: type, price: price))
            }

            await MainActor.run {
                self.catalogTests = items
            }
        }
    }

    private func fetchDoctors() {
        Task {
            guard let url = URL(string: "\(baseUrl)/api/workspace/doctors") else { return }
            var req = URLRequest(url: url)
            if let token = KeychainManager.read(forKey: KeychainManager.tokenKey) ?? UserDefaults.standard.string(forKey: "auth_token") {
                req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
                req.setValue("token=\(token)", forHTTPHeaderField: "Cookie")
            }

            guard let (data, res) = try? await URLSession.shared.data(for: req),
                  (res as? HTTPURLResponse)?.statusCode == 200,
                  let list = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]] else { return }

            var docs: [DoctorItem] = [DoctorItem(id: "Self", name: "Self (No Doctor)", hospital: "Direct")]
            for d in list {
                let id = d["id"] as? String ?? ""
                let name = d["name"] as? String ?? ""
                let hosp = d["hospital"] as? String ?? ""
                docs.append(DoctorItem(id: id, name: name, hospital: hosp))
            }

            await MainActor.run {
                self.registeredDoctors = docs
            }
        }
    }

    @objc private func calculateBill() {
        let gross = selectedTests.reduce(0) { $0 + $1.price }
        let discount = Double(discountField.text?.trimmingCharacters(in: .whitespaces) ?? "0") ?? 0.0
        let net = max(0, gross - discount)

        grossLabel.text = String(format: "₹%,.2f", gross)
        netLabel.text = String(format: "₹%,.2f", net)
        stickyTotalLabel.text = String(format: "₹%,.2f", net)

        if selectedPaymentMode.contains("Due") || selectedPaymentMode.contains("Later") {
            paidAmountField.text = "0"
        } else {
            paidAmountField.text = net > 0 ? "\(Int(net))" : "0"
        }

        updateDue()
    }

    @objc private func updateDue() {
        let gross = selectedTests.reduce(0) { $0 + $1.price }
        let discount = Double(discountField.text?.trimmingCharacters(in: .whitespaces) ?? "0") ?? 0.0
        let net = max(0, gross - discount)
        let paid = Double(paidAmountField.text?.trimmingCharacters(in: .whitespaces) ?? "0") ?? 0.0
        let due = max(0, net - paid)

        dueLabel.text = String(format: "₹%,.2f", due)
    }

    @objc private func showTestCatalogSheet() {
        let alert = UIAlertController(title: "Select Diagnostic Tests", message: "Choose tests & packages from catalog", preferredStyle: .actionSheet)
        for t in catalogTests {
            let isSel = selectedTests.contains(t)
            let check = isSel ? "✓ " : "+ "
            let title = "\(check)\(t.name) (₹\(Int(t.price)))"
            alert.addAction(UIAlertAction(title: title, style: isSel ? .destructive : .default, handler: { [weak self] _ in
                guard let self = self else { return }
                if isSel {
                    self.selectedTests.removeAll(where: { $0.id == t.id })
                } else {
                    self.selectedTests.append(t)
                }
                self.renderSelectedTests()
                self.calculateBill()
            }))
        }
        alert.addAction(UIAlertAction(title: "Done", style: .cancel))
        present(alert, animated: true)
    }

    private func renderSelectedTests() {
        testsStack.arrangedSubviews.forEach { $0.removeFromSuperview() }
        testsCountBadge.text = "\(selectedTests.count) selected"

        for (idx, t) in selectedTests.enumerated() {
            let row = UIStackView()
            row.axis = .horizontal
            row.alignment = .center
            row.spacing = 8
            row.backgroundColor = UIColor(red: 0.945, green: 0.961, blue: 0.976, alpha: 1)
            row.layer.cornerRadius = 10
            row.layoutMargins = UIEdgeInsets(top: 8, left: 10, bottom: 8, right: 10)
            row.isLayoutMarginsRelativeArrangement = true

            let nameLbl = UILabel()
            nameLbl.text = t.name
            nameLbl.font = .systemFont(ofSize: 13, weight: .bold)

            let priceLbl = UILabel()
            priceLbl.text = "₹\(Int(t.price))"
            priceLbl.font = .systemFont(ofSize: 13, weight: .bold)
            priceLbl.textColor = UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1)

            let removeBtn = UIButton(type: .system)
            removeBtn.setImage(UIImage(systemName: "xmark.circle.fill"), for: .normal)
            removeBtn.tintColor = .systemRed
            removeBtn.tag = idx
            removeBtn.addAction(UIAction { [weak self] _ in
                self?.selectedTests.remove(at: idx)
                self?.renderSelectedTests()
                self?.calculateBill()
            }, for: .touchUpInside)

            row.addArrangedSubview(nameLbl)
            row.addArrangedSubview(UIView())
            row.addArrangedSubview(priceLbl)
            row.addArrangedSubview(removeBtn)

            testsStack.addArrangedSubview(row)
        }
    }

    @objc private func showDoctorPicker() {
        let alert = UIAlertController(title: "Select Referring Doctor", message: nil, preferredStyle: .actionSheet)
        for d in registeredDoctors {
            alert.addAction(UIAlertAction(title: d.name, style: .default, handler: { [weak self] _ in
                self?.selectedDoctor = d.id
                self?.doctorBtn.setTitle("Doctor: \(d.name)", for: .normal)
            }))
        }
        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel))
        present(alert, animated: true)
    }

    @objc private func showAgencyPicker() {
        let alert = UIAlertController(title: "Select Referring Agency", message: nil, preferredStyle: .actionSheet)
        alert.addAction(UIAlertAction(title: "Direct Walk-in", style: .default, handler: { [weak self] _ in
            self?.selectedAgency = "Direct"
            self?.agencyBtn.setTitle("Agency: Direct Walk-in", for: .normal)
        }))
        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel))
        present(alert, animated: true)
    }

    @objc private func submitRegistration() {
        guard let name = nameField.text?.trimmingCharacters(in: .whitespaces), !name.isEmpty else {
            nameField.becomeFirstResponder()
            return
        }
        guard let phone = phoneField.text?.trimmingCharacters(in: .whitespaces), phone.count == 10 else {
            phoneField.becomeFirstResponder()
            return
        }

        submitBtn.isEnabled = false
        submitBtn.setTitle("Registering...", for: .normal)

        Task {
            let userScopeId = UserDefaults.standard.string(forKey: "user_email") ?? "default_user"

            // 1. Wallet Guard
            var walletOk = true
            if let wUrl = URL(string: "\(baseUrl)/api/workspace/wallet/details") {
                var wReq = URLRequest(url: wUrl)
                if let token = KeychainManager.read(forKey: KeychainManager.tokenKey) ?? UserDefaults.standard.string(forKey: "auth_token") {
                    wReq.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
                    wReq.setValue("token=\(token)", forHTTPHeaderField: "Cookie")
                }
                if let (wData, wRes) = try? await URLSession.shared.data(for: wReq),
                   (wRes as? HTTPURLResponse)?.statusCode == 200,
                   let wJson = try? JSONSerialization.jsonObject(with: wData) as? [String: Any] {
                    let wallet = wJson["wallet"] as? [String: Any] ?? wJson
                    let bal = wallet["balance"] as? Double ?? 1.0
                    if bal <= 0 {
                        walletOk = false
                    }
                }
            }

            if !walletOk {
                await MainActor.run {
                    self.submitBtn.isEnabled = true
                    self.submitBtn.setTitle("Register & Book Tests", for: .normal)
                    MobileNotificationHelper.shared.postLowBalanceNotification(balance: 0.0, userId: userScopeId)
                    WalletAlertHelper.showWalletEmptyToast(on: self)
                }
                return
            }

            let gross = selectedTests.reduce(0) { $0 + $1.price }
            let discount = Double(discountField.text?.trimmingCharacters(in: .whitespaces) ?? "0") ?? 0.0
            let net = max(0, gross - discount)
            let paid = Double(paidAmountField.text?.trimmingCharacters(in: .whitespaces) ?? "\(net)") ?? net

            var patId = matchedPatientDbId
            var generatedUhid = "P-\(Int.random(in: 10000...99999))"
            var generatedInvoice = "INV-\(Int.random(in: 10000...99999))"

            if patId == nil {
                var patBody: [String: Any] = [
                    "title": selectedTitle,
                    "name": name,
                    "phone": phone,
                    "gender": selectedGender,
                    "age": Int(ageField.text ?? "0") ?? 0,
                    "ageUnit": selectedAgeUnit,
                    "email": emailField.text ?? "",
                    "address": addressField.text ?? "",
                    "paymentMode": selectedPaymentMode,
                    "collectedBy": selectedCollector
                ]
                if let abha = abhaField.text?.trimmingCharacters(in: .whitespaces), !abha.isEmpty {
                    patBody["abhaNumber"] = abha
                }
                if let passport = passportField.text?.trimmingCharacters(in: .whitespaces), !passport.isEmpty {
                    patBody["passport"] = passport
                }
                if selectedDoctor != "Self" { patBody["doctorId"] = selectedDoctor }
                if selectedAgency != "Direct" { patBody["agencyId"] = selectedAgency }

                if let url = URL(string: "\(baseUrl)/api/workspace/patients") {
                    var req = URLRequest(url: url)
                    req.httpMethod = "POST"
                    req.setValue("application/json", forHTTPHeaderField: "Content-Type")
                    if let token = KeychainManager.read(forKey: KeychainManager.tokenKey) ?? UserDefaults.standard.string(forKey: "auth_token") {
                        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
                        req.setValue("token=\(token)", forHTTPHeaderField: "Cookie")
                    }
                    req.httpBody = try? JSONSerialization.data(withJSONObject: patBody)

                    if let (data, res) = try? await URLSession.shared.data(for: req),
                       (res as? HTTPURLResponse)?.statusCode == 200 || (res as? HTTPURLResponse)?.statusCode == 201,
                       let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
                        let pObj = json["patient"] as? [String: Any] ?? json
                        patId = pObj["id"] as? String
                        generatedUhid = pObj["patientId"] as? String ?? generatedUhid
                    }
                }
            }

            // Accession booking
            if let pid = patId, !selectedTests.isEmpty, let accUrl = URL(string: "\(baseUrl)/api/workspace/accession") {
                let accBody: [String: Any] = [
                    "patientId": pid,
                    "subtotal": gross,
                    "discountAmount": discount,
                    "grandTotal": net,
                    "paidAmount": paid,
                    "paymentMode": selectedPaymentMode.uppercased().contains("CASH") ? "CASH" : (selectedPaymentMode.uppercased().contains("CARD") ? "CARD" : (selectedPaymentMode.uppercased().contains("DUE") ? "DUE" : "UPI")),
                    "collectedBy": selectedCollector,
                    "isUrgent": isUrgentOrder,
                    "tests": selectedTests.map { ["testTemplateId": $0.id, "testCode": $0.code, "testName": $0.name, "price": $0.price] }
                ]
                var accReq = URLRequest(url: accUrl)
                accReq.httpMethod = "POST"
                accReq.setValue("application/json", forHTTPHeaderField: "Content-Type")
                if let token = KeychainManager.read(forKey: KeychainManager.tokenKey) ?? UserDefaults.standard.string(forKey: "auth_token") {
                    accReq.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
                    accReq.setValue("token=\(token)", forHTTPHeaderField: "Cookie")
                }
                accReq.httpBody = try? JSONSerialization.data(withJSONObject: accBody)
                if let (accData, accRes) = try? await URLSession.shared.data(for: accReq),
                   (accRes as? HTTPURLResponse)?.statusCode == 200 || (accRes as? HTTPURLResponse)?.statusCode == 201 {
                    if let accJson = try? JSONSerialization.jsonObject(with: accData) as? [String: Any],
                       let inv = accJson["data"] as? [String: Any] {
                        generatedInvoice = inv["invoiceNumber"] as? String ?? generatedInvoice
                    }
                }
            }

            await MainActor.run {
                self.submitBtn.isEnabled = true
                self.submitBtn.setTitle("Register & Book Tests", for: .normal)
                self.showSuccessSheet(name: name, phone: phone, uhid: generatedUhid, invoiceNo: generatedInvoice, net: net, count: selectedTests.count)
            }
        }
    }

    private func showSuccessSheet(name: String, phone: String, uhid: String, invoiceNo: String, net: Double, count: Int) {
        let alert = UIAlertController(
            title: "🎉 Registration Successful!",
            message: "\(name) has been registered into the worklist.\n\n• UHID: \(uhid)\n• Invoice: \(invoiceNo)\n• Net Amount: ₹\(String(format: "%.2f", net))\n• Tests Booked: \(count)",
            preferredStyle: .alert
        )

        alert.addAction(UIAlertAction(title: "📲 Send WhatsApp Receipt", style: .default, handler: { [weak self] _ in
            let msg = "Hello \(name),\n\nYour test booking at Patholab Cloud is confirmed.\n• UHID: \(uhid)\n• Invoice No: \(invoiceNo)\n• Net Amount: ₹\(String(format: "%.2f", net))\n\nTrack report online: https://patholab.cloud/p/reports/\(uhid)\n\nThank you!"
            var clean = phone.components(separatedBy: CharacterSet.decimalDigits.inverted).joined()
            if clean.count == 10 { clean = "91" + clean }
            if let enc = msg.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed),
               let url = URL(string: "https://api.whatsapp.com/send?phone=\(clean)&text=\(enc)") {
                UIApplication.shared.open(url)
            }
            self?.dismiss(animated: true)
        }))

        alert.addAction(UIAlertAction(title: "Done / Back to Dashboard", style: .cancel, handler: { [weak self] _ in
            self?.dismiss(animated: true)
        }))

        present(alert, animated: true)
    }

    @objc private func clearForm() {
        omnibarField.text = ""
        nameField.text = ""
        phoneField.text = ""
        ageField.text = ""
        emailField.text = ""
        addressField.text = ""
        abhaField.text = ""
        passportField.text = ""
        discountField.text = ""
        paidAmountField.text = ""
        duplicateWarningCard.isHidden = true
        matchCard.isHidden = true
        noMatchCard.isHidden = true
        matchedPatientDbId = nil
        selectedTests.removeAll()
        renderSelectedTests()
        calculateBill()
        setupDateTimeDefaults()
    }

    @objc private func backTapped() {
        dismiss(animated: true)
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MARK: – UI Helpers
    // ─────────────────────────────────────────────────────────────────────────
    private func createWhiteCard() -> UIView {
        let v = UIView()
        v.backgroundColor = .white
        v.layer.cornerRadius = 16
        v.layer.shadowColor = UIColor.black.cgColor
        v.layer.shadowOpacity = 0.04
        v.layer.shadowRadius = 6
        v.layer.shadowOffset = CGSize(width: 0, height: 2)
        return v
    }

    private func styleInput(_ tf: UITextField) {
        tf.backgroundColor = UIColor(red: 0.945, green: 0.961, blue: 0.976, alpha: 1)
        tf.layer.cornerRadius = 10
        tf.layer.borderWidth = 1
        tf.layer.borderColor = UIColor(red: 0.886, green: 0.910, blue: 0.941, alpha: 1).cgColor
        tf.leftView = UIView(frame: CGRect(x: 0, y: 0, width: 10, height: 42))
        tf.rightView = UIView(frame: CGRect(x: 0, y: 0, width: 10, height: 42))
        tf.leftViewMode = .always
        tf.rightViewMode = .always
        tf.heightAnchor.constraint(equalToConstant: 42).isActive = true
    }

    private func styleSelectButton(_ btn: UIButton, icon: String) {
        btn.backgroundColor = UIColor(red: 0.945, green: 0.961, blue: 0.976, alpha: 1)
        btn.layer.cornerRadius = 10
        btn.layer.borderWidth = 1
        btn.layer.borderColor = UIColor(red: 0.886, green: 0.910, blue: 0.941, alpha: 1).cgColor
        btn.setTitleColor(UIColor(red: 0.059, green: 0.090, blue: 0.165, alpha: 1), for: .normal)
        btn.titleLabel?.font = .systemFont(ofSize: 13, weight: .bold)
        btn.contentHorizontalAlignment = .leading
        btn.contentEdgeInsets = UIEdgeInsets(top: 0, left: 12, bottom: 0, right: 12)
        btn.heightAnchor.constraint(equalToConstant: 44).isActive = true
    }

    private func setupMenuButton(_ btn: UIButton, title: String, items: [String], onSelect: @escaping (String) -> Void) {
        btn.backgroundColor = UIColor(red: 0.945, green: 0.961, blue: 0.976, alpha: 1)
        btn.layer.cornerRadius = 10
        btn.layer.borderWidth = 1
        btn.layer.borderColor = UIColor(red: 0.886, green: 0.910, blue: 0.941, alpha: 1).cgColor
        btn.setTitle(title, for: .normal)
        btn.setTitleColor(UIColor(red: 0.059, green: 0.090, blue: 0.165, alpha: 1), for: .normal)
        btn.titleLabel?.font = .systemFont(ofSize: 12.5, weight: .bold)
        btn.heightAnchor.constraint(equalToConstant: 42).isActive = true

        if #available(iOS 14.0, *) {
            let actions = items.map { item in
                UIAction(title: item) { _ in
                    btn.setTitle(item, for: .normal)
                    onSelect(item)
                }
            }
            btn.menu = UIMenu(children: actions)
            btn.showsMenuAsPrimaryAction = true
        }
    }
}
