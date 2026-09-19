package cloud.patholab.app;

import android.annotation.SuppressLint;
import android.app.Dialog;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.graphics.drawable.ColorDrawable;
import android.media.MediaScannerConnection;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.view.View;
import android.webkit.CookieManager;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

import com.google.android.material.button.MaterialButton;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;

import cloud.patholab.app.auth.AuthManager;

/**
 * Dedicated In-App Diagnostic Report Preview & Native Printing Screen
 * Features live clinical report rendering, native wireless print spooling
 * via Android PrintManager, direct PDF download matching web generation,
 * and prominent in-app notification banners upon successful download.
 */
public class ReportPreviewActivity extends AppCompatActivity {

    private static final String BASE_URL = "https://app.patholab.cloud";

    private FrameLayout btnPreviewBack, btnPreviewRefresh;
    private FrameLayout btnZoomIn, btnZoomReset, btnZoomOut;
    private TextView lblPreviewPatientName, lblPreviewSubTitle;
    private ProgressBar progressPreviewLoading;
    private WebView webViewReportPreview;
    private MaterialButton btnBottomPrintSpooler, btnBottomDownloadPdf;
    private LinearLayout bannerDownloadSuccess;
    private TextView lblBannerDownloadMessage;

    private String reportId = "";
    private String patientDbId = "";
    private String invoiceId = "";
    private String patientName = "Patient";
    private String patientPhone = "";
    private String testName = "Diagnostic Investigation";
    private int version = 1;
    private String uhid = "";
    private String pdfUrl = "";        // direct PDF URL from the reports API
    private boolean autoPrint = false; // if true → trigger print on load
    private boolean actionFired = false; // guard: fire auto-action only once per load

    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        StatusBarHelper.setStatusBarSapphire(this);
        setContentView(R.layout.activity_report_preview);

