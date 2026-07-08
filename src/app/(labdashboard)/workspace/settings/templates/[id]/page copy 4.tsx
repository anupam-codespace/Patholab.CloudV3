"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Save,
  Loader2,
  ArrowLeft,
  GripVertical,
  Type,
  Table2,
  QrCode,
  SplitSquareHorizontal,
  Trash2,
  Plus,
  Image as ImageIcon,
  LayoutTemplate,
  Code,
  Settings,
  Eye,
  Download,
  Upload,
  Barcode as BarcodeIcon,
  Move,
  X,
  Maximize2,
  Minimize2,
  Lock,
  Unlock,
} from "lucide-react";
import toast from "react-hot-toast";

import QRCode from "qrcode";
import Barcode from "react-barcode";
import { Rnd } from "react-rnd";

import { getTemplateById, saveTemplate } from "@/actions/report-settings";

// ============================================================================
// 1. EXTENDED ENTERPRISE TYPESCRIPT INTERFACES
// ============================================================================

export interface MarginConfig {
  top: number;
  bottom: number;
  left: number;
  right: number;
}
export interface BorderConfig {
  show: boolean;
  weight: number;
  color: string;
  padding: number;
}

export interface ComponentStyle {
  x: number;
  y: number;
  width: number;
  height: number;
  background: string;
  borderColor: string;
  borderWidth: number;
  borderRadius: number;
  fontSize: number;
  fontFamily: string;
  fontWeight: "normal" | "bold" | "bolder" | "lighter" | number;
  fontStyle: "normal" | "italic";
  textAlign: "left" | "center" | "right";
  padding: number;
  opacity: number;
  zIndex: number;
  locked: boolean; // if true, cannot be moved/resized
}

export interface BrandingConfig {
  primaryColor: string;
  secondaryColor: string;
  globalFontSize: number;
  fontFamily: string;
  watermarkUrl: string;
  watermarkOpacity: number;
}

export interface HeaderConfig {
  show: boolean;
  mode: "standard" | "html" | "image";
  title: string;
  subTitle: string;
  logoUrl: string;
  fullImage: string;
  html: string;
  height: number; // used only in image mode
  style: ComponentStyle;
}

export interface QRCodeConfig {
  show: boolean;
  mode: "preset" | "custom";
  position: string;
  x: number;
  y: number;
  size: number;
  showPageNumber: boolean;
  margin: number;
}

export interface BarcodeConfig {
  show: boolean;
  position: "left" | "center" | "right";
  height: number;
  scale: number;
}

export interface PatientBlockConfig {
  show: boolean;
  fontSize: number;
  barcode: BarcodeConfig;
  showName: boolean;
  showPatientId: boolean;
  showSentBy: boolean;
  showAgeSex: boolean;
  showEmployeeId: boolean;
  showRefDoctor: boolean;
  showSampleCollection: boolean;
  showReportReleased: boolean;
  style: ComponentStyle;
}

export interface BodyOptionsConfig {
  groupDepartmentWise: boolean;
  tableFontSize: number;
  showBiologicalRef: boolean;
  showTestTimestamps: boolean;
}

export interface BodyBlockStyle extends ComponentStyle {
  id: string;
  type: "TEXT" | "RESULTS_TABLE" | "SPACER" | "IMAGE";
  content?: string;
  height?: number; // for spacer
  imageUrl?: string;
  imageScale?: number;
}

export interface Signatory {
  id: string;
  name: string;
  qualifications: string;
  title: string;
  imageUrl: string;
  show: boolean;
  width: number;
}

export interface FooterConfig {
  show: boolean;
  mode: "standard" | "html" | "image";
  text: string;
  html: string;
  fullImage: string;
  footerBottomImage: string;
  signatures: Signatory[];
  height: number;
  style: ComponentStyle;
}

export interface TemplateConfig {
  layout: { margins: MarginConfig; border: BorderConfig };
  branding: BrandingConfig;
  header: HeaderConfig;
  qrCode: QRCodeConfig;
  patientBlock: PatientBlockConfig;
  bodyOptions: BodyOptionsConfig;
  body: BodyBlockStyle[];
  footer: FooterConfig;
}

// ============================================================================
// 2. ASYNC QR CODE WRAPPER COMPONENT
// ============================================================================
const AsyncQRCode = ({
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
      <img
        src={src}
        alt="QR Code"
        style={{ width: size - 8, height: size - 8 }}
      />
      {showPageNumber && (
        <span className="text-[8px] mt-1 font-bold text-slate-500 whitespace-nowrap">
          Page 1 of 1
        </span>
      )}
    </div>
  );
};

// ============================================================================
// 3. DEFAULT CONFIGURATION (FULLY EXTENDED)
// ============================================================================

const MERGE_TAGS = [
  { label: "Patient Name", tag: "{{patient.name}}" },
  { label: "Patient Age", tag: "{{patient.age}}" },
  { label: "Patient Gender", tag: "{{patient.gender}}" },
  { label: "Patient ID", tag: "{{patient.patientId}}" },
  { label: "Sample ID", tag: "{{sample.sampleId}}" },
  { label: "Current Date", tag: "{{system.currentDate}}" },
];

const DEFAULT_COMPONENT_STYLE: ComponentStyle = {
  x: 0,
  y: 0,
  width: 700,
  height: 120,
  background: "transparent",
  borderColor: "#cbd5e1",
  borderWidth: 1,
  borderRadius: 4,
  fontSize: 14,
  fontFamily: "Helvetica, Arial, sans-serif",
  fontWeight: "normal",
  fontStyle: "normal",
  textAlign: "left",
  padding: 10,
  opacity: 1,
  zIndex: 1,
  locked: false,
};

const DEFAULT_CONFIG: TemplateConfig = {
  layout: {
    margins: { top: 10, bottom: 10, left: 10, right: 10 },
    border: { show: false, weight: 2, color: "#1e3a8a", padding: 5 },
  },
  branding: {
    primaryColor: "#1e3a8a",
    secondaryColor: "#475569",
    globalFontSize: 10,
    fontFamily: "Helvetica, Arial, sans-serif",
    watermarkUrl: "",
    watermarkOpacity: 0.1,
  },
  header: {
    show: true,
    mode: "standard",
    title: "GLOBIZ PATHOLAB",
    subTitle: "Advanced Diagnostics Center",
    logoUrl: "",
    fullImage: "",
    html: "",
    height: 120,
    style: {
      ...DEFAULT_COMPONENT_STYLE,
      y: 10,
      width: 700,
      height: 130,
      background: "#ffffff",
      borderColor: "#1e3a8a",
      borderWidth: 2,
      borderRadius: 6,
      fontSize: 16,
      fontWeight: "bold",
      textAlign: "center",
      padding: 12,
      zIndex: 10,
    },
  },
  qrCode: {
    show: true,
    mode: "preset",
    position: "header-right",
    x: 650,
    y: 50,
    size: 60,
    margin: 10,
    showPageNumber: true,
  },
  patientBlock: {
    show: true,
    fontSize: 12,
    barcode: { show: true, position: "center", height: 35, scale: 1.2 },
    showName: true,
    showPatientId: true,
    showSentBy: true,
    showAgeSex: true,
    showEmployeeId: true,
    showRefDoctor: true,
    showSampleCollection: true,
    showReportReleased: true,
    style: {
      ...DEFAULT_COMPONENT_STYLE,
      y: 150,
      width: 700,
      height: 160,
      background: "#f8fafc",
      borderColor: "#cbd5e1",
      borderWidth: 1,
      borderRadius: 8,
      fontSize: 12,
      fontWeight: "normal",
      textAlign: "left",
      padding: 16,
      zIndex: 5,
    },
  },
  bodyOptions: {
    groupDepartmentWise: true,
    tableFontSize: 11,
    showBiologicalRef: true,
    showTestTimestamps: true,
  },
  body: [
    {
      ...DEFAULT_COMPONENT_STYLE,
      id: `block-${Date.now()}`,
      type: "RESULTS_TABLE",
      y: 330,
      width: 700,
      height: 280,
      background: "#ffffff",
      borderColor: "#e2e8f0",
      borderWidth: 1,
      borderRadius: 6,
      fontSize: 11,
      textAlign: "left",
      padding: 12,
      zIndex: 2,
    },
  ],
  footer: {
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
    style: {
      ...DEFAULT_COMPONENT_STYLE,
      y: 650,
      width: 700,
      height: 180,
      background: "#ffffff",
      borderColor: "#cbd5e1",
      borderWidth: 1,
      borderRadius: 6,
      fontSize: 12,
      textAlign: "center",
      padding: 16,
      zIndex: 5,
    },
  },
};

// ============================================================================
// 4. MAIN BUILDER COMPONENT
// ============================================================================

