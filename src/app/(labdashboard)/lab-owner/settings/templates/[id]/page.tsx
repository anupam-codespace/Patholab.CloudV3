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
  UserSquare,
  QrCode,
  SplitSquareHorizontal,
  Barcode,
} from "lucide-react";
import toast from "react-hot-toast";

// ✅ Import Server Actions (Assume these exist)
import { getTemplateById, saveTemplate } from "@/actions/report-settings";

// --- DATA DICTIONARY ---
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
    subTitle: "123 Health Avenue, Medical District",
    html: "",
    height: 150,
  },
  body: [
    { id: "block-1", type: "PATIENT_INFO" },
    { id: "block-2", type: "RESULTS_TABLE" },
  ],
  footer: {
    show: true,
    mode: "standard",
    text: "**Sample has been collected outside the laboratory. The results pertain to the sample received.",
    isoMarkUrls: [],
    signatures: [],
    height: 100,
  },
  branding: { primaryColor: "#2563eb" },
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

  // --- DRAG & DROP STATE ---
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);

  // --- 1. LOAD DATA ---
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
          if (!loadedConfig.footer) loadedConfig.footer = {};
          if (!loadedConfig.footer.isoMarkUrls)
            loadedConfig.footer.isoMarkUrls = [];
          if (!Array.isArray(loadedConfig.footer.signatures)) {
            loadedConfig.footer.signatures = [
              {
                title: "Consultant Pathologist",
                name: "Dr. A. Jalil",
                qualifications: "MBBS, DCP",
                imageUrl: "",
                show: true,
              },
              {
                title: "Consultant Microbiologist",
                name: "Dr. V.M. Somasunder",
                qualifications: "MBBS, MD, FRHS",
                imageUrl: "",
                show: true,
              },
            ];
          }
          setConfig(loadedConfig);
        } else {
          toast.error("Template not found");
          router.push("/lab-owner/settings/templates");
        }
      } else {
        setConfig(DEFAULT_CONFIG);
      }
      setDataLoading(false);
    };
    init();
  }, [templateId, router]);

  // --- 2. SAVE HANDLER ---
  const handleSave = async () => {
    if (!templateName.trim())
      return toast.error("Please enter a template name");
    setLoading(true);
    try {
      await saveTemplate(templateId, templateName, config);
      toast.success("Template Saved Successfully!");
      if (!templateId) router.push("/lab-owner/settings/templates");
    } catch (e) {
      toast.error("Save failed");
    } finally {
      setLoading(false);
    }
  };

  // --- 3. DYNAMIC BODY HANDLERS ---
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

  // --- 4. DRAG & DROP LOGIC ---
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

  // --- HELPER HANDLERS ---
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

  if (dataLoading)
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" />
      </div>
    );

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-50">
      {/* --- TOP BAR --- */}
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
        {/* --- LEFT PANEL: CONTROLS --- */}
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

            {/* --- HEADER TAB --- */}
            <TabsContent value="header" className="space-y-4">
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <Label>Show Header</Label>
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
                        {mode}
                      </button>
                    ))}
                  </div>
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
                  {config.header?.mode === "image" && (
                    <div className="space-y-2">
                      <Label>Header Image Height (px)</Label>
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
            </TabsContent>

            {/* --- BODY TAB --- */}
            <TabsContent value="body" className="space-y-6">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addBlock("PATIENT_INFO")}>
                  <UserSquare className="h-4 w-4 mr-2" /> Patient Grid
                </Button>
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
              <div className="space-y-3">
                <Label className="text-xs font-bold uppercase text-slate-500">
                  Document Layout
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

            {/* --- FOOTER TAB --- */}
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
                  {/* Signatories Setup */}
                  <div className="space-y-4 pt-4 border-t">
                    <Label>Signatories</Label>
                    {config.footer?.signatures?.map((sig: any, idx: number) => (
                      <div
                        key={idx}
                        className="border p-3 rounded-lg bg-slate-50 space-y-3 relative">
                        <Input
                          value={sig.name}
                          onChange={(e) =>
                            updateSignatory(idx, "name", e.target.value)
                          }
                          className="h-8 text-xs bg-white"
                          placeholder="Doctor Name (e.g. Dr. A. Jalil)"
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
                          placeholder="Title (e.g. Consultant Pathologist)"
                        />
                        <label className="cursor-pointer text-xs bg-white border px-2 py-1 rounded shadow-sm hover:bg-slate-100 inline-block w-full text-center">
                          Upload Signature Image
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onloadend = () =>
                                  updateSignatory(
                                    idx,
                                    "imageUrl",
                                    reader.result,
                                  );
                                reader.readAsDataURL(file);
                              }
                            }}
                            className="hidden"
                          />
                        </label>
                      </div>
                    ))}
                  </div>
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

            {/* --- BRANDING TAB --- */}
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

        {/* ========================================================= */}
        {/* --- RIGHT PANEL: HIGH FIDELITY LIVE PREVIEW (REPLICA) --- */}
        {/* ========================================================= */}
        <div className="w-2/3 bg-slate-300 flex justify-center p-8 overflow-y-auto custom-scrollbar">
          <div
            className="bg-white shadow-2xl relative flex flex-col transition-all duration-300"
            style={{
              width: "210mm",
              minHeight: "297mm",
              padding: config.header?.show ? "10mm" : "0 10mm 10mm 10mm",
            }}>
            {/* 1. HEADER (Toggleable) */}
            {config.header?.show && (
              <div
                className="w-full mb-4 border-b-2 pb-4"
                style={{ borderColor: config.branding?.primaryColor }}>
                {config.header?.mode === "image" ? (
                  <div
                    className="w-full bg-slate-100 flex items-center justify-center text-slate-400"
                    style={{ height: `${config.header.height || 150}px` }}>
                    {config.header.fullImage ? (
                      <img
                        src={config.header.fullImage}
                        className="w-full h-full object-cover"
                        alt="Header"
                      />
                    ) : (
                      "Full Header Image"
                    )}
                  </div>
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

            {/* 2. DYNAMIC BODY BLOCKS */}
            <div className="flex-1 flex flex-col">
              {config.body?.map((block: any) => {
                switch (block.type) {
                  case "PATIENT_INFO":
                    return (
                      <div key={block.id} className="mb-6">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex flex-col items-center">
                            <Barcode className="h-10 w-40 text-slate-800 stroke-1" />
                            <span className="text-xs font-mono mt-1">
                              Z82328 300326
                            </span>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-[13px] border-b pb-4 border-slate-300">
                          <div className="space-y-1.5">
                            <div className="grid grid-cols-[100px_auto]">
                              <span className="font-bold text-slate-600">
                                Name
                              </span>
                              <span className="font-bold">
                                : MR. ETTIYAPPAN .D
                              </span>
                            </div>
                            <div className="grid grid-cols-[100px_auto]">
                              <span className="font-bold text-slate-600">
                                Patient ID
                              </span>
                              <span>: Z82328 300326</span>
                            </div>
                            <div className="grid grid-cols-[100px_auto]">
                              <span className="font-bold text-slate-600">
                                Sent By
                              </span>
                              <span>: FARIDA PRIME TANNERY PVT LTD</span>
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <div className="grid grid-cols-[140px_auto]">
                              <span className="font-bold text-slate-600">
                                Age/Sex
                              </span>
                              <span className="font-bold">: 57 Yrs. / M</span>
                            </div>
                            <div className="grid grid-cols-[140px_auto]">
                              <span className="font-bold text-slate-600">
                                Employee ID
                              </span>
                              <span>: w000384</span>
                            </div>
                            <div className="grid grid-cols-[140px_auto]">
                              <span className="font-bold text-slate-600">
                                Sample Collection
                              </span>
                              <span>: 30/03/2026 18:47:44</span>
                            </div>
                            <div className="grid grid-cols-[140px_auto]">
                              <span className="font-bold text-slate-600">
                                Report Released
                              </span>
                              <span>: 31/03/2026 09:32:17</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
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
                              <th className="py-2 text-left w-2/5">Test</th>
                              <th className="py-2 text-left w-1/5">Result</th>
                              <th className="py-2 text-left w-1/5">Unit</th>
                              <th className="py-2 text-left w-1/5">
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
                              <td className="py-2 font-bold text-red-600">
                                52.3 *
                              </td>
                              <td className="py-2 text-slate-600">IU/L</td>
                              <td className="py-2 text-slate-600">0-40 IU/L</td>
                            </tr>
                            <tr className="border-b border-slate-100">
                              <td className="py-2 font-medium">
                                S. Alkaline Phosphatase
                              </td>
                              <td className="py-2 font-bold text-slate-900">
                                66.0
                              </td>
                              <td className="py-2 text-slate-600">IU/L</td>
                              <td className="py-2 text-slate-600">
                                25-140 IU/L
                              </td>
                            </tr>
                          </tbody>
                        </table>
                        <div className="mt-4 text-xs text-slate-600 italic">
                          Kindly correlate clinically.
                          <br />
                          (Collected At: 30/03/2026 18:47:44, Reported At:
                          31/03/2026 10:03:56)
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
            </div>

            {/* 3. FOOTER (Signatures & QR) */}
            {config.footer?.show && (
              <div
                className="mt-auto pt-4 border-t-2 flex justify-between items-end"
                style={{ borderColor: config.branding?.primaryColor }}>
                <div className="flex flex-col items-center">
                  <div className="border p-1 rounded-md bg-white shadow-sm">
                    <QrCode className="h-16 w-16 text-slate-800" />
                  </div>
                  <span className="text-[9px] text-slate-500 mt-1 font-bold tracking-wider">
                    SCAN TO VERIFY
                  </span>
                </div>
                <div className="flex gap-8">
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
                            <p className="font-bold text-xs text-slate-800">
                              {sig.name || "Doctor Name"}
                            </p>
                            <p className="text-[10px] text-slate-600">
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
              </div>
            )}
            <div
              className="text-[10px] text-center text-slate-500 mt-4 pb-2 border-t pt-2"
              dangerouslySetInnerHTML={{ __html: config.footer?.text || "" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
