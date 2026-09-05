import UIKit
import WebKit

class NotificationsViewController: UIViewController {

    private let titleLabel = UILabel()
    private let spinner = UIActivityIndicatorView(style: .medium)
    private let noNotificationsLabel = UILabel()
    private let scrollView = UIScrollView()
    private let stackView = UIStackView()
    private let btnMarkAllRead = UIButton(type: .system)
    
    var isDarkMode = false
    var lastSeenTime: Double = 0.0
    /// Called when the user marks all notifications as read, so the caller can instantly clear the badge/animation.
    var onAllRead: (() -> Void)?

    override func viewDidLoad() {
        super.viewDidLoad()

        if isDarkMode {
            view.backgroundColor = UIColor(red: 15/255, green: 23/255, blue: 42/255, alpha: 1) // slate-900 (#0F172A)
            titleLabel.textColor = .white
            noNotificationsLabel.textColor = UIColor(red: 148/255, green: 163/255, blue: 184/255, alpha: 1) // slate-400
        } else {
            view.backgroundColor = .white
            titleLabel.textColor = UIColor(red: 15/255, green: 23/255, blue: 42/255, alpha: 1)
            noNotificationsLabel.textColor = UIColor(red: 148/255, green: 163/255, blue: 184/255, alpha: 1) // slate-400
        }

        setupLayout()

        // Fetch REAL notifications from the server using the WebView's session cookies
        fetchRealNotifications()
    }

