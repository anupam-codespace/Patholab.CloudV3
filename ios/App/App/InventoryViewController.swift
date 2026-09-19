import UIKit
import WebKit

// MARK: - InventoryViewController
// Full two-way parity with Web module (/workspace/inventory & API /api/workspace/inventory/items & /batches)
// Real-time sync for authenticated lab user:
// - Catalog Items with Unit Mapping & Min Stock Alert
// - Physical Batches with Batch No, Expiry Date, Quantity, Cost & MRP
// - Computed KPIs: Total Catalog, Low Stock, Out of Stock, Total Stock Valuation
// - Actions: Add Catalog Item, Edit Item, Delete Item, Receive Stock (Add Batch), Delete Batch

class InventoryViewController: UIViewController, UITextFieldDelegate, UITableViewDelegate, UITableViewDataSource, UISearchBarDelegate {

    private let baseURL = "https://app.patholab.cloud"

    // ── Hero Header ──
    private let heroHeaderView     = UIView()
    private let heroGradientLayer  = CAGradientLayer()
    private let btnBack            = UIButton(type: .system)
    private let btnRefresh         = UIButton(type: .system)
    private let titleLabel         = UILabel()
    private let subtitleLabel      = UILabel()
    private let btnHeaderReceive   = UIButton(type: .system)

    // ── 4 KPI Bento Cards ──
    private let kpiStack           = UIStackView()
    private let lblTotal           = UILabel()
    private let lblLow             = UILabel()
    private let lblOut             = UILabel()
    private let lblValue           = UILabel()

    // ── Filter Chips ──
    private let filterScrollView   = UIScrollView()
    private let filterStack        = UIStackView()
    private let tabAll             = UIButton(type: .system)
    private let tabLow             = UIButton(type: .system)
    private let tabOut             = UIButton(type: .system)
    private let tabIn              = UIButton(type: .system)

    // ── Search & Table ──
    private let searchBar          = UISearchBar()
    private let tableView          = UITableView(frame: .zero, style: .plain)
    private let refreshControl     = UIRefreshControl()
    private let emptyView          = UIView()
    private let spinner            = UIActivityIndicatorView(style: .medium)

    // ── Floating Action Button ──
    private let fabAddMenu         = UIButton(type: .system)

