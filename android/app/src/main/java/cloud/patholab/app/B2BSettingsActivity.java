package cloud.patholab.app;

import android.app.AlertDialog;
import android.graphics.Color;
import android.graphics.Typeface;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.widget.AdapterView;
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
import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

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
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

import cloud.patholab.app.auth.AuthManager;

/**
 * B2BSettingsActivity
 * ─────────────────────────────────────────────────────────────────────────────
 * Dedicated, standalone console for B2B Tier Configuration.
 * 100% web parity with /workspace/settings/b2b-tiers:
 *  - Master Tiers: STANDARD, BRONZE, SILVER, GOLD, PLATINUM
 *  - Global Pricing Rules: B2B Net Price (₹), Discount Margin (%), Discount Flat (₹)
 *  - Catalog test search & autocomplete to add individual tests
 *  - Bulk Action: "Add All Catalog Tests"
 *  - Bulk Action: "Clear All" with confirmation
 *  - Direct two-way sync with /api/workspace/b2b/tiers
 */
public class B2BSettingsActivity extends AppCompatActivity {

    private static final String BASE_URL = "https://app.patholab.cloud";
    private static final String[] TIERS = {"STANDARD", "BRONZE", "SILVER", "GOLD", "PLATINUM"};

    // Header & Views
    private FrameLayout btnB2BSettingsBack;
    private Button btnSaveTierRules;
    private LinearLayout containerTierTabs;

    // Toolbar Views
    private EditText inputSearchAddTest;
    private ImageView btnClearSearchAddTest;
    private RecyclerView recyclerTestSuggestions;
    private Button btnAddAllCatalog;
    private Button btnClearTierRules;
    private TextView lblActiveRulesCount;

    // Main List & States
    private RecyclerView recyclerTierRules;
    private LinearLayout emptyStateTierRules;
    private ProgressBar progressTierRules;

    // State & Data Models
    private String activeTier = "GOLD";
    private final Map<String, List<TierRule>> tierRulesMap = new HashMap<>();
    private final List<CatalogTest> allCatalogTests = new ArrayList<>();
    private final List<CatalogTest> filteredSuggestions = new ArrayList<>();

    private TierRulesAdapter rulesAdapter;
    private TestSuggestionsAdapter suggestionsAdapter;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    public static class TierRule {
        public String id;
        public String testTemplateId;
        public String testName;
        public double basePrice;
        public String ruleType; // "NET_PRICE", "PERCENTAGE", "FIXED"
        public double value;

        public TierRule(String id, String testTemplateId, String testName, double basePrice, String ruleType, double value) {
            this.id = id;
            this.testTemplateId = testTemplateId;
            this.testName = testName;
            this.basePrice = basePrice;
            this.ruleType = ruleType;
            this.value = value;
        }
    }

    public static class CatalogTest {
        public String id;
        public String name;
        public double price;

