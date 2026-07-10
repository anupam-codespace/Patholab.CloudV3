import type { Config, ComponentConfig } from "@measured/puck";
import React from "react";

// ============================================================================
// 1. SHARED TYPES & UTILITIES
// ============================================================================

// Base interface for properties that govern absolute positioning
interface LayoutProps {
  isAbsolute: boolean;
  xPos: number;
  yPos: number;
  width: string;
  height: string;
  zIndex: number;
  rotation: number;
}

// Reusable Puck fields for layout control
const LayoutFields = {
  isAbsolute: {
    type: "radio" as const,
    label: "Positioning Mode",
    options: [
      { label: "Flow (Inline)", value: false },
      { label: "Free Drag (Absolute)", value: true },
    ],
  },
  xPos: { type: "number" as const, label: "X Position (px)" },
  yPos: { type: "number" as const, label: "Y Position (px)" },
  width: { type: "text" as const, label: "Width (e.g., 100%, 200px)" },
  height: { type: "text" as const, label: "Height (e.g., auto, 150px)" },
  zIndex: { type: "number" as const, label: "Layer Order (Z-Index)" },
  rotation: { type: "number" as const, label: "Rotation (Degrees)" },
};

// Helper function to apply layout styles to the component's outer div
const applyLayoutStyles = (props: LayoutProps): React.CSSProperties => {
  if (!props.isAbsolute) return {};
  return {
    position: "absolute",
    left: `${props.xPos}px`,
    top: `${props.yPos}px`,
    width: props.width || "auto",
    height: props.height || "auto",
    zIndex: props.zIndex || 1,
    transform: `rotate(${props.rotation || 0}deg)`,
  };
};

// ============================================================================
// 2. ROOT SETTINGS (The Master Page Config)
// ============================================================================

export type RootProps = {
  // Dimensions & Margins
  pageWidth: string;
  pageHeight: string;
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;

  // Background & Borders
  backgroundColor: string;
  borderShow: boolean;
  borderWidth: number;
  borderColor: string;
  borderStyle: "solid" | "dashed" | "dotted";
  borderRadius: number;

  // Watermark
  watermarkUrl: string;
  watermarkOpacity: number;
  watermarkSize: string; // "contain", "cover", or percentage

  // Global Typography
  globalFontFamily: string;
  globalFontSize: number;
  globalTextColor: string;

  // Print Specifics
  showPageNumbers: boolean;
  pageNumberPosition: "bottom-right" | "bottom-center" | "bottom-left";
};

// ============================================================================
// 3. COMPONENT PROP TYPES
// ============================================================================

type Props = {
  LabHeader: LayoutProps & {
    labName: string;
    tagline: string;
    logoUrl: string;
    logoSize: number;
    logoPosition: "left" | "right" | "center";
    themeColor: string;
    textColor: string;
    showSeparator: boolean;
    headerHeight: number;
  };
  PatientDemographics: LayoutProps & {
    showBarcode: boolean;
    barcodeValue: string;
    barcodePosition: "top-right" | "bottom" | "inline";
    gridColumns: 1 | 2 | 3 | 4;
    labelColor: string;
    valueColor: string;
    borderColor: string;
    bgColor: string;
    padding: number;
  };
  DynamicResultsTable: LayoutProps & {
    departmentName: string;
    headerBgColor: string;
    headerTextColor: string;
    rowBgColor: string;
    rowAlternateColor: string;
    borderColor: string;
    showUnits: boolean;
    showRefRange: boolean;
    showFlags: boolean; // e.g., High/Low indicators
  };
  RichTextBlock: LayoutProps & {
    content: string;
    fontSize: number;
    fontFamily: string;
    textAlign: "left" | "center" | "right" | "justify";
    textColor: string;
    bgColor: string;
    padding: number;
    borderRadius: number;
  };
  ImageElement: LayoutProps & {
    imageUrl: string;
    objectFit: "contain" | "cover" | "fill";
    opacity: number;
    borderColor: string;
    borderWidth: number;
    caption: string;
  };
  SignatureBlock: LayoutProps & {
    doctorName: string;
    designation: string;
    qualifications: string;
    signatureImageUrl: string;
    lineColor: string;
    alignText: "center" | "left" | "right";
  };
  QRCodeElement: LayoutProps & {
    dataString: string;
    size: number;
    fgColor: string;
    bgColor: string;
    showLabel: boolean;
    labelText: string;
  };
  LabFooter: LayoutProps & {
    disclaimerText: string;
    accreditationLogos: string; // Comma separated URLs
    footerBgColor: string;
    footerTextColor: string;
    isFixedBottom: boolean; // Always stick to bottom of print page
  };
  Shapes: LayoutProps & {
    shapeType: "rectangle" | "circle" | "line";
    fillColor: string;
    strokeColor: string;
    strokeWidth: number;
  };
};

