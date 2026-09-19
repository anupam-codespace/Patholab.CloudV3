package cloud.patholab.app;

import android.content.Context;
import android.content.SharedPreferences;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.view.View;
import android.view.animation.Animation;
import android.view.animation.RotateAnimation;
import android.webkit.CookieManager;
import android.widget.Button;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;
import androidx.appcompat.widget.SwitchCompat;
import androidx.core.widget.NestedScrollView;

import com.google.android.material.button.MaterialButton;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.net.HttpURLConnection;
import java.net.URL;

import cloud.patholab.app.auth.AuthManager;

/**
 * ProfileSettingsActivity
 * ───────────────────────
 * Independent native Mobile screen for Personal Profile & Lab Workspace Settings.
 * Connects directly to /api/users/profile and /api/workspace/settings.
 */
public class ProfileSettingsActivity extends AppCompatActivity {

    private static final String BASE_URL = "https://app.patholab.cloud";
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    // Header & Navigation
    private FrameLayout btnBack;
    private TextView heroAvatarInitial;
    private android.widget.ImageView heroAvatarImage;
    private TextView heroUserName;
    private TextView heroUserEmail;
    private TextView heroUserRole;
    private TextView heroLabName;
    private NestedScrollView settingsScrollView;

    // Tabs
    private TextView tabProfile, tabGeneral, tabLegal, tabBranding, tabBranches, tabModules, tabCommissions, tabIntegrations;

    // Section Views (for scroll anchoring)
    private View secProfile, secGeneral, secLegal, secModules, secCommissions, secIntegrations;

    // Profile Fields
    private EditText inputProfileName;
    private EditText inputProfileEmail;
    private EditText inputProfilePhone;
    private EditText inputCurrentPassword;
    private EditText inputNewPassword;

    // Lab General Fields
    private EditText inputLabName;
    private EditText inputLabEmail;
    private EditText inputLabPhone;
    private EditText inputLabAddress;
    private EditText inputLabCity;
    private EditText inputLabPincode;

    // Legal & Banking Fields
    private EditText inputLicenseNo;
    private EditText inputGstNo;
    private EditText inputBankName;
    private EditText inputAccountNo;
    private EditText inputIfscCode;

    // Modules Switches
    private SwitchCompat switchInventory;
    private SwitchCompat switchRadiology;
    private SwitchCompat switchIoT;
    private SwitchCompat switchB2B;
    private SwitchCompat switchLogistics;

    // Commissions
    private EditText inputDocCommission;
    private EditText inputAgencyCommission;

    // Integrations
    private EditText inputWaApiKey;
    private EditText inputWaPhoneId;

    // App Version Info
    private TextView lblAndroidVersionBuild;

