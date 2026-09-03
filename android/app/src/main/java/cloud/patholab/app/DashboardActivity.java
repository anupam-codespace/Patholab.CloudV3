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
import android.widget.Button;
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
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;

import cloud.patholab.app.auth.AuthManager;

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  DashboardActivity — Native Financial Analytics Console (Android)
 *  Directly mirroring web (/workspace/analytics):
 *   1. 4 Primary Top-Level KPIs: Revenue, Expenses, Net Profit, Pending Due
 *   2. 4 Tax & Discount Breakdown Cards: Gross Billing, Discounts, CGST, SGST
 *   3. Interactive Multi-Ledger Viewer: Recent Invoices & Recent Expenses
 * ═══════════════════════════════════════════════════════════════════════════
 */
public class DashboardActivity extends AppCompatActivity {

    private SwipeRefreshLayout swipeRefreshDashboard;
    private FrameLayout btnDashboardBack, btnDashboardRefresh;
    private ImageView imgDashboardRefreshIcon;
    private TextView lblDashboardUserGreeting, lblDashboardUserRoleLab;

    // Top-Level KPI Metric Labels
    private TextView lblDashTotalRevenue, lblDashTotalExpenses, lblDashNetProfit, lblDashPendingDue;
    private TextView lblDashInvoicesCount, lblDashExpensesCount, lblDashPendingCount;

    // Tax & Discount Breakdown Labels
    private TextView lblDashGrossBilling, lblDashDiscountsGiven, lblDashDiscountPercent;
    private TextView lblDashCGST, lblDashSGST;

    // Ledger Tabs & Containers
    private TextView tabLedgerInvoices, tabLedgerExpenses;
    private LinearLayout containerLedgerItems;
    private TextView lblLedgerEmptyState;
    private Button btnViewAllInvoices;

    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private JSONArray cachedInvoices = new JSONArray();
    private JSONArray cachedExpenses = new JSONArray();
    private boolean isShowingInvoices = true;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        StatusBarHelper.setStatusBarDeepNavy(this);
        setContentView(R.layout.activity_dashboard);

