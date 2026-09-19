package cloud.patholab.app;

import android.animation.ObjectAnimator;
import android.app.DatePickerDialog;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.HapticFeedbackConstants;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.view.inputmethod.InputMethodManager;
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
import android.webkit.CookieManager;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
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
import java.util.Calendar;
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

    private static final String BASE_URL = "https://app.patholab.cloud";
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
    private Spinner spinnerTitle, spinnerGender, spinnerAgeUnit, spinnerPaymentMode;
    private EditText inputPatientName, inputPatientPhone, inputPatientAge, inputPatientEmail, inputPatientAddress;
    private LinearLayout layoutWarningDuplicate;
    private TextView lblWarningDuplicate;
    private View btnPickCollectionDate;
    private TextView inputCollectionDate, inputCollectionTime;

    // ── Visit Routing Views ───────────────────────────────────────────────────
    private View cardSelectDoctor, cardSelectAgency, cardSelectCollector;
    private TextView lblSelectedDoctorName, lblSelectedDoctorSubtitle;
    private TextView lblSelectedAgencyName, lblSelectedAgencySubtitle;
    private TextView lblSelectedCollectorName, lblSelectedCollectorSubtitle;

    private String selectedDoctorId = "Self";
    private String selectedDoctorName = "Self (No Doctor)";
    private String selectedAgencyId = "Direct";
    private String selectedAgencyName = "Direct Walk-in";
    private String selectedCollectorName = "Lab Phlebotomist";

    private Spinner spinnerDoctor, spinnerAgency, spinnerCollector;
    private final List<String> doctorLabels = new ArrayList<>();
    private final List<String> agencyLabels = new ArrayList<>();
    private final List<String> collectorLabels = new ArrayList<>();
    private ArrayAdapter<String> adapterDoctor, adapterAgency, adapterCollector;
    private MaterialButton btnSubmitRegistration;

    // ── Data Models ──────────────────────────────────────────────────────────
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

    private final List<DoctorItem> registeredDoctors = new ArrayList<>();
    private final List<DoctorItem> registeredAgencies = new ArrayList<>();
    private final List<DoctorItem> registeredCollectors = new ArrayList<>();

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
        btnPickCollectionDate = findViewById(R.id.btnPickCollectionDate);
        inputCollectionDate  = findViewById(R.id.inputCollectionDate);
        inputCollectionTime  = findViewById(R.id.inputCollectionTime);

        // Visit Routing
        cardSelectDoctor          = findViewById(R.id.cardSelectDoctor);
        lblSelectedDoctorName     = findViewById(R.id.lblSelectedDoctorName);
        lblSelectedDoctorSubtitle = findViewById(R.id.lblSelectedDoctorSubtitle);

        cardSelectAgency          = findViewById(R.id.cardSelectAgency);
        lblSelectedAgencyName     = findViewById(R.id.lblSelectedAgencyName);
        lblSelectedAgencySubtitle = findViewById(R.id.lblSelectedAgencySubtitle);

        cardSelectCollector          = findViewById(R.id.cardSelectCollector);
        lblSelectedCollectorName     = findViewById(R.id.lblSelectedCollectorName);
        lblSelectedCollectorSubtitle = findViewById(R.id.lblSelectedCollectorSubtitle);

        spinnerDoctor        = findViewById(R.id.spinnerDoctor);
        spinnerAgency        = findViewById(R.id.spinnerAgency);
        spinnerCollector     = findViewById(R.id.spinnerCollector);
        spinnerPaymentMode   = findViewById(R.id.spinnerPaymentMode);
        btnSubmitRegistration = findViewById(R.id.btnSubmitRegistration);
    }

    private final Runnable clockRunnable = new Runnable() {
        @Override
        public void run() {
            SimpleDateFormat tf = new SimpleDateFormat("HH:mm:ss", Locale.getDefault());
            if (inputCollectionTime != null) {
                inputCollectionTime.setText(tf.format(new Date()));
            }
            mainHandler.postDelayed(this, 1000);
        }
    };

    @Override
    protected void onResume() {
        super.onResume();
        mainHandler.post(clockRunnable);
        fetchDoctorsAndAgencies();
    }

    @Override
    protected void onPause() {
        super.onPause();
        mainHandler.removeCallbacks(clockRunnable);
    }

    private void setupDateTimeDefaults() {
        SimpleDateFormat df = new SimpleDateFormat("yyyy-MM-dd", Locale.getDefault());
        SimpleDateFormat tf = new SimpleDateFormat("HH:mm:ss", Locale.getDefault());
        Date now = new Date();
        if (inputCollectionDate != null) inputCollectionDate.setText(df.format(now));
        if (inputCollectionTime != null) inputCollectionTime.setText(tf.format(now));
    }

    private void showDatePickerDialog() {
        Calendar cal = Calendar.getInstance();
        try {
            if (inputCollectionDate != null) {
                String current = inputCollectionDate.getText().toString().trim();
                if (!current.isEmpty()) {
                    SimpleDateFormat df = new SimpleDateFormat("yyyy-MM-dd", Locale.getDefault());
                    Date d = df.parse(current);
                    if (d != null) cal.setTime(d);
                }
            }
        } catch (Exception ignored) {}

        DatePickerDialog dialog = new DatePickerDialog(
                this,
                R.style.DatePickerTheme,
                (view, year, month, dayOfMonth) -> {
                    String selectedDate = String.format(Locale.US, "%04d-%02d-%02d", year, month + 1, dayOfMonth);
                    if (inputCollectionDate != null) {
                        inputCollectionDate.setText(selectedDate);
                    }
                },
                cal.get(Calendar.YEAR),
                cal.get(Calendar.MONTH),
                cal.get(Calendar.DAY_OF_MONTH)
        );
        dialog.show();
    }

    private ArrayAdapter<String> createCleanAdapter(String[] items) {
        return createCleanAdapter(java.util.Arrays.asList(items));
    }

    private ArrayAdapter<String> createCleanAdapter(List<String> items) {
        ArrayAdapter<String> adapter = new ArrayAdapter<String>(this, R.layout.item_spinner_selected, items) {
            @NonNull
            @Override
            public View getDropDownView(int position, @Nullable View convertView, @NonNull ViewGroup parent) {
                View view = super.getDropDownView(position, convertView, parent);
                if (view instanceof TextView) {
                    ((TextView) view).setTextColor(Color.parseColor("#0F172A"));
                    view.setBackgroundColor(Color.WHITE);
                }
                return view;
            }
        };
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

        // Referring Doctor
        registeredDoctors.clear();
        registeredDoctors.add(new DoctorItem("Self", "Self (No Doctor)", "Direct", "Direct"));
        doctorLabels.clear();
        doctorLabels.add("Self (No Doctor)");
        adapterDoctor = createCleanAdapter(doctorLabels);
        spinnerDoctor.setAdapter(adapterDoctor);

        // Referring Agency
        registeredAgencies.clear();
        registeredAgencies.add(new DoctorItem("Direct", "Direct Walk-in", "Standard", "Standard"));
        agencyLabels.clear();
        agencyLabels.add("Direct Walk-in");
        adapterAgency = createCleanAdapter(agencyLabels);
        spinnerAgency.setAdapter(adapterAgency);

        // Collected By
        registeredCollectors.clear();
        registeredCollectors.add(new DoctorItem("Lab Phlebotomist", "Lab Phlebotomist", "", ""));
        registeredCollectors.add(new DoctorItem("Home Collection Agent", "Home Collection Agent", "", ""));
        registeredCollectors.add(new DoctorItem("Self (Patient)", "Self (Patient)", "", ""));
        collectorLabels.clear();
        collectorLabels.add("Lab Phlebotomist");
        collectorLabels.add("Home Collection Agent");
        collectorLabels.add("Self (Patient)");
        adapterCollector = createCleanAdapter(collectorLabels);
        spinnerCollector.setAdapter(adapterCollector);

        // Payment Mode
        spinnerPaymentMode.setAdapter(createCleanAdapter(new String[]{"Cash", "UPI / QR", "Card", "Due / Pay Later"}));
    }

    private void setupTabs() {
        tabModeSearch.setOnClickListener(v -> switchTab(true));
        tabModeNewReg.setOnClickListener(v -> switchTab(false));
    }

    private void switchTab(boolean isSearch) {
        if (isSearch) {
            tabModeSearch.setBackgroundResource(R.drawable.bg_capsule_active_pill);
            tabModeSearch.setTextColor(0xFF0D6EFD);
            tabModeSearch.setElevation(dp(2));
            tabModeNewReg.setBackgroundColor(0);
            tabModeNewReg.setTextColor(0xFFFFFFFF);
            tabModeNewReg.setElevation(0);

            scrollSearchSection.setVisibility(View.VISIBLE);
            scrollNewRegSection.setVisibility(View.GONE);
            stickyBottomBar.setVisibility(View.GONE);
        } else {
            tabModeNewReg.setBackgroundResource(R.drawable.bg_capsule_active_pill);
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

        btnOmnibarSearch.setOnClickListener(v -> {
            v.performHapticFeedback(HapticFeedbackConstants.VIRTUAL_KEY);
            v.animate().scaleX(0.96f).scaleY(0.96f).setDuration(80)
                .withEndAction(() -> v.animate().scaleX(1.0f).scaleY(1.0f).setDuration(100).start())
                .start();
            performOmnibarSearch();
        });
        inputOmnibar.setOnEditorActionListener((v, actionId, event) -> {
            performOmnibarSearch();
            return true;
        });



        if (btnPickCollectionDate != null) {
            btnPickCollectionDate.setOnClickListener(v -> showDatePickerDialog());
        }
        if (inputCollectionDate != null) {
            inputCollectionDate.setOnClickListener(v -> showDatePickerDialog());
        }

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

        if (cardSelectDoctor != null) {
            cardSelectDoctor.setOnClickListener(v -> openDoctorSelectorSheet());
        }
        if (cardSelectAgency != null) {
            cardSelectAgency.setOnClickListener(v -> openAgencySelectorSheet());
        }
        if (cardSelectCollector != null) {
            cardSelectCollector.setOnClickListener(v -> openCollectorSelectorSheet());
        }

        btnSubmitRegistration.setOnClickListener(v -> submitRegistration());
    }

    private void checkDuplicateName(String name) {
        new Thread(() -> {
            try {
                String token = getAuthToken();
                String cookieStr = getAuthCookie();
                URL url = new URL(BASE_URL + "/api/workspace/patients/search?query=" + URLEncoder.encode(name, "UTF-8") + "&type=NAME");
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                if (token != null && !token.isEmpty()) {
                    conn.setRequestProperty("Authorization", "Bearer " + token);
                }
                if (cookieStr != null && !cookieStr.isEmpty()) {
                    conn.setRequestProperty("Cookie", cookieStr);
                } else if (token != null && !token.isEmpty()) {
                    conn.setRequestProperty("Cookie", "token=" + token + "; auth-token=" + token);
                }
                conn.setRequestProperty("Accept", "application/json");
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
        String raw = inputOmnibar.getText().toString().trim();
        if (raw.isEmpty()) {
            Toast.makeText(this, "Please enter mobile number or patient name", Toast.LENGTH_SHORT).show();
            inputOmnibar.requestFocus();
            return;
        }

        String searchType = spinnerSearchType.getSelectedItemPosition() == 0 ? "PHONE" : "NAME";
        String q = raw;
        if (searchType.equals("PHONE")) {
            String cleanPhone = raw.replaceAll("[^0-9]", "");
            if (cleanPhone.length() == 12 && cleanPhone.startsWith("91")) {
                cleanPhone = cleanPhone.substring(2);
            }
            if (cleanPhone.length() < 10) {
                Toast.makeText(this, "Please enter a valid 10-digit mobile number", Toast.LENGTH_SHORT).show();
                inputOmnibar.requestFocus();
                return;
            }
            q = cleanPhone;
        }

        // Dismiss soft keyboard so user sees results clearly
        try {
            InputMethodManager imm = (InputMethodManager) getSystemService(Context.INPUT_METHOD_SERVICE);
            if (imm != null && getCurrentFocus() != null) {
                imm.hideSoftInputFromWindow(getCurrentFocus().getWindowToken(), 0);
            }
        } catch (Exception ignored) {}

        btnOmnibarSearch.setEnabled(false);
        btnOmnibarSearch.setText("Searching Database...");
        progressSearch.setVisibility(View.VISIBLE);
        cardMatchFound.setVisibility(View.GONE);
        cardNoMatch.setVisibility(View.GONE);

        final String finalQ = q;
        new Thread(() -> {
            try {
                String token = getAuthToken();
                String cookieStr = getAuthCookie();
                URL url = new URL(BASE_URL + "/api/workspace/patients/search?query=" + URLEncoder.encode(finalQ, "UTF-8") + "&type=" + searchType);
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                if (token != null && !token.isEmpty()) {
                    conn.setRequestProperty("Authorization", "Bearer " + token);
                }
                if (cookieStr != null && !cookieStr.isEmpty()) {
                    conn.setRequestProperty("Cookie", cookieStr);
                } else if (token != null && !token.isEmpty()) {
                    conn.setRequestProperty("Cookie", "token=" + token + "; auth-token=" + token);
                }
                conn.setRequestProperty("Accept", "application/json");

                int code = conn.getResponseCode();
                if (code == 200) {
                    String res = readStream(conn.getInputStream());
                    JSONArray results = new JSONArray(res);

                    mainHandler.post(() -> {
                        btnOmnibarSearch.setEnabled(true);
                        btnOmnibarSearch.setText("Search Patient Database");
                        progressSearch.setVisibility(View.GONE);
                        if (results.length() > 0) {
                            JSONObject firstMatch = results.optJSONObject(0);
                            showMatchFoundCard(firstMatch);
                        } else {
                            showNoMatchCard(finalQ);
                        }
                    });
                } else {
                    mainHandler.post(() -> {
                        btnOmnibarSearch.setEnabled(true);
                        btnOmnibarSearch.setText("Search Patient Database");
                        progressSearch.setVisibility(View.GONE);
                        showNoMatchCard(finalQ);
                    });
                }
            } catch (Exception e) {
                mainHandler.post(() -> {
                    btnOmnibarSearch.setEnabled(true);
                    btnOmnibarSearch.setText("Search Patient Database");
                    progressSearch.setVisibility(View.GONE);
                    Toast.makeText(RegistrationActivity.this, "Search error: " + e.getMessage(), Toast.LENGTH_SHORT).show();
                });
            }
        }).start();
    }

    private void showMatchFoundCard(JSONObject pat) {
        if (pat == null) return;
        cardMatchFound.setAlpha(0f);
        cardMatchFound.setVisibility(View.VISIBLE);
        cardMatchFound.animate().alpha(1f).setDuration(220).start();
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

        scrollSearchSection.post(() -> scrollSearchSection.smoothScrollTo(0, cardMatchFound.getTop()));

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
        cardNoMatch.setAlpha(0f);
        cardNoMatch.setVisibility(View.VISIBLE);
        cardNoMatch.animate().alpha(1f).setDuration(220).start();
        lblNoMatchDesc.setText("We couldn't find a record matching \"" + query + "\" in the laboratory database.");

        scrollSearchSection.post(() -> scrollSearchSection.smoothScrollTo(0, cardNoMatch.getTop()));

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
    //  Submit Registration (Visit Routing Flow)
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
        btnSubmitRegistration.setText("Checking wallet balance...");

        // ── Upfront wallet balance guard ─────────────────────────────
        new Thread(() -> {
            boolean walletOk = true;
            try {
                String tokenCheck = getAuthToken();
                String cookieStr = getAuthCookie();
                URL walletUrl = new URL(BASE_URL + "/api/workspace/wallet/details");
                HttpURLConnection wc = (HttpURLConnection) walletUrl.openConnection();
                if (tokenCheck != null && !tokenCheck.isEmpty()) {
                    wc.setRequestProperty("Authorization", "Bearer " + tokenCheck);
                }
                if (cookieStr != null && !cookieStr.isEmpty()) {
                    wc.setRequestProperty("Cookie", cookieStr);
                } else if (tokenCheck != null && !tokenCheck.isEmpty()) {
                    wc.setRequestProperty("Cookie", "token=" + tokenCheck + "; auth-token=" + tokenCheck);
                }
                wc.setRequestProperty("Accept", "application/json");
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
                    btnSubmitRegistration.setText("Register Patient");
                    String userScopeId = AuthManager.getUserEmail(RegistrationActivity.this);
                    MobileNotificationHelper.postWalletZeroBalanceNotification(RegistrationActivity.this, userScopeId);

                    new androidx.appcompat.app.AlertDialog.Builder(RegistrationActivity.this)
                            .setTitle("Recharge Your Wallet")
                            .setMessage("Your wallet balance is low or zero. Please recharge your wallet to register new patients.")
                            .setPositiveButton("Recharge Wallet", (d, w) -> {
                                startActivity(new Intent(RegistrationActivity.this, WalletActivity.class));
                            })
                            .setNegativeButton("Cancel", null)
                            .show();
                    return;
                }
                btnSubmitRegistration.setText("Registering Patient...");
                proceedWithRegistration(name, phone, ageStr);
            });
        }).start();
    }

    private void proceedWithRegistration(String name, String phone, String ageStr) {
        new Thread(() -> {
            try {
                String token = getAuthToken();
                String cookieStr = getAuthCookie();
                String title = spinnerTitle.getSelectedItem().toString();
                String gender = spinnerGender.getSelectedItem().toString();
                String ageUnit = spinnerAgeUnit.getSelectedItem().toString();
                String email = inputPatientEmail.getText().toString().trim();
                String address = inputPatientAddress.getText().toString().trim();
                String paymentMode = spinnerPaymentMode.getSelectedItem().toString();
                String cDate = inputCollectionDate != null ? inputCollectionDate.getText().toString().trim() : "";
                String cTime = inputCollectionTime != null ? inputCollectionTime.getText().toString().trim() : "";

                String docId = (selectedDoctorId != null && !selectedDoctorId.equals("Self")) ? selectedDoctorId : null;
                String docName = (selectedDoctorName != null && !selectedDoctorName.trim().isEmpty()) ? selectedDoctorName : "Self (No Doctor)";

                String agId = (selectedAgencyId != null && !selectedAgencyId.equals("Direct")) ? selectedAgencyId : null;
                String agName = (selectedAgencyName != null && !selectedAgencyName.trim().isEmpty()) ? selectedAgencyName : "Direct Walk-in";

                String colValue = (selectedCollectorName != null && !selectedCollectorName.trim().isEmpty()) ? selectedCollectorName : "Lab Phlebotomist";

                JSONObject body = new JSONObject();
                body.put("title", title);
                body.put("name", name);
                body.put("phone", phone);
                body.put("gender", gender);
                body.put("age", Integer.parseInt(ageStr));
                body.put("ageUnit", ageUnit);
                body.put("email", email);
                body.put("address", address);
                body.put("doctorId", docId != null ? docId : JSONObject.NULL);
                body.put("doctorName", docName);
                body.put("agencyId", agId != null ? agId : JSONObject.NULL);
                body.put("agencyName", agName);
                body.put("collectedBy", colValue);
                body.put("paymentMode", paymentMode);
                body.put("collectionDate", cDate);
                body.put("collectionTime", cTime);

                URL regUrl = new URL(BASE_URL + "/api/workspace/patients");
                HttpURLConnection conn = (HttpURLConnection) regUrl.openConnection();
                conn.setRequestMethod("POST");
                conn.setRequestProperty("Content-Type", "application/json");
                if (token != null && !token.isEmpty()) {
                    conn.setRequestProperty("Authorization", "Bearer " + token);
                }
                if (cookieStr != null && !cookieStr.isEmpty()) {
                    conn.setRequestProperty("Cookie", cookieStr);
                } else if (token != null && !token.isEmpty()) {
                    conn.setRequestProperty("Cookie", "token=" + token + "; auth-token=" + token);
                }
                conn.setRequestProperty("Accept", "application/json");
                conn.setDoOutput(true);

                OutputStream os = conn.getOutputStream();
                os.write(body.toString().getBytes(StandardCharsets.UTF_8));
                os.flush();
                os.close();

                int code = conn.getResponseCode();
                String res = readStream(code >= 200 && code < 300 ? conn.getInputStream() : conn.getErrorStream());

                if (code != 200 && code != 201) {
                    String errorMsg = "Registration failed (HTTP " + code + ")";
                    if (res != null && res.trim().startsWith("{")) {
                        try {
                            JSONObject err = new JSONObject(res);
                            errorMsg = err.optString("error", err.optString("message", errorMsg));
                        } catch (Exception ignored) {}
                    }
                    throw new Exception(errorMsg);
                }

                if (res == null || !res.trim().startsWith("{")) {
                    throw new Exception("Unexpected server response format (HTTP " + code + ")");
                }

                JSONObject resObj = new JSONObject(res);
                JSONObject patObj = resObj.optJSONObject("patient");
                String generatedUhid = "P-" + (int)(10000 + Math.random() * 90000);
                if (patObj != null) {
                    generatedUhid = patObj.optString("patientId", generatedUhid);
                } else if (resObj.has("patientId")) {
                    generatedUhid = resObj.optString("patientId", generatedUhid);
                }

                // Register this ID in sync cache to prevent notifying for patients created on this device
                try {
                    String userEmail = AuthManager.getUserEmail(this);
                    if (userEmail == null || userEmail.trim().isEmpty()) userEmail = "default_user";
                    String knownKey = "known_patient_ids_" + userEmail;
                    SharedPreferences notifPrefs = getSharedPreferences("patholab_patient_sync", Context.MODE_PRIVATE);
                    java.util.Set<String> knownIds = new java.util.HashSet<>(notifPrefs.getStringSet(knownKey, new java.util.HashSet<>()));
                    if (patObj != null && patObj.has("id")) knownIds.add(patObj.optString("id"));
                    if (resObj.has("id")) knownIds.add(resObj.optString("id"));
                    knownIds.add(generatedUhid);
                    notifPrefs.edit().putStringSet(knownKey, knownIds).apply();
                } catch (Exception ignored) {}

                final String finalPatName = name;
                final String finalPhone = phone;
                final String finalUhid = generatedUhid;
                final String finalPayMode = paymentMode;

                mainHandler.post(() -> {
                    btnSubmitRegistration.setEnabled(true);
                    btnSubmitRegistration.setText("Register Patient");
                    showSuccessModal(finalPatName, finalPhone, finalUhid, finalPayMode);
                });

            } catch (Exception e) {
                mainHandler.post(() -> {
                    btnSubmitRegistration.setEnabled(true);
                    btnSubmitRegistration.setText("Register Patient");
                    if (e.getMessage() != null && (e.getMessage().toLowerCase().contains("wallet") || e.getMessage().toLowerCase().contains("recharge") || e.getMessage().toLowerCase().contains("balance") || e.getMessage().toLowerCase().contains("insufficient"))) {
                        String userScopeId = AuthManager.getUserEmail(RegistrationActivity.this);
                        MobileNotificationHelper.postWalletZeroBalanceNotification(RegistrationActivity.this, userScopeId);
                        new androidx.appcompat.app.AlertDialog.Builder(RegistrationActivity.this)
                                .setTitle("Recharge Your Wallet")
                                .setMessage("Your wallet balance is low or zero. Please recharge your wallet to register new patients.")
                                .setPositiveButton("Recharge Wallet", (d, w) -> {
                                    startActivity(new Intent(RegistrationActivity.this, WalletActivity.class));
                                })
                                .setNegativeButton("Cancel", null)
                                .show();
                    } else {
                        Toast.makeText(RegistrationActivity.this, "Error: " + e.getMessage(), Toast.LENGTH_LONG).show();
                    }
                });
            }
        }).start();
    }

    private void showSuccessModal(String patientName, String phone, String uhid, String paymentMode) {
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

        lblName.setText(patientName + " has been successfully registered into the lab workspace.");
        lblAmount.setText("Routing: " + paymentMode);
        lblCount.setText("Verified & Synced");
        lblUHID.setText(uhid);

        btnWhatsApp.setOnClickListener(v -> {
            try {
                String message = "Hello " + patientName + ",\n\nYour patient registration at Patholab Cloud is confirmed.\n" +
                        "• Patient ID: " + uhid + "\n" +
                        "• Payment Routing: " + paymentMode + "\n\n" +
                        "You can track your live laboratory reports here:\n" +
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

        btnPrint.setText("View in Patients Worklist");
        btnPrint.setOnClickListener(v -> {
            dialog.dismiss();
            startActivity(new Intent(RegistrationActivity.this, PatientWorklistActivity.class));
            finish();
        });

        btnDone.setText("Register Another Patient");
        btnDone.setOnClickListener(v -> {
            dialog.dismiss();
            resetForm();
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
        if (layoutWarningDuplicate != null) layoutWarningDuplicate.setVisibility(View.GONE);
        cardMatchFound.setVisibility(View.GONE);
        cardNoMatch.setVisibility(View.GONE);

        selectedDoctorId = "Self";
        selectedDoctorName = "Self (No Doctor)";
        updateDoctorCardDisplay();

        selectedAgencyId = "Direct";
        selectedAgencyName = "Direct Walk-in";
        updateAgencyCardDisplay();

        selectedCollectorName = "Lab Phlebotomist";
        updateCollectorCardDisplay();

        if (spinnerDoctor != null && spinnerDoctor.getCount() > 0) spinnerDoctor.setSelection(0);
        if (spinnerAgency != null && spinnerAgency.getCount() > 0) spinnerAgency.setSelection(0);
        if (spinnerCollector != null && spinnerCollector.getCount() > 0) spinnerCollector.setSelection(0);
        if (spinnerPaymentMode != null && spinnerPaymentMode.getCount() > 0) spinnerPaymentMode.setSelection(0);
        setupDateTimeDefaults();
    }

    private void updateDoctorCardDisplay() {
        if (lblSelectedDoctorName == null || lblSelectedDoctorSubtitle == null) return;
        if (selectedDoctorId == null || selectedDoctorId.equals("Self")) {
            lblSelectedDoctorName.setText("Self (No Doctor)");
            lblSelectedDoctorSubtitle.setText("Direct Walk-in / Self");
            return;
        }
        for (DoctorItem d : registeredDoctors) {
            if (selectedDoctorId.equals(d.id)) {
                lblSelectedDoctorName.setText(d.name);
                String sub = (d.spec != null && !d.spec.isEmpty() ? d.spec : "") +
                             (d.hospital != null && !d.hospital.isEmpty() ? (!d.spec.isEmpty() ? " • " : "") + d.hospital : "");
                lblSelectedDoctorSubtitle.setText(sub.isEmpty() ? "Registered Doctor" : sub);
                return;
            }
        }
        lblSelectedDoctorName.setText(selectedDoctorName != null ? selectedDoctorName : "Self (No Doctor)");
        lblSelectedDoctorSubtitle.setText("Registered Doctor");
    }

    private void updateAgencyCardDisplay() {
        if (lblSelectedAgencyName == null || lblSelectedAgencySubtitle == null) return;
        if (selectedAgencyId == null || selectedAgencyId.equals("Direct")) {
            lblSelectedAgencyName.setText("Direct Walk-in");
            lblSelectedAgencySubtitle.setText("Standard Direct Billing");
            return;
        }
        for (DoctorItem a : registeredAgencies) {
            if (selectedAgencyId.equals(a.id)) {
                lblSelectedAgencyName.setText(a.name);
                lblSelectedAgencySubtitle.setText(a.hospital != null && !a.hospital.isEmpty() ? "Tier: " + a.hospital : "Partner Center");
                return;
            }
        }
        lblSelectedAgencyName.setText(selectedAgencyName != null ? selectedAgencyName : "Direct Walk-in");
        lblSelectedAgencySubtitle.setText("Partner Center");
    }

    private void updateCollectorCardDisplay() {
        if (lblSelectedCollectorName == null || lblSelectedCollectorSubtitle == null) return;
        String col = (selectedCollectorName != null && !selectedCollectorName.isEmpty()) ? selectedCollectorName : "Lab Phlebotomist";
        lblSelectedCollectorName.setText(col);
        if (col.equalsIgnoreCase("Lab Phlebotomist")) {
            lblSelectedCollectorSubtitle.setText("In-Lab Sample Collection");
        } else if (col.equalsIgnoreCase("Home Collection Agent")) {
            lblSelectedCollectorSubtitle.setText("At-Home Phlebotomist Visit");
        } else if (col.equalsIgnoreCase("Self (Patient)") || col.equalsIgnoreCase("Self")) {
            lblSelectedCollectorSubtitle.setText("Sample brought by patient");
        } else {
            lblSelectedCollectorSubtitle.setText("Authorized Sample Collector");
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Selector Sheets & Quick Add Dialogs
    // ─────────────────────────────────────────────────────────────────────────

    public static class SelectorOption {
        public String id;
        public String title;
        public String subtitle;
        public int iconRes;
        public boolean isSelected;
        public boolean isAddAction;

        public SelectorOption(String id, String title, String subtitle, int iconRes, boolean isSelected) {
            this(id, title, subtitle, iconRes, isSelected, false);
        }

        public SelectorOption(String id, String title, String subtitle, int iconRes, boolean isSelected, boolean isAddAction) {
            this.id = id;
            this.title = title;
            this.subtitle = subtitle;
            this.iconRes = iconRes;
            this.isSelected = isSelected;
            this.isAddAction = isAddAction;
        }
    }

    public interface OnOptionSelectedListener {
        void onSelected(SelectorOption option);
    }

    public static class SelectorAdapter extends RecyclerView.Adapter<SelectorAdapter.ViewHolder> {
        private final List<SelectorOption> allItems;
        private final List<SelectorOption> filteredItems;
        private final OnOptionSelectedListener listener;

        public SelectorAdapter(List<SelectorOption> items, OnOptionSelectedListener listener) {
            this.allItems = items;
            this.filteredItems = new ArrayList<>(items);
            this.listener = listener;
        }

        public void filter(String query) {
            filteredItems.clear();
            if (query == null || query.trim().isEmpty()) {
                filteredItems.addAll(allItems);
            } else {
                String q = query.trim();
                String qLower = q.toLowerCase();
                boolean exactMatch = false;
                for (SelectorOption item : allItems) {
                    if ((item.title != null && item.title.toLowerCase().contains(qLower)) ||
                        (item.subtitle != null && item.subtitle.toLowerCase().contains(qLower))) {
                        filteredItems.add(item);
                    }
                    if (item.title != null && item.title.equalsIgnoreCase(q)) {
                        exactMatch = true;
                    }
                }
                if (!exactMatch && !q.isEmpty()) {
                    filteredItems.add(new SelectorOption(q, "+ Add \"" + q + "\"", "Select and create entry instantly", R.drawable.ic_plus, false, true));
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
            SelectorOption item = filteredItems.get(position);
            holder.lblDocName.setText(item.title);
            holder.lblDocSubtitle.setText(item.subtitle);
            holder.imgDocIcon.setImageResource(item.iconRes);

            if (item.isAddAction) {
                holder.lblDocName.setTextColor(Color.parseColor("#0D6EFD"));
                holder.rootDoctorItem.setBackgroundColor(Color.parseColor("#EFF6FF"));
                if (holder.imgDocCheck != null) holder.imgDocCheck.setVisibility(View.GONE);
                if (holder.imgDocArrow != null) holder.imgDocArrow.setVisibility(View.VISIBLE);
            } else {
                holder.lblDocName.setTextColor(Color.parseColor("#0F172A"));
                if (item.isSelected) {
                    holder.rootDoctorItem.setBackgroundColor(Color.parseColor("#EFF6FF"));
                    if (holder.imgDocCheck != null) holder.imgDocCheck.setVisibility(View.VISIBLE);
                    if (holder.imgDocArrow != null) holder.imgDocArrow.setVisibility(View.GONE);
                } else {
                    holder.rootDoctorItem.setBackgroundResource(android.R.drawable.list_selector_background);
                    if (holder.imgDocCheck != null) holder.imgDocCheck.setVisibility(View.GONE);
                    if (holder.imgDocArrow != null) holder.imgDocArrow.setVisibility(View.VISIBLE);
                }
            }

            holder.itemView.setOnClickListener(v -> {
                if (listener != null) listener.onSelected(item);
            });
        }

        @Override
        public int getItemCount() {
            return filteredItems.size();
        }

        public static class ViewHolder extends RecyclerView.ViewHolder {
            View rootDoctorItem;
            ImageView imgDocIcon;
            TextView lblDocName, lblDocSubtitle;
            ImageView imgDocCheck, imgDocArrow;

            public ViewHolder(@NonNull View itemView) {
                super(itemView);
                rootDoctorItem = itemView.findViewById(R.id.rootDoctorItem);
                imgDocIcon = itemView.findViewById(R.id.imgDocIcon);
                lblDocName = itemView.findViewById(R.id.lblDocName);
                lblDocSubtitle = itemView.findViewById(R.id.lblDocSubtitle);
                imgDocCheck = itemView.findViewById(R.id.imgDocCheck);
                imgDocArrow = itemView.findViewById(R.id.imgDocArrow);
            }
        }
    }

    private void openDoctorSelectorSheet() {
        BottomSheetDialog dialog = new BottomSheetDialog(this);
        View sheet = getLayoutInflater().inflate(R.layout.layout_doctor_selector_sheet, null);
        dialog.setContentView(sheet);

        TextView lblTitle = sheet.findViewById(R.id.lblDoctorSheetTitle);
        TextView lblSubtitle = sheet.findViewById(R.id.lblDoctorSheetSubtitle);
        MaterialButton btnAdd = sheet.findViewById(R.id.btnAddDocAction);
        FrameLayout btnClose = sheet.findViewById(R.id.btnCloseDocSheet);
        EditText inputSearch = sheet.findViewById(R.id.inputSearchDoctor);
        RecyclerView recycler = sheet.findViewById(R.id.recyclerDoctorsList);

        lblTitle.setText("Select Referring Doctor");
        lblSubtitle.setText("Choose from registered doctors or self");
        btnAdd.setText("+ Add Doctor");
        inputSearch.setHint("Search or type new...");

        List<SelectorOption> options = new ArrayList<>();
        for (DoctorItem d : registeredDoctors) {
            String sub = (d.spec != null && !d.spec.isEmpty() ? d.spec : "") +
                         (d.hospital != null && !d.hospital.isEmpty() ? (!d.spec.isEmpty() ? " • " : "") + d.hospital : "");
            if (sub.isEmpty()) sub = d.id.equals("Self") ? "Direct Walk-in / Self" : "Registered Doctor";
            boolean sel = d.id.equals(selectedDoctorId);
            options.add(new SelectorOption(d.id, d.name, sub, R.drawable.ic_stethoscope, sel));
        }

        SelectorAdapter adapter = new SelectorAdapter(options, opt -> {
            if (opt.isAddAction) {
                String rawName = opt.id.trim();
                String finalName = (rawName.toLowerCase().startsWith("dr.") || rawName.toLowerCase().startsWith("dr ")) ? rawName : "Dr. " + rawName;
                DoctorItem newDoc = new DoctorItem(finalName, finalName, "Custom Referral", "");
                registeredDoctors.add(1, newDoc);
                doctorLabels.add(1, finalName);
                adapterDoctor.notifyDataSetChanged();

                selectedDoctorId = newDoc.id;
                selectedDoctorName = newDoc.name;
                updateDoctorCardDisplay();
                persistNewDoctor(finalName);
            } else {
                selectedDoctorId = opt.id;
                selectedDoctorName = opt.title;
                updateDoctorCardDisplay();

                // Sync hidden spinner
                for (int i = 0; i < registeredDoctors.size(); i++) {
                    if (registeredDoctors.get(i).id.equals(opt.id)) {
                        spinnerDoctor.setSelection(i);
                        break;
                    }
                }
            }
            dialog.dismiss();
        });

        recycler.setLayoutManager(new LinearLayoutManager(this));
        recycler.setAdapter(adapter);

        inputSearch.addTextChangedListener(new TextWatcher() {
            @Override public void beforeTextChanged(CharSequence s, int start, int count, int after) {}
            @Override public void onTextChanged(CharSequence s, int start, int before, int count) {
                adapter.filter(s.toString());
            }
            @Override public void afterTextChanged(Editable s) {}
        });

        btnClose.setOnClickListener(v -> dialog.dismiss());
        btnAdd.setOnClickListener(v -> showAddDoctorBottomSheet(dialog));

        dialog.show();
    }

    private void showAddDoctorBottomSheet(BottomSheetDialog parentSheet) {
        BottomSheetDialog addDialog = new BottomSheetDialog(this);
        View sheet = getLayoutInflater().inflate(R.layout.layout_add_doctor_sheet, null);
        addDialog.setContentView(sheet);

        EditText inputName = sheet.findViewById(R.id.inputDoctorName);
        EditText inputPhone = sheet.findViewById(R.id.inputDoctorPhone);
        EditText inputSpec = sheet.findViewById(R.id.inputDoctorSpecialization);
        EditText inputClinic = sheet.findViewById(R.id.inputDoctorClinic);
        EditText inputQual = sheet.findViewById(R.id.inputDoctorQualification);
        EditText inputEmail = sheet.findViewById(R.id.inputDoctorEmail);
        View btnClose = sheet.findViewById(R.id.btnAddDoctorClose);
        View btnSave = sheet.findViewById(R.id.btnSaveDoctor);
        ProgressBar progressSaving = sheet.findViewById(R.id.progressDoctorSaving);
        TextView lblError = sheet.findViewById(R.id.lblDoctorFormError);

        btnClose.setOnClickListener(v -> addDialog.dismiss());

        btnSave.setOnClickListener(v -> {
            String name = inputName.getText().toString().trim();
            String phone = inputPhone.getText().toString().trim();
            String spec = inputSpec.getText().toString().trim();
            String clinic = inputClinic.getText().toString().trim();
            String qual = inputQual != null ? inputQual.getText().toString().trim() : "";
            String email = inputEmail != null ? inputEmail.getText().toString().trim() : "";

            if (name.isEmpty()) {
                if (lblError != null) {
                    lblError.setText("Doctor name is required.");
                    lblError.setVisibility(View.VISIBLE);
                }
                inputName.requestFocus();
                return;
            }

            if (lblError != null) lblError.setVisibility(View.GONE);
            btnSave.setEnabled(false);
            if (progressSaving != null) progressSaving.setVisibility(View.VISIBLE);

            new Thread(() -> {
                try {
                    String token = getAuthToken();
                    String cookieStr = getAuthCookie();
                    JSONObject postBody = new JSONObject();
                    postBody.put("name", name.startsWith("Dr.") ? name : "Dr. " + name);
                    if (!phone.isEmpty()) postBody.put("phone", phone);
                    if (!spec.isEmpty()) postBody.put("specialization", spec);
                    if (!clinic.isEmpty()) postBody.put("clinic", clinic);
                    if (!qual.isEmpty()) postBody.put("qualification", qual);
                    if (!email.isEmpty()) postBody.put("email", email);

                    URL url = new URL(BASE_URL + "/api/workspace/doctors");
                    HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                    conn.setRequestMethod("POST");
                    conn.setRequestProperty("Content-Type", "application/json");
                    if (token != null && !token.isEmpty()) {
                        conn.setRequestProperty("Authorization", "Bearer " + token);
                    }
                    if (cookieStr != null && !cookieStr.isEmpty()) {
                        conn.setRequestProperty("Cookie", cookieStr);
                    } else if (token != null && !token.isEmpty()) {
                        conn.setRequestProperty("Cookie", "token=" + token + "; auth-token=" + token);
                    }
                    conn.setRequestProperty("Accept", "application/json");
                    conn.setDoOutput(true);

                    OutputStream os = conn.getOutputStream();
                    os.write(postBody.toString().getBytes(StandardCharsets.UTF_8));
                    os.flush();
                    os.close();

                    int code = conn.getResponseCode();
                    String res = readStream(code >= 200 && code < 300 ? conn.getInputStream() : conn.getErrorStream());

                    if (code == 200 || code == 201) {
                        JSONObject resObj = new JSONObject(res);
                        JSONObject docObj = resObj.optJSONObject("doctor");
                        String newId = docObj != null ? docObj.optString("id", java.util.UUID.randomUUID().toString()) : java.util.UUID.randomUUID().toString();
                        String formattedName = docObj != null ? docObj.optString("name", name) : name;
                        String formattedSpec = docObj != null ? docObj.optString("specialization", spec) : spec;
                        String formattedClinic = docObj != null ? docObj.optString("clinic", clinic) : clinic;

                        DoctorItem newDoc = new DoctorItem(newId, formattedName, formattedSpec, formattedClinic);

                        mainHandler.post(() -> {
                            registeredDoctors.add(1, newDoc);
                            doctorLabels.add(1, formattedName + (formattedSpec.isEmpty() ? "" : " (" + formattedSpec + ")"));
                            adapterDoctor.notifyDataSetChanged();

                            selectedDoctorId = newDoc.id;
                            selectedDoctorName = newDoc.name;
                            updateDoctorCardDisplay();

                            Toast.makeText(RegistrationActivity.this, "Doctor " + newDoc.name + " added successfully!", Toast.LENGTH_SHORT).show();
                            addDialog.dismiss();
                            if (parentSheet != null && parentSheet.isShowing()) {
                                parentSheet.dismiss();
                            }
                        });
                    } else {
                        String errMsg = "Failed to add doctor (HTTP " + code + ")";
                        try {
                            JSONObject err = new JSONObject(res);
                            errMsg = err.optString("error", err.optString("message", errMsg));
                        } catch (Exception ignored) {}
                        final String finalMsg = errMsg;
                        mainHandler.post(() -> {
                            btnSave.setEnabled(true);
                            if (progressSaving != null) progressSaving.setVisibility(View.GONE);
                            if (lblError != null) {
                                lblError.setText(finalMsg);
                                lblError.setVisibility(View.VISIBLE);
                            } else {
                                Toast.makeText(RegistrationActivity.this, finalMsg, Toast.LENGTH_LONG).show();
                            }
                        });
                    }
                } catch (Exception e) {
                    mainHandler.post(() -> {
                        btnSave.setEnabled(true);
                        if (progressSaving != null) progressSaving.setVisibility(View.GONE);
                        if (lblError != null) {
                            lblError.setText("Error: " + e.getMessage());
                            lblError.setVisibility(View.VISIBLE);
                        } else {
                            Toast.makeText(RegistrationActivity.this, "Error: " + e.getMessage(), Toast.LENGTH_SHORT).show();
                        }
                    });
                }
            }).start();
        });

        addDialog.show();
    }

    private void openAgencySelectorSheet() {
        BottomSheetDialog dialog = new BottomSheetDialog(this);
        View sheet = getLayoutInflater().inflate(R.layout.layout_doctor_selector_sheet, null);
        dialog.setContentView(sheet);

        TextView lblTitle = sheet.findViewById(R.id.lblDoctorSheetTitle);
        TextView lblSubtitle = sheet.findViewById(R.id.lblDoctorSheetSubtitle);
        MaterialButton btnAdd = sheet.findViewById(R.id.btnAddDocAction);
        FrameLayout btnClose = sheet.findViewById(R.id.btnCloseDocSheet);
        EditText inputSearch = sheet.findViewById(R.id.inputSearchDoctor);
        RecyclerView recycler = sheet.findViewById(R.id.recyclerDoctorsList);

        lblTitle.setText("Select Agency / Client");
        lblSubtitle.setText("Choose B2B partner, clinic, or direct walk-in");
        btnAdd.setText("+ Add Agency");
        inputSearch.setHint("Search or type new...");

        List<SelectorOption> options = new ArrayList<>();
        for (DoctorItem a : registeredAgencies) {
            String sub = (a.hospital != null && !a.hospital.isEmpty()) ? "Tier: " + a.hospital : (a.id.equals("Direct") ? "Standard Direct Billing" : "Partner Center");
            boolean sel = a.id.equals(selectedAgencyId);
            options.add(new SelectorOption(a.id, a.name, sub, R.drawable.ic_briefcase, sel));
        }

        SelectorAdapter adapter = new SelectorAdapter(options, opt -> {
            if (opt.isAddAction) {
                String agName = opt.id.trim();
                DoctorItem newAg = new DoctorItem(agName, agName, "Partner Center", "Standard");
                registeredAgencies.add(1, newAg);
                agencyLabels.add(1, agName + " [Standard]");
                adapterAgency.notifyDataSetChanged();

                selectedAgencyId = newAg.id;
                selectedAgencyName = newAg.name;
                updateAgencyCardDisplay();
                persistNewAgency(agName);
            } else {
                selectedAgencyId = opt.id;
                selectedAgencyName = opt.title;
                updateAgencyCardDisplay();

                // Sync hidden spinner
                for (int i = 0; i < registeredAgencies.size(); i++) {
                    if (registeredAgencies.get(i).id.equals(opt.id)) {
                        spinnerAgency.setSelection(i);
                        break;
                    }
                }
            }
            dialog.dismiss();
        });

        recycler.setLayoutManager(new LinearLayoutManager(this));
        recycler.setAdapter(adapter);

        inputSearch.addTextChangedListener(new TextWatcher() {
            @Override public void beforeTextChanged(CharSequence s, int start, int count, int after) {}
            @Override public void onTextChanged(CharSequence s, int start, int before, int count) {
                adapter.filter(s.toString());
            }
            @Override public void afterTextChanged(Editable s) {}
        });

        btnClose.setOnClickListener(v -> dialog.dismiss());
        btnAdd.setOnClickListener(v -> showAddAgencyBottomSheet(dialog));

        dialog.show();
    }

    private void showAddAgencyBottomSheet(BottomSheetDialog parentSheet) {
        BottomSheetDialog addDialog = new BottomSheetDialog(this);
        View sheet = getLayoutInflater().inflate(R.layout.layout_add_agency_sheet, null);
        addDialog.setContentView(sheet);

        EditText inputName = sheet.findViewById(R.id.inputAgencyName);
        EditText inputContact = sheet.findViewById(R.id.inputAgencyContactPerson);
        EditText inputPhone = sheet.findViewById(R.id.inputAgencyPhone);
        EditText inputEmail = sheet.findViewById(R.id.inputAgencyEmail);
        View btnClose = sheet.findViewById(R.id.btnAddAgencyClose);
        View btnSave = sheet.findViewById(R.id.btnSaveAgency);
        ProgressBar progressSaving = sheet.findViewById(R.id.progressAgencySaving);
        TextView lblError = sheet.findViewById(R.id.lblAgencyFormError);

        btnClose.setOnClickListener(v -> addDialog.dismiss());

        btnSave.setOnClickListener(v -> {
            String name = inputName.getText().toString().trim();
            String contact = inputContact != null ? inputContact.getText().toString().trim() : "";
            String phone = inputPhone != null ? inputPhone.getText().toString().trim() : "";
            String email = inputEmail != null ? inputEmail.getText().toString().trim() : "";

            if (name.isEmpty()) {
                if (lblError != null) {
                    lblError.setText("Agency name is required.");
                    lblError.setVisibility(View.VISIBLE);
                }
                inputName.requestFocus();
                return;
            }

            if (lblError != null) lblError.setVisibility(View.GONE);
            btnSave.setEnabled(false);
            if (progressSaving != null) progressSaving.setVisibility(View.VISIBLE);

            new Thread(() -> {
                try {
                    String token = getAuthToken();
                    String cookieStr = getAuthCookie();
                    JSONObject postBody = new JSONObject();
                    postBody.put("agencyName", name);
                    if (!contact.isEmpty()) postBody.put("contactPerson", contact);
                    if (!phone.isEmpty()) postBody.put("phone", phone);
                    if (!email.isEmpty()) postBody.put("email", email);
                    postBody.put("agencyTier", "Standard");

                    URL url = new URL(BASE_URL + "/api/workspace/b2b/agencies");
                    HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                    conn.setRequestMethod("POST");
                    conn.setRequestProperty("Content-Type", "application/json");
                    if (token != null && !token.isEmpty()) {
                        conn.setRequestProperty("Authorization", "Bearer " + token);
                    }
                    if (cookieStr != null && !cookieStr.isEmpty()) {
                        conn.setRequestProperty("Cookie", cookieStr);
                    } else if (token != null && !token.isEmpty()) {
                        conn.setRequestProperty("Cookie", "token=" + token + "; auth-token=" + token);
                    }
                    conn.setRequestProperty("Accept", "application/json");
                    conn.setDoOutput(true);

                    OutputStream os = conn.getOutputStream();
                    os.write(postBody.toString().getBytes(StandardCharsets.UTF_8));
                    os.flush();
                    os.close();

                    int code = conn.getResponseCode();
                    String res = readStream(code >= 200 && code < 300 ? conn.getInputStream() : conn.getErrorStream());

                    if (code == 200 || code == 201) {
                        JSONObject resObj = new JSONObject(res);
                        JSONObject agObj = resObj.optJSONObject("agency");
                        String newId = agObj != null ? agObj.optString("id", java.util.UUID.randomUUID().toString()) : java.util.UUID.randomUUID().toString();
                        String formattedName = agObj != null ? agObj.optString("agencyName", name) : name;
                        String formattedTier = agObj != null ? agObj.optString("agencyTier", "Standard") : "Standard";

                        DoctorItem newAg = new DoctorItem(newId, formattedName, "Partner Center", formattedTier);

                        mainHandler.post(() -> {
                            registeredAgencies.add(1, newAg);
                            agencyLabels.add(1, formattedName + " [" + formattedTier + "]");
                            adapterAgency.notifyDataSetChanged();

                            selectedAgencyId = newAg.id;
                            selectedAgencyName = newAg.name;
                            updateAgencyCardDisplay();

                            Toast.makeText(RegistrationActivity.this, "Agency " + newAg.name + " added successfully!", Toast.LENGTH_SHORT).show();
                            addDialog.dismiss();
                            if (parentSheet != null && parentSheet.isShowing()) {
                                parentSheet.dismiss();
                            }
                        });
                    } else {
                        String errMsg = "Failed to add agency (HTTP " + code + ")";
                        try {
                            JSONObject err = new JSONObject(res);
                            errMsg = err.optString("error", err.optString("message", errMsg));
                        } catch (Exception ignored) {}
                        final String finalMsg = errMsg;
                        mainHandler.post(() -> {
                            btnSave.setEnabled(true);
                            if (progressSaving != null) progressSaving.setVisibility(View.GONE);
                            if (lblError != null) {
                                lblError.setText(finalMsg);
                                lblError.setVisibility(View.VISIBLE);
                            } else {
                                Toast.makeText(RegistrationActivity.this, finalMsg, Toast.LENGTH_LONG).show();
                            }
                        });
                    }
                } catch (Exception e) {
                    mainHandler.post(() -> {
                        btnSave.setEnabled(true);
                        if (progressSaving != null) progressSaving.setVisibility(View.GONE);
                        if (lblError != null) {
                            lblError.setText("Error: " + e.getMessage());
                            lblError.setVisibility(View.VISIBLE);
                        } else {
                            Toast.makeText(RegistrationActivity.this, "Error: " + e.getMessage(), Toast.LENGTH_SHORT).show();
                        }
                    });
                }
            }).start();
        });

        addDialog.show();
    }

    private void openCollectorSelectorSheet() {
        BottomSheetDialog dialog = new BottomSheetDialog(this);
        View sheet = getLayoutInflater().inflate(R.layout.layout_doctor_selector_sheet, null);
        dialog.setContentView(sheet);

        TextView lblTitle = sheet.findViewById(R.id.lblDoctorSheetTitle);
        TextView lblSubtitle = sheet.findViewById(R.id.lblDoctorSheetSubtitle);
        MaterialButton btnAdd = sheet.findViewById(R.id.btnAddDocAction);
        FrameLayout btnClose = sheet.findViewById(R.id.btnCloseDocSheet);
        EditText inputSearch = sheet.findViewById(R.id.inputSearchDoctor);
        RecyclerView recycler = sheet.findViewById(R.id.recyclerDoctorsList);

        lblTitle.setText("Select Sample Collector");
        lblSubtitle.setText("Choose phlebotomist, home agent, patient or staff");
        btnAdd.setText("+ Custom");
        inputSearch.setHint("Search or type new...");

        List<SelectorOption> options = new ArrayList<>();
        for (DoctorItem c : registeredCollectors) {
            String sub = c.spec != null && !c.spec.isEmpty() ? c.spec : "Sample Collection Agent";
            if (c.name.equalsIgnoreCase("Lab Phlebotomist")) sub = "In-Lab Sample Collection";
            else if (c.name.equalsIgnoreCase("Home Collection Agent")) sub = "At-Home Phlebotomist Visit";
            else if (c.name.equalsIgnoreCase("Self (Patient)")) sub = "Sample brought by patient";

            boolean sel = c.name.equalsIgnoreCase(selectedCollectorName);
            options.add(new SelectorOption(c.name, c.name, sub, R.drawable.ic_user, sel));
        }

        SelectorAdapter adapter = new SelectorAdapter(options, opt -> {
            if (opt.isAddAction) {
                String colName = opt.id.trim();
                DoctorItem newCol = new DoctorItem(colName, colName, "Custom Collector", "");
                registeredCollectors.add(0, newCol);
                collectorLabels.add(0, colName);
                adapterCollector.notifyDataSetChanged();

                selectedCollectorName = colName;
                updateCollectorCardDisplay();
            } else {
                selectedCollectorName = opt.title;
                updateCollectorCardDisplay();

                // Sync hidden spinner
                for (int i = 0; i < registeredCollectors.size(); i++) {
                    if (registeredCollectors.get(i).name.equalsIgnoreCase(opt.title)) {
                        spinnerCollector.setSelection(i);
                        break;
                    }
                }
            }
            dialog.dismiss();
        });

        recycler.setLayoutManager(new LinearLayoutManager(this));
        recycler.setAdapter(adapter);

        inputSearch.addTextChangedListener(new TextWatcher() {
            @Override public void beforeTextChanged(CharSequence s, int start, int count, int after) {}
            @Override public void onTextChanged(CharSequence s, int start, int before, int count) {
                adapter.filter(s.toString());
            }
            @Override public void afterTextChanged(Editable s) {}
        });

        btnClose.setOnClickListener(v -> dialog.dismiss());
        btnAdd.setOnClickListener(v -> showAddCollectorDialog(dialog));

        dialog.show();
    }

    private void showAddCollectorDialog(BottomSheetDialog parentSheet) {
        androidx.appcompat.app.AlertDialog.Builder builder = new androidx.appcompat.app.AlertDialog.Builder(this);
        builder.setTitle("Enter Collector Name");
        final EditText input = new EditText(this);
        input.setHint("e.g., Phlebotomist Name, Nurse or Center");
        input.setSingleLine(true);
        FrameLayout container = new FrameLayout(this);
        int pad = (int) dp(20);
        container.setPadding(pad, (int) dp(10), pad, (int) dp(10));
        container.addView(input);
        builder.setView(container);

        builder.setPositiveButton("Set Collector", (d, which) -> {
            String custom = input.getText().toString().trim();
            if (!custom.isEmpty()) {
                registeredCollectors.add(0, new DoctorItem(custom, custom, "Custom Collector", ""));
                collectorLabels.add(0, custom);
                adapterCollector.notifyDataSetChanged();
                selectedCollectorName = custom;
                updateCollectorCardDisplay();
                if (parentSheet != null && parentSheet.isShowing()) {
                    parentSheet.dismiss();
                }
            }
        });
        builder.setNegativeButton("Cancel", null);
        builder.show();
    }

    private String getAuthCookie() {
        try {
            CookieManager cm = CookieManager.getInstance();
            String c = cm.getCookie(BASE_URL);
            if (c == null || c.trim().isEmpty()) {
                c = cm.getCookie("https://app.patholab.cloud");
            }
            if (c == null || c.trim().isEmpty()) {
                c = cm.getCookie("https://patholab.cloud");
            }
            return c;
        } catch (Exception e) {
            return null;
        }
    }

    private String getAuthToken() {
        String token = AuthManager.getToken(this);
        if (token != null && !token.trim().isEmpty()) return token.trim();

        String cookies = getAuthCookie();
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
        return null;
    }

    private void persistNewDoctor(String doctorName) {
        if (doctorName == null || doctorName.trim().isEmpty()) return;
        new Thread(() -> {
            try {
                String token = getAuthToken();
                String cookieStr = getAuthCookie();
                JSONObject body = new JSONObject();
                body.put("name", doctorName.trim());
                body.put("specialization", "General Practice");

                URL url = new URL(BASE_URL + "/api/workspace/doctors");
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("POST");
                conn.setRequestProperty("Content-Type", "application/json");
                if (token != null && !token.isEmpty()) conn.setRequestProperty("Authorization", "Bearer " + token);
                if (cookieStr != null && !cookieStr.isEmpty()) conn.setRequestProperty("Cookie", cookieStr);
                else if (token != null && !token.isEmpty()) conn.setRequestProperty("Cookie", "token=" + token + "; auth-token=" + token);
                conn.setRequestProperty("Accept", "application/json");
                conn.setDoOutput(true);

                OutputStream os = conn.getOutputStream();
                os.write(body.toString().getBytes(StandardCharsets.UTF_8));
                os.flush();
                os.close();

                conn.getResponseCode();
            } catch (Exception ignored) {}
        }).start();
    }

    private void persistNewAgency(String agencyName) {
        if (agencyName == null || agencyName.trim().isEmpty()) return;
        new Thread(() -> {
            try {
                String token = getAuthToken();
                String cookieStr = getAuthCookie();
                JSONObject body = new JSONObject();
                body.put("agencyName", agencyName.trim());
                body.put("agencyTier", "Standard");

                URL url = new URL(BASE_URL + "/api/workspace/b2b/agencies");
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("POST");
                conn.setRequestProperty("Content-Type", "application/json");
                if (token != null && !token.isEmpty()) conn.setRequestProperty("Authorization", "Bearer " + token);
                if (cookieStr != null && !cookieStr.isEmpty()) conn.setRequestProperty("Cookie", cookieStr);
                else if (token != null && !token.isEmpty()) conn.setRequestProperty("Cookie", "token=" + token + "; auth-token=" + token);
                conn.setRequestProperty("Accept", "application/json");
                conn.setDoOutput(true);

                OutputStream os = conn.getOutputStream();
                os.write(body.toString().getBytes(StandardCharsets.UTF_8));
                os.flush();
                os.close();

                conn.getResponseCode();
            } catch (Exception ignored) {}
        }).start();
    }

    private void fetchDoctorsAndAgencies() {
        new Thread(() -> {
            try {
                String token = getAuthToken();
                String cookieHeader = getAuthCookie();

                // 1. Doctors (Added by this user / lab ID)
                try {
                    URL docUrl = new URL(BASE_URL + "/api/workspace/doctors");
                    HttpURLConnection docConn = (HttpURLConnection) docUrl.openConnection();
                    if (token != null && !token.isEmpty()) {
                        docConn.setRequestProperty("Authorization", "Bearer " + token);
                    }
                    if (cookieHeader != null && !cookieHeader.isEmpty()) {
                        docConn.setRequestProperty("Cookie", cookieHeader);
                    } else if (token != null && !token.isEmpty()) {
                        docConn.setRequestProperty("Cookie", "token=" + token + "; auth-token=" + token);
                    }
                    docConn.setRequestProperty("Accept", "application/json");

                    if (docConn.getResponseCode() == 200) {
                        String res = readStream(docConn.getInputStream());
                        JSONArray arr = null;
                        if (res != null && res.trim().startsWith("[")) {
                            arr = new JSONArray(res);
                        } else if (res != null && res.trim().startsWith("{")) {
                            JSONObject obj = new JSONObject(res);
                            if (obj.has("doctors")) {
                                arr = obj.optJSONArray("doctors");
                            } else if (obj.has("data")) {
                                arr = obj.optJSONArray("data");
                            }
                        }
                        if (arr != null) {
                            List<DoctorItem> newDocs = new ArrayList<>();
                            List<String> newDocLabels = new ArrayList<>();
                            newDocs.add(new DoctorItem("Self", "Self (No Doctor)", "Direct", "Direct"));
                            newDocLabels.add("Self (No Doctor)");
                            for (int i = 0; i < arr.length(); i++) {
                                JSONObject d = arr.getJSONObject(i);
                                String id = d.optString("id");
                                String docName = d.optString("name", "Dr. Partner");
                                String spec = d.optString("specialization", "");
                                String hosp = d.optString("hospital", d.optString("clinic", ""));
                                newDocs.add(new DoctorItem(id, docName, spec, hosp));
                                String label = docName + (spec.isEmpty() ? "" : " (" + spec + ")");
                                newDocLabels.add(label);
                            }
                            mainHandler.post(() -> {
                                int curPos = spinnerDoctor.getSelectedItemPosition();
                                String curId = (curPos >= 0 && curPos < registeredDoctors.size()) ? registeredDoctors.get(curPos).id : null;
                                registeredDoctors.clear();
                                registeredDoctors.addAll(newDocs);
                                doctorLabels.clear();
                                doctorLabels.addAll(newDocLabels);
                                adapterDoctor.notifyDataSetChanged();
                                if (curId != null) {
                                    for (int i = 0; i < registeredDoctors.size(); i++) {
                                        if (curId.equals(registeredDoctors.get(i).id)) {
                                            spinnerDoctor.setSelection(i);
                                            break;
                                        }
                                    }
                                }
                                updateDoctorCardDisplay();
                            });
                        }
                    }
                } catch (Exception ignored) {}

                // 2. Agencies (Added by this user / lab ID)
                try {
                    URL agUrl = new URL(BASE_URL + "/api/workspace/agencies");
                    HttpURLConnection agConn = (HttpURLConnection) agUrl.openConnection();
                    if (token != null && !token.isEmpty()) {
                        agConn.setRequestProperty("Authorization", "Bearer " + token);
                    }
                    if (cookieHeader != null && !cookieHeader.isEmpty()) {
                        agConn.setRequestProperty("Cookie", cookieHeader);
                    } else if (token != null && !token.isEmpty()) {
                        agConn.setRequestProperty("Cookie", "token=" + token + "; auth-token=" + token);
                    }
                    agConn.setRequestProperty("Accept", "application/json");

                    if (agConn.getResponseCode() == 200) {
                        String res = readStream(agConn.getInputStream());
                        JSONArray arr = null;
                        if (res != null && res.trim().startsWith("[")) {
                            arr = new JSONArray(res);
                        } else if (res != null && res.trim().startsWith("{")) {
                            JSONObject obj = new JSONObject(res);
                            if (obj.has("agencies")) {
                                arr = obj.optJSONArray("agencies");
                            } else if (obj.has("data")) {
                                arr = obj.optJSONArray("data");
                            }
                        }
                        if (arr != null) {
                            List<DoctorItem> newAgs = new ArrayList<>();
                            List<String> newAgLabels = new ArrayList<>();
                            newAgs.add(new DoctorItem("Direct", "Direct Walk-in", "Standard", "Standard"));
                            newAgLabels.add("Direct Walk-in");
                            for (int i = 0; i < arr.length(); i++) {
                                JSONObject a = arr.getJSONObject(i);
                                String id = a.optString("id");
                                String agName = a.optString("agencyName", a.optString("name", "Partner Center"));
                                String tier = a.optString("agencyTier", "");
                                newAgs.add(new DoctorItem(id, agName, "Partner Center", tier));
                                String label = agName + (tier.isEmpty() ? "" : " [" + tier + "]");
                                newAgLabels.add(label);
                            }
                            mainHandler.post(() -> {
                                int curPos = spinnerAgency.getSelectedItemPosition();
                                String curId = (curPos >= 0 && curPos < registeredAgencies.size()) ? registeredAgencies.get(curPos).id : null;
                                registeredAgencies.clear();
                                registeredAgencies.addAll(newAgs);
                                agencyLabels.clear();
                                agencyLabels.addAll(newAgLabels);
                                adapterAgency.notifyDataSetChanged();
                                if (curId != null) {
                                    for (int i = 0; i < registeredAgencies.size(); i++) {
                                        if (curId.equals(registeredAgencies.get(i).id)) {
                                            spinnerAgency.setSelection(i);
                                            break;
                                        }
                                    }
                                }
                                updateAgencyCardDisplay();
                            });
                        }
                    }
                } catch (Exception ignored) {}

                // 3. Collectors (From user account & staff)
                try {
                    List<DoctorItem> newCols = new ArrayList<>();
                    List<String> newColLabels = new ArrayList<>();

                    // A. Current Logged-in User
                    String curUser = AuthManager.getUserName(this);
                    if (curUser != null && !curUser.trim().isEmpty()) {
                        newCols.add(new DoctorItem(curUser, curUser, "User", ""));
                        newColLabels.add(curUser + " (Current User)");
                    }

                    // B. Standard collector options matching web
                    newCols.add(new DoctorItem("Lab Phlebotomist", "Lab Phlebotomist", "", ""));
                    newColLabels.add("Lab Phlebotomist");
                    newCols.add(new DoctorItem("Home Collection Agent", "Home Collection Agent", "", ""));
                    newColLabels.add("Home Collection Agent");
                    newCols.add(new DoctorItem("Self (Patient)", "Self (Patient)", "", ""));
                    newColLabels.add("Self (Patient)");

                    // C. Lab staff from /api/workspace/staff
                    try {
                        URL staffUrl = new URL(BASE_URL + "/api/workspace/staff");
                        HttpURLConnection staffConn = (HttpURLConnection) staffUrl.openConnection();
                        if (token != null && !token.isEmpty()) {
                            staffConn.setRequestProperty("Authorization", "Bearer " + token);
                        }
                        if (cookieHeader != null && !cookieHeader.isEmpty()) {
                            staffConn.setRequestProperty("Cookie", cookieHeader);
                        } else if (token != null && !token.isEmpty()) {
                            staffConn.setRequestProperty("Cookie", "token=" + token + "; auth-token=" + token);
                        }
                        staffConn.setRequestProperty("Accept", "application/json");

                        if (staffConn.getResponseCode() == 200) {
                            String res = readStream(staffConn.getInputStream());
                            JSONArray arr = null;
                            if (res != null && res.trim().startsWith("[")) {
                                arr = new JSONArray(res);
                            } else if (res != null && res.trim().startsWith("{")) {
                                JSONObject obj = new JSONObject(res);
                                arr = obj.optJSONArray("staff");
                                if (arr == null) arr = obj.optJSONArray("data");
                            }
                            if (arr != null) {
                                for (int i = 0; i < arr.length(); i++) {
                                    JSONObject s = arr.getJSONObject(i);
                                    String staffName = s.optString("name", "");
                                    String staffRole = s.optString("role", "");
                                    if (s.has("user")) {
                                        JSONObject u = s.optJSONObject("user");
                                        if (u != null) {
                                            if (staffName.isEmpty()) staffName = u.optString("name", "");
                                            if (staffRole.isEmpty()) staffRole = u.optString("role", "");
                                        }
                                    }
                                    if (!staffName.isEmpty()) {
                                        boolean alreadyExists = false;
                                        for (DoctorItem existing : newCols) {
                                            if (existing.name.equalsIgnoreCase(staffName)) {
                                                alreadyExists = true;
                                                break;
                                            }
                                        }
                                        if (!alreadyExists) {
                                            newCols.add(new DoctorItem(staffName, staffName, staffRole, ""));
                                            String label = staffRole.isEmpty() ? staffName : staffName + " (" + staffRole + ")";
                                            newColLabels.add(label);
                                        }
                                    }
                                }
                            }
                        }
                    } catch (Exception ignored) {}

                    mainHandler.post(() -> {
                        int curPos = spinnerCollector.getSelectedItemPosition();
                        String curName = (curPos >= 0 && curPos < registeredCollectors.size()) ? registeredCollectors.get(curPos).name : null;
                        registeredCollectors.clear();
                        registeredCollectors.addAll(newCols);
                        collectorLabels.clear();
                        collectorLabels.addAll(newColLabels);
                        adapterCollector.notifyDataSetChanged();
                        if (curName != null) {
                            for (int i = 0; i < registeredCollectors.size(); i++) {
                                if (curName.equalsIgnoreCase(registeredCollectors.get(i).name)) {
                                    spinnerCollector.setSelection(i);
                                    break;
                                }
                            }
                        }
                        updateCollectorCardDisplay();
                    });
                } catch (Exception ignored) {}

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
