import UIKit

// MARK: - RISMacrosViewController
// Full parity with /workspace/radiology/macros
// CRUD for radiology impression macros: name, modality, category, body text

class RISMacrosViewController: UIViewController {

    private let baseURL = "https://app.patholab.cloud"

    // MARK: UI
    private let navBar      = UIView()
    private let btnBack     = UIButton(type: .system)
    private let btnRefresh  = UIButton(type: .system)
    private let titleLabel  = UILabel()
    private let searchBar   = UISearchBar()
    private let tableView   = UITableView()
    private let emptyView   = UIView()
    private let emptyIcon   = UIImageView()
    private let emptyLabel  = UILabel()
    private let emptySubLabel = UILabel()
    private let addButton   = UIButton(type: .system)
    private let spinner     = UIActivityIndicatorView(style: .medium)

    private var allMacros: [[String: Any]] = []
    private var filtered:  [[String: Any]] = []
    private var searchText = ""

    // MARK: Lifecycle
    override func viewDidLoad() {
        super.viewDidLoad()
        setupUI()
        fetchMacros()
    }

    // MARK: - Setup
    private func setupUI() {
        view.backgroundColor = UIColor(red: 0.96, green: 0.97, blue: 0.98, alpha: 1)

        // NavBar
        navBar.backgroundColor = .white
        navBar.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(navBar)

        btnBack.setImage(UIImage(systemName: "chevron.left"), for: .normal)
        btnBack.tintColor = UIColor(red: 0.05, green: 0.4, blue: 0.9, alpha: 1)
        btnBack.addTarget(self, action: #selector(backTapped), for: .touchUpInside)
        btnBack.translatesAutoresizingMaskIntoConstraints = false

        titleLabel.text = "Radiology Macros"
        titleLabel.font = .systemFont(ofSize: 17, weight: .semibold)
        titleLabel.textAlignment = .center
        titleLabel.translatesAutoresizingMaskIntoConstraints = false

        btnRefresh.setImage(UIImage(systemName: "arrow.clockwise"), for: .normal)
        btnRefresh.tintColor = UIColor(red: 0.05, green: 0.4, blue: 0.9, alpha: 1)
        btnRefresh.addTarget(self, action: #selector(refreshTapped), for: .touchUpInside)
        btnRefresh.translatesAutoresizingMaskIntoConstraints = false

        [btnBack, titleLabel, btnRefresh].forEach { navBar.addSubview($0) }

        // Search
        searchBar.placeholder = "Search macros..."
        searchBar.backgroundImage = UIImage()
        searchBar.backgroundColor = .clear
        searchBar.delegate = self
        searchBar.translatesAutoresizingMaskIntoConstraints = false

        // Table
        tableView.backgroundColor = .clear
        tableView.separatorStyle = .none
        tableView.delegate = self
        tableView.dataSource = self
        tableView.register(MacroCell.self, forCellReuseIdentifier: "MacroCell")
        tableView.translatesAutoresizingMaskIntoConstraints = false

        // Empty
        emptyView.isHidden = true
        emptyView.translatesAutoresizingMaskIntoConstraints = false
        emptyIcon.image = UIImage(systemName: "doc.text.magnifyingglass")
        emptyIcon.tintColor = UIColor.systemBlue.withAlphaComponent(0.4)
        emptyIcon.contentMode = .scaleAspectFit
        emptyIcon.translatesAutoresizingMaskIntoConstraints = false
        emptyLabel.text = "No Macros Found"
        emptyLabel.font = .systemFont(ofSize: 17, weight: .semibold)
        emptyLabel.textColor = UIColor(white: 0.3, alpha: 1)
        emptyLabel.translatesAutoresizingMaskIntoConstraints = false
        emptySubLabel.text = "Create your first impression macro to auto-fill radiology reports."
        emptySubLabel.font = .systemFont(ofSize: 13)
        emptySubLabel.textColor = .secondaryLabel
        emptySubLabel.numberOfLines = 2
        emptySubLabel.textAlignment = .center
        emptySubLabel.translatesAutoresizingMaskIntoConstraints = false
        [emptyIcon, emptyLabel, emptySubLabel].forEach { emptyView.addSubview($0) }

        // Add Button
        addButton.setTitle("+ Add Macro", for: .normal)
        addButton.backgroundColor = UIColor(red: 0.05, green: 0.4, blue: 0.9, alpha: 1)
        addButton.setTitleColor(.white, for: .normal)
        addButton.titleLabel?.font = .systemFont(ofSize: 15, weight: .semibold)
        addButton.layer.cornerRadius = 14
        addButton.addTarget(self, action: #selector(addTapped), for: .touchUpInside)
        addButton.translatesAutoresizingMaskIntoConstraints = false

        // Spinner
        spinner.translatesAutoresizingMaskIntoConstraints = false
        spinner.color = UIColor(red: 0.05, green: 0.4, blue: 0.9, alpha: 1)

        [navBar, searchBar, tableView, emptyView, addButton, spinner].forEach { view.addSubview($0) }
        let safeTop = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }.first?.windows.first?.safeAreaInsets.top ?? 44

        NSLayoutConstraint.activate([
            navBar.topAnchor.constraint(equalTo: view.topAnchor),
            navBar.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            navBar.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            navBar.heightAnchor.constraint(equalToConstant: safeTop + 56),

            btnBack.leadingAnchor.constraint(equalTo: navBar.leadingAnchor, constant: 16),
            btnBack.bottomAnchor.constraint(equalTo: navBar.bottomAnchor, constant: -12),
            btnBack.widthAnchor.constraint(equalToConstant: 36),
            btnBack.heightAnchor.constraint(equalToConstant: 36),

            titleLabel.centerXAnchor.constraint(equalTo: navBar.centerXAnchor),
            titleLabel.centerYAnchor.constraint(equalTo: btnBack.centerYAnchor),

            btnRefresh.trailingAnchor.constraint(equalTo: navBar.trailingAnchor, constant: -16),
            btnRefresh.centerYAnchor.constraint(equalTo: btnBack.centerYAnchor),
            btnRefresh.widthAnchor.constraint(equalToConstant: 36),
            btnRefresh.heightAnchor.constraint(equalToConstant: 36),

            searchBar.topAnchor.constraint(equalTo: navBar.bottomAnchor, constant: 4),
            searchBar.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 8),
            searchBar.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -8),
            searchBar.heightAnchor.constraint(equalToConstant: 44),

            tableView.topAnchor.constraint(equalTo: searchBar.bottomAnchor, constant: 4),
            tableView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            tableView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            tableView.bottomAnchor.constraint(equalTo: addButton.topAnchor, constant: -8),

            emptyView.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            emptyView.centerYAnchor.constraint(equalTo: view.centerYAnchor),
            emptyView.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 40),
            emptyView.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -40),

            emptyIcon.topAnchor.constraint(equalTo: emptyView.topAnchor),
            emptyIcon.centerXAnchor.constraint(equalTo: emptyView.centerXAnchor),
            emptyIcon.widthAnchor.constraint(equalToConstant: 64),
            emptyIcon.heightAnchor.constraint(equalToConstant: 64),

            emptyLabel.topAnchor.constraint(equalTo: emptyIcon.bottomAnchor, constant: 12),
            emptyLabel.centerXAnchor.constraint(equalTo: emptyView.centerXAnchor),

            emptySubLabel.topAnchor.constraint(equalTo: emptyLabel.bottomAnchor, constant: 6),
            emptySubLabel.leadingAnchor.constraint(equalTo: emptyView.leadingAnchor),
            emptySubLabel.trailingAnchor.constraint(equalTo: emptyView.trailingAnchor),
            emptySubLabel.bottomAnchor.constraint(equalTo: emptyView.bottomAnchor),

            addButton.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 16),
            addButton.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -16),
            addButton.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -12),
            addButton.heightAnchor.constraint(equalToConstant: 50),

            spinner.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            spinner.centerYAnchor.constraint(equalTo: view.centerYAnchor),
        ])

        // Shadow for navbar
        navBar.layer.shadowColor = UIColor.black.cgColor
        navBar.layer.shadowOffset = CGSize(width: 0, height: 1)
        navBar.layer.shadowOpacity = 0.06
        navBar.layer.shadowRadius = 4
    }

    // MARK: - API
    private func fetchMacros() {
        spinner.startAnimating()
        tableView.isHidden = true
        emptyView.isHidden = true
        guard let url = URL(string: "\(baseURL)/api/workspace/radiology/macros") else { return }
        var req = URLRequest(url: url)
        req.httpMethod = "GET"
        let tok = KeychainManager.shared.getToken() ?? ""
        req.setValue("Bearer \(tok)", forHTTPHeaderField: "Authorization")
        req.setValue("application/json", forHTTPHeaderField: "Accept")
        req.timeoutInterval = 15
        URLSession.shared.dataTask(with: req) { [weak self] data, _, _ in
            DispatchQueue.main.async {
                self?.spinner.stopAnimating()
                guard let self, let data else { self?.showEmpty(); return }
                if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
                    let arr = (json["macros"] ?? json["data"]) as? [[String: Any]] ?? []
                    self.allMacros = arr
                } else if let arr = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]] {
                    self.allMacros = arr
                }
                self.applyFilter()
            }
        }.resume()
    }

    private func saveMacro(_ payload: [String: Any], id: String?, completion: @escaping (Bool) -> Void) {
        let urlStr = id != nil ? "\(baseURL)/api/workspace/radiology/macros/\(id!)" : "\(baseURL)/api/workspace/radiology/macros"
        guard let url = URL(string: urlStr) else { completion(false); return }
        var req = URLRequest(url: url)
        req.httpMethod = id != nil ? "PUT" : "POST"
        let tok = KeychainManager.shared.getToken() ?? ""
        req.setValue("Bearer \(tok)", forHTTPHeaderField: "Authorization")
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = try? JSONSerialization.data(withJSONObject: payload)
        URLSession.shared.dataTask(with: req) { _, resp, _ in
            let code = (resp as? HTTPURLResponse)?.statusCode ?? 0
            DispatchQueue.main.async { completion(code >= 200 && code < 300) }
        }.resume()
    }

    private func deleteMacro(id: String) {
        guard let url = URL(string: "\(baseURL)/api/workspace/radiology/macros/\(id)") else { return }
        var req = URLRequest(url: url)
        req.httpMethod = "DELETE"
        let tok = KeychainManager.shared.getToken() ?? ""
        req.setValue("Bearer \(tok)", forHTTPHeaderField: "Authorization")
        URLSession.shared.dataTask(with: req) { [weak self] _, resp, _ in
            let code = (resp as? HTTPURLResponse)?.statusCode ?? 0
            DispatchQueue.main.async {
                if code >= 200 && code < 300 { self?.fetchMacros() }
                else { self?.showToast("Delete failed") }
            }
        }.resume()
    }

    // MARK: - Helpers
    private func applyFilter() {
        filtered = searchText.isEmpty ? allMacros : allMacros.filter {
            let name = ($0["name"] as? String ?? "").lowercased()
            let mod  = ($0["modality"] as? String ?? "").lowercased()
            let body = ($0["body"] as? String ?? $0["text"] as? String ?? "").lowercased()
            return name.contains(searchText) || mod.contains(searchText) || body.contains(searchText)
        }
        let empty = filtered.isEmpty
        tableView.isHidden = empty
        emptyView.isHidden = !empty
        tableView.reloadData()
    }

    private func showEmpty() { emptyView.isHidden = false; tableView.isHidden = true }

    private func showToast(_ msg: String) {
        let t = UILabel(); t.text = msg; t.textColor = .white
        t.backgroundColor = UIColor.black.withAlphaComponent(0.75)
        t.textAlignment = .center; t.font = .systemFont(ofSize: 13)
        t.layer.cornerRadius = 10; t.clipsToBounds = true
        t.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(t)
        NSLayoutConstraint.activate([t.centerXAnchor.constraint(equalTo: view.centerXAnchor),
                                      t.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -70),
                                      t.widthAnchor.constraint(lessThanOrEqualTo: view.widthAnchor, multiplier: 0.8),
                                      t.heightAnchor.constraint(equalToConstant: 36)])
        UIView.animate(withDuration: 0.3, delay: 1.5, options: [], animations: { t.alpha = 0 }) { _ in t.removeFromSuperview() }
    }

    // MARK: - Actions
    @objc private func backTapped() { dismiss(animated: true) }
    @objc private func refreshTapped() {
        UIView.animate(withDuration: 0.4) { self.btnRefresh.transform = CGAffineTransform(rotationAngle: .pi) }
        UIView.animate(withDuration: 0.4, delay: 0.4) { self.btnRefresh.transform = .identity }
        fetchMacros()
    }
    @objc private func addTapped() { showMacroSheet(nil) }

    private func showMacroSheet(_ macro: [String: Any]?) {
        let isEdit = macro != nil
        let sheet = UIAlertController(title: isEdit ? "Edit Macro" : "New Macro", message: nil, preferredStyle: .alert)
        sheet.addTextField { $0.placeholder = "Macro name"; $0.text = macro?["name"] as? String }
        sheet.addTextField { $0.placeholder = "Modality (e.g. X-Ray, CT, MRI)"; $0.text = macro?["modality"] as? String }
        sheet.addTextField { $0.placeholder = "Category (optional)"; $0.text = macro?["category"] as? String }
        let saveAction = UIAlertAction(title: isEdit ? "Update" : "Create", style: .default) { [weak self] _ in
            guard let self else { return }
            let name     = sheet.textFields?[0].text?.trimmingCharacters(in: .whitespaces) ?? ""
            let modality = sheet.textFields?[1].text?.trimmingCharacters(in: .whitespaces) ?? ""
            let category = sheet.textFields?[2].text?.trimmingCharacters(in: .whitespaces) ?? ""
            guard !name.isEmpty else { return }
            self.showBodyInputSheet(macroId: macro?["id"] as? String, name: name, modality: modality, category: category,
                                    existingBody: macro?["body"] as? String ?? macro?["text"] as? String ?? "")
        }
        sheet.addAction(saveAction)
        sheet.addAction(UIAlertAction(title: "Cancel", style: .cancel))
        present(sheet, animated: true)
    }

    private func showBodyInputSheet(macroId: String?, name: String, modality: String, category: String, existingBody: String) {
        let vc = MacroBodyEditorViewController()
        vc.initialBody = existingBody
        vc.onSave = { [weak self] body in
            guard let self else { return }
            let payload: [String: Any] = ["name": name, "modality": modality, "category": category, "body": body]
            self.saveMacro(payload, id: macroId) { success in
                if success { self.fetchMacros(); self.showToast(macroId != nil ? "Macro updated" : "Macro created") }
                else { self.showToast("Save failed. Please retry.") }
            }
        }
        vc.modalPresentationStyle = .pageSheet
        if let sheet = vc.sheetPresentationController {
            sheet.detents = [.large()]
            sheet.prefersGrabberVisible = true
        }
        present(vc, animated: true)
    }
}

