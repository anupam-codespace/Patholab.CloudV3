// ==========================================
// FILE: src/lib/constants.ts
// Application constants
// ==========================================

import {
  Type, Image, QrCode, Barcode, Table2, PenTool, Minus, Square, User,
  Stethoscope, Layout, Heading1, Heading2, Heading3, List, FileText,
  Activity, AlertTriangle, FileCheck, FlaskConical, TestTube, CheckCircle,
  Flag, Award, Stamp, Fingerprint, Scissors, Baseline, FileDigit,
  BarChart, LineChart, PieChart, Info, AlignCenter, Link, Quote,
  Hash, ArrowRight
} from "lucide-react";
import { ElementType } from "./types";

// ─── SMART TOOLBOX ITEM INTERFACE ─────────────────────────
// defaultOverride allows us to spawn infinite variations of base elements
export interface ToolboxItem {
  id: string; // Unique ID for the toolbox item
  type: ElementType; // The core component it uses (text, image, etc.)
  label: string;
  icon: React.ElementType;
  category: string;
  defaultOverride?: {
    width?: number;
    height?: number;
    props?: Record<string, any>;
  };
}

// ─── 50+ EXHAUSTIVE LIMS COMPONENTS ────────────────────────
export const TOOLBOX_ITEMS: ToolboxItem[] = [
  // --- TYPOGRAPHY ---
  { id: "text-basic", type: "text", label: "Text Block", icon: Type, category: "Typography" },
  { id: "text-h1", type: "text", label: "Heading 1", icon: Heading1, category: "Typography", defaultOverride: { height: 40, props: { content: "Heading 1", fontSize: 24, bold: true } } },
  { id: "text-h2", type: "text", label: "Heading 2", icon: Heading2, category: "Typography", defaultOverride: { height: 35, props: { content: "Heading 2", fontSize: 20, bold: true } } },
  { id: "text-h3", type: "text", label: "Heading 3", icon: Heading3, category: "Typography", defaultOverride: { height: 30, props: { content: "Heading 3", fontSize: 16, bold: true } } },
  { id: "text-para", type: "text", label: "Paragraph", icon: AlignCenter, category: "Typography", defaultOverride: { height: 80, width: 300, props: { content: "Enter your detailed paragraph here. This is useful for long form clinical notes.", fontSize: 11 } } },
  { id: "text-quote", type: "text", label: "Clinical Quote", icon: Quote, category: "Typography", defaultOverride: { height: 60, props: { content: "“Clinical correlation is advised.”", italic: true, color: "#475569", bgColor: "#f8fafc", padding: 8 } } },
  { id: "text-bullet", type: "text", label: "Bullet List", icon: List, category: "Typography", defaultOverride: { height: 80, props: { content: "• Result 1\n• Result 2\n• Result 3" } } },
  { id: "text-number", type: "text", label: "Numbered List", icon: Baseline, category: "Typography", defaultOverride: { height: 80, props: { content: "1. First step\n2. Second step\n3. Third step" } } },
  
  // --- ICONS & SYMBOLS (Font Awesome Ready) ---
  { id: "icon-fa-flask", type: "text", label: "Flask Icon", icon: FlaskConical, category: "Icons & Symbols", defaultOverride: { width: 40, height: 40, props: { content: "", fontFamily: "FontAwesome", fontSize: 24, textAlign: "center" } } },
  { id: "icon-fa-heart", type: "text", label: "Heart/Cardio", icon: Activity, category: "Icons & Symbols", defaultOverride: { width: 40, height: 40, props: { content: "", fontFamily: "FontAwesome", fontSize: 24, textAlign: "center", color: "#ef4444" } } },
  { id: "icon-fa-alert", type: "text", label: "Warning Icon", icon: AlertTriangle, category: "Icons & Symbols", defaultOverride: { width: 40, height: 40, props: { content: "", fontFamily: "FontAwesome", fontSize: 24, textAlign: "center", color: "#eab308" } } },
  { id: "icon-fa-check", type: "text", label: "Checkmark", icon: CheckCircle, category: "Icons & Symbols", defaultOverride: { width: 40, height: 40, props: { content: "", fontFamily: "FontAwesome", fontSize: 24, textAlign: "center", color: "#22c55e" } } },

  // --- MEDICAL & LAB SPECIFIC ---
  { id: "lab-patient", type: "patientData", label: "Patient Demographics", icon: User, category: "Medical & Lab" },
  { id: "lab-specimen", type: "text", label: "Specimen Info", icon: TestTube, category: "Medical & Lab", defaultOverride: { width: 250, height: 60, props: { content: "**Specimen:** Serum\n**Collection Date:** {{system.date}}", fontSize: 11, bgColor: "#f1f5f9", padding: 6 } } },
  { id: "lab-history", type: "text", label: "Clinical History", icon: FileText, category: "Medical & Lab", defaultOverride: { width: 400, height: 60, props: { content: "**Clinical History:** Provide brief history here.", fontSize: 11, borderBottom: "1px solid #cbd5e1" } } },
  { id: "lab-interpretation", type: "text", label: "Interpretation", icon: Stethoscope, category: "Medical & Lab", defaultOverride: { width: 400, height: 100, props: { content: "**INTERPRETATION:**\nLevels are within normal biological limits.", fontSize: 10 } } },
  { id: "lab-abnormal", type: "text", label: "Abnormal Flag", icon: Flag, category: "Medical & Lab", defaultOverride: { width: 80, height: 30, props: { content: "HIGH", fontSize: 12, bold: true, color: "#ffffff", bgColor: "#ef4444", textAlign: "center", padding: 4 } } },
  { id: "lab-end-report", type: "text", label: "End of Report", icon: Hash, category: "Medical & Lab", defaultOverride: { width: 300, height: 30, props: { content: "*** END OF REPORT ***", fontSize: 12, bold: true, textAlign: "center", color: "#64748b" } } },
  { id: "lab-ref-bar", type: "shape", label: "Reference Range Bar", icon: Minus, category: "Medical & Lab", defaultOverride: { width: 200, height: 12, props: { shapeType: "rectangle", fillColor: "#22c55e", borderRadius: 6 } } },

  // --- VERIFICATION & SIGNATURES ---
  { id: "ver-qr", type: "qr", label: "QR Code (Report)", icon: QrCode, category: "Verification" },
  { id: "ver-barcode", type: "barcode", label: "Sample Barcode", icon: Barcode, category: "Verification" },
  { id: "ver-sig-1", type: "signature", label: "Doctor Signature", icon: PenTool, category: "Verification" },
  { id: "ver-sig-path", type: "signature", label: "Chief Pathologist", icon: Stamp, category: "Verification", defaultOverride: { props: { name: "Dr. Chief Pathologist", designation: "HOD Pathology" } } },
  { id: "ver-fingerprint", type: "image", label: "Thumb Impression", icon: Fingerprint, category: "Verification", defaultOverride: { width: 60, height: 80, props: { src: "https://via.placeholder.com/60x80?text=Thumb", border: "1px solid #000" } } },

  // --- BRANDING & IMAGES ---
  { id: "img-basic", type: "image", label: "Custom Image", icon: Image, category: "Branding" },
  { id: "img-logo", type: "image", label: "Lab Logo Placeholder", icon: Layout, category: "Branding", defaultOverride: { width: 120, height: 60, props: { objectFit: "contain" } } },
  { id: "img-nabl", type: "image", label: "NABL Logo", icon: Award, category: "Branding", defaultOverride: { width: 60, height: 60, props: { src: "https://via.placeholder.com/60?text=NABL", objectFit: "contain" } } },
  { id: "img-cap", type: "image", label: "CAP Logo", icon: Award, category: "Branding", defaultOverride: { width: 60, height: 60, props: { src: "https://via.placeholder.com/60?text=CAP", objectFit: "contain" } } },
  { id: "img-watermark", type: "image", label: "Watermark Center", icon: FileDigit, category: "Branding", defaultOverride: { width: 400, height: 400, props: { opacity: 0.1, objectFit: "contain" } } },

  // --- DATA TABLES & CHARTS ---
  { id: "data-table", type: "table", label: "Results Table", icon: Table2, category: "Data & Charts" },
  { id: "data-table-simple", type: "table", label: "Simple 2-Col Table", icon: Table2, category: "Data & Charts", defaultOverride: { props: { columns: [{ id: "c1", title: "Parameter", width: 50 }, { id: "c2", title: "Result", width: 50 }] } } },
  { id: "data-bar", type: "image", label: "Bar Chart (Mock)", icon: BarChart, category: "Data & Charts", defaultOverride: { width: 250, height: 150, props: { src: "https://via.placeholder.com/250x150?text=Bar+Chart" } } },
  { id: "data-line", type: "image", label: "Trend Graph (Mock)", icon: LineChart, category: "Data & Charts", defaultOverride: { width: 250, height: 150, props: { src: "https://via.placeholder.com/250x150?text=Trend+Line" } } },

  // --- LAYOUT & STRUCTURE ---
  { id: "layout-spacer", type: "spacer", label: "Spacer", icon: Minus, category: "Layout & Structure" },
  { id: "layout-divider", type: "shape", label: "Horizontal Line", icon: Minus, category: "Layout & Structure", defaultOverride: { width: 500, height: 2, props: { fillColor: "#000000" } } },
  { id: "layout-v-divider", type: "shape", label: "Vertical Line", icon: Minus, category: "Layout & Structure", defaultOverride: { width: 2, height: 100, props: { fillColor: "#000000" } } },
  { id: "layout-box", type: "shape", label: "Container Box", icon: Square, category: "Layout & Structure", defaultOverride: { width: 300, height: 150, props: { fillColor: "transparent", strokeColor: "#cbd5e1", strokeWidth: 1 } } },
  { id: "layout-pagebreak", type: "spacer", label: "Page Break (PDF)", icon: Scissors, category: "Layout & Structure", defaultOverride: { height: 20, props: { bgColor: "#fee2e2", content: "--- Page Break ---", align: "center", color: "#ef4444" } } },
  { id: "layout-footerbg", type: "shape", label: "Footer Background", icon: Layout, category: "Layout & Structure", defaultOverride: { width: 794, height: 100, props: { fillColor: "#1e3a8a" } } },
];

