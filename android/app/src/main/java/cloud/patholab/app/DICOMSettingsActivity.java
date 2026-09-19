package cloud.patholab.app;

import android.content.Context;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.view.animation.Animation;
import android.view.animation.RotateAnimation;
import android.webkit.CookieManager;
import android.widget.Button;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;
import androidx.core.content.ContextCompat;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

import cloud.patholab.app.auth.AuthManager;

/**
 * DICOMSettingsActivity — DICOM & PACS Networking Configuration
 * Full parity with web module: /workspace/radiology/settings/dicom
 * Real-time, user-specific two-way synchronization with backend APIs:
 * - GET  /api/workspace/radiology/settings/dicom
 * - PUT  /api/workspace/radiology/settings/dicom
 * - POST /api/workspace/radiology/settings/dicom (C-ECHO ping test)
 */
public class DICOMSettingsActivity extends AppCompatActivity {

    private static final String BASE_URL = "https://app.patholab.cloud";

    // Header & Loading
    private FrameLayout btnBack, btnRefresh;
    private ImageView imgRefreshIcon;
    private ProgressBar progressLoading;

    // Section 1: Local RIS Node
    private EditText inputLocalAETitle, inputLocalPort;

    // Section 2: Primary PACS Archive
    private EditText inputPacsAETitle, inputPacsIpAddress, inputPacsPort;
    private LinearLayout cardConnectionStatus;
    private ImageView imgStatusIcon;
    private ProgressBar progressCEchoPing;
    private TextView lblStatusDescription;
    private Button btnTestCEcho;

    // Section 3: Diagnostic Web Viewer (WADO)
    private EditText inputViewerBaseUrl;

    // Section 4: Modality Worklist (MWL)
    private TextView lblMwlStatusBadge;
    private View dotMwlIndicator;
    private LinearLayout layoutMwlInputs;
    private EditText inputMwlAETitle, inputMwlPort;
    private Button btnToggleMwlService;

    // Sticky Save Action
    private LinearLayout btnSaveConfig;
    private ImageView imgSaveIcon;
    private ProgressBar progressSave;
    private TextView lblSaveButtonText;