    // ── Data & State ──
    private var allItems: [[String: Any]] = []
    private var filtered: [[String: Any]] = []
    private var activeTab = "ALL" // ALL, LOW, OUT, IN
    private var searchText = ""

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 0.973, green: 0.980, blue: 0.988, alpha: 1) // #F8FAFC
        setupUI()
        fetchInventory()
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        heroGradientLayer.frame = heroHeaderView.bounds
    }

    // MARK: - UI Setup
    private func setupUI() {
        // 1. Hero Header
        heroHeaderView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(heroHeaderView)
        heroGradientLayer.colors = [
            UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1).cgColor, // #0D6EFD
            UIColor(red: 0.039, green: 0.345, blue: 0.792, alpha: 1).cgColor, // #0A58CA
            UIColor(red: 0.114, green: 0.306, blue: 0.847, alpha: 1).cgColor  // #1D4ED8
        ]
        heroGradientLayer.startPoint = CGPoint(x: 0, y: 0)
        heroGradientLayer.endPoint   = CGPoint(x: 1, y: 1)
        heroHeaderView.layer.insertSublayer(heroGradientLayer, at: 0)
        heroHeaderView.layer.cornerRadius = 24
        heroHeaderView.layer.maskedCorners = [.layerMinXMaxYCorner, .layerMaxXMaxYCorner]
        heroHeaderView.clipsToBounds = true

        btnBack.setImage(UIImage(systemName: "chevron.left"), for: .normal)
        btnBack.tintColor = .white
        btnBack.backgroundColor = UIColor.white.withAlphaComponent(0.20)
        btnBack.layer.borderColor = UIColor.white.withAlphaComponent(0.30).cgColor
        btnBack.layer.borderWidth = 1
        btnBack.layer.cornerRadius = 19
        btnBack.addTarget(self, action: #selector(backTapped), for: .touchUpInside)
        btnBack.translatesAutoresizingMaskIntoConstraints = false
        heroHeaderView.addSubview(btnBack)

        titleLabel.text = "Inventory & Stock"
        titleLabel.font = .systemFont(ofSize: 20, weight: .bold)
        titleLabel.textColor = .white
        titleLabel.translatesAutoresizingMaskIntoConstraints = false
        heroHeaderView.addSubview(titleLabel)

        subtitleLabel.text = "Live stock batches & catalog management"
        subtitleLabel.font = .systemFont(ofSize: 11.5, weight: .medium)
        subtitleLabel.textColor = UIColor(red: 0.780, green: 0.875, blue: 1.0, alpha: 1)
        subtitleLabel.translatesAutoresizingMaskIntoConstraints = false
        heroHeaderView.addSubview(subtitleLabel)

        btnRefresh.setImage(UIImage(systemName: "arrow.clockwise"), for: .normal)
        btnRefresh.tintColor = .white
        btnRefresh.backgroundColor = UIColor.white.withAlphaComponent(0.20)
        btnRefresh.layer.borderColor = UIColor.white.withAlphaComponent(0.30).cgColor
        btnRefresh.layer.borderWidth = 1
        btnRefresh.layer.cornerRadius = 19
        btnRefresh.addTarget(self, action: #selector(refreshTapped), for: .touchUpInside)
        btnRefresh.translatesAutoresizingMaskIntoConstraints = false
        heroHeaderView.addSubview(btnRefresh)

        btnHeaderReceive.setTitle("+ Receive", for: .normal)
        btnHeaderReceive.titleLabel?.font = .systemFont(ofSize: 12, weight: .bold)
        btnHeaderReceive.setTitleColor(UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1), for: .normal)
        btnHeaderReceive.backgroundColor = .white
        btnHeaderReceive.layer.cornerRadius = 14
        btnHeaderReceive.contentEdgeInsets = UIEdgeInsets(top: 6, left: 12, bottom: 6, right: 12)
        btnHeaderReceive.addTarget(self, action: #selector(receiveStockTapped), for: .touchUpInside)
        btnHeaderReceive.translatesAutoresizingMaskIntoConstraints = false
        heroHeaderView.addSubview(btnHeaderReceive)

        // 2. KPI Cards
        kpiStack.axis = .horizontal
        kpiStack.spacing = 8
        kpiStack.distribution = .fillEqually
        kpiStack.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(kpiStack)

        let kpiData: [(String, UILabel, UIColor, String)] = [
            ("TOTAL", lblTotal, UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1), "Items"),
            ("LOW", lblLow, UIColor(red: 0.85, green: 0.5, blue: 0.05, alpha: 1), "Reorder"),
            ("OUT", lblOut, UIColor(red: 0.88, green: 0.15, blue: 0.15, alpha: 1), "Empty"),
            ("VALUE", lblValue, UIColor(red: 0.02, green: 0.60, blue: 0.40, alpha: 1), "Asset")
        ]

        for (title, lbl, color, sub) in kpiData {
            let card = UIView()
            card.backgroundColor = .white
            card.layer.cornerRadius = 14
            card.layer.shadowColor = UIColor.black.cgColor
            card.layer.shadowOpacity = 0.05
            card.layer.shadowOffset = CGSize(width: 0, height: 2)
            card.layer.shadowRadius = 6

            lbl.text = "--"
            lbl.font = .systemFont(ofSize: title == "VALUE" ? 14 : 18, weight: .bold)
            lbl.textColor = color
            lbl.textAlignment = .center
            lbl.adjustsFontSizeToFitWidth = true

            let titleLbl = UILabel()
            titleLbl.text = title
            titleLbl.font = .systemFont(ofSize: 9, weight: .bold)
            titleLbl.textColor = UIColor(white: 0.55, alpha: 1)
            titleLbl.textAlignment = .center

            let subLbl = UILabel()
            subLbl.text = sub
            subLbl.font = .systemFont(ofSize: 8, weight: .medium)
            subLbl.textColor = UIColor(white: 0.65, alpha: 1)
            subLbl.textAlignment = .center

            let vs = UIStackView(arrangedSubviews: [lbl, titleLbl, subLbl])
            vs.axis = .vertical
            vs.spacing = 1
            vs.alignment = .center
            vs.translatesAutoresizingMaskIntoConstraints = false
            card.addSubview(vs)

            NSLayoutConstraint.activate([
                vs.centerXAnchor.constraint(equalTo: card.centerXAnchor),
                vs.centerYAnchor.constraint(equalTo: card.centerYAnchor),
                vs.leadingAnchor.constraint(greaterThanOrEqualTo: card.leadingAnchor, constant: 4),
                vs.trailingAnchor.constraint(lessThanOrEqualTo: card.trailingAnchor, constant: -4)
            ])
            kpiStack.addArrangedSubview(card)
        }

        // 3. Filter Chips
        filterScrollView.showsHorizontalScrollIndicator = false
        filterScrollView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(filterScrollView)

        filterStack.axis = .horizontal
        filterStack.spacing = 8
        filterStack.translatesAutoresizingMaskIntoConstraints = false
        filterScrollView.addSubview(filterStack)

        let chipDefs: [(UIButton, String, String)] = [
            (tabAll, "All Items", "ALL"),
            (tabLow, "Low Stock", "LOW"),
            (tabOut, "Out of Stock", "OUT"),
            (tabIn, "In Stock", "IN")
        ]
        for (btn, title, key) in chipDefs {
            btn.setTitle(title, for: .normal)
            btn.titleLabel?.font = .systemFont(ofSize: 12.5, weight: .bold)
            btn.layer.cornerRadius = 14
            btn.contentEdgeInsets = UIEdgeInsets(top: 6, left: 14, bottom: 6, right: 14)
            btn.accessibilityIdentifier = key
            btn.addTarget(self, action: #selector(chipTapped(_:)), for: .touchUpInside)
            filterStack.addArrangedSubview(btn)
        }
        updateTabUI()

        // 4. Search Bar
        searchBar.placeholder = "Search items by name, SKU, or category..."
        searchBar.backgroundImage = UIImage()
        searchBar.backgroundColor = .clear
        searchBar.delegate = self
        searchBar.searchTextField.backgroundColor = .white
        searchBar.searchTextField.layer.cornerRadius = 12
        searchBar.searchTextField.layer.masksToBounds = true
        searchBar.searchTextField.font = .systemFont(ofSize: 13.5)
        searchBar.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(searchBar)

        // 5. TableView
        tableView.backgroundColor = .clear
        tableView.separatorStyle = .none
        tableView.delegate = self
        tableView.dataSource = self
        tableView.register(InventoryItemCell.self, forCellReuseIdentifier: "InvCell")
        tableView.refreshControl = refreshControl
        refreshControl.addTarget(self, action: #selector(refreshTapped), for: .valueChanged)
        tableView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(tableView)

        // 6. Empty View
        emptyView.isHidden = true
        emptyView.translatesAutoresizingMaskIntoConstraints = false
        let ei = UIImageView(image: UIImage(systemName: "shippingbox.fill"))
        ei.tintColor = UIColor.systemBlue.withAlphaComponent(0.35)
        ei.contentMode = .scaleAspectFit
        ei.translatesAutoresizingMaskIntoConstraints = false

        let el = UILabel()
        el.text = "No Inventory Items Found"
        el.font = .systemFont(ofSize: 16, weight: .bold)
        el.textColor = UIColor(red: 0.15, green: 0.2, blue: 0.3, alpha: 1)
        el.translatesAutoresizingMaskIntoConstraints = false

        let es = UILabel()
        es.text = "Define catalog items or receive physical stock batches to start tracking."
        es.font = .systemFont(ofSize: 12.5, weight: .regular)
        es.textColor = UIColor(white: 0.5, alpha: 1)
        es.textAlignment = .center
        es.numberOfLines = 2
        es.translatesAutoresizingMaskIntoConstraints = false

        let eb = UIButton(type: .system)
        eb.setTitle("+ Add Catalog Item", for: .normal)
        eb.titleLabel?.font = .systemFont(ofSize: 13.5, weight: .bold)
        eb.backgroundColor = UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1)
        eb.setTitleColor(.white, for: .normal)
        eb.layer.cornerRadius = 14
        eb.contentEdgeInsets = UIEdgeInsets(top: 8, left: 16, bottom: 8, right: 16)
        eb.addTarget(self, action: #selector(addCatalogItemTapped), for: .touchUpInside)
        eb.translatesAutoresizingMaskIntoConstraints = false

        [ei, el, es, eb].forEach { emptyView.addSubview($0) }
        view.addSubview(emptyView)

        // 7. Floating Action Button
        fabAddMenu.setTitle("  + Add Item", for: .normal)
        fabAddMenu.setImage(UIImage(systemName: "plus"), for: .normal)
        fabAddMenu.tintColor = .white
        fabAddMenu.backgroundColor = UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1)
        fabAddMenu.setTitleColor(.white, for: .normal)
        fabAddMenu.titleLabel?.font = .systemFont(ofSize: 14, weight: .bold)
        fabAddMenu.layer.cornerRadius = 24
        fabAddMenu.layer.shadowColor = UIColor.black.cgColor
        fabAddMenu.layer.shadowOpacity = 0.25
        fabAddMenu.layer.shadowOffset = CGSize(width: 0, height: 4)
        fabAddMenu.layer.shadowRadius = 8
        fabAddMenu.contentEdgeInsets = UIEdgeInsets(top: 12, left: 20, bottom: 12, right: 20)
        fabAddMenu.addTarget(self, action: #selector(fabTapped), for: .touchUpInside)
        fabAddMenu.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(fabAddMenu)

        spinner.color = UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1)
        spinner.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(spinner)

        // Layout Constraints
        NSLayoutConstraint.activate([
            heroHeaderView.topAnchor.constraint(equalTo: view.topAnchor),
            heroHeaderView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            heroHeaderView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            heroHeaderView.bottomAnchor.constraint(equalTo: btnBack.bottomAnchor, constant: 14),

            btnBack.leadingAnchor.constraint(equalTo: heroHeaderView.leadingAnchor, constant: 16),
            btnBack.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 12),
            btnBack.widthAnchor.constraint(equalToConstant: 38),
            btnBack.heightAnchor.constraint(equalToConstant: 38),

            titleLabel.leadingAnchor.constraint(equalTo: btnBack.trailingAnchor, constant: 12),
            titleLabel.topAnchor.constraint(equalTo: btnBack.topAnchor, constant: -2),

            subtitleLabel.leadingAnchor.constraint(equalTo: titleLabel.leadingAnchor),
            subtitleLabel.topAnchor.constraint(equalTo: titleLabel.bottomAnchor, constant: 2),

            btnRefresh.trailingAnchor.constraint(equalTo: heroHeaderView.trailingAnchor, constant: -16),
            btnRefresh.centerYAnchor.constraint(equalTo: btnBack.centerYAnchor),
            btnRefresh.widthAnchor.constraint(equalToConstant: 38),
            btnRefresh.heightAnchor.constraint(equalToConstant: 38),

            btnHeaderReceive.trailingAnchor.constraint(equalTo: btnRefresh.leadingAnchor, constant: -8),
            btnHeaderReceive.centerYAnchor.constraint(equalTo: btnBack.centerYAnchor),
            btnHeaderReceive.heightAnchor.constraint(equalToConstant: 32),

            kpiStack.topAnchor.constraint(equalTo: heroHeaderView.bottomAnchor, constant: 10),
            kpiStack.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 12),
            kpiStack.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -12),
            kpiStack.heightAnchor.constraint(equalToConstant: 68),

            filterScrollView.topAnchor.constraint(equalTo: kpiStack.bottomAnchor, constant: 10),
            filterScrollView.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 12),
            filterScrollView.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -12),
            filterScrollView.heightAnchor.constraint(equalToConstant: 34),

            filterStack.topAnchor.constraint(equalTo: filterScrollView.topAnchor),
            filterStack.leadingAnchor.constraint(equalTo: filterScrollView.leadingAnchor),
            filterStack.trailingAnchor.constraint(equalTo: filterScrollView.trailingAnchor),
            filterStack.bottomAnchor.constraint(equalTo: filterScrollView.bottomAnchor),
            filterStack.heightAnchor.constraint(equalTo: filterScrollView.heightAnchor),

            searchBar.topAnchor.constraint(equalTo: filterScrollView.bottomAnchor, constant: 6),
            searchBar.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 6),
            searchBar.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -6),
            searchBar.heightAnchor.constraint(equalToConstant: 44),

            tableView.topAnchor.constraint(equalTo: searchBar.bottomAnchor, constant: 4),
            tableView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            tableView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            tableView.bottomAnchor.constraint(equalTo: view.bottomAnchor),

            emptyView.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            emptyView.centerYAnchor.constraint(equalTo: tableView.centerYAnchor),
            emptyView.leadingAnchor.constraint(greaterThanOrEqualTo: view.leadingAnchor, constant: 32),
            emptyView.trailingAnchor.constraint(lessThanOrEqualTo: view.trailingAnchor, constant: -32),

            ei.topAnchor.constraint(equalTo: emptyView.topAnchor),
            ei.centerXAnchor.constraint(equalTo: emptyView.centerXAnchor),
            ei.widthAnchor.constraint(equalToConstant: 54),
            ei.heightAnchor.constraint(equalToConstant: 54),

            el.topAnchor.constraint(equalTo: ei.bottomAnchor, constant: 10),
            el.centerXAnchor.constraint(equalTo: emptyView.centerXAnchor),

            es.topAnchor.constraint(equalTo: el.bottomAnchor, constant: 6),
            es.leadingAnchor.constraint(equalTo: emptyView.leadingAnchor),
            es.trailingAnchor.constraint(equalTo: emptyView.trailingAnchor),

            eb.topAnchor.constraint(equalTo: es.bottomAnchor, constant: 14),
            eb.centerXAnchor.constraint(equalTo: emptyView.centerXAnchor),
            eb.bottomAnchor.constraint(equalTo: emptyView.bottomAnchor),

            fabAddMenu.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -18),
            fabAddMenu.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -18),
            fabAddMenu.heightAnchor.constraint(equalToConstant: 48),

            spinner.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            spinner.centerYAnchor.constraint(equalTo: view.centerYAnchor),
        ])
    }

    private func updateTabUI() {
        let chipDefs: [(UIButton, String)] = [
            (tabAll, "ALL"),
            (tabLow, "LOW"),
            (tabOut, "OUT"),
            (tabIn, "IN")
        ]
        for (btn, key) in chipDefs {
            let active = activeTab == key
            btn.backgroundColor = active ? UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1) : .white
            btn.setTitleColor(active ? .white : UIColor(red: 0.4, green: 0.45, blue: 0.55, alpha: 1), for: .normal)
            btn.layer.borderWidth = active ? 0 : 1
            btn.layer.borderColor = UIColor(red: 0.88, green: 0.90, blue: 0.94, alpha: 1).cgColor
        }
    }

    // MARK: - Authentication & Data Fetching
    private func getAuthToken() -> String? {
        if let token = KeychainManager.shared.getToken(), !token.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            return token.trimmingCharacters(in: .whitespacesAndNewlines)
        }
        if let token = UserDefaults.standard.string(forKey: "auth_token"), !token.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            return token.trimmingCharacters(in: .whitespacesAndNewlines)
        }
        if let token = UserDefaults.standard.string(forKey: "token"), !token.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            return token.trimmingCharacters(in: .whitespacesAndNewlines)
        }
        if let cookies = HTTPCookieStorage.shared.cookies {
            for c in cookies {
                if (c.name == "token" || c.name == "auth-token" || c.name == "auth_token") && !c.value.isEmpty {
                    return c.value
                }
            }
        }
        return nil
    }

    private func applyAuthHeaders(to request: inout URLRequest) {
        let token = getAuthToken() ?? ""
        if !token.isEmpty {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            request.setValue("token=\(token); auth-token=\(token); auth_token=\(token)", forHTTPHeaderField: "Cookie")
        }
        request.setValue("application/json", forHTTPHeaderField: "Accept")
    }

    private func fetchInventory() {
        if !refreshControl.isRefreshing {
            spinner.startAnimating()
        }
        guard let url = URL(string: "\(baseURL)/api/workspace/inventory/items") else { return }
        var req = URLRequest(url: url)
        req.httpMethod = "GET"
        applyAuthHeaders(to: &req)
        req.timeoutInterval = 15

        URLSession.shared.dataTask(with: req) { [weak self] data, response, _ in
            DispatchQueue.main.async {
                self?.spinner.stopAnimating()
                self?.refreshControl.endRefreshing()
                guard let self = self, let data = data else {
                    self?.showEmpty()
                    return
                }

                if let items = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]] {
                    self.allItems = items
                    self.computeKpisAndFilter()
                } else if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                          let items = json["items"] as? [[String: Any]] ?? json["data"] as? [[String: Any]] {
                    self.allItems = items
                    self.computeKpisAndFilter()
                } else {
                    self.allItems = []
                    self.computeKpisAndFilter()
                }
            }
        }.resume()
    }

    // MARK: - Computed Stock & KPI Aggregation
    private func computeKpisAndFilter() {
        let totalItems = allItems.count
        var lowCount = 0
        var outCount = 0
        var totalValuation: Double = 0.0

        for item in allItems {
            let batches = item["batches"] as? [[String: Any]] ?? []
            var itemQty = 0.0
            for b in batches {
                let q = (b["currentQuantity"] as? Double) ?? (b["currentQuantity"] as? Int).map(Double.init) ?? 0.0
                itemQty += q
                let cost = (b["costPrice"] as? Double) ?? (b["costPrice"] as? Int).map(Double.init) ?? 0.0
                totalValuation += (q * cost)
            }
            let minStock = (item["minStockLevel"] as? Double) ?? (item["minStockLevel"] as? Int).map(Double.init) ?? 10.0

            if itemQty <= 0 {
                outCount += 1
            } else if itemQty <= minStock {
                lowCount += 1
            }
        }

        lblTotal.text = "\(totalItems)"
        lblLow.text   = "\(lowCount)"
        lblOut.text   = "\(outCount)"

        let fmt = NumberFormatter()
        fmt.numberStyle = .currency
        fmt.currencySymbol = "₹"
        fmt.maximumFractionDigits = 0
        lblValue.text = fmt.string(from: NSNumber(value: totalValuation)) ?? "₹0"

        applyFilter()
    }

    private func applyFilter() {
        filtered = allItems.filter { item in
            let batches = item["batches"] as? [[String: Any]] ?? []
            var totalQty = 0.0
            for b in batches {
                totalQty += (b["currentQuantity"] as? Double) ?? (b["currentQuantity"] as? Int).map(Double.init) ?? 0.0
            }
            let minStock = (item["minStockLevel"] as? Double) ?? (item["minStockLevel"] as? Int).map(Double.init) ?? 10.0

            let tabMatch: Bool
            switch activeTab {
            case "LOW":
                tabMatch = totalQty > 0 && totalQty <= minStock
            case "OUT":
                tabMatch = totalQty <= 0
            case "IN":
                tabMatch = totalQty > minStock
            default:
                tabMatch = true
            }

            if !searchText.isEmpty {
                let name = (item["name"] as? String ?? "").lowercased()
                let sku  = (item["sku"] as? String ?? "").lowercased()
                let cat  = (item["category"] as? String ?? "").lowercased()
                let batchMatch = batches.contains { b in
                    (b["batchNumber"] as? String ?? "").lowercased().contains(searchText)
                }
                return tabMatch && (name.contains(searchText) || sku.contains(searchText) || cat.contains(searchText) || batchMatch)
            }
            return tabMatch
        }

        let empty = filtered.isEmpty
        tableView.isHidden = empty
        emptyView.isHidden = !empty
        tableView.reloadData()
    }

    private func showEmpty() {
        emptyView.isHidden = false
        tableView.isHidden = true
    }

    // MARK: - Actions
    @objc private func backTapped() {
        dismiss(animated: true)
    }

    @objc private func refreshTapped() {
        UIView.animate(withDuration: 0.4) {
            self.btnRefresh.transform = CGAffineTransform(rotationAngle: .pi)
        }
        UIView.animate(withDuration: 0.4, delay: 0.4, options: []) {
            self.btnRefresh.transform = .identity
        }
        fetchInventory()
    }

    @objc private func chipTapped(_ sender: UIButton) {
        guard let key = sender.accessibilityIdentifier else { return }
        activeTab = key
        updateTabUI()
        applyFilter()
    }

    @objc private func fabTapped() {
        let sheet = UIAlertController(title: "Inventory Operations", message: "Select an action to update physical stock or catalog", preferredStyle: .actionSheet)
        sheet.addAction(UIAlertAction(title: "+ Receive Stock (Add Batch)", style: .default) { [weak self] _ in
            self?.showReceiveStockSheet(preselectedItem: nil)
        })
        sheet.addAction(UIAlertAction(title: "+ Add Catalog Item", style: .default) { [weak self] _ in
            self?.showCatalogItemSheet(item: nil)
        })
        sheet.addAction(UIAlertAction(title: "Cancel", style: .cancel))
        if let pop = sheet.popoverPresentationController {
            pop.sourceView = fabAddMenu
            pop.sourceRect = fabAddMenu.bounds
        }
        present(sheet, animated: true)
    }

    @objc private func receiveStockTapped() {
        showReceiveStockSheet(preselectedItem: nil)
    }

    @objc private func addCatalogItemTapped() {
        showCatalogItemSheet(item: nil)
    }

    // MARK: - Receive Stock Modal Sheet (POST /api/workspace/inventory/batches)
    func showReceiveStockSheet(preselectedItem: [String: Any]?) {
        guard !allItems.isEmpty else {
            showToast("Please add at least one catalog item first.")
            showCatalogItemSheet(item: nil)
            return
        }

        let selectedItemId = preselectedItem?["id"] as? String ?? allItems.first?["id"] as? String ?? ""
        let selectedItemName = preselectedItem?["name"] as? String ?? allItems.first?["name"] as? String ?? ""
        let selectedUsageUnit = preselectedItem?["usageUnit"] as? String ?? allItems.first?["usageUnit"] as? String ?? "units"

        let alert = UIAlertController(title: "Receive Stock Batch", message: "Item: \(selectedItemName)\nAdd physical batch to lab inventory.", preferredStyle: .alert)

        alert.addTextField { tf in
            tf.placeholder = "Batch / Lot Number * (e.g. B2026-01)"
            tf.autocapitalizationType = .allCharacters
        }
        alert.addTextField { tf in
            tf.placeholder = "Quantity in \(selectedUsageUnit) *"
            tf.keyboardType = .decimalPad
        }
        alert.addTextField { tf in
            tf.placeholder = "Expiry Date * (YYYY-MM-DD)"
            let future = Calendar.current.date(byAdding: .year, value: 1, to: Date()) ?? Date()
            let f = DateFormatter(); f.dateFormat = "yyyy-MM-dd"
            tf.text = f.string(from: future)
        }
        alert.addTextField { tf in
            tf.placeholder = "Purchase Cost Price (₹, optional)"
            tf.keyboardType = .decimalPad
        }
        alert.addTextField { tf in
            tf.placeholder = "MRP (₹, optional)"
            tf.keyboardType = .decimalPad
        }
        alert.addTextField { tf in
            tf.placeholder = "Storage Location (e.g. Refrigerator / Shelf A)"
        }

        let confirmAction = UIAlertAction(title: "Receive Stock", style: .default) { [weak self] _ in
            guard let self = self else { return }
            let batchNo = alert.textFields?[0].text?.trimmingCharacters(in: .whitespaces) ?? ""
            let qtyStr  = alert.textFields?[1].text?.trimmingCharacters(in: .whitespaces) ?? ""
            let expDate = alert.textFields?[2].text?.trimmingCharacters(in: .whitespaces) ?? ""
            let costStr = alert.textFields?[3].text?.trimmingCharacters(in: .whitespaces) ?? ""
            let mrpStr  = alert.textFields?[4].text?.trimmingCharacters(in: .whitespaces) ?? ""
            let location = alert.textFields?[5].text?.trimmingCharacters(in: .whitespaces) ?? ""

            guard !batchNo.isEmpty else { self.showToast("Batch number is required."); return }
            guard let qty = Double(qtyStr), qty > 0 else { self.showToast("Please enter a valid quantity."); return }
            guard !expDate.isEmpty else { self.showToast("Expiry date is required."); return }

            var payload: [String: Any] = [
                "itemId": selectedItemId,
                "batchNumber": batchNo,
                "quantity": qty,
                "expiryDate": expDate
            ]
            if let cost = Double(costStr) { payload["costPrice"] = cost }
            if let mrp = Double(mrpStr) { payload["mrp"] = mrp }
            if !location.isEmpty { payload["location"] = location }

            self.spinner.startAnimating()
            self.callJSONAPI(endpoint: "\(self.baseURL)/api/workspace/inventory/batches", method: "POST", payload: payload) { success, errMsg in
                self.spinner.stopAnimating()
                if success {
                    self.showToast("Stock received successfully!")
                    self.fetchInventory()
                } else {
                    self.showToast(errMsg ?? "Failed to receive stock.")
                }
            }
        }

        alert.addAction(confirmAction)
        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel))
        present(alert, animated: true)
    }

    // MARK: - Catalog Item Modal Sheet (POST/PUT /api/workspace/inventory/items)
    func showCatalogItemSheet(item: [String: Any]?) {
        let isEdit = item != nil
        let alert = UIAlertController(
            title: isEdit ? "Edit Catalog Item" : "Add Catalog Item",
            message: "Configure reagent or consumable specifications.",
            preferredStyle: .alert
        )

        alert.addTextField { tf in
            tf.placeholder = "Item Name * (e.g. EDTA Vacutainers)"
            tf.text = item?["name"] as? String
            tf.autocapitalizationType = .words
        }
        alert.addTextField { tf in
            tf.placeholder = "SKU / Item Code (optional)"
            tf.text = item?["sku"] as? String
            tf.autocapitalizationType = .allCharacters
        }
        alert.addTextField { tf in
            tf.placeholder = "Category (e.g. Reagents, Hematology)"
            tf.text = item?["category"] as? String
            tf.autocapitalizationType = .words
        }
        alert.addTextField { tf in
            tf.placeholder = "Usage Unit * (e.g. ml, tests, pcs, vials)"
            tf.text = (item?["usageUnit"] as? String) ?? "pcs"
        }
        alert.addTextField { tf in
            tf.placeholder = "Purchase Unit (e.g. Box, Pack, Bottle)"
            tf.text = (item?["purchaseUnit"] as? String) ?? "Box"
        }
        alert.addTextField { tf in
            tf.placeholder = "Min Stock Alert Level (e.g. 10)"
            tf.keyboardType = .numberPad
            let minLvl = (item?["minStockLevel"] as? Double) ?? (item?["minStockLevel"] as? Int).map(Double.init) ?? 10
            tf.text = "\(Int(minLvl))"
        }

        let action = UIAlertAction(title: isEdit ? "Update Item" : "Save Item", style: .default) { [weak self] _ in
            guard let self = self else { return }
            let name = alert.textFields?[0].text?.trimmingCharacters(in: .whitespaces) ?? ""
            let sku  = alert.textFields?[1].text?.trimmingCharacters(in: .whitespaces) ?? ""
            let cat  = alert.textFields?[2].text?.trimmingCharacters(in: .whitespaces) ?? ""
            let usageUnit = alert.textFields?[3].text?.trimmingCharacters(in: .whitespaces) ?? "pcs"
            let purchaseUnit = alert.textFields?[4].text?.trimmingCharacters(in: .whitespaces) ?? "Box"
            let minLevel = Int(alert.textFields?[5].text?.trimmingCharacters(in: .whitespaces) ?? "10") ?? 10

            guard !name.isEmpty else { self.showToast("Item name is required."); return }
            guard !usageUnit.isEmpty else { self.showToast("Usage unit is required."); return }

            var payload: [String: Any] = [
                "name": name,
                "usageUnit": usageUnit,
                "purchaseUnit": purchaseUnit,
                "conversionFactor": 1,
                "minStockLevel": minLevel
            ]
            if !sku.isEmpty { payload["sku"] = sku }
            if !cat.isEmpty { payload["category"] = cat }

            let endpoint = isEdit ? "\(self.baseURL)/api/workspace/inventory/items/\(item!["id"] as? String ?? "")" : "\(self.baseURL)/api/workspace/inventory/items"
            let method = isEdit ? "PUT" : "POST"

            self.spinner.startAnimating()
            self.callJSONAPI(endpoint: endpoint, method: method, payload: payload) { success, errMsg in
                self.spinner.stopAnimating()
                if success {
                    self.showToast(isEdit ? "Item updated!" : "Catalog item added!")
                    self.fetchInventory()
                } else {
                    self.showToast(errMsg ?? "Failed to save item.")
                }
            }
        }

        alert.addAction(action)
        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel))
        present(alert, animated: true)
    }

    // MARK: - View Item Batches Sheet
    func showBatchesSheet(for item: [String: Any]) {
        let name = item["name"] as? String ?? "Item"
        let unit = item["usageUnit"] as? String ?? "units"
        let batches = item["batches"] as? [[String: Any]] ?? []

        let sheet = UIAlertController(title: "Batches: \(name)", message: "Active physical batches for this catalog item:", preferredStyle: .actionSheet)

        if batches.isEmpty {
            sheet.message = "No active batches currently in stock."
        } else {
            for b in batches {
                let bNo = b["batchNumber"] as? String ?? "Batch"
                let qty = (b["currentQuantity"] as? Double) ?? (b["currentQuantity"] as? Int).map(Double.init) ?? 0.0
                let exp = String((b["expiryDate"] as? String ?? "N/A").prefix(10))
                let loc = b["location"] as? String ?? ""
                let locStr = loc.isEmpty ? "" : " | Loc: \(loc)"
                let bId = b["id"] as? String ?? ""

                let actionTitle = "Lot: \(bNo) - \(qty) \(unit) (Exp: \(exp))\(locStr)"
                sheet.addAction(UIAlertAction(title: actionTitle, style: .default) { [weak self] _ in
                    self?.confirmDeleteBatch(batchId: bId, batchNo: bNo)
                })
            }
        }

        sheet.addAction(UIAlertAction(title: "+ Receive New Batch", style: .default) { [weak self] _ in
            self?.showReceiveStockSheet(preselectedItem: item)
        })
        sheet.addAction(UIAlertAction(title: "Dismiss", style: .cancel))
        if let pop = sheet.popoverPresentationController {
            pop.sourceView = view
            pop.sourceRect = CGRect(x: view.bounds.midX, y: view.bounds.midY, width: 0, height: 0)
        }
        present(sheet, animated: true)
    }

    private func confirmDeleteBatch(batchId: String, batchNo: String) {
        let alert = UIAlertController(title: "Delete Batch \(batchNo)?", message: "This will remove this batch and all current stock quantity from your inventory.", preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "Delete Batch", style: .destructive) { [weak self] _ in
            guard let self = self else { return }
            self.spinner.startAnimating()
            self.callJSONAPI(endpoint: "\(self.baseURL)/api/workspace/inventory/batches/\(batchId)", method: "DELETE", payload: [:]) { success, errMsg in
                self.spinner.stopAnimating()
                if success {
                    self.showToast("Batch removed.")
                    self.fetchInventory()
                } else {
                    self.showToast(errMsg ?? "Failed to delete batch.")
                }
            }
        })
        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel))
        present(alert, animated: true)
    }

    func confirmDeleteItem(item: [String: Any]) {
        let name = item["name"] as? String ?? "this item"
        guard let id = item["id"] as? String else { return }

        let alert = UIAlertController(title: "Delete \(name)?", message: "All associated batches and stock history will also be permanently deleted.", preferredStyle: .actionSheet)
        alert.addAction(UIAlertAction(title: "Delete Catalog Item", style: .destructive) { [weak self] _ in
            guard let self = self else { return }
            self.spinner.startAnimating()
            self.callJSONAPI(endpoint: "\(self.baseURL)/api/workspace/inventory/items/\(id)", method: "DELETE", payload: [:]) { success, errMsg in
                self.spinner.stopAnimating()
                if success {
                    self.showToast("Item deleted.")
                    self.fetchInventory()
                } else {
                    self.showToast(errMsg ?? "Failed to delete item.")
                }
            }
        })
        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel))
        if let pop = alert.popoverPresentationController {
            pop.sourceView = view
            pop.sourceRect = CGRect(x: view.bounds.midX, y: view.bounds.midY, width: 0, height: 0)
        }
        present(alert, animated: true)
    }

    // MARK: - API Network Dispatcher
    private func callJSONAPI(endpoint: String, method: String, payload: [String: Any], completion: @escaping (Bool, String?) -> Void) {
        guard let url = URL(string: endpoint) else { completion(false, "Invalid URL"); return }
        var req = URLRequest(url: url)
        req.httpMethod = method
        applyAuthHeaders(to: &req)
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if method != "GET" && method != "DELETE" && !payload.isEmpty {
            req.httpBody = try? JSONSerialization.data(withJSONObject: payload)
        }

        URLSession.shared.dataTask(with: req) { data, resp, error in
            let code = (resp as? HTTPURLResponse)?.statusCode ?? 0
            var errorMsg: String? = nil
            if let data = data, let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
                errorMsg = json["error"] as? String
            }
            DispatchQueue.main.async {
                if code >= 200 && code < 300 {
                    completion(true, nil)
                } else {
                    completion(false, errorMsg ?? "Server error (\(code))")
                }
            }
        }.resume()
    }

    private func showToast(_ msg: String) {
        let t = UILabel()
        t.text = "  \(msg)  "
        t.textColor = .white
        t.backgroundColor = UIColor(red: 0.1, green: 0.15, blue: 0.25, alpha: 0.95)
        t.textAlignment = .center
        t.font = .systemFont(ofSize: 13, weight: .semibold)
        t.layer.cornerRadius = 14
        t.clipsToBounds = true
        t.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(t)
        NSLayoutConstraint.activate([
            t.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            t.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -72),
            t.widthAnchor.constraint(lessThanOrEqualTo: view.widthAnchor, multiplier: 0.88),
            t.heightAnchor.constraint(equalToConstant: 38)
        ])
        UIView.animate(withDuration: 0.3, delay: 2.0, options: [], animations: { t.alpha = 0 }) { _ in t.removeFromSuperview() }
    }
}

