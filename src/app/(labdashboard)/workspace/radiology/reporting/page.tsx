"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Stethoscope,
  Search,
  MonitorPlay,
  CheckCircle2,
  Save,
  FileSignature,
  Loader2,
  Zap,
  History,
  FileText,
  AlertCircle,
  Fingerprint,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import toast from "react-hot-toast";

// 1. Fetch Functions
const fetchQueue = async () => {
  const res = await fetch("/api/workspace/radiology/reporting");
  if (!res.ok) throw new Error("Failed to load queue");
  return res.json();
};

const fetchMacros = async () => {
  const res = await fetch("/api/workspace/radiology/settings/macros");
  if (!res.ok) throw new Error("Failed to load macros");
  return res.json();
};

export default function ReportingDeskPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("ALL"); // UNREAD, DRAFT, ALL
  const [selectedStudy, setSelectedStudy] = useState<any | null>(null);

  // 2. Queries
  const { data: queue = [], isLoading: isQueueLoading } = useQuery({
    queryKey: ["radiology-queue"],
    queryFn: fetchQueue,
    refetchInterval: 30000, // Auto-refresh queue every 30 seconds
  });

  const { data: macros = [] } = useQuery({
    queryKey: ["radiology-macros"],
    queryFn: fetchMacros,
    staleTime: 5 * 60 * 1000, // Cache macros for 5 mins
  });

  // 3. Save/Finalize Mutation
  const saveMutation = useMutation({
    mutationFn: async ({ studyId, findings, impression, action }: any) => {
      const res = await fetch("/api/workspace/radiology/reporting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studyId, findings, impression, action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      return data;
    },
    onSuccess: (data, variables) => {
      toast.success(data.message);
      queryClient.invalidateQueries({ queryKey: ["radiology-queue"] });

      if (variables.action === "FINALIZE") {
        setSelectedStudy(null);
        // Open the generated report in a new tab immediately
        window.open(
          `/workspace/radiology/print/${variables.studyId}`,
          "_blank",
        );
      } else {
        // Update local state to reflect it's now a draft
        setSelectedStudy((prev: any) => ({ ...prev, status: "DRAFT" }));
      }
    },
    onError: (error: any) => toast.error(error.message),
  });

  // ==========================================
  // 🧠 THE SHORTCODE ENGINE
  // ==========================================
  const handleFindingsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    let text = e.target.value;

    // Check if the user just typed a space, and if there's a shortcode right before it
    if (text.endsWith(" ")) {
      // Find all words in the text that start with '/'
      const words = text.split(/\s+/);
      const lastWord = words[words.length - 2]; // -1 is empty string after space, -2 is the typed word

      if (lastWord && lastWord.startsWith("/")) {
        const typedShortcode = lastWord.substring(1).toLowerCase(); // remove '/' and lowercase

        // Find matching macro
        const matchedMacro = macros.find(
          (m: any) =>
            m.shortcode &&
            m.shortcode.toLowerCase() === typedShortcode &&
            (m.modalityType === selectedStudy?.modality ||
              m.modalityType === "ALL"),
        );

        if (matchedMacro) {
          // 1. Replace the shortcode in the findings text
          const regex = new RegExp(`/${matchedMacro.shortcode}\\s$`, "i");
          text = text.replace(regex, matchedMacro.findingsText + " ");

          // 2. Auto-fill or append the impression
          setSelectedStudy((prev: any) => ({
            ...prev,
            findings: text,
            impression: prev.impression
              ? prev.impression + "\n\n" + matchedMacro.impressionText
              : matchedMacro.impressionText,
          }));

          toast.success(`Applied Macro: ${matchedMacro.title}`);
          return; // Exit early since we updated state
        }
      }
    }

    // Normal typing update
    setSelectedStudy({ ...selectedStudy, findings: text });
  };

  // Filter Logic
  const filteredQueue = queue.filter((item: any) => {
    const pName = item.patient || "";
    const pId = item.id || "";
    const matchesSearch =
      pName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter =
      activeFilter === "ALL" || item.status === activeFilter;
    return matchesSearch && matchesFilter;
  });

  const handleAction = (action: "DRAFT" | "FINALIZE") => {
    if (!selectedStudy?.findings || !selectedStudy?.impression) {
      return toast.error("Findings and Impression cannot be empty.");
    }
    saveMutation.mutate({
      studyId: selectedStudy.studyId,
      findings: selectedStudy.findings,
      impression: selectedStudy.impression,
      action,
    });
  };

  if (isQueueLoading) {
    return (
      <div className="h-[calc(100vh-4rem)] flex flex-col items-center justify-center bg-slate-50 font-sans">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600 mb-4" />
        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest animate-pulse">
          Loading Reporting Desk...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 font-sans relative selection:bg-indigo-100 pb-12 lg:h-[calc(100vh-4rem)] lg:overflow-hidden flex flex-col">
      {/* Decorative Background Mesh */}
      <div className="absolute top-0 inset-x-0 h-64 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-100/40 via-slate-50 to-transparent pointer-events-none z-0" />

      {/* FLOATING HEADER */}
      <header className="shrink-0 z-30 px-4 sm:px-6 lg:px-8 py-4 w-full max-w-[1600px] mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/70 backdrop-blur-xl p-4 rounded-2xl border border-slate-200/60 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center shadow-inner shrink-0">
              <Stethoscope className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight leading-tight">
                Radiologist Reporting Desk
              </h1>
              <p className="text-xs font-medium text-slate-500 mt-0.5">
                Review scans, dictate findings, and verify reports.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 px-4 py-2.5 bg-indigo-50 rounded-xl border border-indigo-100 shadow-sm shrink-0 w-full md:w-auto justify-center">
            <Zap className="h-4 w-4 text-indigo-600" />
            <span className="text-xs font-bold text-indigo-800 uppercase tracking-wider">
              {macros.length} Macros Active
            </span>
          </div>
        </div>
      </header>

      {/* SPLIT PANE MAIN CONTENT */}
      <main className="flex-1 w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pb-4 flex flex-col lg:flex-row gap-6 relative z-10 lg:min-h-0">
        {/* LEFT COLUMN: Queue */}
        <div className="w-full lg:w-1/3 flex flex-col bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden lg:h-full">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 space-y-4 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search patient or accession..."
                className="pl-9 bg-white border-slate-200 focus:border-indigo-300 focus:ring-indigo-500/20 rounded-xl h-10 text-sm shadow-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-1.5 bg-slate-100/80 p-1.5 rounded-xl border border-slate-200/50">
              {["UNREAD", "DRAFT", "ALL"].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className={`flex-1 py-1.5 text-[11px] uppercase tracking-wider font-bold rounded-lg transition-all ${
                    activeFilter === filter
                      ? "bg-white text-indigo-700 shadow-sm border border-slate-200/50"
                      : "text-slate-500 hover:text-slate-800"
                  }`}>
                  {filter}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-slate-100 min-h-[300px] lg:min-h-0">
            {filteredQueue.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center text-slate-400">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-30 text-emerald-500" />
                <p className="text-sm font-bold text-slate-600">
                  Queue is clear
                </p>
                <p className="text-xs mt-1">No studies pending your review.</p>
              </div>
            ) : (
              filteredQueue.map((item: any) => {
                const isSelected = selectedStudy?.studyId === item.studyId;
                const initials =
                  item.patient
                    ?.split(" ")
                    .map((n: string) => n[0])
                    .join("")
                    .substring(0, 2)
                    .toUpperCase() || "PT";

                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedStudy(item)}
                    className={`p-4 sm:p-5 cursor-pointer transition-all border-l-4 group
                  ${
                    isSelected
                      ? "bg-indigo-50/50 border-l-indigo-600"
                      : item.status === "DRAFT"
                        ? "border-l-amber-400 hover:bg-slate-50/80"
                        : "border-l-transparent hover:bg-slate-50/80"
                  }`}>
                    <div className="flex items-start gap-3">
                      <Avatar
                        className={`h-10 w-10 border shadow-sm shrink-0 ${isSelected ? "border-indigo-200 bg-white" : "border-slate-200 bg-slate-50"}`}>
                        <AvatarFallback
                          className={`font-bold text-xs ${isSelected ? "text-indigo-700" : "text-slate-600"}`}>
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex justify-between items-start mb-1 gap-2">
                          <h3
                            className={`font-bold text-sm truncate ${isSelected ? "text-indigo-900" : "text-slate-900"}`}>
                            {item.patient || "Unknown Patient"}
                          </h3>
                          {item.priority === "URGENT" && (
                            <Badge
                              variant="outline"
                              className="bg-rose-50 text-rose-700 border-none px-1.5 py-0 text-[9px] font-black tracking-wider uppercase flex items-center gap-1 shadow-sm shrink-0">
                              URGENT
                            </Badge>
                          )}
                        </div>
                        <p
                          className="text-xs font-medium text-slate-600 mb-2 truncate"
                          title={item.scan}>
                          {item.scan}
                        </p>
                        <div className="flex justify-between items-center mt-2 flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className="text-[9px] font-bold uppercase tracking-wider bg-white border-slate-200 text-slate-700 shadow-sm shrink-0">
                              {item.modality}
                            </Badge>
                            <span className="text-[10px] font-medium text-slate-500 whitespace-nowrap">
                              {item.time}
                            </span>
                          </div>
                          {item.status === "DRAFT" && (
                            <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider flex items-center gap-1 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100 shrink-0">
                              <Save className="h-3 w-3" /> Draft
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Editor */}
        <div className="w-full lg:w-2/3 flex flex-col bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden lg:h-full relative min-h-[600px] lg:min-h-0">
          {selectedStudy ? (
            <>
              {/* Context Header */}
              <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 shrink-0 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="min-w-0 w-full sm:w-auto">
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 truncate">
                    {selectedStudy.patient || "Unknown Patient"}
                    <span className="text-sm font-normal text-slate-500 whitespace-nowrap">
                      ({selectedStudy.ageSex || "N/A"})
                    </span>
                  </h2>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-white text-slate-600 border border-slate-200 flex items-center gap-1 shadow-sm shrink-0">
                      <Fingerprint className="h-2.5 w-2.5" /> {selectedStudy.id}
                    </span>
                    <Badge
                      variant="outline"
                      className="text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border-indigo-200 shadow-sm shrink-0">
                      {selectedStudy.scan}
                    </Badge>
                  </div>
                </div>
                <Button
                  onClick={() => {
                    if (
                      !selectedStudy.studyUid ||
                      selectedStudy.studyUid === "UNKNOWN-UID"
                    )
                      return toast.error("No PACS UID found.");
                    window.open(
                      `http://localhost:8042/viewer?StudyInstanceUID=${selectedStudy.studyUid}`,
                      "_blank",
                    );
                  }}
                  className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white shadow-md rounded-xl font-bold transition-all hover:-translate-y-0.5 shrink-0">
                  <MonitorPlay className="h-4 w-4 mr-2" /> View Images
                </Button>
              </div>

              {/* Editor Body */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 flex flex-col gap-6">
                {/* Clinical History Alert */}
                {selectedStudy.clinicalNotes && (
                  <div className="p-4 bg-amber-50/50 border border-amber-200/60 rounded-xl text-sm text-amber-900 flex items-start gap-3 shadow-sm">
                    <History className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-bold uppercase tracking-wider text-[10px] text-amber-700 mb-0.5">
                        Clinical Indication / History
                      </p>
                      <p className="leading-relaxed font-medium">
                        {selectedStudy.clinicalNotes}
                      </p>
                    </div>
                  </div>
                )}

                {/* Findings Box */}
                <div className="flex-1 flex flex-col space-y-2 min-h-[300px]">
                  <div className="flex justify-between items-center">
                    <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                      <FileText className="h-4 w-4 text-indigo-500" /> Findings
                    </Label>
                    <span className="text-[10px] text-slate-500 font-mono bg-slate-100 border border-slate-200 px-2 py-1 rounded-md hidden sm:inline-block shadow-sm">
                      Type /shortcode and press Space
                    </span>
                  </div>
                  <Textarea
                    value={selectedStudy.findings || ""}
                    onChange={handleFindingsChange}
                    placeholder="Type findings here... e.g. /N-CXR "
                    className="flex-1 min-h-[250px] font-mono text-[13px] leading-relaxed p-4 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white focus:border-indigo-400 focus:ring-indigo-500/20 resize-none shadow-inner"
                  />
                </div>

                {/* Impression Box */}
                <div className="shrink-0 space-y-2">
                  <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-indigo-500" />{" "}
                    Impression
                  </Label>
                  <Textarea
                    value={selectedStudy.impression || ""}
                    onChange={(e) =>
                      setSelectedStudy({
                        ...selectedStudy,
                        impression: e.target.value,
                      })
                    }
                    placeholder="Final diagnosis or conclusion..."
                    className="min-h-[120px] font-bold text-sm leading-relaxed p-4 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white focus:border-indigo-400 focus:ring-indigo-500/20 shadow-inner"
                  />
                </div>
              </div>

              {/* Footer Actions */}
              <div className="p-4 border-t border-slate-100 bg-white flex flex-col sm:flex-row justify-between items-center gap-3 shrink-0">
                <Button
                  variant="outline"
                  onClick={() => handleAction("DRAFT")}
                  disabled={saveMutation.isPending}
                  className="w-full sm:w-auto h-11 rounded-xl font-bold text-slate-600 bg-white border-slate-200 hover:bg-slate-50 shadow-sm">
                  {saveMutation.isPending &&
                  saveMutation.variables?.action === "DRAFT" ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin text-slate-400" />
                  ) : (
                    <Save className="h-4 w-4 mr-2 text-slate-400" />
                  )}
                  Save as Draft
                </Button>

                <Button
                  onClick={() => handleAction("FINALIZE")}
                  disabled={saveMutation.isPending}
                  className="w-full sm:w-auto h-11 rounded-xl font-bold bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-md shadow-emerald-500/25 px-8 transition-all hover:-translate-y-0.5">
                  {saveMutation.isPending &&
                  saveMutation.variables?.action === "FINALIZE" ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <FileSignature className="h-4 w-4 mr-2" />
                  )}
                  Verify & Finalize Report
                </Button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 bg-slate-50/30">
              <div className="h-24 w-24 bg-white rounded-full flex items-center justify-center shadow-sm mb-5 border border-slate-100">
                <Stethoscope className="h-10 w-10 text-indigo-200" />
              </div>
              <h3 className="text-xl font-bold text-slate-700 mb-2">
                Ready to Report
              </h3>
              <p className="text-sm text-center max-w-sm leading-relaxed text-slate-500">
                Select a patient from the queue to review clinical history, view
                DICOM images, and dictate findings. Use{" "}
                <code className="bg-white border border-slate-200 text-indigo-600 font-bold px-1.5 py-0.5 rounded-md shadow-sm mx-1">
                  /shortcode
                </code>{" "}
                to pull in your saved macros.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