    private func setupLayout() {
        // Drag handle indicator at the top
        let handle = UIView()
        handle.backgroundColor = UIColor(white: 0.82, alpha: 1)
        handle.layer.cornerRadius = 2.5
        handle.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(handle)

        // Title
        titleLabel.text = "NOTIFICATIONS"
        titleLabel.font = .systemFont(ofSize: 15, weight: .bold)
        if !isDarkMode {
            titleLabel.textColor = UIColor(red: 15/255, green: 23/255, blue: 42/255, alpha: 1)
        }
        titleLabel.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(titleLabel)

        // Spinner
        spinner.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(spinner)

        // No Notifications Label
        noNotificationsLabel.text = "No new notifications"
        noNotificationsLabel.font = .systemFont(ofSize: 13, weight: .bold)
        noNotificationsLabel.textColor = UIColor(red: 148/255, green: 163/255, blue: 184/255, alpha: 1)
        noNotificationsLabel.textAlignment = .center
        noNotificationsLabel.isHidden = true
        noNotificationsLabel.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(noNotificationsLabel)

        // Scroll view & stack view
        scrollView.isHidden = true
        scrollView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(scrollView)

        stackView.axis = .vertical
        stackView.alignment = .fill
        stackView.distribution = .fill
        stackView.spacing = 0
        stackView.translatesAutoresizingMaskIntoConstraints = false
        scrollView.addSubview(stackView)

        // Mark All As Read button
        btnMarkAllRead.setTitle("Mark All as Read", for: .normal)
        btnMarkAllRead.setTitleColor(UIColor(red: 59/255, green: 130/255, blue: 246/255, alpha: 1), for: .normal)
        btnMarkAllRead.titleLabel?.font = .systemFont(ofSize: 13, weight: .bold)
        btnMarkAllRead.translatesAutoresizingMaskIntoConstraints = false
        btnMarkAllRead.addTarget(self, action: #selector(markAllReadTapped), for: .touchUpInside)
        view.addSubview(btnMarkAllRead)

        NSLayoutConstraint.activate([
            handle.topAnchor.constraint(equalTo: view.topAnchor, constant: 8),
            handle.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            handle.widthAnchor.constraint(equalToConstant: 40),
            handle.heightAnchor.constraint(equalToConstant: 5),

            titleLabel.topAnchor.constraint(equalTo: handle.bottomAnchor, constant: 16),
            titleLabel.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 20),
            titleLabel.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -20),

            spinner.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            spinner.centerYAnchor.constraint(equalTo: view.centerYAnchor),

            noNotificationsLabel.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            noNotificationsLabel.centerYAnchor.constraint(equalTo: view.centerYAnchor),

            scrollView.topAnchor.constraint(equalTo: titleLabel.bottomAnchor, constant: 12),
            scrollView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            scrollView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            scrollView.bottomAnchor.constraint(equalTo: btnMarkAllRead.topAnchor, constant: -12),

            stackView.topAnchor.constraint(equalTo: scrollView.topAnchor),
            stackView.bottomAnchor.constraint(equalTo: scrollView.bottomAnchor),
            stackView.leadingAnchor.constraint(equalTo: scrollView.leadingAnchor),
            stackView.trailingAnchor.constraint(equalTo: scrollView.trailingAnchor),
            stackView.widthAnchor.constraint(equalTo: scrollView.widthAnchor),

            btnMarkAllRead.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -12),
            btnMarkAllRead.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            btnMarkAllRead.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            btnMarkAllRead.heightAnchor.constraint(equalToConstant: 36)
        ])
    }

    private func fetchRealNotifications() {
        spinner.startAnimating()

        // Use shared WKWebsiteDataStore cookies so the auth session is forwarded
        let baseURL = "https://app.patholab.cloud"
        guard let url = URL(string: "\(baseURL)/api/notifications") else { return }

        let store = WKWebsiteDataStore.default()
        store.httpCookieStore.getAllCookies { cookies in
            var request = URLRequest(url: url, timeoutInterval: 10)
            request.httpMethod = "GET"
            request.setValue("application/json", forHTTPHeaderField: "Accept")

            // Build Cookie header from WKWebView's cookie store
            let cookieHeader = cookies
                .filter { $0.domain.contains("patholab.cloud") }
                .map { "\($0.name)=\($0.value)" }
                .joined(separator: "; ")
            if !cookieHeader.isEmpty {
                request.setValue(cookieHeader, forHTTPHeaderField: "Cookie")
            }

            URLSession.shared.dataTask(with: request) { [weak self] data, _, _ in
                DispatchQueue.main.async {
                    guard let self = self else { return }
                    self.spinner.stopAnimating()
                    self.spinner.isHidden = true

                    if let data = data,
                       let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                       let notifications = json["notifications"] as? [[String: Any]],
                       !notifications.isEmpty {
                        self.scrollView.isHidden = false
                        self.populateNotifications(from: notifications)
                    } else {
                        self.noNotificationsLabel.isHidden = false
                    }
                }
            }.resume()
        }
    }

    private func populateNotifications(from notifications: [[String: Any]]) {
        stackView.arrangedSubviews.forEach { $0.removeFromSuperview() }

        for n in notifications {
            let title = n["title"] as? String ?? ""
            let body = n["body"] as? String ?? ""
            let createdAt = n["createdAt"] as? String ?? n["date"] as? String ?? n["timestamp"] as? String ?? ""
            var isRead = n["isRead"] as? Bool ?? true
            if !createdAt.isEmpty {
                let createdTime = parseIsoDateTime(createdAt)
                if createdTime > lastSeenTime {
                    isRead = false
                }
            }

            let row = UIView()
            row.translatesAutoresizingMaskIntoConstraints = false
            if isDarkMode {
                row.backgroundColor = isRead ? UIColor(red: 30/255, green: 41/255, blue: 59/255, alpha: 1) : UIColor(red: 30/255, green: 58/255, blue: 138/255, alpha: 1) // slate-800 or dark blue
            } else {
                row.backgroundColor = isRead ? .white : UIColor(red: 239/255, green: 246/255, blue: 255/255, alpha: 1) // Blue-50
            }

            let titleLabel = UILabel()
            titleLabel.text = HomeNativeView.stripEmailFromString(title)
            titleLabel.numberOfLines = 0
            titleLabel.font = isRead
                ? .systemFont(ofSize: 13.5)
                : .boldSystemFont(ofSize: 13.5)
            if isDarkMode {
                titleLabel.textColor = isRead
                    ? UIColor(red: 226/255, green: 232/255, blue: 240/255, alpha: 1) // slate-200
                    : UIColor(red: 147/255, green: 197/255, blue: 253/255, alpha: 1) // blue-300
            } else {
                titleLabel.textColor = isRead
                    ? UIColor(red: 71/255, green: 85/255, blue: 105/255, alpha: 1)  // slate-600
                    : UIColor(red: 30/255, green: 64/255, blue: 175/255, alpha: 1)  // blue-800
            }
            titleLabel.translatesAutoresizingMaskIntoConstraints = false
            row.addSubview(titleLabel)

            // Timestamp parsing
            var displayTime = ""
            if !createdAt.isEmpty {
                let isoFormatter = ISO8601DateFormatter()
                isoFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
                if let date = isoFormatter.date(from: createdAt) {
                    let prettyFormatter = DateFormatter()
                    prettyFormatter.dateFormat = "dd MMM yyyy, hh:mm a"
                    prettyFormatter.locale = Locale(identifier: "en_US")
                    displayTime = prettyFormatter.string(from: date)
                } else {
                    let isoFormatter2 = ISO8601DateFormatter()
                    if let date = isoFormatter2.date(from: createdAt) {
                        let prettyFormatter = DateFormatter()
                        prettyFormatter.dateFormat = "dd MMM yyyy, hh:mm a"
                        prettyFormatter.locale = Locale(identifier: "en_US")
                        displayTime = prettyFormatter.string(from: date)
                    } else {
                        displayTime = createdAt
                    }
                }
            }

            let timeLabel = UILabel()
            timeLabel.text = displayTime
            timeLabel.font = .systemFont(ofSize: 10.5)
            timeLabel.textColor = isDarkMode
                ? UIColor(red: 100/255, green: 116/255, blue: 139/255, alpha: 1) // slate-500
                : UIColor(red: 148/255, green: 163/255, blue: 184/255, alpha: 1) // slate-400
            timeLabel.translatesAutoresizingMaskIntoConstraints = false
            row.addSubview(timeLabel)

            let constraints: [NSLayoutConstraint]
            if !body.isEmpty {
                let bodyLabel = UILabel()
                bodyLabel.text = HomeNativeView.stripEmailFromString(body)
                bodyLabel.numberOfLines = 0
                bodyLabel.font = .systemFont(ofSize: 11.5)
                bodyLabel.textColor = isDarkMode
                    ? UIColor(red: 148/255, green: 163/255, blue: 184/255, alpha: 1) // slate-400
                    : UIColor(red: 148/255, green: 163/255, blue: 184/255, alpha: 1)
                bodyLabel.translatesAutoresizingMaskIntoConstraints = false
                row.addSubview(bodyLabel)

                constraints = [
                    titleLabel.topAnchor.constraint(equalTo: row.topAnchor, constant: 16),
                    titleLabel.leadingAnchor.constraint(equalTo: row.leadingAnchor, constant: 20),
                    titleLabel.trailingAnchor.constraint(equalTo: row.trailingAnchor, constant: -20),
                    
                    bodyLabel.topAnchor.constraint(equalTo: titleLabel.bottomAnchor, constant: 4),
                    bodyLabel.leadingAnchor.constraint(equalTo: row.leadingAnchor, constant: 20),
                    bodyLabel.trailingAnchor.constraint(equalTo: row.trailingAnchor, constant: -20),
                    
                    timeLabel.topAnchor.constraint(equalTo: bodyLabel.bottomAnchor, constant: 6),
                    timeLabel.leadingAnchor.constraint(equalTo: row.leadingAnchor, constant: 20),
                    timeLabel.trailingAnchor.constraint(equalTo: row.trailingAnchor, constant: -20),
                    timeLabel.bottomAnchor.constraint(equalTo: row.bottomAnchor, constant: -16)
                ]
            } else {
                constraints = [
                    titleLabel.topAnchor.constraint(equalTo: row.topAnchor, constant: 16),
                    titleLabel.leadingAnchor.constraint(equalTo: row.leadingAnchor, constant: 20),
                    titleLabel.trailingAnchor.constraint(equalTo: row.trailingAnchor, constant: -20),
                    
                    timeLabel.topAnchor.constraint(equalTo: titleLabel.bottomAnchor, constant: 6),
                    timeLabel.leadingAnchor.constraint(equalTo: row.leadingAnchor, constant: 20),
                    timeLabel.trailingAnchor.constraint(equalTo: row.trailingAnchor, constant: -20),
                    timeLabel.bottomAnchor.constraint(equalTo: row.bottomAnchor, constant: -16)
                ]
            }
            NSLayoutConstraint.activate(constraints)

            let border = UIView()
            border.backgroundColor = isDarkMode ? UIColor(red: 51/255, green: 65/255, blue: 85/255, alpha: 1) : UIColor(white: 0.94, alpha: 1)
            border.translatesAutoresizingMaskIntoConstraints = false
            row.addSubview(border)
            NSLayoutConstraint.activate([
                border.bottomAnchor.constraint(equalTo: row.bottomAnchor),
                border.leadingAnchor.constraint(equalTo: row.leadingAnchor, constant: 20),
                border.trailingAnchor.constraint(equalTo: row.trailingAnchor, constant: -20),
                border.heightAnchor.constraint(equalToConstant: 0.5)
            ])

            stackView.addArrangedSubview(row)
        }
    }

    @objc private func markAllReadTapped() {
        // Call mark-read API in background
        let baseURL = "https://app.patholab.cloud"
        if let url = URL(string: "\(baseURL)/api/notifications/mark-read") {
            WKWebsiteDataStore.default().httpCookieStore.getAllCookies { cookies in
                var request = URLRequest(url: url)
                request.httpMethod = "POST"
                let cookieHeader = cookies
                    .filter { $0.domain.contains("patholab.cloud") }
                    .map { "\($0.name)=\($0.value)" }
                    .joined(separator: "; ")
                if !cookieHeader.isEmpty {
                    request.setValue(cookieHeader, forHTTPHeaderField: "Cookie")
                }
                URLSession.shared.dataTask(with: request).resume()
            }
        }

        stackView.arrangedSubviews.forEach { $0.removeFromSuperview() }
        scrollView.isHidden = true
        noNotificationsLabel.isHidden = false

        // Notify the parent immediately so badge and bell animation clear right away
        onAllRead?()
    }

    private func parseIsoDateTime(_ isoString: String) -> Double {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = formatter.date(from: isoString) {
            return date.timeIntervalSince1970
        }
        
        let formatter2 = ISO8601DateFormatter()
        formatter2.formatOptions = [.withInternetDateTime]
        if let date = formatter2.date(from: isoString) {
            return date.timeIntervalSince1970
        }
        return 0
    }
}
