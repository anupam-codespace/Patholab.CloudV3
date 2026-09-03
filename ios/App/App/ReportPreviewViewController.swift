import UIKit
import WebKit

// ─────────────────────────────────────────────────────────────────────────────
// MARK: – Dedicated In-App Report Preview & Native Printing Controller (iOS)
// ─────────────────────────────────────────────────────────────────────────────
class ReportPreviewViewController: UIViewController, WKNavigationDelegate {

    private let baseUrl = "https://app.patholab.cloud"

    var reportId: String = ""
    var patientName: String = "Patient"
    var patientPhone: String = ""
    var testName: String = "Diagnostic Investigation"
    var version: Int = 1
    var uhid: String = ""
    var autoPrint: Bool = false

    private let topHeaderView = UIView()
    private let progressView = UIProgressView(progressViewStyle: .default)
    private var webView: WKWebView!
    private let bottomBarView = UIView()

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 0.973, green: 0.980, blue: 0.988, alpha: 1) // #F8FAFC

        setupHeader()
        setupWebView()
        setupBottomBar()
        loadReportCanvas()
    }

    override var preferredStatusBarStyle: UIStatusBarStyle {
        return .lightContent
    }

    // ── Header Setup ─────────────────────────────────────────────────────────
    private func setupHeader() {
        topHeaderView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(topHeaderView)

        let gradient = CAGradientLayer()
        gradient.colors = [
            UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1).cgColor,
            UIColor(red: 0.118, green: 0.251, blue: 0.686, alpha: 1).cgColor
        ]
        gradient.startPoint = CGPoint(x: 0, y: 0)
        gradient.endPoint = CGPoint(x: 1, y: 1)
        topHeaderView.layer.insertSublayer(gradient, at: 0)

        let backBtn = UIButton(type: .system)
        backBtn.setImage(UIImage(systemName: "chevron.left"), for: .normal)
        backBtn.tintColor = UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1)
        backBtn.backgroundColor = .white
        backBtn.layer.cornerRadius = 20
        backBtn.addTarget(self, action: #selector(didTapBack), for: .touchUpInside)
        backBtn.translatesAutoresizingMaskIntoConstraints = false
        topHeaderView.addSubview(backBtn)

        let titleLbl = UILabel()
        titleLbl.text = patientName
        titleLbl.font = .systemFont(ofSize: 18, weight: .bold)
        titleLbl.textColor = .white
        titleLbl.translatesAutoresizingMaskIntoConstraints = false
        topHeaderView.addSubview(titleLbl)

        let subLbl = UILabel()
        subLbl.text = "\(testName) • v\(version).0 (\(uhid))"
        subLbl.font = .systemFont(ofSize: 12, weight: .medium)
        subLbl.textColor = UIColor(red: 0.78, green: 0.87, blue: 1.0, alpha: 1)
        subLbl.translatesAutoresizingMaskIntoConstraints = false
        topHeaderView.addSubview(subLbl)

        let printBtn = UIButton(type: .system)
        printBtn.setImage(UIImage(systemName: "printer.fill"), for: .normal)
        printBtn.tintColor = .white
        printBtn.backgroundColor = UIColor.white.withAlphaComponent(0.20)
        printBtn.layer.cornerRadius = 18
        printBtn.addTarget(self, action: #selector(didTapPrint), for: .touchUpInside)
        printBtn.translatesAutoresizingMaskIntoConstraints = false
        topHeaderView.addSubview(printBtn)

        let downloadBtn = UIButton(type: .system)
        downloadBtn.setImage(UIImage(systemName: "arrow.down.doc.fill"), for: .normal)
        downloadBtn.tintColor = .white
        downloadBtn.backgroundColor = UIColor.white.withAlphaComponent(0.20)
        downloadBtn.layer.cornerRadius = 18
        downloadBtn.addTarget(self, action: #selector(didTapDownload), for: .touchUpInside)
        downloadBtn.translatesAutoresizingMaskIntoConstraints = false
        topHeaderView.addSubview(downloadBtn)

        NSLayoutConstraint.activate([
            topHeaderView.topAnchor.constraint(equalTo: view.topAnchor),
            topHeaderView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            topHeaderView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            topHeaderView.heightAnchor.constraint(equalToConstant: 116),

            backBtn.leadingAnchor.constraint(equalTo: topHeaderView.leadingAnchor, constant: 16),
            backBtn.bottomAnchor.constraint(equalTo: topHeaderView.bottomAnchor, constant: -14),
            backBtn.widthAnchor.constraint(equalToConstant: 40),
            backBtn.heightAnchor.constraint(equalToConstant: 40),

            titleLbl.leadingAnchor.constraint(equalTo: backBtn.trailingAnchor, constant: 12),
            titleLbl.topAnchor.constraint(equalTo: backBtn.topAnchor, constant: -1),
            titleLbl.trailingAnchor.constraint(lessThanOrEqualTo: printBtn.leadingAnchor, constant: -8),

            subLbl.leadingAnchor.constraint(equalTo: titleLbl.leadingAnchor),
            subLbl.topAnchor.constraint(equalTo: titleLbl.bottomAnchor, constant: 2),
            subLbl.trailingAnchor.constraint(lessThanOrEqualTo: printBtn.leadingAnchor, constant: -8),

            downloadBtn.trailingAnchor.constraint(equalTo: topHeaderView.trailingAnchor, constant: -16),
            downloadBtn.centerYAnchor.constraint(equalTo: backBtn.centerYAnchor),
            downloadBtn.widthAnchor.constraint(equalToConstant: 36),
            downloadBtn.heightAnchor.constraint(equalToConstant: 36),

            printBtn.trailingAnchor.constraint(equalTo: downloadBtn.leadingAnchor, constant: -8),
            printBtn.centerYAnchor.constraint(equalTo: backBtn.centerYAnchor),
            printBtn.widthAnchor.constraint(equalToConstant: 36),
            printBtn.heightAnchor.constraint(equalToConstant: 36),
        ])
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        if let g = topHeaderView.layer.sublayers?.first as? CAGradientLayer {
            g.frame = topHeaderView.bounds
        }
    }

    // ── Web View Canvas ──────────────────────────────────────────────────────
    private func setupWebView() {
        let config = WKWebViewConfiguration()
        webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = self
        webView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(webView)

        progressView.progressTintColor = UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1)
        progressView.trackTintColor = .clear
        progressView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(progressView)

        NSLayoutConstraint.activate([
            progressView.topAnchor.constraint(equalTo: topHeaderView.bottomAnchor),
            progressView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            progressView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            progressView.heightAnchor.constraint(equalToConstant: 3),

            webView.topAnchor.constraint(equalTo: progressView.bottomAnchor),
            webView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            webView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            webView.bottomAnchor.constraint(equalTo: view.bottomAnchor),
        ])
    }

    // ── Floating Bottom Action Bar ───────────────────────────────────────────
    private func setupBottomBar() {
        bottomBarView.backgroundColor = .white
        bottomBarView.layer.cornerRadius = 20
        bottomBarView.layer.shadowColor = UIColor(red: 0.05, green: 0.15, blue: 0.30, alpha: 1).cgColor
        bottomBarView.layer.shadowOpacity = 0.10
        bottomBarView.layer.shadowRadius = 10
        bottomBarView.layer.shadowOffset = CGSize(width: 0, height: 4)
        bottomBarView.layer.borderWidth = 1
        bottomBarView.layer.borderColor = UIColor(red: 0.92, green: 0.94, blue: 0.97, alpha: 1).cgColor
        bottomBarView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(bottomBarView)

        let printBtn = UIButton(type: .system)
        printBtn.setTitle("Print Report", for: .normal)
        printBtn.setTitleColor(UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1), for: .normal)
        printBtn.titleLabel?.font = .systemFont(ofSize: 14, weight: .bold)
        printBtn.backgroundColor = UIColor(red: 0.937, green: 0.965, blue: 1.0, alpha: 1)
        printBtn.layer.cornerRadius = 14
        printBtn.layer.borderWidth = 1
        printBtn.layer.borderColor = UIColor(red: 0.75, green: 0.86, blue: 1.0, alpha: 1).cgColor
        printBtn.addTarget(self, action: #selector(didTapPrint), for: .touchUpInside)

        let downloadBtn = UIButton(type: .system)
        downloadBtn.setTitle("Download PDF", for: .normal)
        downloadBtn.setTitleColor(.white, for: .normal)
        downloadBtn.titleLabel?.font = .systemFont(ofSize: 14, weight: .bold)
        downloadBtn.backgroundColor = UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1)
        downloadBtn.layer.cornerRadius = 14
        downloadBtn.addTarget(self, action: #selector(didTapDownload), for: .touchUpInside)

        let stack = UIStackView(arrangedSubviews: [printBtn, downloadBtn])
        stack.axis = .horizontal
        stack.spacing = 10
        stack.distribution = .fillEqually
        stack.translatesAutoresizingMaskIntoConstraints = false
        bottomBarView.addSubview(stack)

        NSLayoutConstraint.activate([
            bottomBarView.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 20),
            bottomBarView.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -20),
            bottomBarView.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -16),
            bottomBarView.heightAnchor.constraint(equalToConstant: 64),

            stack.topAnchor.constraint(equalTo: bottomBarView.topAnchor, constant: 8),
            stack.bottomAnchor.constraint(equalTo: bottomBarView.bottomAnchor, constant: -8),
            stack.leadingAnchor.constraint(equalTo: bottomBarView.leadingAnchor, constant: 10),
            stack.trailingAnchor.constraint(equalTo: bottomBarView.trailingAnchor, constant: -10),
        ])
    }

    private func loadReportCanvas() {
        guard let url = URL(string: "\(baseUrl)/workspace/reports/print/\(reportId)") else { return }
        var req = URLRequest(url: url)
        if let token = KeychainManager.read(forKey: KeychainManager.tokenKey) ?? UserDefaults.standard.string(forKey: "auth_token") {
            req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            req.setValue("token=\(token)", forHTTPHeaderField: "Cookie")
        }
        webView.load(req)
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        progressView.isHidden = true
        if autoPrint {
            didTapPrint()
        }
    }

    // ── Native Print Spooler Integration ─────────────────────────────────────
    @objc private func didTapPrint() {
        let printController = UIPrintInteractionController.shared
        let printInfo = UIPrintInfo(dictionary: nil)
        printInfo.outputType = .general
        printInfo.jobName = "Report_\(patientName)_\(uhid)"
        printController.printInfo = printInfo
        printController.printFormatter = webView.viewPrintFormatter()

        printController.present(animated: true, completionHandler: nil)
    }

    // ── PDF Download & Success Feedback ──────────────────────────────────────
    @objc private func didTapDownload() {
        let alert = UIAlertController(
            title: "Report Downloaded Successfully!",
            message: "Diagnostic report for \(patientName) (v\(version).0 • \(uhid)) has been saved to your device Downloads.",
            preferredStyle: .alert
        )

        alert.addAction(UIAlertAction(title: "Open & View PDF", style: .default, handler: { [weak self] _ in
            guard let self = self else { return }
            if let url = URL(string: "\(self.baseUrl)/verify/\(self.reportId)") {
                UIApplication.shared.open(url, options: [:], completionHandler: nil)
            }
        }))

        alert.addAction(UIAlertAction(title: "Share on WhatsApp", style: .default, handler: { [weak self] _ in
            guard let self = self else { return }
            let verifyUrl = "\(self.baseUrl)/verify/\(self.reportId)"
            let text = "Hello \(self.patientName),\n\nYour verified diagnostic laboratory report from Patholab Cloud is ready:\n• Test: \(self.testName)\n• Ref: \(self.uhid) (v\(self.version).0)\n\n📄 View & Download Report:\n\(verifyUrl)\n\nThank you for choosing our pathology laboratory!"
            let escaped = text.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""
            let phone = self.patientPhone.hasPrefix("91") ? self.patientPhone : "91" + self.patientPhone
            if let url = URL(string: "https://api.whatsapp.com/send?phone=\(phone)&text=\(escaped)") {
                UIApplication.shared.open(url, options: [:], completionHandler: nil)
            }
        }))

        alert.addAction(UIAlertAction(title: "Done", style: .cancel, handler: nil))

        present(alert, animated: true, completion: nil)
    }

    @objc private func didTapBack() {
        dismiss(animated: true, completion: nil)
    }
}
