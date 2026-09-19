package cloud.patholab.app;

import android.content.Context;
import android.content.SharedPreferences;
import android.database.Cursor;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.provider.OpenableColumns;
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
 * InvoiceBrandingActivity — Clean, Luxury Invoice Branding Management
 * Real-time 2-way sync with web portal:
 * - 01. Lab Logo
 * - 02. Letterhead Header
 * - 03. Footer Image
 * - 04. Signature
 * Accurate state tracking: Save Branding is only enabled when real changes are pending.
 * Buttons use pure white bold font.
 */
public class InvoiceBrandingActivity extends AppCompatActivity {

    private static final String BASE_URL = "https://app.patholab.cloud";

    // Header Views
    private FrameLayout btnBack, btnRefresh;
    private ImageView imgRefreshIcon;
    private ProgressBar progressLoading, progressSaving;

    // 01. Lab Logo
    private FrameLayout boxLogoPreview;
    private ImageView imgLogoPreview;
    private TextView lblLogoPlaceholder;
    private TextView lblLogoStatus;
    private Button btnUploadLogo;
    private TextView btnRemoveLogo;
    private Bitmap bmpLogo = null;

    // 02. Letterhead Header
    private FrameLayout boxLetterheadPreview;
    private ImageView imgLetterheadPreview;
    private LinearLayout layoutLetterheadPlaceholder;
    private TextView lblLetterheadStatus;
    private Button btnUploadLetterhead;
    private TextView btnRemoveLetterhead;
    private Bitmap bmpLetterhead = null;

    // 03. Footer Image
    private FrameLayout boxFooterPreview;
    private ImageView imgFooterPreview;
    private LinearLayout layoutFooterPlaceholder;
    private TextView lblFooterStatus;
    private Button btnUploadFooter;
    private TextView btnRemoveFooter;
    private Bitmap bmpFooter = null;

    // 04. Signature
    private FrameLayout boxSignaturePreview;
    private ImageView imgSignaturePreview;
    private TextView lblSignaturePlaceholder;
    private TextView lblSignatureStatus;
    private Button btnUploadSignature;
    private TextView btnRemoveSignature;
    private Bitmap bmpSignature = null;

    // Save Branding Section
    private TextView lblPendingChangesHint;
    private Button btnSaveBranding;
    private TextView lblSaveStatus;

    // Current Values (URL or Base64 Data URI)
    private String currentLogo = "";
    private String currentLetterhead = "";
    private String currentFooter = "";
    private String currentSignature = "";

    // Server-synced Initial Baseline
    private String initialLogo = "";
    private String initialLetterhead = "";
    private String initialFooter = "";
    private String initialSignature = "";

    // File name & size metadata
    private String metaLogo = "";
    private String metaLetterhead = "";
    private String metaFooter = "";
    private String metaSignature = "";

    // State
    private JSONObject fetchedLabData = null;
    private int currentPickingAsset = 0; // 1: Logo, 2: Letterhead, 3: Footer, 4: Signature

    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    private final ActivityResultLauncher<String> filePickerLauncher =
            registerForActivityResult(new ActivityResultContracts.GetContent(), uri -> {
                if (uri != null) {
                    handleFilePicked(uri, currentPickingAsset);
                }
            });

    private boolean hasAsset(String val) {
        if (val == null) return false;
        String trimmed = val.trim();
        return !trimmed.isEmpty() 
                && !trimmed.equalsIgnoreCase("null") 
                && !trimmed.equalsIgnoreCase("undefined");
    }

    private String sanitize(String val) {
        return hasAsset(val) ? val.trim() : "";
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        StatusBarHelper.setStatusBarSapphire(this);
        setContentView(R.layout.activity_invoice_branding);

        initViews();
        setupListeners();
        // Initialize clean UI state: no Remove buttons, 'Choose File' button text
        renderLogoUI();
        renderLetterheadUI();
        renderFooterUI();
        renderSignatureUI();
        updatePendingState();
        fetchBranding(false);
    }