// Core Defaults remain the same, they act as the base fallback
export const ELEMENT_DEFAULTS: Record<ElementType, { width: number; height: number; props: Record<string, any> }> = {
  text: { width: 200, height: 60, props: { content: "Edit me", fontSize: 12, fontFamily: "Arial", color: "#1e293b", bgColor: "transparent", textAlign: "left", lineHeight: 1.5, bold: false, italic: false, underline: false, padding: 4 } },
  image: { width: 200, height: 150, props: { src: "", objectFit: "contain", opacity: 1 } },
  qr: { width: 100, height: 100, props: { data: "https://patholab.com", fgColor: "#000000", bgColor: "#ffffff", showPageNumber: false } },
  barcode: { width: 180, height: 50, props: { value: "1234567890", format: "CODE128", scale: 1, displayValue: true } },
  table: { width: 600, height: 200, props: { columns: [{ id: "c1", title: "Test", width: 25 }, { id: "c2", title: "Result", width: 25 }, { id: "c3", title: "Unit", width: 25 }, { id: "c4", title: "Range", width: 25 }], rows: [{ id: "r1", cells: ["Bilirubin", "0.5", "mg/dL", "0.2-1.2"] }], headerBgColor: "#f1f5f9", headerTextColor: "#0f172a", rowBgColor: "#ffffff", rowAlternateColor: "#f8fafc", borderColor: "#cbd5e1", cellPadding: 8 } },
  signature: { width: 150, height: 80, props: { name: "Dr. Name", designation: "Designation", qualifications: "MBBS, MD", imageUrl: "", lineColor: "#cbd5e1" } },
  spacer: { width: 400, height: 20, props: { bgColor: "transparent" } },
  shape: { width: 100, height: 100, props: { shapeType: "rectangle", fillColor: "#3b82f6", strokeColor: "transparent", strokeWidth: 0 } },
  patientData: { width: 600, height: 120, props: { patientName: "John Doe", age: "45", gender: "Male", patientId: "UHID-123456", sampleId: "SID-7890", referredBy: "Dr. Smith", registrationDate: "2025-01-01", labelColor: "#64748b", valueColor: "#0f172a", borderColor: "#cbd5e1", bgColor: "#f8fafc", padding: 12, fontSize: 11, gridColumns: 2 } },
};



