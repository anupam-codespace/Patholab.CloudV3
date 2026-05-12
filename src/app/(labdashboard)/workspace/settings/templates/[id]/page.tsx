"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Save,
  Loader2,
  X,
  Plus,
  Trash2,
  Code,
  Image as ImageIcon,
  LayoutTemplate,
  ArrowLeft,
  GripVertical,
  Type,
  Table2,
  QrCode,
  SplitSquareHorizontal,
  Barcode,
} from "lucide-react";
import toast from "react-hot-toast";

// ✅ Import Server Actions
import { getTemplateById, saveTemplate } from "@/actions/report-settings";

const MERGE_TAGS = [
  { label: "Patient Name", tag: "{{patient.name}}" },
  { label: "Patient Age", tag: "{{patient.age}}" },
  { label: "Patient Gender", tag: "{{patient.gender}}" },
  { label: "Patient ID", tag: "{{patient.patientId}}" },
  { label: "Sample ID", tag: "{{sample.sampleId}}" },
];

const DEFAULT_CONFIG = {
  header: {
    show: true,
    mode: "standard",
    title: "GLOBIZ PATHOLAB",
    subTitle: "Medical District",
    html: "",
    height: 150,
  },
  patientBlock: {
    showBarcode: true,
    showName: true,
    showPatientId: true,
    showSentBy: true,
    showAgeSex: true,
    showEmployeeId: true,
    showRefDoctor: true,
    showSampleCollection: true,
    showReportReleased: true,
  },
  body: [{ id: "block-2", type: "RESULTS_TABLE" }],
  footer: {
    show: true,
    mode: "standard",
    text: "**Sample has been collected outside the laboratory. The results pertain to the sample received.",
    html: "",
    isoMarkUrls: [],
    signatures: [
      {
        name: "Dr. A. Jalil",
        qualifications: "MBBS, DCP",
        title: "Consultant Pathologist",
        imageUrl: "",
        show: true,
      },
      {
        name: "Dr. V.M. Somasunder",
        qualifications: "MBBS, MD, FRHS",
        title: "Consultant Microbiologist",
        imageUrl: "",
        show: true,
      },
    ],
    height: 100,
  },
  branding: { primaryColor: "#000000" },
};

