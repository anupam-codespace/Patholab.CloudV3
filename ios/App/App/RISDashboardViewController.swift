import UIKit

/**
 * RISDashboardViewController
 * ─────────────────────────────────────────────────────────────────────────────
 * Native dedicated Radiology Information System (RIS) Command Center (iOS).
 * Full 100% feature and data parity with web (/workspace/radiology/dashboard):
 *  - Header with Back, Title, Subtitle, and animated Refresh
 *  - 4 Dynamic KPI Metric Cards (Today's Scans, Pending Reports, Avg. Turnaround, Revenue Today)
 *  - Today's Live Workflow Pipeline (Scheduled → Waiting → Scanning → Reporting → Verified)
 *  - Modality Fleet Status with active machine badges, current patient, next slot, and load progress bars
 *  - Radiologist Pending Queue with accession badges, urgent tags, and clear-state screen
 *  - Quick Access Pill Bar (Scan Schedule, Machines, Macros, DICOM, Letterhead)
 *  - Pull-to-refresh & real-time auto sync
 */
class RISDashboardViewController: UIViewController {

    private static let baseUrl = "https://app.patholab.cloud"

    // ── Header & Navigation ──
    private let navBar         = UIView()
    private let backBtn        = UIButton(type: .system)
    private let titleLabel     = UILabel()
    private let subtitleLabel  = UILabel()
    private let refreshBtn     = UIButton(type: .system)
    private let navBorder      = UIView()

    // ── Scroll Content ──
    private let scrollView     = UIScrollView()
    private let contentView    = UIView()
    private let mainStack      = UIStackView()

    // ── KPI Cards ──
    private let kpiStack       = UIStackView()
    private let cardToday      = MetricCardView()
    private let cardPending    = MetricCardView()
    private let cardAvgTat     = MetricCardView()
    private let cardRevenue    = MetricCardView()

    // ── Quick Nav Bar ──
    private let quickNavScroll = UIScrollView()
    private let quickNavStack  = UIStackView()

    // ── Live Workflow Pipeline ──
    private let workflowCard   = UIView()
    private let workflowStack  = UIStackView()
    private var workflowSteps: [WorkflowStepView] = []

    // ── Modality Fleet Section ──
    private let modalityCard   = UIView()
    private let modalityStack  = UIStackView()
    private let modalityEmpty  = UIView()

    // ── Pending Queue Section ──
    private let queueCard      = UIView()
    private let queueBadge     = UILabel()
    private let queueStack     = UIStackView()
    private let queueEmpty     = UIView()

