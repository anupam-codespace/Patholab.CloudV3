package cloud.patholab.app;

import android.annotation.SuppressLint;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.Spinner;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.google.android.material.bottomsheet.BottomSheetDialog;
import com.google.android.material.floatingactionbutton.ExtendedFloatingActionButton;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;
import java.util.TimeZone;

import cloud.patholab.app.auth.AuthManager;

/**
 * Native Independent Sample & Specimen Tracking Console
 * Manages phlebotomy queues, vacutainer container tube types,
 * barcode label generation, specimen quality inspection, and NABL rejection logs.
 */
public class SamplesActivity extends AppCompatActivity {

    private static final String BASE_URL = "https://app.patholab.cloud";

    private FrameLayout btnSamplesBack, btnRefreshSamples, btnScanBarcodeHeader;
    private TextView lblSamplesSubtitle;
    private TextView lblKpiTotalSamples, lblKpiPendingSamples, lblKpiProcessingSamples, lblKpiRejectedSamples;
    private EditText inputSearchSamples;
    private ImageView btnClearSearchSamples;
    private LinearLayout containerSamplesFilterChips;
    private ProgressBar progressSamples;
    private RecyclerView recyclerSamplesList;
    private LinearLayout emptyStateSamples;
    private ExtendedFloatingActionButton fabAccessionSample;

    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private final List<SpecimenItem> allSamples = new ArrayList<>();
    private final List<SpecimenItem> filteredSamples = new ArrayList<>();
    private SamplesAdapter samplesAdapter;

    private String selectedStatusFilter = "ALL";
    private String currentLabName = "PathoLab Cloud";
    private String currentUserName = "Phlebotomy Tech";

    public static class SpecimenItem {
        public String id;
        public String barcode;
        public String patientName;
        public String patientDetails;
        public String uhid;
        public String tubeEmoji;
        public String tubeTypeName;
        public int tubeBgColor;
        public int tubeTextColor;
        public String testsAssigned;
        public String department;
        public String collectionInfo;
        public String status; // COLLECTED, PENDING, IN_ANALYZER, REJECTED
        public String rejectionReason;

        public SpecimenItem(String id, String barcode, String patientName, String patientDetails,
                            String uhid, String tubeEmoji, String tubeTypeName, int tubeBgColor,
                            int tubeTextColor, String testsAssigned, String department,
                            String collectionInfo, String status, String rejectionReason) {
            this.id = id;
            this.barcode = barcode;
            this.patientName = patientName;
            this.patientDetails = patientDetails;
            this.uhid = uhid;
            this.tubeEmoji = tubeEmoji;
            this.tubeTypeName = tubeTypeName;
            this.tubeBgColor = tubeBgColor;
            this.tubeTextColor = tubeTextColor;
            this.testsAssigned = testsAssigned;
            this.department = department;
            this.collectionInfo = collectionInfo;
            this.status = status;
            this.rejectionReason = rejectionReason;
        }
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        StatusBarHelper.setStatusBarSapphire(this);
        setContentView(R.layout.activity_samples);

        initViews();
        setupEvents();
        setupFilterChips();
        fetchLoggedInUserInfo();
        fetchSamples();
    }

