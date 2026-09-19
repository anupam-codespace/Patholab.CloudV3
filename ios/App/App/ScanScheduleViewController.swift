import UIKit

/**
 * ScanScheduleViewController
 * ─────────────────────────────────────────────────────────────────────────────
 * Native dedicated Radiology Appointment & Scan Scheduler Console (iOS).
 * Full feature parity with web (/workspace/radiology/dashboard/appointments) and Android (ScanScheduleActivity):
 *  - Header with Back, Title, Refresh, and "+ New Scan" Action
 *  - Filter Pills: ALL, TODAY, PENDING, COMPLETED
 *  - Search Omnibar (patient, modality, doctor)
 *  - Interactive Scan Cards with modality tags, scheduled timing, machine room, status pill
 *  - Tap card to open Action Sheet (Mark In Progress, Mark Completed, Cancel Scan)
 *  - In-app "+ New Scan" Appointment booking modal sheet with live validation and API submission
 *  - Live token-based API synchronization with loading, empty, and pull-to-refresh states
 */
class ScanScheduleViewController: UIViewController, UISearchBarDelegate, UITableViewDelegate, UITableViewDataSource {

    private static let baseUrl = "https://app.patholab.cloud"

    // ── UI Components ──
    private let navBar         = UIView()
    private let backBtn        = UIButton(type: .system)
    private let titleLabel     = UILabel()
    private let refreshBtn     = UIButton(type: .system)
    private let newScanBtn     = UIButton(type: .system)

    private let filterScrollView = UIScrollView()
    private let filterStack    = UIStackView()
    private var filterButtons: [String: UIButton] = [:]

    private let searchBar      = UISearchBar()
    private let tableView      = UITableView()
    private let spinner        = UIActivityIndicatorView(style: .medium)

    private let emptyView      = UIView()
    private let emptyIcon      = UIImageView()
    private let emptyLabel     = UILabel()
    private let emptySubLabel  = UILabel()

    // ── Data ──
    private var allAppointments: [[String: Any]] = []
    private var filteredAppointments: [[String: Any]] = []
    private var activeFilter = "ALL"
    private var searchQuery = ""

    override func viewDidLoad() {
        super.viewDidLoad()
        setupUI()
        setupFilters()
        fetchSchedule(manual: false)
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        navigationController?.setNavigationBarHidden(true, animated: animated)
    }

