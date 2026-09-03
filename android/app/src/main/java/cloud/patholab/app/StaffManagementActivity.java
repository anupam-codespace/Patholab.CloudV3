package cloud.patholab.app;

import android.app.AlertDialog;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.res.ColorStateList;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.LayoutInflater;
import android.view.MenuItem;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.PopupMenu;
import android.widget.ProgressBar;
import android.widget.Spinner;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.google.android.material.bottomsheet.BottomSheetDialog;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;
import java.util.TimeZone;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Native Independent Staff Directory & Access Management Console
 * Complete feature-parity with Web Staff Directory:
 * - Real-time Staff Accessions & Employee ID Telemetry
 * - Dynamic Branch Assignment (from /api/workspace/branches)
 * - Add / Edit Staff Members
 * - Role Management (Technician, Receptionist, Doctor, Lab Manager)
 * - Password Resets
 * - Active / Suspended Access Toggles with Anti-Self-Deactivation Guard
 * - Remove Staff Member
 * - Live Activity Logs (/api/workspace/staff/{userId}/activity)
 */
public class StaffManagementActivity extends AppCompatActivity {

    // Models
    public static class StaffMember {
        public String staffId;
        public String userId;
        public String name;
        public String email;
        public String phone;
        public String role;
        public String position;
        public String department;
        public double salary;
        public String employeeId;
        public String branchId;
        public String branchName;
        public boolean isActive;

        public StaffMember(String staffId, String userId, String name, String email, String phone,
                           String role, String position, String department, double salary,
                           String employeeId, String branchId, String branchName, boolean isActive) {
            this.staffId = staffId;
            this.userId = userId;
            this.name = name;
            this.email = email;
            this.phone = phone;
            this.role = role != null ? role.toUpperCase(Locale.ROOT) : "TECHNICIAN";
            this.position = position != null && !position.isEmpty() ? position : this.role;
            this.department = department != null ? department : "";
            this.salary = salary;
            this.employeeId = employeeId != null && !employeeId.isEmpty() ? employeeId : "PENDING";
            this.branchId = branchId != null ? branchId : "";
            this.branchName = branchName != null && !branchName.isEmpty() ? branchName : "Main Branch";
            this.isActive = isActive;
        }
    }

    public static class BranchItem {
        public String id;
        public String name;
        public String branchCode;

        public BranchItem(String id, String name, String branchCode) {
            this.id = id;
            this.name = name;
            this.branchCode = branchCode;
        }

        @NonNull
        @Override
        public String toString() {
            return name;
        }
    }

    public static class ActivityLogItem {
        public String id;
        public String action;
        public String description;
        public String formattedDate;

        public ActivityLogItem(String id, String action, String description, String formattedDate) {
            this.id = id;
            this.action = action;
            this.description = description;
            this.formattedDate = formattedDate;
        }
    }

    // UI Views
    private FrameLayout btnStaffBack;
    private TextView lblStaffCountBadge;
    private FrameLayout btnRefreshStaff;
    private LinearLayout btnAddStaffHeader;
    private TextView lblKpiTotalStaff, lblKpiActiveStaff, lblKpiSuspendedStaff;
    private TextView lblKpiTechnicians, lblKpiDoctors, lblKpiReceptionists;
    private EditText inputSearchStaff;
    private ImageView btnClearSearchStaff;
    private LinearLayout containerStaffFilterChips;
    private ProgressBar progressStaff;
    private RecyclerView recyclerStaffDirectory;
    private LinearLayout emptyStateStaff;
    private Button btnAddStaffEmpty;