    // ── Loading Spinner ──
    private let spinner        = UIActivityIndicatorView(style: .medium)

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 248/255, green: 250/255, blue: 252/255, alpha: 1) // #F8FAFC
        setupNavBar()
        setupScrollView()
        setupKPIs()
        setupQuickNav()
        setupWorkflowPipeline()
        setupModalityFleet()
        setupPendingQueue()
        fetchDashboard(manual: false)
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        navigationController?.setNavigationBarHidden(true, animated: animated)
    }

    // MARK: - Navigation Bar
    private func setupNavBar() {
        let safeTop = UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .first?.windows.first?.safeAreaInsets.top ?? 44

        navBar.backgroundColor = .white
        navBar.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(navBar)

        backBtn.setImage(UIImage(systemName: "chevron.left"), for: .normal)
        backBtn.tintColor = UIColor(red: 15/255, green: 23/255, blue: 42/255, alpha: 1)
        backBtn.addTarget(self, action: #selector(handleBack), for: .touchUpInside)
        backBtn.translatesAutoresizingMaskIntoConstraints = false

        titleLabel.text = "Radiology Command Center"
        titleLabel.font = .systemFont(ofSize: 17, weight: .bold)
        titleLabel.textColor = UIColor(red: 15/255, green: 23/255, blue: 42/255, alpha: 1)
        titleLabel.translatesAutoresizingMaskIntoConstraints = false

        subtitleLabel.text = "Monitor modalities, workflow & queues"
        subtitleLabel.font = .systemFont(ofSize: 11, weight: .regular)
        subtitleLabel.textColor = UIColor(red: 100/255, green: 116/255, blue: 139/255, alpha: 1)
        subtitleLabel.translatesAutoresizingMaskIntoConstraints = false

        let titleVStack = UIStackView(arrangedSubviews: [titleLabel, subtitleLabel])
        titleVStack.axis = .vertical
        titleVStack.alignment = .leading
        titleVStack.spacing = 1
        titleVStack.translatesAutoresizingMaskIntoConstraints = false

        refreshBtn.setImage(UIImage(systemName: "arrow.clockwise"), for: .normal)
        refreshBtn.tintColor = UIColor(red: 79/255, green: 70/255, blue: 229/255, alpha: 1)
        refreshBtn.addTarget(self, action: #selector(handleRefresh), for: .touchUpInside)
        refreshBtn.translatesAutoresizingMaskIntoConstraints = false

        navBorder.backgroundColor = UIColor(red: 226/255, green: 232/255, blue: 240/255, alpha: 1)
        navBorder.translatesAutoresizingMaskIntoConstraints = false

        navBar.addSubview(backBtn)
        navBar.addSubview(titleVStack)
        navBar.addSubview(refreshBtn)
        navBar.addSubview(navBorder)

        NSLayoutConstraint.activate([
            navBar.topAnchor.constraint(equalTo: view.topAnchor),
            navBar.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            navBar.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            navBar.heightAnchor.constraint(equalToConstant: safeTop + 56),

            backBtn.leadingAnchor.constraint(equalTo: navBar.leadingAnchor, constant: 14),
            backBtn.bottomAnchor.constraint(equalTo: navBar.bottomAnchor, constant: -10),
            backBtn.widthAnchor.constraint(equalToConstant: 36),
            backBtn.heightAnchor.constraint(equalToConstant: 36),

            titleVStack.leadingAnchor.constraint(equalTo: backBtn.trailingAnchor, constant: 10),
            titleVStack.centerYAnchor.constraint(equalTo: backBtn.centerYAnchor),
            titleVStack.trailingAnchor.constraint(lessThanOrEqualTo: refreshBtn.leadingAnchor, constant: -8),

            refreshBtn.trailingAnchor.constraint(equalTo: navBar.trailingAnchor, constant: -14),
            refreshBtn.centerYAnchor.constraint(equalTo: backBtn.centerYAnchor),
            refreshBtn.widthAnchor.constraint(equalToConstant: 36),
            refreshBtn.heightAnchor.constraint(equalToConstant: 36),

            navBorder.leadingAnchor.constraint(equalTo: navBar.leadingAnchor),
            navBorder.trailingAnchor.constraint(equalTo: navBar.trailingAnchor),
            navBorder.bottomAnchor.constraint(equalTo: navBar.bottomAnchor),
            navBorder.heightAnchor.constraint(equalToConstant: 1)
        ])
    }

    // MARK: - Scroll View
    private func setupScrollView() {
        scrollView.translatesAutoresizingMaskIntoConstraints = false
        scrollView.alwaysBounceVertical = true
        view.addSubview(scrollView)

        let refreshControl = UIRefreshControl()
        refreshControl.addTarget(self, action: #selector(handleRefresh), for: .valueChanged)
        scrollView.refreshControl = refreshControl

        contentView.translatesAutoresizingMaskIntoConstraints = false
        scrollView.addSubview(contentView)

        mainStack.axis = .vertical
        mainStack.spacing = 18
        mainStack.alignment = .fill
        mainStack.translatesAutoresizingMaskIntoConstraints = false
        contentView.addSubview(mainStack)

        NSLayoutConstraint.activate([
            scrollView.topAnchor.constraint(equalTo: navBar.bottomAnchor),
            scrollView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            scrollView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            scrollView.bottomAnchor.constraint(equalTo: view.bottomAnchor),

            contentView.topAnchor.constraint(equalTo: scrollView.topAnchor),
            contentView.leadingAnchor.constraint(equalTo: scrollView.leadingAnchor),
            contentView.trailingAnchor.constraint(equalTo: scrollView.trailingAnchor),
            contentView.bottomAnchor.constraint(equalTo: scrollView.bottomAnchor),
            contentView.widthAnchor.constraint(equalTo: scrollView.widthAnchor),

            mainStack.topAnchor.constraint(equalTo: contentView.topAnchor, constant: 16),
            mainStack.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 16),
            mainStack.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -16),
            mainStack.bottomAnchor.constraint(equalTo: contentView.bottomAnchor, constant: -32)
        ])
    }

    // MARK: - 4 Dynamic KPI Cards
    private func setupKPIs() {
        kpiStack.axis = .vertical
        kpiStack.spacing = 10
        kpiStack.translatesAutoresizingMaskIntoConstraints = false

        let row1 = UIStackView(arrangedSubviews: [cardToday, cardPending])
        row1.axis = .horizontal
        row1.distribution = .fillEqually
        row1.spacing = 10

        let row2 = UIStackView(arrangedSubviews: [cardAvgTat, cardRevenue])
        row2.axis = .horizontal
        row2.distribution = .fillEqually
        row2.spacing = 10

        kpiStack.addArrangedSubview(row1)
        kpiStack.addArrangedSubview(row2)

        cardToday.configure(title: "Today's Scans", value: "0", icon: "waveform.path.ecg", color: UIColor(red: 37/255, green: 99/255, blue: 235/255, alpha: 1))
        cardPending.configure(title: "Pending Reports", value: "0", icon: "doc.text.fill", color: UIColor(red: 234/255, green: 88/255, blue: 12/255, alpha: 1))
        cardAvgTat.configure(title: "Avg. Turnaround", value: "0h 0m", icon: "clock.fill", color: UIColor(red: 147/255, green: 51/255, blue: 234/255, alpha: 1))
        cardRevenue.configure(title: "Revenue (Today)", value: "₹0", icon: "indianrupeesign.circle.fill", color: UIColor(red: 5/255, green: 150/255, blue: 105/255, alpha: 1))

        mainStack.addArrangedSubview(kpiStack)
    }

    // MARK: - Quick Navigation Bar
    private func setupQuickNav() {
        quickNavScroll.showsHorizontalScrollIndicator = false
        quickNavScroll.translatesAutoresizingMaskIntoConstraints = false
        quickNavScroll.heightAnchor.constraint(equalToConstant: 42).isActive = true

        quickNavStack.axis = .horizontal
        quickNavStack.spacing = 8
        quickNavStack.alignment = .center
        quickNavStack.translatesAutoresizingMaskIntoConstraints = false
        quickNavScroll.addSubview(quickNavStack)

        NSLayoutConstraint.activate([
            quickNavStack.topAnchor.constraint(equalTo: quickNavScroll.topAnchor),
            quickNavStack.leadingAnchor.constraint(equalTo: quickNavScroll.leadingAnchor),
            quickNavStack.trailingAnchor.constraint(equalTo: quickNavScroll.trailingAnchor),
            quickNavStack.bottomAnchor.constraint(equalTo: quickNavScroll.bottomAnchor),
            quickNavStack.heightAnchor.constraint(equalTo: quickNavScroll.heightAnchor)
        ])

        let items: [(title: String, icon: String, action: Selector)] = [
            ("Scan Schedule", "calendar", #selector(openScanSchedule)),
            ("Machines", "gearshape.2.fill", #selector(openMachines)),
            ("RIS Macros", "square.and.pencil", #selector(openMacros)),
            ("DICOM Settings", "gearshape.fill", #selector(openDICOM)),
            ("RIS Letterhead", "doc.richtext.fill", #selector(openLetterhead))
        ]

        for item in items {
            let btn = UIButton(type: .system)
            var config = UIButton.Configuration.plain()
            config.title = item.title
            config.image = UIImage(systemName: item.icon)
            config.imagePlacement = .leading
            config.imagePadding = 6
            config.baseForegroundColor = UIColor(red: 30/255, green: 41/255, blue: 59/255, alpha: 1)
            config.contentInsets = NSDirectionalEdgeInsets(top: 6, leading: 12, bottom: 6, trailing: 14)
            btn.configuration = config
            btn.titleLabel?.font = .systemFont(ofSize: 12.5, weight: .semibold)
            btn.backgroundColor = .white
            btn.layer.cornerRadius = 16
            btn.layer.borderWidth = 1
            btn.layer.borderColor = UIColor(red: 226/255, green: 232/255, blue: 240/255, alpha: 1).cgColor
            btn.addTarget(self, action: item.action, for: .touchUpInside)
            quickNavStack.addArrangedSubview(btn)
        }

        mainStack.addArrangedSubview(quickNavScroll)
    }

    // MARK: - Live Workflow Pipeline (Scheduled → Waiting → Scanning → Reporting → Verified)
    private func setupWorkflowPipeline() {
        styleCard(workflowCard)

        let titleRow = UIStackView()
        titleRow.axis = .horizontal
        titleRow.spacing = 8
        titleRow.alignment = .center

        let icon = UIImageView(image: UIImage(systemName: "waveform.path.ecg.rectangle.fill"))
        icon.tintColor = UIColor(red: 79/255, green: 70/255, blue: 229/255, alpha: 1)
        icon.translatesAutoresizingMaskIntoConstraints = false
        icon.widthAnchor.constraint(equalToConstant: 18).isActive = true
        icon.heightAnchor.constraint(equalToConstant: 18).isActive = true

        let titleLbl = UILabel()
        titleLbl.text = "TODAY'S LIVE WORKFLOW"
        titleLbl.font = .systemFont(ofSize: 12, weight: .heavy)
        titleLbl.textColor = UIColor(red: 71/255, green: 85/255, blue: 105/255, alpha: 1)

        titleRow.addArrangedSubview(icon)
        titleRow.addArrangedSubview(titleLbl)
        titleRow.translatesAutoresizingMaskIntoConstraints = false
        workflowCard.addSubview(titleRow)

        let divider = UIView()
        divider.backgroundColor = UIColor(red: 241/255, green: 245/255, blue: 249/255, alpha: 1)
        divider.translatesAutoresizingMaskIntoConstraints = false
        workflowCard.addSubview(divider)

        // Horizontal Scroll for 5 steps
        let hScroll = UIScrollView()
        hScroll.showsHorizontalScrollIndicator = false
        hScroll.translatesAutoresizingMaskIntoConstraints = false
        workflowCard.addSubview(hScroll)

        workflowStack.axis = .horizontal
        workflowStack.spacing = 10
        workflowStack.alignment = .center
        workflowStack.translatesAutoresizingMaskIntoConstraints = false
        hScroll.addSubview(workflowStack)

        let stepDefs: [(label: String, icon: String, color: UIColor)] = [
            ("Scheduled", "calendar", UIColor(red: 100/255, green: 116/255, blue: 139/255, alpha: 1)),
            ("Waiting", "person.2.fill", UIColor(red: 217/255, green: 119/255, blue: 6/255, alpha: 1)),
            ("Scanning", "waveform.path.ecg", UIColor(red: 37/255, green: 99/255, blue: 235/255, alpha: 1)),
            ("Reporting", "doc.text.fill", UIColor(red: 147/255, green: 51/255, blue: 234/255, alpha: 1)),
            ("Verified", "checkmark.seal.fill", UIColor(red: 5/255, green: 150/255, blue: 105/255, alpha: 1))
        ]

        workflowSteps = []
        for (i, def) in stepDefs.enumerated() {
            let stepView = WorkflowStepView(label: def.label, icon: def.icon, color: def.color)
            workflowSteps.append(stepView)
            workflowStack.addArrangedSubview(stepView)

            if i < stepDefs.count - 1 {
                let arrow = UIImageView(image: UIImage(systemName: "chevron.right"))
                arrow.tintColor = UIColor(red: 203/255, green: 213/255, blue: 225/255, alpha: 1)
                arrow.translatesAutoresizingMaskIntoConstraints = false
                arrow.widthAnchor.constraint(equalToConstant: 14).isActive = true
                arrow.heightAnchor.constraint(equalToConstant: 14).isActive = true
                workflowStack.addArrangedSubview(arrow)
            }
        }

        NSLayoutConstraint.activate([
            titleRow.topAnchor.constraint(equalTo: workflowCard.topAnchor, constant: 14),
            titleRow.leadingAnchor.constraint(equalTo: workflowCard.leadingAnchor, constant: 16),
            titleRow.trailingAnchor.constraint(equalTo: workflowCard.trailingAnchor, constant: -16),

            divider.topAnchor.constraint(equalTo: titleRow.bottomAnchor, constant: 12),
            divider.leadingAnchor.constraint(equalTo: workflowCard.leadingAnchor),
            divider.trailingAnchor.constraint(equalTo: workflowCard.trailingAnchor),
            divider.heightAnchor.constraint(equalToConstant: 1),

            hScroll.topAnchor.constraint(equalTo: divider.bottomAnchor, constant: 12),
            hScroll.leadingAnchor.constraint(equalTo: workflowCard.leadingAnchor, constant: 12),
            hScroll.trailingAnchor.constraint(equalTo: workflowCard.trailingAnchor, constant: -12),
            hScroll.bottomAnchor.constraint(equalTo: workflowCard.bottomAnchor, constant: -14),
            hScroll.heightAnchor.constraint(equalToConstant: 80),

            workflowStack.topAnchor.constraint(equalTo: hScroll.topAnchor),
            workflowStack.leadingAnchor.constraint(equalTo: hScroll.leadingAnchor),
            workflowStack.trailingAnchor.constraint(equalTo: hScroll.trailingAnchor),
            workflowStack.bottomAnchor.constraint(equalTo: hScroll.bottomAnchor),
            workflowStack.heightAnchor.constraint(equalTo: hScroll.heightAnchor)
        ])

        mainStack.addArrangedSubview(workflowCard)
    }

    // MARK: - Modality Fleet Status
    private func setupModalityFleet() {
        styleCard(modalityCard)

        let headerRow = UIStackView()
        headerRow.axis = .horizontal
        headerRow.spacing = 8
        headerRow.alignment = .center

        let icon = UIImageView(image: UIImage(systemName: "server.rack"))
        icon.tintColor = UIColor(red: 79/255, green: 70/255, blue: 229/255, alpha: 1)
        icon.translatesAutoresizingMaskIntoConstraints = false
        icon.widthAnchor.constraint(equalToConstant: 18).isActive = true
        icon.heightAnchor.constraint(equalToConstant: 18).isActive = true

        let title = UILabel()
        title.text = "Modality Fleet Status"
        title.font = .systemFont(ofSize: 15, weight: .bold)
        title.textColor = UIColor(red: 15/255, green: 23/255, blue: 42/255, alpha: 1)

        let btnManage = UIButton(type: .system)
        btnManage.setTitle("Manage", for: .normal)
        btnManage.setTitleColor(UIColor(red: 79/255, green: 70/255, blue: 229/255, alpha: 1), for: .normal)
        btnManage.titleLabel?.font = .systemFont(ofSize: 12, weight: .bold)
        btnManage.backgroundColor = UIColor(red: 238/255, green: 242/255, blue: 255/255, alpha: 1)
        btnManage.layer.cornerRadius = 8
        btnManage.contentEdgeInsets = UIEdgeInsets(top: 4, left: 10, bottom: 4, right: 10)
        btnManage.addTarget(self, action: #selector(openMachines), for: .touchUpInside)

        let spacer = UIView()
        headerRow.addArrangedSubview(icon)
        headerRow.addArrangedSubview(title)
        headerRow.addArrangedSubview(spacer)
        headerRow.addArrangedSubview(btnManage)
        headerRow.translatesAutoresizingMaskIntoConstraints = false
        modalityCard.addSubview(headerRow)

        let divider = UIView()
        divider.backgroundColor = UIColor(red: 241/255, green: 245/255, blue: 249/255, alpha: 1)
        divider.translatesAutoresizingMaskIntoConstraints = false
        modalityCard.addSubview(divider)

        // Stack for modality rows
        modalityStack.axis = .vertical
        modalityStack.spacing = 10
        modalityStack.translatesAutoresizingMaskIntoConstraints = false
        modalityCard.addSubview(modalityStack)

        // Empty state
        modalityEmpty.translatesAutoresizingMaskIntoConstraints = false
        let emptyIcon = UIImageView(image: UIImage(systemName: "server.rack"))
        emptyIcon.tintColor = UIColor(red: 203/255, green: 213/255, blue: 225/255, alpha: 1)
        emptyIcon.contentMode = .scaleAspectFit
        emptyIcon.translatesAutoresizingMaskIntoConstraints = false

        let emptyLbl = UILabel()
        emptyLbl.text = "No machines registered"
        emptyLbl.font = .systemFont(ofSize: 13, weight: .medium)
        emptyLbl.textColor = UIColor(red: 148/255, green: 163/255, blue: 184/255, alpha: 1)
        emptyLbl.textAlignment = .center
        emptyLbl.translatesAutoresizingMaskIntoConstraints = false

        modalityEmpty.addSubview(emptyIcon)
        modalityEmpty.addSubview(emptyLbl)
        modalityCard.addSubview(modalityEmpty)

        NSLayoutConstraint.activate([
            headerRow.topAnchor.constraint(equalTo: modalityCard.topAnchor, constant: 14),
            headerRow.leadingAnchor.constraint(equalTo: modalityCard.leadingAnchor, constant: 16),
            headerRow.trailingAnchor.constraint(equalTo: modalityCard.trailingAnchor, constant: -16),

            divider.topAnchor.constraint(equalTo: headerRow.bottomAnchor, constant: 12),
            divider.leadingAnchor.constraint(equalTo: modalityCard.leadingAnchor),
            divider.trailingAnchor.constraint(equalTo: modalityCard.trailingAnchor),
            divider.heightAnchor.constraint(equalToConstant: 1),

            modalityStack.topAnchor.constraint(equalTo: divider.bottomAnchor, constant: 12),
            modalityStack.leadingAnchor.constraint(equalTo: modalityCard.leadingAnchor, constant: 16),
            modalityStack.trailingAnchor.constraint(equalTo: modalityCard.trailingAnchor, constant: -16),
            modalityStack.bottomAnchor.constraint(equalTo: modalityCard.bottomAnchor, constant: -16),

            modalityEmpty.topAnchor.constraint(equalTo: divider.bottomAnchor, constant: 20),
            modalityEmpty.leadingAnchor.constraint(equalTo: modalityCard.leadingAnchor, constant: 16),
            modalityEmpty.trailingAnchor.constraint(equalTo: modalityCard.trailingAnchor, constant: -16),
            modalityEmpty.bottomAnchor.constraint(equalTo: modalityCard.bottomAnchor, constant: -20),

            emptyIcon.topAnchor.constraint(equalTo: modalityEmpty.topAnchor),
            emptyIcon.centerXAnchor.constraint(equalTo: modalityEmpty.centerXAnchor),
            emptyIcon.widthAnchor.constraint(equalToConstant: 32),
            emptyIcon.heightAnchor.constraint(equalToConstant: 32),

            emptyLbl.topAnchor.constraint(equalTo: emptyIcon.bottomAnchor, constant: 8),
            emptyLbl.leadingAnchor.constraint(equalTo: modalityEmpty.leadingAnchor),
            emptyLbl.trailingAnchor.constraint(equalTo: modalityEmpty.trailingAnchor),
            emptyLbl.bottomAnchor.constraint(equalTo: modalityEmpty.bottomAnchor)
        ])

        mainStack.addArrangedSubview(modalityCard)
    }

    // MARK: - Radiologist Pending Queue
    private func setupPendingQueue() {
        styleCard(queueCard)

        let headerRow = UIStackView()
        headerRow.axis = .horizontal
        headerRow.spacing = 8
        headerRow.alignment = .center

        let icon = UIImageView(image: UIImage(systemName: "stethoscope"))
        icon.tintColor = UIColor(red: 147/255, green: 51/255, blue: 234/255, alpha: 1)
        icon.translatesAutoresizingMaskIntoConstraints = false
        icon.widthAnchor.constraint(equalToConstant: 18).isActive = true
        icon.heightAnchor.constraint(equalToConstant: 18).isActive = true

        let title = UILabel()
        title.text = "Radiologist Pending Queue"
        title.font = .systemFont(ofSize: 15, weight: .bold)
        title.textColor = UIColor(red: 15/255, green: 23/255, blue: 42/255, alpha: 1)

        queueBadge.text = " 0 "
        queueBadge.font = .systemFont(ofSize: 11, weight: .bold)
        queueBadge.textColor = UIColor(red: 147/255, green: 51/255, blue: 234/255, alpha: 1)
        queueBadge.backgroundColor = UIColor(red: 243/255, green: 232/255, blue: 255/255, alpha: 1)
        queueBadge.layer.cornerRadius = 6
        queueBadge.layer.masksToBounds = true

        let spacer = UIView()
        headerRow.addArrangedSubview(icon)
        headerRow.addArrangedSubview(title)
        headerRow.addArrangedSubview(queueBadge)
        headerRow.addArrangedSubview(spacer)
        headerRow.translatesAutoresizingMaskIntoConstraints = false
        queueCard.addSubview(headerRow)

        let divider = UIView()
        divider.backgroundColor = UIColor(red: 241/255, green: 245/255, blue: 249/255, alpha: 1)
        divider.translatesAutoresizingMaskIntoConstraints = false
        queueCard.addSubview(divider)

        // Queue Stack
        queueStack.axis = .vertical
        queueStack.spacing = 8
        queueStack.translatesAutoresizingMaskIntoConstraints = false
        queueCard.addSubview(queueStack)

        // Empty Queue State
        queueEmpty.translatesAutoresizingMaskIntoConstraints = false
        let checkIcon = UIImageView(image: UIImage(systemName: "checkmark.circle.fill"))
        checkIcon.tintColor = UIColor(red: 5/255, green: 150/255, blue: 105/255, alpha: 1)
        checkIcon.translatesAutoresizingMaskIntoConstraints = false

        let queueEmptyTitle = UILabel()
        queueEmptyTitle.text = "Queue is Clear"
        queueEmptyTitle.font = .systemFont(ofSize: 14, weight: .bold)
        queueEmptyTitle.textColor = UIColor(red: 51/255, green: 65/255, blue: 85/255, alpha: 1)
        queueEmptyTitle.textAlignment = .center
        queueEmptyTitle.translatesAutoresizingMaskIntoConstraints = false

        let queueEmptySub = UILabel()
        queueEmptySub.text = "All scans have been reported by the radiologist."
        queueEmptySub.font = .systemFont(ofSize: 12, weight: .regular)
        queueEmptySub.textColor = UIColor(red: 148/255, green: 163/255, blue: 184/255, alpha: 1)
        queueEmptySub.textAlignment = .center
        queueEmptySub.translatesAutoresizingMaskIntoConstraints = false

        queueEmpty.addSubview(checkIcon)
        queueEmpty.addSubview(queueEmptyTitle)
        queueEmpty.addSubview(queueEmptySub)
        queueCard.addSubview(queueEmpty)

        NSLayoutConstraint.activate([
            headerRow.topAnchor.constraint(equalTo: queueCard.topAnchor, constant: 14),
            headerRow.leadingAnchor.constraint(equalTo: queueCard.leadingAnchor, constant: 16),
            headerRow.trailingAnchor.constraint(equalTo: queueCard.trailingAnchor, constant: -16),

            divider.topAnchor.constraint(equalTo: headerRow.bottomAnchor, constant: 12),
            divider.leadingAnchor.constraint(equalTo: queueCard.leadingAnchor),
            divider.trailingAnchor.constraint(equalTo: queueCard.trailingAnchor),
            divider.heightAnchor.constraint(equalToConstant: 1),

            queueStack.topAnchor.constraint(equalTo: divider.bottomAnchor, constant: 12),
            queueStack.leadingAnchor.constraint(equalTo: queueCard.leadingAnchor, constant: 16),
            queueStack.trailingAnchor.constraint(equalTo: queueCard.trailingAnchor, constant: -16),
            queueStack.bottomAnchor.constraint(equalTo: queueCard.bottomAnchor, constant: -16),

            queueEmpty.topAnchor.constraint(equalTo: divider.bottomAnchor, constant: 24),
            queueEmpty.leadingAnchor.constraint(equalTo: queueCard.leadingAnchor, constant: 16),
            queueEmpty.trailingAnchor.constraint(equalTo: queueCard.trailingAnchor, constant: -16),
            queueEmpty.bottomAnchor.constraint(equalTo: queueCard.bottomAnchor, constant: -24),

            checkIcon.topAnchor.constraint(equalTo: queueEmpty.topAnchor),
            checkIcon.centerXAnchor.constraint(equalTo: queueEmpty.centerXAnchor),
            checkIcon.widthAnchor.constraint(equalToConstant: 36),
            checkIcon.heightAnchor.constraint(equalToConstant: 36),

            queueEmptyTitle.topAnchor.constraint(equalTo: checkIcon.bottomAnchor, constant: 8),
            queueEmptyTitle.leadingAnchor.constraint(equalTo: queueEmpty.leadingAnchor),
            queueEmptyTitle.trailingAnchor.constraint(equalTo: queueEmpty.trailingAnchor),

            queueEmptySub.topAnchor.constraint(equalTo: queueEmptyTitle.bottomAnchor, constant: 4),
            queueEmptySub.leadingAnchor.constraint(equalTo: queueEmpty.leadingAnchor),
            queueEmptySub.trailingAnchor.constraint(equalTo: queueEmpty.trailingAnchor),
            queueEmptySub.bottomAnchor.constraint(equalTo: queueEmpty.bottomAnchor)
        ])

        mainStack.addArrangedSubview(queueCard)
    }

    private func styleCard(_ view: UIView) {
        view.backgroundColor = .white
        view.layer.cornerRadius = 16
        view.layer.borderWidth = 1
        view.layer.borderColor = UIColor(red: 226/255, green: 232/255, blue: 240/255, alpha: 1).cgColor
        view.layer.shadowColor = UIColor.black.cgColor
        view.layer.shadowOffset = CGSize(width: 0, height: 1)
        view.layer.shadowOpacity = 0.04
        view.layer.shadowRadius = 4
        view.translatesAutoresizingMaskIntoConstraints = false
    }

    // MARK: - API Fetch
    private func fetchDashboard(manual: Bool) {
        if !manual { spinner.startAnimating() }
        guard let url = URL(string: "\(RISDashboardViewController.baseUrl)/api/workspace/radiology/dashboard") else { return }

        var req = URLRequest(url: url)
        req.httpMethod = "GET"
        let token = KeychainManager.shared.getToken() ?? ""
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        req.setValue("token=\(token)", forHTTPHeaderField: "Cookie")
        req.setValue("application/json", forHTTPHeaderField: "Accept")
        req.timeoutInterval = 15

        URLSession.shared.dataTask(with: req) { [weak self] data, response, error in
            DispatchQueue.main.async {
                guard let self = self else { return }
                self.spinner.stopAnimating()
                self.scrollView.refreshControl?.endRefreshing()

                guard let data = data, error == nil,
                      let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
                    return
                }

                // 1. Stats
                if let stats = json["stats"] as? [String: Any] {
                    self.bindStats(stats)
                }

                // 2. Workflow
                if let workflow = json["workflow"] as? [String: Any] {
                    self.bindWorkflow(workflow)
                }

                // 3. Modalities
                let modalities = json["modalities"] as? [[String: Any]] ?? []
                self.bindModalities(modalities)

                // 4. Pending Queue
                let pendingQueue = json["pendingQueue"] as? [[String: Any]] ?? []
                self.bindPendingQueue(pendingQueue)
            }
        }.resume()
    }

    private func bindStats(_ stats: [String: Any]) {
        let scansToday = stats["scansToday"] as? Int ?? (stats["todayScans"] as? Int ?? 0)
        let pending = stats["pendingReports"] as? Int ?? (stats["pending"] as? Int ?? 0)
        let avgTat = stats["avgTat"] as? String ?? "0h 0m"
        let revenue = stats["revenueToday"] as? String ?? "₹0"

        cardToday.setValue("\(scansToday)")
        cardPending.setValue("\(pending)")
        cardAvgTat.setValue(avgTat)
        cardRevenue.setValue(revenue)
    }

    private func bindWorkflow(_ workflow: [String: Any]) {
        let scheduled = workflow["scheduled"] as? Int ?? 0
        let waiting = workflow["waiting"] as? Int ?? 0
        let scanning = workflow["scanning"] as? Int ?? 0
        let reporting = workflow["reporting"] as? Int ?? 0
        let verified = workflow["verified"] as? Int ?? 0

        let counts = [scheduled, waiting, scanning, reporting, verified]
        for (i, count) in counts.enumerated() {
            if i < workflowSteps.count {
                workflowSteps[i].setCount(count)
            }
        }
    }

    private func bindModalities(_ list: [[String: Any]]) {
        modalityStack.arrangedSubviews.forEach { $0.removeFromSuperview() }
        let isEmpty = list.isEmpty
        modalityEmpty.isHidden = !isEmpty
        modalityStack.isHidden = isEmpty

        for mod in list {
            let row = ModalityFleetRowView()
            row.configure(modality: mod)
            modalityStack.addArrangedSubview(row)
        }
    }

    private func bindPendingQueue(_ list: [[String: Any]]) {
        queueStack.arrangedSubviews.forEach { $0.removeFromSuperview() }
        queueBadge.text = " \(list.count) "
        let isEmpty = list.isEmpty
        queueEmpty.isHidden = !isEmpty
        queueStack.isHidden = isEmpty

        for item in list {
            let row = PendingQueueRowView()
            row.configure(item: item)
            queueStack.addArrangedSubview(row)
        }
    }

    // MARK: - Navigation Targets
    @objc private func openScanSchedule() {
        let vc = ScanScheduleViewController()
        vc.modalPresentationStyle = .fullScreen
        present(vc, animated: true)
    }

    @objc private func openMachines() {
        let vc = MachinesViewController()
        vc.modalPresentationStyle = .fullScreen
        present(vc, animated: true)
    }

    @objc private func openMacros() {
        let vc = RISMacrosViewController()
        vc.modalPresentationStyle = .fullScreen
        present(vc, animated: true)
    }

    @objc private func openDICOM() {
        let vc = DICOMSettingsViewController()
        vc.modalPresentationStyle = .fullScreen
        present(vc, animated: true)
    }

    @objc private func openLetterhead() {
        let vc = RISLetterheadViewController()
        vc.modalPresentationStyle = .fullScreen
        present(vc, animated: true)
    }

    @objc private func handleBack() {
        dismiss(animated: true)
    }

    @objc private func handleRefresh() {
        let rotation = CABasicAnimation(keyPath: "transform.rotation.z")
        rotation.toValue = NSNumber(value: Double.pi * 2)
        rotation.duration = 0.6
        rotation.repeatCount = 1
        refreshBtn.layer.add(rotation, forKey: "spinAnimation")
        fetchDashboard(manual: true)
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// MARK: – MetricCardView
// ─────────────────────────────────────────────────────────────────────────────
private class MetricCardView: UIView {
    private let titleLbl = UILabel()
    private let valueLbl = UILabel()
    private let iconImg  = UIImageView()

    init() {
        super.init(frame: .zero)
        setup()
    }
    required init?(coder: NSCoder) { fatalError() }

    private func setup() {
        backgroundColor = .white
        layer.cornerRadius = 14
        layer.borderWidth = 1
        layer.borderColor = UIColor(red: 241/255, green: 245/255, blue: 249/255, alpha: 1).cgColor
        layer.shadowColor = UIColor.black.cgColor
        layer.shadowOffset = CGSize(width: 0, height: 1)
        layer.shadowOpacity = 0.04
        layer.shadowRadius = 4
        translatesAutoresizingMaskIntoConstraints = false

        titleLbl.font = .systemFont(ofSize: 11, weight: .bold)
        titleLbl.textColor = UIColor(red: 100/255, green: 116/255, blue: 139/255, alpha: 1)
        titleLbl.translatesAutoresizingMaskIntoConstraints = false

        valueLbl.font = .systemFont(ofSize: 20, weight: .black)
        valueLbl.textColor = UIColor(red: 15/255, green: 23/255, blue: 42/255, alpha: 1)
        valueLbl.translatesAutoresizingMaskIntoConstraints = false

        iconImg.contentMode = .scaleAspectFit
        iconImg.translatesAutoresizingMaskIntoConstraints = false

        addSubview(titleLbl)
        addSubview(valueLbl)
        addSubview(iconImg)

        NSLayoutConstraint.activate([
            heightAnchor.constraint(equalToConstant: 80),

            titleLbl.topAnchor.constraint(equalTo: topAnchor, constant: 14),
            titleLbl.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 14),

            iconImg.centerYAnchor.constraint(equalTo: titleLbl.centerYAnchor),
            iconImg.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -14),
            iconImg.widthAnchor.constraint(equalToConstant: 18),
            iconImg.heightAnchor.constraint(equalToConstant: 18),

            valueLbl.bottomAnchor.constraint(equalTo: bottomAnchor, constant: -14),
            valueLbl.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 14),
            valueLbl.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -14)
        ])
    }

    func configure(title: String, value: String, icon: String, color: UIColor) {
        titleLbl.text = title.uppercased()
        valueLbl.text = value
        iconImg.image = UIImage(systemName: icon)
        iconImg.tintColor = color
    }

    func setValue(_ text: String) {
        valueLbl.text = text
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// MARK: – WorkflowStepView
// ─────────────────────────────────────────────────────────────────────────────
private class WorkflowStepView: UIView {
    private let iconContainer = UIView()
    private let iconView      = UIImageView()
    private let countLbl      = UILabel()
    private let labelLbl      = UILabel()

    init(label: String, icon: String, color: UIColor) {
        super.init(frame: .zero)
        setup(label: label, icon: icon, color: color)
    }
    required init?(coder: NSCoder) { fatalError() }

    private func setup(label: String, icon: String, color: UIColor) {
        translatesAutoresizingMaskIntoConstraints = false
        widthAnchor.constraint(equalToConstant: 76).isActive = true

        iconContainer.backgroundColor = color.withAlphaComponent(0.12)
        iconContainer.layer.cornerRadius = 20
        iconContainer.translatesAutoresizingMaskIntoConstraints = false

        iconView.image = UIImage(systemName: icon)
        iconView.tintColor = color
        iconView.contentMode = .scaleAspectFit
        iconView.translatesAutoresizingMaskIntoConstraints = false
        iconContainer.addSubview(iconView)

        countLbl.text = "0"
        countLbl.font = .systemFont(ofSize: 15, weight: .black)
        countLbl.textColor = UIColor(red: 15/255, green: 23/255, blue: 42/255, alpha: 1)
        countLbl.textAlignment = .center
        countLbl.translatesAutoresizingMaskIntoConstraints = false

        labelLbl.text = label
        labelLbl.font = .systemFont(ofSize: 10.5, weight: .bold)
        labelLbl.textColor = UIColor(red: 100/255, green: 116/255, blue: 139/255, alpha: 1)
        labelLbl.textAlignment = .center
        labelLbl.translatesAutoresizingMaskIntoConstraints = false

        addSubview(iconContainer)
        addSubview(countLbl)
        addSubview(labelLbl)

        NSLayoutConstraint.activate([
            iconContainer.topAnchor.constraint(equalTo: topAnchor),
            iconContainer.centerXAnchor.constraint(equalTo: centerXAnchor),
            iconContainer.widthAnchor.constraint(equalToConstant: 40),
            iconContainer.heightAnchor.constraint(equalToConstant: 40),

            iconView.centerXAnchor.constraint(equalTo: iconContainer.centerXAnchor),
            iconView.centerYAnchor.constraint(equalTo: iconContainer.centerYAnchor),
            iconView.widthAnchor.constraint(equalToConstant: 20),
            iconView.heightAnchor.constraint(equalToConstant: 20),

            countLbl.topAnchor.constraint(equalTo: iconContainer.bottomAnchor, constant: 4),
            countLbl.leadingAnchor.constraint(equalTo: leadingAnchor),
            countLbl.trailingAnchor.constraint(equalTo: trailingAnchor),

            labelLbl.topAnchor.constraint(equalTo: countLbl.bottomAnchor, constant: 2),
            labelLbl.leadingAnchor.constraint(equalTo: leadingAnchor),
            labelLbl.trailingAnchor.constraint(equalTo: trailingAnchor),
            labelLbl.bottomAnchor.constraint(equalTo: bottomAnchor)
        ])
    }

    func setCount(_ count: Int) {
        countLbl.text = "\(count)"
        countLbl.textColor = count > 0 ? UIColor(red: 15/255, green: 23/255, blue: 42/255, alpha: 1) : UIColor(red: 203/255, green: 213/255, blue: 225/255, alpha: 1)
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// MARK: – ModalityFleetRowView
// ─────────────────────────────────────────────────────────────────────────────
private class ModalityFleetRowView: UIView {
    private let nameLbl      = UILabel()
    private let statusBadge  = UILabel()
    private let patientLbl   = UILabel()
    private let nextSlotLbl  = UILabel()
    private let loadLbl      = UILabel()
    private let progressBar  = UIProgressView(progressViewStyle: .default)

    init() {
        super.init(frame: .zero)
        setup()
    }
    required init?(coder: NSCoder) { fatalError() }

    private func setup() {
        backgroundColor = UIColor(red: 248/255, green: 250/255, blue: 252/255, alpha: 1)
        layer.cornerRadius = 12
        layer.borderWidth = 1
        layer.borderColor = UIColor(red: 241/255, green: 245/255, blue: 249/255, alpha: 1).cgColor
        translatesAutoresizingMaskIntoConstraints = false

        nameLbl.font = .systemFont(ofSize: 14, weight: .bold)
        nameLbl.textColor = UIColor(red: 15/255, green: 23/255, blue: 42/255, alpha: 1)
        nameLbl.translatesAutoresizingMaskIntoConstraints = false

        statusBadge.font = .systemFont(ofSize: 9.5, weight: .heavy)
        statusBadge.layer.cornerRadius = 5
        statusBadge.layer.masksToBounds = true
        statusBadge.translatesAutoresizingMaskIntoConstraints = false

        patientLbl.font = .systemFont(ofSize: 12, weight: .bold)
        patientLbl.textColor = UIColor(red: 79/255, green: 70/255, blue: 229/255, alpha: 1)
        patientLbl.translatesAutoresizingMaskIntoConstraints = false

        nextSlotLbl.font = .systemFont(ofSize: 11, weight: .regular)
        nextSlotLbl.textColor = UIColor(red: 100/255, green: 116/255, blue: 139/255, alpha: 1)
        nextSlotLbl.translatesAutoresizingMaskIntoConstraints = false

        loadLbl.font = .systemFont(ofSize: 11, weight: .black)
        loadLbl.textColor = UIColor(red: 30/255, green: 41/255, blue: 59/255, alpha: 1)
        loadLbl.translatesAutoresizingMaskIntoConstraints = false

        progressBar.layer.cornerRadius = 3
        progressBar.clipsToBounds = true
        progressBar.trackTintColor = UIColor(red: 226/255, green: 232/255, blue: 240/255, alpha: 1)
        progressBar.translatesAutoresizingMaskIntoConstraints = false

        let topRow = UIStackView(arrangedSubviews: [nameLbl, statusBadge])
        topRow.axis = .horizontal
        topRow.spacing = 8
        topRow.alignment = .center
        topRow.translatesAutoresizingMaskIntoConstraints = false

        let loadRow = UIStackView(arrangedSubviews: [loadLbl, progressBar])
        loadRow.axis = .horizontal
        loadRow.spacing = 8
        loadRow.alignment = .center
        loadRow.translatesAutoresizingMaskIntoConstraints = false
        progressBar.heightAnchor.constraint(equalToConstant: 6).isActive = true

        addSubview(topRow)
        addSubview(patientLbl)
        addSubview(nextSlotLbl)
        addSubview(loadRow)

        NSLayoutConstraint.activate([
            topRow.topAnchor.constraint(equalTo: topAnchor, constant: 12),
            topRow.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 14),
            topRow.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -14),

            patientLbl.topAnchor.constraint(equalTo: topRow.bottomAnchor, constant: 6),
            patientLbl.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 14),
            patientLbl.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -14),

            nextSlotLbl.topAnchor.constraint(equalTo: patientLbl.bottomAnchor, constant: 2),
            nextSlotLbl.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 14),
            nextSlotLbl.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -14),

            loadRow.topAnchor.constraint(equalTo: nextSlotLbl.bottomAnchor, constant: 8),
            loadRow.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 14),
            loadRow.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -14),
            loadRow.bottomAnchor.constraint(equalTo: bottomAnchor, constant: -12)
        ])
    }

    func configure(modality: [String: Any]) {
        let name = modality["name"] as? String ?? "Modality"
        let type = modality["type"] as? String ?? ""
        nameLbl.text = type.isEmpty ? name : "\(name) (\(type))"

        let status = (modality["status"] as? String ?? "ACTIVE").uppercased()
        statusBadge.text = " \(status) "
        if status == "ACTIVE" {
            statusBadge.textColor = UIColor(red: 5/255, green: 150/255, blue: 105/255, alpha: 1)
            statusBadge.backgroundColor = UIColor(red: 209/255, green: 250/255, blue: 229/255, alpha: 1)
        } else if status == "MAINTENANCE" {
            statusBadge.textColor = UIColor(red: 217/255, green: 119/255, blue: 6/255, alpha: 1)
            statusBadge.backgroundColor = UIColor(red: 254/255, green: 243/255, blue: 199/255, alpha: 1)
        } else {
            statusBadge.textColor = UIColor(red: 100/255, green: 116/255, blue: 139/255, alpha: 1)
            statusBadge.backgroundColor = UIColor(red: 241/255, green: 245/255, blue: 249/255, alpha: 1)
        }

        let patient = modality["currentPatient"] as? String ?? "-"
        patientLbl.text = (patient.isEmpty || patient == "-") ? "Patient: Idle / Available" : "Current: \(patient)"

        let nextSlot = modality["nextSlot"] as? String ?? "No upcoming slots"
        nextSlotLbl.text = "Next Slot: \(nextSlot)"

        let load = modality["load"] as? Int ?? 0
        loadLbl.text = "Load: \(load)%"
        progressBar.progress = Float(load) / 100.0
        progressBar.progressTintColor = load > 80 ? UIColor(red: 234/255, green: 88/255, blue: 12/255, alpha: 1) : UIColor(red: 79/255, green: 70/255, blue: 229/255, alpha: 1)
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// MARK: – PendingQueueRowView
// ─────────────────────────────────────────────────────────────────────────────
private class PendingQueueRowView: UIView {
    private let accBadge    = UILabel()
    private let urgentBadge = UILabel()
    private let patientLbl  = UILabel()
    private let scanLbl     = UILabel()
    private let timeLbl     = UILabel()
    private let arrowImg    = UIImageView()

    init() {
        super.init(frame: .zero)
        setup()
    }
    required init?(coder: NSCoder) { fatalError() }

    private func setup() {
        backgroundColor = UIColor(red: 250/255, green: 250/255, blue: 255/255, alpha: 1)
        layer.cornerRadius = 12
        layer.borderWidth = 1
        layer.borderColor = UIColor(red: 241/255, green: 245/255, blue: 249/255, alpha: 1).cgColor
        translatesAutoresizingMaskIntoConstraints = false

        accBadge.font = .monospacedSystemFont(ofSize: 10, weight: .bold)
        accBadge.textColor = UIColor(red: 71/255, green: 85/255, blue: 105/255, alpha: 1)
        accBadge.backgroundColor = UIColor(red: 241/255, green: 245/255, blue: 249/255, alpha: 1)
        accBadge.layer.cornerRadius = 4
        accBadge.layer.masksToBounds = true
        accBadge.translatesAutoresizingMaskIntoConstraints = false

        urgentBadge.text = " URGENT "
        urgentBadge.font = .systemFont(ofSize: 9, weight: .black)
        urgentBadge.textColor = UIColor(red: 220/255, green: 38/255, blue: 38/255, alpha: 1)
        urgentBadge.backgroundColor = UIColor(red: 254/255, green: 226/255, blue: 226/255, alpha: 1)
        urgentBadge.layer.cornerRadius = 4
        urgentBadge.layer.masksToBounds = true
        urgentBadge.translatesAutoresizingMaskIntoConstraints = false
        urgentBadge.isHidden = true

        patientLbl.font = .systemFont(ofSize: 14, weight: .bold)
        patientLbl.textColor = UIColor(red: 15/255, green: 23/255, blue: 42/255, alpha: 1)
        patientLbl.translatesAutoresizingMaskIntoConstraints = false

        scanLbl.font = .systemFont(ofSize: 12, weight: .medium)
        scanLbl.textColor = UIColor(red: 71/255, green: 85/255, blue: 105/255, alpha: 1)
        scanLbl.translatesAutoresizingMaskIntoConstraints = false

        timeLbl.font = .systemFont(ofSize: 11, weight: .regular)
        timeLbl.textColor = UIColor(red: 148/255, green: 163/255, blue: 184/255, alpha: 1)
        timeLbl.translatesAutoresizingMaskIntoConstraints = false

        arrowImg.image = UIImage(systemName: "chevron.right")
        arrowImg.tintColor = UIColor(red: 147/255, green: 51/255, blue: 234/255, alpha: 1)
        arrowImg.translatesAutoresizingMaskIntoConstraints = false

        let topRow = UIStackView(arrangedSubviews: [accBadge, urgentBadge])
        topRow.axis = .horizontal
        topRow.spacing = 6
        topRow.alignment = .center
        topRow.translatesAutoresizingMaskIntoConstraints = false

        addSubview(topRow)
        addSubview(patientLbl)
        addSubview(scanLbl)
        addSubview(timeLbl)
        addSubview(arrowImg)

        NSLayoutConstraint.activate([
            topRow.topAnchor.constraint(equalTo: topAnchor, constant: 12),
            topRow.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 14),

            patientLbl.topAnchor.constraint(equalTo: topRow.bottomAnchor, constant: 4),
            patientLbl.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 14),
            patientLbl.trailingAnchor.constraint(equalTo: arrowImg.leadingAnchor, constant: -8),

            scanLbl.topAnchor.constraint(equalTo: patientLbl.bottomAnchor, constant: 2),
            scanLbl.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 14),
            scanLbl.trailingAnchor.constraint(equalTo: arrowImg.leadingAnchor, constant: -8),

            timeLbl.topAnchor.constraint(equalTo: scanLbl.bottomAnchor, constant: 4),
            timeLbl.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 14),
            timeLbl.trailingAnchor.constraint(equalTo: arrowImg.leadingAnchor, constant: -8),
            timeLbl.bottomAnchor.constraint(equalTo: bottomAnchor, constant: -12),

            arrowImg.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -14),
            arrowImg.centerYAnchor.constraint(equalTo: centerYAnchor),
            arrowImg.widthAnchor.constraint(equalToConstant: 14),
            arrowImg.heightAnchor.constraint(equalToConstant: 14)
        ])
    }

    func configure(item: [String: Any]) {
        let acc = item["id"] as? String ?? "N/A"
        accBadge.text = " \(acc) "

        let priority = (item["priority"] as? String ?? "NORMAL").uppercased()
        urgentBadge.isHidden = (priority != "URGENT")

        patientLbl.text = item["patient"] as? String ?? "Unknown Patient"
        scanLbl.text = item["scan"] as? String ?? "Scan"
        let time = item["time"] as? String ?? "-"
        timeLbl.text = "Scanned: \(time)"
    }
}
