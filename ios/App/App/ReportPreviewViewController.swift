import UIKit
import WebKit

// ─────────────────────────────────────────────────────────────────────────────
// MARK: – Dedicated In-App Report Preview & Native Printing Controller (iOS)
// ─────────────────────────────────────────────────────────────────────────────
class ReportPreviewViewController: UIViewController, WKNavigationDelegate, UIDocumentInteractionControllerDelegate {

    private let baseUrl = "https://app.patholab.cloud"

    var reportId: String = ""
    var patientDbId: String = ""
    var invoiceId: String = ""
    var patientName: String = "Patient"
    var patientPhone: String = ""
    var testName: String = "Diagnostic Investigation"
    var version: Int = 1
    var uhid: String = ""
    var autoPrint: Bool = false
    var pdfUrl: String = "" // direct PDF URL from API; takes priority over print-canvas URL

    private let topHeaderView = UIView()
    private let titleLbl = UILabel()
    private let subLbl = UILabel()
    private let progressView = UIProgressView(progressViewStyle: .default)
    private var webView: WKWebView!
    private let bottomBarView = UIView()

    // Floating Zoom Controls Pill
    private let zoomPillView = UIView()
    private let zoomInBtn = UIButton(type: .system)
    private let zoomFitBtn = UIButton(type: .system)
    private let zoomOutBtn = UIButton(type: .system)

    // Floating In-App Download Success Banner
    private let bannerView = UIView()
    private let bannerTitleLbl = UILabel()
    private let bannerBodyLbl = UILabel()
    private var bannerTopConstraint: NSLayoutConstraint?

