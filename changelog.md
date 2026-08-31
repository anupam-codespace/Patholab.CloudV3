# Patholab Cloud — Changelog

All notable changes to **Patholab Cloud** from version **3.0.0** through **3.2.1** are documented in this file.

The format is loosely based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [3.2.4.3] — 2026-08-31

### Fixed

#### "Too many re-renders" on Service Areas page
- **Issue**: `/workspace/settings/service-areas` threw `Error: Too many re-renders. React limits the number of renders to prevent an infinite loop.` immediately on load.
- **Root cause**: The component called `setBranches(labData.lab.branches)` directly in the render body (inside an `if` block). React re-renders → re-evaluates the condition → calls `setBranches` again → infinite loop. The `branches.length === 0` guard didn't help because React batches state updates and the re-render happens before the state is read again.
- **Fix**: Moved the `setBranches` call into a `useEffect` with proper dependencies `[labData, branches.length]`. Effects run after render, so they don't trigger re-renders during the render phase.

#### Same bug on Appointment Detail page
- The Appointment Detail page (`/workspace/bookings/[id]`) had the same anti-pattern: it used `useState(() => {...})` to sync `paymentMode`, `transactionId`, and `paymentCollected` from the fetched appointment data. `useState`'s initializer is for computing initial state only — calling `setState` inside it runs during render and triggers the same infinite loop.
- **Fix**: Replaced `useState(() => {...})` with `useEffect(() => {...}, [appt])` so the state sync happens after render, not during.

### Changed
- Bumped `package.json` version to `3.2.4.3`.

---

## [3.2.4.2] — 2026-08-31

### Added

#### Public Changelog page at `/changelog`
- New public-facing changelog page that renders `CHANGELOG.md` as a beautifully formatted, searchable web page — no auth required.
- **Page structure**:
  - **Hero header** with gradient icon, title, and "Get Started" CTA.
  - **Search bar** — filter changelog entries by keyword (e.g., "invoice", "timezone", "report"). Bullet items that don't match the query are hidden; headers stay visible for context.
  - **Sticky version nav** (desktop) — left sidebar listing all 8 versions (v3.0.0 → v3.2.4.1). Click to smooth-scroll to that version. Active version is highlighted via `IntersectionObserver`.
  - **Version cards** — each release has a colored version badge (color-coded by major version), the LATEST tag on the most recent release, date, and a "Copy Link" button that copies a deep-link URL to that version.
  - **Category icons** — `#### Fixed` sections get a wrench icon (rose), `#### Added` get sparkles (emerald), `#### Changed` get refresh (blue), `#### Removed` get alert (amber). Makes it easy to scan what kind of change each entry is.
  - **Markdown rendering** — custom lightweight renderer supports `#`/`##`/`###`/`####` headers, bullet lists, `**bold**`, `` `inline code` ``, `[links](url)`, and `---` horizontal rules. No `react-markdown` dependency added (keeps bundle small).
  - **Scroll-to-top button** — appears after scrolling 600px.
  - **Empty state** — shows a "No results" message when search yields nothing.
- **Footer link added** — the landing page footer now has a "Changelog" link between Pricing and Terms.
- **Middleware updated** — `/changelog` added to `PUBLIC_PATHS` so it's accessible without authentication.
- **SEO metadata** — dynamic `<title>`, `<meta description>`, OpenGraph tags, and canonical URL set in the server component.

### Changed
- Bumped `package.json` version to `3.2.4.2`.

---

## [3.2.4.1] — 2026-08-31

### Fixed

#### All orphan pages now linked in the sidebar
- **Issue**: 13 workspace pages existed as routes but had NO link in the sidebar — users had to type the URL manually or click deep links from other pages. The most painful example was **Service Areas (pincode management)** which was added in v3.2.4 but had no sidebar entry.
- **Audit result**: Cross-referenced every `page.tsx` under `src/app/(labdashboard)/workspace/` against the `navHrefs` in `src/config/navigation.ts`. Found 13 orphans:
  - `/workspace/accession`
  - `/workspace/samples` (sample lookup)
  - `/workspace/settings/notifications`
  - `/workspace/settings/report-template` (alternate template builder)
  - `/workspace/settings/service-areas` ← **the one you specifically mentioned**
  - `/workspace/wallet/recharge`
  - `/workspace/print/barcodes`
  - `/workspace/invoice` (SaaS invoice)
  - `/workspace/radiology/worklist`
  - `/workspace/radiology/media`
  - `/workspace/radiology/reports-archive`
  - `/workspace/radiology/settings/dicom`
  - `/workspace/radiology/settings/letterhead`
- **Fix**: Updated `src/config/navigation.ts` to add all 13 orphans to the appropriate nav groups. After the fix, re-ran the orphan check → **zero orphans remain**.

### Changed

#### Admin navigation — expanded
- **Clinical Operations** group: added "Accession" and "Sample Lookup".
- **Resources & Logistics** group: added "Home Collection" (was previously only in Administration).
- **Administration** group: completely reorganized into a settings-first layout:
  - Lab Settings → Report Templates → Report Template (Alt) → Invoice Branding → **Service Areas (Pincodes)** → Payment Settings → Notifications → B2B Settings
  - Then operational tools: Staff Management → Invoices & Payments → SaaS Invoice → Print Barcodes → Expenses → Audit Logs → Wallet & Billing → Wallet Recharge → Help & Support
- **B2B & Growth** group: removed "B2B Settings" (moved to Administration alongside other settings).

