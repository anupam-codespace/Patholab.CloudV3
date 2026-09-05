package cloud.patholab.app;

import android.content.Intent;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.ColorDrawable;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.TypedValue;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.view.animation.Animation;
import android.view.animation.RotateAnimation;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.PopupWindow;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;
import androidx.core.widget.ImageViewCompat;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;
import android.content.res.ColorStateList;

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

    // Range selector dropdown
    private LinearLayout containerRangeDropdownRow, btnRangeDropdown;
    private TextView lblSelectedRangeName;
    private String currentRange = "30D";

    // Primary KPIs
    private LinearLayout cardWalletBalance, cardInventoryAlerts, containerWalletStatusBadge;
    private ImageView imgWalletStatusIcon;
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

        containerRangeDropdownRow = findViewById(R.id.containerRangeDropdownRow);
        btnRangeDropdown = findViewById(R.id.btnRangeDropdown);
        lblSelectedRangeName = findViewById(R.id.lblSelectedRangeName);

        cardWalletBalance = findViewById(R.id.cardWalletBalance);
        containerWalletStatusBadge = findViewById(R.id.containerWalletStatusBadge);
        imgWalletStatusIcon = findViewById(R.id.imgWalletStatusIcon);
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

        // Timeframe Dropdown Events
        if (btnRangeDropdown != null) {
            btnRangeDropdown.setOnClickListener(this::showRangeDropdownMenu);
        }
        if (containerRangeDropdownRow != null) {
            containerRangeDropdownRow.setOnClickListener(this::showRangeDropdownMenu);
        }

        // Actions
        btnRechargeWallet.setOnClickListener(v -> startActivity(new Intent(this, WalletActivity.class)));
        cardWalletBalance.setOnClickListener(v -> startActivity(new Intent(this, WalletActivity.class)));

        btnViewAllPatients.setOnClickListener(v -> startActivity(new Intent(this, PatientWorklistActivity.class)));
    }

    private void showRangeDropdownMenu(View anchor) {
        try {
            LayoutInflater inflater = LayoutInflater.from(this);
            View popupView = inflater.inflate(R.layout.layout_range_dropdown_menu, null);

            int width = (int) dp(260);
            PopupWindow popup = new PopupWindow(
                    popupView,
                    width,
                    ViewGroup.LayoutParams.WRAP_CONTENT,
                    true
            );
            popup.setBackgroundDrawable(new ColorDrawable(Color.TRANSPARENT));
            popup.setElevation(dp(14));
            popup.setOutsideTouchable(true);

            // Bind each range option
            setupDropdownOption(popupView, popup, R.id.itemRangeToday, R.id.imgCheckToday, R.id.lblTitleToday, "TODAY");
            setupDropdownOption(popupView, popup, R.id.itemRange7D, R.id.imgCheck7D, R.id.lblTitle7D, "7D");
            setupDropdownOption(popupView, popup, R.id.itemRange30D, R.id.imgCheck30D, R.id.lblTitle30D, "30D");
            setupDropdownOption(popupView, popup, R.id.itemRangeMonth, R.id.imgCheckMonth, R.id.lblTitleMonth, "MONTH");
            setupDropdownOption(popupView, popup, R.id.itemRangeYear, R.id.imgCheckYear, R.id.lblTitleYear, "YEAR");

            View targetAnchor = btnRangeDropdown != null ? btnRangeDropdown : anchor;
            int xOffset = targetAnchor.getWidth() - width;
            popup.showAsDropDown(targetAnchor, xOffset, (int) dp(6));
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void setupDropdownOption(View root, PopupWindow popup, int containerId, int checkImgId, int titleId, String rangeKey) {
        View item = root.findViewById(containerId);
        ImageView check = root.findViewById(checkImgId);
        TextView title = root.findViewById(titleId);
        if (item == null) return;

        boolean isSelected = currentRange != null && currentRange.equalsIgnoreCase(rangeKey);
        if (isSelected) {
            item.setBackgroundResource(R.drawable.bg_range_item_selected);
            if (check != null) check.setVisibility(View.VISIBLE);
            if (title != null) title.setTextColor(0xFF1D4ED8);
        } else {
            item.setBackgroundResource(android.R.color.transparent);
            if (check != null) check.setVisibility(View.GONE);
            if (title != null) title.setTextColor(0xFF0F172A);
        }

        item.setOnClickListener(v -> {
            popup.dismiss();
            if (!rangeKey.equalsIgnoreCase(currentRange)) {
                selectRange(rangeKey);
            }
        });
    }

    private void selectRange(String range) {
        currentRange = range;
        if (lblSelectedRangeName != null) {
            lblSelectedRangeName.setText(getRangeDisplayName(range));
        }
        fetchDashboardData(currentRange);
    }

    private String getRangeDisplayName(String range) {
        if ("TODAY".equalsIgnoreCase(range)) return "Today";
        if ("7D".equalsIgnoreCase(range)) return "Last 7 Days";
        if ("30D".equalsIgnoreCase(range)) return "Last 30 Days";
        if ("MONTH".equalsIgnoreCase(range)) return "This Month";
        if ("YEAR".equalsIgnoreCase(range)) return "This Year";
        return "Last 30 Days";
    }

    private float dp(float val) {
        return TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, val, getResources().getDisplayMetrics());
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

            JSONObject json = null;
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

                        json = new JSONObject(sb.toString());
                        break;
                    }
                } catch (Exception ignored) {}
            }

            if (json == null) json = new JSONObject();

            // Fetch richer patient demographic details (gender, age) from /api/workspace/patients
            try {
                String[] pEndpoints = new String[]{
                    "https://patholab.cloud/api/workspace/patients?limit=6",
                    "https://app.patholab.cloud/api/workspace/patients?limit=6"
                };
                for (String pUrlStr : pEndpoints) {
                    try {
                        URL pUrl = new URL(pUrlStr);
                        HttpURLConnection pConn = (HttpURLConnection) pUrl.openConnection();
                        pConn.setRequestMethod("GET");
                        pConn.setConnectTimeout(6000);
                        pConn.setReadTimeout(6000);
                        if (token != null && !token.isEmpty()) {
                            pConn.setRequestProperty("Cookie", "token=" + token);
                            pConn.setRequestProperty("Authorization", "Bearer " + token);
                        }
                        if (pConn.getResponseCode() == 200) {
                            InputStream is = pConn.getInputStream();
                            BufferedReader reader = new BufferedReader(new InputStreamReader(is));
                            StringBuilder sb = new StringBuilder();
                            String line;
                            while ((line = reader.readLine()) != null) sb.append(line);
                            reader.close();

                            JSONObject pRoot = new JSONObject(sb.toString());
                            JSONArray dataArr = pRoot.optJSONArray("data");
                            if (dataArr == null && pRoot.has("patients")) dataArr = pRoot.optJSONArray("patients");
                            if (dataArr != null && dataArr.length() > 0) {
                                json.put("recentPatients", dataArr);
                                break;
                            }
                        }
                    } catch (Exception ignored) {}
                }
            } catch (Exception ignored) {}

            final JSONObject finalJson = json;
            mainHandler.post(() -> {
                bindDashboardData(finalJson);
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
                if (containerWalletStatusBadge != null) {
                    containerWalletStatusBadge.setBackgroundResource(R.drawable.bg_badge_wallet_alert);
                }
                if (imgWalletStatusIcon != null) {
                    imgWalletStatusIcon.setVisibility(View.VISIBLE);
                    imgWalletStatusIcon.setImageResource(R.drawable.ic_alert_triangle);
                    ImageViewCompat.setImageTintList(imgWalletStatusIcon, ColorStateList.valueOf(0xFFDC2626));
                }
                lblDashWalletStatus.setText("Low Balance");
                lblDashWalletStatus.setTextColor(0xFFDC2626); // Red-600
                btnRechargeWallet.setBackgroundResource(R.drawable.bg_btn_danger);
            } else {
                cardWalletBalance.setBackgroundResource(R.drawable.bg_wallet_card_active);
                lblDashWalletBal.setTextColor(0xFF312E81); // Indigo-900
                if (containerWalletStatusBadge != null) {
                    containerWalletStatusBadge.setBackgroundResource(R.drawable.bg_badge_wallet_active);
                }
                if (imgWalletStatusIcon != null) {
                    imgWalletStatusIcon.setVisibility(View.VISIBLE);
                    imgWalletStatusIcon.setImageResource(R.drawable.bg_online_dot);
                    ImageViewCompat.setImageTintList(imgWalletStatusIcon, ColorStateList.valueOf(0xFF4F46E5));
                }
                lblDashWalletStatus.setText("Active Balance");
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
            TextView lblDetail = itemView.findViewById(R.id.lblPatientPhone);

            String name = p.optString("name", "Unknown Patient");
            if (name == null || name.equalsIgnoreCase("null") || name.trim().isEmpty()) {
                name = "Unknown Patient";
            }

            // Extract Gender
            String rawGender = p.optString("gender", "");
            if (rawGender.equalsIgnoreCase("null")) rawGender = "";
            String formattedGender = "";
            if (!rawGender.trim().isEmpty()) {
                String g = rawGender.trim();
                formattedGender = g.substring(0, 1).toUpperCase(Locale.ROOT) + (g.length() > 1 ? g.substring(1).toLowerCase(Locale.ROOT) : "");
            }

            // Extract Age
            int age = p.optInt("age", 0);
            if (age == 0) {
                String ageStr = p.optString("age", "");
                if (!ageStr.equalsIgnoreCase("null") && !ageStr.trim().isEmpty()) {
                    try { age = Integer.parseInt(ageStr.trim()); } catch (Exception ignored) {}
                }
            }
            String ageUnit = p.optString("ageUnit", "Yrs");
            if (ageUnit.equalsIgnoreCase("null") || ageUnit.trim().isEmpty()) ageUnit = "Yrs";
            if (ageUnit.equalsIgnoreCase("Years")) ageUnit = "Yrs";

            // Format patient detail: gender and age ("just 2")
            StringBuilder detailSb = new StringBuilder();
            if (!formattedGender.isEmpty()) {
                detailSb.append(formattedGender);
            }
            if (age > 0) {
                if (detailSb.length() > 0) {
                    detailSb.append(" • ");
                }
                detailSb.append(age).append(" ").append(ageUnit);
            }

            // Fallback if neither gender nor age is available
            if (detailSb.length() == 0) {
                String phone = p.optString("phone", "");
                if (!phone.equalsIgnoreCase("null") && !phone.trim().isEmpty()) {
                    detailSb.append(phone);
                } else {
                    detailSb.append("Registered Patient");
                }
            }

            String initial = name.length() > 0 ? name.substring(0, 1).toUpperCase(Locale.ROOT) : "P";
            if (lblAvatar != null) lblAvatar.setText(initial);
            if (lblName != null) lblName.setText(name);
            if (lblDetail != null) lblDetail.setText(detailSb.toString());

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
