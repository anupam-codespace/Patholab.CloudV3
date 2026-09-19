package cloud.patholab.app;

import android.Manifest;
import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.SurfaceTexture;
import android.hardware.camera2.CameraAccessException;
import android.hardware.camera2.CameraCaptureSession;
import android.hardware.camera2.CameraCharacteristics;
import android.hardware.camera2.CameraDevice;
import android.hardware.camera2.CameraManager;
import android.hardware.camera2.CaptureRequest;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.Vibrator;
import android.view.Surface;
import android.view.TextureView;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.view.animation.Animation;
import android.view.animation.TranslateAnimation;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import java.util.Collections;

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  QRScannerActivity — Full-Screen UPI & Barcode Scanner Activity (Android)
 *  Exact visual parity with user's UPI QR Scanner design.
 * ═══════════════════════════════════════════════════════════════════════════
 */
public class QRScannerActivity extends AppCompatActivity {

    private static final int CAMERA_PERMISSION_REQUEST = 401;
    private static final int GALLERY_PICK_REQUEST = 402;

    private TextureView cameraTextureView;
    private FrameLayout btnScannerBack, btnScannerTorch, btnScannerUpload;
    private ImageView imgTorchIcon;
    private View laserScanLine;

    private CameraDevice cameraDevice;
    private CameraCaptureSession captureSession;
    private CaptureRequest.Builder captureRequestBuilder;
    private CameraManager cameraManager;
    private String cameraId;
    private boolean isTorchOn = false;
    private boolean isCameraReady = false;

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Full-screen translucent status bar
        Window window = getWindow();
        androidx.core.view.WindowCompat.setDecorFitsSystemWindows(window, false);
        if (android.os.Build.VERSION.SDK_INT < 35) {
            window.setStatusBarColor(0x00000000);
        }

        setContentView(R.layout.activity_qr_scanner);