    private void initViews() {
        btnSamplesBack = findViewById(R.id.btnSamplesBack);
        btnRefreshSamples = findViewById(R.id.btnRefreshSamples);
        btnScanBarcodeHeader = findViewById(R.id.btnScanBarcodeHeader);
        lblSamplesSubtitle = findViewById(R.id.lblSamplesSubtitle);
        lblKpiTotalSamples = findViewById(R.id.lblKpiTotalSamples);
        lblKpiPendingSamples = findViewById(R.id.lblKpiPendingSamples);
        lblKpiProcessingSamples = findViewById(R.id.lblKpiProcessingSamples);
        lblKpiRejectedSamples = findViewById(R.id.lblKpiRejectedSamples);
        inputSearchSamples = findViewById(R.id.inputSearchSamples);
        btnClearSearchSamples = findViewById(R.id.btnClearSearchSamples);
        containerSamplesFilterChips = findViewById(R.id.containerSamplesFilterChips);
        progressSamples = findViewById(R.id.progressSamples);
        recyclerSamplesList = findViewById(R.id.recyclerSamplesList);
        emptyStateSamples = findViewById(R.id.emptyStateSamples);
        fabAccessionSample = findViewById(R.id.fabAccessionSample);

        recyclerSamplesList.setLayoutManager(new LinearLayoutManager(this));
        samplesAdapter = new SamplesAdapter(filteredSamples, new SamplesAdapter.OnSampleActionListener() {
            @Override
            public void onPrintBarcode(SpecimenItem sample) {
                showBarcodePrintDialog(sample);
            }

            @Override
            public void onCollectOrAccept(SpecimenItem sample) {
                if (sample.status.equalsIgnoreCase("COLLECTED")) {
                    sample.status = "IN_ANALYZER";
                    Toast.makeText(SamplesActivity.this, "Specimen " + sample.barcode + " transferred to Analyzer.", Toast.LENGTH_SHORT).show();
                } else {
                    sample.status = "COLLECTED";
                    sample.collectionInfo = "Just now  •  Phleb. " + currentUserName;
                    Toast.makeText(SamplesActivity.this, "Specimen " + sample.barcode + " collected & accessioned.", Toast.LENGTH_SHORT).show();
                }
                updateKpiStats();
                applySamplesFilter();
            }

            @Override
            public void onReject(SpecimenItem sample) {
                showRejectSheet(sample);
            }

            @Override
            public void onDetails(SpecimenItem sample) {
                showSpecimenDetailModal(sample);
            }
        });
        recyclerSamplesList.setAdapter(samplesAdapter);
    }

    private void setupEvents() {
        btnSamplesBack.setOnClickListener(v -> finish());
        btnRefreshSamples.setOnClickListener(v -> fetchSamples());

        btnScanBarcodeHeader.setOnClickListener(v -> {
            Toast.makeText(this, "Barcode Scanner Active. Point camera at vacutainer tube.", Toast.LENGTH_SHORT).show();
        });

        fabAccessionSample.setOnClickListener(v -> showAccessionSheet());

        btnClearSearchSamples.setOnClickListener(v -> {
            inputSearchSamples.setText("");
            btnClearSearchSamples.setVisibility(View.GONE);
            applySamplesFilter();
        });

        inputSearchSamples.addTextChangedListener(new TextWatcher() {
            @Override
            public void beforeTextChanged(CharSequence s, int start, int count, int after) {}

            @Override
            public void onTextChanged(CharSequence s, int start, int before, int count) {
                btnClearSearchSamples.setVisibility(s.length() > 0 ? View.VISIBLE : View.GONE);
                applySamplesFilter();
            }

            @Override
            public void afterTextChanged(Editable s) {}
        });
    }

