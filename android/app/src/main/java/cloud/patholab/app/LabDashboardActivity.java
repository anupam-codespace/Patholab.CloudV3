package cloud.patholab.app;

import android.content.Intent;
import android.graphics.Typeface;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.LayoutInflater;
import android.view.View;
import android.view.animation.Animation;
import android.view.animation.RotateAnimation;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

import cloud.patholab.app.auth.AuthManager;
import cloud.patholab.app.ui.SimpleAreaChartView;
import cloud.patholab.app.ui.SimpleBarChartView;

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  LabDashboardActivity — Native Executive Laboratory Dashboard (Android)
 *  Directly mirroring web (/dashboard):
 *   1. 4 Primary Bento KPIs: Wallet Balance, Revenue, Tests Performed, Inventory
 *   2. Operational Throughput: Samples Today, In Progress, Pending Approval
 *   3. Interactive Visual Charts: Revenue Trend Area Chart & Test Volume Bar Chart
 *   4. Recent Patients Worklist with direct patient profile routing
 * ═══════════════════════════════════════════════════════════════════════════
 */
public class LabDashboardActivity extends AppCompatActivity {

    private SwipeRefreshLayout swipeRefreshDashboard;
    private FrameLayout btnDashboardBack, btnDashboardRefresh;
    private ImageView imgDashboardRefreshIcon;
    private TextView lblDashboardBranch;

    // Range selector tabs
    private TextView tabRangeToday, tabRange7D, tabRange30D, tabRangeMonth, tabRangeYear;
    private String currentRange = "30D";

    // Primary KPIs
    private LinearLayout cardWalletBalance, cardInventoryAlerts;
    private TextView lblDashWalletBal, lblDashWalletStatus, btnRechargeWallet;
    private TextView lblDashRevenue, lblDashTestsCount, lblDashInventoryAlerts;

    // Operational Pulse
    private TextView lblPulseSamplesToday, lblPulsePendingSamples, lblPulsePendingReports;

    // Visual Charts
    private SimpleAreaChartView chartRevenueTrend;
    private SimpleBarChartView chartTestVolume;

    // Recent Patients
    private LinearLayout containerRecentPatients;
    private TextView lblPatientsEmptyState, btnViewAllPatients;

    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        StatusBarHelper.setStatusBarDeepNavy(this);
        setContentView(R.layout.activity_lab_dashboard);

