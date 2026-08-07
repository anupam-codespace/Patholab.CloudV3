package cloud.patholab.app;

import android.annotation.SuppressLint;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.LayoutInflater;
import android.view.View;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import androidx.appcompat.app.AlertDialog;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;
import com.google.android.material.bottomnavigation.BottomNavigationView;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import cloud.patholab.app.auth.AuthManager;
import cloud.patholab.app.auth.LoginActivity;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    // ── Views ────────────────────────────────────────────────────────────────
    private WebView webView;
    private SwipeRefreshLayout swipeRefresh;
    private FrameLayout skeletonContainer;
    private BottomNavigationView bottomNavigation;
    private View offlineOverlay;
    private ScrollView moreScrollView;
    private TextView lblHeaderTitle;
    
    // Category containers matching web app groups
    private LinearLayout containerOverview, containerClinical, containerLogistics;
    private LinearLayout containerMachine, containerB2B, containerAdmin, containerLegal;
    private TextView lblOverviewHeader, lblClinicalHeader, lblLogisticsHeader;
    private TextView lblMachineHeader, lblB2BHeader, lblAdminHeader, lblLegalHeader;

    // ── State ─────────────────────────────────────────────────────────────────
    private static final String BASE_URL = "https://app.patholab.cloud";
    private String currentPath = null;
    private SharedPreferences prefs;
    private List<ModuleItem> allModules;
    private com.google.android.material.bottomsheet.BottomSheetDialog moreBottomSheetDialog;
    private int previousTab = R.id.nav_dashboard;

    // Polling handler for natural, responsive web view progress skeleton
    private final Handler progressHandler = new Handler(Looper.getMainLooper());
    private final Runnable progressRunnable = new Runnable() {
        @Override
        public void run() {
            if (webView != null) {
                int progress = webView.getProgress();
                if (progress < 100) {
                    skeletonContainer.setVisibility(View.VISIBLE);
                    progressHandler.postDelayed(this, 100);
                } else {
                    skeletonContainer.setVisibility(View.GONE);
                }
            }
        }
    };

    // ── Lifecycle ─────────────────────────────────────────────────────────────

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // super.onCreate already sets Capacitor layout.
        // We customize the layout and grab the WebView in load() override.
    }

    /**
     * Capacitor calls load() after the Bridge and WebView are fully initialised.
     */
    @Override
    public void load() {
        super.load();

        // 1. Get the now-guaranteed WebView from the bridge
        webView = this.bridge.getWebView();

        // 2. Detach it from Capacitor's default parent so we can re-host it
        if (webView.getParent() != null) {
            ((android.view.ViewGroup) webView.getParent()).removeView(webView);
        }

        // 3. Inflate our custom layout over the activity
        setContentView(R.layout.activity_main);

        // 4. Re-attach the WebView into our container
        FrameLayout container = findViewById(R.id.webViewContainer);
        container.addView(webView, new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT));

        // 5. Configure WebView settings
        configureWebView();

        // 6. Wire the rest of the UI
        prefs = getSharedPreferences("PatholabPrefs", Context.MODE_PRIVATE);
        bindViews();
        initModulesData();
        setupBottomNavigation();

        // 7. Navigate to Dashboard
        loadUrl("/workspace/analytics");
    }

    // ── Setup helpers ──────────────────────────────────────────────────────────

    @SuppressLint("SetJavaScriptEnabled")
    private void configureWebView() {
        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setCacheMode(WebSettings.LOAD_DEFAULT);
    }

    private void bindViews() {
        swipeRefresh      = findViewById(R.id.swipeRefresh);
        skeletonContainer = findViewById(R.id.skeletonContainer);
        bottomNavigation  = findViewById(R.id.bottomNavigation);
        offlineOverlay    = findViewById(R.id.offlineOverlay);
        
        // Retry button
        View btnRetry = findViewById(R.id.btnRetry);
        if (btnRetry != null) {
            btnRetry.setOnClickListener(v -> {
                offlineOverlay.setVisibility(View.GONE);
                swipeRefresh.setVisibility(View.VISIBLE);
                currentPath = null;
                loadUrl("/workspace/analytics");
            });
        }

        // Pull-to-refresh
        swipeRefresh.setOnRefreshListener(() -> {
            swipeRefresh.setRefreshing(false);
            if (webView != null) webView.reload();
        });

        lblHeaderTitle = findViewById(R.id.lblHeaderTitle);
        View btnNotification = findViewById(R.id.btnHeaderNotification);
        if (btnNotification != null) {
            btnNotification.setOnClickListener(v -> navigate("/workspace/support"));
        }
        View btnSupport = findViewById(R.id.btnHeaderSupport);
        if (btnSupport != null) {
            btnSupport.setOnClickListener(v -> navigate("/workspace/support"));
        }
        swipeRefresh.setColorSchemeColors(0xFF3730A3);
    }

    private void setupBottomNavigation() {
        bottomNavigation.setOnItemSelectedListener(item -> {
            int id = item.getItemId();
            if (id != R.id.nav_more) {
                previousTab = id;
            }
            if (id == R.id.nav_dashboard) {
                navigate("/workspace/analytics");
                return true;
            } else if (id == R.id.nav_patients) {
                navigate("/workspace/patients");
                return true;
            } else if (id == R.id.nav_categories) {
                navigate("/workspace/test-management");
                return true;
            } else if (id == R.id.nav_more) {
                showMorePanel();
                return true;
            }
            return false;
        });
    }

    private void navigate(String path) {
        if (offlineOverlay != null) offlineOverlay.setVisibility(View.GONE);
        swipeRefresh.setVisibility(View.VISIBLE);
        loadUrl(path);
    }

    private void showMorePanel() {
        if (moreBottomSheetDialog == null) {
            moreBottomSheetDialog = new com.google.android.material.bottomsheet.BottomSheetDialog(this);
            View sheetView = getLayoutInflater().inflate(R.layout.layout_more_sheet, null);
            moreBottomSheetDialog.setContentView(sheetView);

            // Bind views inside sheet view
            moreScrollView    = sheetView.findViewById(R.id.moreSettingsScrollView);
            containerOverview    = sheetView.findViewById(R.id.containerOverview);
            containerClinical    = sheetView.findViewById(R.id.containerClinical);
            containerLogistics   = sheetView.findViewById(R.id.containerLogistics);
            containerMachine     = sheetView.findViewById(R.id.containerMachine);
            containerB2B         = sheetView.findViewById(R.id.containerB2B);
            containerAdmin       = sheetView.findViewById(R.id.containerAdmin);
            containerLegal       = sheetView.findViewById(R.id.containerLegal);

            lblOverviewHeader    = sheetView.findViewById(R.id.lblOverviewHeader);
            lblClinicalHeader    = sheetView.findViewById(R.id.lblClinicalHeader);
            lblLogisticsHeader   = sheetView.findViewById(R.id.lblLogisticsHeader);
            lblMachineHeader     = sheetView.findViewById(R.id.lblMachineHeader);
            lblB2BHeader         = sheetView.findViewById(R.id.lblB2BHeader);
            lblAdminHeader       = sheetView.findViewById(R.id.lblAdminHeader);
            lblLegalHeader       = sheetView.findViewById(R.id.lblLegalHeader);

            // Logout inside bottom sheet
            View btnLogout = sheetView.findViewById(R.id.btnMoreLogout);
            if (btnLogout != null) {
                btnLogout.setOnClickListener(v -> {
                    moreBottomSheetDialog.dismiss();
                    confirmLogout();
                });
            }

            // OnDismiss resets selection
            moreBottomSheetDialog.setOnDismissListener(dialog -> {
                bottomNavigation.setOnItemSelectedListener(null);
                bottomNavigation.setSelectedItemId(previousTab);
                setupBottomNavigation();
            });

            // Adjust height to 80% of screen height
            moreBottomSheetDialog.setOnShowListener(dialog -> {
                com.google.android.material.bottomsheet.BottomSheetDialog d = 
                    (com.google.android.material.bottomsheet.BottomSheetDialog) dialog;
                FrameLayout bottomSheet = d.findViewById(com.google.android.material.R.id.design_bottom_sheet);
                if (bottomSheet != null) {
                    com.google.android.material.bottomsheet.BottomSheetBehavior<FrameLayout> behavior = 
                        com.google.android.material.bottomsheet.BottomSheetBehavior.from(bottomSheet);
                    
                    int screenHeight = getResources().getDisplayMetrics().heightPixels;
                    int targetHeight = (int) (screenHeight * 0.8);
                    
                    android.view.ViewGroup.LayoutParams layoutParams = bottomSheet.getLayoutParams();
                    layoutParams.height = targetHeight;
                    bottomSheet.setLayoutParams(layoutParams);
                    
                    behavior.setPeekHeight(targetHeight);
                    behavior.setState(com.google.android.material.bottomsheet.BottomSheetBehavior.STATE_EXPANDED);
                }
            });
        }

        renderModules();
        moreBottomSheetDialog.show();
    }

    private void loadUrl(String path) {
        if (webView == null) return;
        if (lblHeaderTitle != null) {
            lblHeaderTitle.setText(getHeaderTitle(path));
        }
        if (path.equals(currentPath)) return;
        currentPath = path;
        String token = AuthManager.getToken(this);
        if (token != null) AuthManager.syncWebViewCookie(token);

        // Start checking progress to display the native skeleton dynamically
        progressHandler.removeCallbacks(progressRunnable);
        skeletonContainer.setVisibility(View.VISIBLE);
        progressHandler.post(progressRunnable);

        webView.loadUrl(BASE_URL + path);
    }

    // ── More section ───────────────────────────────────────────────────────────

    private void initModulesData() {
        allModules = new ArrayList<>();
        
        // Overview
        allModules.add(new ModuleItem("Financial Analytics",  "/workspace/analytics",          "Overview",   "View detailed revenue reports & analytical charts", android.R.drawable.ic_menu_today,       false));
        allModules.add(new ModuleItem("Online Booking",       "/workspace/bookings",           "Overview",   "Manage home collections & online appointments",     android.R.drawable.ic_menu_today,       true));

        // Clinical Operations
        allModules.add(new ModuleItem("Patient Registration",  "/workspace/registration",       "Clinical",   "Register patients & book new lab tests",            android.R.drawable.ic_menu_add,          true));
        allModules.add(new ModuleItem("Worklist & Results",    "/workspace/results",            "Clinical",   "Fill raw tests values & review parameters",         android.R.drawable.ic_menu_edit,         false));
        allModules.add(new ModuleItem("Report Dispatch",       "/workspace/reports",            "Clinical",   "Sign off reports & dispatch PDF files",             android.R.drawable.ic_menu_agenda,       false));

        // Resources & Logistics
        allModules.add(new ModuleItem("Inventory & Stock",     "/workspace/inventory",          "Logistics",  "Track reagents, consumption & items",               android.R.drawable.ic_menu_save,         true));
        allModules.add(new ModuleItem("Logistics / Trips",     "/workspace/logistics",          "Logistics",  "Manage field agents & pickup trips",                android.R.drawable.ic_menu_directions,   false));

        // Machine & AI
        allModules.add(new ModuleItem("Analyzer",              "/workspace/analyzers",          "Machine",    "Connect analyzers & view output logs",              android.R.drawable.ic_menu_preferences,  false));
        allModules.add(new ModuleItem("Visual Mapper",         "/workspace/analyzers/mapper",   "Machine",    "Map barcode codes visually to fields",              android.R.drawable.ic_menu_preferences,  false));
        allModules.add(new ModuleItem("Mappings",              "/workspace/analyzers/mappings", "Machine",    "Configure machine integration parameters",          android.R.drawable.ic_menu_preferences,  false));
        allModules.add(new ModuleItem("AI Analysis",           "/workspace/analyzers/ai",       "Machine",    "Leverage AI models on clinical samples",             android.R.drawable.ic_menu_preferences,  true));

        // B2B & Growth
        allModules.add(new ModuleItem("Referral Doctors",      "/workspace/doctors",            "B2B",        "Manage referral incentives & profiles",             android.R.drawable.ic_menu_myplaces,     false));
        allModules.add(new ModuleItem("Corporate Agencies",    "/workspace/agencies",           "B2B",        "Manage corporate accounts & discounts",             android.R.drawable.ic_menu_share,        false));
        allModules.add(new ModuleItem("Commissions Payout",    "/workspace/commissions",        "B2B",        "Approve payouts & track growth metrics",            android.R.drawable.ic_menu_call,         false));
        allModules.add(new ModuleItem("B2B Settings",          "/workspace/settings/b2b-tiers", "B2B",        "Configure corporate pricing tiers",                 android.R.drawable.ic_menu_preferences,  false));

        // Administration
        allModules.add(new ModuleItem("Report Templates",      "/workspace/settings/templates", "Admin",      "Configure letterheads, signatures & reports",       android.R.drawable.ic_menu_gallery,      false));
        allModules.add(new ModuleItem("Staff Management",      "/workspace/staff",              "Admin",      "Manage pathologists, technicians & logins",         android.R.drawable.ic_menu_myplaces,     false));
        allModules.add(new ModuleItem("Invoices & Payments",   "/workspace/billing",            "Admin",      "Approve bills, invoices & receipts",                android.R.drawable.ic_menu_call,         false));
        allModules.add(new ModuleItem("Expenses",              "/workspace/expenses",           "Admin",      "Log daily office & operation expenses",             android.R.drawable.ic_menu_agenda,       false));
        allModules.add(new ModuleItem("Lab Settings",          "/workspace/settings",           "Admin",      "Update lab details & branch parameters",            android.R.drawable.ic_menu_preferences,  false));
        allModules.add(new ModuleItem("Audit Logs",            "/workspace/audit-logs",          "Admin",      "Monitor database changes & logs",                   android.R.drawable.ic_menu_info_details, false));
        allModules.add(new ModuleItem("Wallet & Billing",      "/workspace/wallet",             "Admin",      "Recharge clinical credits & print statements",       android.R.drawable.ic_menu_gallery,      false));
        allModules.add(new ModuleItem("Help & Support",        "/workspace/support",            "Admin",      "Submit tickets & read user guides",                 android.R.drawable.ic_menu_info_details, false));
        allModules.add(new ModuleItem("Terms & Conditions",    "/legal",                        "Legal",      "TestFlight Agreements & Software Licenses",         android.R.drawable.ic_menu_info_details, false));
    }

    private void renderModules() {
        if (containerOverview == null) return;
        containerOverview.removeAllViews();
        containerClinical.removeAllViews();
        containerLogistics.removeAllViews();
        containerMachine.removeAllViews();
        containerB2B.removeAllViews();
        containerAdmin.removeAllViews();
        containerLegal.removeAllViews();

        // Sort by usage count (most used first)
        List<ModuleItem> sorted = new ArrayList<>(allModules);
        Collections.sort(sorted, (a, b) ->
                Integer.compare(prefs.getInt("usage_" + b.path, 0),
                                prefs.getInt("usage_" + a.path, 0)));

        LayoutInflater inflater = LayoutInflater.from(this);
        int overviewCount = 0, clinicalCount = 0, logisticsCount = 0, machineCount = 0, b2bCount = 0, adminCount = 0, legalCount = 0;

        for (ModuleItem item : sorted) {
            View row = inflater.inflate(R.layout.layout_setting_item, null);
            ((ImageView) row.findViewById(R.id.ivItemIcon)).setImageResource(item.iconRes);
            ((TextView)  row.findViewById(R.id.tvItemTitle)).setText(item.title);
            ((TextView)  row.findViewById(R.id.tvItemDesc)).setText(item.desc);

            boolean opened = prefs.getBoolean("opened_" + item.path, false);
            View badge = row.findViewById(R.id.tvNewBadge);
            if (badge != null) badge.setVisibility(item.isNew && !opened ? View.VISIBLE : View.GONE);

            row.setOnClickListener(v -> {
                prefs.edit()
                        .putInt("usage_" + item.path, prefs.getInt("usage_" + item.path, 0) + 1)
                        .putBoolean("opened_" + item.path, true)
                        .apply();

                if (moreBottomSheetDialog != null) {
                    moreBottomSheetDialog.dismiss();
                }

                if (item.path.equals("/legal")) {
                    startActivity(new Intent(MainActivity.this, LegalActivity.class));
                    return;
                }

                currentPath = null;  // force reload
                navigate(item.path);
                
                // Temporarily disable listener to prevent programmatic tab switch from redirecting back to dashboard
                bottomNavigation.setOnItemSelectedListener(null);
                bottomNavigation.setSelectedItemId(R.id.nav_dashboard);
                setupBottomNavigation();
            });

            switch (item.category) {
                case "Overview":
                    containerOverview.addView(row);
                    overviewCount++;
                    break;
                case "Clinical":
                    containerClinical.addView(row);
                    clinicalCount++;
                    break;
                case "Logistics":
                    containerLogistics.addView(row);
                    logisticsCount++;
                    break;
                case "Machine":
                    containerMachine.addView(row);
                    machineCount++;
                    break;
                case "B2B":
                    containerB2B.addView(row);
                    b2bCount++;
                    break;
                case "Admin":
                    containerAdmin.addView(row);
                    adminCount++;
                    break;
                case "Legal":
                    containerLegal.addView(row);
                    legalCount++;
                    break;
            }
        }

        lblOverviewHeader.setVisibility(overviewCount > 0 ? View.VISIBLE : View.GONE);
        containerOverview.setVisibility(overviewCount > 0 ? View.VISIBLE : View.GONE);

        lblClinicalHeader.setVisibility(clinicalCount > 0 ? View.VISIBLE : View.GONE);
        containerClinical.setVisibility(clinicalCount > 0 ? View.VISIBLE : View.GONE);

        lblLogisticsHeader.setVisibility(logisticsCount > 0 ? View.VISIBLE : View.GONE);
        containerLogistics.setVisibility(logisticsCount > 0 ? View.VISIBLE : View.GONE);

        lblMachineHeader.setVisibility(machineCount > 0 ? View.VISIBLE : View.GONE);
        containerMachine.setVisibility(machineCount > 0 ? View.VISIBLE : View.GONE);

        lblB2BHeader.setVisibility(b2bCount > 0 ? View.VISIBLE : View.GONE);
        containerB2B.setVisibility(b2bCount > 0 ? View.VISIBLE : View.GONE);

        lblAdminHeader.setVisibility(adminCount > 0 ? View.VISIBLE : View.GONE);
        containerAdmin.setVisibility(adminCount > 0 ? View.VISIBLE : View.GONE);

        lblLegalHeader.setVisibility(legalCount > 0 ? View.VISIBLE : View.GONE);
        containerLegal.setVisibility(legalCount > 0 ? View.VISIBLE : View.GONE);
    }

    // ── Logout ──────────────────────────────────────────────────────────────────

    private void confirmLogout() {
        new AlertDialog.Builder(this)
                .setTitle("Sign Out")
                .setMessage("Are you sure you want to sign out?")
                .setPositiveButton("Sign Out", (d, w) -> {
                    AuthManager.clearSession(this);
                    startActivity(new Intent(this, LoginActivity.class));
                    finish();
                })
                .setNegativeButton("Cancel", null)
                .show();
    }

    // ── System callbacks ────────────────────────────────────────────────────────

    @Override
    public void onBackPressed() {
        if (moreBottomSheetDialog != null && moreBottomSheetDialog.isShowing()) {
            moreBottomSheetDialog.dismiss();
        } else if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        progressHandler.removeCallbacks(progressRunnable);
        if (moreBottomSheetDialog != null) {
            if (moreBottomSheetDialog.isShowing()) {
                moreBottomSheetDialog.dismiss();
            }
            moreBottomSheetDialog = null;
        }
        webView = null;
        swipeRefresh = null;
        bottomNavigation = null;
        moreScrollView = null;
        containerOverview = null;
        containerClinical = null;
        containerLogistics = null;
        containerMachine = null;
        containerB2B = null;
        containerAdmin = null;
        lblOverviewHeader = null;
        lblClinicalHeader = null;
        lblLogisticsHeader = null;
        lblMachineHeader = null;
        lblB2BHeader = null;
        lblAdminHeader = null;
        lblLegalHeader = null;
        containerLegal = null;
        offlineOverlay = null;
    }

    // ── Data class ──────────────────────────────────────────────────────────────

    private static class ModuleItem {
        final String title, path, category, desc;
        final int iconRes;
        final boolean isNew;
        ModuleItem(String t, String p, String c, String d, int icon, boolean n) {
            title = t; path = p; category = c; desc = d; iconRes = icon; isNew = n;
        }
    }

    private String getHeaderTitle(String path) {
        if (path.contains("analytics")) return "Analytics";
        if (path.contains("patients")) return "Patients";
        if (path.contains("test-management")) return "Categories";
        if (path.contains("bookings")) return "Online Booking";
        if (path.contains("registration")) return "Registration";
        if (path.contains("results")) return "Worklist & Results";
        if (path.contains("reports")) return "Report Dispatch";
        if (path.contains("inventory")) return "Inventory & Stock";
        if (path.contains("logistics")) return "Logistics & Trips";
        if (path.contains("analyzers")) return "Analyzer";
        if (path.contains("support")) return "Help & Support";
        if (path.contains("billing")) return "Invoices & Payments";
        if (path.contains("expenses")) return "Expenses";
        if (path.contains("settings")) return "Lab Settings";
        if (path.contains("audit-logs")) return "Audit Logs";
        if (path.contains("wallet")) return "Wallet & Billing";
        return "Workspace";
    }
}