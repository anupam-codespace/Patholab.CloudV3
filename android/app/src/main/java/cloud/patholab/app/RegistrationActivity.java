package cloud.patholab.app;

import android.animation.ObjectAnimator;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.view.animation.OvershootInterpolator;
import android.util.TypedValue;
import android.widget.AdapterView;
import android.widget.ArrayAdapter;
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
import androidx.appcompat.app.AppCompatActivity;
import androidx.appcompat.widget.SwitchCompat;
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
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;

import cloud.patholab.app.auth.AuthManager;

/**
 * RegistrationActivity
 * ────────────────────
 * Native Android Patient Registration & Clinical Accession Console.
 * Directly mirroring the exact web workflow and sequence with 100% complete feature parity:
 *  1. Step 1: Database Omnibar Lookup & Duplicate Prevention (/workspace/registration)
 *  2. Step 2: Demographics, Duplicate Warnings, Referral, Test Accession, & Billing (/workspace/patients/new & /accession)
 */
public class RegistrationActivity extends AppCompatActivity {

    private static final String BASE_URL = "https://patholab.cloud";
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private Runnable nameCheckRunnable;

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
    private View cardMatchFound, cardNoMatch;
    private TextView lblMatchAvatarInitial, lblMatchName, lblMatchDemographics, lblMatchUHID, lblMatchPhone, lblMatchAddress;
    private MaterialButton btnProceedToAccession, btnRegisterNewFromSearch;
    private TextView lblNoMatchDesc;

    // ── Tab 2: Demographics Form Views ───────────────────────────────────────
    private Spinner spinnerTitle, spinnerGender, spinnerAgeUnit, spinnerCollector, spinnerPaymentMode;
    private EditText inputPatientName, inputPatientPhone, inputPatientAge, inputPatientEmail, inputPatientAddress;
    private LinearLayout layoutWarningDuplicate;
    private TextView lblWarningDuplicate;
    private EditText inputAbhaNumber, inputPassport, inputCollectionDate, inputCollectionTime;

    // ── Clinical Referral & Accession Views ───────────────────────────────────
    private LinearLayout btnSelectDoctor, btnSelectAgency;
    private TextView lblSelectedDoctor, lblSelectedAgency;
    private String selectedDoctorId = "Self";
    private String selectedAgencyId = "Direct";

    // ── Tests & Accession Views ──────────────────────────────────────────────
    private LinearLayout containerSelectedTests, btnAddTestsModal;
    private TextView lblTestsCountBadge, lblGrossTotal, lblNetPayable, lblStickyTotal;
    private SwitchCompat switchUrgentOrder;
    private CheckBox cbPrintSlip, cbPrintBarcode;

    // ── Billing Views ────────────────────────────────────────────────────────
    private TextView chipDisc0, chipDisc5, chipDisc10, chipDisc15, chipDisc20, chipDisc50;
    private EditText inputDiscount, inputPaidAmount;
    private TextView lblDueAmount;
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
        StatusBarHelper.setStatusBarSapphire(this);
        setContentView(R.layout.activity_registration);

        bindViews();
        setupSpinners();
        setupTabs();
        setupDateTimeDefaults();
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
        layoutWarningDuplicate = findViewById(R.id.layoutWarningDuplicate);
        lblWarningDuplicate  = findViewById(R.id.lblWarningDuplicate);
        inputPatientPhone    = findViewById(R.id.inputPatientPhone);
        spinnerGender        = findViewById(R.id.spinnerGender);
        inputPatientAge      = findViewById(R.id.inputPatientAge);
        spinnerAgeUnit       = findViewById(R.id.spinnerAgeUnit);
        inputPatientEmail    = findViewById(R.id.inputPatientEmail);
        inputPatientAddress  = findViewById(R.id.inputPatientAddress);
        inputAbhaNumber      = findViewById(R.id.inputAbhaNumber);
        inputPassport        = findViewById(R.id.inputPassport);
        inputCollectionDate  = findViewById(R.id.inputCollectionDate);
        inputCollectionTime  = findViewById(R.id.inputCollectionTime);

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
        switchUrgentOrder    = findViewById(R.id.switchUrgentOrder);
        cbPrintSlip          = findViewById(R.id.cbPrintSlip);
        cbPrintBarcode       = findViewById(R.id.cbPrintBarcode);

