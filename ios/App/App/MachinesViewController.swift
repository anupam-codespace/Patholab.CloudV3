import UIKit

/**
 * MachinesViewController
 * ─────────────────────────────────────────────────────────────────────────────
 * Native dedicated Radiology Equipment & Modality Machine Manager (iOS).
 * Full feature parity with web (/workspace/radiology/machines) and Android (MachinesActivity):
 *  - Header with Back, Title, Refresh, and "+ Add Machine" CTA
 *  - Search Omnibar (filters by name, modality, AE title, manufacturer)
 *  - Machine Cards with modality pill, AE Title, IP:Port network config, manufacturer/model info
 *  - Status badge (Online / Active / Standby)
 *  - Quick Edit and Delete actions on cards
 *  - In-app Add & Edit Machine modal sheet with field validation and network sync
 *  - Live token authentication, loading indicators, empty view, and pull-to-refresh
 */
class MachinesViewController: UIViewController, UISearchBarDelegate, UITableViewDelegate, UITableViewDataSource {

    private static let baseUrl = "https://app.patholab.cloud"

    // ── UI Components ──
    private let navBar        = UIView()
    private let backBtn       = UIButton(type: .system)
    private let titleLabel    = UILabel()
    private let refreshBtn    = UIButton(type: .system)
    private let addBtn        = UIButton(type: .system)

    private let searchBar     = UISearchBar()
    private let tableView     = UITableView()
    private let spinner       = UIActivityIndicatorView(style: .medium)

    private let emptyView     = UIView()
    private let emptyIcon     = UIImageView()
    private let emptyLabel    = UILabel()
    private let emptySubLabel = UILabel()

    // ── Data ──
    private var allMachines: [[String: Any]] = []
    private var filteredMachines: [[String: Any]] = []
    private var searchQuery = ""

    override func viewDidLoad() {
        super.viewDidLoad()
        setupUI()
        fetchMachines(manual: false)
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        navigationController?.setNavigationBarHidden(true, animated: animated)
    }

