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

    private static final int MIN_SPLASH_TIME_MS = 1200; // Snappy 1.2s splash
    private final Handler handler = new Handler(Looper.getMainLooper());
    private boolean routed = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // If an instance of MainActivity already exists in background, resume it and finish immediately
        if (!isTaskRoot()) {
            Intent intent = getIntent();
            if (intent != null && intent.hasCategory(Intent.CATEGORY_LAUNCHER) && Intent.ACTION_MAIN.equals(intent.getAction())) {
                finish();
                return;
            }
        }

        setContentView(R.layout.activity_splash);

        // White immersive status & navigation bars with dark icons
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
            getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR);
            getWindow().setStatusBarColor(0xFFFFFFFF);
            getWindow().setNavigationBarColor(0xFFFFFFFF);
        }

        final String token = AuthManager.getToken(this);

        if (token != null && !token.trim().isEmpty()) {
            // User is authenticated! Pre-sync webview cookie immediately
            AuthManager.syncWebViewCookie(token);

            // Fetch latest user info in background (non-blocking, never log out on network hiccup)
            ApiClient.getMe(token, (success, error, data) -> {
                // Background profile sync complete
            });

            // Route to main after brief splash animation
            handler.postDelayed(() -> {
                if (!routed && !isFinishing()) {
                    routed = true;
                    goToMain();
                }
            }, MIN_SPLASH_TIME_MS);
        } else {
            // Not authenticated: Route to Onboarding or Login after splash
            handler.postDelayed(() -> {
                if (!routed && !isFinishing()) {
                    routed = true;
                    if (AuthManager.isOnboardingCompleted(this)) {
                        goToLogin();
                    } else {
                        goToOnboarding();
                    }
                }
            }, MIN_SPLASH_TIME_MS);
        }
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        handler.removeCallbacksAndMessages(null);
    }

    private void goToOnboarding() {
        startActivity(new Intent(this, OnboardingActivity.class));
        finish();
        overridePendingTransition(android.R.anim.fade_in, R.anim.fade_scale_out);
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
