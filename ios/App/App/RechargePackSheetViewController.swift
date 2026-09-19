import UIKit

// ─────────────────────────────────────────────────────────────────────────────
// MARK: – RechargePackSheetViewController
// Native Recharge Pack Selection Sheet matching Android's layout exactly:
//   - 4 pack cards (₹500, ₹1,000, ₹2,000, ₹5,000)
//   - 18% GST breakdown shown per card
//   - Selected card gets accent border + checkmark
//   - Prominent gradient "Proceed to Payment" CTA
// ─────────────────────────────────────────────────────────────────────────────
class RechargePackSheetViewController: UIViewController {

    var onPackSelected: ((Double) -> Void)?

    private struct Pack {
        let base: Double
        let gstRate: Double = 0.18
        var gstAmount: Double { base * gstRate }
        var total: Double { base + gstAmount }
        var patients: Int { Int(base / 2.5) }
        var label: String {
            switch base {
            case 500:  return "Starter"
            case 1000: return "Standard"
            case 2000: return "Growth"
            case 5000: return "Premium"
            default:   return "Pack"
            }
        }
        var badge: String? {
            switch base {
            case 2000: return "POPULAR"
            case 5000: return "BEST VALUE"
            default:   return nil
            }
        }
        var accentColor: UIColor {
            switch base {
            case 500:  return UIColor(red: 0.059, green: 0.651, blue: 0.420, alpha: 1)
            case 1000: return UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1)
            case 2000: return UIColor(red: 0.549, green: 0.235, blue: 0.980, alpha: 1)
            case 5000: return UIColor(red: 0.882, green: 0.388, blue: 0.153, alpha: 1)
            default:   return UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1)
            }
        }
    }

    private let packs: [Pack] = [
        Pack(base: 500), Pack(base: 1000), Pack(base: 2000), Pack(base: 5000)
    ]

    private var selectedIndex: Int = 1 // Default: Standard (₹1000)
    private var packCards: [UIView] = []
    private let proceedBtn = UIButton(type: .system)
    private let proceedGradient = CAGradientLayer()
    private let selectedAmountLabel = UILabel()

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 0.973, green: 0.980, blue: 0.988, alpha: 1)
        setupUI()
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        proceedGradient.frame = proceedBtn.bounds
    }

    private func setupUI() {
        let scrollView = UIScrollView()
        scrollView.showsVerticalScrollIndicator = false
        scrollView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(scrollView)

        let rootStack = UIStackView()
        rootStack.axis = .vertical
        rootStack.spacing = 0
        rootStack.translatesAutoresizingMaskIntoConstraints = false
        scrollView.addSubview(rootStack)

        NSLayoutConstraint.activate([
            scrollView.topAnchor.constraint(equalTo: view.topAnchor),
            scrollView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            scrollView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            scrollView.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor),
            rootStack.topAnchor.constraint(equalTo: scrollView.topAnchor),
            rootStack.leadingAnchor.constraint(equalTo: scrollView.leadingAnchor),
            rootStack.trailingAnchor.constraint(equalTo: scrollView.trailingAnchor),
            rootStack.bottomAnchor.constraint(equalTo: scrollView.bottomAnchor),
            rootStack.widthAnchor.constraint(equalTo: scrollView.widthAnchor)
        ])

        // ── Header ──────────────────────────────────────────────────────────
        let headerView = UIView()
        let titleLbl = UILabel()
        titleLbl.text = "Recharge Wallet"
        titleLbl.font = .systemFont(ofSize: 22, weight: .heavy)
        titleLbl.textColor = UIColor(red: 0.043, green: 0.118, blue: 0.302, alpha: 1)

        let subLbl = UILabel()
        subLbl.text = "Select a credit pack to top up your workspace"
        subLbl.font = .systemFont(ofSize: 13, weight: .medium)
        subLbl.textColor = UIColor(red: 0.392, green: 0.451, blue: 0.549, alpha: 1)
        subLbl.numberOfLines = 2

        let gstNote = UILabel()
        gstNote.text = "* Base prices + 18% GST as per government mandate"
        gstNote.font = .systemFont(ofSize: 11, weight: .medium)
        gstNote.textColor = UIColor(red: 0.600, green: 0.640, blue: 0.720, alpha: 1)

        let hdrStack = UIStackView(arrangedSubviews: [titleLbl, subLbl, gstNote])
        hdrStack.axis = .vertical
        hdrStack.spacing = 4
        hdrStack.setCustomSpacing(10, after: subLbl)
        hdrStack.translatesAutoresizingMaskIntoConstraints = false
        headerView.addSubview(hdrStack)
        NSLayoutConstraint.activate([
            hdrStack.topAnchor.constraint(equalTo: headerView.topAnchor, constant: 24),
            hdrStack.leadingAnchor.constraint(equalTo: headerView.leadingAnchor, constant: 20),
            hdrStack.trailingAnchor.constraint(equalTo: headerView.trailingAnchor, constant: -20),
            hdrStack.bottomAnchor.constraint(equalTo: headerView.bottomAnchor, constant: -8)
        ])
        rootStack.addArrangedSubview(headerView)

        // ── Pack Cards (2x2 grid) ────────────────────────────────────────────
        let packsContainer = UIView()
        let row1 = makePackRow()
        let row2 = makePackRow()
        packsContainer.addSubview(row1)
        packsContainer.addSubview(row2)

        for (index, pack) in packs.enumerated() {
            let card = buildPackCard(pack: pack, index: index)
            packCards.append(card)
            if index < 2 { row1.addArrangedSubview(card) }
            else          { row2.addArrangedSubview(card) }
        }

        NSLayoutConstraint.activate([
            row1.topAnchor.constraint(equalTo: packsContainer.topAnchor, constant: 16),
            row1.leadingAnchor.constraint(equalTo: packsContainer.leadingAnchor, constant: 16),
            row1.trailingAnchor.constraint(equalTo: packsContainer.trailingAnchor, constant: -16),
            row1.heightAnchor.constraint(equalToConstant: 158),
            row2.topAnchor.constraint(equalTo: row1.bottomAnchor, constant: 12),
            row2.leadingAnchor.constraint(equalTo: packsContainer.leadingAnchor, constant: 16),
            row2.trailingAnchor.constraint(equalTo: packsContainer.trailingAnchor, constant: -16),
            row2.heightAnchor.constraint(equalToConstant: 158),
            row2.bottomAnchor.constraint(equalTo: packsContainer.bottomAnchor, constant: -8)
        ])
        rootStack.addArrangedSubview(packsContainer)

        // ── Summary Card ────────────────────────────────────────────────────
        let summaryOuter = UIView()
        let summaryCard = UIView()
        summaryCard.backgroundColor = UIColor(red: 0.933, green: 0.961, blue: 1.0, alpha: 1)
        summaryCard.layer.cornerRadius = 16
        summaryCard.layer.borderWidth = 1
        summaryCard.layer.borderColor = UIColor(red: 0.188, green: 0.557, blue: 0.992, alpha: 0.20).cgColor
        summaryCard.translatesAutoresizingMaskIntoConstraints = false

        let summaryIcon = UIImageView(image: UIImage(systemName: "checkmark.shield.fill"))
        summaryIcon.tintColor = UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1)
        summaryIcon.contentMode = .scaleAspectFit
        summaryIcon.translatesAutoresizingMaskIntoConstraints = false

        selectedAmountLabel.font = .systemFont(ofSize: 13, weight: .semibold)
        selectedAmountLabel.textColor = UIColor(red: 0.059, green: 0.090, blue: 0.165, alpha: 1)
        selectedAmountLabel.numberOfLines = 2
        selectedAmountLabel.translatesAutoresizingMaskIntoConstraints = false

        summaryCard.addSubview(summaryIcon)
        summaryCard.addSubview(selectedAmountLabel)
        summaryOuter.addSubview(summaryCard)

        NSLayoutConstraint.activate([
            summaryCard.topAnchor.constraint(equalTo: summaryOuter.topAnchor, constant: 8),
            summaryCard.leadingAnchor.constraint(equalTo: summaryOuter.leadingAnchor, constant: 16),
            summaryCard.trailingAnchor.constraint(equalTo: summaryOuter.trailingAnchor, constant: -16),
            summaryCard.bottomAnchor.constraint(equalTo: summaryOuter.bottomAnchor, constant: -4),
            summaryCard.heightAnchor.constraint(equalToConstant: 60),
            summaryIcon.leadingAnchor.constraint(equalTo: summaryCard.leadingAnchor, constant: 14),
            summaryIcon.centerYAnchor.constraint(equalTo: summaryCard.centerYAnchor),
            summaryIcon.widthAnchor.constraint(equalToConstant: 24),
            summaryIcon.heightAnchor.constraint(equalToConstant: 24),
            selectedAmountLabel.leadingAnchor.constraint(equalTo: summaryIcon.trailingAnchor, constant: 10),
            selectedAmountLabel.centerYAnchor.constraint(equalTo: summaryCard.centerYAnchor),
            selectedAmountLabel.trailingAnchor.constraint(equalTo: summaryCard.trailingAnchor, constant: -14)
        ])
        rootStack.addArrangedSubview(summaryOuter)

        // ── Proceed Button ──────────────────────────────────────────────────
        let btnWrap = UIView()
        proceedBtn.layer.cornerRadius = 22
        proceedBtn.clipsToBounds = true
        proceedGradient.colors = [
            UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1).cgColor,
            UIColor(red: 0.310, green: 0.275, blue: 0.898, alpha: 1).cgColor
        ]
        proceedGradient.startPoint = CGPoint(x: 0, y: 0)
        proceedGradient.endPoint = CGPoint(x: 1, y: 1)
        proceedGradient.cornerRadius = 22
        proceedBtn.layer.insertSublayer(proceedGradient, at: 0)
        proceedBtn.setTitle("Proceed to Payment  →", for: .normal)
        proceedBtn.setTitleColor(.white, for: .normal)
        proceedBtn.titleLabel?.font = .systemFont(ofSize: 16, weight: .bold)
        proceedBtn.addTarget(self, action: #selector(proceedTapped), for: .touchUpInside)
        proceedBtn.translatesAutoresizingMaskIntoConstraints = false
        proceedBtn.layer.shadowColor = UIColor(red: 0.051, green: 0.431, blue: 0.992, alpha: 1).cgColor
        proceedBtn.layer.shadowOpacity = 0.35
        proceedBtn.layer.shadowRadius = 12
        proceedBtn.layer.shadowOffset = CGSize(width: 0, height: 6)
        proceedBtn.layer.masksToBounds = false

        let cancelBtn = UIButton(type: .system)
        cancelBtn.setTitle("Cancel", for: .normal)
        cancelBtn.setTitleColor(UIColor(red: 0.392, green: 0.451, blue: 0.549, alpha: 1), for: .normal)
        cancelBtn.titleLabel?.font = .systemFont(ofSize: 14, weight: .semibold)
        cancelBtn.addTarget(self, action: #selector(cancelTapped), for: .touchUpInside)
        cancelBtn.translatesAutoresizingMaskIntoConstraints = false

        btnWrap.addSubview(proceedBtn)
        btnWrap.addSubview(cancelBtn)
        NSLayoutConstraint.activate([
            proceedBtn.topAnchor.constraint(equalTo: btnWrap.topAnchor, constant: 12),
            proceedBtn.leadingAnchor.constraint(equalTo: btnWrap.leadingAnchor, constant: 16),
            proceedBtn.trailingAnchor.constraint(equalTo: btnWrap.trailingAnchor, constant: -16),
            proceedBtn.heightAnchor.constraint(equalToConstant: 54),
            cancelBtn.topAnchor.constraint(equalTo: proceedBtn.bottomAnchor, constant: 12),
            cancelBtn.centerXAnchor.constraint(equalTo: btnWrap.centerXAnchor),
            cancelBtn.bottomAnchor.constraint(equalTo: btnWrap.bottomAnchor, constant: -16)
        ])
        rootStack.addArrangedSubview(btnWrap)

        updateSelection()
    }

    private func makePackRow() -> UIStackView {
        let row = UIStackView()
        row.axis = .horizontal
        row.distribution = .fillEqually
        row.spacing = 12
        row.translatesAutoresizingMaskIntoConstraints = false
        return row
    }

    private func buildPackCard(pack: Pack, index: Int) -> UIView {
        let card = UIControl()
        card.backgroundColor = .white
        card.layer.cornerRadius = 18
        card.layer.borderWidth = 2
        card.layer.borderColor = UIColor(red: 0.88, green: 0.91, blue: 0.95, alpha: 1).cgColor
        card.layer.shadowColor = UIColor.black.cgColor
        card.layer.shadowOpacity = 0.05
        card.layer.shadowRadius = 6
        card.layer.shadowOffset = CGSize(width: 0, height: 3)
        card.tag = index
        card.addTarget(self, action: #selector(packCardTapped(_:)), for: .touchUpInside)

        // Badge pill
        let badgeLbl = UILabel()
        if let badge = pack.badge {
            badgeLbl.text = " \(badge) "
            badgeLbl.font = .systemFont(ofSize: 9, weight: .black)
            badgeLbl.textColor = pack.accentColor
            badgeLbl.backgroundColor = pack.accentColor.withAlphaComponent(0.12)
            badgeLbl.layer.cornerRadius = 7
            badgeLbl.clipsToBounds = true
            badgeLbl.textAlignment = .center
        } else {
            badgeLbl.text = " "
        }
        badgeLbl.font = .systemFont(ofSize: 9, weight: .black)

        let packNameLbl = UILabel()
        packNameLbl.text = pack.label.uppercased()
        packNameLbl.font = .systemFont(ofSize: 10.5, weight: .bold)
        packNameLbl.textColor = pack.accentColor

        let baseLbl = UILabel()
        baseLbl.text = "₹\(Int(pack.base))"
        baseLbl.font = .systemFont(ofSize: 26, weight: .black)
        baseLbl.textColor = UIColor(red: 0.059, green: 0.090, blue: 0.165, alpha: 1)
        baseLbl.adjustsFontSizeToFitWidth = true
        baseLbl.minimumScaleFactor = 0.7

        let gstLbl = UILabel()
        gstLbl.text = "+₹\(Int(pack.gstAmount)) GST (18%)"
        gstLbl.font = .systemFont(ofSize: 10.5, weight: .medium)
        gstLbl.textColor = UIColor(red: 0.580, green: 0.639, blue: 0.722, alpha: 1)

        let divider = UIView()
        divider.backgroundColor = UIColor(red: 0.88, green: 0.91, blue: 0.95, alpha: 1)
        divider.heightAnchor.constraint(equalToConstant: 1).isActive = true

        let totalLbl = UILabel()
        totalLbl.text = "Total: ₹\(Int(pack.total))"
        totalLbl.font = .systemFont(ofSize: 12.5, weight: .bold)
        totalLbl.textColor = pack.accentColor

        let patientsLbl = UILabel()
        patientsLbl.text = "~\(pack.patients) patients"
        patientsLbl.font = .systemFont(ofSize: 11, weight: .medium)
        patientsLbl.textColor = UIColor(red: 0.392, green: 0.451, blue: 0.549, alpha: 1)

        let checkIV = UIImageView(image: UIImage(systemName: "checkmark.circle.fill"))
        checkIV.contentMode = .scaleAspectFit
        checkIV.tintColor = pack.accentColor
        checkIV.isHidden = true
        checkIV.translatesAutoresizingMaskIntoConstraints = false
        checkIV.tag = 900 + index

        let contentStack = UIStackView(arrangedSubviews: [badgeLbl, packNameLbl, baseLbl, gstLbl, divider, totalLbl, patientsLbl])
        contentStack.axis = .vertical
        contentStack.spacing = 2
        contentStack.setCustomSpacing(5, after: packNameLbl)
        contentStack.setCustomSpacing(2, after: baseLbl)
        contentStack.setCustomSpacing(6, after: gstLbl)
        contentStack.setCustomSpacing(4, after: divider)
        contentStack.translatesAutoresizingMaskIntoConstraints = false

        card.addSubview(contentStack)
        card.addSubview(checkIV)

        NSLayoutConstraint.activate([
            contentStack.topAnchor.constraint(equalTo: card.topAnchor, constant: 12),
            contentStack.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 12),
            contentStack.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -12),
            contentStack.bottomAnchor.constraint(lessThanOrEqualTo: card.bottomAnchor, constant: -12),
            checkIV.topAnchor.constraint(equalTo: card.topAnchor, constant: 10),
            checkIV.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -10),
            checkIV.widthAnchor.constraint(equalToConstant: 20),
            checkIV.heightAnchor.constraint(equalToConstant: 20)
        ])

        return card
    }

    private func updateSelection() {
        let pack = packs[selectedIndex]

        for (i, card) in packCards.enumerated() {
            let isSelected = i == selectedIndex
            let p = packs[i]
            UIView.animate(withDuration: 0.22, delay: 0, usingSpringWithDamping: 0.8, initialSpringVelocity: 0) {
                card.layer.borderColor = isSelected
                    ? p.accentColor.cgColor
                    : UIColor(red: 0.88, green: 0.91, blue: 0.95, alpha: 1).cgColor
                card.layer.borderWidth = isSelected ? 2.5 : 2.0
                card.transform = isSelected
                    ? CGAffineTransform(scaleX: 1.03, y: 1.03)
                    : .identity
            }
            card.viewWithTag(900 + i)?.isHidden = !isSelected
        }

        // Update summary
        let s = NSMutableAttributedString()
        s.append(NSAttributedString(
            string: "\(pack.label) Pack • ₹\(Int(pack.base)) + ₹\(Int(pack.gstAmount)) GST",
            attributes: [.font: UIFont.systemFont(ofSize: 13, weight: .bold), .foregroundColor: UIColor(red: 0.059, green: 0.090, blue: 0.165, alpha: 1)]
        ))
        s.append(NSAttributedString(
            string: " = Total ₹\(Int(pack.total))",
            attributes: [.font: UIFont.systemFont(ofSize: 13, weight: .heavy), .foregroundColor: pack.accentColor]
        ))
        selectedAmountLabel.attributedText = s
    }

    @objc private func packCardTapped(_ sender: UIControl) {
        UIImpactFeedbackGenerator(style: .light).impactOccurred()
        selectedIndex = sender.tag
        updateSelection()
    }

    @objc private func proceedTapped() {
        let amount = packs[selectedIndex].base
        UIView.animate(withDuration: 0.12, animations: {
            self.proceedBtn.transform = CGAffineTransform(scaleX: 0.97, y: 0.97)
        }) { _ in
            UIView.animate(withDuration: 0.12) { self.proceedBtn.transform = .identity }
        }
        dismiss(animated: true) { [weak self] in
            self?.onPackSelected?(amount)
        }
    }

    @objc private func cancelTapped() {
        dismiss(animated: true)
    }
}
