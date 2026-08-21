import UIKit

struct OnboardingSlide {
    let imageName: String
    let title: String
    let subtitle: String
}

class OnboardingCell: UICollectionViewCell {
    static let reuseIdentifier = "OnboardingCell"

    private let imageView = UIImageView()
    private let titleLabel = UILabel()
    private let subtitleLabel = UILabel()
    private let stackView = UIStackView()

    override init(frame: CGRect) {
        super.init(frame: frame)
        setupViews()
    }

    required init?(coder: NSCoder) {
        super.init(coder: coder)
        setupViews()
    }

    private func setupViews() {
        contentView.backgroundColor = .white

        imageView.contentMode = .scaleAspectFit
        imageView.clipsToBounds = true
        imageView.translatesAutoresizingMaskIntoConstraints = false

        titleLabel.font = .systemFont(ofSize: 23, weight: .bold)
        titleLabel.textColor = UIColor(red: 15/255, green: 23/255, blue: 42/255, alpha: 1) // #0F172A
        titleLabel.textAlignment = .center
        titleLabel.numberOfLines = 0
        titleLabel.translatesAutoresizingMaskIntoConstraints = false

        subtitleLabel.font = .systemFont(ofSize: 14.5, weight: .regular)
        subtitleLabel.textColor = UIColor(red: 100/255, green: 116/255, blue: 139/255, alpha: 1) // #64748B
        subtitleLabel.textAlignment = .center
        subtitleLabel.numberOfLines = 0
        subtitleLabel.translatesAutoresizingMaskIntoConstraints = false

        let textStack = UIStackView(arrangedSubviews: [titleLabel, subtitleLabel])
        textStack.axis = .vertical
        textStack.spacing = 10
        textStack.alignment = .center
        textStack.translatesAutoresizingMaskIntoConstraints = false

        stackView.axis = .vertical
        stackView.spacing = 24
        stackView.alignment = .center
        stackView.translatesAutoresizingMaskIntoConstraints = false
        stackView.addArrangedSubview(imageView)
        stackView.addArrangedSubview(textStack)

        contentView.addSubview(stackView)

        let imageSize: CGFloat = min(UIScreen.main.bounds.width - 90, 260)

        NSLayoutConstraint.activate([
            imageView.widthAnchor.constraint(equalToConstant: imageSize),
            imageView.heightAnchor.constraint(equalToConstant: imageSize),

            titleLabel.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 24),
            titleLabel.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -24),

            subtitleLabel.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 32),
            subtitleLabel.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -32),

            stackView.centerYAnchor.constraint(equalTo: contentView.centerYAnchor, constant: -10),
            stackView.centerXAnchor.constraint(equalTo: contentView.centerXAnchor),
            stackView.leadingAnchor.constraint(equalTo: contentView.leadingAnchor),
            stackView.trailingAnchor.constraint(equalTo: contentView.trailingAnchor)
        ])
    }

    func configure(with slide: OnboardingSlide) {
        imageView.image = UIImage(named: slide.imageName)
        titleLabel.text = slide.title

        let paragraphStyle = NSMutableParagraphStyle()
        paragraphStyle.lineSpacing = 3
        paragraphStyle.alignment = .center

        let attrString = NSAttributedString(
            string: slide.subtitle,
            attributes: [
                .paragraphStyle: paragraphStyle,
                .font: UIFont.systemFont(ofSize: 14.5, weight: .regular),
                .foregroundColor: UIColor(red: 100/255, green: 116/255, blue: 139/255, alpha: 1)
            ]
        )
        subtitleLabel.attributedText = attrString
    }
}

class OnboardingViewController: UIViewController, UICollectionViewDataSource, UICollectionViewDelegate, UICollectionViewDelegateFlowLayout {

    var onCompletion: (() -> Void)?

    private let slides: [OnboardingSlide] = [
        OnboardingSlide(
            imageName: "Onboarding1",
            title: "Effortless Lab Management",
            subtitle: "Manage patient registrations, tests, and billing seamlessly from anywhere."
        ),
        OnboardingSlide(
            imageName: "Onboarding2",
            title: "Enterprise Data Security",
            subtitle: "Safeguard patient diagnostic records with end-to-end cloud protection."
        ),
        OnboardingSlide(
            imageName: "Onboarding3",
            title: "Instant Report Delivery",
            subtitle: "Deliver verified pathology reports directly via WhatsApp and SMS."
        ),
        OnboardingSlide(
            imageName: "Onboarding4",
            title: "Smart Analytics & Insights",
            subtitle: "Track revenue, sample analytics, and daily lab growth in real time."
        )
    ]

    private var currentPage = 0

