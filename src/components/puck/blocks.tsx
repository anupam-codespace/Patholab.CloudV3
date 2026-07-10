// src/components/puck/blocks.tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { ComponentConfig } from "@measured/puck";
import QRCode from "qrcode";
import Barcode from "react-barcode";

// ------------------------------------------------------------------
// 1. CONTEXT for global settings (optional)
// ------------------------------------------------------------------
export const ReportConfigContext = createContext<any>(null);

export const ReportConfigProvider = ReportConfigContext.Provider;

export const useReportConfig = () => {
  const ctx = useContext(ReportConfigContext);
  if (!ctx)
    throw new Error(
      "useReportConfig must be used within a ReportConfigProvider",
    );
  return ctx;
};

// ------------------------------------------------------------------
// 2. ASYNC QR (used by the builder, not as a Puck block)
// ------------------------------------------------------------------
export const AsyncQRCode = ({
  value,
  size,
  showPageNumber,
}: {
  value: string;
  size: number;
  showPageNumber: boolean;
}) => {
  const [src, setSrc] = useState<string>("");

  useEffect(() => {
    QRCode.toDataURL(value, {
      margin: 0,
      width: size - 8,
      color: { dark: "#0f172a", light: "#ffffff" },
    })
      .then(setSrc)
      .catch(console.error);
  }, [value, size]);

  if (!src)
    return (
      <div
        style={{ width: size, height: size }}
        className="bg-slate-100 animate-pulse border shadow-sm"
      />
    );

  return (
    <div
      className="flex flex-col items-center bg-white p-1 border shadow-sm"
      style={{ width: size, height: size + (showPageNumber ? 15 : 0) }}>
      <img src={src} alt="QR" style={{ width: size - 8, height: size - 8 }} />
      {showPageNumber && (
        <span className="text-[8px] mt-1 font-bold text-slate-500 whitespace-nowrap">
          Page 1 of 1
        </span>
      )}
    </div>
  );
};

// ------------------------------------------------------------------
// 3. HEADER BLOCK
// ------------------------------------------------------------------
export interface HeaderProps {
  show: boolean;
  mode: "standard" | "html" | "image";
  title: string;
  subTitle: string;
  logoUrl: string;
  fullImage: string;
  html: string;
  height: number;
  primaryColor?: string; // from context or root
  secondaryColor?: string;
}

export const HeaderBlock: ComponentConfig<HeaderProps> = {
  label: "Header",
  fields: {
    show: { type: "boolean", label: "Show Header" },
    mode: {
      type: "select",
      label: "Mode",
      options: [
        { label: "Standard", value: "standard" },
        { label: "HTML", value: "html" },
        { label: "Image", value: "image" },
      ],
    },
    title: { type: "text", label: "Title" },
    subTitle: { type: "text", label: "Subtitle" },
    logoUrl: { type: "text", label: "Logo URL" },
    fullImage: { type: "text", label: "Full Image URL" },
    html: { type: "textarea", label: "HTML" },
    height: { type: "number", label: "Height (px)", min: 50, max: 400 },
  },
  defaultProps: {
    show: true,
    mode: "standard",
    title: "GLOBIZ PATHOLAB",
    subTitle: "Advanced Diagnostics Center",
    logoUrl: "",
    fullImage: "",
    html: "",
    height: 120,
  },
  render: (props) => {
    const config = useReportConfig();
    // Extract with defaults
    const {
      show = true,
      mode = "standard",
      title = "GLOBIZ PATHOLAB",
      subTitle = "Advanced Diagnostics Center",
      logoUrl = "",
      fullImage = "",
      html = "",
      height = 120,
    } = props;
    const primaryColor = config?.primaryColor || "#1e3a8a";
    const secondaryColor = config?.secondaryColor || "#475569";

    if (!show) return null;

    return (
      <div
        className={`w-full mb-4 pb-4 ${mode === "image" ? "" : "border-b-[3px]"}`}
        style={{ borderBottomColor: primaryColor }}>
        {mode === "image" ? (
          <div
            className="w-full bg-slate-100 flex items-center justify-center text-slate-400 overflow-hidden"
            style={{ height: `${height}px` }}>
            {fullImage ? (
              <img
                src={fullImage}
                className="w-full h-full object-cover"
                alt="Header"
              />
            ) : (
              "Header Image"
            )}
          </div>
        ) : mode === "html" ? (
          <div
            dangerouslySetInnerHTML={{
              __html:
                html ||
                "<div class='text-center py-4'>Custom HTML Header</div>",
            }}
          />
        ) : (
          <div className="flex items-center relative pr-[80px]">
            {logoUrl ? (
              <img src={logoUrl} className="h-16 object-contain" alt="Logo" />
            ) : (
              <div className="h-16 w-32 bg-slate-100 border rounded flex items-center justify-center text-xs text-slate-400">
                Logo
              </div>
            )}
            <div className="flex-1 px-4">
              <h1
                className="text-2xl font-bold uppercase tracking-wide"
                style={{ color: primaryColor }}>
                {title}
              </h1>
              <p
                className="text-sm font-medium"
                style={{ color: secondaryColor }}>
                {subTitle}
              </p>
            </div>
          </div>
        )}
      </div>
    );
  },
};

