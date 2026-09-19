package cloud.patholab.app;

import android.content.Intent;
import android.graphics.Color;
import android.os.Bundle;
import android.text.Editable;
import android.text.Html;
import android.text.TextWatcher;
import android.view.View;
import android.view.ViewGroup;
import android.widget.EditText;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import java.util.ArrayList;
import java.util.List;

public class LegalActivity extends AppCompatActivity {

    public static class LegalClause {
        public String id;
        public String title;
        public String badge;
        public String summary;
        public String content;
        public boolean isKeyHighlight;

        public LegalClause(String id, String title, String badge, String summary, String content, boolean isKeyHighlight) {
            this.id = id;
            this.title = title;
            this.badge = badge;
            this.summary = summary;
            this.content = content;
            this.isKeyHighlight = isKeyHighlight;
        }
    }

    public static class LegalCategory {
        public String title;
        public String lastUpdated;
        public List<LegalClause> clauses;

        public LegalCategory(String title, String lastUpdated, List<LegalClause> clauses) {
            this.title = title;
            this.lastUpdated = lastUpdated;
            this.clauses = clauses;
        }
    }

    private List<LegalCategory> allCategories = new ArrayList<>();
    private int currentCategoryIndex = 0;
    private String searchQuery = "";

    private TextView tabTerms, tabPrivacy, tabRefund, tabStore;
    private TextView txtCategoryTitle, txtCategorySubtitle, txtClausesCount;
    private LinearLayout clausesContainer;
    private EditText editSearch;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_legal);

        // Edge-to-edge status bar
        if (android.os.Build.VERSION.SDK_INT < 35) {
            getWindow().setStatusBarColor(0xFF4338CA);
        }
        androidx.core.view.WindowInsetsControllerCompat controller = androidx.core.view.WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        if (controller != null) {
            controller.setAppearanceLightStatusBars(false);
        }

        // Apply insets to header
        View legalHeader = findViewById(R.id.legalHeader);
        if (legalHeader != null) {
            ViewCompat.setOnApplyWindowInsetsListener(legalHeader, (v, insets) -> {
                Insets systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars());
                v.setPadding(0, systemBars.top, 0, 0);
                return insets;
            });
        }

        // Back button
        LinearLayout btnBack = findViewById(R.id.btnLegalBack);
        if (btnBack != null) {
            btnBack.setOnClickListener(v -> finish());
        }

        // Share button
        LinearLayout btnShare = findViewById(R.id.btnLegalShare);
        if (btnShare != null) {
            btnShare.setOnClickListener(v -> shareLegalText());
        }

        // Bind Views
        tabTerms = findViewById(R.id.tabTerms);
        tabPrivacy = findViewById(R.id.tabPrivacy);
        tabRefund = findViewById(R.id.tabRefund);
        tabStore = findViewById(R.id.tabStore);

        txtCategoryTitle = findViewById(R.id.txtCategoryTitle);
        txtCategorySubtitle = findViewById(R.id.txtCategorySubtitle);
        txtClausesCount = findViewById(R.id.txtClausesCount);
        clausesContainer = findViewById(R.id.clausesContainer);
        editSearch = findViewById(R.id.editSearchClauses);

        setupLegalDataset();

        int targetTab = getIntent().getIntExtra("target_tab", 0);
        if (targetTab >= 0 && targetTab < allCategories.size()) {
            currentCategoryIndex = targetTab;
        }

        setupTabListeners();
        setupSearchListener();
        updateTabStyles();

        renderCurrentCategory();
    }

    private void setupTabListeners() {
        if (tabTerms != null) tabTerms.setOnClickListener(v -> switchTab(0));
        if (tabPrivacy != null) tabPrivacy.setOnClickListener(v -> switchTab(1));
        if (tabRefund != null) tabRefund.setOnClickListener(v -> switchTab(2));
        if (tabStore != null) tabStore.setOnClickListener(v -> switchTab(3));
    }

    private void switchTab(int index) {
        currentCategoryIndex = index;
        updateTabStyles();
        renderCurrentCategory();
    }

    private void updateTabStyles() {
        TextView[] tabs = { tabTerms, tabPrivacy, tabRefund, tabStore };
        for (int i = 0; i < tabs.length; i++) {
            if (tabs[i] != null) {
                if (i == currentCategoryIndex) {
                    tabs[i].setBackgroundResource(R.drawable.bg_chip_active);
                    tabs[i].setTextColor(Color.WHITE);
                } else {
                    tabs[i].setBackgroundResource(R.drawable.bg_chip_inactive);
                    tabs[i].setTextColor(Color.parseColor("#475569"));
                }
            }
        }
    }

    private void setupSearchListener() {
        if (editSearch != null) {
            editSearch.addTextChangedListener(new TextWatcher() {
                @Override
                public void beforeTextChanged(CharSequence s, int start, int count, int after) {}

                @Override
                public void onTextChanged(CharSequence s, int start, int before, int count) {
                    searchQuery = s.toString().trim().toLowerCase();
                    renderCurrentCategory();
                }

                @Override
                public void afterTextChanged(Editable s) {}
            });
        }
    }

    private void renderCurrentCategory() {
        if (currentCategoryIndex < 0 || currentCategoryIndex >= allCategories.size()) return;
        LegalCategory cat = allCategories.get(currentCategoryIndex);

        if (txtCategoryTitle != null) txtCategoryTitle.setText(cat.title);
        if (txtCategorySubtitle != null) txtCategorySubtitle.setText("Effective: " + cat.lastUpdated + " • Official Policy");

        List<LegalClause> filtered = new ArrayList<>();
        for (LegalClause clause : cat.clauses) {
            if (searchQuery.isEmpty() ||
                clause.title.toLowerCase().contains(searchQuery) ||
                clause.content.toLowerCase().contains(searchQuery) ||
                (clause.summary != null && clause.summary.toLowerCase().contains(searchQuery)) ||
                clause.badge.toLowerCase().contains(searchQuery)) {
                filtered.add(clause);
            }
        }

        if (txtClausesCount != null) {
            txtClausesCount.setText(filtered.size() + " clauses");
        }

        if (clausesContainer != null) {
            clausesContainer.removeAllViews();

            for (LegalClause clause : filtered) {
                View card = createClauseCard(clause);
                clausesContainer.addView(card);
            }
        }
    }

    private View createClauseCard(LegalClause clause) {
        LinearLayout card = new LinearLayout(this);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setBackgroundColor(Color.WHITE);
        card.setElevation(dpToPx(1));
        
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT
        );
        params.setMargins(0, 0, 0, dpToPx(12));
        card.setLayoutParams(params);
        card.setPadding(dpToPx(16), dpToPx(16), dpToPx(16), dpToPx(16));

        // Badge pill
        TextView badge = new TextView(this);
        badge.setText(clause.badge);
        badge.setTextSize(11f);
        badge.setTypeface(null, android.graphics.Typeface.BOLD);
        badge.setPadding(dpToPx(8), dpToPx(3), dpToPx(8), dpToPx(3));
        if (clause.isKeyHighlight) {
            badge.setBackgroundColor(Color.parseColor("#FEF3C7"));
            badge.setTextColor(Color.parseColor("#B45309"));
        } else {
            badge.setBackgroundColor(Color.parseColor("#EEF2FF"));
            badge.setTextColor(Color.parseColor("#4338CA"));
        }
        LinearLayout.LayoutParams badgeParams = new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT
        );
        badgeParams.setMargins(0, 0, 0, dpToPx(8));
        badge.setLayoutParams(badgeParams);
        card.addView(badge);

        // Title
        TextView title = new TextView(this);
        title.setText(clause.title);
        title.setTextColor(Color.parseColor("#0F172A"));
        title.setTextSize(15f);
        title.setTypeface(null, android.graphics.Typeface.BOLD);
        LinearLayout.LayoutParams titleParams = new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT
        );
        titleParams.setMargins(0, 0, 0, dpToPx(8));
        title.setLayoutParams(titleParams);
        card.addView(title);

        // Key takeaway banner if available
        if (clause.summary != null) {
            LinearLayout callout = new LinearLayout(this);
            callout.setOrientation(LinearLayout.VERTICAL);
            callout.setBackgroundResource(R.drawable.bg_callout_yellow);
            callout.setPadding(dpToPx(10), dpToPx(8), dpToPx(10), dpToPx(8));
            LinearLayout.LayoutParams calloutParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT
            );
            calloutParams.setMargins(0, 0, 0, dpToPx(10));
            callout.setLayoutParams(calloutParams);

            TextView txtTakeaway = new TextView(this);
            txtTakeaway.setText("💡 Key Takeaway: " + clause.summary);
            txtTakeaway.setTextColor(Color.parseColor("#92400E"));
            txtTakeaway.setTextSize(12f);
            txtTakeaway.setTypeface(null, android.graphics.Typeface.BOLD);
            callout.addView(txtTakeaway);
            card.addView(callout);
        }

        // Content
        TextView content = new TextView(this);
        content.setText(clause.content);
        content.setTextColor(Color.parseColor("#334155"));
        content.setTextSize(13.5f);
        content.setLineSpacing(0, 1.4f);
        card.addView(content);

        return card;
    }

    private int dpToPx(int dp) {
        float density = getResources().getDisplayMetrics().density;
        return Math.round((float) dp * density);
    }

    private void shareLegalText() {
        if (currentCategoryIndex < 0 || currentCategoryIndex >= allCategories.size()) return;
        LegalCategory cat = allCategories.get(currentCategoryIndex);

        StringBuilder sb = new StringBuilder();
        sb.append("Patholab Cloud – ").append(cat.title).append("\n");
        sb.append("Globizhub India Pvt. Ltd. (CIN: U74999KA2019PTC120377)\n");
        sb.append("Last Updated: ").append(cat.lastUpdated).append("\n\n");

        for (LegalClause clause : cat.clauses) {
            sb.append("[").append(clause.badge).append("] ").append(clause.title).append("\n");
            sb.append(clause.content).append("\n\n");
        }
        sb.append("Official Website: https://patholab.cloud | Support: legal@patholab.cloud");

        Intent shareIntent = new Intent(Intent.ACTION_SEND);
        shareIntent.setType("text/plain");
        shareIntent.putExtra(Intent.EXTRA_SUBJECT, "Patholab Cloud – " + cat.title);
        shareIntent.putExtra(Intent.EXTRA_TEXT, sb.toString());
        startActivity(Intent.createChooser(shareIntent, "Share Legal Text"));
    }

    private void setupLegalDataset() {
        // 1. Terms of Service
        List<LegalClause> termsClauses = new ArrayList<>();
        termsClauses.add(new LegalClause(
            "tos-1",
            "1. Grant of License & Usage Scope",
            "License",
            "Grants authorized laboratory staff and pathologists a non-exclusive license to use the cloud platform.",
            "Globizhub India Private Limited (\"Globizhub\", \"Licensor\") grants you (\"Licensee\", \"Customer\") a fixed-term, non-exclusive, non-transferable, revocable, and limited license to access and use the Patholab Cloud platform strictly for clinical laboratory operations, sample management, diagnostic reporting, and administrative workflows in accordance with the registered subscription order.",
            false
        ));
        termsClauses.add(new LegalClause(
            "tos-2",
            "2. Customer Data & Report Ownership",
            "Data Ownership",
            "You retain 100% full ownership over all patient records, medical reports, test results, and laboratory documents.",
            "All medical reports, patient demographics, clinical notes, doctor signatures, and billing invoices generated by or uploaded by the Licensee remain the sole and exclusive intellectual property of the Licensee. Licensor claims no ownership rights over clinical data and processes data exclusively to provide the platform functionality.",
            true
        ));
        termsClauses.add(new LegalClause(
            "tos-3",
            "3. Account Security & User Credentials",
            "Security",
            "Laboratories are responsible for managing staff logins, role access, and keeping credentials safe.",
            "The laboratory administrator is responsible for issuing, configuring, and revoking user credentials for phlebotomists, lab technicians, receptionists, and reporting doctors. The Licensee shall immediately report any unauthorized access or suspected credential compromise to security@patholab.cloud.",
            false
        ));
        termsClauses.add(new LegalClause(
            "tos-4",
            "4. Service Level & Uptime Commitments",
            "Uptime SLA",
            "Designed for high-availability 99.9% uptime with automated redundant cloud backups.",
            "Patholab Cloud is hosted on high-availability cloud infrastructure with continuous database replication, automated daily backups, and SSL/TLS 256-bit encryption for all data in transit and at rest. Scheduled maintenance is communicated in advance.",
            false
        ));
        termsClauses.add(new LegalClause(
            "tos-5",
            "5. Intellectual Property Rights",
            "IP Rights",
            "The platform architecture, UI, algorithms, and mobile applications are proprietary to Globizhub.",
            "All rights, title, trademarks, service marks, codebases, and interface designs of Patholab Cloud are the sole property of Globizhub India Private Limited. Licensee shall not reverse-engineer, decompile, duplicate, or white-label the software without prior written authorization.",
            false
        ));
        termsClauses.add(new LegalClause(
            "tos-6",
            "6. Limitation of Liability",
            "Liability",
            "Total liability is limited to fees paid during the preceding 3 months.",
            "Neither party shall be liable for indirect, incidental, special, or consequential damages. The maximum aggregate liability of Licensor under this agreement shall be limited to the subscription fees actually paid by the Licensee in the three (3) months preceding the event giving rise to the claim.",
            false
        ));
        termsClauses.add(new LegalClause(
            "tos-7",
            "7. Governing Law & Dispute Resolution",
            "Jurisdiction",
            "Governed by the laws of India with exclusive jurisdiction in Bangalore, Karnataka.",
            "These Terms and any dispute arising out of or in connection with the Platform shall be governed by and construed in accordance with the laws of India. The competent courts in Bangalore, Karnataka shall have exclusive jurisdiction.",
            false
        ));

        // 2. Privacy & Health Data
        List<LegalClause> privacyClauses = new ArrayList<>();
        privacyClauses.add(new LegalClause(
            "priv-1",
            "1. Health Data Protection & DISHA / HIPAA Standards",
            "Health Privacy",
            "Strict medical confidentiality adhering to international and Indian digital health standards.",
            "Patholab Cloud enforces strict data protection safeguards compliant with the Digital Information Security in Healthcare Act (DISHA) and international privacy frameworks. Sensitive Personal Data or Information (SPDI), including patient diagnostic results, is stored encrypted with strict role-based access control.",
            true
        ));
        privacyClauses.add(new LegalClause(
            "priv-2",
            "2. Information We Collect",
            "Collection",
            "Laboratory account profile, staff contact details, and audit telemetry.",
            "We collect account registration data (Lab name, address, contact numbers, email), billing information for subscription management, and anonymized diagnostic crash logs to improve mobile application reliability.",
            false
        ));
        privacyClauses.add(new LegalClause(
            "priv-3",
            "3. Patient Data Confidentiality & Non-Disclosure",
            "Confidentiality",
            "We NEVER sell, rent, monetize, or disclose patient medical records to third parties.",
            "Licensor enforces strict non-disclosure obligations. Patient records and diagnostic findings processed through your workspace are never sold, rented, shared for marketing, or monetized. Licensor staff cannot access clinical data except upon explicit written support requests by the lab admin.",
            true
        ));
        privacyClauses.add(new LegalClause(
            "priv-4",
            "4. Data Retention & Account Deletion",
            "Data Rights",
            "Export complete lab data in standard formats at any time or request full data purging.",
            "Laboratories retain full rights to export patient history, test catalogs, and financial summaries as Excel/PDF at any time. Upon account termination, data is retained for 30 days for recovery, after which permanent cryptographically secure purging is executed upon request.",
            false
        ));

        // 3. Refund & Cancellation
        List<LegalClause> refundClauses = new ArrayList<>();
        refundClauses.add(new LegalClause(
            "ref-1",
            "1. Subscription Billing & Renewals",
            "Billing",
            "Transparent upfront pricing with flexible monthly and annual billing cycles.",
            "Patholab Cloud subscriptions are billed in advance on a recurring monthly or annual basis as specified in your selected tier. Invoices are generated automatically and sent to the registered laboratory billing email.",
            false
        ));
        refundClauses.add(new LegalClause(
            "ref-2",
            "2. Cancellation for Convenience",
            "Cancellation",
            "Cancel your subscription at any time without lock-in penalties.",
            "You may cancel your recurring subscription at any time directly from the Lab Admin Dashboard or by contacting billing@patholab.cloud. Upon cancellation, your workspace remains fully operational until the end of your current paid billing period.",
            true
        ));
        refundClauses.add(new LegalClause(
            "ref-3",
            "3. Refund Policy & Pro-Rata Settlements",
            "Refunds",
            "Full 7-day money-back guarantee for new labs; pro-rata refunds for verified service outages.",
            "New laboratory signups enjoy an unconditional 7-day money-back satisfaction guarantee. For ongoing subscriptions, if a verified service outage exceeding SLA commitments occurs, a pro-rata credit or refund for the unutilized period will be promptly credited to the original payment method within 5-7 business days.",
            true
        ));

        // 4. Store & Beta Terms
        List<LegalClause> storeClauses = new ArrayList<>();
        storeClauses.add(new LegalClause(
            "store-1",
            "1. Google Play Beta & Android Distribution",
            "Google Play",
            "Adherence to Google Play Developer Distribution Agreement.",
            "Android releases distributed via Google Play Store adhere to Google Play Developer policies, safety guidelines, and Android permissions frameworks regarding camera (barcode scanning) and storage (PDF lab report saving).",
            false
        ));
        storeClauses.add(new LegalClause(
            "store-2",
            "2. Device Permissions & Camera Access",
            "Permissions",
            "Camera access is used exclusively for barcode/QR scanning; photo library for report attachments.",
            "Patholab Cloud requests camera permissions strictly to scan sample barcode vials and QR codes on requisition slips. Photo library write permissions are used only to save generated PDF diagnostic reports locally to your device storage.",
            true
        ));

        allCategories.add(new LegalCategory("Terms of Service", "June 2024", termsClauses));
        allCategories.add(new LegalCategory("Privacy & Health Data", "June 2024", privacyClauses));
        allCategories.add(new LegalCategory("Refund & Cancellation", "June 2024", refundClauses));
        allCategories.add(new LegalCategory("App Store & Beta Testing", "August 2024", storeClauses));
    }
}
