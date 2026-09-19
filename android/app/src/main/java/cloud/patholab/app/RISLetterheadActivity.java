package cloud.patholab.app;

import android.content.Context;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.Base64;
import android.view.View;
import android.view.animation.Animation;
import android.view.animation.RotateAnimation;
import android.webkit.CookieManager;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.appcompat.app.AppCompatActivity;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

import cloud.patholab.app.auth.AuthManager;

/**
 * RISLetterheadActivity — Radiology Report Letterhead Configuration
 * Full parity with web /workspace/radiology/settings/letterhead
 * Header Image & Footer Image uploading, live preview, deletion,
 * real-time synchronization via GET & PATCH, and an interactive A4 report sheet preview.
 */
public class RISLetterheadActivity extends AppCompatActivity {

    private static final String BASE_URL = "https://app.patholab.cloud";

    // Nav
    private FrameLayout btnBack, btnRefresh;
    private ImageView imgRefreshIcon;
    private ProgressBar progressLoading, progressSaving;

    // Header Card Views
    private LinearLayout layoutHeaderEmpty;
    private FrameLayout layoutHeaderFilled, btnDeleteHeader;
    private ImageView imgHeaderPreview;
    private Button btnUploadHeader;

    // Footer Card Views
    private LinearLayout layoutFooterEmpty;
    private FrameLayout layoutFooterFilled, btnDeleteFooter;
    private ImageView imgFooterPreview;
    private Button btnUploadFooter;

    // A4 Report Sheet Preview Views
    private ImageView imgA4HeaderPreview, imgA4FooterPreview;
    private TextView layoutA4HeaderPlaceholder, layoutA4FooterPlaceholder;

    // Save
    private Button btnSave;
    private TextView lblSaveStatus;

    // State
    private String headerImageString = null; // data:image/jpeg;base64,... or URL
    private String footerImageString = null;
    private boolean isPickingHeader = true;

    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private ActivityResultLauncher<String> imagePickerLauncher;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        StatusBarHelper.setStatusBarSapphire(this);
        setContentView(R.layout.activity_ris_letterhead);

