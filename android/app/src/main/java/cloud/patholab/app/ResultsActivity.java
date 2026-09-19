package cloud.patholab.app;

import android.content.Intent;
import android.content.SharedPreferences;
import cloud.patholab.app.auth.AuthManager;
import android.graphics.Color;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.LayoutInflater;
import android.view.View;
import android.view.animation.Animation;
import android.view.animation.LinearInterpolator;
import android.view.animation.RotateAnimation;
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

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Native Clinical Results Entry & Workstation Console (Android)
 * Replicates web /workspace/results with real-time status tabs (Pending, Draft, Needs Approval, Completed),
 * interactive parameter observation input with smart clinical evaluation (LOW / NORMAL / HIGH),
 * internal notes, doctor clinical impressions, and multi-stage lifecycle actions (Save Draft, Request Approval, Approve).
 */
public class ResultsActivity extends AppCompatActivity {

    private static final String BASE_URL = "https://app.patholab.cloud";

    // ── Header & Tab Views ───────────────────────────────────────────────────
    private FrameLayout btnResultsBack, btnRefreshResults;
    private ImageView imgRefreshResultsIcon;
    private TextView lblResultsTitle, lblResultsSubtitle;
    private TextView tabPending, tabDraft, tabNeedsApproval, tabCompleted;

    // ── Queue Views ──────────────────────────────────────────────────────────
    private LinearLayout layoutResultsQueue;
    private EditText inputSearchResults;
    private ImageView btnClearSearchResults;
    private ProgressBar progressResultsQueue;
    private LinearLayout emptyStateResultsQueue;
    private RecyclerView recyclerResultsQueue;

    // ── Workstation Views ────────────────────────────────────────────────────
    private LinearLayout layoutResultsWorkstation;
    private LinearLayout btnWorkstationBack;
    private TextView lblWorkstationAvatar, lblWorkstationPatientName, lblWorkstationPatientMeta;
    private LinearLayout containerWorkstationTests;
    private LinearLayout workstationActionFooter;
    private Button btnActionSaveDraft, btnActionRequestApproval, btnActionApprove, btnActionViewFinalReport;

    // ── State Management ─────────────────────────────────────────────────────
    private String activeTab = "PENDING"; // PENDING, DRAFT, NEEDS_APPROVAL, COMPLETED
    private String targetInvoiceIdFromIntent = null;
    private InvoiceWorklist selectedInvoice = null;

    private final List<InvoiceWorklist> allInvoices = new ArrayList<>();
    private final List<InvoiceWorklist> filteredInvoices = new ArrayList<>();
    private QueueAdapter queueAdapter;

    // Form value maps for currently open workstation
    private final Map<String, String> paramValues = new HashMap<>();
    private final Map<String, String> testNotes = new HashMap<>();
    private final Map<String, String> testImpressions = new HashMap<>();

    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    // ── Data Models ──────────────────────────────────────────────────────────
    public static class TestResultParam {
        public String id;
        public String parameterName;
        public String unit;
        public Double refRangeMin;
        public Double refRangeMax;
        public String refRangeText;
        public String value;
    }

    public static class LabTestRecord {
        public String id;
        public String testName;
        public String status;
        public String notes;
        public String impression;
        public List<TestResultParam> results = new ArrayList<>();
    }

    public static class InvoiceWorklist {
        public String invoiceId;
        public String invoiceNumber;
        public String createdAt;
        public String patientName;
        public int patientAge;
        public String patientGender;
        public String patientPhone;
        public String referredBy;
        public List<LabTestRecord> tests = new ArrayList<>();
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_results);

        if (getIntent() != null) {
            targetInvoiceIdFromIntent = getIntent().getStringExtra("extra_invoice_id");
            if (targetInvoiceIdFromIntent == null) {
                targetInvoiceIdFromIntent = getIntent().getStringExtra("invoiceId");
            }
        }

        initViews();
        setupListeners();
        setupQueueRecyclerView();

