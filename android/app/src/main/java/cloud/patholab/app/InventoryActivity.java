package cloud.patholab.app;

import android.content.Context;
import android.content.SharedPreferences;
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
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Date;
import java.util.List;
import java.util.Locale;

import cloud.patholab.app.auth.AuthManager;

/**
 * InventoryActivity
 * ─────────────────────────────────────────────────────────────────────────────
 * Native Inventory & Stock Management Console.
 * Real-time two-way sync with Web (/workspace/inventory & /api/workspace/inventory/items & /batches):
 *  - Real-time Catalog Items with Unit Mapping & Alert Thresholds
 *  - Physical Batches with Batch Number, Expiry Date, Quantity, and Valuation
 *  - 4 Live KPIs: Total Items, Low Stock, Out of Stock, Total Inventory Valuation
 *  - Actions: Add Catalog Item, Edit Item, Receive Stock Batch, Adjustments
 */
public class InventoryActivity extends AppCompatActivity {

    private static final String BASE_URL = "https://app.patholab.cloud";

    private FrameLayout btnBack, btnRefresh;
    private ImageView imgRefreshIcon;
    private TextView lblKpiTotal, lblKpiLowStock, lblKpiOutOfStock, lblKpiValue;
    private Button btnAddItem;
    private TextView tabAll, tabLow, tabOut;
    private EditText inputSearch;
    private ImageView btnClearSearch;
    private RecyclerView recycler;
    private ProgressBar progressLoading;
    private LinearLayout emptyState;
    private Button btnEmptyAdd;

