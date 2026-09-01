package cloud.patholab.app;

import android.animation.ObjectAnimator;
import android.app.Dialog;
import android.content.Intent;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.view.animation.OvershootInterpolator;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.CheckBox;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.Spinner;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
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
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

import cloud.patholab.app.auth.AuthManager;

public class RegistrationActivity extends AppCompatActivity {

    private static final String BASE_URL = "https://patholab.cloud";
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    // ── Header & Omnibar Views ──────────────────────────────────────────────
    private FrameLayout btnRegBack;
    private TextView btnRegReset;
    private EditText inputOmnibar;
    private MaterialButton btnOmnibarSearch;
    private LinearLayout cardMatchFound;
    private TextView lblMatchName, lblMatchUHID;
    private Button btnUseMatchedPatient;

    // ── Demographics Form Views ─────────────────────────────────────────────
    private Spinner spinnerTitle, spinnerGender, spinnerAgeUnit, spinnerCollector, spinnerPaymentMode;
    private EditText inputPatientName, inputPatientPhone, inputPatientAge, inputPatientEmail, inputPatientAddress;

    // ── Clinical & Referral Views ───────────────────────────────────────────
    private LinearLayout btnSelectDoctor, btnSelectAgency;
    private TextView lblSelectedDoctor, lblSelectedAgency;
    private String selectedDoctorId = "Self";
    private String selectedAgencyId = "Direct";

    // ── Tests & Accession Views ─────────────────────────────────────────────
    private LinearLayout containerSelectedTests, btnAddTestsModal;
    private TextView lblTestsCountBadge, lblGrossTotal, lblNetPayable, lblStickyTotal;
    private EditText inputDiscount;
    private MaterialButton btnSubmitRegistration;

    // ── Data Models ─────────────────────────────────────────────────────────
    public static class TestItem {
        public String id;
        public String name;
        public String code;
        public String type;
        public double price;
        public boolean isSelected;

        public TestItem(String id, String name, String code, String type, double price) {
            this.id = id;
            this.name = name;
            this.code = code;
            this.type = type;
            this.price = price;
            this.isSelected = false;
        }
    }

    public static class DoctorItem {
        public String id;
        public String name;
        public String qualification;
        public String hospital;

        public DoctorItem(String id, String name, String qualification, String hospital) {
            this.id = id;
            this.name = name;
            this.qualification = qualification;
            this.hospital = hospital;
        }
    }

    private final List<TestItem> catalogTests = new ArrayList<>();
    private final List<TestItem> selectedTests = new ArrayList<>();
    private final List<DoctorItem> registeredDoctors = new ArrayList<>();
    private final List<DoctorItem> registeredAgencies = new ArrayList<>();

