package cloud.patholab.app;

import android.app.AlertDialog;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Typeface;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.LayoutInflater;
import android.view.View;
import android.view.animation.Animation;
import android.view.animation.RotateAnimation;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;

import com.google.android.material.bottomsheet.BottomSheetDialog;
import com.google.android.material.button.MaterialButton;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;

import cloud.patholab.app.auth.AuthManager;

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  DashboardActivity — Native Financial Analytics & Ledger Console (Android)
 *  Complete feature parity with web portal (/workspace/analytics):
 *   1. 4 Primary Bento KPIs: Revenue, Expenses, Net Profit (Margin %), Pending Collections
 *   2. 4 Secondary GST & Discount Breakdown Cards: Gross Billing, Discounts, CGST, SGST
 *   3. Operational Summary: Invoices Count & Patients Count
 *   4. Frosted Sapphire Timeframe Selector Pill (All Time, This Year, This Month, Last 30 Days)
 *   5. Real-Time Two-Way Sync: Instant "+ Log Expense" BottomSheet with Database Persistence
 *   6. Dynamic Interactive Ledgers: Recent Invoices (B2B tags) & Recent Expenses
 * ═══════════════════════════════════════════════════════════════════════════
 */
public class DashboardActivity extends AppCompatActivity {

    private static final String BASE_URL = "https://app.patholab.cloud/api/workspace/analytics";

    private SwipeRefreshLayout swipeRefreshDashboard;
    private FrameLayout btnDashboardBack, btnRefreshDashboard;
    private ImageView imgRefreshIcon;
    private TextView lblDashboardUserRoleLab;

    // Real-Time User Profile Header
    private TextView lblDashboardAvatarInitial;
    private TextView lblDashboardUserName;
    private TextView lblDashboardUserEmail;
    private TextView lblDashboardLabBadge;

    // Timeframe selector
    private LinearLayout btnTimeframePill;
    private TextView lblTimeframeSelected;
    private String selectedTimeframe = "all_time";

    // 4 Primary KPI Labels
    private TextView lblDashTotalRevenue, lblDashTotalExpenses, lblDashNetProfit, lblDashProfitMargin, lblDashPendingDue;

    // GST & Revenue Adjustments Labels (Full Web Parity)
    private TextView lblDashGrossBilling, lblDashDiscountsGiven, lblDashDiscountPercent, lblDashCGST, lblDashSGST;

    // Operational Counters
    private TextView lblDashInvoicesCount, lblDashPatientsCount;

    // Ledger Tabs & Containers
    private TextView tabLedgerAll, tabLedgerInvoices, tabLedgerExpenses;
    private LinearLayout containerLedgerItems;
    private TextView lblLedgerEmptyState;
    private MaterialButton btnLogExpense, btnViewAllInvoices;

    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private JSONArray cachedInvoices = new JSONArray();
    private JSONArray cachedExpenses = new JSONArray();
    private int selectedLedgerTab = 0; // 0: All Records (Web Parity), 1: Invoices, 2: Expenses

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        StatusBarHelper.setStatusBarSapphire(this);
        setContentView(R.layout.activity_dashboard);

