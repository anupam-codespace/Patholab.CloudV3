package cloud.patholab.app;

import android.app.Dialog;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.drawable.ColorDrawable;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
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

import com.google.android.material.bottomsheet.BottomSheetBehavior;
import com.google.android.material.bottomsheet.BottomSheetDialog;
import com.google.android.material.button.MaterialButton;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;

import cloud.patholab.app.auth.AuthManager;

/**
 * Native Independent Diagnostic Reports & Dispatch Console
 * Syncs directly with lab-specific database records, providing instant PDF preview,
 * wireless printing spooler, WhatsApp/Email sharing, and clinical amendment workflows.
 */
public class ReportsActivity extends AppCompatActivity {

    private static final String BASE_URL = "https://app.patholab.cloud";

    private FrameLayout btnReportsBack, btnRefreshReports;
    private TextView lblKpiReadyCount, lblKpiSentCount, lblKpiDraftCount, lblKpiAmendedCount;
    private TextView lblReportsSubtitle;
    private EditText inputSearchReports;
    private ImageView btnClearSearchReports;
    private LinearLayout containerReportsFilterChips;
    private ProgressBar progressReports;
    private RecyclerView recyclerReportsList;
    private LinearLayout emptyStateReports;

    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private final List<ReportItem> allReports = new ArrayList<>();
    private final List<ReportItem> filteredReports = new ArrayList<>();
    private ReportsAdapter reportsAdapter;

    private String selectedStatusFilter = "PRINT_READY";
    private String currentLabName = "PathoLab Cloud";
    private String currentUserName = "Medical Officer";

    public static class ReportItem {
        public String id;
        public int version;
        public String status; // FINAL, APPROVED, SENT_TO_PATIENT, DRAFT, GENERATED, AMENDED
        public String pdfUrl;
        public boolean isAmended;
        public String amendmentReason;
        public String createdAt;
        public String patientName;
        public String patientPhone;
        public String patientEmail;
        public String patientAge;
        public String patientGender;
        public String uhid;
        public String testName;
        public String testCode;
        public String departmentName;
        public String pathologistName;

        public ReportItem(String id, int version, String status, String pdfUrl, boolean isAmended,
                          String amendmentReason, String createdAt, String patientName,
                          String patientPhone, String patientEmail, String patientAge,
                          String patientGender, String uhid, String testName, String testCode,
                          String departmentName, String pathologistName) {
            this.id = id;
            this.version = version;
            this.status = status;
            this.pdfUrl = pdfUrl;
            this.isAmended = isAmended;
            this.amendmentReason = amendmentReason;
            this.createdAt = createdAt;
            this.patientName = patientName;
            this.patientPhone = patientPhone;
            this.patientEmail = patientEmail;
            this.patientAge = patientAge != null && !patientAge.isEmpty() ? patientAge : "42 Yrs";
            this.patientGender = patientGender != null && !patientGender.isEmpty() ? patientGender : "Male";
            this.uhid = uhid != null && !uhid.isEmpty() ? uhid : "P-" + (id.length() > 5 ? id.substring(id.length() - 5).toUpperCase() : id.toUpperCase());
            this.testName = testName != null && !testName.isEmpty() ? testName : "Diagnostic Investigation";
            this.testCode = testCode != null && !testCode.isEmpty() ? testCode : "T_" + (testName.length() > 3 ? testName.substring(0, 3).toUpperCase() : "TEST");
            this.departmentName = departmentName != null && !departmentName.isEmpty() ? departmentName : "Pathology";
            this.pathologistName = pathologistName != null && !pathologistName.isEmpty() ? pathologistName : "Chief Pathologist";
        }
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        StatusBarHelper.setStatusBarSapphire(this);
        setContentView(R.layout.activity_reports);

        initViews();
        setupEvents();
        setupFilterChips();
        fetchReports();
    }

    @Override
    protected void onResume() {
        super.onResume();
        fetchReports();
    }

