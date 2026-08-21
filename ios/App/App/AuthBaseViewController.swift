import UIKit
import AVFoundation

/// Shared base class for all auth screens.
/// Provides the common indigo header + white rounded-top card layout,
/// and shared UI helpers (error banners, loading state, etc.).
class AuthBaseViewController: UIViewController {

    deinit {
        NotificationCenter.default.removeObserver(self)
    }

    // MARK: – Brand colours
    static let indigoPrimary = UIColor(red: 55/255, green: 48/255, blue: 163/255, alpha: 1)
    static let indigoDark    = UIColor(red: 49/255, green: 46/255, blue: 129/255, alpha: 1)
    static let indigoMid     = UIColor(red: 67/255, green: 56/255, blue: 202/255, alpha: 1)
    static let inputBg       = UIColor(red: 245/255, green: 245/255, blue: 247/255, alpha: 1)
    static let textPrimary   = UIColor(red: 31/255,  green: 41/255,  blue: 55/255,  alpha: 1)
    static let textSecondary = UIColor(red: 107/255, green: 114/255, blue: 128/255, alpha: 1)
    static let textHint      = UIColor(red: 156/255, green: 163/255, blue: 175/255, alpha: 1)
    static let errorRed      = UIColor(red: 220/255, green: 38/255,  blue: 38/255,  alpha: 1)
    static let errorBg       = UIColor(red: 254/255, green: 242/255, blue: 242/255, alpha: 1)
    static let successGreen  = UIColor(red: 22/255,  green: 163/255, blue: 74/255,  alpha: 1)
    static let successBg     = UIColor(red: 240/255, green: 253/255, blue: 244/255, alpha: 1)

    // MARK: – Common layout containers
    var headerView = UIView()
    var cardScrollView = UIScrollView()
    var cardContentView = UIView()
    var errorBanner = UIView()
    var errorLabel = UILabel()