//existing above are for report builder

export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  LAB_OWNER: 'LAB_OWNER',
  TECHNICIAN: 'TECHNICIAN',
  RECEPTIONIST: 'RECEPTIONIST',
} as const;

export const SUBSCRIPTION_STATUS = {
  TRIAL: 'TRIAL',
  ACTIVE: 'ACTIVE',
  PAST_DUE: 'PAST_DUE',
  CANCELLED: 'CANCELLED',
  EXPIRED: 'EXPIRED',
} as const;

export const PAYMENT_STATUS = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED',
} as const;

export const TEST_STATUS = {
  PENDING: 'PENDING',
  SCHEDULED: 'SCHEDULED',
  SAMPLE_COLLECTED: 'SAMPLE_COLLECTED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  APPROVED: 'APPROVED',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
} as const;

export const BILLING_CYCLES = [
  { value: 'MONTHLY', label: 'Monthly', months: 1 },
  { value: 'QUARTERLY', label: 'Quarterly', months: 3 },
  { value: 'YEARLY', label: 'Yearly', months: 12 },
];

export const TICKET_STATUS = {
  OPEN: 'OPEN',
  IN_PROGRESS: 'IN_PROGRESS',
  WAITING_FOR_CUSTOMER: 'WAITING_FOR_CUSTOMER',
  RESOLVED: 'RESOLVED',
  CLOSED: 'CLOSED',
} as const;

export const TICKET_PRIORITY = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  URGENT: 'URGENT',
} as const;

export const OTP_EXPIRY_MINUTES = 10;
export const TRIAL_PERIOD_DAYS = 14;
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export const DASHBOARD_ROUTES = {
  SUPER_ADMIN: '/admin',
  LAB_OWNER: '/workspace',
  TECHNICIAN: '/technician',
  RECEPTIONIST: '/receptionist',
};