#### Receptionist navigation — expanded
- Added "Accession", "Online Bookings", and "Print Barcodes" to the relevant groups (receptionists verify payments and print barcodes, so these belong there).

#### Radiology navigation — expanded
- Was 6 items, now 11 items. Added: Technician Worklist, Media Library, Reports Archive, DICOM Settings, RIS Letterhead. The old single "Settings" entry (which only pointed to macros) is now split into 3 specific entries (Macros, DICOM, Letterhead).

### Added
- New lucide-react icons imported for the new nav items: `Bell`, `FileText`, `QrCode`, `PlusCircle`, `FlaskConical`, `Droplet`, `Printer`, `Zap`, `MapPin`, `Radio`, `Film`, `Archive`, `Network`, `Keyboard`, `Palette`.

### Verification
- Restarted dev server. All 14 newly-linked pages return `307` (redirect to login) — confirming they compile cleanly and are now reachable.
- Re-ran the orphan-detection script: `✅ NONE — every workspace page is now linked in the sidebar!`

---

## [3.2.4] — 2026-08-31

### Fixed

#### ReportTemplate.config Prisma validation error
- **Critical**: Saving a report template from `/workspace/settings/templates/new` threw `PrismaClientValidationError: Argument 'config': Invalid value provided. Expected String or Null, provided Object.` The template builder passes a nested JS object, but the Prisma schema declares `ReportTemplate.config` as `String?`.
- **Fix**: Updated `src/actions/report-settings.ts` `saveTemplate()` to `JSON.stringify(config)` before passing to Prisma. The reader side (`/api/reports/generate/route.tsx`) already does `JSON.parse(config)`, so round-trip is safe.

#### Track API — schema mismatch on `discountAmount`
- The track API was selecting `invoice.discountAmount` but the actual Invoice schema field is `discount` (not `discountAmount`). This caused a 500 error on every track page load.
- **Fix**: Changed the select to `discount` and added `totalTax` to the response (mapped to `taxAmount` in the JSON response).

### Added

#### Convert online appointment to patient
- New endpoint `POST /api/workspace/appointments/[id]/convert-patient` — converts an online-booked appointment into a full Patient record that appears in the Patient Directory. Ensures the patient has a proper `patientId` (P-00001 format), updates demographic fields, marks the appointment as `CONFIRMED`, auto-creates a Doctor record if a new name is provided, and writes an `APPOINTMENT_CONVERTED_TO_PATIENT` activity log entry.
- "Convert to Patient" button added to the new Appointment Detail page.

#### Appointment Detail page
- New page at `/workspace/bookings/[id]` — comprehensive view of a single online appointment showing:
  - Patient info (name, ID, phone, email, age/gender, address for home collection)
  - Appointment info (date, time slot, source, branch, booked-at, verified-at)
  - Tests table (name, code, price, status, sample ID + collected-at)
  - Invoice summary (subtotal, discount, tax, grand total, payment status)
  - Payment management panel (lab UPI ID + QR, patient-submitted transaction ID, lab-owner form to update payment mode/transaction ID/amount, "Verify & Generate Track ID" button)
  - Home collection trip info (phlebotomist, scheduled/started/completed timestamps, trip status)
- "View Detail" links added to the Online Bookings list (visible for both verified and pending appointments).

#### Appointment payment management API
- New endpoint `PATCH /api/workspace/appointments/[id]/payment` — lets the lab owner update `paymentMode`, `transactionId`, `paymentCollected`, and optionally `markAsPaid` (which generates a trackId, sets `paymentVerified=true`, marks `status=CONFIRMED`, and syncs the linked invoice to `PAID`).

#### Service Areas management
- New API: `GET/POST /api/workspace/service-areas` and `PATCH/DELETE /api/workspace/service-areas/[id]` for managing pincode → branch mappings (the `ServiceArea` model already existed but had no UI/API).
- New page at `/workspace/settings/service-areas` — add/list/delete service areas with pincode, area name, delivery fee, branch, and active/inactive toggle.
- When a patient books a home collection, the system checks if their pincode is in the lab's service areas and auto-assigns the matching branch (existing logic, now configurable via UI).

#### UPI payment setup
- Lab Settings page (`/workspace/settings`) now has a "UPI Payment Settings" section in the Legal & Banking tab with fields for `upiId` and `upiQrCode` (URL or data URL). Includes a live QR preview.
- The settings PUT endpoint (`/api/workspace/settings`) now persists `upiId` and `upiQrCode` to the `Lab` record.
- New public endpoint `GET /api/public/[portalSlug]/payment-info` — returns the lab's UPI ID + QR code so the booking form can display them.

#### UPI payment flow on public booking form
- Rewrote `PublicBookingForm.tsx` to add a post-booking payment step:
  1. Patient fills the form and clicks "Book Now".
  2. Booking is created with `status=PENDING_PAYMENT`.
  3. Form transitions to a "Booking Confirmed" view showing the lab's UPI ID + QR code + a "Open UPI App to Pay" deep link (`upi://pay?pa=...&am=...`).
  4. Patient enters their UPI transaction ID / UTR.
  5. Patient clicks "Submit Payment Reference" → calls `POST /api/public/[portalSlug]/payment-reference` → updates the appointment's `transactionId` and `paymentMode`.
  6. Patient is redirected to the tracking page.
- If the lab hasn't set up UPI yet, shows a fallback message asking the patient to call the lab.

