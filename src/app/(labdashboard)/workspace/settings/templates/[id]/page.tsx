"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Rnd } from "react-rnd";
import QRCode from "qrcode";
import Barcode from "react-barcode";
import toast from "react-hot-toast";
import {
  Save, Loader2, ArrowLeft, Type, Table2, QrCode,
  SplitSquareHorizontal, Trash2, Plus, Image as ImageIcon,
  LayoutTemplate, Code, Eye, Download, Upload, Move, X,
  Lock, Unlock, Copy, Layers, Settings2, ZoomIn, ZoomOut,
  Maximize2, MousePointer2, ArrowUpToLine, ArrowDownToLine,
  RotateCcw, SquareDot, ImagePlus, Barcode as BarcodeIcon,
  PenTool, Minus, AlignLeft, AlignCenter, AlignRight,
  AlignJustify, Bold, Italic, Underline, Strikethrough,
  ChevronDown, ChevronRight, Palette, Frame, ScanLine,
  Hash, Stethoscope, Building2, Clock, Stamp, FileText,
  Box, SeparatorHorizontal, Ruler, Heading2, Sparkles,
} from "lucide-react";
import { getTemplateById, saveTemplate } from "@/actions/report-settings";

// ============================================================================
// 1. TYPE SYSTEM
// ============================================================================

export type ComponentType =
  | "TEXT" | "RICH_TEXT"
  | "PATIENT_NAME" | "PATIENT_AGE" | "PATIENT_GENDER" | "PATIENT_ID"
  | "REF_DOCTOR" | "SENT_BY" | "SAMPLE_ID"
  | "COLLECTION_DATETIME" | "REPORT_DATETIME"
  | "EMPLOYEE_ID" | "PATIENT_PHONE" | "PATIENT_ADDRESS"
  | "BARCODE" | "QR_CODE"
  | "LAB_LOGO" | "SIGNATURE" | "CUSTOM_IMAGE"
  | "HEADER_BANNER" | "FOOTER_BANNER"
  | "RESULTS_TABLE" | "DEPARTMENT_HEADER"
  | "SEPARATOR" | "DIVIDER_DOTS" | "SPACER" | "BOX_CONTAINER"
  | "APPROVAL_STAMP" | "PAGE_NUMBER" | "DISCLAIMER" | "DATE_BLOCK";

export type TextAlignment = "left" | "center" | "right" | "justify";
export type TextTransform = "none" | "uppercase" | "lowercase" | "capitalize";
export type BorderStyle = "none" | "solid" | "dashed" | "dotted" | "double";
export type OverflowType = "visible" | "hidden" | "auto" | "scroll";
export type WhiteSpaceType = "normal" | "nowrap" | "pre" | "pre-wrap";
export type ObjectFitType = "cover" | "contain" | "fill" | "none" | "scale-down";

export interface ComponentStyle {
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  fontStyle: "normal" | "italic";
  color: string;
  textAlign: TextAlignment;
  textTransform: TextTransform;
  textDecoration: string;
  letterSpacing: number;
  lineHeight: number;
  whiteSpace: WhiteSpaceType;
  bgColor: string;
  bgOpacity: number;
  borderWidth: number;
  borderColor: string;
  borderStyle: BorderStyle;
  borderRadius: number;
  borderTopWidth: number;
  borderRightWidth: number;
  borderBottomWidth: number;
  borderLeftWidth: number;
  borderTopColor: string;
  borderRightColor: string;
  borderBottomColor: string;
  borderLeftColor: string;
  borderTopStyle: BorderStyle;
  borderRightStyle: BorderStyle;
  borderBottomStyle: BorderStyle;
  borderLeftStyle: BorderStyle;
  borderTopLeftRadius: number;
  borderTopRightRadius: number;
  borderBottomLeftRadius: number;
  borderBottomRightRadius: number;
  paddingTop: number;
  paddingRight: number;
  paddingBottom: number;
  paddingLeft: number;
  opacity: number;
  rotation: number;
  overflow: OverflowType;
  objectFit: ObjectFitType;
  useIndividualBorders: boolean;
  useIndividualRadius: boolean;
}

export interface ReportComponent {
  id: string;
  type: ComponentType;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  locked: boolean;
  visible: boolean;
  name: string;
  style: ComponentStyle;
  data: Record<string, any>;
}

export interface PageSettings {
  width: number;
  height: number;
  margins: { top: number; right: number; bottom: number; left: number };
  border: { show: boolean; weight: number; color: string; padding: number; radius: number };
  bgColor: string;
  watermarkUrl: string;
  watermarkOpacity: number;
  globalFontSize: number;
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
}

export interface TemplateState {
  name: string;
  page: PageSettings;
  components: ReportComponent[];
}

// ============================================================================
// 2. CONSTANTS
// ============================================================================

const PAGE_W = 794;
const PAGE_H = 1123;

