package cloud.patholab.app.auth;

import android.content.Context;
import android.content.SharedPreferences;
import android.webkit.CookieManager;
import android.webkit.WebStorage;
import androidx.security.crypto.EncryptedSharedPreferences;
import androidx.security.crypto.MasterKey;

public class AuthManager {

    private static final String PREFS_FILE = "patholab_auth_prefs";
    private static final String KEY_TOKEN = "auth_token";
    private static final String KEY_USER_ID = "user_id";
    private static final String KEY_USER_EMAIL = "user_email";
    private static final String KEY_USER_NAME = "user_name";
    private static final String KEY_USER_ROLE = "user_role";
    private static final String KEY_LAB_ID = "lab_id";
    private static final String KEY_LAB_NAME = "lab_name";

    private static SharedPreferences getPrefs(Context context) {
        try {
            MasterKey masterKey = new MasterKey.Builder(context)
                    .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
                    .build();
            return EncryptedSharedPreferences.create(
                    context,
                    PREFS_FILE,
                    masterKey,
                    EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
                    EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
            );
        } catch (Exception e) {
            return context.getSharedPreferences(PREFS_FILE, Context.MODE_PRIVATE);
        }
    }

    public static void saveToken(Context context, String token) {
        if (context == null || token == null) return;
        try {
            getPrefs(context).edit().putString(KEY_TOKEN, token).commit();
        } catch (Exception ignored) {}
        // Also save in standard backup prefs to guarantee all sub-activities get it immediately
        context.getSharedPreferences("PatholabPrefs", Context.MODE_PRIVATE).edit().putString(KEY_TOKEN, token).commit();
        context.getSharedPreferences("patholab_prefs", Context.MODE_PRIVATE).edit().putString(KEY_TOKEN, token).commit();
        syncWebViewCookie(token);
    }

    public static String getToken(Context context) {
        if (context == null) return null;
        try {
            String token = getPrefs(context).getString(KEY_TOKEN, null);
            if (token != null && !token.trim().isEmpty()) return token.trim();
        } catch (Exception ignored) {}

        // Check fallback prefs
        String token = context.getSharedPreferences("PatholabPrefs", Context.MODE_PRIVATE).getString(KEY_TOKEN, null);
        if (token != null && !token.trim().isEmpty()) return token.trim();

        token = context.getSharedPreferences("patholab_prefs", Context.MODE_PRIVATE).getString(KEY_TOKEN, null);
        if (token != null && !token.trim().isEmpty()) return token.trim();

        // Fallback: check CookieManager
        try {
            CookieManager cm = CookieManager.getInstance();
            String cookies = cm.getCookie("https://app.patholab.cloud");
            if (cookies == null) cookies = cm.getCookie("https://patholab.cloud");
            if (cookies != null) {
                String[] parts = cookies.split(";");
                for (String part : parts) {
                    String trimmed = part.trim();
                    if (trimmed.startsWith("token=")) {
                        String val = trimmed.substring(6).trim();
                        if (!val.isEmpty()) {
                            return val;
                        }
                    }
                }
            }
        } catch (Exception ignored) {}

        return null;
    }

    public static boolean hasToken(Context context) {
        String token = getToken(context);
        return token != null && !token.isEmpty();
    }

    public static void saveUserInfo(Context context, String email, String name, String role) {
        saveUserInfo(context, null, email, name, role, null, null);
    }

    public static void saveUserInfo(Context context, String userId, String email, String name, String role, String labId, String labName) {
        if (context == null) return;
        try {
            SharedPreferences.Editor editor = getPrefs(context).edit();
            if (userId != null) editor.putString(KEY_USER_ID, userId);
            if (email != null) editor.putString(KEY_USER_EMAIL, email);
            if (name != null) editor.putString(KEY_USER_NAME, name);
            if (role != null) editor.putString(KEY_USER_ROLE, role);
            if (labId != null) editor.putString(KEY_LAB_ID, labId);
            if (labName != null) editor.putString(KEY_LAB_NAME, labName);
            editor.commit();
        } catch (Exception ignored) {}

        // Also update standard prefs synchronously
        SharedPreferences.Editor backupEditor = context.getSharedPreferences("PatholabPrefs", Context.MODE_PRIVATE).edit();
        if (userId != null) backupEditor.putString(KEY_USER_ID, userId);
        if (name != null) backupEditor.putString("user_name", name);
        if (email != null) backupEditor.putString("user_email", email);
        if (role != null) backupEditor.putString("user_role", role);
        if (labId != null) backupEditor.putString("lab_id", labId);
        if (labName != null) backupEditor.putString("lab_name", labName);
        backupEditor.commit();
    }

