// ─────────────────────────────────────────────────────────────
// 1. ELEMENT TYPES
// ─────────────────────────────────────────────────────────────

/**
 * Base properties shared by ALL elements.
 */
export interface BaseElement {
  id: string;
  type: ElementType;
  name: string; // user‑friendly label for layers

  // Position and size
  x: number;
  y: number;
  width: number;
  height: number;

  // Transform
  rotation: number; // degrees
  opacity: number; // 0‑1
  visible: boolean;
  locked: boolean;

  // Layer order
  zIndex: number;

  // Grouping support (future)
  groupId?: string;
  parentId?: string; // for nesting

  // Constraints (for resize behaviour)
  constraints?: {
    keepRatio?: boolean; // maintain aspect ratio
    lockAspect?: boolean;
    minWidth?: number;
    maxWidth?: number;
    minHeight?: number;
    maxHeight?: number;
  };

  // Metadata
  createdAt?: number;
  updatedAt?: number;
}

export type ElementType =
  | "text"
  | "image"
  | "qr"
  | "barcode"
  | "table"
  | "signature"
  | "spacer"
  | "shape"
  | "patientData";

// ─── Text Element ──────────────────────────────────────────────
export interface TextElement extends BaseElement {
  type: "text";
  content: string; // HTML from TipTap / Lexical
  fontSize: number;
  fontFamily: string;
  color: string;
  bgColor?: string;
  textAlign: "left" | "center" | "right" | "justify";
  lineHeight: number;
  letterSpacing: number;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  textTransform?: "none" | "uppercase" | "lowercase" | "capitalize";
  verticalAlign?: "top" | "middle" | "bottom";
  padding: number;
  border?: {
    width: number;
    color: string;
    radius: number;
  };
  shadow?: {
    x: number;
    y: number;
    blur: number;
    color: string;
  };
}

// ─── Image Element ─────────────────────────────────────────────
export interface ImageElement extends BaseElement {
  type: "image";
  src: string;
  objectFit: "contain" | "cover" | "fill" | "none" | "scale-down";
  crop?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  flipX: boolean;
  flipY: boolean;
  brightness: number; // 0‑100
  contrast: number; // 0‑100
  saturation: number; // 0‑100
  border?: {
    width: number;
    color: string;
    radius: number;
  };
  shadow?: {
    x: number;
    y: number;
    blur: number;
    color: string;
  };
}

// ─── QR Code Element ───────────────────────────────────────────
export interface QRElement extends BaseElement {
  type: "qr";
  data: string; // can contain {{variables}}
  fgColor: string;
  bgColor: string;
  showPageNumber: boolean;
  template?: string; // e.g., "patient", "report", "barcode"
}

// ─── Barcode Element ───────────────────────────────────────────
export interface BarcodeElement extends BaseElement {
  type: "barcode";
  value: string;
  format?: "CODE128" | "EAN13" | "UPC" | "ITF" | "CODE39";
  scale: number;
  displayValue: boolean;
  fontSize?: number;
  margin?: number;
  background?: string;
  // height is inherited from BaseElement
}

// ─── Table Element ─────────────────────────────────────────────
export interface Column {
  id: string;
  title: string;
  width: number; // percentage or pixel
}

export interface Row {
  id: string;
  cells: string[]; // content of each cell
}

export interface TableElement extends BaseElement {
  type: "table";
  columns: Column[];
  rows: Row[];
  headerBgColor: string;
  headerTextColor: string;
  rowBgColor: string;
  rowAlternateColor: string;
  borderColor: string;
  cellPadding: number;
  fontSize?: number;
  fontFamily?: string;
}

// ─── Signature Element ─────────────────────────────────────────
export interface SignatureElement extends BaseElement {
  type: "signature";
  name: string;
  designation: string;
  qualifications: string;
  imageUrl?: string;
  lineColor: string;
  lineWidth?: number;
}

// ─── Spacer Element ────────────────────────────────────────────
export interface SpacerElement extends BaseElement {
  type: "spacer";
  bgColor: string;
  // height is inherited from BaseElement
}

