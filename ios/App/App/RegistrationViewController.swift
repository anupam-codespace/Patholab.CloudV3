import UIKit
import WebKit

/**
 * RegistrationViewController
 * ──────────────────────────
 * Native iOS Patient Registration & Clinical Accession Console.
 * Directly mirroring the exact web workflow and sequence with 100% complete feature parity:
 *  1. Step 1: Database Omnibar Lookup & Duplicate Prevention (/workspace/registration)
 *  2. Step 2: Demographics, Duplicate Warnings, Referral, Test Accession, & Billing (/workspace/patients/new & /accession)
 */
class RegistrationViewController: UIViewController, UITextFieldDelegate {

    private let baseUrl = "https://app.patholab.cloud"

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
    private var selectedDoctorName = "Self (No Doctor)"
    private var selectedAgency = "Direct"
    private var selectedAgencyName = "Direct Walk-in"
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
        let label: String

        init(id: String, name: String, hospital: String, label: String? = nil) {
            self.id = id
            self.name = name
            self.hospital = hospital
            self.label = label ?? name
        }
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

        registeredDoctors = [DoctorItem(id: "Self", name: "Self (No Doctor)", hospital: "Direct", label: "Self (No Doctor)")]
        registeredAgencies = [DoctorItem(id: "Direct", name: "Direct Walk-in", hospital: "Standard", label: "Direct Walk-in")]
        registeredCollectors = [
            DoctorItem(id: "Lab Phlebotomist", name: "Lab Phlebotomist", hospital: "", label: "Lab Phlebotomist"),
            DoctorItem(id: "Home Collection Agent", name: "Home Collection Agent", hospital: "", label: "Home Collection Agent"),
            DoctorItem(id: "Self (Patient)", name: "Self (Patient)", hospital: "", label: "Self (Patient)")
        ]

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
        fetchDoctorsAndAgencies()
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
            UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1).cgColor, // #0D6EFD
            UIColor(red: 0.039, green: 0.345, blue: 0.792, alpha: 1).cgColor, // #0A58CA
            UIColor(red: 0.114, green: 0.306, blue: 0.847, alpha: 1).cgColor  // #1D4ED8
        ]
        headerGradient.startPoint = CGPoint(x: 0, y: 0)
        headerGradient.endPoint = CGPoint(x: 1, y: 1)
        headerView.layer.insertSublayer(headerGradient, at: 0)
        headerView.layer.cornerRadius = 24
        headerView.layer.maskedCorners = [.layerMinXMaxYCorner, .layerMaxXMaxYCorner]
        headerView.clipsToBounds = true
        view.addSubview(headerView)

        // Frosted Glass Back Button
        backBtn.setImage(UIImage(systemName: "chevron.left"), for: .normal)
        backBtn.tintColor = .white
        backBtn.backgroundColor = UIColor.white.withAlphaComponent(0.20)
        backBtn.layer.borderColor = UIColor.white.withAlphaComponent(0.30).cgColor
        backBtn.layer.borderWidth = 1
        backBtn.layer.cornerRadius = 19
        backBtn.translatesAutoresizingMaskIntoConstraints = false
        backBtn.addTarget(self, action: #selector(backTapped), for: .touchUpInside)
        headerView.addSubview(backBtn)

        // Titles
        titleLabel.text = "Patient Registration"
        titleLabel.font = .systemFont(ofSize: 19, weight: .bold)
        titleLabel.textColor = .white

        subtitleLabel.text = "Search Database & Test Accession"
        subtitleLabel.font = .systemFont(ofSize: 11.5, weight: .medium)
        subtitleLabel.textColor = UIColor(red: 0.780, green: 0.880, blue: 1.0, alpha: 1)

        let titleVStack = UIStackView(arrangedSubviews: [titleLabel, subtitleLabel])
        titleVStack.axis = .vertical
        titleVStack.spacing = 1
        titleVStack.translatesAutoresizingMaskIntoConstraints = false
        headerView.addSubview(titleVStack)

        // Clear button (White pill CTA)
        clearBtn.setTitle("Clear", for: .normal)
        clearBtn.setTitleColor(UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1), for: .normal)
        clearBtn.titleLabel?.font = .systemFont(ofSize: 12.5, weight: .bold)
        clearBtn.backgroundColor = .white
        clearBtn.layer.cornerRadius = 16
        clearBtn.layer.shadowColor = UIColor.black.cgColor
        clearBtn.layer.shadowOpacity = 0.10
        clearBtn.layer.shadowRadius = 3
        clearBtn.layer.shadowOffset = CGSize(width: 0, height: 1.5)
        clearBtn.contentEdgeInsets = UIEdgeInsets(top: 6, left: 14, bottom: 6, right: 14)
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
            headerView.heightAnchor.constraint(equalToConstant: 152),

            backBtn.leadingAnchor.constraint(equalTo: headerView.leadingAnchor, constant: 14),
            backBtn.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 4),
            backBtn.widthAnchor.constraint(equalToConstant: 38),
            backBtn.heightAnchor.constraint(equalToConstant: 38),

            titleVStack.leadingAnchor.constraint(equalTo: backBtn.trailingAnchor, constant: 12),
            titleVStack.centerYAnchor.constraint(equalTo: backBtn.centerYAnchor),

            clearBtn.trailingAnchor.constraint(equalTo: headerView.trailingAnchor, constant: -14),
            clearBtn.centerYAnchor.constraint(equalTo: backBtn.centerYAnchor),

            modeSegment.leadingAnchor.constraint(equalTo: headerView.leadingAnchor, constant: 14),
            modeSegment.trailingAnchor.constraint(equalTo: headerView.trailingAnchor, constant: -14),
            modeSegment.bottomAnchor.constraint(equalTo: headerView.bottomAnchor, constant: -12),
            modeSegment.heightAnchor.constraint(equalToConstant: 36),
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

        let docLabel = makeFieldLabel(text: "REFERRING DOCTOR")
        styleSelectButton(doctorBtn, title: selectedDoctorName.isEmpty ? "Self (No Doctor)" : selectedDoctorName, icon: "stethoscope")
        doctorBtn.addTarget(self, action: #selector(didTapDoctorBtn), for: .touchUpInside)

        let agencyLabel = makeFieldLabel(text: "AGENCY / CLIENT")
        styleSelectButton(agencyBtn, title: selectedAgencyName.isEmpty ? "Direct Walk-in" : selectedAgencyName, icon: "briefcase")
        agencyBtn.addTarget(self, action: #selector(didTapAgencyBtn), for: .touchUpInside)

        let collectorLabel = makeFieldLabel(text: "COLLECTED BY")
        styleSelectButton(collectorBtn, title: selectedCollector.isEmpty ? "Lab Phlebotomist" : selectedCollector, icon: "person.badge.shield.checkmark")
        collectorBtn.addTarget(self, action: #selector(didTapCollectorBtn), for: .touchUpInside)

        let payLabel = makeFieldLabel(text: "PAYMENT MODE")
        setupMenuButton(paymentModeBtn, title: "Cash", items: ["Cash", "UPI / QR", "Card", "Credit (Due)"]) { [weak self] sel in
            self?.selectedPaymentMode = sel
            self?.paymentModeBtn.setTitle(sel, for: .normal)
        }

        let stack = UIStackView(arrangedSubviews: [
            title,
            scheduleRow,
            docLabel, doctorBtn,
            agencyLabel, agencyBtn,
            collectorLabel, collectorBtn,
            payLabel, paymentModeBtn
        ])
        stack.axis = .vertical
        stack.spacing = 6
        stack.setCustomSpacing(10, after: scheduleRow)
        stack.setCustomSpacing(10, after: doctorBtn)
        stack.setCustomSpacing(10, after: agencyBtn)
        stack.setCustomSpacing(10, after: collectorBtn)
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

    private func getAuthCredentials(completion: @escaping (String?, String?) -> Void) {
        // 1. Keychain
        if let token = KeychainManager.read(forKey: KeychainManager.tokenKey),
           !token.isEmpty, token != "null", token != "undefined" {
            completion(token, "token=\(token); auth-token=\(token)")
            return
        }
        // 2. UserDefaults
        if let token = UserDefaults.standard.string(forKey: "auth_token") ?? UserDefaults.standard.string(forKey: "token"),
           !token.isEmpty, token != "null", token != "undefined" {
            KeychainManager.save(token, forKey: KeychainManager.tokenKey)
            completion(token, "token=\(token); auth-token=\(token)")
            return
        }
        // 3. HTTPCookieStorage
        if let cookies = HTTPCookieStorage.shared.cookies {
            for cookie in cookies {
                if (cookie.name == "token" || cookie.name == "auth-token") && !cookie.value.isEmpty && cookie.value != "null" {
                    let token = cookie.value
                    KeychainManager.save(token, forKey: KeychainManager.tokenKey)
                    let cookieHeader = cookies.map { "\($0.name)=\($0.value)" }.joined(separator: "; ")
                    completion(token, cookieHeader)
                    return
                }
            }
        }
        // 4. WKWebsiteDataStore
        WKWebsiteDataStore.default().httpCookieStore.getAllCookies { cookies in
            var foundToken: String? = nil
            var cookiePairs: [String] = []
            for cookie in cookies {
                cookiePairs.append("\(cookie.name)=\(cookie.value)")
                if (cookie.name == "token" || cookie.name == "auth-token") && !cookie.value.isEmpty && cookie.value != "null" {
                    foundToken = cookie.value
                }
            }
            if let token = foundToken {
                KeychainManager.save(token, forKey: KeychainManager.tokenKey)
            }
            let cookieHeader = cookiePairs.joined(separator: "; ")
            completion(foundToken, cookieHeader.isEmpty ? nil : cookieHeader)
        }
    }

    private func fetchDoctorsAndAgencies() {
        getAuthCredentials { [weak self] token, cookieHeader in
            guard let self = self else { return }
            Task {
                // 1. Doctors (Added by this user / lab ID)
                if let docUrl = URL(string: "\(self.baseUrl)/api/workspace/doctors") {
                    var req = URLRequest(url: docUrl)
                    if let token = token, !token.isEmpty {
                        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
                    }
                    if let cookieHeader = cookieHeader, !cookieHeader.isEmpty {
                        req.setValue(cookieHeader, forHTTPHeaderField: "Cookie")
                    } else if let token = token, !token.isEmpty {
                        req.setValue("token=\(token); auth-token=\(token)", forHTTPHeaderField: "Cookie")
                    }
                    req.setValue("application/json", forHTTPHeaderField: "Accept")

                    if let (data, res) = try? await URLSession.shared.data(for: req),
                       let httpRes = res as? HTTPURLResponse, (httpRes.statusCode >= 200 && httpRes.statusCode < 300) {
                        var list: [[String: Any]] = []
                        if let dict = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any] {
                            if let docs = dict["doctors"] as? [[String: Any]] {
                                list = docs
                            } else if let dataArr = dict["data"] as? [[String: Any]] {
                                list = dataArr
                            }
                        } else if let arr = (try? JSONSerialization.jsonObject(with: data)) as? [[String: Any]] {
                            list = arr
                        }

                        var docs: [DoctorItem] = [DoctorItem(id: "Self", name: "Self (No Doctor)", hospital: "Direct", label: "Self (No Doctor)")]
                        for d in list {
                            let id = d["id"] as? String ?? ""
                            let name = d["name"] as? String ?? "Dr. Partner"
                            let spec = d["specialization"] as? String ?? ""
                            let hosp = (d["hospital"] as? String) ?? (d["clinic"] as? String) ?? ""
                            let label = spec.isEmpty ? name : "\(name) (\(spec))"
                            docs.append(DoctorItem(id: id, name: name, hospital: hosp, label: label))
                        }
                        await MainActor.run {
                            self.registeredDoctors = docs
                            if let activeDoc = docs.first(where: { $0.id == self.selectedDoctor }) {
                                self.selectedDoctorName = activeDoc.name
                            }
                            self.doctorBtn.setTitle(self.selectedDoctorName.isEmpty ? "Self (No Doctor)" : self.selectedDoctorName, for: .normal)
                        }
                    }
                }

                // 2. Agencies (Added by this user / lab ID)
                if let agUrl = URL(string: "\(self.baseUrl)/api/workspace/agencies") {
                    var req = URLRequest(url: agUrl)
                    if let token = token, !token.isEmpty {
                        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
                    }
                    if let cookieHeader = cookieHeader, !cookieHeader.isEmpty {
                        req.setValue(cookieHeader, forHTTPHeaderField: "Cookie")
                    } else if let token = token, !token.isEmpty {
                        req.setValue("token=\(token); auth-token=\(token)", forHTTPHeaderField: "Cookie")
                    }
                    req.setValue("application/json", forHTTPHeaderField: "Accept")

                    if let (data, res) = try? await URLSession.shared.data(for: req),
                       let httpRes = res as? HTTPURLResponse, (httpRes.statusCode >= 200 && httpRes.statusCode < 300) {
                        var list: [[String: Any]] = []
                        if let dict = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any] {
                            if let ags = dict["agencies"] as? [[String: Any]] {
                                list = ags
                            } else if let dataArr = dict["data"] as? [[String: Any]] {
                                list = dataArr
                            }
                        } else if let arr = (try? JSONSerialization.jsonObject(with: data)) as? [[String: Any]] {
                            list = arr
                        }

                        var ags: [DoctorItem] = [DoctorItem(id: "Direct", name: "Direct Walk-in", hospital: "Standard", label: "Direct Walk-in")]
                        for a in list {
                            let id = a["id"] as? String ?? ""
                            let name = (a["agencyName"] as? String) ?? (a["name"] as? String) ?? "Partner Center"
                            let tier = a["agencyTier"] as? String ?? ""
                            let label = tier.isEmpty ? name : "\(name) [\(tier)]"
                            ags.append(DoctorItem(id: id, name: name, hospital: tier, label: label))
                        }
                        await MainActor.run {
                            self.registeredAgencies = ags
                            if let activeAg = ags.first(where: { $0.id == self.selectedAgency }) {
                                self.selectedAgencyName = activeAg.name
                            }
                            self.agencyBtn.setTitle(self.selectedAgencyName.isEmpty ? "Direct Walk-in" : self.selectedAgencyName, for: .normal)
                        }
                    }
                }

                // 3. Collectors (From current user account & lab staff)
                var cols: [DoctorItem] = [
                    DoctorItem(id: "Lab Phlebotomist", name: "Lab Phlebotomist", hospital: "In-Lab Sample Collection", label: "Lab Phlebotomist"),
                    DoctorItem(id: "Home Collection Agent", name: "Home Collection Agent", hospital: "At-Home Phlebotomist Visit", label: "Home Collection Agent"),
                    DoctorItem(id: "Self (Patient)", name: "Self (Patient)", hospital: "Sample brought by patient", label: "Self (Patient)")
                ]

                let curUser = UserDefaults.standard.string(forKey: "user_name") ?? ""
                if !curUser.trimmingCharacters(in: .whitespaces).isEmpty && !cols.contains(where: { $0.name.lowercased() == curUser.lowercased() }) {
                    cols.insert(DoctorItem(id: curUser, name: curUser, hospital: "Current Logged-in Staff", label: curUser), at: 0)
                }

                if let staffUrl = URL(string: "\(self.baseUrl)/api/workspace/staff") {
                    var sReq = URLRequest(url: staffUrl)
                    if let token = token, !token.isEmpty {
                        sReq.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
                    }
                    if let cookieHeader = cookieHeader, !cookieHeader.isEmpty {
                        sReq.setValue(cookieHeader, forHTTPHeaderField: "Cookie")
                    } else if let token = token, !token.isEmpty {
                        sReq.setValue("token=\(token); auth-token=\(token)", forHTTPHeaderField: "Cookie")
                    }
                    sReq.setValue("application/json", forHTTPHeaderField: "Accept")

                    if let (sData, sRes) = try? await URLSession.shared.data(for: sReq),
                       let sHttpRes = sRes as? HTTPURLResponse, (sHttpRes.statusCode >= 200 && sHttpRes.statusCode < 300) {
                        var staffArr: [[String: Any]] = []
                        if let arr = (try? JSONSerialization.jsonObject(with: sData)) as? [[String: Any]] {
                            staffArr = arr
                        } else if let dict = (try? JSONSerialization.jsonObject(with: sData)) as? [String: Any] {
                            staffArr = (dict["staff"] as? [[String: Any]]) ?? (dict["data"] as? [[String: Any]]) ?? []
                        }
                        for s in staffArr {
                            let staffUser = s["user"] as? [String: Any]
                            let staffName = (staffUser?["name"] as? String) ?? (s["name"] as? String) ?? ""
                            let staffRole = (staffUser?["role"] as? String) ?? (s["role"] as? String) ?? "Staff"
                            if !staffName.isEmpty && !cols.contains(where: { $0.name.lowercased() == staffName.lowercased() }) {
                                cols.append(DoctorItem(id: staffName, name: staffName, hospital: staffRole, label: staffName))
                            }
                        }
                    }
                }

                await MainActor.run {
                    self.registeredCollectors = cols
                    if let activeCol = cols.first(where: { $0.name.lowercased() == self.selectedCollector.lowercased() }) {
                        self.selectedCollector = activeCol.name
                    }
                    self.collectorBtn.setTitle(self.selectedCollector.isEmpty ? "Lab Phlebotomist" : self.selectedCollector, for: .normal)
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
            patBody["doctorName"] = selectedDoctorName
            if selectedAgency != "Direct" { patBody["agencyId"] = selectedAgency }
            patBody["agencyName"] = selectedAgencyName

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
        selectedDoctorName = "Self (No Doctor)"
        doctorBtn.setTitle("Self (No Doctor)", for: .normal)
        selectedAgency = "Direct"
        selectedAgencyName = "Direct Walk-in"
        agencyBtn.setTitle("Direct Walk-in", for: .normal)
        selectedCollector = "Lab Phlebotomist"
        collectorBtn.setTitle("Lab Phlebotomist", for: .normal)
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

    private func makeFieldLabel(text: String) -> UILabel {
        let lbl = UILabel()
        lbl.text = text
        lbl.font = .systemFont(ofSize: 11, weight: .bold)
        lbl.textColor = UIColor(red: 0.392, green: 0.455, blue: 0.545, alpha: 1) // slate-600
        lbl.translatesAutoresizingMaskIntoConstraints = false
        return lbl
    }

    private func styleInput(_ tf: UITextField) {
        tf.backgroundColor = UIColor(red: 0.973, green: 0.980, blue: 0.988, alpha: 1)
        tf.layer.cornerRadius = 12
        tf.layer.borderWidth = 1
        tf.layer.borderColor = UIColor(red: 0.886, green: 0.910, blue: 0.941, alpha: 1).cgColor
        tf.leftView = UIView(frame: CGRect(x: 0, y: 0, width: 10, height: 44))
        tf.rightView = UIView(frame: CGRect(x: 0, y: 0, width: 10, height: 44))
        tf.leftViewMode = .always
        tf.rightViewMode = .always
        tf.heightAnchor.constraint(equalToConstant: 44).isActive = true
    }

    private func styleSelectButton(_ btn: UIButton, title: String, icon: String) {
        btn.backgroundColor = UIColor(red: 0.973, green: 0.980, blue: 0.988, alpha: 1) // slate-50
        btn.layer.cornerRadius = 12
        btn.layer.borderWidth = 1
        btn.layer.borderColor = UIColor(red: 0.886, green: 0.910, blue: 0.941, alpha: 1).cgColor // slate-200
        btn.setTitle(title, for: .normal)
        btn.setTitleColor(UIColor(red: 0.059, green: 0.090, blue: 0.165, alpha: 1), for: .normal) // slate-900
        btn.titleLabel?.font = .systemFont(ofSize: 13.5, weight: .medium)
        btn.contentHorizontalAlignment = .leading
        if #available(iOS 13.0, *) {
            let config = UIImage.SymbolConfiguration(pointSize: 13.5, weight: .medium)
            let img = UIImage(systemName: icon, withConfiguration: config)?.withTintColor(UIColor(red: 0.392, green: 0.455, blue: 0.545, alpha: 1), renderingMode: .alwaysOriginal)
            btn.setImage(img, for: .normal)
            btn.imageEdgeInsets = UIEdgeInsets(top: 0, left: 12, bottom: 0, right: 8)
            btn.titleEdgeInsets = UIEdgeInsets(top: 0, left: 18, bottom: 0, right: 30)
        } else {
            btn.contentEdgeInsets = UIEdgeInsets(top: 0, left: 12, bottom: 0, right: 30)
        }

        if btn.viewWithTag(999) == nil {
            let chevron = UIImageView(image: UIImage(systemName: "chevron.up.chevron.down"))
            chevron.tintColor = UIColor(red: 0.580, green: 0.639, blue: 0.722, alpha: 1)
            chevron.contentMode = .scaleAspectFit
            chevron.tag = 999
            chevron.translatesAutoresizingMaskIntoConstraints = false
            btn.addSubview(chevron)
            NSLayoutConstraint.activate([
                chevron.trailingAnchor.constraint(equalTo: btn.trailingAnchor, constant: -12),
                chevron.centerYAnchor.constraint(equalTo: btn.centerYAnchor),
                chevron.widthAnchor.constraint(equalToConstant: 13),
                chevron.heightAnchor.constraint(equalToConstant: 13)
            ])
        }
        btn.heightAnchor.constraint(equalToConstant: 46).isActive = true
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MARK: – Searchable Selection Sheets & Quick Add
    // ─────────────────────────────────────────────────────────────────────────
    @objc private func didTapDoctorBtn() {
        let picker = SearchableModalPickerViewController()
        picker.pickerTitle = "Referring Doctor"
        picker.addNewTitle = "+ Add Doctor"
        picker.items = registeredDoctors.map { doc in
            let sub = doc.id == "Self" ? "Direct Walk-in / Self" : (doc.hospital.isEmpty ? "Registered Doctor" : doc.hospital)
            return SearchableModalPickerViewController.Item(
                id: doc.id,
                title: doc.name,
                subtitle: sub,
                isSelected: doc.id == selectedDoctor || doc.name == selectedDoctorName
            )
        }
        picker.onSelect = { [weak self] item in
            guard let self = self else { return }
            self.selectedDoctor = item.id
            self.selectedDoctorName = item.title
            self.doctorBtn.setTitle(item.title, for: .normal)

            // If user typed a custom new doctor, persist to the user's lab account
            if item.id != "Self" && !self.registeredDoctors.contains(where: { $0.id == item.id }) {
                let formatted = item.title.lowercased().hasPrefix("dr") ? item.title : "Dr. \(item.title)"
                self.registeredDoctors.insert(DoctorItem(id: item.id, name: formatted, hospital: "Registered Doctor", label: formatted), at: 1)
                self.persistNewDoctor(name: formatted, spec: "", clinic: "", phone: "")
            }
        }
        picker.onAddNew = { [weak self, weak picker] in
            self?.showAddDoctorAlert(from: picker)
        }
        let nav = UINavigationController(rootViewController: picker)
        if #available(iOS 15.0, *) {
            if let sheet = nav.sheetPresentationController {
                sheet.detents = [.medium(), .large()]
                sheet.prefersGrabberVisible = true
            }
        }
        present(nav, animated: true)
    }

    private func showAddDoctorAlert(from picker: SearchableModalPickerViewController?) {
        let alert = UIAlertController(title: "Add Referring Doctor", message: "Enter physician information to add them to your laboratory.", preferredStyle: .alert)
        alert.addTextField { tf in
            tf.placeholder = "Full Name (e.g., Dr. Priya Sharma) *"
            tf.autocapitalizationType = .words
        }
        alert.addTextField { tf in
            tf.placeholder = "Specialization (e.g., MBBS, MD)"
            tf.autocapitalizationType = .words
        }
        alert.addTextField { tf in
            tf.placeholder = "Clinic / Hospital (e.g., City Clinic)"
            tf.autocapitalizationType = .words
        }
        alert.addTextField { tf in
            tf.placeholder = "Phone Number (Optional)"
            tf.keyboardType = .phonePad
        }

        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel, handler: nil))
        alert.addAction(UIAlertAction(title: "Add Doctor", style: .default, handler: { [weak self, weak picker] _ in
            guard let name = alert.textFields?[0].text?.trimmingCharacters(in: .whitespaces), !name.isEmpty else { return }
            let spec = alert.textFields?[1].text?.trimmingCharacters(in: .whitespaces) ?? ""
            let clinic = alert.textFields?[2].text?.trimmingCharacters(in: .whitespaces) ?? ""
            let phone = alert.textFields?[3].text?.trimmingCharacters(in: .whitespaces) ?? ""
            let formatted = name.lowercased().hasPrefix("dr") ? name : "Dr. \(name)"

            self?.selectedDoctor = formatted
            self?.selectedDoctorName = formatted
            self?.doctorBtn.setTitle(formatted, for: .normal)
            self?.persistNewDoctor(name: formatted, spec: spec, clinic: clinic, phone: phone)
            picker?.dismiss(animated: true)
        }))

        (picker ?? self).present(alert, animated: true)
    }

    private func persistNewDoctor(name: String, spec: String, clinic: String, phone: String) {
        getAuthCredentials { [weak self] token, cookieHeader in
            guard let self = self, let url = URL(string: "\(self.baseUrl)/api/workspace/doctors") else { return }
            var req = URLRequest(url: url)
            req.httpMethod = "POST"
            req.setValue("application/json", forHTTPHeaderField: "Content-Type")
            if let token = token, !token.isEmpty {
                req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            }
            if let cookieHeader = cookieHeader, !cookieHeader.isEmpty {
                req.setValue(cookieHeader, forHTTPHeaderField: "Cookie")
            } else if let token = token, !token.isEmpty {
                req.setValue("token=\(token); auth-token=\(token)", forHTTPHeaderField: "Cookie")
            }
            let formatted = name.lowercased().hasPrefix("dr") ? name : "Dr. \(name)"
            let body: [String: Any] = [
                "name": formatted,
                "specialization": spec,
                "clinic": clinic,
                "phone": phone
            ]
            req.httpBody = try? JSONSerialization.data(withJSONObject: body)

            URLSession.shared.dataTask(with: req) { data, res, _ in
                if let data = data, let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                   let docObj = json["doctor"] as? [String: Any],
                   let newId = docObj["id"] as? String {
                    DispatchQueue.main.async {
                        self.selectedDoctor = newId
                        self.selectedDoctorName = formatted
                        if let idx = self.registeredDoctors.firstIndex(where: { $0.name == name || $0.name == formatted }) {
                            self.registeredDoctors[idx] = DoctorItem(id: newId, name: formatted, hospital: clinic, label: formatted)
                        } else {
                            self.registeredDoctors.insert(DoctorItem(id: newId, name: formatted, hospital: clinic, label: formatted), at: 1)
                        }
                    }
                }
            }.resume()
        }
    }

    @objc private func didTapAgencyBtn() {
        let picker = SearchableModalPickerViewController()
        picker.pickerTitle = "Agency / Client"
        picker.addNewTitle = "+ Add Agency"
        picker.items = registeredAgencies.map { ag in
            let sub = ag.id == "Direct" ? "Standard Direct Billing" : (ag.hospital.isEmpty ? "Partner Center" : "Tier: \(ag.hospital)")
            return SearchableModalPickerViewController.Item(
                id: ag.id,
                title: ag.name,
                subtitle: sub,
                isSelected: ag.id == selectedAgency || ag.name == selectedAgencyName
            )
        }
        picker.onSelect = { [weak self] item in
            guard let self = self else { return }
            self.selectedAgency = item.id
            self.selectedAgencyName = item.title
            self.agencyBtn.setTitle(item.title, for: .normal)

            // If user typed a custom new agency, persist to the user's lab account
            if item.id != "Direct" && !self.registeredAgencies.contains(where: { $0.id == item.id }) {
                self.registeredAgencies.insert(DoctorItem(id: item.id, name: item.title, hospital: "Partner Center", label: item.title), at: 1)
                self.persistNewAgency(name: item.title, tier: "Standard", phone: "", contact: "")
            }
        }
        picker.onAddNew = { [weak self, weak picker] in
            self?.showAddAgencyAlert(from: picker)
        }
        let nav = UINavigationController(rootViewController: picker)
        if #available(iOS 15.0, *) {
            if let sheet = nav.sheetPresentationController {
                sheet.detents = [.medium(), .large()]
                sheet.prefersGrabberVisible = true
            }
        }
        present(nav, animated: true)
    }

    private func showAddAgencyAlert(from picker: SearchableModalPickerViewController?) {
        let alert = UIAlertController(title: "Add Corporate Agency", message: "Enter company / partner clinic name to register as B2B client.", preferredStyle: .alert)
        alert.addTextField { tf in
            tf.placeholder = "Agency / Company Name *"
            tf.autocapitalizationType = .words
        }
        alert.addTextField { tf in
            tf.placeholder = "Contact Person (Optional)"
            tf.autocapitalizationType = .words
        }
        alert.addTextField { tf in
            tf.placeholder = "Phone Number (Optional)"
            tf.keyboardType = .phonePad
        }

        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel, handler: nil))
        alert.addAction(UIAlertAction(title: "Add Agency", style: .default, handler: { [weak self, weak picker] _ in
            guard let name = alert.textFields?[0].text?.trimmingCharacters(in: .whitespaces), !name.isEmpty else { return }
            let contact = alert.textFields?[1].text?.trimmingCharacters(in: .whitespaces) ?? ""
            let phone = alert.textFields?[2].text?.trimmingCharacters(in: .whitespaces) ?? ""

            self?.selectedAgency = name
            self?.selectedAgencyName = name
            self?.agencyBtn.setTitle(name, for: .normal)
            self?.persistNewAgency(name: name, tier: "Standard", phone: phone, contact: contact)
            picker?.dismiss(animated: true)
        }))

        (picker ?? self).present(alert, animated: true)
    }

    private func persistNewAgency(name: String, tier: String, phone: String, contact: String) {
        getAuthCredentials { [weak self] token, cookieHeader in
            guard let self = self, let url = URL(string: "\(self.baseUrl)/api/workspace/b2b/agencies") else { return }
            var req = URLRequest(url: url)
            req.httpMethod = "POST"
            req.setValue("application/json", forHTTPHeaderField: "Content-Type")
            if let token = token, !token.isEmpty {
                req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            }
            if let cookieHeader = cookieHeader, !cookieHeader.isEmpty {
                req.setValue(cookieHeader, forHTTPHeaderField: "Cookie")
            } else if let token = token, !token.isEmpty {
                req.setValue("token=\(token); auth-token=\(token)", forHTTPHeaderField: "Cookie")
            }
            let body: [String: Any] = [
                "agencyName": name,
                "contactPerson": contact,
                "phone": phone,
                "agencyTier": tier.isEmpty ? "Standard" : tier
            ]
            req.httpBody = try? JSONSerialization.data(withJSONObject: body)

            URLSession.shared.dataTask(with: req) { data, res, _ in
                if let data = data, let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                   let agObj = json["agency"] as? [String: Any],
                   let newId = agObj["id"] as? String {
                    DispatchQueue.main.async {
                        self.selectedAgency = newId
                        self.selectedAgencyName = name
                        if let idx = self.registeredAgencies.firstIndex(where: { $0.name == name }) {
                            self.registeredAgencies[idx] = DoctorItem(id: newId, name: name, hospital: tier, label: name)
                        } else {
                            self.registeredAgencies.insert(DoctorItem(id: newId, name: name, hospital: tier, label: name), at: 1)
                        }
                    }
                }
            }.resume()
        }
    }

    @objc private func didTapCollectorBtn() {
        let picker = SearchableModalPickerViewController()
        picker.pickerTitle = "Sample Collected By"
        picker.addNewTitle = "+ Custom"
        picker.items = registeredCollectors.map { col in
            var sub = col.hospital
            if col.name == "Lab Phlebotomist" { sub = "In-Lab Sample Collection" }
            else if col.name == "Home Collection Agent" { sub = "At-Home Phlebotomist Visit" }
            else if col.name == "Self (Patient)" { sub = "Sample brought by patient" }
            else if sub.isEmpty { sub = "Authorized Sample Collector" }
            return SearchableModalPickerViewController.Item(
                id: col.name,
                title: col.name,
                subtitle: sub,
                isSelected: col.name.lowercased() == selectedCollector.lowercased()
            )
        }
        picker.onSelect = { [weak self] item in
            guard let self = self else { return }
            self.selectedCollector = item.title
            self.collectorBtn.setTitle(item.title, for: .normal)
            if !self.registeredCollectors.contains(where: { $0.name.lowercased() == item.title.lowercased() }) {
                self.registeredCollectors.insert(DoctorItem(id: item.title, name: item.title, hospital: "Custom Collector", label: item.title), at: 0)
            }
        }
        picker.onAddNew = { [weak self, weak picker] in
            let alert = UIAlertController(title: "Custom Collector", message: "Enter collector or phlebotomist name.", preferredStyle: .alert)
            alert.addTextField { tf in
                tf.placeholder = "e.g., Staff Rahul, Phlebotomist Anita"
                tf.autocapitalizationType = .words
            }
            alert.addAction(UIAlertAction(title: "Cancel", style: .cancel, handler: nil))
            alert.addAction(UIAlertAction(title: "Set Collector", style: .default, handler: { [weak self, weak picker] _ in
                guard let custom = alert.textFields?[0].text?.trimmingCharacters(in: .whitespaces), !custom.isEmpty else { return }
                self?.registeredCollectors.insert(DoctorItem(id: custom, name: custom, hospital: "Custom Collector", label: custom), at: 0)
                self?.selectedCollector = custom
                self?.collectorBtn.setTitle(custom, for: .normal)
                picker?.dismiss(animated: true)
            }))
            (picker ?? self)?.present(alert, animated: true)
        }
        let nav = UINavigationController(rootViewController: picker)
        if #available(iOS 15.0, *) {
            if let sheet = nav.sheetPresentationController {
                sheet.detents = [.medium(), .large()]
                sheet.prefersGrabberVisible = true
            }
        }
        present(nav, animated: true)
    }

    private func setupMenuButton(_ btn: UIButton, title: String, items: [String], onSelect: @escaping (String) -> Void) {
        btn.backgroundColor = UIColor(red: 0.973, green: 0.980, blue: 0.988, alpha: 1)
        btn.layer.cornerRadius = 12
        btn.layer.borderWidth = 1
        btn.layer.borderColor = UIColor(red: 0.886, green: 0.910, blue: 0.941, alpha: 1).cgColor
        btn.setTitle(title, for: .normal)
        btn.setTitleColor(UIColor(red: 0.059, green: 0.090, blue: 0.165, alpha: 1), for: .normal)
        btn.titleLabel?.font = .systemFont(ofSize: 13.5, weight: .medium)
        btn.contentHorizontalAlignment = .leading
        btn.contentEdgeInsets = UIEdgeInsets(top: 0, left: 14, bottom: 0, right: 30)
        btn.heightAnchor.constraint(equalToConstant: 46).isActive = true

        if btn.viewWithTag(999) == nil {
            let chevron = UIImageView(image: UIImage(systemName: "chevron.up.chevron.down"))
            chevron.tintColor = UIColor(red: 0.580, green: 0.639, blue: 0.722, alpha: 1)
            chevron.contentMode = .scaleAspectFit
            chevron.tag = 999
            chevron.translatesAutoresizingMaskIntoConstraints = false
            btn.addSubview(chevron)
            NSLayoutConstraint.activate([
                chevron.trailingAnchor.constraint(equalTo: btn.trailingAnchor, constant: -12),
                chevron.centerYAnchor.constraint(equalTo: btn.centerYAnchor),
                chevron.widthAnchor.constraint(equalToConstant: 13),
                chevron.heightAnchor.constraint(equalToConstant: 13)
            ])
        }

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

// ─────────────────────────────────────────────────────────────────────────────
// MARK: – Searchable Modal Picker View Controller (Exact Web Workflow Parity)
// ─────────────────────────────────────────────────────────────────────────────
class SearchableModalPickerViewController: UIViewController, UITableViewDataSource, UITableViewDelegate, UISearchBarDelegate {

    struct Item {
        let id: String
        let title: String
        let subtitle: String
        let isSelected: Bool
    }

    var pickerTitle: String = "Select Item"
    var items: [Item] = []
    var filteredItems: [Item] = []
    var onSelect: ((Item) -> Void)?
    var onAddNew: (() -> Void)?
    var addNewTitle: String? = "+ Add New"

    private let searchBar = UISearchBar()
    private let tableView = UITableView(frame: .zero, style: .insetGrouped)
    private var currentSearchText: String = ""

    // Empty state container matching web's CreatableCombobox CommandEmpty
    private let emptyContainer = UIView()
    private let emptyLabel = UILabel()
    private let emptyAddBtn = UIButton(type: .system)

    override func viewDidLoad() {
        super.viewDidLoad()
        title = pickerTitle
        view.backgroundColor = .systemGroupedBackground

        if let addTitle = addNewTitle, onAddNew != nil {
            navigationItem.rightBarButtonItem = UIBarButtonItem(title: addTitle, style: .done, target: self, action: #selector(didTapAdd))
            navigationItem.rightBarButtonItem?.tintColor = UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1)
        }
        navigationItem.leftBarButtonItem = UIBarButtonItem(barButtonSystemItem: .close, target: self, action: #selector(didTapClose))

        searchBar.placeholder = "Search or type new..."
        searchBar.delegate = self
        searchBar.searchBarStyle = .minimal
        searchBar.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(searchBar)

        tableView.dataSource = self
        tableView.delegate = self
        tableView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(tableView)

        // Setup Empty State
        setupEmptyState()

        NSLayoutConstraint.activate([
            searchBar.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 4),
            searchBar.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 8),
            searchBar.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -8),

            tableView.topAnchor.constraint(equalTo: searchBar.bottomAnchor, constant: 4),
            tableView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            tableView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            tableView.bottomAnchor.constraint(equalTo: view.bottomAnchor)
        ])

        filteredItems = items
    }

    private func setupEmptyState() {
        emptyContainer.frame = CGRect(x: 0, y: 0, width: 300, height: 120)

        emptyLabel.text = "No record found."
        emptyLabel.font = .systemFont(ofSize: 13.5, weight: .medium)
        emptyLabel.textColor = UIColor(red: 0.392, green: 0.455, blue: 0.545, alpha: 1)
        emptyLabel.textAlignment = .center
        emptyLabel.translatesAutoresizingMaskIntoConstraints = false

        emptyAddBtn.setTitle("+ Add New", for: .normal)
        emptyAddBtn.setTitleColor(UIColor(red: 0.263, green: 0.282, blue: 0.933, alpha: 1), for: .normal)
        emptyAddBtn.titleLabel?.font = .systemFont(ofSize: 14, weight: .bold)
        emptyAddBtn.backgroundColor = UIColor(red: 0.933, green: 0.949, blue: 1.0, alpha: 1)
        emptyAddBtn.layer.cornerRadius = 10
        emptyAddBtn.translatesAutoresizingMaskIntoConstraints = false
        emptyAddBtn.addTarget(self, action: #selector(didTapEmptyAdd), for: .touchUpInside)

        emptyContainer.addSubview(emptyLabel)
        emptyContainer.addSubview(emptyAddBtn)

        NSLayoutConstraint.activate([
            emptyLabel.topAnchor.constraint(equalTo: emptyContainer.topAnchor, constant: 18),
            emptyLabel.centerXAnchor.constraint(equalTo: emptyContainer.centerXAnchor),

            emptyAddBtn.topAnchor.constraint(equalTo: emptyLabel.bottomAnchor, constant: 12),
            emptyAddBtn.leadingAnchor.constraint(equalTo: emptyContainer.leadingAnchor, constant: 24),
            emptyAddBtn.trailingAnchor.constraint(equalTo: emptyContainer.trailingAnchor, constant: -24),
            emptyAddBtn.heightAnchor.constraint(equalToConstant: 42)
        ])
    }

    @objc private func didTapClose() {
        dismiss(animated: true)
    }

    @objc private func didTapAdd() {
        onAddNew?()
    }

    @objc private func didTapEmptyAdd() {
        guard !currentSearchText.isEmpty else { return }
        let newItem = Item(id: currentSearchText, title: currentSearchText, subtitle: "Added Entry", isSelected: true)
        onSelect?(newItem)
        dismiss(animated: true)
    }

    func searchBar(_ searchBar: UISearchBar, textDidChange searchText: String) {
        currentSearchText = searchText.trimmingCharacters(in: .whitespacesAndNewlines)
        let q = currentSearchText.lowercased()
        if q.isEmpty {
            filteredItems = items
            tableView.tableFooterView = UIView()
        } else {
            filteredItems = items.filter {
                $0.title.lowercased().contains(q) || $0.subtitle.lowercased().contains(q)
            }
            if filteredItems.isEmpty {
                emptyAddBtn.setTitle("+ Add \"\(currentSearchText)\"", for: .normal)
                tableView.tableFooterView = emptyContainer
            } else {
                tableView.tableFooterView = UIView()
            }
        }
        tableView.reloadData()
    }

    func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        return filteredItems.count
    }

    func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let item = filteredItems[indexPath.row]
        let cell = UITableViewCell(style: .subtitle, reuseIdentifier: "PickerCell")
        cell.textLabel?.text = item.title
        cell.textLabel?.font = .systemFont(ofSize: 15, weight: item.isSelected ? .bold : .medium)
        cell.textLabel?.textColor = UIColor(red: 0.059, green: 0.090, blue: 0.165, alpha: 1)
        cell.detailTextLabel?.text = item.subtitle
        cell.detailTextLabel?.font = .systemFont(ofSize: 12)
        cell.detailTextLabel?.textColor = .secondaryLabel
        cell.accessoryType = item.isSelected ? .checkmark : .none
        cell.tintColor = UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1)
        return cell
    }

    func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        tableView.deselectRow(at: indexPath, animated: true)
        let item = filteredItems[indexPath.row]
        onSelect?(item)
        dismiss(animated: true)
    }
}
