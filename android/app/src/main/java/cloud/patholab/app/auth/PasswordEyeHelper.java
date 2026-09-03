package cloud.patholab.app.auth;

import android.text.InputType;
import android.text.method.HideReturnsTransformationMethod;
import android.text.method.PasswordTransformationMethod;
import android.view.HapticFeedbackConstants;
import android.view.animation.AccelerateDecelerateInterpolator;
import android.widget.EditText;
import android.widget.ImageView;

import cloud.patholab.app.R;

/**
 * Helper to provide smooth blinking eye micro-animation and haptic feedback
 * when toggling password visibility.
 */
public class PasswordEyeHelper {

    public interface EyeToggleCallback {
        void onVisibilityChanged(boolean isVisible);
    }

    /**
     * Sets up a password toggle on an EditText with smooth blinking animation and haptics.
     */
    public static void setupPasswordToggle(EditText editText, ImageView eyeIcon) {
        if (editText == null || eyeIcon == null) return;

        // Initialize state
        eyeIcon.setImageResource(R.drawable.ic_eye_closed);
        eyeIcon.setColorFilter(0xFF94A3B8);
        editText.setTransformationMethod(PasswordTransformationMethod.getInstance());

        final boolean[] isVisible = {false};

        eyeIcon.setOnClickListener(v -> {
            isVisible[0] = !isVisible[0];
            animateEyeToggle(editText, eyeIcon, isVisible[0], null);
        });
    }

    /**
     * Sets up a password toggle with callback.
     */
    public static void setupPasswordToggle(EditText editText, ImageView eyeIcon, EyeToggleCallback callback) {
        if (editText == null || eyeIcon == null) return;

        eyeIcon.setImageResource(R.drawable.ic_eye_closed);
        eyeIcon.setColorFilter(0xFF94A3B8);
        editText.setTransformationMethod(PasswordTransformationMethod.getInstance());

        final boolean[] isVisible = {false};

        eyeIcon.setOnClickListener(v -> {
            isVisible[0] = !isVisible[0];
            animateEyeToggle(editText, eyeIcon, isVisible[0], callback);
        });
    }

    /**
     * Performs a realistic eye-blink micro-animation (squish vertically, swap icon, bounce open).
     */
    public static void animateEyeToggle(EditText editText, ImageView eyeIcon, boolean isVisible, EyeToggleCallback callback) {
        if (editText == null || eyeIcon == null) return;

        // Trigger gentle haptic tap
        try {
            eyeIcon.performHapticFeedback(HapticFeedbackConstants.KEYBOARD_TAP);
        } catch (Exception ignored) {}

        // 1. First half: Blink closed (squish Y to 0.1)
        eyeIcon.animate()
                .scaleY(0.12f)
                .scaleX(0.85f)
                .setDuration(90)
                .setInterpolator(new AccelerateDecelerateInterpolator())
                .withEndAction(() -> {
                    // Change icon and transformation mid-blink
                    if (isVisible) {
                        eyeIcon.setImageResource(R.drawable.ic_eye_open);
                        eyeIcon.setColorFilter(0xFF4F46E5); // Indigo active
                        editText.setTransformationMethod(HideReturnsTransformationMethod.getInstance());
                    } else {
                        eyeIcon.setImageResource(R.drawable.ic_eye_closed);
                        eyeIcon.setColorFilter(0xFF94A3B8); // Muted slate hidden
                        editText.setTransformationMethod(PasswordTransformationMethod.getInstance());
                    }

                    // Preserve cursor position at end of text
                    int selection = editText.getText().length();
                    editText.setSelection(selection);

                    // 2. Second half: Pop back open with subtle bounce
                    eyeIcon.animate()
                            .scaleY(1.0f)
                            .scaleX(1.0f)
                            .setDuration(120)
                            .setInterpolator(new AccelerateDecelerateInterpolator())
                            .start();

                    if (callback != null) {
                        callback.onVisibilityChanged(isVisible);
                    }
                })
                .start();
    }
}