// MARK: - UITableView
extension RISMacrosViewController: UITableViewDelegate, UITableViewDataSource {
    func tableView(_ tv: UITableView, numberOfRowsInSection s: Int) -> Int { filtered.count }
    func tableView(_ tv: UITableView, cellForRowAt ip: IndexPath) -> UITableViewCell {
        let cell = tv.dequeueReusableCell(withIdentifier: "MacroCell", for: ip) as! MacroCell
        cell.configure(with: filtered[ip.row])
        cell.onEdit   = { [weak self] in self?.showMacroSheet(self?.filtered[ip.row]) }
        cell.onDelete = { [weak self] in
            guard let self else { return }
            let m = self.filtered[ip.row]
            let name = m["name"] as? String ?? "this macro"
            let alert = UIAlertController(title: "Delete Macro", message: "Delete \"\(name)\"? This cannot be undone.", preferredStyle: .alert)
            alert.addAction(UIAlertAction(title: "Delete", style: .destructive) { _ in
                if let id = m["id"] as? String { self.deleteMacro(id: id) }
            })
            alert.addAction(UIAlertAction(title: "Cancel", style: .cancel))
            self.present(alert, animated: true)
        }
        return cell
    }
    func tableView(_ tv: UITableView, heightForRowAt ip: IndexPath) -> CGFloat { UITableView.automaticDimension }
}