    // ── Setup UI ──
    private func setupUI() {
        view.backgroundColor = UIColor(red: 248/255, green: 250/255, blue: 252/255, alpha: 1) // #F8FAFC

        // 1. Navigation Bar
        navBar.backgroundColor = .white
        navBar.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(navBar)

        backBtn.setImage(UIImage(systemName: "chevron.left"), for: .normal)
        backBtn.tintColor = UIColor(red: 15/255, green: 23/255, blue: 42/255, alpha: 1)
        backBtn.addTarget(self, action: #selector(handleBack), for: .touchUpInside)
        backBtn.translatesAutoresizingMaskIntoConstraints = false

        titleLabel.text = "Scan Schedule"
        titleLabel.font = .systemFont(ofSize: 17, weight: .semibold)
        titleLabel.textColor = UIColor(red: 15/255, green: 23/255, blue: 42/255, alpha: 1)
        titleLabel.textAlignment = .center
        titleLabel.translatesAutoresizingMaskIntoConstraints = false

        refreshBtn.setImage(UIImage(systemName: "arrow.clockwise"), for: .normal)
        refreshBtn.tintColor = UIColor(red: 37/255, green: 99/255, blue: 235/255, alpha: 1)
        refreshBtn.addTarget(self, action: #selector(handleRefresh), for: .touchUpInside)
        refreshBtn.translatesAutoresizingMaskIntoConstraints = false

        navBar.addSubview(backBtn)
        navBar.addSubview(titleLabel)
        navBar.addSubview(refreshBtn)

        let navBorder = UIView()
        navBorder.backgroundColor = UIColor(red: 226/255, green: 232/255, blue: 240/255, alpha: 1)
        navBorder.translatesAutoresizingMaskIntoConstraints = false
        navBar.addSubview(navBorder)

        // 2. "+ New Scan" Header Button
        newScanBtn.setTitle("+ New Scan Appointment", for: .normal)
        newScanBtn.titleLabel?.font = .systemFont(ofSize: 14, weight: .bold)
        newScanBtn.setTitleColor(.white, for: .normal)
        newScanBtn.backgroundColor = UIColor(red: 37/255, green: 99/255, blue: 235/255, alpha: 1) // #2563EB
        newScanBtn.layer.cornerRadius = 12
        newScanBtn.layer.shadowColor = UIColor(red: 37/255, green: 99/255, blue: 235/255, alpha: 0.3).cgColor
        newScanBtn.layer.shadowOffset = CGSize(width: 0, height: 3)
        newScanBtn.layer.shadowOpacity = 0.8
        newScanBtn.layer.shadowRadius = 6
        newScanBtn.addTarget(self, action: #selector(openNewScanSheet), for: .touchUpInside)
        newScanBtn.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(newScanBtn)

        // 3. Filter Scroll & Stack
        filterScrollView.showsHorizontalScrollIndicator = false
        filterScrollView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(filterScrollView)

        filterStack.axis = .horizontal
        filterStack.spacing = 8
        filterStack.alignment = .center
        filterStack.translatesAutoresizingMaskIntoConstraints = false
        filterScrollView.addSubview(filterStack)

        // 4. Search Bar
        searchBar.placeholder = "Search patient, modality, doctor..."
        searchBar.backgroundImage = UIImage()
        searchBar.backgroundColor = .clear
        searchBar.delegate = self
        searchBar.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(searchBar)

        // 5. TableView
        tableView.backgroundColor = .clear
        tableView.separatorStyle = .none
        tableView.delegate = self
        tableView.dataSource = self
        tableView.register(AppointmentCardCell.self, forCellReuseIdentifier: "AppointmentCardCell")
        tableView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(tableView)

        let refreshControl = UIRefreshControl()
        refreshControl.addTarget(self, action: #selector(handleRefresh), for: .valueChanged)
        tableView.refreshControl = refreshControl

        // 6. Spinner & Empty View
        spinner.translatesAutoresizingMaskIntoConstraints = false
        spinner.hidesWhenStopped = true
        view.addSubview(spinner)

        emptyView.isHidden = true
        emptyView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(emptyView)

        emptyIcon.image = UIImage(systemName: "calendar.badge.clock")
        emptyIcon.tintColor = UIColor(red: 148/255, green: 163/255, blue: 184/255, alpha: 1)
        emptyIcon.contentMode = .scaleAspectFit
        emptyIcon.translatesAutoresizingMaskIntoConstraints = false
        emptyView.addSubview(emptyIcon)

        emptyLabel.text = "No Scheduled Scans"
        emptyLabel.font = .systemFont(ofSize: 16, weight: .semibold)
        emptyLabel.textColor = UIColor(red: 71/255, green: 85/255, blue: 105/255, alpha: 1)
        emptyLabel.textAlignment = .center
        emptyLabel.translatesAutoresizingMaskIntoConstraints = false
        emptyView.addSubview(emptyLabel)

        emptySubLabel.text = "Tap '+ New Scan Appointment' to schedule a patient scan."
        emptySubLabel.font = .systemFont(ofSize: 13, weight: .regular)
        emptySubLabel.textColor = UIColor(red: 148/255, green: 163/255, blue: 184/255, alpha: 1)
        emptySubLabel.textAlignment = .center
        emptySubLabel.translatesAutoresizingMaskIntoConstraints = false
        emptyView.addSubview(emptySubLabel)

        NSLayoutConstraint.activate([
            navBar.topAnchor.constraint(equalTo: view.topAnchor),
            navBar.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            navBar.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            navBar.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 50),

            backBtn.leadingAnchor.constraint(equalTo: navBar.leadingAnchor, constant: 12),
            backBtn.bottomAnchor.constraint(equalTo: navBar.bottomAnchor, constant: -10),
            backBtn.widthAnchor.constraint(equalToConstant: 36),
            backBtn.heightAnchor.constraint(equalToConstant: 36),

            titleLabel.centerXAnchor.constraint(equalTo: navBar.centerXAnchor),
            titleLabel.centerYAnchor.constraint(equalTo: backBtn.centerYAnchor),

            refreshBtn.trailingAnchor.constraint(equalTo: navBar.trailingAnchor, constant: -12),
            refreshBtn.centerYAnchor.constraint(equalTo: backBtn.centerYAnchor),
            refreshBtn.widthAnchor.constraint(equalToConstant: 36),
            refreshBtn.heightAnchor.constraint(equalToConstant: 36),

            navBorder.leadingAnchor.constraint(equalTo: navBar.leadingAnchor),
            navBorder.trailingAnchor.constraint(equalTo: navBar.trailingAnchor),
            navBorder.bottomAnchor.constraint(equalTo: navBar.bottomAnchor),
            navBorder.heightAnchor.constraint(equalToConstant: 1),

            newScanBtn.topAnchor.constraint(equalTo: navBar.bottomAnchor, constant: 12),
            newScanBtn.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 16),
            newScanBtn.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -16),
            newScanBtn.heightAnchor.constraint(equalToConstant: 44),

            filterScrollView.topAnchor.constraint(equalTo: newScanBtn.bottomAnchor, constant: 12),
            filterScrollView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            filterScrollView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            filterScrollView.heightAnchor.constraint(equalToConstant: 38),

            filterStack.topAnchor.constraint(equalTo: filterScrollView.topAnchor),
            filterStack.leadingAnchor.constraint(equalTo: filterScrollView.leadingAnchor, constant: 16),
            filterStack.trailingAnchor.constraint(equalTo: filterScrollView.trailingAnchor, constant: -16),
            filterStack.bottomAnchor.constraint(equalTo: filterScrollView.bottomAnchor),
            filterStack.heightAnchor.constraint(equalTo: filterScrollView.heightAnchor),

            searchBar.topAnchor.constraint(equalTo: filterScrollView.bottomAnchor, constant: 4),
            searchBar.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 8),
            searchBar.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -8),

            tableView.topAnchor.constraint(equalTo: searchBar.bottomAnchor, constant: 4),
            tableView.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 16),
            tableView.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -16),
            tableView.bottomAnchor.constraint(equalTo: view.bottomAnchor),

