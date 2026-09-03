import UIKit

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  QRScannerSheetViewController — Native Barcode & QR Scanner Modal (iOS)
 * ═══════════════════════════════════════════════════════════════════════════
 */
class QRScannerSheetViewController: UIViewController {

    var onCodeScanned: ((String, String) -> Void)?

    private var activeMode = "SAMPLE" // SAMPLE, PATIENT, REPORT, WEBSYNC
    private var isFlashOn = false

    // UI Elements
    private let laserLine = UIView()
    private let chipSample = UIButton(type: .system)
    private let chipPatient = UIButton(type: .system)
    private let chipReport = UIButton(type: .system)
    private let chipWebSync = UIButton(type: .system)
    private let hintLabel = UILabel()
    private let manualTextField = UITextField()
    private let processButton = UIButton(type: .system)
    private let flashButton = UIButton(type: .system)

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .white

        setupUI()
        startLaserAnimation()
    }

    private func setupUI() {
        // Drag Indicator
        let grabber = UIView()
        grabber.backgroundColor = UIColor(red: 0.80, green: 0.84, blue: 0.88, alpha: 1)
        grabber.layer.cornerRadius = 2.5
        grabber.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(grabber)

        // Header Row
        let iconBg = UIView()
        iconBg.backgroundColor = UIColor(red: 0.933, green: 0.949, blue: 1.0, alpha: 1)
        iconBg.layer.cornerRadius = 10
        iconBg.translatesAutoresizingMaskIntoConstraints = false

        let qrIcon = UIImageView(image: UIImage(systemName: "qrcode.viewfinder"))
        qrIcon.tintColor = UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1)
        qrIcon.contentMode = .scaleAspectFit
        qrIcon.translatesAutoresizingMaskIntoConstraints = false
        iconBg.addSubview(qrIcon)

        let titleLbl = UILabel()
        titleLbl.text = "QR & Barcode Scanner"
        titleLbl.font = .systemFont(ofSize: 18, weight: .bold)
        titleLbl.textColor = UIColor(red: 0.059, green: 0.090, blue: 0.165, alpha: 1)

        let subLbl = UILabel()
        subLbl.text = "Scan sample tubes, receipts or web login QR"
        subLbl.font = .systemFont(ofSize: 11.5, weight: .medium)
        subLbl.textColor = UIColor(red: 0.392, green: 0.455, blue: 0.545, alpha: 1)

        let titleVStack = UIStackView(arrangedSubviews: [titleLbl, subLbl])
        titleVStack.axis = .vertical
        titleVStack.spacing = 2
        titleVStack.translatesAutoresizingMaskIntoConstraints = false

        let closeBtn = UIButton(type: .system)
        closeBtn.setImage(UIImage(systemName: "xmark"), for: .normal)
        closeBtn.tintColor = UIColor(red: 0.278, green: 0.333, blue: 0.412, alpha: 1)
        closeBtn.backgroundColor = UIColor(red: 0.949, green: 0.961, blue: 0.976, alpha: 1)
        closeBtn.layer.cornerRadius = 18
        closeBtn.addTarget(self, action: #selector(didTapClose), for: .touchUpInside)
        closeBtn.translatesAutoresizingMaskIntoConstraints = false

        let headerHStack = UIStackView(arrangedSubviews: [iconBg, titleVStack, closeBtn])
        headerHStack.axis = .horizontal
        headerHStack.spacing = 12
        headerHStack.alignment = .center
        headerHStack.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(headerHStack)

        let divider = UIView()
        divider.backgroundColor = UIColor(red: 0.945, green: 0.961, blue: 0.976, alpha: 1)
        divider.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(divider)

        // Mode Chips Scroll
        let chipsScrollView = UIScrollView()
        chipsScrollView.showsHorizontalScrollIndicator = false
        chipsScrollView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(chipsScrollView)

        let chipsStack = UIStackView()
        chipsStack.axis = .horizontal
        chipsStack.spacing = 8
        chipsStack.translatesAutoresizingMaskIntoConstraints = false
        chipsScrollView.addSubview(chipsStack)

        setupChip(chipSample, title: "🔬 Sample Barcode", mode: "SAMPLE", active: true)
        setupChip(chipPatient, title: "👤 Patient UHID", mode: "PATIENT", active: false)
        setupChip(chipReport, title: "📄 Report QR", mode: "REPORT", active: false)
        setupChip(chipWebSync, title: "💻 Web Sync", mode: "WEBSYNC", active: false)

        [chipSample, chipPatient, chipReport, chipWebSync].forEach { chipsStack.addArrangedSubview($0) }

        // Camera Viewfinder Box
        let viewfinderBox = UIView()
        viewfinderBox.backgroundColor = UIColor(red: 0.059, green: 0.090, blue: 0.165, alpha: 1)
        viewfinderBox.layer.cornerRadius = 20
        viewfinderBox.clipsToBounds = true
        viewfinderBox.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(viewfinderBox)

        let bgOverlay = UIImageView(image: UIImage(systemName: "qrcode.viewfinder"))
        bgOverlay.tintColor = UIColor(red: 0.220, green: 0.741, blue: 0.973, alpha: 0.4)
        bgOverlay.contentMode = .scaleAspectFit
        bgOverlay.translatesAutoresizingMaskIntoConstraints = false
        viewfinderBox.addSubview(bgOverlay)

        laserLine.backgroundColor = UIColor(red: 0.220, green: 0.741, blue: 0.973, alpha: 1)
        laserLine.layer.shadowColor = UIColor(red: 0.220, green: 0.741, blue: 0.973, alpha: 1).cgColor
        laserLine.layer.shadowRadius = 4
        laserLine.layer.shadowOpacity = 0.8
        laserLine.layer.shadowOffset = .zero
        laserLine.translatesAutoresizingMaskIntoConstraints = false
        viewfinderBox.addSubview(laserLine)

        hintLabel.text = "Align sample vial barcode within frame"
        hintLabel.font = .systemFont(ofSize: 11.5, weight: .medium)
        hintLabel.textColor = UIColor(red: 0.886, green: 0.910, blue: 0.941, alpha: 1)
        hintLabel.backgroundColor = UIColor.black.withAlphaComponent(0.55)
        hintLabel.layer.cornerRadius = 8
        hintLabel.clipsToBounds = true
        hintLabel.textAlignment = .center
        hintLabel.translatesAutoresizingMaskIntoConstraints = false
        viewfinderBox.addSubview(hintLabel)

        flashButton.setImage(UIImage(systemName: "bolt.fill"), for: .normal)
        flashButton.tintColor = .white
        flashButton.backgroundColor = UIColor.white.withAlphaComponent(0.2)
        flashButton.layer.cornerRadius = 18
        flashButton.addTarget(self, action: #selector(didTapFlash), for: .touchUpInside)
        flashButton.translatesAutoresizingMaskIntoConstraints = false
        viewfinderBox.addSubview(flashButton)

        // Manual Entry
        manualTextField.placeholder = "Enter Sample ID (e.g. SMP-10023)"
        manualTextField.font = .systemFont(ofSize: 13.5, weight: .medium)
        manualTextField.backgroundColor = UIColor(red: 0.965, green: 0.973, blue: 0.984, alpha: 1)
        manualTextField.layer.cornerRadius = 12
        manualTextField.layer.borderWidth = 1
        manualTextField.layer.borderColor = UIColor(red: 0.89, green: 0.91, blue: 0.95, alpha: 1).cgColor
        manualTextField.leftView = UIView(frame: CGRect(x: 0, y: 0, width: 14, height: 10))
        manualTextField.leftViewMode = .always
        manualTextField.autocapitalizationType = .allCharacters
        manualTextField.translatesAutoresizingMaskIntoConstraints = false

        processButton.setTitle("Process", for: .normal)
        processButton.titleLabel?.font = .systemFont(ofSize: 13.5, weight: .bold)
        processButton.setTitleColor(.white, for: .normal)
        processButton.backgroundColor = UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1)
        processButton.layer.cornerRadius = 12
        processButton.addTarget(self, action: #selector(didTapProcess), for: .touchUpInside)
        processButton.translatesAutoresizingMaskIntoConstraints = false

        let manualHStack = UIStackView(arrangedSubviews: [manualTextField, processButton])
        manualHStack.axis = .horizontal
        manualHStack.spacing = 8
        manualHStack.alignment = .fill
        manualHStack.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(manualHStack)

        NSLayoutConstraint.activate([
            grabber.topAnchor.constraint(equalTo: view.topAnchor, constant: 10),
            grabber.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            grabber.widthAnchor.constraint(equalToConstant: 44),
            grabber.heightAnchor.constraint(equalToConstant: 5),

            headerHStack.topAnchor.constraint(equalTo: grabber.bottomAnchor, constant: 12),
            headerHStack.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 20),
            headerHStack.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -20),

            iconBg.widthAnchor.constraint(equalToConstant: 38),
            iconBg.heightAnchor.constraint(equalToConstant: 38),
            qrIcon.centerXAnchor.constraint(equalTo: iconBg.centerXAnchor),
            qrIcon.centerYAnchor.constraint(equalTo: iconBg.centerYAnchor),
            qrIcon.widthAnchor.constraint(equalToConstant: 20),
            qrIcon.heightAnchor.constraint(equalToConstant: 20),

            closeBtn.widthAnchor.constraint(equalToConstant: 36),
            closeBtn.heightAnchor.constraint(equalToConstant: 36),

            divider.topAnchor.constraint(equalTo: headerHStack.bottomAnchor, constant: 14),
            divider.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            divider.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            divider.heightAnchor.constraint(equalToConstant: 1),

            chipsScrollView.topAnchor.constraint(equalTo: divider.bottomAnchor, constant: 14),
            chipsScrollView.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 20),
            chipsScrollView.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -20),
            chipsScrollView.heightAnchor.constraint(equalToConstant: 34),

            chipsStack.topAnchor.constraint(equalTo: chipsScrollView.topAnchor),
            chipsStack.bottomAnchor.constraint(equalTo: chipsScrollView.bottomAnchor),
            chipsStack.leadingAnchor.constraint(equalTo: chipsScrollView.leadingAnchor),
            chipsStack.trailingAnchor.constraint(equalTo: chipsScrollView.trailingAnchor),
            chipsStack.heightAnchor.constraint(equalTo: chipsScrollView.heightAnchor),

            viewfinderBox.topAnchor.constraint(equalTo: chipsScrollView.bottomAnchor, constant: 16),
            viewfinderBox.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 20),
            viewfinderBox.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -20),
            viewfinderBox.heightAnchor.constraint(equalToConstant: 210),

            bgOverlay.centerXAnchor.constraint(equalTo: viewfinderBox.centerXAnchor),
            bgOverlay.centerYAnchor.constraint(equalTo: viewfinderBox.centerYAnchor),
            bgOverlay.widthAnchor.constraint(equalToConstant: 140),
            bgOverlay.heightAnchor.constraint(equalToConstant: 140),

            laserLine.leadingAnchor.constraint(equalTo: viewfinderBox.leadingAnchor, constant: 30),
            laserLine.trailingAnchor.constraint(equalTo: viewfinderBox.trailingAnchor, constant: -30),
            laserLine.heightAnchor.constraint(equalToConstant: 2),
            laserLine.centerYAnchor.constraint(equalTo: viewfinderBox.centerYAnchor),

            hintLabel.bottomAnchor.constraint(equalTo: viewfinderBox.bottomAnchor, constant: -14),
            hintLabel.centerXAnchor.constraint(equalTo: viewfinderBox.centerXAnchor),
            hintLabel.heightAnchor.constraint(equalToConstant: 28),
            hintLabel.widthAnchor.constraint(greaterThanOrEqualToConstant: 240),

            flashButton.topAnchor.constraint(equalTo: viewfinderBox.topAnchor, constant: 12),
            flashButton.trailingAnchor.constraint(equalTo: viewfinderBox.trailingAnchor, constant: -12),
            flashButton.widthAnchor.constraint(equalToConstant: 36),
            flashButton.heightAnchor.constraint(equalToConstant: 36),

            manualHStack.topAnchor.constraint(equalTo: viewfinderBox.bottomAnchor, constant: 16),
            manualHStack.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 20),
            manualHStack.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -20),
            manualHStack.heightAnchor.constraint(equalToConstant: 46),
            manualHStack.bottomAnchor.constraint(lessThanOrEqualTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -20),

            processButton.widthAnchor.constraint(equalToConstant: 90),
        ])
    }

    private func setupChip(_ btn: UIButton, title: String, mode: String, active: Bool) {
        btn.setTitle(title, for: .normal)
        btn.titleLabel?.font = .systemFont(ofSize: 12, weight: .bold)
        btn.layer.cornerRadius = 17
        btn.contentEdgeInsets = UIEdgeInsets(top: 0, left: 14, bottom: 0, right: 14)
        btn.accessibilityIdentifier = mode
        btn.addTarget(self, action: #selector(didTapChip(_:)), for: .touchUpInside)

        if active {
            btn.backgroundColor = UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1)
            btn.setTitleColor(.white, for: .normal)
        } else {
            btn.backgroundColor = UIColor(red: 0.949, green: 0.961, blue: 0.976, alpha: 1)
            btn.setTitleColor(UIColor(red: 0.278, green: 0.333, blue: 0.412, alpha: 1), for: .normal)
        }
    }

    @objc private func didTapChip(_ sender: UIButton) {
        guard let mode = sender.accessibilityIdentifier else { return }
        activeMode = mode

        [chipSample, chipPatient, chipReport, chipWebSync].forEach { btn in
            let isActive = btn == sender
            btn.backgroundColor = isActive ? UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1) : UIColor(red: 0.949, green: 0.961, blue: 0.976, alpha: 1)
            btn.setTitleColor(isActive ? .white : UIColor(red: 0.278, green: 0.333, blue: 0.412, alpha: 1), for: .normal)
        }

        switch mode {
        case "SAMPLE":
            hintLabel.text = "Align sample vial barcode within frame"
            manualTextField.placeholder = "Enter Sample ID (e.g. SMP-10023)"
        case "PATIENT":
            hintLabel.text = "Align patient UHID / Requisition QR within frame"
            manualTextField.placeholder = "Enter UHID / Phone (e.g. UHID-9021)"
        case "REPORT":
            hintLabel.text = "Align Report verification QR within frame"
            manualTextField.placeholder = "Enter Report Tracking Code"
        case "WEBSYNC":
            hintLabel.text = "Scan web login QR on your computer screen"
            manualTextField.placeholder = "Enter 6-digit Web Sync Code"
        default:
            break
        }
    }

    private func startLaserAnimation() {
        let anim = CABasicAnimation(keyPath: "transform.translation.y")
        anim.fromValue = -50
        anim.toValue = 50
        anim.duration = 1.2
        anim.autoreverses = true
        anim.repeatCount = .infinity
        anim.timingFunction = CAMediaTimingFunction(name: .easeInEaseOut)
        laserLine.layer.add(anim, forKey: "laserScan")
    }

    @objc private func didTapFlash() {
        isFlashOn.toggle()
        flashButton.tintColor = isFlashOn ? .systemYellow : .white
    }

    @objc private func didTapProcess() {
        let text = manualTextField.text?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        guard !text.isEmpty else { return }

        dismiss(animated: true) { [weak self] in
            guard let self = self else { return }
            self.onCodeScanned?(text, self.activeMode)
        }
    }

    @objc private func didTapClose() {
        dismiss(animated: true, completion: nil)
    }
}
