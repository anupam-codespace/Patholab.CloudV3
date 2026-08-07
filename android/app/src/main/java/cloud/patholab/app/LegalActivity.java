package cloud.patholab.app;

import android.os.Bundle;
import android.text.Html;
import android.widget.LinearLayout;
import android.widget.TextView;
import androidx.appcompat.app.AppCompatActivity;

public class LegalActivity extends AppCompatActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_legal);

        LinearLayout btnBack = findViewById(R.id.btnLegalBack);
        if (btnBack != null) {
            btnBack.setOnClickListener(v -> finish());
        }

        TextView txtContent = findViewById(R.id.txtLegalContent);
        if (txtContent != null) {
            String html = getLegalHtml();
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.N) {
                txtContent.setText(Html.fromHtml(html, Html.FROM_HTML_MODE_LEGACY));
            } else {
                txtContent.setText(Html.fromHtml(html));
            }
        }
    }

    private String getLegalHtml() {
        return "<h3><font color=\"#0F172A\">Click to agree to the following two Agreements:</font></h3>" +
            "<br/>" +
            "<h4><font color=\"#4F46E5\">(A) Google Play Beta Testing Terms of Service</font></h4>" +
            "<br/>" +
            "<b><font color=\"#1E293B\">Summary of Key Terms:</font></b>" +
            "<br/>" +
            "•  Diagnostics, usage, and crash reports related to your use of each Beta App will automatically be collected by Google and the Application Provider.<br/><br/>" +
            "•  You may submit feedback, suggestions, and feature ideas to the Application Provider of the Beta App.<br/><br/>" +
            "•  Beta Apps are pre-release software and may crash, resulting in data loss in those Beta Apps.<br/><br/>" +
            "•  If you already have the production version of the app installed, installing the Beta version will replace it and may overwrite your app data.<br/><br/>" +
            "•  You can opt out of the Beta testing program at any time by leaving the program on the Google Play Store and reinstalling the production version of the app.<br/><br/>" +
            "Your use of the Google Play Beta Testing service (“Beta Testing”), including downloading any pre-release or beta-stage applications for Android hardware (“Beta Apps”), is governed by the following terms and conditions (“Google Play Beta Terms”). Except as specifically amended below, the standard Google Play Terms of Service for your region apply and are hereby incorporated by reference.<br/><br/>" +
            "<b><font color=\"#1E293B\">Specific Terms for Beta Testers</font></b><br/><br/>" +
            "To participate in Beta Testing, you must meet the age requirements for Google Play in your country. If you are under 18, you must review this Agreement with your parent or guardian to ensure you understand and agree to these terms.<br/><br/>" +
            "The Application Provider grants you a limited, non-exclusive, non-transferable, non-sublicensable license to access, download, and use the Beta App solely for testing and evaluation purposes.<br/><br/>" +
            "You acknowledge that Beta Apps are pre-release, unfinished software and may contain errors. You should not use Beta Apps in critical operating environments or with highly valuable data. You should back up your device's data prior to installing any Beta App. Google and the Application Provider shall not be liable for any data loss, device damage, or service interruptions caused by your use of Beta Apps.<br/><br/>" +
            "<b><font color=\"#1E293B\">NO WARRANTY</font></b><br/><br/>" +
            "YOU EXPRESSLY ACKNOWLEDGE AND AGREE THAT USE OF THE BETA APP IS AT YOUR SOLE RISK. TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, THE BETA APP IS PROVIDED “AS IS” AND “AS AVAILABLE”, WITH ALL FAULTS AND WITHOUT WARRANTY OF ANY KIND.<br/><br/>" +
            "<b><font color=\"#1E293B\">Termination</font></b><br/><br/>" +
            "To terminate your participation in beta-testing a particular Beta App, leave the beta program in Google Play. Leaving the beta program and deleting the Beta App from your device will remove any pre-release access. Google and/or the Application Provider reserve the right to terminate your participation in the beta-testing program at any time.<br/><br/>" +
            "06/21/2023<br/><br/>" +
            "<h4><font color=\"#4F46E5\">(B) GOOGLE LLC<br/>ANDROID BETA PROGRAM LICENSE AGREEMENT</font></h4>" +
            "<br/>" +
            "<b><font color=\"#1E293B\">Standard Software License</font></b><br/><br/>" +
            "PLEASE READ THIS LICENSE AGREEMENT CAREFULLY BEFORE INSTALLING OR USING THE SOFTWARE. BY INSTALLING AND/OR USING THE PRE-RELEASE SOFTWARE, YOU AGREE TO BE BOUND BY THE TERMS OF THIS LICENSE.<br/><br/>" +
            "<b>1. General.</b><br/><br/>" +
            "A. The pre-release software, APIs, documentation, and assets accompanying this License (collectively, the “Beta Software”) are licensed, not sold, to you by Google LLC (“Google”) for use only under the terms of this License.<br/><br/>" +
            "B. Google, at its discretion, may make available updates or modifications to the Beta Software. The terms of this License will govern any such updates or modifications unless accompanied by a separate license agreement.<br/><br/>" +
            "<b>2. Permitted Uses and Restrictions.</b><br/><br/>" +
            "A. License. You are granted a limited, non-transferable, non-exclusive license to install and use the Beta Software on compatible Android-branded devices that you own or control solely for test and evaluation purposes.<br/><br/>" +
            "B. Restrictions. You may not, and you agree not to: (a) copy, decompile, reverse engineer, disassemble, or attempt to derive the source code of the Beta Software; (b) distribute, sell, lease, or rent the Beta Software to any third party; or (c) show or demonstrate the Beta Software to unauthorized individuals without prior consent.<br/><br/>" +
            "<b>3. Consent to Use of Data.</b><br/><br/>" +
            "A. System Diagnostics. You agree that Google and its affiliates may collect and use diagnostic, technical, usage, and crash data to facilitate system updates, support services, and to improve Android products and services.<br/><br/>" +
            "B. Privacy. Google's Privacy Policy governs the collection, processing, and storage of any personal data collected during your participation in the Beta Program (https://policies.google.com/privacy).<br/><br/>" +
            "<b>4. Pre-release Software.</b><br/><br/>" +
            "Pre-release versions of the Beta Software are time limited and meant for test and evaluation purposes only. Pre-release versions should not be relied upon to perform in the same manner as a final-release, commercial-grade product, nor should they be used with important data. Before installing any pre-release versions of the Beta Software, you should back up your data.<br/><br/>" +
            "<b>5. Termination.</b> This License is effective until terminated. Your rights under this License will terminate automatically or otherwise cease to be effective without notice from Google if you fail to comply with any term(s) of this License. Upon the termination of this License, you shall cease all use of the Beta Software and destroy all copies, full or partial, of the Beta Software.<br/><br/>" +
            "<b>6. Disclaimer of Warranties.</b><br/><br/>" +
            "A. YOU EXPRESSLY ACKNOWLEDGE AND AGREE THAT, TO THE EXTENT PERMITTED BY APPLICABLE LAW, USE OF THE BETA SOFTWARE IS AT YOUR SOLE RISK AND THAT THE ENTIRE RISK AS TO SATISFACTORY QUALITY, PERFORMANCE, ACCURACY AND EFFORT IS WITH YOU.<br/><br/>" +
            "B. TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, THE BETA SOFTWARE IS PROVIDED “AS IS” AND “AS AVAILABLE”, WITH ALL FAULTS AND WITHOUT WARRANTY OF ANY KIND, AND GOOGLE HEREBY DISCLAIMS ALL WARRANTIES AND CONDITIONS WITH RESPECT TO THE BETA SOFTWARE, EITHER EXPRESS, IMPLIED OR STATUTORY.<br/><br/>" +
            "<b>7. Controlling Law.</b> This License will be governed by and construed in accordance with the laws of the State of California, excluding its conflict of law principles. If for any reason a court of competent jurisdiction finds any provision, or portion thereof, to be unenforceable, the remainder of this License shall continue in full force and effect.<br/><br/>" +
            "06/21/2023";
    }
}
