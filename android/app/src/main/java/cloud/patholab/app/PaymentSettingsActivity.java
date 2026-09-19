package cloud.patholab.app;

import android.content.Context;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.view.animation.Animation;
import android.view.animation.RotateAnimation;
import android.webkit.CookieManager;
import android.widget.Button;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.Switch;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.google.android.material.bottomsheet.BottomSheetDialog;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

import cloud.patholab.app.auth.AuthManager;

/**
 * PaymentSettingsActivity — Payment Gateway & Method Configuration
 * Full parity with /workspace/settings/payments
 * Configure: Active payment methods (Cash, Card, UPI, NEFT/RTGS, Insurance, Credit)
 * Gateway settings: Razorpay Key, UPI VPA, Bank account details
 * Toggles: Enable/disable each payment mode, require reference for offline payments
 * Credit settings: Max credit days, credit limit per patient/agency
 */
public class PaymentSettingsActivity extends AppCompatActivity {

    private static final String BASE_URL = "https://app.patholab.cloud";

    private FrameLayout btnBack, btnRefresh;
    private ImageView imgRefreshIcon;
    private ProgressBar progressLoading, progressSaving;

    // Payment Method Toggles
    private Switch switchCash, switchCard, switchUpi, switchNeft, switchInsurance, switchCredit, switchWallet;

    // Gateway Fields
    private EditText inputRazorpayKey, inputRazorpaySecret, inputUpiVpa, inputUpiName;
    private EditText inputBankName, inputAccountNo, inputIfsc, inputAccountName;

    // Credit / Policy
    private EditText inputMaxCreditDays, inputPatientCreditLimit, inputAgencyCreditLimit;
    private Switch switchRequireRef, switchAutoReminder, switchPartialPayment;

    // Receipt
    private EditText inputReceiptPrefix, inputReceiptNote;