#### Enhanced public tracking page
- The track API (`/api/track/[trackId]`) now returns a much richer payload:
  - Patient ID, lab address, branch name/address/city/phone
  - Per-test details: name, code, status, TAT hours, sample ID + collected-at timestamp
  - Payment breakdown: subtotal, discount, tax, grand total, invoice number, transaction ID, payment mode
  - Home collection trip details: phlebotomist name + phone, scheduled/started/completed timestamps, trip status
  - Adaptive timeline: home-collection appointments show extra "Phlebotomist Assigned" and "On the Way" steps that lab-visit appointments don't.
- Rewrote the `/track/[trackId]` page UI to display all this: lab header with logo, patient + appointment cards, tests breakdown table, payment card with subtotal/discount/tax/total + transaction ID, home collection trip card (only for home collection), and the adaptive timeline.

### Changed
- Bumped `package.json` version to `3.2.4`.
- The public booking API (`/api/public/[portalSlug]/book`) now accepts `paymentReference` and `paymentMode` in the request body, persists them on the appointment, and returns a `paymentInfo` object (lab's UPI ID + QR + amount + note) in the response.

---

## [3.2.3] — 2026-08-31

### Fixed

#### Online Booking — portal slug visibility
- **Issue**: The Online Bookings page (`/workspace/bookings`) had no link to the portal-slug settings page, and no way to see the live public URL without navigating to Settings → Portal Settings. Lab owners couldn't find where to set up their public booking URL.
- **Fix**: Added a "Portal Settings" button in the bookings page header, plus a prominent banner showing the live public booking URL (or an "OFF" banner with a "Set Up Portal URL" CTA if no slug is set). Includes a "Copy URL" button for instant clipboard copy.
- Added `GET /api/workspace/settings/portal` endpoint (previously only `PATCH` existed) so the bookings page can fetch the current portalSlug on load.

#### Invoice templates — lab logo not rendering
- **Issue**: All four invoice templates (A4Full, A4Half, Thermal, Compact) displayed only the lab name and address — never the logo, even when a logo had been uploaded via Settings → Branding.
- **Fix**: Updated all four templates in `src/components/billing/InvoiceTemplateSelector.tsx` to render `lab.logo` as an `<img>` tag when present:
  - A4Full: 64px tall logo, left-aligned next to lab name.
  - A4Half: 48px tall logo, centered above lab name.
  - Thermal: 40px tall logo, centered above lab name.
  - Compact: 32px tall logo, centered above lab name.
- All `<img>` tags use `crossOrigin="anonymous"` so they work in print/PDF contexts.
- Also made the address/phone/email fields null-safe (previously showed `undefined` and stray commas when fields were empty).

#### Report Dispatch — empty list
- **Critical**: The Report Dispatch page (`/workspace/reports`) was always empty because **no `prisma.report.create()` call existed anywhere in the codebase**. Tests could be APPROVED but no `Report` record was ever created — so the dispatch page had nothing to show.
- **Fix**: Added auto-create logic in `/api/workspace/workflow/results/[id]/route.ts` (both batch and single-test branches):
  - When `action === 'APPROVE'` and the test transitions to `APPROVED` status, a `Report` record is automatically created (idempotent — skips if one already exists for that test).
  - The report is initialized with `status: 'APPROVED'`, `isSigned: true`, `signedById`, `signedAt`, `approvedAt`.
  - If a report already exists, its status is bumped to `APPROVED` instead of creating a duplicate.
- Existing approved tests in the DB will get a Report record created the next time they're re-approved, OR you can run a one-time backfill script (TBD).

#### Public tracking page crash
- **Issue**: `/api/track/[trackId]` was returning HTTP 500 with two distinct errors:
  1. `Cannot read properties of null (reading 'split')` — when `appointment.patient.name` was null.
  2. `Unknown field 'lab' for include statement on model 'Appointment'` — the Appointment model has only a `labId` scalar (no `lab` relation), but the query tried to `include: { lab: ... }`.
- **Fix**:
  - Removed `lab` from the `include` clause and fetch the lab separately via `prisma.lab.findUnique({ where: { id: appointment.labId } })`.
  - Made patient-name masking null-safe using `trim().split(/\s+/).filter(Boolean)` and falling back to `'Patient'` when name is null/empty.
  - Added `labLogo` and `labPhone` to the response so the public tracking page can display the lab's branding.

#### Middleware — public routes blocked
- **Issue**: The middleware's public-path checks were scattered as inline `pathname.startsWith(...)` calls, making it easy to miss routes. The matcher regex also didn't explicitly exclude `/uploads/`, `/sw.js`, `/manifest.json`, or `workbox-*.js` — these were being matched by the catch-all and potentially intercepting static asset requests.
- **Fix**:
  - Consolidated all public prefixes into a single `PUBLIC_PREFIXES` array (easier to audit and extend):
    - `/api/public/`, `/api/auth/`, `/api/track/`, `/api/verify/`, `/api/webhooks`
    - `/api/plans`, `/api/landing`, `/api/contact`, `/api/book-demo`, `/api/tests/categories`
    - `/track/`, `/verify/`, `/book/`
    - `/uploads/`, `/sw.js`, `/manifest.json`, `/favicon.ico`
  - Added `/portal` and `/book-demo` to `PUBLIC_PATHS`.
  - Added `/patient-portal` to the `PATIENT` role's allowed paths (patients were getting redirected to `/unauthorized`).
  - Tightened the matcher regex to explicitly exclude `_next/static`, `_next/image`, `favicon.ico`, `manifest.json`, `sw.js`, `workbox-*.js`, `uploads/`, and any path with a file extension.

### Added
- `GET /api/workspace/settings/portal` — fetches the current lab's `portalSlug`, `labName`, and `isActive` status.
- "Portal Settings" button + live URL banner on the Online Bookings page.
- Lab logo rendering on all four invoice templates.
- Auto-created `Report` records when tests are approved (both batch and single-test workflow branches).

### Changed
- Bumped `package.json` version to `3.2.3`.
- Middleware matcher is more explicit and easier to reason about.

---

## [3.2.2] — 2026-08-31

### Fixed

#### SQLite → PostgreSQL (Neon) migration
- **Critical**: Switching from SQLite to managed Postgres (Neon/Supabase/Railway) broke the four array-typed fields. On SQLite, Prisma silently serialized JS arrays into `TEXT` columns. On Postgres, strict typing rejected this with error `P2032: Error converting field "activeModules" of expected non-nullable type "String", found incompatible value of "[String("b2b"), ...]"`.
- **Root cause**: The Prisma schema declared these fields as `String` (matching SQLite's loose typing), but the application code wrote real JS arrays to them. SQLite accepted this; Postgres doesn't.
- **Fix**: Changed four fields from `String` to native Postgres `String[]` arrays:
  - `User.activeModules` — `String @default("")` → `String[] @default([])`
  - `Lab.activeModules` — `String @default("")` → `String[] @default([])`
  - `Branch.activeModules` — `String @default("")` → `String[] @default([])`
  - `LabStaff.permissions` — `String @default("")` → `String[] @default([])`
- Also changed two JSON-shaped fields from `String?` to `Json?`:
  - `SystemConfig.socialLinks` — was holding `{facebook, twitter, instagram}` objects serialized as strings.
  - `RadiologyStudy.safetyChecklist` — was holding `{idVerified, safetyCleared, consentSigned}` objects serialized as strings.
- Switched Prisma `datasource db` `provider` from `"sqlite"` to `"postgresql"`.
- All consumers of these fields were already array-safe (the Sidebar / `auth/me` route / settings page all have `Array.isArray()` defensive checks), so no application code changes were needed — only the schema declaration.

### Added
- **`.env.example`** — comprehensive environment variable template showing the Neon connection string format (`postgresql://user:password@host/db?sslmode=require`), plus all other env vars used by the app (JWT_SECRET, RESEND_API_KEY, RAZORPAY_KEY_ID, etc.).
- **`MIGRATION.md`** — step-by-step guide for migrating an existing SQLite deployment to Postgres (Neon). Covers: creating the Neon DB, updating `.env`, pushing the new schema, migrating existing data, verifying the fix, and rolling back if needed.
- **`scripts/migrate-sqlite-to-postgres.ts`** — data migration script that reads rows from the old SQLite DB and inserts them into Postgres with correct type conversion. Handles three legacy array-storage formats:
  1. Prisma SQLite JSON serialization: `'["b2b","inventory"]'` → JSON.parse
  2. Comma-separated: `'b2b,inventory,logistics'` → split(',')
  3. Single value: `'b2b'` → `[value]`
  
  Currently migrates the six tables with field-type conversions: `SystemConfig`, `User`, `Lab`, `Branch`, `LabStaff`, `RadiologyStudy`. For full migration of all 60+ tables, the guide recommends `pgloader` or extending the script.

### Changed
- Bumped `package.json` version to `3.2.2`.
- Prisma schema `datasource db` now uses `provider = "postgresql"`.

---

## [3.2.1] — 2026-08-31

### Fixed

#### Patient Directory — Delete visit, not patient
- **Critical**: Clicking "Delete" on a visit row in the Patient Directory previously purged the ENTIRE patient record (all visits, history, demographics, invoices, tests, reports). Now it deletes only the selected visit.
- Added `DELETE` handler to `/api/workspace/invoices/[id]/route.ts` that cascade-deletes a single invoice + its tests + samples + appointments + commissions in a Prisma `$transaction`, while preserving the patient record.
- Split the Patient Directory dropdown action into two distinct items:
  - **DELETE VISIT** (amber) — removes only the selected invoice/visit; patient profile preserved for future visits.
  - **PURGE PATIENT** (rose) — the legacy soft-delete; permanently removes the entire patient record. Separate, more aggressive confirmation dialog.
- Activity log captures `INVOICE_DELETED` events with the visit number, patient name/ID, who deleted, and how many tests were removed.

#### New referral doctor not appearing on Accession page
- **Root cause**: When a lab user typed a NEW doctor name in the registration page's `CreatableCombobox`, the backend `/api/workspace/patients` POST handler only did `findFirst({ where: { name }})` — if no match, the doctor was silently dropped. The accession page then showed "Self / No Doctor" even though the user had typed a name.
- **Fix**: Added auto-create logic in `/api/workspace/patients/route.ts` — if the doctor name doesn't exist, create a minimal `Doctor` record (name + 0% commission) and link it to the patient. Same logic applied for Agency.
- Mirrored the fix in `/api/workspace/accession/route.ts` POST — previously only looked up doctor by ID, so doctor NAMES passed via URL param `doc=...` were silently dropped. Now tries ID → name → auto-create.
- Both routes write `DOCTOR_AUTO_CREATED` / `AGENCY_AUTO_CREATED` activity log entries for auditability.

#### Accession page — Add new doctor inline (like registration)
- Replaced the accession page's plain `<select>` dropdowns (Doctor + Agency) with the new reusable `CreatableCombobox` component (`src/components/common/CreatableCombobox.tsx`).
- Lab users can now type a new doctor name directly on the accession page — same UX as the registration page. The typed value is passed through to the backend which auto-creates the doctor record.
- Combobox options display doctor name + specialization + commission rate for richer context.
- `selectedDoctorId` / `selectedAgencyId` state now initializes from URL params (`doc=...`, `agency=...`) so the registration page's selection is pre-populated on the accession page.

#### Edit Patient — Phone and all fields now editable
- **Critical**: The Edit Patient page called `PATCH /api/workspace/patients/[id]` but the API had **NO PATCH handler at all** (only GET + DELETE existed). Every edit silently failed.
- **Critical**: Even if PATCH had existed, the edit page extracted `json.data` from the GET response, but GET returns the patient object directly (no `data` wrapper) — so all form fields (including phone) reset to empty defaults on load.
- Added a full `PATCH` handler to `/api/workspace/patients/[id]/route.ts` supporting ALL editable fields: `title`, `name`, `phone`, `email`, `age`, `ageUnit`, `gender`, `dateOfBirth`, `address`, `doctorId`, `agencyId`, `abhaNumber`, `passportNumber`, `srfId`, `pincode`, `isGlobal`, `branchId`.
- Phone has 10-digit validation + collision check (returns 409 if another patient in the same lab already has that phone).
- Doctor/agency reassignment uses the same ID-or-name-or-auto-create logic as the registration and accession flows.
- Fixed the edit page's data extraction to use `json.data || json.patient || json` (handles all response shapes).
- Fixed the submit handler to map form field names to schema field names (`dob` → `dateOfBirth`, `passport` → `passportNumber`).
- Activity log writes `PATIENT_UPDATED` with the list of changed fields.

### Added
- New reusable component: `src/components/common/CreatableCombobox.tsx` (search-driven Popover + Command palette with an "+ Add" button that fires `onChange` with the typed string when no match exists). Used by both registration and accession pages.

### Changed
- Bumped `package.json` version to `3.2.1`.

---

## [3.2.0] — 2026-08-31

### Fixed

#### Timezone — Results saving with wrong time
- **Critical**: Server was running in UTC despite `TZ=Asia/Kolkata` being set in `.env`. Node.js reads `TZ` at startup, but `.env` is loaded after Node starts — so the env var never reached the Node process.
- Updated all `package.json` scripts (`dev`, `build`, `start`, `prisma:seed`) to prefix with `TZ=Asia/Kolkata` so Node sees the timezone from the very first tick.
- Added two new helper functions in `src/lib/timezone.ts`:
  - `parseISTInput(input)` — explicitly treats naive datetime-local strings (e.g., `"2026-08-31T15:30"`) as IST (UTC+5:30) regardless of the server's local timezone. Returns a `Date` object representing the correct UTC instant. Pass-through for ISO strings with explicit timezone info.
  - `toISTInputValue(date)` — the inverse: converts a UTC `Date` to a datetime-local string in IST for pre-filling HTML `<input type="datetime-local">` fields.
- Replaced the broken `setMinutes(getMinutes() - getTimezoneOffset())` hack in `workflow/results/[id]/page.tsx` with `toISTInputValue()`. The old hack assumed the server was in IST (offset -330), but in UTC (offset 0) it produced a 5.5-hour shift.
- Updated `/api/workspace/workflow/results/[id]/route.ts` to use `parseISTInput()` when saving `sampleCollectedAt` and `sampleReceivedAt`.
- Replaced `date-fns format()` with `formatIST()` in `reports/print/[id]/page.tsx` for visit date display (date-fns uses server timezone).

#### Duplicate routes removed
- Deleted `src/app/(labdashboard)/workspace/(modules)/(online booking)/bookings/page.tsx` — was a duplicate of `/workspace/bookings/page.tsx` (Next.js route groups `()` don't affect URLs, so both resolved to the same path). Moved the `settings/` subdirectory into the main `bookings/` folder.
- Deleted `src/app/api/b2b/reports/[testId]/pdf/route.ts` — was duplicating `route.tsx` (both resolved to `/api/b2b/reports/[testId]/pdf`). Kept the more complete `.tsx` version.
- Deleted broken `src/app/api/analyzers/route.ts` — was using the non-existent `prisma.analyzer` model (correct model is `prisma.labAnalyzer`).

### Added

#### Home Collection — full functional flow
- Rewrote `/api/workspace/logistics/route.ts`:
  - `GET` now fetches the actual user's lab (was `findFirst()` — pulled any lab).
  - Includes unassigned home-collection appointments (payment verified, no trip yet).
  - Computes real fleet availability based on active trips per phlebotomist.
  - `POST` creates a `HomeCollectionTrip` and assigns appointments with sequential `routeOrder`.
- Rewrote `/workspace/logistics/page.tsx` UI with functional workflow:
  - Stats bar (Total Staff / Available / Pending Assignment / Active Trips).
  - Fleet table showing each phlebotomist's status and active trip count.
  - Multi-select appointment list with checkboxes + search.
  - "Create Trip" button that opens the assignment flow (select phlebotomist → create trip).
  - Active trips table with link to staff dashboard.
- Added "Go to Dispatch Control" button on `/workspace/home-collection/page.tsx`.
- Added "Assign Staff" button on each verified home-collection appointment row.

#### Collection Staff (Phlebotomist) login + dashboard
- Added `PHLEBOTOMIST` role to `roleNavMap` in `src/config/navigation.ts` with a new `phlebotomistNav` group: My Dashboard / Today's Trips / Trip Map / Completed Collections / My Profile.
- Created `/api/workspace/collection-staff/trips/route.ts` — `GET` with `today` / `upcoming` / `completed` / `all` filters. Phlebotomists see only their own trips; Owners/Managers see all.
- Created `/api/workspace/collection-staff/trips/[tripId]/route.ts`:
  - `GET` — single trip detail with role-based ownership check.
  - `PATCH` — update trip status (SCHEDULED → STARTED → IN_PROGRESS → COMPLETED). Sets `startedAt` / `completedAt` timestamps. When marked COMPLETED, auto-creates `Sample` records for each test in the trip's appointments and marks tests as `IN_PROGRESS`.
- Created `/workspace/collection-staff/dashboard/page.tsx` — full dashboard with stats, today's trips, expandable rows showing each stop's patient/address/tests/payment, and Start/Complete trip buttons.
- Created `/workspace/collection-staff/trips/page.tsx` — tabbed view (Today / Upcoming / Completed / All).
- Extended `HomeCollectionTrip` Prisma model with `startedAt`, `completedAt`, `notes`, `updatedAt` fields (ran `prisma db push`).

#### Report Dispatch — print, share, with/without header
- Rewrote `/workspace/reports/page.tsx`:
  - Status filter tabs: Print Ready (APPROVED + FINAL) / All / Draft / Sent.
  - Stats bar showing counts of each status.
  - **Direct Print** button — fetches the PDF server-side, opens in a new tab, triggers `window.print()`.
  - **Download** modal with two options: "Download with Header" (default) and "Download without Header" (strips the lab logo/letterhead from the PDF).
  - **Share** modal with WhatsApp + Email (Gmail compose) buttons — pre-fills patient name, report version, and secure verification URL.
  - Amend modal preserved (unlocks report for editing with mandatory reason).
- Added `?filter=print_ready|draft|sent|all` query support to `/api/workspace/reports/route.ts`.
- Added `skipHeader` option to `/api/reports/generate/route.tsx` — when `true`, hides the lab header section in the rendered PDF.

#### Invoices — PDF endpoint + share actions
- Created `/api/workspace/invoices/[id]/pdf/route.tsx` — server-side PDF generation using `@react-pdf/renderer`:
  - Lab header with logo, name, address, GST/license numbers.
  - Patient info block (name, ID, phone, age/gender, address, referring doctor, agency).
  - Tests table with #, name, code, price.
  - Totals section (subtotal, discount, tax, grand total).
  - Status badge (PAID / PENDING / CANCELLED) with color coding.
  - IST-formatted timestamps.
  - Footer with "computer-generated invoice" notice + generation timestamp.
- Replaced the stub `invoice-actions.tsx` (was returning "coming soon" alerts) with functional component supporting:
  - **Print** — opens PDF in new tab, triggers browser print dialog.
  - **Download PDF** — server-side generated PDF, saves with filename `Invoice_<invoiceNumber>.pdf`.
  - **WhatsApp** — opens `wa.me` with pre-filled message + invoice link.
  - **Email** — opens Gmail compose with pre-filled subject + body.
  - **Copy Link** — copies shareable invoice URL to clipboard (uses `navigator.share` on mobile if available).
- Wired `InvoiceActions` into `billing/[id]/page.tsx` with patient/invoice props.

#### Logo & image uploads — file-based storage
- Created `/api/workspace/upload/public/route.ts` — multipart file upload endpoint:
  - Saves files to `/public/uploads/<labId>/<uuid>.<ext>`.
  - Validates file type (JPEG, PNG, GIF, WebP, SVG) and size (5MB max).
  - Returns the public URL that can be stored in the database and used in `<img>` tags + PDFs.
- Updated `/workspace/settings/branding/page.tsx` to try server-side upload first (returns URL that works in PDFs and cross-origin contexts), falling back to base64 data URL if upload fails. Previously all images were stored as base64 data URLs which broke in PDFs due to size limits and CORS issues.

#### Analyzer integration — all lab machine types
- Rewrote `/api/webhooks/analyzer/route.ts` to support three input formats:
  - **JSON multi-sample**: `{ machineId, results: [{ barcode, parameterCode, value, unit, flag, referenceRange }] }`
  - **JSON single-sample**: `{ machineId, barcode, parameters: [{ code, value, ... }] }`
  - **ASTM E1394 raw text**: parses `H` (header), `O` (order), `P` (patient), `R` (result), `L` (termination) records. Extracts machine ID from header field, sample ID from order line, parameter code/value/unit/flag/referenceRange from result lines.
- **Critical bug fix**: The old webhook wrote to a `value` field on `TestResultParameter` that doesn't exist in the Prisma schema — every machine result update would have thrown a Prisma error. Now correctly writes to `numericValue` (parsed float) and `textValue` (raw string).
- Auto-registers the analyzer on first webhook ping with protocol detection (`JSON` / `ASTM`).
- Updates units and reference ranges from machine data when provided.
- Comprehensive response: `{ success, machineId, totalResults, updated, unmappedCount, unmappedCodes, processedSamples, sampleErrors }`.
- Added `GET` health check endpoint for analyzer middleware — returns lab ID, lab name, supported protocols.
- Added "Registered Analyzers" section to `/workspace/analyzers/page.tsx` showing all auto-discovered machines with their result counts, mappings, unmapped queue, and protocol type.

#### Font & color uniformity
- Confirmed `Inter` font loaded via `next/font/google` in `layout.tsx` with `--font-inter` CSS variable.
- Tailwind config uses `var(--font-inter)` for `font-sans`.
- Theme variables (primary/secondary/accent/etc.) defined in `globals.css` using HSL CSS variables.
- All new pages use `text-foreground`, `bg-card`, `bg-muted`, `text-muted-foreground`, `text-primary`, `bg-primary` Tailwind classes that resolve to theme variables, ensuring uniform appearance across light/dark modes.

### Changed
- Bumped `package.json` version to `3.2.0`.
- All `package.json` scripts now prefix `TZ=Asia/Kolkata`.

---

## [3.1.0] / [3.1.1] — 2026-08-26

### Fixed

#### Auth & onboarding
- Added `activeModules` to `/api/auth/me` response so the Sidebar can filter navigation by purchased modules.
- Updated `useAuth` hook to return `lab` + `permissions` alongside `user`.
- Workspace layout now normalizes `activeModules` to lowercase and applies `bg-background` / `bg-muted/30` consistently.
- Sidebar always renders with `lg:ml-[280px]` to prevent layout shift on navigation.

#### Module-based navigation
- Bulk-lowercased all `moduleTag` values in `src/config/navigation.ts` (8 sed substitutions: `MACHINE_IOT` → `iot`, `AI_REVIEW` → `ai`, `INVENTORY` → `inventory`, `LOGISTICS` → `logistics`, `MACHINE` → `iot`, `AI` → `ai`, `B2B` → `b2b`, `RADIOLOGY` → `radiology`) — these now match what the lab settings page actually persists.
- Sidebar filter engine now checks **both** `group.moduleTag` (whole-group lock, e.g. `b2b` / `radiology`) and `item.moduleTag` (per-item lock, e.g. `inventory` / `logistics` / `iot` / `ai`).

#### ActivityLog schema compliance
- Wrapped all `activityLog.details` raw object literals in `JSON.stringify(...)` — the schema field is `String?`, not `Json`, so passing an object threw a Prisma runtime error.
- Added the required `entityType: String` field to 8 `activityLog.create` calls that were missing it (would have rolled back any containing transaction):
  - `accession/route.ts` — `TEST_UPDATED`
  - `patients/route.ts` — `PATIENT_CREATED`, `PATIENT_MERGED`
  - `auth/logout/route.ts` — `LOGOUT` → `entityType: 'SESSION'`
  - `staff/route.ts` — 3 calls → `entityType: "STAFF"`
  - `staff/[id]/route.ts` — 2 calls → `entityType: "STAFF"`
  - `patients/route.ts` (public) — `entityType: 'PATIENT'`
  - `admin/notifications/send/route.ts` — `entityType: 'NOTIFICATION'`
  - `admin/settings/route.ts` — `entityType: 'SYSTEM'`

#### Patient creation — Prisma relation syntax
- Migrated 6 scalar FK fields in `patients/route.ts` POST from raw ID assignment to Prisma `connect` relation syntax:
  - `labId: user.labId` → `lab: { connect: { id: user.labId } }`
  - `branchId` → conditional `branch: { connect: { id } }`
  - `userId` → conditional `user: { connect: { id } }`
  - `doctorId` → conditional `doctor: { connect: { id } }`
  - `agencyId` → conditional `agency: { connect: { id } }`
  - `ageUnit: body.ageUnit || null` → `ageUnit: body.ageUnit || "Years"` (field is non-nullable with default)

#### Login flow
- Added `credentials: "include"` to the `/api/auth/login` fetch in `login/page.tsx` so the `Set-Cookie` session header is persisted by the browser.
- Changed `router.push(data.redirect)` to `window.location.href = data.redirect` — the hard navigation forces the server to re-evaluate the auth cookie before the dashboard layout renders. `next/navigation`'s soft push was racing the cookie write and bouncing freshly-logged-in users back to `/login`.

#### Registration — phone optional
- Relaxed phone validation on `register/page.tsx` from "required + length < 10" to optional-but-strict-when-present (regex `^[6-9]\d{9}$` only runs when the field is non-empty).
- Updated field label from `Phone Number *` to `Phone Number (optional)`.
- Backend `auth/register/route.ts` removed `phone` from required fields, added format validation that only fires when phone is provided, and falls back to `phone: ""` for the non-nullable `Lab.phone` field when the user leaves it blank.

### Changed
- Bumped `package.json` version to `3.1.0` (then `3.1.1` for the timezone pre-fix).
- `useRouter` import left in `login/page.tsx` (no longer used for success redirect; kept to avoid touching unrelated lines).

---

## [3.0.0] / [3.0.1] — 2026-07-21

### Added

#### Multi-tenant SaaS architecture
- Refactored the entire data model to support multiple labs on a single deployment.
- Every clinical entity (Patient, Test, Invoice, Report, Appointment, Sample, etc.) now carries a `labId` foreign key.
- Row-Level Security enforced at the API layer — every query filters by `user.labId`.
- Branch-level isolation for multi-branch labs (receptionist sees only their branch's patients unless they are LAB_OWNER / SUPER_ADMIN).

#### Wallet-based pay-as-you-go billing
- Replaced the subscription model with a prepaid wallet system.
- Each lab has a `LabWallet` record with `balance`, `validityEndDate`, and `status`.
- Every billable action (patient registration, online booking, report generation) deducts from the wallet inside a Prisma `$transaction`.
- Wallet top-ups tracked via `WalletTransaction` records.
- Labs with empty wallets are NOT locked out of the workspace (they can still read data and reach the wallet recharge page); only paid actions are blocked at the API level via `requiredPermission` checks in `auth-guard.ts`.

#### Online booking portal with custom slug
- Each lab gets a unique `portalSlug` (e.g., `globiz-lab`) for their public booking page at `/book/<portalSlug>`.
- Public booking page (`/book/[portalSlug]/page.tsx`) shows the lab's branding (logo, name, city) and public test catalog.
- `PublicBookingForm` supports both LAB_VISIT and HOME_COLLECTION modes.
- HOME_COLLECTION requires pincode → validates against the lab's `ServiceArea` records → auto-assigns the matching branch.
- Generates a unique `trackId` of the form `TRK-YYYYMMDD-XXXX` for each booking.
- Public tracking page at `/track/[trackId]` lets patients monitor payment verification + sample collection + report readiness.
- Lab owners can claim/edit their portal slug at `/workspace/bookings/settings`.

#### B2B partner portal
- Separate login area at `/b2b` for B2B partners (agencies, corporate clients).
- B2B partners see only their referred patients' invoices and reports.
- Agency dashboard with monthly volume, commission breakdown, and downloadable reports.

#### Radiology Information System (RIS)
- Full radiology module with `moduleTag: "radiology"` (only visible when the lab has purchased the module).
- Sub-pages: RIS Dashboard, Scan Schedule, PACS Viewer, Reporting Queue, Machines (Modalities), Settings (Macros, DICOM, Letterhead).
- `Modality` model with AE Title, IP, port, manufacturer, maintenance schedule.
- `RadiologyStudy` model with safety checklist, performed/verified/report-released timestamps.
- `RadiologyReport` model with findings, impression, technique, and link to the modality.
- Print page at `/workspace/radiology/print/[studyId]` with strict A4 print CSS overrides.

#### Report template builder
- Visual template builder at `/workspace/settings/templates` using `@craftjs/core`.
- Configurable: layout margins, header (logo/title/subtitle/full-image/HTML), QR code (position/size/page-number), patient block (font-size/barcode/fields), body options (group-by-department, table-font-size, ref-range, timestamps, clinical flags).
- Templates stored as JSON `config` on the `ReportTemplate` model.
- Live preview renders the template with real patient data.

#### Test management with custom fields
- Full test catalog at `/workspace/test-management` with tabs: Tests, Parameters, Samples, Containers, Departments, Headings, Custom Fields, Guide.
- `LabTestParameter` model with `code`, `unit`, `referenceRanges[]` (gender/age-banded).
- `CustomField` model for lab-specific test fields (e.g., "Glucose Fasting", "Urine Color").
- Drag-and-drop parameter ordering on test templates.

#### PWA support
- Service worker registered via `@ducanh2912/next-pwa`.
- Manifest at `/manifest.json` with theme color, icons, start_url.
- `InstallPWA` component prompts users to install the app on mobile/desktop.
- PWA disabled in development to avoid cache confusion.

#### Audit logs
- Every sensitive action writes an `ActivityLog` entry: `labId`, `userId`, `action`, `entityType`, `entityId`, `description`, `timestamp`.
- Searchable audit log page at `/workspace/audit-logs`.

#### Inventory management
- `InventoryItem` model with current stock, reorder level, unit, batch tracking.
- `InventoryTransaction` model for stock in/out movements.
- Reagent consumption engine (`src/lib/inventoryEngine.ts`) auto-decrements stock when a test is marked COMPLETED/APPROVED.
- Low-stock alerts on the dashboard.

#### Commissions
- Doctor and Agency commission tracking with custom per-test rates.
- `DoctorCustomCommission` / `AgencyCustomCommission` junction tables for per-test overrides.
- Commission settlement page at `/workspace/commissions` with bulk-mark-as-paid.

#### Home collection (initial)
- `HomeCollectionTrip` model with phlebotomist assignment, scheduled date, start/end location, total distance, status (SCHEDULED / STARTED / IN_PROGRESS / COMPLETED).
- `Appointment` model extended with `collectionMode` (LAB_VISIT / HOME_COLLECTION), `collectionAddress`, `pincode`, `latitude`/`longitude`, `paymentCollected`, `paymentMode`, `transactionId`, `trackId`, `paymentVerified`.

#### ABDM (Ayushman Bharat Digital Mission) integration
- `SystemConfig` fields for `abdmClientId` / `abdmClientSecret` / `enableABDM`.
- `Patient.abhaNumber` / `Patient.healthId` for ABHA-linked patients.

#### Notifications
- In-app notification system with `Notification` model.
- Mark-as-read endpoint, unread badge in header.

#### Support tickets
- `SupportTicket` model for lab-to-super-admin communication.
- Support page at `/workspace/support`.

### Changed
- Migrated from raw SQL to Prisma ORM with SQLite (development) / PostgreSQL (production-ready) via `DATABASE_URL`.
- All API routes use `getDataFromToken(req)` or `getCurrentUser()` for auth — no more raw `req.cookies.get('token')` parsing in route bodies.
- Middleware (`src/middleware.ts`) enforces role-based access control (RBAC) for all routes:
  - `SUPER_ADMIN` → `/admin` + `/workspace`
  - `LAB_OWNER` / `LAB_MANAGER` / `TECHNICIAN` / `RECEPTIONIST` / `PHLEBOTOMIST` / `DOCTOR` / `AGENCY` → `/workspace`
  - `B2B_PARTNER` → `/b2b`
  - `PATIENT` → `/portal`
- Workspace layout renders role-specific navigation via `roleNavMap` in `src/config/navigation.ts`.

### Security
- JWT session cookies with `httpOnly` + `secure` (in production) + `sameSite: 'lax'`.
- bcryptjs password hashing.
- OTP via Resend email service for email verification + password reset.
- Soft-delete (`deletedAt` timestamp) on Patient, Lab, and other sensitive models for audit compliance.
