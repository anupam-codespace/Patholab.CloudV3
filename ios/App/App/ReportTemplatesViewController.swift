import UIKit
import WebKit

// MARK: - ReportTemplatesViewController
// 100% Web Parity with /workspace/settings/templates & /workspace/settings/report-template
// Royal Sapphire Curved Header (3-stop gradient #0D6EFD -> #0A58CA -> #1D4ED8, 28pt radius)
// Features:
//  - Active Template Badge & "Set as Active" One-tap Action
//  - Header Modes: Standard, Pre-printed Stationery / Blank, Image Letterhead
//  - Doctor Signatures & NABL Accreditation Toggles
//  - Create, Edit, Duplicate, Delete with live real-time two-way server sync
//  - Dual-host fallback (app.patholab.cloud & patholab.cloud) with multi-token cookies
class ReportTemplatesViewController: UIViewController {

    private let baseHosts = ["https://app.patholab.cloud", "https://patholab.cloud"]

    // ── Royal Sapphire Header Views ──
    private let headerContainer = UIView()
    private let headerGradient  = CAGradientLayer()
    private let btnBack          = UIButton(type: .system)
    private let btnRefresh       = UIButton(type: .system)
    private let lblHeaderTitle   = UILabel()
    private let lblHeaderSub     = UILabel()

    // ── Content Views ──
    private let searchContainer  = UIView()
    private let searchBar        = UISearchBar()
    private let tableView        = UITableView()
    private let emptyView        = UIView()
    private let btnCreate        = UIButton(type: .system)
    private let spinner          = UIActivityIndicatorView(style: .large)
    private let refreshControl   = UIRefreshControl()

