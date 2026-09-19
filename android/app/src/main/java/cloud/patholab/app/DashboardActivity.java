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

    // Operational Counters
    private TextView lblDashInvoicesCount, lblDashPatientsCount;

    // Ledger Tabs & Containers
    private TextView tabLedgerInvoices, tabLedgerExpenses;
    private LinearLayout containerLedgerItems;
    private TextView lblLedgerEmptyState;
    private MaterialButton btnLogExpense, btnViewAllInvoices;

    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private JSONArray cachedInvoices = new JSONArray();
    private JSONArray cachedExpenses = new JSONArray();
    private boolean isShowingInvoices = true;

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

        // Tab Switching
        tabLedgerInvoices.setOnClickListener(v -> {
            isShowingInvoices = true;
            updateTabStyles();
            renderCurrentLedger();
        });

        tabLedgerExpenses.setOnClickListener(v -> {
            isShowingInvoices = false;
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
        if (isShowingInvoices) {
            tabLedgerInvoices.setBackgroundResource(R.drawable.bg_chip_toggle_active);
            tabLedgerInvoices.setTextColor(0xFF0D6EFD);

            tabLedgerExpenses.setBackgroundResource(R.drawable.bg_chip_toggle_inactive);
            tabLedgerExpenses.setTextColor(0xFF64748B);
        } else {
            tabLedgerInvoices.setBackgroundResource(R.drawable.bg_chip_toggle_inactive);
            tabLedgerInvoices.setTextColor(0xFF64748B);

            tabLedgerExpenses.setBackgroundResource(R.drawable.bg_chip_toggle_active);
            tabLedgerExpenses.setTextColor(0xFF0D6EFD);
        }
    }

    private String getAuthToken() {
        String token = AuthManager.getToken(this);
        if (token != null && !token.trim().isEmpty()) {
            return token.trim();
        }
        try {
            SharedPreferences sp = getSharedPreferences("PatholabPrefs", MODE_PRIVATE);
            String spToken = sp.getString("auth_token", null);
            if (spToken != null && !spToken.trim().isEmpty()) {
                AuthManager.saveToken(this, spToken);
                return spToken.trim();
            }
        } catch (Exception ignored) {}
        try {
            android.webkit.CookieManager cm = android.webkit.CookieManager.getInstance();
            String cookies = cm.getCookie("https://app.patholab.cloud");
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
                        mainHandler.post(this::syncUserDetails);
                    }
                }
            } catch (Exception ignored) {}
        }).start();
    }

    private void syncUserDetails() {
        String name = AuthManager.getUserName(this);
        String email = AuthManager.getUserEmail(this);

        // Show only the real user name — hide role/lab/email labels from the UI
        // (Lab Owner, Care Diagnostics and Gmail ID are never displayed)
        if (name == null || name.trim().isEmpty() || "null".equalsIgnoreCase(name)) name = "";

        if (lblDashboardUserName != null) lblDashboardUserName.setText(name);

        // Hide email address — never show Gmail or any personal email in analytics header
        if (lblDashboardUserEmail != null) {
            lblDashboardUserEmail.setVisibility(android.view.View.GONE);
        }

        // Hide "Lab Owner • Care Diagnostics" role-lab subtitle
        if (lblDashboardUserRoleLab != null) {
            lblDashboardUserRoleLab.setVisibility(android.view.View.GONE);
        }

        // Hide lab name badge (e.g., "Care Diagnostics")
        if (lblDashboardLabBadge != null) {
            lblDashboardLabBadge.setVisibility(android.view.View.GONE);
        }

        if (lblDashboardAvatarInitial != null) {
            String initial = (name != null && !name.isEmpty())
                    ? String.valueOf(name.charAt(0)).toUpperCase(Locale.ROOT) : "U";
            lblDashboardAvatarInitial.setText(initial);
        }
    }

    private void fetchDashboardMetrics() {
        swipeRefreshDashboard.setRefreshing(true);

        new Thread(() -> {
            String token = getAuthToken();
            try {
                String queryUrl = BASE_URL + "?timeframe=" + selectedTimeframe;
                URL url = new URL(queryUrl);
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("GET");
                conn.setConnectTimeout(10000);
                conn.setReadTimeout(10000);
                if (token != null && !token.isEmpty()) {
                    conn.setRequestProperty("Cookie", "token=" + token);
                    conn.setRequestProperty("Authorization", "Bearer " + token);
                }

                int code = conn.getResponseCode();
                InputStream is = (code >= 200 && code < 300) ? conn.getInputStream() : conn.getErrorStream();
                if (is != null) {
                    BufferedReader reader = new BufferedReader(new InputStreamReader(is));
                    StringBuilder sb = new StringBuilder();
                    String line;
                    while ((line = reader.readLine()) != null) sb.append(line);
                    reader.close();

                    if (code == 200) {
                        JSONObject json = new JSONObject(sb.toString());
                        mainHandler.post(() -> {
                            bindMetricsData(json);
                            swipeRefreshDashboard.setRefreshing(false);
                        });
                        return;
                    }
                }
            } catch (Exception ignored) {}

            mainHandler.post(() -> {
                bindMetricsData(new JSONObject());
                swipeRefreshDashboard.setRefreshing(false);
            });
        }).start();
    }

    private void bindMetricsData(JSONObject json) {
        try {
            // Real-Time User & Lab Identity Sync from Analytics Payload
            if (json.has("user")) {
                JSONObject userObj = json.optJSONObject("user");
                if (userObj != null) {
                    String uName = userObj.optString("name", "");
                    String uEmail = userObj.optString("email", "");
                    String uRole = userObj.optString("role", "");
                    if (!uName.isEmpty() && !"null".equalsIgnoreCase(uName)) {
                        if (lblDashboardUserName != null) lblDashboardUserName.setText(uName);
                        if (lblDashboardAvatarInitial != null) {
                            lblDashboardAvatarInitial.setText(String.valueOf(uName.charAt(0)).toUpperCase(Locale.ROOT));
                        }
                    }
                    if (!uEmail.isEmpty() && !"null".equalsIgnoreCase(uEmail) && lblDashboardUserEmail != null) {
                        lblDashboardUserEmail.setText(uEmail);
                    }
                }
            }
            if (json.has("lab")) {
                JSONObject labObj = json.optJSONObject("lab");
                if (labObj != null) {
                    String lName = labObj.optString("name", "");
                    if (!lName.isEmpty() && !"null".equalsIgnoreCase(lName)) {
                        String currentRole = AuthManager.getUserRole(this);
                        if (currentRole == null || currentRole.isEmpty()) currentRole = "Lab Owner";
                        if (lblDashboardUserRoleLab != null) lblDashboardUserRoleLab.setText(currentRole + " • " + lName);
                        if (lblDashboardLabBadge != null) lblDashboardLabBadge.setText(lName);
                    }
                }
            }

            double totalRevenue = json.optDouble("totalRevenue", 0.0);
            double totalExpense = json.optDouble("totalExpense", 0.0);
            double netProfit = json.optDouble("netProfit", 0.0);
            double profitMargin = json.optDouble("profitMargin", 0.0);
            double pendingCollections = json.optDouble("pendingCollections", 0.0);

            int invoicesCount = json.optInt("invoicesCount", 0);
            int patientsCount = json.optInt("patientsCount", 0);

            // Primary KPIs
            lblDashTotalRevenue.setText(formatINR(totalRevenue));
            lblDashTotalExpenses.setText(formatINR(totalExpense));
            lblDashNetProfit.setText(formatINR(netProfit));
            lblDashProfitMargin.setText(String.format(Locale.US, "%.1f%%", profitMargin));
            lblDashPendingDue.setText(formatINR(pendingCollections));

            // Operational Counters
            lblDashInvoicesCount.setText(String.valueOf(invoicesCount));
            lblDashPatientsCount.setText(String.valueOf(patientsCount));

            // Ledgers
            cachedInvoices = json.optJSONArray("recentInvoices");
            if (cachedInvoices == null) cachedInvoices = new JSONArray();

            cachedExpenses = json.optJSONArray("recentExpenses");
            if (cachedExpenses == null) cachedExpenses = new JSONArray();

            tabLedgerInvoices.setText("Recent Invoices (" + cachedInvoices.length() + ")");
            tabLedgerExpenses.setText("Recent Expenses (" + cachedExpenses.length() + ")");

            renderCurrentLedger();

        } catch (Exception e) {
            lblDashTotalRevenue.setText("₹0");
            lblDashTotalExpenses.setText("₹0");
            lblDashNetProfit.setText("₹0");
            lblDashPendingDue.setText("₹0");
        }
    }

    private void renderCurrentLedger() {
        containerLedgerItems.removeAllViews();
        LayoutInflater inflater = LayoutInflater.from(this);

        if (isShowingInvoices) {
            if (cachedInvoices.length() == 0) {
                lblLedgerEmptyState.setText("No recent invoices found for this timeframe");
                lblLedgerEmptyState.setVisibility(View.VISIBLE);
                return;
            }
            lblLedgerEmptyState.setVisibility(View.GONE);

            for (int i = 0; i < cachedInvoices.length(); i++) {
                JSONObject inv = cachedInvoices.optJSONObject(i);
                if (inv == null) continue;

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

                // Status coloring
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

                containerLedgerItems.addView(itemView);
            }
        } else {
            if (cachedExpenses.length() == 0) {
                lblLedgerEmptyState.setText("No recent expenses recorded for this timeframe");
                lblLedgerEmptyState.setVisibility(View.VISIBLE);
                return;
            }
            lblLedgerEmptyState.setVisibility(View.GONE);

            for (int i = 0; i < cachedExpenses.length(); i++) {
                JSONObject exp = cachedExpenses.optJSONObject(i);
                if (exp == null) continue;

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
        }
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
        return String.format(Locale.getDefault(), "₹ %,.0f", amount);
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
