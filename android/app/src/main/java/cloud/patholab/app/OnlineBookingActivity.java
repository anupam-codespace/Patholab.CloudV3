package cloud.patholab.app;

import android.app.DatePickerDialog;
import android.content.ClipData;
import android.content.ClipboardManager;
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
import android.view.ViewGroup;
import android.view.animation.Animation;
import android.view.animation.RotateAnimation;
import android.webkit.CookieManager;
import android.widget.Button;
import android.widget.CheckBox;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;
import androidx.appcompat.widget.SwitchCompat;
import androidx.core.content.ContextCompat;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.google.android.material.bottomsheet.BottomSheetBehavior;
import com.google.android.material.bottomsheet.BottomSheetDialog;
import com.google.android.material.floatingactionbutton.ExtendedFloatingActionButton;

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
import java.util.Calendar;
import java.util.Date;
import java.util.List;
import java.util.Locale;

import cloud.patholab.app.auth.AuthManager;

/**
 * OnlineBookingActivity
 * ─────────────────────────────────────────────────────────────────────────────
 * Native dedicated Online Booking and B2B2C Patient Portal Management Console.
 * Full parity with web module (/workspace/bookings & /workspace/bookings/settings):
 *  - Real-time KPI cards: Total Bookings, New Today, Pending Action, Total Revenue, Home Collections
 *  - Live Portal status pill & quick launcher
 *  - Search Omnibar (patient name, phone, test name, UHID, pincode)
 *  - Filter chips (All, Pending, Home Collection, Lab Visit, Completed, Cancelled)
 *  - Card list with direct Call, WhatsApp, Assign Trip, and Collect Sample actions
 *  - Booking detail modal sheet with full clinical breakdown, maps integration, reschedule & status workflow
 *  - In-app booking creation modal sheet with live test catalog search, multi-select, and dynamic address routing
 *  - Portal settings modal sheet with slug customizer, live link preview, copy, and share actions
 */
public class OnlineBookingActivity extends AppCompatActivity {

    private static final String BASE_URL = "https://app.patholab.cloud";

    // Header Views
    private FrameLayout btnPortalSettings;
    private FrameLayout btnRefreshBookings;
    private ImageView imgRefreshBookingsIcon;

    // Public Booking URL Banner Views (Matches Web Screenshot 3)
    private FrameLayout cardLivePortalBanner;
    private LinearLayout layoutPortalActiveBanner;
    private LinearLayout layoutPortalOfflineBanner;
    private TextView lblLivePortalUrl;
    private ImageView btnOpenPortalBrowser;
    private LinearLayout btnCopyPortalUrl;
    private LinearLayout btnShareWhatsAppPortal;
    private Button btnEnablePortalFromBanner;

    // 4 KPI Metric Views (Exact Web Parity)
    private TextView lblKpiTotalBookings;
    private TextView lblKpiPendingBookings;
    private TextView lblKpiVerifiedBookings;
    private TextView lblKpiRevenueBookings;

    // Search & Filter Views
    private EditText inputSearchBookings;
    private ImageView btnClearSearchBookings;
    private LinearLayout containerBookingFilterChips;
    private ProgressBar progressBookings;

    // List & Empty State
    private RecyclerView recyclerBookings;
    private LinearLayout emptyStateBookings;
    private Button btnEmptyShareLink;
    private Button btnEmptyEnablePortal;
    private ExtendedFloatingActionButton fabNewBooking;

    // Adapters & Data
    private BookingsAdapter bookingsAdapter;
    private final List<JSONObject> allBookings = new ArrayList<>();
    private final List<JSONObject> filteredBookings = new ArrayList<>();
    private final List<JSONObject> testCatalog = new ArrayList<>();

