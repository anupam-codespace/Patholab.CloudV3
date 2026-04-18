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
  CheckSquare
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
    title: "Operations",
    items: [
      { name: "Patient Directory", href: "/workspace/patients", icon: Users },
      { name: "Test Catalog", href: "/workspace/catalog", icon: TestTube },
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
      { name: "Lab Settings", href: "/workspace/settings", icon: Settings },
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
      { name: "Print / Dispatch", href: "/workspace/dispatch", icon: FileText },
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
      { name: "Pending Worklist", href: "/workspace/worklist", icon: FlaskConical, badge: "Live" },
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
adminNav.splice(2, 0, radiologyNav);

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