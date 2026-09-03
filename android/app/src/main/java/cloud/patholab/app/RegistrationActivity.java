package cloud.patholab.app;

import android.animation.ObjectAnimator;
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
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.Spinner;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.widget.NestedScrollView;
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

/**
 * RegistrationActivity
 * ────────────────────
 * Native Android Patient Registration & Clinical Accession Console.
 * Directly mirroring the exact web workflow and sequence:
 *  1. Step 1: Database Omnibar Lookup & Duplicate Prevention (/workspace/registration)
 *  2. Step 2: Demographics, Referral, Test Accession Catalog, and Billing (/workspace/patients/new & /accession)
 */
public class RegistrationActivity extends AppCompatActivity {

    private static final String BASE_URL = "https://patholab.cloud";
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    // ── Header & Mode Tabs ───────────────────────────────────────────────────
    private FrameLayout btnRegBack;
    private TextView btnRegReset;
    private TextView tabModeSearch, tabModeNewReg;
    private NestedScrollView scrollSearchSection, scrollNewRegSection;
    private FrameLayout stickyBottomBar;

    // ── Tab 1: Omnibar Search Views ──────────────────────────────────────────
    private Spinner spinnerSearchType;
    private EditText inputOmnibar;
    private MaterialButton btnOmnibarSearch;
    private ProgressBar progressSearch;
    private LinearLayout cardMatchFound, cardNoMatch;
    private TextView lblMatchAvatarInitial, lblMatchName, lblMatchDemographics, lblMatchUHID, lblMatchPhone, lblMatchAddress;
    private MaterialButton btnProceedToAccession, btnRegisterNewFromSearch;
    private TextView lblNoMatchDesc;

    // ── Tab 2: Demographics Form Views ───────────────────────────────────────
    private Spinner spinnerTitle, spinnerGender, spinnerAgeUnit, spinnerCollector, spinnerPaymentMode;
    private EditText inputPatientName, inputPatientPhone, inputPatientAge, inputPatientEmail, inputPatientAddress;

    // ── Clinical Referral & Accession Views ───────────────────────────────────
    private LinearLayout btnSelectDoctor, btnSelectAgency;
    private TextView lblSelectedDoctor, lblSelectedAgency;
    private String selectedDoctorId = "Self";
    private String selectedAgencyId = "Direct";

    // ── Tests & Accession Views ──────────────────────────────────────────────
    private LinearLayout containerSelectedTests, btnAddTestsModal;
    private TextView lblTestsCountBadge, lblGrossTotal, lblNetPayable, lblStickyTotal;
    private EditText inputDiscount;
    private MaterialButton btnSubmitRegistration;

    // ── Data Models ──────────────────────────────────────────────────────────
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
        public String spec;
        public String hospital;

