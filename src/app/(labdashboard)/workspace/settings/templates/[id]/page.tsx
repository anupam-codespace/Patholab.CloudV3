"use client";

import React, { useState, useEffect } from "react";
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
} from "lucide-react";
import toast from "react-hot-toast";

// ✅ 1. Reverted to standard 'qrcode' package
import QRCode from "qrcode";
import Barcode from "react-barcode";
import { Rnd } from "react-rnd";

import { getTemplateById, saveTemplate } from "@/actions/report-settings";

// ============================================================================
// 1. ENTERPRISE TYPESCRIPT INTERFACES
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
  height: number;
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
}
export interface BodyOptionsConfig {
  groupDepartmentWise: boolean;
  tableFontSize: number;
  showBiologicalRef: boolean;
  showTestTimestamps: boolean;
} // ✅ Added showTestTimestamps
export interface BodyBlock {
  id: string;
  type: "TEXT" | "RESULTS_TABLE" | "SPACER" | "IMAGE";
  content?: string;
  height?: number;
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
}

export interface TemplateConfig {
  layout: { margins: MarginConfig; border: BorderConfig };
  branding: BrandingConfig;
  header: HeaderConfig;
  qrCode: QRCodeConfig;
  patientBlock: PatientBlockConfig;
  bodyOptions: BodyOptionsConfig;
  body: BodyBlock[];
  footer: FooterConfig;
}

// ============================================================================
// 2. ASYNC QR CODE WRAPPER COMPONENT
// ============================================================================
// Since the standard 'qrcode' package generates a data URL asynchronously,
// we wrap it in a small component for the live preview.
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
        className="bg-muted animate-pulse border shadow-sm"
      />
    );

  return (
    <div
      className="flex flex-col items-center bg-card p-1 border shadow-sm"
      style={{ width: size, height: size + (showPageNumber ? 15 : 0) }}>
      <img
        src={src}
        alt="QR Code"
        style={{ width: size - 8, height: size - 8 }}
      />
      {showPageNumber && (
        <span className="text-[8px] mt-1 font-bold text-muted-foreground whitespace-nowrap">
          Page 1 of 1
        </span>
      )}
    </div>
  );
};

// ============================================================================
// 3. DEFAULT CONFIGURATION
// ============================================================================