const FONT_FAMILIES = [
  { label: "Helvetica", value: "Helvetica, Arial, sans-serif" },
  { label: "Arial", value: "Arial, Helvetica, sans-serif" },
  { label: "Times New Roman", value: "'Times New Roman', Times, serif" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Courier New", value: "'Courier New', Courier, monospace" },
  { label: "Verdana", value: "Verdana, Geneva, sans-serif" },
  { label: "Trebuchet MS", value: "'Trebuchet MS', sans-serif" },
  { label: "Palatino", value: "'Palatino Linotype', 'Book Antiqua', Palatino, serif" },
  { label: "Tahoma", value: "Tahoma, Geneva, sans-serif" },
  { label: "Segoe UI", value: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" },
  { label: "Roboto", value: "'Roboto', sans-serif" },
  { label: "Open Sans", value: "'Open Sans', sans-serif" },
  { label: "Lato", value: "'Lato', sans-serif" },
  { label: "Montserrat", value: "'Montserrat', sans-serif" },
  { label: "Poppins", value: "'Poppins', sans-serif" },
  { label: "Oswald", value: "'Oswald', sans-serif" },
  { label: "Raleway", value: "'Raleway', sans-serif" },
  { label: "Merriweather", value: "'Merriweather', serif" },
  { label: "Playfair Display", value: "'Playfair Display', serif" },
  { label: "Inter", value: "'Inter', sans-serif" },
  { label: "DM Sans", value: "'DM Sans', sans-serif" },
  { label: "Nunito", value: "'Nunito', sans-serif" },
  { label: "Source Code Pro", value: "'Source Code Pro', monospace" },
];

const FONT_WEIGHTS = [
  { label: "Thin", value: 100 },
  { label: "Extra Light", value: 200 },
  { label: "Light", value: 300 },
  { label: "Regular", value: 400 },
  { label: "Medium", value: 500 },
  { label: "Semi Bold", value: 600 },
  { label: "Bold", value: 700 },
  { label: "Extra Bold", value: 800 },
  { label: "Black", value: 900 },
];

const COLOR_PRESETS = [
  "#000000", "#ffffff", "#ef4444", "#f97316", "#f59e0b", "#eab308",
  "#84cc16", "#22c55e", "#10b981", "#14b8a6", "#06b6d4", "#0ea5e9",
  "#3b82f6", "#6366f1", "#8b5cf6", "#a855f7", "#d946ef", "#ec4899",
  "#f43f5e", "#78716c", "#64748b", "#475569", "#334155", "#1e293b",
  "#0f172a", "#1e3a8a", "#166534", "#991b1b", "#92400e", "#581c87",
];

interface ComponentDef {
  label: string;
  category: "dynamic" | "media" | "data" | "layout" | "text" | "special";
  color: string;
  defaultWidth: number;
  defaultHeight: number;
  defaultStyle: Partial<ComponentStyle>;
  defaultData: Record<string, any>;
  isTextBased: boolean;
  isImageBased: boolean;
}

const DEFAULT_STYLE: ComponentStyle = {
  fontFamily: "Helvetica, Arial, sans-serif",
  fontSize: 12,
  fontWeight: 400,
  fontStyle: "normal",
  color: "#0f172a",
  textAlign: "left",
  textTransform: "none",
  textDecoration: "none",
  letterSpacing: 0,
  lineHeight: 1.4,
  whiteSpace: "normal",
  bgColor: "transparent",
  bgOpacity: 0,
  borderWidth: 0,
  borderColor: "#cbd5e1",
  borderStyle: "none",
  borderRadius: 0,
  borderTopWidth: 0,
  borderRightWidth: 0,
  borderBottomWidth: 0,
  borderLeftWidth: 0,
  borderTopColor: "#cbd5e1",
  borderRightColor: "#cbd5e1",
  borderBottomColor: "#cbd5e1",
  borderLeftColor: "#cbd5e1",
  borderTopStyle: "none",
  borderRightStyle: "none",
  borderBottomStyle: "none",
  borderLeftStyle: "none",
  borderTopLeftRadius: 0,
  borderTopRightRadius: 0,
  borderBottomLeftRadius: 0,
  borderBottomRightRadius: 0,
  paddingTop: 0,
  paddingRight: 0,
  paddingBottom: 0,
  paddingLeft: 0,
  opacity: 100,
  rotation: 0,
  overflow: "visible",
  objectFit: "contain",
  useIndividualBorders: false,
  useIndividualRadius: false,
};

function makeStyle(overrides: Partial<ComponentStyle>): ComponentStyle {
  return { ...DEFAULT_STYLE, ...overrides };
}

const COMPONENT_REGISTRY: Record<ComponentType, ComponentDef> = {
  TEXT: {
    label: "Text Block", category: "text", color: "#3b82f6",
    defaultWidth: 300, defaultHeight: 40, isTextBased: true, isImageBased: false,
    defaultStyle: makeStyle({ fontSize: 12 }),
    defaultData: { content: "Enter your text here" },
  },
  RICH_TEXT: {
    label: "Rich Text", category: "text", color: "#2563eb",
    defaultWidth: 400, defaultHeight: 80, isTextBased: true, isImageBased: false,
    defaultStyle: makeStyle({ fontSize: 11, lineHeight: 1.6 }),
    defaultData: { content: "Multi-line rich text content.\nSupports multiple lines." },
  },
  PATIENT_NAME: {
    label: "Patient Name", category: "dynamic", color: "#10b981",
    defaultWidth: 250, defaultHeight: 28, isTextBased: true, isImageBased: false,
    defaultStyle: makeStyle({ fontSize: 14, fontWeight: 700, color: "#0f172a" }),
    defaultData: { label: "Patient Name", value: "JOHN DOE", showLabel: true },
  },
  PATIENT_AGE: {
    label: "Patient Age", category: "dynamic", color: "#10b981",
    defaultWidth: 120, defaultHeight: 24, isTextBased: true, isImageBased: false,
    defaultStyle: makeStyle({ fontSize: 12, fontWeight: 500 }),
    defaultData: { label: "Age", value: "35 Y", showLabel: true },
  },
  PATIENT_GENDER: {
    label: "Gender", category: "dynamic", color: "#10b981",
    defaultWidth: 100, defaultHeight: 24, isTextBased: true, isImageBased: false,
    defaultStyle: makeStyle({ fontSize: 12, fontWeight: 500 }),
    defaultData: { label: "Gender", value: "Male", showLabel: true },
  },
  PATIENT_ID: {
    label: "Patient ID", category: "dynamic", color: "#10b981",
    defaultWidth: 180, defaultHeight: 24, isTextBased: true, isImageBased: false,
    defaultStyle: makeStyle({ fontSize: 11, fontWeight: 600, color: "#1e3a8a" }),
    defaultData: { label: "Patient ID", value: "PT-2025-001234", showLabel: true },
  },
  REF_DOCTOR: {
    label: "Ref. Doctor", category: "dynamic", color: "#10b981",
    defaultWidth: 200, defaultHeight: 24, isTextBased: true, isImageBased: false,
    defaultStyle: makeStyle({ fontSize: 11 }),
    defaultData: { label: "Ref. Doctor", value: "Dr. Smith", showLabel: true },
  },
  SENT_BY: {
    label: "Sent By", category: "dynamic", color: "#10b981",
    defaultWidth: 200, defaultHeight: 24, isTextBased: true, isImageBased: false,
    defaultStyle: makeStyle({ fontSize: 11 }),
    defaultData: { label: "Sent By", value: "City Hospital", showLabel: true },
  },
  SAMPLE_ID: {
    label: "Sample ID", category: "dynamic", color: "#10b981",
    defaultWidth: 180, defaultHeight: 24, isTextBased: true, isImageBased: false,
    defaultStyle: makeStyle({ fontSize: 11, fontWeight: 600 }),
    defaultData: { label: "Sample ID", value: "SMP-2025-98765", showLabel: true },
  },
  COLLECTION_DATETIME: {
    label: "Collection Time", category: "dynamic", color: "#10b981",
    defaultWidth: 200, defaultHeight: 24, isTextBased: true, isImageBased: false,
    defaultStyle: makeStyle({ fontSize: 10 }),
    defaultData: { label: "Collected", value: "15 Jan 2025, 10:30 AM", showLabel: true },
  },
  REPORT_DATETIME: {
    label: "Report Time", category: "dynamic", color: "#10b981",
    defaultWidth: 200, defaultHeight: 24, isTextBased: true, isImageBased: false,
    defaultStyle: makeStyle({ fontSize: 10 }),
    defaultData: { label: "Reported", value: "15 Jan 2025, 02:45 PM", showLabel: true },
  },
  EMPLOYEE_ID: {
    label: "Employee ID", category: "dynamic", color: "#10b981",
    defaultWidth: 160, defaultHeight: 24, isTextBased: true, isImageBased: false,
    defaultStyle: makeStyle({ fontSize: 11 }),
    defaultData: { label: "Emp. ID", value: "EMP-0042", showLabel: true },
  },
  PATIENT_PHONE: {
    label: "Phone", category: "dynamic", color: "#10b981",
    defaultWidth: 160, defaultHeight: 24, isTextBased: true, isImageBased: false,
    defaultStyle: makeStyle({ fontSize: 11 }),
    defaultData: { label: "Phone", value: "+91 98765 43210", showLabel: true },
  },
  PATIENT_ADDRESS: {
    label: "Address", category: "dynamic", color: "#10b981",
    defaultWidth: 300, defaultHeight: 36, isTextBased: true, isImageBased: false,
    defaultStyle: makeStyle({ fontSize: 10, lineHeight: 1.5 }),
    defaultData: { label: "Address", value: "123 Main St, City, State", showLabel: true },
  },
  BARCODE: {
    label: "Barcode", category: "data", color: "#ec4899",
    defaultWidth: 250, defaultHeight: 50, isTextBased: false, isImageBased: false,
    defaultStyle: makeStyle({ bgColor: "#ffffff", borderWidth: 0 }),
    defaultData: { value: "SMP-2025-98765", format: "CODE128", displayValue: true, barHeight: 35, barScale: 1.5 },
  },
  QR_CODE: {
    label: "QR Code", category: "data", color: "#ec4899",
    defaultWidth: 70, defaultHeight: 85, isTextBased: false, isImageBased: false,
    defaultStyle: makeStyle({ bgColor: "#ffffff", borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 4 }),
    defaultData: { value: "https://verify.lab.com/rpt/001234", showPageNumber: true, errorCorrection: "M" },
  },
  RESULTS_TABLE: {
    label: "Results Table", category: "data", color: "#8b5cf6",
    defaultWidth: 740, defaultHeight: 200, isTextBased: false, isImageBased: false,
    defaultStyle: makeStyle({ borderWidth: 1, borderColor: "#94a3b8", borderStyle: "solid", fontSize: 10 }),
    defaultData: {
      showHeader: true, showRefRange: true, showUnit: true, showDepartmentGroup: true,
      headerBgColor: "#1e3a8a", headerTextColor: "#ffffff", rowAltColor: "#f1f5f9",
      headerFontWeight: 600,
      columns: ["Test Name", "Result", "Unit", "Ref. Range", "Method"],
      sampleData: [
        { test: "Haemoglobin", result: "14.2", unit: "g/dL", ref: "13.0-17.5", method: "CBC" },
        { test: "RBC Count", result: "4.8", unit: "mill/cmm", ref: "4.5-5.5", method: "CBC" },
        { test: "WBC Count", result: "7500", unit: "/cmm", ref: "4000-11000", method: "CBC" },
        { test: "Platelet Count", result: "2.5", unit: "lakhs/cmm", ref: "1.5-4.0", method: "CBC" },
        { test: "PCV", result: "42.5", unit: "%", ref: "40-50", method: "CBC" },
        { test: "MCV", result: "88.5", unit: "fL", ref: "80-100", method: "CBC" },
        { test: "MCH", result: "29.6", unit: "pg", ref: "27-32", method: "CBC" },
        { test: "MCHC", result: "33.4", unit: "g/dL", ref: "32-36", method: "CBC" },
      ],
    },
  },
  DEPARTMENT_HEADER: {
    label: "Dept. Header", category: "data", color: "#7c3aed",
    defaultWidth: 740, defaultHeight: 28, isTextBased: true, isImageBased: false,
    defaultStyle: makeStyle({ fontSize: 12, fontWeight: 700, color: "#1e3a8a", bgColor: "#e0e7ff", paddingTop: 4, paddingBottom: 4, paddingLeft: 8, borderRadius: 4 }),
    defaultData: { title: "HAEMATOLOGY" },
  },
  LAB_LOGO: {
    label: "Lab Logo", category: "media", color: "#f59e0b",
    defaultWidth: 80, defaultHeight: 80, isTextBased: false, isImageBased: true,
    defaultStyle: makeStyle({ bgColor: "transparent", objectFit: "contain" }),
    defaultData: { imageUrl: "", altText: "Lab Logo" },
  },
  SIGNATURE: {
    label: "Signature", category: "media", color: "#14b8a6",
    defaultWidth: 150, defaultHeight: 60, isTextBased: false, isImageBased: true,
    defaultStyle: makeStyle({ objectFit: "contain" }),
    defaultData: { imageUrl: "", name: "Dr. A. Jalil", qualifications: "MBBS, MD", title: "Chief Pathologist", showDetails: true },
  },
  CUSTOM_IMAGE: {
    label: "Custom Image", category: "media", color: "#f59e0b",
    defaultWidth: 200, defaultHeight: 150, isTextBased: false, isImageBased: true,
    defaultStyle: makeStyle({ objectFit: "contain", borderWidth: 1, borderColor: "#e2e8f0" }),
    defaultData: { imageUrl: "", altText: "Image" },
  },
  HEADER_BANNER: {
    label: "Header Banner", category: "media", color: "#d97706",
    defaultWidth: 794, defaultHeight: 120, isTextBased: false, isImageBased: true,
    defaultStyle: makeStyle({ objectFit: "cover" }),
    defaultData: { imageUrl: "", altText: "Header" },
  },
  FOOTER_BANNER: {
    label: "Footer Banner", category: "media", color: "#d97706",
    defaultWidth: 794, defaultHeight: 100, isTextBased: false, isImageBased: true,
    defaultStyle: makeStyle({ objectFit: "cover" }),
    defaultData: { imageUrl: "", altText: "Footer" },
  },
  SEPARATOR: {
    label: "Separator Line", category: "layout", color: "#6b7280",
    defaultWidth: 740, defaultHeight: 4, isTextBased: false, isImageBased: false,
    defaultStyle: makeStyle({ borderWidth: 0, borderBottomWidth: 2, borderBottomStyle: "solid", borderBottomColor: "#cbd5e1" }),
    defaultData: { lineStyle: "solid", thickness: 2, color: "#cbd5e1" },
  },
  DIVIDER_DOTS: {
    label: "Dot Divider", category: "layout", color: "#9ca3af",
    defaultWidth: 740, defaultHeight: 16, isTextBased: true, isImageBased: false,
    defaultStyle: makeStyle({ fontSize: 14, textAlign: "center", color: "#94a3b8", letterSpacing: 4 }),
    defaultData: { dotChar: "\u00B7", repeatCount: 60 },
  },
  SPACER: {
    label: "Spacer", category: "layout", color: "#94a3b8",
    defaultWidth: 100, defaultHeight: 30, isTextBased: false, isImageBased: false,
    defaultStyle: makeStyle({ bgColor: "transparent" }),
    defaultData: {},
  },
  BOX_CONTAINER: {
    label: "Box Container", category: "layout", color: "#78716c",
    defaultWidth: 360, defaultHeight: 120, isTextBased: false, isImageBased: false,
    defaultStyle: makeStyle({ borderWidth: 1, borderColor: "#cbd5e1", borderStyle: "solid", borderRadius: 6, bgColor: "#f8fafc", paddingTop: 8, paddingRight: 8, paddingBottom: 8, paddingLeft: 8 }),
    defaultData: { title: "Box Title", showTitle: true },
  },
  APPROVAL_STAMP: {
    label: "Approval Stamp", category: "special", color: "#ef4444",
    defaultWidth: 120, defaultHeight: 120, isTextBased: true, isImageBased: false,
    defaultStyle: makeStyle({ borderWidth: 3, borderColor: "#16a34a", borderStyle: "solid", borderRadius: 60, color: "#16a34a", fontSize: 14, fontWeight: 900, textAlign: "center", textTransform: "uppercase", rotation: -15, opacity: 70 }),
    defaultData: { text: "APPROVED", stampColor: "#16a34a" },
  },
  PAGE_NUMBER: {
    label: "Page Number", category: "text", color: "#6366f1",
    defaultWidth: 100, defaultHeight: 20, isTextBased: true, isImageBased: false,
    defaultStyle: makeStyle({ fontSize: 9, textAlign: "center", color: "#64748b" }),
    defaultData: { format: "Page {current} of {total}" },
  },
  DISCLAIMER: {
    label: "Disclaimer", category: "text", color: "#475569",
    defaultWidth: 740, defaultHeight: 40, isTextBased: true, isImageBased: false,
    defaultStyle: makeStyle({ fontSize: 8, textAlign: "center", color: "#94a3b8", fontStyle: "italic", lineHeight: 1.5 }),
    defaultData: { content: "This is an electronically generated report and does not require a physical signature." },
  },
  DATE_BLOCK: {
    label: "Date Block", category: "dynamic", color: "#06b6d4",
    defaultWidth: 180, defaultHeight: 24, isTextBased: true, isImageBased: false,
    defaultStyle: makeStyle({ fontSize: 10, fontWeight: 500 }),
    defaultData: { label: "Report Date", value: "15 January 2025", showLabel: true, dateFormat: "DD MMMM YYYY" },
  },
};

const COMPONENT_CATEGORIES: Record<string, { label: string; color: string; types: ComponentType[] }> = {
  dynamic: { label: "Dynamic Fields", color: "#10b981", types: ["PATIENT_NAME", "PATIENT_AGE", "PATIENT_GENDER", "PATIENT_ID", "REF_DOCTOR", "SENT_BY", "SAMPLE_ID", "COLLECTION_DATETIME", "REPORT_DATETIME", "EMPLOYEE_ID", "PATIENT_PHONE", "PATIENT_ADDRESS", "DATE_BLOCK"] },
  media: { label: "Media", color: "#f59e0b", types: ["LAB_LOGO", "SIGNATURE", "CUSTOM_IMAGE", "HEADER_BANNER", "FOOTER_BANNER"] },
  data: { label: "Data Elements", color: "#8b5cf6", types: ["BARCODE", "QR_CODE", "RESULTS_TABLE", "DEPARTMENT_HEADER"] },
  layout: { label: "Layout", color: "#6b7280", types: ["SPACER", "SEPARATOR", "DIVIDER_DOTS", "BOX_CONTAINER"] },
  text: { label: "Text", color: "#3b82f6", types: ["TEXT", "RICH_TEXT", "PAGE_NUMBER", "DISCLAIMER"] },
  special: { label: "Special", color: "#ef4444", types: ["APPROVAL_STAMP"] },
};

// ============================================================================
// 3. DEFAULT TEMPLATE
// ============================================================================

function genId(): string {
  return `cmp-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

function createComponent(type: ComponentType, overrides?: Partial<ReportComponent>): ReportComponent {
  const def = COMPONENT_REGISTRY[type];
  return {
    id: genId(),
    type,
    x: 27,
    y: 27,
    width: def.defaultWidth,
    height: def.defaultHeight,
    zIndex: 1,
    locked: false,
    visible: true,
    name: def.label,
    style: { ...DEFAULT_STYLE, ...def.defaultStyle },
    data: { ...def.defaultData },
    ...overrides,
  };
}

const DEFAULT_PAGE: PageSettings = {
  width: PAGE_W,
  height: PAGE_H,
  margins: { top: 10, right: 10, bottom: 10, left: 10 },
  border: { show: false, weight: 2, color: "#1e3a8a", padding: 5, radius: 0 },
  bgColor: "#ffffff",
  watermarkUrl: "",
  watermarkOpacity: 0.08,
  globalFontSize: 11,
  primaryColor: "#1e3a8a",
  secondaryColor: "#475569",
  fontFamily: "Helvetica, Arial, sans-serif",
};

const DEFAULT_TEMPLATE: TemplateState = {
  name: "Enterprise Clinical Report",
  page: DEFAULT_PAGE,
  components: [
    createComponent("HEADER_BANNER", { x: 0, y: 0, width: PAGE_W, height: 100, zIndex: 1 }),
    createComponent("LAB_LOGO", { x: 30, y: 15, width: 70, height: 70, zIndex: 2 }),
    createComponent("TEXT", { x: 110, y: 18, width: 400, height: 30, zIndex: 3, style: makeStyle({ fontSize: 20, fontWeight: 800, color: "#1e3a8a" }), data: { content: "GLOBIZ PATHOLAB" } }),
    createComponent("TEXT", { x: 110, y: 50, width: 400, height: 20, zIndex: 3, style: makeStyle({ fontSize: 11, color: "#475569" }), data: { content: "Advanced Diagnostics Center | NABL Accredited" } }),
    createComponent("TEXT", { x: 110, y: 68, width: 400, height: 16, zIndex: 3, style: makeStyle({ fontSize: 9, color: "#94a3b8" }), data: { content: "123 Health Street, Medical District, City - 380001 | Tel: +91 79 1234 5678" } }),
    createComponent("QR_CODE", { x: 690, y: 15, width: 70, height: 85, zIndex: 4 }),
    createComponent("SEPARATOR", { x: 27, y: 108, width: 740, height: 4, zIndex: 5 }),
    createComponent("PATIENT_NAME", { x: 27, y: 120, width: 300, height: 26, zIndex: 6 }),
    createComponent("PATIENT_AGE", { x: 340, y: 120, width: 120, height: 24, zIndex: 6 }),
    createComponent("PATIENT_GENDER", { x: 470, y: 120, width: 100, height: 24, zIndex: 6 }),
    createComponent("PATIENT_ID", { x: 27, y: 148, width: 200, height: 22, zIndex: 6 }),
    createComponent("SAMPLE_ID", { x: 240, y: 148, width: 200, height: 22, zIndex: 6 }),
    createComponent("REF_DOCTOR", { x: 450, y: 148, width: 200, height: 22, zIndex: 6 }),
    createComponent("COLLECTION_DATETIME", { x: 27, y: 174, width: 220, height: 22, zIndex: 6 }),
    createComponent("REPORT_DATETIME", { x: 260, y: 174, width: 220, height: 22, zIndex: 6 }),
    createComponent("SENT_BY", { x: 490, y: 174, width: 200, height: 22, zIndex: 6 }),
    createComponent("SEPARATOR", { x: 27, y: 204, width: 740, height: 3, zIndex: 5, style: makeStyle({ borderBottomWidth: 1, borderBottomColor: "#e2e8f0" }) }),
    createComponent("BARCODE", { x: 272, y: 212, width: 250, height: 48, zIndex: 6 }),
    createComponent("DEPARTMENT_HEADER", { x: 27, y: 270, width: 740, height: 26, zIndex: 6 }),
    createComponent("RESULTS_TABLE", { x: 27, y: 300, width: 740, height: 220, zIndex: 6 }),
    createComponent("SPACER", { x: 27, y: 530, width: 740, height: 40, zIndex: 5 }),
    createComponent("DIVIDER_DOTS", { x: 27, y: 575, width: 740, height: 14, zIndex: 5 }),
    createComponent("APPROVAL_STAMP", { x: 580, y: 620, width: 110, height: 110, zIndex: 7 }),
    createComponent("SIGNATURE", { x: 27, y: 630, width: 150, height: 80, zIndex: 6 }),
    createComponent("DISCLAIMER", { x: 27, y: 750, width: 740, height: 36, zIndex: 6 }),
    createComponent("PAGE_NUMBER", { x: 347, y: 790, width: 100, height: 18, zIndex: 6 }),
    createComponent("FOOTER_BANNER", { x: 0, y: 1050, width: PAGE_W, height: 73, zIndex: 1 }),
  ],
};

// ============================================================================
// 4. UTILITIES
// ============================================================================

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function mergeOldConfig(oldConfig: any): TemplateState {
  const tpl = deepClone(DEFAULT_TEMPLATE);
  if (oldConfig?.branding) {
    tpl.page.primaryColor = oldConfig.branding.primaryColor || tpl.page.primaryColor;
    tpl.page.secondaryColor = oldConfig.branding.secondaryColor || tpl.page.secondaryColor;
    tpl.page.globalFontSize = oldConfig.branding.globalFontSize || tpl.page.globalFontSize;
    tpl.page.watermarkUrl = oldConfig.branding.watermarkUrl || "";
    tpl.page.watermarkOpacity = oldConfig.branding.watermarkOpacity || 0.08;
  }
  if (oldConfig?.layout) {
    tpl.page.margins = oldConfig.layout.margins || tpl.page.margins;
    tpl.page.border = oldConfig.layout.border || tpl.page.border;
  }
  return tpl;
}

// ============================================================================
// 5. ASYNC QR CODE
// ============================================================================

const AsyncQRCode = ({ value, size, showPageNumber }: { value: string; size: number; showPageNumber: boolean }) => {
  const [src, setSrc] = useState<string>("");
  useEffect(() => {
    if (!value) return;
    QRCode.toDataURL(value, { margin: 0, width: Math.max(10, size - 8), color: { dark: "#0f172a", light: "#ffffff" } })
      .then(setSrc)
      .catch(() => { /* ignore */ });
  }, [value, size]);
  if (!src) {
    return <div style={{ width: size, height: size }} className="bg-slate-100 animate-pulse" />;
  }
  return (
    <div className="flex flex-col items-center justify-center bg-white p-1" style={{ width: size, height: size + (showPageNumber ? 14 : 0) }}>
      <img src={src} alt="QR" style={{ width: size - 8, height: size - 8 }} />
      {showPageNumber && (
        <span className="text-[7px] mt-0.5 font-bold text-slate-400">Page 1/1</span>
      )}
    </div>
  );
};

// ============================================================================
// 6. MICRO UI COMPONENTS
// ============================================================================

const PropSection = ({ title, icon: Icon, defaultOpen = true, children, color = "#6366f1" }: {
  title: string;
  icon: React.ElementType;
  defaultOpen?: boolean;
  children: React.ReactNode;
  color?: string;
}) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-zinc-800/60">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-2.5 px-3 hover:bg-zinc-800/30 transition-colors group"
      >
        <div className="flex items-center gap-2">
          <Icon size={13} style={{ color }} />
          <span className="text-[11px] font-semibold text-zinc-300 uppercase tracking-wider">{title}</span>
        </div>
        {open ? <ChevronDown size={14} className="text-zinc-500" /> : <ChevronRight size={14} className="text-zinc-500" />}
      </button>
      {open && <div className="px-3 pb-3 space-y-2.5">{children}</div>}
    </div>
  );
};

const PropRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex items-center gap-2 justify-between">
    <span className="text-[10px] text-zinc-500 shrink-0 w-[90px] truncate">{label}</span>
    <div className="flex items-center gap-1.5 flex-1">{children}</div>
  </div>
);

const PropSlider = ({ value, min, max, step = 1, onChange, unit = "", color = "#6366f1" }: {
  value: number; min: number; max: number; step?: number; onChange: (v: number) => void; unit?: string; color?: string;
}) => (
  <div className="flex items-center gap-2 flex-1">
    <Slider
      min={min} max={max} step={step} value={[value]} onValueChange={(v) => onChange(v[0])}
      className="flex-1 [&_[role=slider]]:h-3 [&_[role=slider]]:w-3 [&_[role=slider]]:border-0"
      style={{ "--slider-color": color } as React.CSSProperties}
    />
    <span className="text-[10px] text-zinc-400 font-mono w-[42px] text-right shrink-0">
      {typeof value === "number" && !Number.isInteger(value) ? value.toFixed(1) : value}{unit}
    </span>
  </div>
);

const PropColor = ({ value, onChange, presets }: { value: string; onChange: (v: string) => void; presets?: string[] }) => (
  <div className="flex items-center gap-1.5 flex-1">
    <div className="relative">
      <input
        type="color"
        value={value === "transparent" ? "#ffffff" : value}
        onChange={(e) => onChange(e.target.value)}
        className="w-7 h-7 rounded border border-zinc-700 cursor-pointer p-0 bg-transparent"
      />
    </div>
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-7 text-[10px] font-mono bg-zinc-800/50 border-zinc-700 text-zinc-300 px-2 flex-1"
    />
    {value !== "transparent" && (
      <button
        onClick={() => onChange("transparent")}
        className="text-[8px] text-zinc-500 hover:text-red-400 px-1 py-0.5 border border-zinc-700 rounded hover:border-red-500/50 transition-colors"
      >
        <X size={10} />
      </button>
    )}
    {presets && presets.length > 0 && (
      <div className="flex gap-0.5 flex-wrap max-w-[120px]">
        {presets.map((c) => (
          <button
            key={c}
            onClick={() => onChange(c)}
            className="w-4 h-4 rounded-sm border border-zinc-600 hover:border-white transition-colors shrink-0"
            style={{ backgroundColor: c }}
          />
        ))}
      </div>
    )}
  </div>
);

const PropNumber = ({ value, min, max, step = 1, onChange, unit = "" }: {
  value: number; min: number; max: number; step?: number; onChange: (v: number) => void; unit?: string;
}) => (
  <div className="flex items-center gap-1">
    <button
      onClick={() => onChange(clamp(value - step, min, max))}
      className="w-6 h-6 flex items-center justify-center bg-zinc-800 border border-zinc-700 rounded text-zinc-400 hover:text-white hover:border-zinc-500 transition-colors"
    >
      <Minus size={10} />
    </button>
    <Input
      type="number" value={value} min={min} max={max} step={step}
      onChange={(e) => onChange(clamp(Number(e.target.value) || 0, min, max))}
      className="h-6 w-14 text-[10px] font-mono text-center bg-zinc-800/50 border-zinc-700 text-zinc-300 px-1"
    />
    <button
      onClick={() => onChange(clamp(value + step, min, max))}
      className="w-6 h-6 flex items-center justify-center bg-zinc-800 border border-zinc-700 rounded text-zinc-400 hover:text-white hover:border-zinc-500 transition-colors"
    >
      <Plus size={10} />
    </button>
    {unit && <span className="text-[9px] text-zinc-600">{unit}</span>}
  </div>
);

const PropToggle = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) => (
  <div className="flex items-center justify-between">
    <span className="text-[10px] text-zinc-500">{label}</span>
    <Switch checked={checked} onCheckedChange={onChange} className="scale-75" />
  </div>
);

const CompBadge = ({ type, small = false }: { type: ComponentType; small?: boolean }) => {
  const def = COMPONENT_REGISTRY[type];
  return (
    <span
      className={`inline-flex items-center gap-1 font-bold uppercase tracking-wider rounded ${small ? "text-[8px] px-1.5 py-0.5" : "text-[9px] px-2 py-0.5"}`}
      style={{ backgroundColor: def.color + "18", color: def.color, border: `1px solid ${def.color}30` }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: def.color }} />
      {def.label}
    </span>
  );
};

const AlignButtons = ({ value, onChange }: { value: TextAlignment; onChange: (v: TextAlignment) => void }) => {
  const opts: { v: TextAlignment; icon: React.ElementType }[] = [
    { v: "left", icon: AlignLeft },
    { v: "center", icon: AlignCenter },
    { v: "right", icon: AlignRight },
    { v: "justify", icon: AlignJustify },
  ];
  return (
    <div className="flex gap-0.5 bg-zinc-800/50 p-0.5 rounded border border-zinc-700/50">
      {opts.map((o) => (
        <button
          key={o.v}
          onClick={() => onChange(o.v)}
          className={`w-6 h-6 flex items-center justify-center rounded transition-colors ${value === o.v ? "bg-indigo-600 text-white" : "text-zinc-500 hover:text-zinc-300"}`}
        >
          <o.icon size={12} />
        </button>
      ))}
    </div>
  );
};

const TransformButtons = ({ value, onChange }: { value: TextTransform; onChange: (v: TextTransform) => void }) => {
  const opts: { v: TextTransform; label: string }[] = [
    { v: "none", label: "Aa" },
    { v: "uppercase", label: "AA" },
    { v: "lowercase", label: "aa" },
    { v: "capitalize", label: "Aa" },
  ];
  return (
    <div className="flex gap-0.5 bg-zinc-800/50 p-0.5 rounded border border-zinc-700/50">
      {opts.map((o) => (
        <button
          key={o.v}
          onClick={() => onChange(o.v)}
          className={`px-2 h-6 flex items-center justify-center rounded text-[10px] font-semibold transition-colors ${value === o.v ? "bg-indigo-600 text-white" : "text-zinc-500 hover:text-zinc-300"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
};

// ============================================================================
// 7. SVG ICON WORKAROUNDS
// ============================================================================

function SearchIcon(props: React.SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={props.size || 24} height={props.size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function SparklesIcon(props: React.SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={props.size || 24} height={props.size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
      <path d="M5 3v4" />
      <path d="M19 17v4" />
      <path d="M3 5h4" />
      <path d="M17 19h4" />
    </svg>
  );
}

// ============================================================================
// 8. MAIN BUILDER COMPONENT
// ============================================================================

export default function ReportTemplateBuilder() {
  const params = useParams();
  const router = useRouter();
  const templateId = params.id === "new" ? null : (params.id as string);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [template, setTemplate] = useState<TemplateState>(
    deepClone(DEFAULT_TEMPLATE),
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(55);
  const [rightTab, setRightTab] = useState("properties");
  const [previewMode, setPreviewMode] = useState(false);
  const [showJsonEditor, setShowJsonEditor] = useState(false);
  const [jsonText, setJsonText] = useState("");
  const [paletteSearch, setPaletteSearch] = useState("");
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  // --- LOAD ---
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      if (templateId) {
        try {
          const data = await getTemplateById(templateId);
          if (data) {
            let parsed =
              typeof data.config === "string"
                ? JSON.parse(data.config)
                : data.config;
            if (parsed.components) {
              setTemplate(parsed);
            } else {
              setTemplate(mergeOldConfig(parsed));
            }
            setTemplate((prev) => ({ ...prev, name: data.name || prev.name }));
          }
        } catch {
          toast.error("Failed to load template");
        }
      }
      setLoading(false);
    };
    init();
  }, [templateId]);

  // --- KEYBOARD ---
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        e.preventDefault();
        removeComponent(selectedId);
      }
      if (e.key === "d" && (e.ctrlKey || e.metaKey) && selectedId) {
        e.preventDefault();
        duplicateComponent(selectedId);
      }
      if (e.key === "Escape") setSelectedId(null);
      if (selectedId) {
        const step = e.shiftKey ? 10 : 1;
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          nudgeComponent(selectedId, -step, 0);
        }
        if (e.key === "ArrowRight") {
          e.preventDefault();
          nudgeComponent(selectedId, step, 0);
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          nudgeComponent(selectedId, 0, -step);
        }
        if (e.key === "ArrowDown") {
          e.preventDefault();
          nudgeComponent(selectedId, 0, step);
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedId, template]);

  // --- SYNC JSON ---
  useEffect(() => {
    if (showJsonEditor) setJsonText(JSON.stringify(template, null, 2));
  }, [showJsonEditor, template]);

  // --- COMPUTED ---
  const selectedComponent = useMemo(
    () => template.components.find((c) => c.id === selectedId) || null,
    [template.components, selectedId],
  );

  const maxZIndex = useMemo(
    () => Math.max(0, ...template.components.map((c) => c.zIndex)),
    [template.components],
  );

  // --- HANDLERS ---
  const handleSave = async () => {
    if (!template.name.trim()) return toast.error("Template name required");
    setSaving(true);
    try {
      await saveTemplate(templateId, template.name, template);
      toast.success("Template saved!");
      if (!templateId) router.push("/workspace/settings/templates");
    } catch {
      toast.error("Save failed");
    }
    setSaving(false);
  };

  const addComponent = useCallback(
    (type: ComponentType) => {
      const def = COMPONENT_REGISTRY[type];
      const newComp = createComponent(type, {
        x: 50 + Math.random() * 100,
        y: 50 + Math.random() * 100,
        zIndex: maxZIndex + 1,
      });
      setTemplate((prev) => ({
        ...prev,
        components: [...prev.components, newComp],
      }));
      setSelectedId(newComp.id);
      setRightTab("properties");
      toast.success(`Added ${def.label}`);
    },
    [maxZIndex],
  );

  const removeComponent = useCallback(
    (id: string) => {
      setTemplate((prev) => ({
        ...prev,
        components: prev.components.filter((c) => c.id !== id),
      }));
      if (selectedId === id) setSelectedId(null);
    },
    [selectedId],
  );

  const duplicateComponent = useCallback(
    (id: string) => {
      const comp = template.components.find((c) => c.id === id);
      if (!comp) return;
      const dup = deepClone(comp);
      dup.id = genId();
      dup.name = comp.name + " (copy)";
      dup.x += 20;
      dup.y += 20;
      dup.zIndex = maxZIndex + 1;
      setTemplate((prev) => ({
        ...prev,
        components: [...prev.components, dup],
      }));
      setSelectedId(dup.id);
      toast.success("Duplicated");
    },
    [template.components, maxZIndex],
  );

  const nudgeComponent = useCallback((id: string, dx: number, dy: number) => {
    setTemplate((prev) => ({
      ...prev,
      components: prev.components.map((c) =>
        c.id === id ? { ...c, x: c.x + dx, y: c.y + dy } : c,
      ),
    }));
  }, []);

  const updateComponent = useCallback(
    (id: string, updates: Partial<ReportComponent>) => {
      setTemplate((prev) => ({
        ...prev,
        components: prev.components.map((c) =>
          c.id === id ? { ...c, ...updates } : c,
        ),
      }));
    },
    [],
  );

  const updateStyle = useCallback(
    (id: string, styleUpdates: Partial<ComponentStyle>) => {
      setTemplate((prev) => ({
        ...prev,
        components: prev.components.map((c) =>
          c.id === id ? { ...c, style: { ...c.style, ...styleUpdates } } : c,
        ),
      }));
    },
    [],
  );

  const updateData = useCallback(
    (id: string, dataUpdates: Record<string, any>) => {
      setTemplate((prev) => ({
        ...prev,
        components: prev.components.map((c) =>
          c.id === id ? { ...c, data: { ...c.data, ...dataUpdates } } : c,
        ),
      }));
    },
    [],
  );

  const moveZ = useCallback(
    (id: string, direction: "up" | "down" | "top" | "bottom") => {
      setTemplate((prev) => {
        const sorted = [...prev.components].sort((a, b) => a.zIndex - b.zIndex);
        const idx = sorted.findIndex((c) => c.id === id);
        if (idx === -1) return prev;
        if (direction === "top") {
          sorted[idx].zIndex = maxZIndex + 1;
        } else if (direction === "bottom") {
          sorted[idx].zIndex = 0;
          sorted.forEach((c, i) => {
            if (c.id !== id) c.zIndex = i + 1;
          });
        } else if (direction === "up" && idx < sorted.length - 1) {
          const temp = sorted[idx].zIndex;
          sorted[idx].zIndex = sorted[idx + 1].zIndex;
          sorted[idx + 1].zIndex = temp;
        } else if (direction === "down" && idx > 0) {
          const temp = sorted[idx].zIndex;
          sorted[idx].zIndex = sorted[idx - 1].zIndex;
          sorted[idx - 1].zIndex = temp;
        }
        return {
          ...prev,
          components: prev.components.map(
            (c) => sorted.find((s) => s.id === c.id) || c,
          ),
        };
      });
    },
    [maxZIndex],
  );

  const handleImageUpload = useCallback(
    (file: File, compId: string, dataKey = "imageUrl") => {
      const reader = new FileReader();
      reader.onloadend = () =>
        updateData(compId, { [dataKey]: reader.result as string });
      reader.readAsDataURL(file);
    },
    [updateData],
  );

  const handlePageImageUpload = useCallback((file: File, key: string) => {
    const reader = new FileReader();
    reader.onloadend = () =>
      setTemplate((prev) => ({
        ...prev,
        page: { ...prev.page, [key]: reader.result as string },
      }));
    reader.readAsDataURL(file);
  }, []);

  const handleApplyJson = () => {
    try {
      const parsed = JSON.parse(jsonText);
      if (parsed.components) {
        setTemplate(parsed);
        toast.success("JSON applied");
        setShowJsonEditor(false);
      } else {
        toast.error("Invalid template format");
      }
    } catch {
      toast.error("Invalid JSON");
    }
  };

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(template, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${template.name.replace(/\s+/g, "_")}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported");
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        if (parsed.components) {
          setTemplate(parsed);
          toast.success("Imported");
        } else {
          toast.error("Invalid file");
        }
      } catch {
        toast.error("Invalid JSON");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const resetComponentStyle = (id: string) => {
    const comp = template.components.find((c) => c.id === id);
    if (!comp) return;
    const def = COMPONENT_REGISTRY[comp.type];
    updateComponent(id, { style: { ...DEFAULT_STYLE, ...def.defaultStyle } });
    toast.success("Style reset");
  };

  // ============================================================================
  // 9. PROPERTY PANEL SECTIONS
  // ============================================================================

  const renderIdentitySection = (comp: ReportComponent) => (
    <PropSection
      title="Identity"
      icon={MousePointer2}
      color={COMPONENT_REGISTRY[comp.type].color}
      defaultOpen={true}>
      <div className="flex items-center justify-between">
        <CompBadge type={comp.type} />
        <div className="flex gap-1">
          <button
            onClick={() => duplicateComponent(comp.id)}
            title="Duplicate"
            className="w-6 h-6 flex items-center justify-center rounded border border-zinc-700 text-zinc-500 hover:text-indigo-400 hover:border-indigo-500/50 transition-colors">
            <Copy size={11} />
          </button>
          <button
            onClick={() => moveZ(comp.id, "up")}
            title="Forward"
            className="w-6 h-6 flex items-center justify-center rounded border border-zinc-700 text-zinc-500 hover:text-emerald-400 hover:border-emerald-500/50 transition-colors">
            <ArrowUpToLine size={11} />
          </button>
          <button
            onClick={() => moveZ(comp.id, "down")}
            title="Backward"
            className="w-6 h-6 flex items-center justify-center rounded border border-zinc-700 text-zinc-500 hover:text-amber-400 hover:border-amber-500/50 transition-colors">
            <ArrowDownToLine size={11} />
          </button>
          <button
            onClick={() => updateComponent(comp.id, { locked: !comp.locked })}
            title={comp.locked ? "Unlock" : "Lock"}
            className={`w-6 h-6 flex items-center justify-center rounded border transition-colors ${comp.locked ? "border-red-500/50 text-red-400 bg-red-500/10" : "border-zinc-700 text-zinc-500 hover:text-amber-400 hover:border-amber-500/50"}`}>
            {comp.locked ? <Lock size={11} /> : <Unlock size={11} />}
          </button>
          <button
            onClick={() => removeComponent(comp.id)}
            title="Delete"
            className="w-6 h-6 flex items-center justify-center rounded border border-zinc-700 text-zinc-500 hover:text-red-400 hover:border-red-500/50 transition-colors">
            <Trash2 size={11} />
          </button>
        </div>
      </div>
      <PropRow label="Name">
        <Input
          value={comp.name}
          onChange={(e) => updateComponent(comp.id, { name: e.target.value })}
          className="h-6 text-[10px] bg-zinc-800/50 border-zinc-700 text-zinc-300"
        />
      </PropRow>
      <PropRow label="Z-Index">
        <PropNumber
          value={comp.zIndex}
          min={0}
          max={999}
          onChange={(v) => updateComponent(comp.id, { zIndex: v })}
        />
      </PropRow>
      <PropToggle
        label="Visible"
        checked={comp.visible}
        onChange={(v) => updateComponent(comp.id, { visible: v })}
      />
    </PropSection>
  );

  const renderPositionSection = (comp: ReportComponent) => (
    <PropSection title="Position & Size" icon={Move} color="#f59e0b">
      <PropRow label="X">
        <PropSlider
          value={Math.round(comp.x)}
          min={-100}
          max={PAGE_W + 100}
          onChange={(v) => updateComponent(comp.id, { x: v })}
          unit="px"
          color="#f59e0b"
        />
      </PropRow>
      <PropRow label="Y">
        <PropSlider
          value={Math.round(comp.y)}
          min={-100}
          max={PAGE_H + 100}
          onChange={(v) => updateComponent(comp.id, { y: v })}
          unit="px"
          color="#f59e0b"
        />
      </PropRow>
      <PropRow label="Width">
        <PropSlider
          value={Math.round(comp.width)}
          min={10}
          max={PAGE_W + 200}
          onChange={(v) => updateComponent(comp.id, { width: v })}
          unit="px"
          color="#f59e0b"
        />
      </PropRow>
      <PropRow label="Height">
        <PropSlider
          value={Math.round(comp.height)}
          min={4}
          max={PAGE_H + 200}
          onChange={(v) => updateComponent(comp.id, { height: v })}
          unit="px"
          color="#f59e0b"
        />
      </PropRow>
      <div className="grid grid-cols-3 gap-1 pt-1">
        {[
          { l: "TL", x: 0, y: 0 },
          { l: "TC", x: Math.round((PAGE_W - comp.width) / 2), y: 0 },
          { l: "TR", x: PAGE_W - comp.width, y: 0 },
          { l: "ML", x: 0, y: Math.round((PAGE_H - comp.height) / 2) },
          {
            l: "Center",
            x: Math.round((PAGE_W - comp.width) / 2),
            y: Math.round((PAGE_H - comp.height) / 2),
          },
          {
            l: "MR",
            x: PAGE_W - comp.width,
            y: Math.round((PAGE_H - comp.height) / 2),
          },
          { l: "BL", x: 0, y: PAGE_H - comp.height },
          {
            l: "BC",
            x: Math.round((PAGE_W - comp.width) / 2),
            y: PAGE_H - comp.height,
          },
          { l: "BR", x: PAGE_W - comp.width, y: PAGE_H - comp.height },
        ].map((p) => (
          <button
            key={p.l}
            onClick={() => updateComponent(comp.id, { x: p.x, y: p.y })}
            className="text-[8px] py-1 border border-zinc-700 rounded text-zinc-500 hover:text-zinc-300 hover:border-zinc-500 transition-colors">
            {p.l}
          </button>
        ))}
      </div>
    </PropSection>
  );

  const renderTypographySection = (comp: ReportComponent) => {
    if (
      !COMPONENT_REGISTRY[comp.type].isTextBased &&
      comp.type !== "APPROVAL_STAMP" &&
      comp.type !== "DISCLAIMER"
    )
      return null;
    const s = comp.style;
    return (
      <PropSection title="Typography" icon={Type} color="#3b82f6">
        <PropRow label="Font">
          <Select
            value={s.fontFamily}
            onValueChange={(v) => updateStyle(comp.id, { fontFamily: v })}>
            <SelectTrigger className="h-6 text-[10px] bg-zinc-800/50 border-zinc-700 text-zinc-300 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-48">
              {FONT_FAMILIES.map((f) => (
                <SelectItem key={f.value} value={f.value} className="text-xs">
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </PropRow>
        <PropRow label="Size">
          <PropSlider
            value={s.fontSize}
            min={5}
            max={72}
            step={0.5}
            onChange={(v) => updateStyle(comp.id, { fontSize: v })}
            unit="px"
            color="#3b82f6"
          />
        </PropRow>
        <PropRow label="Weight">
          <Select
            value={String(s.fontWeight)}
            onValueChange={(v) =>
              updateStyle(comp.id, { fontWeight: Number(v) })
            }>
            <SelectTrigger className="h-6 text-[10px] bg-zinc-800/50 border-zinc-700 text-zinc-300 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FONT_WEIGHTS.map((w) => (
                <SelectItem
                  key={w.value}
                  value={String(w.value)}
                  className="text-xs">
                  {w.label} ({w.value})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </PropRow>
        <PropRow label="Style">
          <div className="flex gap-0.5 bg-zinc-800/50 p-0.5 rounded border border-zinc-700/50">
            <button
              onClick={() =>
                updateStyle(comp.id, {
                  fontStyle: s.fontStyle === "normal" ? "italic" : "normal",
                })
              }
              className={`w-6 h-6 flex items-center justify-center rounded transition-colors ${s.fontStyle === "italic" ? "bg-blue-600 text-white" : "text-zinc-500 hover:text-zinc-300"}`}>
              <Italic size={12} />
            </button>
            <button
              onClick={() =>
                updateStyle(comp.id, {
                  textDecoration:
                    s.textDecoration === "underline" ? "none" : "underline",
                })
              }
              className={`w-6 h-6 flex items-center justify-center rounded transition-colors ${s.textDecoration === "underline" ? "bg-blue-600 text-white" : "text-zinc-500 hover:text-zinc-300"}`}>
              <Underline size={12} />
            </button>
            <button
              onClick={() =>
                updateStyle(comp.id, {
                  textDecoration:
                    s.textDecoration === "line-through"
                      ? "none"
                      : "line-through",
                })
              }
              className={`w-6 h-6 flex items-center justify-center rounded transition-colors ${s.textDecoration === "line-through" ? "bg-blue-600 text-white" : "text-zinc-500 hover:text-zinc-300"}`}>
              <Strikethrough size={12} />
            </button>
          </div>
        </PropRow>
        <PropRow label="Color">
          <PropColor
            value={s.color}
            onChange={(v) => updateStyle(comp.id, { color: v })}
            presets={[
              "#000000",
              "#0f172a",
              "#1e3a8a",
              "#dc2626",
              "#16a34a",
              "#64748b",
              "#ffffff",
            ]}
          />
        </PropRow>
        <PropRow label="Align">
          <AlignButtons
            value={s.textAlign}
            onChange={(v) => updateStyle(comp.id, { textAlign: v })}
          />
        </PropRow>
        <PropRow label="Transform">
          <TransformButtons
            value={s.textTransform}
            onChange={(v) => updateStyle(comp.id, { textTransform: v })}
          />
        </PropRow>
        <PropRow label="Spacing">
          <PropSlider
            value={s.letterSpacing}
            min={-2}
            max={20}
            step={0.5}
            onChange={(v) => updateStyle(comp.id, { letterSpacing: v })}
            unit="px"
            color="#3b82f6"
          />
        </PropRow>
        <PropRow label="Line Ht">
          <PropSlider
            value={s.lineHeight}
            min={0.6}
            max={4}
            step={0.1}
            onChange={(v) => updateStyle(comp.id, { lineHeight: v })}
            unit="x"
            color="#3b82f6"
          />
        </PropRow>
        <PropRow label="Wrap">
          <Select
            value={s.whiteSpace}
            onValueChange={(v) =>
              updateStyle(comp.id, { whiteSpace: v as WhiteSpaceType })
            }>
            <SelectTrigger className="h-6 text-[10px] bg-zinc-800/50 border-zinc-700 text-zinc-300 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(
                ["normal", "nowrap", "pre", "pre-wrap"] as WhiteSpaceType[]
              ).map((w) => (
                <SelectItem key={w} value={w} className="text-xs capitalize">
                  {w}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </PropRow>
      </PropSection>
    );
  };

  const renderBackgroundSection = (comp: ReportComponent) => {
    const s = comp.style;
    return (
      <PropSection
        title="Background"
        icon={Palette}
        color="#8b5cf6"
        defaultOpen={false}>
        <PropRow label="Color">
          <PropColor
            value={s.bgColor}
            onChange={(v) => updateStyle(comp.id, { bgColor: v })}
            presets={[
              "transparent",
              "#ffffff",
              "#f8fafc",
              "#f1f5f9",
              "#e0e7ff",
              "#fef3c7",
              "#dcfce7",
              "#fee2e2",
              "#1e3a8a",
              "#0f172a",
            ]}
          />
        </PropRow>
        {s.bgColor !== "transparent" && (
          <PropRow label="Opacity">
            <PropSlider
              value={s.bgOpacity}
              min={0}
              max={100}
              onChange={(v) => updateStyle(comp.id, { bgOpacity: v })}
              unit="%"
              color="#8b5cf6"
            />
          </PropRow>
        )}
      </PropSection>
    );
  };

  const renderBorderSection = (comp: ReportComponent) => {
    const s = comp.style;
    return (
      <PropSection
        title="Border"
        icon={Frame}
        color="#ec4899"
        defaultOpen={false}>
        <PropToggle
          label="Individual Sides"
          checked={s.useIndividualBorders}
          onChange={(v) => updateStyle(comp.id, { useIndividualBorders: v })}
        />
        {!s.useIndividualBorders ? (
          <>
            <PropRow label="Width">
              <PropSlider
                value={s.borderWidth}
                min={0}
                max={20}
                onChange={(v) => updateStyle(comp.id, { borderWidth: v })}
                unit="px"
                color="#ec4899"
              />
            </PropRow>
            <PropRow label="Style">
              <Select
                value={s.borderStyle}
                onValueChange={(v) =>
                  updateStyle(comp.id, { borderStyle: v as BorderStyle })
                }>
                <SelectTrigger className="h-6 text-[10px] bg-zinc-800/50 border-zinc-700 text-zinc-300 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(
                    [
                      "none",
                      "solid",
                      "dashed",
                      "dotted",
                      "double",
                    ] as BorderStyle[]
                  ).map((bs) => (
                    <SelectItem
                      key={bs}
                      value={bs}
                      className="text-xs capitalize">
                      {bs}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </PropRow>
            <PropRow label="Color">
              <PropColor
                value={s.borderColor}
                onChange={(v) => updateStyle(comp.id, { borderColor: v })}
              />
            </PropRow>
          </>
        ) : (
          <>
            {(["Top", "Right", "Bottom", "Left"] as const).map((side) => {
              const wKey = `border${side}Width` as keyof ComponentStyle;
              const cKey = `border${side}Color` as keyof ComponentStyle;
              const sKey = `border${side}Style` as keyof ComponentStyle;
              return (
                <div
                  key={side}
                  className="space-y-1.5 pb-2 border-b border-zinc-800/50">
                  <span className="text-[9px] text-zinc-600 uppercase font-bold">
                    {side}
                  </span>
                  <PropRow label="Width">
                    <PropSlider
                      value={s[wKey] as number}
                      min={0}
                      max={20}
                      onChange={(v) => updateStyle(comp.id, { [wKey]: v })}
                      unit="px"
                      color="#ec4899"
                    />
                  </PropRow>
                  <PropRow label="Style">
                    <Select
                      value={s[sKey] as string}
                      onValueChange={(v) =>
                        updateStyle(comp.id, { [sKey]: v })
                      }>
                      <SelectTrigger className="h-6 text-[10px] bg-zinc-800/50 border-zinc-700 text-zinc-300 w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(
                          ["none", "solid", "dashed", "dotted"] as BorderStyle[]
                        ).map((bs) => (
                          <SelectItem
                            key={bs}
                            value={bs}
                            className="text-xs capitalize">
                            {bs}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </PropRow>
                  <PropRow label="Color">
                    <PropColor
                      value={s[cKey] as string}
                      onChange={(v) => updateStyle(comp.id, { [cKey]: v })}
                    />
                  </PropRow>
                </div>
              );
            })}
          </>
        )}
        <PropToggle
          label="Individual Radius"
          checked={s.useIndividualRadius}
          onChange={(v) => updateStyle(comp.id, { useIndividualRadius: v })}
        />
        {!s.useIndividualRadius ? (
          <PropRow label="Radius">
            <PropSlider
              value={s.borderRadius}
              min={0}
              max={100}
              onChange={(v) => updateStyle(comp.id, { borderRadius: v })}
              unit="px"
              color="#ec4899"
            />
          </PropRow>
        ) : (
          <>
            {(
              ["TopLeft", "TopRight", "BottomLeft", "BottomRight"] as const
            ).map((corner) => {
              const key = `border${corner}Radius` as keyof ComponentStyle;
              return (
                <PropRow
                  key={corner}
                  label={corner.replace(/([A-Z])/g, " $1").trim()}>
                  <PropSlider
                    value={s[key] as number}
                    min={0}
                    max={100}
                    onChange={(v) => updateStyle(comp.id, { [key]: v })}
                    unit="px"
                    color="#ec4899"
                  />
                </PropRow>
              );
            })}
          </>
        )}
      </PropSection>
    );
  };

  const renderSpacingSection = (comp: ReportComponent) => {
    const s = comp.style;
    return (
      <PropSection
        title="Padding"
        icon={Ruler}
        color="#14b8a6"
        defaultOpen={false}>
        <PropRow label="Top">
          <PropSlider
            value={s.paddingTop}
            min={0}
            max={100}
            onChange={(v) => updateStyle(comp.id, { paddingTop: v })}
            unit="px"
            color="#14b8a6"
          />
        </PropRow>
        <PropRow label="Right">
          <PropSlider
            value={s.paddingRight}
            min={0}
            max={100}
            onChange={(v) => updateStyle(comp.id, { paddingRight: v })}
            unit="px"
            color="#14b8a6"
          />
        </PropRow>
        <PropRow label="Bottom">
          <PropSlider
            value={s.paddingBottom}
            min={0}
            max={100}
            onChange={(v) => updateStyle(comp.id, { paddingBottom: v })}
            unit="px"
            color="#14b8a6"
          />
        </PropRow>
        <PropRow label="Left">
          <PropSlider
            value={s.paddingLeft}
            min={0}
            max={100}
            onChange={(v) => updateStyle(comp.id, { paddingLeft: v })}
            unit="px"
            color="#14b8a6"
          />
        </PropRow>
        <div className="flex gap-2 pt-1">
          <button
            onClick={() =>
              updateStyle(comp.id, {
                paddingTop: 0,
                paddingRight: 0,
                paddingBottom: 0,
                paddingLeft: 0,
              })
            }
            className="flex-1 text-[9px] py-1 border border-zinc-700 rounded text-zinc-500 hover:text-zinc-300 transition-colors">
            Reset
          </button>
          <button
            onClick={() => {
              const v = 8;
              updateStyle(comp.id, {
                paddingTop: v,
                paddingRight: v,
                paddingBottom: v,
                paddingLeft: v,
              });
            }}
            className="flex-1 text-[9px] py-1 border border-zinc-700 rounded text-zinc-500 hover:text-zinc-300 transition-colors">
            8px
          </button>
          <button
            onClick={() => {
              const v = 16;
              updateStyle(comp.id, {
                paddingTop: v,
                paddingRight: v,
                paddingBottom: v,
                paddingLeft: v,
              });
            }}
            className="flex-1 text-[9px] py-1 border border-zinc-700 rounded text-zinc-500 hover:text-zinc-300 transition-colors">
            16px
          </button>
        </div>
      </PropSection>
    );
  };

  const renderEffectsSection = (comp: ReportComponent) => {
    const s = comp.style;
    return (
      <PropSection
        title="Effects"
        icon={SparklesIcon}
        color="#f59e0b"
        defaultOpen={false}>
        <PropRow label="Opacity">
          <PropSlider
            value={s.opacity}
            min={0}
            max={100}
            onChange={(v) => updateStyle(comp.id, { opacity: v })}
            unit="%"
            color="#f59e0b"
          />
        </PropRow>
        <PropRow label="Rotation">
          <PropSlider
            value={s.rotation}
            min={-180}
            max={180}
            onChange={(v) => updateStyle(comp.id, { rotation: v })}
            unit="deg"
            color="#f59e0b"
          />
        </PropRow>
        <PropRow label="Overflow">
          <Select
            value={s.overflow}
            onValueChange={(v) =>
              updateStyle(comp.id, { overflow: v as OverflowType })
            }>
            <SelectTrigger className="h-6 text-[10px] bg-zinc-800/50 border-zinc-700 text-zinc-300 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(["visible", "hidden", "auto", "scroll"] as OverflowType[]).map(
                (o) => (
                  <SelectItem key={o} value={o} className="text-xs capitalize">
                    {o}
                  </SelectItem>
                ),
              )}
            </SelectContent>
          </Select>
        </PropRow>
        {COMPONENT_REGISTRY[comp.type].isImageBased && (
          <PropRow label="Obj. Fit">
            <Select
              value={s.objectFit}
              onValueChange={(v) =>
                updateStyle(comp.id, { objectFit: v as ObjectFitType })
              }>
              <SelectTrigger className="h-6 text-[10px] bg-zinc-800/50 border-zinc-700 text-zinc-300 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(
                  [
                    "cover",
                    "contain",
                    "fill",
                    "none",
                    "scale-down",
                  ] as ObjectFitType[]
                ).map((o) => (
                  <SelectItem key={o} value={o} className="text-xs capitalize">
                    {o}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </PropRow>
        )}
      </PropSection>
    );
  };

  // ============================================================================
  // 10. TYPE-SPECIFIC SECTIONS
  // ============================================================================

  const renderTypeSpecificSection = (comp: ReportComponent) => {
    const d = comp.data;
    const def = COMPONENT_REGISTRY[comp.type];

    if (comp.type === "TEXT" || comp.type === "RICH_TEXT") {
      return (
        <PropSection
          title="Content"
          icon={PenTool}
          color={def.color}
          defaultOpen={true}>
          <Textarea
            value={d.content || ""}
            onChange={(e) => updateData(comp.id, { content: e.target.value })}
            className="text-[10px] font-mono min-h-[60px] bg-zinc-800/50 border-zinc-700 text-zinc-300 resize-y"
            placeholder="Enter text..."
          />
          <div className="flex flex-wrap gap-1 pt-1">
            {[
              { l: "Name", t: "{{patient.name}}" },
              { l: "Age", t: "{{patient.age}}" },
              { l: "Gender", t: "{{patient.gender}}" },
              { l: "ID", t: "{{patient.patientId}}" },
              { l: "Sample", t: "{{sample.sampleId}}" },
              { l: "Date", t: "{{system.currentDate}}" },
            ].map((m) => (
              <button
                key={m.t}
                onClick={() =>
                  updateData(comp.id, {
                    content: (d.content || "") + m.t + " ",
                  })
                }
                className="text-[7px] bg-zinc-800 border border-zinc-700 text-zinc-400 px-1.5 py-0.5 rounded hover:bg-indigo-500/20 hover:text-indigo-300 hover:border-indigo-500/30 transition-colors">
                +{m.l}
              </button>
            ))}
          </div>
        </PropSection>
      );
    }

    if (def.category === "dynamic" && d.label !== undefined) {
      return (
        <PropSection
          title="Field Settings"
          icon={Settings2}
          color={def.color}
          defaultOpen={true}>
          <PropToggle
            label="Show Label"
            checked={d.showLabel !== false}
            onChange={(v) => updateData(comp.id, { showLabel: v })}
          />
          {d.showLabel !== false && (
            <PropRow label="Label">
              <Input
                value={d.label || ""}
                onChange={(e) => updateData(comp.id, { label: e.target.value })}
                className="h-6 text-[10px] bg-zinc-800/50 border-zinc-700 text-zinc-300"
              />
            </PropRow>
          )}
          <PropRow label="Preview">
            <Input
              value={d.value || ""}
              onChange={(e) => updateData(comp.id, { value: e.target.value })}
              className="h-6 text-[10px] bg-zinc-800/50 border-zinc-700 text-zinc-300 font-mono"
            />
          </PropRow>
        </PropSection>
      );
    }

    if (def.isImageBased) {
      return (
        <PropSection
          title="Image"
          icon={ImageIcon}
          color={def.color}
          defaultOpen={true}>
          <div className="space-y-2">
            <Label className="text-[10px] text-zinc-500">Upload Image</Label>
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleImageUpload(f, comp.id);
              }}
              className="text-[10px] h-7 bg-zinc-800/50 border-zinc-700 text-zinc-400"
            />
          </div>
          {d.imageUrl && (
            <div className="mt-2 border border-zinc-800 rounded overflow-hidden bg-zinc-900/50">
              <img
                src={d.imageUrl}
                alt="Preview"
                className="w-full h-20 object-contain"
              />
            </div>
          )}
          <PropRow label="Alt Text">
            <Input
              value={d.altText || ""}
              onChange={(e) => updateData(comp.id, { altText: e.target.value })}
              className="h-6 text-[10px] bg-zinc-800/50 border-zinc-700 text-zinc-300"
            />
          </PropRow>
          {d.imageUrl && (
            <button
              onClick={() => updateData(comp.id, { imageUrl: "" })}
              className="w-full text-[9px] py-1.5 border border-red-500/30 text-red-400 rounded hover:bg-red-500/10 transition-colors">
              Remove Image
            </button>
          )}
          {comp.type === "SIGNATURE" && (
            <>
              <PropToggle
                label="Show Details"
                checked={d.showDetails !== false}
                onChange={(v) => updateData(comp.id, { showDetails: v })}
              />
              {d.showDetails !== false && (
                <>
                  <PropRow label="Name">
                    <Input
                      value={d.name || ""}
                      onChange={(e) =>
                        updateData(comp.id, { name: e.target.value })
                      }
                      className="h-6 text-[10px] bg-zinc-800/50 border-zinc-700 text-zinc-300"
                    />
                  </PropRow>
                  <PropRow label="Qualif.">
                    <Input
                      value={d.qualifications || ""}
                      onChange={(e) =>
                        updateData(comp.id, { qualifications: e.target.value })
                      }
                      className="h-6 text-[10px] bg-zinc-800/50 border-zinc-700 text-zinc-300"
                    />
                  </PropRow>
                  <PropRow label="Title">
                    <Input
                      value={d.title || ""}
                      onChange={(e) =>
                        updateData(comp.id, { title: e.target.value })
                      }
                      className="h-6 text-[10px] bg-zinc-800/50 border-zinc-700 text-zinc-300"
                    />
                  </PropRow>
                </>
              )}
            </>
          )}
        </PropSection>
      );
    }

    if (comp.type === "BARCODE") {
      return (
        <PropSection
          title="Barcode"
          icon={BarcodeIcon}
          color={def.color}
          defaultOpen={true}>
          <PropRow label="Value">
            <Input
              value={d.value || ""}
              onChange={(e) => updateData(comp.id, { value: e.target.value })}
              className="h-6 text-[10px] bg-zinc-800/50 border-zinc-700 text-zinc-300 font-mono"
            />
          </PropRow>
          <PropRow label="Format">
            <Select
              value={d.format || "CODE128"}
              onValueChange={(v) => updateData(comp.id, { format: v })}>
              <SelectTrigger className="h-6 text-[10px] bg-zinc-800/50 border-zinc-700 text-zinc-300 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[
                  "CODE128",
                  "CODE39",
                  "EAN13",
                  "EAN8",
                  "UPC",
                  "ITF14",
                  "MSI",
                  "pharmacode",
                ].map((f) => (
                  <SelectItem key={f} value={f} className="text-xs">
                    {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </PropRow>
          <PropRow label="Bar Ht">
            <PropSlider
              value={d.barHeight || 35}
              min={15}
              max={100}
              onChange={(v) => updateData(comp.id, { barHeight: v })}
              unit="px"
              color="#ec4899"
            />
          </PropRow>
          <PropRow label="Scale">
            <PropSlider
              value={d.barScale || 1.5}
              min={0.5}
              max={4}
              step={0.1}
              onChange={(v) => updateData(comp.id, { barScale: v })}
              unit="x"
              color="#ec4899"
            />
          </PropRow>
          <PropToggle
            label="Show Value"
            checked={d.displayValue !== false}
            onChange={(v) => updateData(comp.id, { displayValue: v })}
          />
        </PropSection>
      );
    }

    if (comp.type === "QR_CODE") {
      return (
        <PropSection
          title="QR Code"
          icon={QrCode}
          color={def.color}
          defaultOpen={true}>
          <PropRow label="Value">
            <Input
              value={d.value || ""}
              onChange={(e) => updateData(comp.id, { value: e.target.value })}
              className="h-6 text-[10px] bg-zinc-800/50 border-zinc-700 text-zinc-300 font-mono"
            />
          </PropRow>
          <PropToggle
            label="Show Page #"
            checked={d.showPageNumber !== false}
            onChange={(v) => updateData(comp.id, { showPageNumber: v })}
          />
          <PropRow label="Error Corr.">
            <Select
              value={d.errorCorrection || "M"}
              onValueChange={(v) =>
                updateData(comp.id, { errorCorrection: v })
              }>
              <SelectTrigger className="h-6 text-[10px] bg-zinc-800/50 border-zinc-700 text-zinc-300 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["L", "M", "Q", "H"].map((l) => (
                  <SelectItem key={l} value={l} className="text-xs">
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </PropRow>
        </PropSection>
      );
    }

    if (comp.type === "RESULTS_TABLE") {
      return (
        <PropSection
          title="Table Config"
          icon={Table2}
          color={def.color}
          defaultOpen={true}>
          <PropToggle
            label="Show Header"
            checked={d.showHeader !== false}
            onChange={(v) => updateData(comp.id, { showHeader: v })}
          />
          <PropToggle
            label="Ref Range"
            checked={d.showRefRange !== false}
            onChange={(v) => updateData(comp.id, { showRefRange: v })}
          />
          <PropToggle
            label="Units"
            checked={d.showUnit !== false}
            onChange={(v) => updateData(comp.id, { showUnit: v })}
          />
          <PropToggle
            label="Dept. Groups"
            checked={d.showDepartmentGroup !== false}
            onChange={(v) => updateData(comp.id, { showDepartmentGroup: v })}
          />
          <PropRow label="Header BG">
            <PropColor
              value={d.headerBgColor || "#1e3a8a"}
              onChange={(v) => updateData(comp.id, { headerBgColor: v })}
            />
          </PropRow>
          <PropRow label="Header Txt">
            <PropColor
              value={d.headerTextColor || "#ffffff"}
              onChange={(v) => updateData(comp.id, { headerTextColor: v })}
            />
          </PropRow>
          <PropRow label="Alt Row BG">
            <PropColor
              value={d.rowAltColor || "#f1f5f9"}
              onChange={(v) => updateData(comp.id, { rowAltColor: v })}
              presets={[
                "transparent",
                "#f1f5f9",
                "#f0fdf4",
                "#fefce8",
                "#fdf2f8",
              ]}
            />
          </PropRow>
        </PropSection>
      );
    }

    if (comp.type === "SEPARATOR") {
      return (
        <PropSection
          title="Line"
          icon={Minus}
          color={def.color}
          defaultOpen={true}>
          <PropRow label="Thickness">
            <PropSlider
              value={d.thickness || 2}
              min={1}
              max={10}
              onChange={(v) => {
                updateData(comp.id, { thickness: v });
                updateStyle(comp.id, {
                  borderBottomWidth: v,
                  borderBottomColor:
                    v > 0 ? d.color || "#cbd5e1" : "transparent",
                });
              }}
              unit="px"
              color="#6b7280"
            />
          </PropRow>
          <PropRow label="Color">
            <PropColor
              value={d.color || "#cbd5e1"}
              onChange={(v) => {
                updateData(comp.id, { color: v });
                updateStyle(comp.id, { borderBottomColor: v });
              }}
            />
          </PropRow>
          <PropRow label="Style">
            <Select
              value={d.lineStyle || "solid"}
              onValueChange={(v) => {
                updateData(comp.id, { lineStyle: v });
                updateStyle(comp.id, { borderBottomStyle: v as BorderStyle });
              }}>
              <SelectTrigger className="h-6 text-[10px] bg-zinc-800/50 border-zinc-700 text-zinc-300 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(["solid", "dashed", "dotted", "double"] as BorderStyle[]).map(
                  (s) => (
                    <SelectItem
                      key={s}
                      value={s}
                      className="text-xs capitalize">
                      {s}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </PropRow>
        </PropSection>
      );
    }

    if (comp.type === "APPROVAL_STAMP") {
      return (
        <PropSection
          title="Stamp"
          icon={Stamp}
          color={def.color}
          defaultOpen={true}>
          <PropRow label="Text">
            <Input
              value={d.text || "APPROVED"}
              onChange={(e) => updateData(comp.id, { text: e.target.value })}
              className="h-6 text-[10px] bg-zinc-800/50 border-zinc-700 text-zinc-300 font-bold uppercase"
            />
          </PropRow>
          <PropRow label="Color">
            <PropColor
              value={d.stampColor || "#16a34a"}
              onChange={(v) => {
                updateData(comp.id, { stampColor: v });
                updateStyle(comp.id, { color: v, borderColor: v });
              }}
              presets={[
                "#16a34a",
                "#dc2626",
                "#2563eb",
                "#d97706",
                "#7c3aed",
                "#0f172a",
              ]}
            />
          </PropRow>
        </PropSection>
      );
    }

    if (comp.type === "DEPARTMENT_HEADER") {
      return (
        <PropSection
          title="Department"
          icon={Heading2}
          color={def.color}
          defaultOpen={true}>
          <PropRow label="Title">
            <Input
              value={d.title || ""}
              onChange={(e) => updateData(comp.id, { title: e.target.value })}
              className="h-6 text-[10px] bg-zinc-800/50 border-zinc-700 text-zinc-300 font-bold uppercase"
            />
          </PropRow>
        </PropSection>
      );
    }

    if (comp.type === "BOX_CONTAINER") {
      return (
        <PropSection
          title="Box"
          icon={Box}
          color={def.color}
          defaultOpen={true}>
          <PropToggle
            label="Show Title"
            checked={d.showTitle !== false}
            onChange={(v) => updateData(comp.id, { showTitle: v })}
          />
          {d.showTitle !== false && (
            <PropRow label="Title">
              <Input
                value={d.title || ""}
                onChange={(e) => updateData(comp.id, { title: e.target.value })}
                className="h-6 text-[10px] bg-zinc-800/50 border-zinc-700 text-zinc-300 font-bold"
              />
            </PropRow>
          )}
        </PropSection>
      );
    }

    if (comp.type === "PAGE_NUMBER") {
      return (
        <PropSection
          title="Format"
          icon={Hash}
          color={def.color}
          defaultOpen={true}>
          <PropRow label="Template">
            <Input
              value={d.format || "Page {current} of {total}"}
              onChange={(e) => updateData(comp.id, { format: e.target.value })}
              className="h-6 text-[10px] bg-zinc-800/50 border-zinc-700 text-zinc-300 font-mono"
            />
          </PropRow>
          <div className="text-[8px] text-zinc-600">
            Use {"{current}"} and {"{total}"} as placeholders
          </div>
        </PropSection>
      );
    }

    if (comp.type === "DISCLAIMER") {
      return (
        <PropSection
          title="Disclaimer"
          icon={FileText}
          color={def.color}
          defaultOpen={true}>
          <Textarea
            value={d.content || ""}
            onChange={(e) => updateData(comp.id, { content: e.target.value })}
            className="text-[10px] font-mono min-h-[50px] bg-zinc-800/50 border-zinc-700 text-zinc-300 resize-y"
          />
        </PropSection>
      );
    }

    if (comp.type === "DATE_BLOCK") {
      return (
        <PropSection
          title="Date"
          icon={Clock}
          color={def.color}
          defaultOpen={true}>
          <PropToggle
            label="Show Label"
            checked={d.showLabel !== false}
            onChange={(v) => updateData(comp.id, { showLabel: v })}
          />
          <PropRow label="Label">
            <Input
              value={d.label || "Date"}
              onChange={(e) => updateData(comp.id, { label: e.target.value })}
              className="h-6 text-[10px] bg-zinc-800/50 border-zinc-700 text-zinc-300"
            />
          </PropRow>
          <PropRow label="Value">
            <Input
              value={d.value || ""}
              onChange={(e) => updateData(comp.id, { value: e.target.value })}
              className="h-6 text-[10px] bg-zinc-800/50 border-zinc-700 text-zinc-300 font-mono"
            />
          </PropRow>
          <PropRow label="Format">
            <Select
              value={d.dateFormat || "DD MMMM YYYY"}
              onValueChange={(v) => updateData(comp.id, { dateFormat: v })}>
              <SelectTrigger className="h-6 text-[10px] bg-zinc-800/50 border-zinc-700 text-zinc-300 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[
                  "DD/MM/YYYY",
                  "DD-MM-YYYY",
                  "DD MMMM YYYY",
                  "MMMM DD, YYYY",
                  "YYYY-MM-DD",
                  "DD MMM YY",
                ].map((f) => (
                  <SelectItem key={f} value={f} className="text-xs">
                    {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </PropRow>
        </PropSection>
      );
    }

    if (comp.type === "DIVIDER_DOTS") {
      return (
        <PropSection
          title="Dots"
          icon={SquareDot}
          color={def.color}
          defaultOpen={true}>
          <PropRow label="Char">
            <Input
              value={d.dotChar || "\u00B7"}
              onChange={(e) => updateData(comp.id, { dotChar: e.target.value })}
              className="h-6 w-16 text-[10px] bg-zinc-800/50 border-zinc-700 text-zinc-300 text-center"
            />
          </PropRow>
          <PropRow label="Repeat">
            <PropNumber
              value={d.repeatCount || 60}
              min={5}
              max={200}
              onChange={(v) => updateData(comp.id, { repeatCount: v })}
            />
          </PropRow>
        </PropSection>
      );
    }

    return null;
  };

  // ============================================================================
  // 11. FULL PROPERTY PANEL
  // ============================================================================

  const renderFullPropertyPanel = () => {
    if (!selectedComponent) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
          <div className="w-16 h-16 rounded-2xl bg-zinc-800/50 border border-zinc-700/50 flex items-center justify-center mb-4">
            <MousePointer2 size={24} className="text-zinc-600" />
          </div>
          <p className="text-sm text-zinc-500 font-medium">
            No Component Selected
          </p>
          <p className="text-[10px] text-zinc-600 mt-1">
            Click a component on the canvas or add one from the palette
          </p>
          <div className="mt-4 text-[9px] text-zinc-700 space-y-0.5 text-left">
            <p>
              <kbd className="px-1 py-0.5 bg-zinc-800 rounded text-zinc-500">
                Del
              </kbd>{" "}
              Delete
            </p>
            <p>
              <kbd className="px-1 py-0.5 bg-zinc-800 rounded text-zinc-500">
                Ctrl+D
              </kbd>{" "}
              Duplicate
            </p>
            <p>
              <kbd className="px-1 py-0.5 bg-zinc-800 rounded text-zinc-500">
                Arrows
              </kbd>{" "}
              Nudge 1px
            </p>
            <p>
              <kbd className="px-1 py-0.5 bg-zinc-800 rounded text-zinc-500">
                Shift+Arrows
              </kbd>{" "}
              Nudge 10px
            </p>
            <p>
              <kbd className="px-1 py-0.5 bg-zinc-800 rounded text-zinc-500">
                Esc
              </kbd>{" "}
              Deselect
            </p>
          </div>
        </div>
      );
    }
    const comp = selectedComponent;
    return (
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {renderIdentitySection(comp)}
        {renderPositionSection(comp)}
        {renderTypographySection(comp)}
        {renderBackgroundSection(comp)}
        {renderBorderSection(comp)}
        {renderSpacingSection(comp)}
        {renderEffectsSection(comp)}
        {renderTypeSpecificSection(comp)}
        <div className="p-3">
          <button
            onClick={() => resetComponentStyle(comp.id)}
            className="w-full py-2 text-[10px] border border-zinc-700 rounded text-zinc-500 hover:text-amber-400 hover:border-amber-500/30 transition-colors flex items-center justify-center gap-1.5">
            <RotateCcw size={11} /> Reset All Style to Defaults
          </button>
        </div>
      </div>
    );
  };

  // ============================================================================
  // 12. LAYERS PANEL
  // ============================================================================

  const renderLayersPanel = () => (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
      {[...template.components]
        .sort((a, b) => b.zIndex - a.zIndex)
        .map((comp) => {
          const isSelected = comp.id === selectedId;
          return (
            <div
              key={comp.id}
              onClick={() => {
                setSelectedId(comp.id);
                setRightTab("properties");
              }}
              className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-all group ${isSelected ? "bg-indigo-500/15 border border-indigo-500/30" : "border border-transparent hover:bg-zinc-800/50"}`}>
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: COMPONENT_REGISTRY[comp.type].color }}
              />
              <span className="text-[10px] text-zinc-300 flex-1 truncate">
                {comp.name}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  updateComponent(comp.id, { visible: !comp.visible });
                }}
                className={`shrink-0 ${comp.visible ? "text-zinc-500 hover:text-zinc-300" : "text-zinc-700 hover:text-zinc-500"}`}>
                <Eye size={11} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeComponent(comp.id);
                }}
                className="shrink-0 text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                <Trash2 size={10} />
              </button>
            </div>
          );
        })}
    </div>
  );

  // ============================================================================
  // 13. PAGE SETTINGS
  // ============================================================================

  const renderPageSettings = () => (
    <div className="flex-1 overflow-y-auto custom-scrollbar">
      <PropSection
        title="Page Size"
        icon={Maximize2}
        color="#6366f1"
        defaultOpen={true}>
        <div className="text-[10px] text-zinc-500 bg-zinc-800/30 rounded p-2 border border-zinc-800">
          A4: {PAGE_W} x {PAGE_H} px (96 DPI)
        </div>
      </PropSection>
      <PropSection
        title="Margins"
        icon={Ruler}
        color="#14b8a6"
        defaultOpen={true}>
        {(["top", "right", "bottom", "left"] as const).map((m) => (
          <PropRow key={m} label={m.charAt(0).toUpperCase() + m.slice(1)}>
            <PropSlider
              value={template.page.margins[m]}
              min={0}
              max={50}
              onChange={(v) =>
                setTemplate((prev) => ({
                  ...prev,
                  page: {
                    ...prev.page,
                    margins: { ...prev.page.margins, [m]: v },
                  },
                }))
              }
              unit="mm"
              color="#14b8a6"
            />
          </PropRow>
        ))}
      </PropSection>
      <PropSection
        title="Page Border"
        icon={Frame}
        color="#ec4899"
        defaultOpen={false}>
        <PropToggle
          label="Show Border"
          checked={template.page.border.show}
          onChange={(v) =>
            setTemplate((prev) => ({
              ...prev,
              page: { ...prev.page, border: { ...prev.page.border, show: v } },
            }))
          }
        />
        {template.page.border.show && (
          <>
            <PropRow label="Weight">
              <PropSlider
                value={template.page.border.weight}
                min={1}
                max={10}
                onChange={(v) =>
                  setTemplate((prev) => ({
                    ...prev,
                    page: {
                      ...prev.page,
                      border: { ...prev.page.border, weight: v },
                    },
                  }))
                }
                unit="px"
                color="#ec4899"
              />
            </PropRow>
            <PropRow label="Inset">
              <PropSlider
                value={template.page.border.padding}
                min={0}
                max={50}
                onChange={(v) =>
                  setTemplate((prev) => ({
                    ...prev,
                    page: {
                      ...prev.page,
                      border: { ...prev.page.border, padding: v },
                    },
                  }))
                }
                unit="px"
                color="#ec4899"
              />
            </PropRow>
            <PropRow label="Radius">
              <PropSlider
                value={template.page.border.radius}
                min={0}
                max={30}
                onChange={(v) =>
                  setTemplate((prev) => ({
                    ...prev,
                    page: {
                      ...prev.page,
                      border: { ...prev.page.border, radius: v },
                    },
                  }))
                }
                unit="px"
                color="#ec4899"
              />
            </PropRow>
            <PropRow label="Color">
              <PropColor
                value={template.page.border.color}
                onChange={(v) =>
                  setTemplate((prev) => ({
                    ...prev,
                    page: {
                      ...prev.page,
                      border: { ...prev.page.border, color: v },
                    },
                  }))
                }
              />
            </PropRow>
          </>
        )}
      </PropSection>
      <PropSection
        title="Colors"
        icon={Palette}
        color="#8b5cf6"
        defaultOpen={false}>
        <PropRow label="Page BG">
          <PropColor
            value={template.page.bgColor}
            onChange={(v) =>
              setTemplate((prev) => ({
                ...prev,
                page: { ...prev.page, bgColor: v },
              }))
            }
            presets={["#ffffff", "#f8fafc", "#fefce8", "#f0fdf4", "#fdf2f8"]}
          />
        </PropRow>
        <PropRow label="Primary">
          <PropColor
            value={template.page.primaryColor}
            onChange={(v) =>
              setTemplate((prev) => ({
                ...prev,
                page: { ...prev.page, primaryColor: v },
              }))
            }
          />
        </PropRow>
        <PropRow label="Secondary">
          <PropColor
            value={template.page.secondaryColor}
            onChange={(v) =>
              setTemplate((prev) => ({
                ...prev,
                page: { ...prev.page, secondaryColor: v },
              }))
            }
          />
        </PropRow>
      </PropSection>
      <PropSection
        title="Watermark"
        icon={ImageIcon}
        color="#f59e0b"
        defaultOpen={false}>
        <Input
          type="file"
          accept="image/*"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handlePageImageUpload(f, "watermarkUrl");
          }}
          className="text-[10px] h-7 bg-zinc-800/50 border-zinc-700 text-zinc-400"
        />
        {template.page.watermarkUrl && (
          <>
            <PropRow label="Opacity">
              <PropSlider
                value={template.page.watermarkOpacity}
                min={0.01}
                max={0.5}
                step={0.01}
                onChange={(v) =>
                  setTemplate((prev) => ({
                    ...prev,
                    page: { ...prev.page, watermarkOpacity: v },
                  }))
                }
                color="#f59e0b"
              />
            </PropRow>
            <button
              onClick={() =>
                setTemplate((prev) => ({
                  ...prev,
                  page: { ...prev.page, watermarkUrl: "" },
                }))
              }
              className="w-full text-[9px] py-1.5 border border-red-500/30 text-red-400 rounded hover:bg-red-500/10 transition-colors">
              Remove Watermark
            </button>
          </>
        )}
      </PropSection>
      <PropSection
        title="Global Font"
        icon={Type}
        color="#3b82f6"
        defaultOpen={false}>
        <PropRow label="Family">
          <Select
            value={template.page.fontFamily}
            onValueChange={(v) =>
              setTemplate((prev) => ({
                ...prev,
                page: { ...prev.page, fontFamily: v },
              }))
            }>
            <SelectTrigger className="h-6 text-[10px] bg-zinc-800/50 border-zinc-700 text-zinc-300 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-48">
              {FONT_FAMILIES.map((f) => (
                <SelectItem key={f.value} value={f.value} className="text-xs">
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </PropRow>
        <PropRow label="Base Size">
          <PropSlider
            value={template.page.globalFontSize}
            min={6}
            max={16}
            onChange={(v) =>
              setTemplate((prev) => ({
                ...prev,
                page: { ...prev.page, globalFontSize: v },
              }))
            }
            unit="px"
            color="#3b82f6"
          />
        </PropRow>
      </PropSection>
    </div>
  );

  // ============================================================================
  // 14. LEFT PALETTE
  // ============================================================================

  const renderPalette = () => {
    const filteredCategories = Object.entries(COMPONENT_CATEGORIES)
      .map(([key, cat]) => ({
        ...cat,
        key,
        types: cat.types.filter((t) => {
          if (!paletteSearch) return true;
          return COMPONENT_REGISTRY[t].label
            .toLowerCase()
            .includes(paletteSearch.toLowerCase());
        }),
      }))
      .filter((cat) => cat.types.length > 0);

    return (
      <div className="w-[220px] bg-[#09090b] border-r border-zinc-800/60 flex flex-col shrink-0">
        <div className="p-2 border-b border-zinc-800/60">
          <div className="relative">
            <input
              type="text"
              value={paletteSearch}
              onChange={(e) => setPaletteSearch(e.target.value)}
              placeholder="Search components..."
              className="w-full h-7 text-[10px] bg-zinc-800/50 border border-zinc-700/50 rounded pl-7 pr-2 text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50"
            />
            <SearchIcon
              size={11}
              className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-600"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-3">
          {filteredCategories.map((cat) => (
            <div key={cat.key}>
              <div className="flex items-center gap-1.5 mb-1.5 px-1">
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: cat.color }}
                />
                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">
                  {cat.label}
                </span>
                <span className="text-[8px] text-zinc-700 ml-auto">
                  {cat.types.length}
                </span>
              </div>
              <div className="space-y-0.5">
                {cat.types.map((type) => {
                  const def = COMPONENT_REGISTRY[type];
                  return (
                    <button
                      key={type}
                      onClick={() => addComponent(type)}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-left hover:bg-zinc-800/60 transition-colors group">
                      <span
                        className="w-5 h-5 rounded flex items-center justify-center shrink-0 transition-colors"
                        style={{
                          backgroundColor: def.color + "15",
                          border: `1px solid ${def.color}25`,
                        }}>
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: def.color }}
                        />
                      </span>
                      <span className="text-[10px] text-zinc-400 group-hover:text-zinc-200 transition-colors">
                        {def.label}
                      </span>
                      <Plus
                        size={10}
                        className="ml-auto text-zinc-700 group-hover:text-indigo-400 transition-colors"
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div className="p-2 border-t border-zinc-800/60">
          <div className="text-[9px] text-zinc-600 text-center">
            {template.components.length} components
          </div>
        </div>
      </div>
    );
  };

  // ============================================================================
  // 15. CANVAS COMPONENT RENDERERS
  // ============================================================================

  const buildComponentStyle = (comp: ReportComponent): React.CSSProperties => {
    const s = comp.style;
    const bgFinal =
      s.bgColor === "transparent"
        ? "transparent"
        : s.bgOpacity < 100
          ? `${s.bgColor}${Math.round(s.bgOpacity * 2.55)
              .toString(16)
              .padStart(2, "0")}`
          : s.bgColor;

    const borderStr = s.useIndividualBorders
      ? `${s.borderTopWidth}px ${s.borderTopStyle} ${s.borderTopColor} ${s.borderRightWidth}px ${s.borderRightStyle} ${s.borderRightColor} ${s.borderBottomWidth}px ${s.borderBottomStyle} ${s.borderBottomColor} ${s.borderLeftWidth}px ${s.borderLeftStyle} ${s.borderLeftColor}`
      : s.borderStyle === "none"
        ? "none"
        : `${s.borderWidth}px ${s.borderStyle} ${s.borderColor}`;

    const radiusStr = s.useIndividualRadius
      ? `${s.borderTopLeftRadius}px ${s.borderTopRightRadius}px ${s.borderBottomRightRadius}px ${s.borderBottomLeftRadius}px`
      : `${s.borderRadius}px`;

    return {
      fontFamily: s.fontFamily,
      fontSize: s.fontSize,
      fontWeight: s.fontWeight,
      fontStyle: s.fontStyle,
      color: s.color,
      textAlign: s.textAlign,
      textTransform: s.textTransform as any,
      textDecoration: s.textDecoration,
      letterSpacing: s.letterSpacing,
      lineHeight: s.lineHeight,
      whiteSpace: s.whiteSpace,
      backgroundColor: bgFinal,
      border: borderStr,
      borderRadius: radiusStr,
      paddingTop: s.paddingTop,
      paddingRight: s.paddingRight,
      paddingBottom: s.paddingBottom,
      paddingLeft: s.paddingLeft,
      opacity: s.opacity / 100,
      transform: s.rotation ? `rotate(${s.rotation}deg)` : undefined,
      overflow: s.overflow,
      width: "100%",
      height: "100%",
      boxSizing: "border-box" as const,
    };
  };

  const renderComponentContent = (comp: ReportComponent) => {
    const style = buildComponentStyle(comp);
    const d = comp.data;
    const def = COMPONENT_REGISTRY[comp.type];

    // Dynamic label+value
    if (def.category === "dynamic" && d.label !== undefined) {
      const showLabel = d.showLabel !== false;
      return (
        <div
          style={style}
          className="flex items-baseline gap-1 overflow-hidden">
          {showLabel && (
            <span
              style={{
                fontWeight: 500,
                opacity: 0.7,
                fontSize: style.fontSize ? style.fontSize * 0.85 : undefined,
              }}>
              {d.label}:
            </span>
          )}
          <span className="truncate">{d.value || "---"}</span>
        </div>
      );
    }

    if (comp.type === "TEXT" || comp.type === "RICH_TEXT") {
      return (
        <div style={style} className="overflow-hidden break-words">
          {d.content || "Text..."}
        </div>
      );
    }

    if (comp.type === "BARCODE") {
      return (
        <div
          style={{
            ...style,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}>
          <Barcode
            value={d.value || "SAMPLE-001"}
            format={d.format || "CODE128"}
            height={d.barHeight || 35}
            width={d.barScale || 1.5}
            displayValue={d.displayValue !== false}
            fontSize={10}
          />
        </div>
      );
    }

    if (comp.type === "QR_CODE") {
      return (
        <div
          style={{
            ...style,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}>
          <AsyncQRCode
            value={d.value || "https://example.com"}
            size={Math.min(
              comp.width,
              comp.height - (d.showPageNumber ? 14 : 0),
            )}
            showPageNumber={d.showPageNumber !== false}
          />
        </div>
      );
    }

    if (comp.type === "RESULTS_TABLE") {
      const cols = d.columns || ["Test", "Result", "Unit", "Ref Range"];
      const rows = d.sampleData || [];
      const hBg = d.headerBgColor || "#1e3a8a";
      const hTxt = d.headerTextColor || "#ffffff";
      const altBg = d.rowAltColor || "#f1f5f9";
      const showRef = d.showRefRange !== false;
      const showUnit = d.showUnit !== false;
      const filteredCols = cols.filter((c: string) => {
        if (c.toLowerCase().includes("ref")) return showRef;
        if (c.toLowerCase().includes("unit")) return showUnit;
        return true;
      });
      return (
        <div
          style={{
            ...style,
            overflow: "auto",
            fontSize: style.fontSize || 10,
          }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            {d.showHeader !== false && (
              <thead>
                <tr>
                  {filteredCols.map((c: string, i: number) => (
                    <th
                      key={i}
                      style={{
                        backgroundColor: hBg,
                        color: hTxt,
                        fontWeight: (d.headerFontWeight || 600) as any,
                        padding: "4px 6px",
                        textAlign: "left",
                        fontSize: (style.fontSize || 10) - 1,
                        borderBottom: `2px solid ${hBg}`,
                      }}>
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {rows.map((row: Record<string, string>, ri: number) => (
                <tr
                  key={ri}
                  style={{
                    backgroundColor: ri % 2 === 1 ? altBg : "transparent",
                  }}>
                  {filteredCols.map((c: string, ci: number) => {
                    const key = c.toLowerCase().replace(/[^a-z]/g, "");
                    const val = row[key] || row[Object.keys(row)[ci]] || "-";
                    const isAbnormal =
                      String(val).includes("*") ||
                      String(val).includes("H") ||
                      String(val).includes("L");
                    return (
                      <td
                        key={ci}
                        style={{
                          padding: "3px 6px",
                          borderBottom: "1px solid #e2e8f0",
                          color: isAbnormal ? "#dc2626" : style.color,
                          fontWeight: isAbnormal ? 700 : 400,
                        }}>
                        {val}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    if (
      comp.type === "LAB_LOGO" ||
      comp.type === "CUSTOM_IMAGE" ||
      comp.type === "HEADER_BANNER" ||
      comp.type === "FOOTER_BANNER"
    ) {
      if (d.imageUrl) {
        return (
          <img
            src={d.imageUrl}
            alt={d.altText || ""}
            style={{
              ...style,
              objectFit: style.objectFit || "contain",
              display: "block",
            }}
          />
        );
      }
      return (
        <div
          style={{
            ...style,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#f8fafc",
            border: "1px dashed #cbd5e1",
          }}>
          <ImagePlus size={20} className="text-slate-300 mb-1" />
          <span style={{ fontSize: 8, color: "#94a3b8" }}>Upload Image</span>
        </div>
      );
    }

    if (comp.type === "SIGNATURE") {
      return (
        <div
          style={{
            ...style,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}>
          {d.imageUrl ? (
            <img
              src={d.imageUrl}
              alt="Signature"
              style={{ objectFit: "contain", maxHeight: "60%" }}
            />
          ) : (
            <div
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1px dashed #cbd5e1",
                width: "100%",
                backgroundColor: "#f8fafc",
              }}>
              <span style={{ fontSize: 8, color: "#94a3b8" }}>Sign Image</span>
            </div>
          )}
          {d.showDetails !== false && (
            <div style={{ textAlign: "center", marginTop: 2 }}>
              {d.name && (
                <div style={{ fontSize: 10, fontWeight: 700 }}>{d.name}</div>
              )}
              {d.qualifications && (
                <div style={{ fontSize: 8, opacity: 0.7 }}>
                  {d.qualifications}
                </div>
              )}
              {d.title && (
                <div style={{ fontSize: 8, opacity: 0.6 }}>{d.title}</div>
              )}
            </div>
          )}
        </div>
      );
    }

    if (comp.type === "SEPARATOR") {
      return <div style={style} />;
    }

    if (comp.type === "SPACER") {
      return (
        <div
          style={{
            ...style,
            backgroundColor: previewMode
              ? "transparent"
              : "repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(0,0,0,0.03) 3px, rgba(0,0,0,0.03) 6px)",
          }}>
          {!previewMode && (
            <span
              style={{
                fontSize: 7,
                color: "#cbd5e1",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
              }}>
              {comp.height}px
            </span>
          )}
        </div>
      );
    }

    if (comp.type === "DIVIDER_DOTS") {
      return (
        <div style={style} className="overflow-hidden">
          {(d.dotChar || "\u00B7").repeat(d.repeatCount || 60)}
        </div>
      );
    }

    if (comp.type === "APPROVAL_STAMP") {
      return (
        <div
          style={{
            ...style,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}>
          <span
            style={{
              fontSize: style.fontSize,
              fontWeight: 900,
              textTransform: "uppercase" as any,
              letterSpacing: 2,
            }}>
            {d.text || "APPROVED"}
          </span>
        </div>
      );
    }

    if (comp.type === "DEPARTMENT_HEADER") {
      return <div style={style}>{d.title || "DEPARTMENT"}</div>;
    }

    if (comp.type === "BOX_CONTAINER") {
      return (
        <div style={style}>
          {d.showTitle !== false && d.title && (
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                marginBottom: 4,
                color: style.color,
                borderBottom: `1px solid ${style.borderColor || "#e2e8f0"}`,
                paddingBottom: 3,
              }}>
              {d.title}
            </div>
          )}
          <div style={{ minHeight: 20 }} />
        </div>
      );
    }

    if (comp.type === "PAGE_NUMBER") {
      const fmt = d.format || "Page {current} of {total}";
      const text = fmt.replace("{current}", "1").replace("{total}", "1");
      return <div style={style}>{text}</div>;
    }

    if (comp.type === "DISCLAIMER") {
      return <div style={style}>{d.content || "Disclaimer..."}</div>;
    }

    if (comp.type === "DATE_BLOCK") {
      const showLabel = d.showLabel !== false;
      return (
        <div style={style} className="flex items-baseline gap-1">
          {showLabel && (
            <span style={{ fontWeight: 500, opacity: 0.7 }}>
              {d.label || "Date"}:
            </span>
          )}
          <span>{d.value || "---"}</span>
        </div>
      );
    }

    return <div style={style}>Unknown: {comp.type}</div>;
  };

  // ============================================================================
  // 16. CANVAS
  // ============================================================================

  const renderCanvas = () => {
    if (previewMode) {
      return (
        <div className="flex-1 bg-zinc-900 overflow-auto flex items-start justify-center p-8">
          <div
            style={{
              transform: `scale(${zoom / 100})`,
              transformOrigin: "top center",
            }}>
            <div
              style={{
                width: PAGE_W,
                height: PAGE_H,
                position: "relative",
                backgroundColor: template.page.bgColor,
                fontFamily: template.page.fontFamily,
              }}
              className="shadow-2xl">
              {template.page.watermarkUrl && (
                <img
                  src={template.page.watermarkUrl}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                  style={{ opacity: template.page.watermarkOpacity }}
                />
              )}
              {template.page.border.show && (
                <div
                  className="absolute pointer-events-none"
                  style={{
                    top: template.page.border.padding,
                    left: template.page.border.padding,
                    right: template.page.border.padding,
                    bottom: template.page.border.padding,
                    border: `${template.page.border.weight}px solid ${template.page.border.color}`,
                    borderRadius: template.page.border.radius,
                  }}
                />
              )}
              {[...template.components]
                .sort((a, b) => a.zIndex - b.zIndex)
                .filter((c) => c.visible)
                .map((comp) => (
                  <div
                    key={comp.id}
                    style={{
                      position: "absolute",
                      left: comp.x,
                      top: comp.y,
                      width: comp.width,
                      height: comp.height,
                      zIndex: comp.zIndex,
                    }}>
                    {renderComponentContent(comp)}
                  </div>
                ))}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div
        className="flex-1 bg-[#111118] overflow-auto flex flex-col"
        ref={canvasRef}>
        {/* Zoom Bar */}
        <div className="sticky top-0 z-50 flex items-center justify-center gap-2 py-2 bg-[#111118]/90 backdrop-blur-sm border-b border-zinc-800/40">
          <button
            onClick={() => setZoom((z) => Math.max(20, z - 10))}
            className="w-7 h-7 flex items-center justify-center bg-zinc-800 border border-zinc-700 rounded text-zinc-400 hover:text-white transition-colors">
            <ZoomOut size={13} />
          </button>
          <div className="flex items-center gap-1.5 bg-zinc-800/50 border border-zinc-700/50 rounded px-2 py-1">
            <Slider
              min={20}
              max={150}
              step={5}
              value={[zoom]}
              onValueChange={(v) => setZoom(v[0])}
              className="w-32 [&_[role=slider]]:h-2.5 [&_[role=slider]]:w-2.5"
            />
            <span className="text-[10px] text-zinc-400 font-mono w-10 text-right">
              {zoom}%
            </span>
          </div>
          <button
            onClick={() => setZoom((z) => Math.min(150, z + 10))}
            className="w-7 h-7 flex items-center justify-center bg-zinc-800 border border-zinc-700 rounded text-zinc-400 hover:text-white transition-colors">
            <ZoomIn size={13} />
          </button>
          <button
            onClick={() => setZoom(55)}
            className="text-[9px] px-2 py-1 border border-zinc-700 rounded text-zinc-500 hover:text-zinc-300 transition-colors">
            Fit
          </button>
          <button
            onClick={() => setZoom(100)}
            className="text-[9px] px-2 py-1 border border-zinc-700 rounded text-zinc-500 hover:text-zinc-300 transition-colors">
            100%
          </button>
          <div className="w-px h-5 bg-zinc-800 mx-1" />
          <button
            onClick={() => setPreviewMode(true)}
            className="text-[9px] px-2.5 py-1 bg-indigo-600/20 border border-indigo-500/30 rounded text-indigo-400 hover:bg-indigo-600/30 transition-colors flex items-center gap-1">
            <Eye size={11} /> Preview
          </button>
        </div>

        {/* Canvas */}
        <div
          className="flex-1 overflow-auto flex items-start justify-center p-8"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedId(null);
          }}>
          <div
            style={{
              transform: `scale(${zoom / 100})`,
              transformOrigin: "top center",
              marginBottom: PAGE_H * (zoom / 100) * 0.3,
            }}>
            <div
              style={{
                width: PAGE_W,
                height: PAGE_H,
                position: "relative",
                backgroundColor: template.page.bgColor,
                fontFamily: template.page.fontFamily,
              }}
              className="shadow-2xl shadow-black/50">
              {template.page.watermarkUrl && (
                <img
                  src={template.page.watermarkUrl}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                  style={{ opacity: template.page.watermarkOpacity }}
                />
              )}
              {template.page.border.show && (
                <div
                  className="absolute pointer-events-none"
                  style={{
                    top: template.page.border.padding,
                    left: template.page.border.padding,
                    right: template.page.border.padding,
                    bottom: template.page.border.padding,
                    border: `${template.page.border.weight}px solid ${template.page.border.color}`,
                    borderRadius: template.page.border.radius,
                  }}
                />
              )}
              {[...template.components]
                .sort((a, b) => a.zIndex - b.zIndex)
                .map((comp) => {
                  const def = COMPONENT_REGISTRY[comp.type];
                  const isSelected = comp.id === selectedId;
                  const isHovered = comp.id === hoveredId;
                  if (!comp.visible) return null;

                  return (
                    <Rnd
                      key={comp.id}
                      position={{ x: comp.x, y: comp.y }}
                      size={{ width: comp.width, height: comp.height }}
                      onDragStop={(e, d) => {
                        updateComponent(comp.id, {
                          x: Math.round(d.x),
                          y: Math.round(d.y),
                        });
                      }}
                      onResizeStop={(e, dir, ref, delta, pos) => {
                        updateComponent(comp.id, {
                          width: Math.round(parseInt(ref.style.width)),
                          height: Math.round(parseInt(ref.style.height)),
                          x: Math.round(pos.x),
                          y: Math.round(pos.y),
                        });
                      }}
                      onMouseDown={() => setSelectedId(comp.id)}
                      onMouseEnter={() => setHoveredId(comp.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      disableDragging={comp.locked}
                      enableResizing={!comp.locked}
                      minWidth={10}
                      minHeight={4}
                      style={{
                        zIndex: comp.zIndex,
                        cursor: comp.locked ? "default" : "move",
                      }}
                      resizeHandleStyles={{
                        topLeft: { width: 8, height: 8, top: -4, left: -4 },
                        topRight: { width: 8, height: 8, top: -4, right: -4 },
                        bottomLeft: {
                          width: 8,
                          height: 8,
                          bottom: -4,
                          left: -4,
                        },
                        bottomRight: {
                          width: 8,
                          height: 8,
                          bottom: -4,
                          right: -4,
                        },
                        top: { height: 6, top: -3, left: 8, right: 8 },
                        bottom: { height: 6, bottom: -3, left: 8, right: 8 },
                        left: { width: 6, left: -3, top: 8, bottom: 8 },
                        right: { width: 6, right: -3, top: 8, bottom: 8 },
                      }}
                      resizeHandleClasses={{
                        topLeft:
                          "!w-2 !h-2 !-top-1 !-left-1 !bg-white !border !border-indigo-500 !rounded-sm",
                        topRight:
                          "!w-2 !h-2 !-top-1 !-right-1 !bg-white !border !border-indigo-500 !rounded-sm",
                        bottomLeft:
                          "!w-2 !h-2 !-bottom-1 !-left-1 !bg-white !border !border-indigo-500 !rounded-sm",
                        bottomRight:
                          "!w-2 !h-2 !-bottom-1 !-right-1 !bg-white !border !border-indigo-500 !rounded-sm",
                      }}>
                      {(isSelected || isHovered) && !previewMode && (
                        <div
                          className="absolute -inset-[1px] rounded-sm pointer-events-none transition-colors"
                          style={{
                            border: `1.5px solid ${isSelected ? "#6366f1" : def.color + "60"}`,
                            boxShadow: isSelected
                              ? "0 0 0 1px rgba(99,102,241,0.3), 0 0 8px rgba(99,102,241,0.15)"
                              : "none",
                            zIndex: 9999,
                          }}
                        />
                      )}
                      {isSelected && !previewMode && (
                        <div
                          className="absolute -top-5 left-0 flex items-center gap-1 pointer-events-none"
                          style={{ zIndex: 10000 }}>
                          <span
                            className="text-[7px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-t text-white whitespace-nowrap"
                            style={{ backgroundColor: def.color }}>
                            {def.label}
                          </span>
                          {comp.locked && (
                            <Lock size={8} className="text-amber-400" />
                          )}
                        </div>
                      )}
                      {isHovered &&
                        !isSelected &&
                        !comp.locked &&
                        !previewMode && (
                          <div
                            className="absolute -top-7 right-0 flex items-center gap-0.5 pointer-events-auto"
                            style={{ zIndex: 10000 }}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                duplicateComponent(comp.id);
                              }}
                              className="w-5 h-5 flex items-center justify-center bg-zinc-800 border border-zinc-600 rounded text-zinc-400 hover:text-white transition-colors">
                              <Copy size={9} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeComponent(comp.id);
                              }}
                              className="w-5 h-5 flex items-center justify-center bg-zinc-800 border border-zinc-600 rounded text-zinc-400 hover:text-red-400 transition-colors">
                              <Trash2 size={9} />
                            </button>
                          </div>
                        )}
                      <div className="w-full h-full overflow-hidden">
                        {renderComponentContent(comp)}
                      </div>
                    </Rnd>
                  );
                })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ============================================================================
  // 17. RIGHT SIDEBAR
  // ============================================================================

  const renderRightSidebar = () => (
    <div className="w-[340px] bg-[#09090b] border-l border-zinc-800/60 flex flex-col shrink-0">
      <Tabs
        value={rightTab}
        onValueChange={setRightTab}
        className="flex flex-col h-full">
        <TabsList className="bg-transparent border-b border-zinc-800/60 rounded-none h-9 p-0 w-full shrink-0">
          {(
            [
              { v: "properties", icon: Settings2, l: "Properties" },
              { v: "layers", icon: Layers, l: "Layers" },
              { v: "page", icon: Maximize2, l: "Page" },
              { v: "json", icon: Code, l: "JSON" },
            ] as const
          ).map((tab) => (
            <TabsTrigger
              key={tab.v}
              value={tab.v}
              className="text-[10px] font-semibold uppercase tracking-wider data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-indigo-500 data-[state=active]:text-indigo-400 data-[state=active]:shadow-none rounded-none h-9 px-3 text-zinc-500">
              <tab.icon size={12} className="mr-1" /> {tab.l}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="properties" className="flex-1 m-0 overflow-hidden">
          {renderFullPropertyPanel()}
        </TabsContent>
        <TabsContent value="layers" className="flex-1 m-0 overflow-hidden">
          {renderLayersPanel()}
        </TabsContent>
        <TabsContent value="page" className="flex-1 m-0 overflow-hidden">
          {renderPageSettings()}
        </TabsContent>
        <TabsContent
          value="json"
          className="flex-1 m-0 overflow-hidden flex flex-col p-2 gap-2">
          <div className="flex gap-1">
            <button
              onClick={handleExportJson}
              className="flex-1 text-[9px] py-1.5 border border-zinc-700 rounded text-zinc-400 hover:text-zinc-200 transition-colors flex items-center justify-center gap-1">
              <Download size={10} /> Export
            </button>
            <label className="flex-1 text-[9px] py-1.5 border border-zinc-700 rounded text-zinc-400 hover:text-zinc-200 transition-colors flex items-center justify-center gap-1 cursor-pointer">
              <Upload size={10} /> Import
              <input
                type="file"
                accept=".json"
                onChange={handleImportJson}
                className="hidden"
              />
            </label>
          </div>
          <Textarea
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            className="flex-1 text-[9px] font-mono bg-zinc-900 border-zinc-800 text-zinc-400 resize-none min-h-[200px]"
          />
          <button
            onClick={handleApplyJson}
            className="w-full py-2 text-[10px] font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded transition-colors">
            Apply JSON
          </button>
        </TabsContent>
      </Tabs>
    </div>
  );

  // ============================================================================
  // 18. LOADING
  // ============================================================================

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#09090b]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="animate-spin text-indigo-500" />
          <span className="text-sm text-zinc-500">Loading template...</span>
        </div>
      </div>
    );
  }

  // ============================================================================
  // 19. PREVIEW MODE
  // ============================================================================

  if (previewMode) {
    return (
      <div className="h-screen flex flex-col bg-zinc-900">
        <div className="h-12 bg-[#09090b] border-b border-zinc-800/60 flex items-center px-4 gap-3 shrink-0">
          <button
            onClick={() => setPreviewMode(false)}
            className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors">
            <ArrowLeft size={16} /> Back to Editor
          </button>
          <div className="flex-1" />
          <span className="text-xs text-zinc-600">Preview Mode</span>
        </div>
        {renderCanvas()}
      </div>
    );
  }

  // ============================================================================
  // 20. MAIN LAYOUT
  // ============================================================================

  return (
    <div className="h-screen flex flex-col bg-[#09090b] overflow-hidden">
      {/* Top Bar */}
      <div className="h-12 bg-[#09090b] border-b border-zinc-800/60 flex items-center px-3 gap-2 shrink-0">
        <button
          onClick={() => router.back()}
          className="w-8 h-8 flex items-center justify-center rounded hover:bg-zinc-800 text-zinc-500 hover:text-white transition-colors">
          <ArrowLeft size={16} />
        </button>
        <div className="w-px h-6 bg-zinc-800" />
        <input
          value={template.name}
          onChange={(e) =>
            setTemplate((prev) => ({ ...prev, name: e.target.value }))
          }
          className="h-7 text-sm font-semibold text-zinc-200 bg-transparent border-none focus:outline-none focus:ring-0 px-1 w-64"
        />
        <div className="flex-1" />
        <Badge
          variant="secondary"
          className="text-[9px] bg-zinc-800 text-zinc-500 border-zinc-700">
          {template.components.length} components
        </Badge>
        <div className="w-px h-6 bg-zinc-800" />
        <Button
          variant="ghost"
          size="sm"
          onClick={handleExportJson}
          className="h-8 text-[10px] text-zinc-500 hover:text-zinc-200 px-2">
          <Download size={13} className="mr-1" /> Export
        </Button>
        <label className="h-8 flex items-center text-[10px] text-zinc-500 hover:text-zinc-200 px-2 cursor-pointer rounded hover:bg-zinc-800 transition-colors">
          <Upload size={13} className="mr-1" /> Import
          <input
            type="file"
            accept=".json"
            onChange={handleImportJson}
            className="hidden"
          />
        </label>
        <div className="w-px h-6 bg-zinc-800" />
        <Button
          onClick={handleSave}
          disabled={saving}
          className="h-8 text-[11px] bg-indigo-600 hover:bg-indigo-500 px-4">
          {saving ? (
            <Loader2 size={14} className="animate-spin mr-1" />
          ) : (
            <Save size={14} className="mr-1" />
          )}
          {saving ? "Saving..." : "Save Template"}
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {renderPalette()}
        {renderCanvas()}
        {renderRightSidebar()}
      </div>
    </div>
  );
}