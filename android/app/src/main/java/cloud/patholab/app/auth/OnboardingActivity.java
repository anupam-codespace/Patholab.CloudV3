package cloud.patholab.app.auth;

import android.animation.ValueAnimator;
import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.TextView;
import androidx.appcompat.app.AppCompatActivity;
import androidx.viewpager2.widget.ViewPager2;
import cloud.patholab.app.R;
import java.util.ArrayList;
import java.util.List;

public class OnboardingActivity extends AppCompatActivity {

    private ViewPager2 viewPager;
    private Button btnAction;
    private TextView btnSkip;
    private View[] dots;
    private int currentPosition = 0;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_onboarding);

        // Pure white status & navigation bar with light icons
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            getWindow().getDecorView().setSystemUiVisibility(
                    View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR |
                    (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O ? View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR : 0)
            );
            getWindow().setStatusBarColor(0xFFFFFFFF);
            getWindow().setNavigationBarColor(0xFFFFFFFF);
        }

        initViews();
        setupViewPager();
        setupListeners();
    }

    private void initViews() {
        viewPager = findViewById(R.id.viewPager);
        btnAction = findViewById(R.id.btnAction);
        btnSkip = findViewById(R.id.btnSkip);

        dots = new View[]{
                findViewById(R.id.dot0),
                findViewById(R.id.dot1),
                findViewById(R.id.dot2),
                findViewById(R.id.dot3)
        };
    }

    private void setupViewPager() {
        List<OnboardingItem> items = new ArrayList<>();
        items.add(new OnboardingItem(
                R.drawable.img_onboarding_1,
                "Effortless Lab Management",
                "Manage patient registrations, tests, and billing seamlessly from anywhere."
        ));
        items.add(new OnboardingItem(
                R.drawable.img_onboarding_2,
                "Enterprise Data Security",
                "Safeguard patient diagnostic records with end-to-end cloud protection."
        ));
        items.add(new OnboardingItem(
                R.drawable.img_onboarding_3,
                "Instant Report Delivery",
                "Deliver verified pathology reports directly via WhatsApp and SMS."
        ));
        items.add(new OnboardingItem(
                R.drawable.img_onboarding_4,
                "Smart Analytics & Insights",
                "Track revenue, sample analytics, and daily lab growth in real time."
        ));

        OnboardingAdapter adapter = new OnboardingAdapter(items);
        viewPager.setAdapter(adapter);
        viewPager.setOffscreenPageLimit(3);

        // Smooth subtle page transform
        viewPager.setPageTransformer(new ViewPager2.PageTransformer() {
            @Override
            public void transformPage(View page, float position) {
                float absPos = Math.abs(position);
                page.setAlpha(1.0f - (0.25f * absPos));
                float scale = 0.92f + (0.08f * (1.0f - absPos));
                page.setScaleX(scale);
                page.setScaleY(scale);
            }
        });

        viewPager.registerOnPageChangeCallback(new ViewPager2.OnPageChangeCallback() {
            @Override
            public void onPageSelected(int position) {
                super.onPageSelected(position);
                updateUIState(position);
            }
        });
    }

    private void setupListeners() {
        btnAction.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                if (currentPosition < dots.length - 1) {
                    viewPager.setCurrentItem(currentPosition + 1, true);
                } else {
                    completeOnboarding();
                }
            }
        });

        btnSkip.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                completeOnboarding();
            }
        });
    }

    private void updateUIState(int position) {
        currentPosition = position;
        int activeWidth = dpToPx(24);
        int inactiveWidth = dpToPx(8);

        for (int i = 0; i < dots.length; i++) {
            final View dot = dots[i];
            final boolean isActive = (i == position);
            int targetWidth = isActive ? activeWidth : inactiveWidth;
            int currentWidth = dot.getWidth();

            if (currentWidth != targetWidth && currentWidth > 0) {
                ValueAnimator anim = ValueAnimator.ofInt(currentWidth, targetWidth);
                anim.setDuration(220);
                anim.addUpdateListener(new ValueAnimator.AnimatorUpdateListener() {
                    @Override
                    public void onAnimationUpdate(ValueAnimator animation) {
                        ViewGroup.LayoutParams params = dot.getLayoutParams();
                        params.width = (int) animation.getAnimatedValue();
                        dot.setLayoutParams(params);
                    }
                });
                anim.start();
            } else {
                ViewGroup.LayoutParams params = dot.getLayoutParams();
                params.width = targetWidth;
                dot.setLayoutParams(params);
            }

            dot.setBackgroundResource(isActive ? R.drawable.bg_dot_active : R.drawable.bg_dot_inactive);
        }

        if (position == dots.length - 1) {
            btnAction.setText("Get Started");
            btnSkip.animate().alpha(0.0f).setDuration(200).withEndAction(new Runnable() {
                @Override
                public void run() {
                    btnSkip.setVisibility(View.INVISIBLE);
                }
            });
        } else {
            btnAction.setText("Next");
            if (btnSkip.getVisibility() != View.VISIBLE) {
                btnSkip.setVisibility(View.VISIBLE);
                btnSkip.setAlpha(0.0f);
                btnSkip.animate().alpha(1.0f).setDuration(200);
            }
        }
    }

    private void completeOnboarding() {
        AuthManager.setOnboardingCompleted(this, true);
        Intent intent = new Intent(this, LoginActivity.class);
        startActivity(intent);
        overridePendingTransition(android.R.anim.fade_in, android.R.anim.fade_out);
        finish();
    }

    private int dpToPx(int dp) {
        float density = getResources().getDisplayMetrics().density;
        return Math.round(dp * density);
    }
}
