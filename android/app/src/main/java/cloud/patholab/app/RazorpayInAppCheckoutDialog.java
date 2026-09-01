package cloud.patholab.app;

import android.annotation.SuppressLint;
import android.app.Dialog;
import android.content.Context;
import android.graphics.Color;
import android.graphics.drawable.ColorDrawable;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.ViewGroup;
import android.view.Window;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;

import androidx.annotation.NonNull;

/**
 * RazorpayInAppCheckoutDialog
 * ───────────────────────────
 * Native in-app secure checkout container for Razorpay.
 * Connects directly with checkout.js and bridges payment events seamlessly.
 */
public class RazorpayInAppCheckoutDialog extends Dialog {

    public interface PaymentCallback {
        void onSuccess(String paymentId, String orderId, String signature);
        void onFailure(String errorMessage);
        void onCancelled();
    }

    private final String keyId;
    private final String orderId;
    private final double totalAmount; // in INR
    private final String currency;
    private final PaymentCallback callback;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private WebView webView;

    public RazorpayInAppCheckoutDialog(@NonNull Context context,
                                       String keyId,
                                       String orderId,
                                       double totalAmount,
                                       String currency,
                                       PaymentCallback callback) {
        super(context, android.R.style.Theme_Black_NoTitleBar_Fullscreen);
        this.keyId = keyId;
        this.orderId = orderId;
        this.totalAmount = totalAmount;
        this.currency = (currency == null || currency.isEmpty()) ? "INR" : currency;
        this.callback = callback;
    }

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        requestWindowFeature(Window.FEATURE_NO_TITLE);

        if (getWindow() != null) {
            getWindow().setBackgroundDrawable(new ColorDrawable(Color.BLACK));
            getWindow().setLayout(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT);
        }

        FrameLayout container = new FrameLayout(getContext());
        container.setBackgroundColor(Color.parseColor("#0F172A"));
        setContentView(container);

        webView = new WebView(getContext());
        webView.setLayoutParams(new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
        ));
        webView.setBackgroundColor(Color.parseColor("#0F172A"));
        webView.getSettings().setJavaScriptEnabled(true);
        webView.getSettings().setDomStorageEnabled(true);
        webView.getSettings().setDatabaseEnabled(true);
        webView.getSettings().setSupportZoom(false);
        webView.setWebChromeClient(new WebChromeClient());

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return false;
            }
        });

        webView.addJavascriptInterface(new Object() {
            @JavascriptInterface
            public void onPaymentSuccess(String paymentId, String ordId, String signature) {
                mainHandler.post(() -> {
                    dismiss();
                    if (callback != null) callback.onSuccess(paymentId, ordId, signature);
                });
            }

            @JavascriptInterface
            public void onPaymentFailed(String error) {
                mainHandler.post(() -> {
                    dismiss();
                    if (callback != null) callback.onFailure(error);
                });
            }

            @JavascriptInterface
            public void onPaymentCancelled() {
                mainHandler.post(() -> {
                    dismiss();
                    if (callback != null) callback.onCancelled();
                });
            }
        }, "AndroidBridge");

        container.addView(webView);

        loadRazorpayCheckout();
    }

    private void loadRazorpayCheckout() {
        int amountInPaise = (int) Math.round(totalAmount * 100);

        String html = "<!DOCTYPE html>\n" +
                "<html>\n" +
                "<head>\n" +
                "  <meta charset=\"utf-8\">\n" +
                "  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no\">\n" +
                "  <script src=\"https://checkout.razorpay.com/v1/checkout.js\"></script>\n" +
                "  <style>\n" +
                "    body { margin: 0; padding: 0; background: #0F172A; display: flex; align-items: center; justify-content: center; height: 100vh; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #fff; }\n" +
                "    .loader { text-align: center; }\n" +
                "    .spinner { width: 44px; height: 44px; border: 3.5px solid rgba(255,255,255,0.15); border-top-color: #0D6EFD; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 16px; }\n" +
                "    @keyframes spin { to { transform: rotate(360deg); } }\n" +
                "    p { font-size: 14px; color: #94A3B8; font-weight: 500; letter-spacing: 0.2px; }\n" +
                "  </style>\n" +
                "</head>\n" +
                "<body>\n" +
                "  <div class=\"loader\">\n" +
                "    <div class=\"spinner\"></div>\n" +
                "    <p>Opening Secure Payment Gateway...</p>\n" +
                "  </div>\n" +
                "  <script>\n" +
                "    window.onload = function() {\n" +
                "      var options = {\n" +
                "        \"key\": \"" + keyId + "\",\n" +
                "        \"amount\": " + amountInPaise + ",\n" +
                "        \"currency\": \"" + currency + "\",\n" +
                "        \"name\": \"Patholab Cloud\",\n" +
                "        \"description\": \"Wallet Recharge Credits\",\n" +
                "        \"order_id\": \"" + orderId + "\",\n" +
                "        \"theme\": { \"color\": \"#0D6EFD\" },\n" +
                "        \"handler\": function (response) {\n" +
                "          window.AndroidBridge.onPaymentSuccess(\n" +
                "            response.razorpay_payment_id || '',\n" +
                "            response.razorpay_order_id || '" + orderId + "',\n" +
                "            response.razorpay_signature || ''\n" +
                "          );\n" +
                "        },\n" +
                "        \"modal\": {\n" +
                "          \"ondismiss\": function() {\n" +
                "            window.AndroidBridge.onPaymentCancelled();\n" +
                "          }\n" +
                "        }\n" +
                "      };\n" +
                "      try {\n" +
                "        var rzp = new Razorpay(options);\n" +
                "        rzp.on('payment.failed', function (resp){\n" +
                "          window.AndroidBridge.onPaymentFailed(resp.error ? resp.error.description : 'Payment failed');\n" +
                "        });\n" +
                "        rzp.open();\n" +
                "      } catch (err) {\n" +
                "        window.AndroidBridge.onPaymentFailed(err.message || 'Gateway load error');\n" +
                "      }\n" +
                "    };\n" +
                "  </script>\n" +
                "</body>\n" +
                "</html>";

        webView.loadDataWithBaseURL("https://app.patholab.cloud", html, "text/html", "UTF-8", null);
    }
}
