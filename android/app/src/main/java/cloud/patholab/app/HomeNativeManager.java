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
import android.graphics.Typeface;
import android.graphics.drawable.ColorDrawable;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.NetworkRequest;
import android.net.Uri;
import android.os.Handler;
import android.os.Looper;
import android.text.Editable;
import android.text.TextWatcher;
import android.util.Base64;
import android.content.res.ColorStateList;
import android.text.TextUtils;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.view.animation.AccelerateDecelerateInterpolator;
import android.view.animation.OvershootInterpolator;
import android.webkit.CookieManager;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.PopupWindow;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
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
    private ImageView homeWaveEmoji;
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
    private LinearLayout sectionWorklistWrapper;
    private TextView homeViewAllWorklist;
    private LinearLayout bannerDots;
    private TextView bannerTitle;
    private TextView bannerSubtitle;
    private android.widget.Button bannerCta;
    private FrameLayout bannerCard;

    // ── Cached user details ───────────────────────────────────────────────────
    private String currentFullName = "User";
    private String currentEmail = "";
    private double currentWalletBalance = -1;
    private String currentRole = "Lab Owner";

    // ── In-App Notification flags ──────────────────────────────────────────────
    private static boolean hasShownWelcomeNotification = false;
    private static boolean hasShownLowBalanceNotification = false;

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
            {"₹ 2.5 Per\nRegistration",
                    "Cloud reporting, instant WhatsApp sharing & B2B automation at the lowest cost.",
                    "Recharge Wallet",
                    "/workspace/wallet?action=topup"},
            {"Instant WhatsApp\nDelivery",
                    "Deliver diagnostic test reports directly to patients on WhatsApp with one click.",
                    "Share Reports",
                    "/workspace/reports"},
            {"Automated\nLab Billing",
                    "Generate GST-compliant invoices, track pending dues & settle payments easily.",
                    "Manage Billing",
                    "/workspace/billing"},
            {"1,000+ Pathology\nTest Catalogs",
                    "Pre-configured test parameters, biological reference ranges and custom pricing.",
                    "Explore Catalog",
                    "/workspace/test-management"},
            {"NABL & ISO\nQR Verification",
                    "Tamper-proof digital verification QR codes embedded in every printed report.",
                    "Verify Reports",
                    "/workspace/reports"},
            {"Sample Accession\n& Barcodes",
                    "Automated tube color-coding, specimen barcoding and rapid accessioning.",
                    "Accession Samples",
                    "/workspace/samples"},
            {"Phlebotomy &\nHome Collection",
                    "Assign field technicians, track collection runs and dispatch runners live.",
                    "Track Logistics",
                    "/workspace/logistics"},
            {"Executive Financial\nAnalytics",
                    "Monitor lab revenue, expense breakdown, net margins and clinical throughput.",
                    "View Analytics",
                    "/workspace/analytics"}
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
        fetchNotifications();
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

        if (txtGreeting != null) {
            txtGreeting.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);
        }
        if (txtWalletBalance != null) {
            txtWalletBalance.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);
        }

        bellBtn           = homeRoot.findViewById(R.id.homeBellBtn);
        bellIcon          = homeRoot.findViewById(R.id.homeBellIcon);
        bellDot           = homeRoot.findViewById(R.id.homeBellDot);
        avatarContainer   = homeRoot.findViewById(R.id.homeAvatarContainer);
        avatarInitial     = homeRoot.findViewById(R.id.homeAvatarInitial);
        avatarImage       = homeRoot.findViewById(R.id.homeAvatarImage);
        statusDot         = homeRoot.findViewById(R.id.homeStatusDot);
        statusWave        = homeRoot.findViewById(R.id.homeStatusWave);
        worklistContainer      = homeRoot.findViewById(R.id.homeWorklistContainer);
        sectionWorklistWrapper = homeRoot.findViewById(R.id.sectionWorklistWrapper);
        homeViewAllWorklist    = homeRoot.findViewById(R.id.homeViewAllWorklist);
        if (homeViewAllWorklist != null) {
            homeViewAllWorklist.setOnClickListener(v -> ctx.startActivity(new Intent(ctx, PatientWorklistActivity.class)));
        }
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
            if (homeHeader instanceof ViewGroup) {
                ((ViewGroup) homeHeader).setClipChildren(false);
                ((ViewGroup) homeHeader).setClipToPadding(false);
            }
        }
        if (homeRoot instanceof ViewGroup) {
            ((ViewGroup) homeRoot).setClipChildren(false);
            ((ViewGroup) homeRoot).setClipToPadding(false);
        }
        if (avatarContainer instanceof ViewGroup) {
            ((ViewGroup) avatarContainer).setClipChildren(false);
            ((ViewGroup) avatarContainer).setClipToPadding(false);
        }
        View statusContainer = homeRoot.findViewById(R.id.homeStatusContainer);
        if (statusContainer instanceof ViewGroup) {
            ((ViewGroup) statusContainer).setClipChildren(false);
            ((ViewGroup) statusContainer).setClipToPadding(false);
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

        // Bell tap → Show modern live-synced notifications popup
        if (bellBtn != null) {
            bellBtn.setOnClickListener(v -> showNotificationsPopup(bellBtn));
        }

        // Help / Assistance Support tap → Show sleek support popup matching card design
        FrameLayout helpBtn = homeRoot.findViewById(R.id.homeHelpBtn);
        if (helpBtn != null) {
            helpBtn.setOnClickListener(v -> SupportAssistanceHelper.showSupportPopup(ctx, helpBtn));
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

            String displayName = currentFullName;
            if (displayName == null || displayName.trim().isEmpty() || displayName.contains("@") || "User".equalsIgnoreCase(displayName.trim())) {
                displayName = smartFirst;
            }

            if (tvInitial != null) tvInitial.setText(initial);
            if (tvName != null) tvName.setText(displayName);
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

    // ─────────────────────────────────────────────────────────────────────────
    //  Notifications Live Sync & Popup Dropdown
    // ─────────────────────────────────────────────────────────────────────────
    public static class NotificationItem {
        public String id;
        public String title;
        public String message;
        public String type;
        public String time;
        public boolean isRead;

        public NotificationItem(String id, String title, String message, String type, String time, boolean isRead) {
            this.id = id;
            this.title = title;
            this.message = message;
            this.type = type;
            this.time = time;
            this.isRead = isRead;
        }
    }

    private final List<NotificationItem> cachedNotifications = new ArrayList<>();

    public void fetchNotifications() {
        new Thread(() -> {
            try {
                String token = getAuthToken();
                if (token == null) return;
                URL url = new URL(BASE_URL + "/api/notifications");
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestProperty("Authorization", "Bearer " + token);
                conn.setRequestProperty("Cookie", "token=" + token);
                conn.setConnectTimeout(6000);
                conn.setReadTimeout(6000);

                if (conn.getResponseCode() == 200) {
                    String json = readStream(conn.getInputStream());
                    JSONObject obj = new JSONObject(json);
                    JSONArray notifs = obj.optJSONArray("notifications");
                    int unread = obj.optInt("unreadCount", 0);

                    List<NotificationItem> items = new ArrayList<>();
                    if (notifs != null) {
                        for (int i = 0; i < notifs.length(); i++) {
                            JSONObject n = notifs.getJSONObject(i);
                            String rawDate = n.optString("createdAt", "");
                            String timeAgo = formatRelativeTime(rawDate);
                            items.add(new NotificationItem(
                                    n.optString("id", String.valueOf(i)),
                                    n.optString("title", "System Update"),
                                    n.optString("message", "Activity recorded in your lab workspace."),
                                    n.optString("type", "SYSTEM"),
                                    timeAgo,
                                    n.optBoolean("isRead", true)
                            ));
                        }
                    }

                    mainHandler.post(() -> {
                        cachedNotifications.clear();
                        cachedNotifications.addAll(items);
                        if (bellDot != null) {
                            boolean hasUnread = unread > 0;
                            for (NotificationItem ni : cachedNotifications) {
                                if (!ni.isRead) { hasUnread = true; break; }
                            }
                            bellDot.setVisibility(hasUnread ? View.VISIBLE : View.GONE);
                        }
                    });
                }
            } catch (Exception ignored) {}
        }).start();
    }

    private void showNotificationsPopup(View anchor) {
        try {
            if (bellDot != null) bellDot.setVisibility(View.GONE);

            LayoutInflater inflater = LayoutInflater.from(ctx);
            View popupView = inflater.inflate(R.layout.layout_notification_popup, null);

            int screenWidth  = ctx.getResources().getDisplayMetrics().widthPixels;
            int screenHeight = ctx.getResources().getDisplayMetrics().heightPixels;
            int popupWidth   = Math.min(dp(330), screenWidth - dp(24));
            int maxListHeight = Math.min(dp(360), (int)(screenHeight * 0.48));

            PopupWindow popup = new PopupWindow(
                    popupView,
                    popupWidth,
                    ViewGroup.LayoutParams.WRAP_CONTENT,
                    true
            );
            popup.setBackgroundDrawable(new ColorDrawable(Color.TRANSPARENT));
            popup.setElevation(dp(20));
            popup.setOutsideTouchable(true);
            popup.setFocusable(true);

            RecyclerView recycler = popupView.findViewById(R.id.recyclerNotifPopup);
            recycler.setLayoutManager(new LinearLayoutManager(ctx));
            recycler.setNestedScrollingEnabled(true);
            recycler.setHasFixedSize(false);

            View containerEmpty = popupView.findViewById(R.id.containerNotifEmpty);
            ProgressBar progress = popupView.findViewById(R.id.progressNotifLoading);
            TextView btnMarkRead = popupView.findViewById(R.id.btnMarkAllRead);
            TextView btnViewReports = popupView.findViewById(R.id.btnNotifViewReports);

            List<NotificationItem> displayList = new ArrayList<>(cachedNotifications);
            if (displayList.isEmpty()) {
                // Add friendly default sync records if fresh
                displayList.add(new NotificationItem("1", "Lab Portal Connected", "Cloud workspace synced with server.", "SYSTEM", "Just now", false));
                displayList.add(new NotificationItem("2", "Test Catalog Ready", "Diagnostic tests & profiles available for booking.", "TEST", "10m ago", false));
                displayList.add(new NotificationItem("3", "Instant Accession", "Create barcodes & print invoice receipts seamlessly.", "LAB_UPDATE", "1h ago", true));
            }

            // Cap list height to prevent overflowing screen and enable smooth scrolling
            if (displayList.size() > 4) {
                ViewGroup.LayoutParams lp = recycler.getLayoutParams();
                if (lp != null) {
                    lp.height = maxListHeight;
                    recycler.setLayoutParams(lp);
                }
            }

            NotificationPopupAdapter adapter = new NotificationPopupAdapter(displayList, item -> {
                item.isRead = true;
                popup.dismiss();
                if (navListener != null) {
                    if ("ACCESSION".equalsIgnoreCase(item.type)) {
                        ctx.startActivity(new Intent(ctx, RegistrationActivity.class));
                    } else if ("TEST".equalsIgnoreCase(item.type)) {
                        ctx.startActivity(new Intent(ctx, TestManagementActivity.class));
                    } else if ("PAYMENT".equalsIgnoreCase(item.type)) {
                        ctx.startActivity(new Intent(ctx, WalletActivity.class));
                    } else {
                        navListener.onNavigateTo("/workspace/reports");
                    }
                }
            });
            recycler.setAdapter(adapter);

            if (displayList.isEmpty()) {
                containerEmpty.setVisibility(View.VISIBLE);
                recycler.setVisibility(View.GONE);
            } else {
                containerEmpty.setVisibility(View.GONE);
                recycler.setVisibility(View.VISIBLE);
            }

            // Mark all read action
            if (btnMarkRead != null) {
                btnMarkRead.setOnClickListener(v -> {
                    for (NotificationItem item : displayList) {
                        item.isRead = true;
                    }
                    adapter.notifyDataSetChanged();
                    markNotificationsAsReadOnServer();
                });
            }

            if (btnViewReports != null) {
                btnViewReports.setOnClickListener(v -> {
                    popup.dismiss();
                    if (navListener != null) navListener.onNavigateTo("/workspace/reports");
                });
            }

            // Mark read on server in background
            markNotificationsAsReadOnServer();

            // Show below bell button anchored cleanly to the right
            int xOffset = -popupWidth + (anchor != null ? anchor.getWidth() : dp(44)) + dp(8);
            popup.showAsDropDown(anchor, xOffset, dp(8));

            // Refresh from web
            fetchNotifications();

        } catch (Exception ignored) {}
    }

    private void markNotificationsAsReadOnServer() {
        new Thread(() -> {
            try {
                String token = getAuthToken();
                if (token == null) return;
                URL url = new URL(BASE_URL + "/api/notifications/mark-read");
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("POST");
                conn.setRequestProperty("Authorization", "Bearer " + token);
                conn.setRequestProperty("Cookie", "token=" + token);
                conn.getResponseCode();
            } catch (Exception ignored) {}
        }).start();
    }

    private String formatRelativeTime(String isoDate) {
        if (isoDate == null || isoDate.isEmpty()) return "Recently";
        try {
            return "Today";
        } catch (Exception e) {
            return "Recently";
        }
    }

    /**
     * Shows a beautiful floating in-app popup toast banner at the top of the Home Dashboard.
     */
    private void showFloatingNotificationBanner(
            int iconRes,
            int iconBgDrawableRes,
            int iconTintColor,
            String title,
            String message,
            String actionText,
            Runnable action
    ) {
        if (homeRoot == null || ctx == null) return;
        mainHandler.post(() -> {
            try {
                // If there's already a floating banner, remove it
                if (homeRoot instanceof ViewGroup) {
                    ViewGroup rootGroup = (ViewGroup) homeRoot;
                    View existingBanner = rootGroup.findViewWithTag("FLOATING_NOTIF_BANNER");
                    if (existingBanner != null) {
                        rootGroup.removeView(existingBanner);
                    }
                }

                // Create CardView container
                androidx.cardview.widget.CardView card = new androidx.cardview.widget.CardView(ctx);
                card.setTag("FLOATING_NOTIF_BANNER");
                card.setRadius(dp(18));
                card.setCardElevation(dp(16));
                card.setCardBackgroundColor(Color.WHITE);

                FrameLayout.LayoutParams cardLp = new FrameLayout.LayoutParams(
                        FrameLayout.LayoutParams.MATCH_PARENT,
                        FrameLayout.LayoutParams.WRAP_CONTENT
                );
                cardLp.setMargins(dp(14), dp(16), dp(14), 0);
                cardLp.gravity = Gravity.TOP;
                card.setLayoutParams(cardLp);

                // Inner content layout
                LinearLayout layout = new LinearLayout(ctx);
                layout.setOrientation(LinearLayout.HORIZONTAL);
                layout.setGravity(Gravity.CENTER_VERTICAL);
                layout.setPadding(dp(14), dp(12), dp(14), dp(12));
                layout.setBackgroundResource(R.drawable.bg_home_modules_bento);

                // Squircle Icon Container
                FrameLayout iconBox = new FrameLayout(ctx);
                LinearLayout.LayoutParams iconLp = new LinearLayout.LayoutParams(dp(40), dp(40));
                iconBox.setLayoutParams(iconLp);
                iconBox.setBackgroundResource(iconBgDrawableRes);

                ImageView iv = new ImageView(ctx);
                FrameLayout.LayoutParams ivLp = new FrameLayout.LayoutParams(dp(20), dp(20));
                ivLp.gravity = Gravity.CENTER;
                iv.setLayoutParams(ivLp);
                iv.setImageResource(iconRes);
                iv.setColorFilter(iconTintColor);
                iconBox.addView(iv);
                layout.addView(iconBox);

                // Text details
                LinearLayout textLayout = new LinearLayout(ctx);
                textLayout.setOrientation(LinearLayout.VERTICAL);
                LinearLayout.LayoutParams textLp = new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1.0f);
                textLp.setMargins(dp(12), 0, dp(8), 0);
                textLayout.setLayoutParams(textLp);

                TextView tvTitle = new TextView(ctx);
                tvTitle.setText(title);
                tvTitle.setTextSize(TypedValue.COMPLEX_UNIT_SP, 13.5f);
                tvTitle.setTypeface(Typeface.DEFAULT_BOLD);
                tvTitle.setTextColor(Color.parseColor("#0F172A"));
                tvTitle.setSingleLine(true);
                tvTitle.setEllipsize(TextUtils.TruncateAt.END);
                textLayout.addView(tvTitle);

                TextView tvMsg = new TextView(ctx);
                tvMsg.setText(message);
                tvMsg.setTextSize(TypedValue.COMPLEX_UNIT_SP, 11.5f);
                tvMsg.setTextColor(Color.parseColor("#475569"));
                tvMsg.setMaxLines(2);
                tvMsg.setEllipsize(TextUtils.TruncateAt.END);
                tvMsg.setLineSpacing(dp(1), 1.0f);
                textLayout.addView(tvMsg);

                layout.addView(textLayout);

                // Action button if present
                if (actionText != null && !actionText.isEmpty()) {
                    TextView btn = new TextView(ctx);
                    btn.setText(actionText);
                    btn.setTextSize(TypedValue.COMPLEX_UNIT_SP, 11.5f);
                    btn.setTypeface(Typeface.DEFAULT_BOLD);
                    btn.setTextColor(Color.WHITE);
                    btn.setBackgroundResource(R.drawable.bg_mod_icon_rose);
                    btn.setPadding(dp(10), dp(6), dp(10), dp(6));
                    btn.setGravity(Gravity.CENTER);
                    btn.setOnClickListener(v -> {
                        if (action != null) action.run();
                        dismissBanner(card);
                    });
                    layout.addView(btn);
                } else {
                    // Close icon
                    ImageView closeBtn = new ImageView(ctx);
                    LinearLayout.LayoutParams closeLp = new LinearLayout.LayoutParams(dp(22), dp(22));
                    closeBtn.setLayoutParams(closeLp);
                    closeBtn.setImageResource(R.drawable.ic_close_cross);
                    closeBtn.setColorFilter(Color.parseColor("#94A3B8"));
                    closeBtn.setPadding(dp(3), dp(3), dp(3), dp(3));
                    closeBtn.setOnClickListener(v -> dismissBanner(card));
                    layout.addView(closeBtn);
                }

                card.addView(layout);
                card.setOnClickListener(v -> {
                    if (action != null) action.run();
                    dismissBanner(card);
                });

                // Attach to homeRoot
                if (homeRoot instanceof ViewGroup) {
                    ((ViewGroup) homeRoot).addView(card);
                }

                // Slide down animation with bounce
                card.setTranslationY(-dp(120));
                card.setAlpha(0f);
                card.animate()
                        .translationY(0)
                        .alpha(1f)
                        .setDuration(450)
                        .setInterpolator(new OvershootInterpolator(1.05f))
                        .start();

                // Auto-dismiss after 4.5 seconds
                card.postDelayed(() -> dismissBanner(card), 4500);

            } catch (Exception ignored) {}
        });
    }

    private void dismissBanner(View banner) {
        if (banner == null || !(homeRoot instanceof ViewGroup)) return;
        banner.animate()
                .translationY(-dp(120))
                .alpha(0f)
                .setDuration(350)
                .withEndAction(() -> {
                    try {
                        ((ViewGroup) homeRoot).removeView(banner);
                    } catch (Exception ignored) {}
                })
                .start();
    }

    private void triggerWelcomeNotificationIfEligible() {
        if (ctx == null) return;
        String token = getAuthToken();
        String userId = extractNameFromJwt(token);
        if (userId == null || userId.isEmpty()) userId = AuthManager.getUserEmail(ctx);
        if (userId == null || userId.isEmpty()) userId = currentFullName;

        String nameToUse = currentFullName;
        if (nameToUse == null || nameToUse.isEmpty() || "User".equalsIgnoreCase(nameToUse.trim()) || nameToUse.contains("@")) {
            String storedName = AuthManager.getUserName(ctx);
            if (storedName != null && !storedName.trim().isEmpty() && !"User".equalsIgnoreCase(storedName.trim()) && !storedName.contains("@")) {
                nameToUse = storedName;
            } else {
                String storedEmail = AuthManager.getUserEmail(ctx);
                if (storedEmail != null && !storedEmail.trim().isEmpty()) {
                    nameToUse = storedEmail;
                }
            }
        }
        String cleanFirstName = formatSmartFirstName(nameToUse);
        MobileNotificationHelper.scheduleWelcomeNotification(ctx, cleanFirstName, userId);
    }

    private void triggerLowBalanceAlertIfEligible(double balance) {
        // In-app low balance popups and automatic dashboard notifications removed per user specification.
        // Low balance notification will only fire when wallet balance is 0 and user attempts patient registration.
        if (balance <= 50) {
            if (bellDot != null) bellDot.setVisibility(View.VISIBLE);
        }
    }

    public static class NotificationPopupAdapter extends RecyclerView.Adapter<NotificationPopupAdapter.VH> {
        private final List<NotificationItem> items;
        private final OnNotifClick listener;

        public interface OnNotifClick {
            void onClick(NotificationItem item);
        }

        public NotificationPopupAdapter(List<NotificationItem> items, OnNotifClick listener) {
            this.items = items;
            this.listener = listener;
        }

        @NonNull
        @Override
        public VH onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
            View v = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_notification_row, parent, false);
            return new VH(v);
        }

        @Override
        public void onBindViewHolder(@NonNull VH holder, int position) {
            NotificationItem item = items.get(position);
            holder.title.setText(stripEmailFromString(item.title));
            holder.message.setText(stripEmailFromString(item.message));
            holder.time.setText(item.time);
            holder.unreadDot.setVisibility(item.isRead ? View.GONE : View.VISIBLE);

            if ("LOW_BALANCE".equalsIgnoreCase(item.type)) {
                holder.iconContainer.setBackgroundResource(R.drawable.bg_mod_icon_rose);
                holder.icon.setImageResource(R.drawable.ic_wallet);
                holder.icon.setColorFilter(0xFFE11D48);
            } else if ("WELCOME".equalsIgnoreCase(item.type)) {
                holder.iconContainer.setBackgroundResource(R.drawable.bg_mod_icon_blue);
                holder.icon.setImageResource(R.drawable.ic_bell);
                holder.icon.setColorFilter(0xFF2563EB);
            } else if ("PAYMENT".equalsIgnoreCase(item.type)) {
                holder.iconContainer.setBackgroundResource(R.drawable.bg_mod_icon_emerald);
                holder.icon.setImageResource(R.drawable.ic_card);
                holder.icon.setColorFilter(0xFF059669);
            } else if ("TEST".equalsIgnoreCase(item.type) || "ACCESSION".equalsIgnoreCase(item.type)) {
                holder.iconContainer.setBackgroundResource(R.drawable.bg_mod_icon_blue);
                holder.icon.setImageResource(R.drawable.ic_flask);
                holder.icon.setColorFilter(0xFF0D6EFD);
            } else if ("REPORT".equalsIgnoreCase(item.type)) {
                holder.iconContainer.setBackgroundResource(R.drawable.bg_mod_icon_sky);
                holder.icon.setImageResource(R.drawable.ic_document);
                holder.icon.setColorFilter(0xFF0284C7);
            } else if ("LAB_UPDATE".equalsIgnoreCase(item.type)) {
                holder.iconContainer.setBackgroundResource(R.drawable.bg_mod_icon_purple);
                holder.icon.setImageResource(R.drawable.ic_gear);
                holder.icon.setColorFilter(0xFF7C3AED);
            } else {
                holder.iconContainer.setBackgroundResource(R.drawable.bg_mod_icon_amber);
                holder.icon.setImageResource(R.drawable.ic_bell);
                holder.icon.setColorFilter(0xFFD97706);
            }

            holder.itemView.setOnClickListener(v -> listener.onClick(item));
        }

        @Override
        public int getItemCount() {
            return items.size();
        }

        static class VH extends RecyclerView.ViewHolder {
            FrameLayout iconContainer;
            ImageView icon;
            TextView title, message, time;
            View unreadDot;

            VH(View v) {
                super(v);
                iconContainer = v.findViewById(R.id.containerNotifIcon);
                icon          = v.findViewById(R.id.imgNotifIcon);
                title         = v.findViewById(R.id.lblNotifTitle);
                message       = v.findViewById(R.id.lblNotifMessage);
                time          = v.findViewById(R.id.lblNotifTime);
                unreadDot     = v.findViewById(R.id.dotNotifUnread);
            }
        }
    }

    public static void resetSession() {
        hasShownWelcomeNotification = false;
        hasShownLowBalanceNotification = false;
    }

    private void performSignOut() {
        resetSession();
        cachedNotifications.clear();
        currentFullName = "User";
        currentRole = "Lab Owner";
        currentWalletBalance = -1;
        MobileNotificationHelper.clearNotificationSession(ctx);
        AuthManager.clearSession(ctx);
        if (prefs != null) prefs.edit().clear().apply();
        try {
            ctx.getSharedPreferences("patholab_auth_prefs", Context.MODE_PRIVATE).edit().clear().apply();
            ctx.getSharedPreferences("patholab_general_prefs", Context.MODE_PRIVATE).edit().clear().apply();
            ctx.getSharedPreferences("patholab_home_prefs", Context.MODE_PRIVATE).edit().clear().apply();
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
    //  QR Code & Barcode Scanner Bottom Sheet
    // ─────────────────────────────────────────────────────────────────────────
    private void showQrScannerBottomSheet() {
        com.google.android.material.bottomsheet.BottomSheetDialog sheet =
                new com.google.android.material.bottomsheet.BottomSheetDialog(ctx);
        View sheetView = LayoutInflater.from(ctx).inflate(R.layout.layout_qr_scanner_sheet, null);
        sheet.setContentView(sheetView);

        FrameLayout btnClose = sheetView.findViewById(R.id.btnQrScannerClose);
        if (btnClose != null) {
            btnClose.setOnClickListener(v -> sheet.dismiss());
        }

        View laser = sheetView.findViewById(R.id.viewScanLaser);
        if (laser != null) {
            android.view.animation.TranslateAnimation animation = new android.view.animation.TranslateAnimation(
                    0, 0, -dp(60), dp(60));
            animation.setDuration(1200);
            animation.setRepeatCount(android.view.animation.Animation.INFINITE);
            animation.setRepeatMode(android.view.animation.Animation.REVERSE);
            laser.startAnimation(animation);
        }

        TextView chipSample = sheetView.findViewById(R.id.chipModeSample);
        TextView chipPatient = sheetView.findViewById(R.id.chipModePatient);
        TextView chipReport = sheetView.findViewById(R.id.chipModeReport);
        TextView chipWebSync = sheetView.findViewById(R.id.chipModeWebSync);
        TextView lblHint = sheetView.findViewById(R.id.lblScannerHint);
        EditText txtManual = sheetView.findViewById(R.id.txtManualBarcode);
        android.widget.Button btnSubmit = sheetView.findViewById(R.id.btnSubmitManualCode);
        FrameLayout btnFlash = sheetView.findViewById(R.id.btnScannerFlash);

        final String[] activeMode = {"SAMPLE"};

        Runnable updateChips = () -> {
            if (chipSample != null) {
                chipSample.setBackgroundResource(activeMode[0].equals("SAMPLE") ? R.drawable.bg_btn_primary : R.drawable.bg_chip_inactive);
                chipSample.setTextColor(activeMode[0].equals("SAMPLE") ? 0xFFFFFFFF : 0xFF475569);
            }
            if (chipPatient != null) {
                chipPatient.setBackgroundResource(activeMode[0].equals("PATIENT") ? R.drawable.bg_btn_primary : R.drawable.bg_chip_inactive);
                chipPatient.setTextColor(activeMode[0].equals("PATIENT") ? 0xFFFFFFFF : 0xFF475569);
            }
            if (chipReport != null) {
                chipReport.setBackgroundResource(activeMode[0].equals("REPORT") ? R.drawable.bg_btn_primary : R.drawable.bg_chip_inactive);
                chipReport.setTextColor(activeMode[0].equals("REPORT") ? 0xFFFFFFFF : 0xFF475569);
            }
            if (chipWebSync != null) {
                chipWebSync.setBackgroundResource(activeMode[0].equals("WEBSYNC") ? R.drawable.bg_btn_primary : R.drawable.bg_chip_inactive);
                chipWebSync.setTextColor(activeMode[0].equals("WEBSYNC") ? 0xFFFFFFFF : 0xFF475569);
            }

            if (activeMode[0].equals("SAMPLE")) {
                if (lblHint != null) lblHint.setText("Align sample vial barcode within frame");
                if (txtManual != null) txtManual.setHint("Enter Sample ID (e.g. SMP-10023)");
            } else if (activeMode[0].equals("PATIENT")) {
                if (lblHint != null) lblHint.setText("Align patient UHID / Requisition QR within frame");
                if (txtManual != null) txtManual.setHint("Enter UHID / Phone (e.g. UHID-9021)");
            } else if (activeMode[0].equals("REPORT")) {
                if (lblHint != null) lblHint.setText("Align Report verification QR within frame");
                if (txtManual != null) txtManual.setHint("Enter Report Tracking Code");
            } else if (activeMode[0].equals("WEBSYNC")) {
                if (lblHint != null) lblHint.setText("Scan web login QR on your computer screen");
                if (txtManual != null) txtManual.setHint("Enter 6-digit Web Sync Code");
            }
        };

        if (chipSample != null) chipSample.setOnClickListener(v -> { activeMode[0] = "SAMPLE"; updateChips.run(); });
        if (chipPatient != null) chipPatient.setOnClickListener(v -> { activeMode[0] = "PATIENT"; updateChips.run(); });
        if (chipReport != null) chipReport.setOnClickListener(v -> { activeMode[0] = "REPORT"; updateChips.run(); });
        if (chipWebSync != null) chipWebSync.setOnClickListener(v -> { activeMode[0] = "WEBSYNC"; updateChips.run(); });

        final boolean[] isFlashOn = {false};
        if (btnFlash != null) {
            btnFlash.setOnClickListener(v -> {
                isFlashOn[0] = !isFlashOn[0];
                Toast.makeText(ctx, isFlashOn[0] ? "Scanner Flash ON" : "Scanner Flash OFF", Toast.LENGTH_SHORT).show();
            });
        }

        if (btnSubmit != null && txtManual != null) {
            btnSubmit.setOnClickListener(v -> {
                String code = txtManual.getText().toString().trim();
                if (code.isEmpty()) {
                    Toast.makeText(ctx, "Please enter a code or scan with camera", Toast.LENGTH_SHORT).show();
                    return;
                }
                sheet.dismiss();
                if (activeMode[0].equals("SAMPLE")) {
                    Intent intent = new Intent(ctx, SamplesActivity.class);
                    intent.putExtra("searchQuery", code);
                    ctx.startActivity(intent);
                } else if (activeMode[0].equals("PATIENT")) {
                    Intent intent = new Intent(ctx, PatientWorklistActivity.class);
                    intent.putExtra("searchQuery", code);
                    ctx.startActivity(intent);
                } else if (activeMode[0].equals("REPORT")) {
                    Intent intent = new Intent(ctx, ReportsActivity.class);
                    intent.putExtra("searchQuery", code);
                    ctx.startActivity(intent);
                } else {
                    Toast.makeText(ctx, "Web session synchronized with code: " + code, Toast.LENGTH_LONG).show();
                }
            });
        }

        sheet.show();
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  All Modules Bottom Sheet (Takes 85% of screen height with Cross Close button)
    // ─────────────────────────────────────────────────────────────────────────
    private static class SheetModDef {
        String name;
        String path;
        String iconDrawable;
        String bgDrawable;

        SheetModDef(String name, String path, String iconDrawable, String bgDrawable) {
            this.name = name;
            this.path = path;
            this.iconDrawable = iconDrawable;
            this.bgDrawable = bgDrawable;
        }
    }

    public void showAllModulesBottomSheet() {
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

            LinearLayout contentContainer = sheetView.findViewById(R.id.containerAllModulesContent);
            if (contentContainer != null) {
                // 1. OVERVIEW
                List<SheetModDef> overviewList = Arrays.asList(
                        new SheetModDef("Home", "/dashboard", "ic_mod_clean_home", "bg_mod_icon_blue"),
                        new SheetModDef("Dashboard", "/dashboard", "ic_mod_clean_dashboard", "bg_mod_icon_sky"),
                        new SheetModDef("Financial Analytics", "/workspace/analytics", "ic_mod_clean_analytics", "bg_mod_icon_emerald"),
                        new SheetModDef("Online Booking", "/workspace/online-booking", "ic_mod_clean_booking", "bg_mod_icon_purple")
                );
                buildCategorySection(sheet, contentContainer, "OVERVIEW", overviewList);

                // 2. CLINICAL OPERATIONS
                List<SheetModDef> clinicalList = Arrays.asList(
                        new SheetModDef("New Registration", "/workspace/registration", "ic_mod_clean_register", "bg_mod_icon_blue"),
                        new SheetModDef("Patient Directory", "/workspace/patients", "ic_mod_clean_patients", "bg_mod_icon_fuchsia"),
                        new SheetModDef("Test Management", "/workspace/test-management", "ic_mod_clean_tests", "bg_mod_icon_purple"),
                        new SheetModDef("Worklist & Results", "/workspace/results", "ic_mod_clean_worklist", "bg_mod_icon_indigo"),
                        new SheetModDef("Report Dispatch", "/workspace/reports", "ic_mod_clean_reports", "bg_mod_icon_amber")
                );
                buildCategorySection(sheet, contentContainer, "CLINICAL OPERATIONS", clinicalList);

                // 3. RADIOLOGY
                List<SheetModDef> radiologyList = Arrays.asList(
                        new SheetModDef("RIS Dashboard", "/workspace/radiology/dashboard", "ic_mod_clean_ris", "bg_mod_icon_purple"),
                        new SheetModDef("Scan Schedule", "/workspace/radiology/dashboard/appointments", "ic_mod_clean_scan_schedule", "bg_mod_icon_blue"),
                        new SheetModDef("Technician Worklist", "/workspace/radiology/worklist", "ic_mod_clean_tech_worklist", "bg_mod_icon_teal"),
                        new SheetModDef("PACS Viewer", "/workspace/radiology/pacs", "ic_mod_clean_pacs", "bg_mod_icon_indigo"),
                        new SheetModDef("Media Library", "/workspace/radiology/media", "ic_mod_clean_media", "bg_mod_icon_rose"),
                        new SheetModDef("Reporting Queue", "/workspace/radiology/reporting", "ic_mod_clean_rad_reporting", "bg_mod_icon_emerald"),
                        new SheetModDef("Reports Archive", "/workspace/radiology/archive", "ic_mod_clean_archive", "bg_mod_icon_amber"),
                        new SheetModDef("Machines", "/workspace/radiology/machines", "ic_mod_clean_machines", "bg_mod_icon_teal"),
                        new SheetModDef("RIS Macros", "/workspace/radiology/macros", "ic_mod_clean_macros", "bg_mod_icon_orange"),
                        new SheetModDef("DICOM Settings", "/workspace/radiology/settings/dicom", "ic_mod_clean_dicom", "bg_mod_icon_blue"),
                        new SheetModDef("RIS Letterhead", "/workspace/radiology/settings/letterhead", "ic_mod_clean_letterhead", "bg_mod_icon_purple")
                );
                buildCategorySection(sheet, contentContainer, "RADIOLOGY", radiologyList);

                // 4. RESOURCES & LOGISTICS
                List<SheetModDef> resourcesList = Arrays.asList(
                        new SheetModDef("Inventory & Stock", "/workspace/inventory", "ic_mod_clean_inventory", "bg_mod_icon_teal"),
                        new SheetModDef("Logistics / Trips", "/workspace/logistics", "ic_mod_clean_logistics", "bg_mod_icon_sky"),
                        new SheetModDef("Home Collection", "/workspace/home-collection", "ic_mod_clean_samples", "bg_mod_icon_rose")
                );
                buildCategorySection(sheet, contentContainer, "RESOURCES & LOGISTICS", resourcesList);

                // 5. MACHINE & AI
                List<SheetModDef> machineAiList = Arrays.asList(
                        new SheetModDef("Analyzer", "/workspace/analyzers", "ic_mod_clean_analyzer", "bg_mod_icon_sky"),
                        new SheetModDef("Visual Mapper", "/workspace/analyzers/mapper", "ic_mod_clean_mapper", "bg_mod_icon_indigo"),
                        new SheetModDef("Mappings", "/workspace/analyzers/mappings", "ic_mod_clean_mappings", "bg_mod_icon_purple")
                );
                buildCategorySection(sheet, contentContainer, "MACHINE & AI", machineAiList);

                // 6. B2B & GROWTH
                List<SheetModDef> b2bGrowthList = Arrays.asList(
                        new SheetModDef("Referral Doctors", "/workspace/doctors", "ic_mod_clean_doctors", "bg_mod_icon_blue"),
                        new SheetModDef("Corporate Agencies", "/workspace/agencies", "ic_mod_clean_agencies", "bg_mod_icon_orange"),
                        new SheetModDef("Commissions Payout", "/workspace/commissions", "ic_mod_clean_payout", "bg_mod_icon_purple")
                );
                buildCategorySection(sheet, contentContainer, "B2B & GROWTH", b2bGrowthList);

                // 7. ADMINISTRATION
                List<SheetModDef> adminList = Arrays.asList(
                        new SheetModDef("Lab Settings", "/workspace/settings", "ic_mod_clean_settings", "bg_mod_icon_indigo"),
                        new SheetModDef("Report Templates", "/workspace/settings/templates", "ic_mod_clean_templates", "bg_mod_icon_purple"),
                        new SheetModDef("Invoice Branding", "/workspace/settings/branding", "ic_mod_clean_branding", "bg_mod_icon_sky"),
                        new SheetModDef("Service Areas", "/workspace/settings/service-areas", "ic_mod_clean_service_areas", "bg_mod_icon_amber"),
                        new SheetModDef("Payment Settings", "/workspace/settings/payments", "ic_mod_clean_payment_settings", "bg_mod_icon_emerald"),
                        new SheetModDef("Notifications", "/workspace/settings/notifications", "ic_mod_clean_notifications", "bg_mod_icon_rose"),
                        new SheetModDef("B2B Settings", "/workspace/settings/b2b", "ic_mod_clean_b2b_settings", "bg_mod_icon_blue"),
                        new SheetModDef("Staff Management", "/workspace/staff", "ic_mod_clean_staff", "bg_mod_icon_fuchsia"),
                        new SheetModDef("Invoices & Payments", "/workspace/billing", "ic_mod_clean_billing", "bg_mod_icon_emerald"),
                        new SheetModDef("Expenses", "/workspace/expenses", "ic_mod_clean_expenses", "bg_mod_icon_rose"),
                        new SheetModDef("Audit Logs", "/workspace/audit-logs", "ic_mod_clean_audit", "bg_mod_icon_teal"),
                        new SheetModDef("Wallet & Billing", "/workspace/wallet", "ic_mod_clean_wallet", "bg_mod_icon_indigo"),
                        new SheetModDef("Wallet Recharge", "/workspace/wallet/recharge", "ic_mod_clean_recharge", "bg_mod_icon_emerald"),
                        new SheetModDef("Help & Support", "/workspace/support", "ic_mod_clean_support", "bg_mod_icon_orange")
                );
                buildCategorySection(sheet, contentContainer, "ADMINISTRATION", adminList);
            }

            // Omnibar live search filter
            EditText searchInput = sheetView.findViewById(R.id.inputSearchAllModules);
            if (searchInput != null && contentContainer != null) {
                searchInput.addTextChangedListener(new TextWatcher() {
                    @Override public void beforeTextChanged(CharSequence s, int start, int count, int after) {}
                    @Override public void onTextChanged(CharSequence s, int start, int before, int count) {
                        filterSheetModules(contentContainer, s.toString().trim().toLowerCase(Locale.ROOT));
                    }
                    @Override public void afterTextChanged(Editable s) {}
                });
            }

            sheet.show();

        } catch (Exception ignored) {}
    }

    private void buildCategorySection(com.google.android.material.bottomsheet.BottomSheetDialog sheet, LinearLayout container, String title, List<SheetModDef> modules) {
        if (container == null || modules == null || modules.isEmpty()) return;

        LinearLayout secLayout = new LinearLayout(ctx);
        secLayout.setOrientation(LinearLayout.VERTICAL);
        secLayout.setBackgroundResource(R.drawable.bg_home_modules_bento);
        secLayout.setPadding(dp(14), dp(14), dp(14), dp(14));
        LinearLayout.LayoutParams secLp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        secLp.setMargins(0, 0, 0, dp(14));
        secLayout.setLayoutParams(secLp);

        TextView tvTitle = new TextView(ctx);
        tvTitle.setText(title);
        tvTitle.setTextSize(11.5f);
        tvTitle.setTypeface(Typeface.create("sans-serif", Typeface.BOLD));
        tvTitle.setTextColor(0xFF64748B);
        tvTitle.setLetterSpacing(0.06f);
        LinearLayout.LayoutParams titleLp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        titleLp.setMargins(dp(2), 0, dp(2), dp(12));
        tvTitle.setLayoutParams(titleLp);
        secLayout.addView(tvTitle);

        for (int i = 0; i < modules.size(); i += 4) {
            LinearLayout row = new LinearLayout(ctx);
            row.setOrientation(LinearLayout.HORIZONTAL);
            row.setWeightSum(4);
            LinearLayout.LayoutParams rowLp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
            rowLp.setMargins(0, 0, 0, dp(10));
            row.setLayoutParams(rowLp);

            for (int j = i; j < i + 4; j++) {
                if (j < modules.size()) {
                    SheetModDef mod = modules.get(j);
                    LinearLayout card = createSheetModuleCard(sheet, mod);
                    row.addView(card);
                } else {
                    View spacer = new View(ctx);
                    LinearLayout.LayoutParams spLp = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.MATCH_PARENT, 1.0f);
                    spLp.setMargins(dp(2), 0, dp(2), 0);
                    spacer.setLayoutParams(spLp);
                    row.addView(spacer);
                }
            }
            secLayout.addView(row);
        }

        container.addView(secLayout);
    }

    private LinearLayout createSheetModuleCard(com.google.android.material.bottomsheet.BottomSheetDialog sheet, SheetModDef mod) {
        LinearLayout card = new LinearLayout(ctx);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setGravity(android.view.Gravity.CENTER_HORIZONTAL);
        card.setPadding(dp(2), dp(4), dp(2), dp(4));
        card.setClickable(true);
        card.setFocusable(true);

        LinearLayout.LayoutParams cardLp = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.0f);
        cardLp.setMargins(dp(2), 0, dp(2), 0);
        card.setLayoutParams(cardLp);

        String iconName = mod.iconDrawable;
        // Migrate legacy 3D names
        if ("ic_mod_registration".equals(iconName)) iconName = "ic_mod_clean_register";
        else if ("ic_mod_tests".equals(iconName)) iconName = "ic_mod_clean_tests";
        else if ("ic_mod_billing".equals(iconName)) iconName = "ic_mod_clean_billing";
        else if ("ic_mod_reports".equals(iconName)) iconName = "ic_mod_clean_reports";
        else if ("ic_mod_samples".equals(iconName)) iconName = "ic_mod_clean_samples";
        else if ("ic_mod_logistics".equals(iconName)) iconName = "ic_mod_clean_logistics";
        else if ("ic_mod_wallet".equals(iconName)) iconName = "ic_mod_clean_wallet";

        int bgRes = ctx.getResources().getIdentifier(mod.bgDrawable, "drawable", ctx.getPackageName());
        if (bgRes == 0) bgRes = R.drawable.bg_mod_icon_blue;
        int iconRes = ctx.getResources().getIdentifier(iconName, "drawable", ctx.getPackageName());
        if (iconRes == 0) iconRes = R.drawable.ic_mod_clean_register;

        FrameLayout iconFrame = new FrameLayout(ctx);
        LinearLayout.LayoutParams frameLp = new LinearLayout.LayoutParams(dp(48), dp(48));
        iconFrame.setLayoutParams(frameLp);
        iconFrame.setBackgroundResource(bgRes);

        ImageView iv = new ImageView(ctx);
        int iconSize = dp(26);
        FrameLayout.LayoutParams ivLp = new FrameLayout.LayoutParams(iconSize, iconSize, android.view.Gravity.CENTER);
        iv.setLayoutParams(ivLp);
        iv.setScaleType(ImageView.ScaleType.FIT_CENTER);
        iv.setImageResource(iconRes);
        iconFrame.addView(iv);
        card.addView(iconFrame);

        TextView tv = new TextView(ctx);
        tv.setText(mod.name);
        tv.setTextSize(11.5f);
        tv.setTextColor(0xFF1E293B);
        tv.setTypeface(Typeface.create("sans-serif", Typeface.BOLD));
        tv.setGravity(android.view.Gravity.CENTER);
        tv.setMaxLines(2);
        tv.setLineSpacing(0f, 1.05f);
        tv.setEllipsize(android.text.TextUtils.TruncateAt.END);
        LinearLayout.LayoutParams tvLp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        tvLp.setMargins(0, dp(6), 0, 0);
        tv.setLayoutParams(tvLp);
        card.addView(tv);

        final String finalIconName = iconName;
        card.setOnClickListener(v -> {
            recordRecentModule(mod.name, mod.path, finalIconName, mod.bgDrawable);
            sheet.dismiss();
            navigateToModule(mod.path);
        });

        return card;
    }

    private void navigateToModule(String path) {
        if (path == null) return;
        if (path.equals("/dashboard") || path.equals("/workspace/dashboard") || path.startsWith("/dashboard")
                || path.equals("/workspace") || path.equals("/home") || path.equals("/")) {
            ctx.startActivity(new Intent(ctx, LabDashboardActivity.class));
            return;
        } else if (path.equals("/workspace/analytics") || path.startsWith("/workspace/analytics")) {
            ctx.startActivity(new Intent(ctx, FinancialAnalyticsActivity.class));
        } else if (path.equals("/workspace/wallet") || path.startsWith("/workspace/wallet")) {
            ctx.startActivity(new Intent(ctx, WalletActivity.class));
        } else if (path.equals("/workspace/registration") || path.startsWith("/workspace/registration") || path.equals("/workspace/patients/new")) {
            ctx.startActivity(new Intent(ctx, RegistrationActivity.class));
        } else if (path.equals("/workspace/test-management") || path.startsWith("/workspace/test-management") || path.equals("/workspace/tests")) {
            ctx.startActivity(new Intent(ctx, TestManagementActivity.class));
        } else if (path.equals("/workspace/billing") || path.startsWith("/workspace/billing") || path.equals("/workspace/invoices")) {
            ctx.startActivity(new Intent(ctx, BillingActivity.class));
        } else if (path.equals("/workspace/reports") || path.startsWith("/workspace/reports")) {
            ctx.startActivity(new Intent(ctx, ReportsActivity.class));
        } else if (path.equals("/workspace/samples") || path.startsWith("/workspace/samples") || path.equals("/workspace/accession")) {
            ctx.startActivity(new Intent(ctx, SamplesActivity.class));
        } else if (path.equals("/workspace/patients") || path.startsWith("/workspace/patients") || path.equals("/workspace/results")) {
            ctx.startActivity(new Intent(ctx, PatientWorklistActivity.class));
        } else if (path.equals("/workspace/staff") || path.startsWith("/workspace/staff")) {
            ctx.startActivity(new Intent(ctx, StaffManagementActivity.class));
        } else if (path.equals("/workspace/support") || path.startsWith("/workspace/support")) {
            ctx.startActivity(new Intent(ctx, SupportActivity.class));
        } else if (navListener != null) {
            navListener.onNavigateTo(path);
        }
    }

    private void filterSheetModules(ViewGroup parent, String query) {
        if (parent == null) return;
        for (int i = 0; i < parent.getChildCount(); i++) {
            View child = parent.getChildAt(i);
            if (child instanceof ViewGroup) {
                boolean containsMatch = false;
                for (int j = 0; j < ((ViewGroup) child).getChildCount(); j++) {
                    View sub = ((ViewGroup) child).getChildAt(j);
                    if (sub instanceof TextView) {
                        String txt = ((TextView) sub).getText().toString().toLowerCase(Locale.ROOT);
                        if (txt.contains(query)) containsMatch = true;
                    } else if (sub instanceof ViewGroup) {
                        for (int k = 0; k < ((ViewGroup) sub).getChildCount(); k++) {
                            View leaf = ((ViewGroup) sub).getChildAt(k);
                            if (leaf instanceof TextView) {
                                String txt = ((TextView) leaf).getText().toString().toLowerCase(Locale.ROOT);
                                if (txt.contains(query)) containsMatch = true;
                            }
                        }
                    }
                }
                if (query.isEmpty()) {
                    child.setVisibility(View.VISIBLE);
                } else {
                    child.setVisibility(containsMatch ? View.VISIBLE : View.GONE);
                }
            }
        }
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
            String iconName = item.optString("icon", "ic_mod_clean_register");
            final String bgName = item.optString("bg", "bg_mod_icon_blue");

            // Migrate legacy 3D names
            if ("ic_mod_registration".equals(iconName)) iconName = "ic_mod_clean_register";
            else if ("ic_mod_tests".equals(iconName)) iconName = "ic_mod_clean_tests";
            else if ("ic_mod_billing".equals(iconName)) iconName = "ic_mod_clean_billing";
            else if ("ic_mod_reports".equals(iconName)) iconName = "ic_mod_clean_reports";
            else if ("ic_mod_samples".equals(iconName)) iconName = "ic_mod_clean_samples";
            else if ("ic_mod_logistics".equals(iconName)) iconName = "ic_mod_clean_logistics";
            else if ("ic_mod_wallet".equals(iconName)) iconName = "ic_mod_clean_wallet";

            int iconRes = ctx.getResources().getIdentifier(iconName, "drawable", ctx.getPackageName());
            int bgRes = ctx.getResources().getIdentifier(bgName, "drawable", ctx.getPackageName());
            if (iconRes == 0) iconRes = R.drawable.ic_mod_clean_register;
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

            // Icon Frame (Always 32dp squircle with tinted background)
            FrameLayout iconFrame = new FrameLayout(ctx);
            iconFrame.setLayoutParams(new LinearLayout.LayoutParams(dp(32), dp(32)));
            iconFrame.setBackgroundResource(bgRes);

            ImageView iv = new ImageView(ctx);
            int iconSize = dp(20);
            FrameLayout.LayoutParams ivLp = new FrameLayout.LayoutParams(iconSize, iconSize);
            ivLp.gravity = android.view.Gravity.CENTER;
            iv.setLayoutParams(ivLp);
            iv.setScaleType(ImageView.ScaleType.FIT_CENTER);
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

            final String finalIconName = iconName;
            chip.setOnClickListener(v -> {
                recordRecentModule(name, path, finalIconName, bgName);
                sheet.dismiss();
                navigateToModule(path);
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
        return null;
    }

    private JSONArray getDefaultRecents() {
        JSONArray arr = new JSONArray();
        try {
            JSONObject m1 = new JSONObject();
            m1.put("name", "Registration");
            m1.put("path", "/workspace/registration");
            m1.put("icon", "ic_mod_clean_register");
            m1.put("bg", "bg_mod_icon_blue");
            arr.put(m1);

            JSONObject m2 = new JSONObject();
            m2.put("name", "Tests");
            m2.put("path", "/workspace/test-management");
            m2.put("icon", "ic_mod_clean_tests");
            m2.put("bg", "bg_mod_icon_purple");
            arr.put(m2);

            JSONObject m3 = new JSONObject();
            m3.put("name", "Billing");
            m3.put("path", "/workspace/billing");
            m3.put("icon", "ic_mod_clean_billing");
            m3.put("bg", "bg_mod_icon_emerald");
            arr.put(m3);
        } catch (Exception ignored) {}
        return arr;
    }

    private void recordRecentModule(String name, String path, String icon, String bg) {
        if (prefs == null || name == null || path == null) return;
        try {
            JSONArray cur = getRecentModules();
            if (cur == null || cur.length() == 0) cur = getDefaultRecents();

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

    // ─────────────────────────────────────────────────────────────────────────
    //  Waving Hand 🤚 Animation (Animates on launch and every home return)
    // ─────────────────────────────────────────────────────────────────────────
    public void playWaveAnimation() {
        if (homeWaveEmoji == null) return;
        mainHandler.postDelayed(() -> {
            if (homeWaveEmoji == null) return;
            homeWaveEmoji.setPivotX(homeWaveEmoji.getWidth() > 0 ? homeWaveEmoji.getWidth() * 0.75f : dp(14));
            homeWaveEmoji.setPivotY(homeWaveEmoji.getHeight() > 0 ? homeWaveEmoji.getHeight() * 0.90f : dp(17));

            ObjectAnimator wave = ObjectAnimator.ofFloat(homeWaveEmoji, "rotation",
                    0f, 24f, -16f, 22f, -12f, 18f, -6f, 10f, 0f);
            wave.setDuration(1200);
            wave.setInterpolator(new AccelerateDecelerateInterpolator());
            wave.start();
        }, 250);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Module clicks
    // ─────────────────────────────────────────────────────────────────────────
    private void setupModuleClicks() {
        clickModule(R.id.modDashboard,    "/workspace/dashboard",       "Dashboard",         "ic_mod_clean_dashboard", "bg_mod_icon_sky");
        clickModule(R.id.modPatients,     "/workspace/patients",        "Patient Directory", "ic_mod_clean_patients",  "bg_mod_icon_purple");
        clickModule(R.id.modRegistration, "/workspace/registration",    "New Registration",  "ic_mod_clean_register",  "bg_mod_icon_blue");
        clickModule(R.id.modReports,      "/workspace/reports",         "Reports",           "ic_mod_clean_reports",   "bg_mod_icon_amber");
        clickModule(R.id.modTests,        "/workspace/test-management", "Test Management",   "ic_mod_clean_tests",     "bg_mod_icon_indigo");
        clickModule(R.id.modWallet,       "/workspace/wallet",          "Wallet",            "ic_mod_clean_wallet",    "bg_mod_icon_rose");
        clickModule(R.id.modBilling,      "/workspace/billing",         "Invoice",           "ic_mod_clean_billing",   "bg_mod_icon_emerald");
        clickModule(R.id.modB2B,          "/workspace/agencies",        "B2B",               "ic_mod_clean_agencies",  "bg_mod_icon_teal");
    }

    private void clickModule(int viewId, String path, String name, String icon, String bg) {
        View v = homeRoot.findViewById(viewId);
        if (v != null) {
            v.setOnClickListener(x -> {
                recordRecentModule(name, path, icon, bg);
                if (path.equals("/workspace/wallet") || path.startsWith("/workspace/wallet")) {
                    ctx.startActivity(new Intent(ctx, WalletActivity.class));
                } else if (path.equals("/workspace/registration") || path.startsWith("/workspace/registration") || path.equals("/workspace/patients/new")) {
                    ctx.startActivity(new Intent(ctx, RegistrationActivity.class));
                } else if (path.equals("/workspace/test-management") || path.startsWith("/workspace/test-management") || path.equals("/workspace/tests")) {
                    ctx.startActivity(new Intent(ctx, TestManagementActivity.class));
                } else if (path.equals("/workspace/billing") || path.startsWith("/workspace/billing") || path.equals("/workspace/invoices")) {
                    ctx.startActivity(new Intent(ctx, BillingActivity.class));
                } else if (path.equals("/workspace/reports") || path.startsWith("/workspace/reports")) {
                    ctx.startActivity(new Intent(ctx, ReportsActivity.class));
                } else if (path.equals("/workspace/samples") || path.startsWith("/workspace/samples") || path.equals("/workspace/accession")) {
                    ctx.startActivity(new Intent(ctx, SamplesActivity.class));
                } else if (path.equals("/workspace/patients") || path.startsWith("/workspace/patients") || path.equals("/workspace/results")) {
                    ctx.startActivity(new Intent(ctx, PatientWorklistActivity.class));
                } else if (path.equals("/workspace/staff") || path.startsWith("/workspace/staff")) {
                    ctx.startActivity(new Intent(ctx, StaffManagementActivity.class));
                } else if (path.equals("/workspace/analytics") || path.startsWith("/workspace/analytics") || path.equals("/analytics") || path.startsWith("/analytics")) {
                    ctx.startActivity(new Intent(ctx, FinancialAnalyticsActivity.class));
                } else if (path.equals("/dashboard") || path.equals("/workspace/dashboard") || path.startsWith("/dashboard")
                        || path.equals("/workspace") || path.equals("/home") || path.equals("/")) {
                    ctx.startActivity(new Intent(ctx, LabDashboardActivity.class));
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
            int dpW = i == currentBannerIdx ? 18 : 6;
            int dpH = 6;
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(dp(dpW), dp(dpH));
            lp.setMargins(dp(2), 0, dp(2), 0);
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
                } else if (path.equals("/workspace/reports") || path.startsWith("/workspace/reports")) {
                    ctx.startActivity(new Intent(ctx, ReportsActivity.class));
                } else if (path.equals("/workspace/billing") || path.startsWith("/workspace/billing")) {
                    ctx.startActivity(new Intent(ctx, BillingActivity.class));
                } else if (path.equals("/workspace/test-management") || path.startsWith("/workspace/test-management")) {
                    ctx.startActivity(new Intent(ctx, TestManagementActivity.class));
                } else if (path.equals("/workspace/samples") || path.startsWith("/workspace/samples") || path.contains("accession")) {
                    ctx.startActivity(new Intent(ctx, SamplesActivity.class));
                } else if (path.equals("/workspace/analytics") || path.startsWith("/workspace/analytics")) {
                    ctx.startActivity(new Intent(ctx, FinancialAnalyticsActivity.class));
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
                carouselHandler.postDelayed(this, 3600);
            }
        };
        carouselHandler.postDelayed(carouselRunnable, 3600);
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
                                if (txtWalletBalance != null) {
                                    txtWalletBalance.setText("Wallet: " + formatted);
                                }
                                triggerLowBalanceAlertIfEligible(bal);
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
    public enum ConnectionState {
        ONLINE,      // Green = Online
        CONNECTING,  // Yellow = Connecting/Waiting (checks connectivity for 2-4s)
        OFFLINE      // Red = Offline
    }

    private ConnectionState currentConnectionState = ConnectionState.ONLINE;
    private Runnable pendingOfflineVerificationRunnable = null;
    private static final int NETWORK_LOSS_VERIFICATION_DELAY_MS = 3000; // 3 seconds (in 2-4s range)

    private void initConnectivityMonitor() {
        try {
            ConnectivityManager cm = (ConnectivityManager) ctx.getSystemService(Context.CONNECTIVITY_SERVICE);
            if (cm != null) {
                boolean initialConnected = checkActiveNetworkConnected(cm);
                setConnectionState(initialConnected ? ConnectionState.ONLINE : ConnectionState.OFFLINE);

                NetworkRequest req = new NetworkRequest.Builder()
                        .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
                        .build();
                cm.registerNetworkCallback(req, new ConnectivityManager.NetworkCallback() {
                    @Override
                    public void onAvailable(@NonNull Network network) {
                        mainHandler.post(() -> {
                            if (pendingOfflineVerificationRunnable != null) {
                                mainHandler.removeCallbacks(pendingOfflineVerificationRunnable);
                                pendingOfflineVerificationRunnable = null;
                            }
                            if (currentConnectionState != ConnectionState.ONLINE) {
                                setConnectionState(ConnectionState.CONNECTING);
                                mainHandler.postDelayed(() -> {
                                    if (checkActiveNetworkConnected(cm)) {
                                        setConnectionState(ConnectionState.ONLINE);
                                    }
                                }, 1200);
                            } else {
                                setConnectionState(ConnectionState.ONLINE);
                            }
                        });
                    }

                    @Override
                    public void onLost(@NonNull Network network) {
                        mainHandler.post(() -> {
                            if (pendingOfflineVerificationRunnable != null) {
                                mainHandler.removeCallbacks(pendingOfflineVerificationRunnable);
                            }
                            // Immediately switch status to Yellow while checking for Wi-Fi / mobile data / internet
                            setConnectionState(ConnectionState.CONNECTING);

                            pendingOfflineVerificationRunnable = () -> {
                                boolean stillConnected = checkActiveNetworkConnected(cm);
                                if (stillConnected) {
                                    setConnectionState(ConnectionState.ONLINE);
                                } else {
                                    // Deep background socket / HTTP reachability probe
                                    new Thread(() -> {
                                        boolean probeSuccess = probeInternetReachability();
                                        mainHandler.post(() -> {
                                            if (probeSuccess) {
                                                setConnectionState(ConnectionState.ONLINE);
                                            } else {
                                                setConnectionState(ConnectionState.OFFLINE);
                                            }
                                        });
                                    }).start();
                                }
                            };
                            mainHandler.postDelayed(pendingOfflineVerificationRunnable, NETWORK_LOSS_VERIFICATION_DELAY_MS);
                        });
                    }

                    @Override
                    public void onCapabilitiesChanged(@NonNull Network network, @NonNull NetworkCapabilities caps) {
                        if (caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
                                && caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)) {
                            mainHandler.post(() -> {
                                if (pendingOfflineVerificationRunnable != null) {
                                    mainHandler.removeCallbacks(pendingOfflineVerificationRunnable);
                                    pendingOfflineVerificationRunnable = null;
                                }
                                setConnectionState(ConnectionState.ONLINE);
                            });
                        }
                    }
                });
            }
        } catch (Exception e) {
            setConnectionState(ConnectionState.ONLINE);
        }
    }

    private boolean checkActiveNetworkConnected(ConnectivityManager cm) {
        if (cm == null) return false;
        try {
            Network activeNetwork = cm.getActiveNetwork();
            if (activeNetwork == null) return false;
            NetworkCapabilities caps = cm.getNetworkCapabilities(activeNetwork);
            return caps != null && caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET);
        } catch (Exception e) {
            return false;
        }
    }

    private boolean probeInternetReachability() {
        try {
            java.net.Socket socket = new java.net.Socket();
            java.net.SocketAddress socketAddress = new java.net.InetSocketAddress("8.8.8.8", 53);
            socket.connect(socketAddress, 1500);
            socket.close();
            return true;
        } catch (Exception e) {
            try {
                java.net.HttpURLConnection urlc = (java.net.HttpURLConnection)
                        (new java.net.URL("https://clients3.google.com/generate_204").openConnection());
                urlc.setRequestProperty("User-Agent", "Android");
                urlc.setRequestProperty("Connection", "close");
                urlc.setConnectTimeout(1500);
                urlc.setReadTimeout(1500);
                urlc.connect();
                return (urlc.getResponseCode() == 204 || urlc.getResponseCode() == 200);
            } catch (Exception ignored) {
                return false;
            }
        }
    }

    public void setConnectionState(ConnectionState state) {
        currentConnectionState = state;
        isNetworkOnline = (state == ConnectionState.ONLINE);
        if (statusDot == null || statusWave == null) return;

        int dotRes;
        int waveRes;
        switch (state) {
            case ONLINE:
                dotRes = R.drawable.bg_online_dot;
                waveRes = R.drawable.bg_status_wave_green;
                break;
            case CONNECTING:
                dotRes = R.drawable.bg_connecting_dot;
                waveRes = R.drawable.bg_status_wave_yellow;
                break;
            case OFFLINE:
            default:
                dotRes = R.drawable.bg_offline_dot;
                waveRes = R.drawable.bg_status_wave_red;
                break;
        }

        statusDot.setBackgroundResource(dotRes);
        statusWave.setBackgroundResource(waveRes);
        ensureWaveAnimation();
    }

    private void ensureWaveAnimation() {
        if (statusWave == null) return;
        statusWave.setVisibility(View.VISIBLE);
        if (statusDotPulseAnim != null && statusDotPulseAnim.isStarted()) {
            return; // Smoothly running continuous animation, without interruption!
        }

        statusWave.setScaleX(1.0f);
        statusWave.setScaleY(1.0f);
        statusWave.setAlpha(0.75f);

        ObjectAnimator waveScaleX = ObjectAnimator.ofFloat(statusWave, "scaleX", 1.0f, 2.2f);
        ObjectAnimator waveScaleY = ObjectAnimator.ofFloat(statusWave, "scaleY", 1.0f, 2.2f);
        ObjectAnimator waveAlpha = ObjectAnimator.ofFloat(statusWave, "alpha", 0.75f, 0.0f);
        waveScaleX.setRepeatCount(ValueAnimator.INFINITE);
        waveScaleY.setRepeatCount(ValueAnimator.INFINITE);
        waveAlpha.setRepeatCount(ValueAnimator.INFINITE);

        statusDotPulseAnim = new AnimatorSet();
        statusDotPulseAnim.playTogether(waveScaleX, waveScaleY, waveAlpha);
        statusDotPulseAnim.setDuration(1600);
        statusDotPulseAnim.setInterpolator(new android.view.animation.DecelerateInterpolator());
        statusDotPulseAnim.start();
    }

    private void updateStatusDot(boolean online) {
        setConnectionState(online ? ConnectionState.ONLINE : ConnectionState.OFFLINE);
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
        if (avatarInitial != null) avatarInitial.setVisibility(View.GONE);

        triggerWelcomeNotificationIfEligible();
    }

    /**
     * Smart First Name Extraction:
     * Handles spaces, emails, CamelCase concatenated strings (e.g. MonowarHussain -> Monowar),
     * title prefixes (Dr., Mr.), compound prefixes, and cleanly caps at 7-8 letters.
     */
    public static String formatSmartFirstName(String raw) {
        if (raw == null || raw.trim().isEmpty()) return "Doctor";
        String str = raw.trim();

        // 1. Remove email domain if present (e.g. monowar@gmail.com -> monowar)
        if (str.contains("@")) {
            str = str.substring(0, str.indexOf('@'));
        }

        // 2. If contains space, underscore, dot, or dash, take first token (skipping title prefixes like Dr, Mr)
        String[] tokens = str.split("[\\s._\\-]+");
        if (tokens.length > 0 && !tokens[0].isEmpty()) {
            String firstToken = tokens[0];
            if ((firstToken.equalsIgnoreCase("dr") || firstToken.equalsIgnoreCase("doc") ||
                 firstToken.equalsIgnoreCase("doctor") || firstToken.equalsIgnoreCase("mr") ||
                 firstToken.equalsIgnoreCase("mrs") || firstToken.equalsIgnoreCase("ms")) && tokens.length > 1 && !tokens[1].isEmpty()) {
                str = tokens[1];
            } else {
                str = firstToken;
            }
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
        if (str.isEmpty() || "user".equalsIgnoreCase(str) || "admin".equalsIgnoreCase(str)) return "Doctor";

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

    /**
     * Sanitizes strings destined for notification dialogs or popups, replacing any email addresses with clean smart first names.
     */
    public static String stripEmailFromString(String text) {
        if (text == null || text.isEmpty()) return "";
        java.util.regex.Pattern pattern = java.util.regex.Pattern.compile("[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}");
        java.util.regex.Matcher matcher = pattern.matcher(text);
        StringBuffer sb = new StringBuffer();
        while (matcher.find()) {
            String email = matcher.group();
            String name = formatSmartFirstName(email);
            matcher.appendReplacement(sb, java.util.regex.Matcher.quoteReplacement(name));
        }
        matcher.appendTail(sb);
        return sb.toString();
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
                        currentWalletBalance = balance;
                        String formatted = formatINR(balance);
                        mainHandler.post(() -> {
                            if (txtWalletBalance != null) {
                                txtWalletBalance.setText("Wallet: " + formatted);
                            }
                            triggerLowBalanceAlertIfEligible(balance);
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
                        currentWalletBalance = bal;
                        String formatted = formatINR(bal);
                        mainHandler.post(() -> {
                            if (txtWalletBalance != null) {
                                txtWalletBalance.setText("Wallet: " + formatted);
                            }
                            triggerLowBalanceAlertIfEligible(bal);
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
    //  Today's Worklist (Dynamically visible ONLY when data exists for user)
    // ─────────────────────────────────────────────────────────────────────────
    public void fetchTodaysWorklist() {
        new Thread(() -> {
            try {
                String token = getAuthToken();
                if (token == null || token.isEmpty()) { 
                    mainHandler.post(this::hideWorklistSection); 
                    return; 
                }

                // 1. Primary: /api/workspace/patients?limit=10 (Contains complete age, gender, tests, and invoices)
                try {
                    URL patientsUrl = new URL(BASE_URL + "/api/workspace/patients?limit=10");
                    HttpURLConnection pConn = (HttpURLConnection) patientsUrl.openConnection();
                    pConn.setRequestProperty("Authorization", "Bearer " + token);
                    pConn.setRequestProperty("Cookie", "token=" + token);
                    pConn.setConnectTimeout(8000);
                    pConn.setReadTimeout(8000);
                    if (pConn.getResponseCode() == 200) {
                        String json = readStream(pConn.getInputStream());
                        JSONObject root = new JSONObject(json);
                        JSONArray dataArr = root.optJSONArray("data");
                        if (dataArr == null && root.has("patients")) dataArr = root.optJSONArray("patients");
                        if (dataArr != null && dataArr.length() > 0) {
                            JSONArray finalData = dataArr;
                            mainHandler.post(() -> buildWorklistCards(finalData));
                            return;
                        }
                    }
                } catch (Exception ignored) {}

                // 2. Fallback: /api/labs/dashboard?range=TODAY
                URL url = new URL(BASE_URL + "/api/labs/dashboard?range=TODAY");
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestProperty("Authorization", "Bearer " + token);
                conn.setRequestProperty("Cookie", "token=" + token);
                conn.setConnectTimeout(8000);
                conn.setReadTimeout(8000);
                if (conn.getResponseCode() == 200) {
                    String json = readStream(conn.getInputStream());
                    JSONObject root = new JSONObject(json);
                    JSONArray patients = root.optJSONArray("recentPatients");
                    if (patients != null && patients.length() > 0) {
                        mainHandler.post(() -> buildWorklistCards(patients));
                    } else {
                        mainHandler.post(this::hideWorklistSection);
                    }
                } else {
                    mainHandler.post(this::hideWorklistSection);
                }
            } catch (Exception e) {
                mainHandler.post(this::hideWorklistSection);
            }
        }).start();
    }

    private void hideWorklistSection() {
        if (sectionWorklistWrapper != null) {
            sectionWorklistWrapper.setVisibility(View.GONE);
        }
        if (worklistContainer != null) {
            worklistContainer.removeAllViews();
        }
    }

    private void detectAndNotifyNewPatientsFromWeb(JSONArray patients) {
        if (patients == null || patients.length() == 0 || ctx == null) return;
        try {
            SharedPreferences notifPrefs = ctx.getSharedPreferences("patholab_patient_sync", Context.MODE_PRIVATE);
            String userEmail = AuthManager.getUserEmail(ctx);
            if (userEmail == null || userEmail.trim().isEmpty()) {
                userEmail = "default_user";
            }
            String syncDoneKey = "initial_sync_done_" + userEmail;
            String knownKey = "known_patient_ids_" + userEmail;

            java.util.Set<String> knownIds = new java.util.HashSet<>(notifPrefs.getStringSet(knownKey, new java.util.HashSet<>()));
            boolean isInitialSyncDone = notifPrefs.getBoolean(syncDoneKey, false);

            if (!isInitialSyncDone) {
                // Populate existing patient IDs on first sync without sending noisy notifications
                for (int i = 0; i < patients.length(); i++) {
                    JSONObject p = patients.getJSONObject(i);
                    String pid = p.optString("id", p.optString("patientId", ""));
                    if (!pid.isEmpty()) knownIds.add(pid);
                }
                notifPrefs.edit().putBoolean(syncDoneKey, true).putStringSet(knownKey, knownIds).apply();
                return;
            }

            // Subsequent polls: detect newly added patients from website or other devices
            boolean hasNew = false;
            for (int i = 0; i < patients.length(); i++) {
                JSONObject p = patients.getJSONObject(i);
                String pid = p.optString("id", p.optString("patientId", ""));
                if (pid.isEmpty()) continue;

                if (!knownIds.contains(pid)) {
                    knownIds.add(pid);
                    hasNew = true;
                    String pName = p.optString("name", "New Patient");
                    String pUhid = p.optString("patientId", p.optString("code", ""));
                    MobileNotificationHelper.postNewPatientNotification(ctx, pName, pUhid);
                }
            }
            if (hasNew) {
                notifPrefs.edit().putStringSet(knownKey, knownIds).apply();
            }
        } catch (Exception ignored) {}
    }

    private void buildWorklistCards(JSONArray patients) {
        if (patients == null || patients.length() == 0) {
            hideWorklistSection();
            return;
        }

        // Real-time synchronization: notify app when user/staff registers a patient on the web app
        detectAndNotifyNewPatientsFromWeb(patients);

        if (sectionWorklistWrapper != null) {
            sectionWorklistWrapper.setVisibility(View.VISIBLE);
        }

        if (worklistContainer == null) return;
        worklistContainer.removeAllViews();
        LayoutInflater inflater = LayoutInflater.from(ctx);

        for (int i = 0; i < patients.length(); i++) {
            try {
                JSONObject p = patients.getJSONObject(i);
                String name  = p.optString("name", "Unknown Patient");
                String phone = p.optString("phone", "");
                String id    = p.optString("id", "");
                String patientId = p.optString("patientId", p.optString("code", "PAT" + (i + 1)));
                int age = p.optInt("age", 0);
                String gender = p.optString("gender", "");

                // Status & Test Name
                JSONArray tests = p.optJSONArray("tests");
                String status   = "Accepted";
                String testName = "Routine Diagnostics";
                int testCount   = (tests != null) ? tests.length() : 0;
                if (tests != null && tests.length() > 0) {
                    JSONObject t = tests.getJSONObject(0);
                    testName = t.optString("testName", t.optString("name", "Routine Diagnostics"));
                    String s = t.optString("status", "PENDING");
                    if ("COMPLETED".equalsIgnoreCase(s) || "APPROVED".equalsIgnoreCase(s) || "READY".equalsIgnoreCase(s)) status = "Ready";
                    else if ("IN_PROGRESS".equalsIgnoreCase(s) || "TESTING".equalsIgnoreCase(s) || "COLLECTED".equalsIgnoreCase(s)) status = "Processing";
                    else status = "Accepted";
                }

                View card = inflater.inflate(R.layout.item_patient_card, worklistContainer, false);

                TextView tvInitial        = card.findViewById(R.id.cardPatientInitial);
                TextView tvCode           = card.findViewById(R.id.cardPatientCode);
                TextView tvStatus         = card.findViewById(R.id.cardStatus);
                TextView tvName           = card.findViewById(R.id.cardPatientName);
                TextView tvDetails        = card.findViewById(R.id.cardPatientDetails);
                View     cardTestBox      = card.findViewById(R.id.cardTestBox);
                ImageView cardTestIcon    = card.findViewById(R.id.cardTestIcon);
                TextView tvTest           = card.findViewById(R.id.cardTestName);
                TextView tvTestCount      = card.findViewById(R.id.cardTestCount);
                TextView tvDemographics   = card.findViewById(R.id.cardPatientDemographics);
                View     btnWA            = card.findViewById(R.id.cardWhatsappBtn);

                if (tvInitial != null) {
                    String initial = name.length() > 0 ? name.substring(0, 1).toUpperCase() : "P";
                    tvInitial.setText(initial);
                }
                if (tvCode != null) tvCode.setText(patientId);
                if (tvName != null) tvName.setText(name);
                if (tvDetails != null) tvDetails.setText("Registered Patient");

                // Replace ₹0 Due bottom row with Patient Age & Gender
                if (tvDemographics != null) {
                    StringBuilder demoSb = new StringBuilder();
                    if (age > 0) {
                        demoSb.append(age).append(" Yrs");
                    }
                    if (!gender.isEmpty()) {
                        String capGender = gender.substring(0, 1).toUpperCase() + (gender.length() > 1 ? gender.substring(1).toLowerCase() : "");
                        if (demoSb.length() > 0) demoSb.append(" • ");
                        demoSb.append(capGender);
                    }
                    if (demoSb.length() == 0) {
                        demoSb.append("General Patient");
                    }
                    tvDemographics.setText(demoSb.toString());
                }

                if (tvTest != null) tvTest.setText(testName);
                if (tvTestCount != null) {
                    if (testCount > 1) {
                        tvTestCount.setVisibility(View.VISIBLE);
                        tvTestCount.setText(testCount + " Tests");
                        tvTestCount.setTextColor(Color.WHITE);
                    } else {
                        tvTestCount.setVisibility(View.GONE);
                    }
                }

                // 3-State Test Status Styling: Deep Green = Accepted, Blue = Processing, Emerald = Report Ready / Finished
                if ("Ready".equalsIgnoreCase(status)) {
                    // GREEN STATE: Finished & Report Generated
                    if (cardTestBox != null) cardTestBox.setBackground(ctx.getDrawable(R.drawable.bg_test_box_ready));
                    if (cardTestIcon != null) cardTestIcon.setColorFilter(Color.parseColor("#059669"));
                    if (tvTest != null) tvTest.setTextColor(Color.parseColor("#059669"));
                    if (tvStatus != null) {
                        tvStatus.setText("Report Ready");
                        tvStatus.setTextColor(Color.parseColor("#059669"));
                        tvStatus.setBackground(ctx.getDrawable(R.drawable.bg_status_ready));
                    }
                } else if ("Processing".equalsIgnoreCase(status)) {
                    // BLUE STATE: In Testing / Processing
                    if (cardTestBox != null) cardTestBox.setBackground(ctx.getDrawable(R.drawable.bg_test_box_processing));
                    if (cardTestIcon != null) cardTestIcon.setColorFilter(Color.parseColor("#0D6EFD"));
                    if (tvTest != null) tvTest.setTextColor(Color.parseColor("#0D6EFD"));
                    if (tvStatus != null) {
                        tvStatus.setText("Processing");
                        tvStatus.setTextColor(Color.parseColor("#0D6EFD"));
                        tvStatus.setBackground(ctx.getDrawable(R.drawable.bg_status_processing));
                    }
                } else {
                    // DEEP GREEN ACCEPTED STATE: Top status badge deep green (#047857) for high visibility
                    if (cardTestBox != null) cardTestBox.setBackground(ctx.getDrawable(R.drawable.bg_test_box_accepted));
                    if (cardTestIcon != null) cardTestIcon.setColorFilter(Color.parseColor("#047857"));
                    if (tvTest != null) tvTest.setTextColor(Color.parseColor("#047857"));
                    if (tvStatus != null) {
                        tvStatus.setText("Accepted");
                        tvStatus.setTextColor(Color.parseColor("#047857")); // Deep Green
                        tvStatus.setBackground(ctx.getDrawable(R.drawable.bg_status_accepted));
                    }
                }

                // WhatsApp action
                if (btnWA != null) {
                    if (!"Pending".equals(status) && !phone.isEmpty()) {
                        btnWA.setVisibility(View.VISIBLE);
                        String finalPhone = phone;
                        btnWA.setOnClickListener(v -> {
                            String msg = "Hello " + name + ", your diagnostic report from " + AuthManager.getLabName(ctx) + " is ready. View it at: https://app.patholab.cloud";
                            String waUrl = "https://wa.me/91" + finalPhone + "?text=" + Uri.encode(msg);
                            ctx.startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(waUrl)));
                        });
                    } else {
                        btnWA.setVisibility(View.GONE);
                    }
                }

                card.setOnClickListener(v -> {
                    ctx.startActivity(new Intent(ctx, PatientWorklistActivity.class));
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
        if (ctx instanceof Activity) {
            StatusBarHelper.setStatusBarSapphire((Activity) ctx);
        }
        loadUserInfo();
        fetchWalletBalance();
        fetchNotifications();
        fetchTodaysWorklist();
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
        return "₹ " + String.format(Locale.US, "%,.2f", amount);
    }

    private int dp(int value) {
        float density = ctx.getResources().getDisplayMetrics().density;
        return Math.round(value * density);
    }
}
