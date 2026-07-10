"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  LayoutTemplate,
  Search,
  Plus,
  Save,
  Trash2,
  FileText,
  Loader2,
  Wand2,
  Globe2,
  Edit,
  X,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import toast from "react-hot-toast";

const modalities = ["ALL", "MRI", "CT", "XRAY", "USG", "PET", "MAMMO"];

export default function ReportingMacrosPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("ALL");

  // Editor State
  const [selectedMacro, setSelectedMacro] = useState<any | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // 1. Fetch Macros
  const { data: macros = [], isLoading } = useQuery({
    queryKey: ["radiology-macros"],
    queryFn: async () => {
      const res = await fetch("/api/workspace/radiology/settings/macros");
      if (!res.ok) throw new Error("Failed to load macros");
      return res.json();
    },
  });

  // 2. Save Mutation (POST or PATCH)
  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      const isUpdating = payload.id && !payload.id.startsWith("new-");
      const res = await fetch("/api/workspace/radiology/settings/macros", {
        method: isUpdating ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message);
      setIsEditing(false);
      setSelectedMacro(data.data); // Update selected to the newly saved DB record
      queryClient.invalidateQueries({ queryKey: ["radiology-macros"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  // 3. Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(
        `/api/workspace/radiology/settings/macros?id=${id}`,
        { method: "DELETE" },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message);
      setSelectedMacro(null);
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ["radiology-macros"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Filtering
  const filteredMacros = macros.filter((macro: any) => {
    const matchesSearch =
      macro.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (macro.shortcode || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesModality =
      activeFilter === "ALL" || macro.modalityType === activeFilter;
    return matchesSearch && matchesModality;
  });

  // Handlers
  const handleCreateNew = () => {
    setSelectedMacro({
      id: `new-${Date.now()}`, // Temporary ID
      title: "",
      modalityType: "XRAY",
      shortcode: "",
      findingsText: "",
      impressionText: "",
      isGlobal: true,
    });
    setIsEditing(true);
  };

  const handleSave = () => {
    if (
      !selectedMacro.title ||
      !selectedMacro.findingsText ||
      !selectedMacro.impressionText
    ) {
      return toast.error("Title, Findings, and Impression are required.");
    }
    saveMutation.mutate(selectedMacro);
  };

  const handleDelete = () => {
    if (
      confirm(
        "Are you sure you want to delete this macro? Radiologists will no longer be able to use it.",
      )
    ) {
      deleteMutation.mutate(selectedMacro.id);
    }
  };

  if (isLoading) {
    return (
      <div className="h-[calc(100vh-4rem)] flex flex-col items-center justify-center bg-muted/30 font-sans">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600 mb-4" />
        <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest animate-pulse">
          Loading Macros...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-muted/30 font-sans relative selection:bg-indigo-100 pb-12 lg:h-[calc(100vh-4rem)] lg:overflow-hidden flex flex-col">
      {/* Decorative Background Mesh */}
      <div className="absolute top-0 inset-x-0 h-64 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-100/40 via-slate-50 to-transparent pointer-events-none z-0" />

      {/* FLOATING HEADER */}
      <header className="shrink-0 z-30 px-4 sm:px-6 lg:px-8 py-4 w-full max-w-[1600px] mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card/70 backdrop-blur-xl p-4 rounded-2xl border border-slate-200/60 shadow-sm">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="h-12 w-12 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center shadow-inner shrink-0">
              <LayoutTemplate className="h-6 w-6 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-foreground tracking-tight leading-tight truncate">
                Reporting Macros
              </h1>
              <p className="text-xs font-medium text-muted-foreground mt-0.5 truncate">
                Manage pre-saved text blocks to speed up radiologist reporting.
              </p>
            </div>
          </div>

          <Button
            onClick={handleCreateNew}
            className="w-full md:w-auto bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-md shadow-indigo-500/25 h-11 rounded-xl px-6 font-bold transition-all duration-300 hover:-translate-y-0.5 shrink-0">
            <Plus className="mr-1.5 h-5 w-5" /> New Macro
          </Button>
        </div>
      </header>

      {/* SPLIT PANE MAIN CONTENT */}
      <main className="flex-1 w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pb-4 flex flex-col lg:flex-row gap-6 relative z-10 lg:min-h-0">
        {/* LEFT COLUMN: Macro Library (List) */}
        <div className="w-full lg:w-1/3 flex flex-col bg-card rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden lg:h-full min-h-[400px]">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 space-y-4 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search macros or /shortcodes..."
                className="pl-9 h-11 bg-card border-border focus:border-indigo-300 focus:ring-indigo-500/20 rounded-xl text-sm shadow-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex gap-1.5 bg-slate-100/80 p-1.5 rounded-xl border border-slate-200/50 overflow-x-auto custom-scrollbar">
              {modalities.map((mod) => (
                <button
                  key={mod}
                  onClick={() => setActiveFilter(mod)}
                  className={`px-4 py-1.5 text-[11px] font-bold rounded-lg whitespace-nowrap transition-all uppercase tracking-wider ${
                    activeFilter === mod
                      ? "bg-card text-indigo-700 shadow-sm border border-slate-200/50"
                      : "text-muted-foreground hover:text-foreground hover:bg-slate-200/50"
                  }`}>
                  {mod}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-slate-100">
            {filteredMacros.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center text-slate-400">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-30 text-indigo-300" />
                <p className="text-sm font-bold text-muted-foreground">
                  No macros found
                </p>
                <p className="text-xs mt-1 max-w-[200px]">
                  Adjust your search filters or click 'New Macro' to create one.
                </p>
              </div>
            ) : (
              filteredMacros.map((macro: any) => (
                <div
                  key={macro.id}
                  onClick={() => {
                    setSelectedMacro(macro);
                    setIsEditing(false);
                  }}
                  className={`p-4 sm:p-5 cursor-pointer transition-all border-l-4 group ${
                    selectedMacro?.id === macro.id
                      ? "bg-indigo-50/50 border-l-indigo-600"
                      : "border-l-transparent hover:bg-muted/50/80"
                  }`}>
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <h3
                      className={`font-bold text-sm truncate ${selectedMacro?.id === macro.id ? "text-indigo-900" : "text-foreground"}`}>
                      {macro.title}
                    </h3>
                    <Badge
                      variant="outline"
                      className="text-[9px] font-bold uppercase tracking-wider bg-card border-border text-muted-foreground shadow-sm shrink-0">
                      {macro.modalityType}
                    </Badge>
                  </div>
                  {macro.shortcode ? (
                    <p className="text-xs font-mono font-bold text-indigo-600 bg-card px-2 py-0.5 rounded border border-indigo-100 w-max shadow-sm">
                      /{macro.shortcode}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground/70 italic font-medium">
                      No shortcode assigned
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Macro Editor */}
        <div className="w-full lg:w-2/3 flex flex-col bg-card rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden lg:h-full relative min-h-[600px] lg:min-h-0">
          {selectedMacro ? (
            <>
              {/* Editor Header */}
              <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
                <div className="min-w-0">
                  <h2 className="text-lg font-bold text-foreground flex items-center gap-2 truncate">
                    <Wand2 className="h-5 w-5 text-indigo-600 shrink-0" />
                    {isEditing
                      ? selectedMacro.id.startsWith("new")
                        ? "Create New Macro"
                        : "Edit Macro"
                      : "Macro Details"}
                  </h2>
                  <p className="text-xs font-medium text-muted-foreground mt-0.5 truncate">
                    {isEditing
                      ? "Configure triggers and text blocks."
                      : "Review macro details."}
                  </p>
                </div>

                <div className="flex gap-2 w-full sm:w-auto">
                  {!isEditing ? (
                    <Button
                      variant="outline"
                      className="w-full sm:w-auto h-10 rounded-xl bg-card border-border font-bold text-foreground/80 shadow-sm hover:bg-muted/30"
                      onClick={() => setIsEditing(true)}>
                      <Edit className="h-4 w-4 mr-2" /> Edit Macro
                    </Button>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        className="flex-1 sm:flex-none h-10 rounded-xl font-bold bg-card border-border text-muted-foreground hover:bg-muted/30"
                        onClick={() => {
                          if (selectedMacro.id.startsWith("new"))
                            setSelectedMacro(null);
                          else setIsEditing(false);
                        }}>
                        <X className="h-4 w-4 mr-1.5" /> Cancel
                      </Button>

                      <Button
                        onClick={handleSave}
                        disabled={saveMutation.isPending}
                        className="flex-1 sm:flex-none h-10 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/25 transition-all hover:-translate-y-0.5">
                        {saveMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Save className="h-4 w-4 mr-2" />
                        )}
                        Save Changes
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Editor Body */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-5 sm:p-6 flex flex-col gap-6">
                {/* Meta Configuration */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 bg-indigo-50/30 p-5 rounded-xl border border-indigo-100/50">
                  <div className="sm:col-span-2 space-y-1.5">
                    <Label className="text-xs font-bold text-foreground/80 uppercase tracking-wider">
                      Macro Title <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      value={selectedMacro.title}
                      onChange={(e) =>
                        setSelectedMacro({
                          ...selectedMacro,
                          title: e.target.value,
                        })
                      }
                      disabled={!isEditing}
                      placeholder="e.g. Normal Chest X-Ray"
                      className="h-11 rounded-xl bg-card border-border focus:ring-indigo-500/20 font-bold text-foreground disabled:opacity-100 disabled:bg-muted/30 shadow-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-foreground/80 uppercase tracking-wider">
                      Modality <span className="text-rose-500">*</span>
                    </Label>
                    <select
                      className="flex h-11 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm font-bold text-foreground/80 shadow-sm disabled:opacity-100 disabled:bg-muted/30 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all appearance-none"
                      value={selectedMacro.modalityType}
                      onChange={(e) =>
                        setSelectedMacro({
                          ...selectedMacro,
                          modalityType: e.target.value,
                        })
                      }
                      disabled={!isEditing}>
                      {modalities
                        .filter((m) => m !== "ALL")
                        .map((mod) => (
                          <option key={mod} value={mod}>
                            {mod}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-foreground/80 uppercase tracking-wider">
                      Shortcode (Trigger)
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-3.5 text-muted-foreground/70 font-mono text-sm font-bold">
                        /
                      </span>
                      <Input
                        value={selectedMacro.shortcode || ""}
                        onChange={(e) =>
                          setSelectedMacro({
                            ...selectedMacro,
                            shortcode: e.target.value,
                          })
                        }
                        disabled={!isEditing}
                        placeholder="N-CXR"
                        className="pl-6 h-11 font-mono text-sm font-bold text-indigo-600 bg-card border-border focus:ring-indigo-500/20 disabled:opacity-100 disabled:bg-muted/30 shadow-sm uppercase"
                      />
                    </div>
                    <p className="text-[10px] font-medium text-muted-foreground mt-1 pl-1">
                      Type this code in the editor to auto-fill text.
                    </p>
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs font-bold text-foreground/80 uppercase tracking-wider">
                      Scope / Visibility
                    </Label>
                    <div className="mt-1">
                      <label
                        className={`flex items-center gap-3 p-2.5 border rounded-xl transition-colors w-max 
                       ${isEditing ? "cursor-pointer hover:bg-card bg-muted/30 border-border" : "opacity-70 bg-muted/30 border-border"}`}>
                        <input
                          type="checkbox"
                          disabled={!isEditing}
                          className="h-4 w-4 text-indigo-600 rounded border-border focus:ring-indigo-600"
                          checked={selectedMacro.isGlobal}
                          onChange={(e) =>
                            setSelectedMacro({
                              ...selectedMacro,
                              isGlobal: e.target.checked,
                            })
                          }
                        />
                        <div className="flex items-center gap-2 pr-2">
                          <Globe2
                            className={`h-4 w-4 ${selectedMacro.isGlobal ? "text-indigo-600" : "text-slate-400"}`}
                          />
                          <p className="font-bold text-foreground text-sm">
                            Global Macro
                          </p>
                        </div>
                      </label>
                    </div>
                    <p className="text-[10px] font-medium text-muted-foreground mt-1 pl-1">
                      If checked, all radiologists in your lab can use this
                      template.
                    </p>
                  </div>
                </div>

                {/* Text Content Configuration */}
                <div className="space-y-5 flex-1 flex flex-col">
                  <div className="space-y-2 flex-1 flex flex-col">
                    <Label className="text-xs font-bold text-foreground/80 uppercase tracking-wider flex items-center gap-2">
                      <FileText className="h-4 w-4 text-indigo-500" /> Findings
                      Block <span className="text-rose-500">*</span>
                    </Label>
                    <Textarea
                      value={selectedMacro.findingsText}
                      onChange={(e) =>
                        setSelectedMacro({
                          ...selectedMacro,
                          findingsText: e.target.value,
                        })
                      }
                      disabled={!isEditing}
                      className="flex-1 min-h-[250px] font-mono text-[13px] leading-relaxed rounded-xl border-border bg-slate-50/50 focus:bg-card focus:border-indigo-400 focus:ring-indigo-500/20 disabled:opacity-100 disabled:bg-muted/30 disabled:text-foreground/80 p-4 resize-none shadow-inner"
                      placeholder="Enter the detailed clinical findings template here..."
                    />
                  </div>

                  <div className="space-y-2 shrink-0">
                    <Label className="text-xs font-bold text-foreground/80 uppercase tracking-wider flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-indigo-500" />{" "}
                      Impression Block <span className="text-rose-500">*</span>
                    </Label>
                    <Textarea
                      value={selectedMacro.impressionText}
                      onChange={(e) =>
                        setSelectedMacro({
                          ...selectedMacro,
                          impressionText: e.target.value,
                        })
                      }
                      disabled={!isEditing}
                      className="min-h-[120px] font-bold text-sm leading-relaxed rounded-xl border-border bg-slate-50/50 focus:bg-card focus:border-indigo-400 focus:ring-indigo-500/20 disabled:opacity-100 disabled:bg-muted/30 disabled:text-foreground/80 p-4 shadow-inner"
                      placeholder="Enter the final diagnosis or conclusion here..."
                    />
                  </div>
                </div>

                {/* Delete Button (Only visible when editing an existing macro) */}
                {isEditing && !selectedMacro.id.startsWith("new") && (
                  <div className="pt-4 mt-2 border-t border-rose-100 flex justify-end shrink-0">
                    <Button
                      variant="outline"
                      onClick={handleDelete}
                      disabled={deleteMutation.isPending}
                      className="w-full sm:w-auto bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100 hover:text-rose-700 hover:border-rose-300 font-bold h-11 rounded-xl transition-colors">
                      {deleteMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Trash2 className="h-4 w-4 mr-2" />
                      )}
                      Delete Macro Permanently
                    </Button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground/70 p-8 bg-slate-50/30">
              <div className="h-24 w-24 bg-card rounded-full flex items-center justify-center shadow-sm mb-5 border border-slate-100">
                <LayoutTemplate className="h-10 w-10 text-indigo-200" />
              </div>
              <h3 className="text-xl font-bold text-foreground/80 mb-2">
                No Macro Selected
              </h3>
              <p className="text-sm text-center max-w-[280px] leading-relaxed text-muted-foreground">
                Select a macro from the library to view or edit its contents, or
                click "New Macro" to build a new reporting template.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
