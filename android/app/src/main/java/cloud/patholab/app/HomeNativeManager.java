package cloud.patholab.app;

import android.animation.Animator;
import android.animation.AnimatorListenerAdapter;
import android.animation.AnimatorSet;
import android.animation.ObjectAnimator;
import android.animation.ValueAnimator;
import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.graphics.drawable.ColorDrawable;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.NetworkRequest;
import android.net.Uri;
import android.os.Handler;
import android.os.Looper;
import android.util.Base64;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.view.animation.AccelerateDecelerateInterpolator;
import android.webkit.CookieManager;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.PopupWindow;
import android.widget.TextView;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Locale;

import cloud.patholab.app.auth.AuthManager;
import cloud.patholab.app.auth.LoginActivity;

/**
 * HomeNativeManager
 * ─────────────────
 * Controls the fully-native Home Screen injected into activity_main.xml.
 * No WebView involved for rendering the home screen.
 * Data is fetched directly from the Patholab REST API.
 */
public class HomeNativeManager {

    // ── Static config ─────────────────────────────────────────────────────────
    private static final String BASE_URL = "https://app.patholab.cloud";

    // ── Dependencies ──────────────────────────────────────────────────────────
    private final Context ctx;
    private final SharedPreferences prefs;
    private final View homeRoot;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    // ── Views ─────────────────────────────────────────────────────────────────
    private TextView txtGreeting;
    private TextView homeWaveEmoji;
    private TextView txtWalletBalance;
    private FrameLayout walletPill;
    private FrameLayout bellBtn;
    private ImageView bellIcon;
    private View bellDot;
    private View avatarContainer;
    private TextView avatarInitial;
    private ImageView avatarImage;
    private View statusDot;
    private View statusWave;
    private LinearLayout worklistContainer;
    private LinearLayout bannerDots;
    private TextView bannerTitle;
    private TextView bannerSubtitle;
    private android.widget.Button bannerCta;
    private FrameLayout bannerCard;

    // ── Cached user details ───────────────────────────────────────────────────
    private String currentFullName = "User";
    private String currentEmail = "";
    private String currentRole = "Lab Owner";

    // ── Network Connectivity & Status Dot Animation ────────────────────────────
    private boolean isNetworkOnline = true;
    private AnimatorSet statusDotPulseAnim;

    // ── Animation state ───────────────────────────────────────────────────────
    private ObjectAnimator bellAnimator;
    private final Handler bellLoopHandler = new Handler(Looper.getMainLooper());
    private Runnable bellLoopRunnable;
    private boolean isBellAnimationActive = true;

    // ── Carousel state ────────────────────────────────────────────────────────
    private int currentBannerIdx = 0;
    private final Handler carouselHandler = new Handler(Looper.getMainLooper());
    private Runnable carouselRunnable;

    // ── Banner data ───────────────────────────────────────────────────────────
    private static final String[][] BANNERS = {
            {"₹2.5 Per\nRegistration",
                    "Cloud reporting, instant WhatsApp sharing & B2B automation at the lowest cost.",
                    "Recharge Now →",
                    "/workspace/wallet?action=topup"},
            {"Instant WhatsApp\nDelivery",
                    "Send diagnostic reports directly to patients on WhatsApp with one tap.",
                    "Explore Now →",
                    "/workspace/reports"},
            {"Automated\nLab Billing",
                    "Generate GST-compliant invoices and track pending dues effortlessly.",
                    "View Billing →",
                    "/workspace/billing"},
    };

    // ── Polling handlers ──────────────────────────────────────────────────────
    private final Handler pollHandler = new Handler(Looper.getMainLooper());
    private Runnable pollRunnable;

    // ── Listener for navigation events ───────────────────────────────────────
    public interface NavigationListener {
        void onNavigateTo(String path);
    }
    private final NavigationListener navListener;