    // State
    private boolean isMwlEnabled = true;
    private enum PacsStatus { UNKNOWN, TESTING, CONNECTED, FAILED }
    private PacsStatus currentPacsStatus = PacsStatus.UNKNOWN;

    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_dicom_settings);

        initViews();
        setupListeners();
        fetchDicomSettings(false);
    }

    private void initViews() {
        btnBack            = findViewById(R.id.btnDicomBack);
        btnRefresh         = findViewById(R.id.btnDicomRefresh);
        imgRefreshIcon     = findViewById(R.id.imgDicomRefreshIcon);
        progressLoading    = findViewById(R.id.progressDicomLoading);

        // Section 1
        inputLocalAETitle  = findViewById(R.id.inputLocalAETitle);
        inputLocalPort     = findViewById(R.id.inputLocalPort);

        // Section 2
        inputPacsAETitle     = findViewById(R.id.inputPacsAETitle);
        inputPacsIpAddress   = findViewById(R.id.inputPacsIpAddress);
        inputPacsPort        = findViewById(R.id.inputPacsPort);
        cardConnectionStatus = findViewById(R.id.cardConnectionStatus);
        imgStatusIcon        = findViewById(R.id.imgStatusIcon);
        progressCEchoPing    = findViewById(R.id.progressCEchoPing);
        lblStatusDescription = findViewById(R.id.lblStatusDescription);
        btnTestCEcho         = findViewById(R.id.btnTestCEcho);

        // Section 3
        inputViewerBaseUrl   = findViewById(R.id.inputViewerBaseUrl);

        // Section 4
        lblMwlStatusBadge    = findViewById(R.id.lblMwlStatusBadge);
        dotMwlIndicator      = findViewById(R.id.dotMwlIndicator);
        layoutMwlInputs      = findViewById(R.id.layoutMwlInputs);
        inputMwlAETitle      = findViewById(R.id.inputMwlAETitle);
        inputMwlPort         = findViewById(R.id.inputMwlPort);
        btnToggleMwlService  = findViewById(R.id.btnToggleMwlService);

        // Save
        btnSaveConfig        = findViewById(R.id.btnSaveDicomConfig);
        imgSaveIcon          = findViewById(R.id.imgSaveIcon);
        progressSave         = findViewById(R.id.progressDicomSave);
        lblSaveButtonText    = findViewById(R.id.lblSaveButtonText);

        updateMwlUI();
        updatePacsStatusUI(PacsStatus.UNKNOWN, "Not tested recently");
    }

    private void setupListeners() {
        btnBack.setOnClickListener(v -> finish());

        btnRefresh.setOnClickListener(v -> {
            animateRefresh();
            fetchDicomSettings(true);
        });

        btnToggleMwlService.setOnClickListener(v -> {
            isMwlEnabled = !isMwlEnabled;
            updateMwlUI();
        });

        btnTestCEcho.setOnClickListener(v -> testCEchoPing());

        btnSaveConfig.setOnClickListener(v -> saveConfiguration());
    }

    private void animateRefresh() {
        if (imgRefreshIcon == null) return;
        RotateAnimation r = new RotateAnimation(0, 360, Animation.RELATIVE_TO_SELF, 0.5f, Animation.RELATIVE_TO_SELF, 0.5f);
        r.setDuration(600);
        r.setRepeatCount(1);
        imgRefreshIcon.startAnimation(r);
    }

    private void updateMwlUI() {
        if (isMwlEnabled) {
            lblMwlStatusBadge.setText("ACTIVE");
            lblMwlStatusBadge.setTextColor(Color.parseColor("#059669"));
            dotMwlIndicator.setBackground(ContextCompat.getDrawable(this, R.drawable.shape_dot_emerald));
            layoutMwlInputs.setAlpha(1.0f);
            inputMwlAETitle.setEnabled(true);
            inputMwlPort.setEnabled(true);
            btnToggleMwlService.setText("Disable MWL Service");
            btnToggleMwlService.setTextColor(Color.WHITE);
            btnToggleMwlService.setBackground(ContextCompat.getDrawable(this, R.drawable.bg_btn_danger));
        } else {
            lblMwlStatusBadge.setText("DISABLED");
            lblMwlStatusBadge.setTextColor(Color.parseColor("#64748B"));
            dotMwlIndicator.setBackground(ContextCompat.getDrawable(this, R.drawable.bg_circle_slate));
            layoutMwlInputs.setAlpha(0.4f);
            inputMwlAETitle.setEnabled(false);
            inputMwlPort.setEnabled(false);
            btnToggleMwlService.setText("Enable MWL Service");
            btnToggleMwlService.setTextColor(Color.WHITE);
            btnToggleMwlService.setBackground(ContextCompat.getDrawable(this, R.drawable.bg_btn_primary));
        }
    }

    private void updatePacsStatusUI(PacsStatus status, String customMessage) {
        currentPacsStatus = status;
        switch (status) {
            case TESTING:
                cardConnectionStatus.setBackgroundResource(R.drawable.bg_dicom_status_unknown);
                imgStatusIcon.setVisibility(View.GONE);
                progressCEchoPing.setVisibility(View.VISIBLE);
                lblStatusDescription.setText(customMessage != null ? customMessage : "Testing connection...");
                lblStatusDescription.setTextColor(Color.parseColor("#4F46E5"));
                btnTestCEcho.setEnabled(false);
                btnTestCEcho.setAlpha(0.6f);
                break;
            case CONNECTED:
                cardConnectionStatus.setBackgroundResource(R.drawable.bg_dicom_status_connected);
                imgStatusIcon.setVisibility(View.VISIBLE);
                imgStatusIcon.setImageResource(R.drawable.ic_wifi_connected);
                progressCEchoPing.setVisibility(View.GONE);
                lblStatusDescription.setText(customMessage != null ? customMessage : "Online & Reachable (C-ECHO OK)");
                lblStatusDescription.setTextColor(Color.parseColor("#059669"));
                btnTestCEcho.setEnabled(true);
                btnTestCEcho.setAlpha(1.0f);
                break;
            case FAILED:
                cardConnectionStatus.setBackgroundResource(R.drawable.bg_dicom_status_failed);
                imgStatusIcon.setVisibility(View.VISIBLE);
                imgStatusIcon.setImageResource(R.drawable.ic_wifi_failed);
                progressCEchoPing.setVisibility(View.GONE);
                lblStatusDescription.setText(customMessage != null ? customMessage : "Connection Failed (Check IP/Port)");
                lblStatusDescription.setTextColor(Color.parseColor("#DC2626"));
                btnTestCEcho.setEnabled(true);
                btnTestCEcho.setAlpha(1.0f);
                break;
            case UNKNOWN:
            default:
                cardConnectionStatus.setBackgroundResource(R.drawable.bg_dicom_status_unknown);
                imgStatusIcon.setVisibility(View.VISIBLE);
                imgStatusIcon.setImageResource(R.drawable.ic_network_plug);
                progressCEchoPing.setVisibility(View.GONE);
                lblStatusDescription.setText(customMessage != null ? customMessage : "Not tested recently");
                lblStatusDescription.setTextColor(Color.parseColor("#64748B"));
                btnTestCEcho.setEnabled(true);
                btnTestCEcho.setAlpha(1.0f);
                break;
        }
    }

    // 1. Fetch Real-time Settings
    private void fetchDicomSettings(boolean isManual) {
        progressLoading.setVisibility(View.VISIBLE);

        new Thread(() -> {
            try {
                String token = resolveToken();
                String labId = resolveLabId();
                String endpoint = BASE_URL + "/api/workspace/radiology/settings/dicom";
                if (!labId.isEmpty()) {
                    endpoint += "?labId=" + labId;
                }

                URL url = new URL(endpoint);
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("GET");
                conn.setRequestProperty("Authorization", "Bearer " + token);
                conn.setRequestProperty("Cookie", "token=" + token + "; auth-token=" + token);
                conn.setRequestProperty("Accept", "application/json");
                conn.setConnectTimeout(10000);
                conn.setReadTimeout(15000);

                int code = conn.getResponseCode();
                if (code >= 200 && code < 300) {
                    String body = readStream(conn.getInputStream()).trim();
                    JSONObject data = new JSONObject(body);
                    saveLocalCache(data);

                    mainHandler.post(() -> {
                        progressLoading.setVisibility(View.GONE);
                        bindDicomSettings(data);
                        if (isManual) {
                            Toast.makeText(this, "DICOM settings synchronized", Toast.LENGTH_SHORT).show();
                        }
                    });
                } else {
                    mainHandler.post(() -> {
                        progressLoading.setVisibility(View.GONE);
                        JSONObject cached = loadLocalCache();
                        if (cached != null) {
                            bindDicomSettings(cached);
                        } else {
                            clearInputFields();
                        }
                    });
                }
                conn.disconnect();
            } catch (Exception e) {
                mainHandler.post(() -> {
                    progressLoading.setVisibility(View.GONE);
                    JSONObject cached = loadLocalCache();
                    if (cached != null) {
                        bindDicomSettings(cached);
                    } else {
                        clearInputFields();
                    }
                });
            }
        }).start();
    }

    private void saveLocalCache(JSONObject data) {
        try {
            getSharedPreferences("dicom_settings_cache", MODE_PRIVATE).edit()
                .putString("settings_json", data.toString())
                .apply();
        } catch (Exception ignored) {}
    }

    private JSONObject loadLocalCache() {
        try {
            String raw = getSharedPreferences("dicom_settings_cache", MODE_PRIVATE).getString("settings_json", null);
            if (raw != null) {
                return new JSONObject(raw);
            }
        } catch (Exception ignored) {}
        return null;
    }

    private void clearInputFields() {
        inputLocalAETitle.setText("");
        inputLocalPort.setText("");
        inputPacsAETitle.setText("");
        inputPacsIpAddress.setText("");
        inputPacsPort.setText("");
        inputViewerBaseUrl.setText("");
        inputMwlAETitle.setText("");
        inputMwlPort.setText("");
        updateMwlUI();
    }

    private void bindDicomSettings(JSONObject data) {
        if (data == null) {
            clearInputFields();
            return;
        }

        inputLocalAETitle.setText(data.optString("localAETitle", ""));

        int localPort = data.optInt("localPort", 0);
        inputLocalPort.setText(localPort > 0 ? String.valueOf(localPort) : "");

        inputPacsAETitle.setText(data.optString("pacsAETitle", ""));
        inputPacsIpAddress.setText(data.optString("pacsIpAddress", ""));

        int pacsPort = data.optInt("pacsPort", 0);
        inputPacsPort.setText(pacsPort > 0 ? String.valueOf(pacsPort) : "");

        inputViewerBaseUrl.setText(data.optString("viewerBaseUrl", ""));

        isMwlEnabled = data.optBoolean("enableMwl", true);
        inputMwlAETitle.setText(data.optString("mwlAETitle", ""));

        int mwlPort = data.optInt("mwlPort", 0);
        inputMwlPort.setText(mwlPort > 0 ? String.valueOf(mwlPort) : "");

        updateMwlUI();
    }

    // 2. Test C-ECHO (Ping PACS)
    private void testCEchoPing() {
        String pacsIp = inputPacsIpAddress.getText().toString().trim();
        String pacsPortStr = inputPacsPort.getText().toString().trim();
        String pacsAe = inputPacsAETitle.getText().toString().trim().toUpperCase();

        if (pacsIp.isEmpty()) {
            Toast.makeText(this, "Please enter PACS IP / Hostname first", Toast.LENGTH_SHORT).show();
            inputPacsIpAddress.requestFocus();
            return;
        }

        int pacsPort = 4242;
        try {
            pacsPort = Integer.parseInt(pacsPortStr);
        } catch (Exception e) {
            pacsPort = 4242;
        }

        final int targetPort = pacsPort;
        updatePacsStatusUI(PacsStatus.TESTING, "Testing connection...");

        new Thread(() -> {
            try {
                String token = resolveToken();
                String labId = resolveLabId();
                String endpoint = BASE_URL + "/api/workspace/radiology/settings/dicom";
                if (!labId.isEmpty()) {
                    endpoint += "?labId=" + labId;
                }

                URL url = new URL(endpoint);
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("POST");
                conn.setRequestProperty("Authorization", "Bearer " + token);
                conn.setRequestProperty("Cookie", "token=" + token + "; auth-token=" + token);
                conn.setRequestProperty("Content-Type", "application/json");
                conn.setRequestProperty("Accept", "application/json");
                conn.setConnectTimeout(15000);
                conn.setReadTimeout(20000);
                conn.setDoOutput(true);

                JSONObject payload = new JSONObject();
                payload.put("ipAddress", pacsIp);
                payload.put("port", targetPort);
                payload.put("aeTitle", pacsAe);

                OutputStream os = conn.getOutputStream();
                os.write(payload.toString().getBytes(StandardCharsets.UTF_8));
                os.close();

                int code = conn.getResponseCode();
                InputStream is = (code >= 200 && code < 300) ? conn.getInputStream() : conn.getErrorStream();
                String responseBody = readStream(is);
                JSONObject resJson = new JSONObject(responseBody);

                mainHandler.post(() -> {
                    if (code >= 200 && code < 300 && resJson.optBoolean("success", false)) {
                        String msg = resJson.optString("message", "C-ECHO Successful: PACS is online and reachable.");
                        updatePacsStatusUI(PacsStatus.CONNECTED, "Online & Reachable (C-ECHO OK)");
                        Toast.makeText(this, msg, Toast.LENGTH_LONG).show();
                    } else {
                        String errMsg = resJson.optString("error", "C-ECHO Failed: Could not reach PACS server.");
                        updatePacsStatusUI(PacsStatus.FAILED, "Connection Failed (Check IP/Port)");
                        Toast.makeText(this, errMsg, Toast.LENGTH_LONG).show();
                    }
                });

                conn.disconnect();
            } catch (Exception e) {
                mainHandler.post(() -> {
                    updatePacsStatusUI(PacsStatus.FAILED, "Connection error: " + e.getMessage());
                    Toast.makeText(this, "Ping failed: " + e.getMessage(), Toast.LENGTH_LONG).show();
                });
            }
        }).start();
    }

    // 3. Save Configuration via PUT
    private void saveConfiguration() {
        String localAe = inputLocalAETitle.getText().toString().trim().toUpperCase();
        String localPortStr = inputLocalPort.getText().toString().trim();
        String pacsAe = inputPacsAETitle.getText().toString().trim().toUpperCase();
        String pacsIp = inputPacsIpAddress.getText().toString().trim();
        String pacsPortStr = inputPacsPort.getText().toString().trim();
        String mwlAe = inputMwlAETitle.getText().toString().trim().toUpperCase();
        String mwlPortStr = inputMwlPort.getText().toString().trim();
        String viewerUrl = inputViewerBaseUrl.getText().toString().trim();

        if (localAe.isEmpty()) {
            Toast.makeText(this, "Local AE Title is required", Toast.LENGTH_SHORT).show();
            inputLocalAETitle.requestFocus();
            return;
        }

        int localPort = 11112;
        try { localPort = Integer.parseInt(localPortStr); } catch (Exception ignored) {}

        int pacsPort = 4242;
        try { pacsPort = Integer.parseInt(pacsPortStr); } catch (Exception ignored) {}

        int mwlPort = 11113;
        try { mwlPort = Integer.parseInt(mwlPortStr); } catch (Exception ignored) {}

        // Loading state on button
        btnSaveConfig.setEnabled(false);
        imgSaveIcon.setVisibility(View.GONE);
        progressSave.setVisibility(View.VISIBLE);
        lblSaveButtonText.setText("Saving Config...");

        final int finalLocalPort = localPort;
        final int finalPacsPort = pacsPort;
        final int finalMwlPort = mwlPort;

        new Thread(() -> {
            try {
                String token = resolveToken();
                String labId = resolveLabId();
                String endpoint = BASE_URL + "/api/workspace/radiology/settings/dicom";
                if (!labId.isEmpty()) {
                    endpoint += "?labId=" + labId;
                }

                URL url = new URL(endpoint);
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("PUT");
                conn.setRequestProperty("Authorization", "Bearer " + token);
                conn.setRequestProperty("Cookie", "token=" + token + "; auth-token=" + token);
                conn.setRequestProperty("Content-Type", "application/json");
                conn.setRequestProperty("Accept", "application/json");
                conn.setConnectTimeout(10000);
                conn.setReadTimeout(15000);
                conn.setDoOutput(true);

                JSONObject payload = new JSONObject();
                payload.put("localAETitle", localAe);
                payload.put("localPort", finalLocalPort);
                payload.put("pacsAETitle", pacsAe);
                payload.put("pacsIpAddress", pacsIp);
                payload.put("pacsPort", finalPacsPort);
                payload.put("enableMwl", isMwlEnabled);
                payload.put("mwlAETitle", mwlAe);
                payload.put("mwlPort", finalMwlPort);
                payload.put("viewerBaseUrl", viewerUrl);

                saveLocalCache(payload);

                OutputStream os = conn.getOutputStream();
                os.write(payload.toString().getBytes(StandardCharsets.UTF_8));
                os.close();

                int code = conn.getResponseCode();
                InputStream is = (code >= 200 && code < 300) ? conn.getInputStream() : conn.getErrorStream();
                String responseBody = readStream(is);
                JSONObject resJson = new JSONObject(responseBody);

                mainHandler.post(() -> {
                    btnSaveConfig.setEnabled(true);
                    imgSaveIcon.setVisibility(View.VISIBLE);
                    progressSave.setVisibility(View.GONE);
                    lblSaveButtonText.setText("Save Configuration");

                    if (code >= 200 && code < 300) {
                        String msg = resJson.optString("message", "DICOM Configuration Saved");
                        Toast.makeText(this, msg, Toast.LENGTH_SHORT).show();
                    } else {
                        Toast.makeText(this, "DICOM Configuration saved locally", Toast.LENGTH_SHORT).show();
                    }
                });

                conn.disconnect();
            } catch (Exception e) {
                mainHandler.post(() -> {
                    btnSaveConfig.setEnabled(true);
                    imgSaveIcon.setVisibility(View.VISIBLE);
                    progressSave.setVisibility(View.GONE);
                    lblSaveButtonText.setText("Save Configuration");
                    Toast.makeText(this, "Save error: " + e.getMessage(), Toast.LENGTH_SHORT).show();
                });
            }
        }).start();
    }

    private String resolveToken() {
        String token = AuthManager.getToken(this);
        if (token != null && !token.isEmpty()) return token;

        try {
            CookieManager cm = CookieManager.getInstance();
            String cookie = cm.getCookie(BASE_URL);
            if (cookie != null) {
                for (String part : cookie.split(";")) {
                    String tr = part.trim();
                    if (tr.startsWith("token=")) {
                        String val = tr.substring(6).trim();
                        if (!val.isEmpty()) return val;
                    }
                    if (tr.startsWith("auth-token=")) {
                        String val = tr.substring(11).trim();
                        if (!val.isEmpty()) return val;
                    }
                }
            }
        } catch (Exception ignored) {}

        try {
            SharedPreferences prefs = getSharedPreferences("patholab_prefs", Context.MODE_PRIVATE);
            String pt = prefs.getString("auth_token", "");
            if (!pt.isEmpty()) return pt;
            return prefs.getString("token", "");
        } catch (Exception ignored) {
            return "";
        }
    }

    private String resolveLabId() {
        try {
            SharedPreferences prefs = getSharedPreferences("patholab_prefs", Context.MODE_PRIVATE);
            String id = prefs.getString("user_lab_id", "");
            if (id.isEmpty()) id = prefs.getString("current_lab_id", "");
            if (id.isEmpty()) id = prefs.getString("lab_id", "");
            return id;
        } catch (Exception ignored) {
            return "";
        }
    }

    private String readStream(InputStream is) throws Exception {
        if (is == null) return "{}";
        BufferedReader r = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8));
        StringBuilder sb = new StringBuilder();
        String l;
        while ((l = r.readLine()) != null) {
            sb.append(l);
        }
        return sb.toString();
    }
}
