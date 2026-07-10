"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Save, Loader2, Plus, Trash2, Copy, Download, Upload,
  Type, Image as ImageIcon, Table, Layout, QrCode, Settings,
  FileText, Code, Move, Maximize2, RotateCcw, Sparkles, Eye,
} from "lucide-react";
import { HexColorPicker } from "react-colorful";
import toast from "react-hot-toast";

// ==========================================
// TYPES
// ==========================================
interface CanvasElement {
  id: string;
  type: "text" | "image" | "table" | "shape" | "barcode" | "qrcode" | "divider";
  x: number; y: number; width: number; height: number;
  rotation: number; zIndex: number; locked: boolean; visible: boolean;
  content?: string;
  metaTag?: string;
  style: {
    fontSize?: number; fontFamily?: string; fontWeight?: string;
    color?: string; backgroundColor?: string;
    textAlign?: "left" | "center" | "right";
    borderWidth?: number; borderColor?: string; borderRadius?: number;
    padding?: number; opacity?: number;
  };
  tableColumns?: number; tableRows?: number;
  imageUrl?: string; imageFit?: "cover" | "contain" | "fill";
}

interface TemplateConfig {
  pageSize: "A4" | "Letter";
  orientation: "PORTRAIT" | "LANDSCAPE";
  background: string;
  margins: { top: number; right: number; bottom: number; left: number };
  elements: CanvasElement[];
  branding: { primaryColor: string; accentColor: string; fontFamily: string };
}

const META_TAGS: Record<string, Array<{ tag: string; label: string }>> = {
  "Patient": [
    { tag: "{{patient.name}}", label: "Patient Name" },
    { tag: "{{patient.age}}", label: "Age" },
    { tag: "{{patient.gender}}", label: "Gender" },
    { tag: "{{patient.patientId}}", label: "Patient ID / UHID" },
    { tag: "{{patient.phone}}", label: "Phone" },
    { tag: "{{patient.address}}", label: "Address" },
  ],
  "Lab": [
    { tag: "{{lab.name}}", label: "Lab Name" },
    { tag: "{{lab.address}}", label: "Lab Address" },
    { tag: "{{lab.phone}}", label: "Lab Phone" },
    { tag: "{{lab.email}}", label: "Lab Email" },
    { tag: "{{lab.licenseNumber}}", label: "License Number" },
  ],
  "Test / Report": [
    { tag: "{{test.testName}}", label: "Test Name" },
    { tag: "{{test.testNumber}}", label: "Test Number" },
    { tag: "{{test.doctor.name}}", label: "Referring Doctor" },
    { tag: "{{report.reportNumber}}", label: "Report Number" },
    { tag: "{{report.approvedAt}}", label: "Approved Date" },
  ],
  "System": [
    { tag: "{{system.date}}", label: "Current Date" },
    { tag: "{{system.dateTime}}", label: "Current Date & Time" },
  ],
  "Results": [
    { tag: "{{results.table}}", label: "Full Results Table" },
    { tag: "{{results.count}}", label: "Parameter Count" },
  ],
};

let elCounter = 0;
const newEl = (type: CanvasElement["type"], overrides: Partial<CanvasElement> = {}): CanvasElement => {
  elCounter++;
  return {
    id: `el-${Date.now()}-${elCounter}`,
    type, x: 10, y: 10, width: type === "text" ? 40 : 30, height: type === "text" ? 8 : 15,
    rotation: 0, zIndex: elCounter, locked: false, visible: true,
    content: type === "text" ? "Click to edit text" : "",
    style: {
      fontSize: 12, fontFamily: "Inter", fontWeight: "normal",
      color: "#0f172a", backgroundColor: type === "shape" ? "#e2e8f0" : "transparent",
      textAlign: "left", borderWidth: 0, borderColor: "#cbd5e1",
      borderRadius: 4, padding: 4, opacity: 100,
    },
    tableColumns: 4, tableRows: 3, imageFit: "contain",
    ...overrides,
  };
};