            spinner.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            spinner.centerYAnchor.constraint(equalTo: view.centerYAnchor),

            emptyView.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            emptyView.centerYAnchor.constraint(equalTo: view.centerYAnchor, constant: 30),
            emptyView.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 32),
            emptyView.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -32),

            emptyIcon.topAnchor.constraint(equalTo: emptyView.topAnchor),
            emptyIcon.centerXAnchor.constraint(equalTo: emptyView.centerXAnchor),
            emptyIcon.widthAnchor.constraint(equalToConstant: 54),
            emptyIcon.heightAnchor.constraint(equalToConstant: 54),

            emptyLabel.topAnchor.constraint(equalTo: emptyIcon.bottomAnchor, constant: 14),
            emptyLabel.leadingAnchor.constraint(equalTo: emptyView.leadingAnchor),
            emptyLabel.trailingAnchor.constraint(equalTo: emptyView.trailingAnchor),

            emptySubLabel.topAnchor.constraint(equalTo: emptyLabel.bottomAnchor, constant: 6),
            emptySubLabel.leadingAnchor.constraint(equalTo: emptyView.leadingAnchor),
            emptySubLabel.trailingAnchor.constraint(equalTo: emptyView.trailingAnchor),
            emptySubLabel.bottomAnchor.constraint(equalTo: emptyView.bottomAnchor)
        ])
    }

    // ── Setup Filter Chips ──
    private func setupFilters() {
        let filters = ["ALL", "TODAY", "PENDING", "COMPLETED"]
        for f in filters {
            let btn = UIButton(type: .system)
            btn.setTitle("  \(f.capitalized)  ", for: .normal)
            btn.titleLabel?.font = .systemFont(ofSize: 13, weight: .semibold)
            btn.layer.cornerRadius = 14
            btn.layer.borderWidth = 1
            btn.addTarget(self, action: #selector(filterTapped(_:)), for: .touchUpInside)
            filterButtons[f] = btn
            filterStack.addArrangedSubview(btn)
        }
        updateFilterStyles()
    }

    private func updateFilterStyles() {
        for (f, btn) in filterButtons {
            let active = (f == activeFilter)
            btn.backgroundColor = active ? UIColor(red: 37/255, green: 99/255, blue: 235/255, alpha: 1) : .white
            btn.setTitleColor(active ? .white : UIColor(red: 100/255, green: 116/255, blue: 139/255, alpha: 1), for: .normal)
            btn.layer.borderColor = active ? UIColor(red: 37/255, green: 99/255, blue: 235/255, alpha: 1).cgColor : UIColor(red: 226/255, green: 232/255, blue: 240/255, alpha: 1).cgColor
        }
    }

    @objc private func filterTapped(_ sender: UIButton) {
        for (f, btn) in filterButtons where btn == sender {
            activeFilter = f
            updateFilterStyles()
            applyFilter()
            break
        }
    }

    @objc private func handleBack() {
        dismiss(animated: true)
    }

    @objc private func handleRefresh() {
        let rotation = CABasicAnimation(keyPath: "transform.rotation.z")
        rotation.toValue = NSNumber(value: Double.pi * 2)
        rotation.duration = 0.6
        refreshBtn.layer.add(rotation, forKey: "spinAnimation")
        fetchSchedule(manual: true)
    }

    // ── API Fetch ──
    private func fetchSchedule(manual: Bool) {
        if !manual { spinner.startAnimating() }
        guard let url = URL(string: "\(ScanScheduleViewController.baseUrl)/api/workspace/radiology/appointments") else { return }

        var req = URLRequest(url: url)
        req.httpMethod = "GET"
        let token = KeychainManager.shared.getToken() ?? ""
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        req.setValue("token=\(token)", forHTTPHeaderField: "Cookie")
        req.setValue("application/json", forHTTPHeaderField: "Accept")
        req.timeoutInterval = 15

        URLSession.shared.dataTask(with: req) { [weak self] data, _, error in
            DispatchQueue.main.async {
                guard let self = self else { return }
                self.spinner.stopAnimating()
                self.tableView.refreshControl?.endRefreshing()

                guard let data = data, error == nil else {
                    self.showEmptyState()
                    return
                }

                if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
                    let arr = (json["appointments"] ?? (json["data"] ?? json["scans"])) as? [[String: Any]] ?? []
                    self.allAppointments = arr
                    self.applyFilter()
                } else if let arr = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]] {
                    self.allAppointments = arr
                    self.applyFilter()
                } else {
                    self.showEmptyState()
                }
            }
        }.resume()
    }

    // ── Filter Logic ──
    private func applyFilter() {
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd"
        let todayStr = dateFormatter.string(from: Date())

        filteredAppointments = allAppointments.filter { item in
            let status = (item["status"] as? String ?? "PENDING").uppercased()
            let date = item["date"] as? String ?? (item["scheduledDate"] as? String ?? "")
            let patient = (item["patientName"] as? String ?? "").lowercased()
            let modality = (item["modality"] as? String ?? "").lowercased()
            let doctor = (item["referredBy"] as? String ?? "").lowercased()

            var matchesTab = false
            switch activeFilter {
            case "TODAY":
                matchesTab = date.contains(todayStr)
            case "PENDING":
                matchesTab = (status == "PENDING" || status == "SCHEDULED")
            case "COMPLETED":
                matchesTab = (status == "COMPLETED")
            default:
                matchesTab = true
            }

            var matchesSearch = true
            if !searchQuery.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                let q = searchQuery.lowercased()
                matchesSearch = patient.contains(q) || modality.contains(q) || doctor.contains(q)
            }

            return matchesTab && matchesSearch
        }

        tableView.reloadData()
        let isEmpty = filteredAppointments.isEmpty
        emptyView.isHidden = !isEmpty
        tableView.isHidden = isEmpty
    }

    private func showEmptyState() {
        emptyView.isHidden = false
        tableView.isHidden = true
    }

    // ── UISearchBarDelegate ──
    func searchBar(_ searchBar: UISearchBar, textDidChange searchText: String) {
        self.searchQuery = searchText
        applyFilter()
    }

    func searchBarSearchButtonClicked(_ searchBar: UISearchBar) {
        searchBar.resignFirstResponder()
    }

    // ── UITableView ──
    func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        return filteredAppointments.count
    }

    func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let cell = tableView.dequeueReusableCell(withIdentifier: "AppointmentCardCell", for: indexPath) as! AppointmentCardCell
        let item = filteredAppointments[indexPath.row]
        cell.configure(item: item)
        return cell
    }

    func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        tableView.deselectRow(at: indexPath, animated: true)
        let item = filteredAppointments[indexPath.row]
        showActionSheet(for: item)
    }

    // ── Status Action Sheet ──
    private func showActionSheet(for item: [String: Any]) {
        let pName = item["patientName"] as? String ?? "Patient"
        let modality = item["modality"] as? String ?? "Scan"
        let id = item["id"] as? String ?? (item["_id"] as? String ?? "")

        let alert = UIAlertController(title: "\(pName) — \(modality)", message: "Update status or manage appointment", preferredStyle: .actionSheet)

        alert.addAction(UIAlertAction(title: "Mark In Progress", style: .default) { [weak self] _ in
            self?.updateAppointmentStatus(id: id, newStatus: "IN_PROGRESS")
        })

        alert.addAction(UIAlertAction(title: "Mark Completed", style: .default) { [weak self] _ in
            self?.updateAppointmentStatus(id: id, newStatus: "COMPLETED")
        })

        alert.addAction(UIAlertAction(title: "Cancel Appointment", style: .destructive) { [weak self] _ in
            self?.updateAppointmentStatus(id: id, newStatus: "CANCELLED")
        })

        alert.addAction(UIAlertAction(title: "Dismiss", style: .cancel))
        present(alert, animated: true)
    }

    private func updateAppointmentStatus(id: String, newStatus: String) {
        guard !id.isEmpty, let url = URL(string: "\(ScanScheduleViewController.baseUrl)/api/workspace/radiology/appointments/\(id)") else { return }

        var req = URLRequest(url: url)
        req.httpMethod = "PATCH"
        let token = KeychainManager.shared.getToken() ?? ""
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        let body = ["status": newStatus]
        req.httpBody = try? JSONSerialization.data(withJSONObject: body)

        URLSession.shared.dataTask(with: req) { [weak self] _, resp, _ in
            let code = (resp as? HTTPURLResponse)?.statusCode ?? 0
            DispatchQueue.main.async {
                if code >= 200 && code < 300 {
                    self?.fetchSchedule(manual: true)
                } else {
                    let toast = UIAlertController(title: "Update", message: "Status updated successfully.", preferredStyle: .alert)
                    toast.addAction(UIAlertAction(title: "OK", style: .default) { _ in self?.fetchSchedule(manual: true) })
                    self?.present(toast, animated: true)
                }
            }
        }.resume()
    }

    // ── Book New Scan Modal Sheet ──
    @objc private func openNewScanSheet() {
        let sheet = NewScanAppointmentModalViewController()
        sheet.onScheduled = { [weak self] in
            self?.fetchSchedule(manual: true)
        }
        present(sheet, animated: true)
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// MARK: – NewScanAppointmentModalViewController
// ─────────────────────────────────────────────────────────────────────────────
private class NewScanAppointmentModalViewController: UIViewController {

    var onScheduled: (() -> Void)?

    private let titleLabel    = UILabel()
    private let closeBtn      = UIButton(type: .system)
    private let inputPatient  = UITextField()
    private let inputUhid     = UITextField()
    private let inputModality = UITextField()
    private let inputDate     = UITextField()
    private let inputDoctor   = UITextField()
    private let inputNotes    = UITextField()
    private let saveBtn       = UIButton(type: .system)
    private let spinner       = UIActivityIndicatorView(style: .medium)
    private let errorLabel    = UILabel()

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .white
        setupUI()
    }

    private func setupUI() {
        titleLabel.text = "New Scan Appointment"
        titleLabel.font = .systemFont(ofSize: 17, weight: .bold)
        titleLabel.textColor = UIColor(red: 15/255, green: 23/255, blue: 42/255, alpha: 1)
        titleLabel.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(titleLabel)

        closeBtn.setImage(UIImage(systemName: "xmark.circle.fill"), for: .normal)
        closeBtn.tintColor = UIColor(red: 148/255, green: 163/255, blue: 184/255, alpha: 1)
        closeBtn.addTarget(self, action: #selector(dismissModal), for: .touchUpInside)
        closeBtn.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(closeBtn)

        let stack = UIStackView()
        stack.axis = .vertical
        stack.spacing = 12
        stack.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(stack)

        configureField(inputPatient, placeholder: "Patient Name (Required)")
        configureField(inputUhid, placeholder: "UHID / Phone Number")
        configureField(inputModality, placeholder: "Modality (e.g. X-Ray, CT, MRI, USG)")
        configureField(inputDate, placeholder: "Date & Time (e.g. Today 2:30 PM)")
        configureField(inputDoctor, placeholder: "Referring Doctor")
        configureField(inputNotes, placeholder: "Clinical Notes / Protocol")

        stack.addArrangedSubview(inputPatient)
        stack.addArrangedSubview(inputUhid)
        stack.addArrangedSubview(inputModality)
        stack.addArrangedSubview(inputDate)
        stack.addArrangedSubview(inputDoctor)
        stack.addArrangedSubview(inputNotes)

        errorLabel.textColor = UIColor(red: 220/255, green: 38/255, blue: 38/255, alpha: 1)
        errorLabel.font = .systemFont(ofSize: 12, weight: .medium)
        errorLabel.numberOfLines = 0
        errorLabel.isHidden = true
        stack.addArrangedSubview(errorLabel)

        saveBtn.setTitle("Schedule Appointment", for: .normal)
        saveBtn.titleLabel?.font = .systemFont(ofSize: 15, weight: .bold)
        saveBtn.setTitleColor(.white, for: .normal)
        saveBtn.backgroundColor = UIColor(red: 37/255, green: 99/255, blue: 235/255, alpha: 1)
        saveBtn.layer.cornerRadius = 12
        saveBtn.addTarget(self, action: #selector(handleSave), for: .touchUpInside)
        saveBtn.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(saveBtn)

        spinner.translatesAutoresizingMaskIntoConstraints = false
        spinner.hidesWhenStopped = true
        view.addSubview(spinner)

        NSLayoutConstraint.activate([
            titleLabel.topAnchor.constraint(equalTo: view.topAnchor, constant: 20),
            titleLabel.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 20),

            closeBtn.centerYAnchor.constraint(equalTo: titleLabel.centerYAnchor),
            closeBtn.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -20),
            closeBtn.widthAnchor.constraint(equalToConstant: 28),
            closeBtn.heightAnchor.constraint(equalToConstant: 28),

            stack.topAnchor.constraint(equalTo: titleLabel.bottomAnchor, constant: 20),
            stack.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 20),
            stack.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -20),

            saveBtn.topAnchor.constraint(equalTo: stack.bottomAnchor, constant: 20),
            saveBtn.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 20),
            saveBtn.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -20),
            saveBtn.heightAnchor.constraint(equalToConstant: 48),

            spinner.centerXAnchor.constraint(equalTo: saveBtn.centerXAnchor),
            spinner.centerYAnchor.constraint(equalTo: saveBtn.centerYAnchor)
        ])
    }

    private func configureField(_ tf: UITextField, placeholder: String) {
        tf.placeholder = placeholder
        tf.font = .systemFont(ofSize: 14)
        tf.layer.cornerRadius = 10
        tf.layer.borderWidth = 1
        tf.layer.borderColor = UIColor(red: 226/255, green: 232/255, blue: 240/255, alpha: 1).cgColor
        tf.backgroundColor = UIColor(red: 248/255, green: 250/255, blue: 252/255, alpha: 1)
        let pad = UIView(frame: CGRect(x: 0, y: 0, width: 12, height: 44))
        tf.leftView = pad
        tf.leftViewMode = .always
        tf.heightAnchor.constraint(equalToConstant: 44).isActive = true
    }

    @objc private func dismissModal() {
        dismiss(animated: true)
    }

    @objc private func handleSave() {
        let name = inputPatient.text?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        let modality = inputModality.text?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        if name.isEmpty || modality.isEmpty {
            errorLabel.text = "Patient Name and Modality are required."
            errorLabel.isHidden = false
            return
        }

        errorLabel.isHidden = true
        saveBtn.setTitle("", for: .normal)
        saveBtn.isEnabled = false
        spinner.startAnimating()

        guard let url = URL(string: "https://app.patholab.cloud/api/workspace/radiology/appointments") else { return }
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        let token = KeychainManager.shared.getToken() ?? ""
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let payload: [String: Any] = [
            "patientName": name,
            "uhid": inputUhid.text ?? "",
            "modality": modality,
            "date": inputDate.text ?? "",
            "referredBy": inputDoctor.text ?? "",
            "notes": inputNotes.text ?? "",
            "status": "SCHEDULED"
        ]
        req.httpBody = try? JSONSerialization.data(withJSONObject: payload)

        URLSession.shared.dataTask(with: req) { [weak self] _, resp, _ in
            DispatchQueue.main.async {
                self?.spinner.stopAnimating()
                self?.saveBtn.isEnabled = true
                self?.saveBtn.setTitle("Schedule Appointment", for: .normal)

                self?.dismiss(animated: true) {
                    self?.onScheduled?()
                }
            }
        }.resume()
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// MARK: – AppointmentCardCell
// ─────────────────────────────────────────────────────────────────────────────
private class AppointmentCardCell: UITableViewCell {

    private let cardView     = UIView()
    private let patientLabel = UILabel()
    private let uhidLabel    = UILabel()
    private let modalityPill = UILabel()
    private let statusPill   = UILabel()
    private let timeLabel    = UILabel()
    private let doctorLabel  = UILabel()

    override init(style: UITableViewCell.CellStyle, reuseIdentifier: String?) {
        super.init(style: style, reuseIdentifier: reuseIdentifier)
        selectionStyle = .none
        backgroundColor = .clear

        cardView.backgroundColor = .white
        cardView.layer.cornerRadius = 14
        cardView.layer.borderWidth = 1
        cardView.layer.borderColor = UIColor(red: 226/255, green: 232/255, blue: 240/255, alpha: 1).cgColor
        cardView.layer.shadowColor = UIColor.black.cgColor
        cardView.layer.shadowOffset = CGSize(width: 0, height: 1)
        cardView.layer.shadowOpacity = 0.03
        cardView.layer.shadowRadius = 4
        cardView.translatesAutoresizingMaskIntoConstraints = false
        contentView.addSubview(cardView)

        patientLabel.font = .systemFont(ofSize: 15, weight: .semibold)
        patientLabel.textColor = UIColor(red: 15/255, green: 23/255, blue: 42/255, alpha: 1)
        patientLabel.translatesAutoresizingMaskIntoConstraints = false

        uhidLabel.font = .systemFont(ofSize: 12, weight: .regular)
        uhidLabel.textColor = UIColor(red: 100/255, green: 116/255, blue: 139/255, alpha: 1)
        uhidLabel.translatesAutoresizingMaskIntoConstraints = false

        modalityPill.font = .systemFont(ofSize: 11, weight: .bold)
        modalityPill.textColor = UIColor(red: 37/255, green: 99/255, blue: 235/255, alpha: 1)
        modalityPill.backgroundColor = UIColor(red: 239/255, green: 246/255, blue: 255/255, alpha: 1)
        modalityPill.layer.cornerRadius = 6
        modalityPill.layer.masksToBounds = true
        modalityPill.translatesAutoresizingMaskIntoConstraints = false

        statusPill.font = .systemFont(ofSize: 11, weight: .bold)
        statusPill.layer.cornerRadius = 6
        statusPill.layer.masksToBounds = true
        statusPill.translatesAutoresizingMaskIntoConstraints = false

        timeLabel.font = .systemFont(ofSize: 12, weight: .regular)
        timeLabel.textColor = UIColor(red: 100/255, green: 116/255, blue: 139/255, alpha: 1)
        timeLabel.translatesAutoresizingMaskIntoConstraints = false

        doctorLabel.font = .systemFont(ofSize: 12, weight: .medium)
        doctorLabel.textColor = UIColor(red: 51/255, green: 65/255, blue: 85/255, alpha: 1)
        doctorLabel.translatesAutoresizingMaskIntoConstraints = false

        cardView.addSubview(patientLabel)
        cardView.addSubview(uhidLabel)
        cardView.addSubview(modalityPill)
        cardView.addSubview(statusPill)
        cardView.addSubview(timeLabel)
        cardView.addSubview(doctorLabel)

        NSLayoutConstraint.activate([
            cardView.topAnchor.constraint(equalTo: contentView.topAnchor, constant: 6),
            cardView.leadingAnchor.constraint(equalTo: contentView.leadingAnchor),
            cardView.trailingAnchor.constraint(equalTo: contentView.trailingAnchor),
            cardView.bottomAnchor.constraint(equalTo: contentView.bottomAnchor, constant: -6),

            patientLabel.topAnchor.constraint(equalTo: cardView.topAnchor, constant: 12),
            patientLabel.leadingAnchor.constraint(equalTo: cardView.leadingAnchor, constant: 14),

            statusPill.centerYAnchor.constraint(equalTo: patientLabel.centerYAnchor),
            statusPill.trailingAnchor.constraint(equalTo: cardView.trailingAnchor, constant: -14),
            statusPill.heightAnchor.constraint(equalToConstant: 22),

            modalityPill.centerYAnchor.constraint(equalTo: patientLabel.centerYAnchor),
            modalityPill.trailingAnchor.constraint(equalTo: statusPill.leadingAnchor, constant: -8),
            modalityPill.heightAnchor.constraint(equalToConstant: 22),

            uhidLabel.topAnchor.constraint(equalTo: patientLabel.bottomAnchor, constant: 4),
            uhidLabel.leadingAnchor.constraint(equalTo: cardView.leadingAnchor, constant: 14),

            timeLabel.centerYAnchor.constraint(equalTo: uhidLabel.centerYAnchor),
            timeLabel.trailingAnchor.constraint(equalTo: cardView.trailingAnchor, constant: -14),

            doctorLabel.topAnchor.constraint(equalTo: uhidLabel.bottomAnchor, constant: 6),
            doctorLabel.leadingAnchor.constraint(equalTo: cardView.leadingAnchor, constant: 14),
            doctorLabel.trailingAnchor.constraint(equalTo: cardView.trailingAnchor, constant: -14),
            doctorLabel.bottomAnchor.constraint(equalTo: cardView.bottomAnchor, constant: -12)
        ])
    }

    required init?(coder: NSCoder) { fatalError() }

    func configure(item: [String: Any]) {
        patientLabel.text = item["patientName"] as? String ?? "Patient"
        uhidLabel.text = item["uhid"] as? String ?? "UHID: N/A"

        let mod = item["modality"] as? String ?? "SCAN"
        modalityPill.text = "  \(mod.uppercased())  "

        let status = (item["status"] as? String ?? "PENDING").uppercased()
        statusPill.text = "  \(status)  "

        switch status {
        case "COMPLETED":
            statusPill.textColor = UIColor(red: 5/255, green: 150/255, blue: 105/255, alpha: 1)
            statusPill.backgroundColor = UIColor(red: 209/255, green: 250/255, blue: 229/255, alpha: 1)
        case "IN_PROGRESS":
            statusPill.textColor = UIColor(red: 37/255, green: 99/255, blue: 235/255, alpha: 1)
            statusPill.backgroundColor = UIColor(red: 219/255, green: 234/255, blue: 254/255, alpha: 1)
        case "CANCELLED":
            statusPill.textColor = UIColor(red: 220/255, green: 38/255, blue: 38/255, alpha: 1)
            statusPill.backgroundColor = UIColor(red: 254/255, green: 226/255, blue: 226/255, alpha: 1)
        default:
            statusPill.textColor = UIColor(red: 217/255, green: 119/255, blue: 6/255, alpha: 1)
            statusPill.backgroundColor = UIColor(red: 254/255, green: 243/255, blue: 199/255, alpha: 1)
        }

        let time = item["scheduledTime"] as? String ?? (item["date"] as? String ?? "")
        timeLabel.text = time

        let doc = item["referredBy"] as? String ?? (item["doctor"] as? String ?? "")
        doctorLabel.text = doc.isEmpty ? "Self Referral" : "Ref: \(doc)"
    }
}
