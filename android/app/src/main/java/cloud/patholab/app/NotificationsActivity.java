package cloud.patholab.app;

import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.graphics.Typeface;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.LruCache;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.view.animation.Animation;
import android.view.animation.RotateAnimation;
import android.webkit.CookieManager;
import android.widget.Button;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.content.ContextCompat;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;

import com.google.android.material.bottomsheet.BottomSheetDialog;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;
import java.util.TimeZone;

import cloud.patholab.app.auth.AuthManager;

public class NotificationsActivity extends AppCompatActivity {

    private static final String BASE_URL = "https://app.patholab.cloud";
    private static final long AUTO_SYNC_INTERVAL_MS = 30000; // 30 seconds matching web

    private FrameLayout btnBackNotifications;
    private FrameLayout btnRefreshNotifications;
    private FrameLayout btnGatewaySettings;
    private ImageView imgRefreshSpinIcon;
    private TextView lblUnreadBadgeCount;
    private TextView lblAutoSyncStatus;
    private LinearLayout containerNotificationChips;
    private LinearLayout btnMarkAllRead;
    private SwipeRefreshLayout swipeRefreshNotifications;
    private RecyclerView recyclerNotifications;
    private ProgressBar progressNotifications;
    private LinearLayout layoutEmptyNotifications;

    private final List<JSONObject> allNotifications = new ArrayList<>();
    private final List<JSONObject> filteredNotifications = new ArrayList<>();
    private NotificationAdapter notificationAdapter;

    private String currentFilter = "ALL"; // ALL, UNREAD, TESTS, SYSTEM
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private final Handler syncHandler = new Handler(Looper.getMainLooper());
    private Runnable syncRunnable;

    // Image cache for notification attachments
    private static LruCache<String, Bitmap> imageCache;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        StatusBarHelper.setStatusBarSapphire(this);
        setContentView(R.layout.activity_notifications);

        if (imageCache == null) {
            int maxMemory = (int) (Runtime.getRuntime().maxMemory() / 1024);
            int cacheSize = maxMemory / 8;
            imageCache = new LruCache<String, Bitmap>(cacheSize) {
                @Override
                protected int sizeOf(String key, Bitmap bitmap) {
                    return bitmap.getByteCount() / 1024;
                }
            };
        }

        initViews();
        setupFilterChips();
        setupRecyclerView();
        setupListeners();

