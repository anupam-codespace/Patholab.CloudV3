package cloud.patholab.app;

import android.app.Activity;
import android.os.Build;
import android.view.View;
import android.view.Window;

import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;

/**
 * Standard Status Bar Helper for Patholab Cloud
 * Ensures all Sapphire Blue headers cover and integrate with the Android Status Bar
 * with crisp pure WHITE status bar icons (clock, battery, wifi, notifications).
 */
public class StatusBarHelper {

    /**
     * Sets the status bar color to Sapphire Blue (#0D6EFD) and ensures
     * status bar text and icons are pure WHITE.
     */
    public static void setStatusBarSapphire(Activity activity) {
        if (activity == null) return;
        try {
            Window window = activity.getWindow();
            if (Build.VERSION.SDK_INT < 35) {
                window.setStatusBarColor(0xFF0D6EFD);
            }

            WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(window, window.getDecorView());
            if (controller != null) {
                controller.setAppearanceLightStatusBars(false); // false = WHITE icons on dark/blue header
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                View decor = window.getDecorView();
                int flags = decor.getSystemUiVisibility();
                flags &= ~View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR; // Clears light flag -> White icons
                decor.setSystemUiVisibility(flags);
            }
        } catch (Exception ignored) {}
    }

    /**
     * Sets the status bar color to Deep Navy (#0A0F2E) matching the fused hero header
     * with crisp pure WHITE status bar icons.
     */
    public static void setStatusBarDeepNavy(Activity activity) {
        if (activity == null) return;
        try {
            Window window = activity.getWindow();
            if (Build.VERSION.SDK_INT < 35) {
                window.setStatusBarColor(0xFF0A0F2E);
            }

            WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(window, window.getDecorView());
            if (controller != null) {
                controller.setAppearanceLightStatusBars(false); // false = WHITE icons
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                View decor = window.getDecorView();
                int flags = decor.getSystemUiVisibility();
                flags &= ~View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
                decor.setSystemUiVisibility(flags);
            }
        } catch (Exception ignored) {}
    }

    /**
     * Sets the status bar color to Dark Slate (#0F172A) with WHITE icons for dark mode.
     */
    public static void setStatusBarDark(Activity activity) {
        if (activity == null) return;
        try {
            Window window = activity.getWindow();
            if (Build.VERSION.SDK_INT < 35) {
                window.setStatusBarColor(0xFF0F172A);
            }

            WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(window, window.getDecorView());
            if (controller != null) {
                controller.setAppearanceLightStatusBars(false);
            }
        } catch (Exception ignored) {}
    }

    /**
     * Sets navigation bar color safely on pre-Android 15 devices, and controls icon contrast via WindowInsetsControllerCompat.
     */
    public static void setNavigationBarColor(Activity activity, int color, boolean isLightIcons) {
        if (activity == null) return;
        try {
            Window window = activity.getWindow();
            if (Build.VERSION.SDK_INT < 35) {
                window.setNavigationBarColor(color);
            }
            WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(window, window.getDecorView());
            if (controller != null) {
                controller.setAppearanceLightNavigationBars(!isLightIcons);
            }
        } catch (Exception ignored) {}
    }
}