// MARK: - TableView Delegate & DataSource
extension InventoryViewController {
    func tableView(_ tv: UITableView, numberOfRowsInSection s: Int) -> Int {
        return filtered.count
    }

    func tableView(_ tv: UITableView, cellForRowAt ip: IndexPath) -> UITableViewCell {
        let cell = tv.dequeueReusableCell(withIdentifier: "InvCell", for: ip) as! InventoryItemCell
        let item = filtered[ip.row]
        cell.configure(with: item)
        cell.onReceiveStock = { [weak self] in self?.showReceiveStockSheet(preselectedItem: item) }
        cell.onViewBatches  = { [weak self] in self?.showBatchesSheet(for: item) }
        cell.onEdit         = { [weak self] in self?.showCatalogItemSheet(item: item) }
        cell.onDelete       = { [weak self] in self?.confirmDeleteItem(item: item) }
        return cell
    }

    func tableView(_ tv: UITableView, heightForRowAt ip: IndexPath) -> CGFloat {
        return UITableView.automaticDimension
    }
}

// MARK: - SearchBar Delegate
extension InventoryViewController {
    func searchBar(_ s: UISearchBar, textDidChange t: String) {
        searchText = t.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        applyFilter()
    }
    func searchBarSearchButtonClicked(_ s: UISearchBar) {
        s.resignFirstResponder()
    }
}

