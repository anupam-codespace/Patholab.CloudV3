package cloud.patholab.app;

import android.animation.Animator;
import android.animation.AnimatorListenerAdapter;
import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.os.Handler;
import android.os.Looper;
import android.view.Gravity;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.view.animation.AccelerateDecelerateInterpolator;
import android.widget.FrameLayout;
import android.widget.TextView;

import androidx.annotation.Nullable;
import androidx.appcompat.app.AlertDialog;

/**
 * Wallet Empty Bottom Toast Helper
 * Renders a bottom-slide-up floating notification when the laboratory wallet balance is zero,
 * specifically during New Patient Registration. Routes directly to wallet recharge on tap.
 * Only triggered from RegistrationActivity — not from dashboard polling.
 */
public class WalletAlertHelper {

    private static final Handler mainHandler = new Handler(Looper.getMainLooper());
    private static View currentToastView = null;

    /**
     * Displays a floating BOTTOM card toast (slides up from below) with a red circle ❌ icon.
     * Message: "Wallet balance is empty. Paid actions like Patient Registration are currently locked. Please recharge."
     * Only call this from RegistrationActivity.
     */
    public static void showWalletEmptyToast(final Activity activity) {
        showWalletEmptyToast(activity, null, "Wallet balance is empty. Paid actions like Patient Registration are currently locked. Please recharge.");
    }

    public static void showWalletEmptyToast(final Activity activity, @Nullable final Runnable onDismiss, final String customMessage) {
        if (activity == null || activity.isFinishing() || activity.isDestroyed()) return;

        mainHandler.post(() -> {
            try {
                // If there's already an active toast on screen, remove it first
                dismissCurrentToast();

                ViewGroup decorView = (ViewGroup) activity.getWindow().getDecorView();
                final View toastView = LayoutInflater.from(activity).inflate(R.layout.layout_wallet_empty_toast, decorView, false);

                TextView lblMessage = toastView.findViewById(R.id.lblWalletToastMessage);
                if (lblMessage != null && customMessage != null) {
                    lblMessage.setText(customMessage);
                }

                // Layout parameters: float at BOTTOM above navigation bar
                FrameLayout.LayoutParams params = new FrameLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.WRAP_CONTENT
                );
                params.gravity = Gravity.BOTTOM | Gravity.CENTER_HORIZONTAL;
                params.bottomMargin = dp(activity, 24); // Above nav bar / home gesture area
                params.leftMargin = dp(activity, 16);
                params.rightMargin = dp(activity, 16);
                toastView.setLayoutParams(params);

                // Clicking anywhere on the floating card opens WalletActivity
                toastView.setOnClickListener(v -> {
                    dismissToast(toastView, decorView, onDismiss);
                    activity.startActivity(new Intent(activity, WalletActivity.class));
                });

                // Initial animation state: start BELOW the screen, then slide up
                toastView.setTranslationY(dp(activity, 200));
                toastView.setAlpha(0f);
                decorView.addView(toastView);
                currentToastView = toastView;

                // Animate slide UP into view from below
                toastView.animate()
                        .translationY(0f)
                        .alpha(1f)
                        .setDuration(380)
                        .setInterpolator(new AccelerateDecelerateInterpolator())
                        .start();

                // Auto dismiss after 6.5 seconds
                mainHandler.postDelayed(() -> {
                    if (toastView.getParent() != null) {
                        dismissToast(toastView, decorView, onDismiss);
                    }
                }, 6500);

            } catch (Exception ignored) {}
        });
    }

    private static void dismissToast(final View view, final ViewGroup container, @Nullable final Runnable onDismiss) {
        if (view == null || container == null) return;
        // Dismiss: slide back DOWN off the bottom of the screen
        view.animate()
                .translationY(dp(view.getContext(), 200))
                .alpha(0f)
                .setDuration(280)
                .setInterpolator(new AccelerateDecelerateInterpolator())
                .setListener(new AnimatorListenerAdapter() {
                    @Override
                    public void onAnimationEnd(Animator animation) {
                        try {
                            container.removeView(view);
                            if (currentToastView == view) {
                                currentToastView = null;
                            }
                            if (onDismiss != null) onDismiss.run();
                        } catch (Exception ignored) {}
                    }
                })
                .start();
    }

    public static void dismissCurrentToast() {
        if (currentToastView != null && currentToastView.getParent() != null) {
            try {
                ViewGroup parent = (ViewGroup) currentToastView.getParent();
                parent.removeView(currentToastView);
                currentToastView = null;
            } catch (Exception ignored) {}
        }
    }

    /**
     * Shows a modal dialog when an action requires positive wallet balance.
     */
    public static void showWalletLockDialog(final Activity activity, final String actionName) {
        if (activity == null || activity.isFinishing() || activity.isDestroyed()) return;

        AlertDialog.Builder builder = new AlertDialog.Builder(activity);
        builder.setTitle("Wallet Recharge Required");
        builder.setMessage("Your laboratory wallet balance is empty. Paid actions like " + actionName + " are currently locked.\n\nPlease recharge your wallet to resume operations.");
        builder.setPositiveButton("Recharge Now", (d, w) -> {
            activity.startActivity(new Intent(activity, WalletActivity.class));
        });
        builder.setNegativeButton("Cancel", null);
        builder.show();
    }

    private static int dp(Context ctx, int val) {
        return (int) (val * ctx.getResources().getDisplayMetrics().density);
    }
}