export default function TemplateBuilderPage() {
  const params = useParams();
  const router = useRouter();
  const templateId = params.id === "new" ? null : (params.id as string);

  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [templateName, setTemplateName] = useState(
    "Enterprise Clinical Report",
  );
  const [config, setConfig] = useState<any>(DEFAULT_CONFIG);
  const [activeTab, setActiveTab] = useState("header");

  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);

  useEffect(() => {
    const init = async () => {
      setDataLoading(true);
      if (templateId) {
        const data = await getTemplateById(templateId);
        if (data) {
          setTemplateName(data.name);
          let loadedConfig =
            typeof data.config === "string"
              ? JSON.parse(data.config)
              : data.config;
          if (!loadedConfig) loadedConfig = {};

          if (!loadedConfig.body) loadedConfig.body = DEFAULT_CONFIG.body;
          if (!loadedConfig.patientBlock)
            loadedConfig.patientBlock = DEFAULT_CONFIG.patientBlock;
          if (!loadedConfig.footer) loadedConfig.footer = {};
          if (!loadedConfig.footer.isoMarkUrls)
            loadedConfig.footer.isoMarkUrls = [];
          if (!Array.isArray(loadedConfig.footer.signatures))
            loadedConfig.footer.signatures = DEFAULT_CONFIG.footer.signatures;

          setConfig(loadedConfig);
        } else {
          toast.error("Template not found");
          router.push("/workspace/settings/templates");
        }
      } else {
        setConfig(DEFAULT_CONFIG);
      }
      setDataLoading(false);
    };
    init();
  }, [templateId, router]);

  const handleSave = async () => {
    if (!templateName.trim())
      return toast.error("Please enter a template name");
    setLoading(true);
    try {
      await saveTemplate(templateId, templateName, config);
      toast.success("Template Saved Successfully!");
      if (!templateId) router.push("/workspace/settings/templates");
    } catch (e) {
      toast.error("Save failed");
    } finally {
      setLoading(false);
    }
  };

  const addBlock = (type: string) =>
    setConfig({
      ...config,
      body: [
        ...(config.body || []),
        { id: `block-${Date.now()}`, type, content: "" },
      ],
    });
  const removeBlock = (index: number) => {
    const n = [...config.body];
    n.splice(index, 1);
    setConfig({ ...config, body: n });
  };
  const updateBlock = (index: number, content: string) => {
    const n = [...config.body];
    n[index].content = content;
    setConfig({ ...config, body: n });
  };
  const insertMergeTag = (index: number, tag: string) => {
    const n = [...config.body];
    n[index].content = (n[index].content || "") + tag + " ";
    setConfig({ ...config, body: n });
  };

  const togglePatientField = (field: string, value: boolean) => {
    setConfig({
      ...config,
      patientBlock: {
        ...(config.patientBlock || DEFAULT_CONFIG.patientBlock),
        [field]: value,
      },
    });
  };

  const onDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIdx(index);
    e.dataTransfer.effectAllowed = "move";
    (e.target as HTMLElement).style.opacity = "0.5";
  };
  const onDragEnd = (e: React.DragEvent) => {
    (e.target as HTMLElement).style.opacity = "1";
    setDraggedIdx(null);
  };
  const onDragOver = (index: number) => {
    if (draggedIdx === null || draggedIdx === index) return;
    const n = [...config.body];
    const item = n[draggedIdx];
    n.splice(draggedIdx, 1);
    n.splice(index, 0, item);
    setDraggedIdx(index);
    setConfig({ ...config, body: n });
  };

  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    section: "header" | "footer" | "branding",
    key: string,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () =>
      setConfig((prev: any) => ({
        ...prev,
        [section]: { ...prev[section], [key]: reader.result },
      }));
    reader.readAsDataURL(file);
  };

  const updateSignatory = (index: number, key: string, value: any) => {
    const newSigs = [...(config.footer.signatures || [])];
    if (newSigs[index]) newSigs[index][key] = value;
    setConfig({ ...config, footer: { ...config.footer, signatures: newSigs } });
  };

  const handleSigUpload = (
    index: number,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => updateSignatory(index, "imageUrl", reader.result);
    reader.readAsDataURL(file);
  };

  if (dataLoading)
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" />
      </div>
    );

  const patientBlockConfig = config.patientBlock || DEFAULT_CONFIG.patientBlock;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-50">
      {/* TOP BAR */}
      <div className="bg-white border-b px-6 py-4 flex justify-between items-center shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5 text-slate-500" />
          </Button>
          <div>
            <Label className="text-xs text-slate-500 uppercase tracking-wider font-bold">
              Template Name
            </Label>
            <Input
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              className="h-8 w-64 font-semibold text-lg border-none shadow-none px-0 focus-visible:ring-0 bg-transparent"
              placeholder="Enter template name..."
            />
          </div>
        </div>
        <Button
          onClick={handleSave}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700">
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}{" "}
          Save Configuration
        </Button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* LEFT PANEL: CONTROLS */}
        <div className="w-1/3 overflow-y-auto p-6 border-r bg-white custom-scrollbar flex flex-col gap-6">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full">
            <TabsList className="w-full grid grid-cols-4 mb-6">
              <TabsTrigger value="header">Header</TabsTrigger>
              <TabsTrigger value="body">Body</TabsTrigger>
              <TabsTrigger value="footer">Footer</TabsTrigger>
              <TabsTrigger value="branding">Brand</TabsTrigger>
            </TabsList>

            {/* HEADER TAB */}
            <TabsContent value="header" className="space-y-4">
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <Label>Show Graphic Header</Label>
                    <Switch
                      checked={config.header?.show}
                      onCheckedChange={(c) =>
                        setConfig({
                          ...config,
                          header: { ...config.header, show: c },
                        })
                      }
                    />
                  </div>
                  <div className="grid grid-cols-3 bg-slate-100 p-1 rounded-md gap-1">
                    {["standard", "html", "image"].map((mode) => (
                      <button
                        key={mode}
                        onClick={() =>
                          setConfig({
                            ...config,
                            header: { ...config.header, mode },
                          })
                        }
                        className={`text-xs py-1.5 font-medium rounded-sm capitalize flex items-center justify-center gap-1 ${config.header?.mode === mode ? "bg-white shadow text-blue-600" : "text-slate-500"}`}>
                        {mode === "standard" && (
                          <LayoutTemplate className="h-3 w-3" />
                        )}
                        {mode === "html" && <Code className="h-3 w-3" />}
                        {mode === "image" && <ImageIcon className="h-3 w-3" />}
                        {mode}
                      </button>
                    ))}
                  </div>

                  {/* STANDARD MODE HEADER */}
                  {config.header?.mode === "standard" && (
                    <>
                      <div className="space-y-2">
                        <Label>Title</Label>
                        <Input
                          value={config.header?.title}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              header: {
                                ...config.header,
                                title: e.target.value,
                              },
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Subtitle</Label>
                        <Input
                          value={config.header?.subTitle}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              header: {
                                ...config.header,
                                subTitle: e.target.value,
                              },
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Logo</Label>
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) =>
                            handleFileUpload(e, "header", "logoUrl")
                          }
                        />
                      </div>
                    </>
                  )}

                  {/* HTML MODE HEADER */}
                  {config.header?.mode === "html" && (
                    <div className="space-y-2">
                      <Label>Header HTML Code</Label>
                      <Textarea
                        className="text-xs font-mono"
                        value={config.header?.html}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            header: { ...config.header, html: e.target.value },
                          })
                        }
                        rows={6}
                        placeholder="<div class='p-4 text-center'>Custom HTML Header</div>"
                      />
                    </div>
                  )}

                  {/* IMAGE MODE HEADER */}
                  {config.header?.mode === "image" && (
                    <div className="space-y-3">
                      <Label>Upload Full Header Image</Label>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) =>
                          handleFileUpload(e, "header", "fullImage")
                        }
                      />
                      <div className="flex justify-between items-center mt-2">
                        <Label className="text-xs">Header Height (px)</Label>
                        <span className="text-xs text-slate-500 font-bold">
                          {config.header?.height || 150}px
                        </span>
                      </div>
                      <input
                        type="range"
                        min="50"
                        max="400"
                        step="10"
                        value={config.header?.height || 150}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            header: {
                              ...config.header,
                              height: parseInt(e.target.value),
                            },
                          })
                        }
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* PATIENT INFO TOGGLES (Always available in Header Tab) */}
              <div className="space-y-3 pt-6 border-t mt-6">
                <Label className="text-xs font-bold uppercase text-slate-500">
                  Patient Details (Repeats on every page)
                </Label>
                <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Barcode</Label>
                    <Switch
                      checked={patientBlockConfig.showBarcode !== false}
                      onCheckedChange={(c) =>
                        togglePatientField("showBarcode", c)
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Patient ID</Label>
                    <Switch
                      checked={patientBlockConfig.showPatientId !== false}
                      onCheckedChange={(c) =>
                        togglePatientField("showPatientId", c)
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Sent By (Agency)</Label>
                    <Switch
                      checked={patientBlockConfig.showSentBy !== false}
                      onCheckedChange={(c) =>
                        togglePatientField("showSentBy", c)
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Age / Sex</Label>
                    <Switch
                      checked={patientBlockConfig.showAgeSex !== false}
                      onCheckedChange={(c) =>
                        togglePatientField("showAgeSex", c)
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Employee ID</Label>
                    <Switch
                      checked={patientBlockConfig.showEmployeeId !== false}
                      onCheckedChange={(c) =>
                        togglePatientField("showEmployeeId", c)
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Ref. Doctor</Label>
                    <Switch
                      checked={patientBlockConfig.showRefDoctor !== false}
                      onCheckedChange={(c) =>
                        togglePatientField("showRefDoctor", c)
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Sample Date</Label>
                    <Switch
                      checked={
                        patientBlockConfig.showSampleCollection !== false
                      }
                      onCheckedChange={(c) =>
                        togglePatientField("showSampleCollection", c)
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Report Released</Label>
                    <Switch
                      checked={patientBlockConfig.showReportReleased !== false}
                      onCheckedChange={(c) =>
                        togglePatientField("showReportReleased", c)
                      }
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* BODY TAB */}
            <TabsContent value="body" className="space-y-6">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addBlock("TEXT")}>
                  <Type className="h-4 w-4 mr-2" /> Text Block
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addBlock("RESULTS_TABLE")}>
                  <Table2 className="h-4 w-4 mr-2" /> Results Table
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addBlock("SPACER")}>
                  <SplitSquareHorizontal className="h-4 w-4 mr-2" /> Spacer
                </Button>
              </div>

              <div className="space-y-3 pt-2">
                <Label className="text-xs font-bold uppercase text-slate-500">
                  Document Layout blocks
                </Label>
                {config.body?.map((block: any, idx: number) => (
                  <div
                    key={block.id}
                    draggable
                    onDragStart={(e) => onDragStart(e, idx)}
                    onDragOver={() => onDragOver(idx)}
                    onDragEnd={onDragEnd}
                    className="bg-white border rounded-lg p-3 shadow-sm group cursor-move hover:border-blue-400 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <GripVertical className="h-4 w-4 text-slate-300" />
                        <span className="text-xs font-bold text-slate-700 uppercase">
                          {block.type.replace("_", " ")}
                        </span>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 text-slate-400 hover:text-red-500"
                        onClick={() => removeBlock(idx)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    {block.type === "TEXT" && (
                      <div
                        className="space-y-2 mt-3 cursor-text"
                        draggable={false}
                        onDragStart={(e) => e.preventDefault()}>
                        <Textarea
                          value={block.content}
                          onChange={(e) => updateBlock(idx, e.target.value)}
                          placeholder="Type here or insert merge tags..."
                          className="text-xs font-mono min-h-[80px]"
                        />
                        <div className="flex flex-wrap gap-1">
                          {MERGE_TAGS.map((tag) => (
                            <button
                              key={tag.tag}
                              onClick={() => insertMergeTag(idx, tag.tag)}
                              className="text-[10px] bg-slate-100 border text-slate-600 px-1.5 py-0.5 rounded hover:bg-blue-50">
                              + {tag.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* FOOTER TAB */}
            <TabsContent value="footer" className="space-y-4">
              <Card>
                <CardContent className="pt-6 space-y-6">
                  <div className="flex justify-between items-center">
                    <Label>Show Footer</Label>
                    <Switch
                      checked={config.footer?.show}
                      onCheckedChange={(c) =>
                        setConfig({
                          ...config,
                          footer: { ...config.footer, show: c },
                        })
                      }
                    />
                  </div>

                  <div className="grid grid-cols-3 bg-slate-100 p-1 rounded-md gap-1">
                    {["standard", "html", "image"].map((mode) => (
                      <button
                        key={mode}
                        onClick={() =>
                          setConfig({
                            ...config,
                            footer: { ...config.footer, mode },
                          })
                        }
                        className={`text-xs py-1.5 font-medium rounded-sm capitalize flex items-center justify-center gap-1 ${config.footer?.mode === mode ? "bg-white shadow text-blue-600" : "text-slate-500"}`}>
                        {mode === "standard" && (
                          <LayoutTemplate className="h-3 w-3" />
                        )}
                        {mode === "html" && <Code className="h-3 w-3" />}
                        {mode === "image" && <ImageIcon className="h-3 w-3" />}
                        {mode}
                      </button>
                    ))}
                  </div>

                  {/* STANDARD MODE FOOTER */}
                  {config.footer?.mode === "standard" && (
                    <div className="space-y-4 pt-4 border-t">
                      <div className="flex justify-between items-center">
                        <Label>Signatories</Label>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setConfig((p: any) => ({
                              ...p,
                              footer: {
                                ...p.footer,
                                signatures: [
                                  ...(p.footer.signatures || []),
                                  {
                                    name: "Dr. New",
                                    qualifications: "MBBS",
                                    title: "Designation",
                                    show: true,
                                  },
                                ],
                              },
                            }))
                          }>
                          <Plus className="h-3 w-3 mr-1" /> Add
                        </Button>
                      </div>
                      {config.footer?.signatures?.map(
                        (sig: any, idx: number) => (
                          <div
                            key={idx}
                            className="border p-3 rounded-lg bg-slate-50 space-y-3 relative">
                            <button
                              onClick={() =>
                                setConfig((p: any) => ({
                                  ...p,
                                  footer: {
                                    ...p.footer,
                                    signatures: p.footer.signatures.filter(
                                      (_: any, i: number) => i !== idx,
                                    ),
                                  },
                                }))
                              }
                              className="absolute top-2 right-2 text-slate-400 hover:text-red-500">
                              <Trash2 className="h-4 w-4" />
                            </button>
                            <Input
                              value={sig.name}
                              onChange={(e) =>
                                updateSignatory(idx, "name", e.target.value)
                              }
                              className="h-8 text-xs bg-white"
                              placeholder="Doctor Name (e.g. Dr. A. Jalil.)"
                            />
                            <Input
                              value={sig.qualifications}
                              onChange={(e) =>
                                updateSignatory(
                                  idx,
                                  "qualifications",
                                  e.target.value,
                                )
                              }
                              className="h-8 text-xs bg-white"
                              placeholder="Qualifications (e.g. MBBS, DCP)"
                            />
                            <Input
                              value={sig.title}
                              onChange={(e) =>
                                updateSignatory(idx, "title", e.target.value)
                              }
                              className="h-8 text-xs bg-white"
                              placeholder="Designation (e.g. Consultant Pathologist)"
                            />
                            <div className="flex items-center gap-3 pt-1">
                              <div className="h-10 w-24 border bg-white flex items-center justify-center overflow-hidden rounded">
                                {sig.imageUrl ? (
                                  <img
                                    src={sig.imageUrl}
                                    className="h-full object-contain"
                                  />
                                ) : (
                                  <span className="text-[9px] text-slate-300">
                                    No Sig
                                  </span>
                                )}
                              </div>
                              <label className="cursor-pointer text-xs bg-white border px-2 py-1 rounded shadow-sm hover:bg-slate-100 flex-1 text-center">
                                Upload Signature Image
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => handleSigUpload(idx, e)}
                                  className="hidden"
                                />
                              </label>
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  )}

                  {/* HTML MODE FOOTER */}
                  {config.footer?.mode === "html" && (
                    <div className="space-y-2 pt-4 border-t">
                      <Label>Footer HTML Code</Label>
                      <Textarea
                        className="text-xs font-mono"
                        value={config.footer?.html}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            footer: { ...config.footer, html: e.target.value },
                          })
                        }
                        rows={6}
                        placeholder="<div class='p-4 text-center'>Custom HTML Footer</div>"
                      />
                    </div>
                  )}

                  {/* IMAGE MODE FOOTER */}
                  {config.footer?.mode === "image" && (
                    <div className="space-y-3 pt-4 border-t">
                      <Label>Upload Full Footer Image</Label>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) =>
                          handleFileUpload(e, "footer", "fullImage")
                        }
                      />
                      <div className="flex justify-between items-center mt-2">
                        <Label className="text-xs">Footer Height (px)</Label>
                        <span className="text-xs text-slate-500 font-bold">
                          {config.footer?.height || 100}px
                        </span>
                      </div>
                      <input
                        type="range"
                        min="50"
                        max="300"
                        step="10"
                        value={config.footer?.height || 100}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            footer: {
                              ...config.footer,
                              height: parseInt(e.target.value),
                            },
                          })
                        }
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                  )}

                  {/* DISCLAIMER TEXT (Available in all modes) */}
                  <div className="space-y-2 pt-4 border-t">
                    <Label>Footer Disclaimer Text</Label>
                    <Textarea
                      className="text-xs"
                      value={config.footer?.text}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          footer: { ...config.footer, text: e.target.value },
                        })
                      }
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* BRANDING TAB */}
            <TabsContent value="branding" className="space-y-4">
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div className="space-y-2">
                    <Label>Primary Color</Label>
                    <div className="flex gap-2 mt-2">
                      <Input
                        type="color"
                        className="w-12 h-10 p-1"
                        value={config.branding?.primaryColor}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            branding: {
                              ...config.branding,
                              primaryColor: e.target.value,
                            },
                          })
                        }
                      />
                      <Input
                        value={config.branding?.primaryColor}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            branding: {
                              ...config.branding,
                              primaryColor: e.target.value,
                            },
                          })
                        }
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* --- RIGHT PANEL: HIGH FIDELITY LIVE PREVIEW --- */}
        <div className="w-2/3 bg-slate-300 flex justify-center p-8 overflow-y-auto custom-scrollbar">
          <div
            className="bg-white shadow-2xl relative flex flex-col font-sans text-slate-900"
            style={{
              width: "210mm",
              minHeight: "297mm",
              padding: config.header?.show ? "10mm" : "0 10mm 10mm 10mm",
              borderTop:
                config.header?.mode === "image"
                  ? "none"
                  : `8px solid ${config.branding?.primaryColor || "#000000"}`,
            }}>
            {/* 1. FIXED HEADER ZONE */}
            <div className="w-full">
              {/* Graphic Header */}
              {config.header?.show && (
                <div
                  className="w-full mb-4 border-b-2 pb-4"
                  style={{ borderColor: config.branding?.primaryColor }}>
                  {config.header?.mode === "image" ? (
                    <div
                      className="w-full bg-slate-100 flex items-center justify-center text-slate-400 overflow-hidden"
                      style={{ height: `${config.header.height || 150}px` }}>
                      {config.header.fullImage ? (
                        <img
                          src={config.header.fullImage}
                          className="w-full h-full object-contain"
                          alt="Header"
                        />
                      ) : (
                        "Full Header Image Preview"
                      )}
                    </div>
                  ) : config.header?.mode === "html" ? (
                    <div
                      className="w-full"
                      dangerouslySetInnerHTML={{
                        __html:
                          config.header.html ||
                          "<div class='text-slate-400 text-center py-4 border border-dashed'>Custom HTML Header Area</div>",
                      }}
                    />
                  ) : (
                    <div className="flex justify-between items-center">
                      {config.header?.logoUrl ? (
                        <img
                          src={config.header.logoUrl}
                          className="h-16 object-contain"
                          alt="Logo"
                        />
                      ) : (
                        <div className="h-16 w-32 bg-slate-50 border rounded flex items-center justify-center text-xs text-slate-400">
                          Logo
                        </div>
                      )}
                      <div className="text-right">
                        <h1
                          className="text-2xl font-bold uppercase tracking-wide"
                          style={{ color: config.branding?.primaryColor }}>
                          {config.header?.title}
                        </h1>
                        <p className="text-sm text-slate-600">
                          {config.header?.subTitle}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
              {!config.header?.show && (
                <div
                  style={{ height: `${config.header?.height || 150}px` }}></div>
              )}

              {/* Patient Details (Fixed inside header zone) */}
              <div className="mb-6 break-inside-avoid">
                {patientBlockConfig.showBarcode !== false && (
                  <div className="flex justify-between items-start mb-4 mt-2">
                    <div className="flex flex-col items-center">
                      <Barcode
                        value="Z82328"
                        height={35}
                        width={1.5}
                        fontSize={10}
                        displayValue={true}
                        margin={0}
                      />
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4 text-[13px] border-b pb-4 border-slate-300">
                  <div className="space-y-1.5">
                    {patientBlockConfig.showName !== false && (
                      <div className="grid grid-cols-[100px_auto]">
                        <span className="font-bold text-slate-600">Name</span>
                        <span className="font-bold uppercase">
                          : MR. ETTIYAPPAN .D
                        </span>
                      </div>
                    )}
                    {patientBlockConfig.showPatientId !== false && (
                      <div className="grid grid-cols-[100px_auto]">
                        <span className="font-bold text-slate-600">
                          Patient ID
                        </span>
                        <span>: Z82328 300326</span>
                      </div>
                    )}
                    {patientBlockConfig.showSentBy !== false && (
                      <div className="grid grid-cols-[100px_auto]">
                        <span className="font-bold text-slate-600">
                          Sent By
                        </span>
                        <span>: FARIDA PRIME TANNERY</span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    {patientBlockConfig.showAgeSex !== false && (
                      <div className="grid grid-cols-[130px_auto]">
                        <span className="font-bold text-slate-600">
                          Age/Sex
                        </span>
                        <span className="font-bold">: 57 Yrs. / M</span>
                      </div>
                    )}
                    {patientBlockConfig.showEmployeeId !== false && (
                      <div className="grid grid-cols-[130px_auto]">
                        <span className="font-bold text-slate-600">
                          Employee ID
                        </span>
                        <span>: w000384</span>
                      </div>
                    )}
                    {patientBlockConfig.showRefDoctor !== false && (
                      <div className="grid grid-cols-[130px_auto]">
                        <span className="font-bold text-slate-600">
                          Ref. Doctor
                        </span>
                        <span>: Dr. Sarah Smith</span>
                      </div>
                    )}
                    {patientBlockConfig.showSampleCollection !== false && (
                      <div className="grid grid-cols-[130px_auto]">
                        <span className="font-bold text-slate-600">
                          Sample Collection
                        </span>
                        <span>: 30/03/2026 18:47:44</span>
                      </div>
                    )}
                    {patientBlockConfig.showReportReleased !== false && (
                      <div className="grid grid-cols-[130px_auto]">
                        <span className="font-bold text-slate-600">
                          Report Released
                        </span>
                        <span>: 31/03/2026 09:32:17</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 2. DYNAMIC BODY BLOCKS */}
            <div className="flex-1 flex flex-col">
              {config.body?.map((block: any) => {
                switch (block.type) {
                  case "RESULTS_TABLE":
                    return (
                      <div key={block.id} className="mb-6">
                        <h2
                          className="text-center font-bold text-lg mb-4 underline uppercase"
                          style={{ color: config.branding?.primaryColor }}>
                          Liver Function Test
                        </h2>
                        <table className="w-full text-[13px]">
                          <thead>
                            <tr
                              className="border-b-2 border-t-2"
                              style={{
                                borderColor: config.branding?.primaryColor,
                              }}>
                              <th className="py-2 text-left w-2/5 font-bold">
                                Test
                              </th>
                              <th className="py-2 text-left w-1/5 font-bold">
                                Result
                              </th>
                              <th className="py-2 text-left w-1/5 font-bold">
                                Unit
                              </th>
                              <th className="py-2 text-left w-1/5 font-bold">
                                Biological Ref. Range
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="border-b border-slate-100">
                              <td className="py-2 font-medium">
                                S. Bilirubin (Total)
                              </td>
                              <td className="py-2 font-bold text-slate-900">
                                0.50
                              </td>
                              <td className="py-2 text-slate-600">mg/dl</td>
                              <td className="py-2 text-slate-600">
                                Adults: 0.2-1.2
                                <br />
                                Infants: 1.2-12
                              </td>
                            </tr>
                            <tr className="border-b border-slate-100">
                              <td className="py-2 font-medium">S. G. O. T</td>
                              <td className="py-2 font-bold text-slate-900">
                                22.3
                              </td>
                              <td className="py-2 text-slate-600">IU/L</td>
                              <td className="py-2 text-slate-600">0-40 IU/L</td>
                            </tr>
                          </tbody>
                        </table>
                        <div className="mt-4 text-[11px] text-slate-700 space-y-1">
                          <p>
                            <span className="font-bold">NOTE:</span> Kindly
                            correlate clinically.
                          </p>
                          <p>
                            <span className="font-bold">IMPRESSION:</span> Test
                            parameters are within normal biological limits.
                          </p>
                          <p className="text-[10px] text-slate-500 mt-2 italic">
                            (Collected At: 30/03/2026 18:47:44, Received At:
                            30/03/2026 18:47:44, Reported At: 31/03/2026
                            10:03:56)
                          </p>
                        </div>
                      </div>
                    );
                  case "TEXT":
                    return (
                      <div
                        key={block.id}
                        className="text-sm whitespace-pre-wrap leading-relaxed mb-4"
                        dangerouslySetInnerHTML={{
                          __html: block.content
                            ? block.content.replace(
                                /\{\{.*?\}\}/g,
                                (m: string) =>
                                  `<span class="bg-blue-100 text-blue-800 px-1 py-0.5 rounded font-mono text-[10px]">${m}</span>`,
                              )
                            : "Empty Text Block",
                        }}
                      />
                    );
                  case "SPACER":
                    return (
                      <div key={block.id} style={{ height: "20px" }}></div>
                    );
                  default:
                    return null;
                }
              })}
              <div className="text-center mt-8 mb-6 break-inside-avoid">
                <span className="text-xs font-bold text-slate-400 border-t border-b border-slate-200 py-1 px-4 tracking-widest uppercase">
                  *** End of Report ***
                </span>
              </div>
            </div>

            {/* 3. FOOTER (Signatures & Modes) */}
            {config.footer?.show && (
              <div
                className="mt-auto pt-4 border-t-2 w-full flex flex-col justify-end"
                style={{ borderColor: config.branding?.primaryColor }}>
                {config.footer?.mode === "image" ? (
                  <div
                    className="w-full bg-slate-100 flex items-center justify-center text-slate-400 overflow-hidden"
                    style={{ height: `${config.footer.height || 100}px` }}>
                    {config.footer.fullImage ? (
                      <img
                        src={config.footer.fullImage}
                        className="w-full h-full object-contain"
                        alt="Footer"
                      />
                    ) : (
                      "Full Footer Image Preview"
                    )}
                  </div>
                ) : config.footer?.mode === "html" ? (
                  <div
                    className="w-full"
                    dangerouslySetInnerHTML={{
                      __html:
                        config.footer.html ||
                        "<div class='text-slate-400 text-center py-4 border border-dashed'>Custom HTML Footer Area</div>",
                    }}
                  />
                ) : (
                  <div className="flex justify-around items-end w-full">
                    {config.footer?.signatures?.map(
                      (sig: any, idx: number) =>
                        sig.show && (
                          <div
                            key={idx}
                            className="flex flex-col items-center min-w-[150px]">
                            <div className="h-16 flex items-end justify-center mb-1">
                              {sig.imageUrl ? (
                                <img
                                  src={sig.imageUrl}
                                  className="h-full object-contain"
                                  alt="Sig"
                                />
                              ) : (
                                <div className="text-[10px] text-slate-300 border border-dashed px-4 py-2">
                                  Signature Area
                                </div>
                              )}
                            </div>
                            <div className="w-full text-center">
                              <p className="font-bold text-[12px] text-slate-800">
                                {sig.name || "Doctor Name"}
                              </p>
                              <p className="text-[10px] text-slate-600 leading-tight">
                                {sig.qualifications || "Qualifications"}
                              </p>
                              <p className="font-bold text-[10px] text-slate-800 uppercase mt-0.5">
                                {sig.title || "Designation"}
                              </p>
                            </div>
                          </div>
                        ),
                    )}
                  </div>
                )}

                <div
                  className="text-[10px] text-center text-slate-500 mt-6 pb-2 border-t border-slate-200 pt-2"
                  dangerouslySetInnerHTML={{
                    __html: config.footer?.text || "",
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
