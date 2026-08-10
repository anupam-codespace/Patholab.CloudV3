package cloud.patholab.app.auth;

import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.KeyEvent;
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
import java.util.ArrayList;
import java.util.List;
import cloud.patholab.app.R;
import cloud.patholab.app.api.ApiClient;

public class OtpVerifyActivity extends AppCompatActivity {

    private List<EditText> otpInputs;
    private Button btnVerify;
    private ProgressBar progressBar;
    private LinearLayout errorBanner;
    private TextView tvError;
    private TextView tvEmailDisplay;
    private TextView tvResend;

    private String email;
    private String mode;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_otp_verify);
        AuthHelper.setupVideoBackground(this);

        email = getIntent().getStringExtra("email");
        if (email == null) email = "";
        mode = getIntent().getStringExtra("mode");
        if (mode == null) mode = "register";

        applyStatusBarStyle();
        adjustStatusBarSpacer();
        bindViews();
        setupListeners();

        tvEmailDisplay.setText("Code sent to: " + email);
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
        otpInputs = new ArrayList<>();
        otpInputs.add((EditText) findViewById(R.id.otp1));
        otpInputs.add((EditText) findViewById(R.id.otp2));
        otpInputs.add((EditText) findViewById(R.id.otp3));
        otpInputs.add((EditText) findViewById(R.id.otp4));
        otpInputs.add((EditText) findViewById(R.id.otp5));
        otpInputs.add((EditText) findViewById(R.id.otp6));

        btnVerify = findViewById(R.id.btnVerify);
        progressBar = findViewById(R.id.progressBar);
        errorBanner = findViewById(R.id.errorBanner);
        tvError = findViewById(R.id.tvError);
        tvEmailDisplay = findViewById(R.id.tvEmailDisplay);
        tvResend = findViewById(R.id.tvResend);
    }

    private void setupListeners() {
        findViewById(R.id.btnBack).setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                finish();
            }
        });

        for (int i = 0; i < otpInputs.size(); i++) {
            final int index = i;
            final EditText editText = otpInputs.get(i);

            editText.addTextChangedListener(new TextWatcher() {
                @Override
                public void afterTextChanged(Editable s) {
                    if (s != null && s.length() == 1 && index < 5) {
                        otpInputs.get(index + 1).requestFocus();
                    }
                }
                @Override
                public void beforeTextChanged(CharSequence s, int start, int count, int after) {}
                @Override
                public void onTextChanged(CharSequence s, int start, int before, int count) {}
            });

            editText.setOnKeyListener(new View.OnKeyListener() {
                @Override
                public boolean onKey(View v, int keyCode, KeyEvent event) {
                    if (event.getAction() == KeyEvent.ACTION_DOWN &&
                            keyCode == KeyEvent.KEYCODE_DEL &&
                            editText.getText().length() == 0 &&
                            index > 0) {
                        EditText prev = otpInputs.get(index - 1);
                        prev.requestFocus();
                        prev.setText("");
                        return true;
                    }
                    return false;
                }
            });
        }

        otpInputs.get(0).requestFocus();

        btnVerify.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                attemptVerify();
            }
        });

        tvResend.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                resendCode();
            }
        });
    }

    private void resendCode() {
        tvResend.setEnabled(false);
        tvResend.setText("Sending...");
        ApiClient.resendOtp(email, new ApiClient.ApiCallback() {
            @Override
            public void onResult(final boolean success, final String error, String token) {
                runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        tvResend.setEnabled(true);
                        tvResend.setText("Resend Code");
                        if (success) {
                            tvError.setText("✓ A new code was sent");
                            tvError.setTextColor(getResources().getColor(R.color.successGreen));
                            errorBanner.setBackgroundResource(R.drawable.bg_success_banner);
                            errorBanner.setVisibility(View.VISIBLE);
                        } else {
                            showError(error != null ? error : "Failed to resend code");
                        }
                    }
                });
            }
        });
    }

    private void attemptVerify() {
        StringBuilder sb = new StringBuilder();
        for (EditText et : otpInputs) {
            sb.append(et.getText().toString());
        }
        final String code = sb.toString();

        if (code.length() < 6) {
            showError("Please enter the complete 6-digit code.");
            return;
        }

        hideError();
        setLoading(true);

        if ("reset".equals(mode)) {
            setLoading(false);
            Intent intent = new Intent(this, ResetPasswordActivity.class);
            intent.putExtra("email", email);
            intent.putExtra("code", code);
            startActivity(intent);
            overridePendingTransition(android.R.anim.slide_in_left, android.R.anim.slide_out_right);
        } else {
            ApiClient.verifyEmail(email, code, new ApiClient.ApiCallback() {
                @Override
                public void onResult(final boolean success, final String error, String token) {
                    runOnUiThread(new Runnable() {
                        @Override
                        public void run() {
                            setLoading(false);
                            if (success) {
                                Intent intent = new Intent(OtpVerifyActivity.this, LoginActivity.class);
                                intent.putExtra("verified", true);
                                startActivity(intent);
                                finishAffinity();
                                overridePendingTransition(android.R.anim.fade_in, android.R.anim.fade_out);
                            } else {
                                showError(error != null ? error : "Verification failed. Please try again.");
                            }
                        }
                    });
                }
            });
        }
    }

    private void setLoading(boolean loading) {
        btnVerify.setVisibility(loading ? View.GONE : View.VISIBLE);
        progressBar.setVisibility(loading ? View.VISIBLE : View.GONE);
    }

    private void showError(String message) {
        tvError.setText(message);
        tvError.setTextColor(getResources().getColor(R.color.errorRed));
        errorBanner.setBackgroundResource(R.drawable.bg_error_banner);
        errorBanner.setVisibility(View.VISIBLE);
    }

    private void hideError() {
        errorBanner.setVisibility(View.GONE);
    }
}
