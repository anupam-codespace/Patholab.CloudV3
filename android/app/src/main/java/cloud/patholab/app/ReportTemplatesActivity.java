package cloud.patholab.app;

import android.content.Context;
import android.graphics.Color;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.view.animation.Animation;
import android.view.animation.RotateAnimation;
import android.webkit.CookieManager;
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
import androidx.appcompat.app.AppCompatActivity;
import androidx.appcompat.widget.SwitchCompat;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.google.android.material.bottomsheet.BottomSheetDialog;

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
 * ReportTemplatesActivity — Lab Report Templates Manager
 * 100% Web Parity with /workspace/settings/templates & /workspace/settings/report-template
 * Features:
 *  - Active Template indicator & "Set as Active" one-tap action
 *  - Full Header Mode selection: Standard, Blank Stationery, Image Letterhead
 *  - Digital Signatures & NABL/ISO badges toggle
 *  - Create, edit, duplicate, delete with live real-time server synchronization
 *  - Dual-host fallback (app.patholab.cloud & patholab.cloud) with multi-token cookies
 */
public class ReportTemplatesActivity extends AppCompatActivity {

    private static final String[] BASE_URLS = new String[]{"https://app.patholab.cloud", "https://patholab.cloud"};

    private FrameLayout btnBack, btnRefresh;
    private ImageView imgRefreshIcon;
    private EditText inputSearch;
    private ImageView btnClearSearch;
    private ProgressBar progressLoading;
    private RecyclerView recycler;
    private LinearLayout emptyState;
    private Button btnAddTemplate;