    private InventoryAdapter adapter;
    private final List<JSONObject> allItems = new ArrayList<>();
    private final List<JSONObject> filtered = new ArrayList<>();
    private String activeTab = "ALL";
    private String searchQuery = "";
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_inventory);

        btnBack             = findViewById(R.id.btnInventoryBack);
        btnRefresh          = findViewById(R.id.btnInventoryRefresh);
        imgRefreshIcon      = findViewById(R.id.imgInventoryRefreshIcon);
        lblKpiTotal         = findViewById(R.id.lblInvKpiTotal);
        lblKpiLowStock      = findViewById(R.id.lblInvKpiLow);
        lblKpiOutOfStock    = findViewById(R.id.lblInvKpiOut);
        lblKpiValue         = findViewById(R.id.lblInvKpiValue);
        btnAddItem          = findViewById(R.id.btnAddInventoryItem);
        tabAll              = findViewById(R.id.tabInvAll);
        tabLow              = findViewById(R.id.tabInvLow);
        tabOut              = findViewById(R.id.tabInvOut);
        inputSearch         = findViewById(R.id.inputInventorySearch);
        btnClearSearch      = findViewById(R.id.btnClearInventorySearch);
        recycler            = findViewById(R.id.recyclerInventory);
        progressLoading     = findViewById(R.id.progressInventory);
        emptyState          = findViewById(R.id.emptyInventory);

        btnBack.setOnClickListener(v -> finish());
        btnRefresh.setOnClickListener(v -> { animateRefresh(); fetchInventory(true); });

        tabAll.setOnClickListener(v -> { activeTab = "ALL"; updateTabUi(); applyFilter(); });
        tabLow.setOnClickListener(v -> { activeTab = "LOW"; updateTabUi(); applyFilter(); });
        tabOut.setOnClickListener(v -> { activeTab = "OUT"; updateTabUi(); applyFilter(); });

        btnAddItem.setOnClickListener(v -> showCatalogItemSheet(null));

        inputSearch.addTextChangedListener(new TextWatcher() {
            @Override public void beforeTextChanged(CharSequence s, int b, int c, int a) {}
            @Override public void onTextChanged(CharSequence s, int b, int c, int a) {
                searchQuery = s.toString().trim().toLowerCase(Locale.ROOT);
                btnClearSearch.setVisibility(searchQuery.isEmpty() ? View.GONE : View.VISIBLE);
                applyFilter();
            }
            @Override public void afterTextChanged(Editable s) {}
        });
        btnClearSearch.setOnClickListener(v -> inputSearch.setText(""));

        adapter = new InventoryAdapter(filtered,
                item -> showReceiveStockSheet(item),
                item -> showCatalogItemSheet(item));
        recycler.setLayoutManager(new LinearLayoutManager(this));
        recycler.setAdapter(adapter);

        fetchInventory(false);
    }

    private void updateTabUi() {
        tabAll.setBackgroundResource(activeTab.equals("ALL") ? R.drawable.bg_tab_pill_active : R.drawable.bg_tab_pill_inactive);
        tabAll.setTextColor(activeTab.equals("ALL") ? 0xFFFFFFFF : 0xFF64748B);
        tabLow.setBackgroundResource(activeTab.equals("LOW") ? R.drawable.bg_tab_pill_active : R.drawable.bg_tab_pill_inactive);
        tabLow.setTextColor(activeTab.equals("LOW") ? 0xFFFFFFFF : 0xFF64748B);
        tabOut.setBackgroundResource(activeTab.equals("OUT") ? R.drawable.bg_tab_pill_active : R.drawable.bg_tab_pill_inactive);
        tabOut.setTextColor(activeTab.equals("OUT") ? 0xFFFFFFFF : 0xFF64748B);
    }

    private void animateRefresh() {
        if (imgRefreshIcon == null) return;
        RotateAnimation r = new RotateAnimation(0, 360, Animation.RELATIVE_TO_SELF, 0.5f, Animation.RELATIVE_TO_SELF, 0.5f);
        r.setDuration(600); r.setRepeatCount(1); imgRefreshIcon.startAnimation(r);
    }

    private void fetchInventory(boolean manual) {
        progressLoading.setVisibility(View.VISIBLE);
        new Thread(() -> {
            try {
                String token = getToken();
                URL url = new URL(BASE_URL + "/api/workspace/inventory/items");
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("GET");
                conn.setRequestProperty("Authorization", "Bearer " + token);
                conn.setRequestProperty("Cookie", "token=" + token + "; auth-token=" + token + "; auth_token=" + token);
                conn.setRequestProperty("Accept", "application/json");
                conn.setConnectTimeout(10000);
                conn.setReadTimeout(15000);

                int code = conn.getResponseCode();
                if (code >= 200 && code < 300) {
                    String body = read(conn.getInputStream()).trim();
                    JSONArray arr;
                    if (body.startsWith("[")) {
                        arr = new JSONArray(body);
                    } else {
                        JSONObject res = new JSONObject(body);
                        arr = res.has("items") ? res.optJSONArray("items") : (res.has("data") ? res.optJSONArray("data") : new JSONArray());
                    }

                    final List<JSONObject> fetched = new ArrayList<>();
                    if (arr != null) {
                        for (int i = 0; i < arr.length(); i++) fetched.add(arr.getJSONObject(i));
                    }

                    mainHandler.post(() -> {
                        progressLoading.setVisibility(View.GONE);
                        allItems.clear();
                        allItems.addAll(fetched);
                        bindKpis(fetched);
                        applyFilter();
                        if (manual) Toast.makeText(this, "Inventory refreshed", Toast.LENGTH_SHORT).show();
                    });
                } else {
                    mainHandler.post(() -> {
                        progressLoading.setVisibility(View.GONE);
                        emptyState.setVisibility(allItems.isEmpty() ? View.VISIBLE : View.GONE);
                    });
                }
                conn.disconnect();
            } catch (Exception e) {
                mainHandler.post(() -> {
                    progressLoading.setVisibility(View.GONE);
                    emptyState.setVisibility(allItems.isEmpty() ? View.VISIBLE : View.GONE);
                    Toast.makeText(this, "Sync Error: " + e.getMessage(), Toast.LENGTH_SHORT).show();
                });
            }
        }).start();
    }

    private void bindKpis(List<JSONObject> items) {
        int total = items.size();
        int low = 0;
        int out = 0;
        double value = 0;

        for (JSONObject it : items) {
            JSONArray batches = it.optJSONArray("batches");
            double currentQty = 0;
            if (batches != null) {
                for (int j = 0; j < batches.length(); j++) {
                    JSONObject b = batches.optJSONObject(j);
                    if (b != null) {
                        double q = b.optDouble("currentQuantity", 0);
                        currentQty += q;
                        double cost = b.optDouble("costPrice", 0);
                        value += (q * cost);
                    }
                }
            }
            double minStock = it.optDouble("minStockLevel", 10.0);
            if (currentQty <= 0) {
                out++;
            } else if (currentQty <= minStock) {
                low++;
            }
        }

        lblKpiTotal.setText(String.valueOf(total));
        lblKpiLowStock.setText(String.valueOf(low));
        lblKpiOutOfStock.setText(String.valueOf(out));
        lblKpiValue.setText("₹" + String.format(Locale.getDefault(), "%,.0f", value));
    }

    private void applyFilter() {
        filtered.clear();
        for (JSONObject item : allItems) {
            JSONArray batches = item.optJSONArray("batches");
            double totalQty = 0;
            if (batches != null) {
                for (int j = 0; j < batches.length(); j++) {
                    JSONObject b = batches.optJSONObject(j);
                    if (b != null) totalQty += b.optDouble("currentQuantity", 0);
                }
            }
            double minStock = item.optDouble("minStockLevel", 10.0);

            boolean tabMatch = activeTab.equals("ALL") ||
                    (activeTab.equals("LOW") && totalQty > 0 && totalQty <= minStock) ||
                    (activeTab.equals("OUT") && totalQty <= 0);

            String name = item.optString("name", "").toLowerCase(Locale.ROOT);
            String category = item.optString("category", "").toLowerCase(Locale.ROOT);
            String sku = item.optString("sku", "").toLowerCase(Locale.ROOT);

            boolean searchMatch = searchQuery.isEmpty() || name.contains(searchQuery) || category.contains(searchQuery) || sku.contains(searchQuery);
            if (tabMatch && searchMatch) filtered.add(item);
        }
        adapter.notifyDataSetChanged();
        boolean empty = filtered.isEmpty();
        emptyState.setVisibility(empty ? View.VISIBLE : View.GONE);
        recycler.setVisibility(empty ? View.GONE : View.VISIBLE);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  RECEIVE STOCK BOTTOM SHEET (POST /api/workspace/inventory/batches)
    // ─────────────────────────────────────────────────────────────────────────
    private void showReceiveStockSheet(JSONObject item) {
        BottomSheetDialog sheet = new BottomSheetDialog(this);
        View v = LayoutInflater.from(this).inflate(R.layout.layout_adjust_stock_sheet, null);
        sheet.setContentView(v);

        TextView lblItemName  = v.findViewById(R.id.lblAdjustStockItem);
        TextView lblCurrent   = v.findViewById(R.id.lblAdjustCurrentQty);
        EditText inputQty     = v.findViewById(R.id.inputAdjustQty);
        EditText inputReason  = v.findViewById(R.id.inputAdjustReason);
        Button btnConfirm     = v.findViewById(R.id.btnConfirmAdjust);
        ProgressBar progress  = v.findViewById(R.id.progressAdjustStock);
        TextView lblError     = v.findViewById(R.id.lblAdjustError);
        v.findViewById(R.id.btnAdjustStockClose).setOnClickListener(x -> sheet.dismiss());

        String name = item.optString("name", "Item");
        String unit = item.optString("usageUnit", item.optString("unit", "units"));

        JSONArray batches = item.optJSONArray("batches");
        double totalQty = 0;
        if (batches != null) {
            for (int i = 0; i < batches.length(); i++) {
                JSONObject b = batches.optJSONObject(i);
                if (b != null) totalQty += b.optDouble("currentQuantity", 0);
            }
        }

        lblItemName.setText(name);
        lblCurrent.setText("Current Stock: " + (int) totalQty + " " + unit);
        inputQty.setHint("Quantity to Receive (" + unit + ") *");
        inputReason.setHint("Batch / Lot Number (e.g. LOT-2026-A) *");
        btnConfirm.setText("Receive Stock Batch");

        btnConfirm.setOnClickListener(x -> {
            String qtyStr = inputQty.getText().toString().trim();
            String batchNo = inputReason.getText().toString().trim();

            if (qtyStr.isEmpty()) {
                lblError.setText("Please enter received quantity.");
                lblError.setVisibility(View.VISIBLE);
                return;
            }
            double qty;
            try {
                qty = Double.parseDouble(qtyStr);
                if (qty <= 0) throw new Exception();
            } catch (Exception e) {
                lblError.setText("Enter a valid positive number.");
                lblError.setVisibility(View.VISIBLE);
                return;
            }

            if (batchNo.isEmpty()) {
                SimpleDateFormat sdf = new SimpleDateFormat("yyyyMMdd", Locale.getDefault());
                batchNo = "LOT-" + sdf.format(new Date());
            }

            lblError.setVisibility(View.GONE);
            btnConfirm.setEnabled(false);
            btnConfirm.setText("");
            progress.setVisibility(View.VISIBLE);

            final String finalBatchNo = batchNo;
            final double finalQty = qty;

            new Thread(() -> {
                try {
                    String token = getToken();
                    URL url = new URL(BASE_URL + "/api/workspace/inventory/batches");
                    HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                    conn.setRequestMethod("POST");
                    conn.setRequestProperty("Authorization", "Bearer " + token);
                    conn.setRequestProperty("Cookie", "token=" + token + "; auth-token=" + token + "; auth_token=" + token);
                    conn.setRequestProperty("Content-Type", "application/json");
                    conn.setRequestProperty("Accept", "application/json");
                    conn.setDoOutput(true);

                    Calendar cal = Calendar.getInstance();
                    cal.add(Calendar.YEAR, 1);
                    SimpleDateFormat df = new SimpleDateFormat("yyyy-MM-dd", Locale.getDefault());
                    String expDate = df.format(cal.getTime());

                    JSONObject payload = new JSONObject();
                    payload.put("itemId", item.optString("id"));
                    payload.put("batchNumber", finalBatchNo);
                    payload.put("quantity", finalQty);
                    payload.put("expiryDate", expDate);

                    OutputStream os = conn.getOutputStream();
                    os.write(payload.toString().getBytes(StandardCharsets.UTF_8));
                    os.flush();
                    os.close();

                    int code = conn.getResponseCode();
                    mainHandler.post(() -> {
                        progress.setVisibility(View.GONE);
                        btnConfirm.setEnabled(true);
                        btnConfirm.setText("Receive Stock Batch");
                        if (code >= 200 && code < 300) {
                            sheet.dismiss();
                            fetchInventory(false);
                            Toast.makeText(this, "Stock received successfully!", Toast.LENGTH_SHORT).show();
                        } else {
                            lblError.setText("Failed to receive stock (" + code + ")");
                            lblError.setVisibility(View.VISIBLE);
                        }
                    });
                    conn.disconnect();
                } catch (Exception e) {
                    mainHandler.post(() -> {
                        progress.setVisibility(View.GONE);
                        btnConfirm.setEnabled(true);
                        btnConfirm.setText("Receive Stock Batch");
                        lblError.setText("Error: " + e.getMessage());
                        lblError.setVisibility(View.VISIBLE);
                    });
                }
            }).start();
        });

        sheet.show();
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  ADD / EDIT CATALOG ITEM SHEET (POST/PUT /api/workspace/inventory/items)
    // ─────────────────────────────────────────────────────────────────────────
    private void showCatalogItemSheet(JSONObject existing) {
        BottomSheetDialog sheet = new BottomSheetDialog(this);
        View v = LayoutInflater.from(this).inflate(R.layout.layout_inventory_item_sheet, null);
        sheet.setContentView(v);

        TextView sheetTitle    = v.findViewById(R.id.lblInvItemSheetTitle);
        EditText inputName     = v.findViewById(R.id.inputInvItemName);
        EditText inputCategory = v.findViewById(R.id.inputInvItemCategory);
        EditText inputUnit     = v.findViewById(R.id.inputInvItemUnit);
        EditText inputQty      = v.findViewById(R.id.inputInvItemQty);
        EditText inputReorder  = v.findViewById(R.id.inputInvItemReorder);
        EditText inputPrice    = v.findViewById(R.id.inputInvItemPrice);
        EditText inputSupplier = v.findViewById(R.id.inputInvItemSupplier);
        Button btnSave         = v.findViewById(R.id.btnSaveInvItem);
        ProgressBar progress   = v.findViewById(R.id.progressSaveInvItem);
        TextView lblError      = v.findViewById(R.id.lblInvItemError);
        v.findViewById(R.id.btnInvItemSheetClose).setOnClickListener(x -> sheet.dismiss());

        boolean isEdit = existing != null;
        sheetTitle.setText(isEdit ? "Edit Catalog Item" : "Add Catalog Item");
        inputUnit.setHint("Usage Unit * (e.g. ml, tests, pcs, vials)");
        inputReorder.setHint("Min Alert Stock Level (e.g. 10)");

        if (isEdit) {
            inputName.setText(existing.optString("name"));
            inputCategory.setText(existing.optString("category"));
            inputUnit.setText(existing.optString("usageUnit", existing.optString("unit", "pcs")));
            inputReorder.setText(String.valueOf(existing.optInt("minStockLevel", 10)));
            inputPrice.setText(existing.optString("sku", ""));
            inputPrice.setHint("SKU / Item Code");
            inputSupplier.setText(existing.optString("purchaseUnit", "Box"));
            inputSupplier.setHint("Purchase Unit (Box, Pack)");
            if (inputQty != null) inputQty.setVisibility(View.GONE);
        } else {
            inputPrice.setHint("SKU / Item Code (optional)");
            inputSupplier.setHint("Purchase Unit (e.g. Box, Pack)");
            if (inputQty != null) inputQty.setVisibility(View.GONE);
        }
        btnSave.setText(isEdit ? "Update Catalog Item" : "Save Catalog Item");

        btnSave.setOnClickListener(x -> {
            String name = inputName.getText().toString().trim();
            String category = inputCategory.getText().toString().trim();
            String usageUnit = inputUnit.getText().toString().trim();
            String sku = inputPrice.getText().toString().trim();
            String purchaseUnit = inputSupplier.getText().toString().trim();
            String reorderStr = inputReorder.getText().toString().trim();

            if (name.isEmpty() || usageUnit.isEmpty()) {
                lblError.setText("Item name and usage unit are required.");
                lblError.setVisibility(View.VISIBLE);
                return;
            }

            int minStock = 10;
            try { minStock = Integer.parseInt(reorderStr); } catch (Exception ignored) {}

            lblError.setVisibility(View.GONE);
            btnSave.setEnabled(false);
            btnSave.setText("");
            progress.setVisibility(View.VISIBLE);

            final int finalMinStock = minStock;
            new Thread(() -> {
                try {
                    String token = getToken();
                    String ep = isEdit ? BASE_URL + "/api/workspace/inventory/items/" + existing.optString("id") : BASE_URL + "/api/workspace/inventory/items";
                    URL url = new URL(ep);
                    HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                    conn.setRequestMethod(isEdit ? "PUT" : "POST");
                    conn.setRequestProperty("Authorization", "Bearer " + token);
                    conn.setRequestProperty("Cookie", "token=" + token + "; auth-token=" + token + "; auth_token=" + token);
                    conn.setRequestProperty("Content-Type", "application/json");
                    conn.setDoOutput(true);

                    JSONObject p2 = new JSONObject();
                    p2.put("name", name);
                    p2.put("category", category);
                    p2.put("usageUnit", usageUnit);
                    p2.put("purchaseUnit", purchaseUnit.isEmpty() ? "Box" : purchaseUnit);
                    p2.put("conversionFactor", 1);
                    p2.put("minStockLevel", finalMinStock);
                    if (!sku.isEmpty()) p2.put("sku", sku);

                    OutputStream os = conn.getOutputStream();
                    os.write(p2.toString().getBytes(StandardCharsets.UTF_8));
                    os.flush();
                    os.close();

                    int code = conn.getResponseCode();
                    mainHandler.post(() -> {
                        progress.setVisibility(View.GONE);
                        btnSave.setEnabled(true);
                        btnSave.setText(isEdit ? "Update Catalog Item" : "Save Catalog Item");
                        if (code >= 200 && code < 300) {
                            sheet.dismiss();
                            fetchInventory(false);
                            Toast.makeText(this, isEdit ? "Item updated successfully" : "Catalog item added", Toast.LENGTH_SHORT).show();
                        } else {
                            lblError.setText("Failed (" + code + ")");
                            lblError.setVisibility(View.VISIBLE);
                        }
                    });
                    conn.disconnect();
                } catch (Exception e) {
                    mainHandler.post(() -> {
                        progress.setVisibility(View.GONE);
                        btnSave.setEnabled(true);
                        btnSave.setText(isEdit ? "Update Catalog Item" : "Save Catalog Item");
                        lblError.setText("Error: " + e.getMessage());
                        lblError.setVisibility(View.VISIBLE);
                    });
                }
            }).start();
        });

        sheet.show();
    }

    private String getToken() {
        String t = AuthManager.getToken(this);
        if (t != null && !t.isEmpty()) return t;
        try {
            CookieManager cm = CookieManager.getInstance();
            String c = cm.getCookie(BASE_URL);
            if (c != null) {
                for (String p : c.split(";")) {
                    String tr = p.trim();
                    if (tr.startsWith("token=") || tr.startsWith("auth-token=") || tr.startsWith("auth_token=")) {
                        String val = tr.substring(tr.indexOf('=') + 1).trim();
                        if (!val.isEmpty()) return val;
                    }
                }
            }
        } catch (Exception ignored) {}
        try {
            return getSharedPreferences("patholab_prefs", Context.MODE_PRIVATE).getString("auth_token", "");
        } catch (Exception ignored) {
            return "";
        }
    }

    private String read(InputStream is) throws Exception {
        if (is == null) return "";
        BufferedReader r = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8));
        StringBuilder sb = new StringBuilder();
        String l;
        while ((l = r.readLine()) != null) sb.append(l);
        return sb.toString();
    }

    interface OnItemAction { void onAction(JSONObject item); }

    static class InventoryAdapter extends RecyclerView.Adapter<InventoryAdapter.VH> {
        private final List<JSONObject> list;
        private final OnItemAction onAdjust, onEdit;

        InventoryAdapter(List<JSONObject> list, OnItemAction onAdjust, OnItemAction onEdit) {
            this.list = list; this.onAdjust = onAdjust; this.onEdit = onEdit;
        }

        @NonNull @Override
        public VH onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
            View v = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_inventory_card, parent, false);
            return new VH(v);
        }

        @Override
        public void onBindViewHolder(@NonNull VH h, int pos) {
            JSONObject it = list.get(pos);
            String name = it.optString("name", "Item");
            String cat  = it.optString("category", "General");
            String unit = it.optString("usageUnit", it.optString("unit", "units"));
            double minStock = it.optDouble("minStockLevel", 10.0);

            JSONArray batches = it.optJSONArray("batches");
            double totalQty = 0;
            if (batches != null) {
                for (int j = 0; j < batches.length(); j++) {
                    JSONObject b = batches.optJSONObject(j);
                    if (b != null) totalQty += b.optDouble("currentQuantity", 0);
                }
            }

            h.lblName.setText(name);
            h.lblCat.setText(cat.isEmpty() ? "GENERAL" : cat.toUpperCase(Locale.ROOT));

            String qtyStr = String.format(Locale.getDefault(), totalQty % 1 == 0 ? "%.0f" : "%.1f", totalQty);
            h.lblQty.setText(qtyStr);
            h.lblUnit.setText(unit);
            h.lblReorder.setText("Alert: " + (int) minStock + " " + unit);

            int batchCount = batches != null ? batches.length() : 0;
            h.lblPrice.setText(batchCount + " " + (batchCount == 1 ? "Batch" : "Batches"));

            if (totalQty <= 0) {
                h.lblStatus.setText("OUT OF STOCK");
                h.lblStatus.setBackgroundResource(R.drawable.bg_status_cancelled);
                h.lblStatus.setTextColor(0xFFDC2626);
            } else if (totalQty <= minStock) {
                h.lblStatus.setText("LOW STOCK");
                h.lblStatus.setBackgroundResource(R.drawable.bg_status_pending);
                h.lblStatus.setTextColor(0xFFD97706);
            } else {
                h.lblStatus.setText("IN STOCK");
                h.lblStatus.setBackgroundResource(R.drawable.bg_status_ready);
                h.lblStatus.setTextColor(0xFF059669);
            }

            h.btnAdjust.setText("+ Receive Stock");
            h.btnAdjust.setOnClickListener(v -> onAdjust.onAction(it));
            h.btnEdit.setOnClickListener(v -> onEdit.onAction(it));
        }

        @Override public int getItemCount() { return list.size(); }

        static class VH extends RecyclerView.ViewHolder {
            TextView lblName, lblCat, lblStatus, lblQty, lblUnit, lblReorder, lblPrice, btnAdjust, btnEdit;
            VH(View v) {
                super(v);
                lblName    = v.findViewById(R.id.lblInvName);
                lblCat     = v.findViewById(R.id.lblInvCategory);
                lblStatus  = v.findViewById(R.id.lblInvStatus);
                lblQty     = v.findViewById(R.id.lblInvQty);
                lblUnit    = v.findViewById(R.id.lblInvUnit);
                lblReorder = v.findViewById(R.id.lblInvReorder);
                lblPrice   = v.findViewById(R.id.lblInvPrice);
                btnAdjust  = v.findViewById(R.id.btnInvAdjust);
                btnEdit    = v.findViewById(R.id.btnInvEdit);
            }
        }
    }
}