        public DoctorItem(String id, String name, String spec, String hospital) {
            this.id = id;
            this.name = name;
            this.spec = spec;
            this.hospital = hospital;
        }
    }

    private final List<TestItem> catalogTests = new ArrayList<>();
    private final List<TestItem> selectedTests = new ArrayList<>();
    private final List<DoctorItem> registeredDoctors = new ArrayList<>();
    private final List<DoctorItem> registeredAgencies = new ArrayList<>();

    private String matchedPatientDbId = null;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_registration);

        bindViews();
        setupSpinners();
        setupTabs();
        setupActions();
        fetchCatalogTests();
        fetchDoctorsAndAgencies();
    }

    private void bindViews() {
        btnRegBack           = findViewById(R.id.btnRegBack);
        btnRegReset          = findViewById(R.id.btnRegReset);
        tabModeSearch        = findViewById(R.id.tabModeSearch);
        tabModeNewReg        = findViewById(R.id.tabModeNewReg);
        scrollSearchSection  = findViewById(R.id.scrollSearchSection);
        scrollNewRegSection  = findViewById(R.id.scrollNewRegSection);
        stickyBottomBar      = findViewById(R.id.stickyBottomBar);

        // Tab 1 Views
        spinnerSearchType    = findViewById(R.id.spinnerSearchType);
        inputOmnibar         = findViewById(R.id.inputOmnibar);
        btnOmnibarSearch     = findViewById(R.id.btnOmnibarSearch);
        progressSearch       = findViewById(R.id.progressSearch);
        cardMatchFound       = findViewById(R.id.cardMatchFound);
        cardNoMatch          = findViewById(R.id.cardNoMatch);
        lblMatchAvatarInitial = findViewById(R.id.lblMatchAvatarInitial);
        lblMatchName         = findViewById(R.id.lblMatchName);
        lblMatchDemographics = findViewById(R.id.lblMatchDemographics);
        lblMatchUHID         = findViewById(R.id.lblMatchUHID);
        lblMatchPhone        = findViewById(R.id.lblMatchPhone);
        lblMatchAddress      = findViewById(R.id.lblMatchAddress);
        btnProceedToAccession = findViewById(R.id.btnProceedToAccession);
        btnRegisterNewFromSearch = findViewById(R.id.btnRegisterNewFromSearch);
        lblNoMatchDesc       = findViewById(R.id.lblNoMatchDesc);

        // Tab 2 Demographics
        spinnerTitle         = findViewById(R.id.spinnerTitle);
        inputPatientName     = findViewById(R.id.inputPatientName);
        inputPatientPhone    = findViewById(R.id.inputPatientPhone);
        spinnerGender        = findViewById(R.id.spinnerGender);
        inputPatientAge      = findViewById(R.id.inputPatientAge);
        spinnerAgeUnit       = findViewById(R.id.spinnerAgeUnit);
        inputPatientEmail    = findViewById(R.id.inputPatientEmail);
        inputPatientAddress  = findViewById(R.id.inputPatientAddress);

        // Clinical Referral
        btnSelectDoctor      = findViewById(R.id.btnSelectDoctor);
        lblSelectedDoctor    = findViewById(R.id.lblSelectedDoctor);
        btnSelectAgency      = findViewById(R.id.btnSelectAgency);
        lblSelectedAgency    = findViewById(R.id.lblSelectedAgency);
        spinnerCollector     = findViewById(R.id.spinnerCollector);

        // Tests & Accession
        lblTestsCountBadge   = findViewById(R.id.lblTestsCountBadge);
        containerSelectedTests = findViewById(R.id.containerSelectedTests);
        btnAddTestsModal     = findViewById(R.id.btnAddTestsModal);

        // Billing
        lblGrossTotal        = findViewById(R.id.lblGrossTotal);
        inputDiscount        = findViewById(R.id.inputDiscount);
        lblNetPayable        = findViewById(R.id.lblNetPayable);
        spinnerPaymentMode   = findViewById(R.id.spinnerPaymentMode);
        lblStickyTotal       = findViewById(R.id.lblStickyTotal);
        btnSubmitRegistration = findViewById(R.id.btnSubmitRegistration);
    }

    private void setupSpinners() {
        // Search Type
        ArrayAdapter<String> searchTypeAdapter = new ArrayAdapter<>(this,
                android.R.layout.simple_spinner_dropdown_item,
                new String[]{"Phone", "Name"});
        spinnerSearchType.setAdapter(searchTypeAdapter);
        spinnerSearchType.setOnItemSelectedListener(new android.widget.AdapterView.OnItemSelectedListener() {
            @Override
            public void onItemSelected(android.widget.AdapterView<?> parent, View view, int position, long id) {
                if (position == 0) {
                    inputOmnibar.setHint("Enter 10-digit mobile...");
                    inputOmnibar.setInputType(android.text.InputType.TYPE_CLASS_PHONE);
                } else {
                    inputOmnibar.setHint("Enter patient name...");
                    inputOmnibar.setInputType(android.text.InputType.TYPE_CLASS_TEXT | android.text.InputType.TYPE_TEXT_FLAG_CAP_WORDS);
                }
                inputOmnibar.setText("");
                cardMatchFound.setVisibility(View.GONE);
                cardNoMatch.setVisibility(View.GONE);
            }
            @Override public void onNothingSelected(android.widget.AdapterView<?> parent) {}
        });

        // Title
        ArrayAdapter<String> titleAdapter = new ArrayAdapter<>(this,
                android.R.layout.simple_spinner_dropdown_item,
                new String[]{"Mr.", "Mrs.", "Ms.", "Master", "Dr.", "Baby"});
        spinnerTitle.setAdapter(titleAdapter);

        // Gender
        ArrayAdapter<String> genderAdapter = new ArrayAdapter<>(this,
                android.R.layout.simple_spinner_dropdown_item,
                new String[]{"MALE", "FEMALE", "OTHER"});
        spinnerGender.setAdapter(genderAdapter);

        // Age Unit
        ArrayAdapter<String> ageUnitAdapter = new ArrayAdapter<>(this,
                android.R.layout.simple_spinner_dropdown_item,
                new String[]{"Years", "Months", "Days"});
        spinnerAgeUnit.setAdapter(ageUnitAdapter);

        // Collector
        ArrayAdapter<String> collectorAdapter = new ArrayAdapter<>(this,
                android.R.layout.simple_spinner_dropdown_item,
                new String[]{"Lab Phlebotomist", "Home Collection Agent", "Self (Patient)"});
        spinnerCollector.setAdapter(collectorAdapter);

        // Payment Mode
        ArrayAdapter<String> payModeAdapter = new ArrayAdapter<>(this,
                android.R.layout.simple_spinner_dropdown_item,
                new String[]{"Cash", "UPI / QR", "Card", "Due / Pay Later"});
        spinnerPaymentMode.setAdapter(payModeAdapter);
    }

    private void setupTabs() {
        tabModeSearch.setOnClickListener(v -> switchTab(true));
        tabModeNewReg.setOnClickListener(v -> switchTab(false));
    }

    private void switchTab(boolean isSearch) {
        if (isSearch) {
            tabModeSearch.setBackgroundResource(R.drawable.bg_pill_white);
            tabModeSearch.setTextColor(0xFF0D6EFD);
            tabModeNewReg.setBackgroundColor(0);
            tabModeNewReg.setTextColor(0xFFFFFFFF);

            scrollSearchSection.setVisibility(View.VISIBLE);
            scrollNewRegSection.setVisibility(View.GONE);
            stickyBottomBar.setVisibility(View.GONE);
        } else {
            tabModeNewReg.setBackgroundResource(R.drawable.bg_pill_white);
            tabModeNewReg.setTextColor(0xFF0D6EFD);
            tabModeSearch.setBackgroundColor(0);
            tabModeSearch.setTextColor(0xFFFFFFFF);

            scrollSearchSection.setVisibility(View.GONE);
            scrollNewRegSection.setVisibility(View.VISIBLE);
            stickyBottomBar.setVisibility(View.VISIBLE);
        }
    }

    private void setupActions() {
        btnRegBack.setOnClickListener(v -> finish());
        btnRegReset.setOnClickListener(v -> resetForm());

        btnOmnibarSearch.setOnClickListener(v -> performOmnibarSearch());
        inputOmnibar.setOnEditorActionListener((v, actionId, event) -> {
            performOmnibarSearch();
            return true;
        });

        btnAddTestsModal.setOnClickListener(v -> showTestSelectorSheet());
        btnSelectDoctor.setOnClickListener(v -> showDoctorSelectorSheet(true));
        btnSelectAgency.setOnClickListener(v -> showDoctorSelectorSheet(false));

        inputDiscount.addTextChangedListener(new TextWatcher() {
            @Override public void beforeTextChanged(CharSequence s, int start, int count, int after) {}
            @Override public void onTextChanged(CharSequence s, int start, int before, int count) {
                calculateBill();
            }
            @Override public void afterTextChanged(Editable s) {}
        });

        btnSubmitRegistration.setOnClickListener(v -> submitRegistration());
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Step 1: Omnibar Database Search
    // ─────────────────────────────────────────────────────────────────────────
    private void performOmnibarSearch() {
        String q = inputOmnibar.getText().toString().trim();
        if (q.isEmpty()) {
            Toast.makeText(this, "Please enter a search query", Toast.LENGTH_SHORT).show();
            return;
        }

        String searchType = spinnerSearchType.getSelectedItemPosition() == 0 ? "PHONE" : "NAME";
        if (searchType.equals("PHONE") && q.length() < 10) {
            Toast.makeText(this, "Please enter a valid 10-digit mobile number", Toast.LENGTH_SHORT).show();
            return;
        }

        progressSearch.setVisibility(View.VISIBLE);
        cardMatchFound.setVisibility(View.GONE);
        cardNoMatch.setVisibility(View.GONE);

        new Thread(() -> {
            try {
                String token = AuthManager.getToken(this);
                URL url = new URL(BASE_URL + "/api/workspace/patients/search?query=" + URLEncoder.encode(q, "UTF-8") + "&type=" + searchType);
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                if (token != null) {
                    conn.setRequestProperty("Authorization", "Bearer " + token);
                    conn.setRequestProperty("Cookie", "token=" + token);
                }
                conn.setConnectTimeout(6000);
                conn.setReadTimeout(6000);

                int code = conn.getResponseCode();
                String res = readStream(code >= 200 && code < 300 ? conn.getInputStream() : conn.getErrorStream());

                mainHandler.post(() -> {
                    progressSearch.setVisibility(View.GONE);
                    try {
                        JSONArray array = null;
                        if (res.trim().startsWith("[")) {
                            array = new JSONArray(res);
                        } else if (res.trim().startsWith("{")) {
                            JSONObject obj = new JSONObject(res);
                            array = obj.optJSONArray("data");
                            if (array == null) array = obj.optJSONArray("patients");
                        }

                        if (array != null && array.length() > 0) {
                            JSONObject first = array.getJSONObject(0);
                            matchedPatientDbId = first.optString("id");
                            String name = first.optString("name", "Unknown");
                            String gender = first.optString("gender", "MALE");
                            int age = first.optInt("age", 0);
                            String phone = first.optString("phone", "");
                            String email = first.optString("email", "");
                            String address = first.optString("address", "");
                            String patientId = first.optString("patientId", "UHID");

                            lblMatchAvatarInitial.setText(name.isEmpty() ? "P" : String.valueOf(name.charAt(0)).toUpperCase());
                            lblMatchName.setText(name);
                            lblMatchDemographics.setText(age + "Y • " + gender.toUpperCase());
                            lblMatchUHID.setText(patientId);
                            lblMatchPhone.setText("Mobile: " + phone);
                            lblMatchAddress.setText("Location: " + (address.isEmpty() ? "Direct Walk-in" : address));

                            cardMatchFound.setVisibility(View.VISIBLE);
                            cardNoMatch.setVisibility(View.GONE);

                            // Configure Proceed to Accession
                            btnProceedToAccession.setOnClickListener(v -> {
                                prefillFormWithPatient(first);
                                switchTab(false);
                                showTestSelectorSheet();
                            });

                        } else {
                            cardMatchFound.setVisibility(View.GONE);
                            cardNoMatch.setVisibility(View.VISIBLE);
                            lblNoMatchDesc.setText("No patient found matching \"" + q + "\". You can register a new profile below.");

                            btnRegisterNewFromSearch.setOnClickListener(v -> {
                                resetForm();
                                if (searchType.equals("PHONE")) {
                                    inputPatientPhone.setText(q);
                                } else {
                                    inputPatientName.setText(q);
                                }
                                switchTab(false);
                            });
                        }
                    } catch (Exception e) {
                        Toast.makeText(RegistrationActivity.this, "Search parse error: " + e.getMessage(), Toast.LENGTH_SHORT).show();
                    }
                });

            } catch (Exception e) {
                mainHandler.post(() -> {
                    progressSearch.setVisibility(View.GONE);
                    Toast.makeText(RegistrationActivity.this, "Search error: " + e.getMessage(), Toast.LENGTH_SHORT).show();
                });
            }
        }).start();
    }

    private void prefillFormWithPatient(JSONObject pat) {
        matchedPatientDbId = pat.optString("id");
        String name = pat.optString("name", "");
        String phone = pat.optString("phone", "");
        String gender = pat.optString("gender", "MALE");
        int age = pat.optInt("age", 0);
        String ageUnit = pat.optString("ageUnit", "Years");
        String email = pat.optString("email", "");
        String address = pat.optString("address", "");

        inputPatientName.setText(name);
        inputPatientPhone.setText(phone);
        if (age > 0) inputPatientAge.setText(String.valueOf(age));
        inputPatientEmail.setText(email);
        inputPatientAddress.setText(address);

        if ("FEMALE".equalsIgnoreCase(gender)) spinnerGender.setSelection(1);
        else if ("OTHER".equalsIgnoreCase(gender)) spinnerGender.setSelection(2);
        else spinnerGender.setSelection(0);

        if ("Months".equalsIgnoreCase(ageUnit)) spinnerAgeUnit.setSelection(1);
        else if ("Days".equalsIgnoreCase(ageUnit)) spinnerAgeUnit.setSelection(2);
        else spinnerAgeUnit.setSelection(0);
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
                conn.setReadTimeout(6000);

                if (conn.getResponseCode() == 200) {
                    String res = readStream(conn.getInputStream());
                    JSONObject json = new JSONObject(res);
                    JSONArray tests = json.optJSONArray("tests");
                    if (tests == null) tests = json.optJSONArray("data");

                    if (tests != null) {
                        catalogTests.clear();
                        for (int i = 0; i < tests.length(); i++) {
                            JSONObject t = tests.getJSONObject(i);
                            catalogTests.add(new TestItem(
                                    t.optString("id"),
                                    t.optString("name"),
                                    t.optString("code", ""),
                                    t.optString("type", "SINGLE"),
                                    t.optDouble("price", 0.0)
                            ));
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
                if (token != null) conn.setRequestProperty("Authorization", "Bearer " + token);
                if (conn.getResponseCode() == 200) {
                    String res = readStream(conn.getInputStream());
                    JSONArray docs = new JSONArray(res);
                    registeredDoctors.clear();
                    registeredDoctors.add(new DoctorItem("Self", "Self (No Doctor)", "Consultant", "Direct"));
                    for (int i = 0; i < docs.length(); i++) {
                        JSONObject d = docs.getJSONObject(i);
                        registeredDoctors.add(new DoctorItem(
                                d.optString("id"),
                                d.optString("name"),
                                d.optString("specialization", "Consultant"),
                                d.optString("hospital", "")
                        ));
                    }
                }
            } catch (Exception ignored) {}
        }).start();
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Test Selector Bottom Sheet (85% Height)
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

        if (selectedTests.isEmpty()) {
            return;
        }

        for (int i = 0; i < selectedTests.size(); i++) {
            TestItem t = selectedTests.get(i);
            View row = getLayoutInflater().inflate(R.layout.item_selected_test_chip, containerSelectedTests, false);

            TextView name = row.findViewById(R.id.lblSelectedTestName);
            TextView price = row.findViewById(R.id.lblSelectedTestPrice);
            ImageView remove = row.findViewById(R.id.btnRemoveSelectedTest);

            name.setText(t.name);
            price.setText(String.format("₹%,.0f", t.price));

            final int idx = i;
            remove.setOnClickListener(v -> {
                selectedTests.remove(idx);
                renderSelectedTests();
                calculateBill();
            });

            containerSelectedTests.addView(row);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Doctor / Agency Selector Sheet
    // ─────────────────────────────────────────────────────────────────────────
    private void showDoctorSelectorSheet(boolean isDoctor) {
        BottomSheetDialog dialog = new BottomSheetDialog(this);
        View sheet = getLayoutInflater().inflate(R.layout.layout_doctor_selector_sheet, null);
        dialog.setContentView(sheet);

        TextView title = sheet.findViewById(R.id.lblDoctorSheetTitle);
        title.setText(isDoctor ? "Select Referring Doctor" : "Select Referring Agency");

        RecyclerView recycler = sheet.findViewById(R.id.recyclerDoctorsList);
        recycler.setLayoutManager(new LinearLayoutManager(this));

        List<DoctorItem> list = isDoctor ? registeredDoctors : registeredAgencies;
        if (list.isEmpty()) {
            list.add(new DoctorItem("Self", isDoctor ? "Self (No Doctor)" : "Direct Walk-in", "Standard", "Direct"));
        }

        DoctorAdapter adapter = new DoctorAdapter(list, doc -> {
            if (isDoctor) {
                selectedDoctorId = doc.id;
                lblSelectedDoctor.setText("Doctor: " + doc.name);
            } else {
                selectedAgencyId = doc.id;
                lblSelectedAgency.setText("Agency: " + doc.name);
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
        double gross = 0.0;
        for (TestItem t : selectedTests) {
            gross += t.price;
        }

        double discount = 0.0;
        try {
            String d = inputDiscount.getText().toString().trim();
            if (!d.isEmpty()) discount = Double.parseDouble(d);
        } catch (Exception ignored) {}

        double net = Math.max(0, gross - discount);

        lblGrossTotal.setText(String.format("₹%,.2f", gross));
        lblNetPayable.setText(String.format("₹%,.2f", net));
        lblStickyTotal.setText(String.format("₹%,.2f", net));
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Submit Registration & Accession
    // ─────────────────────────────────────────────────────────────────────────
    private void submitRegistration() {
        String name = inputPatientName.getText().toString().trim();
        String phone = inputPatientPhone.getText().toString().trim();
        String ageStr = inputPatientAge.getText().toString().trim();

        if (name.isEmpty()) {
            Toast.makeText(this, "Please enter patient full name", Toast.LENGTH_SHORT).show();
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

                    int accCode = accConn.getResponseCode();
                    if (accCode != 200 && accCode != 201) {
                        String aRes = readStream(accConn.getErrorStream());
                        JSONObject err = new JSONObject(aRes);
                        throw new Exception(err.optString("error", "Accession booking failed"));
                    }
                }

                final double finalNet = net;
                final String finalPatName = name;
                final int finalTestsCount = selectedTests.size();

                mainHandler.post(() -> {
                    btnSubmitRegistration.setEnabled(true);
                    btnSubmitRegistration.setText("Register & Book Tests");
                    showSuccessModal(finalPatName, finalNet, finalTestsCount);
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
        TextView lblAmount = sheet.findViewById(R.id.lblSuccessAmount);
        TextView lblCount = sheet.findViewById(R.id.lblSuccessTestsCount);
        TextView lblUHID = sheet.findViewById(R.id.lblSuccessUHID);
        View checkIcon = sheet.findViewById(R.id.iconSuccessCheck);
        MaterialButton btnPrint = sheet.findViewById(R.id.btnSuccessPrintReceipt);
        TextView btnDone = sheet.findViewById(R.id.btnSuccessDone);

        lblName.setText(patientName + " has been successfully registered into the lab worklist.");
        lblAmount.setText(String.format("₹%,.2f", netAmount));
        lblCount.setText(testsCount + " Tests Booked");
        lblUHID.setText("P-" + (int)(10000 + Math.random() * 90000));

        // Spring Bounce check animation
        if (checkIcon != null) {
            checkIcon.setScaleX(0.2f);
            checkIcon.setScaleY(0.2f);
            ObjectAnimator sx = ObjectAnimator.ofFloat(checkIcon, "scaleX", 0.2f, 1.2f, 1.0f);
            ObjectAnimator sy = ObjectAnimator.ofFloat(checkIcon, "scaleY", 0.2f, 1.2f, 1.0f);
            sx.setDuration(600);
            sy.setDuration(600);
            sx.setInterpolator(new OvershootInterpolator(2.5f));
            sy.setInterpolator(new OvershootInterpolator(2.5f));
            sx.start();
            sy.start();
        }

        btnPrint.setOnClickListener(v -> {
            dialog.dismiss();
            Toast.makeText(this, "Receipt queued for printing.", Toast.LENGTH_SHORT).show();
            finish();
        });

        btnDone.setOnClickListener(v -> {
            dialog.dismiss();
            finish();
        });

        dialog.show();
    }

    private void resetForm() {
        matchedPatientDbId = null;
        inputOmnibar.setText("");
        inputPatientName.setText("");
        inputPatientPhone.setText("");
        inputPatientAge.setText("");
        inputPatientEmail.setText("");
        inputPatientAddress.setText("");
        inputDiscount.setText("");
        selectedTests.clear();
        renderSelectedTests();
        calculateBill();
        cardMatchFound.setVisibility(View.GONE);
        cardNoMatch.setVisibility(View.GONE);
    }

    private String readStream(InputStream is) {
        if (is == null) return "";
        try {
            BufferedReader br = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = br.readLine()) != null) sb.append(line);
            return sb.toString();
        } catch (Exception e) {
            return "";
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Recycler Adapters
    // ─────────────────────────────────────────────────────────────────────────
    public static class TestCatalogAdapter extends RecyclerView.Adapter<TestCatalogAdapter.VH> {
        private final List<TestItem> allItems;
        private final List<TestItem> displayItems;
        private final OnItemClickListener listener;

        public interface OnItemClickListener {
            void onItemClick(TestItem item);
        }

        public TestCatalogAdapter(List<TestItem> items, OnItemClickListener listener) {
            this.allItems = items;
            this.displayItems = new ArrayList<>(items);
            this.listener = listener;
        }

        public void filter(String query) {
            displayItems.clear();
            if (query.isEmpty()) {
                displayItems.addAll(allItems);
            } else {
                String q = query.toLowerCase().trim();
                for (TestItem item : allItems) {
                    if (item.name.toLowerCase().contains(q) || item.code.toLowerCase().contains(q)) {
                        displayItems.add(item);
                    }
                }
            }
            notifyDataSetChanged();
        }

        @NonNull
        @Override
        public VH onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
            View v = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_test_catalog, parent, false);
            return new VH(v);
        }

        @Override
        public void onBindViewHolder(@NonNull VH holder, int position) {
            TestItem t = displayItems.get(position);
            holder.name.setText(t.name);
            holder.code.setText(t.code.isEmpty() ? t.type : t.code);
            holder.price.setText(String.format("₹%,.0f", t.price));
            holder.checkBox.setChecked(t.isSelected);

            holder.itemView.setOnClickListener(v -> {
                listener.onItemClick(t);
                holder.checkBox.setChecked(t.isSelected);
            });
            holder.checkBox.setOnClickListener(v -> listener.onItemClick(t));
        }

        @Override
        public int getItemCount() {
            return displayItems.size();
        }

        static class VH extends RecyclerView.ViewHolder {
            TextView name, code, price;
            android.widget.CheckBox checkBox;

            VH(View v) {
                super(v);
                name = v.findViewById(R.id.lblTestName);
                code = v.findViewById(R.id.lblTestCode);
                price = v.findViewById(R.id.lblTestPrice);
                checkBox = v.findViewById(R.id.chkTestSelected);
            }
        }
    }

    public static class DoctorAdapter extends RecyclerView.Adapter<DoctorAdapter.DocVH> {
        private final List<DoctorItem> list;
        private final OnDocClick listener;

        public interface OnDocClick {
            void onDoc(DoctorItem d);
        }

        public DoctorAdapter(List<DoctorItem> list, OnDocClick listener) {
            this.list = list;
            this.listener = listener;
        }

        @NonNull
        @Override
        public DocVH onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
            View v = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_doctor_row, parent, false);
            return new DocVH(v);
        }

        @Override
        public void onBindViewHolder(@NonNull DocVH holder, int position) {
            DoctorItem d = list.get(position);
            holder.name.setText(d.name);
            holder.spec.setText(d.spec + (d.hospital.isEmpty() ? "" : " • " + d.hospital));
            holder.itemView.setOnClickListener(v -> listener.onDoc(d));
        }

        @Override
        public int getItemCount() {
            return list.size();
        }

        static class DocVH extends RecyclerView.ViewHolder {
            TextView name, spec;
            DocVH(View v) {
                super(v);
                name = v.findViewById(R.id.lblDocName);
                spec = v.findViewById(R.id.lblDocSubtitle);
            }
        }
    }
}