        initViews();
        setupEvents();
        syncUserDetails();
        fetchDashboardMetrics();
    }

    private void initViews() {
        swipeRefreshDashboard = findViewById(R.id.swipeRefreshDashboard);
        btnDashboardBack = findViewById(R.id.btnDashboardBack);
        btnDashboardRefresh = findViewById(R.id.btnDashboardRefresh);
        imgDashboardRefreshIcon = findViewById(R.id.imgDashboardRefreshIcon);
        lblDashboardUserGreeting = findViewById(R.id.lblDashboardUserGreeting);
        lblDashboardUserRoleLab = findViewById(R.id.lblDashboardUserRoleLab);

        lblDashTotalRevenue = findViewById(R.id.lblDashTotalRevenue);
        lblDashTotalExpenses = findViewById(R.id.lblDashTotalExpenses);
        lblDashNetProfit = findViewById(R.id.lblDashNetProfit);
        lblDashPendingDue = findViewById(R.id.lblDashPendingDue);

        lblDashInvoicesCount = findViewById(R.id.lblDashInvoicesCount);
        lblDashExpensesCount = findViewById(R.id.lblDashExpensesCount);
        lblDashPendingCount = findViewById(R.id.lblDashPendingCount);

        lblDashGrossBilling = findViewById(R.id.lblDashGrossBilling);
        lblDashDiscountsGiven = findViewById(R.id.lblDashDiscountsGiven);
        lblDashDiscountPercent = findViewById(R.id.lblDashDiscountPercent);
        lblDashCGST = findViewById(R.id.lblDashCGST);
        lblDashSGST = findViewById(R.id.lblDashSGST);

        tabLedgerInvoices = findViewById(R.id.tabLedgerInvoices);
        tabLedgerExpenses = findViewById(R.id.tabLedgerExpenses);
        containerLedgerItems = findViewById(R.id.containerLedgerItems);
        lblLedgerEmptyState = findViewById(R.id.lblLedgerEmptyState);
        btnViewAllInvoices = findViewById(R.id.btnViewAllInvoices);

        // Heavy bold typography
        Typeface blackTf = Typeface.create("sans-serif-black", Typeface.BOLD);
        if (lblDashTotalRevenue != null) lblDashTotalRevenue.setTypeface(blackTf);
        if (lblDashTotalExpenses != null) lblDashTotalExpenses.setTypeface(blackTf);
        if (lblDashNetProfit != null) lblDashNetProfit.setTypeface(blackTf);
        if (lblDashPendingDue != null) lblDashPendingDue.setTypeface(blackTf);
    }

    private void setupEvents() {
        btnDashboardBack.setOnClickListener(v -> finish());

        swipeRefreshDashboard.setColorSchemeColors(0xFF0D6EFD);
        swipeRefreshDashboard.setOnRefreshListener(this::fetchDashboardMetrics);

        btnDashboardRefresh.setOnClickListener(v -> {
            RotateAnimation rotate = new RotateAnimation(0, 360,
                    Animation.RELATIVE_TO_SELF, 0.5f, Animation.RELATIVE_TO_SELF, 0.5f);
            rotate.setDuration(600);
            imgDashboardRefreshIcon.startAnimation(rotate);
            fetchDashboardMetrics();
        });

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

        // View All Invoices
        btnViewAllInvoices.setOnClickListener(v -> {
            startActivity(new Intent(this, BillingActivity.class));
        });
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

    private void syncUserDetails() {
        String role = AuthManager.getUserRole(this);
        String lab = AuthManager.getLabName(this);

        if (role == null || role.trim().isEmpty()) role = "Lab Owner";
        if (lab == null || lab.trim().isEmpty()) lab = "Care Diagnostic Hub";

        if (role.equalsIgnoreCase("LAB_OWNER")) role = "Lab Owner";
        else if (role.equalsIgnoreCase("LAB_MANAGER")) role = "Lab Manager";
        else if (role.equalsIgnoreCase("PATHOLOGIST")) role = "Pathologist";
        else if (role.equalsIgnoreCase("RECEPTIONIST")) role = "Reception Desk";
        else if (role.equalsIgnoreCase("SUPER_ADMIN")) role = "System Admin";

        lblDashboardUserRoleLab.setText(role + " • " + lab);
        lblDashboardUserGreeting.setText("Live Sync • Pay-As-You-Go Active");
    }

    private void fetchDashboardMetrics() {
        swipeRefreshDashboard.setRefreshing(true);

        new Thread(() -> {
            String token = AuthManager.getToken(this);
            try {
                URL url = new URL("https://app.patholab.cloud/api/workspace/analytics");
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("GET");
                conn.setConnectTimeout(9000);
                conn.setReadTimeout(9000);
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
                        bindMetricsData(json);
                        swipeRefreshDashboard.setRefreshing(false);
                    });
                    return;
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
            double totalRevenue = json.optDouble("totalRevenue", 0.0);
            double totalExpense = json.optDouble("totalExpense", 0.0);
            double netProfit = json.optDouble("netProfit", 0.0);
            double pendingCollections = json.optDouble("pendingCollections", 0.0);

            double grossBilling = json.optDouble("grossBilling", 0.0);
            double totalDiscounts = json.optDouble("totalDiscounts", 0.0);
            double totalCGST = json.optDouble("totalCGST", 0.0);
            double totalSGST = json.optDouble("totalSGST", 0.0);

            int invoicesCount = json.optInt("invoicesCount", 0);

            // Primary KPIs
            lblDashTotalRevenue.setText(formatINR(totalRevenue));
            lblDashTotalExpenses.setText(formatINR(totalExpense));
            lblDashNetProfit.setText(formatINR(netProfit));
            lblDashPendingDue.setText(formatINR(pendingCollections));

            lblDashInvoicesCount.setText(invoicesCount > 0 ? (invoicesCount + " Invoices Generated") : "Excl. cancelled");
            lblDashExpensesCount.setText("All recorded expenses");
            lblDashPendingCount.setText("Unsettled invoices due");

            // Tax & Discounts
            lblDashGrossBilling.setText(formatINR(grossBilling));
            lblDashDiscountsGiven.setText(formatINR(totalDiscounts));

            double discPercent = grossBilling > 0 ? ((totalDiscounts / grossBilling) * 100.0) : 0.0;
            lblDashDiscountPercent.setText(String.format(Locale.getDefault(), "%.1f%% of gross billing", discPercent));

            lblDashCGST.setText(formatINR(totalCGST));
            lblDashSGST.setText(formatINR(totalSGST));

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
                lblLedgerEmptyState.setText("No recent invoices found");
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

                String name = "Patient";
                JSONObject patientObj = inv.optJSONObject("patient");
                JSONObject agencyObj = inv.optJSONObject("agency");
                if (isB2B && agencyObj != null) {
                    name = agencyObj.optString("agencyName", "Unknown Agency");
                } else if (patientObj != null) {
                    name = patientObj.optString("name", "Unknown Patient");
                }

                lblNumber.setText(num);
                lblB2B.setVisibility(isB2B ? View.VISIBLE : View.GONE);
                lblStatus.setText(status);
                lblBilledTo.setText(name);
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
                lblLedgerEmptyState.setText("No recent expenses recorded");
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
                String cat = exp.optString("category", "OPERATING").replace("_", " ");
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
