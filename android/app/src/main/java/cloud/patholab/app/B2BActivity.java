package cloud.patholab.app;

import android.app.AlertDialog;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.view.animation.Animation;
import android.view.animation.RotateAnimation;
import android.webkit.CookieManager;
import android.widget.Button;
import android.widget.CheckBox;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
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
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

import cloud.patholab.app.auth.AuthManager;

/**
 * B2BActivity
 * ─────────────────────────────────────────────────────────────────────────────
 * Native Corporate Agencies and B2B Partner Portal Console.
 * Full feature parity with web (/workspace/agencies & /workspace/settings/b2b-tiers):
 *  - 4 Real-time KPIs: Partner Agencies, Total Volume, Billed Volume, Pending Payout
 *  - Search Omnibar & Tier Filter Chips (All, Standard, Tier 1, Tier 2, Tier 3)
 *  - Agency Card with tier badge, commission rate, portal active badge, and financial breakdown
 *  - Quick Call & WhatsApp launch
 *  - Ledger & referral transactions bottom sheet
 *  - Add & Edit Agency bottom sheet with portal account provisioning
 *  - B2B Pricing Tiers Configuration modal sheet
 *  - Delete Agency with confirmation dialog
 */
public class B2BActivity extends AppCompatActivity {

    private static final String BASE_URL = "https://app.patholab.cloud";

    // Header Views
    private FrameLayout btnB2BBack;
    private FrameLayout btnExportAgencies;
    private FrameLayout btnB2BTiersSettings;
    private FrameLayout btnRefreshAgencies;
    private ImageView imgRefreshAgenciesIcon;

    // 4 KPI Views
    private TextView lblKpiTotalAgencies;
    private TextView lblKpiTotalVolume;
    private TextView lblKpiBilledVolume;
    private TextView lblKpiPendingPayout;

    // Search & Filter
    private EditText inputSearchAgencies;
    private ImageView btnClearSearchAgencies;
    private LinearLayout containerAgencyFilterChips;
    private ProgressBar progressAgencies;

    // List & Empty State
    private RecyclerView recyclerAgencies;
    private LinearLayout emptyStateAgencies;
    private Button btnEmptyAddAgency;
    private ExtendedFloatingActionButton fabAddAgency;

    // Adapter & Data
    private AgenciesAdapter agenciesAdapter;
    private final List<JSONObject> allAgencies = new ArrayList<>();
    private final List<JSONObject> filteredAgencies = new ArrayList<>();

