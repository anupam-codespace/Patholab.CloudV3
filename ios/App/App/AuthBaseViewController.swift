import UIKit

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

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = AuthBaseViewController.indigoPrimary
        setupStatusBar()
        setupHeaderBackground()
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

// MARK: – Find active first responder in view hierarchy
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
}