// MARK: - InventoryItemCell
class InventoryItemCell: UITableViewCell {
    private let card           = UIView()
    private let lblName        = UILabel()
    private let lblSku         = UILabel()
    private let lblCategory    = UILabel()
    private let lblStatusBadge = UILabel()

    private let metricsStack   = UIStackView()
    private let lblAvailable   = UILabel()
    private let lblReorder     = UILabel()
    private let lblBatches     = UILabel()
    private let lblExpiry      = UILabel()

    private let btnReceiveStock = UIButton(type: .system)
    private let btnBatches     = UIButton(type: .system)
    private let btnEdit        = UIButton(type: .system)
    private let btnDelete      = UIButton(type: .system)

    var onReceiveStock: (() -> Void)?
    var onViewBatches:  (() -> Void)?
    var onEdit:         (() -> Void)?
    var onDelete:       (() -> Void)?

    override init(style: UITableViewCell.CellStyle, reuseIdentifier: String?) {
        super.init(style: style, reuseIdentifier: reuseIdentifier)
        selectionStyle = .none
        backgroundColor = .clear

        card.backgroundColor = .white
        card.layer.cornerRadius = 16
        card.layer.shadowColor = UIColor.black.cgColor
        card.layer.shadowOpacity = 0.05
        card.layer.shadowOffset = CGSize(width: 0, height: 2)
        card.layer.shadowRadius = 6
        card.translatesAutoresizingMaskIntoConstraints = false
        contentView.addSubview(card)

        // Header Row: Category & Status Badge
        lblCategory.font = .systemFont(ofSize: 11, weight: .bold)
        lblCategory.textColor = UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1)
        lblCategory.backgroundColor = UIColor(red: 0.933, green: 0.957, blue: 1.0, alpha: 1)
        lblCategory.layer.cornerRadius = 6
        lblCategory.clipsToBounds = true

