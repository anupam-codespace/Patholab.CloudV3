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
     * Schedules a welcoming notification 8 seconds after login, restricted to at most once per 24 hours.
     */
    public static void scheduleWelcomeNotification(Context context, String userName, String userId) {
        if (context == null) return;
        initNotificationChannel(context);

        String effectiveId = (userId != null && !userId.trim().isEmpty()) ? userId.trim() : "default_user";
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NOTIFS, Context.MODE_PRIVATE);
        String welcomeTimestampKey = "last_welcome_ts_" + effectiveId;

        long lastWelcomeTs = prefs.getLong(welcomeTimestampKey, 0L);
        long now = System.currentTimeMillis();

        // 24-hour check: only schedule if 24 hours have elapsed or first login ever
        if (now - lastWelcomeTs < 24 * 60 * 60 * 1000L) {
            return;
        }

        // Record timestamp immediately to prevent concurrent duplicate schedules
        prefs.edit().putLong(welcomeTimestampKey, now).apply();

        String rawName = userName;
        if (rawName == null || rawName.trim().isEmpty() || "User".equalsIgnoreCase(rawName.trim()) || rawName.contains("@") || rawName.toLowerCase().contains("gmail")) {
            String storedName = cloud.patholab.app.auth.AuthManager.getUserName(context);
            if (storedName != null && !storedName.trim().isEmpty() && !"User".equalsIgnoreCase(storedName.trim()) && !storedName.contains("@") && !storedName.toLowerCase().contains("gmail")) {
                rawName = storedName;
            } else {
                String storedEmail = cloud.patholab.app.auth.AuthManager.getUserEmail(context);
                if (storedEmail != null && !storedEmail.trim().isEmpty()) {
                    rawName = storedEmail;
                }
            }
        }

        String firstName = HomeNativeManager.formatSmartFirstName(rawName);
        if (firstName == null || firstName.trim().isEmpty() || "User".equalsIgnoreCase(firstName.trim()) || firstName.toLowerCase().contains("gmail")) {
            firstName = "Doctor";
        }

        // 8-Second Delay per user requirement
        final String finalFirstName = firstName;
        new android.os.Handler(android.os.Looper.getMainLooper()).postDelayed(() -> {
            try {
                Intent intent = new Intent(context, MainActivity.class);
                intent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
                PendingIntent pendingIntent = PendingIntent.getActivity(
                        context,
                        NOTIF_ID_WELCOME,
                        intent,
                        PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
                );

                Uri defaultSoundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);

                String title = "Welcome to PathoLab Cloud";
                String body = HomeNativeManager.stripEmailFromString("Welcome, " + finalFirstName + ". Your laboratory workspace is ready for seamless operations and patient care.");

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
            } catch (Exception ignored) {}
        }, 8000L);
    }

    public static void postWelcomeNotification(Context context, String userName, String userId) {
        scheduleWelcomeNotification(context, userName, userId);
    }

    /**
     * Posts real-time mobile notification when a patient is registered on the website or another workstation.
     */
    public static void postNewPatientNotification(Context context, String patientName, String uhid) {
        if (context == null) return;
        initNotificationChannel(context);

        try {
            String cleanName = HomeNativeManager.stripEmailFromString(HomeNativeManager.formatSmartFirstName(patientName));
            if (cleanName.isEmpty() || "Doctor".equalsIgnoreCase(cleanName)) {
                cleanName = (patientName != null && !patientName.trim().isEmpty() && !patientName.contains("@")) ? patientName.trim() : "Patient";
            }
            String cleanUhid = (uhid != null && !uhid.trim().isEmpty()) ? uhid.trim() : "";

            Intent intent = new Intent(context, PatientWorklistActivity.class);
            intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            int notifId = Math.abs((cleanName + cleanUhid).hashCode()) + 2000;

            PendingIntent pendingIntent = PendingIntent.getActivity(
                    context,
                    notifId,
                    intent,
                    PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
            );

            Uri defaultSoundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);

            String title = "New Patient Registered";
            String body = HomeNativeManager.stripEmailFromString("Patient " + cleanName + (!cleanUhid.isEmpty() ? " (" + cleanUhid + ")" : "") + " has been added to your laboratory worklist.");

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
            nmc.notify(notifId, builder.build());

        } catch (Exception ignored) {}
    }

    /**
     * Posts a clean, professional zero/low balance notification directing user to recharge.
     * Strictly without emojis as requested.
     */
    public static void postWalletZeroBalanceNotification(Context context, String userId) {
        if (context == null) return;
        initNotificationChannel(context);

        String effectiveId = (userId != null && !userId.trim().isEmpty()) ? userId.trim() : "default_user";
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NOTIFS, Context.MODE_PRIVATE);
        String lastAlertKey = "last_zero_bal_alert_ts_" + effectiveId;
        long lastAlertTime = prefs.getLong(lastAlertKey, 0L);
        long now = System.currentTimeMillis();

        if (now - lastAlertTime < 5000L) {
            return; // 5-second debounce
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

            String title = "Recharge Your Wallet";
            String body = "Your wallet balance is low. Please recharge your wallet to register new patients.";

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

            prefs.edit().putLong(lastAlertKey, now).apply();

        } catch (Exception ignored) {}
    }

    public static void postLowBalanceNotification(Context context, double balance, String userId) {
        postWalletZeroBalanceNotification(context, userId);
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
