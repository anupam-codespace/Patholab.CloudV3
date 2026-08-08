package cloud.patholab.app;

import android.os.Bundle;
import android.text.Html;
import android.view.View;
import android.widget.LinearLayout;
import android.widget.TextView;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

public class LegalActivity extends AppCompatActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_legal);

        // Edge-to-edge: draw behind status bar
        getWindow().setStatusBarColor(0xFF4338CA); // Match indigo hero banner
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
            // Dark icons on light background — but our hero is dark so use light icons
            getWindow().getDecorView().setSystemUiVisibility(0);
        }

        // Back button
        LinearLayout btnBack = findViewById(R.id.btnLegalBack);
        if (btnBack != null) {
            btnBack.setOnClickListener(v -> finish());
        }

        // Apply window insets for status bar/notch on the header bar
        View legalHeader = findViewById(R.id.legalHeader);
        if (legalHeader != null) {
            ViewCompat.setOnApplyWindowInsetsListener(legalHeader, (v, insets) -> {
                Insets systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars());
                v.setPadding(0, systemBars.top, 0, 0);
                return insets;
            });
        }

        // Populate legal content
        TextView txtContent = findViewById(R.id.txtLegalContent);
        if (txtContent != null) {
            String html = buildLegalHtml();
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.N) {
                txtContent.setText(Html.fromHtml(html, Html.FROM_HTML_MODE_LEGACY));
            } else {
                txtContent.setText(Html.fromHtml(html));
            }
        }
    }

    private String buildLegalHtml() {
        // Clean, readable HTML without raw <h3>/<h4> tags – uses <b> and <br> for
        // consistent rendering across all API levels.
        return
            "<b><font color=\"#4338CA\">(A) Google Play Beta Testing — Terms of Service</font></b><br/><br/>" +

            "<b><font color=\"#1E293B\">Key Summary</font></b><br/><br/>" +
            "• Diagnostics, usage, and crash reports related to your use of each Beta App will automatically be collected by Google and the Application Provider.<br/><br/>" +
            "• You may submit feedback, suggestions, and feature ideas to the Application Provider of the Beta App.<br/><br/>" +
            "• Beta Apps are pre-release software and may crash, resulting in data loss.<br/><br/>" +
            "• If you already have the production version installed, the Beta version will replace it and may overwrite app data.<br/><br/>" +
            "• You can opt out of Beta testing at any time by leaving the program on Google Play and reinstalling the production version.<br/><br/>" +

            "Your use of the Google Play Beta Testing service, including downloading any pre-release or beta-stage applications for Android (\"Beta Apps\"), is governed by these terms. The standard Google Play Terms of Service for your region are incorporated by reference.<br/><br/>" +

            "<b><font color=\"#1E293B\">Beta Tester Eligibility</font></b><br/><br/>" +
            "You must meet the age requirements for Google Play in your country. If you are under 18, review this Agreement with your parent or guardian.<br/><br/>" +

            "The Application Provider grants you a limited, non-exclusive, non-transferable, non-sublicensable license to access, download, and use the Beta App solely for testing and evaluation purposes.<br/><br/>" +

            "You acknowledge that Beta Apps are pre-release, unfinished software and may contain errors. You should not use them in critical operating environments or with highly valuable data. Back up your device prior to installing any Beta App. Google and the Application Provider shall not be liable for any data loss, device damage, or service interruptions caused by your use of Beta Apps.<br/><br/>" +

            "<b><font color=\"#1E293B\">No Warranty</font></b><br/><br/>" +
            "YOU EXPRESSLY ACKNOWLEDGE AND AGREE THAT USE OF THE BETA APP IS AT YOUR SOLE RISK. TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, THE BETA APP IS PROVIDED \"AS IS\" AND \"AS AVAILABLE\", WITH ALL FAULTS AND WITHOUT WARRANTY OF ANY KIND.<br/><br/>" +

            "<b><font color=\"#1E293B\">Termination</font></b><br/><br/>" +
            "To terminate participation, leave the beta program in Google Play. Google and/or the Application Provider reserve the right to terminate your participation at any time.<br/><br/>" +

            "────────────────────────────<br/><br/>" +

            "<b><font color=\"#4338CA\">(B) Google LLC — Android Beta Program License Agreement</font></b><br/><br/>" +

            "<b><font color=\"#1E293B\">Standard Software License</font></b><br/><br/>" +
            "PLEASE READ THIS LICENSE AGREEMENT CAREFULLY BEFORE INSTALLING OR USING THE SOFTWARE. BY INSTALLING AND/OR USING THE PRE-RELEASE SOFTWARE, YOU AGREE TO BE BOUND BY THE TERMS OF THIS LICENSE.<br/><br/>" +

            "<b>1. General.</b><br/><br/>" +
            "A. The pre-release software, APIs, documentation, and assets (collectively, the \"Beta Software\") are licensed, not sold, to you by Google LLC (\"Google\") for use only under the terms of this License.<br/><br/>" +
            "B. Google may make available updates or modifications to the Beta Software at its discretion. The terms of this License will govern any such updates unless accompanied by a separate license agreement.<br/><br/>" +

            "<b>2. Permitted Uses and Restrictions.</b><br/><br/>" +
            "A. License. You are granted a limited, non-transferable, non-exclusive license to install and use the Beta Software on compatible Android-branded devices you own or control solely for test and evaluation purposes.<br/><br/>" +
            "B. Restrictions. You may not: (a) copy, decompile, reverse engineer, or disassemble the Beta Software; (b) distribute, sell, lease, or rent it; or (c) demonstrate it to unauthorized individuals without prior consent.<br/><br/>" +

            "<b>3. Consent to Use of Data.</b><br/><br/>" +
            "A. System Diagnostics. You agree that Google and its affiliates may collect and use diagnostic, technical, usage, and crash data to facilitate system updates and improve Android products.<br/><br/>" +
            "B. Privacy. Google's Privacy Policy governs the collection, processing, and storage of personal data during your participation (https://policies.google.com/privacy).<br/><br/>" +

            "<b>4. Pre-release Software.</b><br/><br/>" +
            "Pre-release versions are time-limited and for test purposes only. They should not be relied upon to perform in the same manner as a final-release product, nor used with important data. Back up your data before installing.<br/><br/>" +

            "<b>5. Termination.</b><br/><br/>" +
            "This License is effective until terminated. Your rights will terminate automatically if you fail to comply with any term. Upon termination, cease all use and destroy all copies of the Beta Software.<br/><br/>" +

            "<b>6. Disclaimer of Warranties.</b><br/><br/>" +
            "TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, THE BETA SOFTWARE IS PROVIDED \"AS IS\" AND \"AS AVAILABLE\", WITH ALL FAULTS AND WITHOUT WARRANTY OF ANY KIND.<br/><br/>" +

            "<b>7. Governing Law.</b><br/><br/>" +
            "This License will be governed by the laws of the State of California. If any provision is found unenforceable, the remainder continues in full force and effect.";
    }
}