    private String matchedPatientDbId = null;

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_registration);

        bindViews();
        setupSpinners();
        setupListeners();
        fetchCatalogTests();
        fetchDoctorsAndAgencies();
    }

    private void bindViews() {
        btnRegBack           = findViewById(R.id.btnRegBack);
        btnRegReset          = findViewById(R.id.btnRegReset);
        inputOmnibar         = findViewById(R.id.inputOmnibar);
        btnOmnibarSearch     = findViewById(R.id.btnOmnibarSearch);
        cardMatchFound       = findViewById(R.id.cardMatchFound);
        lblMatchName         = findViewById(R.id.lblMatchName);
        lblMatchUHID         = findViewById(R.id.lblMatchUHID);
        btnUseMatchedPatient = findViewById(R.id.btnUseMatchedPatient);

        spinnerTitle         = findViewById(R.id.spinnerTitle);
        inputPatientName     = findViewById(R.id.inputPatientName);
        inputPatientPhone    = findViewById(R.id.inputPatientPhone);
        spinnerGender        = findViewById(R.id.spinnerGender);
        inputPatientAge      = findViewById(R.id.inputPatientAge);
        spinnerAgeUnit       = findViewById(R.id.spinnerAgeUnit);
        inputPatientEmail    = findViewById(R.id.inputPatientEmail);
        inputPatientAddress  = findViewById(R.id.inputPatientAddress);

        btnSelectDoctor      = findViewById(R.id.btnSelectDoctor);
        btnSelectAgency      = findViewById(R.id.btnSelectAgency);
        lblSelectedDoctor    = findViewById(R.id.lblSelectedDoctor);
        lblSelectedAgency    = findViewById(R.id.lblSelectedAgency);
        spinnerCollector     = findViewById(R.id.spinnerCollector);

        containerSelectedTests = findViewById(R.id.containerSelectedTests);
        btnAddTestsModal     = findViewById(R.id.btnAddTestsModal);
        lblTestsCountBadge   = findViewById(R.id.lblTestsCountBadge);

        lblGrossTotal        = findViewById(R.id.lblGrossTotal);
        inputDiscount        = findViewById(R.id.inputDiscount);
        lblNetPayable        = findViewById(R.id.lblNetPayable);
        spinnerPaymentMode   = findViewById(R.id.spinnerPaymentMode);

        lblStickyTotal       = findViewById(R.id.lblStickyTotal);
        btnSubmitRegistration = findViewById(R.id.btnSubmitRegistration);
    }

    private void setupSpinners() {
        // Title Spinner
        String[] titles = {"Mr.", "Mrs.", "Ms.", "Master", "Dr.", "Baby"};
        ArrayAdapter<String> titleAdapter = new ArrayAdapter<>(this, android.R.layout.simple_spinner_dropdown_item, titles);
        spinnerTitle.setAdapter(titleAdapter);

        // Gender Spinner
        String[] genders = {"MALE", "FEMALE", "OTHER"};
        ArrayAdapter<String> genderAdapter = new ArrayAdapter<>(this, android.R.layout.simple_spinner_dropdown_item, genders);
        spinnerGender.setAdapter(genderAdapter);

        // Age Unit Spinner
        String[] ageUnits = {"Years", "Months", "Days"};
        ArrayAdapter<String> ageUnitAdapter = new ArrayAdapter<>(this, android.R.layout.simple_spinner_dropdown_item, ageUnits);
        spinnerAgeUnit.setAdapter(ageUnitAdapter);

        // Collector Spinner
        String[] collectors = {"Lab Phlebotomist", "Home Collection Agent", "Self (Patient)"};
        ArrayAdapter<String> collectorAdapter = new ArrayAdapter<>(this, android.R.layout.simple_spinner_dropdown_item, collectors);
        spinnerCollector.setAdapter(collectorAdapter);

        // Payment Mode Spinner
        String[] paymentModes = {"Cash", "UPI / QR", "Card", "Due / Pay Later"};
        ArrayAdapter<String> paymentAdapter = new ArrayAdapter<>(this, android.R.layout.simple_spinner_dropdown_item, paymentModes);
        spinnerPaymentMode.setAdapter(paymentAdapter);
    }

    private void setupListeners() {
        if (btnRegBack != null) {
            btnRegBack.setOnClickListener(v -> finish());
        }

        if (btnRegReset != null) {
            btnRegReset.setOnClickListener(v -> resetForm());
        }

        // Omnibar Search Button
        if (btnOmnibarSearch != null) {
            btnOmnibarSearch.setOnClickListener(v -> performOmnibarSearch());
        }

        // Use Matched Patient
        if (btnUseMatchedPatient != null) {
            btnUseMatchedPatient.setOnClickListener(v -> cardMatchFound.setVisibility(View.GONE));
        }

        // Doctor / Agency Selectors
        if (btnSelectDoctor != null) {
            btnSelectDoctor.setOnClickListener(v -> showDoctorSelectorSheet(true));
        }
        if (btnSelectAgency != null) {
            btnSelectAgency.setOnClickListener(v -> showDoctorSelectorSheet(false));
        }

        // Add Tests Button
        if (btnAddTestsModal != null) {
            btnAddTestsModal.setOnClickListener(v -> showTestSelectorSheet());
        }

        // Discount Listener for Live Math
        if (inputDiscount != null) {
            inputDiscount.addTextChangedListener(new TextWatcher() {
                @Override public void beforeTextChanged(CharSequence s, int start, int count, int after) {}
                @Override public void onTextChanged(CharSequence s, int start, int before, int count) {
                    calculateBill();
                }
                @Override public void afterTextChanged(Editable s) {}
            });
        }

        // Submit Button
        if (btnSubmitRegistration != null) {
            btnSubmitRegistration.setOnClickListener(v -> submitRegistration());
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Omnibar Lookup
    // ─────────────────────────────────────────────────────────────────────────
    private void performOmnibarSearch() {
        String q = inputOmnibar.getText().toString().trim();
        if (q.isEmpty()) {
            Toast.makeText(this, "Please enter a phone number or name", Toast.LENGTH_SHORT).show();
            return;
        }

        new Thread(() -> {
            try {
                String token = AuthManager.getToken(this);
                String type = q.matches("\\d{10}") ? "PHONE" : "NAME";
                URL url = new URL(BASE_URL + "/api/workspace/patients/search?query=" + URLEncoder.encode(q, "UTF-8") + "&type=" + type);
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                if (token != null) {
                    conn.setRequestProperty("Authorization", "Bearer " + token);
                    conn.setRequestProperty("Cookie", "token=" + token);
                }
                conn.setConnectTimeout(5000);

                if (conn.getResponseCode() == 200) {
                    String json = readStream(conn.getInputStream());
                    JSONArray array;
                    if (json.trim().startsWith("[")) {
                        array = new JSONArray(json);
                    } else {
                        JSONObject obj = new JSONObject(json);
                        array = obj.optJSONArray("data");
                    }

                    if (array != null && array.length() > 0) {
                        JSONObject patient = array.getJSONObject(0);
                        matchedPatientDbId = patient.optString("id", null);
                        String name = patient.optString("name", "");
                        String phone = patient.optString("phone", "");
                        String gender = patient.optString("gender", "MALE");
                        int age = patient.optInt("age", 0);
                        String patientUhid = patient.optString("patientId", "UHID");

                        mainHandler.post(() -> {
                            cardMatchFound.setVisibility(View.VISIBLE);
                            lblMatchName.setText(name + " (" + gender + ", " + age + "Y)");
                            lblMatchUHID.setText("UHID: " + patientUhid);

                            // Autofill
                            inputPatientName.setText(name);
                            inputPatientPhone.setText(phone);
                            if (age > 0) inputPatientAge.setText(String.valueOf(age));
                            Toast.makeText(RegistrationActivity.this, "Found existing patient record!", Toast.LENGTH_SHORT).show();
                        });
                    } else {
                        mainHandler.post(() -> {
                            cardMatchFound.setVisibility(View.GONE);
                            matchedPatientDbId = null;
                            if (q.matches("\\d{10}")) inputPatientPhone.setText(q);
                            else inputPatientName.setText(q);
                            Toast.makeText(RegistrationActivity.this, "No duplicate found. You can register as new.", Toast.LENGTH_SHORT).show();
                        });
                    }
                }
            } catch (Exception e) {
                mainHandler.post(() -> Toast.makeText(RegistrationActivity.this, "Search error: " + e.getMessage(), Toast.LENGTH_SHORT).show());
            }
        }).start();
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Fetch Test Catalog
    // ─────────────────────────────────────────────────────────────────────────
    private void fetchCatalogTests() {
        new Thread(() -> {
            try {
                String token = AuthManager.getToken(this);
                URL url = new URL(BASE_URL + "/api/workspace/test-catalog");
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                if (token != null) {
                    conn.setRequestProperty("Authorization", "Bearer " + token);
                    conn.setRequestProperty("Cookie", "token=" + token);
                }
                conn.setConnectTimeout(6000);

                if (conn.getResponseCode() == 200) {
                    String json = readStream(conn.getInputStream());
                    JSONObject root = new JSONObject(json);
                    JSONArray tests = root.optJSONArray("tests");
                    if (tests == null) tests = root.optJSONArray("data");

                    if (tests != null) {
                        catalogTests.clear();
                        for (int i = 0; i < tests.length(); i++) {
                            JSONObject t = tests.getJSONObject(i);
                            String id = t.optString("id");
                            String name = t.optString("name", "Test");
                            String code = t.optString("code", "T00" + i);
                            String type = t.optString("type", "SINGLE");
                            double price = t.optDouble("price", 0.0);
                            catalogTests.add(new TestItem(id, name, code, type, price));
                        }
                    }
                }
            } catch (Exception ignored) {}
        }).start();
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Fetch Doctors & Agencies
    // ─────────────────────────────────────────────────────────────────────────
    private void fetchDoctorsAndAgencies() {
        new Thread(() -> {
            try {
                String token = AuthManager.getToken(this);
                // Doctors
                URL url = new URL(BASE_URL + "/api/doctors");
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                if (token != null) {
                    conn.setRequestProperty("Authorization", "Bearer " + token);
                    conn.setRequestProperty("Cookie", "token=" + token);
                }
                conn.setConnectTimeout(5000);
                if (conn.getResponseCode() == 200) {
                    String json = readStream(conn.getInputStream());
                    JSONArray docs = new JSONArray(json);
                    registeredDoctors.clear();
                    registeredDoctors.add(new DoctorItem("Self", "Self (No Doctor)", "Direct Walk-in", ""));
                    for (int i = 0; i < docs.length(); i++) {
                        JSONObject d = docs.getJSONObject(i);
                        registeredDoctors.add(new DoctorItem(
                                d.optString("id"),
                                d.optString("name", "Dr."),
                                d.optString("specialization", "Consultant"),
                                d.optString("hospital", "")
                        ));
                    }
                }
            } catch (Exception ignored) {}
        }).start();
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Test Selector Bottom Sheet
    // ─────────────────────────────────────────────────────────────────────────
    private void showTestSelectorSheet() {
        BottomSheetDialog dialog = new BottomSheetDialog(this);
        View sheet = getLayoutInflater().inflate(R.layout.layout_test_selector_sheet, null);
        dialog.setContentView(sheet);

        BottomSheetBehavior<View> behavior = BottomSheetBehavior.from((View) sheet.getParent());
        behavior.setPeekHeight((int) (getResources().getDisplayMetrics().heightPixels * 0.85));
        behavior.setState(BottomSheetBehavior.STATE_EXPANDED);

        RecyclerView recycler = sheet.findViewById(R.id.recyclerTestsCatalog);
        recycler.setLayoutManager(new LinearLayoutManager(this));

        EditText inputSearch = sheet.findViewById(R.id.inputSearchTest);
        TextView lblCount = sheet.findViewById(R.id.lblSelectedCount);
        TextView lblTotal = sheet.findViewById(R.id.lblSheetTotalAmount);
        MaterialButton btnDone = sheet.findViewById(R.id.btnDoneSelectingTests);
        FrameLayout btnClose = sheet.findViewById(R.id.btnCloseTestSheet);

        btnClose.setOnClickListener(v -> dialog.dismiss());

        // Mark previously selected
        for (TestItem ct : catalogTests) {
            ct.isSelected = selectedTests.stream().anyMatch(st -> st.id.equals(ct.id));
        }

        TestCatalogAdapter adapter = new TestCatalogAdapter(catalogTests, item -> {
            item.isSelected = !item.isSelected;
            long count = catalogTests.stream().filter(t -> t.isSelected).count();
            double sum = catalogTests.stream().filter(t -> t.isSelected).mapToDouble(t -> t.price).sum();
            lblCount.setText(count + " tests selected");
            lblTotal.setText(String.format("₹%,.2f", sum));
        });
        recycler.setAdapter(adapter);

        // Search Filter
        inputSearch.addTextChangedListener(new TextWatcher() {
            @Override public void beforeTextChanged(CharSequence s, int start, int count, int after) {}
            @Override public void onTextChanged(CharSequence s, int start, int before, int count) {
                adapter.filter(s.toString());
            }
            @Override public void afterTextChanged(Editable s) {}
        });

        // Initialize footer
        long initialCount = catalogTests.stream().filter(t -> t.isSelected).count();
        double initialSum = catalogTests.stream().filter(t -> t.isSelected).mapToDouble(t -> t.price).sum();
        lblCount.setText(initialCount + " tests selected");
        lblTotal.setText(String.format("₹%,.2f", initialSum));

        btnDone.setOnClickListener(v -> {
            selectedTests.clear();
            for (TestItem t : catalogTests) {
                if (t.isSelected) selectedTests.add(t);
            }
            renderSelectedTests();
            calculateBill();
            dialog.dismiss();
        });

        dialog.show();
    }

    private void renderSelectedTests() {
        containerSelectedTests.removeAllViews();
        lblTestsCountBadge.setText(selectedTests.size() + " selected");

        for (TestItem t : selectedTests) {
            View chip = getLayoutInflater().inflate(R.layout.item_selected_test_chip, containerSelectedTests, false);
            TextView lblName = chip.findViewById(R.id.lblSelectedTestName);
            TextView lblCode = chip.findViewById(R.id.lblSelectedTestCode);
            TextView lblPrice = chip.findViewById(R.id.lblSelectedTestPrice);
            ImageView btnRemove = chip.findViewById(R.id.btnRemoveSelectedTest);

            lblName.setText(t.name);
            lblCode.setText(t.code + " • " + t.type);
            lblPrice.setText(String.format("₹%,.0f", t.price));

            btnRemove.setOnClickListener(v -> {
                selectedTests.remove(t);
                t.isSelected = false;
                renderSelectedTests();
                calculateBill();
            });

            containerSelectedTests.addView(chip);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Doctor / Agency Selector Sheet
    // ─────────────────────────────────────────────────────────────────────────
    private void showDoctorSelectorSheet(boolean isDoctor) {
        BottomSheetDialog dialog = new BottomSheetDialog(this);
        View sheet = getLayoutInflater().inflate(R.layout.layout_doctor_selector_sheet, null);
        dialog.setContentView(sheet);

        TextView lblTitle = sheet.findViewById(R.id.lblDoctorSheetTitle);
        TextView lblSub = sheet.findViewById(R.id.lblDoctorSheetSubtitle);
        FrameLayout btnClose = sheet.findViewById(R.id.btnCloseDocSheet);
        RecyclerView recycler = sheet.findViewById(R.id.recyclerDoctorsList);
        EditText inputSearch = sheet.findViewById(R.id.inputSearchDoctor);

        lblTitle.setText(isDoctor ? "Select Referring Doctor" : "Select Referring Agency");
        lblSub.setText(isDoctor ? "Choose from doctor directory or self" : "Choose B2B partner or direct walk-in");
        btnClose.setOnClickListener(v -> dialog.dismiss());

        recycler.setLayoutManager(new LinearLayoutManager(this));

        List<DoctorItem> sourceList = isDoctor ? registeredDoctors : registeredAgencies;
        if (!isDoctor && sourceList.isEmpty()) {
            sourceList.add(new DoctorItem("Direct", "Direct Walk-in", "Standard", ""));
        }

        DoctorAdapter adapter = new DoctorAdapter(sourceList, item -> {
            if (isDoctor) {
                selectedDoctorId = item.id;
                lblSelectedDoctor.setText("Doctor: " + item.name);
            } else {
                selectedAgencyId = item.id;
                lblSelectedAgency.setText("Agency: " + item.name);
            }
            dialog.dismiss();
        });
        recycler.setAdapter(adapter);

        dialog.show();
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Live Bill Math
    // ─────────────────────────────────────────────────────────────────────────
    private void calculateBill() {
        double gross = selectedTests.stream().mapToDouble(t -> t.price).sum();
        double discount = 0.0;
        try {
            String dStr = inputDiscount.getText().toString().trim();
            if (!dStr.isEmpty()) discount = Double.parseDouble(dStr);
        } catch (Exception ignored) {}

        double net = Math.max(0, gross - discount);

        lblGrossTotal.setText(String.format("₹%,.2f", gross));
        lblNetPayable.setText(String.format("₹%,.2f", net));
        lblStickyTotal.setText(String.format("₹%,.2f", net));
    }

    private void resetForm() {
        inputOmnibar.setText("");
        inputPatientName.setText("");
        inputPatientPhone.setText("");
        inputPatientAge.setText("");
        inputPatientEmail.setText("");
        inputPatientAddress.setText("");
        inputDiscount.setText("");
        cardMatchFound.setVisibility(View.GONE);
        matchedPatientDbId = null;
        selectedTests.clear();
        for (TestItem t : catalogTests) t.isSelected = false;
        renderSelectedTests();
        calculateBill();
        Toast.makeText(this, "Form cleared", Toast.LENGTH_SHORT).show();
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Submit Registration & Accession
    // ─────────────────────────────────────────────────────────────────────────
    private void submitRegistration() {
        String name = inputPatientName.getText().toString().trim();
        String phone = inputPatientPhone.getText().toString().trim();
        String ageStr = inputPatientAge.getText().toString().trim();

        if (name.isEmpty()) {
            Toast.makeText(this, "Please enter patient name", Toast.LENGTH_SHORT).show();
            inputPatientName.requestFocus();
            return;
        }

        if (phone.length() != 10) {
            Toast.makeText(this, "Please enter a valid 10-digit mobile number", Toast.LENGTH_SHORT).show();
            inputPatientPhone.requestFocus();
            return;
        }

        if (ageStr.isEmpty()) {
            Toast.makeText(this, "Please enter patient age", Toast.LENGTH_SHORT).show();
            inputPatientAge.requestFocus();
            return;
        }

        btnSubmitRegistration.setEnabled(false);
        btnSubmitRegistration.setText("Registering...");

        new Thread(() -> {
            try {
                String token = AuthManager.getToken(this);
                String title = spinnerTitle.getSelectedItem().toString();
                String gender = spinnerGender.getSelectedItem().toString();
                String ageUnit = spinnerAgeUnit.getSelectedItem().toString();
                String email = inputPatientEmail.getText().toString().trim();
                String address = inputPatientAddress.getText().toString().trim();
                String paymentMode = spinnerPaymentMode.getSelectedItem().toString();

                double gross = selectedTests.stream().mapToDouble(t -> t.price).sum();
                double discount = 0.0;
                try {
                    String d = inputDiscount.getText().toString().trim();
                    if (!d.isEmpty()) discount = Double.parseDouble(d);
                } catch (Exception ignored) {}
                double net = Math.max(0, gross - discount);

                String patientId = matchedPatientDbId;

                // Step 1: Create Patient if new
                if (patientId == null) {
                    JSONObject body = new JSONObject();
                    body.put("title", title);
                    body.put("name", name);
                    body.put("phone", phone);
                    body.put("gender", gender);
                    body.put("age", Integer.parseInt(ageStr));
                    body.put("ageUnit", ageUnit);
                    body.put("email", email);
                    body.put("address", address);
                    body.put("doctorId", selectedDoctorId);
                    body.put("agencyId", selectedAgencyId);
                    body.put("paymentMode", paymentMode);

                    URL regUrl = new URL(BASE_URL + "/api/workspace/patients");
                    HttpURLConnection conn = (HttpURLConnection) regUrl.openConnection();
                    conn.setRequestMethod("POST");
                    conn.setRequestProperty("Content-Type", "application/json");
                    if (token != null) {
                        conn.setRequestProperty("Authorization", "Bearer " + token);
                        conn.setRequestProperty("Cookie", "token=" + token);
                    }
                    conn.setDoOutput(true);

                    OutputStream os = conn.getOutputStream();
                    os.write(body.toString().getBytes(StandardCharsets.UTF_8));
                    os.flush();
                    os.close();

                    int code = conn.getResponseCode();
                    String res = readStream(code >= 200 && code < 300 ? conn.getInputStream() : conn.getErrorStream());

                    if (code != 200 && code != 201) {
                        JSONObject err = new JSONObject(res);
                        throw new Exception(err.optString("error", "Registration failed"));
                    }

                    JSONObject resObj = new JSONObject(res);
                    JSONObject patObj = resObj.optJSONObject("patient");
                    if (patObj != null) patientId = patObj.optString("id");
                    else patientId = resObj.optString("id");
                }

                // Step 2: Book Accession Tests if any
                if (patientId != null && !selectedTests.isEmpty()) {
                    JSONObject accBody = new JSONObject();
                    accBody.put("patientId", patientId);
                    accBody.put("subtotal", gross);
                    accBody.put("discountAmount", discount);
                    accBody.put("grandTotal", net);
                    accBody.put("paidAmount", net);
                    accBody.put("paymentMode", paymentMode.toUpperCase().contains("CASH") ? "CASH" : "UPI");

                    JSONArray testArr = new JSONArray();
                    for (TestItem st : selectedTests) {
                        JSONObject tj = new JSONObject();
                        tj.put("id", st.id);
                        tj.put("name", st.name);
                        tj.put("price", st.price);
                        testArr.put(tj);
                    }
                    accBody.put("tests", testArr);

                    URL accUrl = new URL(BASE_URL + "/api/workspace/accession");
                    HttpURLConnection accConn = (HttpURLConnection) accUrl.openConnection();
                    accConn.setRequestMethod("POST");
                    accConn.setRequestProperty("Content-Type", "application/json");
                    if (token != null) {
                        accConn.setRequestProperty("Authorization", "Bearer " + token);
                        accConn.setRequestProperty("Cookie", "token=" + token);
                    }
                    accConn.setDoOutput(true);

                    OutputStream aos = accConn.getOutputStream();
                    aos.write(accBody.toString().getBytes(StandardCharsets.UTF_8));
                    aos.flush();
                    aos.close();
                }

                final String finalPatientName = name;
                final double finalNet = net;
                final int finalCount = selectedTests.size();

                mainHandler.post(() -> {
                    btnSubmitRegistration.setEnabled(true);
                    btnSubmitRegistration.setText("Register & Book Tests");
                    showSuccessModal(finalPatientName, finalNet, finalCount);
                });

            } catch (Exception e) {
                mainHandler.post(() -> {
                    btnSubmitRegistration.setEnabled(true);
                    btnSubmitRegistration.setText("Register & Book Tests");
                    Toast.makeText(RegistrationActivity.this, "Error: " + e.getMessage(), Toast.LENGTH_LONG).show();
                });
            }
        }).start();
    }

    private void showSuccessModal(String patientName, double netAmount, int testsCount) {
        BottomSheetDialog dialog = new BottomSheetDialog(this);
        View sheet = getLayoutInflater().inflate(R.layout.layout_registration_success_sheet, null);
        dialog.setContentView(sheet);

        TextView lblName = sheet.findViewById(R.id.lblSuccessPatientName);
        TextView lblUHID = sheet.findViewById(R.id.lblSuccessUHID);
        TextView lblAmount = sheet.findViewById(R.id.lblSuccessAmount);
        TextView lblTests = sheet.findViewById(R.id.lblSuccessTestsCount);
        View iconCheck = sheet.findViewById(R.id.iconSuccessCheck);
        MaterialButton btnPrint = sheet.findViewById(R.id.btnSuccessPrintReceipt);
        TextView btnDone = sheet.findViewById(R.id.btnSuccessDone);

        lblName.setText(patientName + " has been registered successfully.");
        lblUHID.setText("UHID: P-" + (int)(Math.random() * 9000 + 1000));
        lblAmount.setText(String.format("₹%,.2f", netAmount));
        lblTests.setText(testsCount + " Tests Booked");

        // Spring Bounce Animation
        if (iconCheck != null) {
            iconCheck.setScaleX(0.2f);
            iconCheck.setScaleY(0.2f);
            iconCheck.animate()
                    .scaleX(1f).scaleY(1f)
                    .setDuration(550)
                    .setInterpolator(new OvershootInterpolator(2.2f))
                    .start();
        }

        btnPrint.setOnClickListener(v -> {
            dialog.dismiss();
            finish();
        });

        btnDone.setOnClickListener(v -> {
            dialog.dismiss();
            finish();
        });

        dialog.show();
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Recycler View Adapters
    // ─────────────────────────────────────────────────────────────────────────
    private static class TestCatalogAdapter extends RecyclerView.Adapter<TestCatalogAdapter.VH> {
        private final List<TestItem> allList;
        private final List<TestItem> filteredList;
        private final OnItemToggle toggleListener;

        public interface OnItemToggle {
            void onToggle(TestItem item);
        }

        public TestCatalogAdapter(List<TestItem> list, OnItemToggle listener) {
            this.allList = list;
            this.filteredList = new ArrayList<>(list);
            this.toggleListener = listener;
        }

        public void filter(String query) {
            filteredList.clear();
            if (query == null || query.trim().isEmpty()) {
                filteredList.addAll(allList);
            } else {
                String q = query.toLowerCase();
                for (TestItem t : allList) {
                    if (t.name.toLowerCase().contains(q) || t.code.toLowerCase().contains(q)) {
                        filteredList.add(t);
                    }
                }
            }
            notifyDataSetChanged();
        }

        @NonNull @Override
        public VH onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
            View v = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_test_catalog, parent, false);
            return new VH(v);
        }

        @Override
        public void onBindViewHolder(@NonNull VH holder, int position) {
            TestItem item = filteredList.get(position);
            holder.lblName.setText(item.name);
            holder.lblCode.setText(item.code);
            holder.lblType.setText(item.type);
            holder.lblPrice.setText(String.format("₹%,.0f", item.price));
            holder.chk.setChecked(item.isSelected);

            holder.itemView.setOnClickListener(v -> {
                toggleListener.onToggle(item);
                holder.chk.setChecked(item.isSelected);
            });
        }

        @Override public int getItemCount() { return filteredList.size(); }

        static class VH extends RecyclerView.ViewHolder {
            TextView lblName, lblCode, lblType, lblPrice;
            CheckBox chk;
            public VH(@NonNull View v) {
                super(v);
                lblName = v.findViewById(R.id.lblTestName);
                lblCode = v.findViewById(R.id.lblTestCode);
                lblType = v.findViewById(R.id.lblTestType);
                lblPrice = v.findViewById(R.id.lblTestPrice);
                chk = v.findViewById(R.id.chkTestSelected);
            }
        }
    }

    private static class DoctorAdapter extends RecyclerView.Adapter<DoctorAdapter.VH> {
        private final List<DoctorItem> list;
        private final OnDocSelected listener;

        public interface OnDocSelected {
            void onSelect(DoctorItem item);
        }

        public DoctorAdapter(List<DoctorItem> list, OnDocSelected listener) {
            this.list = list;
            this.listener = listener;
        }

        @NonNull @Override
        public VH onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
            View v = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_doctor_row, parent, false);
            return new VH(v);
        }

        @Override
        public void onBindViewHolder(@NonNull VH holder, int position) {
            DoctorItem d = list.get(position);
            holder.lblName.setText(d.name);
            holder.lblSub.setText(d.qualification + (d.hospital.isEmpty() ? "" : " • " + d.hospital));
            holder.itemView.setOnClickListener(v -> listener.onSelect(d));
        }

        @Override public int getItemCount() { return list.size(); }

        static class VH extends RecyclerView.ViewHolder {
            TextView lblName, lblSub;
            public VH(@NonNull View v) {
                super(v);
                lblName = v.findViewById(R.id.lblDocName);
                lblSub = v.findViewById(R.id.lblDocSubtitle);
            }
        }
    }

    private String readStream(InputStream is) {
        if (is == null) return "";
        try (BufferedReader r = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8))) {
            StringBuilder sb = new StringBuilder();
            String l;
            while ((l = r.readLine()) != null) sb.append(l);
            return sb.toString();
        } catch (Exception ignored) { return ""; }
    }
}