        initViews();
        setupListeners();
        startLaserAnimation();
        setupCameraManager();
    }

    private void initViews() {
        cameraTextureView = findViewById(R.id.cameraTextureView);
        btnScannerBack    = findViewById(R.id.btnScannerBack);
        btnScannerTorch   = findViewById(R.id.btnScannerTorch);
        btnScannerUpload  = findViewById(R.id.btnScannerUpload);
        imgTorchIcon      = findViewById(R.id.imgTorchIcon);
        laserScanLine     = findViewById(R.id.laserScanLine);
    }

    private void setupListeners() {
        btnScannerBack.setOnClickListener(v -> finish());

        btnScannerTorch.setOnClickListener(v -> toggleTorch());

        btnScannerUpload.setOnClickListener(v -> {
            Intent intent = new Intent(Intent.ACTION_PICK);
            intent.setType("image/*");
            startActivityForResult(intent, GALLERY_PICK_REQUEST);
        });

        cameraTextureView.setSurfaceTextureListener(new TextureView.SurfaceTextureListener() {
            @Override
            public void onSurfaceTextureAvailable(@NonNull SurfaceTexture surface, int width, int height) {
                isCameraReady = true;
                openCameraIfPermitted();
            }

            @Override
            public void onSurfaceTextureSizeChanged(@NonNull SurfaceTexture surface, int width, int height) {}

            @Override
            public boolean onSurfaceTextureDestroyed(@NonNull SurfaceTexture surface) {
                closeCamera();
                return true;
            }

            @Override
            public void onSurfaceTextureUpdated(@NonNull SurfaceTexture surface) {}
        });
    }

    private void startLaserAnimation() {
        TranslateAnimation anim = new TranslateAnimation(
                0, 0,
                -dpToPx(110), dpToPx(110)
        );
        anim.setDuration(1300);
        anim.setRepeatCount(Animation.INFINITE);
        anim.setRepeatMode(Animation.REVERSE);
        laserScanLine.startAnimation(anim);
    }

    private void setupCameraManager() {
        cameraManager = (CameraManager) getSystemService(Context.CAMERA_SERVICE);
        if (cameraManager == null) return;
        try {
            for (String id : cameraManager.getCameraIdList()) {
                CameraCharacteristics characteristics = cameraManager.getCameraCharacteristics(id);
                Integer facing = characteristics.get(CameraCharacteristics.LENS_FACING);
                if (facing != null && facing == CameraCharacteristics.LENS_FACING_BACK) {
                    cameraId = id;
                    break;
                }
            }
        } catch (Exception ignored) {}
    }

    private void openCameraIfPermitted() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.CAMERA}, CAMERA_PERMISSION_REQUEST);
            return;
        }

        if (cameraManager == null || cameraId == null || !isCameraReady) return;

        try {
            cameraManager.openCamera(cameraId, new CameraDevice.StateCallback() {
                @Override
                public void onOpened(@NonNull CameraDevice camera) {
                    cameraDevice = camera;
                    startCameraPreview();
                }

                @Override
                public void onDisconnected(@NonNull CameraDevice camera) {
                    camera.close();
                    cameraDevice = null;
                }

                @Override
                public void onError(@NonNull CameraDevice camera, int error) {
                    camera.close();
                    cameraDevice = null;
                }
            }, new Handler(Looper.getMainLooper()));
        } catch (SecurityException | CameraAccessException ignored) {}
    }

    private void startCameraPreview() {
        if (cameraDevice == null || !cameraTextureView.isAvailable()) return;

        SurfaceTexture texture = cameraTextureView.getSurfaceTexture();
        if (texture == null) return;

        texture.setDefaultBufferSize(1080, 1080);
        Surface surface = new Surface(texture);

        try {
            captureRequestBuilder = cameraDevice.createCaptureRequest(CameraDevice.TEMPLATE_PREVIEW);
            captureRequestBuilder.addTarget(surface);

            cameraDevice.createCaptureSession(Collections.singletonList(surface), new CameraCaptureSession.StateCallback() {
                @Override
                public void onConfigured(@NonNull CameraCaptureSession session) {
                    if (cameraDevice == null) return;
                    captureSession = session;
                    try {
                        captureRequestBuilder.set(CaptureRequest.CONTROL_AF_MODE, CaptureRequest.CONTROL_AF_MODE_CONTINUOUS_PICTURE);
                        captureSession.setRepeatingRequest(captureRequestBuilder.build(), null, new Handler(Looper.getMainLooper()));
                    } catch (Exception ignored) {}
                }

                @Override
                public void onConfigureFailed(@NonNull CameraCaptureSession session) {}
            }, new Handler(Looper.getMainLooper()));
        } catch (Exception ignored) {}
    }

    private void toggleTorch() {
        isTorchOn = !isTorchOn;
        if (isTorchOn) {
            imgTorchIcon.setColorFilter(0xFFFBBF24); // Warm yellow glow
        } else {
            imgTorchIcon.setColorFilter(0xFFFFFFFF);
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && cameraManager != null && cameraId != null) {
            try {
                cameraManager.setTorchMode(cameraId, isTorchOn);
            } catch (Exception e) {
                // Fallback inside camera capture session if camera open
                if (captureRequestBuilder != null && captureSession != null) {
                    try {
                        captureRequestBuilder.set(CaptureRequest.FLASH_MODE, isTorchOn ? CaptureRequest.FLASH_MODE_TORCH : CaptureRequest.FLASH_MODE_OFF);
                        captureSession.setRepeatingRequest(captureRequestBuilder.build(), null, null);
                    } catch (Exception ignored) {}
                }
            }
        }
    }

    private void closeCamera() {
        if (captureSession != null) {
            captureSession.close();
            captureSession = null;
        }
        if (cameraDevice != null) {
            cameraDevice.close();
            cameraDevice = null;
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (isCameraReady && cameraDevice == null) {
            openCameraIfPermitted();
        }
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (isTorchOn) toggleTorch();
        closeCamera();
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == CAMERA_PERMISSION_REQUEST) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                openCameraIfPermitted();
            } else {
                Toast.makeText(this, "Camera permission is needed to scan QR & Barcodes", Toast.LENGTH_SHORT).show();
            }
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, @Nullable Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == GALLERY_PICK_REQUEST && resultCode == Activity.RESULT_OK && data != null) {
            Uri imageUri = data.getData();
            if (imageUri != null) {
                triggerHapticFeedback();
                Toast.makeText(this, "QR image loaded from gallery.", Toast.LENGTH_SHORT).show();
            }
        }
    }

    private void triggerHapticFeedback() {
        try {
            Vibrator v = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
            if (v != null && v.hasVibrator()) {
                v.vibrate(60);
            }
        } catch (Exception ignored) {}
    }

    private int dpToPx(int dp) {
        return (int) (dp * getResources().getDisplayMetrics().density);
    }
}
