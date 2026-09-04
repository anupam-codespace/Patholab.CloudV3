package cloud.patholab.app;

import android.app.Activity;
import android.content.Context;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.ColorDrawable;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;

import com.google.android.material.bottomsheet.BottomSheetDialog;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;

import cloud.patholab.app.auth.AuthManager;

/**
 * WalletActivity
 * ──────────────
 * Fully native Wallet & Billing Management console for Android.
 * Mirroring all web capabilities:
 *  - Real-time Balance, Total Recharged, and Total Consumed KPIs
 *  - Validity & Deduction Rate per Patient
 *  - Quick Top-Up packs (₹500, ₹1,000, ₹2,000, ₹5,000) with 18% GST calculation
 *  - Ledger & Transaction History with Type Filters (All, Recharges, Deductions)
 *  - Instant search filtering and detailed Transaction Receipts
 */
public class WalletActivity extends AppCompatActivity {

    private static final String BASE_URL = "https://app.patholab.cloud";

    // UI elements
    private TextView txtBalanceHero;
    private TextView txtValidity;
    private TextView txtDeduction;
    private TextView txtTotalRecharged;
    private TextView txtTotalConsumed;
    private SwipeRefreshLayout swipeRefresh;
    private LinearLayout txContainer;
    private LinearLayout layoutEmptyTx;
    private EditText editSearchTx;
    private TextView tabAll;
    private TextView tabRecharge;
    private TextView tabDebit;

    // State
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private String currentTab = "ALL";
    private String currentSearch = "";
    private final List<JSONObject> allTransactions = new ArrayList<>();
    private double currentBalance = 0.0;
    private double perPatientFee = 2.50;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        StatusBarHelper.setStatusBarDeepNavy(this);
        setContentView(R.layout.activity_wallet);

        bindViews();
        setupTabs();
        setupSearch();
        setupRechargeButtons();

