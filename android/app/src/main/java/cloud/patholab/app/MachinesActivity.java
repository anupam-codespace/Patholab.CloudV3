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
 * MachinesActivity — Radiology Equipment / Machine Management
 * Full parity with /workspace/radiology/machines
 * CRUD: Add, edit, deactivate machines. Shows AE Title, IP, port, modality, status.
 */
public class MachinesActivity extends AppCompatActivity {

    private static final String BASE_URL = "https://app.patholab.cloud";

    private FrameLayout btnBack, btnRefresh;
    private ImageView imgRefreshIcon;
    private ProgressBar progressLoading;
    private RecyclerView recycler;
    private LinearLayout emptyState;
    private Button btnAddMachine;

    private MachinesAdapter adapter;
    private final List<JSONObject> machines = new ArrayList<>();
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_machines);
        btnBack        = findViewById(R.id.btnMachinesBack);
        btnRefresh     = findViewById(R.id.btnMachinesRefresh);
        imgRefreshIcon = findViewById(R.id.imgMachinesRefreshIcon);
        progressLoading = findViewById(R.id.progressMachines);
        recycler       = findViewById(R.id.recyclerMachines);
        emptyState     = findViewById(R.id.emptyMachines);
        btnAddMachine  = findViewById(R.id.btnAddMachine);

        btnBack.setOnClickListener(v -> finish());
        btnRefresh.setOnClickListener(v -> { animateRefresh(); fetchMachines(true); });
        btnAddMachine.setOnClickListener(v -> showMachineSheet(null));

        adapter = new MachinesAdapter(machines,
                machine -> showMachineSheet(machine),
                machine -> confirmDelete(machine));
        recycler.setLayoutManager(new LinearLayoutManager(this));
        recycler.setAdapter(adapter);
        fetchMachines(false);
    }

    private void animateRefresh() {
        if (imgRefreshIcon == null) return;
        RotateAnimation r = new RotateAnimation(0, 360, Animation.RELATIVE_TO_SELF, 0.5f, Animation.RELATIVE_TO_SELF, 0.5f);
        r.setDuration(600); r.setRepeatCount(1); imgRefreshIcon.startAnimation(r);
    }

    private void fetchMachines(boolean manual) {
        progressLoading.setVisibility(View.VISIBLE);
        new Thread(() -> {
            try {
                String token = getToken();
                URL url = new URL(BASE_URL + "/api/workspace/radiology/machines");
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
                        arr = res.has("machines") ? res.optJSONArray("machines") :
                                (res.has("data") ? res.optJSONArray("data") : res.optJSONArray("modalities"));
                    }
                    final List<JSONObject> fetched = new ArrayList<>();
                    if (arr != null) for (int i = 0; i < arr.length(); i++) fetched.add(arr.getJSONObject(i));
                    mainHandler.post(() -> {
                        progressLoading.setVisibility(View.GONE);
                        machines.clear(); machines.addAll(fetched);
                        adapter.notifyDataSetChanged();
                        emptyState.setVisibility(machines.isEmpty() ? View.VISIBLE : View.GONE);
                        recycler.setVisibility(machines.isEmpty() ? View.GONE : View.VISIBLE);
                        if (manual) Toast.makeText(this, "Machines refreshed", Toast.LENGTH_SHORT).show();
                    });
                } else {
                    mainHandler.post(() -> { progressLoading.setVisibility(View.GONE); emptyState.setVisibility(View.VISIBLE); });
                }
                conn.disconnect();
            } catch (Exception e) {
                mainHandler.post(() -> {
                    progressLoading.setVisibility(View.GONE);
                    emptyState.setVisibility(machines.isEmpty() ? View.VISIBLE : View.GONE);
                    Toast.makeText(this, "Error: " + e.getMessage(), Toast.LENGTH_SHORT).show();
                });
            }
        }).start();
    }

    private void showMachineSheet(JSONObject existing) {
        BottomSheetDialog sheet = new BottomSheetDialog(this);
        View v = LayoutInflater.from(this).inflate(R.layout.layout_machine_sheet, null);
        sheet.setContentView(v);

        TextView sheetTitle       = v.findViewById(R.id.lblMachineSheetTitle);
        EditText inputName        = v.findViewById(R.id.inputMachineName);
        EditText inputModality    = v.findViewById(R.id.inputMachineModality);
        EditText inputAeTitle     = v.findViewById(R.id.inputMachineAeTitle);
        EditText inputIp          = v.findViewById(R.id.inputMachineIp);
        EditText inputPort        = v.findViewById(R.id.inputMachinePort);
        EditText inputManufacturer = v.findViewById(R.id.inputMachineManufacturer);
        EditText inputModel       = v.findViewById(R.id.inputMachineModel);
        Button btnSave            = v.findViewById(R.id.btnSaveMachine);
        ProgressBar progress      = v.findViewById(R.id.progressSaveMachine);
        TextView lblError         = v.findViewById(R.id.lblMachineError);
        v.findViewById(R.id.btnMachineSheetClose).setOnClickListener(x -> sheet.dismiss());

        boolean isEdit = existing != null;
        sheetTitle.setText(isEdit ? "Edit Machine" : "Add New Machine");
        if (isEdit) {
            inputName.setText(existing.optString("name"));
            inputModality.setText(existing.optString("modality"));
            inputAeTitle.setText(existing.optString("aeTitle"));
            inputIp.setText(existing.optString("ipAddress"));
            inputPort.setText(existing.optString("port", "104"));
            inputManufacturer.setText(existing.optString("manufacturer"));
            inputModel.setText(existing.optString("model"));
        }
        btnSave.setText(isEdit ? "Update Machine" : "Save Machine");

        btnSave.setOnClickListener(x -> {
            String name     = inputName.getText().toString().trim();
            String modality = inputModality.getText().toString().trim();
            String aeTitle  = inputAeTitle.getText().toString().trim();
            if (name.isEmpty() || modality.isEmpty()) { lblError.setText("Name and modality are required."); lblError.setVisibility(View.VISIBLE); return; }
            lblError.setVisibility(View.GONE);
            btnSave.setEnabled(false); btnSave.setText(""); progress.setVisibility(View.VISIBLE);

            new Thread(() -> {
                try {
                    String token = getToken();
                    String endpoint = isEdit ? BASE_URL + "/api/workspace/radiology/machines/" + existing.optString("id") : BASE_URL + "/api/workspace/radiology/machines";
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
                    payload.put("aeTitle", aeTitle);
                    payload.put("ipAddress", inputIp.getText().toString().trim());
                    payload.put("port", inputPort.getText().toString().trim());
                    payload.put("manufacturer", inputManufacturer.getText().toString().trim());
                    payload.put("model", inputModel.getText().toString().trim());
                    OutputStream os = conn.getOutputStream();
                    os.write(payload.toString().getBytes(StandardCharsets.UTF_8));
                    os.close();
                    int code = conn.getResponseCode();
                    mainHandler.post(() -> {
                        progress.setVisibility(View.GONE);
                        btnSave.setEnabled(true); btnSave.setText(isEdit ? "Update Machine" : "Save Machine");
                        if (code >= 200 && code < 300) { sheet.dismiss(); fetchMachines(false); Toast.makeText(this, isEdit ? "Machine updated" : "Machine added", Toast.LENGTH_SHORT).show(); }
                        else { lblError.setText("Failed (" + code + ")"); lblError.setVisibility(View.VISIBLE); }
                    });
                    conn.disconnect();
                } catch (Exception e) {
                    mainHandler.post(() -> { progress.setVisibility(View.GONE); btnSave.setEnabled(true); btnSave.setText(isEdit ? "Update Machine" : "Save Machine");
                        lblError.setText("Error: " + e.getMessage()); lblError.setVisibility(View.VISIBLE); });
                }
            }).start();
        });
        sheet.show();
    }

    private void confirmDelete(JSONObject machine) {
        new android.app.AlertDialog.Builder(this)
                .setTitle("Deactivate Machine")
                .setMessage("Remove \"" + machine.optString("name", "this machine") + "\" from RIS? This cannot be undone.")
                .setPositiveButton("Remove", (d, w) -> deleteMachine(machine.optString("id")))
                .setNegativeButton("Cancel", null)
                .show();
    }

    private void deleteMachine(String id) {
        new Thread(() -> {
            try {
                String token = getToken();
                URL url = new URL(BASE_URL + "/api/workspace/radiology/machines/" + id);
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("DELETE");
                conn.setRequestProperty("Authorization", "Bearer " + token);
                conn.setRequestProperty("Cookie", "token=" + token);
                int code = conn.getResponseCode();
                mainHandler.post(() -> {
                    if (code >= 200 && code < 300) { fetchMachines(false); Toast.makeText(this, "Machine removed", Toast.LENGTH_SHORT).show(); }
                    else Toast.makeText(this, "Failed to remove (" + code + ")", Toast.LENGTH_SHORT).show();
                });
                conn.disconnect();
            } catch (Exception e) {
                mainHandler.post(() -> Toast.makeText(this, "Error: " + e.getMessage(), Toast.LENGTH_SHORT).show());
            }
        }).start();
    }

    private String getToken() {
        String t = AuthManager.getToken(this); if (t != null && !t.isEmpty()) return t;
        try { CookieManager cm = CookieManager.getInstance(); String c = cm.getCookie(BASE_URL);
            if (c != null) for (String p : c.split(";")) { String tr = p.trim(); if (tr.startsWith("token=")) { String v = tr.substring(6).trim(); if (!v.isEmpty()) return v; } } } catch (Exception ignored) {}
        try { return getSharedPreferences("patholab_prefs", Context.MODE_PRIVATE).getString("auth_token", ""); } catch (Exception ignored) { return ""; }
    }
    private String read(InputStream is) throws Exception {
        if (is == null) return ""; BufferedReader r = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8));
        StringBuilder sb = new StringBuilder(); String l; while ((l = r.readLine()) != null) sb.append(l); return sb.toString();
    }

    interface OnMachineAction { void onAction(JSONObject m); }
    static class MachinesAdapter extends RecyclerView.Adapter<MachinesAdapter.VH> {
        private final List<JSONObject> items; private final OnMachineAction onEdit, onDelete;
        MachinesAdapter(List<JSONObject> items, OnMachineAction onEdit, OnMachineAction onDelete) { this.items = items; this.onEdit = onEdit; this.onDelete = onDelete; }
        @NonNull @Override public VH onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
            View v = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_machine_card, parent, false); return new VH(v);
        }
        @Override public void onBindViewHolder(@NonNull VH h, int pos) { h.bind(items.get(pos)); }
        @Override public int getItemCount() { return items.size(); }
        class VH extends RecyclerView.ViewHolder {
            TextView lblName, lblModality, lblAeTitle, lblIp, lblStatus; Button btnEdit, btnDelete;
            VH(View v) { super(v); lblName = v.findViewById(R.id.lblMachineName); lblModality = v.findViewById(R.id.lblMachineModality);
                lblAeTitle = v.findViewById(R.id.lblMachineAeTitle); lblIp = v.findViewById(R.id.lblMachineIp);
                lblStatus = v.findViewById(R.id.lblMachineStatus); btnEdit = v.findViewById(R.id.btnEditMachine); btnDelete = v.findViewById(R.id.btnDeleteMachine); }
            void bind(JSONObject m) {
                lblName.setText(m.optString("name", "Machine")); lblModality.setText(m.optString("modality", ""));
                lblAeTitle.setText("AE: " + m.optString("aeTitle", "-")); lblIp.setText(m.optString("ipAddress", "") + ":" + m.optString("port", "104"));
                String status = m.optString("status", "ACTIVE").toUpperCase(Locale.ROOT);
                lblStatus.setText(" " + status + " ");
                lblStatus.setTextColor(status.equals("ACTIVE") ? 0xFF059669 : 0xFFDC2626);
                lblStatus.setBackgroundColor(status.equals("ACTIVE") ? 0xFFD1FAE5 : 0xFFFEE2E2);
                btnEdit.setOnClickListener(v -> onEdit.onAction(m)); btnDelete.setOnClickListener(v -> onDelete.onAction(m));
            }
        }
    }
}
