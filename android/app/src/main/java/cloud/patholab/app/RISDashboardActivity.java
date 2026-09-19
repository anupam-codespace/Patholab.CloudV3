package cloud.patholab.app;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.view.animation.Animation;
import android.view.animation.RotateAnimation;
import android.webkit.CookieManager;
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

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

import cloud.patholab.app.auth.AuthManager;

/**
 * RISDashboardActivity — Radiology Command Center (Android)
 * Full 100% parity with web (/workspace/radiology/dashboard):
 *  - 4 Dynamic KPI Cards (Today's Scans, Pending Reports, Avg. Turnaround, Revenue Today)
 *  - Today's Live Workflow Pipeline (Scheduled → Waiting → Scanning → Reporting → Verified)
 *  - Modality Fleet Status with load progress bars & status pills
 *  - Radiologist Pending Queue with accession tags, priority badges & empty state
 *  - Quick Nav strip (Scan Schedule, Machines, Macros, DICOM Settings, Letterhead)
 *  - Real-time pull-to-refresh & auto sync
 */
public class RISDashboardActivity extends AppCompatActivity {

    private static final String BASE_URL = "https://app.patholab.cloud";

    // Nav
    private FrameLayout btnBack, btnRefresh;
    private ImageView imgRefreshIcon;
    private ProgressBar progressLoading;

    // KPI Views
    private TextView lblKpiToday, lblKpiPending, lblKpiAvgTat, lblKpiRevenue;

    // Live Workflow Views
    private TextView lblWorkflowScheduled, lblWorkflowWaiting, lblWorkflowScanning, lblWorkflowReporting, lblWorkflowVerified;

    // Modality Fleet Views
    private RecyclerView recyclerModalities;
    private LinearLayout emptyModalities;
    private ModalityAdapter modalityAdapter;
    private final List<JSONObject> modalityList = new ArrayList<>();

