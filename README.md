# Patholab.cloud v3.0 — Laboratory Management System

## Overview
Patholab.cloud is a comprehensive cloud-based Laboratory Information Management System (LIMS) designed for diagnostic laboratories, pathology labs, and radiology centers. It supports multi-branch operations, B2B agency partnerships, online appointment booking, commission management, and NABL-compliant reporting.

## Version: 3.0
**Release Date:** July 2026

---

## User Roles & Permissions

### 1. SUPER_ADMIN
- **Access:** `/admin` — Platform-wide control panel
- **Capabilities:**
  - Manage all labs registered on the platform
  - View all users, invoices, payments across all labs
  - Configure global settings (SMTP, Razorpay, system branding)
  - Manage global test catalog and report templates
  - View platform-wide analytics and wallet ledger
  - Manage CMS pages and notifications
  - View all activity logs and notification logs

### 2. LAB_OWNER
- **Access:** `/workspace` — Full lab management dashboard
- **Capabilities:**
  - Full control over their lab and all branches
  - Manage staff (assign roles, branches, permissions)
  - Configure lab settings (modules, commission rates, branding)
  - View all patients, tests, invoices, reports across all branches
  - Manage wallet and billing
  - Manage doctors, agencies, and B2B partnerships
  - Configure report templates
  - View full audit logs and activity tracking
  - Manage inventory and expenses
  - Access analytics dashboard

### 3. LAB_MANAGER
- **Access:** `/workspace` — Management dashboard
- **Capabilities:**
  - Same as LAB_OWNER but can be restricted by permissions
  - Typically manages day-to-day operations
  - Can approve reports and manage staff

### 4. TECHNICIAN
- **Access:** `/workspace` — Technician dashboard
- **Capabilities:**
  - View technician-specific dashboard (pending tests, samples, completed today)
  - Sample accession and collection
  - Enter and edit test results
  - View worklist with checked-by/approved-by tracking
  - Request approval from pathologist
  - View low-stock inventory alerts
  - Cannot access billing, settings, or staff management

