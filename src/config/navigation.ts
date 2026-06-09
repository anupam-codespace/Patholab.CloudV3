import {
  LayoutDashboard,
  Users,
  TestTube,
  FileText,
  Settings,
  Building2,
  FlaskConical,
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
  Disc,
  Activity,
  CalendarDays,
  ScanLine,
  Server,
  LayoutTemplate,
  ScanBarcode,
  CheckSquare,
  ClipboardCheck, 
  Send,           
  History,
  Wallet // ✅ Added for Wallet
} from "lucide-react";

export type NavItem = {
  name: string;
  href: string;
  icon: any;
  badge?: string;
  reqModule?: string;
};

export type NavGroup = { 
  title: string; 
  items: NavItem[]; 
  reqModule?: string;
};

// ==========================================
// 1. BUSINESS ADMIN (Owner / Manager)
// ==========================================
export const adminNav: NavGroup[] = [
  {
    title: "Overview",
    items: [
      { name: "Dashboard", href: "/workspace", icon: LayoutDashboard },
      { name: "Lab Wallet", href: "/workspace/wallet", icon: Wallet, badge: "Pay-As-You-Go" }, // ✅ Prominent Wallet Access
      { name: "Financial Analytics", href: "/workspace/analytics", icon: BarChart3 },
    ],
  },
  {
    title: "Clinical Operations",
    items: [
      { name: "Patient Registration", href: "/workspace/registration", icon: UserPlus, badge: "New" },
      { name: "Patient Directory", href: "/workspace/patients", icon: Users },
      { name: "Test Catalog", href: "/workspace/test-management", icon: TestTube },
      { name: "Worklist & Results", href: "/workspace/results", icon: ClipboardCheck, badge: "Live" },
      { name: "Report Dispatch", href: "/workspace/reports", icon: Send },
    ],
  },
  {
    title: "Resources & Logistics",
    items: [
      // ✅ Removed old SaaS locks. All labs get these for free now.
      { name: "Inventory & Stock", href: "/workspace/inventory", icon: Box },
      { name: "Logistics / Trips", href: "/workspace/logistics", icon: Truck },
    ],
  },
  {
    title: "B2B & Growth",
    items: [
      // ✅ Removed old SaaS locks.
      { name: "Referral Doctors", href: "/workspace/doctors", icon: Stethoscope },
      { name: "Corporate Agencies", href: "/workspace/agencies", icon: Briefcase },
      { name: "Commissions Payout", href: "/workspace/commissions", icon: Receipt },
    ],
  },
  {
    title: "Administration",
    items: [
      { name: "Report Templates", href: "/workspace/settings/templates", icon: LayoutTemplate },
      { name: "Staff Management", href: "/workspace/staff", icon: UserCog },
      { name: "Invoices & Payments", href: "/workspace/billing", icon: Receipt },
      { name: "Lab Settings", href: "/workspace/settings", icon: Settings },
      { name: "Audit & Compliance", href: "/workspace/audit-logs", icon: History },
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
      { name: "Dashboard", href: "/workspace", icon: LayoutDashboard },
      { name: "New Registration", href: "/workspace/registration", icon: UserPlus, badge: "Start" },
      { name: "Patient Records", href: "/workspace/patients", icon: ClipboardList },
      { name: "Appointments", href: "/workspace/appointments", icon: CalendarDays },
      { name: "Home Collection", href: "/workspace/logistics", icon: Truck },
    ],
  },
  {
    title: "Billing & Dispatch",
    items: [
      { name: "Invoices & Payments", href: "/workspace/billing", icon: Receipt },
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
      { name: "Dashboard", href: "/workspace", icon: LayoutDashboard },
      { name: "Sample Accessioning", href: "/workspace/samples", icon: ScanBarcode },
      { name: "Worklist & Results", href: "/workspace/results", icon: ClipboardCheck, badge: "Live" },
    ],
  },
  {
    title: "Processing",
    items: [
      // ✅ ONLY Machine IoT remains locked because it requires a ₹3000 one-time setup fee
      { name: "Machine Results", href: "/workspace/analyzers", icon: Cpu, reqModule: "isLisIntegrationPaid" },
      { name: "AI Review", href: "/workspace/ai-review", icon: BrainCircuit },
      { name: "Verify & Approve", href: "/workspace/approvals", icon: CheckSquare },
    ],
  },
  {
    title: "Lab Resources",
    items: [
      { name: "Request Inventory", href: "/workspace/inventory-requests", icon: Box },
    ],
  },
];

// ==========================================
// 4. RADIOLOGY (Fully Unlocked Now)
// ==========================================
export const radiologyNav: NavGroup = {
  title: "Radiology (RIS)",
  // ✅ Removed hasRadiology lock. If they do an X-Ray, they just pay ₹2.5 like everything else.
  items: [
    { name: "RIS Dashboard", href: "/workspace/radiology/dashboard", icon: Activity },
    { name: "Scan Schedule", href: "/workspace/radiology/appointments", icon: CalendarDays },
    { name: "PACS Viewer", href: "/workspace/radiology/pacs", icon: FileImage },
    { name: "Reporting Queue", href: "/workspace/radiology/reporting", icon: Stethoscope },
    { name: "Machines", href: "/workspace/radiology/modalities", icon: Server },
  ],
};

// Attach Radiology to Admin navigation
adminNav.splice(3, 0, radiologyNav);

// Map standard database roles to their specific navigation configurations
export const roleNavMap: Record<string, NavGroup[]> = {
  SUPER_ADMIN: [], // Admin dashboard has its own layout
  LAB_OWNER: adminNav,
  LAB_MANAGER: adminNav, 
  TECHNICIAN: technicianNav,
  RECEPTIONIST: receptionistNav,
  DOCTOR: [], 
  AGENCY: [], 
};