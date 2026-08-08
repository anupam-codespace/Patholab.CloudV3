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
    
    // Header & Wallet Views
    private TextView lblHeaderTitle;
    private View btnHeaderMenu;
    private View walletCard;
    private TextView txtWalletBalance;
    private TextView txtWalletStatus;
    
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

    // Polling handler for wallet details
    private final Handler walletHandler = new Handler(Looper.getMainLooper());
    private final Runnable walletRunnable = new Runnable() {
        @Override
        public void run() {
            fetchWalletDetails();
            walletHandler.postDelayed(this, 15000); // poll every 15s
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

        // 8. Start wallet details polling
        walletHandler.post(walletRunnable);
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
        s.setUserAgentString(s.getUserAgentString() + " CapacitorApp");
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

        // Header view binding
        lblHeaderTitle = findViewById(R.id.lblHeaderTitle);
        btnHeaderMenu = findViewById(R.id.btnHeaderMenu);
        if (btnHeaderMenu != null) {
            btnHeaderMenu.setOnClickListener(v -> showMorePanel());
        }

        View btnNotification = findViewById(R.id.btnHeaderNotification);
        if (btnNotification != null) {
            btnNotification.setOnClickListener(v -> navigate("/workspace/support"));
        }
        View btnTheme = findViewById(R.id.btnHeaderTheme);
        if (btnTheme != null) {
            btnTheme.setOnClickListener(v -> {
                // Trigger client side web theme switch via JS
                if (webView != null) {
                    webView.evaluateJavascript("document.querySelector('.mobile-app-header-web-component button[aria-label=\"Toggle dark mode\"]')?.click()", null);
                }
            });
        }
        View btnSupport = findViewById(R.id.btnHeaderSupport);
        if (btnSupport != null) {
            btnSupport.setOnClickListener(v -> navigate("/workspace/support"));
        }

        // Wallet view binding
        walletCard = findViewById(R.id.walletCard);
        txtWalletBalance = findViewById(R.id.txtWalletBalance);
        txtWalletStatus = findViewById(R.id.txtWalletStatus);
        if (walletCard != null) {
            walletCard.setOnClickListener(v -> navigate("/workspace/wallet"));
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
                return false;
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
        fetchWalletDetails();
    }

    // ── Wallet Details Fetch ────────────────────────────────────────────────────

    private void fetchWalletDetails() {
        final String token = AuthManager.getToken(this);
        if (token == null || token.isEmpty()) {
            runOnUiThread(() -> {
                if (walletCard != null) walletCard.setVisibility(View.GONE);
            });
            return;
        }

        new Thread(() -> {
            try {
                java.net.HttpURLConnection conn = null;
                try {
                    java.net.URL url = new java.net.URL("https://app.patholab.cloud/api/workspace/wallet/details");
                    conn = (java.net.HttpURLConnection) url.openConnection();
                    conn.setRequestMethod("GET");
                    conn.setRequestProperty("Accept", "application/json");
                    conn.setRequestProperty("Cookie", "token=" + token);
                    conn.setConnectTimeout(8000);
                    conn.setReadTimeout(8000);

                    int code = conn.getResponseCode();
                    if (code >= 200 && code < 300) {
                        java.io.InputStream stream = conn.getInputStream();
                        java.io.BufferedReader reader = new java.io.BufferedReader(new java.io.InputStreamReader(stream, "UTF-8"));
                        StringBuilder sb = new StringBuilder();
                        String line;
                        while ((line = reader.readLine()) != null) {
                            sb.append(line);
                        }
                        reader.close();

                        org.json.JSONObject response = new org.json.JSONObject(sb.toString());
                        org.json.JSONObject walletObj = response.optJSONObject("wallet");
                        if (walletObj != null) {
                            final double balance = walletObj.optDouble("balance", 0.0);
                            final String role = response.optString("role", "");
                            final boolean isOwner = "LAB_OWNER".equals(role) || "ADMIN".equals(role) || role.isEmpty();
                            runOnUiThread(() -> updateWalletCard(balance, isOwner));
                        }
                    } else {
                        runOnUiThread(() -> {
                            if (walletCard != null) walletCard.setVisibility(View.GONE);
                        });
                    }
                } finally {
                    if (conn != null) conn.disconnect();
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
        }).start();
    }

    private void updateWalletCard(double balance, boolean isOwner) {
        if (walletCard == null) return;
        if (!isOwner) {
            walletCard.setVisibility(View.GONE);
            return;
        }

        walletCard.setVisibility(View.VISIBLE);
        if (txtWalletBalance != null) {
            txtWalletBalance.setText(String.format("₹%.2f", balance));
        }
        if (txtWalletStatus != null) {
            if (balance <= 0) {
                txtWalletStatus.setText("ZERO BALANCE ( RECHARGE REQUIRED )");
                walletCard.setBackgroundResource(R.drawable.bg_wallet_card_red);
            } else if (balance < 500) {
                txtWalletStatus.setText("LOW BALANCE ( ADD FUNDS )");
                walletCard.setBackgroundResource(R.drawable.bg_wallet_card_orange);
            } else {
                txtWalletStatus.setText("ACTIVE & FUNDED");
                walletCard.setBackgroundResource(R.drawable.bg_wallet_card);
            }
        }
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

        // Referral & B2B
        allModules.add(new ModuleItem("Doctor Directory",      "/workspace/doctors",            "B2B",        "Track referring doctors & commission profiles",     android.R.drawable.ic_menu_myplaces,     false));
        allModules.add(new ModuleItem("B2B Clients Tiers",     "/workspace/settings/b2b-tiers", "B2B",        "Manage outsourced labs & tier pricings",            android.R.drawable.ic_menu_myplaces,     true));

        // Administration
        allModules.add(new ModuleItem("Billing & Invoices",    "/workspace/billing",            "Admin",      "Track overall lab cash flow & pending bills",       android.R.drawable.ic_menu_view,         false));
        allModules.add(new ModuleItem("Staff Directory",       "/workspace/staff",              "Admin",      "Manage team roles, access keys & logs",             android.R.drawable.ic_menu_view,         false));
        allModules.add(new ModuleItem("Lab settings",          "/workspace/settings",           "Admin",      "Configure letterhead, templates & formats",         android.R.drawable.ic_menu_view,         false));
        allModules.add(new ModuleItem("Audit Logs",            "/workspace/audit-logs",          "Admin",      "View security access logs & trace modifications",   android.R.drawable.ic_menu_view,         false));

        // Legal & Agreements
        allModules.add(new ModuleItem("Terms & Conditions",    "/legal",                        "Legal",      "Read Google Play Beta Testing agreements",         android.R.drawable.ic_menu_info_details, false));
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

        int overviewCount = 0, clinicalCount = 0, logisticsCount = 0;
        int machineCount = 0, b2bCount = 0, adminCount = 0, legalCount = 0;

        for (final ModuleItem item : allModules) {
            View row = LayoutInflater.from(this).inflate(R.layout.layout_setting_item, null);
            
            TextView tvTitle = row.findViewById(R.id.tvItemTitle);
            TextView tvDesc = row.findViewById(R.id.tvItemDesc);
            ImageView ivIcon = row.findViewById(R.id.ivItemIcon);
            View badge = row.findViewById(R.id.tvNewBadge);

            tvTitle.setText(item.title);
            tvDesc.setText(item.desc);
            ivIcon.setImageResource(item.iconRes);
            
            boolean hasOpened = prefs.getBoolean("opened_" + item.path, false);
            badge.setVisibility((item.isNew && !hasOpened) ? View.VISIBLE : View.GONE);

            row.setOnClickListener(v -> {
                prefs.edit().putBoolean("opened_" + item.path, true).apply();
                badge.setVisibility(View.GONE);
                
                if (moreBottomSheetDialog != null) {
                    moreBottomSheetDialog.dismiss();
                }

                if (item.path.equals("/legal")) {
                    Intent intent = new Intent(MainActivity.this, LegalActivity.class);
                    startActivity(intent);
                } else {
                    navigate(item.path);
                }
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
        lblClinicalHeader.setVisibility(clinicalCount > 0 ? View.VISIBLE : View.GONE);
        lblLogisticsHeader.setVisibility(logisticsCount > 0 ? View.VISIBLE : View.GONE);
        lblMachineHeader.setVisibility(machineCount > 0 ? View.VISIBLE : View.GONE);
        lblB2BHeader.setVisibility(b2bCount > 0 ? View.VISIBLE : View.GONE);
        lblAdminHeader.setVisibility(adminCount > 0 ? View.VISIBLE : View.GONE);
        lblLegalHeader.setVisibility(legalCount > 0 ? View.VISIBLE : View.GONE);
    }

    private void confirmLogout() {
        new AlertDialog.Builder(this)
            .setTitle("Sign Out")
            .setMessage("Are you sure you want to sign out of your account?")
            .setPositiveButton("Sign Out", (dialog, which) -> {
                AuthManager.clearToken(MainActivity.this);
                Intent intent = new Intent(MainActivity.this, LoginActivity.class);
                intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
                startActivity(intent);
                finish();
            })
            .setNegativeButton("Cancel", null)
            .show();
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        progressHandler.removeCallbacks(progressRunnable);
        walletHandler.removeCallbacks(walletRunnable);
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
        if (path.contains("analytics")) return "FINANCIAL ANALYTICS";
        if (path.contains("patients")) return "PATIENT WORKLIST";
        if (path.contains("test-management")) return "CATEGORIES";
        if (path.contains("bookings")) return "ONLINE BOOKINGS";
        if (path.contains("registration")) return "REGISTRATION";
        if (path.contains("results")) return "WORKLIST & RESULTS";
        if (path.contains("reports")) return "REPORT DISPATCH";
        if (path.contains("inventory")) return "INVENTORY & STOCK";
        if (path.contains("logistics")) return "LOGISTICS & TRIPS";
        if (path.contains("analyzers")) return "ANALYZER";
        if (path.contains("support")) return "HELP & SUPPORT";
        if (path.contains("billing")) return "INVOICES & PAYMENTS";
        if (path.contains("expenses")) return "EXPENSES";
        if (path.contains("settings")) return "LAB SETTINGS";
        if (path.contains("audit-logs")) return "AUDIT LOGS";
        if (path.contains("wallet")) return "WALLET & BILLING";
        return "DASHBOARD";
    }
}