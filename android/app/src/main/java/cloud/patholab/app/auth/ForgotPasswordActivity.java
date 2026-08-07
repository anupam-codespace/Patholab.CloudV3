package cloud.patholab.app.auth;

import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.util.Patterns;
import android.view.View;
import android.view.WindowInsets;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import cloud.patholab.app.R;
import cloud.patholab.app.api.ApiClient;

public class ForgotPasswordActivity extends AppCompatActivity {

    private EditText etEmail;
    private Button btnSend;
    private ProgressBar progressBar;
    private LinearLayout errorBanner;
    private TextView tvError;
    private LinearLayout successBanner;
    private TextView tvSuccess;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_forgot_password);
        applyStatusBarStyle();
        adjustStatusBarSpacer();
        bindViews();
        setupListeners();
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
        btnSend = findViewById(R.id.btnSend);
        progressBar = findViewById(R.id.progressBar);
        errorBanner = findViewById(R.id.errorBanner);
        tvError = findViewById(R.id.tvError);
        successBanner = findViewById(R.id.successBanner);
        tvSuccess = findViewById(R.id.tvSuccess);
    }

    private void setupListeners() {
        findViewById(R.id.btnBack).setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                finish();
            }
        });

        findViewById(R.id.btnBackToLogin).setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                finish();
            }
        });

        btnSend.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                sendResetCode();
            }
        });
    }

    private void sendResetCode() {
        final String email = etEmail.getText().toString().trim();
        if (email.isEmpty() || !Patterns.EMAIL_ADDRESS.matcher(email).matches()) {
            showError("Please enter a valid email address.");
            return;
        }

        hideAll();
        setLoading(true);

        ApiClient.forgotPassword(email, new ApiClient.ApiCallback() {
            @Override
            public void onResult(boolean success, String error, String token) {
                runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        setLoading(false);
                        showSuccess("If an account exists for " + email + ", a reset code was sent.");
                        btnSend.postDelayed(new Runnable() {
                            @Override
                            public void run() {
                                Intent intent = new Intent(ForgotPasswordActivity.this, OtpVerifyActivity.class);
                                intent.putExtra("email", email.toLowerCase());
                                intent.putExtra("mode", "reset");
                                startActivity(intent);
                            }
                        }, 1800);
                    }
                });
            }
        });
    }

    private void setLoading(boolean loading) {
        btnSend.setVisibility(loading ? View.GONE : View.VISIBLE);
        progressBar.setVisibility(loading ? View.VISIBLE : View.GONE);
        etEmail.setEnabled(!loading);
    }

    private void showError(String message) {
        tvError.setText(message);
        errorBanner.setVisibility(View.VISIBLE);
        successBanner.setVisibility(View.GONE);
    }

    private void showSuccess(String message) {
        tvSuccess.setText(message);
        successBanner.setVisibility(View.VISIBLE);
        errorBanner.setVisibility(View.GONE);
    }

    private void hideAll() {
        errorBanner.setVisibility(View.GONE);
        successBanner.setVisibility(View.GONE);
    }
}