const MERGE_TAGS = [
  { label: "Patient Name", tag: "{{patient.name}}" },
  { label: "Patient Age", tag: "{{patient.age}}" },
  { label: "Patient Gender", tag: "{{patient.gender}}" },
  { label: "Patient ID", tag: "{{patient.patientId}}" },
  { label: "Sample ID", tag: "{{sample.sampleId}}" },
  { label: "Current Date", tag: "{{system.currentDate}}" },
];

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
  },
  bodyOptions: {
    groupDepartmentWise: true,
    tableFontSize: 11,
    showBiologicalRef: true,
    showTestTimestamps: true,
  }, // ✅ Default to true
  body: [{ id: `block-${Date.now()}`, type: "RESULTS_TABLE" }],
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
  // 5. SIDEBAR RENDERERS
  // ============================================================================

  const renderSetupTab = () => (
    <div className="space-y-6 animate-in fade-in">
      <Card className="shadow-none border-border">
        <CardHeader className="pb-3 bg-muted/30">
          <CardTitle className="text-sm">Page Layout (A4)</CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          <Label className="text-xs font-bold text-muted-foreground uppercase">
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

      <Card className="shadow-none border-border">
        <CardHeader className="pb-3 bg-muted/30 flex flex-row items-center justify-between">
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

      <Card className="shadow-none border-border">
        <CardHeader className="pb-3 bg-muted/30">
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
      <div className="flex justify-between items-center bg-primary/10 p-3 rounded-lg border border-blue-100">
        <Label className="font-bold text-blue-900">Enable Header Zone</Label>
        <Switch
          checked={config.header.show}
          onCheckedChange={(c) => updateConfig("header", "show", c)}
        />
      </div>

      {config.header.show && (
        <Card className="shadow-none border-border">
          <CardContent className="pt-4 space-y-4">
            <div className="grid grid-cols-3 bg-muted p-1 rounded-md gap-1">
              {(["standard", "html", "image"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => updateConfig("header", "mode", mode)}
                  className={`text-xs py-1.5 font-medium rounded-sm capitalize flex items-center justify-center gap-1 ${config.header.mode === mode ? "bg-card shadow text-primary" : "text-muted-foreground"}`}>
                  {mode === "standard" && (
                    <LayoutTemplate className="h-3 w-3" />
                  )}
                  {mode === "html" && <Code className="h-3 w-3" />}
                  {mode === "image" && <ImageIcon className="h-3 w-3" />} {mode}
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
                    onChange={(e) => handleFileUpload(e, "header", "fullImage")}
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
      )}

      {/* QR CODE SETTINGS */}
      <Card className="shadow-none border-border">
        <CardHeader className="pb-2 bg-muted/30 flex flex-row items-center justify-between">
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
                <SelectTrigger className="h-8 text-xs bg-card">
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
                    <SelectTrigger className="h-8 text-xs bg-card">
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
              <div className="bg-primary/10 border border-primary/20 p-3 rounded text-[10px] text-blue-800 flex gap-2">
                <Move size={14} className="shrink-0" /> Drag the QR code freely
                in the preview panel to set its absolute coordinates.
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
                  onValueChange={(v) => updateConfig("qrCode", "size", v[0])}
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t">
              <Label className="text-xs font-bold text-muted-foreground">
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
    </div>
  );

  const renderPatientTab = () => (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex justify-between items-center bg-primary/10 p-3 rounded-lg border border-blue-100">
        <Label className="font-bold text-blue-900">Show Demographics</Label>
        <Switch
          checked={config.patientBlock.show}
          onCheckedChange={(c) => updateConfig("patientBlock", "show", c)}
        />
      </div>

      {config.patientBlock.show && (
        <>
          <Card className="shadow-none border-border">
            <CardHeader className="pb-2 bg-muted/30 flex flex-row items-center justify-between">
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
                    <SelectTrigger className="h-8 text-xs bg-card">
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

          <Card className="shadow-none border-border">
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

              <Label className="text-xs font-bold text-muted-foreground uppercase mt-4 block">
                Visible Fields
              </Label>
              <div className="grid grid-cols-2 gap-3 bg-muted/30 p-4 border rounded-lg">
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
        </>
      )}
    </div>
  );

  const renderBodyTab = () => (
    <div className="space-y-6 animate-in fade-in">
      <Card className="shadow-none border-border">
        <CardHeader className="pb-3 bg-muted/30">
          <CardTitle className="text-sm">Table Settings</CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-xs">Group by Department</Label>
              <p className="text-[9px] text-muted-foreground">
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
          {/* ✅ Added Test Timestamps Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-xs">Show Test Timestamps</Label>
              <p className="text-[9px] text-muted-foreground">
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
        <Label className="text-xs font-bold uppercase text-muted-foreground">
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
                  { id: `b-${Date.now()}`, type: "TEXT", content: "" },
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
                  { id: `b-${Date.now()}`, type: "RESULTS_TABLE" },
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
                  { id: `b-${Date.now()}`, type: "SPACER", height: 20 },
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
                    id: `b-${Date.now()}`,
                    type: "IMAGE",
                    imageUrl: "",
                    imageScale: 100,
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
              className="bg-card border border-border rounded-lg p-3 shadow-sm group cursor-move hover:border-blue-400 hover:shadow-md transition-all">
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
                  className="h-5 w-5 text-muted-foreground/70 hover:text-red-500"
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
                        className="text-[8px] bg-muted border text-muted-foreground px-1.5 py-0.5 rounded hover:bg-primary/10">
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
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderFooterTab = () => (
    <div className="space-y-6 animate-in fade-in pb-10">
      <div className="flex justify-between items-center bg-primary/10 p-3 rounded-lg border border-blue-100">
        <Label className="font-bold text-blue-900">Enable Footer</Label>
        <Switch
          checked={config.footer.show}
          onCheckedChange={(c) => updateConfig("footer", "show", c)}
        />
      </div>
      {config.footer.show && (
        <Card className="shadow-none border-border">
          <CardContent className="pt-4 space-y-6">
            <div className="grid grid-cols-3 bg-muted p-1 rounded-md gap-1">
              {(["standard", "html", "image"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => updateConfig("footer", "mode", mode)}
                  className={`text-xs py-1.5 font-medium rounded-sm capitalize flex items-center justify-center gap-1 ${config.footer.mode === mode ? "bg-card shadow text-primary" : "text-muted-foreground"}`}>
                  {mode === "standard" && (
                    <LayoutTemplate className="h-3 w-3" />
                  )}
                  {mode === "html" && <Code className="h-3 w-3" />}
                  {mode === "image" && <ImageIcon className="h-3 w-3" />} {mode}
                </button>
              ))}
            </div>

            {config.footer.mode === "standard" && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label className="text-xs font-bold text-muted-foreground uppercase">
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
                    className="border border-border p-3 rounded-lg bg-muted/30 relative space-y-3">
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
                        className="text-muted-foreground/70 hover:text-red-500">
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
                        className="h-8 text-xs bg-card"
                        placeholder="Name"
                      />
                      <Input
                        value={sig.qualifications}
                        onChange={(e) => {
                          const n = [...config.footer.signatures];
                          n[idx].qualifications = e.target.value;
                          updateConfig("footer", "signatures", n);
                        }}
                        className="h-8 text-xs bg-card"
                        placeholder="Qualifications"
                      />
                      <Input
                        value={sig.title}
                        onChange={(e) => {
                          const n = [...config.footer.signatures];
                          n[idx].title = e.target.value;
                          updateConfig("footer", "signatures", n);
                        }}
                        className="h-8 text-xs bg-card col-span-2"
                        placeholder="Designation"
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-20 border bg-card flex items-center justify-center overflow-hidden rounded shrink-0">
                        {sig.imageUrl ? (
                          <img
                            src={sig.imageUrl}
                            className="h-full object-contain"
                          />
                        ) : (
                          <span className="text-[9px] text-slate-300">Img</span>
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
                  <Label className="text-xs font-bold text-muted-foreground uppercase">
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
                    onChange={(e) => handleFileUpload(e, "footer", "fullImage")}
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
              <Label className="text-xs font-bold text-muted-foreground uppercase">
                Disclaimer Text
              </Label>
              <Textarea
                value={config.footer.text}
                onChange={(e) => updateConfig("footer", "text", e.target.value)}
                className="text-[10px]"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  // ============================================================================
  // 6. THE A4 LIVE PREVIEW ENGINE
  // ============================================================================

  const renderPreview = () => {
    const m = config.layout.margins;
    const marginStr = `${m.top}mm ${m.right}mm ${m.bottom}mm ${m.left}mm`;

    // ✅ Updated QR Renderer handling standard `qrcode` npm package internally
    const RenderQR = ({ position }: { position: string }) => {
      if (!config.qrCode.show) return null;

      const isCustom = config.qrCode.mode === "custom";
      if (!isCustom && config.qrCode.position !== position) return null;
      if (isCustom && position !== "custom") return null;

      const qrContent = (
        <AsyncQRCode
          value="https://patholab.cloud/verify/123"
          size={config.qrCode.size}
          showPageNumber={config.qrCode.showPageNumber}
        />
      );

      if (isCustom && !purePreviewMode) {
        return (
          <Rnd
            size={{ width: config.qrCode.size, height: "auto" }}
            position={{ x: config.qrCode.x, y: config.qrCode.y }}
            onDragStop={(e, d) => {
              updateConfig("qrCode", "x", d.x);
              updateConfig("qrCode", "y", d.y);
            }}
            bounds="parent"
            className="z-50 border-2 border-dashed border-blue-500 bg-primary/10/50 hover:cursor-move flex flex-col items-center justify-center">
            {qrContent}
          </Rnd>
        );
      }

      const qrStyle: any = { position: "absolute", zIndex: 50 };
      if (isCustom) {
        qrStyle.left = config.qrCode.x;
        qrStyle.top = config.qrCode.y;
      } else {
        if (position.includes("header"))
          qrStyle.top = `calc(${m.top}mm + ${config.qrCode.margin}px)`;
        if (position.includes("footer"))
          qrStyle.bottom = `calc(${m.bottom}mm + ${config.qrCode.margin}px)`;
        if (position.includes("left"))
          qrStyle.left = `calc(${m.left}mm + ${config.qrCode.margin}px)`;
        if (position.includes("right"))
          qrStyle.right = `calc(${m.right}mm + ${config.qrCode.margin}px)`;
      }

      return <div style={qrStyle}>{qrContent}</div>;
    };

    return (
      <div className="flex-1 bg-slate-300 overflow-y-auto custom-scrollbar flex justify-center py-10 relative">
        <div className="absolute top-4 right-8 flex gap-2 z-50">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowJsonEditor(true)}
            className="bg-card shadow-sm hover:text-primary">
            <Code className="w-4 h-4 mr-2" /> JSON
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPurePreviewMode(!purePreviewMode)}
            className={`bg-card shadow-sm ${purePreviewMode ? "text-primary border-blue-400" : ""}`}>
            <Eye className="w-4 h-4 mr-2" />{" "}
            {purePreviewMode ? "Edit Mode" : "Print Preview"}
          </Button>
        </div>

        {/* THE PAPER */}
        <div
          className="bg-card shadow-2xl relative flex flex-col transition-all duration-300 ease-in-out overflow-hidden"
          style={{
            width: "210mm",
            minHeight: "297mm",
            padding: marginStr,
            fontFamily: config.branding.fontFamily,
            fontSize: `${config.branding.globalFontSize}px`,
            color: "#1e293b",
          }}>
          {/* Absolute Page Border */}
          {config.layout.border.show && (
            <div
              className="absolute pointer-events-none"
              style={{
                top: config.layout.border.padding,
                bottom: config.layout.border.padding,
                left: config.layout.border.padding,
                right: config.layout.border.padding,
                border: `${config.layout.border.weight}px solid ${config.layout.border.color}`,
                zIndex: 10,
              }}></div>
          )}

          {/* Absolute Watermark */}
          {config.branding.watermarkUrl && (
            <div className="absolute inset-0 z-0 pointer-events-none flex items-center justify-center">
              <img
                src={config.branding.watermarkUrl}
                style={{
                  opacity: config.branding.watermarkOpacity,
                  maxWidth: "80%",
                  maxHeight: "80%",
                  objectFit: "contain",
                }}
                alt="watermark"
              />
            </div>
          )}

          {/* Absolute QR Codes */}
          <RenderQR position="header-right" />
          <RenderQR position="header-left" />
          <RenderQR position="footer-right" />
          <RenderQR position="footer-left" />
          <RenderQR position="custom" />

          <div className="relative z-10 flex flex-col h-full w-full">
            {/* HEADER ZONE */}
            {config.header.show && (
              <div
                className={`w-full mb-4 pb-4 ${purePreviewMode ? "" : "border-dashed hover:bg-muted/50/50 cursor-pointer"} ${config.header.mode === "image" ? "" : "border-b-[3px]"}`}
                style={{
                  borderColor: purePreviewMode
                    ? config.branding.primaryColor
                    : "#cbd5e1",
                  borderBottomColor: config.branding.primaryColor,
                }}>
                {config.header.mode === "image" ? (
                  <div
                    className="w-full bg-muted flex items-center justify-center text-muted-foreground/70 overflow-hidden"
                    style={{ height: `${config.header.height}px` }}>
                    {config.header.fullImage ? (
                      <img
                        src={config.header.fullImage}
                        className="w-full h-full object-cover"
                        alt="Header"
                      />
                    ) : (
                      "100% Header Image Area"
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
                  <div className="flex items-center relative pr-[80px]">
                    {config.header.logoUrl ? (
                      <img
                        src={config.header.logoUrl}
                        className="h-16 object-contain"
                        alt="Logo"
                      />
                    ) : (
                      <div className="h-16 w-32 bg-muted border rounded flex items-center justify-center text-xs text-slate-400">
                        Logo
                      </div>
                    )}
                    <div className="flex-1 px-4">
                      <h1
                        className="text-2xl font-bold uppercase tracking-wide"
                        style={{ color: config.branding.primaryColor }}>
                        {config.header.title || "LAB TITLE"}
                      </h1>
                      <p
                        className="text-sm font-medium"
                        style={{ color: config.branding.secondaryColor }}>
                        {config.header.subTitle || "Lab Subtitle"}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* PATIENT BLOCK ZONE */}
            {config.patientBlock.show && (
              <div
                className={`mb-6 break-inside-avoid ${purePreviewMode ? "" : "border border-dashed border-transparent hover:border-border p-2 -mx-2 rounded"}`}>
                {config.patientBlock.barcode.show && (
                  <div
                    className="mb-4 mt-2"
                    style={{
                      textAlign: config.patientBlock.barcode.position as any,
                    }}>
                    <div
                      className="inline-block"
                      style={{
                        transform: `scale(${config.patientBlock.barcode.scale})`,
                        transformOrigin:
                          config.patientBlock.barcode.position === "center"
                            ? "center"
                            : config.patientBlock.barcode.position,
                      }}>
                      <Barcode
                        value="Z-992384"
                        height={config.patientBlock.barcode.height}
                        width={1.5}
                        fontSize={10}
                        displayValue={true}
                        margin={0}
                      />
                    </div>
                  </div>
                )}
                <div
                  className="grid grid-cols-2 gap-x-8 gap-y-1 border-b pb-4"
                  style={{
                    fontSize: `${config.patientBlock.fontSize}px`,
                    borderColor: config.branding.primaryColor,
                  }}>
                  <div className="space-y-1.5">
                    {config.patientBlock.showName && (
                      <div className="flex">
                        <span
                          className="w-28 font-bold"
                          style={{ color: config.branding.secondaryColor }}>
                          Patient Name
                        </span>
                        <span className="font-bold uppercase">
                          : MR. JOHN DOE
                        </span>
                      </div>
                    )}
                    {config.patientBlock.showPatientId && (
                      <div className="flex">
                        <span
                          className="w-28 font-bold"
                          style={{ color: config.branding.secondaryColor }}>
                          Patient ID
                        </span>
                        <span>: UHID-992384</span>
                      </div>
                    )}
                    {config.patientBlock.showSentBy && (
                      <div className="flex">
                        <span
                          className="w-28 font-bold"
                          style={{ color: config.branding.secondaryColor }}>
                          Sent By
                        </span>
                        <span>: CITY HOSPITAL</span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    {config.patientBlock.showAgeSex && (
                      <div className="flex">
                        <span
                          className="w-32 font-bold"
                          style={{ color: config.branding.secondaryColor }}>
                          Age / Gender
                        </span>
                        <span className="font-bold">: 45 Yrs / Male</span>
                      </div>
                    )}
                    {config.patientBlock.showEmployeeId && (
                      <div className="flex">
                        <span
                          className="w-32 font-bold"
                          style={{ color: config.branding.secondaryColor }}>
                          Employee ID
                        </span>
                        <span>: EMP-001</span>
                      </div>
                    )}
                    {config.patientBlock.showRefDoctor && (
                      <div className="flex">
                        <span
                          className="w-32 font-bold"
                          style={{ color: config.branding.secondaryColor }}>
                          Ref. Doctor
                        </span>
                        <span>: Dr. Sarah Smith</span>
                      </div>
                    )}
                    {config.patientBlock.showSampleCollection && (
                      <div className="flex">
                        <span
                          className="w-32 font-bold"
                          style={{ color: config.branding.secondaryColor }}>
                          Sample Collected
                        </span>
                        <span>: 12/05/2026 08:30 AM</span>
                      </div>
                    )}
                    {config.patientBlock.showReportReleased && (
                      <div className="flex">
                        <span
                          className="w-32 font-bold"
                          style={{ color: config.branding.secondaryColor }}>
                          Report Released
                        </span>
                        <span>: 12/05/2026 02:15 PM</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* BODY ZONE */}
            <div className="flex-1 flex flex-col min-h-[200px]">
              {config.body.map((block, i) => (
                <div
                  key={block.id}
                  className={`${purePreviewMode ? "" : "border border-dashed border-transparent hover:border-blue-300 relative group"}`}>
                  {!purePreviewMode && (
                    <div className="absolute -left-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 cursor-move text-slate-400">
                      <GripVertical size={14} />
                    </div>
                  )}

                  {block.type === "RESULTS_TABLE" && (
                    <div className="mb-6 w-full break-inside-avoid">
                      {config.bodyOptions.groupDepartmentWise && (
                        <div className="bg-muted font-bold py-1.5 px-3 mb-4 text-[12px] uppercase text-center border-y border-border tracking-wider">
                          BIOCHEMISTRY
                        </div>
                      )}
                      <h2
                        className="text-center font-bold text-lg mb-4 underline uppercase tracking-wide"
                        style={{ color: config.branding.primaryColor }}>
                        Liver Function Test
                      </h2>
                      <table
                        className="w-full border-collapse"
                        style={{
                          fontSize: `${config.bodyOptions.tableFontSize}px`,
                        }}>
                        <thead
                          className="border-y-2 text-left"
                          style={{ borderColor: config.branding.primaryColor }}>
                          <tr>
                            <th className="py-2.5 px-1 font-bold">
                              Test Parameter
                            </th>
                            <th className="py-2.5 px-1 font-bold">Result</th>
                            <th className="py-2.5 px-1 font-bold">Unit</th>
                            {config.bodyOptions.showBiologicalRef && (
                              <th className="py-2.5 px-1 font-bold">
                                Bio. Ref. Range
                              </th>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b border-slate-100">
                            <td className="py-2.5 px-1 font-medium">
                              Bilirubin (Total)
                            </td>
                            <td className="py-2.5 px-1 font-bold">0.50</td>
                            <td className="py-2.5 px-1 text-muted-foreground">
                              mg/dl
                            </td>
                            {config.bodyOptions.showBiologicalRef && (
                              <td className="py-2.5 px-1 text-muted-foreground">
                                0.2 - 1.2
                              </td>
                            )}
                          </tr>
                          <tr className="border-b border-slate-100">
                            <td className="py-2.5 px-1 font-medium">
                              S. G. O. T (AST)
                            </td>
                            <td className="py-2.5 px-1 font-bold text-red-600">
                              45.2 (H)
                            </td>
                            <td className="py-2.5 px-1 text-muted-foreground">IU/L</td>
                            {config.bodyOptions.showBiologicalRef && (
                              <td className="py-2.5 px-1 text-muted-foreground">
                                0 - 40
                              </td>
                            )}
                          </tr>
                        </tbody>
                      </table>

                      {/* ✅ NEW: TEST METADATA / TIMESTAMPS FOOTER */}
                      {config.bodyOptions.showTestTimestamps && (
                        <div className="mt-4 text-[10px] text-muted-foreground italic space-y-1">
                          <p>
                            (Collected At: 12/05/2026 08:30 AM, Received At:
                            12/05/2026 09:15 AM, Reported At: 12/05/2026 02:15
                            PM)
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {block.type === "TEXT" && (
                    <div
                      className="mb-4 whitespace-pre-wrap leading-relaxed"
                      style={{
                        fontSize: `${config.branding.globalFontSize}px`,
                      }}
                      dangerouslySetInnerHTML={{
                        __html: block.content
                          ? block.content.replace(
                              /\{\{.*?\}\}/g,
                              (m) =>
                                `<span class="${purePreviewMode ? "" : "bg-blue-100 text-blue-800"} font-bold">${m}</span>`,
                            )
                          : !purePreviewMode
                            ? "<span class='text-slate-300 italic'>Empty Text Block...</span>"
                            : "",
                      }}
                    />
                  )}
                  {block.type === "SPACER" && (
                    <div
                      style={{ height: `${block.height || 20}px` }}
                      className={`${purePreviewMode ? "" : "bg-primary/10/50 flex items-center justify-center text-[10px] text-blue-400"}`}>
                      {!purePreviewMode && `${block.height}px Spacer`}
                    </div>
                  )}
                  {block.type === "IMAGE" && (
                    <div
                      className={`flex justify-center mb-4 ${!block.imageUrl && !purePreviewMode ? "h-32 bg-muted border border-dashed flex items-center justify-center text-slate-400" : ""}`}>
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
                        !purePreviewMode && "Image Block"
                      )}
                    </div>
                  )}
                </div>
              ))}

              <div className="text-center mt-auto mb-6 break-inside-avoid">
                <span className="text-[10px] font-bold text-muted-foreground/70 border-t border-b border-border py-1 px-8 tracking-widest uppercase">
                  *** End of Report ***
                </span>
              </div>
            </div>

            {/* FOOTER ZONE */}
            {config.footer.show && (
              <div
                className={`mt-auto pt-4 relative ${purePreviewMode ? "" : "border border-dashed border-transparent hover:border-border p-2 -mx-2 rounded"} ${config.footer.mode === "image" ? "" : "border-t-2"}`}
                style={{ borderTopColor: config.branding.primaryColor }}>
                {config.footer.mode === "image" ? (
                  <div
                    className="w-full bg-muted flex items-center justify-center text-muted-foreground/70 overflow-hidden"
                    style={{ height: `${config.footer.height}px` }}>
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
                        "<div class='text-center py-4'>Custom HTML Footer</div>",
                    }}
                  />
                ) : (
                  <div className="w-full flex flex-col items-center">
                    <div className="flex justify-around items-end w-full mb-4 px-10">
                      {config.footer.signatures.map(
                        (sig, idx) =>
                          sig.show && (
                            <div
                              key={idx}
                              className="flex flex-col items-center"
                              style={{ width: `${sig.width}px` }}>
                              <div className="h-16 flex items-end justify-center mb-1">
                                {sig.imageUrl ? (
                                  <img
                                    src={sig.imageUrl}
                                    className="h-full object-contain"
                                    alt="Sig"
                                  />
                                ) : (
                                  !purePreviewMode && (
                                    <div className="text-[10px] text-slate-300 border border-dashed px-4 py-2 w-full text-center">
                                      Sig
                                    </div>
                                  )
                                )}
                              </div>
                              <div className="w-full text-center border-t border-border pt-1">
                                <p className="font-bold text-[11px] text-foreground leading-tight whitespace-nowrap">
                                  {sig.name || "Doctor Name"}
                                </p>
                                {sig.qualifications && (
                                  <p className="text-[9px] text-muted-foreground leading-tight whitespace-nowrap">
                                    {sig.qualifications}
                                  </p>
                                )}
                                {sig.title && (
                                  <p className="font-bold text-[9px] text-foreground uppercase mt-0.5 whitespace-nowrap">
                                    {sig.title}
                                  </p>
                                )}
                              </div>
                            </div>
                          ),
                      )}
                    </div>
                    {config.footer.footerBottomImage && (
                      <div className="w-full flex justify-center mt-2 border-t border-slate-100 pt-3">
                        <img
                          src={config.footer.footerBottomImage}
                          className="max-h-16 object-contain"
                          alt="Accreditation"
                        />
                      </div>
                    )}
                  </div>
                )}
                <div
                  className="text-[9px] text-center mt-4 pb-2 pt-2 border-t border-border"
                  style={{ color: config.branding.secondaryColor }}
                  dangerouslySetInnerHTML={{ __html: config.footer.text || "" }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar Controls */}
      <div className="w-[400px] border-r bg-card flex flex-col shrink-0 z-20 shadow-xl">
        <div className="p-4 border-b bg-muted/30 flex items-center justify-between shrink-0">
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
            className="bg-primary h-8">
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
                <Code size={18} /> JSON Configuration (Advanced)
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowJsonEditor(false)}>
                <X size={18} />
              </Button>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <p className="text-xs text-muted-foreground">
                Copy this JSON to backup your template, or paste JSON from
                another environment to import it.
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
                  className="bg-primary hover:bg-primary/90">
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
