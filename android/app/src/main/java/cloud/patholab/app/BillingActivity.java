package cloud.patholab.app;

import android.content.Intent;
import android.graphics.Typeface;
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

import com.google.android.material.bottomsheet.BottomSheetBehavior;
import com.google.android.material.bottomsheet.BottomSheetDialog;
import com.google.android.material.button.MaterialButton;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;

import cloud.patholab.app.auth.AuthManager;

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  BillingActivity — Ultra-Sleek Native Financial Ledger & Invoicing Console
 * ═══════════════════════════════════════════════════════════════════════════
 */
public class BillingActivity extends AppCompatActivity {

    private static final String BASE_URL = "https://app.patholab.cloud";

    private FrameLayout btnBillingBack;
    private LinearLayout btnNewInvoiceHeader;
    private TextView lblBillingSubtitle;
    private TextView lblKpiTotalRevenue, lblKpiMonthlyRevenue, lblKpiSettledCount, lblKpiTotalInvoicesCount;
    private EditText inputSearchInvoices;
    private ImageView btnClearSearchInvoices;
    private LinearLayout containerBillingFilterChips;
    private ProgressBar progressBilling;
    private RecyclerView recyclerInvoicesList;
    private LinearLayout emptyStateBilling;

    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private final List<InvoiceItem> allInvoices = new ArrayList<>();
    private final List<InvoiceItem> filteredInvoices = new ArrayList<>();
    private InvoicesAdapter invoicesAdapter;

    private String selectedStatusFilter = "ALL";

    private boolean hasServerStats = false;
    private double sTotalRev, sMonthlyRev;
    private int sSettledCnt, sTotalInvoicesCnt;

    public static class InvoiceItem {
        public String id;
        public String invoiceNumber;
        public String patientName;
        public String patientDetails;
        public String dateLogged;
        public String paymentMethod;
        public String paymentStatus; // PAID, PENDING, OVERDUE, CANCELLED
        public double grandTotal;
        public double paidAmount;
        public double balanceDue;
        public double discount;
        public double subtotal;
        public List<InvoiceTestLine> items = new ArrayList<>();

        public InvoiceItem(String id, String invoiceNumber, String patientName, String patientDetails,
                           String dateLogged, String paymentMethod, String paymentStatus,
                           double grandTotal, double paidAmount, double balanceDue, double discount, double subtotal) {
            this.id = id;
            this.invoiceNumber = invoiceNumber;
            this.patientName = patientName;
            this.patientDetails = patientDetails;
            this.dateLogged = dateLogged;
            this.paymentMethod = paymentMethod;
            this.paymentStatus = paymentStatus;
            this.grandTotal = grandTotal;
            this.paidAmount = paidAmount;
            this.balanceDue = balanceDue;
            this.discount = discount;
            this.subtotal = subtotal;
        }
    }

    public static class InvoiceTestLine {
        public String testName;
        public double price;

        public InvoiceTestLine(String testName, double price) {
            this.testName = testName;
            this.price = price;
        }
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        StatusBarHelper.setStatusBarSapphire(this);
        setContentView(R.layout.activity_billing);

        initViews();
        setupEvents();
        setupFilterChips();
        fetchLoggedInUserInfo();
        fetchInvoices();
    }