        // Billing
        lblGrossTotal        = findViewById(R.id.lblGrossTotal);
        chipDisc0            = findViewById(R.id.chipDisc0);
        chipDisc5            = findViewById(R.id.chipDisc5);
        chipDisc10           = findViewById(R.id.chipDisc10);
        chipDisc15           = findViewById(R.id.chipDisc15);
        chipDisc20           = findViewById(R.id.chipDisc20);
        chipDisc50           = findViewById(R.id.chipDisc50);
        inputDiscount        = findViewById(R.id.inputDiscount);
        lblNetPayable        = findViewById(R.id.lblNetPayable);
        inputPaidAmount      = findViewById(R.id.inputPaidAmount);
        lblDueAmount         = findViewById(R.id.lblDueAmount);
        spinnerPaymentMode   = findViewById(R.id.spinnerPaymentMode);
        lblStickyTotal       = findViewById(R.id.lblStickyTotal);
        btnSubmitRegistration = findViewById(R.id.btnSubmitRegistration);
    }

    private void setupDateTimeDefaults() {
        SimpleDateFormat df = new SimpleDateFormat("yyyy-MM-dd", Locale.getDefault());
        SimpleDateFormat tf = new SimpleDateFormat("HH:mm", Locale.getDefault());
        Date now = new Date();
        if (inputCollectionDate != null) inputCollectionDate.setText(df.format(now));
        if (inputCollectionTime != null) inputCollectionTime.setText(tf.format(now));
    }

    private ArrayAdapter<String> createCleanAdapter(String[] items) {
        ArrayAdapter<String> adapter = new ArrayAdapter<>(this, R.layout.item_spinner_selected, items);
        adapter.setDropDownViewResource(R.layout.item_spinner_dropdown);
        return adapter;
    }

    private void setupSpinners() {
        // Search Type
        spinnerSearchType.setAdapter(createCleanAdapter(new String[]{"Phone", "Name"}));
        spinnerSearchType.setOnItemSelectedListener(new AdapterView.OnItemSelectedListener() {
            @Override
            public void onItemSelected(AdapterView<?> parent, View view, int position, long id) {
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
            @Override public void onNothingSelected(AdapterView<?> parent) {}
        });

        // Title
        spinnerTitle.setAdapter(createCleanAdapter(new String[]{"Mr.", "Mrs.", "Ms.", "Master", "Dr.", "Baby", "Mx."}));

        // Gender
        spinnerGender.setAdapter(createCleanAdapter(new String[]{"MALE", "FEMALE", "OTHER"}));

        // Age Unit
        spinnerAgeUnit.setAdapter(createCleanAdapter(new String[]{"Years", "Months", "Days"}));

        // Collector
        spinnerCollector.setAdapter(createCleanAdapter(new String[]{"Lab Phlebotomist", "Home Collection Agent", "Self (Patient)"}));

        // Payment Mode
        spinnerPaymentMode.setAdapter(createCleanAdapter(new String[]{"Cash", "UPI / QR", "Card", "Due / Pay Later"}));
        spinnerPaymentMode.setOnItemSelectedListener(new AdapterView.OnItemSelectedListener() {
            @Override
            public void onItemSelected(AdapterView<?> parent, View view, int position, long id) {
                calculateBill();
            }
            @Override public void onNothingSelected(AdapterView<?> parent) {}
        });
    }

    private void setupTabs() {
        tabModeSearch.setOnClickListener(v -> switchTab(true));
        tabModeNewReg.setOnClickListener(v -> switchTab(false));
    }

    private void switchTab(boolean isSearch) {
        if (isSearch) {
            tabModeSearch.setBackgroundResource(R.drawable.bg_pill_white);
            tabModeSearch.setTextColor(0xFF0D6EFD);
            tabModeSearch.setElevation(dp(2));
            tabModeNewReg.setBackgroundColor(0);
            tabModeNewReg.setTextColor(0xFFFFFFFF);
            tabModeNewReg.setElevation(0);

            scrollSearchSection.setVisibility(View.VISIBLE);
            scrollNewRegSection.setVisibility(View.GONE);
            stickyBottomBar.setVisibility(View.GONE);
        } else {
            tabModeNewReg.setBackgroundResource(R.drawable.bg_pill_white);
            tabModeNewReg.setTextColor(0xFF0D6EFD);
            tabModeNewReg.setElevation(dp(2));
            tabModeSearch.setBackgroundColor(0);
            tabModeSearch.setTextColor(0xFFFFFFFF);
            tabModeSearch.setElevation(0);

            scrollSearchSection.setVisibility(View.GONE);
            scrollNewRegSection.setVisibility(View.VISIBLE);
            stickyBottomBar.setVisibility(View.VISIBLE);
        }
    }

    private float dp(float value) {
        return TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, value, getResources().getDisplayMetrics());
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

        // Quick discount percent chips
        chipDisc0.setOnClickListener(v -> applyDiscountPercent(0));
        chipDisc5.setOnClickListener(v -> applyDiscountPercent(5));
        chipDisc10.setOnClickListener(v -> applyDiscountPercent(10));
        chipDisc15.setOnClickListener(v -> applyDiscountPercent(15));
        chipDisc20.setOnClickListener(v -> applyDiscountPercent(20));
        chipDisc50.setOnClickListener(v -> applyDiscountPercent(50));

        inputDiscount.addTextChangedListener(new TextWatcher() {
            @Override public void beforeTextChanged(CharSequence s, int start, int count, int after) {}
            @Override public void onTextChanged(CharSequence s, int start, int before, int count) {
                calculateBill();
            }
            @Override public void afterTextChanged(Editable s) {}
        });

        inputPaidAmount.addTextChangedListener(new TextWatcher() {
            @Override public void beforeTextChanged(CharSequence s, int start, int count, int after) {}
            @Override public void onTextChanged(CharSequence s, int start, int before, int count) {
                updateDueAmount();
            }
            @Override public void afterTextChanged(Editable s) {}
        });

        // Live duplicate name check
        inputPatientName.addTextChangedListener(new TextWatcher() {
            @Override public void beforeTextChanged(CharSequence s, int start, int count, int after) {}
            @Override public void onTextChanged(CharSequence s, int start, int before, int count) {
                if (nameCheckRunnable != null) mainHandler.removeCallbacks(nameCheckRunnable);
                String query = s.toString().trim();
                if (query.length() >= 3) {
                    nameCheckRunnable = () -> checkDuplicateName(query);
                    mainHandler.postDelayed(nameCheckRunnable, 500);
                } else {
                    layoutWarningDuplicate.setVisibility(View.GONE);
                }
            }
            @Override public void afterTextChanged(Editable s) {}
        });

        btnSubmitRegistration.setOnClickListener(v -> submitRegistration());
    }

    private void applyDiscountPercent(int percent) {
        double gross = selectedTests.stream().mapToDouble(t -> t.price).sum();
        double discount = Math.round(gross * (percent / 100.0));
        inputDiscount.setText(discount > 0 ? String.valueOf((int)discount) : "");
        calculateBill();
    }

    private void checkDuplicateName(String name) {
        new Thread(() -> {
            try {
                String token = AuthManager.getToken(this);
                URL url = new URL(BASE_URL + "/api/workspace/patients/search?query=" + URLEncoder.encode(name, "UTF-8") + "&type=NAME");
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                if (token != null) {
                    conn.setRequestProperty("Authorization", "Bearer " + token);
                    conn.setRequestProperty("Cookie", "token=" + token);
                }
                if (conn.getResponseCode() == 200) {
                    String res = readStream(conn.getInputStream());
                    JSONArray arr = new JSONArray(res);
                    mainHandler.post(() -> {
                        if (arr.length() > 0) {
                            lblWarningDuplicate.setText("Found " + arr.length() + " existing record(s) matching \"" + name + "\". Use Search Database to avoid duplicate visits.");
                            layoutWarningDuplicate.setVisibility(View.VISIBLE);
                        } else {
                            layoutWarningDuplicate.setVisibility(View.GONE);
                        }
                    });
                }
            } catch (Exception ignored) {}
        }).start();
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

                int code = conn.getResponseCode();
                if (code == 200) {
                    String res = readStream(conn.getInputStream());
                    JSONArray results = new JSONArray(res);

                    mainHandler.post(() -> {
                        progressSearch.setVisibility(View.GONE);
                        if (results.length() > 0) {
                            JSONObject firstMatch = results.optJSONObject(0);
                            showMatchFoundCard(firstMatch);
                        } else {
                            showNoMatchCard(q);
                        }
                    });
                } else {
                    mainHandler.post(() -> {
                        progressSearch.setVisibility(View.GONE);
                        showNoMatchCard(q);
                    });
                }
            } catch (Exception e) {
                mainHandler.post(() -> {
                    progressSearch.setVisibility(View.GONE);
                    Toast.makeText(RegistrationActivity.this, "Search error: " + e.getMessage(), Toast.LENGTH_SHORT).show();
                });
            }
        }).start();
    }

    private void showMatchFoundCard(JSONObject pat) {
        if (pat == null) return;
        cardMatchFound.setVisibility(View.VISIBLE);
        cardNoMatch.setVisibility(View.GONE);

        matchedPatientDbId = pat.optString("id", null);
        String name = pat.optString("name", "Patient");
        String uhid = pat.optString("patientId", "UHID-N/A");
        String phone = pat.optString("phone", "N/A");
        String gender = pat.optString("gender", "MALE");
        int age = pat.optInt("age", 0);
        String ageUnit = pat.optString("ageUnit", "Years");
        String address = pat.optString("address", "No address recorded");

        lblMatchAvatarInitial.setText(name.isEmpty() ? "P" : name.substring(0, 1).toUpperCase());
        lblMatchName.setText(name);
        lblMatchUHID.setText("ID: " + uhid);
        lblMatchDemographics.setText(age + " " + ageUnit + " • " + gender);
        lblMatchPhone.setText(phone);
        lblMatchAddress.setText(address);

        btnProceedToAccession.setOnClickListener(v -> {
            // Fill existing demographic info and jump to Accession tab
            inputPatientName.setText(name);
            inputPatientPhone.setText(phone);
            inputPatientAge.setText(String.valueOf(age));
            inputPatientAddress.setText(address.equals("No address recorded") ? "" : address);

            for (int i = 0; i < spinnerGender.getCount(); i++) {
                if (spinnerGender.getItemAtPosition(i).toString().equalsIgnoreCase(gender)) {
                    spinnerGender.setSelection(i);
                    break;
                }
            }

            switchTab(false);
            Toast.makeText(this, "Existing record loaded. Add tests to accession.", Toast.LENGTH_SHORT).show();
        });
    }

    private void showNoMatchCard(String query) {
        cardMatchFound.setVisibility(View.GONE);
        cardNoMatch.setVisibility(View.VISIBLE);
        lblNoMatchDesc.setText("We couldn't find a record matching \"" + query + "\" in the laboratory database.");

        btnRegisterNewFromSearch.setOnClickListener(v -> {
            resetForm();
            if (spinnerSearchType.getSelectedItemPosition() == 0) {
                inputPatientPhone.setText(query);
            } else {
                inputPatientName.setText(query);
            }
            switchTab(false);
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Step 2: Test Catalog Accession Modal
    // ─────────────────────────────────────────────────────────────────────────
    private void showTestSelectorSheet() {
        BottomSheetDialog sheetDialog = new BottomSheetDialog(this);
        View sheet = getLayoutInflater().inflate(R.layout.layout_test_selector_sheet, null);
        sheetDialog.setContentView(sheet);

        EditText search = sheet.findViewById(R.id.inputSearchTest);
        RecyclerView recycler = sheet.findViewById(R.id.recyclerTestsCatalog);
        TextView lblCount = sheet.findViewById(R.id.lblSelectedCount);
        TextView lblTotal = sheet.findViewById(R.id.lblSheetTotalAmount);
        MaterialButton btnDone = sheet.findViewById(R.id.btnDoneSelectingTests);
        FrameLayout btnClose = sheet.findViewById(R.id.btnCloseTestSheet);

        recycler.setLayoutManager(new LinearLayoutManager(this));

        TestCatalogAdapter adapter = new TestCatalogAdapter(catalogTests, (item, isChecked) -> {
            item.isSelected = isChecked;
            if (isChecked) {
                if (!selectedTests.contains(item)) selectedTests.add(item);
            } else {
                selectedTests.remove(item);
            }
            double curTotal = selectedTests.stream().mapToDouble(t -> t.price).sum();
            lblCount.setText(selectedTests.size() + " test(s) selected");
            lblTotal.setText(String.format("₹%,.2f", curTotal));
        });
        recycler.setAdapter(adapter);

        double initTotal = selectedTests.stream().mapToDouble(t -> t.price).sum();
        lblCount.setText(selectedTests.size() + " test(s) selected");
        lblTotal.setText(String.format("₹%,.2f", initTotal));

        search.addTextChangedListener(new TextWatcher() {
            @Override public void beforeTextChanged(CharSequence s, int start, int count, int after) {}
            @Override public void onTextChanged(CharSequence s, int start, int before, int count) {
                adapter.filter(s.toString());
            }
            @Override public void afterTextChanged(Editable s) {}
        });

        btnDone.setOnClickListener(v -> {
            renderSelectedTests();
            calculateBill();
            sheetDialog.dismiss();
        });

        btnClose.setOnClickListener(v -> sheetDialog.dismiss());

        sheetDialog.show();
    }

    private static class TestCatalogAdapter extends RecyclerView.Adapter<TestCatalogAdapter.ViewHolder> {
        private final List<TestItem> original;
        private final List<TestItem> displayed;
        private final OnTestSelectedListener listener;

        interface OnTestSelectedListener {
            void onSelected(TestItem item, boolean isChecked);
        }

        public TestCatalogAdapter(List<TestItem> items, OnTestSelectedListener listener) {
            this.original = items;
            this.displayed = new ArrayList<>(items);
            this.listener = listener;
        }

        public void filter(String query) {
            displayed.clear();
            if (query.trim().isEmpty()) {
                displayed.addAll(original);
            } else {
                String q = query.toLowerCase().trim();
                for (TestItem t : original) {
                    if (t.name.toLowerCase().contains(q) || t.code.toLowerCase().contains(q)) {
                        displayed.add(t);
                    }
                }
            }
            notifyDataSetChanged();
        }

        @NonNull
        @Override
        public ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
            View v = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_test_catalog, parent, false);
            return new ViewHolder(v);
        }

        @Override
        public void onBindViewHolder(@NonNull ViewHolder holder, int position) {
            TestItem t = displayed.get(position);
            holder.lblName.setText(t.name);
            holder.lblCode.setText(t.code);
            holder.lblType.setText(t.type);
            holder.lblPrice.setText(String.format("₹%,.0f", t.price));
            holder.cbSelect.setChecked(t.isSelected);

            holder.itemView.setOnClickListener(v -> {
                boolean newState = !holder.cbSelect.isChecked();
                holder.cbSelect.setChecked(newState);
                listener.onSelected(t, newState);
            });
            holder.cbSelect.setOnClickListener(v -> listener.onSelected(t, holder.cbSelect.isChecked()));
        }

        @Override
        public int getItemCount() { return displayed.size(); }

        static class ViewHolder extends RecyclerView.ViewHolder {
            TextView lblName, lblCode, lblType, lblPrice;
            CheckBox cbSelect;
            public ViewHolder(@NonNull View itemView) {
                super(itemView);
                lblName = itemView.findViewById(R.id.lblTestName);
                lblCode = itemView.findViewById(R.id.lblTestCode);
                lblType = itemView.findViewById(R.id.lblTestType);
                lblPrice = itemView.findViewById(R.id.lblTestPrice);
                cbSelect = itemView.findViewById(R.id.chkTestSelected);
            }
        }
    }

    private void renderSelectedTests() {
        containerSelectedTests.removeAllViews();
        lblTestsCountBadge.setText(selectedTests.size() + " selected");

        LayoutInflater inflater = LayoutInflater.from(this);
        for (int i = 0; i < selectedTests.size(); i++) {
            TestItem t = selectedTests.get(i);
            View row = inflater.inflate(R.layout.item_selected_test_chip, containerSelectedTests, false);

            TextView name = row.findViewById(R.id.lblSelectedTestName);
            TextView code = row.findViewById(R.id.lblSelectedTestCode);
            TextView price = row.findViewById(R.id.lblSelectedTestPrice);
            ImageView remove = row.findViewById(R.id.btnRemoveSelectedTest);

            name.setText(t.name);
            code.setText(t.code);
            price.setText(String.format("₹%,.0f", t.price));

            final int idx = i;
            remove.setOnClickListener(v -> {
                t.isSelected = false;
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

        EditText search = sheet.findViewById(R.id.inputSearchDoctor);
        search.setHint(isDoctor ? "Search doctor name or hospital..." : "Search agency or center name...");

        FrameLayout btnClose = sheet.findViewById(R.id.btnCloseDocSheet);
        btnClose.setOnClickListener(v -> dialog.dismiss());

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

        search.addTextChangedListener(new TextWatcher() {
            @Override public void beforeTextChanged(CharSequence s, int start, int count, int after) {}
            @Override public void onTextChanged(CharSequence s, int start, int before, int count) {
                adapter.filter(s.toString());
            }
            @Override public void afterTextChanged(Editable s) {}
        });

        dialog.show();
    }

    private static class DoctorAdapter extends RecyclerView.Adapter<DoctorAdapter.ViewHolder> {
        private final List<DoctorItem> original;
        private final List<DoctorItem> displayed;
        private final OnDoctorSelected listener;

        interface OnDoctorSelected {
            void onSelected(DoctorItem doc);
        }

        public DoctorAdapter(List<DoctorItem> items, OnDoctorSelected listener) {
            this.original = items;
            this.displayed = new ArrayList<>(items);
            this.listener = listener;
        }

        public void filter(String query) {
            displayed.clear();
            if (query.trim().isEmpty()) {
                displayed.addAll(original);
            } else {
                String q = query.toLowerCase().trim();
                for (DoctorItem d : original) {
                    if (d.name.toLowerCase().contains(q) || d.hospital.toLowerCase().contains(q)) {
                        displayed.add(d);
                    }
                }
            }
            notifyDataSetChanged();
        }

        @NonNull
        @Override
        public ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
            View v = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_doctor_row, parent, false);
            return new ViewHolder(v);
        }

        @Override
        public void onBindViewHolder(@NonNull ViewHolder holder, int position) {
            DoctorItem d = displayed.get(position);
            holder.lblName.setText(d.name);
            holder.lblSpec.setText(d.hospital != null && !d.hospital.isEmpty() ? d.hospital : "Registered Partner");
            holder.itemView.setOnClickListener(v -> listener.onSelected(d));
        }

        @Override
        public int getItemCount() { return displayed.size(); }

        static class ViewHolder extends RecyclerView.ViewHolder {
            TextView lblName, lblSpec;
            public ViewHolder(@NonNull View itemView) {
                super(itemView);
                lblName = itemView.findViewById(R.id.lblDocName);
                lblSpec = itemView.findViewById(R.id.lblDocSubtitle);
            }
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Live Bill Math
    // ─────────────────────────────────────────────────────────────────────────
    private void calculateBill() {
        double gross = selectedTests.stream().mapToDouble(t -> t.price).sum();

        double discount = 0.0;
        try {
            String d = inputDiscount.getText().toString().trim();
            if (!d.isEmpty()) discount = Double.parseDouble(d);
        } catch (Exception ignored) {}

        double net = Math.max(0, gross - discount);

        lblGrossTotal.setText(String.format("₹%,.2f", gross));
        lblNetPayable.setText(String.format("₹%,.2f", net));
        lblStickyTotal.setText(String.format("₹%,.2f", net));

        String payMode = spinnerPaymentMode.getSelectedItem() != null ? spinnerPaymentMode.getSelectedItem().toString() : "Cash";
        if (payMode.contains("Due") || payMode.contains("Later")) {
            inputPaidAmount.setText("0");
        } else {
            inputPaidAmount.setText(net > 0 ? String.valueOf((int)net) : "0");
        }

        updateDueAmount();
    }

    private void updateDueAmount() {
        double gross = selectedTests.stream().mapToDouble(t -> t.price).sum();
        double discount = 0.0;
        try {
            String d = inputDiscount.getText().toString().trim();
            if (!d.isEmpty()) discount = Double.parseDouble(d);
        } catch (Exception ignored) {}
        double net = Math.max(0, gross - discount);

        double paid = 0.0;
        try {
            String p = inputPaidAmount.getText().toString().trim();
            if (!p.isEmpty()) paid = Double.parseDouble(p);
        } catch (Exception ignored) {}

        double due = Math.max(0, net - paid);
        if (lblDueAmount != null) {
            lblDueAmount.setText(String.format("₹%,.2f", due));
        }
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
        btnSubmitRegistration.setText("Checking wallet...");

        // ── Step 0: Upfront wallet balance guard ─────────────────────────────
        new Thread(() -> {
            boolean walletOk = true;
            try {
                String tokenCheck = AuthManager.getToken(this);
                URL walletUrl = new URL(BASE_URL + "/api/workspace/wallet/details");
                HttpURLConnection wc = (HttpURLConnection) walletUrl.openConnection();
                if (tokenCheck != null) {
                    wc.setRequestProperty("Authorization", "Bearer " + tokenCheck);
                    wc.setRequestProperty("Cookie", "token=" + tokenCheck);
                }
                wc.setConnectTimeout(5000);
                wc.setReadTimeout(5000);
                if (wc.getResponseCode() == 200) {
                    String wRes = readStream(wc.getInputStream());
                    JSONObject wRoot = new JSONObject(wRes);
                    JSONObject walletObj = wRoot.optJSONObject("wallet");
                    if (walletObj == null) walletObj = wRoot;
                    double bal = walletObj.optDouble("balance", 1.0);
                    if (bal <= 0) {
                        walletOk = false;
                    }
                }
            } catch (Exception ignored) {}

            final boolean canProceed = walletOk;
            mainHandler.post(() -> {
                if (!canProceed) {
                    btnSubmitRegistration.setEnabled(true);
                    btnSubmitRegistration.setText("Register & Book Tests");
                    WalletAlertHelper.showWalletEmptyToast(RegistrationActivity.this);
                    String userScopeId = AuthManager.getUserEmail(RegistrationActivity.this);
                    MobileNotificationHelper.postLowBalanceNotification(RegistrationActivity.this, 0.0, userScopeId);
                    return;
                }
                btnSubmitRegistration.setText("Registering...");
                proceedWithRegistration(name, phone, ageStr);
            });
        }).start();
    }

    /** Actual registration API call — only invoked after wallet guard passes. */
    private void proceedWithRegistration(String name, String phone, String ageStr) {
        new Thread(() -> {
            try {
                String token = AuthManager.getToken(this);
                String title = spinnerTitle.getSelectedItem().toString();
                String gender = spinnerGender.getSelectedItem().toString();
                String ageUnit = spinnerAgeUnit.getSelectedItem().toString();
                String email = inputPatientEmail.getText().toString().trim();
                String address = inputPatientAddress.getText().toString().trim();
                String abha = inputAbhaNumber.getText().toString().trim();
                String passport = inputPassport.getText().toString().trim();
                String paymentMode = spinnerPaymentMode.getSelectedItem().toString();
                String collector = spinnerCollector.getSelectedItem().toString();
                String cDate = inputCollectionDate.getText().toString().trim();
                String cTime = inputCollectionTime.getText().toString().trim();
                boolean isUrgent = switchUrgentOrder.isChecked();

                double gross = selectedTests.stream().mapToDouble(t -> t.price).sum();
                double discount = 0.0;
                try {
                    String d = inputDiscount.getText().toString().trim();
                    if (!d.isEmpty()) discount = Double.parseDouble(d);
                } catch (Exception ignored) {}
                double net = Math.max(0, gross - discount);

                double paid = net;
                try {
                    String p = inputPaidAmount.getText().toString().trim();
                    if (!p.isEmpty()) paid = Double.parseDouble(p);
                } catch (Exception ignored) {}

                String patientId = matchedPatientDbId;
                String generatedUhid = "P-" + (int)(10000 + Math.random() * 90000);
                String generatedInvoiceNo = "INV-" + (int)(10000 + Math.random() * 90000);

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
                    if (!abha.isEmpty()) body.put("abhaNumber", abha);
                    if (!passport.isEmpty()) body.put("passport", passport);
                    body.put("doctorId", selectedDoctorId.equals("Self") ? null : selectedDoctorId);
                    body.put("agencyId", selectedAgencyId.equals("Direct") ? null : selectedAgencyId);
                    body.put("paymentMode", paymentMode);
                    body.put("collectedBy", collector);

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
                    if (patObj != null) {
                        patientId = patObj.optString("id");
                        generatedUhid = patObj.optString("patientId", generatedUhid);
                    } else {
                        patientId = resObj.optString("id");
                    }
                }

                // Step 2: Book Accession Tests if any
                if (patientId != null && !selectedTests.isEmpty()) {
                    JSONObject accBody = new JSONObject();
                    accBody.put("patientId", patientId);
                    accBody.put("subtotal", gross);
                    accBody.put("discountAmount", discount);
                    accBody.put("grandTotal", net);
                    accBody.put("paidAmount", paid);
                    accBody.put("paymentMode", paymentMode.toUpperCase().contains("CASH") ? "CASH" : (paymentMode.toUpperCase().contains("CARD") ? "CARD" : (paymentMode.toUpperCase().contains("DUE") ? "DUE" : "UPI")));
                    accBody.put("collectedBy", collector);
                    accBody.put("isUrgent", isUrgent);
                    if (!cDate.isEmpty() && !cTime.isEmpty()) {
                        accBody.put("collectedAt", cDate + "T" + cTime + ":00Z");
                    }

                    JSONArray testArr = new JSONArray();
                    for (TestItem st : selectedTests) {
                        JSONObject tj = new JSONObject();
                        tj.put("testTemplateId", st.id);
                        tj.put("testCode", st.code);
                        tj.put("testName", st.name);
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
                    } else {
                        String aRes = readStream(accConn.getInputStream());
                        JSONObject aObj = new JSONObject(aRes);
                        JSONObject inv = aObj.optJSONObject("data");
                        if (inv != null) {
                            generatedInvoiceNo = inv.optString("invoiceNumber", generatedInvoiceNo);
                        }
                    }
                }

                final double finalNet = net;
                final String finalPatName = name;
                final String finalPhone = phone;
                final String finalUhid = generatedUhid;
                final String finalInv = generatedInvoiceNo;
                final int finalTestsCount = selectedTests.size();

                mainHandler.post(() -> {
                    btnSubmitRegistration.setEnabled(true);
                    btnSubmitRegistration.setText("Register & Book Tests");
                    showSuccessModal(finalPatName, finalPhone, finalUhid, finalInv, finalNet, finalTestsCount);
                });

            } catch (Exception e) {
                mainHandler.post(() -> {
                    btnSubmitRegistration.setEnabled(true);
                    btnSubmitRegistration.setText("Register & Book Tests");
                    if (e.getMessage() != null && (e.getMessage().toLowerCase().contains("wallet") || e.getMessage().toLowerCase().contains("recharge") || e.getMessage().toLowerCase().contains("balance") || e.getMessage().toLowerCase().contains("insufficient"))) {
                        WalletAlertHelper.showWalletEmptyToast(RegistrationActivity.this);
                        String userScopeId = AuthManager.getUserEmail(RegistrationActivity.this);
                        MobileNotificationHelper.postLowBalanceNotification(RegistrationActivity.this, 0.0, userScopeId);
                    } else {
                        Toast.makeText(RegistrationActivity.this, "Error: " + e.getMessage(), Toast.LENGTH_LONG).show();
                    }
                });
            }
        }).start();
    }

    private void showSuccessModal(String patientName, String phone, String uhid, String invoiceNo, double netAmount, int testsCount) {
        BottomSheetDialog dialog = new BottomSheetDialog(this);
        View sheet = getLayoutInflater().inflate(R.layout.layout_registration_success_sheet, null);
        dialog.setContentView(sheet);

        TextView lblName = sheet.findViewById(R.id.lblSuccessPatientName);
        TextView lblAmount = sheet.findViewById(R.id.lblSuccessAmount);
        TextView lblCount = sheet.findViewById(R.id.lblSuccessTestsCount);
        TextView lblUHID = sheet.findViewById(R.id.lblSuccessUHID);
        MaterialButton btnWhatsApp = sheet.findViewById(R.id.btnSuccessWhatsAppShare);
        MaterialButton btnPrint = sheet.findViewById(R.id.btnSuccessPrintReceipt);
        TextView btnDone = sheet.findViewById(R.id.btnSuccessDone);

        lblName.setText(patientName + " has been successfully registered into the lab worklist.");
        lblAmount.setText(String.format("₹%,.2f", netAmount));
        lblCount.setText(testsCount + " Tests Booked");
        lblUHID.setText(uhid);

        btnWhatsApp.setOnClickListener(v -> {
            try {
                String message = "Hello " + patientName + ",\n\nYour test booking at Patholab Cloud is confirmed.\n" +
                        "• Patient ID: " + uhid + "\n" +
                        "• Invoice No: " + invoiceNo + "\n" +
                        "• Net Total: ₹" + String.format("%.2f", netAmount) + "\n" +
                        "• Tests: " + testsCount + " test(s)\n\n" +
                        "You can track your live report status here:\n" +
                        "https://patholab.cloud/p/reports/" + uhid + "\n\n" +
                        "Thank you for choosing Patholab Cloud!";
                String cleanPhone = phone.replaceAll("[^0-9]", "");
                if (cleanPhone.length() == 10) cleanPhone = "91" + cleanPhone;
                String waUrl = "https://api.whatsapp.com/send?phone=" + cleanPhone + "&text=" + URLEncoder.encode(message, "UTF-8");
                Intent waIntent = new Intent(Intent.ACTION_VIEW, Uri.parse(waUrl));
                startActivity(waIntent);
            } catch (Exception e) {
                Toast.makeText(RegistrationActivity.this, "Could not launch WhatsApp: " + e.getMessage(), Toast.LENGTH_SHORT).show();
            }
        });

        btnPrint.setOnClickListener(v -> {
            dialog.dismiss();
            startActivity(new Intent(RegistrationActivity.this, PatientWorklistActivity.class));
            finish();
        });

        btnDone.setOnClickListener(v -> {
            dialog.dismiss();
            resetForm();
            switchTab(true);
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
        if (inputAbhaNumber != null) inputAbhaNumber.setText("");
        if (inputPassport != null) inputPassport.setText("");
        inputDiscount.setText("");
        if (inputPaidAmount != null) inputPaidAmount.setText("");
        if (layoutWarningDuplicate != null) layoutWarningDuplicate.setVisibility(View.GONE);
        selectedTests.clear();
        for (TestItem t : catalogTests) t.isSelected = false;
        renderSelectedTests();
        calculateBill();
        cardMatchFound.setVisibility(View.GONE);
        cardNoMatch.setVisibility(View.GONE);
        setupDateTimeDefaults();
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Initial Data Load
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

                if (conn.getResponseCode() == 200) {
                    String res = readStream(conn.getInputStream());
                    JSONObject obj = new JSONObject(res);
                    JSONArray arr = obj.optJSONArray("tests");
                    if (arr == null) arr = obj.optJSONArray("data");

                    if (arr != null) {
                        catalogTests.clear();
                        for (int i = 0; i < arr.length(); i++) {
                            JSONObject t = arr.getJSONObject(i);
                            catalogTests.add(new TestItem(
                                    t.optString("id"),
                                    t.optString("name", "Test"),
                                    t.optString("code", "T" + i),
                                    t.optString("type", "SINGLE"),
                                    t.optDouble("price", 0.0)
                            ));
                        }
                    }
                }
            } catch (Exception ignored) {}
        }).start();
    }

    private void fetchDoctorsAndAgencies() {
        new Thread(() -> {
            try {
                String token = AuthManager.getToken(this);
                // Doctors
                URL docUrl = new URL(BASE_URL + "/api/workspace/doctors");
                HttpURLConnection docConn = (HttpURLConnection) docUrl.openConnection();
                if (token != null) {
                    docConn.setRequestProperty("Authorization", "Bearer " + token);
                    docConn.setRequestProperty("Cookie", "token=" + token);
                }
                if (docConn.getResponseCode() == 200) {
                    String res = readStream(docConn.getInputStream());
                    JSONArray arr = new JSONArray(res);
                    registeredDoctors.clear();
                    registeredDoctors.add(new DoctorItem("Self", "Self (No Doctor)", "Direct", "Direct"));
                    for (int i = 0; i < arr.length(); i++) {
                        JSONObject d = arr.getJSONObject(i);
                        registeredDoctors.add(new DoctorItem(
                                d.optString("id"),
                                d.optString("name", "Dr. Partner"),
                                d.optString("specialization", "Physician"),
                                d.optString("hospital", "Medical Clinic")
                        ));
                    }
                }

                // Agencies
                URL agUrl = new URL(BASE_URL + "/api/workspace/agencies");
                HttpURLConnection agConn = (HttpURLConnection) agUrl.openConnection();
                if (token != null) {
                    agConn.setRequestProperty("Authorization", "Bearer " + token);
                    agConn.setRequestProperty("Cookie", "token=" + token);
                }
                if (agConn.getResponseCode() == 200) {
                    String res = readStream(agConn.getInputStream());
                    JSONArray arr = new JSONArray(res);
                    registeredAgencies.clear();
                    registeredAgencies.add(new DoctorItem("Direct", "Direct Walk-in", "Standard", "Standard"));
                    for (int i = 0; i < arr.length(); i++) {
                        JSONObject a = arr.getJSONObject(i);
                        registeredAgencies.add(new DoctorItem(
                                a.optString("id"),
                                a.optString("agencyName", "Collection Center"),
                                "Partner Center",
                                a.optString("code", "AGENCY")
                        ));
                    }
                }
            } catch (Exception ignored) {}
        }).start();
    }

    private String readStream(InputStream is) {
        if (is == null) return "";
        try {
            BufferedReader br = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = br.readLine()) != null) sb.append(line);
            br.close();
            return sb.toString();
        } catch (Exception e) {
            return "";
        }
    }
}
