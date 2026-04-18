"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Plus,
  CheckCircle,
  Edit,
  Trash2,
  Loader2,
  FileText,
  Image as ImageIcon,
} from "lucide-react";
import {
  getAllTemplates,
  setActiveTemplate,
  deleteTemplate,
} from "@/actions/report-settings";
import toast from "react-hot-toast";

export default function TemplateGalleryPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async (id: string) => {
    try {
      await setActiveTemplate(id);
      toast.success("Template Activated!");
      loadData(); // Refresh UI to show new active state
    } catch (error) {
      toast.error("Failed to activate template");
    }
  };

  const handleDelete = async (id: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this template? This cannot be undone.",
      )
    )
      return;
    try {
      await deleteTemplate(id);
      toast.success("Template Deleted");
      loadData();
    } catch (error) {
      toast.error("Failed to delete template");
    }
  };

  // Helper to safely parse config for the UI preview
  const getSafeConfig = (rawConfig: any) => {
    if (!rawConfig) return {};
    if (typeof rawConfig === "string") {
      try {
        return JSON.parse(rawConfig);
      } catch (e) {
        return {};
      }
    }
    return rawConfig;
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Report Templates
          </h1>
          <p className="text-slate-500 mt-1">
            Create multiple designs and select the active one for generating
            patient reports.
          </p>
        </div>
        <Button
          onClick={() => router.push("/workspace/settings/templates/new")}
          className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" /> Create New Template
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-24 bg-white rounded-xl border-2 border-dashed border-slate-200 shadow-sm">
          <div className="h-16 w-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-700 mb-1">
            No templates found
          </h3>
          <p className="text-slate-500 mb-6 max-w-sm mx-auto">
            You haven't created any report templates yet. Start by building your
            first lab report layout.
          </p>
          <Button
            onClick={() => router.push("/workspace/settings/templates/new")}>
            <Plus className="h-4 w-4 mr-2" /> Create Your First Template
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((t) => {
            const safeConfig = getSafeConfig(t.config);
            const primaryColor = safeConfig.branding?.primaryColor || "#2563eb";

            return (
              <Card
                key={t.id}
                className={`relative overflow-hidden transition-all hover:shadow-lg ${t.isActive ? "border-2 border-blue-600 ring-4 ring-blue-50" : "border-slate-200"}`}>
                {/* Active Badge */}
                {t.isActive && (
                  <div className="absolute top-0 right-0 bg-blue-600 text-white text-[10px] uppercase tracking-wider px-3 py-1 rounded-bl-xl font-bold flex items-center shadow-sm z-10">
                    <CheckCircle className="h-3 w-3 mr-1" /> Active Layout
                  </div>
                )}

                <CardHeader className="pb-3 border-b bg-slate-50/50">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <div
                      className="h-8 w-8 rounded bg-white border shadow-sm flex items-center justify-center"
                      style={{ color: primaryColor }}>
                      <FileText className="h-4 w-4" />
                    </div>
                    <span className="truncate">{t.name}</span>
                  </CardTitle>
                </CardHeader>

                <CardContent className="pt-4">
                  {/* Visual Thumbnail */}
                  <div
                    className="h-36 bg-white rounded-md mb-5 flex flex-col items-center justify-center overflow-hidden border shadow-inner relative"
                    style={{
                      borderTop:
                        safeConfig.header?.mode !== "image"
                          ? `4px solid ${primaryColor}`
                          : "1px solid #e2e8f0",
                    }}>
                    {safeConfig.header?.mode === "image" &&
                    safeConfig.header.fullImage ? (
                      <>
                        <img
                          src={safeConfig.header.fullImage}
                          className="w-full h-12 object-cover opacity-90 border-b"
                          alt="Header"
                        />
                        <div className="flex-1 w-full bg-slate-50 flex items-center justify-center text-xs text-slate-400 font-medium">
                          Custom Image Layout
                        </div>
                      </>
                    ) : safeConfig.header?.mode === "html" ? (
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <Code className="h-6 w-6" />
                        <span className="text-xs font-mono">
                          Custom HTML Header
                        </span>
                      </div>
                    ) : (
                      <div className="w-full px-4 text-center">
                        {safeConfig.header?.logoUrl ? (
                          <img
                            src={safeConfig.header.logoUrl}
                            className="h-8 mx-auto mb-2 object-contain grayscale opacity-50"
                            alt="Logo"
                          />
                        ) : (
                          <ImageIcon className="h-6 w-6 mx-auto mb-2 text-slate-200" />
                        )}
                        <div className="h-2 w-3/4 bg-slate-200 rounded mx-auto mb-1"></div>
                        <div className="h-1.5 w-1/2 bg-slate-100 rounded mx-auto"></div>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Button
                      variant={t.isActive ? "secondary" : "default"}
                      className={`flex-1 font-semibold ${!t.isActive && "bg-slate-800 hover:bg-slate-700"}`}
                      onClick={() => handleActivate(t.id)}
                      disabled={t.isActive}>
                      {t.isActive ? "Currently Active" : "Set as Active"}
                    </Button>

                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        router.push(`/workspace/settings/templates/${t.id}`)
                      }
                      title="Edit Template">
                      <Edit className="h-4 w-4 text-slate-600" />
                    </Button>

                    {!t.isActive && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-500 hover:bg-red-50 hover:text-red-600 border border-transparent hover:border-red-100"
                        onClick={() => handleDelete(t.id)}
                        title="Delete Template">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