    // ─────────────────────────────────────────────────────────────────────────
    //  Constructor
    // ─────────────────────────────────────────────────────────────────────────
    public HomeNativeManager(Context ctx, View homeRoot, SharedPreferences prefs,
                             NavigationListener navListener) {
        this.ctx = ctx;
        this.homeRoot = homeRoot;
        this.prefs = prefs;
        this.navListener = navListener;
        bindViews();
        setupModuleClicks();
        buildBannerDots();
        startCarousel();
        loadUserInfo();
        fetchWalletBalance();
        fetchTodaysWorklist();
        startBellPeriodicAnimationLoop();
        playWaveAnimation();
        initConnectivityMonitor();
        startPeriodicPolling();
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  View binding
    // ─────────────────────────────────────────────────────────────────────────
    private void bindViews() {
        txtGreeting       = homeRoot.findViewById(R.id.homeGreeting);
        homeWaveEmoji     = homeRoot.findViewById(R.id.homeWaveEmoji);
        txtWalletBalance  = homeRoot.findViewById(R.id.homeWalletBalance);
        walletPill        = homeRoot.findViewById(R.id.homeWalletPill);
        bellBtn           = homeRoot.findViewById(R.id.homeBellBtn);
        bellIcon          = homeRoot.findViewById(R.id.homeBellIcon);
        bellDot           = homeRoot.findViewById(R.id.homeBellDot);
        avatarContainer   = homeRoot.findViewById(R.id.homeAvatarContainer);
        avatarInitial     = homeRoot.findViewById(R.id.homeAvatarInitial);
        avatarImage       = homeRoot.findViewById(R.id.homeAvatarImage);
        statusDot         = homeRoot.findViewById(R.id.homeStatusDot);
        statusWave        = homeRoot.findViewById(R.id.homeStatusWave);
        worklistContainer = homeRoot.findViewById(R.id.homeWorklistContainer);
        bannerDots        = homeRoot.findViewById(R.id.homeBannerDots);
        bannerTitle       = homeRoot.findViewById(R.id.homeBannerTitle);
        bannerSubtitle    = homeRoot.findViewById(R.id.homeBannerSubtitle);
        bannerCta         = homeRoot.findViewById(R.id.homeBannerCta);
        bannerCard        = homeRoot.findViewById(R.id.homeBannerCard);

        // Adjust top padding for system status bar / notch dynamically
        View homeHeader = homeRoot.findViewById(R.id.homeHeader);
        if (homeHeader != null) {
            homeHeader.setOnApplyWindowInsetsListener((v, insets) -> {
                int topInset = insets.getSystemWindowInsetTop();
                int targetTop = Math.max(dp(54), topInset + dp(10));
                v.setPadding(v.getPaddingStart(), targetTop, v.getPaddingEnd(), dp(36));
                return insets;
            });
        }

        // Profile Avatar tap → Show modern popup menu (Profile Settings & Sign Out)
        if (avatarContainer != null) {
            avatarContainer.setOnClickListener(v -> showProfilePopupMenu(avatarContainer));
        }

        // Wallet pill tap → navigate to native WalletActivity
        if (walletPill != null) {
            walletPill.setOnClickListener(v -> {
                Intent intent = new Intent(ctx, WalletActivity.class);
                ctx.startActivity(intent);
            });
        }

        // Bell tap → navigate to reports/notifications in webview
        if (bellBtn != null) {
            bellBtn.setOnClickListener(v -> {
                if (bellDot != null) bellDot.setVisibility(View.GONE);
                if (navListener != null) navListener.onNavigateTo("/workspace/reports");
            });
        }

        // "See all" modules → 85% Height Bottom Sheet Modal
        View seeAll = homeRoot.findViewById(R.id.homeSeeAllModules);
        if (seeAll != null) {
            seeAll.setOnClickListener(v -> showAllModulesBottomSheet());
        }

        // "View All" worklist
        View viewAll = homeRoot.findViewById(R.id.homeViewAllWorklist);
        if (viewAll != null) {
            viewAll.setOnClickListener(v -> {
                if (navListener != null) navListener.onNavigateTo("/workspace/patients");
            });
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Profile Avatar Popup Menu (Profile Settings & Sign Out)
    // ─────────────────────────────────────────────────────────────────────────
    private void showProfilePopupMenu(View anchor) {
        try {
            LayoutInflater inflater = LayoutInflater.from(ctx);
            View popupView = inflater.inflate(R.layout.layout_profile_popup, null);

            PopupWindow popup = new PopupWindow(
                    popupView,
                    dp(230),
                    ViewGroup.LayoutParams.WRAP_CONTENT,
                    true
            );
            popup.setBackgroundDrawable(new ColorDrawable(Color.TRANSPARENT));
            popup.setElevation(dp(14));
            popup.setOutsideTouchable(true);

            // Populate user details inside popup
            TextView tvInitial = popupView.findViewById(R.id.popupAvatarInitial);
            TextView tvName    = popupView.findViewById(R.id.popupUserName);
            TextView tvRole    = popupView.findViewById(R.id.popupUserRole);

            String smartFirst = formatSmartFirstName(currentFullName);
            String initial = !smartFirst.isEmpty() ? String.valueOf(smartFirst.charAt(0)).toUpperCase() : "U";

            if (tvInitial != null) tvInitial.setText(initial);
            if (tvName != null) tvName.setText(currentFullName);
            if (tvRole != null) tvRole.setText(currentRole);

            // Option 1: Profile Settings
            View btnSettings = popupView.findViewById(R.id.popupBtnProfileSettings);
            if (btnSettings != null) {
                btnSettings.setOnClickListener(v -> {
                    popup.dismiss();
                    Intent intent = new Intent(ctx, ProfileSettingsActivity.class);
                    ctx.startActivity(intent);
                });
            }

            // Option 2: Sign Out
            View btnSignOut = popupView.findViewById(R.id.popupBtnSignOut);
            if (btnSignOut != null) {
                btnSignOut.setOnClickListener(v -> {
                    popup.dismiss();
                    performSignOut();
                });
            }

            // Show below avatar
            popup.showAsDropDown(anchor, 0, dp(8));

        } catch (Exception ignored) {}
    }

    private void performSignOut() {
        AuthManager.clearSession(ctx);
        if (prefs != null) prefs.edit().clear().apply();
        try {
            ctx.getSharedPreferences("patholab_auth_prefs", Context.MODE_PRIVATE).edit().clear().apply();
            ctx.getSharedPreferences("patholab_general_prefs", Context.MODE_PRIVATE).edit().clear().apply();
        } catch (Exception ignored) {}

        try {
            CookieManager.getInstance().removeAllCookies(null);
            CookieManager.getInstance().flush();
        } catch (Exception ignored) {}

        Intent intent = new Intent(ctx, LoginActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
        ctx.startActivity(intent);

        if (ctx instanceof Activity) {
            ((Activity) ctx).finish();
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  All Modules Bottom Sheet (Takes 85% of screen height with Cross Close button)
    // ─────────────────────────────────────────────────────────────────────────
    private void showAllModulesBottomSheet() {
        try {
            com.google.android.material.bottomsheet.BottomSheetDialog sheet =
                    new com.google.android.material.bottomsheet.BottomSheetDialog(ctx);

            View sheetView = LayoutInflater.from(ctx).inflate(R.layout.layout_all_modules_sheet, null);
            sheet.setContentView(sheetView);

            // Set height to 85% of screen height
            int screenHeight = ctx.getResources().getDisplayMetrics().heightPixels;
            int sheetHeight = (int) (screenHeight * 0.85);

            FrameLayout bottomSheet = sheet.findViewById(com.google.android.material.R.id.design_bottom_sheet);
            if (bottomSheet != null) {
                bottomSheet.setBackground(new ColorDrawable(Color.TRANSPARENT));
                com.google.android.material.bottomsheet.BottomSheetBehavior<FrameLayout> behavior =
                        com.google.android.material.bottomsheet.BottomSheetBehavior.from(bottomSheet);
                behavior.setPeekHeight(sheetHeight);
                behavior.setState(com.google.android.material.bottomsheet.BottomSheetBehavior.STATE_EXPANDED);
                ViewGroup.LayoutParams lp = bottomSheet.getLayoutParams();
                lp.height = sheetHeight;
                bottomSheet.setLayoutParams(lp);
            }

            // Cross / Close button click
            View btnClose = sheetView.findViewById(R.id.btnCrossClose);
            if (btnClose != null) {
                btnClose.setOnClickListener(v -> sheet.dismiss());
            }

            // Populate Dynamic Recently Used Modules
            populateRecentlyUsedModules(sheet, sheetView);

            // Bind all 16 module click listeners with Recents Tracking
            bindSheetModule(sheet, sheetView, R.id.sheetModRegister,   "Register",  "/workspace/registration",   "ic_mod_registration", "bg_mod_icon_blue");
            bindSheetModule(sheet, sheetView, R.id.sheetModTests,      "Tests",     "/workspace/test-management","ic_mod_tests",        "bg_mod_icon_purple");
            bindSheetModule(sheet, sheetView, R.id.sheetModBilling,    "Billing",   "/workspace/billing",        "ic_mod_billing",      "bg_mod_icon_emerald");
            bindSheetModule(sheet, sheetView, R.id.sheetModReports,    "Reports",   "/workspace/reports",        "ic_mod_reports",      "bg_mod_icon_sky");
            bindSheetModule(sheet, sheetView, R.id.sheetModSamples,    "Samples",   "/workspace/accession",      "ic_mod_samples",      "bg_mod_icon_rose");
            bindSheetModule(sheet, sheetView, R.id.sheetModWhatsapp,   "WhatsApp",  "/workspace/reports",        "ic_mod_whatsapp",     "bg_mod_icon_green");
            bindSheetModule(sheet, sheetView, R.id.sheetModLogistics,  "Logistics", "/workspace/logistics",      "ic_mod_logistics",    "bg_mod_icon_amber");
            bindSheetModule(sheet, sheetView, R.id.sheetModWallet,     "Wallet",    "/workspace/wallet",         "ic_mod_wallet",       "bg_mod_icon_indigo");
            bindSheetModule(sheet, sheetView, R.id.sheetModInventory,  "Inventory", "/workspace/inventory",      "ic_box",              "bg_mod_icon_teal");
            bindSheetModule(sheet, sheetView, R.id.sheetModRadiology,  "Radiology", "/workspace/radiology",      "ic_flask",            "bg_mod_icon_purple");
            bindSheetModule(sheet, sheetView, R.id.sheetModAnalyzers,  "Analyzers", "/workspace/analyzers",      "ic_cpu",              "bg_mod_icon_sky");
            bindSheetModule(sheet, sheetView, R.id.sheetModAgencies,   "Agencies",  "/workspace/agencies",       "ic_card",             "bg_mod_icon_orange");
            bindSheetModule(sheet, sheetView, R.id.sheetModDoctors,    "Doctors",   "/workspace/doctors",        "ic_stethoscope",      "bg_mod_icon_blue");
            bindSheetModule(sheet, sheetView, R.id.sheetModPatients,   "Patients",  "/workspace/patients",       "ic_user",             "bg_mod_icon_fuchsia");
            bindSheetModule(sheet, sheetView, R.id.sheetModAnalytics,  "Analytics", "/workspace/analytics",      "ic_chart",            "bg_mod_icon_emerald");

            View modSettings = sheetView.findViewById(R.id.sheetModSettings);
            if (modSettings != null) {
                modSettings.setOnClickListener(v -> {
                    recordRecentModule("Settings", "/workspace/settings", "ic_gear", "bg_mod_icon_indigo");
                    sheet.dismiss();
                    Intent intent = new Intent(ctx, ProfileSettingsActivity.class);
                    ctx.startActivity(intent);
                });
            }

            sheet.show();

        } catch (Exception ignored) {}
    }

    private void populateRecentlyUsedModules(com.google.android.material.bottomsheet.BottomSheetDialog sheet, View sheetView) {
        LinearLayout recentsContainer = sheetView.findViewById(R.id.recentsContainer);
        if (recentsContainer == null) return;
        recentsContainer.removeAllViews();

        JSONArray recents = getRecentModules();
        if (recents == null || recents.length() == 0) {
            recents = getDefaultRecents();
        }

        for (int i = 0; i < recents.length(); i++) {
            JSONObject item = recents.optJSONObject(i);
            if (item == null) continue;
            final String name = item.optString("name", "");
            final String path = item.optString("path", "");
            final String iconName = item.optString("icon", "ic_mod_registration");
            final String bgName = item.optString("bg", "bg_mod_icon_blue");

            int iconRes = ctx.getResources().getIdentifier(iconName, "drawable", ctx.getPackageName());
            int bgRes = ctx.getResources().getIdentifier(bgName, "drawable", ctx.getPackageName());
            if (iconRes == 0) iconRes = R.drawable.ic_mod_registration;
            if (bgRes == 0) bgRes = R.drawable.bg_mod_icon_blue;

            // Compact Chip Card
            LinearLayout chip = new LinearLayout(ctx);
            chip.setOrientation(LinearLayout.HORIZONTAL);
            chip.setGravity(android.view.Gravity.CENTER_VERTICAL);
            chip.setBackgroundResource(R.drawable.bg_module_card_ripple);
            chip.setPadding(dp(8), dp(6), dp(12), dp(6));
            chip.setElevation(dp(1));
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                    ViewGroup.LayoutParams.WRAP_CONTENT,
                    ViewGroup.LayoutParams.WRAP_CONTENT
            );
            lp.setMarginEnd(dp(8));
            chip.setLayoutParams(lp);

            // Icon Frame
            FrameLayout iconFrame = new FrameLayout(ctx);
            iconFrame.setLayoutParams(new LinearLayout.LayoutParams(dp(32), dp(32)));
            iconFrame.setBackgroundResource(bgRes);

            ImageView iv = new ImageView(ctx);
            FrameLayout.LayoutParams ivLp = new FrameLayout.LayoutParams(dp(18), dp(18));
            ivLp.gravity = android.view.Gravity.CENTER;
            iv.setLayoutParams(ivLp);
            iv.setImageResource(iconRes);
            iconFrame.addView(iv);

            // Label
            TextView tv = new TextView(ctx);
            LinearLayout.LayoutParams tvLp = new LinearLayout.LayoutParams(
                    ViewGroup.LayoutParams.WRAP_CONTENT,
                    ViewGroup.LayoutParams.WRAP_CONTENT
            );
            tvLp.setMarginStart(dp(8));
            tv.setLayoutParams(tvLp);
            tv.setText(name);
            tv.setTextSize(12f);
            tv.setTypeface(null, android.graphics.Typeface.BOLD);
            tv.setTextColor(0xFF0F172A);

            chip.addView(iconFrame);
            chip.addView(tv);

            chip.setOnClickListener(v -> {
                recordRecentModule(name, path, iconName, bgName);
                sheet.dismiss();
                if (path.equals("/workspace/settings")) {
                    ctx.startActivity(new Intent(ctx, ProfileSettingsActivity.class));
                } else if (path.equals("/workspace/wallet") || path.startsWith("/workspace/wallet")) {
                    ctx.startActivity(new Intent(ctx, WalletActivity.class));
                } else if (path.equals("/workspace/registration") || path.startsWith("/workspace/registration") || path.equals("/workspace/patients/new")) {
                    ctx.startActivity(new Intent(ctx, RegistrationActivity.class));
                } else if (navListener != null) {
                    navListener.onNavigateTo(path);
                }
            });

            recentsContainer.addView(chip);
        }
    }

    private JSONArray getRecentModules() {
        if (prefs == null) return new JSONArray();
        String json = prefs.getString("recent_modules_json", "");
        try {
            if (!json.isEmpty()) return new JSONArray(json);
        } catch (Exception ignored) {}
        return new JSONArray();
    }

    private JSONArray getDefaultRecents() {
        JSONArray arr = new JSONArray();
        try {
            arr.put(new JSONObject().put("name", "Register").put("path", "/workspace/registration").put("icon", "ic_mod_registration").put("bg", "bg_mod_icon_blue"));
            arr.put(new JSONObject().put("name", "Billing").put("path", "/workspace/billing").put("icon", "ic_mod_billing").put("bg", "bg_mod_icon_emerald"));
            arr.put(new JSONObject().put("name", "Reports").put("path", "/workspace/reports").put("icon", "ic_mod_reports").put("bg", "bg_mod_icon_sky"));
            arr.put(new JSONObject().put("name", "Tests").put("path", "/workspace/test-management").put("icon", "ic_mod_tests").put("bg", "bg_mod_icon_purple"));
        } catch (Exception ignored) {}
        return arr;
    }

    private void recordRecentModule(String name, String path, String icon, String bg) {
        if (prefs == null || name == null || path == null) return;
        try {
            JSONArray cur = getRecentModules();
            if (cur.length() == 0) cur = getDefaultRecents();

            JSONArray updated = new JSONArray();
            JSONObject fresh = new JSONObject().put("name", name).put("path", path).put("icon", icon).put("bg", bg);
            updated.put(fresh);

            for (int i = 0; i < cur.length(); i++) {
                JSONObject old = cur.optJSONObject(i);
                if (old != null && !old.optString("path", "").equals(path)) {
                    updated.put(old);
                }
                if (updated.length() >= 6) break;
            }
            prefs.edit().putString("recent_modules_json", updated.toString()).apply();
        } catch (Exception ignored) {}
    }

    private void bindSheetModule(com.google.android.material.bottomsheet.BottomSheetDialog sheet, View root, int id, String name, String path, String icon, String bg) {
        View v = root.findViewById(id);
        if (v != null) {
            v.setOnClickListener(x -> {
                recordRecentModule(name, path, icon, bg);
                sheet.dismiss();
                if (path.equals("/workspace/wallet") || path.startsWith("/workspace/wallet")) {
                    ctx.startActivity(new Intent(ctx, WalletActivity.class));
                } else if (path.equals("/workspace/registration") || path.startsWith("/workspace/registration") || path.equals("/workspace/patients/new")) {
                    ctx.startActivity(new Intent(ctx, RegistrationActivity.class));
                } else if (navListener != null) {
                    navListener.onNavigateTo(path);
                }
            });
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Waving Hand 🤚 Animation (Animates once on launch or home return)
    // ─────────────────────────────────────────────────────────────────────────
    public void playWaveAnimation() {
        if (homeWaveEmoji == null) return;
        mainHandler.postDelayed(() -> {
            if (homeWaveEmoji == null) return;
            homeWaveEmoji.setPivotX(dp(14));
            homeWaveEmoji.setPivotY(dp(18));

            ObjectAnimator wave = ObjectAnimator.ofFloat(homeWaveEmoji, "rotation",
                    0f, 22f, -14f, 22f, -10f, 16f, -6f, 0f);
            wave.setDuration(1050);
            wave.setInterpolator(new AccelerateDecelerateInterpolator());
            wave.start();
        }, 300);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Module clicks
    // ─────────────────────────────────────────────────────────────────────────
    private void setupModuleClicks() {
        clickModule(R.id.modRegistration, "/workspace/registration");
        clickModule(R.id.modTests,        "/workspace/test-management");
        clickModule(R.id.modBilling,      "/workspace/billing");
        clickModule(R.id.modReports,      "/workspace/reports");
        clickModule(R.id.modSamples,      "/workspace/accession");
        clickModule(R.id.modWhatsapp,     "/workspace/reports");
        clickModule(R.id.modLogistics,    "/workspace/logistics");
        clickModule(R.id.modWallet,       "/workspace/wallet");
    }

    private void clickModule(int viewId, String path) {
        View v = homeRoot.findViewById(viewId);
        if (v != null) {
            v.setOnClickListener(x -> {
                recordRecentModule(path.replace("/workspace/", ""), path, "ic_mod_registration", "bg_mod_icon_blue");
                if (path.equals("/workspace/wallet") || path.startsWith("/workspace/wallet")) {
                    ctx.startActivity(new Intent(ctx, WalletActivity.class));
                } else if (path.equals("/workspace/registration") || path.startsWith("/workspace/registration") || path.equals("/workspace/patients/new")) {
                    ctx.startActivity(new Intent(ctx, RegistrationActivity.class));
                } else if (navListener != null) {
                    navListener.onNavigateTo(path);
                }
            });
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Banner Carousel
    // ─────────────────────────────────────────────────────────────────────────
    private void buildBannerDots() {
        if (bannerDots == null) return;
        bannerDots.removeAllViews();
        for (int i = 0; i < BANNERS.length; i++) {
            View dot = new View(ctx);
            int finalI = i;
            dot.setOnClickListener(v -> showBanner(finalI));
            bannerDots.addView(dot);
        }
        refreshDotStyles();
    }

    private void refreshDotStyles() {
        if (bannerDots == null) return;
        for (int i = 0; i < bannerDots.getChildCount(); i++) {
            View dot = bannerDots.getChildAt(i);
            int dpW = i == currentBannerIdx ? 22 : 7;
            int dpH = 7;
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(dp(dpW), dp(dpH));
            lp.setMargins(dp(3), 0, dp(3), 0);
            dot.setLayoutParams(lp);
            dot.setBackground(ctx.getDrawable(
                    i == currentBannerIdx
                            ? R.drawable.bg_banner_dot_active
                            : R.drawable.bg_banner_dot_inactive
            ));
        }
    }

    private void showBanner(int idx) {
        currentBannerIdx = idx;
        String[] b = BANNERS[idx];
        if (bannerTitle    != null) bannerTitle.setText(b[0]);
        if (bannerSubtitle != null) bannerSubtitle.setText(b[1]);
        if (bannerCta      != null) {
            bannerCta.setText(b[2]);
            String path = b[3];
            bannerCta.setOnClickListener(v -> {
                if (path.contains("/workspace/wallet")) {
                    ctx.startActivity(new Intent(ctx, WalletActivity.class));
                } else if (navListener != null) {
                    navListener.onNavigateTo(path);
                }
            });
        }
        refreshDotStyles();
    }

    private void startCarousel() {
        carouselRunnable = new Runnable() {
            @Override
            public void run() {
                currentBannerIdx = (currentBannerIdx + 1) % BANNERS.length;
                showBanner(currentBannerIdx);
                carouselHandler.postDelayed(this, 2800);
            }
        };
        carouselHandler.postDelayed(carouselRunnable, 2800);
        showBanner(0);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Bell Periodic Animation (Every 4 seconds + 3s rest loop)
    // ─────────────────────────────────────────────────────────────────────────
    private void startBellPeriodicAnimationLoop() {
        isBellAnimationActive = true;
        bellLoopRunnable = new Runnable() {
            @Override
            public void run() {
                if (!isBellAnimationActive) return;
                triggerSingleBellRing();
                bellLoopHandler.postDelayed(this, 4000); // 1.0s ring + 3.0s rest = every 4s
            }
        };
        bellLoopHandler.postDelayed(bellLoopRunnable, 1000);
    }

    private void triggerSingleBellRing() {
        mainHandler.post(() -> {
            View target = bellIcon != null ? bellIcon : bellBtn;
            if (target == null) return;

            target.setPivotX(target.getWidth() > 0 ? target.getWidth() / 2f : dp(11));
            target.setPivotY(0f); // Pivot from top ring

            if (bellAnimator != null) {
                bellAnimator.cancel();
            }

            bellAnimator = ObjectAnimator.ofFloat(target, "rotation",
                    0f, 18f, -18f, 14f, -14f, 8f, -8f, 3f, -3f, 0f);
            bellAnimator.setDuration(1000);
            bellAnimator.start();
        });
    }

    public void stopBellRingingAnimation() {
        isBellAnimationActive = false;
        bellLoopHandler.removeCallbacks(bellLoopRunnable);
        mainHandler.post(() -> {
            if (bellAnimator != null) {
                bellAnimator.cancel();
                bellAnimator = null;
            }
            View target = bellIcon != null ? bellIcon : bellBtn;
            if (target != null) target.setRotation(0f);
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Load user info from prefs / AuthManager / JWT / /api/auth/me
    // ─────────────────────────────────────────────────────────────────────────
    public void loadUserInfo() {
        // 1. Check AuthManager and SharedPreferences
        String name = AuthManager.getUserName(ctx);
        if (name == null || name.isEmpty()) {
            if (prefs != null) name = prefs.getString("user_name", "");
        }
        if (name == null || name.isEmpty()) {
            String email = AuthManager.getUserEmail(ctx);
            if (email != null && !email.isEmpty()) name = email;
        }

        // 2. Decode JWT payload if available
        String token = getAuthToken();
        if (token != null && !token.isEmpty()) {
            String jwtName = extractNameFromJwt(token);
            if (jwtName != null && !jwtName.isEmpty()) {
                name = jwtName;
            }
        }

        if (name != null && !name.isEmpty() && !name.equalsIgnoreCase("User")) {
            applyUserName(name);
        }

        // 3. Fetch fresh user profile from /api/auth/me
        new Thread(() -> {
            try {
                String curToken = getAuthToken();
                if (curToken == null) return;
                URL url = new URL(BASE_URL + "/api/auth/me");
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestProperty("Authorization", "Bearer " + curToken);
                conn.setRequestProperty("Cookie", "token=" + curToken);
                conn.setConnectTimeout(5000);
                conn.setReadTimeout(5000);
                if (conn.getResponseCode() == 200) {
                    String json = readStream(conn.getInputStream());
                    JSONObject obj = new JSONObject(json);
                    String serverName = obj.optString("name", "");
                    if (serverName.isEmpty()) {
                        serverName = obj.optString("email", "");
                    }
                    String role = obj.optString("role", "Lab Owner");
                    currentRole = role.replace("_", " ");

                    if (!serverName.isEmpty()) {
                        currentFullName = serverName;
                        if (prefs != null) prefs.edit().putString("user_name", serverName).apply();
                        AuthManager.saveUserInfo(ctx, obj.optString("email", ""), serverName, role);
                        String finalName = serverName;
                        mainHandler.post(() -> applyUserName(finalName));
                    }

                    // Extract wallet balance directly if present in user's lab
                    JSONObject lab = obj.optJSONObject("lab");
                    if (lab != null) {
                        JSONObject wallet = lab.optJSONObject("wallet");
                        if (wallet != null && wallet.has("balance")) {
                            double bal = wallet.optDouble("balance", 0.0);
                            String formatted = formatINR(bal);
                            mainHandler.post(() -> {
                                if (txtWalletBalance != null)
                                    txtWalletBalance.setText(formatted);
                            });
                        }
                    }

                    // Check for avatar in /api/auth/me response
                    String av = obj.optString("avatar", "");
                    if (!av.isEmpty() && !"null".equalsIgnoreCase(av)) {
                        loadAvatarImage(av);
                    }
                }
            } catch (Exception ignored) {}
        }).start();

        // 4. Fetch full user profile from /api/users/profile
        new Thread(() -> {
            try {
                String curToken = getAuthToken();
                if (curToken == null) return;
                URL url = new URL(BASE_URL + "/api/users/profile");
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestProperty("Authorization", "Bearer " + curToken);
                conn.setRequestProperty("Cookie", "token=" + curToken);
                conn.setConnectTimeout(5000);
                conn.setReadTimeout(5000);
                if (conn.getResponseCode() == 200) {
                    String json = readStream(conn.getInputStream());
                    JSONObject obj = new JSONObject(json);
                    JSONObject user = obj.optJSONObject("user");
                    if (user != null) {
                        String av = user.optString("avatar", "");
                        if (!av.isEmpty() && !"null".equalsIgnoreCase(av)) {
                            loadAvatarImage(av);
                        }
                    }
                }
            } catch (Exception ignored) {}
        }).start();
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Network Connectivity Monitoring & Status Dot Pulse Animation
    // ─────────────────────────────────────────────────────────────────────────
    private void initConnectivityMonitor() {
        try {
            ConnectivityManager cm = (ConnectivityManager) ctx.getSystemService(Context.CONNECTIVITY_SERVICE);
            if (cm != null) {
                Network activeNetwork = cm.getActiveNetwork();
                NetworkCapabilities caps = cm.getNetworkCapabilities(activeNetwork);
                isNetworkOnline = caps != null && caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET);
                updateStatusDot(isNetworkOnline);

                NetworkRequest req = new NetworkRequest.Builder()
                        .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
                        .build();
                cm.registerNetworkCallback(req, new ConnectivityManager.NetworkCallback() {
                    @Override
                    public void onAvailable(Network network) {
                        mainHandler.post(() -> updateStatusDot(true));
                    }

                    @Override
                    public void onLost(Network network) {
                        mainHandler.post(() -> updateStatusDot(false));
                    }
                });
            }
        } catch (Exception e) {
            updateStatusDot(true);
        }
    }

    private void updateStatusDot(boolean online) {
        isNetworkOnline = online;
        if (statusDot == null) return;

        if (statusDotPulseAnim != null) {
            statusDotPulseAnim.cancel();
            statusDotPulseAnim = null;
        }

        statusDot.setScaleX(1.0f);
        statusDot.setScaleY(1.0f);
        statusDot.setAlpha(1.0f);

        if (online) {
            statusDot.setBackgroundResource(R.drawable.bg_online_dot);
            if (statusWave != null) {
                statusWave.setVisibility(View.VISIBLE);
                statusWave.setBackgroundResource(R.drawable.bg_status_wave_white);

                // Smooth expanding wave ripple emitting from behind the dot
                ObjectAnimator waveScaleX = ObjectAnimator.ofFloat(statusWave, "scaleX", 1.0f, 2.5f);
                ObjectAnimator waveScaleY = ObjectAnimator.ofFloat(statusWave, "scaleY", 1.0f, 2.5f);
                ObjectAnimator waveAlpha = ObjectAnimator.ofFloat(statusWave, "alpha", 0.85f, 0.0f);
                waveScaleX.setRepeatCount(ValueAnimator.INFINITE);
                waveScaleY.setRepeatCount(ValueAnimator.INFINITE);
                waveAlpha.setRepeatCount(ValueAnimator.INFINITE);

                statusDotPulseAnim = new AnimatorSet();
                statusDotPulseAnim.playTogether(waveScaleX, waveScaleY, waveAlpha);
                statusDotPulseAnim.setDuration(1500);
                statusDotPulseAnim.setInterpolator(new android.view.animation.DecelerateInterpolator());
                statusDotPulseAnim.start();
            }
        } else {
            statusDot.setBackgroundResource(R.drawable.bg_offline_dot);
            if (statusWave != null) {
                statusWave.setVisibility(View.GONE);
            }
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Profile Picture Avatar Loader (Boy / Girl Memoji & Custom Image)
    // ─────────────────────────────────────────────────────────────────────────
    public int getDefaultAvatarRes() {
        if (prefs != null) {
            String saved = prefs.getString("user_avatar_gender", "");
            if ("girl".equalsIgnoreCase(saved) || "female".equalsIgnoreCase(saved)) {
                return R.drawable.avatar_girl;
            } else if ("boy".equalsIgnoreCase(saved) || "male".equalsIgnoreCase(saved)) {
                return R.drawable.avatar_boy;
            }
        }
        if (isFemaleUser(currentFullName, currentEmail)) {
            return R.drawable.avatar_girl;
        }
        return R.drawable.avatar_boy;
    }

    public static boolean isFemaleUser(String name, String email) {
        String n = (name != null ? name : "").toLowerCase().trim();
        String e = (email != null ? email : "").toLowerCase().trim();
        if (n.startsWith("mrs") || n.startsWith("ms.") || n.startsWith("miss ") || n.contains("madam") || n.contains("lady")) {
            return true;
        }
        String[] femaleKeywords = {
            "female", "girl", "woman", "priya", "pooja", "ananya", "sneha", "fatima", "aisha",
            "anjali", "kavita", "sunita", "neha", "divya", "swati", "shreya", "tanvi",
            "meera", "rupa", "rashmi", "jyoti", "rekha", "sita", "geeta", "moni", "rita",
            "rani", "madhu", "alina", "sarah", "emma", "olivia", "sophia", "mia", "isabella",
            "amrita", "diya", "ishita", "sakshi", "payal", "riddhi", "siddhi", "nikita"
        };
        for (String kw : femaleKeywords) {
            if (n.contains(kw) || e.contains(kw)) return true;
        }
        return false;
    }

    public void loadAvatarImage(String raw) {
        if (raw == null || raw.trim().isEmpty() || "null".equalsIgnoreCase(raw.trim())) {
            mainHandler.post(() -> {
                if (avatarImage != null) {
                    avatarImage.setImageResource(getDefaultAvatarRes());
                    avatarImage.setVisibility(View.VISIBLE);
                }
                if (avatarInitial != null) avatarInitial.setVisibility(View.GONE);
            });
            return;
        }
        new Thread(() -> {
            try {
                Bitmap bmp = null;
                if (raw.startsWith("data:image")) {
                    String data = raw.substring(raw.indexOf(",") + 1);
                    byte[] decoded = Base64.decode(data, Base64.DEFAULT);
                    bmp = BitmapFactory.decodeByteArray(decoded, 0, decoded.length);
                } else if (raw.startsWith("http://") || raw.startsWith("https://")) {
                    URL url = new URL(raw);
                    InputStream is = url.openStream();
                    bmp = BitmapFactory.decodeStream(is);
                }
                if (bmp != null) {
                    final Bitmap finalBmp = bmp;
                    mainHandler.post(() -> {
                        if (avatarImage != null) {
                            avatarImage.setImageBitmap(finalBmp);
                            avatarImage.setVisibility(View.VISIBLE);
                        }
                        if (avatarInitial != null) {
                            avatarInitial.setVisibility(View.GONE);
                        }
                    });
                } else {
                    mainHandler.post(() -> {
                        if (avatarImage != null) {
                            avatarImage.setImageResource(getDefaultAvatarRes());
                            avatarImage.setVisibility(View.VISIBLE);
                        }
                        if (avatarInitial != null) avatarInitial.setVisibility(View.GONE);
                    });
                }
            } catch (Exception ignored) {
                mainHandler.post(() -> {
                    if (avatarImage != null) {
                        avatarImage.setImageResource(getDefaultAvatarRes());
                        avatarImage.setVisibility(View.VISIBLE);
                    }
                    if (avatarInitial != null) avatarInitial.setVisibility(View.GONE);
                });
            }
        }).start();
    }

    private void applyUserName(String fullName) {
        currentFullName = fullName;
        String firstName = formatSmartFirstName(fullName);
        if (txtGreeting != null) {
            txtGreeting.setText("Hello, " + firstName);
        }
        if (avatarImage != null) {
            avatarImage.setImageResource(getDefaultAvatarRes());
            avatarImage.setVisibility(View.VISIBLE);
        }
        if (avatarInitial != null) {
            avatarInitial.setVisibility(View.GONE);
        }
    }

    /**
     * Smart First Name Extraction:
     * Handles spaces, emails, CamelCase concatenated strings (e.g. MonowarHussain -> Monowar),
     * compound prefixes, and cleanly caps at 7-8 letters.
     */
    public static String formatSmartFirstName(String raw) {
        if (raw == null || raw.trim().isEmpty()) return "User";
        String str = raw.trim();

        // 1. Remove email domain if present
        if (str.contains("@")) {
            str = str.substring(0, str.indexOf('@'));
        }

        // 2. If contains space, underscore, dot, or dash, take first token
        String[] tokens = str.split("[\\s._\\-]+");
        if (tokens.length > 0 && !tokens[0].isEmpty()) {
            str = tokens[0];
        }

        // 3. Handle CamelCase / PascalCase without spaces (e.g. "MonowarHussainSafi" -> "Monowar")
        String[] camelParts = str.split("(?=[A-Z])");
        if (camelParts.length > 1 && !camelParts[0].isEmpty()) {
            str = camelParts[0];
        } else if (camelParts.length > 1 && camelParts[0].isEmpty() && camelParts.length > 1) {
            str = camelParts[1];
        }

        // 4. Clean up non-alphabetic chars
        str = str.replaceAll("[^a-zA-Z]", "");
        if (str.isEmpty()) return "User";

        // 5. Capitalize first letter, lowercase rest
        str = Character.toUpperCase(str.charAt(0)) + str.substring(1).toLowerCase();

        // 6. Check common compound prefixes if concatenated without spaces (e.g. monowarhussain... -> Monowar)
        String lower = str.toLowerCase();
        String[] knownPrefixes = {"monowar", "manohar", "mohammad", "anupam", "shahid", "abhishek", "rahul", "amit", "priya", "rohit", "vikram", "rajesh", "suresh", "deepak", "sanjay"};
        for (String p : knownPrefixes) {
            if (lower.startsWith(p) && lower.length() > p.length() + 2) {
                return Character.toUpperCase(p.charAt(0)) + p.substring(1).toLowerCase();
            }
        }

        // 7. If still longer than 8 characters, cap cleanly at 7 characters
        if (str.length() > 8) {
            str = str.substring(0, 7);
        }

        return str;
    }

    private String extractNameFromJwt(String jwtToken) {
        try {
            String[] parts = jwtToken.split("\\.");
            if (parts.length >= 2) {
                byte[] bytes = Base64.decode(parts[1], Base64.URL_SAFE | Base64.NO_WRAP);
                String jsonStr = new String(bytes, "UTF-8");
                JSONObject jwt = new JSONObject(jsonStr);
                String name = jwt.optString("name", "");
                if (name.isEmpty()) name = jwt.optString("email", "");
                return name;
            }
        } catch (Exception ignored) {}
        return null;
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Wallet Balance
    // ─────────────────────────────────────────────────────────────────────────
    public void fetchWalletBalance() {
        new Thread(() -> {
            try {
                String token = getAuthToken();
                if (token == null) return;

                // Try 1: /api/workspace/wallet/details
                URL url = new URL(BASE_URL + "/api/workspace/wallet/details");
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestProperty("Authorization", "Bearer " + token);
                conn.setRequestProperty("Cookie", "token=" + token);
                conn.setConnectTimeout(6000);
                conn.setReadTimeout(6000);

                if (conn.getResponseCode() == 200) {
                    String json = readStream(conn.getInputStream());
                    JSONObject root = new JSONObject(json);
                    JSONObject wallet = root.optJSONObject("wallet");
                    if (wallet == null) wallet = root;
                    double balance = wallet.optDouble("balance", -1);
                    if (balance >= 0) {
                        String formatted = formatINR(balance);
                        mainHandler.post(() -> {
                            if (txtWalletBalance != null)
                                txtWalletBalance.setText(formatted);
                        });
                        return;
                    }
                }

                // Try 2: /api/labs/dashboard?range=TODAY
                URL url2 = new URL(BASE_URL + "/api/labs/dashboard?range=TODAY");
                HttpURLConnection conn2 = (HttpURLConnection) url2.openConnection();
                conn2.setRequestProperty("Authorization", "Bearer " + token);
                conn2.setRequestProperty("Cookie", "token=" + token);
                conn2.setConnectTimeout(6000);
                conn2.setReadTimeout(6000);
                if (conn2.getResponseCode() == 200) {
                    String json2 = readStream(conn2.getInputStream());
                    JSONObject root2 = new JSONObject(json2);
                    JSONObject kpi = root2.optJSONObject("kpi");
                    if (kpi != null && kpi.has("walletBalance")) {
                        double bal = kpi.optDouble("walletBalance", 0.0);
                        String formatted = formatINR(bal);
                        mainHandler.post(() -> {
                            if (txtWalletBalance != null)
                                txtWalletBalance.setText(formatted);
                        });
                    }
                }
            } catch (Exception ignored) {}
        }).start();
    }

    private void startPeriodicPolling() {
        pollRunnable = new Runnable() {
            @Override
            public void run() {
                fetchWalletBalance();
                fetchTodaysWorklist();
                pollHandler.postDelayed(this, 15000);
            }
        };
        pollHandler.postDelayed(pollRunnable, 15000);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Today's Worklist
    // ─────────────────────────────────────────────────────────────────────────
    public void fetchTodaysWorklist() {
        new Thread(() -> {
            try {
                String token = getAuthToken();
                if (token == null) { showDemoWorklist(); return; }
                URL url = new URL(BASE_URL + "/api/labs/dashboard?range=TODAY");
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestProperty("Authorization", "Bearer " + token);
                conn.setRequestProperty("Cookie", "token=" + token);
                conn.setConnectTimeout(7000);
                conn.setReadTimeout(7000);
                if (conn.getResponseCode() == 200) {
                    String json = readStream(conn.getInputStream());
                    JSONObject root = new JSONObject(json);
                    JSONArray patients = root.optJSONArray("recentPatients");
                    if (patients != null && patients.length() > 0) {
                        mainHandler.post(() -> buildWorklistCards(patients));
                    } else {
                        showDemoWorklist();
                    }
                } else {
                    showDemoWorklist();
                }
            } catch (Exception e) {
                showDemoWorklist();
            }
        }).start();
    }

    private void showDemoWorklist() {
        try {
            JSONArray demo = new JSONArray();

            JSONObject p1 = new JSONObject();
            p1.put("id", "demo-1"); p1.put("name", "Ramesh Sen"); p1.put("phone", "9876543210");
            JSONArray tests1 = new JSONArray(); JSONObject t1 = new JSONObject();
            t1.put("testName", "CBC & Lipid Profile"); t1.put("status", "COMPLETED"); tests1.put(t1);
            p1.put("tests", tests1);
            JSONArray inv1 = new JSONArray(); JSONObject i1 = new JSONObject();
            i1.put("grandTotal", 450); i1.put("paymentStatus", "PAID"); inv1.put(i1);
            p1.put("invoices", inv1); demo.put(p1);

            JSONObject p2 = new JSONObject();
            p2.put("id", "demo-2"); p2.put("name", "Sunita Roy"); p2.put("phone", "9876543211");
            JSONArray tests2 = new JSONArray(); JSONObject t2 = new JSONObject();
            t2.put("testName", "Thyroid Panel"); t2.put("status", "IN_PROGRESS"); tests2.put(t2);
            p2.put("tests", tests2);
            JSONArray inv2 = new JSONArray(); JSONObject i2 = new JSONObject();
            i2.put("grandTotal", 600); i2.put("paymentStatus", "PAID"); inv2.put(i2);
            p2.put("invoices", inv2); demo.put(p2);

            JSONObject p3 = new JSONObject();
            p3.put("id", "demo-3"); p3.put("name", "Arun Kumar"); p3.put("phone", "9876543212");
            JSONArray tests3 = new JSONArray(); JSONObject t3 = new JSONObject();
            t3.put("testName", "Blood Sugar HbA1c"); t3.put("status", "PENDING"); tests3.put(t3);
            p3.put("tests", tests3);
            JSONArray inv3 = new JSONArray(); JSONObject i3 = new JSONObject();
            i3.put("grandTotal", 350); i3.put("paymentStatus", "PAID"); inv3.put(i3);
            p3.put("invoices", inv3); demo.put(p3);

            mainHandler.post(() -> buildWorklistCards(demo));
        } catch (Exception ignored) {}
    }

    private void buildWorklistCards(JSONArray patients) {
        if (worklistContainer == null) return;
        worklistContainer.removeAllViews();
        LayoutInflater inflater = LayoutInflater.from(ctx);

        for (int i = 0; i < patients.length(); i++) {
            try {
                JSONObject p = patients.getJSONObject(i);
                String name  = p.optString("name", "—");
                String phone = p.optString("phone", "");
                String id    = p.optString("id", "");

                // Status
                JSONArray tests = p.optJSONArray("tests");
                String status   = "Pending";
                String testName = "—";
                if (tests != null && tests.length() > 0) {
                    JSONObject t = tests.getJSONObject(0);
                    testName = t.optString("testName", t.optString("name", "—"));
                    String s = t.optString("status", "PENDING");
                    if ("COMPLETED".equals(s))    status = "Ready";
                    else if ("IN_PROGRESS".equals(s)) status = "Processing";
                }

                // Price
                JSONArray invs = p.optJSONArray("invoices");
                double total   = 0;
                boolean paid   = false;
                if (invs != null && invs.length() > 0) {
                    JSONObject inv = invs.getJSONObject(0);
                    total = inv.optDouble("grandTotal", 0);
                    paid  = "PAID".equalsIgnoreCase(inv.optString("paymentStatus", ""));
                }

                // Inflate card
                View card = inflater.inflate(R.layout.item_patient_card, worklistContainer, false);

                // Bind data
                TextView tvName    = card.findViewById(R.id.cardPatientName);
                TextView tvTest    = card.findViewById(R.id.cardTestName);
                TextView tvStatus  = card.findViewById(R.id.cardStatus);
                TextView tvPrice   = card.findViewById(R.id.cardPrice);
                TextView tvPaid    = card.findViewById(R.id.cardPaidLabel);
                View     btnWA     = card.findViewById(R.id.cardWhatsappBtn);

                if (tvName   != null) tvName.setText(name);
                if (tvTest   != null) tvTest.setText(testName);
                if (tvPrice  != null) tvPrice.setText("₹" + (int) total);
                if (tvPaid   != null) tvPaid.setVisibility(paid ? View.VISIBLE : View.GONE);

                // Status badge styling
                if (tvStatus != null) {
                    tvStatus.setText(status);
                    switch (status) {
                        case "Ready":
                            tvStatus.setTextColor(Color.parseColor("#00A86B"));
                            tvStatus.setBackground(ctx.getDrawable(R.drawable.bg_status_ready));
                            break;
                        case "Processing":
                            tvStatus.setTextColor(Color.parseColor("#0D6EFD"));
                            tvStatus.setBackground(ctx.getDrawable(R.drawable.bg_status_processing));
                            break;
                        default:
                            tvStatus.setTextColor(Color.parseColor("#F59E0B"));
                            tvStatus.setBackground(ctx.getDrawable(R.drawable.bg_status_pending));
                    }
                }

                // WhatsApp share
                if (btnWA != null) {
                    if (!"Pending".equals(status) && !phone.isEmpty()) {
                        String msg = "Hello " + name + ", your diagnostic report is ready. "
                                + "View it at: https://app.patholab.cloud";
                        btnWA.setVisibility(View.VISIBLE);
                        btnWA.setOnClickListener(v -> {
                            String waUrl = "https://wa.me/91" + phone + "?text="
                                    + Uri.encode(msg);
                            ctx.startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(waUrl)));
                        });
                    } else {
                        btnWA.setVisibility(View.GONE);
                    }
                }

                // Card tap → open patient detail in WebView
                String patientPath = "/workspace/patients/" + id;
                card.setOnClickListener(v -> {
                    if (navListener != null) navListener.onNavigateTo(patientPath);
                });

                worklistContainer.addView(card);

            } catch (Exception ignored) {}
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Token Retrieval (AuthManager + CookieManager Fallback)
    // ─────────────────────────────────────────────────────────────────────────
    private String getAuthToken() {
        String token = AuthManager.getToken(ctx);
        if (token != null && !token.isEmpty()) return token;

        // Fallback: Check WebView CookieManager
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
                            AuthManager.saveToken(ctx, cookieToken);
                            return cookieToken;
                        }
                    }
                }
            }
        } catch (Exception ignored) {}
        return null;
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Visibility
    // ─────────────────────────────────────────────────────────────────────────
    public void show() {
        homeRoot.setVisibility(View.VISIBLE);
        loadUserInfo();
        fetchWalletBalance();
        startBellPeriodicAnimationLoop();
        playWaveAnimation();
    }

    public void hide() {
        homeRoot.setVisibility(View.GONE);
        stopBellRingingAnimation();
    }

    public boolean isVisible() {
        return homeRoot.getVisibility() == View.VISIBLE;
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Cleanup
    // ─────────────────────────────────────────────────────────────────────────
    public void destroy() {
        carouselHandler.removeCallbacks(carouselRunnable);
        pollHandler.removeCallbacks(pollRunnable);
        bellLoopHandler.removeCallbacks(bellLoopRunnable);
        stopBellRingingAnimation();
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Utilities
    // ─────────────────────────────────────────────────────────────────────────
    private String readStream(InputStream is) throws Exception {
        BufferedReader reader = new BufferedReader(new InputStreamReader(is, "UTF-8"));
        StringBuilder sb = new StringBuilder();
        String line;
        while ((line = reader.readLine()) != null) sb.append(line);
        return sb.toString();
    }

    private String formatINR(double amount) {
        return "₹" + String.format(Locale.US, "%,.2f", amount);
    }

    private int dp(int value) {
        float density = ctx.getResources().getDisplayMetrics().density;
        return Math.round(value * density);
    }
}
