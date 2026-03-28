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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
      const res = await fetch("/api/lab-owner/radiology/settings/macros");
      if (!res.ok) throw new Error("Failed to load macros");
      return res.json();
    },
  });

  // 2. Save Mutation (POST or PATCH)
  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      const isUpdating = payload.id && !payload.id.startsWith("new-");
      const res = await fetch("/api/lab-owner/radiology/settings/macros", {
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
        `/api/lab-owner/radiology/settings/macros?id=${id}`,
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
      <div className="flex h-[calc(100vh-100px)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <LayoutTemplate className="h-6 w-6 text-blue-600" />
            Reporting Macros & Templates
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage pre-saved text blocks to speed up radiologist reporting.
          </p>
        </div>
        <Button
          onClick={handleCreateNew}
          className="bg-blue-600 hover:bg-blue-700 text-white shadow-md">
          <Plus className="mr-2 h-4 w-4" /> New Macro
        </Button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-200px)] min-h-[600px]">
        {/* LEFT COLUMN: Macro Library (List) */}
        <div className="w-full lg:w-1/3 flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-full">
          <div className="p-4 border-b border-slate-100 bg-slate-50 space-y-3 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search macros or shortcodes..."
                className="pl-9 bg-white"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {modalities.map((mod) => (
                <button
                  key={mod}
                  onClick={() => setActiveFilter(mod)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md whitespace-nowrap transition-colors ${
                    activeFilter === mod
                      ? "bg-slate-800 text-white"
                      : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}>
                  {mod}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filteredMacros.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <FileText className="h-10 w-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm font-medium">No macros found.</p>
                <p className="text-xs mt-1">Click 'New Macro' to create one.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {filteredMacros.map((macro: any) => (
                  <div
                    key={macro.id}
                    onClick={() => {
                      setSelectedMacro(macro);
                      setIsEditing(false);
                    }}
                    className={`p-4 cursor-pointer transition-colors hover:bg-blue-50/50 ${
                      selectedMacro?.id === macro.id
                        ? "bg-blue-50 border-l-4 border-blue-600"
                        : "border-l-4 border-transparent"
                    }`}>
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="font-bold text-sm text-slate-900 line-clamp-1 pr-2">
                        {macro.title}
                      </h3>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border bg-white text-slate-600 border-slate-200">
                        {macro.modalityType}
                      </span>
                    </div>
                    {macro.shortcode ? (
                      <p className="text-xs text-blue-600 font-mono font-bold">
                        /{macro.shortcode}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-400 italic">
                        No shortcode
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Macro Editor */}
        <div className="w-full lg:w-2/3 flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-full relative">
          {selectedMacro ? (
            <>
              {/* Editor Header */}
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center shrink-0">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Wand2 className="h-5 w-5 text-blue-600" />
                  {isEditing
                    ? selectedMacro.id.startsWith("new")
                      ? "Create New Macro"
                      : "Edit Macro"
                    : "Macro Details"}
                </h2>
                <div className="flex gap-2">
                  {!isEditing ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditing(true)}>
                      Edit
                    </Button>
                  ) : (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (selectedMacro.id.startsWith("new"))
                            setSelectedMacro(null);
                          else setIsEditing(false);
                        }}
                        className="text-slate-500">
                        Cancel
                      </Button>

                      <Button
                        size="sm"
                        onClick={handleSave}
                        disabled={saveMutation.isPending}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[100px]">
                        {saveMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Save className="h-4 w-4 mr-2" />
                        )}{" "}
                        Save
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Editor Body */}
              <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-2 space-y-2">
                    <Label>
                      Macro Title <span className="text-red-500">*</span>
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
                      className="font-bold text-slate-900 disabled:opacity-100 disabled:bg-slate-50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>
                      Modality <span className="text-red-500">*</span>
                    </Label>
                    <select
                      className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm disabled:opacity-100 disabled:bg-slate-50 outline-none focus:ring-2 focus:ring-blue-600"
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
                </div>

                <div className="flex flex-col md:flex-row gap-6 items-start">
                  <div className="space-y-2 w-full md:w-1/3">
                    <Label>Shortcode (Trigger)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-slate-400 font-mono text-sm">
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
                        className="pl-6 font-mono text-sm text-blue-600 disabled:opacity-100 disabled:bg-slate-50"
                      />
                    </div>
                    <p className="text-[10px] text-slate-500">
                      Type this code in the editor to auto-fill text.
                    </p>
                  </div>

                  <div className="space-y-2 w-full md:w-2/3 mt-2 md:mt-0">
                    <Label>Scope / Visibility</Label>
                    <label className="flex items-center gap-3 p-2.5 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors w-max disabled:opacity-50">
                      <input
                        type="checkbox"
                        disabled={!isEditing}
                        className="h-4 w-4 text-blue-600 rounded border-slate-300 focus:ring-blue-600"
                        checked={selectedMacro.isGlobal}
                        onChange={(e) =>
                          setSelectedMacro({
                            ...selectedMacro,
                            isGlobal: e.target.checked,
                          })
                        }
                      />
                      <div className="flex items-center gap-2">
                        <Globe2 className="h-4 w-4 text-slate-500" />
                        <p className="font-bold text-slate-800 text-sm">
                          Global Macro
                        </p>
                      </div>
                    </label>
                    <p className="text-[10px] text-slate-500">
                      If checked, all radiologists in your lab can use this
                      template.
                    </p>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-6 space-y-6 flex-1 flex flex-col">
                  <div className="space-y-2 flex-1 flex flex-col">
                    <Label className="text-base text-slate-800">
                      Findings <span className="text-red-500">*</span>
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
                      className="flex-1 min-h-[200px] font-mono text-sm leading-relaxed disabled:opacity-100 disabled:bg-slate-50 disabled:cursor-text p-4"
                      placeholder="Enter the detailed clinical findings here..."
                    />
                  </div>

                  <div className="space-y-2 shrink-0">
                    <Label className="text-base text-slate-800">
                      Impression <span className="text-red-500">*</span>
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
                      className="min-h-[100px] font-bold text-sm leading-relaxed disabled:opacity-100 disabled:bg-slate-50 disabled:cursor-text p-4"
                      placeholder="Enter the final diagnosis/conclusion here..."
                    />
                  </div>
                </div>

                {/* Delete Button (Only visible when editing an existing macro) */}
                {isEditing && !selectedMacro.id.startsWith("new") && (
                  <div className="pt-4 mt-4 border-t border-slate-100 flex justify-end shrink-0">
                    <Button
                      variant="destructive"
                      onClick={handleDelete}
                      disabled={deleteMutation.isPending}
                      className="bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 border-none">
                      {deleteMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Trash2 className="h-4 w-4 mr-2" />
                      )}
                      Delete Macro
                    </Button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 bg-slate-50/50">
              <div className="h-20 w-20 bg-white rounded-full flex items-center justify-center shadow-sm mb-4 border border-slate-100">
                <LayoutTemplate className="h-8 w-8 text-slate-300" />
              </div>
              <h3 className="text-lg font-bold text-slate-600 mb-1">
                No Macro Selected
              </h3>
              <p className="text-sm text-center max-w-sm">
                Select a macro from the library to view or edit its contents, or
                click "New Macro" to build a new template.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
