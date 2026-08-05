package cloud.patholab.app.api;

import android.webkit.CookieManager;
import org.json.JSONObject;
import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.List;
import java.util.Map;

public class ApiClient {

    private static final String BASE_URL = "https://app.patholab.cloud";

    public interface ApiCallback {
        void onResult(boolean success, String error, String token);
    }

    public static class ApiResponse {
        public final boolean success;
        public final JSONObject body;
        public final List<String> rawCookies;

        public ApiResponse(boolean success, JSONObject body, List<String> rawCookies) {
            this.success = success;
            this.body = body;
            this.rawCookies = rawCookies;
        }
    }

    private static ApiResponse post(String path, JSONObject payload) {
        HttpURLConnection conn = null;
        try {
            URL url = new URL(BASE_URL + path);
            conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setRequestProperty("Accept", "application/json");
            conn.setDoOutput(true);
            conn.setConnectTimeout(15000);
            conn.setReadTimeout(20000);

            OutputStreamWriter writer = new OutputStreamWriter(conn.getOutputStream(), "UTF-8");
            writer.write(payload.toString());
            writer.flush();
            writer.close();

            int code = conn.getResponseCode();
            InputStream stream = (code >= 200 && code < 300) ? conn.getInputStream() : conn.getErrorStream();
            
            StringBuilder responseText = new StringBuilder();
            if (stream != null) {
                BufferedReader reader = new BufferedReader(new InputStreamReader(stream, "UTF-8"));
                String line;
                while ((line = reader.readLine()) != null) {
                    responseText.append(line);
                }
                reader.close();
            }

            List<String> rawCookies = conn.getHeaderFields().get("Set-Cookie");
            JSONObject body;
            try {
                body = new JSONObject(responseText.toString());
            } catch (Exception e) {
                body = new JSONObject();
            }

            return new ApiResponse(code >= 200 && code < 300, body, rawCookies);
        } catch (Exception e) {
            return new ApiResponse(false, new JSONObject(), null);
        } finally {
            if (conn != null) {
                conn.disconnect();
            }
        }
    }

    private static ApiResponse get(String path, String cookie) {
        HttpURLConnection conn = null;
        try {
            URL url = new URL(BASE_URL + path);
            conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("GET");
            conn.setRequestProperty("Accept", "application/json");
            if (cookie != null && !cookie.isEmpty()) {
                conn.setRequestProperty("Cookie", "token=" + cookie);
            }
            conn.setConnectTimeout(15000);
            conn.setReadTimeout(20000);

            int code = conn.getResponseCode();
            InputStream stream = (code >= 200 && code < 300) ? conn.getInputStream() : conn.getErrorStream();

            StringBuilder responseText = new StringBuilder();
            if (stream != null) {
                BufferedReader reader = new BufferedReader(new InputStreamReader(stream, "UTF-8"));
                String line;
                while ((line = reader.readLine()) != null) {
                    responseText.append(line);
                }
                reader.close();
            }

            JSONObject body;
            try {
                body = new JSONObject(responseText.toString());
            } catch (Exception e) {
                body = new JSONObject();
            }

            return new ApiResponse(code >= 200 && code < 300, body, null);
        } catch (Exception e) {
            return new ApiResponse(false, new JSONObject(), null);
        } finally {
            if (conn != null) {
                conn.disconnect();
            }
        }
    }