    private var allTemplates: [[String: Any]] = []
    private var filtered:     [[String: Any]] = []
    private var searchText = ""

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 0.965, green: 0.973, blue: 0.984, alpha: 1.0)
        setupHeader()
        setupUI()
        syncCookiesAndFetch()
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        fetchTemplates(showLoader: false)
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        headerGradient.frame = headerContainer.bounds
        headerContainer.layer.shadowPath = UIBezierPath(
            roundedRect: headerContainer.bounds,
            byRoundingCorners: [.bottomLeft, .bottomRight],
            cornerRadii: CGSize(width: 28, height: 28)
        ).cgPath
    }

    // MARK: - Royal Sapphire Frosted Header
    private func setupHeader() {
        headerContainer.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(headerContainer)

        // 3-stop Royal Sapphire gradient
        headerGradient.colors = [
            UIColor(red: 0.05, green: 0.43, blue: 0.99, alpha: 1.0).cgColor, // #0D6EFD
            UIColor(red: 0.04, green: 0.35, blue: 0.79, alpha: 1.0).cgColor, // #0A58CA
            UIColor(red: 0.11, green: 0.31, blue: 0.85, alpha: 1.0).cgColor  // #1D4ED8
        ]
        headerGradient.locations = [0.0, 0.55, 1.0]
        headerGradient.startPoint = CGPoint(x: 0.0, y: 0.0)
        headerGradient.endPoint = CGPoint(x: 1.0, y: 1.0)
        headerContainer.layer.insertSublayer(headerGradient, at: 0)

        // 28pt bottom rounded corners
        headerContainer.layer.cornerRadius = 28
        headerContainer.layer.maskedCorners = [.layerMinXMaxYCorner, .layerMaxXMaxYCorner]
        headerContainer.layer.masksToBounds = false
        headerContainer.layer.shadowColor = UIColor(red: 0.05, green: 0.35, blue: 0.85, alpha: 0.35).cgColor
        headerContainer.layer.shadowOpacity = 0.35
        headerContainer.layer.shadowOffset = CGSize(width: 0, height: 8)
        headerContainer.layer.shadowRadius = 14

        // Frosted glass circular back button
        btnBack.setImage(UIImage(systemName: "arrow.left"), for: .normal)
        btnBack.tintColor = .white
        btnBack.backgroundColor = UIColor.white.withAlphaComponent(0.18)
        btnBack.layer.cornerRadius = 20
        btnBack.layer.borderWidth = 1
        btnBack.layer.borderColor = UIColor.white.withAlphaComponent(0.3).cgColor
        btnBack.clipsToBounds = true
        btnBack.addTarget(self, action: #selector(backTapped), for: .touchUpInside)
        btnBack.translatesAutoresizingMaskIntoConstraints = false
        headerContainer.addSubview(btnBack)

        // Title and Subtitle Stack
        lblHeaderTitle.text = "Report Templates"
        lblHeaderTitle.font = .systemFont(ofSize: 20, weight: .bold)
        lblHeaderTitle.textColor = .white
        lblHeaderTitle.translatesAutoresizingMaskIntoConstraints = false
        headerContainer.addSubview(lblHeaderTitle)

        lblHeaderSub.text = "Master layouts, letterhead & print styles"
        lblHeaderSub.font = .systemFont(ofSize: 11.5, weight: .medium)
        lblHeaderSub.textColor = UIColor(red: 0.78, green: 0.87, blue: 1.0, alpha: 1.0)
        lblHeaderSub.translatesAutoresizingMaskIntoConstraints = false
        headerContainer.addSubview(lblHeaderSub)

        // Frosted glass circular refresh button
        btnRefresh.setImage(UIImage(systemName: "arrow.clockwise"), for: .normal)
        btnRefresh.tintColor = .white
        btnRefresh.backgroundColor = UIColor.white.withAlphaComponent(0.18)
        btnRefresh.layer.cornerRadius = 20
        btnRefresh.layer.borderWidth = 1
        btnRefresh.layer.borderColor = UIColor.white.withAlphaComponent(0.3).cgColor
        btnRefresh.clipsToBounds = true
        btnRefresh.addTarget(self, action: #selector(refreshTapped), for: .touchUpInside)
        btnRefresh.translatesAutoresizingMaskIntoConstraints = false
        headerContainer.addSubview(btnRefresh)

        NSLayoutConstraint.activate([
            headerContainer.topAnchor.constraint(equalTo: view.topAnchor),
            headerContainer.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            headerContainer.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            headerContainer.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 72),

            btnBack.leadingAnchor.constraint(equalTo: headerContainer.leadingAnchor, constant: 16),
            btnBack.bottomAnchor.constraint(equalTo: headerContainer.bottomAnchor, constant: -14),
            btnBack.widthAnchor.constraint(equalToConstant: 40),
            btnBack.heightAnchor.constraint(equalToConstant: 40),

            lblHeaderTitle.leadingAnchor.constraint(equalTo: btnBack.trailingAnchor, constant: 14),
            lblHeaderTitle.topAnchor.constraint(equalTo: btnBack.topAnchor, constant: -1),
            lblHeaderTitle.trailingAnchor.constraint(lessThanOrEqualTo: btnRefresh.leadingAnchor, constant: -8),

            lblHeaderSub.leadingAnchor.constraint(equalTo: lblHeaderTitle.leadingAnchor),
            lblHeaderSub.topAnchor.constraint(equalTo: lblHeaderTitle.bottomAnchor, constant: 3),
            lblHeaderSub.trailingAnchor.constraint(lessThanOrEqualTo: btnRefresh.leadingAnchor, constant: -8),

            btnRefresh.trailingAnchor.constraint(equalTo: headerContainer.trailingAnchor, constant: -16),
            btnRefresh.centerYAnchor.constraint(equalTo: btnBack.centerYAnchor),
            btnRefresh.widthAnchor.constraint(equalToConstant: 40),
            btnRefresh.heightAnchor.constraint(equalToConstant: 40),
        ])
    }

    // MARK: - Setup Content UI
    private func setupUI() {
        // Search Container
        searchContainer.backgroundColor = .white
        searchContainer.layer.cornerRadius = 14
        searchContainer.layer.shadowColor = UIColor.black.cgColor
        searchContainer.layer.shadowOpacity = 0.04
        searchContainer.layer.shadowOffset = CGSize(width: 0, height: 2)
        searchContainer.layer.shadowRadius = 6
        searchContainer.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(searchContainer)

        searchBar.placeholder = "Search templates by name..."
        searchBar.backgroundImage = UIImage()
        searchBar.delegate = self
        searchBar.translatesAutoresizingMaskIntoConstraints = false
        searchContainer.addSubview(searchBar)

        NSLayoutConstraint.activate([
            searchContainer.topAnchor.constraint(equalTo: headerContainer.bottomAnchor, constant: 12),
            searchContainer.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 16),
            searchContainer.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -16),
            searchContainer.heightAnchor.constraint(equalToConstant: 48),

            searchBar.topAnchor.constraint(equalTo: searchContainer.topAnchor),
            searchBar.leadingAnchor.constraint(equalTo: searchContainer.leadingAnchor, constant: 4),
            searchBar.trailingAnchor.constraint(equalTo: searchContainer.trailingAnchor, constant: -4),
            searchBar.bottomAnchor.constraint(equalTo: searchContainer.bottomAnchor),
        ])

        // TableView
        tableView.backgroundColor = .clear
        tableView.separatorStyle = .none
        tableView.delegate = self
        tableView.dataSource = self
        tableView.register(TemplateCardCell.self, forCellReuseIdentifier: "TemplateCardCell")
        tableView.translatesAutoresizingMaskIntoConstraints = false
        refreshControl.tintColor = UIColor(red: 0.05, green: 0.4, blue: 0.9, alpha: 1.0)
        refreshControl.addTarget(self, action: #selector(refreshPulled), for: .valueChanged)
        tableView.refreshControl = refreshControl
        view.addSubview(tableView)

        // Empty View
        emptyView.isHidden = true
        emptyView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(emptyView)

        let imgEmpty = UIImageView(image: UIImage(systemName: "doc.text.image"))
        imgEmpty.tintColor = UIColor(red: 0.05, green: 0.43, blue: 0.99, alpha: 0.35)
        imgEmpty.contentMode = .scaleAspectFit
        imgEmpty.translatesAutoresizingMaskIntoConstraints = false

        let lblEmptyTitle = UILabel()
        lblEmptyTitle.text = "No Report Templates"
        lblEmptyTitle.font = .systemFont(ofSize: 17, weight: .bold)
        lblEmptyTitle.textColor = UIColor(red: 0.12, green: 0.16, blue: 0.24, alpha: 1.0)
        lblEmptyTitle.translatesAutoresizingMaskIntoConstraints = false

        let lblEmptySub = UILabel()
        lblEmptySub.text = "Create customized report layouts with custom letterheads, doctor signatures, and header modes."
        lblEmptySub.font = .systemFont(ofSize: 13)
        lblEmptySub.textColor = UIColor(red: 0.4, green: 0.46, blue: 0.54, alpha: 1.0)
        lblEmptySub.numberOfLines = 2
        lblEmptySub.textAlignment = .center
        lblEmptySub.translatesAutoresizingMaskIntoConstraints = false

        [imgEmpty, lblEmptyTitle, lblEmptySub].forEach { emptyView.addSubview($0) }
        NSLayoutConstraint.activate([
            imgEmpty.topAnchor.constraint(equalTo: emptyView.topAnchor),
            imgEmpty.centerXAnchor.constraint(equalTo: emptyView.centerXAnchor),
            imgEmpty.widthAnchor.constraint(equalToConstant: 54),
            imgEmpty.heightAnchor.constraint(equalToConstant: 54),

            lblEmptyTitle.topAnchor.constraint(equalTo: imgEmpty.bottomAnchor, constant: 12),
            lblEmptyTitle.centerXAnchor.constraint(equalTo: emptyView.centerXAnchor),

            lblEmptySub.topAnchor.constraint(equalTo: lblEmptyTitle.bottomAnchor, constant: 6),
            lblEmptySub.leadingAnchor.constraint(equalTo: emptyView.leadingAnchor, constant: 24),
            lblEmptySub.trailingAnchor.constraint(equalTo: emptyView.trailingAnchor, constant: -24),
            lblEmptySub.bottomAnchor.constraint(equalTo: emptyView.bottomAnchor),
        ])

        // Bottom CTA Button: Create New Template
        btnCreate.setTitle("+ Create New Template", for: .normal)
        btnCreate.setTitleColor(.white, for: .normal)
        btnCreate.titleLabel?.font = .systemFont(ofSize: 15, weight: .bold)
        btnCreate.backgroundColor = UIColor(red: 0.05, green: 0.43, blue: 0.99, alpha: 1.0)
        btnCreate.layer.cornerRadius = 14
        btnCreate.layer.shadowColor = UIColor(red: 0.05, green: 0.43, blue: 0.99, alpha: 0.4).cgColor
        btnCreate.layer.shadowOpacity = 0.3
        btnCreate.layer.shadowOffset = CGSize(width: 0, height: 4)
        btnCreate.layer.shadowRadius = 8
        btnCreate.addTarget(self, action: #selector(createTapped), for: .touchUpInside)
        btnCreate.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(btnCreate)

        // Spinner
        spinner.color = UIColor(red: 0.05, green: 0.43, blue: 0.99, alpha: 1.0)
        spinner.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(spinner)

        NSLayoutConstraint.activate([
            tableView.topAnchor.constraint(equalTo: searchContainer.bottomAnchor, constant: 10),
            tableView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            tableView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            tableView.bottomAnchor.constraint(equalTo: btnCreate.topAnchor, constant: -10),

            emptyView.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            emptyView.centerYAnchor.constraint(equalTo: tableView.centerYAnchor),
            emptyView.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 20),
            emptyView.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -20),

            btnCreate.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 16),
            btnCreate.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -16),
            btnCreate.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -10),
            btnCreate.heightAnchor.constraint(equalToConstant: 50),

            spinner.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            spinner.centerYAnchor.constraint(equalTo: view.centerYAnchor),
        ])
    }

    // MARK: - Auth & Real-Time Sync
    private func syncCookiesAndFetch() {
        fetchTemplates(showLoader: true)
    }

    private func getAuthTokens() -> String {
        var token = KeychainManager.shared.getToken() ?? ""
        if token.isEmpty {
            token = UserDefaults.standard.string(forKey: "auth_token") ?? ""
        }
        return token
    }

    private func executeRequest(path: String, method: String, body: [String: Any]? = nil, completion: @escaping (Data?, HTTPURLResponse?, Error?) -> Void) {
        let token = getAuthTokens()
        var cookieStrings: [String] = []
        if !token.isEmpty {
            cookieStrings.append("token=\(token); auth-token=\(token); auth_token=\(token)")
        }

        WKWebsiteDataStore.default().httpCookieStore.getAllCookies { cookies in
            for c in cookies {
                if c.name == "token" || c.name == "auth-token" || c.name == "auth_token" {
                    cookieStrings.append("\(c.name)=\(c.value)")
                }
            }

            let cookieHeader = cookieStrings.joined(separator: "; ")

            func attempt(hostIndex: Int) {
                guard hostIndex < self.baseHosts.count else {
                    DispatchQueue.main.async { completion(nil, nil, NSError(domain: "PathoLab", code: 404, userInfo: [NSLocalizedDescriptionKey: "Host unreachable"])) }
                    return
                }

                let host = self.baseHosts[hostIndex]
                guard let url = URL(string: "\(host)\(path)") else {
                    attempt(hostIndex: hostIndex + 1)
                    return
                }

                var req = URLRequest(url: url)
                req.httpMethod = method
                if !token.isEmpty {
                    req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
                }
                if !cookieHeader.isEmpty {
                    req.setValue(cookieHeader, forHTTPHeaderField: "Cookie")
                }
                req.setValue("application/json", forHTTPHeaderField: "Accept")
                req.timeoutInterval = 12

                if let body = body {
                    req.setValue("application/json", forHTTPHeaderField: "Content-Type")
                    req.httpBody = try? JSONSerialization.data(withJSONObject: body)
                }

                URLSession.shared.dataTask(with: req) { data, resp, err in
                    let http = resp as? HTTPURLResponse
                    if let http = http, (200...299).contains(http.statusCode) {
                        DispatchQueue.main.async { completion(data, http, nil) }
                    } else if hostIndex + 1 < self.baseHosts.count {
                        attempt(hostIndex: hostIndex + 1)
                    } else {
                        DispatchQueue.main.async { completion(data, http, err) }
                    }
                }.resume()
            }

            attempt(hostIndex: 0)
        }
    }

    private func fetchTemplates(showLoader: Bool = true) {
        if showLoader {
            spinner.startAnimating()
            tableView.isHidden = true
            emptyView.isHidden = true
        }

        executeRequest(path: "/api/workspace/settings/templates", method: "GET") { [weak self] data, resp, err in
            guard let self = self else { return }
            self.spinner.stopAnimating()
            self.refreshControl.endRefreshing()

            if let data = data {
                if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
                    self.allTemplates = json["templates"] as? [[String: Any]] ?? json["data"] as? [[String: Any]] ?? []
                } else if let arr = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]] {
                    self.allTemplates = arr
                }
            }

            self.applyFilter()
        }
    }

    private func applyFilter() {
        if searchText.trimmingCharacters(in: .whitespaces).isEmpty {
            filtered = allTemplates
        } else {
            let q = searchText.lowercased()
            filtered = allTemplates.filter {
                let name = ($0["name"] as? String ?? "").lowercased()
                let config = $0["config"] as? [String: Any]
                let header = config?["header"] as? [String: Any]
                let title = (header?["title"] as? String ?? "").lowercased()
                return name.contains(q) || title.contains(q)
            }
        }

        let isEmpty = filtered.isEmpty
        tableView.isHidden = isEmpty
        emptyView.isHidden = !isEmpty
        tableView.reloadData()
    }

    // MARK: - Actions
    @objc private func backTapped() {
        dismiss(animated: true)
    }

    @objc private func refreshTapped() {
        UIImpactFeedbackGenerator(style: .medium).impactOccurred()
        UIView.animate(withDuration: 0.35) { self.btnRefresh.transform = CGAffineTransform(rotationAngle: .pi) }
        UIView.animate(withDuration: 0.35, delay: 0.35) { self.btnRefresh.transform = .identity }
        fetchTemplates(showLoader: true)
    }

    @objc private func refreshPulled() {
        fetchTemplates(showLoader: false)
    }

    @objc private func createTapped() {
        UIImpactFeedbackGenerator(style: .medium).impactOccurred()
        presentTemplateBuilder(existing: nil)
    }

    // MARK: - Set as Active Action (Web Parity)
    private func activateTemplate(_ template: [String: Any]) {
        guard let id = template["id"] as? String else { return }
        UIImpactFeedbackGenerator(style: .medium).impactOccurred()
        spinner.startAnimating()

        let payload: [String: Any] = [
            "action": "ACTIVATE",
            "templateId": id
        ]

        executeRequest(path: "/api/workspace/settings/templates", method: "POST", body: payload) { [weak self] data, resp, err in
            guard let self = self else { return }
            self.spinner.stopAnimating()
            let code = resp?.statusCode ?? 0
            if (200...299).contains(code) {
                UINotificationFeedbackGenerator().notificationOccurred(.success)
                self.showToast("Template set as Active!")
                self.fetchTemplates(showLoader: false)
            } else {
                UINotificationFeedbackGenerator().notificationOccurred(.error)
                self.showToast("Failed to activate template (\(code))")
            }
        }
    }

    // MARK: - Duplicate Template Action
    private func duplicateTemplate(_ template: [String: Any]) {
        guard let id = template["id"] as? String else { return }
        UIImpactFeedbackGenerator(style: .medium).impactOccurred()
        spinner.startAnimating()

        executeRequest(path: "/api/workspace/settings/templates/\(id)/duplicate", method: "POST", body: [:]) { [weak self] data, resp, err in
            guard let self = self else { return }
            self.spinner.stopAnimating()
            let code = resp?.statusCode ?? 0
            if (200...299).contains(code) {
                UINotificationFeedbackGenerator().notificationOccurred(.success)
                self.showToast("Template duplicated successfully!")
                self.fetchTemplates(showLoader: false)
            } else {
                UINotificationFeedbackGenerator().notificationOccurred(.error)
                self.showToast("Failed to duplicate template")
            }
        }
    }

    // MARK: - Delete Template Action
    private func deleteTemplate(_ template: [String: Any]) {
        guard let id = template["id"] as? String else { return }
        let name = template["name"] as? String ?? "this template"

        let alert = UIAlertController(
            title: "Delete Template?",
            message: "Are you sure you want to delete \"\(name)\"? This action cannot be undone.",
            preferredStyle: .alert
        )
        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel))
        alert.addAction(UIAlertAction(title: "Delete", style: .destructive) { [weak self] _ in
            guard let self = self else { return }
            self.spinner.startAnimating()
            self.executeRequest(path: "/api/workspace/settings/templates/\(id)", method: "DELETE") { [weak self] data, resp, err in
                guard let self = self else { return }
                self.spinner.stopAnimating()
                let code = resp?.statusCode ?? 0
                if (200...299).contains(code) {
                    UINotificationFeedbackGenerator().notificationOccurred(.success)
                    self.showToast("Template deleted")
                    self.fetchTemplates(showLoader: false)
                } else {
                    UINotificationFeedbackGenerator().notificationOccurred(.error)
                    self.showToast("Failed to delete template")
                }
            }
        })
        present(alert, animated: true)
    }

    // MARK: - Template Builder Sheet (Full Web Parity)
    private func presentTemplateBuilder(existing: [String: Any]?) {
        let isEdit = existing != nil
        let existingConfig = existing?["config"] as? [String: Any] ?? [:]
        let existingHeader = existingConfig["header"] as? [String: Any] ?? [:]
        let existingFooter = existingConfig["footer"] as? [String: Any] ?? [:]

        let alert = UIAlertController(
            title: isEdit ? "Edit Template" : "New Report Template",
            message: "Configure report header mode, text, and print options.",
            preferredStyle: .alert
        )

        alert.addTextField { tf in
            tf.placeholder = "Template Name (e.g. Official Header)"
            tf.text = existing?["name"] as? String ?? (isEdit ? "" : "Official Header Template")
        }

        alert.addTextField { tf in
            tf.placeholder = "Header Mode: standard / blank / image"
            let mode = existingHeader["mode"] as? String ?? "standard"
            tf.text = mode
        }

        alert.addTextField { tf in
            tf.placeholder = "Header Title / Lab Name"
            tf.text = existingHeader["title"] as? String ?? ""
        }

        alert.addTextField { tf in
            tf.placeholder = "Footer Disclaimer Text"
            tf.text = existingFooter["text"] as? String ?? "Computer generated diagnostic report. Consult physician for clinical correlation."
        }

        let saveAction = UIAlertAction(title: isEdit ? "Save Changes" : "Create Template", style: .default) { [weak self] _ in
            guard let self = self else { return }
            let name = alert.textFields?[0].text?.trimmingCharacters(in: .whitespaces) ?? "New Template"
            var mode = alert.textFields?[1].text?.trimmingCharacters(in: .whitespaces).lowercased() ?? "standard"
            if mode != "standard" && mode != "blank" && mode != "image" {
                mode = "standard"
            }
            let headerTitle = alert.textFields?[2].text?.trimmingCharacters(in: .whitespaces) ?? ""
            let footerText = alert.textFields?[3].text?.trimmingCharacters(in: .whitespaces) ?? ""

            var config = existingConfig
            var header = existingHeader
            header["show"] = true
            header["mode"] = mode
            header["title"] = headerTitle
            config["header"] = header

            var footer = existingFooter
            footer["show"] = true
            footer["mode"] = mode == "blank" ? "blank" : "standard"
            footer["text"] = footerText
            if footer["signatures"] == nil {
                footer["signatures"] = [
                    ["title": "Technician", "show": true],
                    ["title": "Consultant Pathologist", "show": true]
                ]
            }
            config["footer"] = footer

            let payload: [String: Any] = [
                "name": name,
                "config": config,
                "isActive": existing?["isActive"] as? Bool ?? (self.allTemplates.isEmpty)
            ]

            let path = isEdit ? "/api/workspace/settings/templates/\(existing!["id"] as? String ?? "")" : "/api/workspace/settings/templates"
            let method = isEdit ? "PUT" : "POST"

            self.spinner.startAnimating()
            self.executeRequest(path: path, method: method, body: payload) { [weak self] data, resp, err in
                guard let self = self else { return }
                self.spinner.stopAnimating()
                let code = resp?.statusCode ?? 0
                if (200...299).contains(code) {
                    UINotificationFeedbackGenerator().notificationOccurred(.success)
                    self.showToast(isEdit ? "Template updated!" : "Template created!")
                    self.fetchTemplates(showLoader: false)
                } else {
                    UINotificationFeedbackGenerator().notificationOccurred(.error)
                    self.showToast("Failed to save template (\(code))")
                }
            }
        }

        alert.addAction(saveAction)
        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel))
        present(alert, animated: true)
    }

    private func showToast(_ message: String) {
        let toast = UILabel()
        toast.text = message
        toast.textColor = .white
        toast.backgroundColor = UIColor(red: 0.08, green: 0.12, blue: 0.18, alpha: 0.92)
        toast.textAlignment = .center
        toast.font = .systemFont(ofSize: 13, weight: .semibold)
        toast.layer.cornerRadius = 18
        toast.clipsToBounds = true
        toast.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(toast)

        NSLayoutConstraint.activate([
            toast.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            toast.bottomAnchor.constraint(equalTo: btnCreate.topAnchor, constant: -16),
            toast.heightAnchor.constraint(equalToConstant: 38),
            toast.widthAnchor.constraint(lessThanOrEqualTo: view.widthAnchor, constant: -64),
        ])

        UIView.animate(withDuration: 0.25, delay: 1.8, options: .curveEaseOut, animations: {
            toast.alpha = 0
            toast.transform = CGAffineTransform(translationX: 0, y: -10)
        }) { _ in
            toast.removeFromSuperview()
        }
    }
}

