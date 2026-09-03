package cloud.patholab.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

import java.util.Locale;

/**
 * MobileNotificationHelper
 * ────────────────────────
 * Delivers native system push/local notifications to the device status bar and notification shade
 * for Welcome and Low Balance alerts across app background, foreground, and closed states.
 * Scoped strictly to the logged-in user with persistent session debouncing.
 */
public class MobileNotificationHelper {

    public static final String CHANNEL_ID = "patholab_system_alerts";
    public static final String CHANNEL_NAME = "PathoLab Alerts & Updates";
    private static final String PREFS_NOTIFS = "patholab_mobile_notifs";

    public static final int NOTIF_ID_WELCOME = 1001;
    public static final int NOTIF_ID_LOW_BALANCE = 1002;

    private static final long LOW_BALANCE_COOLDOWN_MS = 6 * 60 * 60 * 1000L; // 6 hours cooldown

    /**
     * Initializes the High Importance Notification Channel required for Android 8.0+ (API 26+)
     */
    public static void initNotificationChannel(Context context) {
        if (context == null || Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        try {
            NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                NotificationChannel existing = nm.getNotificationChannel(CHANNEL_ID);
                if (existing == null) {
                    NotificationChannel channel = new NotificationChannel(
                            CHANNEL_ID,
                            CHANNEL_NAME,
                            NotificationManager.IMPORTANCE_HIGH
                    );
                    channel.setDescription("System notifications for welcome messages, wallet balance alerts, and diagnostic updates.");
                    channel.enableLights(true);
                    channel.setLightColor(Color.BLUE);
                    channel.enableVibration(true);
                    channel.setVibrationPattern(new long[]{0, 200, 100, 200});
                    channel.setShowBadge(true);
                    channel.setLockscreenVisibility(NotificationCompat.VISIBILITY_PUBLIC);
                    nm.createNotificationChannel(channel);
                }
            }
        } catch (Exception ignored) {}
    }

    /**
     * Posts a device system Welcome notification for the logged-in user.
     * Appears in status bar & lock screen even when app is backgrounded.
     */
    public static void postWelcomeNotification(Context context, String userName, String userId) {
        if (context == null) return;
        initNotificationChannel(context);

        String effectiveId = (userId != null && !userId.trim().isEmpty()) ? userId.trim() : "default_user";
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NOTIFS, Context.MODE_PRIVATE);
        String welcomeKey = "welcomed_user_" + effectiveId;

        // Check if welcome was already posted for this user session
        if (prefs.getBoolean(welcomeKey, false)) {
            return;
        }

        try {
            String cleanName = (userName != null && !userName.trim().isEmpty()) ? userName.trim() : "Lab Partner";
            // Get first name for friendly greeting
            String firstName = cleanName.split("\\s+")[0];

            Intent intent = new Intent(context, MainActivity.class);
            intent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            PendingIntent pendingIntent = PendingIntent.getActivity(
                    context,
                    NOTIF_ID_WELCOME,
                    intent,
                    PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
            );

            Uri defaultSoundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);

            String title = "Welcome to PathoLab Cloud 👋";
            String body = "Hello " + firstName + "! Your diagnostic workspace is live and ready for patient registrations & reports.";

            NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
                    .setSmallIcon(R.mipmap.ic_launcher)
                    .setContentTitle(title)
                    .setContentText(body)
                    .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                    .setAutoCancel(true)
                    .setSound(defaultSoundUri)
                    .setPriority(NotificationCompat.PRIORITY_HIGH)
                    .setDefaults(NotificationCompat.DEFAULT_ALL)
                    .setContentIntent(pendingIntent)
                    .setCategory(NotificationCompat.CATEGORY_EVENT)
                    .setVisibility(NotificationCompat.VISIBILITY_PUBLIC);

            NotificationManagerCompat nmc = NotificationManagerCompat.from(context);
            nmc.notify(NOTIF_ID_WELCOME, builder.build());

            // Mark welcomed in preferences
            prefs.edit().putBoolean(welcomeKey, true).apply();

        } catch (Exception ignored) {}
    }

    /**
     * Posts a device system Low Balance / Zero Balance alert notification for the logged-in lab.
     * Directs to WalletActivity on click and debounces repeated firings.
     */
    public static void postLowBalanceNotification(Context context, double balance, String userId) {
        if (context == null) return;
        initNotificationChannel(context);

        // Condition: balance <= 0 or very low balance <= 50
        if (balance > 50) return;

        String effectiveId = (userId != null && !userId.trim().isEmpty()) ? userId.trim() : "default_user";
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NOTIFS, Context.MODE_PRIVATE);
        String lastAlertKey = "last_low_bal_alert_ts_" + effectiveId;
        long lastAlertTime = prefs.getLong(lastAlertKey, 0L);
        long now = System.currentTimeMillis();

        long effectiveCooldown = (balance <= 0) ? 5000L : LOW_BALANCE_COOLDOWN_MS;
        if (now - lastAlertTime < effectiveCooldown) {
            return; // Debounce
        }

        try {
            Intent walletIntent = new Intent(context, WalletActivity.class);
            walletIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            PendingIntent pendingIntent = PendingIntent.getActivity(
                    context,
                    NOTIF_ID_LOW_BALANCE,
                    walletIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
            );

            Uri defaultSoundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);

            boolean isZero = balance <= 0;
            String formatted = String.format(Locale.getDefault(), "₹%,.2f", Math.max(0.0, balance));

            String title = isZero ? "⚠️ Wallet Balance Empty" : "⚠️ Low Wallet Balance (" + formatted + ")";
            String body = isZero
                    ? "Your lab wallet balance is ₹0.00. Recharge now to keep patient registration and reports active."
                    : "Your lab wallet balance is only " + formatted + ". Recharge soon to avoid test report disruption.";

            NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
                    .setSmallIcon(R.mipmap.ic_launcher)
                    .setContentTitle(title)
                    .setContentText(body)
                    .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                    .setAutoCancel(true)
                    .setSound(defaultSoundUri)
                    .setPriority(NotificationCompat.PRIORITY_HIGH)
                    .setDefaults(NotificationCompat.DEFAULT_ALL)
                    .setContentIntent(pendingIntent)
                    .setCategory(NotificationCompat.CATEGORY_ALARM)
                    .setVisibility(NotificationCompat.VISIBILITY_PUBLIC);

            NotificationManagerCompat nmc = NotificationManagerCompat.from(context);
            nmc.notify(NOTIF_ID_LOW_BALANCE, builder.build());

            // Update timestamp
            prefs.edit().putLong(lastAlertKey, now).apply();

        } catch (Exception ignored) {}
    }

    /**
     * Resets notification session state upon user sign out.
     */
    public static void clearNotificationSession(Context context) {
        if (context == null) return;
        try {
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NOTIFS, Context.MODE_PRIVATE);
            prefs.edit().clear().apply();
            NotificationManagerCompat nmc = NotificationManagerCompat.from(context);
            nmc.cancelAll();
        } catch (Exception ignored) {}
    }
}
