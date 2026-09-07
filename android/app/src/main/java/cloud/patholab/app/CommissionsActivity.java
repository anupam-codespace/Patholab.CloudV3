package cloud.patholab.app;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.text.Editable;
import android.text.TextWatcher;
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
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
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
 * CommissionsActivity
 * ─────────────────────────────────────────────────────────────────────────────
 * Native Dedicated Commission Pay, Settlements & Reconciliation Console.
 * Full feature parity with web (/workspace/commissions):
 *  - 4 Real-time KPIs: Total Commissions, Pending Payouts, Settled Disbursed, Active Referrers
 *  - 2-Tab Navigation: Referring Doctors vs Corporate Agencies
 *  - Search Omnibar & Filter
 *  - Referrer card with billed volume, total earned, and pending due balance
 *  - Quick Call & WhatsApp launch
 *  - Settle Commission bottom sheet with payment mode (UPI, Bank, Cash, Cheque), reference note & instant reconciliation
 */
public class CommissionsActivity extends AppCompatActivity {

    private static final String BASE_URL = "https://app.patholab.cloud";

    // Header Views
    private FrameLayout btnCommissionBack;
    private FrameLayout btnRefreshCommissions;
    private ImageView imgRefreshCommissionsIcon;

    // 4 KPI Views
    private TextView lblKpiTotalCommission;
    private TextView lblKpiPendingCommission;
    private TextView lblKpiSettledCommission;
    private TextView lblKpiActiveReferrers;

    // Tabs & Search
    private TextView tabDoctors;
    private TextView tabAgencies;
    private EditText inputSearchCommissions;
    private ImageView btnClearSearchCommissions;
    private ProgressBar progressCommissions;

    // List & Empty State
    private RecyclerView recyclerCommissions;
    private LinearLayout emptyStateCommissions;

    // Adapter & Data
    private CommissionsAdapter commissionsAdapter;
    private final List<JSONObject> doctorList = new ArrayList<>();
    private final List<JSONObject> agencyList = new ArrayList<>();
    private final List<JSONObject> currentTabList = new ArrayList<>();
    private final List<JSONObject> filteredList = new ArrayList<>();

