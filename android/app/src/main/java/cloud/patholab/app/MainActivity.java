package cloud.patholab.app;

import android.annotation.SuppressLint;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.view.LayoutInflater;
import android.view.View;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.ScrollView;
import android.widget.TextView;
import androidx.appcompat.app.AlertDialog;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;
import com.google.android.material.bottomnavigation.BottomNavigationView;
import com.google.android.material.floatingactionbutton.FloatingActionButton;
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
    private BottomNavigationView bottomNavigation;
    private View offlineOverlay;
    private ScrollView moreScrollView;
    private View topLayoutContainer;
    private FloatingActionButton fabNewRegistration;
    
    // Header & Wallet Views
    private TextView lblHeaderTitle;
    private View btnHeaderMenu;
    private View walletCard;
    private TextView txtWalletBalance;
    private TextView txtWalletStatus;
    
    // Category containers matching web app groups
    private LinearLayout containerOverview, containerClinical, containerLogistics;
    private LinearLayout containerMachine, containerB2B, containerAdmin, containerLegal;
    private LinearLayout containerRadiology;
    private TextView lblOverviewHeader, lblClinicalHeader, lblLogisticsHeader;
    private TextView lblMachineHeader, lblB2BHeader, lblAdminHeader, lblLegalHeader;
    private TextView lblRadiologyHeader;
    // ── State ─────────────────────────────────────────────────────────────────
    private static final String BASE_URL = "https://app.patholab.cloud";
    private String currentPath = null;
    private SharedPreferences prefs;
    private List<ModuleItem> allModules;
    private com.google.android.material.bottomsheet.BottomSheetDialog moreBottomSheetDialog;
    private int previousTab = R.id.nav_dashboard;
    private boolean isDarkMode = false;
    private String activeSkeletonCategory = "";

    private FrameLayout skeletonContainer;
    private android.animation.ObjectAnimator pulseAnimator;
    private final Handler progressPollHandler = new Handler(Looper.getMainLooper());
    private final Runnable progressPollRunnable = new Runnable() {
        @Override
        public void run() {
            if (webView != null) {
                int progress = webView.getProgress();
                if (progress < 100) {
                    if (skeletonContainer != null && skeletonContainer.getVisibility() != View.VISIBLE) {
                        String url = webView.getUrl();
                        showSkeletonForPath(url);
                    }
                } else {
                    // Inject JS helper to verify page-level React-Query / Next.js data fetching state
                    webView.evaluateJavascript(
                        "(function() {" +
                        "  if (document.readyState !== 'complete') return true;" +
                        "  var spinners = document.querySelectorAll('.animate-spin');" +
                        "  for (var i = 0; i < spinners.length; i++) {" +
                        "    var r = spinners[i].getBoundingClientRect();" +
                        "    if (r.width >= 28 && r.height >= 28 && r.top > 0) return true;" +
                        "  }" +
                        "  return false;" +
                        "})()",
                        value -> {
                            boolean isWebLoading = "true".equals(value);
                            runOnUiThread(() -> {
                                if (isWebLoading) {
                                    if (skeletonContainer != null && skeletonContainer.getVisibility() != View.VISIBLE) {
                                        String url = webView.getUrl();
                                        showSkeletonForPath(url);
                                    }
                                } else {
                                    if (skeletonContainer != null && skeletonContainer.getVisibility() == View.VISIBLE) {
                                        hideSkeleton();
                                    }
                                }
                            });
                        }
                    );
                }
            }
            progressPollHandler.postDelayed(this, 100);
        }
    };

    // Polling handler for wallet details
    private final Handler walletHandler = new Handler(Looper.getMainLooper());
    private final Runnable walletRunnable = new Runnable() {
        @Override
        public void run() {
            fetchWalletDetails();
            fetchNotificationCount();
            walletHandler.postDelayed(this, 15000); // poll every 15s
        }
    };

    // Polling handler for auth status redirect check (safeguard for token expiry redirection)
    private final Handler authCheckHandler = new Handler(Looper.getMainLooper());
    private final Runnable authCheckRunnable = new Runnable() {
        @Override
        public void run() {
            checkAuthRedirect();
            if (webView != null) {
                webView.evaluateJavascript("document.documentElement.classList.contains('dark')", value -> {
                    boolean isDark = "true".equals(value);
                    runOnUiThread(() -> applyNativeTheme(isDark));
                });
            }
            authCheckHandler.postDelayed(this, 1000); // poll every 1s
        }
    };

    private void checkAuthRedirect() {
        if (webView == null) return;
        
        webView.evaluateJavascript(
            "var style = document.getElementById('native-hide-header-style');" +
            "if(!style) {" +
            "  style = document.createElement('style');" +
            "  style.id = 'native-hide-header-style';" +
            "  style.innerHTML = '.mobile-app-header-web-component, header { display: none !important; } main, .is-native-app main, .is-capacitor main { padding-top: 0px !important; }';" +
            "  document.head.appendChild(style);" +
            "}", null
        );

        String url = webView.getUrl();
        if (url == null) return;
        
        if (url.contains("/login") || url.contains("/register") || url.contains("/forgot-password") || url.contains("/verify") || url.contains("/reset-password")) {
            authCheckHandler.removeCallbacks(authCheckRunnable);
            walletHandler.removeCallbacks(walletRunnable);
            
            AuthManager.clearSession(this);
            Intent intent = new Intent(this, LoginActivity.class);
            intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
            startActivity(intent);
            finish();
        }
    }

    private void applyNativeTheme(boolean isDark) {
        if (isDarkMode == isDark) return;
        isDarkMode = isDark;

        // Parent root layout
        View mainParentLayout = findViewById(R.id.mainParentLayout);
        if (mainParentLayout != null) {
            mainParentLayout.setBackgroundColor(isDark ? android.graphics.Color.parseColor("#0F172A") : android.graphics.Color.parseColor("#F8FAFC"));
        }

        // Header containers
        View topLayoutContainer = findViewById(R.id.topLayoutContainer);
        if (topLayoutContainer != null) {
            topLayoutContainer.setBackgroundColor(isDark ? android.graphics.Color.parseColor("#1E293B") : android.graphics.Color.parseColor("#FFFFFF"));
        }
        View topHeaderBar = findViewById(R.id.topHeaderBar);
        if (topHeaderBar != null) {
            topHeaderBar.setBackgroundColor(isDark ? android.graphics.Color.parseColor("#1E293B") : android.graphics.Color.parseColor("#FFFFFF"));
        }

        // Header Dividers
        View headerDivider = findViewById(R.id.headerDivider);
        if (headerDivider != null) {
            headerDivider.setBackgroundColor(isDark ? android.graphics.Color.parseColor("#334155") : android.graphics.Color.parseColor("#F1F5F9"));
        }
        View dividerLineTop = findViewById(R.id.dividerLineTop);
        if (dividerLineTop != null) {
            dividerLineTop.setBackgroundColor(isDark ? android.graphics.Color.parseColor("#334155") : android.graphics.Color.parseColor("#F1F5F9"));
        }

        // Title Texts
        TextView lblHeaderTitle = findViewById(R.id.lblHeaderTitle);
        if (lblHeaderTitle != null) {
            lblHeaderTitle.setTextColor(isDark ? android.graphics.Color.parseColor("#FFFFFF") : android.graphics.Color.parseColor("#0F172A"));
        }
        TextView lblHeaderSubtitle = findViewById(R.id.lblHeaderSubtitle);
        if (lblHeaderSubtitle != null) {
            lblHeaderSubtitle.setTextColor(isDark ? android.graphics.Color.parseColor("#94A3B8") : android.graphics.Color.parseColor("#94A3B8"));
        }

        // Native Buttons Bg Tint and Text / Icon tint
        int btnBgColor = isDark ? android.graphics.Color.parseColor("#334155") : android.graphics.Color.parseColor("#F1F5F9");
        int btnIconColor = isDark ? android.graphics.Color.parseColor("#E2E8F0") : android.graphics.Color.parseColor("#475569");

        View btnMenu = findViewById(R.id.btnHeaderMenu);
        if (btnMenu != null) {
            btnMenu.setBackgroundTintList(android.content.res.ColorStateList.valueOf(btnBgColor));
            TextView txtMenu = findViewById(R.id.txtHeaderMenu);
            if (txtMenu != null) {
                txtMenu.setTextColor(btnIconColor);
            }
        }

        android.view.ViewGroup btnNotification = findViewById(R.id.btnHeaderNotification);
        if (btnNotification != null) {
            btnNotification.setBackgroundTintList(android.content.res.ColorStateList.valueOf(btnBgColor));
            tintImageViewsInViewGroup(btnNotification, btnIconColor);
        }

        android.view.ViewGroup btnTheme = findViewById(R.id.btnHeaderTheme);
        if (btnTheme != null) {
            btnTheme.setBackgroundTintList(android.content.res.ColorStateList.valueOf(btnBgColor));
            tintImageViewsInViewGroup(btnTheme, btnIconColor);
        }

        android.view.ViewGroup btnSupport = findViewById(R.id.btnHeaderSupport);
        if (btnSupport != null) {
            btnSupport.setBackgroundTintList(android.content.res.ColorStateList.valueOf(btnBgColor));
            tintImageViewsInViewGroup(btnSupport, btnIconColor);
        }

        // Bottom Navigation Bar
        if (bottomNavigation != null) {
            bottomNavigation.setBackgroundColor(isDark ? android.graphics.Color.parseColor("#0F172A") : android.graphics.Color.parseColor("#FFFFFF"));
            int[][] states = new int[][] {
                new int[] { android.R.attr.state_checked }, // checked
                new int[] { -android.R.attr.state_checked } // unchecked
            };
            int[] colors = new int[] {
                android.graphics.Color.parseColor("#4338CA"), // active
                isDark ? android.graphics.Color.parseColor("#94A3B8") : android.graphics.Color.parseColor("#475569") // inactive
            };
            android.content.res.ColorStateList colorStateList = new android.content.res.ColorStateList(states, colors);
            bottomNavigation.setItemIconTintList(colorStateList);
            bottomNavigation.setItemTextColor(colorStateList);
        }
    }

    private void tintImageViewsInViewGroup(android.view.ViewGroup viewGroup, int color) {
        for (int i = 0; i < viewGroup.getChildCount(); i++) {
            View child = viewGroup.getChildAt(i);
            if (child instanceof ImageView) {
                ((ImageView) child).setColorFilter(color);
            } else if (child instanceof android.view.ViewGroup) {
                tintImageViewsInViewGroup((android.view.ViewGroup) child, color);
            }
        }
    }

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
        authCheckHandler.post(authCheckRunnable);
        progressPollHandler.post(progressPollRunnable);
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

        bottomNavigation  = findViewById(R.id.bottomNavigation);
        offlineOverlay    = findViewById(R.id.offlineOverlay);
        skeletonContainer = findViewById(R.id.skeletonContainer);
        topLayoutContainer = findViewById(R.id.topLayoutContainer);

        // Adjust top container padding dynamically for system status bar / notch height
        if (topLayoutContainer != null) {
            androidx.core.view.ViewCompat.setOnApplyWindowInsetsListener(topLayoutContainer, (v, insets) -> {
                androidx.core.graphics.Insets systemBars = insets.getInsets(androidx.core.view.WindowInsetsCompat.Type.systemBars());
                v.setPadding(0, systemBars.top, 0, 0);
                return insets;
            });
        }

        // Adjust bottom navigation padding dynamically for system gesture navigation bar height
        if (bottomNavigation != null) {
            androidx.core.view.ViewCompat.setOnApplyWindowInsetsListener(bottomNavigation, (v, insets) -> {
                androidx.core.graphics.Insets systemBars = insets.getInsets(androidx.core.view.WindowInsetsCompat.Type.systemBars());
                v.setPadding(0, 0, 0, systemBars.bottom);
                return insets;
            });
        }
        
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

        // FAB — New Registration (visible only on /patients page)
        fabNewRegistration = findViewById(R.id.fabNewRegistration);
        if (fabNewRegistration != null) {
            fabNewRegistration.setOnClickListener(v -> {
                currentPath = null; // force navigation even if already on sub-path
                loadUrl("/workspace/registration");
                // Update bottom nav to Patients tab
                if (bottomNavigation != null) {
                    bottomNavigation.setSelectedItemId(R.id.nav_patients);
                }
            });
        }

        // Pull-to-refresh
        swipeRefresh.setOnRefreshListener(() -> {
            swipeRefresh.setRefreshing(false);
            if (webView != null) {
                webView.reload();
            }
        });

        // Header view binding
        lblHeaderTitle = findViewById(R.id.lblHeaderTitle);
        btnHeaderMenu = findViewById(R.id.btnHeaderMenu);
        if (btnHeaderMenu != null) {
            btnHeaderMenu.setOnClickListener(v -> showMorePanel());
        }

        View btnNotification = findViewById(R.id.btnHeaderNotification);
        if (btnNotification != null) {
            btnNotification.setOnClickListener(v -> showNotificationsPanel());
        }
        View btnTheme = findViewById(R.id.btnHeaderTheme);
        if (btnTheme != null) {
            btnTheme.setOnClickListener(v -> {
                if (webView != null) {
                    // Try native web theme toggle, then fallback to localStorage approach
                    webView.evaluateJavascript(
                        "(function() {" +
                        "  var btn = document.querySelector('[aria-label=\"Toggle dark mode\"]');" +
                        "  if (btn) { btn.click(); return; }" +
                        "  var html = document.documentElement;" +
                        "  html.classList.toggle('dark');" +
                        "  var theme = html.classList.contains('dark') ? 'dark' : 'light';" +
                        "  localStorage.setItem('theme', theme);" +
                        "})()", null);
                }
            });
        }
        View btnSupport = findViewById(R.id.btnHeaderSupport);
        if (btnSupport != null) {
            btnSupport.setOnClickListener(v -> {
                showHelpPanel();
            });
        }

        // Wallet view binding
        walletCard = findViewById(R.id.walletCard);
        txtWalletBalance = findViewById(R.id.txtWalletBalance);
        txtWalletStatus = findViewById(R.id.txtWalletStatus);
        if (walletCard != null) {
            walletCard.setOnClickListener(v -> navigate("/workspace/wallet"));
            View topUpBtn = findViewById(R.id.btnWalletTopUp);
            if (topUpBtn != null) {
                android.view.animation.AlphaAnimation anim = new android.view.animation.AlphaAnimation(0.7f, 1.0f);
                anim.setDuration(1200);
                anim.setRepeatMode(android.view.animation.Animation.REVERSE);
                anim.setRepeatCount(android.view.animation.Animation.INFINITE);
                topUpBtn.startAnimation(anim);
            }
        }

        swipeRefresh.setColorSchemeColors(0xFF3730A3);
    }

    private void setupBottomNavigation() {
        bottomNavigation.setOnItemSelectedListener(item -> {
            int id = item.getItemId();
            if (id != R.id.nav_more) {
                previousTab = id;
            }

            // Subtle selection scale pop animation for premium micro-feedback
            View itemView = bottomNavigation.findViewById(id);
            if (itemView != null) {
                itemView.animate()
                    .scaleX(1.1f)
                    .scaleY(1.1f)
                    .setDuration(120)
                    .withEndAction(() -> itemView.animate().scaleX(1.0f).scaleY(1.0f).setDuration(120).start())
                    .start();
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
        // Always recreate the panel so new modules from web are reflected each time
        if (moreBottomSheetDialog != null && moreBottomSheetDialog.isShowing()) {
            moreBottomSheetDialog.dismiss();
        }
        moreBottomSheetDialog = null;
        if (moreBottomSheetDialog == null) {
            moreBottomSheetDialog = new com.google.android.material.bottomsheet.BottomSheetDialog(this);
            View sheetView = getLayoutInflater().inflate(R.layout.layout_more_sheet, null);
            moreBottomSheetDialog.setContentView(sheetView);

            final boolean isDark = this.isDarkMode;
            if (isDark) {
                sheetView.setBackgroundTintList(android.content.res.ColorStateList.valueOf(android.graphics.Color.parseColor("#0F172A")));
                
                TextView txtTitle = sheetView.findViewById(R.id.txtMoreTitle);
                if (txtTitle != null) {
                    txtTitle.setTextColor(android.graphics.Color.parseColor("#FFFFFF"));
                }
                
                TextView txtSubtitle = sheetView.findViewById(R.id.txtMoreSubtitle);
                if (txtSubtitle != null) {
                    txtSubtitle.setTextColor(android.graphics.Color.parseColor("#94A3B8"));
                }
                
                View divider = sheetView.findViewById(R.id.moreDivider);
                if (divider != null) {
                    divider.setBackgroundColor(android.graphics.Color.parseColor("#334155"));
                }
            }

            // Bind views inside sheet view
            moreScrollView    = sheetView.findViewById(R.id.moreSettingsScrollView);
            containerOverview    = sheetView.findViewById(R.id.containerOverview);
            containerClinical    = sheetView.findViewById(R.id.containerClinical);
            containerRadiology   = sheetView.findViewById(R.id.containerRadiology);
            containerLogistics   = sheetView.findViewById(R.id.containerLogistics);
            containerMachine     = sheetView.findViewById(R.id.containerMachine);
            containerB2B         = sheetView.findViewById(R.id.containerB2B);
            containerAdmin       = sheetView.findViewById(R.id.containerAdmin);
            containerLegal       = sheetView.findViewById(R.id.containerLegal);

            lblOverviewHeader    = sheetView.findViewById(R.id.lblOverviewHeader);
            lblClinicalHeader    = sheetView.findViewById(R.id.lblClinicalHeader);
            lblRadiologyHeader   = sheetView.findViewById(R.id.lblRadiologyHeader);
            lblLogisticsHeader   = sheetView.findViewById(R.id.lblLogisticsHeader);
            lblMachineHeader     = sheetView.findViewById(R.id.lblMachineHeader);
            lblB2BHeader         = sheetView.findViewById(R.id.lblB2BHeader);
            lblAdminHeader       = sheetView.findViewById(R.id.lblAdminHeader);
            lblLegalHeader       = sheetView.findViewById(R.id.lblLegalHeader);

            // Logout inside bottom sheet
            android.widget.Button btnLogout = sheetView.findViewById(R.id.btnMoreLogout);
            if (btnLogout != null) {
                btnLogout.setOnClickListener(v -> {
                    moreBottomSheetDialog.dismiss();
                    confirmLogout();
                });
                int redColor = isDark ? android.graphics.Color.parseColor("#EF4444") : android.graphics.Color.parseColor("#DC2626");
                btnLogout.setBackgroundTintList(android.content.res.ColorStateList.valueOf(redColor));
                btnLogout.setTypeface(android.graphics.Typeface.defaultFromStyle(android.graphics.Typeface.BOLD));
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

    private void showNotificationsPanel() {
        final com.google.android.material.bottomsheet.BottomSheetDialog dialog =
            new com.google.android.material.bottomsheet.BottomSheetDialog(this);
        View sheetView = getLayoutInflater().inflate(R.layout.layout_notifications_sheet, null);
        dialog.setContentView(sheetView);

        final ProgressBar spinner = sheetView.findViewById(R.id.progressSpinner);
        final View lblNoNotifications = sheetView.findViewById(R.id.lblNoNotifications);
        final View scrollNotifications = sheetView.findViewById(R.id.scrollNotifications);
        final LinearLayout stackNotifications = sheetView.findViewById(R.id.stackNotifications);
        final View btnMarkAllRead = sheetView.findViewById(R.id.btnMarkAllRead);

        // Theme the sheet natively based on current app theme
        final boolean isDark = this.isDarkMode;
        if (isDark) {
            sheetView.setBackgroundTintList(android.content.res.ColorStateList.valueOf(android.graphics.Color.parseColor("#0F172A")));
            
            TextView txtTitle = sheetView.findViewById(R.id.txtNotificationsTitle);
            if (txtTitle != null) {
                txtTitle.setTextColor(android.graphics.Color.parseColor("#FFFFFF"));
            }
            
            View divider = sheetView.findViewById(R.id.notificationsDivider);
            if (divider != null) {
                divider.setBackgroundColor(android.graphics.Color.parseColor("#334155"));
            }
            
            ImageView imgEmpty = sheetView.findViewById(R.id.imgNotificationsEmpty);
            if (imgEmpty != null) {
                imgEmpty.setColorFilter(android.graphics.Color.parseColor("#334155"));
            }
            
            TextView txtEmptyTitle = sheetView.findViewById(R.id.txtNotificationsEmptyTitle);
            if (txtEmptyTitle != null) {
                txtEmptyTitle.setTextColor(android.graphics.Color.parseColor("#FFFFFF"));
            }
            
            TextView txtEmptySubtitle = sheetView.findViewById(R.id.txtNotificationsEmptySubtitle);
            if (txtEmptySubtitle != null) {
                txtEmptySubtitle.setTextColor(android.graphics.Color.parseColor("#94A3B8"));
            }
        }

        // Cap bottom sheet at 80% screen height
        dialog.setOnShowListener(d -> {
            FrameLayout bottomSheet = dialog.findViewById(com.google.android.material.R.id.design_bottom_sheet);
            if (bottomSheet != null) {
                com.google.android.material.bottomsheet.BottomSheetBehavior<FrameLayout> behavior =
                    com.google.android.material.bottomsheet.BottomSheetBehavior.from(bottomSheet);
                int screenHeight = getResources().getDisplayMetrics().heightPixels;
                int targetHeight = (int) (screenHeight * 0.8);
                android.view.ViewGroup.LayoutParams lp = bottomSheet.getLayoutParams();
                lp.height = targetHeight;
                bottomSheet.setLayoutParams(lp);
                behavior.setPeekHeight(targetHeight);
                behavior.setState(com.google.android.material.bottomsheet.BottomSheetBehavior.STATE_EXPANDED);
            }
        });

        // Save the last seen time immediately (but keep previous value to check which ones are new)
        final long lastSeenTime = prefs != null ? prefs.getLong("last_seen_notification_time", 0L) : 0L;
        if (prefs != null) {
            prefs.edit().putLong("last_seen_notification_time", System.currentTimeMillis()).apply();
        }
        runOnUiThread(() -> {
            TextView badge = findViewById(R.id.txtNotificationBadge);
            if (badge != null) badge.setVisibility(View.GONE);
            stopBellAnimationLoop();
        });

        // Fetch REAL notifications from the server API in background
        new Thread(() -> {
            try {
                java.net.URL url = new java.net.URL(BASE_URL + "/api/notifications");
                java.net.HttpURLConnection conn = (java.net.HttpURLConnection) url.openConnection();
                conn.setRequestMethod("GET");
                conn.setRequestProperty("Accept", "application/json");
                // Forward the session cookie from the WebView cookie store
                String cookie = android.webkit.CookieManager.getInstance().getCookie(BASE_URL);
                if (cookie != null) conn.setRequestProperty("Cookie", cookie);
                conn.setConnectTimeout(10000);
                conn.setReadTimeout(10000);

                int code = conn.getResponseCode();
                StringBuilder sb = new StringBuilder();
                java.io.InputStream stream = (code >= 200 && code < 300) ? conn.getInputStream() : conn.getErrorStream();
                if (stream != null) {
                    java.io.BufferedReader reader = new java.io.BufferedReader(new java.io.InputStreamReader(stream, "UTF-8"));
                    String line;
                    while ((line = reader.readLine()) != null) sb.append(line);
                    reader.close();
                }
                conn.disconnect();

                final String responseBody = sb.toString();
                runOnUiThread(() -> {
                    if (spinner != null) spinner.setVisibility(View.GONE);
                    if (stackNotifications == null) return;
                    stackNotifications.removeAllViews();

                    try {
                        org.json.JSONObject root = new org.json.JSONObject(responseBody);
                        org.json.JSONArray arr = root.optJSONArray("notifications");
                        if (arr != null && arr.length() > 0) {
                            if (scrollNotifications != null) scrollNotifications.setVisibility(View.VISIBLE);
                            for (int i = 0; i < arr.length(); i++) {
                                org.json.JSONObject n = arr.getJSONObject(i);
                                String title = n.optString("title", "");
                                String body = n.optString("body", "");
                                String createdStr = n.optString("createdAt", "");
                                boolean isRead = true;
                                if (!createdStr.isEmpty()) {
                                    long createdTime = parseIsoDateTime(createdStr);
                                    if (createdTime > lastSeenTime) {
                                        isRead = false;
                                    }
                                }

                                LinearLayout row = new LinearLayout(MainActivity.this);
                                row.setOrientation(LinearLayout.VERTICAL);
                                row.setPadding(48, 28, 48, 28);
                                if (!isRead) {
                                    row.setBackgroundColor(isDark ? android.graphics.Color.parseColor("#1E3A8A") : 0xFFEFF6FF); // Blue-50/unread highlight
                                } else {
                                    row.setBackgroundColor(isDark ? android.graphics.Color.parseColor("#1E293B") : android.graphics.Color.parseColor("#FFFFFF"));
                                }

                                TextView tvTitle = new TextView(MainActivity.this);
                                tvTitle.setText(title);
                                tvTitle.setTextColor(isDark ? (isRead ? android.graphics.Color.parseColor("#E2E8F0") : android.graphics.Color.parseColor("#93C5FD")) : (isRead ? 0xFF475569 : 0xFF1E40AF));
                                tvTitle.setTextSize(13.5f);
                                if (!isRead) tvTitle.setTypeface(null, android.graphics.Typeface.BOLD);
                                row.addView(tvTitle);

                                if (!body.isEmpty()) {
                                    TextView tvBody = new TextView(MainActivity.this);
                                    tvBody.setText(body);
                                    tvBody.setTextColor(isDark ? android.graphics.Color.parseColor("#94A3B8") : 0xFF94A3B8);
                                    tvBody.setTextSize(11.5f);
                                    tvBody.setPadding(0, 4, 0, 0);
                                    row.addView(tvBody);
                                }

                                // Separator
                                View sep = new View(MainActivity.this);
                                sep.setBackgroundColor(isDark ? android.graphics.Color.parseColor("#334155") : 0xFFF1F5F9);
                                LinearLayout.LayoutParams sepLp = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, 1);
                                sep.setLayoutParams(sepLp);

                                stackNotifications.addView(row);
                                stackNotifications.addView(sep);
                            }
                        } else {
                            if (scrollNotifications != null) scrollNotifications.setVisibility(View.GONE);
                            if (lblNoNotifications != null) lblNoNotifications.setVisibility(View.VISIBLE);
                        }
                    } catch (Exception e) {
                        // Fallback: show no notifications
                        if (scrollNotifications != null) scrollNotifications.setVisibility(View.GONE);
                        if (lblNoNotifications != null) lblNoNotifications.setVisibility(View.VISIBLE);
                    }
                });
            } catch (Exception e) {
                runOnUiThread(() -> {
                    if (spinner != null) spinner.setVisibility(View.GONE);
                    if (scrollNotifications != null) scrollNotifications.setVisibility(View.GONE);
                    if (lblNoNotifications != null) lblNoNotifications.setVisibility(View.VISIBLE);
                });
            }
        }).start();

        if (btnMarkAllRead != null) {
            btnMarkAllRead.setOnClickListener(v -> {
                // Mark all read on server in background
                new Thread(() -> {
                    try {
                        java.net.URL url = new java.net.URL(BASE_URL + "/api/notifications/mark-read");
                        java.net.HttpURLConnection conn = (java.net.HttpURLConnection) url.openConnection();
                        conn.setRequestMethod("POST");
                        String cookie = android.webkit.CookieManager.getInstance().getCookie(BASE_URL);
                        if (cookie != null) conn.setRequestProperty("Cookie", cookie);
                        conn.getResponseCode();
                        conn.disconnect();
                    } catch (Exception ignored) {}
                }).start();

                if (stackNotifications != null) stackNotifications.removeAllViews();
                if (scrollNotifications != null) scrollNotifications.setVisibility(View.GONE);
                if (lblNoNotifications != null) lblNoNotifications.setVisibility(View.VISIBLE);

                // Instantly clear the badge and stop bell animation
                TextView badge = findViewById(R.id.txtNotificationBadge);
                if (badge != null) badge.setVisibility(View.GONE);
                stopBellAnimationLoop();
            });
        }

        dialog.show();
    }

    private void showLegalBottomSheet() {
        final com.google.android.material.bottomsheet.BottomSheetDialog dialog =
            new com.google.android.material.bottomsheet.BottomSheetDialog(this);
        View sheetView = getLayoutInflater().inflate(R.layout.layout_legal_sheet, null);
        dialog.setContentView(sheetView);

        final boolean isDark = this.isDarkMode;

        View container = sheetView.findViewById(R.id.legalSheetContainer);
        if (container != null) {
            container.setBackgroundResource(isDark ? R.drawable.bg_bottom_sheet_dark : R.drawable.bg_bottom_sheet);
        }

        TextView txtTitle = sheetView.findViewById(R.id.txtLegalTitle);
        if (txtTitle != null) {
            txtTitle.setTextColor(isDark ? android.graphics.Color.WHITE : android.graphics.Color.parseColor("#0F172A"));
        }

        View separator = sheetView.findViewById(R.id.legalSeparator);
        if (separator != null) {
            separator.setBackgroundColor(isDark ? android.graphics.Color.parseColor("#334155") : android.graphics.Color.parseColor("#F1F5F9"));
        }

        TextView txtContent = sheetView.findViewById(R.id.txtLegalContentSheet);
        if (txtContent != null) {
            txtContent.setTextColor(isDark ? android.graphics.Color.parseColor("#CBD5E1") : android.graphics.Color.parseColor("#334155"));
            String html = buildLegalHtml(isDark);
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.N) {
                txtContent.setText(android.text.Html.fromHtml(html, android.text.Html.FROM_HTML_MODE_LEGACY));
            } else {
                txtContent.setText(android.text.Html.fromHtml(html));
            }
        }

        TextView btnClose = sheetView.findViewById(R.id.btnLegalClose) instanceof TextView ? (TextView) sheetView.findViewById(R.id.btnLegalClose) : null;
        if (btnClose != null) {
            btnClose.setTextColor(isDark ? android.graphics.Color.parseColor("#818CF8") : android.graphics.Color.parseColor("#4338CA"));
            btnClose.setOnClickListener(v -> dialog.dismiss());
        }

        // Cap bottom sheet at 85% screen height
        dialog.setOnShowListener(d -> {
            FrameLayout bottomSheet = dialog.findViewById(com.google.android.material.R.id.design_bottom_sheet);
            if (bottomSheet != null) {
                com.google.android.material.bottomsheet.BottomSheetBehavior<FrameLayout> behavior =
                    com.google.android.material.bottomsheet.BottomSheetBehavior.from(bottomSheet);
                int screenHeight = getResources().getDisplayMetrics().heightPixels;
                int targetHeight = (int) (screenHeight * 0.85);
                android.view.ViewGroup.LayoutParams lp = bottomSheet.getLayoutParams();
                lp.height = targetHeight;
                bottomSheet.setLayoutParams(lp);
                behavior.setPeekHeight(targetHeight);
                behavior.setState(com.google.android.material.bottomsheet.BottomSheetBehavior.STATE_EXPANDED);
            }
        });

        dialog.show();
    }

    private String buildLegalHtml(boolean isDark) {
        String primaryColor = isDark ? "#818CF8" : "#4338CA";
        String secondaryColor = isDark ? "#E2E8F0" : "#1E293B";
        return
            "<b><font color=\"" + primaryColor + "\">(A) Google Play Beta Testing — Terms of Service</font></b><br/><br/>" +
            "<b><font color=\"" + secondaryColor + "\">Key Summary</font></b><br/><br/>" +
            "• Diagnostics, usage, and crash reports related to your use of each Beta App will automatically be collected by Google and the Application Provider.<br/><br/>" +
            "• You may submit feedback, suggestions, and feature ideas to the Application Provider of the Beta App.<br/><br/>" +
            "• Beta Apps are pre-release software and may crash, resulting in data loss.<br/><br/>" +
            "• If you already have the production version installed, the Beta version will replace it and may overwrite app data.<br/><br/>" +
            "• You can opt out of Beta testing at any time by leaving the program on Google Play and reinstalling the production version.<br/><br/>" +
            "Your use of the Google Play Beta Testing service, including downloading any pre-release or beta-stage applications for Android (\"Beta Apps\"), is governed by these terms. The standard Google Play Terms of Service for your region are incorporated by reference.<br/><br/>" +
            "<b><font color=\"" + secondaryColor + "\">Beta Tester Eligibility</font></b><br/><br/>" +
            "You must meet the age requirements for Google Play in your country. If you are under 18, review this Agreement with your parent or guardian.<br/><br/>" +
            "The Application Provider grants you a limited, non-exclusive, non-transferable, non-sublicensable license to access, download, and use the Beta App solely for testing and evaluation purposes.<br/><br/>" +
            "You acknowledge that Beta Apps are pre-release, unfinished software and may contain errors. You should not use them in critical operating environments or with highly valuable data. Back up your device prior to installing any Beta App. Google and the Application Provider shall not be liable for any data loss, device damage, or service interruptions caused by your use of Beta Apps.<br/><br/>" +
            "<b><font color=\"" + secondaryColor + "\">No Warranty</font></b><br/><br/>" +
            "YOU EXPRESSLY ACKNOWLEDGE AND AGREE THAT USE OF THE BETA APP IS AT YOUR SOLE RISK. TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, THE BETA APP IS PROVIDED \"AS IS\" AND \"AS AVAILABLE\", WITH ALL FAULTS AND WITHOUT WARRANTY OF ANY KIND.<br/><br/>" +
            "<b><font color=\"" + secondaryColor + "\">Termination</font></b><br/><br/>" +
            "To terminate participation, leave the beta program in Google Play. Google and/or the Application Provider reserve the right to terminate your participation at any time.<br/><br/>" +
            "────────────────────────────<br/><br/>" +
            "<b><font color=\"" + primaryColor + "\">(B) Google LLC — Android Beta Program License Agreement</font></b><br/><br/>" +
            "<b><font color=\"" + secondaryColor + "\">Standard Software License</font></b><br/><br/>" +
            "PLEASE READ THIS LICENSE AGREEMENT CAREFULLY BEFORE INSTALLING OR USING THE SOFTWARE. BY INSTALLING AND/OR USING THE PRE-RELEASE SOFTWARE, YOU AGREE TO BE BOUND BY THE TERMS OF THIS LICENSE.<br/><br/>" +
            "<b>1. General.</b><br/><br/>" +
            "A. The pre-release software, APIs, documentation, and assets (collectively, the \"Beta Software\") are licensed, not sold, to you by Google LLC (\"Google\") for use only under the terms of this License.<br/><br/>" +
            "B. Google may make available updates or modifications to the Beta Software at its discretion. The terms of this License will govern any such updates unless accompanied by a separate license agreement.<br/><br/>" +
            "<b>2. Permitted Uses and Restrictions.</b><br/><br/>" +
            "A. License. You are granted a limited, non-transferable, non-exclusive license to install and use the Beta Software on compatible Android-branded devices you own or control solely for test and evaluation purposes.<br/><br/>" +
            "B. Restrictions. You may not: (a) copy, decompile, reverse engineer, or disassemble the Beta Software; (b) distribute, sell, lease, or rent it; or (c) demonstrate it to unauthorized individuals without prior consent.<br/><br/>" +
            "<b>3. Consent to Use of Data.</b><br/><br/>" +
            "A. System Diagnostics. You agree that Google and its affiliates may collect and use diagnostic, technical, usage, and crash data to facilitate system updates and improve Android products.<br/><br/>" +
            "B. Privacy. Google's Privacy Policy governs the collection, processing, and storage of personal data during your participation (https://policies.google.com/privacy).<br/><br/>" +
            "<b>4. Pre-release Software.</b><br/><br/>" +
            "Pre-release versions are time-limited and for test purposes only. They should not be relied upon to perform in the same manner as a final-release product, nor used with important data. Back up your data before installing.<br/><br/>" +
            "<b>5. Termination.</b><br/><br/>" +
            "This License is effective until terminated. Your rights will terminate automatically if you fail to comply with any term. Upon termination, cease all use and destroy all copies of the Beta Software.<br/><br/>" +
            "<b>6. Disclaimer of Warranties.</b><br/><br/>" +
            "TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, THE BETA SOFTWARE IS PROVIDED \"AS IS\" AND \"AS AVAILABLE\", WITH ALL FAULTS AND WITHOUT WARRANTY OF ANY KIND.<br/><br/>" +
            "<b>7. Governing Law.</b><br/><br/>" +
            "This License will be governed by the laws of the State of California. If any provision is found unenforceable, the remainder continues in full force and effect.";
    }

    private void showHelpPanel() {
        // Navigate to the support page inside the WebView
        navigate("/workspace/support");
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

        // ── FAB visibility: show only on the Patients worklist ──
        boolean isPatientsList = path.equals("/workspace/patients");
        if (fabNewRegistration != null) {
            runOnUiThread(() -> {
                if (isPatientsList) {
                    fabNewRegistration.show();
                } else {
                    fabNewRegistration.hide();
                }
            });
        }

        // ── Native Print: detect print report page & trigger Android PrintManager ──
        if (path.startsWith("/workspace/reports/print/")) {
            // Load the page so it renders, then offer native print after a short delay
            webView.loadUrl(BASE_URL + path);
            fetchWalletDetails();
            new Handler(Looper.getMainLooper()).postDelayed(() -> {
                if (webView != null) {
                    PrintManager printManager = (PrintManager) getSystemService(Context.PRINT_SERVICE);
                    if (printManager != null) {
                        PrintDocumentAdapter adapter = webView.createPrintDocumentAdapter("PatholabReport");
                        printManager.print("PatholabReport", adapter,
                            new PrintAttributes.Builder()
                                .setMediaSize(PrintAttributes.MediaSize.ISO_A4)
                                .setResolution(new PrintAttributes.Resolution("pdf", "pdf", 600, 600))
                                .setMinMargins(PrintAttributes.Margins.NO_MARGINS)
                                .build());
                    }
                }
            }, 2500);
            return;
        }

        webView.loadUrl(BASE_URL + path);
        fetchWalletDetails();

        // ── CSS injection: smooth scroll + expanded patient cards ──
        if (isPatientsList) {
            new Handler(Looper.getMainLooper()).postDelayed(() -> injectPatientScrollFixes(), 1500);
        }
    }

    private void injectPatientScrollFixes() {
        if (webView == null) return;
        String css =
            "var s=document.getElementById('ptl-native-scroll-fix');" +
            "if(!s){" +
            "  s=document.createElement('style');" +
            "  s.id='ptl-native-scroll-fix';" +
            "  s.textContent='tbody tr td{padding-top:22px!important;padding-bottom:22px!important}';" +
            "  document.head.appendChild(s);" +
            "}";
        webView.evaluateJavascript(css, null);
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
        
        int strokeColor = android.graphics.Color.parseColor(this.isDarkMode ? "#334155" : "#334155");
        String statusText = "●  ACTIVE";
        String statusColor = "#10B981"; // emerald-500
        
        if (balance <= 20.0) {
            statusText = "●  LOW BALANCE • ADD FUNDS";
            statusColor = "#EF4444";
        } else if (balance < 75.0) {
            statusText = "●  LOW BALANCE • ADD FUNDS";
            statusColor = "#F97316";
        }
        
        if (txtWalletStatus != null) {
            txtWalletStatus.setText(statusText);
            txtWalletStatus.setTextColor(android.graphics.Color.parseColor(statusColor));
        }
        
        android.graphics.drawable.GradientDrawable gd = new android.graphics.drawable.GradientDrawable();
        String boxBgColor = this.isDarkMode ? "#0F172A" : "#1E293B";
        gd.setColor(android.graphics.Color.parseColor(boxBgColor));
        float density = getResources().getDisplayMetrics().density;
        gd.setCornerRadius(28 * density);
        gd.setStroke((int) (1.5 * density), strokeColor);
        walletCard.setBackground(gd);
    }

    // ── More section ───────────────────────────────────────────────────────────

    /**
     * Initialises the full module list from the web app's navigation.ts config.
     * This matches the adminNav groups exactly so that any web update is reflected
     * here automatically on the next app build.
     *
     * Categories here mirror the group titles in navigation.ts:
     * Overview | Clinical | Logistics | Machine | B2B | Admin | Legal
     */
    private void initModulesData() {
        allModules = new ArrayList<>();

        // ── Radiology (RIS) (navigation.ts: Radiology Group) ─────────────────
        allModules.add(new ModuleItem("RIS Dashboard",         "/workspace/radiology/dashboard",    "Radiology",  "Radiology Information System overview",         R.drawable.ic_chart,        false));
        allModules.add(new ModuleItem("Scan Schedule",         "/workspace/radiology/appointments", "Radiology",  "Book & manage radiology scans",                 R.drawable.ic_calendar,       false));
        allModules.add(new ModuleItem("PACS Viewer",           "/workspace/radiology/pacs",         "Radiology",  "View digital imaging & PACS files",            R.drawable.ic_barcode,  false));
        allModules.add(new ModuleItem("Reporting Queue",       "/workspace/radiology/reporting",    "Radiology",  "Radiologist report queue & sign-off",           R.drawable.ic_stethoscope,         false));
        allModules.add(new ModuleItem("Machines",              "/workspace/radiology/modalities",   "Radiology",  "Configure radiology equipment & modalities",    R.drawable.ic_cpu,  false));
        allModules.add(new ModuleItem("Radiology Settings",    "/workspace/radiology/settings/macros", "Radiology", "Configure macros & report templates",         R.drawable.ic_gear,         false));

        // ── Overview (navigation.ts: "Overview") ──────────────────────────────
        allModules.add(new ModuleItem("Financial Analytics",   "/workspace/analytics",              "Overview",   "Revenue reports & analytical charts",           R.drawable.ic_chart,        false));
        allModules.add(new ModuleItem("Online Booking",        "/workspace/bookings",               "Overview",   "Manage home collections & appointments",        R.drawable.ic_calendar,        true));

        // ── Clinical Operations (navigation.ts: "Clinical Operations") ───────
        allModules.add(new ModuleItem("Patient Registration",  "/workspace/registration",           "Clinical",   "Register patients & book new lab tests",        R.drawable.ic_nav_patients,          true));
        allModules.add(new ModuleItem("Patient Directory",     "/workspace/patients",               "Clinical",   "Browse & search patient records",               R.drawable.ic_nav_patients,          false));
        allModules.add(new ModuleItem("Test Catalog",          "/workspace/test-management",        "Clinical",   "Manage test packages & profiles",               R.drawable.ic_flask,         false));
        allModules.add(new ModuleItem("Worklist & Results",    "/workspace/results",                "Clinical",   "Fill raw values & review parameters",           R.drawable.ic_flask,         false));
        allModules.add(new ModuleItem("Report Dispatch",       "/workspace/reports",                "Clinical",   "Sign off & dispatch PDF reports",               R.drawable.ic_document,       false));

        // ── Resources & Logistics (navigation.ts: "Resources & Logistics") ──
        allModules.add(new ModuleItem("Inventory & Stock",     "/workspace/inventory",              "Logistics",  "Track reagents, consumables & items",           R.drawable.ic_box,         false));
        allModules.add(new ModuleItem("Logistics / Trips",     "/workspace/logistics",              "Logistics",  "Manage field agents & pickup trips",            R.drawable.ic_box,   false));

        // ── Machine & AI (navigation.ts: "Machine & AI") ─────────────────────
        allModules.add(new ModuleItem("Analyzer",              "/workspace/analyzers",              "Machine",    "Connect analyzers & view output logs",          R.drawable.ic_cpu,  false));
        allModules.add(new ModuleItem("Visual Mapper",         "/workspace/analyzers/mapper",       "Machine",    "Map barcode codes visually to fields",          R.drawable.ic_barcode,  false));
        allModules.add(new ModuleItem("Mappings",              "/workspace/analyzers/mappings",     "Machine",    "Configure machine integration parameters",      R.drawable.ic_barcode,  false));
        allModules.add(new ModuleItem("AI Analysis",           "/workspace/analyzers/ai",           "Machine",    "AI models on clinical samples",                 R.drawable.ic_cpu,  true));

        // ── B2B & Growth (navigation.ts: "B2B & Growth") ─────────────────────
        allModules.add(new ModuleItem("Referral Doctors",      "/workspace/doctors",                "B2B",        "Track referring doctors & commission profiles",  R.drawable.ic_stethoscope,     false));
        allModules.add(new ModuleItem("Corporate Agencies",    "/workspace/agencies",               "B2B",        "Manage corporate agency tie-ups",               R.drawable.ic_stethoscope,     false));
        allModules.add(new ModuleItem("Commissions Payout",    "/workspace/commissions",            "B2B",        "View payout summaries for referrals",           R.drawable.ic_document,     false));
        allModules.add(new ModuleItem("B2B Settings",          "/workspace/settings/b2b-tiers",     "B2B",        "Manage outsourced labs & tier pricings",        R.drawable.ic_gear,     false));

        // ── Administration (navigation.ts: "Administration") ─────────────────
        allModules.add(new ModuleItem("Report Templates",      "/workspace/settings/templates",     "Admin",      "Design & manage report layout templates",       R.drawable.ic_document,         false));
        allModules.add(new ModuleItem("Staff Management",      "/workspace/staff",                  "Admin",      "Manage team roles, access keys & logs",         R.drawable.ic_nav_patients,         false));
        allModules.add(new ModuleItem("Invoices & Payments",   "/workspace/billing",                "Admin",      "Track cash flow & pending invoices",            R.drawable.ic_credit_card,         false));
        allModules.add(new ModuleItem("Expenses",              "/workspace/expenses",               "Admin",      "Record & categorise lab expenses",              R.drawable.ic_document,         false));
        allModules.add(new ModuleItem("Lab Settings",          "/workspace/settings",               "Admin",      "Configure letterhead, templates & formats",     R.drawable.ic_gear,         false));
        allModules.add(new ModuleItem("Audit Logs",            "/workspace/audit-logs",             "Admin",      "View security access logs & trace changes",     R.drawable.ic_document,         false));
        allModules.add(new ModuleItem("Wallet & Billing",      "/workspace/wallet",                 "Admin",      "Top-up wallet & view billing history",          R.drawable.ic_credit_card,         false));
        allModules.add(new ModuleItem("Help & Support",        "/workspace/support",                "Admin",      "Raise tickets & browse documentation",          R.drawable.ic_support_lifebuoy, false));

        // ── Legal & Agreements ────────────────────────────────────────────────
        allModules.add(new ModuleItem("Terms & Conditions",    "/legal",                            "Legal",      "Google Play Beta Testing agreements",           R.drawable.ic_legal, false));
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

        final boolean isDark = this.isDarkMode;
        int headerColor = isDark ? android.graphics.Color.parseColor("#818CF8") : android.graphics.Color.parseColor("#4338CA");
        if (lblOverviewHeader != null) lblOverviewHeader.setTextColor(headerColor);
        if (lblClinicalHeader != null) lblClinicalHeader.setTextColor(headerColor);
        if (lblRadiologyHeader != null) lblRadiologyHeader.setTextColor(headerColor);
        if (lblLogisticsHeader != null) lblLogisticsHeader.setTextColor(headerColor);
        if (lblMachineHeader != null) lblMachineHeader.setTextColor(headerColor);
        if (lblB2BHeader != null) lblB2BHeader.setTextColor(headerColor);
        if (lblAdminHeader != null) lblAdminHeader.setTextColor(headerColor);
        if (lblLegalHeader != null) lblLegalHeader.setTextColor(headerColor);

        int overviewCount = 0, clinicalCount = 0, logisticsCount = 0;
        int machineCount = 0, b2bCount = 0, adminCount = 0, legalCount = 0;
        int radiologyCount = 0;

        for (final ModuleItem item : allModules) {
            View row = LayoutInflater.from(this).inflate(R.layout.layout_setting_item, null);
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            );
            int margin = (int) (10 * getResources().getDisplayMetrics().density);
            lp.setMargins(0, 0, 0, margin);
            row.setLayoutParams(lp);
            
            TextView tvTitle = row.findViewById(R.id.tvItemTitle);
            TextView tvDesc = row.findViewById(R.id.tvItemDesc);
            ImageView ivIcon = row.findViewById(R.id.ivItemIcon);
            ImageView ivChevron = row.findViewById(R.id.ivChevron);
            View badge = row.findViewById(R.id.tvNewBadge);

            tvTitle.setText(item.title);
            tvDesc.setText(item.desc);
            ivIcon.setImageResource(item.iconRes);
            
            if (isDark) {
                row.setBackgroundTintList(android.content.res.ColorStateList.valueOf(android.graphics.Color.parseColor("#1E293B")));
                tvTitle.setTextColor(android.graphics.Color.parseColor("#FFFFFF"));
                tvDesc.setTextColor(android.graphics.Color.parseColor("#94A3B8"));
                if (ivChevron != null) ivChevron.setColorFilter(android.graphics.Color.parseColor("#64748B"));
                if (ivIcon != null) ivIcon.setColorFilter(android.graphics.Color.parseColor("#818CF8")); // Indigo-400
            } else {
                row.setBackgroundTintList(null);
                tvTitle.setTextColor(android.graphics.Color.parseColor("#0F172A"));
                tvDesc.setTextColor(android.graphics.Color.parseColor("#64748B"));
                if (ivChevron != null) ivChevron.clearColorFilter();
                if (ivIcon != null) ivIcon.clearColorFilter();
            }

            boolean hasOpened = prefs.getBoolean("opened_" + item.path, false);
            badge.setVisibility((item.isNew && !hasOpened) ? View.VISIBLE : View.GONE);

            row.setOnClickListener(v -> {
                prefs.edit().putBoolean("opened_" + item.path, true).apply();
                badge.setVisibility(View.GONE);
                
                if (moreBottomSheetDialog != null) {
                    moreBottomSheetDialog.dismiss();
                }

                if (item.path.equals("/legal")) {
                    showLegalBottomSheet();
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
                case "Radiology":
                    if (containerRadiology != null) {
                        containerRadiology.addView(row);
                        radiologyCount++;
                    }
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
        if (lblRadiologyHeader != null) lblRadiologyHeader.setVisibility(radiologyCount > 0 ? View.VISIBLE : View.GONE);
        if (containerRadiology != null) containerRadiology.setVisibility(radiologyCount > 0 ? View.VISIBLE : View.GONE);
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
                AuthManager.clearSession(MainActivity.this);
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
        walletHandler.removeCallbacks(walletRunnable);
        stopBellAnimationLoop();
        bellAnimationHandler.removeCallbacks(bellAnimationRunnable);
        authCheckHandler.removeCallbacks(authCheckRunnable);
        progressPollHandler.removeCallbacks(progressPollRunnable);
        stopPulseAnimation();
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
        containerRadiology = null;
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
        if (path.contains("analytics")) return "Financial Analytics";
        if (path.contains("patients")) return "Patient Worklist";
        if (path.contains("test-management")) return "Categories";
        if (path.contains("bookings")) return "Online Bookings";
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
        return "Dashboard";
    }

    private void applySkeletonTheme(View view, boolean isDark) {
        if (view == null) return;
        if (view instanceof android.view.ViewGroup) {
            android.view.ViewGroup group = (android.view.ViewGroup) view;
            android.graphics.drawable.Drawable bg = group.getBackground();
            if (bg != null) {
                if (isDark) {
                    bg.setColorFilter(android.graphics.Color.parseColor("#1E293B"), android.graphics.PorterDuff.Mode.SRC_IN);
                } else {
                    bg.clearColorFilter();
                }
            }
            for (int i = 0; i < group.getChildCount(); i++) {
                applySkeletonTheme(group.getChildAt(i), isDark);
            }
        } else {
            android.graphics.drawable.Drawable bg = view.getBackground();
            if (bg != null) {
                if (isDark) {
                    bg.setColorFilter(android.graphics.Color.parseColor("#334155"), android.graphics.PorterDuff.Mode.SRC_IN);
                } else {
                    bg.clearColorFilter();
                }
            }
        }
    }

    private void showSkeletonForPath(String path) {
        if (path == null) path = "";
        
        String category = "detail";
        if (path.contains("analytics") || path.contains("dashboard")) {
            category = "dashboard";
        } else if (path.contains("results") || path.contains("worklist") || path.contains("patients") || path.contains("bookings")) {
            category = "list";
        } else if (path.contains("registration") || path.contains("settings") || path.contains("config") || path.contains("forgot-password")) {
            category = "form";
        } else if (path.contains("categories") || path.contains("catalog") || path.contains("inventory")) {
            category = "grid";
        }
        
        if (category.equals(activeSkeletonCategory) && skeletonContainer != null && skeletonContainer.getVisibility() == View.VISIBLE) {
            return;
        }
        activeSkeletonCategory = category;
        
        View sDash = findViewById(R.id.skeletonDashboard);
        View sList = findViewById(R.id.skeletonList);
        View sForm = findViewById(R.id.skeletonForm);
        View sGrid = findViewById(R.id.skeletonGrid);
        View sDetail = findViewById(R.id.skeletonDetail);
        
        if (sDash != null) sDash.setVisibility(View.GONE);
        if (sList != null) sList.setVisibility(View.GONE);
        if (sForm != null) sForm.setVisibility(View.GONE);
        if (sGrid != null) sGrid.setVisibility(View.GONE);
        if (sDetail != null) sDetail.setVisibility(View.GONE);
        
        View activeSkeleton = sDetail;
        if (path.contains("analytics") || path.contains("dashboard")) {
            activeSkeleton = sDash;
        } else if (path.contains("results") || path.contains("worklist") || path.contains("patients") || path.contains("bookings")) {
            activeSkeleton = sList;
        } else if (path.contains("registration") || path.contains("settings") || path.contains("config") || path.contains("forgot-password")) {
            activeSkeleton = sForm;
        } else if (path.contains("categories") || path.contains("catalog") || path.contains("inventory")) {
            activeSkeleton = sGrid;
        }
        
        if (activeSkeleton != null) {
            activeSkeleton.setVisibility(View.VISIBLE);
        }
        
        final boolean isDark = this.isDarkMode;
        if (skeletonContainer != null) {
            skeletonContainer.setBackgroundColor(isDark ? android.graphics.Color.parseColor("#0F172A") : android.graphics.Color.parseColor("#F8FAFC"));
            applySkeletonTheme(skeletonContainer, isDark);
            
            skeletonContainer.animate().cancel();
            skeletonContainer.setAlpha(0f);
            skeletonContainer.setVisibility(View.VISIBLE);
            skeletonContainer.animate()
                .alpha(1f)
                .setDuration(150)
                .setListener(null)
                .start();
                
            startPulseAnimation();
        }
    }

    private void hideSkeleton() {
        if (skeletonContainer != null && skeletonContainer.getVisibility() == View.VISIBLE) {
            activeSkeletonCategory = "";
            stopPulseAnimation();
            skeletonContainer.animate().cancel();
            skeletonContainer.animate()
                .alpha(0f)
                .setDuration(180)
                .setListener(new android.animation.AnimatorListenerAdapter() {
                    @Override
                    public void onAnimationEnd(android.animation.Animator animation) {
                        skeletonContainer.setVisibility(View.GONE);
                    }
                })
                .start();
        }
    }

    private void startPulseAnimation() {
        if (pulseAnimator != null) {
            pulseAnimator.cancel();
        }
        pulseAnimator = android.animation.ObjectAnimator.ofFloat(skeletonContainer, "alpha", 0.6f, 1.0f);
        pulseAnimator.setDuration(800);
        pulseAnimator.setRepeatMode(android.animation.ValueAnimator.REVERSE);
        pulseAnimator.setRepeatCount(android.animation.ValueAnimator.INFINITE);
        pulseAnimator.start();
    }

    private void stopPulseAnimation() {
        if (pulseAnimator != null) {
            pulseAnimator.cancel();
            pulseAnimator = null;
        }
    }

    private final Handler bellAnimationHandler = new Handler(Looper.getMainLooper());
    private boolean isBellAnimationRunning = false;
    private final Runnable bellAnimationRunnable = new Runnable() {
        @Override
        public void run() {
            ImageView bellImg = findViewById(R.id.imgHeaderBell);
            TextView badge = findViewById(R.id.txtNotificationBadge);
            if (bellImg != null && badge != null && badge.getVisibility() == View.VISIBLE) {
                bellImg.animate().rotation(-15f).setDuration(150).withEndAction(() -> {
                    bellImg.animate().rotation(15f).setDuration(150).withEndAction(() -> {
                        bellImg.animate().rotation(-12f).setDuration(150).withEndAction(() -> {
                            bellImg.animate().rotation(12f).setDuration(150).withEndAction(() -> {
                                bellImg.animate().rotation(-8f).setDuration(150).withEndAction(() -> {
                                    bellImg.animate().rotation(8f).setDuration(150).withEndAction(() -> {
                                        bellImg.animate().rotation(0f).setDuration(150).start();
                                    }).start();
                                }).start();
                            }).start();
                        }).start();
                    }).start();
                }).start();
            }
            bellAnimationHandler.postDelayed(this, 3000);
        }
    };

    private void startBellAnimationLoop() {
        runOnUiThread(() -> {
            if (isBellAnimationRunning) return;
            isBellAnimationRunning = true;
            bellAnimationHandler.post(bellAnimationRunnable);
        });
    }

    private void stopBellAnimationLoop() {
        runOnUiThread(() -> {
            isBellAnimationRunning = false;
            bellAnimationHandler.removeCallbacks(bellAnimationRunnable);
            ImageView bellImg = findViewById(R.id.imgHeaderBell);
            if (bellImg != null) {
                bellImg.animate().cancel();
                bellImg.setRotation(0f);
            }
        });
    }

    private void fetchNotificationCount() {
        final String token = AuthManager.getToken(this);
        if (token == null || token.isEmpty()) {
            runOnUiThread(() -> {
                TextView badge = findViewById(R.id.txtNotificationBadge);
                if (badge != null) badge.setVisibility(View.GONE);
                stopBellAnimationLoop();
            });
            return;
        }

        new Thread(() -> {
            try {
                java.net.URL url = new java.net.URL(BASE_URL + "/api/notifications");
                java.net.HttpURLConnection conn = (java.net.HttpURLConnection) url.openConnection();
                conn.setRequestMethod("GET");
                conn.setRequestProperty("Accept", "application/json");
                String cookie = android.webkit.CookieManager.getInstance().getCookie(BASE_URL);
                if (cookie != null) conn.setRequestProperty("Cookie", cookie);
                conn.setConnectTimeout(8000);
                conn.setReadTimeout(8000);

                int code = conn.getResponseCode();
                if (code >= 200 && code < 300) {
                    java.io.InputStream stream = conn.getInputStream();
                    java.io.BufferedReader reader = new java.io.BufferedReader(new java.io.InputStreamReader(stream, "UTF-8"));
                    StringBuilder sb = new StringBuilder();
                    String line;
                    while ((line = reader.readLine()) != null) sb.append(line);
                    reader.close();

                    org.json.JSONObject root = new org.json.JSONObject(sb.toString());
                    org.json.JSONArray arr = root.optJSONArray("notifications");
                    
                    long lastSeenTime = prefs != null ? prefs.getLong("last_seen_notification_time", 0L) : 0L;
                    int unreadCount = 0;
                    if (arr != null) {
                        for (int i = 0; i < arr.length(); i++) {
                            org.json.JSONObject n = arr.getJSONObject(i);
                            String createdStr = n.optString("createdAt", "");
                            if (!createdStr.isEmpty()) {
                                long createdTime = parseIsoDateTime(createdStr);
                                if (createdTime > lastSeenTime) {
                                    unreadCount++;
                                }
                            }
                        }
                    }

                    final int finalUnreadCount = unreadCount;
                    runOnUiThread(() -> {
                        TextView badge = findViewById(R.id.txtNotificationBadge);
                        if (badge != null) {
                            if (finalUnreadCount > 0) {
                                badge.setText(finalUnreadCount > 9 ? "9+" : String.valueOf(finalUnreadCount));
                                badge.setVisibility(View.VISIBLE);
                                startBellAnimationLoop();
                            } else {
                                badge.setVisibility(View.GONE);
                                stopBellAnimationLoop();
                            }
                        }
                    });
                }
                conn.disconnect();
            } catch (Exception e) {
                e.printStackTrace();
            }
        }).start();
    }

    private long parseIsoDateTime(String isoString) {
        try {
            String clean = isoString.replaceAll("Z$", "+0000");
            java.text.SimpleDateFormat sdf = new java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSSZ", java.util.Locale.US);
            return sdf.parse(clean).getTime();
        } catch (Exception e) {
            try {
                String clean = isoString.replaceAll("Z$", "+0000");
                java.text.SimpleDateFormat sdf = new java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ssZ", java.util.Locale.US);
                return sdf.parse(clean).getTime();
            } catch (Exception ex) {
                return 0L;
            }
        }
    }
}