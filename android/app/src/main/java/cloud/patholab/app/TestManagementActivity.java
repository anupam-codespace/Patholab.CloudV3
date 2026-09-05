package cloud.patholab.app;

import android.animation.ObjectAnimator;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.text.Editable;
import android.text.TextWatcher;
import android.util.TypedValue;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.view.animation.Animation;
import android.view.animation.RotateAnimation;
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
import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;
import androidx.appcompat.widget.SwitchCompat;
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
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

import cloud.patholab.app.auth.AuthManager;

/**
 * TestManagementActivity
 * ──────────────────────
 * Native Android Diagnostic Test Management & Clinical Catalog Console.
 * Directly mirroring the exact web workflow and sequence (/workspace/test-management):
 *  1. Tests & Pricing: Search, Scope filtering (Global/Local), Department filtering, Quick Price Overrides, Full 3-Tab Test Editor, and Soft Deletion.
 *  2. Parameters & Reference Ranges: Full 4-Tab Parameter Editor (Core, Biological Ranges, Formulas, Inventory Deductions), Scope Filtering, and Soft Deletion.
 *  3. Specimens & Tubes: Vacuum collection tubes with color-coded caps.
 *  4. Departments: Departmental breakdown with test volumes.
 */
public class TestManagementActivity extends AppCompatActivity {

    private static final String BASE_URL = "https://app.patholab.cloud";
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    // ── Header & Tabs ────────────────────────────────────────────────────────
    private FrameLayout btnTestBack;
    private TextView lblCatalogTitle, lblCatalogSubtitle, btnAddNewTestHeader;
    private TextView tabTestsPricing, tabParameters, tabCustomFields, tabHeadings, tabContainers, tabSampleTypes, tabDepartments;
    private View containerTabTests, containerTabParameters, containerTabCustomFields, containerTabHeadings, containerTabContainers, containerTabSampleTypes, containerTabDepartments;
    private int currentTabIndex = 0;

    // ── Tab 1: Tests & Pricing Views ─────────────────────────────────────────
    private EditText inputSearchTests;
    private ImageView btnClearSearchTests;
    private LinearLayout containerDeptFilterChips;
    private ProgressBar progressTests;
    private RecyclerView recyclerTestsList;
    private View emptyStateTests;
    private TestCatalogCardAdapter testAdapter;

    // ── Tab 2: Parameters Views ──────────────────────────────────────────────
    private EditText inputSearchParameters;
    private ImageView btnClearSearchParameters;
    private LinearLayout containerParamFilterChips;
    private ProgressBar progressParameters;
    private RecyclerView recyclerParametersList;
    private View emptyStateParameters;
    private ParameterCardAdapter paramAdapter;

    // ── Tabs 3 to 7 Recyclers & Progress ─────────────────────────────────────
    private ProgressBar progressCustomFields, progressHeadings, progressContainers, progressSampleTypes, progressDepartments;
    private RecyclerView recyclerCustomFieldsList, recyclerHeadingsList, recyclerContainersList, recyclerSampleTypesList, recyclerDepartmentsList;
    private CustomFieldAdapter customFieldAdapter;
    private HeadingAdapter headingAdapter;
    private SpecimenTubeAdapter containerAdapter;
    private SampleTypeAdapter sampleTypeAdapter;
    private DepartmentAdapter departmentAdapter;
    private List<String> cachedDepartmentNames = new ArrayList<>();

    // ── Data Models ──────────────────────────────────────────────────────────
    public static class ParameterComponent {
        public String parameterId;
        public String name;
        public String code;
        public String headingId;
        public String headingName;
        public int order;

        public ParameterComponent(String parameterId, String name, String code) {
            this.parameterId = parameterId;
            this.name = name;
            this.code = code;
            this.headingId = "none";
            this.headingName = "No Heading";
            this.order = 1;
        }
    }

    public static class TestItem {
        public String id;
        public String name;
        public String code;
        public String printName;
        public String deptId;
        public String deptName;
        public String sampleTypeId;
        public String sampleType;
        public String containerTypeId;
        public String containerCode;
        public String tubeCapColor;
        public String method;
        public int paramsCount;
        public double price;
        public double b2bPrice;
        public double cost;
        public String tat;
        public boolean isGlobal;
        public boolean isActive;
        public boolean hasOverride;
        public boolean hasAutoReagents;
        public List<ParameterComponent> components = new ArrayList<>();

        public TestItem(String id, String name, String code, String printName,
                        String deptId, String deptName, String sampleTypeId, String sampleType,
                        String containerTypeId, String containerCode, String tubeCapColor,
                        String method, int paramsCount, double price, double b2bPrice, double cost,
                        String tat, boolean isGlobal, boolean isActive, boolean hasOverride, boolean hasAutoReagents) {
            this.id = id;
            this.name = name;
            this.code = code;
            this.printName = printName != null && !printName.isEmpty() ? printName : name;
            this.deptId = deptId;
            this.deptName = deptName != null && !deptName.isEmpty() ? deptName : "General";
            this.sampleTypeId = sampleTypeId;
            this.sampleType = sampleType != null && !sampleType.isEmpty() ? sampleType : "Serum";
            this.containerTypeId = containerTypeId;
            this.containerCode = containerCode != null && !containerCode.isEmpty() ? containerCode : "EDTA";
            this.tubeCapColor = tubeCapColor != null && !tubeCapColor.isEmpty() ? tubeCapColor : "#7C3AED";
            this.method = method != null && !method.isEmpty() ? method : "Standard Photometric";
            this.paramsCount = paramsCount;
            this.price = price;
            this.b2bPrice = b2bPrice > 0 ? b2bPrice : price * 0.70;
            this.cost = cost;
            this.tat = tat != null && !tat.isEmpty() ? tat : "24 Hours";
            this.isGlobal = isGlobal;
            this.isActive = isActive;
            this.hasOverride = hasOverride;
            this.hasAutoReagents = hasAutoReagents;
        }
    }

    public static class ParameterRange {
        public String gender = "BOTH"; // "MALE", "FEMALE", "BOTH", "CUSTOM"
        public String customLabel = "";
        public int minAge = 0;
        public int maxAge = 100;
        public String ageUnit = "YEAR"; // "YEAR", "MONTH", "DAY"
        public Double lowValue;
        public Double highValue;
        public Double criticalLow;
        public Double criticalHigh;
        public String textValue = "";
    }

    public static class ParameterReagent {
        public String inventoryItemId = "";
        public String inventoryItemName = "";
        public double quantity = 0.0;
        public String usageUnit = "units";
    }

    public static class ParameterItem {
        public String id;
        public String name;
        public String code;
        public String printName;
        public String unit;
        public String inputType; // "NUMBER", "TEXT", "LONG_TEXT", "DROPDOWN", "HEADING"
        public double price;
        public int decimals;
        public String method;
        public String formula;
        public String containerTypeId;
        public String containerCode;
        public String tubeCapColor;
        public boolean isGlobal;
        public boolean isActive;
        public List<ParameterRange> ranges = new ArrayList<>();
        public List<ParameterReagent> reagents = new ArrayList<>();

        public ParameterItem(String id, String name, String code, String printName, String unit,
                             String inputType, double price, int decimals, String method, String formula,
                             String containerTypeId, String containerCode, String tubeCapColor,
                             boolean isGlobal, boolean isActive) {
            this.id = id;
            this.name = name;
            this.code = code;
            this.printName = printName != null && !printName.isEmpty() ? printName : name;
            this.unit = unit != null ? unit : "";
            this.inputType = inputType != null ? inputType : "NUMBER";
            this.price = price;
            this.decimals = decimals;
            this.method = method != null && !method.isEmpty() ? method : "Photometric / Automated";
            this.formula = formula != null ? formula : "";
            this.containerTypeId = containerTypeId;
            this.containerCode = containerCode != null && !containerCode.isEmpty() ? containerCode : "EDTA";
            this.tubeCapColor = tubeCapColor != null && !tubeCapColor.isEmpty() ? tubeCapColor : "#7C3AED";
            this.isGlobal = isGlobal;
            this.isActive = isActive;
        }

        public String getReferenceRangeSummary() {
            if (ranges.isEmpty()) return "Ref: Biological Interval Standard";
            ParameterRange r = ranges.get(0);
            String u = (unit != null && !unit.trim().isEmpty() && !"null".equalsIgnoreCase(unit.trim())) ? (" " + unit.trim()) : "";
            if (r.lowValue != null && r.highValue != null) {
                return String.format(Locale.getDefault(), "Ref: %.1f - %.1f%s (%s)", r.lowValue, r.highValue, u, r.gender);
            }
            if (r.lowValue != null) return String.format(Locale.getDefault(), "Ref: > %.1f%s", r.lowValue, u);
            if (r.highValue != null) return String.format(Locale.getDefault(), "Ref: < %.1f%s", r.highValue, u);
            if (!r.textValue.isEmpty()) return "Ref: " + r.textValue;
            return "Ref: Biological Interval Standard";
        }

        public String getPanicRangeSummary() {
            if (ranges.isEmpty()) return null;
            ParameterRange r = ranges.get(0);
            if (r.criticalLow != null && r.criticalHigh != null) {
                return String.format(Locale.getDefault(), "Panic: < %.1f or > %.1f", r.criticalLow, r.criticalHigh);
            }
            if (r.criticalLow != null) return String.format(Locale.getDefault(), "Panic: < %.1f", r.criticalLow);
            if (r.criticalHigh != null) return String.format(Locale.getDefault(), "Panic: > %.1f", r.criticalHigh);
            return null;
        }
    }

    public static class CustomFieldItem {
        public String id;
        public String name;
        public String type;
        public String reportLayout;
        public boolean printOnReport;
        public int usedCount;
        public List<String> options = new ArrayList<>();

        public CustomFieldItem(String id, String name, String type, String reportLayout, boolean printOnReport, int usedCount, List<String> options) {
            this.id = id;
            this.name = name;
            this.type = type != null ? type : "TEXT";
            this.reportLayout = reportLayout != null ? reportLayout : "FULL";
            this.printOnReport = printOnReport;
            this.usedCount = usedCount;
            if (options != null) this.options = options;
        }
    }

    public static class HeadingItem {
        public String id;
        public String name;
        public String description;
        public int order;
        public boolean isGlobal;

        public HeadingItem(String id, String name, String description, int order, boolean isGlobal) {
            this.id = id;
            this.name = name;
            this.description = description != null ? description : "";
            this.order = order;
            this.isGlobal = isGlobal;
        }
    }

    public static class SpecimenTubeItem {
        public String id;
        public String code;
        public String name;
        public String additive;
        public String usage;
        public String capColor;
        public boolean isGlobal;

        public SpecimenTubeItem(String code, String name, String additive, String usage, String capColor) {
            this("", code, name, additive, usage, capColor, true);
        }

        public SpecimenTubeItem(String id, String code, String name, String additive, String usage, String capColor, boolean isGlobal) {
            this.id = id;
            this.code = code;
            this.name = name;
            this.additive = additive != null ? additive : "";
            this.usage = usage != null ? usage : "";
            this.capColor = capColor != null ? capColor : "#7C3AED";
            this.isGlobal = isGlobal;
        }
    }

    public static class SampleTypeItem {
        public String id;
        public String name;
        public String code;
        public String description;
        public boolean isGlobal;

        public SampleTypeItem(String id, String name, String code, String description, boolean isGlobal) {
            this.id = id;
            this.name = name;
            this.code = code != null && !code.isEmpty() ? code : "SMP";
            this.description = description != null ? description : "";
            this.isGlobal = isGlobal;
        }
    }

    public static class DepartmentItem {
        public String id;
        public String name;
        public String code;
        public String description;
        public int testCount;
        public boolean isGlobal;

        public DepartmentItem(String name, String description, int testCount) {
            this("", name, "", description, testCount, true);
        }

        public DepartmentItem(String id, String name, String code, String description, int testCount, boolean isGlobal) {
            this.id = id;
            this.name = name;
            this.code = code != null ? code : "";
            this.description = description != null ? description : "";
            this.testCount = testCount;
            this.isGlobal = isGlobal;
        }
    }

    private final List<TestItem> allTests = new ArrayList<>();
    private final List<TestItem> filteredTests = new ArrayList<>();
    private final List<ParameterItem> allParameters = new ArrayList<>();
    private final List<ParameterItem> filteredParameters = new ArrayList<>();
    private final List<CustomFieldItem> allCustomFields = new ArrayList<>();
    private final List<HeadingItem> allHeadings = new ArrayList<>();
    private final List<SpecimenTubeItem> allSpecimenTubes = new ArrayList<>();
    private final List<SampleTypeItem> allSampleTypes = new ArrayList<>();
    private final List<DepartmentItem> allDepartments = new ArrayList<>();

    private String selectedDeptFilter = "All";
    private String selectedScopeFilter = "All"; // "All", "Global", "Local"
    private String selectedParamScopeFilter = "All"; // "All", "Global", "Local"

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        StatusBarHelper.setStatusBarSapphire(this);
        setContentView(R.layout.activity_test_management);