        initViews();
        setupEvents();
        syncLabDetails();
        fetchDashboardData(currentRange);
    }

    private void initViews() {
        swipeRefreshDashboard = findViewById(R.id.swipeRefreshDashboard);
        btnDashboardBack = findViewById(R.id.btnDashboardBack);
        btnDashboardRefresh = findViewById(R.id.btnDashboardRefresh);
        imgDashboardRefreshIcon = findViewById(R.id.imgDashboardRefreshIcon);
        lblDashboardBranch = findViewById(R.id.lblDashboardBranch);

        tabRangeToday = findViewById(R.id.tabRangeToday);
        tabRange7D = findViewById(R.id.tabRange7D);
        tabRange30D = findViewById(R.id.tabRange30D);
        tabRangeMonth = findViewById(R.id.tabRangeMonth);
        tabRangeYear = findViewById(R.id.tabRangeYear);

        cardWalletBalance = findViewById(R.id.cardWalletBalance);
        lblDashWalletBal = findViewById(R.id.lblDashWalletBal);
        lblDashWalletStatus = findViewById(R.id.lblDashWalletStatus);
        btnRechargeWallet = findViewById(R.id.btnRechargeWallet);

        lblDashRevenue = findViewById(R.id.lblDashRevenue);
        lblDashTestsCount = findViewById(R.id.lblDashTestsCount);

        cardInventoryAlerts = findViewById(R.id.cardInventoryAlerts);
        lblDashInventoryAlerts = findViewById(R.id.lblDashInventoryAlerts);

        lblPulseSamplesToday = findViewById(R.id.lblPulseSamplesToday);
        lblPulsePendingSamples = findViewById(R.id.lblPulsePendingSamples);
        lblPulsePendingReports = findViewById(R.id.lblPulsePendingReports);

        chartRevenueTrend = findViewById(R.id.chartRevenueTrend);
        chartTestVolume = findViewById(R.id.chartTestVolume);

        containerRecentPatients = findViewById(R.id.containerRecentPatients);
        lblPatientsEmptyState = findViewById(R.id.lblPatientsEmptyState);
        btnViewAllPatients = findViewById(R.id.btnViewAllPatients);

        // Apply heavy bold typography
        Typeface blackTf = Typeface.create("sans-serif-black", Typeface.BOLD);
        if (lblDashWalletBal != null) lblDashWalletBal.setTypeface(blackTf);
        if (lblDashRevenue != null) lblDashRevenue.setTypeface(blackTf);
        if (lblDashTestsCount != null) lblDashTestsCount.setTypeface(blackTf);
        if (lblDashInventoryAlerts != null) lblDashInventoryAlerts.setTypeface(blackTf);
    }

    private void setupEvents() {
        btnDashboardBack.setOnClickListener(v -> finish());

        swipeRefreshDashboard.setColorSchemeColors(0xFF4F46E5);
        swipeRefreshDashboard.setOnRefreshListener(() -> fetchDashboardData(currentRange));

        btnDashboardRefresh.setOnClickListener(v -> {
            RotateAnimation rotate = new RotateAnimation(0, 360,
                    Animation.RELATIVE_TO_SELF, 0.5f, Animation.RELATIVE_TO_SELF, 0.5f);
            rotate.setDuration(600);
            imgDashboardRefreshIcon.startAnimation(rotate);
            fetchDashboardData(currentRange);
        });

        // Date Range Tabs
        tabRangeToday.setOnClickListener(v -> selectRange("TODAY"));
        tabRange7D.setOnClickListener(v -> selectRange("7D"));
        tabRange30D.setOnClickListener(v -> selectRange("30D"));
        tabRangeMonth.setOnClickListener(v -> selectRange("MONTH"));
        tabRangeYear.setOnClickListener(v -> selectRange("YEAR"));

        // Actions
        btnRechargeWallet.setOnClickListener(v -> startActivity(new Intent(this, WalletActivity.class)));
        cardWalletBalance.setOnClickListener(v -> startActivity(new Intent(this, WalletActivity.class)));

        btnViewAllPatients.setOnClickListener(v -> startActivity(new Intent(this, PatientWorklistActivity.class)));
    }

    private void selectRange(String range) {
        currentRange = range;
        tabRangeToday.setBackgroundResource(range.equals("TODAY") ? R.drawable.bg_chip_toggle_active : R.drawable.bg_chip_toggle_inactive);
        tabRangeToday.setTextColor(range.equals("TODAY") ? 0xFF0F172A : 0xFF93C5FD);

        tabRange7D.setBackgroundResource(range.equals("7D") ? R.drawable.bg_chip_toggle_active : R.drawable.bg_chip_toggle_inactive);
        tabRange7D.setTextColor(range.equals("7D") ? 0xFF0F172A : 0xFF93C5FD);

        tabRange30D.setBackgroundResource(range.equals("30D") ? R.drawable.bg_chip_toggle_active : R.drawable.bg_chip_toggle_inactive);
        tabRange30D.setTextColor(range.equals("30D") ? 0xFF0F172A : 0xFF93C5FD);

        tabRangeMonth.setBackgroundResource(range.equals("MONTH") ? R.drawable.bg_chip_toggle_active : R.drawable.bg_chip_toggle_inactive);
        tabRangeMonth.setTextColor(range.equals("MONTH") ? 0xFF0F172A : 0xFF93C5FD);

        tabRangeYear.setBackgroundResource(range.equals("YEAR") ? R.drawable.bg_chip_toggle_active : R.drawable.bg_chip_toggle_inactive);
        tabRangeYear.setTextColor(range.equals("YEAR") ? 0xFF0F172A : 0xFF93C5FD);

        fetchDashboardData(currentRange);
    }

    private void syncLabDetails() {
        String lab = AuthManager.getLabName(this);
        if (lab == null || lab.trim().isEmpty()) lab = "Care Diagnostic Hub";
        lblDashboardBranch.setText(lab + " • Main Branch");
    }

    private void fetchDashboardData(String range) {
        swipeRefreshDashboard.setRefreshing(true);

        new Thread(() -> {
            String token = AuthManager.getToken(this);
            String[] endpoints = new String[]{
                "https://patholab.cloud/api/labs/dashboard?range=" + range,
                "https://app.patholab.cloud/api/labs/dashboard?range=" + range
            };

            for (String urlStr : endpoints) {
                try {
                    URL url = new URL(urlStr);
                    HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                    conn.setRequestMethod("GET");
                    conn.setConnectTimeout(8000);
                    conn.setReadTimeout(8000);
                    if (token != null && !token.isEmpty()) {
                        conn.setRequestProperty("Cookie", "token=" + token);
                        conn.setRequestProperty("Authorization", "Bearer " + token);
                    }

                    int code = conn.getResponseCode();
                    if (code == 200) {
                        InputStream is = conn.getInputStream();
                        BufferedReader reader = new BufferedReader(new InputStreamReader(is));
                        StringBuilder sb = new StringBuilder();
                        String line;
                        while ((line = reader.readLine()) != null) sb.append(line);
                        reader.close();

                        JSONObject json = new JSONObject(sb.toString());
                        mainHandler.post(() -> {
                            bindDashboardData(json);
                            swipeRefreshDashboard.setRefreshing(false);
                        });
                        return;
                    }
                } catch (Exception ignored) {}
            }

            mainHandler.post(() -> {
                bindDashboardData(new JSONObject());
                swipeRefreshDashboard.setRefreshing(false);
            });
        }).start();
    }

    private void bindDashboardData(JSONObject json) {
        try {
            JSONObject kpi = json.optJSONObject("kpi");
            if (kpi == null) kpi = new JSONObject();

            JSONObject alerts = json.optJSONObject("alerts");
            if (alerts == null) alerts = new JSONObject();

            JSONObject charts = json.optJSONObject("charts");
            if (charts == null) charts = new JSONObject();

            JSONObject labDetails = json.optJSONObject("labDetails");
            if (labDetails != null) {
                String labName = labDetails.optString("name", "Care Diagnostic Hub");
                lblDashboardBranch.setText(labName + " • Main Branch");
            }

            // 1. Primary KPIs
            double walletBal = kpi.optDouble("walletBalance", 0.0);
            double revenue = kpi.optDouble("revenue", 0.0);
            int totalTests = kpi.optInt("totalTests", 0);
            int lowStockAlerts = alerts.optInt("inventory", 0);

            lblDashWalletBal.setText(formatINR(walletBal));
            if (walletBal < 100) {
                cardWalletBalance.setBackgroundResource(R.drawable.bg_wallet_card_alert);
                lblDashWalletBal.setTextColor(0xFF991B1B); // Red-800
                lblDashWalletStatus.setText("⚠️ Low Balance");
                lblDashWalletStatus.setTextColor(0xFFDC2626); // Red-600
                btnRechargeWallet.setBackgroundResource(R.drawable.bg_btn_danger);
            } else {
                cardWalletBalance.setBackgroundResource(R.drawable.bg_wallet_card_active);
                lblDashWalletBal.setTextColor(0xFF312E81); // Indigo-900
                lblDashWalletStatus.setText("● Pay-As-You-Go Active");
                lblDashWalletStatus.setTextColor(0xFF4F46E5); // Indigo-600
                btnRechargeWallet.setBackgroundResource(R.drawable.bg_btn_primary);
            }

            lblDashRevenue.setText(formatINR(revenue));
            lblDashTestsCount.setText(String.valueOf(totalTests));
            lblDashInventoryAlerts.setText(String.valueOf(lowStockAlerts));

            if (lowStockAlerts > 0) {
                cardInventoryAlerts.setBackgroundResource(R.drawable.bg_inventory_card_alert);
                lblDashInventoryAlerts.setTextColor(0xFFC2410C); // Orange-700
            } else {
                cardInventoryAlerts.setBackgroundResource(R.drawable.bg_dashboard_bento);
                lblDashInventoryAlerts.setTextColor(0xFFD97706);
            }

            // 2. Operational Pulse
            int samplesToday = kpi.optInt("samplesToday", 0);
            int pendingSamples = kpi.optInt("pendingSamples", 0);
            int pendingReports = kpi.optInt("pendingReports", 0);

            lblPulseSamplesToday.setText(String.valueOf(samplesToday));
            lblPulsePendingSamples.setText(String.valueOf(pendingSamples));
            lblPulsePendingReports.setText(String.valueOf(pendingReports));

            // 3. Visual Charts (Revenue Area Trend & Test Volume Bar Trend)
            JSONArray trendArray = charts.optJSONArray("trend");
            List<SimpleAreaChartView.DataPoint> revenuePoints = new ArrayList<>();
            List<SimpleBarChartView.BarItem> testBars = new ArrayList<>();

            if (trendArray != null && trendArray.length() > 0) {
                for (int i = 0; i < trendArray.length(); i++) {
                    JSONObject obj = trendArray.optJSONObject(i);
                    if (obj == null) continue;
                    String dateLabel = obj.optString("date", "");
                    float revVal = (float) obj.optDouble("revenue", 0.0);
                    int testVal = obj.optInt("tests", 0);

                    revenuePoints.add(new SimpleAreaChartView.DataPoint(dateLabel, revVal));
                    testBars.add(new SimpleBarChartView.BarItem(dateLabel, testVal));
                }
            }

            chartRevenueTrend.setData(revenuePoints);
            chartTestVolume.setData(testBars);

            // 4. Recent Patients
            JSONArray recentPatients = json.optJSONArray("recentPatients");
            renderRecentPatients(recentPatients);

        } catch (Exception e) {
            lblDashWalletBal.setText("₹0");
            lblDashRevenue.setText("₹0");
            lblDashTestsCount.setText("0");
            lblDashInventoryAlerts.setText("0");
        }
    }

    private void renderRecentPatients(JSONArray patients) {
        containerRecentPatients.removeAllViews();
        LayoutInflater inflater = LayoutInflater.from(this);

        if (patients == null || patients.length() == 0) {
            lblPatientsEmptyState.setVisibility(View.VISIBLE);
            return;
        }
        lblPatientsEmptyState.setVisibility(View.GONE);

        for (int i = 0; i < patients.length(); i++) {
            JSONObject p = patients.optJSONObject(i);
            if (p == null) continue;

            View itemView = inflater.inflate(R.layout.item_dashboard_patient, containerRecentPatients, false);
            TextView lblAvatar = itemView.findViewById(R.id.lblPatientAvatar);
            TextView lblName = itemView.findViewById(R.id.lblPatientName);
            TextView lblPhone = itemView.findViewById(R.id.lblPatientPhone);

            String name = p.optString("name", "Unknown Patient");
            String phone = p.optString("phone", "—");

            String initial = name.length() > 0 ? name.substring(0, 1).toUpperCase() : "P";
            lblAvatar.setText(initial);
            lblName.setText(name);
            lblPhone.setText(phone);

            itemView.setOnClickListener(v -> {
                startActivity(new Intent(this, PatientWorklistActivity.class));
            });

            containerRecentPatients.addView(itemView);
        }
    }

    private String formatINR(double amount) {
        return String.format(Locale.getDefault(), "₹ %,.0f", amount);
    }
}