export default function UltimateTemplateBuilder() {
  const params = useParams();
  const router = useRouter();
  const templateId = params.id === "new" ? null : (params.id as string);

  const [dataLoading, setDataLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [templateName, setTemplateName] = useState(
    "Enterprise Clinical Report",
  );
  const [config, setConfig] = useState<TemplateConfig>(DEFAULT_CONFIG);
  const [activeTab, setActiveTab] = useState("header");
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [purePreviewMode, setPurePreviewMode] = useState(false);
  const [showJsonEditor, setShowJsonEditor] = useState(false);
  const [jsonInput, setJsonInput] = useState("");

  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const init = async () => {
      setDataLoading(true);
      if (templateId) {
        try {
          const data = await getTemplateById(templateId);
          if (data) {
            setTemplateName(data.name);
            let parsed =
              typeof data.config === "string"
                ? JSON.parse(data.config)
                : data.config;
            setConfig(deepMerge(DEFAULT_CONFIG, parsed));
          }
        } catch (error) {
          toast.error("Failed to load template");
        }
      }
      setDataLoading(false);
    };
    init();
  }, [templateId]);

  const deepMerge = (target: any, source: any) => {
    const output = { ...target };
    if (isObject(target) && isObject(source)) {
      Object.keys(source).forEach((key) => {
        if (isObject(source[key])) {
          if (!(key in target)) Object.assign(output, { [key]: source[key] });
          else output[key] = deepMerge(target[key], source[key]);
        } else {
          Object.assign(output, { [key]: source[key] });
        }
      });
    }
    return output;
  };
  const isObject = (item: any) =>
    item && typeof item === "object" && !Array.isArray(item);

  const handleSave = async () => {
    if (!templateName.trim()) return toast.error("Template name is required.");
    setSaving(true);
    try {
      await saveTemplate(templateId, templateName, config);
      toast.success("Template Saved Successfully!");
      if (!templateId) router.push("/workspace/settings/templates");
    } catch (e) {
      toast.error("Failed to save template.");
    } finally {
      setSaving(false);
    }
  };

  const updateConfig = (
    section: keyof TemplateConfig,
    key: string,
    value: any,
  ) => {
    setConfig((prev: any) => ({
      ...prev,
      [section]: { ...prev[section], [key]: value },
    }));
  };

  const updateNestedConfig = (
    section: keyof TemplateConfig,
    subSection: string,
    key: string,
    value: any,
  ) => {
    setConfig((prev: any) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [subSection]: { ...prev[section][subSection], [key]: value },
      },
    }));
  };

  const updateComponentStyle = (
    component: "header" | "patientBlock" | "footer",
    key: keyof ComponentStyle,
    value: any,
  ) => {
    setConfig((prev) => ({
      ...prev,
      [component]: {
        ...prev[component],
        style: { ...prev[component].style, [key]: value },
      },
    }));
  };

  const updateBodyBlockStyle = (
    index: number,
    key: keyof ComponentStyle,
    value: any,
  ) => {
    setConfig((prev) => {
      const newBody = [...prev.body];
      newBody[index] = { ...newBody[index], [key]: value };
      return { ...prev, body: newBody };
    });
  };

  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    section: keyof TemplateConfig,
    key: string,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => updateConfig(section, key, reader.result);
    reader.readAsDataURL(file);
  };

  const handleBlockImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    blockIndex: number,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const newBody = [...config.body];
      newBody[blockIndex].imageUrl = reader.result as string;
      setConfig({ ...config, body: newBody });
    };
    reader.readAsDataURL(file);
  };

  // ============================================================================
  // 5. SIDEBAR: RENDER COMMON STYLE CONTROLS
  // ============================================================================
  const renderComponentStyleControls = (
    component: "header" | "patientBlock" | "footer",
    style: ComponentStyle,
    onUpdate: (key: keyof ComponentStyle, val: any) => void,
  ) => (
    <Card className="shadow-none border-slate-200 mt-4">
      <CardHeader className="pb-2 bg-slate-50">
        <CardTitle className="text-sm flex items-center gap-2">
          <Settings size={16} /> Component Styling
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
        {/* Position & Size */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">X (px)</Label>
            <Input
              type="number"
              value={style.x}
              onChange={(e) => onUpdate("x", Number(e.target.value))}
              className="h-8 text-xs"
            />
          </div>
          <div>
            <Label className="text-xs">Y (px)</Label>
            <Input
              type="number"
              value={style.y}
              onChange={(e) => onUpdate("y", Number(e.target.value))}
              className="h-8 text-xs"
            />
          </div>
          <div>
            <Label className="text-xs">Width (px)</Label>
            <Input
              type="number"
              value={style.width}
              onChange={(e) => onUpdate("width", Number(e.target.value))}
              className="h-8 text-xs"
            />
          </div>
          <div>
            <Label className="text-xs">Height (px)</Label>
            <Input
              type="number"
              value={style.height}
              onChange={(e) => onUpdate("height", Number(e.target.value))}
              className="h-8 text-xs"
            />
          </div>
        </div>

        {/* Background & Opacity */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <Label className="text-xs">Background Color</Label>
            <span className="text-xs font-mono">{style.background}</span>
          </div>
          <div className="flex gap-2">
            <Input
              type="color"
              className="w-8 h-8 p-0 border-none rounded"
              value={style.background}
              onChange={(e) => onUpdate("background", e.target.value)}
            />
            <Input
              className="h-8 text-xs font-mono flex-1"
              value={style.background}
              onChange={(e) => onUpdate("background", e.target.value)}
            />
          </div>
          <div className="flex justify-between">
            <Label className="text-xs">Opacity</Label>
            <span className="text-xs">{Math.round(style.opacity * 100)}%</span>
          </div>
          <Slider
            min={0.1}
            max={1}
            step={0.05}
            value={[style.opacity]}
            onValueChange={(v) => onUpdate("opacity", v[0])}
          />
        </div>

        {/* Border */}
        <div className="space-y-2 border-t pt-3">
          <Label className="text-xs font-bold">Border</Label>
          <div className="flex items-center gap-4">
            <div className="flex-1 space-y-2">
              <div className="flex justify-between">
                <Label className="text-[10px]">Width</Label>
                <span className="text-[10px]">{style.borderWidth}px</span>
              </div>
              <Slider
                min={0}
                max={10}
                step={1}
                value={[style.borderWidth]}
                onValueChange={(v) => onUpdate("borderWidth", v[0])}
              />
            </div>
          </div>
          <div className="flex gap-2 items-center">
            <Label className="text-xs">Color</Label>
            <Input
              type="color"
              className="w-8 h-8 p-0 border-none rounded"
              value={style.borderColor}
              onChange={(e) => onUpdate("borderColor", e.target.value)}
            />
            <Input
              className="h-8 text-xs font-mono flex-1"
              value={style.borderColor}
              onChange={(e) => onUpdate("borderColor", e.target.value)}
            />
          </div>
          <div className="flex items-center gap-4">
            <div className="flex-1 space-y-2">
              <div className="flex justify-between">
                <Label className="text-[10px]">Radius</Label>
                <span className="text-[10px]">{style.borderRadius}px</span>
              </div>
              <Slider
                min={0}
                max={50}
                step={1}
                value={[style.borderRadius]}
                onValueChange={(v) => onUpdate("borderRadius", v[0])}
              />
            </div>
          </div>
        </div>

        {/* Typography */}
        <div className="space-y-2 border-t pt-3">
          <Label className="text-xs font-bold">Typography</Label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[10px]">Font Size (px)</Label>
              <Input
                type="number"
                value={style.fontSize}
                onChange={(e) => onUpdate("fontSize", Number(e.target.value))}
                className="h-8 text-xs"
              />
            </div>
            <div>
              <Label className="text-[10px]">Weight</Label>
              <Select
                value={String(style.fontWeight)}
                onValueChange={(v) => onUpdate("fontWeight", v)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="bold">Bold</SelectItem>
                  <SelectItem value="bolder">Bolder</SelectItem>
                  <SelectItem value="lighter">Lighter</SelectItem>
                  <SelectItem value="400">400</SelectItem>
                  <SelectItem value="700">700</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[10px]">Style</Label>
              <Select
                value={style.fontStyle}
                onValueChange={(v) => onUpdate("fontStyle", v)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="italic">Italic</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[10px]">Align</Label>
              <Select
                value={style.textAlign}
                onValueChange={(v) => onUpdate("textAlign", v)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">Left</SelectItem>
                  <SelectItem value="center">Center</SelectItem>
                  <SelectItem value="right">Right</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-[10px]">Font Family</Label>
            <Select
              value={style.fontFamily}
              onValueChange={(v) => onUpdate("fontFamily", v)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Helvetica, Arial, sans-serif">
                  Helvetica
                </SelectItem>
                <SelectItem value="Georgia, serif">Georgia</SelectItem>
                <SelectItem value="'Courier New', monospace">
                  Courier
                </SelectItem>
                <SelectItem value="'Times New Roman', serif">
                  Times New Roman
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Padding & Z-Index */}
        <div className="grid grid-cols-2 gap-3 border-t pt-3">
          <div>
            <Label className="text-xs">Padding (px)</Label>
            <Input
              type="number"
              value={style.padding}
              onChange={(e) => onUpdate("padding", Number(e.target.value))}
              className="h-8 text-xs"
            />
          </div>
          <div>
            <Label className="text-xs">Z-Index</Label>
            <Input
              type="number"
              value={style.zIndex}
              onChange={(e) => onUpdate("zIndex", Number(e.target.value))}
              className="h-8 text-xs"
            />
          </div>
        </div>

        {/* Lock */}
        <div className="flex items-center justify-between pt-2 border-t">
          <Label className="text-xs">Lock Position/Size</Label>
          <Switch
            checked={style.locked}
            onCheckedChange={(c) => onUpdate("locked", c)}
          />
        </div>
      </CardContent>
    </Card>
  );

  // ============================================================================
  // 5.1 EXISTING TAB RENDERERS (UPDATED)
  // ============================================================================
  const renderSetupTab = () => (
    <div className="space-y-6 animate-in fade-in">
      <Card className="shadow-none border-slate-200">
        <CardHeader className="pb-3 bg-slate-50">
          <CardTitle className="text-sm">Page Layout (A4)</CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          <Label className="text-xs font-bold text-slate-500 uppercase">
            Margins (mm)
          </Label>
          <div className="grid grid-cols-4 gap-2">
            {["top", "bottom", "left", "right"].map((m) => (
              <div key={m}>
                <Label className="text-[10px] capitalize">{m}</Label>
                <Input
                  type="number"
                  value={(config.layout.margins as any)[m]}
                  onChange={(e) =>
                    updateNestedConfig(
                      "layout",
                      "margins",
                      m,
                      Number(e.target.value),
                    )
                  }
                  className="text-xs h-8"
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-none border-slate-200">
        <CardHeader className="pb-3 bg-slate-50 flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Page Border</CardTitle>
          <Switch
            checked={config.layout.border.show}
            onCheckedChange={(c) =>
              updateNestedConfig("layout", "border", "show", c)
            }
          />
        </CardHeader>
        {config.layout.border.show && (
          <CardContent className="pt-4 space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label className="text-xs">Border Inset (Padding)</Label>
                <span className="text-xs font-mono">
                  {config.layout.border.padding}px
                </span>
              </div>
              <Slider
                min={0}
                max={50}
                step={1}
                value={[config.layout.border.padding]}
                onValueChange={(v) =>
                  updateNestedConfig("layout", "border", "padding", v[0])
                }
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label className="text-xs">Border Weight</Label>
                <span className="text-xs font-mono">
                  {config.layout.border.weight}px
                </span>
              </div>
              <Slider
                min={1}
                max={10}
                step={1}
                value={[config.layout.border.weight]}
                onValueChange={(v) =>
                  updateNestedConfig("layout", "border", "weight", v[0])
                }
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Border Color</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  className="w-12 h-8 p-0 border-none rounded cursor-pointer"
                  value={config.layout.border.color}
                  onChange={(e) =>
                    updateNestedConfig(
                      "layout",
                      "border",
                      "color",
                      e.target.value,
                    )
                  }
                />
                <Input
                  className="h-8 text-xs font-mono flex-1"
                  value={config.layout.border.color}
                  onChange={(e) =>
                    updateNestedConfig(
                      "layout",
                      "border",
                      "color",
                      e.target.value,
                    )
                  }
                />
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      <Card className="shadow-none border-slate-200">
        <CardHeader className="pb-3 bg-slate-50">
          <CardTitle className="text-sm">Typography & Watermark</CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Primary Color</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  className="w-8 h-8 p-0 border-none rounded"
                  value={config.branding.primaryColor}
                  onChange={(e) =>
                    updateConfig("branding", "primaryColor", e.target.value)
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Secondary Color</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  className="w-8 h-8 p-0 border-none rounded"
                  value={config.branding.secondaryColor}
                  onChange={(e) =>
                    updateConfig("branding", "secondaryColor", e.target.value)
                  }
                />
              </div>
            </div>
          </div>
          <div className="space-y-2 pt-2 border-t">
            <div className="flex justify-between">
              <Label className="text-xs">Global Font Size</Label>
              <span className="text-xs font-mono">
                {config.branding.globalFontSize}px
              </span>
            </div>
            <Slider
              min={6}
              max={16}
              step={1}
              value={[config.branding.globalFontSize]}
              onValueChange={(v) =>
                updateConfig("branding", "globalFontSize", v[0])
              }
            />
          </div>
          <div className="space-y-2 pt-4 border-t">
            <Label className="text-xs">Upload Background Watermark</Label>
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => handleFileUpload(e, "branding", "watermarkUrl")}
              className="text-xs"
            />
            {config.branding.watermarkUrl && (
              <div className="space-y-2 mt-2">
                <div className="flex justify-between">
                  <Label className="text-[10px]">Opacity</Label>
                  <span className="text-[10px]">
                    {Math.round(config.branding.watermarkOpacity * 100)}%
                  </span>
                </div>
                <Slider
                  min={0.05}
                  max={1}
                  step={0.05}
                  value={[config.branding.watermarkOpacity]}
                  onValueChange={(v) =>
                    updateConfig("branding", "watermarkOpacity", v[0])
                  }
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-red-500 text-xs px-0"
                  onClick={() => updateConfig("branding", "watermarkUrl", "")}>
                  Remove Watermark
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderHeaderTab = () => (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex justify-between items-center bg-blue-50 p-3 rounded-lg border border-blue-100">
        <Label className="font-bold text-blue-900">Enable Header Zone</Label>
        <Switch
          checked={config.header.show}
          onCheckedChange={(c) => updateConfig("header", "show", c)}
        />
      </div>

      {config.header.show && (
        <>
          <Card className="shadow-none border-slate-200">
            <CardContent className="pt-4 space-y-4">
              <div className="grid grid-cols-3 bg-slate-100 p-1 rounded-md gap-1">
                {(["standard", "html", "image"] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => updateConfig("header", "mode", mode)}
                    className={`text-xs py-1.5 font-medium rounded-sm capitalize flex items-center justify-center gap-1 ${
                      config.header.mode === mode
                        ? "bg-white shadow text-blue-600"
                        : "text-slate-500"
                    }`}>
                    {mode === "standard" && (
                      <LayoutTemplate className="h-3 w-3" />
                    )}
                    {mode === "html" && <Code className="h-3 w-3" />}
                    {mode === "image" && <ImageIcon className="h-3 w-3" />}{" "}
                    {mode}
                  </button>
                ))}
              </div>

              {config.header.mode === "standard" && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Main Title</Label>
                    <Input
                      value={config.header.title}
                      onChange={(e) =>
                        updateConfig("header", "title", e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Subtitle</Label>
                    <Input
                      value={config.header.subTitle}
                      onChange={(e) =>
                        updateConfig("header", "subTitle", e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Lab Logo</Label>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, "header", "logoUrl")}
                      className="text-xs"
                    />
                  </div>
                </div>
              )}

              {config.header.mode === "html" && (
                <div className="space-y-2 animate-in fade-in">
                  <Label className="text-xs">Raw HTML</Label>
                  <Textarea
                    value={config.header.html}
                    onChange={(e) =>
                      updateConfig("header", "html", e.target.value)
                    }
                    className="font-mono text-xs h-32"
                    placeholder="<div style='text-align: center'>Header</div>"
                  />
                </div>
              )}

              {config.header.mode === "image" && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Full Graphic Header</Label>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) =>
                        handleFileUpload(e, "header", "fullImage")
                      }
                      className="text-xs"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label className="text-xs">Height</Label>
                      <span className="text-xs">{config.header.height}px</span>
                    </div>
                    <Slider
                      min={50}
                      max={400}
                      step={5}
                      value={[config.header.height]}
                      onValueChange={(v) =>
                        updateConfig("header", "height", v[0])
                      }
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* QR CODE SETTINGS */}
          <Card className="shadow-none border-slate-200">
            <CardHeader className="pb-2 bg-slate-50 flex flex-row items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <QrCode size={16} /> Report QR Verification
              </CardTitle>
              <Switch
                checked={config.qrCode.show}
                onCheckedChange={(c) => updateConfig("qrCode", "show", c)}
              />
            </CardHeader>
            {config.qrCode.show && (
              <CardContent className="pt-4 space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs">Positioning Mode</Label>
                  <Select
                    value={config.qrCode.mode}
                    onValueChange={(v) => updateConfig("qrCode", "mode", v)}>
                    <SelectTrigger className="h-8 text-xs bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="preset">Preset Margins</SelectItem>
                      <SelectItem value="custom">Free Drag & Drop</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {config.qrCode.mode === "preset" ? (
                  <div className="space-y-4 animate-in fade-in">
                    <div className="space-y-2">
                      <Label className="text-xs">Placement</Label>
                      <Select
                        value={config.qrCode.position}
                        onValueChange={(v) =>
                          updateConfig("qrCode", "position", v)
                        }>
                        <SelectTrigger className="h-8 text-xs bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="header-right">
                            Header - Top Right
                          </SelectItem>
                          <SelectItem value="header-left">
                            Header - Top Left
                          </SelectItem>
                          <SelectItem value="footer-right">
                            Footer - Bottom Right
                          </SelectItem>
                          <SelectItem value="footer-left">
                            Footer - Bottom Left
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Label className="text-[10px]">Margin Edge</Label>
                        <span>{config.qrCode.margin}px</span>
                      </div>
                      <Slider
                        min={0}
                        max={50}
                        step={2}
                        value={[config.qrCode.margin]}
                        onValueChange={(v) =>
                          updateConfig("qrCode", "margin", v[0])
                        }
                      />
                    </div>
                  </div>
                ) : (
                  <div className="bg-blue-50 border border-blue-200 p-3 rounded text-[10px] text-blue-800 flex gap-2">
                    <Move size={14} className="shrink-0" /> Drag the QR code
                    freely in the preview panel to set its absolute coordinates.
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label className="text-[10px]">QR Size</Label>
                      <span>{config.qrCode.size}px</span>
                    </div>
                    <Slider
                      min={30}
                      max={150}
                      step={5}
                      value={[config.qrCode.size]}
                      onValueChange={(v) =>
                        updateConfig("qrCode", "size", v[0])
                      }
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t">
                  <Label className="text-xs font-bold text-slate-600">
                    Show Page Numbers below QR
                  </Label>
                  <Switch
                    checked={config.qrCode.showPageNumber}
                    onCheckedChange={(c) =>
                      updateConfig("qrCode", "showPageNumber", c)
                    }
                  />
                </div>
              </CardContent>
            )}
          </Card>

          {/* HEADER STYLE */}
          {renderComponentStyleControls(
            "header",
            config.header.style,
            updateComponentStyle.bind(null, "header"),
          )}
        </>
      )}
    </div>
  );

  const renderPatientTab = () => (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex justify-between items-center bg-blue-50 p-3 rounded-lg border border-blue-100">
        <Label className="font-bold text-blue-900">Show Demographics</Label>
        <Switch
          checked={config.patientBlock.show}
          onCheckedChange={(c) => updateConfig("patientBlock", "show", c)}
        />
      </div>

      {config.patientBlock.show && (
        <>
          <Card className="shadow-none border-slate-200">
            <CardHeader className="pb-2 bg-slate-50 flex flex-row items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <BarcodeIcon size={16} /> Sample Barcode
              </CardTitle>
              <Switch
                checked={config.patientBlock.barcode.show}
                onCheckedChange={(c) =>
                  updateNestedConfig("patientBlock", "barcode", "show", c)
                }
              />
            </CardHeader>
            {config.patientBlock.barcode.show && (
              <CardContent className="pt-4 space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs">Alignment</Label>
                  <Select
                    value={config.patientBlock.barcode.position}
                    onValueChange={(v) =>
                      updateNestedConfig(
                        "patientBlock",
                        "barcode",
                        "position",
                        v,
                      )
                    }>
                    <SelectTrigger className="h-8 text-xs bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="left">Left</SelectItem>
                      <SelectItem value="center">Center</SelectItem>
                      <SelectItem value="right">Right</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label className="text-[10px]">Height</Label>
                      <span>{config.patientBlock.barcode.height}px</span>
                    </div>
                    <Slider
                      min={20}
                      max={80}
                      step={5}
                      value={[config.patientBlock.barcode.height]}
                      onValueChange={(v) =>
                        updateNestedConfig(
                          "patientBlock",
                          "barcode",
                          "height",
                          v[0],
                        )
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label className="text-[10px]">Scale</Label>
                      <span>{config.patientBlock.barcode.scale}x</span>
                    </div>
                    <Slider
                      min={0.5}
                      max={3}
                      step={0.1}
                      value={[config.patientBlock.barcode.scale]}
                      onValueChange={(v) =>
                        updateNestedConfig(
                          "patientBlock",
                          "barcode",
                          "scale",
                          v[0],
                        )
                      }
                    />
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          <Card className="shadow-none border-slate-200">
            <CardContent className="pt-4 space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label className="text-xs font-bold uppercase">
                    Font Size
                  </Label>
                  <span>{config.patientBlock.fontSize}px</span>
                </div>
                <Slider
                  min={8}
                  max={18}
                  step={1}
                  value={[config.patientBlock.fontSize]}
                  onValueChange={(v) =>
                    updateConfig("patientBlock", "fontSize", v[0])
                  }
                />
              </div>

              <Label className="text-xs font-bold text-slate-500 uppercase mt-4 block">
                Visible Fields
              </Label>
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 border rounded-lg">
                {[
                  { k: "showName", l: "Patient Name" },
                  { k: "showPatientId", l: "Patient ID / UHID" },
                  { k: "showAgeSex", l: "Age & Gender" },
                  { k: "showEmployeeId", l: "Employee ID" },
                  { k: "showSentBy", l: "Agency / B2B" },
                  { k: "showRefDoctor", l: "Ref. Doctor" },
                  { k: "showSampleCollection", l: "Collection Time" },
                  { k: "showReportReleased", l: "Reporting Time" },
                ].map((f) => (
                  <div key={f.k} className="flex items-center justify-between">
                    <Label className="text-[10px] cursor-pointer" htmlFor={f.k}>
                      {f.l}
                    </Label>
                    <Switch
                      id={f.k}
                      checked={(config.patientBlock as any)[f.k]}
                      onCheckedChange={(c) =>
                        updateConfig("patientBlock", f.k, c)
                      }
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* PATIENT BLOCK STYLE */}
          {renderComponentStyleControls(
            "patientBlock",
            config.patientBlock.style,
            updateComponentStyle.bind(null, "patientBlock"),
          )}
        </>
      )}
    </div>
  );

  const renderBodyTab = () => (
    <div className="space-y-6 animate-in fade-in">
      <Card className="shadow-none border-slate-200">
        <CardHeader className="pb-3 bg-slate-50">
          <CardTitle className="text-sm">Table Settings</CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-xs">Group by Department</Label>
              <p className="text-[9px] text-slate-500">
                Adds headers like BIOCHEMISTRY
              </p>
            </div>
            <Switch
              checked={config.bodyOptions.groupDepartmentWise}
              onCheckedChange={(c) =>
                updateConfig("bodyOptions", "groupDepartmentWise", c)
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-xs">Show Ref Ranges</Label>
            </div>
            <Switch
              checked={config.bodyOptions.showBiologicalRef}
              onCheckedChange={(c) =>
                updateConfig("bodyOptions", "showBiologicalRef", c)
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-xs">Show Test Timestamps</Label>
              <p className="text-[9px] text-slate-500">
                Collected, Received, Reported below table
              </p>
            </div>
            <Switch
              checked={config.bodyOptions.showTestTimestamps}
              onCheckedChange={(c) =>
                updateConfig("bodyOptions", "showTestTimestamps", c)
              }
            />
          </div>
          <div className="space-y-2 pt-2 border-t">
            <div className="flex justify-between">
              <Label className="text-xs">Table Font Size</Label>
              <span>{config.bodyOptions.tableFontSize}px</span>
            </div>
            <Slider
              min={8}
              max={16}
              step={1}
              value={[config.bodyOptions.tableFontSize]}
              onValueChange={(v) =>
                updateConfig("bodyOptions", "tableFontSize", v[0])
              }
            />
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <Label className="text-xs font-bold uppercase text-slate-500">
          Document Flow Blocks
        </Label>
        <div className="grid grid-cols-4 gap-2 pb-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-[10px] px-1"
            onClick={() =>
              setConfig({
                ...config,
                body: [
                  ...config.body,
                  {
                    ...DEFAULT_COMPONENT_STYLE,
                    id: `b-${Date.now()}`,
                    type: "TEXT",
                    content: "",
                    y:
                      config.body.length > 0
                        ? config.body[config.body.length - 1].y + 100
                        : 350,
                    width: 700,
                    height: 80,
                    zIndex: 2,
                  },
                ],
              })
            }>
            <Type className="h-3 w-3 mr-1" /> Text
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-[10px] px-1"
            onClick={() =>
              setConfig({
                ...config,
                body: [
                  ...config.body,
                  {
                    ...DEFAULT_COMPONENT_STYLE,
                    id: `b-${Date.now()}`,
                    type: "RESULTS_TABLE",
                    y:
                      config.body.length > 0
                        ? config.body[config.body.length - 1].y + 100
                        : 350,
                    width: 700,
                    height: 280,
                    zIndex: 2,
                  },
                ],
              })
            }>
            <Table2 className="h-3 w-3 mr-1" /> Table
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-[10px] px-1"
            onClick={() =>
              setConfig({
                ...config,
                body: [
                  ...config.body,
                  {
                    ...DEFAULT_COMPONENT_STYLE,
                    id: `b-${Date.now()}`,
                    type: "SPACER",
                    height: 20,
                    y:
                      config.body.length > 0
                        ? config.body[config.body.length - 1].y + 100
                        : 350,
                    width: 700,
                    height: 40,
                    zIndex: 2,
                  },
                ],
              })
            }>
            <SplitSquareHorizontal className="h-3 w-3 mr-1" /> Space
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-[10px] px-1"
            onClick={() =>
              setConfig({
                ...config,
                body: [
                  ...config.body,
                  {
                    ...DEFAULT_COMPONENT_STYLE,
                    id: `b-${Date.now()}`,
                    type: "IMAGE",
                    imageUrl: "",
                    imageScale: 100,
                    y:
                      config.body.length > 0
                        ? config.body[config.body.length - 1].y + 100
                        : 350,
                    width: 700,
                    height: 200,
                    zIndex: 2,
                  },
                ],
              })
            }>
            <ImageIcon className="h-3 w-3 mr-1" /> Image
          </Button>
        </div>

        <div className="space-y-3">
          {config.body.map((block, idx) => (
            <div
              key={block.id}
              draggable
              onDragStart={(e) => {
                setDraggedIdx(idx);
                e.dataTransfer.effectAllowed = "move";
              }}
              onDragOver={(e) => {
                e.preventDefault();
                if (draggedIdx !== null && draggedIdx !== idx) {
                  const n = [...config.body];
                  const item = n[draggedIdx];
                  n.splice(draggedIdx, 1);
                  n.splice(idx, 0, item);
                  setDraggedIdx(idx);
                  setConfig({ ...config, body: n });
                }
              }}
              onDragEnd={() => setDraggedIdx(null)}
              className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm group cursor-move hover:border-blue-400 hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <GripVertical className="h-4 w-4 text-slate-300" />
                  <Badge
                    variant="secondary"
                    className="text-[9px] uppercase font-bold">
                    {block.type.replace("_", " ")}
                  </Badge>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-5 w-5 text-slate-400 hover:text-red-500"
                  onClick={() => {
                    const n = [...config.body];
                    n.splice(idx, 1);
                    setConfig({ ...config, body: n });
                  }}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>

              {block.type === "TEXT" && (
                <div
                  className="space-y-2 mt-2 cursor-text"
                  draggable={false}
                  onDragStart={(e) => e.preventDefault()}>
                  <Textarea
                    value={block.content}
                    onChange={(e) => {
                      const n = [...config.body];
                      n[idx].content = e.target.value;
                      setConfig({ ...config, body: n });
                    }}
                    placeholder="Type here..."
                    className="text-xs font-mono min-h-[60px]"
                  />
                  <div className="flex flex-wrap gap-1">
                    {MERGE_TAGS.map((tag) => (
                      <button
                        key={tag.tag}
                        onClick={() => {
                          const n = [...config.body];
                          n[idx].content =
                            (n[idx].content || "") + tag.tag + " ";
                          setConfig({ ...config, body: n });
                        }}
                        className="text-[8px] bg-slate-100 border text-slate-600 px-1.5 py-0.5 rounded hover:bg-blue-50">
                        + {tag.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {block.type === "SPACER" && (
                <div
                  className="flex items-center gap-4 mt-2 px-2 cursor-auto"
                  draggable={false}
                  onDragStart={(e) => e.preventDefault()}>
                  <Label className="text-xs whitespace-nowrap">Height</Label>
                  <Slider
                    min={5}
                    max={200}
                    step={5}
                    value={[block.height || 20]}
                    onValueChange={(v) => {
                      const n = [...config.body];
                      n[idx].height = v[0];
                      setConfig({ ...config, body: n });
                    }}
                  />
                </div>
              )}
              {block.type === "IMAGE" && (
                <div
                  className="space-y-2 mt-2 cursor-auto"
                  draggable={false}
                  onDragStart={(e) => e.preventDefault()}>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleBlockImageUpload(e, idx)}
                    className="text-[10px] h-7"
                  />
                  {block.imageUrl && (
                    <div className="flex items-center gap-4 mt-2">
                      <Label className="text-[10px]">Scale</Label>
                      <Slider
                        min={10}
                        max={100}
                        step={5}
                        value={[block.imageScale || 100]}
                        onValueChange={(v) => {
                          const n = [...config.body];
                          n[idx].imageScale = v[0];
                          setConfig({ ...config, body: n });
                        }}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* BODY BLOCK STYLE CONTROLS */}
              <div className="mt-4 pt-3 border-t">
                <Label className="text-[10px] font-bold mb-2 block">
                  Block Style
                </Label>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div>
                    <Label className="text-[9px]">X</Label>
                    <Input
                      type="number"
                      value={block.x}
                      onChange={(e) =>
                        updateBodyBlockStyle(idx, "x", Number(e.target.value))
                      }
                      className="h-7 text-[10px]"
                    />
                  </div>
                  <div>
                    <Label className="text-[9px]">Y</Label>
                    <Input
                      type="number"
                      value={block.y}
                      onChange={(e) =>
                        updateBodyBlockStyle(idx, "y", Number(e.target.value))
                      }
                      className="h-7 text-[10px]"
                    />
                  </div>
                  <div>
                    <Label className="text-[9px]">W</Label>
                    <Input
                      type="number"
                      value={block.width}
                      onChange={(e) =>
                        updateBodyBlockStyle(
                          idx,
                          "width",
                          Number(e.target.value),
                        )
                      }
                      className="h-7 text-[10px]"
                    />
                  </div>
                  <div>
                    <Label className="text-[9px]">H</Label>
                    <Input
                      type="number"
                      value={block.height}
                      onChange={(e) =>
                        updateBodyBlockStyle(
                          idx,
                          "height",
                          Number(e.target.value),
                        )
                      }
                      className="h-7 text-[10px]"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div>
                    <Label className="text-[9px]">Bg</Label>
                    <div className="flex gap-1">
                      <Input
                        type="color"
                        className="w-6 h-6 p-0 border-none"
                        value={block.background}
                        onChange={(e) =>
                          updateBodyBlockStyle(
                            idx,
                            "background",
                            e.target.value,
                          )
                        }
                      />
                      <Input
                        className="h-6 text-[10px] flex-1"
                        value={block.background}
                        onChange={(e) =>
                          updateBodyBlockStyle(
                            idx,
                            "background",
                            e.target.value,
                          )
                        }
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-[9px]">Border</Label>
                    <Input
                      type="number"
                      value={block.borderWidth}
                      onChange={(e) =>
                        updateBodyBlockStyle(
                          idx,
                          "borderWidth",
                          Number(e.target.value),
                        )
                      }
                      className="h-7 text-[10px]"
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderFooterTab = () => (
    <div className="space-y-6 animate-in fade-in pb-10">
      <div className="flex justify-between items-center bg-blue-50 p-3 rounded-lg border border-blue-100">
        <Label className="font-bold text-blue-900">Enable Footer</Label>
        <Switch
          checked={config.footer.show}
          onCheckedChange={(c) => updateConfig("footer", "show", c)}
        />
      </div>
      {config.footer.show && (
        <>
          <Card className="shadow-none border-slate-200">
            <CardContent className="pt-4 space-y-6">
              <div className="grid grid-cols-3 bg-slate-100 p-1 rounded-md gap-1">
                {(["standard", "html", "image"] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => updateConfig("footer", "mode", mode)}
                    className={`text-xs py-1.5 font-medium rounded-sm capitalize flex items-center justify-center gap-1 ${
                      config.footer.mode === mode
                        ? "bg-white shadow text-blue-600"
                        : "text-slate-500"
                    }`}>
                    {mode === "standard" && (
                      <LayoutTemplate className="h-3 w-3" />
                    )}
                    {mode === "html" && <Code className="h-3 w-3" />}
                    {mode === "image" && <ImageIcon className="h-3 w-3" />}{" "}
                    {mode}
                  </button>
                ))}
              </div>

              {config.footer.mode === "standard" && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Label className="text-xs font-bold text-slate-500 uppercase">
                      Signatories
                    </Label>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => {
                        const newSigs = [
                          ...config.footer.signatures,
                          {
                            id: `sig-${Date.now()}`,
                            name: "New Dr",
                            qualifications: "",
                            title: "",
                            imageUrl: "",
                            show: true,
                            width: 120,
                          },
                        ];
                        updateConfig("footer", "signatures", newSigs);
                      }}>
                      <Plus className="h-3 w-3 mr-1" /> Add
                    </Button>
                  </div>
                  {config.footer.signatures.map((sig, idx) => (
                    <div
                      key={sig.id}
                      className="border border-slate-200 p-3 rounded-lg bg-slate-50 relative space-y-3">
                      <div className="flex justify-between items-center mb-1">
                        <Switch
                          checked={sig.show}
                          onCheckedChange={(c) => {
                            const n = [...config.footer.signatures];
                            n[idx].show = c;
                            updateConfig("footer", "signatures", n);
                          }}
                        />
                        <button
                          onClick={() => {
                            const n = [...config.footer.signatures];
                            n.splice(idx, 1);
                            updateConfig("footer", "signatures", n);
                          }}
                          className="text-slate-400 hover:text-red-500">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          value={sig.name}
                          onChange={(e) => {
                            const n = [...config.footer.signatures];
                            n[idx].name = e.target.value;
                            updateConfig("footer", "signatures", n);
                          }}
                          className="h-8 text-xs bg-white"
                          placeholder="Name"
                        />
                        <Input
                          value={sig.qualifications}
                          onChange={(e) => {
                            const n = [...config.footer.signatures];
                            n[idx].qualifications = e.target.value;
                            updateConfig("footer", "signatures", n);
                          }}
                          className="h-8 text-xs bg-white"
                          placeholder="Qualifications"
                        />
                        <Input
                          value={sig.title}
                          onChange={(e) => {
                            const n = [...config.footer.signatures];
                            n[idx].title = e.target.value;
                            updateConfig("footer", "signatures", n);
                          }}
                          className="h-8 text-xs bg-white col-span-2"
                          placeholder="Designation"
                        />
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-20 border bg-white flex items-center justify-center overflow-hidden rounded shrink-0">
                          {sig.imageUrl ? (
                            <img
                              src={sig.imageUrl}
                              className="h-full object-contain"
                            />
                          ) : (
                            <span className="text-[9px] text-slate-300">
                              Img
                            </span>
                          )}
                        </div>
                        <div className="space-y-2 flex-1">
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) {
                                const r = new FileReader();
                                r.onloadend = () => {
                                  const n = [...config.footer.signatures];
                                  n[idx].imageUrl = r.result as string;
                                  updateConfig("footer", "signatures", n);
                                };
                                r.readAsDataURL(f);
                              }
                            }}
                            className="h-7 text-[10px]"
                          />
                          <div className="flex items-center gap-2">
                            <Label className="text-[9px] whitespace-nowrap">
                              Width ({sig.width}px)
                            </Label>
                            <Slider
                              min={50}
                              max={250}
                              step={10}
                              value={[sig.width]}
                              onValueChange={(v) => {
                                const n = [...config.footer.signatures];
                                n[idx].width = v[0];
                                updateConfig("footer", "signatures", n);
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="space-y-2 pt-4 border-t">
                    <Label className="text-xs font-bold text-slate-500 uppercase">
                      Bottom Image (Accreditations)
                    </Label>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) =>
                        handleFileUpload(e, "footer", "footerBottomImage")
                      }
                      className="text-xs"
                    />
                  </div>
                </div>
              )}

              {config.footer.mode === "html" && (
                <div className="space-y-2">
                  <Label className="text-xs">Raw HTML</Label>
                  <Textarea
                    value={config.footer.html}
                    onChange={(e) =>
                      updateConfig("footer", "html", e.target.value)
                    }
                    className="font-mono text-xs h-32"
                    placeholder="<div style='text-align: center'>Footer</div>"
                  />
                </div>
              )}
              {config.footer.mode === "image" && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Footer Graphic</Label>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) =>
                        handleFileUpload(e, "footer", "fullImage")
                      }
                      className="text-xs"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label className="text-xs">Height</Label>
                      <span className="text-xs">{config.footer.height}px</span>
                    </div>
                    <Slider
                      min={50}
                      max={400}
                      step={5}
                      value={[config.footer.height]}
                      onValueChange={(v) =>
                        updateConfig("footer", "height", v[0])
                      }
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2 pt-4 border-t">
                <Label className="text-xs font-bold text-slate-500 uppercase">
                  Disclaimer Text
                </Label>
                <Textarea
                  value={config.footer.text}
                  onChange={(e) =>
                    updateConfig("footer", "text", e.target.value)
                  }
                  className="text-[10px]"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
          {/* FOOTER STYLE */}
          {renderComponentStyleControls(
            "footer",
            config.footer.style,
            updateComponentStyle.bind(null, "footer"),
          )}
        </>
      )}
    </div>
  );

  // ============================================================================
  // 6. THE A4 LIVE PREVIEW ENGINE (ABSOLUTE POSITIONED COMPONENTS)
  // ============================================================================
  const renderPreview = () => {
    const paperWidth = 794; // 210mm in px at 96dpi
    const paperHeight = 1123; // 297mm
    const margin = config.layout.margins;

    const contentArea = {
      x: margin.left * 3.78, // mm to px approx
      y: margin.top * 3.78,
      width: paperWidth - (margin.left + margin.right) * 3.78,
      height: paperHeight - (margin.top + margin.bottom) * 3.78,
    };

    const updateBodyBlockPos = (index: number, d: any) => {
      updateBodyBlockStyle(index, "x", d.x);
      updateBodyBlockStyle(index, "y", d.y);
    };

    const updateBodyBlockSize = (
      index: number,
      ref: any,
      delta: any,
      position: any,
    ) => {
      updateBodyBlockStyle(index, "width", ref.offsetWidth);
      updateBodyBlockStyle(index, "height", ref.offsetHeight);
      updateBodyBlockStyle(index, "x", position.x);
      updateBodyBlockStyle(index, "y", position.y);
    };

    // Render a single body block inside Rnd
    const renderBodyBlockRnd = (block: BodyBlockStyle, idx: number) => {
      const isLocked = block.locked || purePreviewMode;
      return (
        <Rnd
          key={block.id}
          size={{ width: block.width, height: block.height }}
          position={{ x: block.x, y: block.y }}
          onDragStop={(e, d) => {
            if (!isLocked) updateBodyBlockPos(idx, d);
          }}
          onResizeStop={(e, dir, ref, delta, position) => {
            if (!isLocked) updateBodyBlockSize(idx, ref, delta, position);
          }}
          bounds="parent"
          enableResizing={!isLocked}
          disableDragging={isLocked}
          style={{ zIndex: block.zIndex }}
          className={isLocked ? "" : "border-2 border-dashed border-blue-400"}>
          <div
            style={{
              width: "100%",
              height: "100%",
              background: block.background,
              border: `${block.borderWidth}px solid ${block.borderColor}`,
              borderRadius: `${block.borderRadius}px`,
              padding: `${block.padding}px`,
              fontFamily: block.fontFamily,
              fontSize: `${block.fontSize}px`,
              fontWeight: block.fontWeight,
              fontStyle: block.fontStyle,
              textAlign: block.textAlign,
              opacity: block.opacity,
              overflow: "hidden",
            }}>
            {/* Content based on type */}
            {block.type === "RESULTS_TABLE" && (
              <div className="w-full h-full overflow-auto custom-scrollbar">
                {config.bodyOptions.groupDepartmentWise && (
                  <div className="bg-slate-100 font-bold py-1 px-2 mb-2 text-[11px] uppercase text-center border-b border-slate-300 tracking-wider">
                    BIOCHEMISTRY
                  </div>
                )}
                <h3 className="text-center font-bold text-base mb-3 underline uppercase">
                  Liver Function Test
                </h3>
                <table
                  className="w-full border-collapse"
                  style={{ fontSize: `${config.bodyOptions.tableFontSize}px` }}>
                  <thead className="border-b-2">
                    <tr>
                      <th className="py-2 px-1 text-left">Parameter</th>
                      <th className="py-2 px-1">Result</th>
                      <th className="py-2 px-1">Unit</th>
                      {config.bodyOptions.showBiologicalRef && (
                        <th className="py-2 px-1">Ref. Range</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="py-1.5 px-1">Bilirubin (Total)</td>
                      <td className="py-1.5 px-1 font-bold">0.50</td>
                      <td className="py-1.5 px-1 text-slate-500">mg/dl</td>
                      {config.bodyOptions.showBiologicalRef && (
                        <td className="py-1.5 px-1 text-slate-500">
                          0.2 - 1.2
                        </td>
                      )}
                    </tr>
                    <tr className="border-b">
                      <td className="py-1.5 px-1">S.G.O.T (AST)</td>
                      <td className="py-1.5 px-1 font-bold text-red-600">
                        45.2 (H)
                      </td>
                      <td className="py-1.5 px-1 text-slate-500">IU/L</td>
                      {config.bodyOptions.showBiologicalRef && (
                        <td className="py-1.5 px-1 text-slate-500">0 - 40</td>
                      )}
                    </tr>
                  </tbody>
                </table>
                {config.bodyOptions.showTestTimestamps && (
                  <p className="text-[9px] text-slate-500 italic mt-3">
                    Collected: 12/05/2026 08:30 AM, Received: 12/05/2026 09:15
                    AM, Reported: 12/05/2026 02:15 PM
                  </p>
                )}
              </div>
            )}
            {block.type === "TEXT" && (
              <div
                className="whitespace-pre-wrap leading-relaxed"
                dangerouslySetInnerHTML={{
                  __html: block.content
                    ? block.content.replace(/\{\{.*?\}\}/g, (m) =>
                        purePreviewMode
                          ? `<span class="font-bold">${m}</span>`
                          : `<span class="bg-blue-100 text-blue-800 font-bold">${m}</span>`,
                      )
                    : !purePreviewMode
                      ? "<span class='text-slate-300 italic'>Empty Text Block...</span>"
                      : "",
                }}
              />
            )}
            {block.type === "SPACER" && (
              <div
                className="w-full h-full flex items-center justify-center text-slate-400"
                style={{ height: block.height }}>
                {!purePreviewMode && `${block.height}px`}
              </div>
            )}
            {block.type === "IMAGE" && (
              <div className="w-full h-full flex justify-center items-center">
                {block.imageUrl ? (
                  <img
                    src={block.imageUrl}
                    style={{
                      width: `${block.imageScale || 100}%`,
                      objectFit: "contain",
                    }}
                    alt="Content"
                  />
                ) : (
                  !purePreviewMode && (
                    <span className="text-slate-400">Image Placeholder</span>
                  )
                )}
              </div>
            )}
          </div>
        </Rnd>
      );
    };

    // Render header Rnd
    const renderHeaderRnd = () => {
      if (!config.header.show) return null;
      const style = config.header.style;
      const isLocked = style.locked || purePreviewMode;
      return (
        <Rnd
          size={{ width: style.width, height: style.height }}
          position={{ x: style.x, y: style.y }}
          onDragStop={(e, d) => {
            if (!isLocked) {
              updateComponentStyle("header", "x", d.x);
              updateComponentStyle("header", "y", d.y);
            }
          }}
          onResizeStop={(e, dir, ref, delta, position) => {
            if (!isLocked) {
              updateComponentStyle("header", "width", ref.offsetWidth);
              updateComponentStyle("header", "height", ref.offsetHeight);
              updateComponentStyle("header", "x", position.x);
              updateComponentStyle("header", "y", position.y);
            }
          }}
          bounds="parent"
          enableResizing={!isLocked}
          disableDragging={isLocked}
          style={{ zIndex: style.zIndex }}
          className={isLocked ? "" : "border-2 border-dashed border-blue-500"}>
          <div
            style={{
              width: "100%",
              height: "100%",
              background: style.background,
              border: `${style.borderWidth}px solid ${style.borderColor}`,
              borderRadius: `${style.borderRadius}px`,
              padding: `${style.padding}px`,
              fontFamily: style.fontFamily,
              fontSize: `${style.fontSize}px`,
              fontWeight: style.fontWeight,
              fontStyle: style.fontStyle,
              textAlign: style.textAlign,
              opacity: style.opacity,
            }}>
            {config.header.mode === "image" ? (
              <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400">
                {config.header.fullImage ? (
                  <img
                    src={config.header.fullImage}
                    className="w-full h-full object-cover"
                    alt="Header"
                  />
                ) : (
                  "Header Image Area"
                )}
              </div>
            ) : config.header.mode === "html" ? (
              <div
                dangerouslySetInnerHTML={{
                  __html:
                    config.header.html ||
                    "<div class='text-center py-4'>Custom HTML Header</div>",
                }}
              />
            ) : (
              <div className="flex items-center h-full">
                {config.header.logoUrl ? (
                  <img
                    src={config.header.logoUrl}
                    className="h-12 object-contain mr-4"
                    alt="Logo"
                  />
                ) : (
                  <div className="h-12 w-20 bg-slate-100 border rounded flex items-center justify-center text-xs text-slate-400 mr-4">
                    Logo
                  </div>
                )}
                <div>
                  <h1 className="text-xl font-bold uppercase">
                    {config.header.title}
                  </h1>
                  <p
                    className="text-sm"
                    style={{ color: config.branding.secondaryColor }}>
                    {config.header.subTitle}
                  </p>
                </div>
                {/* QR inside header if enabled and preset */}
                {config.qrCode.show && config.qrCode.mode === "preset" && (
                  <div
                    className="ml-auto"
                    style={{ marginRight: config.qrCode.margin }}>
                    <AsyncQRCode
                      value="https://patholab.cloud/verify/123"
                      size={config.qrCode.size}
                      showPageNumber={config.qrCode.showPageNumber}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </Rnd>
      );
    };

    // Render patient block Rnd
    const renderPatientRnd = () => {
      if (!config.patientBlock.show) return null;
      const style = config.patientBlock.style;
      const isLocked = style.locked || purePreviewMode;
      return (
        <Rnd
          size={{ width: style.width, height: style.height }}
          position={{ x: style.x, y: style.y }}
          onDragStop={(e, d) => {
            if (!isLocked) {
              updateComponentStyle("patientBlock", "x", d.x);
              updateComponentStyle("patientBlock", "y", d.y);
            }
          }}
          onResizeStop={(e, dir, ref, delta, position) => {
            if (!isLocked) {
              updateComponentStyle("patientBlock", "width", ref.offsetWidth);
              updateComponentStyle("patientBlock", "height", ref.offsetHeight);
              updateComponentStyle("patientBlock", "x", position.x);
              updateComponentStyle("patientBlock", "y", position.y);
            }
          }}
          bounds="parent"
          enableResizing={!isLocked}
          disableDragging={isLocked}
          style={{ zIndex: style.zIndex }}
          className={isLocked ? "" : "border-2 border-dashed border-blue-500"}>
          <div
            style={{
              width: "100%",
              height: "100%",
              background: style.background,
              border: `${style.borderWidth}px solid ${style.borderColor}`,
              borderRadius: `${style.borderRadius}px`,
              padding: `${style.padding}px`,
              fontFamily: style.fontFamily,
              fontSize: `${config.patientBlock.fontSize}px`,
              fontWeight: style.fontWeight,
              fontStyle: style.fontStyle,
              textAlign: style.textAlign,
              opacity: style.opacity,
              overflow: "auto",
            }}>
            {config.patientBlock.barcode.show && (
              <div
                className="mb-3"
                style={{ textAlign: config.patientBlock.barcode.position }}>
                <Barcode
                  value="Z-992384"
                  height={config.patientBlock.barcode.height}
                  width={1.5}
                  fontSize={10}
                  displayValue={true}
                  margin={0}
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-[12px]">
              <div>
                {config.patientBlock.showName && (
                  <p>
                    <span className="font-bold">Name:</span> MR. JOHN DOE
                  </p>
                )}
                {config.patientBlock.showPatientId && (
                  <p>
                    <span className="font-bold">ID:</span> UHID-992384
                  </p>
                )}
                {config.patientBlock.showSentBy && (
                  <p>
                    <span className="font-bold">Sent By:</span> CITY HOSPITAL
                  </p>
                )}
              </div>
              <div>
                {config.patientBlock.showAgeSex && (
                  <p>
                    <span className="font-bold">Age/Gender:</span> 45 Yrs / Male
                  </p>
                )}
                {config.patientBlock.showEmployeeId && (
                  <p>
                    <span className="font-bold">Employee:</span> EMP-001
                  </p>
                )}
                {config.patientBlock.showRefDoctor && (
                  <p>
                    <span className="font-bold">Ref Dr:</span> Dr. Sarah Smith
                  </p>
                )}
                {config.patientBlock.showSampleCollection && (
                  <p>
                    <span className="font-bold">Collected:</span> 12/05/2026
                    08:30 AM
                  </p>
                )}
                {config.patientBlock.showReportReleased && (
                  <p>
                    <span className="font-bold">Released:</span> 12/05/2026
                    02:15 PM
                  </p>
                )}
              </div>
            </div>
          </div>
        </Rnd>
      );
    };

    // Render footer Rnd
    const renderFooterRnd = () => {
      if (!config.footer.show) return null;
      const style = config.footer.style;
      const isLocked = style.locked || purePreviewMode;
      return (
        <Rnd
          size={{ width: style.width, height: style.height }}
          position={{ x: style.x, y: style.y }}
          onDragStop={(e, d) => {
            if (!isLocked) {
              updateComponentStyle("footer", "x", d.x);
              updateComponentStyle("footer", "y", d.y);
            }
          }}
          onResizeStop={(e, dir, ref, delta, position) => {
            if (!isLocked) {
              updateComponentStyle("footer", "width", ref.offsetWidth);
              updateComponentStyle("footer", "height", ref.offsetHeight);
              updateComponentStyle("footer", "x", position.x);
              updateComponentStyle("footer", "y", position.y);
            }
          }}
          bounds="parent"
          enableResizing={!isLocked}
          disableDragging={isLocked}
          style={{ zIndex: style.zIndex }}
          className={isLocked ? "" : "border-2 border-dashed border-blue-500"}>
          <div
            style={{
              width: "100%",
              height: "100%",
              background: style.background,
              border: `${style.borderWidth}px solid ${style.borderColor}`,
              borderRadius: `${style.borderRadius}px`,
              padding: `${style.padding}px`,
              fontFamily: style.fontFamily,
              fontSize: `${style.fontSize}px`,
              fontWeight: style.fontWeight,
              fontStyle: style.fontStyle,
              textAlign: style.textAlign,
              opacity: style.opacity,
            }}>
            {config.footer.mode === "image" ? (
              <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400">
                {config.footer.fullImage ? (
                  <img
                    src={config.footer.fullImage}
                    className="w-full h-full object-cover"
                    alt="Footer"
                  />
                ) : (
                  "Footer Image Area"
                )}
              </div>
            ) : config.footer.mode === "html" ? (
              <div
                dangerouslySetInnerHTML={{
                  __html:
                    config.footer.html ||
                    "<div class='text-center py-4'>HTML Footer</div>",
                }}
              />
            ) : (
              <div className="flex flex-col h-full">
                <div className="flex justify-around items-end flex-1">
                  {config.footer.signatures.map((sig, idx) =>
                    sig.show ? (
                      <div
                        key={idx}
                        className="flex flex-col items-center"
                        style={{ width: sig.width }}>
                        <div className="h-12 mb-1">
                          {sig.imageUrl ? (
                            <img
                              src={sig.imageUrl}
                              className="h-full object-contain"
                              alt="Sig"
                            />
                          ) : (
                            !purePreviewMode && (
                              <div className="text-xs text-slate-300 border border-dashed p-2">
                                Sign
                              </div>
                            )
                          )}
                        </div>
                        <div className="w-full text-center border-t pt-1">
                          <p className="font-bold text-xs">{sig.name}</p>
                          {sig.qualifications && (
                            <p className="text-[10px]">{sig.qualifications}</p>
                          )}
                          {sig.title && (
                            <p className="text-[10px] font-bold uppercase">
                              {sig.title}
                            </p>
                          )}
                        </div>
                      </div>
                    ) : null,
                  )}
                </div>
                {config.footer.footerBottomImage && (
                  <div className="flex justify-center mt-2">
                    <img
                      src={config.footer.footerBottomImage}
                      className="max-h-12 object-contain"
                      alt="Accreditation"
                    />
                  </div>
                )}
                <div
                  className="text-xs mt-2 text-center border-t pt-2"
                  dangerouslySetInnerHTML={{ __html: config.footer.text }}
                />
              </div>
            )}
          </div>
        </Rnd>
      );
    };

    return (
      <div className="flex-1 bg-slate-300 overflow-auto custom-scrollbar flex justify-center py-10 relative">
        <div className="absolute top-4 right-8 flex gap-2 z-50">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowJsonEditor(true)}
            className="bg-white shadow-sm">
            <Code className="w-4 h-4 mr-2" /> JSON
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPurePreviewMode(!purePreviewMode)}
            className={`bg-white shadow-sm ${purePreviewMode ? "text-blue-600" : ""}`}>
            <Eye className="w-4 h-4 mr-2" />{" "}
            {purePreviewMode ? "Edit" : "Preview"}
          </Button>
        </div>

        <div
          ref={previewRef}
          className="bg-white shadow-2xl relative"
          style={{
            width: `${paperWidth}px`,
            height: `${paperHeight}px`,
            padding: `${margin.top}mm ${margin.right}mm ${margin.bottom}mm ${margin.left}mm`,
            fontFamily: config.branding.fontFamily,
            fontSize: `${config.branding.globalFontSize}px`,
            color: "#1e293b",
            position: "relative",
          }}>
          {/* Page border absolute */}
          {config.layout.border.show && (
            <div
              className="absolute pointer-events-none"
              style={{
                top: config.layout.border.padding,
                bottom: config.layout.border.padding,
                left: config.layout.border.padding,
                right: config.layout.border.padding,
                border: `${config.layout.border.weight}px solid ${config.layout.border.color}`,
                zIndex: 100,
              }}
            />
          )}

          {/* Watermark absolute */}
          {config.branding.watermarkUrl && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
              <img
                src={config.branding.watermarkUrl}
                style={{
                  opacity: config.branding.watermarkOpacity,
                  maxWidth: "80%",
                  maxHeight: "80%",
                }}
                alt="watermark"
              />
            </div>
          )}

          {/* Absolute positioned components */}
          <div style={{ position: "relative", width: "100%", height: "100%" }}>
            {renderHeaderRnd()}
            {renderPatientRnd()}
            {config.body.map((block, idx) => renderBodyBlockRnd(block, idx))}
            {renderFooterRnd()}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <div className="w-[400px] border-r bg-white flex flex-col shrink-0 z-20 shadow-xl">
        <div className="p-4 border-b bg-slate-50 flex items-center justify-between shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="h-8 w-8">
            <ArrowLeft size={16} />
          </Button>
          <Input
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            className="h-8 font-bold border-transparent bg-transparent text-center focus-visible:ring-1"
            placeholder="Template Name"
          />
          <Button
            onClick={handleSave}
            disabled={saving}
            size="sm"
            className="bg-blue-600 h-8">
            {saving ? (
              <Loader2 className="animate-spin" size={14} />
            ) : (
              <Save size={14} className="mr-1" />
            )}{" "}
            Save
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-5 h-9 mb-6 bg-slate-100/50 p-1">
              <TabsTrigger value="setup" className="text-[10px] px-1">
                <Settings size={12} className="mr-1" /> Setup
              </TabsTrigger>
              <TabsTrigger value="header" className="text-[10px] px-1">
                Header
              </TabsTrigger>
              <TabsTrigger value="patient" className="text-[10px] px-1">
                Patient
              </TabsTrigger>
              <TabsTrigger value="body" className="text-[10px] px-1">
                Body
              </TabsTrigger>
              <TabsTrigger value="footer" className="text-[10px] px-1">
                Footer
              </TabsTrigger>
            </TabsList>
            <TabsContent value="setup" className="m-0">
              {renderSetupTab()}
            </TabsContent>
            <TabsContent value="header" className="m-0">
              {renderHeaderTab()}
            </TabsContent>
            <TabsContent value="patient" className="m-0">
              {renderPatientTab()}
            </TabsContent>
            <TabsContent value="body" className="m-0">
              {renderBodyTab()}
            </TabsContent>
            <TabsContent value="footer" className="m-0">
              {renderFooterTab()}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {renderPreview()}

      {/* JSON Editor Modal */}
      {showJsonEditor && (
        <div className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-3xl shadow-2xl animate-in zoom-in-95">
            <CardHeader className="flex flex-row justify-between items-center pb-4 border-b">
              <CardTitle className="flex items-center gap-2">
                <Code size={18} /> JSON Configuration
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowJsonEditor(false)}>
                <X size={18} />
              </Button>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <p className="text-xs text-slate-500">
                Copy this JSON to backup or import.
              </p>
              <Textarea
                value={jsonInput || JSON.stringify(config, null, 2)}
                onChange={(e) => setJsonInput(e.target.value)}
                className="font-mono text-[10px] h-[50vh] bg-slate-900 text-green-400 p-4 custom-scrollbar"
                spellCheck={false}
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() =>
                    navigator.clipboard.writeText(
                      JSON.stringify(config, null, 2),
                    )
                  }>
                  <Download size={14} className="mr-2" /> Copy State
                </Button>
                <Button
                  onClick={() => {
                    try {
                      setConfig(
                        deepMerge(DEFAULT_CONFIG, JSON.parse(jsonInput)),
                      );
                      setShowJsonEditor(false);
                      toast.success("JSON Applied!");
                    } catch {
                      toast.error("Invalid JSON!");
                    }
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700">
                  <Upload size={14} className="mr-2" /> Apply JSON
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
