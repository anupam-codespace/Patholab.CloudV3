package cloud.patholab.app.auth;

import android.content.Context;
import android.content.SharedPreferences;
import android.webkit.CookieManager;
import androidx.security.crypto.EncryptedSharedPreferences;
import androidx.security.crypto.MasterKey;

public class AuthManager {

    private static final String PREFS_FILE = "patholab_auth_prefs";
    private static final String KEY_TOKEN = "auth_token";
    private static final String KEY_USER_EMAIL = "user_email";
    private static final String KEY_USER_NAME = "user_name";
    private static final String KEY_USER_ROLE = "user_role";

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
        getPrefs(context).edit().putString(KEY_TOKEN, token).apply();
        syncWebViewCookie(token);
    }

    public static String getToken(Context context) {
        return getPrefs(context).getString(KEY_TOKEN, null);
    }

    public static boolean hasToken(Context context) {
        String token = getToken(context);
        return token != null && !token.isEmpty();
    }

    public static void saveUserInfo(Context context, String email, String name, String role) {
        getPrefs(context).edit()
                .putString(KEY_USER_EMAIL, email)
                .putString(KEY_USER_NAME, name)
                .putString(KEY_USER_ROLE, role)
                .apply();
    }

    public static String getUserEmail(Context context) {
        return getPrefs(context).getString(KEY_USER_EMAIL, null);
    }

    public static String getUserName(Context context) {
        return getPrefs(context).getString(KEY_USER_NAME, null);
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
        getPrefs(context).edit().clear().apply();
        try {
            CookieManager cm = CookieManager.getInstance();
            cm.setCookie("https://app.patholab.cloud", "token=; Max-Age=0; Path=/");
            cm.flush();
        } catch (Exception ignored) {}
    }

    public static void syncWebViewCookie(String token) {
        try {
            CookieManager cm = CookieManager.getInstance();
            cm.setAcceptCookie(true);
            cm.setCookie(
                    "https://app.patholab.cloud",
                    "token=" + token + "; Path=/; Domain=app.patholab.cloud; Secure; SameSite=Lax"
            );
            cm.flush();
        } catch (Exception ignored) {}
    }
}
