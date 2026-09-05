package cloud.patholab.app.auth;

import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.text.InputType;
import android.util.Patterns;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.widget.Button;
import android.widget.EditText;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import cloud.patholab.app.MainActivity;
import cloud.patholab.app.R;
import cloud.patholab.app.api.ApiClient;

public class LoginActivity extends AppCompatActivity {

    private EditText etEmail;
    private EditText etPassword;
    private Button btnLogin;
    private ProgressBar progressBar;
    private LinearLayout errorBanner;
    private TextView tvError;
    private ImageView ivTogglePassword;
    private TextView tvForgotPassword;
    private TextView tvSignUp;

    private boolean passwordVisible = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_login);
        AuthHelper.setupVideoBackground(this);

        applyStatusBarStyle();
        adjustStatusBarSpacer();
        bindViews();
        setupListeners();

        if (getIntent().getBooleanExtra("verified", false)) {
            showError("Email verified! Please sign in.", true);
        }
    }

    private void applyStatusBarStyle() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            int flags = View.SYSTEM_UI_FLAG_LAYOUT_STABLE | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                flags |= View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
            }
            getWindow().getDecorView().setSystemUiVisibility(flags);
            getWindow().setStatusBarColor(android.graphics.Color.TRANSPARENT);
            getWindow().setNavigationBarColor(0xFFFFFFFF);
        }
    }

    private void adjustStatusBarSpacer() {
        final View spacer = findViewById(R.id.statusBarSpacer);
        if (spacer != null) {
            ViewCompat.setOnApplyWindowInsetsListener(spacer, (v, insets) -> {
                int top = insets.getInsets(WindowInsetsCompat.Type.statusBars()).top;
                v.getLayoutParams().height = top;
                v.requestLayout();
                return insets;
            });
        }
    }

    private void bindViews() {
        etEmail = findViewById(R.id.etEmail);
        etPassword = findViewById(R.id.etPassword);
        btnLogin = findViewById(R.id.btnLogin);
        progressBar = findViewById(R.id.progressBar);
        errorBanner = findViewById(R.id.errorBanner);
        tvError = findViewById(R.id.tvError);
        ivTogglePassword = findViewById(R.id.ivTogglePassword);
        tvForgotPassword = findViewById(R.id.tvForgotPassword);
        tvSignUp = findViewById(R.id.tvSignUp);
    }

    private void setupListeners() {
        btnLogin.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                attemptLogin();
            }
        });

        PasswordEyeHelper.setupPasswordToggle(etPassword, ivTogglePassword);

        tvForgotPassword.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                startActivity(new Intent(LoginActivity.this, ForgotPasswordActivity.class));
            }
        });

        tvSignUp.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                startActivity(new Intent(LoginActivity.this, RegisterActivity.class));
                overridePendingTransition(android.R.anim.slide_in_left, android.R.anim.slide_out_right);
            }
        });

        AuthHelper.setupLegalLinks(this);
    }

    private void attemptLogin() {
        final String email = etEmail.getText().toString().trim();
        final String password = etPassword.getText().toString();

        if (email.isEmpty() || !Patterns.EMAIL_ADDRESS.matcher(email).matches()) {
            showError("Please enter a valid email address.", false);
            return;
        }
        if (password.isEmpty()) {
            showError("Please enter your password.", false);
            return;
        }

        hideError();
        setLoading(true);

        ApiClient.login(email, password, new ApiClient.ApiCallback() {
            @Override
            public void onResult(final boolean success, final String error, final String token) {
                runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        setLoading(false);
                        if (success && token != null) {
                            AuthManager.saveToken(LoginActivity.this, token);
                            AuthManager.saveUserInfo(LoginActivity.this, email, "User", "Lab Owner");
                            try {
                                Vibrator v = (Vibrator) getSystemService(VIBRATOR_SERVICE);
                                if (v != null) {
                                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                                        v.vibrate(VibrationEffect.createOneShot(50, VibrationEffect.DEFAULT_AMPLITUDE));
                                    } else {
                                        v.vibrate(50);
                                    }
                                }
                            } catch (Exception ignored) {}

                            startActivity(new Intent(LoginActivity.this, MainActivity.class));
                            finish();
                            overridePendingTransition(R.anim.slide_up_fade_in, R.anim.fade_scale_out);
                        } else {
                            showError(error != null ? error : "Login failed. Please try again.", false);
                        }
                    }
                });
            }
        });
    }

    private void setLoading(boolean loading) {
        btnLogin.setVisibility(loading ? View.GONE : View.VISIBLE);
        progressBar.setVisibility(loading ? View.VISIBLE : View.GONE);
        etEmail.setEnabled(!loading);
        etPassword.setEnabled(!loading);
    }

    private void showError(String message, boolean success) {
        tvError.setText(message);
        if (success) {
            tvError.setTextColor(getResources().getColor(R.color.successGreen));
            errorBanner.setBackgroundResource(R.drawable.bg_success_banner);
        } else {
            tvError.setTextColor(getResources().getColor(R.color.errorRed));
            errorBanner.setBackgroundResource(R.drawable.bg_error_banner);
        }
        errorBanner.setVisibility(View.VISIBLE);
    }

    private void hideError() {
        errorBanner.setVisibility(View.GONE);
    }
}
