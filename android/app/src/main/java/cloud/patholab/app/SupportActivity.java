package cloud.patholab.app;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.LayoutInflater;
import android.view.View;
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

import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.widget.NestedScrollView;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;

import com.google.android.material.bottomsheet.BottomSheetBehavior;
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

/**
 * SupportActivity
 * ───────────────
 * Native 24/7 Help & Support console for Android.
 * Fully synchronized in real-time with the web support desk:
 *  - Real-time KPI summary cards (Open Requests, In Progress, Resolved)
 *  - Category and status filtering tabs (All, Open, In Progress, Resolved)
 *  - Full-text search across ticket numbers, subjects, and descriptions
 *  - Interactive ticket cards with status, priority, category badges, and message counters
 *  - Two-way conversation thread modal with live 5s message polling and instant reply composer
 *  - New ticket escalation dialog with category, priority, subject, and description
 *  - Collapsible clinical workflow FAQs
 *  - Direct assistance shortcuts: Priority Phone, WhatsApp Concierge, and Official Email Desk
 *  - Strict zero-emoji visual system using Android Material Vector icons and clean typography.
 */
public class SupportActivity extends AppCompatActivity {

    private static final String BASE_URL = "https://app.patholab.cloud";

    // Header & KPIs
    private TextView tvKpiOpenCount;
    private TextView tvKpiProgressCount;
    private TextView tvKpiResolvedCount;

    // Search & Filter Tabs
    private EditText etSearchTickets;
    private ImageView btnClearSearch;
    private TextView tabAll;
    private TextView tabOpen;
    private TextView tabProgress;
    private TextView tabResolved;

    // Ticket List & States
    private SwipeRefreshLayout swipeRefreshLayout;
    private LinearLayout containerTicketsList;
    private LinearLayout layoutEmptyState;
    private ProgressBar pbTicketsLoading;
    private TextView tvTicketsTotalLabel;

    // State
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private final List<JSONObject> allTickets = new ArrayList<>();
    private String currentFilter = "ALL"; // ALL, OPEN, IN_PROGRESS, RESOLVED
    private String currentSearch = "";

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        StatusBarHelper.setStatusBarDeepNavy(this);
        setContentView(R.layout.activity_support);

        initViews();
        setupListeners();
        setupFaqAccordion();
        setupDirectAssistance();