        public CatalogTest(String id, String name, double price) {
            this.id = id;
            this.name = name;
            this.price = price;
        }
    }

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_b2b_settings);

        for (String tier : TIERS) {
            tierRulesMap.put(tier, new ArrayList<>());
        }

        initViews();
        setupListeners();
        setupAdapters();

        loadTierSettings();
    }

    private void initViews() {
        btnB2BSettingsBack = findViewById(R.id.btnB2BSettingsBack);
        btnSaveTierRules = findViewById(R.id.btnSaveTierRules);
        containerTierTabs = findViewById(R.id.containerTierTabs);

        inputSearchAddTest = findViewById(R.id.inputSearchAddTest);
        btnClearSearchAddTest = findViewById(R.id.btnClearSearchAddTest);
        recyclerTestSuggestions = findViewById(R.id.recyclerTestSuggestions);
        btnAddAllCatalog = findViewById(R.id.btnAddAllCatalog);
        btnClearTierRules = findViewById(R.id.btnClearTierRules);
        lblActiveRulesCount = findViewById(R.id.lblActiveRulesCount);

        recyclerTierRules = findViewById(R.id.recyclerTierRules);
        emptyStateTierRules = findViewById(R.id.emptyStateTierRules);
        progressTierRules = findViewById(R.id.progressTierRules);
    }

    private void setupListeners() {
        btnB2BSettingsBack.setOnClickListener(v -> finish());

        btnSaveTierRules.setOnClickListener(v -> saveCurrentTierRules());

        btnAddAllCatalog.setOnClickListener(v -> handleAddAllCatalog());

        btnClearTierRules.setOnClickListener(v -> handleClearAll());

        btnClearSearchAddTest.setOnClickListener(v -> {
            inputSearchAddTest.setText("");
            recyclerTestSuggestions.setVisibility(View.GONE);
        });

        inputSearchAddTest.addTextChangedListener(new TextWatcher() {
            @Override
            public void beforeTextChanged(CharSequence s, int start, int count, int after) {}

            @Override
            public void onTextChanged(CharSequence s, int start, int before, int count) {
                String query = s.toString().trim();
                btnClearSearchAddTest.setVisibility(query.isEmpty() ? View.GONE : View.VISIBLE);
                filterSuggestions(query);
            }

            @Override
            public void afterTextChanged(Editable s) {}
        });
    }

    private void setupAdapters() {
        suggestionsAdapter = new TestSuggestionsAdapter(filteredSuggestions, test -> {
            addSingleTestToTier(test);
            inputSearchAddTest.setText("");
            recyclerTestSuggestions.setVisibility(View.GONE);
        });
        recyclerTestSuggestions.setLayoutManager(new LinearLayoutManager(this));
        recyclerTestSuggestions.setAdapter(suggestionsAdapter);

        rulesAdapter = new TierRulesAdapter(new ArrayList<>(), this::deleteRule);
        recyclerTierRules.setLayoutManager(new LinearLayoutManager(this));
        recyclerTierRules.setAdapter(rulesAdapter);
    }

    private void renderTabs() {
        containerTierTabs.removeAllViews();

        for (String tier : TIERS) {
            final String currentTier = tier;
            boolean isSelected = tier.equals(activeTier);
            List<TierRule> rules = tierRulesMap.get(tier);
            int count = rules != null ? rules.size() : 0;

            LinearLayout tabView = new LinearLayout(this);
            tabView.setOrientation(LinearLayout.HORIZONTAL);
            tabView.setPadding(dpToPx(14), dpToPx(8), dpToPx(14), dpToPx(8));
            tabView.setBackgroundResource(isSelected ? R.drawable.bg_pill_indigo_soft : R.drawable.bg_card_white);
            tabView.setElevation(isSelected ? dpToPx(2) : dpToPx(1));

            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.WRAP_CONTENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
            );
            lp.setMarginEnd(dpToPx(8));
            tabView.setLayoutParams(lp);

            TextView lblTitle = new TextView(this);
            lblTitle.setText(formatTierName(tier));
            lblTitle.setTextSize(13);
            lblTitle.setTypeface(null, Typeface.BOLD);
            lblTitle.setTextColor(isSelected ? Color.parseColor("#4338CA") : Color.parseColor("#475569"));
            tabView.addView(lblTitle);

            TextView lblBadge = new TextView(this);
            lblBadge.setText(String.valueOf(count));
            lblBadge.setTextSize(11);
            lblBadge.setTypeface(null, Typeface.BOLD);
            lblBadge.setTextColor(isSelected ? Color.parseColor("#4F46E5") : Color.parseColor("#94A3B8"));
            lblBadge.setBackgroundResource(R.drawable.bg_circle_slate);
            lblBadge.setPadding(dpToPx(6), dpToPx(2), dpToPx(6), dpToPx(2));
            LinearLayout.LayoutParams badgeLp = new LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.WRAP_CONTENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
            );
            badgeLp.setMarginStart(dpToPx(6));
            lblBadge.setLayoutParams(badgeLp);
            tabView.addView(lblBadge);

            tabView.setOnClickListener(v -> {
                activeTier = currentTier;
                renderTabs();
                renderRulesList();
            });

            containerTierTabs.addView(tabView);
        }

        btnSaveTierRules.setText(String.format("Save %s", formatTierName(activeTier)));
    }

    private void renderRulesList() {
        List<TierRule> currentRules = tierRulesMap.get(activeTier);
        if (currentRules == null) {
            currentRules = new ArrayList<>();
            tierRulesMap.put(activeTier, currentRules);
        }

        rulesAdapter.updateRules(currentRules);

        int count = currentRules.size();
        lblActiveRulesCount.setText(String.format(Locale.getDefault(), "%d Active Rules", count));

        boolean isEmpty = currentRules.isEmpty();
        emptyStateTierRules.setVisibility(isEmpty ? View.VISIBLE : View.GONE);
        recyclerTierRules.setVisibility(isEmpty ? View.GONE : View.VISIBLE);
        btnClearTierRules.setVisibility(isEmpty ? View.GONE : View.VISIBLE);
    }

    private void filterSuggestions(String query) {
        filteredSuggestions.clear();
        if (query.isEmpty()) {
            recyclerTestSuggestions.setVisibility(View.GONE);
            return;
        }

        List<TierRule> currentRules = tierRulesMap.get(activeTier);
        Set<String> addedTestIds = new HashSet<>();
        if (currentRules != null) {
            for (TierRule r : currentRules) {
                addedTestIds.add(r.testTemplateId);
            }
        }

        String lower = query.toLowerCase(Locale.ROOT);
        for (CatalogTest t : allCatalogTests) {
            if (!addedTestIds.contains(t.id) && t.name.toLowerCase(Locale.ROOT).contains(lower)) {
                filteredSuggestions.add(t);
                if (filteredSuggestions.size() >= 8) break;
            }
        }

        suggestionsAdapter.notifyDataSetChanged();
        recyclerTestSuggestions.setVisibility(filteredSuggestions.isEmpty() ? View.GONE : View.VISIBLE);
    }

    private void addSingleTestToTier(CatalogTest test) {
        List<TierRule> currentRules = tierRulesMap.get(activeTier);
        if (currentRules == null) {
            currentRules = new ArrayList<>();
            tierRulesMap.put(activeTier, currentRules);
        }

        for (TierRule r : currentRules) {
            if (r.testTemplateId.equals(test.id)) {
                Toast.makeText(this, "Test already configured for this tier", Toast.LENGTH_SHORT).show();
                return;
            }
        }

        TierRule newRule = new TierRule(
                null,
                test.id,
                test.name,
                test.price,
                "NET_PRICE",
                test.price
        );
        currentRules.add(0, newRule);
        renderTabs();
        renderRulesList();
        Toast.makeText(this, String.format("Added %s to %s", test.name, formatTierName(activeTier)), Toast.LENGTH_SHORT).show();
    }

    private void handleAddAllCatalog() {
        if (allCatalogTests.isEmpty()) {
            Toast.makeText(this, "No tests available in catalog", Toast.LENGTH_SHORT).show();
            return;
        }

        List<TierRule> currentRules = tierRulesMap.get(activeTier);
        if (currentRules == null) {
            currentRules = new ArrayList<>();
            tierRulesMap.put(activeTier, currentRules);
        }

        Set<String> existingIds = new HashSet<>();
        for (TierRule r : currentRules) {
            existingIds.add(r.testTemplateId);
        }

        int addedCount = 0;
        for (CatalogTest t : allCatalogTests) {
            if (!existingIds.contains(t.id)) {
                currentRules.add(new TierRule(null, t.id, t.name, t.price, "NET_PRICE", t.price));
                addedCount++;
            }
        }

        if (addedCount == 0) {
            Toast.makeText(this, "All catalog tests already added", Toast.LENGTH_SHORT).show();
            return;
        }

        renderTabs();
        renderRulesList();
        Toast.makeText(this, String.format(Locale.getDefault(), "Added %d tests to %s", addedCount, formatTierName(activeTier)), Toast.LENGTH_SHORT).show();
    }

    private void handleClearAll() {
        new AlertDialog.Builder(this)
                .setTitle(String.format("Clear All %s Rules?", formatTierName(activeTier)))
                .setMessage("Are you sure you want to remove all pricing rules for this tier?")
                .setPositiveButton("Clear All", (dialog, which) -> {
                    List<TierRule> currentRules = tierRulesMap.get(activeTier);
                    if (currentRules != null) {
                        currentRules.clear();
                    }
                    renderTabs();
                    renderRulesList();
                    Toast.makeText(this, String.format("Rules cleared for %s", formatTierName(activeTier)), Toast.LENGTH_SHORT).show();
                })
                .setNegativeButton("Cancel", null)
                .show();
    }

    private void deleteRule(TierRule rule) {
        List<TierRule> currentRules = tierRulesMap.get(activeTier);
        if (currentRules != null) {
            currentRules.remove(rule);
            renderTabs();
            renderRulesList();
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Networking & Real-Time Sync
    // ─────────────────────────────────────────────────────────────────────────
    private String getAuthToken() {
        String token = AuthManager.getToken(this);
        if (token != null && !token.isEmpty()) return token;

        try {
            CookieManager cm = CookieManager.getInstance();
            String cookies = cm.getCookie(BASE_URL);
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
        return "";
    }

    private String readStream(InputStream is) throws Exception {
        if (is == null) return "";
        BufferedReader r = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8));
        StringBuilder sb = new StringBuilder();
        String l;
        while ((l = r.readLine()) != null) sb.append(l);
        return sb.toString();
    }

    private void loadTierSettings() {
        progressTierRules.setVisibility(View.VISIBLE);

        new Thread(() -> {
            try {
                String token = getAuthToken();
                URL url = new URL(BASE_URL + "/api/workspace/b2b/tiers");
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("GET");
                conn.setRequestProperty("Authorization", "Bearer " + token);
                conn.setRequestProperty("Cookie", "token=" + token);
                conn.setRequestProperty("Accept", "application/json");
                conn.setConnectTimeout(10000);
                conn.setReadTimeout(15000);

                int code = conn.getResponseCode();
                if (code >= 200 && code < 300) {
                    String jsonStr = readStream(conn.getInputStream());
                    JSONObject json = new JSONObject(jsonStr);

                    // 1. Parse Catalog
                    allCatalogTests.clear();
                    JSONArray catalogArr = json.optJSONArray("catalog");
                    if (catalogArr != null) {
                        for (int i = 0; i < catalogArr.length(); i++) {
                            JSONObject obj = catalogArr.getJSONObject(i);
                            allCatalogTests.add(new CatalogTest(
                                    obj.optString("id"),
                                    obj.optString("name"),
                                    obj.optDouble("price", 0)
                            ));
                        }
                    }

                    // 2. Parse Grouped Rules
                    JSONObject grouped = json.optJSONObject("groupedRules");
                    for (String tier : TIERS) {
                        List<TierRule> list = new ArrayList<>();
                        if (grouped != null && grouped.has(tier)) {
                            JSONArray arr = grouped.optJSONArray(tier);
                            if (arr != null) {
                                for (int i = 0; i < arr.length(); i++) {
                                    JSONObject rObj = arr.getJSONObject(i);
                                    list.add(new TierRule(
                                            rObj.optString("id"),
                                            rObj.optString("testTemplateId"),
                                            rObj.optString("testName"),
                                            rObj.optDouble("basePrice", 0),
                                            rObj.optString("ruleType", "NET_PRICE"),
                                            rObj.optDouble("value", 0)
                                    ));
                                }
                            }
                        }
                        tierRulesMap.put(tier, list);
                    }

                    mainHandler.post(() -> {
                        progressTierRules.setVisibility(View.GONE);
                        renderTabs();
                        renderRulesList();
                    });
                } else {
                    mainHandler.post(() -> {
                        progressTierRules.setVisibility(View.GONE);
                        Toast.makeText(this, "Failed to load tiers (" + code + ")", Toast.LENGTH_SHORT).show();
                        renderTabs();
                        renderRulesList();
                    });
                }
                conn.disconnect();
            } catch (Exception e) {
                mainHandler.post(() -> {
                    progressTierRules.setVisibility(View.GONE);
                    Toast.makeText(this, "Error: " + e.getMessage(), Toast.LENGTH_SHORT).show();
                    renderTabs();
                    renderRulesList();
                });
            }
        }).start();
    }

    private void saveCurrentTierRules() {
        btnSaveTierRules.setEnabled(false);
        btnSaveTierRules.setText("Saving...");

        List<TierRule> currentRules = tierRulesMap.get(activeTier);
        if (currentRules == null) currentRules = new ArrayList<>();

        final List<TierRule> rulesToSave = currentRules;

        new Thread(() -> {
            try {
                JSONObject payload = new JSONObject();
                payload.put("tier", activeTier);

                JSONArray rulesArr = new JSONArray();
                for (TierRule r : rulesToSave) {
                    JSONObject rObj = new JSONObject();
                    rObj.put("testTemplateId", r.testTemplateId);
                    rObj.put("testName", r.testName);
                    rObj.put("basePrice", r.basePrice);
                    rObj.put("ruleType", r.ruleType);
                    rObj.put("value", r.value);
                    rulesArr.put(rObj);
                }
                payload.put("rules", rulesArr);

                String token = getAuthToken();
                URL url = new URL(BASE_URL + "/api/workspace/b2b/tiers");
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("POST");
                conn.setRequestProperty("Authorization", "Bearer " + token);
                conn.setRequestProperty("Cookie", "token=" + token);
                conn.setRequestProperty("Content-Type", "application/json");
                conn.setRequestProperty("Accept", "application/json");
                conn.setDoOutput(true);

                OutputStream os = conn.getOutputStream();
                os.write(payload.toString().getBytes(StandardCharsets.UTF_8));
                os.flush();
                os.close();

                int resCode = conn.getResponseCode();
                mainHandler.post(() -> {
                    btnSaveTierRules.setEnabled(true);
                    btnSaveTierRules.setText(String.format("Save %s", formatTierName(activeTier)));
                    if (resCode >= 200 && resCode < 300) {
                        Toast.makeText(this, String.format("%s tier rules saved successfully!", formatTierName(activeTier)), Toast.LENGTH_SHORT).show();
                    } else {
                        Toast.makeText(this, "Failed to save: " + resCode, Toast.LENGTH_SHORT).show();
                    }
                });
                conn.disconnect();
            } catch (Exception e) {
                mainHandler.post(() -> {
                    btnSaveTierRules.setEnabled(true);
                    btnSaveTierRules.setText(String.format("Save %s", formatTierName(activeTier)));
                    Toast.makeText(this, "Error: " + e.getMessage(), Toast.LENGTH_SHORT).show();
                });
            }
        }).start();
    }

    private String formatTierName(String tier) {
        if (tier == null) return "Standard";
        String lower = tier.toLowerCase(Locale.ROOT);
        return Character.toUpperCase(lower.charAt(0)) + lower.substring(1);
    }

    private int dpToPx(int dp) {
        return (int) (dp * getResources().getDisplayMetrics().density);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Adapters
    // ─────────────────────────────────────────────────────────────────────────
    public static class TierRulesAdapter extends RecyclerView.Adapter<TierRulesAdapter.RuleViewHolder> {
        private final List<TierRule> rules;
        private final OnDeleteListener onDelete;

        public interface OnDeleteListener {
            void onDelete(TierRule rule);
        }

        public TierRulesAdapter(List<TierRule> rules, OnDeleteListener onDelete) {
            this.rules = rules;
            this.onDelete = onDelete;
        }

        public void updateRules(List<TierRule> newRules) {
            this.rules.clear();
            this.rules.addAll(newRules);
            notifyDataSetChanged();
        }

        @NonNull
        @Override
        public RuleViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
            View v = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_b2b_tier_rule, parent, false);
            return new RuleViewHolder(v);
        }

        @Override
        public void onBindViewHolder(@NonNull RuleViewHolder holder, int position) {
            TierRule rule = rules.get(position);
            holder.lblRuleTestName.setText(rule.testName);
            holder.lblRuleBasePrice.setText(String.format(Locale.getDefault(), "Base MRP: ₹%.0f", rule.basePrice));

            ArrayAdapter<String> spinnerAdapter = new ArrayAdapter<>(
                    holder.itemView.getContext(),
                    android.R.layout.simple_spinner_item,
                    new String[]{"B2B Net Price (₹)", "Discount Margin (%)", "Discount Flat (₹)"}
            );
            spinnerAdapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
            holder.spinnerRuleType.setAdapter(spinnerAdapter);

            int selIndex = 0;
            if ("PERCENTAGE".equalsIgnoreCase(rule.ruleType)) selIndex = 1;
            else if ("FIXED".equalsIgnoreCase(rule.ruleType)) selIndex = 2;
            holder.spinnerRuleType.setSelection(selIndex);

            holder.spinnerRuleType.setOnItemSelectedListener(new AdapterView.OnItemSelectedListener() {
                @Override
                public void onItemSelected(AdapterView<?> parent, View view, int pos, long id) {
                    if (pos == 1) {
                        rule.ruleType = "PERCENTAGE";
                        holder.lblRuleValueHeading.setText("DISCOUNT %");
                    } else if (pos == 2) {
                        rule.ruleType = "FIXED";
                        holder.lblRuleValueHeading.setText("DISCOUNT ₹");
                    } else {
                        rule.ruleType = "NET_PRICE";
                        holder.lblRuleValueHeading.setText("NET PRICE ₹");
                    }
                }

                @Override
                public void onNothingSelected(AdapterView<?> parent) {}
            });

            holder.inputRuleValue.setText(String.format(Locale.getDefault(), "%.2f", rule.value));
            holder.inputRuleValue.addTextChangedListener(new TextWatcher() {
                @Override
                public void beforeTextChanged(CharSequence s, int start, int count, int after) {}

                @Override
                public void onTextChanged(CharSequence s, int start, int before, int count) {
                    try {
                        rule.value = Double.parseDouble(s.toString().trim());
                    } catch (Exception ignored) {}
                }

                @Override
                public void afterTextChanged(Editable s) {}
            });

            holder.btnDeleteTierRule.setOnClickListener(v -> onDelete.onDelete(rule));
        }

        @Override
        public int getItemCount() {
            return rules.size();
        }

        static class RuleViewHolder extends RecyclerView.ViewHolder {
            TextView lblRuleTestName, lblRuleBasePrice, lblRuleValueHeading;
            Spinner spinnerRuleType;
            EditText inputRuleValue;
            FrameLayout btnDeleteTierRule;

            public RuleViewHolder(@NonNull View itemView) {
                super(itemView);
                lblRuleTestName = itemView.findViewById(R.id.lblRuleTestName);
                lblRuleBasePrice = itemView.findViewById(R.id.lblRuleBasePrice);
                lblRuleValueHeading = itemView.findViewById(R.id.lblRuleValueHeading);
                spinnerRuleType = itemView.findViewById(R.id.spinnerRuleType);
                inputRuleValue = itemView.findViewById(R.id.inputRuleValue);
                btnDeleteTierRule = itemView.findViewById(R.id.btnDeleteTierRule);
            }
        }
    }

    public static class TestSuggestionsAdapter extends RecyclerView.Adapter<TestSuggestionsAdapter.SuggestionViewHolder> {
        private final List<CatalogTest> tests;
        private final OnSelectListener onSelect;

        public interface OnSelectListener {
            void onSelect(CatalogTest test);
        }

        public TestSuggestionsAdapter(List<CatalogTest> tests, OnSelectListener onSelect) {
            this.tests = tests;
            this.onSelect = onSelect;
        }

        @NonNull
        @Override
        public SuggestionViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
            View v = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_test_suggestion, parent, false);
            return new SuggestionViewHolder(v);
        }

        @Override
        public void onBindViewHolder(@NonNull SuggestionViewHolder holder, int position) {
            CatalogTest test = tests.get(position);
            holder.lblTestName.setText(test.name);
            holder.lblTestPrice.setText(String.format(Locale.getDefault(), "₹%.0f", test.price));
            holder.itemView.setOnClickListener(v -> onSelect.onSelect(test));
        }

        @Override
        public int getItemCount() {
            return tests.size();
        }

        static class SuggestionViewHolder extends RecyclerView.ViewHolder {
            TextView lblTestName, lblTestPrice;

            public SuggestionViewHolder(@NonNull View itemView) {
                super(itemView);
                lblTestName = itemView.findViewById(R.id.lblSuggestionTestName);
                lblTestPrice = itemView.findViewById(R.id.lblSuggestionTestPrice);
            }
        }
    }
}