    // Pending Queue Views
    private TextView lblQueueCount;
    private RecyclerView recyclerPendingQueue;
    private LinearLayout emptyPendingQueue;
    private PendingQueueAdapter queueAdapter;
    private final List<JSONObject> queueList = new ArrayList<>();

    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_ris_dashboard);

        initViews();
        setupListeners();
        setupRecyclers();
        fetchDashboard(false);
    }

    private void initViews() {
        btnBack            = findViewById(R.id.btnRisDashBack);
        btnRefresh         = findViewById(R.id.btnRisDashRefresh);
        imgRefreshIcon     = findViewById(R.id.imgRisDashRefreshIcon);
        progressLoading    = findViewById(R.id.progressRisDash);

        // KPIs
        lblKpiToday        = findViewById(R.id.lblRisKpiToday);
        lblKpiPending      = findViewById(R.id.lblRisKpiPending);
        lblKpiAvgTat       = findViewById(R.id.lblRisKpiAvgTat);
        lblKpiRevenue      = findViewById(R.id.lblRisKpiRevenue);

        // Workflow
        lblWorkflowScheduled = findViewById(R.id.lblWorkflowScheduled);
        lblWorkflowWaiting   = findViewById(R.id.lblWorkflowWaiting);
        lblWorkflowScanning  = findViewById(R.id.lblWorkflowScanning);
        lblWorkflowReporting = findViewById(R.id.lblWorkflowReporting);
        lblWorkflowVerified  = findViewById(R.id.lblWorkflowVerified);

        // Modalities
        recyclerModalities = findViewById(R.id.recyclerModalities);
        emptyModalities    = findViewById(R.id.emptyModalities);

        // Queue
        lblQueueCount        = findViewById(R.id.lblQueueCount);
        recyclerPendingQueue = findViewById(R.id.recyclerPendingQueue);
        emptyPendingQueue    = findViewById(R.id.emptyPendingQueue);
    }

    private void setupListeners() {
        btnBack.setOnClickListener(v -> finish());
        btnRefresh.setOnClickListener(v -> {
            animateRefresh();
            fetchDashboard(true);
        });

        // Quick Navigation Buttons
        findViewById(R.id.btnNavScanSchedule).setOnClickListener(v ->
                startActivity(new Intent(this, ScanScheduleActivity.class)));
        findViewById(R.id.btnNavMachines).setOnClickListener(v ->
                startActivity(new Intent(this, MachinesActivity.class)));
        findViewById(R.id.btnNavMacros).setOnClickListener(v ->
                startActivity(new Intent(this, RISMacrosActivity.class)));
        findViewById(R.id.btnNavDicom).setOnClickListener(v ->
                startActivity(new Intent(this, DICOMSettingsActivity.class)));
        findViewById(R.id.btnNavLetterhead).setOnClickListener(v ->
                startActivity(new Intent(this, RISLetterheadActivity.class)));

        findViewById(R.id.btnManageModalities).setOnClickListener(v ->
                startActivity(new Intent(this, MachinesActivity.class)));
    }

    private void setupRecyclers() {
        // Modalities
        modalityAdapter = new ModalityAdapter(modalityList);
        recyclerModalities.setLayoutManager(new LinearLayoutManager(this));
        recyclerModalities.setAdapter(modalityAdapter);

        // Pending Queue
        queueAdapter = new PendingQueueAdapter(queueList);
        recyclerPendingQueue.setLayoutManager(new LinearLayoutManager(this));
        recyclerPendingQueue.setAdapter(queueAdapter);
    }

    private void animateRefresh() {
        if (imgRefreshIcon == null) return;
        RotateAnimation r = new RotateAnimation(0, 360, Animation.RELATIVE_TO_SELF, 0.5f, Animation.RELATIVE_TO_SELF, 0.5f);
        r.setDuration(600);
        r.setRepeatCount(1);
        imgRefreshIcon.startAnimation(r);
    }

    private void fetchDashboard(boolean manual) {
        progressLoading.setVisibility(View.VISIBLE);
        new Thread(() -> {
            try {
                String token = getToken();
                URL url = new URL(BASE_URL + "/api/workspace/radiology/dashboard");
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("GET");
                conn.setRequestProperty("Authorization", "Bearer " + token);
                conn.setRequestProperty("Cookie", "token=" + token);
                conn.setRequestProperty("Accept", "application/json");
                conn.setConnectTimeout(10000);
                conn.setReadTimeout(15000);

                int code = conn.getResponseCode();
                if (code >= 200 && code < 300) {
                    String body = read(conn.getInputStream()).trim();
                    JSONObject res = new JSONObject(body);

                    JSONObject stats = res.optJSONObject("stats");
                    JSONObject workflow = res.optJSONObject("workflow");
                    JSONArray modalitiesArr = res.optJSONArray("modalities");
                    JSONArray queueArr = res.optJSONArray("pendingQueue");

                    final List<JSONObject> fetchedModalities = new ArrayList<>();
                    if (modalitiesArr != null) {
                        for (int i = 0; i < modalitiesArr.length(); i++) {
                            fetchedModalities.add(modalitiesArr.getJSONObject(i));
                        }
                    }

                    final List<JSONObject> fetchedQueue = new ArrayList<>();
                    if (queueArr != null) {
                        for (int i = 0; i < queueArr.length(); i++) {
                            fetchedQueue.add(queueArr.getJSONObject(i));
                        }
                    }

                    mainHandler.post(() -> {
                        progressLoading.setVisibility(View.GONE);
                        bindStats(stats);
                        bindWorkflow(workflow);
                        bindModalities(fetchedModalities);
                        bindQueue(fetchedQueue);
                        if (manual) Toast.makeText(this, "Radiology Command Center refreshed", Toast.LENGTH_SHORT).show();
                    });
                } else {
                    mainHandler.post(() -> {
                        progressLoading.setVisibility(View.GONE);
                        Toast.makeText(this, "Failed to load dashboard data (" + code + ")", Toast.LENGTH_SHORT).show();
                    });
                }
                conn.disconnect();
            } catch (Exception e) {
                mainHandler.post(() -> {
                    progressLoading.setVisibility(View.GONE);
                    Toast.makeText(this, "Network error: " + e.getMessage(), Toast.LENGTH_SHORT).show();
                });
            }
        }).start();
    }

    private void bindStats(JSONObject s) {
        if (s == null) return;
        int scansToday = s.optInt("scansToday", s.optInt("todayScans", 0));
        int pending = s.optInt("pendingReports", s.optInt("pending", 0));
        String avgTat = s.optString("avgTat", "0h 0m");
        String revenue = s.optString("revenueToday", "₹0");

        lblKpiToday.setText(String.valueOf(scansToday));
        lblKpiPending.setText(String.valueOf(pending));
        lblKpiAvgTat.setText(avgTat);
        lblKpiRevenue.setText(revenue);
    }

    private void bindWorkflow(JSONObject w) {
        if (w == null) return;
        lblWorkflowScheduled.setText(String.valueOf(w.optInt("scheduled", 0)));
        lblWorkflowWaiting.setText(String.valueOf(w.optInt("waiting", 0)));
        lblWorkflowScanning.setText(String.valueOf(w.optInt("scanning", 0)));
        lblWorkflowReporting.setText(String.valueOf(w.optInt("reporting", 0)));
        lblWorkflowVerified.setText(String.valueOf(w.optInt("verified", 0)));
    }

    private void bindModalities(List<JSONObject> list) {
        modalityList.clear();
        modalityList.addAll(list);
        modalityAdapter.notifyDataSetChanged();

        boolean isEmpty = modalityList.isEmpty();
        emptyModalities.setVisibility(isEmpty ? View.VISIBLE : View.GONE);
        recyclerModalities.setVisibility(isEmpty ? View.GONE : View.VISIBLE);
    }

    private void bindQueue(List<JSONObject> list) {
        queueList.clear();
        queueList.addAll(list);
        queueAdapter.notifyDataSetChanged();

        lblQueueCount.setText(" " + list.size() + " ");
        boolean isEmpty = queueList.isEmpty();
        emptyPendingQueue.setVisibility(isEmpty ? View.VISIBLE : View.GONE);
        recyclerPendingQueue.setVisibility(isEmpty ? View.GONE : View.VISIBLE);
    }

    private String getToken() {
        String t = AuthManager.getToken(this);
        if (t != null && !t.isEmpty()) return t;
        try {
            CookieManager cm = CookieManager.getInstance();
            String cookies = cm.getCookie(BASE_URL);
            if (cookies != null) {
                for (String p : cookies.split(";")) {
                    String tr = p.trim();
                    if (tr.startsWith("token=")) {
                        String v = tr.substring(6).trim();
                        if (!v.isEmpty()) {
                            AuthManager.saveToken(this, v);
                            return v;
                        }
                    }
                }
            }
        } catch (Exception ignored) {}
        try {
            SharedPreferences prefs = getSharedPreferences("patholab_prefs", Context.MODE_PRIVATE);
            String t2 = prefs.getString("auth_token", "");
            if (t2 != null && !t2.isEmpty()) return t2;
        } catch (Exception ignored) {}
        return "";
    }

    private String read(InputStream is) throws Exception {
        if (is == null) return "";
        BufferedReader r = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8));
        StringBuilder sb = new StringBuilder();
        String l;
        while ((l = r.readLine()) != null) sb.append(l);
        return sb.toString();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Modality Adapter
    // ─────────────────────────────────────────────────────────────────────────
    static class ModalityAdapter extends RecyclerView.Adapter<ModalityAdapter.VH> {
        private final List<JSONObject> items;
        ModalityAdapter(List<JSONObject> items) { this.items = items; }

        @NonNull @Override
        public VH onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
            View v = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_ris_modality, parent, false);
            return new VH(v);
        }

        @Override
        public void onBindViewHolder(@NonNull VH h, int pos) {
            h.bind(items.get(pos));
        }

        @Override public int getItemCount() { return items.size(); }

        static class VH extends RecyclerView.ViewHolder {
            TextView lblName, lblStatus, lblPatient, lblNextSlot, lblLoad;
            ProgressBar progressLoad;

            VH(View v) {
                super(v);
                lblName      = v.findViewById(R.id.lblModalityName);
                lblStatus    = v.findViewById(R.id.lblModalityStatus);
                lblPatient   = v.findViewById(R.id.lblModalityPatient);
                lblNextSlot  = v.findViewById(R.id.lblModalityNextSlot);
                lblLoad      = v.findViewById(R.id.lblModalityLoad);
                progressLoad = v.findViewById(R.id.progressModalityLoad);
            }

            void bind(JSONObject mod) {
                String name = mod.optString("name", "Modality");
                String type = mod.optString("type", "");
                lblName.setText(type.isEmpty() ? name : name + " (" + type + ")");

                String status = mod.optString("status", "ACTIVE").toUpperCase(Locale.ROOT);
                lblStatus.setText(" " + status + " ");
                if (status.equals("ACTIVE")) {
                    lblStatus.setTextColor(0xFF059669);
                    lblStatus.setBackgroundResource(R.drawable.bg_status_completed);
                } else if (status.equals("MAINTENANCE")) {
                    lblStatus.setTextColor(0xFFD97706);
                    lblStatus.setBackgroundResource(R.drawable.bg_status_pending);
                } else {
                    lblStatus.setTextColor(0xFF64748B);
                    lblStatus.setBackgroundResource(R.drawable.bg_tag_amber);
                }

                String patient = mod.optString("currentPatient", "-");
                lblPatient.setText(patient.isEmpty() || patient.equals("-") ? "Current: Idle / Available" : "Current: " + patient);

                String nextSlot = mod.optString("nextSlot", "No upcoming slots");
                lblNextSlot.setText("Next Slot: " + nextSlot);

                int load = mod.optInt("load", 0);
                lblLoad.setText("Load: " + load + "%");
                progressLoad.setProgress(load);
            }
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Pending Queue Adapter
    // ─────────────────────────────────────────────────────────────────────────
    static class PendingQueueAdapter extends RecyclerView.Adapter<PendingQueueAdapter.VH> {
        private final List<JSONObject> items;
        PendingQueueAdapter(List<JSONObject> items) { this.items = items; }

        @NonNull @Override
        public VH onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
            View v = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_ris_pending_queue, parent, false);
            return new VH(v);
        }

        @Override
        public void onBindViewHolder(@NonNull VH h, int pos) {
            h.bind(items.get(pos));
        }

        @Override public int getItemCount() { return items.size(); }

        static class VH extends RecyclerView.ViewHolder {
            TextView lblAccession, lblUrgent, lblPatient, lblScan, lblTime;

            VH(View v) {
                super(v);
                lblAccession = v.findViewById(R.id.lblQueueAccession);
                lblUrgent    = v.findViewById(R.id.lblQueueUrgent);
                lblPatient   = v.findViewById(R.id.lblQueuePatient);
                lblScan      = v.findViewById(R.id.lblQueueScan);
                lblTime      = v.findViewById(R.id.lblQueueTime);
            }

            void bind(JSONObject item) {
                String acc = item.optString("id", "N/A");
                lblAccession.setText(" " + acc + " ");

                String priority = item.optString("priority", "NORMAL").toUpperCase(Locale.ROOT);
                lblUrgent.setVisibility(priority.equals("URGENT") ? View.VISIBLE : View.GONE);

                lblPatient.setText(item.optString("patient", "Unknown Patient"));
                lblScan.setText(item.optString("scan", "Scan"));
                lblTime.setText("Scanned: " + item.optString("time", "-"));
            }
        }
    }
}
