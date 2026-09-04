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
    private Spinner spinnerTitle, spinnerGender, spinnerAgeUnit, spinnerPaymentMode;
    private EditText inputPatientName, inputPatientPhone, inputPatientAge, inputPatientEmail, inputPatientAddress;
    private LinearLayout layoutWarningDuplicate;
    private TextView lblWarningDuplicate;
    private View btnPickCollectionDate;
    private TextView inputCollectionDate, inputCollectionTime;

    // ── Visit Routing Views ───────────────────────────────────────────────────
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
        doctorLabels.clear();
        doctorLabels.add("Self (No Doctor)");
        adapterDoctor = createCleanAdapter(doctorLabels);
        spinnerDoctor.setAdapter(adapterDoctor);

        // Referring Agency
        agencyLabels.clear();
        agencyLabels.add("Direct Walk-in");
        adapterAgency = createCleanAdapter(agencyLabels);
        spinnerAgency.setAdapter(adapterAgency);

        // Collected By
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

        btnSubmitRegistration.setOnClickListener(v -> submitRegistration());
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
                String token = AuthManager.getToken(this);
                String title = spinnerTitle.getSelectedItem().toString();
                String gender = spinnerGender.getSelectedItem().toString();
                String ageUnit = spinnerAgeUnit.getSelectedItem().toString();
                String email = inputPatientEmail.getText().toString().trim();
                String address = inputPatientAddress.getText().toString().trim();
                String paymentMode = spinnerPaymentMode.getSelectedItem().toString();
                String cDate = inputCollectionDate != null ? inputCollectionDate.getText().toString().trim() : "";
                String cTime = inputCollectionTime != null ? inputCollectionTime.getText().toString().trim() : "";

                int docPos = spinnerDoctor.getSelectedItemPosition();
                String docId = null;
                if (docPos > 0 && docPos < registeredDoctors.size()) {
                    docId = registeredDoctors.get(docPos).id;
                }

                int agPos = spinnerAgency.getSelectedItemPosition();
                String agId = null;
                if (agPos > 0 && agPos < registeredAgencies.size()) {
                    agId = registeredAgencies.get(agPos).id;
                }

                String colValue = "Lab Phlebotomist";
                int colPos = spinnerCollector.getSelectedItemPosition();
                if (colPos >= 0 && colPos < registeredCollectors.size()) {
                    colValue = registeredCollectors.get(colPos).id;
                } else if (spinnerCollector.getSelectedItem() != null) {
                    colValue = spinnerCollector.getSelectedItem().toString();
                }

                JSONObject body = new JSONObject();
                body.put("title", title);
                body.put("name", name);
                body.put("phone", phone);
                body.put("gender", gender);
                body.put("age", Integer.parseInt(ageStr));
                body.put("ageUnit", ageUnit);
                body.put("email", email);
                body.put("address", address);
                body.put("doctorId", docId);
                body.put("agencyId", agId);
                body.put("collectedBy", colValue);
                body.put("paymentMode", paymentMode);
                body.put("collectionDate", cDate);
                body.put("collectionTime", cTime);

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
        if (spinnerDoctor != null && spinnerDoctor.getCount() > 0) spinnerDoctor.setSelection(0);
        if (spinnerAgency != null && spinnerAgency.getCount() > 0) spinnerAgency.setSelection(0);
        if (spinnerCollector != null && spinnerCollector.getCount() > 0) spinnerCollector.setSelection(0);
        if (spinnerPaymentMode != null && spinnerPaymentMode.getCount() > 0) spinnerPaymentMode.setSelection(0);
        setupDateTimeDefaults();
    }

    private void fetchDoctorsAndAgencies() {
        new Thread(() -> {
            try {
                String token = AuthManager.getToken(this);

                // 1. Doctors (Added by this user / lab ID)
                try {
                    URL docUrl = new URL(BASE_URL + "/api/workspace/doctors");
                    HttpURLConnection docConn = (HttpURLConnection) docUrl.openConnection();
                    if (token != null) {
                        docConn.setRequestProperty("Authorization", "Bearer " + token);
                        docConn.setRequestProperty("Cookie", "token=" + token);
                    }
                    if (docConn.getResponseCode() == 200) {
                        String res = readStream(docConn.getInputStream());
                        JSONArray arr = new JSONArray(res);
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
                            registeredDoctors.clear();
                            registeredDoctors.addAll(newDocs);
                            doctorLabels.clear();
                            doctorLabels.addAll(newDocLabels);
                            adapterDoctor.notifyDataSetChanged();
                        });
                    }
                } catch (Exception ignored) {}

                // 2. Agencies (Added by this user / lab ID)
                try {
                    URL agUrl = new URL(BASE_URL + "/api/workspace/agencies");
                    HttpURLConnection agConn = (HttpURLConnection) agUrl.openConnection();
                    if (token != null) {
                        agConn.setRequestProperty("Authorization", "Bearer " + token);
                        agConn.setRequestProperty("Cookie", "token=" + token);
                    }
                    if (agConn.getResponseCode() == 200) {
                        String res = readStream(agConn.getInputStream());
                        JSONArray arr = new JSONArray(res);
                        List<DoctorItem> newAgs = new ArrayList<>();
                        List<String> newAgLabels = new ArrayList<>();
                        newAgs.add(new DoctorItem("Direct", "Direct Walk-in", "Standard", "Standard"));
                        newAgLabels.add("Direct Walk-in");
                        for (int i = 0; i < arr.length(); i++) {
                            JSONObject a = arr.getJSONObject(i);
                            String id = a.optString("id");
                            String agName = a.optString("agencyName", "Partner Center");
                            newAgs.add(new DoctorItem(id, agName, "Partner Center", a.optString("code", "AGENCY")));
                            newAgLabels.add(agName);
                        }
                        mainHandler.post(() -> {
                            registeredAgencies.clear();
                            registeredAgencies.addAll(newAgs);
                            agencyLabels.clear();
                            agencyLabels.addAll(newAgLabels);
                            adapterAgency.notifyDataSetChanged();
                        });
                    }
                } catch (Exception ignored) {}

                // 3. Collectors (From user account & staff)
                try {
                    URL colUrl = new URL(BASE_URL + "/api/workspace/collectors");
                    HttpURLConnection colConn = (HttpURLConnection) colUrl.openConnection();
                    if (token != null) {
                        colConn.setRequestProperty("Authorization", "Bearer " + token);
                        colConn.setRequestProperty("Cookie", "token=" + token);
                    }
                    if (colConn.getResponseCode() == 200) {
                        String res = readStream(colConn.getInputStream());
                        JSONArray arr = new JSONArray(res);
                        List<DoctorItem> newCols = new ArrayList<>();
                        List<String> newColLabels = new ArrayList<>();
                        for (int i = 0; i < arr.length(); i++) {
                            JSONObject c = arr.getJSONObject(i);
                            String id = c.optString("id");
                            String colName = c.optString("name", id);
                            newCols.add(new DoctorItem(id, colName, "", ""));
                            newColLabels.add(colName);
                        }
                        if (!newCols.isEmpty()) {
                            mainHandler.post(() -> {
                                registeredCollectors.clear();
                                registeredCollectors.addAll(newCols);
                                collectorLabels.clear();
                                collectorLabels.addAll(newColLabels);
                                adapterCollector.notifyDataSetChanged();
                            });
                        }
                    }
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
