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
      { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
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
      // ✅ Using uppercase DB-friendly tags
      { name: "Inventory & Stock", href: "/workspace/inventory", icon: Box, moduleTag: "INVENTORY" },
      { name: "Logistics / Trips", href: "/workspace/logistics", icon: Truck, moduleTag: "LOGISTICS" },
    ],
  },
  {
    title: "B2B & Growth",
    moduleTag: "B2B", // Locks the whole group if B2B is not purchased
    items: [
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
      { name: "Audit Logs", href: "/workspace/audit-logs", icon: History },
      { name: "Wallet & Billing", href: "/workspace/wallet", icon: Wallet }, // Updated to Wallet icon
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
      { name: "Appointments", href: "/workspace/appointments", icon: CalendarDays },
      { name: "Home Collection", href: "/workspace/logistics", icon: Truck, moduleTag: "LOGISTICS" },
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
      { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { name: "Sample Accession", href: "/workspace/samples", icon: ScanBarcode },
      { name: "Worklist & Results", href: "/workspace/results", icon: ClipboardCheck, badge: "Live" },
    ],
  },
  {
    title: "Processing",
    items: [
      { name: "Machine Results", href: "/workspace/analyzers", icon: Cpu, moduleTag: "MACHINE_IOT" },
      { name: "AI Review", href: "/workspace/ai-review", icon: BrainCircuit, moduleTag: "AI_REVIEW" },
      { name: "Verify & Approve", href: "/workspace/approvals", icon: CheckSquare },
    ],
  },
  {
    title: "Lab Resources",
    items: [
      { name: "Request Inventory", href: "/workspace/inventory-requests", icon: Box, moduleTag: "INVENTORY" },
    ],
  },
];

// ==========================================
// 4. RADIOLOGY (If Module Enabled)
// ==========================================
export const radiologyNav: NavGroup = {
  title: "Radiology (RIS)",
  moduleTag: "RADIOLOGY", 
  items: [
    { name: "RIS Dashboard", href: "/workspace/radiology/dashboard", icon: Activity },
    { name: "Scan Schedule", href: "/workspace/radiology/appointments", icon: CalendarDays },
    { name: "PACS Viewer", href: "/workspace/radiology/pacs", icon: FileImage },
    { name: "Reporting Queue", href: "/workspace/radiology/reporting", icon: Stethoscope },
    { name: "Machines", href: "/workspace/radiology/modalities", icon: Server },
  ],
};

// Attach Radiology right after Clinical Operations
adminNav.splice(2, 0, radiologyNav);

// ==========================================
// 5. ROLE MAPPER
// ==========================================
export const roleNavMap: Record<string, NavGroup[]> = {
  SUPER_ADMIN: adminNav, 
  LAB_OWNER: adminNav,
  LAB_MANAGER: adminNav, 
  TECHNICIAN: technicianNav,
  RECEPTIONIST: receptionistNav,
  DOCTOR: [], 
  AGENCY: [], 
};