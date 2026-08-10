package cloud.patholab.app.auth;

import android.content.Intent;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.text.Editable;
import android.text.InputType;
import android.text.TextWatcher;
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
import java.util.ArrayList;
import java.util.List;
import cloud.patholab.app.R;
import cloud.patholab.app.api.ApiClient;

public class RegisterActivity extends AppCompatActivity {

    private EditText etLabName;
    private EditText etFullName;
    private EditText etPhone;
    private EditText etEmail;
    private EditText etPassword;
    private EditText etConfirmPassword;
    private Button btnRegister;
    private ProgressBar progressBar;
    private LinearLayout errorBanner;
    private TextView tvError;
    private ImageView ivTogglePassword;
    private ImageView ivToggleConfirmPassword;
    private TextView tvLabNameError;
    private TextView tvNameError;
    private TextView tvPhoneError;
    private TextView tvEmailError;
    private TextView tvPasswordError;
    private TextView tvConfirmPasswordError;
    private LinearLayout strengthContainer;
    private TextView tvStrength;
    private List<View> strengthBars;
    private TextView tvLogin;

    private boolean passwordVisible = false;
    private boolean confirmPasswordVisible = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_register);
        AuthHelper.setupVideoBackground(this);
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
        etLabName = findViewById(R.id.etLabName);
        etFullName = findViewById(R.id.etFullName);
        etPhone = findViewById(R.id.etPhone);
        etEmail = findViewById(R.id.etEmail);
        etPassword = findViewById(R.id.etPassword);
        etConfirmPassword = findViewById(R.id.etConfirmPassword);
        btnRegister = findViewById(R.id.btnRegister);
        progressBar = findViewById(R.id.progressBar);
        errorBanner = findViewById(R.id.errorBanner);
        tvError = findViewById(R.id.tvError);
        ivTogglePassword = findViewById(R.id.ivTogglePassword);
        ivToggleConfirmPassword = findViewById(R.id.ivToggleConfirmPassword);
        tvLabNameError = findViewById(R.id.tvLabNameError);
        tvNameError = findViewById(R.id.tvNameError);
        tvPhoneError = findViewById(R.id.tvPhoneError);
        tvEmailError = findViewById(R.id.tvEmailError);
        tvPasswordError = findViewById(R.id.tvPasswordError);
        tvConfirmPasswordError = findViewById(R.id.tvConfirmPasswordError);
        strengthContainer = findViewById(R.id.strengthContainer);
        tvStrength = findViewById(R.id.tvStrength);
        
        strengthBars = new ArrayList<>();
        strengthBars.add(findViewById(R.id.bar1));
        strengthBars.add(findViewById(R.id.bar2));
        strengthBars.add(findViewById(R.id.bar3));
        strengthBars.add(findViewById(R.id.bar4));
        
        tvLogin = findViewById(R.id.tvLogin);
    }

    private void setupListeners() {
        findViewById(R.id.btnBack).setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                finish();
            }
        });

        btnRegister.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                attemptRegister();
            }
        });

        tvLogin.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                finish();
                overridePendingTransition(android.R.anim.slide_in_left, android.R.anim.slide_out_right);
            }
        });

        ivTogglePassword.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                passwordVisible = !passwordVisible;
                if (passwordVisible) {
                    etPassword.setInputType(InputType.TYPE_TEXT_VARIATION_VISIBLE_PASSWORD);
                } else {
                    etPassword.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_PASSWORD);
                }
                etPassword.setSelection(etPassword.getText().length());
            }
        });

        ivToggleConfirmPassword.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                confirmPasswordVisible = !confirmPasswordVisible;
                if (confirmPasswordVisible) {
                    etConfirmPassword.setInputType(InputType.TYPE_TEXT_VARIATION_VISIBLE_PASSWORD);
                } else {
                    etConfirmPassword.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_PASSWORD);
                }
                etConfirmPassword.setSelection(etConfirmPassword.getText().length());
            }
        });

        etPassword.addTextChangedListener(new TextWatcher() {
            @Override
            public void afterTextChanged(Editable s) {
                updatePasswordStrength(s != null ? s.toString() : "");
            }
            @Override
            public void beforeTextChanged(CharSequence s, int start, int count, int after) {}
            @Override
            public void onTextChanged(CharSequence s, int start, int before, int count) {}
        });
    }

    private void updatePasswordStrength(String pwd) {
        if (pwd.isEmpty()) {
            strengthContainer.setVisibility(View.GONE);
            return;
        }
        strengthContainer.setVisibility(View.VISIBLE);
        int score = 0;
        if (pwd.length() >= 8) score++;
        if (pwd.matches(".*[A-Z].*")) score++;
        if (pwd.matches(".*[0-9].*")) score++;
        if (pwd.matches(".*[^A-Za-z0-9].*")) score++;

        String label;
        String colorHex;
        switch (score) {
            case 1: label = "Weak"; colorHex = "#ef4444"; break;
            case 2: label = "Fair"; colorHex = "#f59e0b"; break;
            case 3: label = "Good"; colorHex = "#3b82f6"; break;
            case 4: label = "Strong"; colorHex = "#22c55e"; break;
            default: label = ""; colorHex = "#e5e7eb"; break;
        }

        for (int i = 0; i < strengthBars.size(); i++) {
            View bar = strengthBars.get(i);
            bar.setBackgroundColor(i < score ? Color.parseColor(colorHex) : Color.parseColor("#e5e7eb"));
        }
        tvStrength.setText(label.isEmpty() ? "" : label + " Password");
        tvStrength.setTextColor(Color.parseColor(colorHex.equals("#e5e7eb") ? "#9ca3af" : colorHex));
    }

    private boolean validate() {
        boolean valid = true;

        if (etLabName.getText().toString().trim().isEmpty()) {
            tvLabNameError.setText("Lab name is required");
            tvLabNameError.setVisibility(View.VISIBLE);
            valid = false;
        } else {
            tvLabNameError.setVisibility(View.GONE);
        }

        if (etFullName.getText().toString().trim().isEmpty()) {
            tvNameError.setText("Full name is required");
            tvNameError.setVisibility(View.VISIBLE);
            valid = false;
        } else {
            tvNameError.setVisibility(View.GONE);
        }

        String phone = etPhone.getText().toString().replaceAll("\\D", "");
        if (phone.length() < 10) {
            tvPhoneError.setText("Enter a valid 10-digit phone number");
            tvPhoneError.setVisibility(View.VISIBLE);
            valid = false;
        } else {
            tvPhoneError.setVisibility(View.GONE);
        }

        String email = etEmail.getText().toString().trim();
        if (email.isEmpty() || !Patterns.EMAIL_ADDRESS.matcher(email).matches()) {
            tvEmailError.setText("Enter a valid email address");
            tvEmailError.setVisibility(View.VISIBLE);
            valid = false;
        } else {
            tvEmailError.setVisibility(View.GONE);
        }

        String pwd = etPassword.getText().toString();
        if (pwd.length() < 8) {
            tvPasswordError.setText("Password must be at least 8 characters");
            tvPasswordError.setVisibility(View.VISIBLE);
            valid = false;
        } else {
            tvPasswordError.setVisibility(View.GONE);
        }

        String confirmPwd = etConfirmPassword.getText().toString();
        if (!pwd.equals(confirmPwd)) {
            tvConfirmPasswordError.setText("Passwords do not match");
            tvConfirmPasswordError.setVisibility(View.VISIBLE);
            valid = false;
        } else {
            tvConfirmPasswordError.setVisibility(View.GONE);
        }

        return valid;
    }

    private void attemptRegister() {
        hideError();
        if (!validate()) return;
        setLoading(true);

        final String email = etEmail.getText().toString().trim();

        ApiClient.register(
                etLabName.getText().toString().trim(),
                etFullName.getText().toString().trim(),
                email,
                etPhone.getText().toString().trim(),
                etPassword.getText().toString(),
                new ApiClient.ApiCallback() {
                    @Override
                    public void onResult(final boolean success, final String error, String token) {
                        runOnUiThread(new Runnable() {
                            @Override
                            public void run() {
                                setLoading(false);
                                if (success) {
                                    Intent intent = new Intent(RegisterActivity.this, OtpVerifyActivity.class);
                                    intent.putExtra("email", email.toLowerCase());
                                    intent.putExtra("mode", "register");
                                    startActivity(intent);
                                    overridePendingTransition(android.R.anim.slide_in_left, android.R.anim.slide_out_right);
                                } else {
                                    showError(error != null ? error : "Registration failed");
                                }
                            }
                        });
                    }
                }
        );
    }

    private void setLoading(boolean loading) {
        btnRegister.setVisibility(loading ? View.GONE : View.VISIBLE);
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