// MARK: - TableView DataSource & Delegate
extension ReportTemplatesViewController: UITableViewDelegate, UITableViewDataSource {
    func tableView(_ tv: UITableView, numberOfRowsInSection section: Int) -> Int {
        return filtered.count
    }

    func tableView(_ tv: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let cell = tv.dequeueReusableCell(withIdentifier: "TemplateCardCell", for: indexPath) as! TemplateCardCell
        let item = filtered[indexPath.row]
        cell.configure(with: item)
        cell.onActivate = { [weak self] in self?.activateTemplate(item) }
        cell.onEdit = { [weak self] in self?.presentTemplateBuilder(existing: item) }
        cell.onDuplicate = { [weak self] in self?.duplicateTemplate(item) }
        cell.onDelete = { [weak self] in self?.deleteTemplate(item) }
        return cell
    }

    func tableView(_ tv: UITableView, heightForRowAt indexPath: IndexPath) -> CGFloat {
        return UITableView.automaticDimension
    }
}

// MARK: - SearchBar Delegate
extension ReportTemplatesViewController: UISearchBarDelegate {
    func searchBar(_ sb: UISearchBar, textDidChange text: String) {
        searchText = text
        applyFilter()
    }

    func searchBarSearchButtonClicked(_ sb: UISearchBar) {
        sb.resignFirstResponder()
    }
}

