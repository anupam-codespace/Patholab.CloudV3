import UIKit
import AVFoundation

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  QRScannerViewController — Full-Screen UPI & Barcode Scanner (iOS)
 *  Exact 1:1 visual match to user's screenshot with Neon Corner Brackets.
 * ═══════════════════════════════════════════════════════════════════════════
 */
class QRScannerViewController: UIViewController, AVCaptureMetadataOutputObjectsDelegate, UIImagePickerControllerDelegate, UINavigationControllerDelegate {

    private var captureSession: AVCaptureSession?
    private var previewLayer: AVCaptureVideoPreviewLayer?
    private var isTorchOn = false

    private let cameraContainer = UIView()
    private let torchButton = UIButton(type: .custom)
    private let laserLine = UIView()

    override var preferredStatusBarStyle: UIStatusBarStyle {
        return .lightContent
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 0.165, green: 0.078, blue: 0.933, alpha: 1) // Vibrant electric blue

        setupGradientBackground()
        setupUI()
        setupCamera()
        startLaserAnimation()
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        if captureSession?.isRunning == false {
            DispatchQueue.global(qos: .userInitiated).async { [weak self] in
                self?.captureSession?.startRunning()
            }
        }
    }

    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        if isTorchOn { toggleTorch() }
        if captureSession?.isRunning == true {
            captureSession?.stopRunning()
        }
    }

    private func setupGradientBackground() {
        let gradient = CAGradientLayer()
        gradient.colors = [
            UIColor(red: 0.165, green: 0.078, blue: 0.933, alpha: 1).cgColor,
            UIColor(red: 0.125, green: 0.055, blue: 0.851, alpha: 1).cgColor,
            UIColor(red: 0.094, green: 0.031, blue: 0.769, alpha: 1).cgColor
        ]
        gradient.locations = [0.0, 0.5, 1.0]
        gradient.frame = UIScreen.main.bounds
        view.layer.insertSublayer(gradient, at: 0)
    }

    private func setupUI() {
        // ── 1. Top Action Bar ───────────────────────────────────────────────
        let backButton = UIButton(type: .system)
        backButton.setImage(UIImage(systemName: "chevron.backward"), for: .normal)
        backButton.tintColor = .white
        backButton.addTarget(self, action: #selector(didTapBack), for: .touchUpInside)
        backButton.translatesAutoresizingMaskIntoConstraints = false

        torchButton.setImage(UIImage(systemName: "lightbulb"), for: .normal)
        torchButton.tintColor = .white
        torchButton.addTarget(self, action: #selector(toggleTorch), for: .touchUpInside)
        torchButton.translatesAutoresizingMaskIntoConstraints = false

        let uploadButton = UIButton(type: .system)
        uploadButton.setImage(UIImage(systemName: "square.and.arrow.up"), for: .normal)
        uploadButton.tintColor = .white
        uploadButton.addTarget(self, action: #selector(didTapUpload), for: .touchUpInside)
        uploadButton.translatesAutoresizingMaskIntoConstraints = false

        let topHStack = UIStackView(arrangedSubviews: [backButton, UIView(), torchButton, uploadButton])
        topHStack.axis = .horizontal
        topHStack.spacing = 16
        topHStack.alignment = .center
        topHStack.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(topHStack)

        // ── 2. Center Viewfinder ────────────────────────────────────────────
        let viewfinderBox = UIView()
        viewfinderBox.backgroundColor = .clear
        viewfinderBox.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(viewfinderBox)

        cameraContainer.backgroundColor = UIColor(red: 0.08, green: 0.11, blue: 0.18, alpha: 1)
        cameraContainer.layer.cornerRadius = 24
        cameraContainer.clipsToBounds = true
        cameraContainer.translatesAutoresizingMaskIntoConstraints = false
        viewfinderBox.addSubview(cameraContainer)

        // Neon Lime Green Viewfinder Overlay View
        let neonOverlay = NeonCornerBracketsView()
        neonOverlay.backgroundColor = .clear
        neonOverlay.translatesAutoresizingMaskIntoConstraints = false
        viewfinderBox.addSubview(neonOverlay)

        // Laser scan line
        laserLine.backgroundColor = UIColor(red: 0.639, green: 0.902, blue: 0.208, alpha: 1) // #A3E635
        laserLine.layer.shadowColor = UIColor(red: 0.639, green: 0.902, blue: 0.208, alpha: 1).cgColor
        laserLine.layer.shadowRadius = 5
        laserLine.layer.shadowOpacity = 0.9
        laserLine.layer.shadowOffset = .zero
        laserLine.translatesAutoresizingMaskIntoConstraints = false
        viewfinderBox.addSubview(laserLine)

        // ── 3. Bottom Branding Section ──────────────────────────────────────
        let bhimLabel = UILabel()
        bhimLabel.text = "BHIM"
        bhimLabel.font = .italicSystemFont(ofSize: 18)
        bhimLabel.textColor = .white

        let brandDivider = UIView()
        brandDivider.backgroundColor = UIColor.white.withAlphaComponent(0.8)
        brandDivider.translatesAutoresizingMaskIntoConstraints = false

        let upiLabel = UILabel()
        upiLabel.text = "UPI ▶"
        upiLabel.font = .italicSystemFont(ofSize: 18)
        upiLabel.textColor = UIColor(red: 0.133, green: 0.773, blue: 0.369, alpha: 1) // Green

        let bhimUpiRow = UIStackView(arrangedSubviews: [bhimLabel, brandDivider, upiLabel])
        bhimUpiRow.axis = .horizontal
        bhimUpiRow.spacing = 8
        bhimUpiRow.alignment = .center
        bhimUpiRow.translatesAutoresizingMaskIntoConstraints = false

        let scanSubtitle = UILabel()
        scanSubtitle.text = "Scan any UPI QR code to pay"
        scanSubtitle.font = .systemFont(ofSize: 13.5, weight: .medium)
        scanSubtitle.textColor = UIColor.white.withAlphaComponent(0.9)
        scanSubtitle.textAlignment = .center
        scanSubtitle.translatesAutoresizingMaskIntoConstraints = false

        // Bottom Apps Row
        let superMoneyLbl = UILabel()
        superMoneyLbl.text = "◆ super\n  money"
        superMoneyLbl.numberOfLines = 2
        superMoneyLbl.font = .systemFont(ofSize: 10.5, weight: .bold)
        superMoneyLbl.textColor = .white

        let paytmLbl = UILabel()
        paytmLbl.text = "Paytm"
        paytmLbl.font = .systemFont(ofSize: 14, weight: .black)
        paytmLbl.textColor = .white

        let gpayLbl = UILabel()
        gpayLbl.text = "Google Pay"
        gpayLbl.font = .systemFont(ofSize: 13.5, weight: .bold)
        gpayLbl.textColor = .white

        let phonePeLbl = UILabel()
        phonePeLbl.text = "PhonePe"
        phonePeLbl.font = .systemFont(ofSize: 13.5, weight: .black)
        phonePeLbl.textColor = .white

        let appsHStack = UIStackView(arrangedSubviews: [superMoneyLbl, paytmLbl, gpayLbl, phonePeLbl])
        appsHStack.axis = .horizontal
        appsHStack.spacing = 16
        appsHStack.alignment = .center
        appsHStack.distribution = .equalCentering
        appsHStack.translatesAutoresizingMaskIntoConstraints = false

        let bottomVStack = UIStackView(arrangedSubviews: [bhimUpiRow, scanSubtitle, appsHStack])
        bottomVStack.axis = .vertical
        bottomVStack.spacing = 12
        bottomVStack.alignment = .center
        bottomVStack.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(bottomVStack)

        NSLayoutConstraint.activate([
            topHStack.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 12),
            topHStack.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 20),
            topHStack.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -20),
            topHStack.heightAnchor.constraint(equalToConstant: 44),

            backButton.widthAnchor.constraint(equalToConstant: 40),
            backButton.heightAnchor.constraint(equalToConstant: 40),
            torchButton.widthAnchor.constraint(equalToConstant: 40),
            torchButton.heightAnchor.constraint(equalToConstant: 40),
            uploadButton.widthAnchor.constraint(equalToConstant: 40),
            uploadButton.heightAnchor.constraint(equalToConstant: 40),

            viewfinderBox.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            viewfinderBox.centerYAnchor.constraint(equalTo: view.centerYAnchor, constant: -40),
            viewfinderBox.widthAnchor.constraint(equalToConstant: 280),
            viewfinderBox.heightAnchor.constraint(equalToConstant: 280),

            cameraContainer.centerXAnchor.constraint(equalTo: viewfinderBox.centerXAnchor),
            cameraContainer.centerYAnchor.constraint(equalTo: viewfinderBox.centerYAnchor),
            cameraContainer.widthAnchor.constraint(equalToConstant: 260),
            cameraContainer.heightAnchor.constraint(equalToConstant: 260),

            neonOverlay.topAnchor.constraint(equalTo: viewfinderBox.topAnchor),
            neonOverlay.bottomAnchor.constraint(equalTo: viewfinderBox.bottomAnchor),
            neonOverlay.leadingAnchor.constraint(equalTo: viewfinderBox.leadingAnchor),
            neonOverlay.trailingAnchor.constraint(equalTo: viewfinderBox.trailingAnchor),

            laserLine.leadingAnchor.constraint(equalTo: viewfinderBox.leadingAnchor, constant: 25),
            laserLine.trailingAnchor.constraint(equalTo: viewfinderBox.trailingAnchor, constant: -25),
            laserLine.heightAnchor.constraint(equalToConstant: 2.5),
            laserLine.centerYAnchor.constraint(equalTo: viewfinderBox.centerYAnchor),

            brandDivider.widthAnchor.constraint(equalToConstant: 1.5),
            brandDivider.heightAnchor.constraint(equalToConstant: 18),

            bottomVStack.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -24),
            bottomVStack.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 24),
            bottomVStack.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -24),

            appsHStack.widthAnchor.constraint(equalTo: bottomVStack.widthAnchor),
        ])
    }

    private func setupCamera() {
        guard let videoCaptureDevice = AVCaptureDevice.default(for: .video) else { return }
        let videoInput: AVCaptureDeviceInput

        do {
            videoInput = try AVCaptureDeviceInput(device: videoCaptureDevice)
        } catch {
            return
        }

        let session = AVCaptureSession()
        if session.canAddInput(videoInput) {
            session.addInput(videoInput)
        } else {
            return
        }

        let metadataOutput = AVCaptureMetadataOutput()
        if session.canAddOutput(metadataOutput) {
            session.addOutput(metadataOutput)
            metadataOutput.setMetadataObjectsDelegate(self, queue: DispatchQueue.main)
            metadataOutput.metadataObjectTypes = [.qr, .ean8, .ean13, .code128, .code39]
        } else {
            return
        }

        let preview = AVCaptureVideoPreviewLayer(session: session)
        preview.frame = CGRect(x: 0, y: 0, width: 260, height: 260)
        preview.videoGravity = .resizeAspectFill
        cameraContainer.layer.addSublayer(preview)

        self.captureSession = session
        self.previewLayer = preview

        DispatchQueue.global(qos: .userInitiated).async {
            session.startRunning()
        }
    }

    private func startLaserAnimation() {
        let anim = CABasicAnimation(keyPath: "transform.translation.y")
        anim.fromValue = -110
        anim.toValue = 110
        anim.duration = 1.3
        anim.autoreverses = true
        anim.repeatCount = .infinity
        anim.timingFunction = CAMediaTimingFunction(name: .easeInEaseOut)
        laserLine.layer.add(anim, forKey: "laserAnim")
    }

    @objc private func toggleTorch() {
        guard let device = AVCaptureDevice.default(for: .video), device.hasTorch else { return }
        do {
            try device.lockForConfiguration()
            isTorchOn.toggle()
            device.torchMode = isTorchOn ? .on : .off
            device.unlockForConfiguration()
            torchButton.tintColor = isTorchOn ? .systemYellow : .white
        } catch {}
    }

    @objc private func didTapUpload() {
        let picker = UIImagePickerController()
        picker.delegate = self
        picker.sourceType = .photoLibrary
        present(picker, animated: true, completion: nil)
    }

    @objc private func didTapBack() {
        dismiss(animated: true, completion: nil)
    }

    func metadataOutput(_ output: AVCaptureMetadataOutput, didOutput metadataObjects: [AVMetadataObject], from connection: AVCaptureConnection) {
        if let metadataObject = metadataObjects.first {
            guard let readableObject = metadataObject as? AVMetadataMachineReadableCodeObject else { return }
            guard let stringValue = readableObject.stringValue else { return }
            AudioServicesPlaySystemSound(SystemSoundID(kSystemSoundID_Vibrate))
            captureSession?.stopRunning()
            handleScannedCode(stringValue)
        }
    }

    private func handleScannedCode(_ code: String) {
        if code.starts(with: "upi://") {
            if let url = URL(string: code), UIApplication.shared.canOpenURL(url) {
                UIApplication.shared.open(url, options: [:], completionHandler: nil)
            } else {
                let alert = UIAlertController(title: "UPI Payment", message: "Scanned UPI QR: \(code)", preferredStyle: .alert)
                alert.addAction(UIAlertAction(title: "OK", style: .default) { [weak self] _ in
                    self?.dismiss(animated: true, completion: nil)
                })
                present(alert, animated: true, completion: nil)
            }
        } else {
            let alert = UIAlertController(title: "QR / Barcode Scanned", message: code, preferredStyle: .alert)
            alert.addAction(UIAlertAction(title: "OK", style: .default) { [weak self] _ in
                self?.dismiss(animated: true, completion: nil)
            })
            present(alert, animated: true, completion: nil)
        }
    }

    func imagePickerController(_ picker: UIImagePickerController, didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey : Any]) {
        picker.dismiss(animated: true, completion: nil)
        AudioServicesPlaySystemSound(SystemSoundID(kSystemSoundID_Vibrate))
    }
}