    // MARK: – Background video player
    private var videoPlayer: AVQueuePlayer?
    private var videoPlayerLayer: AVPlayerLayer?
    private var videoLooper: AVPlayerLooper?

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = AuthBaseViewController.indigoPrimary
        setupStatusBar()
        setupVideoBackground()
        setupHeaderBackground()
    }

    private func setupVideoBackground() {
        guard let url = Bundle.main.url(forResource: "auth_bg", withExtension: "mp4") else { return }
        let item = AVPlayerItem(url: url)
        let player = AVQueuePlayer(playerItem: item)
        videoLooper = AVPlayerLooper(player: player, templateItem: item)
        videoPlayer = player

        let layer = AVPlayerLayer(player: player)
        layer.videoGravity = .resizeAspectFill
        layer.opacity = 0.10
        view.layer.insertSublayer(layer, at: 0)
        videoPlayerLayer = layer

        player.isMuted = true
        player.play()
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        videoPlayerLayer?.frame = view.bounds
    }

    private func setupStatusBar() {
        // Use full-screen and make status bar light
        if #available(iOS 13.0, *) {
            overrideUserInterfaceStyle = .light
        }
        setNeedsStatusBarAppearanceUpdate()
    }

    override var preferredStatusBarStyle: UIStatusBarStyle { .lightContent }

    private func setupHeaderBackground() {
        let gradient = CAGradientLayer()
        gradient.colors = [
            UIColor(red: 55/255, green: 48/255, blue: 163/255, alpha: 1).cgColor,
            UIColor(red: 67/255, green: 56/255, blue: 202/255, alpha: 1).cgColor
        ]
        gradient.startPoint = CGPoint(x: 0, y: 0)
        gradient.endPoint   = CGPoint(x: 1, y: 1)
        gradient.frame = view.bounds
        view.layer.insertSublayer(gradient, at: 0)
    }

    // MARK: – White Card Setup

    func setupCard(below anchorView: UIView, in parent: UIView) {
        cardScrollView.translatesAutoresizingMaskIntoConstraints = false
        cardScrollView.backgroundColor = .white
        cardScrollView.layer.cornerRadius = 32
        cardScrollView.layer.maskedCorners = [.layerMinXMinYCorner, .layerMaxXMinYCorner]
        cardScrollView.showsVerticalScrollIndicator = false
        cardScrollView.alwaysBounceVertical = true
        parent.addSubview(cardScrollView)

        cardContentView.translatesAutoresizingMaskIntoConstraints = false
        cardScrollView.addSubview(cardContentView)

        NSLayoutConstraint.activate([
            cardScrollView.topAnchor.constraint(equalTo: anchorView.bottomAnchor),
            cardScrollView.leadingAnchor.constraint(equalTo: parent.leadingAnchor),
            cardScrollView.trailingAnchor.constraint(equalTo: parent.trailingAnchor),
            cardScrollView.bottomAnchor.constraint(equalTo: parent.bottomAnchor),
            cardContentView.topAnchor.constraint(equalTo: cardScrollView.topAnchor),
            cardContentView.leadingAnchor.constraint(equalTo: cardScrollView.leadingAnchor),
            cardContentView.trailingAnchor.constraint(equalTo: cardScrollView.trailingAnchor),
            cardContentView.bottomAnchor.constraint(equalTo: cardScrollView.bottomAnchor),
            cardContentView.widthAnchor.constraint(equalTo: cardScrollView.widthAnchor)
        ])
    }

    // MARK: – UI Factory Methods

    func makeLabel(_ text: String, size: CGFloat = 14, weight: UIFont.Weight = .semibold, color: UIColor = AuthBaseViewController.textPrimary) -> UILabel {
        let l = UILabel()
        l.text = text
        l.font = .systemFont(ofSize: size, weight: weight)
        l.textColor = color
        l.translatesAutoresizingMaskIntoConstraints = false
        return l
    }

    func makeTextField(placeholder: String, isSecure: Bool = false, keyboardType: UIKeyboardType = .default) -> UITextField {
        let tf = UITextField()
        tf.placeholder = placeholder
        tf.isSecureTextEntry = isSecure
        tf.keyboardType = keyboardType
        tf.autocorrectionType = .no
        tf.autocapitalizationType = .none
        tf.backgroundColor = AuthBaseViewController.inputBg
        tf.layer.cornerRadius = 12
        tf.layer.masksToBounds = true
        tf.font = .systemFont(ofSize: 15)
        tf.textColor = AuthBaseViewController.textPrimary
        tf.attributedPlaceholder = NSAttributedString(
            string: placeholder,
            attributes: [.foregroundColor: AuthBaseViewController.textHint]
        )
        // Left padding
        let padding = UIView(frame: CGRect(x: 0, y: 0, width: 16, height: 1))
        tf.leftView = padding
        tf.leftViewMode = .always
        tf.translatesAutoresizingMaskIntoConstraints = false
        tf.heightAnchor.constraint(equalToConstant: 52).isActive = true
        return tf
    }

    func makePrimaryButton(title: String) -> UIButton {
        let btn = UIButton(type: .system)
        btn.setTitle(title, for: .normal)
        btn.setTitleColor(.white, for: .normal)
        btn.titleLabel?.font = .systemFont(ofSize: 16, weight: .bold)
        btn.layer.cornerRadius = 14
        btn.layer.masksToBounds = true
        btn.backgroundColor = AuthBaseViewController.indigoDark
        // Gradient
        let gradient = CAGradientLayer()
        gradient.colors = [
            AuthBaseViewController.indigoMid.cgColor,
            AuthBaseViewController.indigoPrimary.cgColor
        ]
        gradient.startPoint = CGPoint(x: 0, y: 0)
        gradient.endPoint   = CGPoint(x: 1, y: 1)
        gradient.cornerRadius = 14
        gradient.frame = CGRect(x: 0, y: 0, width: UIScreen.main.bounds.width - 48, height: 56)
        btn.layer.insertSublayer(gradient, at: 0)
        btn.translatesAutoresizingMaskIntoConstraints = false
        btn.heightAnchor.constraint(equalToConstant: 56).isActive = true
        return btn
    }

    func makeBackButton() -> UIButton {
        let btn = UIButton(type: .system)
        btn.setTitle("‹", for: .normal)
        btn.setTitleColor(.white, for: .normal)
        btn.titleLabel?.font = .systemFont(ofSize: 22, weight: .bold)
        btn.backgroundColor = UIColor(white: 1, alpha: 0.15)
        btn.layer.cornerRadius = 10
        btn.layer.masksToBounds = true
        btn.translatesAutoresizingMaskIntoConstraints = false
        btn.widthAnchor.constraint(equalToConstant: 40).isActive = true
        btn.heightAnchor.constraint(equalToConstant: 40).isActive = true
        return btn
    }

    func makeErrorBanner() -> (UIView, UILabel) {
        let container = UIView()
        container.backgroundColor = AuthBaseViewController.errorBg
        container.layer.cornerRadius = 12
        container.layer.borderWidth = 1
        container.layer.borderColor = UIColor(red: 252/255, green: 165/255, blue: 165/255, alpha: 1).cgColor
        container.isHidden = true
        container.translatesAutoresizingMaskIntoConstraints = false

        let label = UILabel()
        label.font = .systemFont(ofSize: 14, weight: .medium)
        label.textColor = AuthBaseViewController.errorRed
        label.numberOfLines = 0
        label.translatesAutoresizingMaskIntoConstraints = false
        container.addSubview(label)

        NSLayoutConstraint.activate([
            label.topAnchor.constraint(equalTo: container.topAnchor, constant: 12),
            label.bottomAnchor.constraint(equalTo: container.bottomAnchor, constant: -12),
            label.leadingAnchor.constraint(equalTo: container.leadingAnchor, constant: 14),
            label.trailingAnchor.constraint(equalTo: container.trailingAnchor, constant: -14)
        ])
        return (container, label)
    }

    func showError(_ message: String) {
        DispatchQueue.main.async {
            self.errorLabel.text = message
            self.errorLabel.textColor = AuthBaseViewController.errorRed
            self.errorBanner.backgroundColor = AuthBaseViewController.errorBg
            self.errorBanner.layer.borderColor = UIColor(red: 252/255, green: 165/255, blue: 165/255, alpha: 1).cgColor
            self.errorBanner.isHidden = false
        }
    }

    func showSuccess(_ message: String) {
        DispatchQueue.main.async {
            self.errorLabel.text = message
            self.errorLabel.textColor = AuthBaseViewController.successGreen
            self.errorBanner.backgroundColor = AuthBaseViewController.successBg
            self.errorBanner.layer.borderColor = UIColor(red: 187/255, green: 247/255, blue: 208/255, alpha: 1).cgColor
            self.errorBanner.isHidden = false
        }
    }

    func hideError() {
        DispatchQueue.main.async { self.errorBanner.isHidden = true }
    }

    func makeLegalFooter() -> UIView {
        let stack = UIStackView()
        stack.axis = .horizontal
        stack.alignment = .center
        stack.distribution = .fill
        stack.spacing = 6
        stack.translatesAutoresizingMaskIntoConstraints = false

        let linkColor = UIColor(red: 100/255, green: 116/255, blue: 139/255, alpha: 1) // Slate-500
        let linkFont = UIFont.systemFont(ofSize: 11, weight: .medium)

        let btnTerms = UIButton(type: .system)
        btnTerms.setTitle("Terms & Conditions", for: .normal)
        btnTerms.setTitleColor(linkColor, for: .normal)
        btnTerms.titleLabel?.font = linkFont
        btnTerms.addTarget(self, action: #selector(openTermsTapped), for: .touchUpInside)

        let dot1 = UILabel()
        dot1.text = "•"
        dot1.textColor = AuthBaseViewController.textHint
        dot1.font = .systemFont(ofSize: 10)

        let btnPrivacy = UIButton(type: .system)
        btnPrivacy.setTitle("Privacy Policy", for: .normal)
        btnPrivacy.setTitleColor(linkColor, for: .normal)
        btnPrivacy.titleLabel?.font = linkFont
        btnPrivacy.addTarget(self, action: #selector(openPrivacyTapped), for: .touchUpInside)

        let dot2 = UILabel()
        dot2.text = "•"
        dot2.textColor = AuthBaseViewController.textHint
        dot2.font = .systemFont(ofSize: 10)

        let btnRefunds = UIButton(type: .system)
        btnRefunds.setTitle("Refund Policy", for: .normal)
        btnRefunds.setTitleColor(linkColor, for: .normal)
        btnRefunds.titleLabel?.font = linkFont
        btnRefunds.addTarget(self, action: #selector(openRefundsTapped), for: .touchUpInside)

        stack.addArrangedSubview(btnTerms)
        stack.addArrangedSubview(dot1)
        stack.addArrangedSubview(btnPrivacy)
        stack.addArrangedSubview(dot2)
        stack.addArrangedSubview(btnRefunds)

        let container = UIView()
        container.translatesAutoresizingMaskIntoConstraints = false
        container.addSubview(stack)
        NSLayoutConstraint.activate([
            stack.centerXAnchor.constraint(equalTo: container.centerXAnchor),
            stack.topAnchor.constraint(equalTo: container.topAnchor),
            stack.bottomAnchor.constraint(equalTo: container.bottomAnchor),
            container.heightAnchor.constraint(equalToConstant: 20)
        ])
        return container
    }

    func makeLegalConsentBox() -> UIView {
        let container = UIView()
        container.backgroundColor = UIColor(red: 248/255, green: 250/255, blue: 252/255, alpha: 1)
        container.layer.cornerRadius = 10
        container.layer.borderWidth = 1
        container.layer.borderColor = UIColor(red: 241/255, green: 245/255, blue: 249/255, alpha: 1).cgColor
        container.translatesAutoresizingMaskIntoConstraints = false

        let label = UILabel()
        label.numberOfLines = 0
        label.textAlignment = .center
        label.font = .systemFont(ofSize: 11.5, weight: .regular)
        label.textColor = AuthBaseViewController.textSecondary
        label.translatesAutoresizingMaskIntoConstraints = false

        let fullText = "By creating an account, you agree to our Terms & Conditions, Privacy Policy, and Refund Policy."
        let attr = NSMutableAttributedString(string: fullText, attributes: [
            .foregroundColor: AuthBaseViewController.textSecondary,
            .font: UIFont.systemFont(ofSize: 11.5, weight: .regular)
        ])

        if let range = fullText.range(of: "Terms & Conditions") {
            attr.addAttribute(.foregroundColor, value: AuthBaseViewController.indigoMid, range: NSRange(range, in: fullText))
            attr.addAttribute(.font, value: UIFont.systemFont(ofSize: 11.5, weight: .bold), range: NSRange(range, in: fullText))
        }
        if let range = fullText.range(of: "Privacy Policy") {
            attr.addAttribute(.foregroundColor, value: AuthBaseViewController.indigoMid, range: NSRange(range, in: fullText))
            attr.addAttribute(.font, value: UIFont.systemFont(ofSize: 11.5, weight: .bold), range: NSRange(range, in: fullText))
        }
        if let range = fullText.range(of: "Refund Policy") {
            attr.addAttribute(.foregroundColor, value: AuthBaseViewController.indigoMid, range: NSRange(range, in: fullText))
            attr.addAttribute(.font, value: UIFont.systemFont(ofSize: 11.5, weight: .bold), range: NSRange(range, in: fullText))
        }
        label.attributedText = attr
        label.isUserInteractionEnabled = true
        label.addGestureRecognizer(UITapGestureRecognizer(target: self, action: #selector(openLegalTapped)))

        container.addSubview(label)
        NSLayoutConstraint.activate([
            label.topAnchor.constraint(equalTo: container.topAnchor, constant: 10),
            label.bottomAnchor.constraint(equalTo: container.bottomAnchor, constant: -10),
            label.leadingAnchor.constraint(equalTo: container.leadingAnchor, constant: 12),
            label.trailingAnchor.constraint(equalTo: container.trailingAnchor, constant: -12)
        ])
        return container
    }

    @objc func openTermsTapped() { openLegal(tab: 0) }
    @objc func openPrivacyTapped() { openLegal(tab: 1) }
    @objc func openRefundsTapped() { openLegal(tab: 2) }
    @objc func openLegalTapped() { openLegal(tab: 0) }

    func openLegal(tab: Int) {
        var urlString = "https://patholab.cloud/terms-conditions"
        if tab == 1 {
            urlString = "https://patholab.cloud/terms-conditions?tab=privacy"
        } else if tab == 2 {
            urlString = "https://patholab.cloud/terms-conditions?tab=refunds"
        } else {
            urlString = "https://patholab.cloud/terms-conditions?tab=terms"
        }
        if let url = URL(string: urlString) {
            UIApplication.shared.open(url, options: [:], completionHandler: nil)
        }
    }

    // MARK: – Keyboard avoidance

    func registerKeyboardObservers() {
        NotificationCenter.default.addObserver(
            self, selector: #selector(keyboardWillShow(_:)),
            name: UIResponder.keyboardWillShowNotification, object: nil
        )
        NotificationCenter.default.addObserver(
            self, selector: #selector(keyboardWillHide(_:)),
            name: UIResponder.keyboardWillHideNotification, object: nil
        )
    }

    @objc private func keyboardWillShow(_ notification: Notification) {
        guard let info = notification.userInfo,
              let height = (info[UIResponder.keyboardFrameEndUserInfoKey] as? NSValue)?.cgRectValue.height else { return }
        cardScrollView.contentInset.bottom = height + 20
        cardScrollView.verticalScrollIndicatorInsets.bottom = height
        
        if let activeField = view.firstResponder {
            let rect = cardScrollView.convert(activeField.bounds, from: activeField)
            let paddedRect = rect.insetBy(dx: 0, dy: -20)
            cardScrollView.scrollRectToVisible(paddedRect, animated: true)
        }
    }

    @objc private func keyboardWillHide(_ notification: Notification) {
        cardScrollView.contentInset.bottom = 0
        cardScrollView.verticalScrollIndicatorInsets.bottom = 0
    }

    // MARK: – Tap to dismiss keyboard
    func addDismissKeyboardGesture() {
        let tap = UITapGestureRecognizer(target: self, action: #selector(dismissKeyboard))
        tap.cancelsTouchesInView = false
        view.addGestureRecognizer(tap)
    }

    @objc func dismissKeyboard() {
        view.endEditing(true)
    }
}

// MARK: – Find active first responder in view hierarchy & UI Shimmer / Haptics Engine
extension UIView {
    var firstResponder: UIView? {
        if isFirstResponder { return self }
        for subview in subviews {
            if let responder = subview.firstResponder {
                return responder
            }
        }
        return nil
    }

    private static let shimmerLayerName = "ShimmerGradientLayer"

    /// Adds a modern sweeping gradient wave shimmer across this view.
    func startSkeletonShimmer(isDark: Bool = false) {
        stopSkeletonShimmer()

        let gradientLayer = CAGradientLayer()
        gradientLayer.name = UIView.shimmerLayerName

        let baseAlpha: CGFloat = isDark ? 0.30 : 0.50
        let highlightAlpha: CGFloat = isDark ? 0.65 : 0.90

        let baseColor = isDark
            ? UIColor(red: 51/255, green: 65/255, blue: 85/255, alpha: baseAlpha).cgColor
            : UIColor(red: 226/255, green: 232/255, blue: 240/255, alpha: baseAlpha).cgColor

        let highlightColor = isDark
            ? UIColor(red: 71/255, green: 85/255, blue: 105/255, alpha: highlightAlpha).cgColor
            : UIColor(red: 248/255, green: 250/255, blue: 252/255, alpha: highlightAlpha).cgColor

        gradientLayer.colors = [baseColor, highlightColor, baseColor]
        gradientLayer.locations = [0.0, 0.5, 1.0]
        gradientLayer.startPoint = CGPoint(x: 0.0, y: 0.5)
        gradientLayer.endPoint = CGPoint(x: 1.0, y: 0.5)
        gradientLayer.frame = bounds.isEmpty ? CGRect(x: 0, y: 0, width: 800, height: 1200) : bounds
        gradientLayer.cornerRadius = layer.cornerRadius

        let animation = CABasicAnimation(keyPath: "locations")
        animation.fromValue = [-1.0, -0.5, 0.0]
        animation.toValue = [1.0, 1.5, 2.0]
        animation.repeatCount = .infinity
        animation.duration = 1.25
        animation.isRemovedOnCompletion = false
        animation.timingFunction = CAMediaTimingFunction(name: .easeInEaseOut)

        gradientLayer.add(animation, forKey: "shimmerAnimation")
        layer.addSublayer(gradientLayer)
    }

    /// Stops and cleanly removes the shimmer layer.
    func stopSkeletonShimmer() {
        layer.sublayers?.removeAll { $0.name == UIView.shimmerLayerName }
    }

    /// Interactive spring press feedback (scale down with spring release).
    func triggerSpringPress(scale: CGFloat = 0.975, duration: TimeInterval = 0.18, completion: (() -> Void)? = nil) {
        UIView.animate(withDuration: duration / 2.0, delay: 0, options: [.curveEaseOut, .allowUserInteraction], animations: {
            self.transform = CGAffineTransform(scaleX: scale, y: scale)
        }) { _ in
            UIView.animate(withDuration: duration / 2.0, delay: 0, usingSpringWithDamping: 0.6, initialSpringVelocity: 0.8, options: [.allowUserInteraction], animations: {
                self.transform = .identity
            }) { _ in
                completion?()
            }
        }
    }
}

// MARK: – Native Haptic Engine Helpers
enum AppHaptics {
    static func selection() {
        let generator = UISelectionFeedbackGenerator()
        generator.prepare()
        generator.selectionChanged()
    }

    static func lightImpact() {
        let generator = UIImpactFeedbackGenerator(style: .light)
        generator.prepare()
        generator.impactOccurred()
    }

    static func mediumImpact() {
        let generator = UIImpactFeedbackGenerator(style: .medium)
        generator.prepare()
        generator.impactOccurred()
    }

    static func success() {
        let generator = UINotificationFeedbackGenerator()
        generator.prepare()
        generator.notificationOccurred(.success)
    }
}