    public static String getUserId(Context context) {
        if (context == null) return null;
        String id = getPrefs(context).getString(KEY_USER_ID, null);
        if (id == null) id = context.getSharedPreferences("PatholabPrefs", Context.MODE_PRIVATE).getString(KEY_USER_ID, null);
        return id;
    }

    public static String getUserEmail(Context context) {
        if (context == null) return null;
        String email = getPrefs(context).getString(KEY_USER_EMAIL, null);
        if (email == null) email = context.getSharedPreferences("PatholabPrefs", Context.MODE_PRIVATE).getString("user_email", null);
        return email;
    }

    public static String getUserName(Context context) {
        if (context == null) return null;
        String name = getPrefs(context).getString(KEY_USER_NAME, null);
        if (name == null) name = context.getSharedPreferences("PatholabPrefs", Context.MODE_PRIVATE).getString("user_name", null);
        return name;
    }

    public static String getUserRole(Context context) {
        if (context == null) return null;
        String role = getPrefs(context).getString(KEY_USER_ROLE, null);
        if (role == null) role = context.getSharedPreferences("PatholabPrefs", Context.MODE_PRIVATE).getString("user_role", null);
        return role;
    }

    public static String getLabId(Context context) {
        if (context == null) return null;
        String labId = getPrefs(context).getString(KEY_LAB_ID, null);
        if (labId == null) labId = context.getSharedPreferences("PatholabPrefs", Context.MODE_PRIVATE).getString("lab_id", null);
        return labId;
    }

    public static String getLabName(Context context) {
        if (context == null) return null;
        String labName = getPrefs(context).getString(KEY_LAB_NAME, null);
        if (labName == null) labName = context.getSharedPreferences("PatholabPrefs", Context.MODE_PRIVATE).getString("lab_name", null);
        return labName;
    }

    private static final String KEY_ONBOARDING_COMPLETED = "onboarding_completed";

    public static boolean isOnboardingCompleted(Context context) {
        return context.getSharedPreferences("patholab_general_prefs", Context.MODE_PRIVATE)
                .getBoolean(KEY_ONBOARDING_COMPLETED, false);
    }

    public static void setOnboardingCompleted(Context context, boolean completed) {
        context.getSharedPreferences("patholab_general_prefs", Context.MODE_PRIVATE)
                .edit()
                .putBoolean(KEY_ONBOARDING_COMPLETED, completed)
                .apply();
    }

    public static void clearSession(Context context) {
        if (context == null) return;
        try {
            getPrefs(context).edit().clear().apply();
        } catch (Exception ignored) {}

        try {
            context.getSharedPreferences("PatholabPrefs", Context.MODE_PRIVATE).edit().clear().apply();
            context.getSharedPreferences("patholab_home_prefs", Context.MODE_PRIVATE).edit().clear().apply();
            context.getSharedPreferences("patholab_general_prefs", Context.MODE_PRIVATE).edit().clear().apply();
            context.getSharedPreferences("patholab_prefs", Context.MODE_PRIVATE).edit().clear().apply();
        } catch (Exception ignored) {}

        try {
            CookieManager cm = CookieManager.getInstance();
            cm.removeAllCookies(null);
            cm.removeSessionCookies(null);
            cm.flush();
        } catch (Exception ignored) {}

        try {
            WebStorage.getInstance().deleteAllData();
        } catch (Exception ignored) {}
    }

    public static void syncWebViewCookie(String token) {
        if (token == null || token.trim().isEmpty()) return;
        try {
            CookieManager cm = CookieManager.getInstance();
            cm.setAcceptCookie(true);
            cm.setCookie("https://app.patholab.cloud", "token=" + token + "; Path=/; Domain=app.patholab.cloud; Secure");
            cm.setCookie("https://app.patholab.cloud", "token=" + token + "; Path=/; Secure");
            cm.setCookie("https://patholab.cloud", "token=" + token + "; Path=/; Domain=patholab.cloud; Secure");
            cm.setCookie("https://patholab.cloud", "token=" + token + "; Path=/; Secure");
            cm.flush();
        } catch (Exception ignored) {}
    }
}