    // ── Setup UI ──
    private func setupUI() {
        view.backgroundColor = UIColor(red: 248/255, green: 250/255, blue: 252/255, alpha: 1) // #F8FAFC

        // 1. Navbar
        navBar.backgroundColor = .white
        navBar.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(navBar)

        backBtn.setImage(UIImage(systemName: "chevron.left"), for: .normal)
        backBtn.tintColor = UIColor(red: 15/255, green: 23/255, blue: 42/255, alpha: 1)
        backBtn.addTarget(self, action: #selector(handleBack), for: .touchUpInside)
        backBtn.translatesAutoresizingMaskIntoConstraints = false

        titleLabel.text = "Radiology Machines"
        titleLabel.font = .systemFont(ofSize: 17, weight: .semibold)
        titleLabel.textColor = UIColor(red: 15/255, green: 23/255, blue: 42/255, alpha: 1)
        titleLabel.textAlignment = .center
        titleLabel.translatesAutoresizingMaskIntoConstraints = false

        refreshBtn.setImage(UIImage(systemName: "arrow.clockwise"), for: .normal)
        refreshBtn.tintColor = UIColor(red: 71/255, green: 85/255, blue: 105/255, alpha: 1)
        refreshBtn.addTarget(self, action: #selector(handleRefresh), for: .touchUpInside)
        refreshBtn.translatesAutoresizingMaskIntoConstraints = false

        navBar.addSubview(backBtn)
        navBar.addSubview(titleLabel)
        navBar.addSubview(refreshBtn)

        let navBorder = UIView()
        navBorder.backgroundColor = UIColor(red: 226/255, green: 232/255, blue: 240/255, alpha: 1)
        navBorder.translatesAutoresizingMaskIntoConstraints = false
        navBar.addSubview(navBorder)

        // 2. Add Machine Button
        addBtn.setTitle("+ Add New Equipment", for: .normal)
        addBtn.titleLabel?.font = .systemFont(ofSize: 14, weight: .bold)
        addBtn.setTitleColor(.white, for: .normal)
        addBtn.backgroundColor = UIColor(red: 15/255, green: 23/255, blue: 42/255, alpha: 1) // slate-900
        addBtn.layer.cornerRadius = 12
        addBtn.layer.shadowColor = UIColor.black.cgColor
        addBtn.layer.shadowOffset = CGSize(width: 0, height: 2)
        addBtn.layer.shadowOpacity = 0.12
        addBtn.layer.shadowRadius = 4
        addBtn.addTarget(self, action: #selector(openAddMachineSheet), for: .touchUpInside)
        addBtn.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(addBtn)

        // 3. Search Bar
        searchBar.placeholder = "Search equipment, modality, AE title..."
        searchBar.backgroundImage = UIImage()
        searchBar.backgroundColor = .clear
        searchBar.delegate = self
        searchBar.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(searchBar)

        // 4. TableView
        tableView.backgroundColor = .clear
        tableView.separatorStyle = .none
        tableView.delegate = self
        tableView.dataSource = self
        tableView.register(MachineCardCell.self, forCellReuseIdentifier: "MachineCardCell")
        tableView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(tableView)

        let refreshControl = UIRefreshControl()
        refreshControl.addTarget(self, action: #selector(handleRefresh), for: .valueChanged)
        tableView.refreshControl = refreshControl

        // 5. Spinner & Empty View
        spinner.translatesAutoresizingMaskIntoConstraints = false
        spinner.hidesWhenStopped = true
        view.addSubview(spinner)

        emptyView.isHidden = true
        emptyView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(emptyView)

        emptyIcon.image = UIImage(systemName: "gearshape.2")
        emptyIcon.tintColor = UIColor(red: 148/255, green: 163/255, blue: 184/255, alpha: 1)
        emptyIcon.contentMode = .scaleAspectFit
        emptyIcon.translatesAutoresizingMaskIntoConstraints = false
        emptyView.addSubview(emptyIcon)

        emptyLabel.text = "No Machines Registered"
        emptyLabel.font = .systemFont(ofSize: 16, weight: .semibold)
        emptyLabel.textColor = UIColor(red: 71/255, green: 85/255, blue: 105/255, alpha: 1)
        emptyLabel.textAlignment = .center
        emptyLabel.translatesAutoresizingMaskIntoConstraints = false
        emptyView.addSubview(emptyLabel)

        emptySubLabel.text = "Connect PACS & DICOM modalities to automate imaging workflows."
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

            addBtn.topAnchor.constraint(equalTo: navBar.bottomAnchor, constant: 12),
            addBtn.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 16),
            addBtn.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -16),
            addBtn.heightAnchor.constraint(equalToConstant: 44),

            searchBar.topAnchor.constraint(equalTo: addBtn.bottomAnchor, constant: 8),
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

    @objc private func handleBack() {
        dismiss(animated: true)
    }

    @objc private func handleRefresh() {
        let rotation = CABasicAnimation(keyPath: "transform.rotation.z")
        rotation.toValue = NSNumber(value: Double.pi * 2)
        rotation.duration = 0.6
        refreshBtn.layer.add(rotation, forKey: "spinAnimation")
        fetchMachines(manual: true)
    }

    // ── API Fetch ──
    private func fetchMachines(manual: Bool) {
        if !manual { spinner.startAnimating() }
        guard let url = URL(string: "\(MachinesViewController.baseUrl)/api/workspace/radiology/machines") else { return }

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
                    let arr = (json["machines"] ?? (json["data"] ?? [])) as? [[String: Any]] ?? []
                    self.allMachines = arr
                    self.applyFilter()
                } else if let arr = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]] {
                    self.allMachines = arr
                    self.applyFilter()
                } else {
                    self.showEmptyState()
                }
            }
        }.resume()
    }

    // ── Filter Logic ──
    private func applyFilter() {
        if searchQuery.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            filteredMachines = allMachines
        } else {
            let q = searchQuery.lowercased()
            filteredMachines = allMachines.filter { item in
                let name = (item["name"] as? String ?? "").lowercased()
                let mod = (item["modality"] as? String ?? "").lowercased()
                let ae = (item["aeTitle"] as? String ?? "").lowercased()
                let mfr = (item["manufacturer"] as? String ?? "").lowercased()
                return name.contains(q) || mod.contains(q) || ae.contains(q) || mfr.contains(q)
            }
        }

        tableView.reloadData()
        let isEmpty = filteredMachines.isEmpty
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
        return filteredMachines.count
    }

    func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let cell = tableView.dequeueReusableCell(withIdentifier: "MachineCardCell", for: indexPath) as! MachineCardCell
        let item = filteredMachines[indexPath.row]
        cell.configure(item: item,
                       onEdit: { [weak self] in self?.openEditMachineSheet(item: item) },
                       onDelete: { [weak self] in self?.confirmDelete(item: item) })
        return cell
    }

    func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        tableView.deselectRow(at: indexPath, animated: true)
        let item = filteredMachines[indexPath.row]
        openEditMachineSheet(item: item)
    }

    // ── Modal Sheet Openers ──
    @objc private func openAddMachineSheet() {
        let sheet = MachineFormModalViewController(existing: nil)
        sheet.onSaved = { [weak self] in self?.fetchMachines(manual: true) }
        present(sheet, animated: true)
    }

    private func openEditMachineSheet(item: [String: Any]) {
        let sheet = MachineFormModalViewController(existing: item)
        sheet.onSaved = { [weak self] in self?.fetchMachines(manual: true) }
        present(sheet, animated: true)
    }

    private func confirmDelete(item: [String: Any]) {
        let name = item["name"] as? String ?? "Equipment"
        let id = item["id"] as? String ?? (item["_id"] as? String ?? "")
        let alert = UIAlertController(title: "Delete \(name)?", message: "Are you sure you want to remove this machine? Modality routing will be unassigned.", preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel))
        alert.addAction(UIAlertAction(title: "Delete", style: .destructive) { [weak self] _ in
            self?.executeDelete(id: id)
        })
        present(alert, animated: true)
    }

    private func executeDelete(id: String) {
        guard !id.isEmpty, let url = URL(string: "\(MachinesViewController.baseUrl)/api/workspace/radiology/machines/\(id)") else { return }
        var req = URLRequest(url: url)
        req.httpMethod = "DELETE"
        let token = KeychainManager.shared.getToken() ?? ""
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

        URLSession.shared.dataTask(with: req) { [weak self] _, _, _ in
            DispatchQueue.main.async { self?.fetchMachines(manual: true) }
        }.resume()
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// MARK: – MachineFormModalViewController
// ─────────────────────────────────────────────────────────────────────────────
private class MachineFormModalViewController: UIViewController {

    var onSaved: (() -> Void)?
    private let existing: [String: Any]?

    private let titleLabel        = UILabel()
    private let closeBtn          = UIButton(type: .system)
    private let inputName         = UITextField()
    private let inputModality     = UITextField()
    private let inputAeTitle      = UITextField()
    private let inputIp           = UITextField()
    private let inputPort         = UITextField()
    private let inputManufacturer = UITextField()
    private let inputModel        = UITextField()
    private let saveBtn           = UIButton(type: .system)
    private let spinner           = UIActivityIndicatorView(style: .medium)
    private let errorLabel        = UILabel()

    init(existing: [String: Any]?) {
        self.existing = existing
        super.init(nibName: nil, bundle: nil)
    }
    required init?(coder: NSCoder) { fatalError() }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .white
        setupUI()
        populateIfEdit()
    }

    private func setupUI() {
        let isEdit = existing != nil
        titleLabel.text = isEdit ? "Edit Machine" : "Add Radiology Equipment"
        titleLabel.font = .systemFont(ofSize: 17, weight: .bold)
        titleLabel.textColor = UIColor(red: 15/255, green: 23/255, blue: 42/255, alpha: 1)
        titleLabel.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(titleLabel)

        closeBtn.setImage(UIImage(systemName: "xmark.circle.fill"), for: .normal)
        closeBtn.tintColor = UIColor(red: 148/255, green: 163/255, blue: 184/255, alpha: 1)
        closeBtn.addTarget(self, action: #selector(dismissModal), for: .touchUpInside)
        closeBtn.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(closeBtn)

        let scroll = UIScrollView()
        scroll.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(scroll)

        let stack = UIStackView()
        stack.axis = .vertical
        stack.spacing = 12
        stack.translatesAutoresizingMaskIntoConstraints = false
        scroll.addSubview(stack)

        configureField(inputName, placeholder: "Machine Name (Required)")
        configureField(inputModality, placeholder: "Modality (Required - e.g. CT, MRI, X-RAY, USG)")
        configureField(inputAeTitle, placeholder: "AE Title (e.g. SOMATOM_CT)")
        configureField(inputIp, placeholder: "IP Address (e.g. 192.168.1.100)")
        configureField(inputPort, placeholder: "Port (Default: 104)")
        inputPort.text = "104"
        configureField(inputManufacturer, placeholder: "Manufacturer (e.g. Siemens, GE, Philips)")
        configureField(inputModel, placeholder: "Model (e.g. Somatom go.Now)")

        stack.addArrangedSubview(inputName)
        stack.addArrangedSubview(inputModality)
        stack.addArrangedSubview(inputAeTitle)
        stack.addArrangedSubview(inputIp)
        stack.addArrangedSubview(inputPort)
        stack.addArrangedSubview(inputManufacturer)
        stack.addArrangedSubview(inputModel)

        errorLabel.textColor = UIColor(red: 220/255, green: 38/255, blue: 38/255, alpha: 1)
        errorLabel.font = .systemFont(ofSize: 12, weight: .medium)
        errorLabel.numberOfLines = 0
        errorLabel.isHidden = true
        stack.addArrangedSubview(errorLabel)

        saveBtn.setTitle(isEdit ? "Update Equipment" : "Save Equipment", for: .normal)
        saveBtn.titleLabel?.font = .systemFont(ofSize: 15, weight: .bold)
        saveBtn.setTitleColor(.white, for: .normal)
        saveBtn.backgroundColor = UIColor(red: 15/255, green: 23/255, blue: 42/255, alpha: 1)
        saveBtn.layer.cornerRadius = 12
        saveBtn.addTarget(self, action: #selector(handleSave), for: .touchUpInside)
        stack.addArrangedSubview(saveBtn)
        saveBtn.heightAnchor.constraint(equalToConstant: 48).isActive = true

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

            scroll.topAnchor.constraint(equalTo: titleLabel.bottomAnchor, constant: 16),
            scroll.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            scroll.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            scroll.bottomAnchor.constraint(equalTo: view.bottomAnchor),

            stack.topAnchor.constraint(equalTo: scroll.topAnchor),
            stack.leadingAnchor.constraint(equalTo: scroll.leadingAnchor, constant: 20),
            stack.trailingAnchor.constraint(equalTo: scroll.trailingAnchor, constant: -20),
            stack.bottomAnchor.constraint(equalTo: scroll.bottomAnchor, constant: -30),
            stack.widthAnchor.constraint(equalTo: scroll.widthAnchor, constant: -40),

            spinner.centerXAnchor.constraint(equalTo: saveBtn.centerXAnchor),
            spinner.centerYAnchor.constraint(equalTo: saveBtn.centerYAnchor)
        ])
    }

    private func populateIfEdit() {
        guard let ex = existing else { return }
        inputName.text = ex["name"] as? String
        inputModality.text = ex["modality"] as? String
        inputAeTitle.text = ex["aeTitle"] as? String
        inputIp.text = ex["ipAddress"] as? String
        if let port = ex["port"] { inputPort.text = "\(port)" }
        inputManufacturer.text = ex["manufacturer"] as? String
        inputModel.text = ex["model"] as? String
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
        let name = inputName.text?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        let modality = inputModality.text?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        if name.isEmpty || modality.isEmpty {
            errorLabel.text = "Equipment Name and Modality are required."
            errorLabel.isHidden = false
            return
        }

        errorLabel.isHidden = true
        saveBtn.setTitle("", for: .normal)
        saveBtn.isEnabled = false
        spinner.startAnimating()

        let isEdit = existing != nil
        let machineId = existing?["id"] as? String ?? (existing?["_id"] as? String ?? "")
        let endpoint = isEdit ? "https://app.patholab.cloud/api/workspace/radiology/machines/\(machineId)" : "https://app.patholab.cloud/api/workspace/radiology/machines"

        guard let url = URL(string: endpoint) else { return }
        var req = URLRequest(url: url)
        req.httpMethod = isEdit ? "PUT" : "POST"
        let token = KeychainManager.shared.getToken() ?? ""
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let payload: [String: Any] = [
            "name": name,
            "modality": modality,
            "aeTitle": inputAeTitle.text ?? "",
            "ipAddress": inputIp.text ?? "",
            "port": Int(inputPort.text ?? "104") ?? 104,
            "manufacturer": inputManufacturer.text ?? "",
            "model": inputModel.text ?? "",
            "status": "ACTIVE"
        ]
        req.httpBody = try? JSONSerialization.data(withJSONObject: payload)

        URLSession.shared.dataTask(with: req) { [weak self] _, resp, _ in
            DispatchQueue.main.async {
                self?.spinner.stopAnimating()
                self?.saveBtn.isEnabled = true
                self?.saveBtn.setTitle(isEdit ? "Update Equipment" : "Save Equipment", for: .normal)

                self?.dismiss(animated: true) {
                    self?.onSaved?()
                }
            }
        }.resume()
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// MARK: – MachineCardCell
// ─────────────────────────────────────────────────────────────────────────────
private class MachineCardCell: UITableViewCell {

    private let cardView     = UIView()
    private let nameLabel    = UILabel()
    private let modalityPill = UILabel()
    private let statusPill   = UILabel()
    private let aeLabel      = UILabel()
    private let networkLabel = UILabel()
    private let mfrLabel     = UILabel()

    private let editBtn      = UIButton(type: .system)
    private let deleteBtn    = UIButton(type: .system)

    private var onEdit: (() -> Void)?
    private var onDelete: (() -> Void)?

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

        nameLabel.font = .systemFont(ofSize: 15, weight: .bold)
        nameLabel.textColor = UIColor(red: 15/255, green: 23/255, blue: 42/255, alpha: 1)
        nameLabel.translatesAutoresizingMaskIntoConstraints = false

        modalityPill.font = .systemFont(ofSize: 11, weight: .bold)
        modalityPill.textColor = UIColor(red: 79/255, green: 70/255, blue: 229/255, alpha: 1)
        modalityPill.backgroundColor = UIColor(red: 238/255, green: 242/255, blue: 255/255, alpha: 1)
        modalityPill.layer.cornerRadius = 6
        modalityPill.layer.masksToBounds = true
        modalityPill.translatesAutoresizingMaskIntoConstraints = false

        statusPill.font = .systemFont(ofSize: 11, weight: .bold)
        statusPill.layer.cornerRadius = 6
        statusPill.layer.masksToBounds = true
        statusPill.translatesAutoresizingMaskIntoConstraints = false

        aeLabel.font = .systemFont(ofSize: 12, weight: .medium)
        aeLabel.textColor = UIColor(red: 51/255, green: 65/255, blue: 85/255, alpha: 1)
        aeLabel.translatesAutoresizingMaskIntoConstraints = false

        networkLabel.font = .systemFont(ofSize: 12, weight: .regular)
        networkLabel.textColor = UIColor(red: 100/255, green: 116/255, blue: 139/255, alpha: 1)
        networkLabel.translatesAutoresizingMaskIntoConstraints = false

        mfrLabel.font = .systemFont(ofSize: 12, weight: .regular)
        mfrLabel.textColor = UIColor(red: 100/255, green: 116/255, blue: 139/255, alpha: 1)
        mfrLabel.translatesAutoresizingMaskIntoConstraints = false

        editBtn.setImage(UIImage(systemName: "pencil"), for: .normal)
        editBtn.tintColor = UIColor(red: 37/255, green: 99/255, blue: 235/255, alpha: 1)
        editBtn.addTarget(self, action: #selector(editTapped), for: .touchUpInside)
        editBtn.translatesAutoresizingMaskIntoConstraints = false

        deleteBtn.setImage(UIImage(systemName: "trash"), for: .normal)
        deleteBtn.tintColor = UIColor(red: 220/255, green: 38/255, blue: 38/255, alpha: 1)
        deleteBtn.addTarget(self, action: #selector(deleteTapped), for: .touchUpInside)
        deleteBtn.translatesAutoresizingMaskIntoConstraints = false

        cardView.addSubview(nameLabel)
        cardView.addSubview(modalityPill)
        cardView.addSubview(statusPill)
        cardView.addSubview(aeLabel)
        cardView.addSubview(networkLabel)
        cardView.addSubview(mfrLabel)
        cardView.addSubview(editBtn)
        cardView.addSubview(deleteBtn)

        NSLayoutConstraint.activate([
            cardView.topAnchor.constraint(equalTo: contentView.topAnchor, constant: 6),
            cardView.leadingAnchor.constraint(equalTo: contentView.leadingAnchor),
            cardView.trailingAnchor.constraint(equalTo: contentView.trailingAnchor),
            cardView.bottomAnchor.constraint(equalTo: contentView.bottomAnchor, constant: -6),

            nameLabel.topAnchor.constraint(equalTo: cardView.topAnchor, constant: 12),
            nameLabel.leadingAnchor.constraint(equalTo: cardView.leadingAnchor, constant: 14),
            nameLabel.trailingAnchor.constraint(equalTo: modalityPill.leadingAnchor, constant: -8),

            statusPill.centerYAnchor.constraint(equalTo: nameLabel.centerYAnchor),
            statusPill.trailingAnchor.constraint(equalTo: cardView.trailingAnchor, constant: -14),
            statusPill.heightAnchor.constraint(equalToConstant: 22),

            modalityPill.centerYAnchor.constraint(equalTo: nameLabel.centerYAnchor),
            modalityPill.trailingAnchor.constraint(equalTo: statusPill.leadingAnchor, constant: -8),
            modalityPill.heightAnchor.constraint(equalToConstant: 22),

            aeLabel.topAnchor.constraint(equalTo: nameLabel.bottomAnchor, constant: 4),
            aeLabel.leadingAnchor.constraint(equalTo: cardView.leadingAnchor, constant: 14),
            aeLabel.trailingAnchor.constraint(equalTo: editBtn.leadingAnchor, constant: -8),

            networkLabel.topAnchor.constraint(equalTo: aeLabel.bottomAnchor, constant: 4),
            networkLabel.leadingAnchor.constraint(equalTo: cardView.leadingAnchor, constant: 14),
            networkLabel.trailingAnchor.constraint(equalTo: editBtn.leadingAnchor, constant: -8),

            mfrLabel.topAnchor.constraint(equalTo: networkLabel.bottomAnchor, constant: 4),
            mfrLabel.leadingAnchor.constraint(equalTo: cardView.leadingAnchor, constant: 14),
            mfrLabel.trailingAnchor.constraint(equalTo: editBtn.leadingAnchor, constant: -8),
            mfrLabel.bottomAnchor.constraint(equalTo: cardView.bottomAnchor, constant: -12),

            deleteBtn.trailingAnchor.constraint(equalTo: cardView.trailingAnchor, constant: -14),
            deleteBtn.bottomAnchor.constraint(equalTo: cardView.bottomAnchor, constant: -12),
            deleteBtn.widthAnchor.constraint(equalToConstant: 32),
            deleteBtn.heightAnchor.constraint(equalToConstant: 32),

            editBtn.trailingAnchor.constraint(equalTo: deleteBtn.leadingAnchor, constant: -6),
            editBtn.centerYAnchor.constraint(equalTo: deleteBtn.centerYAnchor),
            editBtn.widthAnchor.constraint(equalToConstant: 32),
            editBtn.heightAnchor.constraint(equalToConstant: 32)
        ])
    }

    required init?(coder: NSCoder) { fatalError() }

    func configure(item: [String: Any], onEdit: @escaping () -> Void, onDelete: @escaping () -> Void) {
        self.onEdit = onEdit
        self.onDelete = onDelete

        nameLabel.text = item["name"] as? String ?? "Equipment"

        let mod = item["modality"] as? String ?? "MODALITY"
        modalityPill.text = "  \(mod.uppercased())  "

        let status = (item["status"] as? String ?? "ACTIVE").uppercased()
        statusPill.text = "  \(status)  "
        if status == "ACTIVE" || status == "ONLINE" {
            statusPill.textColor = UIColor(red: 5/255, green: 150/255, blue: 105/255, alpha: 1)
            statusPill.backgroundColor = UIColor(red: 209/255, green: 250/255, blue: 229/255, alpha: 1)
        } else {
            statusPill.textColor = UIColor(red: 100/255, green: 116/255, blue: 139/255, alpha: 1)
            statusPill.backgroundColor = UIColor(red: 241/255, green: 245/255, blue: 249/255, alpha: 1)
        }

        let ae = item["aeTitle"] as? String ?? ""
        aeLabel.text = ae.isEmpty ? "AE Title: Unset" : "AE Title: \(ae)"

        let ip = item["ipAddress"] as? String ?? "127.0.0.1"
        let port = item["port"] ?? 104
        networkLabel.text = "Network: \(ip):\(port)"

        let mfr = item["manufacturer"] as? String ?? ""
        let model = item["model"] as? String ?? ""
        let mfrStr = [mfr, model].filter { !$0.isEmpty }.joined(separator: " ")
        mfrLabel.text = mfrStr.isEmpty ? "Modality Station" : mfrStr
    }

    @objc private func editTapped() {
        onEdit?()
    }

    @objc private func deleteTapped() {
        onDelete?()
    }
}