    private TemplatesAdapter adapter;
    private final List<JSONObject> allTemplates = new ArrayList<>();
    private final List<JSONObject> filtered      = new ArrayList<>();
    private String searchQuery = "";
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_report_templates);

        btnBack          = findViewById(R.id.btnTemplatesBack);
        btnRefresh       = findViewById(R.id.btnTemplatesRefresh);
        imgRefreshIcon   = findViewById(R.id.imgTemplatesRefreshIcon);
        inputSearch      = findViewById(R.id.inputTemplateSearch);
        btnClearSearch   = findViewById(R.id.btnClearTemplateSearch);
        progressLoading  = findViewById(R.id.progressTemplates);
        recycler         = findViewById(R.id.recyclerTemplates);
        emptyState       = findViewById(R.id.emptyTemplates);
        btnAddTemplate   = findViewById(R.id.btnAddTemplate);

        btnBack.setOnClickListener(v -> finish());
        btnRefresh.setOnClickListener(v -> { animateRefresh(); fetchTemplates(true); });
        btnAddTemplate.setOnClickListener(v -> showTemplateSheet(null));

        inputSearch.addTextChangedListener(new android.text.TextWatcher() {
            public void beforeTextChanged(CharSequence s, int st, int c, int a) {}
            public void onTextChanged(CharSequence s, int st, int b, int c) {
                searchQuery = s.toString().trim().toLowerCase(Locale.ROOT);
                btnClearSearch.setVisibility(searchQuery.isEmpty() ? View.GONE : View.VISIBLE);
                applyFilter();
            }
            public void afterTextChanged(android.text.Editable s) {}
        });
        btnClearSearch.setOnClickListener(v -> { inputSearch.setText(""); searchQuery = ""; applyFilter(); });

        adapter = new TemplatesAdapter(filtered,
                this::activateTemplate,
                this::showTemplateSheet,
                this::duplicateTemplate,
                this::confirmDelete);
        recycler.setLayoutManager(new LinearLayoutManager(this));
        recycler.setAdapter(adapter);

        fetchTemplates(false);
    }

    @Override
    protected void onResume() {
        super.onResume();
        fetchTemplates(false);
    }

    private void animateRefresh() {
        if (imgRefreshIcon == null) return;
        RotateAnimation r = new RotateAnimation(0, 360, Animation.RELATIVE_TO_SELF, 0.5f, Animation.RELATIVE_TO_SELF, 0.5f);
        r.setDuration(600); r.setRepeatCount(1); imgRefreshIcon.startAnimation(r);
    }

    private String getToken() {
        String t = AuthManager.getToken(this);
        if (t != null && !t.trim().isEmpty()) return t.trim();
        try {
            CookieManager cm = CookieManager.getInstance();
            for (String host : BASE_URLS) {
                String c = cm.getCookie(host);
                if (c != null) {
                    for (String p : c.split(";")) {
                        String tr = p.trim();
                        if (tr.startsWith("token=") || tr.startsWith("auth-token=") || tr.startsWith("auth_token=")) {
                            int eqIdx = tr.indexOf('=');
                            if (eqIdx != -1) {
                                String val = tr.substring(eqIdx + 1).trim();
                                if (!val.isEmpty()) {
                                    AuthManager.saveToken(this, val);
                                    return val;
                                }
                            }
                        }
                    }
                }
            }
        } catch (Exception ignored) {}
        try { return getSharedPreferences("patholab_prefs", Context.MODE_PRIVATE).getString("auth_token", ""); } catch (Exception ignored) { return ""; }
    }

    private String read(InputStream is) throws Exception {
        if (is == null) return "";
        BufferedReader r = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8));
        StringBuilder sb = new StringBuilder();
        String l;
        while ((l = r.readLine()) != null) sb.append(l);
        return sb.toString();
    }

    private void fetchTemplates(boolean manual) {
        progressLoading.setVisibility(View.VISIBLE);
        new Thread(() -> {
            boolean success = false;
            String token = getToken();

            for (String host : BASE_URLS) {
                try {
                    URL url = new URL(host + "/api/workspace/settings/templates");
                    HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                    conn.setRequestMethod("GET");
                    if (!token.isEmpty()) {
                        conn.setRequestProperty("Authorization", "Bearer " + token);
                        conn.setRequestProperty("Cookie", "token=" + token + "; auth-token=" + token + "; auth_token=" + token);
                    }
                    conn.setRequestProperty("Accept", "application/json");
                    conn.setConnectTimeout(8000); conn.setReadTimeout(12000);
                    int code = conn.getResponseCode();
                    if (code >= 200 && code < 300) {
                        String body = read(conn.getInputStream()).trim();
                        JSONArray arr = null;
                        if (body.startsWith("[")) {
                            arr = new JSONArray(body);
                        } else {
                            JSONObject res = new JSONObject(body);
                            arr = res.has("templates") ? res.optJSONArray("templates") : (res.has("data") ? res.optJSONArray("data") : null);
                        }
                        final List<JSONObject> fetched = new ArrayList<>();
                        if (arr != null) {
                            for (int i = 0; i < arr.length(); i++) fetched.add(arr.getJSONObject(i));
                        }
                        conn.disconnect();
                        success = true;
                        mainHandler.post(() -> {
                            progressLoading.setVisibility(View.GONE);
                            allTemplates.clear();
                            allTemplates.addAll(fetched);
                            applyFilter();
                            if (manual) Toast.makeText(this, "Templates refreshed", Toast.LENGTH_SHORT).show();
                        });
                        break;
                    }
                    conn.disconnect();
                } catch (Exception ignored) {}
            }

            if (!success) {
                mainHandler.post(() -> {
                    progressLoading.setVisibility(View.GONE);
                    showEmpty();
                    if (manual) Toast.makeText(this, "Failed to load templates", Toast.LENGTH_SHORT).show();
                });
            }
        }).start();
    }

    private void applyFilter() {
        filtered.clear();
        for (JSONObject t : allTemplates) {
            String name = t.optString("name", "").toLowerCase(Locale.ROOT);
            JSONObject config = t.optJSONObject("config");
            String headerTitle = "";
            if (config != null) {
                JSONObject header = config.optJSONObject("header");
                if (header != null) headerTitle = header.optString("title", "").toLowerCase(Locale.ROOT);
            }
            if (searchQuery.isEmpty() || name.contains(searchQuery) || headerTitle.contains(searchQuery)) {
                filtered.add(t);
            }
        }
        adapter.notifyDataSetChanged();
        boolean empty = filtered.isEmpty();
        emptyState.setVisibility(empty ? View.VISIBLE : View.GONE);
        recycler.setVisibility(empty ? View.GONE : View.VISIBLE);
    }

    private void showEmpty() {
        emptyState.setVisibility(View.VISIBLE);
        recycler.setVisibility(View.GONE);
    }

    private void activateTemplate(JSONObject template) {
        String id = template.optString("id");
        if (id.isEmpty()) return;
        progressLoading.setVisibility(View.VISIBLE);

        new Thread(() -> {
            boolean success = false;
            String token = getToken();
            for (String host : BASE_URLS) {
                try {
                    URL url = new URL(host + "/api/workspace/settings/templates");
                    HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                    conn.setRequestMethod("POST");
                    if (!token.isEmpty()) {
                        conn.setRequestProperty("Authorization", "Bearer " + token);
                        conn.setRequestProperty("Cookie", "token=" + token + "; auth-token=" + token + "; auth_token=" + token);
                    }
                    conn.setRequestProperty("Content-Type", "application/json");
                    conn.setDoOutput(true);

                    JSONObject payload = new JSONObject();
                    payload.put("action", "ACTIVATE");
                    payload.put("templateId", id);

                    OutputStream os = conn.getOutputStream();
                    os.write(payload.toString().getBytes(StandardCharsets.UTF_8));
                    os.close();

                    int code = conn.getResponseCode();
                    conn.disconnect();
                    if (code >= 200 && code < 300) {
                        success = true;
                        mainHandler.post(() -> {
                            progressLoading.setVisibility(View.GONE);
                            Toast.makeText(this, "Template set as Active!", Toast.LENGTH_SHORT).show();
                            fetchTemplates(false);
                        });
                        break;
                    }
                } catch (Exception ignored) {}
            }
            if (!success) {
                mainHandler.post(() -> {
                    progressLoading.setVisibility(View.GONE);
                    Toast.makeText(this, "Failed to activate template", Toast.LENGTH_SHORT).show();
                });
            }
        }).start();
    }

    private void showTemplateSheet(JSONObject existing) {
        BottomSheetDialog sheet = new BottomSheetDialog(this);
        View v = LayoutInflater.from(this).inflate(R.layout.layout_template_sheet, null);
        sheet.setContentView(v);

        TextView sheetTitle       = v.findViewById(R.id.lblTemplateSheetTitle);
        EditText inputName        = v.findViewById(R.id.inputTemplateName);
        Spinner spinnerMode       = v.findViewById(R.id.spinnerTemplateMode);
        EditText inputHeader      = v.findViewById(R.id.inputTemplateHeader);
        EditText inputFooter      = v.findViewById(R.id.inputTemplateFooter);
        SwitchCompat switchShowLogo  = v.findViewById(R.id.switchTemplateShowLogo);
        SwitchCompat switchShowSig   = v.findViewById(R.id.switchTemplateShowSig);
        SwitchCompat switchShowNabl  = v.findViewById(R.id.switchTemplateShowNabl);
        Button btnSave            = v.findViewById(R.id.btnSaveTemplate);
        ProgressBar progress      = v.findViewById(R.id.progressSaveTemplate);
        TextView lblError         = v.findViewById(R.id.lblTemplateError);

        v.findViewById(R.id.btnTemplateSheetClose).setOnClickListener(x -> sheet.dismiss());

        String[] modeLabels = new String[]{"Standard Official Header", "Blank Pre-printed Stationery", "Image Letterhead Header"};
        String[] modeValues = new String[]{"standard", "blank", "image"};
        ArrayAdapter<String> modeAdapter = new ArrayAdapter<>(this, android.R.layout.simple_spinner_item, modeLabels);
        modeAdapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
        spinnerMode.setAdapter(modeAdapter);

        boolean isEdit = existing != null;
        sheetTitle.setText(isEdit ? "Edit Template Design" : "Create New Template");

        JSONObject existingConfig = null;
        if (existing != null) {
            existingConfig = existing.optJSONObject("config");
            if (existingConfig == null) {
                try { existingConfig = new JSONObject(existing.optString("config", "{}")); } catch (Exception ignored) {}
            }
        }

        if (isEdit && existingConfig != null) {
            inputName.setText(existing.optString("name", ""));
            JSONObject header = existingConfig.optJSONObject("header");
            String mode = header != null ? header.optString("mode", "standard") : "standard";
            int sel = 0;
            if ("blank".equalsIgnoreCase(mode)) sel = 1;
            else if ("image".equalsIgnoreCase(mode)) sel = 2;
            spinnerMode.setSelection(sel);

            inputHeader.setText(header != null ? header.optString("title", "") : "");
            JSONObject footer = existingConfig.optJSONObject("footer");
            inputFooter.setText(footer != null ? footer.optString("text", "") : "");

            JSONObject branding = existingConfig.optJSONObject("branding");
            switchShowLogo.setChecked(branding != null ? branding.optBoolean("showLogo", true) : true);
            switchShowSig.setChecked(true);
            switchShowNabl.setChecked(branding != null ? branding.optBoolean("showNabl", false) : false);
        } else {
            inputName.setText("Official Header Template");
            spinnerMode.setSelection(0);
            inputHeader.setText("");
            inputFooter.setText("Computer generated diagnostic report. Consult physician for clinical correlation.");
            switchShowLogo.setChecked(true);
            switchShowSig.setChecked(true);
            switchShowNabl.setChecked(false);
        }

        btnSave.setText(isEdit ? "Update Template" : "Create Template");

        final JSONObject finalExistingConfig = existingConfig;
        btnSave.setOnClickListener(x -> {
            String name = inputName.getText().toString().trim();
            if (name.isEmpty()) {
                lblError.setText("Template name is required.");
                lblError.setVisibility(View.VISIBLE);
                return;
            }
            lblError.setVisibility(View.GONE);
            btnSave.setEnabled(false);
            btnSave.setText("");
            progress.setVisibility(View.VISIBLE);

            int selMode = spinnerMode.getSelectedItemPosition();
            String mode = (selMode >= 0 && selMode < modeValues.length) ? modeValues[selMode] : "standard";
            String headerTitle = inputHeader.getText().toString().trim();
            String footerText = inputFooter.getText().toString().trim();

            new Thread(() -> {
                boolean success = false;
                String token = getToken();

                try {
                    JSONObject config = finalExistingConfig != null ? new JSONObject(finalExistingConfig.toString()) : new JSONObject();
                    JSONObject header = config.optJSONObject("header");
                    if (header == null) header = new JSONObject();
                    header.put("show", true);
                    header.put("mode", mode);
                    header.put("title", headerTitle);
                    config.put("header", header);

                    JSONObject footer = config.optJSONObject("footer");
                    if (footer == null) footer = new JSONObject();
                    footer.put("show", true);
                    footer.put("mode", "blank".equals(mode) ? "blank" : "standard");
                    footer.put("text", footerText);
                    if (!footer.has("signatures")) {
                        JSONArray sigs = new JSONArray();
                        JSONObject s1 = new JSONObject(); s1.put("title", "Technician"); s1.put("show", switchShowSig.isChecked());
                        JSONObject s2 = new JSONObject(); s2.put("title", "Consultant Pathologist"); s2.put("show", switchShowSig.isChecked());
                        sigs.put(s1); sigs.put(s2);
                        footer.put("signatures", sigs);
                    }
                    config.put("footer", footer);

                    JSONObject branding = config.optJSONObject("branding");
                    if (branding == null) branding = new JSONObject();
                    branding.put("showLogo", switchShowLogo.isChecked());
                    branding.put("showNabl", switchShowNabl.isChecked());
                    config.put("branding", branding);

                    JSONObject payload = new JSONObject();
                    payload.put("name", name);
                    payload.put("config", config);
                    payload.put("isActive", existing != null ? existing.optBoolean("isActive", false) : allTemplates.isEmpty());

                    for (String host : BASE_URLS) {
                        try {
                            String ep = isEdit ? host + "/api/workspace/settings/templates/" + existing.optString("id") : host + "/api/workspace/settings/templates";
                            URL url = new URL(ep);
                            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                            conn.setRequestMethod(isEdit ? "PUT" : "POST");
                            if (!token.isEmpty()) {
                                conn.setRequestProperty("Authorization", "Bearer " + token);
                                conn.setRequestProperty("Cookie", "token=" + token + "; auth-token=" + token + "; auth_token=" + token);
                            }
                            conn.setRequestProperty("Content-Type", "application/json");
                            conn.setDoOutput(true);

                            OutputStream os = conn.getOutputStream();
                            os.write(payload.toString().getBytes(StandardCharsets.UTF_8));
                            os.close();

                            int code = conn.getResponseCode();
                            conn.disconnect();
                            if (code >= 200 && code < 300) {
                                success = true;
                                mainHandler.post(() -> {
                                    progress.setVisibility(View.GONE);
                                    btnSave.setEnabled(true);
                                    sheet.dismiss();
                                    fetchTemplates(false);
                                    Toast.makeText(this, isEdit ? "Template updated" : "Template created", Toast.LENGTH_SHORT).show();
                                });
                                break;
                            }
                        } catch (Exception ignored) {}
                    }
                } catch (Exception e) {
                    mainHandler.post(() -> {
                        progress.setVisibility(View.GONE);
                        btnSave.setEnabled(true);
                        btnSave.setText(isEdit ? "Update Template" : "Create Template");
                        lblError.setText("Error: " + e.getMessage());
                        lblError.setVisibility(View.VISIBLE);
                    });
                    return;
                }

                if (!success) {
                    mainHandler.post(() -> {
                        progress.setVisibility(View.GONE);
                        btnSave.setEnabled(true);
                        btnSave.setText(isEdit ? "Update Template" : "Create Template");
                        lblError.setText("Failed to save template");
                        lblError.setVisibility(View.VISIBLE);
                    });
                }
            }).start();
        });
        sheet.show();
    }

    private void duplicateTemplate(JSONObject template) {
        String id = template.optString("id");
        if (id.isEmpty()) return;
        progressLoading.setVisibility(View.VISIBLE);

        new Thread(() -> {
            boolean success = false;
            String token = getToken();
            for (String host : BASE_URLS) {
                try {
                    URL url = new URL(host + "/api/workspace/settings/templates/" + id + "/duplicate");
                    HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                    conn.setRequestMethod("POST");
                    if (!token.isEmpty()) {
                        conn.setRequestProperty("Authorization", "Bearer " + token);
                        conn.setRequestProperty("Cookie", "token=" + token + "; auth-token=" + token + "; auth_token=" + token);
                    }
                    conn.setRequestProperty("Content-Type", "application/json");
                    conn.setDoOutput(true);
                    conn.getOutputStream().close();

                    int code = conn.getResponseCode();
                    conn.disconnect();
                    if (code >= 200 && code < 300) {
                        success = true;
                        mainHandler.post(() -> {
                            progressLoading.setVisibility(View.GONE);
                            fetchTemplates(false);
                            Toast.makeText(this, "Template duplicated successfully", Toast.LENGTH_SHORT).show();
                        });
                        break;
                    }
                } catch (Exception ignored) {}
            }
            if (!success) {
                mainHandler.post(() -> {
                    progressLoading.setVisibility(View.GONE);
                    Toast.makeText(this, "Duplicate failed", Toast.LENGTH_SHORT).show();
                });
            }
        }).start();
    }

    private void confirmDelete(JSONObject template) {
        new android.app.AlertDialog.Builder(this)
                .setTitle("Delete Template")
                .setMessage("Delete template \"" + template.optString("name") + "\"? This cannot be undone.")
                .setPositiveButton("Delete", (d, w) -> deleteTemplate(template.optString("id")))
                .setNegativeButton("Cancel", null).show();
    }

    private void deleteTemplate(String id) {
        progressLoading.setVisibility(View.VISIBLE);
        new Thread(() -> {
            boolean success = false;
            String token = getToken();
            for (String host : BASE_URLS) {
                try {
                    URL url = new URL(host + "/api/workspace/settings/templates/" + id);
                    HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                    conn.setRequestMethod("DELETE");
                    if (!token.isEmpty()) {
                        conn.setRequestProperty("Authorization", "Bearer " + token);
                        conn.setRequestProperty("Cookie", "token=" + token + "; auth-token=" + token + "; auth_token=" + token);
                    }
                    int code = conn.getResponseCode();
                    conn.disconnect();
                    if (code >= 200 && code < 300) {
                        success = true;
                        mainHandler.post(() -> {
                            progressLoading.setVisibility(View.GONE);
                            fetchTemplates(false);
                            Toast.makeText(this, "Template deleted", Toast.LENGTH_SHORT).show();
                        });
                        break;
                    }
                } catch (Exception ignored) {}
            }
            if (!success) {
                mainHandler.post(() -> {
                    progressLoading.setVisibility(View.GONE);
                    Toast.makeText(this, "Delete failed", Toast.LENGTH_SHORT).show();
                });
            }
        }).start();
    }

    interface OnTemplateAction { void onAction(JSONObject t); }

    static class TemplatesAdapter extends RecyclerView.Adapter<TemplatesAdapter.VH> {
        private final List<JSONObject> items;
        private final OnTemplateAction onActivate, onEdit, onDuplicate, onDelete;

        TemplatesAdapter(List<JSONObject> items, OnTemplateAction onActivate, OnTemplateAction onEdit, OnTemplateAction onDuplicate, OnTemplateAction onDelete) {
            this.items = items;
            this.onActivate = onActivate;
            this.onEdit = onEdit;
            this.onDuplicate = onDuplicate;
            this.onDelete = onDelete;
        }

        @NonNull
        @Override
        public VH onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
            View v = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_template_card, parent, false);
            return new VH(v);
        }

        @Override
        public void onBindViewHolder(@NonNull VH h, int pos) {
            h.bind(items.get(pos));
        }

        @Override
        public int getItemCount() {
            return items.size();
        }

        class VH extends RecyclerView.ViewHolder {
            View cardContainer;
            TextView lblName, lblMode, lblActive, lblPreview;
            Button btnActivate, btnEdit;
            FrameLayout btnDuplicate, btnDelete;

            VH(View v) {
                super(v);
                cardContainer = v.findViewById(R.id.cardTemplateContainer);
                lblName       = v.findViewById(R.id.lblTemplateName);
                lblMode       = v.findViewById(R.id.lblTemplateMode);
                lblActive     = v.findViewById(R.id.lblTemplateActive);
                lblPreview    = v.findViewById(R.id.lblTemplatePreview);
                btnActivate   = v.findViewById(R.id.btnActivateTemplate);
                btnEdit       = v.findViewById(R.id.btnEditTemplate);
                btnDuplicate  = v.findViewById(R.id.btnDuplicateTemplate);
                btnDelete     = v.findViewById(R.id.btnDeleteTemplate);
            }

            void bind(JSONObject t) {
                String name = t.optString("name", "Report Template");
                lblName.setText(name);

                boolean isActive = t.optBoolean("isActive", false);
                lblActive.setVisibility(isActive ? View.VISIBLE : View.GONE);

                if (isActive) {
                    btnActivate.setText("✓ Currently Active");
                    btnActivate.setEnabled(false);
                    btnActivate.setBackgroundResource(R.drawable.bg_pill_indigo_soft);
                    btnActivate.setTextColor(Color.parseColor("#4F46E5"));
                    btnDelete.setVisibility(View.GONE);
                } else {
                    btnActivate.setText("Set as Active");
                    btnActivate.setEnabled(true);
                    btnActivate.setBackgroundResource(R.drawable.bg_btn_primary);
                    btnActivate.setTextColor(Color.parseColor("#FFFFFF"));
                    btnDelete.setVisibility(View.VISIBLE);
                    btnActivate.setOnClickListener(v -> onActivate.onAction(t));
                }

                JSONObject config = t.optJSONObject("config");
                if (config == null) {
                    try { config = new JSONObject(t.optString("config", "{}")); } catch (Exception ignored) {}
                }

                String mode = "STANDARD";
                String headerTitle = "";
                String footerText = "Computer generated diagnostic report";

                if (config != null) {
                    JSONObject header = config.optJSONObject("header");
                    if (header != null) {
                        mode = header.optString("mode", "standard").toUpperCase(Locale.ROOT);
                        headerTitle = header.optString("title", "");
                    }
                    JSONObject footer = config.optJSONObject("footer");
                    if (footer != null) {
                        footerText = footer.optString("text", footerText);
                    }
                }
                lblMode.setText(mode);

                if ("IMAGE".equals(mode)) {
                    lblPreview.setText("🖼️ Image Letterhead Mode • Custom pre-formatted stationery");
                } else if ("BLANK".equals(mode)) {
                    lblPreview.setText("📄 Blank Stationery Mode • Header reserved for physical stationery");
                } else {
                    lblPreview.setText(headerTitle.isEmpty() ? "Standard Layout • " + footerText : "Header: " + headerTitle + " • " + footerText);
                }

                btnEdit.setOnClickListener(v -> onEdit.onAction(t));
                btnDuplicate.setOnClickListener(v -> onDuplicate.onAction(t));
                btnDelete.setOnClickListener(v -> onDelete.onAction(t));
            }
        }
    }
}