    // Bottom Save
    private MaterialButton btnSaveAll;
    private ProgressBar progressBarSave;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_profile_settings);

        bindViews();
        setupTabClicks();
        setupActions();
        loadAllSettings();
    }

    @Override
    protected void onResume() {
        super.onResume();
        updateAppVersion();
        loadAllSettings();
    }

    private void bindViews() {
        btnBack            = findViewById(R.id.btnBack);
        heroAvatarInitial  = findViewById(R.id.heroAvatarInitial);
        heroAvatarImage    = findViewById(R.id.heroAvatarImage);
        heroUserName       = findViewById(R.id.heroUserName);
        heroUserEmail      = findViewById(R.id.heroUserEmail);
        heroUserRole       = findViewById(R.id.heroUserRole);
        heroLabName        = findViewById(R.id.heroLabName);
        settingsScrollView = findViewById(R.id.settingsScrollView);

        tabProfile      = findViewById(R.id.tabProfile);
        tabGeneral      = findViewById(R.id.tabGeneral);
        tabLegal        = findViewById(R.id.tabLegal);
        tabBranding     = findViewById(R.id.tabBranding);
        tabBranches     = findViewById(R.id.tabBranches);
        tabModules      = findViewById(R.id.tabModules);
        tabCommissions  = findViewById(R.id.tabCommissions);
        tabIntegrations = findViewById(R.id.tabIntegrations);

        secProfile      = findViewById(R.id.secProfile);
        secGeneral      = findViewById(R.id.secGeneral);
        secLegal        = findViewById(R.id.secLegal);
        secModules      = findViewById(R.id.secModules);
        secCommissions  = findViewById(R.id.secCommissions);
        secIntegrations = findViewById(R.id.secIntegrations);

        inputProfileName     = findViewById(R.id.inputProfileName);
        inputProfileEmail    = findViewById(R.id.inputProfileEmail);
        inputProfilePhone    = findViewById(R.id.inputProfilePhone);
        inputCurrentPassword = findViewById(R.id.inputCurrentPassword);
        inputNewPassword     = findViewById(R.id.inputNewPassword);

        inputLabName    = findViewById(R.id.inputLabName);
        inputLabEmail   = findViewById(R.id.inputLabEmail);
        inputLabPhone   = findViewById(R.id.inputLabPhone);
        inputLabAddress = findViewById(R.id.inputLabAddress);
        inputLabCity    = findViewById(R.id.inputLabCity);
        inputLabPincode = findViewById(R.id.inputLabPincode);

        inputLicenseNo  = findViewById(R.id.inputLicenseNo);
        inputGstNo      = findViewById(R.id.inputGstNo);
        inputBankName   = findViewById(R.id.inputBankName);
        inputAccountNo  = findViewById(R.id.inputAccountNo);
        inputIfscCode   = findViewById(R.id.inputIfscCode);

        switchInventory = findViewById(R.id.switchInventory);
        switchRadiology = findViewById(R.id.switchRadiology);
        switchIoT       = findViewById(R.id.switchIoT);
        switchB2B       = findViewById(R.id.switchB2B);
        switchLogistics = findViewById(R.id.switchLogistics);

        inputDocCommission    = findViewById(R.id.inputDocCommission);
        inputAgencyCommission = findViewById(R.id.inputAgencyCommission);

        inputWaApiKey  = findViewById(R.id.inputWaApiKey);
        inputWaPhoneId = findViewById(R.id.inputWaPhoneId);

        lblAndroidVersionBuild = findViewById(R.id.lblAndroidVersionBuild);
        updateAppVersion();

        btnSaveAll      = findViewById(R.id.btnSaveAll);
        progressBarSave = findViewById(R.id.progressBarSave);
    }

    private void updateAppVersion() {
        try {
            android.content.pm.PackageInfo pInfo = getPackageManager().getPackageInfo(getPackageName(), 0);
            String versionName = (pInfo.versionName != null && !pInfo.versionName.isEmpty()) ? pInfo.versionName : "1.0.4";
            long versionCode;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                versionCode = pInfo.getLongVersionCode();
            } else {
                versionCode = pInfo.versionCode;
            }
            if (lblAndroidVersionBuild != null) {
                lblAndroidVersionBuild.setText("v" + versionName + " (Build " + versionCode + ")");
            }
        } catch (Exception e) {
            if (lblAndroidVersionBuild != null) {
                lblAndroidVersionBuild.setText("v1.0.4 (Build 4)");
            }
        }
    }

    private void setupTabClicks() {
        tabProfile.setOnClickListener(v -> scrollToSection(secProfile, tabProfile));
        tabGeneral.setOnClickListener(v -> scrollToSection(secGeneral, tabGeneral));
        tabLegal.setOnClickListener(v -> scrollToSection(secLegal, tabLegal));
        tabBranding.setOnClickListener(v -> scrollToSection(secGeneral, tabBranding));
        tabBranches.setOnClickListener(v -> scrollToSection(secGeneral, tabBranches));
        tabModules.setOnClickListener(v -> scrollToSection(secModules, tabModules));
        tabCommissions.setOnClickListener(v -> scrollToSection(secCommissions, tabCommissions));
        tabIntegrations.setOnClickListener(v -> scrollToSection(secIntegrations, tabIntegrations));
    }

    private void scrollToSection(View targetView, TextView activeTab) {
        if (targetView != null && settingsScrollView != null) {
            settingsScrollView.smoothScrollTo(0, targetView.getTop() - dp(10));
        }
        highlightTab(activeTab);
    }

    private void highlightTab(TextView activeTab) {
        TextView[] allTabs = {tabProfile, tabGeneral, tabLegal, tabBranding, tabBranches, tabModules, tabCommissions, tabIntegrations};
        for (TextView t : allTabs) {
            if (t == null) continue;
            if (t == activeTab) {
                t.setBackgroundResource(R.drawable.bg_tab_pill_active);
                t.setTextColor(0xFFFFFFFF);
            } else {
                t.setBackgroundResource(R.drawable.bg_tab_pill_inactive);
                t.setTextColor(0xFF64748B);
            }
        }
    }

    private void setupActions() {
        btnBack.setOnClickListener(v -> finish());
        btnSaveAll.setOnClickListener(v -> saveAllSettings());
        View btnRefresh = findViewById(R.id.btnRefreshSettings);
        ImageView imgRefreshIcon = findViewById(R.id.imgRefreshSettingsIcon);
        if (btnRefresh != null) {
            btnRefresh.setOnClickListener(v -> {
                if (imgRefreshIcon != null) {
                    RotateAnimation rotate = new RotateAnimation(0, 360,
                            Animation.RELATIVE_TO_SELF, 0.5f, Animation.RELATIVE_TO_SELF, 0.5f);
                    rotate.setDuration(600);
                    imgRefreshIcon.startAnimation(rotate);
                }
                loadAllSettings();
                Toast.makeText(this, "Refreshing workspace settings...", Toast.LENGTH_SHORT).show();
            });
        }
    }

    private String safeString(String s) {
        if (s == null || s.trim().isEmpty() || "null".equalsIgnoreCase(s.trim())) return "";
        return s.trim();
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Data Loading from APIs
    // ─────────────────────────────────────────────────────────────────────────
    private void loadAllSettings() {
        final String token = getAuthToken();
        if (token == null) return;

        // 1. Fetch User Profile
        new Thread(() -> {
            try {
                URL url = new URL(BASE_URL + "/api/users/profile");
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestProperty("Authorization", "Bearer " + token);
                conn.setRequestProperty("Cookie", "token=" + token);
                conn.setConnectTimeout(6000);
                conn.setReadTimeout(6000);
                if (conn.getResponseCode() == 200) {
                    String json = readStream(conn.getInputStream());
                    JSONObject root = new JSONObject(json);
                    JSONObject user = root.optJSONObject("user");
                    if (user != null) {
                        final String name  = safeString(user.optString("name", ""));
                        final String email = safeString(user.optString("email", ""));
                        final String phone = safeString(user.optString("phone", ""));
                        mainHandler.post(() -> {
                            if (inputProfileName != null) inputProfileName.setText(name);
                            if (inputProfileEmail != null) inputProfileEmail.setText(email);
                            if (inputProfilePhone != null) inputProfilePhone.setText(phone);
                            if (heroUserName != null) heroUserName.setText(name.isEmpty() ? email : name);
                            if (heroUserEmail != null) heroUserEmail.setText(email);

                            String smartFirst = HomeNativeManager.formatSmartFirstName(name.isEmpty() ? email : name);
                            if (heroAvatarInitial != null && !smartFirst.isEmpty()) {
                                heroAvatarInitial.setText(String.valueOf(smartFirst.charAt(0)).toUpperCase());
                            }
                            SharedPreferences prefs = getSharedPreferences("patholab_home_prefs", Context.MODE_PRIVATE);
                            String savedGender = prefs.getString("user_avatar_gender", "");
                            int avatarRes = R.drawable.avatar_boy;
                            if ("girl".equalsIgnoreCase(savedGender) || "female".equalsIgnoreCase(savedGender) || HomeNativeManager.isFemaleUser(name, email)) {
                                avatarRes = R.drawable.avatar_girl;
                            }
                            if (heroAvatarImage != null) {
                                heroAvatarImage.setImageResource(avatarRes);
                            }
                        });
                    }
                }
            } catch (Exception ignored) {}
        }).start();

        // 2. Fetch Workspace Settings
        new Thread(() -> {
            try {
                URL url = new URL(BASE_URL + "/api/workspace/settings");
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestProperty("Authorization", "Bearer " + token);
                conn.setRequestProperty("Cookie", "token=" + token);
                conn.setConnectTimeout(6000);
                conn.setReadTimeout(6000);
                if (conn.getResponseCode() == 200) {
                    String json = readStream(conn.getInputStream());
                    JSONObject root = new JSONObject(json);
                    JSONObject lab = root.optJSONObject("lab");
                    if (lab != null) {
                        final String lName    = safeString(lab.optString("name", ""));
                        final String lEmail   = safeString(lab.optString("email", ""));
                        final String lPhone   = safeString(lab.optString("phone", ""));
                        final String lAddress = safeString(lab.optString("address", ""));
                        final String lCity    = safeString(lab.optString("city", ""));
                        final String lPincode = safeString(lab.optString("pincode", ""));
                        final String lLicense = safeString(lab.optString("licenseNumber", ""));
                        final String lGst     = safeString(lab.optString("gstNumber", ""));
                        final String lBank    = safeString(lab.optString("bankName", ""));
                        final String lAcc     = safeString(lab.optString("accountNumber", ""));
                        final String lIfsc    = safeString(lab.optString("ifscCode", ""));

                        final double docComm    = lab.optDouble("defaultDoctorCommission", 10.0);
                        final double agencyComm = lab.optDouble("defaultAgencyCommission", 5.0);

                        final String waKey = safeString(lab.optString("whatsappApiKey", ""));
                        final String waId  = safeString(lab.optString("whatsappPhoneId", ""));

                        final JSONArray modulesArr = lab.optJSONArray("activeModules");

                        mainHandler.post(() -> {
                            if (heroLabName != null) heroLabName.setText(lName.isEmpty() ? "Main Lab" : lName);
                            if (inputLabName != null) inputLabName.setText(lName);
                            if (inputLabEmail != null) inputLabEmail.setText(lEmail);
                            if (inputLabPhone != null) inputLabPhone.setText(lPhone);
                            if (inputLabAddress != null) inputLabAddress.setText(lAddress);
                            if (inputLabCity != null) inputLabCity.setText(lCity);
                            if (inputLabPincode != null) inputLabPincode.setText(lPincode);

                            if (inputLicenseNo != null) inputLicenseNo.setText(lLicense);
                            if (inputGstNo != null) inputGstNo.setText(lGst);
                            if (inputBankName != null) inputBankName.setText(lBank);
                            if (inputAccountNo != null) inputAccountNo.setText(lAcc);
                            if (inputIfscCode != null) inputIfscCode.setText(lIfsc);

                            if (inputDocCommission != null) inputDocCommission.setText(String.valueOf(docComm));
                            if (inputAgencyCommission != null) inputAgencyCommission.setText(String.valueOf(agencyComm));

                            if (inputWaApiKey != null) inputWaApiKey.setText(waKey);
                            if (inputWaPhoneId != null) inputWaPhoneId.setText(waId);

                            if (modulesArr != null) {
                                String mods = modulesArr.toString();
                                if (switchInventory != null) switchInventory.setChecked(mods.contains("inventory"));
                                if (switchRadiology != null) switchRadiology.setChecked(mods.contains("radiology"));
                                if (switchIoT != null) switchIoT.setChecked(mods.contains("iot"));
                                if (switchB2B != null) switchB2B.setChecked(mods.contains("b2b"));
                                if (switchLogistics != null) switchLogistics.setChecked(mods.contains("logistics"));
                            }
                        });
                    }
                }
            } catch (Exception ignored) {}
        }).start();
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Save Settings
    // ─────────────────────────────────────────────────────────────────────────
    private void saveAllSettings() {
        final String token = getAuthToken();
        if (token == null) {
            Toast.makeText(this, "Session expired. Please log in again.", Toast.LENGTH_SHORT).show();
            return;
        }

        setSavingState(true);

        final String pName  = inputProfileName.getText().toString().trim();
        final String pEmail = inputProfileEmail.getText().toString().trim();
        final String pPhone = inputProfilePhone.getText().toString().trim();

        // 1. Update Profile
        new Thread(() -> {
            boolean profileOk = true;
            try {
                JSONObject pPayload = new JSONObject();
                pPayload.put("name", pName);
                pPayload.put("email", pEmail);
                pPayload.put("phone", pPhone);

                URL url = new URL(BASE_URL + "/api/users/profile");
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("PUT");
                conn.setRequestProperty("Content-Type", "application/json");
                conn.setRequestProperty("Authorization", "Bearer " + token);
                conn.setRequestProperty("Cookie", "token=" + token);
                conn.setDoOutput(true);

                OutputStreamWriter wr = new OutputStreamWriter(conn.getOutputStream(), "UTF-8");
                wr.write(pPayload.toString());
                wr.flush();
                wr.close();

                int code = conn.getResponseCode();
                profileOk = (code >= 200 && code < 300);

                if (profileOk) {
                    AuthManager.saveUserInfo(ProfileSettingsActivity.this, pEmail, pName, "Lab Owner");
                    getSharedPreferences("PatholabPrefs", MODE_PRIVATE).edit().putString("user_name", pName).apply();
                }
            } catch (Exception e) {
                profileOk = false;
            }

            // 2. Update Workspace Settings
            boolean workspaceOk = true;
            try {
                JSONObject wPayload = new JSONObject();
                wPayload.put("name", inputLabName.getText().toString().trim());
                wPayload.put("email", inputLabEmail.getText().toString().trim());
                wPayload.put("phone", inputLabPhone.getText().toString().trim());
                wPayload.put("address", inputLabAddress.getText().toString().trim());
                wPayload.put("city", inputLabCity.getText().toString().trim());
                wPayload.put("pincode", inputLabPincode.getText().toString().trim());

                wPayload.put("licenseNumber", inputLicenseNo.getText().toString().trim());
                wPayload.put("gstNumber", inputGstNo.getText().toString().trim());
                wPayload.put("bankName", inputBankName.getText().toString().trim());
                wPayload.put("accountNumber", inputAccountNo.getText().toString().trim());
                wPayload.put("ifscCode", inputIfscCode.getText().toString().trim());

                try {
                    wPayload.put("defaultDoctorCommission", Double.parseDouble(inputDocCommission.getText().toString().trim()));
                } catch (Exception ignored) {}
                try {
                    wPayload.put("defaultAgencyCommission", Double.parseDouble(inputAgencyCommission.getText().toString().trim()));
                } catch (Exception ignored) {}

                wPayload.put("whatsappApiKey", inputWaApiKey.getText().toString().trim());
                wPayload.put("whatsappPhoneId", inputWaPhoneId.getText().toString().trim());

                JSONArray activeMods = new JSONArray();
                if (switchInventory.isChecked()) activeMods.put("inventory");
                if (switchRadiology.isChecked()) activeMods.put("radiology");
                if (switchIoT.isChecked()) activeMods.put("iot");
                if (switchB2B.isChecked()) activeMods.put("b2b");
                if (switchLogistics.isChecked()) activeMods.put("logistics");
                wPayload.put("activeModules", activeMods);

                URL url = new URL(BASE_URL + "/api/workspace/settings");
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("PUT");
                conn.setRequestProperty("Content-Type", "application/json");
                conn.setRequestProperty("Authorization", "Bearer " + token);
                conn.setRequestProperty("Cookie", "token=" + token);
                conn.setDoOutput(true);

                OutputStreamWriter wr = new OutputStreamWriter(conn.getOutputStream(), "UTF-8");
                wr.write(wPayload.toString());
                wr.flush();
                wr.close();

                int code = conn.getResponseCode();
                workspaceOk = (code >= 200 && code < 300);
            } catch (Exception e) {
                workspaceOk = false;
            }

            final boolean success = profileOk || workspaceOk;
            mainHandler.post(() -> {
                setSavingState(false);
                if (success) {
                    vibrateSuccess();
                    Toast.makeText(ProfileSettingsActivity.this, "Settings saved successfully!", Toast.LENGTH_SHORT).show();
                    heroUserName.setText(pName);
                    heroUserEmail.setText(pEmail);
                } else {
                    Toast.makeText(ProfileSettingsActivity.this, "Failed to save settings. Please try again.", Toast.LENGTH_SHORT).show();
                }
            });
        }).start();
    }

    private void setSavingState(boolean saving) {
        if (btnSaveAll != null) {
            btnSaveAll.setEnabled(!saving);
            btnSaveAll.setText(saving ? "" : "Save All Settings");
        }
        if (progressBarSave != null) {
            progressBarSave.setVisibility(saving ? View.VISIBLE : View.GONE);
        }
    }

    private void vibrateSuccess() {
        try {
            Vibrator v = (Vibrator) getSystemService(VIBRATOR_SERVICE);
            if (v != null) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    v.vibrate(VibrationEffect.createOneShot(45, VibrationEffect.DEFAULT_AMPLITUDE));
                } else {
                    v.vibrate(45);
                }
            }
        } catch (Exception ignored) {}
    }

    private String getAuthToken() {
        String token = AuthManager.getToken(this);
        if (token != null && !token.trim().isEmpty()) return token.trim();
        try {
            SharedPreferences sp = getSharedPreferences("PatholabPrefs", MODE_PRIVATE);
            String spToken = sp.getString("auth_token", null);
            if (spToken == null || spToken.trim().isEmpty()) {
                spToken = sp.getString("token", null);
            }
            if (spToken != null && !spToken.trim().isEmpty()) {
                AuthManager.saveToken(this, spToken.trim());
                return spToken.trim();
            }
        } catch (Exception ignored) {}
        try {
            CookieManager cm = CookieManager.getInstance();
            String cookies = cm.getCookie(BASE_URL);
            if (cookies != null) {
                for (String part : cookies.split(";")) {
                    String trimmed = part.trim();
                    if (trimmed.startsWith("token=")) {
                        String cookieToken = trimmed.substring(6).trim();
                        if (!cookieToken.isEmpty()) {
                            AuthManager.saveToken(this, cookieToken);
                            return cookieToken;
                        }
                    }
                }
            }
        } catch (Exception ignored) {}
        return null;
    }

    private String readStream(InputStream is) throws Exception {
        BufferedReader reader = new BufferedReader(new InputStreamReader(is, "UTF-8"));
        StringBuilder sb = new StringBuilder();
        String line;
        while ((line = reader.readLine()) != null) sb.append(line);
        return sb.toString();
    }

    private int dp(int value) {
        float density = getResources().getDisplayMetrics().density;
        return Math.round(value * density);
    }
}