### 5. RECEPTIONIST
- **Access:** `/workspace` — Front desk dashboard
- **Capabilities:**
  - View receptionist-specific dashboard (today's patients, invoices, appointments)
  - Register new patients (phone optional, branch scope selector)
  - Create accessions and book tests
  - Manage billing and invoices
  - View patient directory
  - Schedule appointments
  - Dispatch reports

### 6. PHLEBOTOMIST
- **Access:** `/workspace` — Field operations dashboard
- **Capabilities:**
  - View assigned home collection trips
  - Collect samples in the field
  - Update sample collection status

### 7. DOCTOR (Referring)
- **Access:** `/workspace` — Doctor portal
- **Capabilities:**
  - View referred patients
  - Download reports
  - View commission earnings

### 8. AGENCY (B2B Partner)
- **Access:** `/workspace` — Agency portal
- **Capabilities:**
  - View referred patients
  - Download reports
  - View commission earnings
  - View B2B invoices with net rates

### 9. B2B_PARTNER
- **Access:** `/b2b` — Independent B2B portal
- **Capabilities:**
  - View dashboard with referral stats
  - View all referred patients with test status
  - Download reports (PDF)
  - View B2B invoices with net pricing
  - View commission earnings

### 10. PATIENT
- **Access:** `/portal` — Patient portal
- **Capabilities:**
  - View their test reports
  - Download reports

---

## Module System

The lab owner can enable/disable modules from **Settings → Lab Settings → App Modules**:

| Module | ID | Description |
|--------|-----|-------------|
| Inventory & Stock | `inventory` | Reagent management, stock tracking, auto-deduction |
| Radiology (RIS) | `radiology` | X-Ray, MRI, CT scan management with PACS viewer |
| Machine Interfacing (IoT) | `iot` | Bi-directional analyzer connection |
| B2B Agencies & Referrals | `b2b` | Agency management, commission tracking |
| Logistics & Trips | `logistics` | Home collection, phlebotomist routing |

When a module is disabled, its sidebar items are hidden for all users.

---

## Core Workflows

### Patient Registration → Accession → Results → Report

1. **Registration** (`/workspace/registration`)
   - Search existing patient by phone, name, or patient ID
   - Create new patient (phone is optional, select Global or Branch-scoped)
   - Select referring doctor and/or B2B agency

2. **Accession** (`/workspace/accession`)
   - Select patient → choose tests from catalog → add to cart
   - Select referring doctor (with commission rate displayed)
   - Select B2B agency (with commission rate displayed)
   - Apply discount if needed
   - System auto-calculates:
     - Doctor commission (per test, on discounted amount)
     - Agency commission (per test, on discounted amount)
     - Hidden B2B agency invoice with net rates
   - Creates invoice, tests, samples (with auto-set collectedAt)
   - Deducts wallet fee (₹2.5/patient, idempotent)

3. **Sample Collection** (`/workspace/samples`)
   - View pending samples
   - Update sample status (Collected → Received → Processing)
   - Auto-set timestamps on each status change

4. **Result Entry** (`/workspace/results`)
   - View worklist (pending, in-progress, completed, approved)
   - Enter test results per parameter
   - Save draft → Send to Pathologist → Approve & Lock
   - System records:
     - **Checked by:** (technician name + timestamp) when status → COMPLETED
     - **Approved by:** (pathologist name + timestamp) when status → APPROVED
   - Edit after approval via Amend function (increments version)
   - Auto-deduct inventory reagents on completion

5. **Report Generation** (`/workspace/reports`)
   - Generate PDF with active report template
   - Print options:
     - With/Without header (`?header=false`)
     - Extra blank pages (`?extraPages=N`)
     - One test per page (`?onePerPage=true`)
   - NABL-standard header: Collected at, Received at, Printed at
   - Checked-by and approved-by displayed in signature section
   - Share via WhatsApp, Email, or signed link

6. **Billing** (`/workspace/billing`)
   - View all invoices
   - 4 invoice template variants: A4 Full, A4 Half, Thermal 80mm, Compact
   - Print or download PDF
   - Update payment status
   - Logo and header upload options in settings

7. **Commission Management** (`/workspace/commissions`)
   - View doctor and agency commission ledger
   - Settle (mark as paid) with transaction reference
   - Commission calculated on discounted amount
   - Hidden B2B agency invoices visible only on agency/B2B portal

---

## Online Appointment Booking

Public booking page at `/book/[portalSlug]`:
- Browse lab's public test catalog
- Add tests to cart
- Fill patient details (name, phone, email, gender, DOB)
- Choose: Lab Visit or Home Collection
- Select date and time slot
- System creates: Patient, Invoice, Appointment, Tests
- No login required — fully public

---

## Multi-Branch System

- A lab can have multiple branches
- Staff can be assigned to multiple branches via `StaffBranchAssignment`
- Each staff has one primary branch (for default context)
- Lab owners and managers see all branches ("God View")
- Branch-scoped staff only see their branch's data
- Patients can be "Global" (all branches) or branch-specific
- Branch-specific branding (logo, letterhead, footer, signature)

---

## Activity Tracking & Audit Logs

All user actions are logged in the ActivityLog:
- User name, IP address, user agent
- Action type, entity type, entity ID
- Description and JSON details
- Severity (INFO, WARN, ERROR, CRITICAL)
- Category (AUTH, BILLING, INVENTORY, REPORTS, etc.)

Accessible at `/workspace/audit-logs` (requires audit:view permission).

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| ESC | Close dialog / Go back |
| Ctrl+/ | Show/hide keyboard shortcut help |
| N | New patient registration |
| / | Focus search bar |
| Ctrl+← | Previous page |
| Ctrl+→ | Next page |
| R | Refresh data |

---

## Theme System

- Light/Dark/System theme toggle in header
- Clinical blue (#2196F3) primary color
- Theme persists in localStorage (`patholab-theme` key)
- All pages use theme-aware CSS variables

---

## Test Credentials

| Email | Role | Password |
|-------|------|----------|
| admin@patholab.cloud | SUPER_ADMIN | password123 |
| lab@patholab.cloud | LAB_OWNER | password123 |
| manager@patholab.cloud | LAB_MANAGER | password123 |
| tech@patholab.cloud | TECHNICIAN | password123 |
| reception@patholab.cloud | RECEPTIONIST | password123 |
| phleb@patholab.cloud | PHLEBOTOMIST | password123 |
| b2b@patholab.cloud | B2B_PARTNER | password123 |

---

## Database

- **Development:** SQLite (`file:./db/custom.db`)
- **Production:** PostgreSQL (Neon)
- Use `scripts/switch-db.sh [sqlite|postgres]` to switch schemas
- Run `npx prisma db push` after switching
- Run `npx tsx prisma/seed.ts` to seed initial data

---

## Tech Stack

- **Framework:** Next.js 14 with App Router
- **Database:** Prisma ORM (SQLite/PostgreSQL)
- **UI:** Tailwind CSS + shadcn/ui + Lucide icons
- **State:** TanStack Query + Zustand
- **Auth:** JWT (httpOnly cookies, 7-day expiry)
- **PDF:** @react-pdf/renderer, jsPDF, html2pdf.js
- **Charts:** Recharts, Chart.js
- **Payments:** Razorpay
- **Email:** Resend / Nodemailer SMTP
- **WhatsApp:** WhatsApp Cloud API

---

## API Structure

All API routes are under `/api/`:
- `/api/auth/*` — Authentication (login, register, OTP, logout)
- `/api/workspace/*` — Lab workspace APIs (patients, tests, invoices, etc.)
- `/api/admin/*` — Super admin APIs
- `/api/b2b/*` — B2B partner portal APIs
- `/api/public/[portalSlug]/*` — Public booking APIs
- `/api/webhooks/*` — Razorpay webhook handler

All workspace APIs require JWT authentication and enforce lab-scoped data isolation.

---

## File Structure

```
src/
├── app/
│   ├── (auth)/              — Login, Register, Forgot Password
│   ├── (dashboard)/admin/   — Super Admin dashboard
│   ├── (labdashboard)/      — Lab workspace (all roles)
│   ├── (b2b-portal)/b2b/    — B2B Partner portal
│   ├── (patientportal)/     — Patient portal
│   ├── book/[portalSlug]/   — Public booking page
│   ├── api/                 — API routes
│   └── layout.tsx           — Root layout
├── components/
│   ├── billing/             — Invoice template selector
│   ├── common/              — ThemeToggle, KeyboardHelpOverlay
│   ├── dashboards/          — TechnicianDashboard, ReceptionistDashboard
│   ├── layouts/             — Sidebar, Header, AdminSidebar
│   ├── patients/            — PatientReferralTab
│   ├── report-builder/      — CanvasTemplateBuilder
│   └── ui/                  — shadcn/ui components
├── config/
│   └── navigation.ts        — Role-based navigation config
├── hooks/
│   ├── useAuth.ts           — Auth hook (returns user, lab, permissions)
│   └── useKeyboardShortcut.ts — Global keyboard shortcuts
├── lib/
│   ├── auth.ts              — JWT utilities
│   ├── prisma.ts            — Prisma client
│   ├── rate-limit.ts        — API rate limiter
│   └── mail.ts              — Email service (Resend)
├── actions/                  — Server actions (doctors, agencies, commissions)
└── middleware.ts             — Auth + RBAC middleware
```

---

## Production Deployment

1. Set environment variables:
   ```
   DATABASE_URL=postgresql://...
   JWT_SECRET=your-strong-secret
   RAZORPAY_KEY_ID=...
   RAZORPAY_KEY_SECRET=...
   RAZORPAY_WEBHOOK_SECRET=...
   SMTP_HOST=...
   SMTP_PORT=...
   SMTP_USER=...
   SMTP_PASS=...
   RESEND_API_KEY=...
   NEXT_PUBLIC_APP_URL=https://yourdomain.com
   ```

2. Switch to PostgreSQL: `bash scripts/switch-db.sh postgres`

3. Generate and push schema:
   ```
   npx prisma generate
   npx prisma db push
   npx tsx prisma/seed.ts
   ```

4. Build and run:
   ```
   npm run build
   npm start
   ```

5. Configure Razorpay webhook URL: `https://yourdomain.com/api/webhooks/razorpay`

---

## License
Proprietary — Patholab.cloud © 2026
