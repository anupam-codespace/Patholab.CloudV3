package cloud.patholab.app;

import android.content.Context;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.view.animation.Animation;
import android.view.animation.RotateAnimation;
import android.webkit.CookieManager;
import android.widget.Button;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
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
 * RISMacrosActivity — Radiology Macros / Impression Templates
 * Full parity with /workspace/radiology/macros
 * CRUD: Create, edit, delete macros. Each macro has a name, modality, and body text
 * used to auto-fill radiology report impressions.
 */
public class RISMacrosActivity extends AppCompatActivity {

    private static final String BASE_URL = "https://app.patholab.cloud";

    private FrameLayout btnBack, btnRefresh;
    private ImageView imgRefreshIcon;
    private ProgressBar progressLoading;
    private RecyclerView recycler;
    private LinearLayout emptyState;
    private Button btnAddMacro;
    private EditText inputSearch;
    private ImageView btnClearSearch;

    private MacrosAdapter adapter;
    private final List<JSONObject> allMacros = new ArrayList<>();
    private final List<JSONObject> filtered  = new ArrayList<>();
    private String searchQuery = "";
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_ris_macros);

        btnBack        = findViewById(R.id.btnMacrosBack);
        btnRefresh     = findViewById(R.id.btnMacrosRefresh);
        imgRefreshIcon = findViewById(R.id.imgMacrosRefreshIcon);
        progressLoading = findViewById(R.id.progressMacros);
        recycler       = findViewById(R.id.recyclerMacros);
        emptyState     = findViewById(R.id.emptyMacros);
        btnAddMacro    = findViewById(R.id.btnAddMacro);
        inputSearch    = findViewById(R.id.inputMacroSearch);
        btnClearSearch = findViewById(R.id.btnClearMacroSearch);

        btnBack.setOnClickListener(v -> finish());
        btnRefresh.setOnClickListener(v -> { animateRefresh(); fetchMacros(true); });
        btnAddMacro.setOnClickListener(v -> showMacroSheet(null));

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

        adapter = new MacrosAdapter(filtered,
                macro -> showMacroSheet(macro),
                macro -> confirmDelete(macro));
        recycler.setLayoutManager(new LinearLayoutManager(this));
        recycler.setAdapter(adapter);
        fetchMacros(false);
    }

    private void animateRefresh() {
        if (imgRefreshIcon == null) return;
        RotateAnimation r = new RotateAnimation(0, 360, Animation.RELATIVE_TO_SELF, 0.5f, Animation.RELATIVE_TO_SELF, 0.5f);
        r.setDuration(600); r.setRepeatCount(1); imgRefreshIcon.startAnimation(r);
    }

    private void fetchMacros(boolean manual) {
        progressLoading.setVisibility(View.VISIBLE);
        new Thread(() -> {
            try {
                String token = getToken();
                URL url = new URL(BASE_URL + "/api/workspace/radiology/macros");
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("GET");
                conn.setRequestProperty("Authorization", "Bearer " + token);
                conn.setRequestProperty("Cookie", "token=" + token);
                conn.setRequestProperty("Accept", "application/json");
                conn.setConnectTimeout(10000); conn.setReadTimeout(15000);
                int code = conn.getResponseCode();
                if (code >= 200 && code < 300) {
                    String body = read(conn.getInputStream()).trim();
                    JSONArray arr;
                    if (body.startsWith("[")) {
                        arr = new JSONArray(body);
                    } else {
                        JSONObject res = new JSONObject(body);
                        arr = res.has("macros") ? res.optJSONArray("macros") :
                                (res.has("data") ? res.optJSONArray("data") : null);
                    }
                    final List<JSONObject> fetched = new ArrayList<>();
                    if (arr != null) for (int i = 0; i < arr.length(); i++) fetched.add(arr.getJSONObject(i));
                    mainHandler.post(() -> {
                        progressLoading.setVisibility(View.GONE);
                        allMacros.clear(); allMacros.addAll(fetched);
                        applyFilter();
                        if (manual) Toast.makeText(this, "Macros refreshed", Toast.LENGTH_SHORT).show();
                    });
                } else {
                    mainHandler.post(() -> { progressLoading.setVisibility(View.GONE); showEmpty(); });
                }
                conn.disconnect();
            } catch (Exception e) {
                mainHandler.post(() -> { progressLoading.setVisibility(View.GONE);
                    Toast.makeText(this, "Error: " + e.getMessage(), Toast.LENGTH_SHORT).show(); showEmpty(); });
            }
        }).start();
    }

    private void applyFilter() {
        filtered.clear();
        for (JSONObject m : allMacros) {
            String name = m.optString("name", "").toLowerCase(Locale.ROOT);
            String modality = m.optString("modality", "").toLowerCase(Locale.ROOT);
            String body = m.optString("body", m.optString("text", "")).toLowerCase(Locale.ROOT);
            if (searchQuery.isEmpty() || name.contains(searchQuery) || modality.contains(searchQuery) || body.contains(searchQuery))
                filtered.add(m);
        }
        adapter.notifyDataSetChanged();
        boolean empty = filtered.isEmpty();
        emptyState.setVisibility(empty ? View.VISIBLE : View.GONE);
        recycler.setVisibility(empty ? View.GONE : View.VISIBLE);
    }

    private void showEmpty() { emptyState.setVisibility(View.VISIBLE); recycler.setVisibility(View.GONE); }

    private void showMacroSheet(JSONObject existing) {
        BottomSheetDialog sheet = new BottomSheetDialog(this);
        View v = LayoutInflater.from(this).inflate(R.layout.layout_macro_sheet, null);
        sheet.setContentView(v);

        TextView sheetTitle    = v.findViewById(R.id.lblMacroSheetTitle);
        EditText inputName     = v.findViewById(R.id.inputMacroName);
        EditText inputModality = v.findViewById(R.id.inputMacroModality);
        EditText inputCategory = v.findViewById(R.id.inputMacroCategory);
        EditText inputBody     = v.findViewById(R.id.inputMacroBody);
        Button btnSave         = v.findViewById(R.id.btnSaveMacro);
        ProgressBar progress   = v.findViewById(R.id.progressSaveMacro);
        TextView lblError      = v.findViewById(R.id.lblMacroError);
        v.findViewById(R.id.btnMacroSheetClose).setOnClickListener(x -> sheet.dismiss());

        boolean isEdit = existing != null;
        sheetTitle.setText(isEdit ? "Edit Macro" : "Create New Macro");
        if (isEdit) {
            inputName.setText(existing.optString("name"));
            inputModality.setText(existing.optString("modality"));
            inputCategory.setText(existing.optString("category"));
            inputBody.setText(existing.optString("body", existing.optString("text", "")));
        }
        btnSave.setText(isEdit ? "Update Macro" : "Save Macro");

        btnSave.setOnClickListener(x -> {
            String name     = inputName.getText().toString().trim();
            String modality = inputModality.getText().toString().trim();
            String body     = inputBody.getText().toString().trim();
            if (name.isEmpty() || body.isEmpty()) { lblError.setText("Macro name and body are required."); lblError.setVisibility(View.VISIBLE); return; }
            lblError.setVisibility(View.GONE);
            btnSave.setEnabled(false); btnSave.setText(""); progress.setVisibility(View.VISIBLE);

            new Thread(() -> {
                try {
                    String token = getToken();
                    String endpoint = isEdit ? BASE_URL + "/api/workspace/radiology/macros/" + existing.optString("id") : BASE_URL + "/api/workspace/radiology/macros";
                    URL url = new URL(endpoint);
                    HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                    conn.setRequestMethod(isEdit ? "PUT" : "POST");
                    conn.setRequestProperty("Authorization", "Bearer " + token);
                    conn.setRequestProperty("Cookie", "token=" + token);
                    conn.setRequestProperty("Content-Type", "application/json");
                    conn.setDoOutput(true);
                    JSONObject payload = new JSONObject();
                    payload.put("name", name);
                    payload.put("modality", modality);
                    payload.put("category", inputCategory.getText().toString().trim());
                    payload.put("body", body);
                    OutputStream os = conn.getOutputStream();
                    os.write(payload.toString().getBytes(StandardCharsets.UTF_8));
                    os.close();
                    int code = conn.getResponseCode();
                    mainHandler.post(() -> {
                        progress.setVisibility(View.GONE);
                        btnSave.setEnabled(true); btnSave.setText(isEdit ? "Update Macro" : "Save Macro");
                        if (code >= 200 && code < 300) { sheet.dismiss(); fetchMacros(false); Toast.makeText(this, isEdit ? "Macro updated" : "Macro created", Toast.LENGTH_SHORT).show(); }
                        else { lblError.setText("Failed (" + code + ")"); lblError.setVisibility(View.VISIBLE); }
                    });
                    conn.disconnect();
                } catch (Exception e) {
                    mainHandler.post(() -> { progress.setVisibility(View.GONE); btnSave.setEnabled(true); btnSave.setText(isEdit ? "Update Macro" : "Save Macro");
                        lblError.setText("Error: " + e.getMessage()); lblError.setVisibility(View.VISIBLE); });
                }
            }).start();
        });
        sheet.show();
    }

    private void confirmDelete(JSONObject macro) {
        new android.app.AlertDialog.Builder(this)
                .setTitle("Delete Macro")
                .setMessage("Delete macro \"" + macro.optString("name", "this macro") + "\"? This cannot be undone.")
                .setPositiveButton("Delete", (d, w) -> deleteMacro(macro.optString("id")))
                .setNegativeButton("Cancel", null).show();
    }

    private void deleteMacro(String id) {
        new Thread(() -> {
            try {
                String token = getToken();
                URL url = new URL(BASE_URL + "/api/workspace/radiology/macros/" + id);
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("DELETE");
                conn.setRequestProperty("Authorization", "Bearer " + token);
                conn.setRequestProperty("Cookie", "token=" + token);
                int code = conn.getResponseCode();
                mainHandler.post(() -> {
                    if (code >= 200 && code < 300) { fetchMacros(false); Toast.makeText(this, "Macro deleted", Toast.LENGTH_SHORT).show(); }
                    else Toast.makeText(this, "Failed to delete (" + code + ")", Toast.LENGTH_SHORT).show();
                });
                conn.disconnect();
            } catch (Exception e) { mainHandler.post(() -> Toast.makeText(this, "Error: " + e.getMessage(), Toast.LENGTH_SHORT).show()); }
        }).start();
    }

    private String getToken() {
        String t = AuthManager.getToken(this); if (t != null && !t.isEmpty()) return t;
        try { CookieManager cm = CookieManager.getInstance(); String c = cm.getCookie(BASE_URL);
            if (c != null) for (String p : c.split(";")) { String tr = p.trim(); if (tr.startsWith("token=")) { String val = tr.substring(6).trim(); if (!val.isEmpty()) return val; } } } catch (Exception ignored) {}
        try { return getSharedPreferences("patholab_prefs", Context.MODE_PRIVATE).getString("auth_token", ""); } catch (Exception ignored) { return ""; }
    }
    private String read(InputStream is) throws Exception {
        if (is == null) return ""; BufferedReader r = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8));
        StringBuilder sb = new StringBuilder(); String l; while ((l = r.readLine()) != null) sb.append(l); return sb.toString();
    }

    interface OnMacroAction { void onAction(JSONObject m); }
    static class MacrosAdapter extends RecyclerView.Adapter<MacrosAdapter.VH> {
        private final List<JSONObject> items; private final OnMacroAction onEdit, onDelete;
        MacrosAdapter(List<JSONObject> items, OnMacroAction onEdit, OnMacroAction onDelete) { this.items = items; this.onEdit = onEdit; this.onDelete = onDelete; }
        @NonNull @Override public VH onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
            View v = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_macro_card, parent, false); return new VH(v);
        }
        @Override public void onBindViewHolder(@NonNull VH h, int pos) { h.bind(items.get(pos)); }
        @Override public int getItemCount() { return items.size(); }
        class VH extends RecyclerView.ViewHolder {
            TextView lblName, lblModality, lblCategory, lblBody; Button btnEdit, btnDelete;
            VH(View v) { super(v); lblName = v.findViewById(R.id.lblMacroName); lblModality = v.findViewById(R.id.lblMacroModality);
                lblCategory = v.findViewById(R.id.lblMacroCategory); lblBody = v.findViewById(R.id.lblMacroBody);
                btnEdit = v.findViewById(R.id.btnEditMacro); btnDelete = v.findViewById(R.id.btnDeleteMacro); }
            void bind(JSONObject m) {
                lblName.setText(m.optString("name", "Macro"));
                lblModality.setText(m.optString("modality", "General"));
                lblCategory.setText(m.optString("category", ""));
                String body = m.optString("body", m.optString("text", ""));
                lblBody.setText(body.length() > 120 ? body.substring(0, 120) + "..." : body);
                btnEdit.setOnClickListener(v -> onEdit.onAction(m));
                btnDelete.setOnClickListener(v -> onDelete.onAction(m));
            }
        }
    }
}
