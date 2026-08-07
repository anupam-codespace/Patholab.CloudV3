package cloud.patholab.app.auth;

import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.text.InputType;
import android.view.View;
import android.view.WindowInsets;
import android.widget.Button;
import android.widget.EditText;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import cloud.patholab.app.R;
import cloud.patholab.app.api.ApiClient;

public class ResetPasswordActivity extends AppCompatActivity {

    private EditText etNewPassword;
    private EditText etConfirmPassword;
    private Button btnReset;
    private ProgressBar progressBar;
    private LinearLayout errorBanner;
    private TextView tvError;
    private ImageView ivToggleNew;
    private ImageView ivToggleConfirm;

    private String email;
    private String code;
    private boolean newPwdVisible = false;
    private boolean confirmPwdVisible = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_reset_password);

        email = getIntent().getStringExtra("email");
        if (email == null) email = "";
        code = getIntent().getStringExtra("code");
        if (code == null) code = "";

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
        etNewPassword = findViewById(R.id.etNewPassword);
        etConfirmPassword = findViewById(R.id.etConfirmPassword);
        btnReset = findViewById(R.id.btnReset);
        progressBar = findViewById(R.id.progressBar);
        errorBanner = findViewById(R.id.errorBanner);
        tvError = findViewById(R.id.tvError);
        ivToggleNew = findViewById(R.id.ivToggleNew);
        ivToggleConfirm = findViewById(R.id.ivToggleConfirm);
    }

    private void setupListeners() {
        findViewById(R.id.btnBack).setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                finish();
            }
        });

        ivToggleNew.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                newPwdVisible = !newPwdVisible;
                if (newPwdVisible) {
                    etNewPassword.setInputType(InputType.TYPE_TEXT_VARIATION_VISIBLE_PASSWORD);
                } else {
                    etNewPassword.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_PASSWORD);
                }
                etNewPassword.setSelection(etNewPassword.getText().length());
            }
        });

        ivToggleConfirm.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                confirmPwdVisible = !confirmPwdVisible;
                if (confirmPwdVisible) {
                    etConfirmPassword.setInputType(InputType.TYPE_TEXT_VARIATION_VISIBLE_PASSWORD);
                } else {
                    etConfirmPassword.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_PASSWORD);
                }
                etConfirmPassword.setSelection(etConfirmPassword.getText().length());
            }
        });

        btnReset.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                attemptReset();
            }
        });
    }

    private void attemptReset() {
        final String newPwd = etNewPassword.getText().toString();
        final String confirmPwd = etConfirmPassword.getText().toString();

        TextView newPwdError = findViewById(R.id.tvNewPasswordError);
        TextView confirmPwdError = findViewById(R.id.tvConfirmError);

        boolean valid = true;

        if (newPwd.length() < 8) {
            newPwdError.setText("Password must be at least 8 characters");
            newPwdError.setVisibility(View.VISIBLE);
            valid = false;
        } else {
            newPwdError.setVisibility(View.GONE);
        }

        if (!newPwd.equals(confirmPwd)) {
            confirmPwdError.setText("Passwords do not match");
            confirmPwdError.setVisibility(View.VISIBLE);
            valid = false;
        } else {
            confirmPwdError.setVisibility(View.GONE);
        }

        if (!valid) return;

        hideError();
        setLoading(true);

        ApiClient.resetPassword(email, code, newPwd, new ApiClient.ApiCallback() {
            @Override
            public void onResult(final boolean success, final String error, String token) {
                runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        setLoading(false);
                        if (success) {
                            Toast.makeText(ResetPasswordActivity.this, "Password reset! Please sign in.", Toast.LENGTH_LONG).show();
                            Intent intent = new Intent(ResetPasswordActivity.this, LoginActivity.class);
                            intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
                            startActivity(intent);
                            overridePendingTransition(android.R.anim.fade_in, android.R.anim.fade_out);
                        } else {
                            showError(error != null ? error : "Reset failed. The code may have expired.");
                        }
                    }
                });
            }
        });
    }

    private void setLoading(boolean loading) {
        btnReset.setVisibility(loading ? View.GONE : View.VISIBLE);
        progressBar.setVisibility(loading ? View.VISIBLE : View.GONE);
    }

    private void showError(String message) {
        tvError.setText(message);
        errorBanner.setVisibility(View.VISIBLE);
    }

    private void hideError() {
        errorBanner.setVisibility(View.GONE);
    }
}