    // State
    private String currentFilter = "ALL";
    private String currentSearchQuery = "";
    private String portalSlug = null;
    private String portalUrl = null;
    private boolean isPortalLive = false;

    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_online_booking);

        initViews();
        setupListeners();
        setupFilterChips();
        setupRecyclerView();

        loadBookingsData(false);
    }

    @Override
    protected void onResume() {
        super.onResume();
        loadBookingsData(false);
    }

    private void initViews() {
        FrameLayout btnBookingBack = findViewById(R.id.btnBookingBack);
        btnBookingBack.setOnClickListener(v -> finish());

        btnPortalSettings = findViewById(R.id.btnPortalSettings);
        btnRefreshBookings = findViewById(R.id.btnRefreshBookings);
        imgRefreshBookingsIcon = findViewById(R.id.imgRefreshBookingsIcon);

        // Public Portal Banner
        cardLivePortalBanner = findViewById(R.id.cardLivePortalBanner);
        layoutPortalActiveBanner = findViewById(R.id.layoutPortalActiveBanner);
        layoutPortalOfflineBanner = findViewById(R.id.layoutPortalOfflineBanner);
        lblLivePortalUrl = findViewById(R.id.lblLivePortalUrl);
        btnOpenPortalBrowser = findViewById(R.id.btnOpenPortalBrowser);
        btnCopyPortalUrl = findViewById(R.id.btnCopyPortalUrl);
        btnShareWhatsAppPortal = findViewById(R.id.btnShareWhatsAppPortal);
        btnEnablePortalFromBanner = findViewById(R.id.btnEnablePortalFromBanner);

        // 4 KPI Cards
        lblKpiTotalBookings = findViewById(R.id.lblKpiTotalBookings);
        lblKpiPendingBookings = findViewById(R.id.lblKpiPendingBookings);
        lblKpiVerifiedBookings = findViewById(R.id.lblKpiVerifiedBookings);
        lblKpiRevenueBookings = findViewById(R.id.lblKpiRevenueBookings);

        // Search & Filters
        inputSearchBookings = findViewById(R.id.inputSearchBookings);
        btnClearSearchBookings = findViewById(R.id.btnClearSearchBookings);
        containerBookingFilterChips = findViewById(R.id.containerBookingFilterChips);
        progressBookings = findViewById(R.id.progressBookings);

        // Recycler & Empty State
        recyclerBookings = findViewById(R.id.recyclerBookings);
        emptyStateBookings = findViewById(R.id.emptyStateBookings);
        btnEmptyShareLink = findViewById(R.id.btnEmptyShareLink);
        btnEmptyEnablePortal = findViewById(R.id.btnEmptyEnablePortal);
        fabNewBooking = findViewById(R.id.fabNewBooking);
    }

    private void setupListeners() {
        btnRefreshBookings.setOnClickListener(v -> {
            animateRefreshIcon();
            loadBookingsData(true);
        });

        btnPortalSettings.setOnClickListener(v -> showPortalSettingsSheet());

        btnCopyPortalUrl.setOnClickListener(v -> copyPortalUrlToClipboard());
        btnShareWhatsAppPortal.setOnClickListener(v -> sharePortalToWhatsApp());
        btnOpenPortalBrowser.setOnClickListener(v -> openPortalInBrowser());
        lblLivePortalUrl.setOnClickListener(v -> openPortalInBrowser());

        if (btnEnablePortalFromBanner != null) {
            btnEnablePortalFromBanner.setOnClickListener(v -> showPortalSettingsSheet());
        }

        if (btnEmptyShareLink != null) {
            btnEmptyShareLink.setOnClickListener(v -> sharePortalToWhatsApp());
        }
        btnEmptyEnablePortal.setOnClickListener(v -> showPortalSettingsSheet());

        fabNewBooking.setOnClickListener(v -> showCreateBookingSheet());

        inputSearchBookings.addTextChangedListener(new TextWatcher() {
            @Override
            public void beforeTextChanged(CharSequence s, int start, int count, int after) {}

            @Override
            public void onTextChanged(CharSequence s, int start, int before, int count) {
                currentSearchQuery = s.toString().trim().toLowerCase(Locale.ROOT);
                btnClearSearchBookings.setVisibility(currentSearchQuery.isEmpty() ? View.GONE : View.VISIBLE);
                applyFilterAndSearch();
            }

            @Override
            public void afterTextChanged(Editable s) {}
        });

        btnClearSearchBookings.setOnClickListener(v -> inputSearchBookings.setText(""));
    }

    private String getActivePortalUrl() {
        if (portalSlug != null && !portalSlug.trim().isEmpty() && !portalSlug.equals("null")) {
            return "https://app.patholab.cloud/book/" + portalSlug.trim();
        }
        return portalUrl != null ? portalUrl : "https://app.patholab.cloud/book";
    }

    private void copyPortalUrlToClipboard() {
        String url = getActivePortalUrl();
        ClipboardManager clipboard = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
        ClipData clip = ClipData.newPlainText("Lab Booking Link", url);
        if (clipboard != null) {
            clipboard.setPrimaryClip(clip);
            Toast.makeText(this, "Booking link copied to clipboard!", Toast.LENGTH_SHORT).show();
        }
    }

    private void sharePortalToWhatsApp() {
        String url = getActivePortalUrl();
        String message = "Hello! You can now book diagnostic tests, health packages, and home sample collection online directly with us:\n" + url;
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setData(Uri.parse("https://api.whatsapp.com/send?text=" + Uri.encode(message)));
            startActivity(intent);
        } catch (Exception e) {
            Intent shareIntent = new Intent(Intent.ACTION_SEND);
            shareIntent.setType("text/plain");
            shareIntent.putExtra(Intent.EXTRA_SUBJECT, "Book Diagnostic Tests Online");
            shareIntent.putExtra(Intent.EXTRA_TEXT, message);
            startActivity(Intent.createChooser(shareIntent, "Share Booking Portal Link"));
        }
    }

    private void openPortalInBrowser() {
        String url = getActivePortalUrl();
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
            startActivity(intent);
        } catch (Exception e) {
            Toast.makeText(this, "Could not open browser", Toast.LENGTH_SHORT).show();
        }
    }

    private void setupRecyclerView() {
        bookingsAdapter = new BookingsAdapter(filteredBookings, new BookingActionListener() {
            @Override
            public void onItemClicked(JSONObject booking) {
                showBookingDetailSheet(booking);
            }

            @Override
            public void onCallClicked(String phone) {
                if (phone != null && !phone.isEmpty()) {
                    try {
                        Intent intent = new Intent(Intent.ACTION_DIAL, Uri.parse("tel:" + phone));
                        startActivity(intent);
                    } catch (Exception e) {
                        Toast.makeText(OnlineBookingActivity.this, "Unable to launch dialer", Toast.LENGTH_SHORT).show();
                    }
                }
            }

            @Override
            public void onWhatsAppClicked(String phone) {
                if (phone != null && !phone.isEmpty()) {
                    try {
                        String cleanPhone = phone.replaceAll("[^0-9]", "");
                        if (!cleanPhone.startsWith("91") && cleanPhone.length() == 10) {
                            cleanPhone = "91" + cleanPhone;
                        }
                        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse("https://wa.me/" + cleanPhone));
                        startActivity(intent);
                    } catch (Exception e) {
                        Toast.makeText(OnlineBookingActivity.this, "WhatsApp not installed", Toast.LENGTH_SHORT).show();
                    }
                }
            }

            @Override
            public void onPrimaryActionClicked(JSONObject booking) {
                handlePrimaryAction(booking);
            }
        });

        recyclerBookings.setLayoutManager(new LinearLayoutManager(this));
        recyclerBookings.setAdapter(bookingsAdapter);
    }

    private void setupFilterChips() {
        containerBookingFilterChips.removeAllViews();
        String[] filters = {"ALL", "PENDING", "VERIFIED", "HOME_COLLECTION", "LAB_VISIT", "CANCELLED"};
        String[] titles = {"All Bookings", "Pending Verification", "Verified", "Home Collection", "Lab Visit", "Cancelled"};

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
                for (int c = 0; c < containerBookingFilterChips.getChildCount(); c++) {
                    View child = containerBookingFilterChips.getChildAt(c);
                    if (child instanceof TextView) {
                        updateChipStyle((TextView) child, false);
                    }
                }
                updateChipStyle(chip, true);
                applyFilterAndSearch();
            });

            containerBookingFilterChips.addView(chip);
        }
    }

    private void updateChipStyle(TextView chip, boolean isSelected) {
        if (isSelected) {
            chip.setBackgroundResource(R.drawable.bg_chip_active);
            chip.setTextColor(0xFFFFFFFF);
            chip.setTypeface(null, android.graphics.Typeface.BOLD);
        } else {
            chip.setBackgroundResource(R.drawable.bg_chip_inactive);
            chip.setTextColor(0xFF64748B);
            chip.setTypeface(null, android.graphics.Typeface.NORMAL);
        }
    }

    private void animateRefreshIcon() {
        if (imgRefreshBookingsIcon == null) return;
        RotateAnimation rotate = new RotateAnimation(0, 360,
                Animation.RELATIVE_TO_SELF, 0.5f, Animation.RELATIVE_TO_SELF, 0.5f);
        rotate.setDuration(600);
        rotate.setRepeatCount(1);
        imgRefreshBookingsIcon.startAnimation(rotate);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  DATA FETCHING & FILTERING
    // ─────────────────────────────────────────────────────────────────────────
    private void loadBookingsData(boolean isManualRefresh) {
        progressBookings.setVisibility(View.VISIBLE);

        new Thread(() -> {
            try {
                String token = getAuthToken();
                URL url = new URL(BASE_URL + "/api/workspace/appointments/online?format=full");
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("GET");
                conn.setRequestProperty("Authorization", "Bearer " + token);
                conn.setRequestProperty("Cookie", "token=" + token);
                conn.setRequestProperty("Accept", "application/json");
                conn.setConnectTimeout(10000);
                conn.setReadTimeout(15000);

                int responseCode = conn.getResponseCode();
                if (responseCode >= 200 && responseCode < 300) {
                    String jsonString = readStream(conn.getInputStream());
                    JSONObject responseObj = new JSONObject(jsonString);

                    JSONArray appointmentsArray = responseObj.optJSONArray("appointments");
                    if (appointmentsArray == null && jsonString.trim().startsWith("[")) {
                        appointmentsArray = new JSONArray(jsonString);
                    }

                    JSONObject statsObj = responseObj.optJSONObject("stats");
                    JSONObject portalObj = responseObj.optJSONObject("portal");

                    final List<JSONObject> loaded = new ArrayList<>();
                    if (appointmentsArray != null) {
                        for (int i = 0; i < appointmentsArray.length(); i++) {
                            loaded.add(appointmentsArray.getJSONObject(i));
                        }
                    }

                    mainHandler.post(() -> {
                        progressBookings.setVisibility(View.GONE);
                        allBookings.clear();
                        allBookings.addAll(loaded);

                        updatePortalUi(portalObj);
                        updateKpiCards(statsObj, loaded);
                        applyFilterAndSearch();

                        if (isManualRefresh) {
                            Toast.makeText(this, "Bookings synchronized", Toast.LENGTH_SHORT).show();
                        }
                    });
                } else {
                    mainHandler.post(() -> {
                        progressBookings.setVisibility(View.GONE);
                        Toast.makeText(this, "Failed to load bookings (" + responseCode + ")", Toast.LENGTH_SHORT).show();
                    });
                }
                conn.disconnect();
            } catch (Exception e) {
                mainHandler.post(() -> {
                    progressBookings.setVisibility(View.GONE);
                    Toast.makeText(this, "Network error: " + e.getMessage(), Toast.LENGTH_SHORT).show();
                });
            }
        }).start();
    }

    private void updatePortalUi(JSONObject portalObj) {
        if (portalObj != null) {
            portalSlug = portalObj.optString("portalSlug", null);
            isPortalLive = portalObj.optBoolean("isLive", false);
            portalUrl = portalObj.optString("url", null);
        }

        if (portalSlug != null && !portalSlug.trim().isEmpty() && !portalSlug.equals("null")) {
            portalUrl = "https://app.patholab.cloud/book/" + portalSlug.trim();
            isPortalLive = true;
        }

        if (isPortalLive && portalSlug != null && !portalSlug.isEmpty()) {
            layoutPortalActiveBanner.setVisibility(View.VISIBLE);
            layoutPortalOfflineBanner.setVisibility(View.GONE);
            String displayUrl = "app.patholab.cloud/book/" + portalSlug.trim();
            lblLivePortalUrl.setText(displayUrl);
        } else {
            layoutPortalActiveBanner.setVisibility(View.GONE);
            layoutPortalOfflineBanner.setVisibility(View.VISIBLE);
        }
    }

    private void updateKpiCards(JSONObject statsObj, List<JSONObject> fallbackList) {
        int totalCount = fallbackList.size();
        int totalPending = 0;
        int totalVerified = 0;
        double totalRevenue = 0.0;

        for (JSONObject item : fallbackList) {
            String status = item.optString("status", "").toUpperCase(Locale.ROOT);
            JSONObject invoice = item.optJSONObject("invoice");
            String paymentStatus = "";
            if (invoice != null) {
                totalRevenue += invoice.optDouble("grandTotal", 0.0);
                paymentStatus = invoice.optString("paymentStatus", "").toUpperCase(Locale.ROOT);
            }
            if ("SCHEDULED".equals(status) || "PENDING_PAYMENT".equals(status) || "PENDING".equals(status)) {
                totalPending++;
            }
            if ("VERIFIED".equals(status) || "ACCEPTED".equals(status) || "COMPLETED".equals(status) || "PAID".equals(paymentStatus)) {
                totalVerified++;
            }
        }

        if (statsObj != null) {
            totalCount = statsObj.optInt("totalCount", totalCount);
            totalPending = statsObj.optInt("totalPending", totalPending);
            totalRevenue = statsObj.optDouble("totalRevenue", totalRevenue);
        }

        lblKpiTotalBookings.setText(String.valueOf(totalCount));
        lblKpiPendingBookings.setText(String.valueOf(totalPending));
        lblKpiVerifiedBookings.setText(String.valueOf(totalVerified));
        lblKpiRevenueBookings.setText("₹" + String.format(Locale.getDefault(), "%,.0f", totalRevenue));
    }

    private void applyFilterAndSearch() {
        filteredBookings.clear();

        for (JSONObject item : allBookings) {
            String status = item.optString("status", "").toUpperCase(Locale.ROOT);
            String mode = item.optString("collectionMode", "").toUpperCase(Locale.ROOT);
            JSONObject invoice = item.optJSONObject("invoice");
            String paymentStatus = invoice != null ? invoice.optString("paymentStatus", "").toUpperCase(Locale.ROOT) : "";

            // Filter Chip Matching
            boolean matchesFilter = true;
            if ("PENDING".equals(currentFilter)) {
                matchesFilter = "SCHEDULED".equals(status) || "PENDING_PAYMENT".equals(status) || "PENDING".equals(status);
            } else if ("VERIFIED".equals(currentFilter)) {
                matchesFilter = "VERIFIED".equals(status) || "ACCEPTED".equals(status) || "COMPLETED".equals(status) || "PAID".equals(paymentStatus);
            } else if ("HOME_COLLECTION".equals(currentFilter)) {
                matchesFilter = "HOME_COLLECTION".equals(mode);
            } else if ("LAB_VISIT".equals(currentFilter)) {
                matchesFilter = "LAB_VISIT".equals(mode);
            } else if ("CANCELLED".equals(currentFilter)) {
                matchesFilter = "CANCELLED".equals(status) || "REJECTED".equals(status);
            }

            if (!matchesFilter) continue;

            // Search Omnibar Matching
            if (!currentSearchQuery.isEmpty()) {
                JSONObject patient = item.optJSONObject("patient");
                String name = patient != null ? patient.optString("name", "").toLowerCase(Locale.ROOT) : "";
                String phone = patient != null ? patient.optString("phone", "").toLowerCase(Locale.ROOT) : "";
                String uhid = patient != null ? patient.optString("patientId", "").toLowerCase(Locale.ROOT) : "";
                String pincode = item.optString("pincode", "").toLowerCase(Locale.ROOT);

                StringBuilder testsStr = new StringBuilder();
                JSONArray tests = item.optJSONArray("tests");
                if (tests != null) {
                    for (int t = 0; t < tests.length(); t++) {
                        JSONObject testObj = tests.optJSONObject(t);
                        if (testObj != null) {
                            testsStr.append(testObj.optString("testName", "").toLowerCase(Locale.ROOT)).append(" ");
                        }
                    }
                }

                boolean matchesSearch = name.contains(currentSearchQuery)
                        || phone.contains(currentSearchQuery)
                        || uhid.contains(currentSearchQuery)
                        || pincode.contains(currentSearchQuery)
                        || testsStr.toString().contains(currentSearchQuery);

                if (!matchesSearch) continue;
            }

            filteredBookings.add(item);
        }

        bookingsAdapter.notifyDataSetChanged();
        emptyStateBookings.setVisibility(filteredBookings.isEmpty() ? View.VISIBLE : View.GONE);
        recyclerBookings.setVisibility(filteredBookings.isEmpty() ? View.GONE : View.VISIBLE);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  WORKFLOW MUTATIONS (PATCH)
    // ─────────────────────────────────────────────────────────────────────────
    private void handlePrimaryAction(JSONObject booking) {
        String appointmentId = booking.optString("id");
        String status = booking.optString("status");
        String mode = booking.optString("collectionMode");

        if ("SCHEDULED".equals(status)) {
            if ("HOME_COLLECTION".equals(mode)) {
                updateBookingStatus(appointmentId, "ASSIGNED", "Trip assigned successfully");
            } else {
                updateBookingStatus(appointmentId, "SAMPLE_COLLECTED", "Sample marked as collected");
            }
        }
    }

    private void updateBookingStatus(String appointmentId, String newStatus, String successMsg) {
        progressBookings.setVisibility(View.VISIBLE);

        new Thread(() -> {
            try {
                String token = getAuthToken();
                URL url = new URL(BASE_URL + "/api/workspace/appointments/online");
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("PATCH");
                conn.setRequestProperty("Content-Type", "application/json");
                conn.setRequestProperty("Authorization", "Bearer " + token);
                conn.setRequestProperty("Cookie", "token=" + token);
                conn.setDoOutput(true);

                JSONObject body = new JSONObject();
                body.put("appointmentId", appointmentId);
                body.put("status", newStatus);

                OutputStream os = conn.getOutputStream();
                os.write(body.toString().getBytes(StandardCharsets.UTF_8));
                os.flush();
                os.close();

                int code = conn.getResponseCode();
                if (code >= 200 && code < 300) {
                    mainHandler.post(() -> {
                        Toast.makeText(this, successMsg, Toast.LENGTH_SHORT).show();
                        loadBookingsData(false);
                    });
                } else {
                    mainHandler.post(() -> {
                        progressBookings.setVisibility(View.GONE);
                        Toast.makeText(this, "Failed to update status (" + code + ")", Toast.LENGTH_SHORT).show();
                    });
                }
                conn.disconnect();
            } catch (Exception e) {
                mainHandler.post(() -> {
                    progressBookings.setVisibility(View.GONE);
                    Toast.makeText(this, "Error: " + e.getMessage(), Toast.LENGTH_SHORT).show();
                });
            }
        }).start();
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  BOOKING DETAIL SHEET
    // ─────────────────────────────────────────────────────────────────────────
    private void showBookingDetailSheet(JSONObject booking) {
        BottomSheetDialog dialog = new BottomSheetDialog(this);
        View sheet = LayoutInflater.from(this).inflate(R.layout.layout_online_booking_detail_sheet, null);
        dialog.setContentView(sheet);

        TextView lblDetailPatientName = sheet.findViewById(R.id.lblDetailPatientName);
        TextView lblDetailBookingUhid = sheet.findViewById(R.id.lblDetailBookingUhid);
        ImageView btnDetailClose = sheet.findViewById(R.id.btnDetailClose);
        TextView lblDetailModeBadge = sheet.findViewById(R.id.lblDetailModeBadge);
        TextView lblDetailStatusBadge = sheet.findViewById(R.id.lblDetailStatusBadge);

        TextView lblDetailPhone = sheet.findViewById(R.id.lblDetailPhone);
        TextView lblDetailEmail = sheet.findViewById(R.id.lblDetailEmail);
        TextView lblDetailAgeGender = sheet.findViewById(R.id.lblDetailAgeGender);
        Button btnDetailCall = sheet.findViewById(R.id.btnDetailCall);
        Button btnDetailWhatsApp = sheet.findViewById(R.id.btnDetailWhatsApp);

        TextView lblDetailScheduleDateTime = sheet.findViewById(R.id.lblDetailScheduleDateTime);
        TextView btnDetailReschedule = sheet.findViewById(R.id.btnDetailReschedule);

        LinearLayout containerDetailAddress = sheet.findViewById(R.id.containerDetailAddress);
        TextView lblDetailAddressText = sheet.findViewById(R.id.lblDetailAddressText);
        Button btnDetailOpenMaps = sheet.findViewById(R.id.btnDetailOpenMaps);

        TextView lblDetailTestsFullList = sheet.findViewById(R.id.lblDetailTestsFullList);
        TextView lblDetailGrandTotal = sheet.findViewById(R.id.lblDetailGrandTotal);
        TextView lblDetailPaymentStatusBadge = sheet.findViewById(R.id.lblDetailPaymentStatusBadge);

        Button btnDetailMarkAssigned = sheet.findViewById(R.id.btnDetailMarkAssigned);
        Button btnDetailMarkCollected = sheet.findViewById(R.id.btnDetailMarkCollected);
        Button btnDetailMarkCompleted = sheet.findViewById(R.id.btnDetailMarkCompleted);
        Button btnDetailCancelBooking = sheet.findViewById(R.id.btnDetailCancelBooking);

        btnDetailClose.setOnClickListener(v -> dialog.dismiss());

        // Fill Patient
        JSONObject patient = booking.optJSONObject("patient");
        String name = patient != null ? patient.optString("name", "Unknown Patient") : "Unknown Patient";
        String uhid = patient != null ? patient.optString("patientId", "UHID-N/A") : "UHID-N/A";
        String phone = patient != null ? patient.optString("phone", "N/A") : "N/A";
        String email = patient != null ? patient.optString("email", "No email provided") : "No email provided";
        int age = patient != null ? patient.optInt("age", 0) : 0;
        String gender = patient != null ? patient.optString("gender", "MALE") : "MALE";

        lblDetailPatientName.setText(name);
        lblDetailBookingUhid.setText("UHID: " + uhid + " • Online Portal");
        lblDetailPhone.setText(phone);
        lblDetailEmail.setText(email.isEmpty() ? "No email provided" : email);
        lblDetailAgeGender.setText("Age: " + (age > 0 ? (age + " Yrs") : "N/A") + " • Gender: " + gender);

        btnDetailCall.setOnClickListener(v -> {
            try {
                Intent intent = new Intent(Intent.ACTION_DIAL, Uri.parse("tel:" + phone));
                startActivity(intent);
            } catch (Exception ignored) {}
        });

        btnDetailWhatsApp.setOnClickListener(v -> {
            try {
                String cleanPhone = phone.replaceAll("[^0-9]", "");
                if (!cleanPhone.startsWith("91") && cleanPhone.length() == 10) cleanPhone = "91" + cleanPhone;
                startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse("https://wa.me/" + cleanPhone)));
            } catch (Exception ignored) {}
        });

        // Mode & Status Badges
        String mode = booking.optString("collectionMode", "LAB_VISIT");
        String status = booking.optString("status", "SCHEDULED");

        if ("HOME_COLLECTION".equalsIgnoreCase(mode)) {
            lblDetailModeBadge.setText("Home Collection");
            lblDetailModeBadge.setTextColor(0xFF7C3AED);
            lblDetailModeBadge.setBackgroundResource(R.drawable.bg_mod_badge_home_collection);
            containerDetailAddress.setVisibility(View.VISIBLE);

            String address = booking.optString("collectionAddress", "");
            String pincode = booking.optString("pincode", "");
            String fullAddr = address + (pincode.isEmpty() ? "" : (" • Pincode: " + pincode));
            lblDetailAddressText.setText(fullAddr.isEmpty() ? "No collection address entered" : fullAddr);

            btnDetailOpenMaps.setOnClickListener(v -> {
                if (!fullAddr.isEmpty()) {
                    try {
                        Intent mapIntent = new Intent(Intent.ACTION_VIEW, Uri.parse("geo:0,0?q=" + Uri.encode(fullAddr)));
                        startActivity(mapIntent);
                    } catch (Exception e) {
                        Toast.makeText(this, "Maps app not found", Toast.LENGTH_SHORT).show();
                    }
                }
            });
        } else {
            lblDetailModeBadge.setText("Lab Visit");
            lblDetailModeBadge.setTextColor(0xFF475569);
            lblDetailModeBadge.setBackgroundResource(R.drawable.bg_mod_badge_lab_visit);
            containerDetailAddress.setVisibility(View.GONE);
        }

        formatStatusBadge(lblDetailStatusBadge, status);

        // Schedule
        String apptDate = booking.optString("appointmentDate", "");
        String timeSlot = booking.optString("timeSlot", "Anytime");
        lblDetailScheduleDateTime.setText(formatDateHuman(apptDate) + " • " + timeSlot);

        final String appointmentId = booking.optString("id");

        btnDetailReschedule.setOnClickListener(v -> {
            Calendar calendar = Calendar.getInstance();
            new DatePickerDialog(this, (view, year, month, dayOfMonth) -> {
                Calendar selected = Calendar.getInstance();
                selected.set(year, month, dayOfMonth);
                SimpleDateFormat isoFormat = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
                String newIsoDate = isoFormat.format(selected.getTime());

                dialog.dismiss();
                rescheduleBooking(appointmentId, newIsoDate);
            }, calendar.get(Calendar.YEAR), calendar.get(Calendar.MONTH), calendar.get(Calendar.DAY_OF_MONTH)).show();
        });

        // Tests Breakdown
        JSONArray tests = booking.optJSONArray("tests");
        StringBuilder testDetails = new StringBuilder();
        if (tests != null && tests.length() > 0) {
            for (int t = 0; t < tests.length(); t++) {
                JSONObject tObj = tests.optJSONObject(t);
                if (tObj != null) {
                    testDetails.append(t + 1).append(". ")
                            .append(tObj.optString("testName", "Test"))
                            .append(" (").append(tObj.optString("testCode", "N/A")).append(")")
                            .append(" - ₹").append(tObj.optDouble("price", 0.0))
                            .append("\n");
                }
            }
        } else {
            testDetails.append("No specific tests listed");
        }
        lblDetailTestsFullList.setText(testDetails.toString().trim());

        // Financials
        JSONObject invoice = booking.optJSONObject("invoice");
        double grandTotal = invoice != null ? invoice.optDouble("grandTotal", 0.0) : 0.0;
        String payStatus = invoice != null ? invoice.optString("paymentStatus", "PENDING") : "PENDING";
        lblDetailGrandTotal.setText("₹" + String.format(Locale.getDefault(), "%,.0f", grandTotal));

        if ("PAID".equalsIgnoreCase(payStatus)) {
            lblDetailPaymentStatusBadge.setText("PAID");
            lblDetailPaymentStatusBadge.setTextColor(0xFF059669);
            lblDetailPaymentStatusBadge.setBackgroundResource(R.drawable.bg_payment_paid);
        } else {
            lblDetailPaymentStatusBadge.setText("PENDING");
            lblDetailPaymentStatusBadge.setTextColor(0xFFD97706);
            lblDetailPaymentStatusBadge.setBackgroundResource(R.drawable.bg_payment_pending);
        }

        // Action Buttons
        btnDetailMarkAssigned.setOnClickListener(v -> {
            dialog.dismiss();
            updateBookingStatus(appointmentId, "ASSIGNED", "Trip assigned successfully");
        });

        btnDetailMarkCollected.setOnClickListener(v -> {
            dialog.dismiss();
            updateBookingStatus(appointmentId, "SAMPLE_COLLECTED", "Sample marked as collected");
        });

        btnDetailMarkCompleted.setOnClickListener(v -> {
            dialog.dismiss();
            updateBookingStatus(appointmentId, "COMPLETED", "Visit completed and closed");
        });

        btnDetailCancelBooking.setOnClickListener(v -> {
            new AlertDialog.Builder(this)
                    .setTitle("Cancel Booking")
                    .setMessage("Are you sure you want to cancel this online booking? This cannot be undone.")
                    .setPositiveButton("Yes, Cancel", (d, which) -> {
                        dialog.dismiss();
                        updateBookingStatus(appointmentId, "CANCELLED", "Booking cancelled");
                    })
                    .setNegativeButton("No", null)
                    .show();
        });

        dialog.show();
    }

    private void rescheduleBooking(String appointmentId, String newIsoDate) {
        progressBookings.setVisibility(View.VISIBLE);
        new Thread(() -> {
            try {
                String token = getAuthToken();
                URL url = new URL(BASE_URL + "/api/workspace/appointments/online");
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("PATCH");
                conn.setRequestProperty("Content-Type", "application/json");
                conn.setRequestProperty("Authorization", "Bearer " + token);
                conn.setRequestProperty("Cookie", "token=" + token);
                conn.setDoOutput(true);

                JSONObject body = new JSONObject();
                body.put("appointmentId", appointmentId);
                body.put("appointmentDate", newIsoDate);
                body.put("status", "SCHEDULED");

                OutputStream os = conn.getOutputStream();
                os.write(body.toString().getBytes(StandardCharsets.UTF_8));
                os.flush();
                os.close();

                int code = conn.getResponseCode();
                if (code >= 200 && code < 300) {
                    mainHandler.post(() -> {
                        Toast.makeText(this, "Booking rescheduled successfully", Toast.LENGTH_SHORT).show();
                        loadBookingsData(false);
                    });
                } else {
                    mainHandler.post(() -> {
                        progressBookings.setVisibility(View.GONE);
                        Toast.makeText(this, "Reschedule failed (" + code + ")", Toast.LENGTH_SHORT).show();
                    });
                }
                conn.disconnect();
            } catch (Exception e) {
                mainHandler.post(() -> {
                    progressBookings.setVisibility(View.GONE);
                    Toast.makeText(this, "Error: " + e.getMessage(), Toast.LENGTH_SHORT).show();
                });
            }
        }).start();
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  CREATE BOOKING SHEET
    // ─────────────────────────────────────────────────────────────────────────
    private void showCreateBookingSheet() {
        BottomSheetDialog dialog = new BottomSheetDialog(this);
        View sheet = LayoutInflater.from(this).inflate(R.layout.layout_create_online_booking_sheet, null);
        dialog.setContentView(sheet);

        BottomSheetBehavior<View> behavior = BottomSheetBehavior.from((View) sheet.getParent());
        behavior.setState(BottomSheetBehavior.STATE_EXPANDED);
        behavior.setSkipCollapsed(true);

        ImageView btnCreateBookingClose = sheet.findViewById(R.id.btnCreateBookingClose);
        btnCreateBookingClose.setOnClickListener(v -> dialog.dismiss());

        EditText inputCreatePatientName = sheet.findViewById(R.id.inputCreatePatientName);
        EditText inputCreatePatientPhone = sheet.findViewById(R.id.inputCreatePatientPhone);
        EditText inputCreatePatientAge = sheet.findViewById(R.id.inputCreatePatientAge);
        EditText inputCreatePatientEmail = sheet.findViewById(R.id.inputCreatePatientEmail);

        TextView chipGenderMale = sheet.findViewById(R.id.chipGenderMale);
        TextView chipGenderFemale = sheet.findViewById(R.id.chipGenderFemale);
        TextView chipGenderOther = sheet.findViewById(R.id.chipGenderOther);

        TextView btnTypeHomeCollection = sheet.findViewById(R.id.btnTypeHomeCollection);
        TextView btnTypeLabVisit = sheet.findViewById(R.id.btnTypeLabVisit);
        LinearLayout containerCreateAddress = sheet.findViewById(R.id.containerCreateAddress);
        EditText inputCreateAddress = sheet.findViewById(R.id.inputCreateAddress);
        EditText inputCreatePincode = sheet.findViewById(R.id.inputCreatePincode);

        LinearLayout btnPickScheduledDate = sheet.findViewById(R.id.btnPickScheduledDate);
        TextView lblSelectedScheduledDate = sheet.findViewById(R.id.lblSelectedScheduledDate);

        TextView btnSlot1 = sheet.findViewById(R.id.btnSlot1);
        TextView btnSlot2 = sheet.findViewById(R.id.btnSlot2);
        TextView btnSlot3 = sheet.findViewById(R.id.btnSlot3);
        TextView btnSlot4 = sheet.findViewById(R.id.btnSlot4);
        TextView btnSlot5 = sheet.findViewById(R.id.btnSlot5);

        TextView lblSelectedTestsSummary = sheet.findViewById(R.id.lblSelectedTestsSummary);
        EditText inputSearchTestCatalog = sheet.findViewById(R.id.inputSearchTestCatalog);
        RecyclerView recyclerCreateTestCatalog = sheet.findViewById(R.id.recyclerCreateTestCatalog);
        ProgressBar progressCatalogLoading = sheet.findViewById(R.id.progressCatalogLoading);

        EditText inputCreateNotes = sheet.findViewById(R.id.inputCreateNotes);
        TextView lblCreateGrandTotal = sheet.findViewById(R.id.lblCreateGrandTotal);
        Button btnConfirmCreateBooking = sheet.findViewById(R.id.btnConfirmCreateBooking);
        ProgressBar progressCreateBooking = sheet.findViewById(R.id.progressCreateBooking);

        // State variables inside sheet
        final String[] selectedGender = {"MALE"};
        final String[] selectedMode = {"HOME_COLLECTION"};
        final Calendar selectedDateCal = Calendar.getInstance();
        SimpleDateFormat displayDateFormat = new SimpleDateFormat("EEE, dd MMM yyyy", Locale.getDefault());
        lblSelectedScheduledDate.setText(displayDateFormat.format(selectedDateCal.getTime()));
        final String[] selectedTimeSlot = {"07:00 AM - 09:00 AM"};
        final List<JSONObject> selectedTests = new ArrayList<>();
        final List<JSONObject> filteredCatalog = new ArrayList<>();

        // Gender toggling
        View.OnClickListener genderListener = v -> {
            chipGenderMale.setBackgroundResource(R.drawable.bg_chip_inactive);
            chipGenderMale.setTextColor(0xFF64748B);
            chipGenderFemale.setBackgroundResource(R.drawable.bg_chip_inactive);
            chipGenderFemale.setTextColor(0xFF64748B);
            chipGenderOther.setBackgroundResource(R.drawable.bg_chip_inactive);
            chipGenderOther.setTextColor(0xFF64748B);

            if (v.getId() == R.id.chipGenderMale) {
                selectedGender[0] = "MALE";
                chipGenderMale.setBackgroundResource(R.drawable.bg_chip_active);
                chipGenderMale.setTextColor(0xFFFFFFFF);
            } else if (v.getId() == R.id.chipGenderFemale) {
                selectedGender[0] = "FEMALE";
                chipGenderFemale.setBackgroundResource(R.drawable.bg_chip_active);
                chipGenderFemale.setTextColor(0xFFFFFFFF);
            } else {
                selectedGender[0] = "OTHER";
                chipGenderOther.setBackgroundResource(R.drawable.bg_chip_active);
                chipGenderOther.setTextColor(0xFFFFFFFF);
            }
        };
        chipGenderMale.setOnClickListener(genderListener);
        chipGenderFemale.setOnClickListener(genderListener);
        chipGenderOther.setOnClickListener(genderListener);

        // Collection Mode toggling
        btnTypeHomeCollection.setOnClickListener(v -> {
            selectedMode[0] = "HOME_COLLECTION";
            btnTypeHomeCollection.setBackgroundResource(R.drawable.bg_btn_primary);
            btnTypeHomeCollection.setTextColor(0xFFFFFFFF);
            btnTypeLabVisit.setBackgroundResource(R.drawable.bg_input_field);
            btnTypeLabVisit.setTextColor(0xFF64748B);
            containerCreateAddress.setVisibility(View.VISIBLE);
        });

        btnTypeLabVisit.setOnClickListener(v -> {
            selectedMode[0] = "LAB_VISIT";
            btnTypeLabVisit.setBackgroundResource(R.drawable.bg_btn_primary);
            btnTypeLabVisit.setTextColor(0xFFFFFFFF);
            btnTypeHomeCollection.setBackgroundResource(R.drawable.bg_input_field);
            btnTypeHomeCollection.setTextColor(0xFF64748B);
            containerCreateAddress.setVisibility(View.GONE);
        });

        // Date Picker
        btnPickScheduledDate.setOnClickListener(v -> {
            new DatePickerDialog(this, (view, year, month, dayOfMonth) -> {
                selectedDateCal.set(year, month, dayOfMonth);
                lblSelectedScheduledDate.setText(displayDateFormat.format(selectedDateCal.getTime()));
            }, selectedDateCal.get(Calendar.YEAR), selectedDateCal.get(Calendar.MONTH), selectedDateCal.get(Calendar.DAY_OF_MONTH)).show();
        });

        // Time Slot selection
        TextView[] slots = {btnSlot1, btnSlot2, btnSlot3, btnSlot4, btnSlot5};
        for (TextView slotBtn : slots) {
            slotBtn.setOnClickListener(v -> {
                for (TextView s : slots) {
                    s.setBackgroundResource(R.drawable.bg_chip_inactive);
                    s.setTextColor(0xFF64748B);
                }
                slotBtn.setBackgroundResource(R.drawable.bg_chip_active);
                slotBtn.setTextColor(0xFFFFFFFF);
                selectedTimeSlot[0] = slotBtn.getText().toString();
            });
        }

        // Test Catalog Adapter
        TestCatalogSelectAdapter catalogAdapter = new TestCatalogSelectAdapter(filteredCatalog, selectedTests, (test, isChecked) -> {
            if (isChecked) {
                selectedTests.add(test);
            } else {
                selectedTests.remove(test);
            }

            double sum = 0.0;
            for (JSONObject t : selectedTests) {
                sum += t.optDouble("price", 0.0);
            }
            lblSelectedTestsSummary.setText(selectedTests.size() + " selected");
            lblCreateGrandTotal.setText("₹" + String.format(Locale.getDefault(), "%,.0f", sum));
        });

        recyclerCreateTestCatalog.setLayoutManager(new LinearLayoutManager(this));
        recyclerCreateTestCatalog.setAdapter(catalogAdapter);

        // Fetch Test Catalog from API
        progressCatalogLoading.setVisibility(View.VISIBLE);
        new Thread(() -> {
            try {
                String token = getAuthToken();
                URL url = new URL(BASE_URL + "/api/workspace/test-catalog");
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("GET");
                conn.setRequestProperty("Authorization", "Bearer " + token);
                conn.setRequestProperty("Cookie", "token=" + token);
                conn.setRequestProperty("Accept", "application/json");

                int code = conn.getResponseCode();
                if (code >= 200 && code < 300) {
                    String jsonString = readStream(conn.getInputStream());
                    JSONObject resObj = new JSONObject(jsonString);
                    JSONArray testsArr = resObj.optJSONArray("tests");

                    final List<JSONObject> fetched = new ArrayList<>();
                    if (testsArr != null) {
                        for (int i = 0; i < testsArr.length(); i++) {
                            fetched.add(testsArr.getJSONObject(i));
                        }
                    }

                    mainHandler.post(() -> {
                        progressCatalogLoading.setVisibility(View.GONE);
                        testCatalog.clear();
                        testCatalog.addAll(fetched);
                        filteredCatalog.clear();
                        filteredCatalog.addAll(fetched);
                        catalogAdapter.notifyDataSetChanged();
                    });
                } else {
                    mainHandler.post(() -> progressCatalogLoading.setVisibility(View.GONE));
                }
                conn.disconnect();
            } catch (Exception e) {
                mainHandler.post(() -> progressCatalogLoading.setVisibility(View.GONE));
            }
        }).start();

        // Search Test Catalog
        inputSearchTestCatalog.addTextChangedListener(new TextWatcher() {
            @Override
            public void beforeTextChanged(CharSequence s, int start, int count, int after) {}

            @Override
            public void onTextChanged(CharSequence s, int start, int before, int count) {
                String q = s.toString().trim().toLowerCase(Locale.ROOT);
                filteredCatalog.clear();
                for (JSONObject t : testCatalog) {
                    String tName = t.optString("name", "").toLowerCase(Locale.ROOT);
                    String tCode = t.optString("code", "").toLowerCase(Locale.ROOT);
                    if (tName.contains(q) || tCode.contains(q)) {
                        filteredCatalog.add(t);
                    }
                }
                catalogAdapter.notifyDataSetChanged();
            }

            @Override
            public void afterTextChanged(Editable s) {}
        });

        // Submit Booking Button
        btnConfirmCreateBooking.setOnClickListener(v -> {
            String name = inputCreatePatientName.getText().toString().trim();
            String phone = inputCreatePatientPhone.getText().toString().trim();
            String ageStr = inputCreatePatientAge.getText().toString().trim();
            String email = inputCreatePatientEmail.getText().toString().trim();
            String address = inputCreateAddress.getText().toString().trim();
            String pincode = inputCreatePincode.getText().toString().trim();
            String notes = inputCreateNotes.getText().toString().trim();

            if (name.isEmpty()) {
                inputCreatePatientName.setError("Patient name is required");
                inputCreatePatientName.requestFocus();
                return;
            }

            if (phone.length() < 10) {
                inputCreatePatientPhone.setError("Enter a valid 10-digit phone number");
                inputCreatePatientPhone.requestFocus();
                return;
            }

            if ("HOME_COLLECTION".equals(selectedMode[0]) && address.isEmpty()) {
                inputCreateAddress.setError("Collection address is required for Home Collection");
                inputCreateAddress.requestFocus();
                return;
            }

            if (selectedTests.isEmpty()) {
                Toast.makeText(this, "Please select at least one test", Toast.LENGTH_SHORT).show();
                return;
            }

            btnConfirmCreateBooking.setEnabled(false);
            progressCreateBooking.setVisibility(View.VISIBLE);

            new Thread(() -> {
                try {
                    String token = getAuthToken();
                    URL url = new URL(BASE_URL + "/api/workspace/appointments/online");
                    HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                    conn.setRequestMethod("POST");
                    conn.setRequestProperty("Content-Type", "application/json");
                    conn.setRequestProperty("Authorization", "Bearer " + token);
                    conn.setRequestProperty("Cookie", "token=" + token);
                    conn.setDoOutput(true);

                    SimpleDateFormat isoFormat = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
                    String scheduledIso = isoFormat.format(selectedDateCal.getTime());

                    JSONArray testIdsArr = new JSONArray();
                    for (JSONObject t : selectedTests) {
                        testIdsArr.put(t.optString("id"));
                    }

                    JSONObject body = new JSONObject();
                    body.put("name", name);
                    body.put("phone", phone);
                    if (!email.isEmpty()) body.put("email", email);
                    if (!ageStr.isEmpty()) body.put("age", Integer.parseInt(ageStr));
                    body.put("gender", selectedGender[0]);
                    body.put("collectionType", selectedMode[0]);
                    body.put("address", address);
                    body.put("pincode", pincode);
                    body.put("scheduledDate", scheduledIso);
                    body.put("timeSlot", selectedTimeSlot[0]);
                    body.put("notes", notes);
                    body.put("testIds", testIdsArr);

                    OutputStream os = conn.getOutputStream();
                    os.write(body.toString().getBytes(StandardCharsets.UTF_8));
                    os.flush();
                    os.close();

                    int code = conn.getResponseCode();
                    if (code >= 200 && code < 300) {
                        mainHandler.post(() -> {
                            dialog.dismiss();
                            Toast.makeText(this, "Booking confirmed & created successfully!", Toast.LENGTH_LONG).show();
                            loadBookingsData(false);
                        });
                    } else {
                        String errStr = readStream(conn.getErrorStream());
                        mainHandler.post(() -> {
                            btnConfirmCreateBooking.setEnabled(true);
                            progressCreateBooking.setVisibility(View.GONE);
                            Toast.makeText(this, "Creation failed: " + errStr, Toast.LENGTH_SHORT).show();
                        });
                    }
                    conn.disconnect();
                } catch (Exception e) {
                    mainHandler.post(() -> {
                        btnConfirmCreateBooking.setEnabled(true);
                        progressCreateBooking.setVisibility(View.GONE);
                        Toast.makeText(this, "Error: " + e.getMessage(), Toast.LENGTH_SHORT).show();
                    });
                }
            }).start();
        });

        dialog.show();
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  PORTAL SETTINGS SHEET
    // ─────────────────────────────────────────────────────────────────────────
    private void showPortalSettingsSheet() {
        BottomSheetDialog dialog = new BottomSheetDialog(this);
        View sheet = LayoutInflater.from(this).inflate(R.layout.layout_portal_settings_sheet, null);
        dialog.setContentView(sheet);

        ImageView btnPortalClose = sheet.findViewById(R.id.btnPortalClose);
        btnPortalClose.setOnClickListener(v -> dialog.dismiss());

        SwitchCompat switchPortalStatus = sheet.findViewById(R.id.switchPortalStatus);
        TextView lblPortalSwitchTitle = sheet.findViewById(R.id.lblPortalSwitchTitle);
        LinearLayout containerPortalConfig = sheet.findViewById(R.id.containerPortalConfig);
        EditText inputPortalSlugField = sheet.findViewById(R.id.inputPortalSlugField);

        Button btnCopyPortalLink = sheet.findViewById(R.id.btnCopyPortalLink);
        Button btnSharePortalLink = sheet.findViewById(R.id.btnSharePortalLink);
        Button btnVisitPortalLink = sheet.findViewById(R.id.btnVisitPortalLink);

        Button btnSavePortalConfig = sheet.findViewById(R.id.btnSavePortalConfig);
        ProgressBar progressSavePortal = sheet.findViewById(R.id.progressSavePortal);

        // Pre-fill
        switchPortalStatus.setChecked(isPortalLive);
        inputPortalSlugField.setText(portalSlug != null ? portalSlug : "");
        lblPortalSwitchTitle.setText(isPortalLive ? "Portal is Enabled" : "Portal is Disabled");

        switchPortalStatus.setOnCheckedChangeListener((buttonView, isChecked) -> {
            lblPortalSwitchTitle.setText(isChecked ? "Portal is Enabled" : "Portal is Disabled");
        });

        btnCopyPortalLink.setOnClickListener(v -> {
            String slug = inputPortalSlugField.getText().toString().trim();
            if (!slug.isEmpty()) {
                String fullUrl = "https://app.patholab.cloud/book/" + slug;
                ClipboardManager clipboard = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
                ClipData clip = ClipData.newPlainText("Portal Link", fullUrl);
                if (clipboard != null) {
                    clipboard.setPrimaryClip(clip);
                    Toast.makeText(this, "Portal URL copied to clipboard!", Toast.LENGTH_SHORT).show();
                }
            } else {
                Toast.makeText(this, "Please enter a portal URL slug", Toast.LENGTH_SHORT).show();
            }
        });

        btnSharePortalLink.setOnClickListener(v -> {
            String slug = inputPortalSlugField.getText().toString().trim();
            if (!slug.isEmpty()) {
                String fullUrl = "https://app.patholab.cloud/book/" + slug;
                String message = "Hello! You can now book diagnostic tests and home sample collection online directly with us:\n" + fullUrl;
                try {
                    Intent intent = new Intent(Intent.ACTION_VIEW);
                    intent.setData(Uri.parse("https://api.whatsapp.com/send?text=" + Uri.encode(message)));
                    startActivity(intent);
                } catch (Exception e) {
                    Intent sendIntent = new Intent(Intent.ACTION_SEND);
                    sendIntent.putExtra(Intent.EXTRA_TEXT, message);
                    sendIntent.setType("text/plain");
                    startActivity(Intent.createChooser(sendIntent, "Share Public Portal"));
                }
            } else {
                Toast.makeText(this, "Please enter a portal URL slug", Toast.LENGTH_SHORT).show();
            }
        });

        btnVisitPortalLink.setOnClickListener(v -> {
            String slug = inputPortalSlugField.getText().toString().trim();
            if (!slug.isEmpty()) {
                String fullUrl = "https://app.patholab.cloud/book/" + slug;
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(fullUrl)));
                } catch (Exception e) {
                    Toast.makeText(this, "Could not open browser", Toast.LENGTH_SHORT).show();
                }
            }
        });

        btnSavePortalConfig.setOnClickListener(v -> {
            boolean active = switchPortalStatus.isChecked();
            String slug = inputPortalSlugField.getText().toString().trim().toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9-]", "");

            if (active && slug.isEmpty()) {
                inputPortalSlugField.setError("Please choose a unique URL slug for your lab");
                inputPortalSlugField.requestFocus();
                return;
            }

            btnSavePortalConfig.setEnabled(false);
            progressSavePortal.setVisibility(View.VISIBLE);

            new Thread(() -> {
                try {
                    String token = getAuthToken();
                    URL url = new URL(BASE_URL + "/api/workspace/settings/portal");
                    HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                    conn.setRequestMethod("PATCH");
                    conn.setRequestProperty("Content-Type", "application/json");
                    conn.setRequestProperty("Authorization", "Bearer " + token);
                    conn.setRequestProperty("Cookie", "token=" + token);
                    conn.setDoOutput(true);

                    JSONObject body = new JSONObject();
                    body.put("portalSlug", active ? slug : JSONObject.NULL);

                    OutputStream os = conn.getOutputStream();
                    os.write(body.toString().getBytes(StandardCharsets.UTF_8));
                    os.flush();
                    os.close();

                    int code = conn.getResponseCode();
                    if (code >= 200 && code < 300) {
                        mainHandler.post(() -> {
                            dialog.dismiss();
                            Toast.makeText(this, active ? "Portal is LIVE!" : "Portal disabled", Toast.LENGTH_SHORT).show();
                            loadBookingsData(false);
                        });
                    } else {
                        String err = readStream(conn.getErrorStream());
                        mainHandler.post(() -> {
                            btnSavePortalConfig.setEnabled(true);
                            progressSavePortal.setVisibility(View.GONE);
                            Toast.makeText(this, "Save failed: " + err, Toast.LENGTH_SHORT).show();
                        });
                    }
                    conn.disconnect();
                } catch (Exception e) {
                    mainHandler.post(() -> {
                        btnSavePortalConfig.setEnabled(true);
                        progressSavePortal.setVisibility(View.GONE);
                        Toast.makeText(this, "Error: " + e.getMessage(), Toast.LENGTH_SHORT).show();
                    });
                }
            }).start();
        });

        dialog.show();
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  UI FORMATTING HELPERS
    // ─────────────────────────────────────────────────────────────────────────
    private void formatStatusBadge(TextView badge, String status) {
        String clean = status.replace("_", " ").toUpperCase(Locale.ROOT);
        badge.setText(clean);

        switch (status) {
            case "SCHEDULED":
                badge.setTextColor(0xFF1D4ED8);
                badge.setBackgroundResource(R.drawable.bg_status_scheduled);
                break;
            case "ASSIGNED":
                badge.setTextColor(0xFF4F46E5);
                badge.setBackgroundResource(R.drawable.bg_status_assigned);
                break;
            case "SAMPLE_COLLECTED":
                badge.setTextColor(0xFF059669);
                badge.setBackgroundResource(R.drawable.bg_status_sample_collected);
                break;
            case "COMPLETED":
                badge.setTextColor(0xFF0284C7);
                badge.setBackgroundResource(R.drawable.bg_status_completed);
                break;
            case "CANCELLED":
                badge.setTextColor(0xFFE11D48);
                badge.setBackgroundResource(R.drawable.bg_status_cancelled);
                break;
            default:
                badge.setTextColor(0xFF64748B);
                badge.setBackgroundResource(R.drawable.bg_status_scheduled);
                break;
        }
    }

    private String formatDateHuman(String iso) {
        if (iso == null || iso.isEmpty()) return "Date N/A";
        try {
            SimpleDateFormat inFmt = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.US);
            Date d = inFmt.parse(iso.length() > 19 ? iso.substring(0, 19) : iso);
            if (d != null) {
                SimpleDateFormat outFmt = new SimpleDateFormat("dd MMM yyyy", Locale.getDefault());
                return outFmt.format(d);
            }
        } catch (Exception ignored) {}
        return iso.length() > 10 ? iso.substring(0, 10) : iso;
    }

    private int dpToPx(int dp) {
        return (int) (dp * getResources().getDisplayMetrics().density);
    }

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
        if (is == null) return "";
        BufferedReader r = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8));
        StringBuilder sb = new StringBuilder();
        String l;
        while ((l = r.readLine()) != null) sb.append(l);
        return sb.toString();
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  RECYCLERVIEW ADAPTER FOR BOOKINGS
    // ─────────────────────────────────────────────────────────────────────────
    interface BookingActionListener {
        void onItemClicked(JSONObject booking);
        void onCallClicked(String phone);
        void onWhatsAppClicked(String phone);
        void onPrimaryActionClicked(JSONObject booking);
    }

    class BookingsAdapter extends RecyclerView.Adapter<BookingsAdapter.BookingViewHolder> {
        private final List<JSONObject> items;
        private final BookingActionListener listener;

        BookingsAdapter(List<JSONObject> items, BookingActionListener listener) {
            this.items = items;
            this.listener = listener;
        }

        @NonNull
        @Override
        public BookingViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
            View view = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_online_booking_card, parent, false);
            return new BookingViewHolder(view);
        }

        @Override
        public void onBindViewHolder(@NonNull BookingViewHolder holder, int position) {
            JSONObject booking = items.get(position);
            holder.bind(booking, listener);
        }

        @Override
        public int getItemCount() {
            return items.size();
        }

        class BookingViewHolder extends RecyclerView.ViewHolder {
            private final TextView lblItemBookingUhid;
            private final TextView lblItemBookingMode;
            private final TextView lblItemBookingStatus;
            private final TextView lblItemPatientName;
            private final TextView lblItemPatientAgeGender;
            private final TextView lblItemScheduleDate;
            private final TextView lblItemScheduleSlot;
            private final LinearLayout containerItemAddress;
            private final TextView lblItemAddress;
            private final TextView lblItemTestsList;
            private final TextView lblItemGrandTotal;
            private final TextView lblItemPaymentStatus;
            private final FrameLayout btnItemCall;
            private final FrameLayout btnItemWhatsApp;
            private final Button btnItemPrimaryAction;

            BookingViewHolder(@NonNull View itemView) {
                super(itemView);
                lblItemBookingUhid = itemView.findViewById(R.id.lblItemBookingUhid);
                lblItemBookingMode = itemView.findViewById(R.id.lblItemBookingMode);
                lblItemBookingStatus = itemView.findViewById(R.id.lblItemBookingStatus);
                lblItemPatientName = itemView.findViewById(R.id.lblItemPatientName);
                lblItemPatientAgeGender = itemView.findViewById(R.id.lblItemPatientAgeGender);
                lblItemScheduleDate = itemView.findViewById(R.id.lblItemScheduleDate);
                lblItemScheduleSlot = itemView.findViewById(R.id.lblItemScheduleSlot);
                containerItemAddress = itemView.findViewById(R.id.containerItemAddress);
                lblItemAddress = itemView.findViewById(R.id.lblItemAddress);
                lblItemTestsList = itemView.findViewById(R.id.lblItemTestsList);
                lblItemGrandTotal = itemView.findViewById(R.id.lblItemGrandTotal);
                lblItemPaymentStatus = itemView.findViewById(R.id.lblItemPaymentStatus);
                btnItemCall = itemView.findViewById(R.id.btnItemCall);
                btnItemWhatsApp = itemView.findViewById(R.id.btnItemWhatsApp);
                btnItemPrimaryAction = itemView.findViewById(R.id.btnItemPrimaryAction);
            }

            void bind(JSONObject booking, BookingActionListener listener) {
                JSONObject patient = booking.optJSONObject("patient");
                String name = patient != null ? patient.optString("name", "Unknown") : "Unknown";
                String phone = patient != null ? patient.optString("phone", "") : "";
                String uhid = patient != null ? patient.optString("patientId", "PAT-NA") : "PAT-NA";
                int age = patient != null ? patient.optInt("age", 0) : 0;
                String gender = patient != null ? patient.optString("gender", "MALE") : "MALE";

                lblItemPatientName.setText(name);
                lblItemBookingUhid.setText(uhid);
                lblItemPatientAgeGender.setText((age > 0 ? (age + " Yrs • ") : "") + gender);

                // Mode
                String mode = booking.optString("collectionMode", "LAB_VISIT");
                if ("HOME_COLLECTION".equalsIgnoreCase(mode)) {
                    lblItemBookingMode.setText("Home Collection");
                    lblItemBookingMode.setTextColor(0xFF7C3AED);
                    lblItemBookingMode.setBackgroundResource(R.drawable.bg_mod_badge_home_collection);
                    containerItemAddress.setVisibility(View.VISIBLE);

                    String addr = booking.optString("collectionAddress", "");
                    String pin = booking.optString("pincode", "");
                    lblItemAddress.setText(addr + (pin.isEmpty() ? "" : (" • " + pin)));
                } else {
                    lblItemBookingMode.setText("Lab Visit");
                    lblItemBookingMode.setTextColor(0xFF475569);
                    lblItemBookingMode.setBackgroundResource(R.drawable.bg_mod_badge_lab_visit);
                    containerItemAddress.setVisibility(View.GONE);
                }

                // Status
                String status = booking.optString("status", "SCHEDULED");
                formatStatusBadge(lblItemBookingStatus, status);

                // Schedule
                String apptDate = booking.optString("appointmentDate", "");
                lblItemScheduleDate.setText(formatDateHuman(apptDate));
                lblItemScheduleSlot.setText(booking.optString("timeSlot", "Anytime"));

                // Tests
                JSONArray tests = booking.optJSONArray("tests");
                if (tests != null && tests.length() > 0) {
                    StringBuilder sb = new StringBuilder();
                    for (int i = 0; i < tests.length(); i++) {
                        JSONObject t = tests.optJSONObject(i);
                        if (t != null) {
                            if (i > 0) sb.append(", ");
                            sb.append(t.optString("testName", "Test"));
                        }
                    }
                    lblItemTestsList.setText(sb.toString());
                } else {
                    lblItemTestsList.setText("No tests listed");
                }

                // Invoicing
                JSONObject invoice = booking.optJSONObject("invoice");
                double grandTotal = invoice != null ? invoice.optDouble("grandTotal", 0.0) : 0.0;
                String payStatus = invoice != null ? invoice.optString("paymentStatus", "PENDING") : "PENDING";
                lblItemGrandTotal.setText("₹" + String.format(Locale.getDefault(), "%,.0f", grandTotal));

                if ("PAID".equalsIgnoreCase(payStatus)) {
                    lblItemPaymentStatus.setText("PAID ONLINE");
                    lblItemPaymentStatus.setTextColor(0xFF059669);
                } else {
                    lblItemPaymentStatus.setText("PAYMENT PENDING");
                    lblItemPaymentStatus.setTextColor(0xFFD97706);
                }

                // Primary Action Button text & visibility
                if ("SCHEDULED".equalsIgnoreCase(status)) {
                    btnItemPrimaryAction.setVisibility(View.VISIBLE);
                    if ("HOME_COLLECTION".equalsIgnoreCase(mode)) {
                        btnItemPrimaryAction.setText("Assign Trip");
                        btnItemPrimaryAction.setBackgroundTintList(ContextCompat.getColorStateList(itemView.getContext(), android.R.color.holo_purple));
                    } else {
                        btnItemPrimaryAction.setText("Collect Sample");
                        btnItemPrimaryAction.setBackgroundTintList(ContextCompat.getColorStateList(itemView.getContext(), android.R.color.holo_green_dark));
                    }
                } else {
                    btnItemPrimaryAction.setVisibility(View.GONE);
                }

                // Click Handlers
                itemView.setOnClickListener(v -> listener.onItemClicked(booking));
                btnItemCall.setOnClickListener(v -> listener.onCallClicked(phone));
                btnItemWhatsApp.setOnClickListener(v -> listener.onWhatsAppClicked(phone));
                btnItemPrimaryAction.setOnClickListener(v -> listener.onPrimaryActionClicked(booking));
            }
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  RECYCLERVIEW ADAPTER FOR TEST CATALOG SELECTOR
    // ─────────────────────────────────────────────────────────────────────────
    interface OnTestSelectToggleListener {
        void onToggle(JSONObject test, boolean isChecked);
    }

    class TestCatalogSelectAdapter extends RecyclerView.Adapter<TestCatalogSelectAdapter.TestViewHolder> {
        private final List<JSONObject> tests;
        private final List<JSONObject> selected;
        private final OnTestSelectToggleListener listener;

        TestCatalogSelectAdapter(List<JSONObject> tests, List<JSONObject> selected, OnTestSelectToggleListener listener) {
            this.tests = tests;
            this.selected = selected;
            this.listener = listener;
        }

        @NonNull
        @Override
        public TestViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
            View v = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_online_test_catalog_select, parent, false);
            return new TestViewHolder(v);
        }

        @Override
        public void onBindViewHolder(@NonNull TestViewHolder holder, int position) {
            JSONObject test = tests.get(position);
            holder.bind(test, selected.contains(test), listener);
        }

        @Override
        public int getItemCount() {
            return tests.size();
        }

        class TestViewHolder extends RecyclerView.ViewHolder {
            private final CheckBox checkSelectTest;
            private final TextView lblTestCatalogName;
            private final TextView lblTestCatalogCode;
            private final TextView lblTestCatalogPrice;

            TestViewHolder(@NonNull View itemView) {
                super(itemView);
                checkSelectTest = itemView.findViewById(R.id.checkSelectTest);
                lblTestCatalogName = itemView.findViewById(R.id.lblTestCatalogName);
                lblTestCatalogCode = itemView.findViewById(R.id.lblTestCatalogCode);
                lblTestCatalogPrice = itemView.findViewById(R.id.lblTestCatalogPrice);
            }

            void bind(JSONObject test, boolean isSelected, OnTestSelectToggleListener listener) {
                lblTestCatalogName.setText(test.optString("name", "Test"));
                String code = test.optString("code", "");
                String category = test.optString("category", "General");
                lblTestCatalogCode.setText((code.isEmpty() ? "" : ("CODE: " + code + " • ")) + category);
                lblTestCatalogPrice.setText("₹" + String.format(Locale.getDefault(), "%,.0f", test.optDouble("price", 0.0)));

                checkSelectTest.setChecked(isSelected);

                itemView.setOnClickListener(v -> {
                    boolean newState = !checkSelectTest.isChecked();
                    checkSelectTest.setChecked(newState);
                    listener.onToggle(test, newState);
                });
            }
        }
    }
}