        lblStatusBadge.font = .systemFont(ofSize: 10.5, weight: .bold)
        lblStatusBadge.layer.cornerRadius = 6
        lblStatusBadge.clipsToBounds = true

        let topRow = UIStackView(arrangedSubviews: [lblCategory, UIView(), lblStatusBadge])
        topRow.alignment = .center
        topRow.spacing = 8

        // Title Row: Item Name & SKU
        lblName.font = .systemFont(ofSize: 16, weight: .bold)
        lblName.textColor = UIColor(red: 0.059, green: 0.090, blue: 0.165, alpha: 1)

        lblSku.font = .systemFont(ofSize: 11, weight: .medium)
        lblSku.textColor = UIColor(red: 0.392, green: 0.455, blue: 0.545, alpha: 1)

        // Metrics Grid (2x2 Stack)
        lblAvailable.font = .systemFont(ofSize: 13.5, weight: .bold)
        lblReorder.font = .systemFont(ofSize: 12, weight: .medium)
        lblReorder.textColor = UIColor(red: 0.4, green: 0.45, blue: 0.55, alpha: 1)

        lblBatches.font = .systemFont(ofSize: 12, weight: .medium)
        lblBatches.textColor = UIColor(red: 0.4, green: 0.45, blue: 0.55, alpha: 1)