    private Button btnSave;
    private TextView lblSaveStatus;

    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_payment_settings);

        btnBack        = findViewById(R.id.btnPaySettBack);
        btnRefresh     = findViewById(R.id.btnPaySettRefresh);
        imgRefreshIcon = findViewById(R.id.imgPaySettRefreshIcon);
        progressLoading = findViewById(R.id.progressPaySettLoading);
        progressSaving = findViewById(R.id.progressPaySettSaving);

        switchCash      = findViewById(R.id.switchPayCash);
        switchCard      = findViewById(R.id.switchPayCard);
        switchUpi       = findViewById(R.id.switchPayUpi);
        switchNeft      = findViewById(R.id.switchPayNeft);
        switchInsurance = findViewById(R.id.switchPayInsurance);
        switchCredit    = findViewById(R.id.switchPayCredit);
        switchWallet    = findViewById(R.id.switchPayWallet);

        inputRazorpayKey    = findViewById(R.id.inputPayRazorpayKey);
        inputRazorpaySecret = findViewById(R.id.inputPayRazorpaySecret);
        inputUpiVpa         = findViewById(R.id.inputPayUpiVpa);
        inputUpiName        = findViewById(R.id.inputPayUpiName);
        inputBankName       = findViewById(R.id.inputPayBankName);
        inputAccountNo      = findViewById(R.id.inputPayAccountNo);
        inputIfsc           = findViewById(R.id.inputPayIfsc);
        inputAccountName    = findViewById(R.id.inputPayAccountName);

        inputMaxCreditDays      = findViewById(R.id.inputPayMaxCreditDays);
        inputPatientCreditLimit = findViewById(R.id.inputPayPatientCreditLimit);
        inputAgencyCreditLimit  = findViewById(R.id.inputPayAgencyCreditLimit);
        switchRequireRef        = findViewById(R.id.switchPayRequireRef);
        switchAutoReminder      = findViewById(R.id.switchPayAutoReminder);
        switchPartialPayment    = findViewById(R.id.switchPayPartialPayment);

        inputReceiptPrefix = findViewById(R.id.inputPayReceiptPrefix);
        inputReceiptNote   = findViewById(R.id.inputPayReceiptNote);

        btnSave       = findViewById(R.id.btnSavePaySettings);
        lblSaveStatus = findViewById(R.id.lblPaySettSaveStatus);

        btnBack.setOnClickListener(v -> finish());
        btnRefresh.setOnClickListener(v -> { animateRefresh(); fetchSettings(true); });
        btnSave.setOnClickListener(v -> saveSettings());

        fetchSettings(false);
    }

    private void animateRefresh() {
        if (imgRefreshIcon == null) return;
        RotateAnimation r = new RotateAnimation(0, 360, Animation.RELATIVE_TO_SELF, 0.5f, Animation.RELATIVE_TO_SELF, 0.5f);
        r.setDuration(600); r.setRepeatCount(1); imgRefreshIcon.startAnimation(r);
    }

    private void fetchSettings(boolean manual) {
        progressLoading.setVisibility(View.VISIBLE);
        new Thread(() -> {
            try {
                String token = getToken();
                URL url = new URL(BASE_URL + "/api/workspace/settings/payments");
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("GET");
                conn.setRequestProperty("Authorization", "Bearer " + token);
                conn.setRequestProperty("Cookie", "token=" + token);
                conn.setRequestProperty("Accept", "application/json");
                conn.setConnectTimeout(10000); conn.setReadTimeout(15000);
                int code = conn.getResponseCode();
                if (code >= 200 && code < 300) {
                    String body = read(conn.getInputStream()).trim();
                    JSONObject cfg = null;
                    if (body.startsWith("{")) {
                        JSONObject res = new JSONObject(body);
                        cfg = res.has("payments") ? res.optJSONObject("payments") : (res.has("settings") ? res.optJSONObject("settings") : res);
                    }
                    final JSONObject finalCfg = cfg;
                    mainHandler.post(() -> {
                        progressLoading.setVisibility(View.GONE);
                        if (finalCfg != null) bindConfig(finalCfg);
                        if (manual) Toast.makeText(this, "Payment settings loaded", Toast.LENGTH_SHORT).show();
                    });
                } else { mainHandler.post(() -> { progressLoading.setVisibility(View.GONE); Toast.makeText(this, "Failed (" + code + ")", Toast.LENGTH_SHORT).show(); }); }
                conn.disconnect();
            } catch (Exception e) { mainHandler.post(() -> { progressLoading.setVisibility(View.GONE); Toast.makeText(this, "Error: " + e.getMessage(), Toast.LENGTH_SHORT).show(); }); }
        }).start();
    }

    private void bindConfig(JSONObject c) {
        if (c == null) return;
        JSONObject methods = c.optJSONObject("methods");
        if (methods != null) {
            switchCash.setChecked(methods.optBoolean("cash", true));
            switchCard.setChecked(methods.optBoolean("card", true));
            switchUpi.setChecked(methods.optBoolean("upi", true));
            switchNeft.setChecked(methods.optBoolean("neft", false));
            switchInsurance.setChecked(methods.optBoolean("insurance", false));
            switchCredit.setChecked(methods.optBoolean("credit", false));
            switchWallet.setChecked(methods.optBoolean("wallet", false));
        } else {
            switchCash.setChecked(c.optBoolean("acceptCash", true));
            switchCard.setChecked(c.optBoolean("acceptCard", true));
            switchUpi.setChecked(c.optBoolean("acceptUpi", true));
            switchNeft.setChecked(c.optBoolean("acceptNeft", false));
            switchInsurance.setChecked(c.optBoolean("acceptInsurance", false));
            switchCredit.setChecked(c.optBoolean("acceptCredit", false));
            switchWallet.setChecked(c.optBoolean("acceptWallet", false));
        }
        JSONObject gateway = c.optJSONObject("gateway");
        if (gateway != null) {
            inputRazorpayKey.setText(gateway.optString("razorpayKeyId", ""));
            inputRazorpaySecret.setText(gateway.optString("razorpayKeySecret", ""));
            inputUpiVpa.setText(gateway.optString("upiVpa", ""));
            inputUpiName.setText(gateway.optString("upiName", ""));
        } else {
            inputRazorpayKey.setText(c.optString("razorpayKeyId", ""));
            inputRazorpaySecret.setText(c.optString("razorpayKeySecret", ""));
            inputUpiVpa.setText(c.optString("upiVpa", ""));
            inputUpiName.setText(c.optString("upiName", ""));
        }
        JSONObject bank = c.optJSONObject("bankAccount");
        if (bank != null) {
            inputBankName.setText(bank.optString("bankName", "")); inputAccountNo.setText(bank.optString("accountNumber", ""));
            inputIfsc.setText(bank.optString("ifsc", "")); inputAccountName.setText(bank.optString("accountName", ""));
        } else {
            inputBankName.setText(c.optString("bankName", "")); inputAccountNo.setText(c.optString("accountNumber", ""));
            inputIfsc.setText(c.optString("ifsc", "")); inputAccountName.setText(c.optString("accountName", ""));
        }
        inputMaxCreditDays.setText(String.valueOf(c.optInt("maxCreditDays", 30)));
        inputPatientCreditLimit.setText(String.valueOf(c.optDouble("patientCreditLimit", 5000)));
        inputAgencyCreditLimit.setText(String.valueOf(c.optDouble("agencyCreditLimit", 50000)));
        switchRequireRef.setChecked(c.optBoolean("requireReference", false));
        switchAutoReminder.setChecked(c.optBoolean("autoReminder", false));
        switchPartialPayment.setChecked(c.optBoolean("allowPartialPayment", true));
        inputReceiptPrefix.setText(c.optString("receiptPrefix", "RCP"));
        inputReceiptNote.setText(c.optString("receiptNote", ""));
    }

    private void saveSettings() {
        btnSave.setEnabled(false); btnSave.setText(""); progressSaving.setVisibility(View.VISIBLE);
        lblSaveStatus.setVisibility(View.GONE);
        new Thread(() -> {
            try {
                String token = getToken();
                URL url = new URL(BASE_URL + "/api/workspace/settings/payments");
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("PUT");
                conn.setRequestProperty("Authorization", "Bearer " + token);
                conn.setRequestProperty("Cookie", "token=" + token);
                conn.setRequestProperty("Content-Type", "application/json");
                conn.setDoOutput(true);
                JSONObject methods = new JSONObject();
                methods.put("cash", switchCash.isChecked()); methods.put("card", switchCard.isChecked());
                methods.put("upi", switchUpi.isChecked()); methods.put("neft", switchNeft.isChecked());
                methods.put("insurance", switchInsurance.isChecked()); methods.put("credit", switchCredit.isChecked());
                methods.put("wallet", switchWallet.isChecked());
                JSONObject gateway = new JSONObject();
                gateway.put("razorpayKeyId", inputRazorpayKey.getText().toString().trim());
                gateway.put("razorpayKeySecret", inputRazorpaySecret.getText().toString().trim());
                gateway.put("upiVpa", inputUpiVpa.getText().toString().trim());
                gateway.put("upiName", inputUpiName.getText().toString().trim());
                JSONObject bank = new JSONObject();
                bank.put("bankName", inputBankName.getText().toString().trim());
                bank.put("accountNumber", inputAccountNo.getText().toString().trim());
                bank.put("ifsc", inputIfsc.getText().toString().trim());
                bank.put("accountName", inputAccountName.getText().toString().trim());
                JSONObject payload = new JSONObject();
                payload.put("methods", methods); payload.put("gateway", gateway); payload.put("bankAccount", bank);
                try { payload.put("maxCreditDays", Integer.parseInt(inputMaxCreditDays.getText().toString().trim())); } catch (Exception e2) { payload.put("maxCreditDays", 30); }
                try { payload.put("patientCreditLimit", Double.parseDouble(inputPatientCreditLimit.getText().toString().trim())); } catch (Exception e2) { payload.put("patientCreditLimit", 5000); }
                try { payload.put("agencyCreditLimit", Double.parseDouble(inputAgencyCreditLimit.getText().toString().trim())); } catch (Exception e2) { payload.put("agencyCreditLimit", 50000); }
                payload.put("requireReference", switchRequireRef.isChecked());
                payload.put("autoReminder", switchAutoReminder.isChecked());
                payload.put("allowPartialPayment", switchPartialPayment.isChecked());
                payload.put("receiptPrefix", inputReceiptPrefix.getText().toString().trim());
                payload.put("receiptNote", inputReceiptNote.getText().toString().trim());
                OutputStream os = conn.getOutputStream(); os.write(payload.toString().getBytes(StandardCharsets.UTF_8)); os.close();
                int code = conn.getResponseCode();
                mainHandler.post(() -> { progressSaving.setVisibility(View.GONE); btnSave.setEnabled(true); btnSave.setText("Save Settings");
                    if (code >= 200 && code < 300) { lblSaveStatus.setText("Payment settings saved."); lblSaveStatus.setTextColor(0xFF059669); lblSaveStatus.setVisibility(View.VISIBLE); Toast.makeText(this, "Payment settings updated", Toast.LENGTH_SHORT).show(); }
                    else { lblSaveStatus.setText("Save failed (" + code + ")"); lblSaveStatus.setTextColor(0xFFDC2626); lblSaveStatus.setVisibility(View.VISIBLE); }
                });
                conn.disconnect();
            } catch (Exception e) { mainHandler.post(() -> { progressSaving.setVisibility(View.GONE); btnSave.setEnabled(true); btnSave.setText("Save Settings"); lblSaveStatus.setText("Error: " + e.getMessage()); lblSaveStatus.setTextColor(0xFFDC2626); lblSaveStatus.setVisibility(View.VISIBLE); }); }
        }).start();
    }

    private String getToken() {
        String t = AuthManager.getToken(this); if (t != null && !t.isEmpty()) return t;
        try { CookieManager cm = CookieManager.getInstance(); String c = cm.getCookie(BASE_URL);
            if (c != null) for (String p : c.split(";")) { String tr = p.trim(); if (tr.startsWith("token=")) { String val = tr.substring(6).trim(); if (!val.isEmpty()) return val; } } } catch (Exception ignored) {}
        try { return getSharedPreferences("patholab_prefs", Context.MODE_PRIVATE).getString("auth_token", ""); } catch (Exception ignored) { return ""; }
    }
    private String read(InputStream is) throws Exception {
        if (is == null) return ""; BufferedReader r = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8));
        StringBuilder sb = new StringBuilder(); String l; while ((l = r.readLine()) != null) sb.append(l); return sb.toString();
    }
}