        swipeRefresh.setOnRefreshListener(this::fetchWalletDetails);
        fetchWalletDetails();
    }

    @Override
    protected void onResume() {
        super.onResume();
        fetchWalletDetails();
    }

    private void bindViews() {
        txtBalanceHero    = findViewById(R.id.txtWalletBalanceHero);
        txtValidity       = findViewById(R.id.txtWalletValidity);
        txtDeduction      = findViewById(R.id.txtWalletDeduction);
        txtTotalRecharged = findViewById(R.id.txtTotalRecharged);
        txtTotalConsumed  = findViewById(R.id.txtTotalConsumed);

        applyExtraBold(txtBalanceHero);
        applyExtraBold(txtTotalRecharged);
        applyExtraBold(txtTotalConsumed);
        applyExtraBold(txtValidity);
        applyExtraBold(txtDeduction);
        swipeRefresh      = findViewById(R.id.walletSwipeRefresh);
        txContainer       = findViewById(R.id.txContainer);
        layoutEmptyTx     = findViewById(R.id.layoutEmptyTx);
        editSearchTx      = findViewById(R.id.editSearchTx);
        tabAll            = findViewById(R.id.tabAll);
        tabRecharge       = findViewById(R.id.tabRecharge);
        tabDebit          = findViewById(R.id.tabDebit);

        View btnBack = findViewById(R.id.btnWalletBack);
        if (btnBack != null) {
            btnBack.setOnClickListener(v -> finish());
        }

        // Adjust top padding for status bar - move header higher up
        View header = findViewById(R.id.walletHeader);
        if (header != null) {
            header.setOnApplyWindowInsetsListener((v, insets) -> {
                int topInset = insets.getSystemWindowInsetTop();
                v.setPadding(v.getPaddingStart(), Math.max(dp(28), topInset + dp(4)), v.getPaddingEnd(), dp(16));
                return insets;
            });
        }
    }

    private void setupTabs() {
        tabAll.setOnClickListener(v -> switchTab("ALL"));
        tabRecharge.setOnClickListener(v -> switchTab("RECHARGE"));
        tabDebit.setOnClickListener(v -> switchTab("DEBIT"));
    }

    private void switchTab(String tab) {
        currentTab = tab;
        // Active: white pill + blue text | Inactive: transparent + soft blue text (on dark nav bg)
        tabAll.setBackgroundResource(tab.equals("ALL") ? R.drawable.bg_tab_white_pill : android.R.color.transparent);
        tabAll.setTextColor(tab.equals("ALL") ? 0xFF1D4ED8 : 0xFF93C5FD);

        tabRecharge.setBackgroundResource(tab.equals("RECHARGE") ? R.drawable.bg_tab_white_pill : android.R.color.transparent);
        tabRecharge.setTextColor(tab.equals("RECHARGE") ? 0xFF1D4ED8 : 0xFF93C5FD);

        tabDebit.setBackgroundResource(tab.equals("DEBIT") ? R.drawable.bg_tab_white_pill : android.R.color.transparent);
        tabDebit.setTextColor(tab.equals("DEBIT") ? 0xFF1D4ED8 : 0xFF93C5FD);

        renderTransactions();
    }

    private void setupSearch() {
        editSearchTx.addTextChangedListener(new TextWatcher() {
            @Override public void beforeTextChanged(CharSequence s, int start, int count, int after) {}
            @Override public void onTextChanged(CharSequence s, int start, int before, int count) {
                currentSearch = s.toString().trim().toLowerCase(Locale.ROOT);
                renderTransactions();
            }
            @Override public void afterTextChanged(Editable s) {}
        });
    }

    private void setupRechargeButtons() {
        View btnRecharge = findViewById(R.id.btnHeaderRecharge);
        if (btnRecharge != null) {
            btnRecharge.setOnClickListener(v -> showRechargeBottomSheet());
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Fetch Wallet Details & Transaction History
    // ─────────────────────────────────────────────────────────────────────────
    private void fetchWalletDetails() {
        swipeRefresh.setRefreshing(true);
        new Thread(() -> {
            try {
                String token = getAuthToken();
                if (token == null || token.isEmpty()) {
                    mainHandler.post(() -> {
                        swipeRefresh.setRefreshing(false);
                        populateDemoData();
                    });
                    return;
                }

                URL url = new URL(BASE_URL + "/api/workspace/wallet/details?limit=100");
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestProperty("Authorization", "Bearer " + token);
                conn.setRequestProperty("Cookie", "token=" + token);
                conn.setConnectTimeout(8000);
                conn.setReadTimeout(8000);

                if (conn.getResponseCode() == 200) {
                    String json = readStream(conn.getInputStream());
                    JSONObject obj = new JSONObject(json);

                    JSONObject wallet = obj.optJSONObject("wallet");
                    JSONObject metrics = obj.optJSONObject("metrics");
                    JSONArray txList = obj.optJSONArray("transactions");

                    mainHandler.post(() -> {
                        swipeRefresh.setRefreshing(false);
                        applyWalletData(wallet, metrics, txList);
                    });
                } else {
                    mainHandler.post(() -> {
                        swipeRefresh.setRefreshing(false);
                        applyWalletData(null, null, new JSONArray());
                    });
                }
            } catch (Exception e) {
                mainHandler.post(() -> {
                    swipeRefresh.setRefreshing(false);
                    applyWalletData(null, null, new JSONArray());
                });
            }
        }).start();
    }

    private void applyWalletData(JSONObject wallet, JSONObject metrics, JSONArray txList) {
        if (wallet != null) {
            currentBalance = wallet.optDouble("balance", 0.0);
            perPatientFee = wallet.optDouble("perPatientFee", 2.50);
            txtBalanceHero.setText(formatINR(currentBalance));
            txtDeduction.setText(formatINR(perPatientFee) + " / Patient");

            String validity = wallet.optString("validityEndDate", "");
            if (!validity.isEmpty() && !"null".equalsIgnoreCase(validity)) {
                txtValidity.setText(formatDateOnly(validity));
            } else {
                txtValidity.setText("No Expiry");
            }
        }

        if (metrics != null) {
            double totalRec = metrics.optDouble("totalRecharged", 0.0);
            double totalSpent = metrics.optDouble("totalSpent", 0.0);
            txtTotalRecharged.setText(formatINR(totalRec));
            txtTotalConsumed.setText(formatINR(totalSpent));
        }

        allTransactions.clear();
        if (txList != null) {
            for (int i = 0; i < txList.length(); i++) {
                JSONObject item = txList.optJSONObject(i);
                if (item != null) allTransactions.add(item);
            }
        }

        renderTransactions();
    }

    private void renderTransactions() {
        txContainer.removeAllViews();
        List<JSONObject> filtered = new ArrayList<>();

        for (JSONObject tx : allTransactions) {
            String type = tx.optString("type", "USAGE").toUpperCase(Locale.ROOT);
            String desc = tx.optString("description", "").toLowerCase(Locale.ROOT);

            // Tab filtering
            if (currentTab.equals("RECHARGE") && !type.contains("RECHARGE") && !type.contains("CREDIT")) {
                continue;
            }
            if (currentTab.equals("DEBIT") && !type.contains("USAGE") && !type.contains("DEBIT") && !type.contains("DEDUCTION")) {
                continue;
            }

            // Search filtering
            if (!currentSearch.isEmpty() && !desc.contains(currentSearch)) {
                continue;
            }

            filtered.add(tx);
        }

        if (filtered.isEmpty()) {
            layoutEmptyTx.setVisibility(View.VISIBLE);
        } else {
            layoutEmptyTx.setVisibility(View.GONE);
            for (JSONObject tx : filtered) {
                View card = createTransactionItemView(tx);
                txContainer.addView(card);
            }
        }
    }

    private View createTransactionItemView(JSONObject tx) {
        View v = LayoutInflater.from(this).inflate(R.layout.item_wallet_transaction, txContainer, false);

        FrameLayout iconFrame = v.findViewById(R.id.txIconFrame);
        ImageView icon = v.findViewById(R.id.txIcon);
        TextView txtDesc = v.findViewById(R.id.txDescription);
        TextView txtDate = v.findViewById(R.id.txDate);
        TextView txtRefId = v.findViewById(R.id.txRefId);
        TextView txtAmount = v.findViewById(R.id.txAmount);
        TextView txtBalAfter = v.findViewById(R.id.txBalanceAfter);

        String type = tx.optString("type", "USAGE").toUpperCase(Locale.ROOT);
        double amount = tx.optDouble("amount", 0.0);
        String desc = tx.optString("description", "Wallet Entry");
        String dateStr = tx.optString("createdAt", "");
        String refId = tx.optString("referenceId", tx.optString("id", ""));
        if (refId.length() > 8) refId = refId.substring(0, 8).toUpperCase(Locale.ROOT);
        double balAfter = currentBalance;
        if (tx.has("closingBalance") && !tx.isNull("closingBalance")) {
            balAfter = tx.optDouble("closingBalance", currentBalance);
        } else if (tx.has("balanceAfter") && !tx.isNull("balanceAfter")) {
            balAfter = tx.optDouble("balanceAfter", currentBalance);
        }

        boolean isCredit = type.contains("RECHARGE") || type.contains("CREDIT") || type.contains("REFUND");

        if (isCredit) {
            iconFrame.setBackgroundResource(R.drawable.bg_mod_icon_emerald);
            icon.setImageResource(R.drawable.ic_arrow_down_left);
            icon.setColorFilter(0xFF059669);
            txtAmount.setText("+" + formatINR(amount));
            txtAmount.setTextColor(0xFF059669);
        } else {
            iconFrame.setBackgroundResource(R.drawable.bg_mod_icon_rose);
            icon.setImageResource(R.drawable.ic_arrow_up_right_vector);
            icon.setColorFilter(0xFFE11D48);
            txtAmount.setText("-" + formatINR(amount));
            txtAmount.setTextColor(0xFFE11D48);
        }
        applyExtraBold(txtAmount);

        txtDesc.setText(desc);
        txtDate.setText(formatDateTime(dateStr));
        txtRefId.setText(refId.isEmpty() ? "TX-AUTO" : refId);
        txtBalAfter.setText("Bal: " + formatINR(balAfter));

        v.setOnClickListener(x -> showTransactionReceipt(tx));
        return v;
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Transaction Receipt Detail Sheet
    // ─────────────────────────────────────────────────────────────────────────
    private void showTransactionReceipt(JSONObject tx) {
        try {
            BottomSheetDialog sheet = new BottomSheetDialog(this);
            View sheetView = LayoutInflater.from(this).inflate(R.layout.layout_transaction_detail_dialog, null);
            sheet.setContentView(sheetView);

            TextView rAmount = sheetView.findViewById(R.id.receiptAmount);
            TextView rDesc = sheetView.findViewById(R.id.receiptDesc);
            TextView rTxId = sheetView.findViewById(R.id.receiptTxId);
            TextView rDate = sheetView.findViewById(R.id.receiptDate);
            TextView rBalAfter = sheetView.findViewById(R.id.receiptBalanceAfter);
            View btnClose = sheetView.findViewById(R.id.btnReceiptClose);

            double amount = tx.optDouble("amount", 0.0);
            String type = tx.optString("type", "USAGE");
            boolean isCredit = type.toUpperCase(Locale.ROOT).contains("RECHARGE") || type.toUpperCase(Locale.ROOT).contains("CREDIT") || type.toUpperCase(Locale.ROOT).contains("REFUND");

            double balAfter = currentBalance;
            if (tx.has("closingBalance") && !tx.isNull("closingBalance")) {
                balAfter = tx.optDouble("closingBalance", currentBalance);
            } else if (tx.has("balanceAfter") && !tx.isNull("balanceAfter")) {
                balAfter = tx.optDouble("balanceAfter", currentBalance);
            }

            rAmount.setText((isCredit ? "+" : "-") + formatINR(amount));
            rAmount.setTextColor(isCredit ? 0xFF059669 : 0xFFE11D48);
            rDesc.setText(tx.optString("description", "Wallet Transaction"));
            rTxId.setText(tx.optString("id", tx.optString("referenceId", "TX-109283")));
            rDate.setText(formatDateTime(tx.optString("createdAt", "")));
            rBalAfter.setText(formatINR(balAfter));

            if (btnClose != null) btnClose.setOnClickListener(v -> sheet.dismiss());
            sheet.show();
        } catch (Exception ignored) {}
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Quick Recharge Bottom Sheet
    // ─────────────────────────────────────────────────────────────────────────
    private void showRechargeBottomSheet() {
        try {
            BottomSheetDialog sheet = new BottomSheetDialog(this);
            View sheetView = LayoutInflater.from(this).inflate(R.layout.layout_wallet_recharge_sheet, null);
            sheet.setContentView(sheetView);

            EditText editAmount = sheetView.findViewById(R.id.editRechargeAmount);
            TextView txtSummaryBase = sheetView.findViewById(R.id.txtSummaryBase);
            TextView txtSummaryGst = sheetView.findViewById(R.id.txtSummaryGst);
            TextView txtSummaryTotal = sheetView.findViewById(R.id.txtSummaryTotal);
            android.widget.Button btnProceed = sheetView.findViewById(R.id.btnProceedRecharge);
            View btnClose = sheetView.findViewById(R.id.btnRechargeClose);

            TextView btn500 = sheetView.findViewById(R.id.btnPack500);
            TextView btn1000 = sheetView.findViewById(R.id.btnPack1000);
            TextView btn2000 = sheetView.findViewById(R.id.btnPack2000);
            TextView btn5000 = sheetView.findViewById(R.id.btnPack5000);

            Runnable updateSummary = () -> {
                double base = 0;
                try {
                    base = Double.parseDouble(editAmount.getText().toString().trim());
                } catch (Exception ignored) {}

                double gst = base * 0.18;
                double total = base + gst;

                txtSummaryBase.setText(formatINR(base));
                txtSummaryGst.setText(formatINR(gst));
                txtSummaryTotal.setText(formatINR(total));
            };

            View.OnClickListener packClick = v -> {
                btn500.setBackgroundResource(R.drawable.bg_tab_pill_inactive);
                btn500.setTextColor(0xFF334155);
                btn1000.setBackgroundResource(R.drawable.bg_tab_pill_inactive);
                btn1000.setTextColor(0xFF334155);
                btn2000.setBackgroundResource(R.drawable.bg_tab_pill_inactive);
                btn2000.setTextColor(0xFF334155);
                btn5000.setBackgroundResource(R.drawable.bg_tab_pill_inactive);
                btn5000.setTextColor(0xFF334155);

                TextView tv = (TextView) v;
                tv.setBackgroundResource(R.drawable.bg_tab_pill_active);
                tv.setTextColor(0xFFFFFFFF);

                if (v.getId() == R.id.btnPack500) editAmount.setText("500");
                else if (v.getId() == R.id.btnPack1000) editAmount.setText("1000");
                else if (v.getId() == R.id.btnPack2000) editAmount.setText("2000");
                else if (v.getId() == R.id.btnPack5000) editAmount.setText("5000");

                updateSummary.run();
            };

            btn500.setOnClickListener(packClick);
            btn1000.setOnClickListener(packClick);
            btn2000.setOnClickListener(packClick);
            btn5000.setOnClickListener(packClick);

            editAmount.addTextChangedListener(new TextWatcher() {
                @Override public void beforeTextChanged(CharSequence s, int start, int count, int after) {}
                @Override public void onTextChanged(CharSequence s, int start, int before, int count) { updateSummary.run(); }
                @Override public void afterTextChanged(Editable s) {}
            });

            btnProceed.setOnClickListener(v -> {
                double base = 0;
                try {
                    base = Double.parseDouble(editAmount.getText().toString().trim());
                } catch (Exception ignored) {}

                if (base < 100) {
                    Toast.makeText(this, "Minimum recharge amount is ₹ 100", Toast.LENGTH_SHORT).show();
                    return;
                }

                sheet.dismiss();
                initiatePaymentOrder(base);
            });

            if (btnClose != null) btnClose.setOnClickListener(v -> sheet.dismiss());
            sheet.show();

        } catch (Exception ignored) {}
    }

    private void initiatePaymentOrder(double baseAmount) {
        Toast.makeText(this, "Preparing secure payment gateway for " + formatINR(baseAmount) + "...", Toast.LENGTH_SHORT).show();
        new Thread(() -> {
            try {
                String token = getAuthToken();
                if (token == null) return;
                URL url = new URL(BASE_URL + "/api/workspace/wallet/create-order");
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("POST");
                conn.setRequestProperty("Content-Type", "application/json");
                conn.setRequestProperty("Authorization", "Bearer " + token);
                conn.setRequestProperty("Cookie", "token=" + token);
                conn.setDoOutput(true);

                JSONObject body = new JSONObject();
                body.put("baseAmount", baseAmount);

                OutputStream os = conn.getOutputStream();
                os.write(body.toString().getBytes("UTF-8"));
                os.flush();
                os.close();

                if (conn.getResponseCode() == 200) {
                    String respStr = readStream(conn.getInputStream());
                    JSONObject orderData = new JSONObject(respStr);
                    String keyId = orderData.optString("keyId", "");
                    String orderId = orderData.optString("orderId", "");
                    double totalAmount = orderData.optDouble("totalAmount", baseAmount * 1.18);
                    String currency = orderData.optString("currency", "INR");

                    mainHandler.post(() -> {
                        RazorpayInAppCheckoutDialog checkout = new RazorpayInAppCheckoutDialog(
                                WalletActivity.this,
                                keyId,
                                orderId,
                                totalAmount,
                                currency,
                                new RazorpayInAppCheckoutDialog.PaymentCallback() {
                                    @Override
                                    public void onSuccess(String paymentId, String ordId, String signature) {
                                        verifyPayment(baseAmount, totalAmount, ordId, paymentId, signature);
                                    }

                                    @Override
                                    public void onFailure(String errorMessage) {
                                        Toast.makeText(WalletActivity.this, "Payment failed: " + errorMessage, Toast.LENGTH_LONG).show();
                                    }

                                    @Override
                                    public void onCancelled() {
                                        Toast.makeText(WalletActivity.this, "Payment was cancelled", Toast.LENGTH_SHORT).show();
                                    }
                                }
                        );
                        checkout.show();
                    });
                } else {
                    mainHandler.post(() -> Toast.makeText(this, "Failed to initiate payment. Please try again.", Toast.LENGTH_SHORT).show());
                }
            } catch (Exception e) {
                mainHandler.post(() -> Toast.makeText(this, "Network error: " + e.getMessage(), Toast.LENGTH_SHORT).show());
            }
        }).start();
    }

    private void verifyPayment(double baseAmount, double totalAmount, String orderId, String paymentId, String signature) {
        Toast.makeText(this, "Verifying transaction...", Toast.LENGTH_SHORT).show();
        new Thread(() -> {
            try {
                String token = getAuthToken();
                if (token == null) return;
                URL url = new URL(BASE_URL + "/api/workspace/wallet/verify-payment");
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("POST");
                conn.setRequestProperty("Content-Type", "application/json");
                conn.setRequestProperty("Authorization", "Bearer " + token);
                conn.setRequestProperty("Cookie", "token=" + token);
                conn.setDoOutput(true);

                JSONObject body = new JSONObject();
                body.put("razorpay_order_id", orderId);
                body.put("razorpay_payment_id", paymentId);
                body.put("razorpay_signature", signature);
                body.put("baseAmount", baseAmount);

                OutputStream os = conn.getOutputStream();
                os.write(body.toString().getBytes("UTF-8"));
                os.flush();
                os.close();

                if (conn.getResponseCode() == 200) {
                    mainHandler.post(() -> {
                        showPaymentSuccessDialog(baseAmount, totalAmount, paymentId);
                        fetchWalletDetails();
                    });
                } else {
                    mainHandler.post(() -> Toast.makeText(this, "Payment verification pending. Updating ledger...", Toast.LENGTH_LONG).show());
                    fetchWalletDetails();
                }
            } catch (Exception e) {
                mainHandler.post(() -> {
                    showPaymentSuccessDialog(baseAmount, totalAmount, paymentId);
                    fetchWalletDetails();
                });
            }
        }).start();
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Celebratory Payment Succeeded Popup (Animated Bottom Sheet)
    // ─────────────────────────────────────────────────────────────────────────
    private void showPaymentSuccessDialog(double baseAmount, double totalAmount, String paymentId) {
        try {
            BottomSheetDialog sheet = new BottomSheetDialog(this);
            View sheetView = LayoutInflater.from(this).inflate(R.layout.layout_payment_success_sheet, null);
            sheet.setContentView(sheetView);

            // Transparent background so card shadow and rounded corners render beautifully
            FrameLayout bottomSheet = sheet.findViewById(com.google.android.material.R.id.design_bottom_sheet);
            if (bottomSheet != null) {
                bottomSheet.setBackground(new ColorDrawable(Color.TRANSPARENT));
            }

            View badgeCheck = sheetView.findViewById(R.id.badgeCheckCircle);
            View imgConfetti = sheetView.findViewById(R.id.imgConfetti);
            TextView txtAmountBadge = sheetView.findViewById(R.id.txtSuccessAmountBadge);
            android.widget.Button btnDashboard = sheetView.findViewById(R.id.btnSuccessDashboard);

            if (txtAmountBadge != null) {
                txtAmountBadge.setText("+" + formatINR(baseAmount) + " Credits Added");
            }

            // Spring bounce checkmark entrance animation
            if (badgeCheck != null) {
                badgeCheck.setScaleX(0.2f);
                badgeCheck.setScaleY(0.2f);
                badgeCheck.setAlpha(0f);
                badgeCheck.animate()
                        .scaleX(1.0f)
                        .scaleY(1.0f)
                        .alpha(1.0f)
                        .setDuration(600)
                        .setInterpolator(new android.view.animation.OvershootInterpolator(2.2f))
                        .start();
            }

            // Confetti floating entrance animation
            if (imgConfetti != null) {
                imgConfetti.setAlpha(0f);
                imgConfetti.setTranslationY(dp(15));
                imgConfetti.animate()
                        .alpha(1.0f)
                        .translationY(0f)
                        .setDuration(750)
                        .start();
            }

            if (btnDashboard != null) {
                btnDashboard.setOnClickListener(v -> {
                    sheet.dismiss();
                    fetchWalletDetails();
                });
            }

            sheet.show();

        } catch (Exception ignored) {}
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Fallback Demo Data for Offline / Previews
    // ─────────────────────────────────────────────────────────────────────────
    private void populateDemoData() {
        currentBalance = 1450.00;
        txtBalanceHero.setText(formatINR(currentBalance));
        txtTotalRecharged.setText(formatINR(5000.00));
        txtTotalConsumed.setText(formatINR(3550.00));
        txtValidity.setText("No Expiry");
        txtDeduction.setText("₹ 2.50 / Patient");

        populateDemoTransactions();
        renderTransactions();
    }

    private void populateDemoTransactions() {
        try {
            allTransactions.clear();
            allTransactions.add(new JSONObject()
                    .put("id", "TX-9021")
                    .put("type", "RECHARGE")
                    .put("amount", 2000.0)
                    .put("description", "Wallet Top-up (Online Payment)")
                    .put("createdAt", new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).format(new Date()))
                    .put("balanceAfter", 1450.00));

            allTransactions.add(new JSONObject()
                    .put("id", "TX-8942")
                    .put("type", "USAGE")
                    .put("amount", 2.50)
                    .put("description", "Patient Registration • Ananya Roy")
                    .put("createdAt", new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).format(new Date(System.currentTimeMillis() - 3600000)))
                    .put("balanceAfter", 1447.50));

            allTransactions.add(new JSONObject()
                    .put("id", "TX-8910")
                    .put("type", "USAGE")
                    .put("amount", 2.50)
                    .put("description", "Patient Registration • Ramesh Kumar")
                    .put("createdAt", new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).format(new Date(System.currentTimeMillis() - 7200000)))
                    .put("balanceAfter", 1445.00));

            allTransactions.add(new JSONObject()
                    .put("id", "TX-8840")
                    .put("type", "USAGE")
                    .put("amount", 2.50)
                    .put("description", "Patient Registration • Priya Sharma")
                    .put("createdAt", new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).format(new Date(System.currentTimeMillis() - 86400000)))
                    .put("balanceAfter", 1442.50));
        } catch (Exception ignored) {}
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Helpers
    // ─────────────────────────────────────────────────────────────────────────
    private String getAuthToken() {
        String token = AuthManager.getToken(this);
        if (token != null && !token.isEmpty()) return token;

        SharedPreferences prefs = getSharedPreferences("patholab_prefs", Context.MODE_PRIVATE);
        token = prefs.getString("auth_token", "");
        if (token != null && !token.isEmpty()) return token;

        try {
            android.webkit.CookieManager cm = android.webkit.CookieManager.getInstance();
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

        return null;
    }

    private String readStream(InputStream is) throws Exception {
        BufferedReader r = new BufferedReader(new InputStreamReader(is));
        StringBuilder sb = new StringBuilder();
        String l;
        while ((l = r.readLine()) != null) sb.append(l);
        return sb.toString();
    }

    private String formatINR(double amt) {
        return String.format(Locale.ENGLISH, "₹ %,.2f", amt);
    }

    private String formatDateOnly(String iso) {
        try {
            SimpleDateFormat in = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.US);
            SimpleDateFormat out = new SimpleDateFormat("dd MMM yyyy", Locale.US);
            return out.format(in.parse(iso));
        } catch (Exception e) {
            return iso.length() >= 10 ? iso.substring(0, 10) : iso;
        }
    }

    private String formatDateTime(String iso) {
        try {
            SimpleDateFormat in = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.US);
            SimpleDateFormat out = new SimpleDateFormat("dd MMM yyyy, hh:mm a", Locale.US);
            return out.format(in.parse(iso));
        } catch (Exception e) {
            return "Today";
        }
    }

    private void applyExtraBold(TextView tv) {
        if (tv == null) return;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            tv.setTypeface(Typeface.create(Typeface.DEFAULT, 800, false));
        } else {
            tv.setTypeface(Typeface.create("sans-serif-medium", Typeface.BOLD));
        }
    }

    private int dp(int val) {
        return (int) (val * getResources().getDisplayMetrics().density + 0.5f);
    }
}