        lblExpiry.font = .systemFont(ofSize: 11.5, weight: .bold)

        let mRow1 = UIStackView(arrangedSubviews: [lblAvailable, UIView(), lblReorder])
        let mRow2 = UIStackView(arrangedSubviews: [lblBatches, UIView(), lblExpiry])
        metricsStack.axis = .vertical
        metricsStack.spacing = 4
        metricsStack.addArrangedSubview(mRow1)
        metricsStack.addArrangedSubview(mRow2)

        // Action Buttons Row
        btnReceiveStock.setTitle("+ Receive Stock", for: .normal)
        btnReceiveStock.titleLabel?.font = .systemFont(ofSize: 12, weight: .bold)
        btnReceiveStock.setTitleColor(UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1), for: .normal)
        btnReceiveStock.backgroundColor = UIColor(red: 0.933, green: 0.957, blue: 1.0, alpha: 1)
        btnReceiveStock.layer.cornerRadius = 8
        btnReceiveStock.contentEdgeInsets = UIEdgeInsets(top: 6, left: 10, bottom: 6, right: 10)
        btnReceiveStock.addTarget(self, action: #selector(receiveStockTapped), for: .touchUpInside)

        btnBatches.setTitle("Batches", for: .normal)
        btnBatches.titleLabel?.font = .systemFont(ofSize: 12, weight: .semibold)
        btnBatches.setTitleColor(UIColor(red: 0.3, green: 0.35, blue: 0.45, alpha: 1), for: .normal)
        btnBatches.backgroundColor = UIColor(red: 0.96, green: 0.97, blue: 0.98, alpha: 1)
        btnBatches.layer.cornerRadius = 8
        btnBatches.contentEdgeInsets = UIEdgeInsets(top: 6, left: 10, bottom: 6, right: 10)
        btnBatches.addTarget(self, action: #selector(batchesTapped), for: .touchUpInside)

        btnEdit.setImage(UIImage(systemName: "pencil"), for: .normal)
        btnEdit.tintColor = UIColor(red: 0.4, green: 0.45, blue: 0.55, alpha: 1)
        btnEdit.addTarget(self, action: #selector(editTapped), for: .touchUpInside)

        btnDelete.setImage(UIImage(systemName: "trash"), for: .normal)
        btnDelete.tintColor = UIColor(red: 0.88, green: 0.25, blue: 0.25, alpha: 1)
        btnDelete.addTarget(self, action: #selector(deleteTapped), for: .touchUpInside)

        let btnRow = UIStackView(arrangedSubviews: [btnReceiveStock, btnBatches, UIView(), btnEdit, btnDelete])
        btnRow.alignment = .center
        btnRow.spacing = 8

        let mainStack = UIStackView(arrangedSubviews: [topRow, lblName, lblSku, metricsStack, btnRow])
        mainStack.axis = .vertical
        mainStack.spacing = 8
        mainStack.translatesAutoresizingMaskIntoConstraints = false
        card.addSubview(mainStack)

        NSLayoutConstraint.activate([
            card.topAnchor.constraint(equalTo: contentView.topAnchor, constant: 6),
            card.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 14),
            card.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -14),
            card.bottomAnchor.constraint(equalTo: contentView.bottomAnchor, constant: -6),

            mainStack.topAnchor.constraint(equalTo: card.topAnchor, constant: 14),
            mainStack.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 14),
            mainStack.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -14),
            mainStack.bottomAnchor.constraint(equalTo: card.bottomAnchor, constant: -14),

            btnEdit.widthAnchor.constraint(equalToConstant: 30),
            btnEdit.heightAnchor.constraint(equalToConstant: 30),
            btnDelete.widthAnchor.constraint(equalToConstant: 30),
            btnDelete.heightAnchor.constraint(equalToConstant: 30)
        ])
    }

    required init?(coder: NSCoder) { fatalError() }

    func configure(with item: [String: Any]) {
        let name = item["name"] as? String ?? "Item"
        let sku  = item["sku"] as? String ?? ""
        let cat  = item["category"] as? String ?? "General"
        let usageUnit = item["usageUnit"] as? String ?? "units"
        let minLvl = (item["minStockLevel"] as? Double) ?? (item["minStockLevel"] as? Int).map(Double.init) ?? 10.0

        let batches = item["batches"] as? [[String: Any]] ?? []
        var totalQty = 0.0
        var earliestExp: String? = nil

        for b in batches {
            let q = (b["currentQuantity"] as? Double) ?? (b["currentQuantity"] as? Int).map(Double.init) ?? 0.0
            totalQty += q
            if q > 0, let exp = b["expiryDate"] as? String {
                if earliestExp == nil || exp < earliestExp! {
                    earliestExp = exp
                }
            }
        }

        lblName.text = name
        lblCategory.text = "  \(cat.uppercased())  "

        if !sku.isEmpty {
            lblSku.text = "SKU: \(sku)"
            lblSku.isHidden = false
        } else {
            lblSku.isHidden = true
        }

        let qtyFormatted = String(format: totalQty.truncatingRemainder(dividingBy: 1) == 0 ? "%.0f" : "%.1f", totalQty)
        let minFormatted = String(format: minLvl.truncatingRemainder(dividingBy: 1) == 0 ? "%.0f" : "%.1f", minLvl)

        lblAvailable.text = "\(qtyFormatted) \(usageUnit) In Stock"
        lblReorder.text   = "Alert Min: \(minFormatted) \(usageUnit)"
        lblBatches.text   = "\(batches.count) Active \(batches.count == 1 ? "Batch" : "Batches")"

        if let exp = earliestExp {
            let shortExp = String(exp.prefix(10))
            lblExpiry.text = "Exp: \(shortExp)"
            lblExpiry.textColor = UIColor(red: 0.85, green: 0.45, blue: 0.05, alpha: 1)
            lblExpiry.isHidden = false
        } else {
            lblExpiry.isHidden = true
        }

        if totalQty <= 0 {
            lblStatusBadge.text = "  OUT OF STOCK  "
            lblStatusBadge.textColor = UIColor(red: 0.88, green: 0.15, blue: 0.15, alpha: 1)
            lblStatusBadge.backgroundColor = UIColor(red: 0.99, green: 0.92, blue: 0.92, alpha: 1)
            lblAvailable.textColor = UIColor(red: 0.88, green: 0.15, blue: 0.15, alpha: 1)
        } else if totalQty <= minLvl {
            lblStatusBadge.text = "  LOW STOCK  "
            lblStatusBadge.textColor = UIColor(red: 0.85, green: 0.50, blue: 0.05, alpha: 1)
            lblStatusBadge.backgroundColor = UIColor(red: 1.0, green: 0.96, blue: 0.88, alpha: 1)
            lblAvailable.textColor = UIColor(red: 0.85, green: 0.50, blue: 0.05, alpha: 1)
        } else {
            lblStatusBadge.text = "  IN STOCK  "
            lblStatusBadge.textColor = UIColor(red: 0.02, green: 0.60, blue: 0.40, alpha: 1)
            lblStatusBadge.backgroundColor = UIColor(red: 0.92, green: 0.98, blue: 0.94, alpha: 1)
            lblAvailable.textColor = UIColor(red: 0.059, green: 0.090, blue: 0.165, alpha: 1)
        }
    }

    @objc private func receiveStockTapped() { onReceiveStock?() }
    @objc private func batchesTapped()      { onViewBatches?()  }
    @objc private func editTapped()         { onEdit?()         }
    @objc private func deleteTapped()       { onDelete?()       }
}