// ============================================================================
// 4. MAIN CONFIGURATION OBJECT
// ============================================================================

export const config: Config<Props, RootProps> = {
  // --------------------------------------------------------------------------
  // ROOT (PAGE) SETTINGS
  // --------------------------------------------------------------------------
  root: {
    defaultProps: {
      pageWidth: "210mm", // Standard A4 Width
      pageHeight: "297mm", // Standard A4 Height
      marginTop: 15,
      marginBottom: 15,
      marginLeft: 15,
      marginRight: 15,
      backgroundColor: "#ffffff",
      borderShow: false,
      borderWidth: 1,
      borderColor: "#000000",
      borderStyle: "solid",
      borderRadius: 0,
      watermarkUrl: "",
      watermarkOpacity: 10,
      watermarkSize: "50%",
      globalFontFamily: "Arial, sans-serif",
      globalFontSize: 12,
      globalTextColor: "#334155",
      showPageNumbers: true,
      pageNumberPosition: "bottom-right",
    },
    fields: {
      pageWidth: { type: "text", label: "Page Width (e.g., 210mm)" },
      pageHeight: { type: "text", label: "Page Height (e.g., 297mm)" },
      marginTop: { type: "number", label: "Top Margin (mm)" },
      marginBottom: { type: "number", label: "Bottom Margin (mm)" },
      marginLeft: { type: "number", label: "Left Margin (mm)" },
      marginRight: { type: "number", label: "Right Margin (mm)" },
      backgroundColor: { type: "text", label: "Page Background Color" },
      borderShow: {
        type: "radio",
        label: "Show Page Border",
        options: [
          { label: "Yes", value: true },
          { label: "No", value: false },
        ],
      },
      borderWidth: { type: "number", label: "Border Thickness" },
      borderColor: { type: "text", label: "Border Color" },
      borderStyle: {
        type: "select",
        label: "Border Style",
        options: [
          { label: "Solid", value: "solid" },
          { label: "Dashed", value: "dashed" },
          { label: "Dotted", value: "dotted" },
        ],
      },
      borderRadius: { type: "number", label: "Border Radius (px)" },
      watermarkUrl: { type: "text", label: "Watermark Image URL" },
      watermarkOpacity: { type: "number", label: "Watermark Opacity (%)" },
      watermarkSize: {
        type: "text",
        label: "Watermark Size (e.g., 50% or contain)",
      },
      globalFontFamily: {
        type: "select",
        label: "Global Font",
        options: [
          { label: "Arial", value: "Arial, sans-serif" },
          { label: "Times New Roman", value: "'Times New Roman', serif" },
          { label: "Courier New", value: "'Courier New', monospace" },
        ],
      },
      globalFontSize: { type: "number", label: "Global Base Font Size (px)" },
      globalTextColor: { type: "text", label: "Global Text Color" },
      showPageNumbers: {
        type: "radio",
        label: "Show Page Numbers (Print)",
        options: [
          { label: "Yes", value: true },
          { label: "No", value: false },
        ],
      },
      pageNumberPosition: {
        type: "select",
        label: "Page Number Position",
        options: [
          { label: "Bottom Right", value: "bottom-right" },
          { label: "Bottom Center", value: "bottom-center" },
          { label: "Bottom Left", value: "bottom-left" },
        ],
      },
    },
    render: ({ children, ...props }) => {
      // The Root component wraps the entire canvas.
      // This styles the "paper" the user is working on.
      return (
        <div
          className="relative print:m-0 print:border-none print:shadow-none mx-auto bg-white shadow-xl overflow-hidden"
          style={{
            width: props.pageWidth,
            minHeight: props.pageHeight,
            paddingTop: `${props.marginTop}mm`,
            paddingBottom: `${props.marginBottom}mm`,
            paddingLeft: `${props.marginLeft}mm`,
            paddingRight: `${props.marginRight}mm`,
            backgroundColor: props.backgroundColor,
            fontFamily: props.globalFontFamily,
            fontSize: `${props.globalFontSize}px`,
            color: props.globalTextColor,
            // Apply Border if enabled
            border: props.borderShow
              ? `${props.borderWidth}px ${props.borderStyle} ${props.borderColor}`
              : "none",
            borderRadius: `${props.borderRadius}px`,
          }}>
          {/* Watermark Layer */}
          {props.watermarkUrl && (
            <div
              className="absolute inset-0 pointer-events-none z-0 flex items-center justify-center"
              style={{ opacity: props.watermarkOpacity / 100 }}>
              <img
                src={props.watermarkUrl}
                alt="Watermark"
                style={{
                  maxWidth: "100%",
                  maxHeight: "100%",
                  objectFit: (props.watermarkSize as any) || "contain",
                }}
              />
            </div>
          )}

          {/* Main Content Area (Where droppable zones go) */}
          <div className="relative z-10 w-full h-full min-h-[500px]">
            {children}
          </div>

          {/* Page Numbers (CSS Counters for Print) */}
          {props.showPageNumbers && (
            <div
              className="absolute text-[10px] text-slate-500 print-page-number z-50 hidden print:block"
              style={{
                bottom: `${props.marginBottom}mm`,
                left:
                  props.pageNumberPosition === "bottom-left"
                    ? `${props.marginLeft}mm`
                    : props.pageNumberPosition === "bottom-center"
                      ? "50%"
                      : "auto",
                right:
                  props.pageNumberPosition === "bottom-right"
                    ? `${props.marginRight}mm`
                    : "auto",
                transform:
                  props.pageNumberPosition === "bottom-center"
                    ? "translateX(-50%)"
                    : "none",
              }}>
              {/* CSS counter will inject "Page 1 of X" here during print */}
              Page <span className="page-num"></span>
            </div>
          )}
        </div>
      );
    },
  },

  // --------------------------------------------------------------------------
  // COMPONENTS (THE BUILDING BLOCKS)
  // --------------------------------------------------------------------------
  components: {
    // ==========================================
    // 1. LAB HEADER
    // ==========================================
    LabHeader: {
      label: "Header",
      category: "Structure",
      defaultProps: {
        isAbsolute: false,
        xPos: 0,
        yPos: 0,
        width: "100%",
        height: "auto",
        zIndex: 10,
        rotation: 0,
        labName: "Global Pathology Lab",
        tagline: "Precision & Care",
        logoUrl: "",
        logoSize: 60,
        logoPosition: "left",
        themeColor: "#1e3a8a",
        textColor: "#1e293b",
        showSeparator: true,
        headerHeight: 100,
      },
      fields: {
        ...LayoutFields,
        labName: { type: "text", label: "Lab Name" },
        tagline: { type: "text", label: "Tagline" },
        logoUrl: { type: "text", label: "Logo URL" },
        logoSize: { type: "number", label: "Logo Size (px)" },
        logoPosition: {
          type: "select",
          label: "Logo Position",
          options: [
            { label: "Left", value: "left" },
            { label: "Center", value: "center" },
            { label: "Right", value: "right" },
          ],
        },
        themeColor: { type: "text", label: "Theme Color (Hex)" },
        textColor: { type: "text", label: "Text Color (Hex)" },
        showSeparator: {
          type: "radio",
          label: "Show Bottom Line",
          options: [
            { label: "Yes", value: true },
            { label: "No", value: false },
          ],
        },
        headerHeight: { type: "number", label: "Min Height (px)" },
      },
      render: (props) => {
        const layoutStyle = applyLayoutStyles(props);
        return (
          <div
            style={{
              ...layoutStyle,
              minHeight: `${props.headerHeight}px`,
              borderBottom: props.showSeparator
                ? `3px solid ${props.themeColor}`
                : "none",
              color: props.textColor,
            }}
            className={`flex items-center w-full pb-4 mb-4 ${
              props.logoPosition === "center"
                ? "flex-col text-center"
                : props.logoPosition === "right"
                  ? "flex-row-reverse text-right"
                  : "flex-row text-left"
            }`}>
            {props.logoUrl ? (
              <img
                src={props.logoUrl}
                alt="Logo"
                style={{ height: `${props.logoSize}px`, width: "auto" }}
                className="mx-4 object-contain"
              />
            ) : (
              <div
                style={{
                  height: `${props.logoSize}px`,
                  width: `${props.logoSize}px`,
                }}
                className="mx-4 bg-slate-100 border border-slate-300 flex items-center justify-center text-slate-400 text-xs rounded">
                LOGO
              </div>
            )}
            <div className="flex-1 px-4">
              <h1
                style={{ color: props.themeColor }}
                className="text-3xl font-bold uppercase tracking-wider m-0">
                {props.labName}
              </h1>
              <p className="text-sm font-medium mt-1 m-0 opacity-80">
                {props.tagline}
              </p>
            </div>
          </div>
        );
      },
    },

    // ==========================================
    // 2. PATIENT DEMOGRAPHICS
    // ==========================================
    PatientDemographics: {
      label: "Patient Info",
      category: "Data Blocks",
      defaultProps: {
        isAbsolute: false,
        xPos: 0,
        yPos: 0,
        width: "100%",
        height: "auto",
        zIndex: 10,
        rotation: 0,
        showBarcode: true,
        barcodeValue: "{{sample.barcode}}",
        barcodePosition: "top-right",
        gridColumns: 2,
        labelColor: "#64748b",
        valueColor: "#0f172a",
        borderColor: "#cbd5e1",
        bgColor: "#f8fafc",
        padding: 12,
      },
      fields: {
        ...LayoutFields,
        showBarcode: {
          type: "radio",
          label: "Show Barcode",
          options: [
            { label: "Yes", value: true },
            { label: "No", value: false },
          ],
        },
        barcodePosition: {
          type: "select",
          label: "Barcode Position",
          options: [
            { label: "Top Right", value: "top-right" },
            { label: "Bottom", value: "bottom" },
            { label: "Inline", value: "inline" },
          ],
        },
        gridColumns: { type: "number", label: "Grid Columns (1-4)" },
        labelColor: { type: "text", label: "Label Text Color" },
        valueColor: { type: "text", label: "Value Text Color" },
        borderColor: { type: "text", label: "Box Border Color" },
        bgColor: { type: "text", label: "Box Background Color" },
        padding: { type: "number", label: "Padding (px)" },
      },
      render: (props) => {
        const layoutStyle = applyLayoutStyles(props);
        const gridColsClass = `grid-cols-${Math.max(1, Math.min(4, props.gridColumns))}`; // Ensure 1-4

        return (
          <div
            style={{
              ...layoutStyle,
              borderColor: props.borderColor,
              backgroundColor: props.bgColor,
              padding: `${props.padding}px`,
            }}
            className="border rounded-lg mb-6 relative w-full">
            {props.showBarcode && props.barcodePosition === "top-right" && (
              <div className="absolute top-2 right-4 flex flex-col items-center">
                <div className="h-10 w-32 border border-slate-300 bg-white flex items-center justify-center text-slate-400 text-xs">
                  Barcode Area
                </div>
                <span className="text-[9px] mt-1 font-mono text-slate-500">
                  {props.barcodeValue}
                </span>
              </div>
            )}

            <div className={`grid ${gridColsClass} gap-y-3 gap-x-6 w-[85%]`}>
              <div className="flex flex-col">
                <span
                  style={{ color: props.labelColor }}
                  className="text-xs font-semibold uppercase">
                  Patient Name
                </span>
                <span
                  style={{ color: props.valueColor }}
                  className="text-sm font-bold">
                  {"{{patient.name}}"}
                </span>
              </div>
              <div className="flex flex-col">
                <span
                  style={{ color: props.labelColor }}
                  className="text-xs font-semibold uppercase">
                  Age / Gender
                </span>
                <span
                  style={{ color: props.valueColor }}
                  className="text-sm font-bold">
                  {"{{patient.age}} / {{patient.gender}}"}
                </span>
              </div>
              <div className="flex flex-col">
                <span
                  style={{ color: props.labelColor }}
                  className="text-xs font-semibold uppercase">
                  Patient ID (UHID)
                </span>
                <span
                  style={{ color: props.valueColor }}
                  className="text-sm font-bold">
                  {"{{patient.uhid}}"}
                </span>
              </div>
              <div className="flex flex-col">
                <span
                  style={{ color: props.labelColor }}
                  className="text-xs font-semibold uppercase">
                  Sample ID (SID)
                </span>
                <span
                  style={{ color: props.valueColor }}
                  className="text-sm font-bold">
                  {"{{sample.id}}"}
                </span>
              </div>
              <div className="flex flex-col">
                <span
                  style={{ color: props.labelColor }}
                  className="text-xs font-semibold uppercase">
                  Referred By
                </span>
                <span
                  style={{ color: props.valueColor }}
                  className="text-sm font-bold">
                  {"{{sample.referredBy}}"}
                </span>
              </div>
              <div className="flex flex-col">
                <span
                  style={{ color: props.labelColor }}
                  className="text-xs font-semibold uppercase">
                  Registration Date
                </span>
                <span
                  style={{ color: props.valueColor }}
                  className="text-sm font-bold">
                  {"{{sample.date}}"}
                </span>
              </div>
            </div>

            {props.showBarcode && props.barcodePosition === "bottom" && (
              <div className="mt-4 pt-4 border-t border-slate-200 flex flex-col items-center">
                <div className="h-12 w-48 border border-slate-300 bg-white flex items-center justify-center text-slate-400 text-xs">
                  Barcode Area
                </div>
              </div>
            )}
          </div>
        );
      },
    },

    // ==========================================
    // 3. DYNAMIC RESULTS TABLE
    // ==========================================
    DynamicResultsTable: {
      label: "Results Table",
      category: "Data Blocks",
      defaultProps: {
        isAbsolute: false,
        xPos: 0,
        yPos: 0,
        width: "100%",
        height: "auto",
        zIndex: 10,
        rotation: 0,
        departmentName: "BIOCHEMISTRY",
        headerBgColor: "#f1f5f9",
        headerTextColor: "#0f172a",
        rowBgColor: "#ffffff",
        rowAlternateColor: "#f8fafc",
        borderColor: "#cbd5e1",
        showUnits: true,
        showRefRange: true,
        showFlags: true,
      },
      fields: {
        ...LayoutFields,
        departmentName: { type: "text", label: "Department Placeholder" },
        headerBgColor: { type: "text", label: "Header BG Color" },
        headerTextColor: { type: "text", label: "Header Text Color" },
        rowBgColor: { type: "text", label: "Row BG Color" },
        rowAlternateColor: { type: "text", label: "Alternate Row Color" },
        borderColor: { type: "text", label: "Table Border Color" },
        showUnits: {
          type: "radio",
          label: "Show Unit Column",
          options: [
            { label: "Yes", value: true },
            { label: "No", value: false },
          ],
        },
        showRefRange: {
          type: "radio",
          label: "Show Ref Range Column",
          options: [
            { label: "Yes", value: true },
            { label: "No", value: false },
          ],
        },
        showFlags: {
          type: "radio",
          label: "Show H/L Flags",
          options: [
            { label: "Yes", value: true },
            { label: "No", value: false },
          ],
        },
      },
      render: (props) => {
        const layoutStyle = applyLayoutStyles(props);
        return (
          <div style={layoutStyle} className="w-full mb-8 break-inside-avoid">
            {/* Dept Header */}
            {props.departmentName && (
              <div
                style={{
                  backgroundColor: props.headerBgColor,
                  color: props.headerTextColor,
                  borderTop: `1px solid ${props.borderColor}`,
                  borderBottom: `1px solid ${props.borderColor}`,
                }}
                className="py-1 px-4 text-xs font-bold tracking-widest uppercase text-center mb-4">
                {props.departmentName}
              </div>
            )}

            {/* Table */}
            <table
              className="w-full border-collapse text-sm"
              style={{ border: `1px solid ${props.borderColor}` }}>
              <thead>
                <tr
                  style={{
                    backgroundColor: props.headerBgColor,
                    color: props.headerTextColor,
                  }}>
                  <th
                    style={{ borderBottom: `2px solid ${props.borderColor}` }}
                    className="p-2 text-left font-semibold">
                    Test Parameter
                  </th>
                  <th
                    style={{ borderBottom: `2px solid ${props.borderColor}` }}
                    className="p-2 text-left font-semibold">
                    Result
                  </th>
                  {props.showFlags && (
                    <th
                      style={{ borderBottom: `2px solid ${props.borderColor}` }}
                      className="p-2 text-center font-semibold">
                      Flag
                    </th>
                  )}
                  {props.showUnits && (
                    <th
                      style={{ borderBottom: `2px solid ${props.borderColor}` }}
                      className="p-2 text-left font-semibold">
                      Unit
                    </th>
                  )}
                  {props.showRefRange && (
                    <th
                      style={{ borderBottom: `2px solid ${props.borderColor}` }}
                      className="p-2 text-left font-semibold">
                      Biological Ref. Range
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {/* Mock Data for visual building */}
                <tr
                  style={{
                    backgroundColor: props.rowBgColor,
                    borderBottom: `1px solid ${props.borderColor}`,
                  }}>
                  <td className="p-2">Serum Creatinine</td>
                  <td className="p-2 font-bold text-red-600">1.8</td>
                  {props.showFlags && (
                    <td className="p-2 text-center font-bold text-red-600">
                      High
                    </td>
                  )}
                  {props.showUnits && (
                    <td className="p-2 text-slate-600">mg/dL</td>
                  )}
                  {props.showRefRange && (
                    <td className="p-2 text-slate-600">0.7 - 1.3</td>
                  )}
                </tr>
                <tr
                  style={{
                    backgroundColor: props.rowAlternateColor,
                    borderBottom: `1px solid ${props.borderColor}`,
                  }}>
                  <td className="p-2">Urea</td>
                  <td className="p-2 font-bold">25.0</td>
                  {props.showFlags && (
                    <td className="p-2 text-center text-slate-400">-</td>
                  )}
                  {props.showUnits && (
                    <td className="p-2 text-slate-600">mg/dL</td>
                  )}
                  {props.showRefRange && (
                    <td className="p-2 text-slate-600">10.0 - 50.0</td>
                  )}
                </tr>
              </tbody>
            </table>
            <div className="mt-2 text-center text-[10px] text-slate-400 italic font-mono">
              [Dynamic Area: In production, this table maps to actual patient
              TestResults]
            </div>
          </div>
        );
      },
    },

    // ==========================================
    // 4. RICH TEXT (HTML)
    // ==========================================
    RichTextBlock: {
      label: "Text / HTML",
      category: "Typography",
      defaultProps: {
        isAbsolute: false,
        xPos: 0,
        yPos: 0,
        width: "100%",
        height: "auto",
        zIndex: 10,
        rotation: 0,
        content: "Enter your text here...",
        fontSize: 12,
        fontFamily: "inherit",
        textAlign: "left",
        textColor: "inherit",
        bgColor: "transparent",
        padding: 0,
        borderRadius: 0,
      },
      fields: {
        ...LayoutFields,
        content: { type: "textarea", label: "Text/HTML Content" },
        fontSize: { type: "number", label: "Font Size (px)" },
        fontFamily: { type: "text", label: "Font Family (e.g. Courier)" },
        textAlign: {
          type: "select",
          label: "Alignment",
          options: [
            { label: "Left", value: "left" },
            { label: "Center", value: "center" },
            { label: "Right", value: "right" },
            { label: "Justify", value: "justify" },
          ],
        },
        textColor: { type: "text", label: "Text Color" },
        bgColor: { type: "text", label: "Background Color" },
        padding: { type: "number", label: "Padding (px)" },
        borderRadius: { type: "number", label: "Border Radius (px)" },
      },
      render: (props) => {
        const layoutStyle = applyLayoutStyles(props);
        return (
          <div
            style={{
              ...layoutStyle,
              fontSize: `${props.fontSize}px`,
              fontFamily:
                props.fontFamily === "inherit" ? undefined : props.fontFamily,
              textAlign: props.textAlign,
              color: props.textColor,
              backgroundColor: props.bgColor,
              padding: `${props.padding}px`,
              borderRadius: `${props.borderRadius}px`,
            }}
            dangerouslySetInnerHTML={{ __html: props.content }}
          />
        );
      },
    },

    // ==========================================
    // 5. IMAGE ELEMENT
    // ==========================================
    ImageElement: {
      label: "Image / Logo",
      category: "Media",
      defaultProps: {
        isAbsolute: true,
        xPos: 50,
        yPos: 50,
        width: "150px",
        height: "auto",
        zIndex: 10,
        rotation: 0,
        imageUrl: "https://via.placeholder.com/150",
        objectFit: "contain",
        opacity: 100,
        borderColor: "transparent",
        borderWidth: 0,
        caption: "",
      },
      fields: {
        ...LayoutFields,
        imageUrl: { type: "text", label: "Image URL" },
        objectFit: {
          type: "select",
          label: "Image Fit",
          options: [
            { label: "Contain", value: "contain" },
            { label: "Cover", value: "cover" },
            { label: "Fill", value: "fill" },
          ],
        },
        opacity: { type: "number", label: "Opacity (%)" },
        borderWidth: { type: "number", label: "Border Width (px)" },
        borderColor: { type: "text", label: "Border Color" },
        caption: { type: "text", label: "Optional Caption" },
      },
      render: (props) => {
        const layoutStyle = applyLayoutStyles(props);
        return (
          <div style={layoutStyle} className="flex flex-col items-center">
            <img
              src={props.imageUrl}
              alt="Custom"
              style={{
                width: "100%",
                height: "100%",
                objectFit: props.objectFit,
                opacity: props.opacity / 100,
                border: `${props.borderWidth}px solid ${props.borderColor}`,
              }}
            />
            {props.caption && (
              <span className="text-[10px] mt-1 text-slate-500">
                {props.caption}
              </span>
            )}
          </div>
        );
      },
    },

    // ==========================================
    // 6. SIGNATURE BLOCK
    // ==========================================
    SignatureBlock: {
      label: "Signature",
      category: "Structure",
      defaultProps: {
        isAbsolute: true,
        xPos: 400,
        yPos: 700,
        width: "200px",
        height: "auto",
        zIndex: 10,
        rotation: 0,
        doctorName: "Dr. John Doe",
        designation: "Chief Pathologist",
        qualifications: "MD (Pathology)",
        signatureImageUrl: "",
        lineColor: "#cbd5e1",
        alignText: "center",
      },
      fields: {
        ...LayoutFields,
        doctorName: { type: "text", label: "Signatory Name" },
        designation: { type: "text", label: "Designation" },
        qualifications: { type: "text", label: "Qualifications" },
        signatureImageUrl: { type: "text", label: "Signature Image URL" },
        lineColor: { type: "text", label: "Divider Line Color" },
        alignText: {
          type: "select",
          label: "Text Alignment",
          options: [
            { label: "Left", value: "left" },
            { label: "Center", value: "center" },
            { label: "Right", value: "right" },
          ],
        },
      },
      render: (props) => {
        const layoutStyle = applyLayoutStyles(props);
        return (
          <div
            style={{ ...layoutStyle, textAlign: props.alignText }}
            className="flex flex-col">
            <div
              className={`h-16 w-full flex mb-2 ${props.alignText === "center" ? "justify-center" : props.alignText === "right" ? "justify-end" : "justify-start"}`}>
              {props.signatureImageUrl ? (
                <img
                  src={props.signatureImageUrl}
                  alt="Signature"
                  className="h-full w-auto object-contain"
                />
              ) : (
                <div className="w-[80%] h-full border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-[10px] text-slate-400">
                  Signature Image Area
                </div>
              )}
            </div>
            <div
              style={{ borderTop: `1px solid ${props.lineColor}` }}
              className="pt-2 w-full">
              <p className="font-bold text-sm m-0 text-slate-800">
                {props.doctorName}
              </p>
              {props.qualifications && (
                <p className="text-[10px] m-0 text-slate-600">
                  {props.qualifications}
                </p>
              )}
              {props.designation && (
                <p className="text-[11px] mt-1 font-semibold uppercase text-slate-700">
                  {props.designation}
                </p>
              )}
            </div>
          </div>
        );
      },
    },

    // ==========================================
    // 7. QR CODE
    // ==========================================
    QRCodeElement: {
      label: "QR Code",
      category: "Media",
      defaultProps: {
        isAbsolute: true,
        xPos: 50,
        yPos: 50,
        width: "80px",
        height: "80px",
        zIndex: 10,
        rotation: 0,
        dataString: "https://patholab.cloud/verify/{{sample.id}}",
        size: 80,
        fgColor: "#000000",
        bgColor: "#ffffff",
        showLabel: true,
        labelText: "Scan to Verify",
      },
      fields: {
        ...LayoutFields,
        dataString: { type: "text", label: "QR Data (Supports {{tags}})" },
        size: { type: "number", label: "Size (px)" },
        fgColor: { type: "text", label: "Foreground Color" },
        bgColor: { type: "text", label: "Background Color" },
        showLabel: {
          type: "radio",
          label: "Show Label",
          options: [
            { label: "Yes", value: true },
            { label: "No", value: false },
          ],
        },
        labelText: { type: "text", label: "Label Text" },
      },
      render: (props) => {
        const layoutStyle = applyLayoutStyles(props);
        return (
          <div style={layoutStyle} className="flex flex-col items-center">
            {/* Placeholder for visual builder. Real implementation would use qrcode library */}
            <div
              style={{
                width: `${props.size}px`,
                height: `${props.size}px`,
                backgroundColor: props.bgColor,
                color: props.fgColor,
                border: "1px solid #e2e8f0",
              }}
              className="flex items-center justify-center relative overflow-hidden p-1">
              <i
                className="fa fa-qrcode"
                style={{ fontSize: `${props.size * 0.8}px` }}></i>
            </div>
            {props.showLabel && (
              <span className="text-[9px] mt-1 font-bold text-slate-500 uppercase tracking-widest">
                {props.labelText}
              </span>
            )}
          </div>
        );
      },
    },

    // ==========================================
    // 8. LAB FOOTER
    // ==========================================
    LabFooter: {
      label: "Page Footer",
      category: "Structure",
      defaultProps: {
        isAbsolute: false,
        xPos: 0,
        yPos: 0,
        width: "100%",
        height: "auto",
        zIndex: 10,
        rotation: 0,
        disclaimerText:
          "*** End of Report ***\nThis is an electronically generated report.",
        accreditationLogos: "",
        footerBgColor: "transparent",
        footerTextColor: "#64748b",
        isFixedBottom: true,
      },
      fields: {
        ...LayoutFields,
        disclaimerText: { type: "textarea", label: "Disclaimer Text" },
        accreditationLogos: { type: "text", label: "Footer Image/Logos URL" },
        footerBgColor: { type: "text", label: "Background Color" },
        footerTextColor: { type: "text", label: "Text Color" },
        isFixedBottom: {
          type: "radio",
          label: "Fix to Bottom of Page",
          options: [
            { label: "Yes", value: true },
            { label: "No", value: false },
          ],
        },
      },
      render: (props) => {
        let layoutStyle = applyLayoutStyles(props);
        // If it's fixed bottom, override standard inline layout to stick to the bottom of the container
        if (!props.isAbsolute && props.isFixedBottom) {
          layoutStyle = {
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            width: "100%",
          };
        }

        return (
          <div
            style={{
              ...layoutStyle,
              backgroundColor: props.footerBgColor,
              color: props.footerTextColor,
            }}
            className="w-full pt-4 border-t border-slate-200 mt-8 pb-4 flex flex-col items-center justify-center text-center">
            {props.accreditationLogos && (
              <img
                src={props.accreditationLogos}
                alt="Accreditations"
                className="max-h-12 mb-3 object-contain"
              />
            )}
            <p className="text-[10px] m-0 whitespace-pre-wrap leading-relaxed opacity-80">
              {props.disclaimerText}
            </p>
          </div>
        );
      },
    },

    // ==========================================
    // 9. SHAPES / DIVIDERS
    // ==========================================
    Shapes: {
      label: "Shape / Divider",
      category: "Media",
      defaultProps: {
        isAbsolute: true,
        xPos: 100,
        yPos: 100,
        width: "200px",
        height: "2px",
        zIndex: 5,
        rotation: 0,
        shapeType: "rectangle",
        fillColor: "#1e3a8a",
        strokeColor: "transparent",
        strokeWidth: 0,
      },
      fields: {
        ...LayoutFields,
        shapeType: {
          type: "select",
          label: "Shape Type",
          options: [
            { label: "Rectangle/Line", value: "rectangle" },
            { label: "Circle", value: "circle" },
          ],
        },
        fillColor: { type: "text", label: "Fill Color" },
        strokeColor: { type: "text", label: "Border Color" },
        strokeWidth: { type: "number", label: "Border Width" },
      },
      render: (props) => {
        const layoutStyle = applyLayoutStyles(props);
        return (
          <div
            style={{
              ...layoutStyle,
              backgroundColor: props.fillColor,
              border: `${props.strokeWidth}px solid ${props.strokeColor}`,
              borderRadius: props.shapeType === "circle" ? "50%" : "0",
            }}
          />
        );
      },
    },
  },
};
