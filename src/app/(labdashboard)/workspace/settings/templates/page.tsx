"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  CheckCircle,
  Edit,
  Trash2,
  Loader2,
  FileText,
  Eye,
  Save,
  X,
  Settings,
  Copy,
  Globe,
  Layers,
  File,
  FileHeader,
  FileFooter,
} from "lucide-react";
import {
  getAllTemplates,
  setActiveTemplate,
  deleteTemplate,
  updateTemplateName,
  copyTemplateToLocal,
} from "@/actions/report-settings";
import { getContrastTextColor } from "@/lib/color";
import toast from "react-hot-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// ─── Template Card ─────────────────────────────────────

const TemplateCard = ({
  template,
  onActivate,
  onDelete,
  onEdit,
  onView,
  onCopy,
}: any) => {
  const isLocal = template.type === "LOCAL";
  const isGlobal = template.type === "GLOBAL";
  const isHeader = template.type === "HEADER";
  const isFooter = template.type === "FOOTER";
  const isPage = template.type === "PAGE";
  const active = template.isActive;
  const primaryColor = template.primaryColor || "#1e3a8a";
  const textColor = getContrastTextColor(primaryColor);

  const typeIcon = () => {
    if (isGlobal) return <Globe className="h-4 w-4 text-blue-500" />;
    if (isLocal) return <File className="h-4 w-4 text-green-500" />;
    if (isHeader) return <FileHeader className="h-4 w-4 text-purple-500" />;
    if (isFooter) return <FileFooter className="h-4 w-4 text-purple-500" />;
    if (isPage) return <Layers className="h-4 w-4 text-orange-500" />;
    return <FileText className="h-4 w-4 text-slate-400" />;
  };

  return (
    <Card
      className={`relative transition-all hover:shadow-lg ${
        active ? "border-2 ring-4 ring-blue-50" : "border-slate-200"
      }`}
      style={{
        borderColor: active ? primaryColor : undefined,
      }}>
      {active && (
        <div
          className="absolute top-0 right-0 text-white text-xs px-3 py-1 rounded-bl-lg font-bold flex items-center"
          style={{ backgroundColor: primaryColor, color: textColor }}>
          <CheckCircle className="h-3 w-3 mr-1" /> ACTIVE
        </div>
      )}

      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          {typeIcon()}
          <span className="truncate">{template.name}</span>
          <Badge variant="outline" className="text-[9px] ml-auto">
            {template.type}
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent>
        <div className="h-20 bg-slate-100 rounded-md mb-3 flex items-center justify-center overflow-hidden border text-[10px] text-slate-400">
          {template.config?.header?.mode === "image" &&
          template.config.header.fullImage ? (
            <img
              src={template.config.header.fullImage}
              className="w-full object-cover opacity-80"
              alt="Preview"
            />
          ) : (
            <span>{template.config?.header?.title || "No preview"}</span>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {isGlobal && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs"
              onClick={() => onCopy(template.id)}>
              <Copy className="h-3 w-3 mr-1" /> Use Template
            </Button>
          )}
          {isLocal && (
            <Button
              variant={active ? "secondary" : "default"}
              size="sm"
              className="flex-1 text-xs"
              onClick={() => onActivate(template.id)}
              disabled={active}
              style={
                !active
                  ? { backgroundColor: primaryColor, color: textColor }
                  : {}
              }>
              {active ? "✓ Active" : "Set Active"}
            </Button>
          )}
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={() => onView(template)}
            title="Details">
            <Eye className="h-3 w-3" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={() => onEdit(template.id)}
            title="Edit">
            <Edit className="h-3 w-3" />
          </Button>
          {!template.isActive && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-red-500 hover:bg-red-50"
              onClick={() => onDelete(template.id)}
              title="Delete">
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// ─── Main Page ─────────────────────────────────────────

export default function TemplateGalleryPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewTemplate, setPreviewTemplate] = useState<any | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getAllTemplates();
      setTemplates(data);
    } catch (error) {
      toast.error("Failed to load templates");
    }
    setLoading(false);
  };

  const handleActivate = async (id: string) => {
    try {
      await setActiveTemplate(id);
      toast.success("Template activated!");
      loadData();
    } catch (error) {
      toast.error("Failed to activate");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this template permanently?")) return;
    try {
      await deleteTemplate(id);
      toast.success("Deleted");
      loadData();
    } catch (error) {
      toast.error("Failed to delete");
    }
  };

  const handleCopy = async (globalId: string) => {
    try {
      const copy = await copyTemplateToLocal(globalId);
      toast.success("Template copied to your lab!");
      loadData();
    } catch (error) {
      toast.error("Failed to copy");
    }
  };

  const handleView = (template: any) => {
    setPreviewTemplate(template);
    setPreviewOpen(true);
  };

  const handleEdit = (id: string) => {
    router.push(`/workspace/settings/templates/${id}`);
  };

  const groupedTemplates = {
    global: templates.filter((t) => t.type === "GLOBAL"),
    local: templates.filter((t) => t.type === "LOCAL"),
    header: templates.filter((t) => t.type === "HEADER"),
    footer: templates.filter((t) => t.type === "FOOTER"),
    page: templates.filter((t) => t.type === "PAGE"),
    headless: templates.filter((t) => t.type === "HEADLESS"),
  };

  const hasTemplates = templates.length > 0;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Report Templates
          </h1>
          <p className="text-muted-foreground">
            Manage global templates, local copies, and reusable components.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() =>
              router.push("/workspace/settings/templates/new?type=LOCAL")
            }>
            <Plus className="h-4 w-4 mr-2" /> New Local
          </Button>
          <Button className="bg-blue-600 text-white hover:bg-blue-700"
            onClick={() => router.push("/workspace/settings/templates/new")}>
            <Plus className="h-4 w-4 mr-2" /> New Template
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-blue-600" />
        </div>
      ) : !hasTemplates ? (
        <div className="text-center py-20 bg-slate-50 rounded-lg border border-dashed">
          <p className="text-slate-500 mb-4">No templates found.</p>
          <Button className="bg-blue-600 text-white hover:bg-blue-700"
            onClick={() => router.push("/workspace/settings/templates/new")}>
            Create Your First Template
          </Button>
        </div>
      ) : (
        <Tabs defaultValue="local" className="space-y-6">
          <TabsList className="flex flex-wrap h-auto gap-1 bg-transparent p-0">
            {Object.entries(groupedTemplates).map(([key, items]) => {
              if (items.length === 0) return null;
              const labels: Record<string, string> = {
                global: "🌐 Global",
                local: "📄 Local",
                header: "📌 Headers",
                footer: "📌 Footers",
                page: "📑 Pages",
                headless: "⚙️ Headless",
              };
              return (
                <TabsTrigger
                  key={key}
                  value={key}
                  className="data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700">
                  {labels[key] || key} ({items.length})
                </TabsTrigger>
              );
            })}
          </TabsList>

          {Object.entries(groupedTemplates).map(([key, items]) => (
            <TabsContent key={key} value={key} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map((t) => (
                  <TemplateCard
                    key={t.id}
                    template={t}
                    onActivate={handleActivate}
                    onDelete={handleDelete}
                    onEdit={handleEdit}
                    onView={handleView}
                    onCopy={handleCopy}
                  />
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      )}

      {/* ─── Preview Modal ────────────────────────────── */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" /> Template Details
            </DialogTitle>
          </DialogHeader>
          {previewTemplate && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Name</Label>
                  <p className="text-sm">{previewTemplate.name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Type</Label>
                  <Badge>{previewTemplate.type}</Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <Badge
                    variant={
                      previewTemplate.isActive ? "default" : "secondary"
                    }>
                    {previewTemplate.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
                {previewTemplate.parent && (
                  <div>
                    <Label className="text-sm font-medium">Copied From</Label>
                    <p className="text-sm">{previewTemplate.parent.name}</p>
                  </div>
                )}
              </div>

              <div className="border-t pt-4">
                <Label className="text-sm font-medium">Colors</Label>
                <div className="flex gap-4 mt-1">
                  <div className="flex items-center gap-1">
                    <span className="text-xs">Primary:</span>
                    <div
                      className="w-6 h-6 border rounded"
                      style={{
                        backgroundColor:
                          previewTemplate.primaryColor || "#1e3a8a",
                      }}
                    />
                    <span className="text-xs">
                      {previewTemplate.primaryColor || "#1e3a8a"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs">Accent:</span>
                    <div
                      className="w-6 h-6 border rounded"
                      style={{
                        backgroundColor:
                          previewTemplate.accentColor || "#2563eb",
                      }}
                    />
                    <span className="text-xs">
                      {previewTemplate.accentColor || "#2563eb"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <Label className="text-sm font-medium">Configuration</Label>
                <pre className="text-xs bg-slate-100 p-4 rounded-md overflow-auto max-h-60 mt-2">
                  {JSON.stringify(previewTemplate.config, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
