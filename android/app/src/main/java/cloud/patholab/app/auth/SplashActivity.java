package cloud.patholab.app.auth;

import android.content.Intent;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import androidx.appcompat.app.AppCompatActivity;
import cloud.patholab.app.MainActivity;
import cloud.patholab.app.R;
import cloud.patholab.app.api.ApiClient;

public class SplashActivity extends AppCompatActivity {

    private static final int MIN_SPLASH_TIME_MS = 2000; // 2 seconds
    private static final int SESSION_CHECK_TIMEOUT_MS = 5000;
    private final Handler handler = new Handler(Looper.getMainLooper());
    
    private boolean apiCompleted = false;
    private boolean apiSuccess = false;
    private String apiToken = null;
    private boolean minTimeElapsed = false;
    private boolean routed = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_splash);

        // White immersive status & navigation bars with dark icons
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
            getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR);
            getWindow().setStatusBarColor(0xFFFFFFFF);
            getWindow().setNavigationBarColor(0xFFFFFFFF);
        }

        final String token = AuthManager.getToken(this);

        // Start timer for minimum splash display
        handler.postDelayed(new Runnable() {
            @Override
            public void run() {
                minTimeElapsed = true;
                checkRouting();
            }
        }, MIN_SPLASH_TIME_MS);

        if (token == null || token.isEmpty()) {
            apiCompleted = true;
            apiSuccess = false;
            // The handler will trigger routing once the minimum splash time finishes
            return;
        }

        // Safety timeout for API check
        handler.postDelayed(new Runnable() {
            @Override
            public void run() {
                if (!apiCompleted) {
                    apiCompleted = true;
                    apiSuccess = false;
                    AuthManager.clearSession(SplashActivity.this);
                    checkRouting();
                }
            }
        }, SESSION_CHECK_TIMEOUT_MS);

        ApiClient.getMe(token, new ApiClient.ApiCallback() {
            @Override
            public void onResult(final boolean success, String error, String data) {
                runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        if (apiCompleted) return;
                        apiCompleted = true;
                        apiSuccess = success;
                        apiToken = token;
                        if (!success) {
                            AuthManager.clearSession(SplashActivity.this);
                        }
                        checkRouting();
                    }
                });
            }
        });
    }

    private void checkRouting() {
        if (!minTimeElapsed || !apiCompleted || routed || isFinishing()) {
            return;
        }
        routed = true;
        handler.removeCallbacksAndMessages(null);

        if (apiSuccess && apiToken != null) {
            AuthManager.syncWebViewCookie(apiToken);
            goToMain();
        } else {
            goToLogin();
        }
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        handler.removeCallbacksAndMessages(null);
    }

    private void goToLogin() {
        startActivity(new Intent(this, LoginActivity.class));
        finish();
        overridePendingTransition(android.R.anim.fade_in, R.anim.fade_scale_out);
    }

    private void goToMain() {
        startActivity(new Intent(this, MainActivity.class));
        finish();
        overridePendingTransition(R.anim.slide_up_fade_in, R.anim.fade_scale_out);
    }
}