    private void initViews() {
        btnBillingBack = findViewById(R.id.btnBillingBack);
        btnNewInvoiceHeader = (LinearLayout) findViewById(R.id.btnNewInvoiceHeader);
        lblBillingSubtitle = findViewById(R.id.lblBillingSubtitle);
        lblKpiTotalRevenue = findViewById(R.id.lblKpiTotalRevenue);
        lblKpiMonthlyRevenue = findViewById(R.id.lblKpiMonthlyRevenue);
        lblKpiSettledCount = findViewById(R.id.lblKpiSettledCount);
        lblKpiTotalInvoicesCount = findViewById(R.id.lblKpiTotalInvoicesCount);
        inputSearchInvoices = findViewById(R.id.inputSearchInvoices);
        btnClearSearchInvoices = findViewById(R.id.btnClearSearchInvoices);
        containerBillingFilterChips = findViewById(R.id.containerBillingFilterChips);
        progressBilling = findViewById(R.id.progressBilling);
        recyclerInvoicesList = findViewById(R.id.recyclerInvoicesList);
        emptyStateBilling = findViewById(R.id.emptyStateBilling);

        Typeface boldTf = Typeface.create("sans-serif-black", Typeface.BOLD);
        if (lblKpiTotalRevenue != null) lblKpiTotalRevenue.setTypeface(boldTf);
        if (lblKpiMonthlyRevenue != null) lblKpiMonthlyRevenue.setTypeface(boldTf);
        if (lblKpiSettledCount != null) lblKpiSettledCount.setTypeface(boldTf);
        if (lblKpiTotalInvoicesCount != null) lblKpiTotalInvoicesCount.setTypeface(boldTf);

        recyclerInvoicesList.setLayoutManager(new LinearLayoutManager(this));
        invoicesAdapter = new InvoicesAdapter(filteredInvoices, this::showInvoiceDetailModal);
        recyclerInvoicesList.setAdapter(invoicesAdapter);
    }

    private void setupEvents() {
        btnBillingBack.setOnClickListener(v -> finish());

        btnNewInvoiceHeader.setOnClickListener(v -> {
            // Launch Native Registration
            Intent intent = new Intent(this, RegistrationActivity.class);
            startActivity(intent);
        });

        btnClearSearchInvoices.setOnClickListener(v -> {
            inputSearchInvoices.setText("");
            btnClearSearchInvoices.setVisibility(View.GONE);
            applyInvoicesFilter();
        });

        inputSearchInvoices.addTextChangedListener(new TextWatcher() {
            @Override
            public void beforeTextChanged(CharSequence s, int start, int count, int after) {}

            @Override
            public void onTextChanged(CharSequence s, int start, int before, int count) {
                btnClearSearchInvoices.setVisibility(s.length() > 0 ? View.VISIBLE : View.GONE);
                applyInvoicesFilter();
            }

            @Override
            public void afterTextChanged(Editable s) {}
        });
    }

