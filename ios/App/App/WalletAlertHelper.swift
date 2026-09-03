import UIKit

// ─────────────────────────────────────────────────────────────────────────────
// MARK: – Wallet Empty Bottom Toast Helper (iOS)
// Renders a bottom-slide-up floating notification when the laboratory wallet
// balance is zero, specifically during New Patient Registration.
// Only triggered from RegistrationViewController — NOT from home dashboard polling.
// ─────────────────────────────────────────────────────────────────────────────
public class WalletAlertHelper {

    private static var activeToastView: UIView?

    /**
     * Displays the custom floating BOTTOM toast card (slides up from below).
     * Red circle badge with ✕ and message locking paid registration actions.
     * Only call this from RegistrationViewController.
     */
    public static func showWalletEmptyToast(on viewController: UIViewController?, message: String = "Wallet balance is empty. Paid actions like Patient Registration are currently locked. Please recharge.") {
        guard let window = viewController?.view.window ?? UIApplication.shared.windows.first(where: { $0.isKeyWindow }) else {
            return
        }

        DispatchQueue.main.async {
            dismissCurrentToast()

            let card = UIView()
            card.backgroundColor = .white
            card.layer.cornerRadius = 16
            card.layer.borderWidth = 1
            card.layer.borderColor = UIColor(red: 0.85, green: 0.88, blue: 0.92, alpha: 1).cgColor
            card.layer.shadowColor = UIColor(red: 0.05, green: 0.15, blue: 0.30, alpha: 1).cgColor
            card.layer.shadowOpacity = 0.14
            card.layer.shadowRadius = 10
            card.layer.shadowOffset = CGSize(width: 0, height: 4)
            card.translatesAutoresizingMaskIntoConstraints = false

            // Red Bottom Accent Line
            let redAccent = UIView()
            redAccent.backgroundColor = UIColor(red: 0.996, green: 0.886, blue: 0.886, alpha: 1) // #FEE2E2
            redAccent.layer.cornerRadius = 2
            redAccent.translatesAutoresizingMaskIntoConstraints = false
            card.addSubview(redAccent)

            // Red Circle Badge with White ❌
            let redBadge = UIView()
            redBadge.backgroundColor = UIColor(red: 0.937, green: 0.267, blue: 0.267, alpha: 1) // #EF4444
            redBadge.layer.cornerRadius = 16
            redBadge.translatesAutoresizingMaskIntoConstraints = false
            card.addSubview(redBadge)

            let xIcon = UILabel()
            xIcon.text = "✕"
            xIcon.font = .systemFont(ofSize: 14, weight: .bold)
            xIcon.textColor = .white
            xIcon.textAlignment = .center
            xIcon.translatesAutoresizingMaskIntoConstraints = false
            redBadge.addSubview(xIcon)

            // Message Label
            let msgLbl = UILabel()
            msgLbl.text = message
            msgLbl.font = .systemFont(ofSize: 13.5, weight: .semibold)
            msgLbl.textColor = UIColor(red: 0.059, green: 0.090, blue: 0.165, alpha: 1)
            msgLbl.numberOfLines = 0
            msgLbl.lineBreakMode = .byWordWrapping
            msgLbl.translatesAutoresizingMaskIntoConstraints = false
            card.addSubview(msgLbl)

            NSLayoutConstraint.activate([
                redAccent.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 16),
                redAccent.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -16),
                redAccent.bottomAnchor.constraint(equalTo: card.bottomAnchor, constant: -2),
                redAccent.heightAnchor.constraint(equalToConstant: 2),

                redBadge.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 14),
                redBadge.topAnchor.constraint(equalTo: card.topAnchor, constant: 14),
                redBadge.widthAnchor.constraint(equalToConstant: 32),
                redBadge.heightAnchor.constraint(equalToConstant: 32),

                xIcon.centerXAnchor.constraint(equalTo: redBadge.centerXAnchor),
                xIcon.centerYAnchor.constraint(equalTo: redBadge.centerYAnchor),

                msgLbl.leadingAnchor.constraint(equalTo: redBadge.trailingAnchor, constant: 12),
                msgLbl.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -16),
                msgLbl.topAnchor.constraint(equalTo: card.topAnchor, constant: 12),
                msgLbl.bottomAnchor.constraint(equalTo: card.bottomAnchor, constant: -14),
            ])

            // Tap gesture to open Wallet
            let tap = UITapGestureRecognizer(target: self, action: #selector(didTapToast(_:)))
            card.addGestureRecognizer(tap)
            card.isUserInteractionEnabled = true

            window.addSubview(card)
            activeToastView = card

            // Anchor card at the BOTTOM of the screen (above home indicator / nav bar)
            NSLayoutConstraint.activate([
                card.bottomAnchor.constraint(equalTo: window.safeAreaLayoutGuide.bottomAnchor, constant: -16),
                card.leadingAnchor.constraint(equalTo: window.leadingAnchor, constant: 16),
                card.trailingAnchor.constraint(equalTo: window.trailingAnchor, constant: -16),
            ])

            // Initial state: start BELOW the screen, then slide UP
            card.transform = CGAffineTransform(translationX: 0, y: 200)
            card.alpha = 0

            // Spring slide-up animation from bottom
            UIView.animate(withDuration: 0.40, delay: 0, usingSpringWithDamping: 0.75, initialSpringVelocity: 0.6, options: .curveEaseOut, animations: {
                card.transform = .identity
                card.alpha = 1
            }, completion: nil)

            // Auto dismiss after 6.5 seconds
            DispatchQueue.main.asyncAfter(deadline: .now() + 6.5) {
                if activeToastView == card {
                    dismissCurrentToast()
                }
            }
        }
    }

    @objc private static func didTapToast(_ gr: UITapGestureRecognizer) {
        dismissCurrentToast()
        if let topVC = UIApplication.shared.windows.first(where: { $0.isKeyWindow })?.rootViewController {
            let walletVC = WalletViewController()
            walletVC.modalPresentationStyle = .fullScreen
            topVC.present(walletVC, animated: true, completion: nil)
        }
    }

    public static func dismissCurrentToast() {
        guard let toast = activeToastView else { return }
        // Slide back DOWN off the bottom of the screen
        UIView.animate(withDuration: 0.25, animations: {
            toast.transform = CGAffineTransform(translationX: 0, y: 200)
            toast.alpha = 0
        }) { _ in
            toast.removeFromSuperview()
            if activeToastView == toast {
                activeToastView = nil
            }
        }
    }
}