    // State
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private final List<StaffMember> allStaff = new ArrayList<>();
    private final List<StaffMember> filteredStaff = new ArrayList<>();
    private final List<BranchItem> branchesList = new ArrayList<>();
    private StaffAdapter staffAdapter;
    private String selectedFilter = "ALL";
    private String currentAdminUserId = "";
    private String baseUrl = "https://patholab.cloud";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_staff_management);

        initViews();
        setupFilterChips();
        setupEvents();

        fetchUserInfoAndData();
    }

    private void initViews() {
        btnStaffBack = findViewById(R.id.btnStaffBack);
        lblStaffCountBadge = findViewById(R.id.lblStaffCountBadge);
        btnRefreshStaff = findViewById(R.id.btnRefreshStaff);
        btnAddStaffHeader = findViewById(R.id.btnAddStaffHeader);

        lblKpiTotalStaff = findViewById(R.id.lblKpiTotalStaff);
        lblKpiActiveStaff = findViewById(R.id.lblKpiActiveStaff);
        lblKpiSuspendedStaff = findViewById(R.id.lblKpiSuspendedStaff);
        lblKpiTechnicians = findViewById(R.id.lblKpiTechnicians);
        lblKpiDoctors = findViewById(R.id.lblKpiDoctors);
        lblKpiReceptionists = findViewById(R.id.lblKpiReceptionists);

        inputSearchStaff = findViewById(R.id.inputSearchStaff);
        btnClearSearchStaff = findViewById(R.id.btnClearSearchStaff);
        containerStaffFilterChips = findViewById(R.id.containerStaffFilterChips);

        progressStaff = findViewById(R.id.progressStaff);
        recyclerStaffDirectory = findViewById(R.id.recyclerStaffDirectory);
        emptyStateStaff = findViewById(R.id.emptyStateStaff);
        btnAddStaffEmpty = findViewById(R.id.btnAddStaffEmpty);

        recyclerStaffDirectory.setLayoutManager(new LinearLayoutManager(this));
        staffAdapter = new StaffAdapter(filteredStaff, new StaffActionListener() {
            @Override
            public void onEdit(StaffMember staff) {
                showAddEditStaffDialog(staff);
            }

            @Override
            public void onViewActivity(StaffMember staff) {
                showActivityLogDialog(staff);
            }

            @Override
            public void onResetPassword(StaffMember staff) {
                showResetPasswordDialog(staff);
            }

            @Override
            public void onToggleStatus(StaffMember staff) {
                confirmToggleStatus(staff);
            }

            @Override
            public void onRemove(StaffMember staff) {
                confirmRemoveStaff(staff);
            }

            @Override
            public void onEmailClick(StaffMember staff) {
                if (staff.email != null && !staff.email.isEmpty()) {
                    Intent emailIntent = new Intent(Intent.ACTION_SENDTO, Uri.parse("mailto:" + staff.email));
                    startActivity(Intent.createChooser(emailIntent, "Send Email to " + staff.name));
                }
            }

            @Override
            public void onPhoneClick(StaffMember staff) {
                if (staff.phone != null && !staff.phone.isEmpty()) {
                    Intent dialIntent = new Intent(Intent.ACTION_DIAL, Uri.parse("tel:" + staff.phone));
                    startActivity(dialIntent);
                }
            }
        });
        recyclerStaffDirectory.setAdapter(staffAdapter);
    }

    private void setupFilterChips() {
        containerStaffFilterChips.removeAllViews();
        String[] filters = {"ALL", "ACTIVE", "SUSPENDED", "TECHNICIAN", "DOCTOR", "RECEPTIONIST", "LAB_MANAGER"};
        String[] filterLabels = {"All Members", "● Active", "● Suspended", "Technicians", "Doctors", "Receptionists", "Managers"};

        for (int i = 0; i < filters.length; i++) {
            final String filterKey = filters[i];
            final String filterLabel = filterLabels[i];

            TextView chip = new TextView(this);
            chip.setText(filterLabel);
            chip.setTextSize(12f);
            chip.setPadding(dpToPx(12), dpToPx(6), dpToPx(12), dpToPx(6));

            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                    ViewGroup.LayoutParams.WRAP_CONTENT,
                    ViewGroup.LayoutParams.WRAP_CONTENT
            );
            lp.setMargins(0, 0, dpToPx(8), 0);
            chip.setLayoutParams(lp);

            boolean isSelected = selectedFilter.equalsIgnoreCase(filterKey);
            if (isSelected) {
                chip.setBackgroundResource(R.drawable.bg_pill_indigo_soft);
                chip.setTextColor(0xFF0D6EFD);
                chip.getPaint().setFakeBoldText(true);
            } else {
                chip.setBackgroundResource(R.drawable.bg_pill_slate);
                chip.setTextColor(0xFF64748B);
                chip.getPaint().setFakeBoldText(false);
            }

            chip.setOnClickListener(v -> {
                selectedFilter = filterKey;
                setupFilterChips();
                applyFilter();
            });

            containerStaffFilterChips.addView(chip);
        }
    }

    private void setupEvents() {
        btnStaffBack.setOnClickListener(v -> finish());
        btnRefreshStaff.setOnClickListener(v -> fetchStaffDirectory(true));
        btnAddStaffHeader.setOnClickListener(v -> showAddEditStaffDialog(null));
        btnAddStaffEmpty.setOnClickListener(v -> showAddEditStaffDialog(null));

        inputSearchStaff.addTextChangedListener(new TextWatcher() {
            @Override
            public void beforeTextChanged(CharSequence s, int start, int count, int after) {}

            @Override
            public void onTextChanged(CharSequence s, int start, int before, int count) {
                btnClearSearchStaff.setVisibility(s.length() > 0 ? View.VISIBLE : View.GONE);
                applyFilter();
            }

            @Override
            public void afterTextChanged(Editable s) {}
        });

        btnClearSearchStaff.setOnClickListener(v -> {
            inputSearchStaff.setText("");
            btnClearSearchStaff.setVisibility(View.GONE);
            applyFilter();
        });
    }

    // ── HTTP API NETWORK CALLS ────────────────────────────────────────────────

    private void fetchUserInfoAndData() {
        executor.execute(() -> {
            try {
                String token = getAuthToken();
                URL url = new URL(baseUrl + "/api/auth/me");
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("GET");
                conn.setConnectTimeout(8000);
                conn.setReadTimeout(8000);
                if (token != null) {
                    conn.setRequestProperty("Authorization", "Bearer " + token);
                    conn.setRequestProperty("Cookie", "token=" + token);
                }

                if (conn.getResponseCode() == 200) {
                    String res = readStream(conn.getInputStream());
                    JSONObject json = new JSONObject(res);
                    JSONObject u = json.optJSONObject("user");
                    if (u != null) {
                        currentAdminUserId = u.optString("id", "");
                    }
                }
            } catch (Exception ignored) {
            }

            fetchBranches();
            fetchStaffDirectory(false);
        });
    }

    private void fetchBranches() {
        try {
            String token = getAuthToken();
            URL url = new URL(baseUrl + "/api/workspace/branches");
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("GET");
            conn.setConnectTimeout(8000);
            conn.setReadTimeout(8000);
            if (token != null) {
                conn.setRequestProperty("Authorization", "Bearer " + token);
                conn.setRequestProperty("Cookie", "token=" + token);
            }

            if (conn.getResponseCode() == 200) {
                String res = readStream(conn.getInputStream());
                JSONArray arr;
                if (res.trim().startsWith("[")) {
                    arr = new JSONArray(res);
                } else {
                    JSONObject obj = new JSONObject(res);
                    arr = obj.optJSONArray("branches");
                    if (arr == null) arr = new JSONArray();
                }

                branchesList.clear();
                // Add Main Branch default
                branchesList.add(new BranchItem("", "Main Branch", "01"));

                for (int i = 0; i < arr.length(); i++) {
                    JSONObject b = arr.getJSONObject(i);
                    String bId = b.optString("id", "");
                    String bName = b.optString("name", "Branch");
                    String bCode = b.optString("branchCode", "01");
                    if (!bId.isEmpty()) {
                        branchesList.add(new BranchItem(bId, bName, bCode));
                    }
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void fetchStaffDirectory(boolean showToast) {
        mainHandler.post(() -> {
            progressStaff.setVisibility(View.VISIBLE);
            if (allStaff.isEmpty()) emptyStateStaff.setVisibility(View.GONE);
        });

        executor.execute(() -> {
            try {
                String token = getAuthToken();
                URL url = new URL(baseUrl + "/api/workspace/staff");
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("GET");
                conn.setConnectTimeout(10000);
                conn.setReadTimeout(10000);
                if (token != null) {
                    conn.setRequestProperty("Authorization", "Bearer " + token);
                    conn.setRequestProperty("Cookie", "token=" + token);
                }

                int code = conn.getResponseCode();
                if (code == 200) {
                    String res = readStream(conn.getInputStream());
                    JSONArray arr = new JSONArray(res);
                    List<StaffMember> loaded = new ArrayList<>();

                    for (int i = 0; i < arr.length(); i++) {
                        JSONObject s = arr.getJSONObject(i);
                        String staffId = s.optString("id", "");
                        String position = s.optString("position", "");
                        String department = s.optString("department", "");
                        double salary = s.optDouble("salary", 0.0);
                        String employeeId = s.optString("employeeId", "");
                        String branchId = s.optString("branchId", "");

                        JSONObject u = s.optJSONObject("user");
                        String userId = u != null ? u.optString("id", "") : "";
                        String name = u != null ? u.optString("name", "Staff Member") : "Staff Member";
                        String email = u != null ? u.optString("email", "") : "";
                        String phone = u != null ? u.optString("phone", "") : "";
                        String role = u != null ? u.optString("role", "TECHNICIAN") : "TECHNICIAN";
                        boolean isActive = u != null ? u.optBoolean("isActive", true) : true;

                        JSONObject br = s.optJSONObject("branch");
                        String branchName = br != null ? br.optString("name", "Main Branch") : "Main Branch";

                        loaded.add(new StaffMember(staffId, userId, name, email, phone, role,
                                position, department, salary, employeeId, branchId, branchName, isActive));
                    }

                    mainHandler.post(() -> {
                        allStaff.clear();
                        allStaff.addAll(loaded);
                        progressStaff.setVisibility(View.GONE);
                        updateKPIs();
                        applyFilter();
                        if (showToast) {
                            Toast.makeText(StaffManagementActivity.this, "Staff directory updated.", Toast.LENGTH_SHORT).show();
                        }
                    });

                } else {
                    mainHandler.post(() -> {
                        progressStaff.setVisibility(View.GONE);
                        Toast.makeText(StaffManagementActivity.this, "Failed to load staff list (" + code + ")", Toast.LENGTH_SHORT).show();
                    });
                }
            } catch (Exception e) {
                e.printStackTrace();
                mainHandler.post(() -> {
                    progressStaff.setVisibility(View.GONE);
                    Toast.makeText(StaffManagementActivity.this, "Network error loading staff.", Toast.LENGTH_SHORT).show();
                });
            }
        });
    }

    private void updateKPIs() {
        int total = allStaff.size();
        int active = 0;
        int suspended = 0;
        int tech = 0;
        int doc = 0;
        int recep = 0;

        for (StaffMember m : allStaff) {
            if (m.isActive) active++;
            else suspended++;

            String r = m.role.toUpperCase(Locale.ROOT);
            if (r.contains("TECH")) tech++;
            else if (r.contains("DOC") || r.contains("PATH")) doc++;
            else if (r.contains("RECEP") || r.contains("FRONT")) recep++;
        }

        lblStaffCountBadge.setText(total + " Members");
        lblKpiTotalStaff.setText(String.valueOf(total));
        lblKpiActiveStaff.setText(String.valueOf(active));
        lblKpiSuspendedStaff.setText(String.valueOf(suspended));
        lblKpiTechnicians.setText(String.valueOf(tech));
        lblKpiDoctors.setText(String.valueOf(doc));
        lblKpiReceptionists.setText(String.valueOf(recep));
    }

    private void applyFilter() {
        String query = inputSearchStaff.getText() != null ? inputSearchStaff.getText().toString().trim().toLowerCase(Locale.ROOT) : "";
        filteredStaff.clear();

        for (StaffMember m : allStaff) {
            // Status/Role Filter
            boolean matchesFilter = false;
            if (selectedFilter.equals("ALL")) {
                matchesFilter = true;
            } else if (selectedFilter.equals("ACTIVE") && m.isActive) {
                matchesFilter = true;
            } else if (selectedFilter.equals("SUSPENDED") && !m.isActive) {
                matchesFilter = true;
            } else if (selectedFilter.equals("TECHNICIAN") && m.role.contains("TECH")) {
                matchesFilter = true;
            } else if (selectedFilter.equals("DOCTOR") && (m.role.contains("DOC") || m.role.contains("PATH"))) {
                matchesFilter = true;
            } else if (selectedFilter.equals("RECEPTIONIST") && (m.role.contains("RECEP") || m.role.contains("FRONT"))) {
                matchesFilter = true;
            } else if (selectedFilter.equals("LAB_MANAGER") && m.role.contains("MAN")) {
                matchesFilter = true;
            }

            if (!matchesFilter) continue;

            // Search Query Filter
            if (!query.isEmpty()) {
                boolean matchesQuery = m.name.toLowerCase(Locale.ROOT).contains(query)
                        || m.email.toLowerCase(Locale.ROOT).contains(query)
                        || m.employeeId.toLowerCase(Locale.ROOT).contains(query)
                        || m.phone.toLowerCase(Locale.ROOT).contains(query)
                        || m.role.toLowerCase(Locale.ROOT).contains(query)
                        || m.position.toLowerCase(Locale.ROOT).contains(query)
                        || m.department.toLowerCase(Locale.ROOT).contains(query)
                        || m.branchName.toLowerCase(Locale.ROOT).contains(query);
                if (!matchesQuery) continue;
            }

            filteredStaff.add(m);
        }

        staffAdapter.notifyDataSetChanged();
        emptyStateStaff.setVisibility(filteredStaff.isEmpty() ? View.VISIBLE : View.GONE);
    }

    // ── DIALOGS & ACTIONS ─────────────────────────────────────────────────────

    private void showAddEditStaffDialog(StaffMember existingStaff) {
        final boolean isEdit = existingStaff != null;
        BottomSheetDialog dialog = new BottomSheetDialog(this, com.google.android.material.R.style.Theme_Design_BottomSheetDialog);
        View v = LayoutInflater.from(this).inflate(R.layout.dialog_add_edit_staff, null);
        dialog.setContentView(v);

        TextView lblTitle = v.findViewById(R.id.lblStaffDialogTitle);
        TextView lblSubtitle = v.findViewById(R.id.lblStaffDialogSubtitle);
        ImageView btnClose = v.findViewById(R.id.btnCloseStaffDialog);

        EditText inputName = v.findViewById(R.id.inputStaffName);
        EditText inputPhone = v.findViewById(R.id.inputStaffPhone);
        LinearLayout containerEmail = v.findViewById(R.id.containerStaffEmail);
        EditText inputEmail = v.findViewById(R.id.inputStaffEmail);
        Spinner spinnerBranch = v.findViewById(R.id.spinnerStaffBranch);
        Spinner spinnerRole = v.findViewById(R.id.spinnerStaffRole);
        EditText inputPosition = v.findViewById(R.id.inputStaffPosition);
        EditText inputDepartment = v.findViewById(R.id.inputStaffDepartment);
        EditText inputSalary = v.findViewById(R.id.inputStaffSalary);
        LinearLayout containerPassword = v.findViewById(R.id.containerStaffPassword);
        EditText inputPassword = v.findViewById(R.id.inputStaffPassword);

        Button btnCancel = v.findViewById(R.id.btnCancelStaffDialog);
        Button btnSubmit = v.findViewById(R.id.btnSubmitStaffDialog);

        // Populate Roles
        String[] roleKeys = {"TECHNICIAN", "RECEPTIONIST", "DOCTOR", "LAB_MANAGER"};
        String[] roleLabels = {"Technician", "Receptionist", "Doctor / Pathologist", "Lab Manager"};
        ArrayAdapter<String> roleAdapter = new ArrayAdapter<>(this, android.R.layout.simple_spinner_dropdown_item, roleLabels);
        spinnerRole.setAdapter(roleAdapter);

        // Populate Branches
        if (branchesList.isEmpty()) {
            branchesList.add(new BranchItem("", "Main Branch", "01"));
        }
        ArrayAdapter<BranchItem> branchAdapter = new ArrayAdapter<>(this, android.R.layout.simple_spinner_dropdown_item, branchesList);
        spinnerBranch.setAdapter(branchAdapter);

        if (isEdit) {
            lblTitle.setText("Edit Staff Details");
            lblSubtitle.setText("Updating profile for " + existingStaff.name);
            inputName.setText(existingStaff.name);
            inputPhone.setText(existingStaff.phone);
            containerEmail.setVisibility(View.GONE); // Email/Login ID cannot be modified in edit
            containerPassword.setVisibility(View.GONE); // Password is reset via dedicated modal
            inputPosition.setText(existingStaff.position);
            inputDepartment.setText(existingStaff.department);
            if (existingStaff.salary > 0) inputSalary.setText(String.valueOf((int) existingStaff.salary));
            btnSubmit.setText("Save Changes");

            // Select Role
            for (int i = 0; i < roleKeys.length; i++) {
                if (roleKeys[i].equalsIgnoreCase(existingStaff.role)) {
                    spinnerRole.setSelection(i);
                    break;
                }
            }

            // Select Branch
            for (int i = 0; i < branchesList.size(); i++) {
                if (branchesList.get(i).id.equals(existingStaff.branchId)) {
                    spinnerBranch.setSelection(i);
                    break;
                }
            }
        } else {
            lblTitle.setText("Add Staff Member");
            lblSubtitle.setText("System will auto-generate a 9-digit Employee ID.");
            containerEmail.setVisibility(View.VISIBLE);
            containerPassword.setVisibility(View.VISIBLE);
            btnSubmit.setText("Create Account");
        }

        btnClose.setOnClickListener(x -> dialog.dismiss());
        btnCancel.setOnClickListener(x -> dialog.dismiss());

        btnSubmit.setOnClickListener(x -> {
            String name = inputName.getText().toString().trim();
            String phone = inputPhone.getText().toString().trim();
            String email = inputEmail.getText().toString().trim();
            int selectedRoleIdx = spinnerRole.getSelectedItemPosition();
            String role = selectedRoleIdx >= 0 ? roleKeys[selectedRoleIdx] : "TECHNICIAN";
            String position = inputPosition.getText().toString().trim();
            String dept = inputDepartment.getText().toString().trim();
            String salaryStr = inputSalary.getText().toString().trim();
            double salary = 0;
            try {
                if (!salaryStr.isEmpty()) salary = Double.parseDouble(salaryStr);
            } catch (Exception ignored) {}

            BranchItem selectedBranch = (BranchItem) spinnerBranch.getSelectedItem();
            String branchId = selectedBranch != null && !selectedBranch.id.isEmpty() ? selectedBranch.id : null;
            String password = inputPassword.getText().toString().trim();

            if (name.length() < 2) {
                Toast.makeText(StaffManagementActivity.this, "Please enter a valid full name.", Toast.LENGTH_SHORT).show();
                return;
            }
            if (phone.length() < 10) {
                Toast.makeText(StaffManagementActivity.this, "Please enter a valid 10-digit phone number.", Toast.LENGTH_SHORT).show();
                return;
            }
            if (!isEdit && (email.isEmpty() || !email.contains("@"))) {
                Toast.makeText(StaffManagementActivity.this, "Please enter a valid email address.", Toast.LENGTH_SHORT).show();
                return;
            }
            if (position.isEmpty()) {
                position = role;
            }

            btnSubmit.setEnabled(false);
            btnSubmit.setText("Saving...");

            final String finalPosition = position;
            final double finalSalary = salary;

            executor.execute(() -> {
                try {
                    String token = getAuthToken();
                    JSONObject payload = new JSONObject();

                    if (isEdit) {
                        URL url = new URL(baseUrl + "/api/workspace/staff");
                        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                        conn.setRequestMethod("PATCH");
                        conn.setRequestProperty("Content-Type", "application/json");
                        if (token != null) {
                            conn.setRequestProperty("Authorization", "Bearer " + token);
                            conn.setRequestProperty("Cookie", "token=" + token);
                        }
                        conn.setDoOutput(true);

                        payload.put("action", "UPDATE_DETAILS");
                        payload.put("staffId", existingStaff.staffId);
                        payload.put("userId", existingStaff.userId);
                        payload.put("name", name);
                        payload.put("phone", phone);
                        payload.put("role", role);
                        payload.put("position", finalPosition);
                        payload.put("department", dept);
                        payload.put("salary", finalSalary);
                        payload.put("branchId", branchId);

                        try (OutputStream os = conn.getOutputStream()) {
                            os.write(payload.toString().getBytes(StandardCharsets.UTF_8));
                        }

                        int code = conn.getResponseCode();
                        if (code == 200) {
                            mainHandler.post(() -> {
                                dialog.dismiss();
                                Toast.makeText(StaffManagementActivity.this, "Staff profile updated successfully.", Toast.LENGTH_SHORT).show();
                                fetchStaffDirectory(false);
                            });
                        } else {
                            String err = readStream(conn.getErrorStream());
                            mainHandler.post(() -> {
                                btnSubmit.setEnabled(true);
                                btnSubmit.setText("Save Changes");
                                Toast.makeText(StaffManagementActivity.this, "Failed to update: " + parseErrorMessage(err), Toast.LENGTH_LONG).show();
                            });
                        }
                    } else {
                        // Add New Staff
                        URL url = new URL(baseUrl + "/api/workspace/staff");
                        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                        conn.setRequestMethod("POST");
                        conn.setRequestProperty("Content-Type", "application/json");
                        if (token != null) {
                            conn.setRequestProperty("Authorization", "Bearer " + token);
                            conn.setRequestProperty("Cookie", "token=" + token);
                        }
                        conn.setDoOutput(true);

                        payload.put("name", name);
                        payload.put("phone", phone);
                        payload.put("email", email);
                        payload.put("role", role);
                        payload.put("position", finalPosition);
                        payload.put("department", dept);
                        payload.put("salary", finalSalary);
                        payload.put("branchId", branchId);
                        if (!password.isEmpty()) payload.put("password", password);

                        try (OutputStream os = conn.getOutputStream()) {
                            os.write(payload.toString().getBytes(StandardCharsets.UTF_8));
                        }

                        int code = conn.getResponseCode();
                        if (code == 200 || code == 201) {
                            mainHandler.post(() -> {
                                dialog.dismiss();
                                Toast.makeText(StaffManagementActivity.this, "Staff member created with 9-digit ID.", Toast.LENGTH_SHORT).show();
                                fetchStaffDirectory(false);
                            });
                        } else {
                            String err = readStream(conn.getErrorStream());
                            mainHandler.post(() -> {
                                btnSubmit.setEnabled(true);
                                btnSubmit.setText("Create Account");
                                Toast.makeText(StaffManagementActivity.this, "Failed to create: " + parseErrorMessage(err), Toast.LENGTH_LONG).show();
                            });
                        }
                    }
                } catch (Exception e) {
                    e.printStackTrace();
                    mainHandler.post(() -> {
                        btnSubmit.setEnabled(true);
                        btnSubmit.setText(isEdit ? "Save Changes" : "Create Account");
                        Toast.makeText(StaffManagementActivity.this, "Network error submitting staff data.", Toast.LENGTH_SHORT).show();
                    });
                }
            });
        });

        dialog.show();
    }

    private void showResetPasswordDialog(StaffMember staff) {
        BottomSheetDialog dialog = new BottomSheetDialog(this, com.google.android.material.R.style.Theme_Design_BottomSheetDialog);
        View v = LayoutInflater.from(this).inflate(R.layout.dialog_reset_password, null);
        dialog.setContentView(v);

        TextView lblStaffName = v.findViewById(R.id.lblResetPasswordStaffName);
        ImageView btnClose = v.findViewById(R.id.btnCloseResetPassword);
        EditText inputNewPassword = v.findViewById(R.id.inputNewPassword);
        Button btnCancel = v.findViewById(R.id.btnCancelResetPassword);
        Button btnSubmit = v.findViewById(R.id.btnSubmitResetPassword);

        lblStaffName.setText("Updating credentials for " + staff.name + " (" + staff.email + ")");

        btnClose.setOnClickListener(x -> dialog.dismiss());
        btnCancel.setOnClickListener(x -> dialog.dismiss());

        btnSubmit.setOnClickListener(x -> {
            String newPassword = inputNewPassword.getText().toString().trim();
            if (newPassword.length() < 6) {
                Toast.makeText(StaffManagementActivity.this, "Password must be at least 6 characters.", Toast.LENGTH_SHORT).show();
                return;
            }

            btnSubmit.setEnabled(false);
            btnSubmit.setText("Updating...");

            executor.execute(() -> {
                try {
                    String token = getAuthToken();
                    URL url = new URL(baseUrl + "/api/workspace/staff");
                    HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                    conn.setRequestMethod("PATCH");
                    conn.setRequestProperty("Content-Type", "application/json");
                    if (token != null) {
                        conn.setRequestProperty("Authorization", "Bearer " + token);
                        conn.setRequestProperty("Cookie", "token=" + token);
                    }
                    conn.setDoOutput(true);

                    JSONObject payload = new JSONObject();
                    payload.put("action", "CHANGE_PASSWORD");
                    payload.put("staffId", staff.staffId);
                    payload.put("userId", staff.userId);
                    payload.put("newPassword", newPassword);

                    try (OutputStream os = conn.getOutputStream()) {
                        os.write(payload.toString().getBytes(StandardCharsets.UTF_8));
                    }

                    int code = conn.getResponseCode();
                    if (code == 200) {
                        mainHandler.post(() -> {
                            dialog.dismiss();
                            Toast.makeText(StaffManagementActivity.this, "Password reset successfully for " + staff.name, Toast.LENGTH_SHORT).show();
                        });
                    } else {
                        String err = readStream(conn.getErrorStream());
                        mainHandler.post(() -> {
                            btnSubmit.setEnabled(true);
                            btnSubmit.setText("Update Password");
                            Toast.makeText(StaffManagementActivity.this, "Failed: " + parseErrorMessage(err), Toast.LENGTH_LONG).show();
                        });
                    }
                } catch (Exception e) {
                    e.printStackTrace();
                    mainHandler.post(() -> {
                        btnSubmit.setEnabled(true);
                        btnSubmit.setText("Update Password");
                        Toast.makeText(StaffManagementActivity.this, "Network error updating password.", Toast.LENGTH_SHORT).show();
                    });
                }
            });
        });

        dialog.show();
    }

    private void confirmToggleStatus(StaffMember staff) {
        if (staff.userId.equals(currentAdminUserId) && staff.isActive) {
            Toast.makeText(this, "You cannot suspend your own admin account.", Toast.LENGTH_LONG).show();
            return;
        }

        String actionWord = staff.isActive ? "SUSPEND" : "RESTORE";
        String message = "Are you sure you want to " + actionWord + " access for " + staff.name + " (" + staff.employeeId + ")?";

        new AlertDialog.Builder(this)
                .setTitle(staff.isActive ? "Suspend Staff Access" : "Restore Staff Access")
                .setMessage(message)
                .setPositiveButton(staff.isActive ? "Suspend Access" : "Restore Access", (d, w) -> {
                    toggleStaffStatusApi(staff, !staff.isActive);
                })
                .setNegativeButton("Cancel", null)
                .show();
    }

    private void toggleStaffStatusApi(StaffMember staff, boolean newActiveState) {
        progressStaff.setVisibility(View.VISIBLE);

        executor.execute(() -> {
            try {
                String token = getAuthToken();
                URL url = new URL(baseUrl + "/api/workspace/staff");
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("PATCH");
                conn.setRequestProperty("Content-Type", "application/json");
                if (token != null) {
                    conn.setRequestProperty("Authorization", "Bearer " + token);
                    conn.setRequestProperty("Cookie", "token=" + token);
                }
                conn.setDoOutput(true);

                JSONObject payload = new JSONObject();
                payload.put("action", "TOGGLE_STATUS");
                payload.put("staffId", staff.staffId);
                payload.put("userId", staff.userId);
                payload.put("isActive", newActiveState);

                try (OutputStream os = conn.getOutputStream()) {
                    os.write(payload.toString().getBytes(StandardCharsets.UTF_8));
                }

                int code = conn.getResponseCode();
                if (code == 200) {
                    mainHandler.post(() -> {
                        Toast.makeText(StaffManagementActivity.this,
                                "Staff member access " + (newActiveState ? "restored" : "suspended") + ".",
                                Toast.LENGTH_SHORT).show();
                        fetchStaffDirectory(false);
                    });
                } else {
                    String err = readStream(conn.getErrorStream());
                    mainHandler.post(() -> {
                        progressStaff.setVisibility(View.GONE);
                        Toast.makeText(StaffManagementActivity.this, "Error: " + parseErrorMessage(err), Toast.LENGTH_LONG).show();
                    });
                }
            } catch (Exception e) {
                e.printStackTrace();
                mainHandler.post(() -> {
                    progressStaff.setVisibility(View.GONE);
                    Toast.makeText(StaffManagementActivity.this, "Network error updating status.", Toast.LENGTH_SHORT).show();
                });
            }
        });
    }

    private void confirmRemoveStaff(StaffMember staff) {
        if (staff.userId.equals(currentAdminUserId)) {
            Toast.makeText(this, "You cannot remove your own admin account.", Toast.LENGTH_LONG).show();
            return;
        }

        new AlertDialog.Builder(this)
                .setTitle("Remove Staff Member")
                .setMessage("Are you sure you want to remove " + staff.name + " from the laboratory directory?\n\nThis will revoke all active logins.")
                .setPositiveButton("Remove Staff", (d, w) -> {
                    removeStaffApi(staff);
                })
                .setNegativeButton("Cancel", null)
                .show();
    }

    private void removeStaffApi(StaffMember staff) {
        progressStaff.setVisibility(View.VISIBLE);

        executor.execute(() -> {
            try {
                String token = getAuthToken();
                URL url = new URL(baseUrl + "/api/workspace/staff");
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("PATCH");
                conn.setRequestProperty("Content-Type", "application/json");
                if (token != null) {
                    conn.setRequestProperty("Authorization", "Bearer " + token);
                    conn.setRequestProperty("Cookie", "token=" + token);
                }
                conn.setDoOutput(true);

                JSONObject payload = new JSONObject();
                payload.put("action", "REMOVE_STAFF");
                payload.put("staffId", staff.staffId);
                payload.put("userId", staff.userId);

                try (OutputStream os = conn.getOutputStream()) {
                    os.write(payload.toString().getBytes(StandardCharsets.UTF_8));
                }

                int code = conn.getResponseCode();
                if (code == 200) {
                    mainHandler.post(() -> {
                        Toast.makeText(StaffManagementActivity.this, "Staff member removed.", Toast.LENGTH_SHORT).show();
                        fetchStaffDirectory(false);
                    });
                } else {
                    String err = readStream(conn.getErrorStream());
                    mainHandler.post(() -> {
                        progressStaff.setVisibility(View.GONE);
                        Toast.makeText(StaffManagementActivity.this, "Error: " + parseErrorMessage(err), Toast.LENGTH_LONG).show();
                    });
                }
            } catch (Exception e) {
                e.printStackTrace();
                mainHandler.post(() -> {
                    progressStaff.setVisibility(View.GONE);
                    Toast.makeText(StaffManagementActivity.this, "Network error removing staff.", Toast.LENGTH_SHORT).show();
                });
            }
        });
    }

    private void showActivityLogDialog(StaffMember staff) {
        BottomSheetDialog dialog = new BottomSheetDialog(this, com.google.android.material.R.style.Theme_Design_BottomSheetDialog);
        View v = LayoutInflater.from(this).inflate(R.layout.dialog_staff_activity_log, null);
        dialog.setContentView(v);

        TextView lblSubtitle = v.findViewById(R.id.lblActivityStaffSubtitle);
        ImageView btnClose = v.findViewById(R.id.btnCloseActivityLog);
        ProgressBar progress = v.findViewById(R.id.progressActivityLog);
        LinearLayout emptyView = v.findViewById(R.id.emptyActivityLog);
        RecyclerView recycler = v.findViewById(R.id.recyclerActivityLog);

        lblSubtitle.setText("Recent telemetry for " + staff.name);
        btnClose.setOnClickListener(x -> dialog.dismiss());

        recycler.setLayoutManager(new LinearLayoutManager(this));
        List<ActivityLogItem> logItems = new ArrayList<>();
        ActivityLogAdapter adapter = new ActivityLogAdapter(logItems);
        recycler.setAdapter(adapter);

        executor.execute(() -> {
            try {
                String token = getAuthToken();
                URL url = new URL(baseUrl + "/api/workspace/staff/" + staff.userId + "/activity");
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("GET");
                conn.setConnectTimeout(10000);
                conn.setReadTimeout(10000);
                if (token != null) {
                    conn.setRequestProperty("Authorization", "Bearer " + token);
                    conn.setRequestProperty("Cookie", "token=" + token);
                }

                int code = conn.getResponseCode();
                if (code == 200) {
                    String res = readStream(conn.getInputStream());
                    JSONArray arr = new JSONArray(res);

                    for (int i = 0; i < arr.length(); i++) {
                        JSONObject l = arr.getJSONObject(i);
                        String id = l.optString("id", "");
                        String action = l.optString("action", "ACTION").replace("_", " ");
                        String desc = l.optString("description", "No description provided.");
                        String createdAt = l.optString("createdAt", "");

                        logItems.add(new ActivityLogItem(id, action, desc, formatIsoDate(createdAt)));
                    }

                    mainHandler.post(() -> {
                        progress.setVisibility(View.GONE);
                        if (logItems.isEmpty()) {
                            emptyView.setVisibility(View.VISIBLE);
                            recycler.setVisibility(View.GONE);
                        } else {
                            emptyView.setVisibility(View.GONE);
                            recycler.setVisibility(View.VISIBLE);
                            adapter.notifyDataSetChanged();
                        }
                    });
                } else {
                    mainHandler.post(() -> {
                        progress.setVisibility(View.GONE);
                        emptyView.setVisibility(View.VISIBLE);
                    });
                }
            } catch (Exception e) {
                e.printStackTrace();
                mainHandler.post(() -> {
                    progress.setVisibility(View.GONE);
                    emptyView.setVisibility(View.VISIBLE);
                });
            }
        });

        dialog.show();
    }

    // ── ADAPTERS ──────────────────────────────────────────────────────────────

    public interface StaffActionListener {
        void onEdit(StaffMember staff);
        void onViewActivity(StaffMember staff);
        void onResetPassword(StaffMember staff);
        void onToggleStatus(StaffMember staff);
        void onRemove(StaffMember staff);
        void onEmailClick(StaffMember staff);
        void onPhoneClick(StaffMember staff);
    }

    private class StaffAdapter extends RecyclerView.Adapter<StaffAdapter.StaffViewHolder> {
        private final List<StaffMember> list;
        private final StaffActionListener listener;

        public StaffAdapter(List<StaffMember> list, StaffActionListener listener) {
            this.list = list;
            this.listener = listener;
        }

        @NonNull
        @Override
        public StaffViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
            View v = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_staff_card, parent, false);
            return new StaffViewHolder(v);
        }

        @Override
        public void onBindViewHolder(@NonNull StaffViewHolder h, int position) {
            StaffMember m = list.get(position);

            // Avatar initial
            String initial = m.name.length() > 0 ? String.valueOf(m.name.charAt(0)).toUpperCase(Locale.ROOT) : "S";
            h.txtStaffAvatarInitial.setText(initial);

            // Avatar background based on role
            String r = m.role.toUpperCase(Locale.ROOT);
            if (r.contains("DOC") || r.contains("PATH")) {
                h.staffAvatarBox.setBackgroundResource(R.drawable.bg_mod_icon_sky);
                h.txtStaffAvatarInitial.setTextColor(0xFF0284C7);
            } else if (r.contains("TECH")) {
                h.staffAvatarBox.setBackgroundResource(R.drawable.bg_mod_icon_purple);
                h.txtStaffAvatarInitial.setTextColor(0xFF7C3AED);
            } else if (r.contains("RECEP")) {
                h.staffAvatarBox.setBackgroundResource(R.drawable.bg_mod_icon_amber);
                h.txtStaffAvatarInitial.setTextColor(0xFFD97706);
            } else {
                h.staffAvatarBox.setBackgroundResource(R.drawable.bg_mod_icon_indigo);
                h.txtStaffAvatarInitial.setTextColor(0xFF0D6EFD);
            }

            // Name & Employee ID
            h.txtStaffName.setText(m.name);
            h.txtStaffEmployeeId.setText(m.employeeId);

            // Active / Suspended badge
            if (m.isActive) {
                h.txtStaffStatusBadge.setText("● Active");
                h.txtStaffStatusBadge.setTextColor(0xFF059669);
                h.txtStaffStatusBadge.setBackgroundResource(R.drawable.bg_status_ready);
            } else {
                h.txtStaffStatusBadge.setText("● Suspended");
                h.txtStaffStatusBadge.setTextColor(0xFFDC2626);
                h.txtStaffStatusBadge.setBackgroundResource(R.drawable.bg_test_box_accepted);
            }

            // Position & Role
            h.txtStaffPosition.setText(m.position);
            h.txtStaffRoleBadge.setText(m.role.replace("_", " "));

            // Branch
            h.txtStaffBranch.setText(m.branchName);

            // Contact
            h.txtStaffEmail.setText(m.email.isEmpty() ? "No email provided" : m.email);
            h.txtStaffPhone.setText(m.phone.isEmpty() ? "No phone" : m.phone);

            // Dept & Salary footer
            StringBuilder footerSb = new StringBuilder();
            if (!m.department.isEmpty()) {
                footerSb.append("Dept: ").append(m.department);
            }
            if (m.salary > 0) {
                if (footerSb.length() > 0) footerSb.append("  •  ");
                footerSb.append("Salary: ₹").append(String.format(Locale.getDefault(), "%,.0f", m.salary)).append("/mo");
            }
            if (footerSb.length() > 0) {
                h.txtStaffDeptSalary.setVisibility(View.VISIBLE);
                h.txtStaffDeptSalary.setText(footerSb.toString());
            } else {
                h.txtStaffDeptSalary.setVisibility(View.GONE);
            }

            // Click Handlers
            h.btnStaffEmailAction.setOnClickListener(v -> listener.onEmailClick(m));
            h.btnStaffPhoneAction.setOnClickListener(v -> listener.onPhoneClick(m));

            // Copy Employee ID on long press
            h.txtStaffEmployeeId.setOnLongClickListener(v -> {
                ClipboardManager cm = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
                ClipData clip = ClipData.newPlainText("Employee ID", m.employeeId);
                cm.setPrimaryClip(clip);
                Toast.makeText(StaffManagementActivity.this, "Copied ID: " + m.employeeId, Toast.LENGTH_SHORT).show();
                return true;
            });

            // 3-Dots Action Menu
            h.btnStaffMoreActions.setOnClickListener(v -> {
                PopupMenu popup = new PopupMenu(StaffManagementActivity.this, v);
                popup.getMenu().add(0, 1, 0, "✏️  Edit Details");
                popup.getMenu().add(0, 2, 1, "📜  View Activity Log");
                popup.getMenu().add(0, 3, 2, "🔑  Reset Password");
                popup.getMenu().add(0, 4, 3, m.isActive ? "🚫  Suspend Access" : "✓  Restore Access");
                popup.getMenu().add(0, 5, 4, "🗑️  Remove Staff");

                popup.setOnMenuItemClickListener(item -> {
                    switch (item.getItemId()) {
                        case 1:
                            listener.onEdit(m);
                            return true;
                        case 2:
                            listener.onViewActivity(m);
                            return true;
                        case 3:
                            listener.onResetPassword(m);
                            return true;
                        case 4:
                            listener.onToggleStatus(m);
                            return true;
                        case 5:
                            listener.onRemove(m);
                            return true;
                    }
                    return false;
                });
                popup.show();
            });
        }

        @Override
        public int getItemCount() {
            return list.size();
        }

        class StaffViewHolder extends RecyclerView.ViewHolder {
            FrameLayout staffAvatarBox;
            TextView txtStaffAvatarInitial;
            TextView txtStaffName, txtStaffEmployeeId, txtStaffStatusBadge;
            FrameLayout btnStaffMoreActions;
            TextView txtStaffPosition, txtStaffRoleBadge, txtStaffBranch;
            LinearLayout btnStaffEmailAction, btnStaffPhoneAction;
            TextView txtStaffEmail, txtStaffPhone, txtStaffDeptSalary;

            StaffViewHolder(View v) {
                super(v);
                staffAvatarBox = v.findViewById(R.id.staffAvatarBox);
                txtStaffAvatarInitial = v.findViewById(R.id.txtStaffAvatarInitial);
                txtStaffName = v.findViewById(R.id.txtStaffName);
                txtStaffEmployeeId = v.findViewById(R.id.txtStaffEmployeeId);
                txtStaffStatusBadge = v.findViewById(R.id.txtStaffStatusBadge);
                btnStaffMoreActions = v.findViewById(R.id.btnStaffMoreActions);
                txtStaffPosition = v.findViewById(R.id.txtStaffPosition);
                txtStaffRoleBadge = v.findViewById(R.id.txtStaffRoleBadge);
                txtStaffBranch = v.findViewById(R.id.txtStaffBranch);
                btnStaffEmailAction = v.findViewById(R.id.btnStaffEmailAction);
                btnStaffPhoneAction = v.findViewById(R.id.btnStaffPhoneAction);
                txtStaffEmail = v.findViewById(R.id.txtStaffEmail);
                txtStaffPhone = v.findViewById(R.id.txtStaffPhone);
                txtStaffDeptSalary = v.findViewById(R.id.txtStaffDeptSalary);
            }
        }
    }

    private static class ActivityLogAdapter extends RecyclerView.Adapter<ActivityLogAdapter.LogViewHolder> {
        private final List<ActivityLogItem> items;

        public ActivityLogAdapter(List<ActivityLogItem> items) {
            this.items = items;
        }

        @NonNull
        @Override
        public LogViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
            View v = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_staff_activity_row, parent, false);
            return new LogViewHolder(v);
        }

        @Override
        public void onBindViewHolder(@NonNull LogViewHolder h, int position) {
            ActivityLogItem item = items.get(position);
            h.lblActivityAction.setText(item.action);
            h.lblActivityDate.setText(item.formattedDate);
            h.lblActivityDescription.setText(item.description);
        }

        @Override
        public int getItemCount() {
            return items.size();
        }

        static class LogViewHolder extends RecyclerView.ViewHolder {
            TextView lblActivityAction, lblActivityDate, lblActivityDescription;

            LogViewHolder(View v) {
                super(v);
                lblActivityAction = v.findViewById(R.id.lblActivityAction);
                lblActivityDate = v.findViewById(R.id.lblActivityDate);
                lblActivityDescription = v.findViewById(R.id.lblActivityDescription);
            }
        }
    }

    // ── HELPERS ───────────────────────────────────────────────────────────────

    private String getAuthToken() {
        SharedPreferences prefs = getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
        String token = prefs.getString("auth_token", null);
        if (token == null) token = prefs.getString("token", null);
        if (token == null) {
            SharedPreferences appPrefs = getSharedPreferences("PathoLabPrefs", Context.MODE_PRIVATE);
            token = appPrefs.getString("auth_token", null);
            if (token == null) token = appPrefs.getString("token", null);
        }
        return token;
    }

    private String readStream(java.io.InputStream is) throws Exception {
        if (is == null) return "";
        BufferedReader br = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8));
        StringBuilder sb = new StringBuilder();
        String line;
        while ((line = br.readLine()) != null) {
            sb.append(line);
        }
        br.close();
        return sb.toString();
    }

    private String parseErrorMessage(String rawError) {
        try {
            JSONObject obj = new JSONObject(rawError);
            return obj.optString("error", obj.optString("message", "Request failed"));
        } catch (Exception e) {
            return "An unexpected error occurred.";
        }
    }

    private String formatIsoDate(String isoStr) {
        if (isoStr == null || isoStr.isEmpty()) return "Recently";
        try {
            SimpleDateFormat inFmt = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.US);
            inFmt.setTimeZone(TimeZone.getTimeZone("UTC"));
            Date date = inFmt.parse(isoStr.length() > 19 ? isoStr.substring(0, 19) : isoStr);
            if (date != null) {
                SimpleDateFormat outFmt = new SimpleDateFormat("MMM dd, h:mm a", Locale.getDefault());
                return outFmt.format(date);
            }
        } catch (Exception ignored) {}
        return isoStr;
    }

    private int dpToPx(int dp) {
        return (int) (dp * getResources().getDisplayMetrics().density);
    }
}