        loadNotificationsData(false);
        startAutoSyncTimer();
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        stopAutoSyncTimer();
    }

    private void initViews() {
        btnBackNotifications = findViewById(R.id.btnBackNotifications);
        btnRefreshNotifications = findViewById(R.id.btnRefreshNotifications);
        btnGatewaySettings = findViewById(R.id.btnGatewaySettings);
        imgRefreshSpinIcon = findViewById(R.id.imgRefreshSpinIcon);
        lblUnreadBadgeCount = findViewById(R.id.lblUnreadBadgeCount);
        lblAutoSyncStatus = findViewById(R.id.lblAutoSyncStatus);
        containerNotificationChips = findViewById(R.id.containerNotificationChips);
        btnMarkAllRead = findViewById(R.id.btnMarkAllRead);
        swipeRefreshNotifications = findViewById(R.id.swipeRefreshNotifications);
        recyclerNotifications = findViewById(R.id.recyclerNotifications);
        progressNotifications = findViewById(R.id.progressNotifications);
        layoutEmptyNotifications = findViewById(R.id.layoutEmptyNotifications);

        swipeRefreshNotifications.setColorSchemeColors(0xFF0D6EFD);
    }

    private void setupListeners() {
        btnBackNotifications.setOnClickListener(v -> finish());

        btnRefreshNotifications.setOnClickListener(v -> {
            animateRefreshIcon();
            loadNotificationsData(true);
        });

        swipeRefreshNotifications.setOnRefreshListener(() -> loadNotificationsData(true));

        btnMarkAllRead.setOnClickListener(v -> markAllAsRead());

        btnGatewaySettings.setOnClickListener(v -> showGatewaySettingsSheet());
    }

    private void setupFilterChips() {
        containerNotificationChips.removeAllViews();
        String[] filters = {"ALL", "UNREAD", "TESTS", "SYSTEM"};
        String[] titles = {"All Alerts", "Unread", "Lab & Tests", "System & Billing"};

        for (int i = 0; i < filters.length; i++) {
            final String filterKey = filters[i];
            final String title = titles[i];

            TextView chip = new TextView(this);
            chip.setText(title);
            chip.setTextSize(12f);
            chip.setPadding(dpToPx(13), dpToPx(7), dpToPx(13), dpToPx(7));

            LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
                    ViewGroup.LayoutParams.WRAP_CONTENT, dpToPx(34));
            params.setMarginEnd(dpToPx(6));
            chip.setLayoutParams(params);

            updateChipStyle(chip, filterKey.equals(currentFilter));

            chip.setOnClickListener(v -> {
                currentFilter = filterKey;
                for (int c = 0; c < containerNotificationChips.getChildCount(); c++) {
                    View child = containerNotificationChips.getChildAt(c);
                    if (child instanceof TextView) {
                        updateChipStyle((TextView) child, false);
                    }
                }
                updateChipStyle(chip, true);
                applyFilter();
            });

            containerNotificationChips.addView(chip);
        }
    }

    private void updateChipStyle(TextView chip, boolean isSelected) {
        if (isSelected) {
            chip.setBackgroundResource(R.drawable.bg_chip_active);
            chip.setTextColor(0xFFFFFFFF);
            chip.setTypeface(null, Typeface.BOLD);
        } else {
            chip.setBackgroundResource(R.drawable.bg_chip_inactive);
            chip.setTextColor(0xFF64748B);
            chip.setTypeface(null, Typeface.NORMAL);
        }
    }

    private void setupRecyclerView() {
        notificationAdapter = new NotificationAdapter(filteredNotifications, new NotificationActionListener() {
            @Override
            public void onItemClicked(JSONObject item) {
                handleNotificationClick(item);
            }

            @Override
            public void onLinkClicked(String linkUrl) {
                handleOpenLink(linkUrl);
            }
        });

        recyclerNotifications.setLayoutManager(new LinearLayoutManager(this));
        recyclerNotifications.setAdapter(notificationAdapter);
    }

    private void animateRefreshIcon() {
        if (imgRefreshSpinIcon == null) return;
        RotateAnimation rotate = new RotateAnimation(0, 360,
                Animation.RELATIVE_TO_SELF, 0.5f, Animation.RELATIVE_TO_SELF, 0.5f);
        rotate.setDuration(600);
        rotate.setRepeatCount(1);
        imgRefreshSpinIcon.startAnimation(rotate);
    }

    private void startAutoSyncTimer() {
        stopAutoSyncTimer();
        syncRunnable = new Runnable() {
            @Override
            public void run() {
                loadNotificationsData(false);
                syncHandler.postDelayed(this, AUTO_SYNC_INTERVAL_MS);
            }
        };
        syncHandler.postDelayed(syncRunnable, AUTO_SYNC_INTERVAL_MS);
    }

    private void stopAutoSyncTimer() {
        if (syncRunnable != null) {
            syncHandler.removeCallbacks(syncRunnable);
            syncRunnable = null;
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  DATA FETCHING & SYNC
    // ─────────────────────────────────────────────────────────────────────────
    private String getAuthToken() {
        String token = AuthManager.getToken(this);
        if (token != null && !token.isEmpty()) return token;

        if (token == null || token.isEmpty()) {
            SharedPreferences prefs = getSharedPreferences("PathoLabPrefs", MODE_PRIVATE);
            token = prefs.getString("auth_token", null);
        }

        if (token == null || token.isEmpty()) {
            try {
                CookieManager cm = CookieManager.getInstance();
                String cookieStr = cm.getCookie(BASE_URL);
                if (cookieStr == null) {
                    cookieStr = cm.getCookie("https://patholab.cloud");
                }
                if (cookieStr != null) {
                    String[] parts = cookieStr.split(";");
                    for (String part : parts) {
                        String p = part.trim();
                        if (p.startsWith("token=")) {
                            token = p.substring(6).trim();
                            break;
                        } else if (p.startsWith("auth-token=")) {
                            token = p.substring(11).trim();
                            break;
                        }
                    }
                }
            } catch (Exception ignored) {}
        }
        return token;
    }

    private void loadNotificationsData(boolean isManual) {
        if (!swipeRefreshNotifications.isRefreshing() && allNotifications.isEmpty()) {
            progressNotifications.setVisibility(View.VISIBLE);
        }

        new Thread(() -> {
            String token = getAuthToken();
            try {
                URL url = new URL(BASE_URL + "/api/notifications");
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("GET");
                if (token != null && !token.isEmpty()) {
                    conn.setRequestProperty("Authorization", "Bearer " + token);
                    conn.setRequestProperty("Cookie", "token=" + token + "; auth-token=" + token);
                }
                String webCookie = CookieManager.getInstance().getCookie(BASE_URL);
                if (webCookie != null && !webCookie.isEmpty()) {
                    conn.addRequestProperty("Cookie", webCookie);
                }
                conn.setRequestProperty("Accept", "application/json");
                conn.setConnectTimeout(8000);
                conn.setReadTimeout(10000);

                int code = conn.getResponseCode();
                if (code >= 200 && code < 300) {
                    String json = readStream(conn.getInputStream());
                    conn.disconnect();
                    JSONObject root = new JSONObject(json);

                    JSONArray arr = root.optJSONArray("notifications");
                    int unreadServer = root.optInt("unreadCount", 0);

                    final List<JSONObject> list = new ArrayList<>();
                    int calcUnread = 0;
                    if (arr != null) {
                        for (int i = 0; i < arr.length(); i++) {
                            JSONObject item = arr.getJSONObject(i);
                            list.add(item);
                            if (!item.optBoolean("isRead", true)) {
                                calcUnread++;
                            }
                        }
                    }

                    final int finalUnread = unreadServer > 0 ? unreadServer : calcUnread;

                    mainHandler.post(() -> {
                        progressNotifications.setVisibility(View.GONE);
                        swipeRefreshNotifications.setRefreshing(false);
                        allNotifications.clear();
                        allNotifications.addAll(list);

                        updateBadgeUi(finalUnread);
                        applyFilter();

                        if (isManual) {
                            Toast.makeText(this, "Notifications synchronized", Toast.LENGTH_SHORT).show();
                        }
                    });
                    return;
                } else {
                    conn.disconnect();
                }
            } catch (Exception ignored) {}

            mainHandler.post(() -> {
                progressNotifications.setVisibility(View.GONE);
                swipeRefreshNotifications.setRefreshing(false);
                applyFilter();
            });
        }).start();
    }

    private void updateBadgeUi(int unreadCount) {
        if (unreadCount > 0) {
            lblUnreadBadgeCount.setVisibility(View.VISIBLE);
            lblUnreadBadgeCount.setText(unreadCount + " New");
        } else {
            lblUnreadBadgeCount.setVisibility(View.GONE);
        }
    }

    private void applyFilter() {
        filteredNotifications.clear();

        for (JSONObject notif : allNotifications) {
            boolean isRead = notif.optBoolean("isRead", true);
            String type = notif.optString("type", "SYSTEM").toUpperCase();

            boolean match = false;
            switch (currentFilter) {
                case "ALL":
                    match = true;
                    break;
                case "UNREAD":
                    match = !isRead;
                    break;
                case "TESTS":
                    match = type.contains("TEST") || type.contains("SAMPLE") || type.contains("REPORT") || type.contains("LAB");
                    break;
                case "SYSTEM":
                    match = type.contains("SYSTEM") || type.contains("ALERT") || type.contains("PAYMENT") || type.contains("PROMOTION");
                    break;
            }

            if (match) {
                filteredNotifications.add(notif);
            }
        }

        notificationAdapter.notifyDataSetChanged();
        boolean isEmpty = filteredNotifications.isEmpty();
        layoutEmptyNotifications.setVisibility(isEmpty ? View.VISIBLE : View.GONE);
        recyclerNotifications.setVisibility(isEmpty ? View.GONE : View.VISIBLE);
    }

    private void markAllAsRead() {
        // 1. Optimistic UI update
        boolean hadUnread = false;
        for (JSONObject notif : allNotifications) {
            try {
                if (!notif.optBoolean("isRead", true)) {
                    hadUnread = true;
                    notif.put("isRead", true);
                }
            } catch (Exception ignored) {}
        }
        updateBadgeUi(0);
        applyFilter();

        if (!hadUnread) {
            Toast.makeText(this, "All notifications are already marked read", Toast.LENGTH_SHORT).show();
            return;
        }

        // 2. Call server mark-read API so web updates database in real-time
        new Thread(() -> {
            String token = getAuthToken();
            try {
                URL url = new URL(BASE_URL + "/api/notifications/mark-read");
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("POST");
                if (token != null && !token.isEmpty()) {
                    conn.setRequestProperty("Authorization", "Bearer " + token);
                    conn.setRequestProperty("Cookie", "token=" + token + "; auth-token=" + token);
                }
                String webCookie = CookieManager.getInstance().getCookie(BASE_URL);
                if (webCookie != null && !webCookie.isEmpty()) {
                    conn.addRequestProperty("Cookie", webCookie);
                }
                conn.setRequestProperty("Content-Type", "application/json");
                conn.setConnectTimeout(8000);
                conn.setReadTimeout(10000);
                conn.setDoOutput(true);

                try (OutputStream os = conn.getOutputStream()) {
                    os.write("{}".getBytes(StandardCharsets.UTF_8));
                }

                int code = conn.getResponseCode();
                conn.disconnect();

                if (code >= 200 && code < 300) {
                    mainHandler.post(() -> Toast.makeText(NotificationsActivity.this, "Marked all as read", Toast.LENGTH_SHORT).show());
                }
            } catch (Exception ignored) {}
        }).start();
    }

    private void handleNotificationClick(JSONObject item) {
        try {
            item.put("isRead", true);
            notificationAdapter.notifyDataSetChanged();
        } catch (Exception ignored) {}

        String link = item.optString("link", "");
        if (!link.isEmpty()) {
            handleOpenLink(link);
        }
    }

    private void handleOpenLink(String link) {
        if (link == null || link.isEmpty()) return;

        if (link.startsWith("http://") || link.startsWith("https://")) {
            try {
                Intent browser = new Intent(Intent.ACTION_VIEW, Uri.parse(link));
                startActivity(browser);
            } catch (Exception e) {
                Toast.makeText(this, "Cannot open external link", Toast.LENGTH_SHORT).show();
            }
            return;
        }

        // Internal module routing
        String low = link.toLowerCase();
        if (low.contains("test")) {
            startActivity(new Intent(this, TestManagementActivity.class));
        } else if (low.contains("worklist") || low.contains("patient")) {
            startActivity(new Intent(this, PatientWorklistActivity.class));
        } else if (low.contains("doctor")) {
            startActivity(new Intent(this, ReferralDoctorsActivity.class));
        } else if (low.contains("wallet") || low.contains("billing")) {
            startActivity(new Intent(this, WalletActivity.class));
        } else if (low.contains("report")) {
            startActivity(new Intent(this, ReportsActivity.class));
        } else if (low.contains("sample")) {
            startActivity(new Intent(this, SamplesActivity.class));
        } else if (low.contains("staff")) {
            startActivity(new Intent(this, StaffManagementActivity.class));
        } else if (low.contains("ris") || low.contains("radiology")) {
            startActivity(new Intent(this, RISDashboardActivity.class));
        } else {
            Toast.makeText(this, "Opening " + link, Toast.LENGTH_SHORT).show();
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  GATEWAY CONFIGURATION SHEET (WHATSAPP & SMS SYNC)
    // ─────────────────────────────────────────────────────────────────────────
    private void showGatewaySettingsSheet() {
        BottomSheetDialog dialog = new BottomSheetDialog(this);
        View sheet = getLayoutInflater().inflate(R.layout.layout_notification_gateway_sheet, null);
        dialog.setContentView(sheet);

        EditText inputWhatsappApiKey = sheet.findViewById(R.id.inputWhatsappApiKey);
        EditText inputWhatsappPhoneId = sheet.findViewById(R.id.inputWhatsappPhoneId);
        EditText inputSmsApiKey = sheet.findViewById(R.id.inputSmsApiKey);
        EditText inputSmsSenderId = sheet.findViewById(R.id.inputSmsSenderId);
        Button btnSave = sheet.findViewById(R.id.btnSaveGatewaySettings);
        View btnClose = sheet.findViewById(R.id.btnCloseGatewaySheet);

        btnClose.setOnClickListener(v -> dialog.dismiss());

        // Pre-fetch settings from /api/workspace/settings
        new Thread(() -> {
            String token = getAuthToken();
            try {
                URL url = new URL(BASE_URL + "/api/workspace/settings");
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("GET");
                if (token != null && !token.isEmpty()) {
                    conn.setRequestProperty("Authorization", "Bearer " + token);
                    conn.setRequestProperty("Cookie", "token=" + token + "; auth-token=" + token);
                }
                String webCookie = CookieManager.getInstance().getCookie(BASE_URL);
                if (webCookie != null && !webCookie.isEmpty()) {
                    conn.addRequestProperty("Cookie", webCookie);
                }
                conn.setRequestProperty("Accept", "application/json");

                int code = conn.getResponseCode();
                if (code >= 200 && code < 300) {
                    String json = readStream(conn.getInputStream());
                    conn.disconnect();
                    JSONObject root = new JSONObject(json);
                    JSONObject lab = root.optJSONObject("lab");
                    if (lab != null) {
                        final String waKey = lab.optString("whatsappApiKey", "");
                        final String waPhone = lab.optString("whatsappPhoneId", "");
                        final String smsKey = lab.optString("smsApiKey", "");
                        final String smsSender = lab.optString("smsSenderId", "");

                        mainHandler.post(() -> {
                            inputWhatsappApiKey.setText(waKey);
                            inputWhatsappPhoneId.setText(waPhone);
                            inputSmsApiKey.setText(smsKey);
                            inputSmsSenderId.setText(smsSender);
                        });
                    }
                } else {
                    conn.disconnect();
                }
            } catch (Exception ignored) {}
        }).start();

        btnSave.setOnClickListener(v -> {
            String waKey = inputWhatsappApiKey.getText().toString().trim();
            String waPhone = inputWhatsappPhoneId.getText().toString().trim();
            String smsKey = inputSmsApiKey.getText().toString().trim();
            String smsSender = inputSmsSenderId.getText().toString().trim();

            btnSave.setEnabled(false);
            btnSave.setText("Syncing with Web...");

            new Thread(() -> {
                String token = getAuthToken();
                try {
                    URL url = new URL(BASE_URL + "/api/workspace/settings");
                    HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                    conn.setRequestMethod("PATCH");
                    if (token != null && !token.isEmpty()) {
                        conn.setRequestProperty("Authorization", "Bearer " + token);
                        conn.setRequestProperty("Cookie", "token=" + token + "; auth-token=" + token);
                    }
                    String webCookie = CookieManager.getInstance().getCookie(BASE_URL);
                    if (webCookie != null && !webCookie.isEmpty()) {
                        conn.addRequestProperty("Cookie", webCookie);
                    }
                    conn.setRequestProperty("Content-Type", "application/json");
                    conn.setDoOutput(true);

                    JSONObject payload = new JSONObject();
                    payload.put("whatsappApiKey", waKey);
                    payload.put("whatsappPhoneId", waPhone);
                    payload.put("smsApiKey", smsKey);
                    payload.put("smsSenderId", smsSender);

                    try (OutputStream os = conn.getOutputStream()) {
                        os.write(payload.toString().getBytes(StandardCharsets.UTF_8));
                    }

                    int code = conn.getResponseCode();
                    conn.disconnect();

                    mainHandler.post(() -> {
                        dialog.dismiss();
                        if (code >= 200 && code < 300) {
                            Toast.makeText(this, "Alert gateways saved & synced to web", Toast.LENGTH_SHORT).show();
                        } else {
                            Toast.makeText(this, "Settings updated locally", Toast.LENGTH_SHORT).show();
                        }
                    });
                } catch (Exception e) {
                    mainHandler.post(() -> {
                        dialog.dismiss();
                        Toast.makeText(this, "Failed to sync settings", Toast.LENGTH_SHORT).show();
                    });
                }
            }).start();
        });

        dialog.show();
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  RECYCLERVIEW ADAPTER & VIEW HOLDER
    // ─────────────────────────────────────────────────────────────────────────
    private interface NotificationActionListener {
        void onItemClicked(JSONObject item);
        void onLinkClicked(String linkUrl);
    }

    private class NotificationAdapter extends RecyclerView.Adapter<NotificationViewHolder> {
        private final List<JSONObject> list;
        private final NotificationActionListener listener;

        NotificationAdapter(List<JSONObject> list, NotificationActionListener listener) {
            this.list = list;
            this.listener = listener;
        }

        @NonNull
        @Override
        public NotificationViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
            View v = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_notification_card, parent, false);
            return new NotificationViewHolder(v);
        }

        @Override
        public void onBindViewHolder(@NonNull NotificationViewHolder holder, int position) {
            JSONObject item = list.get(position);
            holder.bind(item, listener);
        }

        @Override
        public int getItemCount() {
            return list.size();
        }
    }

    private class NotificationViewHolder extends RecyclerView.ViewHolder {
        private final LinearLayout containerNotificationInner;
        private final FrameLayout containerCategoryIcon;
        private final ImageView imgCategoryIcon;
        private final TextView lblNotificationTitle;
        private final TextView lblNotificationTime;
        private final View dotUnreadIndicator;
        private final TextView lblNotificationMessage;
        private final ImageView imgNotificationAttachment;
        private final LinearLayout containerNotificationLink;
        private final TextView lblLinkActionText;

        NotificationViewHolder(@NonNull View v) {
            super(v);
            containerNotificationInner = v.findViewById(R.id.containerNotificationInner);
            containerCategoryIcon = v.findViewById(R.id.containerCategoryIcon);
            imgCategoryIcon = v.findViewById(R.id.imgCategoryIcon);
            lblNotificationTitle = v.findViewById(R.id.lblNotificationTitle);
            lblNotificationTime = v.findViewById(R.id.lblNotificationTime);
            dotUnreadIndicator = v.findViewById(R.id.dotUnreadIndicator);
            lblNotificationMessage = v.findViewById(R.id.lblNotificationMessage);
            imgNotificationAttachment = v.findViewById(R.id.imgNotificationAttachment);
            containerNotificationLink = v.findViewById(R.id.containerNotificationLink);
            lblLinkActionText = v.findViewById(R.id.lblLinkActionText);
        }

        void bind(JSONObject item, NotificationActionListener listener) {
            String title = item.optString("title", "Notification");
            String message = item.optString("message", item.optString("body", item.optString("description", "")));
            String type = item.optString("type", "SYSTEM").toUpperCase();
            String link = item.optString("link", "");
            String imageUrl = item.optString("imageUrl", item.optString("image", ""));
            boolean isRead = item.optBoolean("isRead", true);
            String createdStr = item.optString("createdAt", item.optString("timestamp", ""));

            lblNotificationTitle.setText(stripEmail(title));
            lblNotificationMessage.setText(stripEmail(message));
            lblNotificationTime.setText(formatRelativeTime(createdStr));

            // Unread styling
            if (!isRead) {
                dotUnreadIndicator.setVisibility(View.VISIBLE);
                containerNotificationInner.setBackgroundColor(0xFFEFF6FF); // Light sapphire highlight
                lblNotificationTitle.setTypeface(null, Typeface.BOLD);
                lblNotificationTitle.setTextColor(0xFF0F172A);
            } else {
                dotUnreadIndicator.setVisibility(View.GONE);
                containerNotificationInner.setBackgroundColor(0xFFFFFFFF);
                lblNotificationTitle.setTypeface(null, Typeface.NORMAL);
                lblNotificationTitle.setTextColor(0xFF334155);
            }

            // Category Icon & Color
            bindCategoryIcon(type);

            // Rich Attachment Image
            if (!imageUrl.isEmpty()) {
                imgNotificationAttachment.setVisibility(View.VISIBLE);
                loadAttachmentImage(imageUrl, imgNotificationAttachment);
            } else {
                imgNotificationAttachment.setVisibility(View.GONE);
            }

            // Action Link
            if (!link.isEmpty()) {
                containerNotificationLink.setVisibility(View.VISIBLE);
                containerNotificationLink.setOnClickListener(v -> listener.onLinkClicked(link));
            } else {
                containerNotificationLink.setVisibility(View.GONE);
            }

            itemView.setOnClickListener(v -> listener.onItemClicked(item));
        }

        private void bindCategoryIcon(String type) {
            if (type.contains("PAYMENT") || type.contains("WALLET") || type.contains("INVOICE")) {
                containerCategoryIcon.setBackgroundResource(R.drawable.bg_circle_icon_emerald);
                imgCategoryIcon.setImageResource(R.drawable.ic_credit_card);
                imgCategoryIcon.setColorFilter(0xFF059669);
            } else if (type.contains("TEST") || type.contains("SAMPLE") || type.contains("PATIENT")) {
                containerCategoryIcon.setBackgroundResource(R.drawable.bg_circle_icon_sky);
                imgCategoryIcon.setImageResource(R.drawable.ic_testtube);
                imgCategoryIcon.setColorFilter(0xFF0D6EFD);
            } else if (type.contains("LAB") || type.contains("UPDATE") || type.contains("MACHINE")) {
                containerCategoryIcon.setBackgroundResource(R.drawable.bg_mod_icon_purple);
                imgCategoryIcon.setImageResource(R.drawable.ic_refresh_cw);
                imgCategoryIcon.setColorFilter(0xFF7C3AED);
            } else if (type.contains("ALERT") || type.contains("CRITICAL") || type.contains("URGENT")) {
                containerCategoryIcon.setBackgroundResource(R.drawable.bg_circle_red_trash);
                imgCategoryIcon.setImageResource(R.drawable.ic_alert_triangle);
                imgCategoryIcon.setColorFilter(0xFFDC2626);
            } else if (type.contains("PROMO") || type.contains("BROADCAST")) {
                containerCategoryIcon.setBackgroundResource(R.drawable.bg_mod_icon_fuchsia);
                imgCategoryIcon.setImageResource(R.drawable.ic_sparkle_confetti);
                imgCategoryIcon.setColorFilter(0xFFDB2777);
            } else {
                containerCategoryIcon.setBackgroundResource(R.drawable.bg_circle_icon_amber);
                imgCategoryIcon.setImageResource(R.drawable.ic_info);
                imgCategoryIcon.setColorFilter(0xFFD97706);
            }
        }
    }

    private void loadAttachmentImage(String urlString, ImageView imageView) {
        ImageLoaderHelper.load(this, urlString, imageView, 0);
    }

    private String stripEmail(String text) {
        if (text == null) return "";
        return text.replaceAll("(?i)\\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}\\b", "").trim();
    }

    private String formatRelativeTime(String isoDateString) {
        if (isoDateString == null || isoDateString.isEmpty()) return "Recently";
        try {
            SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.US);
            sdf.setTimeZone(TimeZone.getTimeZone("UTC"));
            Date date = sdf.parse(isoDateString);
            if (date == null) return isoDateString;

            long diff = System.currentTimeMillis() - date.getTime();
            long sec = diff / 1000;
            if (sec < 60) return "Just now";
            long min = sec / 60;
            if (min < 60) return min + "m ago";
            long hr = min / 60;
            if (hr < 24) return hr + "h ago";
            long days = hr / 24;
            if (days == 1) return "Yesterday";
            if (days < 7) return days + "d ago";

            SimpleDateFormat out = new SimpleDateFormat("dd MMM, hh:mm a", Locale.getDefault());
            return out.format(date);
        } catch (Exception e) {
            return "Recently";
        }
    }

    private String readStream(InputStream is) {
        try (BufferedReader r = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8))) {
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = r.readLine()) != null) sb.append(line);
            return sb.toString();
        } catch (Exception e) {
            return "";
        }
    }

    private int dpToPx(int dp) {
        return (int) (dp * getResources().getDisplayMetrics().density + 0.5f);
    }
}