/**
 * Custom UIView that draws thick neon green rounded corner brackets matching the user's screenshot.
 */
class NeonCornerBracketsView: UIView {
    override func draw(_ rect: CGRect) {
        guard let ctx = UIGraphicsGetCurrentContext() else { return }
        let strokeColor = UIColor(red: 0.639, green: 0.902, blue: 0.208, alpha: 1) // #A3E635 Neon lime
        ctx.setStrokeColor(strokeColor.cgColor)
        ctx.setLineWidth(6.0)
        ctx.setLineCap(.round)
        ctx.setLineJoin(.round)

        let cornerRadius: CGFloat = 20.0
        let armLength: CGFloat = 38.0
        let offset: CGFloat = 10.0

        let w = rect.width
        let h = rect.height

        // Top-Left
        let tlPath = UIBezierPath()
        tlPath.move(to: CGPoint(x: offset, y: offset + cornerRadius + armLength))
        tlPath.addLine(to: CGPoint(x: offset, y: offset + cornerRadius))
        tlPath.addArc(withCenter: CGPoint(x: offset + cornerRadius, y: offset + cornerRadius),
                      radius: cornerRadius, startAngle: .pi, endAngle: .pi * 1.5, clockwise: true)
        tlPath.addLine(to: CGPoint(x: offset + cornerRadius + armLength, y: offset))
        strokeColor.setStroke()
        tlPath.lineWidth = 6.0
        tlPath.lineCapStyle = .round
        tlPath.stroke()

        // Top-Right
        let trPath = UIBezierPath()
        trPath.move(to: CGPoint(x: w - offset - cornerRadius - armLength, y: offset))
        trPath.addLine(to: CGPoint(x: w - offset - cornerRadius, y: offset))
        trPath.addArc(withCenter: CGPoint(x: w - offset - cornerRadius, y: offset + cornerRadius),
                      radius: cornerRadius, startAngle: .pi * 1.5, endAngle: 0, clockwise: true)
        trPath.addLine(to: CGPoint(x: w - offset, y: offset + cornerRadius + armLength))
        trPath.lineWidth = 6.0
        trPath.lineCapStyle = .round
        trPath.stroke()

        // Bottom-Left
        let blPath = UIBezierPath()
        blPath.move(to: CGPoint(x: offset, y: h - offset - cornerRadius - armLength))
        blPath.addLine(to: CGPoint(x: offset, y: h - offset - cornerRadius))
        blPath.addArc(withCenter: CGPoint(x: offset + cornerRadius, y: h - offset - cornerRadius),
                      radius: cornerRadius, startAngle: .pi, endAngle: .pi * 0.5, clockwise: false)
        blPath.addLine(to: CGPoint(x: offset + cornerRadius + armLength, y: h - offset))
        blPath.lineWidth = 6.0
        blPath.lineCapStyle = .round
        blPath.stroke()

        // Bottom-Right
        let brPath = UIBezierPath()
        brPath.move(to: CGPoint(x: w - offset - cornerRadius - armLength, y: h - offset))
        brPath.addLine(to: CGPoint(x: w - offset - cornerRadius, y: h - offset))
        brPath.addArc(withCenter: CGPoint(x: w - offset - cornerRadius, y: h - offset - cornerRadius),
                      radius: cornerRadius, startAngle: .pi * 0.5, endAngle: 0, clockwise: false)
        brPath.addLine(to: CGPoint(x: w - offset, y: h - offset - cornerRadius - armLength))
        brPath.lineWidth = 6.0
        brPath.lineCapStyle = .round
        brPath.stroke()
    }
}