        updateTabUI(activeTab);
        fetchWorklist(activeTab);
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (selectedInvoice == null) {
            fetchWorklist(activeTab);
        }
    }

    private void initViews() {
        // Header
        btnResultsBack = findViewById(R.id.btnResultsBack);
        btnRefreshResults = findViewById(R.id.btnRefreshResults);
        imgRefreshResultsIcon = findViewById(R.id.imgRefreshResultsIcon);
        lblResultsTitle = findViewById(R.id.lblResultsTitle);
        lblResultsSubtitle = findViewById(R.id.lblResultsSubtitle);

        // Tabs
        tabPending = findViewById(R.id.tabPending);
        tabDraft = findViewById(R.id.tabDraft);
        tabNeedsApproval = findViewById(R.id.tabNeedsApproval);
        tabCompleted = findViewById(R.id.tabCompleted);

        // Queue
        layoutResultsQueue = findViewById(R.id.layoutResultsQueue);
        inputSearchResults = findViewById(R.id.inputSearchResults);
        btnClearSearchResults = findViewById(R.id.btnClearSearchResults);
        progressResultsQueue = findViewById(R.id.progressResultsQueue);
        emptyStateResultsQueue = findViewById(R.id.emptyStateResultsQueue);
        recyclerResultsQueue = findViewById(R.id.recyclerResultsQueue);

        // Workstation
        layoutResultsWorkstation = findViewById(R.id.layoutResultsWorkstation);
        btnWorkstationBack = findViewById(R.id.btnWorkstationBack);
        lblWorkstationAvatar = findViewById(R.id.lblWorkstationAvatar);
        lblWorkstationPatientName = findViewById(R.id.lblWorkstationPatientName);
        lblWorkstationPatientMeta = findViewById(R.id.lblWorkstationPatientMeta);
        containerWorkstationTests = findViewById(R.id.containerWorkstationTests);
        workstationActionFooter = findViewById(R.id.workstationActionFooter);
        btnActionSaveDraft = findViewById(R.id.btnActionSaveDraft);
        btnActionRequestApproval = findViewById(R.id.btnActionRequestApproval);
        btnActionApprove = findViewById(R.id.btnActionApprove);
        btnActionViewFinalReport = findViewById(R.id.btnActionViewFinalReport);
    }

    private void setupListeners() {
        btnResultsBack.setOnClickListener(v -> handleBackAction());
        btnWorkstationBack.setOnClickListener(v -> closeWorkstation());

        btnRefreshResults.setOnClickListener(v -> {
            startRefreshAnimation();
            fetchWorklist(activeTab);
        });

        // Tabs
        tabPending.setOnClickListener(v -> switchTab("PENDING"));
        tabDraft.setOnClickListener(v -> switchTab("DRAFT"));
        tabNeedsApproval.setOnClickListener(v -> switchTab("NEEDS_APPROVAL"));
        tabCompleted.setOnClickListener(v -> switchTab("COMPLETED"));

        // Search
        inputSearchResults.addTextChangedListener(new TextWatcher() {
            @Override public void beforeTextChanged(CharSequence s, int start, int count, int after) {}
            @Override public void onTextChanged(CharSequence s, int start, int before, int count) {
                String q = s.toString().trim();
                btnClearSearchResults.setVisibility(q.isEmpty() ? View.GONE : View.VISIBLE);
                filterQueue(q);
            }
            @Override public void afterTextChanged(Editable s) {}
        });

        btnClearSearchResults.setOnClickListener(v -> {
            inputSearchResults.setText("");
            filterQueue("");
        });

        // Workstation Action Buttons
        btnActionSaveDraft.setOnClickListener(v -> executeSaveAction("SAVE_DRAFT"));
        btnActionRequestApproval.setOnClickListener(v -> executeSaveAction("REQUEST_APPROVAL"));
        btnActionApprove.setOnClickListener(v -> executeSaveAction("APPROVE"));
        btnActionViewFinalReport.setOnClickListener(v -> openReportPreview());
    }

    private void setupQueueRecyclerView() {
        queueAdapter = new QueueAdapter(filteredInvoices, this::openWorkstation);
        recyclerResultsQueue.setLayoutManager(new LinearLayoutManager(this));
        recyclerResultsQueue.setAdapter(queueAdapter);
    }

    private void switchTab(String tabKey) {
        if (activeTab.equals(tabKey)) return;
        activeTab = tabKey;
        updateTabUI(tabKey);
        closeWorkstation();
        fetchWorklist(tabKey);
    }

    private void updateTabUI(String activeKey) {
        setTabStyle(tabPending, activeKey.equals("PENDING"));
        setTabStyle(tabDraft, activeKey.equals("DRAFT"));
        setTabStyle(tabNeedsApproval, activeKey.equals("NEEDS_APPROVAL"));
        setTabStyle(tabCompleted, activeKey.equals("COMPLETED"));
    }

    private void setTabStyle(TextView tab, boolean isActive) {
        if (isActive) {
            tab.setTextColor(Color.WHITE);
            tab.setBackgroundResource(R.drawable.bg_pill_white);
            tab.getBackground().setTint(Color.parseColor("#0D6EFD")); // Sapphire Blue
        } else {
            tab.setTextColor(Color.parseColor("#475569")); // Slate 600
            tab.setBackgroundResource(R.drawable.bg_pill_white);
            tab.getBackground().setTint(Color.parseColor("#E2E8F0")); // Slate 200
        }
    }

    private void filterQueue(String query) {
        filteredInvoices.clear();
        if (query.isEmpty()) {
            filteredInvoices.addAll(allInvoices);
        } else {
            String lower = query.toLowerCase(Locale.getDefault());
            for (InvoiceWorklist inv : allInvoices) {
                if (inv.patientName.toLowerCase(Locale.getDefault()).contains(lower) ||
                    inv.invoiceNumber.toLowerCase(Locale.getDefault()).contains(lower) ||
                    inv.patientPhone.contains(lower)) {
                    filteredInvoices.add(inv);
                }
            }
        }
        queueAdapter.notifyDataSetChanged();
        emptyStateResultsQueue.setVisibility(filteredInvoices.isEmpty() ? View.VISIBLE : View.GONE);
    }

    // ── Fetch Worklist From API ──────────────────────────────────────────────
    private void fetchWorklist(String statusTab) {
        progressResultsQueue.setVisibility(View.VISIBLE);
        emptyStateResultsQueue.setVisibility(View.GONE);

        executor.execute(() -> {
            HttpURLConnection conn = null;
            try {
                String token = getAuthToken();
                String urlStr = BASE_URL + "/api/workspace/results?status=" + statusTab;
                URL url = new URL(urlStr);
                conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("GET");
                conn.setRequestProperty("Accept", "application/json");
                conn.setConnectTimeout(15000);
                conn.setReadTimeout(20000);

                if (token != null && !token.isEmpty()) {
                    conn.setRequestProperty("Authorization", "Bearer " + token);
                    conn.setRequestProperty("Cookie", "auth-token=" + token + "; token=" + token);
                }

                int code = conn.getResponseCode();
                if (code == 200) {
                    BufferedReader br = new BufferedReader(new InputStreamReader(conn.getInputStream()));
                    StringBuilder sb = new StringBuilder();
                    String line;
                    while ((line = br.readLine()) != null) sb.append(line);
                    br.close();

                    JSONObject root = new JSONObject(sb.toString());
                    JSONArray arr = root.optJSONArray("worklist");
                    List<InvoiceWorklist> list = new ArrayList<>();

                    if (arr != null) {
                        for (int i = 0; i < arr.length(); i++) {
                            JSONObject invObj = arr.optJSONObject(i);
                            if (invObj == null) continue;

                            InvoiceWorklist inv = new InvoiceWorklist();
                            inv.invoiceId = invObj.optString("invoiceId", "");
                            inv.invoiceNumber = invObj.optString("invoiceNumber", "");
                            inv.createdAt = invObj.optString("createdAt", "");
                            inv.referredBy = invObj.optString("referredBy", "Self");

                            JSONObject pObj = invObj.optJSONObject("patient");
                            if (pObj != null) {
                                inv.patientName = pObj.optString("name", "Unknown Patient");
                                inv.patientAge = pObj.optInt("age", 0);
                                inv.patientGender = pObj.optString("gender", "U");
                                inv.patientPhone = pObj.optString("phone", "");
                                if ("null".equalsIgnoreCase(inv.patientPhone)) inv.patientPhone = "";
                            } else {
                                inv.patientName = "Unknown Patient";
                            }

                            JSONArray testsArr = invObj.optJSONArray("tests");
                            if (testsArr != null) {
                                for (int t = 0; t < testsArr.length(); t++) {
                                    JSONObject tObj = testsArr.optJSONObject(t);
                                    if (tObj == null) continue;

                                    LabTestRecord test = new LabTestRecord();
                                    test.id = tObj.optString("id", "");
                                    test.testName = tObj.optString("testName", "Diagnostic Test");
                                    test.status = tObj.optString("status", "PENDING");
                                    test.notes = tObj.optString("notes", "");
                                    test.impression = tObj.optString("impression", "");

                                    JSONArray resultsArr = tObj.optJSONArray("results");
                                    if (resultsArr != null) {
                                        for (int r = 0; r < resultsArr.length(); r++) {
                                            JSONObject rObj = resultsArr.optJSONObject(r);
                                            if (rObj == null) continue;

                                            TestResultParam param = new TestResultParam();
                                            param.id = rObj.optString("id", "");
                                            param.parameterName = rObj.optString("parameterName", "Parameter");
                                            param.unit = rObj.optString("unit", "");
                                            if (rObj.has("refRangeMin") && !rObj.isNull("refRangeMin")) {
                                                param.refRangeMin = rObj.optDouble("refRangeMin");
                                            }
                                            if (rObj.has("refRangeMax") && !rObj.isNull("refRangeMax")) {
                                                param.refRangeMax = rObj.optDouble("refRangeMax");
                                            }
                                            param.refRangeText = rObj.optString("refRangeText", "-");
                                            param.value = rObj.optString("value", "");

                                            test.results.add(param);
                                        }
                                    }
                                    inv.tests.add(test);
                                }
                            }
                            list.add(inv);
                        }
                    }

                    mainHandler.post(() -> {
                        stopRefreshAnimation();
                        progressResultsQueue.setVisibility(View.GONE);
                        allInvoices.clear();
                        allInvoices.addAll(list);
                        filterQueue(inputSearchResults.getText().toString().trim());

                        // If intent asked for a specific invoice, auto-open it once
                        if (targetInvoiceIdFromIntent != null && !targetInvoiceIdFromIntent.isEmpty()) {
                            for (InvoiceWorklist inv : allInvoices) {
                                if (inv.invoiceId.equals(targetInvoiceIdFromIntent)) {
                                    targetInvoiceIdFromIntent = null; // consume
                                    openWorkstation(inv);
                                    break;
                                }
                            }
                        }
                    });
                } else {
                    mainHandler.post(() -> {
                        stopRefreshAnimation();
                        progressResultsQueue.setVisibility(View.GONE);
                        emptyStateResultsQueue.setVisibility(View.VISIBLE);
                        Toast.makeText(this, "Failed to load queue (HTTP " + code + ")", Toast.LENGTH_SHORT).show();
                    });
                }
            } catch (Exception e) {
                mainHandler.post(() -> {
                    stopRefreshAnimation();
                    progressResultsQueue.setVisibility(View.GONE);
                    emptyStateResultsQueue.setVisibility(View.VISIBLE);
                });
            } finally {
                if (conn != null) conn.disconnect();
            }
        });
    }

    // ── Workstation Management ───────────────────────────────────────────────
    private void openWorkstation(InvoiceWorklist inv) {
        selectedInvoice = inv;
        paramValues.clear();
        testNotes.clear();
        testImpressions.clear();

        layoutResultsQueue.setVisibility(View.GONE);
        layoutResultsWorkstation.setVisibility(View.VISIBLE);

        // Header Summary
        String initial = (!inv.patientName.isEmpty()) ? String.valueOf(inv.patientName.charAt(0)).toUpperCase() : "P";
        lblWorkstationAvatar.setText(initial);
        lblWorkstationPatientName.setText(inv.patientName);

        String meta = inv.patientAge + " Yrs • " + inv.patientGender + " • SID: " + inv.invoiceNumber;
        if (!inv.patientPhone.isEmpty()) {
            meta += " • " + inv.patientPhone;
        }
        lblWorkstationPatientMeta.setText(meta);

        // Build Test Cards
        containerWorkstationTests.removeAllViews();
        LayoutInflater inflater = LayoutInflater.from(this);
        boolean isCompletedTab = "COMPLETED".equalsIgnoreCase(activeTab);

        for (LabTestRecord test : inv.tests) {
            testNotes.put(test.id, test.notes != null ? test.notes : "");
            testImpressions.put(test.id, test.impression != null ? test.impression : "");

            View testCardView = inflater.inflate(R.layout.item_results_test_card, containerWorkstationTests, false);
            TextView lblCardTestName = testCardView.findViewById(R.id.lblCardTestName);
            TextView lblCardTestStatus = testCardView.findViewById(R.id.lblCardTestStatus);
            LinearLayout containerCardParams = testCardView.findViewById(R.id.containerCardParams);
            EditText inputCardNotes = testCardView.findViewById(R.id.inputCardNotes);
            EditText inputCardImpression = testCardView.findViewById(R.id.inputCardImpression);

            lblCardTestName.setText(test.testName);
            lblCardTestStatus.setText(test.status);

            // Populate Parameter Rows
            for (TestResultParam param : test.results) {
                paramValues.put(param.id, param.value != null ? param.value : "");

                View paramRow = inflater.inflate(R.layout.item_results_param_row, containerCardParams, false);
                TextView lblParamName = paramRow.findViewById(R.id.lblParamName);
                TextView lblParamUnitRef = paramRow.findViewById(R.id.lblParamUnitRef);
                EditText inputParamValue = paramRow.findViewById(R.id.inputParamValue);
                TextView lblParamFlag = paramRow.findViewById(R.id.lblParamFlag);

                lblParamName.setText(param.parameterName);

                String unitRef = "";
                if (param.unit != null && !param.unit.isEmpty()) unitRef += param.unit + " ";
                if (param.refRangeMin != null && param.refRangeMax != null) {
                    unitRef += "(" + param.refRangeMin + " - " + param.refRangeMax + ")";
                } else if (param.refRangeText != null && !param.refRangeText.equals("-")) {
                    unitRef += "(" + param.refRangeText + ")";
                }
                lblParamUnitRef.setText(unitRef.trim());

                inputParamValue.setText(param.value != null ? param.value : "");
                updateEvaluationBadge(lblParamFlag, param.value, param.refRangeMin, param.refRangeMax);

                if (isCompletedTab) {
                    inputParamValue.setEnabled(false);
                    inputParamValue.setFocusable(false);
                } else {
                    inputParamValue.addTextChangedListener(new TextWatcher() {
                        @Override public void beforeTextChanged(CharSequence s, int start, int count, int after) {}
                        @Override public void onTextChanged(CharSequence s, int start, int before, int count) {
                            String v = s.toString().trim();
                            paramValues.put(param.id, v);
                            updateEvaluationBadge(lblParamFlag, v, param.refRangeMin, param.refRangeMax);
                        }
                        @Override public void afterTextChanged(Editable s) {}
                    });
                }

                containerCardParams.addView(paramRow);
            }

            // Notes & Impressions
            inputCardNotes.setText(test.notes != null ? test.notes : "");
            inputCardImpression.setText(test.impression != null ? test.impression : "");

            if (isCompletedTab) {
                inputCardNotes.setEnabled(false);
                inputCardImpression.setEnabled(false);
            } else {
                inputCardNotes.addTextChangedListener(new TextWatcher() {
                    @Override public void beforeTextChanged(CharSequence s, int start, int count, int after) {}
                    @Override public void onTextChanged(CharSequence s, int start, int before, int count) {
                        testNotes.put(test.id, s.toString().trim());
                    }
                    @Override public void afterTextChanged(Editable s) {}
                });

                inputCardImpression.addTextChangedListener(new TextWatcher() {
                    @Override public void beforeTextChanged(CharSequence s, int start, int count, int after) {}
                    @Override public void onTextChanged(CharSequence s, int start, int before, int count) {
                        testImpressions.put(test.id, s.toString().trim());
                    }
                    @Override public void afterTextChanged(Editable s) {}
                });
            }

            containerWorkstationTests.addView(testCardView);
        }

        // Action footer buttons visibility
        if (isCompletedTab) {
            btnActionSaveDraft.setVisibility(View.GONE);
            btnActionRequestApproval.setVisibility(View.GONE);
            btnActionApprove.setVisibility(View.GONE);
            btnActionViewFinalReport.setVisibility(View.VISIBLE);
        } else {
            btnActionSaveDraft.setVisibility(View.VISIBLE);
            btnActionRequestApproval.setVisibility(View.VISIBLE);
            btnActionApprove.setVisibility(View.VISIBLE);
            btnActionViewFinalReport.setVisibility(View.GONE);
        }
    }

    private void closeWorkstation() {
        selectedInvoice = null;
        layoutResultsWorkstation.setVisibility(View.GONE);
        layoutResultsQueue.setVisibility(View.VISIBLE);
    }

    private void updateEvaluationBadge(TextView badge, String val, Double min, Double max) {
        if (badge == null) return;
        if (val == null || val.trim().isEmpty() || min == null || max == null) {
            badge.setVisibility(View.GONE);
            return;
        }
        try {
            double num = Double.parseDouble(val.trim());
            badge.setVisibility(View.VISIBLE);
            if (num < min) {
                badge.setText("▼ LOW");
                badge.setTextColor(Color.parseColor("#1D4ED8")); // Blue 700
                badge.setBackgroundResource(R.drawable.bg_pill_white);
                badge.getBackground().setTint(Color.parseColor("#EFF6FF")); // Blue 50
            } else if (num > max) {
                badge.setText("▲ HIGH");
                badge.setTextColor(Color.parseColor("#BE123C")); // Rose 700
                badge.setBackgroundResource(R.drawable.bg_pill_white);
                badge.getBackground().setTint(Color.parseColor("#FFF1F2")); // Rose 50
            } else {
                badge.setText("✓ NORMAL");
                badge.setTextColor(Color.parseColor("#059669")); // Emerald 600
                badge.setBackgroundResource(R.drawable.bg_pill_white);
                badge.getBackground().setTint(Color.parseColor("#ECFDF5")); // Emerald 50
            }
        } catch (NumberFormatException e) {
            badge.setVisibility(View.GONE);
        }
    }

    // ── Save Results Mutation ────────────────────────────────────────────────
    private void executeSaveAction(String action) {
        if (selectedInvoice == null) return;

        btnActionSaveDraft.setEnabled(false);
        btnActionRequestApproval.setEnabled(false);
        btnActionApprove.setEnabled(false);

        executor.execute(() -> {
            HttpURLConnection conn = null;
            try {
                String token = getAuthToken();
                String urlStr = BASE_URL + "/api/workspace/results/" + selectedInvoice.invoiceId + "/save";
                URL url = new URL(urlStr);
                conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("POST");
                conn.setRequestProperty("Content-Type", "application/json");
                conn.setRequestProperty("Accept", "application/json");
                conn.setDoOutput(true);
                conn.setConnectTimeout(15000);
                conn.setReadTimeout(20000);

                if (token != null && !token.isEmpty()) {
                    conn.setRequestProperty("Authorization", "Bearer " + token);
                    conn.setRequestProperty("Cookie", "auth-token=" + token + "; token=" + token);
                }

                // Construct JSON payload
                JSONObject payload = new JSONObject();
                payload.put("invoiceId", selectedInvoice.invoiceId);
                payload.put("action", action);

                JSONObject dataObj = new JSONObject();

                JSONObject paramsObj = new JSONObject();
                for (Map.Entry<String, String> entry : paramValues.entrySet()) {
                    paramsObj.put(entry.getKey(), entry.getValue());
                }
                dataObj.put("parameters", paramsObj);

                JSONObject notesObj = new JSONObject();
                for (Map.Entry<String, String> entry : testNotes.entrySet()) {
                    notesObj.put(entry.getKey(), entry.getValue());
                }
                dataObj.put("notes", notesObj);

                JSONObject impressionsObj = new JSONObject();
                for (Map.Entry<String, String> entry : testImpressions.entrySet()) {
                    impressionsObj.put(entry.getKey(), entry.getValue());
                }
                dataObj.put("impressions", impressionsObj);

                payload.put("data", dataObj);

                byte[] bodyBytes = payload.toString().getBytes("UTF-8");
                OutputStream os = conn.getOutputStream();
                os.write(bodyBytes);
                os.flush();
                os.close();

                int code = conn.getResponseCode();
                mainHandler.post(() -> {
                    btnActionSaveDraft.setEnabled(true);
                    btnActionRequestApproval.setEnabled(true);
                    btnActionApprove.setEnabled(true);

                    if (code == 200 || code == 201) {
                        String msg;
                        if ("SAVE_DRAFT".equals(action)) {
                            msg = "Draft saved successfully.";
                        } else if ("REQUEST_APPROVAL".equals(action)) {
                            msg = "Sent to Pathologist for approval!";
                            closeWorkstation();
                        } else {
                            msg = "Results Approved & Report Generated!";
                            closeWorkstation();
                        }
                        Toast.makeText(this, msg, Toast.LENGTH_SHORT).show();
                        fetchWorklist(activeTab);
                    } else {
                        Toast.makeText(this, "Save failed (HTTP " + code + ")", Toast.LENGTH_SHORT).show();
                    }
                });
            } catch (Exception e) {
                mainHandler.post(() -> {
                    btnActionSaveDraft.setEnabled(true);
                    btnActionRequestApproval.setEnabled(true);
                    btnActionApprove.setEnabled(true);
                    Toast.makeText(this, "Network error saving results", Toast.LENGTH_SHORT).show();
                });
            } finally {
                if (conn != null) conn.disconnect();
            }
        });
    }

    private void openReportPreview() {
        if (selectedInvoice == null) return;
        Intent intent = new Intent(this, ReportPreviewActivity.class);
        intent.putExtra("extra_patient_name", selectedInvoice.patientName);
        intent.putExtra("extra_invoice_id", selectedInvoice.invoiceId);
        intent.putExtra("extra_uhid", selectedInvoice.invoiceNumber);
        startActivity(intent);
    }

    private void handleBackAction() {
        if (layoutResultsWorkstation.getVisibility() == View.VISIBLE) {
            closeWorkstation();
        } else {
            finish();
        }
    }

    @Override
    public void onBackPressed() {
        handleBackAction();
    }

    // ── Token Utility ────────────────────────────────────────────────────────
    private String getAuthToken() {
        String token = AuthManager.getToken(this);
        if (token != null && !token.trim().isEmpty() && !"null".equalsIgnoreCase(token.trim()) && !"undefined".equalsIgnoreCase(token.trim())) {
            return token.trim();
        }
        try {
            SharedPreferences sp = getSharedPreferences("PatholabPrefs", MODE_PRIVATE);
            String spToken = sp.getString("auth_token", null);
            if (spToken != null && !spToken.trim().isEmpty() && !"null".equalsIgnoreCase(spToken.trim()) && !"undefined".equalsIgnoreCase(spToken.trim())) {
                AuthManager.saveToken(this, spToken.trim());
                return spToken.trim();
            }
        } catch (Exception ignored) {}
        try {
            android.webkit.CookieManager cm = android.webkit.CookieManager.getInstance();
            String cookies = cm.getCookie("https://app.patholab.cloud");
            if (cookies == null) cookies = cm.getCookie("https://patholab.cloud");
            if (cookies != null) {
                String[] parts = cookies.split(";");
                for (String part : parts) {
                    String trimmed = part.trim();
                    if (trimmed.startsWith("token=") || trimmed.startsWith("auth-token=")) {
                        int eq = trimmed.indexOf('=');
                        String cookieToken = trimmed.substring(eq + 1).trim();
                        if (!cookieToken.isEmpty() && !"null".equalsIgnoreCase(cookieToken) && !"undefined".equalsIgnoreCase(cookieToken)) {
                            AuthManager.saveToken(this, cookieToken);
                            return cookieToken;
                        }
                    }
                }
            }
        } catch (Exception ignored) {}
        return null;
    }

    private void startRefreshAnimation() {
        RotateAnimation rotate = new RotateAnimation(0, 360,
                Animation.RELATIVE_TO_SELF, 0.5f,
                Animation.RELATIVE_TO_SELF, 0.5f);
        rotate.setDuration(800);
        rotate.setInterpolator(new LinearInterpolator());
        rotate.setRepeatCount(Animation.INFINITE);
        imgRefreshResultsIcon.startAnimation(rotate);
    }

    private void stopRefreshAnimation() {
        imgRefreshResultsIcon.clearAnimation();
    }

    // ── Recycler Adapter ─────────────────────────────────────────────────────
    private static class QueueAdapter extends RecyclerView.Adapter<QueueAdapter.ViewHolder> {
        private final List<InvoiceWorklist> list;
        private final OnItemClickListener listener;

        interface OnItemClickListener {
            void onItemClick(InvoiceWorklist inv);
        }

        QueueAdapter(List<InvoiceWorklist> list, OnItemClickListener listener) {
            this.list = list;
            this.listener = listener;
        }

        @NonNull
        @Override
        public ViewHolder onCreateViewHolder(@NonNull android.view.ViewGroup parent, int viewType) {
            View v = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_results_queue_card, parent, false);
            return new ViewHolder(v);
        }

        @Override
        public void onBindViewHolder(@NonNull ViewHolder holder, int position) {
            InvoiceWorklist inv = list.get(position);
            holder.lblQueuePatientName.setText(inv.patientName);
            holder.lblQueueInvoiceNumber.setText(inv.invoiceNumber);
            holder.lblQueuePatientMeta.setText(inv.patientAge + "Y " + inv.patientGender);
            holder.lblQueuePhone.setText(inv.patientPhone.isEmpty() ? "" : " • " + inv.patientPhone);

            // Date formatting
            try {
                if (!inv.createdAt.isEmpty()) {
                    SimpleDateFormat inFmt = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault());
                    SimpleDateFormat outFmt = new SimpleDateFormat("dd MMM, HH:mm", Locale.getDefault());
                    Date d = inFmt.parse(inv.createdAt);
                    holder.lblQueueDateTime.setText(d != null ? outFmt.format(d) : inv.createdAt);
                } else {
                    holder.lblQueueDateTime.setText("Recent");
                }
            } catch (Exception e) {
                holder.lblQueueDateTime.setText("Recent");
            }

            // Test Badges
            holder.containerQueueTestBadges.removeAllViews();
            int maxBadges = 3;
            for (int i = 0; i < Math.min(inv.tests.size(), maxBadges); i++) {
                LabTestRecord t = inv.tests.get(i);
                TextView badge = new TextView(holder.itemView.getContext());
                badge.setText(t.testName.length() > 6 ? t.testName.substring(0, 6).toUpperCase() : t.testName.toUpperCase());
                badge.setTextSize(9.5f);
                badge.setTypeface(null, android.graphics.Typeface.BOLD);
                badge.setTextColor(Color.parseColor("#334155"));
                badge.setBackgroundResource(R.drawable.bg_pill_white);
                badge.getBackground().setTint(Color.parseColor("#F1F5F9"));
                badge.setPadding(12, 4, 12, 4);

                LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.WRAP_CONTENT,
                        LinearLayout.LayoutParams.WRAP_CONTENT);
                lp.setMarginEnd(8);
                badge.setLayoutParams(lp);
                holder.containerQueueTestBadges.addView(badge);
            }

            if (inv.tests.size() > maxBadges) {
                TextView extraBadge = new TextView(holder.itemView.getContext());
                extraBadge.setText("+" + (inv.tests.size() - maxBadges));
                extraBadge.setTextSize(9.5f);
                extraBadge.setTypeface(null, android.graphics.Typeface.BOLD);
                extraBadge.setTextColor(Color.parseColor("#64748B"));
                extraBadge.setBackgroundResource(R.drawable.bg_pill_white);
                extraBadge.getBackground().setTint(Color.parseColor("#E2E8F0"));
                extraBadge.setPadding(10, 4, 10, 4);
                holder.containerQueueTestBadges.addView(extraBadge);
            }

            holder.itemView.setOnClickListener(v -> listener.onItemClick(inv));
            holder.btnQueueOpenAction.setOnClickListener(v -> listener.onItemClick(inv));
        }

        @Override
        public int getItemCount() {
            return list.size();
        }

        static class ViewHolder extends RecyclerView.ViewHolder {
            TextView lblQueuePatientName, lblQueueDateTime, lblQueueInvoiceNumber, lblQueuePatientMeta, lblQueuePhone, btnQueueOpenAction;
            LinearLayout containerQueueTestBadges;

            ViewHolder(@NonNull View itemView) {
                super(itemView);
                lblQueuePatientName = itemView.findViewById(R.id.lblQueuePatientName);
                lblQueueDateTime = itemView.findViewById(R.id.lblQueueDateTime);
                lblQueueInvoiceNumber = itemView.findViewById(R.id.lblQueueInvoiceNumber);
                lblQueuePatientMeta = itemView.findViewById(R.id.lblQueuePatientMeta);
                lblQueuePhone = itemView.findViewById(R.id.lblQueuePhone);
                btnQueueOpenAction = itemView.findViewById(R.id.btnQueueOpenAction);
                containerQueueTestBadges = itemView.findViewById(R.id.containerQueueTestBadges);
            }
        }
    }
}
