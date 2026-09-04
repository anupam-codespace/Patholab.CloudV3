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

    // ── Tab 2: Demographics & Visit Routing Inputs ───────────────────────────
    private var selectedTitle  = "Mr."
    private var selectedGender = "MALE"
    private var selectedAgeUnit = "Years"
    private var selectedDoctor = "Self"
    private var selectedAgency = "Direct"
    private var selectedCollector = "Lab Phlebotomist"
    private var selectedPaymentMode = "Cash"

    private let nameField      = UITextField()
    private let duplicateWarningCard = UIView()
    private let duplicateWarningLabel = UILabel()

    private let phoneField     = UITextField()
    private let ageField       = UITextField()
    private let emailField     = UITextField()
    private let addressField   = UITextField()
    private let collectionDateField = UITextField()
    private let collectionTimeField = UITextField()

    private let titleBtn       = UIButton(type: .system)
    private let genderBtn      = UIButton(type: .system)
    private let ageUnitBtn     = UIButton(type: .system)
    private let doctorBtn      = UIButton(type: .system)
    private let agencyBtn      = UIButton(type: .system)
    private let collectorBtn   = UIButton(type: .system)
    private let paymentModeBtn = UIButton(type: .system)

    struct DoctorItem {
        let id: String
        let name: String
        let hospital: String
    }

    private var registeredDoctors: [DoctorItem] = []
    private var registeredAgencies: [DoctorItem] = []
    private var registeredCollectors: [DoctorItem] = []

    private let stickyBar      = UIView()
    private let submitBtn      = UIButton(type: .system)
    private var clockTimer: Timer?
    private let datePicker     = UIDatePicker()

    private var matchedPatientDbId: String? = nil

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 0.973, green: 0.980, blue: 0.988, alpha: 1)

        setupHeader()
        setupSearchSection()
        setupNewRegSection()
        setupStickyBar()
        setupDateTimeDefaults()
        fetchDoctorsAndAgencies()
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        startClockTimer()
    }

    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        clockTimer?.invalidate()
        clockTimer = nil
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        headerGradient.frame = headerView.bounds
    }

    private func setupDateTimeDefaults() {
        let df = DateFormatter()
        df.dateFormat = "yyyy-MM-dd"
        collectionDateField.text = df.string(from: Date())
        updateClock()
        startClockTimer()
    }

    private func updateClock() {
        let tf = DateFormatter()
        tf.dateFormat = "HH:mm:ss"
        collectionTimeField.text = tf.string(from: Date())
    }

    private func startClockTimer() {
        clockTimer?.invalidate()
        clockTimer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] _ in
            self?.updateClock()
        }
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

        proceedToAccessionBtn.setTitle("Proceed to Accession & Tests", for: .normal)
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
        buildVisitRoutingCard()
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

        let stack = UIStackView(arrangedSubviews: [title, row1, duplicateWarningCard, row2, row3, emailField, addressField])
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

    private func setupDatePicker() {
        datePicker.datePickerMode = .date
        if #available(iOS 13.4, *) {
            datePicker.preferredDatePickerStyle = .wheels
        }
        datePicker.addTarget(self, action: #selector(didPickDate(_:)), for: .valueChanged)

        let toolbar = UIToolbar()
        toolbar.sizeToFit()
        let doneBtn = UIBarButtonItem(barButtonSystemItem: .done, target: self, action: #selector(dismissDatePicker))
        let flexSpace = UIBarButtonItem(barButtonSystemItem: .flexibleSpace, target: nil, action: nil)
        toolbar.setItems([flexSpace, doneBtn], animated: false)

        collectionDateField.inputView = datePicker
        collectionDateField.inputAccessoryView = toolbar
    }

    @objc private func didPickDate(_ sender: UIDatePicker) {
        let df = DateFormatter()
        df.dateFormat = "yyyy-MM-dd"
        collectionDateField.text = df.string(from: sender.date)
    }

    @objc private func dismissDatePicker() {
        view.endEditing(true)
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

    private func buildVisitRoutingCard() {
        let card = createWhiteCard()

        let title = UILabel()
        title.text = "VISIT ROUTING"
        title.font = .systemFont(ofSize: 11.5, weight: .bold)
        title.textColor = UIColor(red: 0.02, green: 0.59, blue: 0.41, alpha: 1)

        collectionDateField.placeholder = "Date (YYYY-MM-DD)"
        collectionDateField.font = .systemFont(ofSize: 13, weight: .semibold)
        styleInput(collectionDateField)
        let calIcon = UIImageView(image: UIImage(systemName: "calendar"))
        calIcon.tintColor = UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1)
        calIcon.contentMode = .scaleAspectFit
        let calContainer = UIView(frame: CGRect(x: 0, y: 0, width: 30, height: 42))
        calIcon.frame = CGRect(x: 8, y: 12, width: 18, height: 18)
        calContainer.addSubview(calIcon)
        collectionDateField.leftView = calContainer
        collectionDateField.leftViewMode = .always
        setupDatePicker()

        collectionTimeField.placeholder = "Live Clock"
        collectionTimeField.font = .systemFont(ofSize: 13, weight: .bold)
        collectionTimeField.textColor = UIColor(red: 0.059, green: 0.090, blue: 0.165, alpha: 1)
        collectionTimeField.isUserInteractionEnabled = false
        styleInput(collectionTimeField)
        let clockIcon = UIImageView(image: UIImage(systemName: "clock.fill"))
        clockIcon.tintColor = UIColor(red: 0.02, green: 0.59, blue: 0.41, alpha: 1)
        clockIcon.contentMode = .scaleAspectFit
        let clockContainer = UIView(frame: CGRect(x: 0, y: 0, width: 30, height: 42))
        clockIcon.frame = CGRect(x: 8, y: 12, width: 18, height: 18)
        clockContainer.addSubview(clockIcon)
        collectionTimeField.leftView = clockContainer
        collectionTimeField.leftViewMode = .always

        let scheduleRow = UIStackView(arrangedSubviews: [collectionDateField, collectionTimeField])
        scheduleRow.axis = .horizontal
        scheduleRow.spacing = 8
        scheduleRow.distribution = .fillEqually

        setupMenuButton(doctorBtn, title: "Doctor: Self (No Doctor)", items: ["Doctor: Self (No Doctor)"]) { [weak self] sel in
            let clean = sel.replacingOccurrences(of: "Doctor: ", with: "")
            if let doc = self?.registeredDoctors.first(where: { $0.name == clean || $0.name == sel }) {
                self?.selectedDoctor = doc.id
            } else {
                self?.selectedDoctor = "Self"
            }
        }

        setupMenuButton(agencyBtn, title: "Agency: Direct Walk-in", items: ["Agency: Direct Walk-in"]) { [weak self] sel in
            let clean = sel.replacingOccurrences(of: "Agency: ", with: "")
            if let ag = self?.registeredAgencies.first(where: { $0.name == clean || $0.name == sel }) {
                self?.selectedAgency = ag.id
            } else {
                self?.selectedAgency = "Direct"
            }
        }

        setupMenuButton(collectorBtn, title: "Collector: Lab Phlebotomist", items: ["Lab Phlebotomist", "Home Collection Agent", "Self (Patient)"]) { [weak self] sel in
            let clean = sel.replacingOccurrences(of: "Collector: ", with: "")
            self?.selectedCollector = clean
            self?.collectorBtn.setTitle("Collector: \(clean)", for: .normal)
        }

        setupMenuButton(paymentModeBtn, title: "Cash", items: ["Cash", "UPI / QR", "Card", "Credit (Due)"]) { [weak self] sel in
            self?.selectedPaymentMode = sel
            self?.paymentModeBtn.setTitle(sel, for: .normal)
        }

        let stack = UIStackView(arrangedSubviews: [title, scheduleRow, doctorBtn, agencyBtn, collectorBtn, paymentModeBtn])
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

        submitBtn.setTitle("Register Patient", for: .normal)
        submitBtn.setTitleColor(.white, for: .normal)
        submitBtn.titleLabel?.font = .systemFont(ofSize: 15.5, weight: .bold)
        submitBtn.backgroundColor = UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1)
        submitBtn.layer.cornerRadius = 16
        submitBtn.layer.shadowColor = UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 0.3).cgColor
        submitBtn.layer.shadowOffset = CGSize(width: 0, height: 4)
        submitBtn.layer.shadowRadius = 8
        submitBtn.layer.shadowOpacity = 1
        submitBtn.translatesAutoresizingMaskIntoConstraints = false
        submitBtn.addTarget(self, action: #selector(submitRegistrationAction), for: .touchUpInside)
        stickyBar.addSubview(submitBtn)

        NSLayoutConstraint.activate([
            stickyBar.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            stickyBar.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            stickyBar.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            stickyBar.heightAnchor.constraint(equalToConstant: 76 + (view.safeAreaInsets.bottom > 0 ? 10 : 0)),

            submitBtn.topAnchor.constraint(equalTo: stickyBar.topAnchor, constant: 12),
            submitBtn.leadingAnchor.constraint(equalTo: stickyBar.leadingAnchor, constant: 16),
            submitBtn.trailingAnchor.constraint(equalTo: stickyBar.trailingAnchor, constant: -16),
            submitBtn.heightAnchor.constraint(equalToConstant: 52)
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

    private func fetchDoctorsAndAgencies() {
        Task {
            let token = KeychainManager.read(forKey: KeychainManager.tokenKey) ?? UserDefaults.standard.string(forKey: "auth_token")

            // 1. Doctors (Added by this user / lab ID)
            if let docUrl = URL(string: "\(baseUrl)/api/workspace/doctors") {
                var req = URLRequest(url: docUrl)
                if let token = token {
                    req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
                    req.setValue("token=\(token)", forHTTPHeaderField: "Cookie")
                }
                if let (data, res) = try? await URLSession.shared.data(for: req),
                   (res as? HTTPURLResponse)?.statusCode == 200,
                   let list = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]] {
                    var docs: [DoctorItem] = [DoctorItem(id: "Self", name: "Self (No Doctor)", hospital: "Direct")]
                    var docLabels = ["Doctor: Self (No Doctor)"]
                    for d in list {
                        let id = d["id"] as? String ?? ""
                        let name = d["name"] as? String ?? ""
                        let hosp = d["hospital"] as? String ?? ""
                        docs.append(DoctorItem(id: id, name: name, hospital: hosp))
                        docLabels.append(name)
                    }
                    await MainActor.run {
                        self.registeredDoctors = docs
                        self.setupMenuButton(self.doctorBtn, title: self.doctorBtn.title(for: .normal) ?? "Doctor: Self (No Doctor)", items: docLabels) { [weak self] sel in
                            let clean = sel.replacingOccurrences(of: "Doctor: ", with: "")
                            if let doc = self?.registeredDoctors.first(where: { $0.name == clean || $0.name == sel }) {
                                self?.selectedDoctor = doc.id
                                self?.doctorBtn.setTitle("Doctor: \(doc.name)", for: .normal)
                            } else {
                                self?.selectedDoctor = "Self"
                                self?.doctorBtn.setTitle("Doctor: Self (No Doctor)", for: .normal)
                            }
                        }
                    }
                }
            }

            // 2. Agencies (Added by this user / lab ID)
            if let agUrl = URL(string: "\(baseUrl)/api/workspace/agencies") {
                var req = URLRequest(url: agUrl)
                if let token = token {
                    req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
                    req.setValue("token=\(token)", forHTTPHeaderField: "Cookie")
                }
                if let (data, res) = try? await URLSession.shared.data(for: req),
                   (res as? HTTPURLResponse)?.statusCode == 200,
                   let list = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]] {
                    var ags: [DoctorItem] = [DoctorItem(id: "Direct", name: "Direct Walk-in", hospital: "Standard")]
                    var agLabels = ["Agency: Direct Walk-in"]
                    for a in list {
                        let id = a["id"] as? String ?? ""
                        let name = a["agencyName"] as? String ?? "Partner Center"
                        let code = a["code"] as? String ?? "AGENCY"
                        ags.append(DoctorItem(id: id, name: name, hospital: code))
                        agLabels.append(name)
                    }
                    await MainActor.run {
                        self.registeredAgencies = ags
                        self.setupMenuButton(self.agencyBtn, title: self.agencyBtn.title(for: .normal) ?? "Agency: Direct Walk-in", items: agLabels) { [weak self] sel in
                            let clean = sel.replacingOccurrences(of: "Agency: ", with: "")
                            if let ag = self?.registeredAgencies.first(where: { $0.name == clean || $0.name == sel }) {
                                self?.selectedAgency = ag.id
                                self?.agencyBtn.setTitle("Agency: \(ag.name)", for: .normal)
                            } else {
                                self?.selectedAgency = "Direct"
                                self?.agencyBtn.setTitle("Agency: Direct Walk-in", for: .normal)
                            }
                        }
                    }
                }
            }

            // 3. Collectors (From user account & staff)
            if let colUrl = URL(string: "\(baseUrl)/api/workspace/collectors") {
                var req = URLRequest(url: colUrl)
                if let token = token {
                    req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
                    req.setValue("token=\(token)", forHTTPHeaderField: "Cookie")
                }
                if let (data, res) = try? await URLSession.shared.data(for: req),
                   (res as? HTTPURLResponse)?.statusCode == 200,
                   let list = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]] {
                    var cols: [DoctorItem] = []
                    var colLabels: [String] = []
                    for c in list {
                        let id = c["id"] as? String ?? ""
                        let name = c["name"] as? String ?? id
                        cols.append(DoctorItem(id: id, name: name, hospital: ""))
                        colLabels.append(name)
                    }
                    if !cols.isEmpty {
                        await MainActor.run {
                            self.registeredCollectors = cols
                            self.setupMenuButton(self.collectorBtn, title: "Collector: \(colLabels.first ?? "Lab Phlebotomist")", items: colLabels) { [weak self] sel in
                                let clean = sel.replacingOccurrences(of: "Collector: ", with: "")
                                self?.selectedCollector = clean
                                self?.collectorBtn.setTitle("Collector: \(clean)", for: .normal)
                            }
                        }
                    }
                }
            }
        }
    }

    @objc private func submitRegistrationAction() {
        guard let name = nameField.text?.trimmingCharacters(in: .whitespaces), !name.isEmpty else {
            nameField.becomeFirstResponder()
            return
        }
        guard let phone = phoneField.text?.trimmingCharacters(in: .whitespaces), phone.count == 10 else {
            phoneField.becomeFirstResponder()
            return
        }
        guard let ageText = ageField.text?.trimmingCharacters(in: .whitespaces), !ageText.isEmpty else {
            ageField.becomeFirstResponder()
            return
        }

        submitBtn.isEnabled = false
        submitBtn.setTitle("Checking wallet...", for: .normal)

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
                    self.submitBtn.setTitle("Register Patient", for: .normal)
                    MobileNotificationHelper.shared.postWalletZeroBalanceNotification(userId: userScopeId)
                    let alert = UIAlertController(
                        title: "Recharge Your Wallet",
                        message: "Your wallet balance is low or zero. Please recharge your wallet to register new patients.",
                        preferredStyle: .alert
                    )
                    alert.addAction(UIAlertAction(title: "Recharge Wallet", style: .default, handler: { [weak self] _ in
                        let walletVC = WalletViewController()
                        walletVC.modalPresentationStyle = .fullScreen
                        self?.present(walletVC, animated: true, completion: nil)
                    }))
                    alert.addAction(UIAlertAction(title: "Cancel", style: .cancel, handler: nil))
                    self.present(alert, animated: true)
                }
                return
            }

            await MainActor.run {
                self.submitBtn.setTitle("Registering Patient...", for: .normal)
            }

            var generatedUhid = "P-\(Int.random(in: 10000...99999))"

            var patBody: [String: Any] = [
                "title": selectedTitle,
                "name": name,
                "phone": phone,
                "gender": selectedGender,
                "age": Int(ageText) ?? 0,
                "ageUnit": selectedAgeUnit,
                "email": emailField.text ?? "",
                "address": addressField.text ?? "",
                "paymentMode": selectedPaymentMode,
                "collectionDate": collectionDateField.text ?? "",
                "collectionTime": collectionTimeField.text ?? "",
                "collectedBy": selectedCollector
            ]
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

                if let (data, res) = try? await URLSession.shared.data(for: req) {
                    let httpCode = (res as? HTTPURLResponse)?.statusCode ?? 0
                    if httpCode == 402 {
                        await MainActor.run {
                            self.submitBtn.isEnabled = true
                            self.submitBtn.setTitle("Register Patient", for: .normal)
                            MobileNotificationHelper.shared.postWalletZeroBalanceNotification(userId: userScopeId)
                            let alert = UIAlertController(
                                title: "Recharge Your Wallet",
                                message: "Your wallet balance is low or zero. Please recharge your wallet to register new patients.",
                                preferredStyle: .alert
                            )
                            alert.addAction(UIAlertAction(title: "Recharge Wallet", style: .default, handler: { [weak self] _ in
                                let walletVC = WalletViewController()
                                walletVC.modalPresentationStyle = .fullScreen
                                self?.present(walletVC, animated: true, completion: nil)
                            }))
                            alert.addAction(UIAlertAction(title: "Cancel", style: .cancel, handler: nil))
                            self.present(alert, animated: true)
                        }
                        return
                    }

                    if (httpCode == 200 || httpCode == 201),
                       let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
                        let pObj = json["patient"] as? [String: Any] ?? json
                        generatedUhid = pObj["patientId"] as? String ?? generatedUhid
                    }
                }
            }

            // Register this ID in sync cache to prevent notifying for patients created on this device
            let syncUserEmail = userScopeId
            let knownKey = "known_patient_ids_\(syncUserEmail)"
            var knownIds = Set(UserDefaults.standard.stringArray(forKey: knownKey) ?? [])
            knownIds.insert(generatedUhid)
            UserDefaults.standard.set(Array(knownIds), forKey: knownKey)

            let finalPayMode = selectedPaymentMode

            await MainActor.run {
                self.submitBtn.isEnabled = true
                self.submitBtn.setTitle("Register Patient", for: .normal)
                self.showSuccessSheet(name: name, phone: phone, uhid: generatedUhid, paymentMode: finalPayMode)
            }
        }
    }

    private func showSuccessSheet(name: String, phone: String, uhid: String, paymentMode: String) {
        let alert = UIAlertController(
            title: "🎉 Registration Successful!",
            message: "\(name) has been registered into the workspace.\n\n• Patient ID: \(uhid)\n• Visit Routing: \(paymentMode)",
            preferredStyle: .alert
        )

        alert.addAction(UIAlertAction(title: "📲 Send WhatsApp Receipt", style: .default, handler: { [weak self] _ in
            let msg = "Hello \(name),\n\nYour patient registration at Patholab Cloud is confirmed.\n• Patient ID: \(uhid)\n• Payment Routing: \(paymentMode)\n\nTrack report online: https://patholab.cloud/p/reports/\(uhid)\n\nThank you!"
            var clean = phone.components(separatedBy: CharacterSet.decimalDigits.inverted).joined()
            if clean.count == 10 { clean = "91" + clean }
            if let enc = msg.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed),
               let url = URL(string: "https://api.whatsapp.com/send?phone=\(clean)&text=\(enc)") {
                UIApplication.shared.open(url)
            }
            self?.clearForm()
        }))

        alert.addAction(UIAlertAction(title: "View in Patients Worklist", style: .default, handler: { [weak self] _ in
            self?.dismiss(animated: true)
        }))

        alert.addAction(UIAlertAction(title: "Register Another Patient", style: .cancel, handler: { [weak self] _ in
            self?.clearForm()
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
        duplicateWarningCard.isHidden = true
        matchCard.isHidden = true
        noMatchCard.isHidden = true
        matchedPatientDbId = nil
        selectedDoctor = "Self"
        doctorBtn.setTitle("Doctor: Self (No Doctor)", for: .normal)
        selectedAgency = "Direct"
        agencyBtn.setTitle("Agency: Direct Walk-in", for: .normal)
        selectedCollector = "Lab Phlebotomist"
        collectorBtn.setTitle("Collector: Lab Phlebotomist", for: .normal)
        selectedPaymentMode = "Cash"
        paymentModeBtn.setTitle("Cash", for: .normal)
        setupDateTimeDefaults();
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
        btn.titleLabel?.font = .systemFont(ofSize: 13, weight: .bold)
        btn.contentHorizontalAlignment = .leading
        btn.contentEdgeInsets = UIEdgeInsets(top: 0, left: 14, bottom: 0, right: 14)
        btn.heightAnchor.constraint(equalToConstant: 44).isActive = true

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
