import {
  LayoutDashboard,
  Users,
  TestTube,
  Settings,
  Truck,
  Cpu,
  BrainCircuit,
  Stethoscope,
  Briefcase,
  Receipt,
  Box,
  BarChart3,
  ShieldCheck,
  UserCog,
  UserPlus,
  ClipboardList,
  FileImage,
  Activity,
  CalendarDays,
  Server,
  LayoutTemplate,
  ScanBarcode,
  CheckSquare,
  ClipboardCheck,
  Send,
  History,
  Wallet,
  HelpCircle,
  Home,
  CreditCard,
  Image,
  Map,
  CheckCircle2,
  Bell,
  FileText,
  QrCode,
  PlusCircle,
  FlaskConical,
  Droplet,
  Printer,
  Zap,
  // ✅ v3.2.4.1: Additional icons for newly-linked orphan pages
  MapPin,
  Radio,
  Film,
  Archive,
  Network,
  Keyboard,
  Palette,
} from "lucide-react";

export type NavItem = {
  name: string;
  href: string;
  icon: any;
  badge?: string;
  moduleTag?: string; // ✅ Changed from reqModule to moduleTag to match your Sidebar logic
};

export type NavGroup = {
  title: string;
  items: NavItem[];
  moduleTag?: string; // ✅ Allows locking an entire group at once
};

// ==========================================
// 1. BUSINESS ADMIN (Owner / Manager)
// ==========================================
export const adminNav: NavGroup[] = [
  {
    title: "Overview",
    items: [
      { name: "Home", href: "/workspace", icon: Home },
      { name:"Dashboard", href:"/workspace/dashboard", icon: LayoutDashboard},
      { name: "Financial Analytics", href: "/workspace/analytics", icon: BarChart3 },
      { name: "Online Booking", href: "/workspace/bookings", icon: CalendarDays, badge: "New"},
      // { name: "Appointments", href: "/workspace/appointments", icon: CalendarDays,  },
    ],
  },
  {
    title: "Clinical Operations",
    items: [
      { name: "New Registration", href: "/workspace/registration", icon: UserPlus, badge: "N" },
      { name: "Patient Directory", href: "/workspace/patients", icon: Users },
      { name: "Test Management", href: "/workspace/test-management", icon: TestTube },
      // { name: "Accession", href: "/workspace/accession", icon: ScanBarcode },
      { name: "Worklist & Results", href: "/workspace/results", icon: ClipboardCheck, badge: "Live" },
      // { name: "Sample Lookup", href: "/workspace/samples", icon: Droplet },
      { name: "Report Dispatch", href: "/workspace/reports", icon: Send },
    ],
  },
  {
    title: "Resources & Logistics",
    items: [
      // ✅ Using uppercase DB-friendly tags
      { name: "Inventory & Stock", href: "/workspace/inventory", icon: Box, moduleTag: "inventory" },
      { name: "Logistics / Trips", href: "/workspace/logistics", icon: Truck, moduleTag: "logistics" },
      { name: "Home Collection", href: "/workspace/home-collection", icon: Truck },
    ],
  },

 {
    title: "Machine & AI",
    items: [
      // ✅ Using uppercase DB-friendly tags
      { name: "Analyzer", href: "/workspace/analyzers", icon: Cpu, moduleTag: "iot" },
      { name: "Visual Mapper", href: "/workspace/analyzers/mapper", icon: BrainCircuit, moduleTag: "iot" },
      { name: "Mappings", href: "/workspace/analyzers/mappings", icon: ScanBarcode, moduleTag: "iot" },
      { name: "AI Analysis", href: "/workspace/analyzers/ai", icon: Activity, moduleTag: "ai" },
    ],
  },

  
  {
    title: "B2B & Growth",
    moduleTag: "b2b", // Locks the whole group if B2B is not purchased
    items: [
      { name: "Referral Doctors", href: "/workspace/doctors", icon: Stethoscope },
      { name: "Corporate Agencies", href: "/workspace/agencies", icon: Briefcase },
      { name: "Commissions Payout", href: "/workspace/commissions", icon: Receipt },
      // ✅ v3.2.4.1: B2B Settings moved to the Administration group alongside other settings.
    ],
  },
  {
    title: "Administration",
    items: [
      // ✅ v3.2.4.1: Grouped settings — previously many settings sub-pages were
      // orphan (existed as routes but had no sidebar link). Now every settings
      // page is reachable from the sidebar.
      { name: "Lab Settings", href: "/workspace/settings", icon: Settings },
      { name: "Report Templates", href: "/workspace/settings/templates", icon: LayoutTemplate },
      { name: "Report Template (Alt)", href: "/workspace/settings/report-template", icon: FileText },
      { name: "Invoice Branding", href: "/workspace/settings/branding", icon: Image },
      { name: "Service Areas (Pincodes)", href: "/workspace/settings/service-areas", icon: MapPin },
      { name: "Payment Settings", href: "/workspace/settings/payment", icon: CreditCard },
      { name: "Notifications", href: "/workspace/settings/notifications", icon: Bell },
      { name: "B2B Settings", href: "/workspace/settings/b2b-tiers", icon: ShieldCheck, moduleTag: "b2b" },

      // ✅ v3.2.4.1: Separated from "Lab Settings" — these are operational tools
      { name: "Staff Management", href: "/workspace/staff", icon: UserCog },
      { name: "Invoices & Payments", href: "/workspace/billing", icon: Receipt },
      { name: "SaaS Invoice", href: "/workspace/invoice", icon: FileText },
      { name: "Print Barcodes", href: "/workspace/print/barcodes", icon: Printer },
      { name: "Expenses", href: "/workspace/expenses", icon: ClipboardList },
      { name: "Audit Logs", href: "/workspace/audit-logs", icon: History },
      { name: "Wallet & Billing", href: "/workspace/wallet", icon: Wallet },
      { name: "Wallet Recharge", href: "/workspace/wallet/recharge", icon: PlusCircle },
      { name: "Help & Support", href: "/workspace/support", icon: HelpCircle },
    ],
  },
];