const DEFAULT_CONFIG: TemplateConfig = {
  pageSize: "A4", orientation: "PORTRAIT", background: "#ffffff",
  margins: { top: 15, right: 15, bottom: 15, left: 15 },
  branding: { primaryColor: "#2196F3", accentColor: "#475569", fontFamily: "Inter" },
  elements: [
    newEl("text", { x: 5, y: 3, width: 60, height: 10, content: "{{lab.name}}", style: { fontSize: 24, fontWeight: "bold", color: "#2196F3", textAlign: "left" } }),
    newEl("text", { x: 5, y: 12, width: 60, height: 6, content: "{{lab.address}} • {{lab.phone}}", style: { fontSize: 10, color: "#64748b", textAlign: "left" } }),
    newEl("qrcode", { x: 80, y: 3, width: 15, height: 15, content: "{{report.reportNumber}}" }),
    newEl("divider", { x: 5, y: 20, width: 90, height: 1, style: { backgroundColor: "#2196F3", borderWidth: 0 } }),
    newEl("text", { x: 5, y: 23, width: 50, height: 5, content: "Patient: {{patient.name}}", style: { fontSize: 12, fontWeight: "bold" } }),
    newEl("text", { x: 50, y: 23, width: 45, height: 5, content: "ID: {{patient.patientId}} | {{patient.age}} / {{patient.gender}}", style: { fontSize: 11, textAlign: "right" } }),
    newEl("table", { x: 5, y: 35, width: 90, height: 40, content: "{{results.table}}", tableColumns: 4, tableRows: 5 }),
    newEl("text", { x: 5, y: 85, width: 40, height: 5, content: "Technician Signature", style: { fontSize: 9, textAlign: "center", color: "#64748b" } }),
    newEl("text", { x: 55, y: 85, width: 40, height: 5, content: "Pathologist Signature", style: { fontSize: 9, textAlign: "center", color: "#64748b" } }),
  ],
};