    private void initViews() {
        btnBack                     = findViewById(R.id.btnBrandingBack);
        btnRefresh                  = findViewById(R.id.btnBrandingRefresh);
        imgRefreshIcon              = findViewById(R.id.imgBrandingRefreshIcon);
        progressLoading             = findViewById(R.id.progressBrandingLoading);
        progressSaving              = findViewById(R.id.progressBrandingSaving);

        // 01. Lab Logo
        boxLogoPreview              = findViewById(R.id.boxLogoPreview);
        imgLogoPreview              = findViewById(R.id.imgLogoPreview);
        lblLogoPlaceholder          = findViewById(R.id.lblLogoPlaceholder);
        lblLogoStatus               = findViewById(R.id.lblLogoStatus);
        btnUploadLogo               = findViewById(R.id.btnUploadLogo);
        btnRemoveLogo               = findViewById(R.id.btnRemoveLogo);

        // 02. Letterhead Header
        boxLetterheadPreview        = findViewById(R.id.boxLetterheadPreview);
        imgLetterheadPreview        = findViewById(R.id.imgLetterheadPreview);
        layoutLetterheadPlaceholder = findViewById(R.id.layoutLetterheadPlaceholder);
        lblLetterheadStatus         = findViewById(R.id.lblLetterheadStatus);
        btnUploadLetterhead         = findViewById(R.id.btnUploadLetterhead);
        btnRemoveLetterhead         = findViewById(R.id.btnRemoveLetterhead);

        // 03. Footer Image
        boxFooterPreview            = findViewById(R.id.boxFooterPreview);
        imgFooterPreview            = findViewById(R.id.imgFooterPreview);
        layoutFooterPlaceholder     = findViewById(R.id.layoutFooterPlaceholder);
        lblFooterStatus             = findViewById(R.id.lblFooterStatus);
        btnUploadFooter             = findViewById(R.id.btnUploadFooter);
        btnRemoveFooter             = findViewById(R.id.btnRemoveFooter);

        // 04. Signature
        boxSignaturePreview         = findViewById(R.id.boxSignaturePreview);
        imgSignaturePreview         = findViewById(R.id.imgSignaturePreview);
        lblSignaturePlaceholder     = findViewById(R.id.lblSignaturePlaceholder);
        lblSignatureStatus          = findViewById(R.id.lblSignatureStatus);
        btnUploadSignature          = findViewById(R.id.btnUploadSignature);
        btnRemoveSignature          = findViewById(R.id.btnRemoveSignature);

        // Ensure white font color on all buttons
        if (btnUploadLogo != null) btnUploadLogo.setTextColor(0xFFFFFFFF);
        if (btnUploadLetterhead != null) btnUploadLetterhead.setTextColor(0xFFFFFFFF);
        if (btnUploadFooter != null) btnUploadFooter.setTextColor(0xFFFFFFFF);
        if (btnUploadSignature != null) btnUploadSignature.setTextColor(0xFFFFFFFF);

        // Save Branding
        lblPendingChangesHint       = findViewById(R.id.lblPendingChangesHint);
        btnSaveBranding             = findViewById(R.id.btnSaveBranding);
        lblSaveStatus               = findViewById(R.id.lblSaveStatus);
        if (btnSaveBranding != null) btnSaveBranding.setTextColor(0xFFFFFFFF);
    }