    // Native Download Success Modal Dialog
    private var downloadSuccessOverlay: UIView?
    private var savedPdfLocalUrl: URL?

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 0.973, green: 0.980, blue: 0.988, alpha: 1) // #F8FAFC

        setupHeader()
        setupWebView()
        setupBottomBar()
        setupZoomControls()
        setupInAppBanner()
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

        titleLbl.text = patientName
        titleLbl.font = .systemFont(ofSize: 18, weight: .bold)
        titleLbl.textColor = .white
        titleLbl.translatesAutoresizingMaskIntoConstraints = false
        topHeaderView.addSubview(titleLbl)

        let subText = "\(testName) • v\(version).0" + (!uhid.isEmpty ? " (\(uhid))" : "")
        subLbl.text = subText
        subLbl.font = .systemFont(ofSize: 12, weight: .medium)
        subLbl.textColor = UIColor(red: 0.78, green: 0.87, blue: 1.0, alpha: 1)
        subLbl.translatesAutoresizingMaskIntoConstraints = false
        topHeaderView.addSubview(subLbl)

        let refreshBtn = UIButton(type: .system)
        refreshBtn.setImage(UIImage(systemName: "arrow.clockwise"), for: .normal)
        refreshBtn.tintColor = .white
        refreshBtn.backgroundColor = UIColor.white.withAlphaComponent(0.20)
        refreshBtn.layer.cornerRadius = 18
        refreshBtn.addTarget(self, action: #selector(didTapRefresh), for: .touchUpInside)
        refreshBtn.translatesAutoresizingMaskIntoConstraints = false
        topHeaderView.addSubview(refreshBtn)

        NSLayoutConstraint.activate([
            topHeaderView.topAnchor.constraint(equalTo: view.topAnchor),
            topHeaderView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            topHeaderView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            topHeaderView.bottomAnchor.constraint(equalTo: backBtn.bottomAnchor, constant: 14),

            backBtn.leadingAnchor.constraint(equalTo: topHeaderView.leadingAnchor, constant: 16),
            backBtn.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 10),
            backBtn.widthAnchor.constraint(equalToConstant: 40),
            backBtn.heightAnchor.constraint(equalToConstant: 40),

            titleLbl.leadingAnchor.constraint(equalTo: backBtn.trailingAnchor, constant: 12),
            titleLbl.topAnchor.constraint(equalTo: backBtn.topAnchor, constant: 1),
            titleLbl.trailingAnchor.constraint(lessThanOrEqualTo: refreshBtn.leadingAnchor, constant: -8),

            subLbl.leadingAnchor.constraint(equalTo: titleLbl.leadingAnchor),
            subLbl.topAnchor.constraint(equalTo: titleLbl.bottomAnchor, constant: 3),
            subLbl.trailingAnchor.constraint(lessThanOrEqualTo: refreshBtn.leadingAnchor, constant: -8),

            refreshBtn.trailingAnchor.constraint(equalTo: topHeaderView.trailingAnchor, constant: -16),
            refreshBtn.centerYAnchor.constraint(equalTo: backBtn.centerYAnchor),
            refreshBtn.widthAnchor.constraint(equalToConstant: 38),
            refreshBtn.heightAnchor.constraint(equalToConstant: 38),
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
        webView.scrollView.maximumZoomScale = 5.0
        webView.scrollView.minimumZoomScale = 0.2
        webView.scrollView.bouncesZoom = true
        webView.backgroundColor = UIColor(red: 0.059, green: 0.090, blue: 0.165, alpha: 1) // #0F172A
        webView.scrollView.backgroundColor = UIColor(red: 0.059, green: 0.090, blue: 0.165, alpha: 1)
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

    // ── Floating Bottom Action Bar (Only 2 Clear Actions — Icon-Free & Professional) ────
    private func setupBottomBar() {
        bottomBarView.backgroundColor = .white
        bottomBarView.layer.cornerRadius = 20
        bottomBarView.layer.shadowColor = UIColor(red: 0.05, green: 0.15, blue: 0.30, alpha: 1).cgColor
        bottomBarView.layer.shadowOpacity = 0.12
        bottomBarView.layer.shadowRadius = 10
        bottomBarView.layer.shadowOffset = CGSize(width: 0, height: 4)
        bottomBarView.layer.borderWidth = 1
        bottomBarView.layer.borderColor = UIColor(red: 0.92, green: 0.94, blue: 0.97, alpha: 1).cgColor
        bottomBarView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(bottomBarView)

        let printBtn = UIButton(type: .system)
        printBtn.setTitle("Print Report", for: .normal)
        printBtn.setImage(nil, for: .normal) // Removed icon as requested
        printBtn.tintColor = UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1)
        printBtn.setTitleColor(UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1), for: .normal)
        printBtn.titleLabel?.font = .systemFont(ofSize: 14.5, weight: .bold)
        printBtn.titleLabel?.numberOfLines = 1
        printBtn.titleLabel?.adjustsFontSizeToFitWidth = true
        printBtn.titleLabel?.minimumScaleFactor = 0.8
        printBtn.backgroundColor = UIColor(red: 0.937, green: 0.965, blue: 1.0, alpha: 1)
        printBtn.layer.cornerRadius = 14
        printBtn.layer.borderWidth = 1.2
        printBtn.layer.borderColor = UIColor(red: 0.75, green: 0.86, blue: 1.0, alpha: 1).cgColor
        printBtn.addTarget(self, action: #selector(didTapPrint), for: .touchUpInside)

        let downloadBtn = UIButton(type: .system)
        downloadBtn.setTitle("Download PDF", for: .normal)
        downloadBtn.setImage(nil, for: .normal) // Removed icon as requested
        downloadBtn.tintColor = .white
        downloadBtn.setTitleColor(.white, for: .normal)
        downloadBtn.titleLabel?.font = .systemFont(ofSize: 14.5, weight: .bold)
        downloadBtn.titleLabel?.numberOfLines = 1
        downloadBtn.titleLabel?.adjustsFontSizeToFitWidth = true
        downloadBtn.titleLabel?.minimumScaleFactor = 0.8
        downloadBtn.backgroundColor = UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1)
        downloadBtn.layer.cornerRadius = 14
        downloadBtn.addTarget(self, action: #selector(didTapDownload), for: .touchUpInside)

        let stack = UIStackView(arrangedSubviews: [printBtn, downloadBtn])
        stack.axis = .horizontal
        stack.spacing = 12
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

    // ── Floating Zoom Controls Pill (Zoom In, Fit, Zoom Out) ────────────────
    private func setupZoomControls() {
        zoomPillView.backgroundColor = UIColor(red: 0.059, green: 0.090, blue: 0.165, alpha: 0.92) // #0F172A
        zoomPillView.layer.cornerRadius = 20
        zoomPillView.layer.shadowColor = UIColor.black.cgColor
        zoomPillView.layer.shadowOpacity = 0.30
        zoomPillView.layer.shadowRadius = 8
        zoomPillView.layer.shadowOffset = CGSize(width: 0, height: 4)
        zoomPillView.layer.borderWidth = 1
        zoomPillView.layer.borderColor = UIColor(white: 1.0, alpha: 0.18).cgColor
        zoomPillView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(zoomPillView)

        zoomInBtn.setTitle("+", for: .normal)
        zoomInBtn.setTitleColor(.white, for: .normal)
        zoomInBtn.titleLabel?.font = .systemFont(ofSize: 22, weight: .bold)
        zoomInBtn.addTarget(self, action: #selector(didTapZoomIn), for: .touchUpInside)
        zoomInBtn.translatesAutoresizingMaskIntoConstraints = false

        let div1 = UIView()
        div1.backgroundColor = UIColor(white: 1.0, alpha: 0.18)
        div1.translatesAutoresizingMaskIntoConstraints = false

        zoomFitBtn.setTitle("FIT", for: .normal)
        zoomFitBtn.setTitleColor(UIColor(red: 0.22, green: 0.74, blue: 0.97, alpha: 1), for: .normal) // #38BDF8
        zoomFitBtn.titleLabel?.font = .systemFont(ofSize: 10.5, weight: .bold)
        zoomFitBtn.addTarget(self, action: #selector(didTapZoomFit), for: .touchUpInside)
        zoomFitBtn.translatesAutoresizingMaskIntoConstraints = false

        let div2 = UIView()
        div2.backgroundColor = UIColor(white: 1.0, alpha: 0.18)
        div2.translatesAutoresizingMaskIntoConstraints = false

        zoomOutBtn.setTitle("–", for: .normal)
        zoomOutBtn.setTitleColor(.white, for: .normal)
        zoomOutBtn.titleLabel?.font = .systemFont(ofSize: 22, weight: .bold)
        zoomOutBtn.addTarget(self, action: #selector(didTapZoomOut), for: .touchUpInside)
        zoomOutBtn.translatesAutoresizingMaskIntoConstraints = false

        zoomPillView.addSubview(zoomInBtn)
        zoomPillView.addSubview(div1)
        zoomPillView.addSubview(zoomFitBtn)
        zoomPillView.addSubview(div2)
        zoomPillView.addSubview(zoomOutBtn)

        NSLayoutConstraint.activate([
            zoomPillView.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -16),
            zoomPillView.bottomAnchor.constraint(equalTo: bottomBarView.topAnchor, constant: -12),
            zoomPillView.widthAnchor.constraint(equalToConstant: 42),
            zoomPillView.heightAnchor.constraint(equalToConstant: 114),

            zoomInBtn.topAnchor.constraint(equalTo: zoomPillView.topAnchor, constant: 2),
            zoomInBtn.centerXAnchor.constraint(equalTo: zoomPillView.centerXAnchor),
            zoomInBtn.widthAnchor.constraint(equalToConstant: 38),
            zoomInBtn.heightAnchor.constraint(equalToConstant: 36),

            div1.topAnchor.constraint(equalTo: zoomInBtn.bottomAnchor, constant: 1),
            div1.centerXAnchor.constraint(equalTo: zoomPillView.centerXAnchor),
            div1.widthAnchor.constraint(equalToConstant: 24),
            div1.heightAnchor.constraint(equalToConstant: 1),

            zoomFitBtn.topAnchor.constraint(equalTo: div1.bottomAnchor, constant: 1),
            zoomFitBtn.centerXAnchor.constraint(equalTo: zoomPillView.centerXAnchor),
            zoomFitBtn.widthAnchor.constraint(equalToConstant: 38),
            zoomFitBtn.heightAnchor.constraint(equalToConstant: 32),

            div2.topAnchor.constraint(equalTo: zoomFitBtn.bottomAnchor, constant: 1),
            div2.centerXAnchor.constraint(equalTo: zoomPillView.centerXAnchor),
            div2.widthAnchor.constraint(equalToConstant: 24),
            div2.heightAnchor.constraint(equalToConstant: 1),

            zoomOutBtn.topAnchor.constraint(equalTo: div2.bottomAnchor, constant: 1),
            zoomOutBtn.centerXAnchor.constraint(equalTo: zoomPillView.centerXAnchor),
            zoomOutBtn.widthAnchor.constraint(equalToConstant: 38),
            zoomOutBtn.heightAnchor.constraint(equalToConstant: 36),
        ])
    }

    @objc private func didTapZoomIn() {
        webView?.evaluateJavaScript("if (window.__zoomIn) { window.__zoomIn(); }", completionHandler: nil)
    }

    @objc private func didTapZoomFit() {
        webView?.evaluateJavaScript("if (window.__zoomReset) { window.__zoomReset(); }", completionHandler: nil)
        webView?.scrollView.setZoomScale(1.0, animated: true)
    }

    @objc private func didTapZoomOut() {
        webView?.evaluateJavaScript("if (window.__zoomOut) { window.__zoomOut(); }", completionHandler: nil)
    }

    // ── Floating In-App Banner Setup ─────────────────────────────────────────
    private func setupInAppBanner() {
        bannerView.backgroundColor = UIColor(red: 0.059, green: 0.090, blue: 0.165, alpha: 0.96) // #0F172A
        bannerView.layer.cornerRadius = 14
        bannerView.layer.shadowColor = UIColor.black.cgColor
        bannerView.layer.shadowOpacity = 0.25
        bannerView.layer.shadowRadius = 8
        bannerView.layer.shadowOffset = CGSize(width: 0, height: 4)
        bannerView.alpha = 0
        bannerView.isHidden = true
        bannerView.translatesAutoresizingMaskIntoConstraints = false

        let checkIcon = UIImageView(image: UIImage(systemName: "checkmark.circle.fill"))
        checkIcon.tintColor = UIColor(red: 0.063, green: 0.725, blue: 0.506, alpha: 1) // #10B981
        checkIcon.translatesAutoresizingMaskIntoConstraints = false

        bannerTitleLbl.text = "Download Successful"
        bannerTitleLbl.font = .systemFont(ofSize: 13, weight: .bold)
        bannerTitleLbl.textColor = .white
        bannerTitleLbl.translatesAutoresizingMaskIntoConstraints = false

        bannerBodyLbl.text = "Download successful! Report has been saved to your device."
        bannerBodyLbl.font = .systemFont(ofSize: 11.5, weight: .regular)
        bannerBodyLbl.textColor = UIColor(red: 0.58, green: 0.64, blue: 0.72, alpha: 1)
        bannerBodyLbl.numberOfLines = 2
        bannerBodyLbl.translatesAutoresizingMaskIntoConstraints = false

        let viewBtn = UIButton(type: .system)
        viewBtn.setTitle("VIEW", for: .normal)
        viewBtn.setTitleColor(UIColor(red: 0.22, green: 0.74, blue: 0.97, alpha: 1), for: .normal)
        viewBtn.titleLabel?.font = .systemFont(ofSize: 12, weight: .bold)
        viewBtn.addTarget(self, action: #selector(didTapBanner), for: .touchUpInside)
        viewBtn.translatesAutoresizingMaskIntoConstraints = false

        let textStack = UIStackView(arrangedSubviews: [bannerTitleLbl, bannerBodyLbl])
        textStack.axis = .vertical
        textStack.spacing = 2
        textStack.translatesAutoresizingMaskIntoConstraints = false

        bannerView.addSubview(checkIcon)
        bannerView.addSubview(textStack)
        bannerView.addSubview(viewBtn)
        view.addSubview(bannerView)

        let tapGesture = UITapGestureRecognizer(target: self, action: #selector(didTapBanner))
        bannerView.addGestureRecognizer(tapGesture)

        bannerTopConstraint = bannerView.topAnchor.constraint(equalTo: topHeaderView.bottomAnchor, constant: -70)

        NSLayoutConstraint.activate([
            bannerTopConstraint!,
            bannerView.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 16),
            bannerView.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -16),

            checkIcon.leadingAnchor.constraint(equalTo: bannerView.leadingAnchor, constant: 12),
            checkIcon.centerYAnchor.constraint(equalTo: bannerView.centerYAnchor),
            checkIcon.widthAnchor.constraint(equalToConstant: 24),
            checkIcon.heightAnchor.constraint(equalToConstant: 24),

            textStack.leadingAnchor.constraint(equalTo: checkIcon.trailingAnchor, constant: 10),
            textStack.trailingAnchor.constraint(equalTo: viewBtn.leadingAnchor, constant: -8),
            textStack.topAnchor.constraint(equalTo: bannerView.topAnchor, constant: 10),
            textStack.bottomAnchor.constraint(equalTo: bannerView.bottomAnchor, constant: -10),

            viewBtn.trailingAnchor.constraint(equalTo: bannerView.trailingAnchor, constant: -12),
            viewBtn.centerYAnchor.constraint(equalTo: bannerView.centerYAnchor),
            viewBtn.widthAnchor.constraint(equalToConstant: 44),
        ])
    }

    private func showInAppNotificationBanner(message: String) {
        bannerBodyLbl.text = message
        bannerView.isHidden = false
        view.layoutIfNeeded()

        UIView.animate(withDuration: 0.4, delay: 0, usingSpringWithDamping: 0.75, initialSpringVelocity: 0.5, options: .curveEaseOut, animations: {
            self.bannerTopConstraint?.constant = 12
            self.bannerView.alpha = 1
            self.view.layoutIfNeeded()
        }) { _ in
            DispatchQueue.main.asyncAfter(deadline: .now() + 6.0) {
                self.hideInAppBanner()
            }
        }
    }

    private func hideInAppBanner() {
        UIView.animate(withDuration: 0.3, animations: {
            self.bannerTopConstraint?.constant = -70
            self.bannerView.alpha = 0
            self.view.layoutIfNeeded()
        }) { _ in
            self.bannerView.isHidden = true
        }
    }

    @objc private func didTapBanner() {
        hideInAppBanner()
        webView?.scrollView.setContentOffset(.zero, animated: true)
    }

    private func loadReportCanvas() {
        let targetId = !patientDbId.isEmpty ? patientDbId : (!uhid.isEmpty && uhid.hasPrefix("P-") ? uhid : reportId)
        let cleanId = targetId.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? targetId
        let targetUrlString: String
        if !pdfUrl.isEmpty, let _ = URL(string: pdfUrl), pdfUrl.hasPrefix("http") {
            targetUrlString = pdfUrl
        } else {
            targetUrlString = "\(baseUrl)/workspace/reports/print/\(cleanId)?app=true&hideNav=true"
        }
        guard let url = URL(string: targetUrlString) else { return }
        var req = URLRequest(url: url)
        if let token = KeychainManager.read(forKey: KeychainManager.tokenKey) ?? UserDefaults.standard.string(forKey: "auth_token") {
            req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            req.setValue("token=\(token)", forHTTPHeaderField: "Cookie")
            if let cookie = HTTPCookie(properties: [
                .domain: "app.patholab.cloud",
                .path: "/",
                .name: "token",
                .value: token,
                .secure: "TRUE"
            ]) {
                webView.configuration.websiteDataStore.httpCookieStore.setCookie(cookie)
            }
        }
        webView.load(req)
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        progressView.isHidden = true
        applyResponsiveReportScaling(to: webView)

        if autoPrint {
            didTapPrint()
        }
    }

    private func applyResponsiveReportScaling(to webView: WKWebView) {
        let js = """
        (function() {
          try {
            // 1. Separate Screen viewer and Print media styles
            var css = '@media screen {' +
                      '  html { margin: 0 !important; padding: 0 !important; background: #0F172A !important; -webkit-text-size-adjust: 100% !important; overflow-x: auto !important; -webkit-overflow-scrolling: touch !important; }' +
                      '  body { background: #0F172A !important; margin: 0 auto !important; padding: 4px 0 100px 0 !important; display: flex !important; flex-direction: column !important; align-items: center !important; overflow-x: auto !important; -webkit-overflow-scrolling: touch !important; width: 100% !important; min-width: 100% !important; }' +
                      '  .flex.flex-col.items-center { padding-top: 4px !important; padding-bottom: 20px !important; width: 100% !important; }' +
                      '  .sticky.top-4, nav, header:not(.report-header), footer.web-only, .print\\\\:hidden:not(.report-canvas) { display: none !important; }' +
                      '}' +
                      '@media print {' +
                      '  @page { size: A4 portrait; margin: 0; }' +
                      '  html, body { background: #FFFFFF !important; color: #000000 !important; margin: 0 !important; padding: 0 !important; width: 210mm !important; overflow: visible !important; }' +
                      '  div[style*="210mm"], .report-canvas { zoom: 1.0 !important; transform: none !important; box-shadow: none !important; border-radius: 0 !important; margin: 0 !important; width: 210mm !important; }' +
                      '  .sticky, nav, header, footer, .print\\\\:hidden, #app-report-override { display: none !important; }' +
                      '}';

            var style = document.getElementById('app-report-override');
            if (!style) {
              style = document.createElement('style');
              style.id = 'app-report-override';
              document.head.appendChild(style);
            }
            style.innerHTML = css;

            // 2. Zoom Controls API & Responsive Scaling
            window.__zoomMultiplier = window.__zoomMultiplier || 1.0;
            function fitReport() {
              var canvases = document.querySelectorAll('div[style*="210mm"], .report-canvas, .bg-white.shadow-\\\\[0_20px_50px_rgba\\\\(0\\\\,0\\\\,0\\\\,0\\\\.3\\\\)\\\\]');
              if (!canvases || canvases.length === 0) return false;

              var screenW = window.innerWidth || document.documentElement.clientWidth || screen.width;
              var availableW = screenW - 16; // 8px margin on each side
              var mult = window.__zoomMultiplier || 1.0;

              canvases.forEach(function(canvas) {
                var naturalW = 794; // standard 210mm A4 width at 96 DPI
                if (canvas.scrollWidth && canvas.scrollWidth > 500) {
                  naturalW = canvas.scrollWidth;
                }

                var baseScale = availableW / naturalW;
                var scale = (baseScale * mult).toFixed(4);
                canvas.style.zoom = scale;
                canvas.style.webkitTransformOrigin = 'top center';
                canvas.style.margin = '4px auto 16px auto';
                canvas.style.boxShadow = '0 8px 30px rgba(0,0,0,0.35)';
                canvas.style.borderRadius = '4px';
                canvas.style.transition = 'zoom 0.15s ease-out';
              });

              var vp = document.querySelector('meta[name="viewport"]');
              if (vp) {
                vp.setAttribute('content', 'width=device-width, initial-scale=1.0, minimum-scale=0.25, maximum-scale=5.0, user-scalable=yes');
              }
              return true;
            }

            window.__zoomIn = function() {
              window.__zoomMultiplier = Math.min(3.0, (window.__zoomMultiplier || 1.0) + 0.25);
              fitReport();
              return window.__zoomMultiplier;
            };
            window.__zoomOut = function() {
              window.__zoomMultiplier = Math.max(0.5, (window.__zoomMultiplier || 1.0) - 0.25);
              fitReport();
              return window.__zoomMultiplier;
            };
            window.__zoomReset = function() {
              window.__zoomMultiplier = 1.0;
              fitReport();
              return 1.0;
            };

            fitReport();

            // Watch for React hydration so it fits the very millisecond it mounts
            if (!window.__appReportObserver) {
              window.__appReportObserver = new MutationObserver(function() { fitReport(); });
              window.__appReportObserver.observe(document.body || document.documentElement, { childList: true, subtree: true });
            }

            window.addEventListener('resize', fitReport);
            window.addEventListener('orientationchange', function() { setTimeout(fitReport, 200); });
          } catch(e) {}
        })();
        """
        webView.evaluateJavaScript(js, completionHandler: nil)
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) { [weak webView] in
            webView?.evaluateJavaScript(js, completionHandler: nil)
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.8) { [weak webView] in
            webView?.evaluateJavaScript(js, completionHandler: nil)
        }
    }

    @objc private func didTapRefresh() {
        progressView.isHidden = false
        progressView.progress = 0.2
        webView.reload()
    }

    // ── Native Print Spooler Integration ─────────────────────────────────────
    @objc private func didTapPrint() {
        let printController = UIPrintInteractionController.shared
        let printInfo = UIPrintInfo(dictionary: nil)
        printInfo.outputType = .general
        printInfo.jobName = "Report_\(patientName)_\(uhid.isEmpty ? "visit" : uhid)"
        printController.printInfo = printInfo
        printController.printFormatter = webView.viewPrintFormatter()

        printController.present(animated: true, completionHandler: nil)
    }

    // ── PDF Download — Live Stream & Real Save to Device ─────────────────────
    @objc private func didTapDownload() {
        let hud = UIActivityIndicatorView(style: .large)
        hud.color = UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1)
        hud.center = view.center
        hud.startAnimating()
        view.addSubview(hud)

        let token = KeychainManager.read(forKey: KeychainManager.tokenKey) ?? UserDefaults.standard.string(forKey: "auth_token")

        // 1. Primary Download: POST /api/reports/generate (Exact same as web print page generator)
        let generateUrl = URL(string: "\(baseUrl)/api/reports/generate")!
        var genReq = URLRequest(url: generateUrl)
        genReq.httpMethod = "POST"
        genReq.setValue("application/json", forHTTPHeaderField: "Content-Type")
        genReq.setValue("application/pdf", forHTTPHeaderField: "Accept")
        if let token = token {
            genReq.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            genReq.setValue("token=\(token)", forHTTPHeaderField: "Cookie")
        }

        let verifyKey = !reportId.isEmpty ? reportId : patientDbId
        var payload: [String: Any] = [
            "action": "generate_invoice_report",
            "verificationUrl": "\(baseUrl)/verify/\(verifyKey)"
        ]
        if !invoiceId.isEmpty { payload["invoiceId"] = invoiceId }
        if !patientDbId.isEmpty { payload["patientId"] = patientDbId }
        else if !reportId.isEmpty { payload["reportId"] = reportId }

        genReq.httpBody = try? JSONSerialization.data(withJSONObject: payload, options: [])

        URLSession.shared.dataTask(with: genReq) { [weak self] data, response, error in
            guard let self = self else { return }

            if let data = data, data.count > 500, error == nil,
               (response as? HTTPURLResponse)?.statusCode == 200 {
                DispatchQueue.main.async {
                    hud.removeFromSuperview()
                    self.saveAndPresentPdf(data: data)
                }
                return
            }

            // 2. Fallback: GET /api/workspace/reports/{cleanId}/pdf
            let targetCleanId = (!self.reportId.isEmpty ? self.reportId : (!self.patientDbId.isEmpty ? self.patientDbId : self.uhid))
                .replacingOccurrences(of: "^(?i)(rep_|inv_)", with: "", options: .regularExpression)
                .trimmingCharacters(in: .whitespacesAndNewlines)

            guard let fallbackUrl = URL(string: "\(self.baseUrl)/api/workspace/reports/\(targetCleanId.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? targetCleanId)/pdf") else {
                DispatchQueue.main.async {
                    hud.removeFromSuperview()
                    self.showDownloadError()
                }
                return
            }

            var fbReq = URLRequest(url: fallbackUrl)
            fbReq.setValue("application/pdf", forHTTPHeaderField: "Accept")
            if let token = token {
                fbReq.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
                fbReq.setValue("token=\(token)", forHTTPHeaderField: "Cookie")
            }

            URLSession.shared.dataTask(with: fbReq) { [weak self] fbData, fbResponse, fbError in
                DispatchQueue.main.async {
                    hud.removeFromSuperview()
                    guard let self = self else { return }

                    if let fbData = fbData, fbData.count > 500, fbError == nil,
                       (fbResponse as? HTTPURLResponse)?.statusCode == 200 {
                        self.saveAndPresentPdf(data: fbData)
                    } else {
                        self.showDownloadError()
                    }
                }
            }.resume()

        }.resume()
    }

    private var docInteractionController: UIDocumentInteractionController?

    private func saveAndPresentPdf(data: Data) {
        let safeName = patientName.replacingOccurrences(of: "[^a-zA-Z0-9]", with: "_", options: .regularExpression)
        let safeUhid = uhid.isEmpty ? "visit" : uhid.replacingOccurrences(of: "[^a-zA-Z0-9]", with: "_", options: .regularExpression)
        let fileName = "Report_\(safeName)_\(safeUhid).pdf"
        let tempUrl = FileManager.default.temporaryDirectory.appendingPathComponent(fileName)

        do {
            try data.write(to: tempUrl)

            let successMessage = "Download successful! Report for \(patientName)" + (!uhid.isEmpty ? " (\(uhid))" : "") + " has been saved to your device."

            // 1. Show In-App Notification Banner
            showInAppNotificationBanner(message: successMessage)

            // 2. Post Device System Notification
            MobileNotificationHelper.shared.postReportDownloadSuccessNotification(
                patientName: patientName,
                uhid: uhid,
                reportId: !reportId.isEmpty ? reportId : patientDbId,
                testName: testName,
                version: version,
                pdfUrl: tempUrl.path
            )

            // 3. Present the interactive Download Success modal dialog
            showDownloadSuccessModal(fileUrl: tempUrl)

        } catch {
            showDownloadError()
        }
    }

    // ── Interactive Download Success Modal Dialog (Icon-Free & Professional) ──
    private func showDownloadSuccessModal(fileUrl: URL) {
        self.savedPdfLocalUrl = fileUrl
        downloadSuccessOverlay?.removeFromSuperview()

        let overlay = UIView(frame: view.bounds)
        overlay.backgroundColor = UIColor.black.withAlphaComponent(0.55)
        overlay.alpha = 0
        overlay.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(overlay)
        self.downloadSuccessOverlay = overlay

        NSLayoutConstraint.activate([
            overlay.topAnchor.constraint(equalTo: view.topAnchor),
            overlay.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            overlay.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            overlay.bottomAnchor.constraint(equalTo: view.bottomAnchor),
        ])

        let card = UIView()
        card.backgroundColor = .white
        card.layer.cornerRadius = 24
        card.layer.shadowColor = UIColor.black.cgColor
        card.layer.shadowOpacity = 0.22
        card.layer.shadowRadius = 16
        card.layer.shadowOffset = CGSize(width: 0, height: 8)
        card.translatesAutoresizingMaskIntoConstraints = false
        overlay.addSubview(card)

        // 1. Success Emerald Icon Circle
        let iconContainer = UIView()
        iconContainer.backgroundColor = UIColor(red: 0.063, green: 0.725, blue: 0.506, alpha: 0.12)
        iconContainer.layer.cornerRadius = 30
        iconContainer.translatesAutoresizingMaskIntoConstraints = false

        let checkmarkImg = UIImageView(image: UIImage(systemName: "checkmark"))
        checkmarkImg.tintColor = UIColor(red: 0.063, green: 0.725, blue: 0.506, alpha: 1)
        checkmarkImg.contentMode = .scaleAspectFit
        checkmarkImg.translatesAutoresizingMaskIntoConstraints = false
        iconContainer.addSubview(checkmarkImg)

        // 2. Title Label
        let titleLbl = UILabel()
        titleLbl.text = "Download Successful!"
        titleLbl.font = .systemFont(ofSize: 19, weight: .bold)
        titleLbl.textColor = UIColor(red: 0.059, green: 0.090, blue: 0.165, alpha: 1)
        titleLbl.textAlignment = .center
        titleLbl.translatesAutoresizingMaskIntoConstraints = false

        // 3. Details Subtitle Label
        let detailsLbl = UILabel()
        detailsLbl.text = "Diagnostic report for \(patientName)" + (!uhid.isEmpty ? " (\(uhid))" : "") + " has been saved to your device."
        detailsLbl.font = .systemFont(ofSize: 13, weight: .regular)
        detailsLbl.textColor = UIColor(red: 0.392, green: 0.455, blue: 0.545, alpha: 1)
        detailsLbl.textAlignment = .center
        detailsLbl.numberOfLines = 0
        detailsLbl.translatesAutoresizingMaskIntoConstraints = false

        // 4. Action 1: Open & View PDF (STRICTLY NO ICON as requested)
        let openPdfBtn = UIButton(type: .system)
        openPdfBtn.setTitle("Open & View PDF", for: .normal)
        openPdfBtn.setImage(nil, for: .normal)
        openPdfBtn.titleLabel?.font = .systemFont(ofSize: 15, weight: .bold)
        openPdfBtn.setTitleColor(.white, for: .normal)
        openPdfBtn.backgroundColor = UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1)
        openPdfBtn.layer.cornerRadius = 14
        openPdfBtn.translatesAutoresizingMaskIntoConstraints = false
        openPdfBtn.addTarget(self, action: #selector(didTapSuccessOpenPdf), for: .touchUpInside)

        // 5. Action 2: Share with Patient on WhatsApp (STRICTLY NO ICON as requested)
        let shareWaBtn = UIButton(type: .system)
        shareWaBtn.setTitle("Share with Patient on WhatsApp", for: .normal)
        shareWaBtn.setImage(nil, for: .normal)
        shareWaBtn.titleLabel?.font = .systemFont(ofSize: 14.5, weight: .bold)
        shareWaBtn.setTitleColor(UIColor(red: 0.02, green: 0.59, blue: 0.41, alpha: 1), for: .normal)
        shareWaBtn.backgroundColor = UIColor(red: 0.925, green: 0.992, blue: 0.961, alpha: 1)
        shareWaBtn.layer.cornerRadius = 14
        shareWaBtn.layer.borderWidth = 1.2
        shareWaBtn.layer.borderColor = UIColor(red: 0.65, green: 0.95, blue: 0.82, alpha: 1).cgColor
        shareWaBtn.translatesAutoresizingMaskIntoConstraints = false
        shareWaBtn.addTarget(self, action: #selector(didTapSuccessShareWhatsApp), for: .touchUpInside)

        // 6. Action 3: Done Dismiss
        let doneBtn = UIButton(type: .system)
        doneBtn.setTitle("Done", for: .normal)
        doneBtn.titleLabel?.font = .systemFont(ofSize: 14.5, weight: .semibold)
        doneBtn.setTitleColor(UIColor(red: 0.392, green: 0.455, blue: 0.545, alpha: 1), for: .normal)
        doneBtn.translatesAutoresizingMaskIntoConstraints = false
        doneBtn.addTarget(self, action: #selector(didTapDismissSuccessModal), for: .touchUpInside)

        card.addSubview(iconContainer)
        card.addSubview(titleLbl)
        card.addSubview(detailsLbl)
        card.addSubview(openPdfBtn)
        card.addSubview(shareWaBtn)
        card.addSubview(doneBtn)

        NSLayoutConstraint.activate([
            card.centerXAnchor.constraint(equalTo: overlay.centerXAnchor),
            card.centerYAnchor.constraint(equalTo: overlay.centerYAnchor),
            card.leadingAnchor.constraint(equalTo: overlay.leadingAnchor, constant: 24),
            card.trailingAnchor.constraint(equalTo: overlay.trailingAnchor, constant: -24),

            iconContainer.topAnchor.constraint(equalTo: card.topAnchor, constant: 24),
            iconContainer.centerXAnchor.constraint(equalTo: card.centerXAnchor),
            iconContainer.widthAnchor.constraint(equalToConstant: 60),
            iconContainer.heightAnchor.constraint(equalToConstant: 60),

            checkmarkImg.centerXAnchor.constraint(equalTo: iconContainer.centerXAnchor),
            checkmarkImg.centerYAnchor.constraint(equalTo: iconContainer.centerYAnchor),
            checkmarkImg.widthAnchor.constraint(equalToConstant: 26),
            checkmarkImg.heightAnchor.constraint(equalToConstant: 26),

            titleLbl.topAnchor.constraint(equalTo: iconContainer.bottomAnchor, constant: 14),
            titleLbl.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 16),
            titleLbl.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -16),

            detailsLbl.topAnchor.constraint(equalTo: titleLbl.bottomAnchor, constant: 6),
            detailsLbl.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 20),
            detailsLbl.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -20),

            openPdfBtn.topAnchor.constraint(equalTo: detailsLbl.bottomAnchor, constant: 22),
            openPdfBtn.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 20),
            openPdfBtn.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -20),
            openPdfBtn.heightAnchor.constraint(equalToConstant: 50),

            // Distinct 14pt gap between Open PDF and Share with Patient as requested
            shareWaBtn.topAnchor.constraint(equalTo: openPdfBtn.bottomAnchor, constant: 14),
            shareWaBtn.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 20),
            shareWaBtn.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -20),
            shareWaBtn.heightAnchor.constraint(equalToConstant: 50),

            doneBtn.topAnchor.constraint(equalTo: shareWaBtn.bottomAnchor, constant: 12),
            doneBtn.centerXAnchor.constraint(equalTo: card.centerXAnchor),
            doneBtn.heightAnchor.constraint(equalToConstant: 38),
            doneBtn.bottomAnchor.constraint(equalTo: card.bottomAnchor, constant: -16),
        ])

        card.transform = CGAffineTransform(scaleX: 0.88, y: 0.88)
        UIView.animate(withDuration: 0.28, delay: 0, usingSpringWithDamping: 0.82, initialSpringVelocity: 0.5, options: .curveEaseOut, animations: {
            overlay.alpha = 1
            card.transform = .identity
        }, completion: nil)
    }

    @objc private func didTapSuccessOpenPdf() {
        didTapDismissSuccessModal()
        guard let url = savedPdfLocalUrl else { return }
        let doc = UIDocumentInteractionController(url: url)
        doc.delegate = self
        self.docInteractionController = doc
        if !doc.presentPreview(animated: true) {
            let activityVC = UIActivityViewController(activityItems: [url], applicationActivities: nil)
            present(activityVC, animated: true)
        }
    }

    func documentInteractionControllerViewControllerForPreview(_ controller: UIDocumentInteractionController) -> UIViewController {
        return self
    }

    @objc private func didTapSuccessShareWhatsApp() {
        didTapDismissSuccessModal()
        shareReportWithPatient()
    }

    private func shareReportWithPatient() {
        let verifyKey = !reportId.isEmpty ? reportId : patientDbId
        let verifyUrl = "\(baseUrl)/verify/\(verifyKey)"
        let message = "Hello \(patientName),\n\nYour verified diagnostic report from Patholab Cloud is ready.\nTest: \(testName)" + (!uhid.isEmpty ? " (\(uhid))" : "") + "\n\nView & Download: \(verifyUrl)"

        var cleanPhone = patientPhone.replacingOccurrences(of: "[^0-9]", with: "", options: .regularExpression)
        if cleanPhone.count == 10 { cleanPhone = "91" + cleanPhone }

        let encoded = message.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""
        var waUrlStr = "https://api.whatsapp.com/send?text=\(encoded)"
        if !cleanPhone.isEmpty {
            waUrlStr = "https://api.whatsapp.com/send?phone=\(cleanPhone)&text=\(encoded)"
        }

        if let waUrl = URL(string: waUrlStr), UIApplication.shared.canOpenURL(waUrl) {
            UIApplication.shared.open(waUrl, options: [:], completionHandler: nil)
            return
        }

        // Native iOS Share Sheet Fallback
        var items: [Any] = [message]
        if let pdfUrl = savedPdfLocalUrl {
            items.append(pdfUrl)
        } else if let url = URL(string: verifyUrl) {
            items.append(url)
        }

        let activityVC = UIActivityViewController(activityItems: items, applicationActivities: nil)
        activityVC.excludedActivityTypes = [.assignToContact, .saveToCameraRoll, .addToReadingList]
        if let popover = activityVC.popoverPresentationController {
            popover.sourceView = self.view
            popover.sourceRect = CGRect(x: self.view.bounds.midX, y: self.view.bounds.maxY, width: 0, height: 0)
        }
        present(activityVC, animated: true)
    }

    @objc private func didTapDismissSuccessModal() {
        guard let overlay = downloadSuccessOverlay else { return }
        UIView.animate(withDuration: 0.22, animations: {
            overlay.alpha = 0
        }) { _ in
            overlay.removeFromSuperview()
            self.downloadSuccessOverlay = nil
        }
    }

    private func showDownloadError() {
        let alert = UIAlertController(
            title: "Download Failed",
            message: "Unable to generate the report PDF. Please check your network connection and try again.",
            preferredStyle: .alert
        )
        alert.addAction(UIAlertAction(title: "Done", style: .cancel, handler: nil))
        present(alert, animated: true, completion: nil)
    }

    @objc private func didTapBack() {
        dismiss(animated: true, completion: nil)
    }
}