    // MARK: - UI Components
    private let topBar = UIView()
    private let skipButton = UIButton(type: .system)
    private var collectionView: UICollectionView!
    private let bottomContainer = UIStackView()
    private let dotsContainer = UIStackView()
    private var dotViews: [UIView] = []
    private var dotWidthConstraints: [NSLayoutConstraint] = []
    private let actionButton = UIButton(type: .custom)

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .white

        setupStatusBar()
        setupTopBar()
        setupCollectionView()
        setupBottomControls()
        updateUIState(page: 0, animated: false)
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        if let layout = collectionView.collectionViewLayout as? UICollectionViewFlowLayout {
            layout.itemSize = collectionView.bounds.size
            layout.invalidateLayout()
        }
    }

    private func setupStatusBar() {
        if #available(iOS 13.0, *) {
            overrideUserInterfaceStyle = .light
        }
        setNeedsStatusBarAppearanceUpdate()
    }

    override var preferredStatusBarStyle: UIStatusBarStyle {
        if #available(iOS 13.0, *) {
            return .darkContent
        }
        return .default
    }

    private func setupTopBar() {
        topBar.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(topBar)

        skipButton.setTitle("Skip", for: .normal)
        skipButton.setTitleColor(UIColor(red: 100/255, green: 116/255, blue: 139/255, alpha: 1), for: .normal)
        skipButton.titleLabel?.font = .systemFont(ofSize: 15, weight: .medium)
        skipButton.addTarget(self, action: #selector(skipTapped), for: .touchUpInside)
        skipButton.translatesAutoresizingMaskIntoConstraints = false
        topBar.addSubview(skipButton)

        NSLayoutConstraint.activate([
            topBar.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            topBar.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            topBar.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            topBar.heightAnchor.constraint(equalToConstant: 44),

            skipButton.trailingAnchor.constraint(equalTo: topBar.trailingAnchor, constant: -20),
            skipButton.centerYAnchor.constraint(equalTo: topBar.centerYAnchor)
        ])
    }

    private func setupCollectionView() {
        let layout = UICollectionViewFlowLayout()
        layout.scrollDirection = .horizontal
        layout.minimumLineSpacing = 0
        layout.minimumInteritemSpacing = 0

        collectionView = UICollectionView(frame: .zero, collectionViewLayout: layout)
        collectionView.backgroundColor = .white
        collectionView.isPagingEnabled = true
        collectionView.showsHorizontalScrollIndicator = false
        collectionView.bounces = true
        collectionView.dataSource = self
        collectionView.delegate = self
        collectionView.register(OnboardingCell.self, forCellWithReuseIdentifier: OnboardingCell.reuseIdentifier)
        collectionView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(collectionView)

        NSLayoutConstraint.activate([
            collectionView.topAnchor.constraint(equalTo: topBar.bottomAnchor),
            collectionView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            collectionView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            collectionView.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -130)
        ])
    }

    private func setupBottomControls() {
        bottomContainer.axis = .vertical
        bottomContainer.spacing = 24
        bottomContainer.alignment = .fill
        bottomContainer.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(bottomContainer)

        // ── 4-Dot Animated Indicator ──────────────────────────────────────────
        dotsContainer.axis = .horizontal
        dotsContainer.spacing = 6
        dotsContainer.alignment = .center
        dotsContainer.distribution = .equalCentering
        dotsContainer.translatesAutoresizingMaskIntoConstraints = false

        let dotsWrapper = UIView()
        dotsWrapper.translatesAutoresizingMaskIntoConstraints = false
        dotsWrapper.addSubview(dotsContainer)

        NSLayoutConstraint.activate([
            dotsContainer.centerXAnchor.constraint(equalTo: dotsWrapper.centerXAnchor),
            dotsContainer.centerYAnchor.constraint(equalTo: dotsWrapper.centerYAnchor),
            dotsContainer.topAnchor.constraint(equalTo: dotsWrapper.topAnchor),
            dotsContainer.bottomAnchor.constraint(equalTo: dotsWrapper.bottomAnchor)
        ])

        for _ in 0..<slides.count {
            let dot = UIView()
            dot.backgroundColor = UIColor(red: 226/255, green: 232/255, blue: 240/255, alpha: 1) // #E2E8F0
            dot.layer.cornerRadius = 4
            dot.clipsToBounds = true
            dot.translatesAutoresizingMaskIntoConstraints = false

            let widthConstraint = dot.widthAnchor.constraint(equalToConstant: 8)
            NSLayoutConstraint.activate([
                dot.heightAnchor.constraint(equalToConstant: 8),
                widthConstraint
            ])
            dotWidthConstraints.append(widthConstraint)
            dotViews.append(dot)
            dotsContainer.addArrangedSubview(dot)
        }

        bottomContainer.addArrangedSubview(dotsWrapper)

        // ── Action Button ─────────────────────────────────────────────────────
        actionButton.setTitle("Next", for: .normal)
        actionButton.setTitleColor(.white, for: .normal)
        actionButton.titleLabel?.font = .systemFont(ofSize: 16, weight: .semibold)
        actionButton.backgroundColor = UIColor(red: 15/255, green: 23/255, blue: 42/255, alpha: 1) // #0F172A solid black
        actionButton.layer.cornerRadius = 16
        actionButton.layer.shadowColor = UIColor.black.cgColor
        actionButton.layer.shadowOffset = CGSize(width: 0, height: 4)
        actionButton.layer.shadowRadius = 8
        actionButton.layer.shadowOpacity = 0.2
        actionButton.addTarget(self, action: #selector(actionButtonTapped), for: .touchUpInside)
        actionButton.translatesAutoresizingMaskIntoConstraints = false

        // Spring feedback on touch
        actionButton.addTarget(self, action: #selector(buttonTouchDown), for: [.touchDown, .touchDragEnter])
        actionButton.addTarget(self, action: #selector(buttonTouchUp), for: [.touchUpInside, .touchCancel, .touchDragExit])

        bottomContainer.addArrangedSubview(actionButton)

        NSLayoutConstraint.activate([
            actionButton.heightAnchor.constraint(equalToConstant: 54),

            bottomContainer.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 24),
            bottomContainer.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -24),
            bottomContainer.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -20)
        ])
    }

    // MARK: - Animations & State Update

    private func updateUIState(page: Int, animated: Bool) {
        guard page >= 0 && page < slides.count else { return }
        currentPage = page

        let activeColor = UIColor(red: 15/255, green: 23/255, blue: 42/255, alpha: 1) // #0F172A solid black
        let inactiveColor = UIColor(red: 226/255, green: 232/255, blue: 240/255, alpha: 1) // #E2E8F0

        let animationBlock = {
            for (index, dot) in self.dotViews.enumerated() {
                let isActive = (index == page)
                self.dotWidthConstraints[index].constant = isActive ? 24 : 8
                dot.backgroundColor = isActive ? activeColor : inactiveColor
            }
            self.dotsContainer.layoutIfNeeded()

            if page == self.slides.count - 1 {
                self.actionButton.setTitle("Get Started", for: .normal)
                self.skipButton.alpha = 0
            } else {
                self.actionButton.setTitle("Next", for: .normal)
                self.skipButton.alpha = 1
            }
        }

        if animated {
            UIView.animate(withDuration: 0.28, delay: 0, options: [.curveEaseInOut], animations: animationBlock, completion: nil)
        } else {
            animationBlock()
        }
    }

    // MARK: - Actions

    @objc private func actionButtonTapped() {
        let generator = UIImpactFeedbackGenerator(style: .medium)
        generator.impactOccurred()

        if currentPage < slides.count - 1 {
            let nextIndex = currentPage + 1
            collectionView.scrollToItem(
                at: IndexPath(item: nextIndex, section: 0),
                at: .centeredHorizontally,
                animated: true
            )
            updateUIState(page: nextIndex, animated: true)
        } else {
            completeOnboarding()
        }
    }

    @objc private func skipTapped() {
        let generator = UIImpactFeedbackGenerator(style: .light)
        generator.impactOccurred()
        completeOnboarding()
    }

    @objc private func buttonTouchDown() {
        UIView.animate(withDuration: 0.1) {
            self.actionButton.transform = CGAffineTransform(scaleX: 0.98, y: 0.98)
        }
    }

    @objc private func buttonTouchUp() {
        UIView.animate(withDuration: 0.15) {
            self.actionButton.transform = .identity
        }
    }

    private func completeOnboarding() {
        UserDefaults.standard.set(true, forKey: "has_completed_onboarding")
        onCompletion?()
    }

    // MARK: - UICollectionViewDataSource & Delegate

    func collectionView(_ collectionView: UICollectionView, numberOfItemsInSection section: Int) -> Int {
        return slides.count
    }

    func collectionView(_ collectionView: UICollectionView, cellForItemAt indexPath: IndexPath) -> UICollectionViewCell {
        let cell = collectionView.dequeueReusableCell(withReuseIdentifier: OnboardingCell.reuseIdentifier, for: indexPath) as! OnboardingCell
        cell.configure(with: slides[indexPath.item])
        return cell
    }

    func collectionView(_ collectionView: UICollectionView, layout collectionViewLayout: UICollectionViewLayout, sizeForItemAt indexPath: IndexPath) -> CGSize {
        return collectionView.bounds.size
    }

    func scrollViewDidEndDecelerating(_ scrollView: UIScrollView) {
        let page = Int(round(scrollView.contentOffset.x / scrollView.bounds.width))
        if page != currentPage {
            updateUIState(page: page, animated: true)
        }
    }
}