        extractIntentData();
        bindViews();
        setupEvents();
        loadReportWebCanvas();
    }

    private void extractIntentData() {
        Intent i = getIntent();
        if (i != null) {
            reportId    = i.getStringExtra("report_id")    != null ? i.getStringExtra("report_id")    : "";
            patientDbId = i.getStringExtra("patient_db_id")!= null ? i.getStringExtra("patient_db_id"): "";
            invoiceId   = i.getStringExtra("invoice_id")   != null ? i.getStringExtra("invoice_id")   : "";
            patientName = i.getStringExtra("patient_name") != null ? i.getStringExtra("patient_name") : "Patient";
            patientPhone= i.getStringExtra("patient_phone")!= null ? i.getStringExtra("patient_phone"): "";
            testName    = i.getStringExtra("test_name")    != null ? i.getStringExtra("test_name")    : "Diagnostic Investigation";
            version     = i.getIntExtra("version", 1);
            uhid        = i.getStringExtra("uhid")         != null ? i.getStringExtra("uhid")         : "";
            pdfUrl      = i.getStringExtra("pdf_url")      != null ? i.getStringExtra("pdf_url")      : "";
            autoPrint   = i.getBooleanExtra("auto_print", false);
        }
    }

    private void bindViews() {
        btnPreviewBack = findViewById(R.id.btnPreviewBack);
        btnPreviewRefresh = findViewById(R.id.btnPreviewRefresh);
        btnZoomIn = findViewById(R.id.btnZoomIn);
        btnZoomReset = findViewById(R.id.btnZoomReset);
        btnZoomOut = findViewById(R.id.btnZoomOut);
        lblPreviewPatientName = findViewById(R.id.lblPreviewPatientName);
        lblPreviewSubTitle = findViewById(R.id.lblPreviewSubTitle);
        progressPreviewLoading = findViewById(R.id.progressPreviewLoading);
        webViewReportPreview = findViewById(R.id.webViewReportPreview);
        btnBottomPrintSpooler = findViewById(R.id.btnBottomPrintSpooler);
        btnBottomDownloadPdf = findViewById(R.id.btnBottomDownloadPdf);
        bannerDownloadSuccess = findViewById(R.id.bannerDownloadSuccess);
        lblBannerDownloadMessage = findViewById(R.id.lblBannerDownloadMessage);

        lblPreviewPatientName.setText(patientName);
        String sub = testName + (!uhid.isEmpty() ? " • " + uhid : "") + " (v" + version + ".0)";
        lblPreviewSubTitle.setText(sub);
    }

    private void setupEvents() {
        btnPreviewBack.setOnClickListener(v -> finish());
        if (btnPreviewRefresh != null) {
            btnPreviewRefresh.setOnClickListener(v -> {
                progressPreviewLoading.setVisibility(View.VISIBLE);
                if (webViewReportPreview != null) {
                    webViewReportPreview.reload();
                }
            });
        }

        if (btnZoomIn != null) {
            btnZoomIn.setOnClickListener(v -> {
                if (webViewReportPreview != null) {
                    webViewReportPreview.evaluateJavascript("(function() { if (window.__zoomIn) { return window.__zoomIn(); } return false; })()", res -> {
                        if ("false".equals(res) || "null".equals(res)) {
                            webViewReportPreview.zoomIn();
                        }
                    });
                }
            });
        }

        if (btnZoomReset != null) {
            btnZoomReset.setOnClickListener(v -> {
                if (webViewReportPreview != null) {
                    webViewReportPreview.evaluateJavascript("if (window.__zoomReset) { window.__zoomReset(); }", null);
                }
            });
        }

        if (btnZoomOut != null) {
            btnZoomOut.setOnClickListener(v -> {
                if (webViewReportPreview != null) {
                    webViewReportPreview.evaluateJavascript("(function() { if (window.__zoomOut) { return window.__zoomOut(); } return false; })()", res -> {
                        if ("false".equals(res) || "null".equals(res)) {
                            webViewReportPreview.zoomOut();
                        }
                    });
                }
            });
        }

        btnBottomPrintSpooler.setOnClickListener(v -> triggerNativePrintSpooler());
        btnBottomDownloadPdf.setOnClickListener(v -> performPdfDownload());

        if (bannerDownloadSuccess != null) {
            bannerDownloadSuccess.setOnClickListener(v -> {
                bannerDownloadSuccess.setVisibility(View.GONE);
                if (webViewReportPreview != null) {
                    webViewReportPreview.scrollTo(0, 0);
                }
            });
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void loadReportWebCanvas() {
        WebSettings s = webViewReportPreview.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setBuiltInZoomControls(true);
        s.setDisplayZoomControls(false);
        s.setSupportZoom(true);
        s.setDatabaseEnabled(true);
        s.setUserAgentString(s.getUserAgentString() + " PatholabCloudMobileApp");

        // Sync authentication cookies
        String token = AuthManager.getToken(this);
        if (token != null) {
            CookieManager cm = CookieManager.getInstance();
            cm.setAcceptCookie(true);
            cm.setAcceptThirdPartyCookies(webViewReportPreview, true);
            cm.setCookie("https://app.patholab.cloud", "token=" + token + "; path=/; domain=app.patholab.cloud; Secure");
            cm.setCookie("https://patholab.cloud", "token=" + token + "; path=/; domain=patholab.cloud; Secure");
            cm.flush();
        }

        webViewReportPreview.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onProgressChanged(WebView view, int newProgress) {
                if (newProgress < 100) {
                    progressPreviewLoading.setVisibility(View.VISIBLE);
                    progressPreviewLoading.setProgress(newProgress);
                } else {
                    progressPreviewLoading.setVisibility(View.GONE);
                }
            }
        });

        webViewReportPreview.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageStarted(WebView view, String url, Bitmap favicon) {
                progressPreviewLoading.setVisibility(View.VISIBLE);
                actionFired = false;
                injectResponsiveScaling(view);
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                progressPreviewLoading.setVisibility(View.GONE);

                // Inject dynamic viewport auto-scaler and clean medical styling
                injectResponsiveScaling(view);
                mainHandler.postDelayed(() -> injectResponsiveScaling(view), 300);
                mainHandler.postDelayed(() -> injectResponsiveScaling(view), 800);

                // Auto-trigger print ONLY if explicitly requested via intent
                if (!actionFired && autoPrint) {
                    actionFired = true;
                    mainHandler.postDelayed(() -> triggerNativePrintSpooler(), 600);
                }
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                progressPreviewLoading.setVisibility(View.GONE);
            }
        });

        // Resolve target ID: patientDbId > uhid (if starting with P-) > reportId
        String targetId = !patientDbId.isEmpty() ? patientDbId : (!uhid.isEmpty() && uhid.startsWith("P-") ? uhid : reportId);
        String targetUrl;
        if (pdfUrl != null && !pdfUrl.isEmpty() && pdfUrl.startsWith("http")) {
            targetUrl = pdfUrl;
        } else {
            String encodedId = targetId;
            try { encodedId = URLEncoder.encode(targetId, "UTF-8"); } catch (Exception ignored) {}
            targetUrl = BASE_URL + "/workspace/reports/print/" + encodedId + "?app=true&hideNav=true";
        }
        webViewReportPreview.loadUrl(targetUrl);
    }

    private void injectResponsiveScaling(WebView view) {
        if (view == null) return;
        String js = "(function() {\n" +
                "  try {\n" +
                "    // 1. Separate Screen viewer and Print media styles\n" +
                "    var css = '@media screen {' +\n" +
                "              '  html { margin: 0 !important; padding: 0 !important; background: #0F172A !important; -webkit-text-size-adjust: 100% !important; overflow-x: auto !important; -webkit-overflow-scrolling: touch !important; }' +\n" +
                "              '  body { background: #0F172A !important; margin: 0 auto !important; padding: 4px 0 100px 0 !important; display: flex !important; flex-direction: column !important; align-items: center !important; overflow-x: auto !important; -webkit-overflow-scrolling: touch !important; width: 100% !important; min-width: 100% !important; }' +\n" +
                "              '  .flex.flex-col.items-center { padding-top: 4px !important; padding-bottom: 20px !important; width: 100% !important; }' +\n" +
                "              '  .sticky.top-4, nav, header:not(.report-header), footer.web-only, .print\\\\:hidden:not(.report-canvas) { display: none !important; }' +\n" +
                "              '}' +\n" +
                "              '@media print {' +\n" +
                "              '  @page { size: A4 portrait; margin: 0; }' +\n" +
                "              '  html, body { background: #FFFFFF !important; color: #000000 !important; margin: 0 !important; padding: 0 !important; width: 210mm !important; overflow: visible !important; }' +\n" +
                "              '  div[style*=\"210mm\"], .report-canvas { zoom: 1.0 !important; transform: none !important; box-shadow: none !important; border-radius: 0 !important; margin: 0 !important; width: 210mm !important; }' +\n" +
                "              '  .sticky, nav, header, footer, .print\\\\:hidden, #app-report-override { display: none !important; }' +\n" +
                "              '}';\n" +
                "\n" +
                "    var style = document.getElementById('app-report-override');\n" +
                "    if (!style) {\n" +
                "      style = document.createElement('style');\n" +
                "      style.id = 'app-report-override';\n" +
                "      document.head.appendChild(style);\n" +
                "    }\n" +
                "    style.innerHTML = css;\n" +
                "\n" +
                "    // 2. Zoom Controls API & Responsive Scaling\n" +
                "    window.__zoomMultiplier = window.__zoomMultiplier || 1.0;\n" +
                "    function fitReport() {\n" +
                "      var canvases = document.querySelectorAll('div[style*=\"210mm\"], .report-canvas, .bg-white.shadow-\\\\[0_20px_50px_rgba\\\\(0\\\\,0\\\\,0\\\\,0\\\\.3\\\\)\\\\]');\n" +
                "      if (!canvases || canvases.length === 0) return false;\n" +
                "\n" +
                "      var screenW = window.innerWidth || document.documentElement.clientWidth || screen.width;\n" +
                "      var availableW = screenW - 16; // 8px margin on each side\n" +
                "      var mult = window.__zoomMultiplier || 1.0;\n" +
                "\n" +
                "      canvases.forEach(function(canvas) {\n" +
                "        var naturalW = 794; // standard 210mm A4 width at 96 DPI\n" +
                "        if (canvas.scrollWidth && canvas.scrollWidth > 500) {\n" +
                "          naturalW = canvas.scrollWidth;\n" +
                "        }\n" +
                "\n" +
                "        var baseScale = availableW / naturalW;\n" +
                "        var scale = (baseScale * mult).toFixed(4);\n" +
                "        canvas.style.zoom = scale;\n" +
                "        canvas.style.webkitTransformOrigin = 'top center';\n" +
                "        canvas.style.margin = '4px auto 16px auto';\n" +
                "        canvas.style.boxShadow = '0 8px 30px rgba(0,0,0,0.35)';\n" +
                "        canvas.style.borderRadius = '4px';\n" +
                "        canvas.style.transition = 'zoom 0.15s ease-out';\n" +
                "      });\n" +
                "\n" +
                "      var vp = document.querySelector('meta[name=\"viewport\"]');\n" +
                "      if (vp) {\n" +
                "        vp.setAttribute('content', 'width=device-width, initial-scale=1.0, minimum-scale=0.25, maximum-scale=5.0, user-scalable=yes');\n" +
                "      }\n" +
                "      return true;\n" +
                "    }\n" +
                "\n" +
                "    window.__zoomIn = function() {\n" +
                "      window.__zoomMultiplier = Math.min(3.0, (window.__zoomMultiplier || 1.0) + 0.25);\n" +
                "      fitReport();\n" +
                "      return window.__zoomMultiplier;\n" +
                "    };\n" +
                "    window.__zoomOut = function() {\n" +
                "      window.__zoomMultiplier = Math.max(0.5, (window.__zoomMultiplier || 1.0) - 0.25);\n" +
                "      fitReport();\n" +
                "      return window.__zoomMultiplier;\n" +
                "    };\n" +
                "    window.__zoomReset = function() {\n" +
                "      window.__zoomMultiplier = 1.0;\n" +
                "      fitReport();\n" +
                "      return 1.0;\n" +
                "    };\n" +
                "\n" +
                "    fitReport();\n" +
                "\n" +
                "    // Watch for React hydration so it fits the very millisecond it mounts\n" +
                "    if (!window.__appReportObserver) {\n" +
                "      window.__appReportObserver = new MutationObserver(function() { fitReport(); });\n" +
                "      window.__appReportObserver.observe(document.body || document.documentElement, { childList: true, subtree: true });\n" +
                "    }\n" +
                "\n" +
                "    window.addEventListener('resize', fitReport);\n" +
                "    window.addEventListener('orientationchange', function() { setTimeout(fitReport, 200); });\n" +
                "  } catch (e) {}\n" +
                "})();";
        view.evaluateJavascript(js, null);
    }

    // ── Native Wireless Print Spooler Integration ────────────────────────────
    private void triggerNativePrintSpooler() {
        try {
            PrintManager printManager = (PrintManager) getSystemService(Context.PRINT_SERVICE);
            if (printManager != null && webViewReportPreview != null) {
                String jobName = "Report_" + patientName.replaceAll("\\s+", "_") + "_" + (uhid.isEmpty() ? "Visit" : uhid);
                PrintDocumentAdapter printAdapter = webViewReportPreview.createPrintDocumentAdapter(jobName);
                PrintAttributes.Builder builder = new PrintAttributes.Builder();
                builder.setMediaSize(PrintAttributes.MediaSize.ISO_A4);
                builder.setColorMode(PrintAttributes.COLOR_MODE_COLOR);

                printManager.print(jobName, printAdapter, builder.build());
            } else {
                Toast.makeText(this, "Print service is not available", Toast.LENGTH_SHORT).show();
            }
        } catch (Exception e) {
            Toast.makeText(this, "Could not start print: " + e.getMessage(), Toast.LENGTH_SHORT).show();
        }
    }

    // ── PDF Download & In-App Notification Flow ──────────────────────────────
    private void performPdfDownload() {
        progressPreviewLoading.setVisibility(View.VISIBLE);
        Toast.makeText(this, "Generating official PDF report...", Toast.LENGTH_SHORT).show();

        new Thread(() -> {
            byte[] pdfBytes = null;
            String fileName = "Report_" + patientName.replaceAll("[^a-zA-Z0-9]", "_") + "_" + (uhid.isEmpty() ? "visit" : uhid) + ".pdf";
            String token = AuthManager.getToken(this);

            // 1. Primary: POST /api/reports/generate (Exact same as web print page generator)
            try {
                URL genUrl = new URL(BASE_URL + "/api/reports/generate");
                HttpURLConnection conn = (HttpURLConnection) genUrl.openConnection();
                conn.setRequestMethod("POST");
                conn.setRequestProperty("Content-Type", "application/json");
                conn.setRequestProperty("Accept", "application/pdf");
                if (token != null) {
                    conn.setRequestProperty("Authorization", "Bearer " + token);
                    conn.setRequestProperty("Cookie", "token=" + token);
                }
                conn.setDoOutput(true);
                conn.setConnectTimeout(15000);
                conn.setReadTimeout(25000);

                JSONObject payload = new JSONObject();
                payload.put("action", "generate_invoice_report");
                if (invoiceId != null && !invoiceId.isEmpty()) {
                    payload.put("invoiceId", invoiceId);
                }
                if (patientDbId != null && !patientDbId.isEmpty()) {
                    payload.put("patientId", patientDbId);
                } else if (reportId != null && !reportId.isEmpty()) {
                    payload.put("reportId", reportId);
                }
                String verifyKey = !reportId.isEmpty() ? reportId : patientDbId;
                payload.put("verificationUrl", BASE_URL + "/verify/" + verifyKey);

                byte[] postData = payload.toString().getBytes("UTF-8");
                conn.getOutputStream().write(postData);

                if (conn.getResponseCode() == 200) {
                    InputStream is = conn.getInputStream();
                    ByteArrayOutputStream baos = new ByteArrayOutputStream();
                    byte[] buffer = new byte[8192];
                    int len;
                    while ((len = is.read(buffer)) != -1) {
                        baos.write(buffer, 0, len);
                    }
                    is.close();
                    if (baos.size() > 500) {
                        pdfBytes = baos.toByteArray();
                    }
                }
            } catch (Exception ignored) {}

            // 2. Fallback: GET /api/workspace/reports/{cleanId}/pdf
            if (pdfBytes == null || pdfBytes.length == 0) {
                String cleanId = reportId.replaceFirst("^(?i)(rep_|inv_)", "").trim();
                if (!cleanId.isEmpty()) {
                    try {
                        URL pdfEndpoint = new URL(BASE_URL + "/api/workspace/reports/" + URLEncoder.encode(cleanId, "UTF-8") + "/pdf");
                        HttpURLConnection conn = (HttpURLConnection) pdfEndpoint.openConnection();
                        conn.setRequestProperty("Accept", "application/pdf");
                        if (token != null) {
                            conn.setRequestProperty("Authorization", "Bearer " + token);
                            conn.setRequestProperty("Cookie", "token=" + token);
                        }
                        conn.setConnectTimeout(12000);
                        conn.setReadTimeout(20000);
                        if (conn.getResponseCode() == 200) {
                            InputStream is = conn.getInputStream();
                            ByteArrayOutputStream baos = new ByteArrayOutputStream();
                            byte[] buffer = new byte[8192];
                            int len;
                            while ((len = is.read(buffer)) != -1) {
                                baos.write(buffer, 0, len);
                            }
                            is.close();
                            if (baos.size() > 500) {
                                pdfBytes = baos.toByteArray();
                            }
                        }
                    } catch (Exception ignored) {}
                }
            }

            // 3. Fallback: Direct pdfUrl
            if ((pdfBytes == null || pdfBytes.length == 0) && pdfUrl != null && pdfUrl.startsWith("http")) {
                try {
                    URL pUrl = new URL(pdfUrl);
                    HttpURLConnection conn = (HttpURLConnection) pUrl.openConnection();
                    if (token != null) {
                        conn.setRequestProperty("Authorization", "Bearer " + token);
                        conn.setRequestProperty("Cookie", "token=" + token);
                    }
                    if (conn.getResponseCode() == 200) {
                        InputStream is = conn.getInputStream();
                        ByteArrayOutputStream baos = new ByteArrayOutputStream();
                        byte[] buffer = new byte[8192];
                        int len;
                        while ((len = is.read(buffer)) != -1) {
                            baos.write(buffer, 0, len);
                        }
                        is.close();
                        if (baos.size() > 500) {
                            pdfBytes = baos.toByteArray();
                        }
                    }
                } catch (Exception ignored) {}
            }

            if (pdfBytes != null && pdfBytes.length > 0) {
                try {
                    File downloadDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
                    if (!downloadDir.exists()) downloadDir.mkdirs();
                    File pdfFile = new File(downloadDir, fileName);
                    FileOutputStream fos = new FileOutputStream(pdfFile);
                    fos.write(pdfBytes);
                    fos.flush();
                    fos.close();

                    // Register with Android Media Scanner so it appears immediately in file manager & Downloads
                    MediaScannerConnection.scanFile(
                            ReportPreviewActivity.this,
                            new String[]{pdfFile.getAbsolutePath()},
                            new String[]{"application/pdf"},
                            null
                    );

                    final File savedFile = pdfFile;
                    mainHandler.post(() -> {
                        progressPreviewLoading.setVisibility(View.GONE);

                        // Trigger Device System Notification with required text
                        MobileNotificationHelper.postReportDownloadSuccessNotification(
                                ReportPreviewActivity.this,
                                patientName,
                                uhid,
                                (!reportId.isEmpty() ? reportId : patientDbId),
                                testName,
                                version,
                                savedFile.getAbsolutePath()
                        );

                        // Show In-App Notification Banner & Confirmation Dialog
                        showDownloadSuccessInAppBanner(savedFile);
                    });
                    return;
                } catch (Exception ignored) {}
            }

            // Fallback via DownloadManager
            mainHandler.post(() -> fallbackDownloadViaManager());

        }).start();
    }

    private void fallbackDownloadViaManager() {
        try {
            String cleanId = (!reportId.isEmpty() ? reportId : (!patientDbId.isEmpty() ? patientDbId : uhid)).replaceFirst("^(?i)(rep_|inv_)", "").trim();
            String downloadUrl = BASE_URL + "/api/workspace/reports/" + URLEncoder.encode(cleanId, "UTF-8") + "/pdf";
            android.app.DownloadManager dm = (android.app.DownloadManager) getSystemService(Context.DOWNLOAD_SERVICE);
            if (dm != null) {
                Uri downloadUri = Uri.parse(downloadUrl);
                android.app.DownloadManager.Request request = new android.app.DownloadManager.Request(downloadUri);
                request.setTitle("Report - " + patientName);
                request.setDescription("Clinical Pathology Report");
                request.setNotificationVisibility(android.app.DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
                String token = AuthManager.getToken(this);
                if (token != null) {
                    request.addRequestHeader("Authorization", "Bearer " + token);
                    request.addRequestHeader("Cookie", "token=" + token);
                }
                String fileName = "Report_" + patientName.replaceAll("[^a-zA-Z0-9]", "_") + "_" + (uhid.isEmpty() ? "visit" : uhid) + ".pdf";
                request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, fileName);
                dm.enqueue(request);
            }
        } catch (Exception ignored) {}

        mainHandler.postDelayed(() -> {
            progressPreviewLoading.setVisibility(View.GONE);
            showDownloadSuccessInAppBanner(null);
        }, 1200);
    }

    private void showDownloadSuccessInAppBanner(File savedFile) {
        String notifText = "Download successful! Report for " + patientName + (!uhid.isEmpty() ? " (" + uhid + ")" : "") + " has been saved to your device.";

        // 1. Show floating In-App Banner
        if (bannerDownloadSuccess != null && lblBannerDownloadMessage != null) {
            lblBannerDownloadMessage.setText(notifText);
            bannerDownloadSuccess.setVisibility(View.VISIBLE);
            bannerDownloadSuccess.setAlpha(0f);
            bannerDownloadSuccess.animate().alpha(1f).setDuration(300).start();

            // Auto dismiss banner after 6 seconds
            mainHandler.postDelayed(() -> {
                if (bannerDownloadSuccess != null) {
                    bannerDownloadSuccess.animate().alpha(0f).setDuration(300).withEndAction(() -> bannerDownloadSuccess.setVisibility(View.GONE)).start();
                }
            }, 6000);
        }

        // 2. Also present the interactive modal dialog
        Dialog dialog = new Dialog(this);
        dialog.setContentView(R.layout.layout_download_success_dialog);
        if (dialog.getWindow() != null) {
            dialog.getWindow().setBackgroundDrawable(new ColorDrawable(Color.TRANSPARENT));
            dialog.getWindow().setLayout(
                    (int) (getResources().getDisplayMetrics().widthPixels * 0.90),
                    android.view.ViewGroup.LayoutParams.WRAP_CONTENT
            );
        }

        TextView lblTitle = dialog.findViewById(R.id.lblDownloadSuccessTitle);
        TextView lblDetails = dialog.findViewById(R.id.lblDownloadSuccessDetails);
        MaterialButton btnOpenPdf = dialog.findViewById(R.id.btnSuccessOpenPdf);
        MaterialButton btnShareWa = dialog.findViewById(R.id.btnSuccessShareWhatsApp);
        TextView btnDismiss = dialog.findViewById(R.id.btnSuccessDismiss);

        lblTitle.setText("Download Successful!");
        lblDetails.setText(notifText);

        btnOpenPdf.setOnClickListener(v -> {
            dialog.dismiss();
            if (savedFile != null && savedFile.exists()) {
                try {
                    Uri fileUri = androidx.core.content.FileProvider.getUriForFile(
                            ReportPreviewActivity.this,
                            getApplicationContext().getPackageName() + ".fileprovider",
                            savedFile
                    );
                    Intent intent = new Intent(Intent.ACTION_VIEW);
                    intent.setDataAndType(fileUri, "application/pdf");
                    intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                    startActivity(intent);
                    return;
                } catch (Exception ignored) {}
            }
            // Fallback to in-app webview scroll
            if (webViewReportPreview != null) {
                webViewReportPreview.scrollTo(0, 0);
            }
        });

        btnShareWa.setOnClickListener(v -> {
            dialog.dismiss();
            shareViaWhatsAppDirect();
        });

        btnDismiss.setOnClickListener(v -> dialog.dismiss());

        dialog.show();
    }

    private void shareViaWhatsAppDirect() {
        try {
            String verifyUrl = BASE_URL + "/verify/" + (!reportId.isEmpty() ? reportId : patientDbId);
            String message = "Hello " + patientName + ",\n\nYour verified diagnostic laboratory report from Patholab Cloud is ready:\n" +
                    "• Test: " + testName + "\n" +
                    "• UHID: " + uhid + " (v" + version + ".0)\n\n" +
                    "View & Download Verified PDF:\n" + verifyUrl + "\n\n" +
                    "Thank you for choosing our pathology laboratory!";
            String phoneParam = patientPhone.startsWith("91") ? patientPhone : "91" + patientPhone;
            String url = "https://api.whatsapp.com/send?phone=" + phoneParam + "&text=" + URLEncoder.encode(message, "UTF-8");

            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setData(Uri.parse(url));
            startActivity(intent);
        } catch (Exception e) {
            Toast.makeText(this, "Could not launch WhatsApp", Toast.LENGTH_SHORT).show();
        }
    }
}