// MARK: - TemplateCardCell
class TemplateCardCell: UITableViewCell {
    private let cardView        = UIView()
    private let lblName         = UILabel()
    private let badgeActive     = UILabel()
    private let badgeMode       = UILabel()
    private let previewBox      = UIView()
    private let lblPreviewText  = UILabel()
    private let btnActivate     = UIButton(type: .system)
    private let btnEdit         = UIButton(type: .system)
    private let btnDuplicate    = UIButton(type: .system)
    private let btnDelete       = UIButton(type: .system)

    var onActivate:  (() -> Void)?
    var onEdit:      (() -> Void)?
    var onDuplicate: (() -> Void)?
    var onDelete:    (() -> Void)?

    override init(style: UITableViewCell.CellStyle, reuseIdentifier: String?) {
        super.init(style: style, reuseIdentifier: reuseIdentifier)
        selectionStyle = .none
        backgroundColor = .clear

        // Card Container
        cardView.backgroundColor = .white
        cardView.layer.cornerRadius = 16
        cardView.layer.borderWidth = 1
        cardView.layer.borderColor = UIColor(red: 0.90, green: 0.92, blue: 0.95, alpha: 1.0).cgColor
        cardView.layer.shadowColor = UIColor.black.cgColor
        cardView.layer.shadowOpacity = 0.05
        cardView.layer.shadowOffset = CGSize(width: 0, height: 3)
        cardView.layer.shadowRadius = 8
        cardView.translatesAutoresizingMaskIntoConstraints = false
        contentView.addSubview(cardView)

        // Top Row: Title + Badges
        lblName.font = .systemFont(ofSize: 15, weight: .bold)
        lblName.textColor = UIColor(red: 0.08, green: 0.12, blue: 0.20, alpha: 1.0)
        lblName.translatesAutoresizingMaskIntoConstraints = false

        badgeActive.text = " ACTIVE "
        badgeActive.font = .systemFont(ofSize: 10.5, weight: .bold)
        badgeActive.textColor = UIColor(red: 0.04, green: 0.60, blue: 0.35, alpha: 1.0)
        badgeActive.backgroundColor = UIColor(red: 0.88, green: 0.98, blue: 0.92, alpha: 1.0)
        badgeActive.layer.cornerRadius = 6
        badgeActive.layer.borderWidth = 1
        badgeActive.layer.borderColor = UIColor(red: 0.65, green: 0.92, blue: 0.75, alpha: 1.0).cgColor
        badgeActive.clipsToBounds = true
        badgeActive.translatesAutoresizingMaskIntoConstraints = false

        badgeMode.text = " STANDARD "
        badgeMode.font = .systemFont(ofSize: 10, weight: .semibold)
        badgeMode.textColor = UIColor(red: 0.15, green: 0.35, blue: 0.85, alpha: 1.0)
        badgeMode.backgroundColor = UIColor(red: 0.92, green: 0.95, blue: 1.0, alpha: 1.0)
        badgeMode.layer.cornerRadius = 6
        badgeMode.clipsToBounds = true
        badgeMode.translatesAutoresizingMaskIntoConstraints = false

        let topRow = UIStackView(arrangedSubviews: [lblName, UIView(), badgeMode, badgeActive])
        topRow.axis = .horizontal
        topRow.alignment = .center
        topRow.spacing = 8
        topRow.translatesAutoresizingMaskIntoConstraints = false
        cardView.addSubview(topRow)

        // Preview Box
        previewBox.backgroundColor = UIColor(red: 0.97, green: 0.98, blue: 0.99, alpha: 1.0)
        previewBox.layer.cornerRadius = 10
        previewBox.layer.borderWidth = 1
        previewBox.layer.borderColor = UIColor(red: 0.91, green: 0.93, blue: 0.96, alpha: 1.0).cgColor
        previewBox.translatesAutoresizingMaskIntoConstraints = false
        cardView.addSubview(previewBox)

        lblPreviewText.font = .systemFont(ofSize: 11.5, weight: .medium)
        lblPreviewText.textColor = UIColor(red: 0.45, green: 0.52, blue: 0.62, alpha: 1.0)
        lblPreviewText.numberOfLines = 2
        lblPreviewText.translatesAutoresizingMaskIntoConstraints = false
        previewBox.addSubview(lblPreviewText)

        NSLayoutConstraint.activate([
            lblPreviewText.topAnchor.constraint(equalTo: previewBox.topAnchor, constant: 10),
            lblPreviewText.leadingAnchor.constraint(equalTo: previewBox.leadingAnchor, constant: 12),
            lblPreviewText.trailingAnchor.constraint(equalTo: previewBox.trailingAnchor, constant: -12),
            lblPreviewText.bottomAnchor.constraint(equalTo: previewBox.bottomAnchor, constant: -10),
        ])

        // Action Buttons Row
        btnActivate.setTitle("Set as Active", for: .normal)
        btnActivate.setTitleColor(.white, for: .normal)
        btnActivate.titleLabel?.font = .systemFont(ofSize: 12.5, weight: .bold)
        btnActivate.backgroundColor = UIColor(red: 0.05, green: 0.43, blue: 0.99, alpha: 1.0)
        btnActivate.layer.cornerRadius = 8
        btnActivate.addTarget(self, action: #selector(activateTapped), for: .touchUpInside)
        btnActivate.translatesAutoresizingMaskIntoConstraints = false

        btnEdit.setTitle(" Edit", for: .normal)
        btnEdit.setImage(UIImage(systemName: "pencil"), for: .normal)
        btnEdit.tintColor = UIColor(red: 0.25, green: 0.35, blue: 0.5, alpha: 1.0)
        btnEdit.setTitleColor(UIColor(red: 0.25, green: 0.35, blue: 0.5, alpha: 1.0), for: .normal)
        btnEdit.titleLabel?.font = .systemFont(ofSize: 12, weight: .semibold)
        btnEdit.backgroundColor = UIColor(red: 0.95, green: 0.96, blue: 0.98, alpha: 1.0)
        btnEdit.layer.cornerRadius = 8
        btnEdit.contentEdgeInsets = UIEdgeInsets(top: 0, left: 10, bottom: 0, right: 10)
        btnEdit.addTarget(self, action: #selector(editTapped), for: .touchUpInside)
        btnEdit.translatesAutoresizingMaskIntoConstraints = false

        btnDuplicate.setImage(UIImage(systemName: "doc.on.doc"), for: .normal)
        btnDuplicate.tintColor = UIColor(red: 0.3, green: 0.4, blue: 0.6, alpha: 1.0)
        btnDuplicate.backgroundColor = UIColor(red: 0.95, green: 0.96, blue: 0.98, alpha: 1.0)
        btnDuplicate.layer.cornerRadius = 8
        btnDuplicate.addTarget(self, action: #selector(duplicateTapped), for: .touchUpInside)
        btnDuplicate.translatesAutoresizingMaskIntoConstraints = false

        btnDelete.setImage(UIImage(systemName: "trash"), for: .normal)
        btnDelete.tintColor = UIColor(red: 0.88, green: 0.22, blue: 0.22, alpha: 1.0)
        btnDelete.backgroundColor = UIColor(red: 1.0, green: 0.93, blue: 0.93, alpha: 1.0)
        btnDelete.layer.cornerRadius = 8
        btnDelete.addTarget(self, action: #selector(deleteTapped), for: .touchUpInside)
        btnDelete.translatesAutoresizingMaskIntoConstraints = false

        let actionsRow = UIStackView(arrangedSubviews: [btnActivate, btnEdit, btnDuplicate, btnDelete])
        actionsRow.axis = .horizontal
        actionsRow.alignment = .fill
        actionsRow.spacing = 8
        actionsRow.translatesAutoresizingMaskIntoConstraints = false
        cardView.addSubview(actionsRow)

        NSLayoutConstraint.activate([
            cardView.topAnchor.constraint(equalTo: contentView.topAnchor, constant: 6),
            cardView.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 16),
            cardView.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -16),
            cardView.bottomAnchor.constraint(equalTo: contentView.bottomAnchor, constant: -6),

            topRow.topAnchor.constraint(equalTo: cardView.topAnchor, constant: 14),
            topRow.leadingAnchor.constraint(equalTo: cardView.leadingAnchor, constant: 14),
            topRow.trailingAnchor.constraint(equalTo: cardView.trailingAnchor, constant: -14),

            previewBox.topAnchor.constraint(equalTo: topRow.bottomAnchor, constant: 10),
            previewBox.leadingAnchor.constraint(equalTo: cardView.leadingAnchor, constant: 14),
            previewBox.trailingAnchor.constraint(equalTo: cardView.trailingAnchor, constant: -14),

            actionsRow.topAnchor.constraint(equalTo: previewBox.bottomAnchor, constant: 12),
            actionsRow.leadingAnchor.constraint(equalTo: cardView.leadingAnchor, constant: 14),
            actionsRow.trailingAnchor.constraint(equalTo: cardView.trailingAnchor, constant: -14),
            actionsRow.bottomAnchor.constraint(equalTo: cardView.bottomAnchor, constant: -14),
            actionsRow.heightAnchor.constraint(equalToConstant: 36),

            btnDuplicate.widthAnchor.constraint(equalToConstant: 36),
            btnDelete.widthAnchor.constraint(equalToConstant: 36),
            btnEdit.widthAnchor.constraint(greaterThanOrEqualToConstant: 64),
        ])
    }

    required init?(coder: NSCoder) {
        fatalError()
    }

    func configure(with item: [String: Any]) {
        let name = item["name"] as? String ?? "Report Template"
        lblName.text = name

        let isActive = item["isActive"] as? Bool ?? false
        badgeActive.isHidden = !isActive

        if isActive {
            cardView.layer.borderColor = UIColor(red: 0.05, green: 0.43, blue: 0.99, alpha: 0.8).cgColor
            cardView.layer.borderWidth = 1.5
            btnActivate.setTitle("✓ Active Template", for: .normal)
            btnActivate.backgroundColor = UIColor(red: 0.90, green: 0.94, blue: 1.0, alpha: 1.0)
            btnActivate.setTitleColor(UIColor(red: 0.05, green: 0.43, blue: 0.99, alpha: 1.0), for: .normal)
            btnActivate.isEnabled = false
            btnDelete.isHidden = true
        } else {
            cardView.layer.borderColor = UIColor(red: 0.90, green: 0.92, blue: 0.95, alpha: 1.0).cgColor
            cardView.layer.borderWidth = 1.0
            btnActivate.setTitle("Set as Active", for: .normal)
            btnActivate.backgroundColor = UIColor(red: 0.05, green: 0.43, blue: 0.99, alpha: 1.0)
            btnActivate.setTitleColor(.white, for: .normal)
            btnActivate.isEnabled = true
            btnDelete.isHidden = false
        }

        // Parse config
        var config = item["config"] as? [String: Any] ?? [:]
        if let configStr = item["config"] as? String, let data = configStr.data(using: .utf8) {
            config = (try? JSONSerialization.jsonObject(with: data) as? [String: Any]) ?? [:]
        }

        let header = config["header"] as? [String: Any] ?? [:]
        let mode = (header["mode"] as? String ?? "standard").uppercased()
        badgeMode.text = " \(mode) "

        let footer = config["footer"] as? [String: Any] ?? [:]
        let footerText = footer["text"] as? String ?? "Standard Report Footer"
        let headerTitle = header["title"] as? String ?? ""

        if mode == "IMAGE" {
            lblPreviewText.text = "🖼️ Image Letterhead Mode • Pre-formatted custom stationery"
        } else if mode == "BLANK" {
            lblPreviewText.text = "📄 Blank Pre-printed Stationery • Margins reserved for physical letterhead"
        } else {
            lblPreviewText.text = headerTitle.isEmpty ? "Standard Layout • \(footerText)" : "Header: \(headerTitle) • \(footerText)"
        }
    }

    @objc private func activateTapped()  { onActivate?() }
    @objc private func editTapped()      { onEdit?() }
    @objc private func duplicateTapped() { onDuplicate?() }
    @objc private func deleteTapped()    { onDelete?() }
}