    // State
    private boolean isDoctorTab = true;
    private String currentSearchQuery = "";
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_commissions);

        initViews();
        setupListeners();
        setupRecyclerView();

        loadCommissionsData(false);
    }

    private void initViews() {
        btnCommissionBack = findViewById(R.id.btnCommissionBack);
        btnRefreshCommissions = findViewById(R.id.btnRefreshCommissions);
        imgRefreshCommissionsIcon = findViewById(R.id.imgRefreshCommissionsIcon);

        lblKpiTotalCommission = findViewById(R.id.lblKpiTotalCommission);
        lblKpiPendingCommission = findViewById(R.id.lblKpiPendingCommission);
        lblKpiSettledCommission = findViewById(R.id.lblKpiSettledCommission);
        lblKpiActiveReferrers = findViewById(R.id.lblKpiActiveReferrers);

        tabDoctors = findViewById(R.id.tabDoctors);
        tabAgencies = findViewById(R.id.tabAgencies);
        inputSearchCommissions = findViewById(R.id.inputSearchCommissions);
        btnClearSearchCommissions = findViewById(R.id.btnClearSearchCommissions);
        progressCommissions = findViewById(R.id.progressCommissions);

        recyclerCommissions = findViewById(R.id.recyclerCommissions);
        emptyStateCommissions = findViewById(R.id.emptyStateCommissions);
    }

    private void setupListeners() {
        btnCommissionBack.setOnClickListener(v -> finish());

        btnRefreshCommissions.setOnClickListener(v -> {
            animateRefreshIcon();
            loadCommissionsData(true);
        });

        tabDoctors.setOnClickListener(v -> switchTab(true));
        tabAgencies.setOnClickListener(v -> switchTab(false));

        inputSearchCommissions.addTextChangedListener(new TextWatcher() {
            @Override
            public void beforeTextChanged(CharSequence s, int start, int count, int after) {}

            @Override
            public void onTextChanged(CharSequence s, int start, int before, int count) {
                currentSearchQuery = s.toString().trim().toLowerCase();
                btnClearSearchCommissions.setVisibility(currentSearchQuery.isEmpty() ? View.GONE : View.VISIBLE);
                applyFilterAndSearch();
            }

            @Override
            public void afterTextChanged(Editable s) {}
        });

        btnClearSearchCommissions.setOnClickListener(v -> {
            inputSearchCommissions.setText("");
            currentSearchQuery = "";
            applyFilterAndSearch();
        });
    }

    private void switchTab(boolean toDoctors) {
        isDoctorTab = toDoctors;
        if (isDoctorTab) {
            tabDoctors.setBackgroundResource(R.drawable.bg_tab_pill_active);
            tabDoctors.setTextColor(0xFFFFFFFF);
            tabDoctors.setTypeface(null, android.graphics.Typeface.BOLD);

            tabAgencies.setBackgroundResource(R.drawable.bg_tab_pill_inactive);
            tabAgencies.setTextColor(0xFF64748B);
            tabAgencies.setTypeface(null, android.graphics.Typeface.NORMAL);

            currentTabList.clear();
            currentTabList.addAll(doctorList);
        } else {
            tabAgencies.setBackgroundResource(R.drawable.bg_tab_pill_active);
            tabAgencies.setTextColor(0xFFFFFFFF);
            tabAgencies.setTypeface(null, android.graphics.Typeface.BOLD);

            tabDoctors.setBackgroundResource(R.drawable.bg_tab_pill_inactive);
            tabDoctors.setTextColor(0xFF64748B);
            tabDoctors.setTypeface(null, android.graphics.Typeface.NORMAL);

            currentTabList.clear();
            currentTabList.addAll(agencyList);
        }

        applyFilterAndSearch();
    }

    private void setupRecyclerView() {
        commissionsAdapter = new CommissionsAdapter(filteredList, new CommissionActionListener() {
            @Override
            public void onCall(String phone) {
                if (phone == null || phone.isEmpty()) {
                    Toast.makeText(CommissionsActivity.this, "No contact number available", Toast.LENGTH_SHORT).show();
                    return;
                }
                try {
                    Intent dial = new Intent(Intent.ACTION_DIAL, Uri.parse("tel:" + phone));
                    startActivity(dial);
                } catch (Exception e) {
                    Toast.makeText(CommissionsActivity.this, "Unable to open phone dialer", Toast.LENGTH_SHORT).show();
                }
            }

            @Override
            public void onWhatsApp(String phone, String name) {
                if (phone == null || phone.isEmpty()) {
                    Toast.makeText(CommissionsActivity.this, "No contact number available", Toast.LENGTH_SHORT).show();
                    return;
                }
                try {
                    String cleanPhone = phone.replaceAll("[^0-9]", "");
                    if (cleanPhone.length() == 10) cleanPhone = "91" + cleanPhone;
                    String message = Uri.encode("Hello " + name + ", this is from PathoLab Diagnostics regarding your commission payout.");
                    Intent wa = new Intent(Intent.ACTION_VIEW, Uri.parse("https://api.whatsapp.com/send?phone=" + cleanPhone + "&text=" + message));
                    startActivity(wa);
                } catch (Exception e) {
                    Toast.makeText(CommissionsActivity.this, "WhatsApp is not installed", Toast.LENGTH_SHORT).show();
                }
            }

            @Override
            public void onSettle(JSONObject referrer) {
                showSettlePayoutSheet(referrer);
            }
        });

        recyclerCommissions.setLayoutManager(new LinearLayoutManager(this));
        recyclerCommissions.setAdapter(commissionsAdapter);
    }

    private void animateRefreshIcon() {
        if (imgRefreshCommissionsIcon == null) return;
        RotateAnimation rotate = new RotateAnimation(0, 360,
                Animation.RELATIVE_TO_SELF, 0.5f, Animation.RELATIVE_TO_SELF, 0.5f);
        rotate.setDuration(600);
        rotate.setRepeatCount(1);
        imgRefreshCommissionsIcon.startAnimation(rotate);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  DATA FETCHING & FILTERING
    // ─────────────────────────────────────────────────────────────────────────
    private void loadCommissionsData(boolean isManualRefresh) {
        progressCommissions.setVisibility(View.VISIBLE);

        new Thread(() -> {
            try {
                String token = getAuthToken();
                URL url = new URL(BASE_URL + "/api/workspace/commissions");
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("GET");
                conn.setRequestProperty("Authorization", "Bearer " + token);
                conn.setRequestProperty("Cookie", "token=" + token);
                conn.setRequestProperty("Accept", "application/json");
                conn.setConnectTimeout(10000);
                conn.setReadTimeout(15000);

                int code = conn.getResponseCode();
                if (code >= 200 && code < 300) {
                    String json = readStream(conn.getInputStream());
                    JSONObject response = new JSONObject(json);

                    JSONObject stats = response.optJSONObject("stats");
                    JSONArray docsArr = response.optJSONArray("doctors");
                    JSONArray agArr = response.optJSONArray("agencies");

                    final List<JSONObject> fetchedDocs = new ArrayList<>();
                    if (docsArr != null) {
                        for (int i = 0; i < docsArr.length(); i++) {
                            fetchedDocs.add(docsArr.getJSONObject(i));
                        }
                    }

                    final List<JSONObject> fetchedAgencies = new ArrayList<>();
                    if (agArr != null) {
                        for (int i = 0; i < agArr.length(); i++) {
                            fetchedAgencies.add(agArr.getJSONObject(i));
                        }
                    }

                    mainHandler.post(() -> {
                        progressCommissions.setVisibility(View.GONE);
                        doctorList.clear();
                        doctorList.addAll(fetchedDocs);

                        agencyList.clear();
                        agencyList.addAll(fetchedAgencies);

                        tabDoctors.setText("Referring Doctors (" + doctorList.size() + ")");
                        tabAgencies.setText("Corporate Agencies (" + agencyList.size() + ")");

                        updateKpis(stats, doctorList, agencyList);
                        switchTab(isDoctorTab);

                        if (isManualRefresh) {
                            Toast.makeText(this, "Commissions synchronized", Toast.LENGTH_SHORT).show();
                        }
                    });
                } else {
                    mainHandler.post(() -> {
                        progressCommissions.setVisibility(View.GONE);
                        Toast.makeText(this, "Failed to load commissions (" + code + ")", Toast.LENGTH_SHORT).show();
                    });
                }
                conn.disconnect();
            } catch (Exception e) {
                mainHandler.post(() -> {
                    progressCommissions.setVisibility(View.GONE);
                    Toast.makeText(this, "Network error: " + e.getMessage(), Toast.LENGTH_SHORT).show();
                });
            }
        }).start();
    }

    private void updateKpis(JSONObject stats, List<JSONObject> docs, List<JSONObject> agencies) {
        double total = stats != null ? stats.optDouble("totalCommissions", 0.0) : 0.0;
        double pending = stats != null ? stats.optDouble("pendingPayouts", 0.0) : 0.0;
        double settled = stats != null ? stats.optDouble("settledPayouts", 0.0) : 0.0;
        int count = stats != null ? (stats.optInt("doctorCount", docs.size()) + stats.optInt("agencyCount", agencies.size())) : (docs.size() + agencies.size());

        lblKpiTotalCommission.setText("₹" + String.format(Locale.getDefault(), "%,.0f", total));
        lblKpiPendingCommission.setText("₹" + String.format(Locale.getDefault(), "%,.0f", pending));
        lblKpiSettledCommission.setText("₹" + String.format(Locale.getDefault(), "%,.0f", settled));
        lblKpiActiveReferrers.setText(String.valueOf(count));
    }

    private void applyFilterAndSearch() {
        filteredList.clear();

        for (JSONObject item : currentTabList) {
            String name = item.optString("name", "").toLowerCase();
            String phone = item.optString("phone", "").toLowerCase();
            String email = item.optString("email", "").toLowerCase();
            String category = item.optString("specialization", item.optString("tier", "")).toLowerCase();

            boolean matches = currentSearchQuery.isEmpty()
                    || name.contains(currentSearchQuery)
                    || phone.contains(currentSearchQuery)
                    || email.contains(currentSearchQuery)
                    || category.contains(currentSearchQuery);

            if (matches) {
                filteredList.add(item);
            }
        }

        commissionsAdapter.notifyDataSetChanged();
        emptyStateCommissions.setVisibility(filteredList.isEmpty() ? View.VISIBLE : View.GONE);
        recyclerCommissions.setVisibility(filteredList.isEmpty() ? View.GONE : View.VISIBLE);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  SETTLE COMMISSION PAYOUT BOTTOM SHEET
    // ─────────────────────────────────────────────────────────────────────────
    private void showSettlePayoutSheet(JSONObject referrer) {
        BottomSheetDialog sheet = new BottomSheetDialog(this);
        View view = LayoutInflater.from(this).inflate(R.layout.layout_settle_commission_sheet, null);
        sheet.setContentView(view);

        TextView lblTargetName = view.findViewById(R.id.lblSettleTargetName);
        TextView lblPendingAmount = view.findViewById(R.id.lblSettlePendingAmount);
        ImageView btnClose = view.findViewById(R.id.btnSettleClose);

        EditText inputAmount = view.findViewById(R.id.inputSettleAmount);
        TextView chipUpi = view.findViewById(R.id.chipModeUpi);
        TextView chipBank = view.findViewById(R.id.chipModeBank);
        TextView chipCash = view.findViewById(R.id.chipModeCash);
        TextView chipCheque = view.findViewById(R.id.chipModeCheque);
        EditText inputReference = view.findViewById(R.id.inputSettleReference);

        TextView lblError = view.findViewById(R.id.lblSettleError);
        Button btnConfirm = view.findViewById(R.id.btnConfirmSettlement);
        ProgressBar progressSaving = view.findViewById(R.id.progressSettleSaving);

        String name = referrer.optString("name", "Partner");
        double due = referrer.optDouble("pendingCommission", 0.0);
        String entityType = isDoctorTab ? "DOCTOR" : "AGENCY";
        String entityId = referrer.optString("id");

        lblTargetName.setText(name + " (" + (isDoctorTab ? "Doctor" : "Agency") + ")");
        lblPendingAmount.setText("₹" + String.format(Locale.getDefault(), "%,.0f", due));
        inputAmount.setText(String.format(Locale.getDefault(), "%.0f", due > 0 ? due : 0.0));

        final String[] selectedMode = {"UPI"};
        Runnable updateModeChips = () -> {
            chipUpi.setBackgroundResource(selectedMode[0].equals("UPI") ? R.drawable.bg_chip_active : R.drawable.bg_chip_inactive);
            chipUpi.setTextColor(selectedMode[0].equals("UPI") ? 0xFFFFFFFF : 0xFF64748B);

            chipBank.setBackgroundResource(selectedMode[0].equals("BANK_TRANSFER") ? R.drawable.bg_chip_active : R.drawable.bg_chip_inactive);
            chipBank.setTextColor(selectedMode[0].equals("BANK_TRANSFER") ? 0xFFFFFFFF : 0xFF64748B);

            chipCash.setBackgroundResource(selectedMode[0].equals("CASH") ? R.drawable.bg_chip_active : R.drawable.bg_chip_inactive);
            chipCash.setTextColor(selectedMode[0].equals("CASH") ? 0xFFFFFFFF : 0xFF64748B);

            chipCheque.setBackgroundResource(selectedMode[0].equals("CHEQUE") ? R.drawable.bg_chip_active : R.drawable.bg_chip_inactive);
            chipCheque.setTextColor(selectedMode[0].equals("CHEQUE") ? 0xFFFFFFFF : 0xFF64748B);
        };

        chipUpi.setOnClickListener(v -> { selectedMode[0] = "UPI"; updateModeChips.run(); });
        chipBank.setOnClickListener(v -> { selectedMode[0] = "BANK_TRANSFER"; updateModeChips.run(); });
        chipCash.setOnClickListener(v -> { selectedMode[0] = "CASH"; updateModeChips.run(); });
        chipCheque.setOnClickListener(v -> { selectedMode[0] = "CHEQUE"; updateModeChips.run(); });

        btnClose.setOnClickListener(v -> sheet.dismiss());

        btnConfirm.setOnClickListener(v -> {
            String amtStr = inputAmount.getText().toString().trim();
            if (amtStr.isEmpty()) {
                lblError.setText("Please enter a valid payout amount.");
                lblError.setVisibility(View.VISIBLE);
                return;
            }

            double amount;
            try {
                amount = Double.parseDouble(amtStr);
                if (amount <= 0) throw new Exception();
            } catch (Exception e) {
                lblError.setText("Please enter an amount greater than 0.");
                lblError.setVisibility(View.VISIBLE);
                return;
            }

            String refNote = inputReference.getText().toString().trim();

            lblError.setVisibility(View.GONE);
            btnConfirm.setEnabled(false);
            btnConfirm.setText("");
            progressSaving.setVisibility(View.VISIBLE);

            new Thread(() -> {
                try {
                    String token = getAuthToken();
                    URL url = new URL(BASE_URL + "/api/workspace/commissions");
                    HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                    conn.setRequestMethod("POST");
                    conn.setRequestProperty("Authorization", "Bearer " + token);
                    conn.setRequestProperty("Cookie", "token=" + token);
                    conn.setRequestProperty("Content-Type", "application/json");
                    conn.setRequestProperty("Accept", "application/json");
                    conn.setDoOutput(true);

                    JSONObject payload = new JSONObject();
                    payload.put("entityType", entityType);
                    payload.put("entityId", entityId);
                    payload.put("amount", amount);
                    payload.put("paymentMode", selectedMode[0]);
                    payload.put("referenceNote", refNote);

                    OutputStream os = conn.getOutputStream();
                    os.write(payload.toString().getBytes(StandardCharsets.UTF_8));
                    os.flush();
                    os.close();

                    int resCode = conn.getResponseCode();
                    if (resCode >= 200 && resCode < 300) {
                        mainHandler.post(() -> {
                            sheet.dismiss();
                            Toast.makeText(this, "₹" + String.format(Locale.getDefault(), "%,.0f", amount) + " settled successfully!", Toast.LENGTH_SHORT).show();
                            loadCommissionsData(false);
                        });
                    } else {
                        String err = readStream(conn.getErrorStream());
                        mainHandler.post(() -> {
                            btnConfirm.setEnabled(true);
                            btnConfirm.setText("Confirm Settlement");
                            progressSaving.setVisibility(View.GONE);
                            lblError.setText("Failed (" + resCode + "): " + err);
                            lblError.setVisibility(View.VISIBLE);
                        });
                    }
                    conn.disconnect();
                } catch (Exception e) {
                    mainHandler.post(() -> {
                        btnConfirm.setEnabled(true);
                        btnConfirm.setText("Confirm Settlement");
                        progressSaving.setVisibility(View.GONE);
                        lblError.setText("Error: " + e.getMessage());
                        lblError.setVisibility(View.VISIBLE);
                    });
                }
            }).start();
        });

        sheet.show();
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  HELPERS & ADAPTERS
    // ─────────────────────────────────────────────────────────────────────────
    private String getAuthToken() {
        String token = AuthManager.getToken(this);
        if (token != null && !token.isEmpty()) return token;

        try {
            CookieManager cm = CookieManager.getInstance();
            String cookies = cm.getCookie(BASE_URL);
            if (cookies != null) {
                String[] parts = cookies.split(";");
                for (String part : parts) {
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

        try {
            SharedPreferences prefs = getSharedPreferences("patholab_prefs", Context.MODE_PRIVATE);
            String t = prefs.getString("auth_token", "");
            if (t != null && !t.isEmpty()) return t;
            SharedPreferences prefs2 = getSharedPreferences("PatholabPrefs", Context.MODE_PRIVATE);
            String t2 = prefs2.getString("auth_token", "");
            if (t2 != null && !t2.isEmpty()) return t2;
        } catch (Exception ignored) {}
        return "";
    }

    private String readStream(InputStream is) throws Exception {
        if (is == null) return "";
        BufferedReader r = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8));
        StringBuilder sb = new StringBuilder();
        String l;
        while ((l = r.readLine()) != null) sb.append(l);
        return sb.toString();
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  RECYCLERVIEW ADAPTER FOR COMMISSIONS
    // ─────────────────────────────────────────────────────────────────────────
    interface CommissionActionListener {
        void onCall(String phone);
        void onWhatsApp(String phone, String name);
        void onSettle(JSONObject referrer);
    }

    class CommissionsAdapter extends RecyclerView.Adapter<CommissionsAdapter.CommissionViewHolder> {

        private final List<JSONObject> items;
        private final CommissionActionListener listener;

        CommissionsAdapter(List<JSONObject> items, CommissionActionListener listener) {
            this.items = items;
            this.listener = listener;
        }

        @NonNull
        @Override
        public CommissionViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
            View v = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_commission_card, parent, false);
            return new CommissionViewHolder(v);
        }

        @Override
        public void onBindViewHolder(@NonNull CommissionViewHolder holder, int position) {
            JSONObject item = items.get(position);
            holder.bind(item, isDoctorTab, listener);
        }

        @Override
        public int getItemCount() {
            return items.size();
        }

        class CommissionViewHolder extends RecyclerView.ViewHolder {

            private final TextView lblReferrerTypeBadge;
            private final TextView lblReferrerCategory;
            private final TextView lblReferrerDueBadge;
            private final TextView lblReferrerName;
            private final TextView lblReferrerSubtitle;
            private final TextView lblReferrerBilled;
            private final TextView lblReferrerEarned;
            private final TextView lblReferrerPendingDue;

            private final FrameLayout btnReferrerCall;
            private final FrameLayout btnReferrerWhatsApp;
            private final Button btnSettlePayout;

            CommissionViewHolder(@NonNull View v) {
                super(v);
                lblReferrerTypeBadge = v.findViewById(R.id.lblReferrerTypeBadge);
                lblReferrerCategory = v.findViewById(R.id.lblReferrerCategory);
                lblReferrerDueBadge = v.findViewById(R.id.lblReferrerDueBadge);
                lblReferrerName = v.findViewById(R.id.lblReferrerName);
                lblReferrerSubtitle = v.findViewById(R.id.lblReferrerSubtitle);
                lblReferrerBilled = v.findViewById(R.id.lblReferrerBilled);
                lblReferrerEarned = v.findViewById(R.id.lblReferrerEarned);
                lblReferrerPendingDue = v.findViewById(R.id.lblReferrerPendingDue);

                btnReferrerCall = v.findViewById(R.id.btnReferrerCall);
                btnReferrerWhatsApp = v.findViewById(R.id.btnReferrerWhatsApp);
                btnSettlePayout = v.findViewById(R.id.btnSettlePayout);
            }

            void bind(JSONObject referrer, boolean isDoctor, CommissionActionListener listener) {
                String name = referrer.optString("name", "Referrer");
                String phone = referrer.optString("phone", "");
                String category = isDoctor
                        ? referrer.optString("specialization", "General Medicine")
                        : referrer.optString("tier", "STANDARD");

                int referralsCount = referrer.optInt("totalReferred", 0);
                double billed = referrer.optDouble("totalBilled", 0.0);
                double earned = referrer.optDouble("totalCommission", 0.0);
                double pending = referrer.optDouble("pendingCommission", 0.0);

                lblReferrerTypeBadge.setText(isDoctor ? "DOCTOR" : "AGENCY");
                lblReferrerTypeBadge.setTextColor(isDoctor ? 0xFF2563EB : 0xFF0D9488);
                lblReferrerTypeBadge.setBackgroundColor(isDoctor ? 0xFFDBEAFE : 0xFFCCFBF1);

                lblReferrerCategory.setText(category);
                lblReferrerName.setText(name);
                lblReferrerSubtitle.setText((phone.isEmpty() ? "" : (phone + " • ")) + referralsCount + " Tests Referred");

                lblReferrerBilled.setText("₹" + String.format(Locale.getDefault(), "%,.0f", billed));
                lblReferrerEarned.setText("₹" + String.format(Locale.getDefault(), "%,.0f", earned));
                lblReferrerPendingDue.setText("₹" + String.format(Locale.getDefault(), "%,.0f", pending));

                if (pending > 0) {
                    lblReferrerDueBadge.setText("DUE: ₹" + String.format(Locale.getDefault(), "%,.0f", pending));
                    lblReferrerDueBadge.setTextColor(0xFFD97706);
                    lblReferrerDueBadge.setBackgroundColor(0xFFFEF3C7);
                    btnSettlePayout.setEnabled(true);
                    btnSettlePayout.setText("Settle Payout");
                } else {
                    lblReferrerDueBadge.setText("SETTLED");
                    lblReferrerDueBadge.setTextColor(0xFF059669);
                    lblReferrerDueBadge.setBackgroundColor(0xFFD1FAE5);
                    btnSettlePayout.setEnabled(false);
                    btnSettlePayout.setText("Balanced");
                }

                btnReferrerCall.setOnClickListener(v -> listener.onCall(phone));
                btnReferrerWhatsApp.setOnClickListener(v -> listener.onWhatsApp(phone, name));
                btnSettlePayout.setOnClickListener(v -> listener.onSettle(referrer));
            }
        }
    }
}