        fetchTickets();
    }

    private void initViews() {
        // Back button
        FrameLayout btnBack = findViewById(R.id.btnSupportBack);
        if (btnBack != null) {
            btnBack.setOnClickListener(v -> finish());
        }

        // Refresh button in header
        View btnRefresh = findViewById(R.id.btnRefreshSupport);
        ImageView imgRefreshIcon = findViewById(R.id.imgRefreshSupportIcon);
        if (btnRefresh != null) {
            btnRefresh.setOnClickListener(v -> {
                if (imgRefreshIcon != null) {
                    RotateAnimation rotate = new RotateAnimation(0, 360,
                            Animation.RELATIVE_TO_SELF, 0.5f,
                            Animation.RELATIVE_TO_SELF, 0.5f);
                    rotate.setDuration(600);
                    imgRefreshIcon.startAnimation(rotate);
                }
                fetchTickets();
            });
        }

        // New Ticket button in header
        LinearLayout btnHeaderNewTicket = findViewById(R.id.btnHeaderNewTicket);
        if (btnHeaderNewTicket != null) {
            btnHeaderNewTicket.setOnClickListener(v -> showCreateTicketDialog());
        }

        // KPI Counts
        tvKpiOpenCount = findViewById(R.id.tvKpiOpenCount);
        tvKpiProgressCount = findViewById(R.id.tvKpiProgressCount);
        tvKpiResolvedCount = findViewById(R.id.tvKpiResolvedCount);

        // Filter cards click
        View cardOpen = findViewById(R.id.cardKpiOpen);
        if (cardOpen != null) cardOpen.setOnClickListener(v -> switchFilter("OPEN"));

        View cardProgress = findViewById(R.id.cardKpiProgress);
        if (cardProgress != null) cardProgress.setOnClickListener(v -> switchFilter("IN_PROGRESS"));

        View cardResolved = findViewById(R.id.cardKpiResolved);
        if (cardResolved != null) cardResolved.setOnClickListener(v -> switchFilter("RESOLVED"));

        // Search
        etSearchTickets = findViewById(R.id.etSearchTickets);
        btnClearSearch = findViewById(R.id.btnClearSearch);

        // Tabs
        tabAll = findViewById(R.id.tabAll);
        tabOpen = findViewById(R.id.tabOpen);
        tabProgress = findViewById(R.id.tabProgress);
        tabResolved = findViewById(R.id.tabResolved);

        // List & Swipe Refresh
        swipeRefreshLayout = findViewById(R.id.swipeRefreshLayout);
        containerTicketsList = findViewById(R.id.containerTicketsList);
        layoutEmptyState = findViewById(R.id.layoutEmptyState);
        pbTicketsLoading = findViewById(R.id.pbTicketsLoading);
        tvTicketsTotalLabel = findViewById(R.id.tvTicketsTotalLabel);

        Button btnEmptyCreate = findViewById(R.id.btnEmptyCreateTicket);
        if (btnEmptyCreate != null) {
            btnEmptyCreate.setOnClickListener(v -> showCreateTicketDialog());
        }

        swipeRefreshLayout.setColorSchemeColors(0xFF2563EB, 0xFF0D6EFD);
        swipeRefreshLayout.setOnRefreshListener(this::fetchTickets);
    }

    private void setupListeners() {
        // Filter tabs
        tabAll.setOnClickListener(v -> switchFilter("ALL"));
        tabOpen.setOnClickListener(v -> switchFilter("OPEN"));
        tabProgress.setOnClickListener(v -> switchFilter("IN_PROGRESS"));
        tabResolved.setOnClickListener(v -> switchFilter("RESOLVED"));

        // Search text watcher
        etSearchTickets.addTextChangedListener(new TextWatcher() {
            @Override public void beforeTextChanged(CharSequence s, int start, int count, int after) {}
            @Override
            public void onTextChanged(CharSequence s, int start, int before, int count) {
                currentSearch = s.toString().trim().toLowerCase(Locale.ROOT);
                if (btnClearSearch != null) {
                    btnClearSearch.setVisibility(currentSearch.isEmpty() ? View.GONE : View.VISIBLE);
                }
                renderTickets();
            }
            @Override public void afterTextChanged(Editable s) {}
        });

        if (btnClearSearch != null) {
            btnClearSearch.setOnClickListener(v -> {
                etSearchTickets.setText("");
                currentSearch = "";
                renderTickets();
            });
        }
    }

    private void switchFilter(String filter) {
        currentFilter = filter;

        // Reset tab styles
        updateTabAppearance(tabAll, filter.equals("ALL"));
        updateTabAppearance(tabOpen, filter.equals("OPEN"));
        updateTabAppearance(tabProgress, filter.equals("IN_PROGRESS"));
        updateTabAppearance(tabResolved, filter.equals("RESOLVED"));

        renderTickets();
    }

    private void updateTabAppearance(TextView tab, boolean isActive) {
        if (tab == null) return;
        if (isActive) {
            tab.setBackgroundResource(R.drawable.bg_chip_active);
            tab.setTextColor(0xFFFFFFFF);
            tab.setTypeface(null, android.graphics.Typeface.BOLD);
        } else {
            tab.setBackgroundResource(R.drawable.bg_chip_inactive);
            tab.setTextColor(0xFF475569);
            tab.setTypeface(null, android.graphics.Typeface.NORMAL);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Fetch Support Tickets from Web Backend API
    // ─────────────────────────────────────────────────────────────────────────
    private void fetchTickets() {
        if (!swipeRefreshLayout.isRefreshing()) {
            pbTicketsLoading.setVisibility(View.VISIBLE);
        }

        new Thread(() -> {
            try {
                String token = getAuthToken();
                URL url = new URL(BASE_URL + "/api/support");
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("GET");
                conn.setRequestProperty("Accept", "application/json");

                if (token != null && !token.isEmpty()) {
                    conn.setRequestProperty("Authorization", "Bearer " + token);
                    conn.setRequestProperty("Cookie", "token=" + token);
                }
                conn.setConnectTimeout(8000);
                conn.setReadTimeout(8000);

                int responseCode = conn.getResponseCode();
                if (responseCode == 200) {
                    String responseBody = readStream(conn.getInputStream());
                    JSONArray jsonArray = new JSONArray(responseBody);

                    List<JSONObject> fetchedList = new ArrayList<>();
                    for (int i = 0; i < jsonArray.length(); i++) {
                        fetchedList.add(jsonArray.getJSONObject(i));
                    }

                    mainHandler.post(() -> {
                        pbTicketsLoading.setVisibility(View.GONE);
                        swipeRefreshLayout.setRefreshing(false);
                        allTickets.clear();
                        allTickets.addAll(fetchedList);
                        updateKpis();
                        renderTickets();
                    });
                } else {
                    mainHandler.post(() -> {
                        pbTicketsLoading.setVisibility(View.GONE);
                        swipeRefreshLayout.setRefreshing(false);
                        renderTickets();
                    });
                }
            } catch (Exception e) {
                mainHandler.post(() -> {
                    pbTicketsLoading.setVisibility(View.GONE);
                    swipeRefreshLayout.setRefreshing(false);
                    renderTickets();
                });
            }
        }).start();
    }

    private void updateKpis() {
        int openCount = 0;
        int inProgressCount = 0;
        int resolvedCount = 0;

        for (JSONObject t : allTickets) {
            String status = t.optString("status", "OPEN").toUpperCase(Locale.ROOT);
            if ("OPEN".equals(status)) {
                openCount++;
            } else if ("IN_PROGRESS".equals(status) || "INPROGRESS".equals(status)) {
                inProgressCount++;
            } else if ("RESOLVED".equals(status) || "CLOSED".equals(status)) {
                resolvedCount++;
            }
        }

        tvKpiOpenCount.setText(String.valueOf(openCount));
        tvKpiProgressCount.setText(String.valueOf(inProgressCount));
        tvKpiResolvedCount.setText(String.valueOf(resolvedCount));
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Render Tickets List with Filter & Search
    // ─────────────────────────────────────────────────────────────────────────
    private void renderTickets() {
        containerTicketsList.removeAllViews();

        List<JSONObject> filtered = new ArrayList<>();
        for (JSONObject t : allTickets) {
            String status = t.optString("status", "OPEN").toUpperCase(Locale.ROOT);
            String subject = t.optString("subject", "").toLowerCase(Locale.ROOT);
            String ticketNum = t.optString("ticketNumber", "").toLowerCase(Locale.ROOT);
            String desc = t.optString("description", "").toLowerCase(Locale.ROOT);
            String cat = t.optString("category", "").toLowerCase(Locale.ROOT);

            // Filter check
            boolean matchesFilter = true;
            if ("OPEN".equals(currentFilter)) {
                matchesFilter = "OPEN".equals(status);
            } else if ("IN_PROGRESS".equals(currentFilter)) {
                matchesFilter = "IN_PROGRESS".equals(status) || "INPROGRESS".equals(status);
            } else if ("RESOLVED".equals(currentFilter)) {
                matchesFilter = "RESOLVED".equals(status) || "CLOSED".equals(status);
            }

            if (!matchesFilter) continue;

            // Search check
            if (!currentSearch.isEmpty()) {
                boolean matchesSearch = subject.contains(currentSearch) ||
                        ticketNum.contains(currentSearch) ||
                        desc.contains(currentSearch) ||
                        cat.contains(currentSearch);
                if (!matchesSearch) continue;
            }

            filtered.add(t);
        }

        tvTicketsTotalLabel.setText(filtered.size() + (filtered.size() == 1 ? " ticket" : " tickets"));

        if (filtered.isEmpty()) {
            layoutEmptyState.setVisibility(View.VISIBLE);
            containerTicketsList.setVisibility(View.GONE);
            return;
        }

        layoutEmptyState.setVisibility(View.GONE);
        containerTicketsList.setVisibility(View.VISIBLE);

        LayoutInflater inflater = LayoutInflater.from(this);

        for (JSONObject ticket : filtered) {
            View itemView = inflater.inflate(R.layout.item_support_ticket, containerTicketsList, false);

            TextView tvNumber = itemView.findViewById(R.id.tvTicketNumber);
            TextView tvCategory = itemView.findViewById(R.id.tvTicketCategory);
            TextView tvPriority = itemView.findViewById(R.id.tvTicketPriority);
            TextView tvStatus = itemView.findViewById(R.id.tvTicketStatus);
            TextView tvSubject = itemView.findViewById(R.id.tvTicketSubject);
            TextView tvDesc = itemView.findViewById(R.id.tvTicketDesc);
            TextView tvDate = itemView.findViewById(R.id.tvTicketDate);
            TextView tvMessages = itemView.findViewById(R.id.tvTicketMessagesCount);

            String ticketNum = ticket.optString("ticketNumber", "TKT-0000");
            String status = ticket.optString("status", "OPEN").toUpperCase(Locale.ROOT);
            String priority = ticket.optString("priority", "MEDIUM").toUpperCase(Locale.ROOT);
            String category = ticket.optString("category", "GENERAL").toUpperCase(Locale.ROOT);
            String subject = ticket.optString("subject", "No Subject");
            String desc = ticket.optString("description", "");
            String updatedAt = ticket.optString("updatedAt", ticket.optString("createdAt", ""));

            tvNumber.setText(ticketNum);
            tvCategory.setText(category);
            tvPriority.setText(priority);
            tvSubject.setText(subject);
            tvDesc.setText(desc.isEmpty() ? "No description provided." : desc);
            tvDate.setText(formatRelativeDate(updatedAt));

            // Message count
            int msgCount = 0;
            JSONObject countObj = ticket.optJSONObject("_count");
            if (countObj != null) {
                msgCount = countObj.optInt("messages", 0);
            }
            tvMessages.setText(msgCount + (msgCount == 1 ? " message" : " messages"));

            // Priority Chip Styling
            if ("URGENT".equals(priority)) {
                tvPriority.setTextColor(0xFFDC2626);
            } else if ("HIGH".equals(priority)) {
                tvPriority.setTextColor(0xFFEA580C);
            } else if ("LOW".equals(priority)) {
                tvPriority.setTextColor(0xFF16A34A);
            } else {
                tvPriority.setTextColor(0xFF2563EB); // MEDIUM
            }

            // Status Badge Styling
            if ("OPEN".equals(status)) {
                tvStatus.setText("OPEN");
                tvStatus.setBackgroundResource(R.drawable.bg_ticket_badge_open);
                tvStatus.setTextColor(0xFFDC2626);
            } else if ("IN_PROGRESS".equals(status) || "INPROGRESS".equals(status)) {
                tvStatus.setText("IN PROGRESS");
                tvStatus.setBackgroundResource(R.drawable.bg_ticket_badge_progress);
                tvStatus.setTextColor(0xFFD97706);
            } else if ("RESOLVED".equals(status)) {
                tvStatus.setText("RESOLVED");
                tvStatus.setBackgroundResource(R.drawable.bg_ticket_badge_resolved);
                tvStatus.setTextColor(0xFF16A34A);
            } else {
                tvStatus.setText("CLOSED");
                tvStatus.setBackgroundResource(R.drawable.bg_ticket_number);
                tvStatus.setTextColor(0xFF475569);
            }

            itemView.setOnClickListener(v -> showTicketDetailDialog(ticket));

            containerTicketsList.addView(itemView);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Ticket Detail & Real-Time Conversation Bottom Sheet
    // ─────────────────────────────────────────────────────────────────────────
    private void showTicketDetailDialog(JSONObject ticket) {
        BottomSheetDialog dialog = new BottomSheetDialog(this);
        View view = LayoutInflater.from(this).inflate(R.layout.dialog_support_ticket_detail, null);
        dialog.setContentView(view);

        // Make dialog expand properly
        View parent = (View) view.getParent();
        if (parent != null) {
            BottomSheetBehavior<View> behavior = BottomSheetBehavior.from(parent);
            behavior.setState(BottomSheetBehavior.STATE_EXPANDED);
            behavior.setSkipCollapsed(true);
        }

        String ticketId = ticket.optString("id", "");
        String ticketNum = ticket.optString("ticketNumber", "TKT-0000");
        String status = ticket.optString("status", "OPEN").toUpperCase(Locale.ROOT);
        String priority = ticket.optString("priority", "MEDIUM").toUpperCase(Locale.ROOT);
        String category = ticket.optString("category", "GENERAL").toUpperCase(Locale.ROOT);
        String subject = ticket.optString("subject", "No Subject");
        String desc = ticket.optString("description", "");

        TextView tvNumber = view.findViewById(R.id.tvDetailTicketNumber);
        TextView tvCategory = view.findViewById(R.id.tvDetailCategory);
        TextView tvPriority = view.findViewById(R.id.tvDetailPriority);
        TextView tvStatus = view.findViewById(R.id.tvDetailStatus);
        TextView tvSubj = view.findViewById(R.id.tvDetailSubject);
        TextView tvDescription = view.findViewById(R.id.tvDetailDescription);
        FrameLayout btnClose = view.findViewById(R.id.btnCloseDetail);

        tvNumber.setText(ticketNum);
        tvCategory.setText(category);
        tvPriority.setText(priority);
        tvSubj.setText(subject);
        tvDescription.setText(desc.isEmpty() ? "No initial description provided." : desc);

        if ("OPEN".equals(status)) {
            tvStatus.setText("OPEN");
            tvStatus.setBackgroundResource(R.drawable.bg_ticket_badge_open);
            tvStatus.setTextColor(0xFFDC2626);
        } else if ("IN_PROGRESS".equals(status) || "INPROGRESS".equals(status)) {
            tvStatus.setText("IN PROGRESS");
            tvStatus.setBackgroundResource(R.drawable.bg_ticket_badge_progress);
            tvStatus.setTextColor(0xFFD97706);
        } else if ("RESOLVED".equals(status)) {
            tvStatus.setText("RESOLVED");
            tvStatus.setBackgroundResource(R.drawable.bg_ticket_badge_resolved);
            tvStatus.setTextColor(0xFF16A34A);
        } else {
            tvStatus.setText("CLOSED");
            tvStatus.setBackgroundResource(R.drawable.bg_ticket_number);
            tvStatus.setTextColor(0xFF475569);
        }

        btnClose.setOnClickListener(v -> dialog.dismiss());

        // Message Thread Elements
        LinearLayout containerMessages = view.findViewById(R.id.containerMessagesList);
        ProgressBar pbLoading = view.findViewById(R.id.pbDetailLoading);
        TextView tvNoMessages = view.findViewById(R.id.tvNoMessages);
        NestedScrollView scrollMessages = view.findViewById(R.id.scrollMessages);
        EditText etReply = view.findViewById(R.id.etDetailReply);
        FrameLayout btnSend = view.findViewById(R.id.btnSendReply);
        ProgressBar pbSending = view.findViewById(R.id.pbSendingReply);
        ImageView imgSendIcon = btnSend.findViewById(R.id.btnSendReply).findViewById(android.R.id.icon);

        // Fetch detail messages immediately
        fetchTicketThread(ticketId, containerMessages, pbLoading, tvNoMessages, scrollMessages, tvStatus);

        // 5-second polling runnable for real-time conversation synchronization
        Runnable pollRunnable = new Runnable() {
            @Override
            public void run() {
                if (dialog.isShowing()) {
                    fetchTicketThread(ticketId, containerMessages, null, tvNoMessages, scrollMessages, tvStatus);
                    mainHandler.postDelayed(this, 5000);
                }
            }
        };
        mainHandler.postDelayed(pollRunnable, 5000);

        dialog.setOnDismissListener(d -> {
            mainHandler.removeCallbacks(pollRunnable);
            fetchTickets(); // Refresh background list when detail closes
        });

        // Send Reply action
        btnSend.setOnClickListener(v -> {
            String replyText = etReply.getText().toString().trim();
            if (replyText.isEmpty()) return;

            btnSend.setEnabled(false);
            pbSending.setVisibility(View.VISIBLE);

            new Thread(() -> {
                try {
                    String token = getAuthToken();
                    URL url = new URL(BASE_URL + "/api/support/" + ticketId);
                    HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                    conn.setRequestMethod("POST");
                    conn.setRequestProperty("Content-Type", "application/json; charset=utf-8");
                    conn.setRequestProperty("Accept", "application/json");

                    if (token != null && !token.isEmpty()) {
                        conn.setRequestProperty("Authorization", "Bearer " + token);
                        conn.setRequestProperty("Cookie", "token=" + token);
                    }
                    conn.setDoOutput(true);
                    conn.setConnectTimeout(8000);
                    conn.setReadTimeout(8000);

                    JSONObject body = new JSONObject();
                    body.put("message", replyText);
                    body.put("isStaff", false);
                    body.put("senderName", "Client");

                    OutputStream os = conn.getOutputStream();
                    os.write(body.toString().getBytes(StandardCharsets.UTF_8));
                    os.flush();
                    os.close();

                    int resCode = conn.getResponseCode();
                    mainHandler.post(() -> {
                        btnSend.setEnabled(true);
                        pbSending.setVisibility(View.GONE);

                        if (resCode == 200 || resCode == 201) {
                            etReply.setText("");
                            fetchTicketThread(ticketId, containerMessages, null, tvNoMessages, scrollMessages, tvStatus);
                            fetchTickets();
                        } else {
                            Toast.makeText(SupportActivity.this, "Unable to send reply. Please try again.", Toast.LENGTH_SHORT).show();
                        }
                    });
                } catch (Exception e) {
                    mainHandler.post(() -> {
                        btnSend.setEnabled(true);
                        pbSending.setVisibility(View.GONE);
                        Toast.makeText(SupportActivity.this, "Network error sending message.", Toast.LENGTH_SHORT).show();
                    });
                }
            }).start();
        });

        dialog.show();
    }

    private void fetchTicketThread(String ticketId, LinearLayout container, @Nullable ProgressBar pb,
                                   TextView tvNoMessages, NestedScrollView scroll, TextView tvStatus) {
        if (pb != null) pb.setVisibility(View.VISIBLE);

        new Thread(() -> {
            try {
                String token = getAuthToken();
                URL url = new URL(BASE_URL + "/api/support/" + ticketId);
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("GET");
                conn.setRequestProperty("Accept", "application/json");

                if (token != null && !token.isEmpty()) {
                    conn.setRequestProperty("Authorization", "Bearer " + token);
                    conn.setRequestProperty("Cookie", "token=" + token);
                }
                conn.setConnectTimeout(8000);
                conn.setReadTimeout(8000);

                if (conn.getResponseCode() == 200) {
                    String responseBody = readStream(conn.getInputStream());
                    JSONObject detailObj = new JSONObject(responseBody);
                    JSONArray messagesArray = detailObj.optJSONArray("messages");
                    String currentStatus = detailObj.optString("status", "OPEN").toUpperCase(Locale.ROOT);

                    mainHandler.post(() -> {
                        if (pb != null) pb.setVisibility(View.GONE);

                        // Update status pill if changed
                        if (tvStatus != null) {
                            if ("OPEN".equals(currentStatus)) {
                                tvStatus.setText("OPEN");
                                tvStatus.setBackgroundResource(R.drawable.bg_ticket_badge_open);
                                tvStatus.setTextColor(0xFFDC2626);
                            } else if ("IN_PROGRESS".equals(currentStatus) || "INPROGRESS".equals(currentStatus)) {
                                tvStatus.setText("IN PROGRESS");
                                tvStatus.setBackgroundResource(R.drawable.bg_ticket_badge_progress);
                                tvStatus.setTextColor(0xFFD97706);
                            } else if ("RESOLVED".equals(currentStatus)) {
                                tvStatus.setText("RESOLVED");
                                tvStatus.setBackgroundResource(R.drawable.bg_ticket_badge_resolved);
                                tvStatus.setTextColor(0xFF16A34A);
                            }
                        }

                        renderMessages(container, messagesArray, tvNoMessages, scroll);
                    });
                } else {
                    mainHandler.post(() -> {
                        if (pb != null) pb.setVisibility(View.GONE);
                    });
                }
            } catch (Exception e) {
                mainHandler.post(() -> {
                    if (pb != null) pb.setVisibility(View.GONE);
                });
            }
        }).start();
    }

    private void renderMessages(LinearLayout container, @Nullable JSONArray messages, TextView tvNoMessages, NestedScrollView scroll) {
        if (messages == null || messages.length() == 0) {
            tvNoMessages.setVisibility(View.VISIBLE);
            container.removeAllViews();
            return;
        }

        tvNoMessages.setVisibility(View.GONE);
        container.removeAllViews();
        LayoutInflater inflater = LayoutInflater.from(this);

        for (int i = 0; i < messages.length(); i++) {
            JSONObject msg = messages.optJSONObject(i);
            if (msg == null) continue;

            View msgView = inflater.inflate(R.layout.item_ticket_message, container, false);

            boolean isStaff = msg.optBoolean("isStaff", false);
            String senderName = msg.optString("senderName", isStaff ? "Support Specialist" : "You");
            String body = msg.optString("message", "");
            String createdAt = msg.optString("createdAt", "");

            LinearLayout layoutStaff = msgView.findViewById(R.id.layoutStaffMsg);
            LinearLayout layoutUser = msgView.findViewById(R.id.layoutUserMsg);

            if (isStaff) {
                layoutStaff.setVisibility(View.VISIBLE);
                layoutUser.setVisibility(View.GONE);

                TextView tvStaffName = msgView.findViewById(R.id.tvStaffSenderName);
                TextView tvStaffBody = msgView.findViewById(R.id.tvStaffMsgBody);
                TextView tvStaffTime = msgView.findViewById(R.id.tvStaffMsgTime);

                tvStaffName.setText(senderName);
                tvStaffBody.setText(body);
                tvStaffTime.setText(formatTimeOnly(createdAt));
            } else {
                layoutStaff.setVisibility(View.GONE);
                layoutUser.setVisibility(View.VISIBLE);

                TextView tvUserBody = msgView.findViewById(R.id.tvUserMsgBody);
                TextView tvUserTime = msgView.findViewById(R.id.tvUserMsgTime);

                tvUserBody.setText(body);
                tvUserTime.setText(formatTimeOnly(createdAt));
            }

            container.addView(msgView);
        }

        // Scroll to bottom
        scroll.post(() -> scroll.fullScroll(View.FOCUS_DOWN));
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Create Support Ticket Bottom Sheet Dialog
    // ─────────────────────────────────────────────────────────────────────────
    private void showCreateTicketDialog() {
        BottomSheetDialog dialog = new BottomSheetDialog(this);
        View view = LayoutInflater.from(this).inflate(R.layout.dialog_create_support_ticket, null);
        dialog.setContentView(view);

        // Make dialog expand properly
        View parent = (View) view.getParent();
        if (parent != null) {
            BottomSheetBehavior<View> behavior = BottomSheetBehavior.from(parent);
            behavior.setState(BottomSheetBehavior.STATE_EXPANDED);
            behavior.setSkipCollapsed(true);
        }

        // Categories
        TextView chipTech = view.findViewById(R.id.chipCategoryTech);
        TextView chipBilling = view.findViewById(R.id.chipCategoryBilling);
        TextView chipGeneral = view.findViewById(R.id.chipCategoryGeneral);

        final String[] selectedCategory = {"TECHNICAL"};

        View.OnClickListener catListener = v -> {
            chipTech.setBackgroundResource(R.drawable.bg_chip_inactive);
            chipTech.setTextColor(0xFF475569);
            chipBilling.setBackgroundResource(R.drawable.bg_chip_inactive);
            chipBilling.setTextColor(0xFF475569);
            chipGeneral.setBackgroundResource(R.drawable.bg_chip_inactive);
            chipGeneral.setTextColor(0xFF475569);

            if (v == chipTech) {
                selectedCategory[0] = "TECHNICAL";
                chipTech.setBackgroundResource(R.drawable.bg_chip_active);
                chipTech.setTextColor(0xFFFFFFFF);
            } else if (v == chipBilling) {
                selectedCategory[0] = "BILLING";
                chipBilling.setBackgroundResource(R.drawable.bg_chip_active);
                chipBilling.setTextColor(0xFFFFFFFF);
            } else {
                selectedCategory[0] = "GENERAL";
                chipGeneral.setBackgroundResource(R.drawable.bg_chip_active);
                chipGeneral.setTextColor(0xFFFFFFFF);
            }
        };

        chipTech.setOnClickListener(catListener);
        chipBilling.setOnClickListener(catListener);
        chipGeneral.setOnClickListener(catListener);

        // Priorities
        TextView chipLow = view.findViewById(R.id.chipPriorityLow);
        TextView chipMed = view.findViewById(R.id.chipPriorityMedium);
        TextView chipHigh = view.findViewById(R.id.chipPriorityHigh);
        TextView chipUrgent = view.findViewById(R.id.chipPriorityUrgent);

        final String[] selectedPriority = {"MEDIUM"};

        View.OnClickListener prioListener = v -> {
            chipLow.setBackgroundResource(R.drawable.bg_chip_inactive);
            chipLow.setTextColor(0xFF475569);
            chipMed.setBackgroundResource(R.drawable.bg_chip_inactive);
            chipMed.setTextColor(0xFF475569);
            chipHigh.setBackgroundResource(R.drawable.bg_chip_inactive);
            chipHigh.setTextColor(0xFF475569);
            chipUrgent.setBackgroundResource(R.drawable.bg_chip_inactive);
            chipUrgent.setTextColor(0xFF475569);

            if (v == chipLow) {
                selectedPriority[0] = "LOW";
                chipLow.setBackgroundResource(R.drawable.bg_chip_active);
                chipLow.setTextColor(0xFFFFFFFF);
            } else if (v == chipMed) {
                selectedPriority[0] = "MEDIUM";
                chipMed.setBackgroundResource(R.drawable.bg_chip_active);
                chipMed.setTextColor(0xFFFFFFFF);
            } else if (v == chipHigh) {
                selectedPriority[0] = "HIGH";
                chipHigh.setBackgroundResource(R.drawable.bg_chip_active);
                chipHigh.setTextColor(0xFFFFFFFF);
            } else {
                selectedPriority[0] = "URGENT";
                chipUrgent.setBackgroundResource(R.drawable.bg_chip_active);
                chipUrgent.setTextColor(0xFFFFFFFF);
            }
        };

        chipLow.setOnClickListener(prioListener);
        chipMed.setOnClickListener(prioListener);
        chipHigh.setOnClickListener(prioListener);
        chipUrgent.setOnClickListener(prioListener);

        EditText etSubject = view.findViewById(R.id.etNewTicketSubject);
        EditText etDesc = view.findViewById(R.id.etNewTicketDesc);
        Button btnCancel = view.findViewById(R.id.btnCancelNewTicket);
        Button btnSubmit = view.findViewById(R.id.btnSubmitNewTicket);
        ProgressBar pbSubmit = view.findViewById(R.id.pbSubmittingNewTicket);
        FrameLayout btnClose = view.findViewById(R.id.btnCloseNewTicket);

        btnCancel.setOnClickListener(v -> dialog.dismiss());
        btnClose.setOnClickListener(v -> dialog.dismiss());

        btnSubmit.setOnClickListener(v -> {
            String subject = etSubject.getText().toString().trim();
            String desc = etDesc.getText().toString().trim();

            if (subject.isEmpty()) {
                etSubject.setError("Please enter a subject");
                etSubject.requestFocus();
                return;
            }
            if (desc.isEmpty()) {
                etDesc.setError("Please describe your issue");
                etDesc.requestFocus();
                return;
            }

            btnSubmit.setEnabled(false);
            btnSubmit.setText("");
            pbSubmit.setVisibility(View.VISIBLE);

            new Thread(() -> {
                try {
                    String token = getAuthToken();
                    URL url = new URL(BASE_URL + "/api/support");
                    HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                    conn.setRequestMethod("POST");
                    conn.setRequestProperty("Content-Type", "application/json; charset=utf-8");
                    conn.setRequestProperty("Accept", "application/json");

                    if (token != null && !token.isEmpty()) {
                        conn.setRequestProperty("Authorization", "Bearer " + token);
                        conn.setRequestProperty("Cookie", "token=" + token);
                    }
                    conn.setDoOutput(true);
                    conn.setConnectTimeout(8000);
                    conn.setReadTimeout(8000);

                    JSONObject body = new JSONObject();
                    body.put("subject", subject);
                    body.put("description", desc);
                    body.put("category", selectedCategory[0]);
                    body.put("priority", selectedPriority[0]);

                    OutputStream os = conn.getOutputStream();
                    os.write(body.toString().getBytes(StandardCharsets.UTF_8));
                    os.flush();
                    os.close();

                    int resCode = conn.getResponseCode();
                    mainHandler.post(() -> {
                        btnSubmit.setEnabled(true);
                        btnSubmit.setText("Submit Ticket");
                        pbSubmit.setVisibility(View.GONE);

                        if (resCode == 200 || resCode == 201) {
                            Toast.makeText(SupportActivity.this, "Ticket submitted successfully.", Toast.LENGTH_SHORT).show();
                            dialog.dismiss();
                            fetchTickets();
                        } else {
                            Toast.makeText(SupportActivity.this, "Failed to submit ticket. Please check connection.", Toast.LENGTH_SHORT).show();
                        }
                    });
                } catch (Exception e) {
                    mainHandler.post(() -> {
                        btnSubmit.setEnabled(true);
                        btnSubmit.setText("Submit Ticket");
                        pbSubmit.setVisibility(View.GONE);
                        Toast.makeText(SupportActivity.this, "Network error creating ticket.", Toast.LENGTH_SHORT).show();
                    });
                }
            }).start();
        });

        dialog.show();
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  FAQ Accordion Setup
    // ─────────────────────────────────────────────────────────────────────────
    private void setupFaqAccordion() {
        setupFaqItem(R.id.faqItem1, R.id.faqAnswer1, R.id.faqArrow1);
        setupFaqItem(R.id.faqItem2, R.id.faqAnswer2, R.id.faqArrow2);
        setupFaqItem(R.id.faqItem3, R.id.faqAnswer3, R.id.faqArrow3);
        setupFaqItem(R.id.faqItem4, R.id.faqAnswer4, R.id.faqArrow4);
    }

    private void setupFaqItem(int itemId, int answerId, int arrowId) {
        View item = findViewById(itemId);
        TextView answer = findViewById(answerId);
        ImageView arrow = findViewById(arrowId);

        if (item != null && answer != null && arrow != null) {
            item.setOnClickListener(v -> {
                boolean isExpanded = answer.getVisibility() == View.VISIBLE;
                answer.setVisibility(isExpanded ? View.GONE : View.VISIBLE);
                arrow.animate().rotation(isExpanded ? 0f : 180f).setDuration(200).start();
            });
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Direct Assistance Channels
    // ─────────────────────────────────────────────────────────────────────────
    private void setupDirectAssistance() {
        View btnCall = findViewById(R.id.btnCallSupport);
        if (btnCall != null) {
            btnCall.setOnClickListener(v -> {
                try {
                    Intent intent = new Intent(Intent.ACTION_DIAL);
                    intent.setData(Uri.parse("tel:+919876543210"));
                    startActivity(intent);
                } catch (Exception e) {
                    Toast.makeText(this, "Unable to initiate call.", Toast.LENGTH_SHORT).show();
                }
            });
        }

        View btnWhatsApp = findViewById(R.id.btnWhatsAppSupport);
        if (btnWhatsApp != null) {
            btnWhatsApp.setOnClickListener(v -> {
                try {
                    String msg = Uri.encode("Hello Patholab Support Desk, I need assistance with my laboratory workspace.");
                    Intent intent = new Intent(Intent.ACTION_VIEW);
                    intent.setData(Uri.parse("https://wa.me/919876543210?text=" + msg));
                    startActivity(intent);
                } catch (Exception e) {
                    Toast.makeText(this, "Unable to open WhatsApp.", Toast.LENGTH_SHORT).show();
                }
            });
        }

        View btnEmail = findViewById(R.id.btnEmailSupport);
        if (btnEmail != null) {
            btnEmail.setOnClickListener(v -> {
                try {
                    Intent intent = new Intent(Intent.ACTION_SENDTO);
                    intent.setData(Uri.parse("mailto:support@patholab.cloud"));
                    intent.putExtra(Intent.EXTRA_SUBJECT, "Patholab Cloud Support Request");
                    startActivity(intent);
                } catch (Exception e) {
                    Toast.makeText(this, "Unable to open email client.", Toast.LENGTH_SHORT).show();
                }
            });
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Helpers
    // ─────────────────────────────────────────────────────────────────────────
    private String getAuthToken() {
        String token = AuthManager.getToken(this);
        if (token != null && !token.isEmpty()) return token;

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
                            AuthManager.saveToken(this, cookieToken);
                            return cookieToken;
                        }
                    }
                }
            }
        } catch (Exception ignored) {}

        SharedPreferences prefs = getSharedPreferences("patholab_prefs", Context.MODE_PRIVATE);
        return prefs.getString("auth_token", "");
    }

    private String readStream(InputStream is) throws Exception {
        BufferedReader r = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8));
        StringBuilder sb = new StringBuilder();
        String l;
        while ((l = r.readLine()) != null) sb.append(l);
        return sb.toString();
    }

    private String formatRelativeDate(String iso) {
        try {
            SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
            sdf.setTimeZone(TimeZone.getTimeZone("UTC"));
            Date date = sdf.parse(iso);
            if (date == null) {
                SimpleDateFormat fallback = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.US);
                date = fallback.parse(iso);
            }
            if (date == null) return "Recent";

            long diffMs = System.currentTimeMillis() - date.getTime();
            long minutes = diffMs / (60 * 1000);
            long hours = diffMs / (60 * 60 * 1000);
            long days = diffMs / (24 * 60 * 60 * 1000);

            if (minutes < 1) return "Just now";
            if (minutes < 60) return minutes + "m ago";
            if (hours < 24) return hours + "h ago";
            if (days < 7) return days + "d ago";

            SimpleDateFormat out = new SimpleDateFormat("dd MMM yyyy", Locale.US);
            return out.format(date);
        } catch (Exception e) {
            return iso.length() >= 10 ? iso.substring(0, 10) : "Recent";
        }
    }

    private String formatTimeOnly(String iso) {
        try {
            SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
            sdf.setTimeZone(TimeZone.getTimeZone("UTC"));
            Date date = sdf.parse(iso);
            if (date == null) {
                SimpleDateFormat fallback = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.US);
                date = fallback.parse(iso);
            }
            if (date == null) return "";
            SimpleDateFormat out = new SimpleDateFormat("hh:mm a", Locale.US);
            return out.format(date);
        } catch (Exception e) {
            return "";
        }
    }
}