// ─── Shape Element (for future) ───────────────────────────────
export interface ShapeElement extends BaseElement {
  type: "shape";
  shapeType: "rectangle" | "circle" | "line" | "arrow" | "divider";
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
  radius?: number; // for rounded rectangles
}

// ─── Discriminated union of all element types ──────────────────
export type Element =
  | TextElement
  | ImageElement
  | QRElement
  | BarcodeElement
  | TableElement
  | SignatureElement
  | SpacerElement
  | ShapeElement;

// ─────────────────────────────────────────────────────────────
// 2. PAGE & DOCUMENT
// ─────────────────────────────────────────────────────────────

export interface Page {
  id: string;
  name: string; // e.g., "Page 1"
  width: number;
  height: number;
  background: string; // color or image URL
  margin: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  elements: Element[];
}

export interface Template {
  id: string;
  name: string;
  pages: Page[];
  thumbnail?: string;
}

export interface EditorDocument {
  pages: Page[];
  templates?: Template[]; // for later
}

// ─────────────────────────────────────────────────────────────
// 3. HISTORY (undo/redo)
// ─────────────────────────────────────────────────────────────

export interface HistoryState {
  past: EditorDocument[];
  future: EditorDocument[];
}

// ─────────────────────────────────────────────────────────────
// 4. CLIPBOARD
// ─────────────────────────────────────────────────────────────

export interface ClipboardItem {
  elements: Element[];
  copiedAt: number;
}

// ─────────────────────────────────────────────────────────────
// 5. EDITOR SETTINGS
// ─────────────────────────────────────────────────────────────

export interface EditorSettings {
  snap: boolean;
  grid: boolean;
  gridSize: number;
  showRulers: boolean;
  showGuides: boolean;
  showMargins: boolean;
  autoSave: boolean;
  autoSaveInterval: number; // seconds
}

// ─────────────────────────────────────────────────────────────
// 6. SELECTION (UI state)
// ─────────────────────────────────────────────────────────────

export interface Selection {
  ids: string[];
  group?: boolean; // are the selected elements grouped?
}

// ─────────────────────────────────────────────────────────────
// 7. VIEWPORT (zoom & pan)
// ─────────────────────────────────────────────────────────────

export interface Viewport {
  zoom: number;
  panX: number;
  panY: number;
}

// ─────────────────────────────────────────────────────────────
// 8. MASTER EDITOR STATE
// ─────────────────────────────────────────────────────────────

export interface EditorState {
  // Persistent document data
  document: EditorDocument;

  // Active page (by id)
  activePageId: string;

  // Selection (transient UI state)
  selection: Selection;

  // Clipboard (transient)
  clipboard: ClipboardItem | null;

  // Viewport (transient)
  viewport: Viewport;

  // Editor settings (saved per user)
  settings: EditorSettings;

  // History (undo/redo)
  history: HistoryState;

  // Dirty flag (for save prompts)
  dirty: boolean;
}

export interface PatientDataElement extends BaseElement {
  type: "patientData";
  // Patient data fields
  patientName: string; // default "John Doe"
  age: string; // default "45"
  gender: string; // default "Male"
  patientId: string; // default "UHID-123456"
  sampleId: string; // default "SID-7890"
  referredBy: string; // default "Dr. Smith"
  registrationDate: string; // default "2025-01-01"

  // Visibility toggles
  showName: boolean;
  showAge: boolean;
  showGender: boolean;
  showPatientId: boolean;
  showSampleId: boolean;
  showReferredBy: boolean;
  showRegistrationDate: boolean;

  // Styling
  labelColor: string;
  valueColor: string;
  borderColor: string;
  bgColor: string;
  padding: number;
  fontSize: number;
  labelFontWeight: "normal" | "bold" | "light";
  valueFontWeight: "normal" | "bold" | "light";
  gridColumns: 2 | 3 | 4;
}


export interface Page {
  id: string;
  name: string;
  width: number;
  height: number;
  background: string;
  margin: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  elements: Element[];
  // New page settings
  watermark?: {
    url: string;
    opacity: number;
  };
  showPageNumbers?: boolean;
  showWatermark?: boolean;
    backgroundImage?: string; // URL of uploaded letterhead

}