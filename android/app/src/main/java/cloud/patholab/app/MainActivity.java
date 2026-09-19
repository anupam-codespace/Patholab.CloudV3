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
import com.google.android.material.bottomsheet.BottomSheetDialog;
import com.google.android.material.floatingactionbutton.FloatingActionButton;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.net.Uri;
import android.util.TypedValue;
import android.widget.Toast;
import java.net.URLEncoder;
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
    private androidx.cardview.widget.CardView floatingNavBarCard;
    private View navTabHome, navTabPatients, navTabCenter, navTabReports, navTabMore;
    private View indicatorNavHome, indicatorNavPatients, indicatorNavReports, indicatorNavMore;
    private ImageView imgNavHome, imgNavPatients, imgNavReports, imgNavMore;
    private TextView txtNavHome, txtNavPatients, txtNavReports, txtNavMore;
    private View navCenterCircle;
    private int currentSelectedTabIndex = 0;
    private View offlineOverlay;
    private ScrollView moreScrollView;
    private View topLayoutContainer;
    private FloatingActionButton fabNewRegistration;

    // Header & Wallet Views
    private View headerBlurGradientView;
    private View topHeaderBar;
    private TextView lblHeaderTitle;
    private View btnHeaderMenu;
    private View walletCard;
    private TextView txtWalletBalance;
    private TextView txtWalletStatus;
    private View btnWalletTopUp;
    private View walletChevron;

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
    // ── Native Home Screen ────────────────────────────────────────────────────
    private HomeNativeManager homeNativeManager;

    private FrameLayout skeletonContainer;
    private android.animation.ObjectAnimator pulseAnimator;
    private final Handler progressPollHandler = new Handler(Looper.getMainLooper());
    private final Runnable progressPollRunnable=new Runnable(){@Override public void run(){if(webView!=null){int progress=webView.getProgress();if(progress>=75){if(skeletonContainer!=null&&skeletonContainer.getVisibility()==View.VISIBLE){hideSkeleton();}}}progressPollHandler.postDelayed(this,150);}};

    // Polling handler for wallet details
    private final Handler walletHandler = new Handler(Looper.getMainLooper());
    private final Runnable walletRunnable=new Runnable(){@Override public void run(){fetchWalletDetails();fetchNotificationCount();walletHandler.postDelayed(this,15000); // poll
                                                                                                                                                                          // every
                                                                                                                                                                          // 15s
    }};

    // Polling handler for auth status redirect check (safeguard for token expiry
    // redirection)
    private final Handler authCheckHandler = new Handler(Looper.getMainLooper());
    private final Runnable authCheckRunnable=new Runnable(){@Override public void run(){checkAuthRedirect();if(webView!=null){webView.evaluateJavascript("document.documentElement.classList.contains('dark')",value->{boolean isDark="true".equals(value);runOnUiThread(()->applyNativeTheme(isDark));});}authCheckHandler.postDelayed(this,1000); // poll
                                                                                                                                                                                                                                                                                                                                                    // every
                                                                                                                                                                                                                                                                                                                                                    // 1s
    }};

    private long activityLaunchTime = System.currentTimeMillis();

    private void checkAuthRedirect() {
        if (webView == null)
            return;

        // Startup grace period to prevent temporary initial webview handshake from triggering false logout
        if (System.currentTimeMillis() - activityLaunchTime < 5000) {
            return;
        }

        int topPaddingPx = (walletCard != null && walletCard.getVisibility() == View.VISIBLE) ? 118 : 60;
        webView.evaluateJavascript(
                "var style = document.getElementById('native-hide-header-style');" +
                        "if(!style) {" +
                        "  style = document.createElement('style');" +
                        "  style.id = 'native-hide-header-style';" +
                        "  document.head.appendChild(style);" +
                        "}" +
                        "style.innerHTML = 'html, body { padding-top: 0 !important; margin-top: 0 !important; } .mobile-app-header-web-component, header, .sticky.top-0 { display: none !important; } main, .is-native-app main, .is-capacitor main { padding-top: "
                        + topPaddingPx
                        + "px !important; margin-top: 0px !important; padding-bottom: 84px !important; }';" +
                        "var isDark = " + isDarkMode + ";" +
                        "if (isDark && !document.documentElement.classList.contains('dark')) {" +
                        "  document.documentElement.classList.add('dark');" +
                        "  localStorage.setItem('theme', 'dark');" +
                        "} else if (!isDark && document.documentElement.classList.contains('dark')) {" +
                        "  document.documentElement.classList.remove('dark');" +
                        "  localStorage.setItem('theme', 'light');" +
                        "}",
                null);

        String url = webView.getUrl();
        if (url == null)
            return;

        // Never allow Financial Analytics or Dashboard web page to be displayed in WebView
        if (url.contains("/workspace/analytics") || url.contains("/analytics")
                || url.contains("/workspace/dashboard") || url.contains("/dashboard")) {
            startActivity(new Intent(this, FinancialAnalyticsActivity.class));
            showNativeHome();
            return;
        }

        if (url.contains("/login") || url.contains("/register") || url.contains("/forgot-password")
                || url.contains("/verify") || url.contains("/reset-password")) {
            String token = AuthManager.getToken(this);
            if (token != null && !token.trim().isEmpty()) {
                // Native session is active! Re-sync cookie and re-route webview to workspace without kicking user out
                AuthManager.syncWebViewCookie(token);
                webView.loadUrl(BASE_URL + "/workspace");
            }
        }
    }

    private void applyNativeTheme(boolean isDark) {
        if (isDarkMode == isDark && prefs != null && prefs.contains("is_dark_mode"))
            return;
        isDarkMode = isDark;

        if (prefs != null) {
            prefs.edit().putBoolean("is_dark_mode", isDark).apply();
        }

        // Status bar and Navigation Bar icons & colors
        if (isDark) {
            StatusBarHelper.setStatusBarDark(this);
            getWindow().setNavigationBarColor(android.graphics.Color.parseColor("#0F172A"));
        } else {
            StatusBarHelper.setStatusBarSapphire(this);
            getWindow().setNavigationBarColor(android.graphics.Color.TRANSPARENT);
        }

        // Parent root layout
        View mainParentLayout = findViewById(R.id.mainParentLayout);
        if (mainParentLayout != null) {
            if (isDark) {
                mainParentLayout.setBackgroundColor(android.graphics.Color.parseColor("#0F172A"));
            } else {
                mainParentLayout.setBackgroundColor(android.graphics.Color.parseColor("#F8FAFC"));
            }
        }

        // Header containers (Transparent to allow blurred gradient backdrop to show
        // through)
        if (topLayoutContainer != null) {
            topLayoutContainer.setBackgroundColor(android.graphics.Color.TRANSPARENT);
        }
        if (topHeaderBar != null) {
            topHeaderBar.setBackgroundColor(android.graphics.Color.TRANSPARENT);
        }

        // Header Dividers (Subtle translucent hairlines)
        View headerDivider = findViewById(R.id.headerDivider);
        if (headerDivider != null) {
            headerDivider.setBackgroundColor(isDark ? android.graphics.Color.parseColor("#14FFFFFF")
                    : android.graphics.Color.parseColor("#0A000000"));
        }
        View dividerLineTop = findViewById(R.id.dividerLineTop);
        if (dividerLineTop != null) {
            dividerLineTop.setBackgroundColor(isDark ? android.graphics.Color.parseColor("#14FFFFFF")
                    : android.graphics.Color.parseColor("#0A000000"));
        }

        updateHeaderGradientBackground();
        updateHeaderBlurHeight();

        // Title Texts
        TextView lblHeaderTitle = findViewById(R.id.lblHeaderTitle);
        if (lblHeaderTitle != null) {
            lblHeaderTitle.setTextColor(isDark ? android.graphics.Color.parseColor("#FFFFFF")
                    : android.graphics.Color.parseColor("#0F172A"));
        }
        TextView lblHeaderSubtitle = findViewById(R.id.lblHeaderSubtitle);
        if (lblHeaderSubtitle != null) {
            lblHeaderSubtitle.setTextColor(isDark ? android.graphics.Color.parseColor("#94A3B8")
                    : android.graphics.Color.parseColor("#94A3B8"));
        }

        // Native Buttons Bg Tint and Text / Icon tint
        int btnBgColor = isDark ? android.graphics.Color.parseColor("#334155")
                : android.graphics.Color.parseColor("#F1F5F9");
        int btnIconColor = isDark ? android.graphics.Color.parseColor("#E2E8F0")
                : android.graphics.Color.parseColor("#475569");

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

        ImageView imgTheme = findViewById(R.id.imgHeaderTheme);
        if (imgTheme != null) {
            imgTheme.setImageResource(isDark ? R.drawable.ic_moon : R.drawable.ic_sun);
            imgTheme.setColorFilter(btnIconColor);
        }

        android.view.ViewGroup btnSupport = findViewById(R.id.btnHeaderSupport);
        if (btnSupport != null) {
            btnSupport.setBackgroundTintList(android.content.res.ColorStateList.valueOf(btnBgColor));
            tintImageViewsInViewGroup(btnSupport, btnIconColor);
        }

        // Floating Glassmorphic Navigation Bar
        if (floatingNavBarCard != null) {
            floatingNavBarCard.setCardBackgroundColor(isDark ? android.graphics.Color.parseColor("#1E293B")
                    : android.graphics.Color.parseColor("#FFFFFF"));
            selectNavTab(currentSelectedTabIndex, false);
        }

        if (skeletonContainer != null && skeletonContainer.getVisibility() == View.VISIBLE) {
            applySkeletonTheme(skeletonContainer, isDark);
        }

        if (webView != null) {
            String script = "(function() {" +
                    "  var isDark = " + isDark + ";" +
                    "  if (isDark) {" +
                    "    document.documentElement.classList.add('dark');" +
                    "    localStorage.setItem('theme', 'dark');" +
                    "  } else {" +
                    "    document.documentElement.classList.remove('dark');" +
                    "    localStorage.setItem('theme', 'light');" +
                    "  }" +
                    "})();";
            webView.evaluateJavascript(script, null);
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
        boolean savedDark = prefs.getBoolean("is_dark_mode", false);
        if (savedDark) {
            applyNativeTheme(true);
        }
        bindViews();
        initModulesData();
        setupBottomNavigation();

        // 7. Initialize system notification channel & request permission on Android 13+
        MobileNotificationHelper.initNotificationChannel(this);
        requestNotificationPermission();

        // 8. Navigate to native Home screen (bypasses WebView for Home tab)
        initNativeHomeScreen();
        // Start wallet details polling (for web pages, independent from native home)
        walletHandler.post(walletRunnable);
        authCheckHandler.post(authCheckRunnable);
        progressPollHandler.post(progressPollRunnable);
    }

    private void requestNotificationPermission() {
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU) {
            if (androidx.core.content.ContextCompat.checkSelfPermission(this, android.Manifest.permission.POST_NOTIFICATIONS)
                    != android.content.pm.PackageManager.PERMISSION_GRANTED) {
                androidx.core.app.ActivityCompat.requestPermissions(
                        this,
                        new String[]{android.Manifest.permission.POST_NOTIFICATIONS},
                        101
                );
            }
        }
    }

    /** Initialise the native home screen and show it on launch */
    private void initNativeHomeScreen() {
        View homeRoot = findViewById(R.id.nativeHomeScreen);
        if (homeRoot == null) {
            return;
        }
        homeNativeManager = new HomeNativeManager(
                this,
                homeRoot,
                prefs,
                path -> {
                    // Navigate directly - navigate() opens native activity if available,
                    // and only falls back to WebView for web-only pages
                    navigate(path);
                }
        );
        // Show native home, ensure top header and WebView remain hidden
        showNativeHome();
    }

    /** Show the WebView container and hide native home screen */
    private void showWebView() {
        if (homeNativeManager != null) homeNativeManager.hide();
        if (topLayoutContainer != null) topLayoutContainer.setVisibility(View.VISIBLE);
        if (headerBlurGradientView != null) headerBlurGradientView.setVisibility(View.VISIBLE);
        swipeRefresh.setVisibility(View.VISIBLE);
    }

    /** Show the native home screen and hide the WebView container */
    private void showNativeHome() {
        if (isDarkMode) {
            StatusBarHelper.setStatusBarDark(this);
        } else {
            StatusBarHelper.setStatusBarSapphire(this);
        }
        if (topLayoutContainer != null) topLayoutContainer.setVisibility(View.GONE);
        if (headerBlurGradientView != null) headerBlurGradientView.setVisibility(View.GONE);
        swipeRefresh.setVisibility(View.GONE);
        if (homeNativeManager != null) {
            homeNativeManager.show();
            homeNativeManager.fetchWalletBalance(); // refresh on each return
        }
        selectNavTab(0, false, false);
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

        // Native-like smooth scrolling enhancements
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
        webView.setVerticalScrollBarEnabled(false);
        webView.setHorizontalScrollBarEnabled(false);
        webView.setNestedScrollingEnabled(true);
        webView.setScrollBarStyle(View.SCROLLBARS_INSIDE_OVERLAY);
        webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);

        try {
            android.webkit.CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true);
        } catch (Exception ignored) {}
    }

    private void bindViews() {
        swipeRefresh = findViewById(R.id.swipeRefresh);

        // Fix: SwipeRefreshLayout must check WebView scroll position so it NEVER traps
        // scrolling down or stuck at bottom
        if (swipeRefresh != null) {
            swipeRefresh.setOnChildScrollUpCallback((parent, child) -> {
                if (webView != null) {
                    return webView.canScrollVertically(-1) || webView.getScrollY() > 0;
                }
                return false;
            });
        }

        offlineOverlay = findViewById(R.id.offlineOverlay);
        skeletonContainer = findViewById(R.id.skeletonContainer);
        topLayoutContainer = findViewById(R.id.topLayoutContainer);

        // Adjust top container padding dynamically for system status bar / notch height
        if (topLayoutContainer != null) {
            androidx.core.view.ViewCompat.setOnApplyWindowInsetsListener(topLayoutContainer, (v, insets) -> {
                androidx.core.graphics.Insets systemBars = insets
                        .getInsets(androidx.core.view.WindowInsetsCompat.Type.systemBars());
                v.setPadding(0, systemBars.top, 0, 0);
                updateHeaderBlurHeight();
                return insets;
            });
        }

        // Retry button
        View btnRetry = findViewById(R.id.btnRetry);
        if (btnRetry != null) {
            btnRetry.setOnClickListener(v -> {
                offlineOverlay.setVisibility(View.GONE);
                if (currentSelectedTabIndex == 0) {
                    showNativeHome();
                } else if (currentPath != null && !currentPath.isEmpty()) {
                    swipeRefresh.setVisibility(View.VISIBLE);
                    String retryPath = currentPath;
                    currentPath = null;
                    loadUrl(retryPath);
                } else {
                    showNativeHome();
                }
            });
        }

        // FAB — New Registration (visible only on /patients page)
        fabNewRegistration = findViewById(R.id.fabNewRegistration);
        if (fabNewRegistration != null) {
            fabNewRegistration.setOnClickListener(v -> {
                currentPath = null; // force navigation even if already on sub-path
                loadUrl("/workspace/registration");
                selectNavTab(1, true);
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
        topLayoutContainer = findViewById(R.id.topLayoutContainer);
        topHeaderBar = findViewById(R.id.topHeaderBar);
        headerBlurGradientView = findViewById(R.id.headerBlurGradientView);
        setupHeaderBlurAndGradient();

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
                v.performHapticFeedback(android.view.HapticFeedbackConstants.KEYBOARD_TAP);

                boolean newDark = !isDarkMode;

                // Animated rotation and spring scale matching iOS
                btnTheme.animate()
                        .rotationBy(90f)
                        .scaleX(0.82f)
                        .scaleY(0.82f)
                        .setDuration(160)
                        .withEndAction(() -> {
                            btnTheme.animate()
                                    .scaleX(1.0f)
                                    .scaleY(1.0f)
                                    .setDuration(220)
                                    .setInterpolator(new android.view.animation.OvershootInterpolator(1.8f))
                                    .start();
                        })
                        .start();

                applyNativeTheme(newDark);

                if (webView != null) {
                    webView.evaluateJavascript(
                            "(function() {" +
                                    "  var btn = document.querySelector('.mobile-app-header-web-component button[aria-label=\"Toggle dark mode\"]') || document.querySelector('[aria-label=\"Toggle dark mode\"]');"
                                    +
                                    "  if (btn) { btn.click(); return; }" +
                                    "  var html = document.documentElement;" +
                                    "  var isDark = " + newDark + ";" +
                                    "  if (isDark) { html.classList.add('dark'); } else { html.classList.remove('dark'); }"
                                    +
                                    "  localStorage.setItem('theme', isDark ? 'dark' : 'light');" +
                                    "})()",
                            null);
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
        btnWalletTopUp = findViewById(R.id.btnWalletTopUp);
        walletChevron = findViewById(R.id.walletChevron);
        if (walletCard != null) {
            walletCard.setOnClickListener(v -> navigate("/workspace/wallet"));
        }
        if (btnWalletTopUp != null) {
            btnWalletTopUp.setOnClickListener(v -> navigate("/workspace/wallet?action=topup"));
        }

        swipeRefresh.setColorSchemeColors(0xFF3730A3);
    }

    private void setupBottomNavigation() {
        floatingNavBarCard = findViewById(R.id.floatingNavBarCard);
        navTabHome = findViewById(R.id.navTabHome);
        navTabPatients = findViewById(R.id.navTabPatients);
        navTabCenter = findViewById(R.id.navTabCenter);
        navTabReports = findViewById(R.id.navTabReports);
        navTabMore = findViewById(R.id.navTabMore);

        indicatorNavHome = findViewById(R.id.indicatorNavHome);
        indicatorNavPatients = findViewById(R.id.indicatorNavPatients);
        indicatorNavReports = findViewById(R.id.indicatorNavReports);
        indicatorNavMore = findViewById(R.id.indicatorNavMore);

        imgNavHome = findViewById(R.id.imgNavHome);
        imgNavPatients = findViewById(R.id.imgNavPatients);
        imgNavReports = findViewById(R.id.imgNavReports);
        imgNavMore = findViewById(R.id.imgNavMore);

        txtNavHome = findViewById(R.id.txtNavHome);
        txtNavPatients = findViewById(R.id.txtNavPatients);
        txtNavReports = findViewById(R.id.txtNavReports);
        txtNavMore = findViewById(R.id.txtNavMore);

        navCenterCircle = findViewById(R.id.navCenterCircle);

        if (navTabHome != null) navTabHome.setOnClickListener(v -> selectNavTab(0, true));
        if (navTabPatients != null) navTabPatients.setOnClickListener(v -> selectNavTab(1, true));
        if (navTabCenter != null) navTabCenter.setOnClickListener(v -> {
            // Animate center button with spring rotation & bounce
            if (navCenterCircle != null) {
                navCenterCircle.animate()
                        .scaleX(0.82f).scaleY(0.82f).rotation(15f).setDuration(120)
                        .withEndAction(() -> navCenterCircle.animate()
                                .scaleX(1.0f).scaleY(1.0f).rotation(0f).setDuration(180)
                                .setInterpolator(new android.view.animation.OvershootInterpolator(2.5f))
                                .start())
                        .start();
            }
            v.performHapticFeedback(android.view.HapticFeedbackConstants.VIRTUAL_KEY);
            startActivity(new Intent(MainActivity.this, WalletActivity.class));
        });
        if (navTabReports != null) navTabReports.setOnClickListener(v -> selectNavTab(2, true));
        if (navTabMore != null) navTabMore.setOnClickListener(v -> showMorePanel());

        selectNavTab(0, false);
    }

    public void selectNavTab(int tabIndex, boolean animate) {
        selectNavTab(tabIndex, animate, true);
    }

    public void selectNavTab(int tabIndex, boolean animate, boolean executeAction) {
        currentSelectedTabIndex = tabIndex;
        int activeColor = isDarkMode ? 0xFF818CF8 : 0xFF0D6EFD;
        int inactiveColor = 0xFF94A3B8;

        // Tab 0: Home
        boolean isHome = (tabIndex == 0);
        if (imgNavHome != null) imgNavHome.setColorFilter(isHome ? activeColor : inactiveColor);
        if (txtNavHome != null) {
            txtNavHome.setTextColor(isHome ? activeColor : inactiveColor);
            txtNavHome.setTypeface(null, isHome ? android.graphics.Typeface.BOLD : android.graphics.Typeface.NORMAL);
        }
        if (indicatorNavHome != null) {
            indicatorNavHome.setBackgroundResource(isHome ? R.drawable.bg_nav_active_indicator : 0);
            if (isHome && animate) animateTabSelection(imgNavHome, indicatorNavHome);
            else if (!isHome) { indicatorNavHome.setScaleX(1.0f); indicatorNavHome.setScaleY(1.0f); indicatorNavHome.setAlpha(1.0f); }
        }

        // Tab 1: Patients
        boolean isPatients = (tabIndex == 1);
        if (imgNavPatients != null) imgNavPatients.setColorFilter(isPatients ? activeColor : inactiveColor);
        if (txtNavPatients != null) {
            txtNavPatients.setTextColor(isPatients ? activeColor : inactiveColor);
            txtNavPatients.setTypeface(null, isPatients ? android.graphics.Typeface.BOLD : android.graphics.Typeface.NORMAL);
        }
        if (indicatorNavPatients != null) {
            indicatorNavPatients.setBackgroundResource(isPatients ? R.drawable.bg_nav_active_indicator : 0);
            if (isPatients && animate) animateTabSelection(imgNavPatients, indicatorNavPatients);
            else if (!isPatients) { indicatorNavPatients.setScaleX(1.0f); indicatorNavPatients.setScaleY(1.0f); indicatorNavPatients.setAlpha(1.0f); }
        }

        // Tab 2: Reports
        boolean isReports = (tabIndex == 2);
        if (imgNavReports != null) imgNavReports.setColorFilter(isReports ? activeColor : inactiveColor);
        if (txtNavReports != null) {
            txtNavReports.setTextColor(isReports ? activeColor : inactiveColor);
            txtNavReports.setTypeface(null, isReports ? android.graphics.Typeface.BOLD : android.graphics.Typeface.NORMAL);
        }
        if (indicatorNavReports != null) {
            indicatorNavReports.setBackgroundResource(isReports ? R.drawable.bg_nav_active_indicator : 0);
            if (isReports && animate) animateTabSelection(imgNavReports, indicatorNavReports);
            else if (!isReports) { indicatorNavReports.setScaleX(1.0f); indicatorNavReports.setScaleY(1.0f); indicatorNavReports.setAlpha(1.0f); }
        }

        // Tab 3: More
        if (imgNavMore != null) imgNavMore.setColorFilter(inactiveColor);
        if (txtNavMore != null) {
            txtNavMore.setTextColor(inactiveColor);
            txtNavMore.setTypeface(null, android.graphics.Typeface.NORMAL);
        }
        if (indicatorNavMore != null) indicatorNavMore.setBackgroundResource(0);

        if (!executeAction) return;

        // Action execution
        if (tabIndex == 0) {
            showNativeHome();
        } else if (tabIndex == 1) {
            startActivity(new Intent(this, PatientWorklistActivity.class));
        } else if (tabIndex == 2) {
            startActivity(new Intent(this, ReportsActivity.class));
        }
    }

    /**
     * Synchronizes the bottom navigation bar active tab state strictly to what is currently visible on screen.
     */
    public void syncNavigationState() {
        if (homeNativeManager != null && homeNativeManager.isVisible()) {
            selectNavTab(0, false, false);
        } else if (currentPath != null) {
            if (currentPath.contains("patients") || currentPath.contains("registration")) {
                selectNavTab(1, false, false);
            } else if (currentPath.contains("reports")) {
                selectNavTab(2, false, false);
            } else {
                selectNavTab(0, false, false);
            }
        } else {
            selectNavTab(0, false, false);
        }
    }

    private void animateTabSelection(View icon, View indicator) {
        if (icon != null) {
            icon.setScaleX(0.75f);
            icon.setScaleY(0.75f);
            icon.setTranslationY(0f);
            icon.animate()
                    .scaleX(1.18f)
                    .scaleY(1.18f)
                    .translationY(-dp(2.5f))
                    .setDuration(180)
                    .setInterpolator(new android.view.animation.OvershootInterpolator(2.5f))
                    .withEndAction(() -> icon.animate()
                            .scaleX(1.0f)
                            .scaleY(1.0f)
                            .translationY(0f)
                            .setDuration(120)
                            .start())
                    .start();
        }
        if (indicator != null) {
            indicator.setScaleX(0.88f);
            indicator.setScaleY(0.88f);
            indicator.setAlpha(0.4f);
            indicator.animate()
                    .scaleX(1.0f)
                    .scaleY(1.0f)
                    .alpha(1.0f)
                    .setDuration(220)
                    .setInterpolator(new android.view.animation.DecelerateInterpolator())
                    .start();
        }
    }

    private float dp(float value) {
        return TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, value, getResources().getDisplayMetrics());
    }

    private void navigate(String path) {
        if (path != null) {
            if (path.equals("/workspace/settings/notifications") || path.startsWith("/workspace/settings/notifications") || path.equals("/notifications") || path.startsWith("/notifications")) {
                startActivity(new Intent(this, NotificationsActivity.class));
                return;
            } else if (path.equals("/dashboard") || path.equals("/workspace/dashboard") || path.startsWith("/dashboard")
                    || path.equals("/workspace") || path.equals("/home") || path.equals("/")) {
                startActivity(new Intent(this, LabDashboardActivity.class));
                return;
            } else if (path.equals("/workspace/analytics") || path.startsWith("/workspace/analytics") || path.equals("/analytics") || path.startsWith("/analytics")) {
                startActivity(new Intent(this, FinancialAnalyticsActivity.class));
                return;
            } else if (path.equals("/workspace/wallet") || path.startsWith("/workspace/wallet")) {
                startActivity(new Intent(this, WalletActivity.class));
                return;
            } else if (path.equals("/workspace/registration") || path.startsWith("/workspace/registration") || path.equals("/workspace/patients/new")) {
                startActivity(new Intent(this, RegistrationActivity.class));
                return;
            } else if (path.equals("/workspace/test-management") || path.startsWith("/workspace/test-management") || path.equals("/workspace/tests")) {
                startActivity(new Intent(this, TestManagementActivity.class));
                return;
            } else if (path.equals("/workspace/billing") || path.startsWith("/workspace/billing") || path.equals("/workspace/invoices")) {
                startActivity(new Intent(this, BillingActivity.class));
                return;
            } else if (path.equals("/workspace/reports") || path.startsWith("/workspace/reports")) {
                startActivity(new Intent(this, ReportsActivity.class));
                return;
            } else if (path.equals("/workspace/samples") || path.startsWith("/workspace/samples") || path.equals("/workspace/accession")) {
                startActivity(new Intent(this, SamplesActivity.class));
                return;
            } else if (path.equals("/workspace/results") || path.startsWith("/workspace/results")) {
                startActivity(new Intent(this, ResultsActivity.class));
                return;
            } else if (path.equals("/workspace/patients") || path.startsWith("/workspace/patients")) {
                startActivity(new Intent(this, PatientWorklistActivity.class));
                return;
            } else if (path.equals("/workspace/staff") || path.startsWith("/workspace/staff")) {
                startActivity(new Intent(this, StaffManagementActivity.class));
                return;
            } else if (path.equals("/workspace/support") || path.startsWith("/workspace/support")) {
                startActivity(new Intent(this, SupportActivity.class));
                return;
            } else if (path.equals("/workspace/bookings") || path.startsWith("/workspace/bookings")
                    || path.equals("/workspace/online-booking") || path.startsWith("/workspace/online-booking")) {
                startActivity(new Intent(this, OnlineBookingActivity.class));
                return;
            } else if (path.equals("/workspace/settings/b2b-tiers") || path.startsWith("/workspace/settings/b2b-tiers")
                    || path.equals("/workspace/settings/b2b") || path.startsWith("/workspace/settings/b2b")
                    || path.equals("/workspace/b2b-tiers") || path.startsWith("/workspace/b2b-tiers")
                    || path.equals("/workspace/b2b/tiers") || path.startsWith("/workspace/b2b/tiers")
                    || path.equals("/workspace/b2b/settings") || path.startsWith("/workspace/b2b/settings")) {
                startActivity(new Intent(this, B2BSettingsActivity.class));
                return;
            } else if (path.equals("/workspace/settings/templates") || path.startsWith("/workspace/settings/templates")
                    || path.equals("/workspace/settings/report-template") || path.startsWith("/workspace/settings/report-template")
                    || path.equals("/workspace/report-template") || path.startsWith("/workspace/report-template")
                    || path.equals("/workspace/templates") || path.startsWith("/workspace/templates")) {
                startActivity(new Intent(this, ReportTemplatesActivity.class));
                return;
            } else if (path.equals("/workspace/agencies") || path.startsWith("/workspace/agencies")
                    || path.equals("/workspace/b2b") || path.startsWith("/workspace/b2b")) {
                startActivity(new Intent(this, B2BActivity.class));
                return;
            } else if (path.equals("/workspace/doctors") || path.startsWith("/workspace/doctors")) {
                startActivity(new Intent(this, ReferralDoctorsActivity.class));
                return;
            } else if (path.equals("/workspace/commissions") || path.startsWith("/workspace/commissions")) {
                startActivity(new Intent(this, CommissionsActivity.class));
                return;
            } else if (path.equals("/workspace/radiology/dashboard/appointments") || path.startsWith("/workspace/radiology/dashboard/appointments")
                    || path.equals("/workspace/radiology/appointments") || path.startsWith("/workspace/radiology/appointments")) {
                startActivity(new Intent(this, ScanScheduleActivity.class));
                return;
            } else if (path.equals("/workspace/radiology/machines") || path.startsWith("/workspace/radiology/machines")) {
                startActivity(new Intent(this, MachinesActivity.class));
                return;
            } else if (path.equals("/workspace/radiology/macros") || path.startsWith("/workspace/radiology/macros")) {
                startActivity(new Intent(this, RISMacrosActivity.class));
                return;
            } else if (path.equals("/workspace/radiology/settings/dicom") || path.startsWith("/workspace/radiology/settings/dicom")) {
                startActivity(new Intent(this, DICOMSettingsActivity.class));
                return;
            } else if (path.equals("/workspace/radiology/settings/letterhead") || path.startsWith("/workspace/radiology/settings/letterhead")) {
                startActivity(new Intent(this, RISLetterheadActivity.class));
                return;
            } else if (path.equals("/workspace/radiology/dashboard") || path.startsWith("/workspace/radiology/dashboard")
                    || path.equals("/workspace/radiology") || path.startsWith("/workspace/radiology")) {
                startActivity(new Intent(this, RISDashboardActivity.class));
                return;
            } else if (path.equals("/workspace/inventory") || path.startsWith("/workspace/inventory")) {
                startActivity(new Intent(this, InventoryActivity.class));
                return;
            } else if (path.equals("/workspace/logistics") || path.startsWith("/workspace/logistics")) {
                startActivity(new Intent(this, LogisticsActivity.class));
                return;
            } else if (path.equals("/workspace/settings/templates") || path.startsWith("/workspace/settings/templates")) {
                startActivity(new Intent(this, ReportTemplatesActivity.class));
                return;
            } else if (path.equals("/workspace/settings/branding") || path.startsWith("/workspace/settings/branding")) {
                startActivity(new Intent(this, InvoiceBrandingActivity.class));
                return;
            } else if (path.equals("/workspace/settings/payments") || path.startsWith("/workspace/settings/payments")) {
                startActivity(new Intent(this, PaymentSettingsActivity.class));
                return;
            } else if (path.equals("/workspace/settings") || path.startsWith("/workspace/settings")
                    || path.equals("/settings") || path.startsWith("/settings")) {
                startActivity(new Intent(this, ProfileSettingsActivity.class));
                return;
            }
        }
        if (offlineOverlay != null)
            offlineOverlay.setVisibility(View.GONE);
        showWebView();
        loadUrl(path);
    }

    private void showMorePanel() {
        if (homeNativeManager != null) {
            homeNativeManager.showAllModulesBottomSheet();
            return;
        }
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
                sheetView.setBackgroundTintList(
                        android.content.res.ColorStateList.valueOf(android.graphics.Color.parseColor("#0F172A")));

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
            moreScrollView = sheetView.findViewById(R.id.moreSettingsScrollView);
            containerOverview = sheetView.findViewById(R.id.containerOverview);
            containerClinical = sheetView.findViewById(R.id.containerClinical);
            containerRadiology = sheetView.findViewById(R.id.containerRadiology);
            containerLogistics = sheetView.findViewById(R.id.containerLogistics);
            containerMachine = sheetView.findViewById(R.id.containerMachine);
            containerB2B = sheetView.findViewById(R.id.containerB2B);
            containerAdmin = sheetView.findViewById(R.id.containerAdmin);
            containerLegal = sheetView.findViewById(R.id.containerLegal);

            lblOverviewHeader = sheetView.findViewById(R.id.lblOverviewHeader);
            lblClinicalHeader = sheetView.findViewById(R.id.lblClinicalHeader);
            lblRadiologyHeader = sheetView.findViewById(R.id.lblRadiologyHeader);
            lblLogisticsHeader = sheetView.findViewById(R.id.lblLogisticsHeader);
            lblMachineHeader = sheetView.findViewById(R.id.lblMachineHeader);
            lblB2BHeader = sheetView.findViewById(R.id.lblB2BHeader);
            lblAdminHeader = sheetView.findViewById(R.id.lblAdminHeader);
            lblLegalHeader = sheetView.findViewById(R.id.lblLegalHeader);

            // Logout inside bottom sheet
            android.widget.Button btnLogout = sheetView.findViewById(R.id.btnMoreLogout);
            if (btnLogout != null) {
                btnLogout.setOnClickListener(v -> {
                    moreBottomSheetDialog.dismiss();
                    confirmLogout();
                });
                int redColor = isDark ? android.graphics.Color.parseColor("#EF4444")
                        : android.graphics.Color.parseColor("#DC2626");
                btnLogout.setBackgroundTintList(android.content.res.ColorStateList.valueOf(redColor));
                btnLogout.setTypeface(android.graphics.Typeface.defaultFromStyle(android.graphics.Typeface.BOLD));
            }

            // OnDismiss resets selection
            moreBottomSheetDialog.setOnDismissListener(dialog -> {
                selectNavTab(currentSelectedTabIndex, false);
            });

            // Adjust height to 80% of screen height
            moreBottomSheetDialog.setOnShowListener(dialog -> {
                com.google.android.material.bottomsheet.BottomSheetDialog d = (com.google.android.material.bottomsheet.BottomSheetDialog) dialog;
                FrameLayout bottomSheet = d.findViewById(com.google.android.material.R.id.design_bottom_sheet);
                if (bottomSheet != null) {
                    com.google.android.material.bottomsheet.BottomSheetBehavior<FrameLayout> behavior = com.google.android.material.bottomsheet.BottomSheetBehavior
                            .from(bottomSheet);

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

    public void showNotificationsPanel() {
        startActivity(new Intent(this, NotificationsActivity.class));
    }

    private void showLegalBottomSheet() {
        final com.google.android.material.bottomsheet.BottomSheetDialog dialog = new com.google.android.material.bottomsheet.BottomSheetDialog(
                this);
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
            separator.setBackgroundColor(isDark ? android.graphics.Color.parseColor("#334155")
                    : android.graphics.Color.parseColor("#F1F5F9"));
        }

        TextView txtContent = sheetView.findViewById(R.id.txtLegalContentSheet);
        if (txtContent != null) {
            txtContent.setTextColor(isDark ? android.graphics.Color.parseColor("#CBD5E1")
                    : android.graphics.Color.parseColor("#334155"));
            String html = buildLegalHtml(isDark);
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.N) {
                txtContent.setText(android.text.Html.fromHtml(html, android.text.Html.FROM_HTML_MODE_LEGACY));
            } else {
                txtContent.setText(android.text.Html.fromHtml(html));
            }
        }

        TextView btnClose = sheetView.findViewById(R.id.btnLegalClose) instanceof TextView
                ? (TextView) sheetView.findViewById(R.id.btnLegalClose)
                : null;
        if (btnClose != null) {
            btnClose.setTextColor(isDark ? android.graphics.Color.parseColor("#818CF8")
                    : android.graphics.Color.parseColor("#4338CA"));
            btnClose.setOnClickListener(v -> dialog.dismiss());
        }

        // Cap bottom sheet at 85% screen height
        dialog.setOnShowListener(d -> {
            FrameLayout bottomSheet = dialog.findViewById(com.google.android.material.R.id.design_bottom_sheet);
            if (bottomSheet != null) {
                com.google.android.material.bottomsheet.BottomSheetBehavior<FrameLayout> behavior = com.google.android.material.bottomsheet.BottomSheetBehavior
                        .from(bottomSheet);
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
        return "<b><font color=\"" + primaryColor
                + "\">(A) Google Play Beta Testing — Terms of Service</font></b><br/><br/>" +
                "<b><font color=\"" + secondaryColor + "\">Key Summary</font></b><br/><br/>" +
                "• Diagnostics, usage, and crash reports related to your use of each Beta App will automatically be collected by Google and the Application Provider.<br/><br/>"
                +
                "• You may submit feedback, suggestions, and feature ideas to the Application Provider of the Beta App.<br/><br/>"
                +
                "• Beta Apps are pre-release software and may crash, resulting in data loss.<br/><br/>" +
                "• If you already have the production version installed, the Beta version will replace it and may overwrite app data.<br/><br/>"
                +
                "• You can opt out of Beta testing at any time by leaving the program on Google Play and reinstalling the production version.<br/><br/>"
                +
                "Your use of the Google Play Beta Testing service, including downloading any pre-release or beta-stage applications for Android (\"Beta Apps\"), is governed by these terms. The standard Google Play Terms of Service for your region are incorporated by reference.<br/><br/>"
                +
                "<b><font color=\"" + secondaryColor + "\">Beta Tester Eligibility</font></b><br/><br/>" +
                "You must meet the age requirements for Google Play in your country. If you are under 18, review this Agreement with your parent or guardian.<br/><br/>"
                +
                "The Application Provider grants you a limited, non-exclusive, non-transferable, non-sublicensable license to access, download, and use the Beta App solely for testing and evaluation purposes.<br/><br/>"
                +
                "You acknowledge that Beta Apps are pre-release, unfinished software and may contain errors. You should not use them in critical operating environments or with highly valuable data. Back up your device prior to installing any Beta App. Google and the Application Provider shall not be liable for any data loss, device damage, or service interruptions caused by your use of Beta Apps.<br/><br/>"
                +
                "<b><font color=\"" + secondaryColor + "\">No Warranty</font></b><br/><br/>" +
                "YOU EXPRESSLY ACKNOWLEDGE AND AGREE THAT USE OF THE BETA APP IS AT YOUR SOLE RISK. TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, THE BETA APP IS PROVIDED \"AS IS\" AND \"AS AVAILABLE\", WITH ALL FAULTS AND WITHOUT WARRANTY OF ANY KIND.<br/><br/>"
                +
                "<b><font color=\"" + secondaryColor + "\">Termination</font></b><br/><br/>" +
                "To terminate participation, leave the beta program in Google Play. Google and/or the Application Provider reserve the right to terminate your participation at any time.<br/><br/>"
                +
                "────────────────────────────<br/><br/>" +
                "<b><font color=\"" + primaryColor
                + "\">(B) Google LLC — Android Beta Program License Agreement</font></b><br/><br/>" +
                "<b><font color=\"" + secondaryColor + "\">Standard Software License</font></b><br/><br/>" +
                "PLEASE READ THIS LICENSE AGREEMENT CAREFULLY BEFORE INSTALLING OR USING THE SOFTWARE. BY INSTALLING AND/OR USING THE PRE-RELEASE SOFTWARE, YOU AGREE TO BE BOUND BY THE TERMS OF THIS LICENSE.<br/><br/>"
                +
                "<b>1. General.</b><br/><br/>" +
                "A. The pre-release software, APIs, documentation, and assets (collectively, the \"Beta Software\") are licensed, not sold, to you by Google LLC (\"Google\") for use only under the terms of this License.<br/><br/>"
                +
                "B. Google may make available updates or modifications to the Beta Software at its discretion. The terms of this License will govern any such updates unless accompanied by a separate license agreement.<br/><br/>"
                +
                "<b>2. Permitted Uses and Restrictions.</b><br/><br/>" +
                "A. License. You are granted a limited, non-transferable, non-exclusive license to install and use the Beta Software on compatible Android-branded devices you own or control solely for test and evaluation purposes.<br/><br/>"
                +
                "B. Restrictions. You may not: (a) copy, decompile, reverse engineer, or disassemble the Beta Software; (b) distribute, sell, lease, or rent it; or (c) demonstrate it to unauthorized individuals without prior consent.<br/><br/>"
                +
                "<b>3. Consent to Use of Data.</b><br/><br/>" +
                "A. System Diagnostics. You agree that Google and its affiliates may collect and use diagnostic, technical, usage, and crash data to facilitate system updates and improve Android products.<br/><br/>"
                +
                "B. Privacy. Google's Privacy Policy governs the collection, processing, and storage of personal data during your participation (https://policies.google.com/privacy).<br/><br/>"
                +
                "<b>4. Pre-release Software.</b><br/><br/>" +
                "Pre-release versions are time-limited and for test purposes only. They should not be relied upon to perform in the same manner as a final-release product, nor used with important data. Back up your data before installing.<br/><br/>"
                +
                "<b>5. Termination.</b><br/><br/>" +
                "This License is effective until terminated. Your rights will terminate automatically if you fail to comply with any term. Upon termination, cease all use and destroy all copies of the Beta Software.<br/><br/>"
                +
                "<b>6. Disclaimer of Warranties.</b><br/><br/>" +
                "TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, THE BETA SOFTWARE IS PROVIDED \"AS IS\" AND \"AS AVAILABLE\", WITH ALL FAULTS AND WITHOUT WARRANTY OF ANY KIND.<br/><br/>"
                +
                "<b>7. Governing Law.</b><br/><br/>" +
                "This License will be governed by the laws of the State of California. If any provision is found unenforceable, the remainder continues in full force and effect.";
    }

    private void showHelpPanel() {
        final BottomSheetDialog dialog = new BottomSheetDialog(this);
        View sheetView = getLayoutInflater().inflate(R.layout.layout_help_sheet, null);
        dialog.setContentView(sheetView);

        final boolean isDark = this.isDarkMode;
        LinearLayout root = sheetView.findViewById(R.id.helpSheetRoot);
        TextView txtTitle = sheetView.findViewById(R.id.txtHelpTitle);
        TextView txtSubtitle = sheetView.findViewById(R.id.txtHelpSubtitle);
        View divider = sheetView.findViewById(R.id.helpDivider);
        ImageView btnClose = sheetView.findViewById(R.id.btnHelpClose);

        View rowCall = sheetView.findViewById(R.id.btnHelpCall);
        View rowWhatsApp = sheetView.findViewById(R.id.btnHelpWhatsApp);
        View rowEmail = sheetView.findViewById(R.id.btnHelpEmail);
        View rowBug = sheetView.findViewById(R.id.btnHelpBug);

        TextView lblCallTitle = sheetView.findViewById(R.id.lblCallTitle);
        TextView lblWhatsAppTitle = sheetView.findViewById(R.id.lblWhatsAppTitle);
        TextView lblEmailTitle = sheetView.findViewById(R.id.lblEmailTitle);
        TextView lblBugTitle = sheetView.findViewById(R.id.lblBugTitle);

        TextView lblCallSubtitle = sheetView.findViewById(R.id.lblCallSubtitle);
        TextView lblWhatsAppSubtitle = sheetView.findViewById(R.id.lblWhatsAppSubtitle);
        TextView lblEmailSubtitle = sheetView.findViewById(R.id.lblEmailSubtitle);
        TextView lblBugSubtitle = sheetView.findViewById(R.id.lblBugSubtitle);

        if (isDark) {
            if (root != null)
                root.setBackgroundResource(R.drawable.bg_bottom_sheet_dark);
            if (txtTitle != null)
                txtTitle.setTextColor(0xFFFFFFFF);
            if (txtSubtitle != null)
                txtSubtitle.setTextColor(0xFF94A3B8);
            if (divider != null)
                divider.setBackgroundColor(0xFF334155);

            int cardBg = R.drawable.bg_help_row_dark;
            if (rowCall != null)
                rowCall.setBackgroundResource(cardBg);
            if (rowWhatsApp != null)
                rowWhatsApp.setBackgroundResource(cardBg);
            if (rowEmail != null)
                rowEmail.setBackgroundResource(cardBg);
            if (rowBug != null)
                rowBug.setBackgroundResource(cardBg);

            if (lblCallTitle != null)
                lblCallTitle.setTextColor(0xFFFFFFFF);
            if (lblWhatsAppTitle != null)
                lblWhatsAppTitle.setTextColor(0xFFFFFFFF);
            if (lblEmailTitle != null)
                lblEmailTitle.setTextColor(0xFFFFFFFF);
            if (lblBugTitle != null)
                lblBugTitle.setTextColor(0xFFFFFFFF);

            if (lblCallSubtitle != null)
                lblCallSubtitle.setTextColor(0xFF94A3B8);
            if (lblWhatsAppSubtitle != null)
                lblWhatsAppSubtitle.setTextColor(0xFF94A3B8);
            if (lblEmailSubtitle != null)
                lblEmailSubtitle.setTextColor(0xFF94A3B8);
            if (lblBugSubtitle != null)
                lblBugSubtitle.setTextColor(0xFF94A3B8);
        } else {
            if (root != null)
                root.setBackgroundResource(R.drawable.bg_bottom_sheet);
            if (txtTitle != null)
                txtTitle.setTextColor(0xFF0F172A);
            if (txtSubtitle != null)
                txtSubtitle.setTextColor(0xFF64748B);
            if (divider != null)
                divider.setBackgroundColor(0xFFE2E8F0);

            int cardBg = R.drawable.bg_help_row_light;
            if (rowCall != null)
                rowCall.setBackgroundResource(cardBg);
            if (rowWhatsApp != null)
                rowWhatsApp.setBackgroundResource(cardBg);
            if (rowEmail != null)
                rowEmail.setBackgroundResource(cardBg);
            if (rowBug != null)
                rowBug.setBackgroundResource(cardBg);

            if (lblCallTitle != null)
                lblCallTitle.setTextColor(0xFF0F172A);
            if (lblWhatsAppTitle != null)
                lblWhatsAppTitle.setTextColor(0xFF0F172A);
            if (lblEmailTitle != null)
                lblEmailTitle.setTextColor(0xFF0F172A);
            if (lblBugTitle != null)
                lblBugTitle.setTextColor(0xFF0F172A);

            if (lblCallSubtitle != null)
                lblCallSubtitle.setTextColor(0xFF64748B);
            if (lblWhatsAppSubtitle != null)
                lblWhatsAppSubtitle.setTextColor(0xFF64748B);
            if (lblEmailSubtitle != null)
                lblEmailSubtitle.setTextColor(0xFF64748B);
            if (lblBugSubtitle != null)
                lblBugSubtitle.setTextColor(0xFF64748B);
        }

        // Close button
        if (btnClose != null) {
            btnClose.setOnClickListener(v -> dialog.dismiss());
        }

        // 1. Call Support
        if (rowCall != null) {
            rowCall.setOnClickListener(v -> {
                dialog.dismiss();
                try {
                    Intent dialIntent = new Intent(Intent.ACTION_DIAL, Uri.parse("tel:+918402010207"));
                    startActivity(dialIntent);
                } catch (Exception e) {
                    ClipboardManager clipboard = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
                    if (clipboard != null) {
                        clipboard.setPrimaryClip(ClipData.newPlainText("Support Phone", "+918402010207"));
                        Toast.makeText(MainActivity.this, "Copied +91 8402010207 to clipboard", Toast.LENGTH_SHORT)
                                .show();
                    }
                }
            });
        }

        // 2. WhatsApp Support
        if (rowWhatsApp != null) {
            rowWhatsApp.setOnClickListener(v -> {
                dialog.dismiss();
                try {
                    String msg = "Hello Patholab Cloud Support, I am using the Patholab Cloud app and need assistance with my account and lab operations.";
                    String url = "https://wa.me/918402010207?text=" + URLEncoder.encode(msg, "UTF-8");
                    Intent waIntent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                    startActivity(waIntent);
                } catch (Exception e) {
                    Toast.makeText(MainActivity.this, "Could not open WhatsApp", Toast.LENGTH_SHORT).show();
                }
            });
        }

        // 3. Email Support
        if (rowEmail != null) {
            rowEmail.setOnClickListener(v -> {
                dialog.dismiss();
                String email = "support@patholab.cloud";
                String subject = "Patholab Cloud Support Request";
                String body = "Hello Support Team,\n\nI need assistance with my Patholab Cloud account.\n\nIssue Details:\n- Topic / Issue: \n- Lab Name: \n- Contact Number: \n\nPlease assist me at your earliest convenience.\n\nThank you,\nPatholab Cloud User";
                Intent emailIntent = new Intent(Intent.ACTION_SENDTO);
                emailIntent.setData(Uri.parse("mailto:" + email));
                emailIntent.putExtra(Intent.EXTRA_EMAIL, new String[] { email });
                emailIntent.putExtra(Intent.EXTRA_SUBJECT, subject);
                emailIntent.putExtra(Intent.EXTRA_TEXT, body);
                try {
                    startActivity(Intent.createChooser(emailIntent, "Email Support"));
                } catch (Exception e) {
                    ClipboardManager clipboard = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
                    if (clipboard != null) {
                        clipboard.setPrimaryClip(ClipData.newPlainText("Support Email", email));
                        Toast.makeText(MainActivity.this, "Copied support@patholab.cloud to clipboard",
                                Toast.LENGTH_LONG).show();
                    }
                }
            });
        }

        // 4. Report a Bug
        if (rowBug != null) {
            rowBug.setOnClickListener(v -> {
                dialog.dismiss();
                navigate("/workspace/support?action=new-ticket&category=TECHNICAL");
            });
        }

        dialog.show();
    }

    private void loadUrl(String path) {
        if (webView == null || path == null)
            return;

        // Never load Financial Analytics or Dashboard web page inside WebView
        if (path.equals("/workspace/analytics") || path.startsWith("/workspace/analytics")
                || path.equals("/analytics") || path.startsWith("/analytics")
                || path.equals("/dashboard") || path.startsWith("/dashboard")
                || path.equals("/workspace/dashboard") || path.startsWith("/workspace/dashboard")) {
            startActivity(new Intent(this, FinancialAnalyticsActivity.class));
            if (currentSelectedTabIndex == 0) {
                showNativeHome();
            }
            return;
        }

        if (lblHeaderTitle != null) {
            lblHeaderTitle.setText(getHeaderTitle(path));
        }
        if (path.equals(currentPath))
            return;
        currentPath = path;
        String token = AuthManager.getToken(this);
        if (token != null)
            AuthManager.syncWebViewCookie(token);

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
        if (webView == null)
            return;
        String css = "var s=document.getElementById('ptl-native-scroll-fix');" +
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
                if (walletCard != null)
                    walletCard.setVisibility(View.GONE);
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
                        java.io.BufferedReader reader = new java.io.BufferedReader(
                                new java.io.InputStreamReader(stream, "UTF-8"));
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
                            if (walletCard != null)
                                walletCard.setVisibility(View.GONE);
                        });
                    }
                } finally {
                    if (conn != null)
                        conn.disconnect();
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
        }).start();
    }

    private void updateWalletCard(double balance, boolean isOwner) {
        if (walletCard == null)
            return;
        View dividerLineTop = findViewById(R.id.dividerLineTop);
        if (!isOwner) {
            walletCard.setVisibility(View.GONE);
            if (dividerLineTop != null) {
                dividerLineTop.setVisibility(View.VISIBLE);
            }
            updateHeaderBlurHeight();
            checkAuthRedirect();
            return;
        }

        walletCard.setVisibility(View.VISIBLE);
        if (dividerLineTop != null) {
            dividerLineTop.setVisibility(View.GONE);
        }

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

        // Top Up button only appears when wallet balance is less than 49 rupees
        final boolean showTopUp = balance < 49.0;
        if (btnWalletTopUp != null) {
            btnWalletTopUp.setVisibility(showTopUp ? View.VISIBLE : View.GONE);
            if (showTopUp) {
                if (btnWalletTopUp.getAnimation() == null) {
                    android.view.animation.AlphaAnimation anim = new android.view.animation.AlphaAnimation(0.7f, 1.0f);
                    anim.setDuration(1200);
                    anim.setRepeatMode(android.view.animation.Animation.REVERSE);
                    anim.setRepeatCount(android.view.animation.Animation.INFINITE);
                    btnWalletTopUp.startAnimation(anim);
                }
            } else {
                btnWalletTopUp.clearAnimation();
            }
        }
        if (walletChevron != null) {
            walletChevron.setVisibility(showTopUp ? View.GONE : View.VISIBLE);
        }

        android.graphics.drawable.GradientDrawable gd = new android.graphics.drawable.GradientDrawable();
        String boxBgColor = this.isDarkMode ? "#0F172A" : "#111827";
        gd.setColor(android.graphics.Color.parseColor(boxBgColor));
        float density = getResources().getDisplayMetrics().density;
        gd.setCornerRadius(27 * density);
        gd.setStroke((int) (1.5 * density), strokeColor);
        walletCard.setBackground(gd);

        updateHeaderBlurHeight();
        checkAuthRedirect();
    }

    private void setupHeaderBlurAndGradient() {
        if (headerBlurGradientView == null)
            return;

        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.S) {
            try {
                headerBlurGradientView.setRenderEffect(
                        android.graphics.RenderEffect.createBlurEffect(35f, 35f,
                                android.graphics.Shader.TileMode.CLAMP));
            } catch (Exception ignored) {
            }
        }

        updateHeaderGradientBackground();
        updateHeaderBlurHeight();
    }

    private void updateHeaderGradientBackground() {
        if (headerBlurGradientView == null)
            return;

        int[] colors;
        if (isDarkMode) {
            colors = new int[] {
                    android.graphics.Color.argb(248, 15, 23, 42), // 97% opacity #0F172A (status bar top)
                    android.graphics.Color.argb(235, 15, 23, 42), // 92% opacity across header bar
                    android.graphics.Color.argb(160, 15, 23, 42), // 63% opacity entering wallet box
                    android.graphics.Color.argb(70, 15, 23, 42), // 27% opacity approaching center
                    android.graphics.Color.argb(0, 15, 23, 42) // 0% transparent at exact wallet halfway point
            };
        } else {
            colors = new int[] {
                    android.graphics.Color.argb(248, 255, 255, 255), // 97% opacity white (status bar top)
                    android.graphics.Color.argb(235, 255, 255, 255), // 92% opacity across header bar
                    android.graphics.Color.argb(160, 255, 255, 255), // 63% opacity entering wallet box
                    android.graphics.Color.argb(70, 255, 255, 255), // 27% opacity approaching center
                    android.graphics.Color.argb(0, 255, 255, 255) // 0% transparent at exact wallet halfway point
            };
        }

        android.graphics.drawable.GradientDrawable gradient = new android.graphics.drawable.GradientDrawable(
                android.graphics.drawable.GradientDrawable.Orientation.TOP_BOTTOM,
                colors);
        headerBlurGradientView.setBackground(gradient);
    }

    private void updateHeaderBlurHeight() {
        if (headerBlurGradientView == null || topLayoutContainer == null)
            return;

        topLayoutContainer.post(() -> {
            float density = getResources().getDisplayMetrics().density;
            int totalHeight;
            int topPadding = topLayoutContainer.getPaddingTop();

            if (walletCard != null && walletCard.getVisibility() == View.VISIBLE) {
                int walletHeight = (walletCard.getHeight() > 0)
                        ? walletCard.getHeight()
                        : (int) (54 * density);
                int walletTop = walletCard.getTop();
                if (walletTop <= 0) {
                    int headerHeight = (topHeaderBar != null && topHeaderBar.getHeight() > 0)
                            ? topHeaderBar.getHeight()
                            : (int) (60 * density);
                    walletTop = headerHeight + (int) (1 * density);
                }
                totalHeight = topPadding + walletTop + (walletHeight / 2);
            } else {
                int headerHeight = (topHeaderBar != null && topHeaderBar.getHeight() > 0)
                        ? topHeaderBar.getHeight()
                        : (int) (60 * density);
                totalHeight = topPadding + headerHeight;
            }

            android.view.ViewGroup.LayoutParams params = headerBlurGradientView.getLayoutParams();
            if (params != null && params.height != totalHeight) {
                params.height = totalHeight;
                headerBlurGradientView.setLayoutParams(params);
            }
        });
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

        // ── Overview ──────────────────────────────────────────────────────────
        allModules.add(new ModuleItem("Dashboard", "/workspace/analytics", "Overview",
                "Operations overview & performance tracking", R.drawable.ic_mod_clean_dashboard, false));
        allModules.add(new ModuleItem("Financial Analytics", "/workspace/analytics", "Overview",
                "Revenue reports & analytical charts", R.drawable.ic_mod_clean_analytics, false));
        allModules.add(new ModuleItem("Online Booking", "/workspace/online-booking", "Overview",
                "Manage home collections & appointments", R.drawable.ic_mod_clean_booking, true));

        // ── Clinical Operations ───────────────────────────────────────────────
        allModules.add(new ModuleItem("New Registration", "/workspace/registration", "Clinical",
                "Register patients & book new lab tests", R.drawable.ic_mod_clean_register, true));
        allModules.add(new ModuleItem("Patient Worklist", "/workspace/patients", "Clinical",
                "Patient visit queue & turnaround times", R.drawable.ic_mod_clean_worklist, false));
        allModules.add(new ModuleItem("Clinical Results", "/workspace/results", "Clinical",
                "Fill raw values & review parameters", R.drawable.ic_mod_clean_tests, false));
        allModules.add(new ModuleItem("Test Management", "/workspace/test-management", "Clinical",
                "Manage test packages, profiles & pricing", R.drawable.ic_mod_clean_tests, false));
        allModules.add(new ModuleItem("Report Dispatch", "/workspace/reports", "Clinical",
                "Sign off & dispatch PDF reports", R.drawable.ic_mod_clean_reports, false));

        // ── Inventory & Logistics ─────────────────────────────────────────────
        allModules.add(new ModuleItem("Inventory & Stock", "/workspace/inventory", "Inventory & Logistics",
                "Reagent & consumable stock tracking", R.drawable.ic_mod_clean_inventory, false));
        allModules.add(new ModuleItem("Logistics", "/workspace/logistics", "Inventory & Logistics",
                "Track specimen and sample logistics", R.drawable.ic_mod_clean_logistics, false));

        // ── Radiology (RIS) ───────────────────────────────────────────────────
        allModules.add(new ModuleItem("RIS Dashboard", "/workspace/radiology/dashboard", "Radiology",
                "Radiology Information System overview", R.drawable.ic_mod_clean_ris, false));
        allModules.add(new ModuleItem("Scan Schedule", "/workspace/radiology/dashboard/appointments", "Radiology",
                "Book & manage radiology scans", R.drawable.ic_mod_clean_scan_schedule, false));
        allModules.add(new ModuleItem("Machines", "/workspace/radiology/machines", "Radiology",
                "Configure radiology equipment & modalities", R.drawable.ic_mod_clean_machines, false));
        allModules.add(new ModuleItem("RIS Macros", "/workspace/radiology/macros", "Radiology",
                "Pre-defined reporting shortcuts & macros", R.drawable.ic_mod_clean_macros, false));
        allModules.add(new ModuleItem("DICOM Settings", "/workspace/radiology/settings/dicom", "Radiology",
                "PACS node configuration & AE titles", R.drawable.ic_mod_clean_dicom, false));
        allModules.add(new ModuleItem("RIS Letterhead", "/workspace/radiology/settings/letterhead", "Radiology",
                "Custom report letterhead & branding", R.drawable.ic_mod_clean_letterhead, false));

        // ── B2B & Growth ──────────────────────────────────────────────────────
        allModules.add(new ModuleItem("Referral Doctors", "/workspace/doctors", "B2B",
                "Track referring doctors & commission profiles", R.drawable.ic_mod_clean_doctors, false));
        allModules.add(new ModuleItem("Corporate Agencies", "/workspace/agencies", "B2B",
                "Manage corporate agency tie-ups", R.drawable.ic_mod_clean_agencies, false));
        allModules.add(new ModuleItem("Commissions Payout", "/workspace/commissions", "B2B",
                "View payout summaries for referrals", R.drawable.ic_mod_clean_payout, false));

        // ── Administration ───────────────────────────────────────────────────
        allModules.add(new ModuleItem("Lab Settings", "/workspace/settings", "Admin",
                "Configure lab profile, timings & branches", R.drawable.ic_mod_clean_settings, false));
        allModules.add(new ModuleItem("Report Templates", "/workspace/settings/templates", "Admin",
                "Design & manage report layout templates", R.drawable.ic_mod_clean_templates, false));
        allModules.add(new ModuleItem("Invoice Branding", "/workspace/settings/branding", "Admin",
                "Custom bill branding & header templates", R.drawable.ic_mod_clean_branding, false));
        allModules.add(new ModuleItem("Payment Settings", "/workspace/settings/payments", "Admin",
                "Configure QR codes & online payment gateways", R.drawable.ic_mod_clean_payment_settings, false));
        allModules.add(new ModuleItem("Notifications", "/workspace/settings/notifications", "Admin",
                "SMS, Email & WhatsApp alert configurations", R.drawable.ic_mod_clean_notifications, false));
        allModules.add(new ModuleItem("B2B Settings", "/workspace/settings/b2b", "Admin",
                "Manage outsourced labs & tier pricings", R.drawable.ic_mod_clean_b2b_settings, false));
        allModules.add(new ModuleItem("Staff Management", "/workspace/staff", "Admin",
                "Manage team roles, access keys & logs", R.drawable.ic_mod_clean_staff, false));
        allModules.add(new ModuleItem("Invoices & Payments", "/workspace/billing", "Admin",
                "Track cash flow, bills & receipts", R.drawable.ic_mod_clean_billing, false));
        allModules.add(new ModuleItem("Wallet & Billing", "/workspace/wallet", "Admin",
                "Top-up wallet & view billing history", R.drawable.ic_mod_clean_wallet, false));
        allModules.add(new ModuleItem("Wallet Recharge", "/workspace/wallet/recharge", "Admin",
                "Add credits & instant recharge packs", R.drawable.ic_mod_clean_recharge, true));
        allModules.add(new ModuleItem("Help & Support", "/workspace/support", "Admin",
                "Raise tickets & browse documentation", R.drawable.ic_mod_clean_support, false));

        // ── Legal & Agreements ────────────────────────────────────────────────
        allModules.add(new ModuleItem("Terms & Conditions", "https://patholab.cloud/terms-and-conditions/", "Legal",
                "Platform license, SLA & customer rights", R.drawable.ic_legal, false));
        allModules.add(new ModuleItem("Privacy & Health Data", "https://patholab.cloud/privacy-policy/", "Legal",
                "Patient confidentiality & HIPAA/DISHA standards", R.drawable.ic_legal, false));
        allModules.add(new ModuleItem("Refund & Cancellation", "https://patholab.cloud/refund-and-cancellation/", "Legal",
                "Subscription renewals & pro-rata settlements", R.drawable.ic_legal, false));
    }

    private void renderModules() {
        if (containerOverview == null)
            return;

        containerOverview.removeAllViews();
        containerClinical.removeAllViews();
        containerLogistics.removeAllViews();
        containerMachine.removeAllViews();
        containerB2B.removeAllViews();
        containerAdmin.removeAllViews();
        containerLegal.removeAllViews();

        final boolean isDark = this.isDarkMode;
        int headerColor = isDark ? android.graphics.Color.parseColor("#818CF8")
                : android.graphics.Color.parseColor("#4338CA");
        if (lblOverviewHeader != null)
            lblOverviewHeader.setTextColor(headerColor);
        if (lblClinicalHeader != null)
            lblClinicalHeader.setTextColor(headerColor);
        if (lblRadiologyHeader != null)
            lblRadiologyHeader.setTextColor(headerColor);
        if (lblLogisticsHeader != null)
            lblLogisticsHeader.setTextColor(headerColor);
        if (lblMachineHeader != null)
            lblMachineHeader.setTextColor(headerColor);
        if (lblB2BHeader != null)
            lblB2BHeader.setTextColor(headerColor);
        if (lblAdminHeader != null)
            lblAdminHeader.setTextColor(headerColor);
        if (lblLegalHeader != null)
            lblLegalHeader.setTextColor(headerColor);

        int overviewCount = 0, clinicalCount = 0, logisticsCount = 0;
        int machineCount = 0, b2bCount = 0, adminCount = 0, legalCount = 0;
        int radiologyCount = 0;

        for (final ModuleItem item : allModules) {
            View row = LayoutInflater.from(this).inflate(R.layout.layout_setting_item, null);
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT);
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
                row.setBackgroundTintList(
                        android.content.res.ColorStateList.valueOf(android.graphics.Color.parseColor("#1E293B")));
                tvTitle.setTextColor(android.graphics.Color.parseColor("#FFFFFF"));
                tvDesc.setTextColor(android.graphics.Color.parseColor("#94A3B8"));
                if (ivChevron != null)
                    ivChevron.setColorFilter(android.graphics.Color.parseColor("#64748B"));
                if (ivIcon != null)
                    ivIcon.setColorFilter(android.graphics.Color.parseColor("#818CF8")); // Indigo-400
            } else {
                row.setBackgroundTintList(null);
                tvTitle.setTextColor(android.graphics.Color.parseColor("#0F172A"));
                tvDesc.setTextColor(android.graphics.Color.parseColor("#64748B"));
                if (ivChevron != null)
                    ivChevron.clearColorFilter();
                if (ivIcon != null)
                    ivIcon.clearColorFilter();
            }

            boolean hasOpened = prefs.getBoolean("opened_" + item.path, false);
            badge.setVisibility((item.isNew && !hasOpened) ? View.VISIBLE : View.GONE);

            row.setOnClickListener(v -> {
                prefs.edit().putBoolean("opened_" + item.path, true).apply();
                badge.setVisibility(View.GONE);

                if (moreBottomSheetDialog != null) {
                    moreBottomSheetDialog.dismiss();
                }

                if (item.path.startsWith("http://") || item.path.startsWith("https://")) {
                    try {
                        Intent browserIntent = new Intent(Intent.ACTION_VIEW, Uri.parse(item.path));
                        startActivity(browserIntent);
                    } catch (Exception e) {
                        e.printStackTrace();
                    }
                } else if (item.path.equals("/legal") || item.path.contains("terms") || item.path.contains("privacy")
                        || item.path.contains("refund")) {
                    String url = "https://patholab.cloud/terms-and-conditions/";
                    if (item.path.contains("privacy")) {
                        url = "https://patholab.cloud/privacy-policy/";
                    } else if (item.path.contains("refund")) {
                        url = "https://patholab.cloud/refund-and-cancellation/";
                    } else if (item.path.contains("terms")) {
                        url = "https://patholab.cloud/terms-and-conditions/";
                    }
                    try {
                        Intent browserIntent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                        startActivity(browserIntent);
                    } catch (Exception e) {
                        e.printStackTrace();
                    }
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
        if (lblRadiologyHeader != null)
            lblRadiologyHeader.setVisibility(radiologyCount > 0 ? View.VISIBLE : View.GONE);
        if (containerRadiology != null)
            containerRadiology.setVisibility(radiologyCount > 0 ? View.VISIBLE : View.GONE);
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
                    HomeNativeManager.resetSession();
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
    public void onResume() {
        super.onResume();
        if (!AuthManager.hasToken(this)) {
            Intent intent = new Intent(this, LoginActivity.class);
            intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
            startActivity(intent);
            finish();
            return;
        }

        // Resume handlers only when foregrounded
        authCheckHandler.removeCallbacks(authCheckRunnable);
        authCheckHandler.post(authCheckRunnable);
        walletHandler.removeCallbacks(walletRunnable);
        walletHandler.post(walletRunnable);
        progressPollHandler.removeCallbacks(progressPollRunnable);
        progressPollHandler.post(progressPollRunnable);

        // Always synchronize navigation bar state to the screen currently visible
        syncNavigationState();

        fetchWalletDetails();
        fetchNotificationCount();
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        syncNavigationState();
    }

    @Override
    public void onPause() {
        super.onPause();
        // Crucial: Stop all background polling when app is paused/backgrounded so it never pops up LoginActivity
        authCheckHandler.removeCallbacksAndMessages(null);
        walletHandler.removeCallbacksAndMessages(null);
        progressPollHandler.removeCallbacksAndMessages(null);
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
            new Handler(Looper.getMainLooper()).postDelayed(this::syncNavigationState, 250);
        } else if (homeNativeManager != null && !homeNativeManager.isVisible()) {
            showNativeHome();
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
        floatingNavBarCard = null;
        navTabHome = null;
        navTabPatients = null;
        navTabCenter = null;
        navTabReports = null;
        navTabMore = null;
        indicatorNavHome = null;
        indicatorNavPatients = null;
        indicatorNavReports = null;
        indicatorNavMore = null;
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
            title = t;
            path = p;
            category = c;
            desc = d;
            iconRes = icon;
            isNew = n;
        }
    }

    private String getHeaderTitle(String path) {
        if (path.contains("analytics"))
            return "Financial Analytics";
        if (path.contains("patients"))
            return "Patient Worklist";
        if (path.contains("test-management"))
            return "Categories";
        if (path.contains("bookings"))
            return "Online Bookings";
        if (path.contains("registration"))
            return "Registration";
        if (path.contains("results"))
            return "Clinical Results";
        if (path.contains("patients"))
            return "Patient Worklist";
        if (path.contains("reports"))
            return "Report Dispatch";
        if (path.contains("inventory"))
            return "Inventory & Stock";
        if (path.contains("logistics"))
            return "Logistics & Trips";
        if (path.contains("analyzers"))
            return "Analyzer";
        if (path.contains("support"))
            return "Help & Support";
        if (path.contains("billing"))
            return "Invoices & Payments";
        if (path.contains("expenses"))
            return "Expenses";
        if (path.contains("settings"))
            return "Lab Settings";
        if (path.contains("audit-logs"))
            return "Audit Logs";
        if (path.contains("wallet"))
            return "Wallet & Billing";
        return "Dashboard";
    }

    private void applySkeletonTheme(View view, boolean isDark) {
        if (view == null)
            return;
        if (view instanceof android.view.ViewGroup) {
            android.view.ViewGroup group = (android.view.ViewGroup) view;
            android.graphics.drawable.Drawable bg = group.getBackground();
            if (bg != null) {
                if (isDark) {
                    bg.setColorFilter(android.graphics.Color.parseColor("#1E293B"),
                            android.graphics.PorterDuff.Mode.SRC_IN);
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
                    bg.setColorFilter(android.graphics.Color.parseColor("#334155"),
                            android.graphics.PorterDuff.Mode.SRC_IN);
                } else {
                    bg.clearColorFilter();
                }
            }
        }
    }

    private void showSkeletonForPath(String path) {
        if (path == null)
            path = "";
        String p = path.toLowerCase();

        String category = "dashboard";
        if (p.contains("analytics") || p.contains("finance") || p.equals("/") || p.contains("dashboard")
                || (p.contains("workspace") && !p.contains("/"))) {
            category = "dashboard";
        } else if (p.contains("registration") || p.contains("create") || p.contains("new") || p.contains("edit")
                || p.contains("add-")) {
            category = "form";
        } else if (p.contains("invoice") || p.contains("print") || p.contains("receipt") || p.contains("report-view")
                || p.contains("detail")) {
            category = "detail";
        } else if (p.contains("categories") || p.contains("catalog") || p.contains("analyzers")
                || p.contains("machines") || p.contains("inventory") || p.contains("b2b")) {
            category = "grid";
        } else if (p.contains("settings") || p.contains("wallet") || p.contains("support") || p.contains("config")
                || p.contains("profile") || p.contains("security")) {
            category = "settings";
        } else if (p.contains("patients") || p.contains("results") || p.contains("reports") || p.contains("worklist")
                || p.contains("bookings") || p.contains("audit") || p.contains("staff") || p.contains("doctors")
                || p.contains("expenses")) {
            category = "list";
        }

        if (category.equals(activeSkeletonCategory) && skeletonContainer != null
                && skeletonContainer.getVisibility() == View.VISIBLE) {
            return;
        }
        activeSkeletonCategory = category;

        View sDash = findViewById(R.id.skeletonDashboard);
        View sPatients = findViewById(R.id.skeletonPatients);
        View sReports = findViewById(R.id.skeletonReports);
        View sBilling = findViewById(R.id.skeletonBilling);
        View sSettings = findViewById(R.id.skeletonSettings);
        View sForm = findViewById(R.id.skeletonForm);

        if (sDash != null)
            sDash.setVisibility(View.GONE);
        if (sPatients != null)
            sPatients.setVisibility(View.GONE);
        if (sReports != null)
            sReports.setVisibility(View.GONE);
        if (sBilling != null)
            sBilling.setVisibility(View.GONE);
        if (sSettings != null)
            sSettings.setVisibility(View.GONE);
        if (sForm != null)
            sForm.setVisibility(View.GONE);

        View activeSkeleton = sDash;
        switch (category) {
            case "dashboard":
                activeSkeleton = sDash;
                break;
            case "patients":
            case "list":
                activeSkeleton = sPatients != null ? sPatients : sDash;
                break;
            case "reports":
            case "detail":
                activeSkeleton = sReports != null ? sReports : sDash;
                break;
            case "billing":
            case "grid":
                activeSkeleton = sBilling != null ? sBilling : sDash;
                break;
            case "form":
                activeSkeleton = sForm != null ? sForm : sDash;
                break;
            case "settings":
                activeSkeleton = sSettings != null ? sSettings : sDash;
                break;
        }

        if (activeSkeleton != null) {
            activeSkeleton.setVisibility(View.VISIBLE);
        }

        final boolean isDark = this.isDarkMode;
        if (skeletonContainer != null) {
            skeletonContainer.setBackgroundColor(isDark ? android.graphics.Color.parseColor("#0F172A")
                    : android.graphics.Color.parseColor("#F8FAFC"));
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

            // Hard safety timeout: auto-hide skeleton after at most 1.5s
            skeletonContainer.postDelayed(() -> {
                hideSkeleton();
            }, 1500);
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
    private final Runnable bellAnimationRunnable=new Runnable(){@Override public void run(){ImageView bellImg=findViewById(R.id.imgHeaderBell);TextView badge=findViewById(R.id.txtNotificationBadge);if(bellImg!=null&&badge!=null&&badge.getVisibility()==View.VISIBLE){
    // Pivot swing from the top of the bell
    bellImg.setPivotX(bellImg.getWidth()/2f);bellImg.setPivotY(bellImg.getHeight()*0.15f);

    bellImg.animate().rotation(-18f).setDuration(120).withEndAction(()->{bellImg.animate().rotation(16f).setDuration(120).withEndAction(()->{bellImg.animate().rotation(-12f).setDuration(120).withEndAction(()->{bellImg.animate().rotation(10f).setDuration(120).withEndAction(()->{bellImg.animate().rotation(-6f).setDuration(120).withEndAction(()->{bellImg.animate().rotation(4f).setDuration(120).withEndAction(()->{bellImg.animate().rotation(0f).setDuration(120).start();}).start();}).start();}).start();}).start();}).start();}).start();

    // Synchronized badge pulse
    badge.animate().scaleX(1.25f).scaleY(1.25f).setDuration(220).withEndAction(()->{badge.animate().scaleX(1.0f).scaleY(1.0f).setDuration(220).start();}).start();}bellAnimationHandler.postDelayed(this,3500);}};

    private void startBellAnimationLoop() {
        runOnUiThread(() -> {
            if (isBellAnimationRunning)
                return;
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
            TextView badge = findViewById(R.id.txtNotificationBadge);
            if (badge != null) {
                badge.animate().cancel();
                badge.setScaleX(1.0f);
                badge.setScaleY(1.0f);
            }
        });
    }

    private void fetchNotificationCount() {
        final String token = AuthManager.getToken(this);
        if (token == null || token.isEmpty()) {
            runOnUiThread(() -> {
                TextView badge = findViewById(R.id.txtNotificationBadge);
                if (badge != null)
                    badge.setVisibility(View.GONE);
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
                if (cookie != null)
                    conn.setRequestProperty("Cookie", cookie);
                conn.setConnectTimeout(8000);
                conn.setReadTimeout(8000);

                int code = conn.getResponseCode();
                if (code >= 200 && code < 300) {
                    java.io.InputStream stream = conn.getInputStream();
                    java.io.BufferedReader reader = new java.io.BufferedReader(
                            new java.io.InputStreamReader(stream, "UTF-8"));
                    StringBuilder sb = new StringBuilder();
                    String line;
                    while ((line = reader.readLine()) != null)
                        sb.append(line);
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
                                badge.setText(finalUnreadCount > 9 ? "+9" : String.valueOf(finalUnreadCount));
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
            java.text.SimpleDateFormat sdf = new java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSSZ",
                    java.util.Locale.US);
            return sdf.parse(clean).getTime();
        } catch (Exception e) {
            try {
                String clean = isoString.replaceAll("Z$", "+0000");
                java.text.SimpleDateFormat sdf = new java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ssZ",
                        java.util.Locale.US);
                return sdf.parse(clean).getTime();
            } catch (Exception ex) {
                return 0L;
            }
        }
    }
}