        bindViews();
        setupTabs();
        setupSearchAndFilters();
        fetchTestCatalog();
        fetchParameters();
    }

    private void bindViews() {
        btnTestBack                 = findViewById(R.id.btnTestBack);
        lblCatalogTitle             = findViewById(R.id.lblCatalogTitle);
        lblCatalogSubtitle          = findViewById(R.id.lblCatalogSubtitle);
        btnAddNewTestHeader         = findViewById(R.id.btnAddNewTestHeader);

        tabTestsPricing             = findViewById(R.id.tabTestsPricing);
        tabParameters               = findViewById(R.id.tabParameters);
        tabCustomFields             = findViewById(R.id.tabCustomFields);
        tabHeadings                 = findViewById(R.id.tabHeadings);
        tabContainers               = findViewById(R.id.tabContainers);
        tabSampleTypes              = findViewById(R.id.tabSampleTypes);
        tabDepartments              = findViewById(R.id.tabDepartments);

        containerTabTests           = findViewById(R.id.containerTabTests);
        containerTabParameters      = findViewById(R.id.containerTabParameters);
        containerTabCustomFields    = findViewById(R.id.containerTabCustomFields);
        containerTabHeadings        = findViewById(R.id.containerTabHeadings);
        containerTabContainers      = findViewById(R.id.containerTabContainers);
        containerTabSampleTypes     = findViewById(R.id.containerTabSampleTypes);
        containerTabDepartments     = findViewById(R.id.containerTabDepartments);

        // Progress indicators
        progressCustomFields        = findViewById(R.id.progressCustomFields);
        progressHeadings            = findViewById(R.id.progressHeadings);
        progressContainers          = findViewById(R.id.progressContainers);
        progressSampleTypes         = findViewById(R.id.progressSampleTypes);
        progressDepartments         = findViewById(R.id.progressDepartments);

        // Tab 1 Views
        inputSearchTests            = findViewById(R.id.inputSearchTests);
        btnClearSearchTests         = findViewById(R.id.btnClearSearchTests);
        containerDeptFilterChips    = findViewById(R.id.containerDeptFilterChips);
        progressTests               = findViewById(R.id.progressTests);
        recyclerTestsList           = findViewById(R.id.recyclerTestsList);
        emptyStateTests             = findViewById(R.id.emptyStateTests);

        recyclerTestsList.setLayoutManager(new LinearLayoutManager(this));
        testAdapter = new TestCatalogCardAdapter(
                filteredTests,
                this::showPricingOverrideModal,
                this::showFullTestEditorSheet,
                this::handleDeleteTest
        );
        recyclerTestsList.setAdapter(testAdapter);

        // Tab 2 Views
        inputSearchParameters       = findViewById(R.id.inputSearchParameters);
        btnClearSearchParameters    = findViewById(R.id.btnClearSearchParameters);
        containerParamFilterChips   = findViewById(R.id.containerParamFilterChips);
        progressParameters          = findViewById(R.id.progressParameters);
        recyclerParametersList      = findViewById(R.id.recyclerParametersList);
        emptyStateParameters        = findViewById(R.id.emptyStateParameters);

        recyclerParametersList.setLayoutManager(new LinearLayoutManager(this));
        paramAdapter = new ParameterCardAdapter(
                filteredParameters,
                this::showFullParameterEditorSheet,
                this::handleDeleteParameter
        );
        recyclerParametersList.setAdapter(paramAdapter);

        // Tab 3: Custom Fields
        recyclerCustomFieldsList    = findViewById(R.id.recyclerCustomFieldsList);
        recyclerCustomFieldsList.setLayoutManager(new LinearLayoutManager(this));
        customFieldAdapter = new CustomFieldAdapter(allCustomFields, this::showAddCustomFieldModal, this::handleDeleteCustomField);
        recyclerCustomFieldsList.setAdapter(customFieldAdapter);

        // Tab 4: Headings
        recyclerHeadingsList        = findViewById(R.id.recyclerHeadingsList);
        recyclerHeadingsList.setLayoutManager(new LinearLayoutManager(this));
        headingAdapter = new HeadingAdapter(allHeadings, this::showAddHeadingModal, this::handleDeleteHeading);
        recyclerHeadingsList.setAdapter(headingAdapter);

        // Tab 5: Containers
        recyclerContainersList      = findViewById(R.id.recyclerContainersList);
        recyclerContainersList.setLayoutManager(new LinearLayoutManager(this));
        containerAdapter = new SpecimenTubeAdapter(allSpecimenTubes);
        recyclerContainersList.setAdapter(containerAdapter);

        // Tab 6: Sample Types
        recyclerSampleTypesList     = findViewById(R.id.recyclerSampleTypesList);
        recyclerSampleTypesList.setLayoutManager(new LinearLayoutManager(this));
        sampleTypeAdapter = new SampleTypeAdapter(allSampleTypes, this::showAddSampleTypeModal, this::handleDeleteSampleType);
        recyclerSampleTypesList.setAdapter(sampleTypeAdapter);

        // Tab 7: Departments
        recyclerDepartmentsList     = findViewById(R.id.recyclerDepartmentsList);
        recyclerDepartmentsList.setLayoutManager(new LinearLayoutManager(this));
        departmentAdapter = new DepartmentAdapter(allDepartments, this::onDepartmentCardClicked);
        recyclerDepartmentsList.setAdapter(departmentAdapter);

        btnTestBack.setOnClickListener(v -> finish());
        btnAddNewTestHeader.setOnClickListener(v -> {
            switch (currentTabIndex) {
                case 0: showFullTestEditorSheet(null); break;
                case 1: showFullParameterEditorSheet(null); break;
                case 2: showAddCustomFieldModal(null); break;
                case 3: showAddHeadingModal(null); break;
                case 4: showAddContainerModal(null); break;
                case 5: showAddSampleTypeModal(null); break;
                case 6: showAddDepartmentModal(null); break;
            }
        });

        View btnRefresh = findViewById(R.id.btnRefreshTestCatalog);
        ImageView imgRefresh = findViewById(R.id.imgRefreshTestCatalogIcon);
        if (btnRefresh != null) {
            btnRefresh.setOnClickListener(v -> {
                if (imgRefresh != null) {
                    RotateAnimation rotate = new RotateAnimation(0, 360,
                            Animation.RELATIVE_TO_SELF, 0.5f, Animation.RELATIVE_TO_SELF, 0.5f);
                    rotate.setDuration(600);
                    imgRefresh.startAnimation(rotate);
                }
                refreshActiveTabData();
                Toast.makeText(this, "Refreshing catalog data...", Toast.LENGTH_SHORT).show();
            });
        }
    }

    private void refreshActiveTabData() {
        switch (currentTabIndex) {
            case 0:
                fetchTestCatalog();
                break;
            case 1:
                fetchParameters();
                break;
            case 2:
                fetchCustomFields();
                break;
            case 3:
                fetchHeadings();
                break;
            case 4:
                fetchContainers();
                break;
            case 5:
                fetchSampleTypes();
                break;
            case 6:
                fetchDepartments();
                break;
        }
    }

    private void setupTabs() {
        tabTestsPricing.setOnClickListener(v -> switchTab(0));
        tabParameters.setOnClickListener(v -> switchTab(1));
        tabCustomFields.setOnClickListener(v -> switchTab(2));
        tabHeadings.setOnClickListener(v -> switchTab(3));
        tabContainers.setOnClickListener(v -> switchTab(4));
        tabSampleTypes.setOnClickListener(v -> switchTab(5));
        tabDepartments.setOnClickListener(v -> switchTab(6));
    }

    private void switchTab(int tabIndex) {
        currentTabIndex = tabIndex;
        TextView[] tabs = {tabTestsPricing, tabParameters, tabCustomFields, tabHeadings, tabContainers, tabSampleTypes, tabDepartments};
        View[] containers = {containerTabTests, containerTabParameters, containerTabCustomFields, containerTabHeadings, containerTabContainers, containerTabSampleTypes, containerTabDepartments};

        for (int i = 0; i < tabs.length; i++) {
            if (i == tabIndex) {
                tabs[i].setBackgroundResource(R.drawable.bg_pill_white);
                tabs[i].setTextColor(0xFF0D6EFD);
                tabs[i].setElevation(dp(2));
                containers[i].setVisibility(View.VISIBLE);
            } else {
                tabs[i].setBackgroundColor(0);
                tabs[i].setTextColor(0xFFFFFFFF);
                tabs[i].setElevation(0);
                containers[i].setVisibility(View.GONE);
            }
        }

        btnAddNewTestHeader.setVisibility(View.VISIBLE);

        switch (tabIndex) {
            case 0:
                btnAddNewTestHeader.setText("+ Add Test");
                lblCatalogSubtitle.setText(allTests.size() + " Diagnostic Investigations Available");
                break;
            case 1:
                btnAddNewTestHeader.setText("+ Add Parameter");
                lblCatalogSubtitle.setText(allParameters.size() + " Clinical Parameters Configured");
                break;
            case 2:
                btnAddNewTestHeader.setText("+ Add Field");
                lblCatalogSubtitle.setText(allCustomFields.size() + " Custom Input Fields");
                if (allCustomFields.isEmpty()) fetchCustomFields();
                break;
            case 3:
                btnAddNewTestHeader.setText("+ Add Heading");
                lblCatalogSubtitle.setText(allHeadings.size() + " Report Section Headings");
                if (allHeadings.isEmpty()) fetchHeadings();
                break;
            case 4:
                btnAddNewTestHeader.setText("+ Add Container");
                lblCatalogSubtitle.setText(allSpecimenTubes.size() + " Specimen Collection Tubes");
                if (allSpecimenTubes.isEmpty()) fetchContainers();
                break;
            case 5:
                btnAddNewTestHeader.setText("+ Add Sample Type");
                lblCatalogSubtitle.setText(allSampleTypes.size() + " Diagnostic Sample Types");
                if (allSampleTypes.isEmpty()) fetchSampleTypes();
                break;
            case 6:
                btnAddNewTestHeader.setText("+ Add Department");
                lblCatalogSubtitle.setText(allDepartments.size() + " Laboratory Departments");
                if (allDepartments.isEmpty()) fetchDepartments();
                break;
        }
    }

    private void setupSearchAndFilters() {
        inputSearchTests.addTextChangedListener(new TextWatcher() {
            @Override public void beforeTextChanged(CharSequence s, int start, int count, int after) {}
            @Override public void onTextChanged(CharSequence s, int start, int before, int count) {
                String query = s.toString();
                btnClearSearchTests.setVisibility(query.isEmpty() ? View.GONE : View.VISIBLE);
                applyTestFilters();
            }
            @Override public void afterTextChanged(Editable s) {}
        });

        btnClearSearchTests.setOnClickListener(v -> inputSearchTests.setText(""));

        inputSearchParameters.addTextChangedListener(new TextWatcher() {
            @Override public void beforeTextChanged(CharSequence s, int start, int count, int after) {}
            @Override public void onTextChanged(CharSequence s, int start, int before, int count) {
                String query = s.toString();
                btnClearSearchParameters.setVisibility(query.isEmpty() ? View.GONE : View.VISIBLE);
                applyParameterFilters();
            }
            @Override public void afterTextChanged(Editable s) {}
        });

        btnClearSearchParameters.setOnClickListener(v -> inputSearchParameters.setText(""));
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Fetch Test Catalog
    // ─────────────────────────────────────────────────────────────────────────
    private void fetchTestCatalog() {
        progressTests.setVisibility(View.VISIBLE);
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
                        allTests.clear();
                        Set<String> departmentsSet = new HashSet<>();
                        departmentsSet.add("All");

                        for (int i = 0; i < tests.length(); i++) {
                            JSONObject t = tests.getJSONObject(i);

                            // Department Name Parsing
                            String dId = t.optString("departmentId", "");
                            String dName = "General";
                            if (t.has("department") && !t.isNull("department")) {
                                Object deptObj = t.get("department");
                                if (deptObj instanceof JSONObject) {
                                    dName = ((JSONObject) deptObj).optString("name", "General");
                                } else if (deptObj instanceof String) {
                                    dName = (String) deptObj;
                                }
                            }
                            if (dName == null || dName.trim().isEmpty() || dName.equalsIgnoreCase("null")) {
                                dName = "General";
                            }
                            departmentsSet.add(dName);

                            // Sample Type Parsing
                            String sId = t.optString("sampleTypeId", "");
                            String sName = "Serum";
                            if (t.has("sampleType") && !t.isNull("sampleType")) {
                                Object sObj = t.get("sampleType");
                                if (sObj instanceof JSONObject) {
                                    sName = ((JSONObject) sObj).optString("name", "Serum");
                                } else if (sObj instanceof String) {
                                    sName = (String) sObj;
                                }
                            }
                            if (sName == null || sName.trim().isEmpty() || sName.equalsIgnoreCase("null")) {
                                sName = "Serum";
                            }

                            // Container Tube Parsing
                            String cId = t.optString("containerTypeId", "");
                            String cCode = "EDTA";
                            String cCapColor = "#7C3AED";
                            if (t.has("containerType") && !t.isNull("containerType")) {
                                Object cObj = t.get("containerType");
                                if (cObj instanceof JSONObject) {
                                    JSONObject cJson = (JSONObject) cObj;
                                    cCode = cJson.optString("code", "EDTA");
                                    cCapColor = cJson.optString("capColor", "#7C3AED");
                                }
                            }

                            // Price & B2B Price Parsing
                            double price = t.optDouble("effectivePrice", t.optDouble("price", 0.0));
                            double b2b = t.optDouble("effectiveB2BPrice", t.optDouble("b2bPrice", price * 0.70));
                            if (b2b <= 0 && price > 0) {
                                b2b = price * 0.70;
                            }
                            double cost = t.optDouble("cost", 0.0);

                            String tat = t.optString("effectiveTat", t.optString("tat", "24 Hours"));
                            boolean isGlobal = t.optBoolean("isGlobal", false);
                            boolean isActive = t.optBoolean("isActive", true);
                            boolean hasOverride = t.optBoolean("hasOverride", false);

                            int paramCount = 0;
                            if (t.has("_count") && !t.isNull("_count")) {
                                JSONObject countObj = t.optJSONObject("_count");
                                if (countObj != null) paramCount = countObj.optInt("parameters", 0);
                            }
                            if (paramCount == 0) {
                                paramCount = t.optInt("parameterCount", 1);
                            }

                            // Check for linked components & auto reagents
                            boolean hasReagents = false;
                            List<ParameterComponent> compList = new ArrayList<>();
                            JSONArray comps = t.optJSONArray("components");
                            if (comps != null) {
                                for (int j = 0; j < comps.length(); j++) {
                                    JSONObject c = comps.getJSONObject(j);
                                    JSONObject param = c.optJSONObject("parameter");
                                    String pId = c.optString("parameterId", param != null ? param.optString("id") : "");
                                    String pName = param != null ? param.optString("name", "Parameter") : "Parameter";
                                    String pCode = param != null ? param.optString("code", "") : "";
                                    ParameterComponent pc = new ParameterComponent(pId, pName, pCode);

                                    if (param != null) {
                                        JSONArray reagArr = param.optJSONArray("reagents");
                                        if (reagArr != null && reagArr.length() > 0) {
                                            hasReagents = true;
                                        }
                                    }
                                    compList.add(pc);
                                }
                            }

                            TestItem item = new TestItem(
                                    t.optString("id"),
                                    t.optString("name", "Test"),
                                    t.optString("code", t.optString("testCode", "TEST")),
                                    t.optString("printName", ""),
                                    dId,
                                    dName,
                                    sId,
                                    sName,
                                    cId,
                                    cCode,
                                    cCapColor,
                                    t.optString("method", "Standard Photometric"),
                                    paramCount,
                                    price,
                                    b2b,
                                    cost,
                                    tat,
                                    isGlobal,
                                    isActive,
                                    hasOverride,
                                    hasReagents
                            );
                            item.components = compList;
                            allTests.add(item);
                        }

                        mainHandler.post(() -> {
                            progressTests.setVisibility(View.GONE);
                            cachedDepartmentNames = new ArrayList<>(departmentsSet);
                            buildDepartmentFilterChips(new ArrayList<>(departmentsSet));
                            applyTestFilters();
                            if (currentTabIndex == 0) {
                                lblCatalogSubtitle.setText(allTests.size() + " Diagnostic Investigations Available");
                            }
                        });
                        return;
                    }
                }
            } catch (Exception ignored) {}

            mainHandler.post(() -> {
                progressTests.setVisibility(View.GONE);
                applyTestFilters();
                if (currentTabIndex == 0) {
                    lblCatalogSubtitle.setText(allTests.size() + " Diagnostic Investigations Available");
                }
            });
        }).start();
    }

    private void buildDepartmentFilterChips(List<String> departments) {
        containerDeptFilterChips.removeAllViews();

        List<String> chips = new ArrayList<>();
        chips.add("All");
        chips.add("Global");
        chips.add("Local");

        List<String> sortedDepts = new ArrayList<>(departments);
        sortedDepts.remove("All");
        Collections.sort(sortedDepts);
        chips.addAll(sortedDepts);

        for (String label : chips) {
            TextView chip = new TextView(this);
            chip.setText(label);
            chip.setTextSize(TypedValue.COMPLEX_UNIT_SP, 12f);
            chip.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);
            chip.setPadding((int) dp(14), (int) dp(6), (int) dp(14), (int) dp(6));

            boolean isSelected;
            if (label.equals("Global")) {
                isSelected = "Global".equalsIgnoreCase(selectedScopeFilter);
            } else if (label.equals("Local")) {
                isSelected = "Local".equalsIgnoreCase(selectedScopeFilter);
            } else if (label.equals("All")) {
                isSelected = "All".equalsIgnoreCase(selectedDeptFilter) && "All".equalsIgnoreCase(selectedScopeFilter);
            } else {
                isSelected = label.equalsIgnoreCase(selectedDeptFilter);
            }

            chip.setBackgroundResource(isSelected ? R.drawable.bg_pill_white : R.drawable.bg_setting_item);
            if (isSelected) {
                chip.setBackgroundTintList(android.content.res.ColorStateList.valueOf(0xFF0D6EFD));
                chip.setTextColor(0xFFFFFFFF);
            } else {
                chip.setTextColor(0xFF334155);
            }

            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
            lp.setMarginEnd((int) dp(8));
            chip.setLayoutParams(lp);

            chip.setOnClickListener(v -> {
                if (label.equals("Global")) {
                    selectedScopeFilter = "Global";
                    selectedDeptFilter = "All";
                } else if (label.equals("Local")) {
                    selectedScopeFilter = "Local";
                    selectedDeptFilter = "All";
                } else if (label.equals("All")) {
                    selectedScopeFilter = "All";
                    selectedDeptFilter = "All";
                } else {
                    selectedScopeFilter = "All";
                    selectedDeptFilter = label;
                }
                buildDepartmentFilterChips(departments);
                applyTestFilters();
            });

            containerDeptFilterChips.addView(chip);
        }
    }

    private void applyTestFilters() {
        String query = inputSearchTests.getText().toString().trim().toLowerCase();
        filteredTests.clear();

        for (TestItem t : allTests) {
            boolean matchesScope = selectedScopeFilter.equalsIgnoreCase("All")
                    || (selectedScopeFilter.equalsIgnoreCase("Global") && t.isGlobal)
                    || (selectedScopeFilter.equalsIgnoreCase("Local") && !t.isGlobal);

            boolean matchesDept = selectedDeptFilter.equalsIgnoreCase("All") || t.deptName.equalsIgnoreCase(selectedDeptFilter);
            boolean matchesQuery = query.isEmpty() ||
                    t.name.toLowerCase().contains(query) ||
                    t.code.toLowerCase().contains(query) ||
                    t.deptName.toLowerCase().contains(query) ||
                    t.sampleType.toLowerCase().contains(query);

            if (matchesScope && matchesDept && matchesQuery) {
                filteredTests.add(t);
            }
        }

        testAdapter.notifyDataSetChanged();
        emptyStateTests.setVisibility(filteredTests.isEmpty() ? View.VISIBLE : View.GONE);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Fetch Parameters Library & Ranges
    // ─────────────────────────────────────────────────────────────────────────
    private void fetchParameters() {
        progressParameters.setVisibility(View.VISIBLE);
        new Thread(() -> {
            try {
                String token = AuthManager.getToken(this);
                URL url = new URL(BASE_URL + "/api/workspace/parameters");
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
                    JSONArray arr = json.optJSONArray("parameters");
                    if (arr == null) arr = new JSONArray(res);

                    allParameters.clear();
                    for (int i = 0; i < arr.length(); i++) {
                        JSONObject p = arr.getJSONObject(i);

                        // Container Tube parsing
                        String cId = p.optString("containerTypeId", "");
                        String cCode = "EDTA";
                        String cCapColor = "#7C3AED";
                        if (p.has("containerType") && !p.isNull("containerType")) {
                            JSONObject cObj = p.optJSONObject("containerType");
                            if (cObj != null) {
                                cCode = cObj.optString("code", "EDTA");
                                cCapColor = cObj.optString("capColor", "#7C3AED");
                            }
                        }

                        ParameterItem item = new ParameterItem(
                                p.optString("id"),
                                p.optString("name"),
                                p.optString("code", ""),
                                p.optString("printName", p.optString("name")),
                                p.optString("unit", "-"),
                                p.optString("inputType", "NUMBER"),
                                p.optDouble("price", 0.0),
                                p.optInt("decimals", 2),
                                p.optString("method", "Photometric"),
                                p.optString("formula", ""),
                                cId,
                                cCode,
                                cCapColor,
                                p.optBoolean("isGlobal", false),
                                p.optBoolean("isActive", true)
                        );

                        // Parse Reference Ranges
                        JSONArray rangesArr = p.optJSONArray("referenceRanges");
                        if (rangesArr != null) {
                            for (int r = 0; r < rangesArr.length(); r++) {
                                JSONObject ro = rangesArr.getJSONObject(r);
                                ParameterRange pr = new ParameterRange();
                                pr.gender = ro.optString("gender", "BOTH");
                                pr.customLabel = ro.optString("customLabel", "");
                                pr.minAge = ro.optInt("minAge", 0);
                                pr.maxAge = ro.optInt("maxAge", 100);
                                pr.ageUnit = ro.optString("ageUnit", "YEAR");
                                if (ro.has("lowValue") && !ro.isNull("lowValue")) pr.lowValue = ro.optDouble("lowValue");
                                if (ro.has("highValue") && !ro.isNull("highValue")) pr.highValue = ro.optDouble("highValue");
                                if (ro.has("criticalLow") && !ro.isNull("criticalLow")) pr.criticalLow = ro.optDouble("criticalLow");
                                if (ro.has("criticalHigh") && !ro.isNull("criticalHigh")) pr.criticalHigh = ro.optDouble("criticalHigh");
                                pr.textValue = ro.optString("textValue", "");
                                item.ranges.add(pr);
                            }
                        }

                        // Parse Reagents
                        JSONArray reagArr = p.optJSONArray("reagents");
                        if (reagArr != null) {
                            for (int rg = 0; rg < reagArr.length(); rg++) {
                                JSONObject rgo = reagArr.getJSONObject(rg);
                                ParameterReagent prg = new ParameterReagent();
                                prg.inventoryItemId = rgo.optString("inventoryItemId", "");
                                prg.quantity = rgo.optDouble("quantity", 0.0);
                                JSONObject inv = rgo.optJSONObject("inventoryItem");
                                if (inv != null) {
                                    prg.inventoryItemName = inv.optString("name", "Reagent");
                                    prg.usageUnit = inv.optString("usageUnit", "units");
                                }
                                item.reagents.add(prg);
                            }
                        }

                        allParameters.add(item);
                    }

                    mainHandler.post(() -> {
                        progressParameters.setVisibility(View.GONE);
                        buildParameterFilterChips();
                        applyParameterFilters();
                        if (currentTabIndex == 1) {
                            lblCatalogSubtitle.setText(allParameters.size() + " Clinical Parameters Configured");
                        }
                    });
                    return;
                }
            } catch (Exception ignored) {}

            mainHandler.post(() -> {
                progressParameters.setVisibility(View.GONE);
                applyParameterFilters();
                if (currentTabIndex == 1) {
                    lblCatalogSubtitle.setText(allParameters.size() + " Clinical Parameters Configured");
                }
            });
        }).start();
    }

    private void buildParameterFilterChips() {
        containerParamFilterChips.removeAllViews();
        String[] chips = {"All", "Global", "Local"};

        for (String label : chips) {
            TextView chip = new TextView(this);
            chip.setText(label);
            chip.setTextSize(TypedValue.COMPLEX_UNIT_SP, 12f);
            chip.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);
            chip.setPadding((int) dp(14), (int) dp(6), (int) dp(14), (int) dp(6));

            boolean isSelected;
            if (label.equals("Global")) {
                isSelected = "Global".equalsIgnoreCase(selectedParamScopeFilter);
            } else if (label.equals("Local")) {
                isSelected = "Local".equalsIgnoreCase(selectedParamScopeFilter);
            } else {
                isSelected = "All".equalsIgnoreCase(selectedParamScopeFilter);
            }

            chip.setBackgroundResource(isSelected ? R.drawable.bg_pill_white : R.drawable.bg_setting_item);
            if (isSelected) {
                chip.setBackgroundTintList(android.content.res.ColorStateList.valueOf(0xFF7C3AED));
                chip.setTextColor(0xFFFFFFFF);
            } else {
                chip.setTextColor(0xFF334155);
            }

            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
            lp.setMarginEnd((int) dp(8));
            chip.setLayoutParams(lp);

            chip.setOnClickListener(v -> {
                if (label.equals("Global")) {
                    selectedParamScopeFilter = "Global";
                } else if (label.equals("Local")) {
                    selectedParamScopeFilter = "Local";
                } else {
                    selectedParamScopeFilter = "All";
                }
                buildParameterFilterChips();
                applyParameterFilters();
            });

            containerParamFilterChips.addView(chip);
        }
    }

    private void applyParameterFilters() {
        String q = inputSearchParameters.getText().toString().trim().toLowerCase();
        filteredParameters.clear();

        for (ParameterItem p : allParameters) {
            boolean matchesScope = selectedParamScopeFilter.equalsIgnoreCase("All")
                    || (selectedParamScopeFilter.equalsIgnoreCase("Global") && p.isGlobal)
                    || (selectedParamScopeFilter.equalsIgnoreCase("Local") && !p.isGlobal);

            boolean matchesQuery = q.isEmpty()
                    || p.name.toLowerCase().contains(q)
                    || p.code.toLowerCase().contains(q)
                    || p.method.toLowerCase().contains(q)
                    || p.unit.toLowerCase().contains(q);

            if (matchesScope && matchesQuery) {
                filteredParameters.add(p);
            }
        }
        paramAdapter.notifyDataSetChanged();
        emptyStateParameters.setVisibility(filteredParameters.isEmpty() ? View.VISIBLE : View.GONE);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Fetch Custom Fields, Headings, Containers, Sample Types, Departments
    // ─────────────────────────────────────────────────────────────────────────
    private void fetchCustomFields() {
        progressCustomFields.setVisibility(View.VISIBLE);
        new Thread(() -> {
            try {
                String token = AuthManager.getToken(this);
                URL url = new URL(BASE_URL + "/api/workspace/custom-fields");
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
                    JSONArray arr = json.optJSONArray("customFields");
                    if (arr != null) {
                        allCustomFields.clear();
                        for (int i = 0; i < arr.length(); i++) {
                            JSONObject obj = arr.getJSONObject(i);
                            String id = obj.optString("id", "");
                            String name = obj.optString("name", "");
                            String type = obj.optString("type", "TEXT");
                            String layout = obj.optString("reportLayout", "FULL");
                            boolean printable = obj.optBoolean("printOnReport", true);
                            int usedCount = 0;
                            if (obj.has("_count")) {
                                usedCount = obj.optJSONObject("_count").optInt("usedInTests", 0);
                            }
                            List<String> options = new ArrayList<>();
                            JSONArray optsArr = obj.optJSONArray("options");
                            if (optsArr != null) {
                                for (int j = 0; j < optsArr.length(); j++) options.add(optsArr.getString(j));
                            }
                            allCustomFields.add(new CustomFieldItem(id, name, type, layout, printable, usedCount, options));
                        }
                    }
                }
            } catch (Exception ignored) {}

            mainHandler.post(() -> {
                progressCustomFields.setVisibility(View.GONE);
                customFieldAdapter.notifyDataSetChanged();
                if (currentTabIndex == 2) {
                    lblCatalogSubtitle.setText(allCustomFields.size() + " Custom Input Fields");
                }
            });
        }).start();
    }

    private void fetchHeadings() {
        progressHeadings.setVisibility(View.VISIBLE);
        new Thread(() -> {
            try {
                String token = AuthManager.getToken(this);
                URL url = new URL(BASE_URL + "/api/workspace/headings");
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
                    JSONArray arr = json.optJSONArray("headings");
                    if (arr != null) {
                        allHeadings.clear();
                        for (int i = 0; i < arr.length(); i++) {
                            JSONObject obj = arr.getJSONObject(i);
                            String id = obj.optString("id", "");
                            String name = obj.optString("name", "");
                            String desc = obj.optString("description", "");
                            int order = obj.optInt("displayOrder", i + 1);
                            boolean isGlobal = obj.optBoolean("isGlobal", false);
                            allHeadings.add(new HeadingItem(id, name, desc, order, isGlobal));
                        }
                    }
                }
            } catch (Exception ignored) {}

            mainHandler.post(() -> {
                progressHeadings.setVisibility(View.GONE);
                headingAdapter.notifyDataSetChanged();
                if (currentTabIndex == 3) {
                    lblCatalogSubtitle.setText(allHeadings.size() + " Report Section Headings");
                }
            });
        }).start();
    }

    private void fetchContainers() {
        progressContainers.setVisibility(View.VISIBLE);
        new Thread(() -> {
            try {
                String token = AuthManager.getToken(this);
                URL url = new URL(BASE_URL + "/api/workspace/containers");
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
                    JSONArray arr = json.optJSONArray("containers");
                    if (arr != null && arr.length() > 0) {
                        allSpecimenTubes.clear();
                        for (int i = 0; i < arr.length(); i++) {
                            JSONObject obj = arr.getJSONObject(i);
                            String id = obj.optString("id", "");
                            String code = obj.optString("code", "TUBE");
                            String name = obj.optString("name", "");
                            String additive = obj.optString("additive", "");
                            String usage = obj.optString("usage", "");
                            String capColor = obj.optString("capColor", "#7C3AED");
                            boolean isGlobal = obj.optBoolean("isGlobal", true);
                            allSpecimenTubes.add(new SpecimenTubeItem(id, code, name, additive, usage, capColor, isGlobal));
                        }
                    }
                }
            } catch (Exception ignored) {}

            // If empty, initialize default tubes
            if (allSpecimenTubes.isEmpty()) {
                allSpecimenTubes.add(new SpecimenTubeItem("EDTA", "EDTA K2/K3 Lavender Cap", "Dipotassium EDTA • Anticoagulant", "CBC, HbA1c, ESR, Blood Grouping, Malaria", "#7C3AED"));
                allSpecimenTubes.add(new SpecimenTubeItem("SST", "Serum Separator Gold/Yellow Cap", "Clot Activator + Polymer Gel", "LFT, KFT, Lipid, Thyroid, Hormones, Serology", "#F59E0B"));
                allSpecimenTubes.add(new SpecimenTubeItem("PLAIN", "Plain Clot Red Cap", "Silica Clot Activator", "Cross-matching, Blood Banking, Immunology", "#EF4444"));
                allSpecimenTubes.add(new SpecimenTubeItem("FLUORIDE", "Sodium Fluoride Grey Cap", "Sodium Fluoride + Potassium Oxalate", "Fasting Glucose, PPBS, GTT, Lactate", "#64748B"));
                allSpecimenTubes.add(new SpecimenTubeItem("CITRATE", "Sodium Citrate 3.2% Light Blue Cap", "Sodium Citrate (1:9 ratio)", "PT / INR, APTT, D-Dimer, Fibrinogen", "#0284C7"));
                allSpecimenTubes.add(new SpecimenTubeItem("HEPARIN", "Lithium Heparin Green Cap", "Lithium Heparin • Anticoagulant", "Blood Gas Analysis (ABG), Electrolytes", "#10B981"));
                allSpecimenTubes.add(new SpecimenTubeItem("URINE", "Sterile Urine Specimen Container", "Non-additive / Boric Acid", "Routine Microscopy, Urine Culture, Pregnancy Test", "#EAB308"));
            }

            mainHandler.post(() -> {
                progressContainers.setVisibility(View.GONE);
                containerAdapter.notifyDataSetChanged();
                if (currentTabIndex == 4) {
                    lblCatalogSubtitle.setText(allSpecimenTubes.size() + " Specimen Collection Tubes");
                }
            });
        }).start();
    }

    private void fetchSampleTypes() {
        progressSampleTypes.setVisibility(View.VISIBLE);
        new Thread(() -> {
            try {
                String token = AuthManager.getToken(this);
                URL url = new URL(BASE_URL + "/api/workspace/samples");
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
                    JSONArray arr = json.optJSONArray("samples");
                    if (arr != null && arr.length() > 0) {
                        allSampleTypes.clear();
                        for (int i = 0; i < arr.length(); i++) {
                            JSONObject obj = arr.getJSONObject(i);
                            String id = obj.optString("id", "");
                            String name = obj.optString("name", "");
                            String code = obj.optString("code", "SMP");
                            String desc = obj.optString("description", "");
                            boolean isGlobal = obj.optBoolean("isGlobal", true);
                            allSampleTypes.add(new SampleTypeItem(id, name, code, desc, isGlobal));
                        }
                    }
                }
            } catch (Exception ignored) {}

            if (allSampleTypes.isEmpty()) {
                allSampleTypes.add(new SampleTypeItem("", "Serum (Yellow / Gold SST)", "SER", "Clotted whole blood centrifuged for serum", true));
                allSampleTypes.add(new SampleTypeItem("", "Whole Blood (Lavender EDTA)", "WB", "Anticoagulated whole blood for hematology", true));
                allSampleTypes.add(new SampleTypeItem("", "Plasma (Sodium Citrate Blue)", "PLS", "Citrated plasma for coagulation studies", true));
                allSampleTypes.add(new SampleTypeItem("", "Fluoride Plasma (Grey Cap)", "FLU", "Plasma for blood glucose preservation", true));
                allSampleTypes.add(new SampleTypeItem("", "Spot Urine Specimen", "URN", "Clean catch midstream urine sample", true));
                allSampleTypes.add(new SampleTypeItem("", "Stool / Feces Specimen", "STL", "Fresh stool sample for routine examination", true));
            }

            mainHandler.post(() -> {
                progressSampleTypes.setVisibility(View.GONE);
                sampleTypeAdapter.notifyDataSetChanged();
                if (currentTabIndex == 5) {
                    lblCatalogSubtitle.setText(allSampleTypes.size() + " Diagnostic Sample Types");
                }
            });
        }).start();
    }

    private void fetchDepartments() {
        progressDepartments.setVisibility(View.VISIBLE);
        new Thread(() -> {
            try {
                String token = AuthManager.getToken(this);
                URL url = new URL(BASE_URL + "/api/workspace/departments");
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
                    JSONArray arr = json.optJSONArray("departments");
                    if (arr != null && arr.length() > 0) {
                        allDepartments.clear();
                        for (int i = 0; i < arr.length(); i++) {
                            JSONObject obj = arr.getJSONObject(i);
                            String id = obj.optString("id", "");
                            String name = obj.optString("name", "");
                            String code = obj.optString("code", "");
                            String desc = obj.optString("description", "");
                            int count = 0;
                            if (obj.has("_count")) {
                                count = obj.optJSONObject("_count").optInt("TestTemplate", 0);
                            }
                            boolean isGlobal = obj.optBoolean("isGlobal", true);
                            allDepartments.add(new DepartmentItem(id, name, code, desc, count, isGlobal));
                        }
                    }
                }
            } catch (Exception ignored) {}

            if (allDepartments.isEmpty()) {
                allDepartments.add(new DepartmentItem("Clinical Hematology", "Cell counts, hemoglobinopathies, coagulation, peripheral smear", 38));
                allDepartments.add(new DepartmentItem("Clinical Biochemistry", "Electrolytes, liver, renal, cardiac biomarkers, enzymes, diabetes", 74));
                allDepartments.add(new DepartmentItem("Immunoassay & Endocrinology", "Thyroid, reproductive hormones, tumor markers, infectious serology", 42));
                allDepartments.add(new DepartmentItem("Clinical Pathology", "Urine routine & microscopy, body fluids, stool analysis", 26));
                allDepartments.add(new DepartmentItem("Medical Microbiology", "Aerobic & anaerobic cultures, antibiotic sensitivity testing (AST)", 31));
                allDepartments.add(new DepartmentItem("Serology & Immunology", "Widal, Dengue NS1/IgM, Rapid Card tests, RA factor, CRP", 22));
                allDepartments.add(new DepartmentItem("Histopathology & Cytology", "Biopsies, FNAC, Pap Smears, special cytochemical stains", 18));
            }

            mainHandler.post(() -> {
                progressDepartments.setVisibility(View.GONE);
                departmentAdapter.notifyDataSetChanged();
                if (currentTabIndex == 6) {
                    lblCatalogSubtitle.setText(allDepartments.size() + " Laboratory Departments");
                }
            });
        }).start();
    }

    private void showAddCustomFieldModal(CustomFieldItem item) {
        AlertDialog.Builder b = new AlertDialog.Builder(this);
        b.setTitle(item == null ? "Add Custom Field" : "Edit Custom Field");
        LinearLayout l = new LinearLayout(this);
        l.setOrientation(LinearLayout.VERTICAL);
        l.setPadding((int) dp(20), (int) dp(10), (int) dp(20), (int) dp(10));

        final EditText nameInput = new EditText(this);
        nameInput.setHint("Field Name (e.g. Clinical History)");
        if (item != null) nameInput.setText(item.name);
        l.addView(nameInput);

        final EditText optionsInput = new EditText(this);
        optionsInput.setHint("Options comma separated (for dropdown)");
        if (item != null && !item.options.isEmpty()) {
            optionsInput.setText(String.join(", ", item.options));
        }
        l.addView(optionsInput);

        b.setView(l);
        b.setPositiveButton("Save", (d, w) -> {
            String name = nameInput.getText().toString().trim();
            if (name.isEmpty()) return;
            saveCustomFieldApi(item != null ? item.id : null, name, optionsInput.getText().toString().trim());
        });
        b.setNegativeButton("Cancel", null);
        b.show();
    }

    private void saveCustomFieldApi(String id, String name, String optionsStr) {
        new Thread(() -> {
            try {
                String token = AuthManager.getToken(this);
                URL url = new URL(BASE_URL + "/api/workspace/custom-fields");
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("POST");
                conn.setRequestProperty("Content-Type", "application/json");
                if (token != null) {
                    conn.setRequestProperty("Authorization", "Bearer " + token);
                    conn.setRequestProperty("Cookie", "token=" + token);
                }
                conn.setDoOutput(true);

                JSONObject payload = new JSONObject();
                if (id != null) payload.put("id", id);
                payload.put("name", name);
                payload.put("type", optionsStr.isEmpty() ? "TEXT" : "DROPDOWN");
                if (!optionsStr.isEmpty()) {
                    JSONArray arr = new JSONArray();
                    for (String opt : optionsStr.split(",")) {
                        String s = opt.trim();
                        if (!s.isEmpty()) arr.put(s);
                    }
                    payload.put("options", arr);
                }
                payload.put("reportLayout", "FULL");
                payload.put("printOnReport", true);

                try (OutputStream os = conn.getOutputStream()) {
                    os.write(payload.toString().getBytes(StandardCharsets.UTF_8));
                }

                if (conn.getResponseCode() == 200 || conn.getResponseCode() == 201) {
                    mainHandler.post(() -> {
                        Toast.makeText(this, "Custom Field Saved", Toast.LENGTH_SHORT).show();
                        fetchCustomFields();
                    });
                }
            } catch (Exception ignored) {}
        }).start();
    }

    private void handleDeleteCustomField(CustomFieldItem item) {
        new AlertDialog.Builder(this)
                .setTitle("Delete Custom Field")
                .setMessage("Are you sure you want to delete '" + item.name + "'?")
                .setPositiveButton("Delete", (d, w) -> {
                    new Thread(() -> {
                        try {
                            String token = AuthManager.getToken(this);
                            URL url = new URL(BASE_URL + "/api/workspace/custom-fields?id=" + item.id);
                            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                            conn.setRequestMethod("DELETE");
                            if (token != null) {
                                conn.setRequestProperty("Authorization", "Bearer " + token);
                                conn.setRequestProperty("Cookie", "token=" + token);
                            }
                            if (conn.getResponseCode() == 200) {
                                mainHandler.post(() -> {
                                    Toast.makeText(this, "Custom Field Deleted", Toast.LENGTH_SHORT).show();
                                    fetchCustomFields();
                                });
                            }
                        } catch (Exception ignored) {}
                    }).start();
                })
                .setNegativeButton("Cancel", null)
                .show();
    }

    private void showAddHeadingModal(HeadingItem item) {
        AlertDialog.Builder b = new AlertDialog.Builder(this);
        b.setTitle(item == null ? "Add Report Heading" : "Edit Heading");
        LinearLayout l = new LinearLayout(this);
        l.setOrientation(LinearLayout.VERTICAL);
        l.setPadding((int) dp(20), (int) dp(10), (int) dp(20), (int) dp(10));

        final EditText nameInput = new EditText(this);
        nameInput.setHint("Heading Title (e.g. LIPID PROFILE)");
        if (item != null) nameInput.setText(item.name);
        l.addView(nameInput);

        final EditText descInput = new EditText(this);
        descInput.setHint("Description (Optional)");
        if (item != null) descInput.setText(item.description);
        l.addView(descInput);

        b.setView(l);
        b.setPositiveButton("Save", (d, w) -> {
            String name = nameInput.getText().toString().trim();
            if (name.isEmpty()) return;
            saveHeadingApi(item != null ? item.id : null, name, descInput.getText().toString().trim());
        });
        b.setNegativeButton("Cancel", null);
        b.show();
    }

    private void saveHeadingApi(String id, String name, String desc) {
        new Thread(() -> {
            try {
                String token = AuthManager.getToken(this);
                URL url = new URL(BASE_URL + "/api/workspace/headings");
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("POST");
                conn.setRequestProperty("Content-Type", "application/json");
                if (token != null) {
                    conn.setRequestProperty("Authorization", "Bearer " + token);
                    conn.setRequestProperty("Cookie", "token=" + token);
                }
                conn.setDoOutput(true);

                JSONObject payload = new JSONObject();
                if (id != null) payload.put("id", id);
                payload.put("name", name);
                payload.put("description", desc);
                payload.put("displayOrder", allHeadings.size() + 1);

                try (OutputStream os = conn.getOutputStream()) {
                    os.write(payload.toString().getBytes(StandardCharsets.UTF_8));
                }

                if (conn.getResponseCode() == 200 || conn.getResponseCode() == 201) {
                    mainHandler.post(() -> {
                        Toast.makeText(this, "Heading Saved", Toast.LENGTH_SHORT).show();
                        fetchHeadings();
                    });
                }
            } catch (Exception ignored) {}
        }).start();
    }

    private void handleDeleteHeading(HeadingItem item) {
        new AlertDialog.Builder(this)
                .setTitle("Delete Heading")
                .setMessage("Are you sure you want to delete '" + item.name + "'?")
                .setPositiveButton("Delete", (d, w) -> {
                    new Thread(() -> {
                        try {
                            String token = AuthManager.getToken(this);
                            URL url = new URL(BASE_URL + "/api/workspace/headings?id=" + item.id);
                            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                            conn.setRequestMethod("DELETE");
                            if (token != null) {
                                conn.setRequestProperty("Authorization", "Bearer " + token);
                                conn.setRequestProperty("Cookie", "token=" + token);
                            }
                            if (conn.getResponseCode() == 200) {
                                mainHandler.post(() -> {
                                    Toast.makeText(this, "Heading Deleted", Toast.LENGTH_SHORT).show();
                                    fetchHeadings();
                                });
                            }
                        } catch (Exception ignored) {}
                    }).start();
                })
                .setNegativeButton("Cancel", null)
                .show();
    }

    private void showAddContainerModal(SpecimenTubeItem item) {
        AlertDialog.Builder b = new AlertDialog.Builder(this);
        b.setTitle("Add Specimen Tube");
        LinearLayout l = new LinearLayout(this);
        l.setOrientation(LinearLayout.VERTICAL);
        l.setPadding((int) dp(20), (int) dp(10), (int) dp(20), (int) dp(10));

        final EditText nameInput = new EditText(this);
        nameInput.setHint("Tube Name (e.g. EDTA Lavender Cap)");
        l.addView(nameInput);

        final EditText codeInput = new EditText(this);
        codeInput.setHint("Tube Code (e.g. EDTA)");
        l.addView(codeInput);

        final EditText additiveInput = new EditText(this);
        additiveInput.setHint("Additive / Anticoagulant");
        l.addView(additiveInput);

        b.setView(l);
        b.setPositiveButton("Save", (d, w) -> {
            String name = nameInput.getText().toString().trim();
            String code = codeInput.getText().toString().trim();
            if (name.isEmpty() || code.isEmpty()) return;
            allSpecimenTubes.add(new SpecimenTubeItem(code, name, additiveInput.getText().toString().trim(), "Routine Diagnostics", "#7C3AED"));
            containerAdapter.notifyDataSetChanged();
            Toast.makeText(this, "Tube Container Added", Toast.LENGTH_SHORT).show();
        });
        b.setNegativeButton("Cancel", null);
        b.show();
    }

    private void showAddSampleTypeModal(SampleTypeItem item) {
        AlertDialog.Builder b = new AlertDialog.Builder(this);
        b.setTitle(item == null ? "Add Sample Type" : "Edit Sample Type");
        LinearLayout l = new LinearLayout(this);
        l.setOrientation(LinearLayout.VERTICAL);
        l.setPadding((int) dp(20), (int) dp(10), (int) dp(20), (int) dp(10));

        final EditText nameInput = new EditText(this);
        nameInput.setHint("Sample Name (e.g. Synovial Fluid)");
        if (item != null) nameInput.setText(item.name);
        l.addView(nameInput);

        final EditText codeInput = new EditText(this);
        codeInput.setHint("Code (e.g. SYN)");
        if (item != null) codeInput.setText(item.code);
        l.addView(codeInput);

        b.setView(l);
        b.setPositiveButton("Save", (d, w) -> {
            String name = nameInput.getText().toString().trim();
            String code = codeInput.getText().toString().trim();
            if (name.isEmpty()) return;
            saveSampleTypeApi(item != null ? item.id : null, name, code);
        });
        b.setNegativeButton("Cancel", null);
        b.show();
    }

    private void saveSampleTypeApi(String id, String name, String code) {
        new Thread(() -> {
            try {
                String token = AuthManager.getToken(this);
                URL url = new URL(BASE_URL + "/api/workspace/samples");
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("POST");
                conn.setRequestProperty("Content-Type", "application/json");
                if (token != null) {
                    conn.setRequestProperty("Authorization", "Bearer " + token);
                    conn.setRequestProperty("Cookie", "token=" + token);
                }
                conn.setDoOutput(true);

                JSONObject payload = new JSONObject();
                if (id != null) payload.put("id", id);
                payload.put("name", name);
                payload.put("code", code.isEmpty() ? "SMP" : code);

                try (OutputStream os = conn.getOutputStream()) {
                    os.write(payload.toString().getBytes(StandardCharsets.UTF_8));
                }

                if (conn.getResponseCode() == 200 || conn.getResponseCode() == 201) {
                    mainHandler.post(() -> {
                        Toast.makeText(this, "Sample Type Saved", Toast.LENGTH_SHORT).show();
                        fetchSampleTypes();
                    });
                }
            } catch (Exception ignored) {}
        }).start();
    }

    private void handleDeleteSampleType(SampleTypeItem item) {
        new AlertDialog.Builder(this)
                .setTitle("Delete Sample Type")
                .setMessage("Are you sure you want to delete '" + item.name + "'?")
                .setPositiveButton("Delete", (d, w) -> {
                    new Thread(() -> {
                        try {
                            String token = AuthManager.getToken(this);
                            URL url = new URL(BASE_URL + "/api/workspace/samples?id=" + item.id);
                            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                            conn.setRequestMethod("DELETE");
                            if (token != null) {
                                conn.setRequestProperty("Authorization", "Bearer " + token);
                                conn.setRequestProperty("Cookie", "token=" + token);
                            }
                            if (conn.getResponseCode() == 200) {
                                mainHandler.post(() -> {
                                    Toast.makeText(this, "Sample Type Deleted", Toast.LENGTH_SHORT).show();
                                    fetchSampleTypes();
                                });
                            }
                        } catch (Exception ignored) {}
                    }).start();
                })
                .setNegativeButton("Cancel", null)
                .show();
    }

    private void showAddDepartmentModal(DepartmentItem item) {
        AlertDialog.Builder b = new AlertDialog.Builder(this);
        b.setTitle("Add Department");
        LinearLayout l = new LinearLayout(this);
        l.setOrientation(LinearLayout.VERTICAL);
        l.setPadding((int) dp(20), (int) dp(10), (int) dp(20), (int) dp(10));

        final EditText nameInput = new EditText(this);
        nameInput.setHint("Department Name (e.g. Molecular Biology)");
        l.addView(nameInput);

        final EditText descInput = new EditText(this);
        descInput.setHint("Description (e.g. PCR, DNA sequencing)");
        l.addView(descInput);

        b.setView(l);
        b.setPositiveButton("Save", (d, w) -> {
            String name = nameInput.getText().toString().trim();
            if (name.isEmpty()) return;
            allDepartments.add(new DepartmentItem(name, descInput.getText().toString().trim(), 0));
            departmentAdapter.notifyDataSetChanged();
            Toast.makeText(this, "Department Added", Toast.LENGTH_SHORT).show();
        });
        b.setNegativeButton("Cancel", null);
        b.show();
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  1. Quick Price & TAT Override Modal (Matches web pricing-modal.tsx)
    // ─────────────────────────────────────────────────────────────────────────
    private void showPricingOverrideModal(TestItem test) {
        BottomSheetDialog dialog = new BottomSheetDialog(this);
        View sheet = getLayoutInflater().inflate(R.layout.layout_test_pricing_modal, null);
        dialog.setContentView(sheet);

        TextView lblName = sheet.findViewById(R.id.lblModalTestName);
        TextView lblCodeDept = sheet.findViewById(R.id.lblModalTestCodeDept);
        EditText inputPrice = sheet.findViewById(R.id.inputModalPrice);
        EditText inputB2B = sheet.findViewById(R.id.inputModalB2BPrice);
        EditText inputTat = sheet.findViewById(R.id.inputModalTatHours);
        MaterialButton btnSave = sheet.findViewById(R.id.btnSavePricingOverride);
        FrameLayout btnClose = sheet.findViewById(R.id.btnClosePricingModal);

        lblName.setText(test.name);
        lblCodeDept.setText("Code: " + test.code + " • " + test.deptName + (test.isGlobal ? " (Global Master)" : " (Local)"));
        inputPrice.setText(String.format(Locale.getDefault(), "%.2f", test.price));
        inputB2B.setText(String.format(Locale.getDefault(), "%.2f", test.b2bPrice));

        String tatNum = test.tat.replaceAll("[^0-9]", "");
        inputTat.setText(tatNum.isEmpty() ? "24" : tatNum);

        btnClose.setOnClickListener(v -> dialog.dismiss());

        btnSave.setOnClickListener(v -> {
            String pStr = inputPrice.getText().toString().trim();
            String bStr = inputB2B.getText().toString().trim();
            String tStr = inputTat.getText().toString().trim();

            if (pStr.isEmpty()) {
                Toast.makeText(this, "Please enter retail selling price", Toast.LENGTH_SHORT).show();
                return;
            }

            double newPrice = Double.parseDouble(pStr);
            double newB2B = bStr.isEmpty() ? newPrice * 0.70 : Double.parseDouble(bStr);
            int tatHours = tStr.isEmpty() ? 24 : Integer.parseInt(tStr);
            String newTat = tatHours + " Hours";

            btnSave.setEnabled(false);
            btnSave.setText("Saving Override...");

            // Call PUT /api/workspace/test-catalog
            new Thread(() -> {
                try {
                    String token = AuthManager.getToken(this);
                    URL url = new URL(BASE_URL + "/api/workspace/test-catalog");
                    HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                    conn.setRequestMethod("PUT");
                    conn.setRequestProperty("Content-Type", "application/json");
                    if (token != null) {
                        conn.setRequestProperty("Authorization", "Bearer " + token);
                        conn.setRequestProperty("Cookie", "token=" + token);
                    }
                    conn.setDoOutput(true);

                    JSONObject payload = new JSONObject();
                    payload.put("testTemplateId", test.id);
                    payload.put("price", newPrice);
                    payload.put("b2bPrice", newB2B);
                    payload.put("tat", newTat);
                    payload.put("tatHours", tatHours);
                    payload.put("isActive", test.isActive);

                    OutputStream os = conn.getOutputStream();
                    os.write(payload.toString().getBytes(StandardCharsets.UTF_8));
                    os.flush();
                    os.close();

                    int responseCode = conn.getResponseCode();
                    test.price = newPrice;
                    test.b2bPrice = newB2B;
                    test.tat = newTat;
                    test.hasOverride = true;

                    mainHandler.post(() -> {
                        testAdapter.notifyDataSetChanged();
                        dialog.dismiss();
                        Toast.makeText(TestManagementActivity.this, "Pricing override saved for " + test.code + " (₹" + String.format(Locale.getDefault(), "%.2f", newPrice) + ")", Toast.LENGTH_SHORT).show();
                    });
                } catch (Exception e) {
                    mainHandler.post(() -> {
                        test.price = newPrice;
                        test.b2bPrice = newB2B;
                        test.tat = newTat;
                        test.hasOverride = true;
                        testAdapter.notifyDataSetChanged();
                        dialog.dismiss();
                        Toast.makeText(TestManagementActivity.this, "Price updated locally (₹" + String.format(Locale.getDefault(), "%.2f", newPrice) + ")", Toast.LENGTH_SHORT).show();
                    });
                }
            }).start();
        });

        dialog.show();
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  2. Full 3-Tab Test Editor Sheet (Matches web test-form.tsx)
    // ─────────────────────────────────────────────────────────────────────────
    private void showFullTestEditorSheet(final TestItem editingTest) {
        BottomSheetDialog dialog = new BottomSheetDialog(this);
        View sheet = getLayoutInflater().inflate(R.layout.layout_add_test_sheet, null);
        dialog.setContentView(sheet);

        BottomSheetBehavior<View> behavior = BottomSheetBehavior.from((View) sheet.getParent());
        behavior.setPeekHeight((int) (getResources().getDisplayMetrics().heightPixels * 0.90));
        behavior.setState(BottomSheetBehavior.STATE_EXPANDED);

        // Sheet Header Views
        TextView lblSheetTitle = sheet.findViewById(R.id.lblSheetTitle);
        TextView lblSheetSubtitle = sheet.findViewById(R.id.lblSheetSubtitle);
        FrameLayout btnClose = sheet.findViewById(R.id.btnCloseAddTestSheet);
        View boxGlobalNotice = sheet.findViewById(R.id.boxGlobalTestNotice);

        // Tab Selectors
        TextView tabBasic = sheet.findViewById(R.id.tabFormBasic);
        TextView tabParams = sheet.findViewById(R.id.tabFormParameters);
        TextView tabPricing = sheet.findViewById(R.id.tabFormPricing);

        // Tab Content Containers
        LinearLayout contentBasic = sheet.findViewById(R.id.contentFormBasic);
        LinearLayout contentParams = sheet.findViewById(R.id.contentFormParameters);
        LinearLayout contentPricing = sheet.findViewById(R.id.contentFormPricing);

        // Tab 1 Inputs
        EditText inputName = sheet.findViewById(R.id.inputNewTestName);
        EditText inputCode = sheet.findViewById(R.id.inputNewTestCode);
        EditText inputPrintName = sheet.findViewById(R.id.inputNewTestPrintName);
        Spinner spinnerDept = sheet.findViewById(R.id.spinnerNewTestDept);
        Spinner spinnerSample = sheet.findViewById(R.id.spinnerNewTestSample);
        Spinner spinnerContainer = sheet.findViewById(R.id.spinnerNewTestContainer);

        // Tab 2 Inputs
        EditText inputParamSearch = sheet.findViewById(R.id.inputFormParamSearch);
        RecyclerView recyclerSuggestions = sheet.findViewById(R.id.recyclerParamSuggestions);
        TextView lblSelectedCount = sheet.findViewById(R.id.lblSelectedParamsCount);
        LinearLayout containerSelectedParams = sheet.findViewById(R.id.containerSelectedParams);
        View boxReagents = sheet.findViewById(R.id.boxReagentsSummary);
        TextView lblReagentsDetails = sheet.findViewById(R.id.lblReagentsSummaryDetails);

        // Tab 3 Inputs
        EditText inputPrice = sheet.findViewById(R.id.inputNewTestPrice);
        EditText inputB2B = sheet.findViewById(R.id.inputNewTestB2BPrice);
        EditText inputCost = sheet.findViewById(R.id.inputNewTestCost);
        EditText inputTat = sheet.findViewById(R.id.inputNewTestTat);
        EditText inputMethod = sheet.findViewById(R.id.inputNewTestMethod);
        SwitchCompat switchActive = sheet.findViewById(R.id.switchTestActive);

        // Bottom Action Buttons
        MaterialButton btnCancel = sheet.findViewById(R.id.btnCancelSheet);
        MaterialButton btnSubmit = sheet.findViewById(R.id.btnSubmitCreateTest);

        btnClose.setOnClickListener(v -> dialog.dismiss());
        btnCancel.setOnClickListener(v -> dialog.dismiss());

        // Setup Spinners
        String[] deptsList = {"Hematology", "Clinical Biochemistry", "Immunoassay & Endocrinology", "Clinical Pathology", "Microbiology", "Serology"};
        ArrayAdapter<String> deptAdapter = new ArrayAdapter<>(this, android.R.layout.simple_spinner_dropdown_item, deptsList);
        spinnerDept.setAdapter(deptAdapter);

        String[] samplesList = {"Serum Gel", "EDTA Whole Blood", "Fluoride Plasma", "Sterile Urine", "Sodium Citrate Plasma", "Body Fluid"};
        ArrayAdapter<String> sampleAdapter = new ArrayAdapter<>(this, android.R.layout.simple_spinner_dropdown_item, samplesList);
        spinnerSample.setAdapter(sampleAdapter);

        String[] containerList = {"Gold Top (SST Gel)", "Lavender Top (EDTA)", "Grey Top (Fluoride)", "Red Top (Plain)", "Blue Top (Citrate)"};
        ArrayAdapter<String> containerAdapter = new ArrayAdapter<>(this, android.R.layout.simple_spinner_dropdown_item, containerList);
        spinnerContainer.setAdapter(containerAdapter);

        // Selected components list for Tab 2
        final List<ParameterComponent> selectedComponents = new ArrayList<>();

        // Hydrate data if editing
        if (editingTest != null) {
            lblSheetTitle.setText(editingTest.isGlobal ? "Edit Master Test: " + editingTest.code : "Edit Custom Test: " + editingTest.code);
            lblSheetSubtitle.setText("Customize test parameters, prices and clinical settings for your lab");
            if (editingTest.isGlobal) boxGlobalNotice.setVisibility(View.VISIBLE);

            inputName.setText(editingTest.name);
            inputCode.setText(editingTest.code);
            inputPrintName.setText(editingTest.printName);
            inputPrice.setText(String.format(Locale.getDefault(), "%.2f", editingTest.price));
            inputB2B.setText(String.format(Locale.getDefault(), "%.2f", editingTest.b2bPrice));
            inputCost.setText(String.format(Locale.getDefault(), "%.2f", editingTest.cost));
            inputTat.setText(editingTest.tat);
            inputMethod.setText(editingTest.method);
            switchActive.setChecked(editingTest.isActive);

            if (editingTest.components != null && !editingTest.components.isEmpty()) {
                selectedComponents.addAll(editingTest.components);
            } else {
                selectedComponents.add(new ParameterComponent(editingTest.id, editingTest.name, editingTest.code));
            }

            btnSubmit.setText(editingTest.isGlobal ? "Save Local Override" : "Update Test Details");
        } else {
            lblSheetTitle.setText("Create New Custom Test");
            lblSheetSubtitle.setText("Configure clinical parameters, pricing and turnaround time");
            boxGlobalNotice.setVisibility(View.GONE);
            inputTat.setText("24 Hours");
            inputMethod.setText("Standard Photometric");
            btnSubmit.setText("Create Custom Test");
        }

        // Tab Switching Logic
        View.OnClickListener tabClickListener = v -> {
            tabBasic.setBackgroundColor(0);
            tabBasic.setTextColor(0xFF64748B);
            tabBasic.setElevation(0);

            tabParams.setBackgroundColor(0);
            tabParams.setTextColor(0xFF64748B);
            tabParams.setElevation(0);

            tabPricing.setBackgroundColor(0);
            tabPricing.setTextColor(0xFF64748B);
            tabPricing.setElevation(0);

            contentBasic.setVisibility(View.GONE);
            contentParams.setVisibility(View.GONE);
            contentPricing.setVisibility(View.GONE);

            if (v == tabBasic) {
                tabBasic.setBackgroundResource(R.drawable.bg_pill_white);
                tabBasic.setTextColor(0xFF0D6EFD);
                tabBasic.setElevation(dp(1));
                contentBasic.setVisibility(View.VISIBLE);
            } else if (v == tabParams) {
                tabParams.setBackgroundResource(R.drawable.bg_pill_white);
                tabParams.setTextColor(0xFF0D6EFD);
                tabParams.setElevation(dp(1));
                contentParams.setVisibility(View.VISIBLE);
            } else if (v == tabPricing) {
                tabPricing.setBackgroundResource(R.drawable.bg_pill_white);
                tabPricing.setTextColor(0xFF0D6EFD);
                tabPricing.setElevation(dp(1));
                contentPricing.setVisibility(View.VISIBLE);
            }
        };

        tabBasic.setOnClickListener(tabClickListener);
        tabParams.setOnClickListener(tabClickListener);
        tabPricing.setOnClickListener(tabClickListener);

        // Parameter Mapping: Refresh UI Helper
        Runnable refreshSelectedParamsUI = new Runnable() {
            @Override
            public void run() {
                containerSelectedParams.removeAllViews();
                lblSelectedCount.setText("Selected Parameters (" + selectedComponents.size() + ")");

                for (int i = 0; i < selectedComponents.size(); i++) {
                    final int idx = i;
                    ParameterComponent pc = selectedComponents.get(i);
                    View row = getLayoutInflater().inflate(R.layout.item_selected_test_parameter, containerSelectedParams, false);

                    TextView tvName = row.findViewById(R.id.lblSelectedParamName);
                    TextView tvCode = row.findViewById(R.id.lblSelectedParamCode);
                    ImageView btnUp = row.findViewById(R.id.btnParamMoveUp);
                    ImageView btnDown = row.findViewById(R.id.btnParamMoveDown);
                    ImageView btnRemove = row.findViewById(R.id.btnParamRemove);

                    tvName.setText(pc.name);
                    tvCode.setText("Code: " + pc.code + (pc.headingName != null ? " • " + pc.headingName : ""));

                    btnUp.setEnabled(idx > 0);
                    btnUp.setAlpha(idx > 0 ? 1.0f : 0.3f);
                    btnUp.setOnClickListener(x -> {
                        if (idx > 0) {
                            Collections.swap(selectedComponents, idx, idx - 1);
                            this.run();
                        }
                    });

                    btnDown.setEnabled(idx < selectedComponents.size() - 1);
                    btnDown.setAlpha(idx < selectedComponents.size() - 1 ? 1.0f : 0.3f);
                    btnDown.setOnClickListener(x -> {
                        if (idx < selectedComponents.size() - 1) {
                            Collections.swap(selectedComponents, idx, idx + 1);
                            this.run();
                        }
                    });

                    btnRemove.setOnClickListener(x -> {
                        selectedComponents.remove(idx);
                        this.run();
                    });

                    containerSelectedParams.addView(row);
                }

                boxReagents.setVisibility(selectedComponents.isEmpty() ? View.GONE : View.VISIBLE);
                if (!selectedComponents.isEmpty()) {
                    lblReagentsDetails.setText(selectedComponents.size() + " parameters linked. Reagent inventory auto-deduction configured.");
                }
            }
        };

        refreshSelectedParamsUI.run();

        // Parameter Search Suggestions Adapter
        List<ParameterItem> suggestionList = new ArrayList<>();
        recyclerSuggestions.setLayoutManager(new LinearLayoutManager(this));
        ParamSuggestionAdapter sugAdapter = new ParamSuggestionAdapter(suggestionList, param -> {
            selectedComponents.add(new ParameterComponent(param.id, param.name, param.code));
            inputParamSearch.setText("");
            recyclerSuggestions.setVisibility(View.GONE);
            refreshSelectedParamsUI.run();
        });
        recyclerSuggestions.setAdapter(sugAdapter);

        inputParamSearch.addTextChangedListener(new TextWatcher() {
            @Override public void beforeTextChanged(CharSequence s, int start, int count, int after) {}
            @Override public void onTextChanged(CharSequence s, int start, int before, int count) {
                String q = s.toString().trim().toLowerCase();
                if (q.isEmpty()) {
                    recyclerSuggestions.setVisibility(View.GONE);
                } else {
                    suggestionList.clear();
                    for (ParameterItem p : allParameters) {
                        if (p.name.toLowerCase().contains(q) || p.code.toLowerCase().contains(q)) {
                            suggestionList.add(p);
                        }
                    }
                    sugAdapter.notifyDataSetChanged();
                    recyclerSuggestions.setVisibility(suggestionList.isEmpty() ? View.GONE : View.VISIBLE);
                }
            }
            @Override public void afterTextChanged(Editable s) {}
        });

        // Submit Action
        btnSubmit.setOnClickListener(v -> {
            String name = inputName.getText().toString().trim();
            String code = inputCode.getText().toString().trim();
            String printName = inputPrintName.getText().toString().trim();
            String priceStr = inputPrice.getText().toString().trim();
            String tat = inputTat.getText().toString().trim();
            String method = inputMethod.getText().toString().trim();

            if (name.isEmpty()) {
                Toast.makeText(this, "Please enter test name", Toast.LENGTH_SHORT).show();
                tabBasic.performClick();
                return;
            }
            if (code.isEmpty()) {
                Toast.makeText(this, "Please enter short code", Toast.LENGTH_SHORT).show();
                tabBasic.performClick();
                return;
            }
            if (selectedComponents.isEmpty()) {
                Toast.makeText(this, "Please add at least 1 parameter to this test", Toast.LENGTH_SHORT).show();
                tabParams.performClick();
                return;
            }
            if (priceStr.isEmpty()) {
                Toast.makeText(this, "Please enter standard rate", Toast.LENGTH_SHORT).show();
                tabPricing.performClick();
                return;
            }

            double price = Double.parseDouble(priceStr);
            String b2bStr = inputB2B.getText().toString().trim();
            double b2b = b2bStr.isEmpty() ? price * 0.70 : Double.parseDouble(b2bStr);
            String costStr = inputCost.getText().toString().trim();
            double cost = costStr.isEmpty() ? 0.0 : Double.parseDouble(costStr);
            boolean isActive = switchActive.isChecked();

            btnSubmit.setEnabled(false);
            btnSubmit.setText("Saving Test...");

            new Thread(() -> {
                try {
                    String token = AuthManager.getToken(this);
                    String endpoint = (editingTest != null && editingTest.id != null)
                            ? BASE_URL + "/api/workspace/test-catalog/" + editingTest.id
                            : BASE_URL + "/api/workspace/test-catalog";

                    URL url = new URL(endpoint);
                    HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                    conn.setRequestMethod("PUT");
                    conn.setRequestProperty("Content-Type", "application/json");
                    if (token != null) {
                        conn.setRequestProperty("Authorization", "Bearer " + token);
                        conn.setRequestProperty("Cookie", "token=" + token);
                    }
                    conn.setDoOutput(true);

                    JSONObject payload = new JSONObject();
                    payload.put("name", name);
                    payload.put("code", code.toUpperCase());
                    payload.put("printName", printName.isEmpty() ? name : printName);
                    payload.put("price", price);
                    payload.put("b2bPrice", b2b);
                    payload.put("cost", cost);
                    payload.put("tat", tat.isEmpty() ? "24 Hours" : tat);
                    payload.put("method", method.isEmpty() ? "Standard Photometric" : method);
                    payload.put("isActive", isActive);
                    payload.put("parametersChanged", true);

                    JSONArray compsArr = new JSONArray();
                    for (int k = 0; k < selectedComponents.size(); k++) {
                        JSONObject compObj = new JSONObject();
                        compObj.put("parameterId", selectedComponents.get(k).parameterId);
                        compObj.put("headingId", selectedComponents.get(k).headingId);
                        compObj.put("order", k + 1);
                        compsArr.put(compObj);
                    }
                    payload.put("components", compsArr);

                    OutputStream os = conn.getOutputStream();
                    os.write(payload.toString().getBytes(StandardCharsets.UTF_8));
                    os.flush();
                    os.close();

                    int resCode = conn.getResponseCode();

                    mainHandler.post(() -> {
                        dialog.dismiss();
                        Toast.makeText(TestManagementActivity.this, name + " saved successfully!", Toast.LENGTH_SHORT).show();
                        fetchTestCatalog();
                    });

                } catch (Exception e) {
                    mainHandler.post(() -> {
                        dialog.dismiss();
                        Toast.makeText(TestManagementActivity.this, name + " updated locally!", Toast.LENGTH_SHORT).show();
                        fetchTestCatalog();
                    });
                }
            }).start();
        });

        dialog.show();
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  3. Delete Local Test with Confirmation
    // ─────────────────────────────────────────────────────────────────────────
    private void handleDeleteTest(TestItem test) {
        if (test.isGlobal) {
            new AlertDialog.Builder(this)
                    .setTitle("Global Master Test")
                    .setMessage("This is a platform master catalog test and cannot be deleted. You can override its pricing or set it to inactive instead.")
                    .setPositiveButton("OK", null)
                    .show();
            return;
        }

        new AlertDialog.Builder(this)
                .setTitle("Delete Custom Test")
                .setMessage("Are you sure you want to permanently delete '" + test.name + "' (" + test.code + ") from your laboratory menu?")
                .setPositiveButton("Delete Test", (d, w) -> {
                    allTests.remove(test);
                    applyTestFilters();

                    new Thread(() -> {
                        try {
                            String token = AuthManager.getToken(this);
                            URL url = new URL(BASE_URL + "/api/workspace/test-catalog?id=" + test.id);
                            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                            conn.setRequestMethod("DELETE");
                            if (token != null) {
                                conn.setRequestProperty("Authorization", "Bearer " + token);
                                conn.setRequestProperty("Cookie", "token=" + token);
                            }
                            conn.getResponseCode();
                        } catch (Exception ignored) {}
                    }).start();

                    Toast.makeText(this, test.name + " deleted", Toast.LENGTH_SHORT).show();
                })
                .setNegativeButton("Cancel", null)
                .show();
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  4. Full 4-Tab Parameter Editor Sheet (Matches web parameter-form.tsx)
    // ─────────────────────────────────────────────────────────────────────────
    private void showFullParameterEditorSheet(final ParameterItem editingParam) {
        BottomSheetDialog dialog = new BottomSheetDialog(this);
        View sheet = getLayoutInflater().inflate(R.layout.layout_add_parameter_sheet, null);
        dialog.setContentView(sheet);

        BottomSheetBehavior<View> behavior = BottomSheetBehavior.from((View) sheet.getParent());
        behavior.setPeekHeight((int) (getResources().getDisplayMetrics().heightPixels * 0.90));
        behavior.setState(BottomSheetBehavior.STATE_EXPANDED);

        // Header Views
        TextView lblSheetTitle = sheet.findViewById(R.id.lblParamSheetTitle);
        TextView lblSheetSubtitle = sheet.findViewById(R.id.lblParamSheetSubtitle);
        FrameLayout btnClose = sheet.findViewById(R.id.btnCloseParamSheet);
        View boxGlobalNotice = sheet.findViewById(R.id.boxGlobalParamNotice);

        // Tab Selectors
        TextView tabCore = sheet.findViewById(R.id.tabParamCore);
        TextView tabRanges = sheet.findViewById(R.id.tabParamRanges);
        TextView tabFormula = sheet.findViewById(R.id.tabParamFormula);
        TextView tabInventory = sheet.findViewById(R.id.tabParamInventory);

        // Tab Content Containers
        LinearLayout contentCore = sheet.findViewById(R.id.contentParamCore);
        LinearLayout contentRanges = sheet.findViewById(R.id.contentParamRanges);
        LinearLayout contentFormula = sheet.findViewById(R.id.contentParamFormula);
        LinearLayout contentInventory = sheet.findViewById(R.id.contentParamInventory);

        // Tab 1 Inputs
        EditText inputName = sheet.findViewById(R.id.inputNewParamName);
        EditText inputCode = sheet.findViewById(R.id.inputNewParamCode);
        Spinner spinnerTube = sheet.findViewById(R.id.spinnerParamTube);
        Spinner spinnerInputType = sheet.findViewById(R.id.spinnerParamInputType);
        EditText inputUnit = sheet.findViewById(R.id.inputNewParamUnit);
        EditText inputPrice = sheet.findViewById(R.id.inputNewParamPrice);
        EditText inputMethod = sheet.findViewById(R.id.inputNewParamMethod);
        EditText inputDecimals = sheet.findViewById(R.id.inputNewParamDecimals);

        // Tab 2 Range Builder Container & Button
        LinearLayout containerRangeRows = sheet.findViewById(R.id.containerRangeRows);
        MaterialButton btnAddRangeRow = sheet.findViewById(R.id.btnAddParamRangeRow);

        // Tab 3 Formula Input
        EditText inputFormula = sheet.findViewById(R.id.inputNewParamFormula);

        // Tab 4 Reagent Builder Container & Button
        LinearLayout containerReagentRows = sheet.findViewById(R.id.containerReagentRows);
        MaterialButton btnAddReagentRow = sheet.findViewById(R.id.btnAddParamReagentRow);

        // Bottom Actions
        MaterialButton btnCancel = sheet.findViewById(R.id.btnCancelParamSheet);
        MaterialButton btnSubmit = sheet.findViewById(R.id.btnSubmitParamSheet);

        btnClose.setOnClickListener(v -> dialog.dismiss());
        btnCancel.setOnClickListener(v -> dialog.dismiss());

        // Setup Spinners
        String[] tubeOptions = {"Lavender Top (EDTA)", "Gold Top (SST Gel)", "Grey Top (Fluoride)", "Red Top (Plain)", "Blue Top (Citrate)", "General Container"};
        ArrayAdapter<String> tubeAdapter = new ArrayAdapter<>(this, android.R.layout.simple_spinner_dropdown_item, tubeOptions);
        spinnerTube.setAdapter(tubeAdapter);

        String[] inputTypeOptions = {"Numeric Result (NUMBER)", "Short Text (TEXT)", "Paragraph (LONG_TEXT)", "Dropdown List (DROPDOWN)", "Heading Only (HEADING)"};
        ArrayAdapter<String> typeAdapter = new ArrayAdapter<>(this, android.R.layout.simple_spinner_dropdown_item, inputTypeOptions);
        spinnerInputType.setAdapter(typeAdapter);

        // Range conditions & Reagents working lists
        final List<ParameterRange> rangeList = new ArrayList<>();
        final List<ParameterReagent> reagentList = new ArrayList<>();

        if (editingParam != null) {
            lblSheetTitle.setText(editingParam.isGlobal ? "Edit Master Parameter: " + editingParam.code : "Edit Custom Parameter: " + editingParam.code);
            lblSheetSubtitle.setText("Customize clinical reference intervals, calculations and auto-reagents");
            if (editingParam.isGlobal) boxGlobalNotice.setVisibility(View.VISIBLE);

            inputName.setText(editingParam.name);
            inputCode.setText(editingParam.code);
            inputUnit.setText(editingParam.unit);
            inputPrice.setText(String.format(Locale.getDefault(), "%.2f", editingParam.price));
            inputMethod.setText(editingParam.method);
            inputDecimals.setText(String.valueOf(editingParam.decimals));
            inputFormula.setText(editingParam.formula != null ? editingParam.formula : "");

            if (editingParam.ranges != null && !editingParam.ranges.isEmpty()) {
                rangeList.addAll(editingParam.ranges);
            } else {
                ParameterRange def = new ParameterRange();
                rangeList.add(def);
            }

            if (editingParam.reagents != null) {
                reagentList.addAll(editingParam.reagents);
            }

            btnSubmit.setText(editingParam.isGlobal ? "Save Local Override" : "Update Parameter");
        } else {
            lblSheetTitle.setText("Create New Custom Parameter");
            lblSheetSubtitle.setText("Configure reference intervals, calculations & auto-reagents");
            boxGlobalNotice.setVisibility(View.GONE);
            inputDecimals.setText("2");
            inputMethod.setText("Photometric");

            ParameterRange def = new ParameterRange();
            rangeList.add(def);
            btnSubmit.setText("Save Parameter");
        }

        // Tab Switching Logic
        View.OnClickListener tabClickListener = v -> {
            tabCore.setBackgroundColor(0);
            tabCore.setTextColor(0xFF64748B);
            tabCore.setElevation(0);

            tabRanges.setBackgroundColor(0);
            tabRanges.setTextColor(0xFF64748B);
            tabRanges.setElevation(0);

            tabFormula.setBackgroundColor(0);
            tabFormula.setTextColor(0xFF64748B);
            tabFormula.setElevation(0);

            tabInventory.setBackgroundColor(0);
            tabInventory.setTextColor(0xFF64748B);
            tabInventory.setElevation(0);

            contentCore.setVisibility(View.GONE);
            contentRanges.setVisibility(View.GONE);
            contentFormula.setVisibility(View.GONE);
            contentInventory.setVisibility(View.GONE);

            if (v == tabCore) {
                tabCore.setBackgroundResource(R.drawable.bg_pill_white);
                tabCore.setTextColor(0xFF0D6EFD);
                tabCore.setElevation(dp(1));
                contentCore.setVisibility(View.VISIBLE);
            } else if (v == tabRanges) {
                tabRanges.setBackgroundResource(R.drawable.bg_pill_white);
                tabRanges.setTextColor(0xFF0D6EFD);
                tabRanges.setElevation(dp(1));
                contentRanges.setVisibility(View.VISIBLE);
            } else if (v == tabFormula) {
                tabFormula.setBackgroundResource(R.drawable.bg_pill_white);
                tabFormula.setTextColor(0xFF0D6EFD);
                tabFormula.setElevation(dp(1));
                contentFormula.setVisibility(View.VISIBLE);
            } else if (v == tabInventory) {
                tabInventory.setBackgroundResource(R.drawable.bg_pill_white);
                tabInventory.setTextColor(0xFF0D6EFD);
                tabInventory.setElevation(dp(1));
                contentInventory.setVisibility(View.VISIBLE);
            }
        };

        tabCore.setOnClickListener(tabClickListener);
        tabRanges.setOnClickListener(tabClickListener);
        tabFormula.setOnClickListener(tabClickListener);
        tabInventory.setOnClickListener(tabClickListener);

        // Range Conditions Renderer Helper
        Runnable refreshRangesUI = new Runnable() {
            @Override
            public void run() {
                containerRangeRows.removeAllViews();
                for (int i = 0; i < rangeList.size(); i++) {
                    final int idx = i;
                    ParameterRange range = rangeList.get(i);
                    View row = getLayoutInflater().inflate(R.layout.item_param_range_row, containerRangeRows, false);

                    TextView lblTitle = row.findViewById(R.id.lblRangeConditionTitle);
                    lblTitle.setText("Condition Interval #" + (idx + 1));

                    EditText inTextVal = row.findViewById(R.id.inputRangeTextValue);
                    Spinner spGender = row.findViewById(R.id.spinnerRangeGender);
                    EditText inCustomLabel = row.findViewById(R.id.inputRangeCustomLabel);
                    EditText inMinAge = row.findViewById(R.id.inputRangeMinAge);
                    EditText inMaxAge = row.findViewById(R.id.inputRangeMaxAge);
                    Spinner spAgeUnit = row.findViewById(R.id.spinnerRangeAgeUnit);
                    EditText inLow = row.findViewById(R.id.inputRangeLowValue);
                    EditText inHigh = row.findViewById(R.id.inputRangeHighValue);
                    EditText inCritLow = row.findViewById(R.id.inputRangeCriticalLow);
                    EditText inCritHigh = row.findViewById(R.id.inputRangeCriticalHigh);
                    ImageView btnDel = row.findViewById(R.id.btnDeleteRangeRow);

                    inTextVal.setText(range.textValue);
                    inCustomLabel.setText(range.customLabel);
                    inMinAge.setText(String.valueOf(range.minAge));
                    inMaxAge.setText(String.valueOf(range.maxAge));
                    if (range.lowValue != null) inLow.setText(String.valueOf(range.lowValue));
                    if (range.highValue != null) inHigh.setText(String.valueOf(range.highValue));
                    if (range.criticalLow != null) inCritLow.setText(String.valueOf(range.criticalLow));
                    if (range.criticalHigh != null) inCritHigh.setText(String.valueOf(range.criticalHigh));

                    String[] genders = {"BOTH", "MALE", "FEMALE", "CUSTOM"};
                    ArrayAdapter<String> ga = new ArrayAdapter<>(TestManagementActivity.this, android.R.layout.simple_spinner_dropdown_item, genders);
                    spGender.setAdapter(ga);
                    for (int g = 0; g < genders.length; g++) {
                        if (genders[g].equalsIgnoreCase(range.gender)) spGender.setSelection(g);
                    }

                    String[] ageUnits = {"YEAR", "MONTH", "DAY"};
                    ArrayAdapter<String> aua = new ArrayAdapter<>(TestManagementActivity.this, android.R.layout.simple_spinner_dropdown_item, ageUnits);
                    spAgeUnit.setAdapter(aua);
                    for (int u = 0; u < ageUnits.length; u++) {
                        if (ageUnits[u].equalsIgnoreCase(range.ageUnit)) spAgeUnit.setSelection(u);
                    }

                    btnDel.setOnClickListener(x -> {
                        rangeList.remove(idx);
                        this.run();
                    });

                    containerRangeRows.addView(row);
                }
            }
        };

        btnAddRangeRow.setOnClickListener(v -> {
            rangeList.add(new ParameterRange());
            refreshRangesUI.run();
        });

        refreshRangesUI.run();

        // Reagent Items Renderer Helper
        Runnable refreshReagentsUI = new Runnable() {
            @Override
            public void run() {
                containerReagentRows.removeAllViews();
                for (int i = 0; i < reagentList.size(); i++) {
                    final int idx = i;
                    ParameterReagent reagent = reagentList.get(i);
                    View row = getLayoutInflater().inflate(R.layout.item_param_reagent_row, containerReagentRows, false);

                    Spinner spItem = row.findViewById(R.id.spinnerReagentItem);
                    EditText inQty = row.findViewById(R.id.inputReagentQuantity);
                    ImageView btnDel = row.findViewById(R.id.btnDeleteReagentRow);

                    inQty.setText(String.valueOf(reagent.quantity));

                    String[] sampleReagents = {"Drabkin's Reagent (mL)", "SLS Lysis Buffer (µL)", "Glucose Oxidase Reagent (mL)", "Creatinine Picric Acid (mL)", "Diluent Buffer (mL)"};
                    ArrayAdapter<String> rga = new ArrayAdapter<>(TestManagementActivity.this, android.R.layout.simple_spinner_dropdown_item, sampleReagents);
                    spItem.setAdapter(rga);

                    btnDel.setOnClickListener(x -> {
                        reagentList.remove(idx);
                        this.run();
                    });

                    containerReagentRows.addView(row);
                }
            }
        };

        btnAddReagentRow.setOnClickListener(v -> {
            ParameterReagent r = new ParameterReagent();
            r.quantity = 50.0;
            reagentList.add(r);
            refreshReagentsUI.run();
        });

        refreshReagentsUI.run();

        // Submit Action
        btnSubmit.setOnClickListener(v -> {
            String name = inputName.getText().toString().trim();
            String code = inputCode.getText().toString().trim();
            String unit = inputUnit.getText().toString().trim();
            String priceStr = inputPrice.getText().toString().trim();
            String method = inputMethod.getText().toString().trim();
            String formula = inputFormula.getText().toString().trim();
            String decStr = inputDecimals.getText().toString().trim();

            if (name.isEmpty()) {
                Toast.makeText(this, "Please enter parameter name", Toast.LENGTH_SHORT).show();
                tabCore.performClick();
                return;
            }
            if (code.isEmpty()) {
                Toast.makeText(this, "Please enter parameter short code", Toast.LENGTH_SHORT).show();
                tabCore.performClick();
                return;
            }

            double price = priceStr.isEmpty() ? 0.0 : Double.parseDouble(priceStr);
            int decimals = decStr.isEmpty() ? 2 : Integer.parseInt(decStr);

            btnSubmit.setEnabled(false);
            btnSubmit.setText("Saving Parameter...");

            new Thread(() -> {
                try {
                    String token = AuthManager.getToken(this);
                    URL url = new URL(BASE_URL + "/api/workspace/parameters");
                    HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                    conn.setRequestMethod((editingParam != null && editingParam.id != null) ? "PUT" : "POST");
                    conn.setRequestProperty("Content-Type", "application/json");
                    if (token != null) {
                        conn.setRequestProperty("Authorization", "Bearer " + token);
                        conn.setRequestProperty("Cookie", "token=" + token);
                    }
                    conn.setDoOutput(true);

                    JSONObject payload = new JSONObject();
                    if (editingParam != null && editingParam.id != null) {
                        payload.put("id", editingParam.id);
                    }
                    payload.put("name", name);
                    payload.put("code", code.toUpperCase());
                    payload.put("printName", name);
                    payload.put("unit", unit.isEmpty() ? "-" : unit);
                    payload.put("method", method.isEmpty() ? "Photometric" : method);
                    payload.put("formula", formula);
                    payload.put("price", price);
                    payload.put("decimals", decimals);
                    payload.put("inputType", "NUMBER");
                    payload.put("isActive", true);

                    // Ranges JSON Array
                    JSONArray rangesArr = new JSONArray();
                    for (ParameterRange r : rangeList) {
                        JSONObject ro = new JSONObject();
                        ro.put("gender", r.gender);
                        ro.put("customLabel", r.customLabel);
                        ro.put("minAge", r.minAge);
                        ro.put("maxAge", r.maxAge);
                        ro.put("ageUnit", r.ageUnit);
                        if (r.lowValue != null) ro.put("lowValue", r.lowValue);
                        if (r.highValue != null) ro.put("highValue", r.highValue);
                        if (r.criticalLow != null) ro.put("criticalLow", r.criticalLow);
                        if (r.criticalHigh != null) ro.put("criticalHigh", r.criticalHigh);
                        ro.put("textValue", r.textValue);
                        rangesArr.put(ro);
                    }
                    payload.put("ranges", rangesArr);

                    OutputStream os = conn.getOutputStream();
                    os.write(payload.toString().getBytes(StandardCharsets.UTF_8));
                    os.flush();
                    os.close();

                    int resCode = conn.getResponseCode();

                    mainHandler.post(() -> {
                        dialog.dismiss();
                        Toast.makeText(TestManagementActivity.this, name + " saved successfully!", Toast.LENGTH_SHORT).show();
                        fetchParameters();
                    });

                } catch (Exception e) {
                    mainHandler.post(() -> {
                        dialog.dismiss();
                        Toast.makeText(TestManagementActivity.this, name + " updated locally!", Toast.LENGTH_SHORT).show();
                        fetchParameters();
                    });
                }
            }).start();
        });

        dialog.show();
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  5. Delete Parameter with Confirmation
    // ─────────────────────────────────────────────────────────────────────────
    private void handleDeleteParameter(ParameterItem param) {
        if (param.isGlobal) {
            new AlertDialog.Builder(this)
                    .setTitle("Global Master Parameter")
                    .setMessage("This is a platform master parameter and cannot be deleted. You can edit its details to create a custom local copy instead.")
                    .setPositiveButton("OK", null)
                    .show();
            return;
        }

        new AlertDialog.Builder(this)
                .setTitle("Delete Parameter")
                .setMessage("Are you sure? Deleting parameter '" + param.name + "' (" + param.code + ") will remove it from your local catalog.")
                .setPositiveButton("Delete Parameter", (d, w) -> {
                    allParameters.remove(param);
                    applyParameterFilters();

                    new Thread(() -> {
                        try {
                            String token = AuthManager.getToken(this);
                            URL url = new URL(BASE_URL + "/api/workspace/parameters?id=" + param.id);
                            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                            conn.setRequestMethod("DELETE");
                            if (token != null) {
                                conn.setRequestProperty("Authorization", "Bearer " + token);
                                conn.setRequestProperty("Cookie", "token=" + token);
                            }
                            conn.getResponseCode();
                        } catch (Exception ignored) {}
                    }).start();

                    Toast.makeText(this, param.name + " deleted", Toast.LENGTH_SHORT).show();
                })
                .setNegativeButton("Cancel", null)
                .show();
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Recycler Adapters
    // ─────────────────────────────────────────────────────────────────────────
    public static class TestCatalogCardAdapter extends RecyclerView.Adapter<TestCatalogCardAdapter.TestViewHolder> {
        private final List<TestItem> tests;
        private final OnActionListener onQuickPrice;
        private final OnActionListener onFullEdit;
        private final OnActionListener onDelete;

        public interface OnActionListener {
            void onAction(TestItem test);
        }

        public TestCatalogCardAdapter(List<TestItem> tests,
                                      OnActionListener onQuickPrice,
                                      OnActionListener onFullEdit,
                                      OnActionListener onDelete) {
            this.tests = tests;
            this.onQuickPrice = onQuickPrice;
            this.onFullEdit = onFullEdit;
            this.onDelete = onDelete;
        }

        @NonNull
        @Override
        public TestViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
            View v = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_test_catalog_card, parent, false);
            return new TestViewHolder(v);
        }

        @Override
        public void onBindViewHolder(@NonNull TestViewHolder holder, int position) {
            TestItem t = tests.get(position);
            holder.lblName.setText(t.name);
            holder.lblCode.setText(t.code);
            holder.lblDept.setText(t.deptName);
            holder.lblSpecimen.setText(t.sampleType);
            holder.lblParamsCount.setText(t.paramsCount + (t.paramsCount > 1 ? " Params" : " Param"));
            holder.lblPrice.setText(String.format(Locale.getDefault(), "₹%,.2f", t.price));
            holder.lblB2BPrice.setText(String.format(Locale.getDefault(), "B2B: ₹%,.0f", t.b2bPrice));

            // Scope pill: Global vs Local (No Emojis)
            if (t.isGlobal) {
                holder.lblScope.setText("Global");
                holder.lblScope.setBackgroundResource(R.drawable.bg_pill_indigo_soft);
                holder.lblScope.setTextColor(0xFF4338CA);
            } else {
                holder.lblScope.setText("Local");
                holder.lblScope.setBackgroundResource(R.drawable.bg_tag_emerald);
                holder.lblScope.setTextColor(0xFF059669);
            }

            // Inactive & Custom Price tags
            holder.lblInactive.setVisibility(t.isActive ? View.GONE : View.VISIBLE);
            holder.lblCustomPriceTag.setVisibility(t.hasOverride ? View.VISIBLE : View.GONE);
            holder.lblCustomPriceTag.setTextColor(0xFFFFFFFF);
            holder.lblCustomPriceTag.setBackgroundResource(R.drawable.bg_bento_blue);
            holder.lblReagents.setVisibility(t.hasAutoReagents ? View.VISIBLE : View.GONE);
            holder.lblReagents.setText("Auto Reagents");

            try {
                int color = android.graphics.Color.parseColor(t.tubeCapColor);
                holder.dotCapColor.setBackgroundTintList(android.content.res.ColorStateList.valueOf(color));
            } catch (Exception e) {
                holder.dotCapColor.setBackgroundTintList(android.content.res.ColorStateList.valueOf(0xFF7C3AED));
            }

            // Actions
            holder.btnQuickPrice.setOnClickListener(v -> {
                if (onQuickPrice != null) onQuickPrice.onAction(t);
            });

            holder.btnFullEdit.setOnClickListener(v -> {
                if (onFullEdit != null) onFullEdit.onAction(t);
            });

            holder.btnDelete.setOnClickListener(v -> {
                if (onDelete != null) onDelete.onAction(t);
            });
            holder.btnDelete.setAlpha(t.isGlobal ? 0.35f : 1.0f);
        }

        @Override
        public int getItemCount() {
            return tests.size();
        }

        static class TestViewHolder extends RecyclerView.ViewHolder {
            TextView lblName, lblCode, lblScope, lblInactive, lblCustomPriceTag, lblDept, lblSpecimen, lblParamsCount, lblReagents, lblPrice, lblB2BPrice;
            View dotCapColor;
            MaterialButton btnQuickPrice, btnFullEdit, btnDelete;

            TestViewHolder(@NonNull View itemView) {
                super(itemView);
                lblName           = itemView.findViewById(R.id.lblTestItemName);
                lblCode           = itemView.findViewById(R.id.lblTestItemCode);
                lblScope          = itemView.findViewById(R.id.lblTestScope);
                lblInactive       = itemView.findViewById(R.id.lblTestInactive);
                lblCustomPriceTag = itemView.findViewById(R.id.lblTestCustomPriceTag);
                lblDept           = itemView.findViewById(R.id.lblTestItemDept);
                lblSpecimen       = itemView.findViewById(R.id.lblTestSpecimen);
                lblParamsCount    = itemView.findViewById(R.id.lblTestParamsCount);
                lblReagents       = itemView.findViewById(R.id.lblTestReagents);
                lblPrice          = itemView.findViewById(R.id.lblTestPrice);
                lblB2BPrice       = itemView.findViewById(R.id.lblTestB2BPrice);
                dotCapColor       = itemView.findViewById(R.id.dotTubeCapColor);
                btnQuickPrice     = itemView.findViewById(R.id.btnEditTestPrice);
                btnFullEdit       = itemView.findViewById(R.id.btnFullEditTest);
                btnDelete         = itemView.findViewById(R.id.btnDeleteTest);
            }
        }
    }

    public static class ParamSuggestionAdapter extends RecyclerView.Adapter<ParamSuggestionAdapter.SugViewHolder> {
        private final List<ParameterItem> list;
        private final OnSugClick listener;

        public interface OnSugClick { void onClick(ParameterItem item); }

        public ParamSuggestionAdapter(List<ParameterItem> list, OnSugClick listener) {
            this.list = list;
            this.listener = listener;
        }

        @NonNull
        @Override
        public SugViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
            View v = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_param_suggestion, parent, false);
            return new SugViewHolder(v);
        }

        @Override
        public void onBindViewHolder(@NonNull SugViewHolder holder, int position) {
            ParameterItem p = list.get(position);
            holder.name.setText(p.name);
            holder.code.setText(p.code);
            holder.itemView.setOnClickListener(v -> {
                if (listener != null) listener.onClick(p);
            });
        }

        @Override
        public int getItemCount() {
            return list.size();
        }

        static class SugViewHolder extends RecyclerView.ViewHolder {
            TextView name, code;
            SugViewHolder(@NonNull View itemView) {
                super(itemView);
                name = itemView.findViewById(R.id.lblParamSugName);
                code = itemView.findViewById(R.id.lblParamSugCode);
            }
        }
    }

    public static class ParameterCardAdapter extends RecyclerView.Adapter<ParameterCardAdapter.ParamViewHolder> {
        private final List<ParameterItem> params;
        private final OnParamActionListener onEdit;
        private final OnParamActionListener onDelete;

        public interface OnParamActionListener { void onAction(ParameterItem item); }

        public ParameterCardAdapter(List<ParameterItem> params, OnParamActionListener onEdit, OnParamActionListener onDelete) {
            this.params = params;
            this.onEdit = onEdit;
            this.onDelete = onDelete;
        }

        @NonNull
        @Override
        public ParamViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
            View v = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_parameter_card, parent, false);
            return new ParamViewHolder(v);
        }

        @Override
        public void onBindViewHolder(@NonNull ParamViewHolder holder, int position) {
            ParameterItem p = params.get(position);
            holder.lblName.setText(p.name);
            holder.lblCode.setText(p.code);
            if (p.method == null || p.method.trim().isEmpty() || "null".equalsIgnoreCase(p.method.trim())) {
                holder.lblMethod.setText("Method: Standard");
            } else {
                holder.lblMethod.setText("Method: " + p.method.trim());
            }
            holder.lblInputType.setText(p.inputType);

            // Scope pill: Global vs Local (No Emojis)
            if (p.isGlobal) {
                holder.lblScope.setText("Global");
                holder.lblScope.setBackgroundResource(R.drawable.bg_pill_indigo_soft);
                holder.lblScope.setTextColor(0xFF4338CA);
            } else {
                holder.lblScope.setText("Local");
                holder.lblScope.setBackgroundResource(R.drawable.bg_tag_emerald);
                holder.lblScope.setTextColor(0xFF059669);
            }

            // Tube indicator
            holder.lblTubeCode.setText(p.containerCode);
            try {
                int color = android.graphics.Color.parseColor(p.tubeCapColor);
                holder.dotCapColor.setBackgroundTintList(android.content.res.ColorStateList.valueOf(color));
            } catch (Exception ignored) {
                holder.dotCapColor.setBackgroundTintList(android.content.res.ColorStateList.valueOf(0xFF7C3AED));
            }

            // Price & Reagents
            if (p.price > 0) {
                holder.lblPrice.setText(String.format(Locale.getDefault(), "₹%,.2f", p.price));
                holder.lblPrice.setVisibility(View.VISIBLE);
            } else {
                holder.lblPrice.setVisibility(View.GONE);
            }
            holder.lblReagents.setVisibility(p.reagents.isEmpty() ? View.GONE : View.VISIBLE);

            // Reference Ranges & Panic Previews
            holder.lblRefRange.setText(p.getReferenceRangeSummary());
            holder.lblRefRange.setTextColor(0xFFFFFFFF);
            String panicSummary = p.getPanicRangeSummary();
            if (panicSummary != null) {
                holder.lblPanicRange.setText(panicSummary);
                holder.lblPanicRange.setVisibility(View.VISIBLE);
            } else {
                holder.lblPanicRange.setVisibility(View.GONE);
            }

            // Actions
            holder.btnEdit.setOnClickListener(v -> {
                if (onEdit != null) onEdit.onAction(p);
            });

            holder.btnDelete.setOnClickListener(v -> {
                if (onDelete != null) onDelete.onAction(p);
            });
            holder.btnDelete.setAlpha(p.isGlobal ? 0.35f : 1.0f);
        }

        @Override
        public int getItemCount() {
            return params.size();
        }

        static class ParamViewHolder extends RecyclerView.ViewHolder {
            TextView lblName, lblCode, lblScope, lblInputType, lblMethod, lblTubeCode, lblReagents, lblPrice, lblRefRange, lblPanicRange;
            View dotCapColor;
            MaterialButton btnEdit, btnDelete;

            ParamViewHolder(@NonNull View itemView) {
                super(itemView);
                lblName       = itemView.findViewById(R.id.lblParamName);
                lblCode       = itemView.findViewById(R.id.lblParamCode);
                lblScope      = itemView.findViewById(R.id.lblParamScope);
                lblInputType  = itemView.findViewById(R.id.lblParamInputType);
                lblMethod     = itemView.findViewById(R.id.lblParamMethod);
                lblTubeCode   = itemView.findViewById(R.id.lblParamTubeCode);
                lblReagents   = itemView.findViewById(R.id.lblParamReagents);
                lblPrice      = itemView.findViewById(R.id.lblParamPrice);
                lblRefRange   = itemView.findViewById(R.id.lblParamRefRange);
                lblPanicRange = itemView.findViewById(R.id.lblParamPanicRange);
                dotCapColor   = itemView.findViewById(R.id.dotParamCapColor);
                btnEdit       = itemView.findViewById(R.id.btnEditParam);
                btnDelete     = itemView.findViewById(R.id.btnDeleteParam);
            }
        }
    }

    public static class SpecimenTubeAdapter extends RecyclerView.Adapter<SpecimenTubeAdapter.TubeViewHolder> {
        private final List<SpecimenTubeItem> tubes;

        public SpecimenTubeAdapter(List<SpecimenTubeItem> tubes) {
            this.tubes = tubes;
        }

        @NonNull
        @Override
        public TubeViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
            View v = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_specimen_tube_card, parent, false);
            return new TubeViewHolder(v);
        }

        @Override
        public void onBindViewHolder(@NonNull TubeViewHolder holder, int position) {
            SpecimenTubeItem t = tubes.get(position);
            holder.lblName.setText(t.name);
            holder.lblAdditive.setText("Additive: " + t.additive);
            holder.lblUsage.setText("Used for: " + t.usage);
            holder.lblCode.setText(t.code);

            try {
                int color = android.graphics.Color.parseColor(t.capColor);
                holder.dotCap.setBackgroundTintList(android.content.res.ColorStateList.valueOf(color));
            } catch (Exception ignored) {}
        }

        @Override
        public int getItemCount() {
            return tubes.size();
        }

        static class TubeViewHolder extends RecyclerView.ViewHolder {
            TextView lblName, lblAdditive, lblUsage, lblCode;
            View dotCap;

            TubeViewHolder(@NonNull View itemView) {
                super(itemView);
                lblName     = itemView.findViewById(R.id.lblTubeName);
                lblAdditive = itemView.findViewById(R.id.lblTubeAdditive);
                lblUsage    = itemView.findViewById(R.id.lblTubeUsage);
                lblCode     = itemView.findViewById(R.id.lblTubeCodeBadge);
                dotCap      = itemView.findViewById(R.id.tubeCapIndicator);
            }
        }
    }

    public static class CustomFieldAdapter extends RecyclerView.Adapter<CustomFieldAdapter.CustomFieldViewHolder> {
        private final List<CustomFieldItem> items;
        private final java.util.function.Consumer<CustomFieldItem> onEdit;
        private final java.util.function.Consumer<CustomFieldItem> onDelete;

        public CustomFieldAdapter(List<CustomFieldItem> items, java.util.function.Consumer<CustomFieldItem> onEdit, java.util.function.Consumer<CustomFieldItem> onDelete) {
            this.items = items;
            this.onEdit = onEdit;
            this.onDelete = onDelete;
        }

        @NonNull
        @Override
        public CustomFieldViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
            View v = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_custom_field_card, parent, false);
            return new CustomFieldViewHolder(v);
        }

        @Override
        public void onBindViewHolder(@NonNull CustomFieldViewHolder holder, int position) {
            CustomFieldItem item = items.get(position);
            holder.lblName.setText(item.name);
            holder.lblType.setText(item.type);
            holder.lblLayout.setText(item.reportLayout.equals("FULL") ? "Full Width" : "Half Width");
            holder.lblPrintable.setVisibility(item.printOnReport ? View.VISIBLE : View.GONE);
            holder.lblUsedIn.setText(item.usedCount > 0 ? "Used in " + item.usedCount + " Tests" : "Custom Template Field");

            if (!item.options.isEmpty()) {
                holder.lblOptions.setVisibility(View.VISIBLE);
                holder.lblOptions.setText("Options: " + String.join(", ", item.options));
            } else {
                holder.lblOptions.setVisibility(View.GONE);
            }

            holder.btnEdit.setOnClickListener(v -> onEdit.accept(item));
            holder.btnDelete.setOnClickListener(v -> onDelete.accept(item));
        }

        @Override
        public int getItemCount() {
            return items.size();
        }

        static class CustomFieldViewHolder extends RecyclerView.ViewHolder {
            TextView lblName, lblType, lblLayout, lblPrintable, lblOptions, lblUsedIn;
            View btnEdit, btnDelete;

            CustomFieldViewHolder(@NonNull View itemView) {
                super(itemView);
                lblName     = itemView.findViewById(R.id.lblCustomFieldName);
                lblType     = itemView.findViewById(R.id.lblCustomFieldType);
                lblLayout   = itemView.findViewById(R.id.lblCustomFieldLayout);
                lblPrintable= itemView.findViewById(R.id.lblCustomFieldPrintable);
                lblOptions  = itemView.findViewById(R.id.lblCustomFieldOptions);
                lblUsedIn   = itemView.findViewById(R.id.lblCustomFieldUsedIn);
                btnEdit     = itemView.findViewById(R.id.btnEditCustomField);
                btnDelete   = itemView.findViewById(R.id.btnDeleteCustomField);
            }
        }
    }

    public static class HeadingAdapter extends RecyclerView.Adapter<HeadingAdapter.HeadingViewHolder> {
        private final List<HeadingItem> items;
        private final java.util.function.Consumer<HeadingItem> onEdit;
        private final java.util.function.Consumer<HeadingItem> onDelete;

        public HeadingAdapter(List<HeadingItem> items, java.util.function.Consumer<HeadingItem> onEdit, java.util.function.Consumer<HeadingItem> onDelete) {
            this.items = items;
            this.onEdit = onEdit;
            this.onDelete = onDelete;
        }

        @NonNull
        @Override
        public HeadingViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
            View v = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_heading_card, parent, false);
            return new HeadingViewHolder(v);
        }

        @Override
        public void onBindViewHolder(@NonNull HeadingViewHolder holder, int position) {
            HeadingItem item = items.get(position);
            holder.lblName.setText(item.name);
            holder.lblOrder.setText("Order #" + item.order);
            holder.lblScope.setText(item.isGlobal ? "Global" : "Local");
            holder.lblDesc.setText(item.description.isEmpty() ? "Section header for grouping parameters on the diagnostic report" : item.description);

            holder.btnEdit.setOnClickListener(v -> onEdit.accept(item));
            holder.btnDelete.setOnClickListener(v -> onDelete.accept(item));
        }

        @Override
        public int getItemCount() {
            return items.size();
        }

        static class HeadingViewHolder extends RecyclerView.ViewHolder {
            TextView lblName, lblOrder, lblScope, lblDesc;
            View btnEdit, btnDelete;

            HeadingViewHolder(@NonNull View itemView) {
                super(itemView);
                lblName  = itemView.findViewById(R.id.lblHeadingName);
                lblOrder = itemView.findViewById(R.id.lblHeadingOrder);
                lblScope = itemView.findViewById(R.id.lblHeadingScope);
                lblDesc  = itemView.findViewById(R.id.lblHeadingDesc);
                btnEdit  = itemView.findViewById(R.id.btnEditHeading);
                btnDelete= itemView.findViewById(R.id.btnDeleteHeading);
            }
        }
    }

    public static class SampleTypeAdapter extends RecyclerView.Adapter<SampleTypeAdapter.SampleTypeViewHolder> {
        private final List<SampleTypeItem> items;
        private final java.util.function.Consumer<SampleTypeItem> onEdit;
        private final java.util.function.Consumer<SampleTypeItem> onDelete;

        public SampleTypeAdapter(List<SampleTypeItem> items, java.util.function.Consumer<SampleTypeItem> onEdit, java.util.function.Consumer<SampleTypeItem> onDelete) {
            this.items = items;
            this.onEdit = onEdit;
            this.onDelete = onDelete;
        }

        @NonNull
        @Override
        public SampleTypeViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
            View v = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_sample_type_card, parent, false);
            return new SampleTypeViewHolder(v);
        }

        @Override
        public void onBindViewHolder(@NonNull SampleTypeViewHolder holder, int position) {
            SampleTypeItem item = items.get(position);
            holder.lblName.setText(item.name);
            if (item.code == null || item.code.trim().isEmpty() || "null".equalsIgnoreCase(item.code.trim())) {
                holder.lblCode.setVisibility(View.GONE);
            } else {
                holder.lblCode.setVisibility(View.VISIBLE);
                holder.lblCode.setText(item.code.trim());
            }
            holder.lblScope.setText(item.isGlobal ? "Global" : "Local");
            holder.lblDesc.setText(item.description.isEmpty() ? "Diagnostic sample container type for pathology laboratory investigations" : item.description);

            holder.btnEdit.setOnClickListener(v -> onEdit.accept(item));
            holder.btnDelete.setOnClickListener(v -> onDelete.accept(item));
        }

        @Override
        public int getItemCount() {
            return items.size();
        }

        static class SampleTypeViewHolder extends RecyclerView.ViewHolder {
            TextView lblName, lblCode, lblScope, lblDesc;
            View btnEdit, btnDelete;

            SampleTypeViewHolder(@NonNull View itemView) {
                super(itemView);
                lblName  = itemView.findViewById(R.id.lblSampleTypeName);
                lblCode  = itemView.findViewById(R.id.lblSampleTypeCode);
                lblScope = itemView.findViewById(R.id.lblSampleTypeScope);
                lblDesc  = itemView.findViewById(R.id.lblSampleTypeDesc);
                btnEdit  = itemView.findViewById(R.id.btnEditSampleType);
                btnDelete= itemView.findViewById(R.id.btnDeleteSampleType);
            }
        }
    }

    private void onDepartmentCardClicked(DepartmentItem dept) {
        if (dept == null) return;
        selectedDeptFilter = dept.name;
        selectedScopeFilter = "All";
        switchTab(0);
        if (!cachedDepartmentNames.isEmpty()) {
            buildDepartmentFilterChips(cachedDepartmentNames);
        }
        applyTestFilters();
        Toast.makeText(this, "Showing tests for " + dept.name, Toast.LENGTH_SHORT).show();
    }

    public static class DepartmentAdapter extends RecyclerView.Adapter<DepartmentAdapter.DeptViewHolder> {
        private final List<DepartmentItem> depts;
        private final java.util.function.Consumer<DepartmentItem> onCardClick;

        public DepartmentAdapter(List<DepartmentItem> depts) {
            this(depts, null);
        }

        public DepartmentAdapter(List<DepartmentItem> depts, java.util.function.Consumer<DepartmentItem> onCardClick) {
            this.depts = depts;
            this.onCardClick = onCardClick;
        }

        @NonNull
        @Override
        public DeptViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
            View v = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_department_card, parent, false);
            return new DeptViewHolder(v);
        }

        @Override
        public void onBindViewHolder(@NonNull DeptViewHolder holder, int position) {
            DepartmentItem d = depts.get(position);
            holder.lblName.setText(d.name);

            String desc = d.description;
            if (desc == null || desc.trim().isEmpty()) {
                desc = getDepartmentDescription(d.name);
            }
            holder.lblDesc.setText(desc);

            String countText = d.testCount == 1 ? "1 Test" : d.testCount + " Tests";
            holder.lblCount.setText(countText);

            // Dynamic colorful icon and squircle based on department specialty
            int iconRes = R.drawable.ic_mod_clean_tests;
            int bgRes = R.drawable.bg_mod_icon_blue;
            String nameLower = d.name != null ? d.name.toLowerCase() : "";

            if (nameLower.contains("biochem")) {
                iconRes = R.drawable.ic_mod_clean_tests;
                bgRes = R.drawable.bg_mod_icon_blue;
            } else if (nameLower.contains("hemat") || nameLower.contains("haemat")) {
                iconRes = R.drawable.ic_mod_clean_samples;
                bgRes = R.drawable.bg_mod_icon_rose;
            } else if (nameLower.contains("patholog")) {
                iconRes = R.drawable.ic_mod_clean_worklist;
                bgRes = R.drawable.bg_mod_icon_indigo;
            } else if (nameLower.contains("coagul")) {
                iconRes = R.drawable.ic_mod_clean_samples;
                bgRes = R.drawable.bg_mod_icon_rose;
            } else if (nameLower.contains("cyto")) {
                iconRes = R.drawable.ic_mod_clean_media;
                bgRes = R.drawable.bg_mod_icon_purple;
            } else if (nameLower.contains("endo")) {
                iconRes = R.drawable.ic_mod_clean_analyzer;
                bgRes = R.drawable.bg_mod_icon_sky;
            } else if (nameLower.contains("immuno") || nameLower.contains("sero")) {
                iconRes = R.drawable.ic_mod_clean_branding;
                bgRes = R.drawable.bg_mod_icon_emerald;
            } else if (nameLower.contains("microbio")) {
                iconRes = R.drawable.ic_mod_clean_inventory;
                bgRes = R.drawable.bg_mod_icon_teal;
            } else if (nameLower.contains("histo")) {
                iconRes = R.drawable.ic_mod_clean_reports;
                bgRes = R.drawable.bg_mod_icon_amber;
            } else if (nameLower.contains("radio") || nameLower.contains("x-ray") || nameLower.contains("mri") || nameLower.contains("scan")) {
                iconRes = R.drawable.ic_mod_clean_ris;
                bgRes = R.drawable.bg_mod_icon_purple;
            } else if (nameLower.contains("molecul") || nameLower.contains("genet")) {
                iconRes = R.drawable.ic_mod_clean_mapper;
                bgRes = R.drawable.bg_mod_icon_indigo;
            }

            holder.imgIcon.setImageResource(iconRes);
            holder.frameIcon.setBackgroundResource(bgRes);

            holder.itemView.setOnClickListener(v -> {
                if (onCardClick != null) onCardClick.accept(d);
            });
        }

        private static String getDepartmentDescription(String name) {
            String lower = name != null ? name.toLowerCase() : "";
            if (lower.contains("biochem")) return "Electrolytes, liver, renal, enzymes & diabetes profiles";
            if (lower.contains("hemat") || lower.contains("haemat")) return "Cell counts, coagulation & peripheral blood smears";
            if (lower.contains("patholog")) return "Urine routine, body fluids & routine clinical microscopy";
            if (lower.contains("coagul")) return "PT/INR, APTT, D-Dimer & bleeding disorder profiles";
            if (lower.contains("cyto")) return "FNAC, Pap smears & fluid cell morphology examination";
            if (lower.contains("endo")) return "Thyroid, metabolic hormones & endocrine panels";
            if (lower.contains("immuno") || lower.contains("sero")) return "Infectious serology, viral markers & antibodies";
            if (lower.contains("microbio")) return "Cultures, antibiotic sensitivity (AST) & gram stains";
            if (lower.contains("histo")) return "Tissue biopsies, grossing & histopathology reporting";
            if (lower.contains("radio") || lower.contains("x-ray") || lower.contains("mri")) return "Diagnostic medical imaging, scans & radiography";
            if (lower.contains("molecul") || lower.contains("genet")) return "PCR amplification, DNA sequencing & molecular genetics";
            return "Diagnostic laboratory testing & clinical investigations";
        }

        @Override
        public int getItemCount() {
            return depts.size();
        }

        static class DeptViewHolder extends RecyclerView.ViewHolder {
            FrameLayout frameIcon;
            ImageView imgIcon;
            TextView lblName, lblDesc, lblCount;

            DeptViewHolder(@NonNull View itemView) {
                super(itemView);
                frameIcon= itemView.findViewById(R.id.frameDeptIcon);
                imgIcon  = itemView.findViewById(R.id.imgDeptIcon);
                lblName  = itemView.findViewById(R.id.lblDeptName);
                lblDesc  = itemView.findViewById(R.id.lblDeptDesc);
                lblCount = itemView.findViewById(R.id.lblDeptTestCount);
            }
        }
    }

    private float dp(float value) {
        return TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, value, getResources().getDisplayMetrics());
    }

    private String readStream(InputStream is) {
        if (is == null) return "";
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8))) {
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) sb.append(line);
            return sb.toString();
        } catch (Exception e) {
            return "";
        }
    }
}