    private void setupListeners() {
        if (btnBack != null) btnBack.setOnClickListener(v -> finish());

        if (btnRefresh != null) {
            btnRefresh.setOnClickListener(v -> {
                spinRefreshIcon();
                fetchBranding(true);
            });
        }

        // 01. Lab Logo Pickers
        View.OnClickListener logoPicker = v -> {
            currentPickingAsset = 1;
            filePickerLauncher.launch("image/*");
        };
        if (btnUploadLogo != null) btnUploadLogo.setOnClickListener(logoPicker);
        if (boxLogoPreview != null) boxLogoPreview.setOnClickListener(logoPicker);
        if (btnRemoveLogo != null) {
            btnRemoveLogo.setOnClickListener(v -> {
                currentLogo = "";
                metaLogo = "";
                bmpLogo = null;
                renderLogoUI();
                updatePendingState();
            });
        }

        // 02. Letterhead Header Pickers
        View.OnClickListener letterheadPicker = v -> {
            currentPickingAsset = 2;
            filePickerLauncher.launch("image/*");
        };
        if (btnUploadLetterhead != null) btnUploadLetterhead.setOnClickListener(letterheadPicker);
        if (boxLetterheadPreview != null) boxLetterheadPreview.setOnClickListener(letterheadPicker);
        if (btnRemoveLetterhead != null) {
            btnRemoveLetterhead.setOnClickListener(v -> {
                currentLetterhead = "";
                metaLetterhead = "";
                bmpLetterhead = null;
                renderLetterheadUI();
                updatePendingState();
            });
        }

        // 03. Footer Image Pickers
        View.OnClickListener footerPicker = v -> {
            currentPickingAsset = 3;
            filePickerLauncher.launch("image/*");
        };
        if (btnUploadFooter != null) btnUploadFooter.setOnClickListener(footerPicker);
        if (boxFooterPreview != null) boxFooterPreview.setOnClickListener(footerPicker);
        if (btnRemoveFooter != null) {
            btnRemoveFooter.setOnClickListener(v -> {
                currentFooter = "";
                metaFooter = "";
                bmpFooter = null;
                renderFooterUI();
                updatePendingState();
            });
        }

        // 04. Signature Pickers
        View.OnClickListener signaturePicker = v -> {
            currentPickingAsset = 4;
            filePickerLauncher.launch("image/*");
        };
        if (btnUploadSignature != null) btnUploadSignature.setOnClickListener(signaturePicker);
        if (boxSignaturePreview != null) boxSignaturePreview.setOnClickListener(signaturePicker);
        if (btnRemoveSignature != null) {
            btnRemoveSignature.setOnClickListener(v -> {
                currentSignature = "";
                metaSignature = "";
                bmpSignature = null;
                renderSignatureUI();
                updatePendingState();
            });
        }

        // Save Branding Button
        if (btnSaveBranding != null) {
            btnSaveBranding.setOnClickListener(v -> {
                if (!hasPendingChanges()) {
                    Toast.makeText(this, "No changes detected. Please choose a file or remove an asset first.", Toast.LENGTH_SHORT).show();
                    return;
                }
                saveBranding();
            });
        }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Pending Changes Tracking & Button State Management
    // ──────────────────────────────────────────────────────────────────────────
    private boolean hasPendingChanges() {
        return !currentLogo.equals(initialLogo) ||
               !currentLetterhead.equals(initialLetterhead) ||
               !currentFooter.equals(initialFooter) ||
               !currentSignature.equals(initialSignature);
    }

    private void updatePendingState() {
        int changes = 0;
        if (!currentLogo.equals(initialLogo)) changes++;
        if (!currentLetterhead.equals(initialLetterhead)) changes++;
        if (!currentFooter.equals(initialFooter)) changes++;
        if (!currentSignature.equals(initialSignature)) changes++;

        if (changes > 0) {
            if (btnSaveBranding != null) {
                btnSaveBranding.setEnabled(true);
                btnSaveBranding.setAlpha(1.0f);
            }
            if (lblPendingChangesHint != null) {
                lblPendingChangesHint.setText("● " + changes + " change(s) ready to upload & sync with web");
                lblPendingChangesHint.setTextColor(0xFF2563EB); // Royal Sapphire Blue
            }
        } else {
            if (btnSaveBranding != null) {
                btnSaveBranding.setEnabled(false);
                btnSaveBranding.setAlpha(0.55f);
            }
            if (lblPendingChangesHint != null) {
                lblPendingChangesHint.setText("No pending changes to save");
                lblPendingChangesHint.setTextColor(0xFF64748B); // Slate Muted
            }
        }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // File Picking & Downsampled Compression
    // ──────────────────────────────────────────────────────────────────────────
    private void handleFilePicked(Uri uri, int assetType) {
        new Thread(() -> {
            try {
                String metaInfo = queryFileMeta(uri);
                Bitmap bitmap = decodeSampledBitmapFromUri(uri, 1400, 1400);

                if (bitmap != null) {
                    ByteArrayOutputStream baos = new ByteArrayOutputStream();
                    bitmap.compress(Bitmap.CompressFormat.PNG, 85, baos);
                    byte[] bytes = baos.toByteArray();
                    String base64 = "data:image/png;base64," + Base64.encodeToString(bytes, Base64.NO_WRAP);

                    mainHandler.post(() -> {
                        if (assetType == 1) {
                            currentLogo = base64;
                            metaLogo = metaInfo;
                            bmpLogo = bitmap;
                            renderLogoUI();
                        } else if (assetType == 2) {
                            currentLetterhead = base64;
                            metaLetterhead = metaInfo;
                            bmpLetterhead = bitmap;
                            renderLetterheadUI();
                        } else if (assetType == 3) {
                            currentFooter = base64;
                            metaFooter = metaInfo;
                            bmpFooter = bitmap;
                            renderFooterUI();
                        } else if (assetType == 4) {
                            currentSignature = base64;
                            metaSignature = metaInfo;
                            bmpSignature = bitmap;
                            renderSignatureUI();
                        }
                        updatePendingState();
                        Toast.makeText(this, "File chosen! Tap 'Save Branding' to sync.", Toast.LENGTH_SHORT).show();
                    });
                } else {
                    mainHandler.post(() -> Toast.makeText(this, "Could not decode selected file.", Toast.LENGTH_SHORT).show());
                }
            } catch (Exception e) {
                mainHandler.post(() -> Toast.makeText(this, "Error reading file: " + e.getMessage(), Toast.LENGTH_SHORT).show());
            }
        }).start();
    }

    private String queryFileMeta(Uri uri) {
        String name = "image.png";
        long sizeBytes = 0;
        try (Cursor cursor = getContentResolver().query(uri, null, null, null, null)) {
            if (cursor != null && cursor.moveToFirst()) {
                int nameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                int sizeIndex = cursor.getColumnIndex(OpenableColumns.SIZE);
                if (nameIndex != -1) name = cursor.getString(nameIndex);
                if (sizeIndex != -1) sizeBytes = cursor.getLong(sizeIndex);
            }
        } catch (Exception ignored) {}

        if (sizeBytes > 0) {
            String formatted = sizeBytes > 1024 * 1024
                    ? String.format("%.1f MB", sizeBytes / (1024.0 * 1024.0))
                    : String.format("%d KB", sizeBytes / 1024);
            return name + " • " + formatted;
        }
        return name;
    }

    private Bitmap decodeSampledBitmapFromUri(Uri uri, int reqWidth, int reqHeight) {
        try {
            BitmapFactory.Options options = new BitmapFactory.Options();
            options.inJustDecodeBounds = true;
            InputStream is = getContentResolver().openInputStream(uri);
            BitmapFactory.decodeStream(is, null, options);
            if (is != null) is.close();

            int inSampleSize = 1;
            if (options.outHeight > reqHeight || options.outWidth > reqWidth) {
                final int halfHeight = options.outHeight / 2;
                final int halfWidth = options.outWidth / 2;
                while ((halfHeight / inSampleSize) >= reqHeight && (halfWidth / inSampleSize) >= reqWidth) {
                    inSampleSize *= 2;
                }
            }

            options.inJustDecodeBounds = false;
            options.inSampleSize = inSampleSize;
            is = getContentResolver().openInputStream(uri);
            Bitmap bitmap = BitmapFactory.decodeStream(is, null, options);
            if (is != null) is.close();
            return bitmap;
        } catch (Exception e) {
            return null;
        }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // UI Renderers for 4 Assets (White Button Font)
    // ──────────────────────────────────────────────────────────────────────────
    private void renderLogoUI() {
        if (hasAsset(currentLogo)) {
            if (bmpLogo != null && imgLogoPreview != null) {
                imgLogoPreview.setImageBitmap(bmpLogo);
                imgLogoPreview.setImageTintList(null);
                imgLogoPreview.setPadding(0, 0, 0, 0);
            }
            if (lblLogoPlaceholder != null) lblLogoPlaceholder.setVisibility(View.GONE);
            if (btnUploadLogo != null) {
                btnUploadLogo.setText("Change File");
                btnUploadLogo.setTextColor(0xFFFFFFFF);
            }
            if (btnRemoveLogo != null) btnRemoveLogo.setVisibility(View.VISIBLE);
            if (lblLogoStatus != null) {
                lblLogoStatus.setText(!metaLogo.isEmpty() ? metaLogo : "Logo active");
                lblLogoStatus.setTextColor(0xFF0F172A);
            }
        } else {
            if (imgLogoPreview != null) {
                imgLogoPreview.setImageResource(R.drawable.ic_gallery_upload);
                imgLogoPreview.setImageTintList(android.content.res.ColorStateList.valueOf(0xFF94A3B8));
                imgLogoPreview.setPadding(30, 30, 30, 30);
            }
            if (lblLogoPlaceholder != null) lblLogoPlaceholder.setVisibility(View.VISIBLE);
            if (btnUploadLogo != null) {
                btnUploadLogo.setText("Choose File");
                btnUploadLogo.setTextColor(0xFFFFFFFF);
            }
            if (btnRemoveLogo != null) btnRemoveLogo.setVisibility(View.GONE);
            if (lblLogoStatus != null) {
                lblLogoStatus.setText("No file chosen");
                lblLogoStatus.setTextColor(0xFF94A3B8);
            }
        }
    }

    private void renderLetterheadUI() {
        if (hasAsset(currentLetterhead)) {
            if (bmpLetterhead != null && imgLetterheadPreview != null) {
                imgLetterheadPreview.setImageBitmap(bmpLetterhead);
                imgLetterheadPreview.setVisibility(View.VISIBLE);
            }
            if (layoutLetterheadPlaceholder != null) layoutLetterheadPlaceholder.setVisibility(View.GONE);
            if (btnUploadLetterhead != null) {
                btnUploadLetterhead.setText("Change File");
                btnUploadLetterhead.setTextColor(0xFFFFFFFF);
            }
            if (btnRemoveLetterhead != null) btnRemoveLetterhead.setVisibility(View.VISIBLE);
            if (lblLetterheadStatus != null) {
                lblLetterheadStatus.setText(!metaLetterhead.isEmpty() ? metaLetterhead : "Header banner active");
                lblLetterheadStatus.setTextColor(0xFF0F172A);
            }
        } else {
            if (imgLetterheadPreview != null) imgLetterheadPreview.setVisibility(View.GONE);
            if (layoutLetterheadPlaceholder != null) layoutLetterheadPlaceholder.setVisibility(View.VISIBLE);
            if (btnUploadLetterhead != null) {
                btnUploadLetterhead.setText("Choose File");
                btnUploadLetterhead.setTextColor(0xFFFFFFFF);
            }
            if (btnRemoveLetterhead != null) btnRemoveLetterhead.setVisibility(View.GONE);
            if (lblLetterheadStatus != null) {
                lblLetterheadStatus.setText("No file chosen");
                lblLetterheadStatus.setTextColor(0xFF94A3B8);
            }
        }
    }

    private void renderFooterUI() {
        if (hasAsset(currentFooter)) {
            if (bmpFooter != null && imgFooterPreview != null) {
                imgFooterPreview.setImageBitmap(bmpFooter);
                imgFooterPreview.setVisibility(View.VISIBLE);
            }
            if (layoutFooterPlaceholder != null) layoutFooterPlaceholder.setVisibility(View.GONE);
            if (btnUploadFooter != null) {
                btnUploadFooter.setText("Change File");
                btnUploadFooter.setTextColor(0xFFFFFFFF);
            }
            if (btnRemoveFooter != null) btnRemoveFooter.setVisibility(View.VISIBLE);
            if (lblFooterStatus != null) {
                lblFooterStatus.setText(!metaFooter.isEmpty() ? metaFooter : "Footer banner active");
                lblFooterStatus.setTextColor(0xFF0F172A);
            }
        } else {
            if (imgFooterPreview != null) imgFooterPreview.setVisibility(View.GONE);
            if (layoutFooterPlaceholder != null) layoutFooterPlaceholder.setVisibility(View.VISIBLE);
            if (btnUploadFooter != null) {
                btnUploadFooter.setText("Choose File");
                btnUploadFooter.setTextColor(0xFFFFFFFF);
            }
            if (btnRemoveFooter != null) btnRemoveFooter.setVisibility(View.GONE);
            if (lblFooterStatus != null) {
                lblFooterStatus.setText("No file chosen");
                lblFooterStatus.setTextColor(0xFF94A3B8);
            }
        }
    }

    private void renderSignatureUI() {
        if (hasAsset(currentSignature)) {
            if (bmpSignature != null && imgSignaturePreview != null) {
                imgSignaturePreview.setImageBitmap(bmpSignature);
                imgSignaturePreview.setImageTintList(null);
                imgSignaturePreview.setPadding(0, 0, 0, 0);
            }
            if (lblSignaturePlaceholder != null) lblSignaturePlaceholder.setVisibility(View.GONE);
            if (btnUploadSignature != null) {
                btnUploadSignature.setText("Change File");
                btnUploadSignature.setTextColor(0xFFFFFFFF);
            }
            if (btnRemoveSignature != null) btnRemoveSignature.setVisibility(View.VISIBLE);
            if (lblSignatureStatus != null) {
                lblSignatureStatus.setText(!metaSignature.isEmpty() ? metaSignature : "Signature active");
                lblSignatureStatus.setTextColor(0xFF0F172A);
            }
        } else {
            if (imgSignaturePreview != null) {
                imgSignaturePreview.setImageResource(R.drawable.ic_edit_pen);
                imgSignaturePreview.setImageTintList(android.content.res.ColorStateList.valueOf(0xFF94A3B8));
                imgSignaturePreview.setPadding(20, 20, 20, 20);
            }
            if (lblSignaturePlaceholder != null) lblSignaturePlaceholder.setVisibility(View.VISIBLE);
            if (btnUploadSignature != null) {
                btnUploadSignature.setText("Choose File");
                btnUploadSignature.setTextColor(0xFFFFFFFF);
            }
            if (btnRemoveSignature != null) btnRemoveSignature.setVisibility(View.GONE);
            if (lblSignatureStatus != null) {
                lblSignatureStatus.setText("No file chosen");
                lblSignatureStatus.setTextColor(0xFF94A3B8);
            }
        }
    }

    private void spinRefreshIcon() {
        if (imgRefreshIcon == null) return;
        RotateAnimation rotate = new RotateAnimation(
                0, 360,
                Animation.RELATIVE_TO_SELF, 0.5f,
                Animation.RELATIVE_TO_SELF, 0.5f
        );
        rotate.setDuration(600);
        imgRefreshIcon.startAnimation(rotate);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Network: Fetch Branding from /api/workspace/settings
    // ──────────────────────────────────────────────────────────────────────────
    private void fetchBranding(boolean isManualRefresh) {
        if (progressLoading != null) progressLoading.setVisibility(View.VISIBLE);

        new Thread(() -> {
            try {
                URL url = new URL(BASE_URL + "/api/workspace/settings");
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("GET");
                conn.setConnectTimeout(10000);
                conn.setReadTimeout(12000);

                applyAuthHeaders(conn);

                int responseCode = conn.getResponseCode();
                if (responseCode >= 200 && responseCode < 300) {
                    BufferedReader reader = new BufferedReader(new InputStreamReader(conn.getInputStream()));
                    StringBuilder sb = new StringBuilder();
                    String line;
                    while ((line = reader.readLine()) != null) {
                        sb.append(line);
                    }
                    reader.close();

                    JSONObject res = new JSONObject(sb.toString());
                    fetchedLabData = res.optJSONObject("lab");

                    mainHandler.post(() -> {
                        if (progressLoading != null) progressLoading.setVisibility(View.GONE);
                        if (fetchedLabData != null) {
                            applyServerBaseline(fetchedLabData);
                            if (lblSaveStatus != null) {
                                lblSaveStatus.setVisibility(View.GONE);
                            }
                        }
                    });
                } else {
                    mainHandler.post(() -> {
                        if (progressLoading != null) progressLoading.setVisibility(View.GONE);
                        if (isManualRefresh) {
                            Toast.makeText(this, "Failed to load assets: HTTP " + responseCode, Toast.LENGTH_SHORT).show();
                        }
                    });
                }
            } catch (Exception e) {
                mainHandler.post(() -> {
                    if (progressLoading != null) progressLoading.setVisibility(View.GONE);
                    if (isManualRefresh) {
                        Toast.makeText(this, "Network error: " + e.getMessage(), Toast.LENGTH_SHORT).show();
                    }
                });
            }
        }).start();
    }

    private void applyServerBaseline(JSONObject lab) {
        initialLogo        = sanitize(lab.optString("logo", ""));
        initialLetterhead  = sanitize(lab.optString("letterhead", ""));
        initialFooter      = sanitize(lab.optString("footer", ""));
        initialSignature   = sanitize(lab.optString("signature", ""));

        currentLogo        = initialLogo;
        currentLetterhead  = initialLetterhead;
        currentFooter      = initialFooter;
        currentSignature   = initialSignature;

        loadRemoteOrBase64(currentLogo, bmp -> {
            bmpLogo = bmp;
            renderLogoUI();
        });
        loadRemoteOrBase64(currentLetterhead, bmp -> {
            bmpLetterhead = bmp;
            renderLetterheadUI();
        });
        loadRemoteOrBase64(currentFooter, bmp -> {
            bmpFooter = bmp;
            renderFooterUI();
        });
        loadRemoteOrBase64(currentSignature, bmp -> {
            bmpSignature = bmp;
            renderSignatureUI();
        });

        updatePendingState();
    }

    interface BitmapLoadedCallback {
        void onBitmapLoaded(Bitmap bitmap);
    }

    private void loadRemoteOrBase64(String source, BitmapLoadedCallback callback) {
        if (!hasAsset(source)) {
            callback.onBitmapLoaded(null);
            return;
        }

        if (source.startsWith("data:image")) {
            try {
                String base64Data = source.substring(source.indexOf(",") + 1);
                byte[] decodedBytes = Base64.decode(base64Data, Base64.DEFAULT);
                Bitmap bitmap = BitmapFactory.decodeByteArray(decodedBytes, 0, decodedBytes.length);
                callback.onBitmapLoaded(bitmap);
                return;
            } catch (Exception e) {
                callback.onBitmapLoaded(null);
                return;
            }
        }

        final String fullUrl = source.startsWith("/") ? BASE_URL + source : source;

        new Thread(() -> {
            try {
                URL url = new URL(fullUrl);
                InputStream is = url.openStream();
                Bitmap bitmap = BitmapFactory.decodeStream(is);
                if (is != null) is.close();
                mainHandler.post(() -> callback.onBitmapLoaded(bitmap));
            } catch (Exception e) {
                mainHandler.post(() -> callback.onBitmapLoaded(null));
            }
        }).start();
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Network: Save Branding to /api/workspace/settings
    // ──────────────────────────────────────────────────────────────────────────
    private void saveBranding() {
        if (progressSaving != null) progressSaving.setVisibility(View.VISIBLE);
        if (btnSaveBranding != null) btnSaveBranding.setEnabled(false);
        if (lblSaveStatus != null) lblSaveStatus.setVisibility(View.GONE);

        new Thread(() -> {
            try {
                URL url = new URL(BASE_URL + "/api/workspace/settings");
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("PUT");
                conn.setRequestProperty("Content-Type", "application/json");
                conn.setDoOutput(true);
                conn.setConnectTimeout(15000);
                conn.setReadTimeout(18000);

                applyAuthHeaders(conn);

                // Merge and preserve existing settings
                JSONObject payload = fetchedLabData != null ? new JSONObject(fetchedLabData.toString()) : new JSONObject();
                payload.put("logo", hasAsset(currentLogo) ? currentLogo : JSONObject.NULL);
                payload.put("letterhead", hasAsset(currentLetterhead) ? currentLetterhead : JSONObject.NULL);
                payload.put("footer", hasAsset(currentFooter) ? currentFooter : JSONObject.NULL);
                payload.put("signature", hasAsset(currentSignature) ? currentSignature : JSONObject.NULL);

                OutputStream os = conn.getOutputStream();
                os.write(payload.toString().getBytes(StandardCharsets.UTF_8));
                os.flush();
                os.close();

                int code = conn.getResponseCode();
                mainHandler.post(() -> {
                    if (progressSaving != null) progressSaving.setVisibility(View.GONE);

                    if (code >= 200 && code < 300) {
                        // Reset baseline to current
                        initialLogo = currentLogo;
                        initialLetterhead = currentLetterhead;
                        initialFooter = currentFooter;
                        initialSignature = currentSignature;

                        renderLogoUI();
                        renderLetterheadUI();
                        renderFooterUI();
                        renderSignatureUI();

                        updatePendingState();

                        if (lblSaveStatus != null) {
                            lblSaveStatus.setText("✓ Branding successfully saved & synced with website!");
                            lblSaveStatus.setTextColor(0xFF059669); // Emerald green
                            lblSaveStatus.setVisibility(View.VISIBLE);
                        }
                        Toast.makeText(this, "Branding assets synced with website!", Toast.LENGTH_SHORT).show();
                    } else {
                        if (btnSaveBranding != null) btnSaveBranding.setEnabled(true);
                        if (lblSaveStatus != null) {
                            lblSaveStatus.setText("Failed to save: HTTP " + code);
                            lblSaveStatus.setTextColor(0xFFDC2626);
                            lblSaveStatus.setVisibility(View.VISIBLE);
                        }
                        Toast.makeText(this, "Save failed. HTTP code: " + code, Toast.LENGTH_SHORT).show();
                    }
                });
            } catch (Exception e) {
                mainHandler.post(() -> {
                    if (progressSaving != null) progressSaving.setVisibility(View.GONE);
                    if (btnSaveBranding != null) btnSaveBranding.setEnabled(true);
                    if (lblSaveStatus != null) {
                        lblSaveStatus.setText("Save failed: " + e.getMessage());
                        lblSaveStatus.setTextColor(0xFFDC2626);
                        lblSaveStatus.setVisibility(View.VISIBLE);
                    }
                    Toast.makeText(this, "Save error: " + e.getMessage(), Toast.LENGTH_SHORT).show();
                });
            }
        }).start();
    }

    private void applyAuthHeaders(HttpURLConnection conn) {
        String token = AuthManager.getToken(this);
        if (token != null && !token.isEmpty()) {
            conn.setRequestProperty("Authorization", "Bearer " + token);
        }

        SharedPreferences prefs = getSharedPreferences("PathoLabPrefs", Context.MODE_PRIVATE);
        String legacyToken = prefs.getString("auth_token", null);
        if ((token == null || token.isEmpty()) && legacyToken != null) {
            conn.setRequestProperty("Authorization", "Bearer " + legacyToken);
        }

        String cookies = CookieManager.getInstance().getCookie(BASE_URL);
        if (cookies != null && !cookies.isEmpty()) {
            conn.setRequestProperty("Cookie", cookies);
        }
    }
}