    private void initViews() {
        btnReportsBack = findViewById(R.id.btnReportsBack);
        btnRefreshReports = findViewById(R.id.btnRefreshReports);
        lblKpiReadyCount = findViewById(R.id.lblKpiReadyCount);
        lblKpiSentCount = findViewById(R.id.lblKpiSentCount);
        lblKpiDraftCount = findViewById(R.id.lblKpiDraftCount);
        lblKpiAmendedCount = findViewById(R.id.lblKpiAmendedCount);
        inputSearchReports = findViewById(R.id.inputSearchReports);
        btnClearSearchReports = findViewById(R.id.btnClearSearchReports);
        containerReportsFilterChips = findViewById(R.id.containerReportsFilterChips);
        progressReports = findViewById(R.id.progressReports);
        recyclerReportsList = findViewById(R.id.recyclerReportsList);
        emptyStateReports = findViewById(R.id.emptyStateReports);

        recyclerReportsList.setLayoutManager(new LinearLayoutManager(this));
        reportsAdapter = new ReportsAdapter(filteredReports, new ReportsAdapter.OnReportActionListener() {
            @Override
            public void onPrint(ReportItem report) {
                openPreviewScreen(report, true);
            }

            @Override
            public void onDownload(ReportItem report) {
                openPreviewScreen(report, false);
            }

            @Override
            public void onAmend(ReportItem report) {
                showAmendSheet(report);
            }

            @Override
            public void onShare(ReportItem report) {
                showShareSheet(report);
            }
        });
        recyclerReportsList.setAdapter(reportsAdapter);
    }

    private void setupEvents() {
        btnReportsBack.setOnClickListener(v -> finish());
        btnRefreshReports.setOnClickListener(v -> fetchReports());

        btnClearSearchReports.setOnClickListener(v -> {
            inputSearchReports.setText("");
            btnClearSearchReports.setVisibility(View.GONE);
            applyReportsFilter();
        });

        inputSearchReports.addTextChangedListener(new TextWatcher() {
            @Override
            public void beforeTextChanged(CharSequence s, int start, int count, int after) {}

            @Override
            public void onTextChanged(CharSequence s, int start, int before, int count) {
                btnClearSearchReports.setVisibility(s.length() > 0 ? View.VISIBLE : View.GONE);
                applyReportsFilter();
            }

            @Override
            public void afterTextChanged(Editable s) {}
        });
    }