// ==========================================
// 2. RECEPTIONIST (Front Desk)
// ==========================================
export const receptionistNav: NavGroup[] = [
  {
    title: "Patient Desk",
    items: [
      { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { name: "New Registration", href: "/workspace/registration", icon: UserPlus, badge: "Start" },
      { name: "Patient Records", href: "/workspace/patients", icon: ClipboardList },
      { name: "Accession", href: "/workspace/accession", icon: ScanBarcode },
      { name: "Online Bookings", href: "/workspace/bookings", icon: CalendarDays },
      { name: "Home Collection", href: "/workspace/logistics", icon: Truck, moduleTag: "logistics" },
    ],
  },
  {
    title: "Billing & Dispatch",
    items: [
      { name: "Invoices & Payments", href: "/workspace/billing", icon: Receipt },
      { name: "Print Barcodes", href: "/workspace/print/barcodes", icon: Printer },
      { name: "Report Dispatch", href: "/workspace/reports", icon: Send },
    ],
  },
];

// ==========================================
// 3. TECHNICIAN (Lab Operations)
// ==========================================
export const technicianNav: NavGroup[] = [
  {
    title: "Clinical Workflow",
    items: [
      { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { name: "Sample Accession", href: "/workspace/samples", icon: ScanBarcode },
      { name: "Worklist & Results", href: "/workspace/results", icon: ClipboardCheck, badge: "Live" },
    ],
  },
  {
    title: "Processing",
    items: [
      { name: "Machine Results", href: "/workspace/analyzers", icon: Cpu, moduleTag: "iot" },
      { name: "AI Review", href: "/workspace/ai-review", icon: BrainCircuit, moduleTag: "ai" },
      { name: "Verify & Approve", href: "/workspace/approvals", icon: CheckSquare },
    ],
  },
  {
    title: "Lab Resources",
    items: [
      { name: "Request Inventory", href: "/workspace/inventory-requests", icon: Box, moduleTag: "inventory" },
    ],
  },
];

// ==========================================
// 4. RADIOLOGY (If Module Enabled)
// ==========================================
export const radiologyNav: NavGroup = {
  title: "Radiology (RIS)",
  moduleTag: "radiology",
  items: [
    // ✅ v3.2.4.1: Expanded to include all radiology pages that were previously orphan.
    { name: "RIS Dashboard", href: "/workspace/radiology/dashboard", icon: Activity },
    { name: "Scan Schedule", href: "/workspace/radiology/appointments", icon: CalendarDays },
    { name: "Technician Worklist", href: "/workspace/radiology/worklist", icon: ClipboardCheck },
    { name: "PACS Viewer", href: "/workspace/radiology/pacs", icon: FileImage },
    { name: "Media Library", href: "/workspace/radiology/media", icon: Film },
    { name: "Reporting Queue", href: "/workspace/radiology/reporting", icon: Stethoscope },
    { name: "Reports Archive", href: "/workspace/radiology/reports-archive", icon: Archive },
    { name: "Machines (Modalities)", href: "/workspace/radiology/modalities", icon: Server },
    // ✅ v3.2.4.1: All RIS settings sub-pages now linked
    { name: "RIS Macros", href: "/workspace/radiology/settings/macros", icon: Keyboard },
    { name: "DICOM Settings", href: "/workspace/radiology/settings/dicom", icon: Network },
    { name: "RIS Letterhead", href: "/workspace/radiology/settings/letterhead", icon: Palette },
  ],
};

// Attach Radiology right after Clinical Operations
adminNav.splice(2, 0, radiologyNav);

// ==========================================
// 4b. PHLEBOTOMIST / COLLECTION STAFF
// ==========================================
export const phlebotomistNav: NavGroup[] = [
  {
    title: "My Collection Trips",
    items: [
      { name: "My Dashboard", href: "/workspace/collection-staff/dashboard", icon: Home },
      { name: "Today's Trips", href: "/workspace/collection-staff/trips", icon: Truck, badge: "Live" },
      { name: "Trip Map", href: "/workspace/collection-staff/map", icon: Map },
    ],
  },
  {
    title: "History",
    items: [
      { name: "Completed Collections", href: "/workspace/collection-staff/history", icon: CheckCircle2 },
      { name: "My Profile", href: "/workspace/collection-staff/profile", icon: UserCog },
    ],
  },
];

// ==========================================
// 5. ROLE MAPPER
// ==========================================
export const roleNavMap: Record<string, NavGroup[]> = {
  SUPER_ADMIN: adminNav, 
  LAB_OWNER: adminNav,
  LAB_MANAGER: adminNav, 
  TECHNICIAN: technicianNav,
  RECEPTIONIST: receptionistNav,
  PHLEBOTOMIST: phlebotomistNav,
  DOCTOR: [], 
  AGENCY: [], 
};