// ==========================================
// MAIN COMPONENT
// ==========================================
export default function CanvasTemplateBuilder({ templateId }: { templateId?: string }) {
  const router = useRouter();
  const [name, setName] = useState("New Report Template");
  const [config, setConfig] = useState<TemplateConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(!!templateId);
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"visual" | "json" | "html">("visual");
  const [jsonText, setJsonText] = useState("");
  const [htmlText, setHtmlText] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (!templateId) { setLoading(false); return; }
    (async () => {
      try {
        const res = await fetch(`/api/workspace/templates/${templateId}`);
        if (!res.ok) throw new Error("Failed to load");
        const data = await res.json();
        setName(data.name || "Untitled");
        if (data.config) {
          const parsed = typeof data.config === "string" ? JSON.parse(data.config) : data.config;
          setConfig({ ...DEFAULT_CONFIG, ...parsed });
          setJsonText(JSON.stringify(parsed, null, 2));
        }
      } catch (e: any) { toast.error("Failed to load: " + e.message); }
      finally { setLoading(false); }
    })();
  }, [templateId]);

  useEffect(() => { setJsonText(JSON.stringify(config, null, 2)); }, [config]);

  const selectedElement = config.elements.find(e => e.id === selectedId);

  const handleSave = async () => {
    setSaving(true);
    try {
      const url = templateId ? `/api/workspace/templates/${templateId}` : `/api/workspace/templates`;
      const method = templateId ? "PUT" : "POST";
      const res = await fetch(url, {
        method, headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, config, isActive: false }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Save failed");
      toast.success(templateId ? "Template updated" : "Template created");
      if (!templateId) {
        const data = await res.json();
        router.push(`/workspace/settings/templates/${data.template.id}`);
      }
    } catch (e: any) { toast.error("Save failed: " + e.message); }
    finally { setSaving(false); }
  };

  const addElement = (type: CanvasElement["type"]) => {
    const el = newEl(type);
    setConfig({ ...config, elements: [...config.elements, el] });
    setSelectedId(el.id);
  };
  const deleteElement = (id: string) => {
    setConfig({ ...config, elements: config.elements.filter(e => e.id !== id) });
    if (selectedId === id) setSelectedId(null);
  };
  const duplicateElement = (id: string) => {
    const original = config.elements.find(e => e.id === id);
    if (!original) return;
    const copy = { ...original, id: `el-${Date.now()}-${++elCounter}`, x: original.x + 2, y: original.y + 2 };
    setConfig({ ...config, elements: [...config.elements, copy] });
    setSelectedId(copy.id);
  };
  const updateElement = (id: string, updates: Partial<CanvasElement>) => {
    setConfig({ ...config, elements: config.elements.map(e => e.id === id ? { ...e, ...updates } : e) });
  };
  const updateStyle = (id: string, key: string, value: any) => {
    setConfig({ ...config, elements: config.elements.map(e => e.id === id ? { ...e, style: { ...e.style, [key]: value } } : e) });
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify({ name, config }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${name.replace(/\s+/g, "_")}.json`; a.click();
    URL.revokeObjectURL(url);
    toast.success("Template exported");
  };
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        if (parsed.config) { setConfig({ ...DEFAULT_CONFIG, ...parsed.config }); if (parsed.name) setName(parsed.name); toast.success("Imported"); }
        else { setConfig({ ...DEFAULT_CONFIG, ...parsed }); toast.success("Imported"); }
      } catch (err: any) { toast.error("Invalid JSON: " + err.message); }
    };
    reader.readAsText(file);
  };
  const applyJson = () => {
    try { const parsed = JSON.parse(jsonText); setConfig({ ...DEFAULT_CONFIG, ...parsed }); toast.success("Applied to canvas"); }
    catch (e: any) { toast.error("Invalid JSON: " + e.message); }
  };
  const insertMetaTag = (tag: string) => {
    if (!selectedElement) { toast.error("Select an element first"); return; }
    const current = selectedElement.content || "";
    updateElement(selectedElement.id, { content: current + tag });
    toast.success(`Inserted ${tag}`);
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col">
      {/* Top bar */}
      <div className="sticky top-0 z-30 bg-card border-b px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/workspace/settings/templates")}><ArrowLeft className="h-4 w-4" /></Button>
          <Input value={name} onChange={(e) => setName(e.target.value)} className="font-semibold text-lg border-0 focus-visible:ring-1 max-w-xs bg-transparent" />
          <Badge variant="outline" className="hidden sm:flex">{config.orientation === "PORTRAIT" ? "A4 Portrait" : "A4 Landscape"}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <label className="cursor-pointer">
            <Button variant="outline" size="sm" asChild><span><Upload className="h-4 w-4 mr-1.5" /> Import</span></Button>
            <input type="file" accept=".json" onChange={handleImport} className="hidden" />
          </label>
          <Button variant="outline" size="sm" onClick={handleExport}><Download className="h-4 w-4 mr-1.5" /> Export</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />} Save
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 flex flex-col">
        <div className="border-b bg-card px-4">
          <TabsList className="bg-transparent h-12">
            <TabsTrigger value="visual" className="data-[state=active]:bg-primary/10"><Layout className="h-4 w-4 mr-1.5" /> Visual Builder</TabsTrigger>
            <TabsTrigger value="json" className="data-[state=active]:bg-primary/10"><Code className="h-4 w-4 mr-1.5" /> JSON Editor</TabsTrigger>
            <TabsTrigger value="html" className="data-[state=active]:bg-primary/10"><FileText className="h-4 w-4 mr-1.5" /> HTML / Meta Tags</TabsTrigger>
          </TabsList>
        </div>

        {/* VISUAL BUILDER */}
        <TabsContent value="visual" className="flex-1 m-0 flex overflow-hidden">
          {/* LEFT: Element palette + meta tags */}
          <div className="w-64 shrink-0 border-r bg-card overflow-y-auto p-3 space-y-4">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Add Element</h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { type: "text", icon: Type, label: "Text" },
                  { type: "image", icon: ImageIcon, label: "Image" },
                  { type: "table", icon: Table, label: "Table" },
                  { type: "shape", icon: Maximize2, label: "Shape" },
                  { type: "qrcode", icon: QrCode, label: "QR Code" },
                  { type: "divider", icon: Move, label: "Divider" },
                ].map(item => (
                  <button key={item.type} onClick={() => addElement(item.type as any)}
                    className="flex flex-col items-center gap-1 p-3 border rounded-lg hover:bg-accent hover:border-primary/30 transition-colors">
                    <item.icon className="h-5 w-5 text-primary" />
                    <span className="text-xs font-medium">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> Data Bindings
              </h3>
              <p className="text-xs text-muted-foreground mb-2">Click to insert into selected element:</p>
              {Object.entries(META_TAGS).map(([cat, tags]) => (
                <div key={cat} className="mb-3">
                  <div className="text-xs font-semibold text-foreground mb-1">{cat}</div>
                  <div className="space-y-1">
                    {tags.map(t => (
                      <button key={t.tag} onClick={() => insertMetaTag(t.tag)}
                        className="w-full text-left text-xs px-2 py-1 rounded hover:bg-accent font-mono text-primary transition-colors"
                        title={`Insert ${t.label}`}>{t.tag}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CENTER: Canvas */}
          <div className="flex-1 overflow-auto bg-muted/30 p-6 flex items-start justify-center">
            <Canvas config={config} selectedId={selectedId} onSelect={setSelectedId} onUpdate={updateElement} isDragging={isDragging} setIsDragging={setIsDragging} />
          </div>

          {/* RIGHT: Properties */}
          <div className="w-72 shrink-0 border-l bg-card overflow-y-auto p-3 space-y-4">
            <PropertiesPanel element={selectedElement} config={config} onUpdateElement={updateElement} onUpdateStyle={updateStyle}
              onDuplicate={() => selectedElement && duplicateElement(selectedElement.id)}
              onDelete={() => selectedElement && deleteElement(selectedElement.id)}
              onConfigUpdate={setConfig} />
          </div>
        </TabsContent>

        {/* JSON EDITOR */}
        <TabsContent value="json" className="flex-1 m-0 p-4 overflow-auto">
          <Card className="max-w-4xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Template JSON</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => { setJsonText(JSON.stringify(DEFAULT_CONFIG, null, 2)); toast.success("Reset"); }}>
                    <RotateCcw className="h-3 w-3 mr-1" /> Reset
                  </Button>
                  <Button size="sm" onClick={applyJson}><Sparkles className="h-3 w-3 mr-1" /> Apply to Canvas</Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea value={jsonText} onChange={(e) => setJsonText(e.target.value)}
                className="font-mono text-xs min-h-[500px] resize-none" spellCheck={false} />
              <p className="text-xs text-muted-foreground mt-2">Edit the JSON directly, then click "Apply to Canvas" to see changes.</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* HTML / META TAGS */}
        <TabsContent value="html" className="flex-1 m-0 p-4 overflow-auto">
          <Card className="max-w-4xl mx-auto">
            <CardHeader><CardTitle>HTML Template with Meta Tags</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Write raw HTML with meta tags. The system will replace <code className="bg-muted px-1 py-0.5 rounded text-xs">{`{{patient.name}}`}</code> style placeholders with real data at print time.
              </p>
              <Textarea value={htmlText} onChange={(e) => setHtmlText(e.target.value)}
                placeholder={`<div class="header">\n  <h1>{{lab.name}}</h1>\n  <p>{{lab.address}}</p>\n</div>\n<div class="patient">\n  <strong>Patient:</strong> {{patient.name}} ({{patient.age}} / {{patient.gender}})\n</div>\n<table>{{results.table}}</table>`}
                className="font-mono text-xs min-h-[300px] resize-none" spellCheck={false} />
              <div className="border-t pt-4">
                <h4 className="font-semibold text-sm mb-2">Available Meta Tags</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {Object.entries(META_TAGS).map(([cat, tags]) => (
                    <div key={cat}>
                      <div className="text-xs font-bold uppercase text-muted-foreground mb-1">{cat}</div>
                      {tags.map(t => <div key={t.tag} className="text-xs font-mono text-primary py-0.5">{t.tag}</div>)}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ==========================================
// CANVAS — drag/resize/reposition
// ==========================================
function Canvas({ config, selectedId, onSelect, onUpdate, isDragging, setIsDragging }: any) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ id: string; startX: number; startY: number; origX: number; origY: number; mode: "move" | "resize" } | null>(null);

  const handleMouseDown = (e: React.MouseEvent, el: CanvasElement, mode: "move" | "resize") => {
    if (el.locked) return;
    e.stopPropagation(); onSelect(el.id);
    dragRef.current = { id: el.id, startX: e.clientX, startY: e.clientY, origX: el.x, origY: el.y, mode };
    setIsDragging(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragRef.current || !canvasRef.current) return;
      const canvas = canvasRef.current.getBoundingClientRect();
      const dx = ((e.clientX - dragRef.current.startX) / canvas.width) * 100;
      const dy = ((e.clientY - dragRef.current.startY) / canvas.height) * 100;
      if (dragRef.current.mode === "move") {
        const newX = Math.max(0, Math.min(100 - 5, dragRef.current.origX + dx));
        const newY = Math.max(0, Math.min(100 - 2, dragRef.current.origY + dy));
        onUpdate(dragRef.current.id, { x: newX, y: newY });
      } else {
        const el = config.elements.find((e: CanvasElement) => e.id === dragRef.current!.id);
        if (!el) return;
        const newW = Math.max(5, Math.min(100 - el.x, el.width + dx));
        const newH = Math.max(2, Math.min(100 - el.y, el.height + dy));
        onUpdate(dragRef.current.id, { width: newW, height: newH });
      }
    };
    const handleMouseUp = () => { dragRef.current = null; setIsDragging(false); };
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => { window.removeEventListener("mousemove", handleMouseMove); window.removeEventListener("mouseup", handleMouseUp); };
    }
  }, [isDragging, config.elements, onUpdate, setIsDragging]);

  const aspectRatio = config.orientation === "PORTRAIT" ? 1 / 1.414 : 1.414;

  return (
    <div ref={canvasRef} onClick={() => onSelect(null)}
      className="relative bg-white shadow-xl border border-slate-300"
      style={{ width: "100%", maxWidth: config.orientation === "PORTRAIT" ? "595px" : "842px", aspectRatio: String(aspectRatio), backgroundColor: config.background }}>
      <div className="absolute border-2 border-dashed border-primary/20 pointer-events-none"
        style={{ top: `${config.margins.top}%`, right: `${config.margins.right}%`, bottom: `${config.margins.bottom}%`, left: `${config.margins.left}%` }} />
      {config.elements.filter((e: CanvasElement) => e.visible).map((el: CanvasElement) => (
        <ElementRenderer key={el.id} element={el} isSelected={selectedId === el.id}
          onMouseDown={(e: React.MouseEvent) => handleMouseDown(e, el, "move")}
          onResizeStart={(e: React.MouseEvent) => handleMouseDown(e, el, "resize")} />
      ))}
      {config.elements.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">Add elements from the left panel to start building</div>
      )}
    </div>
  );
}

// ==========================================
// ELEMENT RENDERER
// ==========================================
function ElementRenderer({ element, isSelected, onMouseDown, onResizeStart }: any) {
  const el: CanvasElement = element;
  const isMetaTag = el.content && /\{\{.*\}\}/.test(el.content);
  return (
    <div onMouseDown={onMouseDown}
      className={`absolute cursor-move group ${isSelected ? "ring-2 ring-primary ring-offset-1" : "hover:ring-1 hover:ring-primary/40"} ${el.locked ? "cursor-not-allowed" : ""}`}
      style={{ left: `${el.x}%`, top: `${el.y}%`, width: `${el.width}%`, height: `${el.height}%`, zIndex: el.zIndex,
        transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
        opacity: el.style.opacity ? el.style.opacity / 100 : 1,
        backgroundColor: el.style.backgroundColor || "transparent",
        border: el.style.borderWidth ? `${el.style.borderWidth}px solid ${el.style.borderColor}` : "none",
        borderRadius: el.style.borderRadius, padding: el.style.padding, overflow: "hidden" }}>
      {el.type === "text" && (
        <div className="w-full h-full flex items-center overflow-hidden"
          style={{ fontSize: el.style.fontSize, fontFamily: el.style.fontFamily, fontWeight: el.style.fontWeight, color: el.style.color, textAlign: el.style.textAlign,
            justifyContent: el.style.textAlign === "center" ? "center" : el.style.textAlign === "right" ? "flex-end" : "flex-start" }}>
          {isMetaTag ? <span className="text-primary font-mono text-[0.7em] px-1 bg-primary/5 rounded">{el.content}</span> : <span className="truncate">{el.content}</span>}
        </div>
      )}
      {el.type === "divider" && <div className="w-full h-full" style={{ backgroundColor: el.style.backgroundColor || "#2196F3" }} />}
      {el.type === "shape" && <div className="w-full h-full" style={{ backgroundColor: el.style.backgroundColor, borderRadius: el.style.borderRadius }} />}
      {el.type === "image" && (
        <div className="w-full h-full flex items-center justify-center bg-muted text-xs text-muted-foreground">
          {el.imageUrl ? <img src={el.imageUrl} alt="" className="w-full h-full" style={{ objectFit: el.imageFit }} /> : <ImageIcon className="h-6 w-6" />}
        </div>
      )}
      {el.type === "table" && (
        <div className="w-full h-full overflow-hidden">
          <table className="w-full h-full border-collapse text-[8px]">
            <thead><tr className="bg-primary/10">
              {Array.from({ length: el.tableColumns }).map((_, i) => <th key={i} className="border border-border p-1 text-left">Col {i + 1}</th>)}
            </tr></thead>
            <tbody>
              {Array.from({ length: el.tableRows }).map((_, r) => (
                <tr key={r}>{Array.from({ length: el.tableColumns }).map((_, c) => <td key={c} className="border border-border p-1">—</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {el.type === "qrcode" && (
        <div className="w-full h-full flex items-center justify-center bg-white border border-border"><QrCode className="h-3/4 w-3/4 text-foreground" /></div>
      )}
      {isSelected && !el.locked && (
        <div onMouseDown={onResizeStart} className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize bg-primary border-2 border-white rounded-bl-md"
          style={{ transform: "translate(50%, 50%)" }} />
      )}
    </div>
  );
}

// ==========================================
// PROPERTIES PANEL
// ==========================================
function PropertiesPanel({ element, config, onUpdateElement, onUpdateStyle, onDuplicate, onDelete, onConfigUpdate }: any) {
  if (!element) {
    return (
      <div className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Page Settings</h3>
        <div>
          <Label className="text-xs">Page Size</Label>
          <select className="w-full mt-1 p-2 border rounded text-sm bg-background" value={config.pageSize}
            onChange={(e) => onConfigUpdate({ ...config, pageSize: e.target.value })}>
            <option value="A4">A4</option><option value="Letter">Letter</option>
          </select>
        </div>
        <div>
          <Label className="text-xs">Orientation</Label>
          <select className="w-full mt-1 p-2 border rounded text-sm bg-background" value={config.orientation}
            onChange={(e) => onConfigUpdate({ ...config, orientation: e.target.value })}>
            <option value="PORTRAIT">Portrait</option><option value="LANDSCAPE">Landscape</option>
          </select>
        </div>
        <div>
          <Label className="text-xs">Background Color</Label>
          <div className="flex gap-2 mt-1">
            <input type="color" value={config.background} onChange={(e) => onConfigUpdate({ ...config, background: e.target.value })} className="h-8 w-12 rounded border" />
            <Input value={config.background} onChange={(e) => onConfigUpdate({ ...config, background: e.target.value })} className="text-xs font-mono" />
          </div>
        </div>
        <div className="border-t pt-3"><p className="text-xs text-muted-foreground">Select an element on the canvas to edit its properties.</p></div>
      </div>
    );
  }
  const el: CanvasElement = element;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{el.type} Properties</h3>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onDuplicate}><Copy className="h-3 w-3" /></Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={onDelete}><Trash2 className="h-3 w-3" /></Button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div><Label className="text-xs">X: {el.x.toFixed(1)}%</Label><Slider value={[el.x]} onValueChange={(v) => onUpdateElement(el.id, { x: v[0] })} min={0} max={95} step={0.5} className="mt-1" /></div>
        <div><Label className="text-xs">Y: {el.y.toFixed(1)}%</Label><Slider value={[el.y]} onValueChange={(v) => onUpdateElement(el.id, { y: v[0] })} min={0} max={98} step={0.5} className="mt-1" /></div>
        <div><Label className="text-xs">W: {el.width.toFixed(1)}%</Label><Slider value={[el.width]} onValueChange={(v) => onUpdateElement(el.id, { width: v[0] })} min={5} max={100} step={0.5} className="mt-1" /></div>
        <div><Label className="text-xs">H: {el.height.toFixed(1)}%</Label><Slider value={[el.height]} onValueChange={(v) => onUpdateElement(el.id, { height: v[0] })} min={2} max={100} step={0.5} className="mt-1" /></div>
      </div>
      {(el.type === "text" || el.type === "qrcode") && (
        <div>
          <Label className="text-xs">Content (use {"{{meta.tags}}"} for dynamic data)</Label>
          <Textarea value={el.content || ""} onChange={(e) => onUpdateElement(el.id, { content: e.target.value })} rows={2} className="text-xs font-mono" placeholder="Enter text or {{patient.name}}" />
        </div>
      )}
      {el.type === "text" && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <div><Label className="text-xs">Font Size: {el.style.fontSize}pt</Label><Slider value={[el.style.fontSize || 12]} onValueChange={(v) => onUpdateStyle(el.id, "fontSize", v[0])} min={6} max={48} step={1} className="mt-1" /></div>
            <div><Label className="text-xs">Font Family</Label>
              <select className="w-full mt-1 p-1.5 border rounded text-xs bg-background" value={el.style.fontFamily} onChange={(e) => onUpdateStyle(el.id, "fontFamily", e.target.value)}>
                <option value="Inter">Inter</option><option value="Helvetica">Helvetica</option><option value="Arial">Arial</option><option value="Times">Times</option><option value="Roboto">Roboto</option><option value="Georgia">Georgia</option>
              </select>
            </div>
          </div>
          <div>
            <Label className="text-xs">Font Weight</Label>
            <select className="w-full mt-1 p-1.5 border rounded text-xs bg-background" value={el.style.fontWeight} onChange={(e) => onUpdateStyle(el.id, "fontWeight", e.target.value)}>
              <option value="normal">Normal</option><option value="bold">Bold</option><option value="300">Light</option><option value="500">Medium</option><option value="600">Semibold</option><option value="700">Bold</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label className="text-xs">Text Color</Label><div className="flex gap-1 mt-1"><input type="color" value={el.style.color} onChange={(e) => onUpdateStyle(el.id, "color", e.target.value)} className="h-7 w-9 rounded border" /><Input value={el.style.color} onChange={(e) => onUpdateStyle(el.id, "color", e.target.value)} className="text-xs font-mono" /></div></div>
            <div><Label className="text-xs">Text Align</Label>
              <select className="w-full mt-1 p-1.5 border rounded text-xs bg-background" value={el.style.textAlign} onChange={(e) => onUpdateStyle(el.id, "textAlign", e.target.value)}>
                <option value="left">Left</option><option value="center">Center</option><option value="right">Right</option>
              </select>
            </div>
          </div>
        </>
      )}
      {el.type === "table" && (
        <div className="grid grid-cols-2 gap-2">
          <div><Label className="text-xs">Columns: {el.tableColumns}</Label><Slider value={[el.tableColumns || 4]} onValueChange={(v) => onUpdateElement(el.id, { tableColumns: v[0] })} min={1} max={8} step={1} className="mt-1" /></div>
          <div><Label className="text-xs">Rows: {el.tableRows}</Label><Slider value={[el.tableRows || 3]} onValueChange={(v) => onUpdateElement(el.id, { tableRows: v[0] })} min={1} max={20} step={1} className="mt-1" /></div>
        </div>
      )}
      {(el.type === "shape" || el.type === "divider") && (
        <div><Label className="text-xs">Background Color</Label><div className="flex gap-2 mt-1"><input type="color" value={el.style.backgroundColor} onChange={(e) => onUpdateStyle(el.id, "backgroundColor", e.target.value)} className="h-8 w-12 rounded border" /><Input value={el.style.backgroundColor} onChange={(e) => onUpdateStyle(el.id, "backgroundColor", e.target.value)} className="text-xs font-mono" /></div></div>
      )}
      <div className="border-t pt-3">
        <Label className="text-xs font-semibold">Border</Label>
        <div className="grid grid-cols-2 gap-2 mt-1">
          <div><Label className="text-xs">Width: {el.style.borderWidth}px</Label><Slider value={[el.style.borderWidth || 0]} onValueChange={(v) => onUpdateStyle(el.id, "borderWidth", v[0])} min={0} max={5} step={1} className="mt-1" /></div>
          <div><Label className="text-xs">Radius: {el.style.borderRadius}px</Label><Slider value={[el.style.borderRadius || 0]} onValueChange={(v) => onUpdateStyle(el.id, "borderRadius", v[0])} min={0} max={20} step={1} className="mt-1" /></div>
        </div>
        {el.style.borderWidth ? <div className="mt-2"><Label className="text-xs">Border Color</Label><div className="flex gap-2 mt-1"><input type="color" value={el.style.borderColor} onChange={(e) => onUpdateStyle(el.id, "borderColor", e.target.value)} className="h-7 w-9 rounded border" /><Input value={el.style.borderColor} onChange={(e) => onUpdateStyle(el.id, "borderColor", e.target.value)} className="text-xs font-mono" /></div></div> : null}
      </div>
      <div><Label className="text-xs">Opacity: {el.style.opacity}%</Label><Slider value={[el.style.opacity || 100]} onValueChange={(v) => onUpdateStyle(el.id, "opacity", v[0])} min={0} max={100} step={5} className="mt-1" /></div>
      <div className="flex items-center justify-between border-t pt-3">
        <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={el.visible} onChange={(e) => onUpdateElement(el.id, { visible: e.target.checked })} /> Visible</label>
        <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={el.locked} onChange={(e) => onUpdateElement(el.id, { locked: e.target.checked })} /> Locked</label>
      </div>
    </div>
  );
}