    public static void login(final String email, final String password, final ApiCallback callback) {
        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    JSONObject payload = new JSONObject();
                    payload.put("email", email.trim().toLowerCase());
                    payload.put("password", password);
                    ApiResponse response = post("/api/auth/login", payload);

                    if (response.success) {
                        String token = extractTokenFromCookies(response.rawCookies);
                        injectWebViewCookie(response.rawCookies);
                        callback.onResult(true, null, token);
                    } else {
                        String error = response.body.optString("error", "Login failed");
                        callback.onResult(false, error, null);
                    }
                } catch (Exception e) {
                    callback.onResult(false, "Network error: " + e.getMessage(), null);
                }
            }
        }).start();
    }

    public static void register(final String labName, final String name, final String email, final String phone, final String password, final ApiCallback callback) {
        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    JSONObject payload = new JSONObject();
                    payload.put("labName", labName.trim());
                    payload.put("name", name.trim());
                    payload.put("email", email.trim().toLowerCase());
                    payload.put("phone", phone.trim());
                    payload.put("password", password);
                    ApiResponse response = post("/api/auth/register", payload);

                    if (response.success) {
                        callback.onResult(true, null, null);
                    } else {
                        String error = response.body.optString("error", "Registration failed");
                        callback.onResult(false, error, null);
                    }
                } catch (Exception e) {
                    callback.onResult(false, "Network error: " + e.getMessage(), null);
                }
            }
        }).start();
    }

    public static void verifyEmail(final String email, final String code, final ApiCallback callback) {
        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    JSONObject payload = new JSONObject();
                    payload.put("email", email.trim().toLowerCase());
                    payload.put("code", code);
                    ApiResponse response = post("/api/auth/verify", payload);

                    if (response.success) {
                        callback.onResult(true, null, null);
                    } else {
                        String error = response.body.optString("error", "Verification failed");
                        callback.onResult(false, error, null);
                    }
                } catch (Exception e) {
                    callback.onResult(false, "Network error: " + e.getMessage(), null);
                }
            }
        }).start();
    }

    public static void forgotPassword(final String email, final ApiCallback callback) {
        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    JSONObject payload = new JSONObject();
                    payload.put("email", email.trim().toLowerCase());
                    ApiResponse response = post("/api/auth/forgot-password", payload);

                    if (response.success) {
                        callback.onResult(true, null, null);
                    } else {
                        String error = response.body.optString("error", "Failed to send reset code");
                        callback.onResult(false, error, null);
                    }
                } catch (Exception e) {
                    callback.onResult(false, "Network error: " + e.getMessage(), null);
                }
            }
        }).start();
    }

    public static void resetPassword(final String email, final String code, final String newPassword, final ApiCallback callback) {
        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    JSONObject payload = new JSONObject();
                    payload.put("email", email.trim().toLowerCase());
                    payload.put("code", code);
                    payload.put("newPassword", newPassword);
                    ApiResponse response = post("/api/auth/reset-password", payload);

                    if (response.success) {
                        callback.onResult(true, null, null);
                    } else {
                        String error = response.body.optString("error", "Reset failed");
                        callback.onResult(false, error, null);
                    }
                } catch (Exception e) {
                    callback.onResult(false, "Network error: " + e.getMessage(), null);
                }
            }
        }).start();
    }

    public static void resendOtp(final String email, final ApiCallback callback) {
        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    JSONObject payload = new JSONObject();
                    payload.put("email", email.trim().toLowerCase());
                    ApiResponse response = post("/api/auth/otp/resend", payload);

                    if (response.success) {
                        callback.onResult(true, null, null);
                    } else {
                        String error = response.body.optString("error", "Failed to resend OTP");
                        callback.onResult(false, error, null);
                    }
                } catch (Exception e) {
                    callback.onResult(false, "Network error: " + e.getMessage(), null);
                }
            }
        }).start();
    }

    public static void getMe(final String token, final ApiCallback callback) {
        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    ApiResponse response = get("/api/auth/me", token);
                    if (response.success) {
                        JSONObject user = response.body.optJSONObject("user");
                        String userId = user != null ? user.optString("id") : null;
                        callback.onResult(true, null, userId);
                    } else {
                        callback.onResult(false, null, null);
                    }
                } catch (Exception e) {
                    callback.onResult(false, null, null);
                }
            }
        }).start();
    }

    public static String extractTokenFromCookies(List<String> cookies) {
        if (cookies == null) return null;
        for (String cookie : cookies) {
            if (cookie.startsWith("token=")) {
                String[] parts = cookie.split(";");
                if (parts.length > 0) {
                    String val = parts[0].substring("token=".length());
                    if (!val.isEmpty()) {
                        return val;
                    }
                }
            }
        }
        return null;
    }

    private static void injectWebViewCookie(List<String> rawCookies) {
        if (rawCookies == null) return;
        try {
            CookieManager cookieManager = CookieManager.getInstance();
            for (String cookie : rawCookies) {
                cookieManager.setCookie("https://app.patholab.cloud", cookie);
            }
            cookieManager.flush();
        } catch (Exception ignored) {}
    }
}