    private void setupFilterChips() {
        containerBillingFilterChips.removeAllViews();
        String[] filters = {"ALL", "PAID", "PENDING", "OVERDUE"};
        String[] labels = {"All Transactions", "Settled (PAID)", "Pending Balance", "Delinquent / Overdue"};

        for (int i = 0; i < filters.length; i++) {
            final String filterKey = filters[i];
            TextView chip = new TextView(this);
            chip.setText(labels[i]);
            chip.setTextSize(12.5f);
            chip.setPadding(dp(14), dp(7), dp(14), dp(7));
            chip.setTypeface(null, android.graphics.Typeface.BOLD);

            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.WRAP_CONTENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
            );
            lp.setMarginEnd(dp(8));
            chip.setLayoutParams(lp);

            updateChipStyle(chip, filterKey.equals(selectedStatusFilter));

            chip.setOnClickListener(v -> {
                selectedStatusFilter = filterKey;
                setupFilterChips();
                applyInvoicesFilter();
            });

            containerBillingFilterChips.addView(chip);
        }
    }

    private void updateChipStyle(TextView chip, boolean isSelected) {
        if (isSelected) {
            chip.setBackgroundResource(R.drawable.bg_pill_white);
            chip.setBackgroundTintList(android.content.res.ColorStateList.valueOf(0xFF0D6EFD));
            chip.setTextColor(0xFFFFFFFF);
            chip.setElevation(dp(2));
        } else {
            chip.setBackgroundResource(R.drawable.bg_setting_item);
            chip.setBackgroundTintList(null);
            chip.setTextColor(0xFF475569);
            chip.setElevation(0);
        }
    }

    private String getAuthToken() {
        String token = AuthManager.getToken(this);
        if (token != null && !token.isEmpty()) return token;

        try {
            android.webkit.CookieManager cm = android.webkit.CookieManager.getInstance();
            String cookies = cm.getCookie(BASE_URL);
            if (cookies == null) cookies = cm.getCookie("https://app.patholab.cloud");
            if (cookies == null) cookies = cm.getCookie("https://patholab.cloud");
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
        return null;
    }

    private void fetchLoggedInUserInfo() {
        new Thread(() -> {
            try {
                String token = getAuthToken();
                if (token == null) return;
                URL url = new URL(BASE_URL + "/api/auth/me");
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestProperty("Authorization", "Bearer " + token);
                conn.setRequestProperty("Cookie", "token=" + token);
                conn.setConnectTimeout(5000);
                conn.setReadTimeout(5000);

                if (conn.getResponseCode() == 200) {
                    String json = readStream(conn.getInputStream());
                    JSONObject obj = new JSONObject(json);
                    String name = obj.optString("name", "Lab Owner");
                    String labName = "PathoLab Cloud";
                    JSONObject lab = obj.optJSONObject("lab");
                    if (lab != null) {
                        labName = lab.optString("name", "PathoLab Cloud");
                    }
                    String finalLabName = labName;
                    String finalUserName = name;
                    mainHandler.post(() -> {
                        if (lblBillingSubtitle != null) {
                            lblBillingSubtitle.setText(finalLabName + " • " + finalUserName);
                        }
                    });
                }
            } catch (Exception ignored) {}
        }).start();
    }

    private void fetchInvoices() {
        progressBilling.setVisibility(View.VISIBLE);
        new Thread(() -> {
            try {
                String token = getAuthToken();
                URL url = new URL(BASE_URL + "/api/workspace/invoices");
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                if (token != null) {
                    conn.setRequestProperty("Authorization", "Bearer " + token);
                    conn.setRequestProperty("Cookie", "token=" + token);
                } else {
                    android.webkit.CookieManager cm = android.webkit.CookieManager.getInstance();
                    String cookie = cm.getCookie(BASE_URL);
                    if (cookie != null) conn.setRequestProperty("Cookie", cookie);
                }
                conn.setConnectTimeout(8000);
                conn.setReadTimeout(8000);

                if (conn.getResponseCode() == 200) {
                    String res = readStream(conn.getInputStream());
                    JSONObject obj = new JSONObject(res);

                    // Parse Stats
                    JSONObject stats = obj.optJSONObject("stats");
                    if (stats != null) {
                        sTotalRev = stats.optDouble("totalRevenue", 0);
                        sMonthlyRev = stats.optDouble("monthlyRevenue", 0);
                        sSettledCnt = stats.optInt("settledCount", stats.optInt("paidCount", 0));
                        sTotalInvoicesCnt = stats.optInt("totalCount", stats.optInt("invoiceCount", 0));
                        hasServerStats = true;
                    }

                    // Parse Invoices
                    JSONArray invoicesArr = obj.optJSONArray("invoices");
                    allInvoices.clear();
                    if (invoicesArr != null) {
                        for (int i = 0; i < invoicesArr.length(); i++) {
                            JSONObject inv = invoicesArr.getJSONObject(i);
                            JSONObject p = inv.optJSONObject("patient");
                            String pName = p != null ? p.optString("name", "Walk-in Patient") : "Walk-in Patient";
                            String pPhone = p != null ? p.optString("phone", "") : "";
                            int pAge = p != null ? p.optInt("age", 0) : 0;
                            String pGender = p != null ? p.optString("gender", "") : "";

                            String details = (pAge > 0 ? pAge + "Y" : "");
                            if (!pGender.isEmpty()) {
                                details = details.isEmpty() ? pGender : (details + " • " + pGender);
                            }
                            if (!pPhone.isEmpty()) {
                                details = details.isEmpty() ? pPhone : (details + " • " + pPhone);
                            }
                            if (details.isEmpty()) {
                                details = "General Patient";
                            }

                            String dateStr = inv.optString("createdAt", "");
                            String formattedDate = formatDate(dateStr);

                            double grandTotal = inv.optDouble("grandTotal", inv.optDouble("total", 0));
                            double paid = inv.optDouble("paidAmount", 0);
                            double bal = inv.optDouble("balance", Math.max(0, grandTotal - paid));
                            double discount = inv.optDouble("discount", 0);
                            double subtotal = inv.optDouble("subtotal", grandTotal + discount);

                            InvoiceItem item = new InvoiceItem(
                                    inv.optString("id"),
                                    inv.optString("invoiceNumber", "INV-" + (1000 + i)),
                                    pName,
                                    details,
                                    formattedDate,
                                    inv.optString("paymentMethod", "UPI"),
                                    inv.optString("paymentStatus", bal == 0 ? "PAID" : "PENDING"),
                                    grandTotal,
                                    paid,
                                    bal,
                                    discount,
                                    subtotal
                            );

                            JSONArray itemsArr = inv.optJSONArray("items");
                            if (itemsArr != null) {
                                for (int j = 0; j < itemsArr.length(); j++) {
                                    JSONObject it = itemsArr.getJSONObject(j);
                                    String lineName = it.optString("description", it.optString("name", it.optString("testName", "Diagnostic Test")));
                                    double linePrice = it.optDouble("total", it.optDouble("unitPrice", it.optDouble("price", 0)));
                                    item.items.add(new InvoiceTestLine(lineName, linePrice));
                                }
                            }

                            allInvoices.add(item);
                        }
                    }
                } else {
                    allInvoices.clear();
                }
            } catch (Exception ignored) {
                allInvoices.clear();
            }

            mainHandler.post(() -> {
                progressBilling.setVisibility(View.GONE);
                computeAndApplyKpis();
                applyInvoicesFilter();
            });
        }).start();
    }

    private void computeAndApplyKpis() {
        double totalRev = 0;
        double monthlyRev = 0;
        int settledCnt = 0;
        int totalCnt = allInvoices.size();

        if (hasServerStats) {
            totalRev = sTotalRev;
            monthlyRev = sMonthlyRev;
            if (sSettledCnt > 0) settledCnt = sSettledCnt;
            if (sTotalInvoicesCnt > 0) totalCnt = sTotalInvoicesCnt;
        }

        for (InvoiceItem inv : allInvoices) {
            if (!hasServerStats) {
                totalRev += inv.paidAmount;
            }
            if (!hasServerStats && "PAID".equalsIgnoreCase(inv.paymentStatus)) {
                settledCnt++;
            }
        }
        if (!hasServerStats) {
            monthlyRev = totalRev;
        }
        updateKpiCards(totalRev, monthlyRev, settledCnt, totalCnt);
    }

    private void updateKpiCards(double totalRev, double monthlyRev, int settledCnt, int totalCnt) {
        if (lblKpiTotalRevenue != null) lblKpiTotalRevenue.setText(String.format(Locale.getDefault(), "₹ %,.0f", totalRev));
        if (lblKpiMonthlyRevenue != null) lblKpiMonthlyRevenue.setText(String.format(Locale.getDefault(), "₹ %,.0f", monthlyRev));
        if (lblKpiSettledCount != null) lblKpiSettledCount.setText(String.valueOf(settledCnt));
        if (lblKpiTotalInvoicesCount != null) lblKpiTotalInvoicesCount.setText(String.valueOf(totalCnt));
    }

    private void applyInvoicesFilter() {
        String q = inputSearchInvoices.getText().toString().trim().toLowerCase();
        filteredInvoices.clear();

        for (InvoiceItem item : allInvoices) {
            boolean matchesSearch = q.isEmpty() ||
                    item.invoiceNumber.toLowerCase().contains(q) ||
                    item.patientName.toLowerCase().contains(q) ||
                    item.patientDetails.toLowerCase().contains(q);

            boolean matchesStatus = selectedStatusFilter.equals("ALL") ||
                    item.paymentStatus.equalsIgnoreCase(selectedStatusFilter);

            if (matchesSearch && matchesStatus) {
                filteredInvoices.add(item);
            }
        }

        invoicesAdapter.notifyDataSetChanged();
        emptyStateBilling.setVisibility(filteredInvoices.isEmpty() ? View.VISIBLE : View.GONE);
        recyclerInvoicesList.setVisibility(filteredInvoices.isEmpty() ? View.GONE : View.VISIBLE);
    }

    private void showInvoiceDetailModal(InvoiceItem item) {
        BottomSheetDialog dialog = new BottomSheetDialog(this);
        View sheet = getLayoutInflater().inflate(R.layout.layout_invoice_detail_sheet, null);
        dialog.setContentView(sheet);

        BottomSheetBehavior<View> behavior = BottomSheetBehavior.from((View) sheet.getParent());
        behavior.setState(BottomSheetBehavior.STATE_EXPANDED);

        TextView lblInvNum = sheet.findViewById(R.id.lblSheetInvoiceNumber);
        TextView lblInvDate = sheet.findViewById(R.id.lblSheetInvoiceDate);
        TextView lblPatientName = sheet.findViewById(R.id.lblSheetPatientName);
        TextView lblPatientMeta = sheet.findViewById(R.id.lblSheetPatientMeta);
        LinearLayout containerItems = sheet.findViewById(R.id.containerInvoiceItemsList);
        TextView lblSubtotal = sheet.findViewById(R.id.lblSheetSubtotal);
        LinearLayout rowDiscount = sheet.findViewById(R.id.rowSheetDiscount);
        TextView lblDiscount = sheet.findViewById(R.id.lblSheetDiscount);
        TextView lblGrandTotal = sheet.findViewById(R.id.lblSheetGrandTotal);
        TextView lblPaid = sheet.findViewById(R.id.lblSheetPaidAmount);
        MaterialButton btnDone = sheet.findViewById(R.id.btnDoneInvoiceDetail);
        FrameLayout btnClose = sheet.findViewById(R.id.btnCloseInvoiceSheet);

        lblInvNum.setText("Invoice #" + item.invoiceNumber);
        lblInvDate.setText("Logged: " + item.dateLogged + " • Mode: " + item.paymentMethod);
        lblPatientName.setText(item.patientName);
        lblPatientMeta.setText(item.patientDetails);

        // Populate test items
        containerItems.removeAllViews();
        for (InvoiceTestLine line : item.items) {
            LinearLayout row = new LinearLayout(this);
            row.setOrientation(LinearLayout.HORIZONTAL);
            row.setPadding(0, dp(4), 0, dp(4));

            TextView name = new TextView(this);
            name.setText("• " + line.testName);
            name.setTextSize(13f);
            name.setTextColor(0xFF334155);
            LinearLayout.LayoutParams lpName = new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f);
            name.setLayoutParams(lpName);

            TextView price = new TextView(this);
            price.setText(String.format(Locale.getDefault(), "₹ %,.2f", line.price));
            price.setTextSize(13f);
            price.setTypeface(null, android.graphics.Typeface.BOLD);
            price.setTextColor(0xFF0F172A);

            row.addView(name);
            row.addView(price);
            containerItems.addView(row);
        }

        lblSubtotal.setText(String.format(Locale.getDefault(), "₹ %,.2f", item.subtotal));

        if (item.discount > 0) {
            rowDiscount.setVisibility(View.VISIBLE);
            lblDiscount.setText(String.format(Locale.getDefault(), "- ₹ %,.2f", item.discount));
        } else {
            rowDiscount.setVisibility(View.GONE);
        }

        lblGrandTotal.setText(String.format(Locale.getDefault(), "₹ %,.2f", item.grandTotal));
        lblPaid.setText(String.format(Locale.getDefault(), "Paid: ₹ %,.2f", item.paidAmount));

        btnClose.setOnClickListener(v -> dialog.dismiss());
        btnDone.setOnClickListener(v -> dialog.dismiss());

        dialog.show();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Adapter
    // ─────────────────────────────────────────────────────────────────────────
    public static class InvoicesAdapter extends RecyclerView.Adapter<InvoicesAdapter.InvoiceViewHolder> {
        private final List<InvoiceItem> items;
        private final OnInvoiceClickListener listener;

        public interface OnInvoiceClickListener {
            void onInvoiceClick(InvoiceItem item);
        }

        public InvoicesAdapter(List<InvoiceItem> items, OnInvoiceClickListener listener) {
            this.items = items;
            this.listener = listener;
        }

        @NonNull
        @Override
        public InvoiceViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
            View v = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_billing_invoice_card, parent, false);
            return new InvoiceViewHolder(v);
        }

        @Override
        public void onBindViewHolder(@NonNull InvoiceViewHolder holder, int position) {
            InvoiceItem item = items.get(position);
            holder.lblPatientName.setText(item.patientName);
            holder.lblPatientDetails.setText(item.patientDetails);
            holder.lblInvoiceNumber.setText(item.invoiceNumber);
            holder.lblDate.setText("" + item.dateLogged);
            holder.lblPaymentMethod.setText("💳 " + item.paymentMethod);
            holder.lblTotal.setText(String.format(Locale.getDefault(), "₹ %,.2f", item.grandTotal));

            // Status Badge & Accent styling
            holder.lblStatusBadge.setText(item.paymentStatus);
            holder.lblStatusBadge.setBackgroundTintList(null);

            if ("PAID".equalsIgnoreCase(item.paymentStatus)) {
                holder.lblStatusBadge.setBackgroundResource(R.drawable.bg_badge_status_paid);
                holder.lblStatusBadge.setTextColor(0xFF047857);
                if (holder.accentStrip != null) holder.accentStrip.setBackgroundColor(0xFF10B981);
            } else if ("OVERDUE".equalsIgnoreCase(item.paymentStatus)) {
                holder.lblStatusBadge.setBackgroundResource(R.drawable.bg_badge_status_overdue);
                holder.lblStatusBadge.setTextColor(0xFFBE123C);
                if (holder.accentStrip != null) holder.accentStrip.setBackgroundColor(0xFFEF4444);
            } else {
                holder.lblStatusBadge.setBackgroundResource(R.drawable.bg_badge_status_pending);
                holder.lblStatusBadge.setTextColor(0xFFB45309);
                if (holder.accentStrip != null) holder.accentStrip.setBackgroundColor(0xFFF59E0B);
            }

            holder.btnViewReceipt.setOnClickListener(v -> {
                if (listener != null) listener.onInvoiceClick(item);
            });

            holder.itemView.setOnClickListener(v -> {
                if (listener != null) listener.onInvoiceClick(item);
            });
        }

        @Override
        public int getItemCount() {
            return items.size();
        }

        static class InvoiceViewHolder extends RecyclerView.ViewHolder {
            View accentStrip;
            TextView lblPatientName, lblPatientDetails, lblInvoiceNumber, lblDate, lblPaymentMethod, lblStatusBadge, lblTotal;
            MaterialButton btnViewReceipt;

            InvoiceViewHolder(@NonNull View itemView) {
                super(itemView);
                accentStrip = itemView.findViewById(R.id.invoiceAccentStrip);
                lblPatientName = itemView.findViewById(R.id.lblInvoicePatientName);
                lblPatientDetails = itemView.findViewById(R.id.lblInvoicePatientDetails);
                lblInvoiceNumber = itemView.findViewById(R.id.lblInvoiceNumber);
                lblDate = itemView.findViewById(R.id.lblInvoiceDate);
                lblPaymentMethod = itemView.findViewById(R.id.lblInvoicePaymentMethod);
                lblStatusBadge = itemView.findViewById(R.id.lblInvoiceStatusBadge);
                lblTotal = itemView.findViewById(R.id.lblInvoiceTotal);
                btnViewReceipt = itemView.findViewById(R.id.btnViewInvoiceReceipt);
            }
        }
    }

    private int dp(float value) {
        return (int) (value * getResources().getDisplayMetrics().density + 0.5f);
    }

    private String formatDate(String iso) {
        try {
            SimpleDateFormat inFmt = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
            Date d = inFmt.parse(iso);
            if (d != null) {
                SimpleDateFormat outFmt = new SimpleDateFormat("dd MMM, hh:mm a", Locale.getDefault());
                return outFmt.format(d);
            }
        } catch (Exception ignored) {}
        return "Recent";
    }

    private String readStream(InputStream is) throws Exception {
        BufferedReader reader = new BufferedReader(new InputStreamReader(is));
        StringBuilder sb = new StringBuilder();
        String line;
        while ((line = reader.readLine()) != null) sb.append(line);
        reader.close();
        return sb.toString();
    }
}
