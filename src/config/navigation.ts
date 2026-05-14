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
  ClipboardCheck, // Added for Results
  Send,           // Added for Report Dispatch
  History         // Added for Audit Logs
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
      { name: "Inventory & Stock", href: "/workspace/inventory", icon: Box, reqModule: "hasInventory" },
      { name: "Logistics / Trips", href: "/workspace/logistics", icon: Truck, reqModule: "hasLogistics" },
    ],
  },
  {
    title: "B2B & Growth",
    reqModule: "hasB2bBilling", 
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
      { name: "Audit & Compliance", href: "/workspace/audit-logs", icon: History }, // ✅ NEW: Full Audit Trail
      { name: "My Subscription", href: "/workspace/subscription", icon: ShieldCheck },
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
      { name: "Home Collection", href: "/workspace/logistics", icon: Truck, reqModule: "hasLogistics" },
    ],
  },
  {
    title: "Billing & Dispatch",
    items: [
      { name: "Invoices & Payments", href: "/workspace/billing", icon: Receipt },
      { name: "Report Dispatch", href: "/workspace/reports", icon: Send }, // ✅ NEW: Receptionists need to send reports!
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
      { name: "Sample Accessioning", href: "/workspace/samples", icon: ScanBarcode },
      { name: "Worklist & Results", href: "/workspace/results", icon: ClipboardCheck, badge: "Live" }, // ✅ NEW: Points to our new Results page
    ],
  },
  {
    title: "Processing",
    items: [
      { name: "Machine Results", href: "/workspace/analyzers", icon: Cpu, reqModule: "hasMachineIoT" },
      { name: "AI Review", href: "/workspace/ai-review", icon: BrainCircuit, reqModule: "hasAiPrediction" },
      { name: "Verify & Approve", href: "/workspace/approvals", icon: CheckSquare },
    ],
  },
  {
    title: "Lab Resources",
    items: [
      { name: "Request Inventory", href: "/workspace/inventory-requests", icon: Box, reqModule: "hasInventory" },
    ],
  },
];

// ==========================================
// 4. RADIOLOGY (If Module Enabled)
// ==========================================
export const radiologyNav: NavGroup = {
  title: "Radiology (RIS)",
  reqModule: "hasRadiology", 
  items: [
    { name: "RIS Dashboard", href: "/workspace/radiology/dashboard", icon: Activity },
    { name: "Scan Schedule", href: "/workspace/radiology/appointments", icon: CalendarDays },
    { name: "PACS Viewer", href: "/workspace/radiology/pacs", icon: FileImage },
    { name: "Reporting Queue", href: "/workspace/radiology/reporting", icon: Stethoscope },
    { name: "Machines", href: "/workspace/radiology/modalities", icon: Server },
  ],
};

// Attach Radiology to Admin navigation if they have the module
// (Note: Splice index changed to 3 to accommodate the new "Resources" split)
adminNav.splice(3, 0, radiologyNav);

// Map standard database roles to their specific navigation configurations
export const roleNavMap: Record<string, NavGroup[]> = {
  SUPER_ADMIN: [], // Setup later
  LAB_OWNER: adminNav,
  LAB_MANAGER: adminNav, 
  TECHNICIAN: technicianNav,
  RECEPTIONIST: receptionistNav,
  DOCTOR: [], 
  AGENCY: [], 
};