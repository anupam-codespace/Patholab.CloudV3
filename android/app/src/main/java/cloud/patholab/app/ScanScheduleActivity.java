package cloud.patholab.app;

import android.content.Context;
import android.content.SharedPreferences;
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
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

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
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

import cloud.patholab.app.auth.AuthManager;

/**
 * ScanScheduleActivity — Radiology Appointment / Scan Scheduler
 * Full parity with /workspace/radiology/dashboard/appointments
 * Lists scheduled scans with status, modality, time slot.
 * Supports booking a new scan, cancellation, and status transitions.
 */
public class ScanScheduleActivity extends AppCompatActivity {

    private static final String BASE_URL = "https://app.patholab.cloud";

    private FrameLayout btnBack, btnRefresh;
    private ImageView imgRefreshIcon;
    private TextView tabAll, tabToday, tabPending, tabCompleted;
    private EditText inputSearch;
    private ImageView btnClearSearch;
    private ProgressBar progressLoading;
    private RecyclerView recycler;
    private LinearLayout emptyState;
    private Button btnNewScan;

    private ScanScheduleAdapter adapter;
    private final List<JSONObject> allItems = new ArrayList<>();
    private final List<JSONObject> filtered = new ArrayList<>();
    private String activeTab = "ALL";
    private String searchQuery = "";
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_scan_schedule);
        initViews();
        setupListeners();
        setupRecycler();
        fetchSchedule(false);
    }

    private void initViews() {
        btnBack          = findViewById(R.id.btnScanScheduleBack);
        btnRefresh       = findViewById(R.id.btnScanScheduleRefresh);
        imgRefreshIcon   = findViewById(R.id.imgScanScheduleRefreshIcon);
        tabAll           = findViewById(R.id.tabScanAll);
        tabToday         = findViewById(R.id.tabScanToday);
        tabPending       = findViewById(R.id.tabScanPending);
        tabCompleted     = findViewById(R.id.tabScanCompleted);
        inputSearch      = findViewById(R.id.inputScanSearch);
        btnClearSearch   = findViewById(R.id.btnClearScanSearch);
        progressLoading  = findViewById(R.id.progressScanSchedule);
        recycler         = findViewById(R.id.recyclerScanSchedule);
        emptyState       = findViewById(R.id.emptyScanSchedule);
        btnNewScan       = findViewById(R.id.btnNewScanAppointment);
    }

    private void setupListeners() {
        btnBack.setOnClickListener(v -> finish());
        btnRefresh.setOnClickListener(v -> { animateRefresh(); fetchSchedule(true); });
        btnNewScan.setOnClickListener(v -> showNewScanSheet());

        View.OnClickListener tabListener = v -> {
            if (v.getId() == R.id.tabScanAll)       activeTab = "ALL";
            else if (v.getId() == R.id.tabScanToday)   activeTab = "TODAY";
            else if (v.getId() == R.id.tabScanPending)  activeTab = "PENDING";
            else activeTab = "COMPLETED";
            updateTabUi();
            applyFilter();
        };
        tabAll.setOnClickListener(tabListener);
        tabToday.setOnClickListener(tabListener);
        tabPending.setOnClickListener(tabListener);
        tabCompleted.setOnClickListener(tabListener);
        updateTabUi();

        inputSearch.addTextChangedListener(new TextWatcher() {
            @Override public void beforeTextChanged(CharSequence s, int st, int c, int a) {}
            @Override public void onTextChanged(CharSequence s, int st, int b, int c) {
                searchQuery = s.toString().trim().toLowerCase(Locale.ROOT);
                btnClearSearch.setVisibility(searchQuery.isEmpty() ? View.GONE : View.VISIBLE);
                applyFilter();
            }
            @Override public void afterTextChanged(Editable s) {}
        });
        btnClearSearch.setOnClickListener(v -> { inputSearch.setText(""); searchQuery = ""; applyFilter(); });
    }

    private void updateTabUi() {
        int active = 0xFF0D6EFD, inactive = 0xFF64748B;
        tabAll.setTextColor(activeTab.equals("ALL") ? active : inactive);
        tabAll.setBackgroundResource(activeTab.equals("ALL") ? R.drawable.bg_tab_pill_active : R.drawable.bg_tab_pill_inactive);
        tabToday.setTextColor(activeTab.equals("TODAY") ? active : inactive);
        tabToday.setBackgroundResource(activeTab.equals("TODAY") ? R.drawable.bg_tab_pill_active : R.drawable.bg_tab_pill_inactive);
        tabPending.setTextColor(activeTab.equals("PENDING") ? active : inactive);
        tabPending.setBackgroundResource(activeTab.equals("PENDING") ? R.drawable.bg_tab_pill_active : R.drawable.bg_tab_pill_inactive);
        tabCompleted.setTextColor(activeTab.equals("COMPLETED") ? active : inactive);
        tabCompleted.setBackgroundResource(activeTab.equals("COMPLETED") ? R.drawable.bg_tab_pill_active : R.drawable.bg_tab_pill_inactive);
    }

    private void setupRecycler() {
        adapter = new ScanScheduleAdapter(filtered, this::showScanActions);
        recycler.setLayoutManager(new LinearLayoutManager(this));
        recycler.setAdapter(adapter);
    }

    private void animateRefresh() {
        if (imgRefreshIcon == null) return;
        RotateAnimation r = new RotateAnimation(0, 360, Animation.RELATIVE_TO_SELF, 0.5f, Animation.RELATIVE_TO_SELF, 0.5f);
        r.setDuration(600); r.setRepeatCount(1);
        imgRefreshIcon.startAnimation(r);
    }

    private void fetchSchedule(boolean manual) {
        progressLoading.setVisibility(View.VISIBLE);
        new Thread(() -> {
            try {
                String token = getToken();
                URL url = new URL(BASE_URL + "/api/workspace/radiology/appointments");
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("GET");
                conn.setRequestProperty("Authorization", "Bearer " + token);
                conn.setRequestProperty("Cookie", "token=" + token);
                conn.setRequestProperty("Accept", "application/json");
                conn.setConnectTimeout(10000); conn.setReadTimeout(15000);

                int code = conn.getResponseCode();
                if (code >= 200 && code < 300) {
                    String body = read(conn.getInputStream()).trim();
                    JSONArray arr;
                    if (body.startsWith("[")) {
                        arr = new JSONArray(body);
                    } else {
                        JSONObject res = new JSONObject(body);
                        arr = res.has("appointments") ? res.optJSONArray("appointments") :
                                (res.has("data") ? res.optJSONArray("data") : null);
                    }
                    final List<JSONObject> fetched = new ArrayList<>();
                    if (arr != null) for (int i = 0; i < arr.length(); i++) fetched.add(arr.getJSONObject(i));

                    mainHandler.post(() -> {
                        progressLoading.setVisibility(View.GONE);
                        allItems.clear(); allItems.addAll(fetched);
                        applyFilter();
                        if (manual) Toast.makeText(this, "Schedule refreshed", Toast.LENGTH_SHORT).show();
                    });
                } else {
                    mainHandler.post(() -> { progressLoading.setVisibility(View.GONE); showEmpty(); });
                }
                conn.disconnect();
            } catch (Exception e) {
                mainHandler.post(() -> { progressLoading.setVisibility(View.GONE); showEmpty();
                    Toast.makeText(this, "Error: " + e.getMessage(), Toast.LENGTH_SHORT).show(); });
            }
        }).start();
    }

    private void applyFilter() {
        filtered.clear();
        String today = new java.text.SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(new java.util.Date());
        for (JSONObject item : allItems) {
            String status = item.optString("status", "PENDING").toUpperCase(Locale.ROOT);
            String date = item.optString("date", item.optString("scheduledDate", ""));
            String patient = item.optString("patientName", "").toLowerCase(Locale.ROOT);
            String modality = item.optString("modality", "").toLowerCase(Locale.ROOT);

            boolean tabMatch = activeTab.equals("ALL")
                    || (activeTab.equals("TODAY") && date.startsWith(today))
                    || (activeTab.equals("PENDING") && (status.equals("PENDING") || status.equals("SCHEDULED")))
                    || (activeTab.equals("COMPLETED") && status.equals("COMPLETED"));
            boolean searchMatch = searchQuery.isEmpty() || patient.contains(searchQuery) || modality.contains(searchQuery);
            if (tabMatch && searchMatch) filtered.add(item);
        }
        adapter.notifyDataSetChanged();
        boolean empty = filtered.isEmpty();
        emptyState.setVisibility(empty ? View.VISIBLE : View.GONE);
        recycler.setVisibility(empty ? View.GONE : View.VISIBLE);
    }

    private void showEmpty() {
        emptyState.setVisibility(View.VISIBLE);
        recycler.setVisibility(View.GONE);
    }

    private void showScanActions(JSONObject scan) {
        String name = scan.optString("patientName", "Patient");
        String status = scan.optString("status", "PENDING");
        String scanId = scan.optString("id", "");

        android.app.AlertDialog.Builder dlg = new android.app.AlertDialog.Builder(this);
        dlg.setTitle(name);
        dlg.setItems(new String[]{"Mark In Progress", "Mark Completed", "Cancel Appointment"}, (d, which) -> {
            String[] statuses = {"IN_PROGRESS", "COMPLETED", "CANCELLED"};
            updateScanStatus(scanId, statuses[which]);
        });
        dlg.setNegativeButton("Close", null);
        dlg.show();
    }

    private void updateScanStatus(String scanId, String newStatus) {
        new Thread(() -> {
            try {
                String token = getToken();
                URL url = new URL(BASE_URL + "/api/workspace/radiology/appointments/" + scanId);
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("PATCH");
                conn.setRequestProperty("Authorization", "Bearer " + token);
                conn.setRequestProperty("Cookie", "token=" + token);
                conn.setRequestProperty("Content-Type", "application/json");
                conn.setDoOutput(true);
                JSONObject payload = new JSONObject();
                payload.put("status", newStatus);
                OutputStream os = conn.getOutputStream();
                os.write(payload.toString().getBytes(StandardCharsets.UTF_8));
                os.close();
                int code = conn.getResponseCode();
                mainHandler.post(() -> {
                    if (code >= 200 && code < 300) { fetchSchedule(false); Toast.makeText(this, "Status updated", Toast.LENGTH_SHORT).show(); }
                    else Toast.makeText(this, "Update failed (" + code + ")", Toast.LENGTH_SHORT).show();
                });
                conn.disconnect();
            } catch (Exception e) {
                mainHandler.post(() -> Toast.makeText(this, "Error: " + e.getMessage(), Toast.LENGTH_SHORT).show());
            }
        }).start();
    }

    private void showNewScanSheet() {
        BottomSheetDialog sheet = new BottomSheetDialog(this);
        View v = LayoutInflater.from(this).inflate(R.layout.layout_new_scan_sheet, null);
        sheet.setContentView(v);

        EditText inputPatient  = v.findViewById(R.id.inputNewScanPatient);
        EditText inputUhid     = v.findViewById(R.id.inputNewScanUhid);
        EditText inputModality = v.findViewById(R.id.inputNewScanModality);
        EditText inputDate     = v.findViewById(R.id.inputNewScanDate);
        EditText inputTime     = v.findViewById(R.id.inputNewScanTime);
        EditText inputDoctor   = v.findViewById(R.id.inputNewScanDoctor);
        EditText inputNotes    = v.findViewById(R.id.inputNewScanNotes);
        Button btnBook         = v.findViewById(R.id.btnBookScan);
        ProgressBar progressBook = v.findViewById(R.id.progressBookScan);
        TextView lblError      = v.findViewById(R.id.lblNewScanError);
        v.findViewById(R.id.btnNewScanClose).setOnClickListener(x -> sheet.dismiss());

        btnBook.setOnClickListener(x -> {
            String patient  = inputPatient.getText().toString().trim();
            String uhid     = inputUhid.getText().toString().trim();
            String modality = inputModality.getText().toString().trim();
            String date     = inputDate.getText().toString().trim();
            String time     = inputTime.getText().toString().trim();

            if (patient.isEmpty() || modality.isEmpty() || date.isEmpty()) {
                lblError.setText("Patient name, modality and date are required.");
                lblError.setVisibility(View.VISIBLE); return;
            }
            lblError.setVisibility(View.GONE);
            btnBook.setEnabled(false); btnBook.setText("");
            progressBook.setVisibility(View.VISIBLE);

            new Thread(() -> {
                try {
                    String token = getToken();
                    URL url = new URL(BASE_URL + "/api/workspace/radiology/appointments");
                    HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                    conn.setRequestMethod("POST");
                    conn.setRequestProperty("Authorization", "Bearer " + token);
                    conn.setRequestProperty("Cookie", "token=" + token);
                    conn.setRequestProperty("Content-Type", "application/json");
                    conn.setDoOutput(true);
                    JSONObject payload = new JSONObject();
                    payload.put("patientName", patient);
                    payload.put("uhid", uhid);
                    payload.put("modality", modality);
                    payload.put("scheduledDate", date);
                    payload.put("scheduledTime", time);
                    payload.put("referredBy", inputDoctor.getText().toString().trim());
                    payload.put("notes", inputNotes.getText().toString().trim());
                    OutputStream os = conn.getOutputStream();
                    os.write(payload.toString().getBytes(StandardCharsets.UTF_8));
                    os.close();
                    int code = conn.getResponseCode();
                    mainHandler.post(() -> {
                        progressBook.setVisibility(View.GONE);
                        btnBook.setEnabled(true); btnBook.setText("Book Appointment");
                        if (code >= 200 && code < 300) { sheet.dismiss(); fetchSchedule(false); Toast.makeText(this, "Scan appointment booked", Toast.LENGTH_SHORT).show(); }
                        else { lblError.setText("Failed to book (" + code + ")"); lblError.setVisibility(View.VISIBLE); }
                    });
                    conn.disconnect();
                } catch (Exception e) {
                    mainHandler.post(() -> { progressBook.setVisibility(View.GONE); btnBook.setEnabled(true); btnBook.setText("Book Appointment");
                        lblError.setText("Error: " + e.getMessage()); lblError.setVisibility(View.VISIBLE); });
                }
            }).start();
        });
        sheet.show();
    }

    private String getToken() {
        String t = AuthManager.getToken(this);
        if (t != null && !t.isEmpty()) return t;
        try {
            CookieManager cm = CookieManager.getInstance();
            String cookies = cm.getCookie(BASE_URL);
            if (cookies != null) for (String p : cookies.split(";")) {
                String tr = p.trim();
                if (tr.startsWith("token=")) { String val = tr.substring(6).trim(); if (!val.isEmpty()) { AuthManager.saveToken(this, val); return val; } }
            }
        } catch (Exception ignored) {}
        try { SharedPreferences prefs = getSharedPreferences("patholab_prefs", Context.MODE_PRIVATE); String t2 = prefs.getString("auth_token", ""); if (t2 != null && !t2.isEmpty()) return t2; } catch (Exception ignored) {}
        return "";
    }

    private String read(InputStream is) throws Exception {
        if (is == null) return "";
        BufferedReader r = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8));
        StringBuilder sb = new StringBuilder(); String l;
        while ((l = r.readLine()) != null) sb.append(l);
        return sb.toString();
    }

    // ── Adapter ───────────────────────────────────────────────────────────────
    interface OnScanClick { void onClick(JSONObject scan); }
    static class ScanScheduleAdapter extends RecyclerView.Adapter<ScanScheduleAdapter.VH> {
        private final List<JSONObject> items; private final OnScanClick listener;
        ScanScheduleAdapter(List<JSONObject> items, OnScanClick listener) { this.items = items; this.listener = listener; }

        @NonNull @Override public VH onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
            View v = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_scan_schedule_card, parent, false);
            return new VH(v);
        }
        @Override public void onBindViewHolder(@NonNull VH h, int pos) { h.bind(items.get(pos)); }
        @Override public int getItemCount() { return items.size(); }

        class VH extends RecyclerView.ViewHolder {
            TextView lblPatient, lblUhid, lblModality, lblStatus, lblTime, lblDate, lblDoctor;
            Button btnActions;
            VH(View v) {
                super(v);
                lblPatient  = v.findViewById(R.id.lblSchedPatient);
                lblUhid     = v.findViewById(R.id.lblSchedUhid);
                lblModality = v.findViewById(R.id.lblSchedModality);
                lblStatus   = v.findViewById(R.id.lblSchedStatus);
                lblTime     = v.findViewById(R.id.lblSchedTime);
                lblDate     = v.findViewById(R.id.lblSchedDate);
                lblDoctor   = v.findViewById(R.id.lblSchedDoctor);
                btnActions  = v.findViewById(R.id.btnSchedActions);
            }
            void bind(JSONObject s) {
                lblPatient.setText(s.optString("patientName", "Patient"));
                lblUhid.setText(s.optString("uhid", ""));
                lblModality.setText(s.optString("modality", ""));
                String status = s.optString("status", "PENDING").toUpperCase(Locale.ROOT);
                lblStatus.setText(" " + status + " ");
                switch (status) {
                    case "COMPLETED": lblStatus.setTextColor(0xFF059669); lblStatus.setBackgroundColor(0xFFD1FAE5); break;
                    case "IN_PROGRESS": lblStatus.setTextColor(0xFF2563EB); lblStatus.setBackgroundColor(0xFFDBEAFE); break;
                    case "CANCELLED": lblStatus.setTextColor(0xFFDC2626); lblStatus.setBackgroundColor(0xFFFEE2E2); break;
                    default: lblStatus.setTextColor(0xFFD97706); lblStatus.setBackgroundColor(0xFFFEF3C7); break;
                }
                lblDate.setText(s.optString("scheduledDate", s.optString("date", "")));
                lblTime.setText(s.optString("scheduledTime", s.optString("time", "")));
                lblDoctor.setText(s.optString("referredBy", ""));
                btnActions.setOnClickListener(v -> listener.onClick(s));
            }
        }
    }
}
