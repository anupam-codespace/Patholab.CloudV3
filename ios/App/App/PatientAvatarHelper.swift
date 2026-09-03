import UIKit

enum PatientAvatarHelper {
    /// Standardized patient avatar image view with circular crop and fallback support
    static func createAvatar(size: CGFloat = 36) -> UIImageView {
        let iv = UIImageView()
        if let img = UIImage(named: "patient_avatar") ?? UIImage(contentsOfFile: Bundle.main.path(forResource: "ic_patient_avatar", ofType: "png") ?? "") {
            iv.image = img
        } else {
            iv.image = UIImage(systemName: "person.crop.circle.fill")
        }
        iv.tintColor = UIColor(red: 0.58, green: 0.64, blue: 0.72, alpha: 1)
        iv.contentMode = .scaleAspectFill
        iv.layer.cornerRadius = size / 2.0
        iv.layer.masksToBounds = true
        iv.translatesAutoresizingMaskIntoConstraints = false
        iv.widthAnchor.constraint(equalToConstant: size).isActive = true
        iv.heightAnchor.constraint(equalToConstant: size).isActive = true
        return iv
    }
}