    // State
    private String currentTierFilter = "ALL";
    private String currentSearchQuery = "";
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_b2b);

        initViews();
        setupListeners();
        setupFilterChips();
        setupRecyclerView();

        loadAgenciesData(false);
    }

    private void initViews() {
        btnB2BBack = findViewById(R.id.btnB2BBack);
        btnExportAgencies = findViewById(R.id.btnExportAgencies);
        btnB2BTiersSettings = findViewById(R.id.btnB2BTiersSettings);
        btnRefreshAgencies = findViewById(R.id.btnRefreshAgencies);
        imgRefreshAgenciesIcon = findViewById(R.id.imgRefreshAgenciesIcon);

        lblKpiTotalAgencies = findViewById(R.id.lblKpiTotalAgencies);
        lblKpiTotalVolume = findViewById(R.id.lblKpiTotalVolume);
        lblKpiBilledVolume = findViewById(R.id.lblKpiBilledVolume);
        lblKpiPendingPayout = findViewById(R.id.lblKpiPendingPayout);

        inputSearchAgencies = findViewById(R.id.inputSearchAgencies);
        btnClearSearchAgencies = findViewById(R.id.btnClearSearchAgencies);
        containerAgencyFilterChips = findViewById(R.id.containerAgencyFilterChips);
        progressAgencies = findViewById(R.id.progressAgencies);

        recyclerAgencies = findViewById(R.id.recyclerAgencies);
        emptyStateAgencies = findViewById(R.id.emptyStateAgencies);
        btnEmptyAddAgency = findViewById(R.id.btnEmptyAddAgency);
        fabAddAgency = findViewById(R.id.fabAddAgency);
    }

    private void setupListeners() {
        btnB2BBack.setOnClickListener(v -> finish());

        btnExportAgencies.setOnClickListener(v -> shareAgenciesReport());

        if (btnB2BTiersSettings != null) {
            btnB2BTiersSettings.setOnClickListener(v -> {
                Intent intent = new Intent(this, B2BSettingsActivity.class);
                startActivity(intent);
            });
        }

        btnRefreshAgencies.setOnClickListener(v -> {
            animateRefreshIcon();
            loadAgenciesData(true);
        });

        fabAddAgency.setOnClickListener(v -> showAddEditAgencySheet(null));
        btnEmptyAddAgency.setOnClickListener(v -> showAddEditAgencySheet(null));

        inputSearchAgencies.addTextChangedListener(new TextWatcher() {
            @Override
            public void beforeTextChanged(CharSequence s, int start, int count, int after) {}

            @Override
            public void onTextChanged(CharSequence s, int start, int before, int count) {
                currentSearchQuery = s.toString().trim().toLowerCase();
                btnClearSearchAgencies.setVisibility(currentSearchQuery.isEmpty() ? View.GONE : View.VISIBLE);
                applyFilterAndSearch();
            }

            @Override
            public void afterTextChanged(Editable s) {}
        });

        btnClearSearchAgencies.setOnClickListener(v -> {
            inputSearchAgencies.setText("");
            currentSearchQuery = "";
            applyFilterAndSearch();
        });
    }

    private void setupFilterChips() {
        containerAgencyFilterChips.removeAllViews();
        String[] filters = {"ALL", "STANDARD", "BRONZE", "SILVER", "GOLD", "PLATINUM"};
        String[] titles = {"All Partners", "Standard", "Bronze", "Silver", "Gold", "Platinum"};

        for (int i = 0; i < filters.length; i++) {
            final String filterKey = filters[i];
            final String title = titles[i];

            TextView chip = new TextView(this);
            chip.setText(title);
            chip.setTextSize(12f);
            chip.setPadding(dpToPx(13), dpToPx(7), dpToPx(13), dpToPx(7));

            LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
                    ViewGroup.LayoutParams.WRAP_CONTENT, dpToPx(34));
            params.setMarginEnd(dpToPx(6));
            chip.setLayoutParams(params);

            updateChipStyle(chip, filterKey.equals(currentTierFilter));

            chip.setOnClickListener(v -> {
                currentTierFilter = filterKey;
                for (int c = 0; c < containerAgencyFilterChips.getChildCount(); c++) {
                    View child = containerAgencyFilterChips.getChildAt(c);
                    if (child instanceof TextView) {
                        updateChipStyle((TextView) child, false);
                    }
                }
                updateChipStyle(chip, true);
                applyFilterAndSearch();
            });

            containerAgencyFilterChips.addView(chip);
        }
    }

    private void updateChipStyle(TextView chip, boolean isSelected) {
        if (isSelected) {
            chip.setBackgroundResource(R.drawable.bg_chip_active);
            chip.setTextColor(0xFFFFFFFF);
            chip.setTypeface(null, android.graphics.Typeface.BOLD);
        } else {
            chip.setBackgroundResource(R.drawable.bg_chip_inactive);
            chip.setTextColor(0xFF64748B);
            chip.setTypeface(null, android.graphics.Typeface.NORMAL);
        }
    }

    private void setupRecyclerView() {
        agenciesAdapter = new AgenciesAdapter(filteredAgencies, new AgencyActionListener() {
            @Override
            public void onCall(String phone) {
                if (phone == null || phone.isEmpty()) {
                    Toast.makeText(B2BActivity.this, "No phone number available", Toast.LENGTH_SHORT).show();
                    return;
                }
                try {
                    Intent dial = new Intent(Intent.ACTION_DIAL, Uri.parse("tel:" + phone));
                    startActivity(dial);
                } catch (Exception e) {
                    Toast.makeText(B2BActivity.this, "Unable to open phone dialer", Toast.LENGTH_SHORT).show();
                }
            }

            @Override
            public void onWhatsApp(String phone, String name) {
                if (phone == null || phone.isEmpty()) {
                    Toast.makeText(B2BActivity.this, "No phone number available", Toast.LENGTH_SHORT).show();
                    return;
                }
                try {
                    String cleanPhone = phone.replaceAll("[^0-9]", "");
                    if (cleanPhone.length() == 10) cleanPhone = "91" + cleanPhone;
                    String message = Uri.encode("Hello " + name + ", greetings from PathoLab Diagnostics B2B division.");
                    Intent wa = new Intent(Intent.ACTION_VIEW, Uri.parse("https://api.whatsapp.com/send?phone=" + cleanPhone + "&text=" + message));
                    startActivity(wa);
                } catch (Exception e) {
                    Toast.makeText(B2BActivity.this, "WhatsApp is not installed", Toast.LENGTH_SHORT).show();
                }
            }

            @Override
            public void onLedger(JSONObject agency) {
                showAgencyLedgerSheet(agency);
            }

            @Override
            public void onEdit(JSONObject agency) {
                showAddEditAgencySheet(agency);
            }

            @Override
            public void onDelete(JSONObject agency) {
                confirmDeleteAgency(agency);
            }
        });

        recyclerAgencies.setLayoutManager(new LinearLayoutManager(this));
        recyclerAgencies.setAdapter(agenciesAdapter);
    }

    private void animateRefreshIcon() {
        if (imgRefreshAgenciesIcon == null) return;
        RotateAnimation rotate = new RotateAnimation(0, 360,
                Animation.RELATIVE_TO_SELF, 0.5f, Animation.RELATIVE_TO_SELF, 0.5f);
        rotate.setDuration(600);
        rotate.setRepeatCount(1);
        imgRefreshAgenciesIcon.startAnimation(rotate);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  DATA FETCHING & FILTERING
    // ─────────────────────────────────────────────────────────────────────────
    private void loadAgenciesData(boolean isManualRefresh) {
        progressAgencies.setVisibility(View.VISIBLE);

        new Thread(() -> {
            try {
                String token = getAuthToken();
                URL url = new URL(BASE_URL + "/api/workspace/b2b/agencies");
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("GET");
                conn.setRequestProperty("Authorization", "Bearer " + token);
                conn.setRequestProperty("Cookie", "token=" + token + "; auth-token=" + token + "; auth_token=" + token);
                conn.setRequestProperty("Accept", "application/json");
                conn.setConnectTimeout(10000);
                conn.setReadTimeout(15000);

                int code = conn.getResponseCode();
                if (code >= 200 && code < 300) {
                    String json = readStream(conn.getInputStream());
                    JSONObject response = new JSONObject(json);

                    JSONArray agenciesArr = response.optJSONArray("agencies");
                    JSONObject kpis = response.optJSONObject("kpis");
                    if (kpis == null) kpis = response.optJSONObject("stats");

                    final List<JSONObject> list = new ArrayList<>();
                    if (agenciesArr != null) {
                        for (int i = 0; i < agenciesArr.length(); i++) {
                            list.add(agenciesArr.getJSONObject(i));
                        }
                    }

                    final JSONObject finalKpis = kpis;
                    mainHandler.post(() -> {
                        progressAgencies.setVisibility(View.GONE);
                        allAgencies.clear();
                        allAgencies.addAll(list);

                        updateKpis(finalKpis, list);
                        applyFilterAndSearch();

                        if (isManualRefresh) {
                            Toast.makeText(this, "Agencies synchronized", Toast.LENGTH_SHORT).show();
                        }
                    });
                } else {
                    mainHandler.post(() -> {
                        progressAgencies.setVisibility(View.GONE);
                        Toast.makeText(this, "Failed to load agencies (" + code + ")", Toast.LENGTH_SHORT).show();
                    });
                }
                conn.disconnect();
            } catch (Exception e) {
                mainHandler.post(() -> {
                    progressAgencies.setVisibility(View.GONE);
                    Toast.makeText(this, "Network error: " + e.getMessage(), Toast.LENGTH_SHORT).show();
                });
            }
        }).start();
    }

    private void updateKpis(JSONObject kpis, List<JSONObject> fallbackList) {
        int count = 0;
        int volume = 0;
        double billed = 0.0;
        double pending = 0.0;

        if (kpis != null) {
            count = kpis.optInt("totalAgencies", fallbackList.size());
            volume = kpis.optInt("totalReferrals", kpis.optInt("totalVolume", 0));
            billed = kpis.optDouble("totalCommission", kpis.optDouble("totalBilled", 0.0));
            pending = kpis.optDouble("pendingCommission", kpis.optDouble("pendingPayout", 0.0));
        }

        if (count == 0 && volume == 0 && billed == 0 && pending == 0) {
            count = fallbackList.size();
            for (JSONObject a : fallbackList) {
                volume += a.optInt("totalReferrals", 0);
                billed += a.optDouble("totalCommission", 0.0);
                pending += a.optDouble("pendingCommission", 0.0);
            }
        }

        lblKpiTotalAgencies.setText(String.valueOf(count));
        lblKpiTotalVolume.setText(String.valueOf(volume));
        lblKpiBilledVolume.setText("₹" + String.format(Locale.getDefault(), "%,.0f", billed));
        lblKpiPendingPayout.setText("₹" + String.format(Locale.getDefault(), "%,.0f", pending));
    }

    private void applyFilterAndSearch() {
        filteredAgencies.clear();

        for (JSONObject agency : allAgencies) {
            String tier = agency.optString("agencyTier", "STANDARD");
            boolean matchesTier = currentTierFilter.equals("ALL") || tier.equalsIgnoreCase(currentTierFilter);

            String name = agency.optString("agencyName", "").toLowerCase();
            String contact = agency.optString("contactPerson", "").toLowerCase();
            String phone = agency.optString("phone", "").toLowerCase();
            String email = agency.optString("email", "").toLowerCase();

            boolean matchesSearch = currentSearchQuery.isEmpty()
                    || name.contains(currentSearchQuery)
                    || contact.contains(currentSearchQuery)
                    || phone.contains(currentSearchQuery)
                    || email.contains(currentSearchQuery)
                    || tier.toLowerCase().contains(currentSearchQuery);

            if (matchesTier && matchesSearch) {
                filteredAgencies.add(agency);
            }
        }

        agenciesAdapter.notifyDataSetChanged();
        emptyStateAgencies.setVisibility(filteredAgencies.isEmpty() ? View.VISIBLE : View.GONE);
        recyclerAgencies.setVisibility(filteredAgencies.isEmpty() ? View.GONE : View.VISIBLE);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  ADD / EDIT AGENCY BOTTOM SHEET
    // ─────────────────────────────────────────────────────────────────────────
    private void showAddEditAgencySheet(@Nullable JSONObject agencyToEdit) {
        BottomSheetDialog sheet = new BottomSheetDialog(this);
        View view = LayoutInflater.from(this).inflate(R.layout.layout_add_agency_sheet, null);
        sheet.setContentView(view);

        TextView lblTitle = view.findViewById(R.id.lblAddAgencyTitle);
        TextView lblSubtitle = view.findViewById(R.id.lblAddAgencySubtitle);
        ImageView btnClose = view.findViewById(R.id.btnAddAgencyClose);

        EditText inputName = view.findViewById(R.id.inputAgencyName);
        EditText inputContact = view.findViewById(R.id.inputAgencyContactPerson);
        EditText inputPhone = view.findViewById(R.id.inputAgencyPhone);
        EditText inputPan = view.findViewById(R.id.inputAgencyPan);
        EditText inputEmail = view.findViewById(R.id.inputAgencyEmail);

        TextView chipStandard = view.findViewById(R.id.chipTierStandard);
        TextView chipSilver = view.findViewById(R.id.chipTierSilver);
        TextView chipGold = view.findViewById(R.id.chipTierGold);
        TextView chipPlatinum = view.findViewById(R.id.chipTierPlatinum);

        EditText inputCommissionRate = view.findViewById(R.id.inputAgencyCommissionRate);
        LinearLayout btnToggleCommissionType = view.findViewById(R.id.btnToggleCommissionType);
        TextView lblCommissionType = view.findViewById(R.id.lblCommissionType);

        LinearLayout layoutPortalToggle = view.findViewById(R.id.layoutPortalToggle);
        CheckBox chkCreatePortalAccount = view.findViewById(R.id.chkCreatePortalAccount);
        EditText inputPortalPassword = view.findViewById(R.id.inputPortalPassword);

        TextView lblError = view.findViewById(R.id.lblAgencyFormError);
        Button btnSave = view.findViewById(R.id.btnSaveAgency);
        ProgressBar progressSaving = view.findViewById(R.id.progressAgencySaving);

        final String[] selectedTier = {"STANDARD"};
        final String[] selectedCommType = {"PERCENTAGE"};

        Runnable updateTierChips = () -> {
            chipStandard.setBackgroundResource(selectedTier[0].equals("STANDARD") ? R.drawable.bg_chip_active : R.drawable.bg_chip_inactive);
            chipStandard.setTextColor(selectedTier[0].equals("STANDARD") ? 0xFFFFFFFF : 0xFF64748B);

            chipSilver.setBackgroundResource((selectedTier[0].equals("SILVER") || selectedTier[0].equals("TIER_1")) ? R.drawable.bg_chip_active : R.drawable.bg_chip_inactive);
            chipSilver.setTextColor((selectedTier[0].equals("SILVER") || selectedTier[0].equals("TIER_1")) ? 0xFFFFFFFF : 0xFF64748B);

            chipGold.setBackgroundResource((selectedTier[0].equals("GOLD") || selectedTier[0].equals("TIER_2")) ? R.drawable.bg_chip_active : R.drawable.bg_chip_inactive);
            chipGold.setTextColor((selectedTier[0].equals("GOLD") || selectedTier[0].equals("TIER_2")) ? 0xFFFFFFFF : 0xFF64748B);

            chipPlatinum.setBackgroundResource((selectedTier[0].equals("PLATINUM") || selectedTier[0].equals("TIER_3")) ? R.drawable.bg_chip_active : R.drawable.bg_chip_inactive);
            chipPlatinum.setTextColor((selectedTier[0].equals("PLATINUM") || selectedTier[0].equals("TIER_3")) ? 0xFFFFFFFF : 0xFF64748B);
        };

        chipStandard.setOnClickListener(v -> { selectedTier[0] = "STANDARD"; updateTierChips.run(); });
        chipSilver.setOnClickListener(v -> { selectedTier[0] = "SILVER"; updateTierChips.run(); });
        chipGold.setOnClickListener(v -> { selectedTier[0] = "GOLD"; updateTierChips.run(); });
        chipPlatinum.setOnClickListener(v -> { selectedTier[0] = "PLATINUM"; updateTierChips.run(); });

        btnToggleCommissionType.setOnClickListener(v -> {
            if (selectedCommType[0].equals("PERCENTAGE")) {
                selectedCommType[0] = "FIXED";
                lblCommissionType.setText("₹ Fixed Amt");
                lblCommissionType.setTextColor(0xFF059669);
            } else {
                selectedCommType[0] = "PERCENTAGE";
                lblCommissionType.setText("% Percentage");
                lblCommissionType.setTextColor(0xFF2563EB);
            }
        });

        chkCreatePortalAccount.setOnCheckedChangeListener((btn, isChecked) -> {
            inputPortalPassword.setVisibility(isChecked ? View.VISIBLE : View.GONE);
        });

        boolean isEdit = agencyToEdit != null;
        if (isEdit) {
            lblTitle.setText("Edit Corporate Agency");
            lblSubtitle.setText("Update agency details, contracts and tier levels");
            btnSave.setText("Update Agency");

            inputName.setText(agencyToEdit.optString("agencyName", ""));
            inputContact.setText(agencyToEdit.optString("contactPerson", ""));
            inputPhone.setText(agencyToEdit.optString("phone", ""));
            inputPan.setText(agencyToEdit.optString("panNumber", ""));
            inputEmail.setText(agencyToEdit.optString("email", ""));

            selectedTier[0] = agencyToEdit.optString("agencyTier", "STANDARD");
            updateTierChips.run();

            double rate = agencyToEdit.optDouble("commissionRate", 10.0);
            inputCommissionRate.setText(String.valueOf(rate));

            selectedCommType[0] = agencyToEdit.optString("commissionType", "PERCENTAGE");
            if (selectedCommType[0].equalsIgnoreCase("FIXED")) {
                lblCommissionType.setText("₹ Fixed Amt");
                lblCommissionType.setTextColor(0xFF059669);
            } else {
                lblCommissionType.setText("% Percentage");
                lblCommissionType.setTextColor(0xFF2563EB);
            }

            // If already has user portal account, hide or disable creation toggle
            boolean hasPortal = agencyToEdit.has("user") && !agencyToEdit.isNull("user");
            if (hasPortal) {
                layoutPortalToggle.setVisibility(View.GONE);
                inputPortalPassword.setVisibility(View.GONE);
            }
        } else {
            updateTierChips.run();
        }

        btnClose.setOnClickListener(v -> sheet.dismiss());

        btnSave.setOnClickListener(v -> {
            String name = inputName.getText().toString().trim();
            String contact = inputContact.getText().toString().trim();
            String phone = inputPhone.getText().toString().trim();
            String pan = inputPan.getText().toString().trim();
            String email = inputEmail.getText().toString().trim();
            String rateStr = inputCommissionRate.getText().toString().trim();

            if (name.isEmpty() || contact.isEmpty() || phone.isEmpty() || rateStr.isEmpty()) {
                lblError.setText("Please fill all required fields marked with *");
                lblError.setVisibility(View.VISIBLE);
                return;
            }

            double commRate;
            try {
                commRate = Double.parseDouble(rateStr);
            } catch (Exception e) {
                lblError.setText("Please enter a valid numeric commission rate.");
                lblError.setVisibility(View.VISIBLE);
                return;
            }

            boolean createPortal = chkCreatePortalAccount.isChecked();
            String portalPass = inputPortalPassword.getText().toString().trim();
            if (createPortal && portalPass.length() < 6) {
                lblError.setText("Portal password must be at least 6 characters.");
                lblError.setVisibility(View.VISIBLE);
                return;
            }

            lblError.setVisibility(View.GONE);
            btnSave.setEnabled(false);
            btnSave.setText("");
            progressSaving.setVisibility(View.VISIBLE);

            new Thread(() -> {
                try {
                    String token = getAuthToken();
                    URL url = new URL(BASE_URL + "/api/workspace/b2b/agencies");
                    HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                    conn.setRequestMethod(isEdit ? "PATCH" : "POST");
                    conn.setRequestProperty("Authorization", "Bearer " + token);
                    conn.setRequestProperty("Cookie", "token=" + token + "; auth-token=" + token + "; auth_token=" + token);
                    conn.setRequestProperty("Content-Type", "application/json");
                    conn.setRequestProperty("Accept", "application/json");
                    conn.setDoOutput(true);

                    JSONObject payload = new JSONObject();
                    if (isEdit) {
                        payload.put("id", agencyToEdit.optString("id"));
                        payload.put("isActive", agencyToEdit.optBoolean("isActive", true));
                    }
                    payload.put("agencyName", name);
                    payload.put("contactPerson", contact);
                    payload.put("phone", phone);
                    payload.put("panNumber", pan);
                    payload.put("email", email);
                    payload.put("agencyTier", selectedTier[0]);
                    payload.put("commissionRate", commRate);
                    payload.put("commissionType", selectedCommType[0]);
                    if (!isEdit && createPortal) {
                        payload.put("createLogin", true);
                        payload.put("loginEmail", email);
                        payload.put("loginPassword", portalPass);
                    } else if (isEdit && !portalPass.isEmpty()) {
                        payload.put("resetPassword", portalPass);
                    }

                    OutputStream os = conn.getOutputStream();
                    os.write(payload.toString().getBytes(StandardCharsets.UTF_8));
                    os.flush();
                    os.close();

                    int resCode = conn.getResponseCode();
                    if (resCode >= 200 && resCode < 300) {
                        mainHandler.post(() -> {
                            sheet.dismiss();
                            Toast.makeText(this, isEdit ? "Agency updated successfully!" : "Corporate agency created!", Toast.LENGTH_SHORT).show();
                            loadAgenciesData(false);
                        });
                    } else {
                        String errStr = readStream(conn.getErrorStream());
                        mainHandler.post(() -> {
                            btnSave.setEnabled(true);
                            btnSave.setText(isEdit ? "Update Agency" : "Save Corporate Agency");
                            progressSaving.setVisibility(View.GONE);
                            lblError.setText("Failed (" + resCode + "): " + errStr);
                            lblError.setVisibility(View.VISIBLE);
                        });
                    }
                    conn.disconnect();
                } catch (Exception e) {
                    mainHandler.post(() -> {
                        btnSave.setEnabled(true);
                        btnSave.setText(isEdit ? "Update Agency" : "Save Corporate Agency");
                        progressSaving.setVisibility(View.GONE);
                        lblError.setText("Error: " + e.getMessage());
                        lblError.setVisibility(View.VISIBLE);
                    });
                }
            }).start();
        });

        sheet.show();
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  AGENCY LEDGER BOTTOM SHEET
    // ─────────────────────────────────────────────────────────────────────────
    private void showAgencyLedgerSheet(JSONObject agency) {
        BottomSheetDialog sheet = new BottomSheetDialog(this);
        View view = LayoutInflater.from(this).inflate(R.layout.layout_agency_ledger_sheet, null);
        sheet.setContentView(view);

        TextView lblAgencyName = view.findViewById(R.id.lblLedgerAgencyName);
        ImageView btnClose = view.findViewById(R.id.btnLedgerClose);
        TextView lblEarned = view.findViewById(R.id.lblLedgerTotalEarned);
        TextView lblPaid = view.findViewById(R.id.lblLedgerPaidOut);
        TextView lblDue = view.findViewById(R.id.lblLedgerBalanceDue);
        RecyclerView recycler = view.findViewById(R.id.recyclerAgencyLedger);
        TextView lblEmpty = view.findViewById(R.id.lblEmptyLedger);

        lblAgencyName.setText(agency.optString("agencyName", "Agency") + " Ledger");
        btnClose.setOnClickListener(v -> sheet.dismiss());

        double earned = agency.optDouble("totalCommission", 0.0);
        double due = agency.optDouble("pendingCommission", 0.0);
        double paid = agency.optDouble("paidCommission", Math.max(0, earned - due));

        lblEarned.setText("₹" + String.format(Locale.getDefault(), "%,.0f", earned));
        lblPaid.setText("₹" + String.format(Locale.getDefault(), "%,.0f", paid));
        lblDue.setText("₹" + String.format(Locale.getDefault(), "%,.0f", due));

        JSONArray commsArr = agency.optJSONArray("commissions");
        List<JSONObject> ledgerList = new ArrayList<>();
        if (commsArr != null) {
            for (int i = 0; i < commsArr.length(); i++) {
                ledgerList.add(commsArr.optJSONObject(i));
            }
        }

        if (ledgerList.isEmpty()) {
            lblEmpty.setVisibility(View.VISIBLE);
            recycler.setVisibility(View.GONE);
        } else {
            lblEmpty.setVisibility(View.GONE);
            recycler.setVisibility(View.VISIBLE);
            recycler.setLayoutManager(new LinearLayoutManager(this));
            recycler.setAdapter(new LedgerAdapter(ledgerList));
        }

        sheet.show();
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  EXPORT AGENCIES REPORT (WEB PARITY)
    // ─────────────────────────────────────────────────────────────────────────
    private void shareAgenciesReport() {
        if (allAgencies.isEmpty()) {
            Toast.makeText(this, "No agencies to export", Toast.LENGTH_SHORT).show();
            return;
        }

        StringBuilder sb = new StringBuilder();
        sb.append("PathoLab B2B Corporate Agencies Report\n");
        sb.append("Generated on: ").append(new java.text.SimpleDateFormat("dd MMM yyyy", Locale.getDefault()).format(new java.util.Date())).append("\n\n");

        for (int i = 0; i < allAgencies.size(); i++) {
            JSONObject a = allAgencies.get(i);
            sb.append(i + 1).append(". ").append(a.optString("agencyName", "Unnamed")).append("\n");
            sb.append("   • Tier: ").append(a.optString("agencyTier", "Standard")).append("\n");
            sb.append("   • Contact: ").append(a.optString("contactPerson", "-")).append(" (").append(a.optString("phone", "-")).append(")\n");
            sb.append("   • Margin: ").append(a.optDouble("commissionRate", 0)).append(" ")
              .append(a.optString("commissionType", "PERCENTAGE").equalsIgnoreCase("PERCENTAGE") ? "%" : "Flat ₹").append("\n");
            sb.append("   • Referrals: ").append(a.optInt("totalReferrals", 0)).append(" tests\n");
            sb.append("   • Lifetime Commission: ₹").append(String.format(Locale.getDefault(), "%,.2f", a.optDouble("totalCommission", 0))).append("\n\n");
        }

        Intent sendIntent = new Intent(Intent.ACTION_SEND);
        sendIntent.setType("text/plain");
        sendIntent.putExtra(Intent.EXTRA_SUBJECT, "B2B Agencies Report");
        sendIntent.putExtra(Intent.EXTRA_TEXT, sb.toString());
        startActivity(Intent.createChooser(sendIntent, "Export B2B Agencies Report"));
    }

    private double parseDouble(String s, double def) {
        try {
            return Double.parseDouble(s);
        } catch (Exception e) {
            return def;
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  DELETE AGENCY
    // ─────────────────────────────────────────────────────────────────────────
    private void confirmDeleteAgency(JSONObject agency) {
        String name = agency.optString("agencyName", "this agency");
        String id = agency.optString("id");

        new AlertDialog.Builder(this)
                .setTitle("Delete Agency")
                .setMessage("Are you sure you want to remove " + name + "? This will unlink portal logins and archive past commission contracts.")
                .setPositiveButton("Delete", (dialog, which) -> deleteAgency(id))
                .setNegativeButton("Cancel", null)
                .show();
    }

    private void deleteAgency(String id) {
        progressAgencies.setVisibility(View.VISIBLE);

        new Thread(() -> {
            try {
                String token = getAuthToken();
                URL url = new URL(BASE_URL + "/api/workspace/b2b/agencies?id=" + id);
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("DELETE");
                conn.setRequestProperty("Authorization", "Bearer " + token);
                conn.setRequestProperty("Cookie", "token=" + token + "; auth-token=" + token + "; auth_token=" + token);
                conn.setConnectTimeout(10000);
                conn.setRequestProperty("Accept", "application/json");

                int resCode = conn.getResponseCode();
                mainHandler.post(() -> {
                    progressAgencies.setVisibility(View.GONE);
                    if (resCode >= 200 && resCode < 300) {
                        Toast.makeText(this, "Agency removed successfully", Toast.LENGTH_SHORT).show();
                        loadAgenciesData(false);
                    } else {
                        Toast.makeText(this, "Failed to delete agency (" + resCode + ")", Toast.LENGTH_SHORT).show();
                    }
                });
                conn.disconnect();
            } catch (Exception e) {
                mainHandler.post(() -> {
                    progressAgencies.setVisibility(View.GONE);
                    Toast.makeText(this, "Network error: " + e.getMessage(), Toast.LENGTH_SHORT).show();
                });
            }
        }).start();
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  HELPERS & ADAPTERS
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
                    if (trimmed.startsWith("token=") || trimmed.startsWith("auth-token=") || trimmed.startsWith("auth_token=")) {
                        String cookieToken = trimmed.substring(trimmed.indexOf('=') + 1).trim();
                        if (!cookieToken.isEmpty()) {
                            AuthManager.saveToken(this, cookieToken);
                            return cookieToken;
                        }
                    }
                }
            }
        } catch (Exception ignored) {}

        SharedPreferences prefs = getSharedPreferences("patholab_prefs", Context.MODE_PRIVATE);
        return prefs.getString("auth_token", "");
    }

    private String readStream(InputStream is) throws Exception {
        if (is == null) return "";
        BufferedReader r = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8));
        StringBuilder sb = new StringBuilder();
        String l;
        while ((l = r.readLine()) != null) sb.append(l);
        return sb.toString();
    }

    private int dpToPx(int dp) {
        float density = getResources().getDisplayMetrics().density;
        return Math.round((float) dp * density);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  RECYCLERVIEW ADAPTER FOR AGENCIES
    // ─────────────────────────────────────────────────────────────────────────
    interface AgencyActionListener {
        void onCall(String phone);
        void onWhatsApp(String phone, String name);
        void onLedger(JSONObject agency);
        void onEdit(JSONObject agency);
        void onDelete(JSONObject agency);
    }

    class AgenciesAdapter extends RecyclerView.Adapter<AgenciesAdapter.AgencyViewHolder> {

        private final List<JSONObject> items;
        private final AgencyActionListener listener;

        AgenciesAdapter(List<JSONObject> items, AgencyActionListener listener) {
            this.items = items;
            this.listener = listener;
        }

        @NonNull
        @Override
        public AgencyViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
            View v = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_agency_card, parent, false);
            return new AgencyViewHolder(v);
        }

        @Override
        public void onBindViewHolder(@NonNull AgencyViewHolder holder, int position) {
            JSONObject agency = items.get(position);
            holder.bind(agency, listener);
        }

        @Override
        public int getItemCount() {
            return items.size();
        }

        class AgencyViewHolder extends RecyclerView.ViewHolder {

            private final TextView lblAgencyTierBadge;
            private final TextView lblAgencyPortalBadge;
            private final TextView lblAgencyCommissionRate;
            private final TextView lblAgencyName;
            private final TextView lblAgencyContactPerson;
            private final TextView lblAgencyEmail;
            private final TextView lblAgencyPan;
            private final TextView lblAgencyTestsCount;
            private final TextView lblAgencyBilledVolume;
            private final TextView lblAgencyPendingPayout;

            private final FrameLayout btnAgencyCall;
            private final FrameLayout btnAgencyWhatsApp;
            private final LinearLayout btnAgencyLedger;
            private final FrameLayout btnAgencyEdit;
            private final FrameLayout btnAgencyDelete;

            AgencyViewHolder(@NonNull View v) {
                super(v);
                lblAgencyTierBadge = v.findViewById(R.id.lblAgencyTierBadge);
                lblAgencyPortalBadge = v.findViewById(R.id.lblAgencyPortalBadge);
                lblAgencyCommissionRate = v.findViewById(R.id.lblAgencyCommissionRate);
                lblAgencyName = v.findViewById(R.id.lblAgencyName);
                lblAgencyContactPerson = v.findViewById(R.id.lblAgencyContactPerson);
                lblAgencyEmail = v.findViewById(R.id.lblAgencyEmail);
                lblAgencyPan = v.findViewById(R.id.lblAgencyPan);
                lblAgencyTestsCount = v.findViewById(R.id.lblAgencyTestsCount);
                lblAgencyBilledVolume = v.findViewById(R.id.lblAgencyBilledVolume);
                lblAgencyPendingPayout = v.findViewById(R.id.lblAgencyPendingPayout);

                btnAgencyCall = v.findViewById(R.id.btnAgencyCall);
                btnAgencyWhatsApp = v.findViewById(R.id.btnAgencyWhatsApp);
                btnAgencyLedger = v.findViewById(R.id.btnAgencyLedger);
                btnAgencyEdit = v.findViewById(R.id.btnAgencyEdit);
                btnAgencyDelete = v.findViewById(R.id.btnAgencyDelete);
            }

            void bind(JSONObject agency, AgencyActionListener listener) {
                String name = agency.optString("agencyName", "Unnamed Agency");
                String contact = agency.optString("contactPerson", "Manager");
                String phone = agency.optString("phone", "");
                String email = agency.optString("email", "No official email");
                String pan = agency.optString("panNumber", "N/A");
                String tier = agency.optString("agencyTier", "STANDARD");
                double commRate = agency.optDouble("commissionRate", 10.0);
                String commType = agency.optString("commissionType", "PERCENTAGE");

                lblAgencyName.setText(name);
                lblAgencyContactPerson.setText("Contact: " + contact + (phone.isEmpty() ? "" : (" • " + phone)));
                lblAgencyEmail.setText(email);
                lblAgencyPan.setText("PAN: " + pan);

                // Tier badge styling
                switch (tier.toUpperCase()) {
                    case "BRONZE":
                        lblAgencyTierBadge.setText("BRONZE");
                        lblAgencyTierBadge.setTextColor(0xFFB45309);
                        lblAgencyTierBadge.setBackgroundColor(0xFFFEF3C7);
                        break;
                    case "SILVER":
                    case "TIER_1":
                        lblAgencyTierBadge.setText("SILVER");
                        lblAgencyTierBadge.setTextColor(0xFF0284C7);
                        lblAgencyTierBadge.setBackgroundColor(0xFFE0F2FE);
                        break;
                    case "GOLD":
                    case "TIER_2":
                        lblAgencyTierBadge.setText("GOLD");
                        lblAgencyTierBadge.setTextColor(0xFFD97706);
                        lblAgencyTierBadge.setBackgroundColor(0xFFFEF3C7);
                        break;
                    case "PLATINUM":
                    case "TIER_3":
                        lblAgencyTierBadge.setText("PLATINUM");
                        lblAgencyTierBadge.setTextColor(0xFF7C3AED);
                        lblAgencyTierBadge.setBackgroundColor(0xFFEDE9FE);
                        break;
                    default:
                        lblAgencyTierBadge.setText("STANDARD");
                        lblAgencyTierBadge.setTextColor(0xFF64748B);
                        lblAgencyTierBadge.setBackgroundColor(0xFFF1F5F9);
                        break;
                }

                // Portal badge
                boolean hasPortal = agency.optBoolean("hasLogin", agency.has("user") && !agency.isNull("user"));
                if (hasPortal) {
                    lblAgencyPortalBadge.setText("PORTAL ACTIVE");
                    lblAgencyPortalBadge.setTextColor(0xFF059669);
                    lblAgencyPortalBadge.setBackgroundColor(0xFFD1FAE5);
                } else {
                    lblAgencyPortalBadge.setText("NO PORTAL LOGIN");
                    lblAgencyPortalBadge.setTextColor(0xFF94A3B8);
                    lblAgencyPortalBadge.setBackgroundColor(0xFFF1F5F9);
                }

                // Commission rate pill
                if (commType.equalsIgnoreCase("FIXED")) {
                    lblAgencyCommissionRate.setText("₹" + String.format(Locale.getDefault(), "%,.0f", commRate) + " Fixed");
                } else {
                    lblAgencyCommissionRate.setText(String.format(Locale.getDefault(), "%.1f", commRate) + "% Comm");
                }

                // Financial stats
                int tests = agency.optInt("totalReferrals", 0);
                double earned = agency.optDouble("totalCommission", 0.0);
                double pending = agency.optDouble("pendingCommission", 0.0);

                double billed = 0.0;
                JSONArray comms = agency.optJSONArray("commissions");
                if (comms != null) {
                    for (int i = 0; i < comms.length(); i++) {
                        JSONObject c = comms.optJSONObject(i);
                        if (c != null) {
                            billed += c.optDouble("testPrice", 0.0);
                        }
                    }
                }
                if (billed == 0.0) billed = earned;

                lblAgencyTestsCount.setText(String.valueOf(tests));
                lblAgencyBilledVolume.setText("₹" + String.format(Locale.getDefault(), "%,.0f", billed));
                lblAgencyPendingPayout.setText("₹" + String.format(Locale.getDefault(), "%,.0f", pending));

                // Actions
                btnAgencyCall.setOnClickListener(v -> listener.onCall(phone));
                btnAgencyWhatsApp.setOnClickListener(v -> listener.onWhatsApp(phone, contact));
                btnAgencyLedger.setOnClickListener(v -> listener.onLedger(agency));
                btnAgencyEdit.setOnClickListener(v -> listener.onEdit(agency));
                btnAgencyDelete.setOnClickListener(v -> listener.onDelete(agency));
            }
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  RECYCLERVIEW ADAPTER FOR LEDGER TRANSACTIONS
    // ─────────────────────────────────────────────────────────────────────────
    class LedgerAdapter extends RecyclerView.Adapter<LedgerAdapter.LedgerViewHolder> {

        private final List<JSONObject> ledgerItems;

        LedgerAdapter(List<JSONObject> ledgerItems) {
            this.ledgerItems = ledgerItems;
        }

        @NonNull
        @Override
        public LedgerViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
            View v = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_agency_ledger_row, parent, false);
            return new LedgerViewHolder(v);
        }

        @Override
        public void onBindViewHolder(@NonNull LedgerViewHolder holder, int position) {
            JSONObject item = ledgerItems.get(position);
            holder.bind(item);
        }

        @Override
        public int getItemCount() {
            return ledgerItems.size();
        }

        class LedgerViewHolder extends RecyclerView.ViewHolder {

            private final TextView lblTestName;
            private final TextView lblDate;
            private final TextView lblAmount;
            private final TextView lblStatus;

            LedgerViewHolder(@NonNull View v) {
                super(v);
                lblTestName = v.findViewById(R.id.lblLedgerRowTestName);
                lblDate = v.findViewById(R.id.lblLedgerRowDate);
                lblAmount = v.findViewById(R.id.lblLedgerRowAmount);
                lblStatus = v.findViewById(R.id.lblLedgerRowStatus);
            }

            void bind(JSONObject item) {
                String testName = item.optString("testName", "Diagnostic Referral");
                String date = item.optString("date", "Recent Transaction");
                double amount = item.optDouble("amount", 0.0);
                String status = item.optString("status", "PENDING");

                lblTestName.setText(testName);
                lblDate.setText(date);
                lblAmount.setText("₹" + String.format(Locale.getDefault(), "%,.0f", amount));

                if (status.equalsIgnoreCase("PAID")) {
                    lblStatus.setText("PAID");
                    lblStatus.setTextColor(0xFF059669);
                    lblStatus.setBackgroundColor(0xFFD1FAE5);
                } else {
                    lblStatus.setText("PENDING");
                    lblStatus.setTextColor(0xFFD97706);
                    lblStatus.setBackgroundColor(0xFFFEF3C7);
                }
            }
        }
    }
}