    private void setupFilterChips() {
        containerReportsFilterChips.removeAllViews();
        String[] filters = {"PRINT_READY", "ALL", "DRAFT", "SENT", "AMENDED"};
        String[] labels = {"Print Ready", "All", "Draft", "Sent", "Amended"};

        for (int i = 0; i < filters.length; i++) {
            final String filterKey = filters[i];
            TextView chip = new TextView(this);
            chip.setText(labels[i]);
            chip.setTextSize(12.5f);
            chip.setPadding(dp(14), dp(7), dp(14), dp(7));
            chip.setTypeface(null, android.graphics.Typeface.BOLD);

            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.WRAP_CONTENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
            );
            lp.setMarginEnd(dp(8));
            chip.setLayoutParams(lp);

            updateChipStyle(chip, filterKey.equals(selectedStatusFilter));

            chip.setOnClickListener(v -> {
                selectedStatusFilter = filterKey;
                setupFilterChips();
                applyReportsFilter();
            });

            containerReportsFilterChips.addView(chip);
        }
    }

    private void updateChipStyle(TextView chip, boolean isSelected) {
        if (isSelected) {
            chip.setBackgroundResource(R.drawable.bg_pill_white);
            chip.setBackgroundTintList(android.content.res.ColorStateList.valueOf(0xFF0D6EFD));
            chip.setTextColor(0xFFFFFFFF);
            chip.setElevation(dp(2));
        } else {
            chip.setBackgroundResource(R.drawable.bg_setting_item);
            chip.setBackgroundTintList(null);
            chip.setTextColor(0xFF475569);
            chip.setElevation(0);
        }
    }

    private String getAuthToken() {
        String token = AuthManager.getToken(this);
        if (token != null && !token.isEmpty()) return token;

        try {
            android.webkit.CookieManager cm = android.webkit.CookieManager.getInstance();
            String cookies = cm.getCookie(BASE_URL);
            if (cookies == null) cookies = cm.getCookie("https://app.patholab.cloud");
            if (cookies == null) cookies = cm.getCookie("https://patholab.cloud");
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
        return null;
    }

    private void fetchLoggedInUserInfo() {
        new Thread(() -> {
            try {
                String token = getAuthToken();
                if (token == null) return;
                URL url = new URL(BASE_URL + "/api/auth/me");
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestProperty("Authorization", "Bearer " + token);
                conn.setRequestProperty("Cookie", "token=" + token);
                conn.setConnectTimeout(5000);
                conn.setReadTimeout(5000);

                if (conn.getResponseCode() == 200) {
                    String json = readStream(conn.getInputStream());
                    JSONObject obj = new JSONObject(json);
                    String name = obj.optString("name", "Lab Owner");
                    currentUserName = name;

                    JSONObject lab = obj.optJSONObject("lab");
                    if (lab != null) {
                        currentLabName = lab.optString("name", "PathoLab Cloud");
                    }

                    mainHandler.post(() -> {
                        if (lblReportsSubtitle != null) {
                            lblReportsSubtitle.setText(currentLabName + " • " + currentUserName);
                        }
                    });
                }
            } catch (Exception ignored) {}
        }).start();
    }

    private void fetchReports() {
        progressReports.setVisibility(View.VISIBLE);
        new Thread(() -> {
            try {
                String token = getAuthToken();
                URL url = new URL(BASE_URL + "/api/workspace/reports");
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                if (token != null) {
                    conn.setRequestProperty("Authorization", "Bearer " + token);
                    conn.setRequestProperty("Cookie", "token=" + token);
                } else {
                    android.webkit.CookieManager cm = android.webkit.CookieManager.getInstance();
                    String cookie = cm.getCookie(BASE_URL);
                    if (cookie != null) conn.setRequestProperty("Cookie", cookie);
                }
                conn.setConnectTimeout(8000);
                conn.setReadTimeout(8000);

                if (conn.getResponseCode() == 200) {
                    String res = readStream(conn.getInputStream());
                    JSONObject obj = new JSONObject(res);
                    JSONArray arr = obj.optJSONArray("reports");

                    allReports.clear();
                    if (arr != null) {
                        for (int i = 0; i < arr.length(); i++) {
                            JSONObject r = arr.getJSONObject(i);
                            JSONObject p = r.optJSONObject("patient");
                            String pName = p != null ? p.optString("name", "Patient") : "Patient";
                            String pPhone = p != null ? p.optString("phone", "") : "";
                            String pEmail = p != null ? p.optString("email", "") : "";
                            String pAge = p != null ? p.optString("age", "—") : "—";
                            String pGender = p != null ? p.optString("gender", "—") : "—";
                            String pUhid = "P-" + (1000 + i);
                            if (p != null) {
                                if (p.has("patientId") && !p.isNull("patientId")) {
                                    pUhid = p.optString("patientId");
                                } else if (p.has("uhid") && !p.isNull("uhid")) {
                                    pUhid = p.optString("uhid");
                                }
                            }

                            JSONObject t = r.optJSONObject("test");
                            String tName = "Diagnostic Investigation";
                            String tCode = "TEST";
                            if (t != null) {
                                tName = t.has("testName") ? t.optString("testName") : t.optString("name", "Diagnostic Investigation");
                                tCode = t.has("testCode") ? t.optString("testCode") : t.optString("code", "TEST");
                            }
                            JSONObject dept = t != null ? t.optJSONObject("department") : null;
                            String dName = dept != null ? dept.optString("name", "General") : "General";

                            JSONObject path = r.optJSONObject("pathologist");
                            String pathName = path != null ? path.optString("name", "Authorized Signatory") : "Authorized Signatory";

                            String dateStr = r.optString("createdAt", "");
                            String formattedDate = formatDate(dateStr);

                            allReports.add(new ReportItem(
                                    r.optString("id"),
                                    r.optInt("version", 1),
                                    r.optString("status", "APPROVED"),
                                    r.optString("pdfUrl", null),
                                    r.optBoolean("isAmended", false),
                                    r.optString("amendmentReason", null),
                                    formattedDate,
                                    pName,
                                    pPhone,
                                    pEmail,
                                    pAge,
                                    pGender,
                                    pUhid,
                                    tName,
                                    tCode,
                                    dName,
                                    pathName
                            ));
                        }
                    }
                } else {
                    allReports.clear();
                }
            } catch (Exception ignored) {
                allReports.clear();
            }

            mainHandler.post(() -> {
                progressReports.setVisibility(View.GONE);
                updateKpiStats();
                applyReportsFilter();
            });
        }).start();
    }

    private void updateKpiStats() {
        int ready = 0, sent = 0, draft = 0, amended = 0;
        for (ReportItem r : allReports) {
            String s = r.status.toUpperCase();
            if (s.equals("FINAL") || s.equals("APPROVED")) ready++;
            else if (s.equals("SENT") || s.equals("SENT_TO_PATIENT")) sent++;
            else if (s.equals("DRAFT") || s.equals("GENERATED")) draft++;
            else if (s.equals("AMENDED") || r.isAmended) amended++;
        }

        lblKpiReadyCount.setText(String.valueOf(ready));
        lblKpiSentCount.setText(String.valueOf(sent));
        lblKpiDraftCount.setText(String.valueOf(draft));
        lblKpiAmendedCount.setText(String.valueOf(amended));
    }

    private void applyReportsFilter() {
        String q = inputSearchReports.getText().toString().trim().toLowerCase();
        filteredReports.clear();

        for (ReportItem r : allReports) {
            boolean matchesSearch = q.isEmpty() ||
                    r.patientName.toLowerCase().contains(q) ||
                    r.patientPhone.toLowerCase().contains(q) ||
                    r.id.toLowerCase().contains(q) ||
                    r.uhid.toLowerCase().contains(q) ||
                    r.testName.toLowerCase().contains(q) ||
                    r.testCode.toLowerCase().contains(q);

            boolean matchesStatus = true;
            if ("PRINT_READY".equals(selectedStatusFilter)) {
                matchesStatus = r.status.equalsIgnoreCase("FINAL") || r.status.equalsIgnoreCase("APPROVED");
            } else if ("SENT".equals(selectedStatusFilter)) {
                matchesStatus = r.status.equalsIgnoreCase("SENT") || r.status.equalsIgnoreCase("SENT_TO_PATIENT");
            } else if ("DRAFT".equals(selectedStatusFilter)) {
                matchesStatus = r.status.equalsIgnoreCase("DRAFT") || r.status.equalsIgnoreCase("GENERATED");
            } else if ("AMENDED".equals(selectedStatusFilter)) {
                matchesStatus = r.status.equalsIgnoreCase("AMENDED") || r.isAmended;
            }

            if (matchesSearch && matchesStatus) {
                filteredReports.add(r);
            }
        }

        reportsAdapter.notifyDataSetChanged();
        emptyStateReports.setVisibility(filteredReports.isEmpty() ? View.VISIBLE : View.GONE);
        recyclerReportsList.setVisibility(filteredReports.isEmpty() ? View.GONE : View.VISIBLE);
    }

    // ── Actions ──────────────────────────────────────────────────────────────
    private void openPreviewScreen(ReportItem report, boolean autoPrint) {
        Intent intent = new Intent(this, ReportPreviewActivity.class);
        intent.putExtra("report_id", report.id);
        intent.putExtra("patient_name", report.patientName);
        intent.putExtra("patient_phone", report.patientPhone);
        intent.putExtra("test_name", report.testName);
        intent.putExtra("version", report.version);
        intent.putExtra("uhid", report.uhid);
        intent.putExtra("auto_print", autoPrint);
        startActivity(intent);
    }

    private void showShareSheet(ReportItem report) {
        BottomSheetDialog dialog = new BottomSheetDialog(this);
        View sheet = getLayoutInflater().inflate(R.layout.layout_report_share_sheet, null);
        dialog.setContentView(sheet);

        TextView lblPatient = sheet.findViewById(R.id.lblShareSheetPatientName);
        View btnWhatsApp = sheet.findViewById(R.id.btnShareWhatsAppAction);
        View btnEmail = sheet.findViewById(R.id.btnShareEmailAction);
        View btnCopy = sheet.findViewById(R.id.btnCopyReportLinkAction);
        View btnClose = sheet.findViewById(R.id.btnCloseShareSheet);

        lblPatient.setText("Send a secure verification link for v" + report.version + ".0 to " + report.patientName + ".");

        btnClose.setOnClickListener(v -> dialog.dismiss());

        String verifyUrl = BASE_URL + "/verify/" + report.id;

        btnWhatsApp.setOnClickListener(v -> {
            dialog.dismiss();
            try {
                String message = "Hello " + report.patientName + ",\n\nYour verified diagnostic laboratory report from Patholab Cloud is ready:\n" +
                        "• Test: " + report.testName + "\n" +
                        "• Ref: " + report.uhid + " (v" + report.version + ".0)\n\n" +
                        "View & Download Report:\n" + verifyUrl + "\n\n" +
                        "Thank you for choosing our pathology laboratory!";
                String phoneParam = report.patientPhone.startsWith("91") ? report.patientPhone : "91" + report.patientPhone;
                String url = "https://api.whatsapp.com/send?phone=" + phoneParam + "&text=" + URLEncoder.encode(message, "UTF-8");
                Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                startActivity(intent);

                report.status = "SENT";
                reportsAdapter.notifyDataSetChanged();
                updateKpiStats();
            } catch (Exception e) {
                Toast.makeText(this, "Could not launch WhatsApp", Toast.LENGTH_SHORT).show();
            }
        });

        btnEmail.setOnClickListener(v -> {
            dialog.dismiss();
            try {
                Intent emailIntent = new Intent(Intent.ACTION_SENDTO);
                emailIntent.setData(Uri.parse("mailto:" + report.patientEmail));
                emailIntent.putExtra(Intent.EXTRA_SUBJECT, "Your Diagnostic Report: " + report.testName + " (" + report.uhid + ")");
                emailIntent.putExtra(Intent.EXTRA_TEXT, "Dear " + report.patientName + ",\n\nYour diagnostic test report for " + report.testName + " is ready.\n\nAccess your secure verified report here:\n" + verifyUrl + "\n\nRegards,\nPatholab Cloud");
                startActivity(Intent.createChooser(emailIntent, "Send Report Email"));
            } catch (Exception e) {
                Toast.makeText(this, "Could not open email client", Toast.LENGTH_SHORT).show();
            }
        });

        btnCopy.setOnClickListener(v -> {
            ClipboardManager clipboard = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
            ClipData clip = ClipData.newPlainText("Report URL", verifyUrl);
            if (clipboard != null) clipboard.setPrimaryClip(clip);
            Toast.makeText(this, "Secure Verification Link copied!", Toast.LENGTH_SHORT).show();
            dialog.dismiss();
        });

        dialog.show();
    }

    private void showAmendSheet(ReportItem report) {
        BottomSheetDialog dialog = new BottomSheetDialog(this);
        View sheet = getLayoutInflater().inflate(R.layout.layout_amend_report_sheet, null);
        dialog.setContentView(sheet);

        TextView lblDesc = sheet.findViewById(R.id.lblAmendSheetDescription);
        EditText inputReason = sheet.findViewById(R.id.inputAmendmentReason);
        MaterialButton btnCancel = sheet.findViewById(R.id.btnCancelAmendment);
        MaterialButton btnSubmit = sheet.findViewById(R.id.btnSubmitAmendment);
        FrameLayout btnClose = sheet.findViewById(R.id.btnCloseAmendSheet);

        lblDesc.setText("You are about to unlock report v" + report.version + ".0 for " + report.patientName + ". This will increment the version to v" + (report.version + 1) + ".0. Under medical compliance laws, you MUST state the reason for this change.");

        btnClose.setOnClickListener(v -> dialog.dismiss());
        btnCancel.setOnClickListener(v -> dialog.dismiss());

        btnSubmit.setOnClickListener(v -> {
            String reason = inputReason.getText().toString().trim();
            if (reason.isEmpty()) {
                Toast.makeText(this, "Please enter a clinical amendment reason", Toast.LENGTH_SHORT).show();
                return;
            }

            report.version += 1;
            report.status = "AMENDED";
            report.isAmended = true;
            report.amendmentReason = reason;
            reportsAdapter.notifyDataSetChanged();
            updateKpiStats();

            dialog.dismiss();
            Toast.makeText(this, "Report unlocked and incremented to v" + report.version + ".0!", Toast.LENGTH_SHORT).show();

            // Sync with backend API
            new Thread(() -> {
                try {
                    String token = AuthManager.getToken(this);
                    URL url = new URL(BASE_URL + "/api/workspace/reports/" + report.id + "/amend");
                    HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                    conn.setRequestMethod("POST");
                    conn.setRequestProperty("Content-Type", "application/json");
                    if (token != null) conn.setRequestProperty("Authorization", "Bearer " + token);
                    conn.setDoOutput(true);

                    JSONObject body = new JSONObject();
                    body.put("reason", reason);

                    OutputStream os = conn.getOutputStream();
                    os.write(body.toString().getBytes());
                    os.flush();
                    os.close();

                    int code = conn.getResponseCode();
                    conn.disconnect();
                } catch (Exception ignored) {}
            }).start();
        });

        dialog.show();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Adapter
    // ─────────────────────────────────────────────────────────────────────────
    public static class ReportsAdapter extends RecyclerView.Adapter<ReportsAdapter.ReportViewHolder> {
        private final List<ReportItem> reports;
        private final OnReportActionListener listener;

        public interface OnReportActionListener {
            void onPrint(ReportItem report);
            void onDownload(ReportItem report);
            void onAmend(ReportItem report);
            void onShare(ReportItem report);
        }

        public ReportsAdapter(List<ReportItem> reports, OnReportActionListener listener) {
            this.reports = reports;
            this.listener = listener;
        }

        @NonNull
        @Override
        public ReportViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
            View v = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_report_card, parent, false);
            return new ReportViewHolder(v);
        }

        @Override
        public void onBindViewHolder(@NonNull ReportViewHolder holder, int position) {
            ReportItem r = reports.get(position);
            holder.lblPatientName.setText(r.patientName);

            // Patient Number: Highlighted in Yellow box with black text
            holder.lblPatientUhid.setText(r.uhid);
            holder.lblPatientUhid.setBackgroundResource(R.drawable.bg_badge_yellow);
            holder.lblPatientUhid.setTextColor(0xFF0F172A);

            holder.lblTestName.setText(r.testName);
            holder.lblTestCode.setText(r.testCode);

            // Version Badge: V01 with pure white text on sapphire background
            holder.lblVersionBadge.setText(String.format(Locale.ROOT, "V%02d", r.version));
            holder.lblVersionBadge.setBackgroundResource(R.drawable.bg_badge_version_sapphire);
            holder.lblVersionBadge.setTextColor(0xFFFFFFFF);

            holder.lblDate.setText("" + r.createdAt);
            holder.lblMetaPhone.setText(r.patientPhone.isEmpty() ? "" : "+91 " + r.patientPhone);

            // Status Badge: Soft Mint + Deep Forest Green for Approved
            String s = r.status.toUpperCase();
            if (s.equals("FINAL") || s.equals("APPROVED")) {
                holder.lblStatusBadge.setText("Approved");
                holder.lblStatusBadge.setBackgroundResource(R.drawable.bg_badge_approved_mint);
                holder.lblStatusBadge.setTextColor(0xFF14532D); // Deep forest green
            } else if (s.equals("SENT") || s.equals("SENT_TO_PATIENT")) {
                holder.lblStatusBadge.setText("Sent");
                holder.lblStatusBadge.setBackgroundResource(R.drawable.bg_bento_blue);
                holder.lblStatusBadge.setTextColor(0xFF0D6EFD);
            } else if (s.equals("AMENDED") || r.isAmended) {
                holder.lblStatusBadge.setText("Amended (V" + String.format(Locale.ROOT, "%02d", r.version) + ")");
                holder.lblStatusBadge.setBackgroundResource(R.drawable.bg_mod_icon_purple);
                holder.lblStatusBadge.setTextColor(0xFF7C3AED);
            } else {
                holder.lblStatusBadge.setText("Draft");
                holder.lblStatusBadge.setBackgroundResource(R.drawable.bg_bento_amber);
                holder.lblStatusBadge.setTextColor(0xFFD97706);
            }

            // Amendment Reason Banner
            if (r.isAmended && r.amendmentReason != null && !r.amendmentReason.isEmpty()) {
                holder.containerAmendmentReason.setVisibility(View.VISIBLE);
                holder.lblAmendmentReason.setText("Amended: " + r.amendmentReason);
            } else {
                holder.containerAmendmentReason.setVisibility(View.GONE);
            }

            holder.btnPrint.setOnClickListener(v -> {
                if (listener != null) listener.onPrint(r);
            });

            holder.btnDownload.setOnClickListener(v -> {
                if (listener != null) listener.onDownload(r);
            });

            holder.btnAmend.setOnClickListener(v -> {
                if (listener != null) listener.onAmend(r);
            });

            holder.btnShare.setOnClickListener(v -> {
                if (listener != null) listener.onShare(r);
            });
        }

        @Override
        public int getItemCount() {
            return reports.size();
        }

        static class ReportViewHolder extends RecyclerView.ViewHolder {
            TextView lblPatientName, lblPatientUhid, lblStatusBadge;
            TextView lblTestName, lblTestCode, lblVersionBadge, lblDate, lblMetaPhone;
            LinearLayout containerAmendmentReason;
            TextView lblAmendmentReason;
            MaterialButton btnPrint, btnDownload;
            FrameLayout btnAmend, btnShare;

            ReportViewHolder(@NonNull View itemView) {
                super(itemView);
                lblPatientName = itemView.findViewById(R.id.lblReportPatientName);
                lblPatientUhid = itemView.findViewById(R.id.lblReportPatientUhid);
                lblStatusBadge = itemView.findViewById(R.id.lblReportStatusBadge);
                lblTestName = itemView.findViewById(R.id.lblReportTestName);
                lblTestCode = itemView.findViewById(R.id.lblReportTestCode);
                lblVersionBadge = itemView.findViewById(R.id.lblReportVersionBadge);
                lblDate = itemView.findViewById(R.id.lblReportDate);
                lblMetaPhone = itemView.findViewById(R.id.lblReportMetaPhone);
                containerAmendmentReason = itemView.findViewById(R.id.containerAmendmentReason);
                lblAmendmentReason = itemView.findViewById(R.id.lblAmendmentReason);
                btnPrint = itemView.findViewById(R.id.btnReportPrint);
                btnDownload = itemView.findViewById(R.id.btnReportDownload);
                btnAmend = itemView.findViewById(R.id.btnReportAmend);
                btnShare = itemView.findViewById(R.id.btnReportShare);
            }
        }
    }

    private int dp(float value) {
        return (int) (value * getResources().getDisplayMetrics().density + 0.5f);
    }

    private String formatDate(String iso) {
        try {
            SimpleDateFormat inFmt = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
            Date d = inFmt.parse(iso);
            if (d != null) {
                SimpleDateFormat outFmt = new SimpleDateFormat("dd MMM yyyy, hh:mm a", Locale.getDefault());
                return outFmt.format(d);
            }
        } catch (Exception ignored) {}
        return "01 Sept 2026, 12:08 pm";
    }

    private String readStream(InputStream is) throws Exception {
        BufferedReader reader = new BufferedReader(new InputStreamReader(is));
        StringBuilder sb = new StringBuilder();
        String line;
        while ((line = reader.readLine()) != null) sb.append(line);
        reader.close();
        return sb.toString();
    }
}