// MARK: - UISearchBarDelegate
extension RISMacrosViewController: UISearchBarDelegate {
    func searchBar(_ s: UISearchBar, textDidChange t: String) { searchText = t.lowercased(); applyFilter() }
    func searchBarSearchButtonClicked(_ s: UISearchBar) { s.resignFirstResponder() }
}

// MARK: - MacroCell
class MacroCell: UITableViewCell {
    private let card       = UIView()
    private let lblName    = UILabel()
    private let lblMod     = UILabel()
    private let lblCat     = UILabel()
    private let lblBody    = UILabel()
    private let btnEdit    = UIButton(type: .system)
    private let btnDelete  = UIButton(type: .system)
    var onEdit:   (() -> Void)?
    var onDelete: (() -> Void)?

    override init(style: UITableViewCell.CellStyle, reuseIdentifier: String?) {
        super.init(style: style, reuseIdentifier: reuseIdentifier)
        selectionStyle = .none; backgroundColor = .clear
        card.backgroundColor = .white; card.layer.cornerRadius = 14
        card.layer.shadowColor = UIColor.black.cgColor; card.layer.shadowOpacity = 0.05
        card.layer.shadowOffset = CGSize(width: 0, height: 2); card.layer.shadowRadius = 6
        card.translatesAutoresizingMaskIntoConstraints = false; contentView.addSubview(card)

        lblName.font = .systemFont(ofSize: 15, weight: .semibold); lblName.textColor = UIColor(white: 0.1, alpha: 1)
        lblMod.font  = .systemFont(ofSize: 12, weight: .medium); lblMod.textColor = UIColor(red: 0.05, green: 0.4, blue: 0.9, alpha: 1)
        lblMod.backgroundColor = UIColor(red: 0.05, green: 0.4, blue: 0.9, alpha: 0.1)
        lblMod.layer.cornerRadius = 6; lblMod.clipsToBounds = true
        lblCat.font  = .systemFont(ofSize: 11); lblCat.textColor = .secondaryLabel
        lblBody.font = .systemFont(ofSize: 13); lblBody.textColor = UIColor(white: 0.3, alpha: 1)
        lblBody.numberOfLines = 3

        btnEdit.setTitle("Edit", for: .normal); btnEdit.titleLabel?.font = .systemFont(ofSize: 13, weight: .medium)
        btnEdit.tintColor = UIColor(red: 0.05, green: 0.4, blue: 0.9, alpha: 1)
        btnEdit.addTarget(self, action: #selector(editTapped), for: .touchUpInside)
        btnDelete.setTitle("Delete", for: .normal); btnDelete.titleLabel?.font = .systemFont(ofSize: 13, weight: .medium)
        btnDelete.tintColor = UIColor(red: 0.85, green: 0.1, blue: 0.1, alpha: 1)
        btnDelete.addTarget(self, action: #selector(deleteTapped), for: .touchUpInside)

        let topRow = UIStackView(arrangedSubviews: [lblName, lblMod])
        topRow.spacing = 8; topRow.alignment = .center

        let btnRow = UIStackView(arrangedSubviews: [UIView(), btnDelete, btnEdit])
        btnRow.spacing = 8; btnRow.alignment = .center

        let stack = UIStackView(arrangedSubviews: [topRow, lblCat, lblBody, btnRow])
        stack.axis = .vertical; stack.spacing = 6; stack.alignment = .leading
        stack.translatesAutoresizingMaskIntoConstraints = false; card.addSubview(stack)

        NSLayoutConstraint.activate([
            card.topAnchor.constraint(equalTo: contentView.topAnchor, constant: 6),
            card.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 16),
            card.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -16),
            card.bottomAnchor.constraint(equalTo: contentView.bottomAnchor, constant: -6),
            stack.topAnchor.constraint(equalTo: card.topAnchor, constant: 14),
            stack.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 14),
            stack.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -14),
            stack.bottomAnchor.constraint(equalTo: card.bottomAnchor, constant: -14),
        ])
    }
    required init?(coder: NSCoder) { fatalError() }

    func configure(with m: [String: Any]) {
        lblName.text = m["name"] as? String ?? "Macro"
        let mod = m["modality"] as? String ?? "General"
        lblMod.text = "  \(mod)  "
        let cat = m["category"] as? String ?? ""
        lblCat.text = cat.isEmpty ? nil : cat; lblCat.isHidden = cat.isEmpty
        let body = m["body"] as? String ?? m["text"] as? String ?? ""
        lblBody.text = body
    }
    @objc private func editTapped()   { onEdit?()   }
    @objc private func deleteTapped() { onDelete?() }
}