        initViews();
        setupEvents();
        syncUserDetails();
        fetchLoggedInUserInfo();
        fetchDashboardMetrics();
    }

    @Override
    protected void onResume() {
        super.onResume();
        // Automatic lifecycle sync
        syncUserDetails();
        fetchLoggedInUserInfo();
        fetchDashboardMetrics();
    }

    private void initViews() {
        swipeRefreshDashboard = findViewById(R.id.swipeRefreshDashboard);
        btnDashboardBack = findViewById(R.id.btnDashboardBack);
        btnRefreshDashboard = findViewById(R.id.btnRefreshDashboard);
        imgRefreshIcon = findViewById(R.id.imgRefreshIcon);
        lblDashboardUserRoleLab = findViewById(R.id.lblDashboardUserRoleLab);

        lblDashboardAvatarInitial = findViewById(R.id.lblDashboardAvatarInitial);
        lblDashboardUserName = findViewById(R.id.lblDashboardUserName);
        lblDashboardUserEmail = findViewById(R.id.lblDashboardUserEmail);
        lblDashboardLabBadge = findViewById(R.id.lblDashboardLabBadge);

        btnTimeframePill = findViewById(R.id.btnTimeframePill);
        lblTimeframeSelected = findViewById(R.id.lblTimeframeSelected);

        // 4 Primary Bento KPIs
        lblDashTotalRevenue = findViewById(R.id.lblDashTotalRevenue);
        lblDashTotalExpenses = findViewById(R.id.lblDashTotalExpenses);
        lblDashNetProfit = findViewById(R.id.lblDashNetProfit);
        lblDashProfitMargin = findViewById(R.id.lblDashProfitMargin);
        lblDashPendingDue = findViewById(R.id.lblDashPendingDue);

        // Operational Counts
        lblDashInvoicesCount = findViewById(R.id.lblDashInvoicesCount);
        lblDashPatientsCount = findViewById(R.id.lblDashPatientsCount);

        // Ledgers
        tabLedgerAll = findViewById(R.id.tabLedgerAll);
        tabLedgerInvoices = findViewById(R.id.tabLedgerInvoices);
        tabLedgerExpenses = findViewById(R.id.tabLedgerExpenses);
        containerLedgerItems = findViewById(R.id.containerLedgerItems);
        lblLedgerEmptyState = findViewById(R.id.lblLedgerEmptyState);
        btnLogExpense = findViewById(R.id.btnLogExpense);
        btnViewAllInvoices = findViewById(R.id.btnViewAllInvoices);

        // Typography polish
        Typeface blackTf = Typeface.create("sans-serif-black", Typeface.BOLD);
        if (lblDashTotalRevenue != null) lblDashTotalRevenue.setTypeface(blackTf);
        if (lblDashTotalExpenses != null) lblDashTotalExpenses.setTypeface(blackTf);
        if (lblDashNetProfit != null) lblDashNetProfit.setTypeface(blackTf);
        if (lblDashPendingDue != null) lblDashPendingDue.setTypeface(blackTf);

        // GST & Revenue Adjustments Views (Full Web Parity)
        lblDashGrossBilling = findViewById(R.id.lblDashGrossBilling);
        lblDashDiscountsGiven = findViewById(R.id.lblDashDiscountsGiven);
        lblDashDiscountPercent = findViewById(R.id.lblDashDiscountPercent);
        lblDashCGST = findViewById(R.id.lblDashCGST);
        lblDashSGST = findViewById(R.id.lblDashSGST);

        if (lblDashGrossBilling != null) lblDashGrossBilling.setTypeface(blackTf);
        if (lblDashDiscountsGiven != null) lblDashDiscountsGiven.setTypeface(blackTf);
        if (lblDashCGST != null) lblDashCGST.setTypeface(blackTf);
        if (lblDashSGST != null) lblDashSGST.setTypeface(blackTf);
    }

    private void setupEvents() {
        btnDashboardBack.setOnClickListener(v -> finish());

        // Refresh with rotation animation
        btnRefreshDashboard.setOnClickListener(v -> {
            RotateAnimation rotate = new RotateAnimation(0, 360,
                    Animation.RELATIVE_TO_SELF, 0.5f, Animation.RELATIVE_TO_SELF, 0.5f);
            rotate.setDuration(650);
            imgRefreshIcon.startAnimation(rotate);
            fetchDashboardMetrics();
        });

        swipeRefreshDashboard.setColorSchemeColors(0xFF0D6EFD);
        swipeRefreshDashboard.setOnRefreshListener(this::fetchDashboardMetrics);

        // Timeframe selector dialog
        btnTimeframePill.setOnClickListener(v -> showTimeframePicker());

        // 3-Tab Ledger Switching (Web Parity)
        if (tabLedgerAll != null) {
            tabLedgerAll.setOnClickListener(v -> {
                selectedLedgerTab = 0;
                updateTabStyles();
                renderCurrentLedger();
            });
        }

        tabLedgerInvoices.setOnClickListener(v -> {
            selectedLedgerTab = 1;
            updateTabStyles();
            renderCurrentLedger();
        });

        tabLedgerExpenses.setOnClickListener(v -> {
            selectedLedgerTab = 2;
            updateTabStyles();
            renderCurrentLedger();
        });

        // + Log Expense BottomSheet
        btnLogExpense.setOnClickListener(v -> showAddExpenseBottomSheet());

        // View All Invoices
        btnViewAllInvoices.setOnClickListener(v -> {
            startActivity(new Intent(this, BillingActivity.class));
        });
    }

    private void showTimeframePicker() {
        String[] options = {"All Time", "This Year", "This Month", "Last 30 Days"};
        String[] values = {"all_time", "this_year", "this_month", "last_30_days"};

        new AlertDialog.Builder(this)
                .setTitle("Select Timeframe")
                .setItems(options, (dialog, which) -> {
                    selectedTimeframe = values[which];
                    lblTimeframeSelected.setText(options[which]);
                    fetchDashboardMetrics();
                })
                .show();
    }

    private void updateTabStyles() {
        if (tabLedgerAll != null) {
            tabLedgerAll.setBackgroundResource(selectedLedgerTab == 0 ? R.drawable.bg_chip_toggle_active : R.drawable.bg_chip_toggle_inactive);
            tabLedgerAll.setTextColor(selectedLedgerTab == 0 ? 0xFF0D6EFD : 0xFF64748B);
        }
        if (tabLedgerInvoices != null) {
            tabLedgerInvoices.setBackgroundResource(selectedLedgerTab == 1 ? R.drawable.bg_chip_toggle_active : R.drawable.bg_chip_toggle_inactive);
            tabLedgerInvoices.setTextColor(selectedLedgerTab == 1 ? 0xFF0D6EFD : 0xFF64748B);
        }
        if (tabLedgerExpenses != null) {
            tabLedgerExpenses.setBackgroundResource(selectedLedgerTab == 2 ? R.drawable.bg_chip_toggle_active : R.drawable.bg_chip_toggle_inactive);
            tabLedgerExpenses.setTextColor(selectedLedgerTab == 2 ? 0xFF0D6EFD : 0xFF64748B);
        }
    }

    private String getAuthToken() {
        String token = AuthManager.getToken(this);
        if (token != null && !token.trim().isEmpty() && !"null".equalsIgnoreCase(token.trim()) && !"undefined".equalsIgnoreCase(token.trim())) {
            return token.trim();
        }
        try {
            SharedPreferences sp = getSharedPreferences("PatholabPrefs", MODE_PRIVATE);
            String spToken = sp.getString("auth_token", null);
            if (spToken != null && !spToken.trim().isEmpty() && !"null".equalsIgnoreCase(spToken.trim()) && !"undefined".equalsIgnoreCase(spToken.trim())) {
                AuthManager.saveToken(this, spToken.trim());
                return spToken.trim();
            }
        } catch (Exception ignored) {}
        try {
            android.webkit.CookieManager cm = android.webkit.CookieManager.getInstance();
            String cookies = cm.getCookie("https://app.patholab.cloud");
            if (cookies == null) cookies = cm.getCookie("https://patholab.cloud");
            if (cookies != null) {
                String[] parts = cookies.split(";");
                for (String part : parts) {
                    String trimmed = part.trim();
                    if (trimmed.startsWith("token=")) {
                        String cookieToken = trimmed.substring(6).trim();
                        if (!cookieToken.isEmpty() && !"null".equalsIgnoreCase(cookieToken) && !"undefined".equalsIgnoreCase(cookieToken)) {
                            AuthManager.saveToken(this, cookieToken);
                            return cookieToken;
                        }
                    }
                }
            }
        } catch (Exception ignored) {}
        return null;
    }

    private void fetchLoggedInUserInfo() {
        new Thread(() -> {
            try {
                String token = getAuthToken();
                if (token == null) return;
                URL url = new URL("https://app.patholab.cloud/api/auth/me");
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestProperty("Authorization", "Bearer " + token);
                conn.setRequestProperty("Cookie", "token=" + token);
                conn.setConnectTimeout(5000);
                conn.setReadTimeout(5000);
                if (conn.getResponseCode() == 200) {
                    InputStream is = conn.getInputStream();
                    BufferedReader reader = new BufferedReader(new InputStreamReader(is));
                    StringBuilder sb = new StringBuilder();
                    String line;
                    while ((line = reader.readLine()) != null) sb.append(line);
                    reader.close();
                    JSONObject res = new JSONObject(sb.toString());
                    JSONObject userObj = res.optJSONObject("user");
                    if (userObj == null && res.has("data")) userObj = res.optJSONObject("data");
                    if (userObj != null) {
                        String realName = userObj.optString("name", "");
                        String rawRole = userObj.optString("role", "Lab Owner");
                        String labName = null;
                        String labId = null;
                        if (res.has("lab")) {
                            JSONObject labObj = res.optJSONObject("lab");
                            if (labObj != null) {
                                labName = labObj.optString("name", null);
                                labId = labObj.optString("id", null);
                            }
                        } else if (userObj.has("lab")) {
                            JSONObject labObj = userObj.optJSONObject("lab");
                            if (labObj != null) {
                                labName = labObj.optString("name", null);
                                labId = labObj.optString("id", null);
                            }
                        }
                        String userId = userObj.optString("id", null);
                        String email = userObj.optString("email", null);
                        AuthManager.saveUserInfo(this, userId, email, realName, rawRole, labId, labName);
                        mainHandler.post(() -> {
                            syncUserDetails();
                            fetchDashboardMetrics();
                        });
                    }
                }
            } catch (Exception ignored) {}
        }).start();
    }

    private void syncUserDetails() {
        String name = AuthManager.getUserName(this);
        String email = AuthManager.getUserEmail(this);
        String role = AuthManager.getUserRole(this);
        String labName = AuthManager.getLabName(this);

        if (name != null && !name.trim().isEmpty() && !"null".equalsIgnoreCase(name)) {
            if (lblDashboardUserName != null) lblDashboardUserName.setText(name);
            if (lblDashboardAvatarInitial != null) {
                lblDashboardAvatarInitial.setText(String.valueOf(name.trim().charAt(0)).toUpperCase(Locale.ROOT));
            }
        }

        if (email != null && !email.trim().isEmpty() && !"null".equalsIgnoreCase(email)) {
            if (lblDashboardUserEmail != null) {
                lblDashboardUserEmail.setText(email);
                lblDashboardUserEmail.setVisibility(View.VISIBLE);
            }
        } else if (lblDashboardUserEmail != null) {
            lblDashboardUserEmail.setVisibility(View.GONE);
        }

        if (labName != null && !labName.trim().isEmpty() && !"null".equalsIgnoreCase(labName)) {
            String displayRole = (role != null && !role.trim().isEmpty()) ? role : "Lab";
            if (lblDashboardUserRoleLab != null) {
                lblDashboardUserRoleLab.setText(displayRole + " • " + labName);
                lblDashboardUserRoleLab.setVisibility(View.VISIBLE);
            }
            if (lblDashboardLabBadge != null) {
                lblDashboardLabBadge.setText(labName);
                lblDashboardLabBadge.setVisibility(View.VISIBLE);
            }
        } else {
            if (lblDashboardUserRoleLab != null) {
                lblDashboardUserRoleLab.setText("Financial Health Overview");
                lblDashboardUserRoleLab.setVisibility(View.VISIBLE);
            }
            if (lblDashboardLabBadge != null) {
                lblDashboardLabBadge.setText("Live Sync");
                lblDashboardLabBadge.setVisibility(View.VISIBLE);
            }
        }
    }

    private String readStream(InputStream is) throws Exception {
        if (is == null) return "";
        BufferedReader reader = new BufferedReader(new InputStreamReader(is));
        StringBuilder sb = new StringBuilder();
        String line;
        while ((line = reader.readLine()) != null) sb.append(line);
        reader.close();
        return sb.toString();
    }

    private void fetchDashboardMetrics() {
        swipeRefreshDashboard.setRefreshing(true);

        new Thread(() -> {
            String token = getAuthToken();
            if (token == null || token.trim().isEmpty()) {
                mainHandler.post(() -> swipeRefreshDashboard.setRefreshing(false));
                return;
            }

            try {
                String queryUrl = BASE_URL + "?timeframe=" + selectedTimeframe;
                String labId = AuthManager.getLabId(this);
                if (labId != null && !labId.trim().isEmpty() && !"null".equalsIgnoreCase(labId.trim()) && !"undefined".equalsIgnoreCase(labId.trim())) {
                    queryUrl += "&labId=" + java.net.URLEncoder.encode(labId.trim(), "UTF-8");
                }
                URL url = new URL(queryUrl);
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("GET");
                conn.setConnectTimeout(10000);
                conn.setReadTimeout(10000);
                conn.setUseCaches(false);
                conn.setDefaultUseCaches(false);
                conn.setRequestProperty("Accept", "application/json");
                conn.setRequestProperty("Authorization", "Bearer " + token);

                String cookies = null;
                try {
                    android.webkit.CookieManager cm = android.webkit.CookieManager.getInstance();
                    cookies = cm.getCookie("https://app.patholab.cloud");
                    if (cookies == null) cookies = cm.getCookie("https://patholab.cloud");
                } catch (Exception ignored) {}

                StringBuilder cookieHeader = new StringBuilder();
                cookieHeader.append("token=").append(token).append("; auth-token=").append(token);
                if (cookies != null && !cookies.isEmpty()) {
                    String[] parts = cookies.split(";");
                    for (String part : parts) {
                        String trimmed = part.trim();
                        if (!trimmed.startsWith("token=") && !trimmed.startsWith("auth-token=") && !trimmed.isEmpty()) {
                            cookieHeader.append("; ").append(trimmed);
                        }
                    }
                }
                conn.setRequestProperty("Cookie", cookieHeader.toString());

                int code = conn.getResponseCode();
                InputStream is = (code >= 200 && code < 300) ? conn.getInputStream() : conn.getErrorStream();
                if (is != null) {
                    String content = readStream(is);
                    if (code == 200 && content != null && !content.trim().isEmpty()) {
                        JSONObject json = new JSONObject(content);
                        double rev = safeDouble(json, "totalRevenue");
                        int invCount = safeInt(json, "invoicesCount");
                        if (rev > 0 || invCount > 0) {
                            mainHandler.post(() -> {
                                bindMetricsData(json);
                                swipeRefreshDashboard.setRefreshing(false);
                            });
                            return;
                        } else {
                            // Primary call returned zeroes: try secondary database endpoints
                            fetchFallbackMetrics(token, json);
                            return;
                        }
                    }
                }
            } catch (Exception ignored) {}

            fetchFallbackMetrics(token, null);
        }).start();
    }

    private void fetchFallbackMetrics(String token, JSONObject initialJson) {
        new Thread(() -> {
            try {
                JSONObject merged = (initialJson != null) ? initialJson : new JSONObject();
                boolean updated = false;

                // 1. Try /api/labs/dashboard?range=30D
                try {
                    URL dUrl = new URL("https://app.patholab.cloud/api/labs/dashboard?range=30D");
                    HttpURLConnection dConn = (HttpURLConnection) dUrl.openConnection();
                    dConn.setRequestMethod("GET");
                    dConn.setRequestProperty("Authorization", "Bearer " + token);
                    dConn.setRequestProperty("Cookie", "token=" + token + "; auth-token=" + token);
                    dConn.setConnectTimeout(8000);
                    dConn.setReadTimeout(8000);
                    if (dConn.getResponseCode() == 200) {
                        JSONObject dRoot = new JSONObject(readStream(dConn.getInputStream()));
                        JSONObject kpi = dRoot.optJSONObject("kpi");
                        if (kpi != null) {
                            double rev = kpi.optDouble("revenue", 0.0);
                            double exp = kpi.optDouble("expenses", 0.0);
                            double profit = kpi.optDouble("netProfit", 0.0);
                            double dues = kpi.optDouble("pendingDues", 0.0);
                            int pats = kpi.optInt("totalPatients", 0);

                            if (merged.optDouble("totalRevenue", 0.0) == 0.0 && rev > 0) {
                                merged.put("totalRevenue", rev);
                                updated = true;
                            }
                            if (merged.optDouble("totalExpense", 0.0) == 0.0 && exp > 0) {
                                merged.put("totalExpense", exp);
                                updated = true;
                            }
                            if (merged.optDouble("netProfit", 0.0) == 0.0 && profit != 0) {
                                merged.put("netProfit", profit);
                                updated = true;
                            }
                            if (merged.optDouble("pendingCollections", 0.0) == 0.0 && dues > 0) {
                                merged.put("pendingCollections", dues);
                                updated = true;
                            }
                            if (merged.optInt("patientsCount", 0) == 0 && pats > 0) {
                                merged.put("patientsCount", pats);
                                updated = true;
                            }
                        }
                    }
                } catch (Exception ignored) {}

                // 2. Try /api/workspace/invoices
                try {
                    URL iUrl = new URL("https://app.patholab.cloud/api/workspace/invoices");
                    HttpURLConnection iConn = (HttpURLConnection) iUrl.openConnection();
                    iConn.setRequestMethod("GET");
                    iConn.setRequestProperty("Authorization", "Bearer " + token);
                    iConn.setRequestProperty("Cookie", "token=" + token + "; auth-token=" + token);
                    iConn.setConnectTimeout(8000);
                    iConn.setReadTimeout(8000);
                    if (iConn.getResponseCode() == 200) {
                        JSONObject iRoot = new JSONObject(readStream(iConn.getInputStream()));
                        JSONObject stats = iRoot.optJSONObject("stats");
                        JSONArray invs = iRoot.optJSONArray("invoices");
                        if (stats != null) {
                            double totRev = stats.optDouble("totalRevenue", stats.optDouble("monthlyRevenue", 0.0));
                            double pendingAmt = stats.optDouble("pendingAmount", 0.0);
                            if (merged.optDouble("totalRevenue", 0.0) == 0.0 && totRev > 0) {
                                merged.put("totalRevenue", totRev);
                                updated = true;
                            }
                            if (merged.optDouble("pendingCollections", 0.0) == 0.0 && pendingAmt > 0) {
                                merged.put("pendingCollections", pendingAmt);
                                updated = true;
                            }
                        }
                        if (invs != null && invs.length() > 0) {
                            if (merged.optInt("invoicesCount", 0) == 0) {
                                merged.put("invoicesCount", invs.length());
                                updated = true;
                            }
                            if (!merged.has("recentInvoices") || merged.optJSONArray("recentInvoices") == null || merged.optJSONArray("recentInvoices").length() == 0) {
                                merged.put("recentInvoices", invs);
                                updated = true;
                            }
                        }
                    }
                } catch (Exception ignored) {}

                final boolean finalUpdated = updated;
                mainHandler.post(() -> {
                    if (finalUpdated || initialJson != null) {
                        bindMetricsData(merged);
                    }
                    swipeRefreshDashboard.setRefreshing(false);
                });
            } catch (Exception ignored) {
                mainHandler.post(() -> swipeRefreshDashboard.setRefreshing(false));
            }
        }).start();
    }

    private void bindMetricsData(JSONObject json) {
        try {
            // Real-Time User & Lab Identity Sync from Analytics Payload
            String fetchedUserId = null;
            String fetchedUserName = null;
            String fetchedUserEmail = null;
            String fetchedUserRole = null;
            String fetchedLabId = null;
            String fetchedLabName = null;

            if (json.has("user")) {
                JSONObject userObj = json.optJSONObject("user");
                if (userObj != null) {
                    fetchedUserId = userObj.optString("id", null);
                    fetchedUserName = userObj.optString("name", "");
                    fetchedUserEmail = userObj.optString("email", "");
                    fetchedUserRole = userObj.optString("role", "");
                    if (!fetchedUserName.isEmpty() && !"null".equalsIgnoreCase(fetchedUserName)) {
                        if (lblDashboardUserName != null) lblDashboardUserName.setText(fetchedUserName);
                        if (lblDashboardAvatarInitial != null) {
                            lblDashboardAvatarInitial.setText(String.valueOf(fetchedUserName.charAt(0)).toUpperCase(Locale.ROOT));
                        }
                    }
                    if (!fetchedUserEmail.isEmpty() && !"null".equalsIgnoreCase(fetchedUserEmail) && lblDashboardUserEmail != null) {
                        lblDashboardUserEmail.setText(fetchedUserEmail);
                        lblDashboardUserEmail.setVisibility(View.VISIBLE);
                    }
                }
            }
            if (json.has("lab")) {
                JSONObject labObj = json.optJSONObject("lab");
                if (labObj != null) {
                    fetchedLabId = labObj.optString("id", null);
                    fetchedLabName = labObj.optString("name", "");
                    if (!fetchedLabName.isEmpty() && !"null".equalsIgnoreCase(fetchedLabName)) {
                        String currentRole = (fetchedUserRole != null && !fetchedUserRole.isEmpty())
                                ? fetchedUserRole : AuthManager.getUserRole(this);
                        if (currentRole == null || currentRole.isEmpty()) currentRole = "Lab Owner";
                        if (lblDashboardUserRoleLab != null) {
                            lblDashboardUserRoleLab.setText(currentRole + " • " + fetchedLabName);
                            lblDashboardUserRoleLab.setVisibility(View.VISIBLE);
                        }
                        if (lblDashboardLabBadge != null) {
                            lblDashboardLabBadge.setText(fetchedLabName);
                            lblDashboardLabBadge.setVisibility(View.VISIBLE);
                        }
                    }
                }
            }

            // Persist freshly fetched profile info into AuthManager for app-wide consistency
            if (fetchedUserId != null || fetchedUserName != null || fetchedLabId != null) {
                AuthManager.saveUserInfo(this, fetchedUserId, fetchedUserEmail, fetchedUserName, fetchedUserRole, fetchedLabId, fetchedLabName);
            }

            // Primary KPIs (Safe Extraction)
            double totalRevenue = safeDouble(json, "totalRevenue");
            double totalExpense = safeDouble(json, "totalExpense");
            double netProfit = safeDouble(json, "netProfit");
            double profitMargin = safeDouble(json, "profitMargin");
            double pendingCollections = safeDouble(json, "pendingCollections");

            int invoicesCount = safeInt(json, "invoicesCount");
            int patientsCount = safeInt(json, "patientsCount");

            if (json.has("kpi")) {
                JSONObject kpi = json.optJSONObject("kpi");
                if (kpi != null) {
                    if (totalRevenue == 0.0) totalRevenue = safeDouble(kpi, "revenue");
                    if (totalExpense == 0.0) totalExpense = safeDouble(kpi, "expenses");
                    if (netProfit == 0.0) netProfit = safeDouble(kpi, "netProfit");
                    if (pendingCollections == 0.0) pendingCollections = safeDouble(kpi, "pendingDues");
                    if (patientsCount == 0) patientsCount = safeInt(kpi, "totalPatients");
                }
            }

            if (json.has("stats")) {
                JSONObject stats = json.optJSONObject("stats");
                if (stats != null) {
                    if (totalRevenue == 0.0) {
                        totalRevenue = safeDouble(stats, "totalRevenue");
                        if (totalRevenue == 0.0) totalRevenue = safeDouble(stats, "monthlyRevenue");
                    }
                    if (pendingCollections == 0.0) pendingCollections = safeDouble(stats, "pendingAmount");
                    if (invoicesCount == 0) invoicesCount = safeInt(stats, "pendingCount") + safeInt(stats, "overdueCount");
                }
            }

            if (profitMargin == 0.0 && totalRevenue > 0.0) {
                profitMargin = Math.max(-100.0, Math.min(100.0, ((totalRevenue - totalExpense) / totalRevenue) * 100.0));
            }

            if (lblDashTotalRevenue != null) lblDashTotalRevenue.setText(formatINR(totalRevenue));
            if (lblDashTotalExpenses != null) lblDashTotalExpenses.setText(formatINR(totalExpense));
            if (lblDashNetProfit != null) lblDashNetProfit.setText(formatINR(netProfit));
            if (lblDashProfitMargin != null) lblDashProfitMargin.setText(String.format(Locale.US, "%.1f%%", profitMargin));
            if (lblDashPendingDue != null) lblDashPendingDue.setText(formatINR(pendingCollections));

            // GST & Billing Adjustments (Full Web Parity)
            double grossBilling = safeDouble(json, "grossBilling");
            double totalDiscounts = safeDouble(json, "totalDiscounts");
            if (grossBilling == 0.0 && totalRevenue > 0.0) {
                grossBilling = totalRevenue + totalDiscounts;
            }
            double discountPercentage = safeDouble(json, "discountPercentage");
            double totalCGST = safeDouble(json, "totalCGST");
            double totalSGST = safeDouble(json, "totalSGST");

            if (lblDashGrossBilling != null) lblDashGrossBilling.setText(formatINR(grossBilling));
            if (lblDashDiscountsGiven != null) lblDashDiscountsGiven.setText(formatINR(totalDiscounts));
            if (lblDashDiscountPercent != null) {
                lblDashDiscountPercent.setText(String.format(Locale.US, "%.1f%% of gross revenue", discountPercentage));
            }
            if (lblDashCGST != null) lblDashCGST.setText(formatINR(totalCGST));
            if (lblDashSGST != null) lblDashSGST.setText(formatINR(totalSGST));

            // Operational Counters
            if (lblDashInvoicesCount != null) lblDashInvoicesCount.setText(String.valueOf(invoicesCount));
            if (lblDashPatientsCount != null) lblDashPatientsCount.setText(String.valueOf(patientsCount));

            // Ledgers
            cachedInvoices = json.optJSONArray("recentInvoices");
            if (cachedInvoices == null) cachedInvoices = new JSONArray();

            cachedExpenses = json.optJSONArray("recentExpenses");
            if (cachedExpenses == null) cachedExpenses = new JSONArray();

            if (tabLedgerAll != null) tabLedgerAll.setText("All (" + (cachedInvoices.length() + cachedExpenses.length()) + ")");
            if (tabLedgerInvoices != null) tabLedgerInvoices.setText("Invoices (" + cachedInvoices.length() + ")");
            if (tabLedgerExpenses != null) tabLedgerExpenses.setText("Expenses (" + cachedExpenses.length() + ")");

            updateTabStyles();
            renderCurrentLedger();

        } catch (Exception e) {
            // Soft fail: keep existing values rather than zeroing out
        }
    }

    private double safeDouble(JSONObject json, String key) {
        if (json == null || !json.has(key) || json.isNull(key)) return 0.0;
        try {
            Object val = json.get(key);
            if (val instanceof Number) return ((Number) val).doubleValue();
            if (val instanceof String) return Double.parseDouble(((String) val).trim());
        } catch (Exception ignored) {}
        return json.optDouble(key, 0.0);
    }

    private int safeInt(JSONObject json, String key) {
        if (json == null || !json.has(key) || json.isNull(key)) return 0;
        try {
            Object val = json.get(key);
            if (val instanceof Number) return ((Number) val).intValue();
            if (val instanceof String) return Integer.parseInt(((String) val).trim());
        } catch (Exception ignored) {}
        return json.optInt(key, 0);
    }

    private View makeSectionHeader(String title, int count, int color) {
        LinearLayout row = new LinearLayout(this);
        row.setOrientation(LinearLayout.HORIZONTAL);
        row.setGravity(android.view.Gravity.CENTER_VERTICAL);
        row.setPadding(0, 16, 0, 8);

        TextView tvTitle = new TextView(this);
        tvTitle.setText(title);
        tvTitle.setTextSize(11.5f);
        tvTitle.setTypeface(Typeface.DEFAULT_BOLD);
        tvTitle.setTextColor(0xFF475569);
        tvTitle.setLetterSpacing(0.06f);

        TextView tvBadge = new TextView(this);
        tvBadge.setText("  " + count + "  ");
        tvBadge.setTextSize(10f);
        tvBadge.setTypeface(Typeface.DEFAULT_BOLD);
        tvBadge.setTextColor(color);
        tvBadge.setBackgroundResource(R.drawable.bg_chip_inactive);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        lp.setMarginStart(10);
        tvBadge.setLayoutParams(lp);

        row.addView(tvTitle);
        row.addView(tvBadge);
        return row;
    }

    private View makeEmptyLabel(String text) {
        TextView tv = new TextView(this);
        tv.setText(text);
        tv.setTextSize(12.5f);
        tv.setTextColor(0xFF94A3B8);
        tv.setGravity(android.view.Gravity.CENTER);
        tv.setPadding(0, 20, 0, 20);
        return tv;
    }

    private void renderCurrentLedger() {
        containerLedgerItems.removeAllViews();
        lblLedgerEmptyState.setVisibility(View.GONE);
        LayoutInflater inflater = LayoutInflater.from(this);

        if (selectedLedgerTab == 0) {
            // All Records: Unified view mirroring Web & iOS
            View headerInv = makeSectionHeader("RECENT INVOICES", cachedInvoices.length(), 0xFF0D6EFD);
            containerLedgerItems.addView(headerInv);

            if (cachedInvoices.length() == 0) {
                containerLedgerItems.addView(makeEmptyLabel("No recent invoices found."));
            } else {
                for (int i = 0; i < cachedInvoices.length(); i++) {
                    JSONObject inv = cachedInvoices.optJSONObject(i);
                    if (inv != null) addInvoiceView(inflater, inv);
                }
            }

            View headerExp = makeSectionHeader("RECENT EXPENSES", cachedExpenses.length(), 0xFFE11D48);
            containerLedgerItems.addView(headerExp);

            if (cachedExpenses.length() == 0) {
                containerLedgerItems.addView(makeEmptyLabel("No recent expenses recorded."));
            } else {
                for (int i = 0; i < cachedExpenses.length(); i++) {
                    JSONObject exp = cachedExpenses.optJSONObject(i);
                    if (exp != null) addExpenseView(inflater, exp);
                }
            }
        } else if (selectedLedgerTab == 1) {
            // Invoices Only
            if (cachedInvoices.length() == 0) {
                lblLedgerEmptyState.setText("No recent invoices found for this timeframe");
                lblLedgerEmptyState.setVisibility(View.VISIBLE);
                return;
            }
            for (int i = 0; i < cachedInvoices.length(); i++) {
                JSONObject inv = cachedInvoices.optJSONObject(i);
                if (inv != null) addInvoiceView(inflater, inv);
            }
        } else {
            // Expenses Only
            if (cachedExpenses.length() == 0) {
                lblLedgerEmptyState.setText("No recent expenses recorded for this timeframe");
                lblLedgerEmptyState.setVisibility(View.VISIBLE);
                return;
            }
            for (int i = 0; i < cachedExpenses.length(); i++) {
                JSONObject exp = cachedExpenses.optJSONObject(i);
                if (exp != null) addExpenseView(inflater, exp);
            }
        }
    }

    private void addInvoiceView(LayoutInflater inflater, JSONObject inv) {
        View itemView = inflater.inflate(R.layout.item_analytics_invoice, containerLedgerItems, false);
        TextView lblNumber = itemView.findViewById(R.id.lblInvoiceNumber);
        TextView lblB2B = itemView.findViewById(R.id.lblInvoiceB2BTag);
        TextView lblStatus = itemView.findViewById(R.id.lblInvoiceStatus);
        TextView lblBilledTo = itemView.findViewById(R.id.lblInvoiceBilledTo);
        TextView lblDate = itemView.findViewById(R.id.lblInvoiceDate);
        TextView lblAmount = itemView.findViewById(R.id.lblInvoiceAmount);

        String num = inv.optString("invoiceNumber", "INV-2026-0000");
        boolean isB2B = inv.optBoolean("isB2B", false);
        String status = inv.optString("status", "PAID").toUpperCase();
        double amount = inv.optDouble("grandTotal", 0.0);
        String dateStr = formatDate(inv.optString("createdAt", ""));
        String patientName = inv.optString("patientName", "Walk-in Patient");

        lblNumber.setText(num);
        lblB2B.setVisibility(isB2B ? View.VISIBLE : View.GONE);
        lblStatus.setText(status);
        lblBilledTo.setText(patientName);
        lblDate.setText(dateStr);
        lblAmount.setText(formatINR(amount));

        if (status.equals("PAID")) {
            lblStatus.setTextColor(0xFF059669);
            lblStatus.setBackgroundResource(R.drawable.bg_tag_emerald);
        } else if (status.equals("PENDING")) {
            lblStatus.setTextColor(0xFFD97706);
            lblStatus.setBackgroundResource(R.drawable.bg_callout_yellow);
        } else {
            lblStatus.setTextColor(0xFFE11D48);
            lblStatus.setBackgroundResource(R.drawable.bg_tag_rose);
        }

        itemView.setOnClickListener(v -> {
            startActivity(new Intent(DashboardActivity.this, BillingActivity.class));
        });

        containerLedgerItems.addView(itemView);
    }

    private void addExpenseView(LayoutInflater inflater, JSONObject exp) {
        View itemView = inflater.inflate(R.layout.item_analytics_expense, containerLedgerItems, false);
        TextView lblCat = itemView.findViewById(R.id.lblExpenseCategory);
        TextView lblMode = itemView.findViewById(R.id.lblExpenseMode);
        TextView lblTitle = itemView.findViewById(R.id.lblExpenseTitle);
        TextView lblDate = itemView.findViewById(R.id.lblExpenseDate);
        TextView lblAmount = itemView.findViewById(R.id.lblExpenseAmount);

        String title = exp.optString("title", "Expense");
        String cat = exp.optString("category", "MISC").replace("_", " ");
        String mode = exp.optString("paymentMode", "CASH").replace("_", " ");
        double amount = exp.optDouble("amount", 0.0);
        String dateStr = formatDate(exp.optString("date", ""));

        lblCat.setText(cat);
        lblMode.setText(mode);
        lblTitle.setText(title);
        lblDate.setText(dateStr);
        lblAmount.setText("-" + formatINR(amount));

        containerLedgerItems.addView(itemView);
    }

    // ── Two-Way Synchronization: Log Expense Bottom Sheet ────────────────────
    private void showAddExpenseBottomSheet() {
        BottomSheetDialog dialog = new BottomSheetDialog(this);
        View sheet = LayoutInflater.from(this).inflate(R.layout.layout_add_expense_sheet, null);
        dialog.setContentView(sheet);

        EditText inputTitle = sheet.findViewById(R.id.inputExpenseTitle);
        EditText inputAmount = sheet.findViewById(R.id.inputExpenseAmount);
        EditText inputNotes = sheet.findViewById(R.id.inputExpenseNotes);
        MaterialButton btnSave = sheet.findViewById(R.id.btnSaveExpense);
        ProgressBar progress = sheet.findViewById(R.id.progressSaveExpense);
        ImageView btnClose = sheet.findViewById(R.id.btnExpenseClose);

        btnClose.setOnClickListener(v -> dialog.dismiss());

        // Category Chips
        TextView chipSalary = sheet.findViewById(R.id.chipCatSalary);
        TextView chipRent = sheet.findViewById(R.id.chipCatRent);
        TextView chipUtilities = sheet.findViewById(R.id.chipCatUtilities);
        TextView chipMaintenance = sheet.findViewById(R.id.chipCatMaintenance);
        TextView chipSupplies = sheet.findViewById(R.id.chipCatSupplies);
        TextView chipMisc = sheet.findViewById(R.id.chipCatMisc);

        final String[] selectedCategory = {"SALARY"};
        TextView[] catChips = {chipSalary, chipRent, chipUtilities, chipMaintenance, chipSupplies, chipMisc};
        String[] catEnums = {"SALARY", "RENT", "UTILITIES", "MACHINE_MAINTENANCE", "OFFICE_SUPPLIES", "MISC"};

        for (int i = 0; i < catChips.length; i++) {
            final int index = i;
            catChips[i].setOnClickListener(v -> {
                selectedCategory[0] = catEnums[index];
                for (int j = 0; j < catChips.length; j++) {
                    if (j == index) {
                        catChips[j].setBackgroundResource(R.drawable.bg_chip_toggle_active);
                        catChips[j].setTextColor(0xFF0D6EFD);
                    } else {
                        catChips[j].setBackgroundResource(R.drawable.bg_chip_toggle_inactive);
                        catChips[j].setTextColor(0xFF64748B);
                    }
                }
            });
        }

        // Payment Mode Chips
        TextView chipCash = sheet.findViewById(R.id.chipPayCash);
        TextView chipUPI = sheet.findViewById(R.id.chipPayUPI);
        TextView chipBank = sheet.findViewById(R.id.chipPayBank);
        TextView chipCard = sheet.findViewById(R.id.chipPayCard);

        final String[] selectedPaymentMode = {"CASH"};
        TextView[] payChips = {chipCash, chipUPI, chipBank, chipCard};
        String[] payEnums = {"CASH", "UPI", "BANK_TRANSFER", "CARD"};

        for (int i = 0; i < payChips.length; i++) {
            final int index = i;
            payChips[i].setOnClickListener(v -> {
                selectedPaymentMode[0] = payEnums[index];
                for (int j = 0; j < payChips.length; j++) {
                    if (j == index) {
                        payChips[j].setBackgroundResource(R.drawable.bg_chip_toggle_active);
                        payChips[j].setTextColor(0xFF0D6EFD);
                    } else {
                        payChips[j].setBackgroundResource(R.drawable.bg_chip_toggle_inactive);
                        payChips[j].setTextColor(0xFF64748B);
                    }
                }
            });
        }

        btnSave.setOnClickListener(v -> {
            String title = inputTitle.getText().toString().trim();
            String amountStr = inputAmount.getText().toString().trim();
            String notes = inputNotes.getText().toString().trim();

            if (title.isEmpty()) {
                inputTitle.setError("Please enter expense title");
                return;
            }

            double amount;
            try {
                amount = Double.parseDouble(amountStr);
                if (amount <= 0) throw new Exception();
            } catch (Exception e) {
                inputAmount.setError("Please enter a valid positive amount");
                return;
            }

            btnSave.setVisibility(View.GONE);
            progress.setVisibility(View.VISIBLE);

            new Thread(() -> {
                String token = getAuthToken();
                try {
                    URL url = new URL(BASE_URL);
                    HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                    conn.setRequestMethod("POST");
                    conn.setRequestProperty("Content-Type", "application/json");
                    conn.setDoOutput(true);
                    if (token != null && !token.isEmpty()) {
                        conn.setRequestProperty("Cookie", "token=" + token);
                        conn.setRequestProperty("Authorization", "Bearer " + token);
                    }

                    JSONObject body = new JSONObject();
                    body.put("title", title);
                    body.put("amount", amount);
                    body.put("category", selectedCategory[0]);
                    body.put("paymentMode", selectedPaymentMode[0]);
                    if (!notes.isEmpty()) body.put("notes", notes);

                    OutputStream os = conn.getOutputStream();
                    os.write(body.toString().getBytes());
                    os.flush();
                    os.close();

                    int code = conn.getResponseCode();
                    if (code >= 200 && code < 300) {
                        mainHandler.post(() -> {
                            dialog.dismiss();
                            Toast.makeText(this, "Expense recorded and synced successfully", Toast.LENGTH_SHORT).show();
                            fetchDashboardMetrics();
                        });
                        return;
                    }
                } catch (Exception ignored) {}

                mainHandler.post(() -> {
                    btnSave.setVisibility(View.VISIBLE);
                    progress.setVisibility(View.GONE);
                    Toast.makeText(this, "Failed to record expense. Please try again.", Toast.LENGTH_SHORT).show();
                });
            }).start();
        });

        dialog.show();
    }

    private String formatINR(double amount) {
        try {
            java.text.NumberFormat nf = java.text.NumberFormat.getCurrencyInstance(new Locale("en", "IN"));
            nf.setMaximumFractionDigits(0);
            return nf.format(amount);
        } catch (Exception e) {
            return String.format(Locale.getDefault(), "₹ %,.0f", amount);
        }
    }

    private String formatDate(String iso) {
        if (iso == null || iso.isEmpty()) return "Recent";
        try {
            SimpleDateFormat inFmt = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
            inFmt.setTimeZone(TimeZone.getTimeZone("UTC"));
            Date d = inFmt.parse(iso);
            if (d == null) return iso.substring(0, Math.min(10, iso.length()));

            SimpleDateFormat outFmt = new SimpleDateFormat("dd MMM yyyy", Locale.US);
            return outFmt.format(d);
        } catch (Exception e) {
            try {
                SimpleDateFormat inFmt2 = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.US);
                Date d = inFmt2.parse(iso);
                if (d != null) {
                    return new SimpleDateFormat("dd MMM yyyy", Locale.US).format(d);
                }
            } catch (Exception ignored) {}
            return iso.length() >= 10 ? iso.substring(0, 10) : iso;
        }
    }
}
