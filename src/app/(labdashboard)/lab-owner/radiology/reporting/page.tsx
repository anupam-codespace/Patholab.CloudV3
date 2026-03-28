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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import toast from "react-hot-toast";

// 1. Fetch Functions
const fetchQueue = async () => {
  const res = await fetch("/api/lab-owner/radiology/reporting");
  if (!res.ok) throw new Error("Failed to load queue");
  return res.json();
};

const fetchMacros = async () => {
  const res = await fetch("/api/lab-owner/radiology/settings/macros");
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
      const res = await fetch("/api/lab-owner/radiology/reporting", {
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
          `/lab-owner/radiology/print/${variables.studyId}`,
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
      const lastWord = words[words.length - 2]; // -1 is the empty string after space, -2 is the typed word

      if (lastWord && lastWord.startsWith("/")) {
        const typedShortcode = lastWord.substring(1).toLowerCase(); // remove the '/' and lowercase it

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
          // Using regex to ensure we only replace the exact shortcode at the end
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
    const matchesSearch =
      item.patient.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.id.toLowerCase().includes(searchQuery.toLowerCase());
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
      <div className="flex h-[calc(100vh-80px)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6 h-[calc(100vh-80px)] flex flex-col">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Stethoscope className="h-6 w-6 text-purple-600" />
            Radiologist Reporting Desk
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Review scans, dictate findings, and verify reports.
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-purple-50 rounded-lg border border-purple-100">
          <Zap className="h-4 w-4 text-purple-600" />
          <span className="text-sm font-bold text-purple-800">
            {macros.length} Macros Loaded
          </span>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
        {/* LEFT COLUMN: Queue */}
        <div className="w-full lg:w-1/3 flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-full">
          <div className="p-4 border-b border-slate-100 bg-slate-50 space-y-3 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search patient or accession..."
                className="pl-9 bg-white"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              {["UNREAD", "DRAFT", "ALL"].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${
                    activeFilter === filter
                      ? "bg-purple-600 text-white shadow-sm"
                      : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}>
                  {filter}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
            {filteredQueue.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <CheckCircle2 className="h-10 w-10 mx-auto mb-3 opacity-20 text-emerald-500" />
                <p className="text-sm font-medium">Queue is clear!</p>
              </div>
            ) : (
              filteredQueue.map((item: any) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedStudy(item)}
                  className={`p-4 cursor-pointer transition-colors hover:bg-purple-50/50 ${
                    selectedStudy?.studyId === item.studyId
                      ? "bg-purple-50 border-l-4 border-purple-600"
                      : "border-l-4 border-transparent"
                  }`}>
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-bold text-sm text-slate-900 line-clamp-1">
                      {item.patient}
                    </h3>
                    {item.priority === "URGENT" && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700 animate-pulse">
                        URGENT
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-medium text-slate-600 mb-2 truncate">
                    {item.scan}
                  </p>
                  <div className="flex justify-between items-center text-[10px] text-slate-500">
                    <div className="flex items-center gap-2">
                      <span className="font-bold bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                        {item.modality}
                      </span>
                      <span>{item.time}</span>
                    </div>
                    {item.status === "DRAFT" && (
                      <span className="font-bold text-amber-600 flex items-center gap-1">
                        <Save className="h-3 w-3" /> Draft
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Editor */}
        <div className="w-full lg:w-2/3 flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-full relative">
          {selectedStudy ? (
            <>
              {/* Context Header */}
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      {selectedStudy.patient}{" "}
                      <span className="text-sm font-normal text-slate-500">
                        ({selectedStudy.ageSex})
                      </span>
                    </h2>
                    <div className="flex items-center gap-3 mt-1 text-xs font-medium text-slate-600">
                      <span className="text-slate-400">
                        ID:{" "}
                        <span className="text-slate-700 font-mono">
                          {selectedStudy.id}
                        </span>
                      </span>
                      <span>•</span>
                      <span className="text-purple-700 font-bold">
                        {selectedStudy.scan}
                      </span>
                    </div>
                  </div>
                  <Button
                    onClick={() => {
                      if (!selectedStudy.studyUid)
                        return toast.error("No PACS UID found.");
                      window.open(
                        `http://localhost:8042/viewer?StudyInstanceUID=${selectedStudy.studyUid}`,
                        "_blank",
                      );
                    }}
                    className="bg-slate-900 hover:bg-slate-800 text-white shadow-lg shadow-slate-900/20">
                    <MonitorPlay className="h-4 w-4 mr-2" /> View Images
                  </Button>
                </div>
                {selectedStudy.clinicalNotes && (
                  <div className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded-lg text-sm text-amber-900 flex items-start gap-2">
                    <History className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                    <p>
                      <span className="font-bold">Clinical Indication:</span>{" "}
                      {selectedStudy.clinicalNotes}
                    </p>
                  </div>
                )}
              </div>

              {/* Editor Body */}
              <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
                {/* Findings Box */}
                <div className="flex-1 flex flex-col space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-slate-400" /> Findings
                    </label>
                    <span className="text-[10px] text-slate-400 font-mono bg-slate-100 px-2 py-1 rounded">
                      Tip: Type /shortcode and press Space
                    </span>
                  </div>
                  <Textarea
                    value={selectedStudy.findings || ""}
                    onChange={handleFindingsChange}
                    placeholder="Type findings here... e.g. /N-CXR "
                    className="flex-1 min-h-[250px] font-mono text-sm leading-relaxed p-4 border-slate-200 focus:border-purple-500 focus:ring-purple-500 resize-none shadow-inner"
                  />
                </div>

                {/* Impression Box */}
                <div className="shrink-0 space-y-2">
                  <label className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-slate-400" />{" "}
                    Impression
                  </label>
                  <Textarea
                    value={selectedStudy.impression || ""}
                    onChange={(e) =>
                      setSelectedStudy({
                        ...selectedStudy,
                        impression: e.target.value,
                      })
                    }
                    placeholder="Final diagnosis or conclusion..."
                    className="min-h-[120px] font-bold text-sm leading-relaxed p-4 border-slate-200 focus:border-purple-500 focus:ring-purple-500 shadow-inner"
                  />
                </div>
              </div>

              {/* Footer Actions */}
              <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
                <Button
                  variant="outline"
                  onClick={() => handleAction("DRAFT")}
                  disabled={saveMutation.isPending}
                  className="text-slate-600 bg-white">
                  {saveMutation.isPending &&
                  saveMutation.variables?.action === "DRAFT" ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save as Draft
                </Button>

                <Button
                  onClick={() => handleAction("FINALIZE")}
                  disabled={saveMutation.isPending}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 px-8">
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
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 bg-slate-50/50">
              <div className="h-24 w-24 bg-white rounded-full flex items-center justify-center shadow-sm mb-4 border border-slate-100">
                <Stethoscope className="h-10 w-10 text-slate-300" />
              </div>
              <h3 className="text-xl font-bold text-slate-600 mb-2">
                Ready to Report
              </h3>
              <p className="text-sm text-center max-w-sm leading-relaxed">
                Select a patient from the queue to review clinical history, view
                images, and dictate findings. Use{" "}
                <code className="bg-slate-200 text-slate-700 px-1 rounded">
                  /shortcodes
                </code>{" "}
                to pull in your saved macros.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