// MARK: - MacroBodyEditorViewController
class MacroBodyEditorViewController: UIViewController {
    var initialBody = ""
    var onSave: ((String) -> Void)?

    private let titleLbl    = UILabel()
    private let textView    = UITextView()
    private let saveButton  = UIButton(type: .system)
    private let cancelBtn   = UIButton(type: .system)
    private let hintLabel   = UILabel()

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 0.96, green: 0.97, blue: 0.98, alpha: 1)

        titleLbl.text = "Macro Body / Impression Text"
        titleLbl.font = .systemFont(ofSize: 17, weight: .semibold)
        titleLbl.translatesAutoresizingMaskIntoConstraints = false

        hintLabel.text = "Enter the impression text that will auto-fill in the radiology report."
        hintLabel.font = .systemFont(ofSize: 12)
        hintLabel.textColor = .secondaryLabel
        hintLabel.numberOfLines = 2
        hintLabel.translatesAutoresizingMaskIntoConstraints = false

        textView.font = .systemFont(ofSize: 14)
        textView.layer.cornerRadius = 12
        textView.backgroundColor = .white
        textView.layer.borderColor = UIColor(white: 0.88, alpha: 1).cgColor
        textView.layer.borderWidth = 1
        textView.textContainerInset = UIEdgeInsets(top: 12, left: 10, bottom: 12, right: 10)
        textView.text = initialBody
        textView.translatesAutoresizingMaskIntoConstraints = false

        saveButton.setTitle("Save Macro", for: .normal)
        saveButton.backgroundColor = UIColor(red: 0.05, green: 0.4, blue: 0.9, alpha: 1)
        saveButton.setTitleColor(.white, for: .normal)
        saveButton.titleLabel?.font = .systemFont(ofSize: 15, weight: .semibold)
        saveButton.layer.cornerRadius = 14
        saveButton.addTarget(self, action: #selector(saveTapped), for: .touchUpInside)
        saveButton.translatesAutoresizingMaskIntoConstraints = false

        cancelBtn.setTitle("Cancel", for: .normal)
        cancelBtn.setTitleColor(.secondaryLabel, for: .normal)
        cancelBtn.addTarget(self, action: #selector(cancelTapped), for: .touchUpInside)
        cancelBtn.translatesAutoresizingMaskIntoConstraints = false

        [titleLbl, hintLabel, textView, saveButton, cancelBtn].forEach { view.addSubview($0) }
        NSLayoutConstraint.activate([
            titleLbl.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 20),
            titleLbl.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 20),
            titleLbl.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -20),
            hintLabel.topAnchor.constraint(equalTo: titleLbl.bottomAnchor, constant: 6),
            hintLabel.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 20),
            hintLabel.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -20),
            textView.topAnchor.constraint(equalTo: hintLabel.bottomAnchor, constant: 14),
            textView.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 16),
            textView.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -16),
            textView.bottomAnchor.constraint(equalTo: saveButton.topAnchor, constant: -16),
            saveButton.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 16),
            saveButton.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -16),
            saveButton.bottomAnchor.constraint(equalTo: cancelBtn.topAnchor, constant: -8),
            saveButton.heightAnchor.constraint(equalToConstant: 50),
            cancelBtn.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            cancelBtn.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -16),
            cancelBtn.heightAnchor.constraint(equalToConstant: 36),
        ])
    }
    @objc private func saveTapped() {
        let body = textView.text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !body.isEmpty else { return }
        dismiss(animated: true) { self.onSave?(body) }
    }
    @objc private func cancelTapped() { dismiss(animated: true) }
}