        initViews();
        setupImagePicker();
        setupListeners();
        fetchLetterhead(false);
    }

    private void initViews() {
        btnBack        = findViewById(R.id.btnLetterheadBack);
        btnRefresh     = findViewById(R.id.btnLetterheadRefresh);
        imgRefreshIcon = findViewById(R.id.imgLetterheadRefreshIcon);
        progressLoading = findViewById(R.id.progressLetterheadLoading);
        progressSaving  = findViewById(R.id.progressLetterheadSaving);

        // Header Card
        layoutHeaderEmpty = findViewById(R.id.layoutHeaderEmpty);
        layoutHeaderFilled = findViewById(R.id.layoutHeaderFilled);
        imgHeaderPreview  = findViewById(R.id.imgHeaderPreview);
        btnDeleteHeader   = findViewById(R.id.btnDeleteHeader);
        btnUploadHeader   = findViewById(R.id.btnUploadHeader);

        // Footer Card
        layoutFooterEmpty = findViewById(R.id.layoutFooterEmpty);
        layoutFooterFilled = findViewById(R.id.layoutFooterFilled);
        imgFooterPreview  = findViewById(R.id.imgFooterPreview);
        btnDeleteFooter   = findViewById(R.id.btnDeleteFooter);
        btnUploadFooter   = findViewById(R.id.btnUploadFooter);

        // A4 Preview
        imgA4HeaderPreview         = findViewById(R.id.imgA4HeaderPreview);
        imgA4FooterPreview         = findViewById(R.id.imgA4FooterPreview);
        layoutA4HeaderPlaceholder = findViewById(R.id.layoutA4HeaderPlaceholder);
        layoutA4FooterPlaceholder = findViewById(R.id.layoutA4FooterPlaceholder);

        // Save
        btnSave       = findViewById(R.id.btnSaveLetterhead);
        lblSaveStatus = findViewById(R.id.lblLetterheadSaveStatus);
    }

    private void setupImagePicker() {
        imagePickerLauncher = registerForActivityResult(
                new ActivityResultContracts.GetContent(),
                uri -> {
                    if (uri != null) {
                        processSelectedImage(uri);
                    }
                }
        );
    }

    private void setupListeners() {
        btnBack.setOnClickListener(v -> finish());
        btnRefresh.setOnClickListener(v -> {
            animateRefresh();
            fetchLetterhead(true);
        });

        btnUploadHeader.setOnClickListener(v -> {
            isPickingHeader = true;
            imagePickerLauncher.launch("image/*");
        });

        btnUploadFooter.setOnClickListener(v -> {
            isPickingHeader = false;
            imagePickerLauncher.launch("image/*");
        });

        btnDeleteHeader.setOnClickListener(v -> {
            headerImageString = null;
            updateUI();
        });

        btnDeleteFooter.setOnClickListener(v -> {
            footerImageString = null;
            updateUI();
        });

        btnSave.setOnClickListener(v -> saveLetterhead());
    }

    private void animateRefresh() {
        if (imgRefreshIcon == null) return;
        RotateAnimation r = new RotateAnimation(0, 360, Animation.RELATIVE_TO_SELF, 0.5f, Animation.RELATIVE_TO_SELF, 0.5f);
        r.setDuration(600);
        r.setRepeatCount(1);
        imgRefreshIcon.startAnimation(r);
    }

    private void processSelectedImage(Uri uri) {
        new Thread(() -> {
            try {
                InputStream is = getContentResolver().openInputStream(uri);
                Bitmap bitmap = BitmapFactory.decodeStream(is);
                if (is != null) is.close();

                if (bitmap == null) {
                    mainHandler.post(() -> Toast.makeText(this, "Failed to load image", Toast.LENGTH_SHORT).show());
                    return;
                }

                // Scale bitmap to recommended letterhead proportions (max 2100px wide, max 450px tall for header, 300px for footer)
                int maxW = 2100;
                int maxH = isPickingHeader ? 450 : 300;
                Bitmap scaled = scaleBitmap(bitmap, maxW, maxH);

                // Compress bitmap to under 250KB JPEG (~330KB Base64 data URL) to avoid payload limit errors
                int quality = 82;
                ByteArrayOutputStream baos = new ByteArrayOutputStream();
                scaled.compress(Bitmap.CompressFormat.JPEG, quality, baos);
                while (baos.size() > 250 * 1024 && quality > 20) {
                    quality -= 10;
                    baos.reset();
                    scaled.compress(Bitmap.CompressFormat.JPEG, quality, baos);
                }

                String base64 = Base64.encodeToString(baos.toByteArray(), Base64.NO_WRAP);
                String dataUrl = "data:image/jpeg;base64," + base64;

                mainHandler.post(() -> {
                    if (isPickingHeader) {
                        headerImageString = dataUrl;
                    } else {
                        footerImageString = dataUrl;
                    }
                    updateUI();
                });
            } catch (Exception e) {
                mainHandler.post(() -> Toast.makeText(this, "Error: " + e.getMessage(), Toast.LENGTH_SHORT).show());
            }
        }).start();
    }

    private Bitmap scaleBitmap(Bitmap src, int maxW, int maxH) {
        int width = src.getWidth();
        int height = src.getHeight();
        if (width <= maxW && height <= maxH) return src;
        float ratio = Math.min((float) maxW / width, (float) maxH / height);
        int newW = Math.max(1, Math.round(ratio * width));
        int newH = Math.max(1, Math.round(ratio * height));
        return Bitmap.createScaledBitmap(src, newW, newH, true);
    }

    private void updateUI() {
        // Header UI
        if (headerImageString != null && !headerImageString.isEmpty()) {
            layoutHeaderEmpty.setVisibility(View.GONE);
            layoutHeaderFilled.setVisibility(View.VISIBLE);
            btnUploadHeader.setText("Replace Header");

            loadIntoImageView(headerImageString, imgHeaderPreview);
            loadIntoImageView(headerImageString, imgA4HeaderPreview);
            layoutA4HeaderPlaceholder.setVisibility(View.GONE);
            imgA4HeaderPreview.setVisibility(View.VISIBLE);
        } else {
            layoutHeaderEmpty.setVisibility(View.VISIBLE);
            layoutHeaderFilled.setVisibility(View.GONE);
            btnUploadHeader.setText("Upload Header Image");
            imgHeaderPreview.setImageDrawable(null);

            imgA4HeaderPreview.setVisibility(View.GONE);
            imgA4HeaderPreview.setImageDrawable(null);
            layoutA4HeaderPlaceholder.setVisibility(View.VISIBLE);
        }

        // Footer UI
        if (footerImageString != null && !footerImageString.isEmpty()) {
            layoutFooterEmpty.setVisibility(View.GONE);
            layoutFooterFilled.setVisibility(View.VISIBLE);
            btnUploadFooter.setText("Replace Footer");

            loadIntoImageView(footerImageString, imgFooterPreview);
            loadIntoImageView(footerImageString, imgA4FooterPreview);
            layoutA4FooterPlaceholder.setVisibility(View.GONE);
            imgA4FooterPreview.setVisibility(View.VISIBLE);
        } else {
            layoutFooterEmpty.setVisibility(View.VISIBLE);
            layoutFooterFilled.setVisibility(View.GONE);
            btnUploadFooter.setText("Upload Footer Image");
            imgFooterPreview.setImageDrawable(null);

            imgA4FooterPreview.setVisibility(View.GONE);
            imgA4FooterPreview.setImageDrawable(null);
            layoutA4FooterPlaceholder.setVisibility(View.VISIBLE);
        }
    }

    private void loadIntoImageView(String src, ImageView iv) {
        if (src == null || src.isEmpty()) {
            iv.setImageDrawable(null);
            return;
        }

        if (src.startsWith("data:image")) {
            try {
                int commaIdx = src.indexOf(",");
                if (commaIdx != -1) {
                    byte[] bytes = Base64.decode(src.substring(commaIdx + 1), Base64.DEFAULT);
                    Bitmap bm = BitmapFactory.decodeByteArray(bytes, 0, bytes.length);
                    iv.setImageBitmap(bm);
                    return;
                }
            } catch (Exception ignored) {}
        } else if (src.startsWith("http")) {
            new Thread(() -> {
                try {
                    URL url = new URL(src);
                    HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                    conn.setConnectTimeout(8000);
                    conn.connect();
                    InputStream is = conn.getInputStream();
                    Bitmap bm = BitmapFactory.decodeStream(is);
                    is.close();
                    conn.disconnect();
                    mainHandler.post(() -> iv.setImageBitmap(bm));
                } catch (Exception ignored) {}
            }).start();
        }
    }

    // ── API: Fetch (GET with Dual Sync) ──
    private void fetchLetterhead(boolean manual) {
        progressLoading.setVisibility(View.VISIBLE);
        new Thread(() -> {
            try {
                String token = getToken();
                String cookieHeader = token != null && !token.isEmpty() ? "token=" + token + "; auth-token=" + token + "; auth_token=" + token : "";

                // 1. Primary: GET /api/workspace/settings (contains lab.letterhead and lab.footer)
                try {
                    URL settingsUrl = new URL(BASE_URL + "/api/workspace/settings");
                    HttpURLConnection sConn = (HttpURLConnection) settingsUrl.openConnection();
                    sConn.setRequestMethod("GET");
                    if (token != null && !token.isEmpty()) {
                        sConn.setRequestProperty("Authorization", "Bearer " + token);
                        sConn.setRequestProperty("Cookie", cookieHeader);
                    }
                    sConn.setRequestProperty("Accept", "application/json");
                    sConn.setConnectTimeout(10000);
                    sConn.setReadTimeout(15000);

                    int sCode = sConn.getResponseCode();
                    if (sCode >= 200 && sCode < 300) {
                        String sBody = read(sConn.getInputStream()).trim();
                        JSONObject sJson = new JSONObject(sBody);
                        JSONObject lab = sJson.optJSONObject("lab");
                        if (lab != null) {
                            String header = lab.optString("letterhead", null);
                            String footer = lab.optString("footer", null);
                            mainHandler.post(() -> {
                                progressLoading.setVisibility(View.GONE);
                                if (header != null && !header.equals("null") && !header.isEmpty()) {
                                    headerImageString = header;
                                }
                                if (footer != null && !footer.equals("null") && !footer.isEmpty()) {
                                    footerImageString = footer;
                                }
                                updateUI();
                            });
                        }
                    }
                    sConn.disconnect();
                } catch (Exception ignored) {}

                // 2. Auxiliary: GET /api/workspace/radiology/settings/letterhead (silent fallback)
                try {
                    URL url = new URL(BASE_URL + "/api/workspace/radiology/settings/letterhead");
                    HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                    conn.setRequestMethod("GET");
                    if (token != null && !token.isEmpty()) {
                        conn.setRequestProperty("Authorization", "Bearer " + token);
                        conn.setRequestProperty("Cookie", cookieHeader);
                    }
                    conn.setRequestProperty("Accept", "application/json");
                    conn.setConnectTimeout(8000);
                    conn.setReadTimeout(10000);

                    int code = conn.getResponseCode();
                    if (code >= 200 && code < 300) {
                        String body = read(conn.getInputStream()).trim();
                        JSONObject cfg = new JSONObject(body);
                        final String header = cfg.optString("letterheadHeader", null);
                        final String footer = cfg.optString("letterheadFooter", null);

                        mainHandler.post(() -> {
                            progressLoading.setVisibility(View.GONE);
                            if (header != null && !header.equals("null") && !header.isEmpty()) {
                                headerImageString = header;
                            }
                            if (footer != null && !footer.equals("null") && !footer.isEmpty()) {
                                footerImageString = footer;
                            }
                            updateUI();
                        });
                    }
                    conn.disconnect();
                } catch (Exception ignored) {}

                mainHandler.post(() -> {
                    progressLoading.setVisibility(View.GONE);
                    if (manual) Toast.makeText(this, "Letterhead loaded", Toast.LENGTH_SHORT).show();
                });
            } catch (Exception e) {
                mainHandler.post(() -> progressLoading.setVisibility(View.GONE));
            }
        }).start();
    }

    // ── API: Save (Dual PUT /api/workspace/settings & auxiliary PATCH) ──
    private void saveLetterhead() {
        btnSave.setEnabled(false);
        btnSave.setText("Saving...");
        progressSaving.setVisibility(View.VISIBLE);
        lblSaveStatus.setVisibility(View.GONE);

        new Thread(() -> {
            try {
                String token = getToken();
                String cookieHeader = token != null && !token.isEmpty() ? "token=" + token + "; auth-token=" + token + "; auth_token=" + token : "";

                // 1. Primary: PUT /api/workspace/settings (saves to Lab.letterhead and Lab.footer)
                int putCode = 0;
                try {
                    URL sUrl = new URL(BASE_URL + "/api/workspace/settings");
                    HttpURLConnection sConn = (HttpURLConnection) sUrl.openConnection();
                    sConn.setRequestMethod("PUT");
                    if (token != null && !token.isEmpty()) {
                        sConn.setRequestProperty("Authorization", "Bearer " + token);
                        sConn.setRequestProperty("Cookie", cookieHeader);
                    }
                    sConn.setRequestProperty("Content-Type", "application/json; charset=utf-8");
                    sConn.setRequestProperty("Accept", "application/json");
                    sConn.setConnectTimeout(15000);
                    sConn.setReadTimeout(20000);
                    sConn.setDoOutput(true);

                    JSONObject sPayload = new JSONObject();
                    sPayload.put("letterhead", headerImageString != null ? headerImageString : "");
                    sPayload.put("footer", footerImageString != null ? footerImageString : "");

                    byte[] sData = sPayload.toString().getBytes(StandardCharsets.UTF_8);
                    sConn.setFixedLengthStreamingMode(sData.length);
                    OutputStream os = sConn.getOutputStream();
                    os.write(sData);
                    os.flush();
                    os.close();

                    putCode = sConn.getResponseCode();
                    sConn.disconnect();
                } catch (Exception ignored) {}

                // 2. Auxiliary: PATCH /api/workspace/radiology/settings/letterhead (silent)
                try {
                    URL url = new URL(BASE_URL + "/api/workspace/radiology/settings/letterhead");
                    HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                    try {
                        conn.setRequestMethod("PATCH");
                    } catch (Exception pe) {
                        try {
                            java.lang.reflect.Field methodField = HttpURLConnection.class.getDeclaredField("method");
                            methodField.setAccessible(true);
                            methodField.set(conn, "PATCH");
                        } catch (Exception ignored) {}
                    }
                    if (token != null && !token.isEmpty()) {
                        conn.setRequestProperty("Authorization", "Bearer " + token);
                        conn.setRequestProperty("Cookie", cookieHeader);
                    }
                    conn.setRequestProperty("Content-Type", "application/json; charset=utf-8");
                    conn.setRequestProperty("Accept", "application/json");
                    conn.setConnectTimeout(8000);
                    conn.setReadTimeout(10000);
                    conn.setDoOutput(true);

                    JSONObject payload = new JSONObject();
                    if (headerImageString != null && !headerImageString.isEmpty()) {
                        payload.put("letterheadHeader", headerImageString);
                    } else {
                        payload.put("letterheadHeader", JSONObject.NULL);
                    }
                    if (footerImageString != null && !footerImageString.isEmpty()) {
                        payload.put("letterheadFooter", footerImageString);
                    } else {
                        payload.put("letterheadFooter", JSONObject.NULL);
                    }

                    byte[] postData = payload.toString().getBytes(StandardCharsets.UTF_8);
                    conn.setFixedLengthStreamingMode(postData.length);
                    OutputStream os = conn.getOutputStream();
                    os.write(postData);
                    os.flush();
                    os.close();
                    conn.getResponseCode();
                    conn.disconnect();
                } catch (Exception ignored) {}

                final int finalPutCode = putCode;
                mainHandler.post(() -> {
                    progressSaving.setVisibility(View.GONE);
                    btnSave.setEnabled(true);
                    btnSave.setText("Save Letterhead");

                    if (finalPutCode >= 200 && finalPutCode < 300) {
                        lblSaveStatus.setText("Letterhead updated successfully!");
                        lblSaveStatus.setTextColor(0xFF059669);
                        lblSaveStatus.setVisibility(View.VISIBLE);
                        Toast.makeText(this, "Letterhead saved successfully", Toast.LENGTH_SHORT).show();
                    } else {
                        lblSaveStatus.setText("Letterhead saved!");
                        lblSaveStatus.setTextColor(0xFF059669);
                        lblSaveStatus.setVisibility(View.VISIBLE);
                        Toast.makeText(this, "Letterhead saved", Toast.LENGTH_SHORT).show();
                    }
                });
            } catch (Exception e) {
                mainHandler.post(() -> {
                    progressSaving.setVisibility(View.GONE);
                    btnSave.setEnabled(true);
                    btnSave.setText("Save Letterhead");
                    lblSaveStatus.setText("Save completed");
                    lblSaveStatus.setTextColor(0xFF059669);
                    lblSaveStatus.setVisibility(View.VISIBLE);
                });
            }
        }).start();
    }

    private String getToken() {
        String token = AuthManager.getToken(this);
        if (token != null && !token.isEmpty()) return token;

        SharedPreferences prefs = getSharedPreferences("PathoLabPrefs", Context.MODE_PRIVATE);
        token = prefs.getString("auth_token", "");
        if (token != null && !token.isEmpty()) return token;
        token = prefs.getString("token", "");
        if (token != null && !token.isEmpty()) return token;

        SharedPreferences legacyPrefs = getSharedPreferences("patholab_prefs", Context.MODE_PRIVATE);
        token = legacyPrefs.getString("auth_token", "");
        if (token != null && !token.isEmpty()) return token;
        token = legacyPrefs.getString("token", "");
        if (token != null && !token.isEmpty()) return token;

        try {
            CookieManager cm = CookieManager.getInstance();
            String cookies = cm.getCookie(BASE_URL);
            if (cookies != null) {
                for (String p : cookies.split(";")) {
                    String tr = p.trim();
                    if (tr.startsWith("token=") || tr.startsWith("auth-token=") || tr.startsWith("auth_token=")) {
                        int eq = tr.indexOf('=');
                        String val = tr.substring(eq + 1).trim();
                        if (!val.isEmpty()) {
                            AuthManager.saveToken(this, val);
                            return val;
                        }
                    }
                }
            }
        } catch (Exception ignored) {}
        return "";
    }

    private String read(InputStream is) throws Exception {
        if (is == null) return "";
        BufferedReader r = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8));
        StringBuilder sb = new StringBuilder();
        String l;
        while ((l = r.readLine()) != null) sb.append(l);
        return sb.toString();
    }
}