// ------------------------------------------------------------------
// 4. PATIENT BLOCK
// ------------------------------------------------------------------
export interface PatientProps {
  show: boolean;
  fontSize: number;
  barcodeShow: boolean;
  barcodePosition: "left" | "center" | "right";
  barcodeHeight: number;
  barcodeScale: number;
  showName: boolean;
  showPatientId: boolean;
  showSentBy: boolean;
  showAgeSex: boolean;
  showEmployeeId: boolean;
  showRefDoctor: boolean;
  showSampleCollection: boolean;
  showReportReleased: boolean;
  borderColor?: string;
  secondaryColor?: string;
  primaryColor?: string;
}

export const PatientBlock: ComponentConfig<PatientProps> = {
  label: "Patient Block",
  fields: {
    show: { type: "boolean", label: "Show Patient Block" },
    fontSize: { type: "number", label: "Font Size", min: 8, max: 18 },
    barcodeShow: { type: "boolean", label: "Show Barcode" },
    barcodePosition: {
      type: "select",
      label: "Barcode Position",
      options: [
        { label: "Left", value: "left" },
        { label: "Center", value: "center" },
        { label: "Right", value: "right" },
      ],
    },
    barcodeHeight: {
      type: "number",
      label: "Barcode Height (px)",
      min: 20,
      max: 80,
    },
    barcodeScale: {
      type: "number",
      label: "Barcode Scale",
      min: 0.5,
      max: 3,
      step: 0.1,
    },
    showName: { type: "boolean", label: "Show Name" },
    showPatientId: { type: "boolean", label: "Show Patient ID" },
    showSentBy: { type: "boolean", label: "Show Sent By" },
    showAgeSex: { type: "boolean", label: "Show Age/Gender" },
    showEmployeeId: { type: "boolean", label: "Show Employee ID" },
    showRefDoctor: { type: "boolean", label: "Show Ref. Doctor" },
    showSampleCollection: { type: "boolean", label: "Show Sample Collection" },
    showReportReleased: { type: "boolean", label: "Show Report Released" },
  },
  defaultProps: {
    show: true,
    fontSize: 12,
    barcodeShow: true,
    barcodePosition: "center",
    barcodeHeight: 35,
    barcodeScale: 1.2,
    showName: true,
    showPatientId: true,
    showSentBy: true,
    showAgeSex: true,
    showEmployeeId: true,
    showRefDoctor: true,
    showSampleCollection: true,
    showReportReleased: true,
  },
  render: (props) => {
    const config = useReportConfig();
    // Default all props
    const {
      show = true,
      fontSize = 12,
      barcodeShow = true,
      barcodePosition = "center",
      barcodeHeight = 35,
      barcodeScale = 1.2,
      showName = true,
      showPatientId = true,
      showSentBy = true,
      showAgeSex = true,
      showEmployeeId = true,
      showRefDoctor = true,
      showSampleCollection = true,
      showReportReleased = true,
    } = props;
    const primaryColor = config?.primaryColor || "#1e3a8a";
    const secondaryColor = config?.secondaryColor || "#475569";

    if (!show) return null;

    return (
      <div className="mb-6 break-inside-avoid">
        {barcodeShow && (
          <div className="mb-4 mt-2" style={{ textAlign: barcodePosition }}>
            <div
              className="inline-block"
              style={{
                transform: `scale(${barcodeScale})`,
                transformOrigin:
                  barcodePosition === "center" ? "center" : barcodePosition,
              }}>
              <Barcode
                value="Z-992384"
                height={barcodeHeight}
                width={1.5}
                fontSize={10}
                displayValue
                margin={0}
              />
            </div>
          </div>
        )}
        <div
          className="grid grid-cols-2 gap-x-8 gap-y-1 border-b pb-4"
          style={{
            fontSize: `${fontSize}px`,
            borderColor: primaryColor,
          }}>
          <div className="space-y-1.5">
            {showName && (
              <div className="flex">
                <span
                  className="w-28 font-bold"
                  style={{ color: secondaryColor }}>
                  Patient Name
                </span>
                <span className="font-bold uppercase">: MR. JOHN DOE</span>
              </div>
            )}
            {showPatientId && (
              <div className="flex">
                <span
                  className="w-28 font-bold"
                  style={{ color: secondaryColor }}>
                  Patient ID
                </span>
                <span>: UHID-992384</span>
              </div>
            )}
            {showSentBy && (
              <div className="flex">
                <span
                  className="w-28 font-bold"
                  style={{ color: secondaryColor }}>
                  Sent By
                </span>
                <span>: CITY HOSPITAL</span>
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            {showAgeSex && (
              <div className="flex">
                <span
                  className="w-32 font-bold"
                  style={{ color: secondaryColor }}>
                  Age / Gender
                </span>
                <span className="font-bold">: 45 Yrs / Male</span>
              </div>
            )}
            {showEmployeeId && (
              <div className="flex">
                <span
                  className="w-32 font-bold"
                  style={{ color: secondaryColor }}>
                  Employee ID
                </span>
                <span>: EMP-001</span>
              </div>
            )}
            {showRefDoctor && (
              <div className="flex">
                <span
                  className="w-32 font-bold"
                  style={{ color: secondaryColor }}>
                  Ref. Doctor
                </span>
                <span>: Dr. Sarah Smith</span>
              </div>
            )}
            {showSampleCollection && (
              <div className="flex">
                <span
                  className="w-32 font-bold"
                  style={{ color: secondaryColor }}>
                  Sample Collected
                </span>
                <span>: 12/05/2026 08:30 AM</span>
              </div>
            )}
            {showReportReleased && (
              <div className="flex">
                <span
                  className="w-32 font-bold"
                  style={{ color: secondaryColor }}>
                  Report Released
                </span>
                <span>: 12/05/2026 02:15 PM</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  },
};

// ------------------------------------------------------------------
// 5. TEXT BLOCK
// ------------------------------------------------------------------
export interface TextProps {
  content: string;
  fontSize?: number;
  color?: string;
  backgroundColor?: string;
  alignment?: "left" | "center" | "right" | "justify";
  fontWeight?: "normal" | "bold" | "light";
  italic?: boolean;
  padding?: number;
  margin?: number;
  border?: boolean;
  borderColor?: string;
}

export const TextBlock: ComponentConfig<TextProps> = {
  label: "Text",
  fields: {
    content: { type: "textarea", label: "Content" },
    fontSize: { type: "number", label: "Font Size (px)", min: 8, max: 48 },
    color: { type: "color", label: "Text Color" },
    backgroundColor: { type: "color", label: "Background Color" },
    alignment: {
      type: "select",
      label: "Alignment",
      options: [
        { label: "Left", value: "left" },
        { label: "Center", value: "center" },
        { label: "Right", value: "right" },
        { label: "Justify", value: "justify" },
      ],
    },
    fontWeight: {
      type: "select",
      label: "Font Weight",
      options: [
        { label: "Normal", value: "normal" },
        { label: "Bold", value: "bold" },
        { label: "Light", value: "light" },
      ],
    },
    italic: { type: "boolean", label: "Italic" },
    padding: { type: "number", label: "Padding (px)", min: 0, max: 50 },
    margin: { type: "number", label: "Margin (px)", min: 0, max: 50 },
    border: { type: "boolean", label: "Show Border" },
    borderColor: { type: "color", label: "Border Color" },
  },
  defaultProps: {
    content: "Enter your text here...",
    fontSize: 14,
    color: "#1e293b",
    backgroundColor: "transparent",
    alignment: "left",
    fontWeight: "normal",
    italic: false,
    padding: 4,
    margin: 8,
    border: false,
    borderColor: "#e2e8f0",
  },
  render: (props) => {
    const {
      content = "",
      fontSize = 14,
      color = "#1e293b",
      backgroundColor = "transparent",
      alignment = "left",
      fontWeight = "normal",
      italic = false,
      padding = 4,
      margin = 8,
      border = false,
      borderColor = "#e2e8f0",
    } = props;
    return (
      <div
        className="whitespace-pre-wrap leading-relaxed"
        style={{
          fontSize: `${fontSize}px`,
          color,
          backgroundColor,
          textAlign: alignment,
          fontWeight,
          fontStyle: italic ? "italic" : "normal",
          padding: `${padding}px`,
          margin: `${margin}px 0`,
          border: border ? `1px solid ${borderColor}` : "none",
          borderRadius: "4px",
        }}>
        {content}
      </div>
    );
  },
};

// ------------------------------------------------------------------
// 6. RESULTS TABLE BLOCK
// ------------------------------------------------------------------
export interface ResultsTableProps {
  title: string;
  showDepartmentHeader?: boolean;
  departmentName?: string;
  groupDepartmentWise?: boolean;
  tableFontSize?: number;
  showBiologicalRef?: boolean;
  showTestTimestamps?: boolean;
  primaryColor?: string;
}

export const ResultsTableBlock: ComponentConfig<ResultsTableProps> = {
  label: "Results Table",
  fields: {
    title: { type: "text", label: "Table Title" },
    showDepartmentHeader: { type: "boolean", label: "Show Department Header" },
    departmentName: { type: "text", label: "Department Name" },
  },
  defaultProps: {
    title: "Liver Function Test",
    showDepartmentHeader: true,
    departmentName: "BIOCHEMISTRY",
  },
  render: (props) => {
    const config = useReportConfig();
    const {
      title = "Liver Function Test",
      showDepartmentHeader = true,
      departmentName = "BIOCHEMISTRY",
    } = props;
    const groupDepartmentWise = config?.groupDepartmentWise ?? true;
    const tableFontSize = config?.tableFontSize ?? 11;
    const showBiologicalRef = config?.showBiologicalRef ?? true;
    const showTestTimestamps = config?.showTestTimestamps ?? true;
    const primaryColor = config?.primaryColor || "#1e3a8a";

    return (
      <div className="mb-6 w-full break-inside-avoid">
        {showDepartmentHeader && groupDepartmentWise && (
          <div className="bg-slate-100 font-bold py-1.5 px-3 mb-4 text-[12px] uppercase text-center border-y border-slate-300 tracking-wider">
            {departmentName}
          </div>
        )}
        {title && (
          <h2
            className="text-center font-bold text-lg mb-4 underline uppercase tracking-wide"
            style={{ color: primaryColor }}>
            {title}
          </h2>
        )}
        <table
          className="w-full border-collapse"
          style={{ fontSize: `${tableFontSize}px` }}>
          <thead
            className="border-y-2 text-left"
            style={{ borderColor: primaryColor }}>
            <tr>
              <th className="py-2.5 px-1 font-bold">Test Parameter</th>
              <th className="py-2.5 px-1 font-bold">Result</th>
              <th className="py-2.5 px-1 font-bold">Unit</th>
              {showBiologicalRef && (
                <th className="py-2.5 px-1 font-bold">Bio. Ref. Range</th>
              )}
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-100">
              <td className="py-2.5 px-1 font-medium">Bilirubin (Total)</td>
              <td className="py-2.5 px-1 font-bold">0.50</td>
              <td className="py-2.5 px-1 text-slate-500">mg/dl</td>
              {showBiologicalRef && (
                <td className="py-2.5 px-1 text-slate-500">0.2 - 1.2</td>
              )}
            </tr>
            <tr className="border-b border-slate-100">
              <td className="py-2.5 px-1 font-medium">S. G. O. T (AST)</td>
              <td className="py-2.5 px-1 font-bold text-red-600">45.2 (H)</td>
              <td className="py-2.5 px-1 text-slate-500">IU/L</td>
              {showBiologicalRef && (
                <td className="py-2.5 px-1 text-slate-500">0 - 40</td>
              )}
            </tr>
          </tbody>
        </table>
        {showTestTimestamps && (
          <div className="mt-4 text-[10px] text-slate-500 italic space-y-1">
            <p>
              (Collected At: 12/05/2026 08:30 AM, Received At: 12/05/2026 09:15
              AM, Reported At: 12/05/2026 02:15 PM)
            </p>
          </div>
        )}
      </div>
    );
  },
};

// ------------------------------------------------------------------
// 7. SPACER BLOCK
// ------------------------------------------------------------------
export interface SpacerProps {
  height: number;
  backgroundColor?: string;
  border?: boolean;
  borderColor?: string;
}

export const SpacerBlock: ComponentConfig<SpacerProps> = {
  label: "Spacer",
  fields: {
    height: { type: "number", label: "Height (px)", min: 5, max: 200 },
    backgroundColor: { type: "color", label: "Background Color" },
    border: { type: "boolean", label: "Show Border" },
    borderColor: { type: "color", label: "Border Color" },
  },
  defaultProps: {
    height: 20,
    backgroundColor: "transparent",
    border: false,
    borderColor: "#e2e8f0",
  },
  render: ({
    height = 20,
    backgroundColor = "transparent",
    border = false,
    borderColor = "#e2e8f0",
  }) => (
    <div
      style={{
        height: `${height}px`,
        backgroundColor,
        border: border ? `1px dashed ${borderColor}` : "none",
      }}
    />
  ),
};

// ------------------------------------------------------------------
// 8. IMAGE BLOCK
// ------------------------------------------------------------------
export interface ImageProps {
  imageUrl: string;
  imageScale: number;
  altText?: string;
  alignment?: "left" | "center" | "right";
  padding?: number;
  border?: boolean;
  borderColor?: string;
}

export const ImageBlock: ComponentConfig<ImageProps> = {
  label: "Image",
  fields: {
    imageUrl: { type: "text", label: "Image URL" },
    imageScale: { type: "number", label: "Scale (%)", min: 10, max: 200 },
    altText: { type: "text", label: "Alt Text" },
    alignment: {
      type: "select",
      label: "Alignment",
      options: [
        { label: "Left", value: "left" },
        { label: "Center", value: "center" },
        { label: "Right", value: "right" },
      ],
    },
    padding: { type: "number", label: "Padding (px)", min: 0, max: 50 },
    border: { type: "boolean", label: "Show Border" },
    borderColor: { type: "color", label: "Border Color" },
  },
  defaultProps: {
    imageUrl: "",
    imageScale: 100,
    altText: "Image",
    alignment: "center",
    padding: 4,
    border: false,
    borderColor: "#e2e8f0",
  },
  render: ({
    imageUrl = "",
    imageScale = 100,
    altText = "Image",
    alignment = "center",
    padding = 4,
    border = false,
    borderColor = "#e2e8f0",
  }) => {
    if (!imageUrl)
      return (
        <div className="text-slate-400 text-sm italic">No image provided</div>
      );
    return (
      <div
        style={{
          textAlign: alignment,
          padding: `${padding}px`,
          border: border ? `1px solid ${borderColor}` : "none",
          borderRadius: "4px",
        }}>
        <img
          src={imageUrl}
          alt={altText}
          style={{
            width: `${imageScale}%`,
            maxWidth: "100%",
            objectFit: "contain",
          }}
        />
      </div>
    );
  },
};

// ------------------------------------------------------------------
// 9. DIVIDER BLOCK
// ------------------------------------------------------------------
export interface DividerProps {
  color: string;
  thickness: number;
  margin: number;
  style?: "solid" | "dashed" | "dotted";
}

export const DividerBlock: ComponentConfig<DividerProps> = {
  label: "Divider",
  fields: {
    color: { type: "color", label: "Color" },
    thickness: { type: "number", label: "Thickness (px)", min: 1, max: 10 },
    margin: { type: "number", label: "Margin (px)", min: 0, max: 50 },
    style: {
      type: "select",
      label: "Style",
      options: [
        { label: "Solid", value: "solid" },
        { label: "Dashed", value: "dashed" },
        { label: "Dotted", value: "dotted" },
      ],
    },
  },
  defaultProps: {
    color: "#cbd5e1",
    thickness: 1,
    margin: 16,
    style: "solid",
  },
  render: ({
    color = "#cbd5e1",
    thickness = 1,
    margin = 16,
    style = "solid",
  }) => (
    <hr
      style={{
        border: "none",
        borderTop: `${thickness}px ${style} ${color}`,
        margin: `${margin}px 0`,
      }}
    />
  ),
};

// ------------------------------------------------------------------
// 10. FOOTER BLOCK
// ------------------------------------------------------------------
export interface FooterProps {
  show: boolean;
  mode: "standard" | "html" | "image";
  text: string;
  html: string;
  fullImage: string;
  footerBottomImage: string;
  height: number;
  signatures: {
    id: string;
    name: string;
    qualifications: string;
    title: string;
    imageUrl: string;
    show: boolean;
    width: number;
  }[];
  primaryColor?: string;
  secondaryColor?: string;
}

export const FooterBlock: ComponentConfig<FooterProps> = {
  label: "Footer",
  fields: {
    show: { type: "boolean", label: "Show Footer" },
    mode: {
      type: "select",
      label: "Mode",
      options: [
        { label: "Standard", value: "standard" },
        { label: "HTML", value: "html" },
        { label: "Image", value: "image" },
      ],
    },
    text: { type: "textarea", label: "Disclaimer Text" },
    html: { type: "textarea", label: "HTML" },
    fullImage: { type: "text", label: "Footer Image URL" },
    footerBottomImage: { type: "text", label: "Bottom Image URL" },
    height: { type: "number", label: "Height (px)", min: 50, max: 400 },
    signatures: {
      type: "array",
      label: "Signatories",
      arrayFields: {
        id: { type: "text", label: "ID" },
        name: { type: "text", label: "Name" },
        qualifications: { type: "text", label: "Qualifications" },
        title: { type: "text", label: "Title" },
        imageUrl: { type: "text", label: "Image URL" },
        show: { type: "boolean", label: "Show" },
        width: { type: "number", label: "Width (px)" },
      },
    },
  },
  defaultProps: {
    show: true,
    mode: "standard",
    text: "**This is an electronically generated report and does not require a physical signature.**",
    html: "",
    fullImage: "",
    footerBottomImage: "",
    height: 120,
    signatures: [
      {
        id: "sig-1",
        name: "Dr. A. Jalil",
        qualifications: "MBBS, MD",
        title: "Chief Pathologist",
        imageUrl: "",
        show: true,
        width: 150,
      },
    ],
  },
  render: (props) => {
    const config = useReportConfig();
    const {
      show = true,
      mode = "standard",
      text = "",
      html = "",
      fullImage = "",
      footerBottomImage = "",
      height = 120,
      signatures = [],
    } = props;
    const primaryColor = config?.primaryColor || "#1e3a8a";
    const secondaryColor = config?.secondaryColor || "#475569";

    if (!show) return null;

    return (
      <div
        className={`mt-auto pt-4 ${mode === "image" ? "" : "border-t-2"}`}
        style={{ borderTopColor: primaryColor }}>
        {mode === "image" ? (
          <div
            className="w-full bg-slate-100 flex items-center justify-center text-slate-400 overflow-hidden"
            style={{ height: `${height}px` }}>
            {fullImage ? (
              <img
                src={fullImage}
                className="w-full h-full object-cover"
                alt="Footer"
              />
            ) : (
              "Footer Image"
            )}
          </div>
        ) : mode === "html" ? (
          <div
            dangerouslySetInnerHTML={{
              __html:
                html ||
                "<div class='text-center py-4'>Custom HTML Footer</div>",
            }}
          />
        ) : (
          <div className="w-full flex flex-col items-center">
            <div className="flex justify-around items-end w-full mb-4 px-10">
              {signatures
                .filter((s) => s.show)
                .map((sig) => (
                  <div
                    key={sig.id}
                    className="flex flex-col items-center"
                    style={{ width: `${sig.width || 150}px` }}>
                    <div className="h-16 flex items-end justify-center mb-1">
                      {sig.imageUrl ? (
                        <img
                          src={sig.imageUrl}
                          className="h-full object-contain"
                          alt="Sig"
                        />
                      ) : (
                        <div className="text-[10px] text-slate-300 border border-dashed px-4 py-2 w-full text-center">
                          Sig
                        </div>
                      )}
                    </div>
                    <div className="w-full text-center border-t border-slate-300 pt-1">
                      <p className="font-bold text-[11px] text-slate-900 leading-tight whitespace-nowrap">
                        {sig.name || "Doctor Name"}
                      </p>
                      {sig.qualifications && (
                        <p className="text-[9px] text-slate-600 leading-tight whitespace-nowrap">
                          {sig.qualifications}
                        </p>
                      )}
                      {sig.title && (
                        <p className="font-bold text-[9px] text-slate-800 uppercase mt-0.5 whitespace-nowrap">
                          {sig.title}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
            </div>
            {footerBottomImage && (
              <div className="w-full flex justify-center mt-2 border-t border-slate-100 pt-3">
                <img
                  src={footerBottomImage}
                  className="max-h-16 object-contain"
                  alt="Accreditation"
                />
              </div>
            )}
          </div>
        )}
        <div
          className="text-[9px] text-center mt-4 pb-2 pt-2 border-t border-slate-200"
          style={{ color: secondaryColor }}
          dangerouslySetInnerHTML={{ __html: text || "" }}
        />
      </div>
    );
  },
};