    private void setupFilterChips() {
        containerSamplesFilterChips.removeAllViews();
        String[] filters = {"ALL", "COLLECTED", "PENDING", "PROCESSING", "REJECTED"};
        String[] labels = {"All Specimens", "Collected", "Phlebotomy Due", "Under Testing", "Rejected"};

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
                applySamplesFilter();
            });

            containerSamplesFilterChips.addView(chip);
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
                    String name = obj.optString("name", "Phlebotomy Tech");
                    currentUserName = name;
                    JSONObject lab = obj.optJSONObject("lab");
                    if (lab != null) {
                        currentLabName = lab.optString("name", "PathoLab Cloud");
                    }
                    String finalLab = currentLabName;
                    String finalUser = currentUserName;
                    mainHandler.post(() -> {
                        if (lblSamplesSubtitle != null) {
                            lblSamplesSubtitle.setText(finalLab + " • " + finalUser);
                        }
                    });
                }
            } catch (Exception ignored) {}
        }).start();
    }

    private void fetchSamples() {
        progressSamples.setVisibility(View.VISIBLE);
        new Thread(() -> {
            try {
                String token = getAuthToken();
                URL url = new URL(BASE_URL + "/api/workspace/accession?limit=50");
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
                    JSONArray arr = obj.optJSONArray("data");

                    allSamples.clear();
                    if (arr != null) {
                        for (int i = 0; i < arr.length(); i++) {
                            JSONObject t = arr.getJSONObject(i);
                            JSONObject p = t.optJSONObject("patient");
                            String pName = p != null ? p.optString("name", "Patient") : "Patient";
                            String pId = p != null ? p.optString("patientId", "P-" + (1000 + i)) : "P-" + (1000 + i);
                            String pGender = p != null ? p.optString("gender", "MALE") : "MALE";
                            int pAge = p != null ? p.optInt("age", 0) : 0;
                            String pDetails = (pAge > 0 ? (pAge + " Yrs • ") : "") + pGender + " • " + pId;

                            JSONObject smp = t.optJSONObject("sample");
                            String smpBarcode = smp != null ? smp.optString("sampleId", "SMP-" + (10000 + i)) : ("SMP-" + (10000 + i));
                            String smpStatus = smp != null ? smp.optString("status", t.optString("status", "COLLECTED")) : t.optString("status", "COLLECTED");

                            String tName = t.optString("testName", "Diagnostic Panel");
                            String created = t.optString("createdAt", "");

                            allSamples.add(new SpecimenItem(
                                    t.optString("id", "smp_" + i),
                                    smpBarcode,
                                    pName,
                                    pDetails,
                                    pId,
                                    "SST",
                                    "Specimen",
                                    0xFFFEF9C3,
                                    0xFFA16207,
                                    tName,
                                    "General",
                                    formatDate(created),
                                    smpStatus,
                                    null
                            ));
                        }
                    }
                } else {
                    allSamples.clear();
                }
            } catch (Exception ignored) {
                allSamples.clear();
            }

            mainHandler.post(() -> {
                progressSamples.setVisibility(View.GONE);
                updateKpiStats();
                applySamplesFilter();
            });
        }).start();
    }

    private void updateKpiStats() {
        int total = allSamples.size();
        int pending = 0;
        int processing = 0;
        int rejected = 0;

        for (SpecimenItem s : allSamples) {
            String st = s.status.toUpperCase();
            if (st.equals("PENDING") || st.equals("DUE")) pending++;
            else if (st.equals("IN_ANALYZER") || st.equals("PROCESSING")) processing++;
            else if (st.equals("REJECTED")) rejected++;
        }

        lblKpiTotalSamples.setText(String.valueOf(total));
        lblKpiPendingSamples.setText(String.valueOf(pending));
        lblKpiProcessingSamples.setText(String.valueOf(processing));
        lblKpiRejectedSamples.setText(String.valueOf(rejected));
    }

    private void applySamplesFilter() {
        String q = inputSearchSamples.getText().toString().trim().toLowerCase(Locale.ROOT);
        filteredSamples.clear();

        for (SpecimenItem s : allSamples) {
            boolean matchesSearch = q.isEmpty()
                    || s.barcode.toLowerCase(Locale.ROOT).contains(q)
                    || s.patientName.toLowerCase(Locale.ROOT).contains(q)
                    || s.uhid.toLowerCase(Locale.ROOT).contains(q)
                    || s.testsAssigned.toLowerCase(Locale.ROOT).contains(q)
                    || s.tubeTypeName.toLowerCase(Locale.ROOT).contains(q);

            boolean matchesStatus = true;
            if (selectedStatusFilter.equals("COLLECTED")) {
                matchesStatus = s.status.equalsIgnoreCase("COLLECTED");
            } else if (selectedStatusFilter.equals("PENDING")) {
                matchesStatus = s.status.equalsIgnoreCase("PENDING") || s.status.equalsIgnoreCase("DUE");
            } else if (selectedStatusFilter.equals("PROCESSING")) {
                matchesStatus = s.status.equalsIgnoreCase("IN_ANALYZER") || s.status.equalsIgnoreCase("PROCESSING");
            } else if (selectedStatusFilter.equals("REJECTED")) {
                matchesStatus = s.status.equalsIgnoreCase("REJECTED");
            }

            if (matchesSearch && matchesStatus) {
                filteredSamples.add(s);
            }
        }

        samplesAdapter.notifyDataSetChanged();
        emptyStateSamples.setVisibility(filteredSamples.isEmpty() ? View.VISIBLE : View.GONE);
        recyclerSamplesList.setVisibility(filteredSamples.isEmpty() ? View.GONE : View.VISIBLE);
    }

    // ── Dialogs & Bottom Sheets ──────────────────────────────────────────────
    private void showBarcodePrintDialog(SpecimenItem sample) {
        View dialogView = LayoutInflater.from(this).inflate(R.layout.layout_barcode_print_dialog, null);
        AlertDialog dialog = new AlertDialog.Builder(this)
                .setView(dialogView)
                .create();

        if (dialog.getWindow() != null) {
            dialog.getWindow().setBackgroundDrawableResource(android.R.color.transparent);
        }

        TextView lblLabelPatientName = dialogView.findViewById(R.id.lblLabelPatientName);
        TextView lblLabelPatientDemographics = dialogView.findViewById(R.id.lblLabelPatientDemographics);
        TextView lblLabelBarcodeNumber = dialogView.findViewById(R.id.lblLabelBarcodeNumber);
        TextView lblLabelTests = dialogView.findViewById(R.id.lblLabelTests);
        Button btnCloseBarcodeDialog = dialogView.findViewById(R.id.btnCloseBarcodeDialog);
        Button btnPrintBarcodeDirect = dialogView.findViewById(R.id.btnPrintBarcodeDirect);

        lblLabelPatientName.setText(sample.patientName);
        lblLabelPatientDemographics.setText(sample.uhid + " (" + sample.tubeTypeName + ")");
        lblLabelBarcodeNumber.setText("*" + sample.barcode + "*");
        lblLabelTests.setText(sample.testsAssigned);

        btnCloseBarcodeDialog.setOnClickListener(v -> dialog.dismiss());
        btnPrintBarcodeDirect.setOnClickListener(v -> {
            dialog.dismiss();
            Toast.makeText(this, "Spooling 50x25mm Label Sticker to Thermal Printer...", Toast.LENGTH_LONG).show();
        });

        dialog.show();
    }

    private void showRejectSheet(SpecimenItem sample) {
        BottomSheetDialog sheet = new BottomSheetDialog(this);
        View sheetView = LayoutInflater.from(this).inflate(R.layout.layout_reject_sample_sheet, null);
        sheet.setContentView(sheetView);

        TextView lblRejectSampleSubtitle = sheetView.findViewById(R.id.lblRejectSampleSubtitle);
        Spinner spinnerRejectReason = sheetView.findViewById(R.id.spinnerRejectReason);
        EditText inputRejectNotes = sheetView.findViewById(R.id.inputRejectNotes);
        Button btnCancelReject = sheetView.findViewById(R.id.btnCancelReject);
        Button btnConfirmReject = sheetView.findViewById(R.id.btnConfirmReject);

        lblRejectSampleSubtitle.setText("Flag " + sample.barcode + " (" + sample.patientName + ") for quality rejection.");

        String[] reasons = {
                "In-vitro Hemolysis (RBC Breakdown)",
                "Clotted Specimen (EDTA/Citrate Inadequate Mixing)",
                "Quantity Not Sufficient (QNS)",
                "Incorrect Container / Tube Type Used",
                "Lipemic / Icteric Specimen Interference",
                "Specimen Container Damaged / Leaked"
        };
        ArrayAdapter<String> adapter = new ArrayAdapter<>(this, android.R.layout.simple_spinner_dropdown_item, reasons);
        spinnerRejectReason.setAdapter(adapter);

        btnCancelReject.setOnClickListener(v -> sheet.dismiss());
        btnConfirmReject.setOnClickListener(v -> {
            String selectedReason = (String) spinnerRejectReason.getSelectedItem();
            String notes = inputRejectNotes.getText().toString().trim();
            sample.status = "REJECTED";
            sample.rejectionReason = selectedReason + (notes.isEmpty() ? "" : " - " + notes);
            sheet.dismiss();
            updateKpiStats();
            applySamplesFilter();
            Toast.makeText(this, "Specimen " + sample.barcode + " flagged as REJECTED.", Toast.LENGTH_LONG).show();
        });

        sheet.show();
    }

    private void showAccessionSheet() {
        BottomSheetDialog sheet = new BottomSheetDialog(this);
        View sheetView = LayoutInflater.from(this).inflate(R.layout.layout_accession_sample_sheet, null);
        sheet.setContentView(sheetView);

        EditText inputAccessionPatient = sheetView.findViewById(R.id.inputAccessionPatient);
        Spinner spinnerTubeType = sheetView.findViewById(R.id.spinnerTubeType);
        EditText inputAccessionTests = sheetView.findViewById(R.id.inputAccessionTests);
        EditText inputPhlebotomistName = sheetView.findViewById(R.id.inputPhlebotomistName);
        Button btnCancelAccession = sheetView.findViewById(R.id.btnCancelAccession);
        Button btnConfirmAccession = sheetView.findViewById(R.id.btnConfirmAccession);

        inputPhlebotomistName.setText(currentUserName);

        String[] tubes = {
                "🟣 EDTA Whole Blood (Lavender Tube)",
                "🟡 Serum Gel / SST (Gold/Yellow Tube)",
                "🔘 Sodium Fluoride / Plasma (Grey Tube)",
                "🟢 Sodium Heparin (Green Tube)",
                "🟠 Sterile Container (Urine/Sputum Cup)"
        };
        ArrayAdapter<String> adapter = new ArrayAdapter<>(this, android.R.layout.simple_spinner_dropdown_item, tubes);
        spinnerTubeType.setAdapter(adapter);

        btnCancelAccession.setOnClickListener(v -> sheet.dismiss());
        btnConfirmAccession.setOnClickListener(v -> {
            String pName = inputAccessionPatient.getText().toString().trim();
            if (pName.isEmpty()) pName = "Walk-in Patient";
            String tests = inputAccessionTests.getText().toString().trim();
            if (tests.isEmpty()) tests = "Routine Investigation";
            String phleb = inputPhlebotomistName.getText().toString().trim();
            if (phleb.isEmpty()) phleb = currentUserName;

            int selectedTubeIdx = spinnerTubeType.getSelectedItemPosition();
            String tubeEmoji = "EDTA";
            String tubeName = "EDTA Whole Blood";
            int tubeBg = 0xFFF3E8FF;
            int tubeText = 0xFF7E22CE;

            if (selectedTubeIdx == 1) {
                tubeEmoji = "SST"; tubeName = "Serum Gel (SST)"; tubeBg = 0xFFFEF9C3; tubeText = 0xFFA16207;
            } else if (selectedTubeIdx == 2) {
                tubeEmoji = "FP"; tubeName = "Fluoride Plasma"; tubeBg = 0xFFF1F5F9; tubeText = 0xFF334155;
            } else if (selectedTubeIdx == 3) {
                tubeEmoji = "HEP"; tubeName = "Sodium Heparin"; tubeBg = 0xFFECFDF5; tubeText = 0xFF15803D;
            } else if (selectedTubeIdx == 4) {
                tubeEmoji = "URINE"; tubeName = "Sterile Urine Cup"; tubeBg = 0xFFFFFBEB; tubeText = 0xFFB45309;
            }

            int newIdNum = 10938 + allSamples.size();
            String barcode = "SMP-" + newIdNum;

            SpecimenItem newSample = new SpecimenItem(
                    "smp_" + newIdNum,
                    barcode,
                    pName.toUpperCase(),
                    "Demographics Recorded • UHID: P-000" + (96 + allSamples.size()),
                    "P-000" + (96 + allSamples.size()),
                    tubeEmoji,
                    tubeName,
                    tubeBg,
                    tubeText,
                    tests,
                    "Pathology",
                    "Just now  •  Phleb. " + phleb,
                    "COLLECTED",
                    null
            );

            allSamples.add(0, newSample);
            sheet.dismiss();
            updateKpiStats();
            applySamplesFilter();
            Toast.makeText(this, "Specimen " + barcode + " accessioned successfully!", Toast.LENGTH_SHORT).show();
            showBarcodePrintDialog(newSample);
        });

        sheet.show();
    }

    private void showSpecimenDetailModal(SpecimenItem sample) {
        AlertDialog.Builder builder = new AlertDialog.Builder(this);
        builder.setTitle("Specimen Details: " + sample.barcode);
        String msg = "Patient: " + sample.patientName + "\n" +
                "UHID: " + sample.uhid + "\n" +
                "Container: " + sample.tubeEmoji + " " + sample.tubeTypeName + "\n" +
                "Tests Assigned: " + sample.testsAssigned + "\n" +
                "Department: " + sample.department + "\n" +
                "Timeline: " + sample.collectionInfo + "\n" +
                "Status: " + sample.status +
                (sample.rejectionReason != null ? "\n\nRejection Note:\n" + sample.rejectionReason : "");

        builder.setMessage(msg);
        builder.setPositiveButton("Print Label", (d, w) -> showBarcodePrintDialog(sample));
        builder.setNegativeButton("Close", null);
        builder.show();
    }

    private int dp(int value) {
        return (int) (value * getResources().getDisplayMetrics().density);
    }

    private String readStream(InputStream stream) throws Exception {
        BufferedReader reader = new BufferedReader(new InputStreamReader(stream, "UTF-8"));
        StringBuilder sb = new StringBuilder();
        String line;
        while ((line = reader.readLine()) != null) sb.append(line);
        reader.close();
        return sb.toString();
    }

    private String formatDate(String isoDate) {
        if (isoDate == null || isoDate.isEmpty()) return "Today";
        try {
            SimpleDateFormat inFmt = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.US);
            inFmt.setTimeZone(TimeZone.getTimeZone("UTC"));
            Date d = inFmt.parse(isoDate);
            if (d != null) {
                SimpleDateFormat outFmt = new SimpleDateFormat("dd MMM yyyy, hh:mm a", Locale.getDefault());
                return outFmt.format(d);
            }
        } catch (Exception ignored) {
            try {
                SimpleDateFormat inFmt2 = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
                Date d = inFmt2.parse(isoDate);
                if (d != null) {
                    SimpleDateFormat outFmt = new SimpleDateFormat("dd MMM yyyy, hh:mm a", Locale.getDefault());
                    return outFmt.format(d);
                }
            } catch (Exception ignored2) {}
        }
        return "Today";
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Recycler Adapter
    // ─────────────────────────────────────────────────────────────────────────
    public static class SamplesAdapter extends RecyclerView.Adapter<SamplesAdapter.ViewHolder> {

        public interface OnSampleActionListener {
            void onPrintBarcode(SpecimenItem sample);
            void onCollectOrAccept(SpecimenItem sample);
            void onReject(SpecimenItem sample);
            void onDetails(SpecimenItem sample);
        }

        private final List<SpecimenItem> list;
        private final OnSampleActionListener listener;

        public SamplesAdapter(List<SpecimenItem> list, OnSampleActionListener listener) {
            this.list = list;
            this.listener = listener;
        }

        @NonNull
        @Override
        public ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
            View v = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_sample_card, parent, false);
            return new ViewHolder(v);
        }

        @Override
        public void onBindViewHolder(@NonNull ViewHolder h, int position) {
            SpecimenItem s = list.get(position);

            if (h.imgTubeColorIndicator != null) {
                h.imgTubeColorIndicator.setColorFilter(s.tubeTextColor);
            }
            h.lblTubeTypeName.setText(s.tubeTypeName);
            h.lblTubeTypeName.setTextColor(s.tubeTextColor);
            h.containerTubeTypeBadge.setBackgroundTintList(android.content.res.ColorStateList.valueOf(s.tubeBgColor));

            h.lblSampleBarcode.setText(s.barcode);
            h.lblSamplePatientName.setText(s.patientName);
            h.lblSamplePatientDetails.setText(s.patientDetails);
            h.lblSampleTestsList.setText(s.testsAssigned);
            h.lblSampleDepartment.setText(s.department);
            h.lblSampleCollectionInfo.setText(s.collectionInfo);

            String status = s.status.toUpperCase();
            if (status.equals("COLLECTED")) {
                h.lblSampleStatusBadge.setText("Collected");
                h.lblSampleStatusBadge.setTextColor(0xFF059669);
                h.lblSampleStatusBadge.setBackgroundTintList(android.content.res.ColorStateList.valueOf(0xFFECFDF5));
                h.btnSampleCollectAccept.setText("Send to Analyzer");
                h.btnSampleCollectAccept.setBackgroundTintList(android.content.res.ColorStateList.valueOf(0xFF0D6EFD));
            } else if (status.equals("IN_ANALYZER") || status.equals("PROCESSING")) {
                h.lblSampleStatusBadge.setText("In Testing");
                h.lblSampleStatusBadge.setTextColor(0xFF0D6EFD);
                h.lblSampleStatusBadge.setBackgroundTintList(android.content.res.ColorStateList.valueOf(0xFFEFF6FF));
                h.btnSampleCollectAccept.setText("Tested");
                h.btnSampleCollectAccept.setBackgroundTintList(android.content.res.ColorStateList.valueOf(0xFF059669));
            } else if (status.equals("REJECTED")) {
                h.lblSampleStatusBadge.setText("Rejected");
                h.lblSampleStatusBadge.setTextColor(0xFFEF4444);
                h.lblSampleStatusBadge.setBackgroundTintList(android.content.res.ColorStateList.valueOf(0xFFFEF2F2));
                h.btnSampleCollectAccept.setText("Redraw Specimen");
                h.btnSampleCollectAccept.setBackgroundTintList(android.content.res.ColorStateList.valueOf(0xFFD97706));
            } else {
                h.lblSampleStatusBadge.setText("Phlebotomy Due");
                h.lblSampleStatusBadge.setTextColor(0xFFD97706);
                h.lblSampleStatusBadge.setBackgroundTintList(android.content.res.ColorStateList.valueOf(0xFFFFFBEB));
                h.btnSampleCollectAccept.setText("Draw Specimen");
                h.btnSampleCollectAccept.setBackgroundTintList(android.content.res.ColorStateList.valueOf(0xFF059669));
            }

            h.btnSamplePrintBarcode.setOnClickListener(v -> listener.onPrintBarcode(s));
            h.btnSampleCollectAccept.setOnClickListener(v -> listener.onCollectOrAccept(s));
            h.btnSampleReject.setOnClickListener(v -> listener.onReject(s));
            h.btnSampleDetails.setOnClickListener(v -> listener.onDetails(s));
        }

        @Override
        public int getItemCount() {
            return list.size();
        }

        public static class ViewHolder extends RecyclerView.ViewHolder {
            LinearLayout containerTubeTypeBadge;
            ImageView imgTubeColorIndicator;
            TextView lblTubeTypeName, lblSampleBarcode, lblSampleStatusBadge;
            TextView lblSamplePatientName, lblSamplePatientDetails, lblSampleTestsList, lblSampleDepartment, lblSampleCollectionInfo;
            TextView btnSamplePrintBarcode, btnSampleCollectAccept;
            FrameLayout btnSampleReject, btnSampleDetails;

            public ViewHolder(@NonNull View itemView) {
                super(itemView);
                containerTubeTypeBadge = itemView.findViewById(R.id.containerTubeTypeBadge);
                imgTubeColorIndicator = itemView.findViewById(R.id.lblTubeColorIndicator);
                lblTubeTypeName = itemView.findViewById(R.id.lblTubeTypeName);
                lblSampleBarcode = itemView.findViewById(R.id.lblSampleBarcode);
                lblSampleStatusBadge = itemView.findViewById(R.id.lblSampleStatusBadge);
                lblSamplePatientName = itemView.findViewById(R.id.lblSamplePatientName);
                lblSamplePatientDetails = itemView.findViewById(R.id.lblSamplePatientDetails);
                lblSampleTestsList = itemView.findViewById(R.id.lblSampleTestsList);
                lblSampleDepartment = itemView.findViewById(R.id.lblSampleDepartment);
                lblSampleCollectionInfo = itemView.findViewById(R.id.lblSampleCollectionInfo);
                btnSamplePrintBarcode = itemView.findViewById(R.id.btnSamplePrintBarcode);
                btnSampleCollectAccept = itemView.findViewById(R.id.btnSampleCollectAccept);
                btnSampleReject = itemView.findViewById(R.id.btnSampleReject);
                btnSampleDetails = itemView.findViewById(R.id.btnSampleDetails);
            }
        }
    }
}
