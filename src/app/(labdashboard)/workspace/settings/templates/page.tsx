"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  CheckCircle,
  Edit,
  Trash2,
  Loader2,
  FileText,
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
    const data = await getAllTemplates();
    setTemplates(data);
    setLoading(false);
  };

  const handleActivate = async (id: string) => {
    await setActiveTemplate(id);
    toast.success("Template Activated!");
    loadData(); // Refresh UI
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure? This cannot be undone.")) return;
    await deleteTemplate(id);
    toast.success("Deleted");
    loadData();
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Report Templates
          </h1>
          <p className="text-muted-foreground">
            Create multiple designs and select the active one for printing.
          </p>
        </div>
        <Button
          onClick={() => router.push("/workspace/settings/templates/new")}>
          <Plus className="h-4 w-4 mr-2" /> Create New Template
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-blue-600" />
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-20 bg-slate-50 rounded-lg border border-dashed">
          <p className="text-slate-500 mb-4">No templates found.</p>
          <Button
            onClick={() => router.push("/workspace/settings/templates/new")}>
            Create Your First Template
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((t) => (
            <Card
              key={t.id}
              className={`relative transition-all hover:shadow-lg ${t.isActive ? "border-2 border-blue-600 ring-4 ring-blue-50" : "border-slate-200"}`}>
              {t.isActive && (
                <div className="absolute top-0 right-0 bg-blue-600 text-white text-xs px-3 py-1 rounded-bl-lg font-bold flex items-center">
                  <CheckCircle className="h-3 w-3 mr-1" /> ACTIVE
                </div>
              )}
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-slate-400" />
                  {t.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-32 bg-slate-100 rounded-md mb-4 flex items-center justify-center overflow-hidden border">
                  {/* Tiny Preview of Header if Image Mode */}
                  {t.config?.header?.mode === "image" &&
                  t.config.header.fullImage ? (
                    <img
                      src={t.config.header.fullImage}
                      className="w-full object-cover opacity-80"
                    />
                  ) : (
                    <span className="text-xs text-slate-400 font-mono">
                      Standard Layout
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    variant={t.isActive ? "secondary" : "default"}
                    className="flex-1"
                    onClick={() => handleActivate(t.id)}
                    disabled={t.isActive}>
                    {t.isActive ? "Currently Active" : "Set as Active"}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      router.push(`/workspace/settings/templates/${t.id}`)
                    }>
                    <Edit className="h-4 w-4" />
                  </Button>
                  {!t.isActive && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-500 hover:bg-red-50"
                      onClick={() => handleDelete(t.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
